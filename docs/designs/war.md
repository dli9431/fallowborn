# Wars

**Wars are event-driven.** The seasonal player war tick (`FB.playerWarTick` in world.js)
charges upkeep (incl. mercenary pay), advances the enemy clock, and queues a
`war_council` decision event; its options act through `FB.fns.war_*` handlers in world.js
and the `war_battle` named chance (real men: levy × `war.strength` condition + 150 per
`war.mercCos` company — the `hire_mercs` deed adds companies mid-war). Attackers capture
the target only by siege (`war.siege` 0–3, sorties can set it back); defenders lose a
border province if `war.enemySiege` reaches 3 — battles won and falling back both push it
down. While the player is personally at war (`FB.atWarPersonally`) the daily picker fires
only events tagged `wartime:true`, an extra slot day is scheduled, and the `lead_host`
focus takes over (previous focus restored at peace via `player.focusBack`).

Related: [events.md](events.md) for the interpreter, [time.md](time.md) for the seasonal
tick, [realms.md](realms.md) for who can target whom.
