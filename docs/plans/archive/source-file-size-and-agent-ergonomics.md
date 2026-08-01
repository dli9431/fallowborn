# Plan: source file size and agent ergonomics

Date: 2026-07-31

Status: implemented (v1.104.2). The `ui.js` split landed as its own move-only release;
the banner/TOC mitigation is folded into the four new files rather than a separate pass.
Implementation notes against the original sketch: the generic modal engine and the mobile
back-navigation layer live in `ui_misc.js` (not `ui_modals.js`) because every file calls
them — placing them in the first-loaded file lets the other three bind them at load and
keeps call sites verbatim. Internal load order is `ui_misc → ui_panels → ui_topbar →
ui_modals`. Cross-file internals travel on `FB.ui._shared`: shared functions are exported
by their owning file, and five cross-file mutable variables (`travelPicker`, `activeTab`,
`logRenderedTail`, `logRenderedLen`, `portraitKey`) became `_shared` properties. The itch
allowlist ships the whole `js/` directory, so no deploy-script change was needed.

Related:
[UI](../designs/ui.md),
[deployment](../deployment.md),
[VERSIONS](../VERSIONS.md), and the repository [AGENTS.md](../../AGENTS.md) load-order
and workflow rules.

## The question

Several engine files run to thousands of lines — `js/portrait.js` at roughly 4k and
`js/ui.js` at roughly 20k. Should they be broken down, and do files this large waste
context and tokens when AI agents work on the repository?

## How agents actually pay for large files

File size on disk is not what costs tokens; **reads** are. An agent does not load a file
into context because it exists — it pays for what it greps and reads, and a well-run
session works in targeted slices of a few hundred lines around the code being edited.
The recent portrait v2 work edited a ~4k-line file that way without its total length
mattering, while `ui.js` entered context only as grep hits.

Where a large file does carry real cost:

- **Full reads.** Anything that forces reading a whole file (an audit, "summarize this
  file") costs roughly 10 tokens a line. A 4k-line file is ~40k tokens and readable in a
  few chunks. A 20k-line file is ~200k tokens and cannot be read whole in one context, so
  an agent working in it is always navigating partially blind — which shows up as extra
  exploratory greps and re-reads rather than one big read.
- **Edit anchoring.** Exact-match edits need unique anchor text. In a 20k-line file full
  of similar `renderX` blocks, anchors must be longer, and a mismatched anchor means a
  failed edit plus a re-read.
- **Noisy searches.** `grep refresh` in `ui.js` returns a wall of hits the agent then
  burns tokens disambiguating.

The flip side: heavy splitting has its own agent cost. Following one interaction across
ten small files means ten reads and more context switching than one scoped read in a
medium file. The optimum for agents is not "small files" — it is **greppable structure
plus an accurate map**, in files small enough to read fully when a task demands it
(roughly under 2-3k lines each).

## What splitting costs in this repository

This repo makes a file split a real integration event, not a tidy-up:

- **No bundler.** Every new file is another `<script>` tag in the fixed load order that
  AGENTS.md says not to reorder casually. `index.html` and the AGENTS.md architecture
  section must change together.
- **Fail-closed itch allowlist.** The itch publish ships only named files. A new `js/`
  file that is not added to the deploy scripts silently does not ship, and the game
  breaks only in the published build. Any split must update the allowlist in the same
  breath.
- **Cache-bust discipline.** A split that lands on `main` is a shipped-code change and
  bumps `FB.VERSION` like any other (see VERSIONS.md).
- **Review surface.** A move-only refactor of 20k lines is a huge diff. Mixing any
  behavior change into it would make the diff unreviewable, so the split must be purely
  mechanical.

## Decisions

| File | Decision |
| --- | --- |
| `js/portrait.js` (~4k) | **Leave it whole.** One cohesive pipeline (descriptor → scaffold → painter → caches) governed by one design doc; it navigates well by grep and reads fully in a few chunks. Splitting would trade cohesion for load-order coupling with no real gain. |
| `js/ui.js` (~20k) | **Split it, as its own deliberate move-only refactor.** It is past the comfortable ceiling and has natural seams. Until that refactor is scheduled, apply the banner/TOC mitigation below. |
| All engine files | Add grep-able section banners and keep the "where things live" maps honest — this captures most of the agent benefit at almost no cost. |

## The cheap mitigation (do first, any time)

A docs-and-comments pass over `js/ui.js` (and any other file above ~3k lines):

1. Add section banner comments at each seam, in one fixed format so they are trivially
   greppable: `/* ===== Kin panel ===== */`.
2. Add a short table-of-contents comment at the top of the file listing the banners in
   order.
3. Verify the "where things live" entries in AGENTS.md and
   [docs/designs/ui.md](../designs/ui.md) still point at the right places.

Agents then jump straight to the right region instead of excavating, which is where most
of the wasted tokens actually go. A comments-only change ships no behavior, but it still
lands on `main` as a shipped-file change and takes a PATCH version at integration.

## The `ui.js` split (when scheduled)

Split along the seams the file already has, each new file still an IIFE augmenting
`FB.ui`, loaded consecutively exactly where `ui.js` loads today:

| New file | Contents |
| --- | --- |
| `js/ui_topbar.js` | Persistent top bar, ticker, speed and date controls |
| `js/ui_panels.js` | The four retained panels: Self, Kin, Network, Land |
| `js/ui_modals.js` | Event choice modals, dialogs, modal history |
| `js/ui_misc.js` | Toasts, tooltips, shared helpers, boot wiring |

Rules for the refactor:

1. **Move-only.** No behavior edits, no renames beyond what the move forces. Function
   bodies transfer verbatim; the diff should be reviewable as pure relocation.
2. Keep one namespace. Everything stays on `FB.ui`; module-local state that crosses a
   new file boundary is either kept in the file that owns it or promoted deliberately —
   and each promotion is called out in the commit message.
3. Update, in the same commit: `index.html` script tags, the AGENTS.md architecture list,
   the itch allowlist in the deploy scripts, and the map in `docs/designs/ui.md`.
4. Tests: the existing Playwright suite is the behavior gate; a move-only split should
   require no test edits, and needing one is a sign the split was not move-only. Per
   repository policy the owner runs the suite; the implementation agent does not.
5. Integrate as its own `FB.VERSION` bump (PATCH — no player-visible feature) with
   nothing else in the release, so a regression bisects to the move instantly.

## Non-goals

- No bundler, build step, or ES modules. The zero-dependency `file://` contract stands.
- No splitting of `portrait.js`, `world.js`, or other cohesive systems that sit under
  the size ceiling.
- No API reshaping, dead-code removal, or cleanup riding along with the move.

## Completion checklist

- [x] Banner/TOC pass — folded into the four split files (each carries a contents
  comment; the original section banners moved with their code).
- [x] AGENTS.md and `docs/designs/ui.md` maps verified against the banners.
- [x] `ui.js` split into the four files, move-only, one commit.
- [x] `index.html` load order, AGENTS.md, and design docs updated in that same commit
  (the deploy scripts ship `js/` wholesale, so the allowlist needed no change).
- [ ] Owner-run test suite and manual smoke pass on `file://`, served origin, and the
  itch build (allowlist!).
- [x] Own `FB.VERSION` bump with an empty release around it (v1.104.2).
