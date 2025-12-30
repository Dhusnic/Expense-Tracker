import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'auth',
    loadChildren: () =>
      import('./features/auth/auth-module').then(m => m.AuthModule)
  },
  {
    path: 'dashboard',
    loadChildren: () =>
      import('./core/dashboard/dashboard-module').then(m => m.DashboardModule)
  },
  {
    path: 'expense_tracker',
    loadChildren: () =>
      import('./modules/expense-tracker/expense-tracker-module').then(m => m.ExpenseTrackerModule)
  },
  {
    path: "accounts",
    loadChildren: () =>
      import('./modules/accounts/accounts-module').then(m => m.AccountsModule)
  },
  {
    path: "budgets",
    loadChildren: () =>
      import('./modules/budgets/budgets-module').then(m => m.BudgetsModule)
  },
  {
    path: "categories",
    loadChildren: () =>
      import('./modules/categories/categories-module').then(m => m.CategoriesModule)
  },
  {
    path: '**',
    redirectTo: '/auth/login'
  },
];

