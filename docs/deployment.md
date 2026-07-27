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

## play.fallowborn.com

A **separate** origin — a Coolify app (nginx behind Cloudflare) that auto-deploys on every push to
`main` (`deploy.cmd` does not touch it). Its Dockerfile build stamps `?v=<FB.VERSION>` onto the
served `index.html` and serves the versioned `css/js/data/mods` assets **immutable**, so the same
`FB.VERSION` bump busts its cache too — and until it bumps, the `immutable` cache keeps returning
players on stale assets. The tracked development-only `i18n/` cache/report directory is removed
from the served root during the image build. Details in the private ops notes.

## The `file://` rule

Never add `?v=` to the **committed** `index.html`: query strings break `file://` loads, and the
game must run by opening the folder directly. The stamp is applied only in the deploy/build stage,
never to the repo. Likewise there are no external assets of any kind — the folder stays
self-contained so it works inside the itch iframe and from `file://`.
