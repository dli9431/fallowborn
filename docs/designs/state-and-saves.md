Live expedition objective continuity

Programs declaring holy_objective use optional execution schema 3, preserving the existing exact mobile row and save envelope. Fresh schema-1 checkpoints upgrade only on a live mutation. Schema 3 adds lastCommitTurn and campaignId to the existing execution fields. Its objective route tickets bind the same campaign id, ordinary host, original commander and generation, field mode, holy war assignment, county and issued turn. campaignId remains after arrival or interruption, so a later call cannot adopt old program intent. A truthful stale ticket remains loadable for normal subsequent reconciliation. Detached restore never dispatches, observes arrival, joins a vow, creates a host or upgrades the record. Future action days, mismatched campaign identities, missing optional-required fields, foreign hosts and unsupported mode/schema combinations reject adoption without repair. Programs without this adapter retain their prior schema 1/2 meanings. Exact bounds and independent save/replay coverage are recorded in docs/designs/expedition-programs.md and expedition-objectives.spec.js.

Expedition records reviews

Optional expedition_undertaking world stories use a strict version-1 record of original party identities/generations, two once-only decisions, actual decision turns, a revision and finite terminal disposition. Only pending, reviewed, declined, expired and interrupted are supported; no active promise, payment or fulfilled-land receipt is saved. Validation checks exact fields, same-generation current identities, historical references, bounded decision clocks and terminal consistency on the detached save. A valid pending record may await ordinary reconciliation after current command or office loss. Matching restore never performs that reconciliation, acknowledges for AI, materializes an incumbent, pays access or transfers a county. A declared review with attached prerequisites cannot lose its saved record. Campaigns without the optional declaration remain valid and create no review. The v4 envelope is unchanged, and the ordinary exact mod fingerprint covers mode, parties, scope and time. See docs/MODDING.md and docs/designs/stories.md.

Opening column location provenance

Optional openingLocation on a saved mobile.columns entry is present exactly when the matching declaration opts in. It contains the original countyId and optional siteId, with exact keys, values and curated physical membership. Saved schema 1 and 2 retain their existing commander rules and the outer mobile schema remains 3; existing entries without this declaration keep their four original fields. This reopens the optional entry contract only for immutable opening provenance. Armies retain current at/from, paths and carried stocks, and the migration retains the camp. Provenance grants no current site occupancy. Matching restore does not demand continuing opening access, an unchanged war or the original army location, and never initializes a missing host, restores spent stock or returns a moved column to its opening county. Forged, missing or unsolicited provenance rejects detached adoption. Ordinary mod fingerprints include location declarations.

Column provisioning continuity

Column-aware supply policies introduce no saved fields or version change. Profiles retain their existing supplyPolicy schema 1, mobile commands retain schema 3 and optional column sets retain schema 1 or 2. Ordinary armies store actual carried food and mobileProvisionTurn; member pools, camp food, public treasuries, market stock, lastDay and shared pasture records remain the canonical owners. Strict matching restore validates those identities and conserved totals without buying, transferring food, recruiting, renewing a commission, creating a missing host or dispatching a policy. Unknown supplyPolicy or procurement-ledger fields on saved rows remain invalid. Exact mod fingerprints include the complete policy, and changing it under the same name cannot resume an older checkpoint. mobile-column-supply.spec.js covers depleted checkpoints, retired-host recovery and deterministic daily replay.

Personal expedition participation contract

The optional expedition_participation story record has exactly version:1, householdId, actorId, revision, status, roleId, leaderId, generation, migrationId, hostId, slot, openedTurn, requestedTurn, acceptedTurn, endTurn, endedTurn, reason, lastPlace, lastTurn and locationHeld. householdId and actorId bind the original protagonist. Status is pending, active, suspended, left, expired, interrupted or declined. A pending unrequested record has null role, authority, carrier and term references. Requests bind the actual host commander, generation and migration. Civilian hostId and slot stay null; an accepted combatant stores its existing host and positive counted position. No demographic pool, purse, vow, biography or rendered text is copied into this record.

Turns and revisions are nonnegative safe integers. Unoccurred turns and reasons are null. Terms are bounded by the declaration's 1-1440 days; acceptedTurn precedes the deadline. Terminal statuses require an actual ending turn and bounded reason. Current authority may have become ineligible before the next ordinary lifecycle boundary, while identities and originally accepted terms remain valid history. Unknown fields, schema downgrades, foreign references, future occurrence stamps, missing attached records, duplicate participation/positions and capacity violations reject detached adoption. Missing optional records remain absent in scenarios without the capability. Existing envelope, platform and authority versions do not change.

While locationHeld, the protagonist's ordinary travel record carries participationId and exactly purpose, homeId, destinationId, destinationRealm, currentId, phase, remainingRoute, outboundRoute, visited, legDaysLeft, legDays, startTurn, cost, overhead, encounters, seenCultures, seenEvents and completed. Its purpose is the registered default relationship journey, without a target person or relationship effect. It is a completed temporary stay (arrived) or a separately paid return. The admission owner supplies the actual carrier projection; the travel owner does not run another itinerary. Admission cannot use ordinary capstones, household settlement, a second journey or the ordinary unpriced return action. Interrupted return retains its checkpoint as a temporary stay. Actual home arrival releases locationHeld once. No family residence changes.

Restore validates both records and their attachment without initializing, reenrolling, moving, renewing or charging. Death, replacement, expiry and carrier loss are handled at the next normal boundary. Older unrelated journeys keep their existing fields and semantics.

Personal ruler agenda contract review

Mobile provisioning policies add no saved field or version. Their projections read the effective profile and existing camp food, host food, treasury, roster, pasture and lastDay owners. Restore preserves partial shortages, actual losses and daily guards without purchasing, recruiting, harvesting, consuming or initializing a policy cursor. Exact active-mod fingerprints include the full policy. Unknown supplyPolicy fields on a saved mobile row remain invalid; the configuration belongs to the effective profile.

The v4 freeze is reopened for the optional ruler_agenda track record, schema 1. It stores subjectId, original ruler generation, delegated mandateId or null, openedTurn, current ordered step, status, outcomeTurn and at most sixteen decisions containing stageId, choiceId and turn. The four statuses distinguish an open, completed, voluntarily stopped or interrupted personal program. Decisions must follow the effective declaration in order; early completion requires an authored finish choice. Unknown fields, stages, choices, invalid ordering and future turn stamps fail detached validation.

The envelope and subsystem versions retain their meanings. No prior record is reinterpreted and no migration initializes an absent agenda. Existing saves, including those created with the same scenario before agenda attachment was authored, keep their missing records. Restore resumes only saved choices and never calls init or apply, pays, grants, obtains consent or declares war. Historical subject ids may outlive compacted characters. The next ordinary story lifecycle boundary interrupts a still-open program after a real incumbent or mandate change. Pending, completed, absent and malformed-record coverage belongs to ruler-agenda-type.spec.js and ruler-agendas.spec.js.

Opening infrastructure application contract

The optional state.openingInfrastructureState record has exactly version:1, explicit:true, bookmarkId (a nonempty string) and revision (a nonempty string). Presence means the explicit fresh inventory was applied, including an empty inventory. Its bookmarkId and revision must equal state.start.id and state.start.revision and resolve to an effective world with openingInfrastructure. No counters, placement copies, rendered text or mutable holder ids are saved. Unknown fields, wrong primitive types, false policy and mismatched or missing world declarations fail detached v4 validation before adoption. This additive contract reopens the frozen platform for this optional field only; existing envelope and subsystem versions retain their meanings.

Only fresh player and observer boot may initialize the inventory, after political/site identity and existing-ruler adoption, before fort repair and initial population, market and treasury setup. The initializer stages the entire ordinary building ledger and marker before publication, checks every live site and opening holder and changes neither RNG nor UID. Inherited records have devGranted:0 and no construction award. Repeated initialization with a valid marker is a no-op. Restore validates the marker and keeps actual ordinary assets; it never calls the initializer, copies a current inventory or requires demolished seed records to survive. Missing legacy markers stay absent and keep the existing fortMigration behavior, even for an explicit world. Present markers suppress inferred capital forts without reinterpreting fortMigration.

Fresh campaign defaults and replay

Named mobile command starts prepare the existing bookmarkSetup actors and community partitions before selecting the protagonist. The following initializes after population, market and treasury setup and before command adoption, using the same canonical actor and public realm. Explicit opening inventories are installed before those resource owners initialize. No additional persistent stage, saved field or schema version records this ordering. Matching restore retains the actual actor, parent links, generation, host, finite supplies and distinct private/public balances without calling fresh preparation. expedition-command-starts.spec.js covers both command policies, repeated attachment, empty inventories and exact seed replay through ordinary JSON imports.

Hosted opening access

Optional mobile.hostedAccess declarations add openingAccess:{schema:1,id,startTurn:0,generations:[following,partner]} inside the existing mobile record. The canonical agreement remains in agreements, with its ordinary active/ended lifecycle, finite term and no new payment. The marker persists after expiry prunes the agreement. Strict validation rejects absent, extra, future or altered provenance, changed declared terms and a missing unexpired agreement. No old declaration receives this marker, and existing mobile schemas and the v4 envelope retain their meanings. Matching restore validates facts without performing opening initialization, purchasing admission, renewing consent, harvesting pasture, moving the camp or adding an agenda. The ordinary daily boundary ends access invalidated by living authority or current capacity. An adopted host court retains its agreements through canonical realm-counterparty remapping.

Optional household story records

Finite work contract review, 2026-10-16. The optional household_track version:1 record may additionally contain jobs and jobPatrons together. jobPatrons binds each declared offer to its opening ruler character id or null. jobs contains at most eight one-time records with payerId, workerId, openedTurn, expiresTurn, daysWorked, paid, refunded, escrow, status, resolution and nullable closedTurn. The owning validator checks declared identities, bounded working days, nonfuture transaction stamps, exact expiry terms, completion/resolution consistency and paid plus refunded plus escrow equal to the original fee. These optional fields do not change existing field meanings or the v4 envelope. Old records without either field remain absent and cannot silently acquire an opening patron on restore. Missing tracks remain missing. Pending, disputed, resolved, interrupted and malformed imported-work records have focused regression coverage. Restore never funds, works, pays or refunds; the next ordinary lifecycle boundary owns interruption and pending refunds.

Personal continuity and paid-focus observation retain the existing household_track version:1 shape. A protagonist graph keeps its original actorId; interruption and actual-work completion are semantic phase transitions with the existing revision and stageTurn. A bounded expense is remembered by its existing per-stage decision and cannot charge again on a return to that stage. No save contract fields, envelope versions or migrations change. Restore validates the stored graph phase without selecting work, observing a new payment, buying supplies or initializing an absent track. Next-boundary death handling belongs to the ordinary lifecycle.

The household_track type reopens the v4 story contract for its own optional version:1 records only. It stores semantic phases, continuing household and current actor ids, a quote revision, stage turn, per-stage decisions, observed sovereign transitions and incident closures. Its owning validator rejects unknown fields and malformed references before adoption. Restore never attaches a missing household track, infers a past decision or replays conversion, travel, settlement or payment. Existing world stories and older saves retain their shapes. Household continuity preserves decisions through succession; an old actor's quote cannot apply for the heir. Immediate named-family evacuation is not part of this record or of ordinary travel.

New player and observer states initialize the existing empty inherited-household roster, close-age match preference, travel fields and truce ledger before play. War accessors bind during world creation, so the first query cannot change the serialized player shape. New treasury accounts include the existing zero distribution cooldown. These are the same defaults already supplied during restore, with no envelope or subsystem schema change. The observer placeholder records its existing founder and completed parent initialization, preventing a direct checkpoint restore from inventing a family. Observer mode remains session-only; observer regression checkpoints use direct save restoration in that session rather than the household load flow.

The 1066 observer regression starts through startObserve and checks that direct checkpoint restoration preserves observation, world facts and invariants. The northern 476 legacy regression captures detached expanded runtime records before serialization, then compares the restored records against them. Compact royal-member fields are reconstructed by load and do not represent newly created relatives. The comparison still preserves exact ownership, communities, court members, institutions, missing expansion content and RNG/uid identity.

Royal succession members and full characters have separate compaction rules. A member's explicit null fatherId or motherId remains in the wire form because member inflation does not reconstruct those character defaults. An absent member parent field stays absent; restore never infers a parent from newer court declarations. The northern 476 legacy regression checks the saved unknown mother as well as the complete restored court.

Dated religious definitions

Faith availability is catalogue metadata and adds no save-envelope field, campaign catalogue version, world revision or load-time migration. Retained released ids and effective defaults keep their existing compatibility ratchet. Restore resolves saved faiths, generated ancestry, office ids, relations and active population projects through existence-based validation, without applying fresh authoring date gates to those facts. New projects and conversions recheck current availability before their ordinary apply. Loading never changes a mixed population, creates an institution or awards a religious milestone. Failed generated-faith creation leaves saved counters and state unchanged. See docs/designs/religions.md and tests/e2e/specs/religion-coverage-rollout.spec.js.

Colonate records

Roman tenancy adds landownerId to the existing version-1 player.tenure record and retains its scheduler, rights, duties, revision and closed outcome. The shared familyFreedom version-1 record accepts military_service and ordination as lawful semantic routes; flight remains unlawful. The flags colonus_flight_until and colonus_flight_resolved_turn record cooldown and once-only resolution for a queued attempt, and follow the household through bound succession. No rendered prose is saved. V4 platform validation checks the possessor reference, home, exact estate rights and bounded authored duty list on detached migration and serialization. Restore never creates a tenure or a possessor, replays a due or invents a family release for existing free 476 households. Disabled saved tenancies remain recorded and dormant. The envelope and subsystem versions remain unchanged.

# Game state & saves

Recurring deed selections live in `fb_automation.recurringDeeds` as a bounded map
of baseline deed ids to `true`; readiness scrolling lives in
`fb_ui.highlightReadyDeeds`. Both default off, are browser-local preferences, and
are absent from campaign exports. Restore accepts only exact booleans and known
automatic-deed ids. Existing campaign cooldowns remain authoritative. Readiness
baselines, highlights and pending scroll notices are transient and reset for a
different state or protagonist. There is no save-version change.

Carolingian settlement records

The five optional settlement records are state.stories.divisio_800, ordinatio_800, gifts_800, recognition_800 and verdun_800. Each stores phase, result, turn, attemptSeason, plan and approvals. Approvals map participating realm ids to generation and consent stamp; they authorize the current parties and shares, not a changed successor or plan. The first record also stores the opening cast and the treaty record stores sibling pressure and its war/rebel ids. Typed validation checks phases, turn stamps, plan beneficiaries, saved realm references and declared region/county ids. Historical character ids may outlive compacted characters. Restore never initializes a missing story, imports newly authored relatives, repays gifts or reinstates recognition. There is no envelope version bump or calendar migration.

The v4 freeze is reopened only for the bundled 800 branch story, with migration selected on 2026-10-07. FBDATA.storyRecordMigrations declares its exact split. save_v4.js copies each old opportunities row, moves cast to divisio_800 and pressure to verdun_800, and adds empty approvals. It validates the copied records before adoption and removes the old carolingian_settlements_800 record. A missing opportunity, malformed cast/pressure/plan or any simultaneous new target record is rejected without changing the source or live campaign. Existing saves without the bundle gain no new settlement records. state.situation476 retains its existing independent legacy migration. All 476 story shapes and the v4 envelope/subsystem versions stay unchanged.

Saved royal members can carry branchRef with source realmId, memberId and the parent memberId in the borrowing court. The exact source member and character birth claim must agree; compact character-id omissions remain valid. Borrowed graphs preserve ordinary parent and sibling validation. Source mutation boundaries synchronize borrowed records, and a derived reverse index is rebuilt through ordinary dynasty repair. Absorption clears borrowed references and moves live birth claims while retaining source tombstones. Optional designatedHeirId must identify a non-ruling saved member; only the living eligible frontier grants priority and accession consumes it.

Optional religion decisions

state.churchCouncils stores the last provincial council per realm, including its ruler and generation, turn, faith, price, participating office and character ids, counties and recognition ids. state.rulerFaithDecisions stores conversions[realmId] with ruler, generation, turn, from and to, plus optional lastAIYear. Both records are created only by enabled mutations, persist in the ordinary v4 envelope and are validated before adoption. Reads, restore and legacy migration create neither record and repeat no payment, council or conversion. Disabled institutions keep their records dormant. Completed character pointers are historical strings and remain valid after ordinary dead-court compaction. Current eligibility always reads the living ruler and office snapshots rather than those historical pointers.

Late antique recognition adds a Curialis player track with semantic phase, result, office ID and outcome turn. It attaches only to a Curialis start at Ravenna; existing federate and medieval saves gain no new story record. Saving an opening preserves it without executing a choice, and loading a completed opening neither charges again nor creates another appointment. AI realms may also hold stationPrestige and stationStandingYear, additive numeric fields for earned recognition and the last annual accrual; older realms initialize these at their next yearly review. Band identities, authority records, career IDs and existing clerical path indexes retain their saved formats. No save version bump is needed.

Water service extension contract

New opted-in ordinary buildings may contain waterOperation with exactly v:1, id, profileId, assignmentId and nonnegative revision. Construction alone sets revision zero. Successful conserved operation alone creates state.buildingOperations with exactly version:1, definition, positive revision and receipts (at most 2048 original asset ids). Each receipt contains assignmentId, assetId, revision, actor, authority, turn, untilTurn, period, amount, paid, sources, demandId and resourceRevision. authority contains the original concrete characterId, realm generation or null, holder and owner; sources contains each route source's id, profileId and period. Exact declarations, one matching building scalar and upkeep enter definition; siteResources independently fingerprints actual sources and owns all remaining claims and water balances. Restore checks strict fields, current declarations, original identities, finite paid term, unique revisions, quantity, demand, lower bounds on spent renewable water and exact resource/asset references. A surviving positive-revision binding requires its receipt and resource owner. Old missing owners remain absent; restore never allocates, pays, fills storage, refreshes a term or creates property. The v4 envelope and all other subsystem versions retain their meanings. Full optional bounds and historical removed-property receipt policy are documented in docs/designs/building-operations.md.

Site resource extension contract

Optional state.siteResources version 1 is a reviewed additive platform contract. It contains exactly version, definition, revision, nextId and sources. definition fingerprints structural source/profile/site/rights/connection parameters, excluding display labels and presentation slots. revision is a positive safe integer covering every successful allocation transaction. nextId is a positive safe integer for globally unique local reservation ids; it is independent of FB.uid. sources is a nonempty table of at most 256 known declared source ids. Each row contains exactly profileId, period, stock, consumed and reservations. period is null for storage, otherwise a nonnegative period ordinal no later than floor(state.turn / periodDays). stock is zero except actual received water in storage; consumed is zero for storage and bounded by renewable capacity otherwise. Historical older periods remain valid without renewal during restore.

Each of at most 64 reservations per source contains exactly id, actor, characterId, generation and amount. actor is a typed existing character/realm reference, characterId retains the concrete original person, and generation is null for a character or the original nonnegative incumbent generation for a realm. Reservation ids are unique across all sources and below nextId; positive integer amounts and consumed plus reservations cannot exceed renewable capacity, and storage reservations cannot exceed actual stock. Dead/recalled historical identities remain references rather than a request for replacement. Current use always rechecks identity, authority, custody, period and revision. Unknown fields, profiles, sites, actors, future periods, negative stock, overcapacity and duplicate claims fail detached validation before adoption.

Absent legacy resource state stays absent, even in an opted-in world. Neither migration nor restore initializes a source, expires a reservation, fills storage, renews capacity or commits a transfer. Successful use or release retains the affected source row and monotonic revision. An exact mod fingerprint covers both public profiles and nested whole-revision assignments; changed content under the same mod name cannot resume an earlier save. The envelope, platform stamp and other subsystem versions are unchanged. Structural declaration changes require an explicit compatibility disposition rather than silently replacing balances.

Local institutional ledger

Optional state.localInstitutions is keyed by definition id. Records hold site, representativeId, counterparty standing, demands, consentRights, rightIds, petitions and at most 24 history entries. Petitions carry subject, stage, normalized terms, representative, controlling/applicant generation stamps, startedTurn, expiresTurn, retryTurn, recognitionId and the ballot. state.localInstitutionPeriod guards seasonal AI replay. Fields are locale-neutral; prose comes from definitions and durable message descriptors.

The v4 platform validator rejects unknown ids, wrong sites, invalid actors, malformed terms, bad turn stamps and invalid ratification results before adoption. Existing records restore without voting or paying again. Missing legacy institutions are seeded after world adoption through the story restore hook, reusing the original cast and preserving vacancies. Generic repair fills missing definitions. Disabled systems retain dormant records; ordinary medieval campaigns allocate no ledger.

Restore preserves unexpired scenario standing hosts and standing moving-court hosts using the daily army phase's living-realm and end-turn rules. An absent legacy wars table repairs to an empty table without declaring a campaign. Preservation tests compare structured facts rather than JSON property order, retaining exact checks on ownership, holders, population, family, treasury and hosts.

Save v4 format freeze

In the standard localStorage fallback, a manual slot rejected for quota can compact an existing plain autosave and retry once. Compaction verifies the exact stored JSON, checks that the original value is still current, and replaces only its encoding. It does not use live state or consume a pending snapshot. Later autosaves reuse compression. Failed compaction or a rejected retry preserves the previously accepted campaigns and reports the storage error. CrazyGames keeps its separate storage path, and no save schema changes.

New elective papal roots carry the same explicit role:null default that restoration supplies to succession members. Saving and restoring an opening therefore retains its root identity, ruler generation and court record without adding a field during load. This uses the existing member role field and changes no schema.

FB.save.FORMAT freezes the current resumable envelope at v:4, titleIds:1, authoritySchema:4 and platformSchema:2. The serializer and migration use that definition together; a storage encoding is not another save schema. Later release work must reopen this contract and its migration coverage before adding saved fields or changing their meaning, defaults, id families or subsystem schemas. Changing an existing field's meaning requires a schema change and migration; optional extensions require an explicit contract review too.

The envelope contains those four schema fields, rng, uid, mods, state and optional meta. rng preserves a 32-bit RNG state in its existing signed or unsigned representation; uid is a nonnegative safe integer. mods is the exact edition/mod fingerprint, not a request to switch content profiles. A missing legacy fingerprint is accepted only in an unmodded standard edition. meta is informational slot/Chronicle preview data and does not authorize gameplay changes. Unknown schema numbers and missing required v4 schema fields fail with the offending envelope field. Early v4 branch saves may omit platformSchema and the detached authority schema stamp; migration supplies them without changing their records.

The authority contract in docs/designs/authority.md separates appointments, contracts, recognition and customary rights from county ownership and settlement communities. Normal serialization, slots, autosave and portable exports all write the same final v4 envelope. Version-3 slots and FBS1/FBS2 exports remain readable and migrate on restore; reading a slot or showing its metadata never rewrites the campaign. The next successful save writes v4. FB.save.v4.migrate is the detached compatibility boundary. The unused FB.save.prototypeV4 API alias has been removed; support for its saved envelopes remains. Publication remains subject to the owner-controlled acceptance gate in docs/plans/v2-476-phase-6.md.

The frozen platform scope includes the stamped start, existing-ruler identity, authored royal families and branch links, authority identities and payment/award stamps, federate migrations and claims sessions, bookmarkSetup declarations, local and religious institutions and decisions, historical holy-war records, and every registered world story and player track. Population schema 2, bookmarkSetup schema 1, authority schema 4, western-court rails schema 1 and the other documented subsystem versions retain their existing meanings. The 476 story split and political/campaign rails are part of this one migration, alongside the saved facts of 493, 711, 800, 867, 1066 and 1204. Registries resolve stable ids; the envelope does not embed a second content registry.

Detached preflight rejects malformed legacy situations and malformed or unknown story records before migration hooks read them. Final validation checks the complete story dependency graph before invoking validators that read other stories. A missing dependency names both story ids; duplicate render obligations name the exact obligation. The federate track accepts only its authored phases, roles, results, proposal and claimant choices, valid semantic references, boolean award/payment facts, bounded payment/outcome stamps and a valid veteran site reference. Historical references may outlive their actors or commitments; validation does not revive them. Invalid input leaves the source, live state, RNG, uid and accepted storage unchanged. Serialization repeats identity, authority and platform validation before replacing a slot.

Storage acceptance coverage uses the unchanged Phase 0 corpus from its hash manifest and a bounded two-year annual 476 court/community case. Each journey checks detached migration, repeatability, campaign and custody records, family links, communities, site holdings, finances, authority stamps, RNG and uid, then writes three manual slots and autosave under a simulated shared 5 MiB UTF-16 localStorage budget with 512 KiB of unrelated data. FBC1 slot and FBS2 export round trips remain exact. Size reports distinguish JSON payload bytes from total localStorage key/value bytes; they are not physical disk measurements. The annual case is not a full daily natural-play campaign. Authored coverage is not a passing quota or device result; owner runs and genuine long-campaign exports remain the release acceptance evidence.

The field-level format-3 notes below record when additive systems were introduced.
Those records retain their schemas inside v4; they do not require separate migrations.
The compression prefixes, slot keys, IndexedDB store and Chronicle artifact format
are unchanged. Both CrazyGames storage modes accept the two supported envelope
versions while retaining their edition fingerprint, quota and recovery rules.

De jure IDs are slugs scoped by rank: `duchies.essex`, `kingdoms.england`,
`empires.britannia`. Legacy `d_essex`, `k_england` and `e_britannia` are
resolved only where a field is typed as a title. Realm IDs, character IDs and
other strings retain their exact bytes even when they resemble a title alias.
Generated realm names persist as `nameStyle: {kind, place}` plus optional typed
`titleKind` / `titleId` claims. Their non-enumerable `name` display getter is
rebound on restore before dynastic repairs; localized names are not serialized
as realm fields. Legacy matching English generated title names acquire their
canonical claim at this repair boundary. Repeated repairs do not consume RNG or
UIDs. Custom realm names and already-declared claims remain independent.
Bookmark activation resolves aliases before validation and rejects missing or
ambiguous county–duchy, duchy–kingdom and kingdom–empire links. Migration copies
the input before rewriting typed state references, including regional ambitions,
war casus, holy-war targets and history. It never changes ownership, holders,
communities, custody, family links, treasuries, buildings or settlement keys.

An optional `state.authority` carries `schema:4`, `nextId`, appointments,
recognitions, contracts, rights, render receipts, governments and optional
site-keyed civic actors. Government rows may reserve `eliteCultureId`,
`eliteFaithId` and `legalIdentityId` separately from county communities; no
existing save receives these fields by inference. Each row keeps its semantic
ID, status, scoped references and turn or period stamps. The v4 validator rejects
duplicate IDs, duplicate render obligations, stale ID counters, invalid office
scopes and terms, invalid forms and derived `effective`, `quote` or
`projection` fields. Absent authority remains absent; migration does not
invent political records or replay payments. Repeated migration yields the same
v4 envelope. Ordinary restore requires the active mod fingerprint to match; an
unknown bookmark, title or malformed authority record fails before state/RNG
adoption. Existing deterministic optional-field repairs remain in the normal
restore path.

The [Phase 3 implementation record](../plans/v2-476-phase-3.md) records the
original prototype; [Phase 6](../plans/v2-476-phase-6.md) integrates its normal
entry points. The
[baseline corpus](../plans/v2-476-phase-0/baselines.md) records local export
hashes and the required restore/succession comparisons. Derived views,
permission quotes, render data and revision stamps stay out of serialized
state.

Rebellion campaign identity

Ordinary rebellion wars retain optional casus.rebel, casus.formerLiege, and casus.rebelCharId identifiers. Peace can therefore settle the original ruler's rebellion cases after succession, including cases before an intermediate lord or the player's court. Realm remapping updates realm ids without changing the original accused character. Repair recognizes old AI independence and named breakaway wars from their existing endpoints, without consuming RNG or resetting objectives and siege progress. A missing old arrest court can be recovered from the exact resistance source and campaign start turn. No save-version bump or new historical offenses are required. See war.md and justice.md.

CrazyGames Continue preview

The version-3 save envelope may carry optional meta.household with version 1, numeric tier, enterprise and land counts, a marriage boolean, and a detached objective record. Objectives store stable phase and enterprise IDs, settlement index and proper name, money amounts, readiness booleans and remaining in-game days. They never store localized prose, UI nodes or callbacks. The preview is generated from the live campaign at serialization and rendered in the active locale on the title. It is informational; loading reconstructs progress from authoritative state. Missing preview metadata is compatible with older saves, and a preview calculation failure cannot prevent the campaign from saving. Standard distributions do not add this metadata. The save version and campaign simulation are unchanged.

## Save v4 platform schema

This frozen contract fixes which bookmark-platform facts a campaign saves and which it derives, so every system that adds saved state writes against one schema and v4 keeps a single migration. FB.save.v4.validatePlatform accepts the optional fields described here; the registries that resolve their ids arrive with the systems that use them.

Envelope. platformSchema:2 sits beside authoritySchema:4 and requires state.start.revision. Supported schema 1, unstamped early v4 and v3 records without a world revision migrate to baseline and gain schema 2 on serialization. Present unknown schema numbers are rejected. A revision-bearing record cannot masquerade as schema 1 or as an unstamped legacy record. The World-revision compatibility section defines resolution and older-reader rejection. Changing saved-field meaning requires another explicit contract review and migration.

Saved facts:

- `state.start.era` and `state.start.geography` are stamped at creation from
  the bookmark, beside the unchanged `id`, `year`, `season` and `day`. A save
  without them takes them once during migration from its bookmark, when the
  bookmark declares them, and the next save writes them. A stamped value is
  never replaced, so a later edit to bookmark data cannot move a running
  campaign to another era or map.
- A realm's government form is saved, never read from current data. Realm
  records carry no government field. Creation stamps the campaign's default
  form as `state.start.defaultGovernment`, taken from the era default, and
  writes a row in `state.authority.governments` only for a realm whose form
  differs from that stamp. Creation seeds both from bookmark data, not from
  story code. A realm without a row resolves to the stamped default; a save
  without the stamp resolves it to `territorial`. A later edit to an era's
  default therefore cannot change a running campaign, and 867 and 1066
  campaigns, whose default is `territorial`, may omit the stamp and still save
  no authority records. A realm created during play takes the stamped default
  unless its creation chooses another form, such as its parent's, and writes a
  row. Migration never adds the stamp: existing saves resolve realms without a
  row as `territorial`, and deriving a different default would change them.
- `state.stories` is keyed by story id. Each value is the plain record of one
  registered story; a world story and a player track are separate keys (the 476
  pair is `western_court_476` and `federate_track_476`). Only a story's own
  start hook creates its record; restore never synthesizes one. A registration
  may provide `validate(record, state)`, which throws for an invalid record.
- Durable player and realm choices (offices, recognitions, contracts, customary
  rights and render receipts) stay authority records with their existing
  schema. Later choices that must survive a reload follow the same rule:
  semantic ids, status and turn stamps, no rendered text.

Derived, never saved: system availability, content roles, lexicon terms and
labels, climate zones and local season kinds, balance layers, wardrobe and
appearance, architecture style and currency labels, government strategy
dispatch and requirement-check results. These are recomputed from the stamped
era and geography, the realm's saved form and current data. The stamp, not a
snapshot of every derived rule, is what keeps a campaign stable. Any exception
must be listed here with its reason; there is none.

Stable id families:

- Bookmark: `FBDATA.bookmarks`, saved as `state.start.id`.
- Era: `FBDATA.eras`, saved as `state.start.era`.
- Geography: `FBDATA.geographies`, saved as `state.start.geography`.
- Government form: `FBDATA.governmentForms`, saved as
  `state.start.defaultGovernment` and
  `state.authority.governments[realmId].formId`.
- Government strategy: named by government-form data for each behavior slot;
  referenced by data and mods, not saved.
- Story: resolved by `FB.stories.get(id)`, saved as the keys of
  `state.stories`.
- System: `FBDATA.systems`; referenced by availability data, not saved.
- Start scenario: `FBDATA.startScenarios`; carried by start codes and the
  starting-rank progression record.

New ids in these families are lowercase slugs (`^[a-z][a-z0-9_]*$`); bookmark
ids keep their numeric form. Once an id has appeared in a released save, start
code or data file, it never changes and is never reused with another meaning.
Display names change through labels and the lexicon. Removing an id needs a
migration that maps it to its successor; without one, the save fails with the
specific error below.

Validation runs on the detached copy before state, RNG or the uid counter is
adopted, and again in the serializer so an invalid live state cannot replace an
accepted slot. A present id that its registry does not know fails with
"Unknown era", "Unknown geography", "Unknown government form" or "Unknown
story"; a registry that has not loaded knows no ids. A malformed field fails
with its path. `state.stories` and the legacy `state.situation476` cannot both
be present. Each registered story checks its own record through its validate hook, so a malformed story record also fails with its path, for example state.stories.federate_track_476.phase.

Migration from version 3 adds no authority, government, office, contract, right
or story record and no default government stamp; it only takes the era and
geography from the bookmark as above. Branch saves that still hold `state.situation476` move it, in the
detached copy, to the two 476 story keys and drop the old field, only when
neither key exists; other campaigns receive no story. The registry runs each story's migrate hook before validation, and the western court story performs this split: the household's own choices, bargain records and outcome go to state.stories.federate_track_476, and everything else to state.stories.western_court_476. A household that declined involvement made no bargain, so its contract and recognitions belong to the courts' record and an AI result reads as declined. Live 476 campaigns save only state.stories. Repeated
migration returns the same envelope, and repeated restore of one input yields
the same state.

The polity-foundation compatibility exception is unchanged: an older campaign whose own bookmark already declares a foundation can acquire its missing semantic pending record. This allocates no people, grants, wars, payments, RNG draws or uid values. Existing terminal outcomes and commitments are retained. Other newly authored stories are not initialized by restore or migration.

## Inherited resident family

Optional `player.inheritedHouseholdIds` is an additive array of dependent character
ids at save format 3. Succession captures the outgoing resident family before the
protagonist pointer changes, then retains eligible people through worker, office,
and loadout cleanup. It does not save rendered relationships or alter parentage.
Repeated handovers carry the same living dependents; independent marriages, ruling
households, vows, and explicit remote homes prevent management. Temporary bans or
abbey stays suspend management without discarding an otherwise resident saved dependency.
Resident inherited parents' posthumous children join the same roster.

Restore normalizes ids and derives a missing roster once from recorded predecessor
legends and their surviving resident spouse/child/grandchild links. A present empty
array is authoritative. Repair runs before equipment and education normalization,
consumes no RNG, allocates no characters, and preserves personal station and family
identity. Stale predecessor `self` tutoring clears on death; a living handover uses
the predecessor's actual id. Existing named tutors and accumulated learning remain.

## Personal household service

Optional `player.householdService` is a version-1 appointment for the current
`charId`, naming `employerId`, `officerId`, `provinceId`, `settlement` and `roleId`.
Its `status` is `active`, `review` or `ended`; a monotonic `serial` invalidates old
offers and cases. Numeric work totals, per-role `experience`, previously `held`
roles, literacy progress, the last paid turn, and an expiring labor-duty credit
are bounded to this one life. There is at most one pending case number, with the
next case's work threshold. No daily ledger, rendered office name or AI household
roster is serialized. A new appointment preserves personal experience; succession
deletes the entire record. Significant appointments survive in the life archive.

Restore leaves legacy saves without the field untouched, rejects malformed or
wrong-protagonist records, removes unknown experience/held keys, normalizes
counters and silently reconciles changed patrons/home/rank. A departed patron
suspends service pending explicit renewal. A temporarily invalid case can be
requeued under its original number when work becomes possible again. All editions
share this schema and lifecycle.

## Character life-history archive

Additive `state.lifeHistories` schema 1 keeps `{v:1, people:{characterId:record}}`
inside ordinary save format 3. Each record stores a detached `identity`, recording
start year, last touched turn, bounded `entries`, and played/preserved/paused or
condensed flags. Entries hold exact turn/year, a locale-neutral message descriptor,
and deterministic retention weights. English biography templates register at boot,
so saved entries render without a generated English catalog in every edition.
Historical title parameters use the existing `$title` snapshot; other proper
names and battle headcounts are frozen at the actual event boundary.

Detached identities carry `lifeIdentity:true` to bypass the ordinary character
wire compactor: their IDs and defaults cannot be reconstructed from `state.chars`
after court cleanup. They contain no live character references. Restoring validates
entry shapes and limits, derives played identities from the protagonist, legends
and Chronicle heads (including retired heads), and never recreates a full person.
Missing/unknown archives begin with identity summaries and no invented events.
History recording is suspended during load repairs so repaired titles are not
misdated as new achievements. Family/protection indexes remain transient.

The temporary family pool is capped at 128 biographies / eight highlights each;
50 manually preserved lives keep 32 each, with deceased and paused records still
counting. Played protagonists keep 40 each and grow only with actual played lives.
Only saves/exported save files contain these biographies; standalone Chronicle
JSON remains the existing news/choice artifact. See [characters](characters.md#life-histories)
for retention and recording scope.

## Freeholder establishment

Legacy foundlings with missing station are repaired from the recorded station of
their sole adopter, identified by a `childrenIds` link and absent biological
parents. Only living children without an explicit station or bondage marker are
eligible; biological children, ambiguous adopter links, and recorded statuses
remain unchanged. Repair does not invent parents, consume RNG, allocate ids,
or bump save format 3. Repeated restores retain the repaired value.

`player.freeholderGeneration` records the line depth at first freedom, using
the same genealogical comparison as `gentryGeneration`. A later-generation heir
may claim ordinary Gentry recognition; sibling succession cannot bypass it.
New Serf starts store null, new Freeholder starts store 1, and higher starts
store 0. Promotion out of serfdom records the live generation. The marker persists
through succession and save/load; demotion does not erase family history.
Older saves missing this additive field retain their existing Freeholder
eligibility. Already-funded settlement charters remain valid without retroactive
Gentry-generation checks. No save version changes.

## County progression saves (Phase 6)

The version-1 settlement lordship table gains optional `countyConsentTurn`,
`countyConsent:{[pid]:{countId,rulerId,superior,superiorRulerId,sponsorId}}`,
`countyClaims:{[pid]:[{characterId,dynasty,createdTurn}]}` and
`disputedCounties:{[pid]:{superior,acquiredTurn}}`. Recognition shares the existing
`player.cooldowns.petition_liege` counter. Claims remain after recognition and
follow their dynasty; disputed status follows the household's county ownership.

Ordinary war records may have `casus.type:'county_replacement'` and
`countyChallenge:{provinceId,countId,rulerId,dynasty,superior,justification,claim,
oldLiege,awarded?,finished?}`. Justification is sanctioned, claim or usurpation.
The awarded/finished flags prevent repeated grants and cleanup. The temporary
player campaign realm conveys no county at declaration and retires after a
non-winning peace if the household still owns no counties.

Explicit revocation stores the former record in
`revokedLordships:{['provinceId:slot']:lordshipRecord}`. Restoration resolves the
living holder or heir and preserves founder/dynasty/obligations, with source
`restoration`. Referenced displaced characters are retained for succession.
All additions are optional; no save-format or table-version bump is needed.

## Founding saves (Phase 5)

The additive version-1 lordship table now stores `foundingVersion:1`,
`foundingSerial` and `founding:{[provinceId]:project}`. Projects store `id`,
`status` (`building`, `complete`, `cancelled`), `playerHouse`, `provinceId`,
`sponsorId`, original `founderId`/`dynasty`, original `grantorId`/`grantorRealmId`,
reserved `settlement`/`site`, `funded`, quoted `prestige`/`piety`, `startedTurn`,
`dueTurn`, `lastTurn`, `pausedDays` and optional `completedTurn`. No rendered prose
is saved. Unique monotonic IDs reject stale cancellation/completion reviews.
Only one building project per household and county is permitted.

On first migration to foundingVersion 1, current automatic reveals are captured
as established floors before enabling capacity-only growth. Repeat loads never
reveal extra sites or charge again. Existing new-game bookmark sites are retained.
Daily progress extends dueTurn for occupation/siege. Completion revalidates all
requirements before changing visibility, conserved community partition, lordship,
seat, resources and rank; completed status prevents repeat rewards. Missing
requirements retain the paid project. Sponsorship follows the selected heir;
extinction cancels the project. Save format remains 3.

Phase 4 adds optional `lastDevelopmentSeason`, `grantCursor` and
`developmentCursor` fields to the version-1 lordship table. These bound and rotate
seasonal AI work and prevent repeated development after a save reload. Grant
reviews carry detached quotes; pending military events persist their exact grant
quote in context. Old title-only military offers cannot grant landlessly, and
retain their purse/decline alternatives. No save-format bump is needed.


## Settlement ownership foundation

Save format remains 3. `state.settlementLordships` is additive version-1 data:
`{version:1, counties:{[pid]:{established, lordships:{[slot]:record}}}, legacyBarony}`.
Phase 3 adds optional `accounts:{[characterId]:{gold,lastSeason,lastNet?,lastRevaluedYear?}}`
inside that same version-1 table for NPC baron treasuries. Accounts start at zero,
settle once per season, and follow hereditary succession. This is additive; no
save-format bump, back payments, RNG consumption, or new realm nodes are required.
Fiscal projections and building/capacity caches remain transient.

Only delegated lordships need records. Unassigned established slots derive their
holder from the current county holder; county ownership and realm arrays are unchanged.
Each record stores `holderId`, immutable `founderId` and `dynasty`, `playerHouse`,
optional `successorId`, `obligations:{charterId:'customary_service'}`, `grantedTurn`,
and `source:'grant'|'legacy'|'founding'`. There are no rendered names, fiscal caches, or realm
nodes for baronies. Slot zero remains the protected county seat.

`FB.ensureSettlementLordships` runs at new game/Observe and restore. Fresh starts
record existing settlement floors; Phase 4 separately grants an eligible
non-seat holding to a fresh territorial Baron. Restore without this
table preserves existing sites as direct holdings and grants an old territorial
player baron a non-seat manor/home slot, otherwise the first non-seat slot. Offices
(Castellan, Bishop, Chief Qadi, and papal office) are excluded. `legacyBarony` is
`none`, `granted`, or `unavailable`; the last case preserves custom one-site counties
without seizing their seat. Migration never charges, promotes, moves the household,
changes population/property, or consumes RNG. Repeat restore does not grant again.
Unknown future versions are preserved rather than downgraded.

Established floors are recorded on initialization, restore, development mutation,
wasteland materialization, and lordship assignment. Visibility reads do not repair
state. A development decline cannot conceal an established site. Existing investments
still contribute their original visibility floors.

NPC lordships pass to a saved living, free nominee, then the first living free
descendant found generation-by-generation, ordering siblings by birth and stable id.
Both parent pointers and adopted child links count. Extinction removes the delegation
so the county holder resumes direct rule. Player records wait at the death decision
and follow the selected playable heir, including retirement; a terminal heirless
death reverts them. Referenced holders, founders, and nominees are protected from
court compaction. Ownership indexes and revision stamps are transient.

This is Phase 2 of [the settlement plan](../plans/settlement-lordship-and-progression.md).
Capacity enforcement, fiscal settlement, building permissions, and grant/founding UI
remain on the existing systems until their respective integration phases.

Returning-player onboarding checks for existing saves after IndexedDB slot loading
completes, before enabling the title screen. Profiles upgrading without stored tip
preferences therefore retain veteran status even when their only save is in IndexedDB.
Existing explicit tip preferences remain authoritative.

## Ruler justice records

Save format remains 3. Optional `state.justice` contains `offenses`, arrest
`cooldowns`, arbitrary-action cooldowns, `exiles`, one stamped player `pending`
response, a monotonic `nextId`, the last AI season, and one `last` receipt.
Records contain identifiers and numeric terms, never rendered prose. Restore
repairs invalid/dead records without replaying penalties or rolling sentences.
Judicial rows in `state.intrigue.captives` add `authority`, `endTurn`, `offenseId`,
`unjustPaid`, `sentenced`, and `sentenceIds`. They inherit with authority; private
abductions retain their existing generation cleanup. Old legal custody and
campaign-stamped captivity are readable without inventing a captor for an
ambiguous prison flag. Legacy hearings become cases and require custody before
a new response event can lead to sentencing. See [justice](justice.md).

Converted wastelands persist in additive `state.wastelandSettlements`, keyed by
county id with the founding `culture` and `religion`. Restore reapplies their
physical map status and deterministic sites before other county repairs, without
replaying costs, grants, development, population or news. Format stays 3.
Legacy saves without the table recover authored wastelands with positive saved
development and a holder/owner; saved population identity supplies culture/faith,
falling back to the saved protagonist when older records lack that identity.
Bookmark activation and new politics clear cached conversions; each loaded save
then applies only its own table. Ownership and population remain authoritative
in their existing saved records, including after conquest or succession.

War-event supply refills use the host's existing saved `supply`. Optional war effect
records add `target:'provisions'`, `provisionsDelta`, and `hostId`; existing effect
records retain their meanings. Resupply may retain an optional `supplyRetreat` county
beside `supplyStop` and `supplySearchTurn`, revalidated before reuse and cleared with
manual control or completion. No save version changes or replayed historical rewards.

Deleting Autosave (or all slots) suppresses background-only saves for the same
in-memory life and turn until play advances or a normal autosave resumes saving. Reload or tab hiding cannot
immediately recreate a deleted slot. This suppression is transient.
War repair retains hosts belonging to a live rebellion even without an ordinary
campaign; rebellion repair remains responsible for validating their records.

Stage 4 transfers do not replay history or rebase balances. In-flight cash gifts
remain prepaid; successful delivery credits the ruler and marks `treasuryDelivered`
before removal. Failed deliveries retain their existing refund. Ransom demands keep
their saved amounts; unaccepted war invitations reprice against live funds. Event
contexts may retain `treasuryPaid` or `treasuryGoldPaid` to prevent cash-choice replay.

AI realms add `treasury` version 1: signed `gold`, nonnegative `militaryAccrued`,
`lastSettledSeason`, `lastRevaluedYear`, one `lastSummary`, and `retired` with an
optional bounded retirement receipt. `state.treasuryAccounting` records version,
`mode:'active'`, once-only batch/season stamps, and legacy diagnostic `pendingPlayer`.
Initialization occurs at new-game/Observe creation and restore, not from UI reads.
Old saves receive one opening reserve, not historical revenue; subsequent repairs
preserve signed balances. Newly formed institutions get transfers, not opening grants.
No save-format bump is needed. Activation rebases diagnostic accounts from current
fiscal opening reserves or saved purse coin (whichever is larger), clears accrued
diagnostic bills and pending inheritance, resets stamps, and deletes old purses.
Future inheritance transfers signed net coin to the player once.

Stage 3 adds numeric treasury `necessary` (latest fiscal upkeep/dues estimate),
`shortfallSeasons`, and optional `recoverUntil`. Initialization refreshes the expense
estimate and preserves recovery and balances; new seasonal settlements replace it.
Military commitment projections and failed-quote retry records are transient.
New AI cohort batches add `funded:false` until the training payment succeeds;
`funded:true` and the new completion deadline then persist. Missing flags on existing
batches mean grandfathered training, never retroactive charges.

The logistics record adds `producers` (period and frozen uid/county/output/income
shares plus starting withdrawal offsets), signed `producerPending`, and one
`producerLast` gain/loss summary. Reload preserves these records; missing snapshots
start from current withdrawals so old sales are never replayed.

`state.armyLogistics` is additive: shared AI provisioning `purses`, current county
withdrawals in `counties`, and one completed period in `last`. Purses retain gold,
allowance and the funded season to prevent reload funding. County records retain
bought/taken units, payments, dues and the current day's loading use. Hosts retain
only their most recent numeric/id-based `provisioning` receipt and optional resupply
destination/retry turn. Old saves initialize lazily without replaying past spending
or withdrawals. Browser-local `fb_automation` adds `buySupplies` (true) and
`supplyTarget` (75, clamped 25–100). Save format stays 3.

No-claim escalation adds `realm.aggressionDeclarations` and each declared war's
`aggressionSequence`. They are positive integer counters, independent of ruler
generation; old saves default to no counted declarations. County modifier records
may carry nonnegative integer `supportStacks`; definitions with `supportPerStack`
use it for the Popular support effect. These additive fields use the existing
save format. Loads preserve them without replaying declaration penalties.

Historical ambitions add `state.historicalAmbitions`, keyed by stable definition
ID. Each entry is either `{established:true}` for a bookmark foundation or
`{realmId,turn,endTurn,cost:{gold,prestige,piety},prestige}` for a completed action.
The seasonal AI guard is `state.historicalAmbitionSeason`; realm records may carry
`ambitionTitleRegion` for qualified primary-title preference. All are additive
save-format-3 fields. Initialization uses `state.start.id` (legacy default 867),
not the current year, and never grants retroactive rewards. Existing completion
records survive succession and reload. Dynastic absorption transfers the realm
identity; dissolution shortens the reward deadline without removing completion.
Queries never initialize records or consume RNG. See
[historical-ambitions.md](historical-ambitions.md).

Campaign telemetry provenance is additive save-format-3 state. Fresh playable campaigns carry
`state.telemetry:{version:1,quickStart,firstDayAdvanced,firstEventResolved}` plus
`startingLocation`, `startingCulture`, `startingReligion`, `scenario`, and `familyPreset`. `quickStart` is the
stable curated-start id or `custom`; the two numeric booleans prevent campaign-once activation
events from repeating after save and resume. Older or malformed records repair without RNG to
`quickStart:'unknown'` with both activation markers already complete, so an established life is
never misreported as newly activated. The record contains no player name, dynasty, seed, or
rendered text and survives succession with the campaign. Original setup IDs accompany later
events, including resume and active-play milestones. Missing setup details are recovered from a
valid saved start code matching the campaign bookmark, using its original bookmark county and
optional community choices, never the current heir or county. Invalid or bare seeds leave those
fields absent; start codes cannot prove quick versus custom provenance, so `unknown` stays honest.

Restore treats the serialized world and player records as the critical save core. Additive
format-3 subsystem repairs run as isolated stages: if one legacy record cannot be repaired, its
failure is retained in `FB.save.lastRestoreWarnings` and later repairs still run. Continue also
isolates noncritical career, enterprise, travel, focus, map-position, notification, and telemetry
wake-up work in `FB.game.lastLoadWarnings`, so one optional subsystem cannot strand the loader or
reject an otherwise readable life. A structurally unreadable core still returns to the title and
the recovery modal names both the failed stage and browser error for mobile diagnosis. The stored
slot or imported source remains unchanged by a failed attempt.

Persistent serf tenure is additive save-format-3 data (`state.player.tenure`).
`FB.ensureSerfTenure` lazily creates or repairs tenure records on older tier 0 saves without
consuming RNG or bumping save format 3:
- Schema fields: `{ version: 1, status: 'active' | 'closed', provinceId, settlement, archetypeId, formedTurn, formedBy, lastPresentedSeasonKey, nextDutyId, nextDutyTurn, nextDutyConditional, nextDutyIndex, nextWarCheckTurn, duties: [{ id, eventId, nextDueTurn, lastResolvedTurn }], conditional: [{ id, eventId, nextEligibleTurn, pendingTurn, lastResolvedTurn, currentWarId, marriageTurn? }], rights: [rightId] }`.
- When closed on promotion or manumission, `status: 'closed'`, `endedTurn`, and `endReason` are preserved.
- Unknown optional duty, conditional-duty, and right IDs remain harmless save data and are ignored by scheduling and display.
- No rendered text, active calculations, or volatile references enter serialized state.

Optional `player.flags.hint_serf_*` acknowledgements are per-save booleans. They record only that
tenure, first-duty, offer, freedom-route, or lawful-freedom teaching was seen and never gate a
mechanic. `FB.serfOnboardingState` derives eligibility, while affordability, localized lessons,
Rank & Realm markup, and its presentation signature remain transient. These additions and the
deterministically repaired nearest-duty cache retain save format 3. Because tenure belongs to the
household, these acknowledgements survive protagonist succession with an inherited active tenure.

The same version-1 tenure additively stores `revision`, a bounded eight-entry
`transitionHistory`, `transitionEligibleTurn`, and an `authorityCheckpoint` containing
semantic ids, ruler generations, and faith/culture classifications. Missing fields repair
to revision 0, empty history, and the first read-only current authority snapshot without
manufacturing an event. At most one `player.tenureTransition` stores a protagonist and
tenure stamp, earliest old and latest new authority, canonical causes, a deterministic
proposal, witness id, cooldown eligibility, and queue revision. It contains no copied
names or rendered prose. Mechanical amendments advance the tenure revision; confirmation
does not. Freedom, relocation, or tenure replacement clears it, while protagonist
succession preserves tenure terms and history but clears the personal review and resets
the authority checkpoint for the new head. Save wrapper format remains 3.

The same version-1 record supports all seven core archetype ids, including the additive
`pastoral_steppe`, `woodland_dependence`, and `norse_coastal_service` definitions. It does
not persist a second selector snapshot or contextual work text: the chosen archetype,
resolved duties, rights, home, settlement, and formed turn are sufficient. Known active
Phase 1 records remain byte-stable and authoritative after load and render; conversion,
controller change, live development, settlement promotion, and catalogue updates do not
silently reselect them. Legacy tier-0 saves without tenure still select exactly once
through the existing repair path. Save format remains 3 and tenure version remains 1.

Tenure-scheduled queue context may additionally contain `tenureArchetypeId`,
`tenureProvinceId`, `tenureSettlement`, and `tenureVariantId`. These semantic snapshots
are additive to the legacy `archetypeId`/duty context and contain no rendered prose.
Older queued events remain valid through the legacy fields; newly snapshotted fields, when
present, must match exactly or the event expires before effects.
New ordinary duty contexts and freedom offers also carry `tenureRevision`. A missing
revision is compatible only with an active revision-0 tenure; a later amendment expires
the older context atomically.

Freedom bargaining is also optional additive save-format-3 state. At most one
`player.freedomOffer` freezes version, status, source, term id, protagonist and lord ids,
tenure/home identity, Standing threshold, base cost, exact price, service days, creation,
expiry, and cooldown turns. Accepted service additionally freezes acceptance, paid-price,
and completion turns. `FB.ensureFreedomOffer` fails malformed records closed without
recalculating terms or consuming RNG; the removed `flags.freedom_promised` becomes a
one-use invitation and never an offer merely because a save was loaded.
An offer created with local support additively stores
`advocacy:{characterId,role,standingRequired,standingAtCreation,bonus}` plus the actual
lord and effective Standing snapshots. It stores no supporter name or rendered term prose;
older unsupported offers remain valid. Acceptance either revalidates that exact living,
local, non-hostile role holder at the saved threshold or accepts because current lord
Standing independently reaches the saved term.

Exact event participants remain ordinary JSON-safe event context:
`ctx.participants` maps at most four declared slots to character ids, while optional
`ctx.participantKinds` stores normalized source enums. Restore and legacy queue repair bind
only missing slots once; an existing invalid id is never rerolled or replaced. Participant
events also carry the existing protagonist and location snapshots, so succession and
relocation expire an old pending decision.

Two bounded current-life serf records are also additive save-format-3 state.
`player.serfStory` stores the active Old Custom stage, protagonist, home, tenure stamp,
lord, exact lord/officer/witness ids, participant kinds, and at most one pending officer
replacement. `player.serfNeighborConsequence` stores one shifted-quartering neighbor and
officer with creation/due turns and a queued bit. Malformed records fail closed. Promotion,
relocation, tenure replacement, authority loss, or succession clears the applicable
records; succession does not copy their Standing or identities to the heir. No save-wrapper
version or migration is required. Succession retains only the existing
`player.fired.old_custom_stakes` marker from the otherwise life-local fired ledger, making
the Old Custom a once-per-household landmark. Old saves already carrying that current-life
marker gain the same protection without changing their serialized shape.

`player.familyFreedom` is a bounded locale-neutral landmark: `first` records the first
serf-to-free transition, and `firstLawful` is permitted only when `first` was flight.
Records contain route, lawful flag, character/lord/home ids, turn/year, price, service,
and optional term id—never rendered names, dates, or summaries. Restore validates the
optional object but invents no history for an older freeholder save. The household object
preserves this landmark and paid final service through succession while an unaccepted
personal offer becomes invalid.

Phase 4E action capabilities add no serialized state. A `resource_choice` deed picker is
only a generic-modal view: opening, cancelling, mobile Back, saving, or reloading before
confirmation leaves no pending-action record. Confirmation completes synchronously through
the ordinary declarative-deed transaction and stores only its established cooldown and
resulting gameplay changes. `fallback_focus` stores the same stable current focus id as any
other focus; its fixed score remains effective mod data protected by the active-mod
fingerprint. Save format stays 3.

The item shop and legendary artifacts are additive save-format-3 data, both lazily
ensured without a version bump. `state.player.shopStock` holds the current seasonal
stall record (`{pid, kind, seasonKey, offers:[{ref, price}]}`); its materialized
ordinary offers live in `state.itemInstances` like any exact instance, and unsold ones
are discarded when the stock rerolls. `state.artifacts` maps a claimed artifact's
definition id to `{found: turn}` and deliberately survives succession, giving each
legendary object its once-per-save guarantee; whether a claimed artifact is held, lost,
or gone is derived from `FB.itemOwner` at read time, so no second stamp can disagree
with actual ownership.

Fortifications are additive save-format-3 data. A county's settlement-scoped `walls`
record is `{s,id:'walls',level,targetLevel?,completeTurn?,maintenanceGraceUntil?,ruined?}`;
active siege records independently snapshot that level as `fortLevel`. `FB.repairForts`
normalizes old bare ids, converts legacy Walls to level 3, adds four seasons of old-rate
maintenance only when the player already holds them, and performs the one-time AI-seat
seed behind `state.fortMigration`. No rendered fort, project, or siege prose is saved.

County population is additive save-format-3 data. Its subsystem schema is 2:
`state.population = { schema: 2, lastYear, counties: { [pid]: { count, natural,
migration, losses, communities, identity, communityChange, communityProjects?,
settlementCommunityProjects? } } }`.
`communities` holds
positive integer `{culture,religion,count,bySettlement?}` cohorts whose counts sum
exactly to `count`;
`identity` caches the independently dominant culture and faith plus `cultureSince` and
`religionSince`; `communityChange` stores only the last annual faith-conversion and
culture-assimilation totals. `communityProjects`, when present, contains at most a
`faith` and a `culture` record with `{target,sponsor,startTurn,policy,progress,converted,
resistance,lastTransfer,lastYear}`. Projects store ids and bounded numbers, never
percentages or rendered demographic prose; malformed projects are dropped by ordinary
population repair without advancing the subsystem schema.

`FB.populationSaveDiagnostics(state)` is a read-only development aid that reports the
serialized population byte count and counts of counties, live community records, maximum
county diversity, materialized settlement cohorts and cells, and active projects. It stores
nothing in the save. Settlement matrices remain lazy and are compacted when they again equal
the proportional county projection.

The existing `state.agency` object may also hold the numeric
`lastCommunitySituationYear`. It is a global pacing stamp for rare community situations,
not population history or rendered prose, and missing legacy values simply mean no prior
situation cooldown.

`bySettlement`, when present on any community, is present on every community and uses
the county's stable visible settlement-slot order. Each array sums to its community
count, and each slot across all arrays sums exactly to the existing weighted settlement
population. The complete matrix remains absent while it would be identical to the
county-wide proportional projection. Settlement-specific conversion or a local project
materializes it; deterministic repair and building/development reconciliation preserve
both axes, and a project-free matrix that returns exactly to the projection is compacted
away. `settlementCommunityProjects` is keyed by settlement index and holds the same
optional `faith` and `culture` project records as the county-wide map. No names,
percentages, rendered prose, or derived identity cache is added per settlement.

`FB.ensurePopulationState` lazily backfills older saves or fresh game states without a save-wrapper version bump:
- Baseline populations scale proportionally with current development and standing building capacity bonuses.
- Restored counts enforce `populationFloor` (1000) while preserving an established
  county's population above or below its current carrying capacity.
- Fresh and schema-1 county totals are partitioned from the active bookmark's reviewed
  basis-point shares by stable largest-remainder rounding. A legacy unweighted
  multi-community list assigns the whole simulated population to its principal pair.
- Schema-2 repair merges duplicate valid pairs, removes invalid or non-positive records,
  and assigns the exact residual to the authored principal community. Culture ids resolve
  through `FBDATA.cultures`; core, modded, and campaign-founded faith ids use the normal
  `FB.faithExists` / `FB.faithAssignable` path.
- Migration happens from the save's current date and count. It never replays demographic
  history that the older save did not record, consumes no RNG, and is idempotent and
  byte-stable for identical input.
- Annual simulation records `natural`, `migration`, and `losses` per county.
- Ordinary population writers proportionally apportion exact integer changes by stable
  largest remainder. Targeted policies may select one culture, faith, or exact pair.
  Migration and settled-captive transfers remove and add the same exact cohort records;
  no transient edge allocation is serialized.
- Live community readers return detached projections and never repair state as a display
  side effect. No transient calculations, edge allocations, or prose strings enter
  serialized state.
- Full-world repair runs at initialization, restore, and the annual population boundary.
  Ordinary population reads use the already-authoritative county count, while targeted
  writers repair only their source and destination records. Market-scale reads therefore
  remain O(counties), and a single county mutation is not amplified into a world repair.

Focused storage coverage measures fresh 867 and 1066 states against their schema-1
projection, then stress-tests a mature shape with six live pairs per county, settlement
matrices in every fourth county, and four AI-sponsored projects. Fresh community state stays
below 200 KB; the deliberately dense mature projection stays below 900 KB added and 2.5 MB
total. A materialized county adds only its community-by-slot integer cells and optional
project records; unmaterialized counties serialize no settlement cache.

Fort lookup caches (`byCounty`, `bySite`, active projects) are module-private derived
state. Repair or an external data merge rebuilds them; construction, demolition, and
completion update them in place. They never enter serialization. AI realms add the
compact `fortWorks` balance, `fortWorksYear` annual-accrual guard, and `fortProjectYear`
start guard. Projects and completed forts remain on the county record, so ordinary
succession and `FB.transferProvince` naturally preserve them without a second ownership
field or a save-version bump.

Exceptional sibling courtship is additive and retains strict save format 3.
`state.siblingCourtships` is a pair-keyed map (`lowerId|higherId`) whose compact
records keep initiator/target ids, accepted/refused/cooldown/married status,
illicit or xwēdōdah route, approach/acceptance/cooldown turns, seasonal
exposure clock, and public-exposure flag. Restore supplies an empty map to old
saves, removes malformed or missing-character records, normalizes route and
exposure fields, reconciles a current-player accepted record with the live
courtship, and expires completed cooldowns without RNG. A child born to
sibling parents may carry locale-neutral `closeKinParentage` provenance with
degree, parent ids, risk, and a neutral `none` or rolled outcome; older
children simply lack the field.

Eager royal courts are additive and keep save version 3, and the bump would be actively
harmful rather than merely unnecessary: both `S.read` and `S.parseExport` gate on
`d.v === 3` by strict equality, so raising it to 4 would make every save written after
this change unreadable by every build before it. Every addition is either defaulted or
derived. `member.role` is absent on older saves and reads as "child or collateral", so
no migration step is needed and none should be written; old saves grow their ruler
records through `FB.ensureDynasticState`, already called on restore. A save written now
stays readable by an older build, but degrades: court members that are not reigning
rulers fall back under that build's player mortality loop, compaction does not run, and
a consort with a null `parentId` can be read as an heir where there is no `role` concept
to exclude it. The same ensure pass treats a dead current ruler as a succession repair,
whether the full dead record was retained or already compacted; it advances and eagerly
loads the living successor instead of resurrecting the old member or waiting for a
yearly mortality roll. That repair updates the throne and generation-stamped alliances
but suppresses diplomacy-story queuing and live household-loadout reconciliation, which
are in-play succession side effects rather than load migrations.

The non-yearly dynastic ensure pass repairs old generated `gN_heirN` fallback
members whose recorded parent was younger than sixteen at their birth. They
become siblings through that parent's recorded parent only when the ancestor's
dates permit it; otherwise they become parentless collaterals. Both compact
parent/child links and the corresponding full-character links are reconciled.
Character ids, names, dates, skills, descendants and succession order are kept.
Explicit births and adoptions are outside this repair. It consumes no RNG or
uid, adds no migration field, and is idempotent; the ordinary yearly frontier
does not scan historical members for it. Save format remains 3.

Death compaction captures its retention answer before relationship cleanup and may
reuse the year pass's family snapshot. In addition to direct player relationships,
roles, attention, travel, offices, equipment, and genealogy, a court record is retained
while it parents a living player descendant. Papal sanction grounds are transient
character-keyed state and are deleted when that character dies rather than preserving
an otherwise stale id.

**The reigning-ruler index must not live on `state`.** `S.serialize` writes `state`
through a lossless compacting replacer, but a `charId → realmId` map hung there would
still be pure derived bloat at roughly the full court population. It is module-private in
`js/world.js`, rebuilt by `FB.ensureDynasticState` on both new game and load, and
verified on every hit. The family index behind `FB.kinOf`, `FB.spousesOf`, and
`FB.stepchildrenOf` is derived in the same way and lives in `js/model.js`; it is keyed
on the turn as well as on an explicit stamp the family writers bump, so a writer that
forgets `FB.touchFamily` costs a card that is stale until tomorrow rather than one that
is wrong forever.

The version-3 wire form omits only reconstructible fields. Object-map keys supply realm,
character, and court-member ids; a derived `ro_*` court-character id restores its matching
`royal_*` lineage member id; canonical member `parentId` rebuilds `childIds`; and
death years distinguish dead members from the omitted live default. Common null, zero,
true, health-8, and empty-array/object defaults are restored explicitly. A building with
an omitted settlement index belongs to the head settlement (`s:0`), matching the legacy
projection. National `exposed` contains only technologies not already in `completed`,
because completion implies exposure, and empty technology work containers are recreated.
Restore also gives an existing landed player realm its one-time regional historical
technology seed when the record predates that realm-formation repair, preventing an
independent ruler from loading with an empty construction catalogue.
The succession `heirId` is omitted when it exactly matches the first id in canonical
`order`, then restored from that order at the load boundary.
`S.restore` expands the full live shape before the ordinary ensure chain, so uncompressed
older version-3 saves pass through unchanged. The replacer never mutates running state.
It also gates record-shape detection by the small set of keys that can actually be
omitted: ordinary properties pass straight through instead of testing whether their
holder resembles a character, realm, court member, building, and technology record.
This keeps the wire form identical while bounding the per-property work of routine
seasonal snapshots.

New characters carry health 8 from FB.makeCharacter before serialization, including religious officeholders. Compaction can omit that default and restore it without changing the live character's health facts. Explicit nondefault health remains on the wire and survives restore. The 1066 inhabited-terrain specification covers fresh defaults, injured characters and compact health restoration in both ordinary and CrazyGames distributions, alongside the retained baseline and governments_v2 whole-character preservation checks. The save format and legacy inflation default are unchanged.

**The ensure chain on load is not RNG-protected, and court materialization consumes
randomness.** `S.restore` sets the saved RNG state and then runs the whole chain; only
`FB.ensureStepRelations` saves and restores the stream around itself. Court generation
therefore runs on its own scoped stream (see [seeds.md](seeds.md)) rather than relying
on the chain, so the first load of an older save cannot consume thousands of rolls and
hand that world a different future than the same save on the previous build, and a
save-load-save cycle cannot diverge from an uninterrupted session.

Catholic elective state is additive and keeps save version 3. `state.papacy` stores
`obediences`, full-character Cardinal office records, elections and ballots,
`realmObedience`, sovereign investiture policies, per-obedience excommunications and
grounds, compact dead-Cardinal `archive`, regnal-name counts, and temporary dynastic
`custody` for a player Pope. `FB.ensurePapacy` lazily creates the structure, recognizes
the current Catholic territorial head's ruler as the incumbent, and generates a
bookmark-appropriate College without replacing that Pope mid-reign. Missing nested
collections repair independently, so a version-3 save may wake during a vacancy,
conclave, schism, policy demand, or Papal player handoff. See
[papacy.md](papacy.md).

Personal Bishopric state is also additive at save version 3.
`character.bishopric` stores only JSON-safe office identity:
`{seeProvinceId,appointedTurn,previousTier,appointerKind,appointerId,investiturePolicy}`.
`character.bishopricVacatedTurn` prevents a returned see from being recreated by legacy
rank compatibility. `FB.bishopricOf` lazily gives an old terminal Catholic rank or
`player.flags.bishop` a home-county see, while an old player Pope is marked vacated.
Ordinary death succession and Papal elevation release the office without transferring
its abstract see, revenue, or retinue to the dynasty.

Faith-fracture state is additive and keeps save version 3. `state.faiths` maps generated
ids to the same JSON-safe definitions used by `FBDATA.religions`;
`state.faithRelations[observerId][targetId]` stores directional relationship changes;
and `state.faithNextId` supplies deterministic generated ids. `FB.ensureFaithState`
initializes `{}`, `{}`, and `1` when those fields are absent, then restore recompiles the
effective graph before any character or office repair. An old version-3 life therefore
means “no generated faiths,” while a new life preserves its non-historical sects. The
derived graph, lineage, and property-source maps never live on state. See
[religions.md](religions.md).

Compiled faith and culture lookups first check the state, identity-table reference,
and revision. Repeated reads reuse the effective graph without enumerating generated
identities. Replacing a table, reforming an identity, loading a save, or invalidating
mod data rebuilds the relevant graph, including transitions from an empty table.

Culture-reform state follows the same additive pattern at save version 3.
`state.cultures` maps generated ids to parent-plus-override records, while
`state.cultureNextId` supplies deterministic ids. Restore supplies `{}` and `1` to old
lives before recompiling the effective culture graph. Authored culture data remains in
`FBDATA.cultures`; compiled lineage, source maps, and territorial doctrine shares are
derived only. Returning the player's last doctrine departure moves that character to the
remembered parent id without aliasing or rewriting the saved child. Character, realm,
community, and project references that already use the child remain valid and retain its
saved doctrines until explicit conversion changes them. New doctrine children carry an
additive `doctrineBranch:true` marker;
the deterministic v1.172.0 id/name shape remains recognized for saves made before that
marker. See
[doctrines.md](doctrines.md).

Religious-head state is additive and keeps save version 3.
`state.religiousHeads` maps a stable `head.officeId` to a realm id or to `null` for an
explicit vacancy. The built-in office ids equal the old Catholic and Sunni religion ids,
so old saves need no key migration. New games seed missing entries from optional
`bookmark.religiousHeads`, falling back to the effective head's `realm`; this lets
867 and 1066 use different canonical realm ids. `state.religiousHeadVacancies` maps a
vacant office id to `{turn,formerHolder}`, where `formerHolder` is the old realm
id. The turn gates delayed AI recovery and is never reset by repeated cleanup.

`FB.ensureReligiousHeads` performs additive repair on restore. It preserves a living
assignment, explicit vacancy, or later reassignment; adds a bookmark-aware default when
the key is absent; and repairs the specific old-1066 signature where the missing global
867 default was saved instead of the living bookmark realm. Any other mapping to a
missing/dead realm silently becomes a saved vacancy stamped at the current turn. Realm
death performs the same conversion before the realm is marked dead and emits the notice
once. The ordinary JSON
snapshot/export round trip preserves both maps unchanged, so an unresolved vacancy can
persist indefinitely without raising save version 3.

Player title snapshots retain the legacy `group` and `tier` fields and may add
`religion`, `titleReligion`, `titleSex`, and `word`. The source faith selects the stable
catalog key and `word` is its English fallback, so metadata from a generated faith can
render even before live state is restored; an old snapshot still renders through
`FBDATA.titles`. Head snapshots likewise add source-faith and English fallback fields.
A snapshot records the office and title held at that moment; rendering it later does
not consult the live assignment.

Generated realm names in durable message parameters use an additive $realmName snapshot with realmId, kind and proper place, plus a term record containing its catalog key, English text and capitalization when the style is a title level. The record contains no rendered translation and requires no live realm to display. Guild monopoly grantorName and grantorRulerName fields also accept this typed parameter alongside their legacy proper-name strings. Message cloning, Chronicle archives, ordinary restore and typed title migration preserve these records without changing save version 3.

Dynastic diplomacy is additive and does not change save version 3.
`realm.succession` holds lightweight royal members and a ruler-generation identity;
materialized children and rulers point back through `char.royalLine`. Materializing a
founding ruler may add the current `rulerMemberId` and reparent existing root children
without changing their member ids or order. A materialized current ruler also carries
`realmStanding`, the last synchronized Standing marker.
`state.alliances` holds canonical, generation-stamped defensive realm pairs.
`player.royalCompact` identifies the current protagonist's one royal marriage compact,
and `player.fabricatedClaim` holds the single `{pid, madeTurn,source?}` county claim.
An auctioned title right uses the existing field with `source:'auction'`; it follows the
normal fabricated-war and conquest-clear path rather than creating a second claim slot.
`player.auction`, when present, is one unresolved household market record
`{schema,status,startedTurn,venue,lot,openingBid,bidIncrement,rivalMaximum,currentBid,bidCount}`.
Its lot and rival ceiling are already fixed, so restore validates or discards it without
consuming RNG. Both records are additive and keep save format 3.
`player.war.casus` records the semantic cause selected for a new war. Ordinary wars may
also carry a compact `eventId`, allocated from additive `state.warEventSerial`, so queued
operational-event contexts cannot cross peace into a later war. An older active war
receives the serial lazily when it next enters war footing or queues an operational
event. Its additive `occupationEventQueued` bit records that the first qualifying siege
position has already produced its player-facing occupation story, preventing repeated
arrival events in the same war. Neither field needs RNG or a save-version migration. A displaced rightful character may
carry one `restorationRight`. Compact `player.war.battles` entries may add
`primaryHostInvolved`; absence reads as true for legacy and abstract battle records, while
false marks a detached-host result that must not apply protagonist consequences.
`FB.ensureDynasticState`,
`FB.fabricatedClaimOf`, and the normal load repairs lazily initialize and validate all
of these fields, so older version-3 saves require no migration.

`player.aggressiveWars` is another additive current-ruler field. It contains compact
semantic `{turn,charId,enemy,target}` declaration records, never localized prose or
derived costs. `FB.aggressiveWarHistory` is a non-mutating filtered projection over the
configured recent-war window; the next confirmed declaration is the sole compaction
writer. A missing or malformed collection reads as empty, so old version-3 saves remain
valid. Protagonist succession clears the collection alongside personal diplomacy and
Standing. The resulting county consequence uses the existing
`state.modifiers.county[provinceId]` save contract and therefore needs no war-specific
storage or migration.

`player.militaryCommand` is an additive current-protagonist field and keeps save format
3. While active it stores only `{charId,patronRealmId,sovereignRealmId,startedTurn}`;
eligibility, host existence, war status, command bonuses, and presentation are derived.
A missing field means no command. The army tick discards stale records without RNG, and
protagonist succession clears the record with other lifetime war service. A winning
field battle clears it before queuing the semantic barony event context, so save/load
cannot award the same victory twice.

Targeted plots persist their selection in `player.plot.context` (for claim fabrication,
`{pid}`). Discovery and final resolution both receive this stored context, so
save/export/import cannot silently retarget a plot in progress.

**Game state is one serializable object** (`FB.state`), created in `js/main.js`. Political
ownership lives in `state.owner` / `state.holder` / `state.dev` / `state.realms`, not in
world data. `js/save.js` snapshots `FB.state` + RNG state + uid counter to localStorage;
the raster is rebuilt deterministically at boot, so saves only reference ids. Every browser
storage key and the save database name pass through `FB.storageKey`, which is the identity
except in a branch test build, where it adds that build's `@<branch>` suffix (see the test
builds section of `docs/deployment.md`).
`state.start:{id,year,season,day}` identifies the bookmark and campaign origin. Loading
first inspects that field, activates the matching complete world, and only then restores
state and RNG. A missing field means the legacy 867 bookmark, preserving every old
version-3 slot and export. A bookmark hidden from new-game choices by an incompatible
legacy map mod remains addressable for a matching stamped save.
Saves are version 4, with explicit migration from supported version-3 lives;
older and unknown future envelopes are rejected. The format is independent of
the displayed `FB.VERSION` (see [../VERSIONS.md](../VERSIONS.md)). Normal restore
validates a detached copy before adopting state, RNG and the uid counter. Missing
bookmark or typed title references, a different mod fingerprint, and malformed
authority data produce compatibility errors without modifying the source save. A boot-time probe (`S.available`) detects browsers
that refuse localStorage outright (iOS in-app webviews, blocked cookies) so the UI can
warn instead of failing silently; ephemeral storage (private mode, third-party-iframe
eviction) passes the probe. For those, `S.exportState` / `S.parseExport` carry a life
as compressed base64 text (`FBS2.` prefix, v4 payload). Save Game downloads that
payload as a `.txt` file, and Load Game reads it with `FileReader` before waking it through
the same `G.loadData` path as a slot load and planting it back into the autosave slot.
The visible text and paste path remain as fallbacks, and the legacy uncompressed `FBS1.`
form remains importable forever. The ☰ menu's
🐞 Report-a-bug dialog (`UI.showReport`) reuses that export: the copied report bundles the
player's description (bug or suggestion) with `FB.VERSION`, `state.seed`, the mod signature,
and the current life as `FBS2.` text, so a reported moment can be reopened exactly through
Load save file's paste fallback.

The title-screen Chronicle Library can inspect the autosave, any manual slot, or an exported
`.txt` save without restoring it. `S.chronicleFromSave` inflates only the detached object returned
by a slot read or export parse, adopts a legacy compact journal there when needed, and expands it
through the ordinary Chronicle artifact path. It never assigns `FB.state`, restores RNG or uid
state, activates the save's bookmark, writes storage, or otherwise resumes the campaign.

Management protections are additive player state at save format 3:
`player.protections[scope]` is an array of stable string ids. The built-in scopes are
`grantCounty` and `autoBuildCounty` (province ids), `equipmentItem` (exact item references),
`grantSettlement` (`provinceId:slot` identities),
`educationCharacter`, `matchCharacter`, and `staffingWorker` (character ids),
`researchTech` (technology ids), and `councilRealm` (realm ids). `FB.protectionIds` and
`FB.isProtected` are read-only and return an empty view for missing or malformed old-save
state; only `FB.setProtected` creates, adds, removes, or deletes an empty scope. The registry
belongs to the continuing household and survives succession and every ordinary save/export
round trip. It stores no labels, prose, derived plans, or object snapshots. Unknown scopes
and stale ids are inert, preserving mod and old-save compatibility. Each consuming assistant
defines the exact advisory effect; manual actions remain available unless that action's own
ordinary rules block them.

**The save must fit the localStorage quota beside its siblings** (~5 MB per origin on
WebKit/iOS, ~10 MB elsewhere — shared by the autosave and all three slots; a serialized
character record is ~400 bytes). Court records are map-bound by the eager-court
compaction; with the bounded county-community table, the simulation-state budget before
complete Chronicle growth is about 1.8 MB. The player's wider family
is bounded at creation instead, because dead kin are never pruned (the family tree is
the product). Two balance knobs do the bounding
(see [../MODDING.md](../MODDING.md)): `kinConceiveCap` keeps stacked fertility
multipliers a probability rather than a certainty, and `familyMaxChars` caps total
tracked family records — past it, unscripted kin weddings and kin births pause, so an
over-cap save stops growing instead of failing. On top of that bounding, manual slots
are stored LZ-compressed (`FBC1.` prefix packing the bit stream into storage-safe
UTF-16; an lz-string port private to `js/save.js`), which shrinks each established
serialized life several-fold. The frequently replaced autosave is normally stored as
ready plain JSON. This deliberately removes the full compression-and-
verification pass from every season boundary; if the plain autosave write encounters
quota pressure, that exceptional write retries with the verified compressed encoding.
Manual slot quota pressure can also compact that stored autosave before retrying, preserving its exact campaign and any pending newer snapshot.
`S.serialize` still returns plain JSON, compressed writes verify their own round trip
and fall back to plain JSON rather than store an unproven encoding, and `S.read`
accepts both forms forever. The season-boundary autosave splits the remaining work so
it does not stall the day loop: `S.serialize` still snapshots synchronously (the state
to capture is the live one, before any mortality roll), but the storage write runs on
a later task; a newer autosave supersedes a still-pending one, and `S.flushPending`
(pagehide, background pause) lands the pending write synchronously when the page may
never run another timer. Manual slot saves stay fully synchronous. If a save still
hits the quota, `S.toSlot` recognizes
the quota-shaped error
and points the player at Download save file, which preserves the life as a `.txt` file
when storage no longer can.

Political-bloc state is additive and keeps save format 3.
`state.politics = {polityId,allegiances,pendingMotion}` is created
and repaired by `FB.ensurePolitics` / `FB.repairPolitics`. Allegiance entries
store only a stable bloc id and annual review year. A pending motion stores
its stable motion/polity/proposer/location ids, start and expiry turns,
support pledges, the one lobbying attempt and result, and—after the vote—the
stable bloc outcomes and pass/fail tally result. It never stores influence,
probabilities, interest scores, localized prose, or rendered reasons.

Restore repairs missing or malformed politics after realm, war, modifier, and
relationship state is available. It discards houses and magnate leaders no
longer in the direct court, initializes old saves from current interests,
clears an expired campaign, and cancels a campaign whose liege/polity or
eligible court no longer matches. A tallied motion retains its exact queued
context so save/load cannot reroll it; the event validator prevents that
result from crossing a later liege change. Annual reviews and all repair paths
are deterministic and RNG-neutral.

Elections, privileges, and collective demands are additive save-format-3 state.
`state.elections` stores at most one active campaign, profession-and-county guild office
terms, chartered Council terms, stable cooldown clocks, and a bounded outcome history.
Forecasts, localized candidate labels, and support prose are derived. Legacy officer and
guildmaster careers receive one current term during repair instead of losing rank on load.
An active guild or Council campaign becomes invalid if its exact candidate enters intrigue
captivity, so confinement cannot confer a new office at the later resolution boundary.

`state.privileges` is a list of legal records with stable definition, holder, grantor,
scope, source, effect-ledger, grant turn, optional end turn, and revocation ids. It never
duplicates modifier effects, monopoly arithmetic, obligations, or Council seats; repair
keeps a record only while that authoritative effect survives and backfills recognizable
legacy effects. County-scoped records therefore survive county transfer and expire with
their modifier. `state.collectiveDemands` keeps one pending semantic demand, per-definition
cooldown years, bounded mistreatment evidence, and bounded organized opposition. Loading
calls `FB.ensureInstitutions` only after modifier, realm, agency, and political repair;
protagonist-stamped pending demands clear rather than crossing succession.

Royal policy is additive save-format-3 state. `state.realmPolicies[policyId]` stores only
`{level, setTurn, setYear}` for each `institution:'crown'` policy family — the standing
level id and the proclamation stamps that drive the per-family yearly cooldown and the
protected-worship term. `FB.ensureInstitutions` heals missing or unknown entries to each
def's declared `defaultLevel` and drops unknown policy ids, so old saves get the customary
level with no save-version bump. The standing county modifiers the level maintains are
ordinary modifier records rederived by `FB.realmPolicySync` from the saved level; effect
projections, localized level names, and repeal explanations are never saved.

Ruler and family agency is additive save-format-3 state. `state.agency` contains
plain JSON maps for generation-stamped `rulerAims`, managed-character
`familyAmbitions`, sparse directed `relations`, and temporary `rebelSupport`,
plus the last annual player-approach and family-request years. Locale-neutral ids
and numbers are saved; labels, relevance, distances, bloc scores, and candidate
matches are derived. `player.familyOffices` is a plain office-id to character-id
map. `FB.ensureAgency` runs before political repair on new game and restore,
adds deterministic defaults without consuming RNG, discards dead generations or
unmanaged family, and validates family offices through current occupation and
residence rules. Missing state therefore means no history and requires no save
version bump.

Player-initiated royal descendant proposals add only a bounded character field:
`royalMatchRefusals` is an array of managed descendant character ids on the royal
family member who refused those exact pairings. Missing or malformed values read as an empty
list and are replaced only when a refusal is recorded. Acceptance uses the existing
betrothal, dowry, `royalLine`, and wedding fields, so save format remains 3.

National technology is additive version-3 state. `state.realmTech[realmId]` stores
`{completed,exposed,active,progress,reserve,priorities}` for that sovereign identity;
`active` is an array of up to three project ids and `priorities` maps advocated ids to
expiry years. Effective bonuses resolve through the top independent realm while dormant
former-sovereign records remain intact. Secession and absorption union completed/exposed
sets and keep the maximum partial progress and reserve rather than summing research that
may once have been shared.

On the first restore, `FB.ensureRealmTech` uses `realmTechMigration:2` to convert a legacy
active string to an array, historically backfill each living sovereign through the saved
year and its derived traditions, and then union every saved completion, exposure, partial
progress value, and reserve. Old `state.tech` and `player.research` are imported into the
player's effective sovereign. The marker makes the graph migration one-shot without
raising save format 3. See [tech.md](tech.md).

`state.legends` records each player character at death (`js/main.js` `recordLegend`):
id, name, born/died years, a semantic `titleData` snapshot, locale-neutral `causeMsg`
and `quipMsg` descriptors, an exact frozen equipment `loadout`, and optional semantic
`deathProvenance` (`kind`, event, province, and enemy ids). The quip choice is rolled once
from traits, stats, and cause of death, but its text is rendered in the currently selected locale. The end screen
(`UI.gameOver`) also accepts legacy rendered `title`, `cause`, and `quip` fields, so no save
migration is required.

Family-tree rank history is additive character state and keeps save format 3.
`character.statusTier` stores the last exact playable or reigning tier, while optional
semantic `character.highestTitleData` stores only the greatest tier-3-or-higher title
that character actually held, including its place. Rank words remain locale-neutral
title snapshots and render in the active locale. New games stamp the first protagonist;
all player tier transitions stamp both sides of the change; succession stamps outgoing
and incoming heads; a foreign ruler's succession or realm fall stamps its departing crown
while a current reign remains derivable from the live realm. Restore repairs the current
head and retained protagonist legends without consuming RNG. A legacy life with no
surviving title evidence remains unstamped rather than receiving invented history.

Personal commoner station is also additive character state. New starts stamp every
generated relative, births derive station from their recorded parents, and the optional
`character.unfree:true` marker distinguishes personal bondage from a free Lowborn
station-0 character. Freedom resolutions clear it for the exact covered character ids.
New `player.familyFreedom` entries
retain a bounded `memberIds` snapshot; restore derives the old spouse-and-descendant
scope only for legacy entries that predate it, never parents or collateral siblings.
Restore also derives a missing current protagonist station from the saved player tier,
without assigning that tier to any other relative.
An optional `character.manumission` receipt records the turn, year, sponsor, lord, and
price of a later exact-relative redemption. Missing fields require no save-format bump.

Item/equipment state is additive and keeps save format 3. Repeatable objects live in
`state.itemInstances[ref] = {defId,quality,visualSeed,motif?}`; `player.items` is the
shared armory's exact-reference list and `player.loadouts[characterId]` maps the eight
equipment slots to those references. `FB.ensureItems` runs on restore. It treats bare
legacy ids as stable implicit instances, converts the five former ordinary heirlooms to
Plain without changing their old value/effect, moves current-household `c.items` into the
armory, validates old/new assignments, and auto-equips the current head in inventory
order (right hand before left). Existing collateral ids remain valid. This repair uses
stable hashes for legacy appearance and consumes no saved RNG.

Barber customization is likewise additive save-format-3 character state. A customized
protagonist may carry `appearance: {hairStyle, beardKind?, beardCut?}`; an absent record
continues to use deterministic generation, and unknown values are ignored lazily by the
portrait descriptor. New beard-only cuts, moustache variants, and bare sideburns are additive
accepted ids in the same flat fields. Existing `none`/`stubble`/`short`/`full`/`long` kinds
and legacy cuts remain valid and render as before; the barber derives a semantic family and
style without rewriting them. No migration or eager repair is needed. A haircut selected while a
character is a minor stores only `hairStyle`, allowing their adult facial hair to remain
generated until it is explicitly changed. Preview selections are UI-local and are never
serialized. `FB.visitBarber` revalidates the current protagonist, life, selection,
travel/event state, tier quote, affordability, and an actual visual change immediately
before deducting gold. It maps a valid family/style choice to exactly one canonical pair and
writes one appearance record without advancing the day or consuming saved RNG.

On ordinary succession, `FB.autoEquipBest` deterministically rebuilds the new head’s
loadout from all age-valid, unpledged armory objects after household assignments are
reconciled. It compares mechanical power before value and optimizes both hands together;
the selection adds no state shape and consumes no RNG.

Generated-item Chronicle parameters store a `$item` snapshot rather than a rendered
name. The display layer combines its frozen definition/quality identity with the active
locale, so sale, gift, default, succession, and later catalog changes do not strand
English prose in saved history. Generated instance records are retained after ownership
ends for the same reason.

`state.log` chronicle entries are dual-form. A legacy entry carries a pre-rendered
string (`t`); a structured entry carries a nested durable message descriptor
(`msg: { key, params }`) so the chronicle can re-render in the player's current language.
`FB.newsText` renders either — `msg` through the localization layer, else the frozen `t` —
so old saves and unstructured third-party mod calls keep working with no migration. Every
core `FB.news` producer now uses the structured form. `js/messages.js` clones, validates,
and freezes JSON-safe semantic params at the boundary; state never stores an
active-locale rendering for a new core chronicle entry.

Event receipts are an additive specialization of that same format and keep save version 3:
`{y,s,d,msg,kind:"choice",receipt}`. `msg` is the ordinary locale-neutral fallback, so an
older build renders the entry as normal news and ignores the extra fields. `receipt` stores
only JSON-safe semantic data: schema number, stable event id and authored option index,
success/failure marker, automation marker, title/option/outcome descriptors, and the exact
resolved impact records. Entries without `kind` — including every old-save entry — count
as News. Chronicle filter selection and unread state are not saved.

The live `state.log` remains a 300-entry compatibility and presentation window. Alongside
it, additive `state.chronicle` schema 1 is the complete compact journal: `strings` interns
repeated message keys once, `entries` uses positional arrays for dates, message parameters,
receipt metadata, category, and saga generation, and `heads` snapshots each protagonist's
identity, years, dynasty, and title. `FB.news` appends to both records before trimming only
`state.log`; therefore a multi-century campaign keeps its whole journal without making the
live Chronicle renderer or older code traverse it. The journal remains ordinary JSON inside
save format 3 and consumes no RNG.

Restoring a save without `state.chronicle` creates it from that save's surviving `state.log`
without rejecting, renumbering, or rewriting any legacy entries. The new archive is marked
`partial:true`, because entries already discarded by an earlier build cannot be recovered;
the viewer discloses that boundary. All subsequent entries are retained normally. A malformed
unknown archive likewise falls back to this safe adoption path rather than blocking the life.

A dead protagonist is not itself a completed campaign. While `FB.heirsOf` still finds a living
eligible relative, the saved `player.dead` flag, matching final legend, and ordinary family graph
form a pending succession boundary. Continue reconstructs the nondismissable death decision from
those records after the game interface wakes; it does not need serialized modal state or a new
save-format field. This also repairs older version-3 saves captured at that boundary. Only a dead
protagonist with no eligible successor is exported as `campaign.finished:true` and resumes at the
line-ended decision.

`FB.save.chronicleData` expands the compact journal into portable
`fallowborn-chronicle` JSON schema 1. The artifact includes campaign and protagonist summaries,
the complete dated entry list, semantic message descriptors where available, resolved fallback
prose, choice outcomes, and impact records. The fallback makes a downloaded history readable
after a later game or mod revision no longer knows one of its message keys. Chronicle JSON is
history only and is never accepted as a resumable save. It is parsed with its own validator,
opened in memory by the title-screen viewer, and does not occupy a fourth localStorage slot.
The most recently left or completed campaign remains viewable for the current page session;
the downloaded file is the durable cross-session artifact.

The selected locale (`fb_lang`) and live-clock speed (`fb_ui.speedIdx`) are browser-local
display preferences in `localStorage`, not part of `FB.state`, a save slot, a start seed,
RNG state, or deterministic simulation state. Speed defaults to the fastest of the five
bounded intervals when the preference is absent or invalid.
Save metadata stores `titleData` and renders its slot label in the locale active at display
time; older metadata with a frozen `title` remains readable.

Starting-station progression is another browser-local profile preference, stored separately
as `fb_progression:{v:1,highestAchievedTier}`. It is monotonic during ordinary play and
unlocks all authored beginnings at or below the highest station a character has earned;
creating a life at an already-unlocked station never advances it. Because the profile is
outside `FB.state`, replacing or deleting a save slot does not erase it and it does not alter
RNG determinism or save format 3. The Settings reset returns it to Serf-only. On restore,
an older or imported life may advance the profile only when its saved `peakTier` or current
tier exceeds the tier encoded by its original starting scenario. Thus an old Petty Baron
start proves nothing by itself, while a Serf start that rose to Baron does. Loading such an
earned life after a reset restores its earned unlocks. If local storage is blocked, unlocks
work for the current page lifetime but cannot persist; each web origin has its own profile.

The play host's service-worker Cache Storage is likewise outside `FB.state` and the save
contract. It stores only a deployable game shell; saves and `fb_lang` remain in `localStorage`.
Cache Storage is evictable, and clearing site data can remove both stores, so offline readiness
must never be presented as durable save backup. Exported save text remains the portable,
player-controlled recovery path.

Currency presentation follows the same boundary. `FBDATA.currency` belongs to the
active data/mod set, not `FB.state`; `player.gold` and financial contract values
remain ordinary numbers. Durable messages store numeric money parameters and call
the active formatter when displayed. Consequently currency support keeps save
version 3, adds no migration or succession rule, and relies on the existing mod
fingerprint to require the same currency mod when a life is loaded.

`state.seed` records the start code the life began with ([seeds.md](seeds.md)); saves
from before it existed simply hide the seed row in the menu.

Personal court standing stays on `state.player`: `warService` records service in the
current character's liege wars and `liegeGrants` records successful feudal patronage
in the current lifetime. Both reset on succession. Older saves need no migration;
the grant multiplier treats a missing `liegeGrants` as zero.

Local office and outgoing service-contract state are additive and keep save format 3.
`player.localCouncil` optionally stores
`{provinceId,holderCharId,appointedTurn,nextMotionTurn,ordinance}`; an ordinance is a definition
id plus its start and end turns. Missing state with the legacy `councilman` flag repairs
to the current home with an immediately available motion. Validation is deterministic
and clears a seat after permanent relocation, death, or landed promotion.
`player.castellany` optionally stores the appointing realm, home county, appointed
character, `life` or `term` tenure, grant/expiry turns, and renewal
marker. It is character-bound and never changes `state.owner`, `state.holder`, or the
player's province list. Expiry, resignation, death, or loss of the appointer's control
clears the office and restores tier 2; acquisition of ordinary land instead clears it
in favor of the new landed dignity.

Each direct player vassal may carry
`realm.feudalContract:{liegeId,charterId,tenure,grantTurn,expiryTurn,renewal}`.
Missing and malformed records read as Customary Service with hereditary tenure, so old
saves retain their exact historical 20% tax-base and 15% levy behavior without a bulk
migration. Charter and tenure ids are saved, while current definition rates and
localized labels remain derived data. Hereditary succession preserves the record;
life and fixed-term death or expiry call the existing escheat machinery. The daily
tenure sweep is deliberately bounded to the player and direct player vassals. Restore
normalizes these optional records without consuming RNG.

Voluntary ruler-capital relocation is additive save-format-3 state.
`player.capitalRelocation` is absent/null before use or records
`{charId,turn,fromId,destinationId}` after the current protagonist moves the realm
seat and permanent household home. Ordinary JSON slots and exports preserve the
marker unchanged, while succession clears it for the next protagonist. A version-3
save without the field is eligible exactly like a fresh ruler. A forced fallback
after the old capital is lost synchronizes `player.provinceId` and
`realms.player.capital` to a surviving directly held county without writing, clearing,
or charging against this marker.

Earned-trait acquisition is additive version-3 state:
`player.traitProgress = {traitId:number}`. Restore repairs a missing or malformed map
and clamps known progress to the definition's current `earn.threshold`.
`FB.noteTraitProgress` never stores localized text; a threshold award stores a durable
message descriptor whose trait name resolves from data at display time. The succession
path clears the whole map when `player.charId` changes. Character trait
arrays, inheritance, and explicit grants keep their existing save shape.

`player.gentryGeneration` is additive dynasty standing: it records the generation in
which the house first reached tier 2 and persists through succession. Ordinary barony
patronage requires the current head to be of a genuinely later generation. New games
track `player.lineDepth` — the current head's genealogical depth in the recorded tree,
advanced at succession by the depth difference between predecessor and heir (an adopted
child of the predecessor counts as one deeper) — and `gentryGeneration` is recorded and
compared on that scale, so a sibling or cousin of the founder's own generation does not
establish the house. Tier-2+ scenarios start established (`0`); older saves without the
field are also treated as established, and saves holding only a saga-generation number
keep the original `state.generation` comparison, so the balance gate never retroactively
strands an existing gentle house.

Standing deliberately keeps the version-3 compatibility stores:
`character.opinion`, `player.liegeOp`, and `player.liegeOps`. The typed
`FB.standingOf` / `FB.adjustStanding` facade chooses the backing field and synchronizes
a materialized ruler; the historical realm helpers and event/mod opinion keys remain
valid. Direct-liege changes use `FB.changePlayerLiege`, which moves the dedicated
`liegeOp` score back under the old realm id and restores the new liege's realm-keyed
score. No canonical `standings` object or save migration is introduced merely to rename
the player-facing system.

Faith relations add a dynamic baseline without replacing those totals.
`character.faithStandingBase` and
`player.realmStandingFaithBases[realmId]` remember the directional faith baseline
already included in each compatibility score. Reads subtract that marker and add the
current `FB.faithRelationBaseline`, so a reconciliation or new schism changes only the
religious prior while preserving service, gifts, rivalry, and other earned history.
`player.faithStandingMigration:1` marks the one-time additive repair for older
version-3 saves: their existing totals receive the current baseline once, then round
trip unchanged. Newly created neutral characters and realms begin with the baseline;
an explicit authored `opinion` remains an exact initial total.

Serialization omits a character marker when it is exactly zero; reads already
treat a missing marker as zero, preserving the score while avoiding a repeated
default field across large generated courts.

On protagonist succession, every earned character and realm score resets because
the save stores only relationships with the outgoing protagonist, not an heir/counterpart
matrix. The new protagonist's current faith baselines remain, and explicit inherited
commitments may then apply a bounded new modifier (retainers renew at −15). On AI ruler succession, a displayed heir preserves the score already
tracked with that exact person. A compact collateral is first materialized on its scoped
court stream and starts neutral before that same record takes the throne.

`player.foreignPolicy` stores the current ruler’s political-attention assignments as
realm-id keys with `1` (Improve) or `-1` (Provoke). It is lazily initialized, so older
version-3 saves need no migration, and invalid/dead/non-adjacent targets are discarded at
the seasonal tick. The object and the player-relative `liegeOps` Standing backing clear on
succession; `state.pacts` remains state-level and survives.

Personal rivalry state is additive too: `player.rivalContacts` records explicitly hostile
contact with known character ids, `player.rivalry` stores the active feud's heat and
provenance while `state.roles.rival` remains the canonical target, and
`player.rivalPeace` holds temporary post-settlement protection by character id. All three
initialize lazily. Contacts and peace records reset on succession; an active rival is
handled by the queued inheritance choice. Older saves with an active rival receive a
default heat on first read, so no save-version migration is required.

Overland travel is additive and save-safe. `player.travel` is `null` or the
JSON-only journey record described in [travel.md](travel.md): purpose,
home/destination/current county, phase, routes and leg clock, departure turn,
encounter counters, seen cultures/events, and optional destination-stay timing/work
fields. An accompanied self-founded trade venture adds a JSON-only `venture` child
containing its stake, separately paid overhead, destination/route snapshot, status,
and any settled outcome/payout. It has no duplicate finance record.
A character-targeted visit additionally stores optional `targetCharId`, a courtship
marker, and a realm/generation stamp when the target is a reigning ruler. Restore
validates the live target and their current
`FB.characterResidence`; a dead, unavailable, or moved target clears invalid
relationship state and starts the saved traveler home without a minimum stay.
A qualifying tier-3+ destination wedding adds the optional JSON-only child
`marriageResidence:{spouseId,destinationId,promptPending}`. Restore validates it
additively and reopens the immediate decision only while `promptPending` remains
true; deferral leaves the child and its Deed entry in place until travel ends.
A signed mercenary contract adds the optional JSON-only child
`contract:{realmId,startedTurn,paidSeasons,renewals}`; `travelEnsure` drops a
damaged record and the journey's ordinary exits dispose of the rest (see
[travel.md](travel.md)).
A frontier withdrawal adds the optional JSON-only child
`frontier:{gatewayId,holderId,sovereignId,charId,milestones}` — the settled
anchor county, its political holder and controlling sovereign snapshotted at
departure, the protagonist, and the accrued successful-work milestones. The
route, cost, and start turn are the journey record's own frozen fields.
`travelEnsure` repairs milestone/type drift and drops a damaged record; the
daily tick then cancels the journey because the attempt can no longer resolve.
The completed settlement is not a frontier record at all: it is the ordinary
`player.travelSettlement` lifetime move plus starter `player.landPlots`
entries at the materialized county.
`player.travelHistory` stores completed purpose/destination pairs for the
current character. `player.travelSettlement` records the current character’s one
completed permanent move as `{turn,destinationId}`. All initialize lazily without
changing the save version. Succession cancels an active journey and clears both the
new character’s lifetime history and permanent-move marker; the household home remains
`player.provinceId` unless an eligible destination stay explicitly settles there.

Living marriage abdication reuses the ordinary successor transition with an
explicit option rather than inventing a second player-state shape. It advances
`state.generation` and applies the normal heir-specific standing, focus,
relationship, and lifetime-counter resets, but does not mark the predecessor
dead, add `state.legends`, charge death dues, or clear an unrelated
`state.pregnant`. Before the pointer changes, the former protagonist and wedding
spouse receive `homeProvinceId` in the destination; their marriage and family
links remain ordinary character state, while household enumeration follows the
new protagonist.

Voluntary retirement rides the same living-abdication transition and is likewise
additive at save format 3. `character.retired` is an optional marker on the
former head only: old saves simply lack it, no migration runs, and the JSON
snapshot/export round trip preserves it unchanged. The retiring head gains a
`homeProvinceId` at the household home when none was recorded, and
`balance.retirementAge` holds the one new tunable. Nothing else about the save
shape changes; the retired elder is an ordinary living character for kin,
residence, and mortality purposes.

Personal family-display state is additive at save format 3. A character may
carry `byname`, distinct from the stable house key `dyn`; restore derives a
missing patronymic only from an existing recorded father and does not consume
RNG. A child may also carry unique `stepParentIds`. These ids supplement rather
than replace `fatherId`/`motherId`, do not enter the blood-heir walk, and remain
after divorce or death. Restore normalizes invalid/duplicate ids and records the
current protagonist's existing spouse family. If that spouse belongs to a
compact royal family, required direct children are materialized while the RNG
state is snapshotted and restored, so compatibility repair cannot alter the
future random sequence.
New campaigns also record additive `player.houseFounderId` as the first playable
character for the family-tree jump. CrazyGames also uses it alongside generation 1
to restrict faster courtship and guaranteed eligible proposals to that character;
older generation-1 saves without the field qualify, but successors never do.
Older saves need no migration: the family-tree UI
falls back to the earliest protagonist legend still backed by a character, then
to the current protagonist. The field never participates in inheritance or
household membership.

Pregnancy is family state rather than current-protagonist state. Its saved record
is `{due,motherId,fatherId,lineParentId}`, where `lineParentId` identifies the parent
whose culture, faith, and dynasty the playable line supplies to the newborn. A
father's death and succession preserve the record; when it comes due, the child is
linked only to the recorded parents, so the new protagonist sees a sibling rather
than gaining a child. A missing `lineParentId` from an older save is captured from
the outgoing protagonist during succession and otherwise falls back to a recorded
parent. A dead or missing mother ends the pregnancy on the next daily birth tick.

`state.buildings[pid]` entries are shaped
`{ s: settlementIndex, id, devGranted?, ruined? }`
(per-settlement buildings — see [development.md](development.md)); `ruined:true` is an
optional backwards-compatible tombstone that occupies the slot but provides no bonus and
charges no upkeep until repaired. New construction with a definition-level dev effect saves the exact
amount actually applied in `devGranted`, including zero at the county ceiling. Demolition
reverses only a finite nonzero saved amount. A one-time compatibility pass recalculates
counties currently in `player.provs` from their bookmark development plus standing
building `dev` effects and reconstructs those buildings' `devGranted` values. It records
`player.developmentBaselineMigration:1` so later loads preserve all subsequent changes.
Missing `devGranted` outside that bounded migration remains grandfathered as zero, so an
AI county acquired later never invents a retroactive development loss. Saves old enough to hold bare id
strings are NOT rejected: `FB.builtIn` projects them into the head settlement (`s: 0`)
without mutating state during reads, and the next construction or demolition in that
county persists the canonical object entries. This remains a no-version-bump
compatibility path.

Repair adds no save-version change. Ordinary demolition may retain devRemoved, the actual development taken away; repair restores only that known loss, records the applied result in devGranted and removes devRemoved. Existing raid ruins and older ruins without this field receive no duplicate or inferred development grant. Fort ruins retain ruinedLevel when known, and funded repairs retain targetLevel, completeTurn and repairing until completion. The repairing marker suppresses a second construction prestige award and survives save/restore and conquest.

Livelihood state is additive and does not raise the save-format version. Careers
live on characters; `character.careerHistory` maps profession ids to complete
inactive career snapshots and is absent/empty on old saves until the first
calling is changed. Learned records optionally persist `specialization`,
`examLastTurn`, and `authoredWorkRef`; the same fields survive career history,
serialization, succession, and resumption. They need no migration because missing
fields retain the ordinary career behavior. A legacy master Administration record is
normalized to the Bailiff specialty on first read, while existing Merchant officers and
guildmasters remain grandfathered through their already-saved rank. Repeatable enterprises live in `player.enterprises` as
`{uid,type,provinceId,settlement,workerId,workerIds?,workerLocked?,level?,devAppliedLevel?}`.
The singular worker id remains the compatibility first assignment; `workerIds` is written
only for a multi-person staff. Missing `level` and `devAppliedLevel` mean zero. Only `workerLocked:true` is
stored; absence means the current assignment is available to batch staffing. Old
characters gain a career deterministically from the current compatibility
profession/station when first read. Old business-like holdings migrate once into
enterprise instances in the home settlement, while all other holdings remain unchanged.
Valid locks pass through ordinary JSON snapshots and succession. `FB.enterpriseList`
repairs them lazily without RNG: an idle, duplicate, departed, dead, rank-ineligible,
career-ineligible, guild-ineligible, or non-local assignment loses both its
worker id and lock. The enterprise itself remains owned.
Manual reassignment and explicit unassignment clear affected locks as well. Staffing
previews and their signatures are transient derived values and are never serialized, so
the assistant remains an additive save-format-3 feature.

Maritime catalogue corrections retain arsenal building records and fishing_boat_business instances, ordered upgrade levels, worker assignments and devAppliedLevel receipts. Owned boats and completed capacity keep working without the current purchase or upgrade technology. Matching restore resumes those saved facts without reseeding knowledge, rebuilding a yard, granting another development award or converting property; ordinary exact mod fingerprints still reject changed imported definitions. No new saved field or save version is introduced.

Paid enterprise-worker contracts are additive compact records in
`player.enterpriseLabor` as `{charId,enterpriseUid,pay,startedTurn,unpaid}`. Missing arrays
mean no contracts. Normalization discards dead, duplicate, or orphaned contracts and
removes their assignment; valid contracts and their named characters pass through ordinary
save, succession, and papal custody paths.

`FB.enterpriseList` is also the fail-soft load boundary for the property collection. A
non-array collection becomes empty; null, primitive, or definitionless records are
discarded; duplicate or missing instance ids are replaced; invalid counties fall back to
the household home; and malformed settlement or worker-list fields are canonicalized.
This repair runs before staffing eligibility so one damaged legacy record cannot stop the
rest of a valid life from loading.

Guild monopoly state is additive and keeps save format 3.
`player.guildMonopolies = {incoming,outgoing}` is created lazily by
`FB.ensureGuildMonopolies`; either slot is `null` or a plain JSON record. Each record
freezes its Craft/Trade profession, grantor and recipient identity, province/liege/landed
scope, tier, start/end turns, duration, enterprise bonus, ruler fee, tax bonus, and
popular-opinion change. Optional `mode`, `goodId`, `originId`, `destinationId`, and
`route` fields narrow a new record to local craft output, local exchange, or one exact
trade corridor. Missing optional fields preserve the old broad profession-wide behavior;
malformed optional scope degrades to that legacy behavior without losing the frozen
contract. Balance changes therefore affect only future grants. Both slots
survive succession and promotion. Exact-day expiry and scope invalidation clear a slot
once and write a durable localized Chronicle descriptor; permanent relocation ends a
province-scoped incoming charter, direct-liege change ends a liege-scoped one, and loss
of landed authority ends an outgoing charter.

Maintained household standards are additive and keep save format 3.
`player.householdStandards` is a plain definition-id to numeric-level map. Missing state
means every standard is at baseline level zero; `FB.ensureHouseholdStandards` creates the
map lazily and clamps known entries to their current moddable definition. Purchased levels
pass unchanged through succession because the player household object persists. Rank or
worker dormancy changes neither the map nor the save shape. No active-effect total,
seasonal upkeep total, localized level name, or travel modifier is serialized.
Ruler establishments use the same map and level numbers. Falling below Baron rank makes
`kind:'ruler'` entries dormant without deleting them; regaining a title reactivates them
without rechecking the purchase technology. The technology remains mandatory for buying
the level, so already established ruler investments are grandfathered across realm changes.

Network state is additive and lazily validated. `player.friendContacts` maps known
character ids to current-life contact timestamps; the canonical friend remains
`state.roles.friend` for events and mods. `player.socialAttention` is a character-id-keyed
assignment map (one entry with core balance) and `player.socialGiftTurns` stores the last
explicit cash-or-item gift turn per character recipient for the current life. Ranked
access adds no save field: `FB.rankAccessStatus` derives the reachable station and
intermediary chain from the protagonist's current tier, existing `friendContacts`, and
their live typed Standing. `state.roles.steward` is a lazily created, location-scoped
station-2 character like the local lord and priest; permanent household or capital moves
leave the former steward at the old home and generate a new local officeholder.
An active formal courtship may also carry
`player.courtshipTerms:{suitorId,amount,playerPays}`. The snapshot freezes the
visible transfer through proposal and wedding; restore recreates it for a valid
legacy courtship and clears it when the suitor or courtship is gone.
`player.realmGiftTurns[realmId] = {turn,generation}` stores the corresponding ruler clock;
the generation is compared with `realm.ruler.generation`, so a newly succeeded ruler is a
fresh recipient while save/restore preserves a living ruler's cooldown. Invalid, dead,
self, malformed, and stale-generation references are discarded lazily. `player.retainers`
stores compact
`{charId,office,pay,startedTurn,unpaid}` contracts, while every personal attribute
remains on the referenced character. Fresh playable and observer states eagerly include
the empty array so opening a character or ruler sheet is a read-only operation; older
saves still create it lazily. `player.guildFavorTurns` bounds guild calls by
character and `player.vassalLevyFavors` maps realm ids to expiry turns. Succession clears
friendship, cultivated contacts, social attention, both gift-clock maps, and exceptional vassal
favors, but retains paid service contracts with a loyalty penalty. A freeholder/gentry
journey settlement also clears friendship, contacts, courtship, and attention. A ruler's
capital relocation instead keeps personal relationships intact and pins non-household
contacts to their prior residences while regenerating only location-scoped local roles.
Restore converts an old active
`court_suitor` focus into attention on its living suitor and selects an ordinary valid
focus. All missing or invalid fields self-heal without a save-version migration.

`player.giftDeliveries` is also additive save-format-3 state. Each record freezes the
sender, ruler generation or character recipient, exact cash/item and semantic item
snapshot, standing effect, dispatch home/destination/sovereign, phase, current county,
route, leg clock, arrival turns, and optional failure/return metadata described in
[travel.md](travel.md). Missing state means no couriers. Succession deliberately retains
the array: a record whose `senderCharId` is no longer the protagonist completes outbound,
then returns its exact payload to the new household head’s current permanent home.
Cooldown maps still clear normally and a failed delivery creates no new entry.

Position definitions and the levy ledger are derived data. Most earned offices continue
to read compatibility flags; the Town Councilman flag is backed by the validated local
seat above so its active ordinance can be derived in O(1). Retainer contributions read
live contracts, and
`FB.playerCompositionBreakdown` calculates troop sources from counties, buildings,
technology, Council, ruler, domain penalty, vassals, and positions. No displayed levy
total or ledger prose is serialized.

Freehold-land state is additive too. Repeatable plots live in `player.landPlots` as plain
`{provinceId, settlement}` records and a declared site lives in `player.manor`. Both pass
with the household across succession. `player.landPlotMigration` lazily turns the legacy
`has_farm` flag into one home-settlement plot and preserves the assumed land behind an old
tier-2 manor without raising the save-format version.

Childhood instruction is additive too. `character.edu.school` optionally names an
`FBDATA.schooling` arrangement, `lessonBoost` stores the fractional yearly chance earned by
completed seasonal terms, `schoolTerms` maps schooling ids to completed terms awaiting the
next New Year, and `schoolUnpaid` suppresses repeated notices while fees cannot be met.
`storyTerms` separately maps study focuses to completed directed terms, including home study;
the annual schooling pass snapshots and clears both term maps. Per-student `storiesSeen` and
`lastStory` fields prefer unseen education stories and prevent an immediate repeat when the
pool recycles. `player.educationStories` is an additive list of reserved annual stories as
plain `{id,ctx,dueTurn}` records. It survives saves and spaces each educated descendant’s one
story across the following year; the daily release path moves at most one due valid record into
the ordinary event queue. Switching arrangements leaves term history intact until New Year.
Missing fields mean home instruction, no exposure, and no previous story, so older saves
acquire these records lazily without a save-version migration. A legacy generated hired tutor is
recognized by its character role and lazily gains `school:'master'`.

Household education automation is additive at the same save version.
`player.educationPolicy:{focus,instructionMode,feeCap}` belongs to the household and
therefore survives protagonist succession. Missing or invalid fields normalize to
`{focus:null,instructionMode:'manual',feeCap:0}`, so an old save starts with both
dimensions disabled. `character.edu.policy` records `focus` and `instruction` provenance
as `manual`, `policy`, or (for instruction only) `waiting`, plus the chosen instruction
identity needed to distinguish explicit home teaching from an empty slot and to recognize
a lost policy tutor. Existing non-empty focus, school, or tutor fields in an old save are
marked manual on restore (with the same inference as a lazy fallback). Missing provenance
remains an empty choice. Policy application
changes none of `lessonBoost` or `schoolTerms`, and every field is plain JSON preserved by
slot saves, autosave, export/import, and succession without migration.

Descendant match recommendations are additive at save version 3.
`player.matchPolicy:{enabled,agePreference,minStation,maxDowry,maxGold,maxPrestige}` belongs to the
household and survives protagonist succession. Missing or invalid state normalizes to a
disabled policy with no caps; finite limits clamp to their valid non-negative ranges. An
absent or invalid `agePreference` defaults to `close`; other values are
`youngest`, `same`, and `younger`. It participates in the recommendation signature. An
eligible descendant may carry
`matchRecommendation:{candidateId,policyKey}`; the signature prevents duplicate
Chronicle notices and makes a changed policy invalidate the old marker. Candidate ids
continue to belong to the existing persistent `matchIds` pool. Restore validates only
the JSON-safe record shape, while ordinary recommendation, death, marriage, and
succession cleanup revalidate live eligibility without consuming extra migration RNG.
Neither the derived preview nor rendered candidate terms are serialized.

Finance state is additive too. `FB.ensureEconomy` lazily supplies `state.economy` with the
price index, persistent pressure and shocks, loans, trade investments, stable contract ids,
default history, and coinage history. Every record is plain JSON, so slots, autosave,
export/import, and succession preserve exact faces, denominations, deadlines, pledges, and
already-resolved investment outcomes without a save-version bump. An older save starts at
price 1 and is first revalued on its next annual tick; no historical inflation is invented.
Self-founded dispatched ventures reuse `economy.investments` with
`kind:"trade_venture"` and save their destination, route, strategy, stake, overhead,
commodity id, origin quote, purchased quantity, exact due turn/date, captured modifiers
and outcome bands, plus the sole raw/adjusted
roll, multiplier, payout, status, and resolution turn once mature. Active records
survive succession and promotion and pay whichever household head is current on the
exact due day. Passive `kind:"trade_partnership"` capacity and season-boundary
resolution remain separate.

County-market state is additive at save format 3. `FB.ensureMarket` lazily supplies
`state.market:{goods,lastTurn,counties,shocks}`. `goods` is the saved stable-id order;
each county is the compact `[stock[],smoothedPrice[],lastNetFlow[]]` vector record and
each shock is a normalized JSON-only production/demand/flow record with remaining
seasons. Restore remaps vectors by goods id, drops removed baskets and invalid shock
references, and initializes newly added baskets at a two-season reserve and price 1.
No production report, rendered route, overlay, endowment resolution, demand breakdown,
or adjacency cache is serialized. Missing market state therefore self-heals without RNG
or a save-version migration. Fresh playable and observer states run this normalization
after population initialization, before any panel can read market-backed values; older
saves retain the lazy compatibility path. See [markets.md](markets.md).

Related: [mods.md](mods.md) for how saves are stamped with the active mod set,
[i18n.md](i18n.md) for the message-descriptor shape behind structured chronicle entries,
and [finance.md](finance.md) for the saved contract schema.

Great holy wars are additive save-format-3 state. `state.greatHolyWar` is either null
or a locale-neutral record containing the stable campaign id, phase, calling religion,
caller and military leader realm ids, frozen target/holy/objective ids, dates,
participant arrays, temporary occupations, resolve, contribution, result, and
settlement. `state.greatHolyWarHistory` owns the sequence, first-call/first-launch
markers, uninterrupted sacred-loss clocks, office restoration observations,
per-faith cooldowns, and a bounded completed-campaign summary. The personal
`player.greatHolyWar` record owns camp, service mode, vow/renewal/withdrawal flags,
mandatory-defense status, territorial eligibility, `vowOutcome`, and
`vowTerms:{seasons,desire,beneficiary,served,mustered}`. AI attacker participant
records add `vowSeasons`, `desire`, `served`, `mustered`, and `vowOutcome`.

A new settlement is
`settlement:{schema:2,case,captured,applied,pendingPlayer,awardRealms,mainRealmId?}`.
The generic case is entirely serializable:
`{schema,kind,seats,assets,claims,awards,step,status,standing,nextClaimBoost,
blessingUsed,blessed,objections,contested,playerHead,playerDiplomacy}`. Claims retain
their extensible basis object and computed weight; awards retain asset, claimant, form,
optional terms/beneficiary, runner-up, and move. No map ownership changes while the case
is open. A resolved beneficiary-free personal land award uses `pendingPlayer` for the
final accept/decline; all collected awards then apply together.

Completed compact history adds locale-neutral `vowOutcome`, `desire`, attacker `vows`,
`settlementContested`, objection count, and award summaries. Awarded realms may carry
`sacredCustody:{religion,siteIds,campaignId,grantTurn}`. All fields remain additive
under save format 3.

`FB.repairGreatHolyWar` runs before `FB.repairWars` on restore. Missing fields on old
saves initialize lazily; malformed ids, phases, objectives, occupations, participants,
and pledges are discarded or clamped without rendering prose. Old active campaigns gain
neutral player vow terms and deterministic, RNG-neutral AI terms. Old
`pendingPlayer` partitions are marked legacy and retain their already-mutated
accept/decline flow. A malformed new case rebuilds only before awards are applied; an
already-applied case finalizes without replaying transfers. Army repair then keeps
at most one host for every living active sovereign participant. Preparation and
settlement do not preserve field hosts. Contribution belongs to the campaign rather
than the current character, so it persists across protagonist succession.

Saves from before parents were recorded (first-generation siblings known only
by role) have a father and mother synthesized once on load — long dead, ages
fitted to the oldest child — so the family tree shows them instead of an
"Unrecorded" ghost (`backfillParents` in `js/save.js`). The additive
`player.familyParentMigration:1` marker makes that repair one-shot, and the
absence of `houseFounderId` plus a first-generation campaign confines it to
saves old enough to need it. A parentless adopted successor therefore remains
parentless across restore and never absorbs the founder's role-tagged siblings
into a fabricated family.
The same one-time repair recognizes the exact consecutive dead-parent pair
created by the former unguarded migration after an adopted successor, removes
it, and restores displaced founder-sibling links from their surviving parent
backlinks. It does not infer ancestry from names or dynasty alone.

Temporary modifiers are another additive version-3 extension. County records live at
`state.modifiers.county[provinceId] = [{id,endTurn?}]`; player-participation campaign
records live at `state.greatHolyWar.modifiers`. After holy-war and ordinary-war repair,
`FB.ensureModifiers` creates missing containers, discards malformed or unknown records,
and collapses duplicate ids without migrating the save version. County records remain
with their county through ownership changes. See [modifiers.md](modifiers.md).

Role orientation history (`player.roleOrientationsSeen = {orientationId:1}`) is a
retired field: the pop-up orientation sheets were superseded by the coachmark hint
tour and removed, so nothing writes or reads it anymore. Saves that carry it load
unchanged — it is inert data, and no migration is needed.

Hostile intrigue is another additive save-format-3 extension. `FB.ensureIntrigue`
lazily repairs `state.intrigue` with at most six generation-stamped `aiSchemes`, exact
`captives`, one exact expiring `leverage` record per actor, actor cooldowns, an optional
player `hearing`, and bounded counters. Captive records contain captive/captor ids,
captor realm and generation, source, capture turn, and demand. Leverage contains actor
and target ids, actor generation, source, creation/expiry turns, and the exact political
foothold available at creation. Missing or malformed records are dropped or clamped
without consuming RNG, materializing replacement people, retargeting, or raising the
save version.

`character.conduct` is an optional `{schemes,deceit,cruelty}` record repaired only when
present and updated for both protagonists and AI characters. All saved intrigue state is
locale-neutral. Death, actor/realm succession, expiry, target departure, and lost
footholds invalidate their exact records; restore calls repair after modifiers and before
agency so downstream readers receive the same shape. The internal
`player.flags.intrigue_captive` and `intrigue_legal_custody` markers only identify which
intrigue record owns the shared `in_prison` blocker, so repair never clears imprisonment
created by another system.

Settlement folk are an additive save-format-3 extension. `state.localFolk[provinceId]`
stores a monotonically increasing generation counter and three bounded household records,
each containing a stable id, settlement index, and member ids. Full people remain in
`state.chars` and carry `localFolk:{provinceId,householdId,settlement,role}` plus the usual
family, residence, career, skill, trait, health, culture, and faith fields.
`player.localActivityTurns[characterId]` stores the most recent resolved activity turn.
Generation uses a private seed scope derived from world seed, bookmark, county, and
generation, so loading an old save or arriving in a different order neither changes the
cast nor advances the shared RNG. Missing containers are created at load without raising
the save version.

## Marriage lineage additions (format 3)

Optional character `marriageLineages[partnerId] = {lineage,turn}` freezes a couple's agreed
paternal or maternal terms while their union or pledge exists. A replacement union records
new terms. Pregnancy adds `dynastyParentId` and the conception-time `dynasty`, independently
of `lineParentId` (culture/faith source). The birth resolver honors that snapshot after
remarriage, divorce, paternal death, and a change of protagonist. Compact royal members
retain `dyn` when registered or compacted and reuse it on materialization and accession.

`state.maternalCustomKnowledge[cultureId] = {cultureId,turn,source}` records contact-time
custom knowledge. `state.marriageCultureAttempts[headId + ':' + targetId]` records
`{turn,cultureId,accepted}`; changing culture never changes that key. Successful prospects
save `cultureAdoptionUntil` on their own character, including when they later become head.
All are additive JSON data under unchanged save wrapper format 3. Missing contracts,
pledges, and pregnancy fields retain historical inheritance; restore and rendering do not
backfill them, and no existing child's dynasty is rewritten.

Ordinary-war truces are additive format-3 state: `state.truces[JSON.stringify([realmA, realmB].sort())] = expiryTurn`. Normal settlements set 720-day protection for actual opponents, independent of ruler generation and voluntary pacts. War repair initializes missing ledgers without RNG and preserves concurrent personal-vassal and unrelated liege campaigns. Per-host `lowSupplyWarned` survives saves and clears after supply recovery.
Post-decision outcome metadata is additive save-format-3 data. A queued
`decision_outcome` holds a receipt, semantic character ids, message descriptors,
optional hostile report id, protagonist id and outcome turn in its ordinary event
context. It contains no HTML or rendered prose. Stale protagonist acknowledgements
are discarded; Continue never reapplies the originating decision. Old saves need
no migration, and Chronicle choice receipts remain the durable decision record.


Local commons uprisings use optional save-format-3 fields under `collectiveDemands`.
`uprising` retains identity, protagonist, original audience `scopeId`, privilege, liege,
started turn, global response `stage`, and current `countyIds`. It also stores
`sovereignId`, `countyStates` keyed by county (`phase`, `joinedTurn`, optional `dueTurn`),
`visitedCountyIds`, and optional `nextSpreadTurn`. Global `dueTurn` is the earliest
county deadline for compatibility. Global `active` awaits the shared response;
`aftermath` records that this response was spent. Individual phases are `petition`,
`warning`, and `active`. Each acknowledged warning and actual outbreak sets its own
90-day and 180-day deadline respectively. Visited counties cannot rejoin this incident.
`uprisingCooldownUntil` is an absolute turn after the last county leaves.

Legacy records derive county phases and deadlines from their original global fields;
missing `countyIds` becomes `[scopeId]`. Migration never extends existing deadlines.
Invalid protagonist, liege, sovereign, rank, or death clears the incident. Transfers
within the player's subrealm preserve county entries; exits and individual concessions
remove only that county. Queue contexts snapshot roster, phases, and deadlines, and
spread petitions identify `spreadCountyId`. Changed terms invalidate old choices before
costs or RNG. Restoration replaces missing unanswered initial, active, and spread
decisions without duplicates or modifier extensions. Save format remains 3.


Optional `uprising.localNegotiations` maps direct-holder realm ids to
`{turn,rulerCharId,countyIds,success}`. It records one local attempt per lordship per
incident; absent maps mean no attempts yet. It survives load and ordinary holder
changes without permitting rerolls. Local choice contexts also carry `localRulerId`,
`localRulerCharId`, and `localCountyIds`; these are checked against the current direct
holders and ruler before costs or RNG. Partial local success grants county privileges
with the local holder as grantor, then uses normal incident repair. Other county stages,
deadlines, and the global response stage remain unchanged. Settled counties remain in
`visitedCountyIds`. No save-format bump or AI treasury field is needed.

## Ordinary campaign registry

Additive format-3 fields: `state.wars`, monotonic `warSerial`, `warLaws` by sovereign,
`warPermissions`, `warPermissionRequests`, `warAISeason`, `military.player`,
`player.fabricatedClaims` by county, and optional `player.captiveWarId`. Active war
records save explicit attacker/defender IDs, frozen objectives, occupation ledgers,
status, campaign progress, and exact operational event context. War/event IDs never
consume RNG. Existing singular wars are migrated before repair; overlapping
campaigns are preserved. Singular compatibility properties are non-enumerable
synchronous views, not duplicate serialized records. `military.player` owns
mercenary contracts, mass levy and demuster limits shared by ordinary campaigns.
Hosts save an assignment `warId` (ordinary ID or `holy`). Restore binds adapters
without consuming randomness. Existing holy-war IDs, data and wrapper version 3
remain compatible. See [war.md](war.md).

Concluded war reports may carry additive peaceTerms metadata containing settlement deltas and identifiers. It is compatible with save format 3. Transient settlement snapshots are never serialized, and older reports lacking terms remain readable without retroactive estimates.

## County support migration

`state.countySupport` stores base support by county id, defaulting to zero. Load
repair copies an old `player.pop` into directly held counties (or the current
county for a landless household) only where no county value exists, then deletes
`player.pop`. Repair is idempotent and does not overwrite newer county values.
Temporary support debt remains in county modifier records as `supportDebt`,
`supportSince`, and `endTurn`; it survives transfers and succession.

## Armed rebellion records

`state.rebellions` contains `groups`, county `warnings`, county `cooldowns`,
and monthly scan/response deadlines. Each group stores its id, faction, target
jurisdiction, start turn, county membership and one-time muster flags, siege
progress, occupation, and any recovery siege. Army records carry `rebellionId`
and `homeCounty`. These additive format-3 fields survive reload; repair never
rolls, musters, charges a response, or awards independence. Transient county and
defender indexes invalidate on group membership and realm revisions. Finished
factions and their military ledgers are removed.


Autosave snapshots remain synchronous and precede mortality rolls. After a plain
storage write exceeds quota, a local Blob worker compresses and verifies the
immutable JSON snapshot before replacing the slot. Subsequent autosaves reuse
that storage strategy. A newer snapshot terminates the old worker; stale results
cannot overwrite it. Pagehide and explicit flush synchronously verify and store
the latest pending snapshot. Browsers blocking workers retain the verified
synchronous codec fallback. No worker mutates simulation state or consumes RNG.

Chronicle packed entries may append an audience bitmask at index 10 (family=1,
realm=2, world=4); old ten-field entries remain readable. Recent log entries carry
the same optional `audience` field. Notification preferences live in `fb_ui`, not
in the game save. Visibility never deletes or truncates the durable archive.

Packed Chronicle rows are deeply immutable snapshots, detached from recent-log
receipts and caller parameters when appended or restored. Saves retain a transient
WeakMap of encoded immutable rows, encoding only newly encountered rows. They still
assemble the complete JSON snapshot synchronously before mortality, and always
serialize the current string table, head metadata and other state. Replacing a row,
array or archive is supported; mutable rows supplied directly by mods are encoded
fresh until archive normalization. No cache or format change enters the save.

## Browser save storage and routine-history retention

Save slots prefer IndexedDB (`fallowborn-saves`, version 1, `slots` store) with
callback-based transactions. Boot hydrates the synchronous read cache before
Continue becomes available. Legacy localStorage slots and page-close recovery
copies migrate copy-first and are removed only after a successful transaction,
and only if the local bytes still match. A local recovery copy takes precedence
on the next boot. No save wrapper version changes.

IndexedDB stores the synchronous JSON snapshot without main-thread compression.
Manual save success and hosted-update reload wait for transaction completion.
Unsupported or denied IndexedDB and failed writes retain verified localStorage
fallbacks. Pagehide attempts a synchronous recovery write for pending saves;
as before, this fallback can fail if localStorage is unavailable or full. Already
committed IndexedDB saves remain intact. UI preferences stay in localStorage.

At most once per campaign year, save serialization removes unrelated routine
county-modifier expiry, rebellion warning and AI settlement notices older than
the preceding five complete calendar years. Family/realm audience bits and all
decisions protect entries; other event types remain permanent. Older unclassified
rows use conservative current-audience inference. Notification visibility never
controls retention. `chronicle.retention:{years:5,removed}` discloses the cumulative
pruned count in exports and the viewer. `complete` is false when entries were
pruned; export and save keep all remaining records. User backup files are never
rewritten. Cached serialized rows remain transient and collectible after pruning.

Slot deletion removes both the IndexedDB entry and its localStorage recovery copy.
An epoch invalidates earlier write callbacks, and deletion transactions follow older
writes so they cannot resurrect deleted data. Deleting Autosave cancels its queued
snapshot and compression worker. New writes wait until deletion finishes; continued
play may create a later autosave. Delete-all clears save slots only, preserving
preferences and progression. Deletion failure reports incomplete removal.
`storageUsage` reads stored keys and values without decoding or changing saves and
reports UTF-16 payload estimates separately for game-prefixed localStorage and the
save database; it does not represent total physical disk use or offline media.

Snapshot compaction builds one completed-technology set per record instead of
searching the completed list for every exposure. The temporary indexes are discarded
after each serialization, including failures. Exposure order and the synchronous
pre-mortality snapshot boundary remain unchanged; this reduces compaction work,
not the requirement to serialize the remaining live state on the main thread.

## Shared budget additions

`treasuryAccounting.playerFieldVersion:1` marks daily player deployment charging.
Missing versions initialize `playerMilitary` and `playerMilitaryLast` to zero and the
shared `lastMilitaryTurn` to the current turn, without retroactive charges. New saves
retain that stamp and the bounded current/last seasonal totals, so reload cannot replay
field expenses. AI accrued bills and signed balances remain untouched.
AI `lastSummary` adds administration, court and total government costs; `necessary`
includes government expenses and `reserveTarget` holds the latest reserve projection.
Each payer (player or AI treasury) may retain numeric `distributionNextTurn` and one
`lastDistribution:{turn,amount,counties}` receipt. They survive succession and repair;
county effects use the existing modifier records. No new save format, historical
replay, treasury cap or forced player spending is introduced.

Personal-name edits add `chars[id].portraitName` once, preserving the original
portrait name seed. Rendering falls back to `name` when absent, so existing saves
keep their faces without an eager migration or save-format bump. Later edits and
reloads retain the frozen seed, including the no-dynasty background fallback.

## County muster plans

Optional `player.musterSelection` stores integer county troop caps;
`player.musterFormation` is `gather` or `county`. Missing fields retain the legacy
full combined muster. The selection is clamped against current recruitment at
quote and execution; newly acquired counties default to zero once a plan exists.
Opening the sheet creates no record. Saved plans survive reload and apply to
later automatic/manual raises; existing hosts retain their own reinforcement
ceilings. No save-format bump is needed. Mechanics and the technology decision
(`county_muster_selection`: none) are in [war.md](war.md#county-muster-plans).


County rows also offer their own 0/25/50/100% buttons; these change only that
county's amount. The rally selector lists eligible recruitment counties and
updates cost estimates without saving the draft. Optional `player.musterRally`
persists the chosen county. Combined hosts gather there; with separate county
hosts, hired troops and allies join there. If that county becomes unavailable,
quotes and execution use the normal eligible rally fallback. Old saves retain
the default rally. This extends `county_muster_selection` with no research gate.

Gentry eligibility derives house-relative depth from existing founder, parent and
child records when available, so older maternal-line undercounts need no save
rewrite or version migration. Succession records the corrected depth.

County muster targets also apply while hosts are fielded. Existing host sizes
reserve casualty replacement ranks when quoting additional troops; no new saved
field or migration is needed for inherited hosts. The shared military musterPool
ceiling now survives partial raises until the campaign military state is cleared,
preventing later calls from bypassing returned-veteran limits.


County-ruler founding: Counts and higher may use Found a settlement in Deeds and
choose a directly ruled county. Sovereign ownership alone does not authorize
founding in a vassal's county. Existing costs, duration, one-household-project limit,
capacity and conserved-population requirements apply. These projects save additive
`rulerFounded: true`; completion requires retained direct county control but not
household residence there. Completion adds an undelegated direct holding without
changing rank or the household seat. Lost control pauses completion, retaining the
funded project. Legacy/Gentry charters keep their existing hereditary-seat behavior.
The review names direct-holding benefits, no baronial dues, and capacity consequences;
its county selector uses native keyboard/mobile controls and the existing modal
history. The settlement_founding technology review remains none, expanded to cover
ordinary county-ruler founding; administrative capacity retains its soft role.


Direct settlement holders can rename established settlements with the small pencil
button in the settlement sheet title, matching the character name editor. The editor
accepts trimmed names of 1-40 characters, excluding angle brackets and controls;
saving revalidates direct ownership. Back discards edits and restores the settlement
sheet's scroll, disclosures and focus. Names are literal player text, not translated.
An optional `state.settlementNames` table maps stable site IDs to display overrides;
legacy saves need no migration. Geography, county names and site identities remain
unchanged. Settlement lists, map labels and map search read the saved display name;
search resolves overrides per query so loading a different save cannot stale names.
This is cosmetic naming only and introduces no technology eligibility requirement.


Settlement charter reviews keep total upfront cost, time, concise benefit, dues,
holding-limit penalty and current blocker visible. Secondary rules use the shared
heading hover/focus tooltip and touch Details disclosure. The county ruler opens
the character sheet through retained modal history. County capacity remains x/8;
development blockers state both the established count and currently unlocked count.
New projects save `costsPaid:true` after charging gold, prestige and piety together;
completion neither checks nor charges those resources again. Missing flags preserve
legacy completion charges. Cancellation refunds none of the paid resources.

## Fiscal crisis persistence

Optional root `fiscalCrisis` holds one episode: frozen receipt basis, warning/low
balance dates, pressure stage, next review, recovery status, seasonal idempotence,
and one composition with amount, dates, remaining obligation and paid-class limits.
Root placement preserves it across protagonist succession. `fiscalLandSales` stores
one compact protection record per sold county (price, recipient, refund flag and
resale deadline), surviving grant/reconquest. No transient projection is serialized.
Older saves initialize a fresh warning window without retroactive penalties; save
format remains 3. No RNG is consumed by projections or lifecycle checks.

## Distribution compatibility

CrazyGames uses the existing `mods` envelope fingerprint with value
`crazygames-content-1`. Missing or different profiles fail before RNG/state adoption.
Standard builds also reject these saves. This requires a new campaign rather than
rewriting an imported Chronicle or relationships. Save format remains 3.
See [content profiles](distribution-content.md).

CrazyGames save storage

The CrazyGames upload sets window.FB_CRAZYGAMES_STORAGE = "localstorage" before game scripts and loads SDK v3 asynchronously. The isolated js/crazygames.js adapter reads and writes fb_cg_aps_campaign_v1 and fb_cg_aps_progression_v1 independently of SDK telemetry initialization. Missing, rejected or unresponsive SDK initialization cannot block local play or saving. Late successful initialization reports the current screen. Manual Save and autosave share Continue; numbered slots remain exclusive to standard editions. No IndexedDB or SDK Data Module save is automatically migrated. A compatible life can be transferred with Save File.

Normal local writes gzip the unchanged save JSON and pack the bytes into 15-bit, non-surrogate UTF-16 code units (FBG2). The two-unit header records the byte length. Decoding stops at that byte count and checks that all remaining padding bits are zero. Exact JSON round-trip verification precedes replacement. Older gzip/base64 (FBG1) and LZ/base64 (FBL1) records remain readable. The new FBL2 fallback uses the existing synchronous 15-bit LZ codec, avoiding base64 overhead. Missing compression APIs select FBL2 for new writes; an existing gzip save without decompression support remains protected and is identified as unsupported, not corrupt. Save envelope version remains 3 and portable exports are unchanged.

Visibility hiding and mobile blur retain a synchronous checkpoint because a hidden mobile page may be terminated without pagehide or further asynchronous work. A snapshot identical to the committed JSON is not rewritten. Changed snapshots use verified FBL2, then schedule opportunistic gzip compaction while the page remains alive. Pagehide checkpoints pending work without scheduling compaction. Synchronous replacement invalidates older work only after success, so quota rejection cannot cancel a potentially smaller pending gzip write. All writes compare stored campaign and progression values before mutation. Deletion invalidates pending writes and retains earned ranks.

The browser enforces its shared localStorage quota. Failed writes preserve the previous snapshot; downloads remain available. APS payload limits, restoration timing and cross-device behavior require validation in the actual upload. A successful local write does not establish cloud sync.

Local initialization errors no longer block the title. An unreadable campaign is preserved and protected from ordinary writes, with recovery controls on the title and Save/Load. An unreadable progression record does not prevent a healthy campaign from loading or saving, but rank writes remain blocked until recovery. Denied storage allows unsaved play and file export. Recovery distinguishes missing decompression support from damaged records and offers a raw JSON download/copy plus a separate reset review. Reset copies and verifies only affected records under an unused fb_cg_aps_recovery_v1 key (or numeric suffix) before removing them; healthy records are preserved. Failed backup leaves originals untouched and exposes an explicit reset-without-backup action. Reset rechecks for external changes and locks the old page against writes until reload.

Without the storage flag, the older SDK Data Module mode still waits for SDK initialization and data hydration, uses fb_cg_campaign_v1 and fb_cg_progression_v1, enforces the 1,048,576-byte limit with a 4 KiB reserve, and blocks writes after account changes. It uses FBG1 normally and FBL1 synchronously. It does not apply the local recovery/reset flow to cloud data. Standard itch/play editions retain their existing IndexedDB, localStorage, slots and initialization behavior.

Coverage in tests/e2e/specs/crazygames-saves.spec.js includes all fifteen packed-length remainders, chunk and header boundaries, invalid padding, SDK failure and delay, absent compression APIs, protected unsupported saves, campaign/progression recovery, backup quota failure, denied storage, visibility/pagehide checkpoints, and failed-fallback queue preservation.

## Endowed abbeys (format 3)

Optional `state.abbeys:{v:1,houses:[]}` holds at most twelve institutions, one per
county. Each house stores its stable id, county, founding faith/culture, founder
dynasty, current holder and appointment/vacancy turns, treasury, capital, base
rents, donated plot groups, support, privileges, temporary residents, bounded
connections, cooldowns and last seasonal settlement. A dispute references its
exact living lord. Resident rows store character/sponsor ids, kind and end turn;
ordinary residence stays on the character and is restored by removing the row.

`character.abbeyVows` is personal and permanent. The legacy monastic numeric
rank prefix stays unchanged. Old rank-only abbesses gain no invented assets on
load; they can seek office normally. Restore repairs records without creating
people, houses or RNG draws. An existing holder's office is reactivated before
legacy settlement-lordship migration, which excludes abbey-only officeholders.
Full character retention includes holders, residents, contacts and dispute
participants. A seasonal vacancy lasting 360 days receives an appointed NPC
superior unless a recent petitioner is still within the cooldown or its one-season
retry window; the stored faith and culture outlive the player's conversion.


Scheduled games add state.tournaments and player.circuit without changing save format 3. Frozen budgets, finite payment keys, exact participants and round contexts survive restoration. Restoration reconciles host and visitor eligibility before travel; cancelled editions never revive at peace. Full editions expire after closure and the return window; summaries, four income samples and eight circuit contacts are bounded. Active host/participant ids protect court records until their commitments end. See tournaments.md.

## 476 authority persistence

Phase 2 creates `state.authority` only after a successful authority
transaction. It stores semantic IDs and transitions for appointments,
recognitions, federate contracts, customary rights and render receipts.
Contract payment, render and settlement-fulfillment stamps prevent duplicate effects. Pure queries and
rendered terms stay out of state. The normal serializer validates these records
and writes `schema:4` on its detached authority projection, leaving live state
unchanged. Restore does not replay appointments, grants or fiscal transactions.
Old saves do not acquire fabricated offices or contracts on restore.

## Spring 476 situation persistence

The 476 prototype (situation-476.md) stores its world facts (actors, offices, court location, displaced courts, the eastern return, the courts' own settlement and historical campaigns) under state.stories.western_court_476 and the household's phase, role, claimant choice, contract link, payment allocation and outcome under state.stories.federate_track_476 (stories.md). They are created once at a new 476 start, survives the ordinary save envelope, and is not synthesized on old 867/1066 saves. UI quotes and rendered language are recomputed from saved facts. Authored eastern ruler replacement advances its generation so reaffirmation-dependent authority records lapse.

Religious office persistence

state.religiousHeads and state.religiousHeadVacancies remain keyed by stable officeId. Pointers may refer to realms or characters according to the compiled head.holderKind. The original Papal office retains state.papacy; additional papal_election offices persist their independent model at state.religiousOfficeStates[officeId].papacy. Missing extra models initialize lazily, without replacing incumbent or election records from a save. These additive JSON records use the existing save envelope. A succession war saves casus.officeId; older caliphate causes without that key resolve the configured legacy office. Derived office tables and strategy functions are not serialized.

Derived system availability

System availability is derived from the campaign's existing start stamp and scoped government and faith definitions, with the bookmark as the final layer. It adds no save field or format change. Load repair skips disabled Papacy, abbey and tournament initialization; their existing records remain dormant. Disabled tenure, office and contract queries expose inert results rather than reactivating records. Existing greatHolyWars bookmark flags remain compatible with the resolver. See docs/designs/systems.md.

The save loading path passes state.start.geography into bookmark activation before restoring state. An existing stamp selects the campaign's original base even if the bookmark now declares another one. A legacy save without the stamp uses the current bookmark declaration and gains the migration stamp once. Raster caching and activation queuing distinguish bookmark/geography pairs.


Legal court scope persistence

Judicial custody and pending justice responses store courtKind as secular or religious. Captive normalization retains that field; legacy records without it resolve to secular. Government and faith declarations select current tradition at query/commit time, so tables and rendered legal labels never enter saves. Already imposed custody deadlines and sentence history survive a declaration change. The additive court scope uses the existing save envelope without replaying a judgment.


Governing identity persistence

Optional authority government rows now actively use eliteCultureId, eliteFaithId and legalIdentityId, plus tolerance (preference, tolerant or persecution), taxation (equal or discriminatory) and justicePolicy (personal or elite). Existing rows omitting these fields remain valid and project baseline treatment. Validation resolves legalIdentityId against the legal tradition registry and rejects invalid policy values before adoption. New-world seeds apply only at creation, never during migration or restore. Government-form changes preserve declared identity and policy. Rights retain exact recognition basisRef, transition history and the existing annual lastCustomYear guard. No new envelope version or saved projection is introduced.

Federate migration persistence

The existing v4 authority projection accepts optional migrations, using the shared nextId sequence with migration- ids. Each row stores parties, its exact host, origin, current county, target, territorial settlement form, court ids, choice and status, deadline, contract and ordinary-war references, and its claims session. Status is encamped, service, marching, arrived, settled or failed. Settled rows require a resolved session and settledTurn. Historical rows may retain an ended war or lost host reference. Duplicate active polity or host identities, invalid forms, malformed court ids, inconsistent sessions and reused sequence ids are rejected before adoption.

Contracts optionally store templateId, initialPay, initialPaidTurn, transitionReason and fulfilledCountyIds. Numeric terms and once-only stamps survive template changes, succession and restore. A fulfilled county must belong to that contract's promised list. A settlement closes the service commitment; it never recharges initial pay or replays a county transfer. A migration's court references retain active characters through ordinary compact-court pruning. Neither load repair nor serialization creates a migration, a host, an office or a land award for an older save.

transitionReason also accepts service_released for an expired commitment replaced by another service bargain. The historical row and its payment stamps remain saved, and automatic renewal skips it. Opening service declarations are consumed only during fresh world-story initialization, never as save repair. This extends the existing optional contract field without changing the envelope version or platform schema number.

War repair retains a saved peaceful host when its existing scenario-standing commitment or moving court is live and unexpired, so opening hosts and encamped or negotiated land marches resume without synthesizing another banner. Expired scenario hosts are removed unless a current war or migration independently retains them. Older saves with an already-declared Gothic campaign retain that war's normal outcome and do not acquire a migration or another commission.

Independent historical story records

Conditional polity foundation records

state.stories holds each polity_foundation instance's phase, result, reason, outcomeTurn, startedTurn, deadline, rebellionId, formerOwnerId, realmId, founderId, founderMemberId and counties. Resolved outcomes are founded, failed or diverted; rebellion commitments retain their exact id and duration. Validation rejects malformed phases, inconsistent turn stamps, malformed references, duplicate or foreign county ids and a founded result without its saved realm and founder genealogy member. Ordinary mortality may compact the full founder character; its genealogy tombstone remains valid. A founder need not remain alive or reign after succession, and conquered counties need not retain their former owner. Terminal records remain historical facts after defeat or extinction. The existing envelope and platform schema versions do not change.

Detached migration adds a pending record only to an older campaign whose bookmark lists that foundation and whose record is absent. It never creates a person, transfers a county, starts a revolt, grants technology or consumes RNG. Restore does not run the day or revolt-foundation hook. Repeated migration and restoration preserve recorded commitments and terminal outcomes. Earlier bookmarks stay detached. Foundation references use their saved bookmark's county table during validation, not the currently active world's table.

The 476 world saves zeno_return_476, western_office_476 and four campaign records independently of western_court_476. Campaign fields include phase, result, reason, startedTurn, deadline, outcomeTurn, actorId, actorGeneration, targetOwnerId, patronGeneration, warId, migrationId, commissionId, contractId and settlementApplied. Pending, negotiating and started are live phases; resolved requires a recognized outcome and numeric outcomeTurn. Optional references are null or semantic strings. Political records have their own enumerated outcomes and a western office history bounded to twelve decisions. Validation runs before adoption and rejects missing bookmark-declared rail records in a railsSchema:1 world.

Detached migration moves the former historical and easternReturn fields once, including existing commitment ids and terminal statuses. Legacy commanders remain null with a grandfathering marker. Migration never initializes a story, creates a historical character, reissues an appointment, transfers ownership or pays a contract. Repeating migration yields the same envelope. The v4 format and platform schema number do not change. Stories absent from 867 and 1066 remain absent.

An already-declared legacy war without a saved commission or migration keeps patronGeneration null. A current campaign definition cannot add a foreign ruler dependency to that independent war. Saved commissioned and moving commitments retain the existing issuer-generation checks, and a legacy opportunity that has no war retains its patron checks.

Existing-ruler start identity

Optional state.start.rulerRealmId preserves the authored source realm after its one-time adoption into the player key. state.start.scenarioId identifies the scenario and state.start.onboarding selects the ruler checklist. Validation requires the source realm, scenario, bookmark and onboarding to agree, and requires the scenario's declared player tracks. Older starts without this identity remain valid. A hidden scenario can still validate an existing review save. Validation does not repeat adoption or award land, pay, recognition or offices.

Adoption preserves the source actor and fully materializes the seeded household before removing the compact NPC succession record and that household's royalLine links. Ordinary player succession and mortality then own the family. The original realm key is removed; ownership, holders, authority references, contract approval keys, wars, army reserves, local institutional subjects and story court anchors resolve to player. The existing NPC purse becomes player.gold, and accrued military charges move to the player fiscal fields.

nepos_track_476 stores phase, semantic result, claimantId, recognitionId, senateRecognitionId, warId, officeId and outcomeTurn. The western court optionally records restoredClaimantId, restoredCourtId and restoredOfficeId; western_office_476 retains its bounded history. Campaign records optionally carry playerDecision and playerDecisionGeneration. Restoring these records validates existing state without reapplying choices. A changed ruler generation cannot authorize a fresh campaign with a predecessor's review.

Authored royal court persistence

Optional realm.succession.authoredCourt, policyId, founderId and dynasticOrder extend the existing compact family. Members may retain localId, fatherId, motherId, reciprocal siblingIds, spouseDeclared, spouseMemberId, generated, culture, religion, homeProvinceId and authored trait/mar. The ordinary parentId remains the succession branch; both parent links reconstruct childIds after save compaction. Durable member and character identities derive from realm/local ids, so lazy materialization and immediate restore resolve the same person. Person names and proper dynasty names are literal; rendered station labels and policy prose are never saved.

Optional openingPreferredId carries only a first-turn creation choice and is removed after elapsed time, a family death or accession. It cannot be reintroduced by current bookmark data during restore. Detached v4 validation accepts the serializer's omitted derived ids, child lists, char ids and usual heir pointer, but rejects malformed policies, unknown founder/member/character references, duplicate local identities, invalid parent ages, cycles and inconsistent spouses or siblings before RNG or state adoption. Old campaigns without the optional metadata retain their existing family and policy. The envelope and platform schema versions do not change.

Historical partition and dated religious story persistence

partition records save phase, result, reason, outcomeTurn, actorId, actorGeneration, beneficiaryId, approvals, approvalStamp, realmId, liegeGeneration and grantedCounties. Initialization alone creates the ordinary named character. Grants close once and retain the exact granted county list and realm id even if later ordinary conquest or succession changes that realm. Pending records require resolvable character identities; validation rejects unknown approval parties, inconsistent terminal fields and forged grant shapes. Reviews stamp current facts and recheck before applying.

holy_war records save phase, result, reason, outcomeTurn, campaignId, calledTurn, callerRealmId, callerCharacterId and seededIds. Optional greatHolyWarHistory.campaigns rows with historical:true carry a date and a negative turn equal to that date relative to state.start. Validation rejects future historical dates, duplicate historical ids, unknown faith or kingdom ids and unsupported archived outcomes before adoption. History remains bounded to 24 entries under the existing holy-war lifecycle. Restore neither seeds history nor creates named beneficiaries, grants, calls or missing new stories. Old saves without these optional fields keep their prior behavior and need no envelope version change.

Opted-in holy_war openingCall preparations add only an exact schema-1 record with evaluatedTurn, pending/called/declined/unavailable disposition, headRealmId, headCharacterId and headGeneration. The outer campaign fields remain the sole canonical campaign binding. Detached restore rejects extra or missing preparation keys, wrong schema, invalid turns, incompatible phase/disposition, missing pending authority identities, calls outside the declared window and a mismatching live campaign. Non-opted stories retain their existing shape; a missing whole opted-in story remains missing. Restore neither evaluates preparation nor creates a call. Normal live dispatch can resume a pending opportunity and close it after succession or expiry. No envelope or existing story version changes, campaign replay, history seed or new source of people, troops or property is involved.

Optional declared opening and agreement records

state.bookmarkSetup schema 1 saves declaration-id-to-character actors, declaration-id-to-authority appointments, estate beneficiaries and evidence, unaccepted claims, and stamped initial migration cohorts. Validation checks the owning bookmark, complete unique actor mapping, existing authority references, immutable estate definitions and dynasty, demanded claims and exact cohort totals. Court compaction retains these authored identities and agreement party references. Existing-ruler adoption remaps realm references once. Absence is valid for older saves; restoration never calls opening initialization.

tribute_cession saves pending/active/resolved phase, result/reason/outcomeTurn, actorId/sourceId, their generations, independent approvals, ceded, acceptedTurn, paidThroughTurn and totalPaid. Validation checks parties, approval generations and consistent paid/ceded state. civilian_migration saves its actor/generation, playerDecision, planned/moved counts for each declared route and lastPeriod. Invalid route identities, negative or excessive counts and inconsistent outcomes fail before adoption. These optional records use the existing v4 envelope and registry validator. Restoring does not pay, move cohorts, allocate actors or add missing new story instances.

Versioned bookmark opening declarations

A bookmark can declare openingRevision, openingRevisions and optional openingLegacyRevision. New state.bookmarkSetup records save the selected revision under schema 1. Validation selects that exact retained declaration and continues to require complete actor and appointment maps, immutable estate and claim definitions and exact migration cohorts. Unknown revisions fail before adoption. A saved setup without a revision uses openingLegacyRevision when declared; bookmarks without revision metadata retain their original behavior. No envelope version change or restore-time initialization is required.

The current opening must equal the catalogue entry named by openingRevision. Authors retain prior entries unchanged when advancing the current revision. Opening actor references resolve once during fresh story initialization and save actual character ids; restoration never resolves them against a successor ruler. Story-reference mappings must still match their saved source story field. An existing localInstitutions ledger is its campaign's roster: ensureLocalInstitutions creates the roster only when that field is absent, and later seasons or restore do not allocate newly catalogued representatives. Existing institutions still replace their own deceased representatives through ordinary succession. Future intentional changes to old campaigns require a separate explicit migration rather than replay of opening data.

Iberian content compatibility

The Iberian 476 expansion leaves bookmarkSetup opening actors, appointments, estates, claims and migrations unchanged. The strict opening validator continues to accept the previous declaration's saved counts and evidence. Saved gothic_custom Visigothic identity, northern Gothic ownership and existing community partitions retain their values even though a new campaign uses the Code of Euric and autonomous northern courts. Neither new northern realms nor missing regional campaigns are created by restore. An existing saved local-institution roster retains its representatives and records without adding newly declared seats; only saves without that ledger use the shared legacy roster repair. No save version or migration is added. The regression recreates the prior public branch's Iberian data deltas with both an unversioned retained core_v1 opening and an explicitly saved balkans_v1 opening, preserving saved actors and missing story records through repeated restore. An actual owner-supplied 2.0-era save remains an acceptance artifact.

Same-date regional expansion identity

711 inhabited-terrain revisions preserve both baseline and the earlier governments_v2 world on europe_regional. Fresh terrain_v2_governments_v2 uses europe_regional_2; terrain_v2 is also independently resolvable. The government composer keeps the government-only world from the retained baseline before composing the expanded current fields. Supported schema-1 campaigns still migrate to baseline, while stamped government-only campaigns retain their exact revision. Existing frontier conversions, settlement slots, households, community totals, stories and institutional rosters remain saved facts. No restore-time expansion, actor creation or reward replay is added. 711-terrain.spec.js exercises both retained revisions across expanded-world switches and rejects revision/geography mismatches before adoption.

The 476 bookmark contains all five regional declarations and stamps start.id 476. Its own settlement layout and full institution table place Antioch and Jerusalem on authored sites, so a development save of the earlier bounded map, whose institution rows have null sites, is not supported. The separate 476_outer and 476_mobile ids are retired; a save naming either fails before activation with the ordinary unknown-bookmark message and leaves the live campaign and RNG unchanged. Other bookmarks keep the null-site fallback table. Cross-bookmark load still rebuilds the matching map through the existing activation transaction before restoring saved state. No format migration, generated regional population, new court creation or historical grant is performed. tests/e2e/specs/476-outer-regions.spec.js covers merged save and restore and both retired ids.

Data-driven 476 story records

The 476 court, return, office and three household tracks now use data-driven factories while keeping their existing instance ids, fields and saved meanings. No new record version, envelope version or subsystem version is introduced by this conversion. Existing state.stories records validate through the owning type; state.situation476 and pre-rails records retain detached fact-only migration. Missing stories stay missing, and restore does not create actors, replay choices, fund contracts or declare wars. Compatibility coverage compares records, ownership, authority, hosts, opening bindings, RNG and uid.

For future story formats, stable instance ids and an explicit per-record schema version identify the saved progress contract. Type-owned migration handles older released schemas on the detached copy before validation and adoption. Save transaction references and reviewed plans rather than copies of executable declarations. A new authored instance does not attach retroactively to an existing save.

Declarative track stages

A political track saves its authored stage id in the existing phase field. The declaration maps that id to a transaction mechanic; restore rejects undeclared stages even if their spelling names a valid mechanic. Native 476 stage ids and all frozen record fields retain their previous meanings. New data instances can use different stage ids, branches and shorter paths without a record-schema change. Court dispatch reads the mapped mechanic when checking completed tracks. Restore does not resolve routes, choose a branch, replay an operation or allocate actors. Changing a released declaration's saved stage ids still requires retaining those ids or an explicit detached migration.


Government strategy integration

Government dispatch adds no saved fields or schema revision. Saved form ids and optional court policy ids select validated implementations. Derived per-day resolution lives in a WeakMap and is recreated for restored states. Office and acclamation remain explicit dynastic delegations; restore never manufactures an election or constituency.

Optional government selection records

authority.governments[realmId].selection is an optional typed record with schema 1, profileId, originRealmId, roots, members, revision, vacancy, recognition and optional lastPeriod. It is an additive subsystem record, with no envelope, platform or authority version change. Selection initialization happens only during fresh world creation. Missing records remain missing on detached migration and restore; no kin, supporter, vote or initial recognition is backfilled into old campaigns.

Members have stable id/templateId, typed principal, typed realm/county scope, authority basis, weight and continuity. A vacancy holds its opening generation, cause, turn, bounded candidate ids, one vote per interest, status and accessionId. Recognition holds generation, memberId, accepted county scopes, levy/revenue terms and the consenting principals. Canonical royal member ids retain genealogy; quotes and derived eligibility are never saved. Previous selection state can remain dormant after a reviewed change of form. Validation rejects unknown fields, broken references, duplicate or excessive members, invalid weights/terms, inconsistent resolutions and malformed votes before adopting the detached state.

Historical character principals may outlive ordinary character compaction. Their typed ids retain the recorded decision but grant nothing without the same current living principal. Fixed template principals must match their declaration; royal members, county scopes and institution definitions remain validated references.

originRealmId preserves authored kin identities while a protagonist holds the court under the player realm key. Validation accepts that original authored prefix and the institutional/player aliases for borrowed branches, while retaining canonical source-member checks. Existing royal birth registration and the single annual court mortality pass also serve the adopted kin graph; household mortality retains its existing complementary scope. Household succession releases the public court before political selection can install another ruler.

Constituencies and public mandates

The optional governmentSupport schema-1 root stores bounded typed polity records, membership, selection, mandate, decision history, agreements and temporary dues. save_v4 validates the detached root before state adoption, including member principals, unique scopes, ruler generations, exact term policy, quorum and record limits. Missing roots remain missing on legacy restore; restore does not seed representatives. Queries return detached projections without RNG, uid or state writes. Full record ownership and limits are in docs/designs/assembly-polity.md.

Reviewed public administration records

Optional publicTerms schema 1 extends existing appointment rows. administrationProfileId, bounded recognition, publicVacancy and lastAccession extend existing government rows; publicCandidateIds extends the compact succession tree with at most eight actual person/member references. Detached validation rejects malformed sources, amounts, overlaps and political records before adoption. These optional records preserve save-v4 and existing subsystem versions. Old campaigns keep their stored forms, and restore never reseeds a revised historical profile, officer, payment or accession. Transient reviews and projections are not saved. See docs/designs/administrative-monarchy.md.

Public courts are restored without materializing or repairing their succession. Their office, recognition and latest accession references retain referenced characters through compaction. The player public court references existing household characters directly rather than saving another compact royal tree.

Aristocratic courts retain their original compact royal tree alongside linked actual characters, including for a player ruler. Optional government.aristocracy schema 1 references the declared founder, original/current realm, permanent interests and minority steward. Perpetual appointment rows have provincialTerms schema 1 for levy and assent, and recognition votes carry exact revenue/levy terms or explicit withdrawal. Detached validation rejects missing active constituencies, forged roots, unknown profiles, mismatched principals, duplicate scopes/rights and invalid commitments before adoption. Dormant rights under another form survive, and old regnum saves remain unseeded. An incumbentRef may retain a foreign political incumbent's birth court without fabricating royal ancestry. See docs/designs/aristocratic-monarchy.md.

Mobile coalition records

The existing v4 envelope and authority schema are unchanged. Optional authority.governments[realmId].mobile schema 1 stores bounded member principals and civilian/resting-fighter cohorts, one leader/vacancy, one pending member decision, agreements, food and conservation counters. authority.migrations remains the sole court position. Ordinary hosts carry mobileFollowing, mobileCourt, mobileRoster, mobileFood and optional mobileProvisionTurn. Optional mobilePastures schema 1 retains only the current period and harvested capacity per county, preventing repeated concession harvests. Strict detached validation rejects invalid references, duplicate partitions, negative values, incompatible forms and broken people conservation. Restore creates no followings, pays no agreements, harvests no pasture and never rebuilds a lost host. Earlier openings remain absent rather than receiving fresh records.


Elective crown persistence

Elective progress uses the existing optional schema-1 government selection record and canonical court tree. electoral_candidate members reference ordinary characters through royalLine; their nomination identities, bounds and resolved incumbent consistency are validated before detached state adoption. No envelope version changes. Stored older government forms remain unchanged, and restore creates no constituency or public resources. The existing realm treasury can belong to the player-controlled public institution without becoming player.gold. See elective-monarchy.md.

A live electoral selection requires its existing version-1 treasury with finite gold and nonnegative finite military accrual. A missing or damaged account fails detached validation instead of inventing funds or routing public income into the household purse.

Civic institutions

authority.governments[realmId].civic is an optional strict schema-1 record for the institution, profile, former constitution, ordered offices and vacancies, citizens, bounded mandate history, scoped rights, public debts, temporary dues and overreach. governmentSupport remains the sole constituency record. Detached validation rejects malformed references, office generations, resolutions, terms, source overassignment and duplicate identities before adoption. An active civic form requires its civic record; old territorial saves remain territorial without initialization. Conversion preserves the former genealogy for family reference while civic succession owns current political generations. Restore never elects, creates people, pays salaries or awards historical rights. See docs/designs/city-republic.md for fields and bounds.

Ecclesiastical binding records

Optional authority.governments[realmId].ecclesiastical schema 1 contains profileId, officeId, institutionId, scope, originFormId and temporalRecognitionId. Exact detached validation checks references, unique office binding, bounded jurisdiction and the canonical recognition record. No election, incumbent or treasury is serialized here. Restoration does not initialize the form or adopt revised opening content. See ecclesiastical-principality.md.

World-revision compatibility

The world-revision extension reopens the platform contract as platformSchema 2 while retaining v:4, titleIds:1 and authoritySchema:4. Every newly serialized campaign carries state.start.revision. Unversioned bookmarks use baseline. Supported schema 1, early v4 and v3 campaigns without this field migrate on a detached copy to baseline; they never take the current fresh revision. A revision field in a schema 1 or unstamped envelope is rejected.

The saved revision resolves geography, opening actors, settlement layout, local institutions, political declarations and title maps before activation. Saved geography must agree with a versioned definition. Unknown revision ids, foreign county ownership and an opening catalogue from another revision fail before state, RNG, uid or world adoption. Direct FB.save.restore requires the matching bookmark and revision already active; FB.game.loadData performs detached preflight and selects the saved world. Existing converted scenery remains legal when its county belongs to that world.

Government selection principals, constituency scopes, recognized counties and collective war terms use FB.campaignProvince(state, id) during detached validation. They do not consult the currently displayed map. A wider campaign can therefore be checked while 867 or the retained 476 baseline is open, before loading its saved geography. Catalogue authoring readers enumerate FB.bookmarkRevisions instead, so revision-only counties, titles, technology seeds and agreement parties remain visible without activating that world.

For 476, baseline retains the merged wider_v1 opening and its older supported opening catalogues on europe_regional. wider_v2 owns the expanded layout and its own opening catalogue on europe_regional_2. Loading baseline does not add new courts, move Alexandria or seed fresh communities. The existing edition/mod fingerprint checks remain mandatory. The retained schema 1 reader fixture rejects platformSchema 2, preventing an older runtime from discarding a revision it cannot interpret.
Released catalogue retention

800 expanded-world retention

The 800 date retains independently resolvable baseline, governments_v2, inhabited_v2 and inhabited_v2_governments_v2 definitions. The first two keep the 498-anchor geography and original settlement layout; the latter two use the 527-anchor geography and the dated layout. The final combined revision is the fresh default. Government source composition always materializes the baseline government revision as well as the current date expansion, so adding a date composer cannot retire governments_v2 saves. It does not run during restore or change saved government profiles.

The expansion changes no 800 opening actors or story definitions. Existing bundled Carolingian record migration still splits saved opportunities into the reusable types without replaying grants, diplomacy or completed outcomes. A saved frontier settlement remains attached to its original world rather than being replaced by newly authored districts. Regression coverage switches retained, expanded and other-date worlds in both directions and checks population, holders, sites, RNG, story records and personal state.

Retained catalogue rules

Every restored world revision must agree with its saved geography, including a bookmark with only the implicit baseline. A known but different geography is rejected before activation or state adoption. Retained form ids, default government stamps, generated-faith parents and optional institution records remain authoritative; this contract adds no automatic government transformation or restore-time initialization.

The released-catalogue fixture records resolved baseline worlds and their settlement layouts, geography bases, effective faith profiles and defaults, government definitions and era government defaults. The initial protected bookmarks are 867 and 1066. New content uses additive ids and revisions; each new baseline is frozen when first shipped. Compatibility review must accompany any change to a retained hash. The fixture is a catalogue boundary, not an engine-code freeze.

Independent expanded 493 saves

The hidden 493 world_v2 revision resolves europe_regional_2, layout 493_world_v2 and opening revision world_v2. The original root world remains baseline, including its unversioned opening and three off-map sees. An unstamped supported schema-1 save resolves this baseline before map activation. The new revision keeps original story ids and court actor declarations while adding fresh-only provincial and court actors. Restoring either world never initializes the other world's actors, institutions, populations, grants or campaign commitments. Converted scenery in a baseline save retains its original raster and saved settlements. No save format or migration changes are introduced by this date data.

Expanded 867 compatibility

Fresh 867 and 1066 campaigns retain governments_v2 on europe_regional pending explicit acceptance of the larger openings. Their inhabited_v2 and inhabited_v2_governments_v2 revisions remain available for deliberate review and matching restores. The government composer derives each review definition without changing the retained fresh default or recalculating an explicit retained combined definition. Legacy unstamped campaigns still select baseline. Restoration keeps the saved population, tenure, property, stories, families and established settlements; it neither upgrades geometry nor inserts new actors.

The expansion adds no envelope or state schema. Unknown revisions, mismatched geography and changed effective mod fingerprints use the existing detached rejection boundary. tests/e2e/specs/867-inhabited-terrain.spec.js authors true retained household and frontier saves, actual serf tenure, expanded/retained switching and original owner-export imports. The public corpus manifest and retained hashes are unchanged; new seasonal checkpoints do not replace owner-supplied longer campaign evidence.

Expanded 1066 revision identity

Fresh expanded 1066 stamps inhabited_v2_governments_v2 and europe_regional_2. inhabited_v2 retains the date-owned geometry and opening before government rollout. baseline and governments_v2 retain europe_regional; unstamped schema-1 and v3 campaigns resolve baseline. Existing bookmarkSetup, authority, canonical families, population and settlements records own every new fact. Restore adopts those records without creating delegates or district populations again. Converted original scenery retains its raster and established site identities after switching through expanded 1066, 867 or independent 1204. There is no new schema or migration. Coverage is in tests/e2e/specs/1066-inhabited-terrain.spec.js and the retained-world save-v4 suite.

Retained spring 1204 world

Fresh 1204 campaigns stamp inhabited_v2 and europe_regional_2. Baseline resolves the original independently authored geography, local politics and ordered settlement layouts, while excluding the expanded-only fixed beginnings. Supported unstamped platformSchema 1 campaigns resolve baseline. Detached restore retains frontier conversions, existing rulers, site populations and campaign/partition outcomes; it never creates expanded inhabitants, a Qara Khitai court, a mobile following or congregations in a baseline campaign.

Expanded restore preserves the canonical mobile resource ledger and existing local mandates. Beginning as an existing delegate retains the public polity, treasury, constituent members, mandate, protocol ids and person ids. The protagonist starts an ordinary private household; public jurisdiction and receipts remain with the institution. FB.startRealmId and FB.startRealmDefinition preserve that public identity rather than remapping it into a dynastic player realm. No replacement election or duplicate representative is initialized. Mixed geography/revision or unknown revision references fail before live-state adoption. tests/e2e/specs/1204-terrain.spec.js covers these boundaries and midpoint replay; the existing 1204 history specification covers actual-control partition results and one-time grants.

Optional religious institution membership

For a localInstitutions definition with profileId, its existing saved row contains status (active, suspended or closed), members and assents. members is bounded to 64 character references; each record contains roleId, status (active or withdrawn), joinedTurn and changedTurn. assents is bounded to 16 decision keys, each with at most 64 member references and a turn plus control generation. Character religiousAffiliations is an optional array of at most eight unique id and institutionId references; null institutionId denotes an independently authored affiliation. Canonical spiritual holders and vacancies remain in religiousHeads and religiousHeadVacancies; institution_support remains in authority.recognitions with a typed religious-institution issuer. Detached v4 validation checks role, institution, affiliation, jurisdiction, source, status and reference bounds. Absent optional fields remain absent, and restoring a retained ledger never adds opening profile institutions or members. Abbey property is referenced by abbeyId and remains authoritative in abbeys.houses. See docs/designs/religious-institutions.md.

Profile rows optionally retain aiPeriod as an integer from zero through floor(turn / 90), preventing repeated quarterly AI decisions after restore. It neither admits people nor enables AI without a declared profile policy. Existing character religiousRanks and career records retain their ids and numeric progression even when institutional access changes. Title snapshots optionally name institutionRoleProfile, institutionRoleId and the raw fallback institutionRoleWord; rendering localizes the saved role source rather than persisting a translated title. Retained active, suspended, closed and withdrawn records, head/vacancy ids, support, generated faith ancestry, papal/caliphal state and institutional/household property keep their existing owners. The institutional specification authors exact restore after activating another bookmark and withdrawal replay for both distribution modes.

Religious activity retention

Optional household observers

Settlement-local household records

Only household graphs with localEvent or a site-scoped incident, and observers with declared localities, use version 2. County-only declarations keep version 1 and byte-identical seven-element receipt keys. The local key appends the canonical physical site id. Version-2 personal records may retain both county and local receipts when the graph declares both. Local decision rows save their exact locality; observer cursor and reached/control keys retain the site alongside the county. Source tokens and saved local receipts must match the source's committed facts. Missing optional records remain missing; matching reload resumes observations without source initialization, receipt rewriting, delivery or relocation. Unknown fields, incompatible versions, retargeted or stripped sites, nonexistent source facts and future stamps are rejected before adoption. The v4 envelope remains unchanged.

household_observer adds only its optional version-1 story record, validated through the existing story registry before adoption. It preserves bounded source cursors, control stamps, local offers, continuing household identity and the shared receipt closures. Foundation, partition, family-settlement, diplomatic and holy-war adapters reuse this shape and their sources' canonical timestamps and ids; no migration adds records or replays opening religious history. The v4 envelope and other story records keep their existing meanings. Missing observers remain missing; matching saves resume their pending notices without observation during restore, new people, money, population movement or source initialization. Normal lifecycle boundaries own subsequent delivery and expiry.

Optional character religiousActivity and religiousActivityHistory, player.travel.religiousActivity, abbeys.houses activity property, population project activitySupport and religiousActivityAI.period remain with their canonical owners. validateReligiousActivityState checks saved campaign references and bounded frozen terms without live eligibility checks or initialization. Loading preserves legacy standing, routes and property; the normal daily tick owns completion and interruption. See docs/designs/religious-activities.md for limits and review behavior.

Dated local office restoration

Fresh dated offices retain the existing religiousHeads and religiousHeadVacancies ledgers. Service membership, optional affiliations, personal communion letters, paid activity commitments, reform definitions, papal state, council support, rulerFaithDecisions and population communityProjects retain their canonical owners. Added freshOnly definitions never create absent rows or people on load. Communion letters are existing authority recognition records with exact issuer generation and counterpart character, not a repair instruction. Opening revisions restore their own complete institutional table after another campaign has been active.

Optional geography validation

A saved geography stamp must match its resolved bookmark revision when present. An absent stamp remains valid for retained definitions that declare no geography; the normal bookmark fallback supplies the world without fabricating a saved field. Legacy test saves begin in the retained baseline before removing version stamps, so their people and county records still belong to that world.

Authored mobile opening identity

Authored mobile openings use schema:2 in the existing authority.governments[realmId].mobile row and require openingBindings, one {memberId, characterId, person} record per declared principal binding. The person reference retains the exact opening actor or incumbent/generation declaration and resolves to the original bookmarkSetup actor, including after death or lawful member replacement. Current pools, host, leader and membership remain canonical live records; the opening provenance does not restore their initial values. Validation rejects missing, extra, duplicate or retargeted bindings and a schema downgrade. Restoring never creates actors, follows declarations, recruits fighters or supplies provisions. Legacy declarations retain schema:1 with no binding field, and the v4 envelope is unchanged.

Optional opening-profile contract

opening_profile reopens the v4 story contract only for its optional schema:1 record. It stores the initial actor, scenario, birthplace, bookmark and revision, opening turn, ready marker, original office snapshot or null, bounded goal status/turn receipts, once-resolved contact character ids, capped vocational earnings, last payment turn and opening pact expiries. The owning validator rejects unknown fields, unknown goal/contact keys, malformed statuses, future stamps, wrong scenario/revision, invalid office snapshots and earnings above their declared caps before adoption. No envelope version or mandatory record changes. Old saves missing the profile remain missing. Restore validates and projects existing records without initializing people, introducing contacts, observing payments or completing goals. The next ordinary lifecycle boundary archives unfinished goals after death or recall. Completed and dismissed decisions remain recorded and never generate a reward.


Optional mobile command records

Only command-declared openings use mobile schema 3. Existing openingBindings retain their schema-2 meaning; command adds stable id, active/vacant/recalled status, bounded revision, null or characterId/generation issuer, and leaderGeneration. The issuer's direct actor identity must match the declaration; realm issuer generations cannot be in the future. Active leader generations must match the existing public ruler generation. Vacancies have no leader or election; no command record may carry a coalition decision or selection. Missing declarations, missing command records, wrong schemas, extra fields and malformed references fail detached validation. Historical dead issuers and recalled mandates remain stored rather than regenerated. Matching restore calls no initializer, appointment, order or payment. The envelope and existing mobile schemas 1 and 2 are unchanged. Exact mod fingerprints cover the superior and operation list. See docs/designs/mobile-command.md.

Optional mobile opening columns

Only declarations with mobile.columns require the matching schema-1 columns object on their existing schema-3 mobile row. entries retain exact declared order, canonical host id, original bound commanderId and active or retired status. Actual units, people, position and food remain on ordinary army records. Active identities resolve exactly one mobile host; retired identities have none. Duplicates, missing or undeclared hosts, forged commanders, unknown classes, impossible sums and incompatible old markers fail validation without repairing or initializing state. Existing global demographic and per-host roster/unit conservation remains binding. Exact mod fingerprints include the whole partition. No save-envelope version or legacy mobile schema changes. See docs/designs/mobile-columns.md.

Reviewed column operations preserve the existing authority, population, ordinary armies and treasury owners. An explicit field-commander assignment upgrades only mobile.columns to optional schema 2 with the same exact entry fields; current commanders must name retained original opening members. Existing schema-1 commander provenance remains strict. Original declared host ids and order survive split, merge and retirement; restore creates no replacement host. Exactly one active host may carry the camp at its real locality. Remote forced disband records survivors as dispersed, with no camp reserve or food credit. Every field host must actually reunite and demuster before final settlement. Matching restore preserves in-flight paths, war references, actual camp position, current pools and finite stores without replaying decisions.

Independent mobile migration provenance

Only an explicitly independent command opening stores migration.sponsorship:{schema:1,kind:'independent'} with patronRealmId:null. Legacy missing markers still require a distinct realm patron. The mobile validator and v4 authority boundary reconcile the marker against the effective bookmark and reject missing, extra, mixed, forged or incompatible contract/choice/session references. A single real realm seat replaces the two-party session only after an independent expedition owns its settlement. No envelope or subsystem schema changes, reinitialization, stock reconstruction or sponsor inference occur.

An external warrant retains the existing mobile schema 3 and uses command.issuer:{externalAuthorityId,generation} in place of the on-map character variant. Its exact id and generation must match the effective superior declaration. The absolute declaration endTurn remains binding after restore; expiry suspends effective operations without rewriting the issuer or granting a new term. Missing or forged issuers and mixed character/external fields fail validation. The warrant creates no person, public account, local court or off-map political simulation. Existing on-map issuer, schema-1/schema-2 and sponsored records retain their meanings. See docs/designs/mobile-command.md.


Finite local incident records

The optional local_threat version-1 world record stores the original actorId, original authority person/generation or null, exact locality, finite opening/end turns, status, revision, nullable endedTurn and up to three ordered immutable occurrences. Each occurrence stores its serial, semantic milestone, turn, exact actor/authority/locality and null sourceResult. Statuses distinguish dormant, available, threatened, attempted, resolved, withdrawn, expired and interrupted. Definition-owned operation order, site, original protagonist/opening/resident identity, date bounds, future stamps and unknown fields are checked detached. A missing or downgraded opted-in world episode fails the parent platform boundary, including when the entire stories object was stripped. No save-envelope or subsystem version changes.

Absent records remain valid for unopted worlds. Fresh attachment is turn-zero only. Restore validates saved facts without movement, replacement actors, dispatch, occurrence delivery or a repaired missing record. A changed or dead original authority remains historical provenance and cannot authorize new acts; the next ordinary boundary interrupts current powers. A discarded resident household does not create a replacement or erase its archived incident id. Full imported terms remain part of the ordinary exact mod fingerprint.

Optional named household associations

An opted-in household_party track keeps one exact version-1 association record. The original protagonist, household and declaration identities stay fixed, while a bounded lifetime roster records invitations, adult replies, parent-care references and endings. Unknown fields, foreign party ids, invalid consent identities, impossible parent chronology, duplicate people, future decisions and excess rows fail detached validation. The platform boundary rejects a removed opted-in track, including an erased stories object, and a person reserved by two forming plans. Ordinary campaigns without this track need no new root or envelope version. Structurally valid history may await ordinary reconciliation after a person dies, departs or succeeds; restore never answers an invitation, chooses a caregiver or changes location. See docs/designs/household-parties.md and docs/MODDING.md.

Command funding review revision

The optional treasuryAccounting.fundingRevision is a nonnegative safe integer validated by the ordinary save-v4 platform boundary. Funding commits increment it after their explicit-account transfer, making consumed reviews stale even if another payment later restores the same balance. It contains no copied account or public balance. Matching restore preserves it and the existing treasury, appointments and command mandate exactly; older saves may omit it and restore does not insert it. Government homeAuthority and office homePowers remain definition data under the existing mod fingerprint. Saved appointments retain their original fields and live generation/term/recall checks.

Optional landed command continuity

An opted-in mobile.command.landedCommandLink requires one sibling authority.governments[commandRealmId].landedCommandLink schema-1 record. It pins the original character, declared home id/generation and initial installed command generation, plus revision, nullable reason and changedTurn. The existing command remains the sole mandate and issuer owner. Home adoption preserves original openingBindings and resolves the home alias at reads. No person, treasury, troops, appointment or deputy is duplicated. Exact fields and intrinsic bounds are in docs/MODDING.md. The parent mobile validator rejects erased government rows or required links, extra fields, malformed checkpoints and retargeted identities/generations; ordinary worlds forbid the optional record.

Restore accepts structurally valid history whose command has just become suspended and does not reconcile, initialize, replace, vote, pay or replenish. Daily and death boundaries update the interruption checkpoint; pure operations always recheck live home office, custody, allegiance, term and mandate. Existing mobile schema versions and save envelope are unchanged. expedition-command.spec.js covers exact matching restore after expenditure, unreconciled custody, death and malformed provenance.

Named journey and residence records

A household party with an opted-in ordinary journey retains its exact version-1 association until departure. The committed departure upgrades only that record to version 2, closes its invitation phase and adds a schema-1 journey with exact consent-backed people, a real travel identity and reached county checkpoints. player.travel.householdPartyId selects that record; partyInterrupted is true only for an interrupted stay. Voluntary withdrawal remains distinct from recoverable separation. Optional character householdResidenceId values preserve excluded residences during selective settlement. The existing save envelope remains unchanged. Detached validation checks exact versions, fields, consent and care references, bounded identities and chronology, exclusive location claims, real counties and route adjacency before adoption. Matching restore does no travel, consent, AI response, payment or residence repair. Public fields are documented in docs/MODDING.md.

Optional institutional building identity

New institution-bound ordinary buildings retain institutionBinding version 1 directly on their existing physical record. It stores exact profile/institution/site/property, original builder and equal maintenance payer, nullable incumbent, bounded authority/property generation, boundTurn and positive revision. The parent platform validator checks the detached campaign's original assignment, physical slot, known people/accounts, finite chronology, generation shape and unique foundation before adoption. Current death, transfer or lost permission leaves an inactive original reference. Restore neither adds a missing binding to an unbound old building nor creates property, chooses an incumbent, changes payer, reaffirms, charges or grants a construction award. No envelope or existing subsystem version changes. The schema and operation rules are in docs/designs/building-institutions.md.


Optional expedition intent checkpoints

Only a declaration with mobile.expeditionProgram requires the schema-1 expeditionProgram marker on its existing schema-3 mobile row. The marker pins id, commandId, the exact JSON definitionKey, active/cancelled/complete status and the declaration's ordered steps. Each step retains exact id, pending/complete/cancelled/expired status and bounded cursor. Non-route cursors stay zero; a completed route alone has its cursor at waypoint count. Progress and completion require all predecessors complete, and a complete program has no pending step. Missing opted-in markers, undeclared markers, altered definitions, extra fields and forged progress fail detached validation. Matching restore validates without initialization, dispatch, resource transfer, command replacement, cursor advancement or lifecycle repair. Restore leaves expired windows and suspended commands as historical facts; current reviews refuse them and the next live boundary reconciles owned routes and pending expiry. Existing save envelope and mobile schemas remain unchanged. The first live dispatch, control or reconciliation change may upgrade the program marker to schema 2, adding execution with exactly revision, lastTurn, paused and orders. At most four exact route tickets reference the declared pending step/waypoint, canonical host, actor, mode, command generations, war and issue turn. Duplicate/forged/future tickets fail validation; current host loss and mandate suspension are reconciled on the next live boundary. Paused and terminal programs have no tickets. Restore preserves both marker versions without upgrading, replaying movement or supply, or initializing a dispatcher. Full schema and committed dispatch/control boundary: docs/designs/expedition-programs.md.

Optional mobile religious references

The canonical greatHolyWar participant may carry mobileVow schema 1 with exactly leaderId, generation, hostId, joinedTurn, nullable endedTurn and active/interrupted/withdrawn status. The parent already owns campaign, realm and camp. Original referenced people, command and migration host identities must resolve; generation cannot exceed the saved ruler generation, and all committed dates must be within the saved turn. The record stores no copied army, contribution or reward. Terminal records remain in their original camp list, but contribute no active military eligibility. Optional absence retains legacy semantics.

A player pledge in mode mobile must carry mobileParticipation schema 1 with exactly actorId, realmId and participationId, which is null for a commander or references the original typed individual-admission story. Its landEligible field remains false. Matching restore retains personal obligations after absence, interrupted command or succession without creating admission, replacing leaders, raising an army or granting an award. It never marks a new mobile muster from the campaign phase alone. The existing v4/titleIds1/authoritySchema4/platformSchema2 envelope remains unchanged. Pure platform validation rejects malformed optional references before restore repair; campaign repair retains the canonical once-only settlement behavior.

Optional conserved production state

state.production version 1 stores a structural definition fingerprint, exact transaction revision/next local id, at most 128 original assets, 512 lots and 512 batch receipts. A physical building may carry productionAsset with exactly version 1 and its local asset id. Assets retain original declared site and owner; lots retain exact unit, original quantity, remaining stock and opening/batch provenance; batches retain actor/payer, original worker/generation, reserved input lot quantities, output lot ids, paid price, disposition, work turns, water claim/period and lifecycle chronology. Every local id is accounted for, input/output mass and stock equations remain bounded, and no worker supplies a second shift on one turn. Original opening inventory and realm-adoption aliases are checked without generating people or grants.

Validation runs in the detached platform boundary before state/RNG adoption. Legacy missing owners remain absent. Restore never enrolls an asset, creates opening lots, reserves/uses water, advances work, charges, refunds, produces, or prunes receipts. Existing removed or inactive property may retain truthful provenance; current authority is checked only by live transactions. Unchanged save envelope and subsystem versions retain their meanings. Exact field contracts and operational limits are in docs/designs/production.md.

Named camp and recovery records

household_party version 3 is optional for a mobile_camp request or a newly reviewed personal survivor recovery. A camp journey has schema 2 and preserves exact original personal-admission, realm, migration, commander, generation, requested/accepted turns and finite deadline. Requested family places are reserved separately from individual protagonist admission and shared across real host bindings. Named consent-backed members retain county checkpoints and care identities; released marks only an original protagonist whose independent personal carrier owns their location. This does not add population or overwrite permanent residences.

An optional recovery child identifies a new actual ordinary player.travel road and exact already-present people while preserving the original carrier. An ordinary version-2 journey upgrades to version 3 only on explicit survivor recovery and keeps its schema-1 journey/carrier. Detached validation checks optional fields, original consent, same personal binding, finite capacity, generation provenance, care, exclusive named claims, route adjacency and exact current road identity. Missing, malformed, erased and duplicated records fail before adoption. Matching restore performs no host decision, relocation, payment, renewed consent or successor enrolment. Unopted version-1 associations, ordinary version-2 journeys and the save envelope retain their existing formats.

Selected building identity

New selected construction adds only an optional buildingProfile record with exact v:1, id and definition fields. The definition fingerprints the complete profile and base; unknown versions, ids, wrong bases, stale fingerprints and extra fields reject before adoption. Required waterOperation and institutionBinding records remain canonical. Profiled water-service receipts retain the same optional original profile fingerprint for exact price validation after removal. Missing old markers preserve default building behavior and never acquire a profile on restore. Fort projects keep their quoted profile through ordinary completion without rechecking a closed construction window. No envelope version, stock initialization, payment or construction award is replayed. See docs/designs/building-profiles.md for scope.

Production economy receipts

state.production optionally contains economy with exactly version 1, definition and receipts. Economic receipts share production.nextId and revision; there is no second stock or profit owner. Each committed exchange links exact earlier source lots, original seller/buyer/person/generation/account identities, finite route demand/budget, a historical canonical unit-price quote and one new destination lot. Each actual seasonal producer receipt links the original enterprise, workers, owned asset and conserved output/proceeds quantities once per period. Incoming lots use typed exchange/producer receiptId origins, and original production conservation also counts exchange input consumption. Strict matching restore validates definitions, units, local ids, exact quantities, price equations, period limits and chronology without charging, renewing stock, harvesting or restoring authority. Legacy missing economy stays absent. See docs/designs/production.md and docs/MODDING.md for complete fields; no save envelope or existing subsystem version changes.

Economic receipts retain their original counterparty and worker character records through ordinary court compaction, so death or a changed ruler cannot erase the exact saved reference. Their retained history grants no successor authority.

Temporary shelter optional ledger

household_refuge world stories may own a strict version-1 finite provider ledger under state.stories. Its exact fields, original provider/party identities, independent personal/caregiver consent, authorized public debit provenance, deadlines, admitted physical witnesses and relevant incident references are documented in docs/MODDING.md. Parent validation rejects missing explicitly opted-in ledgers, shared-capacity overflow, duplicate live person reservations and duplicate site witnesses. Pending offers and archived inactive original providers survive matching restore as recorded. Structurally valid records that just lost current eligibility wait for the ordinary boundary. Ended protection does not clear a person's physical witness; only actual movement or a new confirmed term at the same seat releases it. No location, person, capacity reservation, payment, provider succession, consent or renewal is replayed. Unopted campaigns and the current save envelope retain their prior contract.

Seasonal building provenance

The optional state.buildingSeasons version 1 stores only bounded original operating-term markers and stock debit receipts, with no stock balance or population. Water and production owners retain their existing records. Strict detached validation checks structural fingerprints, historical local-kind and date bounds, exact original asset/actor/generation/source/lot identities, seasonal coverage of committed work, once-only ends/loss/allocation and conserved material/source use. Absence preserves legacy semantics. Matching restore never runs the daily boundary, closes work, renews capacity, credits stock or pays. Public field shapes and limits are in docs/MODDING.md and docs/designs/building-seasons.md.

Inherited profile provenance

Optional buildingProfile version 1 additionally admits inherited with exactly bookmarkId, revision, countyId and siteId. Its full definition stamp, same-base profile, explicit retain policy, original compiled placement and physical slot must match the saved campaign. Matching inherited assets may remain ruined, repaired, captured or dormant. Required water identities exist without a receipt at revision zero; inherited institutional property may await its first explicit binding and supplies no effect while unbound. Constructed institutional records retain their mandatory binding. Water receipts retain the original three-field profile/base definition stamp independently of placement provenance, including after removal. The openingInfrastructureState marker remains unchanged. Restore never installs an absent asset, initializes a source, confirms permission, renews a paid term or grants development; legacy reconstruction is skipped when explicit inventory or selected-profile provenance is present.

Optional siege equipment state

state.siegeSupport is optional version 1, with a structural definition fingerprint and at most 128 sequential local records. Each retains its profile, original realm/person/generation, exact host/war/siege county and occupation direction, original production asset/site/county, consumed lot quantities, load/expiry turns, bounded pulse turns and carried/spent/interrupted lifecycle. No stock is recreated on restore. Production conservation includes the original consumed quantities even after expiry, loss or war closure. Strict detached validation rejects wrong definitions, malformed/duplicate references, missing batch/work provenance, overconsumption, altered expiry, duplicate per-siege pulse turns, overlapping host carriage and contradictory lifecycle chronology before state/RNG adoption. Retained saves without the optional owner remain unchanged; a consumed production inventory cannot omit its corresponding receipts. Historical references survive current war/host removal and original people remain retained. See docs/MODDING.md for exact fields.

Maritime production invoices

Optional state.production.maritime version 1 stores only a structural definition and bounded original pending/cancelled/committed invoices. Exact asset, owned paid batch/lot, original worker/generation/payer, ordinary enterprise stage/price, reserved quantity, conservative credit, expiry and actual consumed launching period participate in the existing production local-id/revision and material-conservation equations. Erasing provenance, duplicate contributions, invalid units, excess value and unsupported public-to-private accounts reject before adoption. Original characters remain retained for receipt history. Matching restore never completes, pays, reserves, grants stock or substitutes a successor; absent legacy state stays absent. No envelope or existing subsystem version changes. Exact fields and bounds are in docs/MODDING.md and docs/designs/maritime-work.md.

Relay provenance

Optional production.relay version 1 shares production's existing ids, revision and stock conservation. It retains exact original consent parties/generations, finite terms, real army arrivals and once-only input, payment and carrying receipts. Validation rejects duplicate/missing references, altered units/prices, erased opted-in owners and unreconciled stock before adoption. Host loss, source demolition or principal death preserves immutable history without authorizing new withdrawals. Restore records no movement, permission, payment or resupply. See docs/designs/relay-provisions.md for bounds and full schema.

Optional material fort provenance

Mapped material forts reuse buildingProfile version 1, with the exact fort profile and canonical level table added only to their definition fingerprint. Active opted-in work carries strict optional fortProfileProject version 1 with profileId, fromLevel, targetLevel, startedTurn, completeTurn, repair, realmId, cost and work. It must match the ordinary fort project, retained level, duration and original payer/work facts. Completion/demolition remove pending provenance; matching restore never constructs missing projects, reschedules original material completion turns, initializes identities or grants payment/prestige. Other profile fingerprints, legacy forts, save envelopes and subsystem versions remain unchanged. Full invariants: docs/designs/fort-profiles.md.

Optional expedition preparation continuity

An attached expedition_preparation uses exact optional version-1 story records of original bindings/issuer/provider generations, finite reserved/consumed/released cohorts, current consent and one canonical formation receipt. Missing required records, including an erased stories object, fail the parent platform validator. An unformed mobile declaration may lack its mobile row only while its exact preparation is preparing or closed without a formed receipt. Matching restore retains reserves and historical loss/closure facts without creating, charging, consenting, moving or repairing anything. Mobile schema 3 and the existing save envelope remain unchanged. Exact fields and clocks are in docs/designs/expedition-preparation.md.

Optional expedition story intent

The expedition_program version-1 world-story record retains original preparation, command, program, actor and realm-generation references, a matching immutable formation reference, finite lifecycle/clocks, revision and lastActionTurn. It copies neither cursor nor operation receipts from the mobile owner. The required-parent and platform checks reject erased opted-in records, extra fields, retargeted identities and forged clocks before adoption. Matching and truthful stale-current saves restore without projection updates, formation, orders, vow admission, resources or replay. Exact fields and transition constraints are in docs/designs/expedition-story-programs.md; the envelope and existing mobile schemas are unchanged.

Water-service material receipts

The optional production.waterInputs version-1 journal records only actual committed canonical lot consumption for a paid water service. It shares production.nextId and revision, retains original actor/person/generation and exact receiving assignment and water asset/revision, and preserves prior records across service renewal or asset removal. Latest material receipts must match the ordinary water receipt. Production conservation includes all journal quantities alongside other consumers; strict chronology, exact original goods and local assets and monotonic identities are checked before adoption. Missing legacy state stays absent. A required missing ledger, fabricated debit, mismatched policy or reused stock rejects without construction, fuel manufacture, replay, payment or source renewal. The save envelope is unchanged.

Original guarded following party provenance

Opted-in schema-3 mobile rows may include a strict schema-1 guardedParty record. It preserves the full immutable declaration, ordered original character ids, original hosting actor/generation, finite clocks and guarded/expired/interrupted/released disposition. Restore rejects missing required or forged optional records, malformed revisions, changed source identities and any original party member in migration courtIds. It preserves historical authority after current political divergence and never initializes, releases, moves, selects or provisions. Released people retain subsequent ordinary personal residence and journeys. Omitted guard declarations retain absent legacy records. Exact fields and bounds are in docs/MODDING.md and docs/designs/mobile-guard.md.

Dispersed camp saves

Optional authority.governments[realmId].mobile.camps schema 1 owns ordered fixed-locality camp pools, local provisions, finite harvest cursors and demographic accounting. It is mandatory only for a matching mobile.civilianCamps declaration. The exact original ids, county/site, member order and initial allocations are checked, with bounded cohort/counter fields, empty legacy member pools, zero legacy food and conserved camp/global totals. Field hosts keep their existing inventories and rosters. Matching restore preserves spent stock, local losses, settlement, returned fighters and expired access without rebuilding any record. Older single-camp saves omit the field and retain their existing behavior. The save envelope version does not change. See docs/designs/dispersed-camps.md.
