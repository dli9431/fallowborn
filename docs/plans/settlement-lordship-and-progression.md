# Settlement lordship and the road to Count

Status: Phases 1-6 implemented; Phase 7 partially completed. Regression coverage
authored; twelve owner-local scenario saves prepared. See
[Phase 7 handoff](settlement-lordship-validation.md) for scope and remaining work.
Execution and gameplay validation remain owner-controlled.

## Outcome

Make Baron the first rank at which the household actually governs a named place.
Connect early family property to settlement government and, eventually, county
government:

**Serf -> Freeholder -> manor-owning Gentry -> settlement-ruling Baron -> Count.**

Settlements become the smallest unit of lordship. Counties remain the units of
political territory, diplomacy, movement, occupation, sieges, and war objectives.
A count directly governs some settlements and receives contributions from barons
governing others. Private property remains distinct from governmental authority.

This is a coordinated ownership, economy, building, and progression change. Do not
release a partially converted accounting model. Phase completion means the changes,
documentation, and relevant tests have been authored; execution and gameplay
validation remain owner-controlled.

## Agreed decisions and initial defaults

- A barony conveys actual control of an existing settlement or a newly founded one.
  Both are ordinary routes. Owning a manor does not entitle its family to the town.
- The count retains their seat. Other directly held settlements may be delegated.
  A manor's settlement is preferred only when eligible for a grant.
- Below Baron, the local ruling authority is the home county's actual holder,
  including when that holder has a higher title. Commoners are dependent residents,
  not automatically noble vassals. A territorial baron's liege is that county holder.
- Barons are hereditary and mostly autonomous. They choose and fund routine
  development without requiring the count to approve each project.
- Add a direct-settlement capacity alongside the existing direct-county capacity.
  Like the existing domain limit, excess holdings remain owned but incur penalties;
  this is not a hard prohibition on inheritance or conquest.
- Initial settlement capacity: two, plus one per five Stewardship, plus technology.
  Existing technology effects expanding county capacity also expand settlement
  capacity, with both benefits disclosed. This is a soft technology interaction;
  baseline lordship and founding do not require research.
- Apply the existing 15% multiplicative over-domain penalty per excess settlement
  to personal settlement revenue and available levy, not vassal contributions.
  County and settlement penalties are separate and visibly itemized.
- Preserve existing settlements as their current county holder's direct holdings.
  Existing rulers may begin over capacity and choose what to delegate.
- Founding begins with a protected charter while the household remains Gentry.
  Baron is awarded when the funded settlement is established.
- Initial founding duration is four seasons. Investment equals the existing barony
  gold cost; the existing barony prestige payment is due at establishment. Existing
  settlement grants retain their normal investiture costs. Keep these values in
  balance data and disclose the complete commitment before confirmation.
- County acquisition supports investiture, inheritance, claim-backed challenge,
  and unclaimed usurpation. A claim improves legitimacy; it does not eliminate
  opposition or consequences. Winning without a claim does not create an endless
  penalty state: superior recognition provides a disclosed settlement route.
- No settlement-specific wars or sieges in this implementation.

## Mandatory UI/UX and engineering policies

These are acceptance requirements for every phase, not a final cleanup task.

- Before changing UI, read [the UI policy](../designs/ui.md), the owning system's
  design document, and [the i18n authoring guide](../i18n-authoring.md). Follow their
  current instructions if shared patterns change during implementation.
- Keep cards, lists, and reviews brief. Present the actual decision, immediate
  cost, benefit, obligations, and blocker clearly. Avoid redundant status lines,
  repeated buttons, explanatory walls of text, and unnecessary confirmations.
- Put supporting mechanics and calculation audits in the prescribed hover/focus
  tooltips and touch-accessible Details disclosures. Essential consequences must
  remain visible: loss of control, reduced income, capacity penalties, founding
  commitments, and war risks must not be discoverable only in a tooltip.
- Reuse shared cards, modal history, navigation, styling, and result patterns.
  Preserve keyboard access, visible focus, mobile touch targets, and list position,
  search, filters, selection, and focus on every Back, Cancel, Not now, and return.
- Show gross local return, upkeep, dues, and net return consistently. Distinguish
  private property, direct government, and vassal contributions in plain language.
- Route UI through `FB.T`/`FB.TC`, data through localized display fields, and saved
  outcomes through `FB.msg`. Never store rendered prose or regenerate catalogs
  without a separate owner request.
- Preserve classic scripts, synchronous deterministic simulation, seeded RNG,
  stable load order, offline assets, and `file://` compatibility. No runtime
  dependencies, modules, or build step.
- Read and update each owning design document as its system changes. Register one
  technology-impact review per independently gateable capability: lordship/grants,
  founding, administration expansion, and county challenges. Baseline political
  capabilities use `none`; expanded administration uses `soft`. Existing building
  technology requirements remain effective.
- Author relevant tests in the same phase as each behavior change. Register focused
  runtime dependencies and use leaf helpers. Do not change universal fixtures or
  shared navigation contracts for scenario-local requirements.
- Agents must not execute tests, syntax checks, runtime verification, profiling,
  test installation, or manual/ad hoc browser checks. The owner performs execution.

## Phase 1 — Record and maintain the implementation plan

Dependencies: none.

Tasks:

- [x] Save this plan at `docs/plans/settlement-lordship-and-progression.md` before
  gameplay changes.
- [x] Record the agreed defaults, phase dependencies, UI/UX gate, and test policy.
- [x] Keep the phase checklist and durable implementation decisions current as work
  proceeds. Record owner-approved design changes without silently widening scope.

Completion: this document exists and can guide implementation. It does not assert
that gameplay changes or owner verification have occurred.

## Phase 2 — Ownership, capacity interfaces, and save migration

Dependencies: Phase 1.

Tasks:

- [x] Add saved settlement lordships keyed by stable county and settlement-slot
  identity, with holder, hereditary succession identity, and obligations. Derive
  the supervising count from the county holder. Do not represent baronies as
  independent county realms or put them into county ownership arrays.
- [x] Introduce shared read-only interfaces for settlement holders, directly held
  settlements, construction authority, capacity, fiscal projections, contributions,
  and founding eligibility. Player actions, AI, automation, and UI must share them.
- [x] Centralize lordship mutation and cache invalidation. Keep read projections
  non-mutating and derived caches out of saves.
- [x] Resolve local ruling authority from the actual home county holder, separating
  that authority from patrons and generated story contacts. Remove landless story
  characters' authority to convey titles or settlements.
- [x] Implement hereditary succession and extinction/reversion. Lordships without
  an eligible successor revert to the county holder. Preserve private plots,
  enterprises, and manors on grants, succession, and conquest.
- [x] Add idempotent migration without RNG consumption, replayed payments, or
  promotion rewards. Preserve existing sites, population, buildings, projects,
  wars, and directly held settlements; never hide an established settlement after
  development declines.
- [x] Migrate an existing territorial player baron to one home-county settlement:
  prefer a non-seat manor/home slot, otherwise the first eligible non-seat slot.
  Treat this as an explicit compatibility exception to normal negotiation.
  Exclude religious and temporary offices from hereditary barony migration.
- [x] Update state/save, realm, and province design documentation and public modding
  interfaces. Preserve legacy county APIs where callers still require county scope.

Tests to author: repeated migration/load, both bookmarks, preserved holdings and
private property, old territorial barons, excluded offices, over-capacity rulers,
succession/reversion, actual liege resolution, and RNG stability.

Completion: every established settlement has an unambiguous effective holder;
baronies do not alter county borders; saves round-trip without duplicate grants or
lost assets. Accounting and authority consumers are enumerated for Phase 3.

### Phase 2 implementation record

- Ownership lives in `js/lordships.js`, loaded immediately after the world script.
  County owner/holder arrays remain authoritative for counties; only delegated
  settlements store character holders. Unassigned sites follow the current count.
- Additive save-format-3 `settlementLordships` version 1 stores established floors,
  delegated holders, founding lineage identity, and customary-service obligations.
  Initialization and restore do not charge, award rank, or redistribute county land.
- An old territorial Baron gets a non-seat manor/home slot, otherwise the first
  non-seat slot. Personal/appointed offices are excluded. A custom county without
  an eligible secondary site records `legacyBarony:'unavailable'`; migration never
  steals the seat or manufactures a settlement. Fresh baron scenarios and newly
  earned baronies receive their concrete grants in Phase 4, not via save repair.
- NPC succession uses a saved eligible nominee, then living free descendants in
  generation order, siblings ordered by birth and stable id. Adopted child links
  count. Player lordships follow the selected playable heir; terminal extinction
  reverts them. Court compaction retains holder/founder/nominee references.
- Local lord resolution uses the actual county ruler, including a ruler resident
  elsewhere. Former generated lords remain contacts. County transfers and ruler
  succession refresh authority without transferring delegated property.
- The shared interfaces expose ownership and contribution inputs now. Fiscal
  `amounts` and capacity `limit` are explicitly null with an unintegrated marker;
  founding is explicitly unavailable. Phase 3 supplies and consumes the numerical
  projections; Phase 5 enables founding. These are not zero-income estimates or
  usable grant/build actions, and no partial fiscal integration is enabled.
- Regression authoring: `tests/e2e/specs/settlement-lordship.spec.js` covers both
  bookmarks, save codec/migration, RNG and UID stability, read purity, exclusions,
  seat fallback, succession/reversion, adoption, county transfer, unavailable
  authority, retained sites, rejected grants, and future-schema preservation.
  The existing settlement-map anchor case now explicitly covers pre-migration
  projections; established-site persistence is covered by the new suite.
- UI markup and navigation are unchanged in this phase. The shared presentation
  policy remains mandatory for all later grant, capacity, building, and founding UI.

### Phase 3 consumer inventory

| Consumer | Required integration |
| --- | --- |
| `FB.build`, `FB.buildable`, building ledgers, settlement controls, autobuild | Consume settlement authority rather than county residence or whole-county ownership. |
| `FB.buildingBonus`, `FB.buildingBonusIn`, repeat/limit projections | Separate local returns and personal limits from shared county effects and physical limits. |
| `FB.countyTaxBase`, `FB.playerTaxParts`, income/credit forecasts | Partition the conserved base and replace landless-baron rent with direct settlement returns. |
| AI treasury seasonal snapshots and construction | Fund baron upkeep/projects and pair contributions without counting county receipts twice. |
| Feudal contracts, Parliament aid, vassal-tax projections | Apply customary service to the new holders and prevent repeated taxation of the same transfer. |
| Domain projections and technology bonuses | Complete capacity amounts and enforcement; retain over-cap holdings and show both penalties. |
| Player/realm levies, unit composition, armies and strategic forts | Separate direct manpower from vassal service while preserving county siege rules. |
| Population, markets, modifiers, national research | Retain shared geographical effects exactly once and invalidate on ownership/building mutations. |
| Land/Governance/settlement UI and save explanations | Display actual holders, effect scope, direct returns, upkeep, and contributions from the shared projections. |

## Phase 3 — Construction, income, administration, and military contributions

Dependencies: Phase 2.

Tasks:

- [x] Permit ordinary construction and demolition only in directly held settlements,
  consistently across manual controls, Build, ledgers, automation, and mutation APIs.
- [x] Add settlement-level building projections alongside county aggregates. Grants,
  succession, construction, demolition, ruin, and transfers invalidate affected
  projections without introducing repeated whole-world scans.
- [x] Partition the existing county tax base: distribute its development component
  by conserved population shares and retain each settlement's kind contribution.
  Unmodified settlement bases must sum to the original county base.
- [x] Assign local revenue, upkeep, and recruitment to the settlement holder.
  Remove the flat landless-baron income fallback for territorial barons.
- [x] Use existing default feudal-service terms for baronial dues and military
  contributions. Debit and credit once; never also collect the delegated site's
  full return. Do not recursively tax the same transferred receipt.
- [x] Extend AI treasury accounting to baronies. Construction must use actual
  available funds with obligations and upkeep reserved first.
- [x] Classify every building effect as local, shared county, or national. Local
  fiscal/recruitment effects follow the holder; carrying capacity, attraction,
  resilience, and national research retain their appropriate shared scope and
  apply once. Update tooltips to explain that scope.
- [x] Keep settlement occupancy, county physical limits, and county repeat-copy
  prices. Personal demesne limits count directly held works. Delegation must not
  reset construction history or bypass physical limits.
- [x] Apply settlement capacity and technology to player and AI holders using the
  defaults above. Preserve holdings when capacity falls. Display county and
  settlement penalties separately and exclude vassal contributions from both.
- [x] Retain one strategic county fort and siege target at its existing physical
  site. The county holder retains explicit control of this strategic asset even
  when its settlement is delegated; ordinary buildings follow settlement ownership.
- [x] Feed levies and host composition from direct settlements plus owed service,
  without counting the same manpower as both direct and vassal troops.
- [x] Update development, finance, war, and technology documentation and ledger.

Tests to author: authority enforcement, conserved tax bases, paired dues transfers,
upkeep ownership, shared effects once, capacity penalties and technology, AI
affordability, construction history, fort authority, and nonduplicated manpower.

Completion: projections, actual seasonal settlement, AI accounts, income breakdowns,
construction controls, and muster calculations agree on ownership and contributions.

### Phase 3 implementation record

- Settlement fiscal projections partition county development tax by conserved
  population shares, retain site-kind tax, and assign local works, upkeep, and
  customary contributions to the actual holder. Player forecasts, seasonal
  settlement, AI accounts, and income/levy breakdowns consume those projections.
- Capacity is two plus Stewardship/5 plus national domain technology, with
  separate county and settlement penalties. Received contributions are outside
  both penalties and are not recursively taxed. Offices retain their dedicated
  income rules; territorial barons receive no flat landless rent.
- Building indexes now retain per-site subtotals. Manual construction, demolition,
  automation, AI eligibility, personal limits, and UI controls respect lordship.
  Ruins and county copy history remain physical. The county holder retains the
  strategic fort and its maintenance, even when its site is delegated.
- Local military sources divide between retained troops and owed service; direct
  realm vassals contribute their own troops, not recursively collected service.
  Occupation and rally eligibility remain county-based and include personal baronies.
- National building research is collected once in the sovereign research rate.
  Shared population/resilience effects remain county-wide. County policy upkeep is
  paid once by the count, rather than also by a resident baron.
- NPC baron purses are additive version-1 account records, initially zero, with
  once-per-season settlement, inheritance, real-gold revaluation, and a paid
  construction primitive that reserves obligations and upkeep. Autonomous seasonal
  building choices, new grants, and founding remain in their planned later phases.
- Settlement sheets show holder and local gross/upkeep/dues/net. Capacity losses
  have distinct income/military labels; technology effects disclose both limits.
  Existing tooltip, touch disclosure, and modal history patterns are retained.
- Added `settlement-lordship-economy.spec.js`; updated ownership, treasury,
  governance, and late-game building coverage for the new ownership contracts.
  Test execution and visual/gameplay validation remain owner-controlled.

## Phase 4 — Concrete barony grants and autonomous delegation

Dependencies: Phases 2–3.

Tasks:

- [x] Replace title-only barony petitions with a review of a concrete eligible
  settlement, actual grantor, buildings, revenue, obligations, costs, and chance.
  Keep existing ordinary Gentry and established-house eligibility.
- [x] Exclude the county seat; prefer the family manor's settlement only when
  eligible. Revalidate the offer atomically on confirmation. Cancellation, stale
  offers, or blocked confirmation must not charge resources or grant a title.
- [x] Let counts grant eligible directly held settlements. Show lost direct
  revenue, transferred upkeep, expected dues, and capacity relief before granting.
- [x] Make AI grants prioritize excess direct holdings while protecting the seat;
  ordinary patronage still uses standing, eligibility, and disclosed acceptance.
- [x] Make the exceptional military barony route convey an eligible settlement as
  well. Do not promise an unavailable grant or fall back to landless tier 3.
- [x] Add bounded seasonal baron development decisions using existing seeded AI
  patterns and affordable construction. Do not require routine player approvals.
- [x] Present county government as own settlements plus baronies and net
  contributions. Settlement sheets name holder and count, with clear authority.
- [x] Update realm, holdings, and development docs. Author all new text through i18n.

Tests to author: concrete petitions, protected seats, eligibility and refusal,
stale confirmations, grant accounting, military rewards, AI bounded work and
affordability, UI disclosure, keyboard access, and preserved return state.

Completion: becoming Baron always gives actual settlement control. Delegating
reduces direct returns and obligations and creates a functioning autonomous vassal.

### Phase 4 implementation record

- Concrete detached quotes are shared by ordinary petitions, voluntary grants and
  military rewards. Confirmation rechecks authority, ownership, local works,
  recipient eligibility and fiscal terms; petitions also recheck costs and chance.
- Counts grant through settlement sheets. Reviews disclose hereditary control,
  transferred upkeep, forgone income, contributions and direct-capacity relief.
  County government now distinguishes direct sites and baronies.
- AI rotates through at most 12 realms and 24 barons each season. Over-capacity
  rulers can grant one non-seat site; a considered baron can fund one legal work
  from their own purse with reserves. Cursors and the season guard persist.
- The military route gives land with rank, or offers a purse if land is unavailable.
  Fresh Baron starts require an eligible site. Founding remains Phase 5.
- Added settlement-lordship-grants.spec.js for transactions, military rewards,
  accounting, bounded deterministic development and desktop/mobile return paths;
  updated rank-elevation, gentry-succession and fresh-start coverage.
- Existing lordship technology review expanded with mode none; capacity remains
  soft and construction keeps each building's existing gates. Owning docs updated.

## Phase 5 — Chartered founding and early progression

Dependencies: Phases 2–4.

Tasks:

- [x] Reserve unused stable slots from existing compiled sites; do not edit generated
  settlement data or allow unlimited new sites. Development unlocks capacity rather
  than automatically revealing settlements. Retain authored starting settlements,
  existing saves' established sites, and current town/city upgrades initially.
- [x] Add one active founding project per household and county, saving sponsor,
  reserved slot, funding, and completion date. Disclose the full cost and duration.
- [x] Protect the charter across inheritance and county transfer. Pause completion
  during hostile occupation and resume afterward. Cancellation releases the slot,
  retains Gentry, and does not refund committed construction expenditure.
- [x] Use conserved population machinery to move inhabitants from existing county
  communities at establishment. Do not create people or immediately increase
  county-wide development. Subsequent growth and migration expand the economy.
- [x] At completion, revalidate establishment and the required prestige, establish
  the site, grant hereditary lordship, relocate the household seat, and award Baron
  once. If a completion requirement is temporarily unavailable, retain the funded
  project and clearly show the blocker rather than partially applying the grant.
- [x] Keep private property in the old settlement. Charter acceptance itself leaves
  the household Gentry. Give existing-settlement grants and founding equal visibility.
- [x] Update province, population-related, development, holdings, realm, and save
  documentation, including the replacement of automatic settlement reveals.

Tests to author: slot capacity and reservations, initial settlements, funding,
population/community conservation, cancellation, succession, occupation, blocked
completion, save/load, founding exactly once, old property, and promotion UI.

Completion: a funded household can establish a persistent settlement and become its
baron without free taxpayers, duplicate rewards, or spontaneous competing reveals.

## Phase 6 — County acquisition, challenges, and recognition

Dependencies: Phases 2–5.

Tasks:

- [x] Replace the ordinary petition asking the incumbent count to surrender their
  home county with a petition to an eligible higher ruler. Offer only directly held
  counties that ruler can convey, excluding their seat and last personal county.
  Clearly explain when no county is available.
- [x] Retain inheritance and existing county claims, extending eligibility to
  landed barons. Preserve the family's barony and improvements on elevation.
- [x] Add a county-replacement objective through existing county war/rebellion
  machinery. Distinguish superior-authorized challenges, unauthorized claim-backed
  rebellion, and unclaimed usurpation.
- [x] Resolve superior participation before declaration. Show participants,
  justification, target, political costs, and victory terms. Claims are not immunity
  from superior opposition. Independent counties have no superior to petition.
- [x] Victory transfers the target county title and the defeated count's directly
  held settlements there; preserve unrelated baronies, private property, and
  counties outside the objective. Ordinary county conquest changes baronies'
  supervising count without automatically confiscating them.
- [x] Sanctioned victory gives recognized countship. Unclaimed victory gives
  control with existing aggression consequences and a displaced-dynasty restoration
  claim. Extend explicit revocation, restoration, and succession to lordships.
- [x] Give an unrecognized vassal count a visible superior-recognition petition using
  ordinary county investiture costs and cooldowns. Acceptance removes disputed
  status, not surviving rival claims; refusal leaves control intact. Independent
  victors have no superior-recognition requirement but retain other consequences.
- [x] Use existing rebellion peace and punishment for defeat. Do not automatically
  erase the dynasty or unrelated property. Keep warfare county-based throughout.
- [x] Update realm, war, descent, and relevant political documentation.

Tests to author: available grants and exclusions, inheritance, all justifications,
superior participation, victory transfers, surviving baronies, restoration claims,
recognition/refusal, independent counties, defeat, and declaration-review clarity.

Completion: Count is obtained through an actual territorial transfer with disclosed
legitimacy and consequences, not a title purchase from a landless patron.

## Phase 7 — Integration, policy audit, and owner handoff

Dependencies: Phases 2–6.

Tasks:

- [ ] Audit all ownership consumers: economy, treasury, markets, construction,
  modifiers, levies, armies, population, succession, relocation, offices, automation,
  claims, saves, map details, and retained panels. Remove stale county-wide authority
  and title-only barony assumptions.
- [ ] Finish relevant existing regression updates and focused new specifications.
  Likely existing coverage includes rank-elevation, liege-grants, buildings,
  settlement-engine, population, fealty-rank, vassal-war-laws, vassal-revocation,
  gentry-succession, and technology-impact-gates. Add focused settlement-lordship
  and settlement-founding specs with runtime dependency declarations.
- [x] Author cross-system deterministic/save-load coverage and ensure the technology
  review ledger matches documented behavior. Do not execute validators or tests.
- [ ] Audit every new flow against the mandatory UI/UX section: brevity, immediate
  decision clarity, tooltips/Details, accessible controls, clear effect scope, and
  retained list state. Update shared UI policy only when introducing a shared rule.
- [x] Finish owning design and modding docs and mark authored work in this plan.
- [x] Hand off the changed test files and explicitly state they were not run. Keep
  that execution status out of commit or merge metadata.

Authored in the Phase 7 source pass:

- [x] Prepare twelve independent save imports and a scenario guide in
  `notes/settlement-lordship-test-saves/`, including near-complete founding.
- [x] Fix title-only Governance eligibility and residence/county-wide local
  community-project authority; update their regression fixtures.
- [x] Update the exact technology-ledger regression for all six review entries.
- [x] Add deterministic funded-save replay through completion, population and
  fiscal projections, without executing the authored coverage.
- [x] Review new decision-flow source and clarify the in-game settlement guide.

The broad ownership, regression and UI audit tasks above remain open for the
final exhaustive pass; source findings and owner validation are distinguished in
[the handoff](settlement-lordship-validation.md).

Owner validation checklist:

- [ ] Run desired syntax, support, focused regression, browser, determinism, and
  technology checks under the approved harness policy.
- [ ] Review English and Preview-locale fallback, keyboard navigation, touch
  disclosures, mobile layout, `file://`, and itch.io iframe behavior.
- [ ] Assess map/settlement ownership clarity and complete list/modal return paths.
- [ ] Play through both barony routes and Baron-to-Count progression.
- [ ] Compare direct ownership with delegation: returns, investment pace, upkeep,
  capacity pressure, tall-county technology value, and autonomous baron behavior.
- [ ] Inspect large realms for treasury conservation and excessive management or
  simulation cost, using owner-controlled profiling if needed.

Completion: implementation and regression authoring are coherent across all phases;
owner validation results and any remaining tuning work are recorded separately from
agent-authored coverage. Do not describe unexecuted checks as passed.

## Integration boundaries

No commit or push is implied by this plan. Follow the repository's current checkout
and integration rules; do not create branches or manage worktrees without the
appropriate explicit instruction. At authorized integration, assign the next
appropriate minor version with a short player-facing changelog entry and matching
versioned commit subject. Feature branches leave integration-owned artifacts alone.
Do not regenerate i18n catalogs without a separate owner request. A documentation-only
commit of this plan requires no runtime version bump or artificial gameplay test.

## Historical framing

The uniform rank ladder is a gameplay abstraction across regions and centuries.
Medieval counts could originate as delegated royal officers and later become
hereditary rulers; conquest and recognition were separate political questions.
Barons were not universally the subordinate of a count. The implementation uses
county supervision for coherent gameplay, not as a universal historical claim.

References used during design:

- [Magna Carta Project: clause 21 and the English baronage](https://magnacarta.cmp.uea.ac.uk/read/magna_carta_1215/Clause_21/aca?com=!all)
- [Historical account of the office of count](https://en.wikisource.org/wiki/1911_Encyclop%C3%A6dia_Britannica/Count)
- [Historical account of Anjou and conquest of Touraine](https://en.wikisource.org/wiki/1911_Encyclop%C3%A6dia_Britannica/Anjou)
- [Historical account of regional baronial titles](https://en.wikisource.org/wiki/1911_Encyclop%C3%A6dia_Britannica/Baron)
