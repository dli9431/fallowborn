# Items, instances, and equipment

**The family owns an armory; characters wear loadouts.** `player.items` is the shared
list of exact item references. `player.loadouts[characterId]` maps Head, Neck, Body,
Waist, Feet, Left hand, Right hand, and Ring to those references. The managed wearers
are the current head, living spouses, and resident unmarried children. An object can
appear in only one loadout, and a two-handed object writes the same reference into both
hand slots. Marriage out, divorce, departure, and non-player death clear the assignment
but leave the object in the armory.

`js/items.js` owns all item mutations. Call `FB.resolveItem`, `FB.grantItem`,
`FB.transferItem`, `FB.equipItem`, `FB.unequipItem`, `FB.pledgeItem`, `FB.sellItem`,
`FB.giveItem`, or `FB.destroyItem`; callers must never splice ownership arrays directly.
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

Ordinary gear can recur through town/city markets, peddlers, raids, plots, and war
spoils. `offer_gear` guarantees an ordinary market offer; `offer_item` uses the full
eligible table. `loot_item`, `find_artifact`, `plot_loot`, and `giveItem` all issue exact
references. Unique objects already owned are removed from random pools rather than
duplicated. The Man-at-Arms starts in a Plain Ash Spear and Padded Jack; the Hedge Knight
starts with a Well-made Broad Sword and Plain Round Shield.

Item cards render the exact object and show actual quality-adjusted effects, value,
wearer, and legal actions. Ordinary gifts grant +8/+15/+25 regard by quality; authored
common/fine/famed heirlooms retain +15/+25/+40. Chronicle messages store a semantic item
snapshot (`$item`) so a generated name stays localizable after the object leaves the
armory. The equipment sheet totals the powers that mechanically apply to its wearer and
shows them beneath the full-body figure; head-only battle and seasonal-resource powers
are omitted when another household member is shown.

At death, the legend freezes the head's loadout and optional battle/event provenance.
The succession dialog shows that final paper doll and “Worn at death” list. This release
does not remove, damage, loot, or steal any object: succession clears the dead wearer and
any former-household assignments that do not belong to the new head's household.

Related: [characters.md](characters.md) for wearer-specific skill and health effects,
[ui.md](ui.md) for paper-doll interaction, and [state-and-saves.md](state-and-saves.md)
for version-3 migration.
