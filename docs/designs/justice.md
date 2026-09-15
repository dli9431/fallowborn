# Ruler justice

Sentencing has a dedicated Sentence carried out modal with the prisoner's portrait,
actual effects, and expandable receipts. Continue or Back returns to the roster.
The roster and custody screens never embed result receipts. Successful arrests
still open sentencing directly; failed arrests return to the roster with a toast
and a notice naming and picturing the target and giving the retry date. The
notice stays with that roster view across search, sort, and review returns, and
clears on the next justice action or a fresh roster opening. Failure scrolls to
the top so the notice is visible.

Justice navigation is roster to arrest review, then sentencing after capture.
Selecting a sentence opens Review judgment with visible consequences and costs.
Only its named action applies the sentence and opens Sentence carried out.
Back from review returns to sentencing without mutation; Continue or Back from
Sentence carried out returns to the roster. Arrests retain their direct flow.
The Imprisoned group stays first in either rank direction and shows portrait,
name, title, recorded offense, and release date (or no date set). Closed offenses
may describe a prisoner's history; they never establish a new sentencing cause.
Search/sort and return position persist. Navigation is reset on settlement so
Back cannot reopen a completed action or an executed character.

All sentence previews and disclosures label Popular support loss explicitly.
Zero-cost justified actions say No loss — justified action; previously credited
penalties say No additional loss. Zero-change county ledgers are omitted.
Outcome receipts label actual changes as Popular support change per county,
or explicitly state no loss. These are changes, never approval levels or gains.

Custody details and all sentence buttons share one card beneath the prisoner.
Buttons use sentence names and open Review judgment; judgment, support, consequences,
money, and deadlines live in the hover/focus tooltip and touch Details disclosure.
Only blockers remain beneath buttons. Review judgment exposes all immediate terms
before its action commits the sentence. Details retain hover/focus and touch disclosures.
Unsentenced judicial detention is labeled Provisional custody ends, with an
explicit explanation that release follows after 90 days unless sentenced.
Imposed prison terms instead show Sentence ends. Evidence does not itself impose
a sentence or extend provisional detention.

The character's Arrest card contains offense/evidence above arrest odds and costs.
Justified arrests show Popular support: No loss — justified arrest. Unjust arrests
label the loss explicitly: 20 per directly governed county if caught, 10 if the
attempt fails. These are penalties, not current support levels; mechanics are unchanged.

The Governance entry uses the same normal-weight action label and shared
description styling as the other Political actions buttons, with a scales-of-justice icon.

The Justice roster uses compact character cards in a four-column desktop grid,
reducing to three, two, or one column on narrower screens. Each whole-card button
places the portrait beside current title, name, standing with the player, and
family relationship when applicable. Custody appears only for held characters.
Cards use content-sized heights, eight-pixel padding and gaps, and no repeated
Review label. The roster sheet widens to accommodate four readable columns.
Each tier has a labeled divider and its own grid, beginning on a new row.
Family and royalty share the first group by default, followed by dukes, counts,
barons, gentry, freeholders, and serfs. Lowest-title order reverses the groups;
A–Z orders names within each group. Empty groups disappear when filtered.
Hover/focus reveals the shared character card and offense evidence; a separate
touch Details button provides the same information. Expanded details survive review returns.
Justified arrest is a filtered sort option showing only projections with both
`ready` and `justified`: proven cause alone does not bypass custody, jurisdiction,
location, or cooldown blockers. It combines with search and retains highest-rank order.
Search remains separate from the sort selector: highest title first (default),
lowest title first, or A–Z, with name and identity breaking rank ties. Current
realm rank supplies ruling titles; other members use their character station.
Members of a living noble house use its recorded `royalLine.realmId` rank for
grouping and show House of the realm, rather than claiming its ruler's title.
Generic station-3 nobles without a recorded house remain with Barons and other
nobles. Display names never determine rank. Roster tooltips put offense/evidence
above the character card.
Sorting reorders existing rows and preserves search and focus. Review return
paths also retain the selected order and scroll position.
Roster entries never receive number or letter hotkeys; use Tab and Enter/Space
to review a person. The Governance entry remains a section action with a letter shortcut.

Territorial barons and higher rulers can arrest local characters and sentence
prisoners. Player and AI use `js/justice.js`; evidence never substitutes for
physical custody. Named battle prisoners and private abductees can be sentenced
only by their actual captor. Anonymous raid captives are not character prisoners.

## Authority, evidence, and capture

County support penalties apply only to the punishing ruler's directly held
counties (`justiceSupportCounties`), never to vassal-held counties. Barons retain
their local seat scope. Arrest jurisdiction, title authority and exile boundaries
still use the full territorial `justiceCounties` scope. Political standing losses
continue to reach subordinate rulers and the direct liege. This prevents a
vassal's local concession pressure from rising because of the liege's injustice.
Existing county support is not reset: older losses cannot be reliably separated
from unrelated local causes. This is a scope fix with no new technology gate.

Unjust punishment also lowers every subordinate ruler's and the direct liege's
standing toward the punishing ruler, including indirect vassals. The penalty is
half the support cost, rounded up in magnitude: imprisonment 10, exile 15,
forfeiture 18, blinding 23 and execution 30. Arrest charges 5 on the attempt and
5 on capture; subsequent imprisonment credits those charges instead of charging
twice. Justified actions and mercy carry no penalty. Standing clamps at -100.
Player relationships use ordinary Standing; AI relationships use ruler regard,
including vassal favor. Existing ruler-generation and succession rules apply.
Previews disclose affected rulers and outcomes report actual clamped losses.
This is a consequence/balance expansion, with no new technology eligibility.

Justice list and character-sheet return paths restore focus and scroll after
the modal's deferred autofocus, only while the intended sheet is still present.
Back from review restores the originating roster position without applying an action.
County support previews round displayed before/after values to whole numbers;
the simulation retains its underlying precision.
Justice uses compact status cards and standard bottom sheets. Legal explanations
live in shared header/card tooltips and touch disclosures; immediate consequences,
costs, deadlines, risks and blockers stay visible. Back preserves open disclosures.
Results show actual effects and a support range when county floors differ, with
the individual county ledger under Details.
Each decision card has a quiet border, parchment surface, 12px padding and a gold
heading. Desktop facts use aligned label/value columns; narrow screens stack
labels above values. A separated action row right-aligns desktop buttons and
uses full-width buttons on narrow screens, with at least 44px touch targets.
Sentence buttons keep only blockers visible underneath. Judgment, support costs,
consequences, money, deadlines, background rules, and county ledgers appear in
hover/focus tooltips and touch Details disclosures.
Actions live inside their terms cards; results appear in a separate sentencing result modal. Trait/ailment Back
restores the original Justice sheet. Execution results return to the Justice list through Continue or Back. Outcome totals combine both
arrest charges for each county before formatting the summary and ledger.

Open arrest requires the target to be physically inside the ruler's territory.
The player character's travel position takes precedence over their home. Other
characters use authoritative residence. Counts and higher rulers have authority
over their subordinate rulers, never peers, foreign rulers, or their own liege.
A baron's seat permits arrest of local non-rulers; barons do not gain ownership
of their liege's county. Physical capture through an existing abduction or war
is required to bring an otherwise inaccessible target into the ruler's power.

An exposed hostile scheme records the exact accused, victim, evidence, offense,
source, date, and competent authority. A ruler wronged personally hears their own
case; managed household victims belong to their ruler's court, otherwise the
direct county holder hears it. Testimony, material proof, and red-handed evidence
establish a cause. Suspicion and rivalry do not. Counter-traps catch agents and
establish evidence against the organizer; they do not teleport the organizer
into prison. Evidenced accomplices receive their own case.

Blackmail and sabotage have severity 1; abduction and false charges have severity
2; assassination attempts, completed murder, and established rebellion have
severity 3. Independence declarations, annual vassal breakaways, and resistance
to arrest register rebellion. Ordinary foreign war participation is not guilt.
Cases belong to the sentencing authority and pass with it at succession.

Arrest success is `clamp(0.60 + 0.02 * (ruler Martial - target Intrigue), .15, .90)`.
It uses seeded RNG. Failure grants 90 days of protection from that same ruler's
arrest attempts. A landed subordinate who escapes can start the existing
independence campaign; non-rulers remain at liberty. Wrongful arrest attempts
cost 10 county support, with another 10 on successful capture. Provisional
custody expires after 90 days unless a sentence is imposed.

## Sentences

Every punishment rechecks a living target, an eligible ruler, and that ruler's
actual custody immediately before mutation. A confined ruler cannot sentence.

| Sentence | Required severity | Unjust support loss | Effect |
| --- | --- | --- | --- |
| Release or pardon | None | 0 | Release; pardon closes all unresolved cases before this court. |
| Ransom | None | 0 | Accept available ransom and release without pardoning. |
| Fine/compensation | 1 | 10 | Collect the affordable fine and release. |
| Public penance | 1 | 10 | Lose 40 piety and 20 prestige; release. |
| Imprisonment | 2 | 20 | One year, crediting time served. |
| Exile/monastic exile | 2 | 30 | Lose local offices/titles; five-year ban and relocation. |
| Forfeiture | 3 | 35 | Local fiefs escheat to the sentencing ruler; release. |
| Blinding/deposition | 3 | 45 | Existing permanent injury traits and removal from rule; release. |
| Execution/qisas | 3 | 60 | Canonical death and succession. |

Any sentence within a proven offense's severity is justified. Excessive or
arbitrary punishment incurs its full penalty. Imprisonment credits the 20 support
already paid for an unjust arrest, so the initial arrest and prison term total
20 rather than 40. Executing that prisoner unjustly costs another 60. Extensions
are offered during the final 90 days of a term and add one year; they require a
new cause or another penalty. A sentence consumes its case, except release and
ransom. The same completed case cannot pay for multiple punishments.

Penalties affect each county in the ruler's territory, or a baron's seat county,
using the canonical support setter and its -100 floor. Actual clamped losses are
receipted. Existing taxes, levies, unrest, and annual 15% recovery read those same
values. No parallel tyranny currency or personal support stat is introduced.

The fine is `(severity + 3) * [5,8,12,20,30][station]`, with a minimum of 5 and
severity 1 when no cause exists. Payment is capped to available money and uses
the treasury transfer boundary for rulers and personal wealth for other people.
Ransom uses the existing station ransom table. No money is minted for an empty
prisoner's purse. Forfeiture uses the existing escheat boundary with an explicit
recipient, suppressing the ordinary heirless-estate scramble. It preserves the
sovereign owner and transfers local holdings, vassals, and treasury obligations.

Exile chooses the nearest reachable settled county outside the domain, with
sorted adjacency resolving ties. It removes local employment and offices and
excludes an exiled NPC from managed-household membership. The character remains
alive and related to their family. Voluntary journeys back into the sentencing
domain are blocked until the ban expires; exile does not create a permanent
hereditary disqualification. Foreign titles are not forfeited by a foreign captor.

## Regional forms

The authority's culture and faith determine presentation and regional options,
not the prisoner's identity. Latin courts offer public penance; Byzantine courts
offer monastic exile and blinding/deposition; Muslim courts offer diya and qisas
for proven killings, while attempted murder can still receive ordinary execution.
Customary courts use the shared compensation and exile sentences. These are
bounded gameplay abstractions, not a claim that all communities in a faith or
region had identical laws, or that every historical penalty required custody.

Historical references include [Byzantine political blinding](https://dash.harvard.edu/entities/publication/31093e1f-6c00-409c-928f-b15083378cf6),
[Islamic homicide and compensation](https://www.cambridge.org/core/journals/bulletin-of-the-school-of-oriental-and-african-studies/article/abs/homicide-in-islamic-law/C0B8615705DC0F723E3E538A4B63F8F2),
and [English outlawry and forfeiture](https://www.nationalarchives.gov.uk/help-with-your-research/research-guides/outlaws-outlawry-medieval-early-modern-england/).
The blinding implementation reuses the game's `one_eyed` and `maimed` injury
effects; it does not add a new medical simulation.

## Custody, AI, and compatibility

Judicial prisoners use the intrigue captive list with explicit authority,
provisional/term expiry, offense, penalty credit, and sentence history fields.
There is no one-prisoner judicial limit; private abduction keeps its existing
one-captive limit. Judicial prisoners inherit to the lawful successor, while
private abductions end at their captor's death. A vacant or dissolved authority
releases judicial prisoners. Dead-player custody remains saved while the owner
chooses the next protagonist, then reconciles with that successor.

Seasonal escape uses the existing intrigue escape roll. Ransom, escape, death,
expiry, and release invalidate pending sentences. A judicial sentence converts
war custody so neither war peace nor old ransom events can release that prisoner.
Legacy imprisonment only qualifies when a captor can be identified from its
saved authority or exact active campaign. No generic prison flag invents a captor.
Legacy hearings become cases and, if already in the competent ruler's custody,
a new response event; they cannot retain the old remote sentencing behavior.

AI runs once per season, in stable order, with at most two new justice actions
and one player-facing case. NPC arrest plus sentence occupies both action slots.
AI normally chooses compensation, prison, or a severe regional sentence by the
offense ladder. Cruel rulers have a 20% excessive-sentence chance, or a 10%
seasonal chance to pursue an existing rival without cause; arbitrary actions
have a four-year ruler cooldown. Rivalry still supplies no lawful justification.

Player arrest demands offer submission or seeded resistance. Captured-player
hearings offer evidence challenge, clemency, applicable compensation/penance,
and submission. These events cannot auto-resolve, including Resolve everything.
Failed pleas or challenges carry out the announced sentence, not a rerolled one.
The shared projection and mutation APIs are documented in `docs/MODDING.md`.

Technology impact is **none** for arrest, judicial custody, release/pardon,
fines/compensation, penance, imprisonment, exile, forfeiture, monastic exile,
blinding/deposition, and execution. Each independently gateable capability has
a `FBDATA.techImpactReviews` entry: these are baseline authority, religious,
personal, and recovery actions with no credible research dependency. Existing
ransom is reused, not newly gated. Save format remains 3; all additions are
additive. UI and Chronicle text use structured catalogs/message descriptors.
