import { Component, inject, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { DashboardService } from './dashboard.service';
import { AccountService } from '../accounts/account.service';
import { TransactionService } from '../transactions/transaction.service';
import { ACCOUNT_TYPE_LABELS, Account } from '../../../shared/models/account.model';
import { AppCurrencyPipe } from '../../../shared/pipes/app-currency.pipe';
import { EmptyStateComponent } from '../../../shared/components/empty-state.component';
import { AuthService } from '../../../core/auth/auth.service';
import { TransferDisplayTransaction } from '../../../shared/utils/transfer-display';

@Component({
  selector: 'app-dashboard',
  imports: [
    DatePipe,
    RouterLink,
    CardModule,
    ButtonModule,
    DialogModule,
    ProgressSpinnerModule,
    TagModule,
    ToastModule,
    AppCurrencyPipe,
    EmptyStateComponent,
  ],
  providers: [MessageService],
  template: `
    <p-toast />

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
      <section class="section main-accounts-section">
        <div class="section-header">
          <h2>Main Accounts</h2>
          @if (accountService.accounts().length > 0) {
            <button pButton variant="text" (click)="favoritesDialogOpen = true">Manage</button>
          }
        </div>

        @if (accountService.accounts().length === 0) {
          <app-empty-state
            icon="pi pi-building-columns"
            title="No accounts yet"
            message="Add accounts first, then pin your main ones here."
          >
            <a routerLink="/finance/accounts" pButton>Add Account</a>
          </app-empty-state>
        } @else if (accountService.favorites().length === 0) {
          <app-empty-state
            icon="pi pi-star"
            title="No main accounts selected"
            message="Pin the accounts you use most to see them at a glance."
          >
            <button pButton (click)="favoritesDialogOpen = true">Choose Accounts</button>
          </app-empty-state>
        } @else {
          <div class="favorite-grid">
            @for (account of accountService.favorites(); track account.id) {
              <p-card styleClass="favorite-card">
                <div class="favorite-card-top">
                  <div>
                    <p class="favorite-name">{{ account.name }}</p>
                    <p-tag [value]="typeLabel(account.type)" severity="secondary" />
                  </div>
                  <button
                    pButton
                    iconOnly
                    variant="text"
                    severity="warn"
                    aria-label="Remove from main accounts"
                    (click)="toggleFavorite(account, false)"
                  >
                    <i class="pi pi-star-fill" aria-hidden="true"></i>
                  </button>
                </div>
                <p
                  class="favorite-balance"
                  [class.positive]="account.kind === 'asset'"
                  [class.negative]="account.kind === 'liability'"
                >
                  {{ account.balance | appCurrency: account.currency }}
                </p>
              </p-card>
            }
          </div>
        }
      </section>

      <section class="section kpi-section">
        <div class="section-header">
          <h2>Overview</h2>
        </div>
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
      </section>

      <section class="section kpi-section">
        <div class="section-header">
          <h2>This Month</h2>
        </div>
        <div class="stat-grid stat-grid--last">
          <p-card styleClass="stat-card">
            <p class="label">Income</p>
            <p class="value positive">{{ dashboard.monthlySummary().income | appCurrency }}</p>
          </p-card>
          <p-card styleClass="stat-card">
            <p class="label">Spending</p>
            <p class="value negative">{{ dashboard.monthlySummary().expenses | appCurrency }}</p>
          </p-card>
          <p-card styleClass="stat-card">
            <p class="label">Net</p>
            <p
              class="value"
              [class.positive]="dashboard.monthlySummary().net >= 0"
              [class.negative]="dashboard.monthlySummary().net < 0"
            >
              {{ dashboard.monthlySummary().net | appCurrency }}
            </p>
          </p-card>
        </div>
      </section>

      <section class="section">
        <div class="section-header">
          <h2>Recent Transactions</h2>
          <a routerLink="/finance/transactions" pButton variant="text">View all</a>
        </div>

        @if (recent().length === 0) {
          <app-empty-state
            icon="pi pi-list"
            title="No transactions yet"
            message="Start logging your income and expenses to see activity here."
          >
            <a routerLink="/finance/transactions" pButton>Add Transaction</a>
          </app-empty-state>
        } @else {
          <div class="tx-list">
            @for (tx of recent(); track tx.transfer_pair_id ?? tx.id) {
              <div class="tx-item">
                <div class="tx-info">
                  <span class="tx-desc">{{ tx.description || tx.category?.name || 'Transfer' }}</span>
                  <span class="tx-meta">
                    {{ transferMeta(tx) }} · {{ tx.transaction_date | date: 'mediumDate' }}
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

    <p-dialog
      header="Main Accounts"
      [(visible)]="favoritesDialogOpen"
      [modal]="true"
      [style]="{ width: '28rem' }"
    >
      <p class="dialog-intro">Select the accounts you want pinned on your dashboard.</p>

      @if (accountService.accounts().length === 0) {
        <p class="dialog-empty">No accounts available yet.</p>
      } @else {
        <div class="favorite-picker">
          @for (account of accountService.accounts(); track account.id) {
            <button type="button" class="favorite-picker-item" (click)="toggleFavorite(account, !account.is_favorite)">
              <div class="favorite-picker-info">
                <span class="favorite-picker-name">{{ account.name }}</span>
                <span class="favorite-picker-meta">
                  {{ typeLabel(account.type) }} · {{ account.balance | appCurrency: account.currency }}
                </span>
              </div>
              <i
                [class]="account.is_favorite ? 'pi pi-star-fill favorite-active' : 'pi pi-star favorite-inactive'"
                aria-hidden="true"
              ></i>
            </button>
          }
        </div>
      }

      <div class="dialog-actions">
        <button pButton (click)="favoritesDialogOpen = false">Done</button>
      </div>
    </p-dialog>
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

    .main-accounts-section {
      margin-top: 0;
      margin-bottom: 0;
    }

    .kpi-section {
      margin-top: 2rem;
    }

    .kpi-section .stat-grid {
      margin-bottom: 0;
    }

    .stat-grid--last {
      margin-bottom: 0;
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

    .favorite-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(14rem, 1fr));
      gap: 1rem;
    }

    .favorite-card-top {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 0.5rem;
      margin-bottom: 0.75rem;
    }

    .favorite-name {
      margin: 0 0 0.375rem;
      font-weight: 600;
      font-size: 1rem;
    }

    .favorite-balance {
      margin: 0;
      font-size: 1.375rem;
      font-weight: 700;
      font-variant-numeric: tabular-nums;
    }

    .dialog-intro {
      margin: 0 0 1rem;
      color: var(--p-text-muted-color);
      font-size: 0.875rem;
      line-height: 1.5;
    }

    .dialog-empty {
      margin: 0;
      color: var(--p-text-muted-color);
      font-size: 0.875rem;
    }

    .favorite-picker {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      max-height: 20rem;
      overflow-y: auto;
    }

    .favorite-picker-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      width: 100%;
      padding: 0.75rem 0.875rem;
      border: 1px solid var(--p-content-border-color);
      border-radius: var(--p-border-radius-md);
      background: var(--p-content-background);
      cursor: pointer;
      text-align: left;
      font: inherit;
      color: inherit;
    }

    .favorite-picker-item:hover {
      background: var(--p-content-hover-background);
    }

    .favorite-picker-info {
      display: flex;
      flex-direction: column;
      gap: 0.125rem;
      min-width: 0;
    }

    .favorite-picker-name {
      font-weight: 500;
    }

    .favorite-picker-meta {
      font-size: 0.8125rem;
      color: var(--p-text-muted-color);
    }

    .favorite-active {
      color: var(--p-yellow-500);
    }

    .favorite-inactive {
      color: var(--p-text-muted-color);
    }

    .dialog-actions {
      display: flex;
      justify-content: flex-end;
      margin-top: 1rem;
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
  protected readonly accountService = inject(AccountService);
  protected readonly auth = inject(AuthService);
  private readonly transactionService = inject(TransactionService);
  private readonly messageService = inject(MessageService);

  favoritesDialogOpen = false;

  loading = () => this.dashboard.accounts().length === 0 && this.transactionService.loading();

  ngOnInit(): void {
    this.refresh();
  }

  recent = () => this.transactionService.recent(5);

  transferMeta(tx: TransferDisplayTransaction): string {
    if (tx.type === 'transfer') {
      const from = tx.transfer_from_name ?? tx.account?.name ?? 'Account';
      const to = tx.transfer_to_name;
      return to ? `${from} → ${to}` : from;
    }
    return tx.account?.name ?? 'Account';
  }

  typeLabel(type: Account['type']): string {
    return ACCOUNT_TYPE_LABELS[type];
  }

  async toggleFavorite(account: Account, isFavorite: boolean): Promise<void> {
    const err = await this.accountService.toggleFavorite(account.id, isFavorite);
    if (err) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: err });
    }
  }

  async refresh(): Promise<void> {
    await this.dashboard.refresh();
  }
}
