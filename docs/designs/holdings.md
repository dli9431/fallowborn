# Holdings (commoner property)

**Commoners play tall through holdings and maintained standards.** `FBDATA.holdings`
(map_data.js) is family property for tiers 0–2, bought with gold through the
permanent-property section of the household deed
(`FB.buyHolding`/`FB.holdingAvailable` in actions.js). `player.holdings` persists across
generations; bonuses via `FB.holdingBonus` (gold/prestige/piety per season, battle, edu,
health). Events gate on `holdings`/`notHoldings` and use `holding`/`loseHolding` effects.
Definitions marked `eventOnly` are excluded from the purchase picker. Rights of Common
are such a holding: the Old Custom landmark chain can secure the family's heritable
pasture, fuel, and water rights, and those rights then pass to later generations.
Succession snapshots the family's holding ids before personal and office cleanup and
restores them after those hooks, so ordinary death, retirement, and papal custody cannot
turn an owned holding back into a purchase.

**Customary Serf Tenure is distinct from owned property.** Tier 0 serf households do not
own their land; they hold customary strips and dwelling use under an active tenure archetype
(`latin_manorial`, `irrigated_fellah`, `pagan_household_service`, `dependent_farming`).
Regional packages also include `pastoral_steppe`, `woodland_dependence`, and
`norse_coastal_service`.
This tenure records recognized rights (such as post-harvest gleaning or irrigation turns)
and recurring customary service obligations (week-work, boon harvests, multure, tithes,
cartage). Customary tenure is held by custom rather than bought as property, and lawful
freedom ends all personal service obligations.

A change of local or political authority does not reselect the household's regional
tenure. It can review at most one named term: preserve everything, add one bounded
archetype-authored service, commute an eligible labor duty to a saved coin due, challenge
one current right, or restore one historically challenged right. Amendments are recorded
as semantic tenure history rather than property, modifiers, or hidden ownership changes.

Tier-0 Toil is harvest and customary household return rather than a fixed hired wage. Its
daily credit and expected seasonal income, plus both outcomes of the farming-year Harvest
event, use the home county's live provisions price at 75% exposure
(`1 + (price - 1) * 0.75`). The strongest immediate local disruption then applies: any
army quartered there leaves 90% yield, a hostile host 65%, opposing hosts joined for battle
50%, and an active siege or occupation 40%. The market price already carries seasonal army
demand and saved war shocks; the direct factor represents trampled fields, lost work,
seizure, and danger now, so scarcity does not erase the damage. These values are balance
knobs rather than save state.

Technology impact: `serf_harvest_conditions` is `none`. Local prices and damage to an
ordinary dependent household's work are baseline economic conditions, not an optional
capability unlocked by sovereign research.

Freedom does not convert customary strips into owned plots. Purchase, negotiated
manumission, or an Old Custom victory closes the personal tenure and raises the household
to freeholder; flight closes it without a lawful charter. In every case, ordinary
freehold land must still be acquired through the existing plot system.
Paid freedom covers the living family: the head pays the base share, living spouses add
a half share each, and every living descendant adds a quarter share, even after marriage
or departure into another household. Negotiated terms freeze the covered family and its
price when offered.

`FBDATA.householdStandards` (`data/economy.js`) is deliberately different from
property. Board, wares, quarters, luxuries, transport, and profession-specific work
outfits advance one purchased level at a time. Each level has its own setup cost,
seasonal upkeep, rank gate, and complete current-level effect. Levels pass through
succession in `player.householdStandards`, but cannot be sold, pledged, or used as
event holdings. Level one is generally open to serfs, level two to freeholders, and
level three to gentry; transport starts at freeholder rank. The five general categories
also have Baron-grade and King-grade levels with substantially larger setup and upkeep
costs. Their effects remain household-facing: health, education and research, retainer
space, prestige, and faster travel.

Three `kind:'ruler'` establishments form a separate ruler catalogue. The household guard
adds flat levy, men-at-arms, and field-battle power; the scholarly household adds flat
national research; and the household chancery adds domain capacity. Each has Baron,
Duke, and Emperor levels gated by the military, learning, or governance technology it
represents. These are discretionary gold sinks and never add income. They have no title
floor, remain saved but dormant below Baron rank, and return without a second setup cost
if the dynasty regains landed authority. This expansion is hard-gated in the prospective
technology ledger (`ruler_household_establishments`), with the existing household
catalogue as its ungated fallback.

`FB.ensureHouseholdStandards` lazily creates and clamps the JSON-safe saved map, so old
format-3 saves begin at level zero. `FB.householdStandardEffects` supplies mortality,
education, retainer-capacity, prestige, travel, research, domain, levy, men-at-arms,
battle-power, and profession-output modifiers.
`FB.householdStandardsUpkeepParts` and `FB.householdStandardsUpkeep` expose only active
upkeep. Work outfits are dormant without an eligible resident worker (or a retainer
staffing a matching enterprise). Living standards and eligible work outfits remain active
after the dynasty becomes landed, so their benefits and upkeep continue at ruler ranks.
General standards gain a title floor when reduced: level 1 for a Baron, level 2 for a
Count, level 3 for a Duke, level 4 for a King, and level 5 for an Emperor. Work outfits
may still be reduced to baseline because vocational tools do not express title dignity.
This ruler-rank expansion has technology impact **none**
(`landed_household_standards`): rank does not add a second technology lock, while every
standard level continues to enforce its existing authored `requiresTech` requirement.

At a season boundary, ordinary household and livelihood income settles first.
`FB.householdStandardsSeason` then pays maintained standards before retainers,
schooling, and finance. When the purse cannot cover the total, reducible levels lapse:
luxuries, wares, transport, quarters, board, then active work outfits. Work outfits lose
the highest active level first, with definition order breaking ties. A landed ruler's
remaining title-floor upkeep is compulsory and may leave a cash shortfall. A lost or
voluntarily reduced level gives no refund and must be bought again at full setup cost.
Every purchase and lapse writes a locale-neutral durable Chronicle descriptor.

The household sheet is a compact catalogue rather than a stack of complete
asset ledgers. Each maintained living standard or work outfit is one three-part
stepper: a minus button on the left, a read-only current-state card in the
middle, and a plus button on the right. The card keeps the icon, name, current
level, current or next effect, next setup price, and live upkeep visible in the
same scan pattern as the technology catalogue; it is no longer a large
navigation action. Ruler establishments use the same control in their own section, so
their realm effects and rank or technology blockers remain visible before purchase.
Self's read-only active-standards summary wraps each icon-and-level pair as one
indivisible item, keeping dense established households legible in the narrow panel.

Hovering or focusing the plus button shows the complete next-level ownership,
scope, transfer, expiry, affordability, and projected-finance terms in the
shared tooltip. Activating it purchases one level immediately after engine
revalidation and refreshes the same household sheet. A blocked plus remains
focusable with `aria-disabled` so its exact reason is still disclosed. Hovering
or focusing the minus button shows the level that will be lost, the no-refund
rule, the resulting effect and upkeep, and the projected finances; activating
it gives up one level immediately. The minus button is disabled at baseline.
After succession to a minor, Better the Household remains available whenever at least one
inherited standard can be reduced. A child household head may give up those inherited
levels to control upkeep, but cannot buy a higher standard or permanent holding until age
16; the engine revalidates both spending paths. Landed rulers use the same reduction
control subject to the title floor above. This recovery control has technology impact
**none** (`minor_household_standard_reduction`): abandoning an expense within the limits
of household station needs no innovation.
On touch, tablet-width, and short layouts, button hover tooltips are suppressed
and one visible 48 px `?` control on the current-state card toggles both adjustment
breakdowns inline; roomy pointer layouts hide that disclosure control. There are
no separate standard-detail or confirmation sheets. Permanent property
continues to use its distinct compact purchase and owned rows. This is presentation
only; the level map, purchase eligibility, no-refund reduction, and seasonal lapse
order remain authoritative.

Profession outfits multiply positive vocational focus resources, resident-family wages
or clerical yield, and matching staffed-enterprise output. Soldier outfits affect paid
work only. Permanent Pack Mule, Fine Tools, Good Mail, Warhorse, and other holding/item
effects remain separate productive or combat property.

**Freeholders and gentry assemble family land.** Repeatable plots live in
`player.landPlots` as `{provinceId, settlement}` and pass to heirs. The Buy Freehold Land
deed places each purchase in one of the home county's stable derived settlements. A
completed frontier homestead (the *Withdraw into the wastes* journey — see
[travel.md](travel.md)) grants its starter plots through exactly this table at the
materialized county's head settlement: `balance.frontierSettlementPlots` records, no
gold spent, no manor progress implied beyond the plots themselves. Every
plot supplies seasonal produce through `FB.landYield`; plots consolidated in the same
settlement receive `balance.landConsolidationBonus` for each additional plot in that
holding. A settlement is capped by `balance.landPlotMaxSettlement`.

`FB.manorSite` requires `balance.manorPlotRequirement` plots in one settlement. Once the
family also has `balance.manorPrestige`, Declare a Manor records that site on
`player.manor` and raises the player from Freeholder to Gentry. This replaces the former
one-step manor purchase while preserving its total baseline cost: five plots at 120 gold
each. The Free Farmer start owns its promised first plot. Legacy `has_farm` saves become
one plot lazily, and legacy tier-2 saves built around the old assumed manor receive a
complete holding unless their station came from the abbot/qadi path.

Declaring the first manor does not close the family land market. Gentry may continue
buying plots one at a time in the home county up to each settlement's ordinary cap.
Manor declaration remains a one-time Freeholder promotion; titled ranks use county domains
and buildings instead of buying commoner freehold plots. The technology impact is **none**
(`gentry_freehold_expansion`): ordinary local land purchases need no credible research
gate.

The land market keeps each settlement purchase compact: its action face shows the
settlement and plot progress plus only the live cost and before/after seasonal yield.
The full dynastic ownership, exact site, affordability, upkeep, inheritance, and
permanence terms move to the shared desktop hover/focus tooltip. Unaffordable and
complete single-plot actions remain focusable for that disclosure but expose
`aria-disabled` and revalidate without purchasing when activated. Permanent holdings
and enterprises retain their separate pledge and staffing rules.
Each activation buys exactly one plot and refreshes the same market immediately. The
market has no batch-purchase action or intermediate confirmation sheet, keeping every
permanent land acquisition explicit and consistent.

Land clearing and tangible holding purchases use their authored `marketBasket` at the
home county's live commodity quote and round upward to whole gold. The manor threshold,
inheritance, income, and collateral value remain real quantities rather than being
repriced. Untagged mod holdings retain a market multiplier of one.

Related: [development.md](development.md) for the tier-3+ equivalent (buildings),
[realms.md](realms.md) for tiers.

**Productive property is an enterprise, not a unique improvement.**
`FBDATA.enterprises` (`data/economy.js`) defines repeatable family businesses. Instances
live in `player.enterprises` as
`{uid,type,provinceId,settlement,workerId,workerIds?,workerLocked?,level?,devAppliedLevel?}`
and pass to heirs. `workerId` remains the first assignment for compatibility;
`workerIds` is present only when more than one person is assigned. Missing `level` means
the baseline enterprise.
Acquisition order remains array order and authored `cost` is the stable base-value sort
key; neither needs a new save field. Work & Enterprises derives localized name, exact
settlement, live yield, and staffing state when sorting or grouping instances. These are
session UI choices. Household Plan reuses the selected sort for assignment labels, so
drilling between the screens cannot imply a different enterprise order.
The Work & Enterprises deed remains available to adult protagonists at every station:
landed rulers cannot resume a personal calling, but they can still manage family workers,
owned businesses, and qualified local hires. Local hiring is a baseline labor contract;
individual enterprise acquisition and upgrade requirements retain their authored technology
gates.
The `enterprise_child_labor` technology-impact decision is `none`: a child who
has reached the matching calling's apprenticeship age may perform ordinary
family labor without national research, while the enterprise and its upgrades
retain their own authored technology requirements.
`workerLocked:true` preserves all current worker-enterprise pairings from batch
staffing; a missing field means unlocked, so the addition remains compatible with
save format 3. One copy of a type may stand in each derived settlement, so a family may
own several workshops or stalls; further copies grow dearer by
`balance.enterpriseRepeatCostGrowth`. An enterprise earns nothing unless every staffing
position required by its current level is filled.
`FB.enterpriseWorkersFor` limits staffing to resident family, a paid retainer,
or a manageable resident unwed sibling (`FB.manageableKinKind`; see
[characters.md](characters.md)) in the matching career (and, where required,
guild rank) whose `FB.characterResidence` is the enterprise's province. A
worker under sixteen must have a chosen matching apprenticeship and supplies
half a staffing position, so two child workers replace one adult worker. A
single child may remain assigned to an otherwise empty position, but the
enterprise stays inactive until its adult-equivalent staffing requirement is
met. Once that child turns sixteen, lazy normalization counts them as one adult
and releases any now-excess assignment without changing the save shape. A
manageable sibling contributes labor only — never household membership, upkeep,
or wages — and a sibling who weds, takes vows, gains land or a crown, or moves
away drops out of the pool; the shared wedding paths strip their enterprise
assignment and loadout, and lazy normalization clears any assignment whose
worker is no longer eligible. A resident sibling has no saved residence and
follows the household home by fallback, so a permanent household move carries
their labor along instead of orphaning assignments. A retained factor or
steward is still paid through the household contract ledger; staffing an
enterprise does not turn that person into family or grant a second wage. A
separate local hire uses `player.enterpriseLabor` and creates a named, qualified worker
tied to one enterprise. The first wage is paid on hiring and the same wage recurs each
season. These contracts use no retainer or household-office capacity, cannot be moved by
the staffing assistant, and end on dismissal, death, loss of the enterprise, or after two
unpaid seasons. A
permanent household move preserves remote enterprise ownership but immediately
clears its worker and lock; an additional yield guard keeps such property idle
even before normalization. Relocation confirmation derives the exact affected
enterprise/worker pairs through `FB.enterpriseRelocationImpact`, and the Work
surface names the remote site and explains why it is idle. Legacy Orchard,
Press, Shop, Stall, and Trading House holdings migrate lazily to equivalent
enterprise instances; household rights, equipment, and cultural capital remain
unique holdings.
The staffing picker uses the shared person-assignment card to preview each eligible
worker's live yield, occupation, Standing, present enterprise, and the staffing consequence
of adding or removing that person. Manual reassignment or unassignment may override a lock
and clears every affected lock. Lazy enterprise normalization also clears an assignment
and its lock when the worker dies, leaves the managed household, becomes career/guild
ineligible, or can no longer work personally after a rank change. Valid locks survive
save/restore and succession.

The all-enterprise staffing preview is also an entry point for resolving an idle row. Its
Assign workers action opens the same owned-enterprise manager and returns to a newly derived
preview, while Hire a local worker calls the canonical paid-labor mutation directly and
refreshes the preview in place. Disabled hiring retains the exact wage or affordability
reason in the row's tooltip/touch disclosure; the batch proposal is never silently applied
by either per-row action.

The owned-enterprise manager is deliberately terse. Its permanent face contains section
titles, worker states, and action labels only. Enterprise description, staffing status and
guidance, owner/scope/cost/effect/transfer terms, upgrade details and blockers, staffing-lock
behavior, hire wages, and removal consequences all use the standard desktop hover/focus
tooltip or compact-layout `?` disclosure. This is presentation only; all staffing,
contract, upgrade, and inheritance rules remain unchanged.

The opt-in staffing assistant is a no-day, preview-first batch operation.
`FB.enterpriseStaffingPlan` fixes every valid locked pairing and paid enterprise-labor
contract, then considers all
remaining enterprises and eligible household workers, including workers on unlocked
enterprises. It assigns adults first, then uses two available child apprentices for
each missing adult position, and maximizes `FB.enterpriseYield` rounded to
thousandths of seasonal currency. Equal totals preserve the most current assignments,
then resolve by stable enterprise UID and character ID; no RNG is consumed. Locale-neutral
rows record the current/proposed ids and yields, lock/status state, and one of
`no_eligible_worker`, `eligible_workers_locked`, or `allocated_higher_yield` for each
unresolved enterprise. `FB.applyEnterpriseStaffingPlan` rejects a stale signature for
another review, clears only unlocked assignments, and reapplies the reviewed mapping
through `FB.setEnterpriseWorker`.
The separate `staffingWorker` protection scope reserves a person from the assistant rather
than one enterprise pairing. A protected assigned worker and that current enterprise are
fixed in the preview even when `workerLocked` is false; a protected idle worker is not a
candidate. Protection is included in the review signature and status rows. Manual assign,
replace, and unassign controls remain authoritative, and the reservation follows the person
to a new manual assignment until removed.

Enterprise yield consumes the shared computed benefits shown in Network: guild rank,
the legacy guild-member work benefit, and position/retainer enterprise modifiers. These
are not copied into enterprise instances, so a lost office, departed retainer, or changed
guild rank affects the next calculation without migrating property state.

Every core enterprise has two authored upgrades. Construction is deliberately expensive
and never raises the enterprise's seasonal gold yield. Instead, a completed tier increases
the number of required adult-equivalent staffing positions and supplies ancillary power
only while fully staffed:
county population capacity, famine or population-crisis protection, migration attraction,
levy or men-at-arms support, retainer capacity, seasonal prestige, and a one-time county
development gain. `FB.enterpriseUpgradeStatus` keeps a locked tier visible with its exact
technology or money blocker. `FB.upgradeEnterprise` pays the quoted construction price and
records only the new level. `devAppliedLevel` prevents a development grant from repeating
after the first fully staffed season. Downgrading is not supported.

A consumer enterprise may name an input type in `def.chainFrom`. While at least
one household enterprise of the input type is producing (positive yield under the
ordinary staffing and residence rules) in the same province, the consumer earns
`balance.enterpriseChainBonus` more. The farming chain uses this: the Orchard is
the farmer's ungated early capital enterprise — fruit trees predate seed
science — while the Press House keeps its Lever Oil Press gate, because press
work for the neighbors' harvests neither postdates nor requires owning trees.
The staffing assistant evaluates chains against current assignments, so its
preview can lag a plan that would newly staff an input enterprise; the seasonal
settlement always uses live assignments.

Active guild monopoly charters add another live multiplier only to staffed enterprises
whose career matches the charter's Craft or Trade profession. One incoming and one
outgoing charter may apply at once; their enterprise percentages add and are capped at
+50%. Charter records freeze their percentages when granted, but no bonus is copied into
the enterprise instance. The institutional rights pass through succession with the
household.

Each charter also carries a stable `contractId`. The named **Unpick a Guild Monopoly**
plot records that exact contract, so renewal or replacement cannot silently retarget the
scheme. Exposing the grant ends the recorded monopoly and applies the ordinary
exposed-contract consequences; taking compensation or defending the charter preserves
that same contract.

Enterprises remain distinct from tier-3+ buildings. An enterprise belongs to the family
even if it moves or rises in station; a building belongs to its county and follows
political conquest.

Eligible purchased holdings, unassigned carried items, and a complete group of family
land plots at one settlement may secure a pledged loan. Event-only property such as
Rights of Common is never offered as collateral. A pledge is reserved until repayment
or default; a pledged treasure cannot be sold or gifted, and a pledged land group cannot
secure a second loan. Default removes the named asset or the signed number of plots in
settlement. If the remaining land can no longer support its manor, the manor and gentry
station are lost. Every future obligation and pledge passes to an heir. Productive
enterprises and maintained household standards are not seized by the generic pledge
contract. Trading Houses instead open larger active trade-partnership stakes in the
Finance sheet.

Holdings and land plots are not indestructible. A defaulted loan left past
`balance.distraintGraceDays` exposes them to the lord's writ of distraint (see
[finance.md](finance.md) and [descent.md](descent.md)): bailiffs take holdings at
cost, then plots at `FB.landPlotCost`, until the debt is covered; a wartime host
standing in the home province can also burn a holding in the `devastation_raiders`
event. Items remain sacred in both paths — only `loseAllLand`'s rule applies to them
everywhere: the family always keeps its treasures.

Related: [finance.md](finance.md) for credit, default, and trade partnerships.
