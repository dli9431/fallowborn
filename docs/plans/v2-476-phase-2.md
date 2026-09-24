# 476 Phase 2: scoped authority and government behavior

Date: 2026-09-24. Branch: 476. Parent: [phased plan](v2-476-phased-implementation.md).
Runtime comparison and all test execution remain owner-controlled.

## Implemented authority boundary

`js/authority.js` extends `FB.political` with pure `power`, `consent`, `legitimacy`, `government`,
`grantedCounties`, contract and customary-right views. Every query receives explicit state
and typed actor/scope references. It returns a detached basis or a denial reason.
Ban, Peace, Revenue and Consent are evaluated for the exact host, county or
contract. A field commander gains no civil jurisdiction or receipts. A judicial
vicar gains no host command. Owner and holder remain territorial facts.

`FBDATA.authorityOffices`, `legitimacySources` and `customaryBases` provide the
supported semantic IDs, powers, scopes and succession policies. Bookmark
activation validates definitions. These rules have no UI labels yet; Phase 4
authors period presentation through the localization layer.

`state.authority` is allocated only by a successful new transaction. It contains
appointments, recognitions, federate contracts, customary rights and
render receipts and explicit government forms with stable record IDs.
Appointments have active, contested, expired and removed states.
Confirmation, removal and expiration are explicit. An appointer succession
suspends a commission requiring reaffirmation; confirmation updates its
generation. Recognition is source-specific and names an issuer, subject and
scope. Reaffirmation or revocation changes only that source. None of these
records changes a county owner or direct holder.

Federate offers name patron and force realms, an exact host when applicable,
seasonal pay, expiry, optional settlement promises and an optional imperial
recognition record for the federate realm. Paid offers require live treasury accounts for both parties. Both rulers
consent at their current generation. Renewal starts another consent round. Lost host,
succession, recognition and expiry end effective service. Unaccepted offers
expire too, so an abandoned negotiation cannot reserve a host indefinitely. Pay transfers through existing
treasury accounts once per season; an unfunded payment breaches service rather
than creating a ghost receipt. A promised settlement uses the existing
settlement-grant quote and confirmation transaction. Confirmation rechecks the
full quote and marks the award fulfilled once.

Customary rights name beneficiary, county, power and basis (tenure, judgment,
recognition or possession). Recorded acts raise or erode their strength; annual
possession or dispute updates are stamped once per year. A lapsed or revoked
right stops authorizing the act. De jure title geography is unchanged.

## Converted consumers and compatibility

| Consumer | Shared decision | Legacy rule retained |
| --- | --- | --- |
| Map host selection and orders | Ban on the exact host | Player hosts and existing military command |
| Arrest projection and jurisdiction | Peace in the target county | Landed rulers, barons and local lords |
| Council extraordinary tax | Consent | Existing Crown Authority threshold |
| Federate seasonal payment | Revenue under the live contract | Treasury debit/credit and available funds |
| County render | Revenue from direct holding, office or customary right | Reviewed treasury transfer with once-only obligation receipt |
| Settlement promises | Reviewed grant permission | Original grant eligibility and stale quote |

The justice AI uses the same arrest projection, so an appointed NPC vicar can
attempt a lawful arrest in its scope. Existing 867/1066 lives with no
`state.authority` retain their original territorial and Council answers.
Authoring the actual 476 cast and scenario decisions remains Phase 4. Save-v4
aliases and migration remain Phase 3; this branch's version-3 serialization is
a prototype, not a release path.

## Technology and coverage

Appointments, command commissions, recognition, federate service, customary
rights, civic consent and government form each have a `none` technology impact
entry. Their
limits are legal scope, issuer continuity, consent and resources. No research
gate is added for baseline political action.

`tests/e2e/specs/authority-phase-2.spec.js` authors three journeys for each
legacy bookmark: no-record parity and read purity; separate office, land,
recognition and succession decisions; and two-party service, exact host
control, paid-once obligations, reviewed land award and customary-right
transitions. The owner runs the tests and target-device comparisons.
