# Plan: plot and diplomacy content expansion

Date: 2026-07-29

Status: implemented. Step 5 of the
[systems-audit roadmap](systems-audit-00-roadmap.md), after
[interaction-card consolidation](systems-audit-03-interaction-cards.md) and the
[large-list readability](systems-audit-04-large-list-readability.md) pass. The core
catalog now includes twelve plots and twelve targeted diplomatic stories.

Related design:
[piety, intrigue, and diplomacy](../designs/piety-intrigue-diplomacy.md),
[events](../designs/events.md),
[realms](../designs/realms.md), and
[UI](../designs/ui.md).
Schema changes, if any, must also update [MODDING](../MODDING.md).

## Goal

Give intrigue and foreign policy more consequences by adding authored choices to the
existing systems.

The core frameworks are already sufficient:

- one active plot;
- Scheming focus and saved plot power;
- target context and discovery;
- named plot chances;
- persistent Standing directions toward neighboring sovereigns;
- envoys, pacts, alliances, ruler gifts, royal marriage, and war causes;
- declarative events and durable messages.

This plan adds content before mechanics. It does not add an intrigue currency, agent
roster, second plot slot, realm-to-realm opinion matrix, or autonomous diplomatic AI
court simulation.

## Baseline and target

The current core catalog has seven plots. The first content tranche should add at least
five materially distinct plots, bringing the catalog to twelve or more, and add
approximately twelve diplomatic events across Improve, Provoke, pact/alliance, and
ruler-succession contexts.

Count is not the quality gate. Every addition must:

- serve a distinct tier or political context;
- target an existing person, realm, county, contract, or institution where possible;
- expose a consequential choice rather than a disguised resource roll;
- use existing state and effects unless a narrowly documented adapter is unavoidable;
- have discovery/failure consequences as meaningful as success;
- remain deterministic and save-safe.

## Plot content briefs

Final ids and prose may change, but the first tranche should cover these gaps.

### 1. Feudal obligation plot

For a sworn landed player, scheme around the liege’s aid, scutage, service record, or a
future Estates motion.

Possible outcomes:

- secure evidence that strengthens a later redress vote;
- reduce an immediate obligation at a Standing or prestige cost;
- fail and strengthen the liege’s hand;
- discovery damages Standing and may create a durable institutional consequence.

Do not bypass the Estates permanently or write an obligation outside the existing
`obl` record.

### 2. Guild-monopoly plot

Use an active incoming or outgoing monopoly as the target.

Possible outcomes:

- expose abuse and end or weaken the charter through an existing invalidation path;
- extract compensation while preserving it;
- defend it and gain guild support at a Common Voice or Standing cost;
- discovery benefits the opposing grantor, guild, or public.

The plot must not create a second monopoly slot or generic guild-opinion meter.

### 3. Council counter-scheme

For a crowned ruler with a valid Council and a schemer risk, let the Chamberlain,
another officer, or the protagonist pursue evidence before an ordinary Council crisis.

Possible outcomes:

- expose one scheming magnate;
- trade leniency for Standing or authority;
- manufacture a charge and risk backlash;
- fail, increasing the danger represented by existing Council state/events.

Use existing Council seats, traits, Standing, and authority. Do not add a hidden spy
network.

### 4. Diplomatic correspondence plot

Target a neighboring sovereign, active pact, alliance, envoy relationship, or political
direction.

Possible outcomes:

- steal or forge correspondence to move Standing;
- strain or preserve a pact through a deliberate choice;
- reveal a war intention through Chronicle/UI information already derivable from
  existing state;
- provoke a border incident without creating a free undeclared war.

The plot must not create pairwise AI opinions or an intelligence map.

### 5. Rival or claimant plot

Extend personal rivalry into political consequences when the rival has a realm,
Council, claim, or household position connection.

Possible outcomes:

- discredit a claim or office bid;
- redirect feud heat into a public settlement;
- gain evidence at the cost of escalating the feud;
- discovery gives the rival a stronger response through existing rivalry hooks.

Use a real named rival. Never generate a replacement rival merely because an event
mentions one.

## Targeting and context

Prefer a short target-selection stage before a plot begins.

Every targeted plot stores a JSON-safe context containing only stable semantic ids:

```js
{
  realmId:'...',
  characterId:'...',
  provinceId:'...',
  institution:'council|estates',
  contractId:'...'
}
```

Only include fields the plot actually needs. Resolution and discovery revalidate the
target; they do not silently retarget.

Reuse existing selectors and role resolution first. Add a new selector only when it
serves more than one authored plot/event and has a stable modding contract. Document
every new selector, trigger, effect, or context shape in `docs/MODDING.md`.

## Diplomatic event families

Add event-driven consequences around the existing player-relative diplomatic state.

### Improve direction

Stories may cover:

- arbitration of a border or merchant dispute;
- exchange of envoys, relics, hostages, or ceremonial gifts;
- a request for mediation or safe conduct;
- a chance to turn warm Standing into a pact/alliance opportunity.

Choices should trade gold, prestige, piety, time, or another existing commitment for
Standing and concrete outcomes.

### Provoke direction

Stories may cover:

- insulted envoys;
- disputed tolls or grazing;
- proxy support for a hostile claimant;
- a mobilization scare;
- a border incident that can be escalated, denied, or repaired.

Provoke is not a free war button. Escalation must use existing war causes and
declaration confirmation.

### Pact and alliance

Stories may:

- test whether the player honors a bounded request;
- offer a deliberate renewal, concession, or cooling of relations;
- create a choice between the relationship and a domestic cost;
- recognize existing war participation without adding an alliance-command system.

### Ruler succession

When a political counterpart changes, occasional stories may:

- acknowledge the new ruler’s neutral Standing;
- offer a first embassy or gift;
- revisit a pact or alliance only through its existing validity and generation rules;
- surface a royal child or dynastic connection already present in succession state.

Do not inherit the predecessor’s Standing through prose or hidden effects.

## Discovery and counterplay

Discovery should identify what was endangered and give the player a response.

Use existing:

- `plot_discovery` named chance;
- Chamberlain/Council hooks;
- rivalry contact and heat;
- Standing adjustments;
- event queues and flags;
- temporary modifiers once the
  [institution/modifier plan](systems-audit-06-institution-modifier-content.md)
  lands.

Discovery outcomes should include some combination of:

- abandon and absorb the loss;
- spend resources to contain the evidence;
- blame an existing participant;
- continue at a higher cost/risk;
- convert the incident into rivalry, institutional conflict, or a temporary county
  consequence.

Autoresolve must see the same material risks as the visible choice through ordinary
effects and option weights.

## Data-first implementation

Prefer authored data in:

- `FBDATA.plots` for definitions;
- the appropriate `data/events_*.js` pack for resolution, discovery, and diplomatic
  stories;
- existing named chances and declarative effects;
- small registered custom handlers only for authoritative cross-system mutations that
  cannot be expressed in data.

Do not broaden `js/events.js` for one-off prose. A reusable interpreter key requires a
modding contract, documentation, and tests.

## Balance and cadence

- Plot power and discovery risk remain on the existing scale.
- New plots share the one active slot.
- Political events use cooldowns so one target/direction cannot dominate every season.
- A successful plot should not exceed the value of the deliberate action it replaces
  without proportionate risk.
- Failure and discovery cannot destroy a realm, title, alliance, or major asset through
  one opaque roll.
- Content should cover commoner, gentry, vassal, sovereign, and crowned play rather than
  concentrating only at the top.

## State and save boundaries

Prefer no new top-level state.

Allowed additions are additive, JSON-safe fields on an existing plot/event context or a
narrow existing system record. Never store rendered prose.

Do not change save format 3. Old saves with an active plot must continue under the
definition/context with which they began or fail safely through existing target-loss
cleanup.

## Localization and accessibility

- All event and plot display fields remain English source data for catalog extraction.
- Use semantic tokens and complete faith/context variants where needed.
- Durable Chronicle results use message descriptors.
- Target pickers and previews use native controls, exact costs/odds where the game
  normally discloses them, keyboard hints, and mobile-safe layout.
- Named participants receive character/realm cards instead of appearing as bare prose.

## File-level implementation

- `data/map_data.js`: add core plot definitions and only broadly reusable target
  selector declarations supported by the engine.
- `data/events_common.js`, `events_noble.js`, `events_world.js`, and
  `events_council.js`: own plot resolutions, discoveries, and diplomatic stories in
  the event pack matching their audience.
- `js/actions.js`: add reusable plot target selectors and authoritative cross-system
  custom handlers when data alone is insufficient.
- `js/events.js`: change only for a reusable, documented interpreter contract.
- `js/ui.js`: reuse interaction cards for target selection and add only missing plot
  preview/return routing.
- `docs/designs/events.md`, `piety-intrigue-diplomacy.md`, and `realms.md`: record the
  content and context rules.
- `docs/MODDING.md`: document every new selector, trigger, effect, or context shape.
- `tests/e2e/specs/plots-diplomacy.spec.js`: cover plot lifecycle and diplomatic
  content families.

## Implementation phases

1. Inventory reusable target selectors, effects, named chances, and cross-system
   mutation APIs.
2. Author and test the five plot briefs with full success/failure/discovery paths.
3. Add Improve and Provoke diplomatic event families.
4. Add pact/alliance and ruler-succession event families.
5. Connect suitable outcomes to institution/modifier content after that catalog lands.
6. Update events, diplomacy, relevant system designs, and MODDING for any schema
   extension.

## Tests to author

Add focused browser/data coverage without running it as an AI coding agent:

- every plot appears only in its intended tier/context;
- target selection stores stable ids and survives save/export/restore;
- target death, realm death, contract end, or institution change fails safely;
- fixed RNG state reproduces success, failure, and discovery;
- plots consume one slot and return to the proper focus state;
- Improve/Provoke events use the correct target and direction;
- pact/alliance/succession events respect generation and validity rules;
- visible and autoresolved outcomes apply equivalent authoritative effects;
- Chronicle records remain locale-neutral;
- no event creates pairwise AI opinion or a second intrigue resource.

## Completion criteria

- The core plot catalog grows beyond seven with meaningful coverage across the social
  ladder.
- Intrigue touches existing feudal, guild, Council, rivalry, and diplomatic state
  without adding a parallel subsystem.
- Improve, Provoke, pact, alliance, and succession relationships generate varied
  choices.
- Discovery creates legible counterplay and durable consequences.
- All new state/schema is additive, documented, deterministic, and mod-safe.
- The player still manages one plot through the Scheming focus.
