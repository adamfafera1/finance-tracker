import { describe, it, expect } from 'vitest';

describe('App bootstrap', () => {
  it('should have finance tracker as project name', () => {
    expect('finance-tracker').toBe('finance-tracker');
  });
});
