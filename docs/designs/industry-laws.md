# Targeted operating laws

Market stalls can be subject to optional, council-approved local operating terms.
No campaign starts with an enacted law. In the 1204 London setting, a qualified
local council member can open **Propose a council motion**, review London stall
permissions, and submit the ordinary seeded annual council vote. The same sheet
offers repeal of retained laws. Browsing and cancellation spend nothing. A
submitted vote uses the existing annual session and one deed day, whether it
passes or fails. It never takes property or charges an operating fee.

The London declaration is a game-scale reconstruction of differentiated trading
privileges. John's charter of 17 June 1199 confirmed London citizens' toll
exemptions; his April 1200 instructions allowed foreign merchants to trade while
paying customary dues. These are discussed with primary references by the
[Magna Carta Project, clause 41](https://magnacarta.cmp.uea.ac.uk/read/magna_carta_1215/Clause_41?com=!all).
The simulation uses household residence as an explicit, visible proxy for civic
privilege. Residence was not historically equivalent to citizenship. The fee of
2 per 90 days, thirty-day transition, annual duration and council approval are
simulation choices, not a transcription of a London licensing ordinance. The
existing county controller's public treasury represents the recipient; the game
does not create a separate municipal treasury or a historical sheriff.

## Contract and transactions

`FBDATA.industryLaws` is a bounded typed definition table. Display text belongs to
the referenced ordinary `localCouncilMotions` definition, using its existing
localization owners. `FB.industryLaws.definitionFaults` validates bundled and
detached JSON candidates without changing content, people, RNG or identities.
The independent `industry-laws-river.json` example supplies fictional paid and
prohibition alternatives, with different terms and beneficiaries through the
ordinary Mods file picker.

`quoteMotion(state, definitionId, repealId?)` is read-only. `validMotion` rechecks
the exact actor, local seat, controller, account, date, council chance, affected
property and retained laws. `FB.proposeLocalCouncilMotion` routes these proposals
through the same `FB.resolveLocalCouncilVote` owner as ordinary ordinances.
Successful approval alone creates or repeals a law. The law records the original
issuer's character and realm, county, enterprise type, frozen terms, original
public payee, dates and existing-property transition roster. Failed or stale
reviews cannot spend money, consume RNG or create a receipt. An actually
submitted losing vote consumes its ordinary session and seeded roll.
An unexpired suspended law must be repealed or expire before the same definition
can be enacted again; a change of controller cannot duplicate that saved term.

`operation(state, enterprise)` is the shared permission projection. `quoteOperation`
and `commitOperation` review and apply payment, pause, closure and resumption.
Existing staffed businesses have the declared lawful grace period. Afterward,
an unpaid or prohibited business produces no income, physical output or upgrade
benefits unless the owner explicitly authorizes deliberate violation under a law
with supported offense terms. Its assignments and property remain. Work & Enterprises → business
manager → **Review operating laws, payments and closure** discloses fees, payee,
deadlines, exemption, payment receipts and the free pause/closure choices.
Paid worker contracts continue until ordinary dismissal or their existing
unpaid-wage lifecycle ends them.
The management entry and new pause/closure transactions are confined to the
declared enterprise and county in the applicable campaign, or a retained law's
scope. Unrelated trades, counties and opening dates keep their existing screens.
Staffing plans and worker previews retain the enterprise UID and share its
permission checks; paid coverage remains visible in projected earnings, while
unpaid, prohibited or voluntarily closed operation has no projected output.

`FB.enterprisePurchaseStatus` includes the actual permission fees in the setup
total and exposes its `industryQuote`. `FB.acquireEnterprise` and `FB.buyEnterprise`
recheck that quote when supplied, all normal purchase gates and the complete
price before allocating property. Auctions also use this acquisition owner and
cannot override a prohibition with a winning bid or technology grandfathering.
Auction bid options disclose the combined winning price and permission fee;
insufficient funds or a stale permission review reject before advancing the bid.
`FB.treasuryHouseholdPurchase` preflights every original public account, debits
the combined private price once and credits each actual payee. Purchase fees and
later renewals issue one saved paid permit per law and enterprise. There is no
automatic renewal, permission debt, refund or review charge. A judicial fine can
leave a separate personal balance, described below.

## Lifecycle and saved identities

The optional `state.industryLaws` schema-1 ledger contains `laws`, `permits` and
`choices`, plus optional folded `retired` totals described under Settled history
retention. It is absent until the first commitment; restore never initializes it.
Paid permits bind a stable enterprise UID and the household account `player`.
They follow that property through household succession; changing a worker does
not transfer the obligation. A different enterprise UID never inherits a permit.
The supported enterprise owner is the player household. There is no NPC business
inventory or external business-sale transaction; a future external transfer must
review the new owner's permission separately while retaining original paid facts.
The public payee can be an AI-controlled realm, and both acquisition and renewal
use its actual account. No autonomous NPC business simulation is implied.

Issuer ruler succession and departure of the original councillor leave the law,
payee and permits intact. Loss of the issuing realm's county control suspends
future restrictions and fees; recovery of control resumes the remaining original
term. It never redirects an existing receipt to a conqueror. A current competent
local council can repeal a suspended predecessor's law. Expiry and repeal remove
future restrictions and fees without refunding or deleting paid obligations.
The original issuer and repeal issuer remain distinct saved facts.

Save validation checks exact effective terms, original issuer/payee references,
dates, supported record fields, unique identities, nonoverlapping paid windows
and receipt amounts. Missing legacy ledgers remain valid; present malformed
ledgers and changed imported content reject before adoption. Matching load,
re-save and reload preserve paid resources, property, RNG and UID without replay.

Technology impact `targeted_industry_laws` is **none**: these are ordinary political
and economic obligations. Purchase and expansion research requirements remain
with the enterprise owner. Optional offense terms support a bounded fine and an
explicit operation-closure remedy, subject to the canonical court boundary below.

## Affected-interest hearings

Two additional London proposals in the 1204 campaign use the same law ledger and
economic transactions: **London market levy hearing** and **London market
restriction hearing**. The former charges 3 per 90 days and exempts London
residents; the latter prohibits operation for 180 days without exemptions.
The earlier London stall permission and ordinary ordinances retain their simple
seeded session. Definitions explicitly opt into deliberation with `voting`.

The town entry is **Bring a motion before the council → Operating-law hearings
and ballots**. It needs an existing eligible local council seat in London, current
territorial-government consent and civic consent. A trading bench has weight 2
and a civic-notable bench weight 1. Living local guild members in the targeted
enterprise profession and existing civic representatives supply principals where
available; the current commercial or administrative councillor can represent
their corresponding bench. Other professions do not acquire a trading vote.
Otherwise the bench is explicitly bounded county representation, not a named
historical guild delegate. No new people, property or guild office are generated.

The Estates entry is **Governance → Institution → The Estates → Operating-law
hearings and ballots**, also available from the existing Estates sheet. Only
current sworn landed members of the county controller's political court can
propose. Existing direct noble houses supply influence, capped at 10 each, with
at most 128 houses; a larger court fails closed. Guild status never adds an
Estates seat. This adapter covers only a county directly controlled by that
court, not all land in its kingdom, subordinate courts or a municipal fiscal
office. Both native proposals affect London only, during 1204–1215; imported
definitions can declare another supported county and date range.

Both consumers reserve their existing annual hearing without money or a deed
day. Opening enacts nothing. Pending participants may support, oppose or abstain
through their own current principal; proposals may be withdrawn before settlement.
Withdrawal and rejection retain the spent hearing. Town hearings last 30 days,
require half the eligible influence to cast a vote and more than half the cast
weight to support. Estates hearings last 40 days, require 8 percent of eligible
influence to vote, a majority of cast influence and the controlling court's own
support. Abstentions count toward eligible influence but not votes cast. These
are game rules, not reconstructed medieval numerical procedures. The lower
Estates quorum permits county-specific business while unexposed houses abstain;
it does not grant them fictional trading assets to produce participation.

Trading interests respond to prospective lawful access, fees and resident
privilege. Civic notables weigh public receipts and restricted trade. Noble
interests respond only to the actual public payee or the player's existing
affected household business; unexposed nobles abstain. No NPC enterprise inventory
is assumed. Exemptions change these interests without creating eligible members.
The same pure projection provides automatic NPC positions and explicit player
ballots; there is no autonomous proposal scheduler or lobbying purchase.

`quoteAssembly` and `commitAssembly` recheck exact terms, actor, current principals,
control, government/civic consent, resources, session and retained law state.
Explicit ballots use `FB.politicalBallot` without RNG. A passed motion calls the
same private approval transaction as the simple council law. Estates laws record
`issuer.kind:estates`; their original county, public payee, operating effects,
transition and suspension rules are identical. Replacement principals do not
inherit ballots. Proposer death, loss of seat, lost control, unsupported government
consent or expiry closes a freshly reviewed hearing without enactment. Stale and
duplicate commits do nothing. An issuing ruler's succession requires a fresh
review, but does not itself cancel a lawful hearing or an enacted law.

The optional `industryLaws.votes` array retains pending/completed hearings, at
most 64 of them live, with original issuer/proposer, principal-bound ballots and completed
member/tally snapshots. Each enacted deliberative law requires its unique passed
hearing; a repeal retains its own approval. Matching restore initializes nothing
and enacts nothing. Missing legacy arrays remain absent; malformed tallies,
duplicate pending hearings and removed approval receipts reject before adoption.
**Review operating-law hearings** in Deeds retains access to records and interrupted
hearings after either political position is lost.

The historical setting is qualified by the primary charter text and scholarly
commentary in the Magna Carta Project: [city liberties, clause 13](https://magnacarta.cmp.uea.ac.uk/read/magna_carta_1215/Clause_13?com=!all),
[baronial common counsel, clause 14](https://magnacarta.cmp.uea.ac.uk/read/magna_carta_1215/Clause_14?com=!all)
and [merchant customs, clause 41](https://magnacarta.cmp.uea.ac.uk/read/magna_carta_1215/Clause_41?com=!all).
The 1215 charter is later evidence, not a claim that its rules governed 1204.
The game's Estates sheet stands for the English great council here, not a later
representative Parliament. Neither proposal is an attested ordinance. Residence
is a disclosed proxy for trading privilege, not historical citizenship.

Technology impact `affected_industry_law_consent` is **none**: current membership,
political consent and actual interests govern baseline deliberation. Existing
enterprise technology requirements remain unchanged. The independent
`industry-law-assemblies.json` example imports unequal benches, different quorum,
fees, exemptions and hearing windows through the ordinary Mods file picker.

## Compliance, petitions and enforcement

The business manager's operating-law sheet offers payment, pause, closure,
lawful resumption, temporary-exemption petitions and repeal petitions. A separate
confirmation discloses deliberate unauthorized operation, fines, closure and
continuing worker wages. Browsing and cancellation change nothing. Choosing
violation supplies no output or offense by itself. Actual staffed output at the
seasonal market or livelihood settlement records a material-evidence complaint.
Unstaffed, paused, exempt, permitted and transition-protected businesses produce
no offense. Only supported household enterprises participate; there is no NPC
business inventory or world surveillance pass.

`relief:{days,chance}` permits one seeded exemption request per business and law.
Grant waives that operator's permission and fee until the earlier of the stated
deadline or law expiry; refusal spends the request. The receipt follows its
original character, not their successor. Simple council laws also allow a
seeded repeal petition to the competent original court using this chance.
Deliberative laws instead take an affected owner's repeal request to the existing
town hearing, with its actual electorate, consent, quorum and passage rules.
The petitioner needs affected property, not a council seat; petitioning adds no
seat or ballot. A hearing request is available once per 360 days per proposer.
Rejection and withdrawal retain that spent request. All review/apply pairs bind
the current actor, terms, original jurisdiction, resources and court generation.

London's ordinary permission declares a fine of 8, its deliberative levy 12,
and the restriction 16 plus operation closure. Exemption requests have respective
chances of 50%, 40% and 25%, lasting up to 90, 60 and 30 days. These values and
temporary relief are simulation choices. The independent ordinary JSON example
`industry-law-enforcement.json` varies fees, relief, exemption, fines and closure.
Unrecognized sanctions and relief fields reject through detached mod validation.

A bounded optional `violations` array retains at most 512 live continuing violations,
one per law, enterprise UID and original operator. Each names the law and
jurisdiction, home at operation, actual output, fee, material evidence and turn.
Once filed, its source points to exactly one ordinary `justice.offenses` case.
Repeated market/livelihood detection, complaint review, restore and enforcement
cannot duplicate that case, assess another fine or replay a payment. Original
operation authorization ends at household succession. A finite record limit
stops new unauthorized operation rather than discarding evidence.

The current ruler of the original issuing realm needs actual county control,
public readiness and Peace. The canonical justice owner records the complaint,
projects arrest, obtains physical custody and queues the ordinary hearing.
**Answer the complaint** in the business sheet requests that process; the demand
appears as time advances. Submission, resistance, evidence challenge, clemency,
compensation and judgment retain their existing justice owners. A successful
challenge pardons through that owner without taking money or closing property.
A vote, accusation or detection never captures, convicts or kills anyone.

These offenses permit only release/pardon or a fine, intersected with current
court law. They cannot justify imprisonment, exile, religious penance, forfeiture,
corporal punishment or execution, including the restricted distribution's
normalization path. The fine is the law's frozen amount, paid from the original
operator's available personal funds to the original public account. Judgment
collects what is available, releases the operator and retains any unpaid personal
balance. The business sheet offers exact remaining payment; it requires the
original operator's funds and cannot charge their successor. No extra criminal
case is manufactured for that balance.

When declared, judgment closes only the named enterprise's operation, preserving
its ownership, workers and unrelated private property. It cannot reopen under
any active judged law even after permission payment; repealing one overlapping
law does not bypass another closure. Suspension permits lawful
resumption; return of jurisdiction restores that closure. Repeal or expiry
permits permanent lawful resumption. Repeal removes future restrictions but does
not retrospectively erase actual prior operations or imposed personal balances.
Issuer succession passes court competence with the realm while invalidating old
pending reviews. Jurisdiction loss suspends enforcement rather than redirecting
the case or payee. Records retain the original actor through all succession.

The optional `petitions` array is capped at 512 live petitions. Matching current-content saves
retain petition results, original evidence, open cases, closure and paid balances
without replay. Malformed evidence, case links, terms and payment totals reject
before state adoption. Released saves without these optional arrays remain valid.
Existing justice custody expiry and case pruning remain in charge; the bounded
industry facts prevent a pruned case from being filed again.

Settled history retention

The ledger uses the shared windowed retention of FBDATA.balance.ledgerRetentionDays (default 3600 days, never less than 360). Live records are unexpired, unrepealed laws (suspended ones included), pending hearings, permits whose paid window and law are both current, every petition and violation of a live law, violations whose ordinary justice case still exists, unresolved violations and judged balances still owed while their original operator lives, and every enterprise operating choice. Each record also keeps the law it names; a deliberative law and its passed enactment or repeal hearing keep each other, and a court-closure choice keeps its judgment. The limits of 256 laws, 4096 permits, 512 choices, 64 hearings, 512 petitions and 512 violations count only this live closure, so settled history never stops a new law, hearing, petition, permit or recorded operation. A full live ledger still refuses the new commitment.

The seasonal market and livelihood settlement first folds, at a season boundary, every record outside the live closure that settled before the window: a law at expiry or repeal, a hearing when it ended, a permit when its window or law ended, and a petition or violation when its law ended or its judgment was recorded. Folded records become optional `retired` totals. `retired.laws` is keyed by law definition with ended laws, repealed laws, permits, permit payments, petitions, grants, violations, assessed fines, paid fines and court closures. `retired.hearings` keeps passed, rejected, withdrawn and invalidated counts for each hearing body (town or estates). `retired.enterprises` keeps the same enterprise totals only for businesses the household still owns; totals for property no longer held remain in the law totals. Summaries name no person or record identity. Retained votes, petitions, permits and violations keep their original identities, justice links and paid facts. Folding is deterministic and spends no money, RNG or identities; a staged fold that fails validation changes nothing.

The business sheet lists retained permits, petitions and violations and summarizes earlier ones for that business. Each hearing list summarizes its earlier hearings, and Deeds → Review operating-law hearings lists per-law totals and stays available while any folded history remains. A folded law's county and trade keep the business sheet's operating-law entry, so a paused or closed business can still resume. Save validation accepts settled history beyond the old lifetime limits, requires exact summary fields keyed by current definitions, keeps grants within petitions, closures within violations, paid fines within assessed fines and enterprise totals within law totals, and rejects any ledger whose live closure exceeds a limit. Law rules, fees, voting thresholds and enforcement outcomes are unchanged.

Historical qualification: the [Magna Carta Project, clause 20](https://magnacarta.cmp.uea.ac.uk/read/magna_carta_1215/Clause_20?com=!all)
documents amercements in English courts around 1200 and proportionality protecting
merchants' trading stock. This later evidence informs the modest financial remedy;
it is not a 1204 licensing ordinance. Operational closure and temporary exemptions
are explicit game abstractions. The selected evidence does not establish
imprisonment, forfeiture or death for these stall offenses, so those penalties
are unsupported here. No confiscation or recipient of private assets is declared.

Technology impacts `industry_law_enforcement`, `industry_law_relief` and
`industry_law_closure` are **none**: deliberate operation/evidence and fines,
temporary exemptions/repeal petitions, and operational closure are distinct
baseline political and judicial capabilities. Enterprise purchase/upgrade gates and canonical justice authority,
custody, property, treasury and distribution restrictions remain authoritative.
