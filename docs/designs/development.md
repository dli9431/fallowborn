# Development & buildings

**Development is buildings.** Tier-3+ rulers raise named buildings (`FBDATA.buildings` in
map_data.js) via the build deed — `FB.build`/`FB.buildable` in actions.js, picker in ui.js
(`UI.showBuildings`: province → settlement → what that settlement can still raise).
Buildings are **per-settlement**: each of a province's 2–4 derived settlements
(`FB.settlementsOf` — stable indices that only grow with development) may hold one copy of
each building. `state.buildings[pid]` holds `{ s: settlementIndex, id }` entries; old saves
with bare id strings migrate lazily in `FB.builtIn` into the head settlement (`s: 0`).
Tapping a settlement in your own demesne (Land tab) opens `UI.showSettlement`: only the
buildings standing in THAT settlement, with what each provides, plus a raise button.

**Bonuses stay demesne-wide; prices climb per county.** Ongoing bonuses flow through
`FB.buildingBonus` (tax, levy, piety), which sums every entry in the demesne — copies in
different settlements stack. To soften the multiplier, each further copy of the same
building in the same county costs `cost × balance.buildingRepeatCostGrowth^(copies
standing)` (`FB.buildCost`). County gates (`devMin`, `coastal`, `terrains`) are unchanged.
Walls are the exception to demesne-wide reading: they strengthen defense in `war_battle`
only when they stand in the home county (`FB.hasBuildingIn`), guarding where they stand.
Events still gate on `buildings` / `notBuildings` triggers demesne-wide (`FB.hasBuilding`).
`state.buildings` is keyed by province id, so conquest moves them with the land.

Related: [tech.md](tech.md) for the development cap (`FB.devCap`), [war.md](war.md) for
walls in battle.
