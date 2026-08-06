# Plan: historical settlements and the detailed map

Date: 2026-08-06

Status: **proposed**. This is the complete implementation plan for the current
867 and 1066 game. An implementer should not need any document outside this
repository to build the feature.

Related design:
[provinces](../designs/provinces.md),
[development](../designs/development.md),
[state and saves](../designs/state-and-saves.md),
[mods](../designs/mods.md),
[travel](../designs/travel.md),
[war](../designs/war.md), and
[UI](../designs/ui.md).
The public data contract must also be recorded in [MODDING](../MODDING.md), and
implementation and integration remain governed by [TESTS](../TESTS.md),
[VERSIONS](../VERSIONS.md), and the repository `AGENTS.md`.

Baseline: Fallowborn v1.110.6.

## Goal

Give the current county map a historical, local scale. At close zoom the player
should see named villages, towns, and cities in defensible positions, tap one,
and inspect what is there. Existing buildings, land plots, manors, enterprises,
travel, war, and saves must continue to use the same county and settlement-slot
semantics.

The completed feature must provide:

- a stable identity and geographic point for every authored physical site;
- bookmark-specific names, kinds, and ordered county membership for 867 and
  1066;
- deterministic generated sites for every un-authored slot and every old mod;
- close-zoom settlement markers and collision-aware labels;
- one settlement sheet that is read-only abroad and retains authorized actions
  in the player's demesne;
- unchanged province ids and unchanged numeric settlement references in save
  version 3;
- deterministic behavior under bookmark switching, save/load, and mods; and
- responsive pan, pinch, and tap behavior on low-end mobile devices.

This is a geographic and interface feature. The map remains a county map.

## Non-goals

Do not add any of the following as part of this plan:

- settlement-level ownership, borders, sieges, armies, or travel destinations;
- a population or migration simulation;
- independent settlement culture, faith, law, or political state;
- a new founding action or a second development model;
- a save-format bump or conversion of saved numeric settlement indices;
- renamed province ids;
- external maps, fonts, icons, images, libraries, network requests, or a build
  step; or
- complete historical authoring of every minor hamlet before the interaction
  model can ship.

The existing `FB.settlement` namespace in `js/settlement.js` is the political
claims-adjudication engine. Do not put geographic-site behavior in that
namespace. Use `site` in new code where the distinction matters and keep the
player-facing word "settlement."

## Current architecture and the gap

### Bookmarks own atomic county definitions

`data/bookmarks.js` builds complete 867 and 1066 world definitions. The 867
bookmark retains the top-level `FBDATA.provinces` array as the legacy public
world, while `province1066` constructs independent province objects for 1066.
`FB.activateBookmark` validates a selected definition, installs its world
fields, and caches the compiled raster for that bookmark.

The new historical presentation belongs to the bookmark's province definition.
The same physical place may have a different displayed name or kind in 867 and
1066, but it must retain one physical site id and one coordinate.

### Settlement indices are already durable gameplay references

`FB.settlementsOf(state, pid)` in `js/world.js` currently returns two to four
derived `{name, kind}` records. The count and names come from a plain string hash,
not the saved RNG. Development promotes or adds slots at existing thresholds.

Array position is already persisted throughout the game:

- buildings store `{s: settlementIndex, id, ruined?}`;
- land plots store `{provinceId, settlement}`;
- a manor stores a province id and settlement index; and
- enterprises store a province id and settlement index.

Those numeric references are the compatibility contract for this feature. A
historical record may replace the presentation of slot 0 or slot 1, but it may
not insert ahead of existing slots or renumber saved property.

### The raster already supplies the necessary map seam

`js/world.js` projects longitude and latitude into a fixed numeric raster,
assigns every land pixel to a county, and exposes `FB.provinceAtGrid`.
`js/mapview.js` already supports high zoom and passes the containing province and
tapped world coordinate to `FB.map.onTap`.

The missing pieces are compiled site points, a close-zoom marker layer, marker
hit-testing, and a semantic tap result that the UI may accept or ignore depending
on the active targeting mode.

### A settlement sheet exists but is demesne-oriented

`UI.showSettlement(pid, index)` in `js/ui_modals.js` displays development,
buildings, ruins, construction, and demolition. It is reached from the player's
Land panel, so some action visibility currently relies on the caller having
already limited the county.

Map browsing makes the sheet reachable for any county. Authorization must move
inside the sheet so foreign and non-demesne views cannot expose a mutating
control.

### Mods and deployment derive from the loaded data

Runtime mods apply before the first world is activated. Legacy mods may know only
about provinces and culture-based settlement name parts. They must continue to
work through generated site records.

The served offline asset list is derived from the script tags in `index.html`.
Adding a new data script requires the normal load-order and runtime-manifest
coverage, not a hand-maintained second service-worker list.

## Locked identity model

There are two identities, and both are required during this feature:

1. **Settlement slot**: the zero-based index inside one county. This remains the
   canonical saved reference for buildings, plots, manors, and enterprises.
2. **Physical site**: a globally unambiguous stable slug used by bookmark data and
   map interaction. It is derived world data in this release and is not written
   into saves.

For example:

```js
FBDATA.settlementSites = {
  roma: { x:12.4964, y:41.9028 },
  ostia: { x:12.2908, y:41.7542 }
};
```

Here `x` is longitude and `y` is latitude, matching the existing province data
convention. Projected world coordinates must use different local names, such as
`wx` and `wy`, when both forms are in scope.

A bookmark province may declare a complete ordered list:

```js
{
  id:'roma',
  name:'Roma',
  settlements:[
    { site:'roma', name:'Rome', kind:'city' },
    { site:'ostia', name:'Ostia', kind:'town' }
  ]
}
```

The contract is:

- `site` is a lowercase snake-case slug and is stable across bookmarks;
- the same site may appear in both bookmarks but at most once in one bookmark;
- `name` is a historical proper name and is not localized, following county and
  ruler names;
- `kind` is one of `village`, `town`, or `city` and is the bookmark baseline;
- live development may promote a site's displayed kind but may not downgrade it
  below the authored baseline;
- the head settlement is always index 0;
- the array is a complete replacement for the authored portion of that county,
  not a merge-by-site patch;
- a county may author at most four sites in this feature, preserving the current
  economic and interface bound; and
- physical coordinates live in `FBDATA.settlementSites`, not in each bookmark
  presentation.

`FB.settlementsOf` remains the single public projection used by ordinary game
systems. It must return records containing at least:

```js
{
  site:'roma',
  name:'Rome',
  kind:'city',
  x:123,
  y:456,
  authored:true
}
```

In that result `x` and `y` are compiled world coordinates. Existing callers that
read only `name` and `kind` must remain valid.

## Data ownership and load order

Add `data/settlements.js` and load it immediately after `data/bookmarks.js` in
`index.html`.

The file should:

1. define `FBDATA.settlementSites` as the shared physical-site table;
2. keep the base game's 867 and 1066 county layouts in a file-local object keyed
   by bookmark id and province id;
3. attach a freshly cloned `settlements` array to the matching province object in
   each already-created bookmark; and
4. fail loudly during development if a base layout names a missing bookmark or
   province, rather than silently dropping authored data.

Do not share one mutable settlement array between bookmarks. A later mod or test
that changes 1066 must not mutate 867 through an aliased array.

Update the repository `AGENTS.md` architecture/load-order description when the
new file lands. The game remains a set of classic scripts with no module or build
dependency.

## Validation contract

Extend `FB.validateBookmark` without mutating its input. Report all faults in the
existing aggregated `Bookmark <id>:` style.

Validate the shared physical table and each optional province settlement list:

- `FBDATA.settlementSites` is an object, not an array;
- every site id matches the supported slug form;
- every site record has finite longitude and latitude inside their geographic
  ranges;
- a wasteland does not declare settlements;
- `settlements`, when present, is a non-empty array of no more than four records;
- every presentation has a supported site id, non-empty name, and supported kind;
- every referenced site exists in the physical table;
- no site appears twice in one county;
- no site is assigned to two counties in one bookmark;
- no two authored entries in one county have the same displayed name; and
- the core 867 and 1066 definitions have independent arrays and retain their
  expected authored lists after construction.

Missing settlement lists are valid. That is the compatibility path for old mods
and for counties whose minor places remain generated.

Validation can check geographic ranges before raster creation. County membership
is checked during compilation because the simplified county boundary does not
exist until the raster is built.

## Deterministic generated coverage

Historical authoring must not be required for every slot. Preserve the current
plain-hash naming behavior exactly for un-authored entries.

For a county and live development:

```text
legacy count = 2 + hashBit(provinceId) + (development >= 5 ? 1 : 0)
visible count = max(authored count, legacy count)
```

Generated records are appended after authored records and use the same numeric
indices the old build would have used. Each generated record receives:

- the current culture-derived deterministic name for that province and index;
- a reserved deterministic key such as `generated__<provinceId>__<index>`;
- a deterministic point inside the parent county; and
- `authored:false`.

Use a plain local string hash. Do not call `FB.rng`, `FB.ri`, `FB.pick`, or
`Math.random` for data repair, fallback positions, names, label priority, or hit
ties.

Generate enough compiled fallback points to cover the maximum four slots even if
the current start development exposes fewer. Development can then reveal an
already-compiled slot without projecting or searching the raster during play.

A later correction may replace generated slot 2 with an authored site at slot 2.
Existing property at `{provinceId, settlement:2}` remains in that slot and adopts
the corrected name and position. Never insert a researched entry ahead of another
slot merely to sort by importance.

## World compilation and projection

Compile site coordinates once, after province assignment and centroids are
available. The compiled world should own:

- one ordered site array per province, including maximum required fallbacks;
- one flat site array for map rendering;
- the parent province id and settlement index on every record; and
- projected world coordinates, display priority facts, and authored status.

Do not save these records and do not recompute projection in `M.render` or
`FB.settlementsOf`.

For an authored coordinate:

1. project longitude and latitude with the existing `FB.lonToX` and `FB.latToY`;
2. keep the point if its raster cell belongs to the declared county;
3. otherwise find the nearest raster cell belonging to that county with a
   deterministic search;
4. record the snap displacement for diagnostics; and
5. reject an obviously wrong base or modded assignment when the displacement is
   beyond one documented map-scale threshold.

Normal small snapping is expected because gameplay counties are simplified
raster regions. A bad site-to-county assignment must not be moved across a large
distance without an actionable activation error.

Generated positions must also land inside the declared county. Derive candidates
from province id and slot index, then use the compiled raster to select a valid
point. Prefer distinct points and avoid placing all fallbacks on the county
centroid. Any deterministic fallback to the province seed must remain valid for a
very small or unusually shaped county.

If site compilation can fail, thread that error through `buildWorld` and
`FB.activateBookmark` instead of throwing from a later animation frame. Bookmark
activation should continue to report a useful error to its caller.

`worldCache` remains keyed by bookmark id. Mods require a page reload today, so
the active mod set is fixed before any cached world is built.

## Runtime settlement projection

Refactor `FB.settlementsOf(state, pid)` to read the compiled ordered records and
return only the currently visible count.

Preserve the existing live-development promotions by slot:

- index 0 becomes at least a town at development 4;
- development 5 reveals the next generated slot when the authored list has not
  already made that slot visible;
- index 1 becomes at least a town at development 6; and
- index 0 becomes at least a city at development 7.

An authored baseline wins when it is higher than the live-derived kind. Define
one kind-rank helper so UI, marker priority, and settlement projection cannot
disagree about `village < town < city`.

Update `FB.settlementDevelopment` so its explanation remains truthful when an
authored list or baseline kind has already satisfied a normal threshold. It
should report the next visible change that will actually occur, not promise a
new village at development 5 when that slot is already present.

Keep the function read-only. Repeated calls must not consume RNG, mutate state,
or mutate `FBDATA` and must return the same semantic records for the same
bookmark and development.

Provide a map-facing compiled accessor or predicate that can answer whether a
flat site record is currently visible and what its current kind is without
allocating a fresh settlement array for every county on every frame.

## Historical authoring scope

The initial release covers both shipped bookmarks. Author first:

1. every realm capital;
2. centralized faith seats and places used as authored campaign objectives;
3. major ports and high-development cities;
4. settlements explicitly named by existing game content; and
5. historically defensible county heads where the county name is regional rather
   than a literal town name.

Generated sites cover every remaining slot, so uncertain minor-place research is
not a release blocker. Do not invent a precise historical town merely to remove a
generated label.

For each site:

- use the same stable slug across 867 and 1066 when it is the same physical place;
- choose the displayed name and baseline kind separately for each bookmark;
- use a defensible historical location rather than an automatically geocoded
  modern administrative centroid;
- preserve array position once property may refer to it; and
- verify that the projected point lands in, or requires only a small snap into,
  the intended gameplay county.

Proper names stay outside the translation catalog. New surrounding UI chrome,
kind labels, empty states, and accessibility labels must use `FB.T` or the
existing shared helpers.

## Settlement sheet

Make `UI.showSettlement(pid, index)` safe and useful for every settled county.

The sheet must show:

- settlement name and localized kind;
- parent county and current holder or realm context already available in the
  province UI;
- current and bookmark development, using the corrected explanation helper;
- buildings and ruins in the exact settlement slot; and
- matching player-family property, including plot count, manor, and enterprises,
  when present.

Authorization is checked inside the sheet at render time:

- foreign and non-demesne settlements are read-only;
- construction appears only when the current `FB.buildable` and demesne/tier
  checks pass;
- demolition appears only when the player is allowed to alter that county;
- property rows do not become actions unless an existing authoritative action is
  valid there; and
- opening a sheet never spends time, moves the household, or begins travel.

Do not duplicate building, property, development, or owner calculations in the
map layer. The marker carries only enough identity to call the existing sheet.

Preserve modal Back behavior, keyboard focus, narrow-screen layout, and the
existing Guide link. Opening a marker first selects its parent county so map
highlight and sheet context agree.

## Marker rendering

Add a settlement marker pass to `js/mapview.js` in screen space. It should run
after the base raster and county selection overlay, and before armies, campaign
objectives, and travelers so active gameplay markers remain dominant.

Use two detail thresholds:

- **Strategic zoom:** retain the current county labels, capitals, armies, and
  travel presentation. Draw no settlement layer.
- **Intermediate zoom:** draw county heads and authored cities that meet the
  priority threshold.
- **Detailed zoom:** draw every currently visible settlement, and suppress or
  subordinate county labels where they conflict with local labels.

Marker and label requirements:

- draw with Canvas 2D primitives or native text only;
- keep marker size and hit area in screen pixels as zoom changes;
- cull records outside the viewport before label measurement;
- prioritize city, town, village, then head status, authored status, and stable
  province/index order;
- use deterministic rectangle collision rejection for labels;
- keep a rejected label's marker visible and tappable;
- never use color as the only indication of settlement kind; and
- retain a reused `M.visibleSites` list containing only markers actually drawn on
  the most recent frame.

Do not construct DOM nodes, project longitude/latitude, generate names, or build
large new arrays in the render loop.

The first implementation may scan the flat compiled site list above the zoom
threshold. Add spatial buckets only if owner-run profiling on the target mobile
device shows that the flat, viewport-culled pass misses the frame budget.

## Hit-testing and input precedence

Hit-test only `M.visibleSites`, in screen space, on pointer release. Use one named
mouse radius and a larger named touch/pen radius. When hit circles overlap,
choose:

1. the nearest marker center; then
2. the same stable display priority used by rendering; then
3. province id and settlement index as the final deterministic tie-break.

Extend the map tap callback with an optional site hit rather than replacing the
province result. Existing callers that pass only a province must continue to
work.

`FB.map.onTap` must keep this precedence:

1. new-game or other `FB.game.pickMode` treats the tap as the parent county;
2. the travel picker treats it as the parent county;
3. army selection or march ordering receives the parent county and world point;
4. any other explicit county-targeting mode retains its current behavior; and
5. only ordinary browsing selects the county and opens
   `UI.showSettlement(pid, index)` for a site hit.

A settlement marker must never make the county underneath it impossible to use
as an army destination, travel destination, war target, or starting province.
Keyboard province navigation remains province-based.

## Save compatibility

This feature remains on save version 3.

- Do not edit the save version.
- Do not write physical site ids, coordinates, marker state, label placement, or
  world compilation caches into state.
- Do not change the shape of buildings, land plots, manors, or enterprises.
- Old saves continue to resolve numeric indices through the active bookmark's
  ordered list.
- A save created after this feature remains readable by the immediately previous
  build because it contains no new required state.
- Bookmark restoration must activate and compile the correct site's presentation
  before any settlement UI reads saved property.

Add a fixture or in-page setup that loads pre-feature numeric property records and
proves that all four property families still resolve to the same county and index.

## Mod compatibility

Extend the JSON mod contract in `js/mods.js` and `docs/MODDING.md`:

- optional top-level `settlementSites` merges by site id into
  `FBDATA.settlementSites`;
- a province inside a complete atomic bookmark may include its complete ordered
  `settlements` array;
- a legacy 867 `provinces` replacement may include `settlements`, following the
  existing rule that a same-id province object replaces the whole province
  record rather than patching only one field;
- missing physical data or invalid presentation data fails bookmark validation;
  and
- a mod that supplies neither field receives deterministic generated sites and
  retains its current settlement names and indices.

Document that reordering a published mod's settlement list can move saved
property between named places even though the numeric save remains valid. Mod
authors must append new slots or deliberately replace the presentation of an
existing index.

Do not make `settlementSites` an installed bookmark world field. It is the shared
physical coordinate table consulted while compiling the bookmark's province
presentations. The bookmark-owned ordered lists remain inside `provinces`.

## Implementation milestones

Land the work in this order. The final feature should ship as one coherent MINOR,
but intermediate commits may keep the change reviewable.

### Milestone 1: data file, schema, and validation

- Add `data/settlements.js` after `data/bookmarks.js` in `index.html`.
- Define the physical-site table and small initial layouts for both bookmarks.
- Clone layouts onto the correct bookmark province objects.
- Add validation for sites and province lists.
- Add the mod merge for `settlementSites`.
- Update the load-order description, province design, and mod schema.

Acceptance:

- both core bookmarks validate;
- malformed site data reports all useful faults;
- 867 and 1066 layout arrays do not alias each other; and
- a legacy mod with no site fields still validates and boots through fallback.

### Milestone 2: compiled sites and compatibility projection

- Compile authored coordinates and four fallback slots per settled county.
- Add deterministic in-county snapping and actionable excessive-snap faults.
- Refactor `FB.settlementsOf` around the compiled list.
- Preserve names, counts, kind thresholds, and index behavior for an entirely
  un-authored county.
- Make `FB.settlementDevelopment` truthful for authored baselines.
- Provide the allocation-free map-facing visibility/kind seam.

Acceptance:

- all returned site points belong to their declared raster county;
- generated output is byte-stable across repeated calls and bookmark switches;
- reading settlements consumes no saved RNG and mutates no state or data; and
- pre-feature numeric property records still resolve to the same indices.

### Milestone 3: universal settlement sheet

- Add county, kind, holder context, structures, ruins, and matching household
  property to the existing sheet.
- Move every construction and demolition authorization check inside the sheet.
- Preserve current demesne building flows.
- Make foreign and non-demesne sheets read-only.
- Update Guide text and route all new chrome through i18n.

Acceptance:

- a foreign site exposes no mutating control;
- a valid demesne site retains construction and demolition;
- property is shown only for the exact province and numeric slot; and
- modal keyboard, Back, and narrow-screen behavior remain consistent.

### Milestone 4: marker rendering and semantic taps

- Add detail thresholds, priority, viewport culling, and label collision.
- Retain the drawn marker list for hit-testing.
- Add mouse and touch/pen hit radii.
- Pass the optional site hit through the map callback.
- Preserve every explicit county-targeting mode before opening a sheet in
  ordinary browsing.

Acceptance:

- close zoom reveals stable markers without strategic-zoom clutter;
- overlapping labels resolve deterministically while markers remain usable;
- an ordinary marker tap selects the county and opens the exact slot; and
- travel, armies, war targeting, and start selection continue to receive the
  parent county.

### Milestone 5: historical content for both bookmarks

- Complete the required authoring scope in priority order.
- Reuse physical slugs across dates and author date-specific presentation.
- Review every automatic coordinate snap.
- Keep uncertain minor places generated.
- Check high-density regions for label quality at both detail thresholds.

Acceptance:

- both bookmarks have authored capitals and other required high-value sites;
- no authored site is assigned to two counties in one bookmark;
- names and baseline kinds are defensible for the selected date; and
- every un-authored county still has complete generated interaction coverage.

### Milestone 6: documentation, tests, and integration preparation

- Update `docs/designs/provinces.md`, `docs/designs/development.md`,
  `docs/designs/mods.md`, `docs/designs/ui.md`, and `docs/MODDING.md` to match the
  implemented contracts.
- Update the in-game Guide for historical sites, development-driven promotions,
  map markers, and read-only foreign sheets.
- Add the browser coverage below.
- Confirm the new data file is included by the runtime asset-manifest path through
  its `index.html` script tag.
- At owner-requested integration, follow the repository version, changelog, i18n,
  and commit-subject rules.

## Automated coverage to author

Add `tests/e2e/specs/settlement-map.spec.js` for the feature contract. Update an
existing bookmark, mod, or storage spec only when that is clearer than duplicating
its harness.

AI coding agents must author the tests but must not run the repository test
harness.

### Data and validation

- both core bookmarks validate with their independent site lists;
- duplicate site assignment, missing physical site, invalid coordinates,
  unsupported kind, duplicate county name, wasteland sites, and more than four
  authored sites each produce an actionable fault;
- an old-style mod without site data receives deterministic fallbacks; and
- a mod-provided physical site and complete province list compile successfully.

### Determinism and bookmark switching

- a known authored site has the expected slug, bookmark-specific name, kind, and
  parent county in 867 and 1066;
- the same physical slug compiles to the same geographic point subject to the
  same deterministic county snap;
- generated names, slugs, and points are stable across repeated reads;
- settlement reads leave `state.rng` and serialized state unchanged; and
- switching 867 to 1066 to 867 restores the exact first compiled result without
  stacking map listeners.

### Save and property compatibility

- a pre-feature save or setup with buildings, a plot, a manor, and an enterprise
  at numeric indices displays each asset at the same province and index;
- an authored presentation replacing one generated slot changes only its derived
  name/site/position, not the stored property reference; and
- no site or marker fields appear in serialized state.

### Settlement sheet

- an ordinary demesne sheet retains valid raise and demolish controls;
- a foreign and a non-demesne sheet show structures but no mutating controls;
- exact-slot plots, manor, and enterprises appear, while neighboring-slot
  property does not;
- the localized kind and development explanation match the runtime projection;
  and
- keyboard focus, Escape/Back, and a narrow viewport remain usable.

### Map markers and input

- strategic zoom draws no settlement hit targets;
- detailed zoom creates hit targets only for currently visible sites;
- a label collision hides the lower-priority label without removing its marker;
- an ordinary mouse click and touch pointer open the same exact settlement, with
  the touch radius accepting a wider near miss;
- overlap selection follows distance and stable priority;
- a marker click in travel, army-order, war/start picker, and ordinary browsing
  exercises the documented precedence; and
- switching bookmarks clears stale visible-marker hit targets.

### Runtime boundary

- the new data script loads under both `file://` and served-origin projects;
- the runtime manifest includes the script through the normal derived asset list;
  and
- no external request or runtime dependency is introduced.

## Owner-run manual and performance gates

The owner performs these checks under repository policy:

- 867 and 1066 at strategic, intermediate, and detailed zoom;
- mouse wheel, drag, click, pinch, and touch tap on desktop and a low-end phone;
- dense urban regions, sparse counties, islands, coasts, and very small counties;
- foreign and demesne sheets, including construction and demolition;
- travel destination selection, army marching, war targeting, and new-game start
  selection through a visible marker;
- `file://`, served origin, installed/offline play, and itch iframe behavior;
- bookmark switching and old-save restoration in one page session; and
- pan and pinch responsiveness with the maximum visible marker density.

Profile before adding spatial buckets or lowering detail. The acceptance bar is
no settlement-caused long task that makes pan or pinch visibly hitch on the
target phone, and no material regression to bookmark world-generation time
beyond the one-time validation and projection pass.

## File-level outline

- `data/settlements.js`: physical sites and base 867/1066 ordered layouts.
- `data/bookmarks.js`: no duplicated settlement catalog; only any helper or clone
  seam required by the new data file.
- `index.html`: load `data/settlements.js` immediately after bookmarks.
- `js/world.js`: validation, compile, deterministic fallback, projection, public
  settlement projection, and map-facing site helpers.
- `js/mapview.js`: marker drawing, collision, retained visible hits, and pointer
  hit-testing.
- `js/ui_misc.js`: map-tap precedence and shared localized presentation helpers.
- `js/ui_modals.js`: universal read-only/actionable settlement sheet.
- `js/mods.js`: merge the optional physical-site table.
- `docs/designs/` and `docs/MODDING.md`: implemented architecture and public
  schema.
- `tests/e2e/specs/settlement-map.spec.js`: primary deterministic browser
  coverage.
- `AGENTS.md`: exact data-script load order after the new file is added.

`js/save.js`, persisted state shape, province ids, and existing property records
should not need changes. Any discovered need to alter them is a design stop that
requires owner review before proceeding.

## Completion criteria

- Every settled county in both bookmarks exposes two to four stable, clickable
  site slots through authored data plus deterministic fallback.
- Authored sites have stable physical slugs, valid coordinates, and independent
  bookmark presentation.
- Every compiled point belongs to its declared gameplay county.
- Existing buildings, plots, manors, and enterprises retain their numeric slot
  and behavior in old saves.
- Close zoom shows legible, collision-aware settlement detail without cluttering
  strategic zoom.
- Ordinary marker taps open the exact settlement sheet, while every explicit
  county-targeting mode remains county-based.
- Foreign sheets are read-only and demesne actions retain authoritative gates.
- Mods without the new schema continue through deterministic fallback, and mods
  using it receive fail-closed validation.
- The feature adds no saved derived state, external asset, dependency, module,
  build step, or unseeded gameplay randomness.
- Documentation and deterministic tests describe the implemented contract, with
  test execution and manual performance review left to the owner.
