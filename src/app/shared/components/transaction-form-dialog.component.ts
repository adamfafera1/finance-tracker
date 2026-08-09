import { Component, computed, effect, inject, input, model, output, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { startWith } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { SelectModule } from 'primeng/select';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { DatePickerModule } from 'primeng/datepicker';
import { SelectButtonModule } from 'primeng/selectbutton';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { AccountService } from '../../modules/finance/accounts/account.service';
import { CategoryService } from '../../modules/finance/categories/category.service';
import { TransactionService } from '../../modules/finance/transactions/transaction.service';
import { AuthService } from '../../core/auth/auth.service';
import { Transaction, TransactionType } from '../models/transaction.model';

@Component({
  selector: 'app-transaction-form-dialog',
  imports: [
    ReactiveFormsModule,
    ButtonModule,
    DialogModule,
    SelectModule,
    InputTextModule,
    InputNumberModule,
    DatePickerModule,
    SelectButtonModule,
    ToastModule,
  ],
  providers: [MessageService],
  template: `
    <p-toast />
    <p-dialog
      [header]="headerTitle()"
      [(visible)]="visible"
      [modal]="true"
      [style]="{ width: '28rem' }"
    >
      <form [formGroup]="form" (ngSubmit)="save()">
        @if (!fixedType() && !isEditMode()) {
          <div class="field">
            <label>Type</label>
            <p-selectbutton
              formControlName="type"
              [options]="txTypes"
              optionLabel="label"
              optionValue="value"
              styleClass="w-full"
            />
          </div>
        }

        @if (effectiveType() === 'transfer') {
          <div class="field">
            <label for="from">From Account</label>
            <p-select
              inputId="from"
              formControlName="from_account_id"
              [options]="accountOptions()"
              optionLabel="label"
              optionValue="value"
              placeholder="Select account"
              styleClass="w-full"
              [filter]="true"
              filterBy="label"
            />
          </div>
          <div class="field">
            <label for="to">To Account</label>
            <p-select
              inputId="to"
              formControlName="to_account_id"
              [options]="toAccountOptions()"
              optionLabel="label"
              optionValue="value"
              placeholder="Select account"
              styleClass="w-full"
              [filter]="true"
              filterBy="label"
            />
          </div>
        } @else {
          <div class="field">
            <label for="account">Account</label>
            <p-select
              inputId="account"
              formControlName="account_id"
              [options]="accountOptions()"
              optionLabel="label"
              optionValue="value"
              placeholder="Select account"
              styleClass="w-full"
              [filter]="true"
              filterBy="label"
            />
          </div>
          <div class="field">
            <label for="category">Category</label>
            <p-select
              inputId="category"
              formControlName="category_id"
              [options]="categoryOptions()"
              optionLabel="label"
              optionValue="value"
              placeholder="Select category"
              styleClass="w-full"
              [showClear]="true"
              [filter]="true"
              filterBy="label"
            />
          </div>
        }

        <div class="field">
          <label for="amount">Amount</label>
          <p-inputnumber
            inputId="amount"
            formControlName="amount"
            mode="currency"
            [currency]="defaultCurrency()"
            styleClass="w-full"
            inputStyleClass="w-full"
          />
        </div>
        <div class="field">
          <label for="date">Date</label>
          <p-datepicker
            inputId="date"
            formControlName="transaction_date"
            dateFormat="yy-mm-dd"
            [showIcon]="true"
            styleClass="w-full"
          />
        </div>
        <div class="field">
          <label for="description">Description</label>
          <input pInputText id="description" formControlName="description" class="w-full" />
        </div>
        <div class="dialog-actions">
          <button pButton type="button" variant="outlined" severity="secondary" (click)="close()">
            Cancel
          </button>
          <button pButton type="submit" [disabled]="form.invalid || saving() || loadingForm()">
            Save
          </button>
        </div>
      </form>
    </p-dialog>
  `,
  styles: `
    .field {
      margin-bottom: 1rem;
    }

    .field label {
      display: block;
      margin-bottom: 0.375rem;
      font-weight: 500;
      font-size: 0.875rem;
    }

    .w-full {
      width: 100%;
    }

    .dialog-actions {
      display: flex;
      justify-content: flex-end;
      gap: 0.5rem;
      margin-top: 1rem;
    }
  `,
})
export class TransactionFormDialogComponent {
  visible = model(false);
  fixedType = input<TransactionType>();
  dialogTitle = input('Add Transaction');
  transaction = input<Transaction | null>(null);
  saved = output<void>();

  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly accountService = inject(AccountService);
  private readonly categoryService = inject(CategoryService);
  private readonly transactionService = inject(TransactionService);
  private readonly messageService = inject(MessageService);

  saving = signal(false);
  loadingForm = signal(false);
  private editingId = signal<string | null>(null);
  private editingPairId = signal<string | null>(null);
  private readonly fromAccountId = signal('');

  isEditMode = computed(() => !!this.transaction());
  headerTitle = computed(() =>
    this.isEditMode() ? 'Edit Transaction' : this.dialogTitle(),
  );

  txTypes = [
    { label: 'Income', value: 'income' as TransactionType },
    { label: 'Expense', value: 'expense' as TransactionType },
    { label: 'Transfer', value: 'transfer' as TransactionType },
  ];

  form = this.fb.nonNullable.group({
    type: ['expense' as TransactionType, Validators.required],
    account_id: [''],
    from_account_id: [''],
    to_account_id: [''],
    category_id: [''],
    amount: [0, [Validators.required, Validators.min(0.01)]],
    transaction_date: [new Date(), Validators.required],
    description: [''],
  });

  /** Keeps dialog fields in sync when the type selectbutton changes. */
  private readonly formType = toSignal(
    this.form.controls.type.valueChanges.pipe(startWith(this.form.controls.type.value)),
    { initialValue: this.form.controls.type.value },
  );

  effectiveType = computed((): TransactionType => {
    const fixed = this.fixedType();
    if (fixed) return fixed;
    const tx = this.transaction();
    if (tx) return tx.type;
    return this.formType() ?? 'expense';
  });

  accountOptions = computed(() => this.accountService.accountSelectOptions());

  toAccountOptions = computed(() => {
    const fromId = this.fromAccountId();
    return this.accountOptions().filter((option) => option.value !== fromId);
  });

  categoryOptions = computed(() => {
    const type = this.effectiveType();
    if (type !== 'income' && type !== 'expense') return [];
    // Touch the categories signal so options refresh after loadCategories().
    return this.categoryService
      .byType(type)
      .map((c) => ({ label: c.name, value: c.id }));
  });

  constructor() {
    effect(() => {
      if (this.visible()) {
        void this.openDialog(this.transaction());
      }
    });

    this.form.controls.from_account_id.valueChanges.subscribe((value) => {
      this.fromAccountId.set(value ?? '');
      const toId = this.form.controls.to_account_id.value;
      if (value && toId === value) {
        this.form.controls.to_account_id.setValue('');
      }
    });

    this.form.controls.type.valueChanges.subscribe((type) => {
      if (this.isEditMode()) return;
      this.form.patchValue(
        {
          category_id: '',
          account_id: type === 'transfer' ? '' : this.form.controls.account_id.value,
          from_account_id: type === 'transfer' ? this.form.controls.from_account_id.value : '',
          to_account_id: type === 'transfer' ? this.form.controls.to_account_id.value : '',
        },
        { emitEvent: false },
      );
      if (type !== 'transfer') {
        this.fromAccountId.set('');
      }
    });
  }

  defaultCurrency = () => this.auth.defaultCurrency();

  private async openDialog(tx: Transaction | null | undefined): Promise<void> {
    this.loadingForm.set(true);
    await Promise.all([
      this.accountService.loadAccounts(),
      this.categoryService.loadCategories(),
    ]);
    await this.initForm(tx);
    this.loadingForm.set(false);
  }

  private async initForm(tx: Transaction | null | undefined): Promise<void> {
    this.editingId.set(null);
    this.editingPairId.set(null);
    this.fromAccountId.set('');

    if (!tx) {
      this.resetForm();
      return;
    }

    this.editingId.set(tx.id);

    if (tx.type === 'transfer' && tx.transfer_pair_id) {
      this.editingPairId.set(tx.transfer_pair_id);
      const legs = await this.transactionService.getTransferLegs(tx.transfer_pair_id);
      if (legs) {
        this.fromAccountId.set(legs.from_account_id);
        this.form.reset({
          type: 'transfer',
          account_id: '',
          from_account_id: legs.from_account_id,
          to_account_id: legs.to_account_id,
          category_id: '',
          amount: legs.amount,
          transaction_date: this.parseDate(legs.transaction_date),
          description: legs.description ?? '',
        });
      }
    } else {
      this.form.reset({
        type: tx.type,
        account_id: tx.account_id,
        from_account_id: '',
        to_account_id: '',
        category_id: tx.category_id ?? '',
        amount: Number(tx.amount),
        transaction_date: this.parseDate(tx.transaction_date),
        description: tx.description ?? '',
      });
    }
  }

  resetForm(): void {
    const type = this.fixedType() ?? 'expense';
    this.fromAccountId.set('');
    this.form.reset({
      type,
      account_id: '',
      from_account_id: '',
      to_account_id: '',
      category_id: '',
      amount: 0,
      transaction_date: new Date(),
      description: '',
    });
  }

  close(): void {
    this.visible.set(false);
  }

  async save(): Promise<void> {
    if (this.saving() || this.loadingForm()) return;

    const type = this.effectiveType();
    if (type === 'transfer') {
      const { from_account_id, to_account_id } = this.form.getRawValue();
      if (!from_account_id || !to_account_id) return;
      if (from_account_id === to_account_id) {
        this.messageService.add({
          severity: 'warn',
          summary: 'Invalid transfer',
          detail: 'Choose two different accounts',
        });
        return;
      }
    } else if (!this.form.getRawValue().account_id) {
      return;
    }

    if (this.form.invalid) return;
    this.saving.set(true);

    const raw = this.form.getRawValue();
    const saveType = type;
    const date =
      raw.transaction_date instanceof Date
        ? raw.transaction_date.toISOString().split('T')[0]
        : String(raw.transaction_date);

    let err: string | null;

    if (saveType === 'transfer') {
      const pairId = this.editingPairId();
      if (pairId) {
        err = await this.transactionService.updateTransfer({
          pair_id: pairId,
          from_account_id: raw.from_account_id,
          to_account_id: raw.to_account_id,
          amount: raw.amount,
          description: raw.description || undefined,
          transaction_date: date,
        });
      } else {
        err = await this.transactionService.createTransfer({
          from_account_id: raw.from_account_id,
          to_account_id: raw.to_account_id,
          amount: raw.amount,
          description: raw.description || undefined,
          transaction_date: date,
        });
      }
    } else {
      const id = this.editingId();
      const payload = {
        account_id: raw.account_id,
        category_id: raw.category_id || null,
        amount: raw.amount,
        type: saveType,
        description: raw.description || undefined,
        transaction_date: date,
      };

      err = id
        ? await this.transactionService.updateTransaction(id, payload)
        : await this.transactionService.createTransaction(payload);
    }

    this.saving.set(false);

    if (err) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: err });
      return;
    }

    await this.accountService.loadAccounts();
    this.visible.set(false);
    this.saved.emit();
  }

  private parseDate(value: string): Date {
    const [year, month, day] = value.split('-').map(Number);
    return new Date(year, month - 1, day);
  }
}
