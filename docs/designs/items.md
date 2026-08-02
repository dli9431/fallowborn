# Items, instances, and equipment

**The family owns an armory; characters wear loadouts.** `player.items` is the shared
list of exact item references. `player.loadouts[characterId]` maps Head, Neck, Body,
Waist, Feet, Left hand, Right hand, and Ring to those references. The managed wearers
are the current head, living spouses, paid retainers, and resident unmarried children
and grandchildren. An object can
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

**Only worn objects grant power.** Skill and health effects apply to the wearer:
`FB.skillOf` reads their equipped skill bonuses and yearly NPC mortality reads their
health protection. Battle, gold, prestige, and piety effects count only when worn by the
current head. Unequipped wealth is mechanically inert. Base clothing shown by the paper
doll is rank/profession/culture dress and never occupies an armory slot.
Equipped footwear replaces the cosmetic shoes and follows the leg centers. Weapon poses
align the palms with their grips: one-handed blades are held at the character's sides,
while a two-handed weapon brings both arms onto its shared shaft.

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

Cross-sovereign gifts are not transferred at dispatch. The exact reference is removed from
usable armory ownership and held by a `player.giftDeliveries` record; `FB.itemOwner`
reports `{kind:'delivery'}` so the object cannot be sold, equipped, duplicated, or
regenerated while in transit. A successful character delivery transfers that reference to
the recipient; a successful ruler delivery leaves family ownership permanently. A failed
delivery retains the same reference through its return journey and restores it to the
armory only when the courier reaches the household’s then-current permanent home.

At death, the legend freezes the head's loadout and optional battle/event provenance.
The succession dialog shows that final paper doll and “Worn at death” list. This release
does not remove, damage, loot, or steal any object: succession clears the dead wearer and
any former-household assignments that do not belong to the new head's household, whose
membership is recomputed through children and grandchildren without double-counting. The
successor then automatically takes the strongest age-valid, unpledged gear from the shared
armory in every slot. Mechanical effects outrank value, and the two hand slots compare the
best one-handed pair against every two-handed object without consuming RNG.

Related: [characters.md](characters.md) for wearer-specific skill and health effects,
[ui.md](ui.md) for paper-doll interaction, and [state-and-saves.md](state-and-saves.md)
for version-3 migration.
