# Plan: bound player-family record growth (save quota)

Status: milestones 1-3 implemented (2026-08-01); milestone 4 remains an open follow-up
Baseline: Fallowborn v1.101.1, 2026-07-31

## Purpose

A fertility-multiplier stress test exposed an unbounded-growth defect: the player's
wider family can grow until the save no longer fits in `localStorage`, at which point
every save and autosave fails with a quota error. The same failure is reachable, far
more slowly, in long unmodded campaigns, so the fix is a robustness improvement, not
just stress-test hardening.

This plan records the root cause, explains why the shipped court-compaction machinery
deliberately does not cover the player family, and lays out the fix in three small
milestones plus one optional follow-up.

## The failure chain

1. **A large fertility multiplier makes conception a certainty.** `FB.chance(p)` is
   `FB.rng() < p` ([`js/util.js:21`](../../js/util.js)), so any `p >= 1` always
   succeeds. `FB.traitAgg` multiplies trait `fert` values
   ([`js/model.js:453`](../../js/model.js)), and the kin conception roll
   ([`js/main.js:1986-1989`](../../js/main.js)) multiplies that with base chance,
   personal fertility, and both age curves. A big enough trait multiplier pushes the
   product past 1 and every wed kinswoman bears a child every single year of her
   fertile window (ages 16-45, so up to ~29 children per couple). The trait is
   heritable (`FB.inheritTraits`), so the guarantee compounds each generation.
2. **The kin simulation spans three generations and creates spouses.** `kinLifeTick`
   ([`js/main.js:1910-2019`](../../js/main.js)) runs yearly over everyone in
   `FB.kinOf` (children, grandchildren, siblings, nieces/nephews, uncles/aunts,
   cousins), and each unscripted wedding materializes a brand-new kinspouse record
   ([`js/main.js:1941`](../../js/main.js)).
3. **Family records are never removed.** Dead kin keep their full `state.chars`
   records by design; the family tree is the product.
4. **The save is one JSON string in one `localStorage` entry.** `S.serialize` /
   `S.toSlot` ([`js/save.js:131-159`](../../js/save.js)) stringify the whole state
   into a single key. The origin quota is about 5 MB and a serialized character is
   about 400 bytes (measured in
   [`docs/plans/archive/eager-court-characters.md`](archive/eager-court-characters.md)).
   Past the quota, `localStorage.setItem` throws, `S.toSlot` catches it, toasts
   "Save failed", and returns false - and every autosave from then on fails the same
   way. That is the reported "game loses the ability to save".

Note the quota is not even the first constraint to bite: `FB.kinOf` is
O(kin x records) and runs on every refresh, so a family in the thousands of records
degrades the day ticker well before the save fails (same measurement doc). Both
constraints point the same way: bound the growth, do not raise the ceiling.

## Why the shipped compaction machinery does not cover this

The eager-courts work (archived plan above) already built the "compact for the dead"
machinery, and it is worth being precise about why none of it applies here:

- `FB.courtRecordRetained` ([`js/world.js:2267`](../../js/world.js)) is the retention
  predicate: can the player still navigate to this character (items, roles, contacts,
  travel target, spouse/betrothal/child links, household, retainers, papal offices,
  kin)?
- `FB.courtMemberDied` / `FB.compactCourtRecord`
  ([`js/world.js:2320-2363`](../../js/world.js)) compact a dead court character: the
  succession member entry becomes the tombstone (name, born, died), links are
  detached, and the full record is deleted from `state.chars`. Forward-only.
- `FB.compactRoyalRecordOnDeath` ([`js/world.js:2374`](../../js/world.js)) covers
  royals whose realm has died, called from the player mortality pass
  ([`js/main.js:1761-1769`](../../js/main.js)) with retention read before
  `FB.killChar` severs the links the predicate consults.

Two hard gates keep the player family out of all of it:

1. Compaction only ever fires on characters with a `royalLine` / court membership.
   Kin, kinspouses, and `kinLifeTick` babies have neither, so no code path ever
   considers them for compaction.
2. Even if one did, `courtRecordRetained` returns true for anyone in `FB.kinOf`
   ([`js/world.js:2293-2294`](../../js/world.js)) and for parents of living player
   descendants. Kin are retained **by design** - and the player realm's succession
   has no `members` map to serve as a tombstone layer
   ([`js/world.js:1677-1681`](../../js/world.js), just
   `{ playerDynasty, rulerGeneration, heirCharId }`).

Consequence: no compaction scheme can bound the stress case, because the exploding
records are living kin and recently dead kin, all of which the predicate retains.
Growth must be bounded at the source, where records are created.

## Rejected alternatives

- **Per-couple child caps.** Growth stays unbounded across generations; only the
  constant changes.
- **Pruning or compacting dead kin in normal play.** Contradicts the retention
  design above; the family tree is what records are spent on.
- **Save compression.** Large complexity for a constant-factor gain; the quota is
  still reachable and the CPU costs of a huge family remain.

## Design

Layered defense, smallest first:

1. clamp the conception probability so `FB.chance` is never handed a certainty
   (root cause);
2. a hard cap on total family records as a fail-closed backstop (quota guarantee);
3. an actionable message when a save does hit the quota (the player can always
   export);
4. optionally, later and separately: a generational compaction sweep at succession,
   reusing the existing retention predicate.

Milestones 1-3 are one integration. Milestone 4 is its own follow-up with its own
audit.

### Milestone 1: clamp the kin conception roll

- **`data/map_data.js`** (beside `kinMarryChance` / `kinChildChance`, line 926): add
  `kinConceiveCap: 0.75` with a short comment: upper bound on the effective yearly
  kin conception chance, so stacked fertility multipliers stay a probability instead
  of a certainty.
- **`js/main.js`**, `kinLifeTick` conception roll (line 1989): clamp the product:

  ```js
  if (FB.chance(Math.min(fert, FBDATA.balance.kinConceiveCap || 0.75))) {
  ```

- The player's own household conception (`birthTick`,
  [`js/main.js:2079-2083`](../../js/main.js)) stays unclamped: it is a daily roll
  gated by one pregnancy at a time, so it is naturally bounded to roughly one child
  per year regardless of multipliers.

Effect: an extreme fertility trait now means "very fertile" (large families with
variance) instead of a deterministic 29-children-per-couple clockwork, and growth
slows by a large constant factor before the backstop is ever consulted.

### Milestone 2: `familyMaxChars` backstop

- **`data/map_data.js`**: add `familyMaxChars: 4000`. Sizing: 4000 records x ~400 B
  is ~1.6 MB of family, on top of the eager-courts baseline (~2,200-2,500 court
  records plus world state), comfortably inside the ~5 MB quota. Deliberately not
  higher: `FB.kinOf` day-tick cost grows with the record count, so the cap protects
  playability as well as the save.
- **`js/model.js`** (near `FB.kinOf`): add `FB.familySize(state)`: iterative BFS
  from the player character over `fatherId` / `motherId` / `spouseId` /
  `childrenIds`, counting unique reachable character ids, living and dead (dead
  records are what accumulate). Guard against missing records and re-visits. Runs
  once per year; trivially cheap even at the cap.
- **`js/main.js`**, `kinLifeTick`: at the top,

  ```js
  const familyFull = FB.familySize(s) >= (FBDATA.balance.familyMaxChars || 4000);
  ```

  When `familyFull`:
  - skip the unscripted auto-marriage branch (lines 1939-1954), so no new kinspouse
    records;
  - skip the conception block (lines 1981-2017), so no new baby records;
  - still honor sealed betrothals (`FB.doKinWedding`, lines 1929-1938): they weld
    two existing records together, create nothing, and are player promises.
  - comment the gate: the bound exists for the `localStorage` quota, the automatic
    counterpart of `p.flags.noChildren`'s "the house is full enough".
- The player household (`birthTick`) is not gated: pregnancy-limited and player
  agency.

Side benefit: a save already past the cap stops growing on load - it stays large but
no longer gets worse, with no retroactive deletion.

### Milestone 3: actionable quota failure

- **`js/save.js`**, `S.toSlot` (lines 148-159): recognize the quota case
  (`e.name === 'QuotaExceededError'`, plus the legacy `e.code === 22` and Firefox's
  `NS_ERROR_DOM_QUOTA_REACHED` / `e.code === 1014`) and show a specific toast: the
  save has outgrown the browser's storage, and Menu → 💾 Save game → 📤 Export still
  preserves the life as text. Non-quota errors keep the current generic message.
- The new string is player-facing UI chrome: route it through the i18n layer like
  the neighboring toasts (see `docs/i18n-authoring.md`); catalogs regenerate at
  integration only.

### Milestone 4 (optional follow-up, separate integration): generational sweep

Bounds dead accumulation across generations in very long campaigns, reusing the
battle-tested court machinery rather than inventing a parallel one:

- At `G.succeedTo` ([`js/main.js:2362`](../../js/main.js)), after the player pointer
  moves to the heir (line 2406) and cleanup runs: sweep `state.chars` for records
  that are dead, carry no `royalLine` (royals are the court machinery's job), and
  are **not** retained by `FB.courtRecordRetained(state, c, kinById)` evaluated
  against the new protagonist. For each: detach links (generalize the private
  `detachCourtRecord`, [`js/world.js:2393`](../../js/world.js), into a shared
  helper) and delete the record.
- Why this is safe in principle: the predicate already retains parents of living
  player descendants (direct lineage never loses a link), it "errs toward keeping",
  the sweep runs at succession and never at load (forward-only, same discipline as
  court compaction), and durable news lines store rendered names, not char ids.
- Why it is not in milestones 1-3: the predicate's reference list was audited for
  court characters. Ordinary characters have reference surfaces courts never
  touch - `state.provChars` rosters, enterprise worker assignments, marriage
  candidate lists, event-queue contexts, plots and pacts. Each must be audited (and
  added to the predicate or to the sweep's exclusions) before deletion is safe.
  A missed class here means a dangling id, not just bloat.

## Save compatibility

Additive under save v3, no schema change. Old saves load unchanged; the gate and the
clamp read live balance values, so an over-cap save simply stops growing. Both knobs
have code-side fallbacks (`|| 0.75`, `|| 4000`) so saves or mods carrying an older
`FBDATA.balance` keep working.

## Testing

Per `docs/TESTS.md` (main integration workflow): tests are authored with the change
and not run by the agent; execution is owner-controlled.

New spec under `tests/e2e/` (e.g. `family-growth.spec.js`) covering, with seeded
deterministic state:

1. **Clamp**: a wed kinswoman whose couple carries an extreme `fert` trait product
   does not conceive in every simulated year over a multi-year window (the roll is
   a probability again).
2. **Cap gate**: with the family at `familyMaxChars`, a year of `kinLifeTick` adds
   zero records to `state.chars`; a sealed betrothal between two existing records
   still weds.
3. **`FB.familySize`**: correct unique count on a small fixture tree (shared
   spouses, dead members, a missing-id link).
4. **Quota toast**: with `localStorage.setItem` stubbed to throw a quota-shaped
   error, `S.toSlot` returns false and surfaces the export-advice message rather
   than the generic failure.

## Documentation updates at implementation

- `docs/MODDING.md`: document the two new balance keys.
- `docs/designs/state-and-saves.md`: a paragraph on the quota strategy (why family
  record creation is bounded, what happens at the quota).
- `docs/designs/marriage.md`: note the cap gate on unscripted kin weddings and that
  sealed betrothals are exempt.

## Integration notes

- PATCH bump per `docs/VERSIONS.md`, assigned at integration, version in the commit
  subject; one short `FB.CHANGELOG` line (players see it in-game).
- i18n: `extract → translate fr de it es → validate` as the final integration step,
  never earlier.
