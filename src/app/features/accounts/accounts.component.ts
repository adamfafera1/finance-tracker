import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { DialogModule } from 'primeng/dialog';
import { SelectModule } from 'primeng/select';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { TagModule } from 'primeng/tag';
import { AccountService } from './account.service';
import {
  ACCOUNT_TYPE_LABELS,
  AccountKind,
  AccountType,
  CreateAccountDto,
} from '../../shared/models/account.model';
import { AppCurrencyPipe } from '../../shared/pipes/app-currency.pipe';
import { EmptyStateComponent } from '../../shared/components/empty-state.component';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-accounts',
  imports: [
    ReactiveFormsModule,
    ButtonModule,
    CardModule,
    DialogModule,
    SelectModule,
    InputTextModule,
    InputNumberModule,
    ProgressSpinnerModule,
    ConfirmDialogModule,
    ToastModule,
    TagModule,
    AppCurrencyPipe,
    EmptyStateComponent,
  ],
  providers: [ConfirmationService, MessageService],
  template: `
    <p-toast />
    <p-confirmdialog />

    <div class="page-header">
      <h1>Accounts</h1>
      <button pButton (click)="openDialog()">
        <i class="pi pi-plus" aria-hidden="true"></i>
        Add Account
      </button>
    </div>

    @if (accountService.loading()) {
      <div class="loading"><p-progressspinner ariaLabel="Loading accounts" /></div>
    } @else if (accountService.accounts().length === 0) {
      <app-empty-state
        icon="pi pi-building-columns"
        title="No accounts yet"
        message="Add your bank accounts, credit cards, and investments to track your net worth."
      >
        <button pButton (click)="openDialog()">Add Account</button>
      </app-empty-state>
    } @else {
      @if (assets().length) {
        <section class="section">
          <h2>Assets</h2>
          <div class="account-grid">
            @for (account of assets(); track account.id) {
              <p-card styleClass="account-card">
                <div class="account-card-header">
                  <div>
                    <h3>{{ account.name }}</h3>
                    <p-tag [value]="typeLabel(account.type)" severity="secondary" />
                  </div>
                  <div class="account-actions">
                    <button
                      pButton
                      iconOnly
                      variant="text"
                      severity="secondary"
                      aria-label="Edit account"
                      (click)="openDialog(account)"
                    >
                      <i class="pi pi-pencil" aria-hidden="true"></i>
                    </button>
                    <button
                      pButton
                      iconOnly
                      variant="text"
                      severity="danger"
                      aria-label="Delete account"
                      (click)="confirmDelete(account.id, account.name)"
                    >
                      <i class="pi pi-trash" aria-hidden="true"></i>
                    </button>
                  </div>
                </div>
                <p class="balance positive">{{ account.balance | appCurrency: account.currency }}</p>
              </p-card>
            }
          </div>
        </section>
      }

      @if (liabilities().length) {
        <section class="section">
          <h2>Liabilities</h2>
          <div class="account-grid">
            @for (account of liabilities(); track account.id) {
              <p-card styleClass="account-card">
                <div class="account-card-header">
                  <div>
                    <h3>{{ account.name }}</h3>
                    <p-tag [value]="typeLabel(account.type)" severity="warn" />
                  </div>
                  <div class="account-actions">
                    <button
                      pButton
                      iconOnly
                      variant="text"
                      severity="secondary"
                      aria-label="Edit account"
                      (click)="openDialog(account)"
                    >
                      <i class="pi pi-pencil" aria-hidden="true"></i>
                    </button>
                    <button
                      pButton
                      iconOnly
                      variant="text"
                      severity="danger"
                      aria-label="Delete account"
                      (click)="confirmDelete(account.id, account.name)"
                    >
                      <i class="pi pi-trash" aria-hidden="true"></i>
                    </button>
                  </div>
                </div>
                <p class="balance negative">{{ account.balance | appCurrency: account.currency }}</p>
              </p-card>
            }
          </div>
        </section>
      }
    }

    <p-dialog
      [header]="editingId() ? 'Edit Account' : 'Add Account'"
      [(visible)]="dialogVisible"
      [modal]="true"
      [style]="{ width: '28rem' }"
    >
      <form [formGroup]="form" (ngSubmit)="save()">
        <div class="field">
          <label for="name">Name</label>
          <input pInputText id="name" formControlName="name" class="w-full" />
        </div>
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
          <label for="kind">Kind</label>
          <p-select
            inputId="kind"
            formControlName="kind"
            [options]="kindOptions"
            optionLabel="label"
            optionValue="value"
            styleClass="w-full"
          />
        </div>
        <div class="field">
          <label for="balance">Initial Balance</label>
          <p-inputnumber
            inputId="balance"
            formControlName="balance"
            mode="currency"
            [currency]="currency()"
            styleClass="w-full"
            inputStyleClass="w-full"
          />
        </div>
        <div class="dialog-actions">
          <button pButton type="button" variant="outlined" severity="secondary" (click)="dialogVisible = false">
            Cancel
          </button>
          <button pButton type="submit" [disabled]="form.invalid || saving()">
            Save
          </button>
        </div>
      </form>
    </p-dialog>
  `,
  styles: `
    .page-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 1.5rem;
      gap: 1rem;
    }

    .page-header h1 {
      margin: 0;
      font-size: 1.5rem;
    }

    .loading {
      display: flex;
      justify-content: center;
      padding: 3rem;
    }

    .section {
      margin-bottom: 2rem;
    }

    .section h2 {
      font-size: 1rem;
      font-weight: 600;
      color: var(--p-text-muted-color);
      margin: 0 0 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .account-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(16rem, 1fr));
      gap: 1rem;
    }

    .account-card-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 0.75rem;
    }

    .account-card-header h3 {
      margin: 0 0 0.375rem;
      font-size: 1rem;
    }

    .account-actions {
      display: flex;
      gap: 0.25rem;
    }

    .balance {
      margin: 0;
      font-size: 1.5rem;
      font-weight: 600;
    }

    .balance.positive {
      color: var(--p-green-500);
    }

    .balance.negative {
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
export class AccountsComponent implements OnInit {
  protected readonly accountService = inject(AccountService);
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly confirmation = inject(ConfirmationService);
  private readonly messageService = inject(MessageService);

  dialogVisible = false;
  editingId = signal<string | null>(null);
  saving = signal(false);

  typeOptions = Object.entries(ACCOUNT_TYPE_LABELS).map(([value, label]) => ({
    value: value as AccountType,
    label,
  }));

  kindOptions = [
    { value: 'asset' as AccountKind, label: 'Asset' },
    { value: 'liability' as AccountKind, label: 'Liability' },
  ];

  form = this.fb.nonNullable.group({
    name: ['', Validators.required],
    type: ['checking' as AccountType, Validators.required],
    kind: ['asset' as AccountKind, Validators.required],
    balance: [0, Validators.required],
  });

  currency = () => this.auth.profile()?.default_currency ?? 'EUR';

  assets = () => this.accountService.accounts().filter((a) => a.kind === 'asset');
  liabilities = () => this.accountService.accounts().filter((a) => a.kind === 'liability');

  ngOnInit(): void {
    this.accountService.loadAccounts();
  }

  typeLabel(type: AccountType): string {
    return ACCOUNT_TYPE_LABELS[type];
  }

  openDialog(account?: { id: string; name: string; type: AccountType; kind: AccountKind; balance: number }): void {
    if (account) {
      this.editingId.set(account.id);
      this.form.patchValue({
        name: account.name,
        type: account.type,
        kind: account.kind,
        balance: account.balance,
      });
    } else {
      this.editingId.set(null);
      this.form.reset({ name: '', type: 'checking', kind: 'asset', balance: 0 });
    }
    this.dialogVisible = true;
  }

  async save(): Promise<void> {
    if (this.form.invalid) return;
    this.saving.set(true);

    const dto: CreateAccountDto = {
      ...this.form.getRawValue(),
      currency: this.currency(),
    };

    const id = this.editingId();
    const err = id
      ? await this.accountService.updateAccount(id, dto)
      : await this.accountService.createAccount(dto);

    this.saving.set(false);

    if (err) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: err });
    } else {
      this.dialogVisible = false;
      this.messageService.add({ severity: 'success', summary: 'Saved', detail: 'Account saved successfully' });
    }
  }

  confirmDelete(id: string, name: string): void {
    this.confirmation.confirm({
      message: `Delete "${name}"? All related transactions will also be deleted.`,
      header: 'Confirm Delete',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      accept: async () => {
        const err = await this.accountService.deleteAccount(id);
        if (err) {
          this.messageService.add({ severity: 'error', summary: 'Error', detail: err });
        } else {
          this.messageService.add({ severity: 'success', summary: 'Deleted', detail: 'Account deleted' });
        }
      },
    });
  }
}
