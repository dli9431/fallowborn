# Plan: consistent character and realm interaction cards

Date: 2026-07-29

Status: **implemented 2026-07-29** as step 3 of the
[systems-audit roadmap](systems-audit-00-roadmap.md), after
[Standing](systems-audit-01-standing.md) and the
[Governance shell](systems-audit-02-governance-shell.md). The
[large-list readability](systems-audit-04-large-list-readability.md) pass follows
and owns roster-scale scanning in Network and Work & Enterprises.

Related design:
[characters](../designs/characters.md),
[marriage](../designs/marriage.md),
[realms](../designs/realms.md),
[piety, intrigue, and diplomacy](../designs/piety-intrigue-diplomacy.md), and
[UI](../designs/ui.md).

## Goal

Make dealings with a person or ruler predictable without merging their mechanics.

Today the player may encounter relationship actions in a character sheet, ruler sheet,
Network, Deeds target picker, Council, Estates, Land notable, or a travel review. The
same target can expose gifts, cultivation, courtship, envoy, alliance, pact, war, or
feudal actions in different orders and with different summaries.

The result should be two authoritative surfaces built from one presentation grammar:

- a **character interaction card** for personal relationships;
- a **realm/ruler interaction card** for feudal and diplomatic relationships.

Standing is shared. Context, costs, gates, consequences, and saved commitments remain
distinct.

This plan owns the detail and action surface for one target. It does not own filtering,
collapsing, searching, or needs-attention ordering in a long Network roster. It should
leave compact, stable row routes for the subsequent
[large-list readability](systems-audit-04-large-list-readability.md) pass.

## Dependencies

### Standing

Consume the canonical typed Standing API and shared renderer from the active Standing
integration. Do not read or write legacy opinion fields directly from new card code.

The same reigning ruler must show the same Standing on both character and realm cards.
The cards may explain different consequences because one context is personal and the
other political.

### Governance

Governance becomes the authoritative overview of the player’s own political position.
Interaction cards handle one counterpart. They link to Governance for domain,
institution, and player-realm context rather than reproducing it.

## Shared card grammar

Create one render-only card model, tentatively:

```js
{
  target: {kind:'character|realm', id:'...'},
  identityHtml: '...',
  context: [],
  standing: {value:0, band:'neutral', explanation:'...'},
  commitments: [],
  actions: [
    {
      id:'stable-action-id',
      group:'relationship|gift|travel|diplomacy|feudal|war',
      label:'...',
      detail:'...',
      enabled:true,
      blockedReason:null,
      consequence:'...',
      route:'...'
    }
  ]
}
```

The implementation may use separate builder functions, but each action row must have:

- a stable semantic id;
- localized label and complete description;
- exact cost, day use, travel time, cooldown, and Standing change where applicable;
- enabled state from the authoritative mechanic;
- a visible reason when unavailable;
- explicit commitment/replacement consequences;
- one route to the existing action or confirmation flow.

The renderer never decides eligibility or performs mutation.

## Character interaction card

The character sheet remains authoritative for a full character.

Show, when relevant:

- identity, household relationship, residence, occupation, faith, and station;
- Standing and the personal consequence explanation;
- personal-attention assignment and replacement consequence;
- active courtship, friendship, rivalry, feud, tutoring, retainer, or betrothal state;
- travel/co-location status;
- cash and item gift availability;
- cultivate/visit action;
- courtship, proposal, breakoff, marriage, and divorce actions;
- call/replace friend and rivalry settlement actions;
- retainer hire, office, dismissal, or household-management routes;
- equipment, education, work, and arranged-match routes when the player manages them.

Do not turn the interaction card into a duplicate character biography or Household
Plan. Existing detail sections remain available below or through focused links.

## Realm/ruler interaction card

The ruler/realm sheet remains authoritative for one political counterpart.

Show, when relevant:

- realm, ruler, rank, faith, capital, territorial relationship, and current wars;
- Standing and the feudal/diplomatic consequence explanation;
- liege, vassal, neighbor, ally, pact, war target, or royal-compact relationship;
- active foreign-policy direction and capacity use;
- envoy/pact availability;
- alliance availability;
- cash/item gift availability and courier timing;
- ruler cultivation/visit;
- royal family/courtship route;
- homage, petition, grant, demand, revocation, or Council action when feudal;
- available war causes and exact confirmation route.

The card does not duplicate Governance’s domain or institution summaries.

## One action, one authority

Each action keeps one authoritative mechanic and one confirmation path.

Examples:

- ruler gifts continue through the shared ruler-gift API and one recipient cooldown;
- character gifts continue through exact character/item APIs;
- foreign policy continues through its capacity and stance APIs;
- envoys, pacts, and alliances retain their existing gates and costs;
- courtship continues through `FB.canCourt`, travel review, attention, and proposal;
- feudal actions continue through their existing Deeds/action gates;
- war continues through the existing cause selection and confirmation.

Network, Deeds, Council, Estates, Land, and Ongoing Commitments become shortcuts into
the authoritative card or focused confirmation. They must not maintain parallel
versions of the action.

Compatibility wrappers and public UI entry points may remain, but should route to the
same card model.

## Action grouping and ordering

Use the same order on every card:

1. current commitments and urgent state;
2. cultivate/attention/foreign-policy direction;
3. gifts and material support;
4. travel and personal contact;
5. relationship or diplomatic commitments;
6. feudal/governance actions;
7. hostility and war;
8. focused management links.

Hide groups with no relevant actions. Keep an important blocked action visible when its
reason teaches progression. Do not fill a card with permanently irrelevant actions.

Consequential actions require the existing explicit preview or confirmation. Opening a
card never spends a day, changes Standing, assigns attention, sends an envoy, or starts
travel.

## Materialized rulers

A reigning ruler may have both a compact realm identity and a full character.

- Realm identity remains authoritative for political office, capital, succession, war,
  gift courier, and ruler-generation cooldown.
- Character identity remains authoritative for personal traits, family, courtship, and
  personal contact.
- Both cards use the same typed Standing target resolution.
- Each card links to the other instead of duplicating every action.
- A gift appears through only the political ruler path when the target is reigning.
- Ruler succession invalidates ruler-generation commitments according to existing
  rules; card rendering must not revive them.

## Navigation

- Character rows open the character card/sheet.
- Realm and political-ruler rows open the realm/ruler card.
- A materialized ruler provides explicit **Personal character** and **Realm and court**
  links.
- Back returns to the exact originating surface: Network, Governance, Land, Council,
  Estates, Deeds, or another card.
- Nested gift, travel, courtship, envoy, alliance, and war previews participate in the
  existing modal-history contract.
- Cards use native buttons, keyboard focus containment, and the mobile full-sheet or
  bottom-sheet pattern appropriate to their depth.

## State and save boundaries

The consolidation adds no new relationship state.

Do not:

- merge personal attention with foreign-policy capacity;
- merge friendship, rivalry, courtship, pact, alliance, or feudal obligations into
  Standing;
- create a general AI relationship graph;
- store rendered card/action models;
- copy cooldowns into a shared UI record;
- change save format 3.

Any helper model is derived, deterministic, and locale-neutral until rendering.

## Localization and accessibility

- Build complete localized phrases around semantic parameters.
- Proper names and realm ids remain parameters, not catalog grammar.
- Costs, cooldowns, travel days, and Standing use shared formatters.
- Every enabled and disabled action has an accessible name.
- Consequence text must remain inside the button/card at Preview-locale expansion.
- Color is never the only indication of Standing or availability.
- Card ordering and keyboard hints remain stable when optional groups disappear.

## File-level implementation

- `js/ui.js`: own the shared card/action-row renderer, sheet integration, origin/return
  routing, and removal of duplicate UI-only calculations.
- `js/actions.js`: expose or reuse authoritative feudal/diplomatic gate results; do not
  add presentation state.
- `js/model.js`, `js/items.js`, `js/travel.js`, and `js/economy.js`: change only where
  a current action lacks a reusable gate/preview adapter.
- `docs/designs/ui.md`, `characters.md`, `marriage.md`, `realms.md`, and
  `piety-intrigue-diplomacy.md`: document action ownership and card boundaries.
- `tests/e2e/specs/interaction-cards.spec.js`: cover personal, feudal, diplomatic,
  materialized-ruler, navigation, and non-mutation cases.

## Implementation phases

1. Inventory every target-specific action and identify its authoritative gate,
   mutation, confirmation, and current entry points.
2. Add the shared render-only action/card primitives.
3. Migrate character-sheet relationship actions without changing mechanics.
4. Migrate realm/ruler diplomatic and feudal actions.
5. Route Network, Governance, Council, Estates, Land, and Deeds shortcuts into the
   authoritative cards.
6. Remove duplicate UI-only requirement calculations and prose.
7. Update UI, character, marriage, realm, and diplomacy design docs.

## Tests to author

Add focused Playwright coverage without running it as an AI coding agent:

- one ordinary character with attention, gift, visit, friendship, courtship, and rival
  variants;
- one direct liege, direct vassal, neighboring sovereign, ally, and war target;
- materialized ruler shows identical Standing on both cards;
- ruler gift has one cooldown and one action path;
- blocked actions use the authoritative reason and become enabled when the underlying
  gate changes;
- action ordering remains stable across optional groups;
- Back returns correctly to every major origin;
- keyboard, focus, native buttons, and narrow/mobile layout remain usable;
- opening and navigating cards does not mutate game or RNG state.

## Completion criteria

- The player learns one predictable arrangement for dealings with any person or ruler.
- The same action has one authoritative gate, preview, mutation, and cooldown.
- Standing is identical everywhere while contextual consequences remain distinct.
- Materialized rulers do not expose duplicate political/personal gift or relationship
  actions.
- Network, Governance, Deeds, Council, Estates, and Land act as shortcuts rather than
  parallel management implementations.
- No relationship state or simulation graph is added for presentation.

## Implementation record

The implemented contract uses `UI.characterInteractionCard` and
`UI.realmInteractionCard` as deterministic builders, with
`UI.interactionCardHtml` as their shared render-only presentation. Each action
has a stable semantic id, group, localized label and detail, enabled state,
blocked reason, consequence, and route. The two sheets share ordering, native
button markup, Standing presentation, modal-history behavior, and narrow-screen
layout without storing a card in save state.

Reusable status adapters now own explanations for courtship, proposals,
friendship, personal attention, character, item, and ruler gifts,
foreign-policy capacity, envoys, alliances, and realm-specific war causes.
Read-only snapshots keep legacy ledger, courier, ruler-identity, alliance, and
war-cause repair outside card construction. Mutating entry points revalidate
through the same adapters where applicable. Existing Deeds, gift, travel,
envoy, alliance, feudal, and war confirmation flows remain the only mutation
paths.

Materialized rulers expose reciprocal **Personal character** and **Realm and
court** links. Their character card omits gifts, so ruler-generation pricing,
courier state, cooldown, and political Standing remain exclusively on the
realm path. Governance, Council, Estates, Network, Land, and focused Deeds
flows retain their existing entry points while routing counterpart detail into
the shared sheets. Direct-vassal cards route to the one Royal Council manager
and return to the same ruler card. Land grants remain in Governance and Deeds:
the existing grant mechanic creates a new vassal, so placing it on an existing
vassal's card would falsely imply that the selected ruler receives the land.

Focused Playwright coverage is in
`tests/e2e/specs/interaction-cards.spec.js`; the pre-existing Standing sheet
assertions were updated for the shared card markup. In accordance with the
repository workflow, these tests were authored but not run by the coding
agent.
