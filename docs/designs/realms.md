# Realms, the liege hierarchy & tiers

**Realms form a liege hierarchy.** Every realm has a `rank` (1 count … 4 emperor) and a
`liege` (realm id or null). `state.owner[pid]` is the SOVEREIGN top realm (map color,
war target); `state.holder[pid]` is the county's direct holder. Authored realms are
kings/emperors/independent dukes plus a few authored vassal kingdoms; the dukes and
counts inside them are generated at `FB.initPolitics` (`FB.makeVassalRealm`). De jure
data (`FBDATA.empires/kingdoms/duchies` + each county's `duchy` field) drives tier
promotions (`FB.checkTierPromotions` = majority of a duchy/kingdom/empire), realm
naming, and the Land panel's hierarchy block. Helpers: `FB.topRealm`, `FB.liegeChain`,
`FB.realmTerritory`, `FB.realmHeldCounties`, `FB.dejureOf`; owner/holder-derived lists
are cached per turn (`FB.invalidateRealmCache` on transfers). Vassals make no foreign
policy; strong vassals occasionally break away (`balance.breakawayChance`). The player
interacts with the whole chain (petition / `pay_homage` / `appeal_lord` /
`swear_fealty` / independence) and, once sovereign, runs vassals of their own
(`grant_county`, `demand_taxes`, `revoke_county`; vassal opinion lives in
`player.liegeOps`, taxes flow through `FB.playerTax` at `balance.vassalTaxRate`).
Petitioning up from a barony (`title_request` → `FB.grantByLiege`) invests the player
with his home county: the granting count yields it (dissolving if left landless) and
the player answers to the granter's own liege — a liege must outrank his man, and
`FB.checkTierPromotions` walks broken chains back up. Independence comes two ways:
the random `independence_offer` event or the explicit `declare_independence` deed
(200+ prestige, any sworn tier) — both run `FB.doIndependence`, which founds the
player realm and starts a defensive war against the old sovereign; a baron doing
either seizes his home county via `FB.transferProvince` (burying the old holder if
left landless).
AI rulers stay lightweight `realm.ruler` objects (name, culture, age, martial), not
full chars — the Deeds banner's "vassal of X" links to their sheet via
`UI.showLiegeModal` (`data-liege` click delegation), not `UI.showCharModal`.

**Tiers** 0–7 (serf…emperor) + `profession` gate actions (`js/actions.js`) and events. Map
ownership only begins at tier 4 (`state.player.provs`); tier 3 (baron) is a status inside a
county — and bound to it: a baron's liege is always the county's direct holder, so if his
lord's house dies — or the county changes hands under a living lord — the baron reattaches
to whoever holds his home (`FB.transferProvince`, with a catch-all repair in
`FB.checkTierPromotions`), never standing "independent" nor kneeling to a lord who no
longer holds his home. Tier-2 (gentry) content gates on tier alone, not profession, so the clergy careers
share it: an abbot or qadi keeps the cloth (`tierSet` in `js/events.js` preserves
monk/priest) but manages the manor and may petition for a barony like any gentry. Promotions above count happen in `FB.checkTierPromotions` from de jure majorities:
a duchy for tier 5, a kingdom (independent) for 6, two kingdoms of one empire for 7.

**Tiers can fall as well as rise.** The downfall chains (`df_*` in `data/events_noble.js`)
give rulers three slow cascades — a commons' revolt (tier 4+, low popular opinion), a
rival's claim, and a murder conspiracy (tier 3+, a rival with deep hatred) — each three
flag-marked stages with a paid or skill escape at every step. Only repeated neglect or
bad luck reaches the final stage, whose failure calls `FB.loseAllLand` (js/world.js):
a sovereign's realm passes whole to a generated usurper realm (same name and color; the
fallen house's vassals reattach to it), a vassal's fiefs escheat to his liege, and the
family drops to landless gentry (tier 2) keeping gold, items, and holdings. Succession
wipes the slide flags with the rest of `player.flags`, so a stalled plot never outlives
its generation. Province-by-province loss in a lost defensive war (`FB.warLoseProvince`)
remains the other way down, landing at the same tier 2.

Related: [provinces.md](provinces.md) for the land itself; [state-and-saves.md](state-and-saves.md)
for where ownership is stored.
