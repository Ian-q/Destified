# Migration notes

## drizzle-kit snapshot chain

`0001_info_cards.sql` was hand-written and shipped **without** a matching
`drizzle/meta/0001_snapshot.json`. When the deal-optimizer tables were added
(`0002`), `drizzle-kit generate` needed that intermediate snapshot to diff
against, so `meta/0001_snapshot.json` was **hand-reconstructed** to reflect the
post-`0001` schema (its `id` is a hand-assigned UUID).

Consequences:

- **Runtime is unaffected.** Migrations are applied by `drizzle-orm/pglite/migrator`
  (tests) and Neon (prod) from the `*.sql` files only; the `meta/*.json` snapshots
  are used solely by `drizzle-kit generate`. The full chain (`0000`→`0001`→`0002`)
  applies cleanly and all tests pass.
- **Before relying on a future `drizzle-kit generate`,** sanity-check its output —
  if it emits a spurious diff against `permanent_profile`/`condition_row`/etc.
  (the `0001` tables), regenerate/repair the `0001` snapshot rather than committing
  the bad diff. `meta/0002_snapshot.json` onward was machine-generated and is clean.
