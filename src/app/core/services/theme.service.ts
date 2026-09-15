import { Injectable, signal } from '@angular/core';

import { ThemePreference } from '../models/user.model';

const STORAGE_KEY = 'shelfy.theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly preference = signal<ThemePreference>(readStoredTheme());

  readonly theme = this.preference.asReadonly();

  private readonly systemDark = window.matchMedia('(prefers-color-scheme: dark)');

  constructor() {
    this.apply(this.preference());
    this.systemDark.addEventListener('change', () => {
      if (this.preference() === 'SYSTEM') {
        this.apply('SYSTEM');
      }
    });
  }

  set(theme: ThemePreference): void {
    this.preference.set(theme);
    localStorage.setItem(STORAGE_KEY, theme);
    this.apply(theme);
  }

  toggle(): ThemePreference {
    const next: ThemePreference = this.resolved() === 'DARK' ? 'LIGHT' : 'DARK';
    this.set(next);
    return next;
  }

  resolved(): 'LIGHT' | 'DARK' {
    const current = this.preference();
    if (current !== 'SYSTEM') {
      return current;
    }
    return this.systemDark.matches ? 'DARK' : 'LIGHT';
  }

  private apply(theme: ThemePreference): void {
    const effective = theme === 'SYSTEM' ? (this.systemDark.matches ? 'DARK' : 'LIGHT') : theme;
    document.documentElement.setAttribute('data-theme', effective.toLowerCase());
  }
}

function readStoredTheme(): ThemePreference {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored === 'LIGHT' || stored === 'DARK' || stored === 'SYSTEM' ? stored : 'SYSTEM';
}
