export interface SavingGoal {
  id: string;
  user_id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  currency: string;
  created_at: string;
  updated_at: string;
}

export interface CreateSavingGoalDto {
  name: string;
  target_amount: number;
  current_amount: number;
  currency: string;
}

export interface UpdateSavingGoalDto {
  name?: string;
  target_amount?: number;
  current_amount?: number;
  currency?: string;
}

/** Progress as 0–100, capped at 100. */
export function savingGoalProgress(goal: Pick<SavingGoal, 'current_amount' | 'target_amount'>): number {
  if (goal.target_amount <= 0) return 0;
  return Math.min(100, Math.round((goal.current_amount / goal.target_amount) * 100));
}
