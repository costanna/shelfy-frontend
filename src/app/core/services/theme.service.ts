import { Injectable, signal } from '@angular/core';

import { ThemePreference } from '../models/user.model';

const STORAGE_KEY = 'shelfy.theme';

/**
 * Aplica el tema con el atributo data-theme en <html>, que es lo que leen
 * las CSS custom properties definidas en src/styles/_tokens.scss.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly preference = signal<ThemePreference>(readStoredTheme());

  /** Preferencia elegida por la persona: LIGHT, DARK o SYSTEM. */
  readonly theme = this.preference.asReadonly();

  private readonly systemDark = window.matchMedia('(prefers-color-scheme: dark)');

  constructor() {
    this.apply(this.preference());
    // Si la preferencia es SYSTEM, seguimos los cambios del sistema operativo.
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

  /** Alterna entre claro y oscuro partiendo del tema que se ve ahora mismo. */
  toggle(): ThemePreference {
    const next: ThemePreference = this.resolved() === 'DARK' ? 'LIGHT' : 'DARK';
    this.set(next);
    return next;
  }

  /** Tema realmente visible, resolviendo SYSTEM contra el sistema operativo. */
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
