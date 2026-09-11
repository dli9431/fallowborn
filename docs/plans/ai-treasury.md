# Plan: count-and-higher AI treasuries

Status: Stage 3 implemented and owner-profiled; further optimization paused at owner request. Final balance/UI validation and phases 4–5 remain.
Date: 2026-09-11.

## Next steps and measurement checkpoints

The owner accepted the performance work on 2026-09-11 and authorized Stage 2.
The latest accounting-only run measured 1,481.5 ms simulation, 839 ms armies,
493.6 ms orders and 214.4 ms searches. It skipped 53,936 dominated path allocations
and reused 680 holy-war objectives. Reported gameplay aggregates and balances
matched. This is owner acceptance to proceed, not a statistically proven 5% gate.

Stage 2 now activates treasury food payments and ruler dues, performs one-time
migration, and allocates bounded household food-producer adjustments seasonally.
Owner active-treasury measurement: 1,494.5 ms simulation, 849.8 ms armies,
8.4 ms for the single producer snapshot. Purchase fixture: gain 0.7441875,
loss 0, pending 0. Mixed requisition fixture: gain 0.28729859462040674,
loss 0.13609923899960352, pending 0; 29.03435 food taken and 15.87825 bought.
These support both adjustment paths and settlement; exact allocation/cap checks
still require starting producer snapshots. They do not establish a repeated-sample
performance gate or replace migration/conservation regressions.

Stage 3 begins with reserve-aware annual construction and realm-specific canonical
building prices. One shared annual fiscal/host projection protects building upkeep,
liege dues, two seasons of active-host non-food and food costs, and initial refill.
New building upkeep increases the protected reserve during the same pass.
Stage 3 now also checks new hosts, detachments and replenishment against shared
phase-local commitments. Poor defenders can halve down to an affordable levy
(at most 12 attempts, existing minimum size); no levy purchase fee is invented.
New AI replacement batches wait for payment of the existing drilling premium
before their full training interval starts. Existing batches are grandfathered.
Failed quotes retry after seven days, reaching the required funds, or military
input invalidation. Two insolvent seasons with military bills trigger 90 days
of recovery: return home, disband only while stationary in an unblocked directly
held county, and preserve rearm stamps/bills. AI-only offensive campaigns seek
white peace at the existing seasonal review; player campaigns are not auto-settled.
Ruler sheets disclose cash/bills/settlement/recovery and Coin & Credit shows the
last settled producer adjustment with shared Details and existing navigation.
Fort works retain their separate annual policy.

Next implementation stage: the separately deferred named-counterparty transfer
audit (Stage 4). Further performance optimization is paused at owner request;
the latest measurement is recorded below. The fixture `logistics-stress-save-stage3.txt` starts
with 53 hosts, 134,100 soldiers and 260 active accounts split among rich,
constrained and insolvent rulers. It includes missing musters, damaged hosts and
unfunded replacement batches. Import it afresh for each seasonal profile; its
changed starting balances/workload are not a matched comparison with the earlier
fixture. Generation only transforms save data; the owner has since profiled its
seasonal runtime outcomes, without establishing every balance or regression gate.
Active spending changes routes and shortages;
old accounting-only gameplay hashes are no longer expected to match.

1. **Stage 1: measure the accounting foundation.** `js/treasury.js` provides
   additive realm accounts, one seasonal direct-holder fiscal snapshot, immediate
   liege obligations, daily non-food host accrual, annual revaluation, and lifecycle
   transfers/retirement. Accounts are explicitly **accounting-only**: provisioning
   purses, player cash, recruitment, and construction behavior stay unchanged.
   Inherited player amounts are recorded as `pendingPlayer`, never credited during
   this stage. Opening balances are two seasons of positive projected net income
   with Count/Duke/King/Emperor floors of 10/20/30/40. These are balance defaults.
   The owner runs the new treasury regressions and compares identical starting saves,
   seeds, and seasons before/after this change, including quiet, heavy-war, old-save,
   Observe, and year-crossing cases. Use the existing opt-in fast-forward profiler;
   Treasury rows separate repair, snapshots, settlement, accrual, and revaluation.
   Inspect nested modifier/settlement reads as well as top-level counters. Stop and
   optimize if median simulation time rises over 5%, or year-boundary time over 10%.
   Thresholds are provisional and require comparison against baseline noise.
   The prepared root `logistics-stress-save.txt` supplies 56 holy-war hosts and a
   winter/year-boundary workload. See [the stress-save recipe](../TESTS.md#army-logistics-and-treasury-stress-save)
   for matched treasury-disabled/accounting runs and the workload/hash checks.
2. **Stage 2: implemented; validate logistics and producer receipts.** Replace
   `armyLogistics.purses` with real treasury available-funds queries. Food is paid
   immediately; accrue only non-food upkeep. Credit market dues to actual ruler
   accounts. At activation, explicitly rebase accounting-only balances from current
   fiscal inputs and the old provisioning purse (take the larger opening amount,
   never add two opening grants). Discard accounting-only `pendingPlayer`; it is
   diagnostic history, not an earned reward. Reset boundary stamps and do not replay
   diagnostic bills or receipts. Retire old purses atomically and test repeat loads.
   Separate enterprise physical production from monetary revenue. Freeze each
   period's operational food producers, baseline earnings/output, and county output
   shares. Allocate bought/taken output jointly up to that output capacity. Replace
   the baseline revenue attributable to purchased units with allocated supplier
   receipts excluding dues; the positive adjustment is capped at 25% of baseline
   income and at the attributed receipts. Lost revenue from seized output is capped
   at 50% of baseline income. Settle once with livelihoods before necessities; daily
   provisioning never scans enterprises. Keep other civilian enterprise earnings,
   fixed wages, serf Harvest, and commodity ventures unchanged. New enterprises enter
   the next allocation period; closure/sale must settle earned receipts once. Add
   conservation, producer, hardship, and long neutral crusade-route regressions.
   Stop for owner heavy-war and commoner-income measurements before gate 3.
3. **Stage 3: implemented; validate affordability and compact presentation.**
   Reserve one season of necessary expenses plus one additional active-army season
   in wartime, including consumption and initial resupply commitments. Protect that
   reserve from optional building/recruitment; food purchases can use remaining cash
   below the policy reserve. Preserve annual building candidates, technology gates,
   host limits and rearm delays. Add affordable levy defense, bounded failed-quote
   retries, and financial withdrawal/peace decisions at existing review points.
   Distinguish insolvency from an empty market. Expose available cash, accrued bills,
   last-period results, and producer adjustments using shared disclosures and the
   Back/Close footer. Owner checks final performance, balance, and mobile appearance.
4. **Deferred:** audit and connect gifts, tribute, ransom, land sales, and saved
   negotiated commitments separately. No AI household wallets, new diplomatic
   searches, general commodity revenue rework, or new taxes on commoner players.

Agents author the tests and fixtures but do not execute the harness, syntax checks,
profiling, or browsers. Stage completion is not evidence that a performance gate
passed. Owner Stage 1 and Stage 2 measurements are recorded above; automated
regressions remain owner-controlled; Stage 3 profiling results are recorded below.

### Remaining work

Two implementation phases remain in the full plan: **4. Real counterparty payments**
and **5. Read-only UI, balance, and integration**. The staged rollout above groups
the original accounting phases and logistics activation differently from the detailed
phase list; these are not additional outstanding accounting stages.

Phase 4 still needs the named-payment audit, paired debit/credit wiring, affordable
voluntary offers, saved-commitment rules, and duplicate-payment regression coverage.
Phase 5 is partly implemented: compact ruler treasury and producer-adjustment UI
already shipped in the working changes for Stage 3. Remaining work is final owner
balance/UI validation, any resulting adjustments, documentation reconciliation,
and explicitly authorized integration. Pausing optimization does not establish
the proposed repeated-sample performance gates or complete those validation tasks.

### Stage 1 accounting contract

The fiscal snapshot counts directly held counties once, derives their tax from the
shared player county primitive, adds standing building taxes, and applies each AI
realm's tax technology. County support and modifier records are read once for both
base tax and building support. Building and fort maintenance are attributed to the
direct holder. AI has no player household traits, council, guild privileges, bishopric
income, or personal domain-cap penalty. Occupation follows the existing county tax
and support modifiers rather than introducing an extra invented penalty.

Immediate-vassal dues use the existing charter share of the county tax base, matching
the player-vassal contribution formula; received dues are not taxed recursively.
Normal play passes the already-computed player tax breakdown into settlement to
mirror the player's liege payment. Observe mode omits personal player transactions.
Settlement runs after markets and before player receipts, campaigning, and annual
world work. Observe advances the revaluation stamp at ratio 1 because it does not
run player monetary policy. Normal play uses the existing finance price ratio.

Allied and holy-war hosts are billed to their host realm, including embedded
contingents once. Costs use local non-food basket prices; no general fiscal pass
runs daily. Newly created accounts start with a bounded transfer from the source's
positive uncommitted balance, using granted county count divided by source direct
holdings before transfer. New institutions with no AI source start at zero. Ordinary
succession and independence retain accounts. Escheat and dynastic absorption transfer
signed assets and accrued bills; conquest of a county does not seize the ruler's
treasury. Extinction retires remaining funds and liabilities with one bounded receipt.

The accounting-only foundation intentionally omits construction payments, provision
payments/dues, and professional replacement commitments until their affordability
stage. Its balances are diagnostics and must not be exposed as spendable money or
carried directly into activation without the explicit rebase above.

## Objective and scope

Give every active count-and-higher AI ruling realm a real, persistent treasury.
Include subordinate counts and dukes, independent rulers, and eligible religious
realms. AI realm `rank` is 1 for Count through 4 for Emperor; do not confuse it
with player tiers 4 through 7.

Implement both:

1. Saved balances, recurring territorial income, expenses, and succession rules.
2. Cash-aware construction, military spending, tribute, and ruler gifts through
   the existing action and transaction paths.

Performance is a primary acceptance criterion, alongside correct accounting and
credible behavior. The system must remain inexpensive in large, old saves and
during seasonal fast-forward on mobile hardware.

Do not simulate AI household members' careers, enterprises, retainers, schooling,
personal property, market baskets, or loan portfolios. Do not add daily financial
planning for every ruler, additional AI hosts, new diplomatic action generators,
or a transaction history that grows with campaign length. A treasury belongs to
the ruling institution represented by a realm, rather than every character who
holds an office or title.

## Current implementation and integration points

- `js/world.js`: `FB.aiBuildingsYear` constructs buildings through annual
  technology, geography, peacetime, and priority checks. Active treasuries now
  pay canonical construction prices while protecting projected expenses.
  Construction limits and eligibility rules remain in place.
- `js/armies.js`: AI mustering uses war participation, strength, host limits,
  and rearm delays. Add affordability to those existing decisions, without a
  second scan for military planning. Rebel hosts have separate supply rules.
- `js/actions.js`: `countyTaxBase`, `FB.playerTaxParts`, and
  `FB.vassalTaxContribution` contain useful formulas, but the latter helpers
  assume a player household or a vassal whose liege is the player. They cannot
  simply be called once per AI ruler.
- `js/main.js`: seasonal settlement precedes annual price revaluation and
  `FB.worldTick`. Player raised-host upkeep currently charges live composition
  at the seasonal boundary. Preserve that behavior during this work.
- `js/economy.js`: finance owns real-gold accounting, positive-coin annual
  revaluation, and the distinction between a cash shortfall and a signed loan.
- `js/world.js`, `js/wars.js`, `js/politics.js`, `js/rebellions.js`, and
  `js/save.js`: audit realm creation, ruler replacement, absorption, destruction,
  war settlements, independence, and save restoration before attaching money.

Read the owning designs before each phase: [finance](../designs/finance.md),
[realms](../designs/realms.md), [war](../designs/war.md),
[development](../designs/development.md), and
[state and saves](../designs/state-and-saves.md). Presentation also follows
[UI](../designs/ui.md) and [i18n authoring](../i18n-authoring.md).

## Performance architecture

### Shared fiscal pass

Build one numeric snapshot at the seasonal boundary. Group county revenue,
building upkeep, and political obligations by their actual payer or recipient.
Reuse the existing ownership/holding indexes where they are trustworthy; otherwise
build the needed grouping in one pass over counties. Never scan all counties,
buildings, characters, or armies separately for each ruler.

For R eligible realms, C counties, B building records, E liege edges, and H active
hosts, target O(C + B + R + E + H) accounting work per season, excluding existing
modifier evaluation and any necessary one-time deterministic ordering. Count
those underlying modifier reads too: hiding repeated scans in a helper does not
meet this target. Evaluate a county's fiscal inputs once per snapshot, not once
for its holder and again for every ancestor.

Use one deterministic realm ordering per pass, or reuse an existing stable index.
An explicit hierarchy traversal must visit each edge a bounded number of times,
with cycle guards for malformed saves. Do not repeatedly call a recursive
realm-total function from each realm's settlement.

### Daily work and spending

Quiet days add no all-realm fiscal loop. Accumulate AI military costs inside the
existing active-host pass using the composition already being processed. Resolve
the payer once per host and reuse per-class cost inputs within that pass. Store
only an aggregate unpaid cost for the payer, not daily transaction rows.

Available funds are the saved balance minus already-accrued unpaid military
costs. Every voluntary purchase checks this value, so delaying cash settlement
until the seasonal boundary cannot make already-spent money available again.
Accrued costs survive disbanding, destruction, and saving. This AI accrual model
is deliberately distinct from the current player boundary charge; extracting a
shared price formula must not change the player's charging cadence.

Reuse current annual construction and existing muster/war decision opportunities.
Give each eligible decision a fixed candidate/commit budget. Failed affordability
checks must return before expensive site or army projections when possible.
Do not retry a known-insufficient muster quote every day: retain a transient
retry condition that wakes when funds reach the quoted threshold, relevant
military inputs change, or a bounded review date arrives. A changed quote must
not remain suppressed by an obsolete failed check.

### Cache and presentation boundaries

Prefer batch-local snapshots discarded in `finally` to persistent caches with
many invalidation sources. Any retained cache needs an explicit dependency list
and invalidation at ownership, liege, building, occupation, tax-policy, technology,
and military-composition changes. No fiscal query should normalize an entire
save or create court characters.

The ruler sheet reads the balance and latest bounded summary on demand. Opening
it does not run the global fiscal pass. Avoid per-ruler daily UI refreshes,
map repaints, floating labels, and world-news messages for routine receipts.
Financial policy evaluation uses stable priorities and consumes no RNG; changed
downstream gameplay may legitimately change later campaign outcomes.

## Accounting and lifecycle decisions

### State

Proposed additive schema, finalized in phase 1:

```js
realm.treasury = {
  version: 1,
  gold: 0,
  militaryAccrued: 0,
  lastMilitaryTurn: 0,
  lastSettledSeason: null,
  lastRevaluedYear: null,
  lastSummary: null
};
```

`lastSummary` holds only the most recent numeric income/expense categories and
period identifier. It is replaced, never appended. Keep projections, candidate
lists, rendered prose, and host references out of saves. Per-payer accrual must
sum all its hosts before setting a once-per-day stamp; one host must not cause
another host's cost to be skipped. Consider a subsystem-level accrual stamp if
that fits the existing army pass more cleanly.

Use real-gold numbers without display rounding. Negative balances represent
incurred shortfalls, not loans with invented interest or creditors. Apply the
existing annual positive-liquid-coin revaluation convention once, after winter
settlement; do not revalue unpaid expenses or forgive negative balances.

### Eligibility, initialization, and inheritance

- Key eligibility to active ruling realm records of rank 1+, not materialized
  characters. Exclude `player`, dead/historical realms, rebel-faction placeholders,
  and duplicate institutional records that are not independent fiscal owners.
- Initialize new games and legacy saves deterministically from a bounded number
  of seasons of projected net territorial income, with a small rank-based floor.
  Tune these constants as balance data. Do not grant money every time a query
  sees an empty balance or a ruler changes.
- Legacy saves receive a one-time opening balance and current-period stamps;
  never replay centuries of missed revenue or retroactive military bills.
- A successor to the same realm inherits the full signed balance and accrued
  obligations. Ordinary ruler death must not refill the treasury.
- Reparenting a vassal changes future dues, not its cash ownership. Independence
  retains its treasury and ends the old liege obligation at the defined boundary.
- New realms carved out of existing territory receive a bounded transfer from
  the source's positive uncommitted funds, rather than another creation grant.
  Define a deterministic territorial share and never debit the source twice.
- Absorption transfers the signed balance and accrued obligations once, then
  removes the absorbed active account. Mere county conquest transfers future
  revenue, not the former holder's entire treasury. Realm destruction needs an
  explicit disposition for remaining assets and liabilities.
- Player absorption/succession is a separate reconciliation path: move net funds
  into `player.gold` once, settle or transfer outstanding accrual, and retire the
  AI account. Do not duplicate the player's existing purse or inherited rewards.

### Income, obligations, and transfers

Extract a pure numeric county-tax calculation shared with the player's current
formula. Retain occupation, development, population, building, domain, and
applicable institutional modifiers; do not instantiate AI household systems to
obtain them. Document which player-only modifiers have no AI counterpart.

Attribute base territorial receipts to the direct fiscal holder once. Compute
vassal dues as explicit transfers: the payer loses exactly what the recipient
gains. Sovereigns do not independently collect the full tax base of every
vassal-held county. Use the existing feudal contract basis on each immediate
liege edge; do not introduce an extra tax on already-received vassal dues unless
the current contract system explicitly requires it. Preserve existing player
tax and liege-payment quotes while routing their AI counterpart through the ledger.

Build all recurring amounts from the same pre-settlement snapshot and commit
the resulting deltas together. Realm iteration order must not determine whether
a receipt funds another realm's payment. Define the exact seasonal boundary
ordering before implementation, including ownership changes, new realms, player
tax collection, military accrual, annual revaluation, and annual construction.
Use the end-of-period ownership snapshot initially; do not add per-day ownership
histories for tax proration. Every county is counted once even when its owner
changed midseason.

Mandatory accrued costs and existing compulsory transfers may create a shortfall.
Voluntary construction, gifts, recruitment purchases, and negotiated cash offers
must have enough uncommitted funds. Ruler cash gifts, payments for land, tribute,
ransom, and other named-counterparty payments require an audit table identifying
the debit, credit, and current reward path. Local loot or an abstract narrative
windfall is not automatically a payment from the ruler's treasury. Distinguish
transfers from production, expenditure sinks, and explicit grants.

For an unaffordable AI-negotiated offer, generate a smaller valid offer or choose
another existing peace outcome; do not display a sum that cannot be paid. Already
binding compulsory terms retain their full liability. Existing saved offers and
in-flight commitments need a documented grandfathering rule so migration does
not invalidate them or pay them twice.

## Spending policy

Maintain a configurable reserve based on projected necessary expenses and a
bounded wartime buffer. Avoid expensive multi-year optimization. Reserve policy
must not permanently forbid all spending by poor counts.

Priority order:

1. Settle obligations and accrued military costs.
2. Maintain a viable defense during an existing war.
3. Rebuild a minimum reserve after a shortfall.
4. Fund an eligible productive building through the existing annual chooser.
5. Allow optional military expansion, affordable gifts, or cash peace offers
   through existing decision opportunities.

Construction uses the canonical cost quote, including repeat-price growth and
applicable modifiers. A successful build debits once; a failed/stale build debits
nothing. Keep technology, geography, settlement, and annual-build limits.

Do not invent a levy purchase fee solely to spend treasury money. Distinguish
upfront costs that already exist, projected ongoing upkeep, and professional
replacement costs. A poor defender may use a bounded levy-only fallback supported
by its available resources, while expensive optional troops and detachments wait.
This does not permit unlimited free musters or bypass the rearm delay. Financial
pressure should first block optional expansion, then favor existing peace,
withdrawal, or disbanding decisions at their normal review points. It must not
create daily muster/disband oscillation or instantly dissolve an army in battle.

Assign each active host one fiscal payer. Vassal contributions must not be billed
again to the vassal if their costs are already in a sovereign's host. Allied and
holy-war hosts retain explicit payer identities. Peasant rebel hosts remain
outside ruler treasury upkeep; genuine newly independent ruling realms enter
through the ordinary realm-creation path.

## Implementation phases

### 0. Establish contracts and measurement fixtures

- Audit realm ranks, fiscal holders, recurring player receipts, and each existing
  named-counterparty payment. Record payer, recipient, timing, and duplicate-risk
  paths in the implementation review.
- Freeze the seasonal ordering and host-payer rules above against the actual
  call graph. Resolve ambiguous religious or landless realm identities here.
- Prepare deterministic small-count, nested-vassal, large-empire, occupied-county,
  heavy-war, legacy-save, and old-campaign fixtures in the browser harness.
- Add opt-in profiler rows/counters before evaluating overhead. The owner records
  the same starting-save baseline for ordinary and year-crossing seasons.

Exit: accounting ownership and workload baselines are specified, with no new
spending behavior enabled.

### 1. Persistent accounts and safe lifecycle

- Introduce a focused classic-script module, proposed `js/treasury.js`, with pure
  queries, account repair, transaction helpers, and bounded summary fields.
  Place it after the helpers it binds and before its callers in `index.html`;
  audit the actual load order rather than assuming the overview is current.
- Add initialization and restore migration at explicit lifecycle boundaries.
- Wire ruler succession, new realm formation, absorption, and player transition.
- Document additive save data and mod-facing helpers. No mandatory save-format
  increase if the current additive repair mechanism is sufficient.

Exit: no duplicate money on reload, succession, or repeated repairs; no read path
mutates accounts or creates characters.

### 2. Shared seasonal ledger and military accrual

- Extract reusable tax primitives with regression coverage for unchanged player
  calculations. Assemble one shared fiscal snapshot and paired transfer deltas.
- Wire necessary building upkeep and active-host accrual, without an all-realm
  daily loop. Freeze class costs once per relevant batch.
- Settle once per season and revalue positive coin once per year. Preserve unpaid
  costs across destruction/disbanding and midseason saves.
- Publish aggregate numeric summaries without routine world-news spam.

Exit: accounting identities and once-only settlement pass the owner-controlled
checks; the shared-pass work counters satisfy the performance contracts.

### 3. Construction and military affordability

- Charge the existing annual AI building chooser and add reserve-aware early exits.
- Add affordable muster/composition/replacement checks to existing military
  decisions. Preserve host limits, rearm delays, seeded ordering, and rebel rules.
- Add bounded retry scheduling and shortfall recovery. Keep tax collection and
  essential defense from deadlocking each other.

Exit: rich/poor AI behavior differs for a clear fiscal reason, without repeated
failed work or permanent collapse from ordinary starting conditions.

### 4. Real counterparty payments

- Wire the audited tribute, ruler gift, land-sale, ransom, and equivalent existing
  payment paths through one debit/credit boundary. Do not add new autonomous
  diplomatic searches to make AI spend more money.
- Revalidate voluntary quotes at commitment, preserve binding saved terms, and
  remove duplicate reward/debit paths. Keep local loot separate from treasury seizure.
- Show affordable AI peace offers and retain existing noncash alternatives.

Exit: named transfers conserve money and cannot be repeated by duplicate events,
save restoration, or repeated confirmation.

### 5. Read-only UI, balance, and integration

- Add a compact treasury section to count-and-higher ruler/realm sheets: available
  cash, accrued obligations, last-period income/expenses, and shortfall status.
  Explain whether figures are current balances, estimates, or the last settled period.
- Use existing money formatting, localization, disclosures, and Back/Close footer
  rules. No live financial dashboard for every realm or map-wide cash badges.
- Tune opening reserves, defensive fallback, and spending thresholds from
  owner-provided deterministic runs. Inspect concentration of wealth, insolvency
  duration, construction rates, and war length, not just aggregate money.
- Update owning design docs and save/mod documentation. Integrate in small,
  reviewable phases under the repository version/changelog workflow; catalog
  regeneration still requires its own explicit owner request.

## Validation and performance gates

Agents author or update tests but do not execute them, install dependencies or
browsers, run syntax/runtime checks, launch servers, or profile the game. All
execution and visual verification remain owner-controlled under
[TESTS.md](../TESTS.md) and AGENTS.md. This plan itself is documentation only.

Proposed focused specs:

- `ai-treasury.spec.js`: count/duke/king/emperor eligibility, religious realms,
  initial funds, signed balances, income, expenses, price revaluation, and pure reads.
- `ai-treasury-transfers.spec.js`: immediate-liege dues, player counterparties,
  nested hierarchies, occupation, affordable offers, and once-only transfers.
- `ai-treasury-lifecycle.spec.js`: legacy repair, repeated load, ruler succession,
  independence, split/absorption, extinct realms, and player inheritance.
- `ai-treasury-spending.spec.js`: construction quotes, poor/rich choices, military
  reserve gates, multiple hosts, accrued bills after destruction, and no oscillation.
- `ai-treasury-performance.spec.js`: structural work counts, quiet-day early exits,
  bounded retries/candidates, snapshot reuse, and absence of court materialization.

Also extend the relevant existing construction, army, war settlement, player-tax,
save, and determinism tests. Register focused `dependsOnRuntime` edges and import
shared journeys from their leaf modules. Exercise real classic scripts in the
browser; do not import game logic into Node. Keep timing thresholds out of flaky
automated assertions; enforce deterministic operation-count bounds there instead.

Profiler rows should separate account repair, fiscal snapshot, hierarchy transfers,
military accrual, settlement, construction affordability, and military decisions.
Counters should include county/building/host reads, accounts settled, hierarchy
edges visited, candidate attempts, rejected purchases, skipped retries, cache hits,
and invalidations. Timers remain opt-in, transient, and balanced in `finally`.

Owner measurement protocol:

1. Compare identical starting saves, seeds, seasons, and browser conditions; include
   file and served origins, normal seasons, and a year-crossing season.
2. First isolate accounting overhead with equivalent pre-spending workloads, then
   measure full behavior separately. A treasury may reduce armies and construction;
   that must not hide inefficient accounting. Conversely, changed wars invalidate
   claims that every elapsed-time difference is direct treasury overhead.
3. Use repeated samples and report median, spread, simulation self time, slowest
   batch/call, and structural counters. Verify that annual rows were actually hit.
4. Proposed review budget: no more than 5% added median simulation time on matched
   workloads, with no more than 10% added year-boundary simulation time. These are
   provisional acceptance targets, not measured predictions; calibrate them against
   owner baseline noise and record any justified revision before integration.
5. Independently reject accidental O(R * C), O(R * B), or per-ruler army scans,
   unbounded history, and daily full-world planning even if a small fixture looks fast.
   Measure save size and load cost as well; account storage must stay O(R), with no
   growth proportional to elapsed turns.
6. Check real mobile interaction and frame stalls separately. Pause expansion to
   later spending phases if the fiscal foundation exceeds its agreed budget.

## Technology-impact decision

Proposed review entry: `ai_realm_treasury`, decision **none**. Territorial receipts,
ordinary cash reserves, and paying for existing capabilities are baseline ruler
accounting; no credible research prerequisite belongs on them. Existing technology
gates for buildings and advanced military capabilities remain authoritative.

Record this decision in `FBDATA.techImpactReviews` and the owning finance/realm
designs when implementing the capability. If implementation introduces a separately
gateable new option, review that option separately; do not use this plan to add AI
banking or backfill unrelated historical capability entries.

## Stage 3 performance follow-up

The mixed-finance fixture measured 2,081.5 ms simulation and 1,403.6 ms armies,
including 548.7 ms supply goals and 133.1 ms military commitment policies.
This differs from the earlier fixture and is not a matched regression comparison.
The follow-up reuses search-local quotes/technology, skips unaffordable paid-market
quotes with zero available coin, shares host fort answers within the orders phase,
and lazily prices only decision-making realms in each military policy. Below-minimum
musters avoid policy creation but retain daily eligibility checks.
Reload `logistics-stress-save-stage3.txt` for the next owner measurement. Inspect
`Supply search: unaffordable quotes skipped`, `Paths: fort cache hits`, treasury host
reads, commitment realm quotes, and the same workload outcomes before interpreting
elapsed-time differences. The owner follow-up measured 1,897.3 ms simulation and
1,217.4 ms armies, with identical reported end-state values and gameplay counters.
Provision quotes fell from 19,775 to 6,352 and treasury host reads from 15,244 to
6,877. This single matched sample reduced simulation time by 8.8%.

Pathfinding remains the largest target at 545.5 ms, including 255.5 ms fort checks.
The next change shares controller friendliness and hostility by realm within the
orders phase, retaining county fort/occupation checks and fresh standalone searches.
`Paths: controller hostility builds` and `Paths: controller hostility hits` expose
the work removed. Its performance effect awaits the next run of the same fixture.
The next two reports lacked both controller counters and retained exactly 104,564
hostility calls. Source inspection found that the war/rebellion fort wrappers
dropped the context and their hostility replacements lost the eligibility marker.
Those wrappers now forward the context and retain the marker, with rebel-host
queries explicitly uncached. The earlier timings do not measure an active cache.
The corrected owner run measured 1,774.9 ms simulation, 1,072.6 ms armies and
361.1 ms pathfinding. Hostility calls dropped to 23,143, with 708 controller builds
and 61,198 hits; reported gameplay outcomes stayed identical. Pathfinding self time
was 240.1 ms. The next optimization replaces candidate path copies with predecessor
links and lazy array materialization, preserving exact time/leg/lexicographic ties
and first-fort fallback results. Its effect awaits a matched owner measurement.
The subsequent sample measured 227.1 ms pathfinding self time and 80,369 arrays
materialized, with unchanged reported routes/workload outcomes. A finer opt-in
breakdown now measures heap operations, ties, leg quotes and fort fallback work
before choosing another optimization. Fallback exploration was absent from the
original node/edge counters; it now has separate counters. Fine timer overhead
means this diagnostic run is not directly comparable to the earlier elapsed totals.
The detailed owner report measured 85 fallback searches with 28,715 frontier pops
and 146,711 edges. Ties caused 80,266 of 80,369 path-array materializations.
The next changes reject strictly dominated fallback candidates before allocation
and compare equal-depth predecessor chains without copying arrays. Equal-cost ties,
first-fort selection and exploration ordering remain unchanged. Compare the new
`Paths: fallback dominated allocations skipped` counter and path materializations
on the same fixture; performance gains await owner measurement. Fine timers remain
enabled during profiled bursts so the next report uses the same instrumentation.
That owner sample measured 2,094.4 ms simulation and 773.2 ms pathfinding, with
341 arrays and 105,701 dominated fallback allocations skipped; reported gameplay
outcomes stayed identical. The next optimization skips edges into already settled
counties before leg quotes and fort checks in both searches. New primary/fallback
settled-edge counters identify the reduction. Per-call heap, tie and quote timers
are now removed, retaining counters and whole-search/fallback timers. The next
elapsed comparison therefore includes reduced profiler overhead; use unchanged
outcomes and reduced quote counts to assess the algorithm separately.

Latest owner lighter-profile run: 1,746.7 ms simulation, 1,062.2 ms armies,
714.8 ms orders and 366.1 ms pathfinding, including 61 ms fallback. Primary and
fallback searches skipped 98,233 and 69,683 settled edges respectively. Total leg
quotes fell from 356,631 to 188,715 (47.1%); arrays remained at 341. Reported
end-state values and gameplay counters matched the preceding mixed-finance runs.
The reduction from 2,094.4 ms includes removing fine timers. Against the earlier
1,724.1 ms lighter-profile sample, overall time is essentially flat in this sample;
the instrumentation is not identical and no repeated-sample speedup is established.
The owner paused further performance optimization here. Preserve these results as
the current checkpoint and proceed to remaining treasury scope when requested.

## Completion criteria

Every eligible active AI realm has exactly one persistent fiscal account. Money
constrains the existing construction, military, and named-payment paths. Transfers
balance, succession does not mint new funds, and the player is never charged twice.
Poor realms retain a bounded recovery path. Fiscal work stays shared and bounded,
with no AI household simulation, recurring whole-world daily scan, or growing ledger.
The owner has the authored regressions, profiling fixtures, and measurement criteria
needed to validate each phase before its integration.
