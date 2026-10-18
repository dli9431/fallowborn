Roman offices and imperial claims

Occupation and claimant boundaries

docs/designs/occupation-and-claims.md records the existing separation between territorial holders, campaign occupation, scoped customary rights, recognition and conserved public renders. The complete river-control.json and upland-control.json authoring examples exercise a nonpossessing outside actor and an explicitly granted Peace jurisdiction without a second county tax stream. Neither diplomatic standing nor a military controller supplies an opening fiscal institution.

Spring 1066 district commissions

The 1066 habitation revision does not install a new county office or replace Seljuk or Makurian government. Their existing authority and systems remain in force across the entire court. Occupation and a superior political relationship alone do not establish an appointment catalogue, fiscal constitution or hereditary estate. Dated Seljuk and Nubian provincial policies require independent government research before assignment. The outside lower-Syr demand remains a claim rather than an active revenue contract.

The optional roman_offices system is enabled by the late antique era and disabled by default. The regnum, roman_civic and federate_polity government forms each declare an officeCatalogue and use the roman_offices AI strategy, which retains federate contract negotiation. The medieval territorial form and the 867/1066 availability sets keep their existing behavior. New office definitions, labels and petition qualifications live in data/political_institutions.js. The catalogue follows docs/research/476-bookmark.md and the Notitia Dignitatum: https://sourcebooks.fordham.edu/source/notitiadignitatum.asp. The source describes an earlier administrative framework, not an exact roster for 476.

Magister militum and its court/regional variants, comes rei militaris, dux and tribunus grant Ban over one exact host. Praetorian prefect grants Peace and Revenue throughout the appointing realm's current territory; comes sacrarum largitionum grants Revenue there. Urban prefect grants county Peace and Consent, subject to the existing community-consent check. Vicarius, consularis, corrector and praeses grant county Peace and Revenue; comes rei privatae grants county Revenue; defensor civitatis grants county Peace. County scope is a bounded-map abstraction of a provincial or estate jurisdiction. Host scope abstracts one commissioned field army or regiment; regional office names do not create another territorial hierarchy. Patricius and consul are personal honors with no powers. These honors and the magister militum variants require an appointing ruler who is a living imperial claimant with a current legitimacy source; ordinary successor kingdoms cannot create them simply by selecting a Roman office label. A consulship ends at the campaign calendar's next year boundary. The UI represents one consular seat per appointing court, rather than reconstructing the historical pair.

Realm-scoped civil grants are evaluated against the current territory on every power query. GrantedCounties projects that same territory for the existing justice consumers. Conquest immediately removes authority over lost counties. No office transaction changes county owners, direct holders, settlement property, player station, levy ownership or private income. Public Revenue continues to use the existing reviewed render transaction and pays the appointing institution. A Ban commission controls only its host, without manufacturing troops or a fief.

FB.officeCourts, officeScopes, officeClaimants, officeRecognitionMandates and officeAppointmentQuote are pure reads. The appointment quote names the applicant, appointing court, scope, exact fee, qualification, term, ruler generation and a detached signature. A free adult household may petition while resident in the court's territory or beside its host, after meeting the displayed skill and retained-prestige requirements. A court can nominate an officer with the same skill requirement; it pays no applicant registration fee and needs no personal prestige ledger. Petition fees are spent once on acceptance. The high-level officeSeekAppointment revalidates before recognition, appointment or payment. Existing low-level authority APIs remain available to authored stories.

A reaffirm office becomes ineffective immediately on appointer succession and is recorded as contested at seasonal cleanup. officeTransitionQuote/officeTransition let the current court, or a resident holder petitioning that court, reaffirm an eligible appointment without payment. Supporting commissions must still be live or capable of issuer reaffirmation. Revoked or expired proof cannot be revived. Confirmation cannot displace another effective holder of the same seat. Personal honors continue through appointer succession, are not inherited by the holder's children, and end on death or their fixed deadline. Death, lost scope, extinction and ended terms expire contested records as well as active ones.

Every living claimant to a recorded imperial office appears separately, including removed or displaced officeholders. Read models show current recognition records and their revoked or suspended history, with no universal legitimacy score. A court ruler may issue its court's commission; an actual host commander may declare army acclamation; a holder of local Consent may speak for that city; a serving religious officeholder may supply church support. A landless household with none of these mandates sees the missing mandate as a blocker. The reviewed declaration costs a household 5 prestige and no money; a court declaration has no personal prestige cost. Recognizing a rival withdraws only that mandate's other scoped support for the same imperial office. Contestation withdraws only the issuing mandate's recognition. Neither decision installs a ruler, deletes independent sources or transfers territory.

Seasonal government AI uses officeAppointmentQuote/officeSeekAppointment, officeTransitionQuote/officeTransition and officeClaimQuote/officeDeclareClaim. It may materialize its current ruler at the mutation boundary, never during a read. Existing adult court members and resident civic notables are considered before the ruler. A court makes at most one new ordinary appointment per season and reaffirms retained officers on succession. Displaced imperial incumbents remain contested claimants while an actual new ruler generation can commission its successor. Explicit removal or vacancy is not reversed by an ordinary seasonal pass. state.officeCourtPeriod prevents repeated appointments and declarations in the same season, including after save/restore. A direct officeCourtAI mutation also checks the saved appointment periods before filling another ordinary seat.

Imperial succession reads the durable appointment ledger even when every former claimant is dead and absent from the claimant display. An ended tenure from an earlier ruler generation can establish succession; a ledger containing only explicitly removed imperial appointments cannot. The successor receives one effective appointment through the existing authority transactions, without reviving a dead holder.

Succession regression coverage calls the real government office AI for the Dalmatian, western and eastern courts directly at staged season boundaries. It checks one new regional appointment, same-season idempotence, a preserved western deposition, the eastern claimant transition and exact authority/RNG/uid preservation after restore. A separate saved-period case checks that an already completed global office season is not replayed. These targeted cases avoid repeated whole-world seasonal passes; they do not establish world-season performance.

Technology impact: roman_office_petitions and imperial_claim_contestation each use none. Service qualifications, living issuers, exact scope, fees and political continuity govern baseline office access and recognition. Existing authority_appointments, authority_command_commissions and authority_recognition reviews remain applicable. The regression specification is tests/e2e/specs/476-offices-legitimacy.spec.js.

# Shared political facts and authority

Status: Phase 1 shared facts and Phase 2 scoped authority are implemented on the
476 branch. [Phase 1 record](../plans/v2-476-phase-1.md) and
[Phase 2 record](../plans/v2-476-phase-2.md). Existing 867/1066 behavior remains
the compatibility reference. [Phase 6](../plans/v2-476-phase-6.md) integrates
the save-v4 boundary. Authority validation preserves expired and historical
references while rejecting duplicate identities, reused sequence numbers, invalid
office scopes and malformed payment records before restore adopts state.

## Facts, permissions and transactions

A character, a realm, an office and a place are different identities. A person's
station describes social position. County ownership identifies the sovereign
bloc; county holding identifies its direct territorial institution. Neither
fact proves who has an appointment, commands a particular host, receives a
particular payment, or can judge a particular captive.

The Phase 1 namespace is FB.political, defined in politics.js. It composes
existing queries in world.js, model.js, lordships.js and the owning subsystems.
The classic script load order is unchanged; callers resolve these functions
after engine loading. A query call receives state explicitly and resolves current
facts; it never implicitly uses FB.state from a different campaign.

| Query | Input and result | Existing source / boundary |
| --- | --- | --- |
| actor(state, actorRef) | Live typed character or realm; characterId, realmId, relationshipId, station, rank, tier, rulerMemberId/rulerGeneration, liegeId/sovereignId, provinceId, cultureId/religionId/realmReligionId | chars, player, compact succession, realmRulerCharacterSnapshot, verified ruler index |
| place(state, placeRef) | County/site ref, provinceId, ownerId, holderId, detached holder ref, current county ruler actor | owner/holder, settlementCountyHolder, settlementHolder, world/site tables |
| relationship(state, actorRef, otherRef) | Both actors; sameActor, sameRealm, sameSovereign, directLiege, higherLiege, directVassal, subordinate, detached liegeChain | Current saved lieges, topRealm, liegeChain; higherLiege includes the direct liege |
| territory(state, realmRef, scope) | Detached ordered county ids; scope is direct, subtree or sovereign | realmHeldCounties, realmTerritory, realmProvinces of topRealm |
| offices(state, actorRef) | Detached office rows: ref, holder, scope, source in ref, status, terms | Council seats, bishopric, religiousHeads, papacy, militaryCommand, castellany, household/career records |
| office(state, officeRef) | Current matching row or null | Re-resolves the reference holder's current offices |
| role(state, roleId, context) | Existing actor or null; lord requires explicit context.provinceId | Current county ruler, roles, spouseId, courtingId; never getRole's creation path |
| permission(state, realmRef, operation, context) | allowed and machine-readable reason | Only grant_settlement is converted; delegates to settlementGrantEligibility |

Typed references are explicit objects: actorRef is {kind:'character', id} or
{kind:'realm', id}; placeRef is {kind:'county', id} or
{kind:'settlement', provinceId, settlement}. A site id can be resolved through
the existing physical-site table, but it must not be confused with a county id.
An office reference is {kind:'office', institutionId, officeId, source, holder};
holder is a typed character or realm reference, and source names the existing
record family. These references identify legacy slots/holders; they are not
durable appointment IDs or stale-confirmation signatures. A realm-held religious
office retains its realm holder reference instead of pretending that the ruler
personally owns it.

Character identity and institutional capacity stay separate even when the same
person fills both. Do not silently normalize every character to their realm:
a ruler may also hold private property, a bishopric or an unrelated commission.
Compact rulers return member identity and generation even if characterId is null.
Null materialization does not mean the office is vacant. A missing or dead actor,
unknown place or invalid scope returns an explicit unresolved/denied result;
a request with missing context never falls back to the player's home or sovereign.

### Current migration and scope

Home county authority and realm/character interaction cards use the shared actor,
place and relationship reads. Settlement grant previews and confirmation use the
same permission adapter through settlementGrantQuote. Its explicit context is
{provinceId, settlement, recipientId}; the grantor is a realm reference. Missing
context fails closed. Other operations return unsupported_operation. Reasons are
internal codes; the existing UI retains its current explanations and cost display.
The quote still owns all fiscal terms and its full stale-review signature.

A landless protagonist has realmId null and relationshipId 'player' for existing
incoming institutional relationships. Character station and player tier remain
distinct fields. Compact rulers retain realm/member/generation identity without
creating a character. Dead actors resolve to null. Place.ruler is the county's
ruler; a delegated settlement's personal holder is in place.holder. Community
partitions remain in their existing population API, with no duplicate projection.

Council, bishopric, religious-head and valid command rows have status active.
Castellany, papal, family, retainer and guild rows have status recorded: a saved
record exists, but its owning operation must decide eligibility, expiry or repair.
Neither status grants a new power. The query never runs the household, career or
papacy normalizers. Legacy spouse links likewise remain untouched. Office terms
are detached copies, and office references include the holder so replacement
cannot silently return an appointment belonging to a different actor.

## Read contract

Reads do not initialize, repair, appoint, materialize a court, synchronize a
ruler's display fields, move land, pay, queue events, consume RNG, or change saved
records. Transient derived index population is allowed. Repeated reads have the
same result, preserve JSON state and RNG, and never expose mutable cached arrays
or saved record references to callers. Preserve existing insertion order wherever
it affects iteration or tie breaking; sort only at an explicitly authored boundary.

Use realmRulerCharacterSnapshot, not realmRulerCharacter (which synchronizes
compact ruler fields). Do not call ensureRealmCourt, ensureRealmSuccession,
ensureReligiousHeads, councilEnsure, repairPolitics or getRole from these reads.
Legacy functions containing lazy initialization need a snapshot adapter, not a
new name for the same mutation. Audit callees as well as the top-level helper.
The existing explicit realm-sheet court-fill action remains a separate mutation;
the shared card model must not trigger it.

Phase 1 wraps one operation at a time. The preview and committing function must
use the same adapter, and that adapter must call an extracted pure rule if calling
the old public eligibility function would recurse back into permission.
Price, technology, personal eligibility and resource checks stay with the owning
system. A generic political permission is not a full purchase/war/grant quote.
An operation's reviewed quote carries all its existing cost, recipient, target
and ruler-generation checks. Confirmation re-reads them before payment or RNG.

No new eligibility is introduced in Phase 1. In particular, preserve legacy
holder fallback to owner, realm-vs-player semantics, court generation identity,
bishop and command exceptions, existing Council consent thresholds and the
current distinction between home authority and personal noble vassalage.
Invalid saves are repaired at restore, not opportunistically in a UI query.

## Phase 2 independent powers

| Power | Questions | Examples of legal basis |
| --- | --- | --- |
| Ban | May this actor command this host, muster these troops, or issue this campaign order? | Current territorial service, exact command commission, federate service contract |
| Peace | May this actor arrest/judge this target here, protect a route, or enforce a settlement? | Territorial jurisdiction, judicial appointment, valid custody and safe conduct |
| Revenue | May this actor collect this render, toll or payment from this payer? | Territorial receipts, charter, fiscal grant or agreed service payment |
| Consent | Whose agreement is required for this exact act? | Council/Estates rule, civic agreement, institutional confirmation or contract term |

Permissions are evaluated for an operation, actor, target and place/host/contract,
not as four unconstrained scores. They can name multiple required consents and
competing claims. A command commission cannot grant arrest or taxation rights.
A recognized claim can coexist with another actor's physical control. Denial
must identify the missing basis; display labels never decide the outcome.

The existing Crown Authority number remains an input to the 867/1066 Council
adapter. It is not backfilled into four fabricated grants, and it is not reused
as a universal 476 legitimacy value. Station still governs social opportunities
where genuinely appropriate; only political eligibility moves to authority.

Technology decisions: Phase 0 is documentation and Phase 1 is internal parity
work, so neither adds a techImpactReviews entry. The implemented appointments, commissions, federate service, customary rights,
recognition and civic consent each have a **none** entry in the technology
impact ledger. Legal scope, consent and resources govern them. An advanced
fiscal or administrative technique needs its own review and ungated fallback.

## Derived projections and invalidation

The existing world cache indexes sovereign provinces, direct holdings and direct
vassals by state identity and a dirty flag. realmStateRevision advances at
invalidateRealmCache. Its strength projection separately expires by turn.
The ruler index verifies cached identities; the settlement holder index and
politics repair cache have their own revisions. Reuse these stores and keep all
new projections transient. A place lookup must not scan all realms or counties;
a realm collection query should use the existing index.

Actor, place, relationship, role and office projections are uncached. If a later owner profile
justifies caching one, key it by state identity and all dependencies below.
A single realm revision is insufficient for appointments or conversion. A
once-per-turn key is insufficient for same-day grants and succession.

| Mutation | Authoritative owner | Dependent reads to discard |
| --- | --- | --- |
| Conquest, county grant/revocation, settlement award | transferProvince, grant/settlement transaction | Place, direct/subtree/sovereign territory, relationships, fiscal/recruitment permissions, home authority; world + settlement indices as affected |
| Liege change, independence, escheat/absorption | World/hierarchy transaction | Ancestors, sovereign, subtree, political court, taxes/dues, command/service scope, religious/eastern relations |
| Settlement grant/reversion | lordships mutation | Site holder, direct sites, construction/revenue/levy scope; current settlement invalidation fan-out |
| Appointment/dismissal or religious-office vacancy | Council, papacy/model, command or future office transaction | Actor offices, consent, jurisdiction and command; no territorial change unless an explicit grant is also committed |
| Ruler/protagonist succession | advanceRealmSuccession, protagonist succession, papal election | Ruler index, actor/role identity, generation-stamped commitments and offices; inherited territorial facts remain territorial |
| Culture/faith conversion, doctrine or obedience change | Conversion/faith/papacy transaction | Ruling identity, recognition, eligibility and political court; county/site communities change only when explicitly converted |
| Save restore, new world/bookmark, mods activation | save/world/mods boundary | All per-state and definition-derived projections before exposing the new campaign |

For the converted settlement assignment boundary, invalidateSettlementLordships
advances its own revision once and calls invalidateRealmCache once. The latter
already advances militaryInputRevision. The following building-index eviction
is told that military inputs were already notified, with no intervening read.
This removes both duplicate military bumps while retaining both index evictions. Confirmation of a player-to-NPC settlement grant advances those three
revisions once each; rejection advances none. Other existing transactions may
have nested writes and reads, and are not claimed to have one global revision
increment. No new query cache needs an appointment/conversion invalidation: these
facts are read afresh. The owning mutation must still invalidate the existing
world/settlement indices when territorial facts change.

Coalesce notifications at an outer transaction boundary only after tracing reads
inside it. Any intermediate read after a write must see that write; deferring a
dirty mark across such a read is invalid. Queries never invalidate. A no-op,
cancelled or rejected transaction must not notify. Repeated invalidations before
an unread cache is rebuilt should produce one rebuild, with no duplicate notices,
charges or RNG calls. Author focused instrumentation assertions for each converted
boundary without changing unmeasured unrelated caches.

## Durable state diagram (Phase 2 prototype)

~~~mermaid
flowchart TD
  C[Character: identity, station, family] --> A[Appointment: office, institution, holder, scope, term]
  I[Institution: realm or civic/religious body] --> A
  L[County owner and direct holder] --> Q[Shared fact and permission queries]
  S[Settlement delegation and communities] --> Q
  A --> Q
  F[Federate contract: parties, pay, service, settlement terms] --> Q
  R[Recognition: issuer, claimant, basis, scope] --> Q
  U[Customary right: beneficiary, scope, basis, transitions] --> Q
  C --> Q
  Q --> V[Disposable views and reviewed quotes]
  V --> T[Revalidated owning transaction]
  T --> A
  T --> F
  T --> R
  T --> U
~~~

Phase 2 records use semantic IDs, parties, exact scopes, creation/expiry turns
and transition status. Appointments are active, contested, expired or removed;
a contested honor exercises no power. Contracts carry paid-through and
fulfilled-award stamps. Recognition names its issuer and subject and follows a
source-specific reaffirmation/continuity policy. Customary rights carry basis,
strength and transition history.

The diagram describes relations, not new county or realm nodes. Phase 2 uses
realm, host and county issuers; site-keyed civic bodies and moving courts are
Phase 4/5 content. Territorial realm nodes still describe territory. Phase 3 resolves canonical title aliases and exposes an opt-in save-v4 migration
prototype. Ordinary version-3 serialization remains the active save format until
the completed 476 release.

Old saves continue to supply their existing owner/holder, succession, communities,
settlement lordships, Council, Estates, offices, war and treasury records. A
legacy view can expose these without adding appointments or rights to the save.
Alias migration resolves old title ids before validation, writes canonical
ids and rejects ambiguous geography. Do not infer new offices or legitimacy
from a title string, religion name, culture or tier during repair.

## Acceptance cases for implementation

For both 867 and 1066: compare the same save, inputs and RNG before/after each
migration. Check direct holder vs sovereign, a delegated baron, a commoner,
a vassal ruler, a sovereign ruler, a bishop without land, an appointed commander,
a religious vacancy and a compact ruler without a materialized character.
Repeated reads must preserve saved state and RNG. Check appointment, transfer,
liege change, conversion, succession and restore within the same turn; verify
fresh values and one rebuild/notification per affected transaction.

Permissions, displayed prices, recipient identity, target scope, charges and
outcome ordering must match the existing subsystem. Stale confirmation after a
ruler change must reject before spending. Phase 2 additionally requires cases
where land, command, jurisdiction and recognition belong to different actors.
Detailed journeys and pending owner evidence live in the Phase 0 baseline file.


## Phase 2 record and transition contract

`js/authority.js` extends the Phase 1 query namespace after `politics.js` loads.
A realm's government-form record selects territorial or delegated civic
consent while preserving its owner and holder facts. Omitted 867/1066 records
project the territorial form. The committed script order therefore resolves
legacy army, justice and Council
functions before any authority query runs. No read allocates `state.authority`.
Successful writes allocate arrays for appointments, recognitions, contracts and
rights; IDs are monotonic within that state. A failed quote or repeated
transition leaves state and RNG unchanged.

`power(state, actorRef, power, context)` answers Ban for `hostId`,
Peace, Revenue or Consent for `provinceId`, and Revenue for a
`contractId`. It returns an explicit basis; no score or culture label grants
all powers. `permission` maps exact operations to those powers while the
legacy settlement grant adapter keeps its original quote. `consent` answers
the old Council threshold and the two-party federate approval. `legitimacy`
returns live source records rather than one universal number.

Field command requires the exact live host; realm ownership remains with its
original realm. Judicial vicar and fiscal agent appointments can belong to
landless characters, but each has only its named county power. An appointer
succession suspends appointments with `reaffirm` policy until confirmed.
A recognition source with that policy likewise needs issuer reaffirmation.
Conquest or loss of a host makes its appointment ineffective; seasonal cleanup
records expiration. Recognition loss suspends an appointment tied to it.

A federate offer records pay, exact parties, service host, expiry, optional
promised settlements and an optional imperial recognition by the patron. Both current rulers must consent. The contract's Revenue
basis lets the federate collect only its agreed service pay; the patron gains
Ban on the service host and no Peace or territorial receipts. Seasonal payment
uses the existing treasury transfer once and stores the paid-through period.
Settlement fulfillment uses the existing quote and confirmation path, then
stores a fulfilled stamp. A separate county render uses a reviewed Revenue
quote, paired treasury transfer and obligation receipt; ordinary tax still
follows the territorial ledger. Breach, recognition loss, expiry, renewal and succession disable
the service basis immediately. The 476 story will supply decisions and player-facing
terms in Phase 4.

Customary rights are separate from de jure geography. A right starts at strength
50; tenure, judgment, recognition and possession can strengthen it, dispute and
abandonment erode it. Strength below 50 suspends its named power. Annual
possession/dispute updates have a year stamp, and revocation or lapse is
explicit. This is the underlying authority model; contextual sources and
outcomes arrive with the 476 scenario.

## Spring 476 situation

The first playable client of these records is the [spring 476 prototype](situation-476.md). The western and eastern imperial offices are realm-scoped ceremonial appointments with no Ban, Peace, Revenue or Consent power. Orestes, the federate commander and the Ravenna civic delegate hold distinct scoped offices. The Ravenna contract and its Classis award use the shared consent and grant quotes; Basiliscus and Zeno recognition follows the issuer generation. The bishop of Rome is a living character issuer whose support lapses on death.

Character-held religious heads

Political office queries include character-held religious head offices once per officeId. Their holders use character references and the same religious-office scope as realm-held heads. Existing recognition issuer and generation checks already accept either living character or living realm pointers. Clergy policy Standing targets the declared holder kind. These projections remain read-only and do not create an office assignment.


Dynamic customary rights and governing identity

New worlds can seed province.customaryRights independently of title geography. Seeds name a power, customary basis, optional beneficiary realmId and historical basisRef. The initial 476 data uses provincial court tenure at Ravenna, Rome, Salona, Soissons, Toulouse, Carthage and Constantinople in the authored regional declarations. These are limited abstractions of existing judicial and fiscal institutions, not claims to later county boundaries or invented civic charters. Other counties acquire possession rights through play.

Provincial seed regressions compare realm-beneficiary tenure rights against the declared county, issuer, beneficiary, power and evidence. Hereditary aristocratic interests add separate character-beneficiary tenure rights. Those jurisdictions retain their own records and do not replace provincial seed rights.

The annual authority boundary creates Peace and Revenue possession rights for each living direct county holder, including player and AI realms. An active possession key is reused after recovery of a county. Rights begin at 50 and gain 10 per year of possession, capped at 100. Lost possession or tenure loses 15 per year. Judgment rights lose 15 per year when their issuer loses jurisdiction; a lawful secular sentence with a consumed proven offense establishes or strengthens its adjudicator's local Peace right. Repeated judgment evidence cannot strengthen it twice. Revoked and lapsed records remain historical records. Existing exact rights-based war causes remain available where title parents are absent.

County-scoped imperial, dynastic and civic recognition records only powers the beneficiary already exercises through territorial rule, appointments or rights. It does not create Ban or invent a new jurisdiction for an otherwise unauthorized person. Renewed legal recognition explicitly replaces the corresponding right's basisRef and records the transition. Annual recognition accrual checks that exact proof, its scope, subject, issuer continuity and expiry; unrelated church approval cannot substitute for it. Church support and army acclamation remain their own legitimacy sources.

Government rows may declare eliteCultureId, eliteFaithId, legalIdentityId, tolerance, taxation and justicePolicy. The identity belongs to the institution and survives a government-form change and ruler succession. A missing declaration projects existing ruler and realm facts without adding records or changing legacy support. New 476 realms declare their identity explicitly. Changing elite identity never converts the household, rewrites county communities or redistributes settlement populations.

Community treatment uses existing Popular support. The annual change is the other-faith population share times -1 for preference, +2 for tolerant worship or -6 for persecution, plus the other-culture share times -3 for discriminatory taxation and -2 for imposed elite law. Equal taxation and personal law add no penalty. Existing active player royal religious policy overrides the local worship choice. These are political-treatment effects; they do not mint tax income or introduce a separate loyalty meter. Taxes, levies and revolt mechanics continue to read ordinary county support.

Civic consent uses current Popular support plus the projected treatment change. Below -25 a community opposes a civic agreement even if the actor still has a recorded consent grant. The grant is preserved and becomes usable again when support recovers. This rule applies equally to territorial and delegated consent and to player and AI callers. Permission reads, identity views and forecasts are detached, deterministic and do not consume RNG.

Local institutional votes and continuing civic bargains use the same community-consent result. Their reviewed facts include current governing identity, effective worship policy and community support, so a changed policy or support level invalidates an earlier review before payment or recognition. Promised tolerance requires protected worship; promised tax relief requires both extraordinary extraction and discriminatory taxation of other-culture residents to end. Seasonal institutional AI uses those same facts in its standing changes, demands and offered terms. A lapsed bargain retains its recorded recognition and can regain effective consent when its conditions recover.

FB.political.worshipProtected reads the effective county worship policy, including an active player royal policy, and the persecuted_minorities modifier. Local episcopal mediation and provincial church councils share this protection check. FB.political.communityGovernance exposes the effective tolerance separately from the declared identity, along with community shares and projected support.

Governing identity, dual jurisdiction, local tolerance, tax treatment and court policy each have technology impact none. These are baseline institutional and social choices with no credible research dependency; customary rights retain their existing none review. The identity confirmation quote rechecks ruler generation, form, current declaration, turn, directly held territory, live community counts, support and effective royal policy before applying it. Quotes and forecasts are never saved.


An explicit realm-wide faith conversion updates a stored elite-faith declaration through the existing conversion transaction. Personal and household conversion leave it alone.

General federate terms and moving polities

FBDATA.federateContractTerms in data/political_institutions.js defines seasonal pay, optional initial equipment pay, duration, renewal window, host service, land and recognition policy. FB.political.contractTerms expands a template for explicit parties and scopes without mutation. FB.authorityOfferContractTemplate copies accepted numeric terms into the durable contract. Existing offers without a template remain manual, including the Odoacer household bargain.

The federate_contracts government AI strategy proposes a land award where its patron owns the destination and paid service otherwise. Each current ruler independently consents; an AI never consents for a protagonist ruler. The patron requires the initial payment and one season of pay to be affordable. Initial equipment pay transfers only at the second approval, stamped by initialPaidTurn, and is never repeated at renewal or restore. Seasonal payment remains one paired treasury transfer per paidThroughPeriod. Failed payment breaches service rather than creating debt.

FB.political.contractRenegotiationQuote and FB.authorityRenegotiateContract review and revalidate pay, expiry, parties, ruler generations and current scopes. Renewal resets both approvals and preserves fulfilled grants and payment stamps. Eligible AI contracts renew near expiry or after succession; breached contracts need an explicit new bargain. A live recognition-dependent contract cannot renew under a stale issuer. ineffectiveReason exposes succession, lost recognition, lost host, missing party and expiry. Durable Chronicle messages report initial and seasonal payment, renewal, breach and succession. The host owner keeps its banner and troop expenses; a service agreement grants the exact host friendly access to patron territory without transferring territorial revenue or jurisdiction.

FB.federateOfferReplacement can replace template-backed service between the same AI courts and exact host. It checks valid new terms, available initial and seasonal pay, both courts' autonomous consent eligibility and competing service before ending the previous commitment. While new terms are unaffordable or need a protagonist ruler's consent, the previous service remains intact. Released service is retained as expired with transitionReason service_released and cannot auto-renew; the new commitment still requires the ordinary two approvals and payment boundary.

js/federates.js implements the non_territorial territory strategy. FB.federateBeginMigration accepts a landless polity, a patron, an existing or authored host, an inhabited origin and destination, a deadline and a territorial settlementForm. There is one live moving court per polity and host. Its ruler, consort and materialized children follow the host's actual county; active court ids are retained through court compaction, and a succeeding ruler joins the moving court. FB.political.movingPolity and movingPolities return detached records.

FB.federateRequest can request a negotiated county award, accept paid service or declare an ordinary objective war. FB.federateDeclineContract releases a rejected service bargain before a new request. A county award requires both courts to consent and the patron to own and directly hold the county. A vassal cannot give away its sovereign's county, and a sovereign cannot use this bargain to dispossess an existing county holder. Force establishes no county grant at declaration; occupation and peace must award the objective first. The polity owns its march, while force campaigns use ordinary tactical orders, provisions, battles and retreat. Deadline, defeat, extinction or loss of the exact host ends the migration once. A landless failed polity is retired with every remaining banner, and its story cannot recreate the lost host.

FB.political.federateSettlementQuote includes the current court, host, contract, ownership and generations. FB.federateResolveSettlement rejects a changed quote before mutation. A consenting land award or an already won county resolves a federate_migration case through FB.settlement.create and act, then uses transferProvince for the negotiated county, records the realm's direct holding, moves its capital and adopts the declared territorial government form. The resolved session remains with the migration; settlement and contract payment cannot replay on restore. Existing county communities and household property are preserved.

Technology impact: authority_federate_service remains none for general terms and AI negotiation. federate_moving_court is none because ordinary travel, provisions and living actors constrain baseline migration. federate_claims_settlement is none because occupation and consent establish ordinary holdings, without a discovery prerequisite.

Coverage: tests/e2e/specs/federate-migration.spec.js, authority-phase-2.spec.js, 476-situation.spec.js and eras-and-governments.spec.js.


African government identities use vandal_custom and mauro_roman legal declarations owned by the regional data. Vandal defendants use Vandal custom, Roman defendants use late_roman personal jurisdiction, and mixed disputes use the royal custom with a Roman assessor tradition. Moorish courts likewise distinguish customary and Roman parties. Carthage and Byzacena seed tenure-based fiscal rights labeled by the estate institution, separately from private property. Vandal estate preference is represented by the existing discriminatory-taxation support penalty, not tax exemptions or a new revenue stream. These are regional applications of the existing none-reviewed identity and customary-right capabilities.

Authored ruler control

Existing-ruler starts move the source court's ordinary authority references and contract approval keys to player once. Issuers, beneficiaries, scopes, appointment ids and generation stamps keep their meaning. Contracts require explicit player consent; the NPC service loop cannot consent for a player-controlled party. FB.treasuryAvailable reads the real player purse when an authority quote names player.

Nepos's reviewed recognition uses the current eastern ruler and the Roman civic delegate. Restoration requires actual Ravenna ownership and a living imperial recognition before an honor-only appointment in the restored court. The western office observer tracks that claimant and appointment separately from Romulus's original office. No office grants Italy by itself. Technology impact for western_claim_restoration is none: baseline political recovery depends on living recognition and ordinary military possession.

Royal family succession and existing mandates

Data-authored royal kin use the existing compact royalLine identity and advanceRealmSuccession transaction. Government registry dispatch selects the declared saved policy; a nephew or uncle takes the same realm's throne as an ordinary child would, advances rulerGeneration once and retains the dynasty. Existing recognition suspension, appointer-generation checks, appointment reaffirmation, treasury continuity and court relocation still own their effects. No family declaration creates a realm, changes a county owner/holder, pays a contract or confers an appointment. Starting kin is content; the separately selectable declared_royal_succession policy has technology mode none because ancestry and eligibility supply its constraints.

Declared opening households and local religious actors

js/bookmark_setup.js initializes bookmark opening actors before story creation. Named or generated profiles have stable declaration ids, explicit parent links and optional dynasty identity. Once the owning story creates its hosts, FB.bookmarkSetupAppointments submits declared offices through ordinary authority appointment and recognition transactions. Current appointer, office scope, expiration and succession rules apply. Older saves without bookmarkSetup acquire no opening actors, property or appointments on restore. Technology impact historical_opening_households is none because baseline family identity and office mandates require living political authority rather than research.

Local representative profiles seed name, born, sex, station, role, skills and traits only for the initial incumbent. Replacements use generated profiles. A congregation has a living priest or monk representative without an episcopal office or religious-head slot. Its church_support recognition names that character as issuer and ends with that person's eligibility; it grants no temporal power. Episcopal sees retain their office-backed issuers. Technology impact non_episcopal_congregations is none because protected worship and living representation govern access, under the episcopal_sees capability switch.

Contracted foreign-host appointments

A realm can appoint to an exact foreign host scope when an effective bilateral service contract names that host, the realm is its patron, the host belongs to the contracted federate polity and the parties are not hostile. The shared within check is used for appointment creation, effective powers, reaffirmation and the office scope picker. Own-host scopes retain their ordinary rules. Expiry, release, succession, lost host or hostility removes the patron's scope without changing the host's polity or transferring civilian jurisdiction. Holder and appointer eligibility remain necessary independently of the service contract.

The 476 Strabo declaration uses this rule for magister_praesentalis on host_476_thracian. County consularis and praeses warrants supply Peace and Revenue; the two Gothic tribunus warrants supply host command; Longinus's private estate supplies none of those powers. Technology impact federate_host_commissions is none: current bilateral service supplies jurisdiction, while ordinary armies retain their existing resource and research constraints. No historical person or host id is named by the generic authority reader.


Government strategy integration

Government dispatch now owns territorial Consent and typed levy, war, treaty and grant decision hooks. FB.political.consent projects the selected strategy and its constituency reference; existing contracts, council thresholds and authority transactions remain canonical. No constituency state is added. See docs/designs/governments.md for context fields and default delegations.
Local acclamation

A lineage kingship's county umbrella is distinct from kin membership, private ownership and public jurisdiction. Current generation, living ruler, valid principals and accepted obligations determine local_acclamation power. Existing independent appointments, commands and customary rights with a substantive legal basis retain their own rules. Mere territorial possession cannot replace local recognition. Levy, war, treaty, grant and extraordinary tax consent read the form's declared reserved operations. Public revenue and recruitment use negotiated fractions, while household estate production survives a vacancy.

Enrollment adds a bounded county community interest only after the ruler controls and directly holds the county. It requires another assent transaction before public duties apply there. A reviewed transformation may select only a declared target form and preserves rights, agreements, local institutions and private property. Direct form replacement cannot bypass this review for a selection-managed court.

Collective local authority

The shared constituency contract in FB.governments.support supplies typed members and public mandates. Political consent dispatches character actors to their actual delegated realm, while preserving household residence for nondelegates. Reserved offensive war, outside agreements, extraordinary dues and conversion need an exact current collective decision. Ordinary household activity, defensive recruitment and existing customary jurisdiction survive vacancies. Public mandate powers are scoped separately from household property. See docs/designs/assembly-polity.md.


Public administration

The optional public_offices system uses profile-owned public catalogues through the existing authority.appointments ledger. publicTerms schema 1 references a productive source and declared remuneration, service, remittance and succession confirmation. Pure publicAppointmentQuote/publicOfficeQuote reviews and their revalidating applies cover appointment, audit, repayment, confirmation and dismissal. Effective scope stops on death, custody, lost source/host, expiry or required sovereign confirmation. Public and private rights remain separate. Shared governmentRecognition projects living interests and stores bounded current support inside existing government rows; it creates no duplicate holder ledger. See docs/designs/administrative-monarchy.md.

Aristocratic provincial authority

aristocratic_monarchy reuses personal public commissions and the common recognition transaction while retaining permanent hereditary interests. Each interest references one perpetual fiscal appointment and separate Peace/Consent customary rights. Probate transfers those same public records to an existing adult of the house; private estate succession stays separate. Royal ancestry is required for sovereign candidature. Provincial negotiation, refusal, legitimate enforcement, minority stewardship and conversion use pure, fully revalidated reviews. A generic appointment dismissal cannot revoke hereditary jurisdiction. See docs/designs/aristocratic-monarchy.md.


Elective assent

Elective crowns use the shared living constituency and reserved consent transaction. Nomination grants no public jurisdiction. Vacancy retains only the profile-declared local courts, receipts and defensive service; offensive decisions await recognition. Explicit conversion requires existing principals, a qualified incumbent and the active canonical public account. See elective-monarchy.md.

Civic mandates and reserved acts

Civic offices reference the shared governmentSupport constituency and keep individual incumbents and terms inside the existing government row. Current profile, executive quorum and represented interests decide reserved proposals. Pure reviewed public transactions own debt, dues, treaties, permanent county grants, war, peace and founding conversion; raw form, offensive-war and white-peace shortcuts are blocked. Ordinary local administration and defence remain with the institution during a vacancy. Independent substantive warrants and customary rights retain their own authority. Foreign jurisdiction is a Peace right in one explicitly named settlement. See docs/designs/city-republic.md.

Office-bound temporal recognition

Ecclesiastical chapter assent uses the existing local congregation bargain. A distinct lay temporal confirmation reuses one imperial_commission record scoped to the institution and naming the current spiritual incumbent. The government retains only its recognition reference. Revocation blocks automatic renewal without changing the spiritual holder or property. See ecclesiastical-principality.md.

Scoped institutional recognition

The religious-institution issuer kind references a declared profile institution in localInstitutions. Its source must explicitly declare institutional:true and reaffirm succession. The default institution_support source grants no public rights. Effective support requires current qualified constituents, declared jurisdiction and any required canonical leader. Control, constituency or leader changes suspend recognition until explicit consenting renewal. A dispute revokes the existing authority record. Profile institutions use their own reviewed action contract; legacy civic bargains and episcopal appointments cannot supply substitute consent. See docs/designs/religious-institutions.md.


Runtime authority authoring

Authority offices, legitimacy sources and customary bases have explicit runtime JSON roots. Legitimacy declarations select permitted issuer kinds, optional character roles, a public mandate policy and whether existing county powers may establish recognition-based customary rights. The shared recognition picker enumerates these declared policies. An ordinary office petition resolves the first allowed court-mandate source in the office's recognitionSources; it does not require a historical source id. Public administration still owns its own commissions. All sources pass the existing living-actor, issuer-generation, scope and institutional checks. Court AI and household petitions share the same office quote/apply transaction. Existing declaration changes preserve their former behavior and saved ids; no schema or technology-impact change is required.


Federate contract templates are complete-record JSON declarations with bounded pay and duration. Imported story instances can name new templates. Pure term expansion, consent and payment retain the existing canonical contract ledger, including renewed ruler consent and repeat-payment rejection.


Opening service arrays and migration declarations are validated JSON roots. Service arrays reference compiled court-settlement instances and their declared hosts; restore never reruns opening offers. Migrations keep explicit parties, route anchors, template and conserved unit composition.

Source mandate roles now govern religious mediation, church communion, temporal recognition and court AI as well as ordinary office petitions. Reads filter exact saved recognitions by the current declared role; writes select an eligible source and preserve that source id in the canonical record.


Scoped following command

A mobile.command mandate authorizes only its exact following realm's declared operations and existing host. Its actual superior is a direct opening actor or another nonmobile realm's current materialized ruler. Appoint and recall use the shared governmentSelection review boundary and revalidate the living issuer and generation. This authority supplies no territorial appointment, local Consent, county revenue, ownership, private rank or property. Real outside access, service, land and campaign owners retain their existing checks. Detailed contract: docs/designs/mobile-command.md.
