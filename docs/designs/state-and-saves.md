# Game state & saves

Religious-head state is additive and keeps save version 3.
`state.religiousHeads` maps an exact religion id to a realm id or to `null` for an
explicit vacancy. New games seed missing entries from optional
`bookmark.religiousHeads`, falling back to `FBDATA.religions[id].head.realm`; this lets
867 and 1066 use different canonical realm ids. `state.religiousHeadVacancies` maps a
vacant exact religion id to `{turn,formerHolder}`, where `formerHolder` is the old realm
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

Player title snapshots may add `headReligion` and `headTitle`. The former selects the
stable religion-owned catalog key and the latter is its English fallback, so save-slot
metadata, legends, and structured messages can render Pope or Caliph in the active
locale without storing rendered prose. A snapshot records the office held at that
moment; rendering it later does not consult the live assignment.

Dynastic diplomacy is additive and does not change save version 3.
`realm.succession` holds lightweight royal members and a ruler-generation identity;
materialized characters point back through `char.royalLine`.
`state.alliances` holds canonical, generation-stamped defensive realm pairs.
`player.royalCompact` identifies the current protagonist's one royal marriage compact,
and `player.fabricatedClaim` holds the single `{pid, madeTurn}` county claim.
`player.war.casus` records the semantic cause selected for a new war, while a displaced
rightful character may carry one `restorationRight`. `FB.ensureDynasticState`,
`FB.fabricatedClaimOf`, and the normal load repairs lazily initialize and validate all
of these fields, so older version-3 saves require no migration.

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
eviction) passes the probe — for those, `S.exportState` / `S.parseExport` carry a life
as base64 text (`FBS1.` prefix, same v3 payload) that wakes through the same
`G.loadData` path as a slot load and is planted back into the autosave slot. The ☰ menu's
🐞 Report-a-bug dialog (`UI.showReport`) reuses that export: the copied report bundles the
player's description (bug or suggestion) with `FB.VERSION`, `state.seed`, the mod signature,
and the current life as `FBS1.` text, so a reported moment can be reopened exactly via Import.

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

Item/equipment state is additive and keeps save format 3. Repeatable objects live in
`state.itemInstances[ref] = {defId,quality,visualSeed,motif?}`; `player.items` is the
shared armory's exact-reference list and `player.loadouts[characterId]` maps the eight
equipment slots to those references. `FB.ensureItems` runs on restore. It treats bare
legacy ids as stable implicit instances, converts the five former ordinary heirlooms to
Plain without changing their old value/effect, moves current-household `c.items` into the
armory, validates old/new assignments, and auto-equips the current head in inventory
order (right hand before left). Existing collateral ids remain valid. This repair uses
stable hashes for legacy appearance and consumes no saved RNG.

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

The selected locale (`fb_lang`) is browser-local display preference in `localStorage`, not
part of `FB.state`, a save slot, a start seed, RNG state, or deterministic simulation state.
Save metadata stores `titleData` and renders its slot label in the locale active at display
time; older metadata with a frozen `title` remains readable.

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

`player.gentryGeneration` is additive dynasty standing: it records the generation in
which the house first reached tier 2 and persists through succession. Ordinary barony
patronage requires that value to be lower than `state.generation`. Tier-2+ scenarios
start established (`0`); older saves without the field are also treated as established,
so the balance gate never retroactively strands an existing gentle house.

`player.foreignPolicy` stores the current ruler’s political-attention assignments as
realm-id keys with `1` (Improve) or `-1` (Provoke). It is lazily initialized, so older
version-3 saves need no migration, and invalid/dead/non-adjacent targets are discarded at
the seasonal tick. The object and the player-relative `liegeOps` opinion network clear on
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
fields. `player.travelHistory` stores completed purpose/destination pairs for the
current character. `player.travelSettlement` records the current character’s one
completed permanent move as `{turn,destinationId}`. All initialize lazily without
changing the save version. Succession cancels an active journey and clears both the
new character’s lifetime history and permanent-move marker; the household home remains
`player.provinceId` unless an eligible destination stay explicitly settles there.

`state.buildings[pid]` entries are shaped `{ s: settlementIndex, id, ruined? }`
(per-settlement buildings — see [development.md](development.md)); `ruined:true` is an
optional backwards-compatible tombstone that occupies the slot but provides no bonus and
charges no upkeep. Saves old enough to hold bare id
strings are NOT rejected: `FB.builtIn` migrates them lazily in place at first touch,
landing the old buildings in the head settlement (`s: 0`) — the same no-version-bump
pattern as the other lazy inits.

Livelihood state is additive and does not raise the save-format version. Careers live on
characters; repeatable enterprises live in `player.enterprises`. Old characters gain a
career deterministically from the current compatibility profession/station when first
read. Old business-like holdings migrate once into enterprise instances in the home
settlement, while all other holdings remain unchanged.

Maintained household standards are additive and keep save format 3.
`player.householdStandards` is a plain definition-id to numeric-level map. Missing state
means every standard is at baseline level zero; `FB.ensureHouseholdStandards` creates the
map lazily and clamps known entries to their current moddable definition. Purchased levels
pass unchanged through succession because the player household object persists. Rank or
worker dormancy changes neither the map nor the save shape. No active-effect total,
seasonal upkeep total, localized level name, or travel modifier is serialized.

Network state is additive and lazily validated. `player.friendContacts` maps known
character ids to current-life contact timestamps; the canonical friend remains
`state.roles.friend` for events and mods. `player.socialAttention` is a character-id-keyed
assignment map (one entry with core balance) and `player.socialGiftTurns` stores the last
explicit cash-or-item gift turn per recipient for the current life. Invalid and dead
references are discarded lazily. `player.retainers` stores compact
`{charId,office,pay,startedTurn,unpaid}` contracts, while every personal attribute
remains on the referenced character. `player.guildFavorTurns` bounds guild calls by
character and `player.vassalLevyFavors` maps realm ids to expiry turns. Succession clears
friendship, cultivated contacts, social attention, gift clocks, and exceptional vassal
favors, but retains paid service contracts with a loyalty penalty. Permanent relocation
also clears friendship, contacts, courtship, and attention. Restore converts an old active
`court_suitor` focus into attention on its living suitor and selects an ordinary valid
focus. All missing or invalid fields self-heal without a save-version migration.

Position definitions and the levy ledger are derived data. Earned offices continue to
read compatibility flags, retainer contributions read live contracts, and
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

Finance state is additive too. `FB.ensureEconomy` lazily supplies `state.economy` with the
price index, persistent pressure and shocks, loans, trade investments, stable contract ids,
default history, and coinage history. Every record is plain JSON, so slots, autosave,
export/import, and succession preserve exact faces, denominations, deadlines, pledges, and
already-resolved investment outcomes without a save-version bump. An older save starts at
price 1 and is first revalued on its next annual tick; no historical inflation is invented.

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
mandatory-defense status, and territorial eligibility.

`FB.repairGreatHolyWar` runs before `FB.repairWars` on restore. Missing fields on old
saves initialize lazily; malformed ids, phases, objectives, occupations, participants,
and pledges are discarded or clamped without rendering prose. Army repair then keeps
at most one host for every living active sovereign participant. Preparation and
settlement do not preserve field hosts. Contribution belongs to the campaign rather
than the current character, so it persists across protagonist succession.

Saves from before parents were recorded (first-generation siblings known only
by role) have a father and mother synthesized on load — long dead, ages
fitted to the oldest child — so the family tree shows them instead of an
"Unrecorded" ghost (`backfillParents` in `js/save.js`).
