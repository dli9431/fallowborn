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
`static/`, then uses `tools/music_catalog.py` to validate and add the complete soundtrack.
Gameplay music must fit beneath 200,000,000 bytes; all three intro themes are required and sit
outside that cap. Deployment fails if the complete catalog no longer fits, so itch never receives partial
contextual banks. The staged generated catalog describes the complete copied soundtrack. That
fail-closed process is the artifact boundary. Test files, Node packages, reports, and repository
metadata must not be added to it.

The itch page does not register a service worker or advertise the hosted web-app manifest.
`FB.platform.isPlay` is false inside the itch-owned iframe, so the root-scoped offline shell
cannot compete with itch's CDN or depend on third-party iframe storage.
When music is enabled on itch, the player uses the same faith, culture, and folk/court/war context
selection as play.fallowborn.com. Play-only ratings and explicit offline-bank downloads remain
hosted features because they depend on the first-party play origin and its service worker.

## play.fallowborn.com

A **separate** origin - a Coolify app (nginx behind Cloudflare) that auto-deploys on every push to
`main` (`deploy.cmd` does not touch it). Its Dockerfile validates the full `music/` tree and
generates `data/music_catalog.js`, then copies the explicit runtime allowlist plus
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

The Coolify Umami service sets `TRACKER_SCRIPT_NAME=fb-client.js` and
`COLLECT_API_ENDPOINT=/api/fb-event`. The committed loader requests the renamed tracker at
`https://stats.fallowborn.com/fb-client.js`; that generated tracker selects the renamed
collection endpoint itself, so game code does not hardcode the collection route.

The hosted game records a small anonymous vocabulary. Schema 2 uses event names that describe the
player action or campaign transition directly:

| Event | Meaning and cadence |
| --- | --- |
| `new-game-{starting-date,seed-dialog,beginning,birthplace,character}-viewed` | A New Game attempt reached that setup screen. Each screen emits at most once per attempt, so Back navigation does not inflate the funnel; the seed dialog is an optional branch. |
| `campaign-started` | A new campaign was created. Carries the committed starting county, culture, and religion as stable IDs for comparing start popularity. |
| `campaign-resumed` | A saved campaign was loaded; emitted at most once per page visit. |
| `observer-mode-started` | A new observer-mode world was started. |
| `active-play-reached-{1,5,15,30}-minute(s)` | The current gameplay session reached that much visible, active play. |
| `active-play-checkpoint` | Active time was recorded because the page was hidden or unloading; this is not a unique visit or session count. Carries the current in-game year as `game_year`. |
| `returned-to-title` | The player deliberately returned from a running campaign or observer world to the title screen. |
| `player-life-ended` | The current player character died with at least one playable heir. |
| `succession-completed` | An heir took over after a death. |
| `retirement-completed` | A living player character handed the dynasty to a successor. |
| `campaign-ended-no-heir` | The campaign ended because no playable heir remained. |

Every event carries `telemetry_schema`, `game_version`, and `locale`. When available, the shared
campaign properties are `start_bookmark`, `player_tier`, and `dynasty_generation`; lifecycle
events add only bounded context such as `entry_type`, `scenario`, `family_preset`,
`starting_location`, `starting_culture`, `starting_religion`, `active_seconds`, `game_year`, or
checkpoint reason. The three `starting_*` properties appear only on `campaign-started`, use
stable internal IDs, and describe the character's committed start. Player and dynasty names,
world seeds, later locations, rendered death text, and save contents must never be sent. Do Not
Track remains respected by the Umami loader. Older event names remain only as historical schema-1
rows in Umami.
Once campaign state exists, every event carrying `start_bookmark` also carries the current
`game_year`. The pre-campaign New Game screen events are the deliberate exception: they may name
the selected bookmark before any campaign date exists.

`js/util.js` adds the manifest metadata and `js/main.js` registers `/sw.js` only when the page
is on `https://play.fallowborn.com`. The worker derives its versioned precache list during the
Docker build from every `css/js/data/mods` reference in the unstamped `index.html`, including
the inert deferred `ui_modals.js` asset pointer, plus every shipped `data/lang_*.js` catalog. It also
precaches all three intro themes, but not the full
soundtrack. Installation activates only after that whole bundle and the unversioned HTML,
manifest, favicons, install icons, and intros have cached successfully.

Hosted navigation is network-first so an online visit still receives the newest deployment.
The response is not written into the active worker's cache: only a completed worker installation
seeds cached HTML, so a failed update cannot replace the previous complete document with one that
expects partial or missing assets. Versioned assets are exact cache-first; only after a network
failure may a query-insensitive fallback serve a precached asset. That last fallback is required
for dynamically loaded language catalogs, whose runtime query uses `FB.VERSION` while the Docker
precache uses the deployment fingerprint. Activation claims existing pages, deletes only older
`fallowborn-offline-*` caches, preserves the separate stable `fallowborn-music-v1` cache, and makes
the title-screen **Game available offline** status visible once the page has a controlling worker.
An open play-host page also requests an update at boot, every five minutes while visible, and on
refocus. Once a replacement worker has installed its complete bundle and activated, it reports the
same stamped deployment fingerprint used by the document's asset URLs. A different fingerprint
reveals a persistent **New version available** banner; **Save and reload** synchronously updates the autosave
before loading the new document. Matching fingerprints and a first worker installation stay quiet,
and no part of this notification path runs on itch or `file://`.

Gameplay music is fetched a complete track at a time and stored in `fallowborn-music-v1` under a
revisioned URL. A repeated track reuses that response. The offline-music screen can download or
remove a complete selector bank or the entire soundtrack; completion markers are recorded only
after every required track is present. Range requests bypass this cache so a partial response can
never masquerade as a fully downloaded track. Cached soundtrack storage remains subject to normal
browser eviction.

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
never to the repo. Likewise there are no external network assets. The generated Opus catalog uses
only files under the self-contained `music/` folder, so playback still works inside the itch iframe
and from `file://`.

The committed worker remains a deliberately unsubstituted template and is never registered from
`file://`; the hosted Docker build is the only path that stamps and activates it. The manifest
link and theme metadata are also injected only on the play host.
