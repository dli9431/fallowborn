Boathouse work catalogue

data/buildings_boathouses.js adds the modest boathouse with cost 25, upkeep 1, devMin 0, county limit 1, shipyard role, coastal siting and AI priority 32. Construction uses inclusive 650-1300 Nordic learning-tradition applicability and no technology gate. It grants no passive scalar. Actual useful work requires the existing production and maritime assignments, finite owned timber/cordage, paid action days and current lawful co-located launching capacity. The existing household enterprise invoice owner consumes that paid contribution once, at most ten percent of the unchanged ordinary invoice, and charges the remainder with normal staffing and technology. No source, historical asset, goods or enterprise is installed. building_boathouse has technology impact none for basic shelter; optional enterprise stages keep their existing reviews. See docs/research/boathouses.md and docs/designs/maritime-work.md for exact values, ordinary examples, evidence limits and receipt continuity.

# Development & buildings

Physical resource declarations

Optional siteResourceProfiles and bookmark/revision siteResourceAssignments supply a separate physical-capacity owner, described in docs/designs/site-resources.md. Flow, stored water and access places are typed and finite; rights use actual settlement holders or an exact effective existing office. A reservation or water transfer creates no building record and contributes no static building effect, production, military supply, income or population bonus. The site_resource_claims technology review is none for baseline allocation; every actual facility and advanced operation keeps its ordinary gates and costs. Existing construction, assets, upkeep, AI budgets and released world declarations retain their current owners.

Existing institutional foundations

Optional institutionProfile building declarations and bookmark buildingInstitutionAssignments compose the existing local institution, actual endowed property, lawful holder, original office and builder/maintenance payer. One physical foundation cannot pay construction awards for several alternative works, including through ruins. Player, automation, private barons and realm construction share the pure gate. Changed permission suspends only bound ongoing benefits and upkeep until explicit reaffirmation; physical assets and past construction remain. Unbound legacy buildings keep their current behavior. Technology impact building_institution_binding is none, with ordinary optional building technologies retained. Exact public contracts, payer boundaries and save behavior are in docs/designs/building-institutions.md.

Composed construction catalogue

The effective catalogue has 21 buildings: the nineteen retained ids plus hospice and boathouse. Eight complete replacements preserve every existing numeric field, role and AI priority while updating the declared presentation, prerequisite or applicability. Construction scope and group capacity share the normal authority and paid transaction; inherited works and repairs retain their separate contracts. Annual AI keeps the full priority table, finite purchase budget and existing reserves, including each proposed building's upkeep. The combined JSON example and regression spec in docs/research/technology-and-buildings.md cover these boundaries together without installing historical inventories or creating institutional rights.

Post-mill construction

data/buildings_wind.js retains the windmill id and Post Windmill name, with cost 45, tax 2, development 1, population capacity 0.05, maxCounty 2 and AI priority 9. New construction needs windmill knowledge and applicability.yearMin 1150, inclusive, through the shared player, automation, annual realm AI and private-baron checks. Knowledge may precede permission. The boundary applies only to new construction; existing assets retain effects, upkeep and ordinary repairs after eligibility changes, with no saved-record migration or installation replay. Ordinary grinding and watermills remain available. The existing soft building_windmill review and none construction_applicability review cover these independent conditions. The terrain/grain abstraction is unchanged; sources and the rounded-date limits are in docs/research/windmills.md.

Learning and care catalogue

data/buildings_learning_care.js adds Charitable Guesthouse (hospice) with cost 55, upkeep 1, devMin 2, maxCounty 1, crisis protection 0.03 and no technology requirement or construction award. Library now requires scriptoria, retaining cost 80, upkeep 1, devMin 4 and research 1 counted once nationally, including delegated sites. Hospital preserves all existing prices, effects and its hospitals requirement. Hospital and Guesthouse share care_foundation capacity one across the county's actual standing and ruined records. Old over-limit assets retain effects and repairs; demolition removes grouped records without refund and new construction needs room. This supplies no endowed institution, qualification or automatic replacement.

manuscript_library_access is soft with scriptoria and ordinary learning as fallback. charitable_guesthouse is none, funded through ordinary authority, construction and upkeep. Hospital retains its soft hospitals review. Monumental Vaulted Sanctuary replaces the Cathedral display with compatible faith variants; its existing ribbed_vaulting gate applies to optional monumental scale, with temple and ordinary worship as fallbacks. Great Temple and University definitions remain unchanged. See docs/research/learning-and-care.md for source limits and docs/designs/tech.md for the manuscript prerequisite changes.

Guild, range and furnace presentation

data/buildings_civic_military.js supplies complete replacements for guildhall, archery_butts and foundry after the base building and technology tables. Chartered Guildhall (Italian Guild Hall) represents chartered guild facilities, with no commune or public office created. Archery Butts describes specialized military training under crossbows rather than a universal Sunday obligation. Foundry and Forge Works describes advanced furnace capacity under blast_furnace, distinct from ordinary smithing and older casting. All numeric fields, gates, roles, limits and AI priorities remain unchanged. The existing hard building reviews still apply; these presentation corrections add no independently gateable capability. Existing standing/ruined records, repair and normal paid construction retain their ordinary behavior. Source context is in docs/research/technology-civic-military.md.

Fresh inherited infrastructure

An explicit openingInfrastructure inventory initializes ordinary state.buildings atomically after final political and site identities, including ruler adoption, and before fort repair or initial population, market and treasury projections. Each record uses the resolved site slot and building id, devGranted:0, an optional ruined:true and a canonical fort level where appropriate. Authored development already includes the works. Initialization grants no development, prestige, piety, Popular support, people, cash or news; standing effects and upkeep use the ordinary ledger thereafter. No construction technology or date gate is applied to inherited property. The existing inherited_opening_infrastructure technology review remains none.

The strict optional openingInfrastructureState marker records the applied bookmark/revision and explicit policy. It prevents replay and inferred capital forts, even for an empty inventory. Actual demolition, conquest and repair remain ordinary transactions; restore never reinstalls a missing asset. Worlds and old saves without the marker keep legacy inferred-fort migration. Explicit-world player boot defers economic setup until adoption and inventory application; the normal treasury initializer then supplies an adopted crown's ordinary opening reserves from the complete ledger. No historical world opts in through this shared capability. See docs/designs/state-and-saves.md for the exact marker contract.

Explicit-world opening scripts run after the inventory and initial economic setup, with scripted realm/liege references resolved through the adopted ruler's ordinary source-to-player mapping. World-story records retain their existing pre-adoption binding and typed remapping; those initializers create no population, market or treasury projection. Legacy worlds retain their original ordering. No opening fiscal or demographic projection runs against an empty inherited ledger.

Naval outfitting yard

data/buildings_maritime.js replaces arsenal with the Naval Outfitting Yard presentation and harbor_works construction requirement. The stable id, shipyard role, coastal condition, development minimum 5, county limit 1, cost 140, upkeep 3, tax 5, development 1, retinue 20 and AI priority 4 are unchanged. Ordinary player, private-baron and annual AI construction share the existing eligibility and paid transaction. Existing records retain their effects and repair path when knowledge changes. The existing building_arsenal technology review is hard with harbor_works, with ordinary boat work and travel as fallback. The funded workforce remains an ordinary manpower abstraction: neither discovery nor building creates a ship, fleet, command or historical yard. See docs/research/technology-maritime.md.

Construction applicability

Optional building applicability limits new construction by inclusive live-year bounds, stamped campaign era, physical county, declared primary resident culture and the payer's sovereign technology traditions. Different dimensions combine; alternatives within a list match individually. The pure buildingApplicabilityStatus projection supplies the same first localized blocker to player construction, automation, realm AI, private barons, fort funding and the Building Works picker. Ordinary authority, price, development, siting, technology and occupancy still apply, and confirmation recomputes live eligibility before spending.

Resident culture belongs to the target county's current population identity, with the province declaration used only when runtime identity is absent. A minority, ruler culture or unrelated player residence cannot replace it. A realm payer follows its sovereign; private barons use the target county holder's sovereign through the canonical settlement actor and technology resolver. Generated cultures match exact ids, with no ancestry equivalence. Unresolved context blocks the gated candidate. Bundled and ordinary JSON declarations share strict detached validation and exact mod fingerprints; see docs/MODDING.md for the field contract.

Existing buildings retain effects and upkeep after context changes. Repairs restore their existing asset without applying new-construction applicability; already funded fort projects complete normally. New fort upgrades are new commitments and recheck applicability. No saved building shape, migration, opening inventory, technology completion or rendered status is introduced. The construction_applicability technology-impact review is none: historical place, date and social context are permissions rather than discoveries, and ordinary baseline activities remain available. Existing optional building technology requirements stay independent.

Shared construction capacity

Optional constructionGroup declarations reserve county capacity across named building types, independently of their roles. A group has a structural id and one agreed integer maxCounty between 1 and 2048. Validation of the effective built-in or JSON-composed table rejects malformed or inconsistent groups. Physical standing and ruined records count once per county/type/site across every settlement and holder, using the unsaved county building index. Enumeration and the building ledger reuse that aggregation; confirmation checks live capacity before any charge. Player, autoBuild, baron and annual AI eligibility share the same projection. The ledger shows occupied/limit, includes ruins, caps remaining copies and explains the actual group blocker.

Existing over-limit assets continue working and repairs remain available under their ordinary authority, price and per-id gates. Fort upgrades and already funded projects retain their place. Demolishing a grouped asset or grouped ruin removes its record and releases capacity without refund; removed copies also leave the record-derived repeat-price count. Other demolition keeps persistent ruins. Existing raid ruins remain occupied until repaired or deliberately demolished. Removal uses the existing development reversal, population reconciliation and cache invalidation boundaries, without a replacement transaction or a saved group counter.

Technology impact construction_group_limits is none: shared physical capacity is an occupancy rule rather than a discovery. Individual building and fort technology requirements remain authoritative.

## Settlement founding

The charter review shows County capacity as established sites out of eight (`x/8`).
When every physical site is founded, its blocker says so rather than suggesting
more development. Development still gates unused sites below that maximum.

Gentry can fund an unused site from Deeds or the barony petition review, including
in their first generation. Development supplies capacity at 3, 5, 7 and 9; it no
longer creates settlements automatically. A charter costs the existing barony gold
investment upfront (normally 500) and takes `settlementFoundingSeasons` (four,
360 days). The quoted barony prestige/piety cost is paid with gold at funding
(normally 250 prestige, zero piety); all payments are non-refundable. Legacy
charters without `costsPaid` keep their original completion payment terms. The household remains Gentry while building.

One project reserves the next compiled slot; county transfer and inheritance retain
it. Occupation or siege pauses its clock. Completion waits for capacity, residents,
a living sponsor, Gentry-or-higher rank, residence in the charter county and the
investiture resources. It then grants hereditary lordship, moves the household seat
and awards Baron once, preserving any higher rank. Cancellation releases the slot
without refunding construction or removing current rank/property. Existing-site
petitions retain their established-house and Standing rules; founding is the funded
alternative, without an additional approval roll or generation requirement.

Technology review `settlement_founding` is **none**: ordinary chartering needs no
research. Existing soft administrative capacity and building technology still apply.
Founding grants no immediate development or extra people; the conserved county
community partition supplies its residents.

## Autonomous baron development (Phase 4)

After seasonal treasury settlement, a saved rotating cursor considers at most
24 living NPC barons, at most four rotating holdings per baron, and at most one local
building per considered baron. Seeded selection uses only currently legal and
affordable works. Existing technology, terrain, occupancy, county and personal
limits remain authoritative; strategic forts remain the count's responsibility.
The baron pays from their own purse while preserving the existing reserve for
upkeep and dues, including the proposed building's upkeep. There are no routine
player approvals or free construction. Repeating a seasonal pass is a no-op.
This is automation of existing construction, not a separately gated capability;
the lordship review remains `none`, and individual building gates still apply.


## Settlement lordship accounting (Phase 3)

The Deeds building summary has one full-width button per directly held settlement, including empty holdings. Names, localized building labels, standing counts and separately labeled ruin counts wrap inside the card without hover. Empty holdings say No buildings. Only types actually present contribute columns; catalogue availability does not add an asset. A matrix is used only when its measured localized content, counts, gaps and row padding fit the actual card container. Container changes are observed where ResizeObserver exists, with window resize as the fallback. Layout changes preserve the same buttons. Every row is at least 44 CSS pixels high and opens its exact county and settlement. Deeds redraws retain these button nodes for modal return focus, alongside panel scroll and ordinary Back, Cancel, Escape and browser Back. This is presentation only and needs no technology impact entry.

The holding count reads "Settlements"; the cap still counts only directly held settlements. Settlement sheets describe a player
holding as "held by you", including personal baronies within another ruler's county.

Ordinary construction and demolition require direct settlement lordship. A territorial
baron can develop their granted sites; a count cannot build in a delegated site.
Build, ledgers, settlement controls, automation, AI eligibility, and mutation APIs
share this rule. County forts remain strategic county-holder assets at their existing
physical site, including when that settlement is delegated. County residence alone
never grants either kind of authority.
Player construction authority also requires Baron rank or higher. Stale ownership
records after a rank change cannot grant commoners construction or demolition access.

The transient building index includes settlement subtotals. Local tax, upkeep,
piety, levy, retinue, and archers follow the holder. Development, Popular support,
population capacity, migration attraction, famine/crisis protection, and community
faith pressure retain county scope; research goes once to the sovereign through
`techResearchRate`. Prestige and Popular support granted on construction remain
one-time effects. `buildingEffectScope` exposes local/county/national classification.

Occupancy and repeat-copy prices include ruins and remain physical county properties.
County limits include all sites; personal limits count only directly held works.
Grants, succession, construction, demolition, and political transfers invalidate the
ownership/military or building projections without resetting construction history.
AI counts use their treasury reserves and cannot build for free before accounting
is active. `buildBarony` provides the paid, authority-checked construction primitive;
Phase 4 schedules autonomous seasonal choices after treasury settlement.


The building ledger displays the standing count and how many additional copies
can be raised under current conditions. Remaining copies are capped by county
and demesne limits, not just the number of suitable settlement placements.
County limits and the demesne-wide built/limit count stay visible on each card.
The ledger explains one copy of each building per settlement and that ruins keep
their place occupied. Unavailable cards and their Details give the actual blocker;
the county picker calls its summed building/settlement combinations building options,
not a promise of that many additional buildings. Counts exclude affordability,
which remains separately visible through the price and disabled Raise button.

Building list entries have no positional hotkeys or badges. Their controls
remain reachable with Tab and activate with Enter or Space.

## Settlements and development

Starting development is an ordinal measure of a whole county's productive,
fiscal, and manpower capacity in 867, not a city-population estimate or a
ranking of later fame. The 1–10 scale reads: 1–2 sparse frontier; 3 ordinary
established county; 4 productive or significant center; 5–6 major regional
center; 7–9 exceptional metropolis or irrigated core; and 10 world-leading
center. The authored `dev` in `FBDATA.provinces` initializes `state.dev` only
for a fresh game. Loaded saves normally keep their stored `state.dev` values,
including development gained or lost during play. The sole compatibility
exception is the one-time player migration described below.

The Land tab labels this county value **Economic development** and shows the
effective sovereign's separate 0–10 **Technological development** rating beside
it. The technology rating is informational; it does not replace county
development or change development-driven calculations.

`FB.settlementDevelopment(state, pid)` is the read-only growth explanation shared by
province, settlement, and Guide UI. It returns current and bookmark development plus
the next settlement-growth threshold that will actually change something: 3, 5, 7, and 9
each unlock one founding slot, 4 promotes the head village to a town, 6 promotes the second
settlement to a town, and 7 promotes the head settlement to a city. Authored settlement baselines
(`data/settlements.js`) floor a slot's kind and an authored list can make a slot
visible early; thresholds already satisfied that way are skipped rather than promised.
The UI displays the starting development and next threshold together so historical starting
advantage is not described as growth achieved during play.

**Development is buildings.** Tier-3+ settlement holders raise named works
(`FBDATA.buildings` in map_data.js) through `FB.build`/`FB.buildable` and the
building picker. Baron status alone grants no land or construction authority;
a concrete lordship does. Existing works remain attached to their settlement.
After choosing a province when necessary, `UI.showBuildings` presents a persistent
building-first county ledger. A sticky native county selector remains visible while the
ledger scrolls, so touch and keyboard players can move directly between every held county.
**Raise** places the work in the next open settlement, keeps the ledger open, and
refreshes the exact next price; the ledger warns that each further county copy costs 50%
more. Each directly held county can also be placed in the `autoBuildCounty` protection
scope from Governance or its building ledger. `FB.autoBuild` omits protected counties
without changing the global automation setting; manual **Raise** and exact settlement
construction remain available. The Land-tab settlement path remains the exact-placement
route. The **Raise a building…** modal's **Back** button returns directly to the originating
settlement sheet rather than the general county ledger, and following fortification technology
requirement links from cards or tooltips preserves the settlement sheet as the Back destination.

Build choices and standing settlement buildings use the shared compact asset card:
icon, name, one-line effect, and a cost/status meta line, with the full asset/effect
audit table behind the card's details disclosure. The audit identifies the county owner
and exact settlement scope, separates the live construction quote from seasonal upkeep,
lists all effects, states that the building follows conquest, and names demolition/ruin
as its end condition. Ruins use the same card with no benefit or upkeep.
An authored `d.dev` is labeled as immediate county development when raised.
Technology `fx.devCap` is labeled as the development ceiling above the base of 10
for every county in the nation that owns it, not as current development.

Built-in productive and trade buildings contribute economic development when raised:
Watermills, Post Windmills, Stone Bridges, Market Squares, Harbors, Monumental Vaulted Sanctuaries, Civic Guildhalls,
Naval Arsenals, and Merchant Exchanges each supply +1 development. Granaries provide resilience and famine
protection instead (+35% famine protection); Libraries (+1) and Universities (+2) contribute national research;
Great Temples (+10%) and Monumental Vaulted Sanctuaries (+15%) provide religious prestige and crisis protection; Endowed Hospitals
mitigate epidemics (+10% crisis protection, +5% famine protection), with Charitable Guesthouses (+3% crisis protection) as a modest alternative; Watermills (+5%), Post Windmills (+5%), and Harbors (+3%)
expand county carrying capacity; Bridges (+1), Markets (+2), and Exchanges (+3) increase migration attraction; and
keeps, fortifications, barracks, archery grounds, foundries, and naval arsenals reinforce territorial defense and field forces.
Every copy is still subject to the county's development ceiling.

Great Temples and Cathedrals also add data-defined target-faith pressure to a county
faith-conversion project when its sponsor follows that target faith. They do not start a
project, convert anyone on completion, assist culture assimilation, or change the
county's political owner.

Buildings are **per-settlement**: each of a province's 2–8 settlement slots
(`FB.settlementsOf` — stable indices that grow with development and never conceal
a slot the player has invested in, presented from
the compiled authored/generated site records) may hold one copy of
each building. `state.buildings[pid]` holds
`{ s: settlementIndex, id, devGranted?, ruined? }` entries.
`FB.builtIn` is a read-only projection: it neither creates empty county arrays nor
rewrites old saves while a UI or derived calculation reads them. Bare ids from old saves
project into the head settlement (`s: 0`) and are persisted in canonical form on the next
construction or demolition in that county. Numeric-like legacy settlement indices receive
the same read-only integer projection and are canonicalized on the next write, keeping the
sheet's visible contents and construction occupancy in agreement. Tapping a settlement in
your own demesne (Land tab) or any settlement marker on the detailed map opens `UI.showSettlement`:
only the buildings standing in THAT settlement, with what each provides, plus any
household plots, manor, or enterprises in the same slot. County building and fortification
information appears only when the player is the tier-3+ landed holder of that county;
commoner and foreign sheets omit it entirely. Construction and demolition use that same
authority gate, so the commoner home-county fallback used for display and household scope
grants no view or control over county works. Because the commodity market belongs to the county,
only the county-head sheet (`s: 0`) carries its Market shortcut; the Land panel presents
the same county-wide destination as a card inside Development.

Building reads share one unsaved per-state, per-county index. The first read of a county
projects legacy records and aggregates standing/all-time counts, occupied settlement slots,
numeric bonuses, and non-fort production buildings; finance, population, markets, host
composition, automation, and the building ledger then reuse those results. Replacing a county
array or changing its length is detected at the read boundary. Same-length gameplay mutations
(demolition, raid ruin, and fort state changes) call `FB.invalidateBuildingIndex`, while player
and AI construction invalidate the affected county immediately. Construction enumeration also
reuses one county context, including its visible-settlement count, across every building and
slot check; county-picker availability counts do not calculate unused market price quotes. The
building floor supplied to that settlement projection already includes standing forts, so it
does not warm the separate fort index for the same county scan. The index is derived runtime
state only and never enters a save or changes RNG order.

**Bonuses stay demesne-wide; prices climb per county.** Ongoing bonuses flow through
`FB.buildingBonus` (tax, levy, piety, research, upkeep, and the war keys `retinue`/`archers`
— flat men added to the host's composition at muster, see [war.md](war.md)), which sums every
standing entry in the demesne — copies in different settlements stack. Each further copy of the
same building in the same county costs `cost × balance.buildingRepeatCostGrowth^(copies ever
raised)` (`FB.buildCost`); ruins remain in that count, so demolition cannot reset the repeat
price. County gates (`devMin`, `coastal`, `terrains`) are joined by data-driven `homeOnly`,
`maxCounty`, and `maxDemesne` limits. There may be only one Granary across the demesne and
ordinary buildings remain limited by their own definitions. Fortifications use the
separate county rule below.

Standing economic buildings also contribute to the existing settlement-population
weights. Player and AI construction, demolition, raid ruin, fort anchoring, and every
development change call `FB.reconcileSettlementCommunities` after invalidating their
derived building or settlement view. Counties without a materialized community matrix
keep the partition absent. Materialized counties preserve exact community columns and
exact settlement rows, so changing infrastructure cannot create or erase people.

The repeat-copy curve produces a stable real-gold base quote. Construction then applies
the definition's `marketBasket` against the target county's live market and rounds upward;
fortification tiers use a materials-heavy construction basket in the same way. Seasonal
building and fort upkeep remains a fixed agreement. Untagged mod buildings retain a
market multiplier of one.

Events still gate on `buildings` / `notBuildings` triggers demesne-wide (`FB.hasBuilding`).
`state.buildings` is keyed by province id, so conquest moves buildings and ruins with the
land.

Building roles. Every building declares a role, and engine code checks the role rather than a building id, so a period or regional building is a data entry with an existing role. The roles are fortification, milling, food_store, crossing, marketplace, worship, port, shipyard, scholarship, stronghold, garrison, training, civic, industry, care and banking (FB.BUILDING_ROLES in js/fortifications.js). Exactly one building has the fortification role and it alone sets fort; the strategic fortification system below creates and reads records of that building (walls in the shipped data). The food_store role unlocks the famine relief choice through the buildingRoles event requirement. Two further fields replace former id lists: aiBuildOrder ranks what AI rulers raise first in the annual construction pass (a building without it is never autobuilt), and settlementDraw marks the buildings that add weight to their settlement's share of county population growth (watermill, stone bridge, market square and harbor). These keep the previous behavior exactly. A legacy runtime-mod building without a role is treated as a fortification when it sets fort and as unassigned otherwise. Technology impact: none; this is an internal data refactor that changes no gameplay eligibility.

Opening infrastructure schema

A bookmark or complete world revision can declare openingInfrastructure with version 1 and up to 2048 placements by countyId, stable siteId, buildingId and standing/ruined condition. The canonical fort also needs its existing level. The declaration distinguishes omission (legacy policy) from an explicit empty inventory. Pure compilation resolves the effective world's normal ordered sites, never current map names, and returns no partial inventory on a fault. Initial inventories count ruins toward county, group, fort and per-holder limits. Direct and feudal holder strategies project their opening scopes without generating people; composed public, collective and mobile strategies inherit their direct scope.

Technology impact inherited_opening_infrastructure is none. Inherited works need not be reproducible under the holder's current knowledge, development or construction applicability. Stable physical identity and inventory limits still apply. This contract establishes no purchase, institutional power, free development or treasury transfer. The fresh initialization contract above installs only explicit inventories and records its policy; absent declarations and legacy markers preserve the ordinary fort migration. No historical works are authored by this shared capability. MODDING.md documents the exact fields, pure projection and ordinary JSON examples.

## Fortifications

The settlement-scoped `walls` id is the county's one strategic fortification rather than
an ordinary repeatable building. It is deliberately absent from Raise Next and autobuild:
the player opens an exact settlement sheet and raises the next tier there. The four
sequential tiers are Ringwork, Towered Stronghold, Stone Castle, and Concentric Fortress.
The fort card keeps its next tier, quote, duration, requirements and action visible;
siege calculations remain in Details. Every fort action carries the exact county and
settlement, and tooltip delegation handles only tooltip copies, so an inline action
cannot also trigger a capital fallback. Other settlements in a directly held county
link to the fort's physical site, including the county seat of legacy saves and ruins.
Fort reviews name the settlement and county and return to that site with its scroll,
expanded details and focus retained.
This is a navigation and presentation fix; the existing technology gates are unchanged.
They cost 120/220/400/750 gold up front, take 2/3/5/8 seasons, cost 2/4/8/14 gold each
season after completion, retain 40/80/140/220 men from the field levy, award
10/25/60/150 prestige once, and grant 5%/10%/15%/20% defense in that county.

The save record is `{s,id:'walls',level,targetLevel?,completeTurn?,maintenanceGraceUntil?,
ruined?}`. A new fort has level 0 until complete; an upgrade leaves the prior level active.
Projects are county assets: succession and conquest do not cancel them, capture transfers
the finished fort intact, and demolition destroys both active defenses and unfinished work
without refund. `FB.fortAt` and `FB.fortAtSettlement` use a cached county/site index;
`FB.fortificationDay` visits only its cached active-project list.

Each tier is a hard technology decision with a useful fallback. Ringworks gates the first
optional fort (`fort_construction`, fallback: no fort); Flanking Castle Towers gates tier 2
(`towered_stronghold_upgrade`, fallback: Ringwork); Stone Castles gates tier 3
(`stone_castle_upgrade`, fallback: Towered Stronghold); and Concentric Defenses plus
Advanced Gate Defenses gate tier 4 (`concentric_fortress_upgrade`, fallback: Stone Castle).
Existing tiers and projects remain usable if sovereignty or knowledge changes.

New worlds seed settlement 0 of every rank-2+ non-player capital with the highest tier
its sovereign technology supports. Compatibility repair does the same only for AI seats;
it never grants a player fort. Each living AI holder banks annual `fortWorks` equal to
directly held development, capped at 400; `fortWorksYear` makes that accrual idempotent,
and at most one project may start per year. The stable priority is capital, foreign
frontier, then higher development with county-id ties; costs are 60/120/220/400 works and
construction uses the same durations as player projects.
The planner is one annual realms-plus-counties pass. Legacy `walls` become level-3 Stone
Castles; player-held copies retain the old one-gold upkeep for four seasons before the
new eight-gold rate begins.

Library research is a national contribution: it enters the current sovereign's shared
research pool, which divides evenly among occupied project slots; unused points and
completion overflow remain reserve. Completed national technology may raise `FB.devCap`
above 10 and applies signed building-cost modifiers through `FB.techCostFactor`;
development and buildings themselves remain county state.

Buildings may declare `requiresTech`. The built-in mill, windmill, granary, bridge, market,
exchange, temple, cathedral, hospital, library, university, guildhall, harbor, arsenal, foundry, keep, barracks, and archery butts use graph entries as discrete
construction unlocks. The building picker and `FB.canBuildAt` enforce the requirement,
while existing buildings remain with their land after conquest even if the new sovereign
lacks the knowledge.

**Non-revenue buildings cost upkeep.** Granaries, Bridges, Temples, Libraries, and
Archery Butts cost 1 gold each season; Keeps and Hospitals cost 2; Barracks, Universities, and Cathedrals cost 3;
and Foundries and Arsenals cost 2–3 (reflecting maintenance of heavy workshops and permanent naval yards).
Mills, Windmills, Markets, Civic Guildhalls, and Merchant Exchanges generate net revenue and have no separate upkeep.
The seasonal charge applies only while the building stands in
the player's demesne and is itemized in `FB.incomeBreakdown`. Automation will not add an
upkeep-bearing building unless the current steady seasonal balance covers it.

Building income and upkeep feed the locale-neutral `FB.reliableGoldIncome` calculation used
for credit capacity. Buildings remain real land assets when the price index moves and are
never seized by an ordinary generic default; a landed revenue default assigns one quarter
of regular income instead.

**Family enterprises retain their physical site.** Purchase and acquisition APIs accept
an explicit province and settlement, which permits a normal household business to be
awarded at an auction venue or retained after a household move. Only a resident eligible
worker can staff it, so a remote or newly acquired enterprise is allowed to remain idle.
Enterprise definitions may carry simple `tags`; a worker's active career specialization
can apply its declared bonus only when one of those tags matches. The specialty remains
live career data rather than a copied property of the enterprise instance.

`FB.enterprisePurchaseStatus` is the authoritative, read-only purchase explanation. It
reports every current blocker (site occupancy, development, geography, national
technology, and money) plus the non-blocking warning that a purchase would stand idle.
`FB.enterpriseStaffingStatus` likewise distinguishes staffed property, property with a
worker available directly or through reassignment, remote property, missing vocational
workers, and missing guild rank. `FB.enterpriseAvailable` remains the compatibility
projection used by auctions and mods; acquisition revalidates the full status before it
spends coin. These status APIs do not change enterprise eligibility or auction
grandfathering.

Enterprise expansions are another county-development input, but not another source of
gold. Authored upgrade effects apply only while every required staffing position is
operational. Population capacity, famine and crisis protection, and migration attraction
feed the same county demographic calculations as technology and buildings. Levy and
men-at-arms support enter the player's directly held county composition, while retainer
capacity and prestige remain household effects. An authored `dev` grant is applied once,
on the first fully staffed seasonal boundary after that level is built, and is remembered
by the enterprise instance rather than recalculated from the definition.

A tier-3+ ruler can demolish a settlement building in the demesne without a refund.
Demolition leaves repairable ruins: the entry gains ruined:true, loses every ongoing bonus and upkeep charge, and continues to occupy that settlement slot. New construction records the
exact applied `dev` amount as
`devGranted`, including zero when the county was already at its ceiling. Demolition reverses
only that recorded development. After the bounded legacy repair below, any building record
still missing the additive field is grandfathered at zero rather than inventing a loss.
One-time Popular support and prestige are not reversed.

Settlement ruin repair

The directly controlling Baron-or-higher player can repair an ordinary building from its settlement card. County forts require direct county authority. Repair reuses the ruined record, costs half the current replacement quote (excluding that record from the repeat-copy exponent), rechecks authority, funds and standing-copy limits, and does not repeat construction prestige or Popular support. Existing building and fort-tier technology is grandfathered for repair; recovery does not unlock a new asset or tier. Technology review settlement_ruin_repair is none because this is restoration of an existing asset.

Ordinary repairs restore benefits and upkeep immediately. New demolition records devRemoved as the actual development removed and clears devGranted; repair restores only that recorded loss under the live county ceiling and retains the actual restored amount as devGranted. Raid ruins do not replay their already credited development. Older ruins without devRemoved restore their ongoing effects without inventing a development grant. Ruins remain occupied while unrepaired, but no longer permanently prevent restoration.

Fort demolition retains its completed tier in ruinedLevel. Paid repairs take that tier's normal construction duration, with level zero and no defenses until completion. repairing marks the saved project so completion never repeats its prestige award. A previously ruined record with no retained tier restores its remaining positive level, or Ringwork if no tier survives. Repairs cannot start in a contested county or coexist with another active county fort. Succession, conquest and save/restore retain funded repairs and their target tier. Starting an unrelated new fort still follows ordinary sequential technology gates.

Related: [tech.md](tech.md) for the development cap (`FB.devCap`), [war.md](war.md) for
fort movement, battles, and sieges.

**Initial development belongs to the bookmark.** On a new campaign,
`state.dev[provinceId]` is copied from the active bookmark's county definition. Thus
the 867 and 1066 snapshots can value the same enduring county differently without
pre-building holdings, granting technologies, or changing the building rules.
After initialization, development lives only in state and advances normally.

**Development is condition-driven for player and AI alike.** Direct player counties develop
through explicit construction deeds, demographic growth, and military damage. AI realms and
vassals evaluate their held counties annually (`FB.aiBuildingsYear`), constructing tangible
settlement buildings (Watermills, Market Squares, Harbors, Stone Bridges, Granaries, Temples,
Libraries) during peacetime based on sovereign technology, geography, and priorities. Buildings
grant permanent development, unlock and promote settlements, expand carrying capacity, and
persist in `state.buildings` across conquest. Unfinished sieges or contested borders block new
construction.
The annual builder snapshots every living AI realm's direct holdings before placing the first
building. With active treasuries, it also takes one shared fiscal/host reserve snapshot,
skips realms without optional funds, and chooses the first affordable eligible building.
`FB.buildCost(state, pid, id, realmId)` uses the AI realm's technology, county modifiers,
repeat-copy growth (including ruins), and market basket; player council and mason-visit
discounts do not apply to AI. The existing three-argument player quote is unchanged.
Construction debits once immediately before insertion and protects the new upkeep.
Fort works retain their separate policy. Technology impact remains `none` for treasury
accounting, with all existing building unlocks preserved.
Development grants may invalidate realm strength caches, but they cannot change county
ownership during this pass; reusing the snapshot prevents each grant from forcing the next realm
to rebuild the holdings index from the complete map.

Every visible settlement slot (`FB.settlementsOf`) contributes to the county's fiscal output
(Villages 0.75g, Towns 2.0g, Cities 4.5g per season), scaled by the sovereign's demographic
factor (`FB.countyPopulationFactor`). Thus, county land rents naturally scale with urban growth,
development, population, and infrastructure.

The `settlement_dynamic_rents` technology-impact decision is soft: baseline settlement rents
always function, while agriculture, infrastructure, markets, Standardized Coinage, Regular Tax
Assessment, Exchequer Accounts, and Scutage improve the systems that feed population, settlement
value, and realm taxation.

`FB.changeCountyDevelopment` is the shared clamp and feedback boundary. Positive change
stops at the current technology-lifted ceiling; a loss removes only its stated amount,
even when conquest has lowered the county's current ceiling. Construction saves the
amount actually applied, which prevents a building raised at the ceiling from causing a
later phantom loss.

Every completed military capture costs the county one development. Ordinary player and
AI conquests apply the loss once when control changes; a great holy-war occupation or
recapture applies it once when the occupation flips. A successful restoration or
religious-office objective siege damages its besieged target even when its settlement
absorbs broader territory or transfers no land. An army merely entering a county, an
unfinished or abandoned siege, and peaceful transfer paths such as inheritance, grants,
submission, ransom cession, and scripted history cause no development loss. Relevant
player declines post a cause-specific Chronicle entry. Settlement reveals still scale with
development ([provinces.md](provinces.md)); anchored slots - a standing building, family
enterprise, fort, or the player's home settlement - stay visible regardless.

Older saves cannot identify which individual changes came from the former random drift.
On their first load after this rule change, every county currently listed in `player.provs`
is therefore rebuilt deterministically as its bookmark development plus the `dev` effects
of its standing buildings, using the current county ceiling. Ruins do not contribute.
The same pass records the amount each legacy development building actually supplied, so
later demolition reverses it exactly. AI-held counties are not recalculated. New games and
migrated saves carry `player.developmentBaselineMigration:1`, making this repair one-time;
later event, construction, demolition, and military changes remain saved normally.

County modifiers are applied at their local boundaries. `levy` adjusts the county's base
levy before technology, Martial, and domain changes and appears as a named composition
ledger row. `buildingCost` multiplies the final construction quote in the selected county.
The catalog and stacking rules are in [modifiers.md](modifiers.md).

Settlement sheets also expose **People here**, a projection of the county’s bounded named
households at that exact site. It is not a building benefit and does not scale with
development. Worship and hospitality venue labels may acknowledge the settlement kind
or an existing religious building, but buildings and technology do not gate ordinary
local meetings.


AI building purchases now protect ten seasons of government, existing upkeep and liege
dues (with a 50%-of-receipts seasonal floor), plus two seasons of active military costs
and initial food loading. Every new building also reserves ten seasons of its own
upkeep. Existing construction limits, priorities and technology gates remain; annual
public distributions run only after construction. Player automation reads government
expenses through reliable net income but does not enforce the AI savings target.


Annual construction and public distributions can share the full treasury snapshot
when the construction pass buys nothing. The snapshot is created after annual
population, succession and ruler agency. Any successful ordinary-building purchase
clears the handoff before changing buildings/development; public distributions then
rebuild their snapshot, preserving post-construction income, upkeep and reserve rules.
The handoff is local to worldTick, never persisted or shared with seasonal accounting.
Military construction reserves are still read again for the distribution pass.
Profiler counters distinguish annual unchanged-snapshot reuse from a fresh
post-construction snapshot. This is a read-reuse optimization, with no research gate
or change to spending eligibility, building choices, simulation order or RNG.


County-ruler founding: Counts and higher may use Found a settlement in Deeds and
choose a directly ruled county. Sovereign ownership alone does not authorize
founding in a vassal's county. Existing costs, duration, one-household-project limit,
capacity and conserved-population requirements apply. These projects save additive
`rulerFounded: true`; completion requires retained direct county control but not
household residence there. Completion adds an undelegated direct holding without
changing rank or the household seat. Lost control pauses completion, retaining the
funded project. Legacy/Gentry charters keep their existing hereditary-seat behavior.
The review names direct-holding benefits, no baronial dues, and capacity consequences;
its county selector uses native keyboard/mobile controls and the existing modal
history. The settlement_founding technology review remains none, expanded to cover
ordinary county-ruler founding; administrative capacity retains its soft role.


Water-conditioned operation

Optional newly constructed waterOperation assets derive their one ongoing existing-field benefit from a funded, conserved use receipt. Empty storage, unfunded work, changed authority, ruin and expired terms grant none. Store-only service preserves actual water without a scalar. One demand at an actual site cannot multiply the same service across conveyance, storage and competing facilities. The shared building index and all fiscal, demographic, piety, research and settlement presentations read the same projection. Upkeep is paid once within the finite service charge; unbound buildings keep their exact normal effects and seasonal upkeep. Repairs retain the original asset without producing water or replaying payment. water_operational_service has technology impact none; optional facility technology gates remain separate. The complete ordinary JSON authoring and strict optional receipt contract is in docs/designs/building-operations.md.

Building Works cards use bold names with regular-weight supporting text at the
shared label size. Price, county availability and next settlement/requirements
occupy separate lines; unavailable rows use the same upright typography, not
italics. Effects remain regular-weight with consistent spacing. Cards have a
visible gap, and the existing detail tooltip retains the full mechanical audit.

Building Works always shows the current quoted construction price, including
technology-locked buildings and buildings with no free eligible slot. Requirements
and capacity remain visible alongside the price; Raise stays disabled.

## Political query invalidation (476 Phase 1)

Settlement lordship changes evict the existing world, holder and county building
indices immediately. The world invalidator advances militaryInputRevision once;
the immediately following building-index invalidation receives
militaryAlreadyInvalidated=true to avoid a second notification. Standalone
construction/demolition invalidations retain their own military notification.
No read may intervene between that notification and the building eviction.

Finite material production

Optional productionSites bind actual nonfort buildings to finite input/output recipes without adding a building-effect channel. Construction, standing and upkeep retain their existing owners; a batch creates only its declared conserved goods after real paid work. Capture, ruin, replacement or lost original permission suspends completion while property remains. Explicit fictional opening lots require a real standing openingInfrastructure placement. No bundled inventory is added. See docs/designs/production.md for transactions, work, account boundaries, saves and supported authoring limits.

Selected construction profiles

Optional buildingProfiles replace supported construction scalars on one existing base building. Shared occupancy, group and repeat-price counts include profiled/default assets and ruins together. The selected transaction uses the normal payer and reserve checks, awards only replacement development/opinion/prestige, and preserves an explicit version-1 identity without changing old unprofiled records. Strategic profiles retain canonical fort tier values and their identity through funded completion. The schema, quote/commit, exact site and institution requirements, independent ordinary imports and current consumer boundaries are in docs/designs/building-profiles.md.

Inherited profile consumers

Explicit inherited profile policy and placements use the same base asset, limits and construction groups. Initialization grants no construction development or supplies. Repairs use the retained profile invoice and only restore actual removed development, without new-construction technology or date checks. Current fiscal, demographic, research, piety and military projections all read replacement amounts, and their explanations sum actual active amounts per profile. Automatic realm/baron and player builders consider eligible selected definitions through the canonical payer transactions and reserves. Legacy development reconstruction leaves explicit inventories and selected-profile campaigns intact. See docs/designs/building-profiles.md for exact policy and save fields.

Maintained boat-work facilities

An explicitly declared standing production facility can support a co-located licensed maritime-work assignment without a new building effect or historical inventory. Its completed owned paid output contributes only to an actual household enterprise invoice through the canonical enterprise owner. The facility itself supplies no income, fleet, military capacity or enterprise. At most ten percent of the live invoice is substituted, with ordinary technology, staffing, remaining payment and current launching rights retained. There is no bundled boathouse content or installation in this shared capability. See docs/designs/maritime-work.md for the none technology review and exact consumer.

Fort material identity

Typed fortProfiles compose existing strategic building profiles, inherited inventory and sequential projects without replacing canonical defense, garrison, upkeep, duration, costs, work or prestige. They add no development, population, materials, passive bonus or second strongpoint. Exact eligibility, annual AI, repair and restore contracts: docs/designs/fort-profiles.md.

Engineered conveyance and storage

Maintained Aqueduct, Qanat Works and Maintained Urban Cisterns are optional paid civic assets, each limited to one per county. Their cost/upkeep/devMin/AI order are 90/2/4/23, 65/1/2/24 and 65/1/4/25. All have settlementDraw:false and zero construction development, population and prestige. Aqueduct construction is scoped to years 476-649, the late_antique campaign era and the paying sovereign's Latin or Byzantine traditions; qanats use years 476-1300 and Persianate or Islamic traditions; cisterns use years 476-1300. These bounds constrain new investment, while actual inherited assets and ordinary repairs survive.

Optional new engineered conveyance, groundwater works and storage each have a hard technology review. Ordinary wells, carriage, channels, domestic collection and inherited repair remain available. Aqueduct and qanat capacity is 0.03 only during actual paid finite delivery; cistern famine protection is 0.05 only during committed stored-water service. All require a declared lawful flow and connected storage at the actual destination, qanats additionally require groundwater and gradient, and aqueducts require gradient. A catchment-fed cistern needs no aqueduct. A shared actual capacity demand can activate only one alternative conveyance benefit, and independently funded stored-water service spends separate real water. Construction grants no water, stock, people or passive national bonus. Current player, baron and realm builders share the same resource/work/reserve gates.

The bundled operation terms use two dimensionless water units per at-most-30-day service, work prices 2/2/1 plus upkeep prorated over actual funded days. These are simulation prices, not physical yields or historical labor estimates. The existing operation receipt is the sole effect owner; capture, contested land, lost permission, dry sources, ruin and expiry suspend it without deleting property or refunding water. No historical intake, catchment, installation or opening stock is supplied. Exact evidence and ordinary import examples: docs/research/engineered-waterworks.md.

Horizontal milling

The optional horizontal_mill construction profile replaces one mill asset with cost 30, upkeep 0, devMin 1, tax 1 and populationCapacity 0.03; development, population and prestige construction awards are zero. Public annual AI considers this alternative at priority 18. Its inclusive construction window is 476 through 1300, including eligible 867 and 1066 sites without an ethnic restriction. The reviewed alternative requires water_power rather than the base undershot machine technology. Existing unprofiled mills retain their exact cost, technology, development and ongoing benefits.

A new horizontal mill needs an actual lawful available horizontal_mill_head flow at its exact site, with source and gradient declared true. No county terrain substitutes for this physical declaration. One canonical horizontal_mill_service allocation consumes one water unit per seven-day policy period and costs one gold for work. Tax 1 and capacity 0.03 are replacement amounts jointly supplied by this one funded service, never added to the base mill. Ruin, missing rights, incompatible site, custody or expiry suppress both benefits. The four-unit local flow capacity and service rates are bounded simulation parameters, not historical yields or measured mechanical power. Maintenance remains zero and the operating work payment remains real.

Inherited standing or ruined profiled assets retain zero construction awards and their strict original identity. Repair uses the selected half-price invoice without a discovery, calendar check, water allocation or service renewal. Hand and animal grinding remain the ungated fallback. No historical source, opening machine, horizontal_watermill technology or eastern windmill is installed. The independent regional-milling-river.json and regional-milling-catchment.json ordinary Mods examples contrast flow with gradient against paid stored-rainwater discharge, different prices and revocable source permission.

Fish drying stations

data/buildings_fish_drying.js adds the paid coastal food store at cost 30, upkeep 1, development minimum 1 and one per county, without construction awards or a technology requirement. New construction is limited to 850-1300 and Nordic learning contexts, with an exact declared fish_drying_cool seasonal production site. This is a simulation permission and supplies no historical installation. Unbound, warm, empty, sold or spoiled assets give zero new protection. One conserved dried lot allocated locally gives 0.03 famine protection until its term or lifetime ends. Property and ordinary upkeep persist through inactivity. The independently gateable baseline_fish_drying technology review is none, preserving ordinary household fishing and preservation.

Early religious facilities

data/buildings_early_worship.js adds Monastic House as one worship building, cost 60, upkeep 1, devMin 2, maxCounty 1, AI priority 28 and piety 1. New construction is available inclusively from 476 through 1300 only at a compatible existing monastery with actually endowed canonical abbey property, its matching patron and a lawful direct settlement builder. No technology is required. All three worship policies opt into requiresBinding:true. Unbound physical works stay dormant until explicit current permission, including through endowment and matching restore; this preserves ordinary legacy unbound assets. The house, members, property and restricted accounts remain with their existing owners; physical works create no monks, office, rent, research or construction award. building_monastic_house records technology impact none because funded premises and permission require no discovery.

Episcopal Complex and Congregational Mosque are replacement profiles of temple, with cost/upkeep/devMin/piety/AI priority 100/2/4/1/27 and 90/2/4/2/27. Every other supported benefit or construction award is zero. Episcopal construction uses 476-1300 and an existing see or patriarchate with its actual available incumbent. Congregational construction uses 650-1300 and the paying sovereign's Islamic learning tradition, independently requiring a real existing congregation at the exact site. Ruler faith and culture do not create that congregation. Both use an authorized seat foundation, direct settlement authority and the exact builder as maintenance payer. Neither creates another building id or adds base temple population, protection or faith pressure to its replacement piety.

building_episcopal_complex and building_congregational_mosque each record hard lime_mortar for optional masonry works. Ordinary worship and modest institutional premises remain available without that investment. Retained assets and selected-invoice repairs preserve their identity after knowledge or construction-window changes. Original unbound temple and cathedral records retain all existing values and are never converted. One foundation and its ruins exclude alternative bound or unbound worship works across holder changes; distinct actual sites and properties can coexist. Benefits and maintenance suspend together on lost permission, recalled/dead incumbents or changed patrons. No person, successor, conversion or research is granted. Exact institutional and selected-profile contracts remain in docs/designs/building-institutions.md and docs/designs/building-profiles.md.

The two complete ordinary early-worship-river.json and early-worship-upland.json imports contrast separate see/congregation seats and a headless endowed house, different geography, actual office references and paid property foundations. They install no historical facility. Values and date windows are simulation choices; historical site, foundation and opening inventories still need their own accepted evidence.

Masonry circuit works

The optional urban_circuit walls profile represents sequential canonical level-1 and level-2 masonry work, with no replacement numeric fields or extra strategic record. New works require masonry_circuits, late_antique campaign era, inclusive 476-649, current direct authority, lawful available site and the ordinary paid player or annual AI work budget. Default fort progression is unchanged. masonry_circuit_construction is hard for optional new masonry; ordinary forts, timber defenses and inherited repair remain available. Later repairs retain the actual supported level, half-price invoice and profile without construction awards or a renewed discovery/date gate. No resource stock or historical inventory is inferred. Exact values and independent ordinary imported alternatives are in docs/designs/fort-profiles.md.

Baths and downstream headworks

data/buildings_baths_headworks.js adds public_bath and diversion_headworks and one hypocaust_bath profile. Public Bath costs 65 gold, upkeep 2 per season, devMin 4, maxCounty 1 and AI order 26. Only funded unheated water service gives migrationAttraction 0.5. Heated Public Bath replaces cost with 80 and attraction with 1 on that same asset, retaining upkeep 2 and devMin 4. It additionally requires hypocaust_heating and consumes one real heating_fuel bundle per service. Neither form supplies health, crisis/famine protection, institutional identity, tax or construction awards. The bath stays outside care_foundation because it supplies bathing rather than charitable accommodation.

Diversion Headworks costs 75, upkeep 2, devMin 2, maxCounty 1 and AI order 29. Its sole effect is populationCapacity 0.02 from a paid actual river allocation with source/river/gradient suitability, at least one connected store and an exact downstream receiver. The ordinary demand owner prevents an aqueduct, qanat or headworks chain counting the same site/effect demand twice. Distinct actual demand consumes distinct water. No source id or terrain proxy grants service. Both facilities construct only during 476-1300 inclusive; headworks additionally requires Islamic, Persianate or Byzantine sovereign traditions. The bath has no tradition restriction. These are permission scopes, not dates of destruction. Ordinary inherited repair and current paid operation survive ended construction windows or lost construction knowledge.

Each service consumes two water units, pays workCost 2 plus actual seasonal upkeep prorated over at most 30 days, and rechecks ordinary property, local residents, route rights, source capacity, current payer and public/private reserves. Heated service additionally consumes existing canonical local production lots once. data/production.js declares the typed heating_fuel good, with no producer, recipe, opening lot, stock bridge or historical inventory. Real producers and supply routes remain ordinary declarations. Funded service survives depletion of its already consumed inputs only for its prepaid finite term; later service needs new inputs. Authority interruption or ruin suspends only the benefit and retains property and spent receipts. The technology decisions and modest-premises fallbacks are documented in docs/designs/tech.md. The complete independent baths-headworks-river.json and baths-headworks-upland.json ordinary imports vary source periods/capacity, sovereign tradition, feedstock and actual paid fuel work. No shipped world gains a source or building.

Paper and bloomery plants

data/buildings_early_industry.js adds two maintained industry assets without passive tax, research, soldiers, equipment, development or population awards. Paper Workshop costs 65 with seasonal upkeep 1, development 4, county limit 1, construction from 800 in baghdad and paper_making; AI priority is 30. Bloomery and Smithy costs 35 with upkeep 1, development 1, county limit 1, inclusive construction 650-1300 and bloomery_iron; AI priority is 31. Both omit settlement art and share the finite production construction gate. Actual sites, available lawful materials, work, water where required and funded buyers remain independent of national knowledge. Existing property and repairs survive construction-date expiry.

Only explicit ordinary imported worlds supply facilities and stocks. The independent early-industry-paper.json uses an owned fiber depot and actual water source at a Baghdad-scope plant; early-industry-metal.json buys ore, iron and fuel across an accessible local market. Both include a new_works revision that constructs an empty plant through the canonical payer and reserve owner. No named historical plant, supplier, mine or opening material is inferred. See docs/designs/production.md for finite work and stock, and docs/research/early-industry.md for numerical choices and boundaries.
