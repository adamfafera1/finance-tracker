import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/auth/auth.guard';

export const routes: Routes = [
  {
    path: 'auth',
    loadChildren: () => import('./core/auth/auth.routes').then((m) => m.authRoutes),
    canActivate: [guestGuard],
  },
  {
    path: '',
    loadComponent: () =>
      import('./core/layout/app-shell.component').then((m) => m.AppShellComponent),
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'home', pathMatch: 'full' },
      {
        path: 'home',
        loadComponent: () =>
          import('./features/home/home.component').then((m) => m.HomeComponent),
      },
      {
        path: 'finance',
        loadChildren: () =>
          import('./modules/finance/finance.routes').then((m) => m.financeRoutes),
      },
      {
        path: 'todo',
        loadChildren: () =>
          import('./modules/todo/todo.routes').then((m) => m.todoRoutes),
      },
      {
        path: 'settings',
        loadComponent: () =>
          import('./features/settings/settings.component').then((m) => m.SettingsComponent),
      },
      // Legacy redirects from pre-Lifefe routes
      { path: 'dashboard', redirectTo: 'finance/dashboard', pathMatch: 'full' },
      { path: 'accounts', redirectTo: 'finance/accounts', pathMatch: 'full' },
      { path: 'transactions', redirectTo: 'finance/transactions', pathMatch: 'full' },
      { path: 'incoming', redirectTo: 'finance/incoming', pathMatch: 'full' },
      { path: 'recurring', redirectTo: 'finance/recurring', pathMatch: 'full' },
      { path: 'reports', redirectTo: 'finance/reports', pathMatch: 'full' },
    ],
  },
  { path: '**', redirectTo: 'home' },
];
