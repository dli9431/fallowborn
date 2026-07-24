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
adjacent sovereign king or emperor an alliance at opinion 60+, spending 25 gold and
using the ordinary envoy chance. A successful neighboring sovereign royal marriage is
the other player route. Each realm may have one ally, partners cannot attack one
another, and a compact ends when either stamped ruler generation changes.

**Piety, intrigue, and diplomacy are active systems.** Piety is spent on blessings (the
`seek_blessing` event sets `blessed_crops`/`blessed_war`/`blessed_union` flags the engine
reads and consumes, sells an anointing against sickness, and offers three pure-effect
spends — the clergy's good word with your lord (`opinionLiege`), masses for the family
dead (prestige and popular opinion), and a blessing upon your house (spouse opinion)).
The `give_alms` deed closes the loop, turning gold into piety (with a little popular
opinion) so the temple's services stay within reach. Intrigue runs on plots: `FBDATA.plots` (map_data.js) + the Scheming
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
