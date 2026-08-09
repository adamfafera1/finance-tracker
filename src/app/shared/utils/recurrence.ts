import { RecurringFrequency } from '../models/recurring-transaction.model';
import { toLocalIsoDate, todayLocalIso } from './date';

export function todayIso(): string {
  return todayLocalIso();
}

export function advanceRecurringDate(dateIso: string, frequency: RecurringFrequency): string {
  const [year, month, day] = dateIso.split('-').map(Number);
  const date = new Date(year, month - 1, day);

  switch (frequency) {
    case 'weekly':
      date.setDate(date.getDate() + 7);
      break;
    case 'monthly':
      date.setMonth(date.getMonth() + 1);
      break;
    case 'yearly':
      date.setFullYear(date.getFullYear() + 1);
      break;
  }

  return toLocalIsoDate(date);
}

export function frequencyLabel(frequency: RecurringFrequency): string {
  switch (frequency) {
    case 'weekly':
      return 'Every week';
    case 'monthly':
      return 'Every month';
    case 'yearly':
      return 'Every year';
  }
}
