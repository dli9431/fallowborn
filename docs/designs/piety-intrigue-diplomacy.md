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
holy wars. See [papacy.md](papacy.md).

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

Foreign Standing uses the existing player-relative `player.liegeOps` backing store and the
canonical typed `FB.standingOf` / `FB.adjustStanding` facade. The historical
`FB.realmOpinionOf` / `FB.adjustRealmOpinion` names remain compatibility adapters; this
is not a realm-to-realm matrix. Standing shifts
envoy success and multiplies the annual chance that an adjacent AI realm attacks the
player, but never forbids war. All predecessor Standing and political directions clear on
protagonist succession; state-level pacts do not.

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
