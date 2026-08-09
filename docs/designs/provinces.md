# Provinces & the map

**Provinces have no drawn borders — and each is one county.** `js/world.js` rasterizes
the map at boot: scanline-fills the land polygons (Mercator projection from `js/util.js`),
then assigns every land pixel to the nearest county seed on the same authored land
polygon (~500 seeds — counties plus a handful of wastelands). Keeping seed competition
within a land polygon prevents island counties from acquiring disconnected mainland
fragments across water. A polygon without a seed falls back to unrestricted assignment
so mod-added scenery remains visible. The assignment scans an x-sorted seed window, so
the denser map costs no extra boot time. Adjacency, coastal flags, and centroids are
derived from that raster. Changing `FBDATA.provinces` (authored as compact rows in
`data/counties.js`) reshapes the map automatically.

**Settlements are derived, not stored.** Two identities exist. The settlement *slot* —
the zero-based index inside one county — remains the canonical saved reference for
buildings, plots, manors, and enterprises. The physical *site* is a stable snake-case
slug with one longitude/latitude in the shared `FBDATA.settlementSites` table
(`data/settlements.js`); it is derived world data and never enters a save. A bookmark
county may author a complete ordered `settlements` list of up to eight `{site, name,
kind}` presentations (index 0 is the county head; the name is a historical proper name,
never localized; the kind is the bookmark baseline that live development may promote
but never undercut). `data/settlements.js` authors both core bookmarks — every realm
capital, faith seat, major port, high-development city, and place named by existing
game content — and clones the lists onto the already-built bookmark province objects.
The generated companion `data/settlements_real.js` (built by
`tools/settlement_import.py` from the GeoNames database, CC BY 4.0)
appends real-world presentations after the curated lists with `fill: true`: a fill
entry replaces a slot's generated name/location but does not force early visibility —
development reveals it on the normal thresholds. Counties with no curated list also
gain a county-head entry named after the county itself; where the geodata offers
too few named places, the remaining slots keep generated names.

At world compilation (`compileSites` in `js/world.js`) every settled county receives an
ordered record list: authored slots first (never renumbered), then deterministic
generated slots filling to the maximum eight so a development reveal never projects
during play. Authored coordinates project into the declared county's raster, snapping
to the nearest in-county cell when the simplified boundary requires it (displacement
beyond 45 world px is an activation error). Generated slots keep the legacy plain-hash
culture naming exactly (`FB.settlementName`, `FBDATA.settlementNames` in cultures.js)
and take deterministic in-county points that spread across the county — each slot
draws its own hash-derived angle and radius band scaled to the county, keeping a few
cells clear of the other sites where the county allows it instead of stacking on the
centroid. `FB.settlementsOf(state, pid)` is the unchanged
public projection: the visible count follows the legacy rule (2 + a hash bit, +1 at
development 3, 5, 7, and 9) raised to the curated (non-`fill`) authored count, and each record carries `{site, name, kind, x, y,
authored}` — callers reading only `name`/`kind` are unaffected. Kind thresholds: the
head becomes at least a town at dev 4 and a city at 7, the second slot at least a town
at 6, never below the authored baseline. `FB.settlementDevelopment` reports the next
threshold that will actually change something, skipping thresholds an authored baseline
already satisfies. `FB.siteVisible`/`FB.siteKindRank` give the map renderer an
allocation-free visibility/kind read per compiled record.

Close zoom adds a settlement marker layer (`js/mapview.js`), gated so ordinary map
movement never pays for it: nothing below zoom 6, county heads and authored cities as
bare shape-coded markers (never color alone) from zoom 6, every visible settlement as
a procedural emblem generated from the site slug (`js/siteart.js` — cottages, a
towered town, or a walled city per live kind) from zoom 12 with its name label,
deterministic label-collision rejection that treats drawn emblems as obstacles,
county labels stepping aside where they collide, a flat per-county backdrop with
anti-aliased vector county borders from zoom 6, and an 80x maximum zoom for dense
clusters.
Tapping a marker in ordinary
browsing selects its parent county and opens the universal settlement sheet
(`UI.showSettlement`), which is read-only abroad and keeps its construction/demolition
authorization inside the sheet; every explicit county-targeting mode (new-game pick,
travel, armies) still receives the parent county. The go-into-town deed queues
`visit_*` events (events_common.js) with the name in `ctx.settlement` (`{settlement}`
token); options are require-gated by station.

Related: [realms.md](realms.md) for who owns a province; `docs/MODDING.md` for the
province/county data schema.

## Start bookmarks

`FBDATA.bookmarks` holds complete, atomic world definitions. The 867 entry retains the
legacy `FBDATA.provinces` array as its public source, while 1066 has an independent
province snapshot in `data/bookmarks.js`. Province ids endure across bookmarks wherever
the county seed represents the same place; an id is never reassigned to a different
place. Each definition also owns its terrain, culture, faith, development, de jure
duchy, owner, straits, crossing classes, realms, hierarchy, and scripted history.
It may also map exact centralized faith offices to bookmark-local realm ids through
`religiousHeads`; activation validates those ids against both the religion table and
the bookmark's authored realms.

A bookmark province may additionally carry an ordered `settlements` presentation list
authored in `data/settlements.js` (or supplied complete by a mod): the same physical
site keeps one slug and one coordinate in the shared `FBDATA.settlementSites` table
across bookmarks while its displayed name and baseline kind stay per-bookmark. The two
core bookmarks hold independently cloned arrays, so replacing one never mutates the
other. Activation validates the table and every list (slug form, coordinate ranges,
existing site references, at most eight entries, no repeated site or name within a
county, no site assigned to two counties in one bookmark, none on a wasteland) before
raster compilation checks county membership.

`straits` remain exact two-county adjacency pairs used by every reachability consumer.
The optional `crossingClasses` bookmark object annotates canonical `countyA|countyB`
pairs as `narrow`, `coastal`, or `open` for army logistics only. Activation validates
that each key is sorted, references an existing strait, and uses a supported class;
missing entries default to `narrow`. Raster compilation keeps the edge in unchanged
`FB.world.adj` and also records its class symmetrically in `FB.world.waterAdj`, exposed
through `FB.waterCrossing`. Personal travel, political adjacency, and other plain path
callers therefore retain their old behavior.

The authored coastline, inland seas, rivers, and projection bounds are shared because
the physical map window is the same. `FB.activateBookmark` validates the complete
definition, installs it in the legacy top-level fields, and lazily caches one raster per
bookmark id. Switching dates replaces `FB.world` and the map's backing canvases but
does not install a second set of pointer or keyboard listeners.

At minimum zoom, a mobile viewport can be larger than the permitted map span on one
axis. `mapview.js` centers that surplus axis instead of passing reversed bounds to the
pan clamp; dragging therefore remains stable while the other axis can still move.

**Selection highlights are group-aware.** `FB.map.select(pid, groupOf)` (mapview.js) keeps
the political and terrain colors of every province sharing the clicked one's group key,
places a cool shade over other land, mutes outside labels, and traces both the group's
perimeter and the exact selected county with zoom-independent two-tone lines — crisp
pixel-edge outlines at ordinary zooms, swapped in the close-zoom band for smoothed
marching-squares contours that coincide with the vector county borders. The accent
is a browser-local preference. It also supplies the independent player realm's displayed
political color without changing the saved realm color; other realms retain their authored
colors. A second browser-local opacity preference scales that color's contribution from
terrain-only to the full political mix, while leaving the outline clear. The dark/light
keyline keeps arbitrary chosen colors legible. `groupOf` comes from
`mapGroupOf` in `ui_panels.js` and follows the map filter (`R` key / 🗺 HUD button): **Realm** (default —
your own province focuses your realm, demesne + vassals; a foreign one focuses its
sovereign's), **Mine** (only your realm), **Liege** (your liege's whole sub-realm),
**De jure duchies**, and **De jure kingdoms** (the historical de jure groupings).
Membership walks `FB.liegeChain` over `state.holder` for the realm-based modes.
