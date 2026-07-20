# Piety, intrigue & diplomacy

**Piety, intrigue, and diplomacy are active systems.** Piety is spent on blessings (the
`seek_blessing` event sets `blessed_crops`/`blessed_war`/`blessed_union` flags the engine
reads and consumes). Intrigue runs on plots: `FBDATA.plots` (map_data.js) + the Scheming
focus accrue power with discovery risk, then a resolution event fires (`plot` named
chance; options end with `{custom:'plot_end'}`). Diplomacy has envoys buying
non-aggression pacts (`state.pacts`, honored by the AI and by `FB.warTargets`),
oath-brotherhood, and quarrel mediation.

Related: [events.md](events.md) for named chances, [war.md](war.md) for what pacts block.
