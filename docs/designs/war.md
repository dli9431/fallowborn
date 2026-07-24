# Wars

**Wars put hosts on the map.** `js/armies.js` keeps `state.armies`: one field host per
sovereign at war (levies, with hired mercenary companies folded into the player's), each
standing in or marching between provinces. AI sovereigns raise automatically when a war
starts (size = realm dev × `levyPerDev` × `balance.aiHostPerDev`); the player's host
musters the moment war begins — `FB.warFooting`, which every war-start path calls,
raises it — and the muster events that follow only decide whether it takes the field
with hired companies (`war_mercs`, `balance.mercCompanySize` men each) or a great levy
(`war_mass`, swelling the levy class by `balance.massLevyMult`) behind
it. A shattered host may muster again only after `balance.armyRearmDays`
(`state.armyDown`). Hosts exist only while their sovereign
is at war — the daily `FB.armyTick` (called from `G.passDay`) disbands any whose war has
ended, which covers every peace path with one rule. War relationships are folded into a
single `warring` map (and hosts into a `hostByRealm` lookup) once per tick, so the daily
loops stay O(realms + armies) even with dozens of hosts on the map.

**A host is a composition, not just a headcount.** Every host carries
`units: { levy, arch, ret, mercs }` (with `men` always the total, so every place that only
reads a number is untouched). The levy is the dev-driven mass — untrained foot raised for
the campaign; the **retinue** is the professional core of men-at-arms from war buildings
(`keep`, `barracks`), the arms techs, and a landed baron's standing household
(`balance.baronyRetinue`); **archers** come from archery-butts buildings and tech;
**mercs** are the hired companies. `FB.playerComposition` (world.js) computes the player's
split — `FB.playerLevy` remains the total for callers that want a number — and AI hosts
get a simple era-based split (`balance.aiRetinueFrac`/`aiArcherFrac`, stepping up at
`aiEraStepYear`), since AI realms keep no buildings. Each class fights at its own quality
(`balance.qualityLevy`/`qualityArcher`/`qualityRetinue`/`qualityMerc`, read through
`FB.compQuality`): men-at-arms punch far above their numbers, levy below. Battle
casualties fall levy-first and men-at-arms last (`applyLosses` in armies.js), and a
resting host refills with fresh levy only — slain professionals are not replaced
mid-war, so a long campaign grinds a host down toward its peasant mass. Hosts from older
saves migrate in place (`FB.hostUnits`): their men count as levy but the hired companies.

**Movement is daily and adjacency-based.** Orders set a BFS path (`FB.findPath` over
`FB.world.adj`); every leg, the first included, costs `balance.armyMarchDays`, and the
host steps into the next province only when the leg completes (its marker stays
on the province it stands in) — so battle contact and sieges begin on arrival,
not on departure. Ordering a host's own province halts it, mid-road included; an unreachable
order fails and clears the old route. AI hosts hunt the nearest enemy host, else march on
the enemy's seat (a broken host routs home for 40 days). The player taps their host to
select it, taps a province to march — which lets go of the host again so further taps
browse the map — and taps the selected host again to halt; Enter/Shift+arrows do the
same by keyboard. `FB.armyTap` (called from `FB.map.onTap` in ui.js) owns that
interaction; the Land tab shows the selected host and any hosts standing in the viewed
province. Since the host never moves on its own, a one-time toast at muster
(`flags.hostHintShown`) and a Deeds-tab hint while the raised host stands idle both tell
the player to tap it, then tap a province. A host resting on its sovereign's own land refills toward its mustered `size`
at `balance.armyReinforceRate` per day — the refill is all fresh levy; lost men-at-arms
and archers stay lost. On the map a host stands on a disc of its realm's
color — green for yours, red for your war enemy's — so its side reads at a glance, and
hosts locked with an enemy in one province bear a ⚔ for the day they clash.

**The host can fight the war for you.** The ⚙ automation's host-command stances
(`G.auto.hosts`) re-raise a destroyed host once the rearm window passes and steer an
*idle* host each day (`playerGoal` in armies.js): defensive throws back any invader
standing in the player's lands and otherwise refits at home; offensive hunts the
enemy host when `battlePower` favors the player (the Prudent/Bold option style sets
how much of an edge it demands) and marches on the war target when no host opposes
it — and once standing on the target it stays put, so the council's siege can
proceed (a council resolved by automation presses the siege: the `war_*` customs
carry explicit auto-picker scores in ui.js's `CUSTOM_FX_SCORE`). A hand-tapped route (`manual`) always plays out first and a hand-given halt
(`holdManual`) parks the host until the next manual march — automation never
overrides either, and while active it supersedes the council's `huntPrey`.

**A battle fires when hostile hosts share a province** (`FB.armiesHostile`: the two
sovereigns hold a war object on each other, or one side is the player's war enemy).
Power is men × composition quality (`FB.compQuality`) × martial factor (player
mar/`battleMarPlayer` with tech/item/blessing edges, AI ruler mar/`battleMarAI`) ×
`FB.rf(0.75, 1.25)`; the loser takes `balance.battleLoseLoss` casualties and
routs (dispersing under `balance.armyMinMen`), the winner loses `battleWinLoss` scaled
by closeness.
Player battles queue a `field_battle_won/lost` event (the `_steel` variants when the
player's men-at-arms stood in the line) and score through the existing
`war_win`/`war_loss` handlers (3 losses still break the campaign); AI-vs-AI results
accumulate as `war.fw`/`war.fl` and tilt that war's yearly resolution in
`FB.worldTick`. A beaten host carries a `broken` stamp (`state.turn`) and enjoys a
**rout grace**: the pair scan skips any hostile pair where either host was broken
less than `balance.armyRoutDays` ago. Without it, a host beaten while standing on
its own capital could never flee — ordering home is a halt — and the same battle
would re-fire (and re-score `war_win`/`war_loss`) every day. Three field wins no
longer end an attacking war by fiat: the beaten
defender sues for peace and the `war_tribute_offer` event lets the player choose —
take the tribute (`war_accept_tribute`, the old forced payout) or press on for the
siege of the target. The offer re-queues on each further win, one waiting at a time,
and a stale offer is dropped when the queue is drawn if the war has already ended.
Declining is remembered: `war_press_on` sets `war.tributeDeclined`, and `FB.warOutcome`
stops re-queueing the offer for the rest of that war — the choice to press on is made
once per war, not after every battle.

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

**Riding with the liege's host builds a service record.** Vassal players who answer
the banner call (`with_liege_host`) fight through the `host_*` events; those and the
war's end pay into the lifetime `player.warService` tally, which gates the
intra-realm petition deed and the escheat scramble (see [realms.md](realms.md)).

Related: [events.md](events.md) for the interpreter, [time.md](time.md) for the seasonal
tick, [realms.md](realms.md) for who can target whom, [provinces.md](provinces.md) for
the map the hosts march on.
