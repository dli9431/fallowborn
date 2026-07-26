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

Related: [development.md](development.md) for the tier-3+ equivalent (buildings),
[realms.md](realms.md) for tiers.

**Productive property is an enterprise, not a unique improvement.**
`FBDATA.enterprises` (`data/economy.js`) defines repeatable family businesses. Instances
live in `player.enterprises` as `{uid,type,provinceId,settlement,workerId}` and pass to
heirs. One copy of a type may stand in each derived settlement, so a family may own
several workshops or stalls; further copies grow dearer by
`balance.enterpriseRepeatCostGrowth`. An enterprise earns nothing while idle.
`FB.enterpriseWorkers` limits staffing to resident family or a paid retainer in the
matching career (and, where required, guild rank). A retained factor or steward is still
paid through the household contract ledger; staffing an enterprise does not turn that
person into family or grant a second wage. Legacy Orchard, Press, Shop, Stall, and
Trading House holdings migrate lazily to equivalent enterprise instances; household
rights, equipment, and cultural capital remain unique holdings.

Enterprise yield consumes the shared computed benefits shown in Network: guild rank,
the legacy guild-member work benefit, and position/retainer enterprise modifiers. These
are not copied into enterprise instances, so a lost office, departed retainer, or changed
guild rank affects the next calculation without migrating property state.

Enterprises remain distinct from tier-3+ buildings. An enterprise belongs to the family
even if it moves or rises in station; a building belongs to its county and follows
political conquest.

Eligible purchased holdings and carried items may secure a pledged loan. Event-only
property such as Rights of Common is never offered as collateral. A pledge is reserved
until repayment or default; a pledged treasure cannot be sold or gifted. Default removes
the named asset in settlement, while every future obligation and pledge passes to an heir.
Productive enterprises are not seized by the generic pledge contract. Trading Houses
instead open larger active trade-partnership stakes in the Finance sheet.

Related: [finance.md](finance.md) for credit, default, and trade partnerships.
