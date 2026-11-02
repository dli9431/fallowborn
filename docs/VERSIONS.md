# Versions

Fallowborn's version is `MAJOR.MINOR.PATCH` — SemVer-shaped, with the emphasis below.

- **MAJOR** (first number) — launch milestones and total overhauls. Rarely bumped;
  `1.x.x` is the current post-launch era.
- **MINOR** (middle number) — a genuinely new feature or a body of new content: something a
  player recognizes as *a new thing*. **Not** the default — do not raise it for adjustments
  to things that already exist.
- **PATCH** (last number) — **balance changes, tweaks, and bug fixes. This is the common
  case.** Any balance pass, number nudge, small content edit, or fix that does not introduce
  a genuinely new feature bumps the last number, not the middle one.

Rule of thumb: **most changes are a PATCH**; a minority are MINOR, and MAJOR almost never.
Torn between MINOR and PATCH? It is a PATCH. (Historically we leaned on MINOR far too
often — steer small and balance work to the last number.)

The current version lives in `FB.VERSION` at the top of `js/main.js`. It is
shown on the title screen. The changelog lives next to it in `FB.CHANGELOG`
and opens as a modal from the title screen.

## The save-format version is separate — and human-gated

`js/save.js` carries its own save-format version (`v:`, currently `3`) that is **not** the
displayed `FB.VERSION`. A save whose `v` does not match is rejected outright, so raising it
invalidates every existing life. **Never bump the save-format version as part of a routine
change — a save-format bump (e.g. `3` → `4`) always requires the owner's manual review
first.** The additive-migration discipline in
[designs/state-and-saves.md](designs/state-and-saves.md) exists precisely so new state can
land *without* touching `v`: keep new fields lazily initialized and the save version holds.

## Changelog rules

Terse. No nonsense.

- Newest version first.
- One line per change. Plain English.
- Say what changed, not why. No "improved", "enhanced", "various", "misc".
- No contributor names, no ticket numbers, no marketing.

Every player-facing change bumps the version and adds a line when first integrated. Promoting that recorded change from dev into main does not add another line. Invisible refactors need no line but still bump PATCH when they change shipped code (js/css/data/mods). A docs-only change needs no bump and no line because FB.VERSION is a cache-bust key for runtime assets.

Entry format in `FB.CHANGELOG`:

```js
{ v: '1.2.3', date: 'YYYY-MM-DD', changes: [
  'First change.',
  'Second change.'
] }
```

## Assigning the version (at integration)

Version assignment happens when a change lands directly on main or a branch is merged into main or dev. A changelog entry is added at that integration only for player-facing changes not already covered.

Working directly on main (the default): bump FB.VERSION and add any needed FB.CHANGELOG entry in the same commit. That commit is the integration, and its subject must include the assigned version.

On a feature branch or worktree that will merge into main or dev: do not touch FB.VERSION or FB.CHANGELOG. Put the player-facing changelog line in the commit/merge description; at the merge, the integrator picks the next free version, adds any needed entry, and includes the assigned version in the final merge/integration commit subject. Every branch merge into dev follows this rule.

Promoting dev into main: inspect the combined changelog and preserve each existing entry once, including entries first recorded on dev. Assign a fresh FB.VERSION above both branch tips for cache invalidation, normally a PATCH for a promotion alone, and use that exact version in the integration commit subject. Do not add another entry that repeats or paraphrases the imported messages, or merely says the features are now available in main. Only player-facing changes introduced during the merge and not already covered receive a new entry. If there are none, add no changelog entry for the promotion version, including no empty changes array or merge-only message. FB.VERSION may then be newer than the newest FB.CHANGELOG entry; that is intentional.

Example: if v1.189.16 already says agricultural and civic research expands family plots, settlement founding sites and directly governed settlements, preserve that entry when promoting dev into main. A v1.189.17 cache bump must not add a second message saying that research for larger family estates and more settlement capacity is now available in the main game.

Use this subject format for every integration commit that assigns `FB.VERSION`:

```text
vMAJOR.MINOR.PATCH: description
```

For example: `v1.57.1: Fix island province connections`. The subject's version must exactly match
the `FB.VERSION` value committed in `js/main.js`. Feature-branch commits are exempt because their
version is intentionally unknown until integration. Docs-only commits are also exempt because
they do not bump or assign `FB.VERSION`.

Why: branches developed in parallel each guess the same "next" version and each head-insert into
`FB.CHANGELOG`, so every branch collides with every other on the `js/main.js` top at merge — and
would ship a duplicated, wrong number. Deferring the number to the merge is the only way to hand
out a correct, unique version. Choose MAJOR/MINOR/PATCH by the rules above from the change being
landed — for most merges that is a PATCH. `FB.VERSION`/`FB.CHANGELOG` and the i18n catalogs are the repo's *integration-owned
artifacts* — see the **Git workflow** section of `AGENTS.md`.
