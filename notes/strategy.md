# Strategy

Working notes on traction, monetization, licensing, and sequencing.

> **Private planning doc.** Lives in `notes/`, which is kept out of git via
> `.git/info/exclude` (not .gitignore, so the public repo doesn't advertise it) and out
> of itch uploads via the allowlist zip. Re-add `notes/` to `.git/info/exclude` after
> any re-init — the exclusion lives inside `.git` and dies with it.

## Funnel shape

- **itch.io** — free, stable releases. Doubles as discovery: itch's browse algorithm bumps
  recently-updated projects, so every stable push + devlog post is a free visibility event.
  Don't let it go too stale chasing upload convenience. Devlogs here are **teasers** that
  link to the full write-up on the domain (see below) — the bump without the SEO cannibalism.
- **Own domain** — bleeding-edge version, always current (server already exists; only new
  cost is the domain). Also the canonical home of **full devlogs** (the SEO play): itch and
  Discord carry only teasers linking here, each canonical post on our own domain. Later:
  home of the online layer.
- **Steam (later)** — one-time purchase for the single-player game. Requires AI-use
  disclosure at submission (consistent with the openness stance anyway).
- **Membership (~$5/mo)** — sells the **online layer only**: multiplayer, persistent
  seasonal worlds, cloud saves, server-side features. NOT ad removal — the free zip is
  ad-free by nature and the audience is the highest ad-blocker demographic on the
  internet. Free = full single-player everywhere, forever; paid = the parts that
  physically live on the server and can't be copied out of a zip.
- **Ads on the domain** — deprioritized/skip: negligible revenue at small scale, cheapens
  the page, undermines the membership story.
- **YouTube** — the discovery engine. See notes/youtube.md.
- **Discord** — community home + feedback intake (below).
- **Ko-fi from day one** (zero-pressure tipping, looks fine empty). **Patreon later**,
  once the Discord is alive and there's a monthly devlog cadence to justify tiers — a
  Patreon with three patrons signals worse than no Patreon.

## Feedback intake (the "public backlog" loop)

Free Trello does NOT support the imagined loop: public boards are view-only for
non-members, edits require board membership, and free workspaces cap at 10
collaborators. Instead:

- **Discord forum channel** ("suggestions") with emoji reactions as votes — lowest
  friction, probably sufficient for the first six months.
- **GitHub Issues on the public repo** — free, unlimited, labels/reactions for voting;
  becomes the canonical backlog once the repo is public. (Works even for closed-source
  projects via a feedback-only repo, but we're going public anyway.)
- **Fider** (open-source feedback/voting board), self-hosted on the existing server, if a
  proper public roadmap site is wanted later.
- Trello can remain a private working board; it's just not the public intake.

The loop: players file balance/QoL issues → prompt + fix → domain version updates
immediately → periodic stable rollups to itch with teaser devlogs (full notes on the domain).

## Social channels

- **Core: YouTube** long-form + Shorts. Cut vertical clips once (map timelapse, bleak
  event texts), post identically to Shorts and TikTok. Skip Instagram.
- **Reddit** — r/WebGames, r/playmygame, r/IndieGaming. r/CrusaderKings only within its
  self-promo rules ("built this because my PC can't run CK3" is exactly the post that
  sub upvotes when allowed).
- **Hacker News** — "Show HN: a zero-dependency grand-strategy game that runs from
  file://, built because my 2011 PC can't run CK3" is aggressively HN-shaped. One good
  Show HN outperforms months of short-form posting.

## Licensing and repos

The client already ships as unminified readable ES5 with no build step — everyone with
the itch zip has the source in practice. No license = "all rights reserved" = legally
blocks the modding community the project is built for. So the question is *which
license*, not whether code is visible.

**Decision: open-core.**

- **Public**: client + data + `net.js` (when it exists) under a source-available license
  (e.g., PolyForm Noncommercial): readable, moddable, forkable for personal use — no
  commercial rehosting (protects against ad-clone mirrors and competing paid servers).
- **Private**: `server/` — rooms, accounts, payments, seasonal infra. The moat is the
  official persistent worlds, the community, and being the canonical up-to-date version.
- This is compatible with the long-term seasonal plan: official seasons are the product;
  community-run private friend-servers can eventually exist without threatening it.
- **Dual licensing is why Steam works**: the NC license binds recipients, not the owner —
  as sole copyright holder you sell on Steam under your own terms (Aseprite model).
  This REQUIRES staying sole owner: merged community PRs would inject contributor-owned
  code you can't sell. Policy: no code PRs (issues/suggestions only — matches the
  feedback loop anyway); if that ever changes, require a CLA before merging. State it
  in a CONTRIBUTING.md before the repo goes public.

**Repo sequencing** (reconciled with notes/multiplayer.md §4, which argues for
one repo so the sim stays byte-identical everywhere):

1. **Now**: make the current repo public as-is. Do NOT wait for migration steps 1–2 —
   they're pure refactors with "SP unchanged," contain no secret sauce, and doing them
   in public is devlog content + commit-activity signal. Waiting couples launch traction
   to refactor completion for zero secrecy gain (the zip already ships the source).
2. **At migration step 3** (when `server/` first exists): create a separate **private
   server repo** containing only `server/` (server.js, loader.js, and later
   accounts/matchmaking). It consumes the public repo (checkout/submodule) — the sim
   and data live *only* in the public repo, preserving the single-source-of-truth that
   §4 actually cares about. The monetized server growing accounts/payments/infra is
   precisely §4's stated "revisit" condition. Record the split in multiplayer.md §4
   when it happens.

**Before flipping public:**

- Add the LICENSE file (blocks nothing to decide now — source-available can be relaxed
  later; the reverse is much harder).
- Planning docs live in notes/ (excluded via .git/info/exclude; re-add after re-init).
- Skim git history once for anything unintended before making it public.
- **DONE — ASOIAF mod unbundled** (was GRRM/HBO IP shipping inside the game: real
  exposure once monetized, and "bundled by the developer" reads as first-party content).
  Now at notes/mods/ (westeros.js + its README); index.html script tag removed; docs
  scrubbed of Westeros mentions. Keep it out of the public repo and itch zip
  permanently; distribute later as a free community conversion via the runtime JSON
  import (importable JSON = the `data` object inside westeros.js).
- The multiplayer design doc also lives privately at notes/multiplayer.md (roadmap
  stays quiet until announced); AGENTS.md no longer references it.

## Launch sequence

1. LICENSE added; private planning docs pruned; repo flipped public; GitHub Issues on.
   — **IN PROGRESS (2026-07-21):** LICENSE + CONTRIBUTING done, git history scanned clean
   (no notes/ or westeros ever committed), README itch link live, v1.7.0. Repo updated but
   still **PRIVATE**. At the flip: make public, **PRs OFF / Issues ON**, About + Topics +
   Website, create & pin the welcome issue, add README hero image.
2. Upload stable v1 to itch (allowlist zip per notes/README.md, mobile-friendly enabled).
   — **DONE, in Draft:** v1.7.0 pushed via butler (notes/deploy.cmd); cover + 5 screenshots
   + description + tags + AI disclosure + embed set. Flip to Public *after* the repo, so the
   page's GitHub links resolve. (Actual order ran build-to-itch-first, repo-public-next —
   fine; the only hard rule is repo public before itch public.)
3. Discord server + Ko-fi + suggestions forum channel. — **TODO.**
4. YouTube video 1 (notes/youtube.md) while early players file balance/QoL issues.
   — **TODO (video week).**
5. Patch loop: fix from issues → domain always latest → periodic itch stable + teaser
   devlog (full write-up on the domain, canonical for SEO).
6. Patreon once cadence is established.
7. Multiplayer migration steps 1–3 (notes/multiplayer.md §6); private friend
   rooms first (2–8 co-op dynasties per §7).
8. Steam release + seasonal persistent worlds after multiplayer is proven with private
   games. itch settles into the demo-funnel role; Steam/domain carry the full game.

## Multiplayer phasing note

Private games (friends, 2–8) come long before the 1000+ player seasonal world — the
seasonal concept (everyone in one world, spawning across tiers from emperor to serf) is
a flagship event to build toward once the server layer, accounts, and moderation
tooling exist, not a launch feature.
