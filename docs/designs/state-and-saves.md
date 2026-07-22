# Game state & saves

**Game state is one serializable object** (`FB.state`), created in `js/main.js`. Political
ownership lives in `state.owner` / `state.holder` / `state.dev` / `state.realms`, not in
world data. `js/save.js` snapshots `FB.state` + RNG state + uid counter to localStorage;
the raster is rebuilt deterministically at boot, so saves only reference ids. Saves are
version 3; older saves are rejected.

`state.legends` records each player character at death (`js/main.js` `recordLegend`):
id, name, born/died years, styled title, and a quip rolled once from traits, stats, and
cause of death. The end screen (`UI.gameOver`) reads it; saves from before the field
existed grow it at the first death after loading.

`state.seed` records the start code the life began with ([seeds.md](seeds.md)); saves
from before it existed simply hide the seed row in the menu.

Related: [mods.md](mods.md) for how saves are stamped with the active mod set.

Saves from before parents were recorded (first-generation siblings known only
by role) have a father and mother synthesized on load — long dead, ages
fitted to the oldest child — so the family tree shows them instead of an
"Unrecorded" ghost (`backfillParents` in `js/save.js`).
