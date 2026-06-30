'use server';

import type { z } from 'zod';
import { db } from '@/lib/db/client';
import { requireSession } from '@/lib/session';
import { rankJourney, type RankedJourney } from '@/lib/deals/score';
import type { Journey, PointCurrency } from '@/lib/deals/types';
import type { CurrencyInput, JourneyInput, OptionInput } from '@/lib/deals/option-schemas';
import {
  listCurrencies, upsertCurrency, deleteCurrency,
  createJourney, listJourneys, getJourneyWithOptions,
  addOption, updateOption, deleteOption,
} from '@/lib/deals/journey-db';

export async function listCurrenciesAction(): Promise<PointCurrency[]> {
  return listCurrencies(db, await requireSession());
}
export async function upsertCurrencyAction(input: z.input<typeof CurrencyInput>): Promise<void> {
  await upsertCurrency(db, await requireSession(), input);
}
export async function deleteCurrencyAction(currencyId: string): Promise<void> {
  await deleteCurrency(db, await requireSession(), currencyId);
}

export async function createJourneyAction(input: z.input<typeof JourneyInput>): Promise<{ id: string }> {
  return createJourney(db, await requireSession(), input);
}
export async function listJourneysAction(): Promise<Journey[]> {
  return listJourneys(db, await requireSession());
}

export async function getRankedJourneyAction(journeyId: string): Promise<{ journey: Journey } & RankedJourney> {
  const userId = await requireSession();
  const { journey, options } = await getJourneyWithOptions(db, userId, journeyId);
  const currencies = await listCurrencies(db, userId);
  const byId = new Map(currencies.map((c) => [c.id, c]));
  const { ranked, incomplete } = rankJourney(options, byId);
  return { journey, ranked, incomplete };
}

export async function addOptionAction(journeyId: string, input: z.input<typeof OptionInput>): Promise<{ id: string }> {
  return addOption(db, await requireSession(), journeyId, input);
}
export async function updateOptionAction(optionId: string, input: z.input<typeof OptionInput>): Promise<void> {
  await updateOption(db, await requireSession(), optionId, input);
}
export async function deleteOptionAction(optionId: string): Promise<void> {
  await deleteOption(db, await requireSession(), optionId);
}
