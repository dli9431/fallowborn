# Versions

Fallowborn uses [Semantic Versioning](https://semver.org): `MAJOR.MINOR.PATCH`.

- **MAJOR** — incompatible changes: saves stop loading, data schemas break,
  total overhauls.
- **MINOR** — new features and content, backwards compatible.
- **PATCH** — bug fixes only, no new behavior.

The current version lives in `FB.VERSION` at the top of `js/main.js`. It is
shown on the title screen. The changelog lives next to it in `FB.CHANGELOG`
and opens as a modal from the title screen.

## Changelog rules

Terse. No nonsense.

- Newest version first.
- One line per change. Plain English.
- Say what changed, not why. No "improved", "enhanced", "various", "misc".
- No contributor names, no ticket numbers, no marketing.
- Every player-facing change bumps the version and adds lines. Invisible
  refactors need no line, but still bump PATCH when shipped code changes.

Entry format in `FB.CHANGELOG`:

```js
{ v: '1.2.3', date: 'YYYY-MM-DD', changes: [
  'First change.',
  'Second change.'
] }
```

## Assigning the version (at integration)

The version and its changelog entry are assigned **when a change lands on `main`**, not on the
branch that makes the change:

- **Working directly on `main`** (the default) — bump `FB.VERSION` and add the `FB.CHANGELOG`
  entry in the same commit. That commit *is* the integration.
- **On a feature branch or worktree you will merge** — do **not** touch `FB.VERSION` or
  `FB.CHANGELOG`. Put the player-facing changelog line in the commit/merge description; at the
  merge, the integrator picks the next free version and adds the entry.

Why: branches developed in parallel each guess the same "next" version and each head-insert into
`FB.CHANGELOG`, so every branch collides with every other on the `js/main.js` top at merge — and
would ship a duplicated, wrong number. Deferring the number to the merge is the only way to hand
out a correct, unique version. Choose MAJOR/MINOR/PATCH by the rules above from the change being
landed. `FB.VERSION`/`FB.CHANGELOG` and the i18n catalogs are the repo's *integration-owned
artifacts* — see the **Git workflow** section of `AGENTS.md`.
