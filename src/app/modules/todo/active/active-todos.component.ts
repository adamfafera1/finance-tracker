import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { ConfirmationService, MessageService } from 'primeng/api';
import { EmptyStateComponent } from '../../../shared/components/empty-state.component';
import {
  TODO_PRIORITY_LABELS,
  Todo,
  TodoPriority,
} from '../../../shared/models/todo.model';
import { TodoService } from '../todo.service';

@Component({
  selector: 'app-active-todos',
  imports: [
    FormsModule,
    ReactiveFormsModule,
    ButtonModule,
    CheckboxModule,
    ConfirmDialogModule,
    DialogModule,
    InputTextModule,
    ProgressSpinnerModule,
    TagModule,
    ToastModule,
    EmptyStateComponent,
  ],
  providers: [ConfirmationService, MessageService],
  template: `
    <p-toast />
    <p-confirmdialog />

    <div class="page-header">
      <div>
        <h1>Active</h1>
        <p class="subtitle">{{ todoService.activeCount() }} open task{{ todoService.activeCount() === 1 ? '' : 's' }}</p>
      </div>
      <button pButton (click)="openDialog()">
        <i class="pi pi-plus" aria-hidden="true"></i>
        Add Task
      </button>
    </div>

    @if (todoService.loading()) {
      <div class="loading"><p-progressspinner ariaLabel="Loading tasks" /></div>
    } @else if (todoService.activeTodos().length === 0) {
      <app-empty-state
        icon="pi pi-check-square"
        title="No active tasks"
        message="Add a task to get started. Completed items live on the Completed page."
      >
        <button pButton (click)="openDialog()">Add Task</button>
      </app-empty-state>
    } @else {
      <ul class="todo-list">
        @for (todo of todoService.activeTodos(); track todo.id) {
          <li class="todo-item">
            <p-checkbox
              [binary]="true"
              [ngModel]="false"
              [ariaLabel]="'Mark ' + todo.title + ' as completed'"
              (onChange)="complete(todo)"
            />
            <div class="todo-body">
              <span class="todo-title">{{ todo.title }}</span>
              <p-tag
                [value]="priorityLabel(todo.priority)"
                [severity]="prioritySeverity(todo.priority)"
              />
              <p-tag
                [value]="todo.is_urgent ? 'Urgent' : 'Not urgent'"
                [severity]="todo.is_urgent ? 'danger' : 'secondary'"
              />
            </div>
            <div class="todo-actions">
              <button
                pButton
                iconOnly
                variant="text"
                severity="secondary"
                aria-label="Edit task"
                (click)="openDialog(todo)"
              >
                <i class="pi pi-pencil" aria-hidden="true"></i>
              </button>
              <button
                pButton
                iconOnly
                variant="text"
                severity="danger"
                aria-label="Delete task"
                (click)="confirmDelete(todo)"
              >
                <i class="pi pi-trash" aria-hidden="true"></i>
              </button>
            </div>
          </li>
        }
      </ul>
    }

    <p-dialog
      [header]="editingId() ? 'Edit Task' : 'Add Task'"
      [visible]="dialogVisible()"
      (visibleChange)="dialogVisible.set($event)"
      [modal]="true"
      [style]="{ width: 'min(28rem, 95vw)' }"
      [draggable]="false"
    >
      <form [formGroup]="form" (ngSubmit)="save()" class="dialog-form">
        <label for="todo-title">Title</label>
        <input id="todo-title" pInputText formControlName="title" autocomplete="off" />
        <span id="todo-priority-label" class="field-label">Priority</span>
        <div class="choice-buttons choice-buttons--3" role="group" aria-labelledby="todo-priority-label">
          <button
            pButton
            type="button"
            [variant]="form.controls.priority.value === 'high' ? undefined : 'outlined'"
            severity="danger"
            (click)="setPriority('high')"
          >
            High
          </button>
          <button
            pButton
            type="button"
            [variant]="form.controls.priority.value === 'medium' ? undefined : 'outlined'"
            severity="warn"
            (click)="setPriority('medium')"
          >
            Medium
          </button>
          <button
            pButton
            type="button"
            [variant]="form.controls.priority.value === 'low' ? undefined : 'outlined'"
            severity="secondary"
            (click)="setPriority('low')"
          >
            Low
          </button>
        </div>
        <span id="todo-urgency-label" class="field-label">Urgency</span>
        <div class="choice-buttons choice-buttons--2" role="group" aria-labelledby="todo-urgency-label">
          <button
            pButton
            type="button"
            [variant]="form.controls.is_urgent.value ? undefined : 'outlined'"
            severity="danger"
            (click)="setUrgent(true)"
          >
            Urgent
          </button>
          <button
            pButton
            type="button"
            [variant]="!form.controls.is_urgent.value ? undefined : 'outlined'"
            severity="secondary"
            (click)="setUrgent(false)"
          >
            Not urgent
          </button>
        </div>
        <div class="dialog-actions">
          <button pButton type="button" variant="text" severity="secondary" (click)="dialogVisible.set(false)">
            Cancel
          </button>
          <button pButton type="submit" [disabled]="form.invalid || saving()">
            {{ editingId() ? 'Save' : 'Add' }}
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
      margin-bottom: 1.5rem;
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

    .loading {
      display: flex;
      justify-content: center;
      padding: 3rem;
    }

    .todo-list {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .todo-item {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.75rem 0.875rem;
      border: 1px solid var(--p-content-border-color);
      border-radius: var(--p-content-border-radius);
      background: var(--p-content-background);
    }

    .todo-body {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.5rem;
    }

    .todo-title {
      word-break: break-word;
    }

    .todo-actions {
      display: flex;
      flex-shrink: 0;
      gap: 0.125rem;
    }

    .dialog-form {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .dialog-form label,
    .field-label {
      font-weight: 500;
      font-size: 0.875rem;
    }

    .choice-buttons {
      display: grid;
      gap: 0.5rem;
    }

    .choice-buttons--3 {
      grid-template-columns: repeat(3, 1fr);
    }

    .choice-buttons--2 {
      grid-template-columns: repeat(2, 1fr);
    }

    .choice-buttons button {
      width: 100%;
      justify-content: center;
    }

    .dialog-actions {
      display: flex;
      justify-content: flex-end;
      gap: 0.5rem;
      margin-top: 0.5rem;
    }
  `,
})
export class ActiveTodosComponent implements OnInit {
  protected readonly todoService = inject(TodoService);
  private readonly fb = inject(FormBuilder);
  private readonly confirm = inject(ConfirmationService);
  private readonly messages = inject(MessageService);

  protected readonly dialogVisible = signal(false);
  protected readonly editingId = signal<string | null>(null);
  protected readonly saving = signal(false);

  protected readonly form = this.fb.nonNullable.group({
    title: ['', [Validators.required, Validators.maxLength(200)]],
    priority: this.fb.nonNullable.control<TodoPriority>('medium', Validators.required),
    is_urgent: this.fb.nonNullable.control(false, Validators.required),
  });

  async ngOnInit(): Promise<void> {
    await this.todoService.loadTodos();
  }

  setPriority(priority: TodoPriority): void {
    this.form.controls.priority.setValue(priority);
  }

  setUrgent(isUrgent: boolean): void {
    this.form.controls.is_urgent.setValue(isUrgent);
  }

  priorityLabel(priority: TodoPriority): string {
    return TODO_PRIORITY_LABELS[priority ?? 'medium'];
  }

  prioritySeverity(priority: TodoPriority): 'danger' | 'warn' | 'secondary' {
    switch (priority) {
      case 'high':
        return 'danger';
      case 'low':
        return 'secondary';
      default:
        return 'warn';
    }
  }

  openDialog(todo?: Todo): void {
    this.editingId.set(todo?.id ?? null);
    this.form.reset({
      title: todo?.title ?? '',
      priority: todo?.priority ?? 'medium',
      is_urgent: todo?.is_urgent ?? false,
    });
    this.dialogVisible.set(true);
  }

  async save(): Promise<void> {
    if (this.form.invalid) return;
    this.saving.set(true);

    const { title, priority, is_urgent } = this.form.getRawValue();
    const id = this.editingId();
    const error = id
      ? await this.todoService.updateTodo(id, { title, priority, is_urgent })
      : await this.todoService.createTodo({ title, priority, is_urgent });

    this.saving.set(false);
    if (error) {
      this.messages.add({ severity: 'error', summary: 'Error', detail: error });
      return;
    }

    this.dialogVisible.set(false);
    this.messages.add({
      severity: 'success',
      summary: id ? 'Task updated' : 'Task added',
    });
  }

  async complete(todo: Todo): Promise<void> {
    const error = await this.todoService.toggleCompleted(todo.id, true);
    if (error) {
      this.messages.add({ severity: 'error', summary: 'Error', detail: error });
      return;
    }
    this.messages.add({ severity: 'success', summary: 'Completed', detail: todo.title });
  }

  confirmDelete(todo: Todo): void {
    this.confirm.confirm({
      message: `Delete “${todo.title}”?`,
      header: 'Delete task',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      accept: async () => {
        const error = await this.todoService.deleteTodo(todo.id);
        if (error) {
          this.messages.add({ severity: 'error', summary: 'Error', detail: error });
          return;
        }
        this.messages.add({ severity: 'success', summary: 'Task deleted' });
      },
    });
  }
}
