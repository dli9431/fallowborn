# Fallowborn music files

The soundtrack is generated from the directory layout. Do not add tracks to a
hand-written JavaScript list.

```text
music/intro/000-fallowborn.opus
music/<faith>/<culture>/<role>/<NNN>-<song-slug>.opus
```

The initial broad selectors are `christian`, `pagan`, and `muslim`; `all` is a
wildcard. A selector may also be a religion or culture id from
`data/cultures.js`. Roles are `folk`, `war`, and `court`.

Examples:

```text
music/christian/all/folk/001-hammer-and-lute.opus
music/pagan/all/war/001-ravens-at-dawn.opus
music/pagan/all/court/001-elder-throne.opus
music/muslim/all/court/001-court-of-brass.opus
```

Use lowercase ASCII names and three-digit ordering. The order controls catalog
and itch-subset priority; playback is shuffled. Refresh the tracked catalog
after adding, replacing, or removing audio:

Commit the organized `.opus` files. They are shipped game assets and must be
available to the hosted and itch builds. Uncompressed and intermediate source
formats are gitignored and should remain outside the public repository after
conversion.

```text
python tools/music_catalog.py build
python tools/music_catalog.py check
```

Hosted releases regenerate or validate the same catalog. The itch release
selects a balanced subset capped at 200,000,000 bytes of gameplay music; its
intro is staged outside that budget.
