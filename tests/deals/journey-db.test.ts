import { describe, it, expect, vi } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { eq } from 'drizzle-orm';

vi.mock('server-only', () => ({}));

import { users } from '@/lib/db/schema';
import { pointCurrency, journey, option } from '@/lib/db/schema';
import {
  listCurrencies, upsertCurrency, deleteCurrency,
  createJourney, listJourneys, getJourneyWithOptions,
  addOption, assertJourneyOwned, updateOption, deleteOption,
} from '@/lib/deals/journey-db';

async function makeDb() {
  const pg = new PGlite();
  const db = drizzle(pg);
  await migrate(db, { migrationsFolder: './drizzle' });
  return db;
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function makeUser(db: any) {
  const [u] = await db.insert(users).values({ email: `u-${Math.random()}@destified.local` }).returning({ id: users.id });
  return u.id as string;
}

describe('deal optimizer schema', () => {
  it('migrates and round-trips a currency, journey, and option', async () => {
    const db = await makeDb();
    const userId = await makeUser(db);

    const [cur] = await db.insert(pointCurrency)
      .values({ userId, code: 'AEROPLAN', name: 'Aeroplan', defaultCpp: 1.5 })
      .returning({ id: pointCurrency.id });

    const [j] = await db.insert(journey)
      .values({ userId, fromLabel: 'Seattle (SEA)', toLabel: 'Tokyo' })
      .returning({ id: journey.id });

    const [o] = await db.insert(option).values({
      journeyId: j.id, label: 'Aeroplan · Business', portal: 'aircanada.com',
      cashUsd: 80, pointsCurrencyId: cur.id, pointsAmount: 57000,
      adjustments: [{ label: 'lounge', deltaUsd: -40 }],
    }).returning({ id: option.id });

    const rows = await db.select().from(option).where(eq(option.id, o.id));
    expect(rows).toHaveLength(1);
    expect(rows[0].cashUsd).toBe(80);
    expect(rows[0].pointsAmount).toBe(57000);
    expect(rows[0].adjustments).toEqual([{ label: 'lounge', deltaUsd: -40 }]);
  });
});

describe('journey-db', () => {
  it('upserts and lists per-user currencies', async () => {
    const db = await makeDb();
    const userId = await makeUser(db);
    await upsertCurrency(db, userId, { code: 'AMEX_MR', name: 'Amex MR', defaultCpp: 1.8 });
    await upsertCurrency(db, userId, { code: 'AMEX_MR', name: 'Amex MR', defaultCpp: 2.0 }); // update
    const list = await listCurrencies(db, userId);
    expect(list).toHaveLength(1);
    expect(list[0].defaultCpp).toBe(2.0);
  });

  it('creates a journey + options and reads them back typed', async () => {
    const db = await makeDb();
    const userId = await makeUser(db);
    const { id: jId } = await createJourney(db, userId, { fromLabel: 'SEA', toLabel: 'Tokyo' });
    await addOption(db, userId, jId, { label: 'Trip.com', portal: 'Trip.com', cashUsd: 850 });
    const { journey: j, options } = await getJourneyWithOptions(db, userId, jId);
    expect(j.fromLabel).toBe('SEA');
    expect(options).toHaveLength(1);
    expect(options[0].cashUsd).toBe(850);
    expect(options[0].adjustments).toEqual([]);
  });

  it('refuses cross-user access (ownership)', async () => {
    const db = await makeDb();
    const a = await makeUser(db); const b = await makeUser(db);
    const { id: jId } = await createJourney(db, a, { fromLabel: 'SEA', toLabel: 'Tokyo' });
    await expect(assertJourneyOwned(db, b, jId)).rejects.toThrow('Forbidden');
  });

  it('listJourneys returns all journeys for a user', async () => {
    const db = await makeDb();
    const userId = await makeUser(db);
    await createJourney(db, userId, { fromLabel: 'SEA', toLabel: 'Tokyo' });
    await createJourney(db, userId, { fromLabel: 'NYC', toLabel: 'London' });
    const list = await listJourneys(db, userId);
    expect(list).toHaveLength(2);
  });

  it('refuses cross-user option mutation (updateOption + deleteOption)', async () => {
    const db = await makeDb();
    const a = await makeUser(db);
    const b = await makeUser(db);
    const { id: jId } = await createJourney(db, a, { fromLabel: 'SEA', toLabel: 'Tokyo' });
    const { id: optId } = await addOption(db, a, jId, { label: 'Award', portal: 'p', cashUsd: 850 });
    await expect(updateOption(db, b, optId, { label: 'x', portal: 'y', cashUsd: 1 })).rejects.toThrow('Forbidden');
    await expect(deleteOption(db, b, optId)).rejects.toThrow('Forbidden');
  });

  it('deleting a currency leaves referencing options orphaned (SET NULL), not deleted', async () => {
    const db = await makeDb();
    const userId = await makeUser(db);
    await upsertCurrency(db, userId, { code: 'AEROPLAN', name: 'Aeroplan', defaultCpp: 1.5 });
    const [cur] = await listCurrencies(db, userId);
    const { id: jId } = await createJourney(db, userId, { fromLabel: 'SEA', toLabel: 'Tokyo' });
    await addOption(db, userId, jId, { label: 'Award', portal: 'aircanada.com', cashUsd: 80, pointsCurrencyId: cur.id, pointsAmount: 57000 });
    await deleteCurrency(db, userId, cur.id);
    const { options } = await getJourneyWithOptions(db, userId, jId);
    expect(options).toHaveLength(1);
    expect(options[0].pointsCurrencyId).toBeNull();
    expect(options[0].pointsAmount).toBe(57000);
  });
});
