# Items (heirlooms)

**Items are heirloom bonuses.** `FBDATA.items` (map_data.js) live in `player.items` and
pass to heirs; `FB.itemBonus` (actions.js) feeds skill bonuses through `FB.skillOf`
(player only), battle odds, seasonal prestige/piety, and mortality. Acquired via the
`offer_item`/`buy_item`/`loot_item`/`find_artifact`/`plot_loot` custom fns (peddler and
visit events, war spoils in world.js, the locked-chest plot, the artifact find). Item
chips open an item card (`UI.showItemModal` in ui.js; hover tooltip on desktop) that
spells out the `fx` and offers selling (`FB.sellItem`, `balance.itemSellRatio` of value)
or gifting to any known character (`FB.giveItem` — regard by rarity via `FB.giftOpinion`,
lord favor too); gifted items sit on the receiving char (`c.items`, chips on their card)
and rejoin the hoard in `G.succeedTo` if that character becomes the player.

Related: [characters.md](characters.md) for `FB.skillOf` and the skill caps,
[ui.md](ui.md) for the item card's touch behavior.
