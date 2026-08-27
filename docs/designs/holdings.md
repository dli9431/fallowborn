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
level three to gentry; transport starts at freeholder rank.

`FB.ensureHouseholdStandards` lazily creates and clamps the JSON-safe saved map, so old
format-3 saves begin at level zero. `FB.householdStandardEffects` supplies mortality,
education, retainer-capacity, prestige, travel, and profession-output modifiers.
`FB.householdStandardsUpkeepParts` and `FB.householdStandardsUpkeep` expose only active
upkeep. Work outfits are dormant without an eligible resident worker (or a retainer
staffing a matching enterprise). Living standards and eligible work outfits remain active
after the dynasty becomes landed, so their benefits and upkeep continue at ruler ranks.
General standards gain a title floor when reduced: level 1 for a Baron, level 2 for a
Count, and level 3 for a Duke, King, or Emperor. Work outfits may still be reduced to
baseline because vocational tools do not express title dignity.
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
navigation action.

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
buying plots in the home county up to each settlement's ordinary cap, including the
same atomic complete-the-holding purchase available to freeholders. Manor declaration
remains a one-time Freeholder promotion; titled ranks use county domains and buildings
instead of buying commoner freehold plots. The technology impact is **none**
(`gentry_freehold_expansion`): ordinary local land purchases need no credible research
gate.

The land market keeps each settlement purchase compact: its action face shows the
settlement and plot progress plus only the live cost and before/after seasonal yield.
The full dynastic ownership, exact site, affordability, upkeep, inheritance, and
permanence terms move to the shared desktop hover/focus tooltip. Unaffordable and
complete single-plot actions remain focusable for that disclosure but expose
`aria-disabled` and revalidate without purchasing when activated. Permanent holdings
and enterprises retain their separate pledge and staffing rules.
When two or more plots remain before the relevant target — the manor threshold for a
Freeholder or the settlement cap for Gentry — the settlement also offers an explicit
batch purchase with the same compact cost/yield face and full tooltip. Its confirmation
previews the plot count, total price, resulting seasonal yield, completed holding/manor
progress, and remaining purse.
`FB.manorPlotPurchasePlan` is read-only; `FB.buyRemainingManorPlots` revalidates the
reviewed starting count and full affordability, then buys the batch atomically and
writes one Chronicle entry. It never substitutes for the existing one-plot purchase.

Land clearing and tangible holding purchases use their authored `marketBasket` at the
home county's live commodity quote and round upward to whole gold. The manor threshold,
inheritance, income, and collateral value remain real quantities rather than being
repriced. Untagged mod holdings retain a market multiplier of one.

Related: [development.md](development.md) for the tier-3+ equivalent (buildings),
[realms.md](realms.md) for tiers.

**Productive property is an enterprise, not a unique improvement.**
`FBDATA.enterprises` (`data/economy.js`) defines repeatable family businesses. Instances
live in `player.enterprises` as
`{uid,type,provinceId,settlement,workerId,workerLocked?}` and pass to heirs.
Acquisition order remains array order and authored `cost` is the stable base-value sort
key; neither needs a new save field. Work & Enterprises derives localized name, exact
settlement, live yield, and staffing state when sorting or grouping instances. These are
session UI choices. Household Plan reuses the selected sort for assignment labels, so
drilling between the screens cannot imply a different enterprise order.
`workerLocked:true` preserves that explicit worker-enterprise pairing from batch
staffing; a missing field means unlocked, so the addition remains compatible with
save format 3. One copy of a type may stand in each derived settlement, so a family may
own several workshops or stalls; further copies grow dearer by
`balance.enterpriseRepeatCostGrowth`. An enterprise earns nothing while idle.
`FB.enterpriseWorkersFor` limits staffing to resident family, a paid retainer,
or a manageable resident unwed sibling (`FB.manageableKinKind`; see
[characters.md](characters.md)) in the matching career (and, where required,
guild rank) whose `FB.characterResidence` is the enterprise's province. A
manageable sibling contributes labor only — never household membership, upkeep,
or wages — and a sibling who weds, takes vows, gains land or a crown, or moves
away drops out of the pool; the shared wedding paths strip their enterprise
assignment and loadout, and lazy normalization clears any assignment whose
worker is no longer eligible. A resident sibling has no saved residence and
follows the household home by fallback, so a permanent household move carries
their labor along instead of orphaning assignments. A retained factor or
steward is still paid through the household contract ledger; staffing an
enterprise does not turn that person into family or grant a second wage. A
permanent household move preserves remote enterprise ownership but immediately
clears its worker and lock; an additional yield guard keeps such property idle
even before normalization. Relocation confirmation derives the exact affected
enterprise/worker pairs through `FB.enterpriseRelocationImpact`, and the Work
surface names the remote site and explains why it is idle. Legacy Orchard,
Press, Shop, Stall, and Trading House holdings migrate lazily to equivalent
enterprise instances; household rights, equipment, and cultural capital remain
unique holdings.
The staffing picker uses the shared person-assignment card to preview each eligible
worker's live yield, occupation, Standing, present enterprise, and every worker or enterprise
that reassignment would displace. Manual replacement or unassignment may override a lock
and clears every affected lock. Lazy enterprise normalization also clears an assignment
and its lock when the worker dies, leaves the managed household, becomes career/guild
ineligible, or can no longer work personally after a rank change. Valid locks survive
save/restore and succession.

The opt-in staffing assistant is a no-day, preview-first batch operation.
`FB.enterpriseStaffingPlan` fixes every valid locked pairing, then considers all
remaining enterprises and eligible household workers, including workers on unlocked
enterprises. It maximizes the sum of `FB.enterpriseYield` rounded per pairing to
thousandths of seasonal currency. Equal totals preserve the most current assignments,
then resolve by stable enterprise UID and character ID; no RNG is consumed. Locale-neutral
rows record the current/proposed ids and yields, lock/status state, and one of
`no_eligible_worker`, `eligible_workers_locked`, or `allocated_higher_yield` for each
unresolved enterprise. `FB.applyEnterpriseStaffingPlan` rejects a stale signature for
another review, clears only unlocked assignments, and reapplies the reviewed mapping
through `FB.assignEnterprise`.
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

Eligible purchased holdings and carried items may secure a pledged loan. Event-only
property such as Rights of Common is never offered as collateral. A pledge is reserved
until repayment or default; a pledged treasure cannot be sold or gifted. Default removes
the named asset in settlement, while every future obligation and pledge passes to an heir.
Productive enterprises are not seized by the generic pledge contract. Trading Houses
instead open larger active trade-partnership stakes in the Finance sheet.

Holdings and land plots are not indestructible. A defaulted loan left past
`balance.distraintGraceDays` exposes them to the lord's writ of distraint (see
[finance.md](finance.md) and [descent.md](descent.md)): bailiffs take holdings at
cost, then plots at `FB.landPlotCost`, until the debt is covered; a wartime host
standing in the home province can also burn a holding in the `devastation_raiders`
event. Items remain sacred in both paths — only `loseAllLand`'s rule applies to them
everywhere: the family always keeps its treasures.

Related: [finance.md](finance.md) for credit, default, and trade partnerships.
