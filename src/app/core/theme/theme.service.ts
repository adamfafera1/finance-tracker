import { Injectable, signal } from '@angular/core';

const THEME_KEY = 'lifefe-theme';
const LEGACY_THEME_KEY = 'finance-tracker-theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly darkSignal = signal(this.getInitialTheme());

  readonly isDark = this.darkSignal.asReadonly();

  toggle(): void {
    this.setDark(!this.darkSignal());
  }

  setDark(dark: boolean): void {
    this.darkSignal.set(dark);
    localStorage.setItem(THEME_KEY, dark ? 'dark' : 'light');
    document.documentElement.classList.toggle('app-dark', dark);
  }

  private getInitialTheme(): boolean {
    const stored = localStorage.getItem(THEME_KEY) ?? localStorage.getItem(LEGACY_THEME_KEY);
    if (stored) return stored === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
}
