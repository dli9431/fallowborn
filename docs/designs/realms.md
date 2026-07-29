# Realms, the liege hierarchy & tiers

## Dynastic realm identity

Every living rank-1 through rank-4 AI realm carries `realm.succession`: lightweight
sons and daughters, a ruler-generation stamp, a single designated heir, and an ordered
line. Sons precede daughters and older children precede younger ones. If the designated
heir dies, that child's living descendants retain the branch's place before the heir's
siblings. These people remain compact records until the player courts one;
`FB.materializeRoyalChild` then creates the ordinary `state.chars` character used by
courtship, marriage, births, and mortality while retaining its `royalLine` identity.
The ruler remains compact until **Cultivate relationship…** is chosen on the realm
sheet. `FB.materializeRealmRuler` then creates or reuses the current
`succession.rulerMemberId`, reparents the existing compact children beneath that member,
and attaches one ordinary character with the ruler’s saved identity, culture, faith,
age, Martial, trait, station, and current political standing. `FB.realmRulerCharacter`,
`FB.realmIdForRulerCharacter`, and `FB.isReigningRealmRuler` preserve that identity
through sheets, gifts, marriage, and succession. Personal and political Standing are one
synchronized score while the character reigns. The typed facade routes that person
through the realm backing store, so character and realm interactions cannot diverge.

The special `state.realms.player` node is the player's landed realm, not a synonym for
independence. It may have a `liege`; `state.owner` continues to name the top sovereign
while `state.holder` names the player or one of the player's vassals. Foreign-policy,
crown, and attack gates use `FB.isPlayerSovereign`, while landed-hierarchy operations
use the player realm itself. Swearing fealty reparents this node instead of dissolving
it.

**Governance is the player-facing shell over this hierarchy, not another realm
record.** `FB.governanceEligible` admits a territorial baron or a player holding
count-or-greater land, but excludes observe mode, landless offices, and a see-only
Bishop. A Bishop who also holds temporal counties qualifies for those counties.
`FB.governanceSummary` derives stable ids and numbers for role, player realm, liege,
sovereign, demesne, whole territory, domain cap and multiplier, direct vassals,
institution, pending business, and warnings. It delegates to the canonical hierarchy,
Standing, tax, levy, Council, and Estates readers, is never saved, and performs no
political mutation. Kings and emperors are reported as crowned rulers; independent
counts and dukes as sovereign rulers; sworn territorial rulers as vassals.

When a materialized rightful ruler becomes the protagonist, `FB.absorbRealm` joins that
realm to the player's: its ruler's demesne enters the player's hand, its vassals reattach
intact, hierarchy cycles are prevented, outgoing wars end in white peace, and title,
rank, capital, and map ownership are synchronized. Only a sovereign inherited title
changes the sovereign owner of the combined hierarchy. An intact player crown handed
to a downfall usurper may instead leave the displaced rightful character one narrow
restoration right; ordinary county conquest never creates one.

Marriage-residence abdication performs the inverse political handoff without
killing a realm. `FB.abdicatePlayerRealmToHeir` rekeys the special
`state.realms.player` node as a living AI realm ruled by the current lawful heir.
It preserves the realm’s name, color, counties, vassals, liege relationship,
religion, technology, and any religious-head office, while rewriting ownership,
holder, vassal-liege, and live realm references from the player id to the new AI
id. Because the realm never dies, this path creates no usurper, vacancy,
restoration right, or death effects. Existing player-realm alliances end at the
handoff. A tier-3 barony has no realm node to convert; relinquishing it simply
returns that local office to the county’s count.

## Religious head offices

The Catholic office has an elective personal layer described in
[papacy.md](papacy.md). `state.religiousHeads.catholic` still identifies the living
realm controlling the Roman territorial office, while `FB.popeRecognizedBy`,
`FB.papalObedienceForRealm`, and `FB.papalObedienceForCharacter` resolve the claimant
recognized by a viewpoint. This distinction matters only during a durable schism.
The Papal States keep their realm, vassals, and revenue during a vacancy under the
Camerlengo and never advance through `realm.succession`.

Central religious leadership is an office assignment, not a territorial tier.
`FBDATA.religions[id].head` supplies the global fallback `realm`, localized `title`,
recovery policy, required seat or alternative claim-county sets, and the policy for
same-faith wars against the office. The active bookmark may override the initial realm
through `bookmark.religiousHeads`: 867 assigns `papacy`/`abbasid`, while 1066 assigns
`papacy_1066`/`abbasid_1066`. Faiths without `head` metadata, including Shia Islam,
have no centralized head. Ordinary Muslim emperor-tier rulers use Great Sultan or
Great Sultana instead.

A Catholic Bishopric is also an office assignment, but local and personal rather than a
centralized religious head. `character.bishopric` names an abstract see at the holder's
home county without transferring province ownership or creating a realm node. A see-only
player uses tier 3 for compatibility, while title rendering, revenue, retinue, actions,
and succession recognize the episcopal office instead of treating it as a barony. Bishops
may retain separately inherited counties and crowns. Cardinals retain their sees; death or
elevation to Pope vacates them, and a see-only dynasty heir returns to tier-2 gentry while
private household property remains intact.

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
Explicit recovery — and the player-only Sunni succession war below — is the only
office-assignment path. Loading an older save with a dead
mapped realm silently normalizes it to the same saved vacancy shape without replaying
news.

Catholic recovery uses `recovery:'grant_seat'`: a Catholic sovereign personally holding
Roma and another county may grant Roma away. The bookmark's canonical Papacy is rebuilt
as an independent rank-3 realm with a fresh ruler and succession, then assigned the
office. After a 360-day vacancy, a qualified Catholic AI sovereign controlling Roma and
other territory does this automatically. The player restoration awards piety and
prestige, improves Standing with every living Catholic ruler, and clears excommunication.

Sunni recovery uses `recovery:'claim'` with alternative county sets: Baghdad, or Mecca
and Medina together. A sovereign player king or emperor meeting the prestige threshold
and a minimal demesne (`religiousHeadClaimMinRealm` counties, counted from
`player.provs`) may spend piety to attach the office to the existing player realm
without moving land.
After 360 vacant days, independent Sunni AI realms of rank 3+ that meet a county set
and the same size gate (counted over the whole realm bloc) are
ordered by rank, realm strength, then stable realm id; the strongest claims. With no
eligible realm, the explicit vacancy persists. `FB.canRestoreReligiousHead`,
`FB.restoreReligiousHead`, `FB.canClaimReligiousHead`,
`FB.controlsReligiousHeadClaim`, `FB.claimReligiousHead`, and
`FB.religiousHeadRecoveryTick` are the shared policy surface; callers do not match
Papacy/Caliphate realm names.

A sitting Caliph is the one office that can also be taken by force. A sovereign Sunni
player king or emperor gains a `caliphate` succession-war cause against the holder's
sovereign realm (`FB.caliphateWarCause`; no shared border required — the stake is the
office, not land). Victory by siege reassigns the office to the player realm through
the same `FB.assignReligiousHead` path: no county changes hands, the defeated realm
survives, and its ruler's styling simply follows the lost office. The AI never
contests a sitting office this way; its vacancy claim above is unchanged apart from
the new size gate. Office ownership is compared through the holder's live sovereign,
so a vassal-attached office remains contestable. A successor who is no longer a Sunni
sovereign king or emperor loses the personal claim, ending the campaign without land.
See [war.md](war.md).

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
policy; strong vassals occasionally break away (`balance.breakawayChance`). A
sovereign’s Standing and non-aggression pacts now modulate whether an adjacent AI realm attacks the
independent player — see [piety-intrigue-diplomacy.md](piety-intrigue-diplomacy.md). The player
interacts with the whole chain (petition / `pay_homage` / `appeal_lord` /
`swear_fealty` / independence — and, tiers 3–5, the **estates**: the liege's
assembly where the terms of service, the aid and scutage, are voted on — see
[parliament.md](parliament.md)) and, once sovereign, runs vassals of their own
(`grant_land` — a single county via `FB.grantCounty` or a whole de jure duchy via
`FB.grantDuchy`, `demand_taxes`, `revoke_county`; vassal Standing retains its legacy
backing in `player.liegeOps`, taxes flow through `FB.playerTax` at
`balance.vassalTaxRate` and a
share of levies through `FB.playerLevy` at `balance.vassalLevyRate`).

The Land panel's **Notable folk** is a live political view of this hierarchy. It lists
the selected county's direct holder, every living realm sworn directly to that holder
(rank first, then stable realm name/id), and the holder's complete liege chain through
the sovereign, with duplicates removed. The protagonist occupies the same list when
`'player'` is one of those realm nodes, using their full character rather than the
lightweight ruler snapshot. Generated province characters from `FB.provNotables` are a
defensive fallback only when a settled county has no resolvable political ruler, so
ordinary Land browsing neither creates `provChars` nor consumes RNG.

**A count-or-higher protagonist may move the realm seat once per lifetime.**
`FB.capitalRelocationStatus` accepts only a different county held directly in the
player's demesne, and blocks a ruler without the required prestige, during personal
travel, personal war, or active campaign service, or after that character has already
used the choice. `FB.relocatePlayerCapital` revalidates atomically, spends
`balance.capitalRelocationPrestigeCost`, applies
`balance.capitalRelocationPopularOpinion`, and applies
`balance.capitalRelocationVassalFavor` to every living realm sworn directly to
`'player'`. It then synchronizes `player.provinceId` and
`realms.player.capital`. Ownership, holders, lieges, titles, realm faith, vassal
relationships, county population, buildings, and county-bound property do not move.
Personal contacts remain intact at their prior residences; only location-scoped lord
and priest roles regenerate at the new household home. Losing the current capital
instead uses the first surviving directly held county as a free forced fallback, moves
the household with it, and neither consumes nor resets the lifetime choice.

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
event — gated on Standing with the liege, prestige, and the lifetime
`player.warService` tally
built by riding with the liege's host, against the victim's `favor`); *Buy out a weak
neighbor* (`buy_county`, a vassal-only gold sink for adjacent rank-1 counts with no
vassals of their own); and *Settle the wasteland* (`settle_waste` → `FB.settleWaste`,
which turns a bordering wasteland province into a true county of the player's demesne —
settler culture and faith, belonging to no de jure duchy). Separately, a dying petty
count may leave no heir (`balance.escheatChance`, `FB.escheatRealm` in the yearly
tick): the fief escheats to the liege unless a bordering player of the same sovereign
wins the scramble (Standing with the liege, prestige, service) — and heirless fiefs of the
player's own vassals simply return to the player's hand.
AI rulers ordinarily stay lightweight `realm.ruler` objects (name, culture, age, martial,
and a `trait` from `FB.RULER_TRAITS` — the house's temper, which the royal council reads
at king tier and up). The Deeds banner's "vassal of X" links to their realm sheet via
`UI.showLiegeModal` (`data-liege` click delegation); after cultivation materializes the
ruler, both the top identity card and **Open full character sheet** action on that sheet
link to the full character sheet. The cultivation action uses
the ordinary relationship visit to the current capital, including normal route cost and
the 90-day minimum stay; attention advances only while the player is physically there. See
[council.md](council.md) for how the player monarch's own vassal rulers sit as great
officers of the crown.

Every living AI ruler sheet offers the same cash-or-armory gift picker. Cash prices follow
realm rank through `balance.rulerCashGiftCostByRank` (Count 10, Duke 15, King 25, Emperor
40 by default) and grant `balance.rulerCashGiftOpinion` (+15). Unequipped, unpledged items
grant the same +4/+8/+12 quality-tier influence as personal item gifts and permanently
leave the family armory; their semantic snapshot remains in the Chronicle. Direct and
higher lieges, vassals beneath the player, and foreign rulers all gain Standing. Context
changes the available consequences, not the meter; the compatibility backing remains the
player-relative realm-opinion store.
Cash and items share one 90-day ruler-recipient clock in `player.realmGiftTurns`. Each
entry stores the gift turn and `realm.ruler.generation`, so succession makes the new ruler
a fresh recipient without erasing unrelated clocks. Every accepted ruler gift spends one
day. A gift stays immediate inside the sovereign realm containing the player’s permanent
home. Across a sovereign border it travels by saved courier from that home to the current
capital; standing and cooldown apply only on successful arrival. A dead or succeeded
recipient, moved capital, or dead sender makes the courier finish outbound and return the
exact cash or item without a cooldown.

An AI ruler change never leaves the predecessor's Standing attached to the surviving
realm id. A compact heir starts neutral. If the heir was materialized before accession,
the exact person's already-tracked Standing becomes the realm score. Protagonist
succession instead resets all personal and realm Standing because the current save shape
does not store a pairwise heir relationship matrix.

A materialized reigning ruler uses the compact realm’s yearly mortality roll, never
ordinary character mortality. If married to the player they remain resident at the current
capital and are excluded from household enumeration, work, upkeep, standards, retainers,
equipment, and armory reclamation. Ordinary spouse links, marriage standing, the royal
compact/alliance, and shared children remain intact. Conception is possible only while the
player’s physical travel location is that capital, and each shared birth is registered
beneath the reigning member in the compact succession tree. Realm death advances
succession through the normal character death/spouse cleanup exactly once; divorce and
succession also invalidate an active ruler visit.

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
gentry or receive personal offices without this ordinary patronage gate. The household
religious ladder in `js/economy.js` raises abbot/qadi to tier 2 and chief qadi to tier 3.
A Catholic Bishop's personal see supplies tier-3 compatibility without being a barony;
dependent officeholders instead receive the corresponding marriage/social `station`
without becoming the landed player. The unsolicited
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

**Guild monopolies run in both feudal directions.** Guild Charters lets a landed vassal
petition only the exact direct liege; changing or ending that relationship invalidates
the incoming charter immediately. Tier 0–2 charters are scoped to the household's home
province and end on permanent relocation. Baron and greater players may grant one local
Craft or Trade monopoly using their current tier's frozen
`balance.guildMonopolyTerms`. Issuance pays the disclosed fee immediately, applies the
popular-opinion loss, and adds the outgoing charter's tax percentage inside
`FB.playerTax`. The local guild is abstract; a household guildmaster may be named as its
advocate but does not own the right. An outgoing charter survives promotion and
succession but ends if the dynasty falls below landed authority.

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
Final settlement collects every award before changing an owner or holder, then applies
the captured set once in crown-to-county order. Uncaptured counties retain their old
sovereigns, holders, capitals, and vassal chains. New campaign sovereigns and vassals
receive the calling religion explicitly, plus a sponsor-derived culture and dynasty
identity. Empty displaced realms are buried and surviving capitals relocate only after
the complete ownership pass.

A same-faith local holder may be confirmed only when their entire vassal subtree lies
inside the awarded package. Confirmation reparents that realm intact beneath the new
campaign sovereign. A ruler crossing the captured boundary cannot carry uncaptured
land into the settlement; their right and local support instead belong to a generated
local cadet. `FB.assignRealmRulerCharacter(state, realmId, charId)` installs a living,
non-reigning ordinary character on a generated realm while retaining personal parents,
spouse, children, dynasty, and any existing royal-line identity. This is the route for
named holy-war beneficiaries.

An awarded realm may carry additive
`sacredCustody:{religion,siteIds,campaignId,grantTurn}`. Custody changes no population
faith and grants seasonal piety only while a listed site remains in the custodian's
sovereign bloc.
