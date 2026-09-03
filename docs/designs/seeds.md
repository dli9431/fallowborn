# Shareable start seeds

A start can be reproduced exactly because everything random about it flows from one
seeded stream. `FB.activateBookmark` is deterministic from its static world definition
(no RNG), and `FB.generateWorld` remains its default-867 compatibility wrapper, so the
map needs no seed. What a seed must pin down is everything drawn in `G.start()`
(`js/main.js`): `FB.initPolitics` (realm rulers, generated dukes/counts) and the player
character, parents, and siblings (`FB.makeCharacter`).

**Mechanism:** `G.start()` (and `G.startObserve()`) calls
`FB.seedRng(FB.hashSeed(seedString))` as its first step. Because the RNG is re-seeded at
that moment, pre-game draws that sit on the boot stream (Random Province, name
suggestions, name rerolls) cannot desync two players — identical seed + identical picks =
identical start, every time, and a second run in the same browser session reproduces the
first.

The starting-date screen's six **Quick Start** cards use the fresh world seed already rolled
for that New Game attempt, then supply an authored Serf scenario, bookmark, exact settlement-site
birthplace, culture/faith community, sex, name, and `standard` family preset. The cards name both
the home settlement and its county. They still run
through `G.start()` and store its ordinary full start code. A quick life can therefore be shared
and replayed like any manually assembled life; Quick Start fixes the choices, not the world seed.

## Formats

- **World seed** — any text normalized to `A-Z0-9` (`FB.hashSeed` in `js/util.js` hashes
  it to a uint32). Same political world; scenario/province/name stay the player's own
  picks. Fresh starts get a random 7-char base36 one.
- **Start code** — `SEED-BOOKMARK-SCENARIO-PROVINCE-SEX-NAME[-FAMILYPRESET[-SETTLEMENT[-CULTURE.RELIGION]]]`
  (for example,
  `K7F29QZ-1066-serf-kent-m-aelfric`). Names encode spaces as `_` and drop dashes so
  the six-part split stays unambiguous. The optional seventh part names a
  starting-family preset (`FBDATA.familyPresets` in `data/starts.js` — see
  [characters.md](characters.md)); it is omitted for the `standard` preset, so a
  pre-presets six-part code still spells — and reproduces — the exact same start.
  The optional eighth part is the birthplace settlement slot chosen on the pick
  screen (see [provinces.md](provinces.md)); it always spells the preset part
  before it (`standard` when the family start is standard), and a start at the
  county seat (slot 0, the default) adds no parts at all.
  A non-principal county community adds a ninth `CULTURE.RELIGION` part. It
  always spells both preceding optional positions, using `standard` and `0`
  when the family preset and county seat are otherwise defaults. Principal
  community starts retain their existing five- through eight-part spelling. For
  example, a Norse Catholic family at Iona's county seat may spell
  `K7F29QZ-1066-serf-iona-m-olaf-standard-0-norse.catholic`.
  This
  is what `state.seed` stores (built in `G.start` from the picks actually taken, name
  edits included) and what the ☰ menu shows; pasting one through **Use a Seed or
  Start Code** on the starting-date screen lands on a pre-filled character screen.

Parsing (`parseSeedInput` in `js/main.js`): a six-, seven-, eight-, or nine-part shape
must fully
validate (known bookmark, scenario, settled province in that bookmark, `m`/`f`,
1–20-char name, for seven or more parts a known family-preset id, and for eight or
more parts an all-digits settlement slot). A ninth part must be one exact culture/faith pair
authored in that bookmark county's `communities` list; a fallback-only county or an
unknown pair is rejected. Any invalid code is rejected
with an inline error—a mistyped code must never silently
become a different world. A parsed settlement slot is *clamped* to the county's
visible settlements once the bookmark is active (`clampSettlementIdx`), so an
oversized but well-formed slot bends to the county seat's neighbors rather than
erroring. The old five-part format is still accepted and explicitly
means bookmark 867. Anything else is treated as a bare world seed and proceeds to
the bookmark picker.

Parsing a code does not override browser-profile starting-station progression. A valid code
whose scenario tier has not been earned remains in the seed dialog above the starting-date
screen with an exact locked station explanation. Once that station is unlocked, the same code
reaches its pre-filled character screen and retains its deterministic meaning. World seeds are
unaffected.

## Determinism across presets

A non-`standard` family preset changes the protagonist's birth year (a pure
parameter, no draw) and then draws its spouse and children on the shared stream in
a fixed order *after* the parents and siblings every start shares. The `standard`
preset performs no draw the historical start did not, so a six-part code's stream
is bit-for-bit what it always was, and the seventh part alone decides whether the
extra draws happen. The birthplace settlement slot and county-community identity
are likewise pure parameters: the slot steers state (the farmer's starting plot,
`player.homeSettlement`) while the community selects which culture's names are drawn.
The start is still re-seeded immediately beforehand. Identical seed + identical picks —
preset and community included — remains
an identical start.

Scenario and family definitions are data-driven and may be replaced or extended by the
active mod set. Baseline ids and scenario tiers are validated for old-code repair, while
`standard` retains its historical no-extra-draw shape. Exact scenario effects add no
selection draws; each named starting-item pool deliberately adds one seeded pick. Thus
unmodified baseline codes keep their established stream, while a modded code remains
deterministic under that exact mod fingerprint.

## Scoped sub-streams

One thing must *not* ride the shared stream: royal court generation. A court can be
built at world creation, at the moment a player first opens that realm, or during the
ensure chain on the load of an older save, and the same world must produce the same
people in all three cases. Determinism is a property of stored data, not of call order.

`FB.withSeed(scope, fn)` (`js/util.js`) saves the shared stream's state, re-seeds from
`FB.hashSeed(scope)`, runs `fn`, and restores what it found. Everything inside still
draws through `FB.rng` and friends, so the repository rule against `Math.random` in game
logic is untouched, and nothing a court draws perturbs a downstream world roll.

Court scopes are keyed on stored identifiers only - the **world seed** and bookmark, the
realm id, the ruler generation, and the member id. Nothing about call order, wall time,
or map-iteration position may enter that string. Note the world seed and not the whole
start code: `state.seed` also carries the scenario, province, sex, and name, and two
players sharing a world seed are promised the same political world whatever they then
pick. For the same reason a court character's id is *derived* from its succession member
(`FB.courtCharacterId`) rather than drawn from the sequential `FB.uid` counter, so eager
and on-demand materialization agree on one identity. The member id itself is also
derived from the realm, generation, role, and stable member ordinal or linked character;
it never embeds a sequential uid. A matching orphaned character record can be reclaimed,
but an unrelated derived-id collision is never replaced by an unscoped fallback.
Accession is itself an eager
materialization boundary: if a compact collateral beyond the displayed court inherits,
`FB.advanceRealmSuccession` creates that member's full character on the same scoped
stream before copying any ruler fields. Succession therefore has no shared-stream
fallback for Martial or ruler traits.

The initial Papal realm is a compatibility exception in bookkeeping only. It starts
directly with one elective root and creates no dynasty, but advances the discarded
legacy child-count and member-id slots that the earlier dynastic initializer consumed.
That keeps the fixed-seed non-court world aligned without letting those discarded values
define a Pope, consort, heir, or court scope.

## Caveats

Codes reproduce only on the same game version and mod set: any change to `FBDATA`
(realms, cultures, traits, balance) or to generation code shifts the draws. `state.seed`
rides along in saves automatically; saves from before 1.19.0 have no seed and the menu
simply hides the row.
