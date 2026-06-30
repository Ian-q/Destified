import 'server-only';

import { eq, and, desc } from 'drizzle-orm';
import { z } from 'zod';
import { pointCurrency, journey, option } from '@/lib/db/schema';
import { CurrencyInput, JourneyInput, OptionInput } from '@/lib/deals/option-schemas';
import type { PointCurrency, Journey, Option, Adjustment } from '@/lib/deals/types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDb = any;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapOption(r: any): Option {
  return {
    id: r.id, journeyId: r.journeyId, label: r.label, portal: r.portal,
    carrier: r.carrier ?? null, stops: r.stops ?? null, durationMins: r.durationMins ?? null,
    cabin: r.cabin ?? null, viaText: r.viaText ?? null,
    cashUsd: r.cashUsd, pointsCurrencyId: r.pointsCurrencyId ?? null,
    pointsAmount: r.pointsAmount ?? null, cppOverride: r.cppOverride ?? null,
    adjustments: (Array.isArray(r.adjustments) ? r.adjustments : []) as Adjustment[],
    notes: r.notes ?? null,
    createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : String(r.createdAt),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapJourney(r: any): Journey {
  return {
    id: r.id, userId: r.userId, fromLabel: r.fromLabel, toLabel: r.toLabel,
    departDate: r.departDate ?? null, returnDate: r.returnDate ?? null, notes: r.notes ?? null,
    createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : String(r.createdAt),
  };
}

export async function listCurrencies(db: AnyDb, userId: string): Promise<PointCurrency[]> {
  const rows = await db.select().from(pointCurrency).where(eq(pointCurrency.userId, userId)).orderBy(pointCurrency.code);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return rows.map((r: any) => ({ id: r.id, userId: r.userId, code: r.code, name: r.name, defaultCpp: r.defaultCpp }));
}

export async function upsertCurrency(db: AnyDb, userId: string, input: z.input<typeof CurrencyInput>): Promise<void> {
  const parsed = CurrencyInput.parse(input);
  await db.insert(pointCurrency).values({ userId, ...parsed }).onConflictDoUpdate({
    target: [pointCurrency.userId, pointCurrency.code],
    set: { name: parsed.name, defaultCpp: parsed.defaultCpp },
  });
}

export async function deleteCurrency(db: AnyDb, userId: string, currencyId: string): Promise<void> {
  await db.delete(pointCurrency).where(and(eq(pointCurrency.id, currencyId), eq(pointCurrency.userId, userId)));
}

export async function createJourney(db: AnyDb, userId: string, input: z.input<typeof JourneyInput>): Promise<{ id: string }> {
  const parsed = JourneyInput.parse(input);
  const [row] = await db.insert(journey).values({ userId, ...parsed }).returning({ id: journey.id });
  return { id: row.id };
}

export async function listJourneys(db: AnyDb, userId: string): Promise<Journey[]> {
  const rows = await db.select().from(journey).where(eq(journey.userId, userId)).orderBy(desc(journey.createdAt));
  return rows.map(mapJourney);
}

export async function assertJourneyOwned(db: AnyDb, userId: string, journeyId: string): Promise<void> {
  const rows = await db.select({ id: journey.id }).from(journey).where(and(eq(journey.id, journeyId), eq(journey.userId, userId)));
  if (rows.length === 0) throw new Error('Forbidden');
}

export async function getJourneyWithOptions(db: AnyDb, userId: string, journeyId: string): Promise<{ journey: Journey; options: Option[] }> {
  await assertJourneyOwned(db, userId, journeyId);
  const [jRow] = await db.select().from(journey).where(eq(journey.id, journeyId));
  const oRows = await db.select().from(option).where(eq(option.journeyId, journeyId)).orderBy(option.createdAt);
  return { journey: mapJourney(jRow), options: oRows.map(mapOption) };
}

export async function addOption(db: AnyDb, userId: string, journeyId: string, input: z.input<typeof OptionInput>): Promise<{ id: string }> {
  await assertJourneyOwned(db, userId, journeyId);
  const parsed = OptionInput.parse(input);
  const [row] = await db.insert(option).values({ journeyId, ...parsed }).returning({ id: option.id });
  return { id: row.id };
}

async function assertOptionOwned(db: AnyDb, userId: string, optionId: string): Promise<string> {
  const rows = await db
    .select({ journeyId: option.journeyId, userId: journey.userId })
    .from(option).innerJoin(journey, eq(option.journeyId, journey.id))
    .where(eq(option.id, optionId));
  if (rows.length === 0 || rows[0].userId !== userId) throw new Error('Forbidden');
  return rows[0].journeyId;
}

export async function updateOption(db: AnyDb, userId: string, optionId: string, input: z.input<typeof OptionInput>): Promise<void> {
  await assertOptionOwned(db, userId, optionId);
  const parsed = OptionInput.parse(input);
  await db.update(option).set(parsed).where(eq(option.id, optionId));
}

export async function deleteOption(db: AnyDb, userId: string, optionId: string): Promise<void> {
  await assertOptionOwned(db, userId, optionId);
  await db.delete(option).where(eq(option.id, optionId));
}
