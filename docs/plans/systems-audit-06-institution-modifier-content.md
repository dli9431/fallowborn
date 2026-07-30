# Plan: institution and temporary-modifier content

Date: 2026-07-29

Status: step 6 of the
[systems-audit roadmap](systems-audit-00-roadmap.md); implemented 2026-07-29 after
[plot and diplomacy content](systems-audit-05-plots-diplomacy-content.md). Integration
connected plot discovery, tax-audit, and merchant outcomes without changing the
modifier contract.

Related design:
[Royal Council](../designs/council.md),
[Estates](../designs/parliament.md),
[temporary modifiers](../designs/modifiers.md),
[events](../designs/events.md), and
[realms](../designs/realms.md).
Schema changes, if any, must also update [MODDING](../MODDING.md).

## Goal

Make the Royal Council and Estates matter across the rest of the game, and make
temporary modifiers a visible consequence of political stories rather than unused
infrastructure.

The existing institution mechanics remain:

- Council seats, officer bonuses, schemers/sycophants, and Crown Authority;
- Estates aid, scutage, motions, and votes;
- county and great-holy-war modifier records;
- declarative events, tags, and `addModifier`/`hasModifier`.

This plan adds authored consequences. It does not add another institution meter, merge
the Council with the Estates, create an institution tech tree, or add a direct
“manage modifiers” screen.

## Baseline and target

The current core catalog has:

- ten Council events;
- six Estates events;
- four temporary modifiers.

The first tranche should add approximately:

- four Council event chains or substantial standalone decisions;
- four Estates event chains or substantial standalone decisions;
- six county modifiers with real grant/expiry paths;
- at least two cross-links from plot/diplomacy content.

Every new modifier must ship with an actual core grant path. Do not add catalog-only
definitions except for an explicitly documented compatibility/test fixture.

## Institution content families

### 1. Guild and finance disputes

Use existing monopolies, partnerships, loans/defaults, enterprises, and guild
relationships.

Council examples:

- Treasurer argues for strict collection while another officer warns of unrest;
- a monopoly holder seeks royal protection or faces investigation;
- a defaulted magnate asks the crown to intervene.

Estates examples:

- lords dispute a toll or market charter;
- the liege seeks recognition of a new levy on trade;
- the player bargains local redress for accepting an aid.

Outcomes may change existing Standing, authority, aid/scutage, money, monopoly state,
or county modifiers. Do not create a generic treasury-influence currency.

### 2. Levy and logistics

Use existing levy composition, war state, summons, Council offices, and Estates terms.

Council examples:

- Constable demands a heavier muster;
- vassals seek a temporary levy exemption;
- wartime logistics force a choice between supply and Common Voice.

Estates examples:

- the liege asks for an emergency subsidy;
- the benches trade scutage for a temporary service concession;
- a county wins exemption after supplying exceptional service.

Ordinary and great-holy-war operations remain unchanged. Outcomes adjust existing
resources, Standing, institution terms, or supported modifiers.

### 3. Domain, grants, and revocation

Use current domain cap, direct holdings, vassals, grants, revocation gates, and de jure
structure.

Stories may:

- pressure an over-domain ruler to grant a county;
- recommend, but never silently execute, a complete duchy grant;
- contest a revocation;
- turn an heirless/escheated county into an institutional dispute;
- attach a temporary local consequence to a grant, refusal, or confirmed custom.

The event may link to the existing grant/revocation preview. It must not transfer land
from an ordinary event option without an explicit named confirmation.

### 4. Faith and public legitimacy

Use current religious head, piety, excommunication, Bishop/Papal state, Common Voice,
and institution authority.

Council examples:

- Almoner presses for relief or religious patronage;
- Chamberlain challenges clerical immunity;
- Catholic magnates divide over investiture or Papal obedience.

Estates examples:

- clergy and lords dispute an exemption;
- the assembly conditions aid on relief or sanctuary;
- public legitimacy is traded against the liege’s demand.

Faith-specific text must use complete variants. Do not add another religious-standing
track.

## Initial county modifier briefs

Final ids and numbers should be balanced during implementation. The first tranche
should cover these durable circumstances using currently supported keys.

### Market Charter

- Intended effects: modest tax gain, cheaper local construction, small seasonal upkeep.
- Sources: Council/Estates trade settlement or diplomatic merchant agreement.
- Tradeoff: public or vassal Standing cost when granted unfairly.

### Contested Tolls

- Intended effects: reduced tax and increased harmful `unrest` event exposure.
- Sources: failed guild/finance dispute, provocative diplomacy, or discovered plot.
- Resolution: institutional settlement, payment, or natural expiry.

### Levy Exemption

- Intended effects: lower county levy, higher effective Common Voice.
- Sources: Estates bargain, rewarded service, or Council concession.
- Must remain county-bound through ownership changes.

### Muster Burden

- Intended effects: higher levy with worse Common Voice or harmful `unrest` exposure.
- Sources: wartime Council/Estates demand.
- Duration must be bounded and visible before the choice.

### Roads Patrolled

- Intended effects: modest tax protection and reduced harmful `unrest` outcomes using
  supported county keys.
- Sources: institution spending or a diplomatic safe-conduct settlement.
- Do not claim travel-time or route-safety effects unless the modifier schema is
  deliberately extended and documented.

### Settlement Grudge

- Intended effects: lower Common Voice and increased harmful `unrest` exposure.
- Sources: coercive grant/revocation, failed redress, discovered political plot.
- Resolution: event settlement, ownership-independent expiry, or explicit removal.

Do not overload one modifier with tax, levy, building, Common Voice, and event-tag
effects merely to make it important. Each modifier needs a legible story and a small
mechanical identity.

## Existing modifier boundaries

County modifiers:

- belong to the county, not its current holder;
- survive ownership changes;
- contribute player-wide Common Voice/upkeep only while directly held;
- use only supported `tax`, `levy`, `buildingCost`, `commonVoice`, and event-tag keys.

Campaign modifiers:

- affect only valid protagonist participation in the current great holy war;
- do not become ordinary-war or AI-participant modifiers;
- disappear with campaign/vow lifecycle as currently designed.

This tranche should concentrate on county/institution content. Do not broaden modifier
scope to realms, routes, characters, or ordinary wars unless a separate design proves
that the existing scopes cannot express the required story.

## Event integration

Prefer declarative effects:

- `addModifier` and `hasModifier`;
- Standing, Common Voice, gold, prestige, piety, and authority adjustments;
- existing Council/Estates custom handlers;
- event `tags` for mitigation or aggravation;
- queued follow-up events for settlements.

Add a custom handler only for an authoritative institution mutation such as one
aid/scutage step or a validated monopoly transition. Keep those handlers in
`js/council.js` or `js/parliament.js`, not as general event-engine exceptions.

Every new trigger/effect/selector must be documented in `docs/MODDING.md`. Do not
hand-code one event’s prose or branching in engine JS.

## Presentation

The Governance shell should summarize institution-caused modifiers relevant to the
player’s direct domain.

The selected Land county remains authoritative for:

- every active modifier chip;
- name, icon, description, remaining days;
- upkeep and exact effects;
- source where a semantic source can be shown without storing rendered prose.

Event previews disclose:

- modifier name and duration;
- exact supported effects;
- upkeep;
- whether the effect remains with the county after transfer.

There is no modifier inventory or dismiss button unless the originating story provides
a specific lawful removal.

## Cadence and balance

- Avoid firing an institution story every event slot merely because the player has an
  institution.
- Council content should react to seats, authority, Standing, war, and domain state.
- Estates content should react to aid/scutage, motions, war, Standing, and service.
- Apply per-event cooldowns and institution conditions.
- Modifier durations should normally span multiple seasons but remain short enough for
  the player to see cause and expiry within a reign.
- Upkeep must enter the existing seasonal ledger and reliable-income calculations.
- Positive and negative alternatives should be comparable to existing institution
  choices; no modifier should become a mandatory permanent optimum.

## State and saves

Use the existing additive modifier and institution state.

Do not:

- change save format 3;
- store rendered source text;
- duplicate modifier totals;
- copy modifier effects into counties, realms, or player flags;
- add a second Council/Estates event queue;
- persist a display-only Governance summary.

Unknown/removed modifier ids continue through existing save repair.

## Localization and accessibility

- Modifier `name` and `desc` remain structured display fields in data.
- Event text uses semantic tokens and complete faith/context variants.
- Chronicle gains, expiries, and institution results remain durable descriptors.
- Modifier chips and event choices remain keyboard/touch accessible.
- Effects and duration are written in text; icon/color alone never carries meaning.
- Preview-locale expansion must fit Land, Governance, and event surfaces.

## File-level implementation

- `data/modifiers.js`: add complete modifier definitions with supported effects.
- `data/events_council.js` / `data/events_parliament.js`: own the new institution
  stories and modifier grant/removal choices.
- `data/events_noble.js` / `data/events_world.js`: own only cross-system follow-ups
  whose audience does not belong to one institution pack.
- `js/council.js` / `js/parliament.js`: add narrowly reusable validated institution
  mutations where declarative effects cannot express the change.
- `js/modifiers.js`: change only for a reusable, documented modifier contract; new
  content alone should require no engine changes.
- `js/ui.js`: reuse existing modifier chips and Governance/Land summaries rather than
  create management UI.
- `docs/designs/council.md`, `parliament.md`, `modifiers.md`, `events.md`, and
  `ui.md`: record sources, effects, and presentation.
- `docs/MODDING.md`: document any new trigger/effect/scope contract.
- `tests/e2e/specs/institution-modifiers.spec.js`: cover event gates, modifier
  lifecycle, ledgers, transfer, and display.

## Implementation phases

1. Fix the initial modifier ids, supported effects, durations, and grant/removal paths.
2. Author the Council content family and required narrow handlers.
3. Author the Estates content family and required narrow handlers.
4. Connect plot/diplomacy outcomes to at least two modifiers.
5. Add Governance/Land summaries without a management loop.
6. Tune cadence and effects against existing tax, levy, Common Voice, and event scales.
7. Update Council, Parliament, modifiers, events, UI, and MODDING documentation.

## Tests to author

Add focused browser/data coverage without running it as an AI coding agent:

- every new institution event meets its seat/authority/terms/war/domain gates;
- visible and autoresolved options apply equivalent authoritative changes;
- every core modifier has a reachable grant path;
- duplicate grants refresh instead of stack;
- expiry, removal, transfer, upkeep, and save/restore follow existing contracts;
- modifier tax/levy/building/Common Voice/tag effects match the authoritative ledgers;
- Council and Estates remain separate and no event creates the wrong institution state;
- Land and Governance show identical active records and remaining duration;
- localized durable notices preserve semantic ids and parameters.

## Completion criteria

- Council and Estates decisions affect finance, guilds, war logistics, domain,
  religion, and local legitimacy through existing systems.
- The core modifier catalog grows beyond four with visible, reachable, balanced
  consequences.
- Every modifier has a real story source and obeys county/campaign ownership rules.
- No new institution meter, modifier-management screen, or scope is added.
- Event additions remain declarative, deterministic, localized, and mod-documented.
- Governance and Land explain the same authoritative institution/modifier state.
