# Game state & saves

**Game state is one serializable object** (`FB.state`), created in `js/main.js`. Political
ownership lives in `state.owner` / `state.holder` / `state.dev` / `state.realms`, not in
world data. `js/save.js` snapshots `FB.state` + RNG state + uid counter to localStorage;
the raster is rebuilt deterministically at boot, so saves only reference ids. Saves are
version 3; older saves are rejected. A boot-time probe (`S.available`) detects browsers
that refuse localStorage outright (iOS in-app webviews, blocked cookies) so the UI can
warn instead of failing silently; ephemeral storage (private mode, third-party-iframe
eviction) passes the probe — for those, `S.exportState` / `S.parseExport` carry a life
as base64 text (`FBS1.` prefix, same v3 payload) that wakes through the same
`G.loadData` path as a slot load and is planted back into the autosave slot. The ☰ menu's
🐞 Report-a-bug dialog (`UI.showReport`) reuses that export: the copied report bundles the
player's description (bug or suggestion) with `FB.VERSION`, `state.seed`, the mod signature,
and the current life as `FBS1.` text, so a reported moment can be reopened exactly via Import.

`state.legends` records each player character at death (`js/main.js` `recordLegend`):
id, name, born/died years, a semantic `titleData` snapshot, and locale-neutral `causeMsg`
and `quipMsg` descriptors. The quip choice is rolled once from traits, stats, and cause of
death, but its text is rendered in the currently selected locale. The end screen
(`UI.gameOver`) also accepts legacy rendered `title`, `cause`, and `quip` fields, so no save
migration is required.

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

`state.seed` records the start code the life began with ([seeds.md](seeds.md)); saves
from before it existed simply hide the seed row in the menu.

Personal court standing stays on `state.player`: `warService` records service in the
current character's liege wars and `liegeGrants` records successful feudal patronage
in the current lifetime. Both reset on succession. Older saves need no migration;
the grant multiplier treats a missing `liegeGrants` as zero.

`player.foreignPolicy` stores the current ruler’s political-attention assignments as
realm-id keys with `1` (Improve) or `-1` (Provoke). It is lazily initialized, so older
version-3 saves need no migration, and invalid/dead/non-adjacent targets are discarded at
the seasonal tick. The object and the player-relative `liegeOps` opinion network clear on
succession; `state.pacts` remains state-level and survives.

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

Related: [mods.md](mods.md) for how saves are stamped with the active mod set, and
[i18n.md](i18n.md) for the message-descriptor shape behind structured chronicle entries.

Saves from before parents were recorded (first-generation siblings known only
by role) have a father and mother synthesized on load — long dead, ages
fitted to the oldest child — so the family tree shows them instead of an
"Unrecorded" ghost (`backfillParents` in `js/save.js`).
