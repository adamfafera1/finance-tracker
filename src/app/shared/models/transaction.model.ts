export type TransactionType = 'income' | 'expense' | 'transfer';

export interface Transaction {
  id: string;
  user_id: string;
  account_id: string;
  category_id: string | null;
  amount: number;
  type: TransactionType;
  description: string | null;
  transaction_date: string;
  transfer_pair_id: string | null;
  recurring_transaction_id: string | null;
  created_at: string;
  account?: { name: string; kind: string };
  category?: { name: string; color: string | null; icon: string | null };
}

export interface CreateTransactionDto {
  account_id: string;
  category_id?: string | null;
  amount: number;
  type: TransactionType;
  description?: string;
  transaction_date: string;
  recurring_transaction_id?: string | null;
}

export interface CreateTransferDto {
  from_account_id: string;
  to_account_id: string;
  amount: number;
  description?: string;
  transaction_date: string;
}

export interface UpdateTransactionDto {
  account_id: string;
  category_id?: string | null;
  amount: number;
  type: TransactionType;
  description?: string;
  transaction_date: string;
}

export interface UpdateTransferDto extends CreateTransferDto {
  pair_id: string;
}

export interface TransferLegs {
  from_account_id: string;
  to_account_id: string;
  amount: number;
  description: string | null;
  transaction_date: string;
}
