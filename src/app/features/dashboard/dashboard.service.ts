import { Injectable, computed, inject } from '@angular/core';
import { AccountService } from '../accounts/account.service';
import { TransactionService } from '../transactions/transaction.service';

export interface MonthlySummary {
  income: number;
  expenses: number;
  net: number;
}

export interface CategorySpending {
  name: string;
  amount: number;
  color: string | null;
}

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly accountService = inject(AccountService);
  private readonly transactionService = inject(TransactionService);

  readonly accounts = this.accountService.accounts;

  readonly totalAssets = computed(() =>
    this.accounts()
      .filter((a) => a.kind === 'asset')
      .reduce((sum, a) => sum + Number(a.balance), 0),
  );

  readonly totalLiabilities = computed(() =>
    this.accounts()
      .filter((a) => a.kind === 'liability')
      .reduce((sum, a) => sum + Number(a.balance), 0),
  );

  readonly netWorth = computed(() => this.totalAssets() - this.totalLiabilities());

  readonly assetAccounts = computed(() => this.accounts().filter((a) => a.kind === 'asset'));
  readonly liabilityAccounts = computed(() =>
    this.accounts().filter((a) => a.kind === 'liability'),
  );

  readonly monthlySummary = computed((): MonthlySummary => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
      .toISOString()
      .split('T')[0];

    const monthTx = this.transactionService
      .transactions()
      .filter((t) => t.transaction_date >= monthStart && t.type !== 'transfer');

    const income = monthTx
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + Number(t.amount), 0);
    const expenses = monthTx
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    return { income, expenses, net: income - expenses };
  });

  readonly spendingByCategory = computed((): CategorySpending[] => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
      .toISOString()
      .split('T')[0];

    const expenses = this.transactionService
      .transactions()
      .filter((t) => t.type === 'expense' && t.transaction_date >= monthStart);

    const map = new Map<string, CategorySpending>();
    for (const tx of expenses) {
      const name = tx.category?.name ?? 'Uncategorized';
      const existing = map.get(name) ?? { name, amount: 0, color: tx.category?.color ?? null };
      existing.amount += Number(tx.amount);
      map.set(name, existing);
    }

    return [...map.values()].sort((a, b) => b.amount - a.amount);
  });

  readonly monthlyTrend = computed(() => {
    const months: { label: string; income: number; expenses: number }[] = [];
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const start = d.toISOString().split('T')[0];
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0];
      const label = d.toLocaleDateString(undefined, { month: 'short' });

      const monthTx = this.transactionService
        .transactions()
        .filter(
          (t) => t.transaction_date >= start && t.transaction_date <= end && t.type !== 'transfer',
        );

      months.push({
        label,
        income: monthTx.filter((t) => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0),
        expenses: monthTx
          .filter((t) => t.type === 'expense')
          .reduce((s, t) => s + Number(t.amount), 0),
      });
    }

    return months;
  });

  async refresh(): Promise<void> {
    await Promise.all([
      this.accountService.loadAccounts(),
      this.transactionService.loadTransactions(),
    ]);
  }
}
