# Development & buildings

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
each add one settlement, 4 promotes the head village to a town, 6 promotes the second
settlement to a town, and 7 promotes the head settlement to a city. Authored settlement baselines
(`data/settlements.js`) floor a slot's kind and an authored list can make a slot
visible early; thresholds already satisfied that way are skipped rather than promised.
The UI displays the next threshold and explicitly compares current state with the
bookmark value so historical starting advantage is not described as growth achieved
during play.

**Development is buildings.** Tier-3+ rulers raise named buildings (`FBDATA.buildings` in
map_data.js) via the build deed — `FB.build`/`FB.buildable` in actions.js, picker in ui.js.
After choosing a province when necessary, `UI.showBuildings` presents a persistent
building-first county ledger. A sticky native county selector remains visible while the
ledger scrolls, so touch and keyboard players can move directly between every held county.
**Raise Next** places the work in the next open settlement, keeps the ledger open, and
refreshes the exact next price; the ledger warns that each further county copy costs 50%
more. Each directly held county can also be placed in the `autoBuildCounty` protection
scope from Governance or its building ledger. `FB.autoBuild` omits protected counties
without changing the global automation setting; manual **Raise Next** and exact settlement
construction remain available. The Land-tab settlement path remains the exact-placement
route.

Build choices and standing settlement buildings use the shared asset/effect row.
It identifies the county owner and exact settlement scope, separates the live
construction quote from seasonal upkeep, lists all effects, states that the
building follows conquest, and names demolition/ruin as its end condition.
Ruins use the same row with no benefit or upkeep.
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

Buildings are **per-settlement**: each of a province's 2–8 settlement slots
(`FB.settlementsOf` — stable indices that grow with development and never conceal
a slot the player has invested in, presented from
the compiled authored/generated site records) may hold one copy of
each building. `state.buildings[pid]` holds
`{ s: settlementIndex, id, devGranted?, ruined? }` entries.
`FB.builtIn` is a read-only projection: it neither creates empty county arrays nor
rewrites old saves while a UI or derived calculation reads them. Bare ids from old saves
project into the head settlement (`s: 0`) and are persisted in canonical form on the next
construction or demolition in that county. Tapping a settlement in your own demesne
(Land tab) or any settlement marker on the detailed map opens `UI.showSettlement`:
only the buildings standing in THAT settlement, with what each provides, plus any
household plots, manor, or enterprises in the same slot. Authorization lives inside the
sheet — a foreign or non-demesne settlement is read-only, and the raise button keeps
the demesne/tier/buildable gates. Because the commodity market belongs to the county,
only the county-head sheet (`s: 0`) carries its Market shortcut; the Land panel presents
the same county-wide destination as a card inside Development.

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

A settlement building can be demolished without a refund. Demolition is permanent: the
entry gains `ruined:true`, loses every ongoing bonus and upkeep charge, and continues to
occupy that settlement slot. New construction records the exact applied `dev` amount as
`devGranted`, including zero when the county was already at its ceiling. Demolition reverses
only that recorded development. After the bounded legacy repair below, any building record
still missing the additive field is grandfathered at zero rather than inventing a loss.
One-time Common Voice and prestige are not reversed.

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
