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
