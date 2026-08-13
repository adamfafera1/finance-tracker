import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { ToastModule } from 'primeng/toast';
import { ConfirmationService, MessageService } from 'primeng/api';
import { EmptyStateComponent } from '../../../shared/components/empty-state.component';
import { ShoppingList, ShoppingListItem } from '../../../shared/models/shopping-list.model';
import { ShoppingListService } from './shopping-list.service';

@Component({
  selector: 'app-shopping-list',
  imports: [
    FormsModule,
    ReactiveFormsModule,
    ButtonModule,
    CheckboxModule,
    ConfirmDialogModule,
    DialogModule,
    InputNumberModule,
    InputTextModule,
    ProgressSpinnerModule,
    ToastModule,
    EmptyStateComponent,
  ],
  providers: [ConfirmationService, MessageService],
  template: `
    <p-toast />
    <p-confirmdialog />

    <div class="page-header">
      <div>
        <h1>Shopping</h1>
        <p class="subtitle">
          @if (shoppingList.selectedList(); as list) {
            {{ list.name }} · {{ shoppingList.uncheckedCount() }} to buy
            @if (shoppingList.checkedCount() > 0) {
              · {{ shoppingList.checkedCount() }} checked
            }
          } @else {
            Create a list for groceries, appliances, and more
          }
        </p>
      </div>
      <div class="header-actions">
        <button pButton variant="outlined" severity="secondary" (click)="openListDialog()">
          <i class="pi pi-folder-plus" aria-hidden="true"></i>
          New List
        </button>
        @if (shoppingList.selectedList()) {
          @if (shoppingList.checkedCount() > 0) {
            <button pButton variant="outlined" severity="secondary" (click)="confirmClearChecked()">
              Clear checked
            </button>
          }
          <button pButton (click)="openItemDialog()" [disabled]="!shoppingList.selectedListId()">
            <i class="pi pi-plus" aria-hidden="true"></i>
            Add Item
          </button>
        }
      </div>
    </div>

    @if (shoppingList.loading()) {
      <div class="loading"><p-progressspinner ariaLabel="Loading shopping lists" /></div>
    } @else if (shoppingList.lists().length === 0) {
      <app-empty-state
        icon="pi pi-shopping-cart"
        title="No shopping lists yet"
        message="Create lists like Groceries or Home appliances, then add items to each."
      >
        <button pButton (click)="openListDialog()">New List</button>
      </app-empty-state>
    } @else {
      <div class="list-tabs" role="tablist" aria-label="Shopping lists">
        @for (list of shoppingList.lists(); track list.id) {
          <button
            type="button"
            class="list-tab"
            role="tab"
            [class.active]="list.id === shoppingList.selectedListId()"
            [attr.aria-selected]="list.id === shoppingList.selectedListId()"
            (click)="selectList(list.id)"
          >
            {{ list.name }}
          </button>
        }
      </div>

      @if (shoppingList.selectedList(); as selected) {
        <div class="list-toolbar">
          <button pButton variant="text" size="small" severity="secondary" (click)="openListDialog(selected)">
            <i class="pi pi-pencil" aria-hidden="true"></i>
            Rename
          </button>
          <button pButton variant="text" size="small" severity="danger" (click)="confirmDeleteList(selected)">
            <i class="pi pi-trash" aria-hidden="true"></i>
            Delete list
          </button>
        </div>

        @if (shoppingList.items().length === 0) {
          <app-empty-state
            icon="pi pi-list"
            title="This list is empty"
            message="Add items you need to buy for {{ selected.name }}."
          >
            <button pButton (click)="openItemDialog()">Add Item</button>
          </app-empty-state>
        } @else {
          @if (shoppingList.uncheckedItems().length > 0) {
            <section class="section">
              <h2>To buy</h2>
              <ul class="item-list">
                @for (item of shoppingList.uncheckedItems(); track item.id) {
                  <li class="item-row">
                    <p-checkbox
                      [binary]="true"
                      [ngModel]="false"
                      [ariaLabel]="'Mark ' + item.name + ' as bought'"
                      (onChange)="toggle(item, true)"
                    />
                    <div class="item-body">
                      <span class="item-name">{{ item.name }}</span>
                      <span class="item-qty">× {{ formatQty(item.quantity) }}</span>
                    </div>
                    <div class="item-actions">
                      <button
                        pButton
                        iconOnly
                        variant="text"
                        severity="secondary"
                        aria-label="Edit item"
                        (click)="openItemDialog(item)"
                      >
                        <i class="pi pi-pencil" aria-hidden="true"></i>
                      </button>
                      <button
                        pButton
                        iconOnly
                        variant="text"
                        severity="danger"
                        aria-label="Delete item"
                        (click)="confirmDeleteItem(item)"
                      >
                        <i class="pi pi-trash" aria-hidden="true"></i>
                      </button>
                    </div>
                  </li>
                }
              </ul>
            </section>
          }

          @if (shoppingList.checkedItems().length > 0) {
            <section class="section">
              <h2>Checked</h2>
              <ul class="item-list">
                @for (item of shoppingList.checkedItems(); track item.id) {
                  <li class="item-row item-row--checked">
                    <p-checkbox
                      [binary]="true"
                      [ngModel]="true"
                      [ariaLabel]="'Mark ' + item.name + ' as to buy'"
                      (onChange)="toggle(item, false)"
                    />
                    <div class="item-body">
                      <span class="item-name">{{ item.name }}</span>
                      <span class="item-qty">× {{ formatQty(item.quantity) }}</span>
                    </div>
                    <div class="item-actions">
                      <button
                        pButton
                        iconOnly
                        variant="text"
                        severity="danger"
                        aria-label="Delete item"
                        (click)="confirmDeleteItem(item)"
                      >
                        <i class="pi pi-trash" aria-hidden="true"></i>
                      </button>
                    </div>
                  </li>
                }
              </ul>
            </section>
          }
        }
      }
    }

    <p-dialog
      [header]="editingListId() ? 'Rename List' : 'New List'"
      [visible]="listDialogVisible()"
      (visibleChange)="listDialogVisible.set($event)"
      [modal]="true"
      [style]="{ width: 'min(28rem, 95vw)' }"
      [draggable]="false"
    >
      <form [formGroup]="listForm" (ngSubmit)="saveList()" class="dialog-form">
        <div class="field">
          <label for="list-name">Name</label>
          <input
            id="list-name"
            pInputText
            formControlName="name"
            class="w-full"
            autocomplete="off"
            placeholder="e.g. Groceries"
          />
        </div>
        <div class="dialog-actions">
          <button
            pButton
            type="button"
            variant="outlined"
            severity="secondary"
            (click)="listDialogVisible.set(false)"
          >
            Cancel
          </button>
          <button pButton type="submit" [disabled]="listForm.invalid || savingList()">
            Save
          </button>
        </div>
      </form>
    </p-dialog>

    <p-dialog
      [header]="editingItemId() ? 'Edit Item' : 'Add Item'"
      [visible]="itemDialogVisible()"
      (visibleChange)="itemDialogVisible.set($event)"
      [modal]="true"
      [style]="{ width: 'min(28rem, 95vw)' }"
      [draggable]="false"
    >
      <form [formGroup]="itemForm" (ngSubmit)="saveItem()" class="dialog-form">
        <div class="field">
          <label for="item-name">Name</label>
          <input id="item-name" pInputText formControlName="name" class="w-full" autocomplete="off" />
        </div>
        <div class="field">
          <label for="item-qty">Quantity</label>
          <p-inputnumber
            inputId="item-qty"
            formControlName="quantity"
            [min]="0.01"
            [minFractionDigits]="0"
            [maxFractionDigits]="2"
            styleClass="w-full"
            inputStyleClass="w-full"
          />
        </div>
        <div class="dialog-actions">
          <button
            pButton
            type="button"
            variant="outlined"
            severity="secondary"
            (click)="itemDialogVisible.set(false)"
          >
            Cancel
          </button>
          <button pButton type="submit" [disabled]="itemForm.invalid || savingItem()">
            Save
          </button>
        </div>
      </form>
    </p-dialog>
  `,
  styles: `
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 1rem;
      margin-bottom: 1.25rem;
    }

    .page-header h1 {
      margin: 0;
      font-size: 1.5rem;
    }

    .subtitle {
      margin: 0.25rem 0 0;
      color: var(--p-text-muted-color);
      font-size: 0.875rem;
    }

    .header-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      justify-content: flex-end;
    }

    .loading {
      display: flex;
      justify-content: center;
      padding: 3rem;
    }

    .list-tabs {
      display: flex;
      gap: 0.375rem;
      overflow-x: auto;
      padding-bottom: 0.25rem;
      margin-bottom: 0.75rem;
      -webkit-overflow-scrolling: touch;
    }

    .list-tab {
      flex-shrink: 0;
      border: 1px solid var(--p-content-border-color);
      background: var(--p-content-background);
      color: var(--p-text-muted-color);
      border-radius: 999px;
      padding: 0.375rem 0.875rem;
      font-size: 0.8125rem;
      cursor: pointer;
    }

    .list-tab.active {
      border-color: var(--p-primary-color);
      background: color-mix(in srgb, var(--p-primary-color) 12%, transparent);
      color: var(--p-primary-color);
      font-weight: 600;
    }

    .list-toolbar {
      display: flex;
      gap: 0.25rem;
      margin-bottom: 1rem;
    }

    .section {
      margin-bottom: 1.75rem;
    }

    .section h2 {
      margin: 0 0 0.75rem;
      font-size: 0.75rem;
      font-weight: 600;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      color: var(--p-text-muted-color);
    }

    .item-list {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .item-row {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.75rem 0.875rem;
      border: 1px solid var(--p-content-border-color);
      border-radius: var(--p-content-border-radius);
      background: var(--p-content-background);
    }

    .item-row--checked .item-name {
      text-decoration: line-through;
      color: var(--p-text-muted-color);
    }

    .item-body {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-wrap: wrap;
      align-items: baseline;
      gap: 0.5rem;
    }

    .item-name {
      word-break: break-word;
    }

    .item-qty {
      font-size: 0.8125rem;
      color: var(--p-text-muted-color);
      font-variant-numeric: tabular-nums;
    }

    .item-actions {
      display: flex;
      flex-shrink: 0;
      gap: 0.125rem;
    }

    .dialog-form .field {
      margin-bottom: 1rem;
    }

    .dialog-form label {
      display: block;
      margin-bottom: 0.375rem;
      font-weight: 500;
      font-size: 0.875rem;
    }

    .w-full {
      width: 100%;
    }

    .dialog-actions {
      display: flex;
      justify-content: flex-end;
      gap: 0.5rem;
      margin-top: 0.5rem;
    }
  `,
})
export class ShoppingListComponent implements OnInit {
  protected readonly shoppingList = inject(ShoppingListService);
  private readonly fb = inject(FormBuilder);
  private readonly confirm = inject(ConfirmationService);
  private readonly messages = inject(MessageService);

  protected readonly listDialogVisible = signal(false);
  protected readonly itemDialogVisible = signal(false);
  protected readonly editingListId = signal<string | null>(null);
  protected readonly editingItemId = signal<string | null>(null);
  protected readonly savingList = signal(false);
  protected readonly savingItem = signal(false);

  protected readonly listForm = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(80)]],
  });

  protected readonly itemForm = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(120)]],
    quantity: [1, [Validators.required, Validators.min(0.01)]],
  });

  async ngOnInit(): Promise<void> {
    await this.shoppingList.load();
  }

  formatQty(quantity: number): string {
    return Number.isInteger(quantity) ? String(quantity) : String(Number(quantity.toFixed(2)));
  }

  async selectList(listId: string): Promise<void> {
    await this.shoppingList.selectList(listId);
  }

  openListDialog(list?: ShoppingList): void {
    this.editingListId.set(list?.id ?? null);
    this.listForm.reset({ name: list?.name ?? '' });
    this.listDialogVisible.set(true);
  }

  openItemDialog(item?: ShoppingListItem): void {
    this.editingItemId.set(item?.id ?? null);
    this.itemForm.reset({
      name: item?.name ?? '',
      quantity: item?.quantity ?? 1,
    });
    this.itemDialogVisible.set(true);
  }

  async saveList(): Promise<void> {
    if (this.listForm.invalid) return;
    this.savingList.set(true);

    const { name } = this.listForm.getRawValue();
    const id = this.editingListId();
    const error = id
      ? await this.shoppingList.updateList(id, { name })
      : await this.shoppingList.createList({ name });

    this.savingList.set(false);
    if (error) {
      this.messages.add({ severity: 'error', summary: 'Error', detail: error });
      return;
    }

    this.listDialogVisible.set(false);
    this.messages.add({
      severity: 'success',
      summary: id ? 'List renamed' : 'List created',
    });
  }

  async saveItem(): Promise<void> {
    if (this.itemForm.invalid) return;
    const listId = this.shoppingList.selectedListId();
    if (!listId) {
      this.messages.add({ severity: 'error', summary: 'Error', detail: 'Select a list first' });
      return;
    }

    this.savingItem.set(true);
    const { name, quantity } = this.itemForm.getRawValue();
    const id = this.editingItemId();
    const error = id
      ? await this.shoppingList.updateItem(id, { name, quantity })
      : await this.shoppingList.createItem({ list_id: listId, name, quantity });

    this.savingItem.set(false);
    if (error) {
      this.messages.add({ severity: 'error', summary: 'Error', detail: error });
      return;
    }

    this.itemDialogVisible.set(false);
    this.messages.add({
      severity: 'success',
      summary: id ? 'Item updated' : 'Item added',
    });
  }

  async toggle(item: ShoppingListItem, isChecked: boolean): Promise<void> {
    const error = await this.shoppingList.toggleChecked(item.id, isChecked);
    if (error) {
      this.messages.add({ severity: 'error', summary: 'Error', detail: error });
    }
  }

  confirmDeleteItem(item: ShoppingListItem): void {
    this.confirm.confirm({
      message: `Delete “${item.name}”?`,
      header: 'Delete item',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      accept: async () => {
        const error = await this.shoppingList.deleteItem(item.id);
        if (error) {
          this.messages.add({ severity: 'error', summary: 'Error', detail: error });
          return;
        }
        this.messages.add({ severity: 'success', summary: 'Item deleted' });
      },
    });
  }

  confirmDeleteList(list: ShoppingList): void {
    this.confirm.confirm({
      message: `Delete “${list.name}” and all its items?`,
      header: 'Delete list',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      accept: async () => {
        const error = await this.shoppingList.deleteList(list.id);
        if (error) {
          this.messages.add({ severity: 'error', summary: 'Error', detail: error });
          return;
        }
        this.messages.add({ severity: 'success', summary: 'List deleted' });
      },
    });
  }

  confirmClearChecked(): void {
    this.confirm.confirm({
      message: `Remove all ${this.shoppingList.checkedCount()} checked item(s) from this list?`,
      header: 'Clear checked',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      accept: async () => {
        const error = await this.shoppingList.clearChecked();
        if (error) {
          this.messages.add({ severity: 'error', summary: 'Error', detail: error });
          return;
        }
        this.messages.add({ severity: 'success', summary: 'Checked items cleared' });
      },
    });
  }
}
