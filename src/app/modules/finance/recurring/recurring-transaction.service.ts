import { Injectable, inject, signal } from '@angular/core';
import { SupabaseService } from '../../../core/supabase/supabase.service';
import {
  CreateRecurringTransactionDto,
  RecurringTransaction,
} from '../../../shared/models/recurring-transaction.model';
import { advanceRecurringDate, todayIso } from '../../../shared/utils/recurrence';
import { resolveRecurringItemType, resolveRecurringTransactionType, withResolvedType } from '../../../shared/utils/recurring-type';
import { AccountService } from '../accounts/account.service';
import { CategoryService } from '../categories/category.service';
import { TransactionService } from '../transactions/transaction.service';

@Injectable({ providedIn: 'root' })
export class RecurringTransactionService {
  private readonly supabase = inject(SupabaseService).client;
  private readonly transactionService = inject(TransactionService);
  private readonly accountService = inject(AccountService);
  private readonly categoryService = inject(CategoryService);

  private readonly recurringSignal = signal<RecurringTransaction[]>([]);
  private readonly loadingSignal = signal(false);
  private readonly processingSignal = signal(false);

  readonly recurring = this.recurringSignal.asReadonly();
  readonly loading = this.loadingSignal.asReadonly();
  readonly processing = this.processingSignal.asReadonly();

  async loadRecurring(): Promise<void> {
    this.loadingSignal.set(true);

    const { data, error } = await this.supabase
      .from('recurring_transactions')
      .select('*, account:accounts(name), category:categories(name, color, type)')
      .order('next_run_date', { ascending: true });

    this.loadingSignal.set(false);
    if (!error) {
      this.recurringSignal.set((data ?? []) as RecurringTransaction[]);
    }
  }

  async createRecurring(dto: CreateRecurringTransactionDto): Promise<string | null> {
    const { data: userData } = await this.supabase.auth.getUser();
    if (!userData.user) return 'Not authenticated';

    const categoryType = this.categoryTypeFor(dto.category_id ?? null);
    const payload = withResolvedType(dto, categoryType);

    const { error } = await this.supabase.from('recurring_transactions').insert({
      account_id: payload.account_id,
      category_id: payload.category_id ?? null,
      amount: payload.amount,
      type: payload.type,
      description: payload.description ?? null,
      frequency: payload.frequency,
      start_date: payload.start_date,
      next_run_date: payload.start_date,
      end_date: payload.end_date ?? null,
      user_id: userData.user.id,
    });

    if (error) return error.message;
    await this.loadRecurring();
    return null;
  }

  async updateRecurring(
    id: string,
    dto: Partial<CreateRecurringTransactionDto> & { is_active?: boolean; next_run_date?: string },
  ): Promise<string | null> {
    const categoryType =
      dto.category_id !== undefined
        ? this.categoryTypeFor(dto.category_id ?? null)
        : this.categoryTypeFor(this.recurringSignal().find((item) => item.id === id)?.category_id ?? null);

    const payload: Partial<CreateRecurringTransactionDto> & {
      is_active?: boolean;
      next_run_date?: string;
      updated_at?: string;
    } =
      dto.type !== undefined || dto.category_id !== undefined
        ? {
            ...dto,
            type: resolveRecurringTransactionType(
              dto.type ?? this.recurringSignal().find((item) => item.id === id)?.type,
              categoryType,
            ),
          }
        : { ...dto };

    if (payload.start_date !== undefined) {
      payload.next_run_date = payload.start_date;
    }

    const { error } = await this.supabase
      .from('recurring_transactions')
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) return error.message;
    await this.loadRecurring();
    return null;
  }

  async deleteRecurring(id: string): Promise<string | null> {
    const { error } = await this.supabase.from('recurring_transactions').delete().eq('id', id);
    if (error) return error.message;
    await this.loadRecurring();
    return null;
  }

  async toggleActive(id: string, isActive: boolean): Promise<string | null> {
    return this.updateRecurring(id, { is_active: isActive });
  }

  async processDue(): Promise<number> {
    if (this.processingSignal()) return 0;
    this.processingSignal.set(true);

    await this.categoryService.loadCategories();
    await this.loadRecurring();
    const today = todayIso();
    let created = 0;

    for (const item of this.recurringSignal()) {
      if (!item.is_active) continue;

      const txType = resolveRecurringItemType(item);
      if (item.type !== txType) {
        await this.supabase.from('recurring_transactions').update({ type: txType }).eq('id', item.id);
      }

      let nextRun = item.next_run_date;
      let iterations = 0;

      while (nextRun <= today && iterations < 52) {
        if (item.end_date && nextRun > item.end_date) break;

        const alreadyCreated = await this.hasGeneratedForDate(item.id, nextRun);
        if (!alreadyCreated) {
          const err = await this.transactionService.createTransaction(
            {
              account_id: item.account_id,
              category_id: item.category_id,
              amount: Number(item.amount),
              type: txType,
              description: item.description ?? undefined,
              transaction_date: nextRun,
              recurring_transaction_id: item.id,
            },
            { reload: false },
          );

          if (err) break;
          created++;
        }

        nextRun = advanceRecurringDate(nextRun, item.frequency);
        iterations++;
      }

      if (nextRun !== item.next_run_date) {
        await this.updateRecurring(item.id, { next_run_date: nextRun });
      }
    }

    if (created > 0) {
      await this.accountService.loadAccounts();
      await this.transactionService.loadTransactions();
    }

    await this.loadRecurring();
    this.processingSignal.set(false);
    return created;
  }

  private categoryTypeFor(categoryId: string | null): 'income' | 'expense' | null {
    if (!categoryId) return null;
    return this.categoryService.categories().find((category) => category.id === categoryId)?.type ?? null;
  }

  private async hasGeneratedForDate(recurringId: string, date: string): Promise<boolean> {
    const { data } = await this.supabase
      .from('transactions')
      .select('id')
      .eq('recurring_transaction_id', recurringId)
      .eq('transaction_date', date)
      .maybeSingle();

    return !!data;
  }
}
