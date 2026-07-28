# Development & buildings

Starting development is an ordinal measure of a whole county's productive,
fiscal, and manpower capacity in 867, not a city-population estimate or a
ranking of later fame. The 1–10 scale reads: 1–2 sparse frontier; 3 ordinary
established county; 4 productive or significant center; 5–6 major regional
center; 7–9 exceptional metropolis or irrigated core; and 10 world-leading
center. The authored `dev` in `FBDATA.provinces` initializes `state.dev` only
for a fresh game. Loaded saves keep their stored `state.dev` values, including
development gained or lost during play.

The Land tab labels this county value **Economic development** and shows the
effective sovereign's separate 0–10 **Technological development** rating beside
it. The technology rating is informational; it does not replace county
development or change development-driven calculations.

**Development is buildings.** Tier-3+ rulers raise named buildings (`FBDATA.buildings` in
map_data.js) via the build deed — `FB.build`/`FB.buildable` in actions.js, picker in ui.js.
After choosing a province when necessary, `UI.showBuildings` presents a persistent
building-first county ledger. **Raise Next** places the work in the next open settlement,
keeps the ledger open, and refreshes the exact next price; the ledger warns that each
further county copy costs 50% more. The Land-tab settlement path remains the exact-placement
route.

Build choices and standing settlement buildings use the shared asset/effect row.
It identifies the county owner and exact settlement scope, separates the live
construction quote from seasonal upkeep, lists all effects, states that the
building follows conquest, and names demolition/ruin as its end condition.
Ruins use the same row with no benefit or upkeep.

Buildings are **per-settlement**: each of a province's 2–4 derived settlements
(`FB.settlementsOf` — stable indices that only grow with development) may hold one copy of
each building. `state.buildings[pid]` holds `{ s: settlementIndex, id, ruined? }` entries;
old saves with bare id strings migrate lazily in `FB.builtIn` into the head settlement
(`s: 0`). Tapping a settlement in your own demesne (Land tab) opens `UI.showSettlement`:
only the buildings standing in THAT settlement, with what each provides, plus a raise
button.

**Bonuses stay demesne-wide; prices climb per county.** Ongoing bonuses flow through
`FB.buildingBonus` (tax, levy, piety, research, upkeep, and the war keys `retinue`/`archers`
— flat men added to the host's composition at muster, see [war.md](war.md)), which sums every
standing entry in the demesne — copies in different settlements stack. Each further copy of the
same building in the same county costs `cost × balance.buildingRepeatCostGrowth^(copies ever
raised)` (`FB.buildCost`); ruins remain in that count, so demolition cannot reset the repeat
price. County gates (`devMin`, `coastal`, `terrains`) are joined by data-driven `homeOnly`,
`maxCounty`, and `maxDemesne` limits. There may be only one Granary across the demesne and
one set of Stone Walls in the home county. Walls strengthen defense in `war_battle`
through `FB.hasBuildingIn`.

Events still gate on `buildings` / `notBuildings` triggers demesne-wide (`FB.hasBuilding`).
`state.buildings` is keyed by province id, so conquest moves buildings and ruins with the
land.

Library research is a national contribution: it enters the current sovereign's shared
research pool, which divides evenly among occupied project slots; unused points and
completion overflow remain reserve. Completed national technology may raise `FB.devCap`
above 10 and applies signed building-cost modifiers through `FB.techCostFactor`;
development and buildings themselves remain county state.

Buildings may declare `requiresTech`. The built-in mill, granary, bridge, walls, market,
temple, harbor, library, keep, barracks, and archery butts use graph entries as discrete
construction unlocks. The building picker and `FB.canBuildAt` enforce the requirement,
while existing buildings remain with their land after conquest even if the new sovereign
lacks the knowledge.

**Non-revenue buildings cost upkeep.** Granaries, Bridges, Walls, Temples, Libraries, and
Archery Butts cost 1 gold each season; Keeps cost 2 and Barracks 3 (a barracks’ paid
men-at-arms are the dearest of all to keep). Mills, Markets, and Harbors directly fund themselves
and have no separate upkeep. The seasonal charge applies only while the building stands in
the player's demesne and is itemized in `FB.incomeBreakdown`. Automation will not add an
upkeep-bearing building unless the current steady seasonal balance covers it.

Building income and upkeep feed the locale-neutral `FB.reliableGoldIncome` calculation used
for credit capacity. Buildings remain real land assets when the price index moves and are
never seized by an ordinary generic default; a landed revenue default assigns one quarter
of regular income instead.

A settlement building can be demolished without a refund. Demolition is permanent: the
entry gains `ruined:true`, loses every ongoing bonus and upkeep charge, and continues to
occupy that settlement slot. One-time development, opinion, and prestige already granted
when it was raised are not reversed.

Related: [tech.md](tech.md) for the development cap (`FB.devCap`), [war.md](war.md) for
walls in battle.

**Initial development belongs to the bookmark.** On a new campaign,
`state.dev[provinceId]` is copied from the active bookmark's county definition. Thus
the 867 and 1066 snapshots can value the same enduring county differently without
pre-building holdings, granting technologies, or changing the building rules.
After initialization, development lives only in state and advances normally.

County modifiers are applied at their local boundaries. `levy` adjusts the county's base
levy before technology, Martial, and domain changes and appears as a named composition
ledger row. `buildingCost` multiplies the final construction quote in the selected county.
The catalog and stacking rules are in [modifiers.md](modifiers.md).
