Religious institutions and affiliation

Optional declarations

data/religious_institutions.js declares initially empty religiousAffiliations and religiousInstitutionProfiles catalogues. Complete bookmark localInstitutions tables place each institution. Profiles declare their own faith ids, date bounds, qualifications, household restrictions, allowed actions, fees, selection and recognition. None of these declarations changes a person's primary faith, community composition, doctrinal relations or government form.

Roles carry a minimum age, explicit permitted sexes (an empty list permits either), an unmarried requirement, permitted career professions (an empty list imposes none), skill floors and an optional affiliation prerequisite. A deceased spouse does not block an unmarried role. Eligible specialists need not be priests or monastics. On-map membership requires residence in the seat county. Off-map institutions declare offMap:true and explicit county jurisdiction. Opening records are vacant and create no fictional representative; actual admissions and selection are explicit transactions.

Membership and consent

The existing localInstitutions record owns status (active, suspended or closed), at most 64 member references and at most 16 current assent decisions. Each member retains roleId, active or withdrawn status, joinedTurn and changedTurn. Self-admission and qualified role changes require the profile's admit action. An affiliation is acquired by an active member under the profile's affiliate action. Each character retains at most eight unique religiousAffiliations references, with an id and institutionId (or null for an independently authored affiliation). Mutual exclusions are checked in either direction and produce a scoped blocker. No new institution, member or affiliation is added to an existing ledger by restoration or seasonal repair.

Selection declares the registered appointment strategy, patron or members policy, leader role, constituent roles and quorum. On-map patron selection belongs to the current county holder under ordinary possession. Off-map patron selection requires an explicitly declared patronRealmId. Members selection requires the acting person's current constituent role. Each constituent records their own assent using the same reviewed action contract. Submitted lists of alleged consenting people confer no consent. Votes are bounded and cease to count after loss of eligibility, county control, political generation or the vacancy they concerned.

Canonical offices and recognition

Each declared officeId shares religiousHeads and religiousHeadVacancies. The record's representativeId is a compatibility projection, never an independent incumbent. religiousOfficeSnapshot checks actual membership and profile eligibility. Death, withdrawal, lost qualification and occupation remove effective eligibility; explicit vacancy administration clears the canonical assignment without moving property. Selection does not allocate a replacement person, start a papal election or invent hereditary succession. A headless faith may have a local school office, while a leaderless profile declares selection:null and no officeId.

institution_support is an ordinary legitimacySources entry with institutional:true and succession:reaffirm. Typed religious-institution issuers live in the existing authority.recognitions ledger. Profiles declare permitted institutional sources, qualified constituent roles, quorum, whether a current leader is required and whether worship must be protected. Their generation includes current control, qualified constituency and canonical leader. A changed generation suspends support until a new explicit consenting action; disputed support revokes its existing record. Recognition grants no courts, receipts, county control or universal religious authority. Mediation is limited to declared county jurisdiction with protected worship. Neither recognition nor mediation converts the subject or the county.

Review and atomic application

FB.religiousInstitutionQuote(state, institutionId, actor, action, terms) reads eligibility, consent, vacancy, payer, cost, consequences and all dependent facts without repair, RNG, uid allocation or payment. Actors are typed character or realm references. Unsupported actions and fields fail closed. FB.religiousInstitutionApply(state, reviewed) recomputes the entire proposal before proceeding. Fallible canonical authority operations are staged on a detached state; only affected local records, affiliations, office references and authority records are adopted after payment succeeds. Costs use existing treasury counterparties and cannot spend a ruler's private household assets as an institutional purse. NPC characters without an authorized treasury counterparty cannot pay a fee.

The profile's existing abbeyId, when present on its local declaration, references abbeys.houses as the property authority. Membership, selection, recognition, withdrawal and vacancy neither copy nor alter that property's capital, treasury or plots. Withdrawal can remove one bound affiliation or the whole membership, preserving the character, followers, household and institution. No new purse or loyalty score is stored.

Public entry points

FB.religiousInstitutionSnapshot exposes the definition, profile, effective availability, bounded membership, canonical holder, vacancy, existing recognition records and referenced property. FB.religiousInstitutionRoleEligibility resolves declared qualifications. Existing episcopal appointment and civic bargain APIs reject profile institutions, ensuring that their legacy defaults cannot bypass declared qualification or consent. Legacy sees, patriarchates, congregations, papal elections and caliphal claims keep their original paths and ids.

Technology decisions

religious_institution_membership, religious_institution_selection and religious_institution_recognition have explicit none entries in FBDATA.techImpactReviews. Each depends on ordinary qualification, consent and existing authority or finance rather than discovery. They introduce no researched asset, military capability or production multiplier.

Regression coverage

tests/e2e/specs/religious-institutions.spec.js authors independent patron-selected and headless communal profiles and a fictional leaderless third. Its coverage includes repeated pure reads, affiliation exclusions, household qualifications, canonical office use, quorum, disputed recognition, protected mediation, stale rejection, death, vacancy, property continuity, detached validation and retained campaign absence. All example placements are test fixtures.
