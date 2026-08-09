import { describe, expect, it } from 'vitest';
import { parseLocalIsoDate, toLocalIsoDate } from './date';

describe('date utils', () => {
  it('keeps local calendar day when serializing date picker values', () => {
    const picked = new Date(2026, 7, 15, 0, 0, 0);
    expect(toLocalIsoDate(picked)).toBe('2026-08-15');
  });

  it('round-trips iso date strings in local time', () => {
    const parsed = parseLocalIsoDate('2026-08-15');
    expect(toLocalIsoDate(parsed)).toBe('2026-08-15');
  });
});
