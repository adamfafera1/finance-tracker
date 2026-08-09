import { Routes } from '@angular/router';

export const todoRoutes: Routes = [
  { path: '', redirectTo: 'active', pathMatch: 'full' },
  {
    path: 'active',
    loadComponent: () =>
      import('./active/active-todos.component').then((m) => m.ActiveTodosComponent),
  },
  {
    path: 'completed',
    loadComponent: () =>
      import('./completed/completed-todos.component').then((m) => m.CompletedTodosComponent),
  },
];
