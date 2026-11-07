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
benefits. Its assignments and property remain. Work & Enterprises → business
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
automatic renewal, unpaid debt creation, repayment, refund or review charge.

## Lifecycle and saved identities

The optional `state.industryLaws` schema-1 ledger contains `laws`, `permits` and
`choices`. It is absent until the first commitment; restore never initializes it.
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
with the enterprise owner. Optional offense metadata describes only an offense
id and bounded fine; it authorizes no evasion, arrest, seizure or execution.
