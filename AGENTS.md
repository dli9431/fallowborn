# AGENTS.md

Guidance for AI coding agents working in this repository. Read this before editing anything.

## Project overview

**Fallowborn** — a grand-strategy dynasty saga for the browser. You start as a
serf in 867 AD and guide one family up the ladder (Serf → Freeholder → Gentry → Baron → Count →
Duke → King → Emperor) over generations, while ~65 sovereign AI realms (with their generated
duke and count vassals) redraw the map of Europe, Russia to the Urals, the Middle East,
and North Africa around you. Target platform is browser + mobile, distributed via
itch.io as a plain zipped folder.

- **Zero-dependency vanilla JavaScript at runtime. No build step or root package is required to
  play or distribute the game.** Open `index.html` in a modern browser and the game runs,
  including from `file://`. Development-only Playwright dependencies are isolated under
  `tests/e2e/` and are never part of a deployed artifact.
- No external network assets (no fonts, images, CDNs). All art is procedural: canvas-drawn map,
  generated heraldry, system emoji. The self-hosted Opus soundtrack under `music/` is the one
  authored media asset. The folder must stay fully self-contained so it works inside the itch.io
  iframe and from `file://`.

## Build, run, and test

There is no game build. The approved development-only Playwright harness lives under
`tests/e2e/` and may run the real committed `index.html` in headless Chromium from both
`file://` and its own local static server. It must not import game scripts as Node modules or
introduce runtime dependencies into the game.

From `tests/e2e/`:

- `npm ci` installs the pinned test dependency graph.
- `npx playwright install chromium` installs the pinned local browser revision.
- `npm run check` runs the fast `node --check` syntax gate.
- `npm run test:server` runs the in-process server, offline-cache, and test-runner support
  regressions.
- `npm run test:fast` reruns preceding Chromium-served failures, or Chromium-served specs
  affected since that coverage slice's last successful tracked-worktree snapshot. Its successful
  baseline is reused by `test:changed` for the Chromium-served slice.
- `npm run test:fast:all` runs the full Chromium-served suite without advancing the Chromium-file,
  Firefox-served, or WebKit-served baseline.
- `npm run test:changed` automatically reruns preceding Playwright failures, or runs directly
  edited/new specs plus the boot and determinism runtime canaries in two slices: Chromium-served
  from the shared fast baseline, then the other three projects from their matrix baseline.
- `npm run test:all` runs the server regression and every configured browser project.
- `npm run test:chromium` runs the file and served-origin Chromium suite.
- `npm test` is an alias for `npm run test:all`.

When adding or updating a specification, register its shipped JS, data, and CSS inputs with
`dependsOnRuntime(__filename, [...])` from `support/runtime-dependencies.js`. Keep declarations
focused; directory-wide declarations are reserved for intentional canaries such as boot and
determinism. Import shared journeys directly from the relevant leaf module under `support/game/`
instead of recreating a common barrel module. These dependency edges are metadata for
Playwright's changed-file analyzer only: `test:fast` uses the full graph, while `test:changed`
bounds it to the whole-runtime canaries and directly changed test code. Never import or execute
game scripts in Node. Baseline, line-ending, and helper-authoring details are documented in
`docs/TESTS.md`.

Treat shared test helpers as fan-out boundaries. If behavior belongs to one locale, browser,
viewport, or scenario, keep its setup in that specification or a leaf helper imported only by
the affected specifications. Do not change `support/game/navigation.js`, the universal fixture,
or the page contract to solve a scenario-local test unless their shared contract truly changed.

These commands are for owner-initiated manual runs. AI coding agents must author or update
relevant tests, but must not install test browsers or dependencies and must not execute
`npm run check`, Playwright, the static-server regression, runtime verification, or any other
command from the test harness. In the final user handoff, report the tests added and state that
they were not run. This is handoff-only status; never put it in a commit or merge message. Do not
launch ad hoc shell browsers or servers outside this harness. Keep tests deterministic, bounded,
and isolated in fresh browser contexts. Manual testing remains required for appearance, touch
behavior, itch.io iframe behavior, real mobile browsers, and subjective game feel.

Deployment: zip the folder (`index.html` at the zip root) to itch.io as an HTML5 project, or in
practice the owner runs `notes/deploy.cmd` (butler push). It ships to **two independent targets** —
itch and `play.fallowborn.com` (a separate Coolify origin that auto-deploys on every push to
`main`) — and `FB.VERSION` is the cache-bust key for both: the itch `?v=` stamp and Coolify's
`immutable` assets both key on it. Never add `?v=` to the committed `index.html` — query strings
break `file://`. Both targets and the stamping mechanics: **`docs/deployment.md`**.

**Hard rule — every change to shipped code (`js`/`css`/`data`/`mods`) that lands on `main`, or
reaches `dev` through a branch merge, bumps `FB.VERSION` (top of `js/main.js`), no exceptions**
(a docs-only commit ships nothing, so it needs
no bump — `FB.VERSION` is purely a cache-bust key; see `docs/VERSIONS.md`). It is the cache-bust
key for *both* distribution targets: the itch `?v=` stamp and
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

**Test authoring for integration targets.** Before making any commit directly on `main` or
finalizing any merge into `main` or `dev`, follow the
[main and dev merge integration workflow](docs/TESTS.md#main-and-dev-merge-integration-workflow):

1. Add or update automated tests for every observable behavior change or bug fix. The tests must
   exercise the expected behavior and land in the same commit or merge as the implementation.
2. Do not run the tests. Test execution, including focused cases, syntax checks, browser
   matrices, runtime verification, and manual browser checks, is always owner-controlled.
3. In the final user handoff, list the test files added or updated and explicitly record that no
   tests were run. Never copy that test-execution status into Git metadata.

For a branch merge, add the tests on the branch with the behavior change, but leave all
execution to the owner. A documentation-only change does not need an artificial gameplay test.
There is no GitHub Actions test workflow. The owner runs any desired test commands locally.

**Commit-message hygiene.** Commit subjects and bodies describe only the durable repository or
player-facing change. Never include transient agent-process metadata such as test-execution
status, handoff boilerplate, tool or approval details, agent/model identity, prompt text, branch
cleanup, or generated-entry counts. Keep that information in the final user handoff when it is
required or useful. A commit or merge message may mention validation only when the owner
explicitly asks for it or the result is itself the durable purpose of the commit.

**Every integration commit that assigns `FB.VERSION` must include that exact version in its
commit subject**, using `vMAJOR.MINOR.PATCH: description` (for example,
`v1.57.1: Fix island province connections`). This applies both to a direct commit on `main` and
to the final merge/integration commit. Feature-branch commits do not guess a version, and
docs-only commits do not assign one, so those commits are exempt.

**Never manage git worktrees.** Their lifecycle is owner-controlled. Do not create, add, remove,
move, prune, repair, or otherwise modify a worktree or its registration.

**When the owner explicitly asks for a new branch and a merge into `main` or `dev`:**

1. Create the requested temporary branch in the current checkout and commit the work there.
2. Merge that temporary branch into the requested integration target.
3. Once the branch is fully merged, switch the current checkout off it if Git requires that,
   then delete **only the branch** with `git branch -d <branch>` (use `-d`, not `-D`, so Git
   refuses if it is not fully merged). Leave every worktree and worktree registration intact.

**The `dev` branch is long-lived — never delete it.** It survives its merges into `main`
and serves as the owner's test branch for larger changes. Every merge of any branch into `dev`
must use the same test-authoring, version/changelog, optional i18n regeneration, and
commit-message workflow as a merge into `main`. A later merge of `dev` into `main` follows that
workflow again.
When `dev` itself is the source branch, skip step 3's deletion for it.

**Integration-owned artifacts — assign them at the merge, never on the branch.** A few things are
touched by *every* change at the same spot, so doing them on a branch guarantees a conflict with
every other branch in flight (parallel worktrees are unaware of each other):

1. **`FB.VERSION` + `FB.CHANGELOG`** (top of `js/main.js`) — at the merge, pick the next free
   version — **usually a PATCH (last number: balance, tweak, or fix); reserve a MINOR bump for a
   genuinely new feature, per `docs/VERSIONS.md`** — and write the changelog line from the
   branch's description. Put the same version in the integration commit subject. Keep each
   `FB.CHANGELOG` entry **short, plain, and general — one or two sentences** that name the
   feature and hint where the player runs into it, not the full mechanics. Players read it in
   the in-game changelog modal; they want a pointer to the new thing, not a spec. See
   `docs/VERSIONS.md`.
2. **The i18n catalogs** (`data/lang_*.js`, `tools/i18n_manifest.json`) - catalog regeneration is
   optional for commits and merges into `main` or `dev` while the unauthenticated translation
   endpoint is unreliable. A commit or merge request alone does not authorize catalog commands.
   Run them only when the owner also explicitly asks to regenerate or update i18n. Do not run
   `extract`, `translate`, or `validate` during ordinary implementation or review. When requested,
   run `extract → translate fr de it es → validate` as the final integration step from the fully
   assembled source tree. `validate` remains the gate for including regenerated artifacts, but an
   unavailable translation service or stale Preview catalog does not block the surrounding code
   commit. If `extract` changed tracked files before `translate` failed, restore or exclude those
   partial pipeline outputs rather than committing an unvalidated generated set. New or changed
   records safely fall back to English and remain missing from the tracked locale caches, so the
   next successful translation run discovers them. Include all resulting catalog, cache, manifest,
   and coverage updates together. If catalog changes land later in a separate integration, assign
   a new `FB.VERSION` so deployed immutable assets are refreshed.
   Never regenerate on a feature branch or hand-merge generated files. Recipe and rationale:
   `docs/i18n-authoring.md`; see **Internationalization (i18n)** below.

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
  `data/cultures.js`, `data/technology.js`, `data/actions.js` (the baseline focus/deed
  metadata projected through private handlers in `js/actions.js`), `data/units.js` (the unit-class table:
  composition quality, upkeep, casualty order, counters, and tech/culture gates),
  `data/bookmarks.js` (the atomic 867/1066 world
  definitions), `data/settlements.js` (the shared physical-site table plus the per-bookmark
  county settlement layouts it clones onto those bookmark provinces),
  `data/settlements_real.js` (generated by `tools/settlement_import.py`; GeoNames-derived
  `fill: true` presentations appended after the curated layouts — never hand-edit),
  `data/traits.js`, `data/economy.js`, `data/intrigue.js`, the generated
  `data/music_catalog.js`, then the event packs (including `events_lifepaths.js`
  after `events_paths.js`, and
  `events_intrigue.js` after tournament events and before ruler-agency events).
- Engine second, all writing to `window.FB`: `util → messages → i18n →
  model → music → portrait → siteart → world → settlement → fortifications → holywar → population → modifiers →
  economy → market → papacy → armies → travel → mapview → events → items → actions → intrigue →
  technology → council → agency → politics → parliament → institutions →
  ui (ui_misc → ui_panels → ui_topbar) → keys → save → mods → main`. The generated English
  catalog is absent from an ordinary English boot; a translated boot dynamically loads it
  before the selected locale. The four `ui_*.js` files are one system split for size:
  `ui_misc.js` loads first and owns the shared internals (`FB.ui._shared`) the other three
  bind at load. An inert hidden asset pointer keeps `ui_modals.js` available to deployment
  stamping and offline precaching without requesting it speculatively. `main.js` appends the
  script after the title shell has had a chance to paint and before setting `FB.game.bootReady`.
  Preserve that dependency order when changing boot.

## Design decisions

Each system has a design doc under `docs/designs/`. **Read the one for the system you are
about to touch, and update it when you change that system.**

- `docs/designs/provinces.md` — borderless rasterized map, one county per province, derived settlements.
- `docs/designs/realms.md` — liege hierarchy, owner vs holder, de jure promotions, vassals, tiers 0–7.
- `docs/designs/state-and-saves.md` — one serializable state object; save versioning.
- `docs/designs/seeds.md` — shareable start seeds.
- `docs/designs/events.md` — events are declarative data; interpreter rules.
- `docs/designs/descent.md` — the way down: title lapse, submission, attainder, capture & ransom, distraint & bondage, devastation.
- `docs/designs/time.md` — daily tick, seasons, focuses/instants, slot days, automation mode.
- `docs/designs/war.md` — field armies on the map, battles, sieges, mercs, wartime event flow.
- `docs/designs/development.md` — buildings as development.
- `docs/designs/items.md` — heirloom items: bonuses, acquiring, gifting/selling.
- `docs/designs/characters.md` — skill soft cap; childhood play for minor heirs.
- `docs/designs/marriage.md` — station gating, doctrine, polygyny, widow claims, child matches.
- `docs/designs/holdings.md` — commoner family property.
- `docs/designs/tech.md` — innovations and research.
- `docs/designs/piety-intrigue-diplomacy.md` — blessings, plots, pacts.
- `docs/designs/conversion.md` — deliberate conversion of self, household, or realm to another culture or religion.
- `docs/designs/finance.md` — price index, loans, defaults, trade partnerships, coinage.
- `docs/designs/council.md` — the royal council: great officers, crown authority, schemers and sycophants.
- `docs/designs/parliament.md` — the estates: vassal-tier assembly, the liege's aid and scutage votes.
- `docs/designs/mods.md` — runtime + bundled mods, save stamping.
- `docs/designs/ui.md` — keyboard support requirements, mobile layout.
- `docs/designs/i18n.md` — localization catalogs, message descriptors, locale lifecycle.
- `docs/designs/music.md` - generated soundtrack catalog, contextual playback, and offline banks.

### Technology-impact review

Every new or materially expanded player/world capability must make an explicit technology
impact decision before implementation. Record one entry per independently gateable
capability in `FBDATA.techImpactReviews` and explain the same decision in the owning design
doc. Use `hard` when technology blocks an optional advanced capability, `soft` when the
baseline remains available but technology improves or extends it, and `none` when no
credible dependency belongs there. A hard gate must name a meaningful ungated fallback,
remain visible with its exact missing technology, and grandfather already-created records
or in-flight commitments. Prefer soft interaction for core play, recovery, personal/social
actions, or mechanics whose research is controlled by AI. Do not invent a weak dependency
to fill the tree.

The forward-review baseline is `v1.127.1`; do not backfill older capabilities merely to
satisfy the ledger. Pure fixes, numeric balance changes, localization, presentation,
accessibility, documentation, tooling, and internal refactors need no entry unless they
change gameplay eligibility. An expansion updates an existing entry when it changes the
same capability, or adds an entry when it introduces a separately gateable option. Tests
must cover the declared behavior and the technology validator must accept the ledger.

## Code style conventions

- Classic scripts in the house `function(){}` style; each engine file is an IIFE that
  augments the `window.FB` global. The compatibility floor is 2016-era engines (roughly
  Safari 10 / Chrome 49 and equivalent WebViews): `const`/`let` and `for...of` are already
  load-bearing throughout shipped code, so genuinely ES5-only browsers cannot parse the
  game anyway. Within that floor:
  - `const`/`let`, `for...of`, and arrow functions are fine. Prefer `function(){}` for
    named and top-level functions, and match the style of the surrounding file.
  - **No template literals.** This is a tooling constraint, not a browser one: the i18n
    extractor (`tools/i18n_catalog.py`) lexes only single- and double-quoted strings, so a
    backtick string is invisible to extraction. Lift this only by teaching that lexer
    template literals first.
  - **No `class` syntax** (the codebase's namespace-object architecture does not use it)
    and no Promises or `async`/`await` in game logic (the engine is synchronous and
    deterministic by design).
  - **No ES modules and no build step, ever.** Module scripts are CORS-blocked from
    `file://`, and running from `file://` is a hard requirement. The `<script>` load order
    in `index.html` is the dependency mechanism; authored source is shipped source.
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

The catalogs (`data/lang_*.js`, `tools/i18n_manifest.json`) are generated integration artifacts.
Do not run any catalog command during uncommitted implementation or review. Catalog regeneration
is optional for a commit or merge into `main` or `dev` and requires a separate explicit owner
request. When requested, run it as the final integration step
(`extract → translate fr de it es → validate`), never on a feature branch, and never hand-merge
generated files. If translation is unavailable, report it and allow the code integration to
proceed with English fallback (see *Git workflow*).

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
- `js/population.js` — county population, carrying capacity, natural growth, conserved migration, demographic modifiers.
- `js/actions.js` — focuses and one-shot deeds (the Deeds tab).
- `js/intrigue.js` — hostile schemes, accomplices, AI intrigue, evidence hearings,
  captivity, leverage, and conduct.
- `js/council.js` — the royal council (tier 6+): great officers, crown authority, council event customs.
- `js/parliament.js` — the estates (vassal tiers 3–5): the liege's aid and scutage terms, yearly sessions, parliament event customs.
- `js/ui_misc.js` — shared UI helpers, screens, toasts, hint coachmarks, the generic modal engine,
  mobile back navigation, boot wiring; owns `FB.ui._shared`.
- `js/ui_panels.js` — the retained panels: Deeds, Self, Kin, Network, Land, Chronicle;
  tabs, drawers, the family tree.
- `js/ui_topbar.js` — top bar refresh: stats and breakdowns, portrait, date,
  pause/skip controls.
- `js/ui_modals.js` — the event modal, autoresolve, and every dialog sheet
  (pickers, coin & credit, household, technology, character sheets, menu,
  settings, save/load, the Guide) — largest file.
- `js/model.js` — characters, dynasties, traits, titles.
- `js/music.js` - Opus playback, contextual banks, shuffle history, preferences, and offline downloads.
- `js/portrait.js` — procedural portraits/heraldry.
- `js/siteart.js` — procedural settlement emblems for the detailed map (deterministic per
  site slug and kind; one fixed canvas cached per site, scaled at draw).
- `js/util.js` — RNG, projection, helpers.
- `js/keys.js`, `js/save.js`, `js/mods.js` — keyboard, persistence, runtime mods.
- `js/messages.js`, `js/i18n.js` — durable saved-message descriptors; localization catalog lookup and locale lifecycle.
- `i18n/` — tracked translation caches, extraction coverage reports, and historical translation logs.
- `data/*.js` — the whole moddable world; `data/map_data.js` ends with `FBDATA.balance`
  (every economy/war/mortality knob in one place). `data/counties.js` holds the county
  table (one historical county per province, each tagged with its de jure duchy).
  `data/economy.js` holds careers, enterprises, and finance-contract terms.
- `music/` - self-hosted Opus tracks arranged by intro or faith/culture/role selector folders.
- `tools/music_catalog.py` - validates soundtrack files, generates `data/music_catalog.js`, and
  requires the complete itch soundtrack to fit beneath its 200 MB gameplay-audio cap.
- `tools/settlement_import.py` - one-time build-time tool that extracts real-world
  settlement names/locations from GeoNames country dumps (with an optional OpenStreetMap
  `--topup` pass), swaps post-medieval place names for their attested period names via
  its `HISTORICAL_NAMES` table, and regenerates `data/settlements_real.js`; run
  manually, never at build or runtime. Responses cache in the gitignored
  `tools/geonames_cache/` and
  `tools/osm_overpass_cache.json`.

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
