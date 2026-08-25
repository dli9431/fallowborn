# Persistent serf tenure: Phase 1 implementation plan

Status: proposed for the v1.154.1 codebase

## Outcome

Every tier 0 household has a visible, persistent tenure tied to its permanent home.
The tenure explains what the household ordinarily owes, what customary use it may
claim, and when its next duty falls due. Ordinary serf burden events stop appearing as
unrelated random incidents and instead discharge the household's saved obligations.

The first implementation supports four bounded packages:

1. Latin Catholic manorial custom.
2. Muslim irrigated fellah tenure.
3. Pagan household-service tenure.
4. A neutral dependent-farming fallback for all unsupported combinations.

Faith is one input, not a complete social model. Culture tradition, terrain,
settlement kind, and the province's starting development also constrain package
selection. The fallback makes the system total without pretending that one regional
form was universal.

This phase adds no new currency, holding, inventory item, skill, or resource. It uses
semantic identifiers in saved state and derives current political relationships from
the world.

## Non-negotiable contracts

- A tenure is attached to `state.player.home`, not to the character's current travel
  location.
- The household holds customary use. The UI must not describe the land as property
  owned by the player.
- The current controller and lord are derived at render or event time. Their names are
  never frozen into the tenure record.
- Formation and legacy repair consume no random numbers.
- Due dates are saved. They do not move when a save is loaded, a character succeeds,
  or the calendar is merely viewed.
- Resolving or autoresolving an ordinary duty advances that duty exactly once.
- A stale queued event cannot charge the household after its tenure, home, tier, duty,
  or protagonist context has changed.
- Lawful freedom ends personal service. Flight and forced relocation also close the
  old tenure.
- Tenure cannot be sold, gifted, pledged, staffed, counted as a plot, or declared a
  manor.
- At most one ordinary tenure decision may be presented in a season. Exceptional
  exactions remain separate and rare.
- Existing event IDs are retained so achievements, analytics, saves, and tests do not
  acquire unnecessary migration work.

## Exact starter catalogue

Add the catalogue to `data/economy.js` beside the other household standards. It is
core game data in this phase, not a mod merge surface.

Selectors are evaluated in descending `priority`, then declaration order. Every
non-fallback selector must match all of its declared constraints. The fallback has
priority `0` and no constraints.

### 1. `latin_manorial`

Selection:

- `priority: 300`
- faith descends from `catholic`
- culture has one of `west_european`, `celtic`, or `romance`
- home terrain is farmland, forest, hills, or mountains
- home settlement is a village or town

Display:

- name: `Manorial customary tenure`
- summary: `A cottage and household strips held by custom in return for work and local dues.`

Ordinary duties:

| Duty ID | Existing event ID | First due | Cycle |
| --- | --- | --- | --- |
| `week_work` | `serf_weekwork_tally` | Spring, day 30 | every 2 years |
| `demesne_harvest` | `serf_boon_harvest` | Autumn, day 30 | every 2 years |
| `tithe_sheaf` | `serf_tithe_sheaf` | Winter, day 30 of the next campaign year | every 2 years |
| `local_facility_due` | context-selected below | Summer, day 30 of the next campaign year | every 2 years |

Resolve `local_facility_due` once at formation:

- forest or hills: `serf_pannage_due`
- village in any other supported terrain: `serf_common_oven`
- otherwise: `serf_mill_multure`

Recognized rights:

- forest, hills, or mountains: `deadwood_after_frost`
- farmland: `gleaning_after_harvest`

Conditional duties:

- `serf_marriage_leave` may become due after a new marriage. Existing marriages never
  receive a retroactive charge.
- `serf_officers_quartered` may become due during war.

Required event copy:

- Add Catholic branches to the shared week-work, harvest, facility, marriage, and
  quartering events.
- Keep `serf_tithe_sheaf` Catholic-specific.
- Do not apply this package to every Christian faith. An unsupported Christian
  combination uses the fallback.

### 2. `irrigated_fellah`

Selection:

- `priority: 300`
- faith descends from `muslim`
- culture has one of `middle_eastern`, `african`, or `romance`
- home terrain is farmland or marsh
- province starting development, `dev0`, is at least 4
- any settlement kind is allowed

Display:

- name: `Irrigated fellah tenure`
- summary: `Household fields held through village custom, with shared waterwork and crop obligations.`

Ordinary duties:

| Duty ID | Existing event ID | First due | Cycle |
| --- | --- | --- | --- |
| `irrigation_labor` | `serf_weekwork_tally` | Spring, day 30 | every 2 years |
| `crop_share` | `serf_boon_harvest` | Autumn, day 30 | every 2 years |
| `waterworks_cartage` | `serf_bridge_cartage` | Summer, day 30 of the next campaign year | every 2 years |
| `mill_share` | `serf_mill_multure` | Winter, day 30 of the next campaign year | every 2 years |

Recognized rights:

- `irrigation_turn`

Conditional duties:

- `serf_officers_quartered` may become due during war.

Required event copy:

- Add Muslim branches for the shared week-work, harvest, cartage, mill, and quartering
  events.
- Refer to the saved duty by its localized display name. Do not introduce a precise
  tax-law label such as kharaj or ushr in this first package.
- This is deliberately place-gated. A Muslim tier 0 household outside the irrigated,
  sufficiently developed environment uses the fallback.

### 3. `pagan_household_service`

Selection:

- `priority: 300`
- faith descends from `pagan`
- culture has one of `west_european`, `slavic_baltic`, or `uralic`
- home terrain is farmland, forest, hills, or mountains

Display:

- name: `Household-service tenure`
- summary: `A dwelling and subsistence use held under the authority of a master's household.`

Ordinary duties:

| Duty ID | Existing event ID | First due | Cycle |
| --- | --- | --- | --- |
| `household_service` | `serf_weekwork_tally` | Spring, day 30 | every 2 years |
| `masters_harvest` | `serf_boon_harvest` | Autumn, day 30 | every 2 years |
| `local_heavy_service` | context-selected below | Winter, day 30 of the next campaign year | every 2 years |

Resolve `local_heavy_service` once at formation:

- forest, hills, or mountains: `serf_deadwood_amerced`
- farmland: `serf_bridge_cartage`, due in Summer rather than Winter

Recognized rights: none in the initial catalogue.

Conditional duties:

- `serf_officers_quartered` may become due during war.

Required event copy:

- Add pagan branches to the shared week-work, harvest, selected local service, and
  quartering events.
- Steppe, desert, and marsh combinations are excluded until a defensible package exists.
  They use the fallback.

### 4. `dependent_farming`

Selection:

- `priority: 0`
- no faith, culture, terrain, development, or settlement restriction

Display:

- name: `Dependent farming tenure`
- summary: `A household holding used by local custom in return for labor and seasonal service.`

Ordinary duties:

| Duty ID | Existing event ID | First due | Cycle |
| --- | --- | --- | --- |
| `customary_labor` | `serf_weekwork_tally` | Spring, day 30 | every 2 years |
| `seasonal_harvest` | `serf_boon_harvest` | Autumn, day 30 of the next campaign year | every 2 years |

Recognized rights: none in the initial catalogue.

Conditional duties:

- `serf_officers_quartered` may become due during war.

Required event copy is geographically and confessionally neutral.

## Data definitions

Use symbolic IDs for all prose. A package definition should have this shape:

```js
{
  id: 'latin_manorial',
  priority: 300,
  selector: {
    faithAncestor: 'catholic',
    traditionsAny: ['west_european', 'celtic', 'romance'],
    terrainAny: ['farmland', 'forest', 'hills', 'mountains'],
    settlementKindsAny: ['village', 'town']
  },
  nameKey: 'tenure_archetype_latin_manorial_name',
  summaryKey: 'tenure_archetype_latin_manorial_summary',
  duties: [
    {
      id: 'week_work',
      eventId: 'serf_weekwork_tally',
      firstDue: { season: 'spring', day: 30, cycle: 0 },
      intervalTurns: 720
    }
  ],
  contextSlots: [],
  conditionalDuties: [],
  rights: []
}
```

The real `latin_manorial` definition includes all four duties, both conditional duties,
the terrain-selected right, and the `local_facility_due` context slot described above.
The abbreviated object only establishes the schema.

Recognized rights are descriptive in this phase. They provide localized evidence of
what the household may use, but they do not add a holding, action, resource modifier,
or automatic event effect.

Validation must reject:

- duplicate archetype, duty, conditional-duty, right, or context-slot IDs
- an unknown event ID
- a missing name/desc translation record or explicit translation key
- a nonpositive interval
- a selector that names an unknown terrain, settlement kind, culture tradition, or
  faith ancestor
- a context slot whose cases do not have a fallback
- more than four ordinary duties or more than two recognized rights
- a catalogue without exactly one unconditional fallback

Note: In alignment with Fallowborn's data architecture, archetypes, duties, and rights define canonical English `name` and `desc` properties directly on their catalogue entries. These are extracted into `tenureArchetype.<id>.name`, `tenureDuty.<id>.name`, and `tenureRight.<id>.name` by `tools/i18n_catalog.py` and resolved at runtime via `FB.dataText`. Explicit `nameKey`/`descKey`/`summaryKey` overrides remain supported.

Validation errors must name the archetype and field. Build and cache the validated
catalogue on first use. Clear that cache from the same event-registration invalidation
path used when mods add or replace events.

Add this entry to `FBDATA.techImpactReviews.features` in `data/technology.js`:

```js
persistent_serf_tenure:{
  mode:'none',
  rationale:'Household tenure, customary service, and awareness of local obligations are baseline social conditions, not capabilities unlocked by sovereign research.'
}
```

No technology currently unlocks or suppresses this capability.

## Saved state

Store the record at `state.player.tenure`:

```js
{
  version: 1,
  status: 'active',
  provinceId: 'barcelona',
  settlement: 0,
  archetypeId: 'latin_manorial',
  formedTurn: 0,
  formedBy: 'new_game',
  lastPresentedSeasonKey: null,
  duties: [
    {
      id: 'week_work',
      eventId: 'serf_weekwork_tally',
      nextDueTurn: 29,
      lastResolvedTurn: null
    }
  ],
  conditional: [
    {
      id: 'marriage_leave',
      eventId: 'serf_marriage_leave',
      nextEligibleTurn: 0,
      pendingTurn: null,
      lastResolvedTurn: null
    }
  ],
  rights: ['gleaning_after_harvest']
}
```

For a new game beginning on Spring day 1, the four regular slots in chronological order
initially resolve to turns 29, 209, 479, and 659. Save those resulting turns, not the
calendar recipe.

Allowed `formedBy` values are:

- `new_game`
- `legacy_repair`
- `debt_bondage`
- `commendation`
- `forced_settlement`
- `rank_change`

When a tenure ends, retain the same object and set:

```js
{
  status: 'closed',
  endedTurn: 123,
  endReason: 'purchase'
}
```

Allowed end reasons are `purchase`, `manumission`, `old_custom`, `flight`,
`forced_relocation`, and `rank_change`.

If a forced settlement immediately creates a replacement, the new record may include
one bounded `priorClosure` object containing only the old archetype ID, province,
settlement, end turn, and end reason. Do not accumulate an unbounded tenure history.

Do not save controller IDs, lord IDs, display strings, resolved calendar labels, or
derived descriptions. Unknown optional duty or right IDs in a future save are ignored
for display and scheduling. An unknown archetype ID falls back to a neutral label while
preserving the stored due schedule.

## Implementation phases

Implement in the order below. Each phase should land with its own focused unit tests,
but the feature remains unavailable to players until all five phases are complete.

### Phase A: catalogue, localization, and validation

1. In `data/economy.js`, add the four archetypes, ordinary duty definitions,
   conditional duty definitions, rights, selectors, context slots, and calendar
   recipes specified above.
2. In `data/technology.js`, add the `persistent_serf_tenure` entry above to
   `FBDATA.techImpactReviews.features`.
3. In `js/i18n.js`, add structured localization domains for archetypes, duties,
   conditional duties, rights, and tenure status labels. English is required for every
   shipped ID before activation.
4. In `tools/i18n_catalog.py`, register the same structured domains so future catalog
   work can discover them. Do not regenerate translation catalogs as part of this
   implementation unless the owner requests it.
5. In `js/events.js`, add `FB.validateTenureData()` and a cached normalized catalogue.
   Invoke validation before the first tenure is formed, and invalidate it when the
   event registry changes.
6. Keep selection helpers pure. Given home province, settlement index, culture, faith,
   terrain, and `dev0`, they return the same archetype and context slots without
   reading or advancing RNG state.

Phase A exit criteria:

- all four packages validate
- malformed fixture packages fail with actionable messages
- every faith, culture, terrain, and settlement combination selects exactly one
  package
- no player state or RNG state changes during selection

### Phase B: formation, repair, and lifecycle

Add these public helpers in `js/events.js`, where player-tier and event lifecycle logic
already meet:

```js
FB.ensureSerfTenure(state, formedBy)
FB.activeSerfTenure(state)
FB.closeSerfTenure(state, reason)
FB.replaceSerfTenure(state, formedBy, priorReason)
FB.tenureView(state)
```

`FB.ensureSerfTenure` must:

1. Return `null` without mutation when the player is not tier 0.
2. Return the existing active record without recalculating its package or schedule.
3. Read the stable home province and settlement index. Never use the current travel
   location.
4. Read the stable bookmark ID, household identity, culture, faith, province terrain,
   `dev0`, and baseline settlement `kind`. Pass the bookmark and identity through the
   pure selector even though the initial four selectors do not branch on them.
5. Select one archetype by priority and declaration order. Do not derive any input from
   mutable controller, development, or settlement-upgrade state.
6. Resolve each context slot once.
7. Convert every `firstDue` recipe to an absolute turn with `FB.dateOrdinal`: construct
   the target `{ year, season, day }`, subtract `FB.dateOrdinal(state.date)`, and add the
   delta to `state.turn`. If that turn is already past, advance by whole intervals until
   it is not in the past. `FB.dateAtTurn` remains the inverse used for display.
8. Save duties in definition order, save any selected rights, initialize conditional
   records, and set `formedTurn` to the current turn.
9. Consume no RNG and queue no event.

New games:

- In `G.start` in `js/main.js`, call `FB.ensureSerfTenure(state, 'new_game')` after the
  protagonist and permanent home exist, but before the first render and autosave.
- Tier 1 and higher starts do not receive a closed or placeholder record.

Legacy saves:

- Do not eagerly synthesize tenure in `FB.save.restore`.
- The first Rank & Realm view or daily tenure tick calls
  `FB.ensureSerfTenure(state, 'legacy_repair')`.
- A legacy tier 0 save uses its saved home, culture, faith, and stable map data. The same
  save always obtains the same package and schedule, and the RNG value before and after
  repair is byte-for-byte identical.
- A legacy tier 1 or higher save receives no synthetic record.
- Keep the save schema version at 3 because the new field is optional and lazily
  repaired.

Tier changes:

1. Extend the existing `FB.setPlayerTier` options with `tenureEndReason`,
   `tenureFormationReason`, and `formTenure`.
2. A transition from tier 0 to a higher tier closes an active tenure with
   `tenureEndReason || 'rank_change'`.
3. A transition from a higher tier to tier 0 forms a new tenure with
   `tenureFormationReason || 'rank_change'`, unless `formTenure === false`.
4. A no-op tier assignment does not close, replace, or reschedule tenure.
5. Preserve all existing tier normalization and telemetry behavior.

Wire the current routes explicitly:

| Route | Required tenure behavior |
| --- | --- |
| `buy_freedom` in `js/actions.js` | close as `purchase` before tier 1 is applied |
| `manumission` in `data/events_peasant.js` | close as `manumission` |
| `old_custom_end` personal-freedom result | close as `old_custom` |
| `flee_serfdom` | close as `flight` before movement and tier change |
| `devastation_commend` in `js/world.js` | form as `commendation` after tier 0 is applied |
| `bondage_submit` in `js/economy.js` | form as `debt_bondage` after tier 0 is applied |
| `raid_enslave` in `js/events.js` | close as `forced_relocation`, suppress intermediate formation, establish the new permanent settlement, then form as `forced_settlement` |

Add `tenureEnd` to the known declarative effect keys in `FB.applyEffects`. Apply it
before `tierSet` and movement effects. This allows the manumission, old-custom, and
flight event definitions to state the correct reason. The `FB.setPlayerTier` behavior
remains the safety net for future callers.

Succession:

- Do not recalculate, clone, or advance tenure when the protagonist changes. The
  household record and exact due turns survive on the existing player state.
- Any tenure event queued for the deceased protagonist becomes stale through its
  protagonist context. The unchanged due duty may be queued for the successor in a
  later eligible season.

Phase B exit criteria:

- new tier 0 games have an active record before their first autosave
- legacy repair is deterministic and RNG-neutral
- freedom, bondage, commendation, flight, forced relocation, and ordinary rank changes
  record the specified reason
- succession preserves the exact schedule
- repeated lifecycle calls are idempotent

### Phase C: scheduler and tenure-aware events

Add `FB.tenureDay(state)` in `js/events.js`. Call it from `G.passDay` in `js/main.js`
immediately before `FB.pickDailyEvents`.

Daily scheduler behavior:

1. Ensure a legacy tier 0 tenure if needed. Return for any higher tier, closed tenure,
   travel-only missing home, or invalid record.
2. Convert newly met conditional triggers to saved `pendingTurn` values.
3. Stop when a still-valid tenure event is already in the event queue.
4. Stop when `lastPresentedSeasonKey` equals the current campaign year and season.
5. Collect regular duties whose `nextDueTurn <= state.turn` and conditional duties
   whose `pendingTurn <= state.turn`.
6. Choose the lowest due turn. Break ties by the duty's saved definition order.
7. Queue exactly one existing event with this context:

   ```js
   {
     tenureFormedTurn: tenure.formedTurn,
     dutyId: duty.id,
     dueTurn: duty.nextDueTurn || duty.pendingTurn,
     protagonistId: state.player.id,
     locationId: state.player.location
   }
   ```

8. Save `lastPresentedSeasonKey`, but do not advance or clear the duty.
9. Leave other overdue duties unchanged. They can be offered in a later season.

Add one shared `contextValidator` for tenure events. It must require:

- an active tier 0 tenure
- the same `formedTurn`
- the same permanent home province and settlement as the tenure record
- the same protagonist and current location stamped on the event
- a matching regular or conditional duty and event ID
- an unchanged due turn that is no later than the current turn

The validator fails closed. A stale event is removed by the existing queue validation
path and applies no cost or reward.

Advance duties at the shared manual/autoresolve boundary in `FB.resolveEventOption`,
after the event choice has been accepted and its effects have applied:

- a regular duty adds its configured interval to `nextDueTurn` until the result is
  later than the current turn, then saves `lastResolvedTurn`
- a conditional duty clears `pendingTurn`, saves `lastResolvedTurn`, and applies its
  `nextEligibleTurn` cooldown
- a second attempt to resolve the same queued context is a no-op
- closing tenure as an event effect wins over advancing the old tenure

Convert these ten ordinary burden stories in `data/events_peasant.js`:

1. `serf_boon_harvest`
2. `serf_weekwork_tally`
3. `serf_mill_multure`
4. `serf_pannage_due`
5. `serf_marriage_leave`
6. `serf_tithe_sheaf`
7. `serf_bridge_cartage`
8. `serf_common_oven`
9. `serf_deadwood_amerced`
10. `serf_officers_quartered`

For each converted event:

- retain the event ID, choices, effects, and consequence math
- add tenure metadata and the shared context validator
- set `trigger.never: true` so the random picker cannot select it
- remove its independent chance and cooldown as the source of incidence
- branch title and body copy by the tenure archetype or saved duty ID
- use neutral existing copy as the fallback for an unknown optional ID
- do not apply any cost when the event is queued or rendered

Conditional trigger rules:

- Marriage leave: after the existing marriage action succeeds, mark it pending for the
  next daily tick only when the active package defines it. Record the marriage identity
  or formation turn needed to prevent retroactive and duplicate charges. Its cooldown
  begins on resolution, not marriage.
- Officers quartered: detect a peace-to-war transition with the existing war-state
  helpers and set it due 7 days later. Do not set it more than once per war, and require
  at least 12 seasons after its last resolution. Clear an unresolved pending charge if
  the war ends before it is presented.
- If another tenure decision was already presented in the season, retain the pending
  conditional duty for a later season.

Keep `serf_extraordinary_tallage` and `serf_seed_grain_requisition` in the random event
pool with their present rarity and cooldowns. They are exceptional demands, not a
saved ordinary duty. They may branch descriptive copy on the active archetype, but
must not create, advance, or clear a duty. Do not alter unrelated peasant, health,
travel, seasonal, war, or relationship event pools.

Phase C exit criteria:

- no ordinary burden event appears without a matching due tenure duty
- queuing and rendering never charge the household
- manual and autoresolve paths each advance a duty once
- a replayed choice cannot advance or charge twice
- stale tenure, home, tier, protagonist, location, and duty contexts all fail closed
- exceptional events remain independently reachable
- no season presents more than one ordinary tenure decision

### Phase D: Rank & Realm presentation

Put the player-facing panel in `UI.showRankDetails` in `js/ui_panels.js`, immediately
after the existing tier 0 Home paragraph. Do not create a second copy in Household and
do not add a new navigation tab.

For an active tenure, render:

1. localized archetype name and summary
2. home settlement, county, current controller, and current lord or local authority
3. two to four ordinary duties in saved order
4. zero to two recognized rights
5. the nearest due duty and its readable date through `FB.dateAtTurn`
6. any pending conditional duty
7. a short statement that this is customary use, not owned property
8. a short statement that lawful freedom ends personal service

Required stable selectors:

```text
[data-tenure-summary]
[data-tenure-duty]
[data-tenure-right]
[data-tenure-next-due]
[data-tenure-conditional]
```

Rendering rules:

- Call `FB.ensureSerfTenure(state, 'legacy_repair')` before building a tier 0 panel.
- Use `FB.tenureView(state)` as the only presentation adapter. The UI must not inspect
  raw selectors or calculate schedules.
- Derive the current controller and lord or local authority from the live world. Show a
  neutral localized label when either relationship is absent.
- Render the next date as a campaign label such as `Autumn 868`, followed by localized
  days remaining. Do not expose raw turn numbers.
- When there is no recognized right, say so explicitly. Do not omit the section in a
  way that makes the record appear incomplete.
- A closed tenure is not shown to tier 1 and higher players in this phase.
- Unknown optional IDs use a localized neutral label. Raw IDs never reach the screen.

Accessibility and narrow layout:

- Add only the CSS needed for the existing rank sheet to wrap long duty and right text
  at 390 CSS pixels.
- Keep labels and status understandable without color.
- Preserve the sheet's keyboard focus, Escape behavior, Close control, scrolling, and
  minimum target sizes.
- Opening, closing, or repeatedly rendering the sheet must not advance time, consume
  RNG, queue an event, or alter due dates after any one-time legacy repair.

Phase D exit criteria:

- Catholic, Muslim, pagan, and fallback records have visibly distinct localized names
  and duty lists
- live controller changes appear without mutating the saved record
- the panel remains usable at 390 CSS pixels and by keyboard
- repeated rendering is state-neutral after legacy repair

### Phase E: tests, documentation, and integration

#### Event and scheduler tests

Extend `tests/e2e/specs/serf-events.spec.js` to cover:

- catalogue validation and fallback selection
- replacement of the previous random-incidence test with a due-duty test
- absence of all ten ordinary events when there is no matching active duty
- no charge before a choice is accepted
- one advance and one set of effects through manual resolution
- one advance and one set of effects through autoresolve
- replay protection for the same event context
- invalidation after tier change, home change, tenure replacement, protagonist change,
  travel location change, duty removal, and due-turn change
- marriage leave only for a marriage formed after tenure creation
- quartering once per eligible war and cancellation when war ends first
- one ordinary tenure presentation per season
- continued random reachability of extraordinary tallage and seed requisition

#### Determinism and selection tests

Extend `tests/e2e/specs/determinism.spec.js` with:

- identical formation output from the same start state twice
- unchanged RNG state before and after new formation and legacy repair
- different packages for representative Catholic, Muslim, and pagan environments
- deterministic resolution of the Catholic facility slot and pagan heavy-service slot
- neutral fallback for unsupported Jewish, steppe, desert, and low-development Muslim
  fixtures

Extend `tests/e2e/specs/start-progression.spec.js` with:

- an active tenure before the first tier 0 autosave
- no tenure placeholder for a fresh tier 1 or higher start
- exact home province and settlement capture for both bookmarks

Use these start codes or their builder equivalents as the primary fixtures:

```text
TENUREC-867-serf-barcelona-f-Ada
TENUREM-867-serf-fustat-m-Hassan
TENUREP-867-serf-novgorod-m-Igor
```

Also cover Fustat with `arabic.shia` and Novgorod with
`finnic.baltic_pagan` in the 1066 bookmark. Test both the Youth `standard` and
Established `established` family presets across the matrix. The package selection must
not depend on age, sex, starting gold, or family preset.

#### Save and lifecycle tests

Extend `tests/e2e/specs/storage.spec.js` with:

- save, export, import, and restore of an active tenure and exact due turns
- lazy repair of an old tier 0 v3 save with no tenure field
- no repair for an old tier 1 or higher save
- safe handling of unknown optional duty and right IDs
- safe neutral display of an unknown archetype ID
- preservation of save schema version 3

Extend `tests/e2e/specs/family-correctness.spec.js` with:

- succession preserving the exact tenure object and due schedule
- invalidation of a deceased protagonist's queued duty
- later requeue of the same still-due duty for the successor
- tier promotion closing the tenure and preventing future duty events
- forced relocation closing the old record and creating one new home-bound record

#### UI and localization tests

Extend the existing Station & Home coverage in
`tests/e2e/specs/onboarding.spec.js` with:

- the four archetype labels and their exact duty counts
- live home, county, and controller display
- nearest-due selection and readable date
- zero-right and one-right presentations
- pending conditional-duty presentation
- no raw IDs or untranslated tokens
- English and an injected test locale
- 390-pixel layout, keyboard opening, Escape, Close, focus, and scrolling
- proof that repeated sheet rendering changes neither state nor RNG

Do not modify `tests/e2e/specs/household-ui.spec.js` for this feature. Rank & Realm owns
the first presentation and its existing onboarding spec is the narrower test surface.

#### Owning documentation

Update these public docs in the implementation commit that changes their contracts:

- `docs/events.md`: scheduled duties, event context, validation, and resolution
- `docs/holdings.md`: customary use is not a holding or property
- `docs/state-and-saves.md`: optional `player.tenure` schema and lazy repair
- `docs/time.md`: calendar recipes and the once-per-season presentation rule
- `docs/religions.md`: faith-aware package selection and its limits
- `docs/ui.md`: Rank & Realm tenure presentation and stable selectors

Do not add a modding contract for tenure in this phase. Do not regenerate localization
catalogs unless separately requested. After implementation and owner-run browser tests,
bump `FB.VERSION` once and stamp all affected game loads according to the deployment
rules.

Phase E exit criteria:

- every new behavior has a focused automated specification
- all affected owning docs match the shipped behavior
- no private planning material or unsupported future promise appears in public files
- the owner has run the browser harness and reviewed the representative starts

## Balance target

Initial ordinary incidence should be predictable but lighter than the current random
stack:

- Catholic package: two ordinary decisions per campaign year on average
- Muslim package: two ordinary decisions per campaign year on average
- Pagan package: three ordinary decisions every two campaign years on average
- Fallback package: one ordinary decision per campaign year on average
- Conditional duties occur only when their condition is met and still obey the
  one-presentation-per-season cap

Measure median turns to lawful freedom, forced flight, and household collapse before
changing starting resources. If tenure raises early attrition too far, lengthen duty
intervals or reduce incidence before increasing starting gold, health, or food.

## Historical and representational guardrails

- Treat the Catholic package as one bounded form of manorial custom, not a universal
  definition of medieval dependency. Manorial records document varied local customs,
  services, courts, and rights rather than one uniform burden set. See the UK National
  Archives guides to [manors](https://www.nationalarchives.gov.uk/help-with-your-research/research-guides/manors/)
  and [manorial documents](https://www.nationalarchives.gov.uk/archives-sector/finding-records-in-discovery-and-other-databases/manorial-documents-register/a-guide-to-manorial-documents/).
- Keep the pagan package's language centered on household authority and service. Do
  not silently map later English manorial vocabulary onto every northern or eastern
  pagan setting. The National Museum of Denmark's overview of
  [slaves and thralls](https://en.natmus.dk/historical-knowledge/denmark/prehistoric-period-until-1050-ad/the-viking-age/power-and-aristocracy/slaves-and-thralls/)
  supports the bounded household-service framing.
- Keep the Muslim package tied to an irrigated local setting and avoid claiming a
  universal Islamic tenure. Evidence for agrarian measurement and irrigation custom is
  regional and changes across conquest and administration. See the Cambridge study of
  [agrarian measures in Granada](https://www.cambridge.org/core/journals/rural-history/article/agrarian-measures-in-the-kingdom-of-granada-before-and-after-the-castilian-conquest-the-lands-of-the-alpujarra/7E6298A38E6F89B91092EA475C4705AE).
- When a combination is unsupported, use the neutral fallback. Do not infer social
  structure from faith alone.

## Definition of done

Phase 1 is complete only when all of the following are true:

1. Every new and lazily repaired tier 0 household has exactly one deterministic active
   tenure tied to its permanent home.
2. The Catholic, Muslim, pagan, and fallback packages select under the exact rules in
   this document and expose their required duties and rights.
3. Rank & Realm shows the archetype, live home context, duties, rights, and nearest due
   date without describing customary use as owned property.
4. All ten ordinary serf stories are due-duty driven, while the two exceptional
   exactions remain rare random events.
5. Manual and autoresolve paths advance once, stale contexts fail closed, and no season
   presents more than one ordinary tenure choice.
6. Freedom, flight, bondage, commendation, forced relocation, rank change, and
   succession obey the lifecycle contract.
7. Formation, legacy repair, UI rendering, save round trips, and succession preserve
   determinism and exact schedules.
8. The named automated specifications and owning documentation are complete.
9. No new currency, property object, holding integration, modding surface, external
   asset, dependency, or build step has been introduced.
