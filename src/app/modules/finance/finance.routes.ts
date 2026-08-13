import { Routes } from '@angular/router';

export const financeRoutes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./dashboard/dashboard.component').then((m) => m.DashboardComponent),
  },
  {
    path: 'accounts',
    loadComponent: () =>
      import('./accounts/accounts.component').then((m) => m.AccountsComponent),
  },
  {
    path: 'goals',
    loadComponent: () =>
      import('./goals/goals.component').then((m) => m.SavingGoalsComponent),
  },
  {
    path: 'shopping',
    loadComponent: () =>
      import('./shopping/shopping.component').then((m) => m.ShoppingListComponent),
  },
  {
    path: 'transactions',
    loadComponent: () =>
      import('./transactions/transactions.component').then((m) => m.TransactionsComponent),
  },
  {
    path: 'incoming',
    loadComponent: () =>
      import('./incoming/incoming.component').then((m) => m.IncomingComponent),
  },
  {
    path: 'recurring',
    loadComponent: () =>
      import('./recurring/recurring.component').then((m) => m.RecurringComponent),
  },
  {
    path: 'reports',
    loadComponent: () =>
      import('./reports/reports.component').then((m) => m.ReportsComponent),
  },
];
