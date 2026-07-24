# Holdings (commoner property)

**Commoners play tall through holdings.** `FBDATA.holdings` (map_data.js) is family
property for tiers 0–2, bought with gold via the better-household deed
(`FB.buyHolding`/`FB.holdingAvailable` in actions.js). `player.holdings` persists across
generations; bonuses via `FB.holdingBonus` (gold/prestige/piety per season, battle, edu,
health). Events gate on `holdings`/`notHoldings` and use `holding`/`loseHolding` effects.
Definitions marked `eventOnly` are excluded from the purchase picker. Rights of Common
are such a holding: the Old Custom landmark chain can secure the family's heritable
pasture, fuel, and water rights, and those rights then pass to later generations.

Related: [development.md](development.md) for the tier-3+ equivalent (buildings),
[realms.md](realms.md) for tiers.

**Productive property is an enterprise, not a unique improvement.**
`FBDATA.enterprises` (`data/economy.js`) defines repeatable family businesses. Instances
live in `player.enterprises` as `{uid,type,provinceId,settlement,workerId}` and pass to
heirs. One copy of a type may stand in each derived settlement, so a family may own
several workshops or stalls; further copies grow dearer by
`balance.enterpriseRepeatCostGrowth`. An enterprise earns nothing while idle.
`FB.enterpriseWorkers` limits staffing to resident household members in the matching
career (and, where required, guild rank). Legacy Orchard, Press, Shop, Stall, and
Trading House holdings migrate lazily to equivalent enterprise instances; household
rights, equipment, and cultural capital remain unique holdings.

Enterprises remain distinct from tier-3+ buildings. An enterprise belongs to the family
even if it moves or rises in station; a building belongs to its county and follows
political conquest.
