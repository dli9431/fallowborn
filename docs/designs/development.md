# Development & buildings

## Settlements and development

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

Buildings are **per-settlement**: each of a province's 2–8 settlement slots
(`FB.settlementsOf` — stable indices that only grow with development, presented from
the compiled authored/generated site records) may hold one copy of
each building. `state.buildings[pid]` holds `{ s: settlementIndex, id, ruined? }` entries.
`FB.builtIn` is a read-only projection: it neither creates empty county arrays nor
rewrites old saves while a UI or derived calculation reads them. Bare ids from old saves
project into the head settlement (`s: 0`) and are persisted in canonical form on the next
construction or demolition in that county. Tapping a settlement in your own demesne
(Land tab) or any settlement marker on the detailed map opens `UI.showSettlement`:
only the buildings standing in THAT settlement, with what each provides, plus any
household plots, manor, or enterprises in the same slot. Authorization lives inside the
sheet — a foreign or non-demesne settlement is read-only, and the raise button keeps
the demesne/tier/buildable gates.

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
occupy that settlement slot. One-time development, Common Voice, and prestige already granted
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
