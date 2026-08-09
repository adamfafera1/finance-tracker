import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { SelectModule } from 'primeng/select';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { DatePickerModule } from 'primeng/datepicker';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';
import { TagModule } from 'primeng/tag';
import { SelectButtonModule } from 'primeng/selectbutton';
import { ConfirmationService, MessageService } from 'primeng/api';
import { TransactionService } from './transaction.service';
import { AccountService } from '../accounts/account.service';
import { CategoryService } from '../categories/category.service';
import { TransactionType } from '../../shared/models/transaction.model';
import { AppCurrencyPipe } from '../../shared/pipes/app-currency.pipe';
import { EmptyStateComponent } from '../../shared/components/empty-state.component';

@Component({
  selector: 'app-transactions',
  imports: [
    ReactiveFormsModule,
    FormsModule,
    DatePipe,
    ButtonModule,
    DialogModule,
    SelectModule,
    InputTextModule,
    InputNumberModule,
    DatePickerModule,
    ProgressSpinnerModule,
    ConfirmDialogModule,
    ToastModule,
    TagModule,
    SelectButtonModule,
    AppCurrencyPipe,
    EmptyStateComponent,
  ],
  providers: [ConfirmationService, MessageService],
  template: `
    <p-toast />
    <p-confirmdialog />

    <div class="page-header">
      <h1>Transactions</h1>
    </div>

    <div class="filters">
      <p-selectbutton
        [options]="typeFilters"
        [ngModel]="selectedFilter()"
        (ngModelChange)="onFilterChange($event)"
        optionLabel="label"
        optionValue="value"
      />
    </div>

    @if (transactionService.loading()) {
      <div class="loading-center"><p-progressspinner ariaLabel="Loading transactions" /></div>
    } @else if (transactionService.transactions().length === 0) {
      <app-empty-state
        icon="pi pi-list"
        title="No transactions yet"
        message="Record your first income, expense, or transfer to start tracking."
      >
        <button pButton (click)="openDialog()">Add Transaction</button>
      </app-empty-state>
    } @else {
      <div class="tx-list">
        @for (tx of filteredTransactions(); track tx.id) {
          <div class="tx-item">
            <div class="tx-info">
              <span class="tx-desc">{{ tx.description || tx.category?.name || 'Transfer' }}</span>
              <span class="tx-meta">
                {{ tx.account?.name }} · {{ tx.transaction_date | date: 'mediumDate' }}
              </span>
            </div>
            <div class="tx-right">
              <p-tag
                [value]="tx.type"
                [severity]="tx.type === 'income' ? 'success' : tx.type === 'expense' ? 'danger' : 'info'"
              />
              <span
                class="tx-amount"
                [class.positive]="tx.type === 'income'"
                [class.negative]="tx.type === 'expense'"
              >
                @if (tx.type === 'income') { + } @else if (tx.type === 'expense') { - }
                {{ tx.amount | appCurrency }}
              </span>
              <button
                pButton
                iconOnly
                variant="text"
                severity="danger"
                aria-label="Delete transaction"
                (click)="confirmDelete(tx.id, tx.type, tx.transfer_pair_id)"
              >
                <i class="pi pi-trash" aria-hidden="true"></i>
              </button>
            </div>
          </div>
        }
      </div>
    }

    <button
      pButton
      class="fab"
      iconOnly
      aria-label="Add transaction"
      (click)="openDialog()"
    >
      <i class="pi pi-plus" aria-hidden="true"></i>
    </button>

    <p-dialog
      header="Add Transaction"
      [(visible)]="dialogVisible"
      [modal]="true"
      [style]="{ width: '28rem' }"
    >
      <form [formGroup]="form" (ngSubmit)="save()">
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

        @if (form.value.type === 'transfer') {
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
            />
          </div>
          <div class="field">
            <label for="to">To Account</label>
            <p-select
              inputId="to"
              formControlName="to_account_id"
              [options]="accountOptions()"
              optionLabel="label"
              optionValue="value"
              placeholder="Select account"
              styleClass="w-full"
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
            />
          </div>
        }

        <div class="field">
          <label for="amount">Amount</label>
          <p-inputnumber
            inputId="amount"
            formControlName="amount"
            mode="currency"
            currency="EUR"
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
          <button pButton type="button" variant="outlined" severity="secondary" (click)="dialogVisible = false">
            Cancel
          </button>
          <button pButton type="submit" [disabled]="form.invalid || saving()">Save</button>
        </div>
      </form>
    </p-dialog>
  `,
  styles: `
    .filters {
      margin-bottom: 1rem;
    }

    .tx-list {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .tx-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      padding: 0.875rem 1rem;
      background: var(--p-content-background);
      border-radius: var(--p-border-radius-md);
      border: 1px solid var(--p-content-border-color);
    }

    .tx-info {
      display: flex;
      flex-direction: column;
      gap: 0.125rem;
      min-width: 0;
      flex: 1;
    }

    .tx-desc {
      font-weight: 500;
    }

    .tx-meta {
      font-size: 0.8125rem;
      color: var(--p-text-muted-color);
    }

    .tx-right {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex-shrink: 0;
    }

    .tx-amount {
      font-weight: 600;
      min-width: 4.5rem;
      text-align: right;
    }

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
export class TransactionsComponent implements OnInit {
  protected readonly transactionService = inject(TransactionService);
  private readonly accountService = inject(AccountService);
  private readonly categoryService = inject(CategoryService);
  private readonly fb = inject(FormBuilder);
  private readonly confirmation = inject(ConfirmationService);
  private readonly messageService = inject(MessageService);

  dialogVisible = false;
  saving = signal(false);
  selectedFilter = signal('all');

  typeFilters = [
    { label: 'All', value: 'all' },
    { label: 'Income', value: 'income' },
    { label: 'Expense', value: 'expense' },
    { label: 'Transfer', value: 'transfer' },
  ];

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

  accountOptions = () =>
    this.accountService.accounts().map((a) => ({ label: a.name, value: a.id }));

  categoryOptions = () => {
    const type = this.form.value.type;
    if (type === 'income' || type === 'expense') {
      return this.categoryService.byType(type).map((c) => ({ label: c.name, value: c.id }));
    }
    return [];
  };

  ngOnInit(): void {
    this.accountService.loadAccounts();
    this.categoryService.loadCategories();
    this.transactionService.loadTransactions();
  }

  filteredTransactions = () => {
    const txs = this.transactionService.transactions();
    const filter = this.selectedFilter();
    if (filter === 'all') return txs;
    return txs.filter((t) => t.type === filter);
  };

  onFilterChange(value: string): void {
    this.selectedFilter.set(value);
    if (value === 'all') {
      this.transactionService.loadTransactions();
    } else {
      this.transactionService.loadTransactions({ type: value });
    }
  }

  openDialog(): void {
    this.form.reset({
      type: 'expense',
      account_id: '',
      from_account_id: '',
      to_account_id: '',
      category_id: '',
      amount: 0,
      transaction_date: new Date(),
      description: '',
    });
    this.dialogVisible = true;
  }

  async save(): Promise<void> {
    if (this.form.invalid) return;
    this.saving.set(true);

    const raw = this.form.getRawValue();
    const date =
      raw.transaction_date instanceof Date
        ? raw.transaction_date.toISOString().split('T')[0]
        : String(raw.transaction_date);

    let err: string | null;

    if (raw.type === 'transfer') {
      err = await this.transactionService.createTransfer({
        from_account_id: raw.from_account_id,
        to_account_id: raw.to_account_id,
        amount: raw.amount,
        description: raw.description || undefined,
        transaction_date: date,
      });
    } else {
      err = await this.transactionService.createTransaction({
        account_id: raw.account_id,
        category_id: raw.category_id || null,
        amount: raw.amount,
        type: raw.type,
        description: raw.description || undefined,
        transaction_date: date,
      });
    }

    this.saving.set(false);

    if (err) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: err });
    } else {
      this.dialogVisible = false;
      await this.accountService.loadAccounts();
      this.messageService.add({ severity: 'success', summary: 'Saved', detail: 'Transaction saved' });
    }
  }

  confirmDelete(id: string, type: string, pairId: string | null): void {
    this.confirmation.confirm({
      message: 'Delete this transaction?',
      header: 'Confirm Delete',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      accept: async () => {
        const err =
          type === 'transfer' && pairId
            ? await this.transactionService.deleteTransfer(pairId)
            : await this.transactionService.deleteTransaction(id);
        if (err) {
          this.messageService.add({ severity: 'error', summary: 'Error', detail: err });
        } else {
          await this.accountService.loadAccounts();
          this.messageService.add({ severity: 'success', summary: 'Deleted', detail: 'Transaction deleted' });
        }
      },
    });
  }
}
