export type Adjustment = { label: string; deltaUsd: number };

export type PointCurrency = {
  id: string; userId: string; code: string; name: string; defaultCpp: number;
};

export type Option = {
  id: string; journeyId: string; label: string; portal: string;
  carrier: string | null; stops: number | null; durationMins: number | null;
  cabin: string | null; viaText: string | null;
  cashUsd: number; pointsCurrencyId: string | null; pointsAmount: number | null;
  cppOverride: number | null; adjustments: Adjustment[]; notes: string | null;
  createdAt: string;
};

export type Journey = {
  id: string; userId: string; fromLabel: string; toLabel: string;
  departDate: string | null; returnDate: string | null; notes: string | null; createdAt: string;
};
