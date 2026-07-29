# Plan: one Governance shell

Date: 2026-07-29

Status: step 2 of the
[systems-audit roadmap](systems-audit-00-roadmap.md); implemented 2026-07-29.
This is the next serial UI step after the implemented
[Standing integration](systems-audit-01-standing.md).

Related design:
[realms](../designs/realms.md),
[Royal Council](../designs/council.md),
[Estates](../designs/parliament.md), and
[UI](../designs/ui.md).

## Goal

Give every landed player one authoritative place to understand political position,
domain, liege obligations, vassals, and the institution appropriate to the current
rank.

The Governance shell consolidates presentation and navigation. It does not merge the
Estates with the Royal Council, add another authority meter, or change feudal
ownership.

The player should be able to answer, without hunting through Deeds, Network, and Land:

- Who is my liege, sovereign, and direct vassal?
- Am I a subject, sovereign, or crowned ruler?
- What are my current aid, scutage, Crown Authority, and institutional obligations?
- How many counties do I hold directly, what is my domain limit, and what penalty is
  active?
- Which institution applies to me, what is pending, and where is a vacancy?
- Which existing political actions are legal now, and why is a blocked action blocked?

## Dependency on Standing

Build this only after the active Standing work lands.

The shell must use the canonical typed Standing readers and shared renderer. It must
not reintroduce Favor, Opinion, or Regard as separate player-facing political meters.
Legacy backing fields remain an implementation detail of Standing.

Governance may explain what Standing affects in context:

- petitions and Estates votes for a vassal;
- appointments, gifts, taxes, and revolts for direct vassals;
- envoys, pacts, alliances, and war likelihood for foreign rulers.

It must not mutate Standing merely because the sheet is opened or refreshed.

## Political eligibility

Show Governance when the player has a territorial political role, not merely from a
numeric tier check.

- A territorial baron, count, duke, king, or emperor qualifies.
- A see-only Bishop does not become a territorial baron through this shell.
- A Bishop who separately holds land uses Governance for that land while the Bishopric
  remains its own office sheet.
- A landless protagonist keeps existing rank/progression surfaces and does not receive
  an empty Governance shell.
- Observe mode has no player Governance management surface.

Use the existing player-realm, liege, sovereign, holder, and office helpers. Do not
infer sovereignty from title text or realm names.

## One derived summary

Add one read-only derived summary, tentatively `FB.governanceSummary(state)`, so the
sheet and its compact entry points cannot disagree.

The summary is not saved. It should expose stable ids and numbers rather than rendered
prose:

```js
{
  role: 'vassal|sovereign|crowned',
  playerRealmId: 'player|null',
  liegeId: 'realm_id|null',
  sovereignId: 'realm_id|player|null',
  directCounties: [],
  realmCounties: [],
  domainCap: 0,
  domainExcess: 0,
  domainMultiplier: 1,
  directVassals: [],
  institution: 'estates|council|none',
  pending: [],
  warnings: []
}
```

The exact shape may change during implementation, but it must remain:

- derived from authoritative existing helpers;
- deterministic and RNG-free;
- locale-neutral;
- free of duplicate tax, levy, Standing, or institution calculations.

Existing calculation APIs remain authoritative, including `FB.domainCap`,
`FB.domainPenalty`, the levy/source ledger, `FB.parliamentEnsure`,
`FB.councilEnsure`, and the player-realm hierarchy helpers.

## Governance sheet

Add a full-sheet `UI.showGovernance` surface using the established keyboard, history,
mobile, footer, and localization contracts.

### 1. Political position

Always show:

- current title and player realm;
- political role;
- direct liege, if any;
- top sovereign;
- capital and directly held home;
- whether the player is at war, serving a liege war, or politically constrained.

Names link to the existing realm or ruler sheet. Standing uses the shared presentation.

### 2. Domain

Show:

- directly held county count and domain limit;
- exact current tax/levy multiplier when over the limit;
- realm-wide county count, including land held through vassals;
- each directly held county with capital/home markers;
- grantable counties and complete duchies as existing action links;
- current de jure promotion progress where already available.

Do not create a second Land browser or duplicate building controls. County rows link to
Land. Grant links call the existing grant flow.

### 3. Liege and obligations

For a sworn player, show:

- liege and sovereign identity;
- Standing with the liege;
- aid and scutage terms;
- lifetime service tally and any existing summons/service state;
- petition, homage, appeal, fealty, and independence actions that already apply;
- exact blocked reasons from the existing action gates.

For a sovereign, replace this section with a concise independence and foreign-contact
summary rather than an empty liege card.

### 4. Vassals

For a player with direct vassals, show:

- each vassal realm and ruler;
- rank, territory, Standing, tax contribution, and levy contribution;
- Council office, if any;
- active exceptional-levy promise or comparable existing commitment;
- direct links to the ruler sheet, gifts, grants, demands, and revocation where legal.

The tax and levy values must come from the same computed sources used by seasonal
settlement and host raising.

### 5. Institution module

Embed a summary module, not a second implementation.

For eligible vassals:

- current aid and scutage;
- expected session timing/status;
- available motion and its yearly use;
- current vote factors;
- a button into the existing Estates management view.

For kings and emperors:

- Crown Authority and consent/charter thresholds;
- average direct-vassal Standing;
- every Council seat, holder, bonus, and vacancy;
- current schemer/sycophant warning;
- a button into the existing Royal Council management view.

Independent counts and dukes have no simulated Estates or Royal Council. Show their
sovereign/domain status without inventing a replacement institution.

`UI.showParliament` and `UI.showCouncil` remain focused management views and
compatibility entry points. They may be reached from Governance, and their Back action
must return to Governance when opened from it.

### 6. Political actions

Group existing actions by intent:

- relationship and legitimacy;
- domain and grants;
- taxation and obligations;
- war and independence;
- institution management.

Every row must call an existing authoritative gate and action. Do not reproduce
requirements in UI-only conditionals. Disabled rows stay visible when their reason helps
the player understand progression.

## Entry points and navigation

- Replace the separate top-level Estates/Royal Council hunting path with one
  **Governance…** entry when the player qualifies.
- Network → Realm opens Governance for the player’s own political position.
- Land and realm sheets may link to the relevant Governance section.
- Existing Estates and Royal Council deed ids remain compatibility aliases for saves,
  mods, help text, and direct callers; they may route to the corresponding focused view.
- Browser Back and visible Back controls must unwind focused institution view →
  Governance → originating panel without dead history entries.
- The shell is a full-sheet modal on mobile and desktop, with native buttons and a
  sticky footer.

## State, saves, and simulation

The first release adds no saved Governance state.

Do not:

- merge `state.council` with liege `obl`;
- copy domain, tax, levy, or Standing totals into a display cache;
- change Council formation, Estates timing, title hierarchy, or ownership;
- add an AI Governance simulation;
- alter save format 3.

If UI history needs a descriptor, it remains browser-local presentation state and never
enters the game save.

## Localization and accessibility

- Route every new label and explanation through `FB.T`/`FB.TC`.
- Keep realm, county, ruler, and title identities as semantic/proper-name parameters.
- Use complete phrases for role-dependent explanations.
- Every action is a native button with an accessible name and visible blocked reason.
- The sheet must tolerate Preview-locale expansion and a one-column phone layout.
- Standing colors are supplementary; the signed number and descriptive band remain
  readable without color.

## File-level implementation

- `js/actions.js` / `js/world.js`: expose only the missing read-only political/domain
  summary adapters; keep ownership and mutation in their current modules.
- `js/council.js` / `js/parliament.js`: provide existing institution summaries and
  accept a Governance return context without merging state.
- `js/ui.js`: build `UI.showGovernance`, section routing, and compatibility entry
  wrappers.
- `css/style.css`: add only the responsive full-sheet layout needed by Governance.
- `docs/designs/realms.md`, `council.md`, `parliament.md`, and `ui.md`: record the
  authoritative shell and boundaries.
- `tests/e2e/specs/governance.spec.js`: cover political roles, summaries, navigation,
  and non-mutation.

## Implementation phases

1. Add the derived Governance summary and focused unit/browser tests for every political
   role.
2. Build the read-only shell: position, domain, liege, vassal, and institution summaries.
3. Add section links to existing Land, realm, Estates, Council, and action flows.
4. Make existing institution entry points return through Governance when appropriate.
5. Consolidate the Deeds/Network entry points and remove duplicated summary prose.
6. Update the realm, Council, Parliament, and UI design docs.

## Tests to author

Add focused Playwright coverage without running it as an AI coding agent:

- territorial baron/vassal sees liege terms and Estates;
- independent count/duke sees sovereignty but no invented institution;
- king/emperor sees Council authority, seats, vacancies, and direct vassals;
- see-only Bishop is not treated as a territorial baron;
- domain count, cap, penalty, tax, and levy summaries match authoritative helpers;
- institution actions mutate only their existing state;
- Standing agrees with the same ruler’s character/realm/Council view;
- modal Back, keyboard focus, numbered controls, and narrow layout work;
- save/export state is unchanged after opening and navigating the shell.

## Completion criteria

- A landed player can understand political position, domain, vassals, obligations, and
  institution from one sheet.
- Estates and Royal Council remain mechanically distinct and authoritative.
- Every state-changing control delegates to an existing gate/action.
- The same Standing, tax, levy, domain, and institution values appear in every
  consuming view.
- The shell adds no saved simulation state and does not alter political balance.
- Deeds, Network, Land, and focused institution views have predictable navigation.
