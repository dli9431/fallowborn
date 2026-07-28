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
`state.modifiers.county[provinceId] = [{id,endTurn?}]`. They belong to the county rather
than its current holder and therefore survive ownership changes. Campaign instances are
stored as `state.greatHolyWar.modifiers = [{id,endTurn?}]`; they affect only the
protagonist's valid vow in that campaign.

`FB.ensureModifiers(state)` lazily creates the county container, repairs both scopes,
discards unknown ids, invalid shapes, and invalid county ids, and collapses duplicate ids.
A record without `endTurn` remains permanent. A duplicate permanent record wins over a
timed one; otherwise the latest valid expiry wins. This is an additive repair under save
format 3.

`FB.modifierTick(state)` runs daily. It expires records at
`state.turn >= record.endTurn` and emits localized Chronicle descriptors for gains and
natural expiries. Adding an already-active id refreshes its catalog duration without
stacking it or repeating the gain notice.

## Public APIs

- `FB.addModifier(state,id,pid?,options?)` and
  `FB.removeModifier(state,id,pid?,options?)` mutate one scope.
- `FB.hasModifier(state,id,pid?)` tests active records.
- `FB.countyModifierRecords(state,pid)` and
  `FB.campaignModifierRecords(state)` return active records.
- `FB.modBonus(state,key,pid)` sums a county effect key.
- `FB.campaignModBonus(state,key)` sums campaign effects only while the protagonist has a
  current, renewed, unwithdrawn vow.
- `FB.modifierUpkeepEntries(state,key?)` and `FB.modifierUpkeep(state,key?)` read costs
  from directly held counties only.
- `FB.modifierRemainingDays(state,record)` returns an integer or `null` for an untimed
  record.
- `FB.popEffective(state)` adds `commonVoice` from active modifiers in the directly held
  demesne to stored `player.pop`.

Callers do not write effective Common Voice back into state. Existing gains, losses, and
yearly decay continue to change the stored value alone.

## County effects

Supported county keys are:

- `tax`: fractional county tax before domain, national, council, position, monopoly, and
  liege adjustments. It applies to vassal counties contributing dues as well as the
  player's own counties.
- `levy`: fractional base county levy before technology, Martial, and domain adjustments.
- `buildingCost`: fractional construction-cost multiplier in the affected county.
- `commonVoice`: flat effective Common Voice while the county is directly held.
- Event tags such as `famine` and `unrest`: fractional scaling of harmful tagged-event
  outcomes in the event's snapshotted county.

County upkeep is charged only while the county is in the player's direct demesne. It feeds
seasonal settlement, reliable income, and the localized income ledger. County-local
effects and the Land-panel chip continue after a transfer even though player-wide Common
Voice and upkeep stop.

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
fully authorable and testable through `FB.addModifier`, but core content deliberately has
no grant path until a follow-up campaign system exists.

## Event integration

Events may declare top-level `tags:['famine','unrest']`. `FB.eventTagBonus` sums the event
county modifier and, when available, `FB.traitBonus(player,'estate',tag)`. The summed
factor is `max(0, 1 + bonus)`.

Only negative signed effects are scaled: gold, prestige, piety, health, war service,
research, popular opinion, liege opinion, role opinion, and negative skill changes.
Positive rewards, chances, flags, custom handlers, metadata, and all other effects remain
unchanged. The interpreter clones changed effect objects instead of mutating source event
data.

`addModifier:{id,pid?}` is an event effect. County targeting resolves explicit `pid`,
then the queued event's `locationId`, then the player's current home province. Campaign
targeting uses the matching active great holy war. `hasModifier` is a trigger and option
requirement accepting either an id string or `{id,pid?}`. Event contexts snapshot
`locationId` when queued so a delayed county event cannot drift with later travel.

## Presentation and mod replacement

The selected Land county shows every active county record. The great holy-war service
section shows campaign records. Each localized native-button chip includes icon, name,
and remaining days (or “Until the campaign ends”); hover exposes the description and
effects on pointer devices, while click, tap, Enter, or Space opens an accessible detail
modal.

The detail modal uses the shared asset/effect row to separate county/campaign
ownership and scope, event-granted setup, seasonal upkeep, mechanical effects,
transfer behavior, and exact expiry.

Runtime JSON mods may provide a top-level `modifiers` object. Like traits and other
id-keyed definitions, a later mod replaces the complete definition at a matching id.
Catalog ids and numeric state remain locale-neutral; `name` and `desc` are structured
display fields and are extracted for localization.
