# Deal Optimizer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a standalone per-journey deal optimizer: log the booking options you've found, normalize each to one "effective cost to you," rank them, and show the best play — with a fail-open refusal on options it can't value.

**Architecture:** Pure scoring engine (`score.ts`) → data-access layer (`journey-db.ts`, db handle injected) → `'use server'` wrappers (`journey-actions.ts`) → server components → client UI. Mirrors the existing `profile-db.ts`/`profile-actions.ts` layering. The engine emits ranked semantic objects; the UI is a renderer (so the future Balatro skin is additive, not a rewrite).

**Tech Stack:** Next.js 16 (App Router, Turbopack), React 19, Drizzle ORM + Neon Postgres (pglite in tests), Zod, Vitest, Tailwind v4 (inline-style components, per repo).

## Global Constraints

- This is a **modified Next.js** — read `node_modules/next/dist/docs/` before changing App Router / Server Action / caching behavior. Do not rely on training-data Next.js conventions.
- Path alias `@/*` → `src/*` (configured in `tsconfig.json` and `vitest.config.ts`).
- Tests live in `tests/**/*.test.ts`, Vitest, `environment: 'node'`, `testTimeout: 15_000`.
- DB-access modules start with `import 'server-only';`. Action files start with `'use server';`.
- Identity comes from `requireSession()` (`@/lib/session`). Every journey/option/currency mutation is gated on ownership before touching data; no client-passed `userId` is trusted.
- Drizzle type incompatibility between pglite (tests) and neon-http (prod) is handled with `type AnyDb = any;` and an `// eslint-disable-next-line @typescript-eslint/no-explicit-any` comment, exactly as `profile-db.ts` does.
- Money / cents-per-point columns use `doublePrecision` (returns a JS `number`, no string parsing), `pointsAmount` uses `integer`.
- User-facing copy says **"Destified"** (never "Destify").
- Commit after every task. Run `npx tsc --noEmit`, `npm run lint`, and `npm test` green before each commit.
- Branch: `feat/deal-optimizer` (off `main`). If audit PR #24 merges first, rebase onto `main`.

## File Structure

```
src/lib/db/schema.ts            MODIFY  + pointCurrency, journey, option tables
drizzle/0002_*.sql              CREATE  generated migration (drizzle-kit generate)
src/lib/deals/types.ts          CREATE  shared TS types
src/lib/deals/score.ts          CREATE  pure valuation + ranking engine
src/lib/deals/option-schemas.ts CREATE  Zod input schemas
src/lib/deals/journey-db.ts     CREATE  data access (db handle injected)
src/lib/deals/journey-actions.ts CREATE 'use server' wrappers
src/app/profile/form.tsx        MODIFY  replace "Points programs" placeholder w/ currency editor
src/app/profile/currency-editor.tsx CREATE  client currency editor
src/app/compare/page.tsx        CREATE  journeys list + create
src/app/compare/[journeyId]/page.tsx CREATE  board server component (runs engine)
src/app/compare/[journeyId]/compare-board.tsx CREATE  client board (cards + toggle + bank)
src/app/compare/[journeyId]/option-form.tsx   CREATE  add/edit option form
tests/deals/score.test.ts            CREATE
tests/deals/option-schemas.test.ts   CREATE
tests/deals/journey-db.test.ts       CREATE
```

Shared type contract (defined in Task 2, consumed everywhere):

```ts
// src/lib/deals/types.ts
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
```

---

## Task 1: Database schema + migration

**Files:**
- Modify: `src/lib/db/schema.ts` (append three tables; extend the pg-core import)
- Create: `drizzle/0002_*.sql` (generated)
- Test: `tests/deals/journey-db.test.ts` (a minimal migrate+roundtrip; expanded in Task 5)

**Interfaces:**
- Produces: Drizzle tables `pointCurrency`, `journey`, `option` exported from `@/lib/db/schema`.

- [ ] **Step 1: Write the failing test**

Create `tests/deals/journey-db.test.ts`:

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/deals/journey-db.test.ts`
Expected: FAIL — `pointCurrency`/`journey`/`option` are not exported from `@/lib/db/schema` (import error).

- [ ] **Step 3: Extend the schema import and add the tables**

In `src/lib/db/schema.ts`, change the first import line to add `doublePrecision`:

```ts
import { pgTable, uuid, text, boolean, date, timestamp, jsonb, pgEnum, integer, doublePrecision, uniqueIndex, primaryKey } from 'drizzle-orm/pg-core';
```

Append at the end of the file:

```ts
export const pointCurrency = pgTable('point_currency', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  code: text('code').notNull(),
  name: text('name').notNull(),
  defaultCpp: doublePrecision('default_cpp').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  userCodeUnique: uniqueIndex('point_currency_user_code_unique').on(t.userId, t.code),
}));

export const journey = pgTable('journey', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  fromLabel: text('from_label').notNull(),
  toLabel: text('to_label').notNull(),
  departDate: date('depart_date'),
  returnDate: date('return_date'),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const option = pgTable('option', {
  id: uuid('id').primaryKey().defaultRandom(),
  journeyId: uuid('journey_id').notNull().references(() => journey.id, { onDelete: 'cascade' }),
  label: text('label').notNull(),
  portal: text('portal').notNull(),
  carrier: text('carrier'),
  stops: integer('stops'),
  durationMins: integer('duration_mins'),
  cabin: text('cabin'),
  viaText: text('via_text'),
  cashUsd: doublePrecision('cash_usd').notNull().default(0),
  pointsCurrencyId: uuid('points_currency_id').references(() => pointCurrency.id, { onDelete: 'set null' }),
  pointsAmount: integer('points_amount'),
  cppOverride: doublePrecision('cpp_override'),
  adjustments: jsonb('adjustments').$type<{ label: string; deltaUsd: number }[]>().notNull().default([]),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
```

- [ ] **Step 4: Generate the migration**

Run: `npx drizzle-kit generate`
Expected: a new `drizzle/0002_*.sql` appears with `CREATE TABLE "point_currency"`, `"journey"`, `"option"`, and `drizzle/meta/_journal.json` is updated. (Requires `DATABASE_URL` in `.env.local`, already present.)

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run tests/deals/journey-db.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/db/schema.ts drizzle/ tests/deals/journey-db.test.ts
git commit -m "feat(deals): add point_currency, journey, option tables + migration"
```

---

## Task 2: Engine types + effectiveCost

**Files:**
- Create: `src/lib/deals/types.ts`
- Create: `src/lib/deals/score.ts`
- Test: `tests/deals/score.test.ts`

**Interfaces:**
- Consumes: `Option`, `PointCurrency` from `@/lib/deals/types`.
- Produces: `effectiveCost(option, currenciesById: Map<string, PointCurrency>): ScoreResult` where
  `ScoreResult = { ok: true; effectiveUsd: number; breakdown: CostBreakdown } | { ok: false; reason: string }`
  and `CostBreakdown = { cashUsd: number; pointsUsd: number; cppUsed: number | null; adjustmentsUsd: number }`.

- [ ] **Step 1: Create the shared types**

Create `src/lib/deals/types.ts` with the exact contents from the "Shared type contract" block in **File Structure** above.

- [ ] **Step 2: Write the failing test**

Create `tests/deals/score.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { effectiveCost } from '@/lib/deals/score';
import type { Option, PointCurrency } from '@/lib/deals/types';

const AEROPLAN: PointCurrency = { id: 'c1', userId: 'u1', code: 'AEROPLAN', name: 'Aeroplan', defaultCpp: 1.5 };
const currencies = new Map([[AEROPLAN.id, AEROPLAN]]);

function opt(over: Partial<Option>): Option {
  return {
    id: 'o', journeyId: 'j', label: 'x', portal: 'p', carrier: null, stops: null,
    durationMins: null, cabin: null, viaText: null, cashUsd: 0, pointsCurrencyId: null,
    pointsAmount: null, cppOverride: null, adjustments: [], notes: null,
    createdAt: '2026-06-30T00:00:00.000Z', ...over,
  };
}

describe('effectiveCost', () => {
  it('values a pure-cash option as its cash', () => {
    const r = effectiveCost(opt({ cashUsd: 850 }), currencies);
    expect(r).toEqual({ ok: true, effectiveUsd: 850, breakdown: { cashUsd: 850, pointsUsd: 0, cppUsed: null, adjustmentsUsd: 0 } });
  });

  it('values points at the currency default CPP and adds fees + adjustments', () => {
    const r = effectiveCost(opt({
      cashUsd: 80, pointsCurrencyId: 'c1', pointsAmount: 57000,
      adjustments: [{ label: 'lounge', deltaUsd: -40 }],
    }), currencies);
    // 57000 * 1.5 / 100 = 855 ; 80 + 855 - 40 = 895
    expect(r.ok).toBe(true);
    if (r.ok) { expect(r.effectiveUsd).toBe(895); expect(r.breakdown.cppUsed).toBe(1.5); }
  });

  it('prefers a per-redemption cppOverride over the currency default', () => {
    const r = effectiveCost(opt({ pointsCurrencyId: 'c1', pointsAmount: 50000, cppOverride: 2.0 }), currencies);
    expect(r.ok && r.effectiveUsd).toBe(1000); // 50000 * 2.0 / 100
  });

  it('REFUSES to value points with no resolvable CPP (no $0 fail-open)', () => {
    const r = effectiveCost(opt({ pointsCurrencyId: 'missing', pointsAmount: 40000 }), currencies);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/cents-per-point/i);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run tests/deals/score.test.ts`
Expected: FAIL — `effectiveCost` is not exported from `@/lib/deals/score`.

- [ ] **Step 4: Write the minimal implementation**

Create `src/lib/deals/score.ts`:

```ts
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
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run tests/deals/score.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 6: Commit**

```bash
git add src/lib/deals/types.ts src/lib/deals/score.ts tests/deals/score.test.ts
git commit -m "feat(deals): effectiveCost with fail-open refusal on unvaluable points"
```

---

## Task 3: rankJourney + quality rank

**Files:**
- Modify: `src/lib/deals/score.ts` (append `qualityRankFor`, `rankJourney`, and result types)
- Test: `tests/deals/score.test.ts` (append a `describe`)

**Interfaces:**
- Consumes: `effectiveCost` (Task 2).
- Produces:
  - `qualityRankFor(effectiveUsd, bestUsd, worstUsd): string`
  - `rankJourney(options: Option[], currenciesById: Map<string, PointCurrency>): RankedJourney`
  - `RankedOption = { option: Option; effectiveUsd: number; breakdown: CostBreakdown; deltaVsBestUsd: number; qualityRank: string }`
  - `IncompleteOption = { option: Option; reason: string }`
  - `RankedJourney = { ranked: RankedOption[]; incomplete: IncompleteOption[] }`

- [ ] **Step 1: Write the failing test**

Append to `tests/deals/score.test.ts`:

```ts
import { rankJourney, qualityRankFor } from '@/lib/deals/score';

describe('rankJourney', () => {
  it('sorts valuable options ascending, computes delta, and buckets the unvaluable', () => {
    const opts = [
      opt({ id: 'alaska', cashUsd: 1000, createdAt: '2026-06-30T00:00:01.000Z' }),
      opt({ id: 'trip', cashUsd: 850, createdAt: '2026-06-30T00:00:02.000Z' }),
      opt({ id: 'award', pointsCurrencyId: 'c1', pointsAmount: 57000, cashUsd: 80, createdAt: '2026-06-30T00:00:03.000Z' }), // 935
      opt({ id: 'broken', pointsCurrencyId: 'missing', pointsAmount: 40000, createdAt: '2026-06-30T00:00:04.000Z' }),
    ];
    const { ranked, incomplete } = rankJourney(opts, currencies);
    expect(ranked.map((r) => r.option.id)).toEqual(['trip', 'award', 'alaska']); // 850, 935, 1000
    expect(ranked[0].deltaVsBestUsd).toBe(0);
    expect(ranked[2].deltaVsBestUsd).toBe(150);
    expect(ranked[0].qualityRank).toBe('A');     // cheapest
    expect(ranked[2].qualityRank).toBe('2');     // most expensive
    expect(incomplete.map((i) => i.option.id)).toEqual(['broken']);
  });

  it('ranks a single option as A', () => {
    const { ranked } = rankJourney([opt({ cashUsd: 500 })], currencies);
    expect(ranked[0].qualityRank).toBe('A');
  });

  it('breaks ties by createdAt (stable)', () => {
    const a = opt({ id: 'a', cashUsd: 500, createdAt: '2026-06-30T00:00:02.000Z' });
    const b = opt({ id: 'b', cashUsd: 500, createdAt: '2026-06-30T00:00:01.000Z' });
    const { ranked } = rankJourney([a, b], currencies);
    expect(ranked.map((r) => r.option.id)).toEqual(['b', 'a']);
  });
});

describe('qualityRankFor', () => {
  it('maps cheapest to A and most-expensive to 2', () => {
    expect(qualityRankFor(800, 800, 1000)).toBe('A');
    expect(qualityRankFor(1000, 800, 1000)).toBe('2');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/deals/score.test.ts`
Expected: FAIL — `rankJourney`/`qualityRankFor` not exported.

- [ ] **Step 3: Write the implementation**

Append to `src/lib/deals/score.ts`:

```ts
const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

export function qualityRankFor(effectiveUsd: number, bestUsd: number, worstUsd: number): string {
  if (worstUsd <= bestUsd) return 'A';
  const ratio = (worstUsd - effectiveUsd) / (worstUsd - bestUsd); // 1 = cheapest
  const idx = Math.max(0, Math.min(RANKS.length - 1, Math.round(ratio * (RANKS.length - 1))));
  return RANKS[idx];
}

export type RankedOption = {
  option: Option; effectiveUsd: number; breakdown: CostBreakdown; deltaVsBestUsd: number; qualityRank: string;
};
export type IncompleteOption = { option: Option; reason: string };
export type RankedJourney = { ranked: RankedOption[]; incomplete: IncompleteOption[] };

export function rankJourney(options: Option[], currenciesById: Map<string, PointCurrency>): RankedJourney {
  const scored: { option: Option; effectiveUsd: number; breakdown: CostBreakdown }[] = [];
  const incomplete: IncompleteOption[] = [];

  for (const o of options) {
    const r = effectiveCost(o, currenciesById);
    if (r.ok) scored.push({ option: o, effectiveUsd: r.effectiveUsd, breakdown: r.breakdown });
    else incomplete.push({ option: o, reason: r.reason });
  }

  scored.sort((a, b) =>
    a.effectiveUsd - b.effectiveUsd ||
    Date.parse(a.option.createdAt) - Date.parse(b.option.createdAt));

  const bestUsd = scored.length ? scored[0].effectiveUsd : 0;
  const worstUsd = scored.length ? scored[scored.length - 1].effectiveUsd : 0;

  const ranked: RankedOption[] = scored.map((s) => ({
    option: s.option,
    effectiveUsd: s.effectiveUsd,
    breakdown: s.breakdown,
    deltaVsBestUsd: s.effectiveUsd - bestUsd,
    qualityRank: qualityRankFor(s.effectiveUsd, bestUsd, worstUsd),
  }));

  return { ranked, incomplete };
}
```

Add the `Option, PointCurrency` import if not already present at the top of `score.ts` (it is, from Task 2).

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/deals/score.test.ts`
Expected: PASS (all describes).

- [ ] **Step 5: Commit**

```bash
git add src/lib/deals/score.ts tests/deals/score.test.ts
git commit -m "feat(deals): rankJourney with stable sort, delta, quality rank"
```

---

## Task 4: Zod input schemas

**Files:**
- Create: `src/lib/deals/option-schemas.ts`
- Test: `tests/deals/option-schemas.test.ts`

**Interfaces:**
- Produces: `CurrencyInput`, `JourneyInput`, `OptionInput` (Zod schemas) from `@/lib/deals/option-schemas`.

- [ ] **Step 1: Write the failing test**

Create `tests/deals/option-schemas.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { OptionInput, CurrencyInput } from '@/lib/deals/option-schemas';

describe('OptionInput', () => {
  it('accepts a cash option', () => {
    const r = OptionInput.safeParse({ label: 'Trip.com', portal: 'Trip.com', cashUsd: 850 });
    expect(r.success).toBe(true);
  });
  it('accepts a points option with fees', () => {
    const r = OptionInput.safeParse({ label: 'Award', portal: 'aircanada.com', cashUsd: 80, pointsCurrencyId: '11111111-1111-1111-1111-111111111111', pointsAmount: 57000 });
    expect(r.success).toBe(true);
  });
  it('rejects an option with neither cash nor points', () => {
    const r = OptionInput.safeParse({ label: 'Empty', portal: 'x', cashUsd: 0 });
    expect(r.success).toBe(false);
  });
});

describe('CurrencyInput', () => {
  it('requires a positive default CPP', () => {
    expect(CurrencyInput.safeParse({ code: 'AMEX_MR', name: 'Amex MR', defaultCpp: 1.8 }).success).toBe(true);
    expect(CurrencyInput.safeParse({ code: 'X', name: 'X', defaultCpp: 0 }).success).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/deals/option-schemas.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

Create `src/lib/deals/option-schemas.ts`:

```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/deals/option-schemas.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/deals/option-schemas.ts tests/deals/option-schemas.test.ts
git commit -m "feat(deals): zod input schemas for currency/journey/option"
```

---

## Task 5: Data-access layer (`journey-db.ts`)

**Files:**
- Create: `src/lib/deals/journey-db.ts`
- Test: `tests/deals/journey-db.test.ts` (extend the file from Task 1)

**Interfaces:**
- Consumes: tables from `@/lib/db/schema`; `Option`, `Journey`, `PointCurrency` from `@/lib/deals/types`; `CurrencyInput`, `JourneyInput`, `OptionInput` from `@/lib/deals/option-schemas`.
- Produces (all take `(db: AnyDb, ...)`):
  - `listCurrencies(db, userId): Promise<PointCurrency[]>`
  - `upsertCurrency(db, userId, input): Promise<void>`
  - `deleteCurrency(db, userId, currencyId): Promise<void>`
  - `createJourney(db, userId, input): Promise<{ id: string }>`
  - `listJourneys(db, userId): Promise<Journey[]>`
  - `assertJourneyOwned(db, userId, journeyId): Promise<void>`
  - `getJourneyWithOptions(db, userId, journeyId): Promise<{ journey: Journey; options: Option[] }>`
  - `addOption(db, userId, journeyId, input): Promise<{ id: string }>`
  - `updateOption(db, userId, optionId, input): Promise<void>`
  - `deleteOption(db, userId, optionId): Promise<void>`

- [ ] **Step 1: Write the failing tests**

Append to `tests/deals/journey-db.test.ts`:

```ts
import {
  listCurrencies, upsertCurrency, deleteCurrency,
  createJourney, listJourneys, getJourneyWithOptions,
  addOption, assertJourneyOwned,
} from '@/lib/deals/journey-db';

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
    const { journey, options } = await getJourneyWithOptions(db, userId, jId);
    expect(journey.fromLabel).toBe('SEA');
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/deals/journey-db.test.ts`
Expected: FAIL — `journey-db` functions not found.

- [ ] **Step 3: Write the implementation**

Create `src/lib/deals/journey-db.ts`:

```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/deals/journey-db.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/deals/journey-db.ts tests/deals/journey-db.test.ts
git commit -m "feat(deals): journey-db data access with ownership + currency SET NULL"
```

---

## Task 6: Server-action wrappers (`journey-actions.ts`)

**Files:**
- Create: `src/lib/deals/journey-actions.ts`

**Interfaces:**
- Consumes: everything from `journey-db.ts`; `rankJourney` from `score.ts`; `requireSession` from `@/lib/session`; `db` from `@/lib/db/client`.
- Produces (callable from client components): `listCurrenciesAction`, `upsertCurrencyAction`, `deleteCurrencyAction`, `createJourneyAction`, `listJourneysAction`, `getRankedJourneyAction`, `addOptionAction`, `updateOptionAction`, `deleteOptionAction`. `getRankedJourneyAction(journeyId)` returns `{ journey, ranked, incomplete }`.

There is no unit test for this thin wrapper (it imports the prod neon `db`, which the test harness deliberately avoids — same reason `profile-actions.ts` is untested). Gate: `tsc` + `lint`. The logic it wraps is covered by Task 5.

- [ ] **Step 1: Write the implementation**

Create `src/lib/deals/journey-actions.ts`:

```ts
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
```

- [ ] **Step 2: Verify typecheck + lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: both exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/lib/deals/journey-actions.ts
git commit -m "feat(deals): server-action wrappers; getRankedJourneyAction runs the engine"
```

---

## Task 7: Profile currency editor

**Files:**
- Create: `src/app/profile/currency-editor.tsx` (client component)
- Modify: `src/app/profile/form.tsx` (replace the "Points programs" `Coming soon` block with `<CurrencyEditor>`)
- Modify: `src/app/profile/page.tsx` (load currencies server-side, pass to the form) — verify current shape first with Read.

**Interfaces:**
- Consumes: `listCurrenciesAction`, `upsertCurrencyAction`, `deleteCurrencyAction` (Task 6); `toast` from `@/components/destified/toast`.

No UI unit test (consistent with the repo, which has no component tests — see spec §10). Gate: `tsc` + `lint` + `next build` + manual check.

- [ ] **Step 1: Read the current profile files**

Read `src/app/profile/page.tsx` and `src/app/profile/form.tsx` to confirm how `initial` is passed and where the `T2` "Points programs" placeholder renders (the `T2.map(...)` "Advanced / Coming soon" block).

- [ ] **Step 2: Create the currency editor**

Create `src/app/profile/currency-editor.tsx`:

```tsx
"use client";

import { useState, useTransition } from "react";
import { upsertCurrencyAction, deleteCurrencyAction } from "@/lib/deals/journey-actions";
import { toast } from "@/components/destified/toast";
import type { PointCurrency } from "@/lib/deals/types";

export function CurrencyEditor({ initial }: { initial: PointCurrency[] }) {
  const [rows, setRows] = useState<PointCurrency[]>(initial);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [cpp, setCpp] = useState("");
  const [pending, start] = useTransition();

  const add = () => {
    const cppNum = Number(cpp);
    if (!code.trim() || !name.trim() || !(cppNum > 0)) {
      toast("Enter a code, a name, and a positive cents-per-point.");
      return;
    }
    start(async () => {
      try {
        await upsertCurrencyAction({ code: code.trim().toUpperCase(), name: name.trim(), defaultCpp: cppNum });
        toast("Currency saved");
        setRows((r) => {
          const c = code.trim().toUpperCase();
          const next = r.filter((x) => x.code !== c);
          next.push({ id: `tmp-${c}`, userId: "", code: c, name: name.trim(), defaultCpp: cppNum });
          return next.sort((a, b) => a.code.localeCompare(b.code));
        });
        setCode(""); setName(""); setCpp("");
      } catch {
        toast("Couldn't save — please retry");
      }
    });
  };

  const remove = (cur: PointCurrency) => start(async () => {
    try {
      if (!cur.id.startsWith("tmp-")) await deleteCurrencyAction(cur.id);
      setRows((r) => r.filter((x) => x.id !== cur.id));
    } catch {
      toast("Couldn't delete — please retry");
    }
  });

  return (
    <div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
        {rows.map((c) => (
          <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13 }}>
            <strong style={{ minWidth: 110 }}>{c.code}</strong>
            <span style={{ flex: 1, color: "var(--mocha)" }}>{c.name}</span>
            <span style={{ fontFamily: "var(--font-mono)" }}>{c.defaultCpp}¢/pt</span>
            <button type="button" onClick={() => remove(c)} aria-label={`Remove ${c.code}`} style={{ border: "none", background: "none", cursor: "pointer", color: "var(--mocha)" }}>×</button>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="CODE (AMEX_MR)" style={miniInput} />
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" style={miniInput} />
        <input value={cpp} onChange={(e) => setCpp(e.target.value)} inputMode="decimal" placeholder="¢/pt" style={{ ...miniInput, maxWidth: 90 }} />
        <button type="button" onClick={add} disabled={pending} style={addBtn}>Add</button>
      </div>
    </div>
  );
}

const miniInput: React.CSSProperties = { flex: 1, minWidth: 120, background: "rgba(253,251,247,.7)", border: "1.5px solid rgba(148,139,130,.18)", borderRadius: 10, padding: "9px 12px", fontSize: 13, boxSizing: "border-box" };
const addBtn: React.CSSProperties = { padding: "9px 18px", borderRadius: 999, border: "none", background: "var(--charcoal)", color: "var(--cream)", fontSize: 13, cursor: "pointer" };
```

- [ ] **Step 3: Wire it into the profile**

In `src/app/profile/page.tsx`, load currencies and pass them to `ProfileForm` (follow the existing `getProfileAction()` pattern; add `listCurrenciesAction()`).

In `src/app/profile/form.tsx`: import `CurrencyEditor` and `PointCurrency`, add `currencies: PointCurrency[]` to the `ProfileForm` props, and replace the `Points programs` entry in the `T2` placeholder loop with a real `<Section title="Points programs"><CurrencyEditor initial={currencies} /></Section>` (remove `Points programs` from `T2` so it is no longer rendered as "Coming soon").

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit && npm run lint && npm test`
Expected: all green. Then `npm run dev`, open `/profile`, add a currency (e.g. `AMEX_MR`, `1.8`), confirm it persists on reload.

- [ ] **Step 5: Commit**

```bash
git add src/app/profile/currency-editor.tsx src/app/profile/form.tsx src/app/profile/page.tsx
git commit -m "feat(deals): point-currency editor in profile (fills Points programs)"
```

---

## Task 8: Compare list + create journey

**Files:**
- Create: `src/app/compare/page.tsx` (server component)
- Create: `src/app/compare/new-journey.tsx` (client form; or inline a small client island)

**Interfaces:**
- Consumes: `listJourneysAction`, `createJourneyAction`; the auth guard pattern from `src/app/organizer/page.tsx` (read it first).

Gate: `tsc` + `lint` + `next build` + manual.

- [ ] **Step 1: Read the auth-guard pattern**

Read `src/app/organizer/page.tsx` to copy how it guards on `getSessionUserId()`/redirect and renders.

- [ ] **Step 2: Build the list + create page**

Create `src/app/compare/page.tsx` (server component): guard the session (redirect to `/login` if none, mirroring organizer), `const journeys = await listJourneysAction();`, render a heading "Compare", the `<NewJourney/>` client form, and a list of journeys linking to `/compare/[id]` (`<Link href={\`/compare/${j.id}\`}>{j.fromLabel} → {j.toLabel}</Link>`).

Create `src/app/compare/new-journey.tsx` (`"use client"`): inputs for `fromLabel`, `toLabel`, optional dates; on submit `const { id } = await createJourneyAction({...}); router.push(\`/compare/${id}\`)` using `useRouter` from `next/navigation`.

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit && npm run lint && npm test` → green. `npm run dev`, sign in (demo), open `/compare`, create a journey, confirm redirect to its board (will 404/empty until Task 9 — acceptable here; verify the row appears in the list).

- [ ] **Step 4: Commit**

```bash
git add src/app/compare/page.tsx src/app/compare/new-journey.tsx
git commit -m "feat(deals): /compare journeys list + create"
```

---

## Task 9: Journey board (ranked cards + list toggle + bank)

**Files:**
- Create: `src/app/compare/[journeyId]/page.tsx` (server component — runs the engine)
- Create: `src/app/compare/[journeyId]/compare-board.tsx` (client — hand view, list toggle, bank rail, incomplete bucket)

**Interfaces:**
- Consumes: `getRankedJourneyAction` (Task 6), `listCurrenciesAction`. Props to `CompareBoard`: `{ journey: Journey; ranked: RankedOption[]; incomplete: IncompleteOption[]; currencies: PointCurrency[] }`.

Visual reference: the approved mockups persist in `.superpowers/brainstorm/*/content/board.html` and `cards-portals.html` — match suit=portal chip, rank corner, legible effective-$, slashed-back breakdown, award shimmer, hover-lift, and the `▦ Hand / ≣ List` toggle. Gate: `tsc` + `lint` + `next build` + manual.

- [ ] **Step 1: Build the server page**

Create `src/app/compare/[journeyId]/page.tsx`: guard session; `const data = await getRankedJourneyAction(params.journeyId);` (in Next 16, `params` is awaited — confirm against `node_modules/next/dist/docs/`); `const currencies = await listCurrenciesAction();` render `<CompareBoard journey={data.journey} ranked={data.ranked} incomplete={data.incomplete} currencies={currencies} />`.

- [ ] **Step 2: Build the client board**

Create `src/app/compare/[journeyId]/compare-board.tsx` (`"use client"`) rendering, from the props:
- a header `journey.fromLabel → journey.toLabel`;
- the **hand view** (default): a row of cards, one per `ranked[]` entry — corner `qualityRank`, a portal chip (`option.portal`), `label`, route (`viaText`/`stops`), the **effective-$** as the hero number (`Math.round(effectiveUsd)`), a breakdown line from `breakdown` (`cashUsd`, `pointsUsd` with `cppUsed`, `adjustmentsUsd`), an award shimmer when `breakdown.pointsUsd > 0`, and the cheapest (`ranked[0]`) outlined as best;
- a **list toggle** (`useState<'hand'|'list'>('hand')`) swapping the card row for a compact list of the same data;
- the **bank rail** listing `currencies` (`code`, `name`, `defaultCpp`);
- an **incomplete bucket** rendering each `incomplete[].reason` with a link to `/profile` to set a CPP.

Reuse the inline-style approach and tokens from the mockups. Keep the component focused on rendering props; mutations (add/edit/delete option) come from Task 10.

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit && npm run lint && npm test` → green; `npm run build` → success. `npm run dev`: create a couple options by direct DB insert or wait for Task 10; confirm the board renders ranked cards and the toggle switches views.

- [ ] **Step 4: Commit**

```bash
git add src/app/compare/[journeyId]/page.tsx src/app/compare/[journeyId]/compare-board.tsx
git commit -m "feat(deals): journey board with ranked hand view, list toggle, bank"
```

---

## Task 10: Option form (add / edit / delete) + incomplete fixes

**Files:**
- Create: `src/app/compare/[journeyId]/option-form.tsx` (client)
- Modify: `src/app/compare/[journeyId]/compare-board.tsx` (mount the form; add edit/delete affordances)

**Interfaces:**
- Consumes: `addOptionAction`, `updateOptionAction`, `deleteOptionAction` (Task 6); `currencies` (for the points-currency dropdown). On success, `router.refresh()` to re-run the server page and re-rank.

Gate: `tsc` + `lint` + `next build` + manual.

- [ ] **Step 1: Build the option form**

Create `src/app/compare/[journeyId]/option-form.tsx` (`"use client"`): fields for `label`, `portal`, optional `carrier`/`stops`/`durationMins`/`cabin`/`viaText`, `cashUsd`, a points group (`pointsCurrencyId` `<select>` from `currencies`, `pointsAmount`, `cppOverride`), and a small adjustments editor (label + deltaUsd rows → `adjustments[]`). On submit, build the `OptionInput` shape and call `addOptionAction(journeyId, input)` (or `updateOptionAction` when editing). Validate client-side that at least one of `cashUsd > 0` or `pointsAmount > 0` (mirror the Zod `refine`) and toast on failure. After success: `router.refresh()`.

- [ ] **Step 2: Wire into the board**

In `compare-board.tsx`: add an "+ add option" affordance opening `<OptionForm journeyId=... currencies=... />`; add per-card edit (prefill the form) and delete (`deleteOptionAction(option.id)` then `router.refresh()`).

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit && npm run lint && npm test` → green; `npm run build` → success. `npm run dev`, full manual pass: add the three SEA→Tokyo options from the spec (Alaska $1000; Trip.com $850; Aeroplan `aircanada.com` $80 + 57k Aeroplan − $40 lounge), confirm ranking = Trip.com < Aeroplan < Alaska, the award card shimmers, and an option with points but no currency CPP lands in the incomplete bucket.

- [ ] **Step 4: Commit**

```bash
git add src/app/compare/[journeyId]/option-form.tsx src/app/compare/[journeyId]/compare-board.tsx
git commit -m "feat(deals): add/edit/delete option form; re-rank on change"
```

---

## Final verification

- [ ] `npx tsc --noEmit` → 0
- [ ] `npm run lint` → 0 errors
- [ ] `npm test` → all green (score, option-schemas, journey-db suites added; existing suites unaffected)
- [ ] `npm run build` → success
- [ ] Manual: create a journey, add the three worked options, see correct ranking + the incomplete bucket behavior.
