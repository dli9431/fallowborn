# Wars

**Wars put hosts on the map.** `js/armies.js` keeps `state.armies`: one field host per
sovereign at war (levies, with hired mercenary companies folded into the player's), each
standing in or marching between provinces. AI sovereigns raise automatically when a war
starts (size = realm dev × `levyPerDev` × `balance.aiHostPerDev`); the player musters via
the 🚩 deed or the muster events (`war_raise`, `war_mass` for the great levy, `war_mercs`
adding 150 men per company to the fielded host). A shattered host may muster again only
after `balance.armyRearmDays` (`state.armyDown`). Hosts exist only while their sovereign
is at war — the daily `FB.armyTick` (called from `G.passDay`) disbands any whose war has
ended, which covers every peace path with one rule. War relationships are folded into a
single `warring` map (and hosts into a `hostByRealm` lookup) once per tick, so the daily
loops stay O(realms + armies) even with dozens of hosts on the map.

**Movement is daily and adjacency-based.** Orders set a BFS path (`FB.findPath` over
`FB.world.adj`); every leg, the first included, costs `balance.armyMarchDays`, and the
host steps into the next province only when the leg completes (rendered mid-road by
interpolating centroids) — so battle contact and sieges begin on arrival, not on
departure. Ordering a host's own province halts it, mid-road included; an unreachable
order fails and clears the old route. AI hosts hunt the nearest enemy host, else march on
the enemy's seat (a broken host routs home for 40 days). The player taps their host to
select it, taps a province to march — which lets go of the host again so further taps
browse the map — and taps the selected host again to halt; Enter/Shift+arrows do the
same by keyboard. `FB.armyTap` (called from `FB.map.onTap` in ui.js) owns that
interaction; the Land tab shows the selected host and any hosts standing in the viewed
province. A host resting on its sovereign's own land refills toward its mustered `size`
at `balance.armyReinforceRate` per day.

**A battle fires when hostile hosts share a province** (`FB.armiesHostile`: the two
sovereigns hold a war object on each other, or one side is the player's war enemy).
Power is men × martial factor (player mar/14 with tech/item/blessing edges, AI ruler
mar/22) × `FB.rf(0.75, 1.25)`; the loser takes `balance.battleLoseLoss` casualties and
routs (dispersing under 40 men), the winner loses `battleWinLoss` scaled by closeness.
Player battles queue a `field_battle_won/lost` event and score through the existing
`war_win`/`war_loss` handlers (so 3 wins still force tribute, 3 losses break the
campaign); AI-vs-AI results accumulate as `war.fw`/`war.fl` and tilt that war's yearly
resolution in `FB.worldTick`.

**The seasonal layer remains, now grounded in the field.** `FB.playerWarTick` still
charges upkeep and queues the `war_council`, whose options act through the `war_*` fns —
but the enemy-advance clock (`war.enemySiege`) ticks only while a hostile host stands in
the player's lands (`FB.enemyHostInPlayerLands`), and `war_can_siege` requires the
player's host standing in the target province. The council's abstract pitched battle
(`war_battle` named chance, itself reading the fielded hosts' real men) is offered only
while the enemy has no host raised (`war_no_enemy_host`) — and a side still re-forming a
shattered host counts only a remnant of its paper strength there (`FB.rearmScale`: the
share of `armyRearmDays` elapsed, floored at 0.15); a fielded enemy is hunted on the map
instead (`war_can_hunt`/`war_hunt`, which sets `huntPrey` so the host re-paths onto its
prey each day rather than marching to where it stood).

Related: [events.md](events.md) for the interpreter, [time.md](time.md) for the seasonal
tick, [realms.md](realms.md) for who can target whom, [provinces.md](provinces.md) for
the map the hosts march on.
