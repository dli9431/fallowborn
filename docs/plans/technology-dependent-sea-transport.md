# Plan: technology-dependent sea transport for field armies

Date: 2026-07-30

Status: **implemented**. Field hosts remain single army objects, while water crossings
use technology-dependent transport throughput and crossing time. The implementation and
deterministic browser coverage were authored together; execution remains owner-controlled
under repository policy.

Related design:
[war](../designs/war.md),
[technology](../designs/tech.md),
[provinces](../designs/provinces.md),
[state and saves](../designs/state-and-saves.md),
[mods](../designs/mods.md), and
[UI](../designs/ui.md).
The crossing and technology data contracts must also be recorded in
[MODDING](../MODDING.md).

Audit baseline: Fallowborn v1.93.3.

## Goal

Make seas matter to warfare and give the existing seafaring technology branch a
clear military purpose without building a fleet simulation.

The finished slice should make a large host slow and difficult to move across a
substantial body of water when its sovereign has only local boats, while an
otherwise identical host belonging to a realm with shipbuilding, navigation,
harbors, and organized naval levies can cross in far fewer days. Land movement
must continue to depend on roads, logistics, and other overland technologies
rather than sails and rudders.

This is a naval-logistics abstraction, not a hidden fleet system. It should be
small enough to ship as an army-and-technology feature while leaving an
authoritative seam through which real fleets could provide transport capacity in
a later design.

## Why this is the recommended first naval slice

The current army model has one indivisible field host per sovereign. A literal
hard troop cap would therefore create bad states:

- a 2,000-man host could be denied a 500-man crossing without any way to detach
  500 men;
- an island realm could raise a host too large to leave its own island;
- AI hosts could repeatedly order an impossible route or remain stranded;
- leaving excess troops behind would require additional army objects,
  reinforcement ownership, reunion rules, UI, and save state.

Instead, treat capacity as **men transported per crossing cycle**. A host larger
than the available capacity takes multiple cycles to embark and cross:

```text
crossing cycles = ceil(host men / effective sea-transport capacity)
crossing days   = crossing cycles × technology-adjusted cycle days
```

The host remains one object and stays on its departure county until the final
cycle completes, exactly as it already stays on a county until an ordinary march
leg completes. This produces the strategic constraint requested by the feedback
without army splitting, fleets, ships, or at-sea combat.

The first release should not make any core crossing absolutely impossible for
lack of technology. Very low throughput can make an early open-sea movement
prohibitively slow while preserving reachability, old saves, AI recovery, and
island play. A later fleet design may introduce blockades or hard embarkation
requirements once the player has tools to solve them.

## Current architecture and the gap

### Water crossings are ordinary adjacency

`FBDATA.straits` is currently an array of two-county pairs. World validation
requires exactly that shape. During map construction each pair is inserted into
`FB.world.adj` in both directions. Once inserted, no runtime metadata
distinguishes:

- a shared land border;
- a narrow ferry or strait;
- a coastal passage;
- a long open-water link.

Travel, political adjacency, and armies may all consume the shared adjacency
graph. This plan must not change the meaning of those other systems merely to
price army transport.

### Army routing minimizes province count

`FB.findPath(fromPid, toPid)` performs an unweighted breadth-first search over
`FB.world.adj`. Every edge counts as one leg. `FB.orderArmy` stores the returned
province-id path, and every leg receives the same
`FB.armyMarchDays(state, realmId)` clock.

A channel crossing and an overland county therefore have the same routing cost.
Adding a slower water clock without changing routing would still let BFS choose a
one-edge, forty-day sea crossing over a three-edge, eighteen-day land route.

### Seafaring movement currently accelerates land hosts

Several seafaring technologies use the generic `fx.movement` scalar.
`FB.techArmyMarchDays` applies the combined movement bonus to every army leg.
Square sails, longships, rudders, celestial navigation, and compasses can
therefore accelerate an army marching wholly overland.

The technology engine already has the correct sovereign scope: vassals use their
top sovereign's completed knowledge, and both player and AI hosts identify a
realm. The new mechanic should reuse that scope rather than create dynasty-owned
ships or a second research record.

## Design rules

### Capacity is throughput, not a second troop pool

- A host's complete `men` total, including levies, professionals,
  mercenaries, and allied reinforcement, consumes capacity.
- The crossing does not remove, duplicate, reserve, or split units.
- No ships, sailors, embarked army records, or detached remainders enter saved
  state.
- Casualty order and composition remain unchanged.
- A host may be ordered to halt while its crossing clock is active under the
  existing halt rule; canceling movement does not lose troops.

### Water affects only water legs

- Ordinary land edges retain the existing technology-adjusted march duration.
- Seafaring transport capacity and sea-crossing speed apply only when the next
  edge is an authored water crossing.
- Personal overland travel continues to use its current settled-county route and
  transport-standard rules. Army sea capacity does not accelerate pilgrims,
  couriers, or trade ventures in this slice.
- Political adjacency, war causes, technology diffusion, and border logic keep
  using ordinary adjacency unless separately redesigned.

### One rule serves player and AI hosts

Manual orders, host automation, AI goals, prey hunting, routs, ordinary wars, and
sovereign great-holy-war hosts must all call the same path-cost and leg-duration
helpers. There must be no player-only embarkation check or AI shortcut.

### Routing is deterministic

Weighted path selection must consume no RNG. Equal-cost paths use stable
tie-breakers: total days, then leg count, then stable province id or authored
province order. Repeated calls against the same state and host must return the
same route.

### Existing movement is honored mid-leg

An already-started leg has a saved `moveLeft` clock. Loading an old or current
save must not recalculate that clock. New logic applies when the next leg begins.
Technology completing, allegiance changing, or host size changing after a leg
starts does not rewrite its remaining duration; the following leg uses the new
facts.

## Data model

### Preserve `FBDATA.straits`

Keep the public and modded pair format:

```js
FBDATA.straits = [
  ['messina', 'reggio'],
  ['palermo', 'tunis']
];
```

Do not add a third tuple element or replace pairs with objects. Existing
validation, bookmark snapshots, and mods depend on exact two-element arrays.

### Add optional crossing classifications

Add an optional world field keyed by canonical county pair:

```js
FBDATA.crossingClasses = {
  'messina|reggio': 'narrow',
  'palermo|tunis': 'open'
};
```

Canonical keys put the lexicographically earlier county id first. Supported
values in the first release are:

- `narrow` — ferries and short straits;
- `coastal` — meaningful coastal passages;
- `open` — the longest authored sea links.

Every key must name an existing `straits` pair. Unknown counties, reversed or
noncanonical keys, duplicate semantic pairs, and unknown classes fail world
validation. An unclassified core or modded strait defaults to `narrow`, which is
the least disruptive compatibility behavior.

Add `crossingClasses` to:

- the validated world/bookmark fields;
- bookmark copy and activation paths;
- the legacy world-mod merge surface;
- the documentation for runtime and bundled mods.

Mods may continue to add only a `straits` pair. A mod supplies
`crossingClasses` only when it wants a stricter class. Object merging should use
the canonical pair as the stable key.

### Compile an army-specific water-edge lookup

World construction should produce a symmetric lookup separate from
`FB.world.adj`:

```js
FB.world.waterAdj[fromPid][toPid] = 'narrow|coastal|open';
```

`FB.world.adj` remains authoritative for reachability. `waterAdj` answers only
whether an already-valid edge is a water crossing and which crossing balance
record applies.

Expose a small read-only helper such as:

```js
FB.waterCrossing(fromPid, toPid)
```

It returns the class string or `null`. All army, route-preview, and UI code uses
that helper rather than rebuilding canonical string keys.

### Crossing balance

Keep crossing tuning in `FBDATA.balance`, not in army code. Proposed initial
shape:

```js
FBDATA.balance.armySeaTransportBase = 250;
FBDATA.balance.armySeaCrossings = {
  narrow:  { cycleDays: 2, capacityMult: 2.00 },
  coastal: { cycleDays: 4, capacityMult: 1.00 },
  open:    { cycleDays: 7, capacityMult: 0.75 }
};
```

These numbers are an initial balance target, not historical ship counts. Their
purpose is to create three legible strategic bands:

- local boats can move a small force through a narrow crossing;
- a large unprepared host can still cross, but loses substantial campaign time;
- organized naval technology turns mass movement from an ordeal into a normal
  operation.

Round effective capacity to at least one man before calculating cycles. Round
cycle days only after applying sea-speed technology, clamp them to at least one,
then multiply by cycles. Do not round a percentage once per cycle and accumulate
drift.

The implementation must expose the calculation as structured data, not only a
number, so UI and tests can display and verify:

```js
{
  water: true,
  crossingClass: 'open',
  hostMen: 2400,
  nationalCapacity: 1500,
  effectiveCapacity: 1125,
  cycles: 3,
  cycleDays: 6,
  totalDays: 18
}
```

Land legs return a matching record with `water:false`, `cycles:1`, and the
ordinary march duration.

## Technology model

### Add an absolute `fx.seaTransport` effect

Sea transport is an absolute capacity and must use the **largest completed
value**, not an additive scalar. Add:

```js
fx: { seaTransport: 1500 }
```

to the technology schema. Implement:

```js
FB.techSeaTransportCapacity(state, realmId)
```

as the maximum valid `fx.seaTransport` among the effective sovereign's completed
technologies, falling back to `balance.armySeaTransportBase`.

This max rule lets Nordic, Mediterranean, and other historical branches provide
alternative routes to similar capacity without rewarding a realm for researching
every shipbuilding tradition and stacking them into an implausible total.

Technology validation should require `seaTransport` to be a finite positive
integer. Technology details should display:

> Sea transport capacity: up to 1,500 men per crossing cycle.

AI technology scoring should treat a higher `seaTransport` effect as a concrete
unlock. The existing coastal-realm preference for the seafaring domain remains
useful; do not make landlocked realms chase naval capacity as aggressively as
coastal sovereigns.

### Add a water-only `fx.seaMovement` scalar

Add `seaMovement` to the validated scalar effects and
`FBDATA.techCaps`, proposed cap `0.40`. It reduces water crossing cycle time and
never changes land legs.

Technology details should label it as **sea-crossing speed**, while the existing
`movement` label should become **overland army movement speed**.

Audit every current seafaring technology that supplies generic `movement`.
Move sail, navigation, rudder, compass, and dock effects to `seaMovement` where
their military benefit is specifically maritime. Leave road, animal power,
fortified camp, and military logistics technologies on ordinary `movement`.

Do not mechanically convert every seafaring technology to the same effect.
Ship-carrying and organizational entries should improve capacity; navigation and
handling entries should improve cycle speed; economic entries may keep `trade`;
Harbor and Fishing Boat unlocks remain unchanged.

### Proposed capacity progression

Use the following as the initial authored targets:

| Completed knowledge | `seaTransport` target |
| --- | ---: |
| No capacity technology | 250 |
| Square Sails | 400 |
| Coastal Piloting | 500 |
| Harbor Works | 750 |
| Clinker Shipbuilding or Lateen Sail | 1,000 |
| Longships, Ocean-Going Knarrs, or Dhow Construction | 1,500 |
| Organized Naval Levies | 4,000 |
| Merchant Convoys | 8,000 |

Because the rule takes the maximum, equivalent hull traditions do not stack.
Prerequisites and regional adoption continue to determine how a realm reaches a
tier. Exact assignments should be reviewed against both 867 and 1066 bookmark
seeding so that major coastal powers begin with plausible differences without
making islands inert.

Later navigation entries such as Sailing Directions, the Mariner's Compass, and
Portolan Charts should primarily improve `seaMovement`, not raise the number of
available hulls by themselves.

## Army APIs

### Preserve the compatibility pathfinder

Keep:

```js
FB.findPath(fromPid, toPid)
```

as the unweighted adjacency compatibility surface. Travel and any mods that
expect a simple route should not silently acquire army-size and technology
requirements.

Add an army-specific weighted helper:

```js
FB.findArmyPath(state, army, toPid)
```

It returns either `null` or a structured route:

```js
{
  path: ['county_b', 'county_c'],
  totalDays: 12,
  waterLegs: 1
}
```

`FB.orderArmy` uses this helper and continues to save only the existing
province-id `army.path`, `goal`, `from`, and `moveLeft` fields. The route summary
is a preview result, not durable state.

### Add one authoritative leg calculation

Add:

```js
FB.armyLegQuote(state, army, fromPid, toPid)
```

This is the only place that combines:

- land march duration;
- crossing class;
- effective sovereign;
- host headcount;
- national sea capacity;
- crossing capacity multiplier;
- sea-crossing speed;
- campaign march-speed modifiers, if they are intended to apply at sea.

The existing great-holy-war campaign speed modifier needs an explicit rule.
Recommended: it represents campaign organization and may reduce both land and
water duration after the technology calculation, using the existing cap and
rounding behavior. If it remains land-only, the UI must say so. Do not let two
callers make different assumptions.

Both the first ordered leg and every subsequent leg call
`FB.armyLegQuote`. Replace direct calls that assign
`FB.armyMarchDays(state, army.realm)` to a leg clock.

### Use weighted routing

Use Dijkstra's algorithm or another deterministic positive-weight shortest-path
algorithm over the existing province graph. Edge cost is the quoted leg days for
the current host.

The graph is only about 500 provinces and only active hosts request paths, so a
simple zero-dependency implementation is sufficient. It must nevertheless avoid
sorting the full frontier unnecessarily inside the neighbor loop. Stable
tie-breaking is required so different browsers choose the same equal-cost route.

Route cost uses the host's headcount at order time. If casualties or
reinforcement later make the remaining saved path suboptimal, do not
automatically rewrite a manual route. AI hunting already repaths as its goal
moves; automation may repath only at the same boundaries it uses today. This
preserves manual-order authority.

### Retain the current province-based visual model

While a water clock runs:

- `army.at` remains the departure county;
- `army.from` and `army.path[0]` identify the active water leg;
- battle and reinforcement behavior continues to follow the county where the
  marker stands;
- arrival moves the complete host into the destination county;
- no marker is drawn in the sea.

Interpret the waiting time as gathering hulls, embarking successive contingents,
and completing the crossing. Do not add an at-sea vulnerability or blockade
simulation in this release.

## Player feedback and UI

### Order preview

When the player orders a selected host, the confirmation toast or immediate route
feedback should name:

- destination;
- estimated total days;
- number of water crossings;
- the limiting crossing capacity when water is present.

Example:

> The host marches on Tunis — about 24 days. The Palermo crossing carries 750
> men per cycle, requiring four crossings.

The route overlay should continue to use the existing path. A small water icon or
distinct route segment may mark water legs if it remains legible on desktop and
mobile; this is useful but not a prerequisite for the mechanic.

### Active movement status

Where the selected host or Land panel currently reports movement, distinguish:

- `Marching to {province} — {days} days`;
- `Embarking for {province} — {days} days`;
- `Crossing toward {province} — {days} days`.

The exact wording may use one water status rather than two if the engine cannot
truthfully distinguish loading from sailing. Do not imply an at-sea marker that
does not exist.

### Technology details

Technology sheets must show the concrete capacity and water-speed effects through
the existing authoritative effect summary. Rule metadata such as
`rule:naval_levies` remains insufficient because the technology UI intentionally
hides unconsumed rule tags.

All new strings use `FB.T`/data localization routes. Catalog generation remains
an integration step only when the owner asks to commit directly to `main` or
merge into it.

### Help

Update How to Play with one short explanation:

- armies use local boats at low throughput;
- water links take repeated cycles when the host exceeds capacity;
- national seafaring and naval-organization technologies raise capacity and
  speed;
- no separate fleet needs to be raised in this release.

Do not duplicate the numeric technology table in help text. Technology details
and the order preview are authoritative for current numbers.

## AI and automation

AI hosts and player automation require no special naval strategy in the first
slice, but they must use weighted routes:

- an AI host should prefer a faster land route over a slow direct sea link;
- an advanced maritime realm may prefer the sea link when its technology makes
  it faster;
- a broken host uses the same weighted route home;
- a hunting host uses the same current headcount and sovereign technology when
  repathing;
- a player automation stance never overrides a manually ordered water route;
- changing allegiance changes capacity for legs begun after the change.

The existing AI research preference for seafaring in coastal realms should be
reviewed with the new concrete capacity values. Only add more weighting if
coastal AI realms routinely ignore the capacity tier necessary for their
geography. Do not hard-code named realms or island bonuses.

## Saves and compatibility

The mechanic should require no save-version bump and no new durable army fields.

- Existing `army.path`, `from`, `at`, `moveLeft`, and `goal` remain valid.
- An in-progress leg retains its saved countdown after load.
- The next leg uses the new quote.
- An old route that is no longer the weighted optimum remains valid; it is not
  rewritten merely by loading.
- A host missing composition continues to migrate through `FB.hostUnits`; its
  `men` total is sufficient for capacity.
- No technology records change shape. Completed technology ids acquire their new
  effects through current data.
- Observe mode, `file://`, and served-origin play use the same deterministic
  calculation.

The change will alter future movement timing in old campaigns once a new leg
begins. That is an intended rules change, not save corruption, and should be
mentioned in the changelog when implemented.

## Mod compatibility

Update the mod contract as follows:

- existing `straits:[["a","b"]]` remains valid;
- unclassified straits default to `narrow`;
- optional `crossingClasses:{"a|b":"coastal"}` may classify an existing pair;
- invalid or noncanonical classification keys fail validation;
- mod technologies may supply positive integer `fx.seaTransport`;
- mod technologies may supply fractional `fx.seaMovement`, subject to the global
  cap;
- technology effects display automatically in the Technology sheet;
- mods do not need to define ships, ports, or fleet assets.

Legacy world mods that add crossing classifications must follow the same bookmark
availability rule as other coastline and strait changes. Add the new field to the
world-change detection that prevents an incomplete legacy map override from
silently claiming compatibility with every bookmark.

## Implementation milestones

### Milestone 1 — preserve and classify water edges

1. Add and validate `crossingClasses`.
2. Carry it through bookmarks and mods.
3. Compile `FB.world.waterAdj`.
4. Add `FB.waterCrossing`.
5. Classify every core `FBDATA.straits` pair.
6. Leave ordinary adjacency behavior unchanged.

This milestone should be behavior-neutral until army movement consumes the new
lookup.

### Milestone 2 — make naval technology concrete

1. Add max-valued `fx.seaTransport`.
2. Add capped scalar `fx.seaMovement`.
3. Add technology validation and UI rendering.
4. Author the initial capacity progression.
5. Move maritime technologies off generic land `movement` where appropriate.
6. Confirm 867 and 1066 seed outcomes for representative coastal and landlocked
   sovereigns.

Do not add fleet state or port-building requirements.

### Milestone 3 — quote legs and route by time

1. Add `FB.armyLegQuote`.
2. Add deterministic weighted `FB.findArmyPath`.
3. Route `FB.orderArmy` through the weighted result.
4. Start every new leg from the authoritative quote.
5. Preserve old mid-leg countdowns and manual paths.
6. Ensure AI, automation, hunts, and routs share the same calls.

This is the first behavior-changing milestone and should land with its regression
coverage.

### Milestone 4 — expose the rule

1. Add route ETA and water-capacity feedback to manual orders.
2. Distinguish water movement in host status.
3. Show concrete capacity and sea-speed effects in Technology details.
4. Add the short How to Play explanation.
5. Verify keyboard and touch orders receive equivalent feedback.

### Milestone 5 — documentation and balance review

1. Update `docs/designs/war.md`.
2. Update `docs/designs/tech.md`.
3. Update `docs/designs/provinces.md` for crossing metadata.
4. Update `docs/designs/mods.md` and `docs/MODDING.md`.
5. Review crossing classes and capacity values against representative routes.
6. Record any deferred fleet, blockade, attrition, or port ideas as non-MVP work
   rather than silently adding them.

## Automated coverage to author

Add a focused deterministic browser specification, recommended:

`tests/e2e/specs/army-sea-transport.spec.js`.

Coverage should include:

### World and data validation

- a core strait appears in both `adj` and `waterAdj`;
- an ordinary land border appears only in `adj`;
- an unclassified modded strait defaults to `narrow`;
- unknown, reversed/noncanonical, or orphaned crossing classifications fail
  validation;
- bookmark activation preserves classifications.

### Technology

- base capacity applies with no completed capacity technology;
- the largest completed `seaTransport` value wins instead of values summing;
- vassal hosts use sovereign technology;
- landlocked and coastal realms retain the normal technology-record rules;
- `seaMovement` respects its cap;
- Technology details show capacity and sea-speed effects;
- maritime effects no longer change a purely land march.

### Leg timing

- a host at or below capacity takes one crossing cycle;
- a host one man above capacity takes two;
- narrow, coastal, and open classes apply their configured multipliers and cycle
  days;
- land legs retain the existing duration;
- a larger capacity reduces total crossing time;
- a saved mid-leg countdown is not recalculated on load;
- a new following leg uses newly completed technology or changed allegiance.

### Routing and AI parity

- low-capacity routing chooses a faster land route around a slow sea link;
- high-capacity routing may choose the direct sea link;
- equal-cost routes use a stable tie-break;
- manual player orders, player automation, AI goals, prey hunts, and routs all
  use the same weighted route;
- no routing or timing calculation consumes RNG;
- old plain `FB.findPath` callers retain unweighted compatibility behavior.

### UI and accessibility

- a water route reports ETA, capacity, and cycles;
- an all-land route does not mention ships or capacity;
- active water movement has a truthful status;
- keyboard and pointer orders produce the same route and feedback;
- narrow layouts preserve complete text and reachable controls.

Per repository policy, agents author or update these tests but do not run
Playwright, syntax checks, static-server tests, runtime verification, or manual
browser checks. The owner retains all test execution and manual appearance,
touch, iframe, and real-mobile verification.

## Manual review targets for the owner

The eventual implementation needs subjective review for:

- whether a low-technology large host feels delayed rather than merely annoying;
- whether island campaigns remain possible in 867;
- whether advanced coastal powers gain a visible but not overwhelming advantage;
- whether weighted routing selects geographically credible alternatives;
- whether route and capacity explanations fit on mobile;
- whether crossing delays interact sensibly with war exhaustion, siege clocks,
  seasonal upkeep, and great-holy-war deadlines.

Balance should be adjusted through `FBDATA.balance` and technology data after
these checks, not through route-specific exceptions in army code.

## Explicit non-goals

Do not include any of the following in this implementation:

- fleet units or fleet construction;
- ship counts in saved state;
- admirals or naval careers;
- naval battles;
- blockades or interception;
- storms, shipwrecks, or sea attrition;
- embarking individual unit classes separately;
- leaving part of a host behind;
- transporting allies as separate hosts;
- port ownership or Harbor buildings as hard embarkation gates;
- at-sea army markers;
- sea zones or ocean-node pathfinding;
- changes to ordinary personal travel;
- a general rewrite of war declarations across water.

Each is a possible later system, but none is necessary to make technology and
large-body water crossings meaningful now.

## Future fleet seam

Keep the public calculation divided into:

- crossing classification;
- available transport capacity;
- leg quote;
- weighted route.

A future fleet system can then change:

```js
FB.armySeaTransportCapacity(state, realmId, fromPid, toPid)
```

from “best sovereign technology” to “available friendly fleet and port capacity,”
while retaining crossing metadata, leg quotes, route previews, AI cost
comparison, and most UI. Technology can continue to improve fleet capacity and
speed rather than becoming obsolete.

Do not store assumptions in `army.path` that require technology to remain the
permanent capacity provider.

## Acceptance criteria

The slice is complete when:

- every authored strait remains reachable and is classified for army movement;
- large hosts require multiple crossing cycles when they exceed transport
  capacity;
- better sovereign seafaring and naval-organization technology visibly reduces
  those cycles or their duration;
- maritime technology no longer accelerates unrelated land marching;
- army routing compares travel days rather than province count;
- players and AI use the same movement rule;
- manual routes remain authoritative;
- existing saves load without migration and preserve active countdowns;
- technology and order UI explain the mechanic from authoritative calculations;
- modded pair-format straits remain valid;
- deterministic automated coverage is authored;
- the relevant design and modding documentation is updated;
- no fleet simulation or new saved troop pool has been introduced.

