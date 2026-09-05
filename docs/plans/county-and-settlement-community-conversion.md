# Plan: live county and settlement community conversion

Status: in progress — Milestones 1–6 implemented; Milestone 7 remains
Baseline: Fallowborn v1.168.12, 2026-09-05

## Purpose

County culture and faith are currently immutable bookmark facts. A province has one
principal `culture` and `religion`, plus an optional ordered `communities` list that
records historically grounded local identities without population shares. The live
population system separately stores one integer county total and derives settlement
population for display. Consequently, conquest, migration, ruler conversion, and the
passage of time cannot change the cultural or religious composition of a place.

This plan adds gradual, saved culture and faith change without replacing the existing
population number. The Land tab's county population remains the authoritative total;
communities partition that same number. Conversion moves people between communities
without creating or destroying population, while births, deaths, war losses, and
migration continue to change the total through the existing population system.

This is the separately scoped community-share phase anticipated by
[the original population plan](archive/county-population-and-demographics.md#community-shares-later-phase).

## Non-negotiable invariants

1. `state.population.counties[pid].count` remains the one authoritative county
   population used by tax, levy, capacity, market demand, and the Land tab.
2. The sum of a county's live community counts always equals that county population.
3. Religious conversion preserves culture, and cultural assimilation preserves faith,
   unless an explicit effect deliberately changes both.
4. Migration conserves world population and moves the migrants' identities with them.
5. Authored bookmark data and `FBDATA` are immutable during play. All live change is
   stored in campaign state.
6. Ownership, conquest, or a ruler's personal conversion never flips a county
   immediately. Those events may create pressure, resistance, migration, or a deliberate
   conversion project.
7. Existing named characters retain their own culture and faith. Demographic change
   affects anonymous population and the identities chosen for newly generated locals.
8. Settlement populations remain partitions of their county total. Settlement culture
   and faith must not introduce a second population total.
9. Ordinary demographic work runs annually, not daily, and consumes no RNG. Event and AI
   decisions may use the saved RNG through `FB.rng` / `FB.ri` / `FB.pick` only.
10. Every mutation goes through population-owned transaction helpers. UI reads and
    formatting never repair or mutate demographic state.

## Historical shape

The system should represent mixed places and generational change, not rapid map painting.
Culture and religion are separate axes: a Norse Catholic community can assimilate into
Anglo-Saxon Catholic society, convert to Norse paganism, or remain distinct. A conquest
changes political control immediately but leaves the population beneath it in place.

Normal conversion and assimilation should take decades. Pressure may come from local
clergy, rulers, institutions, neighboring communities, migration, trade, marriage, or
explicit settlement policy. Hostile coercion should primarily produce unrest, flight,
resistance, or revolt; it must not merely act as a large speed multiplier. Towns, ports,
county heads, and villages may diverge once the settlement phase ships.

The following remain separate from population identity:

- a character's personal culture and faith;
- a realm's saved or ruler-derived identity;
- county ownership and de jure membership;
- authored settlement names and physical sites;
- the `paired:true` character-generation safeguard on an authored community.

`paired:true` continues to mean "do not invent recombined local character identities."
It is not a conversion ban or a demographic property. If a population needs special
resistance or protection, that must be represented by an explicit data-driven rule.

## Data and save model

### Authored starting shares

Extend an authored province community with an optional integer `populationShare0` in
basis points:

```js
communities:[
  { culture:'anglo_saxon', religion:'catholic', populationShare0:8200 },
  { culture:'norse', religion:'norse_pagan', populationShare0:1800 }
]
```

For a fully authored list, values total exactly 10,000. The first community must remain
the province's principal pair and must have at least as large a starting share as every
later entry. Single-community counties implicitly receive 10,000 and do not need to
repeat it.

Before the player-visible feature ships, every core multi-community bookmark county must
have reviewed shares for both 867 and 1066. Do not infer those shares from modern census
data. Record sources and uncertainty in the existing county-community research material.

Compatibility policy for mods and old unweighted data:

- the principal community receives the entire simulated population;
- later presence-only communities remain available to existing New Game and matchmaking
  flows but begin with no simulated share;
- a diagnostic reports the fallback so mod authors can add historical shares;
- initialization never invents equal or arbitrary minority populations.

### Saved county communities

Advance the population subsystem schema and extend each inhabited county record:

```js
state.population = {
  schema:2,
  lastYear:912,
  counties:{
    york:{
      count:24000,
      natural:180,
      migration:-45,
      losses:0,
      communities:[
        { culture:'anglo_saxon', religion:'catholic', count:19680 },
        { culture:'norse', religion:'norse_pagan', count:4320 }
      ],
      identity:{
        culture:'anglo_saxon',
        religion:'catholic',
        cultureSince:867,
        religionSince:867
      },
      communityChange:{
        faithConverted:120,
        cultureAssimilated:0
      }
    }
  }
};
```

Integer people, rather than floating-point percentages, are saved. Authored basis points
are converted to opening counts with deterministic largest-remainder apportionment using
authored order as the tie-breaker. Zero-count groups are omitted from saved state. The
static authored list remains the catalogue of historically present identities and is not
rewritten.

`identity` is a cached, saved display/mechanics choice rather than another population.
Culture and religion are aggregated independently across combined community pairs. A new
plurality replaces the previous identity only after exceeding it by a small data-driven
margin, preventing close populations from flipping the map every year. An absolute
majority always takes precedence. `communityChange` records the last annual net movement
for Land and settlement explanations without saving rendered prose.

Campaign-founded faith ids are valid community targets when `FB.faithExists` and
`FB.faithAssignable` accept them. Culture ids must resolve through `FBDATA.cultures`.

### Later settlement partition

County communities ship first. The schema reserves an optional settlement partition on
each community:

```js
{
  culture:'anglo_saxon',
  religion:'catholic',
  count:19680,
  bySettlement:[7200, 5100, 3900, 3480]
}
```

The array uses the county's stable saved settlement slots. When any community in a county
has `bySettlement`, every live community in that county must have it, and:

```text
sum(community.bySettlement) = community.count
sum(all communities at slot i) = FB.settlementPopulation(state, pid, i)
sum(all community.count) = county.count
```

The partition stays absent until settlement-specific composition is needed. An absent
partition means every settlement uses the county mix as a derived projection and costs no
extra save space. The first settlement-targeted conversion materializes the complete
county matrix by deterministically apportioning the current county communities across the
current settlement totals.

Once materialized, population mutations and changes to settlement allocation weights must
reconcile the matrix through one helper. Reconciliation preserves county community totals
and the current settlement totals exactly, using stable slot and community ordering for
rounding. UI getters never perform this reconciliation as a side effect.

## Public API boundary

Keep `FB.provinceCommunities(province)` as the immutable bookmark-data reader used by
validation and New Game. Add state-aware live APIs in `js/population.js`:

```js
FB.countyCommunities(state, pid)
FB.countyCulture(state, pid)
FB.countyReligion(state, pid)
FB.countyCultureShare(state, pid, cultureId)
FB.countyReligionShare(state, pid, faithId)
FB.settlementCommunities(state, pid, settlementIndex)
FB.settlementCulture(state, pid, settlementIndex)
FB.settlementReligion(state, pid, settlementIndex)
```

Returned community records are projections or copies, never mutable references into the
save. Culture and faith share helpers aggregate every matching combined pair.

All demographic writes use a narrow set of helpers:

```js
FB.changeCountyPopulation(state, pid, amount, cause, options)
FB.moveCommunityPopulation(state, fromPid, toPid, cohorts, cause)
FB.convertCountyCommunity(state, pid, request)
FB.convertSettlementCommunity(state, pid, settlementIndex, request)
FB.reconcileCountyCommunities(state, pid)
FB.reconcileSettlementCommunities(state, pid)
```

Conversion requests identify `kind:'faith'` or `kind:'culture'`, a target id, an integer
amount or bounded rate, and an optional source id. Without an explicit source, eligible
non-target communities contribute proportionally. Helpers clamp to available population,
merge duplicate culture-faith pairs, remove zero-count groups, update dominant identity,
and report the exact applied transfer.

## Practical implementation sequence

### Milestone 1: authored shares, saved communities, and old-save migration

Primary files:

- `data/counties.js` and `data/bookmarks.js`
- `js/world.js`
- `js/population.js`
- `js/save.js`
- `docs/designs/provinces.md`
- `docs/designs/state-and-saves.md`
- `docs/MODDING.md`

Steps:

1. Add and validate optional `populationShare0` on authored community records.
2. Author reviewed shares for the core 867 and 1066 multi-community counties.
3. Advance `state.population.schema` to 2 and initialize community counts from the active
   bookmark and the county's already-established population total.
4. Extend `FB.ensurePopulationState` to repair missing, invalid, duplicate, negative, or
   non-reconciling communities without consuming RNG. Give the principal community the
   deterministic remainder.
5. Load older saves from their current date and population. Do not replay historical
   conversion or migration that the save did not record.
6. Add the county live-read helpers while leaving all consumers on static identity until
   the storage layer is independently testable.
7. Measure serialized-size impact for both bookmarks and a long-running save before
   choosing any optional caches.

Exit criteria:

- every inhabited county's community counts sum exactly to its existing population;
- initialization and save repair are deterministic and idempotent;
- loading the same old save twice produces byte-stable demographic state;
- `FBDATA`, bookmark provinces, and authored community arrays remain unchanged;
- founded and modded faith ids follow the normal faith validation path;
- no existing tax, levy, market, population, New Game, or matchmaking behavior changes.

### Milestone 2: integrate births, deaths, losses, and migration

Primary files:

- `js/population.js`
- every caller of `FB.changeCountyPopulation` and `FB.damageCountyPopulation`
- `docs/designs/provinces.md`
- `docs/designs/time.md`

Steps:

1. Allocate natural growth and ordinary losses proportionally among the county's current
   communities with stable largest-remainder rounding.
2. Allow explicit famine, persecution, expulsion, colonization, or scripted effects to
   name a targeted community policy instead of silently using proportional allocation.
3. After migration edge flows are capped, allocate each source's total outflow among its
   communities once, then distribute those exact cohorts across outgoing edges. The
   destination receives the same culture-faith pairs.
4. Preserve the present world-sum-zero migration guarantee as well as every county floor.
5. Keep `count`, `natural`, `migration`, and `losses` as the existing UI/economy contract;
   community bookkeeping must not add another economic multiplier.
6. Add a debug validator that checks total and community conservation after the annual
   pass and every public population mutation.

Exit criteria:

- natural change, capture losses, and migration preserve all population invariants;
- migrants retain identity and can introduce a new live community into a destination;
- iteration order does not change cohort allocation;
- ordinary annual work is O(counties + adjacency edges + live community records);
- the RNG state is byte-identical before and after a zero-RNG demographic pass.

### Milestone 3: route live county identity through the game

Primary files:

- `js/events.js`
- `js/localfolk.js`
- `js/economy.js`
- `js/institutions.js`
- `js/holywar.js`
- `js/actions.js`
- `js/travel.js`
- `js/world.js`
- `js/ui_panels.js`
- `docs/designs/religions.md`
- `docs/designs/conversion.md`

Steps:

1. Audit every runtime read of `province.culture`, `province.religion`, and
   `FB.provinceCommunities`. Route live county mechanics through the new helpers.
2. Keep world validation, bookmark activation, the New Game community picker, and start
   character creation on the immutable bookmark reader.
3. Make local character generation choose a real live culture-faith pair, weighted by
   community population. Do not form a pair by independently choosing dominant culture
   and dominant faith.
4. Use live dominant identity for event province triggers, travel encounters, county
   presentation, locally generated lords and clergy, and conversion-to-province effects.
5. Audit holy-war rules individually. Controller or ruler faith remains the political
   test where appropriate; local community shares drive popular hostility, resistance,
   and local religious context. Do not replace every political faith test mechanically.
6. Keep realm identity independent. A capital county changing plurality must not silently
   rewrite an explicitly saved realm faith or the ruler's identity.
7. Leave settlement proper names and already-generated names unchanged when local culture
   changes. Renaming is a separate feature.

Exit criteria:

- no live mechanic accidentally reads stale bookmark identity;
- no setup or validation path accidentally reads campaign state;
- generated locals always use a culture-faith pair that actually exists in the live
  county population;
- holy-war eligibility and local unrest use their deliberately chosen political or
  demographic source rather than one global shortcut;
- changing a county plurality does not change its owner, realm, buildings, development,
  named characters, or settlement names.

### Milestone 4: county conversion and assimilation projects

Primary files:

- `js/population.js`
- `js/actions.js`
- `js/events.js`
- `data/actions.js`
- relevant event packs
- `data/map_data.js`
- `data/technology.js`
- `docs/designs/conversion.md`
- `docs/designs/events.md`
- `docs/MODDING.md`

Steps:

1. Implement atomic county faith-conversion and culture-assimilation transfers. Faith
   changes preserve each cohort's culture; culture changes preserve its faith.
2. Add one saved project per axis and county, containing the target, sponsor, start turn,
   policy, and accumulated progress. Save ids and numbers, never rendered descriptions.
3. Resolve bounded progress in the annual demographic pass. Separate pressure from rate:
   ruler and clergy influence can sustain a project, while population size, entrenched
   communities, faith relations, culture affinity, unrest, war, occupation, and local
   institutions shape its effect.
4. Add explicit voluntary, integrative, and coercive policy profiles. Coercion increases
   resistance, unrest, and migration pressure and has sharply diminishing conversion
   returns.
5. Do not start a project merely because ownership changes. Player and AI rulers need a
   legible policy, decision, scripted history instruction, or event outcome.
6. Keep the current personal/household/realm conversion deeds separate in both state and
   presentation. Character conversion belongs to the existing personal conversion flow;
   county projects are territorial policy and must not be owned by the Self-tab Faith
   details sheet. Realm faith conversion may make county projects available and cause
   existing unrest, but never converts county population immediately.
7. Add data-driven balance fields for caps, minimum meaningful transfer, plurality
   hysteresis, resistance, and policy effects. Avoid faith-id switches in engine code;
   use religion definitions, relations, institutions, and tagged policy data.
8. Record `county_community_conversion` in `FBDATA.techImpactReviews` as `mode:'none'`:
   communal conversion and assimilation occurred throughout the period without a
   researched prerequisite. If a later administrative capability improves a policy, give
   that independently gateable improvement its own soft review.

Exit criteria:

- a conversion transfer changes no county or world population total;
- county faith and culture can change independently;
- conquest and ruler conversion alone cause no demographic flip;
- plurality changes are stable near a tie and immediate after an unquestioned majority;
- a project can be explained from saved inputs and repeated deterministically;
- custom and reformed faiths work without bespoke engine cases.

### Milestone 5: Land presentation and player control

Primary files:

- `js/ui_panels.js`
- `js/ui_modals.js`
- `js/ui_misc.js`
- `css/style.css`
- `docs/designs/ui.md`
- `docs/README.md`

Steps:

1. Make the selected county's Land/province surface the canonical entry point for county
   community information and county project controls. Every territorial action must retain
   an explicit county context; never choose an implicit county from a character-facing
   modal.
2. Keep the existing Land population headline and growth/capacity information unchanged.
3. Add separate Culture and Faith breakdowns aggregated from combined communities. Show
   counts and percentages, with the dominant identity first and smaller groups collapsed
   accessibly on compact screens.
4. Show the active project, estimated direction, last annual transfer, resistance, and
   material consequences without promising an exact completion date when inputs can
   change.
5. Add project start/change/stop controls only where the player's rank and authority make
   them credible. Preview piety, prestige, Standing, Common Voice, unrest, and relationship
   costs before confirmation.
6. Keep the Self-tab Faith details sheet character-centered. It may link to the existing
   personal/household/realm **Convert faith…** picker, and a landed ruler may receive a
   **View faith in your lands** shortcut that opens an explicit Land county context. These
   are navigation aids, not alternate county-project controls. Preserve an equally direct
   Land route for cultural assimilation rather than nesting territorial policy beneath
   religion.
7. Route every new string through i18n as authored. Catalog regeneration remains an
   integration-only action when separately requested by the owner.

Exit criteria:

- community rows reconcile exactly to the unchanged county population headline;
- culture and faith percentages are aggregated independently;
- the player can tell whether change came from conversion, assimilation, or migration;
- personal conversion remains clearly distinct from territorial projects, and every
  territorial control names the county it will affect;
- entering through Self/Faith can navigate to conversion or Land without duplicating
  county controls or silently selecting a county;
- controls remain usable by keyboard and touch and do not mutate state merely by opening.

### Milestone 6: settlement-specific populations and conversion

Primary files:

- `js/population.js`
- `js/settlement.js`
- `js/localfolk.js`
- `js/ui_modals.js`
- every centralized building-completion/demolition mutation path
- `docs/designs/provinces.md`
- `docs/designs/development.md`
- `docs/designs/state-and-saves.md`

Steps:

1. Add the optional `bySettlement` partition and deterministic materialization helper.
   Initially every site receives the county mix while retaining the existing weighted
   settlement population totals.
2. Add `FB.settlementCommunities` and dominant identity helpers as read-only projections.
3. Make settlement conversion move people only within the selected slot, updating the
   containing county's aggregate community counts without changing either population
   total.
4. Reconcile materialized partitions whenever county population changes or settlement
   weights change because a building completes, is ruined, or is demolished. Preserve
   both community column totals and settlement row totals exactly.
5. Move departing migrants out of specific source slots proportionally. Place arrivals
   according to the destination's settlement weights unless an explicit event names a
   port, town, county head, or other slot.
6. Generate new local-folk records from the settlement mix. Existing residents and
   remembered relationships remain untouched.
7. Extend the selected settlement's sheet with the local breakdown and any active local
   project. Make that sheet the canonical entry point for settlement project controls;
   neither the Self-tab Faith details sheet nor the county-wide controls may silently
   choose a settlement. The county Land breakdown remains the sum of its settlements.
8. Measure save growth. If full matrices are too large, keep them lazy and compact any
   matrix that has returned to the county-wide proportional projection; do not weaken the
   conservation invariant.

Exit criteria:

- every settlement total remains exactly the value returned by the existing population
  allocation, and all settlements sum to the county total;
- a town may change faith or culture without instantly changing its surrounding villages;
- settlement conversion rolls up exactly into county shares and dominant identity;
- every settlement-project control visibly retains its county and settlement context;
- completing or demolishing a building cannot duplicate or erase people;
- remote settlement browsing remains read-only and consumes no RNG;
- settlement names and existing local characters remain stable.

### Milestone 7: events, AI, historical calibration, and release

Primary files:

- `js/events.js`
- `js/agency.js` and the relevant AI policy owner
- historical event data
- `docs/MODDING.md`
- all owning design documents
- relevant Playwright specifications
- `js/main.js` at integration

Steps:

1. Add declarative triggers for dominant county/settlement culture and faith, share
   thresholds, mixed-population thresholds, and active project state.
2. Add declarative effects for bounded county or settlement conversion, migration,
   expulsion, resettlement, and project changes. Every population-changing effect routes
   through the central transaction helpers.
3. Give AI rulers conservative, data-driven project choices based on authority, local
   relations, faith character, community size, stability, and political incentives. Do
   not make "different from ruler" sufficient by itself.
4. Add a small number of sourced historical situations that exercise peaceful adoption,
   elite-led conversion, frontier settlement, urban minority persistence, and coercive
   backlash. Avoid deterministic modern borders or guaranteed outcomes.
5. Balance rates over 25-, 50-, and 100-year observations in both bookmarks. Review mixed
   counties, borderlands, trade centers, holy-war regions, and newly founded faiths.
6. Complete documentation, mod validation, save-size diagnostics, and the test matrix.
7. At each integration into `main` or `dev`, assign the next version and changelog entry
   according to the repository workflow. Regenerate i18n catalogs only if the owner
   separately requests it.

Exit criteria:

- AI conversion is motivated and sparse rather than a universal map-painting loop;
- mixed communities commonly persist for generations;
- conquest does not erase local identity, while migration and sustained policy can
  produce visible long-term change;
- 867 and 1066 observation runs remain historically plausible without being scripted to
  one result;
- modded cultures, faiths, communities, policies, triggers, and effects validate or fail
  with actionable errors.

## Test plan

Update or add specifications alongside each observable milestone. At minimum:

- `tests/e2e/specs/population.spec.js`: initialization, repair, exact sums, proportional
  growth/loss, cohort migration, annual idempotency, and unchanged economic total;
- `tests/e2e/specs/county-communities.spec.js`: share validation, both bookmark manifests,
  immutable authored data, and legacy unweighted fallback;
- `tests/e2e/specs/community-conversion.spec.js` (new): independent axes, exact transfers,
  plurality hysteresis, projects, custom faiths, and deterministic outcomes;
- `tests/e2e/specs/conversion.spec.js`: personal/household/realm conversion remains separate
  and does not instantly convert counties;
- `tests/e2e/specs/settlement-engine.spec.js`: materialization and exact row/column sums;
- `tests/e2e/specs/settlement-folk.spec.js`: new locals use the live settlement mix while
  existing people remain unchanged;
- holy-war, travel, institution, and event specifications: each audited reader uses the
  intended political identity, dominant identity, or population share;
- storage coverage: schema-1 migration, schema-2 round trip, malformed-state repair, save
  size, and no mutation during read-only UI rendering.

Every new or changed specification must declare focused runtime inputs with
`dependsOnRuntime`. In accordance with repository policy, coding agents author these tests
but do not execute the Playwright harness, syntax checks, server checks, or manual browser
verification.

## Rejected shortcuts

- **Overwrite `province.culture` / `province.religion`.** This mutates derived world data,
  is not a complete saved history, and makes restore and bookmark behavior fragile.
- **Save only a replacement dominant id.** This cannot represent minorities, gradual
  change, migration cohorts, resistance, or settlement differences.
- **Give communities a second independent population total.** It will drift from the Land
  population used by the economy and military.
- **Convert a county when its ruler converts or conquers it.** This confuses elite politics
  with population history and produces implausibly fast map painting.
- **Choose culture and faith independently when generating a local person.** This invents
  combinations absent from the population and bypasses the authored `paired` safeguard.
- **Store rendered percentages or prose.** Percentages are projections from integer counts;
  explanations must be localized at display time.
- **Simulate conversion daily.** Annual bounded work is sufficient for a generational
  process and keeps long skips and Observe mode tractable.

## Completion definition

The feature is complete when county and settlement culture-faith communities are saved
partitions of the existing population total; all population changes conserve those
partitions; political, demographic, and bookmark identity are read from the correct
source; conversion is gradual, deterministic, explainable, and historically restrained;
the Land and settlement interfaces expose the result without creating competing
population numbers; and old saves and mods receive documented deterministic fallbacks.
