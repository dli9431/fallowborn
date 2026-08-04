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
staffing a matching enterprise), and every standard is dormant above tier 2. Purchased
levels remain saved through either dormant state.

At a season boundary, ordinary household and livelihood income settles first.
`FB.householdStandardsSeason` then pays maintained standards before retainers,
schooling, and finance. When the purse cannot cover the total, levels lapse without
debt or another penalty: luxuries, wares, transport, quarters, board, then active work
outfits. Work outfits lose the highest active level first, with definition order
breaking ties. A lost or voluntarily reduced level gives no refund and must be bought
again at full setup cost. Every purchase and lapse writes a locale-neutral durable
Chronicle descriptor.

The household sheet is a compact catalogue rather than a stack of complete
asset ledgers. Each row keeps the icon, name, current level, current or next
effect, next setup price, and live upkeep visible in the same scan pattern as
the technology catalogue. Opening a standard shows its current state once,
keeps the invariant work/general scope, succession/no-resale rule, and lapse
condition in one shared note, and limits the next-level choice to the changing
name, effect, setup cost, and upkeep. Purchase and reduction confirmations may
repeat the complete terms beside their projected finances. Permanent property
uses the same compact row in the catalogue, with owned property visually
distinguished from purchases. This is presentation only; the level map and
seasonal lapse order remain authoritative.

Profession outfits multiply positive vocational focus resources, resident-family wages
or clerical yield, and matching staffed-enterprise output. Soldier outfits affect paid
work only. Permanent Pack Mule, Fine Tools, Good Mail, Warhorse, and other holding/item
effects remain separate productive or combat property.

**Freeholders assemble land before they can claim a manor.** Repeatable plots live in
`player.landPlots` as `{provinceId, settlement}` and pass to heirs. The Buy Freehold Land
deed places each purchase in one of the home county's stable derived settlements. Every
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

The land market uses the same asset/effect row for each settlement, showing
dynastic ownership, exact site, next-plot affordability, no upkeep, before/after
seasonal yield, inheritance, and permanence. Permanent holdings and enterprises
use that row as well, while retaining their separate pledge and staffing rules.
When two or more plots remain before the manor threshold, the settlement also offers
an explicit batch purchase. Its confirmation previews the plot count, total price,
resulting seasonal yield, completed cluster/manor progress, and remaining purse.
`FB.manorPlotPurchasePlan` is read-only; `FB.buyRemainingManorPlots` revalidates the
reviewed starting count and full affordability, then buys the batch atomically and
writes one Chronicle entry. It never substitutes for the existing one-plot purchase.

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
