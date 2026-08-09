import { CreateRecurringTransactionDto, RecurringTransaction } from '../models/recurring-transaction.model';

export function resolveRecurringTransactionType(
  explicitType: string | undefined,
  categoryType?: 'income' | 'expense' | null,
): 'income' | 'expense' {
  if (categoryType === 'income' || categoryType === 'expense') {
    return categoryType;
  }

  return explicitType === 'income' ? 'income' : 'expense';
}

export function resolveRecurringItemType(item: RecurringTransaction): 'income' | 'expense' {
  return resolveRecurringTransactionType(item.type, item.category?.type ?? null);
}

export function withResolvedType(
  dto: CreateRecurringTransactionDto,
  categoryType?: 'income' | 'expense' | null,
): CreateRecurringTransactionDto {
  return {
    ...dto,
    type: resolveRecurringTransactionType(dto.type, categoryType ?? null),
  };
}
