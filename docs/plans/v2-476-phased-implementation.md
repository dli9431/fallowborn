# v2.0 (476): phased implementation plan

Status: proposed for the v1.184.0 codebase, 2026-09-23. No release date is set.
Phase 0 decisions and static audit are recorded in the
[Phase 0 package](v2-476-phase-0/README.md). The owner requested progression using
the existing notes, saves and benchmarks. [Phase 1](v2-476-phase-1.md), the
[Phase 2 authority engine](v2-476-phase-2.md) the
[Phase 3 migration prototype](v2-476-phase-3.md), and the Phase 4–5 regional
implementation described in [the 476 design](../designs/situation-476.md) are
authored on the 476 branch; runtime parity and device comparisons remain
owner-controlled. Phase 6 save integration and acceptance coverage are now
authored; see [the Phase 6 record](v2-476-phase-6.md). Publication and runtime
acceptance are still pending.

## Outcome

Ship a spring 476 bookmark in which the deposition of Romulus Augustulus can
happen during play. Power must work differently from the 867 and 1066 starts:
Roman offices can exist without fiefs, military command can diverge from civil
jurisdiction, federate service is negotiated, legitimacy has competing sources,
and the ruling institution can differ from the communities it governs.

The release is a completed regional experience. Its playable slice is Italy,
Dalmatia, southern Gaul and Vandal North Africa, with eastern imperial
diplomacy where the present map permits. Preserve the shipped 867 and 1066
campaigns and supported saves. This plan uses the existing regional world;
global tiles, region loading and worldwide playable content are later work.

## Current foundations to reuse

- Atomic bookmark definitions and validation in §data/bookmarks.js§ and
  §js/world.js§. A bookmark owns its date, provinces, realms, hierarchy and
  scripted history.
- Live characters and realm courts, county owner and direct holder, settlement
  sites, saved culture/faith communities, and the existing 867/1066 progression.
- Council and Estates votes, guild and council elections, privileges, realm
  treasuries, ruler agency, events, and temporary modifiers.
- Map hosts, routes, supply, concurrent campaigns, and the reusable
  claims-and-settlement sessions in §js/settlement.js§.
- The national technology graph in §data/technology.js§ already covers
  476-1300 with historical windows, traditions and diffusion. Author 476
  starting knowledge on that graph; do not build a second technology engine.

These are foundations, not proof that the 476 authority model is complete.
Current realm ranks, de jure titles, player tiers, governance gates and some
war or fiscal consumers still assume landed feudal rule.

## Design contracts

1. **Separate facts.** Character station, held land, political office, military
   command, jurisdiction, revenue rights, consent obligations, recognition and
   realm government form are distinct. A title label or culture cannot stand in
   for the whole government.
2. **Keep existing territorial identity.** §state.owner§ names the top
   sovereign; §state.holder§ names the direct county holder. An office is not a
   fabricated county or realm node. Existing province and physical-site IDs
   remain stable where they denote the same place.
3. **One authority answer.** Existing and new consumers use shared,
   deterministic queries for who may command, judge, collect, appoint, grant
   land or demand consent in a particular context. Derived projections are
   disposable; save durable grants, contracts, office appointments and claims.
4. **Preserve communities.** County and settlement culture/faith partitions
   remain the population truth. Add ruling elite, legal identity and
   jurisdiction without collapsing the population to one culture and faith.
5. **Data chooses supported rules.** Author period ladders, office definitions,
   labels, contract terms, legitimacy sources and bookmark starting state in
   data. Validate IDs and combinations. New player decisions, AI behavior and
   consequences still require engine code.
6. **Compatibility is a release gate.** Prototype the save-v3 to save-v4
   migration early, but release it with the completed bookmark. Resolve old
   title IDs when loading supported saves and mods, then write canonical IDs.
   Keep RNG order and scripted-event identity stable unless an explicit
   migration accounts for a change.
7. **Technology is knowledge, not permission for basic rule.** Use existing
   research gates for genuine techniques and institutions. Officeholding,
   recognition, legal standing and baseline political recovery require their
   own social or legal conditions.

Compatible query and authority foundations may ship in 1.x after parity checks.
Do not publish incomplete v4 state or an unfinished 476 bookmark as a release.

## Phase 0: baseline and decisions

Implementation record: [decisions, inventory, scenario and baseline protocol](v2-476-phase-0/README.md).
The chosen first path is a federate soldier near Ravenna.

**Work**

- Inventory every reader and writer that infers power from player tier, realm
  rank, land, liege, de jure title or the Council's single Crown Authority
  value. Group consumers by progression, armies, diplomacy, justice, taxation,
  AI, events, UI and save repair.
- Collect representative 867 and 1066 saves and define journeys covering
  landed and landless players, vassal and sovereign rulers, war, succession,
  council or Estates business, religious leadership, and long campaigns.
- Record owner-run cold boot, year-boundary, save size and mobile interaction
  baselines on target devices. Measure before assigning performance work.
- Decide the first commoner path (colonus, federate soldier or curialis), the
  initial office and legitimacy sources, and how much eastern imperial
  diplomacy is on-map. Record the 476 start cast and historical source notes.
- Draft the authority query contract and durable state diagram. Update the
  owning design docs before changing each system.

**Gate:** the first vertical-slice scenario has a written start state, player
decisions and observable outcomes. Every existing authority consumer has an
owner and an intended replacement query. Save and performance baselines are
available for later comparison.

## Phase 1: shared world and political queries

Implementation record: [APIs, migrated callers, invalidation and coverage](v2-476-phase-1.md).

**Work**

- Extend the existing owner, holder, hierarchy, court and territory projections
  with stable read APIs for the actor, place and political relationship a
  decision concerns. Reuse current indices; avoid another independently
  maintained map of authority.
- Move one existing consumer at a time to those queries, beginning with
  read-only UI and previews, then eligibility and mutation paths. Retain
  867/1066 outcomes while changing the source of the answer.
- Make offices and character roles addressable separately from county and
  realm ownership. Read paths must not materialize courts or mutate state.
- State cache invalidation rules for conquest, grants, liege changes,
  appointments, succession, conversion and save restore.

**Gate:** existing-bookmark journeys give the same owner, holder, ruler,
permissions and displayed costs before and after the query migration. A
changed relationship invalidates every dependent projection exactly once.

## Phase 2: generalized authority and government behavior

Implementation record: [scoped powers, durable transitions and converted consumers](v2-476-phase-2.md).

**Work**

- Model Ban (command and muster), Peace (courts and safe conduct), Revenue
  (renders, tolls and treasury claims), and Consent (councils, assemblies and
  recognition) as independent powers. Define their scope and legal basis,
  including what happens when different actors hold different powers.
- Introduce offices as appointments or contested honors linked to characters
  and institutions. Appointment, expiration, removal, succession and loss of
  recognition must have explicit transitions. Holding an office does not
  silently transfer its patron's land.
- Introduce legitimacy sources such as army acclamation, imperial commission,
  dynastic succession, civic acceptance and church support. Decisions and AI
  must consult the relevant sources, not one universal legitimacy label.
- Add realm-level federate contracts with durable settlement, pay, service and
  recognition terms. Use existing voting and claims-and-settlement mechanisms
  for negotiation and land awards; give breach, renewal and succession
  observable consequences.
- Add customary rights that can accrue or decay through tenure, judgment,
  recognition and possession. Keep de jure geography as historical reference,
  not the only legal answer.
- Refactor military, fiscal, justice, diplomacy, progression and AI consumers
  in bounded steps. For each change, author behavior tests with an 867/1066
  parity case and a case where office and land point to different actors.

**Gate:** the engine can represent a Roman officeholder with no fief, a warlord
with command but weak civil rights, and a federate force with negotiated
service. Each case makes a different decision in play. No second feudal-only
authority path remains authoritative for the converted actions.

## Phase 3: durable IDs and migration prototype

Implementation record: [canonical IDs, aliases and v4 prototype](v2-476-phase-3.md).

This design starts alongside Phases 1 and 2. Final serialization lands with
the completed 2.0 release.

**Work**

- Replace rank-prefixed §e_§, §k_§ and §d_§ title references with canonical,
  rank-scoped IDs plus aliases. Audit bookmark hierarchies, county duchy
  references, holy-war configuration, events, UI links, saves and mod data.
- Define save-v4 records for offices, contracts, legitimacy, customary rights,
  governing identity and any site-keyed civic actors. Keep derived indices,
  render data and preview quotes out of the save.
- Prototype v3-to-v4 loading and round trips with old 867/1066 saves. Resolve
  aliases on load, serialize canonical IDs, and reject missing or ambiguous
  county-to-duchy, duchy-to-kingdom and kingdom-to-empire references.
- Preserve community partitions, character and family links, custody,
  campaigns, treasuries, enterprises, buildings and settlement references.
  Record how legacy mods are validated and when a modded save is incompatible.
- Add restore-time validation and deterministic repair only for genuinely
  optional old fields. Do not silently invent a new office, contract or right
  that changes an existing campaign.

**Gate:** supported old saves and mods either round-trip with the same
political and personal facts or fail with a specific compatibility error.
The migration is repeatable and does not create duplicate offices, rights,
payments or scripted outcomes.

## Phase 4: one complete 476 vertical slice

Implementation design: [spring 476 prototype](../designs/situation-476.md).

**Work**

- Author the spring 476 start for the bounded test area, including Romulus
  Augustulus and Orestes in Italy, Odoacer and the federates, Julius Nepos in
  Dalmatia, Basiliscus in Constantinople and the displaced claimant Zeno,
  and the relevant Gothic, Frankish and Vandal powers. Zeno's historical
  return later in 476 must respond to the current political situation.
- Implement one connected sequence with an office claim, an imperial
  recognition decision, a federate contract, a city or senate negotiation,
  and a moving court that demands or receives settlement. The sequence must
  support at least a negotiated and a contested outcome.
- Author a period-correct religious map with no Islam in 476, the Arian and
  Nicene split, Roman civic identity and governing elites. Make these
  differences mechanically relevant. Keep population communities intact
  through conquest, conversion and settlement.
- Use period-authored station and career steps for the player path. Apply the
  period lexicon to titles, troops and direct holdings without changing
  internal concept IDs or baking display prose into saves.
- Use the existing technology graph and site interaction. Seed period
  knowledge, cities and institutions. Add research gates only for the
  particular capability they credibly represent.

**Gate:** a fresh 476 campaign reaches each branch of the connected situation
through ordinary gameplay, while 867 and 1066 still complete their baseline
journeys. The prototype proves the political model; it is not the release.

## Phase 5: complete the bounded experience

Implementation design: [the 476 regional campaign](../designs/situation-476.md).

**Work**

- Finish the 476 career ladder, church route, office and legitimacy choices,
  federate contracts, customary-right consequences, governing identity,
  religious relationships, and city, senate and bishopric actors.
- Fill the bounded regional map with researched rulers, communities,
  settlements, legal institutions and period presentation. Add costume
  layers and rank dress to the existing portrait engine.
- Author the deposition, survival and restoration paths, Theodoric's
  489-493 campaign, Clovis, and a long-campaign route toward Justinian's
  reconquest. Historical rails must react to changed player and AI history.
- Give the AI the same authority, contract and settlement constraints the
  player faces. Handle extinction, loss of capital, displaced courts,
  succession during negotiation and conquered mixed-faith counties.
- Route all new player-facing text through the localization layer. Update
  the public data/mod schema and the relevant design docs as mechanics land.

**Gate:** the bounded region has a complete playable start and multiple
political outcomes, not just a demonstration event. City, federate,
recognition, migration and western-office chains can each reach a durable
resolution.

## Phase 6: integration and release gate

Implementation and outstanding acceptance: [Phase 6 record](v2-476-phase-6.md).

- Finalize and release the save-v4 migration only with the completed bookmark.
  Validate load, save, export/import, autosave and supported old-save paths.
- Author focused automated coverage for authority separation, office and
  contract transitions, customary rights, aliases, scripted history,
  succession, AI parity and each complete 476 chain. Follow
  [the test workflow](../TESTS.md); execution remains owner-controlled.
- Validate 867/1066 progression, diplomacy, religion, wars, treasuries,
  justice, UI and long campaigns against the Phase 0 baseline.
- Profile measured hot paths and fix only demonstrated regressions. Confirm
  target-device memory, responsiveness, mobile interaction and save quota.
- Review the 476 map and screens for clarity, accessibility, period labels
  and stable navigation. Finalize release copy and compatibility notes.

**Release gate:** all bounded 476 chains and period systems are complete;
migration preserves supported histories; 867/1066 remain playable; target
devices pass the agreed performance and interaction checks.

## Reuse after 2.0

The authority, contract, office and government-definition work should permit
one later fully playable government form on the existing map. A merchant
republic would reuse markets, guild and council elections but still need
ruler elections and civic political economy. A mobile confederation would
reuse hosts, travel and settlement but still need persistent mobile rule,
non-landed support and a post-settlement government. Neither is a 2.0
release condition or a label-only data addition.

A fully playable region such as China requires a separate global-capable
world architecture and researched regional content. The 476 release should
preserve stable IDs, authority boundaries and durable-state rules that can be
carried into that work without making tiles, remote simulation or a universal
government plugin API prerequisites for 2.0.

## Public source references

- [Realms and authority](../designs/realms.md)
- [State and saves](../designs/state-and-saves.md)
- [Wars](../designs/war.md)
- [Events](../designs/events.md)
- [Technology](../designs/tech.md)
- [Religions](../designs/religions.md)
- [Modding schema](../MODDING.md)
