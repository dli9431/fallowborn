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

Deployment: zip the folder (`index.html` at the zip root) to itch.io as an HTML5 project, or in
practice the owner runs `notes/deploy.cmd` (butler push). It ships to **two independent targets** —
itch and `play.fallowborn.com` (a separate Coolify origin that auto-deploys on every push to
`main`) — and `FB.VERSION` is the cache-bust key for both: the itch `?v=` stamp and Coolify's
`immutable` assets both key on it. Never add `?v=` to the committed `index.html` — query strings
break `file://`. Both targets and the stamping mechanics: **`docs/deployment.md`**.

**Hard rule — every change that lands on `main` bumps `FB.VERSION` (top of `js/main.js`), no
exceptions.** It is the cache-bust key for *both* distribution targets: the itch `?v=` stamp and
play.fallowborn.com's immutable asset caching both key on it. Ship changed files without bumping
it and returning players are served **stale** `js`/`css`/`data` — and on play.fallowborn.com the
`immutable` cache keeps them stale until the next bump. Bump `FB.VERSION` and `FB.CHANGELOG`
together (see `docs/VERSIONS.md`). The bump is an **integration** step: do it in your commit when
working directly on `main`, but leave `FB.VERSION`/`FB.CHANGELOG` untouched on a feature branch
and let the merge assign them (see *Git workflow*) — otherwise parallel branches all grab the
same number and collide.

## Git workflow

**Default: commit directly onto `main`.** In the primary working directory, just commit your
work straight to `main` — do not create a branch, and do not open a PR unless the owner asks.

**Only when working inside a git worktree** do not commit straight onto `main`. Instead:

1. Create a commit on a temporary branch inside the worktree.
2. Merge that temp branch into `main`.
3. Delete the temp branch to clean up.

**Integration-owned artifacts — assign them at the merge, never on the branch.** A few things are
touched by *every* change at the same spot, so doing them on a branch guarantees a conflict with
every other branch in flight (parallel worktrees are unaware of each other):

1. **`FB.VERSION` + `FB.CHANGELOG`** (top of `js/main.js`) — at the merge, pick the next free
   version and write the changelog line from the branch's description. See `docs/VERSIONS.md`.
2. **The i18n catalogs** (`data/lang_*.js`, `tools/i18n_manifest.json`) — regenerate once from
   the *merged* tree. See **Internationalization (i18n)** below.

On the branch, describe the change in the commit message and route any new player-facing text
through the i18n layer — but leave the version, changelog, and catalogs for the merge. Anything
else that conflicts is genuine overlapping content (same code or design doc edited twice); that
needs real merge judgment, not a workflow rule.

Pushing is a separate step — commit when asked to commit; only push when asked to push (a push
to `main` auto-deploys play.fallowborn.com).

## Architecture

`index.html` loads classic (non-module) scripts in a fixed order; everything hangs off two
globals. **Load order matters** — do not reorder the `<script>` tags casually:

- Data files first, all writing to `window.FBDATA`: `data/map_data.js` (land polygons, de
  jure empires/kingdoms/duchies, realms, straits, scripted history, `FBDATA.balance`),
  `data/counties.js` (the ~460-county table, expanding itself into `FBDATA.provinces`),
  `data/cultures.js`,
  `data/traits.js`, `data/economy.js`, then eight event packs
  (`events_common/peasant/paths/noble/world/war/council/parliament.js`).
- Engine second, all writing to `window.FB`: `util → messages → i18n → English catalog →
  model → portrait → world → economy → armies → mapview → events → actions → council →
  parliament → ui → keys → save → mods → main`.

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
- `docs/designs/finance.md` — price index, loans, defaults, trade partnerships, coinage.
- `docs/designs/council.md` — the royal council: great officers, crown authority, schemers and sycophants.
- `docs/designs/parliament.md` — the estates: vassal-tier assembly, the liege's aid and scutage votes.
- `docs/designs/mods.md` — runtime + bundled mods, save stamping.
- `docs/designs/ui.md` — keyboard support requirements, mobile layout.
- `docs/designs/i18n.md` — localization catalogs, message descriptors, locale lifecycle.

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

## Internationalization (i18n)

The game ships English plus AI **Preview** catalogs (`fr`, `de`, `it`, `es`). **Author every
user-facing string so the localization layer can reach it, as you write the code** — only
pure-display fields (`title`, `text`, `label`, `desc`, `log`, `worldNews`, `name`) are localized;
ids, numbers, and generated proper names never are. Route by where the text lives: `FB.T` /
`FB.TC` for UI chrome, `{token}`-placeholdered display fields for event/structured data, and
opaque `FB.msg('news.*', …)` descriptors for durable/saved messages. Never bake rendered prose
into saved state, mutate a `FBDATA` display field, or put grammar in JS. New English self-heals to
English, so the game still runs — but an unrouted string is a bug.

The catalogs (`data/lang_*.js`, `tools/i18n_manifest.json`) are generated integration artifacts:
regenerate them once when a change lands on `main` (`extract → translate fr de it es → validate`),
never on a feature branch, and never hand-merge them (see *Git workflow*).

**Full authoring guide + the catalog regenerate/merge recipe: `docs/i18n-authoring.md`.
Architecture and locale lifecycle: `docs/designs/i18n.md`. Schema: `docs/MODDING.md`.**

## Where things live

- `js/main.js` — boot, game-state creation, day ticker, pause/skip, tier-promotion checks.
- `js/world.js` — map rasterization, province generation, world tick (wars, scripted history).
- `js/armies.js` — field armies: hosts raised in wartime, daily marches along province
  adjacency, battles when hostile hosts meet, army map markers and tap orders.
- `js/mapview.js` — canvas map rendering, pan/zoom, input.
- `js/events.js` — event trigger/effect interpreter.
- `js/economy.js` — livelihoods, enterprises, prices, loans, and trade partnerships.
- `js/actions.js` — focuses and one-shot deeds (the Deeds tab).
- `js/council.js` — the royal council (tier 6+): great officers, crown authority, council event customs.
- `js/parliament.js` — the estates (vassal tiers 3–5): the liege's aid and scutage terms, yearly sessions, parliament event customs.
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
- `docs/deployment.md` — the two distribution targets and how `FB.VERSION` busts both caches.
- `docs/i18n-authoring.md` — how to route new player-facing text; the catalog regenerate/merge recipe.
- `docs/designs/` — per-system design decisions (index above).
- `docs/VERSIONS.md` — version numbering (semver) and changelog rules. `FB.VERSION` / `FB.CHANGELOG`
  live at the top of `js/main.js`; every change landing on `main` bumps them, **assigned at
  integration** (see *Git workflow*) — `FB.VERSION` is the cache-bust key, so skipping it serves
  stale assets.
