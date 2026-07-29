# Papacy, Cardinals, elections, and schism

## Scope and historical abstraction

Catholic leadership is both a personal elective office and a territorial institution.
`state.religiousHeads.catholic` remains the compatibility pointer to the realm controlling
the Roman office and Papal States. `state.papacy` owns the people, elections, authority,
policies, sanctions, and rival obediences behind that pointer. Other religious heads keep
the ordinary religious-head rules.

The calendar milestones are gameplay abstractions grounded in the Vatican's
[history of the College](https://press.vatican.va/news_services/press/documentazione/documents/cardinali_documentazione/cardinali_documentazione_generale_en.html),
the [1179 election decree](https://sourcebooks.fordham.edu/source/lat3-elect.asp), the
[1274 conclave reform](https://www.vatican.va/roman_curia/secretariat_state/card-bertone/2006/documents/rc_seg-st_20061207_habemus-papam_en.html),
and the [1122 Concordat of Worms](https://sourcebooks.fordham.edu/source/worms1.asp).
They model changing constituencies and thresholds without claiming that every medieval
election followed one uniform constitution.

`data/papacy.js` centralizes the College target and cap, candidate requirements, Roman
title churches, cardinal orders and blocs, election laws and tactics, Papal-name seeds,
authority gates, Abbot and Bishop appointment chances, investiture policies,
excommunication costs, schism limits, and Papal income. Game logic belongs to
`js/papacy.js`, with household religious progression in `js/economy.js`.

## Bishoprics and investiture

The Catholic monastic and clerical ladders end in eligibility for office rather than a
purchased promotion. Abbot or Abbess uses a contested election with a 360-day refusal
cooldown. A Bishop candidate must be a living Catholic man, unmarried or widowed and not
betrothed or excommunicated, at least 30, an Abbot or Archpriest with fourteen vocational
years, Learning 12+, and backed by 160 piety and 80 prestige. The initial player route is
limited to gentry or below; gaining later lay titles does not strip an existing see.

`state.papacy.investiture` selects the appointing authority through the candidate's
independent sovereign. Lay investiture relies on the liege, canonical investiture on the
recognized Pope, and concordat averages Standing with both authorities. The chance begins at 45%, adds
up to 15 points for Learning above the threshold, 4 points per permanent lay-standing
step, and a Standing term of up to ±20 points from the policy's appointing authority; it
is clamped to 20–90%. An optional 50-gold cathedral endowment adds 15 points, capped at
95%. Failure begins a 720-day
candidate cooldown. A failed ordinary petition has a 15% chance to queue a separate
200-gold simony offer; accepting appoints the candidate but gives the permanent Simoniac
reputation and damages piety, popular standing, and Papal relations.

Appointment saves a personal `character.bishopric` containing the see county, appointment
turn, appointing authority, appointer id, and investiture policy. The abstract see supplies
6 gold per season, a 120-person episcopal household, two Bishop focuses, four church powers,
and a Bishop event pool. It is non-hereditary and creates no province ownership or realm
node. If its holder later inherits secular land, both offices coexist. Cardinals retain
their bishopric; a Pope vacates it. Death likewise returns the see to the Church, and a
see-only dynasty successor continues as gentry with the family's private property.

## Cardinals

A living Catholic man who is unmarried or widowed, not betrothed, already holds a
Bishopric, is at least 35 with Learning 14+, and is backed by 250 piety, 150 prestige,
and Standing with the Pope +25 may petition for the red hat for 25 gold. Refusal starts a saved
720-day cooldown.

Cardinal is an appointed personal office, never a purchased ladder rank. It sets social
station 4 and replaces the Bishop's seasonal religious yield with 3.5 piety, but grants
no county, realm node, or secular tier. Cardinals and Popes cannot court, marry, or
complete a queued wedding. Existing children and family links are unchanged.

The target College has 12 Cardinals and a hard cap of 18. A Pope may hold one consistory
per year and appoint up to two candidates while below target. One appointment from the
Pope's dynasty is tolerated each pontificate; every later relative costs 5 authority
and 10 Curial opinion with each non-family Cardinal. These Cardinal-to-Cardinal election
relationships are pairwise and remain distinct from player-relative Standing.

Every Cardinal is a full `state.chars` character with an order, bloc, Roman title church,
relationships, residence, gifts, travel, and mortality. Appointees before 1100 relocate
to their Roman title; later appointees may retain an overseas home. From 1150 the oldest
Cardinal becomes Dean and the best steward becomes Camerlengo. Dead unrelated Cardinals
leave social rosters and become compact `state.papacy.archive` entries. A dead person
needed by the player's genealogy remains as a minimal deceased character.

## Vacancy and election

The Papal States never use dynastic succession. The Pope's death starts an election in
that obedience and leaves its Roman territory under the Camerlengo. Existing saves
migrate without replacing their incumbent Pope.

| Years | Saved election law |
|---|---|
| through 1058 | Simple-majority Cardinal ballot plus two of clergy, Roman people/nobility, and imperial-patron assent |
| 1059–1178 | Cardinal Bishops establish the first shortlist; all orders vote by simple majority |
| 1179–1273 | All orders vote equally; two thirds are required |
| 1274 onward | Ten-day vacancy, enclosed conclave, equal votes, and a two-thirds threshold |

Each ballot saves every elector's vote, lean, score, and relevant opinion. The player
Cardinal chooses one tactic per ballot: private negotiation, doctrinal appeal, a saved
benefice promise, secular backing before enclosure, or withdrawal and endorsement.
Scores combine relationship, Learning, Diplomacy, piety, bloc affinity, culture,
promises, and backing; uncertainty always uses the saved RNG.

After six failed ballots, elections from 1059 onward may introduce a qualified outside
Bishop or Abbot as a compromise. A player must remain a Cardinal to be elected. After
twelve ballots, a non-schismatic election forces support toward the leading compromise.
The winner chooses a historic Papal name with the next saved numeral or retains their own
name. Bookmark-specific name counts prevent every campaign from restarting at “John I.”

## Authority and governance

Each obedience has authority from 0–100:

- 0–24 disputed
- 25–49 contested
- 50–74 established
- 75–100 commanding

The 867 Roman obedience starts at 65 and the 1066 obedience at 55. Authority 25 enables
justified sanctions and formal investiture demands, 50 enables arbitrary sanctions and
Catholic great holy wars, and 55 enables a general council. Accepted reform, obeyed
justified sanctions, and reunification raise authority. Defied commands, arbitrary
sentences, repeated nepotism, loss of Rome, and decisive Papal defeats lower it.

The Papacy screen exposes consistories, ruler audiences, legations, recognition bargains,
investiture demands, excommunication, queued absolution petitions, councils, and the
existing Catholic great-holy-war call. AI Popes use the same gates and costs at conservative
yearly frequencies.

## Investiture and excommunication

`state.papacy.investiture` stores one policy per independent Catholic sovereign; vassals
resolve through that sovereign. Lay investiture gives +5% tax and realm strength and costs
a sovereign player 1 piety per season. Canonical investiture gives −5% tax and strength
and +2 piety. Concordat is neutral and gives +1 piety. Formal Papal demands begin in 1075;
concordat becomes available in 1122. A non-sovereign player petitions their liege rather
than changing the realm policy.

Recognized grounds are attacking the Pope or Papal States, occupying Rome, refusing a
lawful investiture ruling, or defying an accepted reunification. A justified sentence
costs the issuing obedience 100 piety and has a two-year per-target cooldown. An arbitrary
sentence needs 50 authority, costs 300 piety, removes 12 authority, and further harms
Standing with Catholic rulers. Only realms recognizing the issuer apply the −25 Standing,
−10% strength,
marriage/diplomacy penalty, and Catholic great-holy-war exclusion.

Sentences are personal and keyed by target plus obedience. Death clears them. Absolution
requires peace, a rank-scaled offering, 100 piety for a player petitioner, and remedy or
penance for the saved cause. When the player is Pope, qualifying AI petitions arrive as
ordinary queued events and may be accepted or refused.

## Durable schism

A rival obedience may form after ballot nine only when authority is 30 or lower, both
leaders command at least one third of the College, and a top-quartile Catholic sovereign
will sponsor the runner-up. AI sponsorship has a saved 25% crisis roll; an eligible player
sponsor receives a mandatory choice.

Each active obedience owns its claimant, authority, College, supporters, sanctions,
election, and strongest patron. Independent Catholic sovereigns publish one saved
obedience and vassals inherit it. Rival claimants live at their patron's court until
taking Rome. Capturing Rome changes the territorial Roman claimant but does not by itself
erase the rival obedience.

Changing obedience costs 150 piety and 100 prestige, damages relations with former
supporters, and starts a five-year cooldown. A Cardinal moves Colleges with the realm.
Papal actions and sanctions affect recognizing realms only. A schism cancels a gathering
Catholic great holy war and blocks new calls; an already launched campaign completes from
its saved caller snapshot. Other faiths are unaffected.

A claimant with at least three Cardinals and two sovereign supporters receives a successor
election on death; otherwise the obedience collapses. Reunification may follow submission,
overwhelming recognition, loss of the last patron, or a council after ten years. A council
may recognize one claimant or depose all claimants and elect an outsider. A deposed player
may submit as a retired former Cardinal or resist while retaining Rome or a sovereign
patron; the saved obedience persists until neither support remains.

## Player continuity and saves

Election to the Papacy uses the ordinary abdication handoff: inheritable secular land and
titles pass intact to the lawful heir, while the personal Bishopric returns to the Church.
Enterprises, holdings, manor, and land plots are suspended in
`state.papacy.custody`. Portable gold and heirlooms remain with the Pope. A Roman Pope
receives Papal States revenue; a landless rival receives a small patron stipend.

At the player's death the relevant College starts its own election, while play resumes as
the currently lawful living dynasty successor at that character's actual political status.
That successor may inherit the handed-off realm through the normal royal-line absorption.
Without a lawful dynasty successor, the ordinary game-over path remains.

`FB.ensurePapacy` is an additive version-1 migration. It recognizes the current Catholic
head realm's ruler as incumbent, generates a date-appropriate starter College, seeds
regnal counts, and preserves the incumbent until death. Save/load can occur during a
vacancy, ballot, name choice, schism, sanction, or policy dispute without special handling.
