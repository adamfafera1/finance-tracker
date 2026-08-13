import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { ChartModule } from 'primeng/chart';
import { ProgressBarModule } from 'primeng/progressbar';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { DashboardService } from '../dashboard/dashboard.service';
import { SavingGoalService } from '../goals/saving-goal.service';
import { AuthService } from '../../../core/auth/auth.service';
import { ThemeService } from '../../../core/theme/theme.service';
import { AppCurrencyPipe } from '../../../shared/pipes/app-currency.pipe';
import { EmptyStateComponent } from '../../../shared/components/empty-state.component';
import { SavingGoal, savingGoalProgress } from '../../../shared/models/saving-goal.model';
import {
  chartLayoutPadding,
  formatChartCurrency,
  readChartThemeColors,
  withAlpha,
} from '../../../shared/utils/chart-theme';

@Component({
  selector: 'app-reports',
  imports: [
    RouterLink,
    ButtonModule,
    CardModule,
    ChartModule,
    ProgressBarModule,
    ProgressSpinnerModule,
    AppCurrencyPipe,
    EmptyStateComponent,
  ],
  template: `
    <div class="page-header">
      <h1>Reports</h1>
    </div>

    @if (loading()) {
      <div class="loading-center"><p-progressspinner ariaLabel="Loading reports" /></div>
    } @else if (!hasTxnData() && !hasGoals()) {
      <app-empty-state
        icon="pi pi-chart-pie"
        title="No report data yet"
        message="Add income and expense transactions or saving goals to see reports."
      />
    } @else {
      @if (hasTxnData()) {
        <div class="stat-grid">
          <p-card styleClass="stat-card">
            <p class="label">Income This Month</p>
            <p class="value positive">{{ dashboard.monthlySummary().income | appCurrency }}</p>
          </p-card>
          <p-card styleClass="stat-card">
            <p class="label">Spending This Month</p>
            <p class="value negative">{{ dashboard.monthlySummary().expenses | appCurrency }}</p>
          </p-card>
          <p-card styleClass="stat-card">
            <p class="label">Net This Month</p>
            <p
              class="value"
              [class.positive]="dashboard.monthlySummary().net >= 0"
              [class.negative]="dashboard.monthlySummary().net < 0"
            >
              {{ dashboard.monthlySummary().net | appCurrency }}
            </p>
          </p-card>
        </div>
      }

      <div class="charts-grid">
        @if (hasTxnData()) {
          <p-card styleClass="chart-card">
            <div class="chart-panel">
              <div class="card-heading">
                <span class="card-title">Spending by Category</span>
                <span class="card-subtitle">This month</span>
              </div>

              @if (dashboard.spendingByCategory().length === 0) {
                <div class="chart-empty">
                  <i class="pi pi-chart-pie" aria-hidden="true"></i>
                  <p>No expenses recorded this month</p>
                </div>
              } @else {
                <div class="chart-wrap chart-wrap--doughnut">
                  <p-chart type="doughnut" [data]="categoryChartData()" [options]="doughnutOptions()" />
                </div>
              }
            </div>
          </p-card>

          <p-card styleClass="chart-card">
            <div class="chart-panel">
              <div class="card-heading">
                <span class="card-title">Income & Spending Trend</span>
                <span class="card-subtitle">Last 6 months</span>
              </div>

              <div class="chart-wrap chart-wrap--line">
                <p-chart type="line" [data]="trendChartData()" [options]="lineOptions()" />
              </div>
            </div>
          </p-card>
        }

        @if (hasGoals()) {
          <p-card styleClass="chart-card">
            <div class="chart-panel">
              <div class="card-heading card-heading--row">
                <div>
                  <span class="card-title">Saving Goals</span>
                  <span class="card-subtitle">Top {{ topGoals().length }}</span>
                </div>
                <a routerLink="/finance/goals" pButton variant="text" size="small">Manage</a>
              </div>

              <div class="goals-list">
                @for (goal of topGoals(); track goal.id) {
                  <div class="goal-row">
                    <div class="goal-row-top">
                      <span class="goal-name">{{ goal.name }}</span>
                      <span class="goal-pct">{{ progress(goal) }}%</span>
                    </div>
                    <p-progressbar
                      [value]="progress(goal)"
                      [showValue]="false"
                      [style]="{ height: '0.5rem' }"
                    />
                    <p class="goal-amounts">
                      {{ goal.current_amount | appCurrency: goal.currency }}
                      of
                      {{ goal.target_amount | appCurrency: goal.currency }}
                    </p>
                  </div>
                }
              </div>
            </div>
          </p-card>
        }
      </div>

      @if (hasTxnData() && dashboard.spendingByCategory().length > 0) {
        <p-card styleClass="breakdown-card">
          <div class="chart-panel">
            <div class="card-heading">
              <span class="card-title">Category Breakdown</span>
              <span class="card-subtitle">This month</span>
            </div>

            <div class="breakdown-list">
              @for (item of dashboard.spendingByCategory(); track item.name) {
                <div class="breakdown-item">
                  <span class="breakdown-name">
                    <span class="dot" [style.background]="item.color ?? 'var(--p-primary-color)'"></span>
                    {{ item.name }}
                  </span>
                  <div class="breakdown-bar-wrap">
                    <div
                      class="breakdown-bar"
                      [style.width.%]="categoryShare(item.amount)"
                      [style.background]="item.color ?? 'var(--p-primary-color)'"
                    ></div>
                  </div>
                  <span class="breakdown-amount">{{ item.amount | appCurrency }}</span>
                </div>
              }
            </div>
          </div>
        </p-card>
      }
    }
  `,
  styles: `
    .charts-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(18rem, 1fr));
      gap: 1rem;
      margin-bottom: 1.5rem;
    }

    :host ::ng-deep .chart-card .p-card-body,
    :host ::ng-deep .breakdown-card .p-card-body {
      padding: 0;
    }

    .chart-panel {
      padding: 1.25rem 1.5rem 1.5rem;
    }

    .card-heading {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      margin-bottom: 1.25rem;
    }

    .card-heading--row {
      flex-direction: row;
      justify-content: space-between;
      align-items: flex-start;
      gap: 1rem;
    }

    .card-heading--row > div {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .card-title {
      font-size: 1rem;
      font-weight: 600;
      letter-spacing: -0.01em;
      line-height: 1.3;
    }

    .card-subtitle {
      font-size: 0.8125rem;
      color: var(--p-text-muted-color);
      font-weight: 400;
      line-height: 1.4;
    }

    .chart-wrap {
      position: relative;
      width: 100%;
    }

    .chart-wrap--doughnut {
      height: 16rem;
    }

    .chart-wrap--line {
      height: 17rem;
    }

    :host ::ng-deep .chart-wrap .p-chart {
      width: 100%;
      height: 100%;
    }

    :host ::ng-deep .chart-wrap canvas {
      display: block;
      margin: 0 auto;
    }

    .chart-empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      height: 17.5rem;
      color: var(--p-text-muted-color);
      font-size: 0.875rem;
    }

    .chart-empty i {
      font-size: 1.75rem;
      opacity: 0.6;
    }

    .chart-empty p {
      margin: 0;
    }

    .breakdown-list {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .breakdown-item {
      display: grid;
      grid-template-columns: minmax(6rem, 8rem) 1fr auto;
      align-items: center;
      gap: 0.75rem;
    }

    .breakdown-name {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.875rem;
      min-width: 0;
    }

    .dot {
      width: 0.5rem;
      height: 0.5rem;
      border-radius: 50%;
      flex-shrink: 0;
    }

    .breakdown-bar-wrap {
      height: 0.375rem;
      background: var(--p-content-border-color);
      border-radius: 999px;
      overflow: hidden;
    }

    .breakdown-bar {
      height: 100%;
      border-radius: 999px;
      min-width: 0.25rem;
      opacity: 0.85;
      transition: width 0.3s ease;
    }

    .breakdown-amount {
      font-weight: 600;
      font-size: 0.875rem;
      font-variant-numeric: tabular-nums;
      white-space: nowrap;
    }

    .goals-list {
      display: flex;
      flex-direction: column;
      gap: 1.125rem;
      min-height: 12rem;
    }

    .goal-row-top {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      gap: 0.75rem;
      margin-bottom: 0.375rem;
    }

    .goal-name {
      font-size: 0.875rem;
      font-weight: 500;
      word-break: break-word;
    }

    .goal-pct {
      font-size: 0.8125rem;
      font-weight: 600;
      font-variant-numeric: tabular-nums;
      color: var(--p-primary-color);
      flex-shrink: 0;
    }

    .goal-amounts {
      margin: 0.375rem 0 0;
      font-size: 0.75rem;
      color: var(--p-text-muted-color);
      font-variant-numeric: tabular-nums;
    }

    @media (max-width: 640px) {
      .breakdown-item {
        grid-template-columns: 1fr auto;
        grid-template-rows: auto auto;
      }

      .breakdown-bar-wrap {
        grid-column: 1 / -1;
      }
    }
  `,
})
export class ReportsComponent implements OnInit {
  protected readonly dashboard = inject(DashboardService);
  protected readonly goalService = inject(SavingGoalService);
  private readonly auth = inject(AuthService);
  private readonly theme = inject(ThemeService);

  private readonly pageLoading = signal(true);

  loading = () => this.pageLoading();

  hasTxnData = computed(() => {
    this.theme.isDark();
    const summary = this.dashboard.monthlySummary();
    const trend = this.dashboard.monthlyTrend();
    return (
      summary.income > 0 ||
      summary.expenses > 0 ||
      trend.some((m) => m.income > 0 || m.expenses > 0)
    );
  });

  hasGoals = computed(() => this.goalService.goals().length > 0);

  /** Up to 3 goals, nearest completion first. */
  topGoals = computed(() =>
    [...this.goalService.goals()]
      .sort((a, b) => savingGoalProgress(b) - savingGoalProgress(a))
      .slice(0, 3),
  );

  private themeColors = computed(() => readChartThemeColors(this.theme.isDark()));

  doughnutOptions = computed(() => {
    const colors = this.themeColors();
    return {
      cutout: '62%',
      maintainAspectRatio: true,
      aspectRatio: 1.35,
      layout: { padding: chartLayoutPadding('doughnut') },
      plugins: {
        legend: {
          position: 'bottom' as const,
          align: 'center' as const,
          labels: {
            usePointStyle: true,
            pointStyle: 'circle',
            padding: 16,
            boxWidth: 8,
            color: colors.text,
            font: { family: colors.fontFamily, size: 12 },
          },
        },
        tooltip: {
          backgroundColor: colors.surface,
          titleColor: colors.text,
          bodyColor: colors.muted,
          borderColor: colors.border,
          borderWidth: 1,
          padding: 10,
          callbacks: {
            label: (ctx: { parsed: number; label?: string }) => {
              const currency = this.auth.defaultCurrency();
              return ` ${ctx.label}: ${formatChartCurrency(ctx.parsed, currency)}`;
            },
          },
        },
      },
    };
  });

  lineOptions = computed(() => {
    const colors = this.themeColors();
    const currency = this.auth.defaultCurrency();

    return {
      maintainAspectRatio: false,
      layout: { padding: chartLayoutPadding('line') },
      interaction: { mode: 'index' as const, intersect: false },
      plugins: {
        legend: {
          position: 'bottom' as const,
          align: 'center' as const,
          labels: {
            usePointStyle: true,
            pointStyle: 'line',
            padding: 16,
            boxWidth: 8,
            color: colors.text,
            font: { family: colors.fontFamily, size: 12 },
          },
        },
        tooltip: {
          backgroundColor: colors.surface,
          titleColor: colors.text,
          bodyColor: colors.muted,
          borderColor: colors.border,
          borderWidth: 1,
          padding: 10,
          callbacks: {
            label: (ctx: { dataset: { label?: string }; parsed: { y: number } }) =>
              ` ${ctx.dataset.label}: ${formatChartCurrency(ctx.parsed.y, currency)}`,
          },
        },
      },
      scales: {
        x: {
          offset: true,
          grid: { display: false },
          ticks: {
            color: colors.muted,
            padding: 6,
            font: { family: colors.fontFamily, size: 11 },
          },
          border: { color: colors.border },
        },
        y: {
          beginAtZero: true,
          grace: '5%',
          grid: { color: withAlpha(colors.border, 0.6) },
          ticks: {
            color: colors.muted,
            padding: 6,
            font: { family: colors.fontFamily, size: 11 },
            maxTicksLimit: 5,
            callback: (value: string | number) =>
              this.formatAxisCurrency(Number(value), currency),
          },
          border: { display: false },
        },
      },
    };
  });

  categoryChartData = computed(() => {
    const items = this.dashboard.spendingByCategory();
    const colors = this.themeColors();

    return {
      labels: items.map((i) => i.name),
      datasets: [
        {
          data: items.map((i) => i.amount),
          backgroundColor: items.map((i) => i.color ?? colors.primary),
          borderWidth: 0,
          hoverOffset: 6,
        },
      ],
    };
  });

  trendChartData = computed(() => {
    const trend = this.dashboard.monthlyTrend();
    const colors = this.themeColors();

    return {
      labels: trend.map((m) => m.label),
      datasets: [
        {
          label: 'Income',
          data: trend.map((m) => m.income),
          borderColor: colors.green,
          backgroundColor: withAlpha(colors.green, 0.08),
          fill: true,
          tension: 0.35,
          pointBackgroundColor: colors.green,
          pointBorderColor: colors.surface,
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6,
          borderWidth: 2,
        },
        {
          label: 'Expenses',
          data: trend.map((m) => m.expenses),
          borderColor: colors.red,
          backgroundColor: withAlpha(colors.red, 0.06),
          fill: true,
          tension: 0.35,
          pointBackgroundColor: colors.red,
          pointBorderColor: colors.surface,
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6,
          borderWidth: 2,
        },
      ],
    };
  });

  progress(goal: SavingGoal): number {
    return savingGoalProgress(goal);
  }

  categoryShare(amount: number): number {
    const total = this.dashboard.spendingByCategory().reduce((sum, item) => sum + item.amount, 0);
    if (total <= 0) return 0;
    return Math.max(4, (amount / total) * 100);
  }

  formatAxisCurrency(value: number, currency: string): string {
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return `${(value / 1_000).toFixed(1)}k`;
    return formatChartCurrency(value, currency);
  }

  async ngOnInit(): Promise<void> {
    this.pageLoading.set(true);
    await Promise.all([this.dashboard.refresh(), this.goalService.loadGoals()]);
    this.pageLoading.set(false);
  }
}
