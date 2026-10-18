Personal expedition admission

storyInstances accepts type expedition_participation. It is a personal track, attached through a scenario's tracks. Required fields: id, type, title, intro, host:{kind:'realm_ruler',realmId:<mobile realm>}, termDays (integer 1-1440), capacity (integer 1-32), acceptance ('volunteers' or 'closed') and roles (one or two unique records). Optional requires and registrationBefore or registrationAfter retain ordinary story meanings. Host references resolve against the detached effective bookmark. The host must have a mobile profile. Unknown keys and incompatible references reject before publication.

Each role has id and kind ('civilian' or 'combatant'). Combatants additionally require memberId naming an existing profile member. Civilian roles cannot declare memberId. Role ids cannot be leave, cancel, confirm or return_home. Civilian admission uses finite named-person places; combatant admission reserves one existing deployed position matching the protagonist's culture and faith within the declared member roster. It changes no host men, units, cohorts or recruitment ledger. All pending, active and suspended requests for one contingent share the declared capacity, with an intrinsic maximum of 32. One person cannot request or hold another concurrent admission.

FB.expeditionParticipants.review(state,storyId,action,actorId,roleId) and commit(state,quote) are the shared pure review and revalidating transaction. request selects a role as the protagonist. accept or decline requires the actual current commander; a volunteers policy supplies a standing invitation, while closed permits refusal only. On the ordinary story boundary an available nonplayer commander uses the same transaction. A player commander requires an explicit call to that transaction. leave cancels an invitation or ends admission. confirm requests a changed commander's consent without extending the original deadline. return_home reviews the ordinary priced personal return after participation ends. The shared story sheet exposes protagonist choices, costs, blockers and ordinary modal navigation.

Request requires a living free adult at the stationary civilian camp, with no incompatible custody, private war, independent journey or existing principal/command. Admission needs current commander identity and generation, migration identity, capacity and an existing compatible position for a combatant. Civilian location follows the migration; combatant location follows the bound host while its counted position remains. Field defeat does not end a surviving civilian camp's admission. Changed command suspends consent; term expiry, death, lost carrier or incompatible commitment ends it without creating a casualty or returning anyone home. Every admission is one finite episode. Wages, vows, equipment, principal votes, command, family carriage and permanent residence are separate.

The sole personal travel record carries a typed participationId referring to the story. The camp or field host supplies position while admitted, and the story retains a last reached checkpoint for interruption. Temporary travel preserves the permanent household home and blocks home work and household settlement. After leave, ordinary road pricing and actual route gates govern a separate return. Interrupted return preserves the reached checkpoint. Restore validates both owners without admitting, moving, paying, renewing or replaying history. See docs/designs/state-and-saves.md for the exact optional record.

The independent ordinary JSON examples tests/e2e/fixtures/authoring/personal-expedition-harbor.json and personal-expedition-upland.json contrast thirty-day civilian admission with a twelve-day counted combatant position. Both use the real Mods file importer. Technology decision personal_expedition_admission is none; underlying travel, unit, authority and resource gates remain.

Bounded mobile opening columns

An authored command opening may opt into mobile.columns:{schema:1,entries:[...]}. Exactly two to four entries partition the existing mobile.opening.muster. Each entry contains exactly id, commanderMemberId, muster and food. id matches [a-z][a-z0-9_]{0,47}; commanderMemberId names a distinct explicitly bound opening principal. muster has one to 64 distinct {memberId,unitId,count} entries with positive safe-integer counts. Every opening member/class allocation must be consumed exactly once across columns, with no extra fighters. Each host meets the ordinary army minimum, and each finite nonnegative food allocation stays within its thirty-day carrying capacity; all allocations together cannot exceed mobile.food. Existing unit unlock rules apply.

The first canonical host id is following_<realmId>; later ids are column_<realmId>_<columnId>. All fit 160 characters, are unique across the opening and initialize at the camp origin. Remote placement, field movement, split/merge and settlement are not declaration effects. Live preflight is restricted to turn zero and rejects existing host/migration collisions before allocating people or stock. Missing columns retains the existing single-host path.

The optional saved mobile.columns has exactly schema:1 and entries:[{id,hostId,commanderId,status}], within the existing schema-3 command row. status is active or retired. It retains original declaration order and commander binding. Active entries require exactly one matching ordinary mobile host; retired entries require none. Armies own actual men, units, demographic mobileRoster, location and mobileFood. The migration owns the camp; no totals, food or positions are duplicated in the column set. Missing, forged, duplicate, orphaned or incompatible records fail restore without initialization or repair. Exact mod fingerprints include the declaration.

FB.mobile.columnSnapshot(state,realmId) is a detached camp/host projection. columnAuthority(state,realmId,columnId,{kind:'character',id:personId}) checks the current overall mandate, living allegiant column commander and exact actor scope. This is a read-only authority query. One-host shortcuts, raw host ordering and map control remain unavailable for column sets pending column-specific transactions. Ordinary supply consumption, combat and accounting retain their existing owners. See docs/designs/mobile-columns.md and the ordinary mobile-columns-harbor.json and mobile-columns-dune.json authoring examples.

Already hosted mobile openings

An authored mobile opening may additionally declare mobile.hostedAccess with exactly id, partnerRealmId, partnerActorId, countyIds, capacity, allowRecruit and duration. It requires mobile.opening and mobile.command. id matches [a-z][a-z0-9_]{0,47}; the generated agreement id, opening_access_<realm>_<id>, must fit the existing 160-character limit. partnerRealmId names a different nonmobile opening realm. partnerActorId names an existing bookmark opening actor whose ref is exactly that realm's realm_ruler reference. It resolves the actual incumbent before pure live preflight and creates no replacement person.

countyIds is a unique list of 1-16 inhabited counties including mobile.origin. capacity is a positive whole number covering the complete profile population, at most 100000000 and within every county's actual available pasture capacity. allowRecruit is boolean. duration is the remaining term in days, 1-1440. All opening grants in one initialization batch share the same existing allocation ledger and reserve capacity together before any people or money change. The partner must actually hold each county under its lawful sovereign; current liveness, custody and hostility checks apply. Missing actors, foreign possession or exhausted capacity reject initialization atomically.

This is previously accepted opening consent, rather than an offer to be voted on again. It initializes at turn zero as one ordinary active access agreement, price zero meaning no new payment is due. No price, payer, past fee, protection quota, family carriage, custody release or callback field is accepted. Stocks, original people and public accounts still come from their existing owners. Future offers and renewals require the ordinary separate outside acceptance, exact current payer and available funds. Adopting a host court remaps canonical agreement counterparties to the existing player realm.

The optional mobile.openingAccess marker has exactly schema:1, id, startTurn:0 and the two positive original party generations. It is required only by these declarations and remains after agreement expiry. Matching saved agreements must retain the declared scope, capacity, recruitment permission, duration and zero payment with matching provenance. An unexpired active following cannot lose its initial agreement silently. Restore neither initializes missing records nor replays a payment or pasture harvest. Changed parties or generations, lost holder authority, hostility and insufficient current capacity immediately suspend this opening concession; its next daily boundary ends it permanently. An ordinary new deal can still be negotiated. Existing negotiated agreements retain their contract.

tests/e2e/fixtures/authoring/mobile-hosted-harbor.json and mobile-hosted-dune.json are independent complete Mods imports with different government continuity, host governments, camp locations, permitted recruitment, capacities and expiry. Their declared leader agendas use the existing costless priority and finish choices, without promising an access, protection or movement action. The examples also declare hidden adopted-leader scenarios for the ordinary adoption and agenda boundary; no historical person or opening is added.

Personal ruler agenda authoring

storyInstances accepts type ruler_agenda. Its only top-level fields are id, type, subjectRealmId, title, intro, optional requires and registrationBefore/registrationAfter, and stages. subjectRealmId must be an opening realm offered by the start's effective bookmark. The type is a player track: list its id in an existing-ruler scenario's tracks. It initializes only for the original ruler or current delegated incumbent of that start. No executable callbacks, arbitrary state paths or world initialization are supported.

stages is an ordered array of 1-16 objects with unique slug id, name, text, earliest year (1-9999), season (0-3) and 1-12 choices. Each choice has a globally unique slug id, label, detail and operation. Every stage needs agenda_priority as an unconditional alternative. The engine also exposes Set the program aside before the next review date; its agenda_stop_program id is reserved. Ordinary successful choices advance one stage. agenda_finish completes early, agenda_priority records a priority without a political effect, and either operation accepts no additional fields.

agenda_story_choice adds storyId and choiceId. The source must be an earlier required world story, never another agenda. Its live choice, quote and apply own all consequences; confirmation requotes both the agenda and source. agenda_story_fact adds storyId, stateField and values instead: stateField is one of result, aiResolution, governanceResolved or playerDecision, and values is a unique list of 1-16 semantic slugs. It records only an already matching source fact. The key is stateField, not field, because the shared story compiler reads any object with storyId and field as a typed story-record reference. Delegated choices must occur in the source declaration's choices catalogue or its trusted module's static choiceIds metadata. The campaign factory exposes only face_campaign and leave_campaign; an unknown source choice fails detached validation, and a supported one still needs its live review. Source factories exposing neither contract cannot receive delegated choices.

agenda_provincial_terms adds interestId, revenue and levy (both finite fractions 0-1) and negotiates those terms through the existing aristocratic owner using the current court actor. agenda_dues adds amount (positive and at most 100000) and duration (1-360 days) and calls the collective dues review and commit. Profile caps, consent, funds and active-dues exclusions remain authoritative. agenda_mobile_offer adds otherRealmId, selects the first offered mobile agreement for this outside court by sorted agreement id and uses the canonical outside-party acceptance review and commit. It never proposes terms for the coalition. Review exposes the exact source price and public payer; no ordinary private household becomes a political principal.

agenda_public_record adds recordKind. agenda_appointments observes effective public offices belonging to the subject since attachment, including retained opening officers. agenda_recognition observes actual positive current-generation support. agenda_mobile_agreement also adds otherRealmId and observes its active, unexpired agreement with the subject since attachment. agenda_collective_decision also adds recordOperation (war, treaty or extraordinary_tax), requiring an executed decision under this exact mandate and generation since attachment. Observations do not execute, renew or reward those records. Unknown fields, mixed operation fields, duplicate ids, missing required sources and unsupported operations fail pure candidate validation. Missing live transactions remain blocked, with priority/stop alternatives available.

Save schema 1 is an optional personal story record with original subject/generation/mandate, ordered semantic decisions and terminal status. Restore never adds an absent agenda or replays a transaction. JSON imports use the ordinary detached story compiler and active-mod fingerprint. See docs/designs/state-and-saves.md for the explicit optional-contract review.

Colonate authoring

colonate is a registered optional system, enabled by late_antique and independent of manorial_tenure. The tenure catalogue can declare systems:['colonate'] alongside its normal selectors, display owners, rights and duties. Core Roman records add landownerId to the existing saved tenancy; their two annual duty rows and exact rights are validated on save and restore. colonus_duty_valid and colonus_flight_valid are registered event context validators. The former uses the ordinary tenure identity, duty and date stamp plus a required possessor context participant. The latter requires the live owner, current protagonist/home/revision and saved attempt/cooldown stamps. A completed flight stamp prevents replay after restore.

military_service and ordination are engine-reviewed lawful familyFreedom routes, available through FB.colonateReleaseStatus and FB.resolveColonateRelease with an unchanged quote. They are not new declarative serfFreedom effect routes; that effect still accepts only old_custom and flight. Roman flight is a colonate-gated authored event using the existing flight effect. No new trigger or effect key is added. Each scenario's existing system/system-list requirement now also guards picker, codes and direct creation.

Bookmark visibility and local institutions

Bookmark definitions accept hidden, a boolean defaulting to false, and localInstitutions, an optional complete table keyed by stable institution id. hidden:true blocks every new-campaign entry point, including codes and Observe, while keeping matching existing saves loadable. FB.bookmarks(true) and FB.activateBookmark allow definition inspection and review-world activation. Setting hidden:false exposes the ordinary start flows. Existing legacy-mod restrictions still apply.

localInstitutions replaces the legacy FBDATA.localInstitutions catalogue for that campaign; omission keeps the fallback and an empty object opts out. Each record declares city, kind (senate, council, see, patriarchate or congregation), provinceId, site, culture and religion. A see or patriarchate must name an officeId unique among that campaign's local institutions. It may share its faith's existing character-held episcopal head office, including an inherited head, but cannot reuse a realm-held head or unrelated faith office. A congregation has a religious representative without creating an episcopal office. Province and site must resolve in that bookmark's inhabited settlement layout; an off-map church office uses provinceId:null and site:null. Retain stable institution, seat and office ids across dates when the institution survives.

historicalName names the initial representative and vacant:true starts without one. An optional representative profile accepts name, born, sex, role, station, skills and traits. Culture and faith come from the institution. Birth must be an integer no later than the start year, with episcopal representatives at least 18; sex is m or f, with episcopal representatives male. Role is priest, notable or monk, with episcopal representatives priests and congregations using priests or monks. Station is an integer from 0 to 7; skills maps registered skill ids to finite nonnegative values; traits is a duplicate-free list of registered trait ids. Missing fields keep ordinary generation defaults. A named profile and historicalName must agree; a vacant record cannot seed an incumbent. Profiles apply to fresh actors only, never existing saved representatives or successors.

FB.localInstitutionDefinitions(state) resolves by the saved campaign bookmark rather than active preview globals. Institution dealings, faith offices, progression and save validation use that same table. Runtime-mod registration and bookmark activation validate these declarations before applying the mod or activating the world. See docs/designs/council.md and docs/designs/seeds.md.

Roman office interfaces

The optional roman_offices system is off by default and enabled by the late antique era. Government forms may declare officeCatalogue as a duplicate-free list of known authority office ids with appointment metadata, and select the registered roman_offices AI strategy. This strategy retains the existing federate contract callbacks and adds offices(state, realmId). FB.governments.validate rejects unknown office ids before a government-form mod is applied. authorityOffices and legitimacySources are validated runtime JSON roots; their issuer and office schemas appear under Public authority definitions.

An authority office may have host, county or realm scope. Ban requires a host scope. Peace, Revenue and Consent may use county or realm scope; a realm-scoped civil office projects the appointing court's current territory. Honor-only offices have empty powers and realm scope. Optional appointment metadata declares nonnegative gold and prestige, a skill key from FB.SKILLS, nonnegative minimum and optional booleans annual and imperialOnly. imperialOnly requires the appointing ruler to hold a living imperial claim with a current legitimacy source. The registration fee and retained-prestige qualification apply to household petitions; courts nominate officers without either personal expense. Annual terms end at the campaign calendar's next year boundary. Other existing succession and recognition-source policies remain authoritative.

FB.officeCourts(state), officeScopes(state, realmId, officeId), officeClaimants(state) and officeRecognitionMandates(state, actorRef) return detached read models. officeAppointmentQuote(state, actorRef, terms) accepts institutionId, officeId, holder and scope. officeSeekAppointment(state, reviewedQuote) revalidates its signature before committing. officeTransitionQuote(state, actorRef, appointmentId, action) supports confirm, contest and remove; officeTransition applies it. officeClaimQuote(state, actorRef, claimant, mandate, action) accepts a claimant's institutionId and holder, a mandate's source and issuer, and recognize or contest. officeDeclareClaim revalidates before redirecting or withdrawing only that mandate's scoped support. Existing low-level authority APIs remain the story-authoring boundary and never imply a territorial transfer.

No new authority record family or save version is introduced. New starts record rival imperial claims as contested imperial_office appointments. Existing appointments and recognitions preserve their ids, scopes, statuses and generation stamps. Optional state.officeCourtPeriod records the last seasonal court pass and survives normal v4 save/restore. Absent state and optional records remain absent in older campaigns. No event trigger/effect keys or new shipped script files are added.

# Modding Fallowborn

Site institution API

FBDATA.localInstitutions definitions contain city (proper place name), kind (council, senate, see or patriarchate), provinceId, physical site, religion and culture. Episcopal definitions add officeId and optional historicalName or vacant. Off-map sees use null provinceId and site. The catalogue is gated by civic_institutions or episcopal_sees and does not add territorial realm nodes.

FB.localInstitutionList returns detached records. FB.localInstitutionQuote(state, id, actorRef, action, terms) accepts petition, bargain, ratify and refuse. Terms contain provision, protection, courts, tolerance and taxRelief booleans and an optional contractId. FB.localInstitutionApply revalidates its stamped quote. FB.localInstitutionSettle uses these same stages for AI and story clients. FB.localInstitutionConsent reads live institutional consent. FB.localInstitutionMediationQuote and FB.localInstitutionMediate review and record episcopal support in an explicit county. FB.localInstitutionRights writes the civic delegate's existing county-scoped Peace and Consent rights separately from ownership. See docs/designs/council.md for voting, fees and effects.

## County progression API and save additions

`FB.countyGrantCandidates` returns only a higher ruler's eligible direct counties;
rank-elevation options may carry `county` to select the reviewed grant.
`FB.countyChallengeQuote`, `requestCountyChallenge` and `beginCountyChallenge`
revalidate detached declaration terms. County challenges use the existing war
registry with `county_replacement` objectives; they are not settlement wars.
`FB.countyRecognitionQuote`/`petitionCountyRecognition` settle disputed ownership
without erasing rival claims. `FB.countyPetitionDays()` shares the ordinary county
petition cooldown. See state-and-saves.md for the optional serializable records.

The existing `border_county_without_dejure` plot target also selects counties with
an owned barony at rank 3; ranks 4+ retain foreign bordering targets. Existing
claims inside a liege's realm remain stored. Settlement sources additionally allow
`restoration`; explicit revoke/restore APIs preserve hereditary provenance.
No new event trigger or effect keys or generated settlement data are introduced.

## Chartered settlement founding

`FBDATA.balance.settlementFoundingSeasons` defaults to 4 (90 days per season).
Construction and investiture use the existing Gentry-to-Baron rank cost quote,
saved when funded; changing balance does not reprice active charters.
`FB.settlementCapacity(state, pid)` returns the development-unlocked slot limit;
`FB.settlementVisibleCount` returns established slots. Capacity thresholds retain
the old 3/5/7/9 schedule, but require explicit charter completion to establish a
new slot. `settlementDevelopment.change` uses `founding_capacity`, not `new_village`.
Generated site data must not be edited; reservation uses the next stable compiled
slot. The save fields are documented in designs/state-and-saves.md. Lordship
`source` also accepts `founding`. `settlement_founding` has technology mode `none`.
No new event trigger or effect keys are introduced.

Phase 4 grant interfaces:

- `settlementGrantSites(state, pid, realmId)` lists directly held non-seat sites.
- `baronyPetitionSite(state)` prefers the eligible home manor, then a non-seat site.
- `settlementGrantRecipient(state, characterId, realmId)` checks a living adult
  gentle recipient's residence/household and excludes reigning rulers.
- `settlementGrantQuote(state, pid, slot, characterId, realmId)` returns detached
  ownership, local-work, fiscal, service and capacity terms, or null.
- `confirmSettlementGrant(state, quote)` revalidates exact terms before ownership
  and rank commit. Ordinary petitions separately enforce house, cost and Standing
  requirements through the rank-elevation transaction.
- `settlementLordshipSeason(state, period)` runs bounded, idempotent delegation
  and paid baron construction after accounting. Existing building gates apply.

The `military_settlement_available` event requirement checks the exact quote in
`ctx.settlementGrant` and `ctx.protagonistId`; `military_settlement_grant` repeats
that check and atomically awards lordship, rank, prestige and Standing. New reward
events must not combine this custom effect with an unconditional `tierSet:3`.
The military reward context provides `grantSettlement`, `grantRevenue`,
`grantUpkeep`, `grantDues`, `grantNet`, `grantTaxShare`, and `grantLevyShare` for
localized event text. The no-site reward is `military_victory_purse`.


## Settlement lordships and local accounting

`js/lordships.js` loads after `world.js`. County owner/holder and realm APIs remain
county-scoped. Optional save-format-3 `settlementLordships` version 1 records
established slot floors and delegated character-held lordships; missing delegation
means direct county-holder control. The full record and succession rules are in
[state and saves](designs/state-and-saves.md#settlement-ownership-foundation).

Read-only, detached interfaces:

- `FB.settlementCountyHolder(state, pid)` returns the living supervising realm id.
- `FB.homeCountyAuthority(state)` returns `{provinceId, realmId, characterId}`;
  an unmaterialized ruler has a null character id until a mutation boundary resolves it.
- `FB.settlementEstablishedCount(state, pid)` returns the saved visibility floor.
- `FB.settlementLordship(state, pid, slot)` returns a copied delegation or null.
- `FB.settlementHolder(state, pid, slot)` returns `{kind:'realm'|'character', id}`
  or null for unavailable sites. A player barony uses the player character id;
  direct county government uses the realm id, including `'player'`.
- `FB.directSettlements(state, actor)` returns `{provinceId, settlement}` rows.
  Actors are typed holder objects; a string means a realm, and omission means the
  player. The player actor includes both personal baronies and direct county holdings.
- `FB.settlementConstructionAuthority(state, pid, slot, actor)` returns `holder`,
  `countyHolderId`, and `direct`, with `integrated:true` and `liveAccounting:'settlement'`.
- `FB.settlementCapacityProjection(state, actor)` returns `directCount`, `settlements`,
  `limit`, `over`, `technology`, `multiplier`, `enforced:true`, and `stage:'integrated'`.
- `FB.settlementTaxBase(state, pid, slot, rate?)` partitions the county primitive.
  `FB.settlementPopulationShares` returns conserved population weights.
- `FB.settlementFiscalProjection` returns ownership, obligations, and `amounts`:
  base, tax, tolls, gross, national bonus, upkeep, dues, net, levy, levyDues,
  availableLevy, specialists, specialistDues, serviceRate, countyPenalty,
  and settlementPenalty. `settlementContributionProjection.amounts` contains
  paired `tax` and `levy` contributions. `settlementActorFiscal` aggregates a holder.
- `FB.buildingBonusAt(state,pid,slot,key)` reads local indexed building effects;
  `buildingBonusIn` retains physical county scope. `buildingEffectScope(key)` is
  `local`, `county`, or `national`. Personal building counts use direct lordship.
- `FB.baronyAccount(state,cid)` returns a detached purse; `baronyConstructionFunds`
  excludes recurring reserves. `FB.buildBarony(state,cid,pid,slot,id)` checks
  ownership, requirements, physical/personal limits, and actual funds before paying.
  It does not schedule AI decisions or confer land. `settleBaronyAccounts(state,season)`
  is the once-per-period treasury mutation. `settlementDomainBase` defaults to 2.
- `FB.settlementFoundingEligibility(state, pid)` reports established and unused
  physical slots, but `ready:false` and `blocker:'founding_not_integrated'` until Phase 5.

Mutation boundaries are `FB.ensureSettlementLordships(state, {fresh:true}?)`,
`FB.rememberSettlementSites(state, pid)`, `FB.syncHomeCountyLord(state)`,
`FB.assignSettlementLordship(state, pid, slot, holderId, options?)`, and
`FB.revertSettlementLordship(state, pid, slot)`. Assignment/reversion return booleans;
assignment requires an established non-seat slot, a living recipient, and a living
county holder. The legacy-migration exception also permits the dead protagonist
whose playable succession decision is pending. These are trusted simulation primitives, not player grant actions:
they do not negotiate, charge, move a household, or award rank. `source:'legacy'`
marks the one-time migration grant. Ordinary grants default to customary service.

`FB.playerControlsSettlementCommunity` uses actual direct settlement ownership,
not residence or blanket county control. County community orders retain their
separate county-holder requirement. Community agency scans the counties of direct
holdings, so a barony outside the household residence is not omitted.

`FB.settlementLordshipsCharacterDied` and
`FB.settlementLordshipsPlayerSuccession(state, oldId, heirId)` own inheritance and
reversion. A null playable heir reverts the old player's delegations. A saved nominee
is used only when alive, free, and distinct from the deceased. Direct custom writes
must call `FB.invalidateSettlementLordships(state, pid)`; prefer the mutation APIs.
`FB.settlementLordshipRevision()` is transient, never saved, and
`FB.settlementLordshipReferencesCharacter` protects retained identity references.

No construction, tax, levy, capacity-penalty, or founding gameplay is enabled by
calling a projection. Those integrations are separate phases of the saved plan.

## Ruler justice

FBDATA.justiceSentences defines stable ids with display name/desc, kind, level (0-3), and unjust support penalty. Kind is custody, fine, penance, corporal, exile, death, pardon, ransom or forfeiture. Kind supplies mechanics; renamed or new ids have the same behavior. Fine and ransom transfer available funds; custody defaults to a 360-day term and 90-day extension window, overridable by termDays and extensionWindow. Penance defaults to costs of 40 piety and 20 prestige, overridable by pietyCost and prestigeCost. Exile may declare careerRole:cloister. A pardon with forgive:true closes all court cases; closesCase:false preserves the cause for release or ransom. The shipped money/exile/forfeit/maim/kill flags remain compatibility metadata, not dispatch. Runtime justiceSentences additions replace complete records by id.

FBDATA.legalTraditions defines complete records keyed by tradition id. Each requires a display name, a nonempty unique sentences array of known sentence ids, procedures, justification and ai. Runtime legalTraditions additions replace complete records by id. Names and sentence display fields use the legalTradition and justiceSentence structured catalogs and normal lexicon labels, including labels.legalTradition.<id>.name and labels.justiceSentence.<id>.name/desc. Custom saved judgments retain a typed sentence data reference rather than rendered prose.

procedures requires boolean arrest, hearing, ransom and pardon fields, plus compensationMaxSeverity and penanceMaxSeverity integers from 0 to 3 for player hearing alternatives. A false procedure blocks its projection and mutation. Release without forgiveness is an independent recovery sentence when included in the sentence list. Hearing gates punitive sentences; it does not confer custody or evidence.

justification.evidence is a nonempty subset of testimony, material and redhanded. Only those recorded evidence forms establish a cause. Optional justification.sentences is keyed by an offered sentence id. Each record may restrict offenseKinds (assassination, abduction, fabricated_charge, sabotage, blackmail, rebellion), successful (boolean), and level (0-3, overriding the sentence severity threshold). Restrictions determine availability, while level determines whether an otherwise available punishment is justified. For example, the Muslim tradition restricts diya and qisas to successful assassination offenses.

ai supplies minor, serious, severe, arbitrary and excessive arrays of offered sentence ids, in preference order. The engine chooses the first ready projection from that list, falling back to the tradition's other sentences. Player and AI use the same authority, custody, cause, procedure and distribution checks.

Faith properties.legalTradition names a tradition and inherits normally. Government forms can declare legalTradition as an id, the string faith, or an object with default (an id or faith), optional realms (realm id to tradition id) and cultures (culture id to tradition id). Secular resolution reads exact realm override, then exact culture override, then default; faith delegates to the effective faith. Religious resolution always uses effective faith. Older forms without a declaration delegate to faith. Older faiths without a property use faithDefaults.legalTradition. Runtime governmentForms records merge by id and retain the normal required registered strategies.

FB.justiceTradition(state, actorId, optionalCourtKind) returns id, definition and source. optionalCourtKind is secular (default) or religious. FB.validateLegalTraditions(optionalTraditions, optionalSentences, optionalForms) returns schema faults. Bookmark validation includes these faults; runtime mods validate composed definitions before mutation. Explicit unknown tradition references fail closed.

Arrest projection/attempt accept courtKind after offenseId. Sentence projection accepts it after offenseId; sentence application accepts it after responseId. Sentence options accept it after targetId. Projections expose traditionId, courtKind and the effective level. Existing form remains a compatibility alias of traditionId. Custody and pending responses preserve courtKind through saves; a missing field is secular. Current court declarations are rechecked before every action. Changing tradition does not erase an already imposed prison term.

CrazyGames filters death/corporal kinds and normalizes an attempted restricted sentence to a ready custody sentence in the resolved tradition. No custody alternative means rejection. Standard distributions keep those sentences.

Existing private abduction and its single-captive limit are unchanged.

Read-only APIs are `FB.justiceRulerEligible(state, actorId)`,
`FB.justiceCounties(state, actorId)`, `FB.justiceCustodyOf(state, targetId)`,
`FB.justiceSupportCounties(state, actorId)` (direct holdings for county penalties),
`FB.justiceOffenseFor(state, actorId, targetId, optionalOffenseId)`,
`FB.justiceArrestProjection(state, actorId, targetId, optionalOffenseId)`, and
`FB.justicePunishmentProjection(state, actorId, targetId, sentenceId, optionalOffenseId)`.
Projections include `ready`, a machine-readable `blocker`, exact odds/amounts,
`counties` (full jurisdiction), `supportCounties` (direct holdings receiving
support changes), justification/evidence, and applicable expiry/destination.
An arrest projection reports blocker `truce` and its `truceUntil` turn when the
target could resist and holds a truce with the crown that the resistance would
fight. `FB.justiceSentenceOptions` returns the regional sentence projections.

`FB.justiceAttemptArrest` and `FB.justiceApplyPunishment` accept the same actor,
target, and offense identities and revalidate at mutation. Results return `ok`,
`blocker` on rejection, and `captured`, `pending`, or `impacts` where applicable.
The optional response id on punishment is only for the matching queued player
hearing. `justice_arrest` and `justice_hearing` use `justice_response_valid` and
custom effects `justice_submit`, `justice_resist`, `justice_challenge`,
`justice_plead`, `justice_pay`, and `justice_penance`, with matching impact adapters.
`justice_can_pay` and `justice_can_penance` gate the applicable alternatives.

Prisoner hearing text may use sentenceKind, sentenceName, sentenceTermDays, sentenceRemainingDays, sentenceCustodyMode (initial or extension), sentenceAmount, sentencePietyCost and sentencePrestigeCost. FB.justiceHearingParams(state, context) derives these read-only parameters from the valid pending sentence matched by context.justiceId; invalid or arrest responses return an empty object. FB.textParams supplies them to event rendering without storing them in the event context. sentenceName is a typed justiceSentence name reference for localized data and lexicon labels. The other values come from the current definition and punishment projection, including distribution normalization, affordable payments, credited custody and extensions.

`FB.justiceRecordOffense` accepts `(state, authorityCharacterId, accusedId,
kind, evidence, successful, victimId, sourceId)`. Reusing a source id within the
same court does not create another cause. This is a trusted simulation-authoring
API, not a player-facing way to manufacture evidence.
`FB.justiceSettleRebellion(state, accusedId, realmIds)` closes the accused's open
`rebellion` cases before the listed realms' courts and their lieges, marking each
`settled:'peace'`, and returns the number closed; other offense kinds stay open.
The listed courts may include `'player'`. AI rebellion settlement calls the same
helper as player peace, using the crown and the renounced immediate lord.
Defensive independence campaigns may name the rising realm in `casus.rebel`; when
it is absent or `'player'`, `FB.playerRebellionWar(war)` treats the war as the
player's own rebellion. AI independence and annual breakaway records also store
`casus.formerLiege` and `casus.rebelCharId` (the character who started the rising).
The latter keeps peace settlement attached to that person across ruler succession.
Older AI `independence` and `border`/`Breakaway war` records infer the rebel from
the defender during registration or repair; ordinary border wars do not pardon
rebellion cases. A legacy arrest-resistance case's source and start turn recover
its court when the war lacks `formerLiege`. AI independence uses ordinary
territorial objectives and the 32-season exhaustion limit, while player
independence keeps its dedicated rules.
`FB.escheatRealm` accepts
an optional `recipientId` for an already-authorized judicial forfeiture; ordinary
calls retain their existing heirless-estate behavior. See
[the justice design](designs/justice.md) for sentencing, jurisdiction, and save rules.

## Ordinary war provisions

The existing `custom:'war_supply'` event effect now refills carried food rather than
raising campaign strength. `balance.warEventProvisions` defaults to 10 supply points;
the largest surviving player host assigned to the event's ordinary war receives only
the amount that fits beneath 100. It does not move the host or change troop counts.
`{warProvisions}` is the actual capped refill for display fields, including zero for
a full reserve or no eligible host. Event contexts retain their campaign identity;
another campaign's host cannot receive the reward. Acquisition of this event cargo
is distinct from daily market provisioning. Discipline and strain custom effects
keep their existing bounded combat-effectiveness changes.

## Active treasury and army producer accounting

Stage 4: `treasuryTransfer(state, payer, recipient, amount, compulsory)` moves finite
nonnegative coin between realm IDs or `player`. Null denotes an existing external
household source/sink or prepaid escrow. Missing active accounts reject before any
mutation. Voluntary payments respect accrued bills; compulsory payments may create
signed shortfalls. `treasuryCounterparty(state, rid)` resolves an active fiscal realm
or null; `treasuryCharacterRealm(state, cid)` resolves only a reigning ruler or player.
`treasuryOffer(state, rid, amount)` caps a voluntary quote at available funds.
These helpers never initialize accounts; callers own repeat-execution guards.

Numeric event gold may specify `goldCounterparty:'context'`: the live `ctx.realmId`
or `ctx.rid` pays positive gold or receives negative gold. Negative amounts recheck
player cash; positive committed awards retain liability. `ctx.treasuryGoldPaid`
prevents replay after serialization; only one such payment belongs to a context.
This effect requires full reconciliation and is never inferred from Standing.

Stage 3 helpers: `treasuryMilitaryPolicy(state)` builds a transient active-host
commitment projection for one decision phase; `treasuryApproveHost(state, host,
policy, defending, purpose)` reserves a proposed composition within that projection
without debiting coin. `treasuryRetryReady(state, realmId, purpose)` bounds failed
quotes; `aiTreasuryRetryDays` defaults to 7. `treasuryRetrenching(state, realmId)`
is a pure recovery-state query. `treasuryFundReplacement(state, realmId, classId,
men, policy)` pays the existing drilling premium; the cohort caller persists its
funded flag to prevent repeat payments. `armyProvisionCommitment(state, host,
seasons)` estimates consumption plus one refill at the current local food price.
These projections are for mutation-boundary decisions, not UI refreshes. Mods
changing military inputs should invalidate their owning realm/building/fort/tech
indexes; direct edits without invalidation are reconsidered at the bounded retry.

`treasuryAccounting.mode` is now `active`. Restore rebases legacy diagnostic coin
once, clears diagnostic bills/inheritance, and deletes `armyLogistics.purses`.
`FB.treasuryConstructionReserves(state)` returns a transient shared annual expense
projection (or null outside active accounting). `FB.treasurySpendOptional(state,
rid, amount, reserve)` protects that numeric reserve in addition to accrued bills.
`FB.buildCost(state, pid, id, realmId)` optionally quotes AI technology without
player household discounts; omit realmId for the unchanged player quote.

`FB.treasurySpend(state, rid, amount)` refuses negative/nonfinite amounts or amounts
above gold less accrued military bills; `treasuryCredit` accepts nonnegative finite
receipts for live accounts. Food pays immediately; military accrual excludes food.

`armyLogistics.producers` stores a seasonal snapshot of household food producers
with uid, county, physical output, baseline food income, county output denominator
and initial withdrawal offsets. `producerPending` is signed unsettled coin;
`producerLast` retains one gain/loss summary. `armyProducerSnapshot` runs only at
initialization and market settlement, and `armyProducerSettle` clears pending coin
after payment. Physical market output uses `enterprisePhysicalYield`; army receipts
must never be included in that reader. Positive adjustments cap at 25% of baseline
food income and supplier receipts; requisition losses cap at 50%. Allocated bought
and seized units jointly cannot exceed frozen output.
Enterprise-removal integrations call `armyProducerCloseMissing(state, presentUids)`
at the mutation boundary to settle and remove frozen claims once; display readers
must never call this payment hook. Existing seasonal settlement also preserves
frozen claims when records disappear without a removal integration.

## Targeted plots, war causes, and alliances

A plot definition may add an optional `target` selector. The engine asks the player to
choose before the plot begins and saves the JSON-safe selection in
`player.plot.context`; discovery and resolution events receive the same context. The
built-in selector `"border_county_without_dejure"` produces:

```json
{ "pid": "<province id>" }
```

The core `fabricate_claim` plot uses that selector, requires tier 4, and needs 14 power.
Its `fabricate_claim` named chance is
`clamp(0.30 + intrigue * 0.03 + learning * 0.01 + prestige / 1000, 0.10, 0.90)`.
For this plot, `plot_discovery` uses the same chance when the player rushes the scheme.
The custom effects `fabricate_claim_success`, `fabricate_claim_failure`,
`plot_discovery_success`, and `plot_discovery_failure` create the saved claim or charge
5 prestige, then end the plot. Only one fabricated claim may exist.

Core also supplies compound semantic selectors. They return only the fields shown; the
engine re-runs the selector during every Scheming tick and before a custom resolution, so
a dead person or realm, replaced contract, changed institution, or ended relationship
cannot silently retarget:

| selector | context |
|---|---|
| `current_liege_obligation` | `{realmId, institution:"estates", contractId:"obl"}` |
| `active_guild_monopoly` | `{contractId}`; the id identifies one exact incoming or outgoing charter |
| `council_schemer` | `{realmId, institution:"council", rulerGeneration}`; succession cannot transfer the target |
| `diplomatic_correspondence` | `{realmId}` for a neighboring sovereign, active direction, pact, or alliance |
| `political_rival` | `{characterId}` plus only the relevant `realmId`, `institution`, or instance-stamped `contractId` connection |

`FB.plotTargetOptions` is the authoritative selector interface. `FB.plotTargets` remains
the compatibility reader that returns the primary id from each option. Beginning a plot
copies the matched context rather than retaining arbitrary caller fields. Discovery adds
only `plotId`; buying containment adds `exposure` to the active plot record, reduces its
power, and raises later discovery risk without adding a second intrigue resource.
Estates and Council selector discovery is read-only. Projected customary Estates terms
do not create `liege.obl`, and querying Council targets does not form or repair a Council,
consume RNG, or write Chronicle news.

`FB.warCauses(state)` is the authoritative declaration API. It returns semantic records
with this common shape:

```json
{
  "type": "dejure | fabricated | restoration | caliphate",
  "target": "<province id>",
  "enemy": "<sovereign realm id>",
  "titleKind": "duchy | kingdom | empire | null",
  "titleId": "<de jure title id or null>",
  "titleName": "<display title or null>",
  "blocked": "war | pact | alliance | null"
}
```

Only fields relevant to the cause are present. `restoration` targets the claimant
crown's current capital; `caliphate` targets the sitting Sunni office holder's
sovereign capital and can transfer only that office; `fabricated` refers to
`player.fabricatedClaim.pid`; `dejure` uses the most specific title the player actually
holds. Passing `true` as the second argument includes war/pact/alliance-blocked records
for explanatory UI. `FB.warTargets`
still returns province ids, and `FB.startPlayerWar` accepts either a current semantic
record or a compatible string target. New wars persist the normalized subset as
`player.war.casus`; missing `casus` on an old in-progress war invokes legacy capture.

Defensive alliances live in `state.alliances` as canonical pairs:

```json
{
  "a": "<realm id>", "b": "<realm id>",
  "source": "dynastic | envoy | royal_marriage",
  "aGen": 2, "bGen": 4
}
```

Only one pair may involve a realm. The generation stamps expire it when either ruler
changes. Alliances block declarations and add abstract levy to a defender; they never
create extra war records or allied field hosts.

Everything about the world is data. There are two ways to mod:

1. **Edit the files in `data/`** — plain JavaScript objects, loaded before the engine.
2. **Load a JSON mod at runtime** — menu → Mods → choose a `.json` file (or paste JSON).
   Mods are stored in your browser and re-applied on every load, *before* the world is
   generated. Same-`id` entries **replace** the originals; new ids are **added**.

## Make a JSON mod with ChatGPT (no coding required)

1. Start a new ChatGPT conversation and attach this `docs/MODDING.md` file. If your
   ChatGPT interface does not offer file attachments, paste the document into the
   conversation instead.
2. Describe the mod in ordinary language. Say what should be added or changed, who or
   what it should affect, and any numbers, names, or restrictions you care about.
3. Ask ChatGPT to create an **importable Fallowborn JSON mod**, not a bundled JavaScript
   mod. Ask it to follow `docs/MODDING.md`, include a unique `name`, preserve every
   documented `{token}`, and return valid JSON with no comments or trailing commas.
4. If the mod changes existing content, also provide the relevant file from `data/`
   when ChatGPT asks for it. Existing ids and complete replacement entries must come
   from the game files; ChatGPT should not guess them.
5. Ask ChatGPT to check the finished result against the guide. Copy the JSON into a
   plain-text file, save it with a `.json` extension such as `my_mod.json`, and make
   sure the editor has not added `.txt` to the filename.

A useful request to copy and fill in:

> Read the attached `docs/MODDING.md` as the source of truth. Create an importable
> Fallowborn JSON mod named "[mod name]" that [describe the change]. Do not write a
> bundled JavaScript mod or change the base game files. Do not invent existing ids;
> tell me which `data/` file you need if an id or complete replacement definition is
> missing. Preserve documented text tokens and return the finished mod as valid JSON
> in one code block, with no comments or trailing commas.

To import the file, open Fallowborn and choose **Mods** on the title screen, or open
the **☰ menu → Mods** during a game. Choose the `.json` file, then select
**Apply & reload**. You may paste the JSON into the box in the same dialog instead.
Begin a new life after changing mods: saves remember their exact mod set and will only
load while that same set is active. Re-importing a mod with the same `name` replaces
its previous copy.

Mods placed in `mods/*.js` (with a matching `<script>` tag in `index.html`) are
**bundled mods**: each registers `{id, name, desc, data}` into `window.FBMODS` via a
script tag, and the Mods dialog offers an Enable/Disable toggle per mod. Enabled ids
persist in localStorage and apply exactly like pasted mods, ahead of them.

A JSON mod is one object with any of these keys:

```json
{
  "name": "My Mod (cosmetic, optional)",
  "bookmarks": { "my_start": { ...complete bookmark... } },
  "defaultBookmark": "my_start",
  "startScenarios": [ { "id": "my_beginning", ... } ],
  "familyPresets": [ { "id": "my_household", ... } ],
  "focuses": [ { "id": "rest", "label": "Rest by the fire", ... } ],
  "deeds": [ { "id": "give_alms", "cooldownDays": 14, ... } ],
  "countyCommunityPolicies": { "id": { "label": "...", "desc": "..." } },
  "provinces": [ ... ],
  "realms":    [ ... ],
  "empires":   { "id": { ... } },
  "kingdoms":  { "id": { ... } },
  "duchies":   { "id": { ... } },
  "events":    [ ... ],
  "straits":   [ ["provA","provB"] ],
  "crossingClasses": { "provA|provB": "coastal" },
  "scripted":  [ ... ],
  "cultureTraditions": { "id": { "name": "...", "icon": "...", "order": 1 } },
  "cultures":  { "id": { ... } },
  "cultureDoctrineDefaults": { "cultureId": { "raiding": true } },
  "doctrineCatalogs": { "faith": { "doctrineId": { ... } }, "culture": {} },
  "religions": { "id": { ... } },
  "religiousPaths": { "id": { "kind": "lay", "ranks": [ ... ] } },
  "councilSeats": { "id": { "name": "...", "bonusKey": "tax", ... } },
  "councilRules": { "schemerTraits": ["ambitious", "deceitful"] },
  "traits":    { "id": { ... } },
  "ailments":  { "id": { ... } },
  "buildings": { "id": { ... } },
  "forts":     { "levels": { "1": { ... } }, "baseSiegeSteps": 3 },
  "techDomains": { "id": { "name": "...", "icon": "...", "order": 7 } },
  "techTraditions": { "id": { "name": "...", "cultures": [], "religions": [] } },
  "tech":      { "id": { ... } },
  "techCaps":  { "seaMovement": 0.5, "units": { "arch": 250 } },
  "capabilities": { "id": { "stacks": false } },
  "techImpactReviews": { "features": { "feature_id": { ... } } },
  "unitClasses": { "id": { ... } },
  "holdings":  { "id": { ... } },
  "careers":   { "id": { ... } },
  "positions": { "id": { ... } },
  "localCouncilMotions": { "id": { ... } },
  "feudalServiceCharters": { "id": { ... } },
  "schooling": { "id": { ... } },
  "enterprises": { "id": { ... } },
  "householdStandards": { "id": { ... } },
  "marketGoods": { "id": { ... } },
  "marketEndowmentTypes": { "id": { ... } },
  "marketEndowments": { "duchies": { ... }, "counties": { ... } },
  "travelPurposes": { "id": { ... } },
  "travelSites": [ ... ],
  "finance":    {
    "pledge": { ... }, "merchant": { ... }, "revenue": { ... },
    "tradePartnership": { ... }, "tradeVenture": { ... }
  },
  "plots":     { "id": { ... } },
  "intrigue":  { "maxAiSchemes": 4, "methodProfiles": { ... } },
  "items":     { "id": { ... } },
  "itemPools": { "authoredWorks": ["item_id"] },
  "rulerTraits": ["ambitious", "patient"],
  "raidingTraditions": {
    "cultures": ["norse"], "faiths": ["norse_pagan"],
    "faithGroups": ["pagan"],
    "victims": [{ "faiths": ["christian"], "profile": "northmen" }],
    "profiles": { "northmen": { "cultures": ["norse"] }, "rival_raiders": {} },
    "fallbackProfile": "rival_raiders"
  },
  "politicalBlocs": {
    "crown": { "name": "Crown", "motions": { "redress": -20, "scutage": -10 }, ... }
  },
  "policies": { "market_charter": { ...complete policy... } },
  "elections": { "guild_officer": { ...complete election... } },
  "privileges": { "market_charter": { ...complete privilege... } },
  "collectiveDemands": { "commons_custom": { ...complete demand... } },
  "modifiers": { "id": { "name": "...", "scope": "county", "fx": { ... } } },
  "settlementNames": { "cultureId": { "pre": [...], "suf": [...] } },
  "settlementSites": { "site_slug": { "x": 12.5, "y": 41.9 } },
  "titles":    { "christian": ["Serf", "..."], "christian_f": ["Serf", "..."] },
  "papacy":    { ...complete Catholic Papacy definition... },
  "currency":  { "id": "sterling", "label": "Sterling", "icon": "£", ... },
  "architectureStyles": { "regional": { "shapes": { "worship": "dome" } } },
  "balance":   {
    "freedomCost": 30,
    "freedomSpouseFactor": 0.5,
    "freedomDescendantFactor": 0.25,
    "freedomRelativeFactor": 0.5,
    "coinageSymbol": "£"
  },
  "geographies": { "my_region": { ...complete geography base... } },
  "seasonKinds": { "wet": { "name": "Wet season", "hardship": true } },
  "climateZones": { "monsoon": { "name": "Monsoon", "seasons": ["spring", "wet", "wet", "winter"] } },
  "land": [ ... ], "seas": [ ... ], "rivers": [ ... ], "bounds": { ... }
}
```

`name` is cosmetic: it labels the mod on the title screen and in the Mods dialog, and
re-applying a mod with the same name **replaces** the stored copy instead of stacking a
second one.

The listed keys are the complete public top-level runtime-mod API. An unrecognized key,
including a generated-only table or internal compatibility alias, rejects that mod
before any of its data mutates `FBDATA`. The validated configuration records below
also reject unknown fields and cross-references at application time.

`balance.freedomCost` is the household head's direct-purchase share. Each living
spouse adds `freedomSpouseFactor` times that share and every living descendant adds
`freedomDescendantFactor` times it; every share rounds up separately. Negotiated
freedom terms snapshot the resulting family total before applying their Standing
factor. Married descendants remain included. Parents and collateral siblings are
excluded unless selected by exact character id; each selected relative adds
`freedomRelativeFactor` times the head share. The same factor prices a later individual
manumission for a parent, sibling, or spouse; descendants use their descendant factor.

`bookmarks` is an atomic replacement table. Each keyed value replaces that complete
start world; bookmark definitions do not merge by province or realm. The older
top-level world keys remain the merge API for the built-in 867 definition.
`defaultBookmark` may name any complete bookmark present after all mods merge. The last
enabled mod that supplies it wins; an unknown id stops boot at the bookmark validation
screen instead of silently falling back to another start.

> Saves store only province/realm **ids**, so changing map data can orphan old saves. To keep
> a life from waking up on the wrong map, every save is stamped with a fingerprint of the
> active mod set — loading it under a different mod set is refused with a message saying
> which world it needs (the load dialog marks such slots too).

## Starting scenarios and family presets

`FBDATA.startScenarios` and `FBDATA.familyPresets` live in `data/starts.js` and merge
by stable `id`. A replacement is complete rather than a partial patch. New definitions
are consumed only when creating a campaign; the resulting character, family, equipment,
and property are ordinary save-format-3 state.

A scenario has this shape:

```json
{
  "startScenarios": [{
    "id": "village_scribe",
    "name": "Village Scribe",
    "desc": "Begin with letters, a small household, and little status.",
    "tier": 1,
    "profession": "scholar",
    "gold": 12,
    "prestige": 4,
    "piety": 2,
    "intro": "You are {name}, keeper of a few precious pages in {province}.",
    "startEffects": {
      "landPlots": 1,
      "holdings": ["letters"],
      "careerRank": "apprentice",
      "careerExperience": 2,
      "flags": { "village_scribe": 1 },
      "warService": 0,
      "items": [
        { "item": "book_of_remedies", "quality": "plain" },
        { "pool": "authoredWorks", "equip": "rightHand" }
      ],
      "skills": { "lea": 3, "ste": 1 },
      "focus": "study"
    }
  }]
}
```

- `id` is a lowercase `a-z`, `0-9`, `_` start-code id. `name`, `desc`, and `intro`
  are localized display sources. Optional `intro_f`, `intro_muslim`, and `intro_other`
  retain the core faith/sex introduction routing.
- `tier` is 0–3. `profession` must name an effective `careers` entry; `gold`,
  `prestige`, and `piety` are non-negative. Optional `sex` is `m` or `f`.
- `landPlots` creates that many plots at the selected birthplace. `holdings` grants
  existing household-holding ids. `careerRank` must exist on the selected profession,
  and `careerExperience` is a non-negative integer.
- `flags` accepts scalar string, number, or boolean values under ordinary identifier
  keys. `warService` sets the initial personal-service counter.
- Each `items` entry names exactly one `item` or `itemPools` pool. Optional `quality`
  is `plain`, `well`, or `masterwork`; optional `equip` is a fixed loadout slot and
  every possible pooled item must fit it. Exact entries add no selection draw. A pool
  deliberately makes one seeded pick in authored order.
- `skills` adjusts only `dip`, `mar`, `ste`, `int`, or `lea`; `focus` must name an
  existing built-in focus. This bounded vocabulary cannot invoke event effects or
  inject arbitrary state.

The seven baseline scenario ids cannot be removed or renamed, and replacements must
retain their original tiers because old-life progression repair derives the starting
station from the saved start code. Other fields may be replaced. Same-mod career,
holding, item, and item-pool additions resolve before mutation.

Story start validation

Story starts require an actual storyline track. A scenario with fixedProvinceId and no rulerRealmId must declare a non-empty tracks list with at least one registered storyline retained at that county by FB.startStoryTracks. Omitting trackLocations for a track leaves it eligible at the fixed birthplace; listing locations for it must include that birthplace if it is the only storyline. Unknown ids, world stories and companion tracks such as opening_profile cannot substitute for a storyline. Scenario and offered-bookmark validation reject an unsupported fixed household before import or publication, using the detached candidate registry for imported instances. Historical ruler starts and map-chosen open roles remain allowed without a storyline. Story grouping considers only location entries belonging to the scenario's storyline tracks. FB.startTracks still includes all eligible tracks for attachment. Existing saved campaigns are not initialized again by these new-campaign rules.

Existing-ruler scenario fields

hidden is an optional boolean; true excludes a scenario from the picker, start codes and direct creation. rulerRealmId identifies an existing named realm in every offered bookmark. It requires bookmarkIds, fixedProvinceId, governmentForm, characterName, sex, startCulture, startReligion, onboarding: ruler, and familyPresets containing only standard. The identity and government must match the authored bookmark court. A ruler scenario's tier may span the registered station bands; ordinary scenarios remain 0-3. characterName must fit the existing 20-character start-code limit.

The standard family label describes the existing seeded court household. Adoption reuses its ruler and relatives, treasury, government, direct holdings, authority and hosts; it creates no second named ruler. It removes the source realm key in favor of player and saves the original in state.start.rulerRealmId together with scenarioId and onboarding. These fields are validated on load; already-created review saves remain valid when their definitions are hidden. Optional tracks still name registered executable player tracks. Runtime JSON cannot supply their implementations.

A family preset is presentation plus one supported household shape:

```json
{
  "familyPresets": [{
    "id": "young_householder",
    "name": "Young Householder",
    "diff": "age 24 · a family already begun",
    "desc": "Married, with one infant child.",
    "age": 24,
    "spouseAge": [-2, 2],
    "children": [1, 1],
    "eldestMin": 1
  }]
}
```

`age` is 16–80. Omitting all three family-shape fields creates an unmarried start and
adds no family RNG draws. Otherwise `spouseAge` is the inclusive age offset from the
protagonist, `children` is an inclusive count range, and `eldestMin` is the first
child's minimum age; validation keeps every possible spouse adult and the child ages
possible. Presets never contain prebuilt character objects. The baseline `standard`,
`established`, and `elder` ids remain present. `standard` is special: its `age:0` means
`balance.startAge`, it must remain unmarried, and it preserves the historical no-extra-
draw six-part start code.

## Focus and deed overrides

Runtime mods may customize the 28 built-in daily focuses and 79 built-in deeds through
partial records under `focuses` and `deeds`. Baseline records cannot be removed or
renamed, and their executable behavior cannot be replaced. New focuses and deeds use the
separate declarative contracts below.

```json
{
  "name": "House Rules",
  "focuses": [
    {
      "id": "rest",
      "label": "🛌 Rest by the fire",
      "desc": "Keep close to the hearth and recover.",
      "order": 3,
      "eligibility": {
        "reason": "Only members of the household guard may choose this focus.",
        "professions": ["soldier"],
        "flagsAll": ["household_guard"]
      }
    },
    { "id": "pray", "order": 2 }
  ],
  "deeds": [
    {
      "id": "give_alms",
      "label": "🕯 Endow the poor",
      "desc": "Give bread and coin at the gate.",
      "group": "work",
      "layoutGroup": "personal",
      "cooldownDays": 14,
      "requiresTech": [],
      "eligibility": {
        "reason": "The almoner serves independent rulers.",
        "independent": true
      }
    }
  ]
}
```

A focus override accepts id plus label, desc, order, eligibility and optional system requirements. A deed override also accepts group, layoutGroup, section, actionTypeSection, availableWhileTraveling, cooldownDays and requiresTech. See Deeds section registry below for placement and availability.

- `label` and `desc` are localized display sources. They replace even a built-in
  state-dependent label or description. Their stable owners remain
  `focus.<id>.label`, `focus.<id>.desc`, `action.<id>.label`, and
  `action.<id>.desc`; a translation catalogue whose source hash no longer matches
  falls back to the mod's English.
order is a unique nonnegative integer within each action catalogue. Built-in actions remain bounded by the effective catalogue length minus one, so moving a built-in action into another occupied position requires moving that action too. Imported declarative actions may use spaced integer values through 100000; every effective order must remain unique.

A deed group is a legacy alias for a registered primary Deeds section; the shipped theme groups remain work, life, faith, realm and war. See Deeds section registry below.

A deed layoutGroup names a registered alternate Deeds section; the shipped alternate groups remain deeds, personal and ruler. Omission derives the action-type layout from the protected flow unless the primary section supports both layouts.

- `cooldownDays` is a fixed integer from 0 through 36000. A deed whose core handler
  calculates a dynamic cooldown cannot replace it with a fixed value.
- `requiresTech` is one technology id or an array of up to 64 unique technology ids;
  every id must exist after applying the same mod's `tech` additions. An empty array
  removes a built-in fixed technology requirement.

`eligibility` adds static restrictions. It must contain a non-empty localized `reason`
and at least one of these fields:

| Field | Accepted value |
|---|---|
| `ageMin`, `ageMax` | integer 0–120; the minimum cannot exceed the maximum |
| `tierMin`, `tierMax` | integer 0–7; the minimum cannot exceed the maximum |
| `sex` | `m` or `f` |
| `professions` | non-empty array of effective career ids |
| careerRoles | non-empty array of career roles; the player's career must have one of them |
| `traitsAll`, `traitsAny`, `traitsNone` | non-empty arrays of effective trait ids |
| `faiths` | non-empty array of effective religion ids |
| `cultures` | non-empty array of effective culture ids |
| `flagsAll`, `flagsAny`, `flagsNone` | non-empty arrays of lowercase player-flag ids |
| `atWar`, `independent`, `traveling` | boolean |

All supplied fields must pass together. `traitsAll` and `flagsAll` require every
listed id, `traitsAny` and `flagsAny` require at least one, and `traitsNone` and
`flagsNone` require none. Career, trait, faith, culture, and technology references may
name definitions supplied by the same mod. Flag ids are deliberately namespaced only
by convention; use a distinctive lowercase prefix and arrange for another supported
piece of content to set them.

Static focus eligibility hides the focus when it fails. Static deed eligibility leaves
an otherwise visible deed disabled and displays `reason`. The built-in handler's own
visibility and eligibility checks always run as protected invariant guards. Data rules
can narrow availability, but cannot expose an action without the rival, realm, journey,
office, resources, or other context its implementation expects.

For baseline actions, the private `handler`, deed `flow`, `noConsume`, picker and
confirmation behavior, cooldown timing callbacks, tutorial behavior, and every executable
callback are not public mod fields. Supplying any of them rejects the entire mod before
either action catalogue changes. Successful overrides rebuild both compatibility
catalogues and their id indexes together. Saves remain format 3: existing focus ids and
cooldown keys keep their meanings, and the active-mod fingerprint continues to prevent
loading a life under the wrong definitions.

Deeds may set `layoutGroup` to `deeds`, `personal`, or `ruler` for the optional
action-type Deeds layout. Without it, immediate and no-day deeds appear under direct deeds,
while picker-backed deeds appear under personal decisions. This is presentation metadata
only and does not change visibility, eligibility, cooldowns, or execution.

### New declarative deeds

A mod may append manual, immediate deeds by supplying a complete record whose handler is
exactly `declarative_deed`. This is the only public handler and cannot be used to replace a
built-in deed.

```json
{
  "events": [{
    "id": "charter_audience",
    "title": "The charter audience",
    "text": "The petitioners assemble.",
    "trigger": { "never": true },
    "options": [{ "label": "Hear them", "effects": {} }]
  }],
  "deeds": [
    {
      "id": "endow_wayfarers",
      "handler": "declarative_deed",
      "label": "Endow the wayfarers",
      "desc": "Set coin aside for travelers and pilgrims.",
      "order": 80,
      "group": "faith",
      "layoutGroup": "personal",
      "cooldownDays": 90,
      "spendsDay": false,
      "requiresTech": "road_surveys",
      "visibility": { "tierMin": 1 },
      "eligibility": {
        "reason": "The household must first promise its support.",
        "flagsAll": ["my_mod_wayfarer_support"]
      },
      "costs": { "gold": 12, "prestige": 2 },
      "effects": { "piety": 5 }
    },
    {
      "id": "seek_charter_audience",
      "handler": "declarative_deed",
      "label": "Seek a charter audience",
      "desc": "Pay the clerks to arrange a hearing.",
      "order": 81,
      "group": "realm",
      "cooldownDays": 30,
      "spendsDay": true,
      "costs": { "gold": 5 },
      "queueEvent": "charter_audience"
    }
  ]
}
```

Every new record requires `id`, `handler`, `label`, `desc`, `order`, `group`,
`cooldownDays`, and boolean `spendsDay`. `requiresTech`, `visibility`, `eligibility`,
`layoutGroup`, and `costs` are optional. It must then declare exactly one of:

- `effects`: one or more non-zero `gold`, `prestige`, or `piety` changes; each is a
  finite number from -1,000,000 through 1,000,000.
- `queueEvent`: one effective event id. The event may be added by the same mod. The deed
  queues it with the ordinary protagonist and location context; the event owns every
  later choice and consequence.

`costs` uses the same three resource keys, accepts non-negative values through 1,000,000,
and must contain at least one non-zero cost. Costs are separate from effects: the Deeds
panel shows both sections and the net execution pays costs before applying effects.
Resource values clamp at zero exactly as previewed.

`visibility` accepts the same restriction fields as `eligibility`, but has no `reason`:
failure removes the deed from the list. `eligibility` requires its localized `reason` and
leaves the visible deed disabled when it fails. Technology, cooldown, and affordable-cost
checks are composed into that same status. These checks and the preview are pure and make
no RNG draws.

An imported declarative deed uses a unique integer order from 0 to 100000. Spaced values allow independent mods to add deeds without depending on the effective catalogue length. A later replacement must restate the complete record, avoiding inherited costs or effects from another mod.

The engine derives `immediate` or `no_day` flow from `spendsDay`. Mods cannot supply
`flow`, `manualOnly`, modal/picker flags, cooldown callbacks, JavaScript callbacks, custom
handlers, or any broader event trigger/effect vocabulary on the deed. Execution rechecks
the projected status, pays and applies the one transaction, queues the optional event,
then records cooldown and tutorial completion before the optional day pass. Once it
returns, no deed is in flight. Save format remains 3; if the definition later disappears,
its saved cooldown key stays inert and becomes meaningful again only with the matching
active mod.

### New declarative focuses

A mod may append a manual daily focus by supplying a complete record whose handler is
exactly `declarative_focus`. This is the only public focus handler and cannot replace a
built-in focus.

```json
{
  "focuses": [
    {
      "id": "keep_charter_books",
      "handler": "declarative_focus",
      "label": "Keep the charter books",
      "desc": "Work through the estate's accounts and correspondence.",
      "order": 28,
      "contexts": ["home"],
      "vocational": "administration",
      "requiresTech": "authenticated_seals",
      "visibility": { "tierMin": 2 },
      "eligibility": {
        "reason": "The household must first entrust you with its records.",
        "flagsAll": ["my_mod_charter_keeper"]
      },
      "seasonal": { "gold": 9, "prestige": 3 },
      "dailyEffects": { "health": -0.002 },
      "skillChances": { "dip": 0.25, "lea": 0.5 }
    }
  ]
}
```

Every new record requires `id`, `handler`, `label`, `desc`, `order`, and `contexts`.
`contexts` is a non-empty array containing unique `home` and/or `afield` values. Travel
never supports a daily focus, and a focus is unavailable while afield unless it explicitly
includes `afield`. `vocational`, `requiresTech`, `visibility`, and `eligibility` are
optional and use the same effective career, technology, and static-condition references
as declarative deeds. `vocational` accepts one effective career id or a non-empty array of
unique career ids; its multiplier applies when the player's current career does that work (see Careers and apprenticeships: a named career accepts any career with its role, except learned careers).
A focus must then declare at least one of:

- `seasonal`: one or more non-zero `gold`, `prestige`, or `piety` yields. Each is a
  finite number from 0 through 1,000,000 and is applied in equal daily portions over the
  90-day season.
- `dailyEffects`: currently one non-zero `health` change from -0.1 through 0.1. Health
  clamps to the ordinary 0-10 range each day.
- `skillChances`: one or more non-zero seasonal chances from 0 through 1 for `dip`,
  `mar`, `ste`, `int`, or `lea`. The shared `focusSkillGainRate` balance multiplier is
  applied before converting each authored value to a daily chance.

The Deeds panel derives its seasonal resource, daily health, and 90-day training previews
from the same values consumed by the tick. Vocational matching applies the ordinary
household-work multiplier to positive resource yields, but not to health or training.
Skill rolls always use the saved RNG stream in canonical `dip`, `mar`, `ste`, `int`, `lea`
order, independent of object field order; each successful roll then uses the ordinary
diminishing-return skill gain.

`visibility` has no `reason` and hides a focus when it fails. `eligibility` requires its
localized `reason` and leaves the focus visible but disabled, as does a missing technology.
These checks and every preview are pure and make no RNG draws. New definitions are
`manualOnly`: the deterministic default-focus selection ignores them, and no automation
chooses them.

An imported declarative focus uses a unique integer order from 0 to 100000. A later replacement must restate the complete record. Mods cannot supply callbacks, shortcut families, custom handlers or specialized UI and automation capabilities. If the active definition disappears, focus validation chooses the ordinary built-in default without clearing unrelated cooldown or focus-back data. The save remains v:4 with platformSchema 2; the exact active-mod fingerprint protects campaigns using authored focuses.

### Reviewed action capabilities

Phase 4E adds a private engine registry for individually reviewed extensions. A mod names
one public `capability` id; it never names a JavaScript function, built-in handler, modal,
or automation callback. The current registry contains exactly `resource_choice` for deeds
and `fallback_focus` for focuses. Every other capability id or cross-kind use rejects the
whole mod before either action catalogue changes.

#### Resource-choice deeds

`resource_choice` turns a complete `declarative_deed` into a bounded picker:

```json
{
  "deeds": [{
    "id": "choose_charter_grant",
    "handler": "declarative_deed",
    "capability": "resource_choice",
    "label": "Choose a charter grant",
    "desc": "Select one grant to confirm.",
    "order": 79,
    "group": "realm",
    "cooldownDays": 90,
    "spendsDay": true,
    "choices": [
      {
        "id": "endow",
        "label": "Endow the chapel",
        "desc": "Exchange coin for a pious foundation.",
        "costs": { "gold": 12 },
        "effects": { "piety": 6 }
      },
      {
        "id": "audience",
        "label": "Request an audience",
        "requiresTech": "authenticated_seals",
        "costs": { "prestige": 2 },
        "queueEvent": "charter_audience"
      }
    ]
  }]
}
```

The deed retains the ordinary top-level `requiresTech`, `visibility`, and `eligibility`
gates. It must not declare top-level `costs`, `effects`, or `queueEvent`; the picker owns
one to 12 ordered choices instead. Every choice requires a unique lowercase `id`, a
localized `label`, and exactly one of the existing bounded `effects` or `queueEvent`
transactions. `desc`, `requiresTech`, `visibility`, `eligibility`, and `costs` are optional
and use the same validation and exact previews as an immediate declarative deed. Choice
labels and descriptions use stable
`action.<action-id>.choice.<choice-id>.*` localization owners.

Opening the picker spends no resource, creates no cooldown, completes no tutorial step,
passes no day, and consumes no RNG. Cancel and mobile Back simply close it. Confirmation
rechecks the top-level deed and selected choice, pays and applies exactly one transaction,
then follows the existing cooldown, tutorial, and `spendsDay` order. A stale, hidden,
disabled, unaffordable, or forged choice id commits nothing. The engine derives the
`choices` UI flow; mods cannot supply `flow`, picker functions, callbacks, or deferred
state. No picker record is serialized, so save format remains 3 and loading while the
picker was open returns to ordinary play.

#### Deterministic focus fallback

`fallback_focus` opts a complete `declarative_focus` into deterministic default selection:

```json
{
  "focuses": [{
    "id": "keep_charter_books",
    "handler": "declarative_focus",
    "capability": "fallback_focus",
    "fallbackScore": 100,
    "label": "Keep the charter books",
    "desc": "Take up the records when ordinary work is unavailable.",
    "order": 28,
    "contexts": ["home"],
    "seasonal": { "gold": 3 }
  }]
}
```

`fallbackScore` is a fixed integer from 1 through 1,000,000. The ordinary built-in focus
for the player's role is always tried first. Only when that preferred focus is unavailable
does the engine consider eligible `fallback_focus` definitions, choosing the highest fixed
score, then lowest action order, then lexical id. If none qualify, the ordinary built-in
fallback remains. Visibility, context, technology, and eligibility are the side-effect-free
eligibility projection; the score is authored data, so selection makes no RNG draws and
cannot call mod code. Declarative focuses without this capability remain `manualOnly` and
ignored by defaults. Mods still cannot automate deeds, replace general focus selection,
provide score callbacks, or request any unregistered picker, delayed action, or UI route.

## Religious progression paths

`FBDATA.religiousPaths` lives in `data/economy.js` and merges complete path
definitions by stable table id. Faith definitions route characters into those paths
through inherited `properties.religiousPaths`; the engine still owns advancement,
payment, appointments, promotion side effects, state repair, and seasonal application.

```json
{
  "religiousPaths": {
    "village_devotion": {
      "kind": "lay",
      "faiths": ["catholic"],
      "systems": ["papacy"],
      "ranks": [
        { "id": "hearer", "name": "Hearer", "pietyYield": 0 },
        {
          "id": "benefactor",
          "name": "Benefactor",
          "name_f": "Benefactress",
          "age": 16,
          "piety": 10,
          "prestige": 5,
          "gold": 8,
          "prestigeGain": 2,
          "pietyYield": 0.25,
          "station": 1,
          "tier": 2,
          "flag": "village_benefactor",
          "maleOnly": false
        }
      ]
    },
    "village_clergy": {
      "kind": "vocation",
      "faiths": ["catholic"],
      "professions": ["priest"],
      "ranks": [
        { "id": "reader", "name": "Reader", "pietyYield": 0.25 },
        {
          "id": "teacher", "name": "Teacher", "age": 18,
          "years": 3, "learning": 6, "piety": 25,
          "prestigeGain": 4, "pietyYield": 0.5
        }
      ]
    }
  },
  "religions": {
    "village_faith": {
      "name": "Village Faith",
      "properties": {
        "religiousPaths": {
          "lay": "village_devotion",
          "professions": { "priest": "village_clergy" }
        }
      }
    }
  }
}
```

- `kind` is `lay` or `vocation`. `faiths` optionally requires any listed faith
  ancestor, `systems` requires every listed faith capability, and `professions`
  optionally restricts the path to exact career ids. All same-mod references resolve
  before mutation.
- A faith route contains one `lay` path and a `professions` object from exact career id
  to vocation path. An unlisted profession uses the lay path. Inherited faith
  properties inherit this routing normally; a path's `faiths` and `systems` gates still
  apply to the effective character faith.
- `ranks` is ordered and contains 1â€“20 complete records. Every rank has a stable
  lowercase `id` and localized `name`; optional `name_f` is used for a woman. Core
  extraction keys are
  `religiousPath.<pathId>.ranks.<rankId>.<name|name_f>.<branch>`.
- `age`, `years` of vocation experience, and `learning` are personal requirements.
  `gold`, `prestige`, and `piety` are household requirements; advancement consumes
  only `gold`. `prestigeGain` is awarded on advancement and `pietyYield` is the
  seasonal standing yield. All are bounded non-negative numbers.
- `station` may raise the character's social station from 0â€“4. `tier` may raise the
  protagonist on the existing 0â€“7 ladder. `flag` is a compatibility mirror used by
  existing events and old saves; it is not an arbitrary effect. `maleOnly` gates that
  rank. The appointment engine still recognizes the stable core `abbot` and `bishop`
  rank ids, and Catholic/Muslim office consumers retain their stable path ids.
- `character.religiousRanks[pathId]` remains the attained numeric array index in save
  format 3. Every baseline path must remain, and every baseline rank must remain at its
  original index; a replacement may change presentation or requirements and may append
  ranks. Unknown saved path ids are left untouched and inactive. Reads accept legacy
  numeric values and clamp them to the effective path without rewriting saved progress.

Lay standing and an active vocation remain separate. `FB.religiousStandings` exposes
both, while seasonal piety applies only the higher attained yield. A new path cannot
install an arbitrary callback or bypass the engine's live requirement checks.

## Currency presentation

The optional top-level `currency` object changes how every monetary amount is
displayed. It does not change the economy: `player.gold`, event `gold` effects,
`goldMin` gates, prices, loans, and balance values remain numbers in internal game
gold. One game gold is converted only while text is rendered, and formatted strings
are never stored in a save.

`player.gold` is signed at runtime. A negative event `gold` effect applies its full
amount and may create or deepen a household cash shortfall; later positive effects
reduce that shortfall before producing spendable coin. Voluntary transactions still
enforce their own affordability checks, and formal loan debt remains a separate saved
contract rather than being inferred from a negative purse.

A full pounds/shillings/pence definition is:

```json
{
  "name": "Sterling Currency",
  "currency": {
    "id": "sterling",
    "label": "Sterling",
    "icon": "£",
    "smallestPerGold": 240,
    "units": [
      {
        "id": "pound",
        "value": 240,
        "symbol": "£",
        "singular": "pound",
        "plural": "pounds",
        "position": "before",
        "space": false
      },
      {
        "id": "shilling",
        "value": 12,
        "symbol": "s",
        "singular": "shilling",
        "plural": "shillings",
        "position": "after",
        "space": false
      },
      {
        "id": "penny",
        "value": 1,
        "symbol": "d",
        "singular": "penny",
        "plural": "pence",
        "position": "after",
        "space": false
      }
    ],
    "showZeroMinor": false,
    "maxUnits": 3
  }
}
```

`smallestPerGold` is the number of smallest display units represented by one
internal game gold. Each unit's `value` uses that same scale. The example renders
`12.525` game gold as `£12 10s 6d` without changing the stored `12.525`.

Schema rules:

- `id`, `label`, and `icon` are nonempty plain-text strings.
- `smallestPerGold` is a positive integer.
- `units` has one to four entries, in strictly descending `value` order.
- Unit ids and positive integer values are unique; the final value must be `1`.
- Every unit supplies plain-text `symbol`, `singular`, and `plural`, a `position`
  of `before` or `after`, and a Boolean `space`.
- `showZeroMinor` defaults to `false`.
- `maxUnits` defaults to the denomination count and is clamped to that count.

The final enabled or pasted mod that supplies `currency` wins as one atomic
definition; denomination arrays are not merged. An invalid definition falls back
to the complete built-in currency while the rest of the mod still loads.

A decimal currency changes the scale and units in the same way:

```json
{
  "currency": {
    "id": "dollars",
    "label": "Dollars",
    "icon": "$",
    "smallestPerGold": 100,
    "units": [
      { "id": "dollar", "value": 100, "symbol": "$", "singular": "dollar",
        "plural": "dollars", "position": "before", "space": false },
      { "id": "cent", "value": 1, "symbol": "¢", "singular": "cent",
        "plural": "cents", "position": "after", "space": false }
    ]
  }
}
```

A single-unit currency uses `smallestPerGold: 1` and one unit with `value: 1`.
The older `balance.coinageSymbol` option remains a deprecated compatibility alias:
when no full `currency` is supplied it changes only the topbar icon. A full
`currency` definition takes precedence.

## The map

All coordinates are **real-world [longitude, latitude]**. The engine projects them (Mercator)
and rasterizes provinces automatically: every land pixel joins its nearest province seed
on the same polygon in `land`. Separate islands and mainlands must therefore be separate
land polygons; this keeps an island seed from claiming a disconnected shore across water.
A land polygon without a seed falls back to unrestricted assignment so scenery-only
polygons remain visible. Within a single polygon a carved sea (`seas`) can still strand
a far-shore fragment on the wrong county, so after assignment any same-polygon fragment
disconnected from its seed passes to the neighboring county it actually borders — no
county spans a carved sea (Tangier holds no Spanish shore); fragments reached through
the unseeded-polygon fallback (islands) are left alone.
**You never draw province borders** — you place a seed point
where the province's heart is.

### Adding a province (a county)

Provinces are counties. The medieval map holds roughly 460, each with a de jure district; other bookmarks or regions may omit that link. The canonical table lives in data/counties.js as compact rows
(`[id, name, lon, lat, duchy, culture, religion, terrain, dev, realm]`) and expands into
province objects; mods merge full objects as before:

```json
{ "provinces": [
  { "id": "prague2", "name": "Zličané", "x": 15.0, "y": 49.8, "duchy": "bohemia",
    "realm": "bohemia", "culture": "slavic", "religion": "slavic_pagan",
    "terrain": "forest", "dev": 2 }
] }
```

- `x`/`y` — longitude/latitude of the seed (look it up on any map).
- `duchy` — id into `FBDATA.duchies`; the de jure kingdom and empire follow from it.
- `realm` — the realm holding the county at the 867 start.
- `terrain` — `farmland forest hills mountains desert steppe marsh tundra`.
- `dev` — ordinal countywide productive, fiscal, and manpower capacity at the
  867 start: 1–2 is sparse frontier, 3 an ordinary established county, 4 a
  productive or significant center, 5–6 a major regional center, 7–9 an
  exceptional metropolis or irrigated core, and 10 a world-leading center.
  It is a relative scale, not an exact population estimate. Authored values
  initialize fresh games only; an existing save's `state.dev` values remain
  authoritative.
- `wasteland: true` — impassable scenery, no realm/culture needed.
- `communities` — optional ordered culture-and-faith records for a settled county, e.g.
  `"communities": [{ "culture": "gaelic", "religion": "catholic",
  "populationShare0": 8000 }, { "culture": "norse",
  "religion": "norse_pagan", "populationShare0": 2000 }]`. The first record is
  the principal population and must exactly repeat the province's `culture` and
  `religion`; existing county mechanics continue to use those principal fields during
  the storage milestone. `populationShare0` is an optional integer opening share in
  basis points. If one record has it, every record must have it, the list must total
  exactly 10,000, and the principal share must be at least as large as every later
  share. A single-community county implicitly receives 10,000. An optional
  boolean `paired:true` keeps that record's culture and faith indivisible when local
  matchmaking synthesizes mixed identities; use it for an established identity such as
  Ashkenazi/Jewish rather than for ordinary coexisting populations. Lists
  may not be empty or contain a repeated pair, and every culture and assignable
  faith must exist. Counties without the field normalize to their single principal
  pair through `FB.provinceCommunities(province)`.

  An entirely unweighted multi-community list remains compatible: later identities are
  still available to New Game and matchmaking, but the principal receives the whole
  simulated opening population. `FB.communityShareDiagnostics(bookmark)` reports each
  such fallback so authors can replace presence-only data with reviewed shares. Do not
  use equal shares as a placeholder or derive medieval shares from modern census data.
- `settlements` — optional ordered list of up to eight historical settlement
  presentations for this county, e.g.
  `"settlements": [{ "site": "praha", "name": "Prague", "kind": "town" }]`.
  Index 0 is the county head. `site` references the shared physical-site table
  (see [Settlements](#settlements)); `name` is a historical proper name (never
  localized); `kind` is `village`/`town`/`city` as the baseline kind. The list is
  a complete replacement of the authored slots, never a patch: array position is a
  saved-property reference, so appending is safe but reordering or inserting ahead
  of an existing slot moves saved buildings and plots between named places.
  An entry may add `"fill": true`: the presentation still replaces the slot's
  generated name/location, but it does not force early visibility — development
  reveals it on the normal thresholds (the shipped
  `data/settlements_real.js` uses this for its OpenStreetMap-derived fill).
- Adjacency is computed automatically from the generated shapes. For connections across
  water, add a `straits` pair. Field armies treat an unclassified pair as a `narrow`
  crossing. To opt into a slower passage, add the same lexicographically sorted county
  ids to `crossingClasses` with `coastal` or `open` (or explicitly `narrow`):

```json
{
  "straits": [["island_county", "mainland_county"]],
  "crossingClasses": {
    "island_county|mainland_county": "coastal"
  }
}
```

`straits` must remain exact two-element arrays. A crossing-class key must put the lower
county id first, name an existing strait in that same complete world, and use only
`narrow`, `coastal`, or `open`. Reversed, orphaned, or unknown classifications reject
bookmark activation. The classification affects field-army time and routing only:
personal travel, political adjacency, and `FB.findPath` continue to use ordinary strait
adjacency.

Top-level `straits` are append-only: each supplied pair is added after the existing
pairs. To remove or replace crossings, provide an atomic bookmark with its complete
`straits` array. `crossingClasses`, by contrast, merges by canonical pair key.

### The de jure hierarchy

Counties → duchies → kingdoms → empires, all plain reference data:

```json
{ "empires":  { "francia": { "name": "Francia" } },
  "kingdoms": { "west_francia": { "name": "West Francia", "empire": "francia" } },
  "duchies":  { "ile": { "name": "Île-de-France", "kingdom": "west_francia" } } }
```

Each level has its own slug namespace, so the same slug may identify a district and a kingdom. Supplied county duchy, district kingdom and kingdom empire references must resolve within their typed level; omitted or null parents end the chain. Old d_, k_ and e_ aliases are accepted and normalized before activation. Duplicate aliases or unknown supplied parents reject the bookmark. Realm ids remain separate. New mods should author canonical slugs.
Title slugs use lowercase letters, digits and underscores and may start with a letter or digit, such as 476_italy. A legacy alias must match its typed rank, including for year-prefixed slugs.

The engine uses it for the player's rank-claim eligibility (majority of a
duchy/kingdom/empire), realm naming, and the Land panel's hierarchy display. Mods may add
to all three maps.

### Adding a realm

```json
{ "realms": [
  { "id": "frisia_free", "name": "Free Frisia", "color": "#88ccee",
    "capital": "groningen", "aggression": 1, "rank": 2, "liege": "east_francia" }
] }
```

- `rank` — 1 count, 2 duke (also petty kings, chiefs, doges), 3 king, 4 emperor.
- `liege` — optional; the realm id this realm answers to. Omit for sovereign realms.
- `titleKind` / `titleId` — optional de jure claim, independent of `name`.
  `titleKind` is `duchy`, `kingdom` or `empire`; `titleId` is its canonical slug.
  The typed boundary also accepts matching legacy prefixes. Independent kingdoms
  use this identity for crown recognition even with a custom name or Roman
  diocese terminology. The same fields are copied for scripted `newRealm` records.
  Engine-generated realms store a `nameStyle` kind and proper place, exposing
  their lexicon-resolved display through `realm.name`; that display is not a title ID.
- `religion` — optional religion id for the ruling house and realm identity. It defaults
  to the capital county's population faith. Set it when the ruler's faith differs from
  the capital population; this field does not convert any county.
- `government`: optional government form id from `FBDATA.governmentForms`
  (`territorial`, `regnum`, `roman_civic` or `federate_polity`). It defaults to the
  bookmark era's default form. The form decides how the realm's counties get holders
  at campaign creation: `territorial` generates dukes and counts, the others keep each
  county in the realm's own hand. See [realms](designs/realms.md#eras-and-government-forms).
- Set some provinces' `realm` to its id (re-declare those provinces in the mod — same id
  replaces). `aggression` 0–2 drives the war AI.
- **Counts and dukes inside a territorial realm are generated by the engine**; you only
  author realms above that level. The map colors the *sovereign top* of each liege chain;
  `state.holder` tracks who holds each county directly.
- An optional initial ruler is
  `"ruler":{"name":"Name","sex":"m","culture":"frankish","born":1028,"mar":14,"trait":"ambitious"}`.
  These authored fields are copied verbatim at campaign creation. The culture and trait
  ids must exist; generated vassals, succession children, and later rulers remain seeded.
- **Courts come for free.** A modded realm's ruler, consort, and heirs are generated
  and materialized as full characters through `FB.ensureRealmSuccession`, so an authored
  realm opens on a real face and card with no extra data. Authored rulers keep their
  authored identity and receive a seeded sheet around it; hand-authored skills and
  traits for a bookmark ruler are not a supported field. A mod that writes `realm.ruler`
  directly still works, because `FB.realmRulerCharacter` keeps that stub a projection of
  the character record.
- A `realm.succession` member carries
  `{id, name, sex, born, alive, parentId, childIds, charId, role}`. `role` is `null` for
  a child or collateral and `'consort'` for the ruler's spouse of record. **A consort is
  excluded from the line of succession by that role and never by parent grouping** - a
  consort's `parentId` is legitimately `null`. Code that walks a succession must apply
  the same rule. `role` is absent on saves written before consorts existed and reads as
  `null`.

### Complete start bookmarks

```json
{
  "bookmarks": {
    "my_start": {
      "id": "my_start",
      "name": "My Start",
      "desc": "A complete alternate world.",
      "date": { "year": 1000, "season": 0, "day": 1 },
      "era": "high_medieval",
      "geography": "europe_regional",
      "religiousHeads": { "catholic": "my_papacy", "sunni": "my_caliphate" },
      "provinces": [ "...every province object..." ],
      "realms": [ "...every authored realm object..." ],
      "duchies": { "...": { "name": "...", "kingdom": "..." } },
      "kingdoms": { "...": { "name": "...", "empire": "..." } },
      "empires": { "...": { "name": "..." } },
      "straits": [ ["county_a", "county_b"] ],
      "crossingClasses": { "county_a|county_b": "coastal" },
      "scripted": []
    }
  }
}
```

Activation rejects a bookmark with duplicate ids; missing or cyclic lieges; missing
capitals; invalid province realm/de-jure/culture/faith references; development outside
1–10; broken straits; invalid crossing classifications; invalid scripted targets; an
unknown `era` or a start year outside that era's window; a start year outside the
technology catalogue's coverage (`FBDATA.techCoverage`, 476–1300) or outside the era's
technology window; a realm `techTraditions` entry or `techSeed` reference the catalogue
does not know; or a realm `government` that is unknown or names an unregistered strategy.
`era` names an entry of `FBDATA.eras` (`data/eras.js`): `late_antique` (375–649),
`early_medieval` (650–999) or `high_medieval` (1000–1300). It sets the default
government form of realms that declare none and the culture used when generation
finds none on the map. A bookmark that omits `era` runs in the era whose window holds
its start year, or the nearest era when none does, so older mods keep working. A
declared `era` must hold the start year. A campaign stamps its era at creation, so a
later data edit never moves it to another period. An era's `technology` slot names
its technology window and starting-knowledge policy (late_antique 476–649, early_medieval
650–999, high_medieval 1000–1300, all `historical`), and its optional `military` slot may
exclude unit roles that are not core and set an equipment window
([tech](designs/tech.md#traditions-and-bookmark-seeding), [war](designs/war.md)). Because
a start must fall inside the catalogue's coverage, an older bookmark without an `era`
dated before 476 or after 1300 is now rejected. eras and governmentForms are complete-record runtime-mod roots. Technology coverage remains an engine-owned capability boundary.

An era's costume names the wardrobe (FBDATA.wardrobes, data/wardrobes.js) that dresses portraits in that era: medieval for early_medieval and high_medieval, late_antique for late_antique. A government form may name its own costume, which then wins for subjects whose resolved government is that form. A wardrobe holds ordered rules, the first match choosing: garments (a garment from the portrait's garment library with its cloth color), trim and fur colors, headwear (a headwear kind, or faithCover for the headwear the character's faith expects), and chain (when any rule matches, a full figure wears a neck chain). Rules test child, female, minAge, a named station query (station, notStation), the career's primary role (role) or any of its roles (roles, notRoles), a faith attire flag (faith), a headwear tendency of the culture or faith (tends), a deterministic identity roll (roll: salt, index, above or below) and alternatives (any). The comment at the top of data/wardrobes.js lists the garments and conditions. A new period dresses differently by declaring a wardrobe and naming it from its era, with no portrait code change. wardrobes is a complete-record runtime-mod root, resolved against the registered garment and headwear algorithms. Activation rejects an unknown garment, headwear kind, station query or costume, a malformed rule, an invalid culture appearance profile and invalid faith attire.

A bookmark may also carry a balance object that overrides existing FBDATA.balance keys for every campaign started on it, for example "balance": { "levyPerDev": 70, "mortalityBase": 0.014 }. Activation rejects a key the balance table does not hold, a non-number where the default is a number, and any other change of a value's type. See Layered balance below for the order the layers apply in.

geography names the geography base the bookmark is drawn on (see Geography bases below); a bookmark that omits it uses FBDATA.defaultGeography (europe_regional), and an unknown id is rejected. A campaign stamps the base id at creation. Province rows may leave out x, y and terrain to take the base's seed for that county id, and may carry their own dated names list. settlementLayout optionally names the entry of FBDATA.settlementLayouts the bookmark draws its settlement presentations from; without it the bookmark uses the layout stored under its own id, or else its base's default layout (the 867 layout on europe_regional). A settled county with no settlements list then takes its layout entry, unless it sits off the base's seed point. Set settlementLayout to null to keep generated settlements everywhere a county has no list of its own. This fallback is new: a complete mod bookmark that reuses county ids at their usual seeds now shows the curated and real-world sites of the default layout where it previously showed generated ones.
`crossingClasses` is optional and missing entries default to `narrow`.
`religiousHeads` is optional; when
present it maps a faith id or stable `head.officeId` to an authored realm id. The
effective faith must define `properties.head`, and every mapped realm must exist in this
complete bookmark. Omitting the map falls back to each office's effective `head.realm`, which is suitable only when the
same realm id exists in every bookmark. Bookmark ids use letters, digits, and
underscores. Preserve an existing county id when it still denotes the same place; give
genuinely different geography a new stable id, and never recycle a retired id.
`greatHolyWars` is an optional bookmark boolean (default `true`). Set it to `false`
for a bounded world that does not support great holy wars: activation skips the
global sacred-target checks, and that bookmark cannot start new campaigns. Other
bookmarks retain their normal target validation and campaign rules.

A legacy mod that changes `provinces`, `realms`, `empires`, `kingdoms`, `duchies`,
`straits`, `crossingClasses`, `scripted`, `land`, `seas`, or `bounds` without supplying a complete
`bookmarks.1066` definition hides 1066 from the new-game picker and explains why.
Its 867 games still work. Ordinary non-world mods expose both built-in dates, and
matching stamped saves retain access to their recorded bookmark even when it is hidden
from new-game selection. A `rivers`-only mod does not hide 1066 because rivers are
decorative and shared by every bookmark; replacing rivers together with any listed
world-shaping key still follows that key's restriction. Replacing the default base
through geographies (for example geographies.europe_regional) counts as a world change
too; adding a new base does not.

### Scripted history

```json
{ "scripted": [
  { "id": "autumn_conquest", "year": 900, "season": 2, "day": 30,
    "type": "conquest", "realm": "bulgaria", "newRealm": null,
    "targets": ["ras", "bosna"], "news": "Bulgaria overruns Serbia!" }
] }
```

`newRealm` (same shape as a realm, or `null`) spawns a realm at that date before it conquers
`targets` (a list of **county** ids).

`season` is `0` Spring, `1` Summer, `2` Autumn, or `3` Winter; `day` is 1–90.
Omitting both preserves the legacy meaning of Spring day 1 and its old once-only
save/message keys. If either is supplied, `id` is required and must be stable and
unique within the bookmark. Precise entries are checked each day, including Observe
mode, and fire once after their due date even if a life was loaded later.

A legacy top-level mod's scripted entry **replaces** a base (or earlier-mod) entry only
when both its `year` and its `realm` match; otherwise it is added alongside—several
realms may act in the same year. Script arrays inside atomic bookmark replacements are
complete and do not merge.

### Historical ambition definitions

The bundled `data/ambitions.js` defines `FBDATA.historicalAmbitions`, an ordered
array. Each record has a stable `id`, localizable `name`/`desc`, de jure `region`,
target player `tier` (5 duchy, 6 kingdom), `share` of counties required, one-time
prestige, bonus (tax or levy), fractional amount, duration days, and foundedYear. The default established state compares the campaign's start.year to foundedYear. An explicitly present legacy established array of bookmark IDs overrides that default, including an empty array. Existing saved records take precedence; crossing foundedYear during play does not complete an ambition. Optional culture, capital, island duchy and mainland duchy IDs add requirements. These are bundled source definitions, not
a new JSON-mod merge surface. Adding a new foundation also requires its semantic
Chronicle message and technology-impact review; do not rename saved IDs.

`FB.historicalAmbitionRelevant(state,id,realmId)` is the inexpensive list filter.
`FB.historicalAmbitionStatus(state,id,realmId)` returns requirements, recognition
costs, completion status, and readiness without changing gameplay state.
`FB.completeHistoricalAmbition(state,id,realmId)` revalidates and returns the saved
completion record, or `null` without charging on rejection. Realm defaults to
`player`. `FB.historicalAmbitionBonus(state,countyId,key)` reads active rewards;
it never tests unfinished ambitions. See
[Historical ambitions](designs/historical-ambitions.md) for lifecycle and AI rules.

### Coastlines (advanced)

`land` is a list of polygons (`[lon,lat, lon,lat, ...]` flattened); `seas` are polygons carved
*out* of land (inland seas); `rivers` are decorative polylines; `bounds` sets the world window.
Provide any of these to reshape or replace the whole map — e.g. a fantasy continent.
These legacy top-level keys replace the matching geometry of the default geography base
(FBDATA.defaultGeography), so every bookmark drawn on it changes, exactly as before
geography bases existed. FBDATA.bounds, land, seas and rivers keep naming the same objects.

### Geography bases

A geography base is the physical world a bookmark is drawn on. FBDATA.geographies (data/geographies.js) holds the bases; mods add or replace whole bases by id through the top-level geographies key, and each supplied base is validated before it is applied.

```json
{
  "geographies": {
    "my_region": {
      "bounds": { "lonMin": 120, "lonMax": 150, "latMin": 28, "latMax": 46 },
      "gridWidth": 1100,
      "land": [ [125, 30, 145, 30, 145, 44, 125, 44] ],
      "seas": [],
      "rivers": [],
      "mapScale": { "siteSnapMax": 45 },
      "provinces": [
        { "id": "edo", "x": 139.7, "y": 35.7, "terrain": "farmland" },
        { "id": "kyoto", "x": 135.77, "y": 35.01, "terrain": "farmland" }
      ],
      "defaultLayout": null,
      "names": {
        "provinces": { "edo": [ { "from": 1457, "to": 1867, "name": "Edo" } ] },
        "sites": {}
      },
      "climate": { "zone": "northern_temperate", "provinces": {} },
      "knowledge": {
        "basins": { "kanto": { "provinces": ["edo"] }, "kinai": { "provinces": ["kyoto"] } },
        "routes": [ { "from": "kanto", "to": "kinai" } ]
      }
    }
  }
}
```

Fields:
- bounds (required): the longitude and latitude window, inside ±85° latitude. gridWidth (required): the raster width in pixels, 100 to 4000; the height follows from the Mercator projection.
- land (required), seas, rivers: flat [lon, lat, ...] lists, at least three points per polygon and two per river.
- mapScale: pixel-distance tuning measured on this base's raster: siteSnapMax (how far an authored site may snap into its county), raidOverlandPx, raidCavalryPx, raidNavalPx, raidNavigationPx, raidNavalInlandPx and aiSeaRaidReachSq (a squared distance). A value left out takes the default base's, which suits a region of similar scale.
- provinces: the county seed points and terrain bookmarks on this base may inherit. straits and crossingClasses record the base's usual crossings for bookmark authors; each bookmark still lists its own.
- sites: a settlement site table of the base's own; without it the base uses the shared FBDATA.settlementSites.
- defaultLayout: the FBDATA.settlementLayouts entry bookmarks fall back to, or null.
- names: dated names for counties (provinces, keyed by county id) and sites (sites, keyed by site id). Each list holds {from, to, name, culture}: from and to are inclusive whole years and optional, and culture is optional. At activation the first entry whose window holds the bookmark's start year replaces the authored name; an entry with a culture applies only to a county of that culture and wins over an unmarked one. A province row's or site record's own names list takes the place of the base's list for that id. Dated county names are display text and are localized like county names; settlement names stay proper names.
- climate: the climate zone of every county on the base (zone) and per-county exceptions (provinces, county id to zone id). A base without climate, or a county it leaves out, takes FBDATA.defaultClimateZone. See Climate zones and season kinds below.
- knowledge (optional, unused by the engine for now): basins, each a list of the base's county ids, and contact routes joining two different basins. Activation validates them when present.

Only one base is active at a time (FB.activeGeography). Engine code reads geometry through it, never through the legacy top-level tables.

### Climate zones and season kinds

The calendar is global: every county shares state.date.season (0 Spring to 3 Winter), and the top bar names it. What a season means is local. data/climate.js defines season kinds (FBDATA.seasonKinds) and climate zones (FBDATA.climateZones), and each geography base assigns zones to its counties through its climate field. Mods add or replace kinds and zones by id through the top-level seasonKinds and climateZones keys; the composed tables are validated before anything is applied.

```json
{
  "seasonKinds": {
    "wet": { "name": "Wet season", "hardship": true },
    "dry": { "name": "Dry season", "fairWeather": true }
  },
  "climateZones": {
    "tropical_savanna": { "name": "Tropical savanna", "seasons": ["dry", "wet", "wet", "dry"] }
  }
}
```

A base then assigns them in its climate field, for example "climate": { "zone": "southern_temperate", "provinces": { "north_coast": "tropical_savanna" } }. Geography bases are replaced whole, so a base supplied by a mod carries its complete record.

Season kinds:
- name (required): the display name, localized like other data names.
- hardship: armies in the field draw extra supply (balance.supplyWinterDrainMult) where the host stands.
- fairWeather: scheduled games may open at a venue in this season.

The shipped kinds are spring and summer (fair weather), autumn, winter (hardship), mild_winter, dry_summer (fair weather), hot_dry (hardship), and cool_season.

Climate zones:
- name (required): the display name shown on province sheets.
- seasons (required): four season kind ids, for calendar seasons 0 (Spring) to 3 (Winter) in order.

The shipped zones are northern_temperate (today's seasons), mediterranean (dry summer, mild winter), arid (hot dry summer, cool season), continental (cold winter), and steppe (the four calendar seasons), and southern_temperate, which turns the calendar half a year around (calendar Spring is local autumn). FBDATA.defaultClimateZone (northern_temperate) is the zone of any county no base assigns. europe_regional assigns northern_temperate everywhere, so 867 and 1066 keep their long-standing seasons. The 476 bookmark overrides those assignments regionally.

Engine rules ask for a county's local season kind (FB.localSeason(state, provinceId)) and read the kind's properties; they never compare the calendar index for a climate meaning. Province sheets show the local season with its zone. Zones and local seasons are derived from data and never saved, so a data change applies to running campaigns.

### Lexicons

The lexicon holds the words that name political concepts: vassal, liege, fief, holding, levy, crown authority, council, estates, manor, serf, knight, baron, the title levels (county, duchy, kingdom, empire) and the eight-tier rank ladder. FBDATA.lexicons (data/lexicons.js) has a base entry and four layers: eras (keyed by FBDATA.eras id), governments (FBDATA.governmentForms id), faiths (FBDATA.religions id) and cultures (FBDATA.cultures id). A lookup takes the most specific layer that defines the word: the viewer's culture, then their faith and its ancestors nearest first, then the government form resolved by FB.station.context for their own realm, immediate liege or residence holder, then the campaign's era, then base. Mods merge entries through the top-level lexicons key: terms merge by term id, labels by kind and id, and a supplied rank ladder replaces the old one. The composed table is validated before it is applied.

```json
{
  "lexicons": {
    "eras": {
      "late_antique": {
        "terms": { "fief": { "one": "estate", "other": "estates" } },
        "labels": { "holding": { "warhorse": { "name": "Cavalry mount" } } }
      }
    },
    "faiths": {
      "norse_pagan": {
        "rank": {
          "m": ["Thrall", "Karl", "Huscarl", "Hersir", "Jarl", "High Chief", "King", "High King"],
          "f": ["Thrall", "Karl", "Shieldmaiden", "Lady", "Jarl", "High Chief", "Queen", "High Queen"]
        }
      }
    }
  }
}
```

Fields of an entry (all optional except base terms and base rank):
- terms: term id to its noun forms. one is the singular and other the plural; title is the capitalized standalone label (when left out, one with its first letter capitalized). An optional f object holds the same forms for a female viewer. A layer may only override a term the base defines.
- rank: m and f arrays of exactly eight labels, tiers 0 (serf) to 7 (emperor).
- labels: display relabels of structured data text, kind to id to field path to English, for example career, soldier, ranks.apprentice. The unitRole kind names a unit role (levy_infantry, missile, cavalry, household, mercenary, polearm) and relabels that role's default unit class.

Running text reaches a term through a placeholder: {term:vassal} for the singular, {term:vassal.other} for the plural, {term:crown_authority.title} for the standalone label, and {Term:...} to capitalize the first letter. Placeholders work in UI text, durable messages and event or data text. Only display text changes; ids, mechanics and saved records never depend on the lexicon.

## Events

```json
{ "events": [ {
  "id": "lucky_cow", "title": "A Lucky Cow",
  "tags": ["livestock"],
  "text": "A fine cow wanders onto your land, ownerless. {lord} has not noticed.",
  "trigger": { "tierMax": 1, "seasonKinds": ["summer", "autumn"], "chance": 0.2 },
  "weight": 6, "cooldown": 12,
  "options": [
    { "label": "Keep it quietly.", "chance": 0.7,
      "success": { "text": "Milk and calves for years.", "effects": { "gold": 6 } },
      "failure": { "text": "Its owner appears, furious.", "effects": { "prestige": -5 } } },
    { "label": "Give it to the church.", "effects": { "piety": 8 } }
  ] } ] }
```

Event strings stay authored in English. The core localization layer looks them up through a
shadow catalog keyed by event id, field path, and authored option index; it never rewrites
your JSON. Filtering an option does not renumber that key. New or replacement mod prose with
no matching catalog entry displays in its authored English, while exact matches to known core
sources may reuse a core translation. Core v1 does not define separately installed mod
translation packs. Keep every documented `{token}` intact inside translatable strings.

### Trigger conditions (all optional, all must pass)

| key | meaning |
|---|---|
| `tierMin` / `tierMax` | rank 0 serf … 7 emperor; read through `FB.station.reaches` and `FB.station.exceeds` (see [realms.md](designs/realms.md#station-and-rank-queries)), so an absent bound never blocks |
| `societalRoles` | any of `serf commoner gentry lord crowned`; these map to tiers 0, 1, 2, 3–5, and 6–7 |
| `professions` | any actively practiced vocation from `farmer craftsman merchant administration physician scholar soldier monk priest noble`; landed players (tier 3+) retain their career as biography but do not pass profession gates |
| careerRoles | any actively practiced career with one of the listed roles (clergy cloister labor craft trading arms noble learned civic); like professions, landed players (tier 3+) do not pass. Prefer it over professions unless the event belongs to one career |
| `career` | nested active-work career requirement `{profession?,specialization?,guildRankMin?,guildStandingMin?}`; uses the protagonist's resolved career and likewise excludes landed or unassigned/apprentice work |
| `minAge` / `maxAge`, `sex` | `"m"`/`"f"` |
| seasonKinds | array of season kind ids (spring summer autumn winter, plus any a mod adds); passes when the local season of the event's county (the player's county unless the event has a location) is one of them. See Climate zones and season kinds |
| seasons | legacy: array of calendar seasons 0 spring to 3 winter, ignoring climate. Kept for older mods; prefer seasonKinds |
| `yearMin` / `yearMax` | calendar gate |
| `married`, `hasChildren`, `hasYoungChild` | booleans |
| `maxSeasonsSinceMarriage` | requires a recorded marriage no more than this many 90-day seasons ago |
| `goldMin/Max`, `prestigeMin`, `pietyMin`, `leaMin` | resource gates |
| `marriageEndReady` | current primary spouse exists and the effective faith's divorce/annulment costs and cooldown are satisfied |
| `healthMax` | player health at or below (0–10) |
| `flags` / `notFlags` | player flags set by other events |
| `buildings` / `notBuildings` | building ids standing (or not) anywhere in the player's demesne |
| `buildingRoles` / `notBuildingRoles` | building roles with a standing building (or none) anywhere in the player's demesne |
| `techs` / `notTechs` | technology ids completed (or not) by the player's effective sovereign nation |
| `holdings` / `notHoldings` | household holding ids owned (or not) by the family |
| `religionGroup` | any faith id in the player's inheritance lineage |
| `religionGroups` | array form: any listed faith or ancestor matches |
| `cultures` | array of culture ids — any matches the player's culture |
| `provinceReligionGroup`, `provinceCultures` | event-location county's live dominant faith lineage or culture; queued/travel events use their saved `locationId`, otherwise the player's home county |
| `countyCulture`, `countyFaith` | exact live dominant culture or faith id in the event-location county |
| `settlementCulture`, `settlementFaith` | exact live dominant id in a settlement; either an id string using `ctx.settlementIndex`, or `{target,provinceId?,settlement?}` where settlement is a non-negative slot, `$context`, or `$home` |
| `countyCommunityShare`, `settlementCommunityShare` | `{kind:"culture|faith",target:"id",min?,max?,provinceId?,settlement?}`; at least one inclusive 0–1 bound is required |
| `countyCommunityMixed`, `settlementCommunityMixed` | `{kind:"culture|faith",minCommunities?:2,minorityShareMin?:0..1,provinceId?,settlement?}`; minority share is one minus the largest identity share |
| `countyCommunityProject`, `settlementCommunityProject` | `{kind:"culture|faith",active?:boolean,target?,policy?,provinceId?,settlement?}`; omitted `active` means active |
| `terrains`, `coastal` | immutable physical checks on that same event-location county |
| `atWar`, `realmAtWar`, `liegeAtWar`, `isVassal`, `isLiege` | war/politics (`isLiege`: the player has vassals of their own) |
| `hasRole` / `noRole`, `roleOpinionAbove/Below` | `{role, value}`; roles: `lord priest friend rival spouse suitor` |
| `participantStandingAbove` / `participantStandingBelow` | option-only `{participant, value}` check against the exact bound participant; random top-level triggers may not depend on participants |
| `participantKind` | option-only `{participant, values:[...]}` check; normalized values are `lord steward priest friend rival notable kin contact` |
| `rivalHeatMin` / `rivalHeatMax` | active rivalry heat at or above/below the number (0–100) |
| `popularOpinionBelow` | effective Popular support (stored popular opinion plus directly held county modifiers) |
| `hasModifier` | modifier id string, or `{id,pid?}`; county lookup uses explicit `pid`, then the queued event location, then the player's home province |
| `chance` | final random gate 0–1 |
| `custom` | name of a `FB.fns` function; must return true for the event to fire (built-ins: `war_can_siege`, `war_can_hunt`, the live sovereign-campaign-host gate `ghw_has_field_host`, `can_afford_item`, the marriage-station checks `suitor_above_station` / `wed_above_station` / `wed_below_station`, and the royal-council gates `council_has_members` / `council_two_members` / `council_has_schemer` / `council_has_sycophant` / `council_scheme_ripe` / `council_scheme_watched` / `council_charter_due` / `council_has_unseated` / `council_market_charter_due` / `council_muster_due` / `council_domain_pressure_due` / `council_sanctuary_due`, and the estates gates `parliament_has_scutage` / `parliament_redress_possible` / `parliament_aid_can_rise` / `parliament_scutage_possible`, and the finance investability gate `finance_can_invest`, and the artifact gates `artifact_trial_valid` / `artifact_can_afford` / `artifact_is_sacred`, and the life-path gates `lifepath_realm_at_peace` / `merc_contract_ongoing`) |
| `never` | excluded from random selection; fired only by an explicit code or event-effect queue |

Ordinary player-campaign custom gates in `js/world.js` are `war_live_host`,
`war_host_under_pressure`, `war_deserters_due`, `war_can_pay_deserters`,
`war_campaign_deep`, `war_campaign_exhausted`, `war_objective_under_debate`,
`war_has_allied_host`, `war_host_abroad`, `war_enemy_offer_possible`,
`war_active_occupation`, and `war_negotiation_possible`. They inspect the active
ordinary war and, where relevant, its live host; each returns false outside an
ordinary player war. `war_active_occupation` is a live map fact: it holds only while
one of the player's hosts stands on the enemy-held war target. It remains available to
mods, while the shipped `war_occupation_policy` is queued once per war by the engine when
that force is uncontested and large enough to make siege progress; it is not selected by
the random event-slot picker.

The same trigger keys may be used in an option's `require` object. Societal role does
not imply political position: combine it with `isVassal` or `isLiege` where that
distinction matters. `roleOpinionAbove/Below` is a compatibility key name; it tests the
named character's player-facing Standing.

`weight` (default 5) sets relative frequency; `once: true` fires once per life; `cooldown` is in
seasons (a season lasts 90 in-game days — the engine converts). The shipped
`old_custom_stakes` event is a deliberate campaign exception: succession retains that one
fired marker so the household landmark cannot restart for every serf heir. This exception
does not extend to mod events. Random events land on 1–2 random days per season (one extra in
wartime); queued events (`queue`) fire the next day.
Core code queues through `FB.queueEvent`, which snapshots `societalRole`, `profession`,
`formerProfession`, and `locationId` into the JSON-safe event context for exact-value
localization selectors and county targeting. Mods should use the effect-level `queue`
field whenever possible.

An event may additionally declare at most four exact character participants:

```json
{
  "participants": [
    { "slot": "officer", "source": "role", "role": "steward",
      "required": true, "create": true, "authorityRole": "steward",
      "sameHome": true },
    { "slot": "witness", "source": "local_witness",
      "required": true, "createFallback": true, "sameHome": true }
  ],
  "participantCards": ["officer", "witness"]
}
```

Each participant record accepts only `slot`, `source`, `role`, `storyId`, `storySlot`,
`required`, `create`, `createFallback`, `authorityRole`, `sameHome`, `allowDead`, and
`kindParam`. Slots are unique ASCII identifiers that start with a lowercase letter; slots,
`storySlot`, and `kindParam` context keys may use lower camel case or underscores. Sources are `role`,
`local_neighbor`, `local_witness`, `flight_contact`, `story`, and `context`. Role sources
allow `lord`, `steward`, `priest`, `friend`, `rival`, and `notable`; creation is limited to
the local `lord`, `steward`, `priest`, or `notable`. `story` requires `storyId` and may map
to another `storySlot`. Only a required neighbor/witness may use `createFallback:true`,
which materializes the one bounded `notable`. Only a caller-supplied `context` participant
may use `allowDead:true`. `participantCards` is an optional unique subset of declared slots.

Binding occurs only after selection. Exact caller/story ids are preserved; otherwise the
engine considers local friend, rival, current personal attention, cultivated contacts in
relationship order, manageable resident kin for witnesses, and the existing notable.
Local neighbor and witness candidates must be Lowborn or Freeholders (station 0 or 1)
and cannot be reigning realm rulers. This also applies to friends, rivals, cultivated
contacts, and witness kin; the flight-contact source retains its separate local rules.
Core friend debt, surety, and enlisted-companion death stories additionally use
read-only station/authority custom triggers and context validators. Friendship itself,
warnings, and sworn aid remain available across stations.
The saved `ctx.participants` ids and optional normalized `ctx.participantKinds` never reroll
on reopen, restore, preview, or autoresolve. A required participant who dies, moves, loses
their required authority, or belongs to a previous protagonist expires the event before a
choice mutates state. `kindParam` copies the bound kind into a direct context selector key.
`FB.validateEventParticipants` rejects unsupported schemas when a mod is applied.
Core tuning lives in the existing balance catalogue:
`serfAdvocacyStanding`, `serfAdvocacyBonus`, `serfNeighborConsequenceDays`,
`serfFlightFriendChance`, `serfFlightRivalChance`, and
`serfFlightUnaccompaniedChance`. Each additional living spouse or descendant covered by
the flight subtracts `serfFlightFamilyMemberPenalty`, down to
`serfFlightMinimumChance`.

Random events may declare `contextSelector` beside `trigger`. The selector must be
registered by engine code as `FB.eventContextOptions(state, id)` and return an array of
JSON-safe contexts without consuming RNG. Eligibility requires at least one result; after
the story is chosen, the engine deterministically picks one result and snapshots it into
the event context. The exact selector result is checked again at the
display/autoresolve boundary, so an earlier pending choice may invalidate the story
without redirecting it. Core selectors are `foreign_policy_improve`,
`foreign_policy_provoke`, `active_pact`, and `active_alliance`, all producing
`{realmId}` plus a validity stamp only when needed. The lower-station
`historic_raider` selector instead produces `{raidProfile,destinationId}` for one
of the nearest counties associated with the protagonist's historical enemy
profile; its queued chain rechecks that protagonist, profile, and destination
through `historic_raid_context_valid`. This is an engine extension point, not a
JSON-only way to invent arbitrary selectors.

A code-queued event may declare `contextValidator:"fnName"`. Before display or
autoresolve, the queue calls that `FB.fns` function with `(state, ctx)` and drops the
event when it returns false. The succession stories use
`diplomacy_succession_valid` and a saved `rulerGeneration`, preventing an old embassy from
affecting a later ruler. Custom trigger and option-require functions likewise receive
`(state, ctx)`; existing one-argument functions remain compatible.
Court overtures use `agency_overture_context_valid`, requiring Baron rank or above
as well as the existing ruler-generation and relevance checks. Marriage and other
agency events keep their own validators.
Core plot discovery and every plot resolution event use
`plot_event_context_valid`; their queued context carries `plotId`, and the event expires
if the active plot or any target component has changed. For save compatibility, a legacy
queued resolution without `plotId` may infer it only when its event id exactly matches
the current active plot definition.

Ordinary-war operational events use `FB.queueWarEvent` rather than bare `FB.queueEvent`.
It adds `warEventId` and `warEnemyId` to the context, and
`contextValidator:'war_event_context_valid'` accepts only the exact active player war.
`war_submission_valid` and `prison_still` compose that identity check with their own
eligibility rules. Unstamped queues from older saves are accepted only for the currently
live ordinary war; every newly queued council, muster, or offer is exact.

Predetermined player-motion results use
`parliament_motion_context_valid`; the exact polity, pending-motion id, motion id, and
pass/fail result must still match. The paired option gates are
`parliament_motion_passed` and `parliament_motion_failed`.

`wartime: true` (top-level, next to `weight`) marks an event as fit for a war footing. While
the player is **personally at war** — fighting their own war, soldiering in a realm at war,
or riding with the liege's host — random picks draw *only* from wartime events; ordinary
life waits for peace. Queued events bypass the wartime/random filter but still pass their
context validator. At most one valid queued event enters the UI per simulated day; when
one does, that day's random slot event is skipped.

Optional top-level `desc` provides localized supporting instructions in the event
dialog's Details tooltip (hover/focus) or question-mark disclosure on compact
screens. Keep narrative in `text` and essential costs/results with the choices.
Like event `text`, `desc` supports contextual tokens and faith variants.

`warStatus: true` adds the current localized host, enemy, siege, and advance summary as a
separate paragraph below the event text. Use this instead of embedding a `{warstate}` token:
the summary has its own grammar and may contain several clauses. The summary is deliberately
compact — one short clause per fact — so wartime events stay readable; the full battle
record, campaign losses, effects, and upkeep ledger live in the war panels.

`tags: ["famine", "unrest"]` is an optional top-level array. Active modifiers in the
event's snapshotted county (and compatible estate-trait bonuses) sum each named tag.
`max(0, 1 + summedBonus)` scales only negative numeric gold, prestige, piety, health,
war-service, research, popular-opinion, liege/role-opinion, and skill effects. Positive
rewards, chance formulas, custom handlers, flags, and metadata are unchanged.

`childhood: true` works the same way for minor heirs: while the player is **under 16**,
random picks draw only from childhood events. Give child-only events a `maxAge: 15` trigger
too, so they stop at adulthood; age-neutral events (sickness, plague, omens) carry the tag
alongside their normal triggers and serve both pools.

### Option fields

`label`, optional `desc` (a short hint shown beneath the label in the event dialog —
every option should carry one: vague flavor pointing at the thrust of the choice,
not a second copy of the mechanics), optional `require` (same syntax
as triggers — hides the option),
optional `chance` (0–1, or a named formula: `harvest battle proposal rival_peace house_claim annulment
skill_dip skill_ste skill_int skill_lea rights_dip rights_ste rights_int rights_lea swarm
liege_grant war_battle plot plot_discovery fabricate_claim appeal_outcome
vassal_comply county_petition parliament_vote parliament_redress_vote travel_trade serf_flight`) with
`success` / `failure`
branches (`{text, effects}`), and `effects`.
An option may also declare all-of `requiresTech:"technology_id"` (or an array).
By default a missing technology hides the option like an unmet `require`.
`showWhenTechLocked:true` instead keeps it visible with the exact missing technology;
tier-3+ players may open the technology detail from that locked row. Manual selection,
autoresolve, and direct `FB.resolveEventOption` calls share this requirement.
`manualOnly:true` keeps an interactive choice available to a player but removes it from
autoresolve candidates; direct automated resolution also rejects it before mutation. Use
it only when the effect opens a second UI flow that automation cannot finish.
The engine supplies a full contextual consequence breakdown without adding mechanical text
beneath the authored option prose. Desktop pointer and keyboard users receive it as a tooltip;
touch, tablet-width, and short layouts open it with the adjacent question-mark control. It
shows exact costs, penalties, losses, duration/upkeep, permanent decisions, and lethal risks;
favorable rewards stay qualitative until the result receipt. Chance values are never shown as
percentages: they use Very likely / Likely / Even / Risky / Long shot bands. Success and failure
`text` is outcome narrative and is not revealed before resolution.
The four `skill_*` formulas start at 30%, add 4% per effective point in that skill,
and clamp to 10–90%; `skill_ste` also benefits from Fine Tools or a Workshop, while
`skill_lea` benefits from Letters in the Family and the monk/priest professions.
`travel_trade` bargain starts at 28%, adds 4.5% per Stewardship point, and clamps
to 10–92%.
The four `rights_*` formulas are the matching checks for the Old Custom chain: evidence
adds a large bonus, with lord opinion helping Diplomacy, working professions helping
Stewardship, and letters or a religious profession helping Learning. `swarm` is a
Stewardship check helped by a Hearth Garden or Orchard.
`war_battle` counts real men: the fielded host's men if one is raised (the levy plus 150
per mercenary company otherwise), worn by the host's condition (`war.strength`), against
the enemy realm's fielded host (its per-development muster otherwise) — a side still
re-forming a shattered host counts only a fraction of that muster (`FB.rearmScale`: the
share of `armyRearmDays` elapsed, floored at 0.15) — with the days spent leading the
host, a refit, the great levy, a fort in the defended county, tech, items, and blessings
on top. It is an estimate shown on the Deeds war card and rolled for unfortified-siege
sorties: the same terms multiply real battle power in `battlePower` (js/armies.js),
which every actual win or loss now comes from.
`appeal_outcome` weighs an appeal above the player's liege (diplomacy, intrigue, and the
target lord's opinion); `vassal_comply` weighs whether a vassal yields his fief peacefully.
`county_petition` weighs the liege's favor toward the player, prestige, and war service
against the target holder's own standing at court (`player.petitionPid` set by the picker).
The final `liege_grant` and `county_petition` chances are multiplied by
`balance.liegeGrantRepeatMult` once for every successful feudal grant the current
character has already received.

`rival_peace` weighs Diplomacy and the rival's opinion against current rivalry heat, with
small adjustments for a kind or proud player, and clamps to 10–90%.

`proposal` weighs the suitor's regard, the player's prestige and tier — and **station**:
every character carries a social rank 0–4 (lowborn · freeholder · gentry · noble · royalty,
`FB.stationOf`; the player's is their tier, capped at 4). Each step the suitor stands above
the player costs `balance.proposalStationPenalty` of the chance; marrying down is easier.
Beginning courtship beyond ordinary one-station reach requires a Warm contact at every exact
intervening station (`FB.rankAccessStatus`); an established personal relationship already has
access. Matchmade suitors come from within a step of the player's own station, and the wedding settles a dowry
(`balance.dowryByStation`, indexed by the spouse's station) plus a prestige swing
(`balance.marryUpPrestige` / `marryDownPrestigeLoss` per step).

`sibling_proposal` is the exceptional player-only counterpart: it uses the
active accepted sibling pair, +80 Standing gate, target courtship-trait
modifiers, dynastic relevance, and current faith route, then caps at 60%.
`sibling_exposure_denial` weighs the protagonist's Intrigue and deceitful or
honest courtship effects, with a small contribution from the active sibling.

Marrying up also pays out at the end: when a spouse of higher station dies, `FB.spouseDied`
queues `widow_settlement` (no living child of that blood) or `house_claim` (there is one —
pressing it uses the `house_claim` named chance; success pays the inherited portion but
does not change household rank). Their payouts scale off `dowryByStation` via the custom effect
fns `dower_take dower_take_full claim_won claim_lost claim_sold` (js/events.js), and their
texts use the `{late}` token (the dead spouse's name, carried in the event ctx).

Faith sets the rest of the rules (`FB.marriageDoctrine` in js/model.js).
`properties.marriage.spouseLimit` controls spouse capacity;
`properties.marriage.divorce` controls direct or petitioned separation, cost, and
cooldown; and `acceptedRelations` filters cross-faith matches through the directional
faith graph. Optional `properties.marriage.kinship.siblingRite:'xwedodah'` recognizes
the exceptional player sibling-marriage route when both characters share the exact
faith. The additional value `sanctioned` recognizes the same route without
Zoroastrian-specific presentation. `balance.wivesByGroup` remains
only a fallback for legacy definitions with
no marriage property. Every eligible spouse pairing can bear children, the first is the
one `{spouse}` and the spouse-role address, and the next in line is promoted when the
first dies or is set aside
(`FB.spousesOf` / `FB.canWed` / `FB.promoteSpouse`). New spouse plots use
`assassination`. The old `widow_veil` definition remains hidden so an active version-3
save can still resolve `plot_spouse_end`.

### Effects

`gold prestige piety health warService` (numbers — `gold` also accepts the special
`"harvest_good"` value: seeded 4–8 plus one per three effective Stewardship, +6 for
risky crops, +2 for an ox, then up to five farm plots add 12% each; `warService` is the
lifetime tally of service in the liege's wars and feeds any core trait progress attached
to that service) ·
`skills: {dip|mar|ste|int|lea: n}` (positive gains
go through `FB.gainSkill`, so the soft cap applies — see balance below) ·
`student: {skills:{dip|mar|ste|int|lea:n}, addTrait:"trait_id"}` (apply either or
both fields to the exact living `ctx.studentId`; skill values are non-zero integers from
−20 to 20, positive gains use `FB.gainSkill`, negative changes clamp raw skill at zero,
and `FB.addTrait` replaces an existing opposite) ·
`addTrait / addTraitOnce / removeTrait` (`addTraitOnce` is the explicit idempotent spelling;
trait grants already do nothing when the character has that trait) ·
`traitProgress: {id, amount?}` (default amount 1; progress is
clamped at the trait's `earn.threshold`, then the trait is awarded) ·
`marriageEnd:"success|failure"` (deduct the queued/effective faith-doctrine
gold, piety, and prestige for an annulment outcome; failure may use
`marriage.divorce.failurePiety`) ·
`ailment: "id"` (a named wound/sickness from `FBDATA.ailments`) ·
`setFlag / clearFlag` (+`setFlag2`/`clearFlag2` for a second one) ·
`clearHarvestFlags: true` (clears `crop_safe`, `crop_risky`, `crop_ruined`, and the
spent `blessed_crops` blessing) ·
`opinion: {role, amt}` · `opinionLiege`, `popularOpinion` ·
(`opinion` and `opinionLiege` retain their compatibility names but adjust personal or
realm Standing; `popularOpinion` remains the distinct Popular support population score) ·
`guildStanding: n` (adjust active guild-career Standing, clamped 0–100; no-op for a non-guild calling) ·
`standingRealm: n` (adjust Standing with the exact living realm in
`ctx.realmId`, with legacy `ctx.rid` accepted; no pairwise AI opinion is created) ·
`papalOpinion: n` (adjust the recognized Pope's opinion of `ctx.candidateId`, or of the
protagonist when the context has no candidate; clamped to −100…100 and a no-op during a
vacancy) ·
`rivalContact: {role, score, cause}` (record an explicitly hostile encounter with that
existing named role; `score` defaults to 1, `cause` is an opaque non-localized id, and
contact with the active rival also adds `score × balance.rivalContactHeat` heat). For an
event with declared participants, use `rivalContact:{participant,score,cause}` to target
only that exact required slot; it never falls back to a role ·
`standingCharacter:{participant,amt}` (or an array of up to four unique required slots;
adjust exact personal Standing, with the ordinary positive-trait multiplier, and never
substitute another character) ·
`rivalHeat: n` (adjust the active feud, clamped 0–100) · `endRivalry: true` (clear the
rival seat, its plot/escalation state, and begin the peace cooldown) ·
`tierSet` (raise rank), `tierUp`
(liege grants land from his own hand — a baron is invested as count of his home county;
a count-or-higher vassal receives an adjacent county the liege holds directly, never the
liege's seat or his last county, and stays inside the realm; a resulting duchy majority
raises him to duke only when his living liege is a king or greater) · `profession`,
`restoreProfession` · `queue: "event_id"` (chain events) ·
`serfFreedom:{route:"old_custom"|"flight"}` (a bounded tier-0-to-tier-1
transition for an exact story context; it requires a living protagonist and active
home tenure, closes that tenure, writes semantic family history and one Chronicle
landmark, and runs before movement. It cannot be combined in the same effect object with
`tierSet` or `tierUp`; failed preflight applies none of that object's sibling effects.
Purchase and negotiated manumission are engine-owned routes and are not valid authored
event values. Invalid route shapes and generic-rank conflicts reject a runtime mod before
any of its data is applied.) ·
`marry` (`true` settles the current suitor's saved formal courtship transfer;
`"informal"` uses the same wedding and family-link mechanics without a dowry),
`clearSuitor`, `focusSet: "<focus id>"` · `adoptChild` (creates a child in the
protagonist's dynasty, culture, faith, station, and bondage status, linked through
`childrenIds` with no invented biological parents), `killChild`,
`killRole` (optionally accompanied by `kinslayer:true`; this grants Kinslayer only when
the killed role is the protagonist's spouse or blood relative), `educateChild` · `moveRandom` ·
`convertToProvince` (changes the protagonist and an existing player realm to the current
event-location county's live dominant faith; it does not change county communities) ·
`foundFaith:{definition:{...},convertFounder?,convertHousehold?,convertRealm?}` (validate
and save a new faith definition, defaulting an omitted `group` or `"$current"` group to
the protagonist's current faith; the founder converts unless explicitly false, optional
household and player-realm conversion use the same id, and successful creation exposes
that id as `ctx.faithId`; a founded branch does not inherit its parent's religious head
unless the definition explicitly includes `properties.head`) ·
`faithRelation:{observer?,target,status,reciprocal?}` (save a directional relation;
`observer` defaults to `"$current"`, either id may use `"$founded"`, and reciprocal is
either `true` for the same reverse status or an explicit reverse status) ·
`declareIndependence` · `devUp` ·
`populationLoss: n` (flat civilian loss in the target county; mitigated by crisis/famine building & tech protections) ·
`populationLossRate: rate` (fractional civilian loss, e.g. `0.05` for 5%; mitigated by crisis/famine protections) ·
`populationCommunity:{culture?,religion?}` optionally accompanies either population-loss
key. At least one valid id is required; only matching live community cohorts are lost.
Omit it for proportional county-wide loss. This lets famine, persecution, expulsion, and
other scripted losses declare their affected population without rewriting county identity. ·
`countyCommunityTransfer:{kind:"faith|culture",target:"id",source?:"id",
amount?:n,rate?:0..1,provinceId?:"county_id"}` converts an exact amount or bounded
fraction of eligible live cohorts. Faith transfers preserve culture and culture
transfers preserve faith; omitting `source` draws proportionally from every non-target
identity. This changes no population total. ·
`settlementCommunityTransfer` accepts the same fields plus
`settlement:"$context|$home"|non-negative-slot` and converts only that settlement while
rolling the exact result into county totals. `communityMigration`,
`communityExpulsion`, and `communityResettlement` each accept
`{fromProvinceId,toProvinceId,community?:{culture?,religion?},amount?|rate?,
fromSettlement?,toSettlement?,cause?}`. Province ids may be literal ids, `$context`,
`$home`, or `$destination` (the saved `ctx.destinationId`); settlement values use the
context/home tokens or a non-negative slot. Exactly one positive
integer `amount` or 0–1 `rate` is required. Movement preserves culture-faith pairs and the
combined population of both counties. Expulsion must identify a community; migration and
resettlement may omit it for a proportional move. ·
`countyCommunityProject:{kind:"faith|culture",target:"id",
policy:"voluntary|integrative|coercive",sponsor?:"$owner|$player|realm_id",
provinceId?:"county_id"}` begins or replaces that county's one saved project on the
chosen axis. Omitted sponsor and `$owner` resolve to the county's current owner at event
resolution. `stopCountyCommunityProject:"faith|culture"` stops that axis in the event
county; an object may add `provinceId`. Projects never begin implicitly on conquest or
character/realm conversion. ·
`settlementCommunityProject` accepts the same fields plus `settlement`;
`stopSettlementCommunityProject:{kind,provinceId?,settlement}` stops only that local
axis. ·
`pickHeir: true` (opens the eligible-heir picker; automation names the first heir in line;
either result grants 8 prestige and records the choice) · `research: n` (points added to
the effective sovereign nation's shared research pool; divided among active projects or
banked as reserve) ·
`travelReturn: true` (begin the saved route home once the minimum stay is complete) ·
`travelSettle: true` (move the household to an eligible completed destination without
converting culture/faith; limited to one permanent move per character life) ·
  `holding: "id"` / `loseHolding: "id"` (grant or take household property) ·
  `addModifier: {"id":"modifier_id","pid":"optional_county_id"}` (or a bare id string;
  county targeting falls back to the queued `locationId` and then the player's home,
  while campaign modifiers target the matching active great holy war) ·
  `removeModifier: {"id":"modifier_id","pid":"optional_county_id"}` (or a bare id string;
  uses the same county/campaign targeting and emits a durable end notice when a live
  record is removed) ·
  `giveItem: "id"` (grant one definition from `FBDATA.items`; repeatable definitions create
a fresh exact instance, while random finds use `custom: "loot_item"`) ·
`deathProvenance: {kind:"battle|event", province:"context", enemy:"war|liegeWar|realmWar"}`
(optional semantic origin for a lethal effect; ids are materialized only if the resolved
effect leaves the player at zero health) ·
`pricePressure: n` with optional `pricePressureYears: n` and
`pricePressureSource: "stable_id"` (a saved annual price-index shock; positive raises
pressure, negative lowers it; the core harvest/disease sources route to material
market shocks instead) ·
`marketShock: {"id":"stable_id","provinceId":"home|context|county_id",
"goodId":"optional_good_id","production":-0.3,"demand":0.1,"flow":-0.2,
"severe":true,"seasons":2}` (a saved seasonal county-commodity shock; omit
`provinceId` for a world-wide effect and omit `goodId` for every basket) ·
`log: "chronicle text"` ·
`worldNews` · `custom: "fnName"` (calls a function registered on `FB.fns` — the war
handlers `war_win war_loss war_hold war_siege war_mercs war_mass war_raise
war_hunt war_supply war_thin war_terms war_accept_tribute war_press_on` (and the `war_can_siege` /
`war_can_hunt` triggers) live in `js/world.js` — `war_siege` doubles as the season-tick
siege pulse: a host standing on the war target presses the works without a council
order; the
great-holy-war field handlers `ghw_recruit_volunteers ghw_recruit_mercenaries
ghw_recruit_knights ghw_recruit_adventurers` (and the `ghw_has_field_host` trigger)
live in `js/holywar.js`; they add only to the current live host, increasing its unit
class, `men`, and reinforcement ceiling `size`, so nothing survives dispersal or a later
remuster; the
liege-chain and vassalage handlers `appeal_win appeal_lose vassal_release vassal_crush
vassal_reclaim vassal_refuse vassal_favor vassal_snub vassal_insist county_petition_grant
record_liege_grant` live in `js/events.js`; the
ordinary rank-investiture handlers `rank_elevation_offer rank_elevation_claim
liege_land_grant` (plus the `rank_elevation_context_valid` validator) live in
`js/actions.js`; `FB.attemptRankElevation` is the built-in on-demand Deeds boundary that
rechecks the current rank, territorial/social gates, cooldown, and complete crossed-rank
cost only after the player confirms the rank review; the
disguise-at-war story fns `polly_court` (spawns the followed soldier into the `{suitor}` role) /
`polly_rout` (the small mortal-wound roll on a lost shield-wall) also live in `js/events.js`;
the Noble Academy handlers `academy_introduction academy_student_focus
academy_student_dip academy_student_ste academy_student_int academy_student_lea
academy_withdraw` target the queued `ctx.studentId` and also live in `js/events.js`;
the episcopal-simony handlers `bishop_simony_accept bishop_simony_clear` target the queued
`ctx.candidateId` and also live in `js/events.js`;
the downfall handlers `df_fall df_fall_flee` (lose every title and acre, back to landless
gentry — the second flees abroad) live in `js/world.js`; the descent handlers
(docs/designs/descent.md) `hc_defy` (restart the title-lapse window),
`war_submit war_submission_tribute` (the loser's homage; the
`war_submission_valid` validator and the `war_submission_tribute_affordable` require),
`attainder_pay attainder_yield attainder_resist` (felony outcomes; the
`attainder_risk` trigger and `attainder_can_pay` require), and
`prison_pay prison_cede_land` (ransom; the `prison_still` validator and
`prison_can_pay prison_can_cede` requires) also live in `js/world.js`; the
distraint handlers `distraint_settle distraint_yield_one distraint_seize
bondage_submit bondage_flee` (and the `finance_in_default` trigger/validator and the
`distraint_can_settle distraint_can_yield` requires) live in `js/economy.js`; the
devastation handlers `devastation_lose_holding devastation_commend` live in
`js/world.js`; the finance trade-investment
handlers `finance_trade_20 finance_trade_50` (commit merchant coin to a four-season trade
partnership at the given base stake) and guild-monopoly petition handlers
`guild_monopoly_paid guild_monopoly_persuade_success
guild_monopoly_persuade_failure` live in `js/economy.js`; the life-path handlers
`lifepath_author_work` (a commissioned Author's further randomized family
treatise) and `lifepath_realm_at_peace` (the peacetime muster-drill trigger)
live there too; targeted-plot handlers
`fabricate_claim_success fabricate_claim_failure plot_discovery_success
plot_discovery_failure plot_discovery_abandon plot_discovery_contain` and the
diplomatic pact/alliance handlers live in `js/actions.js`; obligation handlers live in
`js/parliament.js`, monopoly handlers in `js/economy.js`, and Council counter-scheme
handlers in `js/council.js`; mods may register their own before use).

The ordinary campaign-writing handlers also live in `js/world.js`.
`war_discipline` and `war_disorder` change only abstract campaign condition;
`war_discipline_deserters` and `war_pay_deserters` do the same and stamp the current
war's desertion interval. `war_desert` removes a seeded percentage from the live host,
`war_allied_withdrawal` removes the active allied contribution and lowers condition,
and `war_negotiated_withdrawal` ends the ordinary war. Live losses use the shared fixed
class allocation and these handlers record whether they changed abstract strength,
live troops, or both for the campaign-feedback UI.

An option-level custom effect should also register an impact adapter:

```js
FB.eventImpactAdapters.my_effect = {
  preview:function (state, ctx, event, effects) {
    return [{ type:'gold', amount:-5 }];
  },
  report:function (state, captured, ctx, event, effects) {
    return [{ type:'system', system:'property', resolved:true }];
  }
};
```

`preview` must be pure: it cannot mutate state, create roles, emit news, or consume RNG.
It must expose guaranteed costs and major risks exactly while keeping rewards qualitative.
`report` runs after the authoritative custom handler and adds semantic results to the
engine's clamp-aware before/after ledger. An optional `capture(state, ctx, event, effects)`
may return JSON-safe pre-effect context for `report`. Every core custom option effect has
an adapter; an unregistered third-party effect remains playable and displays
**Story-specific consequence** plus its authored `desc`.

Wounds and sicknesses get named even without an explicit `ailment` key: any `health`
loss of 2 or more adds a random wound from `FBDATA.ailments` (in `data/traits.js`;
severity 2 at −4 or worse), `setFlag:'ill'` adds a random sickness, and
`clearFlag:'ill'` casts all sicknesses off. Wounds heal as strength returns — one per
year once the character is hale again (health 7+). An ailment entry carries
`name icon kind desc`, where `kind` is `'wound'` or `'sickness'`; wounds also carry
`sev` (1 minor / 2 severe) and may carry `mark` (`'cut'`, `'bruise'`, or `'bandage'` —
the cue the portrait draws; sicknesses show as a pale, haggard face instead). The mod
key is `ailments`.

### Text tokens

`{name} {dyn} {title} {newtitle} {spouse} {suitor} {partner} {late} {lord} {priest} {friend} {rival} {childname} {student} {ambition}
{province} {location} {destination} {realm} {enemy} {settlement} {god} {holy} {temple} {year}` work in titles,
texts, labels, and `log`. `{enemy}` is the realm the player is at war with (or "the
enemy"); `{target}` is the province an attacking war aims at; `{settlement}` reads
`ctx.settlement` (set by the go-into-town deed's queue); `{item}` and `{itemprice}`
describe the currently offered item (`player.itemOffer`); `{liege}` is the player's direct
liege realm; `{rname}` / `{rulername}` are the realm and ruler named by
`ctx.realmId` (legacy `ctx.rid` remains accepted); `{cname}` is the county named by
`ctx.provinceId` (legacy `ctx.pid` remains accepted). `{newtitle}` renders the semantic
title snapshot supplied as `ctx.titleData`; core rank-investiture events use it so the
offered dignity remains grammatically localizable and stable across the transaction.
Lexicon terms are tokens too: {term:vassal}, {term:vassal.other}, {term:crown_authority.title} and the capitalized {Term:...} form name the campaign's word for a political concept (see Lexicons under The map).
Any declared participant slot is also a token: `{officer}`, `{witness}`, `{neighbor}`,
or another valid slot resolves the exact id in `ctx.participants` before a same-named
legacy role could be considered. Mentioning a living participant adds one event character
card; `participantCards` adds a card when the prose itself does not contain the token.
Outcome receipts preserve the pre-effect participant name.
`{location}` is the traveler’s current county (or `ctx.locationId`) and
`{destination}` is the journey destination (or `ctx.destinationId`).
`{student}` is the exact character named by queued-event `ctx.studentId`; mentioning it
also gives that student a character card in the event modal. Annual schooling queues also
provide `ctx.studentFocus` and `ctx.schoolId` for custom effects.
`{partner}` is the exact character named by queued-event `ctx.partnerId`; it also adds that
character's card to the event modal. `{ambition}` renders the managed family ambition of
`ctx.studentId` when the ruler-agency system is available.
During an active ordinary player war, `{hostMen}` is the current live host headcount,
`{warLosses}` is the campaign ledger's cumulative live-host loss total, `{alliedMen}` is
the current allied contribution, and `{deserterMinPercent}` / `{deserterMaxPercent}` are
the configured desertion bounds. `{money:deserterPay}` renders the current arrears cost,
derived from authoritative seasonal host logistics and the configured payment floor.
`{god}`/`{holy}`/`{temple}` adapt to the player's faith (God/priest/church,
Allah/imam/mosque, the gods/godi/shrine…) — prefer them over hard-coded religious words so
events read correctly for every culture.

Use `{money:parameter}` wherever a numeric context value is money, for example
`"The price is {money:itemprice}."`. Declarative text may use a numeric literal,
such as `"Pay and pass. ({money:2})"`. The renderer formats the fragment using the
active currency; do not write a symbol or the word "gold" beside it. Translations
must preserve the complete typed token exactly.

### Tailoring events to faith and culture

Events must read correctly for whoever receives them — no ale, pork, or church bells for a
Muslim player. Three tools, from lightest to heaviest:

1. **Tokens** — `{god}`/`{holy}`/`{temple}` for generic religious words (see above).
2. **Variant text** — any text field (`text`, `title`, `label`, `desc`, success/failure
   `text`, `log`) may be an object keyed by faith id or ancestor id instead of a plain
   string:

   ```json
   "text": { "default": "…a pig, a bolt of cloth…",
             "muslim":  "…a lamb, a bolt of cloth…" }
   ```

   The engine checks the player's exact faith first, then each ancestor in order;
   `default` covers everyone else and is required.
3. **Gated options / paired events** — an option that only suits some faiths gets a
   `require` with `religionGroups` (add a counterpart option for the others, so no faith
   sees fewer choices — see `village_festival`, `court_feast`). A whole event that only
   suits some faiths gets a gated `trigger` plus a counterpart event (see `sermon` vs
   `friday_khutba`, `hunt_with_lord` vs `hawk_with_emir`). The `cultures` /
   `provinceCultures` triggers work the same way for culture- or region-specific events.

An event may also set `"charCard": "suitor"` (or any role name) to display that character's
card inside the event popup — portrait, house arms, home county and allegiance, age, faith,
skills, and traits — used by the matchmaking events. A card also appears automatically for
every `{lord}` / `{priest}` / `{friend}` / `{rival}` / `{spouse}` / `{suitor}` token used in
the event's title, text, option labels, or branch texts, so a named character never arrives
as a bare name.
An event using `{rname}` or `{rulername}` with `ctx.realmId` similarly receives a realm
identity card with arms, ruler, rank, Standing, and the current pact/alliance/direction.

An event with `"nameChild": true` (used by `child_born_flavor`, queued with `ctx.childId`)
shows a name field above its options, prefilled with the child's generated name and a dice
button that rerolls from the child's culture. Whichever option is chosen applies the edited
name (an empty field keeps the old one); an autoresolved event keeps the generated name.

## Political blocs and Estates motions

`FBDATA.politicalBlocs` lives in `data/political_blocs.js`. A runtime mod may
replace a complete archetype definition by the same top-level
`politicalBlocs` id:

```json
{
  "politicalBlocs": {
    "mercantile": {
      "name": "Commercial Interest",
      "icon": "⚖",
      "color": "#4f9c8b",
      "desc": "Guild, charter, enterprise, and trade interests acting together.",
      "order": 1,
      "affiliationThreshold": 30,
      "motions": { "redress": 25, "scutage": 30 }
    }
  }
}
```

`name` and `desc` are structured display fields; `icon`, optional six-digit-hex
`color`, and `order` control presentation. `color` outlines seats in the focused
Estates chamber and safely falls back to the core archetype color when omitted or
invalid. `affiliationThreshold` is the minimum interest score for a new
ordinary affiliation. `motions.redress` and `motions.scutage` are the
archetype's reason-coded starting scores. Core assignment recognizes the
`crown`, `mercantile`, `magnate`, and `independent` archetypes. Later mods may
replace those definitions, but an additional id is not assigned automatically
without engine code that uses it. Definitions are replaced atomically rather
than deep-merged.

The direct political court is deliberately player-bounded. It contains the
relevant ruler house, its living landed direct-vassal houses, and the player
house when sworn there. House influence is:

`1 + rank×2 + directly held counties + floor(other territory/2) + Council office`.

Use the public projections rather than rebuilding this rule:

- `FB.politicalCourt(state)` returns the locale-neutral court and house facts,
  including derived `rulerAge` and `economicPower` (directly held county
  development plus half the development of vassal-held territory).
- `FB.politicalSummary(state)` returns aggregated blocs, leaders, members,
  interests, influence, strict-majority threshold, a `forecasts` map keyed by
  policy id for every catalog policy that applies, the influence-weighted
  `courtEconomicPowerAverage`, and an optional pending-motion forecast.
- `FB.politicalMotionForecast(state,policyId)` returns bloc scores, reason
  ids, locked/pledged/undecided postures, natural support chances, and
  influence totals plus `courtEconomicPowerAverage` for any id in the policy
  catalog. Bloc records include influence-weighted `averageRulerAge` and
  `averageEconomicPower`.

Those three functions are read-only and RNG-neutral. Do not call the mutating
repair functions from rendering code. `FB.ensurePolitics` and
`FB.repairPolitics` create or validate the additive saved allegiance/campaign
state at simulation, load, title, and liege boundaries.

Player motions use these mutating interfaces:

- `FB.parliamentBeginMotion(state,motionId)` (also exposed through the legacy
  `FB.parliamentMove` alias) spends the configured cost and opens the 90-day
  campaign.
- `FB.parliamentLobbyMotion(state,blocId)` consumes the one lobbying attempt;
  `FB.parliamentLobbyStatus` supplies its exact visible gate and chance.
- `FB.parliamentCallVote(state)` resolves each undecided bloc once in stable
  id order and queues the predetermined core event.
- `FB.parliamentWithdrawMotion(state)` clears an untallied campaign without
  refunding its cost or yearly use.

Do not write `state.politics` directly. It stores stable allegiances, semantic
pledges/lobby/result state, ids, and turn stamps; influence, probability,
localized prose, and rendered reasons are always derived. The existing
`parliament_vote` and `parliament_redress_vote` named chances remain supported
for non-motion Estates stories and older mods. Every catalog policy vote uses
the bloc tally; there is no separate global success roll.

## Policy catalog (Estates laws and reforms)

`FBDATA.policies` lives in `data/policies.js`. Each entry is one law or reform
a sworn lord (tiers 3–5) can campaign for before the liege's Estates. A runtime
mod may replace a complete definition by the same top-level `policies` id;
definitions are replaced atomically rather than deep-merged:

```json
{
  "policies": {
    "market_charter": {
      "name": "Market Charter",
      "icon": "⚖",
      "desc": "If carried, your home county gains a chartered market.",
      "family": "commerce",
      "institution": "estates",
      "proposer": "vassal",
      "minTier": 3,
      "maxTier": 5,
      "states": "one-shot",
      "cooldown": "year",
      "repeal": "none",
      "emergency": false,
      "order": 4,
      "requiresTech": ["urban_markets", "authenticated_seals"],
      "gate": "parliament_gate_market_charter",
      "posture": {
        "economicPowerSlope": 6,
        "traits": { "greedy": 6, "generous": -4 }
      }
    }
  }
}
```

Fields:

- `name` and `desc` are structured display fields (localized like bloc names);
  `icon` and `order` control presentation.
- `family` groups policies for the cooldown: after a campaign begins, the
  Estates hear no second matter of that family until the next calendar year.
  The spent years are saved on the liege realm as `obl.motionYears`.
- `institution`, `proposer`, `minTier`, and `maxTier` declare the eligible
  proposer, electorate, and rank. The first catalog is `estates`-only.
- `states` describes the target term: `level` (an ordered aid rate), `on` (a
  durable law such as scutage or consent of the estates), or `one-shot` (a
  timed grant). `repeal` documents how the term can be undone — `none` in the
  first catalog. `emergency: true` waives the family cooldown (its gate still
  applies; the core emergency subsidy requires a liege at war).
- `cost` overrides `balance.parliamentMotionCost` for the proposal.
- `requiresTech` optionally names one technology id or an all-of array completed by the
  player's effective sovereign. It is checked before any motion cost or cooldown is spent;
  an already-started campaign remains valid after a later allegiance change.
- `gate` names an `FB.fns` fn that returns `true` when the policy may be
  proposed, or a localized reason string shown wherever the proposal is
  disabled. Home-county gates use `state.player.provinceId`.
- `posture` tunes bloc scoring beyond the archetype's `politicalBlocs.motions`
  base weight: `aidSlope` multiplies the current aid's deviation from custom,
  `traits` maps member-ruler trait ids to score adjustments, and
  `martialSlope` scales average member Martial (clamped ±12). Optional
  `ageSlope` multiplies `(influence-weighted average ruler age - 40) / 10`,
  rounded and clamped ±8. Optional `economicPowerSlope` multiplies the bloc's
  relative difference from the influence-weighted court economic-power average,
  rounded and clamped ±8. These are read-only forecast factors and are never
  serialized.
- `resultEvent` names the queued result event; it defaults to
  `parliament_<policyId>`. The event follows the predetermined-result pattern:
  `contextValidator:'parliament_motion_context_valid'` with pass/fail options
  gated by `require:{custom:'parliament_motion_passed'}` /
  `'parliament_motion_failed'}` and no `chance`, so visible and autoresolved
  outcomes are identical. Outcome effects (gold, Standing, prestige, county
  modifiers, term changes) live in that event, not in the policy def.
- `redressEvidence: true` feeds Bend the Feudal Obligation evidence into the
  player's lobbying strength for that policy (redress only).

`FB.policyList()` returns the ordered catalog for pickers;
`FB.policyDef(id)` resolves one def (falling back to the two original motions
when catalog data is absent); `FB.parliamentMotionStatus(state, policyId)` is
the shared read-only gate used by Governance, Network, and the Estates sheet.
The durable law `obl.revocationConsent` (consent of the estates) removes the
liege's unilateral aid demand from the yearly session agenda. Forecasts and
postures are always derived; only terms, cooldown years, consent, and the
pending campaign are saved.

### Crown-side royal policy (religious tolerance and settlement)

Catalog entries with `institution: "crown"` are **royal policy**: standing laws
the sovereign player (tier 6+, ruling their own realm) proclaims directly —
no Estates campaign, no bloc vote. The Estates machinery (motion status, bloc
forecasts, and both Estates sheets) skips these defs. Such a def uses
`states: "levels"` and declares ordered, mutually exclusive `levels`:

```json
{
  "policies": {
    "religious_tolerance": {
      "name": "Religious Tolerance",
      "icon": "🕯",
      "desc": "The crown’s standing law for subjects who keep another faith.",
      "family": "faith",
      "institution": "crown",
      "proposer": "ruler",
      "minTier": 6,
      "maxTier": 7,
      "states": "levels",
      "defaultLevel": "confessional_preference",
      "cooldown": "year",
      "repeal": "proclamation",
      "order": 9,
      "levels": [
        { "id": "persecution", "name": "Persecution", "icon": "🔥",
          "desc": "…",
          "modifier": "persecuted_minorities", "modifierScope": "minority",
          "seasonPiety": 2, "researchFactor": -0.15,
          "onEnact": { "piety": 10, "authority": 4, "pop": -6,
            "headFaith": 8, "sameFold": 3, "otherFold": -8,
            "vassalSameFaith": 2, "vassalOtherFaith": -15,
            "mistreatment": "religious_persecution" } }
      ]
    }
  }
}
```

- `defaultLevel` names the customary level old saves and new games start at;
  the saved record is only `state.realmPolicies[policyId] =
  { level, setTurn, setYear }`, healed additively on load. Unknown saved
  levels fall back to `defaultLevel`; unknown policy ids are dropped.
- `cooldown: "year"` allows one proclamation per family each calendar year,
  checked across every crown policy sharing the `family`.
- `repeal: "proclamation"` means proclaiming another level replaces the
  standing one. A level with `protectedTerm: true` protects its charter for
  `balance.realmPolicyProtectedWorshipDays` (1440): leaving it early mirrors
  the unlawful privilege-revocation path (Popular support −10, a recorded
  `unlawful_privilege_revocation` mistreatment note, and organized faith
  opposition through `FB.addCollectiveOpposition`).
- Level fields, all optional: `name`/`icon`/`desc` (structured display
  fields, localized as `policy.<id>.levels.<index>.<field>`); `modifier`
  (a county modifier id applied while the level stands — omit `days` in the
  modifier def so the policy, not the calendar, ends it); `modifierScope`
  (`"all"` directly held counties, or `"minority"` for directly held counties
  whose faith relation to the realm religion is neither `same` nor
  `in_fold` — county faith itself is never rewritten); `privilege` (a
  `FBDATA.privileges` id recorded per affected county, holder type `faith`);
  `seasonPiety` (seasonal piety trickle); `researchFactor` (fractional change
  to the player realm's research rate); `migrationAttraction` (integer shift
  to the conserved migration draw of player-owned counties);
  `developmentGrowth: true` (each season,
  `balance.realmPolicySettlementDevChance` odds of +1 development to the
  least-developed held county below its cap).
- `onEnact` declares one-proclamation reactions: `piety`, `prestige`, `pop`
  (Popular support), `authority` (Crown Authority), `headFaith` (Standing with
  the realm religion's head realm), `sameFold`/`otherFold` (foreign Standing
  with every living sovereign realm, split by fold), `vassalSameFaith`/
  `vassalOtherFaith` (direct-vassal Standing by fold), and `mistreatment`
  (a `FB.notePoliticalMistreatment` kind, e.g. `religious_persecution`, which
  feeds the sanctuary-claim collective demand).
- Proclamation costs `balance.realmPolicyChangeCost` (20 gold) unless the def
  overrides `cost`. The royal-policy sheet shows every level, its effects,
  the exact blocked reason, and the protected-term warning.

Engine API (js/institutions.js): `FB.realmPolicyList()`,
`FB.realmPolicyLevelId(state, policyId)`,
`FB.realmPolicyMinorityCounties(state)` (read-only),
`FB.realmPolicyStatus(state, policyId, levelId)` (read-only gate),
`FB.realmPolicyProclaim(state, policyId, levelId)` (mutation),
`FB.realmPolicySummary(state)` (read-only UI projection),
`FB.realmPolicySync(state)` (modifier maintenance, run by the daily
institution pass), `FB.realmPolicySeason(state)` (main-tick piety and
development), `FB.realmPolicyResearchFactor(state, realmId)`, and
`FB.realmPolicySettlementAttraction(state)`. While Persecution stands, one
sustained `religious_persecution` mistreatment note is recorded per year.

Core content ships `religious_tolerance` (persecution → confessional
preference → tolerated minorities → protected worship) and
`settlement_policy` (closed settlement → licensed newcomers → encouraged
settlement), the standing county modifiers `persecuted_minorities`,
`tolerated_minorities`, `protected_worship`, `closed_settlement`, and
`encouraged_settlement`, the `protected_worship` faith privilege, and three
gated slot-day stories (`realm_policy_persecution_unrest`,
`realm_policy_settlers_arrive`, `realm_policy_refugees_shelter`) with their
`realm_policy_*` trigger and effect fns.

## Royal Council seats and rules

`FBDATA.councilSeats` and `FBDATA.councilRules` live in
`data/political_institutions.js`. A runtime mod may add a seat or replace a complete
same-id seat definition. The five core ids (`seneschal`, `constable`, `treasurer`,
`almoner`, and `chamberlain`) must remain present. `councilRules` is one atomic rules
record: when supplied, it replaces the complete effective record after validation.

```json
{
  "councilSeats": {
    "justiciar": {
      "name": "Justiciar",
      "icon": "⚖",
      "desc": "+5% taxes while this officer serves",
      "bonusKey": "tax",
      "bonusAmount": 0.05,
      "tierMin": 7,
      "holderEligibility": "direct_vassal"
    }
  },
  "councilRules": {
    "schemerTraits": ["ambitious", "deceitful", "proud"]
  }
}
```

Seat ids and `bonusKey` values are lowercase stable ids. `name`, `icon`, and `desc`
are required display fields; `bonusAmount` is a number from 0 through 100, and
`tierMin` is an integer player tier from 0 through 7. The first schema supports only
`holderEligibility:"direct_vassal"`. The rules record supports only
`schemerTraits`, an id list resolved against the effective trait table, including traits
declared by the same mod. Unknown fields, references, or enum values reject the whole mod
before mutation.

The generic engine exposes active definitions through `FB.councilSeats(state)` and
`FB.councilSeat(id, state)`. An added seat receives ordinary vacancy, appointment,
Standing, effectiveness, saved-holder, and `FB.councilBonus` behavior. A seat activates
when the player's tier reaches `tierMin`; inactive or missing definitions do not erase an
existing `state.council.seats[id]` value. Display text uses stable
`councilSeat.<id>.<name|desc>.default` localization keys and falls back to the effective
English definition.

The five core ids are also capability contracts. Treasurer, Constable, Almoner, and
Chamberlain retain explicit event, institution, and special-effect consumers addressed
by those ids. A new `bonusKey` participates in generic `FB.councilBonus` summation, but it
does not invent a special engine consumer by itself.

## Elections, privileges, and collective demands

`FBDATA.elections`, `FBDATA.privileges`, and `FBDATA.collectiveDemands` live in
`data/political_institutions.js`. Runtime mods replace complete same-id definitions under
the top-level `elections`, `privileges`, and `collectiveDemands` tables; nested arrays and
objects are not deep-merged.

An election declares its office, fixed term, gates, weighted constituencies, visible
rivals, and one-choice campaign tactics:

```json
{
  "elections": {
    "guild_officer": {
      "name": "Guild Officer Election",
      "icon": "🏅",
      "desc": "The masters choose an officer for a fixed term.",
      "kind": "guild",
      "office": "officer",
      "order": 0,
      "termDays": 1440,
      "campaignDays": 90,
      "nominationCost": 25,
      "defeatCooldownDays": 720,
      "requiredRank": "master",
      "stewardship": 10,
      "prestige": 60,
      "guildStanding": 45,
      "merchantLearning": 6,
      "electorates": [
        { "id": "masters", "name": "Masters' bench", "weight": 3,
          "base": 0.42, "standingRate": 0.004,
          "stewardshipRate": 0.025 }
      ],
      "rivals": [{ "id": "senior_master", "name": "The senior master" }],
      "tactics": {
        "canvass": { "name": "Canvass", "icon": "🗣", "desc": "...",
          "gold": 0, "guildStanding": 0, "authority": 0,
          "support": { "masters": 0.10 } }
      }
    }
  }
}
```

Core recognizes `kind:"guild"` for the `officer` and `guildmaster` career transitions,
and `kind:"council"` for the `treasurer` and `constable` confirmation ids. Electorate
`id` values must be unique within the definition; tactic `support` keys refer to those
ids. `base` and the optional standing, Stewardship, Diplomacy, Martial, prestige, and rank
rates build a clamped support chance. Council tactics may spend Crown Authority; guild
tactics may spend Guild Standing. On guild elections, `merchantLearning` adds both the
listed Learning minimum and the core Lettered requirement for Trade candidates; it does
not affect Craft candidates. Adding another kind or office requires matching engine code
even though replacing the four core definitions is data-only.

A privilege is a legal wrapper around one authoritative effect ledger:

```json
{
  "privileges": {
    "market_charter": {
      "name": "Market Charter",
      "icon": "⚖",
      "desc": "Measured tolls and protected stalls.",
      "order": 1,
      "requiresTech": ["urban_markets", "authenticated_seals"],
      "holderTypes": ["county"],
      "scopeTypes": ["county"],
      "rights": ["Protected market and measured tolls."],
      "exemptions": [],
      "obligations": ["Pay recorded upkeep."],
      "duration": "modifier",
      "revocation": "protected_term",
      "effect": { "kind": "modifier", "id": "market_charter" },
      "sourceEvents": ["optional_event_id"]
    }
  }
}
```

Supported effect kinds are `modifier` (an existing county modifier id),
`guild_monopoly` (the existing incoming/outgoing contract ledger), `obligation`
(`revocationConsent`), and `council_confirmation` (with a `seats` array). The effect
remains the sole mechanical calculation. The privilege record supplies stable holder,
grantor, scope, source, duration, and revocation provenance for saves and UI.
`sourceEvents` disambiguates two privileges that wrap the same modifier, as Sanctuary and
ordinary Levy Exemption do. Keep holder/scope values within `holderTypes` and
`scopeTypes`: `house`, `guild`, `county`, `faith`, and `institution` are the core holder
categories; `county` and `realm` are the core territorial scopes.
`requiresTech` optionally names one id or an all-of array. `FB.grantPrivilege` rejects a
new grant when the effective sovereign lacks it, while existing effect and privilege
records remain active. Collective demands pointing at a locked privilege are omitted
before queueing; a demand already pending is grandfathered.

A collective demand points at one privilege and one engine-registered pressure gate:

```json
{
  "collectiveDemands": {
    "commons_custom": {
      "name": "Petition of the Commons",
      "constituency": "commons",
      "privilege": "confirmed_custom",
      "order": 0,
      "minTier": 3,
      "maxTier": 7,
      "gate": "collective_demand_commons",
      "cooldownYears": 3
    }
  }
}
```

The `gate` names an `FB.fns` function returning `false` or a semantic
`{pressure,scopeId,reasons}` record. A pasted JSON mod can replace a core demand or point
to an already registered gate; a genuinely new gate requires a bundled mod that registers
the function. The annual driver queues at most the highest-pressure eligible demand.
Refusal creates bounded opposition and never creates a realm directly. Election campaigns,
terms, privilege records, and demands save definition ids, so changing these tables changes
the active mod fingerprint and intentionally prevents loading the life under a different set.

## Temporary modifiers

Runtime mods may add or replace complete records under the top-level `modifiers` key:

```json
{
  "modifiers": {
    "market_charter": {
      "name": "Market Charter",
      "icon": "📜",
      "desc": "A temporary grant encourages tolls and construction.",
      "scope": "county",
      "days": 720,
      "upkeep": { "gold": 1 },
      "fx": { "tax": 0.10, "buildingCost": -0.10, "unrest": -0.15 }
    }
  }
}
```

`name`, `icon`, `desc`, `scope`, and `fx` are required by convention. `scope` is
`"county"` or `"campaign"`. `days` is an optional positive day duration; omitting it
creates a record with no fixed turn expiry. `upkeep.gold` is an optional seasonal charge
and is paid only while the affected county is directly held. A later mod replaces a
same-id definition as one atomic record.

Supported county `fx` keys are fractional `tax`, `levy`, and `buildingCost`; flat
`commonVoice`; fractional `marketFlow`, `marketProduction`, and
`marketProvisions` for the commodity-market model; and fractional event-tag
keys such as `famine` and `unrest`. Supported
campaign keys are fractional `supplyUse`, `contribution`, `withdrawalPenalty`,
`marchSpeed`, `battleOdds`, and seasonal `desertion`. Campaign values affect only the
protagonist's valid participation in the active great holy war—never AI parties or an
ordinary-war modifier array.

County instances are saved as
`state.modifiers.county[provinceId] =
[{"id":"...","endTurn":123,"sourceEventId":"event_id"}]`; campaign instances use
`state.greatHolyWar.modifiers`. `sourceEventId` is optional and locale-neutral. The
event interpreter supplies it automatically for `addModifier`; direct system calls may
pass `{sourceEventId:"event_id"}` as the fourth `FB.addModifier` argument. Never save a
rendered source title. Do not write these arrays directly. Use:

- `FB.addModifier(state,id,pid?,options?)`,
  `FB.removeModifier(state,id,pid?,options?)`, and
  `FB.hasModifier(state,id,pid?)`
- `FB.countyModifierRecords(state,pid)` / `FB.campaignModifierRecords(state)`;
  read-only overview code may use `FB.countyModifierSnapshot(state,pid)`
- `FB.modBonus(state,key,pid)` / `FB.campaignModBonus(state,key)`
- `FB.modifierUpkeep(state,key?)`, `FB.modifierRemainingDays(state,record)`, and
  `FB.popEffective(state)`

Re-adding an id refreshes its catalog duration and semantic source without stacking.
County records remain with the county when ownership changes. Unknown saved ids and
malformed records are removed by additive save repair. Core definitions and the full
lifecycle are documented in `docs/designs/modifiers.md`.

Core ordinary-war content includes `conquered_without_right`, a timed county modifier
granted when an attacker captures the objective of a saved `aggression` cause. Mods may
replace its complete definition like any other modifier, but should preserve county
scope because capture passes the conquered province id and the declaration preview reads
its duration and effects directly.

`conquered_without_right` starts at −20 Popular support for 4,320 days. Its optional
`supportPerStack:-10` combines with the instance's nonnegative integer
`supportStacks` to increase only the support penalty. `aggressive_rule` uses the
same duration and per-stack amount with zero base support. Repeat no-claim
declarations add a stack in every county then ruled by the aggressor and refresh
the local expiry. `FB.modifierEffects(state,id,record)` projects the instance;
omitting the record projects base effects. `FB.addModifier` accepts an absolute
`options.supportStacks` value. War records retain `aggressionSequence` and realm
records retain `aggressionDeclarations`, so escalation survives history trimming.

## Buildings

Construction applicability

The bundled windmill building is a concrete example: data/buildings_wind.js keeps requiresTech:'windmill' and adds applicability:{yearMin:1150}. Completed knowledge before 1150 does not authorize a new Post Windmill. Another ordinary JSON building may choose different inclusive bounds; this changes construction permission, not research history or existing asset identity. Repairs and retained effects continue under the ordinary rules. The broad windmill technology uses its own attestation/adoption windows, independently of this building window.

A building may declare applicability with only yearMin, yearMax, eras, countyIds, cultures and traditions. Both year bounds are optional finite integers and inclusive. Lists must be nonempty, contain unique known string ids and resolve against the effective candidate catalogues, including additions in the same JSON mod. countyIds names physical county seeds in the province/geography tables, including additive geographies. A scenery county can be named but cannot receive construction until it is inhabited with an established target site. Unknown keys, unknown references, empty lists, duplicate values and reversed ranges are rejected by the same validator for bundled definitions and detached JSON candidates. An empty applicability object imposes no additional dimensions; omitting applicability preserves legacy behavior.

Dimensions combine with AND; members of each list combine with OR. yearMin/yearMax read the live campaign year. eras reads the stamped campaign era through campaignEra, independently of later calendar years or the currently selected fresh bookmark. countyIds reads the actual target county. cultures reads that county's current declared primary resident identity (population.counties[id].identity.culture), falling back to its province declaration only when no runtime identity exists. It does not read the ruler, the player's residence, a settlement minority or a required majority percentage.

traditions reads the construction payer through settlementActor and techRealmId, then techTraditionsForRealm. A landed realm uses its own sovereign; a private baron, including a player without a living territorial realm, uses the target county holder's sovereign. Vassal knowledge therefore follows the sovereign while resident culture stays local. Unresolved or invalid context blocks a scoped candidate without substituting the player's home or a default identity. Campaign-created cultures are valid resident identities but match culture lists only by exact id, never through ancestry; static lists can name registered cultures, including ordinary same-mod additions, rather than guessing future generated ids. Generated identities can still influence sovereign learning through the ordinary technology-tradition resolver.

FB.buildingApplicabilityStatus(state, countyId, buildingId, payer) returns derived ready, code and localized first reason fields; omitted payer means the player. It checks applicability only, while ordinary construction retains authority, site, technology, terrain, development, occupancy, limit and funding checks. Player construction, automation, annual realm AI, NPC barons, fort project funding and the Building Works requirement display share this projection. Confirmation reads live state before charging. It grants no physical suitability, production right or institutional authority. Standing assets keep their effects and upkeep, ruins keep their repair path and already funded fort projects finish normally after a window, culture or holder change. New fort projects and upgrades recheck applicability; repair does not. No applicability status or rendered reason is saved. Normal exact mod fingerprints include the declaration; restore never reseeds assets.

`FBDATA.buildings` (in `data/map_data.js`) defines what tier-3+ rulers can raise in any
province they hold with the "Raise a building…" deed — one of each per **settlement** of
a province:

```json
{ "buildings": { "bathhouse": {
  "name": "Bathhouse", "icon": "🛁", "cost": 50, "devMin": 3,
  "tax": 1, "desc": "Cleanliness, gossip, and a modest fee." } } }
```

- `cost` — gold (the Master Builder event discounts the next building by a quarter).
  Each further copy of the same building in the same county costs
  `cost × balance.buildingRepeatCostGrowth^(copies ever raised)`. Demolished ruins remain
  in that count, so demolition does not reset the price.
- Siting: `devMin` (province development), `coastal: true`, `terrains: [...]`,
  `homeOnly: true`, `maxCounty`, and `maxDemesne`. The last two limit standing copies;
  a ruin still occupies its settlement slot but no longer consumes the standing limit.
- Ongoing: `tax`, `piety`, `research`, and `upkeep` per season; `levy` men added to the
  muster. Upkeep is gold and is charged only while the building stands in the player's
  directly held demesne.
- War keys: `retinue` (professional men-at-arms) and `archers` — flat men mustered with
  the host as those classes, fighting at their own quality (see `balance.quality*` and
  docs/designs/war.md).
- One-time on completion: `dev`, `pop` (popular opinion), `prestige`.
- Demographic modifiers: `populationCapacity` (fractional carrying capacity boost, e.g. `0.05`),
  `populationFamineProtection` (mitigates famine losses, e.g. `0.35`), `populationCrisisProtection`
  (mitigates general crisis losses, e.g. `0.10`), `migrationAttraction` (integer migration attraction bonus, e.g. `1` or `2`),
  and `communityFaithPressure` (annual pressure for a same-faith project sponsored by
  the county's ruler).
- `name`/`desc` accept text tokens and religion-variant objects (see the Great {temple}).
- role: what the building is, one of fortification, milling, food_store, crossing, marketplace, worship, port, shipyard, scholarship, stronghold, garrison, training, civic, industry, care or banking. Authored buildings must declare it; the engine checks roles, never building ids. The requirement gate requires an explicit role on every effective building, including runtime-mod additions. Use unassigned explicitly for a decorative building without a specialized behavior role. Older read helpers retain their fort/unassigned fallback for legacy state. Exactly one building may have the fortification role, and fort must be set exactly when the role is fortification; mods that break either rule are rejected.
- aiBuildOrder: optional number ranking what AI rulers raise first (lower first); without it AI rulers never autobuild the building. settlementDraw: optional true for buildings that add weight to their settlement's share of county population growth.

constructionGroup is optional and has exactly two required fields: id (a lowercase letter followed by at most 63 lowercase letters, digits or underscores, excluding constructor and prototype) and maxCounty (an integer from 1 to 2048). All effective buildings with the same group id must agree on maxCounty; built-in validation and detached JSON imports reject malformed groups, unknown fields and inconsistent limits before publication. No group registry or saved group ledger is needed. For example, two different care buildings may both declare "constructionGroup": {"id":"care_foundations","maxCounty":1}, while a second independent group of workshops may allow two assets. Equal roles alone never imply exclusion.

The bundled hospital and hospice share care_foundation with maxCounty 1. hospice is a paid Charitable Guesthouse using role care, cost 55, upkeep 1, devMin 2 and populationCrisisProtection 0.03, with no discovery requirement or construction award. Existing excess assets retain effects and repairs. Library uses scriptoria and retains research 1; paper_scholarship is independent efficiency. The authoring fixture tests/e2e/fixtures/authoring/learning-and-care.json imports a codex room, paper collection and separate two-place guest-lodge group through these existing fields. These definitions grant no institutional or clinical authority and add no saved schema.

Group occupancy counts actual records across the whole physical county, including delegated settlements, standing buildings, ruins and funded fort foundations. The same county/type/site combination counts once. It adds to existing per-id county and personal limits; the shared FB.buildingConstructionGroupStatus(state, countyId, buildingId) projection reports ok, count, limit, remaining and a localized reason. The player, annual AI, autonomous barons and autoBuild use this gate and recheck at purchase. A fort upgrade or repair reuses its existing place. Existing over-limit assets retain their benefits and can be repaired, but new construction waits for room. Group eligibility is derived runtime data and never saved as prose.

Demolition of a grouped building, including an existing ruin, removes its physical record without a refund and frees group capacity. It also removes that copy from the ordinary repeat-price count, which is derived from remaining records. This is explicit in the confirmation. Ungrouped demolition retains its ordinary persistent ruin. No automatic replacement or upgrade transaction is introduced. Removal retains the canonical authority, development reversal, cache invalidation and population reconciliation rules. Trusted code that changes building definitions during a live campaign must invalidate the building index; ordinary mod activation and matching restore rebuild derived indexes from their effective definitions.

- Events gate on roles with buildingRoles / notBuildingRoles (the famine relief option requires a food_store), so a regional granary works without new event data.
- The `walls` id is reserved for the strategic fortification system below. It is excluded
  from ordinary building pickers, repeat pricing, the Raise ledger, and autobuild.

Built buildings live in `state.buildings` keyed by **province id**, each entry shaped
`{ s: settlementIndex, id, devGranted?, ruined? }` - conquest takes them with the land, and they pass to heirs
with it. `FB.builtIn` projects old bare id strings into the head settlement (`s: 0`)
without mutating them during reads; a later write in that county persists canonical
objects. `ruined:true` is created by permanent demolition: the entry keeps occupying its
slot and counting toward repeat prices, but supplies no benefit, upkeep, or event
requirement. Events can gate options or triggers on standing buildings
via `buildings` / `notBuildings` (the famine event's granary option, for example) — those
read demesne-wide through `FB.hasBuilding`.

For new construction with a one-time `dev` effect, `devGranted` freezes the amount that
actually fit below the county ceiling. Demolition reverses that exact amount. A missing
field on an older building is normally treated as zero so a current definition cannot
impose a retroactive loss on an old save. The one-time player-development migration is the
exception: counties directly held when the old save first loads are reset to bookmark
development plus every standing building's current `dev` effect, and those buildings gain
the corresponding `devGranted`. Ruins and AI-held counties are ignored. Player-direct
counties do not receive yearly random development drift; AI-governed counties retain it.
The built-in `dev:1` set is Watermill, Stone Bridge, Market Square, and Harbor. Granaries,
religious, learning, and military buildings use their own effects rather than contributing
economic development automatically.

### Strategic fortifications

`FBDATA.forts` configures the reserved `walls` asset. Runtime mods may provide a partial
top-level `forts` object; scalar keys replace their core value and `forts.levels` merges
by tier without dropping unspecified tiers. The shipped shape is:

```json
{
  "forts": {
    "baseSiegeSteps": 3,
    "garrisonStrengthRatio": 3,
    "seasonalAttritionRate": 0.15,
    "campaignStrengthLoss": 0.05,
    "holyWarDaysPerLevel": 90,
    "legacyLevel": 3,
    "legacyUpkeep": 1,
    "legacyGraceSeasons": 4,
    "aiWorksCap": 400,
    "levels": {
      "1": {
        "name": "Ringwork",
        "requiresTech": ["ringworks"],
        "cost": 120, "seasons": 2, "upkeep": 2,
        "garrison": 40, "siegeDelay": 1,
        "defense": 0.05, "prestige": 10, "work": 60
      }
    }
  }
}
```

Levels 1–4 must remain sequential because construction derives the next target as
`current level + 1`; `requiresTech` is an all-of list. `cost` is player gold paid up
front, `seasons` is exactly 90 days each, `upkeep` is seasonal player maintenance,
`garrison` is removed from deployable field levy, `siegeDelay` extends the three-step
ordinary siege, `defense` is local battle power, `prestige` is awarded once on
completion, and `work` is the AI-holder threshold.
`campaignStrengthLoss` is the ordinary player war-condition cost of an active fortified
pulse. The `legacy*` values govern old `walls` migration and its player maintenance grace;
`aiWorksCap` limits banked construction work.

Saved forts remain settlement building entries, but use
`{s,id:"walls",level,targetLevel?,completeTurn?,maintenanceGraceUntil?,ruined?}`.
Level 0 is unfinished and supplies no block, garrison, upkeep, or defense; an upgrade's
old `level` remains active beside its higher `targetLevel`. Siege records copy the tier
into `fortLevel`, so editing a live fort does not change an in-flight requirement.
Shared consumers should use `FB.fortAt`, `FB.fortAtSettlement`, `FB.fortBlocksArmy`,
`FB.fortSiegeStatus`, `FB.fortGarrisonBurden`, `FB.canStartFortProject`, and
`FB.startFortProject` rather than scanning `state.buildings`.

## Household holdings

`FBDATA.holdings` (in `data/map_data.js`) is the commoner's way of playing tall: family
property (tiers 0–2) bought with gold via the "Better the household…" deed. Owned ids live
in `player.holdings` and **persist across generations** — property passes to heirs:

```json
{ "holdings": { "fishing_boat": {
  "name": "Fishing Boat", "icon": "🛶", "cost": 40, "tierMax": 2, "careerRoles": ["labor"],
  "desc": "The sea pays no rent.", "fx": { "gold": 1.5 } } } }
```

- `cost` gold · gates: `tierMin`/`tierMax`, `professions`, `req` (prerequisite holding id).
  careerRoles gates on the roles of the household head's career; core holdings use it.
- `eventOnly: true` hides a holding from the Better the household picker; it can still
  be granted by an event's `holding` effect (the inherited Rights of Common use this).
- `fx` keys, summed by `FB.holdingBonus`: `gold`/`prestige`/`piety` per season, `battle`
  (added to the `battle` and `war_battle` chances), `edu` (children learn faster),
  `health` (lower yearly mortality).
- `name`/`desc` accept text tokens and religion-variant objects.
- Events can gate on `holdings`/`notHoldings` and grant or seize property with the
  `holding`/`loseHolding` effects (see `lord_covets_horse`).
- Purchased holdings with a positive `cost` may be offered as loan collateral. Set
  `pledge: false` when authored events can transfer the asset or its story requires it to
  remain freely disposable; `eventOnly` holdings are never pledgeable.

Freehold land is repeatable saved property rather than an authored holding definition.
Each `player.landPlots` entry is `{provinceId, settlement}`. Its economy is tuned through
`balance.landPlotCost`, `landPlotYield`, `landConsolidationBonus`, and
`landPlotMaxSettlement`; `manorPlotRequirement` plots in one settlement plus
`manorPrestige` standing qualify the household to claim that holding as a manor. The
Gentry rung in the rank-elevation arrays is charged only when the confirmation is
accepted. Land income
is inherited and appears in the seasonal ledger. Every plot at one settlement is offered
as a single pledged-loan collateral group; the contract freezes that group's count and
default removes up to that many matching plots. If fewer than `manorPlotRequirement`
remain beneath the declared manor, the manor and gentry station are lost.

## Maintained household standards

`FBDATA.householdStandards` (in `data/economy.js`, mod key
`householdStandards`) defines maintained living standards, ruler establishments, and
profession outfits. A same-id mod entry replaces the complete definition, including its
ordered level array:

```json
{
  "householdStandards": {
    "warm_hearth": {
      "name": "Hearth",
      "icon": "🔥",
      "kind": "general",
      "desc": "Fuel and fittings maintained above bare necessity.",
      "levels": [
        {
          "name": "Banked Fire",
          "desc": "Reduces yearly household mortality by 0.05 percentage points.",
          "cost": 12,
          "upkeep": 0.25,
          "tierMin": 0,
          "fx": { "mortality": 0.0005 }
        },
        {
          "name": "Tiled Stove",
          "desc": "Reduces yearly household mortality by 0.1 percentage points.",
          "cost": 50,
          "upkeep": 1,
          "tierMin": 1,
          "fx": { "mortality": 0.001 }
        }
      ]
    }
  }
}
```

- `kind` is `"general"`, `"ruler"`, or `"work"`. A work definition also requires
  `profession`, naming an id in `FBDATA.careers`. A ruler definition is active only at
  tier 3 or higher. Set `titleFloor:false` for a discretionary definition that rulers may
  reduce to baseline; core ruler establishments use this form.
- `levels` are sequential. `cost` is the one-time setup price to advance from the
  previous level; `upkeep` is the complete seasonal cost of the current level, not a
  cumulative sum. `tierMin` gates that level. Purchased levels remain active at ruler
  ranks; general standards cannot be reduced below the ruler's title floor.
- `requiresTech` gates purchase and normally also current activity. Set
  `grandfatherTech:true` on a level when an already purchased establishment should remain
  active after the household changes to a realm that lacks that technology.
- A work outfit is dormant without an adult resident family member practicing that
  profession (or another career with its role), or a matching retainer currently staffing an enterprise. Dormant levels
  keep their saved purchase but have no upkeep or effect.
- General and ruler `fx` keys are `mortality` (subtracted from yearly household mortality chance),
  `education` (added to yearly directed-learning chance), `retainers` (flat household
  capacity), `prestige` (per season), `travelCost` (multiplier on a new journey's whole
  upfront cost), `travelLegDays` (days per county leg, snapshotted at departure),
  `research` (flat national research per season), `domain` (flat domain capacity),
  `levy` and `retinue` (flat host composition), and `battle` (fractional player
  field-battle power).
- Work levels use `fx.work`, a fractional multiplier on matching vocational focus
  resources, resident-family wages or clerical yield, and staffed-enterprise output.
  It does not modify skills or combat. Multiple active mod definitions for one profession
  add their work fractions.
- `name`/`desc` on both the definition and each level are pure display fields and accept
  the usual text tokens and faith-variant objects. Core extraction keys use
  `householdStandard.<id>.levels.<zero-based-index>.<field>.<branch>`.
- Purchased levels live in the JSON-safe `player.householdStandards` map and pass through
  succession. They are not holdings or items and therefore cannot be sold, pledged, gifted,
  or referenced by holding event effects.
- If upkeep is unaffordable, core discretionary ids lapse first in this order:
  `luxuries`, `wares`, `transport`, `quarters`, `board`. Other general definitions follow
  in stable definition order, including ruler establishments, then active work outfits.
  Work outfits lose the highest active level first, with definition order breaking ties.

The public engine helpers are `FB.ensureHouseholdStandards`,
`FB.householdStandardLevel`, `FB.householdStandardLevelDef`,
`FB.householdStandardWorkerEligible`, `FB.householdStandardActive`,
`FB.householdStandardEffects`, `FB.householdStandardEffect`,
`FB.householdWorkMultiplier`, `FB.householdStandardUpgradeAvailable`,
`FB.buyHouseholdStandard`, `FB.reduceHouseholdStandard`,
`FB.householdStandardsUpkeepParts`, `FB.householdStandardsUpkeep`, and
`FB.householdStandardsSeason`.

## Careers and apprenticeships

`FBDATA.careers` (in `data/economy.js`, mod key `careers`) defines the work a
character can learn and perform:

```json
{ "careers": { "brewer": {
  "role": "craft",
  "name": "Brewing", "icon": "🍺", "skill": "ste",
  "apprenticeAge": 10, "apprenticeCost": 6,
  "wage": 1.5, "masterWage": 2.5, "guild": true,
  "ranks": {
    "apprentice": "Brewer's apprentice",
    "journeyman": "Brewer",
    "master": "Master brewer"
  },
  "desc": "Malt, barrels, and careful accounts."
} } }
```

- role is required and says what kind of work the career is: clergy, cloister, labor, craft, trading, arms, noble, learned or civic. Engine rules ask for the role, so the brewer above earns Craft's work focus, guild and monopoly rules, finance offers, dress and careerRoles events. The first career declared with a role is that role's default career (core: farmer for labor, noble for noble). An optional roles array adds secondary roles. A mod career without a known role is rejected. Data that names a career for work (an enterprise, work outfit or retainer office profession, a focus vocational and a tournament job career) accepts that career or any career with its role; work naming a learned career (learned:true) accepts only that career, because Administration, Medicine and Scholarship are distinct practices. Scripts can read FB.careerRole(state, character), FB.careerHasRole(state, character, role), FB.professionRole(id), FB.professionHasRole(id, role), FB.professionDoesWork(id, namedId) and FB.roleCareer(role); a role argument may be a list, which matches any of them.
- `skill` is trained during apprenticeship and occasionally during adult work.
- `apprenticeAge` / `apprenticeCost` gate a child's entry.
- `tierMin` can keep a career closed until the household reaches sufficient station.
- `requiresTech` optionally requires a completed technology in the household's effective
  sovereign nation. Training costs honor national `fx.costs.training` modifiers.
- `wage` / `masterWage` are seasonal contributions from resident non-player
  household workers who are not staffing an enterprise.
- `guild: true` enables member → master → officer → guildmaster progression.
  Core monopoly petitions are limited to careers with the craft or trading role; adding
  `guild:true` to a career with another role does not make it charter-eligible.
- `maleOnly: true` is reserved for historically sex-gated training such as arms.
- `religionGroups` limits a career to characters whose faith belongs to one of the listed
  groups; core Clerical Service uses `christian` and `muslim`.
- `piety` is a seasonal piety contribution from clerical careers (monk, priest).
- `hiddenChoice: true` keeps a career out of the player's chooser — it is entered only
  through an event or a marriage/background — though the household still works it.
- `learned:true` disables automatic age-sixteen and experience-based promotions.
  `literacyYears` is the number of active trainee years after which an illiterate
  character gains the core `literate` (Lettered) trait.
- `license` defines the first examination as
  `{id,name,toRank,age,years,skills,cost}`. The current engine expects
  `toRank:'journeyman'`; `skills` maps `mar`/`dip`/`ste`/`int`/`lea` to effective-skill
  minimums. Every learned examination also requires Lettered and the career's
  `requiresTech`.
- `specializations` maps permanent specialty ids to
  `{name,requiresTech?,years?,skills,cost,fx?,authoredWork?,guildRankMin?,guildStandingMin?}`.
  Learned careers use the examination fields (`years` and the normal examination gate)
  and promote a passing character to master. A non-learned guild path instead requires
  its configured `guildRankMin` (core Guildmaster), `guildStandingMin` (core 35), skills,
  technology, and its fixed fee; it is selected without chance. Core focus effects
  recognize `focusGold`, `focusStanding`, `focusPrestige`, and `focusResearch`; the
  medical household rule recognizes `mortality`. `fx.enterprise:{tags:[...],bonus:n}`
  applies only while the specialty holder staffs a matching enterprise, and
  `fx.tradeVenture:n` contributes to a venture's saved formation preview. `authoredWork:true`
  invokes the core Author treatise reward and should be used only with that intended
  content contract.
- The sustained life-path stories for the soldier, physician, scholar, and author
  careers live in `data/events_lifepaths.js` and use only ordinary trigger and
  effect keys plus the `lifepath_*` custom handlers; they add no new career fields.
- License and specialty `name` values are structured-data display fields. Specialty
  `requiresTech` values are validated and appear in reverse technology discovery.
- Owned character state lives in `character.career`; `player.profession` mirrors the
  current head's exact occupation for existing `professions` event triggers. Feudal station
  is separate: gaining land or a title does not erase a merchant, clerical, or military
  occupation. `FB.careerExamOptions` remains the learned-examination compatibility
  surface; `FB.careerSpecializationOptions` is the canonical read-only specialty
  surface and `FB.chooseCareerSpecialization` performs a live-revalidated guild
  induction. `FB.takeCareerExam` performs a learned attempt,
  `FB.careerSpecialization` resolves the saved specialty, and
  `FB.householdMedicalProtection` returns the single best locally present provider's
  yearly mortality reduction.

Religious ladders are the validated `religiousPaths` registry documented above, separate
from career rank labels. Unsupported faiths receive no routed ladder. Formal religious
offices may raise `character.station`; Abbot/Qadi and Chief Qadi use compatibility player
tiers and flags when the player deliberately advances through those ladders.

Catholic Bishop is a core personal office saved in `character.bishopric`, not an ordinary
career rank or province title. `FB.bishopricOf`, `FB.hasBishopric`,
`FB.installBishopric`, `FB.releaseBishopric`, `FB.bishopricIncome`, and
`FB.bishopricRetinue` are the public engine surface. A see-only player uses tier 3 for
compatibility, but office-aware actions and title rendering exclude generic barony powers.
The office is non-hereditary and may coexist with separately inherited secular land.

## Positions and household retainers

`FBDATA.positions` (in `data/economy.js`, mod key `positions`) defines an office held
alongside a character's occupation. Core positions are either earned appointments, such
as councilman and sergeant, or paid household service:

```json
{ "positions": { "reeve": {
  "name": "Reeve", "icon": "📜", "kind": "retainer",
  "profession": "merchant", "minTier": 2,
  "pay": 2, "quality": 2,
  "fx": { "gold": 0.5, "enterprise": 0.05 },
  "desc": "Keeps the household's rents and accounts."
} } }
```

- `kind` is `earned`, `retainer`, or `service`. Service positions supply localized
  names/descriptions for the protagonist's appointment in a patron's household;
  they do not activate `fx` or appear in the player's retainer hiring roster.
  An earned position is active while its matching
  `player.flags` id is true; a retainer position is active while a paid contract exists.
  positionRules.localCouncil requests locality validation against the existing player.localCouncil record. The councilman flag remains legacy compatibility state.
- `profession` optionally determines the career of a newly generated retainer. A family member fills the office when their career has that career's role.
  `minTier` and `maleOnly` gate hiring.
- `pay` is charged every season per retained character; `quality` weights generated
  candidates and defaults to 1.
- Supported `fx` keys are `gold` (seasonal household income), `enterprise` (fractional
  multiplier), `retinue` (flat levy retinue), and `tax` (fractional personal-tax
  multiplier).
- Retainers live in `player.retainers` as compact
  `{charId,office,pay,startedTurn,unpaid}` records. They can staff enterprises, serve as
  paid tutors, and use household equipment, but they are not family: they bring no
  family wage or piety, add no resident-family upkeep, and do not enter succession.
- Each household office has one holder. A retainer leaves after two unpaid seasons or
  when regard falls to −40; marrying the head ends the paid contract and moves the
  character into the ordinary spouse household.
- Capacity and the default contract economy are controlled by `retainerCapacity` and
  the `pay` values in the position definitions. Contracts pass to the next head, but
  personal friendship does not.

### Personal household service

The core `FBDATA.householdServiceRoles` table references position ids for display.
Each role defines `path` (`estate`, `letters`, `trade`, `arms`), `wage` and patron
surplus `value` per 90 worked days, two `training` skill ids, and a `skills`
minimum map. Optional `traitFit` maps known trait ids to signed numeric suitability
weights. Held traits contribute once each; their sum is clamped to −2…+2, then
added to each effective skill (with a zero floor) for appointment checks only.
Ordinary trait skill effects still apply through the effective skill. Missing
`traitFit` means zero adjustment; roles without skill minima remain open entry
jobs. Fit does not change wages, training, saved skills or an existing job's work
eligibility. `FB.householdServiceStatus(...).qualification` exposes `traitBonus`,
contributing `traits` (`id`, `amount`) and `skills` (`id`, `value`, `total`,
`required`, `met`) for read-only previews; acceptance rechecks current traits.
Optional `previous`/`days`, `standing`, `lettered` and `maleOnly` independently
govern appointment eligibility. householdServiceRoles is a runtime-mod root with complete records replaced by id. Service uses the existing toil handler contextually and the household_service choice-backed Deed. Reused senior retainer position ids supply
only their display name; their retainer `fx` do not accrue to the employee.

The event `household_service_duty` uses `household_service_valid` as its context
validator. Its `serviceSerial`, `serviceCase`, `serviceCharId` and
`serviceEmployerId` must match the active personal appointment; `servicePath`,
`serviceOffice` (a position data descriptor) and `servicePatron` (a proper name)
are display parameters. Owning custom effects `household_service_careful`,
`household_service_kind` and `household_service_routine` resolve that case once.
Ordinary mods may replace the event's display content without weakening this
lifecycle check. No new generic effect or trigger key is introduced.

### Local council motions

`FBDATA.localCouncilMotions` (mod key `localCouncilMotions`) defines the complete choices
available to a seated Town Councilman. Mods add or replace whole definitions by id:

```json
{ "localCouncilMotions": { "fair_measures": {
  "name": "Fair Measures", "icon": "⚖️",
  "desc": "Standard weights and measures encourage honest trade.",
  "fx": { "enterprise": 0.10 }
} } }
```

`name` and `desc` are localized display fields. `icon` is cosmetic. A motion's `fx`
supports `gold` (flat seasonal household income), `enterprise` (fractional enterprise
income), and `retinue` (flat household soldiers). The core action always applies one
passed ordinance for 360 days and replaces any prior ordinance; duration and voting
formula are engine rules rather than per-definition schema.

### Feudal service charters and tenure

`FBDATA.feudalServiceCharters` (mod key `feudalServiceCharters`) defines outgoing terms
shown when the player grants a county or duchy:

```json
{ "feudalServiceCharters": { "customary_service": {
  "name": "Customary Service", "icon": "📜",
  "desc": "Balanced rents and ordinary host service.",
  "taxShare": 0.20, "levyShare": 0.15,
  "standingBonus": 0, "breakawayMultiplier": 1,
  "extraordinaryTaxExempt": false
} } }
```

`taxShare` and `levyShare` are true fractions of the affected counties' ordinary tax
and levy bases. `standingBonus` is added to the normal +40 new-vassal Standing;
`breakawayMultiplier` scales the existing yearly breakaway chance; and
`extraordinaryTaxExempt` removes the realm from the Extraordinary Taxes deed. `name`
and `desc` are localized display fields, and `icon` is cosmetic. Keep
`customary_service`: callers and old saves without explicit terms deliberately default
to that id.
`requiresTech` optionally names one technology id or an all-of array. The grant picker
keeps a locked charter visible and `FB.grantCounty` / `FB.grantDuchy` recheck it before
mutation. Existing saved `feudalContract` records do not recheck technology.

Tenure is an engine-defined separate argument to `FB.grantCounty` and `FB.grantDuchy`:
`hereditary`, `life`, or `term`. Both helpers retain their older call signatures; mods
may optionally pass `(charterId, tenure)` after the existing arguments or supply those
two keys in an options object. Direct player vassals then save
`feudalContract:{liegeId,charterId,tenure,grantTurn,expiryTurn,renewal}`.
Hereditary has no expiry, life reverts at the ruler's death, and term reverts at death
or after 3,600 days unless the final-90-day renewal is accepted. These records are a
player-outgoing system; authored bookmark realms and AI-to-AI vassals do not require or
simulate a charter.

## Childhood schooling

`FBDATA.schooling` (in `data/economy.js`, mod key `schooling`) defines recurring
instruction arrangements:

```json
{ "schooling": { "grammar_school": {
  "name": "Grammar School", "icon": "📚",
  "cost": 1, "chance": 0.5, "tierMin": 1, "devMin": 2,
  "focuses": ["dip", "ste", "lea"],
  "annualMortality": 0.01,
  "annualEvents": ["grammar_prize", "grammar_debate"],
  "desc": "Letters, figures, rhetoric, and law."
} } }
```

- `cost` is base gold charged at each 90-day season boundary before national
  training-cost modifiers.
- `chance` is the full four-term yearly chance of gaining the directed focus skill,
  before household education bonuses and the global cap.
- `tierMin` optionally requires that minimum household tier (0 Serf through 7 Emperor).
- `devMin` optionally requires that development in the home county.
- `focuses` optionally limits the education focuses the school can teach.
- `requiresTech` optionally requires completed technology in the household's effective
  sovereign nation.
- `annualMortality` optionally adds a full four-term mortality probability at New Year.
  Risk scales linearly with completed terms (`annualMortality × terms / 4`) and resolves
  before education and coming-of-age.
- `annualEvents` optionally lists queued event ids. When a student’s general formative roll
  misses, their surviving institutional terms may substitute one of these stories with
  probability `min(1, terms / 4)`. If that roll also misses, the general story remains their
  annual fallback.
- `name`/`desc` accept the same localization tokens and faith-variant objects as
  other structured data.
- The built-in `master` id is special: its chance comes from the attached tutor
  character's focused skill rather than a fixed `chance`.
- Current instruction lives in `character.edu.school`; the accumulated value of
  completed learning terms lives in `character.edu.lessonBoost`. Completed institutional
  terms also accumulate by schooling id in `character.edu.schoolTerms`; missed fees do not
  add exposure, switching schools does not erase it, and the New Year pass resets consumed
  entries. Missing maps in old saves are treated as empty.

General formative events declare `educationStory:true` and may add a non-empty, unique
`educationFocuses` array drawn from `dip mar ste int lea`; omitting it makes the event eligible
for every focus. The mod loader rejects other `educationStory` values, malformed focus lists,
unknown student skills or traits, and empty or extra fields in `effects.student`. Each eligible
resident child or grandchild with completed terms reserves one annual story. That student’s
terms roll first for
`min(balance.educationStoryChanceCap,
terms × balance.educationStoryTermChance)`. Their focus is term-weighted, and unseen
eligible events are preferred per student before the pool recycles without an immediate repeat.
Only when that roll misses may `annualEvents` replace the general story. The reserved records
are spread through the following 360-day year and release at most one event per day.
Completed focus terms live in `character.edu.storyTerms`; history lives in
`character.edu.storiesSeen` plus `character.edu.lastStory`. Old saves need no migration because
all three records are created lazily. The default pacing values are `0.80` and `0.15`.
Core formative stories use three options: two 65% trait-shaping attempts with a skill-loss risk,
then a 35% option whose only possible mechanical result is a single skill gain. That three-option
balance is authored event content rather than an additional schema requirement for mods.

## Family enterprises

`FBDATA.enterprises` (in `data/economy.js`, mod key `enterprises`) defines repeatable
productive property:

The bundled Fishing Boat keeps fishing_boat_business and its ordered saved upgrade levels. Its source-level requirements supplement, data/economy_maritime.js, selects coastal_piloting for purchase, harbor_works for the decked upgrade and naval_levies for the flotilla. It composes requirements only; unchanged display fields remain in data/economy.js. Ordinary JSON uses complete enterprises records with these same fields and validators, without a supplemental mod root or any-of requirement language. The independent maritime-mediterranean.json and maritime-nordic.json examples under tests/e2e/fixtures/authoring configure different paid facilities and staffed businesses through the normal building and enterprise consumers. Existing property remains owned and effective when its current purchase requirement is missing; future purchases and upgrades recheck their exact live requirement.

```json
{ "enterprises": { "brew_house": {
  "name": "Brew House", "icon": "🍺", "cost": 70,
  "profession": "brewer", "yield": 3, "devMin": 2,
  "guildRank": "member",
  "laborPay": 1.5,
  "upgrades": [
    {
      "name": "Brewing Yard", "desc": "Supports local growth.",
      "cost": 240, "staff": 2, "requiresTech": "improved_furnaces",
      "fx": { "populationCapacity": 0.02 }
    },
    {
      "name": "Great Brewery", "desc": "Draws workers to the county.",
      "cost": 720, "staff": 3, "requiresTech": "powered_mills",
      "dev": 1, "fx": { "migrationAttraction": 1 }
    }
  ],
  "desc": "A public brew-house staffed by a trained household member."
} } }
```

- `profession` identifies eligible workers; resident family and paid retainers with
  that career, or another career with its role, may staff the enterprise only while their resolved residence is the
  enterprise province. `guildRank` optionally sets the minimum guild rank.
- Siting gates are `devMin`, `coastal`, and `terrains`, matching building gates.
- `requiresTech` optionally requires a completed technology in the household's effective
  sovereign nation. Purchase costs honor national `fx.costs.enterprise` modifiers.
- `tags` is an optional array of plain category ids. It has no saved instance effect by
  itself, but enables a matching career-specialization `fx.enterprise` bonus.
- `chainFrom` optionally names another enterprise type that feeds this one: while at
  least one household enterprise of that type produces in the same province, this
  enterprise's yield grows by `balance.enterpriseChainBonus`.
- `yield` is the base seasonal gold before worker skill, local development, guild
  rank, and any matching active guild-monopoly percentages modify it. Incoming and
  outgoing percentages add, capped at +50%.
- `laborPay` is the first and recurring seasonal wage for a locally hired enterprise
  worker. Hired workers are generated with the required profession and guild rank, remain
  tied to this enterprise, and consume no retainer capacity.
- `upgrades` is an ordered expansion path. Each entry requires `name`, `desc`, `cost`, and
  `staff`; `requiresTech` and `dev` are optional. Construction does not modify `yield`.
  Supported `fx` keys are `populationCapacity`, `famineProtection`,
  `populationCrisisProtection`, `migrationAttraction`, `levy`, `retinue`, `retainers`,
  and `prestige`. Effects accumulate through completed levels but apply only while all
  current staffing positions are filled. `dev` is granted once on the first fully staffed
  season for that level. Do not author a `gold` upgrade effect.
- Instances live in `player.enterprises` as
  `{uid,type,provinceId,settlement,workerId,workerIds?,workerLocked?,level?,devAppliedLevel?}`.
  `workerId` remains the first assignment and `workerIds` is present for multi-person
  staffing. Optional `workerLocked:true` reserves all valid current pairings from batch staffing; missing or
  false means unlocked. One type may stand once per settlement, but the family may own
  further copies elsewhere; repeat cost grows by `balance.enterpriseRepeatCostGrowth`.
- An idle, partially staffed, or invalidly staffed enterprise earns nothing and supplies
  none of its upgrade effects.
- `FB.enterpriseAvailable(state, provinceId, settlement, includeTechLocked?)` and
  `FB.acquireEnterprise(state, type, provinceId, settlement, opts?)` accept an explicit
  site; the legacy local-site availability and buy calls remain valid. Acquisition uses
  the same normal availability and resident-worker checks at the specified site.
- Runtime normalization removes the affected assignment and `workerLocked` when a worker dies,
  leaves the household or enterprise province, becomes career/guild ineligible, or is
  manually replaced or unassigned. Valid locks survive saves and succession.
- The core staffing preview optimizes all unlocked staffing positions together against all
  eligible household workers. Paid enterprise labor and locked or protected assignments
  remain fixed. It maximizes `FB.enterpriseYield` rounded to thousandths,
  preserves current pairings on a yield tie, then uses stable enterprise UID and
  character ID order without RNG. Unstaffed rows report locale-neutral
  `no_eligible_worker`, `eligible_workers_locked`, or `allocated_higher_yield`.
  Applying a preview requires its current signature and therefore rejects stale plans.

## County commodity markets

`FBDATA.marketGoods`, `FBDATA.marketEndowmentTypes`, and
`FBDATA.marketEndowments` live in `data/markets.js`. Runtime mods use the matching
top-level keys. Each supplied table is a **complete atomic replacement**, not a merge:

```json
{
  "marketGoods": {
    "provisions": {
      "name": "Provisions", "icon": "🍞", "order": 0,
      "desc": "Food and ordinary drink."
    }
  },
  "marketEndowmentTypes": {
    "grain": {
      "name": "Grain country", "icon": "🌾",
      "production": { "provisions": 0.25 },
      "flow": {},
      "desc": "Arable country raises local food supply."
    }
  },
  "marketEndowments": {
    "duchies": { "ile": ["grain"] },
    "counties": {
      "london": { "add": ["luxury_entrepot"], "suppress": [] }
    }
  }
}
```

- Goods ids are the saved vector identities. `order` determines mechanical and UI
  vector order; `name` and `desc` are structured localized data fields.
- An endowment type may define finite `production` and `flow` fractions from 0 through 2,
  keyed by goods id. Regional rows use stable duchy/county ids and known endowment ids.
  Duchy tags apply first; a county's `suppress` removes them and `add` then contributes
  exceptional tags. Production bonuses add but clamp at
  `balance.marketProductionBonusCap` (core 0.40).
- Before applying any supplied market table, the loader validates all three effective
  tables together. Unknown goods, types, duchies, or counties and malformed arrays/maps
  reject the mod before definitions or save state change. After a valid complete
  replacement, `state.market.goods` remaps stock, price, and flow arrays by stable id;
  removed baskets disappear and new baskets begin at price 1 with a two-season reserve.
- `marketBasket:{"provisions":0.7,"wares":0.3}` is optional on tangible holdings,
  items, enterprises, buildings, household-standard definitions or levels, and other
  callers of `FB.marketCostQuote`. Weights are relative and need not sum to 1. Unknown
  ids are ignored; no valid positive weight means multiplier 1, preserving untagged mod
  content. One-time purchases pass `"up"` rounding; recurring upkeep does not.
- A runtime/event market shock accepts stable `id`, optional `provinceId`/`goodId`,
  signed `production`, `demand`, and `flow` fractions, `severe`, and `remaining` or
  `seasons`. Fractions normalize to -1…2, invalid ids are rejected, and reusing an id
  replaces rather than stacks the shock. In event data `provinceId:"home"` targets the
  household county and `"context"` resolves the queued location.
- Market tunables are `marketReserveSeasons`, `marketEdgeCapacity`,
  `marketStockScale`, `marketProductionBonusCap`, `marketPriceSeasonMove`,
  `marketPriceNormalMin/Max`, `marketPriceCrisisMin/Max`,
  `marketHardshipMortalityStep/Cap`, and `marketCorridorCapacityBonus` /
  `marketCorridorReturnBonus`. `marketFlowPasses` documents the core value 2, but the
  engine deliberately always runs exactly two synchronous passes.

Guild-monopoly save records remain engine-owned contracts. Existing broad records need
no changes. Optional typed fields are:

```json
{
  "mode": "craft|local|corridor",
  "goodId": "wares",
  "originId": "london",
  "destinationId": "bruges",
  "route": ["kent", "bruges"]
}
```

`craft` is valid only for a Craft profession and wares/materials/transport output;
`local` and `corridor` are valid only for Trade. A corridor requires a real contiguous
route ending at `destinationId`. Malformed optional fields on a loaded legacy record are
discarded while its broad frozen contract survives. New issue/petition calls reject an
invalid typed scope before charging, granting, or replacing a slot. Exact `contractId`
remains the intrigue identity. See `docs/designs/markets.md`.

## Overland travel

`FBDATA.travelPurposes` and `FBDATA.travelSites` live in `data/travel.js`;
runtime mods use the `travelPurposes` and `travelSites` keys. Purpose ids replace
by key, and site objects replace by their required stable `id`.

```json
{
  "travelPurposes": {
    "embassy": {
      "name": "Private embassy", "icon": "🕊",
      "desc": "Carry a message to an authored court.",
      "cost": 4, "mode": "sites", "minTier": 1, "maxTier": 5,
      "repeatable": true
    }
  },
  "travelSites": [
    { "id": "embassy_paris", "purpose": "embassy", "provinceId": "paris",
      "religionGroups": ["christian"] }
  ]
}
```

- A purpose carries localized `name`/`desc`, optional `icon`, added upfront
  `cost`, and one destination `mode`: `sites`, `developed` (with `minDev`),
  `capitals` (the current capitals of living realms), `foreign` (every
  reachable settled county of another culture, nearest first, capped at
  `balance.travelExpeditionMaxDestinations`), or `frontier` (every wasteland
  bordering a reachable settled gateway county — the route is settled-only
  until one final wasteland leg, and the departure snapshots
  `travel.frontier = {"gatewayId","holderId","sovereignId","charId","milestones"}`).
  The frontier mode is the commoner homestead path: arrival begins the
  ordinary destination stay but admits only `travel:{"kind":"work",
  "purpose":"frontier"}` stories, whose work options advance saved milestones
  through the `frontier_milestone` handler. `FB.frontierSettlementEligible`
  requires the one-year residence plus `balance.frontierMilestonesRequired`
  milestones; `FB.frontierSettle` converts the wasteland through the shared
  `FB.materializeWasteland(state, pid, {culture, religion, holderId, ownerId})`
  helper — the same physical conversion the `settle_waste` deed uses — then
  relocates the household through the ordinary settlement cleanup and grants
  `balance.frontierSettlementPlots` starter land plots at the county head.
  `frontier_leave_ready` (option `require`) and `frontier_go_home` back the
  persist-or-turn-back story.
- The core `trade` purpose retains its embedded `cost`/`stake` only for direct
  compatibility calls. The player-facing flow reads stake, market threshold,
  timing, outcomes, and modifiers from `finance.tradeVenture`.
- Optional `minTier`/`maxTier` bound rank access. With neither field, an
  existing mod purpose keeps the historical freeholder/gentry range (1–2).
  Supplying either field opts into an explicit range; the omitted lower bound
  is 1 and omitted upper bound is 7. Serfs remain unable to travel.
  `FB.travelEligible(state, purposeId)` applies those gates, while the
  no-purpose call preserves its tier-1/2 compatibility behavior.
- Optional `repeatable:true` permits revisiting a completed destination.
  Optional `targeted:true` removes the purpose from the generic county picker
  for a purpose-specific character or object flow. Core relationship visits
  use `FB.socialVisitPreview`/`FB.socialVisitStart`; other targeted purposes
  need their own UI and start integration.
- A site carries `id`, `purpose`, and `provinceId`; optional `religions` and
  `religionGroups` restrict it to the traveler’s faith.
- Routes use settled, non-wasteland adjacency. Entries in `straits` therefore
  work as travel crossings too.
- `FB.travelCost(purposeId, routeOrLegs)` remains the unmodified compatibility
  calculation. Passing a state as the optional third argument applies active household
  transport; `FB.travelLegDays(state)` supplies the matching leg duration. Departure
  stores both cost and leg duration so later data or household changes do not alter a
  journey already underway.
- `FB.travelRouteOverhead(routeOrLegs, state)` prices only the route. The shared
  `FB.developedMarketDestinations(state, minDev, opts)` helper supplies settled,
  reachable choices to both ordinary travel and self-founded venture setup.
- Travel events are normal event objects with `trigger:{"never":true}` and
  top-level `travel:{"kind":"culture|road|capstone|decision|work"}`. A capstone
  or work event may add `"purpose":"id"`. Culture/road events are drawn without
  repetition up to the journey caps; destination work events repeat but never
  immediately repeat the last story. A work event may add `minTier`/`maxTier`
  inside `travel` to separate commoner work from ruler guest-residence stories,
  and `"contract":true` / `"contract":false` to exist only while a mercenary
  contract is served on the journey or to stand down for its duration.
  The core driver queues a purpose's capstone
  by the id `travel_capstone_<purpose id>`.
- A paid-service arrival at a warring realm's capital instead queues
  `travel_capstone_mercenary` for a working soldier (journeyman or master).
  Accepting saves `travel.contract = {"realmId","startedTurn","paidSeasons","renewals"}`
  on the journey record. The destination-stay tick pays
  `balance.mercContractSeasonPay` per crossed season, queues
  `travel_merc_contract_complete` once after `balance.mercContractSeasons`,
  and queues `travel_merc_contract_peace` once if the patron's war ends or the
  realm dies mid-term. The contract handlers are `merc_contract_accept`,
  `merc_contract_ongoing` (the renewal option's `require`), `merc_contract_collect`
  (final purse plus the once-per-life Company Standard), `merc_contract_renew`,
  and `merc_contract_release`. Coming home by any route settles the record:
  a served-out term pays `balance.mercContractCompletionGold`; an abandoned term
  costs `balance.mercContractAbandonStanding` with the patron realm. Contract
  event text may quote the frozen `{mercPay}`, `{mercSeasons}`, `{mercPurse}`,
  and `{mercServed}` context values and the `{rname}`/`{rulername}` patron.
- The expedition capstone's recording option uses `travel_expedition_record`,
  which writes the once-per-life Travel Journal through the ordinary item grant
  and then performs the ordinary capstone completion.
- Core trade-capstone settlement uses `travel_trade_cautious`,
  `travel_trade_bold_success`, and `travel_trade_bold_failure`; these scale the
  selected accompanied stake and then perform the ordinary capstone completion.
  `travel_capstone_done` remains the generic unscaled completion handler.
- `balance.travelLegDays`, `travelCooldownDays`, `travelCultureEventCap`, and
  `travelRoadEventCap` tune the road. `travelMinStayDays`,
  `travelWorkEventMinDays`, `travelWorkEventMaxDays`, `travelSettleOfferDays`,
  and `travelSettleWorkEvents` tune destination life and permanent settlement.
  `travelExpeditionMaxDestinations` bounds the foreign-mode destination list;
  `frontierMilestonesRequired` and `frontierSettlementPlots` tune the frontier
  withdrawal's settlement gate and starter homestead;
  `mercContractSeasons`, `mercContractSeasonPay`, `mercContractCompletionGold`,
  and `mercContractAbandonStanding` tune the mercenary contract.

## Finance contracts

`FBDATA.finance` (in `data/economy.js`, mod key `finance`) defines the three
player-originated loan families, passive trade partnerships, and self-founded ventures:

```json
{ "finance": {
  "pledge": {
    "maxPrincipal": 400, "markup": 0.25, "termSeasons": 4,
    "collateralRatio": 0.70, "lender": "moneychanger",
    "defaultKind": "collateral"
  },
  "tradePartnership": {
    "termSeasons": 4, "risk": 0.25, "profitShare": 0.45
  },
  "tradeVenture": {
    "stakes": [10, 20, 50],
    "treasuryStakeShare": 0.10,
    "activeLimit": 1,
    "minDevelopment": 4,
    "timing": { "minimumDays": 90, "preparationDays": 30 },
    "outcomes": {
      "cautious": [
        { "below": 0.10, "outcome": "loss", "multiplier": 0 },
        { "below": 0.30, "outcome": "partial", "multiplier": 0.75 },
        { "below": 0.95, "outcome": "profit", "multiplier": 1.25 },
        { "outcome": "exceptional", "multiplier": 1.60 }
      ],
      "bold": [
        { "below": 0.25, "outcome": "loss", "multiplier": 0 },
        { "below": 0.40, "outcome": "partial", "multiplier": 0.50 },
        { "below": 0.93, "outcome": "profit", "multiplier": 1.70 },
        { "outcome": "exceptional", "multiplier": 2.75 }
      ]
    },
    "modifiers": {
      "stewardshipDivisor": 200, "guildDivisor": 2,
      "tradeHouse": 0.03, "householdBonusCap": 0.20,
      "destinationDevelopmentDivisor": 100,
      "destinationDevelopmentCap": 0.08,
      "routeRiskPerLeg": 0.006, "routeRiskCap": 0.12
    }
  }
} }
```

- `markup` is the total fixed markup signed into the face, not an annual rate.
- `termSeasons` sets the season-boundary maturity. `maxPrincipal` caps an offer
  after reliable-income, collateral, reputation, and outstanding-debt capacity.
- `defaultKind` is `collateral` (take the named pledge) or `revenue` (assign the
  configured share of regular revenue until paid).
- `collateralRatio` caps a pledged principal against the asset's base value.
- Core pledged collateral comprises unassigned positive-value items, positive-cost
  non-event holdings without `pledge:false`, and each complete settlement group in
  `player.landPlots`. Maintained household standards and enterprises are excluded.
- A trade partnership consumes `risk` once at maturity; `profitShare` sizes the
  profitable return. The resolved roll and payout are stored in the save.
- `tradeVenture.stakes`, `activeLimit`, and `minDevelopment` control formation.
  `treasuryStakeShare` (default 0.10, clamped to 0–1) adds a whole-coin stake based
  on current positive gold when it exceeds the largest standard stake. Standard
  stakes remain available; this also applies to return cargo.
  Duration is the larger of `timing.minimumDays` and
  `timing.preparationDays + round-trip route days`.
- Each ordered outcome band applies when the formation-adjusted roll is below
  `below`; the final band omits `below`. For a commodity venture, `multiplier` applies
  to purchased quantity at the live destination price, while delivered stock is capped
  at the original quantity. A legacy record without `goodId` applies it to the stake.
  Formation snapshots every modifier and the selected bands into the investment.
- Stewardship contributes `skill / stewardshipDivisor`; merchant/craft guild
  privilege contributes `(FB.guildIncomeMultiplier - 1) / guildDivisor`; a
  Trading House adds `tradeHouse`; national `trade` technology adds its scalar
  bonus. Those household terms cap at `householdBonusCap`. Destination development
  then adds `development / destinationDevelopmentDivisor` up to its cap, while
  route length subtracts `routeRiskPerLeg` per one-way county leg up to its cap.
- Self-founded ventures do not read `requiresTech`. Transport modifies route
  overhead and leg duration only, never a configured stake. Dispatched ventures
  use exact-day resolution; passive partnerships retain season-boundary maturity.
- Finance and price bounds, pressure, loan count, capacity, arrears, default,
  revenue-share, and coinage tunables are the `price*` and `finance*` keys under
  `FBDATA.balance`.
- Household and education costs/chances use the `household*` and `education*`
  balance keys. Personal relationships use `socialAttentionCapacity` (core 1),
  `socialAttentionDailyOpinion` (fixed Standing per ordinary day; core 0.2),
  `relationshipOpinionThreshold` (shared Call friend / proposal gate; core 40),
  `marriageCultureStandingPremium` (extra proposal Standing for a partner of a
  different culture; core 20), `marriageFaithStandingPremium` (extra proposal
  Standing for a partner of a different faith; core 30),
  `socialGiftCooldownDays` (one explicit cash or item gift per recipient; core 90),
  `socialCashGiftOpinion` (core 4), and the three-entry `socialItemGiftOpinion`
  array (core `[4,8,12]`). `rankAccessInfluenceMult` (core 0.5) multiplies
  cultivation and gift Standing for every target station beyond ordinary one-rank reach;
  `rankAccessCashCostMult` (core 2) multiplies cash gifts and bought-access intrigue costs
  across the same gap. Warm contacts at the exact intervening stations open higher access.
  Ruler cash gifts use
  `rulerCashGiftCostByRank` (rank-indexed core `[0,10,15,25,40]`) and
  `rulerCashGiftOpinion` (core 15). Character and ruler recipients use separate saved maps,
  but each recipient's cash and item choices share `socialGiftCooldownDays`; ruler entries
  are generation-stamped, and Council gifting uses the same ruler clock.
  `friendOpinionThreshold` is a deprecated fallback for older data sets; new mods should
  define the shared relationship threshold. Wedding and authored event gifts do not use
  the explicit-recipient cooldowns. Other Network
  tunables include `retainerCapacity`, `guildFavorStandingCost`, `guildFavorCooldown`,
  `guildStandingYearlyGain` (repeatable annual Standing for an active adult guild
  vocation), and `guildStandingMax` (the cap for that renewal),
  `vassalLevyFavorRate`, and `vassalLevyFavorDays`. `guildMonopolyTerms` maps grantor
  tiers `3`–`7` to `{years,enterpriseBonus,rulerFee,taxBonus,popularOpinion}`. A new
  charter copies those numeric values into its save record, so a later mod or balance
  edit does not rewrite an active charter.

### Bounded auction lot families

`FBDATA.auctionLotTypes` (in `data/economy.js`, mod key `auctionLotTypes`) owns
selection weights and optional all-of technology requirements for the three engine-backed
lot families:

```json
{ "auctionLotTypes": {
  "item": { "weight": 6 },
  "enterprise": { "weight": 3 },
  "claim": { "weight": 1, "requiresTech": "notarial_contracts" }
} }
```

`weight` is a finite non-negative number. A zero-weight family is never selected.
`requiresTech` accepts one id or an all-of array and controls only new lots; an already
opened saved auction is grandfathered through resolution. Enterprise candidates also
retain each enterprise definition's own `requiresTech`. The supported ids are exactly
`item`, `enterprise`, and `claim`; adding an id is rejected because a new family also
needs engine selection, validation, award, label, and save behavior.

## Settlements

Each settled county exposes 2–8 settlement slots through **authored presentations plus
deterministic generated fallback**. Two identities exist: the numeric slot (the saved
reference for buildings, land plots, manors, and enterprises) and the physical *site*
(a globally stable slug with one longitude/latitude, derived world data that never
enters a save). `FB.settlementsOf` returns the currently visible records as
`{site, name, kind, x, y, authored}`; the visible count follows the legacy rule
(2 + a plain hash bit of the province id, never the seeded RNG, +1 at dev 3/5/7/9) raised to
the curated (non-`fill`) authored count, and generated names still come from
culture-flavored parts in
`FBDATA.settlementNames` (in `data/cultures.js`; the `settlementNames` mod key merges
per-culture sets, `default` covers the rest). Size follows current development — the
head grows village → town → city at dev 4/7, the second place becomes a town at 6 —
never below an authored baseline kind. The "Go into town…" deed lists them and queues
`visit_village` / `visit_town` / `visit_city` — ordinary event data whose options are
`require`-gated by tier, profession, and faith, with the chosen settlement's name in
`{settlement}`. Replace those events to change what a day in town offers.

**Real-world fill.** The shipped `data/settlements_real.js` is a generated file
(`tools/settlement_import.py`, run manually — never at build or runtime) that appends
GeoNames-derived presentations after the curated lists of `data/settlements.js`
with `fill: true`: real names and locations for every slot the curated data does not
cover, including a county-head entry named after the county itself, without forcing
early visibility. Curated entries always win; where the geodata has too few named
places (steppe, desert, tundra), the remaining slots keep generated names.
Modern numbered administrative labels ('Paris 16 Passy') are cleaned to the
historical name they embed ('Passy'); labels with no historical reading are
dropped for the next real place. Where a modern place has a documented medieval
identity, the tool's `HISTORICAL_NAMES` table emits that name instead (the
modern Milton Keynes and Bletchley records resolve to one 'Bicchelai'; 'Tel
Aviv' → 'Jaffa'; 'Ankara' → 'Ancyra'). A candidate
listed in `POST_MEDIEVAL_NAMES` has no defensible medieval identity and is
dropped so the next ranked known settlement fills its slot.
GeoNames `PPLX` city-section records are excluded at ingestion, while
`NON_SETTLEMENT_NAMES` rejects remaining modern districts and geographic labels.
If no eligible real candidate remains, the normal generated fallback is
preserved. County-head entries are exempt and keep the county's name.
An optional `--topup` pass adds places from OpenStreetMap.
Layouts are keyed by bookmark id in FBDATA.settlementLayouts (curated entries first, then
the real-world fill). The tool emits the 867 and 1066 layouts by default and accepts any
bookmark ids through --bookmarks; a requested bookmark without a curated layout of its own
is filled on top of the geography's default layout, matching the activation fallback.
Settlement data: GeoNames geographical database (CC BY 4.0);
top-up data © OpenStreetMap contributors, ODbL.

**Physical sites.** The optional top-level `settlementSites` object merges by site id
into `FBDATA.settlementSites`:

```json
{ "settlementSites": { "praha": { "x": 14.42, "y": 50.09 } } }
```

A site id is a lowercase snake_case slug (`a–z`, `0–9`, `_`) with finite longitude `x`
and latitude `y`. One slug denotes one physical place across every bookmark.

**County presentations.** A province inside a complete atomic bookmark — or a legacy
867 `provinces` replacement, which already replaces the whole same-id province record —
may carry the ordered `settlements` list shown in *Adding a province*. Every entry's
`site` must exist in the merged physical table. Bookmark validation reports invalid
slugs, coordinates, kinds, missing sites, repeats within a county, a site assigned to
two counties in one bookmark, wasteland lists, and lists over eight entries; world
compilation additionally rejects a coordinate that lands implausibly far outside the
declared county's raster. A coordinate that survives the snap but sits on a
coastal-edge cell is nudged inland at compile time (a two-cell land margin, walking
toward the county centroid), so a seaside town renders against land, not the
smoothed waterline. Reordering a published mod's settlement list can move saved
property between named places even though the numeric save remains valid — append new
slots or deliberately replace the presentation of an existing index. A mod that
supplies neither `settlementSites` nor `settlements` gets deterministic generated sites
and keeps its current settlement names, kinds, and indices.

**County communities.** The same complete bookmark province may carry the optional
ordered `communities` list shown in *Adding a province*. It replaces that county's
community list for the bookmark; there is no cross-bookmark merge by entry. Activation
rejects empty or non-array values, duplicate culture/faith pairs, unknown cultures,
invalid or unassignable faiths, non-boolean `paired` values, invalid/partial/non-totaling
`populationShare0` values, lists on wasteland, and principal entries that disagree with
the province's `culture`/`religion`. Authored shares initialize saved schema-2 community
counts by deterministic largest-remainder apportionment; authored order breaks exact
rounding ties. Zero-count results are omitted. The county `count` remains the sole
population used by tax, levy, capacity, and markets.

`FB.provinceCommunities(province)` reads immutable bookmark data. Campaign code that
needs saved demographics uses `FB.countyCommunities(state,pid)`,
`FB.countyCulture(state,pid)`, `FB.countyReligion(state,pid)`,
`FB.countyCultureShare(state,pid,cultureId)`, or
`FB.countyReligionShare(state,pid,faithId)`. Community projections are detached copies;
share helpers return a fraction from 0 through 1 and aggregate all matching combined
pairs. Culture ids must remain in `FBDATA.cultures`. A saved community faith may use a
campaign-founded id when the ordinary faith validation and assignment APIs accept it.

`FB.convertCountyCommunity(state,pid,request)` is the exact write boundary. `request`
uses the same `kind`, `target`, optional `source`, and `amount` or `rate` fields as the
event effect. It returns the applied count and source-to-target cohort detail. The helper
clamps to eligible population, merges duplicate output pairs, updates the independent
dominant identity with plurality hysteresis, and consumes no RNG.

`FBDATA.countyCommunityPolicies` defines policy `label`, `desc`, and an optional county
`modifier`; its three core ids are `voluntary`, `integrative`, and `coercive`. Numeric
behavior lives under `FBDATA.balance.countyCommunityProjectPolicies`, alongside the
`countyCommunityProject*` rate, cap, minimum-transfer, population, resistance,
entrenchment, war, occupation, faith-relation, culture-group, and plurality-hysteresis
knobs. One `communityProjects.faith` and one `communityProjects.culture` record may exist
on a saved county. `FB.countyCommunityProject`, `FB.countyCommunityProjectStatus`,
`FB.startCountyCommunityProject`, `FB.stopCountyCommunityProject`, and
`FB.resolveCountyCommunityProjects` are the public read/write boundaries. Status is a
pure numeric explanation; annual resolution carries fractional work until a meaningful
integer transfer can be made.

Runtime mods may add or replace `countyCommunityPolicies`. Each lowercase table id needs
non-empty `label` and `desc`, an optional matching `id`, and an optional known county
modifier. Every mod-added policy must also have a same-id mechanics record under
`balance.countyCommunityProjectPolicies` with finite `pressure`, `resistance`, `maxRate`,
`holdout`, and `migration` numbers. This nested mechanics table merges by policy id so a
mod can add one profile without erasing the three core profiles. Mechanics-only replacements
of a core policy are validated even when the mod supplies no policy metadata, and each
replacement must be a complete valid profile; a new mechanics id still requires matching
`countyCommunityPolicies` metadata. The AI pacing keys include
`countyCommunityAIAnnualChance` for the single yearly decision and
`countyCommunityAIMaxActiveProjects` for the concurrent world cap. Community event triggers
and effects validate against the combined core-plus-mod culture, faith, province, and
policy tables before any mod data is applied; errors identify the exact event field.

## Items

`FBDATA.items` (in `data/map_data.js`, mod key `items`) define objects that can live in
the shared family armory and be equipped by the current head, spouses, or resident
unmarried children:

```json
{ "items": { "ivory_chesspiece": {
  "name": "Ivory King", "icon": "♟", "rarity": "fine", "value": 45,
  "slot": "hand", "ageMin": 6,
  "fx": { "int": 1 },
  "art": { "kind": "generic" },
  "desc": "A gift between rulers, long ago."
} } }
```

- `rarity` — `common` / `fine` / `famed` is the stock class a definition draws in (famed
  pieces mostly arrive as war spoils and finds); definitions without a recognized rarity
  sell as `common`. `legendary` is a display-only tier for gated artifacts (see below) and
  never enters a weighted pool. `value` is the purchase price.
- `slot` is `head`, `neck`, `body`, `waist`, `feet`, `hand`, or `ring`. `grip:2` on a
  hand item reserves both hands. `ageMin` is the minimum equip age.
- Definitions are unique by default. `unique:false` makes a repeatable template: each
  acquisition creates a saved exact instance with `quality` and `visualSeed`. Quality is
  Plain/Well-made/Masterwork at 70/25/5%, multiplies value by 1/2/4, and adds
  `qualityFx` zero/one/two times to the base `fx`.
- `art.kind` selects procedural art (`generic`, `seax`, `sword`, `spear`, `shield`,
  `book`, `jack`, `helm`, `crown`, `ring`, `pendant`, `relic`, `belt`, `boots`,
  `chest`, `picks`, `axe`, `bow`, `staff`, `sickle`, `spade`, `crook`, `billhook`,
  `hook`, `quern`, `peel`, `tally`, or `basket`). The kind accepts the color arrays demonstrated by core items:
  `metals`, `grips`, `woods`, `cloths`, `threads`, `leathers`, `gems`, `trims`,
  `cords`, `covers`, `pages`, `wraps`, and `stones`. Missing art uses `generic`. Drawing depends
  only on the saved seed; do not put gameplay randomness in an art recipe.
- `fx` is active only while equipped. `mar/dip/ste/int/lea` and `health` affect the
  wearer; `battle`, `gold`, `prestige`, and `piety` count only on the current head.
  Unequipped armory objects have no mechanical effect.
- `eventOnly:true` excludes an item from ordinary peddler, gear, loot, plot, artifact,
  raid, and war-spoil pools. A specific `giveItem` effect or direct `FB.grantItem` call
  may still create it. This is distinct from the same-named holdings option.
- `player.items` stores exact references, not necessarily definition ids.
  `state.itemInstances` resolves generated references and `player.loadouts` assigns them.
  Never push/splice those arrays from a mod custom function. Use `FB.grantItem`,
  `FB.transferItem`, `FB.equipItem`, `FB.unequipItem`, `FB.pledgeItem`,
  `FB.sellItem`, `FB.giveItem`, `FB.giveRulerItemGift`, and `FB.destroyItem`.
- Item cards list actual quality-adjusted powers, value, wearer, and valid actions.
  Ordinary Plain/Well-made/Masterwork gifts and unique common/fine/famed items map their
  three tiers through `balance.socialItemGiftOpinion` (core: +4/+8/+12 Standing). Explicit
  personal and ruler item gifts share their recipient's cash-gift cooldown described
  above. A ruler has no inventory: `FB.giveRulerItemGift` removes the object from family
  ownership while retaining the semantic item record used by Chronicle messages. An
  equipped item must be removed before gift, sale, or pledge.
- Event hooks (`custom` effects): `offer_item` (the full eligible table, banded by the
  customer's station) and
  `offer_gear` (ordinary gear only) put an exact object on sale through `item_offer`;
  `buy_item` / `clear_item_offer` / `can_afford_item` (trigger),
  `loot_item` (random spoils), `find_artifact` (famed only), `plot_loot` (spoils + ends the
  plot). Owned unique objects are excluded while repeatable templates may recur. War
  victories and raids also issue exact spoils. To grant one **specific definition**, use
  the `giveItem: "id"` effect; it creates a new instance when that definition is repeatable.
- The **market shop** hooks: `open_item_shop` (used by the town/city visit events) opens
  the seasonal stall modal. `FB.shopStock(state, pid, 'town'|'city')` keeps one saved
  stock record (`player.shopStock`), rerolled through the seeded RNG only when the season,
  county, or settlement kind changes; unsold materialized instances are discarded on
  reroll. Knobs: `balance.shopStockSize` (per-kind `[min,max]`), `shopQualityOdds` /
  `shopQualityOddsTech` (curated quality rolls; the `…Tech` table applies when the nation
  knows `urban_markets`), `shopStockTechBonus` (extra offers with that technology),
  `shopPriceRatio` (multiplier over the county market quote). `FB.buyShopItem` buys an
  offer ref; `FB.shopSellables` lists unpledged, unequipped armory objects with their
  flat `itemSellRatio` prices; sales run through the ordinary `FB.sellItem`.
- **Artifacts.** An `artifact` field on a definition marks a legendary/sacred object:
  `{ religionGroups:[…], cultures:[…], kingdoms:[…], empires:[…], sacred:true }`, every
  part optional. The rumor can surface only when the player's faith (inheritance-aware),
  culture, and the de jure kingdom-or-empire of the home county all match; claiming one
  stamps `state.artifacts[id]` once per save, and an artifact that later leaves the family
  never returns to any pool. Artifact definitions should be `unique:true`,
  `eventOnly:true`, `rarity:'legendary'`, and carry a double-edged `fx` profile (negative
  values are supported and render in the item card). Hooks: the `artifact_rumors` /
  `artifact_held` context selectors feed the `artifact_rumor` and `artifact_coveted`
  events in `data/events_artifacts.js`; the custom effects are `artifact_rumor_pursue`,
  `artifact_offering`, `artifact_grant`, and `artifact_seize`, with the require/validator
  gates `artifact_trial_valid`, `artifact_can_afford`, and `artifact_is_sacred`.
  `balance.artifactOfferingRatio` scales the trial's gold offering against the artifact's
  value. Selling or gifting away a `sacred` artifact of the player's own faith costs piety
  and Popular support (`FB.artifactDeparted`).
- `offer_item` stock is banded by `balance.peddlerStockBands` (societal role →
  `common`/`fine`/`famed` class weights): the roll picks a rarity class first, then a
  definition inside it, so collecting uniques never shrinks a class until it is empty.
  Each `balance.peddlerWealthShift` purse threshold crossed shops one band higher. An
  offer above the band's home class queues `item_offer` with `offerClass:'aspirational'`
  (otherwise `'other'`), a forms selector the event text may branch on.

### Named item acquisition pools

`FBDATA.itemPools` (mod key `itemPools`) maps a stable pool id to an ordered, non-empty
array of item-definition ids. A later mod replaces one complete same-id array and leaves
other pools intact. Every entry must resolve after that mod's `items` additions are
included, and duplicate or unknown ids reject the mod before application.

The core `authoredWorks` pool contains the four family treatises awarded by the Author
specialization and its later commissioned-work life path. Mods may replace that pool or
add an item and select it in the same mod:

```json
{
  "items": {
    "annals_of_the_vale": {
      "name":"Annals of the Vale", "icon":"book", "rarity":"fine",
      "value":30, "unique":false, "eventOnly":true, "slot":"hand",
      "fx":{"lea":1}, "qualityFx":{"lea":1}, "art":{"kind":"book"},
      "desc":"A family account of one valley and its people."
    }
  },
  "itemPools": { "authoredWorks":["annals_of_the_vale"] }
}
```

Pool selection still uses the saved game RNG, and item creation still goes through
`FB.grantItem`; pool data never owns an exact instance or saved reference.

## Plots, blessings, and pacts

**Plots** (`FBDATA.plots` in `data/map_data.js` and `data/intrigue.js`) drive the intrigue game. The "Begin a
plot…" deed offers every plot whose `trigger` (standard trigger syntax) passes; beginning
one switches the player to the Scheming focus, which accrues `need` power over the days —
with a daily discovery risk — then queues the plot's resolution `event`. Discovery offers
abandonment with a context-specific consequence, paid containment that preserves the plot
with less power and more future risk, or an immediate lower-odds resolution. Resolution events
are ordinary event data: use the `plot` named chance for the attempt, and end every option
with `{ "custom": "plot_end" }`, or an owning-system custom handler that calls it, so the
plot clears and the old focus returns:

```json
{ "plots": { "poison_well": {
  "name": "Sour the Well", "icon": "🕳", "need": 10, "event": "plot_poison_well",
  "trigger": { "hasRole": "rival" }, "desc": "Petty, deniable, and effective." } } }
```

Definitions without further fields retain that event-driven behavior. A hostile plot may
add the following optional schema:

```json
{
  "hostile": true,
  "scope": "character_same_sovereign",
  "offense": "attempted_murder",
  "target": "intrigue_character",
  "outcome": "death",
  "accomplice": true,
  "baseChance": 0.20,
  "methods": [
    { "id":"careful", "name":"Poison", "profile":"careful",
      "progress":0.8, "success":0.10, "discovery":-4 },
    { "id":"bought", "name":"Staged Accident", "profile":"bought_access",
      "progress":1.2, "success":0.05, "discovery":0, "stationCost":true },
    { "id":"forceful", "name":"Ambush", "profile":"forceful",
      "progress":1.5, "success":-0.05, "discovery":10, "martial":true }
  ]
}
```

Core hostile outcomes are `death`, `captive`, `leverage`, `foothold`, and
`covert_sabotage`. Core scopes are same-sovereign named characters and own/adjacent
foreign-border counties. `hidden:true` keeps a definition resolvable for an old active
save but removes it from new setup. Hostile resolution is engine-owned: do not add an
`event` or `plot_end` effect. Exact target, ruler generation, method, accomplice, and
political-foothold stamps remain attached; invalidation ends the plot without substitution.
The three core `profile` ids read defaults from `FBDATA.intrigue.methodProfiles`;
method-local fields override those defaults, so a mod can reuse the common math with a
scheme-specific `name` or deliberately tune one method.

The top-level `intrigue` object exposes the bounded shared configuration. It merges
scalar fields individually and merges `methodProfiles` by profile id:

```json
{
  "intrigue": {
    "maxAiSchemes":4,
    "aiStartsPerYear":1,
    "aiPlayerFacingPerYear":1,
    "aiActorCooldownYears":3,
    "leverageDays":540,
    "captiveRansoms":[5,10,20,40,80],
    "methodProfiles": {
      "patient":{"progress":0.7,"success":0.15,"discovery":-6}
    }
  }
}
```

`maxAiSchemes`, `aiStartsPerYear`, and `aiPlayerFacingPerYear` remain bounded by the
engine's saved-state limits (0-6, 0-2, and 0-1). Cooldown years and ransom amounts are
non-negative, leverage days is a positive integer, and profile `progress` is positive.
`success` and `discovery` are finite numbers; `stationCost` and `martial` are optional
booleans. A hostile method's `profile` must name a resulting profile. Unknown fields,
invalid bounds, and missing profile references reject the whole mod before mutation.

The shared hostile chance is
`clamp(baseChance + actorIntrigue*0.035 - targetIntrigue*0.02 +
targetStanding/500 + method.success + accomplice + Council + Schemer, 0.05, 0.90)`.
Forceful methods add Martial to progress. Bought-access cost is `5 + 5*targetStation`.
Accomplice acceptance is
`clamp(0.35 + Standing/200 + hostility + traitMotive + payment, 0.05, 0.95)`;
the optional payment is 10 gold and adds 0.20. An accepted accomplice adds 0.05 plus
up to 0.10 from Intrigue to success, and matching the target residence multiplies
progress by 1.25. The default yearly exposure is 12 percentage points plus the method
value; compelled leverage adds 10 points. All rolls use the saved game RNG.

**Blessings** are plain event data (`seek_blessing`, fired by the Seek-a-blessing deed) that
spend piety on flags the engine reads: `blessed_crops` (+harvest odds, spent with the
harvest), `blessed_war` (+battle power, spent by the next battle involving the player's
host), `blessed_union`
(+fertility until a child is conceived).

**Pacts** are engine-side diplomacy: the envoy deed (tier 4+, independent) spends gold on a
dip-based chance to set `state.pacts[realmId]` — two years during which that realm will not
attack the player and cannot be declared on.

## Technology

`FBDATA.techDomains`, `FBDATA.techTraditions`, `FBDATA.tech`, `FBDATA.techCaps`, and the
developer-facing `FBDATA.techImpactReviews`
(in `data/technology.js`, with matching mod keys) define the national prerequisite
graph. Each sovereign owns one saved `state.realmTech[realmId]` record; vassals use and
contribute to the effective top independent realm's completed knowledge, exposures, and
one-to-three active projects. Only a sovereign player chooses projects, while AI
sovereigns fill slots with saved RNG.

The definition tables merge by id: a same-id domain, tradition, or technology replaces
that complete definition, while a new id is added. A domain requires a localized `name`;
`icon` is display metadata and finite numeric `order` controls catalogue grouping. A
tradition requires a localized `name` plus `cultures` and `religions` arrays; realms whose
capital/ruler matches either array derive that tradition automatically. A technology may
refer to any domain present after the full mod stack merges, and adoption windows may
refer to any resulting tradition. Mod-authored labels without a core catalog entry fall
back to their authored English.

`techCaps` merges supplied scalar cap keys. Its nested `costFloor`, `units`, and `aiUnits`
maps merge one member at a time, so `{ "techCaps": { "units": { "arch": 250 } } }`
leaves every other built-in cap intact. Caps must be finite non-negative numbers. Scalar
cap keys are the scalar `fx` keys below; `costFloor` accepts `build`, `enterprise`, and
`training`; `units` accepts any mustered class id from `FBDATA.unitClasses`; and
`aiUnits` accepts any of those but the levy remainder (the `levy_infantry` role's default
class, `levy` in the shipped data).

`capabilities` names features a technology lets a realm use, as opposed to the numeric
effect domains capped by `techCaps`. Each record is an object; optional `stacks:true`
makes the capability's level count every known technology that grants it, while any other
capability is simply present or absent. The table merges by id. A technology grants
capabilities through its own `capabilities` array, and engine features ask for the
capability rather than a technology id, so a regional technology that grants an existing
capability unlocks the same feature:

```json
{
  "tech": {
    "ribat_seafaring": {
      "name": "Ribat Seafaring", "icon": "⛵", "domain": "seafaring", "cost": 100,
      "req": ["coastal_piloting"],
      "history": { "attested": [700, 900], "adoption": { "default": [760, 920] } },
      "desc": "Coastal fortresses man raiding galleys.",
      "sources": ["MOD"], "unlocks": [],
      "capabilities": ["seafaring_raids"]
    }
  }
}
```

The shipped capabilities are:

- `seafaring_raids` (Longships): deep overseas and upriver raiding without a seafaring
  tradition.
- `oceanic_navigation` (stacking; Celestial Navigation, Sailing Directions, Mariner's
  Compass): each grant adds one province and 40 px of sea raiding reach.
- `mounted_reach` (stacking; Mounted Archery, Couched Cavalry Lance): one province of
  raid range while present, plus 35 px of overland reach per grant.
- `couched_lance` (Couched Cavalry Lance): formal tournament jousting.
- `chartered_guilds` (Guild Charters): guild monopoly petitions and grants.
- `assayed_coinage` (Mint Assaying): coinage debasement and recoinage.
- `customary_law_courts` (Recorded Customary Law): written county confirmation before
  the Estates.
- `permanent_markets` (Urban Markets): wider town shop stock; with `sealed_documents`
  (Authenticated Seals), formal market charters.
- `parallel_research` (stacking; Scholarly Networks, Universities): one more research
  slot per grant.

A mod technology may only grant a capability present after the mod merges; capability ids
must not equal technology ids.

`techImpactReviews` is the forward-only core design ledger rather than a gameplay or save
contract. Mods need not classify arbitrary custom code, but may merge optional entries
under `techImpactReviews.features`. Each entry has `mode:"hard|soft|none"` and a non-empty
`rationale`; hard and soft entries use a non-empty `tech` array, hard entries also use a
non-empty `fallback`, and none entries must not name technologies. The core baseline is
`1.127.1`.

```json
{
  "techDomains": {
    "mechanics": { "name": "Mechanics", "icon": "⚙", "order": 7 }
  },
  "techTraditions": {
    "workshop_exchange": {
      "name": "Workshop exchange",
      "cultures": ["italian"],
      "religions": []
    }
  },
  "techCaps": {
    "movement": 0.3,
    "units": { "arch": 250 }
  },
  "tech": {
    "windmills": {
      "name": "Windmills", "icon": "🌬",
      "domain": "mechanics",
      "cost": 50,
      "req": ["water_power"],
      "reqAny": ["overshot_waterwheel", "trip_hammer"],
      "history": {
        "attested": [850, 1200],
        "adoption": {
          "default": [1030, 1240],
          "latin": [980, 1170],
          "workshop_exchange": [980, 1170]
        }
      },
      "desc": "Grinding grain wherever the wind blows.",
      "confidence": "medium",
      "sources": ["GIES", "HILL"],
      "unlocks": ["rule:wind_power"],
      "fx": {
        "costs": { "build": -0.04, "enterprise": -0.04 },
        "movement": 0.02
      }
    }
  }
}
```

- Built-in domains are `agriculture`, `crafts`, `commerce`, `learning`, `governance`,
  `warfare`, and `seafaring`; mods may replace them or add more. `req` is an all-of id
  or array; `reqAny` is an optional any-of array. Technologies are never repeatable.
- `history.attested:[from,to]` is the evidence range.
  `history.adoption.default:[emergence,widespread]` is required; named technology
  traditions may override it. Dates affect cost rather than availability, so a project
  remains selectable before attestation at a severe premium.
- `unlocks` names discrete content or rule hooks. Every referenced `building:*`,
  `enterprise:*`, and `career:*` target is validated. `unit:<id>` targets validate
  against `FBDATA.unitClasses`; the pre-table targets `unit:archers`, `unit:cavalry`,
  and `unit:retinue` remain valid through `FBDATA.unitClassAliases`, which resolve them
  to the default class of the `missile`, `cavalry`, and `household` roles.
- `confidence` and `sources` are research metadata; core source codes are expanded in
  `docs/research/medieval-technology-catalogue.md`.
- Optional `cultures` / `notCultures` arrays select mutually exclusive definitions when
  a project begins. Once completed, the selected id remains valid after cultural
  succession. These restrictions remain primarily for old mods.

Culture selection restrictions govern ordinary research, independently of historical starting knowledge and prerequisite closure. Fresh complete/expose/omit declarations continue to use the effective graph. In the shipped catalogue, annual_fairs requires urban_markets and siege_engineering requires geometry; these corrections retain explicit costs, inherited adoption windows and effects. They do not award a specific engine, enact a protected fair, grant an office or reseed an existing campaign. See docs/research/technology-civic-military.md for scope and sources. Supplemental source tables organize built-in replacements only; ordinary imports still use tech and buildings.
- Scalar `fx` keys summed by `FB.techBonus` are `tax`/`levy` (fractional multipliers),
  `battle` (added battle power), `devCap` (development ceiling), `health` (lower ruler
  mortality), `research` (national points each season), `domain` (domain capacity),
  `siege`, `movement` (overland army speed), `seaMovement` (water-crossing speed),
  `education`, `finance`, `trade`, and `supply` (field supply endurance: shrinks the
  daily supply drain abroad and quickens the refill on friendly land). All are subject to
  `FBDATA.techCaps`.
- `fx.seaTransport` is different: it must be a finite positive integer and the effective
  sovereign uses the largest completed value, not a sum. Without one, field armies use
  `balance.armySeaTransportBase`. Mods do not need ship, port, or fleet objects; technology
  details display both sea effects automatically.
- `fx.costs` contains signed fractional modifiers for `build`, `enterprise`, and
  `training`; final factors have category floors.
- `fx.units` adds flat player-host troops keyed by mustered `FBDATA.unitClasses` ids
  (`levy`, `arch`, `cav`, `ret`, and any unlocked mod or core class).
  `fx.aiUnits` adds AI host composition fractions for any of those but `levy`. Compatibility
  aliases remain readable: flat `build:0.20` means a twenty-percent building discount,
  while flat `retinue` and `archers` add to the default class of the `household` and
  `missile` roles.
- `name`/`desc` accept text tokens and religion-variant objects.

Supplemental source files may declare complete FBDATA.techCorrections_<suffix> maps and replace individual existing FBDATA.tech entries after data/technology.js. data/technology_foundations.js uses that convention for nine agricultural and machinery records; it loads before bookmark declarations. These source maps add no JSON root: imported technology replacements still use tech and the same ordinary detached validation and consumers. Supply explicit cost and the complete history.adoption map when correcting evidence dates, so an earlier attestation does not accidentally lower a base cost or regenerate regional adoption. Culture research-selection restrictions do not filter historical seeding. Saved completed ids and progress are not reseeded on restore.

- Events grant national progress with the `research` effect and gate on effective
  completed ids with `techs`/`notTechs`. Buildings may carry a `research` per-season key
  (see the library); contributions become reserve if no project is active.
- Buildings, careers, schooling, enterprises, household-standard levels, finance
  contracts, trade partnerships, policies, privileges, feudal-service charters, and event
  options may use `requiresTech:"technology_id"` or an all-of array.

Legacy definitions are normalized at runtime. `branch` becomes `domain`, scalar `req`
becomes an array, and `yearMin:Y` becomes an inferred soft historical window rather than
a hard lock.

Bookmark realm definitions may include:

```json
{
  "techTraditions": ["byzantine", "islamic"],
  "techSeed": {
    "complete": ["technology_id"],
    "expose": ["another_id"],
    "omit": ["exception_id"]
  }
}
```

Without `techTraditions`, the engine derives one or more traditions from capital/ruler
culture and religion. Fresh seeds complete knowledge whose regional adoption window has
ended, expose knowledge whose window has begun, apply overrides, and close all completed
prerequisites.

## Unit classes

`FBDATA.unitClasses` (`data/units.js`, merged by id like other tables) is the single
source of truth for host composition: every field host's saved `units` record is keyed
by these class ids, with `men` always the total. The five baseline classes (`levy`,
`arch`, `cav`, `ret`, `mercs`) are the migration baseline; any class a save predates
defaults to 0 on load.

Every class declares a `role`, and the engine asks for roles rather than class ids, so a
regional class with an existing role musters, fights and supplies like that role. Roles:

- `levy_infantry`: the levy. Its default class is the levy pool every muster fills, and
  levy infantry is exempt from fiscal-settlement paid limits.
- `missile`: archers and crossbowmen. The default class receives archery buildings and
  flat `archers` effects.
- `polearm`, `heavy_infantry`: pike blocks and elite foot.
- `household`: sworn household troops. The default class receives retinue sources
  (war buildings, a baron's household, posts, flat `retinue` effects); any household men
  in a won or lost field battle select the `_steel` battle report.
- `cavalry`, `horse_archer`, `heavy_cavalry`: the mounted roles, which eat as horsemen on
  campaign whatever their basket.
- `mercenary`: hired companies, costed per contract.

The first class declared with a role is that role's default class. The `levy_infantry`,
`missile`, `household`, `cavalry`, and `mercenary` roles must each have a class. Role names
never equal class ids.

```json
{
  "unitClasses": {
    "pike": {
      "role": "polearm",
      "name": "Pikemen", "icon": "🔱",
      "quality": 1.1, "attack": 1.0, "defense": 1.2,
      "upkeepPer100": 0.8, "casualtyOrder": 2,
      "share": 0.2, "requiresTech": "infantry_polearms",
      "professional": true, "replaceDays": 90,
      "counters": { "cav": 1.6 },
      "terrainFactors": { "farmland": 1.05, "forest": 0.85 },
      "basket": { "provisions": 0.7, "materials": 0.25, "transport": 0.05 }
    }
  }
}
```

- `name` (required) is a localized plural group noun; `icon` is display metadata shown
  in the host composition readouts.
- `quality` (required, positive) is the battle quality of one man of the class;
  `attack` and `defense` (optional, positive) split that power by battle side — the
  camp holding the ground fights at `defense`, the camp marching in at `attack`, and a
  meeting engagement on open ground reads `attack` for both. Each falls back to
  `quality`, so legacy entries and mods that declare only `quality` reproduce the
  pre-split battles exactly.
- `upkeepPer100` is the seasonal logistics per 100 live men (omit on hired classes);
  `casualtyOrder` (required) orders battle losses, lowest first, ties broken by id.
- `professional: true` marks standing troops whose battle, siege, starvation, and
  desertion losses enter the realm's replacement cohort
  (`state.armyCohorts[<realmId>][<classId>] = { batches:[{ n, readyTurn }], ready }`):
  each loss queues a batch that finishes drilling after `replaceDays` (else
  `balance.cohortReplaceDays`), the realm pays `upkeepPer100` ×
  `balance.reinforcementPremiumMult` per 100 pending men while they drill, and the
  drilled `ready` men join a home-rested host or the realm's next fresh muster. The
  ledger is additive save state: old saves have none, `FB.armiesEnsure` repairs
  malformed records, a dead realm's ledger is dropped, and per-class volume is capped
  at `balance.cohortMaxPerClass`.
- `counters: { "<enemyClassId>": <multiplier> }` fights the class above its quality
  against that enemy class. A side's counter multiplier is its composition-weighted
  average against the enemy's composition shares, capped at ±`balance.battleCounterMaxSwing`
  (0.2). A counter key may also name a role, which covers every enemy class of that
  role without an entry of its own: `{ "cavalry": 1.6 }` answers every cavalry-role
  class, including a mod's regional horsemen. Counter targets must be known class ids or
  roles.
- `terrainFactors` optionally overrides the class's `balance.terrainBattleFactors` row;
  terrain keys must match the shared terrain set (`balance.terrainMarchMult`), and a
  missing terrain reads as 1.
- `share` (0–1) converts that fraction of the mustered levy into the class when the
  realm qualifies; `requiresTech` gates on a completed technology,
  `cultureDoctrine` names the required `doctrines.military` value, and `cultures` /
  `notCultures` gate on `FBDATA.cultures` ids (the player's own character culture for
  the player, the ruler or capital culture for AI realms).
- `hired: true` marks contract troops (`mercs`): never mustered from the levy, charged
  per company instead of per head. It is set exactly when the role is `mercenary`.
- `basket` is the class's provisions/materials/transport mix for market-quoted upkeep.

The validator checks the whole table: known roles, `hired` matching the mercenary role, a
class for every required role, name/quality/attack/defense/
casualtyOrder shape, `professional`/`replaceDays` shape, resolved `requiresTech`,
`cultures`/`notCultures`, `counters`, and
`terrainFactors` references. Mods replace a class wholesale by id or add new classes; a
mod that leaves a required role without a class is rejected.

The requirement gate rejects a new mod class without an explicit registered role. A replacement of an existing class that omits role keeps the replaced class's role. Legacy read helpers retain their older fallback behavior for saved classes.
Removing a non-baseline class that a
save still fields is safe: the saved men keep their headcount, fight at the fallback
quality 1, fall last in the casualty allocation (in id order, after every known
class), are never mustered fresh, and return to full behavior if the class is
re-added.

## Cultures, religions, traits, titles, balance

Culture definitions are complete records replaced by id. Their core shape is
`{name, tradition?, dyn, male, female, family?, doctrines?}`: `dyn` selects the dynasty naming
pattern, `male` and `female` are personal-name lists, and `family` supplies surnames for
the `plain` pattern. `tradition` refers to a `cultureTraditions` record shaped as
`{name, icon?, order?}`. The tradition controls cultural affinity, conversion distance,
and conversion-picker grouping. Its `name` is localized structured data; `icon` and
finite numeric `order` are display metadata. New cultures that omit `tradition` fall
back to `other`; replacement definitions that omit it retain an existing culture's
membership for legacy-mod compatibility. Unknown declared traditions fail bookmark
activation. See `data/cultures.js` and `data/traits.js` for the full culture and trait
shapes.

A culture's optional appearance record is its portrait face profile, inherited by its child cultures: tone (skin pigment from 0, fair, to 4, dark), fair and red (the chance of fair and of red hair, 0 to 1), an optional hair tendency { style, sex, above } (that sex wears the hairstyle when the identity's hair byte exceeds above; Norse men wear long loose hair this way) and tends, a list of headwear kinds the wardrobe's tends rules may pick (the fur hat of Norse, Slavic and Baltic cultures). A culture with no profile in its lineage borrows the profile of the campaign era's default culture; because culture definitions are replaced whole, a replacement that omits appearance falls back the same way. A religion's properties.attire is the faith profile, inherited down the faith tree: tonsure (male monastics are tonsured), pendant ("cross" draws a cross on the neck chain, anything else a stone), clergyPendant (clergy and monastics wear the chain), covers { m, f } (headwear the faith expects of adults, applied where the wardrobe places a faithCover rule), garments (garment substitutions such as tunic to robe), beard { min, cuts } (an adult male beard floor and the cuts allowed) and tends.

`cultureDoctrineDefaults` supplies inherited baseline values for cultures that do not
author them inline. When `learning` is omitted, the first `techTraditions.cultures`
membership supplies it, then Latin is the fallback. `doctrineCatalogs` defines the
complete player-visible faith and culture reform surface. Each doctrine has a stable
`path`, display `order`, and an
`options` map. `shownAboveDoctrine:true` avoids a duplicate detail row when another
section already presents the value. Each option has `name`, `desc`, JSON-safe `value`,
and a piety or prestige `cost`. A culture doctrine may instead use
`optionsFrom:"cultureTraditions"` or `optionsFrom:"techTraditions"`. Catalog additions
merge by doctrine id. See
`docs/designs/doctrines.md` for branch thresholds and the runtime transaction.

`FBDATA.rulerTraits` (mod key `rulerTraits`) is the ordered, non-empty trait-id pool used
when the world creates an AI ruler or repairs a missing vassal-ruler temperament. The
complete array is last-mod-wins; each id must exist after the same mod's `traits` table
is included. Existing saved rulers keep their stored trait.

`FBDATA.raidingTraditions` (mod key `raidingTraditions`) has three independently
replaceable arrays: `cultures`, exact `faiths`, and root `faithGroups`. Omitted arrays
retain their current value, while an explicit empty array disables that route. Culture
and faith ids must exist after same-mod additions; a faith-group id must be an existing
root religion definition. Player and AI raid eligibility consult the same resulting
record. These lists do not change raid range, spoils, cooldown, or technology effects.
The culture doctrine `doctrines.raiding` grants the same eligibility and is inherited by
campaign culture branches. `doctrines.seafaring` controls long-range raid reach.

The same record holds the historic raid families used by the `historic_raider` event
selector. `profiles` maps each family id to the captor counties it raids from: any of its
`cultures` or `faiths` (an empty family means any county of another culture or faith).
`victims` is an ordered list of rules; the first rule matching the protagonist names the
family, and a rule with both `faiths` and `cultures` needs both to match. Faith and culture
ids include their groups and branches. `fallbackProfile` is the family used when no rule
matches or no captor county exists. Each of the three is replaced whole; every named
family must exist in the resulting `profiles`. The family id is the `raidProfile` an
event's text and title forms select on, so a new family also needs its cases there.

A trait definition may use this extended shape:

```json
{ "roadwise": {
  "name": "Roadwise",
  "icon": "🛤",
  "desc": "Long journeys have taught them the rhythms of the road.",
  "earned": "Earned after visiting three unique destinations.",
  "class": "formation",
  "noRandom": true,
  "inherit": 0,
  "ste": 1,
  "earn": { "threshold": 3 },
  "travel": { "legDays": -1, "roadIncident": -0.15 }
} }
```

`name`, `desc`, and `earned` are localized pure-display fields; `earned` is optional
acquisition guidance. `class` is `disposition`, `formation`, `reputation`, or
`condition`. Full character sheets display those classes in that order followed by
`Other`; an omitted or unknown class remains compatible and appears in `Other`.
Unclassified traits also retain normal random-generation behavior. Set `noRandom:true`
to exclude a trait from random character generation. `inherit`, `opposite`, the five
root skill keys (`dip`, `mar`, `ste`, `int`, `lea`), and root aggregation fields such as
`health`, `fert`, and `opinion` retain their existing meanings; `opinion` scales
positive event-driven Standing gains toward the protagonist.

`earn:{threshold:n}` defines progress-based acquisition. Event effects can call
`traitProgress:{id,amount?}`; the engine keeps the current protagonist's progress in
saved state, clamps it at the threshold, and awards the trait once. Removing an earned
trait through `removeTrait` resets its progress if removal occurred, allowing it to be
earned again. Direct `addTrait` remains valid and does not require progress. Mods can
query root effects through `FB.traitAgg(character)`, grouped numeric effects through
`FB.traitBonus(character,group,key)`, and award progress from code through
`FB.noteTraitProgress(state,traitId,amount)`.

The first grouped effect consumers are:

- `assembly.voteChance`: additive vote probability; `assembly.popularOpinion`: a rate
  applied only to positive Popular support event gains.
- `travel.legDays`: days added to the departure-time county-leg snapshot after transport
  standards, with a minimum of one; `travel.roadIncident`: a multiplicative rate applied
  only to the ordinary 38% road-incident roll.
- `war.levy`: a rate against the player's direct levy base before Martial, domain
  penalties, and vassal contributions. It receives its own levy-ledger line.
- `estate.rent`: a rate applied to direct demesne rent after the domain penalty and
  before later technology, council, position, monopoly, and liege-cut arithmetic. It
  receives its own income-ledger line.
- `household.regard`: an additive rate on positive event Standing toward the protagonist's
  spouse or blood relatives. Losses and unrelated characters are unchanged.
- `courtship.siblingInitiate`, `siblingDynasticInitiate`,
  `siblingRiteInitiate`, and `siblingTabooInitiate` build the player's exceptional
  sibling-approach score. `siblingAccept`, route-specific `siblingRiteAccept`,
  `siblingIllicitAccept`, `siblingTabooAccept`, and conditional
  `siblingDynasticAccept` alter the target's one-time response probability. The
  matching `*Proposal` keys alter the final proposal, while `siblingExposure`
  changes seasonal illicit-exposure probability. All probabilities are fractional.

All grouped values are numeric; absent groups and keys contribute zero. The catalog has
no trait cap. Named wounds and sicknesses in `FBDATA.ailments` remain timed conditions
with their existing lifecycle; assigning a trait to the `condition` display class does
not turn it into an ailment or change ailment behavior.

Religions are one inheritance graph. A table key is the stable faith id; `group` points
to the definition it inherits. A root omits `group`, and a broad root normally sets
`assignable:false` so it can supply shared doctrine without producing characters called
only “Christian” or “Muslim.” `parent` is accepted as an equivalent programmatic
spelling. For example:

```json
{
  "christian": {
    "name": "Christianity",
    "assignable": false,
    "icon": "✝",
    "properties": {
      "marriage": {
        "spouseLimit": { "m": 1, "f": 1 },
        "divorce": {
          "kind": "annulment", "direct": false,
          "gold": 15, "piety": 20, "cooldownDays": 360
        },
        "acceptedRelations": ["same", "in_fold"]
      },
      "words": {
        "deity": "God", "cleric": "priest",
        "temple": "church", "landed": "Lord",
        "partnership": "Commenda partnership"
      },
      "roles": {
        "monasticM": "Monk", "monasticF": "Nun",
        "priestM": "Priest", "priestF": "Priest",
        "abbotM": "Abbot", "abbotF": "Abbess"
      },
      "clergyMarriage": false
    }
  },
  "catholic": {
    "name": "Latin Christianity",
    "group": "christian",
    "relationToParent": "schismatic",
    "icon": "✝",
    "properties": {
      "systems": { "papacy": true },
      "roles": { "bishop": "Bishop", "cardinal": "Cardinal" },
      "head": {
        "officeId": "catholic",
        "realm": "papacy",
        "title": "Pope",
        "holderSex": "m",
        "recovery": "grant_seat",
        "seat": "roma",
        "restoredRank": 3,
        "sameFaithWar": "sacrilege"
      }
    }
  }
}
```

Identity text (`name`, `adjective`, `collective`, `desc`), lifecycle fields, and graph
edges stay local; an omitted `icon` may fall back to the parent. Values inside
`properties` inherit recursively. Nested
objects merge; arrays, scalars, and `null` replace the inherited value. A child can
therefore author only `properties.marriage.spouseLimit.m:3`, or use
`properties.head:null` to remove an inherited office; this also disables an inherited
`systems.papacy` capability. Legacy definitions that put qualities such as `head` at the
top level still work, but new data should use
properties. Rank titles live in the lexicon (FBDATA.lexicons, see Lexicons below), where a faith-layer entry supplies a faith's labels. A modded or runtime faith that still sets properties.rankTitles (m and f arrays) is read as a faith-layer entry for that faith. Validation requires a label at every band used by the campaign's effective ladder, or every shared feudal band when validating without a campaign. Unused positions may be null or absent. FBDATA.titles is retained only as a compatibility fallback for old mods and saved title snapshots.
When a mod supplies one of the historical `titles.christian|muslim|pagan|jewish`
or `_f` keys, the loader also mirrors it into the lexicon: `christian` replaces the base
ladder and the other groups replace that faith's entry, preserving title-only mods. New
mods should use `lexicons`.

`properties.head.holderSex` is optional and accepts `"m"` or `"f"`. When
set, only a realm whose current ruler has that sex may hold or claim the office.
An ineligible temporal successor retains the realm, while the office becomes a
vacancy for its normal recovery rule; use this for historically sex-restricted
central offices rather than imposing a blanket succession restriction on a faith.

`relationToParent` is `in_fold`, `schismatic`, or `hostile`, or a directional object
`{"childView":"in_fold","parentView":"schismatic"}`. A scalar applies both ways.
An omitted status defaults to `schismatic` for legacy definitions. Same ids resolve as
`same`; faiths with no common ancestor are `foreign`. Optional
`relations:{"other_faith":"hostile"}` adds authored directional exceptions. Runtime
changes use `FB.setFaithRelation(state,observerId,targetId,status)` and persist in
`state.faithRelations`. `marriage.acceptedRelations` controls which of those statuses
the faith permits in a match. Event and data variant objects search the exact faith,
then every ancestor, then `default`; `religionGroup`/`religionGroups` gates likewise
match any ancestor rather than only a hard-coded family.

For `foundFaith`, doctrine inherits but central-office allegiance does not. Unless the
new definition locally supplies `properties.head`, the effective branch receives
`head:null` and an inherited `systems.papacy` capability is disabled. This also applies
when older campaign-founded faiths are loaded. To keep recognizing an inherited office,
declare the intent explicitly; `"properties":{"head":{}}` retains the parent's office
and stable `officeId`. `relationToParent:"in_fold"` alone does not imply obedience.

`properties.head.realm` is the global initial/canonical realm fallback when the active
bookmark has no matching `religiousHeads` entry; `head.title` is localized pure-display
text. New heads should declare a stable `officeId`; a legacy head that omits it infers
the defining faith id, preserving the former save-key contract. An inherited office
keeps the same id, so Sunni schools do not produce duplicate Caliphs. The live mapping is saved independently
under `state.religiousHeads[officeId]`, may be reassigned, and may be explicitly vacant
with `null`. `state.religiousHeadVacancies[officeId]` then records
`{"turn":1234,"formerHolder":"papacy"}`. The built-in office ids remain `catholic`
and `sunni`, preserving old version-3 saves. A head is never inferred from capital faith
or territorial rank, and absorbing its holder never makes it hereditary. (Core adds one
deliberate exception: a victorious player `caliphate` succession war reassigns a `claim`
office to the victor's realm without moving land.) Faiths without effective `head`
metadata have no centralized office.

`head.recovery` is `grant_seat` or `claim`. A `grant_seat` office requires `seat`; the
Catholic seat is also reserved from personal Bishopric appointments. The head definition
may set `restoredRank` (default 3); recovery grants that county to a fresh independent
copy of the bookmark's canonical realm. A `claim` office supplies alternative complete
county sets in `claimCounties`, for example:

```json
{ "properties": { "head": {
  "officeId": "sunni",
  "realm": "abbasid",
  "title": "Caliph",
  "recovery": "claim",
  "claimCounties": [ ["baghdad"], ["mecca", "medina"] ],
  "sameFaithWar": "ordinary"
} } }
```

Each inner array is one sufficient alternative. Core player/AI rank and resource gates
remain engine rules; claiming attaches the office to an existing realm without moving
land. `sameFaithWar` is `ordinary` or `sacrilege`. Core `sacrilege` policy leaves player
causes legal behind a second confirmation, blocks ordinary same-faith AI selection, and
protects the office realm's counties from incidental same-faith AI captures.

Core and custom systems should query `FB.religionOf(id,state)`, `FB.faithValue`,
`FB.faithLineage`, `FB.faithRelation`, and `FB.faithHasSystem` rather than switching on
groups or ids. The effective record's `parent` is its exact parent; its `group` remains
the historical four-family compatibility alias, so it must not be used for new graph
logic. Central-office consumers should query `FB.religiousHeadOf(state, faithId)`,
`FB.religionsHeadedBy(state, realmId)`, or
`FB.isReligiousHead(state, realmId, religionId?)`; use
`FB.religiousHeadTitle(state, faithId)` for the localized title. In core data, Muslim
tier 7 is Great Sultan/Great Sultana because Caliph is reserved for the Sunni office.
Realm-death and recovery code should use `FB.markRealmDead`,
`FB.vacateReligiousHeads`, `FB.assignReligiousHead`,
`FB.canRestoreReligiousHead` / `FB.restoreReligiousHead`, and
`FB.canClaimReligiousHead` / `FB.claimReligiousHead` so assignments, vacancy clocks,
and durable notices remain consistent.

Runtime sects use the exact same definition shape. `FB.createFaith(state,definition)`
adds a validated definition without converting anyone. `FB.foundFaith` additionally
records founder/origin metadata and can convert the founder, managed household, and
player realm; declarative events normally use the `foundFaith` effect documented above.
Generated definitions live in `state.faiths`, relationship changes in
`state.faithRelations`, and both stay in the version-3 save envelope. County faith is
still authored bookmark data, so founding does not mutate a county. See
[designs/religions.md](designs/religions.md) for the complete resolution and save model.

Deliberate player conversion (`docs/designs/conversion.md`) is tuned through
`FBDATA.balance`: `faithConversionSelfPiety`, `faithConversionHouseholdPiety` /
`faithConversionHouseholdPrestige`, `faithConversionRealmPiety` /
`faithConversionRealmPrestige` set the scope ladder; `faithConversionInFoldMult`,
`faithConversionSchismaticMult`, `faithConversionForeignMult`, and
`faithConversionHostileMult` multiply faith costs by the relation-graph distance to the
target; `cultureAdoptionSelfPrestige`, `cultureAdoptionHouseholdPrestige` /
`cultureAdoptionHouseholdPiety` price culture adoption, scaled by
`cultureAdoptionSameGroupMult` and `cultureAdoptionForeignMult`;
`conversionPopularOpinionSelf` / `…Household` / `…Realm`,
`faithConversionHouseholdRealmStanding`, `faithConversionRealmRealmStanding`,
`faithConversionVassalStanding`, `cultureAdoptionHouseholdRealmStanding`, and
`cultureAdoptionVassalStanding` set the opinion and standing penalties; and
`faithConversionSelfCooldown` / `…HouseholdCooldown` (plus the
`cultureAdoption…Cooldown` pair) set the per-scope cooldowns in days. Realm faith
conversion is once per ruler regardless of these knobs.

### Catholic Papacy definition

`FBDATA.papacy` (in `data/papacy.js`, mod key `papacy`) defines the Catholic College,
election eras, Roman titles, regnal-name seeds, authority, Abbot and Bishop appointments,
investiture,
excommunication, schism, and Papal-economy constants. Unlike id-keyed tables, this
top-level value is atomic: a later mod replaces the whole object. Supply a complete
copy, including:

- `targetCollege`, `hardCap`, `annualAppointments`, `abbotAppointment`,
  `bishopric`, and `cardinalRequirements`;
authority supplies bands, action gates, dated starts and adjustments. starts is an ascending list of from/value entries; a null from is a timeless first baseline.
- ordered `elections`, `cardinalOrders`, `romanTitles`, `blocs`, `tactics`,
  regnalNames and regnalSeeds. regnalSeeds is an ascending list of from/counts entries; counts maps regnal names to completed numbers. The most recent nonfuture entry initializes an empty saved map.
institutions holds dated from records (and optional inclusive through): cardinal_shortlist, nonresident_cardinals, college_offices, investiture_reform and investiture_concordat. Supply complete investiture.policies, excommunication, schism and balance tables. Ordered seed and authority tables, their numeric values and institution windows are validated before a papacy mod applies.

Ids and numeric values are locale-neutral mechanics. The `name` and `desc` fields on
authority bands, election laws, orders, blocs, tactics, and investiture policies are
pure-display text and fall back to the mod's authored English.

Saved Catholic governance lives in `state.papacy`, not in the definition. Its stable
collections are `obediences`, `cardinals`, `elections`, `realmObedience`,
`investiture`, `excommunications`, `archive`, and `regnalNameCounts`, plus temporary
continuity and decision records. Do not store rendered text in them. Cardinal and
obedience ids referenced by a save are protected by the ordinary active-mod
fingerprint.

`state.religiousHeads.catholic` deliberately remains the territorial Roman-office
pointer. Catholic-aware code should use `FB.popeRecognizedBy`,
`FB.papalObedienceForRealm`, `FB.romanPope`, and `FB.papacyInSchism` when recognition
matters; generic code may continue to use `FB.religiousHeadOf`. Other religions do not
use `state.papacy`.

### Great holy-war definitions

A centralized religious head may optionally authorize a global, two-camp campaign:

```json
{ "properties": { "head": {
  "officeId": "catholic",
  "realm": "papacy",
  "title": "Pope",
  "greatHolyWar": {
    "name": "Crusade",
    "minDate": { "year": 1095, "season": 3, "day": 1 },
    "firstTarget": "syria",
    "firstByYear": 1100,
    "yearlyChance": 0.25,
    "crisisChance": 0.75,
    "crisisKingdoms": ["armenia", "anatolia"],
    "crisisGroup": "muslim",
    "crisisShare": 0.25,
    "lossGuaranteeYears": 10,
    "sacredTargets": [
      { "kingdom": "syria", "counties": ["jerusalem"] }
    ]
  }
} } }
```

- `name` is localized pure-display text. The i18n key is
  `religion.<religionId>.head.greatHolyWar.name.default`.
- `minDate` is required and uses the normal 0–3 season and 1–90 day calendar.
- `sacredTargets` is required. Every `kingdom` must exist in the active bookmark and
  each listed county must belong de jure to that kingdom. A sacred target becomes
  eligible when at least one listed county is ruled by a faith outside the caller's
  accepted fold.
- `firstTarget` optionally restricts the faith's first launched campaign to one
  kingdom; one of its listed holy counties must be lost. `firstByYear` guarantees an
  eligible first AI call by that year.
- `yearlyChance` controls ordinary AI checks. `crisisChance` replaces it while at
  least `crisisShare` of the combined `crisisKingdoms` is controlled by
  `crisisGroup`.
- `lossGuaranteeYears` guarantees an AI call after that many uninterrupted years in
  which any configured holy county remains under a faith outside the caller's fold.

After the first launch, the engine also considers kingdoms whose bookmark population
is predominantly the calling faith and whose current controlled development is
predominantly held outside the caller's fold. Lost holy places rank first, then the
greatest displaced development, then stable kingdom id. A faith without both a
central `head` and `head.greatHolyWar` cannot call this system; this is how core Shia
Islam remains decentralized while a mod may opt it in.

The active campaign is saved in `state.greatHolyWar`; scheduler clocks, cooldowns, and
the compact campaign record live in `state.greatHolyWarHistory`. A protagonist's vow
is `state.player.greatHolyWar`. These are additive fields and do not change save format
3. Campaign-generated rulers set `realm.religion` explicitly, while old saves and
authored realms without it fall back to the capital population faith. Player vow terms
are:

```js
{
  seasons: 4 | 8 | 12,
  desire: { kind:"crown"|"sacred"|"duchy"|"county"|"honor"|"neutral", id:null|"..." },
  beneficiary: null | charId,
  served: 0,
  mustered: false
}
```

AI attacker participant records add `vowSeasons`, `desire`, `served`, `mustered`, and
`vowOutcome`. Completed history uses locale-neutral `vowOutcome`, `desire`, `vows`,
`settlementContested`, `objections`, and compact award summaries.

New attacker settlements store
`{schema:2,case,captured,applied,pendingPlayer,awardRealms,mainRealmId?}`. The
consumer-neutral case shape is:

```js
{
  schema: 1,
  kind: "holy_war",
  seats: [realmId],
  assets: [{ id, kind, ids, awardIds, rank, land }],
  claims: [{
    claimant, asset,
    basis: { contribution, vow, occupation, right, support, office },
    weight, blessing, beneficiary, confirmation, localCadet, sourceRealm
  }],
  awards: [{
    asset, claimant, form, terms, beneficiary, runnerUp, move,
    confirmation, localCadet, sourceRealm
  }],
  step: 0,
  status: "open" | "resolved",
  standing: 2,
  nextClaimBoost: 0,
  blessingUsed: false,
  blessed: null,
  objections: 0,
  contested: false,
  playerHead: false,
  playerDiplomacy: 0
}
```

Asset kinds currently are `crown`, `sacred`, `duchy`, and `county`, but the settlement
engine does not hard-code consumer transfer behavior. Basis objects and asset kinds may
be extended. The holy-war consumer alone mutates realms after every award is collected.

Public campaign APIs are:

- `FB.greatHolyWarTargets(state, religionId)`
- `FB.canCallGreatHolyWar(state, religionId, kingdomId?, callerRealm?)`
- `FB.callGreatHolyWar(state, religionId, kingdomId, callerRealm?)`
- `FB.joinGreatHolyWar(state, camp, realmId?, vowTerms?)`
- `FB.withdrawGreatHolyWar(state)`
- `FB.greatHolyWarWithdrawalCost(state)` and
  `FB.addGreatHolyWarContribution(state, realmId, points)`
- `FB.greatHolyWarCamp(state, realmId)` and
  `FB.greatHolyWarEnemies(state, realmId)`
- `FB.resolveGreatHolyWar(state, "attackers"|"defenders", reason?)`
- `FB.greatHolyWarSettlementMove(state, move)`
- `FB.greatHolyWarSettlementChoice(state, accept)`
- `FB.greatHolyWarPlayerRewardBand(state)` (deprecated projection over the new
  likely/actual award; it does not use the old contribution thresholds)
- `FB.repairGreatHolyWar(state)`

The generic engine loaded from `js/settlement.js` exposes:

- `FB.settlement.create(spec)`
- `FB.settlement.current(settlementCase)`
- `FB.settlement.act(state, settlementCase, move)`
- `FB.settlement.repair(settlementCase, spec)`

Moves are `acquiesce`, `press`, `endorse`, `terms`, `object`, and the non-resolving
`bless`; selection-bearing moves use `{kind,claimant}`. The engine scores and records
awards but never transfers a province. Realm consumers may use
`FB.assignRealmRulerCharacter(state, realmId, charId)` to put a living non-reigning
character on a generated realm without replacing personal family links. Awarded realms
may store `sacredCustody:{religion,siteIds,campaignId,grantTurn}`.

Do not render occupation as ownership or change `state.owner` during the campaign.
`js/holywar.js` freezes objectives, maintains temporary occupation, collects settlement
awards, and applies the complete owner/holder map only after the council resolves.

The core random field events `ghw_pilgrims_under_arms` and
`ghw_swords_seeking_banner` use `ghw_has_field_host`, so they are available only to a
valid sovereign attacker or defender during the active phase with a living player host.
Their custom handlers migrate old host composition through `FB.hostUnits`, then update
the selected unit class, `host.men`, and `host.size` together and request a map redraw.
The event effects pay any recruitment price separately. Recruits therefore affect
normal composition quality, siege strength, reinforcement, and logistics immediately,
but are not saved anywhere outside that exact host.

`data/map_data.js` ends with `FBDATA.balance`: every economy/war/mortality knob in one place.

### Layered balance

FBDATA.balance is the active table the engine reads. It is composed in a fixed order, each layer replacing the whole value of the keys it names:

1. global: the table in data/map_data.js;
2. era: the balance object of the campaign's era in FBDATA.eras (data/eras.js);
3. government form: the balance object of a realm's form in FBDATA.governmentForms (data/political_institutions.js), for that realm only;
4. bookmark: the bookmark's own balance object;
5. mod: the balance object of each runtime or bundled mod, in mod order. As before, a countyCommunityProjectPolicies object merges by policy id instead of replacing the table.

The era, bookmark and mod layers are campaign-wide: activating a bookmark composes them into FBDATA.balance, so every read of a key sees the result, and a key no layer names keeps its global value. A restored save recomposes the table from its stamped era (state.start.era) and its bookmark, so it plays with the same values it was saved with. Nothing about the layers is saved.

The government-form layer is realm-scoped. It applies only where the engine reads a value through FB.balanceFor(state, realmId, key) for a specific realm, and only when neither the bookmark nor a mod names the key. These sites read through FB.balanceFor today: the AI campaign host (levyPerDev, aiHostPerDev) and the AI construction reserve (realmReserveSeasons). Other reads of a key a form overrides take the campaign-wide value.

Era, government-form and bookmark overrides may name existing keys only. Validation rejects an unknown key, a non-number where the default is a number, and any other change of a value's type; for an era or a form the fault appears among the data faults that block bookmark activation. A mod's own balance object may still add new keys, and era, form and bookmark overrides may then name them.

Settlement fiscal output and AI construction tuning uses:
`settlementVillageTax` (0.75g/season),
`settlementTownTax` (2.00g/season),
`settlementCityTax` (4.50g/season), and
`aiMaxBuildingsPerYear` (1 building per AI realm annually).
Player-capital relocation uses three signed/core numeric keys:
`capitalRelocationPrestigeCost` (200),
`capitalRelocationPopularOpinion` (-15), and
`capitalRelocationVassalFavor` (-15, applied to each direct vassal). The first is
clamped to a non-negative price; the two signed standing changes are clamped to the
ordinary -100…100 range before application.
Adding one county or a grouped set of remaining de jure counties to an existing direct
vassal uses `vassalLandGrantStanding` (10) once per confirmed grant. The recipient's
existing feudal-service charter and tenure continue unchanged. A grouped grant that
leaves a count controlling the complete de jure duchy promotes the realm to rank 2 and
restyles it as that duchy; individual grants do not change rank. Existing saves receive
the same recognition once during restore, and later province transfers check only the
receiving count, so the rule adds no realm-wide work to daily or yearly fast-forward.
County support costs are defined by `aggressive_rule` and `conquered_without_right`
in `data/modifiers.js`; the former personal `warAggressionCommonVoice` key is no
longer used. War-of-Aggression political tuning uses `warAggressionMemoryDays` (2,880),
`warAggressionPrestige` (-20),
`warAggressionVassalStanding` (-10), `warAggressionForeignStanding` (-5),
`warAggressionEscalationPerRecent` (0.5), and
`warAggressionBreakawayPerRecent` (0.5). Signed political changes scale by
`1 + recent declarations × warAggressionEscalationPerRecent` and clamp at their normal
resource or Standing bounds. Recent declarations also multiply player-crown vassal
breakaway pressure; negative Standing compounds that pressure. Non-negative window and
multiplier values are enforced at runtime, and zero recent declarations preserve the
ordinary `breakawayChance`.
Every ordinary player war also applies `warEnemyStandingCeiling` (-60) once when
hostilities begin. If Standing with the opposing ruler is higher, it falls to this
ceiling; a worse existing relationship is not improved. Old active wars receive the
same one-time adjustment during save repair.
Guild-monopoly terms use this moddable table (fractional bonuses, base-gold fees):

| Grantor tier | `years` | `enterpriseBonus` | `rulerFee` | `taxBonus` | `popularOpinion` |
|---|---:|---:|---:|---:|---:|
| Baron (`3`) | 3 | 0.15 | 25 | 0.02 | -5 |
| Count (`4`) | 4 | 0.18 | 40 | 0.03 | -6 |
| Duke (`5`) | 5 | 0.21 | 60 | 0.04 | -8 |
| King (`6`) | 7 | 0.25 | 90 | 0.05 | -10 |
| Emperor (`7`) | 10 | 0.30 | 140 | 0.06 | -12 |

Religious-office tuning uses `religiousHeadWarOpinion`,
`religiousHeadWarPietyRetained`, `religiousHeadAbsolutionGold`,
`religiousHeadAbsolutionPiety`, `religiousHeadAbsolutionOpinion`,
`religiousHeadRestorePiety`, `religiousHeadRestorePrestige`,
`religiousHeadRestoreOpinion`, `religiousHeadVacancyDays`,
`religiousHeadClaimPrestige`, `religiousHeadClaimPiety`,
`religiousHeadClaimMinRealm` (county floor for vacant-office claims: the player's
demesne, an AI realm's whole bloc), and `religiousHeadClaimWarPrestige` (reward for
winning the Sunni succession war).
Great holy-war tuning uses the `greatHolyWar*` keys beside them: preparation,
resolution/collapse cooldowns, deadline, volunteer cap, siege requirement/rate/decay,
resolve shifts, withdrawal costs, and field-recruit sizes
(`greatHolyWarVolunteerMen`, `greatHolyWarKnightMen`, and
`greatHolyWarAdventurerMen`; mercenary recruits use `mercCompanySize`). Settlement weighting uses
`settlementContributionWeight`, `settlementVowWeight`,
`settlementOccupationWeight`, `settlementRightWeight`,
`settlementSupportWeight`, and `settlementOfficeWeight` (defaults `.25`, `.20`, `.20`,
`.15`, `.10`, `.10`). The legacy `greatHolyWarCrownShare`,
`greatHolyWarDuchyShare`, and `greatHolyWarCountyShare` keys remain readable for old
mods but no longer decide an award.
`religiousHeadWarPietyRetained` is a multiplier on the attacker's current piety
(the core value `0` forfeits it all); the opinion fields are signed changes.
The top-level `currency` presentation schema is documented above. The deprecated
`balance.coinageSymbol` alias changes only the topbar purse icon when no full currency
definition is active; it never renames internal gold or alters amounts, costs, or contracts.
`mortalityBase` scales the whole yearly mortality curve for player and kin alike
(0.012 is the as-authored baseline; halve it for longer lives, raise it for a crueler age).
Learned-career examinations use `careerExamBaseChance`,
`careerExamLearningBonus`, `careerExamSkillBonus`, `careerExamMaxChance`, and
`careerExamCooldownDays`. The chance begins at the base, adds the Learning bonus for
each effective Learning point above its requirement and the skill bonus for each point
above every other required skill, then caps at the maximum. Failed attempts wait the
cooldown in game days. `learnedPractitionerMortality` is the default yearly mortality
reduction for a licensed Medicine practitioner without a specialty; specialty
`fx.mortality` replaces it, and only the household's single best local provider applies.
Bounded auction tuning is `auctionOpeningBidRatio`, `auctionBidIncrementRatio`,
`auctionRivalMaxRatio:[low,high]`,
`auctionCountyClaimValue`, `auctionCooldownDays`, and `auctionMaxBidRounds`. The core
auction has one saved immediate rival and never treats those values as a simulated
market inventory or NPC purse.
`richChildMortalityBonus` is the fraction of childhood mortality removed per
station above serf for the household's own children (and a child protagonist),
and `richChildHealthChance` the yearly chance per station that such a child
gains a point of health, up to 8.
That includes the wider-family simulation: `kinMarryChance` and `kinChildChance` are the
per-year chances that an adult kinsman weds, and that a wed kinswoman bears a child.
`kinConceiveCap` (core 0.75) upper-bounds the effective yearly kin conception chance, so
stacked fertility multipliers stay a probability instead of a certainty. `familyMaxChars`
(core 4000) bounds the player family's tracked character records, living and dead: past
it, unscripted kin weddings and kin births pause (sealed betrothals still wed), keeping
the save inside the browser's localStorage quota and the kin scan's per-day cost flat.
`fertilityByAge` shapes how age wears on conception: per sex (`f`/`m`), a list of
`[age, multiplier]` points read by `FB.ageFert` — flat before the first point, linear
between points, flat past the last. The default curve holds women at full fecundity
through 25, slides gently to 30, drops sharply after 35, and nears nil at 45 (past 45
conception is impossible regardless); men stay full through 40 and decline mildly into
old age. The multiplier stacks with trait leanings and each character's hidden
fertility roll at every conception site (the player's household and kin alike).
The marriage-of-station knobs live there too: `dowryByStation` (gold by the spouse's rank
0–4; the bride's house pays, and protagonist courtship snapshots the resulting
amount/direction before proposal), `marryUpPrestige` / `marryDownPrestigeLoss` (per step of difference),
`proposalStationPenalty` (chance lost per step the suitor stands above the player), and
`marriageProspectRefreshDays` (the shared protagonist and per-descendant family-search
cooldown; core 30 days). **Seek a match** takes its prospect identities from the current
county's ordered `communities`: authored culture/faith pairs come first, then distinct
local cultures and faiths recombine. A county without an authored list has its single
principal culture/faith pair.
`wivesByGroup` is deprecated compatibility data used only when a legacy faith has no
effective `properties.marriage`; new spouse limits belong in the faith graph.
Rivalry tuning uses `rivalOpinionThreshold`, `rivalClaimChance`,
`rivalContactMaxAge`, `rivalHeatPlayerStart`, `rivalHeatNpcStart`,
`rivalHeatLegacyStart`, `rivalHeatOldSave`, `rivalContactHeat`, `rivalHeatDecayDelay`,
`rivalHeatDecay`, and `rivalPeaceDays`; time values are game days.
`itemSellRatio` is the fraction of an item's `value` a buyer pays when the player sells it.
Ordinary rank claims read per-rung costs from `rankElevationGoldByTier`,
`rankElevationPrestigeByTier`, and `rankElevationPietyByTier`; indexes are player tiers
0–7, and indexes 0–1 are unused because Serf freedom has its own pricing. Core values for
new tiers 2–7 are respectively 200/100/0, 500/250/0, 800/400/0, 1500/600/0,
3000/1000/300, and 6000/1500/600. `FB.rankElevationCost(state,fromTier,toTier)` sums
every crossed rung. `FB.rankElevationStatus` exposes current eligibility and the exact
quote; `FB.queueRankElevationOffer` and `FB.claimRankElevation` are the opt-in ordinary
transaction. Do not place this price in `FB.setPlayerTier`: generic authored/mod
`tierSet`, inheritance, offices, exceptional grants, and save repair deliberately remain
free. A fall does not discount a later ordinary claim.

Ordinary elevation from Gentry to Baron additionally uses `baronyPrestige` and
`baronyOpinion`; the petition deed requires those thresholds, as well as a gentle house
established by an earlier generation of the line. The unsolicited offer keeps those
eligibility gates but is an exceptional free grant and retains its authored reward.
The exceptional founder-life military route uses `militaryBaronyMartial` and
`militaryBaronyPrestige`; these gate taking command, while the barony itself still
requires that exact patron's sovereign host to win a live field battle.
`liegeGrantRepeatMult` is the multiplier applied to grant odds for each successful barony,
title, neighboring fief, or court-awarded escheat already received in the current lifetime.
Skills are uncapped but grow on a diminishing-return curve: below `skillSoftCap`
(default 20) every gain lands; from 20 onward each point must beat a
`(skillSoftCap / current)^2` roll (`FB.gainSkill`, js/model.js). At and beyond
`skillMasteryThreshold` (default 40), that chance is further multiplied by
`(skillMasteryThreshold / current)^skillMasteryPower` (default power 8). With the
defaults, per-attempt chances include 40→41 at 25%, 41→42 at 19.5%, 45→46 at
7.7%, 50→51 at 2.7%, and 60→61 at 0.43%. Advancement uses the raw trained skill;
traits and equipped items do not make training harder, while `FB.skillOf` returns
their full combined value with no upper ceiling. The former `skillHardCap` key is
no longer read; older mods that set it must migrate to `skillMasteryThreshold` and
`skillMasteryPower`.
`focusSkillGainRate` (default 0.75) multiplies only the authored seasonal skill-training
chances of daily focuses before they are converted to daily rolls.
The removed `wartimeNecessitiesSurcharge` and `priceWarPressure` keys are ignored.
Army provisions demand, hostile-county market shocks, and live local prices now express
wartime scarcity; mercenary contracts and the other fixed-real-gold boundaries remain
unmultiplied.
`levyPerMartial` grows the player's levy by that fraction per point of the ruler's martial
skill (traits and carried items included), on top of the per-development base, building
`levy` bonuses, and the `levy` tech multiplier.
Political attention uses `politicalAttentionCount` for counts and dukes,
`politicalAttentionKing` for kings, and `politicalAttentionEmperor` for emperors.
`foreignPolicyBase` is the opinion moved by an assignment each season and
`foreignPolicyDipCap` caps the additional Diplomacy contribution (Diplomacy / 20).
Foreign opinion adds `opinion / foreignOpinionEnvoyDivisor` to envoy success.
For AI declarations against the player it multiplies the base chance by
`1 - opinion / 100`, clamped between `foreignOpinionAttackMin` and
`foreignOpinionAttackMax`.
The field-army knobs drive the hosts on the map (`js/armies.js`): `armyMarchDays` (days to
cross one land province), `armySeaTransportBase` (national men per crossing cycle without
a completed transport tier), and `armySeaCrossings` (the `cycleDays` and `capacityMult`
for `narrow`, `coastal`, and `open` water legs). Effective crossing capacity is the
rounded national capacity times the class multiplier; an indivisible host needs
`ceil(men / effective capacity)` cycles and remains on the departure county until all
cycles finish. `armyRearmDays` (how long a shattered host must wait to muster
again), `armyReinforceRate` (the fraction of its mustered size a host resting on home
land refills per day), `armyDemusterKeepOwn` / `armyDemusterKeepRealm` /
`armyDemusterKeepOther` (the share of a voluntarily de-mustered host preserved for the
war's next muster — standing on the player's own county / elsewhere in the player's
sovereign realm / anywhere else; the cap is applied after levy modifiers and the
ordinary `armyMinMen` floor cannot add replacements), `aiHostPerDev` (default 0.3;
scales eligible realm development × `levyPerDev` for the combined AI campaign
force, with county/national modifiers and garrison deductions; personal settlement
capacity and stacked vassal dues do not discount this aggregate again), and
`battleWinLoss` / `battleLoseLoss` (battle casualty fractions — the winner's
scales with how close the fight was).
Terrain shapes the field through three moddable tables: `terrainBattleFactors`
(per-terrain per-class battle-quality multipliers for the baseline classes — a class's
own `terrainFactors` row in `FBDATA.unitClasses` overrides it, and a missing terrain or
class reads as 1), `terrainDefenseBonus` (the standing host's
home-ground power bonus by battle terrain; nonzero for hills, mountains, forest, and
marsh), and `terrainMarchMult` (the day-cost multiplier of marching into a province of
that terrain; sea crossings are untouched). Composition counters come from each class's
`counters` table in `FBDATA.unitClasses`, with the side's total swing capped by
`battleCounterMaxSwing` (0.2). Supply lines use `supplyRecoverRate`
(daily refill on own, sovereign, or allied land), `supplyFortRecoverMult` (the depot
multiplier in a friendly-fort county), `supplyDevastatedRecoverFloor` (the resupply
multiplier floor on a war-worn county), `supplyDrainBase` (daily drain on neutral or
hostile land), `supplyDrainTerrain` (per-terrain drain multipliers),
`supplyWinterDrainMult` (the drain multiplier in a local season of hardship, which is winter in temperate zones), `supplyDistanceDepth` (added drain per county of distance
from friendly land), `supplyAttritionPerDay` (fraction of the host lost daily at 0
supply), `supplyLowThreshold`, and `supplyLowPowerMult` / `supplyStarvedPowerMult`
(battle-power penalties below the threshold and at 0). Every host carries the saved
0–100 `supply` field; old saves default to a full 100.
Multiple hosts: a realm may field detachments alongside its primary host (the largest,
returned by `FB.hostOf`; `FB.hostsOf` lists them all; detachments are ordinary extra
records in `state.armies`). `armyMinMen` also bounds the split order — each part must
field at least that many men. `detachmentRearmDays` is the shorter rearm wait after a
destroyed detachment (tracked in `state.armyDetachmentDown`), while a shattered primary
still waits out `armyRearmDays`. `aiMultiHostStrength` is the muster size at which an AI
realm prosecuting an offensive war splits off a detachment, `aiMaxHosts` caps hosts per
AI realm, and `aiDetachmentFrac` is the men-share the detachment carries. A host with no
road home is cut off (`FB.hostCutOff`); one shattered while cut off is destroyed
outright and its beaten leader is captured at `captureChanceEncircled` instead of
`captureChanceBase`.
Player logistics use `hostLogisticsBase` (default 2) once for any raised host; each
class's `upkeepPer100` in `FBDATA.unitClasses` (levy 0.5, archers 1, cavalry and
men-at-arms 2, and so on) then multiplies each 100 live soldiers of that class;
`hostLogisticsMercenaryCompany` (4) is charged for each hired company. A missing
player host produces no logistics cost. These rates apply equally to ordinary and
sovereign great holy-war hosts. Professional replacement adds `cohortReplaceDays`
(default days to drill one replacement batch; a class's `replaceDays` overrides),
`reinforcementPremiumMult` (pending replacements cost their `upkeepPer100` × this
per 100 men while drilling, charged even with no host fielded, ending exactly when
the last batch completes), and `cohortMaxPerClass` (the most pending-plus-ready replacements one
realm's cohort ledger holds per class).
Loss-aware desertion uses `warDeserterMinCasualties` and
`warDeserterMinCasualtyRate`; the larger absolute-or-initial-host threshold is required.
`warDeserterDefeatWindowDays` defines how recently the host must have lost, while a
current two-loss streak also qualifies, and `warDeserterIntervalDays` limits resolution
to once per that many campaign days. `warDeserterLossMin` / `warDeserterLossMax` bound
the seeded fraction removed from the live host. Paying costs the ceiling of current
seasonal upkeep times `warDeserterPayUpkeepSeasons`, with `warDeserterPayMin` as the
minimum.

## Household doctrine properties

Doctrine catalog definitions may provide `defaultValue`, used only when the
effective inherited path is absent. Faith `properties.doctrines.observance` supplies
seasonal player piety, and `properties.doctrines.charity` supplies an affordable
seasonal gold expense with matching popular-opinion gain. Cultural
`doctrines.craftsmanship` is an additive multiplier on positive household-worker
wages; `doctrines.mutualCare` supplies non-stacking resident household mortality
protection. Core defaults are zero. See `docs/designs/doctrines.md` for core values.
New reform options require an encountered assignable identity actually following
their value, or must match the current or remembered parent identity.

### Historical item production

Additional procedural `art.kind` values are `mail_boots`, `plate_boots`, and `bascinet`.
The first two use the existing `feet` slot; the last uses `head`. They accept `metals`
and `leathers` palettes. Matching core knightly sets share technology, year, cultures,
and market rules across head/body/feet: mail uses `mail_hauberks` and 1200, plate uses
`plate_armor` and 1400. These remain ordinary independently equipped items.

Items may declare `requiresTech` (one technology id or an all-of array), `yearMin`, `yearMax` (the last production year), and `cultures` (county culture ids, inheritance-aware). An era's equipment window also skips an item whose own `yearMin`-`yearMax` window lies wholly outside it. These gate new random stock and finds through `FB.itemAvailability(state,id,pid)`, never existing ownership or explicit story grants. `militaryMarket:true` reserves market Masterworks for auctions while stalls and peddlers produce Plain/Well-made instances. Open offers are grandfathered. Item requirements participate in technology validation and detail discovery. Art additionally accepts `mail`, `lamellar`, `plate`, and `coif`.

## Cultural marriage lineage

The culture doctrine catalog adds `marriage_lineage` at `doctrines.matrilinealMarriage`
(boolean; absent defaults false). Its paternal/maternal options cost 175/300 prestige.
`FB.marriageLineageStatus(state,a,b,lineage)` accepts `paternal` or `maternal` and returns
`{ok,lineage,maternalAllowed,frozen,reason}`. Both effective cultural identities must permit
maternal terms when accepted. `FB.sealMarriageLineage` writes terms before linking a new
couple. Existing mutual pledges without terms must remain legacy, rather than being
silently normalized. `FB.preferredMarriageLineage` supplies autonomous preferences.

`FB.sealKinMatch` accepts `options.lineage`; `FB.doMarry` accepts `options.lineage` or the
current `player.courtshipTerms.lineage`; `FB.proposeRoyalKinMatch` accepts a fourth lineage
argument. New royal offer contexts include `lineage`. Missing legacy contexts remain valid.
`FB.childDynastySource` resolves the dynasty parent for both births and previews; callers
must snapshot that parent id and dynasty at conception when birth is deferred.

`FB.marriageCulturePersuasionStatus(state,target,partner,matchOptions)` returns readiness,
reason, probability (0-1), Standing threshold, heir flag, and prestige cost without writes.
`FB.persuadeMarriageCulture` revalidates and returns `{resolved,accepted,status}`; the action
caller completes one day only when resolved, just like royal marriage proposals. It uses
seeded `FB.chance`. Data-defined `marriageCulturePersuasion*` balance fields govern Standing,
base/rates/caps, heir multiplier, and refusal penalty. Culture price and cooldown reuse
`cultureAdoption*`. Knowledge and attempt state schemas are in
[state-and-saves.md](designs/state-and-saves.md); all additions retain format 3.

### Voluntary ordinary-war peace confirmation

An event option may set `confirm:'war_end'` for the built-in `war_accept_tribute`, `war_terms`, `war_negotiated_withdrawal`, `war_submit`, or `war_submission_tribute` custom effect. The blocking confirmation quotes current terms and revalidates the same war/option before resolution. Cancel or Escape returns to the same event. Category automation shows events with this metadata; explicit Resolve everything may resolve them. IDs and confirmation metadata are semantic, not translated display fields.


## Local commons uprisings

A refused `commons` collective demand may start the bounded local-uprising lifecycle
for a tier-4+ protagonist's directly held counties. `commonsUprisingMaxCounties`
(default 3) bounds the initial roster, with the demand's county first and other
unprotected direct holdings in stable id order. The cap applies only at inception.
`commonsUprisingSpreadDays` (30) controls gradual spread: one unvisited eligible neighbor
of an active county after each sustained low-support interval. Direct and subordinate
counties in the player subrealm qualify; foreign and sibling-vassal lands do not. Each
new county has its own acknowledged warning and disruption deadline.
`balance.commonsUprisingSupportThreshold`
(default -20), `commonsUprisingRecoverySupport` (-10, strictly exceeded),
`commonsUprisingWarningDays` (90), and `commonsUprisingCooldownDays` (1080) control its
entry, recovery, grace, and repeat timing. `modifiers.commons_uprising` supplies the
180-day county tax/levy disruption. `commonsUprisingMinReduction` (0.25)
and `commonsUprisingFullReductionSupport` (-100) set the live linear severity
range, starting at `commonsUprisingSupportThreshold`. The penalty multiplies
output after other county modifier bonuses; severity is derived rather than saved. The original demanded privilege must wrap a known
county modifier; its already-approved concession is grandfathered against later tech loss.
The registered `commons_uprising_valid` context validator and `commons_uprising_defer`,
`commons_uprising_spread_defer`, `commons_uprising_concede`, `commons_uprising_suppress`, and `commons_uprising_endure`
custom handlers only act on the matching saved incident. `commons_downfall_available`
keeps the old commons downfall chain from beginning during this incident or cooldown.
The optional record and replay-safe restore behavior are documented in
[State and saves](designs/state-and-saves.md). No save-format bump is required.


Local holder negotiation uses `commons_uprising_local_negotiation`, with the
`commons_uprising_local_valid` extension of the shared uprising validator and `commons_uprising_local_settle` /
`commons_uprising_local_failed` custom outcomes. Player talks cost 20 gold and use
`skill_dip`; success grants the demanded privilege only in the player's participating
direct holdings, without direct stored support/prestige changes. The pure
`FB.commonsUprisingLocalTerms(state, rulerId)` supplies exact scope, eligibility, cost,
and chance. `FB.commonsUprisingLocalContext(state)` captures player terms and
`FB.negotiateCommonsUprisingLocal(state, context)` uses the shared event resolver.
`commonsUprisingLocalNegotiationDays` (30) delays autonomous AI-holder negotiations
from their first county's involvement. AI uses actual ruler Diplomacy, the same
concession burden, and no player treasury debit. One saved attempt per holder prevents
repeated daily or reload rolls. Technology impact is `local_commons_settlements: none`.

## Ordinary campaigns and sovereign war laws

`state.wars[id]` stores `{id, attacker, defender, legacyOwner, enemy, defending,
status, startedTurn, objectives, occupations, casus}` plus campaign counters and
event/history fields. `attacker`/`defender` are authoritative; `enemy`/`defending`
are compatibility projections from the player's side where participating. An
objective has `target`, `type`, and optional `titleKind`/`titleId`. Occupations are
keyed by county and hold `occupied`, `progress`, and a fort-level snapshot.
Do not add duplicate wars by writing to multiple realms. Use
`FB.registerOrdinaryWar(state, ownerId, record)` and explicit IDs for settlement.

Read-only interfaces: `FB.realmWars(state, realmId)`,
`FB.ordinaryWarById(state, warId)`, `FB.ordinaryWarBetween(state, a, b)`,
`FB.warDeclarationPreview(state, attacker, causes)`, and
`FB.claimPackageCandidates(state, attacker, defender)`.
`FB.startClaimPackageWar(state, causes, options)` accepts player-owned connected
rights; `confirmUnlawful` and `confirmSacrilege` must be explicitly confirmed where
applicable. `FB.assignHostCampaign(state, hostId, warId)` preserves men and supplies.

Policies `internal_peace` and `external_campaigns` have `customary`, `permission`,
and `prohibited` levels. Actual levels live in `state.warLaws[sovereign][policy]`,
with proclamation stamps; definition names/descriptions are localized policy data.
Operational event contexts include `warId`, `warEventId`, and `warEnemyId`. Use
`FB.queueWarEvent` inside an explicit `FB.withOrdinaryWar` scope. Saved prose
remains message descriptors. There are no new event effect or trigger keys.

The liege's demand for peace uses the dedicated `war_peace_demand` event, with
Comply and Refuse choices, rather than campaign-sheet buttons beside Withdraw.
Compliance ends only the demanded war, without withdrawal prestige cost; refusal
retains the war and permits enforcement. The event shows the calendar deadline.
Its context carries `warId`, `demandLiege`, and `demandDeadline`; the validator
rejects ended wars, answered or expired demands, and changed lieges. Pending
legacy demands queue once on the next campaign day. Campaign withdrawal remains
an independent action. No new event trigger or effect keys are introduced.

### County Popular support

`state.countySupport[provinceId]` is the sole stored base support score (-100 to
100, default zero). `FB.countyPopularSupport(state,pid)` adds local temporary
effects. `FB.setCountySupport` and `FB.adjustCountySupport` invalidate derived
views. Event `popularOpinion` effects and `popularOpinionBelow` checks use the
context location, falling back to the household current county. `player.pop` is
legacy-only and removed during load repair.

Modifier definitions can use `recoverSupport:true` and `supportPerStack` for
unjust-war support effects. Instances persist optional nonnegative `supportDebt`,
`supportStacks`, and numeric `supportSince`; support debt recovers in annual
steps until `endTurn`. County taxes and levies multiply ordinary effects by
`clamp(1 + countyPopularSupport / 100, 0, 2)`, then local uprising resistance.

### Armed revolt balance

`revoltConcessionGold` (180), `revoltNegotiationGold` (120), and
`revoltSuppressionGold` (150) are fixed gold per summed severity unit.
`revoltGoldShare` (0.20) and `revoltPrestigeShare` (0.10) charge current resources
once per response. `FB.revoltResponseTerms(state,counties,rulerId)` supplies
quotes; uprising event text receives `revoltConcessionGold`,
`revoltNegotiationGold`, `revoltSuppressionGold`, `revoltPrestige`,
`revoltNegotiationChance`, and `revoltSuppressionChance`. The named chances are
`revolt_negotiation` and `revolt_suppression`. New custom effects are
`commons_uprising_buy_concession`, `commons_uprising_pay_negotiation`,
`commons_uprising_pay_suppression`, and `commons_uprising_suppression_failed`.
`uprising_settlement` and `uprising_response_cost` are county modifiers; their
records use the existing modifier schema. See designs/descent.md for formulas.


### News audience

`FB.news(state, message, options)` accepts an optional numeric `audience` bitmask:
1 for family/personal news, 2 for the player's realm, 4 for wider world news.
Bits may combine. Without it, the message key and semantic ids/proper-name
parameters supply a compatibility classification. New scoped emitters should
supply the audience explicitly when the subject is not present in their message
parameters. Audience controls presentation only: every entry remains archived.

Packed `state.chronicle.entries` rows created by the engine or normalized on restore
are deeply frozen historical snapshots. To correct an archived entry, replace its
whole row with a JSON-safe copy; do not mutate nested packed message or receipt data.
The array remains mutable. Replacement rows are saved immediately, while unchanged
immutable rows reuse their encoded representation. Recent-log records remain mutable.

Call `FB.invalidateTechBonuses()` after directly changing nested `FBDATA.tech[id].fx`
values. Normal `FB.mods.apply` technology patches do this automatically. Completed
research-list edits and table replacement are detected by bonus readers themselves.
Routine world Chronicle retention is independent of notification settings; the
archive's optional `retention` record reports its five-calendar-year window and
cumulative pruned count. Explicit family/realm audience bits protect relevant news.

`FB.save.toSlot(slot, callback)` accepts a synchronous snapshot and reports durable
success through `callback(ok)` after IndexedDB commits or localStorage fallback
succeeds. Its boolean return now means the request was accepted, not that an
asynchronous write has committed. Callers must wait for the callback before reload
or success confirmation. `FB.save.read` reads the hydrated or pending snapshot;
boot calls `FB.save.initStorage` before exposing save controls.

## AI treasury accounting foundation

`FBDATA.balance.aiTreasuryOpeningSeasons` defaults to 2;
`aiTreasuryOpeningFloor` is indexed by AI realm rank (0 through 4), defaulting to
`[0,10,20,30,40]`. These initialize legacy/new-game accounts once.
Active accounts replace provisioning purses and gate optional spending.

`FB.treasuryAvailable(state, realmId)` and `FB.treasurySummary(state, realmId)` are
pure reads; the summary identifies active accounts with `accountingOnly:false`. `FB.treasurySnapshot(state)`
builds the seasonal numeric projection and must not be called from daily UI refreshes.
`FB.treasuryCreateRealm(state, id, sourceId, share)` transfers a clamped share of
uncommitted source cash once. `FB.treasuryRetireRealm(state, id, recipientId)` transfers
signed assets/obligations or retires them; active player inheritance credits net coin once.
New realm writers must call the creation hook at their existing mutation boundary.
For territorial creation, prefer `FB.treasuryCreateFromCounties(state, id, countyIds)`
before changing holders: it transfers each donor's proportional uncommitted cash in
one county pass and prevents confusing sovereign ownership with direct fiscal holding.
`FB.countyTaxBase(state, provinceId, rate, optionalLocalTaxBonus)` shares the existing
county tax formula; the optional bonus supports a batched caller's precomputed inputs.
See `docs/plans/archive/ai-treasury.md` for the required activation and migration contract.


### Annual rank prestige balance

`FBDATA.rankPrestigeYearly` in `data/economy.js` holds three numeric lookup tables:
`ruling` by player tier, `guild` by saved guild-rank id, and `religious` by stable
religious step id or `cardinal` / `pope`. Missing or invalid amounts are zero;
negative amounts clamp to zero. These are flat yearly rewards, independent of
rank advancement's `prestigeGain` and seasonal `pietyYield`. The highest eligible
religious amount counts, then ruling and guild amounts add to it. This source
rankPrestigeYearly root replaces supplied ruling, guild or religious rate groups as complete maps; omitted groups are retained.


## Scoped authority definitions (476 development branch)

`data/political_institutions.js` defines `FBDATA.authorityOffices`,
`FBDATA.legitimacySources`, `FBDATA.customaryBases` and
`FBDATA.governmentForms`. A government form names a registered strategy for
each behavior slot: `holders` (how an authored realm's counties get holders at
creation: `feudal_vassals` or `direct`), `succession` (`dynastic`, `office` or
`acclamation`), `territory` (`fixed` or `non_territorial`) and `consent`
(`territorial` when the realm's territorial rule answers local civic consent,
`delegated` when that needs an office). The remaining levy, revenue, council, diplomacy, ai and ladder slots may be omitted by older mods and resolve deprecated engine_default aliases of named strategies. Vocabulary is retired; use the government lexicon layer. `FB.governments.validate` rejects a form that names an
unregistered strategy or omits a required slot. The `territorial`
form is required as the legacy fallback. An office ID has
`powers` (`ban`, `peace`, `revenue`, `consent`), allowed `scopes`
(`host`, `county` or `realm`) and `succession` (`reaffirm` or `continues`), plus
`recognitionSources` naming which legitimacy sources may support it.
A Ban office must include host scope; Peace, Revenue and Consent need county
or realm scope. A legitimacy source specifies whether
issuer succession requires reaffirmation. Customary basis IDs identify the
recorded legal origin without implying ownership. `FB.validateAuthorityData`
checks these tables when a bookmark activates. Definitions are semantic; phase
4 supplies localized period labels.

`state.authority` uses the optional v4 authority schema. Normal save/export
writes envelope v:4, titleIds:1, authoritySchema:4, platformSchema:2;
supported v3 data migrates without inventing authority records. Mods must preserve the saved fingerprint,
rank-scoped title references and durable authority IDs. Unknown formats, ambiguous
titles and malformed authority records fail before state adoption. See the
[Phase 6 compatibility contract](plans/v2-476-phase-6.md).
`governments` stores explicit realm form choices; omitted realms project the
campaign's stamped `state.start.defaultGovernment`, or the legacy territorial
form when a save has no stamp, without a new saved record.
`appointments[]` hold office ID, institution realm ID, typed appointer and
holder, exact scope, term, status and optional recognition ID. `recognitions[]`
hold a source, typed issuer/subject, scope and succession stamp.
`contracts[]` hold patron and federate realm IDs, optional exact host and
imperial recognition ID, seasonal pay, expiry, ruler approvals and
paid/fulfilled stamps. A linked recognition must be issued by the patron for
the federate realm; its loss ends effective service. Optional
`settlementAwards[]` promise a county site to a named character; the
ordinary settlement grant quote must still succeed when the award is paid.
`rights[]` hold beneficiary, issuer, county, power, customary basis,
strength and transition history. `receipts[]` prevent a reviewed county
render obligation from being collected twice. Judgment and detached tenure origins require a
semantic `basisRef`; recognition names its active record ID, and possession needs an
actual holding. Later positive transitions carry evidence. A record never changes `state.owner` or
`state.holder` by implication. Omit `state.authority` from old campaigns.
Derived power, office and consent projections are never saved.

## 476 regional campaign fields

A bookmark realm may set `nonTerritorial: true` to keep a named political actor and host without claiming its capital county. The capital must still name a settled county as an on-map anchor. The 476 prototype uses this for the federate body; it does not grant tax, court or land. `startScenarios` may set `bookmarkIds`, `fixedProvinceId`, `startAge`, `startCulture` and `startReligion` for an authored beginning. The fixed county must be present in that bookmark. An ordinary start requires its culture/faith pair among the county residents; an existing ruler retains the matching authored court identity, which may differ from those residents. A scenario may also set eras (offered only in bookmarks of those eras), alwaysUnlocked (skips the starting-rank lock), familyPresets (an object mapping the allowed family preset ids, in picker order, to optional name, diff and desc labels; the first is the default) and tracks (player-track story ids attached at creation). Runtime mods are checked for these fields too: bookmarkIds and eras must name known bookmarks and eras, a fixedProvinceId needs bookmarkIds, startCulture and startReligion, familyPresets keys must name family presets, and tracks must name registered track stories. A bookmark may set stories, a list of registered world story ids attached at creation; validation rejects an unknown or non-world id. Trusted story types register factories at load time; JSON storyInstances compile before the effective registry is sealed. See designs/stories.md for the hooks. The western court story saves its cast, opening appointments, displacement and the courts' bargain under state.stories.western_court_476. Independent world stories save the eastern return, western office and each historical campaign. The federate track saves the household's own choices and commitments. Former historical fields migrate once into independent records without declaring a war or paying again. The bookmark may add scenario-only sea crossings in `straits` with matching `crossingClasses` entries. Late antique faiths select ordinary `religiousPaths` from their inherited faith properties. The `civic_clerk` career is a baseline service path without a research gate, scoped to the late_antique era through its eras list. `FB.setCareer` and the choice list both enforce that scope. Use public authority, war, career and settlement transactions rather than editing these flags from a mod. See [the design](designs/situation-476.md).

Scheduled games extension interface

FBDATA.tournaments is loaded from data/tournaments.js. The tournaments runtime-mod root merges fields into existing scales (local, regional, grand), programmes (martial, mounted, lists), tracks (joust, melee, archery, wrestling, perform, trade, carrying, kitchens, stables, repairs, guarding, treatment, watch), and tactics (conservative, balanced, aggressive, assist). Keep ids, prize-bucket mappings, skill keys and character eligibility semantic; localize only name/desc. The duration, notice, world-capacity and record-retention constants are not exposed through this mod root. New activity ids declare matching tournamentRules records using the supported resolution kinds; genuinely new algorithms require engine implementation.

FB.tournaments exposes pure quote, entry, roundPreview, travelQuote, capacity, eligibility and calendar reads, with separate book, enter, resolveRound, depart, cancel, withdraw, tick and reconcile mutations. Never charge or roll from a preview. Confirmation must pass the exact review signature. Scheduled event records use contextValidator scheduled_games_valid and tournamentId, tournamentCharId, tournamentTrack, tournamentRound, tournamentKind. Each custom effect has its own impact adapter. Legacy invitation ids and option indices remain valid for queued saves. Full schemas and formulas are in designs/tournaments.md and plans/tournaments-and-regional-games.md.

Station ladder definitions

FBDATA.eras entries may declare ladder objects with bands (keys 0 to 7), ranks (keys 0 to 4) and social (keys 0 to 4). FBDATA.stationLadders.feudal supplies the shared complete baseline. Government forms may select a ladder strategy registered through FB.governments.register('ladder', id, overrides); the strategy supplies partial rows over the era definition. eras and governmentForms are validated runtime-mod roots; executable ladder strategies remain trusted engine registrations. A missing or null era ladder and an omitted form ladder retain the shared baseline.

Band fields are used (boolean), order, eligibilityTier, socialStation, realmRank and previous (integer scale mappings), role (serf, commoner, gentry, lord or crowned), succession (personal or dynastic), promotion (null or an object with route and next) and named permission flags. Promotion routes are freedom, manor, barony, county, higher or standing; next is null or a band from 0 to 7. Permissions include the existing FB.station meanings plus mayCommand, mayAdministerJustice, mayArrangeDynasticMarriage and maySeekCounty. Rank rows declare order, tier and the FB.realmRank meanings. Social rows declare order and isLowborn, isFree, isGentle, isNoble and isRoyal. A supplied false flag overrides inherited true. used:false disables that band's permissions and data-threshold eligibility without changing saved identities.

A standing promotion declares cost with finite nonnegative gold, prestige and piety amounts, and a nonempty paths array of requirement objects. Each path may name finite nonnegative wealth, prestige, years, counties and standing minima; roles is a nonempty array of known career roles; office and sovereign are boolean requirements; source names a registered legitimacy source. All criteria within one path apply together, and satisfying any path is sufficient. office requires an effective personal appointment, while source requires live recognition. County counts mean directly held counties. standing requires a living local patron or sovereignty. Optional countyGrant:true requires an eligible county and an ordinary investiture. Quotes recheck every criterion and exact cost; paths never themselves create an office, territory, tenancy or inherited property. Late antique data uses this route; medieval defaults remain unchanged.

Action eligibility may declare station, the name of a supported station permission, alongside tierMin/tierMax and the other existing restrictions. Both named and numeric restrictions apply when both are supplied. Council seats may declare station; built-in seats use mayHoldCouncil. A legacy seat without station requires tierMin and the ladder's mayHoldCouncil permission. Sparse era/form rank label arrays must label every used band; unused positions can be null or absent. Missing individual labels fall through to the next lexicon layer, retaining the requested band index.

Religious head office schema

Declare a head under a faith's properties. A realm appointment example is { "head": { "officeId": "high_council", "title": "High Elder", "holderKind": "realm", "realm": "my_realm", "succession": "appointment", "seat": { "site": "paris" } } }. A character succession example is { "head": { "officeId": "keepers", "title": "Keeper", "holderKind": "character", "succession": "hereditary" } }. Characters must be living followers of a faith recognizing that office, with holderSex satisfied when supplied. Assign a character through FB.assignReligiousHead(state, faithId, characterId), or call FB.succeedReligiousHead(state, faithId, { holderId:characterId }). Missing heirs leave a vacancy; appointment without holderId chooses the oldest eligible living follower. Realm holders follow their ordinary realm ruler succession.

seat may be a province id string, { "province": "london" }, or { "site": "paris" }. A site resolves to its province in the current settlement layout. holderKind accepts realm or character; succession accepts the registered papal_election, caliphal_claim, appointment and hereditary strategies. Papal and caliphal strategies require realm holders. Missing legacy holderKind defaults to realm; legacy systems.papacy implies papal_election, recovery claim implies caliphal_claim, and other heads imply hereditary. A Papal head enables systems.papacy when that capability is unspecified, respects explicit false, and replacing it with another strategy disables inherited Papacy mechanics. head:null removes the office.

A Papal office retains the detailed existing election model under its own officeId; provide a seat and a realm when it needs a territorial institution. A caliphal office supplies claimCounties as alternative complete county sets. Optional claim references are { "prestige": "religiousHeadClaimPrestige", "piety": "religiousHeadClaimPiety", "minRealm": "religiousHeadClaimMinRealm", "warPrestige": "religiousHeadClaimWarPrestige" }. Optional absolution references are { "gold": "religiousHeadAbsolutionGold", "piety": "religiousHeadAbsolutionPiety", "opinion": "religiousHeadAbsolutionOpinion" }. Every value must name an existing balance key. Null removes an inherited rule. The prestige qualification is retained rather than spent. Papal gold offerings scale by realm rank; other office absolution uses the referenced flat gold price. Existing fallback prices remain available to legacy heads.

officeId is the stable save key. Faith branches sharing it recognize the original office and share its holder, election and sanctions. Define a new officeId for a new institution or different succession rule. Bookmark religiousHeads mappings continue to seed realm holders from the bookmark's authored realms; character offices are assigned after character creation or recover from a vacancy. head.character may seed an already available state character. Register an additional synchronous strategy through FB.religiousHeads.register(id, { succeed:function(state, faithId, options) { ... } }); registration must precede faith validation. Duplicate and malformed strategy ids are rejected. Definitions and saves carry strategy ids, never functions.

Faith tradition properties

Set legalTradition to a declared FBDATA.legalTraditions id (the existing latin, byzantine, muslim or customary traditions); tournamentTradition furusiyya selects mounted tournaments; holyWarTradition selects crusade, jihad or sacred vocabulary. These properties do not grant a head office or bypass campaign qualifications. raidingTradition true grants the faith tradition and false overrides inherited permission; the existing raidingTraditions faiths and faithGroups lists remain supported through compilation. Culture, technology and regional raid qualifications remain separate.

holyWarTradition:null removes inherited campaign vocabulary and uses the ordinary Holy War fallback. The early nicene, homoian, chalcedonian, miaphysite and east_syriac profiles use this override. It does not enable or disable a campaign independently of the head and system contracts. Their existing late_antique lay, monastic and clerical routes all admit east_syriac explicitly; an authored route still requires the target path's faith selector to accept that character. The late_antique_clerical Bishop rank declares maleOnly:true separately from the monastic Abbot/Abbess rank. This uses the existing rank schema and does not add an ordination, affiliation or household-vow field. clergyMarriage continues to be a shared career boolean; role-specific or date-specific exceptions are not supported by a display name or arbitrary property.

music is an object with lineage (an ordered array of bank selectors) and fallback (a general bank selector). The resolver first tries the exact faith, then authored music lineage and remaining faith ancestors, within existing culture and role precedence. intro is an object with path (for example intro_other) and female (whether to prefer intro_f for a woman). conversionCategory supplies localized name, icon and numeric order for conversion groups. feastDescription is optional localized feast copy. Existing marriage, clergyMarriage, religiousPaths, roles and attire properties continue to inherit and accept explicit overrides. New mods should author properties instead of relying on named faith checks.

The unreleased germanic_pagan record demonstrates local doctrine overrides without changing its pagan parent: head, holyWarTradition and religiousPaths are null, raidingTradition is false, clergyMarriage is true and spouseLimit is one for each sex. Its role words describe participation and study, with no institution or advancement implied. These household defaults are simulation choices, not a shared historical law or admission rule. The existing released northern and steppe definitions retain their rules. Local eligibility and recognition must be authored through the owning institutional contract when supported.

The unreleased Buddhist profiles use explicit household/study defaults: clergyMarriage:true, religiousPaths:null, neutral student/participant role words, head:null, holyWarTradition:null and raidingTradition:false. The compatibility profession named monk represents Letters & Faith study here; its name grants no ordination or local office. Do not use this marriage flag or a Monk/Nun display word as a substitute for novice admission, ordained commitments, female institutional eligibility or recognition. Local specialist behavior requires the owning institution contract, while the retained household numbers are simulation defaults.

Optional system availability

FBDATA.systems in data/systems.js is the registry for optional institutions. Each definition has id, desc, defaultEnabled and modules. The registered ids are roman_offices, civic_institutions, episcopal_sees, church_councils, ruler_conversion, manorial_tenure, feudal_service, scutage, crown_bloc, papacy, excommunication, abbeys, tournaments, great_holy_wars, guild_elections, royal_council and estates. Engine consumers use FB.systemEnabled(state, id, context); unknown ids are errors.

Character head offices may declare holderRole as a nonempty role string and minAge as a nonnegative integer. Eligibility reads the living character's role or explicit active career profession and campaign age, without creating a career. Late antique bishop and patriarch definitions require priest and age 18; offices omitting these fields keep their prior eligibility. FBDATA.rulerFaithTargets in data/political_institutions.js is a nonempty, unique list of assignable faith ids for public ruler conversion. FB.validateReligionInstitutionsData validates the table during bookmark validation. Council and conversion rules, including balance keys, are described in docs/designs/religions.md and docs/designs/conversion.md.

Eras, government forms, faith properties and bookmarks may declare systems as an object with enable and disable arrays of registered ids. Existing boolean maps, such as systems:{papacy:true}, remain supported. A layer may omit a system to inherit the previous answer. Nonboolean map values, unknown ids, malformed lists and repeated ids, including an id in both lists, fail validation. Faith layers normalize to boolean maps before inheritance, so a child's disable list can override a parent's enable list. Runtime mods may supply these layers on bookmarks and religions; era and government declarations belong to their data registries.

Resolution is registry default, campaign era, scoped government, scoped faith, then bookmark. Context may name realm, faith or character; without one it uses the current protagonist. A character uses their own living realm, liege or residence holder for the government layer. Explicit faith:null omits the faith layer. The campaign's stamped era stays fixed as years pass. FB.faithHasSystem keeps its existing signature and delegates to the resolver for the named faith. Legacy bookmark greatHolyWars booleans remain accepted as a final great_holy_wars override, beneath an explicit systems override.

Content definitions may declare systems as a nonempty array of required ids, or system as one required id. Do not declare both. All requirements must be enabled. Deeds, focuses, events, event triggers, options and option requirements, traits, policies, privileges, elections, political blocs, religious paths, feudal service charters, tenure archetypes and council seats carry these requirements. Content disabled in the current scope is hidden and cannot be invoked directly. Bookmarks and mods reject unknown content requirements, including nested event options, before application. See docs/designs/systems.md for lifecycle and save behavior.

Display government resolution uses FB.station.context consistently for lexicon lookups and portraits. An explicit lexicon realm overrides the viewer; otherwise the player's own living realm or immediate liege applies, NPC rulers use their realm, and other NPCs use their residence holder. A form's costume affects those subjects only, with the era costume as fallback. Campaign loading may call FB.activateBookmark(id, progress, done, { geography: savedGeographyId }) to retain a saved physical base without changing the bookmark registry.


Deeds section registry

FBDATA.deedSections is an ordered array of section definitions. A runtime mod may supply deedSections alongside deeds. Existing section records accept partial overrides; a new section needs a unique lowercase id, type, finite integer order and layout. Layout is theme, action-type or both. Order values may have gaps or ties; ties sort by section id. A missing system requirement means the section is always eligible for the system layer. Use system or systems for the same optional-system requirements as other content.

The ordinary extension type is deeds. It needs a non-empty label and may supply subhead, statusLine, open (a boolean initial disclosure state) and availability. Availability uses the bounded action visibility conditions, including flags, age, station, culture and faith, without an explanation field. label, subhead and statusLine render through the deedSection localization namespace. No section may supply callbacks, executable handlers, arbitrary HTML or unknown fields. Sections of type deeds derive their ordered deed list from deed membership; an empty section stays hidden unless it supplies a statusLine.

The other bounded renderer types are tutorial, stories, commitments, campaigns, holy_campaign, household_summary, next_steps and focus. Each is a singleton in the effective catalogue. These reuse existing UI and do not register new executable renderers. The focus type needs a label. Trusted shipped system modules can call FB.deeds.registerSection with a complete definition; duplicate ids are rejected. JSON mods use deedSections so section additions and their action references are validated together before either registry changes.

A deed's section names a registered deeds section in theme or both. The older group field remains an accepted alias; an override changing group without section updates section too. A deed may supply actionTypeSection for an explicit alternate placement in action-type or both. Without it, a primary section in both retains its deeds in both layouts; a theme-only section uses the older layoutGroup or the existing flow-derived personal/direct defaults. Unknown sections and incompatible layouts are rejected. Built-in handler bindings and all existing flow, cooldown, cost, technology and eligibility protections remain intact.

Disabling a primary section by system or availability hides its deeds and blocks normal execution, including shortcut entry points. Section predicates are pure queries and store nothing in saves. availableWhileTraveling is a boolean deed presentation field selecting deeds for the travelling list; core action handlers still enforce their own context. Built-in travel commitments declare their entry actions in metadata so the panel does not maintain a second list of deed ids. Imported declarative actions use unique integer order values from 0 to 100000, allowing spaced positions across independent mods. Built-in actions retain their complete catalogue order range.

Dated religion availability

The literal FBDATA.bookmarkFaithAvailability1096 table in data/identities_1096.js stages an additive 1096 selector for rabbanite. The complete data/bookmark_1096.js composer publishes it after registering the date, copying the availability record and unioning bookmarkIds without changing year, era or consumer bounds, doctrine or earlier permissions. Loading the identity source alone changes no effective catalogue. This is source organization, not a JSON mod root; ordinary imports continue to author complete religions records with availability. Rabbanite remains institution-only. The existing jewish profile supplies playable households, and the Fatimid court retains broad shia while a narrower dated affiliation remains unresolved. No local institution or membership is initialized by this selector.

Jewish and Samaritan profiles use these existing contracts with explicit consumer limits. rabbanite is institution-only across the reviewed 476-1204 openings and does not replace a household's jewish primary faith. karaite permits community, character and institution authoring only in 1066/1204; samaritan permits them in 476/493/711/800/1204 and is an independent root. The corresponding rabbanite_lay, karaite_lay and samaritan_lay paths have one participation rank and empty profession routes. No specialist office, hereditary priesthood, destination or new population is initialized by these definitions. Future local seeds and admission rules need their own accepted declarations.

properties.marriage.divorce.enabled optionally accepts a boolean and inherits normally. false blocks the ordinary marriage-ending status and both interaction routes without payment, including event-triggered entry; true or omission retains the existing procedure. This permits a profile to withhold dissolution while its local recognition and property rules are unresolved. The kind field remains a required compatibility slot even when disabled. This gate grants no judicial authority and defines no new marriage transaction; a malformed enabled value rejects detached faith/mod validation.

Runtime JSON religions records may declare top-level availability with optional yearMin and yearMax (inclusive integer years), eras (unique known era ids), bookmarkIds (unique known bookmark ids), and consumers (unique names from community, character, ruler, institution, start, story, conversion and project). Unknown fields, reversed windows, malformed lists, unknown ids and duplicates fail validation before applying the mod. Omitted fields impose no restriction. Empty lists deny all matches. For example availability:{yearMin:900,consumers:['community','character','institution','conversion','project','story']} describes a dated profile with no ruler or start consumer. This is a schema example; it is not local historical evidence.

Availability belongs beside name and parent, outside properties. It does not inherit and never becomes effective doctrine. Each independent historical profile declares its own scope. A legacy JSON record without availability remains unrestricted. Primary community identity remains the faith id; this field does not implement legal schools, orders or institution membership.

FB.religionIds(state, true, consumer) lists eligible targets for that consumer, defaulting to conversion. Population-project lists use project, matching their action reviews and apply gates. Official-faith conversion additionally requires ruler eligibility alongside conversion eligibility; the player and AI use the same public-ruler query. Availability under properties is rejected rather than silently treated as a working gate.

FB.faithAvailability(id, state) returns detached metadata (null for an unknown faith). FB.faithHistoricalAvailable(id, bookmark, consumer) checks a fresh historical assignment. FB.faithAvailable(id, state, consumer) checks a new live commitment, defaulting to conversion. Consumers must be declared by the caller; project previews and starts use project. Surviving identities, generated descendants and existing project targets remain valid beyond date, era or bookmark limits; explicit consumer restrictions still block new actions. FB.faithAssignable retains existence-based saved-record semantics. Current world revisions validate assignments while retained revisions and saves preserve their original definitions. A validated mod's effective fingerprint includes the raw availability declaration alongside its doctrine, so changing either changes save compatibility.

Generated definitions pass detached validation before state changes. Explicitly dated generated content must permit story creation at the current campaign date. Ordinary player-founded branches without availability remain possible without research. A calendar boundary never creates a branch, changes population, initializes an office, grants territorial rights or awards advancement. Keep existing spiritual offices, treasury, property, travel and population projects authoritative. tests/e2e/fixtures/religion-coverage-mod.json supplies two independent fictional JSON configurations for this contract.

Provisional regional profiles

FBDATA.bookmarkReligions711, FBDATA.bookmarkReligions476Wider and FBDATA.bookmarkReligions1066Terrain merge into FBDATA.religions when their bookmark scripts load. Apart from ghana_local_practice_1066, their ids are unreleased provisional profiles kept for existing opening consumers. Do not build a mod on them as stable identities. An owning replacement migrates every consumer and then removes the id without a legacy alias, so a mod reference would no longer validate. Reference a released id, a dated family profile or a faith declared by the mod instead. tests/e2e/specs/religion-coverage-rollout.spec.js records the current table contents.

Early Iranian profile examples

zoroastrian_sasanian_476 is a child of the retained zoroastrian definition. It permits ruler, character, institution and start consumers in bookmarks 476 and 493, within the inclusive years 476-493. Its fresh assignments are the Sasanian courts and the matching existing-ruler beginning, not every province or household under their authority. Community, story, conversion and project consumers are excluded. Institution eligibility permits explicit authoring without certifying a site or creating a placement. Assignments and generated descendants already in a save retain their identity under the ordinary survival contract; the profile's time window is not an extinction rule.

The current wider_v2 revision selects peroz_sasanian_476, a hidden copy of the existing Peroz beginning with the fresh court affiliation. The baseline revision selects the unchanged peroz_476. Each revision declares its compatible starts list; a mod adding a beginning to either world must extend that revision's starts selector as well as the shared startScenarios catalogue. This uses the existing starts contract and does not change saved scenario ids or public visibility.

The child's legalTradition selects sasanian_custom_476, an existing provincial legal reference. Inherited marriage prices, capacity and optional xwedodah remain compatibility settings, not a complete historical household-law adapter. The released zoroastrian definition and its existing generated descendants keep their original effective doctrine. roles supplies vocabulary only: Learner, Herbed and Fire custodian do not grant membership, ordination, property or authority. properties.religiousPaths:null explicitly disables inherited progression routes. Actual admission and service require a separately authored institutional contract.

mesopotamian_traditional is bounded local Harranian worship for the same two early bookmarks. It explicitly overrides inherited monastic titles, sacred-war vocabulary, raiding and polygyny. Its one-spouse capacity, direct separation and absence of enforced celibacy are operational simulation defaults while local household and priestly discipline remain unresolved. Its availability permits potential dated authoring, not automatic placement in every permitted opening. The 493 community mix is unchanged.

Content period declarations

FBDATA.eventPacks maps pack ids to declarations with a required eras array and optional inclusive yearMin/yearMax integers. Runtime JSON mods may author the eventPacks root and event records may name a pack. Each event inherits omitted fields from its pack and overrides supplied fields independently. For example, a pack with eras:['early_medieval','high_medieval'], yearMin:900, yearMax:1100 admits those stamped campaign eras only during those live years. An event with yearMin:950 inherits its pack's yearMax; eras:[] disables it. Every shipped event pack explicitly declares membership. Standalone legacy mod events without a pack or period fields remain shared. A replacement event is a complete record and must redeclare its pack or period fields if it should retain them.

Activation compiles era membership, live selection refreshes year eligibility on year changes, and restore rebuilds both. Out-of-period events cannot queue, bind participants or resolve a stale choice. The full id lookup remains available for saved messages. Validation rejects unknown packs or eras, repeated eras, invalid year values and reversed inherited windows before data changes.

Careers and tournament programmes use the same eras/yearMin/yearMax fields. Both career selection and direct setCareer calls check them. Legacy career bookmarkIds remains an additional explicit compatibility restriction. Tournament booking rechecks programme availability; already funded editions keep their recorded programme and contests. The tournaments system controls availability of the whole activity set independently of programme dates and technology.

Cultures may supply nameEras:{late_antique:{male:['Periodus'],female:['Perioda']}}. Keys must name known eras; each supplied sex list must contain nonempty strings. Parent cultures pass variants to children and partial child lists override only the supplied sex. Omitted lists use the base male/female pool. New names use the campaign's stamped era; saved names are never rewritten.

FB.contentPeriodEnabled(state,definition) is the shared era/live-year query. FB.yearTableEntry(rows,year) selects the most recent effective row from an ascending from table, returning null before its first dated entry; a null from can supply a timeless baseline. Period declarations control historical content membership, with technology impact none, and leave each content definition's existing technology requirements in force.

Period presentation data

FBDATA.architectureStyles (data/eras.js) is a style-id table and an accepted runtime-mod root. Mods replace entries by id. Each entry accepts palettes and shapes objects, with omitted properties taking the manuscript defaults. palettes.walls, roofs, stones and banners are non-empty arrays of up to 32 colors; leaf, trunk and ink are single colors. Colors use hexadecimal or numeric rgb/rgba syntax. shapes.dwellings accepts pitched or flat; shapes.worship accepts spire, dome or basilica; shapes.fortification accepts crenellated or palisade. Unknown palette fields, shape slots or shape names reject the mod before it applies. Data selects registered drawing functions and never contains executable drawing code.

A culture can declare architecture as a style id; inheritance and campaign-founded cultures use the normal effective culture lookup. A null architecture clears an inherited selection and uses the era fallback. An era's architecture declares its fallback style id, with null retaining manuscript. The map uses the county's principal culture. Unknown culture/era styles and malformed style tables fail bookmark activation. Early and high medieval eras leave architecture null, retaining the manuscript fallback; late_antique selects its registered period style.

An era's emblem declares heraldry, standard, chi_rho or tamga; null or omission retains heraldry. This is the same deterministic house or realm seed in a different registered form, shared across cards, the topbar and player-host markers. The title's game crest always remains heraldry. The eras runtime-mod root merges complete period definitions by id and validates them with the effective content catalogue. No emblem or architecture fields need to be added to saves.

Era and geography currency can be null, a pair such as { "label": "Solidi", "icon": "S" }, or the complete top-level currency schema documented earlier. Priority is explicit runtime currency mod, stamped geography, stamped era, then built-in currency. A pair changes only the purse label/icon and retains the built-in units. Use a full definition for period unit names and compact symbols. Invalid era or geography declarations fail activation; invalid explicit currency mods retain their existing built-in fallback. balance.coinageSymbol still overrides only the icon when no explicit currency mod is supplied. Stored economic values remain gold.

Gameplay music banks optionally declare eras as a non-empty array of era ids. Resolution first prefers the campaign era and then repeats the existing faith/culture/role fallback over unscoped banks; banks scoped to other eras are excluded. The generated catalog can obtain scopes from an optional era prefix in music/<era>/<faith>/<culture>/<role>/<NNN>-<slug>.opus, or music/banks.json mapping existing bank ids to era-id arrays. Scoped folders have distinct bank and track ids. Build and itch staging retain bank scopes. The CrazyGames distribution remains silent. Music catalogs are not runtime-mod roots; eras is a validated runtime-mod root.

Optional title hierarchy contract

Bookmark duchies, kingdoms and empires tables may be omitted or empty. County duchy, district kingdom and kingdom empire may be omitted or null. An absent parent ends the chain. A supplied parent must be a valid canonical slug or a matching legacy d_, k_ or e_ alias in the referenced table. An empty string or unknown supplied id is an error, even when other counties have no hierarchy. This supports mixed regions and worlds without any levels.

FB.titleLevels.name(state, kind, context) resolves the level's term with optional realm, viewer and form context. FB.titleLevels.holder uses the corresponding localized rank label. Override duchy, kingdom, empire and the holder terms in data/lexicons.js; the stable mechanical ids and title aliases do not change. FB.dejureOf returns an empty object for a county without a district, and null for absent upper parents. County-list helpers return empty arrays for absent ids.

Outside a county's title hierarchy, effective customary Peace rights can support recovery of county jurisdiction. FB.political.territorialClaims(state, actorRef, provinceId) returns detached effective rights. FB.customaryWarRights supplies ordinary war causes with type customary, target, rightId and basis. Jurisdiction must come from an existing authority right; revenue rights and appointments are not territorial claims. The ordinary declaration gate requires the exact effective right and a connected frontier. In-flight campaigns retain their recorded evidence. Global sacred target definitions outside the bookmark's title map are inactive.

Bookmark climate and generated ruler profiles

An atomic bookmark may declare climate with the same zone and provinces shape as a geography base. Its county exception takes precedence, then its default zone, then the geography's county exception and default zone. Supplied county ids must exist in the bookmark and zone ids must be registered. This override does not mutate the base and follows bookmark activation and save restoration; no derived zone is stored in saves.

A ruler profile may set generated:true and omit name. It still declares sex, culture, born, mar and trait. Initialization draws its name from that culture through the normal seeded name generator and marks the saved profile and materialized character as generated. A named profile keeps its supplied historical name. This authoring flag does not grant an office, county or succession right.

FBDATA.bookmarkRegions476 contains independent declarations for italy, dalmatia_east, gaul_iberia and africa. The bookmark entry composes their provinces, realms, title tables and climate assignments; these are content tables, not an engine requirement for other bookmarks. In this snapshot realm is both the sovereign owner and direct holder under the active government strategies. The standard 476 settlement layout is referenced by settlementLayout, with physical seeds, terrain and dated names supplied by europe_regional.

Customary-right seeds and governing identity

Bookmark realm definitions may declare governingIdentity with eliteCultureId, eliteFaithId, legalIdentityId, tolerance (preference, tolerant or persecution), taxation (equal or discriminatory) and justicePolicy (personal or elite). All fields are required when declaring a new identity. Realm creation stamps them into authority.governments; reads and restore never backfill them. Province definitions may declare customaryRights as an array of records with power (peace, revenue or consent), basis (tenure, judgment or possession), optional realmId beneficiary and basisRef. Possession requires actual holding; other historical seeds require a nonempty evidence id. Recognition seeds are rejected because they require live authority recognition evidence.

FB.authoritySetIdentity(state, realmId, value) changes an institution's declared identity and treatment without converting people. FB.political.governingIdentity returns a detached current view; FB.political.communityGovernance(state, provinceId, optionalProposedIdentity) forecasts treatment using live population shares and returns null for missing scope. FB.political.civicConsent returns allowed, support and a missing_scope or community_opposition reason when denied. IdentityQuote and authorityApplyIdentity provide the reviewed transaction boundary; quotes must remain transient.

Legal traditions may add jurisdiction:{cultures:{cultureId:traditionId}, mixed:traditionId, assessor:traditionId}. The assessor is optional. Validation checks referenced cultures and traditions before bookmark activation or mod adoption. FB.justiceTradition accepts an optional fourth argument {accusedId, otherPartyId}, and returns source and assessorId alongside the selected id and definition. Secular court actions derive parties from accepted offense records, while religious courts continue to use effective faith. FB.authorityJudgment records existing lawful adjudication; it requires actual scoped Peace and nonempty case evidence and never grants custody. The annual authority boundary creates direct county possession rights for living player and AI realms.

Federate contract and migration tables

federateContractTerms is a runtime JSON root of complete template records keyed by id, declared in data/political_institutions.js. Each template declares payPerSeason, optional initialPay, positive durationDays, renewWindowDays below the duration, service (host or none), land (optional, conquest or none), recognition (optional, required or none), and autoRenew. Government forms can select ai: federate_contracts to propose and consent to explicitly template-backed bargains. A required recognition is a living imperial commission from the exact patron to the federate realm. Existing manual contracts do not acquire AI consent from a template definition.

federateServiceStarts is a runtime JSON root keyed by the initializing court_settlement world story id. Each entry is an array of explicit templateId, patronRealmId, federateRealmId and hostId declarations. The western_court_476 initializer offers these templates after creating its opening hosts and delegates approval to ordinary government AI. The parties must be distinct living realms with an existing host belonging to the federate polity. Complete arrays replace by story id. Definitions create contracts only during a fresh opening, never during restore.

FBDATA.federateMigrations contains authored story opportunities: realmId, patronRealmId, hostId, inhabited origin and target, firstYear, lastYear, positive durationDays, templateId, territorial settlementForm, men and units summing to men. A story checks its own current historical actors before invoking the general engine; the table never guarantees an outcome. A nonTerritorial realm may declare a foreign inhabited capital and the federate_polity form without owning a county. The existing realm id is independent of that court location. federateMigrations is a complete-record runtime JSON root. Its realm, host, patron, target, template and government references remain explicit; the campaign instance names the migration id.

FB.federateBeginMigration receives explicit state and terms with endTurn. FB.federateRequest selects land, service or force; FB.federateDeclineContract releases an existing service choice. Political reads expose detached movingPolity and movingPolities records and a federateSettlementQuote. Confirmation uses FB.federateResolveSettlement with the exact reviewed quote. Land awards and won objectives use the common claims engine and preserve existing population communities and private property. Restore retains once-only payment and settlement stamps.

FB.federateOfferReplacement receives state, templateId and explicit parties. It preserves previous service until valid new terms are affordable and the same AI courts can consent, and refuses to displace another patron's active host service. It releases eligible previous templates through authorityContractTransition with action release, retaining expired rows with transitionReason service_released. Those rows cannot auto-renew. The replacement still uses ordinary approval and once-only initial payment. It never accepts on a protagonist ruler's behalf.

Period presentation content

Wardrobe rules accept government as a known government-form id, matched against the portrait subject's resolved form. The garment library additionally includes lateCivil and lateMilitary. Registered headwear includes diadem and ridgeHelm; none explicitly suppresses later headwear rules. These additions change only painting.

Cultures may declare appearanceEras as an object keyed by known era id. Each entry supplies the same fields as appearance and overrides only supplied fields of the effective inherited base profile. Parents pass period profiles to children. Names may additionally use nameEras.<era>.family for the family list of a plain dynasty naming pattern. Unspecified lists and nonmatching eras retain base data. Existing saved character names are never replaced.

Architecture styles may select villa dwellings and castra fortifications. Basilica worship uses a low hall with a clerestory rather than a medieval spire. The default manuscript drawing paths remain unchanged.

Items may supply eras as a list of unique known era ids. It restricts new stock and random acquisitions, while existing possessions, explicit story grants and materialized offers remain usable. artEras maps known era ids to partial art objects that merge over the item's base art for portrait and inventory rendering. Late antique ordinary armor can select ridgeHelm or mail without changing its mechanical definition. Art overrides and presentation data do not enter saves.

Unit classes may supply eras with the same unique known ids. This restricts fresh recruitment independently of military.excludeRoles, technology and culture gates. Core role defaults must include every era if they declare membership. Saved army compositions remain valid.

Registered campaign story type

Trusted engine classic scripts register reusable factories with FB.stories.registerType(id, factory, sourceFile, validator, options) before boot seals the registry. The optional fifth argument may set storyline:false for companion types that cannot qualify a Story start; opening_profile uses this marker. Registered track types otherwise count as storylines. FB.stories.isStoryline(id) and the same helper on a detached compiled registry classify its registered instances. JSON cannot override trusted type metadata. Data classic scripts declare instances in FBDATA.storyInstances; js/stories.js alone registers that catalogue. Factories return the normal story hooks. Duplicate types, unknown types and registration after sealing throw. JSON runtime mods cannot register executable factories. A bookmark attaches a registered world instance by listing its id in stories; an unlisted instance stays detached.

The shipped campaign type is defined in js/story_campaign.js. Its authoring table is FBDATA.storyCampaigns in data/story_campaigns.js. A definition has id, type:'campaign', name, desc, optional requires, firstYear, lastYear, durationDays, actor, target, optional conditions, optional commission, optional migrationId, optional settlement and optional news. Years are inclusive; the final day of the last year closes a still-pending opportunity. durationDays bounds a commitment after its initial attempt, including negotiation. Display name and desc use the storyCampaign structured localization namespace; ids and eligibility fields remain locale-neutral.

actor requires realmId and may name character as an exact character id or {storyId, field}, referencing the cast record of a required story. The named character must live and rule the actor's realm; pending inheritance waits within the date window. target requires provinceId and may limit ownerIds or name a character in the same reference format. Without ownerIds, the campaign attacks the current sovereign. An incompatible target owner diverts the opportunity. A named target must remain alive and in office.

conditions is an array of records. kind:'owner' needs provinceId and realmId and requires that owner, normally for a capital. kind:'ruler' needs realmId and character and requires the named living ruler. kind:'landless' needs realmId and forbids prior territorial settlement. kind:'host' needs hostId and realmId and requires the existing living army. Unknown condition kinds are rejected. Busy actor and target courts wait rather than declaring a second war.

commission declares source and issuerRealmId. Recognition names the actor realm as subject and scope and uses the ordinary authority boundary. An existing effective recognition from that issuer may be reused. A later loss of the exact recognition interrupts the opportunity; it is not silently reaffirmed after succession. The story stores the commission id without granting the ruler property.

migrationId names an existing FBDATA.federateMigrations definition. Its actor realm, target, patron and host must match the campaign conditions. The type reuses the named host and cannot manufacture lost troops. It creates at most one moving court and contract, negotiates through ordinary government AI and requests force only after the commission's terms become effective. War must secure the objective and the ordinary claims session must settle it before the story records won. Legacy already-declared wars remain ordinary wars without a newly synthesized migration.

settlement may declare churchId, civicId, faithId, minimumShare and governmentForm. After an actual victory, living church mediation and civic rights may support that government form. This once-only political settlement does not transfer the county, alter its communities or grant household property. If the delegates cannot agree, the territorial campaign outcome remains won and its existing government remains in place.

news maps started, won, failed, diverted and interrupted to {key, text} descriptors. key must be an ordinary news message id and text an English fallback. The static i18n extractor owns these records under their opaque message keys. Runtime registration makes new English available for old Chronicle messages even before the owner regenerates catalogs. Messages carry semantic parameters; prose is never saved in a story record.

Each attached instance has phase pending, negotiating, started or resolved. A resolved result is won, failed, diverted or interrupted, with a reason id and outcomeTurn. Existing ownership or a settled migration determines victory. Lost actors, extinction, succession, lost required capitals, changed objective control and lapsed commissions terminate incompatible opportunities. The story can close its migration contract and release its host without erasing an ordinary war or extinguishing the surviving polity. Timeout resolves an unfinished commitment. Resolved campaigns never restart or award a county on a date or during restore.

Example registration data for a later bookmark:

{ id:'coastal_campaign', type:'campaign', name:'A Coastal Campaign', desc:'The court may contest the current coastal ruler.', firstYear:867, lastYear:875, durationDays:2880, actor:{realmId:'byzantium'}, target:{provinceId:'siracusa'}, conditions:[{kind:'owner',provinceId:'constantinople',realmId:'byzantium'}] }

A data classic script assigns that record to FBDATA.storyInstances.coastal_campaign and the bookmark lists coastal_campaign in stories. No historical selector is added to the shared engine. See docs/designs/stories.md for lifecycle ordering and docs/designs/state-and-saves.md for validation and migration.

Conditional polity foundation data

js/story_polity_foundation.js registers type polity_foundation. data/story_instances.js composes the shipped FBDATA.storyFoundations source table, currently authored beside the 711 campaigns. A definition declares id, type, name, desc, firstYear, lastYear, durationDays, collapse, remnantRealmIds, revoltRealmIds, community, realm and optional news or requires. A bookmark attaches its id through stories; unlisted instances have no state or RNG effect. This is a trusted classic-script factory, not an executable JSON mod extension.

collapse has provinceId, formerRealmId and ownerIds: an eligible current owner must have taken the former seat. remnantRealmIds and revoltRealmIds are nonempty disjoint lists of current sovereign ids allowed to supply the northern county. Existing-ruler starts resolve these authored ids through FB.startRealmId. community declares faithId and minimumShare, a positive population fraction up to one, checked in the future realm's capital. realm declares a new id, name, color, capital, rank, aggression, government, religion and an ordinary authored ruler with name, sex, culture, born, mar and trait. The new id must not already exist, and its capital must differ from the collapsed seat. The realm is absent at creation. Display fields use storyFoundation.<instance-id>; the nested realm name uses storyFoundation.<instance-id>.realm.name.default. Historical personal names remain literal proper names.

A surviving remnant may form a court in the capital county while its owner is peaceful, no host is present there and the county has no open revolt. A conquered county needs a real ordinary revolt: the story observes it without starting it, altering support or manufacturing a host. Only the existing victorious independence settlement may offer its occupied connected component to the generic foundRevolt hook. The factory rechecks living rebel hosts, complete group occupation, actual source ownership, collapse, faith share and protected player holder chains before using FB.foundPolity. All won counties in the accepted component become the new court's territory through ordinary transfers. Community partitions remain unchanged, and other surviving former-sovereign counties are preserved.

Pending windows close on the final day of lastYear. Once observed, a revolt commitment may finish beyond that window within durationDays. Defeat, concessions, incompatible control, changed prerequisites and timeout resolve the foundation without overriding the ordinary revolt. news maps founded, failed or diverted to durable {key, text} records. Save records hold semantic ids and timestamps; migration of older bookmark saves adds only pending facts, and restore never replays territorial or character creation. Technology impact is none, under conditional_polity_foundation.


476 regional content composition

The Africa region declaration additionally owns sites, layouts, institutions, legalTraditions, straits, crossingClasses, campaigns and events. These use the existing physical-site, settlement-presentation, institution, legal-tradition, crossing, campaign and event schemas. They are composed into the normal FBDATA catalogues in classic-script load order. They are content authoring tables, not additional runtime-mod roots. Province rows use the existing names array; site records use their existing names array. No event trigger/effect key or engine extension is introduced.

Regional 476 catalogue composition

The shipped regional declaration may own settlementSites, settlementLayouts, localInstitutions, storyCampaigns and storyIds alongside its provinces, realms, title groups and climates. These are source organization tables, not additional runtime JSON mod roots. data/bookmark_476_italy.js merges its literal sites into the existing site catalogue and its layout into settlementLayouts['476']; it loads after settlements and before bookmark activation. data/political_institutions.js composes its localInstitutions, data/story_campaigns.js composes its campaign definitions, and data/bookmark_476.js appends its storyIds after their required world story. Reuse the existing record schemas and unique ids; keep a settlement's previous slot and site id when adding another site to a county.

A regional classic script can append literal event records to FBDATA.events and declare its pack in FBDATA.eventPacks before the ordinary event packs load. Use supported trigger and effect fields and explicit era membership. countyIds explicitly constrains regional eligibility; a file location does not. Historical local representatives may use historicalName or the validated representative profile. Families, estates and appointments require the separate bookmark opening contract described below; catalogue composition alone does not initialize them.

The gaul_iberia declaration additionally groups cultures, romanJurisdiction, legalTraditions, settlementSites, settlementLayouts, localInstitutions and storyCampaigns alongside provinces and realms. These are ordinary existing-schema records, not automatically interpreted extension keys. Explicit data composition installs cultures and physical sites immediately, appends layouts only to the 476 table, merges institutions after the shared catalogue and merges legal traditions after shared sentences load. romanJurisdiction extends Gothic personal-law mappings. data/story_campaigns.js references the regional Clovis definition while retaining registration order. The regional file appends ordinary literal event records with a declared late antique pack. Other authors must preserve the same script dependencies and avoid overwriting a shared catalogue or another bookmark's layouts. County names may use existing year-keyed names lists.

Review-only bookmark declarations

data/bookmark_711.js composes its source-organizing bookmarkCandidates, bookmarkCultures711, bookmarkReligions711 and bookmarkSites711 tables into the ordinary registered bookmark and content catalogues. These helper tables are not runtime JSON mod roots. Registered bookmarks may use hidden:true to reject every new-campaign route while retaining inspection and matching save loading. data/story_campaigns_711.js merges literal campaign instances into the existing pre-sealing registration batch. Registration alone does not attach them to other bookmarks. See docs/designs/bookmark-711.md for its historical scope and owner acceptance work.

Data-only review bookmark authoring

FBDATA.bookmarkCandidates is a source organization table. The runtime bookmark picker, start-code parser and save restore use FBDATA.bookmarks. The shipped 1204 data composes its candidate into that ordinary catalogue during boot. Registration does not establish owner acceptance: hidden:true prevents new campaigns without deleting a definition needed for matching saves. Requirement validation includes hidden definitions.

FBDATA.bookmarkContent groups literal source declarations such as realms, ownersByDuchy, countyOwners, countyOverrides and campaigns. Its data script explicitly composes them into ordinary bookmark and story definitions. Neither helper table is a JSON runtime-mod root, a new engine schema, or an automatic promotion gate. The companion campaign script loads after story_campaigns data and before story registration. Its records use the existing campaign schema and add no event trigger/effect key. All review labels and durable news retain their normal static i18n owners. See docs/research/1204-bookmark.md for the historical scope and acceptance gaps.

Linked dynastic branches and settlements

Trusted story scripts may compose FB.linkRoyalBranch, FB.designateRoyalHeir, FB.royalRegionQuote, FB.grantRoyalRegion and FB.releaseRoyalRegion. These are synchronous engine transactions, not declarative event effect keys or JSON runtime-mod roots. Linking borrows an existing subordinate court's exact character identities into an overlord's genealogy under an attested father. It requires an existing male parent and refuses nested borrowed source courts. Source mutation boundaries synchronize the borrowing court, and regional succession consolidates the existing household rather than generating copies. A regional quote accepts whole current subject territories only; foreign ownership, partial subject territory, player-controlled direct grants and incompatible wars fail closed.

Saved branchRef records name source realmId, source memberId and the borrowing parent's memberId. Their derived member identity and character birth claim must match the saved source court. designatedHeirId is a durable saved preference for a member in the living eligible frontier; it is consumed on accession. Neither is a bookmark declaration field. data/bookmark_800_history.js uses ordinary royalCourt declarations for people already born and a private content table of settlement windows and region selectors. The five instances use reusable succession_partition, designated_succession, diplomatic_exchange, recognition and treaty_settlement types from js/story_settlements.js. These instances can be declared through the storyInstances runtime JSON root using the same registered types. No event trigger or effect key was added.

Authored royal court declarations

A realm may supply royalCourt with members (an ordered list of at most 24 compact people), optional dynasty (a proper family name), founderId, spouseId and succession. Without royalCourt the ordinary generated family path, shared RNG and uid progression are unchanged. The declaration is consumed only during new-world initialization, never on restore. Use a complete ruler profile with an integer born year alongside a court.

Each member has a unique local id matching lowercase letters, digits and underscores, starting with a letter; ruler is reserved for the actual realm ruler. Supply name or generated:true, sex (m or f), integer born, culture and religion. Optional fields are trait, nonnegative mar, homeProvinceId, fatherId, motherId, spouseId, siblingIds, alive:false and an integer died year. Person and dynasty names are proper names, not localized prose. Gameplay dates, traits and skills need separate research justification. Unknown parents stay absent. A dead ancestor remains a compact genealogy entry and cannot be a living contact or successor. A died year is optional but, when supplied, requires alive:false and falls between birth and campaign start.

fatherId and motherId resolve local ids or ruler, require the corresponding parent's sex and at least twelve years between births, and cannot form ancestry cycles. Both parents may be declared independently. royalCourt.rulerFatherId and rulerMotherId link the actual ruler to declared ancestors. Reciprocal siblingIds record an attested sibling relationship when parents are unknown; royalCourt.rulerSiblingIds supplies the ruler's reciprocal side. These links do not invent a parent or prove agnatic descent.

royalCourt.spouseId names a living member whose spouseId is ruler. Explicit null prevents an invented starting consort; omission retains ordinary consort generation. Each member's optional spouseId requires a reciprocal living declaration. A member's explicit null also prevents an invented consort if that person later inherits. All declared spouses must be adults. Authored marriages do not transfer counties or trigger conversions.

succession is an object with policyId (dynastic or agnatic_seniority) and optional preferredMemberId. Absence uses the government form's ordinary strategy. Dynastic retains the ordinary male-preference descendant frontier. Agnatic seniority requires an explicit founderId, a male founder and the ruler's resolvable male-line ancestry to that founder; it selects adult male descendants, earliest born first, breaking ties by stable member identity. A preferred successor must satisfy the policy. Opening preference is preserved across initial construction and immediate restore, then expires at the first elapsed turn, death or accession; it is never read again from bookmark data.

Seniority retains a separate ordinary dynastic frontier. If no eligible adult male survives, that frontier supplies the existing women/minor fallback; an empty frontier uses the ordinary generated vacant-line repair. This is an eligibility fallback, not a historical reign calendar. New descendants join the saved genealogy through ordinary births. Succession continues through the existing ruler, recognition, reaffirmation, treasury and court-movement transactions.

Member identities are royal_<realm-id>_authored_<local-id>, with matching derived court character identities. The ruler root uses local id ruler. Only the living visible court and relatives needed for its marriages or accession become full characters; dead ancestors and other kin remain compact. FB.authoredRoyalMemberSnapshot and FB.realmFamilySnapshot are pure reads, and FB.materializeRoyalMember delegates to the existing character materializer. Save-v4 validates the saved graph and saved policy before adoption; no new envelope version is required. A saved generated family never receives new historical people from updated bookmark data.

Negotiated partition and dated holy-war story declarations

js/story_history.js registers partition and holy_war before story data registration. Definitions use the existing storyCampaign display namespace and literal bookmarkContent campaigns table. Both types require id, name, desc, firstDate and lastDate, where a date is year, season 0-3 and day 1-90. Optional news maps semantic outcomes to key/text descriptors. requires lists stories registered earlier. No executable save fields are accepted.

partition requires actor realmId/capital, beneficiary name/sex/born/culture/religion and optional trait, and grant realmId/liege/capital/rank/kind/place/counties. The recipient is a newly created living ordinary NPC, not a preassigned holder. Grant counties are unique, include the grant capital and exclude the source capital. The liege must rank above the new realm. Optional parentStoryId must appear in requires and resolve to granted. Dates open eligibility, while actual direct holdings, peace and current consent determine settlement. Realm and place names are proper identities, not translated source prose.

holy_war requires systemId (the enabling system), religion and target kingdomId. Optional historySeed is a bounded list of unique id/date/target/outcome rows completed before firstDate. Only rows before the actual campaign opening are seeded. Outcomes are attackers, defenders, partial or diverted. Rows create historical records and prior-call flags only. The call uses the current religious head and ordinary holy-war rules; a campaign id links its eventual actual result. Restore does not initialize either type. Named NPC partitions and dated calls use none technology reviews; ordinary conquest, player land grants and religious decisions remain available.

Opening religious calls

A holy_war instance may opt into openingCall: {schema:1}. That object accepts no other fields and cannot coexist with nonempty historySeed. Its existing firstDate and lastDate bound preparation and its target must resolve against the effective bookmark's kingdom table. Built-in declarations and detached ordinary JSON imports use the same validator and campaign owner. The holywar-opening-harbor.json and holywar-opening-upland.json authoring fixtures demonstrate different heads, targets and immediate versus delayed windows.

Fresh attachment captures the current realm-held head, living character and ruler generation. An eligible AI head calls immediately when the window is open; a player head retains the existing reviewed Call and Decline choices. Earlier windows wait without allowing automatic dispatch to substitute a different call for that faith. A changed or missing head, disabled system, rejected ordinary authority/cooldown/hostile-target gate, conflicting campaign or expired window closes this opportunity as unavailable. A refused opportunity closes as declined. Ordinary religious decisions and later automatic calls remain available under their own rules.

Preparation consumes canCallGreatHolyWar and callGreatHolyWar, including ordinary preparation, participants and settlement. A matching campaign already committed within the window is linked by its exact id, calling faith, target, caller and called turn rather than called again. The story's outer campaignId, calledTurn, callerRealmId and callerCharacterId remain its only campaign references. No history, victory, participant, force, funds or territory is supplied by the adapter itself. Reattachment and restore do not evaluate a new opening; a restored pending decision resumes only at normal live dispatch.

The optional story openingCall record has exactly schema:1, evaluatedTurn, disposition (pending, called, declined or unavailable), headRealmId, headCharacterId and headGeneration. A new opted-in record requires this marker; non-opted legacy stories reject it and retain their prior shape. Head fields preserve the original authority through later succession. Missing whole stories stay missing on restore. Validation checks exact keys, bounded turns, disposition/outer-phase consistency, call-window provenance and matching live campaign identity before adoption. The v4 envelope and other story versions do not change.

Declared opening households, estate evidence and local communities

A trusted bookmark may declare opening with actors and appointments objects keyed by stable slugs, plus estates, claims and migrations arrays. This is not a new runtime JSON mod root. actors require sex, culture, religion, born, station, role and inhabited home; optional fields are name, dyn, father, mother, rulerChildRealmId, skills and traits. Roles are commander, claimant, notable, priest, monk or soldier. Parent ids must name older declared actors of the appropriate sex. Skills are integer mar/ste/dip/int/lea values from 0 to 20. rulerChildRealmId links the declared father to the already materialized realm ruler. Unknown actor and appointment fields fail validation. FB.bookmarkActor resolves the saved character mapping.

Each appointment declares officeId, actorId, realmId and scope with kind realm/county/host and id. Optional endTurn is positive and recognitionSource requires county scope. The registered office must permit the scope, county openings must match their controlling realm, and the live authority transaction must approve the scope after hosts exist. FB.bookmarkSetupAppointments initializes these records once; it creates no territorial award.

Each estate requires unique id, actorId with a declared dyn, inhabited provinceId, integer share0 from 1 to 10000, basis tenure/possession/judgment and a nonempty stable evidence id. Declared estate shares in a county cannot exceed 10000. Estate evidence is private and heritable; it supplies no tax, public jurisdiction, automatic income or settlement grant. Each claim requires unique id, realmId, distinct inhabited countyIds, share0 and evidence; its saved status remains demanded with contractId null. Each opening migration requires from, to, rate greater than zero and at most one, community culture/religion and optional distinct actorIds. It moves existing civilians through the conserved population API, recording actual cohorts and accompanying household homes. Restore never replays these declarations.

A local institution may declare representative with optional name, born, sex, role, station, skills and traits. Initial historical profiles do not repeat when an incumbent dies. kind congregation uses the episcopal_sees switch but needs no officeId; its priest/monk character supplies living church_support recognition. Existing see/patriarchate institutions keep episcopal office rules. Settlement layout entries may declare communities with unique existing county culture/religion pairs and populationShare0 summing to 10000. These relative site weights are projected onto conserved integer county and settlement totals at fresh initialization. Event trigger and option require countyIds select distinct known stable province ids using live locationId or current player county.

Agreement story definitions

FBDATA.storyCampaigns also accepts type tribute_cession and civilian_migration from js/story_agreements.js. Both require id, name, desc, inclusive firstYear/lastYear, actor realmId and optional requires/conditions. Conditions accept owner with provinceId/realmId or story_result with storyId listed in requires and result. Parties and inhabited counties must exist in the owning bookmark. Name and desc use the storyCampaign localization namespace. Data registration resolves dependencies and rejects missing or cyclic requirements.

tribute_cession additionally requires distinct source realmId, positive integer tribute and intervalDays, distinct nonempty countyIds and retainedCountyIds. Optional firstTurn is a nonnegative opening offset. actor may require a character with storyId/field in requires. Both current courts approve, paying before cession; retained counties stay with the source. Successions, war, changed ownership and missed installments end the original agreement without reversing possession.

civilian_migration additionally requires community culture/religion, share greater than zero and at most one, positive integer batchSize and nonempty routes with distinct from sources and different inhabited from/to counties. The authorizing court must control both ends and be peaceful. Authorization fixes a cohort ceiling; one conserved batch per season moves existing residents. Changed court or route interrupts, war pauses, and exhausted cohorts cannot fabricate completion. Both types persist their once-only stamps, keep player authorization explicit and restore without initialization. Technology reviews historical_opening_households, private_family_estates, non_episcopal_congregations, tribute_cession_agreements and civilian_evacuation use none; see their owning authority, holdings and story designs.

A partition beneficiary may also declare dyn as a proper dynasty string; it is retained when the existing character becomes a ruler and ordinary children inherit. Registration dependencies can order political reviews before competing campaign dispatch without imposing an outcome condition.

Bookmark platform schemas

These schemas describe registered engine data and the accepted JSON runtime-mod surface. Author from docs/bookmark-template.js and consult docs/designs/bookmarks.md for the requirement gate, visibility, save lifetime and acceptance journey. JSON contains data only; executable stories, government strategies, module implementations and drawing shapes must already be registered by trusted scripts.

Bookmark schema

FBDATA.bookmarks is keyed by stable bookmark id. The bookmarks mod root accepts an object keyed by id or an array whose records supply unique valid ids; missing or duplicate array ids are rejected. Each record replaces a complete definition. Required fields are id, date, provinces, realms, duchies, kingdoms, empires, straits and scripted. id uses letters, numbers or underscores. name and desc are display text. date contains integer year, season from 0 to 3 and day from 1 to 90. era names FBDATA.eras; omission infers the single matching era for legacy data. geography names FBDATA.geographies; omission uses defaultGeography. hidden is an optional boolean; true rejects new campaigns through the picker, start codes, direct creation and observation, while inspection and matching saves remain accessible.

provinces is an array of unique county records. A settled county supplies id, name, realm owner, culture, religion, dev and optional duchy. Coordinates and terrain may come from the geography seed with the same id. Wastelands use wasteland:true and do not declare communities or settlement presentations. Communities use culture, religion and populationShare0, with unique pairs totalling 10000; the first pair matches the county principal identity. Optional settlements use the existing site/name/kind schema and stable slot order. realms is an array of unique records with id, name, color, capital, rank and optional government, religion, ruler, governingIdentity, techTraditions, liege, nonTerritorial and royalCourt. Profiles, courts, opening declarations and institutions use their existing schemas in this guide. Named governments and identities must resolve in the effective catalogue.

duchies, kingdoms and empires are rank-scoped title tables. Counties name a duchy; duchies name a kingdom or null; kingdoms name an empire or null. Canonical slugs are preferred, with legacy d_/k_/e_ aliases accepted only in the matching typed namespace. straits is an array of distinct county pairs. crossingClasses maps canonical sorted pair keys to narrow, coastal or open, and may classify only an existing crossing. scripted uses the existing dated realm-history records and typed county/realm targets.

Optional fields include settlementLayout, climate, religiousHeads, localInstitutions, opening, openingInfrastructure, stories, starts, systems, requirements, balance and greatHolyWars. settlementLayout names settlementLayouts; null uses generated settlements, while omission tries the bookmark id and geography defaultLayout. localInstitutions is a complete per-bookmark replacement, including an empty object. Its incumbent representative or explicit vacant:true applies only at creation. religiousHeads maps faith or head-office ids to opening realm ids. stories lists registered world stories; starts narrows the compatible startScenarios catalogue, and its entries must satisfy their own bookmarkIds/eras restrictions. climate uses zone and per-county provinces overrides. balance may override only existing keys with compatible types. greatHolyWars is the supported legacy boolean below explicit systems overrides.

Era schema

FBDATA.eras and the eras runtime-mod root are keyed by lowercase slugs. Complete records merge by id. Required from/to are inclusive integer year bounds with from <= to; registered era windows must not overlap. defaultGovernment and defaultCulture name registered records. costume optionally names a wardrobe. ladder uses the validated station-band schema. systems and balance use their ordinary override schemas. technology declares from, to and a registered startingKnowledge policy; its interval lies inside both the era and techCoverage, and the bookmark date lies inside it. military may declare excludeRoles and equipment from/to; core roles cannot be excluded. Null or omitted optional slots retain shared defaults.

Presentation fields are architecture (registered architecture style), emblem (heraldry, standard, chi_rho or tamga), currency (valid label/icon or complete currency definition) and costume (registered wardrobe). Culture architecture takes priority over era architecture and then manuscript. Geography currency takes priority over era and global currency; an explicit runtime currency mod retains its ordinary presentation override. The unused vocabulary field is retired; era words belong in lexicons. A running campaign retains its stamped era even when its year advances.

Geography schema

FBDATA.geographies and the geographies mod root are keyed by stable lowercase slugs. A definition has bounds with lonMin/lonMax and latMin/latMax, integer gridWidth from 100 to 4000, and land polygons. Bounds increase and latitudes remain inside -85 to 85. seas and rivers use the existing polygon/polyline coordinate arrays. Optional provinces supplies seed records with id, x, y and terrain; sites is a physical settlement-site table, or omission shares settlementSites. Politics, county owners and communities remain in bookmarks.

Optional defaultLayout names settlementLayouts, currency uses the currency schema, mapScale has nonnegative numeric tuning values, climate has a zone and provinces map of registered climate zones, and names contains provinces/sites maps of dated display-name lists. Every name-map key must exist in the base seed/site catalogue. Each dated name has name and optional inclusive from/to and culture. Optional knowledge has basins keyed by id, each with known provinces, and routes with known basin endpoints. knowledge.starts is keyed by registered start id; each value may list known campaign provinces and known basins. These hooks are validated declarations and do not create saved knowledge by themselves.

Government-form schema

FBDATA.governmentForms and the governmentForms mod root are keyed by stable lowercase slugs. Each record names registered holders, succession, territory and consent strategies. Optional levy, revenue, council, diplomacy, ai and ladder slots use deprecated engine_default aliases of named implementations when omitted. The retired vocabulary field is rejected; use the government lexicon layer. Data cannot create a strategy implementation. Current strategies and office scope rules are documented under Scoped authority definitions; agnatic_seniority additionally requires the authored court founder/ancestry contract.

Optional costume names a wardrobe, officeCatalogue lists unique registered appointable offices, systems and balance use their ordinary override schemas, and legalTradition selects a known tradition or the supported faith delegation. Law definitions and jurisdiction mappings use the legal schema already documented in this guide. A realm may choose a form, otherwise the era default applies. An offered start's explicit governmentForm must be present in its bookmark opening.

System schema and requirements

FBDATA.systems is a trusted-script registry, not a JSON runtime-mod root. Each definition has matching id, desc, boolean defaultEnabled and a nonempty modules list describing the owning engine modules. Optional requirements uses the declaration below. Availability layers on era, form, effective faith and bookmark may use a map of known ids to booleans or enable/disable arrays. Lists contain unique ids and may not conflict with one another or a map entry. Precedence is registry, era, form, faith, bookmark. Content membership uses either system with one known id or systems with a nonempty unique list, never both. Membership does not grant research or ordinary eligibility.

requirements is an optional object on bookmarks, starts, registered stories, reusable story declarations, trusted system definitions and effective faith/head metadata. Keys are eras, geographies, governments, provinces, sites, realms, starts, stories, systems, capabilities and titles. Except titles, values are lists of unique nonempty ids. eras and geographies list acceptable alternatives. governments requires at least one named form in the opening. Other lists name required records; stories must be attached and systems must be enabled in the declaration's scope. capabilities requires at least one granting technology reachable by the supported era window's end, including earlier inherited grants and their hard/alternative prerequisites. titles contains typed objects with kind duchy/kingdom/empire and id. Unknown requirement keys fail. Native stories may additionally implement a pure appliesToBookmark(definition) authoring hook; mutation hooks are never used to validate a world.

Lexicon schema

FBDATA.lexicons and the lexicons mod root have base, eras, governments, faiths and cultures layers. The last four are keyed by ids in their corresponding effective catalogue, including same-mod additions. Each entry may contain terms, rank and labels. base defines every term. terms maps a stable term id to an object with string one/other and optional title, plus an optional f object with the same forms. Non-base layers can override only existing base terms. rank has m/f arrays of labels for every used station band. labels maps display kind, record id and field path to English text; unitRole labels name the registered role of its default unit class.

Resolution prefers culture, nearest faith ancestor, government form, era and base. The government context is the viewer's own realm or immediate liege unless explicitly supplied. Runtime mods compose sparse lexicon entries and reset the resolver index. Structured display labels use the existing localization owners. Saved term snapshots retain semantic catalogue keys and English source, not a rendered translation or a simulation rule.

Requirement preflight for runtime mods

FB.mods.validate returns named requirement diagnostics without installing content. FB.mods.apply runs the same detached preflight before accepted mutations, and the store path validates before persistence/reload. The eras, wardrobes and settlementLayouts roots merge complete records by id; bookmarks remain atomic replacements. A same-mod addition can satisfy another declaration in that mod. Existing registered bookmarks are rechecked when an era or content record changes. Mods in the stored stack apply in order; a dependency supplied only by a later mod cannot repair an invalid earlier mod. Activation repeats FB.validateBookmark before world generation. docs/ and test fixtures stay outside runtime script loading and shipping allowlists.

Opening revision catalogue and existing-person references

Optional bookmark openingRevision is a lowercase slug naming the current openingRevisions entry. openingRevisions maps immutable revision slugs to complete opening declarations; the current entry must equal bookmark.opening. Optional openingLegacyRevision selects the declaration used by saved bookmarkSetup records without a revision. New records save revision. Keep every previously saved revision and its declarations unchanged; when advancing, preserve the former current declaration as literal compatibility data and assign a new current id. Unknown revisions are rejected. This catalogue versions opening records, not later event prose, historical story definitions or geographic schemas; incompatible changes to those still need their own migration policy.

An opening.actors entry may instead contain only ref. ref with kind realm_ruler requires realmId from that bookmark. ref with kind story requires storyId from bookmark.stories and a field identifier identifying the character id saved by that story (for example illusId). Identifiers start with a lowercase letter and may then contain letters, digits or underscores. These declarations reuse existing people and accept no profile overrides. Each resolved character must be distinct within the actor mapping. Realm references resolve during fresh initialization; story references can defer until story initialization completes. Appointments may use either. Parent links and private estates require explicit profiles with the existing sex, birth and dynasty evidence. Initial civilian migration actorIds may use generated profiles or realm references, but not a deferred story reference. Restore uses saved character ids and does not allocate or resolve new actors.

Campaign territorial government settlement

Optional campaign settlementForm names a known governmentForms entry with territory fixed. It requires a landless condition for the same actor realm and cannot accompany migrationId. A won ordinary campaign that actually owns target.provinceId clears that realm's nonTerritorial marker, selects that capital and applies the government form once. It awards no territory or troops. An optional settlement block then retains its existing civic mediation and community requirements. Dates only open opportunities. Technology impact campaign_territorial_settlement is none, using possession and political eligibility.

A patron's host appointment can use a foreign host only while an effective nonhostile service contract names that exact host and polity. Shared appointment scope lists use the same boundary. Technology impact federate_host_commissions is none. Adding institution definitions affects newly created rosters; ensureLocalInstitutions does not append missing definitions to an existing saved roster. An intentional old-save roster change requires explicit migration.

Same-date regional declarations

The 476 bookmark composes five literal regional declarations. data/bookmark_476_outer.js owns the outer region (Britain, Scandinavia and the North Sea, Roman Syria and Sasanian Persia): its provinces, courts, physical sites, events, province groups, straits and climate assignments. It loads before data/bookmark_476.js and adds its layouts to settlementLayouts['476']. data/political_institutions.js gives the 476 bookmark its own complete localInstitutions table with Antioch and Jerusalem on authored sites, while the global fallback table keeps their null sites for other bookmarks. data/aristocratic_courts.js, data/assembly_polities.js and data/mobile_confederations.js later revise the same 476 definition for their government consumers. No additional runtime-mod root or engine hook is introduced.

A content expansion that changes an existing institution's physical site must either provide a reviewed migration or accept that earlier saves of that bookmark no longer restore. Saved institution rows require an exact site match with their own bookmark definition. The 476 regional merge took the second route because no released 476 saves existed: development saves made before it are unsupported, and saves naming the retired 476_outer or 476_mobile ids fail with the ordinary unknown-bookmark message. A new bookmark must declare compatible starts, complete stable county coverage, title chains, layouts and institutions. Generated rulers remain explicit generated:true profiles. The shared structured extractor maps every regional label to the 476 owner. Catalog regeneration remains an owner-requested integration step.

Trusted tenure system metadata

System definitions may declare tenure as an object to enable shared dependent household tenure. An estate form adds estatePossessor:true, blockedCareerRoles as known profession roles, reviewDeedId as a registered deed id and distinct releaseRoutes. Each route has id plus either careerId and nonempty careerRank, or eventId with no career fields. providesOrdination is an optional boolean system property enabling the existing local-bishop consent check. These are trusted system catalogue fields, not a new runtime-mod root. Registry validation checks references before activation. Existing save enums and ordinary career eligibility remain authoritative.


Historical story instance authoring

Use FBDATA.storyInstances keyed by the unique instance id. Every definition names id, type, name, desc and optional requires/requirements. Add its id to bookmark.stories. Data source tables may organize declarations by bookmark, but data/story_instances.js composes the one registration catalogue. Keep declaration order stable. Optional registrationBefore/registrationAfter anchors name an existing native story; dependencies must resolve before their consumer. The storyInstances runtime JSON root merges complete declarations by id. Unanchored instances follow the retained built-in order; registrationBefore or registrationAfter names an effective instance or trusted native adapter. Candidate compilation resolves same-import dependencies before checking every affected bookmark and start. Factories and migration implementations remain trusted engine code, outside JSON.

A shared character reference is an object with kind realm_ruler and realmId, kind story with required storyId and dot-separated field, or kind opening_actor with actorId. Campaigns retain compatibility with the earlier storyId/field object and fixed character-id string. A shared region reference is kind provinces with unique provinceIds, or kind region with regionId from bookmark.storyRegions. Each bookmark region declares exactly one settled provinceIds list or known duchies list. The requirement gate rejects unresolved references, unknown types, invalid date windows and unreachable requires without initializing people or consuming RNG.

Settlement definitions require firstYear, lastYear, chance in 0-1, truceDays, actor realmId/capital and news outcome key/text descriptors. actor.character is an optional shared reference. succession_partition also declares cast references, actor.castField, branchRealmIds and existing shares with realmId/castField. designated_succession declares ordered regions with id, selector and grant (id, capital, rank, titleKind, titleId). diplomatic_exchange declares source realmId/capital/optional character, actorGift, sourceGift and opinion in -100 to 100. recognition declares source, authoritySource, requireImperial and a region selector. treaty_settlement declares a required-story planRef, ordered regions with id/selector/titleId and optional pressure threshold/chance. There are no arbitrary script conditions or effects. Date windows open opportunities; living courts, resources, current land, consent and ordinary transactions determine their results.

Instance name/desc use the storyCampaign localization namespace. News descriptors stay in data and are registered by the factory. The extractor reads the literal storySettlements800 table alongside the campaign source catalogues. Reusable type files never select historical content through literal ids. Structural spellings remain directly quoted and require explicit protocolFiles reviews with exact per-file counts when they collide with data ids; shared token-table indirection is forbidden. See designs/stories.md for lifecycle order and designs/state-and-saves.md for the supported 800 record split.

Reusable court and track instances

Classic data scripts and runtime JSON storyInstances may declare court_settlement, ruler_restoration, contested_office and political_track using their registered types. data/story_courts_476.js supplies the complete historical example. Load authoring sources before the instance catalogue, and load js/story_courts.js before js/story_track.js, both after js/stories.js and before js/main.js. The registry resolves data anchors and dependencies after factories load.

Court openings declare ordered cast rows with shared refs, royal_member lookups or created character profiles, an optional family link, standing hosts and an ordered authority list of recognition/appointment transactions. Linked stories declare courtStoryId, requires and cast references to exported parent fields. Parameters name realms, counties, faiths, careers, offices, institutions, sources, host ids and numeric terms. Household progress-record contracts are service_negotiation, civic_mandate and claim_restoration. A political_track declares initialStage, phaseStages and its own stages. Each stage has a mechanic, localized name and ordered choices, with optional groups and transitions keyed by mechanical outcome. Choice rows contain id, operation, label, detail, optional detailParams and optional nextStage. nextStage takes precedence over the current stage's transitions and phaseStages defaults. Without a route override, an operation that keeps its mechanic keeps the same authored stage. Stage ids and counts are unrestricted by the old historical path; multiple stages may share a mechanic and unused paths may be omitted. Every declared stage must be reachable. Targets must exist and match the operation's mechanical outcome, and every autonomous recovery outcome must have a route. Required cast roles derive from the declared operations and autonomous mechanics, rather than a fixed cast list. Operations own requirements and transactional outcomes; declarations cannot add arbitrary effects or executable hooks. These declarations use the storyInstances runtime JSON root and the same typed factories as classic-script content.

Keep released instance ids and saved field meanings stable. When a new type needs a new saved format, give its record an explicit schema version and a detached fact-only migration. The 476 conversion adopts the existing record formats directly.


Government strategy interfaces and parameters

See docs/designs/governments.md for every method and typed context. Holders ids are feudal_vassals and direct. Succession ids are dynastic, agnatic_seniority, office and acclamation; the last two explicitly delegate to dynastic. Territory ids are fixed and non_territorial. Consent ids are territorial and delegated. The default levy is feudal_levy, revenue demesne_revenue, council royal_council, diplomacy territorial_diplomacy, AI realm_decisions and ladder inherited_ladder. Federate_contracts and roman_offices compose the shared AI with existing contract and office decisions. Existing roman_civic and federate_polity ladder overlays remain registered.

A form may declare strategyParameters with council:{seats:[seatId,...]} and/or ai:{warChance:number}. Council seat ids must exist in the effective council catalogue, be unique and remain in the catalogue's order; an empty list selects no seats. War chance is finite and between zero and one inclusive. Other parameter slots or fields are rejected. Omission retains original defaults. Numerical balance, system toggles, officeCatalogue, legalTradition, costume and lexicons continue using their existing schemas. JSON cannot register callbacks, strategies or expressions.

Every bundled form explicitly names all ten slots. Existing mod forms may omit the six historically optional slots. Named but incomplete strategies, unknown ids, invalid parameters and vocabulary fail form validation before activation. New trusted modules register implementations after their owning engine modules and before gameplay starts; no source code is loaded from a JSON mod. State and RNG remain in the existing transaction owners.
Government constituencies

lineage_kingship is reusable through governmentForms and the normal strategy slots. selectionProfile declares eligibility (minAge 16-80, optional sex, ancestry boolean defaulting true, optional authority officeId), tieBreak (seniority or identity), consensus (greater than 0.5 through 1), quorum (greater than 0 through 1), negotiationCost, levy/revenue terms in [0,1], reserved operations and 1-24 member templates. Each template has id, name, principal (senior_kin, capital_community, or a typed character/institution reference), scope (realm or capital), basis (kin_recognition, community_assent or public_office), integer weight 1-10, continuity (institution, vacant or senior_kin), minimumSupport [-100,100], minimumMartial [0,100] and maximumLevy/maximumRevenue [0,1]. These are simulation choices, not votes attributed to historical populations. The canonical royalCourt supplies kin; no culture or historical id switches engine behaviour.

transformationOptions is a list of allowed target formId and localized name. It applies to every form, not only selection-managed ones: the assembly settlement, the aristocratic continuity review and Provincial continuity offer only declared targets, and their quotes refuse others. Each formId must be a different registered form and appear once. Changing a current selection-managed government requires a reviewed transform transaction. FB.governmentSelection.quote(state, realmId, request) and apply(state, review) support open, support (optional withhold), withdraw, negotiate, assent, obligations, resolve, enroll and transform. Requests use a typed actor plus the operation's candidateId, memberId, terms, provinceId, cause or formId. Death, abdication and lawful_removal are valid opening causes; lawful removal needs actual judicial custody or a current justified deposition judgment. Direct institution mandate actors are for trusted engine decisions, while player-facing actions require the actual living principal. Reads never seed new state.

For another canonical selection owner, registerSource accepts pure quote and applying functions. reviewSource returns a detached review and commitSource rechecks the whole review before calling its owner. Bundled source ids are elective_crown, civic_election, administrative_appointment and religious_office_result. The last acknowledges a current canonical holder without appointing anyone. New forms must keep existing election/office/property owners and declare any additional save contract explicitly. The fictional test fixture demonstrates a separate female-only adult kin profile, local scopes and reduced obligations without engine changes.

Assembly constituency profiles

constituencyProfiles is a keyed public table. A bookmark realm using a form whose succession strategy declares delegatedLeadership must name constituency, hold at least one inhabited county and have no liege. representative is optional and accepts only name, sex (m or f), born and a skills map. Its authored age and skills must satisfy the profile. The initializer creates an ordinary representative and local continuity candidates, never a royal genealogy. Omit these fields on other forms.

Each profile requires eligibility, selection, recall, obligations, reserved, powers and members. Unknown fields are rejected. eligibility contains minAge (integer 16-60), minServiceYears (0-20), skills (known skill keys with values 0-20) and free (boolean). selection contains threshold (greater than zero through one), tie (id), termDays (null or integer 90-7200) and nominationCost (0-100). A null term declares no scheduled expiry.

recall contains threshold (greater than zero through one) and unique reasons chosen from neglect, overreach and ineligible. obligations contains revenueRate and levyRate (0-1), plus maxDues, maxLevy and reserve (0-10000). reserved contains unique operation names chosen from war, treaty, grant, extraordinary_tax, pledge and conversion. powers contains unique names chosen from ban, peace and revenue. The generic engine still rejects unsupported communal grants and pledges.

members contains 1-16 records with unique id, display name, integer weight (1-10), basis (custom or service), continuity (institution or person) and support (0-100). Opening members refer to the declared county institution and its county scope. Runtime member records use typed county or character principals; character references belong to saved state, not guessed opening ids. A missing institutional principal can be explicitly repaired to its county. A missing personal principal cannot be silently replaced.

data/assembly_polities.js contains complete coastal_households and settlement_federation examples. The latter is fictional and has a two-year term, service qualification and paid nomination. assemblyOpenings and assemblyCounties are bundled source organization, not additional mod merge APIs; put a custom opening inside an atomic bookmark and supply its constituencyProfiles entry in the same mod. Neither culture nor missing ruler information selects an assembly automatically.

Government lexicons may set institutionalRanks:true to preserve their local standing vocabulary instead of cultural or religious rank overrides. This flag is valid only on government lexicon layers and must be boolean. It changes presentation only; a public delegate mandate remains separate from station-band identity.


Administrative monarchy profile schema

administrationProfiles is a JSON mod root keyed by stable profile ids. A profile has name, offices (a distinct nonempty array of existing authorityOffices with publicRole), governor/fiscal/commander (office ids with matching publicRole), appointmentCost (finite nonnegative), termDays (integer 90 to 3600), confirmation (continues or reaffirm), finance and accession. finance has kind (salary or revenue_service), share (greater than zero and at most one), salary (finite nonnegative), serviceShare (zero to one) and remittance (1). accession has mode (dynastic, designation or recognition), minimumAge (integer 16 to 30), allowMinor and officeCandidates (booleans), threshold (at least 0.5 and below one), and up to eight interests with unique lowercase ids, role (governor, fiscal or commander), and positive weight at most 10. court is reserved for the designation principal. Shares, fees, stipends and weights are gameplay data.

A governmentForms record can declare administrationProfileId, which must name the effective profile table. A fresh bookmark realm may declare administrationProfileId only for a form supporting public administration. Bundled profiles include public_court, abbasid_800, byzantine_800 and the separately dated profiles in data/government_rollout.js. Existing public offices use publicRole and ordinary appointment qualification fields; the profile declares its office catalogue, term and remuneration. Saved assignment schema and pure quote/apply interfaces are documented in docs/designs/administrative-monarchy.md. These fields do not authorize realm-id dispatch or retroactive save initialization.

Dated government assignment

Assign an existing registered government and its typed profile in a bookmark realm declaration. For a released world, keep the baseline and create a new revisions entry with the complete revised realms array; an omitted realm is not an incremental patch. Retain the previous revisions and stable profile ids so old lives keep their saved meanings. Do not change era.defaultGovernment or a released form's strategy assignments to upgrade fresh worlds. Explicit JSON mod overrides continue through the normal effective-catalogue validation and mod-bound save path.

data/government_rollout.js demonstrates source-level composition after date-owned data. Its governmentAdministrationProfiles and governmentEcclesiasticalProfiles tables are supplemental source organization, not additional JSON mod roots. JSON authors use administrationProfiles and ecclesiasticalProfiles. Each new record must supply the complete documented profile fields, rather than a profile inheritance or patch shorthand. The river_service_rollout fixture at tests/e2e/fixtures/government-rollout-mod.json declares a different term, source-backed revenue/service pay and recognition policy using existing strategies. The companion spec imports it through FB.mods.store with a complete bookmark revision. No executable strategy registration is part of the mod.

government_rollout.js composes terrain_v2_governments_v2 for 711, inhabited_v2_governments_v2 for 800, and governments_v2 for 867 and 1066. The later Islamic rollout selects reviewed descendants for 800, 867 and 1066; these government predecessors remain resumable. Both later dates retain inhabited_v2_governments_v2 as an explicit geography review revision. Date sources load before government_rollout.js, which composes each uncombined declaration without promoting opt-in geography or overwriting an explicit retained result. Supported worlds keep their complete definitions; restore never repeats opening assignments or rewards.

data/bookmark_711_terrain.js is an example of a date-owned whole-field revision. Its bookmarkTerrain source table is composition organization, not a public JSON mod root. The ordinary bookmarks/revisions, settlementSites, province communities and realm government schemas remain the authoring contract. It reuses europe_regional_2's physical seeds and explicitly leaves unused seeds wasteland. Root baseline fields and earlier revisions remain independent; new sites have unique ids and no old slot is renumbered.

Aristocratic monarchy profile schema

aristocraticProfiles is a keyed JSON mod root. A profile declares name, administrationProfileId, minimumAge (integer 16 to 30), allowMinor (boolean), threshold (at least 0.5 and below 1), negotiationCost (finite nonnegative), defaultTerms (revenue and levy fractions), minimumRevenue (at least 0.5), minimumLevy, refusalSupport, enforcementSupportCost (finite nonnegative), and one to sixteen permanent interests. The associated administration profile must use recognition, disable officeCandidates and match the age, minority and threshold policy.

Each interest declares a unique lowercase id other than court, name, dynasty, actorId, a distinct provinceId, an existing fiscal county officeId, positive weight at most 10, nonnegative minimumMartial and maximumRevenue/maximumLevy fractions at least the profile minima. MaximumRevenue is below 1. Optional openingGovernor names an actorId and provinceId. A fresh atomic bookmark supplies a royalCourt, adult opening actors of the declared dynasties within that realm's owned provinces and any requested governor actor. The form and realm may declare aristocraticProfileId alongside administrationProfileId. chartered_court and sasanian_476 demonstrate generic and dated policy. Reuse existing authority offices; profiles provide data, never functions.

The aristocratic government uses only actual founder descent for sovereign eligibility, independently of wealth and personal office. Public commissions, perpetual local assignments, inherited customary rights and private estate deeds retain separate canonical records. Saved facts are not a mod initialization API; older forms/openings remain unchanged on restore. Optional record schemas, pure provincial/probate/stewardship/conversion reviews and preservation rules are in docs/designs/aristocratic-monarchy.md.

Mobile confederation declarations

Optional mobileProfiles entries may include supplyPolicy with exactly schema:1, targetDays (integer 1-30), carryDays (integer 1-30), cashReserve (finite nonnegative public money up to 1000000000000) and optional replacement. replacement contains exactly targetMen (integer 0-100000000), maxPerReview (integer 1-10000) and unitIds (1-8 unique effective non-hired unit ids, including same-import additions). These are intrinsic ceilings, not new grants or higher population/host limits. Actual pledged pools, existing rosters and ordinary era/culture/technology gates still bound recruitment. Omission preserves the existing seasonal quotes and thirty-day carriage.

FB.mobile.supplySnapshot(state, realmId) is a pure projection of actual camp and host daily demand, local versus remote field stock, target and carrying capacity, public reserve and affordable purchase/replacement terms. targetDays is desired coverage, never guaranteed supply. Only the host at the camp contributes a field replenishment deficit. Actual host ration modifiers apply. A policy may lower the thirty-day baseline carrying limit; retained excess food is conserved. Daily host supply percentages measure fullness of that configured carrying capacity; ordinary consumption and attrition remain in charge. Existing finite pasture and shared production accounting are unchanged.

FB.mobile.supplyReview(state, realmId, action, actor) accepts trade or recruit and returns an ordinary mobile review tagged with terms.provisioning:true. Confirmation recalculates the exact policy-derived terms and rejects stale need, price, stock, access, command, people or reserve. The actor defaults to the actual realm authority for AI; player UI supplies its character. A partial purchase exchanges local stock for real public money. A replacement requires camp presence, a current eligible pledged pool, no conflicting outside commitment, one day of actual rations and its normal training cost. No policy creates people, food, authority or a technology bypass. The daily AI uses the same two reviews once under lastDay. No saved policy field or migration is introduced; restore reads existing canonical balances without running a policy. Independent ordinary examples: tests/e2e/fixtures/authoring/expedition-supply-harbor.json and expedition-supply-upland.json.

An optional realm mobile.opening object authors principals, leaderMemberId and muster. principals is a nonempty list bounded by the selected profile's member count. Each entry has memberId and person. The person is either {kind:'opening_actor', actorId:<opening actor key>} or {kind:'realm_ruler', actorId:<opening actor key>, realmId:<this mobile realm>, generation:<opening ruler generation, normally 1>}. Both bind one already initialized direct bookmark opening actor. Deferred story references and references to another realm's landed ruler are unsupported. The incumbent form additionally requires the actor's name, birth, sex, culture and faith to match this realm's authored ruler; it retains that incumbent generation rather than recording an accession. Actor references must be distinct, adult under the profile's minimum age, living, free of custody and exile, and present at the declared origin. They cannot already belong to another active following. Unbound profile members retain ordinary generated principals. leaderMemberId must name a bound member. Principal identity does not change the following's population identity, confer an outside office or implement delegated command.

muster is a nonempty list of at most 64 {memberId, unitId, count} entries with unique member/class pairs and positive integer counts. Its total must equal mobile.fighters. Each member's combined deployment must fit floor(population * pledge); the whole opening can draw from several members. Hired units are rejected, and every class must pass normal era, culture and technology gates at initialization. The canonical migration host receives the declared composition and a demographic roster withdrawn exactly from the named civilian pools. Food carriage is withdrawn from opening food once. This declaration adds neither recruitment payments nor extra people, private money or host columns.

FB.mobile.openingPlan(state, realmDefinition) is a pure fresh-opening eligibility projection. Initialization rechecks the plan, including current generation, custody, location, unit gates, other following memberships and conflicting hosts or migrations, before creating any opted-in following. Authored declarations initialize after direct opening actors and before world stories in both playable and observer campaigns; declarations without mobile.opening keep their earlier initialization order and generated defaults. The independent mobile-opening-harbor.json and mobile-opening-dune.json files under tests/e2e/fixtures/authoring exercise the ordinary JSON path. Matching saves validate retained schema-2 mobile rows and their bounded openingBindings without reinitialization. Missing or malformed binding records fail validation; legacy schema-1 rows remain unchanged for declarations without this opt-in.

FBDATA.mobileProfiles and the top-level mod mobileProfiles table select reusable policies for explicitly declared mobile_confederation realms. A realm mobile object requires profileId, patronRealmId, origin, target, food, fighters and treasury. Its realm supplies culture, religion, capital, rank and nonTerritorial:true. Origin and target must be inhabited; patron must be a distinct authored realm. Initial fighters are withdrawn from the first member following, not added to local population or fabricated from county levies. See data/mobile_confederations.js and docs/designs/mobile-confederation.md for complete profile fields and bounds.

FB.mobile.review(state, {realmId, action, actor, terms}) and FB.mobile.commit(state, review) use the shared government selection owner adapter. The actor is a typed realm or character principal. Actions include pledge, support, select, propose, assent, recruit, demuster, move, march, offer, accept, join, replace_member, leave, settle, work, trade, war, peace, service, land and contract. land reviews a patron-owned camp county before requesting ordinary shared service terms. contract uses FB.mobile.contractTerms(state, contractId) to review those exact terms before recording the coalition's consent. Review is pure and detached; commit revalidates against current actors, people, stock, ownership and money. Only fresh initialization consumes a realm declaration. JSON mods choose registered strategies and cannot supply executable source.


Elective selection profiles

selectionProfile.candidatePool requires gentle (boolean), cultures and religions (unique existing catalogue ids, with an empty list permitting all), and excludedRoles (unique role strings). It requires eligibility.ancestry:false and a procedure. procedure requires realmRecognition, designation, interimRevenue and defensiveLevy booleans. capital_elite and capital_clergy principal selectors resolve an existing capital council or congregation into a typed institution reference. The initial campaign alone seeds the optional selection record; ordinary save restoration never does.

An optional boolean freshOnly on a localInstitutions definition restricts creation of its representative to explicit fresh campaign initialization. Restore and ordinary repair retain existing saved rows but do not create an added freshOnly institution. Elective capital selectors require realm scope and institutional continuity; a capital institution outside that court's current sovereign territory cannot supply assent.

The common quote/apply operations additionally support nominate (memberId and characterId, authorized by a living principal) and designate (candidateId, authorized by the current court only where permitted). Nomination creates an electoral_candidate reference in the existing court tree; it preserves the ordinary person and private property. FB.electiveConversionQuote(state, actor, realmId, formId) and FB.electiveConvert(state, review) revalidate an explicit conversion using existing rulers, delegates, support, public resources and obligations. They do not reconstruct missing institutions or split private funds. See docs/designs/elective-monarchy.md.

Civic profile declarations

civicProfiles maps a stable id to name, constituency, eligibility, executive, interim, offices and consent. eligibility contains sex (m, f or any) and membership (boolean). executive is chief, majority or unanimous; interim is council. offices is an ordered array of one to eight unique records with id, name, termDays (null for life or 90-7200), and salary (0-100). The first office supplies the external ruler reference, without replacing collegiate assent. consent contains war, treaty, extraordinary_tax, pledge, grant and conversion, each an influence fraction greater than 0.5 through 1. The named constituencyProfiles record owns its existing adult/free/service/skill requirements, interests and fiscal bounds. Influence and reduced office counts are simulation parameters.

A government form using civic_magistracies must declare civicProfileId. A fresh realm can override that profile and must declare the same constituency, inhabited directly held territory and no liege or royalCourt. Optional civicRights is an array of at most twelve records containing kind, grantorRealmId, provinceId, settlement, share, duration and evidenceId. Opening kinds are quarter, warehouse, jurisdiction or commercial; share must be zero, duration null, and evidenceId a nonempty stable historical reference. Foreign county sovereignty remains with its host. Negotiated revenue_share uses a real public source through the civic transaction rather than an invented opening amount.

The civic_magistracy adapter registers with governmentSelection.reviewSource/commitSource. Other public interfaces are civicGovernment.officeQuote/officeApply, proposalQuote/proposalApply, warQuote/launchWar, peaceQuote/makePeace and conversionQuote/convert. Quotes are detached, pure and require exact revalidation at commit. Saved civic schema, receipt conservation and record bounds are in docs/designs/city-republic.md. civicConstituencies and storyCivicSelections are bundled source organization, not extra JSON mod roots.

Ecclesiastical temporal declarations

ecclesiasticalProfiles is a keyed JSON mod root. Each profile requires name, source (papal_election or local_office), chapter and layRecognition booleans, appointmentCost, recognitionCost and reserve (finite 0 to 1000), revenueRate and levyRate (0 to 1), distinct interim operations (revenue, peace, defence, levy), distinct reserved operations (war, treaty, grant, extraordinary_tax, pledge), and powers (ban, peace, revenue). Local office profiles require a separate chapter; papal profiles delegate to the existing election owner. A realm using ecclesiastical_principality requires ecclesiastical with profileId, officeId and institutionId (null for papal office bindings). Local sees may declare chapterId referencing a congregation in their county and officeProfile containing holderSex (m, f or null), holderRole (priest, monk or null) and minAge (18 to 80). These eligibility fields are consumed by the religious office registry. A lay-recognition profile needs a superior at opening. The canonical public treasury, properties and religious ledger are reused. See docs/designs/ecclesiastical-principality.md for save fields and reviewed APIs.

World revisions and additive geography

A bookmark may declare revision and revisions. The revisions object must contain baseline. Root world fields describe the retained baseline; baseline overrides apply first, followed by the selected revision's overrides. Overrides replace whole fields, including arrays and catalogues. Supported fields are geography, provinces, realms, duchies, kingdoms, empires, straits, crossingClasses, localInstitutions, settlementLayout, climate, religiousHeads, starts, startLocations, stories, storyRegions, scripted, opening, openingRevision, openingRevisions, openingLegacyRevision and openingInfrastructure. Date, id and era remain bookmark identity rather than revision fields. Use another bookmark for another opening date. Validating a revisioned bookmark checks every revision. A registered start whose fixed birthplace or ruler realm is missing from one revision, but present and inhabited in another revision of the same bookmark, is treated as belonging to that other world and is skipped there. A reference that no revision supplies still faults, and so does a start that a revision's explicit starts list names.

FB.bookmark(id) resolves the default fresh revision. FB.bookmark(id, revision) resolves an explicit revision. FB.campaignBookmark(state) reads the saved revision, taking baseline when the old stamp is absent. Effective definitions omit the revisions catalogue to avoid accidentally resolving an already-expanded definition as the baseline. Inspect FBDATA.bookmarks[id] for the authored catalogue. Save v4 platformSchema 2 requires state.start.revision, including baseline for unversioned bookmarks. An unknown revision or mismatched revision/geography fails closed. Mod fingerprints remain exact; changing a mod does not silently upgrade existing lives.

Opening infrastructure declarations

openingInfrastructure is an optional whole-field bookmark/revision override, accepted by ordinary JSON bookmarks. Its exact fields are version:1 and placements, an array of at most 2048 entries. Omission retains the legacy inferred-fort policy; an explicit empty list declares an empty inventory. Each placement requires countyId, siteId, buildingId and condition, exactly standing or ruined. Only the single canonical fortification also requires level, an integer from 1 through 4 present in the effective fort levels. Other fields, numeric settlement indexes, percentages and unfinished projects are rejected. For example: {"openingInfrastructure":{"version":1,"placements":[{"countyId":"example_county","siteId":"example_hall","buildingId":"walls","condition":"ruined","level":2}]}}. These illustrative county and site ids must be supplied by the effective world.

Validation uses the resolved revision's normalized provinces, geography and layout fallback. The site must be declared in that county's ordered settlement list and physical site catalogue, unique across the world and established at the opening. Curated slots and the normal starting settlement capacity count as established; an unrevealed fill slot or a generated slot cannot be named. Moving a county off its geography seed suppresses the normal inherited layout, so a formerly matching site no longer resolves unless the world supplies its own ordered list. Map compilation continues to check physical coordinates against county raster membership. Display names never resolve an inventory target.

The complete proposed inventory, including ruins, must obey unique site/building pairs, per-building maxCounty, shared constructionGroup capacity, one fortification per county and maxDemesne per opening county holder. These are initial inventory limits; existing campaign assets retain their separate grandfathering rules. Holder scope follows the government holder strategy, including generated dukes/counts and subordinate courts, independently of sovereign ownership or player residence. The trusted direct and feudal holder strategies expose pure openingHolders(definition, realmId) projections; strategies composed from direct inherit that projection. A strategy without one cannot authorize an inventory placement. No person or realm is created by this projection.

FB.compileOpeningInfrastructure(definition) returns {explicit, placements, errors}. It selects a raw catalogue's default revision, or uses an already resolved retained revision, then performs the ordinary title/geography/layout resolution. Each successful compiled placement retains its authored fields and adds s, the stable numeric layout slot, and holderId, its opening holder scope. Every fault returns an empty compiled list. Compilation reads no live campaign or active map and leaves RNG, UID, declarations and save state unchanged. Full bookmark validation remains responsible for the rest of the world contract, including geography, site coordinates and government validity.

Inherited inventory is data, not construction. It does not need current knowledge, applicability or development requirements and creates no institutional rights or suitability evidence. Fresh playable and observer boot call FB.initializeOpeningInfrastructure(state) after final political/site identity and ruler adoption, before fort repair and population, market and treasury setup. It stages the complete ledger before publication and rejects a changed live site/holder or a nonfresh economic/building ledger without installing a valid prefix. Ordinary records contain s, id, devGranted:0, optional ruined:true and a canonical fort level where appropriate. Development already includes these assets; initialization grants no construction award, people, money or news. Standing effects and upkeep use normal consumers. No built-in date opts in here.

The strict optional state.openingInfrastructureState record has exactly version:1, explicit:true, bookmarkId and revision. Both ids are nonempty strings matching the stamped campaign and an effective explicit declaration. Presence records completed application, including an empty inventory, and suppresses inferred capital forts without changing fortMigration. Repeated application is a no-op. Restore validates this small marker and keeps the actual ordinary ledger, including demolished, repaired or conquered assets; it never recompiles placements to recreate property. Missing legacy markers remain absent and retain legacy fort repair. The frozen envelope/subsystem versions remain unchanged under this optional extension's explicit contract review in docs/designs/state-and-saves.md. The complete nested declaration participates in exact mod fingerprints; changing a level, condition, site, list or policy invalidates a matching old mod save.

Independent ordinary JSON examples are tests/e2e/fixtures/authoring/opening-infrastructure-estuary.json and opening-infrastructure-uplands.json. They differ in layout source, legal sites, holder distribution, group limits and standing/ruined fort choices. They are development fixtures outside runtime scripts and uploads.

The complete technology-buildings-composition.json example in the same directory combines these contracts with ordinary buildings, applicability and constructionGroup. Its inherited revision mixes standing catalogue assets with ruined scoped works and a canonical fort; empty supplies an explicit empty inventory, while baseline omits the policy. Two manuscript facilities share capacity but differ in knowledge, price, research and construction dates. The existing farmer beginning remains the start. Import the file through Mods; these source-independent JSON definitions require no script tag or executable registration. docs/research/technology-and-buildings.md records the effective catalogue, source loading, compatibility boundaries and owner verification commands.

A geography may extend another registered geography and declare provinceAdditions plus provinceOverrides. The resolver copies the inherited province list. Additions need unique, non-retired ids. Existing inhabited seeds cannot be overridden; existing scenery seeds may override name, x, y and terrain. An extension cannot also replace provinces wholesale. Inheritance cycles, unknown parents and unknown override ids are rejected. Independent full geography bases remain supported.

A physical seed may declare maxRadiusKm between 10 and 500. Its nearest-seed raster territory is capped using the local Mercator scale at its authored latitude, around the snapped seed. Unbounded surrounding seeds retain the remaining land. This is a map extent control, not a surveyed boundary or a population estimate. Keep an unbounded seed available for every landmass; do not use bounded seeds as the only coverage of an entire map.

A geography's landRoutes is a list of [fromCountyId, toCountyId, travelUnits] entries. The third value defaults to 1 and accepts integers from 1 through 60. Routes are bidirectional, require known distinct seed ids and enter land adjacency without water capacity. The complete list replaces an inherited list. Each bookmark must include the relevant counties. Households use least-time routing with travel units reflected in time and provision charges; courier and scheduled-games clocks use the same edge weights. Army quotes multiply the existing destination-terrain march time. Costs are authoring values; they do not establish a historical itinerary.

Example independent extension: {"geographies":{"small_oases":{"extends":"europe_regional","provinceAdditions":[{"id":"small_oasis","name":"Small oasis","x":9,"y":28,"terrain":"desert","maxRadiusKm":35}],"landRoutes":[["tripoli","small_oasis",4]]}}}. A bookmark using it must separately declare the new county's habitation and politics, or explicitly keep it scenery. The physical seed does not invent a ruler, community or town.

The built-in expanded base is europe_regional_2. Its 476 politics live in wider_v2; using that geography for another date requires that date's own political and settlement declarations. The baseline europe_regional and released medieval bookmarks are not rewritten. These contracts are public JSON mod inputs, not a special loader for the historical bookmark.

The 800 example in data/bookmark_800_expansion.js supplies six inhabited district records and explicitly retains every unused addition as wasteland. Its inhabited_v2 revision replaces complete provinces, realms, geography and settlementLayout fields; it inherits the original opening and stories. data/government_rollout.js retains the old governments_v2 world and composes inhabited_v2_governments_v2 for fresh campaigns. A JSON mod may use the same public whole-field revision contract, but must not treat a new province array as a sparse patch or reuse an old saved revision id for different geography. No date-specific engine hook is required.

The shared expanded catalogue has 29 additions, including kath_district, gurganj_district, kumbi_district and timbuktu_district. Each of those four has a coordinate-only optional settlementSites record named with the _site suffix. Include every physical seed in a complete dated province list; explicitly declare unused additions wasteland:true. The 476 wider_v2 data does this while leaving its existing inhabited declarations intact. Climate defaults, bounded radii and weighted dry routes belong to the base; dated names, communities, ownership and establishment belong to the bookmark. The physical inventory and evidence limits are in docs/research/shared-geography-districts.md.

startLocations is an optional map from registered scenario ids to lists of unique inhabited county ids, for example {"colonus_476":["ravenna","fayyum"]}. An absent entry imposes no additional geographic restriction; an empty list offers that start nowhere. This policy intersects the scenario's fixedProvinceId and required systems in the county's declared faith and government. FB.startProvinceAllowed(scenario, effectiveBookmark, provinceId) is the shared pure gate for codes, map searches and picks, random birthplaces and campaign creation. It restricts new beginnings, not restored households or later travel. JSON mods can use the same contract with their own scenario and county ids.

A scenario may instead declare birthplaces, a typed rule resolved by FB.startBirthplaces against the effective bookmark revision. It is a union of selectors: institutions (local institution kinds, matching each declared institution's provinceId), capitalsOf (government form ids, matching the capital of every realm with that government), realms (realm ids, matching counties those realms hold at the opening), counties (county ids) and storyCounties (true, matching the scenario's own trackLocations counties). Each list is non-empty and unique; storyCounties requires trackLocations. FB.startProvinceAllowed applies the rule together with any startLocations entry, fixed birthplace and required systems, so every revision of a bookmark follows its own declarations with no code. federate_476 uses capitalsOf federate_polity plus storyCounties; curialis_476 and curialis_493 use institutions council; cleric_493 uses institutions see and patriarchate; colonus_476 lists its estate realms and counties. Prefer birthplaces for a role whose places follow from the world; keep startLocations for a bookmark-specific override.

A scenario may declare trackLocations, a map from one of its own tracks to a non-empty list of unique county ids, for example {"federate_track_476":["ravenna"]}. A listed track attaches only to a beginning in one of those counties; an unlisted track attaches everywhere. Validation requires each county to be an available beginning of every listed bookmark under FB.startProvinceAllowed. If startLocations explicitly disables that scenario with an empty list, its track counties must still exist and be inhabited, but need not be playable beginnings. Prefer an open role with startLocations and place-bound tracks over a fixedProvinceId when the role itself makes sense in more than one county. A fixed start attached only to a new revision must be listed in that revision's starts, not in a retained baseline that lacks its birthplace.

FB.bookmarkRevisions(id, optionalRawDefinition) enumerates effective definitions for catalogue validation, including retained revisions. The optional definition lets staged JSON mods validate before installation. Global tenure selectors and title references see the full catalogue; technology seeds and agreement parties are checked inside every relevant revision. Saved-state validation instead uses FB.campaignBookmark(state) and FB.campaignProvince(state, countyId), never the currently displayed map. Loading a saved campaign may validate before activating its geography.
Released catalogue and legacy-profile authoring

World revisions can declare opening as an openingRevisions id string. The resolver replaces it with that declaration and aliases openingRevision to the selected id. Object-valued opening declarations remain valid. Revision fields replace whole values; omitted fields inherit from the retained baseline.

Geography retiredProvinceIds is a list of unique snake_case county ids. Descendants inherit every retirement and may append more. Neither provinceAdditions nor a full geography may reuse a retired id. A saved geography must match its resolved world revision; unknown revisions and mismatches are rejected without adoption.

Religion definitions may declare legacy:true and supersededBy naming a different existing non-legacy religion. These fields do not inherit. A replacement can use parent to inherit the predecessor's rules and override only the intended properties. Retain the old profile and its defaults. Current fresh revisions cannot assign legacy faiths, while retained campaigns can still convert to their existing faiths, resolve offices and relations, and inherit through saved generated faiths. Merely setting legacy does not disable or delete a faith.

Intentional JSON mod overrides remain supported after detached effective-catalogue validation. Standard modded saves bind to an effective-1 SHA-256 fingerprint of installed public definitions, inherited defaults and the active configuration. A missing bundle, invalid stored mod, changed bundle payload or changed effective definition fails closed. The older input-only mod signature cannot prove that catalogue and is not automatically upgraded. Unmodded and edition fingerprints retain their existing meanings. Public government forms retain their strategy assignments and transformation options; fresh constitutional changes use new form ids and dated realm assignments, never load-time replacement of saved forms.

The unmodded released-catalogue fixture protects retained definitions independently of mod overrides. New items join it when first released. Changing an existing hash requires explicit compatibility review and, for semantic changes, a new definition or reviewed migration. Hash regeneration alone does not approve a breaking change.

493 expansion authoring

index.html loads data/bookmark_493_world.js after the existing wider identity declarations and before government_rollout.js. FBDATA.bookmarkExpansion493 is source organization only: literal provinces, realms, settlementLayouts, phases, climates, scenery decisions and positions are composed into the existing bookmark revision schema. It is not a new JSON mod root. The script retains the 493 root baseline and installs world_v2 with complete replacement fields. It reuses the same three eastern see ids, the Ctesiphon physical site and all original campaign ids. Date-scoped Sasanian profiles use the existing aristocratic and public-administration schemas with independent actors.

New historical expansions must provide their own dated evidence and politics, preserve retained world revisions and explicitly keep unsupported physical additions as scenery. A shared physical seed, culture or faith profile is not permission to copy another date's opening. Revision-specific label owners and exact-source aliases retain older labels in static localization extraction.

867 inhabited district authoring

The built-in fresh 867 revision is governments_v2_islamic_v1 on europe_regional, retaining governments_v2 as its predecessor. The opt-in inhabited_v2_governments_v2 world and its Islamic descendant use europe_regional_2, a complete province list including all 29 additions, complete title parents and the independent 867_inhabited_v2 settlement layout. Eight additions are inhabited and all unused additions remain wasteland. A mod or review session may explicitly select the expanded revision; its existence does not authorize changing the bundled fresh geography.

A JSON mod that replaces bookmarks.867 should supply the complete bookmark definition, retain the revisions needed by its campaigns and edit whole-value fields inside the intended revision. For example, change the selected revision's provinces list to alter Kath; a top-level province edit targets inherited baseline content and does not override an explicit expanded province list. Preserve ordered settlement slots for existing saved homes and buildings. Ordinary mod validation and effective-catalogue save fingerprints apply; no special 867 loader is involved. Dated literal catalogues and reconstruction limits are in data/bookmark_867_expansion.js and docs/research/867-districts.md.

Expanded 1066 district composition

1066 retains baseline, governments_v2, inhabited_v2 and inhabited_v2_governments_v2, plus their declared Islamic court and institution descendants. governments_v2_islamic_v1_institutions_v1 is the fresh default on the original geography; inhabited_v2_governments_v2 and its descendants are opt-in geography review worlds. Bookmark replacements retain revisions required by their saves. Complete expanded arrays include all 29 additions and explicitly mark unused districts wasteland:true. Original-geography worlds remain selectable, and 1204 owns its separate declaration and layout.

The 1066 expansion adds no government form or provincial office. Existing Seljuk and Makurian forms remain unchanged. New local courts use existing registered forms with their research limitations documented. Literal culture, faith, realm and district labels keep stable localization owners. bookmarkTerrain1066 is an evidence inventory rather than a runtime or JSON-mod registry. Mods use the canonical bookmark, geography, governmentForms, culture, religion and settlement contracts.

Independently dated inhabited districts

data/bookmark_1204_terrain.js authors complete inhabited_v2 replacements for provinces, realms, settlementLayout and localInstitutions from its own baseline. Neither revision captures a load-time starts whitelist. The ordinary birthplace and ruler-reference gates keep expanded-only fixed beginnings out of the baseline and allow eligible starts registered later by mods. An author may still declare an explicit starts list when a deliberately closed catalogue is intended. A promoted or synthetic regional site occurs only in its intended county layout; retained slot identities remain unchanged.

Existing delegate beginnings use the rulerRealmId starting-position contract. The referenced government must supply delegatedLeadership, an explicit constituency and an opening representative. Identity comes from that representative and the capital community; an unnamed representative keeps its generated campaign name. Named rulers still require matching characterName, sex, culture, faith and form. The start tier must equal the government's rank-to-tier projection. FB.startRulerProfile is a pure declaration resolver and creates no character or mandate. A delegated start retains the public constituency, holder, treasury and protocol ids, while the protagonist starts a separate private household. Historical start-reference resolution keeps that public realm id. Named dynastic rulers continue to adopt and remap their ordinary player realm.

The example's regnum superior court uses nonTerritorial and an on-map diplomatic anchor while subordinate settled courts keep county holders. A separate mobile_confederation declares its own conserved following and ordinary host without exclusive county possession. No script should infer resident religion from ruler religion, historical possession from a superior claim, or settlement from a physical seed. Historical scope, approximations and unresolved districts are recorded in docs/research/1204-terrain.md.

Religious affiliations and profile institutions

religiousAffiliations is an object keyed by id. Each entry contains name, faithIds (one to 32 registered faith ids), period:{yearMin,yearMax}, and exclusiveWith (up to eight other affiliation ids). yearMin is an integer; yearMax is null or an integer at least yearMin. Names are nonempty and at most 160 characters. Conflicting affiliations block only acquisition in the scoped institution and do not change doctrinal relations or primary religion.

religiousInstitutionProfiles is an object keyed by id. Its required fields are name, faithIds, period, system (null or a registered system id), roles, selection, recognition, actions, fees and affiliationIds; ai is optional. IDs use lowercase letters, digits and underscores, start with a letter and have at most 80 characters. roles contains one to 16 role entries with required fields name (up to 80 characters), minAge (integer 0 to 80), sexes (unique m/f list, empty means either), unmarried (boolean), professions (up to 16 career ids, empty means no restriction), skills (registered skill ids with nonnegative finite floors) and affiliationId (null or a profile affiliation id). Optional careerIds lists up to 16 existing careers this qualified member may choose; optional pathId references an existing religiousPaths route. All profile faithIds must pass the route's faith filter, and its profession filter must intersect careerIds or prerequisite professions. professions never grants new work. affiliationIds lists at most eight declared affiliations. Qualification never grants an office or changes a career.

Optional ai has exact fields roles (declared role ids), affiliations (profile affiliation ids), reserve (nonnegative finite amount), maxActions (integer one to eight) and recognize (boolean). Omit ai to disable automated membership and selection. The bounded quarterly scheduler uses the same quote/apply rights and canonical office as player decisions, debits only a real authorized NPC counterparty and preserves reserve. It skips player-funded decisions and household candidates. Optional saved aiPeriod is a nonnegative integer no greater than floor(state.turn / 90); it does not enable AI itself.

For an explicit temporal binding to a profile-selected office, ecclesiasticalProfiles supports source:institution_profile. Set chapter:false and appointmentCost:0, since selection consent and its fee belong to the institution profile. Binding officeId must match the profile institution's canonical character-held office. Other temporal scope, control, reserve, recognition, conversion and duplicate-office checks remain required. Spiritual membership or a judicial/public commission never grants the other form of authority.

selection is null for a leaderless community, or {strategy,policy,roleId,consentRoles,quorum}. strategy currently accepts the existing appointment strategy only. policy is patron or members. roleId names the prospective leader's role. consentRoles lists up to 16 declared roles. quorum is an integer 0 to 64; a members policy requires at least one consent role and a positive quorum. Each constituent records their own reviewed assent. A patron may have an additional declared member quorum. No default hereditary, universal sex or celibacy rule is inferred.

recognition contains sources (up to eight legitimacy source ids with institutional:true and succession:reaffirm), roles (up to 16 declared roles), quorum (integer 1 to 64), requiresLeader (boolean) and protectedWorship (boolean). A leader requirement needs a selection profile. Recognition or mediation actions require nonempty sources and roles. The built-in institution_support source records local support without granting public powers. actions is a unique subset of admit, affiliate, appoint, recognize, dispute, withdraw, mediate, vacate and assent. A leaderless profile cannot declare appoint or vacate. fees maps permitted action ids to nonnegative finite costs. No institution treasury is declared here.

A bookmark localInstitutions profile entry retains city, kind, provinceId, site, religion and culture and adds profileId, jurisdictionIds and optional officeId, patronRealmId and abbeyId. Supported profile kinds include school, temple, monastery, ritual_community and congregation. The same validation permits an explicitly profiled see or patriarchate. An on-map site must resolve in the bookmark's inhabited settlement layout and its seat county must be in jurisdictionIds (up to 16 county ids). An off-map record has provinceId:null, site:null and offMap:true. A patron-selected off-map office also declares patronRealmId from that bookmark. officeId is present exactly when selection is present, is unique among local offices and cannot collide with a central head. An opening profile record must declare vacant:true. HistoricalName, implicit representatives, officeProfile, chapterId and unrecognized fields are rejected. Optional freshOnly preserves the existing fresh-campaign gate. abbeyId references existing abbeys.houses property at action time; it creates no house, land, capital or purse.

Legacy church declarations may optionally supply jurisdictionIds with one to sixteen unique bookmark county ids, including the on-map seat. Their mediation quote rejects counties outside that list. Omitting the list retains existing legacy scope. A freshOnly office is included in canonical office definitions only when its institution has been explicitly seeded; retained saves lacking the institution do not acquire that office or a vacancy through repair.

FB.religiousInstitutionQuote(state, institutionId, actor, action, terms) accepts a typed character or realm actor. admit terms are {roleId}, affiliate terms are {affiliationId}, appoint terms are {candidateId}, and vacate terms are empty. withdraw accepts empty terms for membership withdrawal or {affiliationId} for one bound affiliation. assent terms are {decision,subject}; decision is appoint, recognize or dispute and subject is a typed character or realm reference. recognize and mediate terms are {subject,provinceId,source}; dispute also requires recognitionId. Terms confer no third-party consent. The returned proposal contains allowed, reason, cost, payer, consent, vacancy, concrete consequences and reviewed facts. Apply the exact unchanged proposal with FB.religiousInstitutionApply; every dependency is checked again before cost or canonical state is committed. Stale, modified or unsupported proposals return false. FB.religiousInstitutionSnapshot and FB.religiousInstitutionRoleEligibility are pure read APIs. Runtime consumers must use this contract for profile institutions, including institutions whose faith has no head.

Local-practice faith authoring

ghana_local_practice_1066 is a standalone religion declared by data/bookmark_1066_inhabited.js, available only for bookmark 1066. Its soundtrack lineage is not a religious parent. Expanded 1066 world arrays use this id for the Wagadu court, authored generated kin and Kumbi's local component. wagadu_traditional_1066 was an unreleased placeholder and is removed; it is not a legacy alias. Keep the Sunni component and existing population totals when overriding that district. Retained baseline worlds contain neither of these provisional Ghana identities.

berber_traditional retains its pagan parent with explicit local overrides. Authors can override raidingTradition:false, holyWarTradition:null and religiousPaths:null without changing the shared parent or faithDefaults. Explicit spouse capacities, clergyMarriage and neutral role names are simulation choices where local discipline is unknown, not permission to infer an institution or historical legal code. Null religiousPaths blocks fresh generic clergy or cloister work unless a qualified local role grants it. Existing saved careers remain usable. Institution admission and specialist eligibility need their own supported adapter. See docs/designs/religions.md for the dated scope and remaining evidence limits.

Islamic community authoring scopes

ibadi, zaydi, imami_pre_occultation, imami_twelver, ismaili_fatimid, ismaili_nizari_1204 and ismaili_tayyibi_1204 are dated community profiles with restricted availability.consumers. They permit only their declared character, institution and, where accepted, ruler uses. Do not use them for ordinary starts, county communities, conversion or population projects. Their explicit Muslim household/career properties are compatibility simulation choices; head:null and holyWarTradition:null confer no caliphal or imam office. Legal schools and political allegiance must not be encoded as new primary faiths. See docs/designs/religions.md for windows, retained released profiles and legal/recognition holds.

The court revisions in data/islamic_profiles.js append _islamic_v1 to each composed government revision for 800, 867 and 1066. They change realm religion only, using the ordinary whole-field realms replacement. data/islamic_rollout.js later selects the accepted fresh descendants without rewriting any retained revision. A mod that replaces a bookmark remains responsible for its complete world and dated identities; the composers are shipped declaration authoring, not runtime patch APIs.


Religious activity and patronage declarations

religiousActivities and religiousPatronage are optional mergeable tables. Their declaration schemas, state owners and review/apply entry points are documented in docs/designs/religious-activities.md. Adding a profile never seeds a house, person or journey. religiousActivityCatalogFaults validates both catalogues during detached mod validation. Every activity must declare its date/opening and eligibility lists, explicit payer/reserve, cost/time/interruption, service recipient and bounded milestone reward. Journey adapters reference an existing travel site and use its existing cost and reward; they do not certify a rite. Only calendar any_day is currently accepted. Held historical placements and calendar-dependent rites must remain undeclared.

Local activities optionally declare provinceIds (one to 32 distinct county ids) and protectedWorship (boolean). Actual location must match the scope, and protectedWorship:true requires the existing local worship protection. These fields are rejected for journeys and patronage, impose no office/estate requirement and are preserved in frozen saved commitments. Omitted fields preserve existing profiles. Multiple activity options can share a milestone to prevent equivalent paid and free participation from awarding it twice. The early Uppakra and Samogitian profiles demonstrate district scope without placing a temple or changing a released faith.

A nonempty openings list matches exact revision ids. A script that composes a descendant revision must add that revision to every activity and patronage declaration it should keep. data/islamic_profiles.js, data/islamic_institutions.js and data/islamic_rollout.js do this for every declaration that names their source revision. Mods that compose further descendants follow the same rule.

Dated Arabian review worlds

data/arabian_openings.js loads after data/government_rollout.js and data/islamic_profiles.js. For 800, 867 and 1066 it composes inhabited_v2_governments_v2_arabian_v1 and inhabited_v2_governments_v2_islamic_v1_arabian_v1; 1204 receives inhabited_v2_arabian_v1. No fresh default is selected. The complete source world remains intact except for its institution table and the 800 review's independent city presentations. The 800 layout adds Mecca and Medina at existing anchors without changing the retained generated slots or importing later fill entries.

Each dated congregation id is <county>_congregation_<year>, with profile arabian_local_congregation_<year>. Mecca and Medina are declared in 800/867; Mecca alone is declared in 1066/1204. Entries have freshOnly:true, vacant:true, a single-county jurisdiction and no office, representative or abbey property. Activities <county>_local_worship_<year> declare one-day free local participation and one piety once per actor, gated to the exact year and review revisions. Their openings arrays are populated by the composer. The Muslim eligibility list is a simulation compatibility choice for ordinary worship, not a local census or sanctuary access law. No legal-school affiliation or Hajj/Umra performance is granted. Historical rites, later Medina access, Gulf houses, Omani offices and Aden placement remain independently undeclared. See docs/designs/religions.md for evidence and rights holds.

711 local Arabian worship

arabian_local_congregation_711 has only a lay participant role for sunni, bounded to the year 711. The terrain_v2 revision adds medina_congregation_711 and sanaa_congregation_711 at the existing town sites, preserving every prior local institution. Government composition retains those declarations; baseline and governments_v2 do not receive them. Both declare freshOnly:true, vacant:true and a single-county jurisdiction, with no officeId, representative or abbeyId. The sunni reference reuses the compatibility identity and declares no school or compulsory caliphal allegiance. No resident or court changes religion through this placement.

medina_local_worship_711 and sanaa_local_worship_711 target these congregations only in 711 terrain_v2_governments_v2. Household participants may have sunni or umayyad_sunni_711 as their primary faith; roleIds and affiliationIds are empty, so worship never requires acquisition of either allegiance or membership. Each one-day local commitment costs zero and grants one piety once for its participant milestone. Later years and other opening revisions receive no newly accepted activity. No journey, Hajj receipt, career rank, office, property, recurring service or conversion project is created. Existing saved rosters do not gain the fresh-only congregations during restore. Refer to docs/designs/religions.md for dated evidence and unresolved places and roles.

Local profiles require purpose:null and siteId:null. Journey profiles require zero cost/duration/reward and institutionId:null. reward contains piety, prestige and skills; service is null or a fund and cost pair. legacy is null or contains trait, pathId, rank and purpose, with null unused references. Patronage foundation requires startup, capital, treasury and landRequired:true; funds maps ids to capacity and unitCost, and outreach lists allowed existing community policy ids. Foundation requires actual local freehold property; gift recipients must be the same explicitly founded institution. No shared catalogue name grants rights, unlocks medieval systems or bypasses a faith-family research hold.

Dated local offices and opening communion

A legacy local see or patriarchate may declare officeSystem as a registered system id or null. Omitting it retains episcopal_sees. Null enables only that explicit institution; it does not enable the era system or a central faith head. The canonical office registry, institution list and reviewed appointments resolve the same declaration. A legacy off-map office may declare jurisdictionIds:[] to deny all county mediation. On-map declarations must include their seat.

An optional communionWith array names up to eight unique other legacy office institutions in the same complete bookmark table. Explicit fresh initialization records church_support from each living issuer office to the other incumbent character, without territorial scope. These directional personal records use ordinary authority generations and lapse on issuer replacement. Restore never recreates letters or transfers recognition to a new person. Profile institutions continue to use their declared selection and recognition contracts.

Jewish and Samaritan communal consumers

jewish_study_circle_early, jewish_sardis_congregation, jewish_study_group_1204 and samaritan_lay_congregation are independently declared leaderless profiles. The study contracts use primary jewish identity and optional local rabbinic learning affiliations. Membership in a study group does not change primary identity to the institution-only rabbanite catalogue profile. A study_helper needs the local affiliation and int:4; learner and worshipper require neither a profession nor wealth. All roles have minAge:16, either sex and no unmarried promise. These thresholds and the two-member scoped support quorum are simulation settings. None authorizes rabbinic judgment, hereditary priestly admission or a political exilarch.

jewish_meso_study_circle_476_lesson, jewish_meso_study_circle_493_lesson and alexandria_communal_school_1204_lesson require their separately declared institution ids and qualified local membership. They share jewish_household_study_done with free household study, so changing venue cannot buy another reward. jewish_sardis_congregation_476_care and jewish_sardis_congregation_493_care consume one prepaid building_care unit from the canonical house. The corresponding jewish_sardis_giving and jewish_sardis_public_giving profiles name the same local recipient independently for each opening. Donations do not require membership or land after a valid recipient has been founded. Foundation transfers the donor's exact plot group once, with zero startup, capital and treasury as conservative simulation amounts. Public gifts use the actual ruler account and the household cannot use that public profile. All gifts remain property of that institution; outreach is empty.

Declare each placement in the accepted bookmark revision and align activity openings with that exact revision. Profiles alone create no site, population, property or member. Legacy Jewish households keep their faith and household law. Samaritan household worship excludes the held 867 and 1066 openings; Karaite household worship is restricted to 1066 and 1204. These activities create no Gerizim or Jerusalem route, holiday rite or legal transaction. The shared mediate action records county recognition and cannot be used as a court verdict, a divorce, a property settlement or proof of both disputants' consent.

Dated Jewish and Samaritan review worlds

Select jewish_samaritan_v3 in 476, 493 or 1204, and jewish_samaritan_v3_governments_v2 in 711, 800, 867 or 1066 to use the new dated communal activity scope. Earlier revisions and current fresh defaults remain available with their existing meanings. These ids use the ordinary complete-world bookmark revision schema, not a new mod root or runtime strategy.

The two early dates independently declare jewish_meso_study_circle_<year>, jewish_sardis_congregation_<year> and nablus_samaritan_congregation_<year>. The 711 review declares only its Nablus congregation; 800 additionally declares jerusalem_jewish_congregation_800. 867 adds no institution or community. 1066 declares fustat_karaite_congregation_1066 and jerusalem_karaite_congregation_1066. 1204 declares cairo_karaite_congregation_1204, alexandria_communal_school_1204 and nablus_samaritan_congregation_1204. All are leaderless, vacant and freshOnly; no office or incumbent is implicit.

jewish_local_congregation_later and karaite_lay_congregation are ordinary lay profiles with admission/withdrawal only. The dated Nablus town is samaria_neapolis_w15 in the jerusalem county and must not be confused with the Italian neapolis_476. Cairo's 1204 group uses cairo, not fustat. Sardis declarations reference distinct optional jewish_sardis_property_476 and jewish_sardis_property_493 recipients. An abbeyId does not prove historical ownership or seed property; only an authorized foundation can transfer actual freehold plots and create a service recipient. The numerical minority weights, adult admission and time/reward limits are simulation choices, not historical percentages or clerical qualifications.

African communal authoring

garama_offering_community and ghana_muslim_learning_1066 are lay institution profiles with admit and withdraw only. Their participant and learner roles grant no career, path, office, mediation or political recognition. Garama accepts berber_traditional in the 476-493 interval; Ghana accepts the existing sunni identity in 1066. Adult eligibility for either sex is a participation simulation rule, not specialist admission evidence. Both require an explicit on-map seat before their activity declarations can be used.

garama_funeral_offerings_476 requires garama_offering_community_476 in 476 wider_v2; garama_funeral_offerings_493 independently requires garama_offering_community_493 in 493 world_v2. Each activity is confined to its opening year, costs one household gold and one day, and records the same single funerary-offering milestone. It is a local expenditure, not an institution donation or a pilgrimage to a located cemetery. Exact monument access and historical seats remain held. Their _african_v1 review revisions use ordinary existing settlement anchors for leaderless participation simulations.

ghana_muslim_household_learning_1066 and ghana_mosque_learning_service_1066 require ghana_muslim_congregation_1066 in 1066 inhabited_v2 or inhabited_v2_governments_v2. The first permits ordinary landless participation at no fee without membership. The second requires an active qualified learner and consumes one learning service costing three gold from the seat's explicitly established property. Neither grants mosque office or a religious rank. Period bounds limit these declarations to 1066; this is conservative authoring scope, not a historical closure date.

ghana_muslim_learning_support_1066 permits household giving from any primary faith. ghana_public_learning_support_1066 permits giving from a real NPC ruler's public account with a ten-gold reserve and bounded quarterly AI. Both reference the same institution and eight-unit learning fund at three gold per unit. The optional foundation consumes two gold, retains six capital and two treasury, and requires actual donated freehold plots. These are simulation amounts, not an attested mosque fee, historical land title or automatic salary. Only an already existing voluntary project sponsored by the payer and targeting the actor's primary faith can receive outreach support; giving to a different faith does not authorize a new project. No historical seat, specialist payroll, sacred grove, route or population assignment is seeded.

data/african_religious_rollout.js composes _african_v1 descendants of accepted geographic review sources after the Islamic court composer. Its complete localInstitutions table adds one vacant freshOnly group at an existing on-map settlement slot, preserving every other declaration. It extends the precise activity and patronage openings lists for each descendant; no empty wildcard list or current fresh-selector change supplies eligibility. Retained source revisions remain usable. Do not turn a meeting scope into a sacred travel destination or claim its settlement anchor proves a mosque or shrine location.

kairouan_lay_711, kairouan_lay_800, kairouan_lay_867 and gao_lay_1204 are independent year-bounded lay profiles. Their institution ids are kairouan_muslim_congregation_711, kairouan_muslim_congregation_800, kairouan_muslim_congregation_867 and gao_muslim_congregation_1204. Corresponding kairouan_household_worship_711, kairouan_household_worship_800, kairouan_household_worship_867 and gao_household_worship_1204 use local mode, no required membership, zero fee, one day, one piety and the same african_muslim_household_worship receipt. The 711 declarations retain umayyad_sunni_711; later ones use sunni. None grants work, office, legal school or political allegiance.

The Ghana review declaration optionally names ghana_muslim_learning_property_1066 through abbeyId. An absent house permits ordinary admission, withdrawal and free learning; it supplies neither a donor recipient nor prepaid service capacity. Foundation, donation and learning service use the actual shared property contracts. All seven opening bindings and numerical/eligibility choices are simulations pending owner acceptance. Exact religious buildings, sacred-site access and specialist roles remain separate research holds; see docs/research/african-religious-rollout.md.

Islamic study-circle consumers

data/islamic_institutions.js appends _institutions_v1 revisions to the two 1066 _islamic_v1 court revisions. It adds only localInstitutions. baghdad_shafii_circle_1066 and nishapur_shafii_ashari_circle_1066 use the existing city sites as broad learning contexts, without identifying a mosque/madrasa building, incumbent or historical endowment. Their profiles declare a lay learner, no career grant, no office/selection/recognition, and explicit optional school affiliations. shafii_learning_1066 and ashari_learning_1066 coexist without altering a sunni primary identity. Bound local lessons require membership, the corresponding affiliations and actual presence; their 1066-only window, seven days and once-only intelligence point are simulation terms. Named teachers, specialist admission, later continuity and historical waqf terms need separate evidence. See docs/designs/religions.md for the sources and the continuing 711 claim-policy hold.

data/islamic_rollout.js follows the institution composer. It adds _learning_v1 descendants of the 800 _islamic_v1 revisions, declaring kufa_hanafi_circle_800 and replacing only the Kufa province's settlement presentation with the physical Kufa town marker. It preserves every county identity and community allocation. The learner explicitly acquires hanafi_learning_800 and may perform kufa_hanafi_learning_800, with the same simulation eligibility and reward as the 1066 circles but an 800-only window. It does not acquire theology or public jurisdiction. The composer selects inhabited_v2_governments_v2_islamic_v1_learning_v1 for 800, governments_v2_islamic_v1 for 867 and governments_v2_islamic_v1_institutions_v1 for 1066. 476, 493, 711 and 1204 selectors retain their separately authored worlds. Saved start.revision always resolves its retained declaration; no restore migration follows the fresh selector.

Buddhist lay support declarations

tapa_sardar_lay_support and tepe_narenj_lay_support use explicit lay roles and selection:null. Neither creates novice/full ordination, vows, an abbacy, a lineage or institutional property. A profile declaration alone places no historical house. Future accepted placements need distinct inhabited site bindings, vacant:true, local jurisdictionIds and distinct abbeyId values. City-level fixture bindings in the spec demonstrate the contract only. Ordinary admission and withdrawal do not require an optional abbey property to have been founded.

The buddhist_household_practice_early and buddhist_household_study_early declarations name the two early expanded revisions and buddhist_476 only. Separate _711 declarations name 711 terrain_v2_governments_v2 and buddhist_711 only. The proposed tapa_sardar_house_711 and tepe_narenj_house_711 consumers require their own accepted placements before their lessons or patronage can be used. The lessons share buddhist_household_study_done with household study, preventing venue stacking. Gifts are not role qualification, and a donor's primary faith can differ from the recipient's faith. Dates, admission ages, competence floors, capacities, startup costs and bounded rewards are simulation settings; do not infer a historical ordination constitution or estate charter.

tapa_sardar_giving_711 has six one-unit learning services, while tepe_narenj_giving_711 has four two-unit services and consumes one startup unit on foundation. Capital and treasury begin at zero. Each foundation transfers the exact local unpledged plot group once. tapa_sardar_public_giving_711 matches the first house's service terms, uses the canonical ruler account with reserve:1 and may participate in bounded public patronage AI. Only Tapa Sardar declares voluntary outreach; it funds the existing matching sponsor-owned project and preserves the population owner's single support record. Neither admission nor restoration initializes a receiving house, advances a project, certifies a rite or changes household identity.

Later Iranian household activities

zoroastrian_household_learning_800 and zoroastrian_household_learning_867 demonstrate independent local declarations with provinceIds and exact opening revision gates. The 800 declaration accepts istakhr only on inhabited_v2_governments_v2_islamic_v1_learning_v1; the 867 declaration accepts istakhr or kerman only on governments_v2_islamic_v1. Each accepts the retained zoroastrian faith during its opening year. These are regional household-study simulations, not institutional placements or community replacements. A participant who moves even between two allowed counties must start a new local commitment.

Both share zoroastrian_learning_done with early household and funded study. They require no institution or specialist role and transfer no property. Preserve saved activity definitions and milestones through the existing save contract; do not synthesize roles from culture or extend the periods to later openings without separate evidence. zoroastrian_later_household_learning records technology impact none.

Iranian lay service declarations

sasanian_lay_service permits learner and supporter membership for zoroastrian_sasanian_476 within years 476-493. It has no selection, priestly role, career grant, recognition power or obligatory celibacy. No production bookmark places the proposed sasanian_service_476 or sasanian_service_493 receiving institutions. Each needs a separately accepted local site, vacant:true, a local jurisdiction and its own abbeyId before service or patronage can be used. Do not attach the template to an existing court congregation or temple by inference.

zoroastrian_household_fire_observance and zoroastrian_religious_learning accept only the expanded early revisions and the fresh Sasanian identity. The local learning and fire_care declarations share their household milestones. Relief has its own one-time milestone. A learner or supporter can use only the service matching their active role; no donation or activity grants specialist status. All local services consume one prepaid unit at successful completion. Household activities require neither land nor an institution.

Each dated household-support foundation consumes one startup unit, retains two capital and one treasury, and transfers an exact freehold group once. Three restricted funds accept at most six one-unit services each. The matching public-support declaration has identical service terms, ai:true and reserve:2. Giving accepts other donor faiths but never changes the recipient identity. These profiles declare outreach:[] and cannot fund a conversion project. Their existing property/save contracts preserve unused gifts and separate institutional assets from donor households. Date bounds are eligibility limits, not disappearance claims; later openings and retained revisions require explicit independent decisions.

Hindu lay service declarations

hindu_service_v2 and hindu_service_v2_governments_v2 are opt-in 711 worlds. debal_temple_service_711 and brahmanabad_ritual_support_711 bind existing settlement anchors as ritual_community records with vacant:true, freshOnly:true and single-county jurisdictions. Their abbeyId fields reserve distinct property ids for explicit future foundations; no opening assets exist. The profiles declare only voluntary lay membership. They cannot appoint a priest, impose an ascetic vow or certify an officiant.

The four local observance declarations share hindu_local_observance_711 as a participant milestone. Free variants need no membership or property. Supported variants require the declared lay role and a matching prepaid ritual_supplies fund. Each household/public patronage pair declares identical fund capacity and unit cost, allowing the public transaction to fund the same canonical property while retaining its own payer and reserve. No automatic income, outreach policy or journey is declared. Changes to these terms require the usual atomic reviews and frozen-commitment save contract. Dates, costs, evidence limits and technology decisions are documented in docs/designs/religions.md.

Hindu and Jain revision boundaries

Do not use the selected fresh bookmark to add Hindu service records while restoring a campaign. Resolve its recorded revision through FB.campaignBookmark. Only the two explicit 711 service revisions declare these ritual communities; selecting either revision does not upgrade a retained save. The 711 activity cutoff rejects new or unfinished observance while preserving unused restricted funds, dedicated land, existing membership and resident identities.

The early brahmanical_476 identity remains scoped to 476/493, hindu_711 to 711, and jain to institutional authoring in 1204. Later Hindu placements and live Jain delivery require separate accepted declarations. An institution-only identity does not grant a playable community, character, conversion target, route or service. Saved generated ancestry and a previously created community project remain campaign records and must not be replaced by fresh opening data.


Runtime story instance lifecycle

Household tracks

The calendar_window predicate accepts kind, firstDay and lastDay only. Each endpoint is [year, season, day], with year 0-10000, season 0-3 and day 1-90. Endpoints are inclusive and ordered on the ordinary 360-day calendar. The predicate reads the actual campaign date and never marks an incident, battle or outcome. Use a later window for expiry; a stage entered late must not replay an obsolete opportunity. No saved fields are added.

Finite work extension

An optional jobs map on household_track declares at most eight semantic job ids. Each complete record accepts payerRealmId, provinceId, days (1-30), fee (1-1000 integer gold), completionGold (0-fee), settlementGold (0 through fee minus completionGold), expiresDays (days through 360), yearMin and yearMax (0-10000, inclusive and ordered). Declare the payer realm and county in requirements.realms and requirements.provinces. All references are checked for each offered world revision. Unknown keys and unsupported operations fail detached compilation. The payer must be an AI court with an active spendable treasury, the original living opening ruler and actual local sovereignty. A player-controlled court cannot grant itself this offer. The accepting worker must be a free adult at home, outside personal war, travel and captivity, with no other unfinished work contract. Numbers and exact work disputes are simulation terms supplied by content.

start_job with jobId reserves the full fee and works the first action day together. work_job with jobId works one more reviewed day. Both replace Daily Focus through the normal day loop. Failed, unfunded or blocked-day confirmation changes no contract or purse. Completion pays completionGold once and holds the remaining fee in escrow. settle_job with jobId and resolution: settlement pays settlementGold without another day; hearing spends one action day and pays the entire remaining escrow; waive pays nothing further. Unclaimed funds return to the payer. spend_day accepts no terms and fills one free action day without a narrative reward. A graph may use cyclic work choices but cannot restart a job id that already has a ledger record. No executable effect or arbitrary state write is accepted.

Predicates job_state with jobId and a states list observe missing, working, disputed, settled, cancelled or expired. job_available with jobId previews the fully funded eligible opening offer. job_patron with jobId checks the original living opening ruler and actual local sovereignty without requiring funds or worker availability. Every predicate uses this track's declared job id. Conditions and automatic expiry routes remain data-owned; the ledger independently reconciles interruptions even after a graph has finished.

Fresh tracks with jobs additionally initialize jobPatrons and an empty jobs ledger. These optional fields must occur together in a save; absent fields stay absent on restore. Each contract stores payerId, workerId, openedTurn, expiresTurn, daysWorked, paid, refunded, escrow, status, resolution and nullable closedTurn. The sum of paid, refunded and escrow always equals the original fee. Interruption before completion pays floor(completionGold times daysWorked divided by days), refunds the remainder and closes the job. Interruption after completion pays the entire reserved entitlement still due. Completed wages enter the continuing household's private purse, with no inherited work obligation. Refunds follow canonical treasury retirement recipients; an unavailable destination leaves refundable money in the saved escrow for later reconciliation. Restore validates records and never executes work or payment. The household-jobs.json authoring fixture supplies independently authored three-day disputed and one-day fully paid jobs through the ordinary Mods file picker.

Household work and personal continuity extension

continuity may also be protagonist, with interruptedStage naming a terminal stage. An unfinished personal graph interrupts on death or a changed player character instead of assigning its biography to an heir. Completed terminal stages retain their outcome. This policy uses the existing actorId and phase fields; no new record fields or restore initialization are introduced.

A stage may declare afterWork:{focusId,provinceId,next}. The focus must be a declared vocational focus. This is an additional graph edge, followed only by the canonical daily focus owner after it actually deposits positive gold. Choosing a focus, holding savings, receiving a gift or merely dispatching a story boundary cannot satisfy it. The worker must be alive, at that permanent home, outside a journey, and eligible for the current stage without any pending automatic transition. The edge records completion through the existing phase, stageTurn and revision; it adds no wages and retains no unbounded income history.

The set_focus operation accepts focusId naming a vocational focus and uses the ordinary focus status and selection transaction. It selects work without advancing time or granting payment. household_expense accepts amount (finite, greater than zero, at most 100) and charges that amount from the private purse once per declared stage after a matching review. Any saved decision at that stage prevents a later expense there, including a return after choosing a free alternative; author a separate stage for a later purchase opportunity. It grants only the supplies described by that stage, never land, an enterprise or an income modifier. Both operations use the shared review and reject changed funds, eligibility, actor or terms.

The civic_right predicate accepts realmId, provinceId and evidenceId. It checks an existing civic ledger and the canonical rightEffective projection, including current grantor possession, expiry and war. Absent or suspended rights are false and are never created by a query. This predicate adds no citizenship or public authority. Optional institutions can remain informational choices; their absence never permits automatic membership or conversion.

Additional predicates are elapsed with integer minDays (0-1440) since the current stage was entered, or since campaign turn zero when sinceCampaign:true is present; travelling with no additional fields, testing an active personal journey; and mobile_state with realmId and condition. Its conditions are active, present (actual protagonist location equals civilian camp), moving (a field host carries the court on an active route), scarce (camp food below the mobile owner's thirty-day threshold), or camp, which also requires provinceId. The other mobile conditions forbid provinceId. Missing or terminal followings make all these mobile conditions false. Realm references resolve through the ordinary start-realm mapping; a missing live subject leaves the exit route available.

Additional operations are mobile_work with realmId, travel_mobile with realmId and purposeId, and return_home with no extra fields. Work delegates the current character's ordinary work review/commit, including age sixteen, actual presence, finite food, treasury funds and the once-per-day marker. It never grants political powers or membership. travel_mobile requires an existing non-targeted capitals-mode purpose, a stationary active following and an ordinary destination matching its civilian camp. The standard personal travel transaction owns costs, timing, interruptions and arrival. return_home uses the current journey's ordinary return or outbound turn-back, including minimum-stay gates. Quotes and live camp facts are pure, detached and freshly revalidated. No saved fields, party travel or wage contract are added. tests/e2e/fixtures/authoring/camp-work-example.json is an ordinary independent import.

Every mobile_state, mobile_work and travel_mobile realmId must also appear in the declaration's requirements.realms. The ordinary detached bookmark gate then checks that structural reference in every offered revision. Later loss or settlement of that live following keeps the declared narrative exit available.

household_track is a registered storyInstances type. A declaration accepts id, type, title (1-240 characters), intro (0-4000), homeProvinceId, continuity (household or protagonist), optional interruptedStage, initialStage, stages and the ordinary requires, requirements and registration anchor fields. Unknown fields are rejected. Stages contains 1-64 semantic ids. Every stage has name, text, choices (0-12) and transitions (0-16), with optional afterWork as documented above. A terminal:true stage has no outgoing edges. Every stage must be reachable from initialStage and have a route to a terminal. A lifecycle boundary follows at most one automatic transition; choices and automatic transitions use next to name their destination. Terminal records remain readable.

Each choice accepts id, label, detail, optional when, operation and next. A transition accepts when and next. Predicates are bounded all/any lists (1-16), not, or a typed kind. home, present, arrived, journey and at_war accept provinceId; home means permanent residence, while present reads the real journey location. journey tests an active ordinary journey to that county, including its outbound, arrived and returning phases. sovereign accepts provinceId and realmId. identity accepts cultureId and/or faithId. year accepts inclusive min/max (0-10000). story_state accepts storyId, stateField:phase or result, and values (1-16 semantic values or null); that source must appear in requires. Graphs are limited to 2048 predicate nodes with nesting depth five. Content cannot execute expressions, write arbitrary state or supply callbacks.

Operations are record_decision with no additional terms; convert_faith with faithId and scope:self or household; travel_site with travelSiteId naming an existing non-targeted sites-mode travel destination; and settle_household with no additional terms. All use the canonical owner, including target encounter, resources and current household scope for conversion. A travel_site choice reviews the actual price and route for the protagonist only. It grants no family movement or destination protection. Settlement remains the ordinary later transaction. A one-time wage contract, immediate evacuation, cultural adoption and ruler agenda are not supported operations.

An optional stage incident accepts source:control, provinceId and milestone:rule_changed, or source:story, provinceId, storyId and milestone:started, won, failed, diverted or interrupted. Its afterIncident names a different stage reached when another owner already closed that occurrence. An incident stage cannot lie on a cycle. Control baselines are seeded at attachment and subsequent observed sovereign changes supply the occurrence turn, before and after. A story occurrence reads its canonical startedTurn or outcomeTurn. Incidents are semantic references and do not prove that an army passed, a levy occurred or supplies were taken.

FB.householdStories.householdId(state) resolves the continuing opening household. receiptKey(householdId, event) encodes source, milestone, provinceId, turn, before and after. For a control alias use source:control and milestone:rule_changed with the actual old/new sovereigns and occurrence turn. receipt(state, key) returns a resolved/expired closure. owner(state, key) prefers an attached, unfinished local personal track. A world observer must consult both before delivery and use its actual occurrence context, not an initial historical seed. Store closed keys as householdReceipts[key] with owner (the owning story id), status:resolved or expired and turn. Merely showing or quoting an incident never claims it. The household graph exposes this protocol; it does not implement a world observer or a generic tax, work or party ledger.

Household track saves use version:1 and preserve phase, actorId, householdId, revision, stageTurn, decisions keyed by stage (choiceId, actorId and turn), controls keyed by observed county (before, after and nullable turn), and householdReceipts. There are at most 64 decisions and closures. Completed records do not replay and a save missing this type's record stays missing. Declarations and exact mod fingerprints remain required on restore. The household-graphs.json authoring fixture demonstrates two different graphs through the ordinary Mods file picker.

Local household observers

Settlement-local occurrences

A household_track stage may declare localEvent with exactly milestone, provinceId and siteId. milestone is a lowercase semantic slug; provinceId and siteId name one unique inhabited physical settlement in the effective bookmark revision, including its resolved settlement layout. Declare the province in requirements.provinces. Generated slot ids, numeric slots, display names, travel-site ids, ambiguous sites and unestablished fill entries are rejected. No physical aliases are currently accepted. Local event stages are nonterminal, acyclic, have at least one choice, and allow only record_decision operations. They cannot also declare incident or afterWork. A source can use the same milestone at different sites, but cannot declare the same milestone/site pair twice. Automatic transitions produce no occurrence; only a successful canonical choice at that exact residence records one.

An optional attachment:world makes a household_track a world-attached local records source. This is permitted only for a graph of localEvent stages and terminal stages without jobs. The normal personal-track attachment remains the default. Attachment still requires the protagonist's home province; the source supplies no separate actor, world action, public resource or protection authority. World sources appear through the ordinary story card and confirmation sheet. Their declarations belong in the bookmark's stories list. Personal responses remain ordinary scenario tracks.

The initial trusted local-source adapter exposes committed household decisions through householdLocalities (declared milestone/provinceId/siteId triples) and pure householdEvents(s, record). Each occurrence contains source (the canonical source story id), milestone, provinceId, siteId, turn, before:null and after:null. Trusted future source types must provide their actual committed occurrence facts; imported JSON cannot implement callbacks, insert occurrences, reinterpret county activity as a site attack, or register a source adapter. The existing 64-stage and 64-decision bounds also bound this source history.

A personal incident may use source:local_story, storyId, milestone, provinceId and siteId, with the normal requires dependency and afterIncident route. The source must expose that exact milestone/site combination. A control incident may optionally name a physical site to review an actual county authority transition there; it implies no site-level hostile action. Other county story results cannot be tagged with a guessed site. Source facts and current exact residence gate confirmation. Residence means the protagonist's existing homeSettlement resolved to the canonical authored site, outside travel, personal war and captivity. A county-only journey, including its arrived phase, does not establish exact-site presence. This adapter changes no location.

A household_observer can opt into the local-source protocol with localities, a list of 1-32 unique objects containing exactly provinceId and siteId. Every entry must resolve in the effective world and the source's declared localities. provinceIds and requirements.provinces still declare the affected counties; each provinceIds entry must have a locality. Beats select declared source milestones, with reach local, previous or none. previous requires a prior delivery at that same site. County-only source adapters retain their existing declarations and behavior. Local notices expire expiryTurns after the actual occurrence, so a late visit cannot restart their lifetime. Two observers of the same occurrence share its source, milestone, turn and site, regardless of observer id. They acknowledge it once. A live personal response retains priority during observer expiry and temporary absence.

County keys remain exactly [householdId, source, milestone, provinceId, turn, before, after]. Local keys append siteId as an eighth element. A local personal graph uses record version 2 and may contain both declared county tuples and declared local tuples. Its localEvent decision records additionally contain locality:{provinceId,siteId}; these fields must match the declaring stage. A local observer also uses version 2; its cursors are keyed by the canonical [beatId,provinceId,siteId] tuple and its controls/reached scopes by [provinceId,siteId]. Pending occurrences include siteId and must match their committed source fact and token. Local observers accept only their declared local event receipts; an ordinary county observer retains version 1 and seven-element keys. The existing limits of eight pending notices, sixteen observer decisions, thirty-two reached places and sixty-four receipt closures remain. Local cursor count is bounded by declared beats times localities. Unknown fields, retargeted/stripped keys, nonexistent source facts, malformed scope keys, unsafe or future stamps and version downgrades fail before state adoption. Restore never creates sources or delivers notices.

The independent household-locality-river.json and household-locality-hill.json imports under tests/e2e/fixtures/authoring configure two same-county sites with observer aliases, and a different milestone with a shorter deadline plus a mixed county/local personal response. Both use ordinary Mods import, canonical costless source decisions and shared story confirmation. No shipped historical declaration opts in. Technology impact is none for household_locality_receipts; exact presence, current source facts and ordinary owners remain authoritative.

Personal service-contest notices require the committed track result and its actual host/realm war. A stored contract id alone is not a completed accord. Ratified personal terms and committed AI settlements supply accord notices; lapsed terms read the canonical contract's current status and effective authority rather than inventing a track result.

household_observer accepts id, type, title, intro, sourceStoryId, provinceIds (1-32 unique ids), expiryTurns (1-360), beats (1-32), requires, requirements and an optional registration anchor. sourceStoryId must name a required predecessor of a supported source type. Declare affected provinces in requirements.provinces too. Each beat has a unique id and trigger, reach:local, previous, service or none, name, text and 1-4 choices. Each choice has a unique id, label, detail and operation:review_records or continue_livelihood. Both operations are costless acknowledgments; they cannot grant resources or execute arbitrary effects. service requires the court source's real attached service entitlement. none explicitly records a silent research boundary.

Campaign triggers are negotiating, started, won, failed, diverted and interrupted. Court-settlement triggers are opening, pressure, paid_accord, service_period, contest, contest_won, contest_failed, diverged, civic_result, route_departure, route_arrival, route_interrupted and terms_changed. Ruler restorations accept pending, restored, diverted and interrupted. Contested offices accept review, survived, deposed, restored and interrupted. Tribute cessions accept pending, active, installment, breached, diverted and interrupted. Civilian migrations accept pending, active, batch, completed, diverted and interrupted. Government contests accept open, resolved and changed. Pending restoration and civilian-migration timers are silent; neither proves a local proposal.

Polity foundations accept rebelling, founded, failed and diverted. Rebellion requires the matching live group at the capital; founded reach uses actual granted counties still owned by that court. Partitions accept granted, declined, diverted and interrupted; granted reach requires the actual saved grant and current holder. Succession partitions accept agreed (phase planned), executed, declined, expired, interrupted and diverted. Designated successions, diplomatic exchanges and recognition accept agreed, declined, expired, interrupted and diverted. Treaty settlements additionally accept pressure, requiring the saved pressure war to remain an actual ordinary war between its recorded parties; a pressure amount alone is silent. Settlement timestamps use their canonical turn field. Local places are the participating capitals and declared regions or saved shares, never every subject of the realm. A later terminal report supersedes that source's pending notice.

Holy-war triggers are called, won, failed, declined and diverted. Called requires the matching live campaign id, calledTurn and faith and reaches its actual objectiveCounties. Outcomes use that campaign's nonhistorical recorded target; a missing campaign supplies closure only to previous recipients. Declined and diverted use previous reach. Historical seeds are never occurrences. These reports create no preaching, contribution, vow, harm or travel transaction. Reviews include current source-party identities, life and generation so changed courts invalidate confirmation. household-settlement-observers.json demonstrates two independent imported sources with different milestones and expiry. These county source adapters retain the existing bounded version-1 save shape.

Local reach uses the declared affected places and, for active campaigns, real matching host/war locations. Previous reach requires an earlier local notice from this observer. Home and actual presence must agree. Initial source facts are baselined; opening context is an explicit exception. Declarations contain no callbacks or unrestricted state paths. The shared story compiler validates imported and bundled definitions identically and never initializes a campaign while validating candidates.

Version-1 observer records are optional state.stories entries with householdId, actorId, revision, attachedTurn, cursors, controls, reached, pending, history and householdReceipts. Cursors hold semantic source tokens and nonfuture turns. Controls retain old/new sovereign and nullable occurrence turn. Pending notices retain their beat, common receipt key, occurrence, source token, county, offered/expiry turns and current controller/holder/sovereign/generation stamp. Limits are eight pending notices, sixteen decisions, thirty-two reached counties and sixty-four closures per observer. The validator rejects unknown fields and malformed ids, decisions, bounds, receipt tuples or future stamps. No migration or restore hook creates missing records or replays a source transaction. The household-observers.json file supplies two independent campaign observers through the ordinary Mods picker.

storyInstances is an object keyed by lowercase instance ids. Each complete declaration must carry the same id and a registered type. A replacement retains its position in the catalogue; new ids follow existing ids unless they declare one registrationBefore or registrationAfter anchor. Anchors may name data instances. A definition may not declare both anchors. requires is an ordered unique list of at most 32 existing predecessors. The complete catalogue is bounded to 2048 instances. Unknown types, duplicate identities, unresolved references, dependency/anchor cycles, invalid operations and impossible attached tracks reject the import before storage or publication.

Trusted scripts register types and pure validators before startup freezes the factory registry. Every import compiles detached instance products against the effective candidate catalogues. Linked type validators and factories receive that candidate context. They may read definitions and create closures, but must not register messages, initialize stories, allocate people, charge resources or change live registries. The loader publishes accepted products and their English message sources before localization is finalized and before a world starts. Each declaration's news map contains records with a valid news/fx/legend/event message key and string text. Keep keys stable and unique to their authored meaning.

A bookmark lists new world ids in stories. Its startScenarios list track ids in tracks; both may refer to instances in the same JSON file. Story operation schemas and intrinsic transaction checks are unchanged. Reload composes the ordered mod stack again. A same-name replacement validates that proposed stack from base definitions, so content removed from the former version cannot satisfy references accidentally. Removing a mod and reloading removes its instances. Only fresh campaign creation calls init. Matching saves resume stored records and never initialize newly absent records. New authored roots join the exact active-mod fingerprint; exposure of an unused root alone does not change the fingerprint of an older mod.

Two standalone import examples live in tests/e2e/fixtures/authoring/harbor-mod.json and tests/e2e/fixtures/authoring/dune-mod.json. Import either through the ordinary Mods file picker. They contain their own world stories, branching household tracks, government definitions, profiles and civic offices. Separate harbor-contracts.json and dune-contracts.json fixtures cover event chances and the other subsystem conversions. These files are authoring and regression assets outside runtime and distribution dependencies. Custom imports remain unavailable in the CrazyGames edition.

Named event chances

eventChances maps lowercase ids to complete records. An event option's string chance names one of these ids, including additions in the same import. The same FB.namedChance calculation supplies previews and outcome resolution; reading a chance consumes no RNG. A formula declares exactly one finite base or baseBalance naming a numeric balance key, min and max in 0-1 with min <= max, and an ordered steps array of at most 32 entries. base has absolute value at most 10. Arithmetic executes in declared order and clamps once at the end.

Weighted steps declare kind skill with a registered skill id; resource with id gold, prestige or piety; standing with role lord, rival, suitor, spouse or friend; realmStanding with role liege, appeal or revocation; or rivalHeat with no selector. Every weighted step chooses exactly one factor with absolute value at most 10 or divisor with absolute value from 1 through 1000000. Role lookups are read-only and missing roles contribute zero.

Conditional steps declare kind flag with a flag id, trait with an effective trait id, terrain with a terrain token, holding with an effective holding id, assetAny with 1-16 unique holding ids, or careerRoles with 1-16 unique registered career roles. They declare exactly one add in -1 through 1 or set in 0 through 1, applied only when the condition matches. equipmentBonus with id battle adds the existing holding and item combat bonuses. Unknown fields, kinds, invalid references, out-of-range values, missing event chance ids and cyclic registered-policy dependencies reject before publication. There are no expressions, function names or arbitrary state paths.

An algorithmic record instead contains only policy, naming a trusted registered chance policy. Current policies are serf_flight, proposal, sibling_proposal, sibling_exposure_denial, plot_discovery, war_battle, liege_grant, county_petition, parliament_vote, parliament_redress_vote, plot, revolt_negotiation and revolt_suppression. These retain their canonical family, court, military and negotiation checks. JSON selects a registered policy but cannot register executable code. Core arithmetic examples include harvest, battle, fabricate_claim, house_claim, rights_dip and travel_trade.

Public authority definitions

authorityOffices, legitimacySources and customaryBases are complete-record runtime roots merged by stable lowercase id. They resolve against the effective candidate forms, profiles and other definitions. Existing office ids and saved appointment/recognition identities retain their meanings. A matching mod fingerprint is required on restore.

An authority office declares name, optional desc, powers from ban/peace/revenue/consent, scopes from host/county/realm, succession reaffirm or continues, and recognitionSources naming effective legitimacy sources. Ban requires host scope. Civil powers require county or realm scope. A power-free honor requires realm scope. Optional publicRole is governor, fiscal or commander and participates in the existing administration profile contract. Optional appointment contains gold, prestige, skill, minimum and optional boolean imperialOnly/annual. The existing qualification, scope, authority, consent, fee and succession transactions still decide whether an appointment can be made. A non-public ordinary petition office needs an allowed court-mandate source with a realm issuer. Put its id in the offering government's officeCatalogue.

A legitimacy source declares name, succession reaffirm or continues, and a nonempty unique issuerKinds list from realm, host, county, character, religious-office and religious-institution. Character issuers also require a nonempty characterRoles list. Issuers must remain living canonical actors, hosts, scopes or serving religious offices. Religious institutions additionally pass their own affiliation and authority checks. Optional mandate is court, command, community, religious_head or succession. The first four expose matching existing mandates through the shared recognition UI. Optional countyRights enables the existing recognition-based customary-right transaction only where the recognized subject already has the required power; it grants no new power by itself. institutional is the existing religious-institution metadata flag. customaryBases records are empty declarations of supported saved-right basis ids, not executable rights.


Behavioral trait mechanics

traitMechanics maps effective trait ids to complete records and may reference traits added in the same JSON import. Names, descriptions, inherent skill bonuses and existing effect groups remain on traits. This separate catalogue keeps retained trait definitions intact while exposing their formerly implicit behavior. Omitted mechanics contribute zero. Changing mechanics is changed mod content and participates in the active fingerprint.

Boolean numeric fields accept 0 or 1: familyFaith, familyWealth and familyService add the corresponding family aim; coerciveConversion permits the existing hostile-faith policy preference after its ordinary gates; literacy satisfies existing lettered qualifications; excommunication supplies the legacy condemnation status through current system gates; pilgrimageExperience supplies existing pilgrimage experience; harshJustice selects the existing severe-justice preference; papalReformBloc supplies the reform-bloc preference. These flags do not create a career, sentence, campaign, office, pilgrimage reward or appointment.

Bounded 0-1 numeric channels are accompliceDeception, accompliceAmbition, accompliceViolence, accompliceIntegrity, accompliceMercy, refusalIntegrity, refusalMercy, refusalFaith, schemeSuccess and intrigueRestraint. Alternative contributions in one channel use their maximum, preserving the existing non-stacking motives. Integrity and mercy are subtracted from accomplice willingness. Refusal channels add to the chance of reporting a refused conspiracy. intrigueRestraint is the existing positive weight multiplier; zero leaves it absent. prayerPiety, intrigueAggression, papalReformSupport, papalSupport and papalPenalty accept 0-100. Prayer and papal support channels sum; intrigueAggression takes the maximum. courtshipProposal accepts -1 through 1 and sums. Owning calculations retain their final clamps and resource/authority gates.

rulerAims optionally maps secure_dynasty, expand_realm, amass_wealth, defend_faith, strengthen_crown, win_independence and keep_peace to weights in 0-100. Each aim takes the maximum weight across the character's traits, and the highest positive weight wins after the existing structural independence and family-continuity priorities. Ties use that listed order. Family aims retain age, marriage, profession and previous-aim constraints. schemeOrder optionally declares integer priority 1-100 and ids, a unique nonempty list of at most 16 effective hostile plot ids. The highest priority trait supplies the order, with saved trait order breaking a tie. Every chosen scheme still uses the canonical target, cost, detection and cooldown rules. A custom order does not implement a new hostile operation.

The harbor and dune JSON examples declare independent discipline traits with different prayer yields and ruler priorities. Existing migrated excommunication records and ordinary trait-award ids retain their original compatibility meanings; mechanics authoring does not rewrite saved people.

Lifecycle event subscriptions

eventSubscriptions maps an existing event id to a complete list of subscriptions. An empty list removes that event's subscriptions. Each subscription has hook and optional require. Hooks are household_birth, child_education, child_adulthood, player_education, player_adulthood, home_raid, protection_offer, justice_arrest, justice_hearing and travel_arrival. Event records and their subscriptions can be supplied in the same import. Existing event replacements keep the subscription associated with their stable id. No executable callback or state path is accepted.

require supports numeric goldMin, goldMax, prestigeMin, pietyMin, minAge, maxAge, yearMin and yearMax; boolean married, hasChildren and atWar; and lists flags, notFlags, cultures, professions, holdings and notHoldings. Numeric magnitudes are bounded to 1000000; lists contain 1-16 unique ids. References use the effective catalogues. There are at most 32 subscriptions per hook and one subscription per event per hook. Queuing retains event catalogue order, period and system availability, once/cooldown gates, participant binding and the ordinary saved event context. It does not roll a probability or run effects. Birth and education hooks retain their ordinary simulation eligibility. Travel arrival subscriptions are marked as travel events and clear with that journey.

Tournament behaviour

tournaments now accepts new ids in scales, programmes, tracks and tactics as well as its existing partial field updates. Each new id also supplies a same-id record in tournamentRules under the matching group. tournamentRules group records replace completely; its four default fields replace individually. Neither root registers code. Each group is limited to 64 definitions.

A track rule chooses resolution (duel, team or score), prize (headline, archery, wrestling or perform, the four retained escrow accounts), optional capability, loseForfeit, serf, openVictory, averageSkills and stake. Contest tracks require a resolution and prize. loseForfeit applies only to duels. averageSkills lists 1-5 different skill ids. stake is 1-1000 and cannot be combined with a contest or wage. The existing track record supplies skill, contest, elite, male, career, wage, injury and severe. Every prize and payment still uses the canonical reserved accounts. Eight entrants and three rounds remain engine scheduling invariants.

A programme rule supplies contests (1-4 unique contest ids with distinct prize accounts), priority (0-1000), optional capability, faithTraditions and cultureTraditions. Optional tradition lists select matching faith tournament traditions or cultural traditions. Default selection uses the highest eligible priority, retaining catalogue order for ties. Existing programme period restrictions apply. Accounts without a contest retain their funds for the ordinary closing refund.

A scale rule supplies capacityBand (integer 0-2), venueKinds (a subset of village, town, city; empty means unrestricted), serviceCommission (0-12) and aiPriority (0-1000). Capacity bands consume the existing nested regional slots. A tactic rule supplies optional resolutions and teamPower (-10 to 10). Existing tactic records supply power (-10 to 10), fatigue (0-10) and risk (0-5). defaultTactic and unattendedTactic name unrestricted tactics, defaultScale names an existing scale and spectatorTrack names a non-contest. Player previews, tactical sheets, AI selection, mutations and restored contests read these same rules. Existing saved ids and budget records are retained.

Additional bounded institution and livelihood contracts

abbeys is a public configuration root. Scalar fields merge; actions merge by id as complete records. Each action names its label, kind, cost and cooldown days. Supported kinds are rents, school, relief, mediate, patronage, defend and concede. Their effect fields are the same named fields in data/economy.js. A defend action also declares chance with base, diplomacy, privilege, min and max. Costs debit the house treasury. These definitions cannot grant personal ownership of institutional property. The existing cap of 12 houses and three residents per house is intrinsic to this bounded subsystem. At most 32 action records are accepted.

householdServiceRoles is a public complete-record table with at most 64 records. An appointment declares position, path (estate, letters, trade or arms), wage, value, training skills, required skills and focusLabel. Optional previous plus days forms an acyclic promotion chain. Existing standing, maleOnly, lettered and traitFit gates remain supported. namesByTenure maps existing tenure ids to presentation names. teachesTrait names an existing trait id and one to 36000 working days; pupilTraining declares one skill and chance from zero to one. Daily work, patron turnover, wages, education, repeated-day guards, expiry and saved appointment ownership remain canonical. A new role gets no employer-facing retainer bonus merely by sharing a position label.

enterpriseMechanics is a public complete-record table keyed by existing enterprise type. output and outputBySpecialization map existing market goods to nonnegative shares whose total cannot exceed one. distribution selects bounded local, overland and water capacity additions. monopoly is craft or trade; tradeFinance is boolean eligibility for the existing finance gate. specializationMarketEffects maps known specialization ids to the same distribution channels. householdStandardDemand maps known household-standard ids to market goods and demand per level. These tables configure actual production, distribution and household consumption; they do not create stock without staffed production or bypass worker, property, technology, finance or market checks.

councilSeatRoles maps existing council-seat ids to market, muster and/or almonry decision roles. The first effective eligible seat in council order supplies each role. Ordinary appointment, eligibility, Standing and bonuses are unchanged. Council confirmation elections are selected by kind council and their declared office; at most one confirmation definition may name each office. An active privilege with effect.kind office_confirmation declares its seats, including imported seats.

religiousOfficeRanks maps existing vocation-path ids to stable rank ids for abbot, bishop and abbeyCandidate. abbot and abbeyCandidate must be supplied together. Faith religiousPaths choose the actual vocation, and these declared ranks route to contested appointments instead of automatic paid progression. JSON cannot bypass the existing office, faith-system, candidate or institution checks. Legacy saved Catholic numeric ranks retain their migration interpretation. New ids use the same career UI and transactions.

quickStarts is a public ordered list with complete replacement by id, capped at 64 effective cards. Each card declares bookmarkId, provinceId, settlementSite, culture, religion, sex, characterName, scenarioId and familyPreset. Optional portraitProfile, firstDeedTip and distributionDefault are supported. Only one effective card may be the distribution default. The chosen community must exist at that settled site, and the card must satisfy scenario dates, birthplace, identity and family restrictions. Locked scenarios stay locked. Cards use the ordinary character constructor and start codes. Standard builds support imported cards; the CrazyGames distribution still rejects custom mods.

Tournament metadata compatibility

An older tournament programme override of headline still projects that first contest into the effective rule record. Clearing its requiresTech flag clears the inherited programme capability gate. An explicitly supplied tournamentRules record takes precedence over that legacy projection. Existing track gates still apply to entrants. New programmes should declare all contests and their capability gate in tournamentRules.

Shared daily focus routines

focusRoutines maps a focus id to one to eight ordered work operations. It accepts at most 128 records. These operations replace the repeated work implementation of the converted built-in focuses and can supply the work of a new declarative_focus. Other transaction-owning focus handlers cannot be replaced through this root. Existing visibility, eligibility, technology, vocation and interruption checks remain in force. Routines merge by complete record and participate in the effective fingerprint when authored.

Supported operations are resource, health, training, trait, standing and countySupport. resource names gold, prestige or piety, with base or a numeric balanceRange pair and optional ordered terms. Terms may add a skill divided by a positive divisor, a flag-conditioned amount, or the prayerPiety trait channel for piety. health is a daily change from -0.1 to 0.1. training declares a seasonal chance from zero to one and exactly one of skill, skills (a uniformly chosen pool) or sexSkills (f and m). trait declares an existing trait id and seasonal chance. standing declares lord or priest, boolean create and a seasonal amount. countySupport declares a seasonal amount. Only training multiplies the existing focusSkillGainRate. Ordered random draws and shared skill/Standing/support operations preserve the built-in sequence; pure gain and preview reads never draw randomness.

The imported harbor_practice and dune_practice examples show different income formulas, recovery and training using the same consumer. Existing constant-only declarative focuses remain valid. Every action still uses its ordinary action UI, eligibility and daily scheduler.

Papal catalogue roles

papacyRules supplies complete records in tactics, orders and policies, plus defaultOrder, incumbentTitle and defaultPolicies. Each group has at most 32 records. Existing papacy presentation records remain supported; new ids declare their name and, for tactics and policies, desc in the role record. Effective records combine original metadata with the role record. The UI and simulation read the same projection.

Tactics select negotiate, doctrine, benefice, backing or withdraw through kind, plus bonus from zero to 100 and prestigeCost from zero to 1000. Their target is elector for negotiate/benefice, candidate for withdraw and none otherwise. Optional closedFrom retains a year limit. Backing remains unavailable inside an enclosed conclave. Paid attempts validate target membership and resources before changing the ballot; beneficiary promises retain their promised support. The existing election, obligation and result records remain authoritative.

Orders declare integer minimum from zero to 18, share from zero to one and boolean shortlist. Creation fills unmet quotas in declaration order, then balances non-shortlisted orders by count. The bishops-shortlist election law reads the shortlist role rather than a particular order id. College size and appointment budgets retain their existing bounds. defaultOrder names the order used for a newly installed claimant and incumbentTitle supplies its presentation fallback.

Policies declare kind lay, canonical or concordat, bounded tax and strength modifiers from -0.5 to 0.5, seasonal piety from -100 to 100 and optional institution naming an existing papal institution. These kinds select secular, church or shared appointment support. defaultPolicies names secular, religious and compromise defaults of the corresponding kinds. Shared gates govern UI selection, demands, AI responses and bishop appointments. Existing papacy remains an atomic legacy root; papacyRules is an additive contract and participates in the mod fingerprint only when authored.

Travel roles and defaults

travelRules maps each travelPurposes id to kind, encounters and arrivalEvent. Supported kinds are pilgrimage, trade, study, service, expedition, frontier, relationship and tournament. They select existing journey algorithms. encounters names a purpose of the same kind whose encounter pool is shared; arrivalEvent names an effective event. Tournament arrival belongs to the scheduled-games transaction and accepts no arrivalEvent. New purposes retain their own saved identity, prices, destination filters and history. Purpose records require name, desc and bounded cost; minTier/maxTier are integers from zero to seven. Targeted relationship and tournament purposes require targeted:true. Only frontier purposes use mode:frontier. There are at most 128 purposes. travelDefaults selects trade, relationship and tournament purposes for the corresponding automatic entry points. Both roots merge entries by id. Custom arrival events use the existing travel_capstone_done effect when they complete an ordinary journey.

Estates agendas

parliamentAgendas contains up to 64 complete records keyed by stable id. Each needs event (an effective event id) and order (integer zero to 10000). Optional war, aidRoom and revocationConsent booleans filter current canonical terms. capabilities, notModifiers and anyModifiers each accept one to eight distinct effective ids. Modifier checks read the home county. The annual session cadence and RNG draw remain shared; eligible agendas retain order and append their events to the ordinary queue. Policy motions continue to declare resultEvent through policies and use the existing reviewed motion transactions.

Agency policy and personality

agencyRules changes bounded numbers in the existing ruler and managed-family algorithms. Top-level scalar fields merge; aims and familySkills replace their whole respective maps. The seven registered ruler aims each declare cultivation and peerCultivation (-10 to 10) and sponsorRebels (boolean). The six family aims each map to one skill. Probability fields familyProgressChance, familyRequestChance, rebelChance and approachChance range from zero to one. familyProgressSteps is 1 to 20; familyPrestige and marriagePriority are zero to 100; approachCooldownYears is 1 to 20. relationYears is 1 to 8 and rebelYears is 1 to 5, retaining bounded saved records. rebelMultiplier is 1 to 3. hostileLiegeFavor, rebelRegardMax and rebelFavorMax are -100 to 100. secureFamilySize is zero to 12; marriageAimAge is 16 to 100; familyRequestAge is zero to 100. Ages, counts and durations are integers. Three simultaneous rebel sponsorships and one player approach/request per year remain engine workload limits. Existing authority, relevance, consent and resource checks remain mandatory.

traitMechanics also supports researchWeights, mapping warfare, agriculture, crafts, learning, governance, commerce or seafaring to a multiplier from zero to four, and investitureResistance from -100 to 100. The ruler's saved personality selects these weights in the ordinary research and investiture AI. Omitted research domains multiply by one; omitted resistance adds zero.

Shared focus operations and event deeds

focusRoutines additionally supports a literal range instead of base or balanceRange, capped skill terms (cap is zero to 10000), specialization terms for the matching focusGold, focusPrestige or focusResearch channel, and gold income terms with id tax or bishopric and factor zero to one. research steps use the same bounded arithmetic through the canonical research account. Standing roles include liege, liegeOrLord and administration; optional specialization:focusStanding adds the current career effect. Preview and tick share these reads. The existing Toil, trade-profit, military-command and intrigue algorithms retain their own canonical state and guards.

deedEvents maps existing simple event-dispatch deeds to effective event ids, retaining each deed's availability, cooldown and day cost. It cannot replace a deed that owns a transaction. New deeds use the existing declarative_deed event capability. The six base bindings are seek_blessing, hold_court, visit_diocese, ecclesiastical_court, extraordinary_tithe and hold_feast. Entries replace by id and validation resolves same-import events before storage.

papacyRules.cardinalCulture and fallbackCulture select generated cardinal cultures with kind culture and an effective id, or kind seat or era without id. The base declarations preserve the existing Italian and Frankish defaults; custom worlds can use their own identities or geographic/era defaults. tournamentRules.legacyProgrammeCapability preserves the older programmes.requiresTech flag when an existing mod turns it off or back on. Explicit programme capability declarations take priority.

Household service roles may declare coversDuties, at most 32 distinct tenureDuties ids. Only a current, workable appointment with an unspent term credit covers a listed duty, and a duty with commutationGold still requires payment. An omitted list grants no substitution. Existing roles retain their ordinary work-duty lists.


Tenure and freedom JSON catalogues

tenureArchetypes, tenureDuties and tenureRights accept complete records merged by stable id. Their effective tables are limited to 128 records each. Duty/right labels and descriptions retain their existing localized text fields. Archetypes require a matching id, priority 0-10000, name and description, stable workLabelKey/workDescriptionKey, English work text, bounded selectors, two to four scheduled duties, up to two rights, four context slots and eight conditional duties. The catalogue must retain exactly one priority-zero archetype with an empty selector; no particular id selects the fallback. System gates still apply to every candidate, including the fallback.

Selectors retain the documented bookmark, culture, faith ancestry, tradition, province, terrain, coastal, settlement and development conditions. Array selectors contain up to 512 unique known values. Province selectors require explicit bookmarks. A scheduled duty declares a known duty id, intervalTurns 1-7200 and a known event or context slot. Dates contain season, day 1-90 and cycle 0-20. A context slot has up to sixteen terrain/settlement cases, each naming an event, plus a fallback event. Due dates can live on the duty or on every case and fallbackFirstDue. Rights may be an id or a rightId with terrainAny. Existing transitionTerms retain their canonical commutation and additional-service contract; authoring never grants property or frees a household by changing its label.

freedomTerms replaces or appends complete stable-id bands in order, up to 32 effective records. Each has minStanding, optional maxStanding (default 100), positive priceFactor at most 10 and serviceDays 0-360. Bands must cover petitionMinStanding through 100 without overlaps or gaps and include both immediate and service-bearing terms. freedomBargaining merges scalar petitionMinStanding, offerDays, petitionCooldownDays and finalServiceDays. The cooldown is at least offerDays and at most 7200; service-bearing bands match finalServiceDays. Effective definitions are validated before storage. Existing offers retain their frozen price, coverage, authority and service terms; changed mod fingerprints prevent silent reuse under different definitions.

Regional foundations and federate terms

historicalAmbitions accepts up to 128 complete records replaced or appended by unique id. Each declares name, desc and news (bounded English text), region and tier (duchy 5 or kingdom 6), share in (0,1], prestige 0-10000, bonus tax or levy, amount 0-1 and days 1-36000. Optional culture, capital, foundedYear, established bookmark ids and island/mainland duchies constrain the same canonical foundation checks. References resolve against the effective candidate catalogue. The declaration controls both player and seasonal AI completion. News registers at publication as news.ambition.<id>; tax_reward and levy_reward are reserved message ids. Save records retain the declaration id and original completion/expiry turns. Repeat completion does not repeat rewards or title changes.

federateContractTerms contains at most 128 complete templates. payPerSeason is 0-10000, initialPay is 0-100000, durationDays is 1-36000 and renewWindowDays is a nonnegative integer below durationDays. service, land, recognition and autoRenew retain the modes described above. Shared term expansion, current actor checks, separate consent, initial payment, renewal and service ledgers remain authoritative. New template ids can be referenced by imported story parameters. Opening helper tables remain internal source organization; author new openings through storyInstances and bookmarks.

rankPrestigeYearly supplies complete ruling, guild or religious rate groups. Each group has at most 256 numeric rates from 0 to 1000; ruling keys are station bands 0-7, guild keys are member/master/officer/guildmaster and religious keys name effective path ranks or the structural bishop/cardinal/pope offices. Omitted groups retain their defaults. The yearly award and UI breakdown read the same rates without storing a derived rate in saves.

AI aim response policy

Each agencyRules.aims record also supplies courtshipBonus, liegeGrantBonus and countyPetitionBonus in [-1,1], intrigueAggression in [-4,4], intrigueRestraint in [0,1], marriageApproach and coerciveFaith booleans, marriageScore, conversionFaithScore and conversionScore in [-100,100], and unique conversionMotivations drawn from faith/culture. motions contains at most 32 ordered selectors: exactly one known motion id or policy family, plus value in [-100,100]. The first matching selector wins. These parameters feed existing consent, marriage, conversion and intrigue algorithms without bypassing their eligibility or resource checks. Registered aim ids and the one-aim-per-ruler save contract remain fixed.

Collective demand gates receive the candidate demand definition. Commons, taxation, guild and sanctuary pressure check that definition's declared privilege. Sanctuary also recognizes an existing privilege with the same canonical effect. The awarded holder follows the privilege's holderTypes, including newly declared faith privileges. Named gate algorithms remain registered engine capabilities; a new privilege id does not require another gate implementation.


Bounded deed transactions

deedRoutines maps action ids to complete bounded transactions (at most 128). The four converted built-in actions give_alms, swear_friend, squeeze_taxes and convene_synod retain their existing eligibility handlers. A new declarative_deed may instead provide its transaction in this root, omitting costs, effects, queueEvent, choices and capability from the deed definition. Ordinary visibility, eligibility, cooldown and day-spending fields still apply.

A routine contains optional resource costs, exactly one effects record or known queueEvent, optional tax income and optional message. Effects permit gold, prestige, piety and popularOpinion from -10000 to 10000, a stable setFlag and opinion with a friend/rival/priest/lord role and amt from -100 to 100. They use the existing event effect interpreter and preview. Tax income declares kind tax, factor 0-2 and minimum 0-10000; it adds max(minimum, rounded current tax times factor) gold. Costs use the existing bounded resource-cost schema and are rechecked before payment. A message has a unique news.action.<id> key and nonempty English text up to 2000 characters; registration occurs at publication. No custom callback, arbitrary state write or executable operation is accepted. This root cannot replace a bespoke canonical transaction handler.


Opening service, migration and ruler faith targets

federateServiceStarts and federateMigrations accept at most 128 records each. A service start array contains at most 32 explicit templateId/patronRealmId/federateRealmId/hostId records, with optional bounded payPerSeason, initialPay and absolute endTurn overrides. It must name a compiled court_settlement story and one of that opening's hosts belonging to the declared federate realm. Migration records retain the fields above; duration is at most 36000 days and unit composition must sum to positive men at most 1000000. Neither root executes a story or creates commitments during validation.

rulerFaithTargets replaces the complete nonempty list of public ruler-conversion and church-council faith choices. It contains at most 128 unique assignable faith ids, including faiths in the same import. The annual AI, current conversion quote and shared council menu use this list. Existing system, ruler, succession, authority, cost and household gates still apply.

Stateful action policy

actionPolicies configures six registered transactions as complete records by policy id. toil declares injuryChance (0-1) and injuryHealth (0-10), with household service and tenure harvest still owned by their canonical transactions. trade_run declares successBase (0-1), skillChance (0-0.1), profitBase, loss and minimum (0-100), profitSkillDivisor (1-100), stockThreshold (0-10000), poorStockFactor and trainingChance (0-1). lead_host declares standing (-100 to 100) and trainingChance (0-1); it never creates a command or advances a battle. scheming declares powerBase (0-100), powerSkillDivisor (1-100), trainingChance, discoveryCap, discoveryBase and exposureFactor (0-1), with discoveryBase no greater than the cap. Plot target, hostility, discovery and resolution still belong to the plot engine.

scheme_rival declares successBase (0-1), skillChance (0-0.1), standingDivisor (100-10000), trainingChance (0-1), successPrestige, failurePrestige and successStanding (-100 to 100), and successHeat/failureHeat (0-100). mediate declares successBase, trainingChance (0-1), skillChance (0-0.1), successPrestige, failurePrestige and successOpinion (-100 to 100). The existing social transactions preserve their draw order and consequence owners. Shared details show actual chance and consequences; stateful focus details use current policy yields and training. Unknown policy ids/fields, missing fields and out-of-range values reject before publication.

Institution validation

Election, privilege and collective-demand maps allow at most 256 records each. Elections retain guild or council kinds; a guild office is officer or guildmaster, while a council office names a declared seat. Every confirmation seat needs one council election. Election terms, campaigns and defeat cooldowns are 1-36000 days. At most 32 named electorates, rivals and tactics are allowed; supports name those electorates. Weights are integers 1-100, probability bases 0-1, and rate/support coefficients -1 to 1. Tactic costs remain nonnegative and canonical resources are rechecked when used. Privileges select registered modifier, guild_monopoly, obligation or council_confirmation effects; references and incompatible fields reject. sourceEvents contains bounded provenance ids, including synthetic transaction sources, rather than only queued event ids. Collective demands select the five registered collective_demand predicates and name their actual privilege; arbitrary callbacks are rejected. Each custom confirmation charter keeps its own saved record identity.

Religious recognition, communal mediation, court AI and ecclesiastical temporal recognition resolve source mandate roles from legitimacySources. Saved recognition rows still retain the exact authored source id. The succession/court/command/community/religious_head role is policy, not an instruction to rewrite a saved row or bypass issuer eligibility. Ordinary office appointments additionally restrict sources through their declared recognitionSources.

Position and local motion behavior

positionRules is a complete-record map keyed by an effective positions id, limited to 128 records. teaches is an optional boolean admitting a retained officer to the existing household tutor choices. It requires kind retainer. localCouncil is an optional boolean requiring a valid local council appointment before an earned position contributes its effects. It requires kind earned. Missing flags are false. The saved tutor character role remains the legacy personal-master arrangement; it is distinct from an authored position id.

positions and localCouncilMotions each allow at most 128 complete records. Both require name and desc and permit icon and fx. Positions also support kind (earned, retainer or service), an effective profession, minTier within the station ladder, maleOnly boolean, pay from 0 to 10000, and quality from 0 to 100. Position fx permits gold and retinue from 0 to 10000, and enterprise and tax from 0 to 2. Motion fx permits gold, enterprise and retinue with those same limits. Unknown effects reject. Local motions already use their declared effects without id dispatch: the existing annual session, one active ordinance, 360-day term and canonical localCouncil record are shared transaction rules. New ids need no engine branch.

Crown governance behavior

policyGovernance maps an effective crown policy id to a complete map of up to 32 effective level ids, with at most 64 policies. Empty level maps disable a prior behavior binding. Each level accepts tolerance (persecution, preference or tolerant) and coercivePressure, coerciveResistance and peacefulResistance (finite numbers from -1 to 1), plus an optional boolean protectsWorship. Missing numeric fields are zero. The first declared tolerance in ordinary policy order wins; numeric contributions sum across active policy levels. Authority, worship protection and community conversion read the shared pure realmPolicyGovernance projection. When the governing tolerance is persecution, the persecution story and the yearly religious_persecution mistreatment note apply and record that level's policy id. Any active level with protectsWorship true enables the faith-refugee story. Both still require a directly held minority county. Policy names and level ids have no religious-tolerance special case. Ordinary proclamation costs, cooldowns, eligibility and saved level identities remain unchanged. The internal_peace and external_campaigns keys still identify the two canonical saved war-law dimensions; their shared enforcement and permission state machines are not historical content selectors.

Endowment raid yields

marketRaidYields maps up to 128 endowment ids to complete bonus records. Imported entries must reference effective marketEndowmentTypes. Fields are gold, provisions, wares, materials, transport and luxuries, each from 0 to 1000. The strongest local value in each channel applies once, preserving the original non-stacking endowment behavior. Ordinary wares/materials minima remain 4/3, and a sack retains its minimum of 3 luxuries. Existing strength, fortification, casualty and victory multipliers still apply afterward. Unused retained entries are inert if a complete marketEndowmentTypes replacement removes their type. Newly supplied dangling entries reject.

Remaining trait channels and identity defaults

traitMechanics additionally supports holyWarParticipation (0-1000), holyWarLongVow, holyWarSacredDesire and holyWarCrownDesire (0 or 1), holyWarStanding and rivalryWeight (-1 to 1), and courtLoyalty, courtSharedFaithLoyalty and conversionResistance (-100 to 100). Ruler records with one trait and characters with trait lists use the same reader. Holy-war participation and flags use the maximum; signed standing, loyalty, rivalry and conversion contributions sum. Holy-war standing is clamped after its ordinary 0.5 base. Sacred desire precedes crown desire when both apply. Original vow draws and durations remain unchanged.

authoringDefaults accepts learning, an effective techTraditions id, and intrigueLaw, a complete record containing default (legalTraditions id), cultures and realms maps. Each map has at most 256 entries and resolves its keys against effective cultures or bookmark realms and its values against legalTraditions. Existing explicit cultural learning and tradition membership precede learning fallback. Intrigue retains nondefault faith law first, then declared realm and culture law, then effective faith law or the declared default. Names and id substrings never infer law. Retained baseline realm mappings are inert when a complete bookmark replacement removes that realm; newly imported mappings must resolve.

Civic candidacy story type

civic_candidacy is a player track with realmId, officeId, name, desc and choices. The realm must declare a civic form/profile and the office must exist in that profile. choices contains exactly stand and decline, each with a unique stable id, label and detail. Display text is bounded to 2000 characters. Common id, type, requires, requirements and registration anchors retain their story compiler contracts. Unknown fields and operations reject.

Stand delegates to the ordinary civic nomination quote and transaction, charging its actual fee once. Decline ends the invitation without a charge or a public grant. The nominated track observes canonical election results on normal daily dispatch. Death or succession interrupts an unresolved invitation. Saved records contain phase, charId, result, officeGeneration and endTurn; restore validates them without nominating, paying or appointing again. Shared story review shows the actual nomination cost. This type creates no office, electorate, treasury or property.

Playable authoring examples and timing

The small harbor-mod.json and dune-mod.json in tests/e2e/fixtures/authoring define independent three-county fictional worlds. Lark Harbor has a household bench, a civic election and a candidacy branch. The Glass Road has a well council, an independent following, paid access and a bounded settlement campaign. Both import through Mods. The larger harbor-contracts.json and dune-contracts.json are focused subsystem fixtures on a shared medieval test world; they are not the fictional-world journey proofs.

On file URLs or loopback hosts only, append ?modTiming=1 before boot to record the base_snapshot and apply_validation timings. In the browser console, FB.mods.timing.enable(true) enables subsequent import measurements and FB.mods.timing.read() returns copied transient rows. Preserve the browser console log before importing: the stored_stack report prints before normal reload. Reports include elapsed milliseconds, copied-root count and JSON code units for the baseline snapshot, and validated stack count for import. JSON code units are not retained heap bytes. No timing data enters storage, saves or telemetry; production hosts cannot enable this instrumentation. Performance acceptance requires owner measurements of no-mod boot, each example, both examples in order, and same-name replacement, alongside activation, daily/annual work and save size. Whole-stack validation remains authoritative.

authoringDefaults.motionPostures is a complete map of at most 128 policy ids to fallback posture records. It preserves legacy replacements that omit policies.posture. Each record permits aidSlope, martialSlope, ageSlope and economicPowerSlope (-1000 to 1000) and up to 128 known-trait weights in traits (-100 to 100). Explicit policy posture takes precedence, including an empty record. Unknown fields or references reject.

Optional opening profiles

storyInstances accepts opening_profile with id, type, title, intro, scenarioIds (one to eight ids), optional provinceIds (one to sixteen ids), optional officeRealmId, requires, goals (one to eight), contacts (zero to four), and the ordinary registration anchors. Attach its id through the start's tracks and trackLocations. The final fresh-start boundary resolves its people after ruler adoption, deferred opening actors and local institutions. Imported JSON follows the same detached compiler and bookmark validation as bundled declarations. A profile cannot attach outside its declared scenario and opening birthplace.

Each goal has a unique id, name, text, optional office boolean and criterion. office:true requires officeRealmId and archives pending goals when the original incumbent, ruler generation, mandate or jurisdiction changes. All goals belong to the initial protagonist; death or succession archives unfinished personal goals. Completed, dismissed and archived receipts never pay rewards. Setting aside a pending goal is a reviewed, costless action. No deadline or inherited obligation is created.

Criterion kinds are reserve (positive amount, lawful free status and current private gold), earnings (positive amount and one to eight focusIds, actual positive ordinary vocational focus payments after opening), any (one to eight conditions, at most four nested levels), story_choice (required storyId and declared choiceIds, a newly committed registry choice), household_phase (required household storyId and terminal phases), job_complete (required household storyId and jobId, full work with actual personal payment), service_payment (required service_negotiation political storyId, an allocated installment after the opening period), civic_mandate (required civic_mandate political storyId and an actual officeId and civic_mandate result), event (eventKind and existing realmId), pact (existing realmId and a new actual peace pact), or hold (reason, never completes). Unknown or incompatible fields fail validation. No arbitrary state paths or executable predicates are accepted.

Event kinds are profile_receipt (positive ordinary settled public receipts), profile_host_payment (a committed actual player host expense), profile_provincial_bargain (a successful canonical provincial negotiation), profile_royal_choice (an explicit canonical public-candidate nomination or recognition decision by the player), and profile_consent (a newly recorded constituent assent or refusal). Existing gates and conserved transfers belong to the source transaction. A priority in an agenda, a preview, opening funds, loans, gifts and a positive cash delta cannot count as earned work or a public receipt. These adapters observe commits; calling a goal never performs one.

Each contact has a unique id, label, text, linkKind (target, kin or introduction), required boolean and person selector. person.source is realm_ruler with realmId, opening_actor with actorId, story with a required storyId and stateField naming the source record's character field, or royal_member with realmId and authored memberId. Required structural references must resolve in every offering bookmark; optional missing people remain unavailable. Royal members use the existing snapshot/materializer identity, never a name search or a second character. The profile stores the resolved character id once. A later ruler succession never redirects that personal link. target and kin create no friend record; introduction calls the ordinary noteFriendContact gate with cultivated:false, unchanged Standing and no eligibility exception. Ordinary travel cleanup remains authoritative and restore never reintroduces anyone.

The shared story people hook projects read-only character links. Opening a character sheet retains ordinary social and travel access and returns through shared modal history. No local audience, appointment, kinship, military command or free access follows from a directory link. The optional profile record is validated by its type; missing records in old saves remain missing. Examples: tests/e2e/fixtures/authoring/opening-goals.json.

County control and claimant examples

tests/e2e/fixtures/authoring/river-control.json and upland-control.json are complete fictional ordinary imports. They use geographies and bookmarks, province realm, realm nonTerritorial, and the existing province customaryRights schema. Both retain a local holder and an outside political court at the same county anchor. Upland Courts explicitly adds a judgment-backed Peace right for that outside court; River Courts grants none. An effective Peace claim and diplomatic recognition create no automatic county Revenue. The existing render quote and commit transfer a specific funded obligation to its public institution once. No new JSON root or saved field is added.

There is no bookmark declaration for an independent historical occupation, a permanent garrison or a displaced claimant's fiscal administration. Live ordinary occupation belongs to its canonical war and does not itself transfer owner/holder or replace the holder's ordinary fiscal allocation. Do not create an unsupported opening war, liege relationship, recognition or Revenue right to encode an unresolved historical role. See docs/designs/occupation-and-claims.md for the audited boundaries and tests/e2e/specs/occupation-claim-boundaries.spec.js for file-import and campaign coverage.


Mobile command declarations

A mobile realm may opt into hosted_following (retained_principal succession) or expedition_command (superior_commission succession), composing coalition_court territory, command_consent, following_levy and command_receipts. Mobility uses the territory strategy's mobileFollowing marker independently of coalition succession. New command forms need mobile.opening's existing principal bindings and conserved muster. They additionally require mobile.command with id, superior and operations, plus optional landedCommandLink as documented under Office-conditioned expedition commands. id matches [a-z][a-z0-9_]{0,95} and is scoped to this declaration's exact realm and existing host, following and account.

For retained_principal, superior is null and death leaves an unresolved vacancy. For superior_commission, superior is either {kind:"opening_actor",actorId:"your_direct_actor"} or {kind:"realm_ruler",realmId:"your_other_realm"}. An opening actor must be direct, distinct from every opening member, and alive and available at initialization. A realm reference requires a different nonmobile realm's current living materialized incumbent; an ordinary opening actor ref may materialize that existing ruler. A dead or captive issuer suspends command. A replaced realm incumbent requires explicit recommission by the new incumbent; a dead direct actor has no automatic successor. No county or local fiscal right follows from either reference.

operations is a unique nonempty array drawn from recruit, demuster, move, march, offer, accept, work, trade, war, peace, service, land, contract, settle, pledge and leave. The maximum length is the catalogue's 16 operations. Missing operations are unavailable to player and AI. The existing operation terms, costs, war legality, resource conservation, member recruitment pledges and outside consent remain authoritative. Command forms have no coalition proposals, assent or weighted elections and no county, settlement or general realm income. An allowed offer still requires the actual outside court's acceptance. Command consent maps levy to recruit, agreement to offer, treaty to peace and grant to settle; it supplies no local Consent.

FB.mobile.commandSnapshot(state,realmId) projects current issuer, saved commission, operation scope and effective status. reviewCommand(state,{realmId,commandId,action,actor,candidateId}) uses action appoint or recall and actor {kind:"character",id:actualSuperiorId}. appoint requires an eligible living adult allegiant member principal; recall omits candidateId. mobile.commit revalidates the entire review through the ordinary governmentSelection source mobile_command. No realm actor can impersonate the actual superior. Changes in issuer, generation, eligibility, declaration, public funds or reviewed identities invalidate the review. Appointment and recall cost zero, stop orders, and preserve the existing host, population, public treasury and private household station. Retained mandates expose no replacement transaction.

These declarations use mobile schema 3 with existing schema-2 openingBindings plus command:{id,status,revision,issuer,leaderGeneration}. status is active, vacant or recalled. issuer is null for a retained mandate, otherwise {characterId,generation}; generation is null for a direct actor and the issuing ruler generation for a realm. Matching restore validates these facts without initialization or replay. Existing schemas 1 and 2 remain unchanged. Exact imported-content fingerprints include operation policy and superior identity. The complete independent ordinary imports are tests/e2e/fixtures/authoring/mobile-command-harbor.json and mobile-command-dune.json. Both retain their existing real on-map migration patron and inhabited origin/target. Independent sponsorship and finite external warrants are documented below; multiple columns remain a separate contract. See docs/designs/mobile-command.md.

Member pledge and departure permissions remain personal decisions under their existing self-principal, conservation and local-settlement checks, even when public command is suspended. They cannot recommission a recalled commander. Every public operation, including paid work, still requires an effective mandate.

Independent mobile sponsorship and external commissions

Command-declared mobile openings may explicitly add sponsorship:{schema:1,kind:'independent'} and patronRealmId:null. This requires the existing mobile.opening and mobile.command contracts. All other declarations retain their required real patron; a missing sponsorship field never waives it. Origin and target remain inhabited physical counties, without implied ownership, local access, funding or protection. No new mod root is introduced. The general migration constructor accepts the waiver only for the effective declaration's exact following, origin, target, canonical following_<realmId> host and profile settlement form, only while its fresh command is effective and has no migration yet.

The migration stores the optional same-shaped schema-1 sponsorship marker with null patron. Both mobile and authority save validation reconcile it against the effective declaration and reject missing markers, forged policies, extra fields, a simultaneous patron, a patron migration contract, a nonnull migration choice/war, or an invented settlement seat. Independent records cannot use patron-based federateRequest or the generic federate settlement route. Owned-land settlement uses the conserved mobile review/apply transaction. The ordinary reviewed access, separately funded real-party service, war, and actual ownership settlement gates remain available within command scope. A consented access payment does not install a sponsor. Settlement sessions use the real following's sole seat after actual ownership is established; no null authority is added. Legacy migration fields and missing markers keep their previous semantics.

superior_commission additionally accepts superior:{kind:'external_authority',id,name,generation,endTurn}. id matches [a-z][a-z0-9_]{0,95}; name is a nonblank proper label of at most 160 characters. generation is an integer from 1 to 1000000; endTurn is an absolute campaign turn from 1 to 1440. This records a finite accepted external warrant without inventing an on-map person, home, realm or budget. It is independent of sponsorship, so an external command may still have a real separate migration patron. The existing schema-3 command.issuer variant is exactly {externalAuthorityId,generation}; it must match this declaration even after expiry. No additional command ledger or schema is installed.

At endTurn the effective issuer is absent and public operations suspend without electing a successor, renewing the warrant, moving people or restoring stock. Full superior declaration and current issuer are included in commandSnapshot's authority/superior projection and ordinary quote signatures. No local actor or fabricated external actor can use reviewCommand to appoint, recall or renew this warrant. Remote political decisions and historical-person death are outside this bounded warrant contract. A missing commander remains a vacancy under the existing command rules. Restore preserves the recorded issuer and suspension without running initialization. Complete imported-content fingerprints include sponsorship, superior identity, generation and term.

Ordinary independent examples: tests/e2e/fixtures/authoring/mobile-expedition-harbor.json uses a retained leader without a patron; mobile-expedition-dune.json uses an external council warrant with a different force, member and operation policy. They import through Mods with the same validators and transactions as bundled declarations. Existing mobile-command examples retain their actual sponsor requirements. See docs/designs/mobile-command.md for invariants, presentation and technology decisions.

Named command starts

A startScenario whose governmentForm selects commandLeadership uses rulerRealmId for the stable public command institution. Its characterName, sex, startCulture and startReligion must match the direct opening actor bound to mobile.opening.leaderMemberId. The binding may be opening_actor or the supported same-realm realm_ruler binding; its actor declaration must be direct and explicitly named. fixedProvinceId equals mobile.origin. The scenario's tier and gold describe the private household, independently of the command realm rank and treasury. Keep onboarding:ruler and the standard family preset. The existing opening actor parent references supply family; fresh command starts create no generated royal family. Other ruler starts retain their existing identity and rank rules.

Fresh boot prepares opening actors and community partitions before protagonist lookup, then initializes the following after population, market and treasury setup and adopts that same person. Existing openingInfrastructure is installed before resource setup for these stable-identity institutions. Repeated attachment and matching restore preserve the actual people, original generation, conserved roster, food, public account and private purse. These starts add no new JSON root or saved schema. Complete ordinary examples are tests/e2e/fixtures/authoring/expedition-command-harbor.json and expedition-command-dune.json.

Local threat and incident declarations

The registered local_threat world type in js/story_local_threat.js accepts id, type, title, intro, actor, locality, optional authorityRealmId, firstDate, lastDate, choices, ai, requires, requirements and one optional registration anchor. Put its id in the bookmark stories list. locality is exactly {provinceId,siteId}, resolving to one unique inhabited physical settlement in that effective revision. Dates are exactly {year,season,day}, with year 1-9999, season 0-3 and day 1-90. The inclusive opportunity spans at most 1440 days and ends within 1439 days of the bookmark opening. It attaches only on fresh turn zero. Unknown fields, operations and unresolved sites or authority realms fail detached candidate validation.

actor is exactly {kind:'protagonist'}, {kind:'resident',characterId} or {kind:'opening_actor',actorId}. The first binds the original protagonist, the second names one existing persistent local-folk character id (lf_<county>_<generation>_<index>), and the third resolves the canonical opening-person mapping. A resident declaration creates no person or household and never selects a replacement. Opening identity and a county position prove no site presence. The current protagonist requires the ordinary exact permanent-residence witness outside journeys, personal war and captivity. An NPC requires a matching existing localFolkRecord, its actual household settlement, ordinary county residence, and no reigning office or managed-household relocation. Other NPCs, mobile hosts, institutional representatives and county-only travel arrivals have no supported exact-site carrier here and remain unavailable. A missing resident is interrupted without generation. The engine never calls localFolkEnsure or moves a person to make the action eligible.

Optional authorityRealmId binds that original court's actual person and ruler generation. Every act requires the same living capable authority and its current direct ownership and holding of the locality. A change interrupts the episode without installing a successor. This condition grants no public office or power to the actor. Every actor must be living, adult, healthy enough to act, free of current custody, exile, travel and an incompatible religious activity. Choosing an incident supplies no permission for violence, conquest, custody or property transfer.

choices contains 2-4 unique records with exactly id, label, detail and operation. Operations are intimidate, attempt, resolve and withdraw, with each operation appearing at most once. intimidate and withdraw are required. An authored attempt also requires resolve. The actual sequence is dormant/available, threatened, attempted, resolved; withdraw ends an unfinished episode. Intimidation, attempt and resolution require separate increasing campaign turns. Movement before an act keeps an opportunity dormant; loss of presence after an act interrupts it. Expiry, authority loss, death or replacement cannot reopen a closed episode. Each mutation uses one pure quote and a revalidating commit through the ordinary story API; stale facts change nothing.

ai is exactly {policy,minPressure}. policy is hold, withdraw or local_pressure; minPressure is greater than zero and at most 100. The player actor always retains personal choice. NPC hold takes no action; withdraw declines without an occurrence. local_pressure compares actual negative countySupportBase with minPressure, withdraws below it, and otherwise chooses the next authored supported act through the same quote/apply path. It attempts at most one act per boundary and one non-withdrawal act per campaign day. An open date alone, culture or religion cannot trigger intimidation. No RNG, violence probability or demographic effect is introduced.

A committed act produces one immutable occurrence, with at most three per episode. The trusted householdLocalities/householdEvents interface exposes threatened, attempted and resolved at the declared site, using the existing source/milestone/provinceId/siteId/turn/before:null/after:null protocol. Household observers require explicit localities and share ordinary exact-site receipt aliases and personal priority. An occurrence is evidence only of that actor's recorded act. sourceResult is null: this type neither fabricates a battle receipt nor resolves injury, mortality, conversion, detention, seizure, money, loot, protection or movement. Refuge consumers must use their own current provider, person, capacity and authority checks; no refuge record is changed by this type.

The version-1 state.stories[id] record is exactly version, actorId, authority, locality, status, revision, openedTurn, endTurn, endedTurn and occurrences. authority is null or exactly {realmId,characterId,generation}; occurrence rows are exactly {serial,milestone,turn,locality,actorId,authority,sourceResult}. Serial and milestone order, original person, effective site, bounded dates, matching authority, terminal stamps and supported operations are validated before state adoption. An opted-in world cannot drop its required episode record or version; unopted older worlds retain their absence. Restore never attaches, dispatches, acts, pays or repairs. Matching mod fingerprints include all terms. Ordinary JSON import examples are tests/e2e/fixtures/authoring/local-threat-river.json and local-threat-hill.json. Technology decision local_threat_incidents is none.

1096 institution composition

data/institutions_1096.js stages the literal bookmarkInstitutions1096 table before data/bookmark_1096.js copies it into that bookmark's complete localInstitutions field. This organizing table adds no runtime JSON root. Ordinary JSON authors continue to use bookmarks.<id>.localInstitutions and the existing religiousInstitutionProfiles contract. The four Rhineland rows reuse jewish_local_congregation_later, with no officeId, representative or property. Their distinct site ids identify separate groups; the inherited role still checks county residence. durham_see_1096 uses the separate legacy durham_bishop office, explicit vacancy and officeSystem:null. Each row is freshOnly and remains absent from older saves that never initialized it. See docs/research/institutions-1096.md for the dated scope and absent offices.

Household association declarations

The household_party type is a protagonist-bound track supplied through storyInstances and ordinary startScenarios.tracks. It accepts id, type, title, intro, optional requires and registrationBefore/registrationAfter, plus maxMembers (integer 1-16), allowDependents (boolean), invitationDays (integer 1-90) and adultPolicy (volunteers or refuse). Unknown fields, executable policies, carrier promises, resources and relocation effects are rejected during detached candidate compilation. The JSON imports household-party-harbor.json and household-party-upland.json provide independent complete fictional worlds with different consent, capacity, child and expiry behavior.

FB.householdParties.review(state, storyId, action, actorId, personId, caregiverId) returns a pure stamped review. commit(state, review) rechecks it before changing one association. Supported actions are invite (the original protagonist asks for a named household member, including oneself), accept (the adult or exact parent agrees), refuse (the adult or parent declines), withdraw (the adult, parent or original protagonist removes a reservation) and finish (the original protagonist closes the plan). Omitted personId is supported only by finish; caregiverId is supplied only for dependent invitation or acceptance. Accepted adult consent has no reply deadline; an unanswered invitation expires after invitationDays. A row occupies one lifetime catalogue place even after its reservation ends. Parent removal includes every reserved dependent in the affected list. Nonplayer policy never supplies the protagonist's reply or a dependent's care consent.

snapshot(state, storyId) returns accepted, waiting and excluded arrays of exact person ids after current availability and parent checks. reservedBy(state, personId) returns the sole open association reserving that person or null. These projections prove neither travel, camp admission, local-site presence nor protection. Association is currently preparation at the existing home only; no carrier or settlement API is exposed. Ordinary property and solo travel remain under their existing owners.

The optional version-1 state.stories[id] object has exactly version, partyId, householdId, actorId, revision, status, openedTurn, closedTurn, closeReason and members. partyId equals the declaration id and householdId equals the original actorId. status is forming or closed. closeReason is null while forming, otherwise finished, actor or succession with a valid closedTurn. Each of at most maxMembers rows has exactly personId, kind, caregiverId, status, invitedTurn, endTurn, decidedTurn and consentActorId. kind is adult or dependent; caregiverId is null for adults and an earlier accepted parent row for a dependent. Row status is invited, accepted, refused, withdrawn or expired. endTurn is invitedTurn plus invitationDays; invited rows have null decision fields, accepted/refused rows identify the adult or parent, and automatic expiry/withdrawal records no consenting actor. Only invited/accepted rows in a forming record reserve a person. Closed history preserves ids without creating missing people. The parent validator rejects absent required records and overlapping reservations. Restore validates without replying, closing, moving or rewriting residence. See docs/designs/household-parties.md.

Mobile column operations

mobile.reviewColumns(state, request) returns a normal governmentSelection review with source mobile_columns; mobile.commit(state, review) revalidates and applies it. request contains exactly realmId, action, terms and actor; actor is a character reference with kind and id. Supported exact terms are march/move {columnId, countyId}, stop/demuster {columnId}, assign {columnId, candidateId}, split {columnId, otherColumnId, unitId, count}, merge {columnId, otherColumnId}, recruit {columnId, unitId, count}, and war {columnId, causes}. causes contains one ordinary aggression cause with type, enemy and target. No arbitrary effects or executable JSON policy is accepted. All configurations use the existing mobile.command.operations permissions, declared column slots and shared unit catalogue; these calls add no mod root.

march and stop require the selected column's current commander or the effective overall commander and march permission. move requires the overall commander and move permission, one host already at camp and a lawful ordinary route; it selects the sole camp escort. assign requires overall march authority and an available adult member from the opening bindings, and stops that column's current order. split requires overall recruit and demuster permissions, a retired destination slot, its eligible commander and at least the normal army minimum on each side. It transfers an exact existing class count, deterministic demographic roster and proportional carried food. merge requires overall demuster permission, the same locality, halted hosts and equal war references; the emptied source retires. Existing service commitments block reorganization.

recruit requires overall recruit permission, actual camp presence, an eligible nonhired class and enough pledged living people and public money. Reforming a retired slot requires the normal army minimum. It cannot credit private gold or create population. demuster requires actual camp presence and completed war/service commitments. Forced remote disband instead disperses its survivors without returning them or stock to camp. war requires overall war permission and the ordinary connected-objective, consent and diplomatic preview; it binds only the chosen host and leaves movement to a separate order. The raw generic order, split, merge and war shortcuts remain blocked. AI uses these same reviews; no independent command or resource path exists.

The optional saved mobile.columns schema 2 keeps exactly schema and entries, with each entry retaining id, hostId, commanderId and status active/retired. It is created by explicit member assignment; original schema-1 saves retain their original commander constraint. Schema 2 permits only currently retained original opening-member identities, without automatic replacement. At most one active host may have mobileCourt:true, at the actual camp location. Restore validates every host, roster, unit, food, commander, migration and aggregate conservation identity without initializing missing records. Partial ordinary settlement requires a stationary camp; final ordinary settlement requires all field columns to be retired by actual reunion and demuster first. Existing single-host schemas and declaration schema 1 remain unchanged.

Home decision presence and delegation

A governmentForms entry may declare homeAuthority:{schema:1,presence:'capital',delegation:true}. All three fields are required; presence is capital or territory, delegation is a boolean, and unknown fields reject. Omission retains the form's existing decisions. Capital requires actual presence at the current capital; territory permits the current territorial jurisdiction. The presence rule applies independently to the incumbent and any deputy. New home levies, appointments, discretionary grants, war and public spending pass this additional gate. Ordinary upkeep, debts, accepted service awards and already committed construction retain their canonical owners.

An authorityOffices entry may declare homePowers, a nonempty unique array of levy, appointment, grant, war and spend, bounded to five entries. It must support realm or county scope. Only an actual effective character appointment in that exact institution can supply those powers; a host-scoped appointment never qualifies. The living adult free deputy must be locally eligible under homeAuthority, within the actual scope, before its endTurn and still commissioned by the current issuer generation. County deputies require the matching provinceId and actual presence there. Existing Ban, Peace, Revenue or Consent powers do not imply any homePowers. No regent is generated and no old appointment receives new powers by default.

FB.homeAuthority.quote(state,realmId,operation,request) returns the pure additional permission review, actual characterId, appointmentId and detached signature. request optionally supplies exact characterId, appointmentId and provinceId references of at most 200 characters. With no policy this is only a pass-through guard; it supplies no authority and the ordinary operation must still validate its actor, target, consent and resources. Unknown physical location and an ambiguous detached camp/field command cannot establish local presence. Review never calls travelEnsure, materializes a ruler or writes a location. Existing accepted service awards pass only with their exact effective contractId/awardIndex and matching province, settlement and recipient; a fabricated commitment cannot bypass the grant gate.

Command funding

An authored mobile.command declaration may opt into mobile.funding:{schema:1,publicGrants:true,privateContributions:true,maximum:80}. All fields are required and unknown fields reject. Both source switches are booleans, at least one is true, and maximum is finite, greater than zero and at most 1000000. It bounds each contribution, not available credit or a recurring grant. Omission offers no funding action. The policy belongs to the effective bookmark declaration and ordinary JSON fingerprint, not another saved balance or executable selector.

FB.homeAuthority.fundingQuote(state,input) accepts recipientRealmId, a positive finite amount within that maximum, the actual consenting characterId, and source:{kind:'public',realmId} or source:{kind:'private',characterId}. Public source and recipient must resolve to distinct active canonical public accounts; military accrual remains reserved. Public grants require the source incumbent or a currently eligible exact grant deputy; appointmentId and provinceId can select an actual delegation. Private contributions support only the canonical protagonist's private gold and require that same character's consent, without appointmentId or provinceId. Both use the active command's separate existing treasury. FB.homeAuthority.fund revalidates the complete quote, declaration, mandate, authority, balances, turn and fundingRevision before one conserved transfer. It credits no additional money, food, troops, private rank or rights.

FB.treasuryPublicAccountSnapshot never aliases an adopted crown to player.gold. An adopted dynastic office without a distinct public account cannot grant public funds; its household may still opt into a correctly labelled private contribution. FB.treasuryFundingTransfer is the low-level explicit-account transfer beneath the reviewed owner, alongside the existing treasuryTransfer API; callers must not substitute it for consent review. No source account is created or repaired by a read or rejected transfer. treasuryAccounting.fundingRevision is an optional nonnegative safe integer, incremented only after successful funding. Its strict save-v4 platform validation rejects malformed values. Missing legacy revisions remain absent on restore, and no save version or balance is reseeded.

Office-conditioned expedition commands

mobile.command may additionally declare landedCommandLink with exactly schema:1, actorId, homeRealmId, homeGeneration and endTurn. homeGeneration is a positive safe integer matching the declared home ruler generation (default 1). endTurn is an absolute turn from 1 through 1440, exclusive. The opening leader's principal must be {kind:"realm_ruler",actorId,realmId:homeRealmId,generation:homeGeneration}; that actor is exactly {ref:{kind:"realm_ruler",realmId:homeRealmId}} in bookmark.opening. It resolves the existing home officeholder rather than creating a second character. The home is a different nonmobile realm with an explicit valid government homeAuthority policy, and its capital is the camp origin. Ordinary other principal, muster, unit, custody, age, funding and consent gates remain binding. Landed command declarations cannot include land, contract or settle operations, since those would replace this separate nonterritorial institution.

The personal command is nontransferable and remains subject to the existing superior, member allegiance, operation scope and public account. A retained mandate has no superior recall; an actual superior may recall only its own commission. No linked mandate may appoint or renew a commander. Home starts adopt the home office through the ordinary start transaction; the expedition keeps its original institution and treasury. The actor may be a home ruler start or an observed nonplayer ruler. Direct nonlanded command starts retain their existing contract; an indirect home actor is not a mobile command start. Home office lookup prefers the territorial crown, and all held commands and home offices receive the same death once.

The required optional authority.governments[commandRealmId].landedCommandLink has exactly schema:1, characterId, homeRealmId, homeGeneration, commandGeneration, revision, reason and changedTurn. homeRealmId retains the original declaration id; live reads resolve the start alias. commandGeneration pins the original installed command generation, while mobile.command remains the single mandate/issuer/status owner. reason is null, death, custody, office, term, member, mandate or closed. revision is a nonnegative safe integer below Number.MAX_SAFE_INTEGER; changedTurn is a nonfuture nonnegative safe integer. A zero revision requires null reason and turn zero. The original actor, declared home and both initial generations are immutable. No balance, person, deputy, copied appointment or army is stored here. Every exact civil deputy is read from the ordinary current appointment by homeAuthority per operation.

Command reads are pure and suspend immediately for death, custody, incapacity, loss of the required home person/generation, expiry, missing allegiance or invalid mandate. Daily and death boundaries record the latest reason and stop orders, retaining ongoing consumption, commitments and actual people. Returning from temporary custody may restore an otherwise unchanged mandate; a lost office generation or expired term cannot be renewed. Matching saves may contain an unreconciled suspension and are validated without initialization, reconciliation, person replacement or payment. Missing opted-in links, erased government rows, unknown fields and forged provenance are rejected; unopted saves must have no link. Existing mobile schema 1/2/3 meanings and the v4 envelope remain unchanged.

The standalone landed-expedition-harbor.json and landed-expedition-upland.json examples import through the ordinary Mods file picker. The first joins a landed incumbent to a finite independent command with actual scoped civil delegation. The second retains a nonlanded independent voluntary principal without a deputy or superior. expedition-command.spec.js covers those declarations, actual home adoption, funds, scope, interruptions, death, malformed imports/saves, restore and replay.
