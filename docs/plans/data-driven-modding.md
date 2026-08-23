# Plan: expand data-driven modding safely

Status: active; milestones 0–3 implemented
Baseline: Fallowborn v1.145.2, 2026-08-22

## Purpose

Fallowborn already keeps most authored content and tuning in `FBDATA`, while JavaScript
owns simulation, persistence, rendering, and the vocabulary that data may invoke. This
plan identifies the remaining hardcoded catalogues that would unlock the most useful mod
content without invalidating existing save-format-3 lives.

The guiding distinction is:

- **Data definitions** describe identities, requirements, costs, effects, presentation,
  and authored content that a mod may add or replace.
- **Engine behavior** owns deterministic sequencing, validation, state transitions,
  repair, routing, simulation, and UI behavior.

The goal is not to move every algorithm into JSON. The goal is to expose the remaining
content-shaped registries while leaving correctness-sensitive machinery in code.

## Current boundary

The public mod loader in [`js/mods.js`](../../js/mods.js) already merges a broad set of
tables over `FBDATA`: world and bookmark definitions, events, cultures, religions,
traits, ailments, modifiers, buildings, forts, holdings, items, technologies, unit
classes, careers, positions, schooling, enterprises, travel, finance, political
institutions, Papacy configuration, currency, and balance.

Consequently, nearly every large gameplay system is a hybrid:

- its catalogue and numeric tuning are data-driven;
- its lifecycle, state machine, formulas, and accepted schema are hardcoded.

This is the desired architecture for war, population, markets, travel, technology,
politics, Papacy, holy wars, succession, save repair, and UI. Their algorithms should
remain code. The remaining opportunities are mostly catalogues that are already shaped
like data but still live inside an engine file.

## Items are already data-driven

Items do not need a general hardcoded-to-data conversion. `FBDATA.items` in
[`data/map_data.js`](../../data/map_data.js) is exposed through the runtime mod key
`items`, and its schema is documented in [MODDING.md](../MODDING.md#items).

A mod can already define:

- unique heirlooms or repeatable exact instances;
- common, fine, famed, or legendary rarity;
- value, equip slot, two-handed grip, and minimum age;
- base effects and quality-scaled effects;
- procedural art kind, colors, materials, patterns, gems, and other supported art
  parameters;
- ordinary stock eligibility or `eventOnly` acquisition;
- legendary artifact gates by faith, culture, kingdom, empire, and sacred status;
- negative as well as positive artifact effects;
- direct acquisition through the ordinary `giveItem` event effect.

The engine in [`js/items.js`](../../js/items.js) deliberately remains code-driven. It
owns exact instance references, quality rolls, ownership, loadouts, two-handed
assignment, gifting, pledging, sale, shops, artifact uniqueness, and procedural drawing.
Existing saves depend on those invariants.

### Item rules that remain hardcoded

- The fixed loadout slots and left/right hand representation.
- The quality ids, ordinary quality weights, value multipliers, and rarity ordering.
- The recognized item effect keys and which wearer receives each effect.
- The peddler societal-role order and generic stock-selection algorithm.
- The set of procedural `art.kind` renderers.
- Barber hair and beard catalogues, which are cosmetic character appearance rather than
  item definitions.
- The fixed Author-work pool in `AUTHORED_WORKS` inside
  [`js/economy.js`](../../js/economy.js).
- Ownership and departure behavior for gifts, sales, collateral, raids, and artifacts.

### Safe item follow-ups

The highest-value item follow-ups do not change the item state shape:

1. Replace `AUTHORED_WORKS` with an item tag or named acquisition pool, such as
   `tags:["authored_work"]` or `itemPools.authoredWorks`. This lets mods add authored
   books without editing economy code.
2. Add optional definition tags or acquisition pools for loot, peddlers, war spoils,
   raids, auctions, and life-path rewards. Preserve rarity and `eventOnly` as the
   compatibility defaults.
3. Move quality definitions and peddler role ordering into a validated
   `FBDATA.itemRules` table only if mods need to retune them. Preserve the baseline
   `plain`, `well`, and `masterwork` ids and their current meaning for exact saved
   instances.
4. Move barber catalogues to a separate cosmetic table if appearance modding becomes a
   goal. Do not mix them into `FBDATA.items`.

Adding arbitrary equip slots is not a safe early target. Loadout keys are saved, UI and
portrait layouts assume the current slots, and two hands have special assignment rules.
New effect keys and new procedural art kinds also require engine consumers, so they
should remain explicit code extensions rather than pretending that unimplemented data
is generic.

## Priority and risk

| Priority | Candidate | Modding effect | Existing-save safety | Implementation risk |
| --- | --- | --- | --- | --- |
| 1 | Starting scenarios and family presets | Very high | Very high | Medium |
| 2 | Religious progression paths | High | High with stable ordering | Medium |
| 3 | Missing mod keys and small registries, including item pools | Medium collectively | Very high | Low |
| 4 | Royal Council seat definitions | Medium-high | High with baseline ids | Medium |
| 5 | Focus and deed catalogue | Extremely high | Medium-high | Very high |
| Avoid | Core simulation algorithms | Low relative to risk | Low | Very high |

## Milestone 0: expose existing data and small registries

Start with changes that add no new saved fields and do not alter engine sequencing.

### Runtime mod coverage

- Add a validated `intrigue` mod key for the existing `FBDATA.intrigue` method profiles,
  AI limits, cooldowns, and ransom tuning.
- Add a validated `raidingTraditions` mod key for the existing culture and faith lists.
- Audit every remaining top-level `FBDATA` table against `M.apply` and document whether
  it is public, generated-only, or intentionally internal.

### Small source registries

- Move `AUTHORED_WORKS` to an item tag or item-pool definition.
- Move the AI ruler-trait pool to data while retaining the same ordered baseline list.
- Consider data-backed barber catalogues as an independent cosmetic feature.

These changes are additive configuration only. Unknown data should fail validation at
mod application, before a world is generated or a save is restored.

### Milestone 0 implementation

Implemented on 2026-08-22:

- `intrigue`, `raidingTraditions`, `itemPools`, and `rulerTraits` are validated public
  runtime-mod keys. Same-mod item, plot-profile, culture, faith, and trait references are
  resolved before any mutation.
- `FBDATA.itemPools.authoredWorks` owns the unchanged ordered Author-work catalogue;
  economy code retains the same seeded pick and grant sequence.
- `FBDATA.rulerTraits` owns the unchanged ordered generated-ruler pool, with
  `FB.RULER_TRAITS` retained only as a refreshed compatibility alias.
- Player and AI raid eligibility share `FB.hasRaidingTradition`, including the existing
  `faithGroups` list instead of an engine-only pagan literal.
- `docs/designs/mods.md` records the complete top-level `FBDATA` audit. Unknown
  top-level runtime-mod keys, generated-only tables, internal aliases, malformed new
  registries, and unresolved new cross-references fail before application.
- Barber catalogues remain deferred. Their ids cross saved appearance, picker semantics,
  and portrait renderer support, so exposing their arrays alone would not be safe
  cosmetic modding.

No save-format field or technology-impact entry was required: this milestone exposes
configuration without changing baseline gameplay eligibility or RNG sequencing.

## Milestone 1: starting scenarios and family presets

Move `G.SCENARIOS` and `G.FAMILY_PRESETS` from
[`js/main.js`](../../js/main.js) to:

- `FBDATA.startScenarios`;
- `FBDATA.familyPresets`.

This unlocks custom beginnings, starting professions, resources, skills, family shapes,
property, and roleplaying setups. Starts are unusually safe because their definitions
are consumed when creating a new campaign. The resulting character, family, property,
career, and realm are then ordinary materialized state.

### Scenario schema

Retain the current presentation and basic fields:

- stable `id`, localized `name`, `desc`, and introduction variants;
- `tier`, `profession`, starting gold, prestige, and piety;
- optional sex restriction, focus, and skill adjustments.

Replace the current `farmer`, `soldier`, and `knight` identity branches with generic
creation fields or a bounded start-effects record:

- initial land plots and holdings;
- career rank and experience;
- initial flags and war-service state;
- exact starting items or item pools;
- skill adjustments;
- optional focus.

The start-effects vocabulary must be narrower than arbitrary event effects. It should
only create state that the ordinary fresh-game constructor already knows how to
validate.

### Family-preset schema

Retain stable id, age, spouse age range, child count range, eldest-child minimum age,
and presentation. New presets may add ordinary supported household shapes, but they may
not inject prebuilt character objects.

### Compatibility rules

- Never remove or rename the baseline scenario and preset ids.
- Preserve the starting tier of every baseline scenario because progression repair
  consults it when restoring old lives.
- Preserve the current definition of the `standard` family preset and the existing
  start-code field order.
- A mod may replace or add definitions, but the validator must reject malformed tiers,
  professions, focus ids, item ids, and family ranges.
- Moving the definitions must not add RNG draws or change their order for any baseline
  start code.

No save-format bump is required.

### Milestone 1 implementation

Implemented on 2026-08-22:

- `data/starts.js` owns the seven baseline `FBDATA.startScenarios` and three baseline
  `FBDATA.familyPresets`; `main.js` retains only compatibility aliases and constructor
  behavior.
- Scenario-id branches for Free Farmer land and Soldier/Hedge Knight equipment are
  replaced by bounded `startEffects`: land plots, holdings, career rank/experience,
  scalar flags, war service, exact items or named item pools, skill adjustments, and
  focus.
- Runtime mods may add or completely replace definitions. Validation protects baseline
  ids and tiers, the historical `standard` family meaning, supported household ranges,
  and same-mod career, holding, item, pool, focus, slot, and rank references before any
  mutation.
- Baseline exact-item starts preserve their grant order and RNG sequence. Unmarried
  presets add no family draws; a named item pool adds one explicit seeded selection.
- Scenario and family display fields have stable structured-localization owners, while
  untranslated mod prose continues to fall back to its effective English source.

Save format remains 3. No technology-impact ledger entry is required: this is a modding
and authoring boundary applied before a world exists, and it does not change baseline
gameplay eligibility.

## Milestone 2: religious progression paths

Move `RELIGIOUS_PATHS` from [`js/economy.js`](../../js/economy.js) to
`FBDATA.religiousPaths`. Move the hardcoded faith/profession routing into religion
properties, for example a faith's lay, monastic, clerical, or scholarly path ids.

Each path should define:

- stable path id and ordered ranks;
- localized rank names, including optional gendered forms;
- age, experience, skill, gold, prestige, and piety requirements;
- seasonal piety yield;
- station, tier, and compatibility flags;
- optional faith or profession requirements.

The engine should continue to own advancement, resource payment, state repair, and
promotion side effects.

### Compatibility hazard: numeric rank indexes

Characters currently store `religiousRanks[pathId]` as a numeric rank index. Therefore:

- existing rank order must never change;
- each new rank should also receive a stable id;
- restore must continue accepting the legacy numeric index;
- a future stable-rank-id field may be added lazily, but the numeric fallback must
  remain;
- missing mod paths become inactive without deleting their saved progress.

The baseline paths and ranks should be required by validation. Mods may add paths and
replace presentation or costs, but removing a baseline rank is unsafe.

### Milestone 2 implementation

Implemented on 2026-08-22:

- `FBDATA.religiousPaths` in `data/economy.js` owns the six unchanged Catholic and
  Muslim ladders. Every rank has a stable id and localized default/female name while
  retaining its historical numeric position, gates, rewards, yield, station, tier, and
  compatibility flag.
- Effective religion `properties.religiousPaths` route a lay path and exact profession
  ids to vocation paths. Optional path-level faith ancestors, faith-system capabilities,
  and professions bound reusable paths without returning routing switches to the engine.
- Runtime mods may add or completely replace paths. Validation resolves same-mod paths,
  faiths, and careers, protects every baseline rank prefix, bounds rank requirements and
  side effects, and rejects malformed religion routes before mutation.
- The engine continues to own advancement, resource payment, contested Abbot/Bishop
  appointments, tier/station changes, compatibility mirrors, repair, and seasonal piety.
  Stable core path/rank ids keep those special consumers explicit.
- Save format remains 3. Legacy numeric rank indexes restore unchanged, appended ranks are
  safe, and a missing path becomes inactive without deleting its saved progress. No RNG
  sequence changes.
- Religious rank localization uses stable path/rank owners; untranslated mod rank names
  fall back to their effective authored English.

No technology-impact ledger entry is required: this exposes existing progression content
to validated data and mods without changing baseline gameplay eligibility.

## Milestone 3: Royal Council definitions

Centralize the five hardcoded seats from [`js/council.js`](../../js/council.js) and their
separate UI name/description switches into `FBDATA.councilSeats`.

The initial data boundary should cover:

- stable id, localized name and description;
- icon;
- basic bonus key and amount;
- activation tier and ordinary holder eligibility;
- schemer-trait classification, either on the seat table or in a neighboring Council
  rules table.

This is save-safe because `state.council.seats` is already keyed by stable seat id.
Preserve all five baseline ids. Added seats default to generic vacancy, appointment,
Standing, and effectiveness behavior.

Do not claim all seats are generic in the first pass. Treasurer, constable, almoner,
and chamberlain still have explicit event, institution, and special-effect consumers.
Those references should keep working through stable ids. A later capability registry
may replace them only after every consumer has a declared data contract.

### Milestone 3 implementation

Implemented on 2026-08-22:

- `FBDATA.councilSeats` in `data/political_institutions.js` owns the five baseline office
  definitions: stable id, localized name and description, icon, basic bonus, activation
  tier, and direct-vassal holder eligibility. The protected baseline ids are unchanged.
- `FBDATA.councilRules.schemerTraits` owns the former engine-only classification list.
  Runtime mods may add or completely replace seats and atomically replace the rules
  record. Validation bounds every field, resolves same-mod trait references, and rejects
  malformed records before mutation.
- Council engine, governance, institution, action, and modal consumers enumerate active
  definitions through shared data-backed accessors. Added seats receive the generic
  vacancy, appointment, Standing, effectiveness, and bonus flows; special Treasurer,
  Constable, Almoner, and Chamberlain behavior continues through stable ids.
- Seat names and descriptions use stable structured-localization owners and untranslated
  mod text falls back to its effective English source.
- Save format remains 3. Council holders remain keyed by seat id; a missing definition is
  ignored without deleting its saved value, so restoring the same mod reactivates it.

No technology-impact ledger entry is required: this exposes the existing Council
capability to validated data and mods without changing baseline gameplay eligibility.

## Milestone 4: staged focus and deed definitions

Focuses and one-time deeds in [`js/actions.js`](../../js/actions.js) offer the greatest
eventual modding payoff, but their current definitions contain executable `show`, `tick`,
`can`, `gain`, and `run` callbacks. They cannot safely move wholesale into JSON.

Use four stages:

1. Move presentation, ordering, grouping, cooldown, and simple static gates into
   `FBDATA.focuses` and `FBDATA.deeds`.
2. Bind each baseline definition to an existing stable JS `handler` id.
3. Add declarative triggers, costs, gains, and effects by reusing only validated pieces
   of the event trigger/effect vocabulary.
4. Permit fully new mod actions only after deterministic execution, UI preview parity,
   automation scoring, and test coverage are complete.

Saved focus and cooldown references already use action ids. Compatibility still
requires every baseline id to remain, unknown focuses to fall back through
`FB.validateFocus`, and unknown cooldown keys to remain inert.

The main risk is not the save shape. It is preserving deterministic RNG order, daily
timing, cost previews, automation choices, tutorial completion, and special UI flows.

## Save-compatibility contract for every milestone

1. Keep save format at version 3.
2. Preserve every existing stable id and its baseline meaning.
3. Prefer additive tables and fields. Missing data means the current default.
4. Never depend on array position when a stable id can be stored or derived.
5. Preserve legacy numeric indexes where they already exist.
6. Unknown removed-mod records become inert or fall back safely. Do not silently
   retarget them to another definition.
7. Validate cross-references before world activation or restore.
8. Preserve RNG draw count and order for unchanged baseline content.
9. Keep rendered prose out of saved state.
10. Require tests for old-save restore, mod add/replace behavior, malformed definitions,
    deterministic baseline starts, and missing-definition fallbacks.

## Systems that should remain code-driven

Do not data-drive these merely to increase the number of mod keys:

- daily, seasonal, and yearly sequencing;
- world rasterization, adjacency, and routefinding;
- market production, demand, flow, and price algorithms;
- population growth, migration, and loss allocation;
- battle, siege, host movement, occupation, and war resolution;
- character identity, kinship, marriage wiring, pregnancy, mortality, and succession;
- save serialization, compaction, migrations, and repair ordering;
- ownership mutation for items, property, contracts, and realms;
- UI layout, keyboard/touch behavior, portraits, heraldry, and procedural art renderers;
- the mod merge and validation machinery itself.

These systems should consume data and balance tables, but their invariants belong in
reviewable JavaScript.

## Delivery order

1. Finish missing mod-key coverage and small registries, including item acquisition
   pools.
2. Move family presets and start scenarios into validated data.
3. Move religious paths and localized rank names into validated data.
4. Centralize Council seat definitions while retaining special consumers by stable id.
5. Build the staged focus/deed schema.
6. Leave core simulation and persistence algorithms in code.

This order produces useful modding surface at every milestone while keeping all changes
additive for existing saves.
