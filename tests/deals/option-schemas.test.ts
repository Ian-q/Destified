import { describe, it, expect } from 'vitest';
import { OptionInput, CurrencyInput } from '@/lib/deals/option-schemas';

describe('OptionInput', () => {
  it('accepts a cash option', () => {
    const r = OptionInput.safeParse({ label: 'Trip.com', portal: 'Trip.com', cashUsd: 850 });
    expect(r.success).toBe(true);
  });
  it('accepts a points option with fees', () => {
    const r = OptionInput.safeParse({ label: 'Award', portal: 'aircanada.com', cashUsd: 80, pointsCurrencyId: '11111111-1111-1111-1111-111111111111', pointsAmount: 57000 });
    expect(r.success).toBe(true);
  });
  it('rejects an option with neither cash nor points', () => {
    const r = OptionInput.safeParse({ label: 'Empty', portal: 'x', cashUsd: 0 });
    expect(r.success).toBe(false);
  });
});

describe('CurrencyInput', () => {
  it('requires a positive default CPP', () => {
    expect(CurrencyInput.safeParse({ code: 'AMEX_MR', name: 'Amex MR', defaultCpp: 1.8 }).success).toBe(true);
    expect(CurrencyInput.safeParse({ code: 'X', name: 'X', defaultCpp: 0 }).success).toBe(false);
  });
});
