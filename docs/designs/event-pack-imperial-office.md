# Imperial office households

The `imperial_office` pack contains twenty-two household events for
`late_antique`, years 476–650. Live county-holder forms select `roman_civic` or
`administrative_monarchy`; no historical realm or campaign id selects an
institution. The same form, office and recognition conditions apply across the
period. Territorial governments and fresh medieval campaigns are excluded.

Dependent households can help with lists without acquiring freedom or office.
Free applicants can review actual civil commissions. Serving officers can
review contested confirmation, public remittance and arrears. Rulers can use
only their own appointment and recognition authority. Requests for men leave
recruitment, service and muster with their existing owners; event prose raises
no host. Curial shortfall conversations do not create a new debt or cancel one.

Holding and loss scenes observe effective, contested, removed or expired
commissions. An honor or remembered conversation supplies no civil powers.
Public shortfall scenes compare an existing commission’s arrears with the
household purse. Drafts and household conversations use ordinary participants,
the declared Stewardship chance and social consequences.

## Event inventory

All ids below have the prefix `imperial_office_`.

| Id suffix | Audience or decision |
| --- | --- |
| `petition_copy` | Free civic applicant; preparation and appointment review |
| `seal_and_bread` | Dependent civic household without civil office |
| `curial_shortfall` | Civic household comparing an assessment with its means |
| `rival_petition` | Rival civic applicant and real appointment review |
| `honor_bench` | Effective civic commission |
| `empty_bench` | Ended civic commission and fresh application |
| `patron_silence` | Contested civic commission and reaffirmation |
| `civic_money` | Civic household answering a request for money |
| `civic_men` | Civic household checking a request for men |
| `civic_no_support` | Civic ruler without effective personal recognition |
| `court_application` | Free public-service applicant |
| `bound_household` | Dependent household beside public administration |
| `court_rival` | Rival public-service applicant |
| `honor_demand` | Public officer with affordable existing arrears |
| `old_seal` | Ended public commission and fresh application |
| `court_patron` | Contested public commission and confirmation review |
| `court_shortfall` | Existing public arrears exceeding the household purse |
| `court_levy` | Serving public officer; roster and remittance review |
| `one_voice` | Public ruler with one personal recognition source |
| `many_voices` | Public ruler with multiple sources; recognition and dismissal |
| `court_decision` | Exact living officer; confirmation, dismissal and candidature |
| `changed_voices` | Committed recognition-band change naming the civic protagonist |

The last scene subscribes to `legitimacy_band_changed`, requires the protagonist
to be the committed character subject, and rechecks the one-source band. Another
person’s change cannot deliver it. Other scenes use ordinary state-aware selection.

## Typed readers

The authority owner adds `civil_office`, with `status` equal to `active`,
`contested`, `ended` or `none`, and optional `officeId` referencing
`authorityOffices`. It reads the protagonist’s actual commission at the current
county holder, scoped to that county or realm. Civil offices have Peace or
Revenue and no Ban. Public status uses `publicOfficeRows`; other commissions
use the canonical authority status. Ended means a removed or expired record.

The public administration owner adds `public_office_arrears`, with optional
`officeId` and boolean `shortfall`. It requires positive recorded public arrears;
when supplied, `shortfall` compares that exact debt with the protagonist’s purse.
The public-office system must be enabled.

`legitimacy_band` retains its existing `band` argument and default protagonist
subject. Optional `subject:'moment'` also requires a committed context naming
the protagonist as its character subject. All readers remain pure; no derived
eligibility, quote or new account is saved.

## Canonical review declarations

Each adapter requires an exact `official` participant with `source:'context'`,
`required:true`, and inclusion in `participantCards`. Pure binding projects an
existing living applicant, officer or claimant and the local court/county.
Appointment and dues contexts also retain the exact `appointmentId`; Roman
recognition contexts retain the claimant’s institution and office. A supplied
participant map is authoritative, including an empty map. Missing people or
sources never cause a restored decision to choose replacements.

| Type | Typed args | Canonical owner |
| --- | --- | --- |
| `office_petition` | Optional `officeId` | Profile governor through `publicAppointmentQuote/publicAppoint`; otherwise a county Peace office without Ban from the local court’s catalogue through `officeAppointmentQuote/officeSeekAppointment` |
| `office_appointment` | `action:'confirm'` or `'remove'`; optional `officeId`, `participant:'official'` | `publicOfficeQuote/publicOfficeApply` or `officeTransitionQuote/officeTransition` for that same commission |
| `office_dues` | `action:'repay'` or `'remit'`; optional `officeId`; `remittance` in 0.5–1 required only for remit | `publicOfficeQuote/publicOfficeApply` for the protagonist’s existing public commission |
| `office_recognition` | `action:'recognize'`, `'contest'` or `'nominate'`; `participant:'official'`; optional `selection:'candidate'` or `'officer'`, optional `sourceId` | Public `nominationQuote/nominate` or own-seat `supportQuote/applySupport`; Roman `officeClaimQuote/officeDeclareClaim` |

An omitted appointment participant selects the protagonist. A declared
`participant:'official'` selects the first other local civil officer in ledger
order. Public recognition normally binds the first existing living candidate;
nomination or `selection:'officer'` binds the first other local civil officer.
If no materialized candidate exists, the review can instead show a local civil
officer with the canonical candidature blocker.
Roman recognition binds a living recorded claimant and the actor’s first current
matching mandate. `sourceId` references `legitimacySources` and is supported only
for Roman recognition, never nomination. Unsupported combinations fail closed.
Explicit petition offices require appointment terms, county scope, Peace and no
Ban. Public profiles never fall back to the legacy Roman petition route.

The canonical reviews retain qualifications, live identity, current consent,
scope, generation, available funds and original terms. Public appointment fees
come from the existing court treasury; Roman registration fees come from the
applicant. Repayment transfers actual arrears to the original court once and
does not reaffirm office. Remittance changes existing future receipt terms.
Removal ends public powers and future pay, retaining private property and
recoverable arrears. Recognition spends only its canonical cost and casts only
the actor’s current interest or mandate. It grants no hereditary property,
automatic accession, other interest’s consent, invented receipts or soldiers.

Every review has a distinct unconditional costless refusal. The shared event
confirmation retains the exact participant portrait cards, controls, disclosures,
scroll and focus on Cancel, Back and Escape. Automation uses the same canonical
quote/commit or declared refusal. Stale identity, authority, source, funding or
terms reject before payment, RNG or UID changes. Current-content restoration
replays no decision or grant.

Technology impact remains **none** under `event_canonical_reviews` and
`state_aware_events`: these are routes to existing capabilities, whose own
qualification, consent, technology and account rules remain authoritative.

## Coverage

The shared event-pack validator registers `imperial_office.json` and retains its
existing assertions. Semantic rows cover every event’s staged eligibility,
territorial exclusion and medieval period controls.
`imperial-office-event-reviews.spec.js` covers native commissions and an
independent ordinary JSON import with different office qualifications, fees,
term, financial share and recognition weights. It exercises real reviews and
commits, exact parties and queued contexts, finite payments, automated parity,
denied/stale authority, disabled systems, cancellation/refusal, pure candidate
rejection and repeated reads, and two current-content restores. Appearance,
touch, iframe and play acceptance remain separate owner evidence.
