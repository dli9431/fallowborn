# Items, instances, and equipment

**The family owns an armory; characters wear loadouts.** `player.items` is the shared
list of exact item references. `player.loadouts[characterId]` maps Head, Neck, Body,
Waist, Feet, Left hand, Right hand, and Ring to those references. The managed wearers
are the current head, living spouses, paid retainers, and resident unmarried children
and grandchildren, except that a reigning ruler or local lord who marries the player keeps
a separate political household and never becomes a managed wearer. An object can
appear in only one loadout, and a two-handed object writes the same reference into both
hand slots. Marriage out, divorce, departure, and non-player death clear the assignment
but leave the object in the armory.

`js/items.js` owns all item mutations. Call `FB.resolveItem`, `FB.grantItem`,
`FB.transferItem`, `FB.equipItem`, `FB.unequipItem`, `FB.pledgeItem`, `FB.sellItem`,
`FB.giveItem`, `FB.giveRulerItemGift`, or `FB.destroyItem`; callers must never splice
ownership arrays directly.
`FB.itemGiftStatus` is the read-only gate shared by interaction cards, gift previews,
and both item-gift mutations. It reports ownership, assignment, collateral, household,
recipient cooldown, courier, and route failures without repairing save records.
`FB.resolveItemReadOnly`, `FB.itemNameReadOnly`, `FB.loadoutReadOnly`, and
`FB.itemBonusReadOnly` likewise let sheets, skill projections, and procedural
portrait/item renderers inspect saved armory, recipient, and loadout records without
invoking item normalization.
Selling, gifting, and pledging require the object to be unequipped. Pledged objects
remain in the armory but cannot be equipped. Changes of outfit cost no game day and are
blocked while traveling or while an event awaits resolution.

**Definitions and exact instances are separate.** Authored unique heirlooms use their
definition id as a stable implicit reference. Repeatable ordinary definitions set
`unique:false`; acquiring one creates
`state.itemInstances[ref] = {defId, quality, visualSeed, motif?}`. Quality is Plain 70%,
Well-made 25%, or Masterwork 5%. It multiplies value by 1/2/4 and adds `qualityFx` zero,
one, or two times to the base `fx`. Appearance is derived only from the saved
`visualSeed` and the definition's `art` ranges, never from gameplay RNG during drawing.
Definitions may also set `slot`, two-handed `grip:2`, and `ageMin`. Legacy and mod items
with none of these fields remain compatible as unique, one-handed objects with generic
procedural art.

`eventOnly:true` reserves a definition for an explicit grant path. It is excluded from
ordinary gear, full peddler stock, loot, plots, finds, raids, and war-spoil pools, but may
still be created by `FB.grantItem` or a specific `giveItem` effect. Author specialties use
this with four `unique:false` family treatises, so each qualified Author receives a single
quality-rolled exact instance without flooding the world's random book stock.

**Only worn objects grant power.** Skill and health effects apply to the wearer:
`FB.skillOf` reads their equipped skill bonuses and yearly NPC mortality reads their
health protection. Battle, gold, prestige, and piety effects count only when worn by the
current head. Unequipped wealth is mechanically inert. Base clothing shown by the paper
doll is rank/profession/culture dress and never occupies an armory slot.
Equipped footwear replaces the cosmetic shoes: the shoe construction takes the item's
leather palette and rises over the ankle as a boot shaft. Hand objects are not glued to
the hands: the card shows weapons, shields, tools, and books as framed inset panels in
the bottom corners below the figure — the right hand's object in the viewer-left box,
the left hand's in the viewer-right box, and a single viewer-left panel for a two-handed
object shared by both hands. Drawn last, the panels overlay a wide hem rather than
reserving space from the figure.

The Court Illustration v2 figure is a single 192×360 render shared by the equipment and
death surfaces. Head and body are drawn from the same normalized descriptor as compact
busts. Worn gear integrates into the drawing rather than pasting an icon over it: crown
and helm art renders through the wardrobe constructions with the item's metal, gems,
quality, and visual seed (a helm also hides covered hair); jack and chest body art
recolors the garment and quilts it; a belt recolors the belt construction and its
buckle; pendants and relics hang at the throat, and an unequipped figure of rank or of
the Christian clergy wears its generated chain or cross there (busts carry nothing at
the neck - the crop has no chest); a ring is a band and stone on the ring finger. A one-entry figure MRU is keyed by all visible slots, including
reference/snapshot id, art kind and palette, quality, `visualSeed`, motif, and grip. It
never grows with the household.

Ordinary gear can recur through town/city markets, peddlers, raids, plots, and war
spoils. `offer_gear` guarantees an ordinary market offer; `offer_item` uses the full
eligible table, conditioned on the customer by peddler stock bands
(`balance.peddlerStockBands`, keyed by societal role): the offer first rolls a rarity
class from the band, then picks inside the class, so a serf sees mostly common gear and
a crowned house mostly heirlooms. Each `balance.peddlerWealthShift` purse threshold
crossed shops one band higher. Class odds ignore how many unique definitions remain
uncollected, so a nearly complete collection does not collapse the stock into ordinary
gear until the class is truly exhausted. The rare offer above the band's home class is
the aspirational piece, labeled `offerClass:'aspirational'` in the queued `item_offer`
context so its text can say the thing was not made for your station. `loot_item`,
`find_artifact`, `plot_loot`, and `giveItem` all issue exact
references. Unique objects already owned are removed from random pools rather than
duplicated. The Man-at-Arms starts in a Plain Ash Spear and Padded Jack; the Hedge Knight
starts with a Well-made Broad Sword and Plain Round Shield.

**The market stall is a small seasonal shop.** The town and city visit events offer a
"Browse the market stalls" / "Walk the great bazaar" option that opens a shop modal over
`FB.shopStock(state, pid, kind)`: one saved `player.shopStock` record holding exact,
materialized ordinary offers (quality pre-rolled from the curated
`balance.shopQualityOdds` table rather than the loot table's 70/25/5), rerolled through
the seeded RNG only when the season, county, or settlement kind changes. Unsold
materialized instances are discarded on reroll exactly like a declined peddler offer, so
the shop never leaks orphaned registry entries. Prices pass the quality-adjusted value
through the county market quote and `balance.shopPriceRatio` (the always-available
convenience premium over peddler scarcity). The `urban_markets` technology widens the
stock (`balance.shopStockTechBonus`) and shifts quality upward
(`balance.shopQualityOddsTech`) — a soft technology interaction (recorded as `item_shop`
in `FBDATA.techImpactReviews`): the stall works everywhere without research. Buying and selling inside the modal cost no extra day; the
settlement visit already spent it. The sell counter lists the unpledged, unequipped
armory objects from `FB.shopSellables` and runs them through the ordinary
`FB.sellItem` flat ratio. The modal lays its buy and sell panes side by side on wide
layouts; on mobile/tablet widths (`.shop-split` in `style.css`) a Buy/Sell tab pair
above the list toggles the visible pane, and the modal re-renders after each
transaction without flipping the player's current pane.

**Legendary and sacred artifacts are gated, singular, dual-edged, and losable.** A
definition with an `artifact` field (`religionGroups`, `cultures`, `kingdoms`,
`empires`, `sacred`) is a unique, `eventOnly`, `rarity:'legendary'` object the rumor
event (`data/events_artifacts.js`) can surface only when the player's faith
(inheritance-aware through `FB.faithIsA`), culture, and the de jure kingdom or empire of
the home county all match — Excalibur does not turn up in Egypt. Claiming one stamps
`state.artifacts[id]` once per save, a stamp that survives succession (unlike `once`,
flags, and cooldowns, which reset per life); loss is derived from `FB.itemOwner` rather
than a second stamp, so an artifact that leaves the family by any door — sale, gift,
raid, seizure, loan default — never re-enters any pool. Every artifact carries a
double-edged `fx` profile (negative values are supported end to end and render in the
item card), and the generic `artifact_coveted` event periodically pressures a holder to
yield a legend or risk having it taken. Selling or gifting away a `sacred` artifact of
the player's own faith additionally costs piety and Common Voice through
`FB.artifactDeparted`, wired into the deliberate exit doors rather than
`FB.transferItem` (which also serves intra-household moves). Technology impact:
`legendary_artifacts` is recorded `none` in `FBDATA.techImpactReviews` — mythic and
religious provenance admits no credible research dependency.

An item's authored value remains its stable real-gold base. A purchased market offer
passes that base through the item's optional `marketBasket` and the current county quote,
then rounds upward to whole gold. Loot, gifts, transfers, sale values, collateral, and
other contracts do not use local commodity scarcity. Untagged mod items retain a market
multiplier of one.

Item cards render the exact object and show actual quality-adjusted effects, value,
wearer, and legal actions. Their shared asset/effect row distinguishes armory or
character ownership, equip-slot scope, no recurring cost, worn-only power,
current transfer restrictions, and indefinite lifetime. Ordinary
Plain/Well-made/Masterwork gifts and authored
common/fine/famed heirlooms both use `balance.socialItemGiftOpinion` (+4/+8/+12 by
default) and apply that amount through the typed Standing facade. A materialized ruler
therefore receives the same realm-backed score whether gifted from the character sheet,
realm sheet, or Council. An explicit item gift shares the recipient's
`balance.socialGiftCooldownDays` clock with an explicit cash gift. Character recipients
use `player.socialGiftTurns`; lightweight rulers use the generation-stamped
`player.realmGiftTurns`, shared by their sheet and the Royal Council. A character recipient
owns the transferred object. A ruler recipient has no simulated inventory, so the object
permanently leaves family ownership. Chronicle messages store a semantic item snapshot
(`$item`) so a generated name stays localizable after either transfer. Wedding and authored
event gifts do not use these explicit-recipient clocks. The equipment sheet totals the
powers that mechanically apply to its wearer and shows them beneath the full-body figure;
head-only battle and seasonal-resource powers are omitted when another household member is
shown.

Each managed character’s equipment sheet also offers **Equip Best**. It uses the same
deterministic optimizer as succession: mechanical effects outrank value, hand equipment is
considered as either the best one-handed pair or one two-handed object, and age-gated or
pledged gear is excluded. The action first previews the full proposed outfit and every
object that would leave the armory, move from another named wearer, change slots, or return
to the armory. Only an explicit confirmation applies that reviewed plan; a changed
assignment makes the preview stale and requires another review. Applying costs no day,
does not consume RNG, and affects only the selected character. Manual slot choices remain
available, and acquiring loot never invokes the optimizer.

An owned item may be placed in the `equipmentItem` protection scope from its item card.
Both **Equip Best** and succession omit a protected armory item and preserve a protected
assignment on the selected wearer when that wearer remains in the managed household. The
two hand slots are one coupled choice: protecting either held object freezes the complete
current hand arrangement so grip rules cannot displace its companion indirectly. If a
protected wearer leaves the new household during succession, the object stays in the family
armory instead of being reassigned. Manual equip and unequip remain authoritative. Selling,
gifting, destroying, or otherwise transferring an object out of the armory clears its
protection so exact generated references cannot leave stale reservations behind.

Cross-sovereign gifts are not transferred at dispatch. The exact reference is removed from
usable armory ownership and held by a `player.giftDeliveries` record; `FB.itemOwner`
reports `{kind:'delivery'}` so the object cannot be sold, equipped, duplicated, or
regenerated while in transit. A successful character delivery transfers that reference to
the recipient; a successful ruler delivery leaves family ownership permanently. A failed
delivery retains the same reference through its return journey and restores it to the
armory only when the courier reaches the household’s then-current permanent home.

At death, the legend freezes the head's loadout and optional battle/event provenance.
The succession dialog resolves those explicit snapshots through `FB.resolveItemSnapshot`
for both its final figure and “Worn at death” list; it never falls back to the dead head's
cleared loadout or the successor's live equipment. This release
does not remove, damage, loot, or steal any object: succession clears the dead wearer and
any former-household assignments that do not belong to the new head's household, whose
membership is recomputed through children and grandchildren without double-counting. The
successor then automatically takes the strongest age-valid, unpledged gear from the shared
armory in every slot. Mechanical effects outrank value, and the two hand slots compare the
best one-handed pair against every two-handed object without consuming RNG.

Related: [characters.md](characters.md) for wearer-specific skill and health effects,
[ui.md](ui.md) for paper-doll interaction, and [state-and-saves.md](state-and-saves.md)
for version-3 migration.
