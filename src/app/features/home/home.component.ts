import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { AuthService } from '../../core/auth/auth.service';
import { DashboardService } from '../../modules/finance/dashboard/dashboard.service';
import { AppCurrencyPipe } from '../../shared/pipes/app-currency.pipe';

@Component({
  selector: 'app-home',
  imports: [RouterLink, CardModule, ButtonModule, ProgressSpinnerModule, AppCurrencyPipe],
  template: `
    <div class="home">
      <header class="hero">
        <p class="brand">Lifefe</p>
        <h1>Your life companion</h1>
        @if (auth.profile()?.display_name) {
          <p class="greeting">Welcome back, {{ auth.profile()!.display_name }}</p>
        }
      </header>

      @if (loading()) {
        <div class="loading-center"><p-progressspinner ariaLabel="Loading home" /></div>
      } @else {
        <section class="modules">
          <p-card styleClass="module-card finance-card">
            <div class="module-header">
              <div>
                <span class="module-label">Finance</span>
                <h2>Net worth</h2>
              </div>
              <i class="pi pi-wallet module-icon" aria-hidden="true"></i>
            </div>
            <p
              class="net-worth"
              [class.positive]="dashboard.netWorth() >= 0"
              [class.negative]="dashboard.netWorth() < 0"
            >
              {{ dashboard.netWorth() | appCurrency }}
            </p>
            <div class="module-meta">
              <span>Income {{ dashboard.monthlySummary().income | appCurrency }}</span>
              <span>Spent {{ dashboard.monthlySummary().expenses | appCurrency }}</span>
            </div>
            <a routerLink="/finance/dashboard" pButton class="module-cta">Open Finance</a>
          </p-card>

          <p-card styleClass="module-card coming-soon">
            <div class="module-header">
              <div>
                <span class="module-label">Tasks</span>
                <h2>To-dos</h2>
              </div>
              <i class="pi pi-check-square module-icon" aria-hidden="true"></i>
            </div>
            <p class="placeholder">Coming soon</p>
          </p-card>

          <p-card styleClass="module-card coming-soon">
            <div class="module-header">
              <div>
                <span class="module-label">Growth</span>
                <h2>Personal growth</h2>
              </div>
              <i class="pi pi-star module-icon" aria-hidden="true"></i>
            </div>
            <p class="placeholder">Coming soon</p>
          </p-card>
        </section>
      }
    </div>
  `,
  styles: `
    .home {
      max-width: 56rem;
      margin: 0 auto;
    }

    .hero {
      margin-bottom: 1.75rem;
    }

    .brand {
      margin: 0 0 0.25rem;
      font-size: 1.75rem;
      font-weight: 700;
      letter-spacing: -0.02em;
      color: var(--p-primary-color);
    }

    .hero h1 {
      margin: 0;
      font-size: 1.25rem;
      font-weight: 500;
      color: var(--p-text-color);
    }

    .greeting {
      margin: 0.5rem 0 0;
      color: var(--p-text-muted-color);
    }

    .loading-center {
      display: flex;
      justify-content: center;
      padding: 3rem;
    }

    .modules {
      display: grid;
      gap: 1rem;
      grid-template-columns: 1fr;
    }

    :host ::ng-deep .module-card {
      height: 100%;
    }

    .module-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 0.75rem;
    }

    .module-label {
      display: block;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--p-text-muted-color);
      margin-bottom: 0.25rem;
    }

    .module-header h2 {
      margin: 0;
      font-size: 1.125rem;
      font-weight: 600;
    }

    .module-icon {
      font-size: 1.5rem;
      color: var(--p-primary-color);
    }

    .net-worth {
      margin: 0 0 0.75rem;
      font-size: 1.75rem;
      font-weight: 700;
    }

    .net-worth.positive {
      color: var(--p-green-500);
    }

    .net-worth.negative {
      color: var(--p-red-500);
    }

    .module-meta {
      display: flex;
      gap: 1rem;
      margin-bottom: 1rem;
      font-size: 0.875rem;
      color: var(--p-text-muted-color);
    }

    .module-cta {
      width: 100%;
      justify-content: center;
    }

    .placeholder {
      margin: 0;
      color: var(--p-text-muted-color);
      font-size: 0.9375rem;
    }

    :host ::ng-deep .coming-soon {
      opacity: 0.72;
    }

    @media (min-width: 768px) {
      .modules {
        grid-template-columns: repeat(3, 1fr);
      }

      .brand {
        font-size: 2.25rem;
      }
    }
  `,
})
export class HomeComponent implements OnInit {
  protected readonly auth = inject(AuthService);
  protected readonly dashboard = inject(DashboardService);

  protected readonly loading = signal(true);

  async ngOnInit(): Promise<void> {
    this.loading.set(true);
    await this.dashboard.refresh();
    this.loading.set(false);
  }
}
