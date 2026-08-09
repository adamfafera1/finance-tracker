import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.loading()) {
    return new Promise<boolean | UrlTree>((resolve) => {
      const check = () => {
        if (!auth.loading()) {
          resolve(auth.isAuthenticated() ? true : router.createUrlTree(['/auth/login']));
        } else {
          setTimeout(check, 50);
        }
      };
      check();
    });
  }

  return auth.isAuthenticated() ? true : router.createUrlTree(['/auth/login']);
};

export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.loading()) {
    return new Promise<boolean | ReturnType<Router['createUrlTree']>>((resolve) => {
      const check = () => {
        if (!auth.loading()) {
          resolve(auth.isAuthenticated() ? router.createUrlTree(['/home']) : true);
        } else {
          setTimeout(check, 50);
        }
      };
      check();
    });
  }

  return auth.isAuthenticated() ? router.createUrlTree(['/home']) : true;
};
