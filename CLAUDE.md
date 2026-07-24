# CLAUDE.md

All repository guidance lives in [AGENTS.md](AGENTS.md) — read and follow it.

**Critical, easy to forget:** bump `FB.VERSION` at the top of `js/main.js` on **every update**.
It is the cache-bust key for both itch and play.fallowborn.com (which serves assets `immutable`,
keyed on it) — skip it and returning players get stale JS/CSS. Full context in AGENTS.md.

**Also easy to forget:** any player-facing text you add or change must go through the i18n
layer from the start — `FB.T`/`FB.TC` for UI, `{token}`-placeholdered display fields for
event/data, `FB.news(state, FB.msg('news.*', 'English', params))` for durable messages. Then
regenerate the catalogs **once, when the change lands on `main`** (`python
tools/i18n_catalog.py extract` → `translate fr de it es` → `validate`). `data/lang_*.js` and
`tools/i18n_manifest.json` are generated integration artifacts: regenerating them on a
short-lived branch just guarantees a merge conflict that has to be regenerated away again, so
defer it to the merge. Never hand-merge those files; never bake rendered prose into saved state
or mutate `FBDATA` display fields. See the **Internationalization (i18n)** section of AGENTS.md
and `docs/designs/i18n.md`.

@AGENTS.md
