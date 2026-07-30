# Plan: large-list readability for Work and Network

Date: 2026-07-29

Status: **implemented and archived 2026-07-29**. Step 4 of the
[systems-audit roadmap](systems-audit-00-roadmap.md), after
[interaction-card consolidation](systems-audit-03-interaction-cards.md). The shared
defaults are a 12-row surface threshold and a 5-routine-row initial section budget.

Related design:
[UI](../../designs/ui.md),
[characters](../../designs/characters.md), and
[holdings](../../designs/holdings.md).

## Goal

Keep **Work & Enterprises** and **Network** easy to scan as a dynasty accumulates
household workers, enterprises, retainers, contacts, vassals, and other named
relationships.

The systems-audit first pass reduced repeated decisions through Household Plan,
Staff Best, policies, and focused management links. Interaction cards will make
the actions for one person or ruler predictable. Neither change by itself solves
the overview problem reported by players: every additional row still receives
similar visual weight, so important exceptions disappear inside a long list.

This is a presentation and navigation pass. It does not add a relationship graph,
change household or enterprise rules, automate another decision, or merge the
records shown by these surfaces.

## Questions each surface must answer

### Work & Enterprises

Without reading every row, the player should be able to answer:

- How many household members can work, and which ones need a choice?
- Which careers or offices are already settled?
- How many enterprises are staffed, idle, or blocked from staffing?
- Which worker-enterprise assignments deserve attention now?
- How do I reach the existing detailed career, office, enterprise, or staffing
  control?

### Network

Without scrolling through every relationship, the player should be able to answer:

- Which section contains the person or realm I am looking for?
- Which relationships have an active commitment, opportunity, warning, or vacancy?
- How is a person tied to the household when they qualify for more than one label?
- Which entries are routine context and which need a decision?
- How do I reach the authoritative character, ruler, Governance, Council, Estates,
  work, or finance surface?

## Shared presentation rules

Use one small, render-only list grammar across both surfaces:

- section header with a localized title, total count, and needs-attention count;
- native expand/collapse control with `aria-expanded`;
- stable semantic groups, with needs-attention entries before routine entries;
- compact row summary followed by one authoritative detail route;
- optional exact-text search when a surface crosses a single documented large-list
  threshold;
- focused filters for **All** and **Needs attention**, plus only the
  surface-specific states that materially help scanning;
- an explicit **Show all {count}** path whenever progressive disclosure limits the
  initially rendered routine rows;
- empty and no-result states that distinguish “nothing exists” from “the current
  filter matches nothing.”

The large-list threshold and initial routine-row budget must be shared constants
chosen during the fixture review in phase 1. Do not scatter different unexplained
cutoffs across sections.

Search is literal and local to the open surface. It may match localized visible
labels, proper names, occupations, enterprise names, offices, relationship roles,
and realm names. It is not fuzzy search and does not inspect hidden biography,
event, or save data.

## Stable ordering

Rows must not jump around merely because a daily value changes.

Order by:

1. needs-attention group;
2. stable role or state priority within the surface;
3. the surface's existing meaningful order where it has one;
4. stable character, enterprise, or realm identity as the final tie-breaker.

A row may move when its semantic state changes, such as an enterprise becoming
idle or a vacancy being filled. Income, Standing, cooldown days, and other changing
numbers must not continuously reorder otherwise equivalent rows.

## Work & Enterprises

Keep **Household work** and **Family enterprises** as distinct ownership sections.
Do not combine a person and an enterprise into one shared record.

### Household work

Give each eligible person one compact row containing:

- identity and household/retainer role;
- current career, apprenticeship, religious standing, or office;
- enterprise assignment when present;
- one short state label such as assigned, available, former calling, or blocked;
- the existing route to the detailed work control.

Group actionable omissions and invalid or newly eligible states under **Needs
attention**. Routine established careers and assignments belong under **Assigned**.
People who are visible for explanation but cannot currently be managed belong
under **Unavailable**, with the authoritative reason.

Do not infer that every unassigned person is a problem. The existing career,
age, household-management, landed-rank, religious, and retainer gates determine
whether attention is actually needed.

### Family enterprises

Begin with a compact summary of:

- total owned enterprises;
- staffed and idle counts;
- approximate current seasonal yield;
- unresolved staffing count.

Order idle or otherwise actionable enterprises before staffed enterprises. Each row
shows enterprise identity, settlement where relevant, worker or idle state, lock
state, live yield, and the existing management route. **Staff all idle
enterprises...** remains the bounded bulk action; filters and grouping never perform
staffing themselves.

Repeated copies of one enterprise type remain exact owned instances. Presentation
may group or summarize them for scanning, but opening and mutating an entry must
resolve the exact enterprise uid.

## Network

Preserve the four semantic sections:

1. Household;
2. Connections;
3. Trade & Guild;
4. Realm.

Each section receives a count and can collapse independently. An active commitment,
warning, vacancy, or other needs-attention entry must remain visible in the section
summary even when routine rows are collapsed.

Within a section, render a named person or realm once and combine their relevant
role labels into that row. The same target may still appear in two different
sections when the contexts are genuinely different, such as a household worker who
also carries a guild relationship. Do not erase that distinction merely to remove
all repetition.

After interaction-card consolidation:

- person rows route to the authoritative character card;
- political ruler or realm rows route to the authoritative ruler/realm card;
- the player's own feudal overview routes to Governance;
- focused management links continue to Work & Enterprises, Household Plan, Council,
  Estates, Finance, or other owning surfaces.

Network remains an overview. It must not accumulate duplicate action buttons from
the cards it links to.

## Household Plan boundary

Household Plan is the authoritative cross-system table for managing dependents.
This pass may reuse its compact person summary, search, counts, and stable grouping,
but must not turn Work & Enterprises or Network into another seven-column Household
Plan.

If shared list primitives expose a Household Plan scaling defect, fix it in the same
pass and cover it with the same large-household fixture. Otherwise keep the plan's
existing desktop table and mobile card behavior unchanged.

## View state and navigation

Filter, search, collapse, and scroll state are UI-only.

- Never write them to the game save or consume RNG.
- Preserve them while a player opens a nested character, ruler, enterprise, or
  management sheet and then returns through modal history.
- A fresh top-level open may restore documented browser-local preferences, if the
  implementation chooses to offer them, but defaults must remain usable without
  configuration.
- Re-render counts from live authoritative state after a mutation.
- Hidden rows are absent from number-key assignment and the accessibility tree.
- Typing in search must not trigger panel or number-key shortcuts.

## Responsive and accessible behavior

- Desktop and mobile use the same grouping, counts, filters, and ordering.
- Narrow layouts stack metadata without hiding the state that caused an entry to
  need attention.
- Section headers and show-all controls are native buttons with explicit accessible
  names and state.
- Focus moves predictably when a group collapses or a filtered row disappears.
- Search has a real label and a clear action; filter state is not indicated by color
  alone.
- Counts and labels tolerate Preview-locale expansion.
- Long proper names wrap without forcing horizontal page scrolling.

Virtualization and pagination are out of scope unless fixture profiling shows an
actual rendering problem. Progressive disclosure should solve scan density while
keeping the DOM, keyboard order, and screen-reader behavior straightforward.

## State and mechanic boundaries

Do not:

- add saved roster, favorite, tag, or relationship-list records;
- redefine household membership, career eligibility, enterprise staffing, or
  retainer capacity;
- infer new Standing or relationship state from UI group membership;
- make hidden entries inactive or excluded from simulation;
- duplicate interaction-card gates or action mutations;
- store rendered or localized list models;
- change save format 3.

All counts, groups, labels, and needs-attention states are deterministic derived
views over the existing APIs.

## File-level implementation

- `js/ui.js`: own list view models, shared section/row controls, filtering, search,
  stable ordering, navigation-state restoration, and the Work/Network integration.
- `css/style.css`: add compact responsive rows, section summaries, filter controls,
  wrapping, and visible keyboard/focus states.
- `js/economy.js` and `js/model.js`: change only if an existing authoritative reader
  is missing; do not move UI grouping into simulation code.
- `docs/designs/ui.md`: replace the planned-follow-up note with the implemented
  behavior and exact defaults.
- `tests/e2e/specs/large-list-readability.spec.js`: cover large household,
  enterprise, relationship, keyboard, mobile, and non-mutation cases.

## Implementation phases

1. Build deterministic fixtures at below-threshold and clearly large sizes; inventory
   every current Work and Network row, action, duplicate target, and ordering rule.
2. Choose and document the shared threshold and routine-row budget from those
   fixtures.
3. Add the render-only section, count, filter, search, and stable-order helpers.
4. Convert Work & Enterprises without changing its career, office, enterprise, lock,
   purchase, or Staff Best mechanics.
5. Convert Network after its shortcuts use the consolidated interaction cards and
   Governance routes.
6. Reuse the primitives in Household Plan only where the fixture proves a scaling
   defect.
7. Update the UI design and player documentation for the final controls.

## Tests to author

Add focused Playwright coverage without running it as an AI coding agent:

- a small household retains the concise ordinary layout;
- a large household exposes accurate total and needs-attention counts;
- unassigned-but-ineligible people are not falsely marked as needing attention;
- idle enterprises precede staffed enterprises and Staff Best remains explicit;
- duplicate enterprise types still open the exact uid;
- each Network section counts, collapses, filters, and restores independently;
- one target with several roles is not repeated within a section;
- genuine cross-section roles remain visible in both relevant contexts;
- search matches visible localized labels and proper names, clears correctly, and
  reports no results;
- hidden rows cannot be activated by number keys;
- search typing does not trigger shortcuts;
- Back restores the prior filter, collapse, focus, and useful scroll position;
- narrow/mobile rows wrap without horizontal page scrolling;
- opening, filtering, collapsing, searching, and returning do not mutate game state
  or RNG state.

## Completion criteria

- Large Work & Enterprises and Network fixtures remain scannable without reading
  every routine row.
- Needs-attention entries and their counts are visible before routine entries.
- Every original entry and management route remains reachable.
- Sorting is stable and changes only for meaningful semantic state transitions.
- Interaction cards and Governance remain authoritative for actions and political
  overview.
- The pass adds no gameplay state, balance change, automatic decision, or save
  migration.
