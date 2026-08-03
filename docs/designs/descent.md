# Descent — the way down

The ladder goes both ways. Alongside every promotion path the game carries
descent mechanics, each grounded in a real medieval process and each driven
by a **player decision or a sustained pattern of neglect** — never a bare
dice roll. The shared template is the `df_*` downfall chain: flag-staged
escalation, a paid or skill escape at every stage, and the fall arriving
**one rung at a time** where the ladder allows it. `FB.setPlayerTier` is
fully bidirectional and revalidates career, travel, focus, and monopolies on
the way down, exactly as on the way up. `state.peakTier` is never lowered,
restoration rights and re-promotion keep working: a fall is a chapter, not
an ending. All knobs live in `FBDATA.balance`; all ruinous custom handlers
carry deep-negative entries in `CUSTOM_FX_SCORE` (`js/ui_modals.js`) so
automation endures, pays, or resists — it never sells the family down.

## The hollow crown (tiers 5–7): the title lapse

A dignity above count rests on substance: the duke's duchy majority, the
king's kingdom majority **and his independence**, the emperor's two kingdoms
— the exact rules `FB.checkTierPromotions` promotes by. The same function
now checks the other direction with hysteresis: below the requirement it
stamps `player.titleLapse {tier, since}`; after `titleLapseWarnDays` (180)
it queues the `hc_hollow_crown` warning event once (`warned`); after
`titleLapseDemoteDays` (540) the style falls **one** rung
(`titleLapsePrestigeCost` 40, news `news.world.title_lapsed`, realm restyled
by `FB.foundPlayerRealm`). Meeting the requirement again at any point clears
the stamp. The warning's escapes — a paid show of force or a risky progress
(`hc_defy`) — restart the window. Because kingship and empire require
independence, a crowned head who swears fealty (or kneels in war, below)
lapses to duke within the window.

On demotion, vassal realms whose rank is no longer below the player's new
rank (`tier−3`) cannot kneel to a peer: they reattach to the player's own
liege, or go independent with a notice (`news.world.vassal_loosed`) when the
player bows to no one. Below tier 5 there is no lapse: a count's rank *is*
his county, and losing that has its own paths (war, attainder, downfall).

## The loser's homage (war, tiers 4–7): submission

A defender whose enemy outranks him and outweighs him
(`FB.realmStrength` ≥ `submissionStrengthRatio` 1.5×) and whose war is all
but lost (enemy siege clock at 2, or one defeat from breaking) is offered
`war_submission_offer`, once per war (`FB.maybeOfferSubmission`, called from
the seasonal war tick and `FB.warOutcome`). **Bend the knee**
(`war_submit`): the war ends, every acre stays in hand, and the victor
becomes the liege — the historical homage of beaten kings. **Buy the peace**
(`war_submission_tribute`, priced `submissionTributePerRank` × enemy rank).
**Fight on**: the war continues under the standing rules. The offer dies
with its war (`contextValidator: war_submission_valid`).

## Felony & attainder (vassals, tiers 3–5)

Defying the liege leaves a mark: ignoring the banner call
(`liege_summons`) or flatly refusing the estates' aid demand
(`parliament_aid_hike`) sets `felony_mark`. While Standing with the liege
runs at or below `attainderStandingGate` (−30) the mark is prosecuted
(`attainder_risk`): the two-stage `attainder_summons` → `attainder_sentence`
chain. Mercy costs `attainderFineByTier` (`attainder_pay` — clears the mark,
repairs Standing); the customs can be pled (skill chance); defiance advances
to the sentence. At the sentence: **yield** (`attainder_yield`) and the
fiefs escheat to the liege through `FB.loseAllLand`'s existing vassal branch
— a baron simply loses his place — or **resist** (`attainder_resist`), which
raises the player's banner in a defensive independence war against the old
sovereign. The marks live in `player.flags`, so succession buries a pending
attainder exactly like a `df_*` slide.

## Capture & ransom (war, tiers 3+)

A beaten leader of tier 3 or more may be taken in the rout
(`FB.maybeCapturePlayer`, called from `FB.fns.war_loss`): base odds
`captureChanceBase` (0.35), softened by Martial and Intrigue (great captains
slip the noose). Capture sets the long-dormant `in_prison` flag — which
already blocks travel, retirement, and trade ventures — and queues
`prison_ransom`. The captor's price is `ransomByTier`; the options are to
**pay** (`prison_pay`), to **sign over a border county** (`prison_cede_land`
— and the last county casts the family down to landless gentry through the
same tail as `FB.warLoseProvince`), or to **rot a while**. A prisoner leads
from a cell: the seasonal war tick queues no war council while the flag
stands — the war drifts without orders — while health bleeds (never below
1), crown authority decays, and each season offers a release chance
(`ransomSeasonReleaseChance` 0.2, plus Intrigue). Peace opens the cell too:
`FB.endPlayerWar` frees the prisoner with a notice. Commoners are robbed,
not ransomed — the mechanic stays tier ≥3, as it was in the chronicles.

## Distraint & debt bondage (commoners, tiers 0–2)

The old road into serfdom runs through debt. A loan in `default` status
older than `distraintGraceDays` (90) opens the writ (`finance_in_default`):
`distraint_writ` offers to **pay** (`distraint_settle`), to **yield goods**
(`distraint_yield_one` — one asset quietly against the balance), or to
**stall**, which serves the writ (`distraint_seizure`). The bailiffs
(`distraint_seize`) take holdings at their cost value, then land plots at
`FB.landPlotCost`, cheapest first, until the book-debt is covered — items
are never distrained, matching `loseAllLand`'s rule that personal treasures
stay sacred. If nothing remains to take and the debt still stands, the
bondage court sits (`bondage_sentence`): **submit** (`bondage_submit`)
clears the debt and binds the family — a freeholder becomes a serf, a gentle
family loses its manor (`p.manor` nulled) and falls to freeholder, a serf
works the debt out in the lord's fields (prestige cost only, the floor of
the ladder) — or **flee** (`bondage_flee`), which keeps tier and freedom but
carries the debt and the default to a new parish. `gentryGeneration`
survives the fall: the house stays *established*, so the climb back is
shorter than the first.

## Devastation & the protection bargain (war, commoners, tiers 0–2)

A hostile host standing in a commoner's **home province** — checked through
`FB.armiesHostile` against the home county's sovereign
(`FB.hostileHostAtHome`) — burns the season's peace at
`devastationChance` (0.4) per season (`FB.devastationSeason`, called from
the seasonal tick). `devastation_raiders`: pay to cart the goods into the
woods, or trust to luck and risk a holding (`devastation_lose_holding`).
Two burnings (`home_burned` → `home_burned2`, fading one step per safe
season) bring the local lord's offer (`devastation_protection`), freeholders
only: **commend the family** (`devastation_commend`) — tier 1→0, safety for
freedom, and `lord_protection` suppresses further burnings — or stay free
and exposed. The chevauchée and the commendation wave, as one mechanic.

## The descent ladder

| From → To | Paths |
|---|---|
| 7→6, 6→5 | Hollow crown (majority or independence lost), submission, fealty while crowned |
| 5→4 | Hollow crown (duchy majority lost) |
| 4→2 | Attainder yield, defensive war, ransom cession of the last county, `df_*` |
| 3→2 | Attainder yield, bishop release (existing) |
| 2→1 | Debt bondage (manor lost) |
| 1→0 | Debt bondage, the protection bargain |
| any→2 | `df_*` catastrophes (existing), `FB.loseAllLand` (existing) |

The mechanics interlock into organic spirals rather than isolated checks:
capture → ransom → debt → distraint; devastation → poverty → debt →
bondage; defiance → felony → forfeiture; over-extension → lost provinces →
hollow crown. Succession wipes the flag-borne slides (`player.flags`) but
not `titleLapse`, which belongs to the house's substance, not the person.

Related: [realms.md](realms.md) (tiers and the hierarchy),
[war.md](war.md) (the war systems), [finance.md](finance.md) (loans and
defaults), [holdings.md](holdings.md) (commoner property),
[events.md](events.md) (the chain template).
