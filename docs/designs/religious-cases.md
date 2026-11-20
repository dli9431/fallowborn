# Named ecclesiastical discipline

The owner registers `open_religious_case` under the `religious_cases` event
observation tag. It reads existing charged, offered, referred and accepted
records through the canonical snapshot, requiring current source/principals and
the protagonist's involvement. It creates no accusation, custody or judgment.
See events.md for shared validation, selection lifetime and the none technology
decision.

Hold ecclesiastical court opens a free review for a supported canonical bishop,
an actual defendant or the competent temporal ruler. The Bishopric also links
the review. Civil rent claims remain a separate sheet. With no eligible evidence,
the court explains its empty docket rather than inventing a defendant or income.

## Cause and historical limits

The Roman 1204 rule examines violence against clergy: a successful recorded
abduction or killing whose canonical justice record captured the victim's
clerical vocation, faith and residence when the occurrence was recorded. Both
the defendant and victim must share the bishop's faith within the declared
Christian scope. Rank, wealth, a different faith, conversion, private rivalry and an old record without
those contemporaneous facts establish no cause. The accused must actually be
local. A bishop needs an existing canonical office and current temporal scope,
recognition, public readiness and Peace; spiritual rank alone supplies no arrest
or prison authority. Vacant and spiritual-only sees cannot impose these remedies.

[Second Lateran canon 15 (1139)](https://www.arcaneknowledge.org/catholic/councils/council10.htm)
supplies the discipline context for violence against clerics and monks. It
reserves absolution to the apostolic see, apart from danger of death. Local
penance and a financial composition here do not grant absolution. The chosen
fees, private-wealth fraction, procedural custody requirement and political costs
are game-scale choices, not attested Roman tariffs or a historical lawsuit.

The secular fief remedy consumes the game's existing justified forfeiture law,
limited further to one actual delegated settlement. Canon 15 itself grants no
confiscation power. No later heresy statute is backdated into this discipline
rule. In particular, [Fourth Lateran canon 3 (1215)](https://sourcebooks.fordham.edu/source/lat4-c3.asp)
distinguishes lay property, clerical revenues and secular enforcement; it does
not make every confiscation the bishop's private income. Heresy, Jewish cases,
other religious accusations, private plots and businesses, clerical-property
forfeiture and the Albigensian campaign remain outside this implementation.
Religious Tolerance remains the existing policy; there is no global persecution
modifier or universal enrichment motive.

## Decisions and exact owners

The bishop selects an existing unjudged matter and optionally one real delegated
fief held by that defendant. The accusation freezes the canonical source,
defendant, victim, evidence, date and clergy facts. It records an accusation,
not a conviction. A second profile or court cannot prosecute the same source
again. The defendant may challenge the evidence or present a diplomatic defense,
once per matter, using the canonical seeded challenge probabilities. Success
closes only this case and releases its provisional custody. Dismissal does the
same without spending money, piety or property.

Either party may offer settlement; only the other party can accept. Acceptance
debits the actual player household purse, existing NPC barony account, or NPC
personal wealth. Public realm money is never substituted for private wealth.
The customary Roman fee is 2 to the see's institutional treasury. Compensation
is 15% of available private money, capped at 100, paid to the identified living victim.
An unavailable victim cannot receive a settlement and no heir is invented.
Offers expire after 30 days. Reviews, accusations and dismissals charge no fee.
The bishop's private purse receives nothing. Unique fee and settlement receipts
use the shared authority receipt ledger and the episcopal claim payment boundary.

## Diocesan settlement fee ceiling

The Roman 1204 profile allows the competent local bishop to enact a ceiling of
1 on the see's institutional settlement fee. Keeping custom leaves the fee at
2. Only the current recognized bishop of the declared see may enact it, within
the profile's years and county and with the same temporal readiness and Peace
required by the court. Enactment records a rule for future offers and itself
collects no money, creates no case and grants no jurisdiction.

An enacted ceiling applies when a new offer is made by either party, including
a new offer in a case already open. Acceptance charges the fee and compensation
recorded in that offer, including a customary offer already made on the day of
enactment. Previously paid receipts stay as recorded. A zero ceiling waives the
institutional fee and produces no fee receipt. Compensation uses the existing
formula and recipient, and the bishop's private purse remains separate.

[Fourth Lateran canon 6 (1215)](https://sourcebooks.fordham.edu/basis/lateran4.asp)
describes provincial synods for correcting abuses and publication of their
decisions in episcopal synods. This later evidence supplies the setting for
synodal discipline in the Innocent III campaign. The amounts and the local
court's option to lower its own fee are simulation choices. Neither canon 6
nor Second Lateran canon 15 attests a Roman settlement tariff of 2 or 1.

Technology impact `synodal_settlement_fee` is **none** for enactment and repeal.
The recognized office and its existing temporal competence supply the authority.

### Convening the synod

The existing Convene a synod Deed charges its configured gathering cost of 10
gold and starts its 360-day cooldown when the clergy assemble. A bishop with
current competence who convenes in the profile's county can review a lower
fee. Once the ceiling is enacted, the current competent bishop, including a
successor, can keep it or confirm its repeal at a later synod. A former bishop,
a vacant see or a bishop away from the county cannot repeal. The see carries
the gathering cooldown across succession when a new protagonist has no
personal cooldown. The agenda names the jurisdiction and affected cause, compares the
current and proposed institutional fees, and shows the gathering cost already
paid. Discipline, learning and alms remain available. Closing with current
terms or cancelling the fee confirmation leaves the rate in force. The fee
decree requires personal confirmation, including when events are automated.
There is no additional charge for the decision.

A queued gathering retains the convening turn, issuer and definition identity.
A repeal agenda also binds the active rule. Confirmation checks the convening
bishop's current local competence and the exact reviewed terms. Repeal restores
the customary fee on new offers. The case docket identifies whether a pending
offer uses the customary rate or the ceiling and displays its frozen fee,
compensation, recipient and deadline separately from the current rate for new
offers. Settled cases show the amount paid.

### Authority and persistence

`FB.religiousCases.synodalFeeReview(state, profileId, actorId, operation)` returns
the customary fee, proposed terms and any blocker. The default operation
reviews enactment. `enactSynodalFee(state, review)` recomputes the review before
writing its rule. The paid synod event review owns repeal.
`synodalFeeRule(state, profileId)` returns a copy of the saved rule and its
history. Retaining a ceiling leaves the rule in force and records the gathering
for cooldown purposes.

The optional `authority.synodalFees` ledger allows one enactment per enabled
profile and up to 32 records. A repeal records its date and issuing incumbent on
that enactment, which remains available as provenance. The latest related
gathering supplies the cooldown. A rule saved before gathering dates were
recorded uses its enactment date as the initial cooldown reference. An enactment
binds the bookmark, county, declared
see, actual issuing incumbent and realm generation, enactment turn, typed terms
and exact profile fingerprint. The rule belongs to the see across changes in
the incumbent. Current authority remains required for each case and transaction.
Reduced offers and payments reference the exact enactment. Payments retain the
offer turn to validate the applicable terms across enactment and repeal. Detached
validation checks the rule, frozen fee and exact institutional and compensation
receipts together. It checks counties against the saved bookmark revision before
the campaign map is activated. Saves without enactments keep their customary
commitments without a migration or a new save envelope.

The fictional ordinary JSON example `synodal-fee-spoleto.json` declares its
own Spoleto jurisdiction, a customary fee of 4 and a ceiling of 0. Its
compensation is 25% capped at 40 and still goes to the victim. The Spoleto
enactment leaves Roma's offers at its customary rate until Roma enacts its own
rule.

## Custody and judgments

The bishop can seek actual custody, impose justified public penance or
imprisonment where current law permits, or refer to the competent temporal
authority. A defendant can explicitly submit through the same arrest projection.
Imprisonment always uses canonical justice and its real custody and term rules.
Greater actual private resources reduce arrest odds, together with existing
personal opinion, skill, political protection, hierarchy, truce and cooldown
rules. No status alone guarantees resistance or conviction.

The actual temporal ruler accepts or refuses a referral. Acceptance transfers
the same proceeding's venue; distinct courts must obtain their own custody,
without teleporting a prisoner. Refusal leaves the bishop's other remedies
available, costs one county support and lowers relations between distinct courts
by 5. A matter can be referred once. If the bishop also governs temporally, that
same incumbent must still act through the separate temporal decision and law.

An accepted referral permits the configured justified secular custody
sentence, or confiscation of the explicitly selected delegated fief when the
current law justifies forfeiture. Confiscation rechecks the entire original
grant, actual possessor, receiving county realm and enforcing court's custody.
The settlement property owner returns only that grant to its named realm.
It never invokes broad title forfeiture, touches another grant, confiscates a
private plot/business, or pays the bishop personally. A changed grant rejects
before any mutation. The defendant's other private money remains theirs.

Imposed judgments cost 2 county support; voluntary settlement costs 1. Refusal
of lawful process costs 3 and affects existing political standing. These use
the ordinary county support, character standing and ruler regard owners, not
a new persecution statistic. A refusal is not evidence of another crime.
Dismissal, successful defense and closure of an interrupted matter reverse that
matter's recorded refusal losses, leaving no penalty from the accusation.

## Lifecycle and interfaces

`FB.religiousCases.list/snapshot/quote` are pure. `apply` recomputes the exact
review before money, custody, property, receipts or RNG change. It binds the
definition, living principals, public generations, jurisdiction, source facts,
actual private accounts, selected grant, current laws and sentence terms.
`respond` handles configured NPC defendant, settlement and temporal responses;
`bishopDecision` uses the same judgment transaction. Canonical seasonal justice
can open one eligible recorded matter for an NPC bishop, then consumes the same
configured responses, restricted court and sentence projections within its
existing two-action budget. It never creates a suspect, crime or fortune.
An NPC configured for penance refers a matter when current severity rules bar
that judgment; it cannot silently impose an unjust penance instead.

Defendant or bishop death, vacancy, succession, lost jurisdiction, changed faith
or departure interrupts an unfinished proceeding. The original parties or a
current competent principal can close it without imposing a penalty. A new
bishop does not inherit an unproved prosecution. Finished payments and judgments
remain facts; existing imposed prison terms keep the custody owner's lifecycle.
Unrelated custody is never released as part of a dismissal.

The optional bounded `authority.religiousCases` ledger pins each definition's
exact fingerprint and canonical offense. Its 64 permanent matter slots prevent
repeat prosecution and retain the evidence behind payments and property
dispositions. Referenced canonical evidence and named people remain retained.
Matching saves restore, re-save and restore without replaying judgment or money.
Malformed records, missing evidence/receipts and changed definitions reject on
the detached state. Released saves without the ledger require no backfill;
the save envelope is unchanged.

The independent ordinary JSON example `religious-river-court.json` is explicitly
fictional. It uses Spoleto, no fee, a 25% settlement capped at 40 to the actual
secular treasury, a 12-day deadline, no fief remedy, and different NPC responses.
It can operate beneath a distinct secular superior, preserving all three
private, institutional and secular accounts. Such a superior still needs an
actual scoped Peace mandate under the existing ecclesiastical authority rules;
overlordship alone does not override the see's local government. Both
configurations use identical definition validation and transactions.

Technology impact `named_ecclesiastical_discipline` is **none**: actual conduct,
local office, law, custody and resources supply the gates. Ordinary economic and
military technology rules remain independent.

Committed judgment observation

An imposed canonical penance, imprisonment, enforcement or exact-fief confiscation publishes case_judged with the existing case, profile, offense, defendant, county and settled status. Repeated judgment notifications on a closed case are inert. Accusation, dismissal, voluntary settlement and restore publish no judgment. This is the ordinary event subscription surface described in events.md, with no new prosecution or queue.
