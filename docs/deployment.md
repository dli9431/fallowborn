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

Sprite atlases ship as PNGs under static/sprites/. Stylesheets reference them with relative, query-free URLs in the committed game so file:// works. Release staging stamps those CSS image URLs with the same version as the document assets; hosted builds use the deployment fingerprint and include the referenced sprites in the worker's versioned precache. The generated PNG ships through the existing static/ allowlist. Editable art and authoring tools remain outside the game repository.

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
| `campaign-started` | A new campaign was created. Carries the committed starting county, culture, and religion plus `quick_start`: one stable curated-start ID, or `custom` for the ordinary setup path. |
| `campaign-resumed` | A saved campaign began an uninterrupted foreground play entry. Loading another save during that same entry neither restarts its active clock nor emits another resume; returning to the title ends the entry. |
| `observer-mode-started` | A new observer-mode world was started. |
| `first-day-advanced` | A fresh campaign advanced its first simulated day. Emitted once per campaign. |
| `first-event-resolved` | A fresh campaign resolved its first event choice, manually or through automation. Emitted once per campaign with `resolution_mode`. |
| `active-play-reached-{1,5,15,30,60}-minute(s)` | The current gameplay session reached that much visible, active play. |
| `active-play-checkpoint` | Active time was recorded because the page was hidden or unloading; this is not a unique visit or session count. The first positive checkpoint is retained, later visibility checkpoints require 60 additional active seconds, and final page-hide checkpoints retain the latest value. Carries the current in-game year as `game_year`. |
| `returned-to-title` | The player deliberately returned from a running campaign or observer world to the title screen. |
| `player-life-ended` | The current player character died with at least one playable heir. |
| `succession-completed` | An heir took over after a death. |
| `retirement-completed` | A living player character handed the dynasty to a successor. |
| `campaign-ended-no-heir` | The campaign ended because no playable heir remained. |
| `community-cta-clicked` | A Discord community link was activated. Carries only the bounded `cta_surface`: `menu`, `saga`, or `report`. |
| `rating-cta-clicked` | The direct itch.io rating link was activated. Carries only the bounded `cta_surface`: `menu` or `saga`. |
| `sound-choice` | The first boot music prompt was answered. `music_choice` is `on` or `off`; `sound_source` is `boot-choice`. |
| `sound-changed` | A later manual sound change. `sound_source` is `settings`, `title-control`, `playback-control`, or `volume`; `music_choice` is the saved `on`/`off` preference. |

Every event also carries `sound_state`: `on`, `silent`, `unknown`, or `unavailable`.
Silent includes manual playback pause and zero game volume as well as the saved off
preference. Automatic background pauses do not change this classification. These values
describe in-game intent, not OS/browser muting or whether a track actually played.

For the initial silent-choice percentage, divide `sound-choice` events with
`music_choice=off` by all `sound-choice` events and multiply by 100. For ongoing play,
break down `campaign-started` and `campaign-resumed` by `sound_state`; divide silent
entries by on plus silent entries, excluding unknown/unavailable. This second measure
is a percentage of campaign entries, not distinct people. Use visitor counts for a
visitor-based comparison and expect overlap when the same visitor changes sound state.
Do not use toggle-event totals as the denominator: frequent togglers would skew it.

Every event carries `telemetry_schema`, `game_version`, and `locale`. When available, the shared
campaign properties are `start_bookmark`, `quick_start`, `player_tier`, and `dynasty_generation`; lifecycle
events add only bounded context such as `entry_type`, `scenario`, `family_preset`,
`quick_start`, `starting_location`, `starting_culture`, `starting_religion`, `active_seconds`, `game_year`, or
checkpoint reason. Engagement calls to action add only the fixed `cta_surface` values documented
above. The three `starting_*` properties, `scenario`, and `family_preset` accompany campaign events
when known, use stable internal IDs, and describe the original committed start even after
moves, conversions, or succession. Player and dynasty names,
world seeds, later locations, rendered death text, and save contents must never be sent. Do Not
Track remains respected by the Umami loader. Older event names remain only as historical schema-1
rows in Umami.
Fresh campaigns save the bounded `quick_start` origin so engagement, resume, and lifecycle
events can be compared between `custom` and each curated start. Saves created before that field
existed report `unknown` after load and are grandfathered past the two campaign-once activation
events rather than producing false first-day or first-event records. Original setup details
are recovered from valid saved start codes where available, without sending the code itself or
guessing that missing quick-start provenance means custom.
Once campaign state exists, every event carrying `start_bookmark` also carries the current
`game_year`. The pre-campaign New Game screen events are the deliberate exception: they may name
the selected bookmark before any campaign date exists.

`js/util.js` adds the manifest metadata and `js/main.js` registers `/sw.js` only when the page
is on `https://play.fallowborn.com`. The worker derives its versioned precache list during the
Docker build from every `css/js/data/mods` reference in the unstamped `index.html`, including
the inert deferred `ui_modals.js` asset pointer, plus every shipped `data/lang_*.js` catalog. It also
precaches PNG sprite URLs referenced by css/style.css and all three intro themes, but not the full
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

## Explicit distribution configuration

A CrazyGames artifact sets `window.FB_DISTRIBUTION = "crazygames"` in an inline
script in the document head before loading game scripts. `js/util.js` exposes
`FB.platform.isCrazyGames` and the `crazygames` platform name. This explicit flag
also works in local previews without relying on the hosting domain. Missing or
unknown values retain ordinary host detection and existing UI behavior. The
committed index does not set this flag; normal itch and play releases keep their
links. Do not store the distribution in saves, preferences, or query parameters.

CrazyGames rendering omits itch rating links and the saga play URL, and keeps
Discord in the menu only. The flag is a presentation setting, not an SDK
integration or a claim of platform approval.

CrazyGames also omits the Guide’s external More info links while retaining
local explanations and technology navigation. Email support and GitHub Issues
are menu links on this distribution; the report dialog keeps copying and points
back to those menu destinations. Other distributions keep support links in the
report dialog and documentation links in the Guide.

CrazyGames also activates `data/distribution_crazygames.js` before engine startup.
It is inert in ordinary builds. The profile supplies adapted event data, nonlethal
sentencing and a distinct save fingerprint; custom mods are disabled. Existing
standard saves require the standard edition. See
[content profiles](designs/distribution-content.md) for the behavior contract.

### CrazyGames progress

The CrazyGames package injects the official hosted v3 SDK and sets
`window.FB_CRAZYGAMES_STORAGE = "localstorage"` before game scripts. Only this
distribution loads the SDK; standard itch/play/file releases remain self-contained.
The flag selects one compressed campaign and earned starts in `localStorage`,
without opening the game save database or calling the SDK Data Module. Select
**Yes, using LocalStorage (Automatic Progress Save)** in the portal. APS support
and cross-device restore must be verified in the uploaded game. The browser still
enforces its shared `localStorage` quota. See
[state and saves](designs/state-and-saves.md#crazygames-save-storage).
Verify reload, another-device resume, quota rejection and file export before
submission. Screen entry/exit reports gameplay start/stop; Full Launch still
needs a broader pause/menu/lifecycle review.


Scheduled games adds data/tournaments.js, js/tournaments.js and js/ui_tournaments.js as classic local script references in index.html. The existing data/js directory allowlists cover these files in standard and CrazyGames packaging; the offline asset list is derived from the same index references. No new asset directory or external resource is required. New files must be tracked before a tracked-file package is assembled. No private workspace or site source is included.

Historical story support adds js/story_history.js as a classic local script reference before story instance registration. Existing js directory allowlists and index-derived offline assets cover it in standard and CrazyGames distributions. Track this new file before assembling a tracked-file package. English story displays and durable news use the existing storyCampaign and news extraction; no new asset directory or external dependency is added.

Mobile coalition assets

index.html loads data/mobile_confederations.js after the assembled story declarations, js/mobile_confederations.js after all government owners and adapters, and js/ui_mobile.js after ui_misc.js. These are ordinary authored data/JS assets included by both distribution allowlists and index-derived offline asset stamping. Historical and fictional regression journeys share the runtime contracts in both standard and CrazyGames distributions. No private capture or packaging file belongs in the public game.

Expanded 476 scripts

index.html loads data/geography_expansion.js immediately after data/geographies.js, then data/bookmark_476_wider_identities.js and data/bookmark_476_wider.js after the merged mobile and story declarations. The ordinary data-directory allowlist includes these assets; the CrazyGames tracked-file allowlist includes the same gameplay data while retaining its language and music exclusions. All new files must be tracked before producing a release package. Index-derived offline assets include the new script tags.

The 800 terrain composer, data/bookmark_800_expansion.js, loads after those identity declarations and before data/government_rollout.js. Both the ordinary and CrazyGames distributions require this data script, through the existing data-directory allowlists. It does not change distribution flags, music, locale controls or storage. The index-derived offline asset scan includes its script tag. Feature-branch versions and generated language catalogues remain integration-owned; tools/i18n_catalog.py reads the expansion's literal name tables without executing its composer.

The private debug script inventory mirrors this order with its existing eager English catalogue and modal extras. Private review ledgers and packaging tools remain outside this repository. Historical, raster, save/performance and distribution acceptance must refer to the same integrated revision.

Expanded 493 asset

The authored data/bookmark_493_world.js script loads from index.html through the normal data-directory distribution rules and index-derived offline precache. It must be tracked before either generated package is assembled. The standard and CrazyGames flag paths use the same hidden 493 declaration; language, music and storage policies are unchanged. No private research plan or packaging file is copied into the game. The generated CrazyGames package and the private debug loader still require integration review against the assembled branch; runtime flag tests do not establish package acceptance.

Expanded 1066 script

index.html loads data/bookmark_1066_inhabited.js after the shared wider declarations and before data/government_rollout.js, alongside the other date expansion scripts. data/communal_revisions.js follows data/bookmark_1204_terrain.js, the last date expansion script, and precedes data/government_rollout.js: it builds every date's declared jewish_samaritan_v3 revision before the rollouts derive from it. Existing data-directory allowlists cover both standard and CrazyGames packages; index-derived offline assets include the local reference. Track the new file before assembling a tracked-file package. There is no network asset, build dependency or asset directory. Distribution remains flag-gated, preserving standard music/language assets and CrazyGames exclusions. The dedicated acceptance specification covers both flag values. Version assignment, generated translations, private debug inventory synchronisation and packaged-device review remain integration work.
