import { describe, it, expect } from 'vitest';
import { effectiveCost, rankJourney, qualityRankFor } from '@/lib/deals/score';
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

describe('rankJourney', () => {
  it('sorts valuable options ascending, computes delta, and buckets the unvaluable', () => {
    const opts = [
      opt({ id: 'alaska', cashUsd: 1000, createdAt: '2026-06-30T00:00:01.000Z' }),
      opt({ id: 'trip', cashUsd: 850, createdAt: '2026-06-30T00:00:02.000Z' }),
      opt({ id: 'award', pointsCurrencyId: 'c1', pointsAmount: 57000, cashUsd: 80, createdAt: '2026-06-30T00:00:03.000Z' }), // 935
      opt({ id: 'broken', pointsCurrencyId: 'missing', pointsAmount: 40000, createdAt: '2026-06-30T00:00:04.000Z' }),
    ];
    const { ranked, incomplete } = rankJourney(opts, currencies);
    expect(ranked.map((r) => r.option.id)).toEqual(['trip', 'award', 'alaska']); // 850, 935, 1000
    expect(ranked[0].deltaVsBestUsd).toBe(0);
    expect(ranked[2].deltaVsBestUsd).toBe(150);
    expect(ranked[0].qualityRank).toBe('A');     // cheapest
    expect(ranked[2].qualityRank).toBe('2');     // most expensive
    expect(incomplete.map((i) => i.option.id)).toEqual(['broken']);
  });

  it('ranks a single option as A', () => {
    const { ranked } = rankJourney([opt({ cashUsd: 500 })], currencies);
    expect(ranked[0].qualityRank).toBe('A');
  });

  it('breaks ties by createdAt (stable)', () => {
    const a = opt({ id: 'a', cashUsd: 500, createdAt: '2026-06-30T00:00:02.000Z' });
    const b = opt({ id: 'b', cashUsd: 500, createdAt: '2026-06-30T00:00:01.000Z' });
    const { ranked } = rankJourney([a, b], currencies);
    expect(ranked.map((r) => r.option.id)).toEqual(['b', 'a']);
  });
});

describe('qualityRankFor', () => {
  it('maps cheapest to A and most-expensive to 2', () => {
    expect(qualityRankFor(800, 800, 1000)).toBe('A');
    expect(qualityRankFor(1000, 800, 1000)).toBe('2');
  });
});
