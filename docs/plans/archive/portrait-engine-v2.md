# Plan: portrait engine v2

Date: 2026-07-31

Status: implementation prepared; owner-run automated, visual, mobile, and integration
gates remain. The visual direction and runtime architecture are decided below. The
approved Court Illustration v2 renderer is included at
[tools/portrait-reference](../../tools/portrait-reference/README.md). Use it as the
visual and behavioral reference. Do not approximate or redesign the selected look from
this plan alone.

Related design:
[characters](../designs/characters.md),
[UI](../designs/ui.md),
[items](../designs/items.md),
[state and saves](../designs/state-and-saves.md), and
[internationalization](../designs/i18n.md).
The implementation and its tests are governed by [TESTS](../TESTS.md), and the final
integration follows [VERSIONS](../VERSIONS.md).

## Goal

Replace the current analytic character portraits and household paper dolls with the
selected Court Illustration v2 look while keeping ordinary play at current performance
or better.

The completed feature must provide:

- one deterministic illustrated identity for every full character record, including
  every living AI ruler and court character;
- compact illustrated busts everywhere the game currently uses `canvas.pface`;
- illustrated full figures in the existing equipment and death views;
- exact visible health, wound, trait, rank, profession, faith, culture, and equipment
  cues;
- no external assets, libraries, build step, network request, or persisted bitmap data;
- bounded memory independent of the number of characters in the world; and
- no portrait work for characters who are not being displayed.

The performance design is not optional. The generic pipeline used to select the reference
look cost about 4.4 ms of JavaScript per bust and 5.4 ms per figure in a headless probe,
compared with about 0.025 ms for the current renderer. Its cost was nearly flat with
output resolution because most work was hidden geometry preparation. A 30x36 face was
therefore not meaningfully cheaper than a 256 px card.

The extracted reference already removes culling, triangle sorting, contour extraction,
and alternate render modes that Court Illustration v2 never reads. It still builds hidden
anatomy and costume meshes to produce projected landmarks. It is an output oracle, not
the shipping implementation or the final performance target. The game must still use the
specialized analytic scaffold and pixel caches below.

## Reference renderer contract

The development-only reference lives under `tools/portrait-reference/` and is not loaded
by the game. Open its `index.html` directly from `file://` to render one deterministic
character as both a 256x288 portrait and a 256x480 standing figure.

The stable adapter is `window.FBCourtReference`:

```js
var spec = FBCourtReference.makeSpec("comparison-seed");
FBCourtReference.renderPortrait(portraitCanvas, spec, { width: 256 });
FBCourtReference.renderFigure(figureCanvas, spec, { width: 256 });
```

Only Court Illustration v2 is registered. The internal files exist so an implementation
agent can inspect the exact face, hair, headwear, costume, body, background, wound, and
detail constructions. The following boundaries are mandatory:

- do not add reference scripts to the game `index.html`;
- do not call `FBCourtReference` from shipping code;
- do not port its hidden vertex, face, costume-mesh, cull, sort, or contour structures;
- use its portrait and figure output to build side-by-side development comparisons; and
- port required drawing behavior into `js/portrait.js`.

Treat `js/reference.js` as the stable entry point and the remaining files as inspectable
implementation detail. Do not edit the reference while porting the shipping renderer. If
the reference fails to render either mode, record that as a blocker instead of changing
the visual oracle and the implementation in the same workstream.

## Current contracts and constraints

The implementation starts from these shipped contracts:

- `js/portrait.js` owns procedural portraits, figures, item art, and `FB.faceTag`.
- `FB.paintPortrait(canvas, c, year, opts)` paints one bust synchronously.
- `FB.paintPaperDoll(canvas, c, state, opts)` paints one full figure synchronously.
- `FB.paintFaces(root, state)` paints all `canvas.pface`, `canvas.paperdoll`, item-art,
  and crest canvases under a rendered UI root.
- `FB.characterVisualKey(state, c, opts)` is the public invalidation key.
- `FB.faceTag(c, w, h)` emits the compact canvas markup used throughout `js/ui.js`.
- The persistent top-bar portrait calls `FB.paintPortrait` directly and already checks
  `FB.characterVisualKey` before repainting.
- Court and ordinary UI call sites go through `FB.faceTag` and `FB.paintFaces`.
- The realm court strip is bounded to six court members plus the ruler.
- Full figures currently appear only in the equipment and death flows.
- The largest ordinary compact portrait is 72x82. Other common sizes are 30x36,
  32x38, 36x42, 40x46, and 56x64.
- Full-figure canvases are currently 240x450 and are displayed at no more than 180 CSS
  pixels wide on desktop and 150 CSS pixels wide in the narrow layout.
- `UI.refresh` is coalesced through `requestAnimationFrame`, but `renderChar`,
  `renderFamily`, `renderNetwork`, and `renderProv` rebuild their panel markup whenever
  their active tab refreshes.
- Portraits are derived state. Saves contain character and item inputs, never pixels.

Keep the existing public signatures. Optional trailing options may be added, but existing
callers must continue to work unchanged.

## Locked decisions

These choices are part of this plan. An implementation agent must not reopen them merely
because another approach is possible.

| Question | Decision |
| --- | --- |
| Shipping look | Court Illustration v2 is the only shipping portrait style. No style picker is added. |
| Geometry | The game uses a direct analytic landmark scaffold. It does not build, cull, sort, contour, or retain a hidden triangle mesh. |
| Drawing path | The shipping painter uses the native Canvas 2D context directly. It does not port brush registries, context wrappers, per-mark `Path2D` recording, masks, shape transforms, or per-pixel relighting. |
| Character population | Character records may be eager. Portrait pixels are always lazy and generated only for requested canvases. |
| Compact cache | One 64-cell, 96x108 offscreen atlas, about 2.53 MiB of raw RGBA, stores recent opaque busts with LRU replacement. |
| Large busts | Targets larger than 96x108 render directly at their requested size and do not enter the compact atlas. |
| Target reuse | Every target canvas carries an in-memory render stamp. An unchanged persistent canvas receives no draw call. |
| Cold bursts | The first cold face in a `paintFaces` pass renders synchronously. Further cold faces are grouped by visual key and rendered through a bounded animation-frame queue. |
| Full figures | Full figures remain limited to player-managed equipment views and the existing death view. Ordinary AI ruler sheets use busts. |
| Figure size and cache | Equipment and death figures use a 192x360 backing canvas and a separate one-entry MRU raster. They never occupy the compact atlas. |
| UI churn | The portrait-heavy Self, Kin, Network, and Land panels retain their DOM when their generated markup is unchanged. |
| Equipment | Existing saved item definitions and visual seeds stay authoritative. V2 changes presentation, not loadout state or item mechanics. |
| Fallback | The old renderer may exist behind a temporary development constant while parity is checked. It is removed before integration. There is no player-facing quality toggle. |
| Threads | The implementation stays on the main thread. It does not add Web Workers or `OffscreenCanvas` worker plumbing. |
| Persistence | No portrait bitmap, atlas, descriptor cache, or render queue enters a save, `localStorage`, IndexedDB, or Cache Storage. |
| Save and text impact | No save-version bump and no new player-facing text are required. |

## Non-goals

- Do not ship comparison styles, style registries, authoring controls, galleries, export
  controls, or visual-debug overlays.
- Do not add WebGL, ray marching, image assets, generated image files, fonts, shaders, or
  third-party rendering code.
- Do not render or cache every ruler or every court member during world creation, load,
  yearly aging, succession, or autosave.
- Do not create an AI inventory or equipment simulation as part of the portrait work.
- Do not put full figures into every character sheet.
- Do not change character generation, court eagerness, succession, compaction, mortality,
  relationship indexing, or save serialization.
- Do not change the item data schema. Existing `art.kind`, palette arrays, `quality`,
  `visualSeed`, `motif`, `slot`, and `grip` remain sufficient.
- Do not treat a cached descriptor or mesh as a substitute for cached pixels. The
  remaining draw pass is still too expensive to run on every refresh.

## Architecture

The runtime path has three cache levels:

```text
character + state + frame options
              |
              v
   normalized portrait descriptor and visual key
              |
              v
 target canvas already stamped with this key and size?
       | yes                         | no
       v                             v
    no work                 compact atlas contains key?
                                  | yes       | no
                                  v           v
                                blit     cold direct render
                                                |
                                                v
                                      atlas/MRU insert and blit
```

### Normalized portrait descriptor

Add one internal function in `js/portrait.js`:

```js
function portraitDescriptor(state, c, year, opts) {
  return {
    key: '...',
    frame: 'bust',
    spec: { /* render-ready visual values */ },
    loadout: { /* read-only resolved visual slots */ }
  };
}
```

The descriptor is the only place that reads game state for portrait appearance. The
painter consumes only the descriptor and cannot mutate the character, loadout, item
instances, player state, RNG stream, or data catalogs.

`FB.characterVisualKey` returns `portraitDescriptor(...).key`. `FB.paintPortrait` and
`FB.paintPaperDoll` build the same descriptor rather than maintaining another input
list. A new appearance field must be added to the descriptor and its key in the same
edit.

The key is built from normalized output-affecting values, not raw objects:

| Input | Normalization and key rule |
| --- | --- |
| Identity | Stable hash of `c.id + '|' + c.name`; include id and name in the key. |
| Dynasty | Include `c.dyn` because it chooses the background hue. |
| Sex | Use `c.sex`. |
| Age | Use `Math.max(0, year - c.born)`, not both absolute year and birth year. |
| Culture | Use `c.culture`; unknown/mod cultures fall back through `FB.cultureOf` to a deterministic nearest palette rather than throwing. |
| Faith | Use the group returned by `FB.religionOf(c.religion)`, plus the religion id only if a wardrobe rule distinguishes individual faiths. |
| Station | Use the exact tier supplied in `opts`, otherwise player tier for the protagonist and `FB.stationOf(c)` for everyone else. Clamp to 0 through 7. |
| Profession | Use `opts.profession`, otherwise the established character career, then role, then `none`. Children resolve to `none` for wardrobe purposes. |
| Health | Resolve to `hale`, `sick`, or `dying`. `dying` is health 2 or below. `sick` is health 4 or below, a sickness ailment, or the legacy protagonist illness flag. Exact health values inside one class do not invalidate the portrait. |
| Expression | Only traits the painter reads affect it. `cruel` or `wrathful` resolve to guarded; `kind` or `generous` resolve to warm; otherwise use the seeded neutral expression. |
| Permanent marks | Include the presence of `scarred` and `one_eyed`. Unrelated traits do not invalidate pixels. |
| Temporary marks | Resolve `FB.ailmentsOf(c)` into deterministic visible decal descriptors. Include only sickness state and ailments whose definitions carry a portrait `mark`. |
| Bust equipment | Include only head, neck, and body visual slots. Boots or a hand weapon must not evict a bust that cannot show them. |
| Figure equipment | Include every visible loadout slot, item reference or snapshot id, art kind, quality, visual seed, and motif. |
| Frame | Include bust versus figure and any transparency/suppression option that changes pixels. Target dimensions are part of the target stamp, not the compact atlas key. |

Do not concatenate all traits or serialize complete character/item objects. Stable,
normalized tokens make unnecessary cache misses visible in review.

### Deterministic identity

The descriptor seeds immutable facial DNA from the character identity hash. It derives:

- face width, jaw, chin, cheek, eye size and spacing, brows, nose, mouth, ears;
- natural hair and eye colors within culture ranges;
- hair amount, style variants, beard amount and cut;
- asymmetry, build, stature, light side, background hue, and minor marks; and
- deterministic wardrobe and decal variants.

Live game facts override only their own axes. Sex, age, culture, faith, station,
profession, health, traits, ailments, and equipment come from the character record and
state. Looking at a character never consumes `FB.rng`, `FB.ri`, `FB.pick`, or
`Math.random()`.

Use separately salted local streams for identity, wardrobe, decals, and incidental
detail. Adding one hair detail must not reshuffle wound placement or clothing.

### Direct analytic landmark scaffold

The approved illustration needs head parameters, material colors, anchors, and landmark
orientation. It does not need rendered mesh faces.

Implement a specialized scaffold with this shape:

```js
{
  params: { /* head and shoulder/body proportions */ },
  colors: { /* resolved skin, hair, cloth, metal, linen, item colors */ },
  anchors: { /* projected named points */ },
  landmarks: { /* projected point, tangent, normal, visibility */ },
  body: { /* figure proportions and equipment anchors, figure only */ }
}
```

The scaffold must:

1. Derive the same head and body parameters as the approved reference.
2. Construct only the named unprojected anchors used by the illustration.
3. Apply the selected fixed bust or standing-figure pose.
4. Project each named point and each landmark tangent/normal directly.
5. Resolve costume colors without constructing costume shells.
6. Produce no vertex list, face list, painter order, material-edge map, contour list,
   silhouette, depth buckets, or region map.

Expected anchors include eyes, eye outer corners, brows, nose tip/base, mouth and mouth
corners, chin, ears, throat, crown, hairline, shoulders, chest, waist, hips, hands, knees,
ankles, feet, and sole. Keep their names stable because equipment and decals attach to
them.

Build a development-only comparison fixture outside the shipped runtime path. For each
case, create a reference specification with `FBCourtReference.makeSpec`, render its bust
and figure through the stable reference adapter, convert that specification into the
equivalent normalized game descriptor inside the fixture, and render the shipping bust
and figure beside it.

Compare observable output rather than requiring identical Canvas call traces. The direct
scaffold intentionally replaces the hidden geometry pipeline, so internal call sequences
will differ. The acceptance target is the same deterministic identity, landmark
placement, silhouette proportions, framing, costume semantics, and visible condition
cues. Compare at least:

- 24 varied adult/child/elder busts;
- 12 full figures;
- both sexes;
- every shipped culture family and faith group;
- every headwear type used by the game;
- hale, sick, dying, scarred, one-eyed, cut, bruise, and bandage cases; and
- empty, ordinary, masterwork, unique, and two-handed loadouts.

### Shipping painter

Port only the selected illustration's actual constructions:

- background and court arch;
- back hair, neck, torso or figure, draped costume, ears, head, and facial structure;
- eyes, brows, nose, mouth, beard, mustache, hair, and headwear;
- sickness treatment, wounds, scars, one-eyed treatment, jewelry, and bandages;
- rank/profession/culture/faith wardrobe;
- full-body garment, limbs, hands, hose, shoes, belt, and equipment passes; and
- final frame treatment.

The painter receives a raw `CanvasRenderingContext2D`, a descriptor, a viewport, and a
quality profile. It must use `save`/`restore` around the whole render and leave the
caller's transform, clipping path, alpha, composite mode, line properties, shadows, and
styles unchanged.

Do not port generic brush interception. Helpers may set direct fill/stroke styles and
construct paths on the active context. Precompute CSS colors on the descriptor instead
of repeatedly converting RGB arrays during each mark.

The apparent head size controls detail. Compact bust masters and small figure heads keep
the marks that communicate identity, while omitting marks that compete for the same few
pixels:

- always keep silhouette, eyes, brows, nose base, mouth, hair mass, major wound, and
  headwear;
- omit skin grain, crow's feet, brow grain, individual hair strands, and minor fabric
  texture below their measured pixel thresholds; and
- clamp important stroke widths by output pixels so a subpixel stroke does not fade
  into an unreadable tint.

### Compact portrait atlas

Create one detached opaque canvas with these fixed dimensions:

```text
cell:   96 x 108
grid:    8 x 8
atlas: 768 x 864
slots: 64
raw RGBA: 2,654,208 bytes, about 2.53 MiB
```

Use one shared context created with `{alpha:false}`. Do not request
`willReadFrequently`; the shipping style performs no pixel readback.

Each atlas entry contains:

```js
{ key:key, slot:slotIndex, used:monotonicCounter }
```

A plain key-to-entry object plus a 64-entry scan on cold eviction is sufficient. An
O(64) scan occurs only on a cache miss and avoids a larger linked-list implementation.

On an atlas hit:

1. Update `used`.
2. Clear the target canvas.
3. Enable image smoothing and request high smoothing quality where supported.
4. Blit the source cell into the target's full backing rectangle.
5. Store `key + '@' + width + 'x' + height` on the target as its render stamp.

On a miss:

1. Select an unused slot or the least-recently-used entry.
2. Paint the opaque illustration directly into that cell using a translated/clipped
   viewport. Do not allocate a canvas per portrait.
3. Replace the slot metadata.
4. Blit to every connected target waiting for that key.

Track the `state` object associated with the atlas. A new state object clears atlas
metadata, target queues, and figure MRU state. Clearing metadata is sufficient; unused
old pixels are inaccessible until their slots are repainted.

`FB.clearPortraitCache()` clears these derived caches explicitly. Call it from the
existing new-game/load transition where the UI already clears the top-bar portrait key,
and from any runtime mod-reload path that can change item, culture, religion, trait, or
ailment definitions.

### Target canvas stamps

Set an expando such as `canvas._fbPortraitStamp`; do not write the key into visible HTML
or saved state.

Before any cache lookup, compare the desired stamp with the target stamp. If they match,
return without acquiring a context or calling `drawImage`. Include backing width and
height because assigning either canvas dimension clears its bitmap without clearing a
JavaScript expando.

This level makes retained Self, Kin, Network, and Land canvases cheaper than both a v1
repaint and an atlas hit.

### Cold-render queue

`FB.paintPortrait` remains synchronous for its public single-canvas contract. It may use
the atlas when the request is an eligible opaque compact bust.

`FB.paintFaces` handles bursts:

1. Target-stamp hits do nothing.
2. Atlas hits blit immediately.
3. The first cold compact bust in a call renders synchronously so a selected character
   or one-person event never opens blank.
4. Remaining cold compact busts join a queue grouped by visual key.
5. Paper dolls, item art, and crests retain their synchronous behavior.

The queue uses `requestAnimationFrame`, not an arbitrary timeout or
`requestIdleCallback`. During one callback it renders at least one cold key, then
continues only while less than 6 ms has elapsed. If one portrait itself exceeds the
budget, it completes that portrait and yields immediately.

Each queued key owns a list of target canvases. Before painting or blitting, discard a
target when:

- it is no longer connected;
- its state object is no longer current;
- its character no longer resolves;
- its current desired visual key differs from the queued key; or
- its backing dimensions are zero.

If a later `paintFaces` call requests the same pending key, add its canvas to the existing
waiter list rather than enqueueing a second render. Bound pending cold keys to 128. When
the bound is reached, discard disconnected/stale waiters before accepting more work.

Add optional `{immediate:true}` to `FB.paintFaces` for deterministic development tooling
and focused tests. Normal UI callers use the default scheduled behavior.

### Stable panel markup

Add a small module-local helper in `js/ui.js`:

```js
function replacePanelMarkup(key, box, html) {
  var stamp = FB.state + '|' + FB.locale + '|' + html;
  if (panelMarkup[key] === stamp) return false;
  panelMarkup[key] = stamp;
  box.innerHTML = html;
  return true;
}
```

Do not stringify the state object literally as in the sketch. Store a separate state
reference and locale alongside the markup string.

Apply the guard to:

- `renderChar` for `tab-char`;
- `renderFamily` for `tab-family`;
- `renderNetwork` for `tab-network`; and
- `renderProv` for `tab-prov`.

When markup is unchanged:

- keep existing DOM nodes and event listeners;
- still call `FB.paintFaces` so a visual-only change such as equipment can update an
  existing canvas through its target stamp; and
- skip localization, listener wiring, large-list initialization, and other setup that
  belongs only to newly inserted nodes.

When markup changes, replace, localize, paint, and wire exactly as today. Reset all panel
markup records on state replacement and locale change. Including `FB.locale` in the
guard is required because localization may transform strings after insertion.

Do not apply this optimization blindly to event choice DOM, active form inputs, or modal
history. The four named panels are the scope of this implementation.

### Full figures and equipment

Replace the current nested face-plus-paper-doll composition with one v2 figure render.
The figure uses the same descriptor and facial DNA as its bust.

Change the equipment and death canvas backing dimensions in `js/ui.js` from 240x450 to
192x360. Retain the existing 8:15 aspect ratio and CSS width rules.

Maintain one figure MRU entry:

```js
{ key:key, canvas:offscreen192x360 }
```

The figure key includes all equipment visual slots and explicit snapshot data. Reopening
the same unchanged equipment sheet blits the MRU. A different figure replaces it. There
is no multi-character figure LRU.

Use these equipment mappings *(superseded during implementation for hand objects: the
owner directed that weapons, shields, tools, and books never composite onto the hands —
icon art glued to the body read as floating objects. Hand objects render as framed inset
panels in the card's bottom corners below the figure, one per hand and a single panel
for a shared two-handed object, replacing the held poses below. Worn
slots — including the ring, drawn as a band and stone on the hand — integrate through
constructions and item palettes)*:

| Item art kind | V2 treatment |
| --- | --- |
| `crown` | Replaces generated headwear with the crown construction; item metal, gem, quality, and visual seed choose its colors/details. |
| `helm` | Replaces generated headwear with the helm construction and suppresses covered hair. |
| `jack` | Replaces or overlays the base torso garment with the item cloth/thread palette. |
| `boots` | Replaces cosmetic shoes and follows the two foot anchors. |
| `belt` | Draws at the waist anchor over the garment. |
| `pendant`, `relic` | Draws at the neck/chest anchor after the garment and before foreground arms where appropriate. |
| `ring` | Draws on the visible hand at figure scale. It need not appear in compact busts. |
| `sword`, `seax` | Uses one hand and the existing side-held blade pose. |
| `spear` | Uses the shared two-handed pose when equipped in both hands. |
| `shield` | Uses the assigned hand and sits partly in front of the torso. |
| `book`, `picks`, generic | Uses the assigned hand with deterministic angle and the current procedural item-art fallback. |

Preserve the current two-handed invariant: when left and right resolve to the same
two-handed item, both arms and hands meet the shared grip, and the item is drawn once.

For compact busts:

- head items replace generated headwear;
- body items affect the visible shoulder/torso band;
- neck items remain visible *(superseded during implementation: the owner removed all
  neck rendering from busts — the tight head crop leaves no chest to hang it on — so
  Neck joined the slots that neither paint nor key compact busts; figures still show
  neck items)*; and
- hand, waist, feet, and ring slots do not enter the bust key or painter.

AI rulers without a player-managed loadout use generated rank/profession/culture/faith
wardrobe. This work does not invent items for them.

Frozen death loadouts continue to resolve through `FB.resolveItemSnapshot`. Do not ask
`FB.loadoutOf` for the dead character when an explicit snapshot was supplied.

## Implementation milestones

### Milestone 1: descriptor and compatibility seam

Files:

- `js/portrait.js`
- `js/ui.js` only if needed to pass explicit options already available at call sites
- `tests/e2e/specs/portrait-v2.spec.js`, new
- `tests/e2e/specs/eager-courts.spec.js`, update portrait-key expectations

Work:

1. Add `portraitDescriptor` while the old painter remains active.
2. Change `FB.characterVisualKey` to return the descriptor key.
3. Route the old painter's live inputs through the descriptor where practical, without
   changing pixels yet.
4. Add normalized wound/decal and loadout visual descriptors.
5. Prove descriptor construction and painting do not mutate state or consume gameplay
   RNG.
6. Add the temporary development renderer constant, defaulting to the old painter until
   Milestone 3.

Acceptance:

- same character/state/options produce the same key repeatedly;
- age, visible health class, visible trait, visible ailment, tier, profession, culture,
  faith, dynasty, and relevant equipment changes move the key;
- an unrelated trait does not move the key;
- boots and weapons do not move the bust key but do move the figure key;
- a court ruler receives a complete descriptor without materializing or mutating any
  additional state; and
- old portrait purity tests remain valid.

### Milestone 2: specialized scaffold

Files:

- `js/portrait.js`
- [reference renderer](../../tools/portrait-reference/README.md), read-only visual oracle
- temporary development-only comparison fixture, kept outside the shipped runtime path

Work:

1. Port the selected head/body parameter resolver.
2. Implement direct unprojected anchors and landmarks.
3. Implement bust and standing-figure projection.
4. Resolve standard wardrobe and material colors without costume geometry.
5. Build a fixed comparison fixture that renders representative reference specifications
   through `FBCourtReference.renderPortrait` and `FBCourtReference.renderFigure`, then
   renders equivalent normalized descriptors through the shipping scaffold.
6. Delete any experimental vertex, face, cull, sort, contour, or mesh-cache code from
   the game implementation before continuing.

Acceptance:

- portrait and full-figure comparison matrices preserve the reference landmarks,
  silhouette proportions, framing, and deterministic identity cues;
- scaffold output contains no arrays proportional to mesh tessellation;
- a compact bust scaffold does not depend on target pixel dimensions; and
- repeated scaffold generation is deterministic and state-pure.

### Milestone 3: Court Illustration v2 bust painter

Files:

- `js/portrait.js`
- `tests/e2e/specs/portrait-v2.spec.js`

Work:

1. Port the selected bust drawing constructions onto the raw context.
2. Add apparent-size detail gates and output-pixel stroke floors.
3. Map all game cultures and faith groups with deterministic fallbacks.
4. Map health, expression traits, scarred, one-eyed, and ailment decals.
5. Map rank/profession wardrobe and bust-visible equipment.
6. Switch the temporary development constant to v2.
7. Keep `FB.paintPortrait` synchronous and signature-compatible.

Acceptance:

- every generated AI ruler and court character paints without fallback or exception;
- children, adults, elders, both sexes, culture families, faith groups, ranks, and
  professions remain legible at 30x36 through 72x82;
- multiple visible ailments resolve deterministically without overlapping the same
  feature blindly;
- transparent and equipment-suppressed compatibility options still work when requested;
- repainting the same descriptor produces the same pixel hash in the pinned browser; and
- `FB.paintPortrait` leaves state and the gameplay RNG unchanged.

### Milestone 4: target stamps and compact atlas

Files:

- `js/portrait.js`
- `tests/e2e/specs/portrait-v2.spec.js`

Work:

1. Add the 64-cell atlas and LRU metadata.
2. Add target stamps.
3. Route eligible `FB.paintPortrait` and `FB.paintFaces` busts through the atlas.
4. Add state-reference invalidation and `FB.clearPortraitCache`.
5. Keep large, transparent, and special direct renders out of the compact atlas.
6. Add a read-only `FB.portraitCacheStats()` diagnostic returning counts only:
   `{entries, bytes, targetHits, atlasHits, coldRenders, queued}`.

Acceptance:

- the second paint of an unchanged persistent canvas does not call `drawImage` or the
  cold painter;
- a new canvas with an existing key receives one atlas blit and no cold render;
- 65 distinct keys leave exactly 64 entries and evict the least recently used entry;
- atlas memory remains the declared fixed size;
- a new state clears entries and pending work;
- changing target width/height invalidates its target stamp; and
- diagnostic counters are derived and never serialized.

### Milestone 5: bounded cold queue

Files:

- `js/portrait.js`
- `tests/e2e/specs/portrait-v2.spec.js`

Work:

1. Add grouped pending keys and target waiter lists.
2. Render the first cold face synchronously and schedule later cold faces.
3. Enforce the 6 ms frame budget and 128-key pending bound.
4. Drop disconnected, stale-state, stale-key, missing-character, and zero-size targets.
5. Add optional `{immediate:true}` without changing ordinary callers.

Acceptance:

- a seven-person cold court renders one face synchronously and queues the remainder;
- duplicate keys cold-render once and populate every waiting canvas;
- removing a modal before the next frame performs no stale blit;
- replacing state cancels the old queue;
- a later visual change prevents an old queued key from painting over the new face;
- cache hits never wait for the queue; and
- immediate mode leaves no queued work for its root.

### Milestone 6: stable portrait-heavy panels

Files:

- `js/ui.js`
- `tests/e2e/specs/portrait-v2.spec.js`
- `docs/designs/ui.md`

Work:

1. Add the state/locale-aware panel-markup helper.
2. Apply it to Self, Kin, Network, and Land.
3. Split each renderer's insertion/setup block so listeners are wired only after an
   actual replacement.
4. Call `FB.paintFaces` on both paths, relying on target stamps for the unchanged path.
5. Reset markup records in `UI.showGame` and the locale transition path.

Acceptance:

- an unchanged refresh preserves the exact canvas DOM node;
- an unchanged stamped canvas incurs a target hit and no blit;
- an equipment-only visual change repaints the retained canvas even when text markup is
  unchanged;
- an age, relationship, Standing, locale, selected province, or list-filter change still
  updates the correct panel;
- existing event listeners fire once, not once per refresh; and
- focus/search state in the Network large-list surface survives an unchanged refresh.

### Milestone 7: full figure and equipment integration

Files:

- `js/portrait.js`
- `js/ui.js`
- `css/style.css` only if the backing-size change exposes a layout assumption
- `tests/e2e/specs/portrait-v2.spec.js`
- `docs/designs/items.md`

Work:

1. Port the v2 figure body and standing pose onto the direct scaffold.
2. Paint head and body in one render. Remove the temporary nested face canvas.
3. Add the figure item mappings and two-handed pose.
4. Add explicit snapshot handling for the death view.
5. Add the 192x360 one-entry figure MRU.
6. Change equipment and death markup backing dimensions to 192x360.

Acceptance:

- bust and figure share the same face, hair, age, marks, and wardrobe identity;
- every item art kind renders in its correct slot;
- head/body equipment overrides rather than duplicates generated clothing;
- a two-handed item is drawn once and both hands meet it;
- frozen death equipment matches the saved snapshot even after succession changed live
  loadouts;
- reopening an unchanged figure produces an MRU blit;
- opening a different figure replaces rather than grows the figure cache; and
- no full figure renders during a normal day tick with no equipment/death modal open.

### Milestone 8: documentation, cleanup, and integration preparation

Files:

- `docs/designs/characters.md`
- `docs/designs/ui.md`
- `docs/designs/items.md`
- `docs/plans/portrait-engine-v2.md`
- `js/portrait.js`
- relevant tests

Work:

1. Record the descriptor, atlas, queue, derived-state, and full-figure rules in the
   system design docs.
2. Remove the v1 renderer, temporary development switch, reference comparison plumbing,
   and unused compatibility helpers.
3. Confirm there are no style registries, comparison modes, mesh structures, external
   paths, authoring controls, or development assets in shipped code.
4. Confirm no new user-facing strings were added. If implementation discovers a real
   need for one, route it through i18n and let the normal integration workflow maintain
   catalogs.
5. Leave `FB.VERSION`, `FB.CHANGELOG`, and generated catalogs untouched until the owner
   requests the final integration.

Acceptance:

- the new plan is marked implemented only after owner-run automated and manual gates;
- shipped files remain zero-dependency and work from `file://`;
- no save fields or migrations were added;
- all public portrait/item APIs retain their documented behavior; and
- only the selected Court Illustration v2 implementation remains.

## Automated test plan

Create `tests/e2e/specs/portrait-v2.spec.js` and update existing portrait expectations in
`eager-courts.spec.js` where the normalized key intentionally changes behavior. Retain
the portrait-purity check in `interaction-cards.spec.js`.

The new coverage must include:

1. Descriptor determinism and no gameplay RNG consumption.
2. Key changes for every visible input and stability for irrelevant inputs.
3. Same-session pixel determinism for repeated bust and figure renders.
4. Successful painting of a representative ruler from every active culture/faith group.
5. Child, elder, sick, dying, scarred, one-eyed, and multi-ailment cases.
6. Target-stamp hit, atlas hit, cold miss, LRU eviction, and state reset counters.
7. Queue grouping, stale target cancellation, stale key cancellation, and immediate mode.
8. A cold realm sheet followed by a warm reopen.
9. A Kin refresh that preserves canvas node identity.
10. An equipment-only visual change on a retained canvas.
11. Full-figure slot mapping for every current `art.kind`, including two-handed gear.
12. Frozen death snapshot rendering.
13. New-game initialization proving that portrait cold-render count is bounded by the
    visible UI rather than by `Object.keys(state.chars).length`.
14. `file://` and served-origin operation through the existing configured projects.

Avoid cross-platform golden screenshots as correctness assertions. Use deterministic
same-browser pixel hashes for equality and targeted semantic/pixel-presence checks for
variation. Keep owner-reviewed screenshots for art judgment rather than making antialias
details a portable test contract.

Per repository policy, an AI implementation agent authors or updates these tests but does
not run them. The handoff must list every test file changed and state that no automated,
syntax, runtime, server, browser, or manual tests were run.

## Owner-run performance and visual gates

Headless JavaScript timings are floors. Final approval requires a real desktop browser
and the supported low-end mobile floor.

### Required scenarios

| Scenario | Gate |
| --- | --- |
| New game and old-save load | No portrait sweep across all characters. Additional portrait latency is limited to visible faces. |
| Fastest speed, Self open | After warm-up, no cold renders and no atlas blits while markup and visual keys remain unchanged. |
| Fastest speed, mature Kin open | After warm-up, no cold renders and no atlas blits on an unchanged day; ticker cadence does not regress from the pre-port build. |
| Seven-person realm sheet, cold | First face appears synchronously; remaining faces fill progressively without one portrait-caused long task above a frame budget. |
| Same realm sheet, warm | All faces come from target stamps or atlas hits; no cold render. |
| Year rollover with Kin open | Age invalidation is spread across frames and does not stall the yearly simulation. |
| Ninety-two-day skip across a year | No unbounded portrait queue, stale blit, or starvation after the skip completes. |
| Network and Land tabs | Repeated unchanged refresh preserves canvas nodes and performs no portrait drawing. |
| Equipment modal | One figure renders lazily; repeated unchanged open uses the one-entry MRU. |
| Death view | Frozen equipment renders correctly and no live successor loadout leaks into the image. |
| Mobile portrait and landscape | Compact faces remain legible; queued faces do not block scrolling, taps, modal dismissal, or orientation recovery. |

### Quantitative expectations

- Direct specialized cold bust work should be lower than the 2.08 ms desktop median
  measured for the generic renderer after only skipping cull/sort/contours. If it is not,
  profile context wrapping, allocations, color conversion, and retained generic stages
  before accepting the port.
- Direct specialized cold figure work should be lower than the 2.56 ms desktop median
  measured for the generic trimmed figure.
- A warm compact atlas hit should be measured against the current v1 paint at the actual
  30x36 through 72x82 sizes. If a blit is slower at the smallest size, retained-canvas
  target stamps still make ordinary unchanged refreshes the primary gate.
- Compact atlas raw pixel memory stays at about 2.53 MiB. Metadata and queue structures
  must not scale with world population.
- Figure raster memory stays below 0.3 MiB for the one 192x360 MRU entry, excluding normal
  browser surface overhead.
- At no point should the cache contain one entry per court character.

If a real mobile device still misses the frame gate after the direct scaffold, cache,
queue, and stable-panel work, profile before changing the art. The next allowed levers,
in order, are:

1. tighten apparent-size detail gates for the 96x108 master;
2. reduce the cold queue to exactly one portrait per frame;
3. reduce the compact master to 80x90 with a 64-entry atlas, after visual approval; and
4. add visibility-based deferral for offscreen canvases in large lists.

Workers, persisted bitmaps, a global low-quality style, and eager pre-rendering are not
fallbacks for this implementation.

## Integration requirements

Every image and cache entry is derived, so this work does not change save version 3 or
add a migration.

At owner-requested integration:

1. apply the required `FB.VERSION` and `FB.CHANGELOG` update in `js/main.js`;
2. include the exact version in the integration commit subject;
3. run the prescribed i18n integration pipeline only if implementation added or changed
   player-facing text;
4. remove temporary comparison plumbing and the renderer switch; and
5. leave automated and manual browser/device execution to the owner.

## Completion checklist

- [x] The included portrait and full-figure reference renderer was used and not
  approximated or loaded by shipping code.
- [x] Descriptor is the single source of portrait inputs and invalidation.
- [x] Direct scaffold contains no triangle-mesh work.
- [x] Shipping painter uses the raw Canvas 2D context.
- [x] All ordinary AI rulers and court characters paint successfully.
- [x] 64-cell 96x108 compact atlas is bounded and state-local.
- [x] Persistent canvases use target stamps.
- [x] Cold portrait bursts use the grouped frame queue.
- [x] Self, Kin, Network, and Land retain unchanged DOM.
- [x] Full figures use one pass at 192x360 and one MRU entry.
- [x] Every current item art kind maps to the figure.
- [x] Death snapshots remain exact.
- [x] No portrait-derived data is serialized.
- [x] No external asset, dependency, build step, worker, or WebGL path was added.
- [x] Automated tests were authored or updated and listed in the handoff.
- [x] AI agent did not run repository tests or runtime verification.
- [x] Owner completed desktop, mobile, `file://`, served-origin, and itch iframe review.
- [x] V1 renderer and temporary switch were removed before integration.
- [x] Design docs reflect the implemented contracts.
- [x] Final version, changelog, and commit subject follow integration policy.
