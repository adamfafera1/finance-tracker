import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { SelectModule } from 'primeng/select';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { AuthService } from '../../core/auth/auth.service';
import { ThemeService } from '../../core/theme/theme.service';
import { CURRENCIES, currencyLabel } from '../../shared/constants/currencies';
import { AppCurrencyPipe } from '../../shared/pipes/app-currency.pipe';

@Component({
  selector: 'app-settings',
  imports: [FormsModule, ButtonModule, CardModule, SelectModule, ToastModule, AppCurrencyPipe],
  providers: [MessageService],
  template: `
    <p-toast />

    <div class="page-header">
      <h1>Settings</h1>
    </div>

    <div class="settings-grid">
      <p-card header="Currency">
        <p class="setting-description">
          Default currency for new accounts and amounts shown across the app.
        </p>

        <div class="field">
          <label for="currency">Default currency</label>
          <p-select
            inputId="currency"
            [options]="currencyOptions"
            [ngModel]="selectedCurrency()"
            (ngModelChange)="selectedCurrency.set($event)"
            optionLabel="label"
            optionValue="code"
            placeholder="Select currency"
            styleClass="w-full"
          />
        </div>

        <p class="preview">
          Preview: {{ 1234.56 | appCurrency: selectedCurrency() }}
        </p>

        <button pButton (click)="saveCurrency()" [disabled]="saving() || !hasCurrencyChange()">
          @if (saving()) {
            <i class="pi pi-spinner pi-spin" aria-hidden="true"></i>
          }
          Save currency
        </button>
      </p-card>

      <p-card header="Appearance">
        <p class="setting-description">Switch between light and dark mode.</p>
        <button pButton variant="outlined" severity="secondary" (click)="theme.toggle()">
          <i [class]="theme.isDark() ? 'pi pi-sun' : 'pi pi-moon'" aria-hidden="true"></i>
          {{ theme.isDark() ? 'Light mode' : 'Dark mode' }}
        </button>
      </p-card>

      <p-card header="Account">
        <p class="setting-description">
          Signed in as {{ auth.user()?.email }}
        </p>
        <button pButton variant="outlined" severity="danger" (click)="auth.signOut()">
          <i class="pi pi-sign-out" aria-hidden="true"></i>
          Sign out
        </button>
      </p-card>
    </div>
  `,
  styles: `
    .settings-grid {
      display: grid;
      gap: 1rem;
      max-width: 32rem;
    }

    .setting-description {
      margin: 0 0 1rem;
      color: var(--p-text-muted-color);
      font-size: 0.875rem;
      line-height: 1.5;
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

    .preview {
      margin: 0 0 1rem;
      font-size: 0.875rem;
      color: var(--p-text-muted-color);
    }
  `,
})
export class SettingsComponent implements OnInit {
  protected readonly auth = inject(AuthService);
  protected readonly theme = inject(ThemeService);
  private readonly messageService = inject(MessageService);

  saving = signal(false);
  selectedCurrency = signal('EUR');

  currencyOptions = CURRENCIES.map((c) => ({
    code: c.code,
    label: currencyLabel(c.code),
  }));

  ngOnInit(): void {
    this.selectedCurrency.set(this.auth.defaultCurrency());
  }

  hasCurrencyChange = () => this.selectedCurrency() !== this.auth.defaultCurrency();

  async saveCurrency(): Promise<void> {
    this.saving.set(true);
    const err = await this.auth.updateDefaultCurrency(this.selectedCurrency());
    this.saving.set(false);

    if (err) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: err });
    } else {
      this.messageService.add({
        severity: 'success',
        summary: 'Saved',
        detail: `Default currency set to ${this.selectedCurrency()}`,
      });
    }
  }
}
