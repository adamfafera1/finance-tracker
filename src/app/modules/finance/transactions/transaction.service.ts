import { Injectable, inject, signal } from '@angular/core';
import { SupabaseService } from '../../../core/supabase/supabase.service';
import {
  CreateTransactionDto,
  CreateTransferDto,
  Transaction,
  TransferLegs,
  UpdateTransactionDto,
  UpdateTransferDto,
} from '../../../shared/models/transaction.model';
import { collapseTransferPairs } from '../../../shared/utils/transfer-display';

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

  async createTransaction(
    dto: CreateTransactionDto,
    options?: { reload?: boolean },
  ): Promise<string | null> {
    const { data: userData } = await this.supabase.auth.getUser();
    if (!userData.user) return 'Not authenticated';

    const { error } = await this.supabase.from('transactions').insert({
      ...dto,
      user_id: userData.user.id,
    });

    if (error) return error.message;
    if (options?.reload !== false) {
      await this.loadTransactions();
    }
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

  async updateTransaction(id: string, dto: UpdateTransactionDto): Promise<string | null> {
    const { error } = await this.supabase
      .from('transactions')
      .update({
        account_id: dto.account_id,
        category_id: dto.category_id ?? null,
        amount: dto.amount,
        type: dto.type,
        description: dto.description ?? null,
        transaction_date: dto.transaction_date,
      })
      .eq('id', id);

    if (error) return error.message;
    await this.loadTransactions();
    return null;
  }

  async getTransferLegs(pairId: string): Promise<TransferLegs | null> {
    const { data, error } = await this.supabase
      .from('transactions')
      .select('account_id, amount, description, transaction_date, created_at')
      .eq('transfer_pair_id', pairId)
      .order('created_at', { ascending: true });

    if (error || !data || data.length < 2) return null;

    return {
      from_account_id: data[0].account_id,
      to_account_id: data[1].account_id,
      amount: Number(data[0].amount),
      description: data[0].description,
      transaction_date: data[0].transaction_date,
    };
  }

  async updateTransfer(dto: UpdateTransferDto): Promise<string | null> {
    const { data: userData } = await this.supabase.auth.getUser();
    if (!userData.user) return 'Not authenticated';

    const { error } = await this.supabase.rpc('update_transfer', {
      p_user_id: userData.user.id,
      p_pair_id: dto.pair_id,
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

  recent(limit = 5): ReturnType<typeof collapseTransferPairs> {
    return collapseTransferPairs(this.transactionsSignal()).slice(0, limit);
  }
}
