import { Routes } from '@angular/router';

import { authGuard, guestGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/login/login.page').then((m) => m.LoginPage),
  },
  {
    path: 'register',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/auth/register/register.page').then((m) => m.RegisterPage),
  },
  {
    path: 'books',
    canActivate: [authGuard],
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./features/books/book-list/book-list.page').then((m) => m.BookListPage),
      },
      {
        path: 'new',
        loadComponent: () =>
          import('./features/books/book-form/book-form.page').then((m) => m.BookFormPage),
      },
      {
        path: ':id',
        loadComponent: () =>
          import('./features/books/book-detail/book-detail.page').then((m) => m.BookDetailPage),
      },
      {
        path: ':id/edit',
        loadComponent: () =>
          import('./features/books/book-form/book-form.page').then((m) => m.BookFormPage),
      },
    ],
  },
  {
    path: 'categories',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/categories/category-list/category-list.page').then(
        (m) => m.CategoryListPage,
      ),
  },
  { path: '', pathMatch: 'full', redirectTo: 'books' },
  { path: '**', redirectTo: 'books' },
];
