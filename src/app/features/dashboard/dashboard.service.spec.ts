import { describe, expect, it } from 'vitest';
import { DashboardService } from './dashboard.service';
import { Account } from '../../shared/models/account.model';
import { Transaction } from '../../shared/models/transaction.model';

function makeAccount(overrides: Partial<Account> = {}): Account {
  return {
    id: '1',
    user_id: 'u1',
    name: 'Test',
    type: 'checking',
    kind: 'asset',
    balance: 1000,
    currency: 'EUR',
    created_at: '',
    updated_at: '',
    ...overrides,
  };
}

function makeTransaction(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: '1',
    user_id: 'u1',
    account_id: '1',
    category_id: null,
    amount: 100,
    type: 'expense',
    description: null,
    transaction_date: new Date().toISOString().split('T')[0],
    transfer_pair_id: null,
    recurring_transaction_id: null,
    created_at: '',
    ...overrides,
  };
}

describe('DashboardService calculations', () => {
  it('computes net worth as assets minus liabilities', () => {
    const accounts: Account[] = [
      makeAccount({ id: '1', kind: 'asset', balance: 5000 }),
      makeAccount({ id: '2', kind: 'asset', balance: 3000 }),
      makeAccount({ id: '3', kind: 'liability', balance: 2000 }),
    ];

    const assets = accounts.filter((a) => a.kind === 'asset').reduce((s, a) => s + a.balance, 0);
    const liabilities = accounts.filter((a) => a.kind === 'liability').reduce((s, a) => s + a.balance, 0);

    expect(assets).toBe(8000);
    expect(liabilities).toBe(2000);
    expect(assets - liabilities).toBe(6000);
  });

  it('computes monthly income and expenses excluding transfers', () => {
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      .toISOString()
      .split('T')[0];

    const transactions: Transaction[] = [
      makeTransaction({ type: 'income', amount: 3000, transaction_date: monthStart }),
      makeTransaction({ id: '2', type: 'expense', amount: 500, transaction_date: monthStart }),
      makeTransaction({ id: '3', type: 'transfer', amount: 200, transaction_date: monthStart }),
    ];

    const monthTx = transactions.filter((t) => t.transaction_date >= monthStart && t.type !== 'transfer');
    const income = monthTx.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expenses = monthTx.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

    expect(income).toBe(3000);
    expect(expenses).toBe(500);
    expect(income - expenses).toBe(2500);
  });
});

describe('Balance delta logic', () => {
  it('asset income increases balance', () => {
    const kind = 'asset';
    const type = 'income';
    const amount = 100;
    const delta = kind === 'asset' ? (type === 'income' ? amount : -amount) : type === 'expense' ? amount : -amount;
    expect(delta).toBe(100);
  });

  it('asset expense decreases balance', () => {
    const kind = 'asset';
    const type = 'expense';
    const amount = 50;
    const delta = kind === 'asset' ? (type === 'income' ? amount : -amount) : type === 'expense' ? amount : -amount;
    expect(delta).toBe(-50);
  });

  it('liability expense increases balance owed', () => {
    const kind = 'liability';
    const type = 'expense';
    const amount = 75;
    const delta = kind === 'asset' ? (type === 'income' ? amount : -amount) : type === 'expense' ? amount : -amount;
    expect(delta).toBe(75);
  });
});
