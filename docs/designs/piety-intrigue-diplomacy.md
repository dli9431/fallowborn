# Piety, intrigue & diplomacy

**Piety, intrigue, and diplomacy are active systems.** Piety is spent on blessings (the
`seek_blessing` event sets `blessed_crops`/`blessed_war`/`blessed_union` flags the engine
reads and consumes, sells an anointing against sickness, and offers three pure-effect
spends — the clergy's good word with your lord (`opinionLiege`), masses for the family
dead (prestige and popular opinion), and a blessing upon your house (spouse opinion)).
The `give_alms` deed closes the loop, turning gold into piety (with a little popular
opinion) so the temple's services stay within reach.

**Piety also backs household religious standing.** The player resource is the house's pool
of reputation and support, so it gates the advancement of the player, a spouse, or a
dependent child; the candidate's age, Learning, and years in the vocation remain personal.
Gold pays for alms, journeys, study, or endowment, while piety is normally a threshold rather
than a spent currency. Every attained rank may add a small seasonal piety contribution through
`FB.livelihoodPiety`; non-player clerical careers retain their underlying career contribution
as well. See [characters.md](characters.md) for the Catholic and Muslim paths.

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
in `player.foreignPolicy` and changes that realm’s opinion of the current ruler at every
season boundary; Diplomacy increases the seasonal amount. War suspends a direction until
peace, while a pact leaves it active because the pact—not opinion—is the hard guarantee
against attack.

Foreign opinion is the existing player-relative `player.liegeOps` store, exposed through
`FB.realmOpinionOf` / `FB.adjustRealmOpinion`; it is not a realm-to-realm matrix. It shifts
envoy success and multiplies the annual chance that an adjacent AI realm attacks the
player, but never forbids war. Opinion and political directions clear on succession;
state-level pacts do not.

Finance uses the same economic core across faiths. The UI selects complete culturally
appropriate partnership phrases (including qirad and commenda) without a blanket
allowed/forbidden interest rule. Relationship loans remain event territory; the always
available Finance deed offers explicit pledge, merchant, and revenue contracts instead.

Related: [events.md](events.md) for named chances, [war.md](war.md) for what pacts block,
and [finance.md](finance.md) for contract forms.
