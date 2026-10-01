# Eras, polity forms and the bookmark pipeline

Status: proposed, 2026-10-01. Baseline: the 476 branch (v1.188.1 + 476 work).

## Goal

Adding a start date should mostly be data work. A bookmark declares its era,
the government form of each realm, its stories and its starts. The engine
checks that every declared rule has a registered implementation, then compiles
the world from that declaration. New engine code is needed only for a genuinely
new kind of rule, such as a migratory horde, steppe horsemen or a merchant
republic. Each such rule is a self-contained module that later bookmarks can
reuse by id.

Acceptance test for the finished pipeline: a new bookmark that reuses existing
eras, forms and stories needs **no `js/` edits**. Its data file, script tag and
tests are enough.

## Current state

Already data-driven and reusable:

- Bookmark definitions and validation (`FB.validateBookmark`,
  `FB.activateBookmark`, `FB.bookmarks()`); the start-date picker lists every
  registered bookmark.
- `FBDATA.governmentForms` (`territorial`, `roman_civic`, `federate_polity`)
  stored per realm through `FB.authoritySetGovernment`.
- Technology seeded from the date and realm `techTraditions`; unit classes
  gated by technology and culture; rank names per culture
  (`data/cultures.js`); careers gated by `bookmarkIds`; faith systems
  through `FB.faithHasSystem`; `greatHolyWars` and `nonTerritorial` flags.
- `bookmarksAny` event trigger (validated, but unused by any pack).

Hardcoded today (inventory from `grep`):

| Concern | Site | Hardcoding |
| --- | --- | --- |
| County holders | `js/world.js:1532` | `'476'` skips `buildVassals`; everything else is feudal |
| Costume | `js/portrait.js:800,836` | `start.id === '476'` selects Roman dress |
| Vocabulary | `js/i18n.js:684`, `FB.period476Text` | 476-only display overrides |
| Start picker | `js/main.js:2066,2767-2768` | `federate_476` is the only 476 start; 476 hides all others |
| Family presets | `js/main.js:3046-3060` | `federate_476` forces a fixed household |
| Story lifecycle | `js/main.js:3446,3611,3920-4037` | direct calls to `init476`/`situation476Day`/`Season` |
| Story UI | `js/ui_panels.js:1159` | Deeds panel knows only `situation476Status` |
| Scenario hosts | `js/armies.js:4366,4426` | standing hosts and court escort tied to `'476'` |
| Government forms | `js/situation476.js` | forms are assigned in story code, not in bookmark data |
| Settlement layouts | `data/settlements.js` `LAYOUTS` | only `'867'` and `'1066'` |
| Real-place import | `tools/settlement_import.py` | `('867','1066')` in several loops |
| Papacy seeds | `data/papacy.js`, `js/papacy.js:34,157` | keyed by `'867'`/`'1066'`, year-1000 fallback |
| Ambitions | `data/ambitions.js` | `established:['1066']` lists bookmark ids |
| Legacy mods | `js/mods.js:56` | `'1066'` special case (keep; legacy contract) |
| Events | `data/events_*.js` | no era or date gating at all |

Plain `'867'` fallbacks for missing `state.start` are legacy save defaults
and stay.

## Concepts

Four layers, from broadest to narrowest. Each is a data table plus, where
behavior differs, a registered module.

### 1. Era: `FBDATA.eras`

Sets period-wide presentation and defaults, but no territory.

```js
FBDATA.eras = {
  late_antique:  { years:[375, 650], costume:'late_antique',
    vocabulary:'late_antique', defaultGovernment:'territorial',
    greatHolyWars:false, eventEras:['late_antique'] },
  early_medieval:{ years:[650, 1000], costume:'medieval',
    defaultGovernment:'territorial', eventEras:['early_medieval','medieval'] },
  high_medieval: { years:[1000, 1300], costume:'medieval',
    defaultGovernment:'territorial', eventEras:['high_medieval','medieval'] }
};
```

- `costume` selects a portrait wardrobe module (replaces `period476`).
- `vocabulary` names a display-override table: the current
  `period476Text` contents move to `FBDATA.vocabularies.late_antique`.
- `eventEras` decides which event packs load for the era.
- A bookmark field can still override any era default (e.g. `greatHolyWars`).

### 2. Polity form: `FBDATA.governmentForms` (extended)

The existing table grows from consent rules into a complete rule set.
Each field names a **strategy id** that must be registered by engine code:

```js
territorial:     { holders:'feudal_vassals', succession:'dynastic',
  territory:'fixed', civicConsent:'territorial' },
roman_civic:     { holders:'direct', succession:'office',
  territory:'fixed', civicConsent:'delegated' },
federate_polity: { holders:'direct', succession:'acclamation',
  territory:'non_territorial', civicConsent:'delegated' }
// future, each = one new module:
// migratory_horde: { holders:'war_band', territory:'migratory', ... }
// steppe_khanate:  { holders:'tribal_clans', levy:'horse_archers', ... }
// city_republic:   { holders:'patrician_council', succession:'elective', ... }
```

Each realm in a bookmark declares `government:'<form>'` (default from its
era). `FB.initPolitics` calls the form's `holders` strategy in place of the
`'476'` branch; `buildVassals` becomes the `feudal_vassals` strategy and
`direct` is the existing 476 loop. Succession, AI posture, levy and revenue
then dispatch through the same form, one consumer at a time. The
Phase 2 authority queries (`Q.government`) already return the form rules,
so consumers can read them without new state.

### 3. Story: `FB.stories.register(...)`

A story is a saved, bounded situation like the 476 western court. Its
interface is the one `situation476.js` already implements implicitly:

```js
FB.stories.register({
  id:'western_court_476',
  appliesTo:function (state) { ... },   // bookmark + scenario predicate
  init:function (state) { ... },         // once, at campaign creation
  day:function (state) { ... },
  season:function (state) { ... },
  status:function (state) { ... },       // Deeds panel header + lines
  choices:function (state) { ... },
  quote:function (state, id) { ... },
  apply:function (state, id, reviewed) { ... }
});
```

- `main.js` loops over registered stories instead of calling 476 functions.
- `ui_panels.js` renders every active story's status through one shared
  card. The modal currently inside `situation476.js` becomes a shared
  story sheet that follows `docs/designs/ui.md`.
- Story state lives under `state.stories[<id>]`. `state.situation476` is
  migrated on load (save-format concern, see below).
- **World story vs. player track.** A bookmark's world story runs in every
  campaign of that bookmark, for example AI settlement, historical
  campaigns or displaced courts. Player tracks attach to a start scenario.
  `situation476.js` splits into `western_court_476` (world) and
  `federate_track_476` (player). A Nepos start then adds only its own
  track.

### 4. Bookmark: inheritance + declaration

```js
FBDATA.bookmarks['475'] = {
  id:'475', parent:'476', era:'late_antique',
  date:{ year:475, season:1, day:1 },
  overlay:{
    realms:{ italy:{ ruler:{ name:'Julius Nepos', ... } } },
    owners:{ ... },            // only counties whose realm changes
    settlements:{ ... }        // only changed layouts
  },
  stories:['nepos_court_475'],
  greatHolyWars:false
};
```

- `parent` makes the 476 pattern (start from 867, remap) a supported
  mechanism. The compiler flattens parent + overlay into a complete,
  independent definition before validation, so the rest of the engine sees
  ordinary full bookmarks.
- Settlement layouts, curated real-place names, communities, dev, papacy
  seeds and title renames inherit from the parent unless the overlay
  replaces them.
- Scenarios use `bookmarkIds` or `eras`. No scenario id is special-cased in
  `main.js`; a fixed household becomes a scenario field such as
  `familyPresets:['standard']` with authored label text.

## Activation pipeline

`FB.activateBookmark` gains two steps before the existing raster build:

1. **Resolve.** Walk the parent chain, compile the overlay and resolve the
   era. Gather the requirement set: era costume and vocabulary, every
   realm's government form and its strategy ids, stories, event eras and
   technology window.
2. **Check.** Each requirement must be registered. A missing one fails
   `FB.validateBookmark` with a named error, e.g. "Realm `huns` uses
   government `migratory_horde`, whose holders strategy `war_band` is not
   registered." The same check runs in tests for every bookmark and for
   runtime mods.
3. **Build** (unchanged). Raster, provinces and the world cache.
4. **Initialize** (`FB.initPolitics` and campaign creation). The form's
   holders strategy runs per realm; government forms are stored from data;
   technology is seeded by date and traditions (unchanged); institutions
   follow era and faith systems; world stories, then the scenario's
   player track, run `init`.

Runtime then dispatches through the same tables: costume and vocabulary by
era, day and season hooks through the story registry, and holder, succession
and AI behavior through each realm's form.

## Year-keyed data, not bookmark-keyed data

Where a table is really about *when* something existed, key it by year
so any date works:

- Ambitions: `foundedYear` replaces `established:[bookmarkIds]`; a bookmark
  whose date is later than `foundedYear` starts with the ambition already
  established. Keep the old field as an explicit override.
- Papacy regnal seeds: a year-sorted list; pick the latest entry no later
  than the bookmark's date.
- Event packs: `eras:[...]` and optional `years:[from, to]` at the pack level,
  with an optional per-event override. The event index is compiled once at
  activation, so the daily cost doesn't change.

## Save compatibility

- `state.start.id` is unchanged. At creation, stamp `state.start.era` so
  a later edit to bookmark data cannot change a running campaign's era.
  Loading an old save derives the era from its bookmark.
- Migrate `state.situation476` to `state.stories.western_court_476` (+
  track) in save repair, keeping RNG order and outcome flags.
- Government forms already save per realm; data now seeds them at
  creation instead of `init476`.
- Strategy ids, story ids and era ids are stable save ids, like county ids.

## Phases

Each phase preserves 867, 1066 and 476 behavior, and is checked with
owner/holder/ruler parity tests on fixed seeds.

1. **Era and form tables.** Add `FBDATA.eras`; each bookmark declares an era
   and each realm a government. The holders strategy registry replaces the
   `world.js` branch. Costume and vocabulary lookups replace the
   `'476'` checks in `portrait.js` and `i18n.js`. Standing armies key on the
   army's own flag, not the bookmark.
2. **Story registry.** Add `FB.stories`; split `situation476.js` into a
   world story and a player track; main-loop and Deeds-panel dispatch go
   through the registry; the shared story sheet follows the UI review;
   `state.situation476` migrates on load. Remove the `federate_476` special
   cases in `main.js`.
3. **Inheritance.** Add `parent` + `overlay` compilation. Re-express 476 as
   `parent:'867'` with an overlay (validated identical output). Settlement
   layouts and `tools/settlement_import.py` accept any bookmark id and
   inherit from the parent.
4. **Year-keyed tables.** Ambitions, papacy seeds and event-pack era tags.
   Audit which 867/1066 event packs belong to which era.
5. **Requirement check and authoring guide.** Implement the requirement check
   in validation; add `docs/designs/bookmarks.md` and the bookmark schema in
   `docs/MODDING.md`; provide a commented template bookmark.

Content that follows, with no further engine edits:

- **Nepos at Salona** (476 start + `nepos_track_476`).
- **475 bookmark** (`parent:'476'`, `nepos_court_475` story).

Content that needs one new strategy module each:

- Migratory hordes (`territory:'migratory'`, `holders:'war_band'`).
- Steppe horsemen (`holders:'tribal_clans'`, form-specific levy and AI).
- City-states (`holders:'patrician_council'`, `succession:'elective'`).

## Constraints

- Classic scripts, no modules, no template literals, synchronous engine;
  registries are plain objects on `FB`.
- Load order: strategy and story modules load after their dependencies and
  before `main.js`; registration happens at load time, never during play.
- All randomness through `FB.rng`; a strategy must not change draw order
  for existing bookmarks (parity tests guard this).
- Technology impact: the refactor is internal and needs no
  `techImpactReviews` entry. A new form or story that adds a gateable
  capability records its own decision.
- Tests: validator coverage for every requirement error; parity for
  867/1066/476; a test-only mod bookmark proving a data-only addition
  boots without engine changes.
