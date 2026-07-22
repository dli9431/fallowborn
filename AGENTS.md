# AGENTS.md

Guidance for AI coding agents working in this repository. Read this before editing anything.

## Project overview

**Fallowborn** — a grand-strategy dynasty saga for the browser. You start as a
serf in 867 AD and guide one family up the ladder (Serf → Freeholder → Gentry → Baron → Count →
Duke → King → Emperor) over generations, while ~65 sovereign AI realms (with their generated
duke and count vassals) redraw the map of Europe, Russia to the Urals, the Middle East,
and North Africa around you. Target platform is browser + mobile, distributed via
itch.io as a plain zipped folder.

- **Zero-dependency vanilla JavaScript. No build step, no package.json, no test framework, no
  server.** Open `index.html` in a modern browser and the game runs — including from `file://`.
- No external assets of any kind (no fonts, images, CDNs). All art is procedural: canvas-drawn
  map, generated heraldry, system emoji. The folder must stay fully self-contained so it works
  inside the itch.io iframe.

## Build, run, and test

There is no build. **Testing is manual, by the human, in a browser.**

> **Hard rule from the project owner: never run or test the game inside a shell.** No servers,
> no headless browsers, no node-driven smoke tests of game logic. `node --check <file>` for
> syntax validation is the accepted ceiling. After changes, ask the user to open `index.html`
> and test manually, telling them what to look at.

Deployment: zip the folder contents with `index.html` at the zip root, upload to itch.io as an
HTML5 project ("played in the browser"), enable *Mobile friendly*. In practice the owner
deploys with `notes/deploy.cmd` (butler push), which does the packaging automatically.

**Cache-busting (why FB.VERSION matters twice):** `notes/deploy.cmd` runs `notes/stamp.ps1`,
which appends `?v=<FB.VERSION>` to every `css/`, `js/`, `data/`, and `mods/` URL in the
*staged* `index.html` before the itch push. That makes the version the cache key for the itch
build, so browsers and the itch CDN fetch fresh files on each release — another reason every
player-facing change **must** bump `FB.VERSION` (see `docs/VERSIONS.md`). A release that ships
changed code without bumping the version will be served stale. Never add `?v=` to the
committed `index.html`: query strings break `file://` loads, so the stamp is applied only to
the deploy stage, never the repo.

Note: `play.fallowborn.com` is served from a **separate** origin (nginx behind Cloudflare),
not from itch — `deploy.cmd` does not update it. Cache freshness there is controlled by the
origin/Cloudflare `Cache-Control` headers, independent of this stamp.

## Git workflow

When work is done in a worktree, do not commit straight onto `main`. Instead:

1. Create a commit on a temporary branch inside the worktree.
2. Merge that temp branch into `main`.
3. Delete the temp branch to clean up.

## Architecture

`index.html` loads classic (non-module) scripts in a fixed order; everything hangs off two
globals. **Load order matters** — do not reorder the `<script>` tags casually:

- Data files first, all writing to `window.FBDATA`: `data/map_data.js` (land polygons, de
  jure empires/kingdoms/duchies, realms, straits, scripted history, `FBDATA.balance`),
  `data/counties.js` (the ~460-county table, expanding itself into `FBDATA.provinces`),
  `data/cultures.js`,
  `data/traits.js`, then six event packs (`events_common/peasant/paths/noble/world/war.js`).
- Engine second, all writing to `window.FB`: `util → model → portrait → world → armies →
  mapview → events → actions → ui → keys → save → mods → main`.

## Design decisions

Each system has a design doc under `docs/designs/`. **Read the one for the system you are
about to touch, and update it when you change that system.**

- `docs/designs/provinces.md` — borderless rasterized map, one county per province, derived settlements.
- `docs/designs/realms.md` — liege hierarchy, owner vs holder, de jure promotions, vassals, tiers 0–7.
- `docs/designs/state-and-saves.md` — one serializable state object; save versioning.
- `docs/designs/seeds.md` — shareable start seeds.
- `docs/designs/events.md` — events are declarative data; interpreter rules.
- `docs/designs/time.md` — daily tick, seasons, focuses/instants, slot days, automation mode.
- `docs/designs/war.md` — field armies on the map, battles, sieges, mercs, wartime event flow.
- `docs/designs/development.md` — buildings as development.
- `docs/designs/items.md` — heirloom items: bonuses, acquiring, gifting/selling.
- `docs/designs/characters.md` — skill soft cap; childhood play for minor heirs.
- `docs/designs/marriage.md` — station gating, doctrine, polygyny, widow claims, child matches.
- `docs/designs/holdings.md` — commoner family property.
- `docs/designs/tech.md` — innovations and research.
- `docs/designs/piety-intrigue-diplomacy.md` — blessings, plots, pacts.
- `docs/designs/mods.md` — runtime + bundled mods, save stamping.
- `docs/designs/ui.md` — keyboard support requirements, mobile layout.

## Code style conventions

- ES5-flavored style: `function(){}` expressions, no arrow functions/classes/template literals,
  to keep old mobile browsers working. Match it (there is a stray arrow function in
  `js/model.js:56` — an exception, not the rule). Each engine file is an IIFE that augments the
  `window.FB` global.
- Apostrophes inside single-quoted event strings use the typographic `’` character, not `\'`.
- **All randomness must go through `FB.rng`/`FB.ri`/`FB.pick`** (seeded, saved with the game) —
  never `Math.random()` in game logic. The only legitimate `Math.random()` calls are the
  one-time seed initializations in `main.js` (the boot world RNG and fresh new-game
  seeds). Visual-only noise uses `FB.noise2`.
- Comments and docs are in English.

## Where things live

- `js/main.js` — boot, game-state creation, day ticker, pause/skip, tier-promotion checks.
- `js/world.js` — map rasterization, province generation, world tick (wars, scripted history).
- `js/armies.js` — field armies: hosts raised in wartime, daily marches along province
  adjacency, battles when hostile hosts meet, army map markers and tap orders.
- `js/mapview.js` — canvas map rendering, pan/zoom, input.
- `js/events.js` — event trigger/effect interpreter.
- `js/actions.js` — focuses and one-shot deeds (the Deeds tab).
- `js/ui.js` — panels, modals, toasts, topbar (largest file).
- `js/model.js` — characters, dynasties, traits, titles.
- `js/portrait.js` — procedural portraits/heraldry.
- `js/util.js` — RNG, projection, helpers.
- `js/keys.js`, `js/save.js`, `js/mods.js` — keyboard, persistence, runtime mods.
- `data/*.js` — the whole moddable world; `data/map_data.js` ends with `FBDATA.balance`
  (every economy/war/mortality knob in one place). `data/counties.js` holds the county
  table (one historical county per province, each tagged with its de jure duchy).

## Reference docs

- `docs/README.md` — how to play, controls.
- `docs/MODDING.md` — full data schema reference (provinces, realms, events, triggers, effects,
  text tokens, balance). Consult it before touching event or map data, and update it when you
  add new trigger/effect keys.
- `docs/designs/` — per-system design decisions (index above).
- `docs/VERSIONS.md` — version numbering (semver) and changelog rules. Current
  version and entries live in `FB.VERSION` / `FB.CHANGELOG` at the top of
  `js/main.js`; bump them with every player-facing change.
