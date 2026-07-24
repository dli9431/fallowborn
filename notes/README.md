# Private ops notes

Everything in `notes/` stays out of the public repo (via `.git/info/exclude`, not
.gitignore — so the repo doesn't advertise the directory exists) and out of itch uploads
(via the allowlist below).

- `strategy.md` — traction, monetization, licensing, launch sequence.
- `launch.md` — per-platform launch copy: taglines, tags, descriptions, checklists.
- `youtube.md` — video 1 plan: titles, thumbnail, script beats.
- `cover.html` — itch cover-image generator. Open in a browser (works from
  `file://`); composes the 630×500 cover from the game's own procedural art
  (map projection + portraits + heraldry), so the export contains no AI or
  external assets. Regenerate faces/arms, tweak title, Download PNG.
- `deploy.cmd` — one-command itch deploy: stages the allowlist and runs
  `butler push`. Run `notes\deploy.cmd` from anywhere.
- `coolify-cache.md` — play.fallowborn.com cache setup (Coolify **Static** app,
  auto-deploys from `main`): the nginx `no-cache`+ETag config for the Custom Nginx
  Configuration box, plus an optional Dockerfile upgrade for immutable + commit-SHA
  busting, plus the Cloudflare settings. Separate from itch; the itch path
  (`deploy.cmd`/`stamp.ps1`) is untouched. No manual deploy step for the domain.
- `site/index.html` — landing-page scaffold for fallowborn.com. Static,
  zero-dependency, no external assets (same ethos as the game). Move to the root
  of the separate site repo. Fill: `/play` (bleeding-edge build), Discord/Ko-fi
  links, `/og-cover.png` (the itch cover, for link previews).
- `multiplayer.md` — multiplayer design proposal (kept private until announced).
  **Consult before restructuring `js/main.js`, the event flow, or `state.player`** —
  this guidance used to live in AGENTS.md but can't reference notes/ there.
- `mods/` — the unbundled Westeros/ASOIAF conversion (westeros.js + its README), pulled
  from the public repo and zip for IP reasons. Distribute separately as a free
  community mod via the runtime JSON import (the importable JSON is the `data` object
  inside westeros.js).
- `exclude` — backup copy of `.git/info/exclude` (see below).

## The exclude step (after any re-init or fresh clone)

`.git/info/exclude` lives inside `.git/`, so wiping the repo history (delete `.git` +
`git init`) deletes the exclusion with it. Immediately after `git init` — **before the
first `git add .`** — restore it:

```powershell
Copy-Item notes\exclude .git\info\exclude    # restore from the backup copy kept here
# (or from scratch: Add-Content .git\info\exclude "notes/")
```

Then verify with `git status`: `notes/` must not appear anywhere in the output. If it
shows as untracked, the exclude isn't active — fix before staging anything.

## Publishing to itch.io

Build the upload from an explicit **allowlist** — never zip the working folder
directly. The allowlist fails closed: a file ships only if named here, so `notes/`,
`.git/`, and any future private files can't leak by accident.

```powershell
$ship = @('index.html', 'css', 'js', 'data', 'mods', 'docs', 'LICENSE')

$stage = Join-Path $env:TEMP 'fallowborn-stage'
Remove-Item $stage -Recurse -Force -ErrorAction SilentlyContinue
New-Item -ItemType Directory $stage | Out-Null
foreach ($item in $ship) { Copy-Item $item -Destination $stage -Recurse }

Compress-Archive -Path "$stage\*" -DestinationPath fallowborn.zip -Force
```

(`docs/` ships on purpose — MODDING.md is a feature for a mod-first game.)

Upload settings:

- `index.html` must be at the **zip root** (itch hard requirement; the staging step
  guarantees it).
- Upload as an HTML5 project, set "This file will be played in the browser", enable
  *Mobile friendly* in the embed options. Viewport 1280×720 (or fullscreen) works well.
- Post a devlog with each meaningful update — itch's browse algorithm bumps
  recently-updated projects.

Known issue: Windows PowerShell 5.1's `Compress-Archive` writes backslash path
separators inside the zip, which itch's processing occasionally rejects (symptom: itch
claims it can't find `index.html`). If that happens, zip the staging folder with 7-Zip
or Explorer's "Send to → Compressed folder" instead.

Once updates are frequent, switch to **butler** (itch's official CLI): it pushes the
staging directory directly — no zip — and uploads only the diff from the previous
version:

```powershell
butler push $stage dli9431/fallowborn:html5
```

For routine releases just run `notes\deploy.cmd` — it stages the allowlist and
pushes in one step (butler sends only the diff; the html5 channel keeps the
"played in browser" flag). Per release: bump `FB.VERSION`/`FB.CHANGELOG` in
`js\main.js` and post an itch devlog — the browse algorithm bumps
recently-updated projects.
