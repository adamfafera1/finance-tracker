import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { DialogModule } from 'primeng/dialog';
import { SelectModule } from 'primeng/select';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { DatePickerModule } from 'primeng/datepicker';
import { TagModule } from 'primeng/tag';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';
import { ConfirmationService, MessageService } from 'primeng/api';
import { FormsModule } from '@angular/forms';
import { RecurringTransactionService } from './recurring-transaction.service';
import { AccountService } from '../accounts/account.service';
import { CategoryService } from '../categories/category.service';
import { AuthService } from '../../core/auth/auth.service';
import {
  FREQUENCY_LABELS,
  RecurringFrequency,
  RecurringTransaction,
} from '../../shared/models/recurring-transaction.model';
import { TransactionType } from '../../shared/models/transaction.model';
import { AppCurrencyPipe } from '../../shared/pipes/app-currency.pipe';
import { EmptyStateComponent } from '../../shared/components/empty-state.component';
import { frequencyLabel } from '../../shared/utils/recurrence';
import { parseLocalIsoDate, toLocalIsoDate } from '../../shared/utils/date';
import { resolveRecurringItemType } from '../../shared/utils/recurring-type';

@Component({
  selector: 'app-recurring',
  imports: [
    ReactiveFormsModule,
    FormsModule,
    DatePipe,
    ButtonModule,
    CardModule,
    DialogModule,
    SelectModule,
    InputTextModule,
    InputNumberModule,
    DatePickerModule,
    TagModule,
    ProgressSpinnerModule,
    ConfirmDialogModule,
    ToastModule,
    AppCurrencyPipe,
    EmptyStateComponent,
  ],
  providers: [ConfirmationService, MessageService],
  template: `
    <p-toast />
    <p-confirmdialog />

    <div class="page-header">
      <h1>Recurring</h1>
      <button pButton (click)="openDialog()">
        <i class="pi pi-plus" aria-hidden="true"></i>
        Add Recurring
      </button>
    </div>

    <p class="intro">
      Set up repeating income and expenses. Due transactions are created automatically when you open the app.
    </p>

    <div class="stat-grid">
      <p-card styleClass="stat-card">
        <p class="label">Active</p>
        <p class="value">{{ activeCount() }}</p>
      </p-card>
      <p-card styleClass="stat-card">
        <p class="label">Due Next</p>
        <p class="value">{{ nextDueLabel() }}</p>
      </p-card>
    </div>

    @if (recurringService.loading()) {
      <div class="loading-center"><p-progressspinner ariaLabel="Loading recurring transactions" /></div>
    } @else if (recurringService.recurring().length === 0) {
      <app-empty-state
        icon="pi pi-refresh"
        title="No recurring transactions"
        message="Add rent, salary, subscriptions, or other repeating charges."
      />
    } @else {
      <div class="recurring-list">
        @for (item of recurringService.recurring(); track item.id) {
          <div class="recurring-item" [class.inactive]="!item.is_active">
            <div class="recurring-info">
              <div class="recurring-title">
                <span>{{ item.description || item.category?.name || 'Recurring' }}</span>
                <p-tag
                  [value]="itemType(item)"
                  [severity]="itemType(item) === 'income' ? 'success' : 'danger'"
                />
                @if (!item.is_active) {
                  <p-tag value="Paused" severity="secondary" />
                }
              </div>
              <span class="recurring-meta">
                {{ item.account?.name }} · {{ frequencyLabel(item.frequency) }} · Starts:
                {{ formatRecurringDate(item.start_date) | date: 'mediumDate' }} · Next:
                {{ formatRecurringDate(item.next_run_date) | date: 'mediumDate' }}
              </span>
            </div>
            <div class="recurring-right">
              <span
                class="recurring-amount"
                [class.positive]="itemType(item) === 'income'"
                [class.negative]="itemType(item) === 'expense'"
              >
                @if (itemType(item) === 'income') { + }
                {{ item.amount | appCurrency }}
              </span>
              <button
                pButton
                iconOnly
                variant="text"
                severity="secondary"
                aria-label="Edit recurring transaction"
                (click)="openDialog(item)"
              >
                <i class="pi pi-pencil" aria-hidden="true"></i>
              </button>
              <button
                pButton
                iconOnly
                variant="text"
                [severity]="item.is_active ? 'warn' : 'success'"
                [attr.aria-label]="item.is_active ? 'Pause recurring transaction' : 'Resume recurring transaction'"
                (click)="toggleActive(item)"
              >
                <i [class]="item.is_active ? 'pi pi-pause' : 'pi pi-play'" aria-hidden="true"></i>
              </button>
              <button
                pButton
                iconOnly
                variant="text"
                severity="danger"
                aria-label="Delete recurring transaction"
                (click)="confirmDelete(item)"
              >
                <i class="pi pi-trash" aria-hidden="true"></i>
              </button>
            </div>
          </div>
        }
      </div>
    }

    <p-dialog
      [header]="editingId() ? 'Edit Recurring' : 'Add Recurring'"
      [(visible)]="dialogVisible"
      [modal]="true"
      [style]="{ width: '28rem' }"
    >
      <form [formGroup]="form" (ngSubmit)="save()">
        <div class="field">
          <label for="type">Type</label>
          <p-select
            inputId="type"
            formControlName="type"
            [options]="typeOptions"
            optionLabel="label"
            optionValue="value"
            styleClass="w-full"
          />
        </div>
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
          <label for="frequency">Frequency</label>
          <p-select
            inputId="frequency"
            formControlName="frequency"
            [options]="frequencyOptions"
            optionLabel="label"
            optionValue="value"
            styleClass="w-full"
          />
        </div>
        <div class="field">
          <label for="start">Start date</label>
          <p-datepicker
            inputId="start"
            formControlName="start_date"
            dateFormat="yy-mm-dd"
            [showIcon]="true"
            styleClass="w-full"
          />
        </div>
        <div class="field">
          <label for="end">End date (optional)</label>
          <p-datepicker
            inputId="end"
            formControlName="end_date"
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
    .intro {
      margin: -0.75rem 0 1.25rem;
      color: var(--p-text-muted-color);
      font-size: 0.875rem;
      line-height: 1.5;
    }

    .recurring-list {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .recurring-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      padding: 0.875rem 1rem;
      background: var(--p-content-background);
      border-radius: var(--p-border-radius-md);
      border: 1px solid var(--p-content-border-color);
    }

    .recurring-item.inactive {
      opacity: 0.65;
    }

    .recurring-info {
      min-width: 0;
      flex: 1;
    }

    .recurring-title {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex-wrap: wrap;
      font-weight: 500;
      margin-bottom: 0.125rem;
    }

    .recurring-meta {
      font-size: 0.8125rem;
      color: var(--p-text-muted-color);
    }

    .recurring-right {
      display: flex;
      align-items: center;
      gap: 0.25rem;
      flex-shrink: 0;
    }

    .recurring-amount {
      font-weight: 600;
      min-width: 4.5rem;
      text-align: right;
      font-variant-numeric: tabular-nums;
      margin-right: 0.25rem;
    }

    .recurring-amount.positive {
      color: var(--p-green-500);
    }

    .recurring-amount.negative {
      color: var(--p-red-500);
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
export class RecurringComponent implements OnInit {
  protected readonly recurringService = inject(RecurringTransactionService);
  private readonly accountService = inject(AccountService);
  private readonly categoryService = inject(CategoryService);
  private readonly auth = inject(AuthService);
  private readonly fb = inject(FormBuilder);
  private readonly confirmation = inject(ConfirmationService);
  private readonly messageService = inject(MessageService);

  protected readonly frequencyLabel = frequencyLabel;
  protected readonly itemType = resolveRecurringItemType;
  protected readonly formatRecurringDate = parseLocalIsoDate;

  dialogVisible = false;
  editingId = signal<string | null>(null);
  saving = signal(false);

  typeOptions = [
    { label: 'Income', value: 'income' as TransactionType },
    { label: 'Expense', value: 'expense' as TransactionType },
  ];

  frequencyOptions = Object.entries(FREQUENCY_LABELS).map(([value, label]) => ({
    value: value as RecurringFrequency,
    label,
  }));

  form = this.fb.nonNullable.group({
    type: ['expense' as 'income' | 'expense', Validators.required],
    account_id: ['', Validators.required],
    category_id: [''],
    amount: [0, [Validators.required, Validators.min(0.01)]],
    frequency: ['monthly' as RecurringFrequency, Validators.required],
    start_date: [new Date(), Validators.required],
    end_date: [null as Date | null],
    description: [''],
  });

  activeCount = computed(
    () => this.recurringService.recurring().filter((r) => r.is_active).length,
  );

  nextDueLabel = computed(() => {
    const active = this.recurringService
      .recurring()
      .filter((r) => r.is_active)
      .map((r) => r.next_run_date)
      .sort();
    if (!active.length) return '—';
    return new Date(active[0]).toLocaleDateString();
  });

  defaultCurrency = () => this.auth.defaultCurrency();

  accountOptions = () => this.accountService.accountSelectOptions();

  categoryOptions = computed(() => {
    const type = this.form.controls.type.value;
    if (type === 'income' || type === 'expense') {
      return this.categoryService.byType(type).map((c) => ({ label: c.name, value: c.id }));
    }
    return [];
  });

  ngOnInit(): void {
    this.accountService.loadAccounts();
    this.categoryService.loadCategories();
    this.recurringService.loadRecurring();

    this.form.controls.type.valueChanges.subscribe((type) => {
      if (type !== 'income' && type !== 'expense') return;

      const categoryId = this.form.controls.category_id.value;
      if (!categoryId) return;

      const category = this.categoryService.categories().find((c) => c.id === categoryId);
      if (category && category.type !== type) {
        this.form.patchValue({ category_id: '' });
      }
    });
  }

  openDialog(item?: RecurringTransaction): void {
    if (item) {
      this.editingId.set(item.id);
      this.form.patchValue({
        type: item.type as 'income' | 'expense',
        account_id: item.account_id,
        category_id: item.category_id ?? '',
        amount: Number(item.amount),
        frequency: item.frequency,
        start_date: parseLocalIsoDate(item.start_date),
        end_date: item.end_date ? parseLocalIsoDate(item.end_date) : null,
        description: item.description ?? '',
      });
    } else {
      this.editingId.set(null);
      this.form.reset({
        type: 'expense',
        account_id: '',
        category_id: '',
        amount: 0,
        frequency: 'monthly',
        start_date: new Date(),
        end_date: null,
        description: '',
      });
    }
    this.dialogVisible = true;
  }

  async save(): Promise<void> {
    if (this.form.invalid) return;
    this.saving.set(true);

    const raw = this.form.getRawValue();
    const startDate = toLocalIsoDate(raw.start_date);
    const endDate = raw.end_date ? toLocalIsoDate(raw.end_date) : null;

    const dto = {
      account_id: raw.account_id,
      category_id: raw.category_id || null,
      amount: raw.amount,
      type: raw.type,
      description: raw.description || undefined,
      frequency: raw.frequency,
      start_date: startDate,
      end_date: endDate,
    };

    const id = this.editingId();
    const err = id
      ? await this.recurringService.updateRecurring(id, dto)
      : await this.recurringService.createRecurring(dto);

    this.saving.set(false);

    if (err) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: err });
    } else {
      this.dialogVisible = false;
      this.messageService.add({ severity: 'success', summary: 'Saved', detail: 'Recurring transaction saved' });
    }
  }

  async toggleActive(item: RecurringTransaction): Promise<void> {
    const err = await this.recurringService.toggleActive(item.id, !item.is_active);
    if (err) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: err });
    }
  }

  confirmDelete(item: RecurringTransaction): void {
    this.confirmation.confirm({
      message: `Delete recurring "${item.description || item.category?.name || 'transaction'}"?`,
      header: 'Confirm Delete',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      accept: async () => {
        const err = await this.recurringService.deleteRecurring(item.id);
        if (err) {
          this.messageService.add({ severity: 'error', summary: 'Error', detail: err });
        } else {
          this.messageService.add({ severity: 'success', summary: 'Deleted', detail: 'Recurring transaction deleted' });
        }
      },
    });
  }
}
