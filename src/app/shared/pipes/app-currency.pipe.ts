import { Pipe, PipeTransform, inject } from '@angular/core';
import { AuthService } from '../../core/auth/auth.service';

@Pipe({ name: 'appCurrency' })
export class AppCurrencyPipe implements PipeTransform {
  private readonly auth = inject(AuthService);

  transform(value: number | null | undefined, currency?: string): string {
    if (value == null) return '—';
    const code = currency ?? this.auth.defaultCurrency();
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: code,
    }).format(value);
  }
}
