# Holdings (commoner property)

**Commoners play tall through holdings.** `FBDATA.holdings` (map_data.js) is family
property for tiers 0–2, bought with gold via the better-household deed
(`FB.buyHolding`/`FB.holdingAvailable` in actions.js). `player.holdings` persists across
generations; bonuses via `FB.holdingBonus` (gold/prestige/piety per season, battle, edu,
health). Events gate on `holdings`/`notHoldings` and use `holding`/`loseHolding` effects.

Related: [development.md](development.md) for the tier-3+ equivalent (buildings),
[realms.md](realms.md) for tiers.
