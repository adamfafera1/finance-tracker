import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { ProgressBarModule } from 'primeng/progressbar';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { ToastModule } from 'primeng/toast';
import { ConfirmationService, MessageService } from 'primeng/api';
import { AuthService } from '../../../core/auth/auth.service';
import { EmptyStateComponent } from '../../../shared/components/empty-state.component';
import {
  CreateSavingGoalDto,
  SavingGoal,
  savingGoalProgress,
} from '../../../shared/models/saving-goal.model';
import { AppCurrencyPipe } from '../../../shared/pipes/app-currency.pipe';
import { SavingGoalService } from './saving-goal.service';

@Component({
  selector: 'app-saving-goals',
  imports: [
    ReactiveFormsModule,
    ButtonModule,
    CardModule,
    ConfirmDialogModule,
    DialogModule,
    InputNumberModule,
    InputTextModule,
    ProgressBarModule,
    ProgressSpinnerModule,
    ToastModule,
    EmptyStateComponent,
    AppCurrencyPipe,
  ],
  providers: [ConfirmationService, MessageService],
  template: `
    <p-toast />
    <p-confirmdialog />

    <div class="page-header">
      <h1>Goals</h1>
      <button pButton (click)="openDialog()">
        <i class="pi pi-plus" aria-hidden="true"></i>
        Add Goal
      </button>
    </div>

    @if (goalService.loading()) {
      <div class="loading"><p-progressspinner ariaLabel="Loading goals" /></div>
    } @else if (goalService.goals().length === 0) {
      <app-empty-state
        icon="pi pi-flag"
        title="No saving goals yet"
        message="Set a target and track how much you’ve saved toward it."
      >
        <button pButton (click)="openDialog()">Add Goal</button>
      </app-empty-state>
    } @else {
      <div class="goal-grid">
        @for (goal of goalService.goals(); track goal.id) {
          <p-card styleClass="goal-card">
            <div class="goal-card-header">
              <h3>{{ goal.name }}</h3>
              <div class="goal-actions">
                <button
                  pButton
                  iconOnly
                  variant="text"
                  severity="secondary"
                  aria-label="Edit goal"
                  (click)="openDialog(goal)"
                >
                  <i class="pi pi-pencil" aria-hidden="true"></i>
                </button>
                <button
                  pButton
                  iconOnly
                  variant="text"
                  severity="danger"
                  aria-label="Delete goal"
                  (click)="confirmDelete(goal)"
                >
                  <i class="pi pi-trash" aria-hidden="true"></i>
                </button>
              </div>
            </div>

            <p class="amounts">
              <span class="current">{{ goal.current_amount | appCurrency: goal.currency }}</span>
              <span class="separator">of</span>
              <span class="target">{{ goal.target_amount | appCurrency: goal.currency }}</span>
            </p>

            <p-progressbar
              [value]="progress(goal)"
              [showValue]="false"
              [style]="{ height: '0.625rem' }"
            />
            <p class="progress-label">{{ progress(goal) }}% saved</p>
          </p-card>
        }
      </div>
    }

    <p-dialog
      [header]="editingId() ? 'Edit Goal' : 'Add Goal'"
      [visible]="dialogVisible()"
      (visibleChange)="dialogVisible.set($event)"
      [modal]="true"
      [style]="{ width: 'min(28rem, 95vw)' }"
      [draggable]="false"
    >
      <form [formGroup]="form" (ngSubmit)="save()" class="dialog-form">
        <div class="field">
          <label for="goal-name">Name</label>
          <input id="goal-name" pInputText formControlName="name" class="w-full" autocomplete="off" />
        </div>
        <div class="field">
          <label for="goal-target">Target amount</label>
          <p-inputnumber
            inputId="goal-target"
            formControlName="target_amount"
            mode="currency"
            [currency]="currency()"
            styleClass="w-full"
            inputStyleClass="w-full"
          />
        </div>
        <div class="field">
          <label for="goal-current">Current saved</label>
          <p-inputnumber
            inputId="goal-current"
            formControlName="current_amount"
            mode="currency"
            [currency]="currency()"
            styleClass="w-full"
            inputStyleClass="w-full"
          />
        </div>
        <div class="dialog-actions">
          <button pButton type="button" variant="outlined" severity="secondary" (click)="dialogVisible.set(false)">
            Cancel
          </button>
          <button pButton type="submit" [disabled]="form.invalid || saving()">
            Save
          </button>
        </div>
      </form>
    </p-dialog>
  `,
  styles: `
    .page-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 1.5rem;
      gap: 1rem;
    }

    .page-header h1 {
      margin: 0;
      font-size: 1.5rem;
    }

    .loading {
      display: flex;
      justify-content: center;
      padding: 3rem;
    }

    .goal-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(16rem, 1fr));
      gap: 1rem;
    }

    .goal-card-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 0.5rem;
      margin-bottom: 0.75rem;
    }

    .goal-card-header h3 {
      margin: 0;
      font-size: 1rem;
      word-break: break-word;
    }

    .goal-actions {
      display: flex;
      flex-shrink: 0;
      gap: 0.125rem;
    }

    .amounts {
      margin: 0 0 0.75rem;
      display: flex;
      flex-wrap: wrap;
      align-items: baseline;
      gap: 0.375rem;
    }

    .current {
      font-size: 1.375rem;
      font-weight: 600;
      color: var(--p-green-500);
    }

    .separator {
      color: var(--p-text-muted-color);
      font-size: 0.875rem;
    }

    .target {
      font-weight: 500;
      color: var(--p-text-color);
    }

    .progress-label {
      margin: 0.5rem 0 0;
      font-size: 0.8125rem;
      color: var(--p-text-muted-color);
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
export class SavingGoalsComponent implements OnInit {
  protected readonly goalService = inject(SavingGoalService);
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly confirmation = inject(ConfirmationService);
  private readonly messages = inject(MessageService);

  protected readonly dialogVisible = signal(false);
  protected readonly editingId = signal<string | null>(null);
  protected readonly saving = signal(false);

  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(120)]],
    target_amount: [0, [Validators.required, Validators.min(0.01)]],
    current_amount: [0, [Validators.required, Validators.min(0)]],
  });

  currency = () => this.auth.defaultCurrency();

  async ngOnInit(): Promise<void> {
    await this.goalService.loadGoals();
  }

  progress(goal: SavingGoal): number {
    return savingGoalProgress(goal);
  }

  openDialog(goal?: SavingGoal): void {
    this.editingId.set(goal?.id ?? null);
    this.form.reset({
      name: goal?.name ?? '',
      target_amount: goal?.target_amount ?? 0,
      current_amount: goal?.current_amount ?? 0,
    });
    this.dialogVisible.set(true);
  }

  async save(): Promise<void> {
    if (this.form.invalid) return;
    this.saving.set(true);

    const value = this.form.getRawValue();
    const dto: CreateSavingGoalDto = {
      ...value,
      currency: this.currency(),
    };

    const id = this.editingId();
    const error = id
      ? await this.goalService.updateGoal(id, dto)
      : await this.goalService.createGoal(dto);

    this.saving.set(false);
    if (error) {
      this.messages.add({ severity: 'error', summary: 'Error', detail: error });
      return;
    }

    this.dialogVisible.set(false);
    this.messages.add({
      severity: 'success',
      summary: id ? 'Goal updated' : 'Goal added',
    });
  }

  confirmDelete(goal: SavingGoal): void {
    this.confirmation.confirm({
      message: `Delete “${goal.name}”?`,
      header: 'Delete goal',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      accept: async () => {
        const error = await this.goalService.deleteGoal(goal.id);
        if (error) {
          this.messages.add({ severity: 'error', summary: 'Error', detail: error });
          return;
        }
        this.messages.add({ severity: 'success', summary: 'Goal deleted' });
      },
    });
  }
}
