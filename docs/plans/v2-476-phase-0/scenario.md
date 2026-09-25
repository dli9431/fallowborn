# First 476 scenario: a federate household at Ravenna

Status: Phase 4 prototype implementation. Historical anchors are sourced below;
player, unit, bargain, timing and resource amounts are design fixtures. The
implemented behavior and remaining research are in
[the owning design](../../designs/situation-476.md).

## Starting state

Open at year 476, spring, day 1 on the game's existing 360-day calendar. Historical
month/day dates are narrative anchors, not literal offsets into that calendar.
Deposition has not happened. The authored first-year pressure window occurs
later in 476 and remains conditional on living actors, command and control.

The protagonist is a free adult of 24, serving in a small federate detachment
near Ravenna. The household has no county, settlement lordship, civil jurisdiction,
hereditary political title or right to collect taxes. It has ordinary personal
property and a service relationship. The player's initial social station is a
period-authored free commoner; command must not require a fake Gentry title.
Initial personal balance is 20 game gold; these units are balancing values, not
historical solidi. Family generation remains the existing player-family system.

The soldier path is selected because the first promotion can be an appointment
without a fief. The opening objective is to secure the household's pay and a
recognized place in the settlement. Colonus dependence and a curialis's civic
liabilities remain later paths, rather than three incomplete openings.

| Actor/institution | Spring 476 facts to represent | Scope and implementation consequence |
| --- | --- | --- |
| Romulus Augustulus | Western imperial office at Ravenna; installed by Orestes | Italy's imperial institution and civil appointments; no personal mastery of every host |
| Orestes | Military strongman and father of Romulus | Initial military command distinct from the imperial office |
| Odoacer | Leader among the soldiers in Italy; future acclamation is not pre-completed | Federate negotiating counterpart; command support can change without a county grant |
| Julius Nepos | Displaced western emperor based in Dalmatia | Territorial control and a rival western claim remain separate |
| Basiliscus | Incumbent at Constantinople after displacing Zeno | Initial eastern imperial officeholder and possible issuer of recognition |
| Zeno | Displaced eastern claimant; historical restoration later in 476 | His recognition carries his own claim and support; do not start him in control of Constantinople |
| Roman Senate and Ravenna civic delegation | Civic constituencies for this designed negotiation | Site/institution actors; neither receives a fabricated county or sovereign realm |
| Bishop of Rome | Church interlocutor independent of a medieval Papal States title | Spiritual recognition is distinct from territorial rule; personal cast requires period data |
| Euric's Visigoths | Relevant power in southern Gaul | External security and recognition context, not an automatic Italian belligerent |
| Gaiseric's Vandals | Relevant North African power | African coast and sea diplomacy; no initial religious population overwrite |
| Childeric's Franks | Northern Gaul context outside the opening corridor | Childeric, not an adult reigning Clovis, is the initial counterpart |
| Burgundian rulers; the two Theoderics | Further Gaul/eastern political context | Keep Gundobad's exact partition and Theoderic the Amal vs Strabo explicit research tasks before full bookmark authoring |

Romulus/Orestes/Nepos/Odoacer are anchored by the
[Anonymus Valesianus, latter part, 36–38](https://penelope.uchicago.edu/thayer/e/roman/texts/excerpta_valesiana/2%2A.html).
The spring eastern correction follows
[Hugh Elton's Zeno chronology](https://roman-emperors.sites.luc.edu/zeno.htm):
Basiliscus displaced Zeno in January 475; Zeno returned in August 476.
The table's allocation of gameplay powers is a design interpretation, not an
assertion that the sources describe four modern authority categories.

## Existing map and eastern scope

Use the existing county ids ravenna, pavia, roma, split, constantinople,
toulouse, arles and tunis where their geographic extent fits the period.
These county ids are spatial anchors, not assertions that their 867 names,
faiths, populations, lieges or de jure jurisdictions existed in 476.

Salona belongs near the existing split county; it is a distinct physical site
from Split. Carthage lies in the tunis area; it is a distinct site from Tunis.
Phase 4 must author/verify their actual sites and coordinates rather than rename
one physical site into another. Kairouan's later city must not be copied into the
476 settlement layout merely because its county polygon is retained. The first
prototype uses Ravenna and Pavia and requires no disputed boundary resolution.

Constantinople and the existing eastern counties are sufficient for on-map
imperial identity, location and diplomacy. Zeno's displaced court needs a separate
location/claimant record; selecting an exact Isaurian site is a Phase 4 research
item. Off-map parts of an imperial claim may be described, but cannot supply
invisible tax, population, troops or instant reinforcements. Replies are bounded
political decisions from the current named issuer, not a worldwide simulation.

## Office and recognition decisions

The initial definitions needed by the slice are the western and eastern imperial
offices, Orestes' military command, and a scoped federate detachment commission.
The last is a gameplay abstraction: its displayed historical title requires an
explicit source before publication. Civic and episcopal representatives can
negotiate without acquiring a secular barony. Office definition ids are neutral;
period display labels are translated independently.

The player may claim the vacant detachment commission through service and peer
support. On acceptance it permits orders to that host only. It grants no county,
tax, civil court or hereditary succession. Losing the patron or the commission
reopens its terms rather than silently transferring land or disinheriting the
household's private property. Confirmation names appointer and expiry conditions.

Recognition sources are separate records: army acclamation, imperial commission,
succession claim, civic acceptance and church support. An army may accept Odoacer
while a civic body withholds consent to requisitions and an emperor continues to
recognize Nepos. No averaged score erases that disagreement. Church support can
help civic acceptance but never appoints the commander automatically.

476 faith data must represent Nicene and Homoian/Arian differences and the eastern
Chalcedonian dispute, with no Islam or automatic medieval Catholic/Orthodox
political map. This is a content requirement, not a license to replace actual
county/site community partitions with the ruling elite's faith. Exact shares,
doctrine ids and biographies require Phase 4 sourcing. Roman civic/legal identity
and ruling elite identity are additional facts, not culture substitutions.

## Connected sequence and choices

The following bounded fixture specifies observable outcomes. Numerical terms are
provisional tuning defaults, but must be explicit in the later scenario data and
preview. Amounts come from the institution's treasury, never from county conquest.

| Step | Player decision | Observable result |
| --- | --- | --- |
| 1. Soldiers seek a spokesman | Accept service as delegate, remain in ordinary service, or refuse involvement | Acceptance records a role only. Refusal leaves a viable personal livelihood and the political crisis continues through AI counterparts. |
| 2. A disputed command | Seek the vacant detachment commission; accept a limited appointment or support another candidate | Appointment records character, issuer, host and term. The player can issue that host's orders while remaining landless; another candidate can hold it instead. |
| 3. Arrears and service | Negotiate with Orestes' institution or support Odoacer's counter-offer | A reviewed federate contract names debtor, payees, service host, due dates, expiry, recognition and proposed settlement scope. A refusal moves the crisis toward contest; no retroactive treasury debit. |
| 4. Civic bargain | Present a revenue-funded offer to the Ravenna delegation, revise it, or demand settlement by force | Civic consent can accept scoped obligations without giving the commander civil jurisdiction. Refusal leaves civil rights contested and makes force a separate choice with consequences. |
| 5. Imperial recognition | Petition the eastern incumbent, back displaced Zeno, or uphold Nepos' western claim | The issuer supports/refuses a named claim or commission. Restoration/deposition invalidates stale reviews and triggers authored reaffirmation rules. Recognition alone transfers no land. |
| 6. Court and host movement | Escort the negotiating court between Ravenna and Pavia; ask for maintenance or a concrete settlement award | Movement uses existing routes. A court's location neither transfers a county nor grants unlimited requisition. Receiving settlement needs a reviewed, scoped grant. |
| 7. Resolution | Ratify the negotiated settlement or fight the contested campaign and review its peace | Contracts, offices and recognition settle independently; only explicitly awarded places change holders. Romulus may survive in office, be deposed, or remain a claimant according to the actual outcome. |

The first negotiating fixture starts the debtor institution with 120 gold, with
30 immediately offered to the federate body and 10 per season for four seasons;
the body allocates 2 of each scheduled payment to the player's household. Those
2 gold are part of the 10, never an additional debit. The term is 360 days. An
unfunded immediate payment blocks confirmation; a later missed payment records
breach once and permits renegotiation, departure or contest. Cash and any revenue
assignment are alternatives with itemized terms, not a hidden duplicate income.
Final balance tuning follows the existing economy and does not claim a historical
pay scale. The command commission has the same explicit term in this fixture;
renewal is a new decision, never implied hereditary inheritance.

A settled court may receive maintenance without gaining the county. A proposed
land award identifies a real eligible site and its current holder. Lack of an
eligible site leaves a cash/revenue negotiation available. Existing inhabitants,
communities, ordinary property and non-awarded lordships survive either route.

## Required outcome traces

**Negotiated:** obtain the commission without land; agree affordable pay; win
civic consent; receive or be refused explicit imperial recognition; escort the
court; ratify. The host obeys its commander, civic courts retain jurisdiction,
and pay comes from the named payer once. Romulus can remain emperor while
Orestes' command is constrained. A player declining the commission can still
complete the bargain as delegate; an NPC commands the host.

**Contested:** refuse/breach terms; support an alternative commander; move a
real host along real routes; resolve battles and Ravenna control; review peace.
Odoacer's acclamation and Romulus' deposition occur only if their living actors
and political/military conditions support that outcome. The victorious force
must still settle pay, land and civic obligations. Military victory alone does
not grant church or imperial recognition. Defeat permits continued household
play through surrender/service/recovery rather than requiring campaign restart.

**Interrupted:** kill or replace an appointer, payer or claimant during a review;
reload during negotiation or after payment; change the county holder while the
court is travelling; convert the protagonist without converting the city.
Stale quotes cannot charge or appoint. Existing obligations follow their explicit
institutional continuity terms. Completed payments, deposition and grants never
replay. No absent actor is resurrected to meet a historical date.

The calendar pressure toward the historical deposition supplies a situation,
not an unconditional event that erases a negotiated outcome. The later 489–493
and Justinian chains are Phase 5 content, not requirements to finish this slice.

## Historical source notes and open research

- [Procopius, Gothic Wars I.1](https://penelope.uchicago.edu/Thayer/E/Roman/Texts/Procopius/Wars/5A%2A.html)
  supplies the soldiers' demand, Orestes' refusal and Odoacer's rise. It is a later
  narrative. Use the dispute as an anchor, not an automatic transfer of one third
  of every county or a precise household accounting formula.
- [Anonymus Valesianus, 36–38](https://penelope.uchicago.edu/thayer/e/roman/texts/excerpta_valesiana/2%2A.html)
  supports Nepos' flight to Salona and Romulus' deposition and survival. The page
  includes textual/chronological problems; do not import its literal reign lengths
  as game dates. Its bias and retrospect require corroboration for detailed cast.
- [Hugh Elton, Zeno](https://roman-emperors.sites.luc.edu/zeno.htm) establishes the
  eastern displacement/restoration sequence. This overrides the parent plan's
  shorthand placing Zeno in Constantinople at the spring start.
- [Bury, Later Roman Empire, chapter XII](https://penelope.uchicago.edu/Thayer/E/Roman/Texts/secondary/BURLAT/12%2A.html)
  discusses western recognition and eastern claimants. This older synthesis is a
  guide to the competing claims, not authority for precise contract terms.
- [Euric reference entry](https://wehd.com/bios/Euric.html),
  [Childeric reference entry](https://en.wikisource.org/wiki/1911_Encyclop%C3%A6dia_Britannica/Childeric)
  and [Gaiseric reference entry](https://en.wikisource.org/wiki/1911_Encyclop%C3%A6dia_Britannica/Gaiseric)
  anchor the surrounding cast provisionally. Detailed borders, co-rulers, dynasty
  links and dates need modern regional scholarship before Phase 4 data authoring.

Research still required for publication: exact Burgundian partition; Gothic
leadership and eastern offices at the chosen spring date; the local Ravenna civic
and episcopal cast; physical Salona/Carthage sites; army numbers and recruitment;
476 community identities and distributions; and the interpretation of military
land/revenue settlement. Fictional negotiators must be labeled as generated
characters, never given an invented historical attestation.

Technology review for this design: service, ordinary commission, civic consent,
recognition, contract renewal and recovery do not require research. The later
implementation must record each independently gateable capability in the ledger;
advanced techniques may improve it only under a separate justified review. No
technology data or gameplay gate is changed by this Phase 0 document.
