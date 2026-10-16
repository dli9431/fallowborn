Assembly polity

Public authority

assembly_polity composes all ten government slots. Its county holder is the community polity; its representative is an ordinary character with an explicit public mandate. Selecting that person neither changes household station nor grants private county ownership, a dynasty, royal council seats or hereditary succession. Local service permits personal standing, while mandate eligibility and represented support determine public leadership independently.

data/assembly_polities.js supplies two policies. Northern coastal households inhabit one county, Tallinn, in the 476 bookmark. The settlement federation example is fictional and is not attached to a historical bookmark. Its different influence weights, service requirement, nomination fee, finite term and obligation ceilings exercise the same engine. Historical limits and the source are recorded in docs/research/assembly-polities.md.

Shared constituency contract

FB.governments.support owns membership, eligibility, nominations, selections and mandates. government_support.js installs that contract, government_collective.js owns consent and agreements, and government_assembly.js registers strategies and integrates existing transactions. There is one governmentSupport state root, not a separate electorate for each strategy. Typed profiles provide numbers, enums and references; they cannot inject conditions, effects or JavaScript.

Each represented interest has a county or character principal, county scope, weight, customary or service basis, and institutional or personal continuity. A dead personal principal suspends the institution. An institutional interest can explicitly repair its principal to its county; repair never reopens a completed selection. Personal continuity has no automatic successor. Household property and customary jurisdiction survive both cases.

Nomination requires local residence, declared adulthood, freedom where required, effective skills and completed service. The player's nomination fee comes from personal gold; NPC nominations use public funds while retaining the declared reserve. Weighted recognition chooses a qualifying nominee, with stable character-id ordering for ties. Policy support, county opinion and the proposer's diplomacy govern automatic recognition. The coastal profile has no fixed term; the fictional profile expires after 720 days. Death, ineligibility, resignation, declared expiry and justified recall open a single replacement selection. Recall requires evidence of neglect, denied reserved overreach or ineligibility, and the profile's represented influence threshold.

Reviews and divided consent

Pure quotes include the current day, mandate generation, exact members, policy, eligibility, territory and relevant resources. Commit functions recompute and compare the complete review before charging or changing authority. Decisions bind exact normalized terms and the current mandate. Approval is consumed once. Refusal is bounded durable state, costs nothing and may be reconsidered when the underlying ballots change. Queries do not generate characters, consume randomness, advance ids or initialize institutions.

Ordinary household work and local defensive recruitment do not require a delegate. Declared customary rights continue independently. A mandate permits scoped public command, arbitration and receipts; it does not grant arbitrary taxes, communal sales or collateral. Offensive war, outside agreements, new dues and conversion require fresh collective assent. Communal grants and pledges have no supported transfer transaction and fail closed. Raw war registration and government replacement enforce the same boundary as reviewed UI actions. Manual fiscal-render calls cannot invent household obligations in an assembly county.

Economy and external relationships

Revenue and levy strategies apply profile rates and ceilings. Extraordinary dues have an explicit amount and expiry, remain inside the seasonal public-income ceiling and cannot overlap another active extraordinary levy of dues. Public receipts do not become the delegate's wallet. NPC decisions use the same quoted transactions: eligible local nominees seek recognition, a poor community may seek temporary dues, and an old campaign may seek white peace. Member refusal and counterpart refusal remain binding.

Outside tribute, protection, service and delegated authority have an exact one-time public payment, county scope and expiry. Treasury transfers debit and credit the actual parties. Service reserves part of the existing community force; protection shares a bounded part of the partner's existing force during war. Neither creates soldiers. Delegated authority gives only the named power in the declared scope. Agreements with another assembly currently require a separate bilateral implementation; white peace already obtains both assemblies' assent. A stronger outside belligerent can withhold early white peace.

Military transfer changes occupation while preserving the community holder, households and customary obligations. A reviewed tribute or protection settlement can restore local military control. A separately reviewed government settlement ends delegation and changes the form. Conversion is blocked until current public agreements and temporary dues expire, preventing their silent cancellation. No occupation automatically chooses a new constitution or destroys the polity. No assembly conquest generates private territory or an automatic higher title.

Persistence

governmentSupport.schema is 1. Each polity has stable id, profileId, scopes, serial, revision, typed members, one mandate, one selection, at most 12 decisions, 12 history entries and 12 agreements, and at most one temporary dues record. Membership and nomination lists are bounded at 16. Serial ids distinguish selections, mandates, decisions, replacements, agreements and dues. The compact save carries this ledger without rendered text.

Detached validation checks principal and county references, scope ownership rules, unique members, bounded numeric values, term policy, ruler generations, selection resolution, decision quorum and commitment shape before adoption. An absent root stays absent on legacy restore; restore never seeds the new opening or backfills a dynasty. Character retention protects current delegates, open nominees and member principals. Expired commitments remain inert until bounded replacement prunes them.

Presentation

The Local assembly deed opens shared fact, person and action cards. It shows represented influence, eligibility, reserved decisions, public reserve, costs, duration, scope and refusal reasons. Confirmation checks the captured review again. Modal history retains the outside partner, focus, disclosure state and scroll through Back, Escape and completion. The normal family tree remains a family record. All display strings use the localization layer; membership, mandate and decision ids remain untranslated.

Technology review

assembly_delegation is none: local representation, nomination, replacement and justified recall are baseline political relationships. assembly_reserved_consent is none: assent, refusal, outside agreements and reviewed government settlement depend on current rights, costs and commitments, not research. assembly_local_obligations is none: bounded local dues, arbitration and defensive service support ordinary community life. Optional future capabilities need their own review rather than adding a research gate to these basic institutions.

Coverage

tests/e2e/specs/assembly-polity.spec.js covers both declarations, pure projections, exact reviews, fees, eligibility, public succession, recall, repair, refusal, reserved authority, financial and troop conservation, war and occupation, conversion, detached save rejection, bounded continuity, ordinary household replay and retained mobile navigation. The outer-region specification includes the new scripts in its runtime dependencies. tools/test_i18n_catalog.py covers the new structured display owners.

The declaration checks retain Tallinn as an inhabited community in the baseline world. Service and protection fixtures stage local development and support with realm-cache invalidation, then consider each peaceful independent regnum realm with a rally county and treaty consent in id order. Partner provisioning raises the candidate's actual eligible recruitment counties, including subordinate territory and private settlement sources that a directly held county list can omit, to development 20 and support 100. The first candidate with more than 100 actual deployable troops after the opening's garrison deductions becomes the partner; a rejected candidate's staged counties are restored. The wider 476 revision's one-county Abazgian court remains at the minimum host, so the alphabetical first candidate is not assumed. An exhausted setup reports every candidate's capacity, county development, support, levy modifier and modifier records, recruitment blockers and garrison burden. Conservation assertions continue to compare the actual source and recipient forces.

867 corporate settlement consumer

data/bookmark_867_expansion.js adds the middle_niger_867 policy for Jenne-jeno. Cultivating, river and craft households are reconstructed interests based on archaeological interpretations of distributed corporate authority, not recorded electors. Equal weights, 60 percent assent, a renewable 720-day term and bounded dues are authored mechanics. The existing pure review, mandate, recall, reserved-consent and private-property rules apply unchanged. The date spec covers commoner nomination, recognition, selection, stale review rejection and saved delegation without household inheritance transfer. Source confidence and the distinction from neighbouring courts are in docs/research/867-districts.md.

Spring 1204 starting representatives

The Middle Niger and Siwa profiles are independently dated simulation policies with the limits stated in docs/research/1204-terrain.md. Their beginnings select the existing representative at freeholder service tier 1. Delegate, members, mandate, public holder, protocol ids and public treasury are retained under the institutional realm id; the player starts a separate private household and wallet. Selection, public authority and household station remain separate. existing_delegate_start has technology impact none: beginning in an already selected public role uses ordinary eligibility and mandate rules. The government rank-to-tier projection determines the starting tier, rather than inferring a hereditary rank from personal standing.
