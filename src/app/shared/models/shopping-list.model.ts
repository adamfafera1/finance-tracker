export interface ShoppingList {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface CreateShoppingListDto {
  name: string;
}

export interface UpdateShoppingListDto {
  name?: string;
}

export interface ShoppingListItem {
  id: string;
  user_id: string;
  list_id: string;
  name: string;
  quantity: number;
  is_checked: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateShoppingListItemDto {
  list_id: string;
  name: string;
  quantity?: number;
}

export interface UpdateShoppingListItemDto {
  name?: string;
  quantity?: number;
  is_checked?: boolean;
}
