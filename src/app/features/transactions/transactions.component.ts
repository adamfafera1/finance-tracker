import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';
import { SelectButtonModule } from 'primeng/selectbutton';
import { ConfirmationService, MessageService } from 'primeng/api';
import { TransactionService } from './transaction.service';
import { AccountService } from '../accounts/account.service';
import { CategoryService } from '../categories/category.service';
import { Transaction } from '../../shared/models/transaction.model';
import { EmptyStateComponent } from '../../shared/components/empty-state.component';
import { TransactionListComponent } from '../../shared/components/transaction-list.component';
import { TransactionFormDialogComponent } from '../../shared/components/transaction-form-dialog.component';

@Component({
  selector: 'app-transactions',
  imports: [
    FormsModule,
    ButtonModule,
    ProgressSpinnerModule,
    ConfirmDialogModule,
    ToastModule,
    SelectButtonModule,
    EmptyStateComponent,
    TransactionListComponent,
    TransactionFormDialogComponent,
  ],
  providers: [ConfirmationService, MessageService],
  template: `
    <p-toast />
    <p-confirmdialog />

    <div class="page-header">
      <h1>Transactions</h1>
      <button pButton (click)="openAdd()">
        <i class="pi pi-plus" aria-hidden="true"></i>
        Add Transaction
      </button>
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
      />
    } @else {
      <app-transaction-list
        [transactions]="filteredTransactions()"
        (edit)="openEdit($event)"
        (delete)="confirmDelete($event)"
      />
    }

    <app-transaction-form-dialog
      [(visible)]="dialogOpen"
      [transaction]="editingTransaction()"
      (saved)="onSaved()"
    />
  `,
  styles: `
    .filters {
      margin-bottom: 1rem;
    }
  `,
})
export class TransactionsComponent implements OnInit {
  protected readonly transactionService = inject(TransactionService);
  private readonly accountService = inject(AccountService);
  private readonly categoryService = inject(CategoryService);
  private readonly confirmation = inject(ConfirmationService);
  private readonly messageService = inject(MessageService);

  dialogOpen = false;
  editingTransaction = signal<Transaction | null>(null);
  selectedFilter = signal('all');

  typeFilters = [
    { label: 'All', value: 'all' },
    { label: 'Income', value: 'income' },
    { label: 'Expense', value: 'expense' },
    { label: 'Transfer', value: 'transfer' },
  ];

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
    const filter = this.selectedFilter();
    if (filter === 'all') {
      this.transactionService.loadTransactions();
    } else {
      this.transactionService.loadTransactions({ type: filter });
    }
    this.messageService.add({ severity: 'success', summary: 'Saved', detail: 'Transaction saved' });
  }

  confirmDelete(tx: Transaction): void {
    this.confirmation.confirm({
      message: 'Delete this transaction?',
      header: 'Confirm Delete',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      accept: async () => {
        const err =
          tx.type === 'transfer' && tx.transfer_pair_id
            ? await this.transactionService.deleteTransfer(tx.transfer_pair_id)
            : await this.transactionService.deleteTransaction(tx.id);
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
