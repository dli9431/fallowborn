# Game state & saves

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
version or migration is required.

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

County population is additive save-format-3 data (`state.population = { schema: 1, lastYear, counties: { [pid]: { count, natural, migration, losses } } }`).
`FB.ensurePopulationState` lazily backfills older saves or fresh game states without a save-version bump:
- Baseline populations scale proportionally with current development and standing building capacity bonuses.
- Restored records clamp to carrying capacity and enforce `populationFloor` (1000).
- Annual simulation records `natural`, `migration`, and `losses` per county.
- No transient calculations, edge allocations, or prose strings enter serialized state.

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
The succession `heirId` is omitted when it exactly matches the first id in canonical
`order`, then restored from that order at the load boundary.
`S.restore` expands the full live shape before the ordinary ensure chain, so uncompressed
older version-3 saves pass through unchanged. The replacer never mutates running state.
It also gates record-shape detection by the small set of keys that can actually be
omitted: ordinary properties pass straight through instead of testing whether their
holder resembles a character, realm, court member, building, and technology record.
This keeps the wire form identical while bounding the per-property work of routine
seasonal snapshots.

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
the raster is rebuilt deterministically at boot, so saves only reference ids.
`state.start:{id,year,season,day}` identifies the bookmark and campaign origin. Loading
first inspects that field, activates the matching complete world, and only then restores
state and RNG. A missing field means the legacy 867 bookmark, preserving every old
version-3 slot and export. A bookmark hidden from new-game choices by an incompatible
legacy map mod remains addressable for a matching stamped save.
Saves are
version 3; older saves are rejected. Raising that save-format version rejects every existing
life, so it is a deliberate, owner-reviewed decision — never a routine bump, and separate
from the displayed `FB.VERSION` (see [../VERSIONS.md](../VERSIONS.md)). The additive-migration
discipline throughout this doc is what lets new state land without touching it. A boot-time probe (`S.available`) detects browsers
that refuse localStorage outright (iOS in-app webviews, blocked cookies) so the UI can
warn instead of failing silently; ephemeral storage (private mode, third-party-iframe
eviction) passes the probe. For those, `S.exportState` / `S.parseExport` carry a life
as compressed base64 text (`FBS2.` prefix, same v3 payload). Save Game downloads that
payload as a `.txt` file, and Load Game reads it with `FileReader` before waking it through
the same `G.loadData` path as a slot load and planting it back into the autosave slot.
The visible text and paste path remain as fallbacks, and the legacy uncompressed `FBS1.`
form remains importable forever. The ☰ menu's
🐞 Report-a-bug dialog (`UI.showReport`) reuses that export: the copied report bundles the
player's description (bug or suggestion) with `FB.VERSION`, `state.seed`, the mod signature,
and the current life as `FBS2.` text, so a reported moment can be reopened exactly through
Load save file's paste fallback.

Management protections are additive player state at save format 3:
`player.protections[scope]` is an array of stable string ids. The built-in scopes are
`grantCounty` and `autoBuildCounty` (province ids), `equipmentItem` (exact item references),
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
compaction; the complete serialized-life budget is 1.6 MB. The player's wider family
is bounded at creation instead, because dead kin are never pruned (the family tree is
the product). Two balance knobs do the bounding
(see [../MODDING.md](../MODDING.md)): `kinConceiveCap` keeps stacked fertility
multipliers a probability rather than a certainty, and `familyMaxChars` caps total
tracked family records — past it, unscripted kin weddings and kin births pause, so an
over-cap save stops growing instead of failing. On top of that bounding, manual slots
are stored LZ-compressed (`FBC1.` prefix packing the bit stream into storage-safe
UTF-16; an lz-string port private to `js/save.js`), which shrinks each ~1.6 MB
serialized life several-fold. The frequently replaced autosave is normally stored as
ready plain JSON, keeping its worst-case footprint plus three compressed manual slots
within the WebKit budget. This deliberately removes the full compression-and-
verification pass from every season boundary; if the plain autosave write encounters
quota pressure, that exceptional write retries with the verified compressed encoding.
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
as News. Chronicle filter selection and unread state are not saved. The saved log still
caps at 300 entries; each UI filter independently shows its newest 80 matches.

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
character solely for the family-tree jump. Older saves need no migration: the UI
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
charges no upkeep. New construction with a definition-level `dev` effect saves the exact
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

Paid enterprise-worker contracts are additive compact records in
`player.enterpriseLabor` as `{charId,enterpriseUid,pay,startedTurn,unpaid}`. Missing arrays
mean no contracts. Normalization discards dead, duplicate, or orphaned contracts and
removes their assignment; valid contracts and their named characters pass through ordinary
save, succession, and papal custody paths.

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
Switching arrangements leaves `schoolTerms` intact; the annual schooling pass consumes and
resets the map after resolving moddable mortality and story fields. `state.schoolingLastEvent`
stores the last annual schooling event id solely to prevent an immediate story repeat across
years and protagonist succession. Missing fields mean home instruction, no exposure, and no
previous story. A legacy generated hired tutor is recognized by its character role and
lazily gains `school:'master'`; no save-version migration is required.

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
`player.matchPolicy:{enabled,minStation,maxDowry,maxGold,maxPrestige}` belongs to the
household and survives protagonist succession. Missing or invalid state normalizes to a
disabled policy with no caps; finite limits clamp to their valid non-negative ranges. An
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
by role) have a father and mother synthesized on load — long dead, ages
fitted to the oldest child — so the family tree shows them instead of an
"Unrecorded" ghost (`backfillParents` in `js/save.js`).

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
