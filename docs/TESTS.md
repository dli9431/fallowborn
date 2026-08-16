# Testing Fallowborn

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

# Rerun preceding failures, or tests affected since the last successful snapshot
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

Every wrapped Playwright run writes its result and failed-test ids to the ignored
`tests/e2e/.last-test-run.json` file. When that result is a test failure, `test:changed`
automatically uses Playwright's last-failed selection on the next run. This makes the ordinary
repair loop `test:all` -> edit the failure -> `test:changed`; no spec name is required. A setup
error, invalid state file, or interrupted run does not activate the focused retry path.

After a successful `test:all` or `test:changed`, the wrapper records the tested baseline in the
ignored `tests/e2e/.last-tested-commit` file. A clean tracked working tree records `HEAD`
directly. When tracked files have edits, the wrapper records a synthetic Git commit whose tree
captures the staged and unstaged contents the run started with, without modifying the real
index or branch history. It stages only paths the real index reports as changed, and the
repository `.gitattributes` policy canonicalizes text to LF so Windows and Unix checkouts
produce the same snapshot tree. Before staging, line-ending-only paths are discarded with Git's
`--ignore-cr-at-eol` comparison, including when real content changed elsewhere. A clean-tree
invariant rejects a mismatched snapshot instead of silently recording line-ending noise.

When no failed-test retry is pending, Playwright selects affected test files between that
baseline and the current tree. New untracked files remain affected until committed. If the
marker does not exist or its local synthetic commit is no longer available, `test:changed`
stops and asks the owner to establish a baseline with `npm run test:all`.

Playwright's changed mode does not isolate only newly added `test(...)` blocks inside an existing
specification; the affected specification runs as a whole. A changed shared test helper can make
every importing specification affected. The automatic last-failed path deliberately favors a
fast repair loop after a failure; run `test:all` again for the authoritative whole-suite result.

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

Do not import game scripts into Node. Game logic runs inside the real browser page; Node handles
orchestration, assertions, fixtures, and reporting.

## Main integration workflow

Every direct commit on `main` and every merge into `main` has a test-authoring requirement:

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
- Runs slot tests when Chromium permits storage for the file origin.

`chromium-served`

- Opens the unchanged repository at `http://127.0.0.1:4173/`.
- Uses the small allowlisted server in `tests/e2e/support/static-server.js`.
- Runs the complete origin-backed `localStorage` contract.
- Detects HTTP asset failures and response errors that a file URL cannot represent.

`firefox-served` and `webkit-served`

- Run the same unchanged served game in Firefox and WebKit.
- May be run manually after Chromium when the owner wants a staged compatibility check.
- Cover clean boot, ordinary player journeys, and the representative settlement-council
  keyboard and responsive-layout contract.
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
- council focus entry and return, modal Tab containment, Enter and numbered activation,
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

`support/game.js` owns common player journeys such as waiting for the title screen and starting
the deterministic test life. Wait for visible screens or browser-observable state, never fixed
sleeps. When a test calls the queued `FB.ui.refresh()` directly, use `waitForUiRefresh()` before
interacting with the replaced controls.

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

## Common problems

If `playwright` is not recognized, run `npm ci` from `tests/e2e/`. If Playwright reports that the
browser executable is missing, run `npx playwright install chromium firefox webkit`.

The served project uses port `4173`. Local runs may reuse an available server already listening
there; CI never does. If startup reports that the port is already in use, stop the unrelated local
process and rerun the test.
