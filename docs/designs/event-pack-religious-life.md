# Religious life events

The `religious_life` pack contains 24 notices, including 22 canonical review
choices. Its explicit eras are `late_antique` and `high_medieval`, with pack
bounds of 493–1229. Each event has a narrower window: 493 only for the recorded
Carthage vacancy and Sardis care; 1204–1216 for Roman rent, named discipline and
Constantinople service; 1204–1229 for an answerable campaign; 1209–1229 for the
declared regional cause. None enters a fresh 867 or 1066 event pool.

These notices observe existing institutions, property, proceedings and calls.
They create no accusation, historical debt, office, endowed estate, campaign,
conversion or territorial outcome. Lay households, existing clergy and current
temporal rulers act only through their own canonical permissions. Institutions
and activity profiles select the relevant tradition without faith-id trigger
lists. The public-accounts notice additionally observes the actual county
holder's `ecclesiastical_principality` government.

## Event inventory

| Event ids (`religious_life_` prefix) | Existing facts and decisions |
| --- | --- |
| `charter`, `dues`, `household_claim`, `other_party`, `temporal_hearing` | Actual Roman delegated rent charter, disputed demand, proposed compensation, other-party acceptance and a request for competent temporal enforcement |
| `public_accounts` | Actual ecclesiastical county government; a bounded stewardship chance records accounts preparation and one prestige without transferring money |
| `see_vacancy` | An actual recorded Carthage vacancy; the same accounts preparation grants no appointment |
| `neighbor_accused`, `answer_case`, `case_terms`, `case_consent`, `case_referral`, `case_refusal` | Existing recorded clerical violence, accusation, defense, proposed settlement, other-party consent, referral and explicit refusal of process |
| `latin_household`, `latin_priest`, `greek_household`, `membership` | Qualified local admission or withdrawal at the declared Constantinople institutions; no career or office grant |
| `latin_activity`, `greek_activity` | Existing qualified household service, paid once through the activity owner |
| `fund_exhausted`, `fund_low`, `funded_care` | Actual Sardis receiving property, restricted care balance, voluntary gift and funded service |
| `call`, `regional_call` | An actual answerable preparation campaign and, for the latter, the exact declared regional cause; personal vows only |

`religious_life_accounts` is the pack's declarative stewardship/flag chance.
All notices use state readers and ordinary period membership; there are no new
lifecycle subscriptions or story instances.

## Typed review routes

The existing [shared event review foundation](event-review-foundation.md) owns
registration, candidate validation, exact-party binding, confirmation and
automation. Choices declare `review:{type,args,refusalOption}` with an indexed,
unconditional ordinary refusal and no parallel effects or chance. Opening or
canceling a review does not answer the notice. The notice refusal creates no
commitment and is distinct from explicitly refusing lawful case process.

All argument objects accept exactly the listed fields. Static catalogue ids
resolve against the complete detached candidate. Instance ids are lowercase
identifiers of at most 80 characters and resolve live. Missing institutions,
people, property, offenses and calls are never manufactured.

| Review type | Arguments | Canonical transaction |
| --- | --- | --- |
| `religious_activity` | `activityId` from `religiousActivities` | `religiousActivityQuote/Apply` for the protagonist |
| `religious_patronage` | `profileId` from `religiousPatronage`, declared `fund`, integer `units` from 1 through capacity (at most 64) | `religiousPatronageQuote/Apply` donation of units × unit cost to the existing restricted fund |
| `religious_institution` | `institutionId`, `action` (`admit` or `withdraw`), `roleId` required only for admission | `religiousInstitutionQuote/Apply` for personal membership |
| `episcopal_claim` | `profileId` from `episcopalClaims`, `action`, optional integer `settlement` from 1 through 7 | `episcopalClaims.quote/apply` on an involving settlement |
| `religious_case` | `profileId` from `religiousCases`, `action` | `religiousCases.quote/apply` on an involving canonical offense |
| `holy_war_vow` | `seasons` (4, 8 or 12), `desire` (`honor` or `neutral`), optional `causeId` from `holyWarCauses` | `greatHolyWarVowQuote/Apply` and existing `joinGreatHolyWar` |

Civil actions are `demand`, `contest`, `recurring`, `compensation`, `accept`,
`decline`, `abandon`, `request_enforcement`, `adjudicate` and `reject_enforcement`.
Case actions are `charge`, `dismiss`, `challenge`, `defend`, `settlement`,
`accept`, `decline`, `refuse`, `refer`, `accept_referral`, `reject_referral` and
`close_stale`. Each action retains its original actor, procedural stage,
lawful cause, consent, jurisdiction, private payer and available resources.
Arrest, sentencing and confiscation remain on their existing court review.

## State readers

| Reader | Arguments | Observation |
| --- | --- | --- |
| `religious_office_vacancy` | `officeId` | Declared canonical office, no effective holder and an actual vacancy record; missing membership is not a vacancy |
| `institution_role_opening` | `institutionId`, `roleId` | Canonical self-admission currently permits this qualified role, including capacity |
| `religious_activity_available` | `activityId` | Protagonist's canonical activity quote currently allows participation |
| `religious_service_funding` | `profileId`, `fund`, `state` (`exhausted`, `low`, `funded`) | Existing receiving house and matching restricted service with a qualified participant; exhausted is below one unit, low is one to fewer than two, funded is at least one |
| `episcopal_claim_present` | `profileId` | Current involving charter or claim through the canonical list, without invented arrears |
| `episcopal_claim_review` | Claim review arguments | Named civil procedural step currently allowed |
| `religious_case_present` | `profileId` | Existing eligible source or active proceeding involving the protagonist |
| `religious_case_review` | Case review arguments | Named procedural step currently allowed |
| `answerable_holy_war_call` | Vow review arguments | Actual preparation campaign the household may answer; optional cause must match that campaign |

The first four readers use the existing `religious_institutions` observation
owner and its `event_religious_institutions` switch. Rent and case readers use
their existing observation owners. The call reader and vow adapter opt into the
existing `great_holy_wars` system directly through trusted `systemId` metadata.
Legacy unique `eventReaderOwner` lookup remains unchanged. Disabled systems fail
before reading even under negation. JSON supplies typed arguments, never code or
availability metadata. Existing `institution_membership` and
`county_holder_government` readers are also used by the pack.

## Exact parties, authority and accounts

New rent notices bind the original settlement, grant source and exact possessor,
bishop and temporal court. New case notices bind the original offense, captured
accusation facts, defendant, victim, bishop and temporal court. Authors must
declare all those ordinary context participants with `source:'context'`,
`required:true` and explicit inclusion in `participantCards`. Incomplete
declarations reject atomically. Existing contexts never recast a missing party
or substitute another newly eligible matter.

`episcopalClaimSource` and `religiousCaseSource` are ordinary engine-owned context
snapshots for exact-source rejection. They are not another property, evidence or
transaction ledger. Changed source facts, parties, public authority, jurisdiction,
consent, funds or procedural terms invalidate the reviewed quote before payment.
Bound notices with a missing settlement/offense id or source snapshot also fail
closed instead of selecting another matter for the same people.
Player and automated event resolution delegate to the same canonical commit.

Activity reviews disclose payer, price, reserve, time, benefits and interruption.
Patronage reviews donate only to an actual receiving house, disclose prepaid
service units and retain unused gifts as institutional property. They cannot
found a house or transfer household land. Personal membership reviews retain
qualified consent and payment, disclose unmarried commitments and possible loss
of an existing office, and never appoint a spiritual or temporal office.

Rent compensation debits the actual private possessor and credits the existing
institutional treasury. Case settlements retain their configured victim or
secular recipient and separate institutional fee. The bishop's private purse,
household property and secular jurisdiction remain distinct. Proposals collect
no money and do not fabricate the other party's acceptance.

The pure vow quote isolates legacy political normalization on a detached state;
apply re-quotes before the existing join transaction. Personal four-, eight- or
twelve-season service has no beneficiary or land grant. Existing doctrine,
excommunication, household, fiscal and military exclusions remain authoritative.
An event supplies no call, prosecution, force, supplies or sacred custody.

## Presentation, localization and persistence

Reviews use the shared retained event confirmation, participant portraits and
fact/action cards. Costs, benefits, procedural consequences and the first blocker
are visible before commitment. Cancel, Back and Escape retain the exact event,
party cards, disclosures, scroll and originating focus. Stale rejection spends
nothing and returns to the same event. A blocked review retains a free Cancel.

Literal notice prose uses the existing event id/field/option localization owners.
Review chrome uses `FB.T`; activity, patronage, institution role, claim and case
names use their existing `FB.dataText` owners. Imported prose has ordinary
English fallback. Saved contexts retain character ids and immutable source
facts; canonical transactions retain durable message descriptors. Rendered
review text, translated labels and eligibility caches are never saved.

These routes retain `event_canonical_reviews` and `state_aware_events` technology
impact **none**: they expose existing transactions without changing their
eligibility. No new technology gate, historical legal rule, save envelope or
resource owner is introduced. Existing declarations remain valid. Current-content
restore preserves exact mods, parties, commitments and spent resources without
replaying a transaction or replacing an unavailable person.

## Coverage

`tests/e2e/fixtures/event-packs/religious_life.json` registers all 24 notices in
the shared pack validator, including positive/negative state and period cases.
The shared validator's assertions remain unchanged.

`religious-life-event-reviews.spec.js` exercises native and independent ordinary
file-picker JSON consumers for all six routes. Its fixtures are
`religious-life-event-reviews.json` and `religious-life-event-reviews-funds.json`
under `tests/e2e/fixtures/authoring`. Coverage includes canonical review/commit,
repeated pure reads, denied and stale authority, disabled systems, notice refusal,
automation parity, finite private/institutional/secular accounts, exact queued
parties and source rejection, repeated current-content restore, malformed-input
rejection and compact-screen confirmation cancellation with retained portraits.

Historical scope remains that of the existing declarations: Roman civil rent
is not an attested tariff or debt; named clerical discipline is not heresy
prosecution; Sardis gifts require voluntarily funded property; regional campaign
accusations are separate from local cases. Later conciliar provisions do not
become enacted rules in 1204. Visual, device and play acceptance remains manual.
