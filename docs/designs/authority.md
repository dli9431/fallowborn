# Shared political facts and authority

Status: Phase 1 shared facts and Phase 2 scoped authority are implemented on the
476 branch. [Phase 1 record](../plans/v2-476-phase-1.md) and
[Phase 2 record](../plans/v2-476-phase-2.md). Existing 867/1066 behavior remains
the compatibility reference. Phase 3 owns the final save-v4 migration.

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
