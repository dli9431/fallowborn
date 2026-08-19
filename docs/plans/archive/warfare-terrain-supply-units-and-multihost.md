# Plan: warfare overhaul — terrain, supply, unit classes, and multiple hosts

Date: 2026-08-18

Status: **phases 1 and 2 implemented** (terrain in battle & movement, supply
lines + attrition; data-driven unit classes with tech/culture gates and
counters; 2026-08-18); **phase 3 implemented** (multiple hosts per realm —
splitting, merging, encirclement; 2026-08-18). This plan organizes
player feedback that warfare does not account
for technology, unit differentiation, terrain, forts, or supply, and lacks troop splitting
and encirclement. It sequences the overhaul into three independently shippable phases:
terrain and supply first, then data-driven unit classes, then multi-host armies.

Related design:
[war](../designs/war.md),
[technology](../designs/tech.md),
[provinces](../designs/provinces.md),
[descent](../designs/descent.md),
[state and saves](../designs/state-and-saves.md), and
[UI](../designs/ui.md).
Any new data, trigger, effect, or balance contract must also be recorded in
[MODDING](../MODDING.md), and every new gateable capability needs a
`FBDATA.techImpactReviews` entry per the technology-impact review rules.

## Direction (confirmed with the owner)

- **Scope**: everything, phased — terrain/supply → units/tech → splitting/encirclement.
- **Units**: genuinely new unit classes unlocked by technology or culture. This is a
  deliberate departure from `docs/designs/war.md` ("tech changes … without introducing
  additional unit classes") and `docs/designs/tech.md` ("they do not add a second unit
  taxonomy"); both docs are updated as part of phase 2.
- **Supply**: supply lines plus attrition (friendly-territory resupply, drain abroad,
  starvation penalties). No supply-train or scorched-earth simulation.

## Global constraints (apply to every phase)

- **Determinism**: all randomness via `FB.rng`/`FB.ri`/`FB.rf`/`FB.pick`. No
  `Math.random()` in game logic.
- **Saves**: format v3 stays stable. Every new field on `state.armies` records,
  `player.war`, or realm records is additive with load-time defaults/repair
  (`FB.armiesEnsure`, `FB.hostUnits`, `inflateState` in `js/save.js`). No version bump.
- **Balance knobs**: all numbers live in `FBDATA.balance` (end of `data/map_data.js`),
  never hardcoded in engine files.
- **i18n**: every new player-facing string routed through `FB.T`/`FB.TC`/`FB.msg` or
  `{token}`-placeholdered event fields, single/double quotes only (no template literals).
  Catalog regeneration (extract/translate/validate) happens only as an owner-requested
  integration step.
- **Tech impact reviews**: every new gateable capability gets an entry in
  `FBDATA.techImpactReviews` (`data/technology.js`) and must pass
  `FB.validateTechnologyData` (`js/technology.js`); new `fx`/`unlocks` keys or consumer
  types are added to the validator.
- **Tests**: author or update Playwright specs per phase with
  `dependsOnRuntime(__filename, [...])` from
  `tests/e2e/support/runtime-dependencies.js`. Agents do not run them; execution is
  owner-controlled.
- **Versioning**: `FB.VERSION`/`FB.CHANGELOG` (`js/main.js` top) are assigned at
  integration, not during implementation.
- Phases land in order; each phase is one coherent, independently shippable change set.

---

## Phase 1 — Terrain in battle & movement; supply lines + attrition

Terrain (`farmland forest hills mountains desert steppe marsh tundra`, `data/counties.js`)
is currently unused by warfare. This phase makes it load-bearing and adds supply.

### 1a. Terrain battle modifiers — `js/armies.js`

- New balance table `FBDATA.balance.terrainBattleFactors`: per-terrain, per-unit-class
  multiplier, e.g. cavalry ×1.15 steppe/farmland, ×0.6 forest/mountains/marsh; archers
  ×1.15 hills/forest; levy ~flat; plus a defender-side terrain bonus
  (`terrainDefenseBonus`: hills/mountains/forest/marsh favor the side defending in that
  province — the host that was there first / holds the county).
- `battlePower` (`js/armies.js:1383`) becomes terrain-aware: compute per-class weighted
  power using the battle province's terrain
  (`FB.world.provinces[host.at].terrain`) instead of the flat `compQuality` average. Keep
  `compQuality` as the terrain-neutral fallback for callers without a location (e.g.
  `namedChance('war_battle')` abstraction).
- Defender determination: the host already stationary (no active leg) counts as defender
  for the terrain defense bonus; tie-break via `FB.rng`.

### 1b. Terrain march cost — `js/armies.js`

- New balance table `FBDATA.balance.terrainMarchMult`: mountains ×2, marsh/tundra ×1.5,
  desert ×1.3, forest ×1.25, hills ×1.15, steppe ×0.9, farmland 1.
- Leg cost in `FB.armyLegQuote`/`findArmyPathFrom` (`js/armies.js:905-1150`) multiplies
  `FB.armyMarchDays` by destination-province terrain factor. The Dijkstra already
  minimizes total days, so hosts naturally route around bad terrain. Sea legs unchanged.
- ETA toasts in `FB.armyTap` and route rendering pick up the new costs automatically.

### 1c. Supply lines + attrition — `js/armies.js`, `js/world.js`

- New per-host field `supply` (0–100, default 100; repaired in `FB.armiesEnsure`).
- Daily in `FB.armyTick` (before march/battle scan):
  - **Resupply** on own/sovereign/allied territory at `supplyRecoverRate` (~3/day), ×1.5
    in a county with a friendly fort (depot effect), reduced on devastated counties.
  - **Drain** in neutral/enemy territory: base `supplyDrainBase` (~1.2/day) × terrain
    factor (desert/mountains/tundra/marsh worse) × winter multiplier (existing season
    system) × (1 + `supplyDistanceDepth` × BFS distance from nearest friendly county —
    one reverse-BFS distance map from all friendly counties per realm per tick,
    O(provinces)).
  - Clamp 0–100. At 0 supply: daily attrition via `FB.applyHostLosses`
    (`supplyAttritionPerDay`, scaled by host size) and a battle-power penalty
    (`supplyStarvedPowerMult` ~0.75) in `battlePower`; below `supplyLowThreshold` a
    milder penalty.
- Besieging hosts drain at the enemy-territory rate — long sieges now need supply
  management; fold into existing siege attrition, don't double-dip.
- Reinforcement (`armies.js:1609-1622`, levy-only) additionally gated on `supply > 0`.
- New tech `fx` key `supply` (scalar, cap in `FBDATA.techCaps`) wired into drain/recover;
  grant it to 2–3 existing appropriate innovations in `data/technology.js`; add the `fx`
  key to the validator's accepted list.
- `techImpactReviews` entries: `field_supply_attrition` (soft, supply techs) and
  `terrain_combat_modifiers` (none).
- UI: Land-tab host readout (`ui_panels.js:4069-4151`) gains a supply line with a plain
  status (Good/Low/Starving) plus an ETA-to-attrition hint; `FB.warStateText`
  (`events.js:3091`) mentions starvation when active; a news line via `FB.msg` fires when
  a player host hits 0 supply.
- AI hosts use identical rules (same tick path).

### 1d. Tests (authored, not run)

- New `tests/e2e/specs/army-terrain-supply.spec.js`: deterministic game; assert a
  mountain leg costs more days than a farmland leg; assert a cavalry-heavy host loses a
  plains-vs-forest power comparison; assert a host deep in enemy land loses supply daily,
  refills at home, and takes attrition at 0; `dependsOnRuntime` on `js/armies.js`,
  `js/world.js`, `js/fortifications.js`, `data/map_data.js`, `data/counties.js`,
  `data/technology.js`.

---

## Phase 2 — New unit classes: tech & culture unlocks, counter mechanics

### 2a. Data-driven unit classes — new `FBDATA.unitClasses`

- Table keyed by class id (new `data/units.js` loaded with the data files, or an
  extension of an existing data file — decide by fit; `docs/MODDING.md` updated):
  `{name, icon, quality, upkeepPer100, casualtyOrder, counters:{<classId>:<mult>},
  terrainFactors:{...} (override of the phase-1 defaults), requiresTech?,
  cultures?/notCultures?}`.
- Migrate the existing five (`levy, arch, cav, ret, mercs`) into this table as the
  baseline; the table becomes the single source of truth for quality/upkeep/casualty
  order.
- Initial new classes (modest set, all gateable):
  - `crossbow` — requiresTech `crossbows`; strong counter to heavy foot, slow vs `cav`.
  - `pike` — tech-gated; hard counter to `cav`, weak to `arch`.
  - `horsearcher` — `cultures: [magyar, turkic]`; steppe/desert affinity, counters
    `levy`/`arch`.
  - `huscarl` — `cultures: [norse, english]`; heavy foot, counters `cav`.
  - `camel` — `cultures: [arabic, berber]`; desert affinity, counters `cav` in desert.
  - `cataphract` — `cultures: [greek, armenian]` + tech req; super-heavy cav, weak to
    `pike`.
- `techImpactReviews` entries: `new_unit_classes` (hard where `requiresTech` applies,
  fallback: baseline five classes) and `culture_unit_classes` (soft/none as appropriate).

### 2b. Engine integration — `js/armies.js`, `js/technology.js`, `js/world.js`

- `units` records gain new keys; `FB.hostUnits` migration (`armies.js:47`) defaults
  missing classes to 0. `men` remains the total.
- `FB.compQuality`, `FB.applyHostLosses` (casualty order from the table), upkeep
  (`playerHostUpkeepParts`), and `FB.techUnits`/`FB.techAIUnits` all read from
  `FBDATA.unitClasses` generically instead of hardcoding five fields.
- Counter mechanics in `resolveBattle` (`armies.js:1420`): each side's counter multiplier
  = weighted average of `counters[enemyClass]` over enemy composition shares, capped by a
  new `battleCounterMaxSwing` (~±20%) so counters swing battles without overwhelming
  numbers and martial.
- Unlock plumbing: `FB.playerComposition`/`playerMusterPlan` (`world.js:5444-5612`,
  `armies.js:660`) and `aiFracs`/`FB.aiHostQuality` (`armies.js:118-136`) gain unlocked
  classes — player composition picks up culture/tech classes automatically; AI realms key
  on capital culture + completed techs. Mercs unchanged.
- Validator (`js/technology.js:1390-1762`): `unlocks: 'unit:<id>'` entries validated
  against `FBDATA.unitClasses`; `cultures` gating on unit classes validated against
  `FBDATA.cultures`.

### 2c. UI & docs

- Host composition readout and muster preview show the new classes with icons; verify the
  war ledger `lossesByClass` is key-generic.
- Update `docs/designs/war.md` and `docs/designs/tech.md`: the "no second unit taxonomy"
  stance is replaced by the data-driven unit-class design.

### 2d. Tests (authored, not run)

- New `tests/e2e/specs/army-unit-classes.spec.js`: data-table integrity (validator
  passes, tech/culture ids resolve); a pike-heavy defender beats a cavalry-heavy attacker
  at equal numbers; a culture-gated class is absent for the wrong culture.
- Update `technology-impact-gates.spec.js` if validator schema changes require it.

---

## Phase 3 — Multiple hosts per realm: splitting, merging, encirclement

Largest change: breaks the one-host-per-sovereign invariant (`FB.hostOf`/`hostByRealm`,
`armies.js:587+`). AI scope kept tight: only large realms field a second host.

### 3a. Multi-host core — `js/armies.js`

- `state.armies` is already an array of per-host records — allow N per realm. Replace the
  `hostByRealm` map with `hostsByRealm` (realm → array); keep `FB.hostOf` returning the
  primary (largest) host for legacy single-host callers, and migrate genuine per-host
  consumers (movement, battle scan, fort pinning, supply are already per-host records).
- Split: new player order — split the selected host into two by chosen class/men share
  (min `armyMinMen` 40 each); detachments inherit supply proportionally; `manual` control
  per host. Merge: two friendly hosts of the same realm on one province can merge.
- Rearm/`armyDown`, `musterPool`, and demuster semantics apply to the primary host;
  destroyed detachments trigger a shorter `detachmentRearmDays` cooldown, not the full
  rearm wait.
- Battle scan (`armies.js:1624-1642`) already pair-scans hostile hosts per province and
  extends naturally; one clash per province per day is retained, aggregating allied hosts
  of the same side (matching the existing `allied` folding).
- Encirclement: a host is **cut off** when every adjacent land province is hostile-held,
  enemy-occupied, blocked by a hostile unbreached fort, or impassable water beyond sea
  capacity. A host shattered while cut off is destroyed outright (not routed home), with
  an elevated ruler-capture chance (`captureChanceEncircled` > `captureChanceBase`).
  Shown on the host marker and Land tab.
- Retreat legality: `aiGoal` and rout auto-orders route only to reachable friendly
  counties (reuse the phase-1 friendly-distance BFS).
- AI: realms above an `aiMultiHostStrength` threshold may raise a detachment during
  offensive wars; `aiGoal` extended so detachments screen or siege while the main host
  hunts. Cap hosts per realm at `aiMaxHosts` (2).
- War-council grounding checks (`war_can_siege`, `enemyHostInPlayerLandsArmy`,
  `namedChance('war_battle')`, military command at `armies.js:158-279`, GHW hooks in
  `js/holywar.js`) audited per call site to use "any qualifying host" vs "primary host"
  deliberately. Grep-driven migration list: every `FB.hostOf(`, `hostByRealm`, and
  `state.armies` filter in `js/armies.js`, `js/world.js`, `js/fortifications.js`,
  `js/holywar.js`, `js/agency.js`, `js/intrigue.js`, `js/ui_panels.js`,
  `js/ui_modals.js`, `js/ui_topbar.js`, `js/mapview.js`.
- Saves: detachments are ordinary extra records in `state.armies`; `FB.armiesEnsure`
  drops orphaned or invalid hosts on load. No format change.
- `techImpactReviews` entry `host_splitting_encirclement` (`none` — core play, no
  credible tech dependency, per the ledger rules).

### 3b. UI — `js/mapview.js`, `js/armies.js` markers, panels

- Markers: one per host; a stacked-count badge when same-realm hosts share a province;
  tap cycles selection among co-located hosts; split/merge controls on the selected-host
  card in the Land tab; a cut-off warning chip.
- Mobile tap flow kept: tap host → tap destination; split/merge via host-card buttons
  (keyboard-accessible per `docs/designs/ui.md`).

### 3c. Tests (authored, not run)

- New `tests/e2e/specs/army-splitting.spec.js`: split produces two hosts of at least
  minimum men with proportional supply; merge recombines; an encircled host is destroyed
  on shatter with a capture roll; save/load round-trip preserves detachments; an AI realm
  above the threshold fields a second host in an offensive war.
- Update `war-campaign-feedback.spec.js` / `fortifications.spec.js` only if the grounding
  semantics they assert change.

---

## Delivery & verification

- Implement phase by phase, in order; each phase ends with its docs updates, its
  `techImpactReviews` entries, and its specs in the same change set.
- Verification per phase: re-read the touched engine paths, confirm determinism (no
  `Math.random()`), confirm validator acceptance via the authored spec expectations, and
  confirm saves remain additive. Test execution stays owner-controlled; the handoff lists
  authored or updated specs and states they were not run.
- No `FB.VERSION`/`FB.CHANGELOG` changes and no i18n catalog regeneration; those happen
  only when the owner requests a commit or merge to `main`.
