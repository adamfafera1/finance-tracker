export type TodoPriority = 'low' | 'medium' | 'high';

export interface Todo {
  id: string;
  user_id: string;
  title: string;
  priority: TodoPriority;
  is_urgent: boolean;
  is_completed: boolean;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateTodoDto {
  title: string;
  priority?: TodoPriority;
  is_urgent?: boolean;
}

export interface UpdateTodoDto {
  title?: string;
  priority?: TodoPriority;
  is_urgent?: boolean;
  is_completed?: boolean;
}

export const TODO_PRIORITY_LABELS: Record<TodoPriority, string> = {
  high: 'High',
  medium: 'Medium',
  low: 'Low',
};

/** Higher number = higher priority (for sorting). */
export const TODO_PRIORITY_RANK: Record<TodoPriority, number> = {
  high: 3,
  medium: 2,
  low: 1,
};

export const TODO_PRIORITY_OPTIONS: { label: string; value: TodoPriority }[] = [
  { label: 'High', value: 'high' },
  { label: 'Medium', value: 'medium' },
  { label: 'Low', value: 'low' },
];
