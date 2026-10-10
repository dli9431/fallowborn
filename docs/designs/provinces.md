# Provinces & the map

Period presentation

FBDATA.architectureStyles in data/eras.js owns settlement palettes and named shapes. FB.architectureStyle reads the county's culture, including inherited and campaign-founded culture definitions, then the campaign's stamped era, then manuscript. The map resolves the live principal culture through FB.countyCulture once per visible county per detailed frame, so community-driven identity changes update settlement art while the bookmark province retains its original culture. This changes only drawing, with no technology or gameplay eligibility effect.

The shape library in js/siteart.js supplies pitched, flat and villa dwellings, spire, dome and basilica worship buildings, and crenellated, palisade or castra fortifications. Basilica uses a low aisled hall and clerestory in place of the tall medieval tower; castra uses lower square towers and plain parapets. Villa adds a tiled roof and shaded portico. A style can override only the palettes or shapes it needs; the rest retain manuscript defaults. One fixed canvas is cached per physical slug, live kind, resolved style and effective palette/shape data. Zoom remains outside the cache key. Live style edits and period switches cannot reuse old art. The default palettes, drawing paths and slug hash retain the original 867/1066 pixels; presentation consumes no gameplay RNG.

House art uses an era's emblem selection: heraldry, standard, chi_rho or tamga. FB.drawCrest remains the shared renderer for house cards, realms, the topbar and player hosts; those retained crest caches include the resolved style. House identity remains the existing dynasty or realm seed, and no new emblem data enters saves. The title shell always uses the game's heraldic crest. The late antique era selects standards and the late_antique architecture palette; 867 and 1066 retain heraldry and manuscript settlement art.

## Chartered settlements

Map search filters its cached geography index against the current established
settlement count on every query, including featured results. Potential founding
sites are not searchable places. New establishments appear without rebuilding
geography; the birthplace picker uses the bookmark baseline instead of a save.

Development now unlocks founding capacity rather than revealing new villages.
An explicit positive established count in a charter-era save takes precedence over
the bookmark development floor. Bookmark floors initialize counties without that
record; development thereafter unlocks capacity only. Authored places and every established save site remain
visible; town/city upgrades retain their existing thresholds. The first unused
compiled slot is reserved by a funded charter, with one active project per county
and household. Generated settlement data and stable slot identities are unchanged.
Establishment repartitions the county's existing residents with the conserved
integer community matrix. County population and each culture-faith total stay
unchanged, and development receives no completion bonus.

Wasteland conversions are saved in `state.wastelandSettlements` with founding
culture and faith. Both noble settlement and commoner frontier homesteads use the
same record. On load it restores inhabited map status and deterministic settlement
slots before population repair; it never repeats settlement rewards or costs.
Cached bookmark maps discard another life's conversions when rebound. Legacy
saves recover converted land from saved development and ownership (see
[state-and-saves.md](state-and-saves.md)); colonies remain outside de jure titles.

The Land tab's County card shows the selected county's Popular support: its saved
base plus active local effects, including foreign counties. There is no personal
support score or Self-tab support row. Taxes and levies respond to this local
total at one percent per point, with output bounded between zero and double.
Support stays with the county through conquest, relocation, and succession.

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

World construction is callback-sliced without changing its traversal order. Land and sea
polygons yield individually, nearest-seed assignment and adjacency advance in 12-row bands, and
settlement compilation advances 16 counties at a time. Connected-component repair and its orphan
flood keep their proven synchronous traversal intact, with a yield between those phases, because
pausing either traversal midway risks changing raster ownership. Every slice resumes the same
arrays and sorted seeds, so timing cannot enter generated world state.

A county's authored `terrain` (farmland, forest, hills, mountains, desert, steppe,
marsh, tundra) is load-bearing well beyond its map color: population carrying capacity
and market yields read it, and warfare reads it directly — battle quality per unit
class and the standing host's home-ground bonus at the battle county, the day cost of
marching into the county, and the supply drain of campaigning across it
(`balance.terrainBattleFactors`, `terrainDefenseBonus`, `terrainMarchMult`, and
`supplyDrainTerrain`; see [war.md](war.md)).

Serf tenure formation also reads permanent-home facts from this boundary. It combines
the bookmark province id, authored terrain and `dev0`, derived `coastal` flag, and the
baseline saved settlement kind/slot with the protagonist household's culture and faith.
It does not use travel location, live development, a promoted settlement kind, county
principal identity, or the current capital. These facts select an archetype only when
tenure is formed or explicitly replaced; later raster, controller, culture, faith,
development, and settlement changes do not reclassify an active saved household.

Principal culture is bookmark data rather than a ruler proxy. The 867 county table now
uses distinct Occitan, Lombard, Finnic, Sámi, and Khazar cores where the older generic
labels were too broad; 1066 derivation supplies Norman Normandy and Rus realm counties.
Definitions, personal and settlement name pools, dynasty rules, affinity traditions,
and supporting technology memberships remain keyed by culture id, so adding a culture
does not require another engine-side grouping switch.

## County communities

A settled bookmark province has one principal culture and faith in its existing
`culture` and `religion` fields. It may also carry an ordered `communities` array of
`{culture, religion, paired?, populationShare0?}` records. The first entry is always
the principal population and must repeat those two province fields; later entries are
other historically grounded local identities. A weighted list gives every entry an
integer `populationShare0`, totals exactly 10,000 basis points, and keeps the principal
share at least as large as each later share. Single-community counties implicitly use
10,000. An entirely unweighted multi-community list remains valid mod compatibility:
the principal begins with the whole simulated population, later entries remain
available to character creation, and `FB.communityShareDiagnostics` reports the
fallback.

`FB.provinceCommunities(province)` remains the immutable bookmark-data reader. It
returns the authored order and any authored share, or a one-entry principal fallback
when the optional field is absent. Bookmark validation rejects an empty/non-array
field, repeated pairs, unknown cultures, invalid or unassignable faiths, a non-boolean
`paired`, partial/invalid/non-totaling shares, and a first entry that disagrees with the
province. `paired:true` marks a culture-faith identity whose two components should not
be split apart by systems that synthesize local identities; it is neither a demographic
property nor a conversion restriction.

New Game presents each authored pair as one coupled community choice. Changing counties resets
the choice to that county's principal entry, while returning to the same county keeps
the previous selection. The selected pair supplies names and the culture and faith of
the protagonist, parents, patronymic grandparents, siblings, and any starting spouse
and children. It is preserved in a non-principal start code rather than in a new save
field; the generated character records remain authoritative after play begins. County
selection remains on the immutable authored list, while the in-campaign Land panel uses
the saved live communities.

**Seek a match** reads the live county communities once play begins. Each new prospect is
weighted by community population and uses only a combined culture-faith pair with saved
population there; it never forms a candidate by independently recombining the two axes. The search county is stamped on
each persistent prospect so reopening the same pool keeps its geographic source and
already-generated candidates retain their identities when local shares later change.

At campaign initialization, `state.population.schema:2` turns those opening shares into
integer community counts by deterministic largest-remainder apportionment, using
authored order to break ties. Community counts partition the existing authoritative
county population; they are not another population system. `FB.countyCommunities`,
`FB.countyCulture`, `FB.countyReligion`, `FB.countyCultureShare`, and
`FB.countyReligionShare` are copy-only live readers. Culture and faith shares aggregate
the combined pairs independently. The saved `identity` cache retains each axis and its
last-change year; an absolute majority overrides the prior identity, while a non-majority
plurality does not cause a repair-time flip.

`FB.countyDominantCommunity` returns the largest live combined pair with stable saved
order as its tie-break. `FB.pickCountyCommunity` performs one explicit saved-RNG draw
weighted by live counts. Newly generated anonymous locals, workers, retainers, tutors,
and local households use the weighted pair; generated local lords, clergy, their noble
kin, and realm rulers use the dominant combined pair. Existing named people never change
with county demographics.

`FB.ensurePopulationState` migrates schema-1 saves at their current county counts and
date, without replaying historical population movement. It merges valid duplicates,
drops invalid or non-positive groups, and gives the authored principal pair the exact
reconciliation remainder. Ordinary births, deaths, hostile-capture damage, and other
county population changes now apportion their exact integer delta among the current
communities by stable largest-remainder rounding. An explicit `communityPolicy` may
instead select a culture, faith, or exact pair for persecution, expulsion, colonization,
famine, or scripted effects; a positive exact-pair policy can establish a new community.
Read helpers return projections and never repair state or mutate bookmark data. Runtime
county presentation, event province triggers, travel culture encounters, conversion
presence, local institutional context, matchmaking, raid context, and demographic
support for claimants read the live layer. Bookmark validation and activation, New Game,
start-family creation, authored settlement naming, de jure history, and the historical
heartland used to authorize great-holy-war restoration remain on immutable authored
data. Controller and realm faith remain political saved identities: a capital county's
plurality cannot rewrite its realm or ruler. The 182 core bookmark-county records,
reviewed opening shares, evidence, and uncertainty are listed in
[county-communities.md](../research/county-communities.md).

Annual migration remains conserved across the world, but now moves culture-faith cohorts
rather than an anonymous net total. After canonically ordered edge flows are capped by
the existing source limit and county floor, each source apportions its total outflow once;
those exact cohorts are divided among its outgoing edges and merged into destinations.
Thus migration can introduce a live community without changing any person's identity.
`FB.moveCommunityPopulation` exposes the same exact transfer boundary for mechanics such
as settled raid captives. `count`, `natural`, `migration`, and `losses` remain the only
population totals consumed by UI and economic systems; communities add no multiplier.
The annual pass and public mutations run the zero-RNG conservation validator.

County conversion and assimilation are exact transfers inside that same partition.
Faith conversion preserves cohort culture; culture assimilation preserves cohort faith.
One saved project per axis may apply a bounded transfer during the annual demographic
pass, with fractional progress carried until it reaches the meaningful-transfer floor.
The sponsor, policy, target, identity tenure, local share, institutions, unrest, war, and
occupation explain the result without RNG. A prior plurality is retained inside the
data-defined hysteresis margin, while an absolute majority changes the saved identity
immediately. Ownership and character or realm conversion do not rewrite communities or
start projects. The full policy boundary is documented in [conversion.md](conversion.md).

A county community may carry an optional `bySettlement` integer array. The array is
absent while every visible site follows the county-wide proportional projection. The
first settlement-specific conversion or project materializes every community column at
once through deterministic integer apportionment. Community columns still sum to their
county counts, settlement rows still equal `FB.settlementPopulation`, and both axes are
checked by the population conservation validator. `FB.settlementCommunities`,
`FB.settlementCulture`, and `FB.settlementReligion` are detached, read-only projections;
opening a sheet does not materialize or repair the matrix. Reconciliation retains the
prior local distribution when population, development, or economic-building weights
change, then may discard a matrix that has returned exactly to the proportional
projection and has no active local project.

Ordinary incoming cohorts use the current settlement allocation weights. Departures are
removed proportionally from their source community's occupied slots; a transfer may
explicitly name source and destination slots for port-, town-, or county-head-specific
movement. Newly generated settlement households draw a combined culture-faith pair from
their own slot. Existing characters, relationships, settlement names, and physical sites
remain unchanged.

Technology impact: `county_community_identity` and `county_community_conversion` are
`none`. Selecting an existing local identity, preserving communities through ordinary
growth, loss, and movement, and pursuing communal conversion or assimilation are baseline
character, demographic, and territorial behavior, not advanced capabilities that
research could credibly gate.

**Settlement presentations are derived; establishment and lordship are saved.**
`state.settlementLordships.counties[pid].established` is a persistent visibility
floor, while delegated records use stable slot indices. Missing delegation means
direct control by the current county holder. County borders, owners, population,
and physical site definitions do not change when a lordship changes. Development
growth still reveals sites during the ownership-foundation phase; recording its
high-water mark prevents later loss from hiding them. Chartered founding replaces
automatic reveals in Phase 5, not in the ownership migration.

Two identities exist. The settlement *slot* —
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
generated slots filling to the maximum eight so a charter completion never projects
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
public projection: initial visibility and live founding capacity follow the legacy rule (2 + a hash bit, +1 at
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
bookmark data). Detailed-zoom settlement names render at 12.5 CSS px for cities
and 11.5 CSS px for towns and villages, scaled by the device pixel ratio before
canvas drawing. A second tap on a marker in the chosen county still settles the
birthplace directly; the compact pick bar instead offers a native settlement select
defaulted to the county head, then commits that choice with **Continue**. The map finder
uses the same pending selection: an exact county result enters the settlement stage, and
an exact settlement result preselects its stable slot in that native picker. Settlement
search results on this screen are therefore limited to slots visible at the bookmark's
starting development. Duchy and kingdom results only navigate the map because neither
identifies an unambiguous birthplace.
The slot is stored as `player.homeSettlement` (0, the county head, is the default and the
only value older saves know), steers the farmer start's plot, and spells the
optional eighth start-code part ([seeds.md](seeds.md)). The go-into-town deed queues
`visit_*` events (events_common.js) with the name in `ctx.settlement` (`{settlement}`
token); options are require-gated by station.
The map's Home control uses that exact settlement for characters below Count rank and
raises the map to the detailed-settlement zoom threshold if necessary, so its marker is
visible in the detailed settlement layer. Counts recenter on the home county at the same
detailed-settlement zoom; lower ranks also use this county fallback if their settlement
anchor is unavailable. Dukes and higher ranks retain the wider county view. Home preserves
an already closer zoom. The H and Home keyboard shortcut and the Land panel's Center
on home button use the same rule.

A fort keeps its exact settlement visible even when later development loss would hide
that slot under the normal reveal thresholds. The same landmark rule protects the
player's stake in a county: any standing building, any family enterprise, any active
local community project, and the player's home settlement each floor the visible count at their slot
(`FB.settlementVisibleCount`), so development decline can never make an invested or
home settlement vanish; ruins and sold enterprises release the anchor. `mapview.js` draws one additional badge
over the existing settlement emblem rather than a second marker or altered site-art
cache: a shield-like outline plus one to four repeated marks encodes tier without color,
and a crossed corner encodes active construction. `FB.fortBadgeDescriptor` is the
accessible/testable projection behind that drawing. County settlement links repeat a
compact tier/construction mark in ordinary DOM text.

The settlement sheet paints each local person's compact portrait after opening and keeps
their name and local role on separate, left-aligned lines beside it at narrow widths.
Opening one of those residents uses the same bounded portrait-chip family strip as a
ruler's character sheet. It omits the currently open person and links each living household
member to their own character sheet. The strip stands on its own without a repeated heading
or helper paragraph, and labels members relative to the open character as spouse, parent,
child, or sibling rather than as generic residents.
The four local meeting venues appear in the character sheet's standard Relationship &
attention action group below Standing. Their visible rows carry only the action label;
venue-specific choices, the day cost, cooldown, and any blocking reason use the shared
desktop tooltip or compact-layout disclosure instead of a generic helper paragraph.

The same sheet shows the selected slot's culture and faith counts and percentages, plus
its saved local faith and culture projects. It is the sole entry point for local project
controls and carries both settlement and county names through target, policy, and stop
views. Policy rows expose pace and resistance on their face, with descriptions and
consequences in the shared tooltip/touch disclosure; choosing one begins or replaces the
local project without a separate confirmation view. A count may direct any settlement in
a directly held county; a baron may direct only the saved home settlement. Foreign and
other remote sheets remain read-only. County-wide controls stay in Land and never infer a
settlement; Self/Faith remains character-facing navigation only.

The active-project card follows the same hierarchy: target, policy, estimated annual pace
or paused state, and resistance remain on its face. Policy explanation, last annual
transfer, scaled county consequences, scope, and timing move behind its shared tooltip or
touch disclosure. Empty cards keep only the inactive state and Start project action
visible, while the disclosure explains what starting a local project changes.

Where a settlement policy affects county-level tax, levy, Popular support, unrest, or
market flow, its contribution is weighted by that settlement's share of the county
population. It is shown on the settlement sheet and never appears as the full-strength
county modifier. Community breakdown cards use an auto-fitting grid so narrow Land
panels stack Culture and Faith instead of crushing their labels.

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
by the refactor. The deed is visible only while at least one wasteland province
borders the player's current demesne; its execution still rechecks that live
adjacency. The commoner caller is the frontier-homestead journey (see
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

The coastline, inland seas, rivers, and projection bounds belong to the geography base
the bookmark names (see Geography bases below); 867, 1066 and 476 share one. One land polygon is a deliberate geographic
exception to the simplified coastline: Venice's lagoon barrier islands sit just off
the lagoon-mouth coast vertex as their own tiny landmass. They carry no county seed,
so the unseeded-landmass fallback assigns every island pixel to the nearest seed —
Venezia's — and the county keeps its mainland strip while gaining the island; the
curated Venice site (its one deliberately non-real coordinate) sits on the island,
and the settlement sea-margin walk never crosses water to drag it back ashore.
`FB.activateBookmark` validates the complete
definition, resolves it against its geography base, installs it in the legacy top-level
fields, and lazily caches one raster per bookmark and geography base. Switching dates replaces `FB.world` and the map's backing canvases but
does not install a second set of pointer or keyboard listeners. Activations run one at
a time, because a build installs its definition and yields between steps: a caller for
the bookmark and geography already being built follows its progress and finishes with it, and any
other caller waits until the current activation's callback has run. A step that throws
ends the build with an error rather than leaving later activations waiting.
`FB.prepareBookmark` builds a bookmark's raster in the background when nothing is
cached or running. Only the CrazyGames title uses it, for Play as Osric's 867 world,
once the title has painted. Other titles still build no world until a start or save is
chosen.

## Geography bases

A geography base (FBDATA.geographies, data/geographies.js) owns the physical world a bookmark is drawn on: the projection window (bounds), the raster width (gridWidth), land, sea and river geometry, the county seed points and terrain, straits and crossing classes, the settlement site table, the default settlement layout, map-scale tuning, place names by year, climate zones, and optional knowledge hooks. A bookmark names its base in its geography field; politics (realms, owners, holders, hierarchy, communities) stay authored per bookmark. 867, 1066 and 476 all use europe_regional, which references the long-standing tables in data/map_data.js and data/counties.js instead of copying them, so the cold boot carries one geometry and no second copy. A bookmark that names no base uses FBDATA.defaultGeography. Saves stamp the base id in state.start.geography at creation.

Engine code reads geometry only through the active base (FB.activeGeography). The world build projects with the base's bounds and gridWidth, fills its land and seas, and draws its rivers; switching to a cached world of another base restores that base's projection. The settlement snap ceiling and the raid and AI sea-raid pixel reaches are map-scale values (FB.mapScale) because they are measured in raster pixels; a base of a different scale sets its own, and a base that leaves one out takes the default base's.

Activation resolves a bookmark against its base before validation and the raster build, on copies, never on the shared data:
- a province that leaves out x, y or terrain takes the base's seed for that county id;
- names follow the start year. A province's own names list, or the base's names.provinces entry for its id, is a list of {from, to, name, culture} with inclusive, optional years. The first entry whose window holds the start year replaces the authored name; an entry with a culture applies only to a county of that culture and wins over an unmarked one. Site names work the same way through a site record's names list or the base's names.sites table, renaming the presentations that use the site;
- a settled county with no settlements list takes its entry from the bookmark's settlement layout: the layout the bookmark names in settlementLayout, else FBDATA.settlementLayouts under its own id, else the base's defaultLayout. settlementLayout:null opts out. A county moved off the base's seed point is a different place and keeps generated settlements, and a county replaced by a legacy mod keeps its legacy presentation.

The 476 period names (Barcino, Salona, Carthage and the rest) are dated names on europe_regional rather than rename code, and its period county heads are the 476 layout in data/settlements.js. Dated names are display data and reach the localization catalogs like county names.

Legacy mods that set bounds, land, seas or rivers replace that geometry on the default base, so every bookmark on it changes as before; a mod may also add or replace whole bases through geographies. Knowledge hooks (knowledge.basins of county lists and knowledge.routes joining two basins) are validated when present and unused until player knowledge exists.

Climate (geography.climate) gives every county of the base a climate zone, with per-county exceptions; a zone maps the global calendar season to the county's local season kind. europe_regional assigns northern_temperate everywhere, which keeps the long-standing seasons. Zones are derived, never saved. See time.md, Calendar and local seasons.

At minimum zoom, a mobile viewport can be larger than the permitted map span on one
axis. `mapview.js` centers that surplus axis instead of passing reversed bounds to the
pan clamp; dragging therefore remains stable while the other axis can still move.

**De jure borders cover the world.** Duchy and kingdom filters add a pale parchment
outline with a dark keyline around every de jure title, including coastlines. Shared
county edges inside one title are omitted. Each mode indexes province title ids once,
then lazily compiles marching-squares paths in 64-cell spatial tiles as they enter the
viewport. Pan and zoom stroke only intersecting tiles (including a small keyline margin),
never a world-sized path. Both color passes draw into a viewport-sized transparent bitmap;
stationary frames and selection changes reuse those pixels without stroking any paths.
Camera position, zoom, viewport dimensions, or device pixel ratio invalidate the bitmap.
Geometry remains cached across camera changes; a bookmark/world switch clears both mode
caches, and other filters disable this border pass. Line widths stay constant on screen
at every zoom. Initial geometry work is linear in visible raster cells, with at most one
tile of padding per edge; subsequent camera work is bounded by visible border segments.

The ordinary close-zoom county borders use the same 64-cell spatial granularity.
Each visited tile classifies its contours in one raster pass into the three existing
demesne/realm/sovereign strengths. Camera changes reuse geometry; stationary frames
reuse a transparent viewport bitmap, with the zoom 6–8 fade applied at composition.
Rebinding ownership callbacks, rebuilding the political base, or changing worlds clears
this cache so conquests and holder changes cannot leave stale border strengths.

Settlement rendering collects candidates once per frame into reusable city/town/village
buckets, preserving the original priority order and hit targets. Intermediate zooms
reject non-head, non-authored sites before live lookups. Visibility is calculated once
per onscreen county and rank once per eligible candidate; hidden and offscreen sites do
not pay for repeated passes. Visibility remains live on each frame, including development,
building, enterprise, and home-settlement changes.
At detailed zoom, accepted label and emblem rectangles are indexed in 64-pixel
screen bins. Settlement and county labels check only nearby obstacles with the
same exact rectangle-overlap rule, preserving placement priority and hit targets.

These two filters replace county labels with their duchy or kingdom names at wider
zooms. County labels return from zoom 6 only when the visible counties pass the area
threshold and their names fit without crowding. Other filters retain ordinary county
label behavior. Title anchors use the member county nearest the area's weighted center;
larger titles take label priority. Screen bins reject crowded labels without pairwise
comparisons, and the layout is cached by camera, viewport, pixel ratio, and locale.

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
`mapGroupOf` in `ui_panels.js` and follows the map filter chosen from the overlay opened by
the `R` key / 🗺 HUD button: **Realm** (default —
your own province focuses your realm, demesne + vassals; a foreign one focuses its
sovereign's), **Mine** (only your realm), **Liege** (your liege's whole sub-realm),
**De jure duchies**, **De jure kingdoms** (the historical de jure groupings), and
**War** (active war participants: outlines the enemy realm in red and your own realm in player focus).
Market commodity prices are inspected through the separate Market Lens HUD button.
Membership walks `FB.liegeChain` over `state.holder` for the realm-based modes.

## County population & lightweight demographics

Each inhabited county tracks an integer civilian population record in `state.population.counties[pid]` (`js/population.js`).
- **Baseline opening population**: Authored in bookmark province `population0`, or derived from deterministic fallback:
  `pop0 = Math.max(1000, Math.round((populationByDevelopment[dev0 - 1] * terrainFactor) / 100) * 100)`.
- **Carrying capacity**: Authored in bookmark province `populationCapacity0`, or derived from `cap0 = Math.max(pop0, Math.round((pop0 / 0.85) / 100) * 100)`.
  Adjusted by county buildings (Watermill +5%, Harbor +3%, max +40%) and national technology (`crop_rotation`, `heavy_plough`, `three_field`, etc., max +35%).
- **Annual simulation pass**: Zero-RNG logistic natural growth bounded by pressure $(1 - P / K)$ within $[-1\%, +2\%]$, and conserved land migration across non-hostile borders when attraction differential $\ge 2$. Natural change is proportionally apportioned among live communities. Migration transfers the same exact culture-faith cohorts out of sources and into destinations. Attraction combines county buildings, national technology, occupancy, war, and market shocks with the player realm's standing settlement policy ([council.md](council.md)); the policy shifts only the draw of player-owned counties and never moves a population record directly. The pass snapshots county inputs once, walks counties and edges in canonical id order, and groups proposed migration edges by source so caps and cohort allocation remain bounded by counties, adjacency edges, and live community records.
- **Economic & military factor**: $\text{clamp}(\sqrt{P / P_0}, 0.50, 1.50)$ scales county tax base, direct & vassal levies, and market household demand.
- **War & siege mitigation**: Hostile captures cause $-2\%$ population loss, mitigated by fortification strongpoints ($0\%, 10\%, 20\%, 35\%, 50\%$ for fort tiers 0–4).
- **Settlement allocation**: On-demand display projection weights sites (village 1, town 3, city 7 + 1 per economic building), summing exactly to total county population.

## Named settlement households

The demographic totals remain anonymous, but the player’s home and arrived destination
may expose three named local households. Household records point at the existing derived
settlement slots; they do not create physical sites or change county population.
`FB.localFolkAt` is the read-only projection used by Network and settlement sheets.
Remote map browsing never calls the mutating ensure path, consumes no RNG, and shows only
residents already remembered through a relationship. If that leaves no displayable residents,
the settlement sheet omits the **People here** section. A county roster is created at game
initialization, save restoration, or destination arrival. That lifecycle also initializes
each resident's empty career-history container, so merely formatting an occupation in either
view cannot mutate the campaign. Settlement person cards order their compact facts as gender,
age, occupation, then the player's relationship status with that resident.


Direct settlement holders can rename established settlements with the small pencil
button in the settlement sheet title, matching the character name editor. The editor
accepts trimmed names of 1-40 characters, excluding angle brackets and controls;
saving revalidates direct ownership. Back discards edits and restores the settlement
sheet's scroll, disclosures and focus. Names are literal player text, not translated.
An optional `state.settlementNames` table maps stable site IDs to display overrides;
legacy saves need no migration. Geography, county names and site identities remain
unchanged. Settlement lists, map labels and map search read the saved display name;
search resolves overrides per query so loading a different save cannot stale names.

Legacy province replacements without settlement data retain their previous slot labels and kinds in non-enumerable presentation metadata. Geography resolution copies that metadata through title normalization before compiling generated physical sites, preserving names, indices and property references without turning those records into authored sites or exporting the internal metadata.
This is cosmetic naming only and introduces no technology eligibility requirement.

## Spring 476 bookmark sites and communities

The bounded [476 prototype](situation-476.md) uses existing county polygons only as spatial anchors. Its separate bookmark records preserve Roman Nicene and Gothic Homoian communities across a federate conquest. Ravenna/Classis, Salona/Spalatum and Carthage/Tunis are distinct site identities; the 476 layout contains no Kairouan site. Outside counties are uninhabited for this slice.

## Spring 476 regional anchors

The 476 bookmark maps later county polygons to a bounded set of late antique
political regions. Visigothic Iberia, a separate Suevic northwest, Armorican
communities, Rhenish Franks, and Moorish communities fill parts of the earlier
prototype gap. Dated county names on the geography base and the 476 settlement
layout replace several visibly later names, including Fez and Tahert; the polygon
remains an approximate geographic anchor.
Counties outside the authored regional campaign stay wasteland rather than
receiving an 867 ruler or faith. The 867 and 1066 province records are not
modified by the 476 remapping.


Scheduled Events markers use compiled settlement coordinates. At distant zoom they cluster within 48-pixel screen cells; detailed zoom retains one marker per funded edition at its exact settlement. Hit targets open an event or matching calendar subset. The overlay has independent session state and does not modify political or market views. Capacity uses settled counties in the active de jure kingdom, independently of current owners. See tournaments.md.

FB.activateBookmark accepts an optional fourth argument, { geography: savedGeographyId }, for campaign loading. The override is applied to a detached bookmark before validation, geography resolution and raster caching. It leaves the bookmark registry unchanged. Pending activations coalesce only when both bookmark and geography match; other requests retain their override in the queue. A missing saved base fails activation before changing the active world.

476 authored geography

The 476 bookmark declares inhabited ownership and communities in four regional files on europe_regional. Its settlementLayout names the ordinary 476 layout; no later bookmark supplies its politics or settlement lists. Dated names remain on the physical base, while its optional climate layer overrides base assignments for that campaign only. Wasteland entries preserve ids and physical seeds without authored owners or communities.


Africa's 476 regional declaration supplies county-level dated names and dated physical site records directly. Its layouts are composed into settlementLayouts.476 after the base layouts load, before bookmark activation. Existing curated head slots remain first; Hadrumetum follows Sufetula and Hippo Regius follows Cirta. New regional sites never replace a medieval layout. The later geography names are retained for 867/1066. Development and population shares are illustrative game values, and the single Numidian cell cannot represent separate coastal and interior sovereignty.

The Dalmatia/east regional declaration supplies explicit county-local dated names and physical settlement anchors for all forty of its inhabited cells. County-local names override the shared geography's dated labels for 400-649; new site ids extend the physical-site table before activation and are referenced only by the 476 layout. Salona/Spalatum and Iconium/Isaurian-court retain their previous slot order. Mursa, Scupi, Lychnidus, Siscia and Andautonia replace modern seat labels; the uncertain Pannonian and Epirus interiors keep regional names. Roman/Greek Balkan partitions, Gothic communities near the Macedonian and Thracian hosts and selected Anatolian Miaphysite communities are explicit weighted gameplay populations. They do not change sovereign owners, direct holders or medieval geography. See docs/research/476-bookmark.md for their historical limits.

Gaul and Iberia in 476

The gaul_iberia declaration owns period names, community weights, development and all 117 county settlement heads. Its settlementSites and settlementLayouts are composed into the ordinary physical-site and 476-layout tables before bookmark registration; activation still clones the layout and resolves year-keyed names. Existing Soissons, Tournai and other site ids remain stable. Uncertain city identifications use geographic labels and village presentations. A generated Upper Rhine Alamannic court occupies the strasbourg cell; this is a coarse political approximation, not a surveyed frontier. Medieval layouts and province records retain their own presentations.

Spring 711 geography

The baseline described here remains retained. Fresh 711 uses terrain_v2_governments_v2 on europe_regional_2, adding eight inhabited bounded districts and keeping 21 unused additions as scenery. data/bookmark_711_terrain.js supplies literal date-specific head sites, communities, title groups and local courts. No shared seed or released geography changes. The original 21 scenery anchors survive, with Eastern steppe replacing the later national label in this revision only. The research ledger is docs/research/711-inhabited-terrain.md; government composition and saved-world behavior are described in bookmark-711.md.

data/bookmark_711.js owns literal politics, community weights, period names and one head presentation per inhabited county across the shared europe_regional grid. Its separate bookmarkSites711 table installs before engine indexing alongside the live bookmark registration. A null settlementLayout keeps the inline presentations independent of medieval layouts, and empty county names lists preserve the literal 711 labels instead of shared dated aliases. Geography supplies physical county seeds and terrain only. Later urban foundations use predecessors or district names, and generated extra slots remain procedural. No other bookmark supplies opening owners, holders, courts or community shares. Historical and coordinate uncertainties remain recorded in ../research/711-bookmark.md.

800 geography and settlements

The late 800 candidate owns every political province row, community weight and title table independently of 867. Shared europe_regional seeds, terrain, climate and crossings retain their physical meaning. Its explicit 800 settlement layout uses period sites at fifty major seats; unlisted counties use generated slots rather than the later 867 imported fill list. Iria Flavia, Walila, Malamocco, Tudmir and Pechina presentations avoid carrying later urban names backward. Raqqa adds one enduring physical-site slug, raqqa_800. Community weights are gameplay abstractions, including substantial Coptic and Syriac communities under Abbasid rule, not census estimates. No population or settlement schema changes. See docs/research/800-bookmark.md.

1204 geography and visibility

The late spring 1204 definition is authored in data/bookmark_1204.js under FBDATA.bookmarkCandidates and referenced from FBDATA.bookmarks during ordinary data loading. The 711 and 800 definitions use the same explicit registration, preserving existing localization extraction owners. All three dates are available to the picker, start codes and saved-campaign activation after a fresh boot. The supporting bookmarkContent table is source organization, not a runtime mod root or an engine requirement-check API. Historical limitations remain documented independently of selectability.

The candidate reads physical seeds and crossings from europe_regional and owns literal county defaults and ordered settlement layouts in data/bookmark_1204.js. It has no dependency on the 1066 definition or layout. Promotion tables use the shared title catalogue with explicit 1204 names. Every realm and ruler belongs to the 1204 snapshot. County and physical-site IDs keep their existing meanings. The aghmat county uses geo_marrakesh_2542997 as its principal settlement, keeping Aghmat as a separate second slot and retaining the other fill sites. The independent declarations preserve all previous 1204 opening values and saved slot indexes. Generated medieval holders follow their declared government, not future Latin partition grants.

See docs/research/1204-bookmark.md for the after-coronation spring instant, historical sources, provisional frontiers and release gaps. Positive community shares are simulation inputs rather than census evidence. Ordinary high medieval systems and technology seeding apply; this adds no new eligibility rule or technology gate.

Authored opening settlement communities and civilian movement

A settlement layout entry may declare communities as culture/religion/populationShare0 rows. Each local mix must sum to 10000, use unique identities already present in its county and have positive integer shares. FB.seedSettlementCommunities projects these relative weights onto the existing integer county community columns and real settlement population rows. Both margins are conserved; incompatible local weights are reconciled rather than generating a fictional site census. Unspecified sites use the county mix. Fresh campaign creation seeds the partition once; restore retains the saved bySettlement counts. Lentia and Lauriacum provide different authored local weights within the same conserved Norican county.

Opening migration declarations and civilian_migration stories use FB.moveCommunityPopulationByPolicy. Source floors, paired culture-faith identities and settlement reconciliation remain authoritative. A small initial Roman Nicene displacement from linz to wien and later conditional wien-to-ravenna evacuation are simulation routes, not surveyed headcounts. They do not transfer political ownership or turn civilians into soldiers. Household actorIds may accompany an opening cohort by changing their homeProvinceId only after residents actually move.

Balkan and Anatolian community authoring

The 476 eastern region declares distinct Gepid and Isaurian cultures through the shared culture catalogue, mixed Roman/Gepid/Rugian Pannonian communities, lower-Danube Gothic and Gepid minorities and an Isaurian minority at the coarse Iconium anchor. Abritus keeps its first slot and Novae adds a second physical site. The local Novae and Isaurian-court weights use the existing conserved partition projection; no population is created by adding a site or changing relative weights. Existing saved community counts remain authoritative. These inputs are editorial simulation weights, not a census or exact ancient frontier.

476 outer-region content

The 476 outer region reuses the retained europe_regional seed grid and terrain and inhabits 106 formerly unauthored cells, including the Cashel district. data/assembly_polities.js and data/mobile_confederations.js also inhabit Tallinn and Cherson. Its county labels, community weights, development, dated physical-site heads, title memberships and climate assignments are literal region data. District labels replace later foundations, and former Roman city names do not imply surviving urban scale. New crossing pairs use the existing explicit class table. These cells and their layouts belong to the single 476 map; development saves of the earlier bounded map are not supported. No geometry, settlement compiler or runtime map change is needed. The regional design and research record are in situation-476.md and ../research/476-bookmark.md.

Mobile population boundary

populationPoolQuote and populationPoolApply exchange exact culture-faith cohorts between an initialized county and a caller-owned external pool. Reviews preserve the local floor and remain pure. Apply rechecks the county and pool, updates county migration and settlement partitions, and preserves the combined headcount. Mobile following pools are separate from settled local inhabitants. Seasonal access never changes sovereignty or county holders. See docs/designs/mobile-confederation.md.

Civic foreign site rights

Institution-owned foreign quarters, warehouses, jurisdiction and assigned receipts reference an existing county and its stable physical settlement slot. They add no county, geometry or duplicate settlement. Host sovereignty, inhabitants and private enterprises remain separate from the beneficiary institution; loss of host control suspends the right. Saved references retain their slot through changes in current site visibility. Historical 1204 Venetian presence uses the existing Constantinople site without asserting a surveyed district or numeric receipts. See docs/designs/city-republic.md.

Bounded districts and dry corridors

data/geography_expansion.js declares europe_regional_2 as an additive child of europe_regional. FB.geography resolves inheritance without mutating parent seeds. The expanded 476 revision supplies its own dated communities, institutions and settlement layout. Existing province ids survive, and saves choose the world revision that supplied their geometry.

maxRadiusKm limits a physical seed's raster extent in Mercator-local kilometres. Both nearest-seed assignment and orphan reassignment respect the cap. landRoutes adds bidirectional non-water adjacency with explicit travel units. Weighted household routing retains the original adjacency-order tie behavior where all edges have unit cost. Couriers, provision quotes, scheduled games and army leg quotes consume these weights; displays use the same route-unit projection. An ordinary unextended geography has unit costs everywhere and unchanged seed extents.

The expanded district and scenery interpretations are documented in docs/research/476-wider-districts.md. Their 65 km extents and route costs require physical-map acceptance; they are authored simulation bounds rather than archaeological measurements.

Shared district extension

Winter 800 dated habitation

data/bookmark_800_expansion.js selects six independently researched inhabited districts on europe_regional_2. Its complete province list retains the original 498 declarations and appends all 29 shared seeds, leaving 23 additions and all 21 original scenery anchors uninhabited. Each accepted district has one dated site; all original settlement slot identities are retained. Territorial local possession at Jenne and Gao is a declared simulation abstraction, Kath uses regnum, Ibrim belongs to the existing Makurian court, and Kashan/Tadmor use existing Abbasid public authority. No new constitution or religious institution follows automatically from a physical seed. The complete evidence and deferred-candidate ledger is docs/research/800-inhabited-terrain.md.

Technology impact period_800_inhabited_terrain is none. Existing households and ordinary authority do not depend on a discovery. Population, livelihoods, climate and weighted dry travel use their existing contracts, with no new seasonal-access or market capability. The original 800 baseline and governments_v2 worlds keep europe_regional; only new expanded campaigns select the larger geography.

Shared physical catalogue

The unreleased europe_regional_2 base contains 29 bounded additions and 527 total anchors. Four appended districts cover the lower Amu Darya at Kath and Gurganj, the Kumbi area and the Timbuktu margin. All original scenery remains. The 476 expanded definition includes every shared seed but retains additions without a 476 political declaration as scenery, with no residents, owner or settlement layout. Date-specific habitation must be authored explicitly. docs/research/shared-geography-districts.md records the physical inventory, source confidence, route costs and acceptance workload.

The expanded base supplies per-district climate defaults and a period-scoped Eastern steppe label; each bookmark's climate and names retain precedence. Inherited grid width, map scale, ordinary seed positions and the released europe_regional definition remain unchanged. This is an in-place extension of an unreleased base, so existing development wider_v2 rasters require renewed review. It is not a mechanism for changing a released base. Supported original-world saves still resolve their original geography and preserve converted frontier sites. Technology impact remains none under bounded_overland_corridors.

Retained geography ids

Geography extensions inherit retiredProvinceIds monotonically. A child can append retired ids but cannot clear an ancestor's list. Validation rejects duplicate retirement entries, malformed ids and any active seed reusing a retired id, including an independent full base. Released geography hashes cover the resolved base; the shared settlement-site catalogue remains available for independently authored dates. Saved geography must agree with the resolved bookmark revision even for an implicit baseline.

493 regional declarations

The hidden 493 world_v2 consumer uses the existing europe_regional_2 physical base without modifying shared seeds, coordinates, raster scale or dry-route units. The 260 previously disabled ordinary anchors now have independent dated declarations. Twelve of the 29 bounded additions are inhabited candidates; seventeen retain scenery with explicit evidence blockers. Earlier date-specific display names and literal settlement layouts prevent later cities from appearing through shared physical ids. New island links use the existing crossing classes and normal movement rules. Historical, raster and travel review remains required; declarations alone are not measurements of connectivity.

Spring 867 district habitation

The 867 inhabited_v2 world uses the same 527-anchor europe_regional_2 physical catalogue with eight new inhabited counties, for 485 inhabited counties total. Jenne-jeno, Gao-Saney, the Kumbi district, Ibrim, Kath, Tadmor, Tayma and the Kashan oases have date-owned community and political declarations. All original scenery and the 21 unaccepted additions remain scenery. No seed, radius, shared dry route or ordinary county geometry is changed by this consumer.

867_inhabited_v2 clones every curated and generated-fill slot from the retained 867 layout before appending a new physical-site head for each accepted district. Existing home and building slots therefore retain their order within their owning revision. Date-local climate overrides use the existing arid and continental vocabulary; original counties retain their prior defaults. The full research and scenery decisions are in docs/research/867-districts.md. Baseline habitation has technology impact none under period_867_district_habitation. Raster extent, route presentation and measured performance remain acceptance work.

Spring 1066 district habitation

1066 inhabited_v2 uses the existing 527-anchor europe_regional_2 geography. Its eleven inhabited additions have separate dated sites ending in _inhabited_1066, literal community compositions and a date-owned layout. Physical _site prototypes and earlier 476 declarations supply no population or ownership. Original layout entries are retained. Settlements, communities, commissions and the lower Syr demand remain separate facts. Eighteen deferred additions remain scenery without residents, owner or layout. No geometry, radius or route rule changes. Climate overrides select arid or continental seasons. Evidence and physical acceptance are in docs/research/1066-inhabited-terrain.md.

Spring 1204 inhabited revision

inhabited_v2 selects europe_regional_2 with fourteen independently dated new inhabited districts and fifteen explicitly gated scenery additions. All original 21 scenery remnants remain. The resulting physical world has 527 districts, 491 inhabited and 36 scenery. The original independently authored 498-district baseline is retained, including its ordered settlement layouts. No 1066 declaration supplies new owners or communities. See docs/research/1204-terrain.md for the exhaustive disposition and evidence ledger.

Sarakhs and Nur promote existing physical fill-site locations into their own bounded districts only in the expanded revision. Sarakhs retains its site id; Nur shares the former coordinates through a new presentation id so its period label has a separate localization owner. Expanded Merv and Bukhara remove those presentations, including the duplicate Sarahs presentation, to avoid placing the same town in two counties. Other original layout slots remain unchanged; baseline slots are untouched. New synthetic site heads denote regional habitation rather than exact excavated buildings. Qara Khitai has a nonterritorial diplomatic anchor and no additional resident county.

period_1204_inhabited_terrain has technology impact none. Baseline habitation, local authority, subordinate courts and ordinary travel require no new discovery. Existing production, equipment, supply and movement requirements remain active.
