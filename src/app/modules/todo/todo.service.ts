import { Injectable, computed, inject, signal } from '@angular/core';
import { SupabaseService } from '../../core/supabase/supabase.service';
import {
  CreateTodoDto,
  TODO_PRIORITY_RANK,
  Todo,
  UpdateTodoDto,
} from '../../shared/models/todo.model';

@Injectable({ providedIn: 'root' })
export class TodoService {
  private readonly supabase = inject(SupabaseService).client;

  private readonly todosSignal = signal<Todo[]>([]);
  private readonly loadingSignal = signal(false);
  private readonly errorSignal = signal<string | null>(null);

  readonly todos = this.todosSignal.asReadonly();
  readonly loading = this.loadingSignal.asReadonly();
  readonly error = this.errorSignal.asReadonly();

  readonly activeTodos = computed(() =>
    this.todosSignal()
      .filter((todo) => !todo.is_completed)
      .slice()
      .sort((a, b) => this.compareByUrgencyThenPriority(a, b)),
  );

  readonly completedTodos = computed(() =>
    this.todosSignal()
      .filter((todo) => todo.is_completed)
      .slice()
      .sort((a, b) => this.compareByUrgencyThenPriority(a, b)),
  );

  /** Urgent first, then high → medium → low, then newest. */
  private compareByUrgencyThenPriority(a: Todo, b: Todo): number {
    const byUrgent = Number(!!b.is_urgent) - Number(!!a.is_urgent);
    if (byUrgent !== 0) return byUrgent;

    const byPriority =
      TODO_PRIORITY_RANK[b.priority ?? 'medium'] - TODO_PRIORITY_RANK[a.priority ?? 'medium'];
    if (byPriority !== 0) return byPriority;

    return b.created_at.localeCompare(a.created_at);
  }

  readonly activeCount = computed(() => this.activeTodos().length);
  readonly completedCount = computed(() => this.completedTodos().length);

  async loadTodos(): Promise<void> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    const { data, error } = await this.supabase
      .from('todos')
      .select('*')
      .order('created_at', { ascending: false });

    this.loadingSignal.set(false);
    if (error) {
      this.errorSignal.set(error.message);
    } else {
      this.todosSignal.set(
        (data ?? []).map((todo) => ({
          ...todo,
          priority: todo.priority ?? 'medium',
          is_urgent: todo.is_urgent ?? false,
        })) as Todo[],
      );
    }
  }

  async createTodo(dto: CreateTodoDto): Promise<string | null> {
    const title = dto.title.trim();
    if (!title) return 'Title is required';

    const { data: userData } = await this.supabase.auth.getUser();
    if (!userData.user) return 'Not authenticated';

    const { error } = await this.supabase.from('todos').insert({
      title,
      priority: dto.priority ?? 'medium',
      is_urgent: dto.is_urgent ?? false,
      user_id: userData.user.id,
    });

    if (error) return error.message;
    await this.loadTodos();
    return null;
  }

  async updateTodo(id: string, dto: UpdateTodoDto): Promise<string | null> {
    const payload: UpdateTodoDto = { ...dto };
    if (payload.title !== undefined) {
      payload.title = payload.title.trim();
      if (!payload.title) return 'Title is required';
    }

    const { error } = await this.supabase.from('todos').update(payload).eq('id', id);

    if (error) return error.message;
    await this.loadTodos();
    return null;
  }

  async toggleCompleted(id: string, isCompleted: boolean): Promise<string | null> {
    return this.updateTodo(id, { is_completed: isCompleted });
  }

  async deleteTodo(id: string): Promise<string | null> {
    const { error } = await this.supabase.from('todos').delete().eq('id', id);

    if (error) return error.message;
    await this.loadTodos();
    return null;
  }
}
