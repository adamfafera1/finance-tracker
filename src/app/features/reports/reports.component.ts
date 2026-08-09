import { Component, computed, inject, OnInit } from '@angular/core';
import { CardModule } from 'primeng/card';
import { ChartModule } from 'primeng/chart';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { DashboardService } from '../dashboard/dashboard.service';
import { AppCurrencyPipe } from '../../shared/pipes/app-currency.pipe';
import { EmptyStateComponent } from '../../shared/components/empty-state.component';

@Component({
  selector: 'app-reports',
  imports: [CardModule, ChartModule, ProgressSpinnerModule, AppCurrencyPipe, EmptyStateComponent],
  template: `
    <div class="page-header">
      <h1>Reports</h1>
    </div>

    @if (loading()) {
      <div class="loading-center"><p-progressspinner ariaLabel="Loading reports" /></div>
    } @else if (dashboard.spendingByCategory().length === 0) {
      <app-empty-state
        icon="pi pi-chart-pie"
        title="No spending data yet"
        message="Add expense transactions this month to see your spending breakdown."
      />
    } @else {
      <div class="charts-grid">
        <p-card header="Spending by Category">
          <p-chart type="doughnut" [data]="categoryChartData()" [options]="doughnutOptions" />
        </p-card>

        <p-card header="Monthly Trend (6 months)">
          <p-chart type="bar" [data]="trendChartData()" [options]="barOptions" />
        </p-card>
      </div>

      <p-card header="Category Breakdown" styleClass="breakdown-card">
        <div class="breakdown-list">
          @for (item of dashboard.spendingByCategory(); track item.name) {
            <div class="breakdown-item">
              <span class="breakdown-name">
                <span class="dot" [style.background]="item.color ?? 'var(--p-primary-color)'"></span>
                {{ item.name }}
              </span>
              <span class="breakdown-amount">{{ item.amount | appCurrency }}</span>
            </div>
          }
        </div>
      </p-card>
    }
  `,
  styles: `
    .charts-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(20rem, 1fr));
      gap: 1rem;
      margin-bottom: 1.5rem;
    }

    .breakdown-card {
      margin-top: 0;
    }

    .breakdown-list {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .breakdown-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .breakdown-name {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .dot {
      width: 0.625rem;
      height: 0.625rem;
      border-radius: 50%;
      flex-shrink: 0;
    }

    .breakdown-amount {
      font-weight: 600;
    }
  `,
})
export class ReportsComponent implements OnInit {
  protected readonly dashboard = inject(DashboardService);

  loading = () => this.dashboard.accounts().length === 0 && this.dashboard.spendingByCategory().length === 0;

  doughnutOptions = {
    plugins: { legend: { position: 'bottom' as const } },
    maintainAspectRatio: false,
  };

  barOptions = {
    plugins: { legend: { position: 'bottom' as const } },
    scales: { y: { beginAtZero: true } },
    maintainAspectRatio: false,
  };

  categoryChartData = computed(() => {
    const items = this.dashboard.spendingByCategory();
    return {
      labels: items.map((i) => i.name),
      datasets: [
        {
          data: items.map((i) => i.amount),
          backgroundColor: items.map((i) => i.color ?? '#6366f1'),
        },
      ],
    };
  });

  trendChartData = computed(() => {
    const trend = this.dashboard.monthlyTrend();
    return {
      labels: trend.map((m) => m.label),
      datasets: [
        {
          label: 'Income',
          data: trend.map((m) => m.income),
          backgroundColor: '#22c55e',
        },
        {
          label: 'Expenses',
          data: trend.map((m) => m.expenses),
          backgroundColor: '#ef4444',
        },
      ],
    };
  });

  ngOnInit(): void {
    this.dashboard.refresh();
  }
}
