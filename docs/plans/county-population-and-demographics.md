# Plan: county population and lightweight demographics

Date: 2026-08-16

Status: proposed

Baseline: Fallowborn v1.134.1

Related designs: [provinces](../designs/provinces.md),
[development](../designs/development.md), [holdings](../designs/holdings.md),
[markets](../designs/markets.md), [technology](../designs/tech.md),
[war](../designs/war.md), [time](../designs/time.md), and
[state and saves](../designs/state-and-saves.md), plus the
[UI contract](../designs/ui.md).

## Purpose

Add population to the world as a county-level economic and demographic quantity without
turning named characters into anonymous agents or adding a daily simulation burden.
Population should make farms, infrastructure, technology, war, taxation, levies, and
migration speak to one another. It should remain deterministic, inspectable, safe for old
saves, and cheap enough to run for the whole map in Observe mode.

The first release should model how many people live in each county. It should not yet model
every person's age, occupation, household, culture, or faith. Those details belong either
to the existing named-character simulation or to a later aggregate-share layer.

## Current truth

Fallowborn currently has two partial substitutes for demographics, but no aggregate
population simulation:

- Named characters are born, age, marry, reproduce, travel, and die. Court retention is
  deliberately bounded, so this is a political cast rather than a census.
- A county's `communities` list is an ordered, static list of culture and religion pairs.
  It records presence, not population shares, conversion, migration, or birth rates.
- `state.player.pop` and building `pop` effects mean Common Voice or popular opinion. They
  must not be reused for population.
- Economic development is deliberately an economic-development score, not a population
  estimate. Taxes, levies, markets, settlement visibility, and realm strength currently
  use development as their principal county-scale proxy.

Population should therefore become a new quantity beside development:

- **development** describes productivity, specialization, infrastructure, and economic
  complexity;
- **population** describes the number of people who can work, consume, migrate, and be
  harmed by war or crisis;
- **named characters** remain the small set of politically important people;
- **communities** remain static presence data until a later, separately scoped share model.

## Goals

1. Give every inhabited county one visible integer population.
2. Update the whole map once per year with no random drift.
3. Make carrying capacity respond to suitable buildings, terrain, and agricultural
   technology.
4. Make war and explicit crises reduce population, with granaries and fortifications
   providing appropriate protection.
5. Let peaceful counties attract limited population from less attractive neighbors while
   conserving the world total during migration.
6. Let population influence tax, levies, and market demand through bounded adapters that
   preserve current opening balance.
7. Derive settlement population on demand instead of simulating a second population layer.
8. Keep the annual pass linear in counties, buildings, and adjacency edges.
9. Provide deterministic migration for old saves rather than replaying unrecorded history.

## Non-goals for the first release

- No individual peasant, household, occupation, age-pyramid, fertility, or sex-ratio
  records.
- No daily or seasonal population tick.
- No random yearly growth or decline.
- No attempt to infer exact historical populations for all counties before the mechanic is
  useful. Curated exceptions can improve the deterministic fallback over time.
- No dynamic culture or religion percentages in the initial schema.
- No field-battle deaths deducted from a county until hosts have a truthful saved origin or
  recruitment provenance.
- No replacement of economic development, current settlement reveal thresholds, or the
  named-character birth and mortality systems.
- No immediate rewrite of all tax and levy formulas around raw head counts.

## Player-facing model

The Land view should answer four questions without exposing the entire formula:

1. **How many people live here?** Show a rounded count, such as `42,300`.
2. **Is the county growing?** Show the current year's net change and percentage.
3. **Why did it change?** Break the result into natural growth, migration, and crisis or
   war losses.
4. **What can I do?** List the largest capacity, attraction, and protection contributors.

Example:

> Population 42,300
>
> This year +280 (+0.7%): natural +190, migration +90
>
> Near its supported capacity of 46,000
>
> Watermills +10% capacity, Granary -35% famine losses, Market +2 attraction

Population changes should normally appear in the Land view rather than Chronicle spam.
Only exceptional losses in a directly held or occupied player county should create a
Chronicle entry. A configurable threshold of 2% in one incident is a suitable default.

## State and data contract

### Saved county state

Add one additive top-level record:

```js
state.population = {
  schema:1,
  lastYear:867,
  counties:{
    york:{ count:42300, natural:190, migration:90, losses:0 }
  }
};
```

- `count` is an integer number of people and is the only authoritative current total.
- `natural`, `migration`, and `losses` are the signed components since the most recent
  annual pass. `losses` is zero or negative and accumulates explicit incidents during the
  year.
- The visible annual delta is their sum. Do not save a redundant total.
- `lastYear` makes the yearly update idempotent when a Spring save is reloaded.
- `schema` supports future additive migration without changing the existing save version.
- Every ordinary inhabited county receives a record. Wasteland or special non-county map
  entries remain absent unless they can be owned and settled under current province rules.

At roughly 500 counties and four small integer fields, this is intentionally modest beside
the existing save. The implementation target is less than 60 KB of additional minified
JSON for an ordinary full-map save.

### Province seed data

Support two optional province fields in `data/counties.js`, bookmark overrides in
`data/bookmarks.js`, and runtime mods:

```js
population0:42000,
populationCapacity0:48000
```

Both are positive integers. `population0` is the active bookmark's opening count and
`populationCapacity0` is the capacity before buildings and technology. Bookmark-specific
province overlays may replace them just as they replace other start conditions.

Most counties should use deterministic fallbacks initially. Authored values are reserved
for well-supported regional exceptions, especially major urban and irrigated centers, and
must not be presented as a precise census.

### Deterministic fallback

Add the following balance table, indexed by development 1 through 10:

```js
populationFloor:1000,
populationByDevelopment:[6000,10000,16000,24000,35000,49000,67000,90000,120000,155000]
```

When `population0` is absent:

```text
opening population = populationByDevelopment[dev0 - 1] * terrain population factor
opening capacity   = opening population / 0.85
```

Use the six existing terrain ids with these first-pass factors:

| Terrain | Factor |
| --- | ---: |
| `farmland` | 1.00 |
| `forest` | 0.85 |
| `hills` | 0.80 |
| `steppe` | 0.75 |
| `marsh` | 0.65 |
| `desert` | 0.55 |

Use the actual terrain ids already present in province data and define every id explicitly
in one table. Unknown mod terrain must safely fall back to `1.00`. Round opening values to
the nearest 100 and clamp capacity to at least the opening population.

An inhabited county cannot fall below `populationFloor`. This is a gameplay safeguard for
a surviving remnant, not a claim that every historical county always retained exactly one
thousand people.

This table is a gameplay scale, not a historical claim. Before release, inspect its output
by region and author exceptions only where the fallback produces an obviously misleading
world hierarchy.

### Public helpers

Put the subsystem in a new `js/population.js` module and expose a small API:

```js
FB.ensurePopulationState(state)
FB.countyPopulation(state, pid)
FB.countyPopulationBaseline(state, pid)
FB.countyPopulationCapacity(state, pid)
FB.countyPopulationFactor(state, pid)
FB.countyMigrationAttraction(state, pid)
FB.changeCountyPopulation(state, pid, amount, cause)
FB.changeCountyPopulationRate(state, pid, rate, cause)
FB.populationYear(state)
FB.settlementPopulation(state, pid, settlementIndex)
```

All mutating entry points validate finite numbers, round to integer people, clamp to the
county floor, and return the actual applied change. No caller edits `count` directly.

Use `population...` in all new schema keys. Never abbreviate population as `pop`, because
that word already means Common Voice throughout the game.

## Annual simulation

Run `FB.populationYear(state)` once near the start of `FB.worldTick`, after its state
preconditions and before any yearly war or world-system mutations. The function first
ensures state, then exits when `lastYear` already matches the current calendar year. This
ordering resets the current-year component ledger before a yearly capture or crisis can
add a loss. It runs in ordinary play and Observe mode.

The pass has three deterministic stages. Every stage computes into temporary delta maps;
no county observes an already-updated neighbor from the same year.

### Stage 1: capacity and natural growth

For each county:

```text
P = current population
K = current carrying capacity
r = 0.020 annual natural-growth coefficient
pressure = clamp(1 - P / K, -0.50, 1.00)
natural = round(P * r * pressure)
natural = clamp(natural, -round(P * 0.01), round(P * 0.02))
```

This is a bounded logistic step. A county at 85% capacity grows about 0.3% in an ordinary
year, a county at capacity is stable, and an overburdened county declines slowly without a
random roll. Explicit disasters remain separate and can be much larger.

`K` is calculated from the province's base capacity, terrain already represented in that
base, completed unruined buildings, and realm technology:

```text
K = round(base capacity * (1 + building capacity + technology capacity))
```

Clamp the combined building bonus to `+40%` and the technology bonus to `+35%`. Do not use
current development directly in this yearly capacity calculation. Development determines
the opening scale and continues to model economic productivity; direct use every year
would double-count the buildings that already raise development.

### Stage 2: migration

Migration is a two-pass, conserved adjacency flow. It must use the stable county-id and
adjacency ordering already supplied by the world layer.

Calculate one attraction score for each county:

```text
attraction = 0
  + building attraction
  + technology attraction
  + 2 when population is below 80% of capacity
  + 1 when population is below 95% of capacity
  - 3 when the county is occupied or under active siege
  - 2 when its owner is at war
  - 2 when an active severe market shock targets the county
```

The capacity terms are piecewise: use `+2` below 80%, otherwise `+1` below 95%, otherwise
zero. Do not add both capacity terms to the same county.

For each undirected land adjacency edge, move population only when the attraction
difference is at least 2. The lower-attraction county offers:

```text
edge flow = round(source population * 0.002 * min(3, attraction difference - 1))
```

Apply these limits:

- no county sends more than 1% of its population at the start of the annual pass;
- no flow crosses an actively hostile or besieged border;
- no source falls below its population floor;
- sea adjacency does not carry ordinary migration in the first release;
- compute all flows first, then apply them simultaneously;
- the sum of all migration deltas must equal zero.

This intentionally models slow net movement, not every journey. War displacement can call
the same transfer helper later, but a siege loss is not silently converted into migration.

### Stage 3: apply and record

Reset the three current-year component fields, apply natural and migration deltas, and save
those results. Explicit losses that occur later in `FB.worldTick` or during the rest of the
year then add to `losses`. Finally set `lastYear` before returning so a same-date reload
cannot repeat the step.

The yearly function must not call `Math.random`, `FB.chance`, `FB.pick`, or any other RNG
helper. Repeating the same state must yield byte-for-byte equivalent population state and
must consume no seeded RNG draws.

## Buildings

Only buildings with a legible demographic role should receive population effects. Existing
economic-development values remain as tuned in v1.134.1. The first demographic mapping is:

| Building | New demographic effect | Reason |
| --- | --- | --- |
| Watermill | `populationCapacity:0.05` per completed copy | More dependable processing supports a larger local population. |
| Granary | `populationFamineProtection:0.35`, existing `maxDemesne:1` remains | Stored grain reduces an explicit food-crisis loss, not ordinary mortality. |
| Stone Bridge | `migrationAttraction:1` per completed copy | Safer access encourages movement and exchange. |
| Market Square | `migrationAttraction:2` per completed copy | Regular exchange attracts workers and households. |
| Harbor | `populationCapacity:0.03`, `migrationAttraction:2` per completed copy | Imports increase resilience and a port attracts movement. |
| Great Temple | `populationCrisisProtection:0.10`, county cap `0.20` | Relief and care reduce explicit crisis losses modestly. |
| Fortification | Siege-loss protection by fort tier | Refuge and control reduce civilian loss during a completed siege. |

The fortification protection schedule should be `10%`, `20%`, `35%`, and `50%` for tiers
1 through 4. It reduces the population-loss percentage from a completed siege; it never
turns a loss into growth.

Library, Stone Keep, Barracks, and Archery Butts receive no direct demographic effect in
the first pass. A keep's contribution is already represented by the county fortification
system where applicable, while military buildings change host composition rather than the
number of civilians.

Ruined or incomplete buildings contribute nothing. Demolition removes only the future
capacity, attraction, or protection modifier. It does not immediately kill or expel
people. If the county becomes over capacity, the annual pressure formula produces gradual
decline and migration.

Add these fields to building validation and `docs/MODDING.md`. All are optional finite
numbers with a default of zero. Do not reinterpret the existing `pop` key.

## Technology

Technology should improve demographic outcomes through the existing realm technology
effect path. Add and clamp these scalar `fx` keys:

```js
populationCapacity
populationCrisisProtection
migrationAttraction
```

`populationCapacity` and `populationCrisisProtection` are fractional bonuses.
`migrationAttraction` is an additive score. Add matching caps to `FBDATA.techCaps`:
`populationCapacity:0.35`, `populationCrisisProtection:0.10`, and
`migrationAttraction:3`.

Start with a deliberately sparse mapping rather than adding an effect to every technology:

| Technology | New effect |
| --- | ---: |
| Two-Course Rotation | capacity +1% |
| Systematic Manuring | capacity +1% |
| Irrigation Channels | capacity +2% |
| Seed Selection | capacity +2% |
| Heavy Plough | capacity +2% |
| Open-Field Organization | capacity +2% |
| Three-Field Rotation | capacity +3% |
| Managed Water Meadows | capacity +2% |
| Improved Husbandry | capacity +2% |
| Legume Rotation | capacity +2% |
| Materia Medica | crisis protection +1% |
| Endowed Hospitals | crisis protection +3% |
| Medical Canons | crisis protection +2% |
| Surveyed Roads | migration attraction +0.5 |
| Paved Causeways | migration attraction +1.0 |

The realm-wide capacity cap of +35% prevents late-era technology from overwhelming local
conditions. Medical effects apply only to explicit disease, famine, or event losses, not
to the ordinary capacity-limited equation. This avoids implying that medieval medical
knowledge removes baseline mortality.

Add a `county_population_demographics` entry to `FBDATA.techImpactReviews` with
`mode:'soft'`, the consumed agriculture, medicine, and transport technology ids, and a
rationale that baseline population still functions without them. The mechanic itself is
not hard-gated.

## Economic connections

### Transitional population factor

Seeded counties must preserve existing opening balance. Define:

```text
population factor = clamp(sqrt(current population / opening population), 0.50, 1.50)
```

The opening population comes from authored data or the deterministic fallback and never
changes during play. It is not the current capacity. A county begins at factor `1.00`, so
the initial economy and military are unchanged.

The square root dampens compounding with economic development. Doubling population gives a
factor of about `1.41`, not `2.00`; losing half gives about `0.71`. This makes population
meaningful without making a new system instantly dominate existing balance.

### Tax

Multiply the current county tax result by the population factor after development and
ordinary building contributions, before final rounding. Keep every existing tax source and
technology cap intact.

The finance breakdown must show `Population x1.07` when the factor changes the result by at
least 1%. This makes the dependency visible and debuggable.

### Levies

Multiply only the development-derived levy body by the population factor. Do not multiply
fixed archers, retinue, fort garrisons, mercenaries, or other professional-unit additions.

Keep the existing levy technology modifier intact. It already represents the institutions
used to muster the available pool. The host preview must identify the new population
contribution separately.

### Markets

Multiply ordinary county household demand by the population factor, clamped independently
to `0.60-1.60`. Do not multiply production by raw population in the first release. Capacity
buildings and development already increase productive structure, while demand is the
clearest immediate role for more inhabitants.

Use the cached county factor during each seasonal market pass. Never recalculate building
or technology totals inside every good's loop.

### Realm strength and AI

Realm tax and levy totals inherit population through their county formulas. Do not add a
second raw-population term to AI strength, target selection, or rank calculations. That
would double-count the new economic and military effects.

## War and crises

### Completed siege or hostile capture

Alongside the existing economic-development damage, a completed hostile capture applies:

```text
base population loss = 2% of current county population
actual loss = base loss * (1 - fortification protection)
```

Round to an integer and use `FB.changeCountyPopulationRate`. A peaceful transfer,
inheritance, scripted administrative reassignment, or settlement award that is not a
hostile capture causes no loss.

The existing capture code paths must provide an explicit cause so the population helper
does not guess from owner changes. Repeated captures can be devastating by design, but each
loss remains subject to the county population floor.

### Famine, disease, and scripted events

Add event effects `populationLoss` and `populationLossRate` only when concrete content
needs them. Both accept a positive authored magnitude and apply it as a loss through the
public mutation helpers. Preview their bounded result and document them for mods. Famine
protection applies only to effects tagged `famine`; crisis mortality protection applies
only to tagged `famine` or `disease` effects. A later resettlement effect should use the
conserved migration helper rather than creating people through a positive loss field.

For tagged losses, calculate protection as follows:

```text
famine protection = clamp(building famine protection
  + building crisis protection + technology crisis protection, 0, 0.60)
disease protection = clamp(building crisis protection
  + technology crisis protection, 0, 0.30)
actual loss = base loss * (1 - applicable protection)
```

Do not invent ambient random plagues merely to exercise the population system. The annual
model is deterministic; exceptional losses must come from visible world conditions or
authored events.

### Field casualties

Do not subtract all battle losses from the battle county or the player's capital. Existing
hosts combine troops from multiple sources, and either shortcut would communicate false
precision. A later military-provenance change may save recruitment shares by county and
return casualties proportionally. Until then, levies affect available force but battlefield
losses do not directly change county population.

## Settlement projection

County population is authoritative. Settlement population is a display-only allocation
computed when the settlement panel is open:

1. Give each visible settlement a base weight: village `1`, town `3`, city `7`.
2. Add `1` to the settlement weight for each completed Watermill, Stone Bridge, Market
   Square, or Harbor located there.
3. Normalize the weights and allocate the county count using stable settlement order.
4. Give the final settlement the rounding remainder so displayed totals exactly equal the
   county total.

Do not save these allocations and do not run them in the annual simulation. They describe
where a county's population is concentrated without adding a second mutable model.

The first release should show the approximate allocation in settlement details but should
leave settlement reveal and type thresholds based on economic development. Changing those
thresholds at the same time would create a circular balance problem and invalidate current
maps and building placement.

## Community shares: later phase

Once county totals have shipped and stabilized, the existing static `communities` list can
be extended to optional aggregate shares. This must be a distinct release and migration:

```js
state.population.counties.york.communities = [
  { culture:'anglo_saxon', religion:'catholic', share:8200 },
  { culture:'norse', religion:'norse_pagan', share:1800 }
];
```

Use integer basis points totaling 10,000, not floating-point percentages. Birth and death
change the county total; shares describe composition. Migration moves a weighted source
mix, and conversion transfers basis points without changing population. The currently
authored first community receives the deterministic remainder when old data supplies no
shares.

Do not implement this in the initial population schema. It increases balance, UI, event,
save-migration, and political-design scope substantially and deserves its own acceptance
criteria.

## Existing-save migration

`FB.ensurePopulationState` performs a one-time lazy migration when loading a save without
`state.population`:

1. Determine every county's opening population from the active bookmark data and fallback.
2. Start from that opening value.
3. Scale once by the ratio between the fallback value for current development and the
   fallback value for bookmark development.
4. Apply standing, completed, unruined capacity-building modifiers halfway, using the
   square root of their full capacity multiplier. This recognizes existing investment
   without pretending the buildings existed for the save's entire history.
5. Clamp the result to `50-100%` of current capacity and round to the nearest 100.
6. Set all last-change components to zero and `lastYear` to the current year.

Do not replay one population tick per elapsed year. Old saves do not contain the necessary
war, famine, migration, and building history, and replay would be slow and misleading.

The migration must consume no RNG, must not change current development, ownership,
buildings, taxes already booked, Common Voice, or named characters, and must produce the
same result after save and reload.

New games initialize population after world, bookmark, development, and building state are
ready. Observe mode uses the same path.

## Performance contract

The annual pass is `O(C + B + E)`:

- `C` county calculations for capacity, growth, attraction, and application;
- `B` completed building records accumulated once into county modifiers;
- `E` undirected adjacency edges considered once for migration.

Implementation rules:

- no daily population work;
- no per-person, household, or settlement agents;
- no repeated realm-wide technology scan per county, cache effects by realm for the pass;
- no repeated building scan per market good or UI redraw;
- allocate temporary numeric maps once per annual pass and discard them afterward;
- reuse stable world adjacency rather than performing breadth-first searches;
- derive settlement allocations only for the currently inspected county;
- keep the ordinary full-map annual pass under 5 ms on the project's supported desktop
  reference machine and under 20 ms on a representative mobile device;
- keep added serialized state under 60 KB for the standard full map.

These are release-owner benchmark targets. Automated tests should enforce call counts,
idempotency, and bounded state size without fragile wall-clock assertions.

## Concrete implementation sequence

### Milestone 1: data contract and deterministic initialization

Files:

- `data/map_data.js`
- `data/counties.js`
- `data/bookmarks.js`
- `js/population.js` (new)
- `js/world.js`
- `index.html`
- `AGENTS.md`
- `docs/designs/provinces.md`
- `docs/designs/development.md`
- `docs/designs/state-and-saves.md`
- `docs/MODDING.md`

Steps:

1. Add balance constants, the development fallback table, terrain factors, population
   floor, growth coefficient, and caps to `FBDATA.balance`.
2. Add optional `population0` and `populationCapacity0` validation to world activation.
3. Create `js/population.js` with initialization, getters, capacity calculation, bounded
   mutation helpers, and no RNG calls.
4. Load the new module after `js/world.js` and before UI consumers. Update the architecture
   load-order list in `AGENTS.md`.
5. Initialize new games and lazily migrate old saves through the same public ensure helper.
6. Document the saved schema and mod fields.
7. Add regional diagnostic output usable from development tools: minimum, median, maximum,
   world total, and the ten largest counties for each bookmark. Do not expose it in normal
   UI.

Exit criteria:

- every inhabitable county has one stable count in new play and Observe mode;
- loading and re-saving an old save creates population once and never changes it again on
  the same date;
- opening tax, levy, and markets are still unchanged because no consumer uses population
  yet;
- invalid optional mod data faults or falls back under the documented policy.

### Milestone 2: annual growth, buildings, and technology

Files:

- `js/population.js`
- `js/world.js`
- `js/technology.js`
- `data/map_data.js`
- `data/technology.js`
- `docs/designs/tech.md`
- `docs/MODDING.md`

Steps:

1. Implement cached county building modifiers and cached realm technology modifiers.
2. Add the selected building fields and the sparse technology `fx` mapping.
3. Add caps for the three new technology effects and validate them.
4. Add the soft technology-impact review ledger entry.
5. Implement the natural-growth stage and annual idempotency.
6. Call the annual pass near the start of `FB.worldTick`, before yearly war and world
   systems can record population losses.
7. Ensure ruined, incomplete, capped, and demolished buildings behave as specified.

Exit criteria:

- identical state gives identical yearly population and RNG state;
- a Watermill changes capacity but not population immediately;
- demolition removes future support without an instant population loss;
- an over-capacity county declines gradually;
- Observe mode advances the same annual state.

### Milestone 3: Land and settlement presentation

Files:

- `js/population.js`
- `js/ui_panels.js`
- `js/ui_modals.js`
- `js/ui_misc.js`
- `css/style.css`
- `docs/designs/development.md`
- `docs/designs/provinces.md`
- `docs/designs/ui.md`

Steps:

1. Add the county population summary, current-year breakdown, capacity pressure, and top
   modifiers to Land.
2. Implement on-demand settlement weighting and display approximate settlement population.
3. Keep existing settlement reveal/type rules unchanged.
4. Add concise empty and migration states for newly initialized saves.
5. Make all new player-facing strings localizable at the integration checkpoint.

Exit criteria:

- county totals and projected settlement totals reconcile exactly;
- the UI distinguishes population from development and Common Voice;
- a player can identify why a county grew, declined, or remained constrained.

### Milestone 4: economy and military adapters

Files:

- `js/actions.js`
- `js/economy.js`
- `js/market.js`
- `js/world.js`
- `js/ui_modals.js`
- `docs/designs/finance.md`
- `docs/designs/markets.md`
- `docs/designs/war.md`

Steps:

1. Add the bounded square-root population factor helper.
2. Apply it once to county tax and show the factor in finance breakdowns.
3. Apply it only to development-derived levy and show it in muster previews.
4. Apply the separately bounded factor to ordinary market demand using the season cache.
5. Confirm realm AI inherits the effects only through existing aggregate tax and levy
   calculations.
6. Run a balance audit at population factors `0.50`, `0.75`, `1.00`, `1.25`, and `1.50`.

Exit criteria:

- every opening county remains at population factor `1.00`;
- professional units and fixed building troops are not multiplied;
- a depopulated county has visibly lower tax, levy, and demand without becoming inert;
- a populous county is stronger without eclipsing development and technology.

### Milestone 5: war loss and crisis hooks

Files:

- the existing hostile-capture owners in `js/world.js` and `js/holywar.js`
- `js/events.js`
- relevant event data only when content consumes the hooks
- `docs/designs/events.md`
- `docs/designs/war.md`
- `docs/MODDING.md`

Steps:

1. Route every hostile completed-capture path through one explicit population-loss helper.
2. Exclude inheritance, peaceful transfer, scripted setup, and non-hostile awards.
3. Apply fort-tier protection and record the result under annual losses.
4. Add tagged famine and disease loss support when the first real event uses it.
5. Add thresholded player Chronicle reporting and avoid AI-world spam.

Exit criteria:

- all hostile capture systems produce the same base loss and protection behavior;
- a tier-4 fort halves, but does not erase, the loss;
- repeated capture cannot cross the county floor;
- peaceful ownership changes do not alter population;
- there is no fake battle-casualty allocation.

### Milestone 6: conserved migration

Files:

- `js/population.js`
- `js/world.js`
- `docs/designs/provinces.md`
- `docs/designs/time.md`

Steps:

1. Cache attraction values after natural-growth capacity has been calculated.
2. Iterate each undirected land adjacency edge once in stable order.
3. Accumulate capped outgoing and incoming delta maps before applying either.
4. Block hostile, besieged, and unsupported sea flows.
5. Add migration to the Land breakdown and capacity explanation.

Exit criteria:

- total migration across the world sums to exactly zero each year;
- iteration order does not change results;
- no county sends more than 1% or crosses its floor;
- markets, bridges, roads, peace, hardship, and capacity pressure create legible movement;
- migration adds no daily work.

### Milestone 7: integration, localization, and release

Files:

- `tests/e2e/specs/population.spec.js` (new)
- `data/lang_*.js`
- `js/main.js`
- all affected design documents
- `docs/MODDING.md`

Steps:

1. Complete the authored test matrix below without running tests as an agent.
2. Update English and every translation catalog together after strings stabilize.
3. Update the release version and changelog at the integration checkpoint.
4. Have the release owner run project checks and the manual performance benchmark.
5. Inspect new-game, old-save, Observe, player-war, AI-war, and mod fallback paths.

## Authored test matrix

Add focused tests for:

- deterministic opening values from each development level and each terrain class;
- authored `population0` and capacity overrides;
- safe fallback for unknown mod terrain;
- new-game, Observe, and old-save initialization;
- same-date load idempotency and `lastYear` protection;
- no RNG consumption during initialization or annual update;
- natural-growth values below, at, and above capacity;
- annual growth and decline clamps;
- Watermill and Harbor capacity, Granary famine protection, Temple crisis protection,
  attraction buildings, and fort-tier siege protection;
- incomplete and ruined buildings contributing nothing;
- demolition changing capacity without an immediate count mutation;
- technology accumulation and all caps;
- tax factor at the lower bound, opening baseline, and upper bound;
- levy factor affecting only development-derived levy;
- market demand factor calculated once per county per season;
- hostile capture versus peaceful transfer across ordinary and great holy-war paths;
- migration conservation, stable ordering, per-county outflow cap, floor, hostile-border
  blocking, and absence of sea migration;
- settlement allocations summing exactly to county total;
- no duplicate Chronicle report after save and reload;
- serialized population state remaining within the documented budget for the standard map;
- technology-impact review and mod-schema validation for every new key.

## Balance and content review

Before enabling economic consumers, produce comparison tables for both starting bookmarks:

- world and realm population totals;
- top and bottom counties;
- population by development level and terrain;
- tax and levy before and after the adapter at opening;
- ten-, fifty-, and one-hundred-year deterministic no-war projections;
- the same projections for a fully built county and a repeatedly captured county;
- migration winners and losers after ten years.

The review should look for hierarchy and gameplay plausibility, not false precision. Adjust
the fallback table and a small number of province overrides before increasing growth or
economic multipliers. Avoid tuning individual counties merely to reproduce modern
population rankings.

## Risks and guardrails

- **Double counting development:** opening population derives from development, but annual
  capacity and economic factors do not reuse current development. Building capacity bonuses
  remain distinct from their existing development bonuses.
- **Runaway compounding:** logistic pressure, capacity caps, square-root economy adapters,
  and a 1% migration-outflow limit bound the system.
- **Save bloat:** store four integers per county and derive settlement values.
- **World-tick stalls:** cache realm technology and building totals once, and use existing
  adjacency directly.
- **Misleading precision:** UI may show whole people for reconciliation, but explanatory
  copy calls them estimates and avoids claims of census accuracy.
- **Schema collision:** never use `pop` for demographics.
- **Player-only simulation:** the entire map updates in play and Observe mode so conquest,
  markets, and AI strength do not reveal frozen counties.
- **Random demographic noise:** ordinary population change has no RNG. Visible conditions
  and explicit events cause deviations.
- **Culture and religion scope creep:** community shares remain a later milestone with a
  separate migration and political design review.

## Definition of done

The first population release is complete when:

1. Every inhabited county has a deterministic, saved, visible population.
2. Population changes once per year from capacity pressure, explicit losses, and conserved
   migration, with no random drift.
3. Selected buildings and technologies have documented, capped, and inspectable effects.
4. Tax, development-derived levies, and market demand use bounded population factors while
   opening balance remains unchanged.
5. Hostile captures reduce population and fortifications reduce the loss; peaceful
   transfers do not.
6. Settlement population is derived on demand and reconciles to the county total.
7. Existing saves initialize once without historical replay or changes to unrelated state.
8. Full-map annual work and serialized state stay within the performance budgets.
9. Design documents, mod schemas, technology-impact metadata, tests, version, changelog,
   and all locale catalogs are integrated together.
10. Dynamic culture and religion shares are still absent unless approved as their own
    follow-up release.
