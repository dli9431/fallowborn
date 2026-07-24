# Development & buildings

**Development is buildings.** Tier-3+ rulers raise named buildings (`FBDATA.buildings` in
map_data.js, one of each per province) via the build deed — `FB.build`/`FB.buildable` in
actions.js, picker in ui.js (`UI.showBuildings`). Tapping a settlement in your own demesne
(Land tab) opens `UI.showSettlement`: the buildings standing in that province with what each
provides, plus a raise button. Ongoing bonuses flow through `FB.buildingBonus` (tax, levy,
piety), walls strengthen defense in `war_battle`, and events gate on `buildings` /
`notBuildings` triggers. `state.buildings` is keyed by province id, so conquest moves them
with the land.

Related: [tech.md](tech.md) for the development cap (`FB.devCap`), [war.md](war.md) for
walls in battle.
