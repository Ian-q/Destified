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
