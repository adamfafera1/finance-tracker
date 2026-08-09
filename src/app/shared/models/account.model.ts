export type AccountType = 'checking' | 'savings' | 'credit' | 'cash' | 'investment' | 'loan' | 'other';
export type AccountKind = 'asset' | 'liability';

export interface Account {
  id: string;
  user_id: string;
  name: string;
  type: AccountType;
  kind: AccountKind;
  balance: number;
  currency: string;
  created_at: string;
  updated_at: string;
}

export interface CreateAccountDto {
  name: string;
  type: AccountType;
  kind: AccountKind;
  balance: number;
  currency: string;
}

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  checking: 'Checking',
  savings: 'Savings',
  credit: 'Credit Card',
  cash: 'Cash',
  investment: 'Investment',
  loan: 'Loan',
  other: 'Other',
};
