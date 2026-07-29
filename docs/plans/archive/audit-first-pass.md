# Plan: systems audit first pass

Date: 2026-07-28

Status: implemented

This first implementation tranche was derived from the
[systems audit](../../2026-07-27-systems-audit.md). The pass consolidates existing
administration and removes repeated clicks; it does not add another simulation layer.

## Goal

Reduce the highest-frequency dynasty administration burden while giving related
systems predictable homes. The first pass prioritizes household decisions because a
three-click action repeated across every child, grandchild, worker, and generation is
more burdensome than a deeper action used once or twice per reign.

Automation must be bounded, opt-in, and explainable. Consequential political,
financial, marital, and military commitments remain deliberate.

## Consolidate first

### 1. Household Plan

Create one Household Plan table using existing mechanics. Each managed person is a
row, with columns for:

- education subject;
- school, tutor, or other instruction;
- apprenticeship, adult career, or religious advancement;
- enterprise, household position, or office assignment;
- arranged match status and recommendation;
- equipment status and Equip Best action.

Selecting a cell opens the existing detailed picker. The table is an overview and
common entry point, not a replacement for character sheets or the underlying progress
records.

### 2. Shared person-assignment component

Education tutors, enterprise workers, household retainers, and council officers all
ask the player to select an eligible person for a role. Use a common assignment card
that can display:

- candidate and eligibility;
- expected benefit or yield;
- cost or pay;
- current career or assignment;
- relevant Standing;
- replacement or dismissal consequence.

The component is shared; the mechanics are not. A council office does not become a
paid household job, and an enterprise worker does not acquire political authority.

Implemented in the first pass as `UI.personAssignmentCard`, a render-only native
button used by tutor, enterprise-worker, retainer, and council-officer selection.
Each caller supplies its own eligibility, benefit, cost, current-assignment,
Standing, and consequence text and continues to invoke its existing mechanic.

### 3. Shared asset and effect presentation

Standards, holdings, freehold plots, enterprises, buildings, items, modifiers, and
technology all communicate a cost followed by a persistent effect. Give them common
summary rows:

`owner -> scope -> setup cost -> recurring cost -> effect -> transfer rule -> expiry`

Reuse cost, effect, source-ledger, affordability, and batch-action renderers. Keep
each asset's ownership state and rules separate.

Implemented as the render-only `UI.assetEffectSummary`, in the audit's fixed
owner → scope → setup cost → recurring cost → effect → transfer rule → expiry
order. Standards, permanent holdings, freehold plots, enterprises, buildings,
items, modifiers, and technology now supply their own live values to the shared
row. Money costs share one affordability cue, seasonal money points to the
existing resource ledger, and the responsive layout stacks without changing any
asset's owning state or mutation API.

### 4. Ongoing Commitments summary

Provide one summary with direct edit links for:

- current life focus;
- personal-attention assignment;
- political-attention assignments;
- active research projects and automatic research policy;
- active travel, contracts, or other long-running commitments where useful.

These remain separate capacity systems. The summary removes hunting across screens; it
does not make the allocations interchangeable.

Implemented in the Deeds panel as the render-only `UI.ongoingCommitmentsHtml`.
The responsive ledger always shows the daily focus, personal attention, and
national research, adds political attention when the player has that capacity,
and adds active travel and financial contracts when present. Its native-button
rows route to the existing focus group, character or Network relationship
surface, Foreign Policy picker, Technology sheet, travel deeds, and Finance
sheet. Travel visibly pauses the daily focus instead of allowing it to be
changed, and no commitment records or capacities are merged.

## Automate in the first pass

### 1. Household education policy — complete

Allow an opt-in default education subject and an instruction policy such as "best
available under this seasonal fee cap."

- Apply only to empty or newly eligible choices.
- Respect per-child overrides.
- Do not replace a valid explicit choice silently.
- Notify the player when the policy makes or cannot make a choice.

### 2. Staff idle enterprises â€” complete

Add a **Staff all idle enterprises** preview.

- [x] Maximize eligible expected yield.
- [x] Do not move explicitly locked workers.
- [x] Show every proposed worker-to-enterprise assignment before applying.
- [x] Leave unresolved enterprises visible with the reason they could not be staffed.

### 3. Equip Best — complete

Add a deterministic **Equip Best** action for one character, using the existing
successor-equipment optimizer where possible.

- [x] Preserve manual slot selection.
- [x] Show which items will move and from whom.
- [x] Keep the household-wide preview deferred until the per-character action is trusted.
- [x] Do not silently rearrange the household after every loot event.

Implemented on each managed character’s Equipment sheet. **Equip Best** uses the
succession optimizer without consuming RNG, previews the complete proposed outfit
and every armory or wearer-to-wearer movement, then requires an explicit no-day
apply. The reviewed plan is rejected if assignments change before confirmation;
manual slot controls remain beside it and no household-wide or loot-triggered
automation was added.

### 4. Descendant match assistant — complete

Recommend a match for an eligible child or grandchild using player-set limits:

- minimum acceptable station;
- maximum dowry;
- maximum prestige or gold expenditure;
- any existing doctrine, kinship, faith, age, or compact constraints.

The default is a recommendation and notification, not an automatic proposal or
marriage. Full automatic selection may be an explicit later policy.

Implemented as an opt-in saved policy above the Household Plan. It reviews the
ordinary three persistent families for each eligible resident child or grandchild,
filters them through minimum station, dowry, immediate-gold, prestige-requirement,
current-resource, faith, close-kin, doctrine, and royal-compact gates, then ranks the
remaining choices by station and lower expense. The preview names every affected
descendant and exact terms before saving. A saved recommendation is marked in the
Household Plan and moved to the top of the ordinary match picker, with a Chronicle
notice when it is first made or no family qualifies. The assistant never pledges,
spends, passes a day, or disables a manual choice outside its limits.

### 5. Buy remaining manor plots — complete

Add **Buy remaining plots here** when several purchases are needed to reach the manor
threshold.

Before confirmation, show:

- number of plots;
- total price;
- resulting seasonal yield;
- resulting cluster and manor progress;
- money remaining after purchase.

This batches identical purchases without automating the decision to invest or the
choice of settlement.

Implemented in the existing settlement land market as a separate, native-button
preview whenever at least two plots remain. The reviewed batch is revalidated and
applied atomically, records one Chronicle entry, and leaves the one-plot purchase
available for manual investment.

## Next consolidation tranche

These follow the household pass rather than expanding its scope:

1. A **Governance** shell combining access to Estates, Royal Council, liege terms,
   domain and vassal summaries, vacancies, motions, and direct realm actions. Keep
   obligations and crown authority mechanically separate.
2. Consistent character and realm interaction cards for Standing, gifts, attention,
   envoys, pacts, alliances, courtship, and war causes. Implement the unified
   [Standing plan](../systems-audit-01-standing.md) as part of this work.
3. A single **Trade Venture** setup and review flow, owned by Finance, with `dispatch`
   or `accompany` chosen last. Travel remains a shortcut into the same flow.
4. One military status surface for host, stance, route, logistics, enemy or camp,
   objective, and next seasonal decision. Ordinary and great holy war settlement
   rules remain separate.

## Later automation candidates

Defer these until the household pass has been tested in a large, multi-generation
dynasty:

- domain cleanup recommendations with before/after tax and levy;
- recommendations for vacant council seats;
- household-standard target levels constrained by reliable income and a gold reserve.

These are lower-frequency or more expressive decisions and should begin as previews.

## Actions that remain deliberate

Never silently automate:

- borrowing, pledging, early repayment choices, investment risk, debasement, or
  recoinage;
- war declarations, independence, fealty, title acceptance, revocation, or permanent
  relocation;
- starting or breaking courtship, accepting a match, naming a friend or rival,
  divorce, or royal compacts;
- great-holy-war vows, withdrawal, or settlement claims;
- selling or gifting unique items;
- dismissing people from service.

The broad event **Autoresolve everything** option can remain an explicit delegation
mode. Other automation should use constrained policies, previews, explicit locks, and
notifications.

## Systems to leave alone during this pass

Do not rebuild automation that already works:

- persistent focuses and attention directions;
- autonomous travel, couriers, pregnancies, contracts, work, and army movement;
- automatic loan maturity and contractual default;
- event automation categories and resolution styles;
- defensive and offensive host stances;
- prudent seasonal autobuild;
- automatic research selection;
- succession equipment optimization;
- automatic handling of lapsed standards, paused school payments, retainer arrears,
  and invalid assignments.

Also leave the seasonal resource formulas, event interpreter, travel mechanics,
building mechanics, technology graph, war operations, saves, and rendering systems
unchanged except where a shared summary or entry point must call them.

## Suggested delivery order

1. [x] Household Plan read-only overview with links to existing pickers.
2. [x] Shared person-assignment component.
3. [x] Household education policy.
4. [x] Enterprise-staffing preview.
5. [x] Per-character Equip Best.
6. [x] Manor plot batch purchase.
7. [x] Descendant match recommendation.
8. [x] Shared asset/effect rows and Ongoing Commitments summary.
9. [x] Test with a large household across childhood, adulthood, marriage, death, and
   succession before starting the governance tranche.

## Completion criteria

- A player can inspect every managed dependent's important status from one screen.
- Empty education, instruction, and enterprise assignments are visible without
  opening characters individually.
- Policies never overwrite explicit locked choices.
- Every batch or recommendation previews costs and affected people before applying.
- The player can still make every underlying choice manually.
- The pass reduces repeated administration without changing simulation balance or
  silently making consequential decisions.

## Post-implementation follow-up

Later player feedback confirmed that reducing repeated actions did not fully solve
scan density: Work & Enterprises becomes less readable as household work and enterprise
rows accumulate, and Network has the same problem with many characters. The separate
[large-list readability plan](../systems-audit-04-large-list-readability.md)
addresses that presentation gap after interaction-card consolidation without
reopening this pass's mechanics.
