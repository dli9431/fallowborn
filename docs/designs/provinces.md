# Provinces & the map

**Provinces have no drawn borders — and each is one county.** `js/world.js` rasterizes
the map at boot: scanline-fills the land polygons (Mercator projection from `js/util.js`),
then assigns every land pixel to the nearest county seed on the same authored land
polygon (~500 seeds — counties plus a handful of wastelands). Keeping seed competition
within a land polygon prevents island counties from acquiring disconnected mainland
fragments across water. A polygon without a seed falls back to unrestricted assignment
so mod-added scenery remains visible. The assignment scans an x-sorted seed window, so
the denser map costs no extra boot time. One polygon (Afro-Eurasia) spans every carved
sea, though, and nearest-seed ignores water: without correction a county wins the far
shore wherever it has no closer seed (Tangier held the Gibraltar shore, Mecca the
Nubian coast). So after assignment a shore pass hands every same-landmass fragment
disconnected from its seed to the neighboring county it actually borders — no 867
county spanned the Strait of Gibraltar, the Red Sea, or the Gulf of Bothnia — while
fragments on another authored polygon stay, preserving island gains through the
fallback (Venice's lagoon islands). Adjacency, coastal flags, and centroids are
derived from the corrected raster. Changing `FBDATA.provinces` (authored as compact rows in
`data/counties.js`) reshapes the map automatically.

A county's authored `terrain` (farmland, forest, hills, mountains, desert, steppe,
marsh, tundra) is load-bearing well beyond its map color: population carrying capacity
and market yields read it, and warfare reads it directly — battle quality per unit
class and the standing host's home-ground bonus at the battle county, the day cost of
marching into the county, and the supply drain of campaigning across it
(`balance.terrainBattleFactors`, `terrainDefenseBonus`, `terrainMarchMult`, and
`supplyDrainTerrain`; see [war.md](war.md)).

## County communities

A settled bookmark province has one principal culture and faith in its existing
`culture` and `religion` fields. It may also carry an ordered `communities` array of
`{culture, religion}` pairs. The first entry is always the principal population and
must repeat those two province fields; later entries are other historically grounded
local identities. `FB.provinceCommunities(province)` is the normalized read interface:
it returns the authored order, or a one-entry principal fallback when the optional
field is absent. Bookmark validation rejects an empty/non-array field, repeated pairs,
unknown cultures, invalid or unassignable faiths, and a first entry that disagrees with
the province.

New Game presents each pair as one coupled community choice. Changing counties resets
the choice to that county's principal entry, while returning to the same county keeps
the previous selection. The selected pair supplies names and the culture and faith of
the protagonist, parents, patronymic grandparents, siblings, and any starting spouse
and children. It is preserved in a non-principal start code rather than in a new save
field; the generated character records remain authoritative after play begins. County
selection and the Land panel show every authored pair in order.

The model is deliberately static. Communities have no percentages, conversion,
migration, unrest, revolt, or daily/seasonal demographic work. Existing county,
realm, title, intrigue, advancement, and war mechanics continue to read only the
principal province identity. They already provide the route by which a character from
another local community can gain power beneath or displace a foreign ruler. The 144
core bookmark-county records and their evidence are listed in
[county-communities.md](../research/county-communities.md).

Technology impact: `county_community_identity` is `none`. Selecting an existing local
identity is baseline character creation, not an advanced capability that research
could credibly gate.

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
too few named places, the remaining slots keep generated names. Because the
geodata is modern, the import's `HISTORICAL_NAMES` table swaps later names for
the settlement's well-attested medieval identity (the modern Milton Keynes and
Bletchley records resolve to one 'Bicchelai'; 'Tel Aviv' → 'Jaffa').
`POST_MEDIEVAL_NAMES` rejects a candidate that has no defensible medieval
identity. GeoNames `PPLX` city-section records are excluded at ingestion, and
`NON_SETTLEMENT_NAMES` rejects remaining modern districts and geographic
labels. This allows the next ranked known place to fill the slot; if none remains,
the normal generated fallback is preserved.
The county-head entry is exempt and keeps the county's name.

At world compilation (`compileSites` in `js/world.js`) every settled county receives an
ordered record list: authored slots first (never renumbered), then deterministic
generated slots filling to the maximum eight so a development reveal never projects
during play. Authored coordinates project into the declared county's raster, snapping
to the nearest in-county cell when the simplified boundary requires it (displacement
beyond 45 world px is an activation error), then keeps a two-cell land margin from
the sea: a coastal-edge cell leaves the emblem hanging over the smoothed coastline,
so the point first walks toward the county centroid and then, where a concave coast
blocks that ray, searches its own connected county fragment for clear land (the
original cell stands only for islets and one-cell coastal strips). Generated slots keep the legacy plain-hash
culture naming exactly (`FB.settlementName`, `FBDATA.settlementNames` in cultures.js)
and take deterministic in-county points that spread across the county — each slot
draws its own hash-derived angle and radius band scaled to the county, keeping a few
cells clear of the other sites where the county allows it instead of stacking on the
centroid, then take the same inland nudge off coastal-edge cells. `FB.settlementsOf(state, pid)` is the unchanged
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
authorization inside the sheet. The county-wide commodity Market shortcut appears only
on the county-head sheet (index 0); secondary settlement sheets remain scoped to their
own buildings and property. The explicit county-targeting modes (travel,
armies) still receive the parent county. The new-game pick is the one
exception: it is two stages — a county tap zooms into the county (zoom 14, so
its settlements draw with emblems and labels straight from the compiled
bookmark data), and a second tap on a marker in the chosen county, or the
matching button in the pick bar, settles the birthplace slot. The slot is
stored as `player.homeSettlement` (0, the county head, is the default and the
only value older saves know), steers the farmer start's plot, and spells the
optional eighth start-code part ([seeds.md](seeds.md)). The go-into-town deed queues
`visit_*` events (events_common.js) with the name in `ctx.settlement` (`{settlement}`
token); options are require-gated by station.

A fort keeps its exact settlement visible even when later development loss would hide
that slot under the normal reveal thresholds. The same landmark rule protects the
player's stake in a county: any standing building, any family enterprise, and the
player's home settlement each floor the visible count at their slot
(`FB.settlementVisibleCount`), so development decline can never make an invested or
home settlement vanish; ruins and sold enterprises release the anchor. `mapview.js` draws one additional badge
over the existing settlement emblem rather than a second marker or altered site-art
cache: a shield-like outline plus one to four repeated marks encodes tier without color,
and a crossed corner encodes active construction. `FB.fortBadgeDescriptor` is the
accessible/testable projection behind that drawing. County settlement links repeat a
compact tier/construction mark in ordinary DOM text.

Related: [realms.md](realms.md) for who owns a province; `docs/MODDING.md` for the
province/county data schema.

## Wasteland conversion during play

Wasteland provinces are impassable scenery at world build: they receive no
settlement compilation, no population record, no market row, and no de jure
duchy. Two player paths can convert one into a real county during play, and
both go through the single authoritative helper `FB.materializeWasteland(state,
pid, {culture, religion, holderId, ownerId})` in `js/world.js`. It clears the
wasteland flag, stamps the settlers' culture and faith, sets development 1,
assigns the political holder and sovereign owner, compiles the county's
deterministic generated settlement slots on the spot
(`FB.worldCompileSettlements` — the per-province half of `compileSites`,
extracted so boot and conversion share one code path; the slots are named in
the new settler culture), invalidates the realm caches, drops the market
province cache (`FB.marketWorldDirty`, so the next `ensureMarket` rebuild
seeds the new county while preserving existing rows), redraws the map, and
writes the two shared Chronicle descriptors. The county keeps the wasteland's
lack of a duchy, so it stays outside every de jure duchy, kingdom claim, and
title majority forever. Population and market records then attach through
their ordinary lazy ensure paths; the army route search reads the wasteland
flag live, so the new county becomes marchable at once without rebuilding the
per-world path caches.

The noble caller is the `settle_waste` deed (`FB.settleWaste`), which passes
the player as holder, adds the county to `player.provs`, and pays
`balance.settleGold`/`settlePrestige` — costs and political result unchanged
by the refactor. The commoner caller is the frontier-homestead journey (see
[travel.md](travel.md)), which passes the gateway county's live political
holder and sovereign and grants the household only starter land plots.

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

It may independently carry the ordered `communities` list described above. Community
identity is bookmark-local even when a county id endures across dates; changing one
bookmark's list never mutates the other bookmark's array.

`straits` remain exact two-county adjacency pairs used by every reachability consumer.
The optional `crossingClasses` bookmark object annotates canonical `countyA|countyB`
pairs as `narrow`, `coastal`, or `open` for army logistics only. Activation validates
that each key is sorted, references an existing strait, and uses a supported class;
missing entries default to `narrow`. Raster compilation keeps the edge in unchanged
`FB.world.adj` and also records its class symmetrically in `FB.world.waterAdj`, exposed
through `FB.waterCrossing`. Personal travel, political adjacency, and other plain path
callers therefore retain their old behavior.

The authored coastline, inland seas, rivers, and projection bounds are shared because
the physical map window is the same. One land polygon is a deliberate geographic
exception to the simplified coastline: Venice's lagoon barrier islands sit just off
the lagoon-mouth coast vertex as their own tiny landmass. They carry no county seed,
so the unseeded-landmass fallback assigns every island pixel to the nearest seed —
Venezia's — and the county keeps its mainland strip while gaining the island; the
curated Venice site (its one deliberately non-real coordinate) sits on the island,
and the settlement sea-margin walk never crosses water to drag it back ashore.
`FB.activateBookmark` validates the complete
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

## County population & lightweight demographics

Each inhabited county tracks an integer civilian population record in `state.population.counties[pid]` (`js/population.js`).
- **Baseline opening population**: Authored in bookmark province `population0`, or derived from deterministic fallback:
  `pop0 = Math.max(1000, Math.round((populationByDevelopment[dev0 - 1] * terrainFactor) / 100) * 100)`.
- **Carrying capacity**: Authored in bookmark province `populationCapacity0`, or derived from `cap0 = Math.max(pop0, Math.round((pop0 / 0.85) / 100) * 100)`.
  Adjusted by county buildings (Watermill +5%, Harbor +3%, max +40%) and national technology (`crop_rotation`, `heavy_plough`, `three_field`, etc., max +35%).
- **Annual simulation pass**: Zero-RNG logistic natural growth bounded by pressure $(1 - P / K)$ within $[-1\%, +2\%]$, and conserved land migration across non-hostile borders when attraction differential $\ge 2$. Attraction combines county buildings, national technology, occupancy, war, and market shocks with the player realm's standing settlement policy ([council.md](council.md)); the policy shifts only the draw of player-owned counties and never moves a population record directly.
- **Economic & military factor**: $\text{clamp}(\sqrt{P / P_0}, 0.50, 1.50)$ scales county tax base, direct & vassal levies, and market household demand.
- **War & siege mitigation**: Hostile captures cause $-2\%$ population loss, mitigated by fortification strongpoints ($0\%, 10\%, 20\%, 35\%, 50\%$ for fort tiers 0–4).
- **Settlement allocation**: On-demand display projection weights sites (village 1, town 3, city 7 + 1 per economic building), summing exactly to total county population.
