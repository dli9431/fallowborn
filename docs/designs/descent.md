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
an ending. Returning through an ordinary rank claim pays that rung's full recognition
cost again; the old title is remembered, but investiture is not permanently prepaid.
All knobs live in `FBDATA.balance`; all ruinous custom handlers
carry deep-negative entries in `CUSTOM_FX_SCORE` (`js/ui_modals.js`) so
automation endures, pays, or resists — it never sells the family down.
The extraordinary captive-raid chain is the deliberate exception to the
one-rung pacing: only repeated failed escape choices reach its final scene,
where bondage is the certain survival option and death is disclosed before a
last voluntary gamble.

## The hollow crown (tiers 5–7): the title lapse

Ransom, submission tribute, bought peace and attainder fines credit the named enemy
or liege through the treasury transfer boundary. Existing affordability checks and
compulsory shortfalls are preserved; releasing the prisoner or ending the war owns
the once-only payment boundary.

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

AI crowns get the complementary rule: not a timed lapse, but **recognition**
— an AI king keeps the royal style while he holds any county in his de jure
kingdom (rival kings may coexist), and the world restyles his house at its
true dignity the moment he holds none (`FB.checkCrownRecognition`; see
`docs/designs/realms.md` — *Crown recognition*).

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
shows its remaining grace in Coin & Credit and may still be settled there in
full. Once it is older than `distraintGraceDays` (90), the creditor may open
the writ (`finance_in_default`):
`distraint_writ` offers to **pay** (`distraint_settle`), to **yield goods**
(`distraint_yield_one` — one asset quietly against the balance), or to
**stall**, which serves the writ (`distraint_seizure`). The bailiffs
(`distraint_seize`) take holdings at their cost value, then land plots at
`FB.landPlotCost`, cheapest first, until the book-debt is covered — items
are never distrained, matching `loseAllLand`'s rule that personal treasures
stay sacred. The writ scene defines distraint in plain language and lists the
live debt, holdings, plots, and station consequence before the player chooses.

If nothing remains to take and the debt still stands, one station-specific
last claim follows. **The Manor Forfeit** (`manor_forfeit`) clears a gentry
house's debt, removes its manor (`p.manor` nulled), and casts it down to
freeholder. **Bound to the Land** (`bondage_sentence`) clears a freeholder's
debt and makes the family serfs. **Labor for the Debt**
(`debt_labor_sentence`) clears a serf's debt through extraordinary demesne
labor and a prestige cost without inventing another status beneath serf.
Each scene also permits **flight** (`bondage_flee`), which preserves the
current tier but carries the debt and default to a new parish. Submission in
all three scenes resolves through `bondage_submit`. `gentryGeneration`
survives the fall: the house stays *established*, so the climb back is
shorter than the first.

## Raid capture & forced settlement (non-rulers, tiers 0–2)

The rare `historic_raid` chain models people as plunder rather than treating
commoner capture like a noble's ransom interlude. Its pure context selector
freezes a culture/faith-based raider profile and captor county, while two
successive scenes give the player clean or property-sacrificing escapes. Only
a failed pursuit reaches the captive column. Submission there invokes
`raid_enslave`: loose coin and immovable household property are stripped, the
whole playable household is moved to the recorded captor county, and any
gentry or freeholder station falls directly to tier 0. Culture, faith, family,
portable armory items, and the house's remembered peak remain intact, leaving
a severe new beginning rather than a disguised game over. The alternative is
an explicitly lethal final escape attempt; its success still pays
`raid_plunder`, and its failure records raid death provenance.

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
| 2→0 | Capture and forced settlement after a slave raid |
| 1→0 | Debt bondage, the protection bargain, capture and forced settlement |
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

Final downfall aftermaths briefly distinguish retaining rule, fleeing after defeat, and surviving an attack while losing the seat; exact land and station losses remain in the outcome chips.

## Breaking the sovereign peace

An unlawful vassal campaign costs 20 Standing with the enforcing liege and creates
one demand to stop within 90 days. Compliance ends only that campaign. Refusal
permits an enforcement war: occupying the defiant ruler's seat ends the offending
campaign and costs the offender 50 prestige, without automatic forfeiture. When
the underlying campaign ends, enforcement loses its cause. This capability has
technology impact none. Captivity now carries `player.captiveWarId`; unrelated
peace cannot release that campaign's prisoner. Older saves bind captivity to their
existing player campaign without consuming randomness. Health, authority, and
escape checks run once per season, regardless of the number of concurrent wars.
See [war.md](war.md).

## County support and revolt spread

Commons demands select the least supportive directly held county. Refusal starts
one local warning, rather than inventing warnings in other held counties. Each
county uses its own support for warning recovery and tax/levy resistance. Active
resistance keeps its existing expiry, but spreads only from a county at or below
-20 support to an adjacent realm county also at or below -20. Every newly joined
county retains its separate petition, warning, and expiry. Healthy neighbors
interrupt spread without erasing unrest elsewhere.


## Armed county revolts and scaled settlements

At -50 support or worse after the 90-day warning, a county musters half its
potential population levy; the fraction rises linearly to the whole potential
levy at -100. Potential levy excludes support and occupation penalties so
complete refusal cannot make the rebel muster zero. Buildings supplying levies
are included. Each county raises once per uprising, with no passive replacements.

AI counties discover grievances at -20 monthly and receive the same warning.
Each holder attempts local talks after 30 days; failed talks leave the warning
running. At severe support, the warning becomes an armed rebellion. AI rulers
can also attempt a costly response to an armed uprising. No player event choices
or player funds are consumed for an unrelated AI realm. Player-subject revolts
appear in the player's existing grievance sheet. The player's own subtree is a
response jurisdiction even when the player serves a higher sovereign; other AI
counties group by sovereign. Sovereigns and direct holders muster to defend.

Unarmed resistance still has its ordinary expiry. Armed revolts persist until
settlement, military defeat, or independence. Hosts share a faction within their
uprising, merge when stationary together, and are hostile to all other factions.
They ignore supply drain and receive no passive reinforcement. The shared fort
siege checks and garrison casualties apply on 30-day pulses. Rebel home counties
are the first targets; an occupied county opens adjacent negative-support
counties in the same jurisdiction as additional targets. Those counties join the
territorial uprising, but cannot raise their own host until a 90-day warning has
elapsed and support is at most -50. Occupied counties contribute no tax or levy.
Other armies can recover occupations using the same siege checks.

When every joined county is occupied, each connected component becomes an
independent realm under a newly generated ruler: one county is a count, multiple
counties a duke. Existing transfer helpers handle titles, lost player land,
capitals, and technology inheritance. When the last rebel host is destroyed,
occupation ends and affected counties receive a two-year revolt cooldown.
Support does not change from military defeat; unjust-war debt remains.

Response severity is summed over affected counties: 1 unit at -20, 3 at -60,
5 at -100, continuing above 5 for deeper resentment. Concessions cost 180 gold
per unit, talks 120, and suppression 150, plus 20% of current gold and 10% of
current positive prestige once per response. Costs remain spent on failure.
Talks use Diplomacy with a five-percentage-point penalty per average severity
unit above one. Suppression starts at 65% with the same severity penalty; both
have a 10% floor. Successful suppression lowers each county's support by 20;
failure lowers it by 30. A battlefield victory has no such additional penalty.

Settlements preserve the demanded privilege and impose five years of -25% tax,
-25% levy, and +10 support in every affected county. They do not erase unjust-war
debt. Partial local talks cannot dissolve a merged armed uprising; military peace
must cover its complete roster. AI fiscal responses, since AI has no treasury,
apply -35% county tax and -15% levy for one severity-year per county (1.5 for a
concession), capped at ten years, in addition to settlement concessions.

Technology impact: `local_commons_uprisings` remains **none**. Armed resistance,
AI participation, and political independence are baseline consequences of rule;
research does not prevent warning, revolt, or settlement. Existing privileges
retain their approved terms. `local_commons_settlements` remains ungated.

County modifier queries repair only their requested list; full-store repair stays
at load and modifier-tick boundaries. Expiry and annual unjust-war recovery remain
live reads. Boolean privilege eligibility scans active records directly without
building or sorting the display summary, so expiration and revocation take effect
immediately during revolt discovery.
