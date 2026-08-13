import { Injectable, inject, signal } from '@angular/core';
import { SupabaseService } from '../../../core/supabase/supabase.service';
import {
  CreateSavingGoalDto,
  SavingGoal,
  UpdateSavingGoalDto,
} from '../../../shared/models/saving-goal.model';

@Injectable({ providedIn: 'root' })
export class SavingGoalService {
  private readonly supabase = inject(SupabaseService).client;

  private readonly goalsSignal = signal<SavingGoal[]>([]);
  private readonly loadingSignal = signal(false);
  private readonly errorSignal = signal<string | null>(null);

  readonly goals = this.goalsSignal.asReadonly();
  readonly loading = this.loadingSignal.asReadonly();
  readonly error = this.errorSignal.asReadonly();

  async loadGoals(): Promise<void> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    const { data, error } = await this.supabase
      .from('saving_goals')
      .select('*')
      .order('created_at', { ascending: false });

    this.loadingSignal.set(false);
    if (error) {
      this.errorSignal.set(error.message);
    } else {
      this.goalsSignal.set(
        (data ?? []).map((goal) => ({
          ...goal,
          target_amount: Number(goal.target_amount),
          current_amount: Number(goal.current_amount),
        })) as SavingGoal[],
      );
    }
  }

  async createGoal(dto: CreateSavingGoalDto): Promise<string | null> {
    const name = dto.name.trim();
    if (!name) return 'Name is required';
    if (dto.target_amount <= 0) return 'Target amount must be greater than zero';
    if (dto.current_amount < 0) return 'Current amount cannot be negative';

    const { data: userData } = await this.supabase.auth.getUser();
    if (!userData.user) return 'Not authenticated';

    const { error } = await this.supabase.from('saving_goals').insert({
      name,
      target_amount: dto.target_amount,
      current_amount: dto.current_amount,
      currency: dto.currency,
      user_id: userData.user.id,
    });

    if (error) return error.message;
    await this.loadGoals();
    return null;
  }

  async updateGoal(id: string, dto: UpdateSavingGoalDto): Promise<string | null> {
    const payload: UpdateSavingGoalDto = { ...dto };
    if (payload.name !== undefined) {
      payload.name = payload.name.trim();
      if (!payload.name) return 'Name is required';
    }
    if (payload.target_amount !== undefined && payload.target_amount <= 0) {
      return 'Target amount must be greater than zero';
    }
    if (payload.current_amount !== undefined && payload.current_amount < 0) {
      return 'Current amount cannot be negative';
    }

    const { error } = await this.supabase.from('saving_goals').update(payload).eq('id', id);

    if (error) return error.message;
    await this.loadGoals();
    return null;
  }

  async deleteGoal(id: string): Promise<string | null> {
    const { error } = await this.supabase.from('saving_goals').delete().eq('id', id);

    if (error) return error.message;
    await this.loadGoals();
    return null;
  }
}
