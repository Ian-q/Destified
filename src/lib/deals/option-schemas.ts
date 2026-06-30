import { z } from 'zod';

export const AdjustmentInput = z.object({
  label: z.string().min(1),
  deltaUsd: z.number(),
}).strict();

export const CurrencyInput = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  defaultCpp: z.number().positive(),
}).strict();

export const JourneyInput = z.object({
  fromLabel: z.string().min(1),
  toLabel: z.string().min(1),
  departDate: z.string().nullable().default(null),
  returnDate: z.string().nullable().default(null),
  notes: z.string().nullable().default(null),
}).strict();

export const OptionInput = z.object({
  label: z.string().min(1),
  portal: z.string().min(1),
  carrier: z.string().nullable().default(null),
  stops: z.number().int().min(0).nullable().default(null),
  durationMins: z.number().int().min(0).nullable().default(null),
  cabin: z.enum(['economy', 'premium', 'business', 'first']).nullable().default(null),
  viaText: z.string().nullable().default(null),
  cashUsd: z.number().min(0).default(0),
  pointsCurrencyId: z.string().uuid().nullable().default(null),
  pointsAmount: z.number().int().min(0).nullable().default(null),
  cppOverride: z.number().positive().nullable().default(null),
  adjustments: z.array(AdjustmentInput).default([]),
  notes: z.string().nullable().default(null),
}).strict().refine(
  (o) => o.cashUsd > 0 || (o.pointsAmount ?? 0) > 0,
  { message: 'An option must have a cash price or points.' },
);
