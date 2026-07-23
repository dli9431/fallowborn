# CLAUDE.md

All repository guidance lives in [AGENTS.md](AGENTS.md) — read and follow it.

**Critical, easy to forget:** bump `FB.VERSION` at the top of `js/main.js` on **every update**.
It is the cache-bust key for both itch and play.fallowborn.com (which serves assets `immutable`,
keyed on it) — skip it and returning players get stale JS/CSS. Full context in AGENTS.md.

@AGENTS.md
