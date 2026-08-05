# Deployment and cache-busting

Fallowborn ships as a self-contained folder — no build step. It is served from **two independent
targets**, and `FB.VERSION` (top of `js/main.js`) is the cache-bust key for both, which is why
[VERSIONS.md](VERSIONS.md) and `AGENTS.md` insist every change landing on `main` bumps it.

## itch.io

Zip the folder contents with `index.html` at the zip root, upload to itch.io as an HTML5 project
("played in the browser"), and enable *Mobile friendly*. In practice the owner runs
`notes/deploy.cmd` (butler push), which packages and pushes automatically.

`notes/deploy.cmd` runs `notes/stamp.ps1`, which appends `?v=<FB.VERSION>` to every `css/`, `js/`,
`data/`, and `mods/` URL in the **staged** `index.html` before the push. That makes the version
the cache key for the itch build, so browsers and the itch CDN fetch fresh files on each release.
The script stages only `index.html`, `LICENSE`, `css/`, `data/`, `docs/`, `js/`, `mods/`, and
`static/`. That fail-closed list is the artifact boundary. Test files, Node packages, reports,
and repository metadata must not be added to it.

The itch page does not register a service worker or advertise the hosted web-app manifest.
`FB.platform.isPlay` is false inside the itch-owned iframe, so the root-scoped offline shell
cannot compete with itch's CDN or depend on third-party iframe storage.

## play.fallowborn.com

A **separate** origin - a Coolify app (nginx behind Cloudflare) that auto-deploys on every push to
`main` (`deploy.cmd` does not touch it). Its Dockerfile copies the explicit runtime allowlist plus
the play-only `sw.js` and `manifest.webmanifest` into the nginx document root. It stamps one
deployment fingerprint (Coolify's `SOURCE_COMMIT`, with `FB.VERSION` as the local fallback) into
both the served `index.html` asset URLs and the worker cache name. Versioned `css/js/data/mods`
assets remain **immutable**; `index.html`, `sw.js`, and the manifest are always revalidated.
Cloudflare must preserve the worker's `no-cache` policy.

### First-party play telemetry

The committed `index.html` loads the self-hosted Umami tracker only when the document itself is
served from exactly `https://play.fallowborn.com`. The event dispatcher repeats that exact
protocol-and-host check before accepting an event. It therefore sends no pageviews or gameplay
events from itch's iframe origin, `file://`, localhost, staging hosts, forks, or mirrors.

The hosted game records a small anonymous vocabulary: starts and continues, Observe starts,
active-play milestones, background/exit checkpoints, succession or retirement, individual life
endings, and a saga ending without an heir. Event properties stay low-cardinality and describe
the game build and campaign shape, such as version, locale, bookmark, tier, generation, scenario,
and elapsed active time. Player and dynasty names, world seeds, province choices, rendered death
text, and save contents must never be sent. Do Not Track remains respected by the Umami loader.

`js/util.js` adds the manifest metadata and `js/main.js` registers `/sw.js` only when the page
is on `https://play.fallowborn.com`. The worker derives its versioned precache list during the
Docker build from every `css/js/data/mods` reference in the unstamped `index.html` plus every
shipped `data/lang_*.js` catalog. Installation activates only after that whole bundle and the
unversioned HTML, manifest, favicons, and install icons have cached successfully.

Hosted navigation is network-first so an online visit still receives the newest deployment.
The response is not written into the active worker's cache: only a completed worker installation
seeds cached HTML, so a failed update cannot replace the previous complete document with one that
expects partial or missing assets. Versioned assets are exact cache-first; only after a network
failure may a query-insensitive fallback serve a precached asset. That last fallback is required
for dynamically loaded language catalogs, whose runtime query uses `FB.VERSION` while the Docker
precache uses the deployment fingerprint. Activation claims existing pages, deletes only older
`fallowborn-offline-*` caches, and makes the title-screen **Available offline** status visible once
the page has a controlling worker.

The manifest makes the hosted game eligible for browser installation, but the service worker is
what provides offline refresh. Browser storage remains evictable: clearing site data removes the
offline bundle and local saves, and storage pressure may remove cached assets. Exported saves
remain the durable player-controlled backup.

`tests/e2e/support/verify-runtime-manifest.js <document-root> [target]` verifies either staged
artifact against the runtime allowlist, rejects development output anywhere below it, and confirms
that the deployed `index.html` asset URLs were stamped. For a `play` artifact it also validates
the worker fingerprint and generated asset list plus the manifest and icon dimensions. Pass
`play` or `itch` to require the target-specific boundary; omitting it keeps auto-detection for
older local workflows. CI applies the play check to the built nginx image. The private itch
staging check remains part of the separate release workflow.

## The `file://` rule

Never add `?v=` to the **committed** `index.html`: query strings break `file://` loads, and the
game must run by opening the folder directly. The stamp is applied only in the deploy/build stage,
never to the repo. Likewise there are no external assets of any kind — the folder stays
self-contained so it works inside the itch iframe and from `file://`.

The committed worker remains a deliberately unsubstituted template and is never registered from
`file://`; the hosted Docker build is the only path that stamps and activates it. The manifest
link and theme metadata are also injected only on the play host.
