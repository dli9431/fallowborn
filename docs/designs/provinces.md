# Provinces & the map

**Provinces have no drawn borders — and each is one county.** `js/world.js` rasterizes
the map at boot: scanline-fills the land polygons (Mercator projection from `js/util.js`),
then assigns every land pixel to the nearest county seed (~500 seeds — counties plus a
handful of wastelands; the assignment
scans an x-sorted seed window, so the denser map costs no extra boot time). Adjacency,
coastal flags, and centroids are derived from that raster. Changing `FBDATA.provinces`
(authored as compact rows in `data/counties.js`) reshapes the map automatically.

**Settlements are derived, not stored.** `FB.settlementsOf(state, pid)` (world.js)
generates 2–4 named places per province from a plain string hash (never the seeded RNG)
and `FBDATA.settlementNames` (cultures.js); size tracks current dev (village→town→city).
The go-into-town deed queues `visit_*` events (events_common.js) with the name in
`ctx.settlement` (`{settlement}` token); options are require-gated by station.

Related: [realms.md](realms.md) for who owns a province; `docs/MODDING.md` for the
province/county data schema.

## Start bookmarks

`FBDATA.bookmarks` holds complete, atomic world definitions. The 867 entry retains the
legacy `FBDATA.provinces` array as its public source, while 1066 has an independent
province snapshot in `data/bookmarks.js`. Province ids endure across bookmarks wherever
the county seed represents the same place; an id is never reassigned to a different
place. Each definition also owns its terrain, culture, faith, development, de jure
duchy, owner, straits, realms, hierarchy, and scripted history.
It may also map exact centralized faith offices to bookmark-local realm ids through
`religiousHeads`; activation validates those ids against both the religion table and
the bookmark's authored realms.

The authored coastline, inland seas, rivers, and projection bounds are shared because
the physical map window is the same. `FB.activateBookmark` validates the complete
definition, installs it in the legacy top-level fields, and lazily caches one raster per
bookmark id. Switching dates replaces `FB.world` and the map's backing canvases but
does not install a second set of pointer or keyboard listeners.

**Selection highlights are group-aware.** `FB.map.select(pid, groupOf)` (mapview.js) lights
up every province sharing the clicked one's group key (strong tint + golden outer border).
`groupOf` comes from `mapGroupOf` in ui.js and follows the map filter (`R` key / 🗺 HUD
button): **Realm** (default — your own province lights your own realm, demesne + vassals;
a foreign one lights its sovereign's), **Mine** (only your realm), **Liege** (your liege's
whole sub-realm), **De jure duchies**, and **De jure kingdoms** (the historical de jure
groupings). Membership walks `FB.liegeChain` over `state.holder` for the realm-based modes.
