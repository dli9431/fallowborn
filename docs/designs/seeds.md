# Shareable start seeds

A start can be reproduced exactly because everything random about it flows from one
seeded stream. `FB.generateWorld` is deterministic from static `FBDATA` (no RNG), so the
map needs no seed. What a seed must pin down is everything drawn in `G.start()`
(`js/main.js`): `FB.initPolitics` (realm rulers, generated dukes/counts) and the player
character, parents, and siblings (`FB.makeCharacter`).

**Mechanism:** `G.start()` (and `G.startObserve()`) calls
`FB.seedRng(FB.hashSeed(seedString))` as its first step. Because the RNG is re-seeded at
that moment, pre-game draws that sit on the boot stream (Random Province, name
suggestions, name rerolls) cannot desync two players — identical seed + identical picks =
identical start, every time, and a second run in the same browser session reproduces the
first.

## Formats

- **World seed** — any text normalized to `A-Z0-9` (`FB.hashSeed` in `js/util.js` hashes
  it to a uint32). Same political world; scenario/province/name stay the player's own
  picks. Fresh starts get a random 7-char base36 one.
- **Start code** — `SEED-SCENARIO-PROVINCE-SEX-NAME` (e.g. `K7F29QZ-serf-kent-m-aelfric`).
  Names encode spaces as `_` and drop dashes so the 5-part split stays unambiguous. This
  is what `state.seed` stores (built in `G.start` from the picks actually taken, name
  edits included) and what the ☰ menu shows; pasting one into New Game lands on a
  pre-filled character screen.

Parsing (`parseSeedInput` in `js/main.js`): a 5-part shape must fully validate (known
scenario, settled province, `m`/`f`, 1–20-char name) or it is rejected with an inline
error — a mistyped code must never silently become a different world. Anything else is
treated as a bare world seed.

## Caveats

Codes reproduce only on the same game version and mod set: any change to `FBDATA`
(realms, cultures, traits, balance) or to generation code shifts the draws. `state.seed`
rides along in saves automatically; saves from before 1.19.0 have no seed and the menu
simply hides the row.
