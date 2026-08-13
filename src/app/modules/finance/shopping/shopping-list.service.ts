import { Injectable, computed, inject, signal } from '@angular/core';
import { SupabaseService } from '../../../core/supabase/supabase.service';
import {
  CreateShoppingListDto,
  CreateShoppingListItemDto,
  ShoppingList,
  ShoppingListItem,
  UpdateShoppingListDto,
  UpdateShoppingListItemDto,
} from '../../../shared/models/shopping-list.model';

@Injectable({ providedIn: 'root' })
export class ShoppingListService {
  private readonly supabase = inject(SupabaseService).client;

  private readonly listsSignal = signal<ShoppingList[]>([]);
  private readonly selectedListIdSignal = signal<string | null>(null);
  private readonly itemsSignal = signal<ShoppingListItem[]>([]);
  private readonly loadingSignal = signal(false);
  private readonly errorSignal = signal<string | null>(null);

  readonly lists = this.listsSignal.asReadonly();
  readonly selectedListId = this.selectedListIdSignal.asReadonly();
  readonly items = this.itemsSignal.asReadonly();
  readonly loading = this.loadingSignal.asReadonly();
  readonly error = this.errorSignal.asReadonly();

  readonly selectedList = computed(() => {
    const id = this.selectedListIdSignal();
    return this.listsSignal().find((list) => list.id === id) ?? null;
  });

  readonly uncheckedItems = computed(() =>
    this.itemsSignal()
      .filter((item) => !item.is_checked)
      .sort((a, b) => b.created_at.localeCompare(a.created_at)),
  );

  readonly checkedItems = computed(() =>
    this.itemsSignal()
      .filter((item) => item.is_checked)
      .sort((a, b) => b.updated_at.localeCompare(a.updated_at)),
  );

  readonly uncheckedCount = computed(() => this.uncheckedItems().length);
  readonly checkedCount = computed(() => this.checkedItems().length);

  async load(): Promise<void> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    const { data: lists, error: listsError } = await this.supabase
      .from('shopping_lists')
      .select('*')
      .order('name');

    if (listsError) {
      this.loadingSignal.set(false);
      this.errorSignal.set(listsError.message);
      return;
    }

    const nextLists = (lists ?? []) as ShoppingList[];
    this.listsSignal.set(nextLists);

    const currentId = this.selectedListIdSignal();
    const stillExists = nextLists.some((list) => list.id === currentId);
    const nextSelectedId = stillExists ? currentId : (nextLists[0]?.id ?? null);
    this.selectedListIdSignal.set(nextSelectedId);

    if (nextSelectedId) {
      await this.loadItemsForList(nextSelectedId);
    } else {
      this.itemsSignal.set([]);
    }

    this.loadingSignal.set(false);
  }

  async selectList(listId: string): Promise<void> {
    if (this.selectedListIdSignal() === listId) return;
    this.selectedListIdSignal.set(listId);
    this.loadingSignal.set(true);
    await this.loadItemsForList(listId);
    this.loadingSignal.set(false);
  }

  private async loadItemsForList(listId: string): Promise<void> {
    const { data, error } = await this.supabase
      .from('shopping_list_items')
      .select('*')
      .eq('list_id', listId)
      .order('created_at', { ascending: false });

    if (error) {
      this.errorSignal.set(error.message);
      this.itemsSignal.set([]);
      return;
    }

    this.itemsSignal.set(
      (data ?? []).map((item) => ({
        ...item,
        quantity: Number(item.quantity ?? 1),
        is_checked: item.is_checked ?? false,
      })) as ShoppingListItem[],
    );
  }

  async createList(dto: CreateShoppingListDto): Promise<string | null> {
    const name = dto.name.trim();
    if (!name) return 'Name is required';

    const { data: userData } = await this.supabase.auth.getUser();
    if (!userData.user) return 'Not authenticated';

    const { data, error } = await this.supabase
      .from('shopping_lists')
      .insert({ name, user_id: userData.user.id })
      .select('*')
      .single();

    if (error) return error.message;

    await this.load();
    if (data?.id) {
      await this.selectList(data.id);
    }
    return null;
  }

  async updateList(id: string, dto: UpdateShoppingListDto): Promise<string | null> {
    const payload: UpdateShoppingListDto = { ...dto };
    if (payload.name !== undefined) {
      payload.name = payload.name.trim();
      if (!payload.name) return 'Name is required';
    }

    const { error } = await this.supabase.from('shopping_lists').update(payload).eq('id', id);
    if (error) return error.message;
    await this.load();
    return null;
  }

  async deleteList(id: string): Promise<string | null> {
    const { error } = await this.supabase.from('shopping_lists').delete().eq('id', id);
    if (error) return error.message;
    await this.load();
    return null;
  }

  async createItem(dto: CreateShoppingListItemDto): Promise<string | null> {
    const name = dto.name.trim();
    if (!name) return 'Name is required';

    const quantity = dto.quantity ?? 1;
    if (quantity <= 0) return 'Quantity must be greater than zero';
    if (!dto.list_id) return 'Select a list first';

    const { data: userData } = await this.supabase.auth.getUser();
    if (!userData.user) return 'Not authenticated';

    const { error } = await this.supabase.from('shopping_list_items').insert({
      name,
      quantity,
      list_id: dto.list_id,
      user_id: userData.user.id,
    });

    if (error) return error.message;
    await this.loadItemsForList(dto.list_id);
    return null;
  }

  async updateItem(id: string, dto: UpdateShoppingListItemDto): Promise<string | null> {
    const payload: UpdateShoppingListItemDto = { ...dto };
    if (payload.name !== undefined) {
      payload.name = payload.name.trim();
      if (!payload.name) return 'Name is required';
    }
    if (payload.quantity !== undefined && payload.quantity <= 0) {
      return 'Quantity must be greater than zero';
    }

    const { error } = await this.supabase.from('shopping_list_items').update(payload).eq('id', id);
    if (error) return error.message;

    const listId = this.selectedListIdSignal();
    if (listId) await this.loadItemsForList(listId);
    return null;
  }

  async toggleChecked(id: string, isChecked: boolean): Promise<string | null> {
    return this.updateItem(id, { is_checked: isChecked });
  }

  async deleteItem(id: string): Promise<string | null> {
    const { error } = await this.supabase.from('shopping_list_items').delete().eq('id', id);
    if (error) return error.message;

    const listId = this.selectedListIdSignal();
    if (listId) await this.loadItemsForList(listId);
    return null;
  }

  async clearChecked(): Promise<string | null> {
    const listId = this.selectedListIdSignal();
    if (!listId) return 'Select a list first';

    const { error } = await this.supabase
      .from('shopping_list_items')
      .delete()
      .eq('list_id', listId)
      .eq('is_checked', true);

    if (error) return error.message;
    await this.loadItemsForList(listId);
    return null;
  }
}
