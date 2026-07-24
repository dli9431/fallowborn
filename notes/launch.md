# Launch copy & platform checklists

Fill-in-ready copy for every platform. Timing per strategy.md: itch + GitHub + Discord +
Ko-fi go live quietly now; Reddit + HN fire during video week alongside the YouTube launch.

## Launch status — 2026-07-21

Quiet launch is **live**. itch, GitHub, the website, Discord, and Ko-fi are all up, and the
day-one devlog is posted and cross-posted. Only video week remains (Reddit/HN + YouTube).

- **itch** — **LIVE (public).** Project public; launch build pushed via butler
  (`notes/deploy.cmd`); cover + 5 screenshots + description + tags + AI disclosure
  (Code + Text&Dialog) + embed/Frame options all set. Day-one devlog posted.
  **Next:** push the current v1.14.3 build, then post the day-two devlog
  (draft in `notes/devlog-v1.14.md`).
- **GitHub** — **LIVE (public).** README itch link live, CONTRIBUTING says PRs disabled,
  PRs OFF / Issues ON, About + Topics + Website set, welcome issue pinned. (Going public was
  the gate for the itch flip so the page's GitHub links resolve.)
- **Website** — **LIVE.** play.fallowborn.com serving the game — a separate nginx/Cloudflare
  origin, not itch, so cache freshness is controlled there (origin/CF headers), not by the
  itch `?v=` stamp from `stamp.ps1`.
- **Discord** — **LIVE.** Server + channels + roles up per §Discord; day-one devlog
  cross-posted to #dev-log.
- **Ko-fi** — **LIVE.** Page + goal widget up per §Ko-fi; one-off tips only (memberships
  arrive with multiplayer).
- **YouTube** — TODO (video week, later). Channel + video 1 per notes/youtube.md.

Next beat: video week — Reddit/HN posts fire alongside the YouTube launch (copy in §Reddit /
§Hacker News). Stagger subs across the week; engage every comment in the first 2 hours.

## Core messaging (reuse everywhere, keep consistent)

**Canonical one-liner:**
> A free browser grand-strategy dynasty saga. Start as a serf in 867 AD and guide one
> family up the ladder — Serf → Freeholder → Gentry → Baron → Count → Duke → King →
> Emperor — across generations, while ~65 AI realms redraw the map around you.

**Tagline options (pick per platform, all house-voice):**
- "A grand strategy game about starting from the very bottom."
- "From mud to crown, one funeral at a time."
- "Start as a serf. Die as a serf, probably. Your grandchildren, though…"
- "Runs on anything with a browser — including a PC from 2015."

**Supporting hooks:** generational play (your character dies, the game continues);
below-nobility start (freeholders, gentry — a ladder CK doesn't have); designed against
click fatigue (focuses + automation, not micromanagement); fully moddable (world is data,
total conversions as JSON); free, tiny, runs from a file.

**Noun bank (verified in-game):** serfs, barley, mud, bark-bread, the levy, pestilence.

**Identity (decided):** no studio — "by one person" is the brand. Game-facing surfaces
are named **Fallowborn** (YouTube channel, itch project page, Discord, Ko-fi); community
voices are **personal** (Reddit, HN, comment replies, video narration). The itch
*account* is a personal/dev handle so the page reads "Fallowborn by <you>" and future
projects share the account.

**Rules:** say "inspired by Crusader Kings," never "clone." CK3 references only in the
comparison shape ("my PC can't run CK3, so I made my own") — never "free CK3" / "browser
CK3." No Paradox marks in any title, page name, or branding. Be matter-of-fact about AI
assistance when it comes up; one canonical sentence:
> Built openly with AI assistance, by one person, on a PC that can't run CK3.

## itch.io

- **Account username:** personal/dev handle, not "fallowborn" — it becomes the URL and
  the "by ___" byline (`yourhandle.itch.io/fallowborn` beats "Fallowborn by
  fallowborn"), and future projects live under the same account.
- **Title:** Fallowborn. **Project URL:** auto-generated from the title — keep the
  clean `/fallowborn` slug.
- **Short description / tagline field:** "Guide one family from serf to emperor across
  generations, while 65 realms redraw medieval Europe around you. Free, in your browser,
  runs on anything."
- **New project form:** Classification *Games* · Kind of project *HTML5* · Genre
  *Strategy* · Release status *In development*. New projects start private (draft) —
  which matches the quiet launch: set everything up and test the embed while private,
  then flip visibility to Public.
- **Pricing:** "$0 or donate" — browser-playable HTML5 games are donation-only on itch
  anyway (no paid gating), which suits the plan. Ko-fi is the main tip jar, but don't
  refuse itch tips.
- **Tags (max 10; most-searched first):** grand-strategy, medieval, strategy,
  singleplayer, moddable, procedural-generation, dynasty, management, browser, 2d
- **Description body:** canonical one-liner → "How it plays" (3–4 bullets: daily ticks
  and seasons, focuses/deeds instead of click-spam, marriage/succession, the feudal
  ladder in both directions) → "Seven starts, one ladder" → modding paragraph (JSON
  mods, MODDING.md link to GitHub) → hardware line ("tested on a 2015 PC; your phone is
  fine") → license line (source on GitHub, PolyForm NC).
- **AI disclosure (required field):** answer Yes; tick **Code** and **Text & Dialog**;
  leave Graphics and Sound unticked (art is procedural canvas + emoji, no AI imagery).
  The page then automatically gets the "AI Generated" tag and matching sub-tags —
  expected, and consistent with the openness stance. Undisclosed AI content gets
  delisted from browse pages, so never fudge this.
- **Upload:** allowlist zip (notes/README.md) with `index.html` at the zip root, marked
  "This file will be played in the browser." Limits (all comfortably clear): 1,000
  files, 500 MB extracted, 200 MB per file, 240-char paths. itch serves gzip/brotli
  compression itself — upload plain files. Filenames are case-sensitive; paths must be
  relative (already true — the game runs from `file://`).
- **Embed options:** *Embed in page*, viewport 1280×720. **Fullscreen button** ON.
  **Mobile friendly** ON — forces fullscreen on mobile, which is exactly what the
  portrait layout wants; leave any orientation setting on default (the game plays both
  ways). **Click to play** stays ON (no autoplay). **Scrollbars** OFF (the game manages
  its own viewport). **SharedArrayBuffer support** OFF (zero-dep, not needed). Optional
  polish: background image behind the play button + gradient overlay to blend into the
  page theme.
- **Media:** cover image 630×500 (map + heraldry + title, no meme text — evergreen);
  3–5 screenshots (map zoomed out with realm colors; an event card with a bleak choice;
  family tree; mobile portrait layout); one short GIF (map timelapse) as first media.
- **Devlogs:** post a **teaser** per meaningful patch — a few lines (the headline change,
  in plain words) plus a "Full patch notes →" link to the canonical devlog on the domain.
  The full write-up lives on the website, never here: itch gets the browse-visibility bump,
  the domain gets the SEO. Teaser title still "v1.x — what changed, in plain words." Do not
  paste the full body onto itch — duplicate content lets itch outrank your own site.

## GitHub

- **Root README.md: DONE** — written for a developer audience (feature flexes, play
  links, doc/contributing/license links, AI-openness line). Two placeholders to fill
  before or right after the public push: the itch URL in the "Play it free" link, and
  the screenshot/GIF slot (`<!-- TODO -->` comment marks it).
- **Repo description (About field):** "Zero-dependency browser grand strategy: start as
  a serf in 867 AD, climb to emperor over generations. No build step, runs from
  file://."
- **Website field:** itch page now, own domain later.
- **Topics:** game, browser-game, grand-strategy, strategy-game, vanilla-javascript,
  zero-dependencies, html5-game, moddable, medieval, no-build
- **Settings:** Issues **ON**; Pull requests **OFF** — Settings → Features has a toggle
  that disables PRs (earlier notes said it couldn't be done; it can). This enforces the
  no-code-PR policy at the platform level, so nobody wastes effort on a patch that can't
  be merged; CONTRIBUTING.md explains why. Discussions optional (Discord covers it).
  Create the welcome issue (copy below) and **Pin** it.

**Pinned welcome issue — ready to paste** (title, then body; fill Discord/Ko-fi links):

Title: `Start here — bugs, balance, and ideas (all welcome)`

Body:

> Welcome, and thanks for playing Fallowborn. This issue is the front door — a quick read
> before you open a new one.
>
> **This repo is where the game gets better.** The loop is simple: you file it here, it
> gets read, and good ideas ship in patches (the live version updates first; itch gets
> stable rollups).
>
> **Open an issue for anything** — Bugs (include your **browser and device**; old hardware
> is a target, so "it chugs on my 2012 phone" is useful — say what you were doing) ·
> Balance (a rank too fast, a grind that drags, an event that overpays) · Quality-of-life
> (confusing UI, missing shortcut, a lying tooltip) · Writing (an event that reads wrong).
>
> **Vote before you post** — skim open issues; if yours exists, add a 👍 instead of a
> duplicate. Reactions are how I prioritize.
>
> **Not this repo:** code pull requests aren't accepted — a licensing constraint, not a
> snub (PRs are disabled; the why is in CONTRIBUTING.md). **Mods are the encouraged way**
> to build on the game — the whole world is JSON, importable from the Mods menu; see
> docs/MODDING.md.
>
> Play free: https://dli9431.itch.io/fallowborn · Discord: &lt;invite&gt; · Ko-fi: &lt;link&gt;
>
> You own dirt. Let's make the dirt better.

## YouTube

- **Channel name:** Fallowborn (decided — game-named channels convert better for
  single-project devs, and every planned video is about this game; the *voice* stays
  first-person solo dev).
- **Channel description:** origin story in two sentences + canonical one-liner + links.
  > I had 1,800 hours in CK2 and a PC from 2015 that can't run CK3. So I made my own
  > grand strategy game. It's free, it runs in your browser, and you start as a serf.
- **Avatar/banner:** procedural heraldry from the game (portrait.js output) — on-brand,
  zero effort, distinctive at small size.
- **Video 1:** title/thumbnail/beats per youtube.md.
- **Description template (order matters — play link first):**
  1. "Play free in your browser:" itch link
  2. one-paragraph pitch (canonical one-liner)
  3. source code link (GitHub) · Discord invite · Ko-fi
  4. timestamps
  5. the AI-openness sentence
- **Video tags:** grand strategy, crusader kings, ck2, ck3, browser game, indie game,
  devlog, game development, strategy game, medieval game
- **Pinned comment:** the play link again + one dry line ("The barley is real.
  See for yourself — link above.").

## Discord

- **Server name:** Fallowborn. **Invite splash line:** "You start with nothing here,
  too."
- **Channels (minimum viable):** #announcements (locked), #general, #dev-log (locked,
  cross-post the devlog teaser + link to the full write-up on the domain), #bug-reports, #suggestions (Forum channel — 👍 reactions =
  votes, this is the public backlog per strategy.md), #mod-sharing, #dynasty-stories
  (player screenshots/tales — this channel feeds future video content).
- **Rules blurb:** short and dry — be decent, no piracy links, ASOIAF mod talk fine but
  files shared there are community works, spoilers-for-events untagged are fine (it's
  867, history happened).
- **Roles:** Serf (default, everyone starts at the bottom — on-theme and free flavor),
  Freeholder (active), Gentry (helpful regulars/modders). Promotion ladder as server
  culture; costs nothing, fits the game exactly.
- **Welcome message:** one-liner + links (play, issues, Ko-fi) + "file bugs in
  #bug-reports, ideas in #suggestions, grief in #dynasty-stories."

## Ko-fi

- **Page name:** Fallowborn. **Tagline:** "Keeping a free grand strategy game free."
- **About:** two sentences — solo dev, game is free and stays free, tips cover the
  domain and (later) the multiplayer server. Dry closer: "Barley accepted in principle,
  not in practice."
- **Goal widget:** set a small transparent goal ("$X/mo — covers domain + server").
  Transparent infrastructure goals out-earn vague "support me" asks.
- **Memberships:** OFF for now — monthly tiers arrive with multiplayer per strategy.md.
  One-off tips only at launch.

## Own domain (LIVE — play.fallowborn.com)

- **Page title:** "Fallowborn — free browser grand strategy"
- **Meta description:** the canonical one-liner, trimmed to ~155 chars: "Free browser
  grand strategy: start as a serf in 867 AD, guide one family to a crown across
  generations while 65 realms redraw the map."
- **OG/social card image:** map + title art (same as itch cover — NOT the meme
  thumbnail; link previews should look evergreen).
- **Devlogs (canonical home — the SEO play):** the **full** patch write-ups live here as a
  simple blog, one page per version with a clean, keyword-bearing URL (e.g.
  `fallowborn.com/devlog/v1-14-wars-now-march-on-the-map.html`). This is the SEO surface —
  long-form, on your own domain,
  not diluted across itch. Each post: full notes + a screenshot/GIF + play/issues/Discord
  links. itch and Discord carry only teasers that link here, and each post sets
  `rel=canonical` to itself. Keep a `/devlog` index so posts interlink (helps SEO and lets
  players catch up). **TODO:** stand up the `/devlog` section on the site.
- **Footer:** links to itch, GitHub, Discord, Ko-fi + "bleeding-edge version — the
  stable build lives on itch."

## Reddit (video week only)

- **r/WebGames:** title "Fallowborn — free grand-strategy in your browser: start as a
  serf in 867 AD, climb to emperor over generations." Body: 2–3 sentences + link +
  one screenshot. No video link push (sub culture prefers the game itself).
- **r/playmygame:** same title with [Free] [Browser] [Strategy] tags per sub format;
  body can include the video.
- **r/IndieGaming:** lead with the GIF (map timelapse), title "I made a grand strategy
  game where you start as a serf — free, in the browser."
- **r/CrusaderKings:** READ CURRENT SELF-PROMO RULES FIRST. If allowed, the origin
  angle: "My PC can't run CK3, so I spent [X] months building my own — you start below
  the nobility." Expect the Roads to Power comment; answer with the tenant-farmer line
  from youtube.md. If rules forbid it, skip — do not spam-adjacent it.
- General: post from the personal account that made the video, engage every comment in
  the first 2 hours, never post all subs the same hour (stagger across the week).

## Hacker News (video week)

- **Title:** "Show HN: Fallowborn – a zero-dependency grand strategy game that runs
  from file://"
- **URL:** the itch page (or domain once live) — the playable thing, not the video.
- **First comment (author context, post immediately):** the technical story HN wants —
  vanilla ES5, no build step, ~460-county map rasterized from lon/lat seed points,
  seeded RNG so saves capture the world exactly, declarative event interpreter, the
  whole thing built to run on a 2015 i5. Origin story in one dry line ("my CPU is too
  old for Windows 11"). Be upfront about AI-assisted development — HN will ask; leading with it
  converts the thread from gotcha to discussion. Mention the PolyForm NC license and
  no-PRs policy before someone else does.

## Shorts / TikTok (repost stream, low effort)

- Cut once, post everywhere: map timelapse (15s, text overlay "867–1200 AD, no humans
  involved"), bleak event texts ("You eat mud to great applause."), death montages.
- Caption format: one dry line + "free in your browser — link in bio."
- Bio link: itch page. Do not build platform-specific content; these are byproducts of
  the main video.
