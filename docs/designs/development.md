# Development & buildings

**Development is buildings.** Tier-3+ rulers raise named buildings (`FBDATA.buildings` in
map_data.js) via the build deed — `FB.build`/`FB.buildable` in actions.js, picker in ui.js.
After choosing a province when necessary, `UI.showBuildings` presents a persistent
building-first county ledger. **Raise Next** places the work in the next open settlement,
keeps the ledger open, and refreshes the exact next price; the ledger warns that each
further county copy costs 50% more. The Land-tab settlement path remains the exact-placement
route.

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

**Non-revenue buildings cost upkeep.** Granaries, Bridges, Walls, Temples, and Libraries
cost 1 gold each season; Keeps cost 2. Mills, Markets, and Harbors directly fund themselves
and have no separate upkeep. The seasonal charge applies only while the building stands in
the player's demesne and is itemized in `FB.incomeBreakdown`. Automation will not add an
upkeep-bearing building unless the current steady seasonal balance covers it.

A settlement building can be demolished without a refund. Demolition is permanent: the
entry gains `ruined:true`, loses every ongoing bonus and upkeep charge, and continues to
occupy that settlement slot. One-time development, opinion, and prestige already granted
when it was raised are not reversed.

Related: [tech.md](tech.md) for the development cap (`FB.devCap`), [war.md](war.md) for
walls in battle.
