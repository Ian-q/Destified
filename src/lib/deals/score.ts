import type { Option, PointCurrency } from './types';

export type CostBreakdown = { cashUsd: number; pointsUsd: number; cppUsed: number | null; adjustmentsUsd: number };
export type ScoreResult =
  | { ok: true; effectiveUsd: number; breakdown: CostBreakdown }
  | { ok: false; reason: string };

export function effectiveCost(option: Option, currenciesById: Map<string, PointCurrency>): ScoreResult {
  const adjustmentsUsd = (option.adjustments ?? []).reduce((s, a) => s + a.deltaUsd, 0);
  let pointsUsd = 0;
  let cppUsed: number | null = null;

  if (option.pointsAmount && option.pointsAmount > 0) {
    const currency = option.pointsCurrencyId ? currenciesById.get(option.pointsCurrencyId) : undefined;
    const cpp = option.cppOverride ?? currency?.defaultCpp ?? null;
    if (cpp === null || !(cpp > 0)) {
      const code = currency?.code ?? 'this currency';
      return { ok: false, reason: `Set a cents-per-point for ${code} to value ${option.pointsAmount.toLocaleString()} points.` };
    }
    cppUsed = cpp;
    pointsUsd = (option.pointsAmount * cpp) / 100;
  }

  const effectiveUsd = option.cashUsd + pointsUsd + adjustmentsUsd;
  return { ok: true, effectiveUsd, breakdown: { cashUsd: option.cashUsd, pointsUsd, cppUsed, adjustmentsUsd } };
}

const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

export function qualityRankFor(effectiveUsd: number, bestUsd: number, worstUsd: number): string {
  if (worstUsd <= bestUsd) return 'A';
  const ratio = (worstUsd - effectiveUsd) / (worstUsd - bestUsd); // 1 = cheapest
  const idx = Math.max(0, Math.min(RANKS.length - 1, Math.round(ratio * (RANKS.length - 1))));
  return RANKS[idx];
}

export type RankedOption = {
  option: Option; effectiveUsd: number; breakdown: CostBreakdown; deltaVsBestUsd: number; qualityRank: string;
};
export type IncompleteOption = { option: Option; reason: string };
export type RankedJourney = { ranked: RankedOption[]; incomplete: IncompleteOption[] };

export function rankJourney(options: Option[], currenciesById: Map<string, PointCurrency>): RankedJourney {
  const scored: { option: Option; effectiveUsd: number; breakdown: CostBreakdown }[] = [];
  const incomplete: IncompleteOption[] = [];

  for (const o of options) {
    const r = effectiveCost(o, currenciesById);
    if (r.ok) scored.push({ option: o, effectiveUsd: r.effectiveUsd, breakdown: r.breakdown });
    else incomplete.push({ option: o, reason: r.reason });
  }

  scored.sort((a, b) =>
    a.effectiveUsd - b.effectiveUsd ||
    Date.parse(a.option.createdAt) - Date.parse(b.option.createdAt));

  const bestUsd = scored.length ? scored[0].effectiveUsd : 0;
  const worstUsd = scored.length ? scored[scored.length - 1].effectiveUsd : 0;

  const ranked: RankedOption[] = scored.map((s) => ({
    option: s.option,
    effectiveUsd: s.effectiveUsd,
    breakdown: s.breakdown,
    deltaVsBestUsd: s.effectiveUsd - bestUsd,
    qualityRank: qualityRankFor(s.effectiveUsd, bestUsd, worstUsd),
  }));

  return { ranked, incomplete };
}
