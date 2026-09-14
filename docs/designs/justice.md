# Ruler justice

Territorial barons and higher rulers can arrest local characters and sentence
prisoners. Player and AI use `js/justice.js`; evidence never substitutes for
physical custody. Named battle prisoners and private abductees can be sentenced
only by their actual captor. Anonymous raid captives are not character prisoners.

## Authority, evidence, and capture

Justice list and character-sheet return paths restore focus and scroll after
the modal's deferred autofocus, only while the intended sheet is still present.
Cancelling a review returns focus to the action that opened it.

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
