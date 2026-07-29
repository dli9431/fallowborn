# Systems-audit implementation roadmap

Date: 2026-07-29

Status: active roadmap for the follow-up work derived from the
[systems audit](../2026-07-27-systems-audit.md).

The numbered `systems-audit-NN-*` filenames define **integration order**. They do
not mean that every part of a later plan must wait for every earlier plan to finish.
The archived [first pass](archive/audit-first-pass.md) is already implemented and is
not part of this numbered queue.

## Ordered plans

1. [Standing](systems-audit-01-standing.md) — one canonical relationship score,
   API, renderer, and succession rule. **Implemented 2026-07-29.**
2. [Governance shell](systems-audit-02-governance-shell.md) — one political
   overview using the Standing API.
3. [Interaction cards](systems-audit-03-interaction-cards.md) — authoritative
   actions for one character or ruler, using Standing and Governance routes.
4. [Large-list readability](systems-audit-04-large-list-readability.md) —
   scalable Work & Enterprises and Network overviews after their row destinations
   are stable.
5. [Plot and diplomacy content](systems-audit-05-plots-diplomacy-content.md) —
   authored content using the consolidated Standing and interaction contracts.
6. [Institution and modifier content](systems-audit-06-institution-modifier-content.md)
   — institution stories and durable consequences, including cross-links from
   step 5.

## Dependency and concurrency map

| Step | Hard integration gate | Work that can run at the same time | Main collision risk |
| --- | --- | --- | --- |
| 01 Standing | None | Read-only inventories, content briefs, and deterministic fixture design for later steps | Standing changes terminology and shared readers/writers consumed everywhere else |
| 02 Governance | Step 01 landed | Step 05 data/event authoring; step 06 modifier briefs and catalog design | `js/ui.js`, Network entry points, realm actions, and shared design docs |
| 03 Interaction cards | Steps 01 and 02 landed | Step 05 data/event authoring; disjoint step 06 data work | `js/ui.js`, target actions, modal history, and Standing presentation |
| 04 Large-list readability | Steps 02 and 03 landed | Step 05 data/event authoring; disjoint step 06 data work | Network and Work rendering, row routes, keyboard order, and modal return state |
| 05 Plot/diplomacy content | Step 01 for data authoring; steps 03 and 04 before final UI integration | Step 06 definitions and institution events when files are explicitly partitioned | `data/events_council.js`, `data/events_world.js`, `js/ui.js`, `docs/MODDING.md`, and shared design docs |
| 06 Institution/modifier content | Step 02 Governance contract; step 05 ids/outcomes for cross-links and final integration | Base modifier definitions and non-overlapping Council/Estates stories may be authored while step 05 is underway | Event packs shared with step 05, Governance/Land presentation, balance, and cross-link ids |

## Safe parallel lanes

After step 01 lands, work can proceed in these lanes:

- **UI consolidation lane:** step 02 → step 03 → step 04. Keep these serial because
  all three restructure `js/ui.js`, Network entry points, navigation history, and
  authoritative row destinations.
- **Plot/diplomacy data lane:** step 05 plot definitions, event prose, declarative
  outcomes, and deterministic tests may be authored alongside steps 02–04. Its
  interaction-card routes and final UI integration wait for steps 03–04.
- **Institution/modifier data lane:** step 06 modifier definitions and
  non-overlapping institution stories may begin once the step 02 Governance summary
  contract is fixed. Cross-links and final integration wait for step 05.

Steps 05 and 06 may run concurrently only with explicit file ownership. The safest
split gives step 05 the plot/diplomacy packs and step 06
`data/modifiers.js` plus `data/events_parliament.js`; one owner at a time handles
shared files such as `data/events_council.js`, `data/events_world.js`,
`docs/MODDING.md`, and `docs/designs/ui.md`.

## Work that should remain serial

- Do not implement steps 02–04 against a moving Standing API or mixed
  Regard/Favor/Opinion terminology.
- Do not implement Governance, interaction cards, and Network list restructuring
  simultaneously in separate branches; their `js/ui.js`, entry-point, and Back-stack
  changes are one dependency chain.
- Do not finalize step 05 target selection before interaction-card routes are stable.
- Do not finalize step 06 cross-links until step 05 ids, outcomes, and event contexts
  are stable.
- Do not regenerate or hand-merge i18n catalogs on feature branches. Each integration
  follows the repository's main-merge catalog and version workflow.

## Recommended delivery schedule

1. Finish and integrate step 01.
2. Implement step 02 while step 05's data-only work begins separately.
3. Implement step 03, then step 04, while disjoint step 05 content continues.
4. After the Governance contract is stable, begin step 06 definitions and
   non-overlapping institution content if ownership of shared event files is clear.
5. Integrate step 05 after the UI consolidation lane is complete.
6. Connect step 05 outcomes to step 06, then integrate step 06.

Planning, source inventory, test authoring, and deterministic fixture construction can
start earlier than these gates when they do not assume unfinished APIs or edit files
owned by an active implementation.
