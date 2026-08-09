import { Component, inject, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { TagModule } from 'primeng/tag';
import { DashboardService } from './dashboard.service';
import { TransactionService } from '../transactions/transaction.service';
import { AppCurrencyPipe } from '../../shared/pipes/app-currency.pipe';
import { EmptyStateComponent } from '../../shared/components/empty-state.component';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-dashboard',
  imports: [
    DatePipe,
    RouterLink,
    CardModule,
    ButtonModule,
    ProgressSpinnerModule,
    TagModule,
    AppCurrencyPipe,
    EmptyStateComponent,
  ],
  template: `
    <div class="page-header">
      <div>
        <h1>Dashboard</h1>
        @if (auth.profile()?.display_name) {
          <p class="greeting">Welcome back, {{ auth.profile()!.display_name }}</p>
        }
      </div>
      <button pButton variant="outlined" severity="secondary" (click)="refresh()" [disabled]="loading()">
        <i class="pi pi-refresh" [class.pi-spin]="loading()" aria-hidden="true"></i>
        Refresh
      </button>
    </div>

    @if (loading()) {
      <div class="loading-center"><p-progressspinner ariaLabel="Loading dashboard" /></div>
    } @else {
      <div class="stat-grid">
        <p-card styleClass="stat-card net-worth-card">
          <p class="label">Net Worth</p>
          <p class="value">{{ dashboard.netWorth() | appCurrency }}</p>
        </p-card>
        <p-card styleClass="stat-card">
          <p class="label">Total Assets</p>
          <p class="value positive">{{ dashboard.totalAssets() | appCurrency }}</p>
        </p-card>
        <p-card styleClass="stat-card">
          <p class="label">Total Liabilities</p>
          <p class="value negative">{{ dashboard.totalLiabilities() | appCurrency }}</p>
        </p-card>
      </div>

      <div class="stat-grid">
        <p-card styleClass="stat-card">
          <p class="label">Income This Month</p>
          <p class="value positive">{{ dashboard.monthlySummary().income | appCurrency }}</p>
        </p-card>
        <p-card styleClass="stat-card">
          <p class="label">Spending This Month</p>
          <p class="value negative">{{ dashboard.monthlySummary().expenses | appCurrency }}</p>
        </p-card>
        <p-card styleClass="stat-card">
          <p class="label">Net This Month</p>
          <p
            class="value"
            [class.positive]="dashboard.monthlySummary().net >= 0"
            [class.negative]="dashboard.monthlySummary().net < 0"
          >
            {{ dashboard.monthlySummary().net | appCurrency }}
          </p>
        </p-card>
      </div>

      <section class="section">
        <div class="section-header">
          <h2>Recent Transactions</h2>
          <a routerLink="/transactions" pButton variant="text">View all</a>
        </div>

        @if (recent().length === 0) {
          <app-empty-state
            icon="pi pi-list"
            title="No transactions yet"
            message="Start logging your income and expenses to see activity here."
          >
            <a routerLink="/transactions" pButton>Add Transaction</a>
          </app-empty-state>
        } @else {
          <div class="tx-list">
            @for (tx of recent(); track tx.id) {
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
                </div>
              </div>
            }
          </div>
        }
      </section>
    }
  `,
  styles: `
    .greeting {
      margin: 0.25rem 0 0;
      color: var(--p-text-muted-color);
      font-size: 0.875rem;
    }

    .net-worth-card .value {
      font-size: 2rem;
      color: var(--p-primary-color);
    }

    .section {
      margin-top: 1.5rem;
    }

    .section-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 0.75rem;
    }

    .section-header h2 {
      margin: 0;
      font-size: 1.125rem;
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
    }

    .tx-desc {
      font-weight: 500;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .tx-meta {
      font-size: 0.8125rem;
      color: var(--p-text-muted-color);
    }

    .tx-right {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      flex-shrink: 0;
    }

    .tx-amount {
      font-weight: 600;
      min-width: 5rem;
      text-align: right;
    }
  `,
})
export class DashboardComponent implements OnInit {
  protected readonly dashboard = inject(DashboardService);
  protected readonly auth = inject(AuthService);
  private readonly transactionService = inject(TransactionService);

  loading = () => this.dashboard.accounts().length === 0 && this.transactionService.loading();

  ngOnInit(): void {
    this.refresh();
  }

  recent = () => this.transactionService.recent(5);

  async refresh(): Promise<void> {
    await this.dashboard.refresh();
  }
}
