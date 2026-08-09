import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { ToastModule } from 'primeng/toast';
import { ConfirmationService, MessageService } from 'primeng/api';
import { TransactionService } from '../transactions/transaction.service';
import { AccountService } from '../accounts/account.service';
import { CategoryService } from '../categories/category.service';
import { Transaction } from '../../shared/models/transaction.model';
import { AppCurrencyPipe } from '../../shared/pipes/app-currency.pipe';
import { EmptyStateComponent } from '../../shared/components/empty-state.component';
import { TransactionListComponent } from '../../shared/components/transaction-list.component';
import { TransactionFormDialogComponent } from '../../shared/components/transaction-form-dialog.component';

@Component({
  selector: 'app-incoming',
  imports: [
    ButtonModule,
    CardModule,
    ConfirmDialogModule,
    ProgressSpinnerModule,
    ToastModule,
    AppCurrencyPipe,
    EmptyStateComponent,
    TransactionListComponent,
    TransactionFormDialogComponent,
  ],
  providers: [ConfirmationService, MessageService],
  template: `
    <p-toast />
    <p-confirmdialog />

    <div class="page-header">
      <h1>Incoming</h1>
      <button pButton (click)="openAdd()">
        <i class="pi pi-plus" aria-hidden="true"></i>
        Add Income
      </button>
    </div>

    <div class="stat-grid">
      <p-card styleClass="stat-card">
        <p class="label">This Month</p>
        <p class="value positive">{{ monthlyTotal() | appCurrency }}</p>
      </p-card>
      <p-card styleClass="stat-card">
        <p class="label">Total Entries</p>
        <p class="value">{{ incomeTransactions().length }}</p>
      </p-card>
    </div>

    @if (transactionService.loading()) {
      <div class="loading-center"><p-progressspinner ariaLabel="Loading incoming transactions" /></div>
    } @else if (incomeTransactions().length === 0) {
      <app-empty-state
        icon="pi pi-arrow-down-left"
        title="No incoming transactions yet"
        message="Track salary, refunds, and other money coming in."
      />
    } @else {
      <app-transaction-list
        [transactions]="incomeTransactions()"
        [showType]="false"
        (edit)="openEdit($event)"
        (delete)="confirmDelete($event)"
      />
    }

    <app-transaction-form-dialog
      [(visible)]="dialogOpen"
      [transaction]="editingTransaction()"
      fixedType="income"
      dialogTitle="Add Incoming Transaction"
      (saved)="onSaved()"
    />
  `,
})
export class IncomingComponent implements OnInit {
  protected readonly transactionService = inject(TransactionService);
  private readonly accountService = inject(AccountService);
  private readonly categoryService = inject(CategoryService);
  private readonly confirmation = inject(ConfirmationService);
  private readonly messageService = inject(MessageService);

  dialogOpen = false;
  editingTransaction = signal<Transaction | null>(null);

  incomeTransactions = computed(() =>
    this.transactionService.transactions().filter((t) => t.type === 'income'),
  );

  monthlyTotal = computed(() => {
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      .toISOString()
      .split('T')[0];

    return this.incomeTransactions()
      .filter((t) => t.transaction_date >= monthStart)
      .reduce((sum, t) => sum + Number(t.amount), 0);
  });

  ngOnInit(): void {
    this.accountService.loadAccounts();
    this.categoryService.loadCategories();
    this.transactionService.loadTransactions({ type: 'income' });
  }

  openAdd(): void {
    this.editingTransaction.set(null);
    this.dialogOpen = true;
  }

  openEdit(tx: Transaction): void {
    this.editingTransaction.set(tx);
    this.dialogOpen = true;
  }

  onSaved(): void {
    this.editingTransaction.set(null);
    this.transactionService.loadTransactions({ type: 'income' });
    this.messageService.add({
      severity: 'success',
      summary: 'Saved',
      detail: 'Incoming transaction saved',
    });
  }

  confirmDelete(tx: Transaction): void {
    this.confirmation.confirm({
      message: 'Delete this incoming transaction?',
      header: 'Confirm Delete',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      accept: async () => {
        const err = await this.transactionService.deleteTransaction(tx.id);
        if (err) {
          this.messageService.add({ severity: 'error', summary: 'Error', detail: err });
        } else {
          await this.accountService.loadAccounts();
          await this.transactionService.loadTransactions({ type: 'income' });
          this.messageService.add({ severity: 'success', summary: 'Deleted', detail: 'Transaction deleted' });
        }
      },
    });
  }
}
