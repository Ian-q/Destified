import { describe, it, expect } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { eq } from 'drizzle-orm';
import { users } from '@/lib/db/schema';
import { pointCurrency, journey, option } from '@/lib/db/schema';

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
