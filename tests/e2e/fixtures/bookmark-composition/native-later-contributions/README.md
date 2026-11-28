Later native contributions

The source compatibility oracles serve immutable predecessor copies of the data scripts. A change to a compared data file records each changed span, so the former and current catalogues differ only by unreviewed drift. Never edit the frozen copies under native-before-shared/ or 568-before-shared/.

File shape

Each .json file in this directory has this shape:

{"description": "What changed.", "changes": [{"file": "data/example.js", "before": "frozen text", "after": "current text"}]}

support/game/bookmark-sources-legacy.js builds one list: the entries of ../native-later-contributions.json first, then the entries of every .json file here in filename order. Entries for one file apply in list order, each to the body left by the entries before it. A directory without .json files adds nothing.

Exactly-once rule

before must occur exactly once in the frozen body and after must occur exactly once in the current game file. The oracle then replaces before with after. A missing or repeated match fails the spec.

The data scripts in 568-before-shared/ also have copies in native-before-shared/. support/game/bookmark-composition-legacy.js layers the native copies first and then serves the 568 copies over them. Both receive the same list, so before must occur exactly once in each copy.

Entries apply only to files listed in native-before-shared/sources.json. Files whose names contain _634 are not compared this way, and their entries are ignored. data/story_instances.js is served again from its frozen copy, so an entry for it is checked but does not change what the browser receives.

Naming and ownership

Use one file per card, named after the card id. A card may split its entries by file with a suffix, for example CARD-476.json and CARD-711.json. Use one entry per declaration block when the block is byte-identical in the frozen copy, and otherwise one entry per line.

Overlapping entries

When a later edit falls inside a span that an earlier entry already covers, the later change takes the entry over. It removes the entry from the earlier file, which may be the shared list, and writes one combined entry in its own file, with the frozen text as before and the current text as after.
