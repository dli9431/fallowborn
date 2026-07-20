# Technology

**Technology is the tall game.** `FBDATA.tech` (map_data.js) defines innovations bought
with scholarship (`player.research` — earned via the patronize focus, the library
building, and the `research` event effect) through the adopt-innovation deed. Adopted ids
live in `state.tech` and persist across generations. Bonuses flow through `FB.techBonus`
(tax/levy/battle/build/devCap/health/research); `FB.devCap` lifts the development ceiling
above 10 for demesne provinces. Events gate on `techs`/`notTechs` triggers.

Related: [development.md](development.md) for buildings, [time.md](time.md) for
`FB.autoResearch`.
