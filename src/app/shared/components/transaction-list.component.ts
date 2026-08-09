import { Component, input, output } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { Transaction } from '../models/transaction.model';
import { AppCurrencyPipe } from '../pipes/app-currency.pipe';

@Component({
  selector: 'app-transaction-list',
  imports: [DatePipe, ButtonModule, TagModule, AppCurrencyPipe],
  template: `
    <div class="tx-list">
      @for (tx of transactions(); track tx.id) {
        <div class="tx-item">
          <div class="tx-info">
            <span class="tx-desc">{{ tx.description || tx.category?.name || 'Transfer' }}</span>
            <span class="tx-meta">
              {{ tx.account?.name }} · {{ tx.transaction_date | date: 'mediumDate' }}
            </span>
          </div>
          <div class="tx-right">
            @if (showType()) {
              <p-tag
                [value]="tx.type"
                [severity]="tx.type === 'income' ? 'success' : tx.type === 'expense' ? 'danger' : 'info'"
              />
            }
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
              severity="secondary"
              aria-label="Edit transaction"
              (click)="edit.emit(tx)"
            >
              <i class="pi pi-pencil" aria-hidden="true"></i>
            </button>
            <button
              pButton
              iconOnly
              variant="text"
              severity="danger"
              aria-label="Delete transaction"
              (click)="delete.emit(tx)"
            >
              <i class="pi pi-trash" aria-hidden="true"></i>
            </button>
          </div>
        </div>
      }
    </div>
  `,
  styles: `
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
      font-variant-numeric: tabular-nums;
    }

    .tx-amount.positive {
      color: var(--p-green-500);
    }

    .tx-amount.negative {
      color: var(--p-red-500);
    }
  `,
})
export class TransactionListComponent {
  transactions = input.required<Transaction[]>();
  showType = input(true);
  edit = output<Transaction>();
  delete = output<Transaction>();
}
