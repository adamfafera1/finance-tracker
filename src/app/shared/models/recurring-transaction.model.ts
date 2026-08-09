import { TransactionType } from './transaction.model';

export type RecurringFrequency = 'weekly' | 'monthly' | 'yearly';

export interface RecurringTransaction {
  id: string;
  user_id: string;
  account_id: string;
  category_id: string | null;
  amount: number;
  type: TransactionType;
  description: string | null;
  frequency: RecurringFrequency;
  start_date: string;
  next_run_date: string;
  end_date: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  account?: { name: string };
  category?: { name: string; color: string | null; type?: 'income' | 'expense' };
}

export interface CreateRecurringTransactionDto {
  account_id: string;
  category_id?: string | null;
  amount: number;
  type: 'income' | 'expense';
  description?: string;
  frequency: RecurringFrequency;
  start_date: string;
  end_date?: string | null;
}

export const FREQUENCY_LABELS: Record<RecurringFrequency, string> = {
  weekly: 'Weekly',
  monthly: 'Monthly',
  yearly: 'Yearly',
};
