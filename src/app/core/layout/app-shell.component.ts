import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter, map, startWith } from 'rxjs';
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
          <i class="pi pi-heart" aria-hidden="true"></i>
          <span>Lifefe</span>
        </div>
        <nav class="sidebar-nav">
          @for (item of primaryNav; track item.route) {
            <a
              [routerLink]="item.route"
              routerLinkActive="active"
              [routerLinkActiveOptions]="isModuleRoute(item.route) ? { exact: false } : { exact: true }"
              class="nav-link"
            >
              <i [class]="item.icon" aria-hidden="true"></i>
              <span>{{ item.label }}</span>
            </a>
          }

          @if (inFinance()) {
            <div class="nav-section">
              <span class="nav-section-label">Finance</span>
              @for (item of financeNav; track item.route) {
                <a [routerLink]="item.route" routerLinkActive="active" class="nav-link nav-link-sub">
                  <i [class]="item.icon" aria-hidden="true"></i>
                  <span>{{ item.label }}</span>
                </a>
              }
            </div>
          }

          @if (inTodo()) {
            <div class="nav-section">
              <span class="nav-section-label">Tasks</span>
              @for (item of todoNav; track item.route) {
                <a [routerLink]="item.route" routerLinkActive="active" class="nav-link nav-link-sub">
                  <i [class]="item.icon" aria-hidden="true"></i>
                  <span>{{ item.label }}</span>
                </a>
              }
            </div>
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

      <nav class="bottom-nav" [class.with-subnav]="showModuleSubnav()">
        @for (item of primaryNav; track item.route) {
          <a
            [routerLink]="item.route"
            routerLinkActive="active"
            [routerLinkActiveOptions]="isModuleRoute(item.route) ? { exact: false } : { exact: true }"
            class="bottom-link"
          >
            <i [class]="item.icon" aria-hidden="true"></i>
            <span>{{ item.label }}</span>
          </a>
        }
      </nav>

      @if (inFinance()) {
        <nav class="module-subnav" aria-label="Finance sections">
          @for (item of financeNav; track item.route) {
            <a [routerLink]="item.route" routerLinkActive="active" class="subnav-link">
              {{ item.label }}
            </a>
          }
        </nav>
      }

      @if (inTodo()) {
        <nav class="module-subnav" aria-label="Task sections">
          @for (item of todoNav; track item.route) {
            <a [routerLink]="item.route" routerLinkActive="active" class="subnav-link">
              {{ item.label }}
            </a>
          }
        </nav>
      }
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
      font-size: 1.25rem;
      font-weight: 700;
      letter-spacing: -0.02em;
      padding: 0 0.5rem 1.5rem;
      color: var(--p-primary-color);
    }

    .sidebar-nav {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .nav-section {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      margin-top: 1rem;
      padding-top: 0.75rem;
      border-top: 1px solid var(--p-content-border-color);
    }

    .nav-section-label {
      padding: 0 1rem 0.375rem;
      font-size: 0.6875rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--p-text-muted-color);
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

    .nav-link-sub {
      padding: 0.5rem 1rem 0.5rem 1.25rem;
      font-size: 0.9375rem;
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

    .bottom-nav.with-subnav {
      padding-bottom: calc(2.75rem + 0.5rem + env(safe-area-inset-bottom));
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

    .module-subnav {
      position: fixed;
      bottom: calc(3.25rem + env(safe-area-inset-bottom));
      left: 0;
      right: 0;
      display: flex;
      gap: 0.25rem;
      overflow-x: auto;
      background: var(--p-content-background);
      border-top: 1px solid var(--p-content-border-color);
      padding: 0.375rem 0.75rem;
      z-index: 99;
      -webkit-overflow-scrolling: touch;
    }

    .subnav-link {
      flex-shrink: 0;
      padding: 0.375rem 0.75rem;
      border-radius: 999px;
      font-size: 0.75rem;
      color: var(--p-text-muted-color);
      text-decoration: none;
      white-space: nowrap;
    }

    .subnav-link.active {
      background: var(--p-primary-50);
      color: var(--p-primary-color);
      font-weight: 500;
    }

    :host-context(.app-dark) .subnav-link.active {
      background: color-mix(in srgb, var(--p-primary-color) 15%, transparent);
    }

    .main-content:has(+ .module-subnav),
    .shell:has(.module-subnav) .main-content {
      padding-bottom: calc(7rem + env(safe-area-inset-bottom));
    }

    @media (min-width: 768px) {
      .sidebar {
        display: flex;
      }

      .bottom-nav,
      .module-subnav {
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
  private readonly router = inject(Router);

  private readonly url = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map(() => this.router.url),
      startWith(this.router.url),
    ),
    { initialValue: this.router.url },
  );

  protected readonly inFinance = computed(() => this.url().startsWith('/finance'));
  protected readonly inTodo = computed(() => this.url().startsWith('/todo'));
  protected readonly showModuleSubnav = computed(() => this.inFinance() || this.inTodo());

  protected readonly primaryNav: NavItem[] = [
    { label: 'Home', icon: 'pi pi-home', route: '/home' },
    { label: 'Finance', icon: 'pi pi-wallet', route: '/finance' },
    { label: 'Tasks', icon: 'pi pi-check-square', route: '/todo' },
    { label: 'Settings', icon: 'pi pi-cog', route: '/settings' },
  ];

  protected readonly financeNav: NavItem[] = [
    { label: 'Dashboard', icon: 'pi pi-chart-line', route: '/finance/dashboard' },
    { label: 'Incoming', icon: 'pi pi-arrow-down-left', route: '/finance/incoming' },
    { label: 'Recurring', icon: 'pi pi-refresh', route: '/finance/recurring' },
    { label: 'Transactions', icon: 'pi pi-list', route: '/finance/transactions' },
    { label: 'Accounts', icon: 'pi pi-building-columns', route: '/finance/accounts' },
    { label: 'Goals', icon: 'pi pi-flag', route: '/finance/goals' },
    { label: 'Shopping', icon: 'pi pi-shopping-cart', route: '/finance/shopping' },
    { label: 'Reports', icon: 'pi pi-chart-pie', route: '/finance/reports' },
  ];

  protected readonly todoNav: NavItem[] = [
    { label: 'Active', icon: 'pi pi-list', route: '/todo/active' },
    { label: 'Completed', icon: 'pi pi-check', route: '/todo/completed' },
  ];

  protected isModuleRoute(route: string): boolean {
    return route === '/finance' || route === '/todo';
  }
}
