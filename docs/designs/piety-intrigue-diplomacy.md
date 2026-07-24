# Piety, intrigue & diplomacy

**Piety, intrigue, and diplomacy are active systems.** Piety is spent on blessings (the
`seek_blessing` event sets `blessed_crops`/`blessed_war`/`blessed_union` flags the engine
reads and consumes, sells an anointing against sickness, and offers three pure-effect
spends — the clergy's good word with your lord (`opinionLiege`), masses for the family
dead (prestige and popular opinion), and a blessing upon your house (spouse opinion)).
The `give_alms` deed closes the loop, turning gold into piety (with a little popular
opinion) so the temple's services stay within reach. Intrigue runs on plots: `FBDATA.plots` (map_data.js) + the Scheming
focus accrue power with discovery risk, then a resolution event fires (`plot` named
chance; options end with `{custom:'plot_end'}`). Diplomacy has envoys buying
non-aggression pacts (`state.pacts`, honored by the AI and by `FB.warTargets`),
oath-brotherhood, and quarrel mediation.

Related: [events.md](events.md) for named chances, [war.md](war.md) for what pacts block.
