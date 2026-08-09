import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { AuthService } from '../auth/auth.service';
import { ThemeService } from '../theme/theme.service';

interface NavItem {
  label: string;
  icon: string;
  route: string;
}

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, ButtonModule],
  template: `
    <div class="shell">
      <aside class="sidebar">
        <div class="brand">
          <i class="pi pi-wallet" aria-hidden="true"></i>
          <span>Finance Tracker</span>
        </div>
        <nav class="sidebar-nav">
          @for (item of navItems; track item.route) {
            <a [routerLink]="item.route" routerLinkActive="active" class="nav-link">
              <i [class]="item.icon" aria-hidden="true"></i>
              <span>{{ item.label }}</span>
            </a>
          }
        </nav>
        <div class="sidebar-footer">
          <button
            pButton
            [iconOnly]="true"
            variant="text"
            [attr.aria-label]="theme.isDark() ? 'Switch to light mode' : 'Switch to dark mode'"
            (click)="theme.toggle()"
          >
            <i [class]="theme.isDark() ? 'pi pi-sun' : 'pi pi-moon'" aria-hidden="true"></i>
          </button>
          <button pButton variant="text" severity="secondary" (click)="auth.signOut()">
            <i class="pi pi-sign-out" aria-hidden="true"></i>
            Sign Out
          </button>
        </div>
      </aside>

      <main class="main-content">
        <router-outlet />
      </main>

      <nav class="bottom-nav">
        @for (item of navItems; track item.route) {
          <a [routerLink]="item.route" routerLinkActive="active" class="bottom-link">
            <i [class]="item.icon" aria-hidden="true"></i>
            <span>{{ item.label }}</span>
          </a>
        }
      </nav>
    </div>
  `,
  styles: `
    .shell {
      display: flex;
      min-height: 100dvh;
      padding-bottom: env(safe-area-inset-bottom);
    }

    .sidebar {
      display: none;
      width: 16rem;
      flex-shrink: 0;
      flex-direction: column;
      border-right: 1px solid var(--p-content-border-color);
      background: var(--p-content-background);
      padding: 1.5rem 1rem;
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      font-size: 1.125rem;
      font-weight: 600;
      padding: 0 0.5rem 1.5rem;
      color: var(--p-primary-color);
    }

    .sidebar-nav {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .nav-link {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.75rem 1rem;
      border-radius: var(--p-border-radius-md);
      color: var(--p-text-muted-color);
      text-decoration: none;
      transition: background 0.15s, color 0.15s;
    }

    .nav-link:hover {
      background: var(--p-content-hover-background);
      color: var(--p-text-color);
    }

    .nav-link.active {
      background: var(--p-primary-50);
      color: var(--p-primary-color);
      font-weight: 500;
    }

    :host-context(.app-dark) .nav-link.active {
      background: color-mix(in srgb, var(--p-primary-color) 15%, transparent);
    }

    .sidebar-footer {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      padding-top: 1rem;
      border-top: 1px solid var(--p-content-border-color);
    }

    .main-content {
      flex: 1;
      min-width: 0;
      padding: 1rem;
      padding-bottom: calc(4.5rem + env(safe-area-inset-bottom));
      background: var(--p-surface-50);
    }

    :host-context(.app-dark) .main-content {
      background: var(--p-surface-950);
    }

    .bottom-nav {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      display: flex;
      justify-content: space-around;
      background: var(--p-content-background);
      border-top: 1px solid var(--p-content-border-color);
      padding: 0.5rem 0 calc(0.5rem + env(safe-area-inset-bottom));
      z-index: 100;
    }

    .bottom-link {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.125rem;
      padding: 0.375rem 0.75rem;
      font-size: 0.6875rem;
      color: var(--p-text-muted-color);
      text-decoration: none;
      min-width: 4rem;
    }

    .bottom-link i {
      font-size: 1.25rem;
    }

    .bottom-link.active {
      color: var(--p-primary-color);
      font-weight: 500;
    }

    @media (min-width: 768px) {
      .sidebar {
        display: flex;
      }

      .bottom-nav {
        display: none;
      }

      .main-content {
        padding: 1.5rem 2rem;
        padding-bottom: 1.5rem;
      }
    }
  `,
})
export class AppShellComponent {
  protected readonly auth = inject(AuthService);
  protected readonly theme = inject(ThemeService);

  protected readonly navItems: NavItem[] = [
    { label: 'Dashboard', icon: 'pi pi-chart-line', route: '/dashboard' },
    { label: 'Incoming', icon: 'pi pi-arrow-down-left', route: '/incoming' },
    { label: 'Recurring', icon: 'pi pi-refresh', route: '/recurring' },
    { label: 'Transactions', icon: 'pi pi-list', route: '/transactions' },
    { label: 'Accounts', icon: 'pi pi-building-columns', route: '/accounts' },
    { label: 'Reports', icon: 'pi pi-chart-pie', route: '/reports' },
    { label: 'Settings', icon: 'pi pi-cog', route: '/settings' },
  ];
}
