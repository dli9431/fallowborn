# Fallowborn systems audit — 2026-07-27

Audit target: Fallowborn v1.77.0.

This is a source-based design audit, not a telemetry report. Frequency is inferred from
the daily/seasonal/yearly tick, cooldowns, rank gates, and the number of household or realm
targets a player can accumulate. Click counts are the normal shortest mouse/touch path from
the relevant top-level panel (Deeds, Self, Kin, Land, or Network), with confirmations counted.
Opening that panel from somewhere else usually adds one click; keyboard shortcuts can remove
that navigation click.

## How to read the scores

- **Similarity /10** measures similarity to the named closest system in player intent,
  interaction loop, and state lifecycle. `8+` means a shared surface or component is likely
  worthwhile. It does not automatically mean the saved state should be merged.
- **Complexity /10** measures the cost and risk of changing the system: tick integration,
  saved state, number of consumers, UI depth, and interactions with other systems. It is not a
  quality score.
- **Treatment** uses four verbs:
  - **Leave**: mechanically complete enough to receive only fixes, balance, and content for now.
  - **Polish**: keep the mechanics, improve explanation or access.
  - **Consolidate**: join duplicated entry points or presentations while preserving necessary
    mechanical boundaries.
  - **Flesh**: add decisions or content because the current loop is materially thinner than its
    neighbors.

## Executive findings

Fallowborn does not have many systems that should be mechanically collapsed. Most of the
apparent duplication represents important ownership or lifecycle differences: a building
belongs to a county, an enterprise to the dynasty, an item to the armory, a standard is a
maintained expense, personal Regard belongs to a person-to-protagonist relationship, and realm
Opinion is political.
Merging those records would erase useful distinctions.

The larger problem is **presentation and administration duplication**. Similar decisions are
spread across Deeds accordions, character sheets, Network blocks, Land, and separate modal
families. The player repeatedly answers "who should do this?", "what ongoing slot should this
use?", and "which asset should receive the money?" through different interfaces.

The five strongest overlap clusters are:

1. **Household development**: education, schooling, apprenticeship, career, religious standing,
   retainers, and enterprise staffing.
2. **Household and estate investment**: standards, permanent holdings, freehold plots,
   enterprises, buildings, equipment, and finance.
3. **Relationships at two scales**: character Regard/courtship/friendship/rivalry/gifts and
   ruler Favor/Opinion/envoys/pacts/alliances.
4. **Realm institutions**: the Estates, Royal Council, liege relations, vassal relations, and
   domain management.
5. **Persistent allocations**: daily focus, personal social attention, political attention,
   research slots, and host-command stance.

The best next work is therefore not another large simulation layer. It is:

1. an opt-in **household management policy** and one household plan view;
2. **equip-best** and **staff-best** assistance;
3. batch purchase for the five-plot manor path;
4. a common governance shell for Estates/Council/feudal relations;
5. one trade-venture entry and review flow;
6. then more content for plots, diplomacy, and temporary modifiers.

Post-audit player feedback identified a related presentation gap: **Work & Enterprises**
becomes harder to read as Household work and Family enterprises grow, and **Network**
becomes harder to scan as it accumulates named characters. Household automation reduces
click burden, and interaction cards consolidate actions for one target, but neither makes
the long overview lists legible. Treat this as a separate
[large-list readability plan](plans/large-list-readability.md) after interaction-card
consolidation and before the later content passes.

The systems that can safely be left alone for a while are technology, ordinary war, great holy
war and settlement, overland travel mechanics, world/realm simulation, the event interpreter,
save migration, mods, and localization. They are already among the largest and most
interconnected parts of the game.

## Scorecard: life and dynasty

| System | Closest analogue | Similarity | Complexity | Typical action load | Designed frequency | Depth / treatment |
| --- | --- | ---: | ---: | --- | --- | --- |
| Time, focus, Deeds, and automation | Social/political attention and research slots | 8 | 7 | Change focus: 1–2 clicks. Automation mode: 1 topbar click plus each setting. | Focus persists daily and changes a few times per life or situation. | Mature. **Leave** the tick and focus model; improve the ongoing-commitments summary only. |
| Event and story system | Every system-specific event layer | 6 | 9 | Usually 1 option click; occasionally a second named-character or follow-up choice. | One or two random slot days per season, plus births, war, schooling, travel, and queued decisions. | Mature engine and broad content. **Leave** the interpreter; continue adding stories through existing hooks. |
| Character lifecycle, skills, traits, health, death, and succession | Education, marriage, and equipment | 8 | 9 | Mostly passive. Succession is 1 heir choice; character inspection/actions are usually 1–3. | Continuous, with a major decision once per death and yearly health/life changes. | Deep and central. **Leave** the lifecycle; avoid another character-wide meter. |
| Education, careers, guild rank, and religious standing | Retainers, positions, and enterprise staffing | 9 | 8 | Normally 3 clicks per change: character/worker, category, choice. Focus and instruction are separate 3-click paths. | Repeats for every child at age gates and for every worker at career/rank thresholds. | Mechanically strong but administratively fragmented. **Consolidate and automate now.** |
| Marriage, children, descendant matches, and royal succession | Personal relationships and realm succession | 8 | 9 | Own match: about 3 clicks, then later proposal/event choices. Descendant match: about 3 from Kin. Royal courtship adds a 2-click visit review. | Once for the protagonist and potentially once for every child/grandchild each generation. | Deep but high-burden in large houses. Add an opt-in descendant match policy or a one-click recommendation. |
| Personal Regard, courtship, friendship, gifts, and rivalries | Realm Favor/Opinion, gifts, and diplomacy | 8 | 8 | Cultivate: 1 from a sheet. Gift: 2–3. Name friend or settle a feud: 1–2 plus events. | Attention ticks daily; gifts are at most every 90 days per recipient; feuds are occasional but long-lived. | Strong, but access is scattered. **Consolidate** relationship actions on one character interaction card; do not merge Regard with political opinion. |
| Items, armory, equipment, gifts, and collateral | Household property and character positions | 7 | 7 | Equip from a character sheet: 3 clicks per slot (Equip, slot, item), often repeated across several wearers. | On loot, age eligibility, household change, marriage, or succession. | Mechanically complete. Add **Equip best** for one character and optionally the household; keep manual slots. |
| Overland travel, destination stays, settlement, and gift couriers | Trade ventures and army/courier route jobs | 9 | 8 | Ordinary journey: about 6 clicks (open Life, deed, purpose, destination, review, depart). Targeted relationship visit: 2 from the character sheet. | A few times per life; destination stories then run automatically for months. | Deep and self-running after departure. **Leave** travel mechanics; streamline entry points only. |
| Plots, claims, and intrigue focus | Rivalries and war causes | 7 | 6 | Begin plot: 2–3 clicks, then the Scheming focus advances it automatically. | Usually one plot at a time and a handful per life. | Comparatively thin: seven core plots serve the whole social ladder. **Flesh next** with more target-driven outcomes and counterplay, using the current focus/discovery model. |
| Piety, blessings, alms, religious standing, and religious heads | Great holy war and faith-sensitive marriage | 8 | 8 | Most deeds are 2 clicks; head restoration/claim and absolution add a confirmation. | Alms monthly at most, blessings seasonally, standing at thresholds, head politics rarely. | Rich mechanics presented as separate islands. **Polish/consolidate** into a faith status sheet before adding another faith mechanic. |

### Life-system conclusions

The most repeated manual work is not the protagonist's focus or event choices. It is managing
multiple dependents. A dynasty with several children and grandchildren asks the player to open
each character separately for:

- education subject;
- schooling/tutor;
- apprenticeship or adult career;
- religious advancement;
- arranged match;
- equipment;
- enterprise assignment.

Each decision is only about three clicks, but the multiplier is household size and every
generation. This is the strongest automation case in the game.

The recommended common surface is a **Household Plan** table, not a new mechanic. Each row is a
managed person; columns show education, instruction, career/standing, enterprise/office,
match, and equipment. Clicking any cell opens the existing detailed picker. Optional household
policies can fill only empty or newly eligible choices:

- default education focus, with a per-child override;
- best instruction up to a seasonal fee cap;
- preferred career or "best available";
- auto-staff idle enterprises with the best eligible unassigned worker;
- notify/recommend a match at age 12 or 16, with optional station and dowry limits;
- equip-best on request, not silently after every loot event.

Marriage and religious advancement are consequential enough that the default should remain a
recommendation/notification. Full automatic selection can exist as an explicit player policy,
but should not be the default.

The Household Plan solves cross-screen administration, not list density by itself. Large
Work & Enterprises and Network surfaces additionally need counted sections, stable
needs-attention ordering, progressive disclosure, and local filtering/search while preserving
their distinct ownership and action routes. That follow-up is specified in
[large-list readability](plans/large-list-readability.md).

## Scorecard: household, land, and economy

| System | Closest analogue | Similarity | Complexity | Typical action load | Designed frequency | Depth / treatment |
| --- | --- | ---: | ---: | --- | --- | --- |
| Seasonal resource economy and source ledgers | Finance and household upkeep | 8 | 9 | Passive settlement; 1 click on a topbar resource for the itemized ledger. | Every season, with daily focus/event movement. | Mature and already authoritative across many systems. **Leave** the formulas; continue routing new costs through the same ledger. |
| Household standards and permanent holdings | Buildings, items, and enterprises | 8 | 7 | Permanent holding: 2 clicks. Standard upgrade: 4 (sheet, standard, improve, confirm). | Commoner progression and occasional upkeep adjustment. | Strong distinctions, but one dense sheet. Keep the records separate; add target-level policies only if household automation is built. |
| Freehold land plots and manor formation | Buildings and enterprise copies | 9 | 5 | 2 clicks per plot after Rank & Realm is open; the same picker stays open. Five purchases are normally required. | Repeated five times in the core Freeholder-to-Gentry climb. | Clear but mechanically repetitive. Add **Buy remaining plots here** with total price/yield and one confirmation. |
| Careers, household labor, enterprises, retainers, and positions | Education and council appointments | 9 | 8 | Career or staffing change: about 3. Enterprise purchase: 3. Retainer hire: 3–4. | Repeats with births, adulthood, marriages, deaths, arrears, and new enterprises. | Deep and useful, but the highest recurring administration load. **Consolidate and automate staffing.** |
| Coin, credit, price index, loans, partnerships, and ventures | Household economy and travel trade | 9 | 8 | Open ledger: 1. Loan: about 4. Passive partnership: 2–3. Self-founded venture: about 6 from Finance and 7 through Travel. | Reviewed seasonally; contracts last several seasons; ventures recur as capital allows. | Feature-rich. **Consolidate** trade entry and alerts; do not automate borrowing, pledging, or debasement. |
| Development and buildings | Holdings, technology, and modifiers | 8 | 7 | First building: 3–4 depending on county selection. `Raise Next` reduces repeated copies to 1 each. | Usually one or more purchases per season when landed and wealthy. | Mature, with prudent autobuild already present. **Leave** mechanics and use the existing automation. |
| National technology and research | Development, buildings, and persistent allocations | 8 | 9 | Manual project: about 3 (Technology, entry, Begin). Automatic mode makes future selections 0. | A project decision every several seasons; passive contribution each season and diffusion yearly. | Extremely deep: 180 graph entries, seven domains, history, exposure, slots, and AI. **Leave for a while.** |
| Temporary county/campaign modifiers and Common Voice effects | Traits, buildings, items, and technology effects | 8 | 6 | Usually 0; 1 click opens a modifier detail. | Granted by events or campaign state and lasts years/campaigns. | Good framework but only four core definitions. **Flesh through other systems' events**, not through a new modifier-management screen. |

### Asset similarities and boundaries

The investment systems all present a cost followed by a persistent benefit, so their
presentation can share a standard row:

`owner -> scope -> setup cost -> recurring cost -> effect -> transfer rule -> expiry`

That common row would make the distinctions more legible. The underlying state should remain
separate:

| Asset | Owner/scope | Why it must stay distinct |
| --- | --- | --- |
| Household standard | Dynasty while commoner; maintained level | Can lapse, has upkeep, no resale or pledge. |
| Permanent holding | Dynasty | Passes to heirs and may secure credit. |
| Freehold plot/manor | Dynasty in a named settlement | Drives the social climb and local consolidation. |
| Enterprise | Dynasty instance plus assigned worker | Can stand idle and moves with the family rather than conquest. |
| Building | County settlement | Follows conquest, can be ruined, and contributes to demesne-wide totals. |
| Item | Exact armory instance plus wearer | Can move between characters, be sold, gifted, pledged, or delivered. |
| Modifier | County/campaign circumstance | Usually timed and not purchased as property. |
| Technology | Sovereign nation | Permanent national knowledge, not dynastic wealth. |

The asset merge to pursue is therefore a **shared summary/effect renderer**, not one asset
array or one purchase API.

The finance/trade overlap is stronger. Finance and Travel already call the same stake/market
setup, but the player can enter it from two conceptual homes and the final choice creates
either a dispatched finance record or a travel-owned accompanied venture. Present it as one
**Trade Venture** flow, preferably owned by Finance, with "dispatch" and "accompany" as the
last decision. Travel can keep a shortcut into that exact flow. The records should remain
separate until dispatch and accompanied settlement actually share cancellation, timing, and
outcome rules.

## Scorecard: realm, world, and war

| System | Closest analogue | Similarity | Complexity | Typical action load | Designed frequency | Depth / treatment |
| --- | --- | ---: | ---: | --- | --- | --- |
| Provinces, map, settlements, de jure layers, and bookmarks | Travel targeting and realm ownership | 6 | 8 | Browse county: 1 map tap. Exact settlement/building interaction: 2–3. | Constant navigation, but few state-changing actions. | Mature and stable. **Leave** the raster/map model; polish only when another system needs a clearer route. |
| World AI realms, wars, rulers, technology, and scripted history | Player realm and war systems | 8 | 10 | 0; the player observes results. | Armies daily, major realm/tech/history work yearly. | Very high change risk and already broad. **Leave** except for performance, repair, and visibility. |
| Realm hierarchy, title ladder, domain, lieges, vassals, and land transfer | Council, Parliament, diplomacy, and war | 9 | 10 | Petitions/fealty/land actions: usually 2–3. Granting a county or duchy: 2. | At promotion, conquest, inheritance, patronage opportunities, or domain overflow. | The game's central strategic spine and already dense. **Leave** the hierarchy; add a domain cleanup assistant, not more title rules. |
| The Estates (vassal tiers 3–5) | Royal Council | 9 | 5 | Open: 2 from Deeds. Motion: 1 more, followed by a 1-click event vote. | About yearly, plus event sessions. | Narrow but sufficient. **Consolidate** presentation with governance; add content later rather than another estates meter. |
| Royal Council (tiers 6–7) | Estates and household retainers | 9 | 6 | Open: 2. Appoint/dismiss: 1 inside; a gift adds 2. | After coronation, vassal churn, or occasional relationship repair. | Good role/opinion loop but isolated. Use the common governance shell; optional "fill vacancies" recommendation is enough. |
| Foreign policy, envoys, pacts, alliances, and ruler gifts | Personal attention, friendship, and gifts | 8 | 7 | Stance/envoy/alliance/gift: normally 3–4 from Deeds or a realm sheet. | Several neighboring courts per reign; directions then tick seasonally without input. | Thinner than domestic politics and fragmented across shortcuts. **Consolidate first, flesh next.** |
| Ordinary war and field armies | Great holy war and travel route orders | 8 | 9 | Declare: about 2. Manual march: 2 map taps each order. War council: 1 each season. | Rare in early ranks; intense and repeated while landed. | Deep, legible, and already has defensive/offensive host and war-event automation. **Leave** mechanics. |
| Great holy war, vows, campaign contribution, and settlement council | Ordinary war, council, and realm settlement | 8 | 10 | Join/vow setup: roughly 4–5. Review: 2. Manual march: 2 per order. Settlement: 1 choice per contested step. | Rare, but can occupy years and many seasonal decisions. | One of the deepest and newest systems. **Leave for a long while** apart from fixes and clarity. |

### Governance consolidation

The Estates and Royal Council are deliberate mirrors and should stay mechanically opposite:

- the Estates records the player's obligations to a liege (`aid`, `scutage`, annual motion);
- the Royal Council records the crown's authority and appointments over vassals.

They should nonetheless share one **Governance** shell, reachable from both Deeds and Network:

- current role: subject, vassal, sovereign, or crowned ruler;
- liege terms and Favor;
- domain and vassal summary;
- Estates or Council module according to rank;
- current motions, authority, vacancies, and institution-triggered modifiers;
- direct links to grant land, petition, homage, revoke, tax, and realm sheets.

This removes the sense that Parliament and Council are unrelated minigames without merging
their state or balance.

Council offices, paid retainers, and enterprise workers also share the UI question "assign a
person to a role." A reusable position card can show candidate, eligibility, benefit, cost,
standing, and dismissal consequence. Council seats should not become paid household
retainers, but their pickers do not need independent interaction patterns.

### Diplomacy consolidation

Personal relationships and realm diplomacy both use:

1. select a target;
2. inspect standing;
3. spend attention, time, money, or a gift;
4. wait for standing to move;
5. unlock a pact, friendship, marriage, petition, alliance, or hostility.

The two scales should share an interaction-card layout and common standing language, while
preserving distinct identities:

- character **Regard** is a person's relationship with the protagonist;
- vassal/liege **Favor** belongs to a feudal relationship;
- foreign realm **Opinion** is ruler-generation political standing;
- personal attention and foreign policy have different capacities and succession rules.

Realm sheets should be the authoritative place for gifts, cultivation of a reigning ruler,
envoys, foreign-policy direction, pacts, alliances, royal children, and war causes. Deeds can
remain context-sensitive shortcuts into those sheets. That would remove several duplicate
target pickers without erasing the useful Deeds overview.

### Military consolidation boundary

Ordinary and great holy wars already share the correct layer: one sovereign host, composition,
movement, battle, logistics, and map controls. Keep that shared operational layer.

Do not merge:

- bilateral war causes and county siege outcomes;
- coalition participation and vows;
- campaign contribution and objective occupation;
- the great-holy-war settlement council.

Their stakes and termination rules are genuinely different. The useful polish is one military
status surface that always shows host, stance, route, logistics, enemy/camp, current objective,
and the next seasonal decision regardless of war type.

## High-overlap pairs: merge judgment

| Pair/cluster | Similarity | Recommendation |
| --- | ---: | --- |
| Education / apprenticeship / career / religious rank / enterprise staffing | 9 | Merge into one household planning surface and shared person-assignment components. Keep the underlying progress records. |
| Estates / Royal Council | 9 | Merge the governance entry and presentation shell. Keep obligations and authority as separate mechanics. |
| Dispatched trade venture / accompanied trade journey | 9 | Use one setup and review flow with the execution mode chosen last. Preserve different records while cancellation and settlement differ. |
| Standards / holdings / plots / enterprises / buildings | 8 | Share asset summaries, cost/effect rows, and batch purchase affordances. Do not merge ownership state. |
| Personal relationships / realm diplomacy | 8 | Share target cards and action placement. Do not merge Regard, Favor, or Opinion. |
| Ordinary war / great holy war | 8 | Continue sharing hosts, movement, combat, and logistics. Keep campaigns and settlements distinct. |
| Personal travel / gift courier | 8 | Continue sharing route and leg calculations. Keep journey, recipient, refund, and failure state distinct. |
| Focus / social attention / political attention / research slots | 8 | Add one "Ongoing commitments" summary with direct edit links. They are parallel allocations, not one interchangeable slot pool. |
| Traits / items / buildings / technology / modifiers | 7 | Share effect rendering and source-ledger conventions. Keep catalogs and scopes separate. |
| Council offices / household retainers / enterprise workers | 7 | Reuse assignment UI. Keep pay, authority, favor, and household membership rules separate. |
| Economic development / technological development | 4 | Keep separate. Their similar names already need explanation; combining them would obscure county capacity versus national knowledge. |
| Items / holdings / buildings | 5 | Keep separate. Exact transfer/equipment, dynastic property, and county ownership are three different games. |

## Automation audit

### Existing automation is already strong

The following should not be rebuilt:

- focuses persist and tick daily;
- social attention and political attention persist until changed;
- travel, couriers, pregnancies, household work, contracts, and armies tick without repeated
  confirmation;
- loan maturity repays automatically when affordable and default follows exact terms;
- event automation separates minor, major, war, and everything, with Prudent/Bold/First
  option styles;
- host command has manual, defensive, and offensive stances;
- buildings can auto-raise the cheapest prudent option once per season;
- national research can auto-fill by cheapest entry or preferred domain;
- succession auto-equips the new head with deterministic best gear;
- standard lapses, school payment pauses, retainer arrears, and invalid assignments already
  repair or settle automatically.

### Ranked automation candidates

| Priority | Candidate | Why it is repetitive | Safe shape |
| ---: | --- | --- | --- |
| 1 | Household education policy | Two separate 3-click choices for every child, revisited as schools, technology, and money change. | Default subject plus best instruction under a fee cap; apply only to empty/newly eligible choices and notify. |
| 2 | Enterprise staffing assistant | Death, marriage, career changes, and new enterprises can silently leave income idle. | "Staff all idle enterprises" preview, maximizing eligible yield without moving explicitly locked workers. |
| 3 | Equip-best action | Three clicks per slot across the head, spouses, retainers, and descendants. | Deterministic per-character button using the existing successor optimizer; optional household preview before applying. |
| 4 | Descendant match assistant | Three clicks per child/grandchild and potentially many descendants each generation. | Recommended match or opt-in policy with station floor, dowry cap, and "never spend prestige/gold beyond X." |
| 5 | Batch manor land purchase | The intended path repeats the same purchase five times in one settlement. | Quote all plots needed for the manor threshold, resulting yield, and remaining purse; one confirmation. |
| 6 | Domain cleanup assistant | Conquest can push the player over cap and then require repeated grant judgments. | Recommend county/complete duchy grants with before/after tax and levy. Never grant silently by default. |
| 7 | Council vacancy recommendation | Vassal death/churn can remove bonuses, but appointments are low-frequency. | "Recommend/fill vacant seats" preview based on eligibility, Favor, and schemer risk. |
| 8 | Household-standard targets | Levels already lapse safely but advancing several standards is repetitive. | Optional target levels constrained by reliable net and a gold reserve. Lower priority because spending is expressive. |

### Actions that should remain deliberate

Do not silently automate:

- borrowing, pledging, early repayment choice, investment risk, debasement, or recoinage;
- declaring war, independence, fealty, title acceptance, revocation, or permanent relocation;
- starting or breaking courtship, naming a friend/rival, divorce, or accepting a royal compact;
- accepting great-holy-war vows, breaking them, or settlement claims;
- selling/gifting unique items;
- dismissing people from service.

The existing "Autoresolve everything" can remain the explicit broad delegation mode for event
choices. System automation should otherwise operate through bounded policies and previews.

## What needs more depth

### 1. Plots and intrigue

The framework is sound—target context, plot power, discovery, a dedicated focus, and event
resolution—but seven plots cover the entire ladder. Add content before adding mechanics:

- more target-specific realm plots using existing characters and rulers;
- plots that interact with Council seats, Estates standing, guild monopolies, claims, and
  rival heat;
- discovered-plot consequences that create durable relationships or modifiers;
- defensive/counterplot stories using the existing Chamberlain and rivalry hooks.

Keep one plot slot and the Scheming focus. A second intrigue currency or agent roster would
duplicate systems that are already present.

### 2. Foreign diplomacy

The persistent Improve/Provoke directions are a good base, but the actionable outcomes are
still narrower than domestic politics: a pact, one alliance, gifts, royal marriage, and war.
After realm-sheet consolidation, add event-driven diplomatic consequences and choices around
the existing direction, opinion, pact, alliance, and ruler-generation records. Avoid a full
realm-to-realm opinion matrix; the player-relative model is a valuable complexity boundary.

### 3. Institution content

Council and Estates need more cross-system consequences more than new internal meters. Use
their events to touch:

- temporary county modifiers;
- guild and finance disputes;
- war logistics and vassal levy favors;
- liege grants, revocations, and domain cleanup;
- religious standing and head politics.

That will make the institutions feel central while keeping the current authority/obligation
models readable.

### 4. Temporary modifier content

The modifier framework has only four core definitions, so it currently reads more like
infrastructure than a broad world-state layer. Add modifiers opportunistically when an
existing event promises a circumstance that should last: famine relief, local custom,
contested tolls, road safety, levy exemptions, or settlement grudges. Do not create a direct
"manage modifiers" action loop.

### 5. Faith presentation, then content

Faith already spans piety income/spending, blessings, alms, marriage doctrine, careers and
religious ranks, excommunication/absolution, religious heads, sacred places, and great holy
war. Its first need is one view that explains those relationships. Only after that should
more faith-specific event content be added.

## What can be left alone

For the next several feature cycles, avoid major mechanical expansion in:

- national technology and its 180-entry graph;
- ordinary field war and host composition;
- great holy war, vows, modifiers, occupation, and settlement claims;
- overland travel routing, stays, relocation, and couriers;
- realm hierarchy, promotion, absorption, and downfall;
- world AI war/technology/succession simulation;
- the event interpreter and save migration model;
- item instance/ownership semantics;
- finance contract types;
- map rasterization, bookmarks, and de jure data;
- mods, localization, and durable messages.

These systems can still receive bug fixes, balance, clearer summaries, and content that uses
existing hooks. The recommendation is to stop adding new state shapes to them until the
current game is easier to administer and read.

## Supporting systems

These are not direct gameplay loops, but they materially constrain all feature work.

| Supporting system | Similarity | Complexity | Player action load | Treatment |
| --- | ---: | ---: | --- | --- |
| State, saves, autosave, export/import, and start seeds | 8 with bookmarks/mod stamping | 8 | Manual save/load is 2 menu clicks; import/export adds one more. Starts are 4 staged selections. | Mature additive-v3 discipline. **Leave.** |
| Runtime and bundled mods | 7 with data catalogs/validation | 8 | Usually 2–3 title/menu actions, rarely. | Broad and stable. **Leave** unless a gameplay feature adds schema. |
| Localization and durable messages | 7 with events/UI/data catalogs | 9 | Locale change is a settings action and reload, rarely. | Fully built and cross-cutting. **Leave architecture.** |
| UI, keyboard, mobile history, modal navigation, and accessibility | 10 with every system | 10 | It determines every click count above. | This is where consolidation should land; avoid parallel modal conventions. |
| Procedural portraits, heraldry, item art, and map rendering | 6 with character/item/map identity | 7 | Mostly passive; 1 click to inspect details. | Strong identity layer. **Leave** except for clarity/accessibility. |
| Observe mode | 7 with time/world simulation | 5 | Selected at New Game; then mostly 0. | Focused and complete. **Leave.** |

## Recommended implementation order

1. **Household Plan and policies**: consolidate existing character management without changing
   mechanics.
2. **Equip-best, staff-best, and manor batch purchase**: small, bounded reductions in repeated
   clicks.
3. **Governance shell**: Estates, Council, liege/vassal terms, domain, and direct action links.
4. **Realm/character interaction card consistency**: gifts, attention, envoys, pacts, alliances,
   courtship, and war causes in predictable places.
5. **Large-list readability**: make Work & Enterprises and Network scale through counted
   sections, stable needs-attention ordering, progressive disclosure, and local
   filtering/search.
6. **Single Trade Venture flow**: Finance as the main home, Travel as a shortcut, mode chosen
   last.
7. **Plot and diplomacy content** using existing state and event hooks.
8. **Modifier and institution content** as durable consequences of those stories.
9. Reassess click and scan burden in a large multi-generation household before adding
   another major simulation system.

## Source map used for this audit

Primary design references:

- `docs/designs/time.md`, `events.md`, `characters.md`, `marriage.md`, `items.md`,
  `travel.md`;
- `docs/designs/holdings.md`, `finance.md`, `development.md`, `tech.md`, `modifiers.md`;
- `docs/designs/provinces.md`, `realms.md`, `council.md`, `parliament.md`,
  `piety-intrigue-diplomacy.md`, `war.md`;
- `docs/designs/state-and-saves.md`, `mods.md`, `i18n.md`, and `ui.md`.

Primary implementation paths:

- top-level actions and cadence: `js/actions.js`, `js/main.js`, `js/ui.js`;
- character/household: `js/model.js`, `js/economy.js`, `js/items.js`;
- world/realm/war: `js/world.js`, `js/armies.js`, `js/holywar.js`, `js/settlement.js`;
- travel/technology/events: `js/travel.js`, `js/technology.js`, `js/events.js`;
- institutions and modifiers: `js/council.js`, `js/parliament.js`, `js/modifiers.js`;
- authored system catalogs: `data/economy.js`, `data/map_data.js`, `data/technology.js`,
  `data/travel.js`, `data/modifiers.js`, and the event packs.

The largest change surfaces support the "leave the deep engines alone" conclusion:
`js/ui.js` is over 11,000 lines; `world.js` over 3,500; `events.js`, `economy.js`,
`actions.js`, and `holywar.js` are each around 3,000; travel, technology, war, and items add
several thousand more. Line count is not a quality measure, but it is a useful warning that
the next value is more likely to come from synthesis and administrative delegation than from
another cross-cutting subsystem.
