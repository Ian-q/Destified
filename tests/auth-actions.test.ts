import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { eq } from 'drizzle-orm';

vi.mock('server-only', () => ({}));

const cookieStore = new Map<string, string>();
vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (n: string) => cookieStore.has(n) ? { name: n, value: cookieStore.get(n)! } : undefined,
    set: (n: string, v: string) => { cookieStore.set(n, v); },
    delete: (n: string) => { cookieStore.delete(n); },
  }),
}));

import { signInDemo } from '@/lib/auth-actions';
import { users, trip, leg, tripContext } from '@/lib/db/schema';

async function makeDb() {
  const pg = new PGlite();
  const db = drizzle(pg);
  await migrate(db, { migrationsFolder: './drizzle' });
  return db;
}

describe('signInDemo', () => {
  beforeEach(() => cookieStore.clear());

  it('first call seeds user + trip + 3 legs + trip_context, sets cookie', async () => {
    const db = await makeDb();
    const { userId, tripId } = await signInDemo(db);

    expect(userId).toMatch(/^[0-9a-f-]{36}$/i);
    expect(cookieStore.get('destified-session')).toBe(userId);

    const u = await db.select().from(users).where(eq(users.id, userId));
    expect(u).toHaveLength(1);

    const t = await db.select().from(trip).where(eq(trip.id, tripId));
    expect(t).toHaveLength(1);
    expect(t[0].userId).toBe(userId);

    const legs = await db.select().from(leg).where(eq(leg.tripId, tripId));
    expect(legs).toHaveLength(3);
    expect(legs.map((l) => l.seq).sort()).toEqual([0, 1, 2]);
    expect(legs.find((l) => l.seq === 0)).toMatchObject({ fromCountry: 'US', toCountry: 'JP' });

    const ctx = await db.select().from(tripContext).where(eq(tripContext.tripId, tripId));
    expect(ctx).toHaveLength(1);
    expect(ctx[0]).toMatchObject({
      travelingWithMinors: false,
      drivingAtDestination: false,
      carryingControlledMeds: false,
    });
  });

  it('second call with existing cookie reuses the same user/trip', async () => {
    const db = await makeDb();
    const a = await signInDemo(db);
    const b = await signInDemo(db);
    expect(b.userId).toBe(a.userId);
    expect(b.tripId).toBe(a.tripId);
  });

  it('cookie pointing to deleted user creates a fresh one', async () => {
    const db = await makeDb();
    const a = await signInDemo(db);
    await db.delete(users).where(eq(users.id, a.userId));
    const b = await signInDemo(db);
    expect(b.userId).not.toBe(a.userId);
  });
});
