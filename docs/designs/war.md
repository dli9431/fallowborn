# Wars

## Causes and defensive alliances

Player offensive wars require a semantic cause. `FB.warCauses(state)` returns cause
records rather than unrestricted adjacent county ids. A new county war prefers a
bordering county inside a de jure duchy, kingdom, or empire the player actually holds
(the most specific title wins), or the player's one fabricated county claim. When
neither right applies, that same reachable neighboring county is offered explicitly as
an `aggression` cause. It is never labeled or saved as a fabricated or de jure right.
Active wars, peace pacts, and alliances remain hard declaration blocks.
`FB.warTargets` and string calls to
`FB.startPlayerWar` remain compatibility surfaces, while a new war stores the selected
record in `player.war.casus`. Old in-progress wars without that field keep their legacy
capture behavior.

`FB.warCausePreview` is the shared read-only declaration projection. The target picker
compares recognized rights with War of Aggression and shows the objective and automatic
prestige rewards. Aggression opens a second confirmation which repeats its exact clamped
prestige and Common Voice changes, the per-court direct-vassal and foreign-sovereign
Standing changes, the recent-war escalation, current breakaway multiplier, likely
political opposition, and the county burden victory will apply. Opening, canceling, or
navigating that review neither writes state nor consumes RNG; the final action
revalidates the live cause and diplomacy gates.

The picker asks `FB.warCauses(state, true, true)` for available and diplomatically
blocked semantic causes. Its search index derives realm, ruler, objective, and full
enemy territory from live world state. Cause basis, border adjacency, enemy rank
relative to the player, and diplomatic availability are filters over those records;
the deterministic default sorts available recognized rights before aggression and
blocked rows, then uses stable realm/objective/type ties. Alternative sorts cover realm,
objective, rank, and defensive strength. A blocked row is disabled and names the shared
`FB.warCauseBlockedReason`; an available row passes the untouched cause record into the
existing confirmation and declaration path.

The core first-declaration costs are 20 prestige, 8 Common Voice, 10 Standing with every
direct vassal, and 5 Standing with every foreign sovereign. Each earlier aggressive
declaration by the current ruler within 2,880 days adds 50% to all four costs. The values
and window use the `warAggression*` balance keys. `player.aggressiveWars` stores only
semantic `{turn,charId,enemy,target}` records; read-only history filtering ignores
malformed, expired, future, and previous-ruler rows, while the next declaration compacts
the list. Protagonist succession clears it because this is personal recent conduct, not
the later inheritable house-notoriety concept.

Aggression earns none of the ordinary automatic offensive-war prestige at declaration,
county capture, a slipped-prize settlement, or accepted tribute. A captured objective
instead receives **Conquered Without Right** for 2,160 days: −15% county tax, −20% county
levy, −8 effective Common Voice while it counts as the player's modifier county, and
+40% harmful `unrest` exposure. The record belongs to the county and survives later
ownership changes. Recent aggression also multiplies the existing yearly breakaway chance
for vassals under the player's crown; negative personal Standing compounds that multiplier.
With no recent aggression the old `breakawayChance` is unchanged, and even one declaration
only raises pressure rather than forcing a revolt.

The exceptional `restoration` cause belongs to one displaced rightful crowned
protagonist. It ignores adjacency, follows the usurper realm's current capital through
the usual field campaign and three-step siege, and on victory absorbs the current realm
and its vassal hierarchy intact. Defeat does not consume the right. Independence remains
its existing dedicated action and cause. AI wars do not maintain claim ledgers; they
store only a descriptive `border` cause.

The `caliphate` cause is the religious twin of restoration, offered by the Claim the
Caliphate deed while a sitting Caliph holds the Sunni office (`FB.caliphateWarCause`:
a sovereign Sunni player king or emperor against the holder's sovereign realm, even
when the office is attached to one of that sovereign's vassals). It likewise ignores
adjacency, and the seasonal tick re-pins the target to the enemy sovereign's current
capital. Victory by siege transfers the office to the player realm and awards
`religiousHeadClaimWarPrestige` prestige — no county changes hands and the defeated
realm survives. The seasonal and capture paths both re-check the sovereign holder and
the player's Sunni sovereign eligibility. If either has changed, the war ends with
nothing gained; capture never falls through to ordinary county conquest. The tribute
offer after three field wins remains a
legitimate exit (take the gold and go home), and an in-preparation great holy war of
the deposed holder collapses as a vacancy when the office moves. The AI never declares
this war.

## War against a religious head

During a Catholic schism, sanctions and commands are scoped through the realm's saved
obedience. No new Catholic great holy war may be called, and forming the rival obedience
cancels a campaign still gathering; a campaign already launched completes from its saved
`callerClaimantId` / `callerObedienceId` snapshot. Capturing Rome transfers the Roman
territorial office to the claimant recognized by the conqueror without automatically
reuniting the Church. Losing Rome or a decisive war by a claimant or last patron removes
15 authority. See [papacy.md](papacy.md).

`FB.sameFaithHeadWarPolicy` is the shared target check. It reads the attacker's
effective inherited faith definition, the live office assignment, and
`religion.properties.head.sameFaithWar`; it never matches
realm names. Catholic player causes against the active Papacy remain legal when an
ordinary de jure, fabricated, or restoration cause exists, but the picker marks them
as sacrilege and opens a second confirmation. Canceling that confirmation changes no
state. Confirming starts the selected war, reduces current piety to zero, applies -40
Standing with every living Catholic ruler, and adds the ruler's `excommunicated` trait.

Excommunication is visible on the ruler sheet and blocks the Seek a blessing deed.
Once the player is at peace and a living Pope holds the office, Seek absolution spends
100 gold and 100 piety, removes the trait, and restores 20 Standing with Catholic rulers.
The sentence is personal and does not pass to the next protagonist. If the Papacy was
destroyed, restoring it also clears the restorer's sentence.

AI ordinary border-war selection rejects an active Papacy when the attacker is
Catholic. Resolution of an already-running or broader same-faith war also filters
Papal counties out of `FB.borderProvince`, protecting a Papal vassal subtree without
protecting its whole secular overlord. Non-Catholic attackers and religions whose
policy is `ordinary` remain unrestricted. Conquest transfers only the besieged county:
even the last county creates an explicit office vacancy through the realm-death
boundary and never grants the religious office or defeated crown. The single exception
is the player-only `caliphate` succession war above, whose whole stake is the office.

Each sovereign may participate in only one active war. `FB.isRealmAtWar` treats both
endpoints as occupied, including both sides of `player.war`; declarations, breakaways,
independence, and fealty/defection conflicts wait until every affected sovereign is at
peace. On load, `FB.repairWars` restores the invariant without changing save version 3:
it preserves a valid player war first, then accepts non-conflicting valid AI wars in
stable realm-id order and removes later overlaps and hosts no longer attached to a war.
`FB.playerRealmAtWar(state)` resolves the sovereign returned by `FB.playerRealmId` through
that same test. Economic effects therefore follow the war of the realm the household
belongs to, including a liege's war, rather than only the protagonist's personal campaign.
`FB.warOpponents(state, realmId)` is the companion read-only presentation lookup: it returns
the opposing sovereign in an ordinary war or the valid sovereigns in the other great-holy-war
camp. War notices and lock explanations use those ids to name both sides instead of reporting
an unspecified conflict.

Alliances are defensive abstractions, not extra war parties. `state.alliances` stores
canonical realm pairs with their source and both ruler-generation stamps, and each realm
may have only one ally. Partners cannot attack each other; a ruler change expires the
compact. Peaceful neighboring same-faith-group sovereign kingdoms and empires receive a
rare yearly opportunity to ally. Independent player kings and emperors can instead
succeed with a 25-gold envoy at Standing 60+, or gain an alliance from a royal marriage
to the adjacent sovereign court.

When an allied realm defends, an available ally contributes 25% of its ordinary host,
capped at 50% of the defender's base host. The men are folded into the defending host's
levy but remain separately recorded for display. An ally already at war contributes
nothing. The same effective defensive strength informs AI targeting and abstract yearly
resolution; there are no allied hosts, calls to arms, chained alliances, or shared peace.

**Wars put hosts on the map.** `js/armies.js` keeps `state.armies`: field hosts of
sovereigns at war (levies, with hired mercenary companies folded into the player's), each
standing in or marching between provinces. A realm may field **several hosts**: the
largest is the *primary* host (`FB.hostOf`) that rearm, muster, de-muster, and legacy
single-host callers key on; `FB.hostsOf` lists them all. Detachments are ordinary extra
records in `state.armies` — no save-format change — and `FB.armiesEnsure` drops
orphaned or invalid hosts (a vanished realm, no men, unknown ground) as it repairs.
AI sovereigns raise automatically when a war starts (size = realm dev × `levyPerDev` × `balance.aiHostPerDev`); the player's host
musters the moment war begins — `FB.warFooting`, which every war-start path calls,
raises it — and the muster events that follow only decide whether it takes the field
with hired companies (`war_mercs`, `balance.mercCompanySize` men each) or a great levy
(`war_mass`, swelling the levy class by `balance.massLevyMult`) behind
it. A shattered primary host may muster again only after `balance.armyRearmDays`
(`state.armyDown`); a destroyed detachment re-forms after the shorter
`balance.detachmentRearmDays` (`state.armyDetachmentDown`). A standing player host may also **de-muster** mid-war (Deeds tab):
it disperses where it stands and only part of it returns to the muster rolls —
`balance.armyDemusterKeepOwn` (all, by default) on the player's own county,
`balance.armyDemusterKeepRealm` (half) elsewhere in the player's sovereign realm,
`balance.armyDemusterKeepOther` (nothing) anywhere else. The returned men are kept on
the war as `state.player.war.musterPool` and cap each own class of the war's next
muster after levy modifiers are calculated; hired companies and allied reinforcements
are raised fresh. The ordinary `armyMinMen` floor does not create replacements after
a de-muster: if the preserved men plus fresh mercenaries/allies remain below it, the
muster deed explains the shortage and stays disabled. The de-muster itself starts the
same rearm wait as a shattering — so a beaten player cannot de-muster and immediately
re-raise a full levy. Great-holy-war hosts are vow-bound and cannot de-muster. Hosts exist only while their sovereign
is at war — the daily `FB.armyTick` (called from `G.passDay`) disbands any whose war has
ended, which covers every peace path with one rule. War relationships are folded into a
single `warring` map (and hosts into a `hostsByRealm` lookup) once per tick. The eligible
sovereign-realm ids are an unsaved derived index retained until realm death or hierarchy
mutation advances the shared realm revision. Daily war discovery and host raising thus
visit the dozens of sovereigns rather than every generated count and duke, keeping the
hot path O(sovereigns + armies) even with dozens of hosts on the map.

**A host may divide, and divided hosts may rejoin.** A halted player host of at least
twice `balance.armyMinMen` can split (`FB.splitHost`, from the selected-host card in the
Land tab): half its men — each class in proportion, largest-remainder — and a matching
share of its carried supply march under a second banner standing beside it, under its
own orders (a fresh detachment holds until steered; `manual`/`holdManual` are per-host).
Allied spears stay with the main body. Two friendly hosts of one realm standing halted
in one province merge back (`FB.mergeHosts`; the larger keeps its banner, supply stocks
pool, the Land card offers the merge). Splitting conserves men — nothing is mustered or
sent home — and rearm, muster-pool, and de-muster rules always key on the primary host.
AI realms whose muster clears `balance.aiMultiHostStrength` split off a
`balance.aiDetachmentFrac` detachment while prosecuting an offensive war (capped at
`balance.aiMaxHosts`); the main host hunts enemy hosts while the detachment makes for
the enemy seat or the holy-war goal — screening and besieging while the main body
fights. On the map each host bears its own marker; same-realm hosts sharing a province
wear a ×N stack badge, and tapping the stack cycles the selection banner by banner.

**A host is a composition, not just a headcount.** Every host carries
`units: { <classId>: men }` keyed by `FBDATA.unitClasses` (with `men` always the total,
so every place that only
reads a number is untouched). The unit-class table (`data/units.js`) is the single
source of truth: each class declares its `name`/`icon`, battle `quality`,
`upkeepPer100` logistics, `casualtyOrder`, `counters`, optional per-terrain
`terrainFactors` (overriding the shared `balance.terrainBattleFactors` row), and
optional `requiresTech` / `cultures` / `notCultures` gates. The five baseline classes
are **levy** (the dev-driven mass — untrained foot raised for the campaign),
**retinue** (the professional core of men-at-arms from war buildings
(`keep`, `barracks`), military technology, and a landed baron's standing household
(`balance.baronyRetinue`)), **archers** (archery-butts buildings and technology),
**cavalry** (national military technology), and **mercs** (the hired companies,
marked `hired: true` — never mustered from the levy). Beyond them, gated classes join
a realm's muster automatically through `FB.unitClassUnlocked`: **crossbowmen**
(tech `crossbows`), **pikemen** (tech `infantry_polearms`), **horse archers**
(cultures `magyar`/`turkic`), **huscarls** (cultures `norse`/`english`), **camel
riders** (cultures `arabic`/`berber`), and **cataphracts** (cultures
`greek`/`armenian` plus tech `cataphract_armor`). An unlocked class converts its
`share` of the mustered levy into its own companies — the headcount is unchanged,
the mix improves. `FB.playerComposition` (world.js) computes the player's
split — `FB.playerLevy` remains the total for callers that want a number — and AI hosts
start from `balance.aiRetinueFrac`/`aiArcherFrac`, then add the effective sovereign's
`fx.aiUnits` fractions and their own unlocked classes keyed on capital culture and
completed techs; national `levy` bonuses also increase their muster, and there is
no global era step. `FB.techArmyMarchDays` applies the capped overland movement bonus to
land legs, while ordinary and great-holy-war sieges use the capped sovereign siege bonus.
Each class fights at its own table `quality`
(read through `FB.compQuality`): cavalry has quality 2.0, men-at-arms punch far above their
numbers, and levy below. Battle casualties fall in the table's `casualtyOrder` —
levy first, the heaviest professionals last (`FB.applyHostLosses` in armies.js) — and a
resting host refills with fresh levy only — slain professionals are not replaced
mid-war, so a long campaign grinds a host down toward its peasant mass. Hosts from older
saves migrate in place (`FB.hostUnits`): their men count as levy but the hired companies,
and any class a save predates defaults to 0.

**A raised host has composition-based seasonal logistics.**
`FB.playerHostUpkeepParts(state)` returns
`{base, levy, archers, cavalry, retinue, mercenaries, byClass, campaignModifier, total}` from the
live player hosts — the main body and every detachment; each fielded banner pays its own
camp base, and hired companies are contracted once for the whole war. `byClass` carries the per-class charge for every table class (the four
named fields are compatibility aliases for the baseline mustered classes). The camp and
per-class components are tangible provisions/materials/transport baskets quoted in the
primary host's current county: their base amounts are 2 gold for the camp, then each class's
`upkeepPer100` from `FBDATA.unitClasses` per 100 live men of that class, quoted against
the class's own `basket` mix. Hired companies retain their fixed 4-gold contract each and are
excluded from commodity and campaign-supply multipliers. The live unit counts
mean a great levy, defensive reinforcements, daily reinforcement, battle casualties,
and re-mustering all change the non-mercenary bill without stored economic state.
A missing host returns all zeroes, so a shattered or disbanded host costs nothing until
it is raised again. The season boundary charges the same bill for ordinary and sovereign
great holy-war hosts and clamps an underfunded purse to zero without disbanding the host.
`campaignModifier` is zero for ordinary-war-only hosts and records the signed supply
adjustment for a player host serving in a great holy war.

Every field army adds local provisions demand to the quarterly county market. A hostile
host also refreshes a saved severe shock that lowers local production and adjacency-flow
capacity; after the host leaves, the shock ages out normally. This replaces the former
flat sovereign-war surcharge on household necessities. See [markets.md](markets.md).

**Every host carries a supply meter (0–100), and supply lines are real.** Each day
(`FB.armyTick`, after the march and reinforcement, before the battle scan) a host on
friendly ground — its own, its sovereign's, or allied land, one
`FB.armyFriendlyProvince` question — refills at `balance.supplyRecoverRate`, half again
as fast in a county with a friendly fort (the depot effect), and slower on a war-worn
county whose development has been beaten below its bookmark baseline (floored at
`balance.supplyDevastatedRecoverFloor`). Abroad the host drains at
`balance.supplyDrainBase` × the terrain being crossed (`balance.supplyDrainTerrain`) ×
the winter multiplier (`balance.supplyWinterDrainMult`, season 3) × (1 +
`balance.supplyDistanceDepth` per county of distance from the nearest friendly land —
one reverse-BFS map per host realm per tick). The capped national `fx.supply`
technologies (pack saddles, iron-tired carts, military magazines) shrink the drain and
quicken the refill. At 0 supply the host starves: `balance.supplyAttritionPerDay` of
its men melt away daily through `FB.applyHostLosses`, its battle power falls to
`balance.supplyStarvedPowerMult`, the player hears the news once on the day the well
runs dry, and a starving host cannot reinforce even at home — it eats before it fills
its ranks. A besieging host pinned on hostile ground drains at the foreign rate like
any other; the siege's own seasonal attrition is unchanged and never doubled. AI hosts
follow the same rules through the same path. Hosts from older saves default to a full
100 (`FB.hostSupply`, repaired by `FB.armiesEnsure`); the Land tab and war status read
the meter through `FB.hostSupplyStatus` (Good / Low / Starving, with a rough
days-to-attrition hint abroad).

**Ordinary player wars retain a compact campaign-feedback ledger.** The active
`player.war` object stores at most eight battle records (outcome, field/abstract mode,
place, before/after headcounts, and losses by class), cumulative live-host losses by
class, and at most ten recent campaign effects. Each effect names its source and
condition and records whether it changed abstract campaign strength, live troops, or
both. `FB.warFeedback` derives the current streak, live composition, loss total, recent
effects, and the same authoritative `FB.playerHostUpkeepParts` result used by seasonal
charging. These additive, JSON-safe fields self-initialize on old active wars and do not
constitute a second battle or casualty simulation.

Campaign condition and live troops remain deliberately separate. Thin ranks,
discipline, and disorder normally move the bounded abstract `war.strength` used by war
council odds; field supply is the exception, a live per-host meter (above) whose
starvation bleeds real men. A handler changes headcount only when its option says so,
and all such
losses use `FB.applyHostLosses`; the feedback UI labels the affected ledger explicitly.
The loss-aware **Empty Bedrolls** event requires a surviving raised host, meaningful
recorded casualties, a recent defeat or defeat streak, and a per-war interval. Its
arrears option costs a configurable number of current seasonal upkeep bills, subject to
a minimum. Desertion instead rolls a seeded configurable percentage of the live roster
through `FB.rf` and the deterministic shared loss allocator. The event is eligible after
the first qualifying defeat, before the third-loss campaign termination, and resolving
any of its options stamps the interval.

**Movement is daily, weighted, and adjacency-based.** `FB.findPath` remains the plain BFS
compatibility surface over `FB.world.adj`; field hosts use deterministic
`FB.findArmyPath`, which minimizes quoted travel days, then leg count, then the full
province-id path. Land legs use `FB.armyMarchDays` multiplied by the destination
county's terrain (`balance.terrainMarchMult`: mountains double the crossing, marsh and
tundra half again, desert and forest and hills in between, open steppe slightly
faster) — the day-weighted search therefore detours around bad going on its own. An
authored strait is also present in
`FB.world.waterAdj`, and `FB.armyLegQuote` gives it a `narrow`, `coastal`, or `open`
crossing class. The effective sovereign's best completed `fx.seaTransport` value supplies
national transport capacity (250 men without such knowledge), modified by the crossing
class. A host above effective capacity waits through `ceil(men / capacity)` complete
crossing cycles; `fx.seaMovement` and a valid great-holy-war campaign-speed adjustment
shorten each cycle. Within one route search the leg-quote inputs that depend only on
the realm and the host (march days, national capacity, sea and campaign speeds,
headcount) are computed once and shared by every edge, and the sorted adjacency lists
and the reachability components that veto impossible routes are cached per world —
neither changes the quoted route.

Each leg is quoted only when it begins. The whole indivisible host and its marker remain
on the departure county while the clock represents gathering boats, loading successive
contingents, and completing the passage; `army.at` changes only on arrival. Battle,
reinforcement, siege, and map-marker rules therefore remain province-based. An active
`moveLeft` is never recalculated after loading, gaining technology, changing allegiance,
or rerouting. A mid-leg reroute preserves the current next county and countdown and
replaces only the remainder; a failed reroute stops after that active leg. Ordering the
departure county remains an explicit halt. Broken hosts, AI hunting, and player automation
all use the same weighted route and leg quotes. The player taps their host to
select it, taps a province to march — which lets go of the host again so further taps
browse the map — and taps the selected host again to halt; Enter/Shift+arrows do the
same by keyboard. `FB.armyTap` (called from `FB.map.onTap` in ui.js) owns that
interaction. Its order feedback gives total ETA, water-leg count, and the limiting
crossing's effective capacity and cycles. The selected-host Land status names the
immediate land march or crossing preparation without implying an at-sea marker. The Land
tab also shows any hosts standing in the viewed province. Since the host never moves on
its own, a one-time toast at muster
(`flags.hostHintShown`) and a Deeds-tab hint while the raised host stands idle both tell
the player to tap it, then tap a province. A host resting on its sovereign's own land refills toward its mustered `size`
at `balance.armyReinforceRate` per day — the refill is all fresh levy; lost men-at-arms
and archers stay lost, and a host at 0 supply does not reinforce until it has eaten. On the map a host stands on a disc of its realm's
color — green for yours, red for your war enemy's — so its side reads at a glance, and
hosts locked with an enemy in one province bear a ⚔ for the day they clash.
Map invalidation follows visible host state: raising or disbanding a host, changing its
route, arriving in a county, changing allied levies, reinforcing, or fighting requests a
render. Intermediate march-day countdowns do not, because markers remain on the county
the host still occupies and there is no interpolated movement to draw.

## Fortified strongpoints

An active hostile fort is a movement obstacle, not merely a longer progress bar.
`FB.findArmyPath` may end at its county but may not use that county as an intermediate
node, so a second road can route around it. On arrival the fort clears any saved onward
route and pins the host. A pinned host may remain and siege, return through `army.from`,
or step into friendly-controlled land; allied and friendly armies pass normally. A
broken host still seeks its retreat before automation applies the pinned hold.

Ordinary conquest takes three base siege steps plus the fort's snapshotted tier. The
snapshot is written when the first active pulse begins, so construction completed during
the siege does not move the goalposts. Progress needs uncontested friendly strength of
three times the garrison: 120/240/420/660 men. Every active seasonal pulse costs the
besiegers `ceil(garrison × 0.15)` casualties (6/12/21/33), divided proportionally among
friendly hosts, and costs a player campaign 0.05 condition. Falling below the threshold
stalls later work. Abandoned work loses one step per season.

A standing tier supplies 5%/10%/15%/20% local defensive battle power. Field victories,
submission, capture-ransom land cession, and the old defensive-loss shortcut cannot move
a fortified county before its exact siege is breached. Capture leaves the fort and any
construction intact, even if the new controller lacks its technology. A fort's added
steps also extend the bilateral war exhaustion limit. AI border wars likewise cannot
abstractly transfer the county: only a pinned qualifying host applies four seasonal
pulses in the yearly pass, and abandoned AI work decays four steps.

A completed military capture or objective siege lowers the affected county's development
by one through `FB.damageCountyDevelopment`. This applies once to ordinary player and AI
conquest, once to a successful restoration or religious-office objective, and once whenever
great holy-war occupation flips to attackers or back to defenders. Merely entering the
county, beginning or abandoning siege work, accepting submission, or ceding land as ransom
causes no development loss. The damage is separate from fort survival: the strongpoint and
its in-flight construction still pass intact with the land.

The strongpoint protects political control, not every field and village. Hostile armies
inside the county can still cause devastation and outside-the-walls events. Stores,
surrender terms, repairs, garrison characters, and settlement-interior combat remain
future work; host-level supply lines are simulated separately (see above) and never
double the siege's own attrition.

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
One clash per province per day: hosts that are not mutually hostile fold into one side
(the same folding the allied reinforcement rule applies), the two strongest sides meet,
and everyone else stands clear. A side's power is the sum of its hosts' terrain-aware
battle power, counter edges read the pooled compositions, and casualties spread across
the side in proportion to each host's men (`spreadLosses`).
Power is men × composition quality × martial factor (player
mar/`battleMarPlayer` with tech/item/blessing edges, AI ruler mar/`battleMarAI`) ×
the side's counter multiplier × `FB.rf(0.75, 1.25)`; the loser side takes `balance.battleLoseLoss` casualties and
each of its hosts routs singly (dispersing under `balance.armyMinMen`), the winner loses
`battleWinLoss` scaled
by closeness.
**Composition counters swing the field battle.** Each class's `counters` table
(`FBDATA.unitClasses`) fights it above its quality against the named enemy classes —
pike blocks break cavalry charges, crossbows punish armored foot, horse archers wear
down the levy mass. A side's counter multiplier is the composition-weighted average of
its classes' counter bonuses against the enemy's composition shares, capped at
±`balance.battleCounterMaxSwing` (0.2), so counters decide close fights without
overwhelming numbers and martial (`FB.armyBattleCounterMultiplier`, applied in
`resolveBattle`).
**Terrain and supply both bite at the point of battle.** Where the battle is joined,
each class's quality is multiplied by the province's terrain
(the class's own `terrainFactors` row in `FBDATA.unitClasses` when it has one, else
`balance.terrainBattleFactors`, via `FB.compTerrainQuality`: cavalry shines on open
farmland and steppe and flounders in forest, mountains, and marsh; archers relish
hills and woods; the levy mass is indifferent), and the host holding the ground —
standing, no march in progress; ties and mutual arrivals broken by the saved RNG —
adds the terrain's home-ground bonus (`balance.terrainDefenseBonus`: hills, mountains,
forest, marsh). A host out of supply fights at `balance.supplyStarvedPowerMult`, and
one below `balance.supplyLowThreshold` at `balance.supplyLowPowerMult`. Callers without
a location (the automation's odds check, the war-council abstraction) keep the
terrain-neutral `FB.compQuality` average.
Player battles queue a `field_battle_won/lost` event (the `_steel` variants when the
player's men-at-arms stood in the line) and score through the existing
`war_win`/`war_loss` handlers (3 losses still break the campaign); AI-vs-AI results
accumulate as `war.fw`/`war.fl` and tilt that war's yearly resolution in
`FB.worldTick`. A beaten host carries a `broken` stamp (`state.turn`) and enjoys a
**rout grace**: the side scan skips any host broken
less than `balance.armyRoutDays` ago. Without it, a host beaten while standing on
its own capital could never flee — ordering home is a halt — and the same battle
would re-fire (and re-score `war_win`/`war_loss`) every day.

**Encirclement is lethal.** A host is *cut off* (`FB.hostCutOff`) when no road home
exists: every neighboring land county is hostile-held, enemy-occupied, or barred by a
hostile unbreached fort, and every water crossing lies beyond one ferry cycle of the
host's sea transport. A beaten host routs only toward a reachable friendly county
(`FB.armyRetreatGoal`: home while the road is clear, else the nearest friendly county
a legal march can reach); a cut-off one stands its ground and is fought again once its
rout grace lapses. A host shattered while cut off is destroyed outright rather than
routed home, and a beaten tier-3+ leader whose host shatters encircled is taken at the
graver `balance.captureChanceEncircled` odds instead of `captureChanceBase`. The host
marker bears a ✂ and the Land-tab host card a warning chip while the noose holds. Three field wins no
longer end an attacking war by fiat: the beaten
defender sues for peace and the `war_tribute_offer` event lets the player choose —
take the tribute (`war_accept_tribute`, the old forced payout) or press on for the
siege of the target. The offer re-queues on each further win, one waiting at a time,
and a stale offer is dropped when the queue is drawn if the war has already ended.
Declining is remembered: `war_press_on` sets `war.tributeDeclined`, and `FB.warOutcome`
stops re-queueing the offer for the rest of that war — the choice to press on is made
once per war, not after every battle.

**Equipment participates at the point of battle, not merely by ownership.** Only battle
effects worn by the current head enter `FB.itemBonus('battle')`; a sword or armor lying
in the family armory contributes nothing. Existing field-victory, harrying, raid, and
event-spoils paths now resolve through the exact item APIs, creating a repeatable gear
instance or granting an unowned unique heirloom when their normal loot roll succeeds.

Lethal field-battle, host-battle, war-council battle, and shield-wall rout effects carry
`deathProvenance`. `FB.applyEffects` materializes the event, province, and enemy ids only
when that resolution actually leaves health at zero. `G.die` freezes those semantic ids
and the exact final loadout into the legend before succession. The death sheet can
therefore say where and against whom the character fell without saving rendered prose.
No battlefield loss or looting of the dead character's equipment occurs in this release.

**The seasonal layer remains, now grounded in the field.** The shared season boundary
charges any live player host, while `FB.playerWarTick` queues the `war_council`, whose
options act through the `war_*` fns — but the enemy-advance clock (`war.enemySiege`)
ticks only while a hostile host stands in
the player's lands (`FB.enemyHostInPlayerLands`), and `war_can_siege` requires one of
the player's hosts standing in the target province (the largest leads the works). The council's abstract pitched battle
(`war_battle` named chance, itself reading the fielded hosts' real men) is offered only
while the enemy has no host raised (`war_no_enemy_host`) — and a side still re-forming a
shattered host counts only a remnant of its paper strength there (`FB.rearmScale`: the
share of `armyRearmDays` elapsed, floored at 0.15); a fielded enemy is hunted on the map
instead (`war_can_hunt`/`war_hunt`, which sets `huntPrey` so the host re-paths onto its
prey each day rather than marching to where it stood).

**Defeat has a price beyond provinces.** A defender outranked and outweighed
(`submissionStrengthRatio`) whose war is all but lost is offered the loser's homage
once per war (`war_submission_offer` via `FB.maybeOfferSubmission`): kneel and keep
every acre as the victor's vassal (`war_submit` — a crowned head that kneels begins
its title lapse, see [descent.md](descent.md)), buy the peace at a conqueror's price,
or fight on. A beaten tier-3+ leader may be **taken in the rout**
(`FB.maybeCapturePlayer` on `war_loss`, skill-softened odds): the `in_prison` flag
blocks travel, retirement, and ventures; the ransom event prices freedom by dignity
(`ransomByTier`), payable in silver or in a border county; and while the flag stands
no war council is queued — the war drifts leaderless while health and crown authority
bleed and each season offers a release chance. `FB.endPlayerWar` always frees the
prisoner. For commoners the war's cruelty lands differently: a hostile host standing
in the home province (`FB.hostileHostAtHome`, checked through `FB.armiesHostile`)
burns holdings season by season (`FB.devastationSeason` → `devastation_raiders`),
and after two burnings the local lord offers his wall in exchange for the family's
freedom (`devastation_protection` → commendation to serfdom, by choice).

**Riding with the liege's host builds a service record.** Vassal players who answer
the banner call (`with_liege_host`) fight through the `host_*` events; those and the
war's end pay into the lifetime `player.warService` tally, which gates the
intra-realm petition deed and the escheat scramble (see [realms.md](realms.md)).
Each positive `fx.warService` award also adds its exact value to Muster-Bred
acquisition progress; six points award the formation without changing the existing
service tally or its succession reset.

Personal participation in war also creates a rare break in ordinary social access. A
campaigning protagonist may reach the current local lord without first completing the
priest/freeholder-to-steward chain: muster, guard duty, and the lord's host put otherwise
distant ranks in the same urgent setting. This is an audience, not equality; cultivation
and explicit gifts still keep their class-distance effect and cash multipliers. It never
opens unrelated nobles or foreign rulers. The pattern complements the game's existing
service route to elevation: early medieval royal land grants explicitly record devoted
service alongside military, bridge, and fortress obligations ([The National
Archives](https://www.nationalarchives.gov.uk/education/resources/anglo-saxons-gift-from-a-king/)).

**Battlefield knighting belongs to an active war.** Saving the fallen lord may mark a
soldier for elevation, but `knighted` also requires `realmAtWar:true` when it is selected.
The top-level `wartime:true` flag controls the wartime event pool; it does not make an
event war-only during peace. A delayed honor therefore cannot raise a serf or freeholder
after the armies have stood down.

**A newly gentle founder may take real field command.** `FB.militaryCommandStatus`
offers the Deed only to the first playable head before the house is established, after
that character has both seen battle and won the lord's personal favor, and after the
configured Martial and prestige thresholds are met. The local patron resolved through
`state.holder` must be a living count or greater; their top realm must be at war with a
live AI host. Accepting saves `player.militaryCommand:{charId,patronRealmId,
sovereignRealmId,startedTurn}`, changes focus to `lead_host`, counts as personal wartime,
and lets the protagonist's Martial improve that AI host when it exceeds the realm
ruler's. `resolveBattle` is the only victory writer: when that exact sovereign host wins
a hostile map battle, it clears the command and queues `military_barony_victory` for the
snapshotted patron. No event roll, abstract soldier story, tournament, player war, or
another realm's victory satisfies it. If the host is destroyed, the war ends, the
patron falls below count rank, the hierarchy changes, or the protagonist changes, the
next army tick clears the command and restores the prior focus without a grant.

**One computed levy ledger is authoritative.** `FB.playerCompositionBreakdown` returns
the levy, archers, cavalry, and retinue together with ordered source entries for direct counties,
buildings, technology, Royal Constable, ruler Martial, domain penalty, each vassal,
standing barony troops, and position or retainer contributions.
`FB.playerComposition` and `FB.playerLevy` derive from that object; no second army total
is stored. The Network Realm section renders the same entries, preserving the existing
calculation order in which percentages and the domain penalty affect direct levy before
vassal contributions are added.

Grouped `war.levy` trait rates are itemized by localized trait name against the direct
levy base after flat county/building/technology troops. Muster-Bred contributes +5%.
That line is added before ruler Martial and the domain penalty, and vassal contributions
remain outside all direct-domain percentages.

A loyal vassal at Standing 40+ may supply one bounded exceptional-levy promise. Calling it
lowers Standing by 15, records a one-year `player.vassalLevyFavors[realmId]` modifier, and raises that
specific vassal's normal levy share by `balance.vassalLevyFavorRate`. It is itemized in
the same ledger. The saved promise is a discrete benefit, not a second relationship
meter, and is separate from Royal Council authority or officer management.

Related: [events.md](events.md) for the interpreter, [time.md](time.md) for the seasonal
tick, [realms.md](realms.md) for who can target whom, [provinces.md](provinces.md) for
the map the hosts march on.

## Great holy-war campaigns

`js/holywar.js` adds one global two-camp campaign beside the bilateral war records.
An active centralized religious head calls it; participating independent sovereigns
each retain the same one-host invariant used by ordinary wars, and the strongest
attacking volunteer becomes military leader. `FB.armiesHostile` checks coalition camps
before ordinary enemies, so same-camp hosts are friendly and opposite camps fight when
they share a county. `FB.isRealmAtWar` includes preparation pledges and active
participants, preventing a participant from opening another ordinary war.

Preparation lasts 180 days. Attackers may volunteer when their faith remains in the
caller's fold. Sovereigns controlling frozen objective land are mandatory defenders;
other sovereigns whose faith is `hostile` or `foreign` to the caller may volunteer.
Each camp has
eight voluntary AI places, while mandatory defenders and the player do not consume
that cap. At launch, attacking volunteers still entangled in an ordinary war drop
out, mandatory defenders receive white peace, and cross-camp alliances and player
pacts break. The call collapses if the head becomes vacant, the target ceases to be
valid, or it lacks two sovereign attackers and also lacks one attacker with 75% of
the defending strength. A launched campaign no longer depends on the office remaining
occupied.

Two code-queued wartime events make those transitions unmissable without automation:
`ghw_called` announces the Pope's Crusade or Caliph's Jihad on the call day, and
`ghw_muster_complete` announces the march on the first active day after the army tick
has raised the gathered sovereign hosts. They are informational events; joining and
campaign review remain in the Deeds tab.

Sovereign attackers and defenders with a live player-controlled campaign host may also
draw two ordinary wartime events. `ghw_pilgrims_under_arms` is a rare, effectively
once-per-campaign offer of 120 free levy volunteers. `ghw_swords_seeking_banner` may
return after four seasons and offers one 150-man mercenary company for 15 gold, 75
landless cavalry for 20, or 100 adventuring men-at-arms for 25. Its cavalry label is
knights by default, horsemen for Muslims, and champions for pagans. Refusal is free.
Both events require `ghw_has_field_host`: the campaign must be active, the protagonist
must be validly participating in sovereign host mode, and the player host must still
be alive. Expedition and liege-service participants never receive them.

These recruits change only the current host. Their class count, `men`, and `size` rise
together, so battle power, siege rate, map display, and the host's home-territory
reinforcement ceiling update immediately. They use the normal live-composition logistics:
the default additions cost about 0.6, 4, 1.5, and 2 gold per season respectively before
campaign supply modifiers. No bonus is written to the vow or base muster; dispersal or
disbanding loses the recruits, and a later remuster starts from the ordinary composition.

Objectives are the target kingdom's counties controlled outside the caller's fold at
the call. They keep their normal owner and holder throughout the campaign.
`campaign.occupations[provinceId]` holds only temporary occupation, siege progress,
the progressing camp, the occupying host, and an in-flight fort-tier snapshot. An
uncontested qualifying camp gains
`clamp(combined men / (development × 27), 0.5, 2)` siege-days each day toward
`120 + development × 10 + 90 × fort tier`; idle work decays by one each season. Fort
work uses all same-camp hosts present, the ordinary three-times-garrison minimum, and
proportional seasonal fort attrition. Temporary occupation suppresses the captured
fort's block for the occupying camp, while defender recapture must breach it again.
Battles shift resolve by 10 and occupations by 5. Defenders win at
−100 resolve, when no sovereign attacker remains, or after eight years. Attackers
must occupy every frozen lost holy county, at least half the objective counties, and
60% of objective development. Only occupied counties transfer at settlement.

Contribution is keyed by participant realm, with the protagonist recorded as
`player`, and therefore survives character succession. Field winners earn
`5 + floor(enemy casualties / 100)`, surviving losers one; an occupation or recapture
pays `10 + development × 2` divided by friendly strength present. Every completed
campaign season gives one service point, and personal expedition events add one or
three.

Attacking volunteers carry explicit vows. `vowTerms` promises 4, 8, or 12 seasons and
names a `crown`, `sacred`, exact `duchy`, exact `county`, or `honor` desire, with an
optional close-kin beneficiary for duchy/county land. Launch marks valid liege and
expedition service as mustered; sovereign service is mustered only after a host
successfully rises. Service credit and terms survive succession. Renewal resumes both;
an inherited refusal records `declined` without a penalty. Remaining enrolled and
mustered until an earlier resolution fulfills the promise. Withdrawal before
fulfillment doubles the normal piety/prestige loss and records `broken`; later broken
vows reduce the vow basis by 15% each, floored at 50%. AI attackers receive personality-
shaped desires and terms; old records repair to deterministic defaults without drawing
RNG.

Player-participation campaign modifiers are detailed in
[modifiers.md](modifiers.md). A valid or renewed great-holy-war vow synchronizes
`Oathbound Host`; succession pending renewal, withdrawal, and settlement suspend or
remove it. The unfinished-vow multiplier, active campaign modifiers, and optional trait
effects all feed the shared withdrawal-cost API. Contribution bonuses use the shared
award API. The live player host also applies campaign supply use, march speed, battle
power, and seeded daily desertion; AI participants and ordinary-war modifiers remain out
of scope.

Only attacker victories open a settlement council. `js/settlement.js` owns the generic
serializable case and move resolution, while `js/holywar.js` discovers holy-war assets,
computes claim bases, and applies awards. Assets resolve in order: sovereign crown, one
captured sacred-site custody, complete duchies, then counties. The sovereign seat prefers
a captured sacred/high-development county without an intact local confirmation. A
kingdom still requires the de jure majority; otherwise a complete duchy makes a duchy,
and the fallback is a county. A duchy package excludes the seat and is split into
counties if any member has an intact local-confirmation claim.

Claims use the balance weights contribution `.25`, vow `.20`, occupation `.20`, right
`.15`, support `.10`, and office `.10`. Contribution is normalized within the attacker
camp. A fulfilled exact desire scores 1, a county inside the desired duchy `.75`,
unrelated land `.25`, and repaired neutral vows `.5`. Occupation is exact for a county
and fractional for a package. Rights cover exact fabricated claims, restoration
territory, and local confirmation. Development-weighted support is half faith and half
culture; office is 60% religious standing and 40% host/liege/expedition service. An
optional `FB.traitBonus(c, "vow", "claim")` scales the player's vow basis.

Each claimant may win at most one land asset, with the crown consuming that allowance;
custody remains available afterward. The leading weight may be accepted with
`acquiesce`. `press` rolls
`clamp(.35 + Diplomacy*.02 + margin*.75, .10, .85)`. `endorse` awards a named rival,
adds 15 player-relative Standing, and saves +.10 for the player's next eligible claim.
`terms` is available within a .15 deficit and guarantees the player either as a vassal
of a strictly higher-ranked proposed liege or for a one-time 50-gold payment. `object`
spends one of two standing points and rolls
`clamp(.30 + Diplomacy*.015 - leaderMargin*.75, .10, .75)` for the runner-up; the
challenged realm loses 10 Standing. A current AI religious head pre-blesses its preferred
sacred (or crown) claim; a player head may use `bless` once on a non-player claim.

Awards are collected before any ownership mutation and then applied crown-to-county in
one pass. AI winners receive campaign cadets. A same-faith current holder whose entire
vassal subtree fits the package is preserved and reparented; cross-boundary rulers
instead support a new local cadet and cannot pull uncaptured counties into the result.
Player awards reuse realm founding/relocation, and a still-eligible named beneficiary
is installed with `FB.assignRealmRulerCharacter`. A personal, beneficiary-free land
award retains the final accept/decline choice; decline creates the cadet and converts
service to honor. Sacred custody is stored on its awarded realm and pays the player
2 piety per season while their realm or a vassal holds it and its sovereign bloc still
controls a listed site. Sacred-loss clocks are recomputed when realm control or the
religious-head assignment changes; unchanged daily ticks retain that derived snapshot
without moving the saved loss date or its yearly guarantee boundary.

Intrigue captivity blocks a ruler from initiating an ordinary war, an independence
rising, or a great-holy-war call. An already-running war continues because capture does
not erase realm obligations or campaign state. While an AI sovereign remains captive,
its projected base host is multiplied by `0.8`; escape, ransom, release, captor death,
or captor succession removes that penalty.

## Raiding expeditions

Historical cultures (`norse`, `magyar`, `turkic`, `berber`, `andalusi`, `arabic`,
`baltic`, `gaelic`, `brezhon`) and pagan faiths (`norse_pagan`, `tengri`, `baltic_pagan`,
`slavic_pagan`, and all pagan traditions) possess the ability to launch raiding expeditions
against foreign counties (`FB.canRaid`, `FB.raidTargets`, `FB.calculateRaidSpoils`, `FB.executeRaid`).

Raiding does not declare a formal conquest war, nor does it occupy land permanently:

- **Expedition Range**: Overland baseline is 2 legs. `longships` unlocks deep overseas and
  upriver naval raiding (+4 legs and cross-water navigation). Navigational arts
  (`celestial_navigation`, `naval_logbooks`, `mariners_compass`) and cavalry innovations
  (`mounted_archery`, `cavalry_lances`) extend operational reach.
- **Expedition Strategies**:
  - *Swift Skirmish*: Rapid hit-and-run against rural settlements and herds. Minimizes
    casualty risks against fortifications; yields modest provisions, livestock, and coin.
  - *Deep Sack*: Full assault on core settlements, markets, and shrines. High gold bullion,
    luxuries, and captives; risks defender resistance/casualties against stone castles and
    inflicts severe devastation.
  - *Military Resistance & Route Combat Odds*: Raid expeditions do not fight target counties in isolation;
    the expedition marches sequentially along its passage route (`FB.raidMarchRoute`). If raiders pass through
    hostile foreign counties to reach an interior target, they engage in passage skirmishes against each
    intermediate county garrison:
    - County garrison composition: local levy (`dev × 18`), plus a dedicated fort garrison (×3.5 behind
      walls), plus the county's proportional share of its realm's field host
      (`host × county dev ÷ realm dev`). A poor border hamlet of a great kingdom is soft but yields
      little; a one-county petty realm defends home with its whole host. The target list and map
      picker display the effective defenders under the chosen strategy (a Deep Sack faces the full
      garrison with fort multipliers; a Swift Skirmish faces 35% at the target), matching the
      combat-odds risk label.
    - Raiders fight the first intermediate county, suffering casualties.
    - Surviving remainder forces advance into the next intermediate county to fight its defenders.
    - If repelled at any intermediate county along the march, the entire expedition is turned back with heavy casualties.
    - If the raiders successfully punch through to the final target county, the surviving warband conducts the main assault, with plunder scaling to surviving host strength.
  - *Casualties & Troop Loss*: Casualties suffered across all skirmishes during raids are deducted directly from the player's home
    county population and levy pool (`FB.changeCountyPopulation`). Severe losses or repelled expeditions trigger
    an army rearm recovery period (`state.armyDown.player = state.turn`); the rearm ramp starts from the
    expedition's surviving strength fraction (`state.armyDownSurvival`, keyed to the down-turn so a later
    shattering never inherits a stale floor) instead of the 0.15 shattered-host floor, so the musterable
    host reflects what actually marched back. Repelled raids yield zero plunder,
    inflict prestige loss, and give prestige to the defending sovereign.
- **Multi-System Impact**:
  - *Fortifications & Zone of Control*:
    - *Passage Blockage*: Active hostile fortifications (`FB.fortAt`, level $\ge 1$) project a zone of control. Raiders cannot march *through* an unbreached hostile fort to reach deeper interior provinces without first taking the fort, unless an unfortified overland bypass or coastal landing exists.
    - *Assault Resistance & Casualties*: Dedicated garrison forces operate with a $3.5\times$ force multiplier behind stone walls, plus $+55\%$ to $+220\%$ fort defense multipliers in Deep Sacks. Storming stone battlements inflicts steep baseline assault casualties ($12\%$–$18\%$ for Tier 1 up to $38\%$–$52\%$ for Tier 4) even upon victory, and repelled assaults suffer devastating slaughter ($45\%$–$70\%$ casualties). Swift Skirmishes avoid storming the keep to pillage outer manors with minimal losses.
  - *Buildings & Development*: Deep sacks have a chance to ruin standing settlement buildings
    (`state.buildings[pid]`) and reduce county development (`state.dev[pid]`).
  - *Population & Captives*: Drains target county population and yields captives. Captives may
    be settled as free/serf population in the raider's home county, bonded as household laborers
    (+workforce), or ransomed for gold.
  - *Market System*: Hauls away commodities matching the target's endowments and applies a
    severe 4-season market shock (`FB.addMarketShock`), disrupting victim production.
  - *Diplomacy*: Reduces Standing with the victim sovereign by 25 and leaves retaliatory grievances.
- **Expedition Interface & Map Targeting**: The Raiding modal provides a unified `.raid-target-toolbar`
  with strategy selector dropdown, search filter, and a dedicated **Select on Map** action:
  - *Target List*: Each candidate row summarizes the march route (e.g. `Passes 2 counties (1 fort)` or `Direct landing`), destination fort tier (e.g. `🏰 Stone Keep (Tier 2)`), garrison size, and combat risk assessment.
  - *Interactive Map Overlay*: When selecting on the map, reachable unfortified counties are illuminated with clean pips, while fortified counties display distinct square fortress badges with `🏰` emblems. Selecting a target renders the full dotted march path through intermediate counties, highlighting intermediate forts along the march route and displaying live spoils and defender counts in the floating `#raid-picker` card.
