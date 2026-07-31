# Plan: political choice, war depth, and expanded life paths

Date: 2026-07-30

Status: **in progress; steps 1–2 implemented**. This plan organizes player feedback
about political blocs, elections, laws, military depth, tournaments, careers,
religious policy, frontier settlement, migration, and wars without claims. It
prioritizes player-facing quality of life before the larger simulation and content
expansions. Steps 3–11 remain proposed.

Related design:
[realms](../designs/realms.md),
[Royal Council](../designs/council.md),
[Estates](../designs/parliament.md),
[war](../designs/war.md),
[characters](../designs/characters.md),
[travel](../designs/travel.md),
[technology](../designs/tech.md),
[events](../designs/events.md),
[items](../designs/items.md),
[modding](../designs/mods.md), and
[UI](../designs/ui.md).
Any new data, trigger, effect, unit, policy, election, or privilege contract must also
be recorded in [MODDING](../MODDING.md).

## Goal

Make political and military decisions easier to understand, then deepen the systems
behind those decisions.

The finished work should let the player:

- see the political blocs that influence a realm and understand how they intend to
  vote;
- propose more laws and reforms without receiving a nearly automatic result;
- participate in elections for appropriate guild and political offices;
- grant, protect, demand, and revoke meaningful privileges;
- declare an unjustified war while seeing and accepting its political consequences;
- understand why an army is weakening and respond to campaign events;
- enter a bounded jousting tournament without requiring a tournament simulation;
- use moddable military unit definitions, counters, and reinforcement costs;
- pursue sustained scholarly, medical, military, mercenary, and adventuring lives;
- withdraw into a reachable wasteland and establish a commoner frontier home through
  travel, survival, and work rather than receiving a count's title;
- set royal policy toward religious minorities and settlement.

This is not one release. The political, content, and army portions have different
risk and should be delivered as independent playable slices in the order below.

## Feedback validation and classification

The feedback is broadly valid, but most items are feature or balance requests rather
than defects.

| Feedback | Primary classification | Validation |
| --- | --- | --- |
| Show political blocs, members, vote posture, and influence in Network/Governance | QoL | Valid. The current Estates describe AI vassals as unnamed benches and do not expose durable factions. |
| Show war choices and the consequences of an unjustified war before declaration | QoL | Valid. The player currently sees only permitted causes and cannot choose political risk over a claim. |
| Show campaign losses, desertion risk, unit readiness, and replacement cost | QoL | Valid. Current host strength and the deserter outcome are too abstract to explain army decline. |
| Add more military events at personal, army, and whole-war scales | Writing | Valid. All three event scales exist, but each has a small catalog. |
| Add political blocs, unified voting, more reforms, and less certain outcomes | Balance | Valid. Estates currently resolve only redress and scutage through one probability calculation that can reach an 85% cap. |
| Add guild and selected office elections | Balance | Valid. Guild advancement is currently deterministic after meeting its resource gates, while Council offices are appointed. |
| Add autonomy, charters, and privileges when groups are mistreated | Balance | Partially present through Council charters, monopolies, county modifiers, and revolts, but there is no reusable privilege or collective-demand system. |
| Make desertion remove troops after repeated defeats | Balance | Partially present. `war_deserters` already exists, but its outcomes change abstract war strength instead of live host composition. |
| Add jousting tournaments | Writing | Partially present. The gentry `melee_games` event already supports martial competition, wagers, injury, and prizes, but there is no explicit jousting invitation or tournament event set. |
| Add attack, defense, counters, upkeep, reinforcement, and cultural units | Balance | Valid. The current five unit classes use one weighted quality value, hard-coded upkeep, and a fixed casualty order. |
| Add mercenary, adventurer, author, physician, astronomer, and command paths | Writing | Partially present. Soldier, study, paid service, manuscripts, and warband content exist, but not as the sustained paths described. |
| Let a freeholder begin or settle as a hermit in the wastes | Writing and Balance | Partially present. Tier-1/2 travelers may relocate only to settled counties, starts reject wastelands, and existing wasteland colonization grants a county only to counts or higher. |
| Add royal religious-freedom and migration choices | Balance | Valid. Realm and county faith exist, but there is no tolerance or settlement-law axis and no population migration simulation. |
| Permit war without a claim at substantial political risk | Balance | Valid. Player offensive wars require a recognized cause, while AI realms can begin generic adjacent border wars. |
| Confirmed defects in the reported systems | Bug | None confirmed. The deserter abstraction and asymmetric war rules are design gaps, not proven broken behavior. |

## Guiding rules

### Deliver truthful QoL first

A screen must not imply simulation that does not exist. Each early QoL slice includes
the smallest authoritative mechanic required to make its information true:

- bloc presentation lands with real bloc membership and vote posture;
- aggression preview lands with an actual War of Aggression cause and consequences;
- desertion warnings land with loss-aware triggers and live troop effects.

Do not add placeholder faction bars, predicted casualties, or reinforcement estimates
that use separate UI-only calculations.

### Reuse existing political state

Political calculations should build on:

- typed Standing between rulers;
- Common Voice in directly held counties;
- aid, scutage, motions, and annual Estates sessions;
- Crown Authority, Council offices, and charters;
- guild membership, monopolies, and trade relationships;
- county modifiers, downfall chains, and vassal revolts.

Do not add a generic political-power currency or a second relationship score.

### Prefer bounded additions over new world simulations

- Simulate blocs only where they can affect the player: the player's liege polity and
  a crown ruled by the player. Do not immediately maintain faction politics for every
  AI realm.
- Treat migration initially as settlement policy and event pressure. Do not pretend
  the game has demographic population movement.
- Treat exploration initially as expeditions, foreign service, learned travel, and
  discoveries. Literal unknown-land exploration requires a separate fog-of-war and
  map-discovery design.
- Treat tournaments first as declarative invitations and choices. Do not build
  brackets, persistent entrant rosters, or an AI tournament calendar for one event
  family.
- Treat hermit settlement first as a special travel-and-frontier path. Do not allow
  long-term commoner life inside an unchanged `wasteland:true` province or turn a
  freeholder into a count merely for establishing a homestead.
- Expand the existing soldier career instead of adding a duplicate professional
  soldier path.

### Keep large rewrites behavior-compatible first

The unit catalog must initially reproduce the current levy, archer, cavalry, retinue,
and mercenary behavior. Attack/defense separation, counters, paid reinforcement, and
cultural units come only after the catalog, saves, UI, and mod contracts are stable.

## Recommended implementation order

For the three additions from the same feedback thread, the cross-plan order is:
the bounded jousting slice in step 4, the separate
[technology-dependent sea-transport plan](technology-dependent-sea-transport.md),
then the hermit/frontier slice in step 9. Sea transport is an independent army lane
and does not need to wait for political steps 5–8, but the more invasive frontier
work should follow both smaller additions.

### 1. Political blocs and a visible vote forecast

Classification: **QoL first, with the minimum Balance foundation**.

Status: **complete (2026-07-30)**.

Add a shared political-bloc summary for the player's relevant polity and expose it in
Governance and Network.

The first bloc model should support:

- a Crown-aligned bloc;
- a mercantile bloc when guild, monopoly, enterprise, or trade interests justify it;
- one or more magnate blocs led by an influential landed lord or house;
- independents for houses without a strong allegiance.

Membership should be based on authoritative interests such as Standing, rank,
territory, Council office, guild ties, monopolies, faith, and existing obligations.
Store only a durable allegiance or pledge that represents a real commitment; derive
influence and display scores from current state.

The initial release applies blocs to the two existing Estates motions:

- each bloc has weighted influence and one unified posture;
- declared support or opposition is locked for that vote;
- undecided blocs resolve from visible interests and seeded uncertainty;
- lobbying changes a bloc's reasons or commitment, not a hidden global success
  percentage;
- a secured majority is guaranteed only when enough blocs have actually pledged.

Governance and Network should show:

- bloc name, type, leader, influence, and member houses;
- current interests and major sources of support or hostility;
- support, opposition, or undecided posture for a pending motion;
- the vote total already pledged and the uncertain balance;
- a route from a bloc to its leader and member rulers.

This slice replaces the least legible part of the current vote calculation without
waiting for a large law catalog.

### 2. War declaration clarity and War of Aggression

Classification: **QoL first, then Balance**.

Status: **complete (2026-07-31)**.

Add `War of Aggression` as an explicit player choice when no recognized claim or de
jure cause applies.

The first version should remain bounded:

- target an adjacent hostile realm;
- continue to respect active truces, alliances, pacts, and impossible route gates;
- require an explicit confirmation;
- never masquerade as a fabricated or de jure claim;
- show immediate and continuing consequences before confirmation.

The declaration preview should compare every available cause and disclose:

- target and war objective;
- prestige, Common Voice, direct-vassal Standing, and foreign Standing changes;
- expected occupied-county unrest, tax, and levy penalties;
- the escalating penalty for recent aggressive wars;
- the groups or blocs most likely to oppose the war.

On victory, counties taken without right receive a long-lived, visible
`Conquered Without Right` modifier. Repeated aggressive wars increase political
opposition and revolt pressure.

Do not grant the normal offensive-war prestige reward for this cause. Do not make a
single declaration an automatic death sentence; the danger should come from repeated
aggression combined with poor Standing, weak legitimacy, war losses, and refusal to
answer political demands.

The later bloc/civil-war integration may add inheritable house notoriety. Do not use
ordinary Standing for intergenerational disgrace because protagonist succession
intentionally resets personal and realm Standing.

The implemented slice adds the semantic `aggression` cause only where no recognized
cause applies, uses the existing active-war, peace-pact, alliance, adjacency, and route
gates, and requires a dedicated consequence confirmation. One read-only preview drives
both the picker and the mutation. Recent declarations by the current ruler escalate the
political costs and vassal breakaway pressure; conquest grants no automatic offensive-war
prestige and applies the timed county modifier described above.

### 3. Military feedback and loss-aware campaign events

Classification: **QoL and Writing, with a small Balance correction**.

Status: **proposed**.

Improve the current war view before rebuilding combat:

- show battle record and recent win/loss streak;
- show live unit composition and losses by class;
- explain active supply, thin-ranks, discipline, and desertion effects;
- show whether an event changed abstract war strength, live troops, or both;
- show current seasonal host upkeep from the authoritative ledger.

Refine the existing `war_deserters` event rather than create a competing event:

- gate it on a recent defeat or loss streak, meaningful casualties, and a surviving
  active host;
- permit it only once per bounded campaign interval;
- offer a scaled payment based on current host size or upkeep;
- make accepting desertion remove a seeded percentage of live troops;
- keep the percentage configurable in `FBDATA.balance`, initially within the requested
  10–20% range but tuned against existing battle casualties;
- use deterministic casualty allocation and never `Math.random()`;
- ensure the event can occur before the existing three-loss campaign termination.

Add a first military-writing tranche across all three existing scales:

- personal: fear, wounds, valor, command conflict, camp illness, and reputation;
- army: pay, food, discipline, deserters, officers, camp followers, and local
  requisition;
- whole war: changing objectives, allied hesitation, enemy offers, public exhaustion,
  occupation policy, and negotiated withdrawal.

Events should react to real campaign facts and apply equivalent effects when
autoresolved.

### 4. Bounded jousting tournaments

Classification: **Writing, using existing combat and event rules**.

Add jousting as a small tournament event family before considering a hosted
tournament system. The existing gentry `melee_games` story is the mechanical
precedent: it already offers martial competition, wagering, injury, gold, prestige,
and Standing consequences through declarative event data.

The first tournament slice should include:

- an invitation appropriate to the protagonist's rank, date, region, and social
  context;
- an option to enter the joust or mounted contest;
- a melee or supporting contest where the event's context makes it appropriate;
- a wager or patronage choice with an ordinary gold requirement;
- a safe attendance, diplomatic, or withdrawal choice;
- victory, defeat, injury, prize, prestige, and host-Standing outcomes;
- bounded cooldowns so tournament stories remain occasions rather than routine
  income.

Reuse `chance:'battle'` for the initial martial resolution. It already consumes
Martial, Brave/Craven, holdings, worn battle equipment, and blessings. Do not add a
second jousting skill or named chance until an implemented rule—such as mounted gear
or an exact opponent—needs a calculation that the existing battle chance cannot
truthfully represent.

Author faith, culture, or regional variants where the event's form or language
requires them. A joust should not be presented as one universal ceremony, but a
variant must still resolve through the same underlying event contract.

The first release is participation only. Defer:

- hosting a realm-wide tournament;
- invitations sent across the map;
- saved entrant brackets;
- multi-round elimination;
- AI-hosted tournament calendars;
- tournament grounds, champions, or permanent offices.

If the event set proves enjoyable, a later hosted-tournament deed may queue a
context-snapshotted chain with a named host, purse, guests, and participants. That
later feature should build on ordinary travel and character residence instead of
teleporting distant courtiers.

### 5. Data-driven laws, reforms, and bloc voting

Classification: **Balance**.

Status: **proposed**.

Once bloc voting is visible and reliable, add a moddable policy catalog instead of
hard-coding one handler per reform.

The policy contract should define:

- stable id, localized name, description, and policy family;
- eligible proposer, electorate, institution, and minimum rank;
- mutually exclusive states or ordered levels;
- proposal cost, cooldown, repeal rule, and emergency rule;
- bloc-interest weights and any locked constituencies;
- declarative effects, duration, and save behavior.

The first catalog should remain small and cross-system:

1. aid and emergency subsidy;
2. scutage and levy obligation;
3. market, toll, and guild privileges;
4. revocation consent and confirmed local custom;
5. war authorization or condemnation;
6. religious tolerance and settlement policy, delivered fully in step 7.

The proposal flow is:

1. choose an eligible policy change;
2. see each bloc's present posture and reasons;
3. bargain, lobby, or withdraw;
4. hold one recorded vote;
5. enact, reject, or schedule a limited follow-up;
6. apply a cooldown before proposing the same family again.

Do not retain a separate global success roll after the bloc votes are counted.

### 6. Elections, privileges, and collective demands

Classification: **Balance with Writing support**.

Status: **proposed**.

Implement elections in increasing order of political risk.

#### Guild elections first

Replace automatic officer and guildmaster promotion with:

- a real vacancy or scheduled term;
- eligibility based on current guild rank and existing skills/resources;
- a small electorate of guild interests or eligible members;
- candidates with visible support;
- canvassing, favors, expense, and reputation choices;
- victory, defeat, and future-candidacy cooldowns.

Membership and master rank may remain advancement gates. The first election work
should target officer and guildmaster, where automatic promotion is least convincing.

#### Selected political elections second

Council offices remain appointed by default. A charter or enacted law may require:

- Council nomination;
- Estates confirmation;
- election by one defined constituency;
- a fixed term or dismissal protection.

Do not make every royal office elective, and do not silently replace the existing
appointment system.

#### Reusable privileges

Add a durable privilege contract with:

- holder type: house, guild, county, faith community, or institution;
- granting authority and territorial scope;
- rights, exemptions, obligations, duration, and revocation rule;
- source election, law, charter, or event;
- exact effects using existing ledgers and modifiers where possible.

Initial privileges should reuse current concepts: guild monopoly, market charter,
confirmed custom, levy exemption, sanctuary, tax concession, and office
confirmation.

Low Standing, poor Common Voice, coercive taxation, unlawful revocation, religious
persecution, and repeated aggressive wars may cause a bloc or constituency to demand
a privilege. Refusal raises organized opposition; it does not immediately create a
fully autonomous new realm.

### 7. Religious tolerance and settlement policy

Classification: **Balance with Writing support**.

Status: **proposed**.

Add two royal policy families to the law framework.

Religious tolerance:

- persecution;
- confessional preference;
- tolerated minorities;
- protected worship.

Settlement:

- closed settlement;
- licensed newcomers;
- encouraged settlement.

Effects should use systems that exist: piety, clergy and bloc support, foreign
Standing, Common Voice, tax, trade, research, development, unrest events, and county
modifiers.

County faith remains distinct from realm faith. A policy must not silently convert a
county, move an invented population total, or erase local identity. Settlement events
may introduce cultural or religious pressure, invited specialists, merchants,
refugees, or frontier settlers without claiming a demographic simulation.

### 8. Expanded life paths and authored works

Classification: **Writing**.

Status: **proposed**.

Build on the current career, focus, travel, research, event, and item hooks.

Recommended order within this slice:

1. expand the existing soldier career with command assignments and operational war
   decisions;
2. add physician training, practice, outbreaks, treatment, and medical discoveries;
3. add scholar specializations, including astronomy;
4. let authors complete named books or treatises as durable items or works;
5. turn paid service into a sustained mercenary contract path;
6. add adventuring expeditions and foreign discoveries through travel.

Each path needs:

- an entry route and exit route;
- recurring work decisions;
- advancement or reputation;
- personal risk;
- at least one durable accomplishment;
- interactions with family, patrons, rulers, guilds, faith, or war.

At landed tiers, careers remain biography and patronage rather than a return to daily
commoner labor unless the player deliberately accepts a temporary expedition,
command, or court appointment.

### 9. Hermit travel and commoner frontier settlement

Classification: **Writing and Balance, built on travel and holdings**.

Implement the travel version before adding a special new-game scenario. Current
freeholders and gentry can travel and eventually relocate, but their routes and
destinations deliberately exclude wastelands. Counts and higher may instead use
`settle_waste` to turn a bordering wasteland into a county held directly by the
player. A commoner frontier path must not reuse that political reward unchanged.

Add a purpose such as **Withdraw into the wastes** with these initial rules:

- only freeholders and gentry may begin it;
- the destination must be a wasteland adjacent to a settled gateway county that is
  reachable through the ordinary travel graph;
- the route remains entirely settled until its final wasteland leg;
- wastelands may not become generic intermediate shortcuts for travel, couriers, or
  trade;
- departure snapshots the gateway, route, cost, protagonist, and controlling
  sovereign needed to resolve later settlement;
- arrival begins an extended survival-and-work stay rather than immediate
  relocation;
- bounded events cover shelter, water, food, weather, solitude, visitors, faith,
  illness, tools, and the decision to persist or turn back;
- permanent settlement requires at least the ordinary one-year residence and a
  configured number of successful frontier-work milestones;
- death, succession, imprisonment, personal war, rank change, or abandonment ends
  the attempt through explicit cleanup.

Do not keep the household permanently inside a province that remains
`wasteland:true`. At successful settlement, materialize a normal development-1
frontier county:

- copy the protagonist's culture and faith;
- leave it outside every de jure duchy, kingdom claim, and title majority;
- assign political ownership and holding to the settled gateway's existing
  controller or holder;
- relocate the commoner household there through the ordinary travel-settlement
  cleanup;
- grant the household a starter land plot or equivalent commoner homestead, not a
  county title and not an entry in `player.provs`;
- generate valid local lord, priest, settlement, work, and market context through
  existing county rules;
- record the lifetime permanent move so the same protagonist cannot chain frontier
  colonies.

Refactor the physical wasteland conversion currently embedded in
`FB.settleWaste` into one authoritative helper. The noble deed calls it with the
player as county holder; the hermit path calls it with the gateway's political
controller and grants only commoner property. Culture, faith, development, ownership,
holder, de jure exclusion, cache invalidation, map redraw, and Chronicle messages
must not be implemented twice.

The first release should not simulate an autonomous unowned population, demographic
migration, wilderness inventory, or a parallel hermit economy. Once the county is
materialized, ordinary holdings, household work, development, mortality, and
political rules take over.

After the travel path is stable, an optional **Hermit** or **Frontier Freeholder**
challenge start may:

- allow wasteland selection only for that scenario;
- derive culture, faith, and political attachment from one deterministic adjacent
  settled gateway;
- reuse the same materialization and commoner-property helpers;
- preserve reproducible start codes without introducing a second wilderness model.

Do not implement the start first. New-game selection currently rejects wastelands,
and a start-only shortcut would duplicate the harder conversion and locality rules
before ordinary play had exercised them.

### 10. Data-driven military unit catalog

Classification: **Balance and modding foundation**.

Status: **proposed**.

Replace hard-coded knowledge of `levy`, `arch`, `cav`, `ret`, and `mercs` with a unit
catalog, while reproducing current behavior in the first integration.

A unit definition should be able to declare:

- stable id and localized display fields;
- category and tags;
- damage and defense;
- seasonal upkeep amount and troop batch size;
- recruitment and reinforcement costs;
- casualty priority;
- counters and countered-by tags;
- availability gates from culture, tradition, technology, building, rank, contract,
  or event;
- icon and UI order.

The first migration must:

- map every current host and save to catalog ids;
- preserve existing quality, upkeep, composition, casualty order, and battle results;
- iterate definitions instead of named object keys;
- give modded units a documented compatibility and save-repair rule;
- keep host summaries and ledgers authoritative and deterministic.

Do not tune combat in the same integration that changes the data representation.

### 11. Combat roles, reinforcement, and cultural units

Classification: **Balance**.

Status: **proposed**.

After the catalog is stable:

1. separate damage and defense in battle resolution;
2. add legible counter relationships;
3. move all upkeep to the catalog;
4. add professional-unit readiness and replacement;
5. charge a temporary reinforcement premium after losses;
6. return to base seasonal maintenance when replacements are complete;
7. expose the exact replacement time and cost in the host view;
8. add cultural unit availability and content.

Start tuning with the player's suggested roles, not necessarily the exact numbers:

- levies are cheap mass with low damage and defense;
- household knights or elite retainers are expensive and resilient;
- archers deal strong damage but are vulnerable to fast troops;
- light horse are costly, mobile counters to vulnerable ranged formations.

Counter bonuses must be capped so composition matters without making one unit erase
another. Battle RNG, terrain, commander skill, supply, and numbers remain relevant.

Paid reinforcement requires persistent readiness outside a single battle. Define who
owns the depleted cohort, how it survives host dismissal and save/load, and whether a
new war can remuster it before adding the surcharge.

Add cultural units only after the mechanical matrix is testable. Begin with a small
set of tradition-based archetypes, then ensure every playable culture receives one
distinct unit or a clearly documented shared cultural variant. Culture should affect
availability and role, not merely rename identical statistics.

## Dependencies and safe delivery lanes

| Step | Hard gate | Can proceed independently | Main collision risk |
| --- | --- | --- | --- |
| 1. Blocs and vote forecast | Canonical Standing and Governance already exist | Step 2 war-cause design; step 3 event briefs | `js/ui.js`, `js/parliament.js`, Governance and Network |
| 2. War of Aggression | Existing war-cause and modifier contracts | Steps 1 and 3 with explicit file ownership | `js/actions.js`, `js/world.js`, war UI |
| 3. Military feedback/events | Existing field-host event hooks | Step 1 politics data; step 4 tournament briefs | `data/events_war.js`, `js/armies.js`, war UI |
| 4. Jousting tournaments | Existing event interpreter and `battle` chance | Steps 1–3 with a distinct event file or owned range | `data/events_paths.js`, shared event content, i18n catalogs at integration |
| 5. Laws and reforms | Step 1 bloc vote contract | Step 8 career content; step 10 unit catalog design | Parliament, politics data, Governance |
| 6. Elections/privileges | Steps 1 and 5 | Step 8 disjoint event families | Economy, Council, Parliament, shared event packs |
| 7. Tolerance/settlement policy | Step 5 policy contract; step 6 privilege contract for protected rights | Steps 8 and 10 | Realm, faith, policy events |
| 8. Life paths | No hard political gate | Steps 1–7 when event files are partitioned | Economy, travel, actions, event packs |
| 9. Hermit/frontier settlement | Existing travel stay and settlement cleanup; shared wasteland materialization helper | Political steps 5–8 after the smaller sea-transport slice | `js/travel.js`, `js/world.js`, travel events, holdings and Land UI |
| 10. Unit catalog | No political gate | Steps 1–9 outside army/data files | Army engine, saves, UI, MODDING |
| 11. Combat/culture | Step 10 integrated and stable | Later writing content | Army engine, balance, technologies, cultures, buildings |

The safest overall sequence is the numbered order. Steps 2 and 3 can be delivered
while step 1 is underway if file ownership is explicit. Step 4 is deliberately the
smallest new-content slice and should precede the separate sea-transport plan; step 9
follows that plan but has no hard political dependency. Life-path writing can begin
before step 8, but should integrate only in small complete paths rather than one large
unfinished career catalog.

## State and save strategy

Add state only for durable simulation:

- bloc allegiance, election term, pledge, enacted law, privilege, aggression history,
  campaign result, unit readiness, authored work, and an active or completed frontier
  settlement attempt may be saved;
- vote forecasts, influence totals, warning bands, projected costs, and UI filters are
  derived and must not be saved;
- rendered prose, translated labels, and generated explanations are never saved.

Every new collection needs:

- stable ids;
- additive defaults for old saves;
- deterministic repair for missing rulers, houses, realms, units, or mods;
- removal or expiry rules;
- no dependency on object iteration order for seeded outcomes.

Do not change the save format merely because an additive field can be repaired on
load. If a unit-catalog migration changes the meaning of existing host data, document
and test the explicit migration.

## Presentation requirements

All new surfaces must follow the established full-sheet, keyboard, touch, Back-stack,
and Preview-locale contracts.

- Numbers and text carry meaning; color is supplementary.
- Every bloc posture includes reasons.
- Every disabled proposal or declaration includes its exact blocked reason.
- Every war consequence preview uses the same helpers as the applied consequence.
- Every election shows electorate, term, candidates, and result.
- Every privilege shows holder, scope, effects, duration, and revocation rule.
- Every tournament option makes its risk, required purse, and social consequence
  understandable without exposing a fake entrant simulation.
- Every frontier attempt shows its gateway, current phase, work milestones, return
  route, and whether permanent settlement is available.
- Every unit shows role, current troops, damage, defense, upkeep, counters, readiness,
  and replacement state once those mechanics exist.
- Network and Governance link to the same authoritative political summary.
- Army and war views link to the same authoritative host and campaign summary.

## File-level outline

Exact module boundaries should be fixed during each step's design update.

- `data/`: add moddable bloc archetypes, policies, privileges, elections, units,
  tournament stories, frontier travel stories, and other event content in
  load-order-safe files.
- `js/parliament.js`: bloc-aware motions and vote resolution.
- `js/council.js`: charter-dependent nominations, confirmations, and Council-linked
  privileges.
- `js/economy.js`: guild electorates, candidacy, terms, and career hooks.
- `js/actions.js`: War of Aggression, career actions, frontier entry points, and
  authoritative previews.
- `js/world.js`: aggression history and consequences, war-level event facts, revolt
  links, realm policy effects, and shared wasteland materialization.
- `js/travel.js`: purpose-specific final-wasteland routing, frontier stays, return,
  cleanup, and commoner relocation.
- `js/armies.js`: live desertion, unit-catalog iteration, combat roles, readiness, and
  reinforcement.
- `js/ui.js`: Network/Governance blocs, vote forecast, war preview, elections,
  privileges, tournament choices, frontier progress, army readiness, and career
  routes.
- `js/save.js`: only migrations that cannot be handled by normal additive repair.
- `docs/designs/`: update every affected system in the same implementation.
- `docs/MODDING.md`: document every public data, trigger, effect, and compatibility
  contract.

If shared political behavior becomes awkwardly split between Council and Parliament,
introduce one load-ordered politics engine module rather than duplicating membership,
vote, law, election, or privilege calculations.

## Tests to author during implementation

AI coding agents must add or update relevant deterministic Playwright coverage but
must not run the repository test harness.

### Politics and QoL

- bloc membership and influence derive identically in Network and Governance;
- blocs vote as unified entities and pledged totals match the final result;
- opening a forecast consumes no RNG and mutates no save state;
- lobbying and resolution use saved seeded RNG only at the documented point;
- old saves receive valid political defaults;
- narrow layouts, keyboard focus, and Back navigation work.

### Aggressive war

- a recognized cause remains preferable and unchanged;
- War of Aggression appears only when its real gates pass;
- previewed costs exactly match applied costs;
- repeated aggression escalates consequences deterministically;
- conquest applies and expires the intended county modifier;
- low legitimacy and poor bloc support can reach existing revolt/downfall paths;
- succession handles any later house notoriety separately from Standing.

### Military events

- desertion requires the intended defeat/casualty conditions;
- payment scales from the authoritative host ledger;
- troop loss remains within the configured range and is deterministic;
- the event cannot repeatedly fire outside its cooldown;
- event-visible and autoresolved outcomes are equivalent;
- no choice leaves negative unit counts or a dead host in an invalid war.

### Jousting tournaments

- tournament invitations obey rank, date, social, culture, and faith gates;
- the initial contest uses the existing `battle` chance and worn equipment;
- hidden options cannot spend unavailable gold;
- victory, loss, injury, prize, prestige, and Standing outcomes apply exactly once;
- cooldowns prevent tournament farming;
- visible and autoresolved choices remain equivalent;
- opening or dismissing an invitation consumes no unintended RNG or state.

### Laws, elections, and privileges

- proposal, vote, enactment, repeal, and cooldown rules use one policy definition;
- guild elections require a vacancy or term and valid candidates;
- appointment remains the default where no elective charter exists;
- privileges survive valid transfer where their scope requires it and expire cleanly;
- mistreatment demands use real Standing, Common Voice, and law state.

### Careers

- each path has valid entry, progress, risk, completion, and exit;
- authored works survive save/load as semantic items or records;
- landed characters cannot accidentally repeat commoner advancement;
- mercenary and adventuring travel cannot strand the protagonist.

### Hermit and frontier settlement

- only eligible tier-1/2 protagonists may begin the frontier purpose;
- the route is settled-only except for one final adjacent wasteland leg;
- generic travel, couriers, trade, and armies do not acquire wasteland shortcuts;
- the saved gateway and controller remain deterministic across save/load;
- work milestones and residence time gate permanent settlement;
- cancellation, death, succession, imprisonment, war, and rank change clean up the
  attempt without duplicating property;
- materialization produces development 1, settler culture and faith, no de jure
  membership, and the intended gateway political controller;
- the commoner receives a plot and home but no county title or `player.provs` entry;
- noble `settle_waste` retains its current costs and political result through the
  shared helper;
- local roles, holdings, map state, caches, and Chronicle descriptors remain valid;
- an eventual Hermit start reuses the same helper and produces reproducible start
  codes.

### Unit catalog and combat

- the compatibility catalog reproduces current battle and upkeep calculations before
  tuning;
- old and modded unit ids save, load, repair, and render correctly;
- counters, terrain, and casualty allocation are deterministic;
- readiness persists through host dismissal and remuster as designed;
- reinforcement surcharge ends exactly when replacement completes;
- every cultural unit has a reachable availability path.

## Completion criteria

- Political groups are visible, understandable, and mechanically real.
- Existing and new reforms resolve from bloc votes rather than one near-guaranteed
  global roll.
- Appropriate guild and political offices can be elective without making every office
  elective.
- Charters and privileges produce durable rights, obligations, and organized
  opposition.
- The player may choose an unjustified war and receives explicit, escalating,
  system-wide consequences.
- Military events react to personal, host, and war facts; deserters affect live
  troops.
- Jousting tournaments provide bounded martial, social, financial, and injury choices
  through the existing event system before any hosted-tournament simulation.
- Career expansions form sustained paths with durable accomplishments.
- Freeholders and gentry can attempt a frontier life through travel and work, then
  establish a politically coherent commoner home without receiving a noble county.
- Religious and settlement policy creates tradeoffs without inventing hidden
  demographics.
- Military units are data-driven and moddable before combat counters and cultural
  rosters depend on them.
- No new UI duplicates authoritative calculations, no new randomness bypasses the
  seeded RNG, and every shipped behavior change is documented and tested.
