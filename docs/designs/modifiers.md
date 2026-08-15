# Temporary modifiers

Temporary modifiers are data-defined, save-safe effects attached either to a county or to
the protagonist's participation in the one active great holy war. The first version does
not provide realm, route, AI-participant, or ordinary-war scopes, and campaign records do
not persist into a later campaign.

## Catalog and storage

`data/modifiers.js` owns `FBDATA.modifiers`. Each id maps to a complete record:

```js
{
  name: 'Granaries Opened',
  icon: '🌾',
  desc: '...',
  scope: 'county',
  days: 1080,                 // optional; absent means no fixed turn expiry
  upkeep: { gold: 2 },        // optional seasonal direct-demesne cost
  fx: { famine: -0.30, commonVoice: 8 }
}
```

County instances are stored as
`state.modifiers.county[provinceId] = [{id,endTurn?,sourceEventId?}]`. They belong to the
county rather than its current holder and therefore survive ownership changes. The
optional `sourceEventId` is a locale-neutral pointer to the granting event; it lets Land
and Governance name a surviving story source without saving rendered prose. Campaign
instances are stored as
`state.greatHolyWar.modifiers = [{id,endTurn?,sourceEventId?}]`; they affect only the
protagonist's valid vow in that campaign.

`FB.ensureModifiers(state)` lazily creates the county container, repairs both scopes,
discards unknown ids, invalid shapes, and invalid county ids, and collapses duplicate ids.
A record without `endTurn` remains permanent. A duplicate permanent record wins over a
timed one; otherwise the latest valid expiry wins. This is an additive repair under save
format 3.

`FB.modifierTick(state)` runs daily. It expires records at
`state.turn >= record.endTurn` and emits localized Chronicle descriptors for gains and
natural expiries. Adding an already-active id refreshes its catalog duration without
stacking it or repeating the gain notice. A refreshed event grant also replaces the
semantic source id with the most recent granting event.

When `js/institutions.js` is present, adding or refreshing a recognized county effect
also upserts its legal `state.privileges` provenance; removing or naturally expiring the
effect removes that wrapper. This does not change modifier storage or arithmetic. The
wrapper supplies holder, grantor, scope, rights, duration, and revocation terms to the
privilege sheet and survives county transfer for exactly as long as this record does.

## Core county content

The institution-content tranche adds seven bounded county definitions:

The pre-existing `open_storehouses` modifier also adds 15% provisions production while
its lord-funded stores are active, and `covert_sabotage` now reduces all production by
15% and market-flow capacity by 10% alongside its fiscal and levy effects.

- `market_charter` — +8% county tax, −8% construction cost, and 1 gold seasonal
  upkeep plus 15% market-flow capacity for 1,440 days;
- `contested_tolls` — −10% county tax and +25% harmful `unrest` exposure for
  720 days, with 20% less market-flow capacity;
- `levy_exemption` — −12% county levy and +6 effective Common Voice for
  1,080 days;
- `muster_burden` — +15% county levy, −6 effective Common Voice, and +15%
  harmful `unrest` exposure for 540 days;
- `roads_patrolled` — +4% county tax, −20% harmful `unrest` exposure, 12% more
  market-flow capacity, and 1 gold seasonal upkeep for 720 days;
- `settlement_grudge` — −7 effective Common Voice and +25% harmful `unrest`
  exposure for 900 days.
- `tax_concession` — −8% county tax, +6 effective Common Voice, and −10%
  harmful `unrest` exposure for 1,080 days.

Council and Estates choices grant the original six; a settled collective demand for
tax remission grants `tax_concession`. Plot discovery, a failed obligation scheme, a
border response, and a foreign merchant compact provide cross-system sources.
`parliament_local_redress` can end Contested Tolls or Settlement Grudge and replace the
dispute with a positive charter; natural expiry remains the fallback.

Ordinary aggressive conquest supplies one additional core county definition:
`conquered_without_right` lasts 2,160 days and applies −15% county tax, −20% county
levy, −8 effective Common Voice, and +40% harmful `unrest` exposure. It is granted only
when the player captures the objective of a saved `aggression` war cause. Like every
county record, it remains attached to the county after a transfer and expires through
the normal daily modifier tick.

## Public APIs

- `FB.addModifier(state,id,pid?,options?)` and
  `FB.removeModifier(state,id,pid?,options?)` mutate one scope.
- `FB.hasModifier(state,id,pid?)` tests active records.
- `FB.countyModifierRecords(state,pid)` and
  `FB.campaignModifierRecords(state)` return active records.
- `FB.countyModifierSnapshot(state,pid)` returns the same repaired projection without
  writing it back, for read-only overview surfaces.
- `FB.modBonus(state,key,pid)` sums a county effect key.
- `FB.campaignModBonus(state,key)` sums campaign effects only while the protagonist has a
  current, renewed, unwithdrawn vow.
- `FB.modifierUpkeepEntries(state,key?)` and `FB.modifierUpkeep(state,key?)` read costs
  from `FB.modifierCounties` (see *Whose counties* below).
- `FB.modifierRemainingDays(state,record)` returns an integer or `null` for an untimed
  record.
- `FB.popEffective(state)` adds `commonVoice` from active modifiers in
  `FB.modifierCounties` to stored `player.pop`.

Callers do not write effective Common Voice back into state. Existing gains, losses, and
yearly decay continue to change the stored value alone.

## County effects

Supported county keys are:

- `tax`: fractional county tax before domain, national, council, position, monopoly, and
  liege adjustments. It applies to vassal counties contributing dues as well as the
  player's own counties.
- `levy`: fractional base county levy before technology, Martial, and domain adjustments.
- `buildingCost`: fractional construction-cost multiplier in the affected county.
- `marketProduction`: fractional adjustment to every basket produced in the county.
- `marketProvisions`: fractional adjustment to provisions production only.
- `marketFlow`: fractional adjustment to the county side of each adjacent market edge.
- `commonVoice`: flat effective Common Voice while the county is one of
  `FB.modifierCounties`.
- Event tags such as `famine` and `unrest`: fractional scaling of harmful tagged-event
  outcomes in the event's snapshotted county.

County upkeep is charged only while the county is one of `FB.modifierCounties`. It feeds
seasonal settlement, reliable income, and the localized income ledger. County-local
effects and the Land-panel chip continue after a transfer even though player-wide Common
Voice and upkeep stop.

## Whose counties a county modifier acts on

One explicit rule, `FB.modifierCounties(state)`, because several consumers used to decide
it separately and disagreed. A landed ruler experiences the modifiers on the counties
they hold directly. A baron holds none: their seat is their liege's county. But the
estates that grant these records sit from tier 3, and the agenda that grants them is
chosen by reading that seat, so the seat is where they act. `FB.modifierSeat(state)`
names that substituted county, and returns `null` for a ruler who holds counties of
their own.

Upkeep, Common Voice, county tax, county levy, and the Governance projection all read
this rule. They did not always: upkeep and Common Voice went through `FB.demesne`, which
substitutes the seat, while tax, levy, and Governance read `player.provs`, which is empty
at tier 3. A baron therefore paid for a Market Charter that returned no tax, was granted
a Levy Exemption that changed no muster, and could find neither record in Governance.

Consumers that sum over held counties do not gain rent or levy from a seat they do not
hold. They add the seat's *effect* to what the player does have: the tier-3 rent floor
carries the seat's `tax` fraction, and the standing barony household carries its `levy`
fraction, each itemized like any other modifier line.

## Campaign effects

Supported campaign keys are:

- `supplyUse`: fractional adjustment to the live player host's seasonal logistics.
- `contribution`: fractional adjustment at the shared player-contribution award function.
- `withdrawalPenalty`: fractional adjustment to the shared piety and prestige costs.
- `marchSpeed`: fractional speed used by
  `round(baseDays / max(safeDenominator, 1 + marchSpeed))`, with a one-day minimum.
- `battleOdds`: fractional multiplier on the player host's battle power.
- `desertion`: a seasonal fraction resolved daily as
  `men * desertion / 90`, using `FB.rng` for fractional seeded rounding and normal unit
  loss order.

These values never affect AI participants or ordinary-war-only hosts. `Oathbound Host`
is synchronized centrally: calling or answering a valid vow and renewing an inherited
vow adds it; succession pending renewal, withdrawal, settlement, or campaign destruction
removes it. Withdrawal costs are calculated before that removal. `Fractured Command` is
a documented compatibility/test fixture: it is fully authorable through
`FB.addModifier`, but core content deliberately has no grant path until a follow-up
campaign system exists.

## Event integration

Events may declare top-level `tags:['famine','unrest']`. `FB.eventTagBonus` sums the event
county modifier and, when available, `FB.traitBonus(player,'estate',tag)`. The summed
factor is `max(0, 1 + bonus)`.

Only negative signed effects are scaled: gold, prestige, piety, health, war service,
research, popular opinion, liege opinion, role opinion, and negative skill changes.
Positive rewards, chances, flags, custom handlers, metadata, and all other effects remain
unchanged. The interpreter clones changed effect objects instead of mutating source event
data.

`addModifier:{id,pid?}` and `removeModifier:{id,pid?}` are event effects. County
targeting resolves explicit `pid`, then the queued event's `locationId`, then the
player's current home province. Campaign targeting uses the matching active great holy
war. Event grants record the event id as `sourceEventId`; direct API callers may pass
the same semantic option explicitly. `hasModifier` is a trigger and option requirement
accepting either an id string or `{id,pid?}`. Event contexts snapshot `locationId` when
queued so a delayed county event cannot drift with later travel.

## Presentation and mod replacement

The selected Land county shows every active county record. Governance repeats the exact
records for directly held counties beneath the active institution, without becoming a
modifier-management screen. The great holy-war service section shows campaign records.
Each localized native-button chip includes icon, name, and remaining days (or “Until the
campaign ends”); hover exposes the description and effects on pointer devices, while
click, tap, Enter, or Space opens an accessible detail modal.

The detail modal uses the shared asset/effect row to separate county/campaign
ownership and scope, event-granted setup, seasonal upkeep, mechanical effects,
transfer behavior, and exact expiry. When `sourceEventId` resolves, it also localizes
the granting event title. Event options that add, refresh, or remove a modifier append
a text preview naming the modifier, target county, duration, exact supported effects,
upkeep, and transfer rule; chance branches label success and failure separately.

Runtime JSON mods may provide a top-level `modifiers` object. Like traits and other
id-keyed definitions, a later mod replaces the complete definition at a matching id.
Catalog ids and numeric state remain locale-neutral; `name` and `desc` are structured
display fields and are extracted for localization.

`covert_sabotage` is the intrigue-owned county record. Success applies it through the
ordinary `FB.addModifier` API for 720 days with `tax:-0.12`, `levy:-0.12`, and
`unrest:0.25`. It remains attached to the county through conquest and expires through
the shared daily modifier tick; intrigue has no parallel county timer or cleanup path.
The existing Land chips, tax/levy consumers, event-tag scaling, save repair, and mod
replacement rules therefore apply unchanged.
