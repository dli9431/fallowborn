Part A regression repairs

711-terrain.spec.js and fixtures/711-terrain.json cover the eight inhabited additions, the 21 retained additions, all seven scenery groups, dated owners and communities, bounded raster/site placement, climates and connected dry travel. Each inhabited district has a natural household season with midpoint/final saves and deterministic replay. Separate cases exercise local dynastic succession, a Tadmor public commission, observer seed switching, baseline/governments_v2 frontier restore and transactional rejection of invalid revision/geography pairs. Fresh/progressed save ceilings remain 4/6 MiB. The 711-bookmark and government-rollout expectations retain their historical baseline assertions and use the expanded current revision. tools/test_i18n_catalog.py adds revision-scoped display-owner and retained-label collision coverage. Execution remains owner-controlled.

Dated government rollout coverage is in tests/e2e/specs/government-rollout.spec.js, with the dated consumer matrix and JSON service-court mod in tests/e2e/fixtures/government-rollout.json and government-rollout-mod.json. It covers retained baselines, declared forms, direct public holders, public career gates, canonical election dates, pure reads, stale/repeated appointments, receipt conservation, malformed profiles, normal mod import and seven bounded seasonal save/replay journeys. The 711 and 800 bookmark specs use the fresh assignments. ai-settlement-levies and eager-courts explicitly select baseline for their territorial formulas and retained corpus; the universal start helper remains unchanged. Fresh 867/1066 parity intentionally differs in holder generation and RNG ordering; retained baseline and old-save parity remain separate gates, with no fixture re-recording implied.

476-outer-regions.spec.js checks the complete community-event catalogue at an ordinary 867 boot in both distributions, the Antioch relief faith trigger, unrelated holy-war lookup and rejection of the invalid religion kind. bookmark-acceptance.spec.js covers both principal seven-part and authored non-principal nine-part smoke codes and checks the proof mod's exact story set independently of registration order. The 800 bundle migration and reusable settlement journeys use resumable farmer households with existing genealogy, compare RNG bits as unsigned values and preserve uid counters. The bundle migration compares detached saved campaign facts structurally, including characters, ownership, holders, realms, authority and log. Only absent treasury distribution cooldowns normalize to zero; a nonzero saved cooldown remains part of the preservation comparison. The prototype v4 fixture moves only the merged court and track records and preserves linked stories referenced by opening actors.

476-ladder-careers.spec.js stages a live appointment for the Roman civic route, reviews a free resident's own local Standing independently of player reputation, and verifies underage and insufficient-treasury blockers before the funded annual AI promotion. civic-church-actors.spec.js checks the expanded 77 civic and 86 church institutions while retaining its pure-read, distinct-office and medieval-isolation assertions. court-story-types.spec.js checks that household choices and ruler restoration award no territory, then preserves the ownership and holder facts saved after its explicit conquest and recovery staging.

# Testing Fallowborn

The remaining bookmark/save regression repairs cover scenario-local CrazyGames SDK initialization in 476-world-stories.spec.js, 493-bookmark.spec.js, 711-bookmark.spec.js, 711-polity-foundation.spec.js and 800-settlements.spec.js. The title helper continues to require its callers to provide the SDK double. mods.spec.js checks transactional rejection of malformed technology caps and uses registered counties for appended crossings. bookmark-platform.spec.js distinguishes an empty local institution catalogue from inherited faith-head offices.

bookmark-acceptance.spec.js verifies that the data-only proof campaign has five independent coastal counties with unique community pairs and conserved opening shares. Its fact helper compares authority records without the detached serializer's schema stamp; envelope validation still checks the schema. save-v4-integration.spec.js covers opening papal roots through repeated restores. The two-year annual 476 fixture finishes eager court preparation and expired-host cleanup before capturing its exact storage baseline, because direct annual calls skip the ordinary daily lifecycle. All court, family, host, payment, RNG and uid preservation assertions remain in place.

tests/e2e/specs/476-colonate.spec.js covers the Roman, Gallic and African starts, independent estate ownership, saved dues and once-only payment, stale consent and family quotes, lawful paid and service release, unlawful flight outcomes and cooldowns, owner replacement and household succession, atomic rejection of malformed tenancy, old free 476 saves, disabled-system dormancy, medieval tenure parity and CrazyGames review navigation. Existing serf-events.spec.js and daily-focus-art.spec.js retain explicit medieval catalogue assertions. 476-ladder-careers.spec.js checks the dependent lowest band; data-driven-modding.spec.js includes the registered estate deed. Execution remains owner-controlled.

Bookmark acceptance facts compare both RNG fields as unsigned 32-bit values, preserving all bits across the signed arithmetic and unsigned restore boundary. A focused case checks equivalent representations and detects a changed bit. The persisted-mod journey uses one boot navigation to avoid cancelling the deferred modal script with an immediate second navigation. storage.spec.js covers quota-triggered compaction of an older plain autosave, exact preservation of its campaign and sibling slot, pending autosave completion, callback delivery, unrelated preferences and RNG/uid. Failed compaction retains the original stored records. save-v4-integration.spec.js also checks that writing three slots preserves the preceding autosave before a new checkpoint replaces it.

Bookmark requirement coverage in tests/e2e/specs/bookmark-requirements.spec.js includes shared character-held episcopal offices, incompatible and duplicate office seeds, inherited faith heads, existing-ruler identities distinct from county residents, bookmark replacements that invalidate starts, missing or duplicate mod bookmark ids, and malformed opening dates or community lists. tests/e2e/specs/bookmark-acceptance.spec.js compares the actual bookmarkSetup and religiousHeadVacancies ledgers across restore and replay. The project-selection regression in support/test-run-state.test.js includes the historical and save-migration compatibility slices. Execution remains owner-controlled.

CrazyGames content, links and start specifications use tests/e2e/support/game/crazygames-title.js to wait for boot readiness, resolve the optional music prompt and verify the visible Play as Osric and full-start controls. Callers supply the distribution flag and SDK double before navigation. Standard title journeys continue to use support/game/navigation.js.

The Italy opening and follow-up specifications use tests/e2e/support/game/historical-start.js to install the CrazyGames SDK double and APS localStorage flags before navigation, then verify the storage backend and boot readiness. Their ordinary-distribution cases retain the standard parity journey. The Italy observer season and isolated ruler world-ordering seasons advance 90 days in 30-day batches with fast-forward paint deferral, require every day to advance exactly once, and retain their save restore checks. The Italy journey still audits every county after every day. Test execution remains owner-controlled.

Long daily simulation journeys are bounded to one 90-day season in 476-africa.spec.js, 476-dalmatia-east.spec.js, 476-gaul-and-iberia.spec.js, 476-italy.spec.js, 476-map-and-hierarchy.spec.js, 476-ruler-starts.spec.js, 476-world-stories.spec.js, 493-bookmark.spec.js, 711-bookmark.spec.js, 800-bookmark.spec.js, bookmark-1204.spec.js, royal-relatives-succession.spec.js and title-levels-and-hierarchy.spec.js. They use the normal test timeout and preserve their invariant and save checks. Household midpoint saves occur after 45 days. Later Zeno and Theoderic outcomes use direct dated staging in the eastern regional specification. These smoke journeys do not establish multi-year stability or guarantee natural succession; targeted boundary tests and owner playthroughs cover those separately.

CrazyGames onboarding coverage in tests/e2e/specs/crazygames-onboarding.spec.js includes the first-business review at desktop and phone widths, stale quotes, live savings and courtship progress, paid final service, saved-campaign previews, older metadata, optional preview failure and hidden guidance on Continue. tests/e2e/specs/distribution-start.spec.js covers fresh and older preference defaults plus explicitly saved event-resume choices in both distributions. Execution remains owner-controlled.

`ai-treasury-transfers.spec.js` covers paired balances, accrued-bill protection,
compulsory shortfalls, live peace quotes, noncash peace, prepaid saved courier gifts,
serialized payment guards and binding ruler ransom demands. Execution remains
owner-controlled.

Fallowborn has a development-only Playwright Test harness under `tests/e2e/`. The shipped game
remains plain static JavaScript with no runtime dependencies or build step. Opening the committed
`index.html` directly still works without installing Node packages or running a server.

## First-time setup

The owner may run these commands manually from `tests/e2e/`:

```sh
npm ci
npx playwright install chromium
```

`npm ci` installs the exact package graph recorded in `package-lock.json`. The second command
downloads the Chromium revision pinned by that Playwright version. On Linux, the owner may use
`npx playwright install --with-deps chromium` so the operating-system browser libraries are
installed too.

Install the release-compatibility browsers as well when running the broader matrix:

```sh
npx playwright install firefox webkit
```

The Node package, browser binary, reports, screenshots, and traces are development-only. They are
not included in either deployment artifact.

## Running the tests

All test execution is owner-controlled. AI coding agents add or update relevant tests but never
execute the harness, install its dependencies or browsers, or start its server. Agents must
report which tests changed and state that they were not run.

For an owner-initiated manual run from `tests/e2e/`:

```sh
# Fast syntax check for shipped and test JavaScript
npm run check

# Server lifecycle, offline-cache, and test-runner support regressions
npm run test:server

# Fast Chromium-only changed tests (rapid local iteration loop)
npm run test:fast

# Fast Chromium-only full suite
npm run test:fast:all

# Rerun preceding failures, or edited specs plus canaries in each browser slice
npm run test:changed

# Run the server regression and every configured browser project
npm run test:all

# Alias for the complete test:all command
npm test

# Explicitly run both Chromium targets
npm run test:chromium

# Run the served-origin suite in Firefox and WebKit
npm run test:cross-browser

# Run one compatibility browser
npm run test:firefox
npm run test:webkit

# Run only the direct file target
npm run test:file

# Run only the local HTTP target
npm run test:served
```

Every wrapped Playwright run writes its result and failed-test ids to an ignored coverage-slice
file. `.last-test-run.fast-chromium-served.json` is shared by `test:fast` and the Chromium-served
portion of `test:changed`; `.last-test-run.matrix.json` covers the Chromium-file, Firefox-served,
and WebKit-served portion. A failure is retried only within its slice, so a Chromium-served repair
run cannot consume or replace a compatibility-browser or file-origin failure. This makes the
ordinary repair loop `test:fast` -> edit the failure -> `test:fast`; no spec name is required. A
setup error, invalid state file, or interrupted run does not activate the focused retry path.

After a successful test run, the wrapper records the tested baseline in the matching ignored
`.last-tested-commit.<scope>` file. `test:changed` runs two slices: Chromium-served uses the same
`fast-chromium-served` baseline advanced by `test:fast`, while Chromium-file, Firefox-served, and
WebKit-served use the `matrix` baseline. A successful full `test:all` refreshes both baselines.
Fast runs therefore contribute their Chromium-served coverage to the next changed matrix without
claiming coverage for the other three projects. Those projects are deliberately bounded in
`playwright.config.js`: Chromium-file contains the direct-file canaries and file-only contracts,
while Firefox and WebKit contain the representative compatibility smoke tests. They do not repeat
the complete functional suite owned by Chromium-served. Each commit is anchored under a scope- and
worktree-specific `refs/fallowborn/test-baselines/...` reference so another worktree cannot replace
its synthetic baseline and Git garbage collection cannot prune it. Failure to create the anchor
fails baseline recording instead of silently promising persistence. A clean tracked working tree
records `HEAD` directly. When tracked files have edits, the wrapper records a synthetic Git commit
whose tree captures the staged and unstaged contents the run started with, without modifying the
real index or branch history. It stages only paths the real index reports as changed, and the
repository `.gitattributes` policy canonicalizes text to LF so Windows and Unix checkouts produce
the same snapshot tree. Before staging, line-ending-only paths are discarded with Git's
`--ignore-cr-at-eol` comparison, including when real content changed elsewhere. A clean-tree
invariant rejects a mismatched snapshot instead of silently recording line-ending noise.

When no failed-test retry is pending, Playwright selects affected test files between that slice's
baseline and the current tree. New untracked files remain affected until committed. If a marker
does not exist or its recorded baseline commit is unavailable, the runner uses the current
branch's upstream merge base when one exists. This includes committed local work on an ahead
branch. A repository without an upstream falls back to `HEAD`, selecting its uncommitted changes.
For changed-test selection only, the wrapper overlays the current `playwright.config.js` and
`support/runtime-dependencies.js` onto the comparison baseline. Selection-rule edits therefore
take effect immediately without making every importing specification look affected; `test:all`
remains the authoritative full check for configuration changes, while the server regression
statically guards the bounded project lists and dependency modes.

`test:fast` uses every specification's focused runtime dependency declarations and is the broader
incremental regression command. `test:changed` deliberately bounds those declarations: directly
edited or newly added specifications and changed shared test helpers still select their tests,
while `boot.spec.js` and `determinism.spec.js` retain their whole-runtime canary dependencies.
This prevents edits to monolithic runtime files such as `ui_modals.js` from scheduling hundreds of
otherwise unchanged specifications in the quick browser matrix. The same implementation and test
must still land together, and `test:all` remains the authoritative complete matrix.

### Establishing or refreshing a baseline

`npm run test:all` always runs the complete configured matrix. When it succeeds, it records the
current tracked-worktree snapshot as both the `matrix` and `fast-chromium-served` baselines; there
is no marker, report, cache, or reference to delete first. Use this command for the initial
authoritative baseline and whenever a deliberate full rerun is wanted. `npm run test:fast:all`
refreshes only `fast-chromium-served`; that coverage is then reused by `test:changed`, while the
other three projects continue selecting changes from their older `matrix` baseline.

If `test:server` or another pre-Playwright support regression fails, no successful Playwright
baseline is recorded or advanced. Fix the support failure, rerun `npm run test:server` for quick
feedback if desired, and then rerun the original command. Existing baseline and last-run files may
remain in place; the wrapper replaces their relevant state after a successful run.

Deleting `.last-tested-commit.<scope>` is only an intentional request to forget that scope's
recorded baseline. It is not routine cleanup. Without a valid marker, changed mode safely falls
back to the upstream merge base, or to `HEAD` in a repository without an upstream.

### Line endings and changed-test snapshots

The root `.gitattributes` stores ordinary text as LF and reserves CRLF for `.bat` and `.cmd`
files. An existing Windows checkout may nevertheless show `w/crlf` or `w/mixed` beside `i/lf` in
`git ls-files --eol`: the working-tree bytes predate the policy or remain cached as clean, while
the committed index form is already LF. This does not affect the browser runtime and does not
require cleanup before a test run.

Snapshot creation consults the real index first, ignores CR-at-EOL-only differences, and stages
only paths with meaningful tracked changes into its temporary index. It never blanket-stages the
checkout. Cached-clean CRLF or mixed working files therefore cannot become false changes merely
because the snapshot uses a fresh index, while substantive edits in the same worktree remain
included.

An `i/mixed` entry means the committed blob itself still has mixed endings. It is valid input for
the game and test harness, but a later edit may expose a noisy normalization diff. Normalize such
content only as a deliberate housekeeping change from an otherwise clean worktree with
`git add --renormalize .`, review the staged diff, and commit it separately. Renormalization is
not required to establish a test baseline, and test-state files should not be deleted for it.

Each specification declares its relevant shipped paths with
`support/runtime-dependencies.js`. The helper registers exact external dependency edges with the
pinned Playwright changed-file analyzer without importing or executing browser game scripts in
Node. A declaration may name a directory; it expands to the shipped files currently beneath that
directory. The boot and determinism canaries declare the complete JS, data, and CSS trees,
providing a small served-origin and file-origin safety selection for a new or otherwise unmapped
runtime file. Keep more focused declarations in the owning specifications so ordinary source
edits select their relevant specs rather than the whole suite.

The external-dependency hook comes from Playwright's internal CommonJS implementation rather
than its public API. The harness pins Playwright to an exact version, and
`support/runtime-dependencies.test.js` guards the dependency registration contract. Treat a
Playwright version change as a test-runner change: review this helper and verify changed-file
selection before accepting the upgrade.

Do not import game scripts into Node for dependency discovery. Game logic still runs inside the
real browser page; `dependsOnRuntime(...)` is dependency metadata only.

Playwright's changed mode does not isolate only newly added `test(...)` blocks inside an existing
specification; the affected specification runs as a whole. A changed shared test helper can make
every importing specification affected. Changes to the universal fixture or page contract
legitimately affect the whole suite. Project-configuration changes use the current scopes without
joining Playwright's affected-file set, as described above. In bounded `test:changed` runs, ordinary
runtime declarations do not join that set; use `test:fast` for the full dependency-driven slice.
Feature helpers live in leaf modules under `support/game/`; specifications import those modules
directly so an unrelated helper change does not fan out through a barrel file. The automatic
last-failed path deliberately favors a fast repair loop after a failure; run `test:all` for the
authoritative whole-suite result.

Before editing a shared helper, check how many specifications import it. Locale-, browser-,
viewport-, and scenario-specific readiness belongs in the affected specification or in a new leaf
helper with only those importers. In particular, `support/game/navigation.js`, `support/fixture.js`,
and `support/page-contract.js` are suite-wide fan-out boundaries and should change only when their
shared contract changes.

War scenarios should create campaigns through `FB.registerOrdinaryWar`, including
wars assigned to newly fabricated AI realms. The legacy `.war` accessors are bound
at initialization boundaries; a raw assignment before then can leave an object
that event validators and hostility queries cannot find in `state.wars`. Use raw
legacy objects only when testing migration itself. When a scenario replaces a war,
settle its exact active id first and allow for a preceding peace step having
already ended it.

Playwright starts and stops the test server automatically. Tests run headlessly unless a
Playwright command-line option requests another mode.

The server is started inside Playwright's coordinator through `support/global-setup.js`, which
retains the Node HTTP server handle and closes it directly after the run. Keep this in-process
lifecycle instead of configuring Playwright's child-process `webServer`: on Windows, that path
uses operating-system process-tree termination and can hang in restricted development sessions.
`support/static-server.test.js` protects the direct start, request, and close contract.

To run one specification or one named case:

```sh
npx playwright test specs/boot.spec.js
npx playwright test -g "export a life"
```

## Main and dev merge integration workflow

Every direct commit on `main`, every merge into `main`, and every merge of any branch into `dev`
has the same test-authoring requirement:

1. Identify each observable behavior added, changed, or fixed.
2. For a new or materially expanded gameplay capability, record its required hard/soft/none
   technology-impact decision under the repository policy and in the owning design doc.
3. Add or update automated tests that exercise the expected behavior and would catch its
   regression. Keep those tests in the same commit or branch as the implementation.
4. Do not run any focused test, syntax gate, browser matrix, runtime verifier, or manual browser
   check. Do not install Playwright dependencies or browsers.
5. In the handoff, list the test files added or updated and state that the tests were not run.

The owner decides when to use the commands in [Running the tests](#running-the-tests), including
before commits, merges, releases, or deployments. A documentation-only change does not need an
artificial gameplay test.

## The two browser targets

`chromium-file`

- Opens the repository's real `index.html` through a `file://` URL.
- Exercises the script order and relative asset loading used by the downloadable game.
- Is the primary target for the determinism canary and bounded simulation smoke test.
- Runs the direct-file canaries and every explicitly file-only specification, including slot tests
  when Chromium permits storage for the file origin.

`chromium-served`

- Opens the unchanged repository at `http://127.0.0.1:4173/`.
- Runs the complete functional specification suite once.
- Uses the small allowlisted server in `tests/e2e/support/static-server.js`.
- Runs the complete origin-backed `localStorage` contract.
- Detects HTTP asset failures and response errors that a file URL cannot represent.

`firefox-served` and `webkit-served`

- Run the same unchanged served game in Firefox and WebKit.
- May be run manually after Chromium when the owner wants a staged compatibility check.
- Run a bounded smoke slice covering clean boot, ordinary player journeys, and the representative
  settlement-council keyboard and responsive-layout contract.
- Keep direct `file://` determinism and bounded simulation canaries on Chromium, where they
  provide one stable primary baseline without tripling the slowest cases.

Each test receives a fresh isolated browser context. The suite never assumes that `file://`
storage behaves like origin-backed storage.

## Current coverage

The initial suite covers:

- clean boot from both targets;
- hosted-surface isolation: `file://` and the local served origin expose
  `FB.platform.isPlay === false`, add no install manifest metadata, and acquire no worker;
- service-worker online navigation leaves the last completely installed cached HTML untouched,
  so a failed update still falls back to one internally consistent release;
- uncaught page exceptions and unexpected console errors;
- failed local requests and HTTP 4xx or 5xx responses;
- unexpected external network requests;
- deterministic New Game creation from a full start code;
- save-slot write and load through the player interface;
- export from a running life and import from the title screen;
- served-origin storage persistence across reloads;
- equivalent serialized results in two fresh contexts after the same start and scripted days;
- a bounded 120-day simulation with state invariants checked at regular intervals.
- the generic settlement engine's weights, tie ordering, territorial award limits, actions,
  deterministic rolls, terms, invalid no-ops, and repair behavior;
- great-holy-war council asset discovery, claim adapters, local rulers and cadets, blessing,
  award application, beneficiaries, personal grants, and sacred custody;
- preparation, active service, succession, withdrawal, open and partial councils, pending
  personal choices, completed history, legacy saves, and real slot reloads;
- representative council copy, move buttons, consequence previews, personal award choices,
  and the named-beneficiary installation journey;
- a relevant serialization and restore contract after every representative council outcome;
- council focus entry and return, modal Tab containment, Enter and section/action shortcut activation,
  principal panel shortcuts, and desktop/mobile-width structure;
- gendered novice copy and recorded patronyms, formal and informal dowry settlement,
  ordinary and royal stepfamilies, succession cleanup, career resumption, renewable Guild
  Standing, and enterprise locality after relocation;
- large-list filtering, search, collapse, Back navigation, narrow rendering, and
  read-only building projections without play-state mutation.

Target-specific cases use explicit skips. For example, the full storage contract runs only on the
served project, while the initial determinism and simulation canaries run only on the file
project.

## Shared support

Specifications should import `test` and `expect` from `support/fixture.js`, not directly from
`@playwright/test`. The shared fixture fails the test on page exceptions, console errors, failed
requests, bad HTTP responses, or network traffic outside the expected local target.

Leaf modules under `support/game/` own common player journeys such as navigation, deterministic
game start, UI refresh waits, snapshots, and browser-harness injection. Import only the leaf helper
a specification uses; do not recreate a shared barrel module. Wait for visible screens or
browser-observable state, never fixed sleeps. When a test calls the queued `FB.ui.refresh()`
directly, use `waitForUiRefresh()` before interacting with the replaced controls.

On Windows only, the Firefox project disables Mozilla's content-process sandbox for its synthetic
local test browser. Restricted Windows sessions can otherwise block Firefox from spawning a tab
subprocess before a page exists. Other environments retain the normal Firefox sandbox.

`support/browser-harness.js` is injected into the loaded page. It provides bounded day advancement
and invariant checks without adding test-only APIs to shipped game code. Its simulation limits
must remain finite so an interruption reports a useful failure instead of waiting for the outer
Playwright timeout.

`support/global-setup.js` owns the served target for the duration of a test run.
`support/static-server.js` exports the start and close operations used by global setup while
remaining directly executable for manual diagnostics. Do not move server ownership back to
Playwright's child-process `webServer` without verifying clean teardown on Windows.

Gameplay randomness must continue to use the saved `FB` random-number generator. Tests should
use fixed start codes and saved RNG state rather than replacing `Math.random`, `FB.chance`, or
game resolution rules.

## Failure diagnostics

The baseline configuration uses:

- zero retries;
- `trace: 'retain-on-failure'`;
- `screenshot: 'only-on-failure'`;
- a serialized game-state diagnostic attached by the shared fixture.

Generated files appear under:

```text
tests/e2e/test-results/
tests/e2e/playwright-report/
tests/e2e/blob-report/
```

These directories and `node_modules/` are ignored by Git. To inspect a retained trace:

```sh
npx playwright show-trace test-results/<case>/trace.zip
```

## Runtime manifest verification

The repository has no GitHub Actions workflow. Test execution and runtime-manifest verification
are both owner-initiated local operations.

The verifier can check a stamped local staging directory:

```sh
npm run verify:runtime -- <path-to-staged-document-root> itch
npm run verify:runtime -- <path-to-built-nginx-document-root> play
```

It is expected to reject the committed source root because the committed `index.html` must remain
unstamped for `file://` compatibility. The `play` target additionally requires a fully substituted
service worker whose fingerprint and generated versioned-asset list match the document and every
shipped language catalog, plus a valid install manifest with correctly sized PNG icons. Omitting
the target argument retains auto-detection for existing local staging workflows.

## What remains manual

Automated browser tests do not replace release testing by a person. Continue manual checks for:

- map appearance and procedural art quality;
- keyboard comfort beyond structural focus and activation contracts;
- physical touch, pinch, and device-specific bottom-sheet behavior;
- itch.io iframe and storage behavior;
- real iOS and Android browsers;
- pacing, legibility, and game feel.

The owner chooses when to run the fast Chromium suite and when to run the Firefox and WebKit
matrix.

Parity baselines and engine-id checks

These six specifications let a refactor prove that behavior did not change and keep new hardcoded ids out of engine code. bookmark-id-lint.spec.js and content-id-ratchet.spec.js run in the ordinary Chromium-served suite. parity-fresh.spec.js, parity-corpus.spec.js, parity-raster.spec.js and parity-portraits.spec.js hold owner-run journeys that skip unless FB_PARITY is set; only the start-scenario coverage check in parity-fresh.spec.js runs every time. None of them imports or executes a game script in Node.

Snapshots. tests/e2e/support/game/parity.js captures a compact world snapshot inside the page: owner and holder per province; each living realm's rank, liege, ruler and ruler generation; government form counts; the player's tier, station, career and career rank; treasury totals; a fixed sample of FB.political.power and FB.political.permission answers; the costs shown for a fixed list of deeds and focuses, plus the freedom, land plot and rank elevation quotes; the RNG state and the next uid. readsArePure records whether capturing left state, RNG and uid unchanged. Derived caches are not captured.

Fresh journeys start 867 and 1066 with every ordinary start scenario and 476 with both federate_476 and curialis_476, all from seed PARITY, and snapshot at day 0, at the next season boundary and at the next year boundary after that. Automation preferences are fixed and events resolve with their first option. A day that cannot pass, or the player's death, ends the journey early and is recorded in that checkpoint's advance field. The coverage check fails when a start scenario is added or retargeted without a matching journey.

Wave 5 regression coverage includes 476-ladder-careers.spec.js, 476-offices-legitimacy.spec.js, civic-church-actors.spec.js, federate-migration.spec.js and 476-world-stories.spec.js. The ladder's high-resource case and the migration's staged-victory case verify transaction boundaries; they do not establish successful ordinary-play progression or conquest. The daily funding case advances treasury, provisions, succession and armies from the actual opening to 488, with random mortality and diplomacy isolated, and saves midway. Full ordinary-play journeys and subjective phone-size presentation still require owner acceptance. Refreshing intentional 476 parity fixtures is a separate owner-reviewed capture; preserve medieval fixtures for comparison.

Corpus journeys import each save listed in docs/plans/v2-476-phase-0/save-manifest.json through the ordinary loader and snapshot on load, at the next season boundary and at the next year boundary. Each export is hashed first; one that no longer matches its manifest SHA-256 fails the journey. The exports live in the checkout's ignored saves/ folder and are not part of this repository. Manifest paths are relative to the game checkout; FB_PARITY_CORPUS (or --corpus) names another checkout that holds them, such as the primary checkout when running from a worktree. A missing export is skipped with its expected path.

Baselines are JSON files in tests/e2e/fixtures/parity/, one per journey, written so a changed province or realm is a one-line diff. The owner captures the first baselines on the integration branch tip and commits them.

Owner commands, run from tests/e2e/. Paths may be absolute or relative to tests/e2e/. Playwright options such as --workers=2 or -g "fresh-867" pass through.

npm run parity:capture -- --dir <candidate checkout>/tests/e2e/fixtures/parity --corpus <checkout containing saves/>

npm run parity:compare -- --corpus <checkout containing saves/>


How a change uses parity. First capture from the baseline tree (for example the integration branch tip the change started from), writing into the change's own fixtures/parity with --dir. Then run parity:compare in the change's checkout. Unchanged behavior passes; any difference is listed by path with its baseline and current values. A change that intentionally alters behavior recaptures from its own tree and commits the updated fixtures with the change, saying what differs and why. Keep support/game/parity.js unchanged in such a branch: a harness change lands on its own and every baseline is recaptured, because snapshots are only comparable when the same harness took them.

Raster parity. parity-raster.spec.js activates 867, 1066 and 476 and records each compiled world: its size and a hash of the province grid, and per province its name, area, centroid, seed, coastal flag, landmass, adjacency and water crossings, plus every compiled settlement site with its position, name and kind. The parity commands run it with the journeys. It reads only APIs older than geography bases, so a baseline can be captured from a tree that predates them: copy the spec file into that checkout's tests/e2e/specs/ and run it there with FB_PARITY=capture and FB_PARITY_DIR pointing at the change's fixtures/parity, then compare in the change's checkout.

Portrait parity. parity-portraits.spec.js paints a fixed matrix of synthetic characters for 867, 1066 and 476 on a bare state carrying only the start id: every culture, one faith per faith group, every station, a career for each role, and child, adult and elder ages, as busts and adult figures. Each row records the pixel hashes and the resolved look (headwear, hair, beard, garment and cloth color, pigment, eyes). It uses only portrait APIs older than wardrobes, so capture its baseline from an older tree the same way as raster parity, then compare in the change's checkout. A data-driven appearance or wardrobe refactor must keep every row.

RNG. Where a change promises no change in random draw order, rng and uid must match exactly, which is the default. --facts-only (FB_PARITY_FACTS_ONLY=1) ignores rng and uid and compares the remaining facts. Outcomes after the first changed draw will usually differ too, so a change that uses it must say which facts it expects to keep.

Bookmark-id lint. bookmark-id-lint.spec.js reads js/*.js as text with comments removed and flags comparisons of start.id/activeBookmarkId to literals and quoted registered bookmark ids. Every flagged source line needs an exact file/trimmed-line allowance and a reason in tests/e2e/fixtures/engine-ids/bookmark-id-allowlist.json. Only legacy_default, legacy_contract and identity_key are accepted. Pending bookmark-specific dispatch is no longer an allowed kind. Changed or disappeared lines fail as stale. The scan is line-based and does not follow ids through variables.

Content-id ratchet. content-id-ratchet.spec.js loads the page and collects ids from FBDATA record tables. Every remaining exact quoted engine reference requires an explicit reason and per-file count ceiling in tests/e2e/fixtures/engine-ids/content-id-allowlist.json, including reviewed schema-token collisions. New files and counts above their ceiling fail. Tuning/generated/display namespaces keep explicit ignored-table reasons. The closed content-id-counts.json baseline has total zero and no residual ids; unallowlisted references fail. The automatic baseline-update route has been removed. Review new deliberate hooks individually and lower obsolete ceilings when removing uses; do not create an unreviewed residual allowance.

## Profiling a reported save

`save-season-profile.spec.js` is an opt-in Chromium diagnostic. It imports the
file named by `FB_PROFILE_SAVE` through the game's ordinary save loader, then
profiles one real fast-forward. It attaches a Chrome CPU profile and JSON with
daily durations, inclusive subsystem timings, and animation-frame gaps. Loading
is excluded; completion rendering and the deferred autosave write are included.
There is no machine-dependent performance threshold. Sampling and timing wrappers
add overhead, so compare profiles under the same conditions.
The timing report also hashes the complete resulting serialized save, including
RNG state. Set `FB_PROFILE_REGROUP_REFERENCE=1` to compare with the previous
county-by-county regroup algorithm; leave it unset to profile the current game.
Use separate `--output` directories to retain both sets of measurements.

For an owner-initiated run in PowerShell from `tests/e2e/`:

```powershell
$env:FB_PROFILE_SAVE = (Resolve-Path ../../fallowborn-save.txt).Path
npx.cmd playwright test specs/save-season-profile.spec.js --project=chromium-served --workers=1
Remove-Item Env:FB_PROFILE_SAVE
```

The diagnostic uses a fresh browser context with all events autoresolved using
the first available option, manual player-host orders, and automatic construction
and research disabled. These browser preferences are not present in an exported
save. The source save is read only; it is neither modified nor copied into test
fixtures. Without the environment variable the diagnostic is skipped. Ordinary
agent test-execution restrictions apply to this diagnostic too.

### Army logistics and treasury stress save

`saves/logistics-stress-save.txt` is an owner-local FBS1 export,
derived from a supplied life. Its adjacent JSON records source/output SHA-256 and
scenario counts. Both are ignored by Git and excluded by deployment allowlists.
The prepared winter-949 scenario has 36 attacking and 20 defending sovereigns,
56 hosts and 141,600 soldiers distributed across 41 counties, with nine Syrian
objectives and mixed fort levels. It is deliberately synthetic, not a historical
bookmark. Paths are empty on import; the real AI plans marches on the first day.
One seasonal skip reaches the year boundary. Reload the original file for every
comparison; advancing an already-played copy changes the workload.

The export was prepared as data, not by running game logic. Import, route validity,
campaign survival, and timing remain owner-verified through the approved harness.
Regeneration uses the owner-local offline save-preparation tools, maintained separately from the game repository.

The tool requires at least 15 Catholic and eight Muslim sovereigns, suitable march
corridors, and opposing control of Antioch. It refuses to overwrite exports. Normal
save repair initializes active treasury accounts when importing the fixture.

For the matched owner measurements, from `tests/e2e/`:

```powershell
$env:FB_PROFILE_SAVE = (Resolve-Path ../../saves/logistics-stress-save.txt).Path
npx.cmd playwright test specs/save-season-profile.spec.js --project=chromium-served --workers=1 --output=test-results/treasury-active
Remove-Item Env:FB_PROFILE_SAVE
```

The old reference flag is rejected for active accounts. Active treasury spending
depends on fiscal settlement, so disabling it is no longer a behavior-preserving
reference. Use ordinary enabled runs for Stage 2 and compare repeated loads of the
same source save. Functions are restored after the burst. The
diagnostic now includes the built-in profiler report in `season-timings.json`, with
inclusive/self time, scoped treasury input timings, provisioning operations, and
start/end workload summaries. Its fast-forward timeout is 120 seconds; this bounds
the diagnostic and is not a performance acceptance threshold.

Compare `sourceSha256` and `gameplayStateSha256` across matched runs. The latter
excludes treasury fields while retaining RNG and the rest of the save. With active
spending, treasury changes can also change gameplay; this hash is not an equivalence
check against the old accounting-only reference. Compare
`simulationMs`, `worldTick`, `Treasury:` rows, `Logistics operation:` rows, host-days,
marching host-days, starvation, and final campaign state. Fewer surviving armies or
less movement does not demonstrate a faster implementation. CPU sampling and extra
wrappers add overhead to both runs; repeat matched samples for median comparisons.

For a manual local session, import the save, pause, enable
`FB.game.fastForwardTiming.enable(true)`, and use the normal season skip. Copy
`JSON.stringify(FB.game.fastForwardTiming.last, null, 2)` afterward. Automatic events
and other browser-local preferences are not stored in the export; the harness fixes
them explicitly, including paid provisioning, a 75% player reserve target, and
automatic low-supply market seeking. No benchmarks have been run by the agent.

## Common problems

If `playwright` is not recognized, run `npm ci` from `tests/e2e/`. If Playwright reports that the
browser executable is missing, run `npx playwright install chromium firefox webkit`.

The served project uses port `4173`. Local runs may reuse an available server already listening
there; CI never does. If startup reports that the port is already in use, stop the unrelated local
process and rerun the test.

### Stage 3 treasury performance fixture

The owner-local Stage 3 preparation tool creates a treasury performance export and its JSON metadata from the earlier logistics fixture. It transforms data only and refuses to overwrite existing outputs.
The fixture has 53 hosts, 134,100 soldiers, 260 active accounts, three missing
hosts, damaged hosts and unfunded professional replacements. Rich (5,000),
constrained (80) and insolvent (-50) balances exercise distinct fiscal paths.
It crosses winter into the annual construction review. Import fresh before each
measurement, pause, enable `FB.game.fastForwardTiming.enable(true)`, and skip one
season using the normal control. Copy `JSON.stringify(FB.game.fastForwardTiming.last,
null, 2)`. Repeat from the same imported save for comparable samples.
Inspect `Treasury: military commitments`, `Treasury: construction reserves`,
military commitment accept/reject and retry-skip counters alongside host-days,
simulation and army totals. Changed starting funds make the old fixture an
unmatched performance comparison. Continuing a second season exercises sustained
shortfall recovery, but must be compared to the same second-season workload.

`ai-treasury-spending.spec.js` covers shared commitment affordability, defense,
replacement funding, recovery, seasonal peace, and narrow-screen disclosures.
`ai-treasury.spec.js` covers construction prices, reserves and transaction boundaries.
Execution and appearance checks remain owner-controlled.

### Commons test scheduling and modal acknowledgement

`commons-uprisings.spec.js` opts into file-local parallel scheduling. Its cases
create independent browser contexts and deterministic worlds in `beforeEach`, so
world startup can use the configured worker pool without sharing mutable saves or
changing the universal fixture. The worker limit still applies; a one-worker run
remains sequential. Parallel scheduling reduces the serial file bottleneck, not
the aggregate work required to build each world.

Generic modals retain their DOM after closing. Acknowledgement regressions assert
that the result is hidden, rather than that its node was removed. Synchronous
input-guard checks use rendered visibility and retain the one-time payment checks.


Scheduled-games coverage is authored in tests/e2e/specs/scheduled-games.spec.js, scheduled-games-lifecycle.spec.js and scheduled-games-ui.spec.js, with a scenario-local support/game/tournaments.js helper. It covers reserved funding, de jure capacity, wartime interruptions, physical return, annual intentions, exact rounds, admissions, technology grandfathering, save compatibility and the calendar/overlay. tournaments.spec.js retains legacy queued-invitation coverage while asserting exclusion from new random selection. Execution remains owner-controlled.

Station ladder coverage

station-ladders.spec.js adds 867/1066 eight-band eligibility and restore checks, isolated government and era overrides, independent landless command/council/justice/marriage meanings, NPC social-class mapping, named action restrictions, unrelated realm/campaign isolation, unused-band behavior, sparse label fallback, campaign-specific faith label validation, reordered promotion costs and malformed-data rejection. station-queries.spec.js extends the numeric comparison lint to NPC station and direct stationOf/playerStation reads. lexicon.spec.js uses the used-band label validation contract. Existing parity-fresh.spec.js, parity-corpus.spec.js and parity-portraits.spec.js cover the complete journeys and appearance comparison.

Faith-id allowance

faith-id-ratchet.spec.js scans exact engine string literals against the registered faith ids. tests/e2e/fixtures/engine-ids/faith-id-allowlist.json records each remaining file/id count and its reason. Only durable message selectors, existing legal strategy identifiers and authored historical actor identities remain allowed. Both new uses and stale allowances fail. religious-head-strategies.spec.js covers seeded parity, independent data-only offices, character succession, save restoration, custom costs, contested-office persistence and inherited tradition overrides.

Systems availability coverage

systems-availability.spec.js covers layer precedence, generated faith inheritance, pure reads, unknown requirements, 867/1066 membership, disabled actions and event options, dormant records, lifecycle scheduling and restore. tests/e2e/fixtures/systems-476.json is the declarative 476 absence baseline. The intentional 476 disable set changes the generated world and RNG trajectory, so the owner must recapture fresh-476-federate_476 with the existing parity:capture workflow and review those differences. Preserve all 867 and 1066 parity snapshots for comparison. The shared parity snapshot helper is unchanged.

Mixed-world integration coverage: geography-base.spec.js covers loading after a bookmark changes its declared base, separate cached rasters, missing-base rejection, legacy unstamped saves and concurrent activation overrides. religious-head-strategies.spec.js covers a disabled custom papal office alongside the enabled original, dormant saved elections and repair, and sanction-trait ownership across multiple offices. lexicon.spec.js covers own-realm, immediate-liege, NPC residence and explicit-realm title scope; appearance-and-wardrobe.spec.js covers government-specific dress and portrait cache changes.

Late antique presentation coverage

476-presentation.spec.js covers shipped presentation validation, cached settlement art, medieval defaults, a culture/sex/station portrait matrix, deterministic rendering without simulation mutation, live portrait cache invalidation, stamped-era personal and family pools, saved-identity preservation, political labels, item and unit membership, malformed mod rejection, and Federate Soldier and Curialis openings at phone width. Existing appearance-and-wardrobe, lexicon, customary-governing-identity and 476-situation expectations track the new period dress and labels. presentation-styles.spec.js retains the preexisting medieval pixel reference comparison. Owner visual acceptance includes fresh campaign portraits, crests, purse and map markers at phone size.


Gaul and Iberia coverage

476-gaul-and-iberia.spec.js covers a seeded civic smoke journey, authored settlement compilation, community and court separation, successor personal-law selection, vacancies and mediation across save/restore, regional event eligibility and receipts, the Clovis ordinary-war boundary, one season of daily simulation and medieval isolation. tools/test_i18n_catalog.py additionally checks extraction of the regional source records under stable display and durable message keys. Execution remains owner-controlled.

Bookmark authoring acceptance

bookmark-requirements.spec.js authors named failures for the platform, identity, story, presentation, climate, knowledge, optional-system, role, legal, capability and balance gates, plus transactional activation/mod rejection, invalid stored-mod rejection and positive same-mod catalogue composition. bookmark-acceptance.spec.js checks that every authored bookmark data file loads while docs/bookmark-template.js stays unloaded, then discovers every registered date, including hidden definitions reviewed only inside isolated browser contexts.

The registered-bookmark natural-day journey chooses a compatible ordinary non-ruler start, advances one year, exports normal v4 JSON at opening/year one, activates a different world and restores the year-one checkpoint with its bookmark hidden. It compares restored world facts, political quotes, religious institutions, stories and RNG/uid counters, then plays one more year, checks the exact turn and date advancement and exports a year-two save. Quarterly invariant checks cover both years. The persisted JSON-only proof-mod.json supplies year 500, an independent coastal realm and inherited culture, two starts and a reused campaign, plus its own episcopal incumbent and vacancy. Its separate reload and replay journey verifies that fresh seeds do not overwrite saved institution facts or the global catalogue.

Budgets are uncompressed UTF-8 JSON bytes: 4 MiB opening, 6 MiB years one and two, and 8 MiB for the separate proof-mod year-three checkpoint. Attachments record actual sizes and ceilings for each bookmark. These are owner-review ceilings, not measured baselines or browser-storage guarantees. Owner acceptance, historical review and device review remain necessary.

Administrative monarchy coverage

tests/e2e/specs/administrative-monarchy.spec.js covers distinct 800 historical profiles and data-only fictional reuse, direct holders, pure reviews, stale rejection, source-backed remuneration, remittance/audit/repayment, funded military capacity, continuity, officer candidature without ancestry, divided recognition, minority and religious binding, real vacancy, AI treasury, malformed saves, old forms, seasonal replay and mobile retained review in both distributions. government-dispatch.spec.js and 800-bookmark.spec.js register the new inputs. Existing bookmark parity and longer fiscal/succession, appearance, touch and iframe acceptance remain owner-controlled.

The administrative monarchy specification also covers player absorption of a recognized public crown, commission confirmation after that transition, and recognized household succession without a second royal tree.

Elective monarchy coverage

tests/e2e/specs/elective-monarchy.spec.js covers the 711 and fictional river procedures, cross-house nomination and accession, exact public-account continuity, private household and settlement receipts, accrued military expense, split assent, minority and vacancy, defensive interim powers, designation, stale reviews, malformed and old saves, technology decisions, pure reads, AI budgets and retained narrow/wide reviews. 711-bookmark.spec.js updates the fresh rollout and runs its standard/CrazyGames household and natural-season coverage. government-dispatch.spec.js includes the new explicit form, and tools/test_i18n_catalog.py covers constituency and contested-story display owners. Historical procedure, appearance, mobile touch, packaging and longer natural succession remain owner acceptance tasks.

Civic republic coverage

tests/e2e/specs/city-republic.spec.js exercises fresh 1204 Venice, an independent Genoese consular policy and a fictional majority profile. Cases cover read purity and RNG/uid, typed interests and qualification, stale and duplicate reviews, actual fees, separate membership, life versus term tenure, death and lawful recall, collegiate/interim decisions, institutional/private property, public debt and seasonal salary, limited foreign jurisdiction and conserved source shares, suspended/revoked rights, AI refusal, reviewed war/peace/grants, explicit founding conversion, legacy territorial restore, malformed detached saves, bounded turnover, natural seasonal replay and retained phone review under both distributions. government-dispatch.spec.js and bookmark-1204.spec.js register the new inputs and civic story. tools/test_i18n_catalog.py covers civic display extraction. Existing parity, historical fit, appearance, touch, iframe and longer campaign evidence remain owner-controlled.

Ecclesiastical principality coverage

tests/e2e/specs/ecclesiastical-principality.spec.js and fixtures/ecclesiastical-principality.js cover papal canonical reuse, independent episcopal and fictional profiles, public/private property, vacancy, consent, recognition, treasury limits, conversion and restore. Relevant shared coverage includes papacy.spec.js, religious-head-strategies.spec.js, city-republic.spec.js and government-dispatch.spec.js. The structured extraction test covers the new profile display owners.

Expanded 476 and world revisions

tests/e2e/specs/476-wider-completion.spec.js covers the remaining ordinary inventory, bounded scenery districts, explicit dry-route costs, regional one-season save/replay journeys, baseline migration, mixed-revision rejection, retained older-reader rejection and a stored JSON geography mod. Scenario-local helpers live in support/game/476-wider.js; the archived schema 1 header reader is injected into the browser from support/fixtures/platform-schema-1-reader.js.

The current-save header is platformSchema 2. Tests that model earlier saves start from the retained baseline before removing its revision stamp; they must not disguise an expanded campaign as a legacy world. Existing outer-region daily smoke is bounded to one season. Expanded observer checks keep 30 seconds per 45-day slice and the 8 MiB ceiling. Fresh saves keep 4 MiB; the household-year ceiling remains 6 MiB, with genuine year and longer exports supplied through owner playtesting. No one-season result substitutes for that evidence.

867 inhabited district coverage

tests/e2e/specs/867-inhabited-terrain.spec.js and fixtures/867-inhabited-terrain.json account for all 29 shared additions and the 21 original scenery anchors. Coverage includes the released hashes, both retained revisions, unchanged ordinary county/layout declarations, bounded district rasters and weighted routes, communities, climate, ordinary/CrazyGames opening flags, true retained frontier and serf households, public delegation, royal succession, mod catalogue pinning, detached rejection, owner corpus imports and bounded natural household/observer save replay.

The eight district journeys author a separate opening/midpoint/season parity baseline named fresh-867-inhabited-v2-<district> when FB_PARITY is capture or compare. These candidate reports remain separate from retained medieval fixtures. parity-fresh.spec.js and parity-raster.spec.js explicitly select the retained baseline for the existing 867/1066 comparisons. Owner capture and review are required before expanded comparison; no tracked retained fixture or hash is replaced to accommodate fresh expansion. Corpus imports use the original exports named by the existing manifest and FB_PARITY_CORPUS, verify SHA-256 and skip missing files with their expected path. Checkpoint-report JSON is never treated as a save payload.

The candidate budgets are 4 MiB at opening, 6 MiB at the seasonal checkpoint and 30 seconds per 45-day natural slice, recorded in test attachments. They are authored ceilings rather than measurements. Owner review still supplies activation/raster, annual-work, dense settlement, save/restore and longer campaign evidence, plus real package, device, touch and iframe acceptance. geography-base.spec.js explicitly activates the retained baseline for legacy geometry and tests edited fresh geometry through a separate revision. bookmark-geography-coverage.spec.js starts genuine baseline campaigns for legacy frontier migration. government-rollout.spec.js selects each fixture's declared revision, including expanded 711/800/867 and the retained 1066 government-only world; dedicated date specifications also cover the expanded worlds. tools/test_i18n_catalog.py covers the date-owned display catalogues.

Expanded spring 1066

tests/e2e/specs/1066-inhabited-terrain.spec.js covers retained baseline/governments_v2 and expanded inhabited_v2/inhabited_v2_governments_v2, independent 1204, eleven local commoner seasons, nine reviewed commissions, Wagadu kin recognition and Jenne-jeno household delegation. It checks bounded raster, dated sites, climate, weighted dry routes, conserved receipts, repeated restore, date switching and both distribution flag values. Natural district journeys and the observer measurement are bounded served-Chromium slices. Owner runs attach actual save sizes and 45-day timings: 4 MiB opening/restored-opening, 6 MiB midpoint, and 30 seconds per observer batch. Historical confidence, map appearance and packaged-device behavior require separate owner acceptance.

The 1066 government fixture selects its established government-only revision explicitly. Frontier and v3 migration fixtures start with a real retained world rather than removing a stamp from expanded geometry. Released-catalogue hashes and saved parity corpus fixtures remain unchanged. Standard parity-fresh.spec.js and parity-raster.spec.js select the retained medieval baseline; dedicated 1066 district journeys exercise the expanded default. New expanded snapshots require owner-controlled capture and review.
