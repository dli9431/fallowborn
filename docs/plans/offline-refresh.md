# Offline refresh for play.fallowborn.com

Date: 2026-07-29

Status: implementation plan. Not yet implemented.

Deployment background and the two distribution targets: [deployment.md](../deployment.md).

## Goal

After one complete online load of `https://play.fallowborn.com/`, a player should be able
to:

- continue playing after connectivity is lost;
- refresh the page while offline;
- close and reopen the game while offline; and
- load the selected language catalog while offline.

The existing open page already runs without a network connection. This plan adds reliable
offline navigation and asset loading.

## Scope and constraints

- Apply offline registration only to `play.fallowborn.com`.
- Keep `file://` behavior unchanged.
- Keep the itch build unchanged. It does not need to ship or register the service worker.
- Preserve the zero-dependency, static deployment.
- Preserve the existing `FB.VERSION` and deployment-fingerprint cache-busting rules.
- Do not cache external Discord, email, or GitHub destinations.
- Do not treat Cache Storage as permanent storage. Browsers can evict site data under
  storage pressure, and clearing site data removes both offline assets and saves.

### Why itch is out of scope

The itch build is excluded deliberately, not merely left for later. Offline refresh is a
`play.fallowborn.com` feature and cannot be extended to itch without a different design.

- The itch build runs in a cross-origin iframe on an itch-owned origin, under a path prefix
  itch controls and revises per upload. A root-scoped worker at `/sw.js` is not registrable
  there, and the root-relative paths in the precache list would not resolve.
- Browsers restrict service-worker registration and partition storage in third-party
  iframes. This is the same constraint behind the blocked-storage probe and warning in
  `js/save.js`.
- itch serves the upload through its own CDN, which would compete with the worker's update
  flow.

Excluding itch costs players little. The game already survives losing connectivity
mid-session, because nothing is fetched after boot. What itch cannot offer is surviving a
refresh or a reopen, and the itch desktop app already covers that case by downloading the
game locally.

## Why HTTP cache headers are not enough

The current nginx configuration serves versioned JavaScript and CSS as immutable, but
serves `index.html` with `Cache-Control: no-cache`. A browser may therefore require network
revalidation before reusing the HTML document. Ordinary HTTP caching also does not provide
an application-controlled navigation fallback.

A root-scoped service worker can intercept navigation and subresource requests and return
responses from Cache Storage when the network is unavailable. The web app manifest
described later is optional and does not provide offline support by itself.

## Recommended design

Add a root-level `sw.js`. It should:

1. Precache one complete, internally consistent game bundle during installation;
2. Use network-first behavior for HTML navigation, with cached `index.html` as the offline
   fallback;
3. Use exact cache-first behavior for versioned game assets;
4. Fall back to an `ignoreSearch` match only after a network failure, primarily for
   language files whose runtime `?v=` value uses `FB.VERSION`;
5. Activate only after every required precache request succeeds;
6. Claim existing pages after activation;
7. Delete only older caches whose names begin with the Fallowborn cache prefix; and
8. Receive its precache asset list from the build rather than carrying a hand-written one.

The cache name must contain the same deployment fingerprint that the Docker build uses to
stamp the asset URLs in the served `index.html`. The Docker build replaces a placeholder in
`sw.js`, ensuring that the served worker changes on every deployment and installs a new
cache.

Do not match versioned assets with `ignoreSearch` before trying an exact match and the
network. Doing so could make a newly deployed `index.html` run old JavaScript from a
previous release.

### Generated asset list

The obvious approach is a literal `VERSIONED_ASSETS` array in the committed worker listing
every shipped `js/` and `data/` file. **Reject it.** A hand-maintained list drifts from the
document silently, and both drift directions fail badly.

- **A new shipped file is added and the list is not updated.** `cache.addAll()` still
  succeeds, so the worker activates and online play looks correct. On an offline reload the
  missing asset misses the exact cache match, its network fetch fails, the `ignoreSearch`
  fallback also misses because it was never precached, and `assetResponse` rejects. The
  script never loads and the game breaks at boot for every offline player.
- **A shipped file is renamed or removed and the list is not updated.** `cache.addAll()`
  rejects, the new worker never activates, and players stay pinned to the previous cached
  bundle until the list is corrected.

This is not hypothetical. A hand-written list drafted for this plan had already lost
`js/papacy.js` and `data/papacy.js` before implementation began, simply because the papacy
system landed after the list was written.

The list must therefore be derived at build time from the same sources the page itself
uses. Two sources cover everything the game loads:

1. **`index.html`.** Every `css/`, `js/`, `data/`, and `mods/` reference in the document.
   The Docker build already matches exactly this set to apply the `?v=` stamp, so the
   generator reuses that pattern. Today this yields 46 assets: 1 stylesheet, 25 engine
   scripts, and 20 data files. It also means `js/platform.js`, and any future bundled mod,
   picks itself up as soon as it gets a script tag.
2. **`data/lang_*.js`.** Only `data/lang_en.js` appears in the document; `js/i18n.js` loads
   the other catalogs dynamically. A directory glob covers the shipped locales and picks up
   any locale added later without an edit here.

Deduplicate the union, since `data/lang_en.js` appears in both.

The committed `sw.js` keeps a string placeholder in place of the array contents. If the
substitution ever fails, the worker attempts to precache a path that does not exist,
`cache.addAll()` rejects, and the worker does not activate. That is the correct failure
mode: a broken build leaves the previous complete bundle in place rather than shipping a
half-cached one.

## Files affected when implemented

- `sw.js`, new service worker, committed as a template with two placeholders;
- `js/platform.js`, new, the origin gate described under *Platform gate*;
- `index.html`, one script tag for `js/platform.js` before `js/main.js`;
- `js/main.js`, hosted-build registration and the normal version/changelog bump;
- `nginx.conf`, no-cache handling for the worker;
- `Dockerfile`, deployment-fingerprint and asset-list substitution;
- `docs/deployment.md`, record the worker in the hosted-target description;
- optionally `manifest.webmanifest`, manifest markup, and new icon files; and
- optionally UI code and localized copy for an offline-readiness indicator.

## Service worker

The following is the intended shape of `sw.js`. It is committed as a template: the build
replaces `__FB_CACHE_KEY__` with the deployment fingerprint and the `'__FB_ASSET_LIST__'`
line with the generated asset list. A missing required asset makes `cache.addAll()` reject,
which is desirable: the new worker must not activate with an incomplete game bundle.

The committed file is syntactically valid JavaScript, so the `node --check` gate passes on
it, but it is not executable as committed and is never registered from `file://` or from
itch.

```js
/* Fallowborn offline shell for play.fallowborn.com. */
'use strict';

var CACHE_PREFIX = 'fallowborn-offline-';
var BUILD_KEY = '__FB_CACHE_KEY__';
var CACHE_NAME = CACHE_PREFIX + BUILD_KEY;
var VERSION_QUERY = '?v=' + encodeURIComponent(BUILD_KEY);

/* Replaced at build time with one quoted, root-relative path per line, derived from
   index.html and the shipped language catalogs. Left unsubstituted, the path below
   404s, cache.addAll() rejects, and this worker does not activate. */
var VERSIONED_ASSETS = [
  '__FB_ASSET_LIST__'
];

var STATIC_ASSETS = [
  '/index.html',
  '/static/favicon-32.png',
  '/static/apple-touch-icon.png'
];

var PRECACHE_ASSETS = STATIC_ASSETS.concat(VERSIONED_ASSETS.map(function (path) {
  return path + VERSION_QUERY;
}));

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(PRECACHE_ASSETS);
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (names) {
      return Promise.all(names.map(function (name) {
        if (name.indexOf(CACHE_PREFIX) === 0 && name !== CACHE_NAME) {
          return caches.delete(name);
        }
        return Promise.resolve(false);
      }));
    }).then(function () {
      return self.clients.claim();
    })
  );
});

function navigationResponse(request) {
  return fetch(request).then(function (response) {
    if (!response || !response.ok) return response;

    return caches.open(CACHE_NAME).then(function (cache) {
      return cache.put('/index.html', response.clone()).then(function () {
        return response;
      }, function () {
        return response;
      });
    });
  }, function () {
    return caches.open(CACHE_NAME).then(function (cache) {
      return cache.match('/index.html');
    });
  });
}

function assetResponse(request) {
  return caches.open(CACHE_NAME).then(function (cache) {
    return cache.match(request).then(function (exact) {
      if (exact) return exact;

      return fetch(request).then(function (response) {
        if (!response || !response.ok) return response;

        return cache.put(request, response.clone()).then(function () {
          return response;
        }, function () {
          return response;
        });
      }, function () {
        return cache.match(request, { ignoreSearch: true }).then(function (fallback) {
          if (fallback) return fallback;
          return Promise.reject(new Error('Offline asset is not cached'));
        });
      });
    });
  });
}

self.addEventListener('fetch', function (event) {
  var request = event.request;
  var url;

  if (request.method !== 'GET') return;

  url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(navigationResponse(request));
    return;
  }

  event.respondWith(assetResponse(request));
});
```

There is deliberately no asset list to maintain here. The build derives it, so adding,
renaming, or removing a shipped file needs no edit to `sw.js` and cannot silently break
offline play. See *Generated asset list* for why, and *Docker build substitution* for how.

All shipped language catalogs are precached intentionally, which is why the generator globs
`data/lang_*.js` rather than reading the document alone. `js/i18n.js` loads a selected
non-English catalog dynamically and appends `?v=<FB.VERSION>`, while the Docker-stamped
page uses the deployment fingerprint, so the two URLs disagree by design. The offline-only
`ignoreSearch` fallback lets that request use the precached catalog without allowing an old
exact URL to override a new asset while online.

## Platform gate

The registration snippet below gates on `FB.platform.isPlay`. **No `FB.platform` object
exists in `js/` today.** It has to be added as part of this work; without it the snippet
throws at boot. Add `js/platform.js` and load it from `index.html` before `js/main.js`:

```js
/* Fallowborn - which surface is this build running on. */
window.FB = window.FB || {};

(function () {
  'use strict';

  var loc = window.location || {};
  var https = String(loc.protocol || '').indexOf('http') === 0;

  FB.platform = {
    name: 'browser',
    isPlay: https && loc.hostname === 'play.fallowborn.com'
  };
})();
```

Gate on the origin, not on "not `file://`". The game also runs from an itch-owned origin
inside an iframe, where a root-scoped worker would be both unnecessary and outside the itch
allowlist. An explicit hostname is the narrowest gate and matches the scope constraint at
the top of this plan. If a staging origin is ever added, extend the check rather than
loosening it to any HTTPS host.

Shape `FB.platform` as a general-purpose surface-detection seam rather than a single
offline boolean. Storage, lifecycle, and share behavior all differ by surface today and are
currently decided ad hoc at their call sites; a seam that can absorb them later is worth
more than a one-off flag, and a second competing abstraction added afterwards would be
worse than one designed for extension now.

Because `js/platform.js` is a new shipped script it needs a tag in `index.html`, and the
generated precache list picks it up from there automatically.

## Registration

Register the worker from `js/main.js` only on the hosted game target:

```js
if (FB.platform.isPlay && 'serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js', {
    scope: '/',
    updateViaCache: 'none'
  }).catch(function () {
    /* Offline support is progressive enhancement. Game boot must continue. */
  });
}
```

`/sw.js` gives the worker root scope, so it can handle navigation to `/`. Registration must
not run on `file://` or itch. A registration failure must never prevent game boot.

For a visible readiness indicator, listen for `controllerchange` and check
`navigator.serviceWorker.controller`. Do not announce offline readiness merely because the
normal page finished rendering. The first installation is ready only after `cache.addAll()`
finishes and the worker activates.

Suggested player-facing state:

- while installing: no message, or `Preparing offline play...`;
- after activation and control: `Available offline`; and
- after an installation failure: keep the game playable and omit the readiness claim.

Any new visible text must go through the game's i18n process during integration. See
[i18n-authoring.md](../i18n-authoring.md).

## nginx configuration

The current JavaScript location marks every `.js` response immutable. Add an exact location
before the general locations so the service-worker script is always revalidated:

```nginx
location = /sw.js {
    add_header Cache-Control "no-cache" always;
    try_files $uri =404;
}
```

An exact nginx location wins over the existing regular-expression JavaScript location. Also
ensure that Cloudflare does not override this response with a long edge-cache TTL. The
`updateViaCache: 'none'` registration option is a second safeguard, not a reason to serve
the worker as immutable.

Keep the existing behavior for:

- versioned `.js` and `.css` assets: immutable;
- `index.html`: `no-cache`; and
- other unversioned files: `no-cache`.

The service worker, rather than ordinary HTTP cache freshness, supplies the offline HTML
fallback.

## Docker build substitution

The Docker build already calculates `V` and stamps asset references in `index.html`. The
same `RUN` block gains two more jobs: generate the precache list, and stamp the worker.

**Order matters.** Extract the asset list *before* stamping `index.html`. The extraction
pattern excludes `?`, so once the page carries `?v=` stamps it no longer matches.

```dockerfile
RUN set -eu; \
    root=/usr/share/nginx/html; \
    V="${SOURCE_COMMIT:-}"; \
    [ -n "$V" ] || V="$(sed -n -r "s/.*FB\.VERSION[[:space:]]*=[[:space:]]*'([^']+)'.*/\1/p" "$root/js/main.js" | head -n1)"; \
    { grep -o -E '(src|href)="(css|js|data|mods)/[^"?#]+"' "$root/index.html" \
        | sed -r 's/^(src|href)="//; s/"$//'; \
      ls "$root"/data/lang_*.js | sed "s|^$root/||"; \
    } | awk '!seen[$0]++' | sed "s|.*|  '/&',|" > /tmp/fb-assets.txt; \
    sed -i -e "/'__FB_ASSET_LIST__'/r /tmp/fb-assets.txt" \
           -e "/'__FB_ASSET_LIST__'/d" "$root/sw.js"; \
    sed -i "s/__FB_CACHE_KEY__/$V/g" "$root/sw.js"; \
    sed -i -r "s@(src|href)=\"((css|js|data|mods)/[^\"?#]+)\"@\1=\"\2?v=$V\"@g" "$root/index.html"; \
    rm -f /tmp/fb-assets.txt; \
    echo "stamped ?v=$V, precaching $(grep -c \"^  '/\" "$root/sw.js") assets"
```

Notes on the shell, which runs under BusyBox in `nginx:alpine`:

- `grep -o -E` reuses the Dockerfile's existing capture set, so the worker and the `?v=`
  stamp can never disagree about which files are assets.
- `ls "$root"/data/lang_*.js` adds the dynamically loaded catalogs. `set -eu` makes a build
  with no catalogs fail loudly rather than ship a worker that cannot serve a locale.
- `awk '!seen[$0]++'` deduplicates while preserving order. `data/lang_en.js` comes from both
  sources.
- `sed "s|.*|  '/&',|"` turns `js/util.js` into `  '/js/util.js',`. A trailing comma on the
  final element is valid in an array literal. Paths stay bare; `sw.js` appends
  `VERSION_QUERY` itself, exactly as in the listing above.
- `sed -e '/pat/r file' -e '/pat/d'` inserts the generated block after the placeholder line,
  then deletes the placeholder. The queued `r` output is still flushed after `d`.
- The `echo` reports the asset count. A sudden change in that number between deploys is the
  cheapest available signal that something moved.

The expected served result is:

```js
var BUILD_KEY = '<SOURCE_COMMIT or FB.VERSION fallback>';

var VERSIONED_ASSETS = [
  '/css/style.css',
  '/js/util.js',
  /* ... every other document asset ... */
  '/data/lang_qps.js',
];
```

Changing the served `sw.js` bytes on every deployment triggers the browser's service-worker
update flow. The new worker precaches the new fingerprinted bundle before activation, then
removes the older Fallowborn cache.

Both placeholders are intentionally left intact in the committed file. Registration is
limited to the play host, and the play Docker build is responsible for replacing them. The
itch build and `file://` never register a worker, so they never read the template.

## Optional web app manifest

Offline refresh does not require a web app manifest. Add one only if Fallowborn should also
be installable to a home screen or desktop app launcher.

Create `manifest.webmanifest`:

```json
{
  "id": "/",
  "name": "Fallowborn",
  "short_name": "Fallowborn",
  "description": "A grand-strategy dynasty saga of the early Middle Ages.",
  "start_url": "/",
  "scope": "/",
  "display": "standalone",
  "background_color": "#171310",
  "theme_color": "#171310",
  "icons": [
    {
      "src": "/static/icon-192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/static/icon-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/static/icon-maskable-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "maskable"
    }
  ]
}
```

Add these elements to the document head:

```html
<meta name="theme-color" content="#171310">
<link rel="manifest" href="/manifest.webmanifest">
```

The existing icons are 32 by 32 and 180 by 180. Retain them for favicon and Apple touch
use, but create dedicated 192 by 192 and 512 by 512 PNGs for broad installability. The
maskable icon should have an opaque background and keep important artwork inside the
central safe area so operating-system masks do not crop it.

If the optional manifest is adopted:

- add `manifest.webmanifest` and all manifest icons to `STATIC_ASSETS`;
- confirm nginx returns the manifest as `application/manifest+json` or another valid JSON
  media type;
- keep the manifest and icons self-contained with no external URLs, per the
  no-external-assets rule;
- keep the existing Apple mobile meta tags and touch icon unless device testing shows a
  conflict; and
- test standalone launch separately from ordinary browser launch.

The manifest is metadata and installation UI. `sw.js` remains the component responsible for
offline refresh.

## Update behavior

Expected release flow:

1. Coolify builds a new image.
2. Docker stamps `index.html` and `sw.js` with the same deployment fingerprint.
3. An online navigation receives the new `index.html`.
4. The browser detects changed `sw.js` bytes.
5. The new worker downloads the complete new cache.
6. Only a complete cache is activated.
7. Activation claims pages and deletes older Fallowborn caches.
8. Later offline navigations receive the cached current `index.html` and assets.

The normal `FB.VERSION` and `FB.CHANGELOG` integration rules still apply. The service
worker is not a replacement for the existing asset cache-bust discipline. See
[VERSIONS.md](../VERSIONS.md).

## Test plan

Use a normal browser against `https://play.fallowborn.com/`. Do not use shell or
headless-browser gameplay tests. Test execution is owner-controlled, per
[TESTS.md](../TESTS.md).

### Generated asset list

Run this once per deployment, before the gameplay checks. It is the check that replaces
hand-auditing the list.

1. Fetch `https://play.fallowborn.com/sw.js` and confirm neither `__FB_CACHE_KEY__` nor
   `__FB_ASSET_LIST__` survives in the served file.
2. Confirm `BUILD_KEY` matches the `?v=` value stamped into the served `index.html`.
3. Count the entries in the served `VERSIONED_ASSETS` and compare against the document:
   every `css/`, `js/`, `data/`, and `mods/` reference in `index.html`, plus every
   `data/lang_*.js`, with `data/lang_en.js` appearing once. Before this work the document
   carries 46 assets (1 stylesheet, 25 scripts, 20 data files) and 5 catalogs load
   dynamically, so 51 entries. Adding `js/platform.js` makes it 52. Derive the expected
   number from the document at the time of the check rather than from this figure.
4. Confirm the build log line reports the same count.
5. Confirm `js/papacy.js` and `data/papacy.js` are present. They are the files an earlier
   hand-written list had already lost, so they are the useful canary.

### First installation

1. Clear site data and unregister any existing worker.
2. Load the game online.
3. In browser developer tools, confirm that `/sw.js` is activated and controls the page.
4. Confirm that the current `fallowborn-offline-*` cache contains every required asset.
5. Switch developer tools to Offline.
6. Perform a normal reload.
7. Confirm that the title screen appears and a new or saved game can be played.
8. Close the tab, reopen `https://play.fallowborn.com/` while still offline, and repeat.

### Languages

For English, French, German, Italian, and Spanish:

1. select the language while online;
2. wait for the game and worker to finish;
3. switch offline;
4. reload; and
5. confirm that the selected catalog loads without falling back to English.

Also test changing the language while already offline. That action deliberately reloads the
page, so it exercises both cached navigation and the dynamic catalog fallback.

### Deployment update

1. Load release A and confirm offline reload.
2. Deploy release B.
3. Return online and reload once.
4. Confirm that the new worker activates and that only release B's Fallowborn cache
   remains.
5. Go offline and reload.
6. Confirm that the page does not mix release A HTML or data with release B JavaScript.

### Distribution isolation

1. Open the repository's `index.html` through `file://` and confirm normal game boot.
2. Confirm that no service-worker registration is attempted from `file://`.
3. Confirm that the itch build does not register `/sw.js`.
4. Confirm that the itch allowlist does not need to include `sw.js`,
   `manifest.webmanifest`, or manifest-only icons unless itch installation is deliberately
   added later.
5. Confirm `FB.platform.isPlay` is `false` from `file://` and from the itch embed, and
   `true` only on the play origin.
6. Confirm the Playwright served-origin project does not acquire a worker. It serves from
   `localhost:4173`, so the hostname gate should already exclude it; verify rather than
   assume, because a stray registration would leak cached assets across test runs.

### Optional manifest

1. Confirm that the browser recognizes the manifest without warnings.
2. Confirm that 192 by 192 and 512 by 512 icons are detected.
3. Inspect the maskable icon under circular and rounded-square masks.
4. Install the app, launch it offline, and confirm standalone presentation and saved-game
   access.
5. Confirm that uninstalling the app does not create assumptions about save deletion, which
   varies by browser.

## Acceptance criteria

- A first online visit installs a complete offline bundle.
- A normal offline refresh loads the game.
- Closing and reopening the URL offline loads the game.
- Every shipped language works after an offline refresh.
- A partially downloaded new release never replaces the last complete offline bundle.
- Online visits still receive the newest deployment.
- Old Fallowborn caches are removed without touching unrelated origin caches.
- Registration or Cache Storage failure never prevents ordinary online play.
- `file://` and itch behavior remain unchanged.
- If included, the manifest installs cleanly but is not required for offline operation.
- The served worker's asset list is generated, complete, and matches `index.html` plus the
  shipped catalogs, with no placeholder text surviving.
- Adding, renaming, or removing a shipped `js/` or `data/` file requires no edit to `sw.js`
  and cannot silently break offline play.
- A failed substitution prevents activation rather than shipping a partial cache.

## References

- MDN, Service Worker API:
  <https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API>
- MDN, PWA caching:
  <https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Caching>
- Chrome for Developers, service-worker update caching:
  <https://developer.chrome.com/blog/fresher-sw>
- MDN, making PWAs installable:
  <https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable>
- MDN, defining app icons:
  <https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/How_to/Define_app_icons>
