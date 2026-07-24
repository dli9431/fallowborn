# Technology

**Technology is the tall game.** `FBDATA.tech` (map_data.js) defines innovations bought
with scholarship (`player.research` — earned via the patronize focus, the library
building, the `research` event effect, and learning-tree innovations such as Scriptoria
and the Royal Catalogue capstone) through the adopt-innovation deed. Adopted ids
live in `state.tech` and persist across generations. Bonuses flow through `FB.techBonus`
(tax/levy/battle/build/devCap/health/research/retinue); `FB.devCap` lifts the development ceiling
above 10 for demesne provinces. Events gate on `techs`/`notTechs` triggers.

**Capstones repeat with diminishing returns.** The last rung of each tree
(`improved_husbandry`, `martial_drill`, `royal_catalogue`) carries `repeat: true`: it
stays on offer after adoption and may be taken again and again, each rank pushing its
fx onto `FB.techBonus`'s sum once more (`state.tech` simply holds the id multiple
times). The price climbs instead of the bonus shrinking — `FB.techCost` charges
`cost × balance.techRepeatCostGrowth^(ranks held)`, and every buyer (`techAvailable`,
`adoptTech`, `autoResearch`, the picker) reads that computed cost. The picker shows
the held rank as `×n` on the button and in the adopted list.

Related: [development.md](development.md) for buildings, [time.md](time.md) for
`FB.autoResearch`.
