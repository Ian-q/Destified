'use server';

import { eq, desc } from 'drizzle-orm';
import { users, trip, leg, tripContext } from '@/lib/db/schema';
import { getSessionUserId, setSessionCookie, clearSessionCookie } from '@/lib/session';

// Use `any` here because drizzle-orm/pglite (tests) and drizzle-orm/neon-http (prod)
// have structurally incompatible Database<TSchema> types. Same pattern as readiness.ts.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDb = any;

const SHORTID_ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789';
function shortId(len = 8) {
  let out = '';
  for (let i = 0; i < len; i++) out += SHORTID_ALPHABET[Math.floor(Math.random() * SHORTID_ALPHABET.length)];
  return out;
}

const DEMO_TRIP_DEFAULTS = {
  name: 'Japan demo',
  startDate: '2026-06-01',
  endDate: '2026-06-14',
  legs: [
    { seq: 0, fromCountry: 'US', toCountry: 'JP', startDate: '2026-06-01', endDate: '2026-06-02' },
    { seq: 1, fromCountry: 'JP', toCountry: 'JP', startDate: '2026-06-02', endDate: '2026-06-12' },
    { seq: 2, fromCountry: 'JP', toCountry: 'US', startDate: '2026-06-12', endDate: '2026-06-14' },
  ],
};

export async function signInDemo(db: AnyDb): Promise<{ userId: string; tripId: string }> {
  const existing = await getSessionUserId();
  if (existing) {
    const u = await db.select().from(users).where(eq(users.id, existing));
    if (u.length > 0) {
      const t = await db.select().from(trip).where(eq(trip.userId, existing))
        .orderBy(desc(trip.createdAt)).limit(1);
      if (t.length > 0) return { userId: existing, tripId: t[0].id };
    }
  }

  const email = `demo-${shortId()}@destified.local`;
  const [u] = await db.insert(users).values({ email }).returning({ id: users.id });
  const userId = u.id;

  const [t] = await db.insert(trip).values({
    userId,
    name: DEMO_TRIP_DEFAULTS.name,
    startDate: DEMO_TRIP_DEFAULTS.startDate,
    endDate: DEMO_TRIP_DEFAULTS.endDate,
  }).returning({ id: trip.id });
  const tripId = t.id;

  await db.insert(leg).values(DEMO_TRIP_DEFAULTS.legs.map((l) => ({ ...l, tripId })));
  await db.insert(tripContext).values({ tripId });

  await setSessionCookie(userId);
  return { userId, tripId };
}

export async function signInDemoAction(): Promise<{ userId: string; tripId: string }> {
  // Lazy-import default db only when needed (avoids DATABASE_URL crash in tests)
  const { db } = await import('@/lib/db/client');
  return signInDemo(db);
}

export async function signOutAction(): Promise<void> {
  await clearSessionCookie();
}
