Native source compatibility fixture

The 137 JavaScript files listed in sources.json are immutable public data sources copied from game commit 7b557cd0 before the complete native authoring barrier conversion. Basenames are unique. Keep these files unchanged when editing current sources.

support/game/bookmark-sources-legacy.js serves the pinned text at each original data URL inside a separate owner-run browser context. Its test-only passthrough adapter disables the new barrier. No fixture imports or executes game scripts in Node. The existing older 568/634 oracles layer their own pinned sources over this snapshot.

bookmark-composition-native.spec.js uses this former complete catalogue as the fingerprint, ordering and spent-resource save oracle. These fixtures live outside the shipped js/data roots and must remain excluded from game packages.
