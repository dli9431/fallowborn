# Development & buildings

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

The Deeds building summary retains its compact icon grid with one row per directly held settlement, including empty
holdings. Each row opens its exact settlement; building counts remain local to it. Its holding count reads "Settlements"; the cap
still counts only directly held settlements. Settlement sheets describe a player
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
Watermills, Post Windmills, Stone Bridges, Market Squares, Harbors, Cathedrals, Civic Guildhalls,
Naval Arsenals, and Merchant Exchanges each supply +1 development. Granaries provide resilience and famine
protection instead (+35% famine protection); Libraries (+1) and Universities (+2) contribute national research;
Great Temples (+10%) and Cathedrals (+15%) provide religious prestige and crisis protection; Endowed Hospitals
mitigate epidemics (+10% crisis protection, +5% famine protection); Watermills (+5%), Post Windmills (+5%), and Harbors (+3%)
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

## Fortifications

The settlement-scoped `walls` id is the county's one strategic fortification rather than
an ordinary repeatable building. It is deliberately absent from Raise Next and autobuild:
the player opens an exact settlement sheet and raises the next tier there. The four
sequential tiers are Ringwork, Towered Stronghold, Stone Castle, and Concentric Fortress.
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
Demolition is permanent: the entry gains `ruined:true`, loses every ongoing bonus and
upkeep charge, and continues to occupy that settlement slot. New construction records the
exact applied `dev` amount as
`devGranted`, including zero when the county was already at its ceiling. Demolition reverses
only that recorded development. After the bounded legacy repair below, any building record
still missing the additive field is grandfathered at zero rather than inventing a loss.
One-time Popular support and prestige are not reversed.

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


Building Works cards use bold names with regular-weight supporting text at the
shared label size. Price, county availability and next settlement/requirements
occupy separate lines; unavailable rows use the same upright typography, not
italics. Effects remain regular-weight with consistent spacing. Cards have a
visible gap, and the existing detail tooltip retains the full mechanical audit.

Building Works always shows the current quoted construction price, including
technology-locked buildings and buildings with no free eligible slot. Requirements
and capacity remain visible alongside the price; Raise stays disabled.
