# Testing Fallowborn

Fallowborn has a development-only Playwright Test harness under `tests/e2e/`. The shipped game
remains plain static JavaScript with no runtime dependencies or build step. Opening the committed
`index.html` directly still works without installing Node packages or running a server.

## First-time setup

Run these commands from `tests/e2e/`:

```sh
npm ci
npx playwright install chromium
```

`npm ci` installs the exact package graph recorded in `package-lock.json`. The second command
downloads the Chromium revision pinned by that Playwright version. On Linux CI, Playwright uses
`npx playwright install --with-deps chromium` so the operating-system browser libraries are
installed too.

The Node package, browser binary, reports, screenshots, and traces are development-only. They are
not included in either deployment artifact.

## Running the tests

From `tests/e2e/`:

```sh
# Fast syntax check for shipped and test JavaScript
npm run check

# Complete configured suite
npm test

# Explicitly run both Chromium targets
npm run test:chromium

# Run only the direct file target
npm run test:file

# Run only the local HTTP target
npm run test:served
```

Playwright starts and stops the test server automatically. Tests run headlessly unless a
Playwright command-line option requests another mode.

To run one specification or one named case:

```sh
npx playwright test specs/boot.spec.js
npx playwright test -g "export a life"
```

Do not import game scripts into Node. Game logic runs inside the real browser page; Node handles
orchestration, assertions, fixtures, and reporting.

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

Target-specific cases use explicit skips. For example, the full storage contract runs only on the
served project, while the initial determinism and simulation canaries run only on the file
project.

## Shared support

Specifications should import `test` and `expect` from `support/fixture.js`, not directly from
`@playwright/test`. The shared fixture fails the test on page exceptions, console errors, failed
requests, bad HTTP responses, or network traffic outside the expected local target.

`support/game.js` owns common player journeys such as waiting for the title screen and starting
the deterministic test life. Wait for visible screens or browser-observable state, never fixed
sleeps.

`support/browser-harness.js` is injected into the loaded page. It provides bounded day advancement
and invariant checks without adding test-only APIs to shipped game code. Its simulation limits
must remain finite so an interruption reports a useful failure instead of waiting for the outer
Playwright timeout.

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

`.github/workflows/test.yml` runs on pushes and pull requests targeting `main`. Its Chromium job:

1. installs Node and runs `npm ci` from `tests/e2e/`;
2. runs the JavaScript syntax gate;
3. installs only Chromium and its Linux system dependencies;
4. runs the file and served-origin suite;
5. uploads Playwright reports and failure diagnostics.

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
- keyboard comfort beyond structural focus contracts;
- touch, pinch, bottom-sheet, and small-screen behavior;
- itch.io iframe and storage behavior;
- real iOS and Android browsers;
- pacing, legibility, and game feel.

Run the fast Chromium suite for ordinary integration. Run broader browser and viewport coverage
when those projects are added, and before releases where compatibility risk warrants it.

## Common problems

If `playwright` is not recognized, run `npm ci` from `tests/e2e/`. If Playwright reports that the
Chromium executable is missing, run `npx playwright install chromium`.

The served project uses port `4173`. If startup reports that the port is already in use, stop the
unrelated local process and rerun the test. CI never reuses an existing server.
