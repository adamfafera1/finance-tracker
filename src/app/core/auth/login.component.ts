import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { MessageModule } from 'primeng/message';
import { AuthService } from './auth.service';

@Component({
  selector: 'app-login',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    ButtonModule,
    InputTextModule,
    PasswordModule,
    MessageModule,
  ],
  template: `
    <div class="auth-page">
      <div class="auth-card">
        <div class="auth-header">
          <i class="pi pi-heart auth-logo" aria-hidden="true"></i>
          <h1>Lifefe</h1>
          <p>Sign in to your life companion</p>
        </div>

        @if (error()) {
          <p-message severity="error" styleClass="w-full">{{ error() }}</p-message>
        }

        <form [formGroup]="form" (ngSubmit)="onSubmit()">
          <div class="field">
            <label for="email">Email</label>
            <input pInputText id="email" type="email" formControlName="email" class="w-full" />
          </div>
          <div class="field">
            <label for="password">Password</label>
            <p-password
              inputId="password"
              formControlName="password"
              [feedback]="false"
              [toggleMask]="true"
              styleClass="w-full"
              inputStyleClass="w-full"
            />
          </div>
          <button pButton type="submit" class="w-full" [disabled]="loading() || form.invalid">
            @if (loading()) {
              <i class="pi pi-spinner pi-spin" aria-hidden="true"></i>
            }
            Sign In
          </button>
        </form>

        <p class="auth-footer">
          Don't have an account?
          <a routerLink="/auth/signup">Sign up</a>
        </p>
      </div>
    </div>
  `,
  styles: `
    .auth-page {
      min-height: 100dvh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1.5rem;
      background: var(--p-surface-50);
    }

    :host-context(.app-dark) .auth-page {
      background: var(--p-surface-950);
    }

    .auth-card {
      width: 100%;
      max-width: 24rem;
      padding: 2rem;
      border-radius: var(--p-border-radius-xl);
      background: var(--p-content-background);
      box-shadow: 0 4px 24px rgb(0 0 0 / 8%);
    }

    .auth-header {
      text-align: center;
      margin-bottom: 1.5rem;
    }

    .auth-logo {
      font-size: 2.5rem;
      color: var(--p-primary-color);
      margin-bottom: 0.5rem;
    }

    .auth-header h1 {
      margin: 0 0 0.25rem;
      font-size: 1.5rem;
    }

    .auth-header p {
      margin: 0;
      color: var(--p-text-muted-color);
    }

    .field {
      margin-bottom: 1rem;
    }

    .field label {
      display: block;
      margin-bottom: 0.375rem;
      font-weight: 500;
      font-size: 0.875rem;
    }

    .w-full {
      width: 100%;
    }

    form button {
      margin-top: 0.5rem;
    }

    .auth-footer {
      text-align: center;
      margin: 1.5rem 0 0;
      font-size: 0.875rem;
      color: var(--p-text-muted-color);
    }
  `,
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  loading = signal(false);
  error = signal<string | null>(null);

  form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  async onSubmit(): Promise<void> {
    if (this.form.invalid) return;
    this.loading.set(true);
    this.error.set(null);

    const { email, password } = this.form.getRawValue();
    const err = await this.auth.signIn(email, password);
    this.loading.set(false);

    if (err) {
      this.error.set(err);
    } else {
      this.router.navigate(['/home']);
    }
  }
}
