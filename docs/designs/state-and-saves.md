# Game state & saves

**Game state is one serializable object** (`FB.state`), created in `js/main.js`. Political
ownership lives in `state.owner` / `state.holder` / `state.dev` / `state.realms`, not in
world data. `js/save.js` snapshots `FB.state` + RNG state + uid counter to localStorage;
the raster is rebuilt deterministically at boot, so saves only reference ids. Saves are
version 3; older saves are rejected.

Related: [mods.md](mods.md) for how saves are stamped with the active mod set.
