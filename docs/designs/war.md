# Wars

## Causes and defensive alliances

Player offensive wars require a semantic cause. `FB.warCauses(state)` returns cause
records rather than unrestricted adjacent county ids. A new county war needs a bordering
county inside a de jure duchy, kingdom, or empire the player actually holds (the most
specific title wins), or the player's one fabricated county claim. Pacts and alliances
remain hard declaration blocks. `FB.warTargets` and string calls to
`FB.startPlayerWar` remain compatibility surfaces, while a new war stores the selected
record in `player.war.casus`. Old in-progress wars without that field keep their legacy
capture behavior.

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

`FB.sameFaithHeadWarPolicy` is the shared target check. It reads the exact attacker's
religion, the live office assignment, and `religion.head.sameFaithWar`; it never matches
realm names. Catholic player causes against the active Papacy remain legal when an
ordinary de jure, fabricated, or restoration cause exists, but the picker marks them
as sacrilege and opens a second confirmation. Canceling that confirmation changes no
state. Confirming starts the selected war, reduces current piety to zero, applies -40
opinion from every living Catholic realm, and adds the ruler's `excommunicated` trait.

Excommunication is visible on the ruler sheet and blocks the Seek a blessing deed.
Once the player is at peace and a living Pope holds the office, Seek absolution spends
100 gold and 100 piety, removes the trait, and restores 20 Catholic-realm opinion.
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

Alliances are defensive abstractions, not extra war parties. `state.alliances` stores
canonical realm pairs with their source and both ruler-generation stamps, and each realm
may have only one ally. Partners cannot attack each other; a ruler change expires the
compact. Peaceful neighboring same-faith-group sovereign kingdoms and empires receive a
rare yearly opportunity to ally. Independent player kings and emperors can instead
succeed with a 25-gold envoy at opinion 60+, or gain an alliance from a royal marriage
to the adjacent sovereign court.

When an allied realm defends, an available ally contributes 25% of its ordinary host,
capped at 50% of the defender's base host. The men are folded into the defending host's
levy but remain separately recorded for display. An ally already at war contributes
nothing. The same effective defensive strength informs AI targeting and abstract yearly
resolution; there are no allied hosts, calls to arms, chained alliances, or shared peace.

**Wars put hosts on the map.** `js/armies.js` keeps `state.armies`: one field host per
sovereign at war (levies, with hired mercenary companies folded into the player's), each
standing in or marching between provinces. AI sovereigns raise automatically when a war
starts (size = realm dev × `levyPerDev` × `balance.aiHostPerDev`); the player's host
musters the moment war begins — `FB.warFooting`, which every war-start path calls,
raises it — and the muster events that follow only decide whether it takes the field
with hired companies (`war_mercs`, `balance.mercCompanySize` men each) or a great levy
(`war_mass`, swelling the levy class by `balance.massLevyMult`) behind
it. A shattered host may muster again only after `balance.armyRearmDays`
(`state.armyDown`). A standing player host may also **de-muster** mid-war (Deeds tab):
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
single `warring` map (and hosts into a `hostByRealm` lookup) once per tick, so the daily
loops stay O(realms + armies) even with dozens of hosts on the map.

**A host is a composition, not just a headcount.** Every host carries
`units: { levy, arch, cav, ret, mercs }` (with `men` always the total, so every place that only
reads a number is untouched). The levy is the dev-driven mass — untrained foot raised for
the campaign; the **retinue** is the professional core of men-at-arms from war buildings
(`keep`, `barracks`), military technology, and a landed baron's standing household
(`balance.baronyRetinue`); **archers** come from archery-butts buildings and technology;
**cavalry** comes from national military technology;
**mercs** are the hired companies. `FB.playerComposition` (world.js) computes the player's
split — `FB.playerLevy` remains the total for callers that want a number — and AI hosts
start from `balance.aiRetinueFrac`/`aiArcherFrac`, then add the effective sovereign's
`fx.aiUnits` fractions; national `levy` bonuses also increase their muster, and there is
no global era step. `FB.techArmyMarchDays` applies the capped movement bonus to every
path leg, while ordinary and great-holy-war sieges use the capped sovereign siege bonus.
Technologies therefore change access, quality, composition, movement, and siege practice
without introducing additional unit classes. Each class fights at its own quality
(`balance.qualityLevy`/`qualityArcher`/`qualityCavalry`/`qualityRetinue`/`qualityMerc`,
read through `FB.compQuality`): cavalry has quality 2.0, men-at-arms punch far above their
numbers, and levy below. Battle casualties fall in the fixed order levy → archers →
mercenaries → cavalry → men-at-arms (`applyLosses` in armies.js), and a
resting host refills with fresh levy only — slain professionals are not replaced
mid-war, so a long campaign grinds a host down toward its peasant mass. Hosts from older
saves migrate in place (`FB.hostUnits`): their men count as levy but the hired companies.

**A raised host has composition-based seasonal logistics.**
`FB.playerHostUpkeepParts(state)` returns
`{base, levy, archers, cavalry, retinue, mercenaries, campaignModifier, total}` from the
live player host:
2 gold for the camp, then 0.5 per 100 levy, 1 per 100 archers, and 2 per 100
cavalry or men-at-arms. Hired companies retain their 4-gold contract each. The live unit counts
mean a great levy, defensive reinforcements, daily reinforcement, battle casualties,
and re-mustering all change the non-mercenary bill without stored economic state.
A missing host returns all zeroes, so a shattered or disbanded host costs nothing until
it is raised again. The season boundary charges the same bill for ordinary and sovereign
great holy-war hosts and clamps an underfunded purse to zero without disbanding the host.
`campaignModifier` is zero for ordinary-war-only hosts and records the signed supply
adjustment for a player host serving in a great holy war.

**Movement is daily and adjacency-based.** Orders set a BFS path (`FB.findPath` over
`FB.world.adj`); every leg, the first included, uses `FB.armyMarchDays` (the
technology-adjusted base, then any valid player campaign-speed adjustment), and the
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
Map invalidation follows visible host state: raising or disbanding a host, changing its
route, arriving in a county, changing allied levies, reinforcing, or fighting requests a
render. Intermediate march-day countdowns do not, because markers remain on the county
the host still occupies and there is no interpolated movement to draw.

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
Each positive `fx.warService` award also adds its exact value to Muster-Bred
acquisition progress; six points award the formation without changing the existing
service tally or its succession reset.

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

A loyal vassal at opinion 40+ may supply one bounded exceptional levy favor. Spending
15 favor records a one-year `player.vassalLevyFavors[realmId]` modifier and raises that
specific vassal's normal levy share by `balance.vassalLevyFavorRate`. It is itemized in
the same ledger and is separate from Royal Council authority or officer management.

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

Preparation lasts 180 days. Attackers must be exact-faith sovereign volunteers.
Sovereigns controlling frozen objective land are mandatory defenders; other
sovereigns from a religion group opposed to the caller may volunteer. Each camp has
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

Objectives are the target kingdom's counties controlled by another religion group at
the call. They keep their normal owner and holder throughout the campaign.
`campaign.occupations[provinceId]` holds only temporary occupation, siege progress,
the progressing camp, and the occupying host. An uncontested qualifying camp gains
`clamp(combined men / (development × 27), 0.5, 2)` siege-days each day toward
`120 + development × 10`; idle work decays by one. Defender work recaptures an
occupied county. Battles shift resolve by 10 and occupations by 5. Defenders win at
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
adds 15 player-relative opinion, and saves +.10 for the player's next eligible claim.
`terms` is available within a .15 deficit and guarantees the player either as a vassal
of a strictly higher-ranked proposed liege or for a one-time 50-gold payment. `object`
spends one of two standing points and rolls
`clamp(.30 + Diplomacy*.015 - leaderMargin*.75, .10, .75)` for the runner-up; the
challenged realm loses 10 opinion. A current AI religious head pre-blesses its preferred
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
controls a listed site.
