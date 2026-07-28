# Design: temporary county and campaign modifiers

Date: 2026-07-27

Status: implementation plan against Fallowborn v1.67.0. First users are the
[settlement plan's](1%20settlement.md) campaign modifiers and county relief and charter
content.

## Goal

A timed-modifier tier between permanent state (buildings, technology, development) and
instant event effects: named, data-defined world state with a scope, a duration, effect
values, and player-visible chips. Historical events become temporary circumstances
instead of permanent personal bonuses.

## Current implementation (v1.67.0)

There is no timed-modifier framework. What exists, and what the framework builds on:

- **The closest precedents.** Two systems already implement "scoped record with an
  expiry, swept on the tick":
  - `state.player.vassalLevyFavors[rid] = state.turn + days`
    (`js/actions.js:1706`), auto-cleared on read and itemized in the levy ledger.
  - Guild monopolies, records with `endTurn` and `scope`/`scopeId`
    (`js/economy.js:1689`), swept daily by `FB.guildMonopolyTick`
    (wired at `main.js:1110`), emitting a one-shot Chronicle notice on expiry
    (`monopolyEndNotice`) and feeding tax through `FB.guildMonopolyTaxBonus`.
    This is the structural template.
- **The effect-reader idiom.** Buildings put numeric effect fields on the def and
  `FB.buildingBonus(state, key)` sums them over the demesne
  (`js/actions.js:2346`). Technology puts them under `def.fx` and
  `FB.techBonus(state, key)` sums with caps (`js/technology.js:645`). The modifier
  reader copies this shape.
- **The tick.** `G.passDay` (`js/main.js:1073`) runs daily hooks (the sweep sits
  beside `FB.guildMonopolyTick` at `main.js:1110`), a season boundary block where
  income and upkeep settle (`main.js:1127-1184`), and `yearlyLife` for yearly drift.
- **County state is per-pid maps**, not county objects: `state.dev`, `state.owner`,
  `state.holder`, `state.buildings` (`FB.initPolitics`, `js/world.js:677`). County
  modifiers follow the same pattern, a map keyed by province id.
- **Computation sites the effects hook into** (detailed table below): `FB.playerTax`
  and `FB.incomeBreakdown` (`js/actions.js:1159`, `1259`),
  `FB.playerCompositionBreakdown` (`js/world.js:2352`), `hostUpkeepParts`
  (`js/armies.js:102`), `battlePower` (`js/armies.js:452`), march speed in
  `orderArmy`/`march` (`js/armies.js:340-387`), contribution in `js/holywar.js`,
  travel leg time and overhead (`js/travel.js:145-160`).
- **Gaps in the current implementation.** Desertion does not exist (no attrition code
  anywhere; only battle rout and home refill). Famine and harvest are not durable
  mechanics, only one-shot event content. Common Voice is the single scalar
  `state.player.pop`, moved by `fx.popularOpinion` (`js/events.js:2228`) and decaying
  15% yearly (`js/main.js:1504`). Revolt pressure has no meter. The design below
  handles each honestly rather than pretending a hook exists.
- **Save discipline.** Save v3, additive state, lazy init through the `ensure*` chain
  in `save.js:170-191`. The framework adds one `FB.ensureModifiers` line there.

## Design

### Catalog

Data-defined in a new `FBDATA.modifiers` table (its own small data file, or appended
to `data/map_data.js` beside the building defs), display fields localized like traits
and ailments:

```js
FBDATA.modifiers = {
  granaries_opened: {
    name:'Granaries Opened', icon:'🌾',
    desc:'The lord’s stores stand open against the hunger.',
    scope:'county', days:1080,
    upkeep:{ gold:2 },                      // per season while active
    fx:{ famine:-0.30, commonVoice:8 }
  },
  custom_confirmed: {
    name:'Custom Confirmed', icon:'📜',
    desc:'Old rights stand confirmed by charter.',
    scope:'county', days:3600,
    fx:{ commonVoice:8, levy:-0.05, unrest:-0.15 }
  },
  oathbound_host: {
    name:'Oathbound Host', icon:'🕊',
    desc:'The host marches under a public vow.',
    scope:'campaign',
    fx:{ supplyUse:-0.10, contribution:0.10, withdrawalPenalty:1.0 }
  },
  fractured_command: {
    name:'Fractured Command', icon:'⚔',
    desc:'The leaders dispute precedence.',
    scope:'campaign',
    fx:{ marchSpeed:-0.10, battleOdds:-0.05, desertion:0.10 }
  }
};
```

Rates are fractions, flat values are integers, matching the tech and building
conventions. `days` is in turns (360 per year); a missing `days` means the modifier
lasts until explicitly removed (campaign modifiers die with the campaign; a later
"Lands Farmed in Hand" is while-active).

### Scopes and storage

Version 1 ships the two scopes the first users need:

- **County**: `state.modifiers = { county: { pid: [ { id, endTurn } ] } }`, additive
  state healed by `FB.ensureModifiers` in the restore chain. Stored by pid so it is
  AI-ready, though v1 content and computation are player-facing.
- **Campaign**: records live on the campaign container itself
  (`state.greatHolyWar.modifiers = [ { id, endTurn } ]`, and `state.player.war` can
  carry the same array for ordinary wars), so they serialize with the campaign and
  die with it. No global registry to desynchronize.

Route and realm scopes (Pilgrim Road, vassal-scoped charters) are follow-ons; the
record shape and reader already accommodate them, only the storage map and content
are added later.

Stacking rule: re-granting the same id refreshes `endTurn`, never stacks. Different
ids stack additively in the readers.

### Lifecycle

- **Grant**: a new event effect key `fx.addModifier: { id, pid? }` in
  `FB.applyEffects`, so relief choices, charters, and vow outcomes are ordinary
  declarative event content; a matching trigger key (`tg.hasModifier`) gates events
  on them. Code can also grant directly (the settlement arc applies Oathbound Host
  when a public vow stands, per the [settlement plan](1%20settlement.md)).
- **Expiry**: `FB.modifierTick` in the daily phase beside `FB.guildMonopolyTick`,
  deleting records past `endTurn` and emitting a Chronicle notice on gain and
  expiry, following `monopolyEndNotice`.
- **Upkeep**: a modifier with `upkeep.gold` charges in the season-boundary income
  block and appears as its own line in `FB.incomeBreakdown` (Granaries Opened is a
  relief the ruler pays for each season).
- **Readers**: `FB.modBonus(state, key, pid)` sums `def.fx[key]` over a county's
  records; `FB.campaignModBonus(state, key)` reads the active campaign container.
  Same shape as `FB.techBonus`.

### Effect keys and their hooks

The framework only ships keys that have a consumer. The wiring, key by key:

| Key | Hook | Notes |
| --- | --- | --- |
| `tax` | per-pid term inside `FB.playerTax` and `FB.incomeBreakdown` | Counted Ploughlands content later |
| `levy` | rate section of `FB.playerCompositionBreakdown` | Custom Confirmed's -5% concession |
| `commonVoice` | new `FB.popEffective(state)` = clamp(`p.pop` + county mod sum) | Read at the trigger gate (`events.js:1792`) and display sites; the stored `p.pop` and its yearly drift are untouched, so the offset ends cleanly with the modifier |
| `famine`, `unrest` | tag scaling in the event interpreter | New convention: events gain optional `tags`; when a triggering event carries a tag matching a modifier fx key on the county, `FB.applyEffects` scales its harmful numeric effects by (1 + value). Famine and revolt-pressure content is event-driven today, so this is the honest hook |
| `buildingCost` | the building raise cost in `js/actions.js` | |
| `supplyUse` | `hostUpkeepParts` (`js/armies.js:102`) | first per-campaign multiplier there |
| `marchSpeed` | `moveLeft` assignment in `orderArmy`/`march`, beside `FB.techArmyMarchDays` | |
| `battleOdds` | `battlePower`'s bonus sum, beside the `blessed_war` term | |
| `contribution` | `addContribution` in `js/holywar.js` | |
| `withdrawalPenalty` | `FB.withdrawGreatHolyWar` multiplies its piety/prestige costs | |
| `desertion` | new, smallest viable: a daily fraction of men lost in `armyTick` for hosts whose realm sits under the modifier | The one genuinely new mechanic; no attrition system is being built, just this hook |

Deliberately absent until their systems exist: harvest and survey keys beyond the
tag convention (no durable harvest mechanic), route keys (route scope later), and
anything reading Common Voice components (still a single scalar).

### UI

- County chips on the Land tab county panel, with icon, name, remaining duration,
  and a tooltip listing effects (the `traitFxText` pattern).
- Campaign modifiers listed on the campaign panel next to resolve and contribution.
- Chronicle notices on gain and expiry.
- All new text routed through i18n as authored; `docs/MODDING.md` gains the catalog
  schema, the fx key list, the tag convention, and the `addModifier`/`hasModifier`
  keys.

## First users and sequencing

Ship order inside the arc:

1. Framework plus county scope, with **Granaries Opened** and **Custom Confirmed**
   as the proving content (a relief deed or event option, and a charter outcome on
   existing council/parliament content).
2. Campaign scope with **Oathbound Host** and **Fractured Command**, landing with or
   just after the settlement arc that motivates them.
3. The rest of the initial modifier set (Counted Ploughlands, Toll Under Dispute, Lands
   Farmed in Hand, Pilgrim Road) as content whenever their systems and stories are
   ready; none blocks the framework.

## Save, compatibility, testing

- Additive under save v3, no bump: `state.modifiers` and campaign arrays lazily
  initialized; old saves gain empty maps on first tick. Unknown modifier ids in a
  save (from a mod or a removed entry) are dropped by the ensure pass, matching how
  other repairers heal.
- Balance knobs for durations and effect sizes go through the catalog entries
  themselves, not `FBDATA.balance`, since each modifier is already a named tuning
  surface.
- Manual browser checklist: grant each first user, watch the chip and duration,
  season upkeep line for Granaries, expiry notice, tag scaling on a famine event
  with and without Granaries, campaign modifiers applying to supply and battle,
  save/load mid-duration, load of a pre-arc save.

## Open questions

- AI counties: the storage is AI-ready, but do AI realms get relief behavior in the
  first release? Recommendation: defer, keep the first pass player-facing.
- Whether `commonVoice` offsets should also gate the building `pop` bonus and other
  writers, or only reads. Recommendation: reads only, keep one writer path.
- Whether ordinary wars get campaign modifiers in v1 or only great holy wars.
  Recommendation: holy wars first (the settlement arc is the consumer), the
  `state.player.war` array is there when content wants it.
