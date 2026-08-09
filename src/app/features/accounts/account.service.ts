import { Injectable, inject, signal } from '@angular/core';
import { SupabaseService } from '../../core/supabase/supabase.service';
import { Account, CreateAccountDto } from '../../shared/models/account.model';

@Injectable({ providedIn: 'root' })
export class AccountService {
  private readonly supabase = inject(SupabaseService).client;

  private readonly accountsSignal = signal<Account[]>([]);
  private readonly loadingSignal = signal(false);
  private readonly errorSignal = signal<string | null>(null);

  readonly accounts = this.accountsSignal.asReadonly();
  readonly loading = this.loadingSignal.asReadonly();
  readonly error = this.errorSignal.asReadonly();

  async loadAccounts(): Promise<void> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    const { data, error } = await this.supabase
      .from('accounts')
      .select('*')
      .order('kind')
      .order('name');

    this.loadingSignal.set(false);
    if (error) {
      this.errorSignal.set(error.message);
    } else {
      this.accountsSignal.set((data ?? []) as Account[]);
    }
  }

  async createAccount(dto: CreateAccountDto): Promise<string | null> {
    const { data: userData } = await this.supabase.auth.getUser();
    if (!userData.user) return 'Not authenticated';

    const { error } = await this.supabase.from('accounts').insert({
      ...dto,
      user_id: userData.user.id,
    });

    if (error) return error.message;
    await this.loadAccounts();
    return null;
  }

  async updateAccount(id: string, dto: Partial<CreateAccountDto>): Promise<string | null> {
    const { error } = await this.supabase.from('accounts').update(dto).eq('id', id);

    if (error) return error.message;
    await this.loadAccounts();
    return null;
  }

  async deleteAccount(id: string): Promise<string | null> {
    const { error } = await this.supabase.from('accounts').delete().eq('id', id);

    if (error) return error.message;
    await this.loadAccounts();
    return null;
  }

  getAccountById(id: string): Account | undefined {
    return this.accountsSignal().find((a) => a.id === id);
  }
}
