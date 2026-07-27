# Realms, the liege hierarchy & tiers

## Dynastic realm identity

Every living rank-1 through rank-4 AI realm carries `realm.succession`: lightweight
sons and daughters, a ruler-generation stamp, a single designated heir, and an ordered
line. Sons precede daughters and older children precede younger ones. If the designated
heir dies, that child's living descendants retain the branch's place before the heir's
siblings. These people remain compact records until the player courts one;
`FB.materializeRoyalChild` then creates the ordinary `state.chars` character used by
courtship, marriage, births, and mortality while retaining its `royalLine` identity.

The special `state.realms.player` node is the player's landed realm, not a synonym for
independence. It may have a `liege`; `state.owner` continues to name the top sovereign
while `state.holder` names the player or one of the player's vassals. Foreign-policy,
crown, and attack gates use `FB.isPlayerSovereign`, while landed-hierarchy operations
use the player realm itself. Swearing fealty reparents this node instead of dissolving
it.

When a materialized rightful ruler becomes the protagonist, `FB.absorbRealm` joins that
realm to the player's: its ruler's demesne enters the player's hand, its vassals reattach
intact, hierarchy cycles are prevented, outgoing wars end in white peace, and title,
rank, capital, and map ownership are synchronized. Only a sovereign inherited title
changes the sovereign owner of the combined hierarchy. An intact player crown handed
to a downfall usurper may instead leave the displaced rightful character one narrow
restoration right; ordinary county conquest never creates one.

## Religious head offices

Central religious leadership is an office assignment, not a territorial tier.
`FBDATA.religions[id].head` supplies the global fallback `realm`, localized `title`,
recovery policy, required seat or alternative claim-county sets, and the policy for
same-faith wars against the office. The active bookmark may override the initial realm
through `bookmark.religiousHeads`: 867 assigns `papacy`/`abbasid`, while 1066 assigns
`papacy_1066`/`abbasid_1066`. Faiths without `head` metadata, including Shia Islam,
have no centralized head. Ordinary Muslim emperor-tier rulers use Great Sultan or
Great Sultana instead.

The live assignment belongs to `state.religiousHeads[religionId]`, whose value is an
exact realm id or `null` for an explicit vacancy. `FB.religiousHeadOf` returns the
assigned living realm or `null`; `FB.religionsHeadedBy` returns exact religion ids;
`FB.isReligiousHead` tests either one faith or any office; and
`FB.religiousHeadTitle` renders the localized office title. AI and player title
rendering query these helpers before secular rank, and semantic player title snapshots
record `headReligion` plus the English `headTitle` fallback so save labels, legends,
and durable messages render in the active locale.

Every realm-death boundary calls `FB.markRealmDead`, which passes its assigned offices
through `FB.vacateReligiousHeads` before killing the temporal realm. The assignment
becomes `null` exactly once, a durable vacancy notice is emitted, and
`state.religiousHeadVacancies[religionId]` records `{turn,formerHolder}`. Losing only
part of the office realm changes nothing. County conquest, inheritance, and absorption
never grant the office; ordinary county conquest also never grants the defeated crown.
Explicit recovery is the only office-assignment path. Loading an older save with a dead
mapped realm silently normalizes it to the same saved vacancy shape without replaying
news.

Catholic recovery uses `recovery:'grant_seat'`: a Catholic sovereign personally holding
Roma and another county may grant Roma away. The bookmark's canonical Papacy is rebuilt
as an independent rank-3 realm with a fresh ruler and succession, then assigned the
office. After a 360-day vacancy, a qualified Catholic AI sovereign controlling Roma and
other territory does this automatically. The player restoration awards piety and
prestige, improves every living Catholic realm's opinion, and clears excommunication.

Sunni recovery uses `recovery:'claim'` with alternative county sets: Baghdad, or Mecca
and Medina together. A sovereign player king or emperor meeting the prestige threshold
may spend piety to attach the office to the existing player realm without moving land.
After 360 vacant days, independent Sunni AI realms of rank 3+ that meet a county set are
ordered by rank, realm strength, then stable realm id; the strongest claims. With no
eligible realm, the explicit vacancy persists. `FB.canRestoreReligiousHead`,
`FB.restoreReligiousHead`, `FB.canClaimReligiousHead`,
`FB.controlsReligiousHeadClaim`, `FB.claimReligiousHead`, and
`FB.religiousHeadRecoveryTick` are the shared policy surface; callers do not match
Papacy/Caliphate realm names.

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
policy; strong vassals occasionally break away (`balance.breakawayChance`). A sovereign’s foreign
opinion and non-aggression pacts now modulate whether an adjacent AI realm attacks the
independent player — see [piety-intrigue-diplomacy.md](piety-intrigue-diplomacy.md). The player
interacts with the whole chain (petition / `pay_homage` / `appeal_lord` /
`swear_fealty` / independence — and, tiers 3–5, the **estates**: the liege's
assembly where the terms of service, the aid and scutage, are voted on — see
[parliament.md](parliament.md)) and, once sovereign, runs vassals of their own
(`grant_land` — a single county via `FB.grantCounty` or a whole de jure duchy via
`FB.grantDuchy`, `demand_taxes`, `revoke_county`; vassal opinion lives in
`player.liegeOps`, taxes flow through `FB.playerTax` at `balance.vassalTaxRate` and a
share of levies through `FB.playerLevy` at `balance.vassalLevyRate`).

Realm, ownership, and de jure source data belong to the active start bookmark. The
867 and 1066 definitions may therefore use different realm ids, liege chains,
capitals, county owners, and hierarchy names without altering saved political state.
Activation clears all owner-, liege-, and de-jure-derived caches before a campaign is
created or restored.

Every explicitly authored start realm may supply
`ruler:{name,sex,culture,born,mar,trait}`. `FB.initPolitics` copies that historical
profile verbatim into the realm's initial lightweight ruler, deriving only start-age
and ordinary succession bookkeeping. Generated counts, dukes, children, heirs,
successors, and later houses continue through the saved RNG, so authored start rulers
do not turn the whole family tree into fixed history.
Petitioning up from a barony (`title_request` → `FB.grantByLiege`) invests the player
with his home county: the granting count yields it (dissolving if left landless) and
the player answers to the granter's own liege — a liege must outrank his man, and
`FB.checkTierPromotions` walks broken chains back up. Independence comes two ways:
the random `independence_offer` event or the explicit `declare_independence` deed
(200+ prestige, any sworn tier) — both run `FB.doIndependence`, which founds the
player realm and starts a defensive war against the old sovereign; a baron doing
either seizes his home county via `FB.transferProvince` (burying the old holder if
left landless).

**Feudal patronage diminishes within a lifetime.** A successful barony, liege title
petition, neighboring-fief petition, or court-awarded escheat increments
`player.liegeGrants`; every prior grant multiplies the next grant's final chance by
`balance.liegeGrantRepeatMult` (0.2 by default). The multiplier is applied after each
path's normal chance clamp, so its minimum chance cannot erase the penalty. Failed
petitions do not count. Buying or conquering land, settling wasteland, inheritance,
independence, and automatic de jure promotions do not count as patronage. Succession
resets both `liegeGrants` and the lifetime `warService` tally.

**Inside a realm, counties also change hands without war.** A vassal house carries a
`favor` standing at its liege's court (−100…100, drifting yearly in `FB.worldTick`).
The Deeds tab offers three intra-realm paths to a neighbor's county, all following the
grant pattern (`state.holder[pid]` flips to `'player'`, `owner` and the player's liege
untouched, landless holders buried by `FB.realmBuryIfEmpty`): *Petition for a
neighbor's fief* (`petition_county` → `UI.showPetitionCounty` → the `county_petition`
event — gated on liege opinion, prestige, and the lifetime `player.warService` tally
built by riding with the liege's host, against the victim's `favor`); *Buy out a weak
neighbor* (`buy_county`, a vassal-only gold sink for adjacent rank-1 counts with no
vassals of their own); and *Settle the wasteland* (`settle_waste` → `FB.settleWaste`,
which turns a bordering wasteland province into a true county of the player's demesne —
settler culture and faith, belonging to no de jure duchy). Separately, a dying petty
count may leave no heir (`balance.escheatChance`, `FB.escheatRealm` in the yearly
tick): the fief escheats to the liege unless a bordering player of the same sovereign
wins the scramble (liege opinion, prestige, service) — and heirless fiefs of the
player's own vassals simply return to the player's hand.
AI rulers stay lightweight `realm.ruler` objects (name, culture, age, martial, and a
`trait` from `FB.RULER_TRAITS` — the house's temper, which the royal council reads at
king tier and up), not full chars — the Deeds banner's "vassal of X" links to their sheet via
`UI.showLiegeModal` (`data-liege` click delegation), not `UI.showCharModal`. See
[council.md](council.md) for how the player monarch's own vassal rulers sit as great
officers of the crown.

Every living AI ruler sheet offers the same cash-or-armory gift picker. Cash prices follow
realm rank through `balance.rulerCashGiftCostByRank` (Count 10, Duke 15, King 25, Emperor
40 by default) and grant `balance.rulerCashGiftOpinion` (+15). Unequipped, unpledged items
grant the same +4/+8/+12 quality-tier influence as personal item gifts and permanently
leave the family armory; their semantic snapshot remains in the Chronicle. Direct and
higher lieges and all vassals beneath the player gain Favor, while rulers outside that
feudal chain gain Opinion. Both write the existing player-relative realm-opinion store.
Cash and items share one 90-day ruler-recipient clock in `player.realmGiftTurns`. Each
entry stores the gift turn and `realm.ruler.generation`, so succession makes the new ruler
a fresh recipient without erasing unrelated clocks. Every accepted ruler gift spends one
day.

**Tiers** 0–7 (serf…emperor) feed the five broader societal roles documented in
[events.md](events.md). Runtime changes use `FB.setPlayerTier`, which preserves the
gentry-generation rule while immediately revalidating travel, focus, livelihood
staffing, and any lower-to-landed farewell. Political vassal/sovereign status remains
separate from this audience. Map
ownership only begins at tier 4 (`state.player.provs`); tier 3 (baron) is a status inside a
county — and bound to it: a baron's liege is always the county's direct holder, so if his
lord's house dies — or the county changes hands under a living lord — the baron reattaches
to whoever holds his home (`FB.transferProvince`, with a catch-all repair in
`FB.checkTierPromotions`), never standing "independent" nor kneeling to a lord who no
longer holds his home. Tier-2 (gentry) content gates on tier alone, not profession, so the clergy careers
share it: an abbot or qadi keeps the cloth (`tierSet` in `js/events.js` preserves
monk/priest) but manages the manor like any gentry. Ordinary feudal elevation requires
an **established gentle house**: `player.gentryGeneration` records the generation that
first reached tier 2, and only a later generation may petition for a barony or receive
the unsolicited offer. Both paths use `balance.baronyPrestige` and
`balance.baronyOpinion`. Tier-2 scenarios begin with an established house, and older
saves without the additive field are treated the same way. Battlefield knighting and
the learned clerical paths remain exceptional personal careers: they may establish
gentry or rise directly to tier 3 without this ordinary patronage gate. The household
religious ladder in `js/economy.js` reaches the same compatibility flags and tiers
directly: abbot/qadi raises a player to tier 2, bishop/chief qadi to tier 3, while a
dependent character receives the corresponding marriage/social `station` without becoming
the landed player. The unsolicited
`grant_of_barony` event lets eligible gentry accept, decline for a purse, or decline
graciously. Short of "Autoresolve everything", automation leaves every
title-changing or independence decision to the player. Promotions above count happen
in `FB.checkTierPromotions` from de jure majorities:
a duchy for tier 5, a kingdom (independent) for 6, two kingdoms of one empire for 7.
The exact rules live in `FB.duchyProgress`/`FB.kingdomProgress`/`FB.empireProgress`
(`js/world.js`), shared by the tier check and the UI readouts: a duchy must span ≥2 de
jure counties and demands ≥ max(2, ⌈n/2⌉) held, a kingdom ⌈n/2⌉, an empire two kingdom
majorities. Every empire therefore has at least two de jure kingdoms; Italia is divided
between Italy and Sicily, with Benevento, Apulia, Calabria, and Sicily belonging to the
latter. Wastelands and colonies settled on them have no de jure duchy, so they count
toward no title. The province panel spells out have/need for the tapped county (and flags
lands that feed no title) under a row labeled "De jure (rightful liege)" — How to Play
glosses the term in plain language — and the 🗺/R map filter has de jure duchy and
kingdom modes that name the player's strongest claim.

**A lord holds only so much in his own hand.** Tier dignity counts every county the
player's *realm* controls — held directly or by a vassal beneath him in the chain
(`playerShare` in `js/world.js` walks each county's holder up the liege chain to
`'player'`), so granting land to vassals never costs progress toward a duchy, kingdom,
or empire. That frees a **domain limit**: the player may hold at most
`balance.domainBase + ⌊stewardship / balance.domainStewPer⌋` counties directly
(`FB.domainCap`); each county over the cap multiplies his *own* demesne income and levy
by `1 − balance.overDomainPenalty` (`FB.domainPenalty`, applied inside `FB.playerTax`
and `FB.playerLevy` — vassal dues and vassal levies are never penalized). The remedy is
the `grant_land` deed: enfeoff the surplus to a new count (`FB.grantCounty`, realm
`pv_<pid>`) or — only when every de jure county of a duchy sits in the player's own
hand (`FB.grantableDuchies`) — raise a duke over the whole duchy (`FB.grantDuchy`, realm
`pd_<did>`, holding all its counties directly), who then renders `vassalTaxRate` of its
counties' tax and `vassalLevyRate` of their levy back to you.

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

Related: [provinces.md](provinces.md) for the land itself.

## Realm faith and campaign settlements

`realm.religion` is an optional saved, locale-neutral identity for a ruling realm.
`FB.realmReligionId` prefers it and falls back to the capital county's population
religion for authored realms and old saves. This separates ruler faith from local
population: conquest, capital relocation, and great holy-war settlement do not
silently convert county culture or religion. Fresh authored realms and generated
vassals initialize the field from their capital when no explicit value is supplied.

Great holy-war occupations are not realms and never alter ownership during combat.
Final settlement uses `FB.transferProvince` only for occupied objectives. Uncaptured
counties retain their old sovereigns, holders, capitals, and vassal chains. New
campaign sovereigns and vassals receive the calling religion explicitly, plus a
sponsor-derived culture and dynasty identity. Ordinary province transfer remains
responsible for relocating a dispossessed capital, marking a landless house dead,
and vacating any centralized religious office it held.
