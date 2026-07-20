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
AI rulers stay lightweight `realm.ruler` objects (name, culture, age, martial), not
full chars — the Deeds banner's "vassal of X" links to their sheet via
`UI.showLiegeModal` (`data-liege` click delegation), not `UI.showCharModal`.

**Tiers** 0–7 (serf…emperor) + `profession` gate actions (`js/actions.js`) and events. Map
ownership only begins at tier 4 (`state.player.provs`); tier 3 (baron) is a status inside a
county. Tier-2 (gentry) content gates on tier alone, not profession, so the clergy careers
share it: an abbot or qadi keeps the cloth (`tierSet` in `js/events.js` preserves
monk/priest) but manages the manor and may petition for a barony like any gentry. Promotions above count happen in `FB.checkTierPromotions` from de jure majorities:
a duchy for tier 5, a kingdom (independent) for 6, two kingdoms of one empire for 7.

Related: [provinces.md](provinces.md) for the land itself; [state-and-saves.md](state-and-saves.md)
for where ownership is stored.
