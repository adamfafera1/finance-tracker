import { describe, expect, it } from 'vitest';
import {
  resolveRecurringItemType,
  resolveRecurringTransactionType,
} from './recurring-type';
import { RecurringTransaction } from '../models/recurring-transaction.model';

describe('recurring-type', () => {
  it('uses income category type when form type is expense', () => {
    expect(resolveRecurringTransactionType('expense', 'income')).toBe('income');
  });

  it('falls back to explicit type without category', () => {
    expect(resolveRecurringTransactionType('income', null)).toBe('income');
  });

  it('resolves recurring item type from joined category', () => {
    const item = {
      type: 'expense',
      category: { name: 'Salary', color: '#22c55e', type: 'income' },
    } as RecurringTransaction;

    expect(resolveRecurringItemType(item)).toBe('income');
  });
});
