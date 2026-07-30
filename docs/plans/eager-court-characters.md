# Plan: eager court characters for reigning realms

Date: 2026-07-30

Status: **implemented**, all eight milestones, awaiting the owner's manual review and
test run (see *Manual review targets for the owner* below; the automated coverage listed
here was authored but not executed). Every reigning ruler and the living members of
their court become real `state.chars` records, created eagerly rather than on first
interaction, and compacted back to succession-tree members when they die. The
realm-level simulation stays authoritative for AI aging, death, and succession. No new
AI marriage, birth, or education systems are built here.

Related design:
[characters](../designs/characters.md),
[realms](../designs/realms.md),
[marriage](../designs/marriage.md),
[seeds](../designs/seeds.md),
[state and saves](../designs/state-and-saves.md),
[UI](../designs/ui.md), and
[mods](../designs/mods.md).

Audit baseline: Fallowborn v1.93.4.

## Goal

Opening any realm shows a real face and a full character card for its ruler, consort,
and heirs, instead of today's one-line stub and heraldic crest.

The shape in one line: **eager for the living, compact for the dead, and the
realm-level simulation stays the authority.** The long-run record count must be bound
by the map rather than by how long the campaign has run, so a two-hundred-year game
costs the same per year as a twenty-year one.

## Why this shape

The obvious implementation is to keep every character ever generated. That fails on
storage before it fails on CPU. A serialized character record measures about 400
bytes. Naive eager tracking over a very long campaign reaches tens of thousands of
records, the overwhelming majority of them dead, producing a save large enough to
exceed the `localStorage` quota while the yearly cost is bookkeeping for people who no
longer exist.

The living court population, by contrast, is map-bound and flat: roughly 400 realms at
runtime times five or six living court members is about **2,200 to 2,500 records**,
regardless of game length. Measured at that scale the save is 1.1 to 1.4 MB and
stringifies in single-digit milliseconds, which is affordable. Everything past that
number is dead accumulation, and the succession tree already holds what the game needs
about the dead: name, dates, and parent/child links.

So: materialize the living, keep the member entry as the tombstone, and delete the full
record on death unless the player has a reason to still see it.

## Current architecture and the gap

### AI rulers are stubs, not characters

`makeRuler` ([`js/world.js:826`](../../js/world.js)) returns
`{ name, sex, culture, born, age, mar, trait, generation }`. That is one martial
number, one trait id, and no skills object, health, fertility, or spouse. Generated
realms always produce a male ruler. AI rulers have no spouses anywhere in the engine,
which is why no court currently contains a woman.

### Each realm already carries a compact family tree

`r.succession = { rulerGeneration, rulerMemberId, members{}, order[], heirId }`, seeded
with two to four members per realm by `FB.ensureRealmSuccession`
([`js/world.js:1258`](../../js/world.js)) through `newRoyalMember`
([`js/world.js:1198`](../../js/world.js)). Member shape:

```js
{ id, name, sex, born, alive, parentId, childIds: [], charId: null }
```

`FB.refreshRealmSuccession` ([`js/world.js:1233`](../../js/world.js)) recomputes
`order` and `heirId`, marks a member dead when its linked character is dead, and
repairs an extinct line through `makeHeirIfEmpty`
([`js/world.js:1783`](../../js/world.js)). `tickRoyalFamily`
([`js/world.js:1321`](../../js/world.js)) ages and kills unmaterialized members from
the yearly world tick.

**This tree is the tombstone layer this plan needs. It already exists, it is already
what family display reads, and it must not be weakened.**

### Materialize-on-demand already exists

`FB.materializeRealmRuler` ([`js/world.js:1521`](../../js/world.js)) and
`FB.materializeRoyalChild` ([`js/world.js:1365`](../../js/world.js)) already turn a
member into a full `state.chars` record, idempotently, at interaction time such as
courtship or cultivation. Two-way sync exists: `FB.realmRulerCharacter`
([`js/world.js:1480`](../../js/world.js)) pushes the character's fields back onto the
stub, and `FB.syncRealmRulerStanding` ([`js/world.js:1650`](../../js/world.js)) mirrors
the realm-keyed opinion store.

**This plan does not write a new materialization path. It calls the existing one
earlier.**

### Death and succession re-roll the person

`FB.advanceRealmSuccession` ([`js/world.js:1796`](../../js/world.js)) builds a fresh
stub from the heir member with a new random martial score and a new random trait, so
there is no continuity of person unless the heir happened to be materialized. A player
who spent years cultivating an heir watches a stranger take the throne.

### The renderer is already generic

`UI.charCardHtml` ([`js/ui.js:2859`](../../js/ui.js)) renders any character record and
is already reused for suitors, kin, and materialized rulers. `FB.paintFaces`
([`js/portrait.js:728`](../../js/portrait.js)) paints any `canvas.pface[data-cid]`
whose id resolves in `state.chars`. So the realm modal shows a crest and a stub line
only because no record exists. **No new renderer work is required by this plan.**

### The character map is small today, and many systems walk all of it

`state.chars` currently holds a handful of records at new game and a few hundred in a
mature dynasty; AI realms contribute zero. Thirty sites iterate the entire map. Most
are per-season or one-shot and will not notice an eightfold increase. Three are on the
day ticker, and one yearly pass is quadratic. Both are quantified below, because they
are the whole reason this plan has more milestones than "call materialize at init".

## Measured cost, and the two defects it exposes

All figures below were measured headless against the shipped files at synthetic
scales, JS-side only, on a desktop machine. Treat them as floors and multiply by
roughly three to five for the mobile floor.

### The yearly pass is O(records x realms), not O(records)

The yearly mortality loop ([`js/main.js:1639`](../../js/main.js)) calls
`FB.isReigningRealmRuler(s, c)` for every record, to leave reigning rulers to the realm
simulation. `FB.realmIdForRulerCharacter` ([`js/world.js:1495`](../../js/world.js))
resolves that by short-circuiting on `c.royalLine` when the character actually rules
the realm it names, and **otherwise scanning every realm and returning null**. Every
record that is not a reigning ruler therefore pays a full realm scan:

| Records | Realms | Loop body alone | Real loop | With a ruler index |
| --- | --- | --- | --- | --- |
| ~300 (mature dynasty today) | 400 | 0.05 ms | **15 ms** | 0.03 ms |
| ~2,500 (this plan) | 400 | 0.89 ms | **137 ms** | 0.40 ms |
| ~3,400 (upper bound) | 555 | 0.73 ms | **189 ms** | 0.71 ms |

This defect is **already shipped**; it simply needs a long campaign to become visible.
What this plan changes is that 2,500 records become the floor from turn one, so it
stops being a corner nobody reaches. A game year at default speed is about 32 seconds
of real time, so unfixed this is a third of a second of desktop stall, or most of a
second on a phone, at every year rollover, and worse inside `G.skipAhead`, which runs
92 days with no frame in between.

**Milestone 1 fixes this and must land first.**

### Three kin lookups walk every record on every day tick

`renderActiveTab` ([`js/ui.js:1951`](../../js/ui.js)) rebuilds the Self/Kin panel on
every `UI.refresh`, and refresh runs on the day ticker (140 to 700 ms). From
`renderFamily` it reaches:

- `FB.kinOf` ([`js/model.js:798`](../../js/model.js)), uncached, calling `childrenOf`
  once per relative, so O(kin x records);
- `childrenOf` ([`js/model.js:665`](../../js/model.js)), which reads `c.childrenIds`
  and **then scans everything anyway**, reconciling records whose `fatherId`/`motherId`
  point at `c` without the back-link;
- `FB.spousesOf` ([`js/events.js:730`](../../js/events.js)) and `FB.stepchildrenOf`
  ([`js/model.js:703`](../../js/model.js)), each another full scan.

| Records | `FB.kinOf` | `FB.stepchildrenOf` | `FB.childrenOf` |
| --- | --- | --- | --- |
| 298 (today) | 0.27 ms | 0.058 ms | 0.016 ms |
| 2,498 (this plan) | **5.2 ms** | 0.76 ms | 0.31 ms |
| 3,448 (upper bound) | **7.6 ms** | 1.11 ms | 0.47 ms |

The kin set is 25 relatives in every row. Court members are not kin and contribute
nothing to the answer; they are pure scan overhead. **Milestone 7 fixes this.**

Moving court records into a separate map so `state.chars` stays small is the tempting
structural answer and is the wrong trade: there are around 500 direct `state.chars[...]`
lookups that would need rerouting through a resolver, against 30 iterations to index.
Index the accessors instead.

## Design rules

### The realm simulation stays the driver

`worldTick` and `tickRoyalFamily` remain authoritative for AI aging, death, and
succession. Eager records add presence, not simulation. The mortality loop's
reigning-ruler exemption extends to court members, so no court character is ever aged
or killed twice.

### Living eager, dead compacted

A living court member is a full record. A dead one is a member entry unless the player
has a navigable reason to keep the record. This is the load-bearing decision; without
it the record count grows without bound.

### A court record is a complete record, not a second kind of stub

Every court character must carry the full field set the character card and the portrait
path read: `sex`, `culture`, `religion`, `born`, `station`, `role`, `health`, `traits`,
`skills`, and a resolvable loadout. A record that omits a field one of those readers
consults produces a card or a face that disagrees with the sheet printed beside it, and
that class of bug is invisible until a player notices two rulers who look like
siblings. `FB.makeCharacter` ([`js/model.js:262`](../../js/model.js)) already fills
most of this; the plan must not bypass it.

### Portraits stay derived state

A portrait is a pure function of the character record and is never persisted. Three
consequences that this plan must honor, because eager courts multiplies the number of
distinct faces the game draws by roughly eight:

1. **No new direct `FB.paintPortrait` calls.** Court UI paints faces through
   `FB.faceTag` plus `FB.paintFaces`, exactly as existing views do. One repaint path
   means one place to reason about repaint cost.
2. **Bound the faces painted per view.** `FB.paintFaces` repaints every visible
   `canvas.pface` on every DOM render, and the Self/Kin panel re-renders on the day
   ticker. Keep the existing six-member cap in `FB.realmFamily`
   ([`js/world.js:1309`](../../js/world.js)) and do not introduce a view that paints an
   unbounded list of court faces.
3. **One place defines what a face is drawn from.** The top bar already hand-builds an
   inline repaint key from everything its portrait reads
   ([`js/ui.js:1604`](../../js/ui.js)). Milestone 6 extracts that into
   `FB.characterVisualKey(state, c)` so a field that affects appearance is registered
   once rather than in two places that can drift.

### Determinism is a property of stored data, not of call order

Character generation consumes the single shared seeded stream and the monotonic
`FB.uid` counter ([`js/util.js:76`](../../js/util.js)), so materialization is
deterministic only given identical call order. Creating 2,500 records at world
creation, in map-iteration order, would perturb every downstream world roll and make
court appearance depend on which realm the player happened to open first. Court
generation therefore moves to a scoped sub-stream keyed by stable identifiers, and
court character ids become derived rather than sequential. This is Milestone 2, and it
must land before Milestone 4.

### Eagerness is one constant, not a scattered assumption

How much of a court materializes at world creation is a single named constant with a
documented cost, so it can be re-tuned from one line after profiling on a real device
rather than by rewriting the ensure chain. See Milestone 4.

## Data model

### The succession member gains a role

`newRoyalMember` gains a `role` field, `null` today and `'consort'` for the new spouse
member. Absent on old saves, which means "child or collateral" and needs no migration.

```js
{ id, name, sex, born, alive, parentId, childIds: [], charId: null, role: null }
```

### The reigning-ruler index

A derived map from character id to realm id. **It must not live on `state`.**
`S.serialize` ([`js/save.js:33`](../../js/save.js)) dumps `state` wholesale, so
anything hung there is written to every save; at full court population that is roughly
2,500 entries of pure derived data on a save the rest of this plan is trying to keep
near 1.2 MB. Hold it as module-private state in `js/world.js` instead, rebuilt from the
succession trees:

```js
/* charId -> realmId for reigning rulers. Derived, never serialized:
   rebuilt by FB.ensureDynasticState on new game and on load. */
let rulerIndex = Object.create(null);
```

It is a cache, not the truth. See Milestone 1 for the verify-on-hit rule.

### Save shape

Additive under the existing save version. Old saves grow their courts through the
ensure chain already invoked on load
(`FB.ensureDynasticState` at [`js/save.js:173`](../../js/save.js)), which is the
standard lazy-init pattern in this codebase. **No save version bump**, and the bump
would be actively harmful rather than merely unnecessary: both save readers gate on
`d.v === 3` by strict equality. Nothing in this plan adds a field that must be
serialized. Full analysis, including what a downgrade costs, in *Saves and
compatibility* below.

## Implementation milestones

Land them in order. Milestones 1 and 2 are prerequisites, not optimizations: shipping
4 without 1 introduces a per-year stall, and shipping 4 without 2 makes world
generation depend on UI history.

### Milestone 1 - index the reigning rulers

Purpose: return the yearly pass to O(records).

1. Add `FB.rebuildRulerIndex(state)` in `js/world.js`. Walk `state.realms`; for each
   living non-`player` realm whose `succession.members[succession.rulerMemberId]` has a
   `charId`, record `index[charId] = rid`. Keep the map in a module-private variable,
   **not on `state`**: `S.serialize` dumps `state` wholesale, so a map hung there is
   written into every save as derived bloat.
2. Rewrite `FB.realmIdForRulerCharacter` ([`js/world.js:1495`](../../js/world.js)) to
   consult the index first. **Verify on hit before trusting it**: confirm that the
   named realm is alive and that
   `realm.succession.members[realm.succession.rulerMemberId].charId` still equals the
   character's id. If the check fails, drop the entry and fall through to the existing
   scan. This keeps the function O(1) in the common case and makes a stale entry a miss
   rather than a lie. The failure mode matters: a stale entry lets the player's
   mortality loop kill a ruler the realm simulation believes is alive, silently, into
   the save.
3. Maintain the index at its three writers: `FB.materializeRealmRuler`
   ([`js/world.js:1521`](../../js/world.js)) on link,
   `FB.advanceRealmSuccession` ([`js/world.js:1796`](../../js/world.js)) on
   succession, and `FB.killChar` ([`js/events.js:1046`](../../js/events.js)) on death.
   Also clear entries in `FB.refreshRealmSuccession`
   ([`js/world.js:1233`](../../js/world.js)) where it already notices a linked
   character has died.
4. Call `FB.rebuildRulerIndex` from `FB.ensureDynasticState`
   ([`js/world.js:1290`](../../js/world.js)) so both new games and loaded saves get a
   correct index without a migration step.
5. Leave the signature and every one of the roughly twenty `FB.isReigningRealmRuler`
   call sites untouched.

Ships independently and is worth shipping independently: it fixes a live defect in
long campaigns whether or not the rest of this plan lands.

### Milestone 2 - scoped court seeds and derived ids

Purpose: eager creation must not perturb world RNG, and the same world seed must always
produce the same courts.

1. Add a scoped-stream helper in `js/util.js` beside the existing RNG. It saves
   `FB.getRngState()`, seeds from `FB.hashSeed(scope)`
   ([`js/util.js:25`](../../js/util.js)), runs a callback, then restores the previous
   state:

   ```js
   FB.withSeed = function (scope, fn) {
     const prev = FB.getRngState();
     FB.seedRng(FB.hashSeed(String(scope)));
     try { return fn(); } finally { FB.setRngState(prev); }
   };
   ```

   All randomness continues to flow through `FB.rng` and friends, per the repository
   rule against `Math.random` in game logic.
2. Scope the court scope string on stored identifiers only: the world seed, the realm
   id, the member id, and the ruler generation. Nothing about call order, wall time, or
   iteration position may enter it.
3. Give court characters derived ids instead of `FB.uid()`. Court records are created
   from a member, so the member id is already unique and stable; derive the character
   id from it (for example a `royal_`-prefixed id mirroring the member id) so the same
   member always produces the same character id. Keep `FB.uid` for everything else, and
   make sure the derived ids cannot collide with the `c<n>` sequence.
4. Wrap the existing `newRoyalMember` and both materialize paths in the scoped stream.
   This matters on load as much as at world creation: `S.restore` sets the saved RNG
   state and then runs the ensure chain, of which only `FB.ensureStepRelations` restores
   the stream around itself ([`js/save.js:174`](../../js/save.js)). Once Milestone 4
   materializes courts from `FB.ensureDynasticState`, an unscoped chain would consume
   thousands of rolls on the first load of an old save and hand that world a different
   future than the same save on the previous build.

Verify that a fresh game on a fixed seed produces identical realm-by-realm courts
across two runs, that world events downstream of world creation are unchanged from
before this milestone, and that a save-load-save cycle produces the same subsequent
world as an uninterrupted session. Those last two are the ones that regress quietly.

### Milestone 3 - the consort member

Purpose: close the "AI rulers have no spouses" gap, and put women in every court.

1. In `FB.ensureRealmSuccession` ([`js/world.js:1258`](../../js/world.js)), seed one
   member with `role: 'consort'` per ruler generation, of the opposite sex to the
   ruler, with a plausible age relative to the ruler's.
2. Give the existing seeded children the ruler as `parentId` where they currently have
   `null`, so the family card stops being a set of unrelated names. Respect
   `royalMemberSort` ([`js/world.js:857`](../../js/world.js)) and the
   `orderedMemberIds` parent grouping so display order does not change shape.
3. Keep the consort out of the succession `order`: a consort is not an heir. **Exclude
   it by an explicit `role` check, never by `parentId` grouping.** The grouping is not
   sufficient: `FB.refreshRealmSuccession`'s fallback rebuilds order from
   `orderedMemberIds(s, s.rulerMemberId || null)`, which matches any null-parent member
   when `rulerMemberId` is null, and a consort's `parentId` is legitimately null. Confirm
   `FB.refreshRealmSuccession` and `makeHeirIfEmpty` still behave when the only living
   member of a line is a consort.
4. When a consort member materializes, link the two characters with the existing
   spouse fields so `FB.spousesOf` reports them, and reuse
   `linkMaterializedRoyalFamily` ([`js/world.js:1335`](../../js/world.js)) rather than
   writing new linkage.

Old saves have no consort member. `FB.ensureRealmSuccession` already runs on load, so
they gain one; check that a realm whose ruler is mid-generation does not acquire an
implausible spouse, and prefer skipping the backfill for an existing generation over
inventing one.

### Milestone 4 - materialize the living court eagerly

Purpose: the actual feature.

1. Add a named constant near the top of `js/world.js` controlling court depth, with the
   measured cost of each setting in a comment:

   ```js
   /* How much of each court exists as a full character from world creation.
      'ruler'  - the ruler only (~450 records; kinOf 0.50 ms/refresh)
      'court'  - ruler, consort and heirs (~2,500 records; kinOf 5.2 ms/refresh)
      Both settings show a real face and card for every ruler; 'court' also
      keeps consorts and heirs persistent before the player ever opens them. */
   const COURT_EAGERNESS = 'court';
   ```

   Everything below reads this constant. Re-tuning after profiling on a real device is
   then a one-line change, not a refactor.
2. Extend `FB.ensureDynasticState` ([`js/world.js:1290`](../../js/world.js)), which
   already walks every realm, to materialize according to the constant through the
   **existing** `FB.materializeRealmRuler` and `FB.materializeRoyalChild`. Do not write
   a third materialization path.
3. Materialize new rulers at succession in `FB.advanceRealmSuccession`.
4. Under `'ruler'`, keep the modal's first open materializing consort and heirs on
   demand, which is exactly today's behavior for a cultivated character.
5. Extend the mortality loop's reigning-ruler exemption to cover court members, so
   `tickRoyalFamily` stays the only thing that ages and kills them. Reuse the index
   from Milestone 1 rather than adding a second predicate.
6. Confirm nothing in the eager path calls into the player's household, retainer, or
   marriage-candidate systems. A court character must be inert to every player-side
   subsystem until the player interacts with it.

Measure new-game initialization before and after. Materializing hundreds or thousands
of records through `FB.makeCharacter` at world creation is startup latency the player
feels directly, and it is the one cost in this plan that was not measured up front.

### Milestone 5 - compact on death

Purpose: keep the record count map-bound rather than campaign-length-bound.

1. Add a retention predicate, `FB.courtRecordRetained(state, c)`. Return true when the
   player can navigate to the character: a kin tie, a marriage or betrothal, held
   items, a claim, council or office history, or any other UI-reachable reference.
   **Cultivation opinion alone does not count** - opinion lives in the realm-keyed
   store that `FB.syncRealmRulerStanding` already mirrors, and it survives compaction
   without the record.
2. In the court-member death path, if the predicate is false, clear `member.charId`,
   delete the `state.chars` entry, and let the member entry carry name, dates, and
   links. If it is true, keep the record through the existing `FB.killChar` path
   unchanged. **Compaction lives in the death path only and never runs retroactively
   on load.** An old save can already hold dead materialized royals from cultivation
   that the predicate would not retain, and deleting those at load time would remove
   characters the player remembers meeting.
3. Make sure `FB.refreshRealmSuccession`, which currently marks a member dead when its
   linked character is missing or dead, cannot mistake a compacted member for a dead
   one. This is the subtle failure in the whole plan: compaction removes the character
   of a member who is *already* dead, so ordering matters. Mark the member dead first,
   then compact.
4. Remove the index entry, if any, when compacting.

The accepted tradeoff, which belongs in the design doc: a never-inheriting child who
died untouched has a name and dates but no posthumous character sheet. Records are
spent on what the player can see and touch.

### Milestone 6 - succession continuity and one visual key

Purpose: the person the player cultivated is the person who takes the throne.

1. In `FB.advanceRealmSuccession`, promote the heir's existing record instead of
   building a fresh stub with a new random martial score and trait. Keep
   `FB.realmRulerCharacter` as the one place that pushes character fields back onto
   `r.ruler`, so the stub stays a projection of the record rather than a parallel truth.
2. Extract `FB.characterVisualKey(state, c)` into `js/portrait.js`, returning the
   string of every field a face is drawn from, and rewrite the top bar's inline `pk`
   ([`js/ui.js:1604`](../../js/ui.js)) to call it. This removes a duplicated list that
   can already drift today, and gives one registration point for any future field that
   changes a character's appearance.

### Milestone 7 - the per-refresh kin lookups

Purpose: stop three full-map scans running on the day ticker.

1. Memoize `FB.kinOf` per character id and turn, invalidated on the family-mutating
   events (birth, death, marriage, betrothal, adoption, step-relation changes). This is
   the safe option: an invalidation bug shows up as a stale family card, which is
   visible and harmless.
2. Give `FB.spousesOf` and `FB.stepchildrenOf` the same treatment, or index them.
3. Do **not** simply delete `childrenOf`'s reconciliation scan. It is faster to trust
   `childrenIds` and move the reconciliation to a one-time load repair, but if any
   writer sets `fatherId` or `motherId` without pushing the back-link then kin silently
   vanish, which is the worst failure mode in this plan. Audit every writer first, or
   take the memo and leave the scan.

Under `COURT_EAGERNESS = 'ruler'` this milestone is optional; profile before doing it.

### Milestone 8 - documentation

1. Record the eager-court model, the retention predicate, and the accepted tradeoff in
   [`docs/designs/characters.md`](../designs/characters.md), and the consort member and
   succession continuity in [`docs/designs/realms.md`](../designs/realms.md).
2. Record the derived, never-serialized status of the ruler index and the no-bump path
   in [`docs/designs/state-and-saves.md`](../designs/state-and-saves.md).
3. Record the scoped court stream in [`docs/designs/seeds.md`](../designs/seeds.md).
4. If the `role` field or the eagerness constant becomes mod-visible, record the
   contract in [`docs/MODDING.md`](../MODDING.md).
5. Update this file's status line.

## Automated coverage to author

Author these as Playwright specs under `tests/e2e/specs/`, following the conventions of
the existing suite. **Do not run them**: test execution, syntax checks, and browser
matrices are owner-controlled. List the files added in the handoff and state
explicitly that they were not run.

A new `eager-courts.spec.js` covering:

- **Presence.** A new game exposes, for a sampled set of realms, a ruler record with a
  resolvable id, five skills, at least one trait, and a consort.
- **Determinism.** Two new games on the same seed produce identical court character ids,
  names, and skills for the same realms.
- **Seed isolation.** A world created with eager courts produces the same non-court
  world state as the same seed produced before eager courts, proving the scoped stream
  does not perturb downstream rolls. Pin the expectation to a stored fixture rather
  than a live comparison.
- **Compaction.** An untouched court member's death leaves the member entry and removes
  the `state.chars` record. A court character the player married keeps their record.
- **Succession continuity.** A materialized heir's skills and traits survive their
  accession, rather than being re-rolled.
- **Bounded records.** After a long simulated run, the record count remains near the
  map-bound figure rather than growing with elapsed years.
- **Ruler index correctness.** `FB.isReigningRealmRuler` agrees with a brute-force
  scan over every realm for every record, after succession and after death. This is the
  one assertion that catches a stale index before it corrupts a save.
- **Old-save load.** A stored version-3 save from before this plan loads, gains courts
  and consorts, and saves again with `v` still 3.
- **Save-cycle determinism.** Loading a save and running forward produces the same world
  as running the same session forward without saving. This is what catches an unscoped
  ensure chain, and it fails loudly only if the assertion exists.
- **No derived data in the save.** The serialized payload contains no ruler index.
- **Compaction is not retroactive.** A save seeded with a dead, unretained, materialized
  royal still has that record after a load.

Extend the existing specs rather than duplicating them:

- `determinism.spec.js` for the fixed-seed court assertions.
- `family-correctness.spec.js` for consort linkage and the kin memo's invalidation.
- `storage.spec.js` for the save-size bound and old-save load.
- `simulation.spec.js` for the year-boundary work not growing with record count.

## Manual review targets for the owner

Automated coverage cannot settle these; they need a browser and, for the last three, a
real phone.

- A realm modal shows a face, a card, a consort, and heirs, and the faces across
  neighboring realms read as different people rather than variations of one.
- An old save loads and grows its courts without visible disruption.
- The year rollover at full record count, with a profiler open, is single-digit
  milliseconds rather than the unindexed figure.
- A long fast-forward through several year boundaries stays smooth. `G.skipAhead` runs
  92 days with no frame between and is the harshest case, not the smoothest.
- The day ticker at the fastest speed with the Kin panel open on a large family.
- New-game start time, before and after.

## Saves and compatibility

### Old save into a build with this plan: compatible

- **No save version bump, and the bump would be actively harmful.** Both
  `S.read` ([`js/save.js:86`](../../js/save.js)) and `S.parseExport`
  ([`js/save.js:77`](../../js/save.js)) gate on `d.v === 3` by strict equality, so a
  save is either exactly version 3 or unreadable. Keeping `v: 3` is what makes this
  plan loadable in both directions; raising it to 4 would make every save written
  after this plan unreadable by every build before it.
- Every addition is derived or defaulted. `member.role` is absent on old saves and
  reads as "child or collateral". The ruler index is module-private and rebuilt.
- Old saves gain consorts and eager courts through `FB.ensureDynasticState`, already
  called at [`js/save.js:173`](../../js/save.js). No migration step is needed and none
  should be written.
- **The ensure chain on load is not RNG-protected, and Milestone 4 puts heavy RNG
  consumption inside it.** `S.restore` sets the saved RNG state and then runs the whole
  chain; only `FB.ensureStepRelations` is wrapped to save and restore the stream around
  itself ([`js/save.js:174`](../../js/save.js)). `FB.ensureDynasticState` is not, and
  today that is harmless because `FB.ensureRealmSuccession` seeds members only when
  `r.succession` is absent, so on a loaded save it is nearly free. Materializing a
  court through `FB.makeCharacter` is not free: it draws skills, traits, and fertility
  per record. Unscoped, the first load of an old save would consume thousands of rolls
  and hand the world a different future than the same save on the previous build, and
  a save-load-save cycle would diverge from an uninterrupted session. Milestone 2's
  scoped stream is what prevents this, which is the second reason it must land before
  Milestone 4. Follow the `ensureStepRelations` precedent.
- **Compaction is forward-only and must never run retroactively.** An old save can
  already hold dead materialized royals from cultivation, some of which the retention
  predicate would not retain. Deleting those on load would remove characters the
  player remembers meeting. Compaction belongs in the death path only; records already
  dead in the save are never revisited.
- An old save's realm mid-generation must not acquire an implausible consort. Prefer
  skipping the backfill for an already-running generation over inventing a spouse.
- Compaction must never delete a record another subsystem still references. The
  retention predicate is the guard, and a missed reference class is the likeliest bug
  in this plan.

### New save into a build without this plan: loads, but degrades

Worth stating precisely, because export and import move a life between devices that
may not be on the same version. A save written after this plan stays readable by an
older build, since `v` is unchanged and court characters are ordinary `state.chars`
records. It does not stay *correct*:

- Court members that are not reigning rulers fall back under the player's mortality
  loop in the old build, because the exemption added by Milestone 4 is not there. They
  will age and die by player rules rather than by `tickRoyalFamily`. This is silent,
  not a crash, and produces no spurious news, since the loop's news lines are all
  gated on a relationship to the player.
- Compaction does not run, so the record count grows with elapsed years again.
- A consort member can be treated as an heir. `FB.refreshRealmSuccession` prefers the
  stored `order`, which excludes consorts, but its fallback rebuilds from
  `orderedMemberIds(s, s.rulerMemberId || null)`, and a consort with a null `parentId`
  matches that grouping when `rulerMemberId` is null. The old build has no `role`
  concept to exclude it.

The mitigation is a design rule rather than code: **exclude the consort from
succession by an explicit `role` check, never by `parentId` grouping**, so that the
member's shape carries as much of the intent as possible into a build that cannot read
the role. A downgrade remains lossy, and that is acceptable; it should just be known
rather than discovered.

## Mod compatibility

Mods that add realms through the existing data contracts get courts for free, since
generation hangs off `FB.ensureRealmSuccession`. Mods that write `r.ruler` directly
continue to work, because `FB.realmRulerCharacter` keeps the stub as a projection of
the record. If the eagerness constant or `member.role` becomes mod-visible, record it
in [`docs/MODDING.md`](../MODDING.md) with the rest of the realm contracts.

## Explicit non-goals

- **No AI marriage, birth, or education systems.** Courts are populated at generation
  and maintained by the existing realm tick. This is the genuinely expensive half, in
  design and balance rather than CPU, and it is not in scope.
- **No change to how AI succession law works.** Generated rulers are male today.
  Consorts put women in every court regardless. Whether AI succession stays agnatic is
  a separate decision that this work exposes without forcing.
- **No new renderer work.** `UI.charCardHtml` and `FB.faceTag` are used as they stand.
- **No posthumous sheets for untouched dead.** That is the accepted tradeoff, not an
  oversight.
- **No separate character map.** Rejected above on the strength of the call-site count.
- **No hand-authored skills or traits for authored bookmark rulers.** They keep seeded
  sheets; authoring is a content decision for later.

## As implemented: where the build differs from this plan

Seven decisions the implementation settled that the plan left open or did not foresee.

- **Court scopes key on the world seed and bookmark, not `state.seed`.** `state.seed`
  stores the whole start code, including the player's scenario, province, sex, and name.
  Scoping on it would have made a realm's court depend on what the player called
  themselves, breaking the "same world seed, same political world" promise in
  [seeds.md](../designs/seeds.md).
- **The reigning-ruler index answers misses, not only hits.** Verify-on-hit alone leaves
  every non-ruler paying the full realm scan, which is the whole cost this milestone
  exists to remove. The index is trusted for a miss only while it belongs to the current
  `state` object; a fresh game or a load falls back to scanning until it is rebuilt.
- **Compaction also covers dead rulers and courts whose realm has died.** The plan
  placed compaction in the court-member death path, which `FB.worldTick` bypasses for a
  ruler and which a realm's death takes characters out of entirely. Both leak: one dead
  ruler per realm per generation, plus a whole court each time a realm is conquered.
  Acceptance criterion 5 needs both, so `FB.worldTick` compacts an unretained outgoing
  ruler and the player's mortality pass compacts an unretained former royal.
- **Retention is always read before `FB.killChar`, never after.** That path severs the
  links `FB.courtRecordRetained` consults, so a dead spouse asked about afterwards reads
  as a stranger and loses their record. Both death paths capture the answer first; the
  re-check inside `FB.compactCourtRecord` is a one-way net that can only refuse.
- **No consort backfill for an existing generation**, per this plan's stated preference.
  Old saves gain consorts as generations turn over rather than acquiring a spouse for a
  ruler who has reigned twenty years. A dowager keeps her member entry, stamped with the
  generation she belonged to, and is never read as the sitting consort.
- **Milestone 7 is one shared family index rather than three separate memos.**
  `FB.kinOf`, `FB.spousesOf`, and `FB.stepchildrenOf` read one derived index in
  `js/model.js`, invalidated by `FB.touchFamily` at the family-mutating writers and
  additionally keyed on `state.turn`. `childrenOf`'s reconciliation scan was **not**
  deleted, per this plan's warning; only its per-relative cost was.
- **The consort is not modeled as the mother of the ruler's children.** The compact tree
  gives a member one `parentId`, so char-level maternity would assert a link the
  tombstone layer cannot carry through a compaction or a reload. The court strip labels
  her Consort and the heirs Son/Daughter, which reads correctly without it.

## Acceptance criteria

1. Opening any realm shows a face and a full card for the ruler, plus a consort and
   heirs, with no crest-only fallback for a living realm.
2. Two new games on the same seed produce identical courts, and the non-court world is
   unchanged from a pre-plan build on that seed.
3. `FB.isReigningRealmRuler` agrees with a brute-force realm scan in every tested
   state, including immediately after succession and after a ruler's death.
4. Year-boundary work does not grow with the record count, and is single-digit
   milliseconds on desktop at full court population.
5. Record count after a long run stays near the map-bound figure rather than tracking
   elapsed years, and the save stays close to the measured 1.1 to 1.4 MB.
6. An untouched court member's death leaves a named member entry and no character
   record; a player-married court character's death leaves the record intact.
7. A cultivated heir's sheet is the sheet that takes the throne.
8. An old save loads, gains courts, and saves again with `v` still 3.
9. Loading a save and running forward produces the same world as running the same
   session forward without saving, so the ensure chain consumes no unscoped randomness.
10. The serialized payload contains no ruler index or other derived court data.
11. A dead, unretained, materialized royal already present in an old save survives the
    load rather than being compacted retroactively.
12. Tests authored per the section above and listed in the handoff, unrun.
