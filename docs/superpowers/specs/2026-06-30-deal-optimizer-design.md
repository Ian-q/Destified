# Deal Optimizer — v1 Design Spec

- **Date:** 2026-06-30
- **Status:** Approved design, ready for implementation planning
- **Branch:** `feat/deal-optimizer`
- **Related:** part of the broader "travel-deals game" direction for Destified; standalone from the trip organizer for now.

---

## 1. Summary & purpose

The Deal Optimizer is a standalone surface where a traveler logs the booking
**options they've already hunted down** for a journey, and the tool normalizes
them to a single **"effective cost to you"** and shows the **best play**.

It does **not** search for flights/hotels (that war is unwinnable vs.
Google/Kayak). It is the **decision/organization layer on top of options the
user supplies** — replacing the spreadsheet a travel-deals power user already
keeps. The long-term vision gamifies this as a Balatro-style card game (see
§12); v1 builds the honest, trustworthy engine underneath that vision.

## 2. Audience & the job

- **Audience:** travel-deals power users — people who play the points/miles
  game (transfer bonuses, award sweet-spots, positioning layovers, portal
  arbitrage). Initially the builder and people like them. *Not* normal cash-only
  travelers.
- **The job:** "I want SEA → Tokyo on roughly these dates. Here are the options
  I found (cash on three portals, plus an Aeroplan business award via an Amex
  transfer bonus). Given my point valuations, what's my best play?"

## 3. Scope

### In scope (v1)

1. **Per-journey ranking** — a *journey* (from/to, rough dates) holds N
   *options*; the tool ranks options within one journey.
2. **Effective-$ scoring** — every option collapses to one comparable dollar
   figure: cash + (points × your cents-per-point) + manual soft ± adjustments.
   Per-currency default CPP, overridable per redemption.
3. **Fast structured manual capture** — a tight form to enter an option.
4. **Standalone Compare surface** — on the existing Neon/Drizzle/auth
   foundation; point currencies live in the user's profile.
5. **Hand-view card UI + list toggle** — the ranked options render as a row of
   cards (suit = booking portal, rank = deal quality, effective-$ legible), with
   a toggle to a compact list. Plus a "bank" panel of the user's currencies.

### Out of scope (v1) — see §12 for the vision

- Transfer-graph automation / "jokers" (auto-computing source→destination points
  and live transfer bonuses). v1 captures the *outcome* the user already worked
  out.
- AI paste-to-parse capture.
- Collection-level poker "hands" (flush/straight/etc.) and the public
  leaderboard.
- Archetype tagging and personal "style decks."
- The full illustrated brand-deck art pass (logos-as-suits, court-card art).
- Whole-trip / multi-leg bundle optimization.
- Integration into the trip organizer (journeys stay standalone).
- Blinds (target thresholds) are a **near-future** UI nicety, not v1-blocking.

## 4. Architecture overview

Follows the codebase's existing layering (verified clean in the 2026-06-27
audit): pure logic → data access → thin `'use server'` wrappers → server
components → client components, with Zod at every trust boundary and the prod DB
lazy-imported so tests run on pglite.

**Guiding principle — engine emits semantic objects, UI is a renderer.** The
scoring engine returns ranked options + breakdowns (and, later, quality ranks,
archetypes, hands). The UI is purely a renderer over those objects, so the
future Balatro skin is a new renderer, **not** a rewrite.

New modules:

```
src/lib/deals/
  score.ts            # pure valuation + ranking engine (no DB, no React)
  journey-db.ts       # data access, takes a db handle (pglite in tests)
  journey-actions.ts  # 'use server' wrappers: identity + ownership, then delegate
  option-schemas.ts   # Zod schemas for journey / option / currency inputs
  types.ts            # shared TS types

src/app/compare/
  page.tsx                 # list of journeys + create
  [journeyId]/page.tsx     # the journey board (server component → runs engine)
  [journeyId]/*            # client components: option form, card hand, list, bank

drizzle/0002_deal_optimizer.sql   # migration for the new tables
```

Point-currency management lives in the existing profile surface (the "Points
programs" section that is currently a "Coming soon" placeholder).

## 5. Data model

Three new tables, all per-user via the existing `users` table.

### `point_currency` (per-user — the user's currencies and valuations)

```
point_currency
  id           uuid pk
  userId       uuid → users.id (cascade)
  code         text     # "AMEX_MR" | "AEROPLAN" | "DELTA" | …  (user-defined)
  name         text     # "Amex Membership Rewards"
  defaultCpp   numeric  # cents per point, e.g. 1.8
  createdAt    timestamptz
  unique(userId, code)
```

### `journey` (the container ranked within)

```
journey
  id         uuid pk
  userId     uuid → users.id (cascade)
  fromLabel  text       # "Seattle (SEA)"
  toLabel    text       # "Tokyo"
  departDate date null  # rough; optional
  returnDate date null  # optional (round trip)
  notes      text null
  createdAt  timestamptz
```

### `option` (one way to book the journey)

The payment model is **unified**: every option has a cash component (always) and
an *optional* points component. This single shape expresses cash, points-with-
fees, **and** cash+points hybrids without a discriminator.

```
option
  id               uuid pk
  journeyId        uuid → journey.id (cascade)
  label            text       # "Business · ANA codeshare"
  portal           text       # THE SUIT — where you'd book: "aircanada.com",
                              #   "Google Flights", "Trip.com", "alaska.com"…
  carrier          text null  # the operating airline (rides on card art, not suit)
  stops            int null   # 0 = direct
  durationMins     int null
  cabin            text null  # 'economy' | 'premium' | 'business' | 'first'
  viaText          text null  # "1 stop ICN 3h"
  -- payment
  cashUsd          numeric        # cash out of pocket (full price for cash;
                                  #   just fees/co-pay for an award)
  pointsCurrencyId uuid null → point_currency.id (ON DELETE SET NULL)
  pointsAmount     int null
  cppOverride      numeric null   # per-redemption CPP override (points buy more
                                  #   in business)
  -- soft factors
  adjustments      jsonb          # [{ label: "lounge", deltaUsd: -40 }, …]
  notes            text null
  createdAt        timestamptz
```

**`portal` is the suit; `carrier` is who flies it.** `ON DELETE SET NULL` on
`pointsCurrencyId` means deleting a currency leaves referencing options
*incomplete* (surfaced), never silently zeroed — see §6 and §9.

The three worked examples (SEA→Tokyo):
- Alaska direct: `portal="alaska.com", cashUsd=1000`.
- Trip.com: `portal="Trip.com", cashUsd=850`.
- Aeroplan business: `portal="aircanada.com", cashUsd=80,
  pointsCurrency=AEROPLAN, pointsAmount=57000`, `adjustments=[{lounge,-40}]`.

## 6. Valuation & ranking engine (`score.ts`)

Pure, fully unit-tested, no DB/React.

### The one formula

```
cpp        = option.cppOverride ?? currency.defaultCpp        // cents per point
pointsUsd  = pointsAmount × cpp / 100
effective$ = cashUsd + pointsUsd + Σ(adjustments.deltaUsd)
```

### `rankJourney(options, currenciesById) → { ranked, incomplete }`

- `ranked`: options that can be valued, sorted **ascending** by `effective$`;
  ties broken by `createdAt` (stable). Each entry carries:
  - `effectiveUsd`
  - `breakdown` `{ cashUsd, pointsUsd, cppUsed, adjustmentsUsd }`
  - `deltaVsBestUsd` (0 for the leader)
  - `qualityRank` — a derived **deal-quality tier** (the card's "rank", e.g.
    2–10/J/Q/K/A) computed from how good `effective$` is relative to the
    journey's baseline (the most-expensive / sticker option). This is the only
    "rank" concept; it is **derived, not stored**.
- `incomplete`: options that **cannot** be valued (see fail-open).

### Fail-open refusal (carries the 2026-06-27 audit lesson, issue #22)

If an option has `pointsAmount > 0` but no resolvable CPP (currency unset / no
default / no override), the engine does **NOT** treat the points as `$0` — that
would make an unvalued award look like the cheapest deal (the exact false-
favorable pattern fixed in the visa engine). Instead the option goes to
`incomplete` with a reason (`"set a cents-per-point for AEROPLAN"`), is kept out
of the ranked "best," and is surfaced in a dedicated bucket. **Never let an
unknown render as the winner.**

### Edge cases / validation (Zod at the boundary + engine guards)

- An option with neither cash nor points → invalid.
- `cashUsd ≥ 0`; `pointsAmount ≥ 0`; resolved `cpp > 0`.
- `adjustments[].deltaUsd` may be negative (that is the whole point).
- Empty journey (no options) → empty `ranked`, empty `incomplete`.

## 7. Data access & server actions

`journey-db.ts` (pure data access, db handle injected) + `journey-actions.ts`
(`'use server'` wrappers). Every action: `requireSession()` → resolve userId →
**ownership assert** (`assertJourneyOwned`, mirroring `assertTripOwned`) →
Zod-validate → DB op. No client-passed id is trusted.

```
Currencies (profile-level)
  listCurrencies()                          → PointCurrency[]
  upsertCurrency({ code, name, defaultCpp })
  deleteCurrency(id)        # options' pointsCurrencyId → NULL (become incomplete)

Journeys
  createJourney({ fromLabel, toLabel, departDate?, returnDate?, notes? }) → Journey
  listJourneys()                            → Journey[]
  getJourney(journeyId)     → { journey, ranked, incomplete }   # runs the engine
  updateJourney(id, patch)
  deleteJourney(id)         # cascades options

Options
  addOption(journeyId, optionInput)         → Option
  updateOption(optionId, patch)
  deleteOption(optionId)
```

**Main data flow (ranked view):** `/compare/[journeyId]` server component →
`getJourney(id)` loads the journey, its options, and the user's currencies →
runs `rankJourney(...)` → returns `{ journey, ranked, incomplete }` for render.
Server-side and deterministic; re-runs on load and after each mutation
(revalidate). Persisted knobs (CPP overrides, adjustments) ⇒ stable ranking.

## 8. UI surface

### Profile — currencies (fills the "Points programs" placeholder)

Manage point currencies: code, name, default CPP. This is the user's "bank"
definition, reused across every journey.

### `/compare` — journeys list + create.

### `/compare/[journeyId]` — the journey board

**v1 (must-have):**
- **Hand view (default):** the ranked options as a row of cards that lift on
  hover. Each card: **rank** (quality tier, corner) + **suit = portal** (chip
  with brand color) + **effective-$** as the legible hero number + the
  "slashed-back" points breakdown (`57k Aeroplan ← 23,333 Amex ×1.5 + $80 − $40
  lounge`) + an **award-edition** shimmer when points are used. **No hand-type
  label on a card** (see §12). The best (cheapest effective-$) is highlighted.
- **List toggle (bottom-right):** swap the card row for a compact ranked list
  for scanning many; same data, different renderer.
- **The bank rail:** the user's currencies + (later) balances, with the chosen
  play's draw highlighted. Echoes the existing organizer right-rail.
- **Add / edit / delete option** via the structured form.
- **Incomplete bucket:** options the engine can't value, with a fix prompt.

**Near-future (not v1-blocking):** the **blinds** strip (targets to beat: cash
baseline / budget / stretch) — a light add once a budget/stretch input exists.
The **jokers** row (auto-modifiers / transfer-graph) is a larger **phase-2**
piece (§12); the manual soft ± adjustments are its v1 stand-in.

## 9. Error handling

- **Ownership failures** throw/redirect and treat "not yours" identically to
  "not found" (no existence leak).
- **Zod failures** return a *typed* error the form surfaces — never a silent
  drop (audit silent-failure lesson).
- **Unvaluable options** are surfaced in the `incomplete` bucket, never dropped
  or zero-valued (fail-open refusal).

## 10. Testing strategy

Matches the repo (pglite + real migrations; meaningful assertions; AI mocked;
no UI component tests, consistent with the codebase).

- **Engine (`score.ts`) — TDD, the priority:** effective-$ math; ranking order +
  stable tie-break; `deltaVsBestUsd`; `qualityRank` tiers; the **fail-open
  refusal** (points without CPP → `incomplete`, never $0); hybrid cash+points;
  negative adjustments; empty journey. Write tests first, watch them fail.
- **Data access / actions (pglite):** CRUD for journeys/options/currencies;
  ownership enforcement (no cross-user access); `deleteCurrency` → referencing
  options become `incomplete` (the SET NULL behavior).
- **Zod schemas:** boundary validation (reject option with neither cash nor
  points; bad numbers).
- **Green gate:** `tsc --noEmit`, `eslint`, full `vitest` suite.

## 11. Build order (phases for the implementation plan)

1. **Data + engine:** migration + Drizzle schema + types; TDD `score.ts`.
2. **Data access + actions + profile currencies:** `journey-db`,
   `journey-actions`, `option-schemas`; currency management UI in the profile.
3. **Compare board UI:** `/compare` list + create; `[journeyId]` board with the
   hand-view cards, list toggle, bank rail, option form, incomplete bucket.

## 12. Design language & future direction

The north star: **honest pluralism + an opinionated default** — always show the
genuinely-cheapest option *and* spotlight the user's kind of play; never
manufacture false confidence; never fail open.

The product gamifies as a **Balatro × Destified** card game. The engine stays
renderer-agnostic so these layers are additive:

- **Suit = the booking portal**, rendered as a **branded card identity** — the
  portal logo as the suit-mark plus a representative illustration and brand
  accent (e.g., Trip.com, Expedia, Google Flights, Skyscanner, Skiplagged). A
  **per-portal data-driven skin** (logo, color, art) so portals are extensible.
  Real logos carry trademark/asset weight, so v1 uses simple portal chips and
  the illustrated brand-deck is a dedicated **art pass**.
- **Rank = deal quality drives ornateness** — great deals (Aces/face cards) get
  the lush illustrated court-card treatment; mediocre ones are plain number
  cards. Finding an Ace *looks* like a win.
- **Jokers = the user's wallet modifiers** (cards/status/active transfer
  bonuses) — the **automation** of the manual soft adjustments. One joker can
  fire several effects ("Amex Platinum → layover-time penalty 0 **and** lounge
  meals free"). This is also the home of the **transfer-graph**: source currency
  → ratio → live bonus → destination, auto-computing the "slashed-back" real
  cost (`57k Aeroplan ← 23,333 Amex ×1.5`).
- **Blinds = targets to beat** — cash fare (small), budget (big), a stretch goal
  (boss).
- **Scalar → frontier → archetypes → style decks.** Effective-$ is the *scalar
  projection* of a multi-objective problem; later, a **Pareto-frontier** view
  (pure dominance filter over the breakdown vector — no new data) surfaces the
  genuinely-in-contention options without claiming one winner, **archetype
  tagging** (sweet-spot / splurge / positioning / arbitrage) labels the kinds of
  play, and **style "decks"** (the user's preferred archetypes/weights) re-
  highlight the frontier. v1 already stores the component **vector** (cash,
  points, duration, stops, cabin, adjustments), which is the substrate these
  layers consume.
- **Collection hands + public leaderboard.** Poker "hands" (flush, straight,
  pairs…) are **emergent from a collection** of booked cards, not per-card
  labels — a "flush" = everything booked through one portal. A public
  **leaderboard** lets users flex collections ("8-card Flush of Aces — 8 round-
  trips for $104"), a natural growth loop for this audience.
- **Whole-trip / multi-leg bundle** — the literal multi-card poker combination
  (pick a card per leg; cross-leg synergies form a hand) is the natural home for
  the deferred bundle optimizer.
- **AI paste-to-parse capture** and **organizer/trip integration** (attach a
  journey to a trip leg) round out the roadmap.

## 13. Decisions log (locked during brainstorming)

1. Central unit = **per-journey ranking** (not whole-trip bundle; not deals-log-
   first).
2. Scoring = **single "effective $ to you"** (per-currency CPP + per-redemption
   override + optional manual ± adjustments) — not a weighted multi-factor
   score, not money-only-with-tags.
3. Capture = **fast structured form** (AI parse is a fast-follow).
4. Surface = **standalone Compare**, reusing existing auth/DB; currencies in the
   profile.
5. Cost model = **lean effective-$ ledger** (Approach A); transfer-graph is
   phase 2.
6. `deleteCurrency` = **fail-open refusal** (referencing options become
   incomplete; delete is not blocked).
7. Journeys are **standalone** in v1 (organizer integration later).
8. Card UI = **hand view** primary (literal cards, hover-lift, legible
   effective-$) **+ list toggle**; **suit = portal**, **rank = quality**, **no
   per-card hand-type**.
