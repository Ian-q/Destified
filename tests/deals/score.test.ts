import { describe, it, expect } from 'vitest';
import { effectiveCost } from '@/lib/deals/score';
import type { Option, PointCurrency } from '@/lib/deals/types';

const AEROPLAN: PointCurrency = { id: 'c1', userId: 'u1', code: 'AEROPLAN', name: 'Aeroplan', defaultCpp: 1.5 };
const currencies = new Map([[AEROPLAN.id, AEROPLAN]]);

function opt(over: Partial<Option>): Option {
  return {
    id: 'o', journeyId: 'j', label: 'x', portal: 'p', carrier: null, stops: null,
    durationMins: null, cabin: null, viaText: null, cashUsd: 0, pointsCurrencyId: null,
    pointsAmount: null, cppOverride: null, adjustments: [], notes: null,
    createdAt: '2026-06-30T00:00:00.000Z', ...over,
  };
}

describe('effectiveCost', () => {
  it('values a pure-cash option as its cash', () => {
    const r = effectiveCost(opt({ cashUsd: 850 }), currencies);
    expect(r).toEqual({ ok: true, effectiveUsd: 850, breakdown: { cashUsd: 850, pointsUsd: 0, cppUsed: null, adjustmentsUsd: 0 } });
  });

  it('values points at the currency default CPP and adds fees + adjustments', () => {
    const r = effectiveCost(opt({
      cashUsd: 80, pointsCurrencyId: 'c1', pointsAmount: 57000,
      adjustments: [{ label: 'lounge', deltaUsd: -40 }],
    }), currencies);
    // 57000 * 1.5 / 100 = 855 ; 80 + 855 - 40 = 895
    expect(r.ok).toBe(true);
    if (r.ok) { expect(r.effectiveUsd).toBe(895); expect(r.breakdown.cppUsed).toBe(1.5); }
  });

  it('prefers a per-redemption cppOverride over the currency default', () => {
    const r = effectiveCost(opt({ pointsCurrencyId: 'c1', pointsAmount: 50000, cppOverride: 2.0 }), currencies);
    expect(r.ok && r.effectiveUsd).toBe(1000); // 50000 * 2.0 / 100
  });

  it('REFUSES to value points with no resolvable CPP (no $0 fail-open)', () => {
    const r = effectiveCost(opt({ pointsCurrencyId: 'missing', pointsAmount: 40000 }), currencies);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/cents-per-point/i);
  });
});
