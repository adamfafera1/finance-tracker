import { Injectable, inject, signal } from '@angular/core';
import { SupabaseService } from '../../core/supabase/supabase.service';
import {
  CreateTransactionDto,
  CreateTransferDto,
  Transaction,
} from '../../shared/models/transaction.model';

@Injectable({ providedIn: 'root' })
export class TransactionService {
  private readonly supabase = inject(SupabaseService).client;

  private readonly transactionsSignal = signal<Transaction[]>([]);
  private readonly loadingSignal = signal(false);
  private readonly errorSignal = signal<string | null>(null);

  readonly transactions = this.transactionsSignal.asReadonly();
  readonly loading = this.loadingSignal.asReadonly();
  readonly error = this.errorSignal.asReadonly();

  async loadTransactions(filters?: {
    accountId?: string;
    type?: string;
    fromDate?: string;
    toDate?: string;
  }): Promise<void> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    let query = this.supabase
      .from('transactions')
      .select('*, account:accounts(name, kind), category:categories(name, color, icon)')
      .order('transaction_date', { ascending: false })
      .order('created_at', { ascending: false });

    if (filters?.accountId) {
      query = query.eq('account_id', filters.accountId);
    }
    if (filters?.type) {
      query = query.eq('type', filters.type);
    }
    if (filters?.fromDate) {
      query = query.gte('transaction_date', filters.fromDate);
    }
    if (filters?.toDate) {
      query = query.lte('transaction_date', filters.toDate);
    }

    const { data, error } = await query.limit(200);

    this.loadingSignal.set(false);
    if (error) {
      this.errorSignal.set(error.message);
    } else {
      this.transactionsSignal.set((data ?? []) as Transaction[]);
    }
  }

  async createTransaction(dto: CreateTransactionDto): Promise<string | null> {
    const { data: userData } = await this.supabase.auth.getUser();
    if (!userData.user) return 'Not authenticated';

    const { error } = await this.supabase.from('transactions').insert({
      ...dto,
      user_id: userData.user.id,
    });

    if (error) return error.message;
    await this.loadTransactions();
    return null;
  }

  async createTransfer(dto: CreateTransferDto): Promise<string | null> {
    const { data: userData } = await this.supabase.auth.getUser();
    if (!userData.user) return 'Not authenticated';

    const { error } = await this.supabase.rpc('create_transfer', {
      p_user_id: userData.user.id,
      p_from_account_id: dto.from_account_id,
      p_to_account_id: dto.to_account_id,
      p_amount: dto.amount,
      p_description: dto.description ?? null,
      p_transaction_date: dto.transaction_date,
    });

    if (error) return error.message;
    await this.loadTransactions();
    return null;
  }

  async deleteTransaction(id: string): Promise<string | null> {
    const { error } = await this.supabase.from('transactions').delete().eq('id', id);
    if (error) return error.message;
    await this.loadTransactions();
    return null;
  }

  async deleteTransfer(pairId: string): Promise<string | null> {
    const { data: userData } = await this.supabase.auth.getUser();
    if (!userData.user) return 'Not authenticated';

    const { error } = await this.supabase.rpc('delete_transfer', {
      p_user_id: userData.user.id,
      p_pair_id: pairId,
    });

    if (error) return error.message;
    await this.loadTransactions();
    return null;
  }

  recent(limit = 5): Transaction[] {
    return this.transactionsSignal().slice(0, limit);
  }
}
