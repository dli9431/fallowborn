# Civic and assembly conversations

The civic and assembly pack contains 24 conversations in the high-medieval
1204–1215 window. Its civic and delegate scenes require the actual local
institution, constituency and living protagonist. Town councils and Estates
retain their own membership rules under any government form that permits their
existing procedure. Era and year gates exclude fresh 867 and 1066 campaigns.
The pack uses ordinary event declarations, bound participant cards, the
`civic_household_heard` chance and the existing `law_enacted` subscriptions.
No scene forces a historical result, grants land or installs an office holder.

Civic admission considers the household for the existing citizen roll. A
nomination pays the declared private fee but leaves selection to its canonical
owner. Term notices require a real unexpired deadline within thirty days; life
offices never acquire a deadline. Resignation ends only the protagonist’s own
mandate. The household voice scene confers no membership or office.

Public finance distinguishes temporary dues, borrowing and repayment. Only the
current chief can review civic public commitments. Borrowing names a living
outside ruler and an actual public lender, obtains both institutions’ present
assent and transfers the principal between finite treasuries. Repayment pays the
original lender, retaining the protected reserve. The household purse remains
separate. Delegate assent records approval of exact extraordinary-dues terms;
it collects no money and the ordinary public action must still consume approval.

## Typed review adapters

These are entry points to existing capabilities, rather than new transaction or
resource stores. `js/civic_transactions.js` registers the following through the
shared event-review API:

| Review | Typed arguments | Canonical owner |
| --- | --- | --- |
| `civic_office` | `action`: admit, nominate or resign; optional exact `officeId` | `civicGovernment.officeQuote/officeApply` |
| `civic_budget` | `operation`: extraordinary_tax, pledge or repay; dues need amount and duration; pledges also need interest and optionally an exact lenderRealmId; repayment accepts no supplied amount | `civicGovernment.proposalQuote/proposalApply` |
| `assembly_mandate` | `action`: nominate, resign or assent; only assent accepts amount and duration | constituency quote/apply or assentQuote/assent |

Each binds the original local institution, ruler generation, protagonist and
selection, office or debt identity. Public-budget reviews also bind the actual
outside ruler. Without an explicit lender, the first currently eligible existing
counterparty in realm-id order is offered. No read materializes a ruler or picks a
new person. Lost control, death, changing accounts, changed consent or an obsolete
quote prevents commitment. Automation uses the same review and commit as the
player, or the declaration’s unconditional no-change option.

`civic_constituency` observes `kind:civic|assembly` with `status:present`,
`admission`, `nomination`, `term_ending`, `incumbent` or `debt_due`. Admission is a
civic roll observation, not a substitute for an assembly’s county interests.
Nomination observes an actual vacancy and qualification; ending terms require the
current protagonist’s live tenure. Reads initialize nothing.

## Operating-law responses

The five business notices retain the stall license, workshop license, market
levy, guild exclusivity and market restriction responses. They observe already
applicable declared laws on owned enterprises, independently of residence, and
can also answer `law_enacted`. Repeal, expiry, loss of original jurisdiction or
loss of the business removes eligibility. Payment, pause, resumption and closure
retain the original operating transaction. Pause and closure keep property and
worker obligations; resumption purchases no permission. These notices assert
neither an unpaid charge nor an offense merely because a law exists.

The council and Estates invitations open real deliberative hearings, while the
trade-proposal scenes observe an existing pending hearing affecting the owned
business. A proposed law is observed through its declared campaign, county and
date applicability; it need not already be enacted. A ballot speaks only for the
current protagonist’s existing seat. Opening spends the existing annual session;
withdrawal retains that spent session. Events cannot settle a hearing, enact or
repeal a law. Final decisions remain in the ordinary council/Estates interface.

The deadline notice requires a real permit or transition ending within thirty
days. It does not promise early renewal of an already-paid permit. Relief uses
the original court’s one exemption request per business and law, discloses chance
and duration, and spends the request on refusal. It changes no law or property.

Enforcement invitations require an existing material-evidence record from actual
productive unauthorized operation and an already-filed case. The self review
requests the ordinary arrest demand and hearing. The other-operator review
requires the protagonist to hold the competent original jurisdiction. It can
refer to a living former household operator whose recorded output survived a
living succession; it assumes no NPC enterprise inventory and creates no offense.
Arrest and hearing retain their own authority, evidence, custody and refusal
rules. No event convicts or sentences anyone.

`js/industry_laws.js` owns these reader and review registrations:

| Surface | Arguments and behavior |
| --- | --- |
| `industry_operation` | Existing definitionId and action; optional `bindEnterprise:true` retains the original affected enterprise UID and law identity and requires that same law still apply. Omission retains legacy declarations. |
| `industry_business` reader | definitionId; status applicable, deadline, relief or uncovered; observes owned affected property and actual coverage. |
| `industry_hearing` reader | definitionId, town/estates consumer; status available, pending or affected_proposal. |
| `industry_hearing` review | definitionId, consumer and begin/ballot/withdraw action; only ballot accepts support/oppose/abstain posture. It binds the actual hearing, own bench, original issuer and ruler generation. |
| `industry_relief` review | definitionId; binds the existing business, active law and operator, then quotes/commits only a temporary exemption petition. |
| `industry_enforcement` reader/review | definitionId and self/other audience; binds the existing violation and exact operator, using the complaint or arrest projection and its canonical commit. |

Definitions and imported events use the same typed validation. Unknown laws,
unsupported consumers, extra arguments, attempted resolve/repeal/conviction and
missing required portrait participants reject the whole candidate. Disabled
observation systems fail closed, including negated reads. Candidate validation,
repeated observations, cancellation and stale rejection change no state, money,
RNG or identities. Queued source identities are retained; missing people,
property, terms or authority are never replaced on restore.

## Historical scope and technology

The London ordinances and numerical hearing rules are simulation declarations,
not attested 1204 laws. The historical qualifications remain those in
[Targeted operating laws](industry-laws.md#affected-interest-hearings).
The [1215 city-liberties clause](https://magnacarta.cmp.uea.ac.uk/read/magna_carta_1215/Clause_13),
[common-counsel clause](https://magnacarta.cmp.uea.ac.uk/read/magna_carta_1215/Clause_14)
and [merchant-customs clause](https://magnacarta.cmp.uea.ac.uk/read/magna_carta_1215/Clause_41)
provide later context, not evidence for those particular simulated ordinances or
ballot weights. The existing city-republic and assembly declarations retain their
own researched constitutional limits. Generic household conversations impose no
unrecorded historical voter, citizen or office.

Technology impact remains **none** under the existing `state_aware_events`,
`event_canonical_reviews`, civic magistracy/public-finance, assembly delegation/
reserved-consent and affected-industry-law decisions. These adapters expose their
existing eligibility and commitments; they add no separately gateable capability.
Ordinary enterprise technology still applies. No save envelope or generated
catalogue changes accompany these entry points.

Semantic fixtures cover every event. The focused review specification uses native
consumers and a real file-picker JSON import with different fees, terms, civic
membership, constituency weights, hearing rules and relief. It exercises canonical
commit and automated parity, no-change alternatives, disabled systems, pure
repeated reads, stale/denied authority, real output complaints, current-content
restores and desktop/compact cancellation. These checks leave historical,
visual, device, iframe and play acceptance to the owner.

## Event inventory

| Event id | Observation |
| --- | --- |
| `civic_stall_permission` | `owned_enterprise_law`; also answers `law_enacted` |
| `civic_guild_permission` | `owned_enterprise_law`; also answers `law_enacted` |
| `civic_levy_permission` | `owned_enterprise_law`; also answers `law_enacted` |
| `civic_monopoly_pause` | `owned_enterprise_law`; also answers `law_enacted` |
| `civic_restriction_close` | `owned_enterprise_law`; also answers `law_enacted` |
| `civic_admission` | `civic_constituency` |
| `civic_nomination` | `civic_constituency` |
| `civic_term_ending` | `civic_constituency` |
| `civic_collective_dues` | `civic_constituency` |
| `civic_public_borrowing` | `civic_constituency` |
| `civic_public_repayment` | `civic_constituency` |
| `assembly_nomination` | `civic_constituency` |
| `assembly_term_ending` | `civic_constituency` |
| `assembly_collective_assent` | `civic_constituency` |
| `assembly_household_voice` | `civic_constituency` |
| `assembly_representative_choice` | `civic_constituency` |
| `civic_license_deadline` | `industry_business` |
| `civic_exemption_request` | `industry_business` |
| `civic_trade_complaint` | `industry_enforcement` |
| `civic_competing_operator` | `industry_enforcement` |
| `civic_town_hearing` | `industry_hearing` |
| `civic_town_trade_ballot` | `industry_hearing` |
| `civic_estates_hearing` | `industry_hearing` |
| `civic_estates_trade_ballot` | `industry_hearing` |
