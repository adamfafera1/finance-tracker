import { Injectable, inject, signal } from '@angular/core';
import { SupabaseService } from '../../../core/supabase/supabase.service';
import { Category, CategoryType } from '../../../shared/models/category.model';

@Injectable({ providedIn: 'root' })
export class CategoryService {
  private readonly supabase = inject(SupabaseService).client;

  private readonly categoriesSignal = signal<Category[]>([]);
  private readonly loadingSignal = signal(false);

  readonly categories = this.categoriesSignal.asReadonly();
  readonly loading = this.loadingSignal.asReadonly();

  async loadCategories(): Promise<void> {
    this.loadingSignal.set(true);

    const { data, error } = await this.supabase
      .from('categories')
      .select('*')
      .order('type')
      .order('name');

    this.loadingSignal.set(false);
    if (!error) {
      this.categoriesSignal.set((data ?? []) as Category[]);
    }
  }

  byType(type: CategoryType): Category[] {
    return this.categories().filter((c) => c.type === type);
  }
}
