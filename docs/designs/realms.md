# Realms, the liege hierarchy & tiers

## Dynastic realm identity

Every living dynastic rank-1 through rank-4 AI realm carries `realm.succession`: lightweight
sons and daughters, a consort, a ruler-generation stamp, a single designated heir, and
an ordered line. Sons precede daughters and older children precede younger ones. If the
designated heir dies, that child's living descendants retain the branch's place before
the heir's siblings. The Papal States instead carry a one-root `papalElective`
succession whose order remains empty.

**The living court is materialized eagerly; the dead compact back to members.** A realm
opens on a real face and a full character card rather than a crest and one line, because
its ruler, adult consort, and displayed heirs are ordinary `state.chars` records from
world creation. `FB.materializeRoyalChild`, `FB.materializeRealmRuler`, and
`FB.materializeRealmConsort` are the only three creation paths, and they are the same
ones a player's first courtship has always used; eagerness only calls them earlier. How
much of a court exists up front is the single `COURT_EAGERNESS` constant at the top of
`js/world.js` - `'court'` (ruler, consort, and heirs) or `'ruler'` - so the setting can
be re-tuned from one line after profiling. Under `'ruler'`, the first realm-sheet open
calls `FB.ensureRealmCourtForDisplay`, which invokes those same materializers for the
bounded consort and heir set; the modal never silently degrades to a ruler-only court.
The display fill creates missing records only - it never advances a dead root, rewrites
marriage links on records that already exist, or ensures the religious-office map
(`FB.papacyTerritorialRealm` is a snapshot read for this reason). Those repairs belong
to load and to the yearly `FB.ensureDynasticState` pass, so under the default policy
opening a sheet writes nothing at all - rendering never repairs a save.
The record count stays bound by the map rather than by campaign length: see the compaction rule in
[characters.md](characters.md). Eager loading and the realm UI both take their bounded
six-member set from `FB.realmFamilySnapshot`; the mutating `FB.realmFamily` ensure path
delegates to the same order, so equal-age members cannot differ between loading and
display.

`FB.materializeRealmRuler` creates or reuses the current `succession.rulerMemberId`,
reparents the existing compact children beneath that member, and attaches one ordinary
character with the ruler’s saved identity, culture, faith, age, effective Martial,
trait, station, and current political standing. `FB.realmRulerCharacter`,
`FB.realmIdForRulerCharacter`, and `FB.isReigningRealmRuler` preserve that identity
through sheets, gifts, marriage, and succession. Personal and political Standing are one
synchronized score while the character reigns. The typed facade routes that person
through the realm backing store, so character and realm interactions cannot diverge.

**The consort is a succession member with `role: 'consort'`.** One is seeded per
uncommitted ruler generation, of the opposite sex to the ruler and of a plausible age.
An adult pair is married through the ordinary spouse fields so `FB.spousesOf` reports
them; a child ruler instead gets a similarly aged compact reservation with no character
or relationship link until both are sixteen. A consort
is **excluded from the succession by that explicit role and never by parent grouping** -
a consort's `parentId` is legitimately `null`, which is exactly what
`FB.refreshRealmSuccession`'s order fallback matches when there is no ruler root, and it
is also as much of the intent as a build without the `role` concept can read. Consorts
of past generations stay in the tree as dated tombstones and are never read as the
sitting spouse; `FB.realmConsortMember` resolves the current generation's reservation,
while `FB.realmConsortCharacter` resolves it only once it is an actual marriage. There
is no AI remarriage, so a generation whose consort has died simply has none. If an
invalid generated consort is retired because a real commitment superseded it, its
ordinary character record remains navigable; any future same-generation replacement
uses the next deterministic consort suffix rather than colliding with that retained id.

**A ruler who already has a spouse or living betrothal is never handed another.** The
cases that matter are an heir the protagonist married taking the throne and a foreign
heir pledged to the protagonist's child: seeding a consort beside either commitment
would silently create two partners and block the promised wedding. Both the seeding and
the linkage test use the ordinary spouse and betrothal fields, with
`FB.spousesSnapshot` checking the reverse spouse direction because a wife's `spouseId`
points at her husband while his holds only the first. Whether anyone may hold more than
one spouse belongs to the marriage system, and this path must never answer it by
accident. A child accession can therefore reserve its generated match without becoming
unavailable for a real pledge; the reservation becomes an ordinary marriage only once
both are sixteen and only if no outside commitment has superseded it. A
consequence worth knowing: a consorted ruler fails the courtship gate's married check,
so the player courts royal children rather than reigning rulers unless a throne is
widowed. Saves written before consorts existed keep their current generation
unchanged - inventing a spouse for a ruler twenty years into a reign reads worse than
waiting, so those courts gain one at their next succession.

**A succession is continuity of person, not a re-roll.** `FB.advanceRealmSuccession`
eagerly materializes the exact heir on their scoped court stream, then promotes that
record rather than building a fresh stub with a newly drawn Martial score and temper.
This applies even to a collateral beyond the six displayed relatives, so succession
never consumes the shared world RNG. The heir a player spent years cultivating is the
ruler who takes the throne. `FB.realmRulerCharacter` remains the one place character
fields are pushed back onto `realm.ruler`, keeping that stub a projection of the record
rather than a rival truth.
That projection uses `FB.skillSnapshot`, as accession does, so trait and equipment
Martial modifiers remain part of the war-strength stub instead of being overwritten by
the raw trained value.
If a malformed save has an unrelated record occupying the designated heir's derived
character id, accession preserves that unrelated person, retires only the unusable
compact candidate, and continues through the ordered line. A repair-driven accession
from load or realm revival restores the throne and generation-stamped alliances without
queuing a diplomacy story or reconciling the live player household; those side effects
belong to an in-play succession.

Succession-member ids are derived from realm id, ruler generation, role, and stable
member ordinal or character id. They never embed `FB.uid`, so founding or repairing a
realm midway through a year cannot make court identity depend on which character sheet
the player opened first. Character ids remain a direct `FB.courtCharacterId(memberId)`
mapping. A materializer reclaims an orphan only when its `royalLine` names that exact
member; an unrelated collision is left untouched and never triggers a sequential-id
fallback.

**`FB.isReigningRealmRuler` is answered from a derived index.** `realmIdForRulerCharacter`
resolves a reigning ruler through a module-private `charId → realmId` map in
`js/world.js`, rebuilt by `FB.ensureDynasticState` on new game and on load. It is a
cache and not the truth: every hit is verified against the realm's own
`succession.members[rulerMemberId].charId` before it is trusted, and a failed check
drops the entry and falls back to the scan. Without the index the yearly mortality pass
costs a full realm scan for every record that is *not* a reigning ruler, which is
O(records × realms) a year. The index is never serialized - see
[state-and-saves.md](state-and-saves.md).

The realm simulation stays the driver. `FB.worldTick` and `tickRoyalFamily` remain
authoritative for AI aging, death, and succession; eager records add presence, not
simulation. The player's own yearly mortality pass exempts every court character it
has no navigable tie to, and `tickRoyalFamily` rolls exactly those. The two conditions
are exact complements, so no court character is rolled twice and none is immortal.
The court curve is scaled by `balance.mortalityBase`, matching the protagonist and
household curves.
A character may retain their birth `royalLine` after receiving a different crown;
their birth family's tick therefore also exempts every character for whom
`FB.isReigningRealmRuler` is true. Character death closes the birth member and scans
living ruler roots to advance the throne actually worn. `FB.ensureDynasticState`
immediately advances any living realm whose ruler member is already dead, so load or
realm revival never waits inside the yearly mortality chance and never resurrects a
compacted ruler. The county and duchy grant revival paths call the narrow
`FB.ensureRealmCourt` form before returning.

The yearly pass takes one read-only snapshot of the shared family index after ensure
work. Court retention reads its cached `kinById`, and death cleanup reads the snapshot's
reverse spouse and betrothal maps. Each death may invalidate the live index without
forcing another full `state.chars` rebuild; compaction trusts the retention decision
captured before `FB.killChar` severed those links. A generated former spouse is also
retained while they parent a living player descendant, so detaching an unobserved court
record cannot erase that descendant's mother or father.

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
institution, active modifier records in the directly held demesne, pending business,
and warnings. It delegates to the canonical hierarchy, Standing, tax, levy, modifier,
Council, and Estates readers, is never saved, and performs no political mutation.
Kings and emperors are reported as crowned rulers; independent counts and dukes as
sovereign rulers; sworn territorial rulers as vassals.

## The relevant political court

### Bounded ruler agency

Every living AI ruler has one generation-stamped aim in
`state.agency.rulerAims`: secure the dynasty, expand, accumulate wealth,
defend the faith, strengthen the crown, seek independence, or preserve peace.
The aim is chosen deterministically from the ruler, realm position, court
family, and temperament. Succession replaces it because the generation stamp
no longer matches; opening a realm sheet only reads the saved aim.

Ruler-to-ruler regard is deliberately sparse. `state.agency.relations` stores
only structural contacts cultivated by the yearly pass: liege/vassal ties,
neighboring sovereigns, and one peer per house in the protagonist's already
bounded political court. A vassal's regard for their liege continues to use
`realm.favor`, and either direction involving the protagonist continues to use
typed realm Standing. An absent sparse edge derives a baseline from
culture, directional faith relation, alliance, and war. Faith contributes the shared
historical prior from `FB.faithRelationBaseline`: exact +15, in-fold +10,
schismatic +5, foreign −10, or explicitly hostile −25. Stale edges expire after
eight years. There
is no all-ruler pairwise matrix and no all-character social graph. Both ruler
generations are stamped on a stored edge, so either succession returns that
pair to its derived baseline instead of inheriting a predecessor's friendship.

Magnate affinity adds the member's regard for its prospective leader. Estates
motion posture also adds the bloc members' relationships with the player's
house and their current ruler aims. These remain visible reason-coded parts of
the deterministic forecast; only the sparse relation records and ordinary
annual allegiance are durable.

AI approaches to the protagonist are globally capped at one per year and must
pass `FB.rulerPlayerRelevance`. The check performs one cached county-distance
walk from the household home. A foreign court may reach farther when it shares
the protagonist's culture and a non-hostile branch of the faith graph, less far
when it shares only one, and only a few county steps when it shares neither.
Exact faith improves its priority through the same directional baseline, while
a four-year per-ruler cooldown prevents one favored court from
monopolizing the annual slot. Rulers in the same sovereign hierarchy and
already-committed war, pact, alliance, or royal-marriage relationships remain
relevant. Thus an
unconnected Sunni ruler in Iraq cannot send social or marriage overtures to an
Irish Catholic household, while a nearby foreign ruler or an actual liege can.
Hostile border wars retain their existing adjacency gate.

Expansionist sovereigns may fund one discontented vassal of an adjacent rival.
`state.agency.rebelSupport` stores at most three five-year records and increases
the existing seeded breakaway probability; it does not create a second civil-war
engine. Funding directed at the player's own vassal also passes the player
relevance gate and queues an exact sponsor-generation event to expose the money,
buy back the oath, or watch it continue.

Political blocs are simulated only where they can affect the protagonist.
`FB.politicalCourt` derives the ruler's house, living landed houses sworn
directly to that ruler, and the player's house when sworn there. It excludes
unrelated sovereign trees, indirect vassal houses, empty generated
placeholders, and houses without a ruler or territory. For a player crown,
the same rule covers the player house and its direct vassals. The ruler stays
first; other landed houses use stable realm-id order, with a sworn player
house last.

House influence is a current-state projection:

`1 + rank×2 + directly held counties + floor(other territory/2) + 1 for a Council office`.

Rank is realm rank (or player tier minus three), "other territory" is the
house's vassal subtree beyond its own demesne, and the Council bonus applies
only to a real great office in the player's crown. Bloc influence is the sum
of member-house influence; a vote requires `floor(total/2) + 1`.

`FBDATA.politicalBlocs` defines the localized Crown, Mercantile, Magnate, and
Independent archetype presentation and their per-policy starting postures
(`motions.<policyId>` for each `FBDATA.policies` entry). `js/politics.js`
assigns real court houses from current interests:
Crown uses Standing/favor, Council office, shared faith, and ruler
temperament; Mercantile uses guild rank, monopolies, enterprises, active
trade contracts, and commercial county modifiers. Up to two highest-influence
otherwise unaligned houses lead Magnate affinities, whose followers respond
to culture, faith, adjacent land, and leader rank. A house without a strong
alignment forms its own singleton Independent bloc. Meeting the Crown
threshold takes precedence, followed by meeting the Mercantile threshold;
only otherwise unaligned houses choose their strongest Magnate affinity or
remain Independent.

Only the allegiance is durable. An annual review retains an ordinary
affiliation unless its basis disappears or another valid interest exceeds it
by at least 25 points. Voluntary realignment waits while any motion is
pending, then the overdue review occurs after the motion clears.
For an Estates-eligible vassal, `FB.politicalSummary` includes a forecast for
every policy in the catalog plus the active pending-motion forecast.
Crown-side blocs remain visible without implying those vassal motions apply
to crown policy. The summary and `FB.politicalMotionForecast` derive all
membership details, reasons, influence, postures, and probabilities without
consuming RNG or mutating game state.

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
handoff. The lawful heir is rejected if they already reign over another living
realm, preserving the one-character/one-throne invariant instead of leaving two
realm roots mapped to one character. A tier-3 barony has no realm node to convert;
relinquishing it simply
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
The effective faith `properties.head` supplies a stable `officeId`, global fallback
`realm`, localized `title`, recovery policy, required seat or alternative claim-county
sets, and the policy for same-faith wars against the office. Inherited faiths share that
office id unless they explicitly override or remove the head. The active bookmark may
override the initial realm through `bookmark.religiousHeads`: 867 assigns
`papacy`/`abbasid`, while 1066 assigns
`papacy_1066`/`abbasid_1066`. Faiths without `head` metadata, including Shia Islam,
have no centralized head. Ordinary Muslim emperor-tier rulers use Great Sultan or
Great Sultana instead. At every rank, male and female AI rulers are styled from their
effective faith's `rankTitles` arrays, with `FBDATA.titles` retained as a legacy fallback.

A Catholic Bishopric is also an office assignment, but local and personal rather than a
centralized religious head. `character.bishopric` names an abstract see at the holder's
home county without transferring province ownership or creating a realm node. A see-only
player uses tier 3 for compatibility, while title rendering, revenue, retinue, actions,
and succession recognize the episcopal office instead of treating it as a barony. Bishops
may retain separately inherited counties and crowns. Cardinals retain their sees; death or
elevation to Pope vacates them, and a see-only dynasty heir returns to tier-2 gentry while
private household property remains intact.

The live assignment belongs to `state.religiousHeads[officeId]`, whose value is an
exact realm id or `null` for an explicit vacancy. `FB.religiousHeadOf` returns the
assigned living realm or `null`; `FB.religionsHeadedBy` returns the faith definitions
that own the held offices;
`FB.isReligiousHead` tests either one faith or any office; and
`FB.religiousHeadTitle` renders the localized office title. AI and player title
rendering query these helpers before secular rank, and semantic player title snapshots
record `headReligion` plus the English `headTitle` fallback so save labels, legends,
and durable messages render in the active locale.

Every realm-death boundary calls `FB.markRealmDead`, which passes its assigned offices
through `FB.vacateReligiousHeads` before killing the temporal realm. The assignment
becomes `null` exactly once, a durable vacancy notice is emitted, and
`state.religiousHeadVacancies[officeId]` records `{turn,formerHolder}`. Losing only
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
policy; strong vassals occasionally break away (`balance.breakawayChance`). That base
chance is unchanged for a player crown with no recent War of Aggression. Each such
declaration still remembered for the current ruler multiplies breakaway pressure, and
negative Standing with the exact vassal compounds it, without creating an automatic
revolt or a second civil-war system. A
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
the sovereign, with duplicates removed. Each row paints the canonical reigning
character's portrait and derives age and Martial from that full character record. The
protagonist occupies the same list when `'player'` is one of those realm nodes.
Generated province characters from `FB.provNotables` are a defensive fallback only
when a settled county has no resolvable political ruler, so ordinary Land browsing
neither creates `provChars` nor consumes RNG.

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
`FB.checkTierPromotions` walks broken chains back up. For a count or higher the same
petition instead grants a county out of the liege's own hand
(`FB.liegeGrantCandidates`): adjacent to the player's lands, never the liege's seat,
and never his last directly held county — a lord rewards service, but he does not
give his power base away. The grant changes no liege and no sovereign: the player
stays inside the realm. And only the crown can make a duke — if the player's living
liege is not at least a king, a completed duchy majority stays a *claim* without the
style (announced once per generation) until he answers to a king, an emperor, or no
one. Independence comes two ways:
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
AI realms retain a lightweight `realm.ruler` projection (name, culture, age, effective
Martial, and a `trait` from `FB.RULER_TRAITS` — the house's temper, which the royal
council reads at king tier and up), but every living ruler is backed by a full eager
character. The Deeds banner's "vassal of X" links to their realm sheet via
`UI.showLiegeModal` (`data-liege` click delegation); both the top identity card and
**Open full character sheet** action on that sheet link to the full character sheet.
The cultivation action uses
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

When a neighboring or compact-linked sovereign changes ruler, an occasional diplomatic
story may be queued after that succession adjustment. Its context stores the realm id and
exact new `rulerGeneration`; another succession invalidates the story before resolution. A former
alliance is remembered only as event context after the ordinary generation-stamp repair
ends it. A state-level pact remains only when its existing expiry says so. The story may
offer a first embassy, a fresh pact, or renewal of a still-live pact, but it cannot copy
the predecessor’s Standing or revive an invalid alliance.

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
an **established gentle house**: `player.gentryGeneration` records the line depth that
first reached tier 2, and only a genuinely later generation of the line may petition
for a barony or receive the unsolicited offer. Generations are counted by
`player.lineDepth`, the genealogical depth of the current head, so a sibling or cousin
of the founder's own generation does not qualify. Both paths use `balance.baronyPrestige` and
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
a duchy for tier 5, a kingdom (independent) for 6, two kingdoms of one empire for 7 —
with one vassal exception: the duchy promotion fires only when the player's living
liege (if any) is a king or greater, since a mere duke cannot raise a peer of his own.
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

Governance exposes a preview-first **Domain Cleanup** assistant while the player is over
that limit. `FB.domainCleanupPlan` is read-only, deterministic, and never consumes RNG. It
keeps the household home and realm capital, omits counties in the `grantCounty` protection
scope, prefers complete grantable duchies that fit the exact excess, and then chooses the
least-developed eligible counties. The preview names every grant and compares the
base county tax and levy plus direct-vassal land contributions before and after; it
intentionally excludes character, household, equipment, building, office, policy, and
national multipliers or flat bonuses.
`FB.applyDomainCleanupPlan` requires the exact reviewed signature, rejects an incomplete or
stale proposal, and then uses the ordinary county/duchy grant mutations. Reservations are
assistant and grant-picker constraints only: removing one restores the ordinary manual
choice, and no other conquest or title-loss rule consults it.

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
Each normalized incoming or outgoing record also carries a deterministic `contractId`
derived from slot, start turn, and profession. Political plots use that id to distinguish
the exact charter they began against from a later replacement in the same slot.

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
remains the other way down, landing at the same tier 2. Beyond these catastrophes, the
ladder also descends **one rung at a time**: the **hollow crown** lapses a tier-5+
dignity that has rested below its de jure substance (or its independence) past a grace
window — a duke whose living liege is not at least a king counts as lacking substance,
so the impossible duke-under-a-duke style lapses the same way —
`FB.checkTierPromotions` stamps `player.titleLapse`, warns by event, then steps
the style down a rung; a beaten defender may **kneel to the victor** and keep his land
as a vassal; a defiant vassal faces **attainder** and forfeiture; a beaten leader may be
**captured and ransomed**; and commoners slide the old road into serfdom through
**distraint, debt bondage, and wartime devastation**. See
[descent.md](descent.md) for the full system.

Related: [provinces.md](provinces.md) for the land itself.

## Ruler interaction boundary

The realm/ruler interaction card is the authoritative one-counterpart
political sheet. It derives rank, realm faith, capital, territorial
relationship, war state, typed Standing, pact/alliance/foreign-policy
commitments, gift courier state, cultivation, relevant feudal deeds, and
realm-specific war causes. Governance remains the overview of the player's own
domain and institution; the counterpart card links there instead of repeating
those summaries.

Compact realm identity remains authoritative for the reigning office, ruler
generation, capital, succession, ruler-gift price/cooldown, alliance stamp, and
war. A materialized ruler character adds personal traits and relationships but
does not replace those records. `UI.realmInteractionCard` and
`UI.characterInteractionCard` both resolve the ruler through typed Standing,
so the displayed value is identical and a political gift appears only once.
Building either card model does not call succession creation or ruler
materialization. Opening the realm sheet is an explicit exception: it fills the bounded
court on demand when startup eagerness is `'ruler'`. `FB.realmRulerCharacterSnapshot`
also avoids the compatibility sync performed by the older ruler getter, while
`FB.realmRulerStandingSnapshot` reconciles the two legacy Standing stores
without writing either one. Explicit adjustments and the ordinary daily
materialized-ruler synchronization still persist the reconciled value. A compact royal
outside the displayed court still materializes only after an explicit courtship route
or when accession selects that exact member.

## Realm faith and campaign settlements

`realm.religion` is an optional saved, locale-neutral identity for a ruling realm.
`FB.realmReligionId` prefers it and falls back to the capital county's population
religion for authored realms and old saves. This separates ruler faith from local
population: conquest, capital relocation, and great holy-war settlement do not
silently convert county culture or religion. Fresh authored realms and generated
vassals initialize the field from their capital when no explicit value is supplied.
The rare AI dynastic-alliance pairing accepts `same`, `in_fold`, or `schismatic`
neighbors only when neither direction is `hostile` or `foreign`; it no longer compares
the four legacy broad groups.

Great holy-war occupations are not realms and never alter ownership during combat.
Final settlement collects every award before changing an owner or holder, then applies
the captured set once in crown-to-county order. Uncaptured counties retain their old
sovereigns, holders, capitals, and vassal chains. New campaign sovereigns and vassals
receive the calling religion explicitly, plus a sponsor-derived culture and dynasty
identity. Empty displaced realms are buried and surviving capitals relocate only after
the complete ownership pass.

A local holder in the caller's faith fold may be confirmed only when their entire
vassal subtree lies
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
