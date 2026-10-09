City republics

The city_republic form belongs to a continuing civic institution. Its realm id identifies the public holder, county jurisdiction and existing treasury. Office incumbents are ordinary characters, with personal money, family and private property. Selecting the protagonist grants a public office without absorbing the polity into the playable dynasty, raising personal station or transferring county title. Life tenure never creates a hereditary claim.

Constitutions and interests

data/civic_profiles.js declares civicProfiles and the corresponding shared constituencyProfiles. A constitution names its constituency, office eligibility, executive rule, interim council, ordered offices, individual tenure and salary, and the required influence fraction for each reserved operation. The constituency owns the only membership/interest record through governmentSupport. Magistrates do not create a competing council or treasury. A compatible existing electorate is reused after pending selections, approved decisions and live public commitments have settled. Its former delegate mandate ends while its membership and historical records remain; civic record serials continue beyond the shared records.

The first office is the external reference for portrait and ruler generation, while each office has its own character, mandate, vacancy, expiry and salary period. Chief, majority and unanimous executive rules assess actual available and willing office holders. Reserved civic influence is an additional requirement. Ordinary receipts, local defence and scoped public administration continue during a vacancy; foreign commitments and offensive campaigns wait for the declared executive quorum. Existing troops, equipment, supply, travel and upkeep remain canonical.

The 1204 Venice opening uses a life-tenure doge and three represented civic interests. The Genoese consular profile is a reusable interpretation of the 1143 oath tradition with separate sworn admission and annual consuls, represented by two offices for simulation. It is not assigned automatically to Genoa in 1204. A fictional service city accepts either sex, requires prior service, and uses three staggered terms with majority decisions. Qualification numbers, influence weights, salary, fees, reduced office count and support thresholds are explicitly game rules. Historical boundaries and sources are in docs/research/civic-republics.md.

Selection and turnover

FB.civicGovernment.officeQuote projects nomination, support, selection, recognized selection, admission, resignation and evidence-based removal. The civic_magistracy adapter uses governmentSelection.reviewSource and commitSource. Each apply repeats the pure quote and compares exact terms, profile, electorate, control, support, qualification, living people, turn and resources. A stale or repeated apply spends nothing. A personal nomination charge buys neither membership nor office. Recognition derives support from the declared interests; weighted explicit votes use the same canonical vacancy and threshold.

Death, custody, exile, lost qualification and expiry open the affected office once. Removal requires current neglect, overreach or ineligibility plus lawful recall assent. overreach is explicit evidence recorded by attemptOverreach after an attempted reserved act fails its current civic decision. Ordinary AI uses the same nomination, admission and recognition reviews, waits when a protagonist is nominated, manages low public funds with reviewed dues, repays affordable due debts, requests renewed foreign recognition and considers white peace after four war seasons. It neither generates a new family heir nor restores an opening incumbent. If no eligible local people remain, the office stays vacant.

Public commitments and foreign rights

proposalQuote/proposalApply handle temporary extraordinary dues, public borrowing, repayment, limited foreign contracts, renewed recognition, surrender and county grants. launchWar and makePeace commit separately reviewed ordinary-war operations. Bare offensive registration, white peace and government replacement cannot bypass their review boundary. A grant is a permanent sovereign county transfer; it excludes the capital and the last county, removes the granted county from civic interests, and preserves household property.

Foreign rights reference an exact host realm, county and settlement. quarter, warehouse and commercial are non-sovereign recognition; jurisdiction supplies Peace only at that site; revenue_share assigns a declared fraction of the site's public tax, toll and national receipts. The source must be publicly held. Price moves once between actual treasury counterparties. Incoming and outgoing receipt adjustments match, aggregate active or suspended unexpired assignments cannot exceed the source, and private enterprises provide no public collateral. Existing source grants and household income retain their owners. These rights add no ships, armies or new trade network.

A right becomes suspended when the host loses control, either polity ends or their ordinary war begins. Expiry and surrender end it. Reinstatement requires original host control, an unexpired term and fresh bilateral assent; military reconquest alone awards nothing. Historical opening rights require an evidence reference and give zero numeric receipts unless separately modeled through an actual negotiated source. Office turnover retains every institutional right.

Money and careers

Public dues enter ordinary realm receipts. Public debt credits the city treasury from an actual lender and repays the quoted full outstanding amount; the household purse pays nothing. Civic salary is a bounded seasonal transfer from real public funds after the protected reserve, credited once to the actual incumbent. A salary projection never credits money. TreasuryCharacterRealm does not turn an NPC magistrate's private wallet into the public treasury. Public construction and military costs continue through existing ledgers.

The eight personal station bands remain available with local professional, economic and public-service standing routes. Institution size remains a realm rank used for its public account. Wealth can establish personal standing but cannot create membership or an office. Household enterprises, marriages, private loans and inheritance keep their existing rules through selection, resignation, removal and death.

Conversion and persistence

An old territorial campaign keeps its saved form. conversionQuote/convert provides deliberate adoption by an independent direct local court with existing qualified nominees and unanimous founding civic assent plus the current court's treaty consent. Subordinate courts, selection-managed or delegated constitutions, occupation, war, active public commissions and federate service must be resolved before this transaction. The review includes the current ruler, existing family, public treasury, authority rights, household and proposed nominees. The commit keeps canonical property and contracts, creates offices from those people, and creates no opening overseas concession or new character.

The former royal tree remains the one genealogical record, with its old generation and policy preserved for family reference. Civic succession overrides its former political policy; it no longer appoints rulers or acquires a second tree. Genealogical deaths remain recorded. Public ruler generation belongs to the chief civic office. Arbitrary replacement of an established civic constitution remains blocked; an exit constitution needs its own lawful policy and commitment mapping.

authority.governments[realmId].civic schema 1 stores institutionId, profileId, originFormId, serial, revision, ordered offices, citizens, bounded mandate history, rights, debts, dues and overreach. Fresh declarations have originFormId null; deliberate adoption records the prior nondelegated form. Bounds are eight offices, sixteen nominees per office, thirty-two retained citizens, twelve history entries, twelve rights and eight debts. Ended right/debt records are pruned when another is created; history is a rolling tail. No quote, rendered prose or duplicate treasury is persisted.

Detached validation checks exact fields, policy and person references, ordered offices, vacancy generations, resolution links, record identity/serials, term lengths, receipt sources and aggregate shares, dues limits and debt amounts before save adoption. Missing civic state in an active civic form is invalid; legacy territorial saves need no civic state. Restore never runs initialization, conversion, nomination, election, payment or concession creation. Existing save-v4 and subsystem version numbers remain unchanged.

UI and localization

The Civic government deed uses shared review fact, person and action cards. It presents profile, interests and influence, qualification, term, salary, public reserve, household money, exact counterpart and scope, receipt share, duration and repayment before confirmation. Selector, scroll, focus and disclosure state survive Back, Escape and outcome return. Review civic constitution supplies native profile and founder selectors and a separate confirmation. Data display owners are civicProfile, civicOffice, constituencyMember and governmentContest. Saved announcements are message descriptors; standard and CrazyGames editions use the same rules and views.

Technology impact

civic_magistracies, civic_public_dues, civic_public_debt, civic_public_campaigns, civic_public_grants, civic_form_adoption, institutional_foreign_rights and civic_household_careers each have impact none. These capabilities depend on qualification, current institutions, consent, control and real resources. Ordinary military, enterprise and logistical technology requirements still apply. No research is invented as a prerequisite for baseline political selection or recovery.

Acceptance coverage

tests/e2e/specs/city-republic.spec.js covers all three profiles, shared-electorate reuse, pure projections, stale and duplicate commits, life and term tenure, separate executive vacancies, minority/interim rules, gender and sworn membership, recall, private property, conserved debt and salary, site-specific jurisdiction and receipts, lost host control, reserved war/peace/grants, explicit conversion, detached malformed saves, legacy territorial restore, natural seasonal replay, bounded turnover and mobile retained review in both distributions. Related dispatch, 1204 and structured extraction specifications register these inputs. Historical fit, appearance, touch, iframe behavior, long campaigns and test execution remain owner-controlled.

Shared institutional settlement ownership

The institutionalProperty succession capability is shared with ecclesiastical governments. Settlement holder matching and private actor normalization use that capability, so an incumbent cannot acquire public settlements merely by being the ruler, and private magistrate settlements do not become civic property. Existing public accounts and election records are unchanged.
