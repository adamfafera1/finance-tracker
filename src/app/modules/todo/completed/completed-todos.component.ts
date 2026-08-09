import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { ConfirmationService, MessageService } from 'primeng/api';
import { EmptyStateComponent } from '../../../shared/components/empty-state.component';
import { TODO_PRIORITY_LABELS, Todo, TodoPriority } from '../../../shared/models/todo.model';
import { TodoService } from '../todo.service';

@Component({
  selector: 'app-completed-todos',
  imports: [
    FormsModule,
    ButtonModule,
    CheckboxModule,
    ConfirmDialogModule,
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
        <h1>Completed</h1>
        <p class="subtitle">{{ todoService.completedCount() }} completed task{{ todoService.completedCount() === 1 ? '' : 's' }}</p>
      </div>
    </div>

    @if (todoService.loading()) {
      <div class="loading"><p-progressspinner ariaLabel="Loading completed tasks" /></div>
    } @else if (todoService.completedTodos().length === 0) {
      <app-empty-state
        icon="pi pi-inbox"
        title="No completed tasks"
        message="Tasks you finish on the Active page will show up here."
      />
    } @else {
      <ul class="todo-list">
        @for (todo of todoService.completedTodos(); track todo.id) {
          <li class="todo-item">
            <p-checkbox
              [binary]="true"
              [ngModel]="true"
              [ariaLabel]="'Mark ' + todo.title + ' as active'"
              (onChange)="restore(todo)"
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
      text-decoration: line-through;
      color: var(--p-text-muted-color);
    }

    .todo-actions {
      display: flex;
      flex-shrink: 0;
      gap: 0.125rem;
    }
  `,
})
export class CompletedTodosComponent implements OnInit {
  protected readonly todoService = inject(TodoService);
  private readonly confirm = inject(ConfirmationService);
  private readonly messages = inject(MessageService);

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

  async ngOnInit(): Promise<void> {
    await this.todoService.loadTodos();
  }

  async restore(todo: Todo): Promise<void> {
    const error = await this.todoService.toggleCompleted(todo.id, false);
    if (error) {
      this.messages.add({ severity: 'error', summary: 'Error', detail: error });
      return;
    }
    this.messages.add({ severity: 'success', summary: 'Restored', detail: todo.title });
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
