# Piety, intrigue & diplomacy

## Targeted claims and alliances

Plots may carry a selected target in `player.plot.context`. The landed
count-and-above `fabricate_claim` plot selects one bordering foreign county not already
covered by a de jure right and stores `{pid}` through discovery and resolution. It needs
14 plot power; its chance is
`clamp(0.30 + intrigue*0.03 + learning*0.01 + prestige/1000, 0.10, 0.90)`.
Success creates the player's single persistent fabricated claim. Failure creates none
and costs 5 prestige. The claim follows the county through ownership changes, survives
succession and failed wars, can be abandoned, and is consumed only when its county is
successfully conquered.

Defensive alliances complement pacts but do not replace them. AI crowns may form rare
same-faith-group neighbor alliances; independent player kings and emperors may offer an
adjacent sovereign king or emperor an alliance at Standing 60+, spending 25 gold and
using the ordinary envoy chance. A successful neighboring sovereign royal marriage is
the other player route. Each realm may have one ally, partners cannot attack one
another, and a compact ends when either stamped ruler generation changes.

**Piety, intrigue, and diplomacy are active systems.** Piety is spent on blessings (the
`seek_blessing` event sets `blessed_crops`/`blessed_war`/`blessed_union` flags the engine
reads and consumes, sells an anointing against sickness, and offers three pure-effect
spends — the clergy's good word with your lord (`opinionLiege`), masses for the family
dead (prestige and popular opinion), and a blessing upon your house (spouse Standing)).
The `give_alms` deed closes the loop, turning gold into piety (with a little popular
opinion) so the temple's services stay within reach.

The `convert_faith` deed is the largest discretionary piety spend: adopting another
faith costs piety scaled by scope (self, household, realm) and by the relation-graph
distance to the target, while `adopt_culture` spends prestige the same way. Both carry
heavy Standing, popular-opinion, unrest, and (leaving the Papal fold) excommunication
penalties. See [conversion.md](conversion.md).

**Piety also backs household religious standing.** The player resource is the house's pool
of reputation and support, so it gates the advancement of the player, a spouse, or a
dependent child; the candidate's age, Learning, and years in the vocation remain personal.
Gold pays for alms, journeys, study, or an optional cathedral endowment, while piety is
normally a threshold rather than a spent currency. Lay and vocation standings are both
retained and displayed, but `FB.livelihoodPiety` uses only the higher seasonal yield. A
Cardinal's office replaces both; non-player clerical careers retain their underlying career
contribution as well. See [characters.md](characters.md) for the Catholic and Muslim paths.

Catholic Abbot and Bishop are appointments rather than purchased ladder steps. Abbatial
election weighs Learning and long lay standing. Episcopal appointment requires age 30,
fourteen vocational years, Learning 12, 160 piety, 80 prestige, celibate availability, and
standing as an Abbot or Archpriest. The realm's investiture policy determines the appointing
authority and modifies support; Standing with the Pope contributes under canonical or concordat
settlements. A cathedral endowment raises the chance without buying certainty. A Bishop's
see adds seasonal temporalities and a 120-person household retinue, plus diocesan visitation,
ecclesiastical judgment, a synod, and an extraordinary tithe. Those church powers coexist
with homage, Estates, construction, feasts, and liege military service, but replace generic
baron court, tax squeeze, monopoly, title-petition, private-war, and independence actions.

A Catholic ruler who confirms a sacrilegious war against the active Papacy forfeits all
current piety and creates a recognized ground for excommunication. Papal sentences are
personal and tied to the issuing obedience. Recognizing realms apply the Standing,
realm-strength, marriage, pact, and great-holy-war penalties; death clears the sentence.
Absolution requires peace, a rank-scaled offering, piety, and remedy or penance for the
saved cause. Investiture policy likewise belongs to each independent Catholic sovereign:
lay, canonical, and post-1122 concordat choices trade tax and strength against seasonal
piety. Authority gates formal demands, arbitrary sanctions, councils, and Catholic great
holy wars. A campaign-founded branch without an explicitly retained Catholic office has
no Papal obedience and cannot seek Papal absolution, even when it remains `in_fold` with
Latin Christianity. See [papacy.md](papacy.md).

Intrigue runs on plots: `FBDATA.plots` (map_data.js) + the Scheming
focus accrue power with discovery risk, then a resolution event fires (`plot` named
chance — for plots with a personal victim it adds the target's `opinion/500` to success;
options end with `{custom:'plot_end'}`). The Scheming focus is the repeatable source of
Intrigue growth; the repeatable Locked Chest payout does not also train the skill that
speeds and strengthens its next attempt. Diplomacy has envoys buying
non-aggression pacts (`state.pacts`, honored by the AI and by `FB.warTargets`),
oath-brotherhood, and quarrel mediation — one ending for the **interactive rivalries** a
slighted character can declare after real hostile contact, whose visible feud heat escalates
toward claims and knives or is bought off by compensation, a witnessed oath, common cause,
or a duel (see [events.md](events.md) and [characters.md](characters.md)). An independent count or duke also has two points
of **political attention**, a king three, and an emperor four. Each point can maintain an
Improve or Provoke direction toward one adjacent sovereign court. The direction persists
in `player.foreignPolicy` and changes Standing with that realm’s ruler at every
season boundary; Diplomacy increases the seasonal amount. War suspends a direction until
peace, while a pact leaves it active because the pact—not Standing—is the hard guarantee
against attack.

The first political-content tranche raises the core catalog from seven to twelve plots.
The five targeted additions use existing state rather than a parallel intrigue model:

- `feudal_obligation` targets the current liege’s exact `obl` record. Evidence gives the
  next redress vote a bounded bonus; immediate relief moves the ordinary aid one step and
  costs coin, prestige, and Standing.
- `guild_monopoly` targets one instance-stamped `contractId`. It may end that exact charter
  through the monopoly invalidation API, preserve it for compensation, or defend it for
  guild support at a Common Voice cost.
- `council_counter` targets one seated, cold-Standing schemer. Exposure, leniency, and a
  manufactured charge all resolve through existing seats, Standing, and authority.
- `diplomatic_correspondence` targets one living sovereign court already reachable through
  adjacency, a direction, a pact, or an alliance. Its choices move Standing, may extend a
  live pact, or reinforce Provoke without declaring war.
- `rival_claimant` requires the real active rival and a real claim, office, Council, ruling,
  or royal connection. It never manufactures a replacement rival.

Every targeted plot copies only stable semantic ids and narrowly scoped validity stamps
into `player.plot.context`. The target is revalidated while weaving and again by
authoritative outcomes. Death, realm extinction, contract replacement, lost office, or
institutional change ends the plot rather than retargeting. Discovery now offers a
tailored abandonment consequence, paid containment that loses power and raises later
discovery risk, or an early lower-odds attempt. Its modal repeats the exact target label
and available identity card. The player still has one plot and one Scheming focus; there
is no intrigue currency or agent roster.

Diplomatic slot-day stories use reusable context selectors for Improve, Provoke, active
pacts, and active alliances. Twelve stories cover arbitration, safe conduct, concrete
compact offers, insults, tolls, deniable riders, bounded pact/alliance requests, renewal,
domestic concessions, and counterpart succession. Their ordinary effects expose gold,
prestige, piety, Common Voice, and skill tradeoffs; `standingRealm` changes only the
player-relative score for the selected `realmId`. They never create pairwise AI opinion.

Counterpart succession queues an occasional first-embassy or compact-review story only
when the player is a related sovereign neighbor. The queued context stamps the exact new
`rulerGeneration`; a further succession invalidates it. A predecessor’s Standing still
disappears; a materialized heir may retain only Standing already earned with that exact
person. Alliances still expire through their generation stamps, and state-level pacts
still follow their saved expiry. Prose cannot inherit or revive any of them.

Foreign Standing uses the existing player-relative `player.liegeOps` backing store and the
canonical typed `FB.standingOf` / `FB.adjustStanding` facade. The historical
`FB.realmOpinionOf` / `FB.adjustRealmOpinion` names remain compatibility adapters; this
is not a realm-to-realm matrix. Standing shifts
envoy success and multiplies the annual chance that an adjacent AI realm attacks the
player, but never forbids war. All predecessor Standing and political directions clear on
protagonist succession; state-level pacts do not.

An ordinary player war caps Standing with the enemy ruler at −60 (Hostile) when
hostilities begin. This applies to offensive and defensive wars, including rebellion and
defection, through the canonical typed Standing facade. It is a one-time declaration
consequence rather than continuing decay, and peace does not erase the grievance.

**The realm interaction card is the diplomatic counterpart surface.**
`FB.foreignPolicyTargetStatus`, `FB.envoyStatus`, and
`FB.allianceOfferStatus` expose the owning mechanics' capacity, adjacency,
rank, resource, Standing, pact, alliance, and war gates together with exact
costs and odds. `FB.realmWarCauses` narrows the existing lawful-cause list to
one realm without creating a second war system. Its read-only path projects
the saved religious-head assignment, including an old save's bookmark default,
without repairing that office while a card renders. The UI shows these
projections in stable order and
routes to the existing policy, envoy/alliance, and war pickers; those paths
remain the only mutation and confirmation authorities.

Personal attention and foreign-policy capacity remain separate commitments.
Cultivating a ruler uses the ordinary character visit and personal-attention
mechanics, while Improve/Provoke consumes political attention and advances only
at season boundaries. Pacts, alliances, rivalry, courtship, and feudal
obligations remain distinct state even though every relevant sheet displays
the same typed Standing value.

Finance uses the same economic core across faiths. The UI selects complete culturally
appropriate partnership phrases (including qirad and commenda) without a blanket
allowed/forbidden interest rule. Relationship loans remain event territory; the always
available Finance deed offers explicit pledge, merchant, and revenue contracts instead.

Related: [events.md](events.md) for named chances, [war.md](war.md) for what pacts block,
and [finance.md](finance.md) for contract forms.

## Expanded hostile intrigue

Hostile setup remains one `player.plot` and the Scheming focus, but now selects an exact
target, one authored method, and an optional same-sovereign accomplice. Assassination,
abduction, blackmail, fabricated charges, and sabotage use the shared preview and seeded
resolution APIs in `js/intrigue.js`; ordinary plots keep their event definitions and old
math. Personal victims may be any living named non-self character in the actor's
sovereign realm. Cross-border action is limited to the existing rebel sponsorship and
sabotage of an immediately adjacent foreign border county.

Scheme-specific method names inherit one of three shared profiles: careful is slower but
adds 10 success points and removes four annual exposure points; bought access begins at
`5 + 5 * target station`, then multiplies by `balance.rankAccessCashCostMult` for every
target station beyond the actor's ordinary one-rank reach. It runs at 1.2 speed and adds
five success points; forceful runs
at 1.5 speed, loses five success points, adds ten exposure points, and lets Martial join
Intrigue in progress. The review sheet shows the resulting exact odds, duration, cost,
and exposure before confirmation.

Assassination uses the authoritative character-death and succession paths. Abduction
creates one durable captive per abductor. Blackmail creates the actor's one exact
two-year leverage record. Fabricated charges remove the stamped office, Council seat,
claim/restoration right, or landed foothold where it still exists, otherwise they lower
the target at the direct liege's court. Sabotage applies `covert_sabotage` for 720 days.
No outcome retargets when a person dies, moves courts, loses office, or succeeds to a
different generation.

Evidence, not a flat failure penalty, controls consequences. Suspicion damages Standing;
testimony, material proof, or capture red-handed queues a lawful hearing. The authority
is the victim's direct lawful lord or sovereign. Severity begins at one for blackmail
and sabotage, two for false charges and abduction, three for attempted murder, and four
for a proven killing, with political and sacred victims aggravating it. Player execution,
deposition, mutilation, exile, imprisonment, forfeiture, or outlawry occurs only after
the hearing decision. Latin, Byzantine, Muslim, and customary forms select fines,
penance, prison, monastic exile, blinding/deposition, diya/qisas, wergild, outlawry, or
execution from one mechanical ladder.

The regional presentation follows the historical institutions the ladder abstracts:
[the National Archives on treason](https://www.nationalarchives.gov.uk/whats-on/exhibitions/treason-people-power-plot/)
and [medieval outlawry](https://www.nationalarchives.gov.uk/help-with-your-research/research-guides/outlaws-outlawry-medieval-early-modern-england/),
[the British Museum on penance after Becket's murder](https://www.britishmuseum.org/blog/who-killed-thomas-becket),
[Harvard on Byzantine political blinding](https://dash.harvard.edu/entities/publication/31093e1f-6c00-409c-928f-b15083378cf6),
and [Cambridge on qisas and diya](https://assets.cambridge.org/97805217/92264/excerpt/9780521792264_excerpt.htm).
They inform names and sentencing forms; the bounded severity ladder remains the shared
game mechanic.

AI rulers receive the same odds and outcomes through a six-record bounded seasonal pool.
Annual agency starts no more than two, no more than one player-facing, with one scheme per
actor, no duplicate lethal/abduction target, and a four-year actor cooldown. A murder or
abduction attempt against the protagonist or managed household always pauses at a clue
event before final resolution. Investigation, paid security, and a counter-trap can
identify, weaken, or cancel it; ignoring it preserves the lethal possibility.
