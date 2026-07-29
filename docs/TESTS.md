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
downloads the Chromium revision pinned by that Playwright version. On Linux CI, Playwright uses
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

# Static-server start and clean-close regression
npm run test:server

# Complete configured suite
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
2. Add or update automated tests that exercise the expected behavior and would catch its
   regression. Keep those tests in the same commit or branch as the implementation.
3. Do not run any focused test, syntax gate, browser matrix, runtime verifier, or manual browser
   check. Do not install Playwright dependencies or browsers.
4. In the handoff, list the test files added or updated and state that the tests were not run.

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
- Start only after the Chromium CI job succeeds.
- Cover clean boot, ordinary player journeys, and the representative settlement-council
  keyboard and responsive-layout contract.
- Keep direct `file://` determinism and bounded simulation canaries on Chromium, where they
  provide one stable primary baseline without tripling the slowest cases.

Each test receives a fresh isolated browser context. The suite never assumes that `file://`
storage behaves like origin-backed storage.

## Current coverage

The initial suite covers:

- clean boot from both targets;
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
  principal panel shortcuts, and desktop/mobile-width structure.

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
subprocess before a page exists. Linux CI retains the normal Firefox sandbox.

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

## Continuous integration

`.github/workflows/test.yml` runs only when the owner starts it manually with GitHub's
`workflow_dispatch` control. It does not run automatically on pushes or pull requests. Its
Chromium job:

1. installs Node and runs `npm ci` from `tests/e2e/`;
2. runs the JavaScript syntax gate;
3. installs only Chromium and its Linux system dependencies;
4. runs the file and served-origin suite;
5. uploads Playwright reports and failure diagnostics.

After Chromium succeeds, the compatibility job installs Firefox and WebKit and runs their
served-origin projects. Keeping this job downstream makes Chromium the fast failure gate and
avoids spending compatibility-runner time on an already broken primary suite.

A separate CI job builds the nginx image, copies out `/usr/share/nginx/html`, and runs
`support/verify-runtime-manifest.js` against the actual document root. This confirms that only
`index.html`, `LICENSE`, `css/`, `data/`, `docs/`, `js/`, `mods/`, and `static/` ship, and that
runtime asset URLs in the deployed `index.html` have a cache-busting version stamp.

The same verifier can check a stamped local staging directory:

```sh
npm run verify:runtime -- <path-to-staged-document-root>
```

It is expected to reject the committed source root because the committed `index.html` must remain
unstamped for `file://` compatibility.

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
