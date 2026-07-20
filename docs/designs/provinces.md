# Provinces & the map

**Provinces have no drawn borders — and each is one county.** `js/world.js` rasterizes
the map at boot: scanline-fills the land polygons (Mercator projection from `js/util.js`),
then assigns every land pixel to the nearest county seed (~480 seeds; the assignment
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
