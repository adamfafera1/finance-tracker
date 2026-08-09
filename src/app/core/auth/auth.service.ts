import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Session, User } from '@supabase/supabase-js';
import { SupabaseService } from '../supabase/supabase.service';
import { Profile } from '../../shared/models/profile.model';
import { RecurringTransactionService } from '../../modules/finance/recurring/recurring-transaction.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly supabase = inject(SupabaseService).client;
  private readonly router = inject(Router);
  private readonly recurringService = inject(RecurringTransactionService);

  private readonly sessionSignal = signal<Session | null>(null);
  private readonly profileSignal = signal<Profile | null>(null);
  private readonly loadingSignal = signal(true);

  readonly session = this.sessionSignal.asReadonly();
  readonly profile = this.profileSignal.asReadonly();
  readonly loading = this.loadingSignal.asReadonly();
  readonly user = computed<User | null>(() => this.sessionSignal()?.user ?? null);
  readonly isAuthenticated = computed(() => !!this.sessionSignal());
  readonly defaultCurrency = computed(() => this.profileSignal()?.default_currency ?? 'EUR');

  constructor() {
    this.init();
  }

  private async init(): Promise<void> {
    const { data } = await this.supabase.auth.getSession();
    this.sessionSignal.set(data.session);
    if (data.session) {
      await this.loadProfile();
      void this.recurringService.processDue();
    }
    this.loadingSignal.set(false);

    this.supabase.auth.onAuthStateChange(async (_event, session) => {
      this.sessionSignal.set(session);
      if (session) {
        await this.loadProfile();
        void this.recurringService.processDue();
      } else {
        this.profileSignal.set(null);
      }
    });
  }

  async signUp(email: string, password: string, displayName: string): Promise<string | null> {
    const { error } = await this.supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: displayName } },
    });
    return error?.message ?? null;
  }

  async signIn(email: string, password: string): Promise<string | null> {
    const { error } = await this.supabase.auth.signInWithPassword({ email, password });
    return error?.message ?? null;
  }

  async signOut(): Promise<void> {
    await this.supabase.auth.signOut();
    this.router.navigate(['/auth/login']);
  }

  async updateDefaultCurrency(currency: string): Promise<string | null> {
    const userId = this.sessionSignal()?.user?.id;
    if (!userId) return 'Not authenticated';

    const { data, error } = await this.supabase
      .from('profiles')
      .update({ default_currency: currency })
      .eq('id', userId)
      .select('*')
      .single();

    if (error) return error.message;
    if (data) this.profileSignal.set(data as Profile);
    return null;
  }

  private async loadProfile(): Promise<void> {
    const userId = this.sessionSignal()?.user?.id;
    if (!userId) return;

    const { data } = await this.supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (data) {
      this.profileSignal.set(data as Profile);
    }
  }
}
