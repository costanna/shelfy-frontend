import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';

import {
  AuthResponse,
  Language,
  LoginRequest,
  MessageResponse,
  RegisterRequest,
  ThemePreference,
  User,
} from '../models/user.model';
import { environment } from '../../../environments/environment';

const TOKEN_KEY = 'shelfy.token';
const USER_KEY = 'shelfy.user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly baseUrl = `${environment.apiUrl}`;

  private readonly currentUser = signal<User | null>(readStoredUser());

  readonly user = this.currentUser.asReadonly();
  readonly isLoggedIn = computed(() => this.currentUser() !== null);

  register(request: RegisterRequest): Observable<MessageResponse> {
    return this.http.post<MessageResponse>(`${this.baseUrl}/auth/register`, request);
  }

  login(request: LoginRequest): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.baseUrl}/auth/login`, request)
      .pipe(tap((response) => this.storeSession(response)));
  }

  verifyEmail(token: string): Observable<AuthResponse> {
    const params = new HttpParams().set('token', token);
    return this.http
      .get<AuthResponse>(`${this.baseUrl}/auth/verify-email`, { params })
      .pipe(tap((response) => this.storeSession(response)));
  }

  resendVerification(email: string): Observable<MessageResponse> {
    return this.http.post<MessageResponse>(`${this.baseUrl}/auth/resend-verification`, { email });
  }

  forgotPassword(email: string): Observable<MessageResponse> {
    return this.http.post<MessageResponse>(`${this.baseUrl}/auth/forgot-password`, { email });
  }

  resetPassword(token: string, newPassword: string): Observable<MessageResponse> {
    return this.http.post<MessageResponse>(`${this.baseUrl}/auth/reset-password`, {
      token,
      newPassword,
    });
  }

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    this.currentUser.set(null);
    void this.router.navigate(['/login']);
  }

  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  savePreferences(preferences: {
    themePreference?: ThemePreference;
    languagePreference?: Language;
  }): Observable<User> {
    return this.http
      .patch<User>(`${this.baseUrl}/users/me/preferences`, preferences)
      .pipe(tap((user) => this.storeUser(user)));
  }

  private storeSession(response: AuthResponse): void {
    localStorage.setItem(TOKEN_KEY, response.token);
    this.storeUser(response.user);
  }

  private storeUser(user: User): void {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    this.currentUser.set(user);
  }
}

function readStoredUser(): User | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw || !localStorage.getItem(TOKEN_KEY)) {
    return null;
  }
  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}
