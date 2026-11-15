import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';

vi.mock('server-only', () => ({}));
vi.mock('@/lib/conditions/ai', () => ({ fetchRowViaAI: vi.fn().mockResolvedValue(null) }));
// Avoid initializing the prod neon client at module load (no DATABASE_URL in tests).
// The test passes its own pglite handle to resolveFlow(db, flowId).
vi.mock('@/lib/db/client', () => ({ db: null }));

const cookieStore = new Map<string, string>();
vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (n: string) => cookieStore.has(n) ? { name: n, value: cookieStore.get(n)! } : undefined,
    set: (n: string, v: string) => { cookieStore.set(n, v); },
    delete: (n: string) => { cookieStore.delete(n); },
  }),
}));

import { signInDemo } from '@/lib/auth-actions';
import { saveProfile } from '@/lib/profile-db';
import { resolveFlow } from '@/lib/conditions/actions';
import { loadSeedRows } from '@/lib/conditions/seed';

async function makeDb() {
  const pg = new PGlite();
  const db = drizzle(pg);
  await migrate(db, { migrationsFolder: './drizzle' });
  await loadSeedRows(db);
  return db;
}

describe('profile-driven resolution', () => {
  beforeEach(() => cookieStore.clear());

  it('US citizenship auto-resolves n-visa via seeded US:JP row', async () => {
    const db = await makeDb();
    const { userId } = await signInDemo(db);
    await saveProfile(db, userId, {
      citizenships: [{ country: 'US', passportExpiry: '2029-08-15' }],
      residence: { country: 'US', visaStatus: null },
      idpConvention: null, idpExpiry: null,
      controlledMeds: [], hasMinors: false,
    });

    const { output } = await resolveFlow(db, 'preflight-jp');
    expect(output.choices['n-visa']?.choiceId).toBe('no');
  });

  it("KE citizenship resolves n-visa to 'verify', not exempt (no seed row, AI mock returns null)", async () => {
    const db = await makeDb();
    const { userId } = await signInDemo(db);
    await saveProfile(db, userId, {
      citizenships: [{ country: 'KE', passportExpiry: null }],
      residence: { country: 'KE', visaStatus: null },
      idpConvention: null, idpExpiry: null,
      controlledMeds: [], hasMinors: false,
    });

    const { output } = await resolveFlow(db, 'preflight-jp');
    expect(output.choices['n-visa']?.choiceId).toBe('yes');
    expect(output.choices['n-visa']?.ruleId).toBe('jp.preflight.visa.unverified');
  });

  it("flipping citizenship from US to KE flips n-visa from exempt to 'verify'", async () => {
    const db = await makeDb();
    const { userId } = await signInDemo(db);

    await saveProfile(db, userId, {
      citizenships: [{ country: 'US', passportExpiry: '2029-08-15' }],
      residence: { country: 'US', visaStatus: null },
      idpConvention: null, idpExpiry: null,
      controlledMeds: [], hasMinors: false,
    });
    expect((await resolveFlow(db, 'preflight-jp')).output.choices['n-visa']?.choiceId).toBe('no');

    await saveProfile(db, userId, {
      citizenships: [{ country: 'KE', passportExpiry: null }],
      residence: { country: 'KE', visaStatus: null },
      idpConvention: null, idpExpiry: null,
      controlledMeds: [], hasMinors: false,
    });
    const flipped = (await resolveFlow(db, 'preflight-jp')).output.choices['n-visa'];
    expect(flipped?.choiceId).toBe('yes');
    expect(flipped?.ruleId).toBe('jp.preflight.visa.unverified');
  });

  it('emits n-pass info with the primary citizenship and pass state', async () => {
    const db = await makeDb();
    const { userId } = await signInDemo(db);
    await saveProfile(db, userId, {
      citizenships: [{ country: 'US', passportExpiry: '2029-08-15' }],
      residence: { country: 'US', visaStatus: null },
      idpConvention: null, idpExpiry: null,
      controlledMeds: [], hasMinors: false,
    });

    const { output } = await resolveFlow(db, 'preflight-jp');
    expect(output.info['n-pass']).toBeDefined();
    expect(output.info['n-pass'].state).toBe('pass');
    expect(output.info['n-pass'].title).toMatch(/^US Passport · valid /);
  });

  it('emits a no-expiry warn when primary citizenship lacks passportExpiry (KE)', async () => {
    const db = await makeDb();
    const { userId } = await signInDemo(db);
    await saveProfile(db, userId, {
      citizenships: [{ country: 'KE', passportExpiry: null }],
      residence: { country: 'KE', visaStatus: null },
      idpConvention: null, idpExpiry: null,
      controlledMeds: [], hasMinors: false,
    });

    const { output } = await resolveFlow(db, 'preflight-jp');
    expect(output.info['n-pass']).toBeDefined();
    expect(output.info['n-pass'].state).toBe('warn');
    expect(output.info['n-pass'].ruleId).toBe('jp.preflight.pass.no-expiry');
    expect(output.info['n-pass'].title).toBe('KE Passport · expiry unknown');
  });

  it('emits a missing-citizenship warn when profile has zero citizenships', async () => {
    const db = await makeDb();
    const { userId } = await signInDemo(db);
    await saveProfile(db, userId, {
      citizenships: [],
      residence: null,
      idpConvention: null, idpExpiry: null,
      controlledMeds: [], hasMinors: false,
    });

    const { output } = await resolveFlow(db, 'preflight-jp');
    expect(output.info['n-pass']).toBeDefined();
    expect(output.info['n-pass'].state).toBe('warn');
    expect(output.info['n-pass'].ruleId).toBe('jp.preflight.pass.missing');
  });
});
