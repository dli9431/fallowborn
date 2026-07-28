# Design: settlement council and vows

Date: 2026-07-27

Status: implementation plan against Fallowborn v1.67.0. Companion plans:
[temporary county and campaign modifiers](2%20modifiers.md) (Oathbound Host and
Fractured Command live there) and [trait layers and earned traits](3%20traits.md)
(Oathfast lives there).

## Goal

Replace the fixed contribution reward bands at holy-war settlement with claims resolved
by a settlement council, and deepen the existing pledge skeleton into explicit vows.
Contribution stops being the whole answer and becomes one claim basis among vows,
occupation, existing rights, local support, religious office, and council agreement.

Two deliverables, in implementation order (settlement council first, vows second),
shipped as one arc:

1. A general claims-and-settlement engine, consumer-agnostic, with holy war as its first
   consumer.
2. Vow terms on the existing pledge (promise service, name a desire, keep or break it),
   feeding the claims.

## Current implementation (v1.67.0)

What the engine already has, from [`js/holywar.js`](../../fallowborn/js/holywar.js):

- **Campaign lifecycle.** `state.greatHolyWar` moves through `preparation`, `active`,
  `settlement`. The campaign object carries `participants` (attacker and defender
  records), `occupations` (`{ pid: { occupied, progress, progressCamp, occupiedBy } }`),
  `resolve` (-100..100), and `contribution` (`{ realmId: points }`).
- **Contribution scoring.** Three sources: +1 per valid participant realm per season
  (`FB.greatHolyWarSeason`), `10 + dev*2` split across present hosts when an occupation
  completes (`shareOccupationContribution`), and battle results (winner
  `+5 + floor(loserLoss/100)`, survivor loser +1, `FB.greatHolyWarBattle`).
- **The reward bands being replaced.** `FB.greatHolyWarPlayerRewardBand`
  (holywar.js:994) reads three `FBDATA.balance` thresholds
  (`greatHolyWarCrownShare` 0.35, `greatHolyWarDuchyShare` 0.25,
  `greatHolyWarCountyShare` 0.15): kingdom if top contributor with majority capture,
  duchy if a complete duchy is captured, county, else honor. `buildSettlement`
  (holywar.js:1126) then mechanically assigns a sponsor, a capital (`sacredCapital`,
  highest-development holy county), and vassal allocations by the same share
  thresholds, and `settleAiRealm` / `applyPlayerSovereignAward` create the realms via
  `FB.makeVassalRealm` and `FB.transferProvince`.
- **The pledge skeleton.** `state.player.greatHolyWar` is
  `{ campaignId, camp, mode, vow, mandatory, withdrawn, landEligible, renewalRequired,
  inheritedLandEligible }`. Withdrawal costs 100 piety and 50 prestige
  (`FB.withdrawGreatHolyWar`); succession forces a renewal decision
  (`FB.greatHolyWarSuccession`, renew via `FB.renewGreatHolyWarVow`), and declining an
  inherited vow is penalty-free.
- **Existing claims concepts to reuse.** `state.player.fabricatedClaim`
  (`{ pid, madeTurn }`, self-healing via `FB.fabricatedClaimOf`), the war-cause types
  `dejure` / `fabricated` / `restoration` (`FB.warCauses`, actions.js:2516), and the
  religious-head `claimCounties` config.
- **Council machinery to reuse.** There is no ballot structure anywhere; votes are
  probability rolls through `FB.namedChance` (e.g. `parliament_vote` backed by
  `FB.parliamentVoteChance`). The royal council is `state.council =
  { authority, seats }`. The settlement council should follow this idiom: scored
  outcomes plus event-driven player moves, not simulated ballots.
- **Save discipline.** Save format stays `v:3`; new state is additive with lazy
  initialization. The healing hooks already exist: `FB.ensureGreatHolyWar` and
  `FB.repairGreatHolyWar` (wired into the `save.js` restore chain).

### Why the bands fail

The outcome is a pure function of contribution share. The top scorer takes the crown
regardless of what was promised, occupation only gates eligibility instead of grounding
a claim, local rulers are always displaced, and the end of the flagship campaign is the
one moment with no decisions in it. Historical precedents show the missing texture:
Baldwin took Edessa without being top scorer, Bohemond kept Antioch against a promise
to Byzantium, and Jerusalem's crown was a negotiated, contested outcome. The settlement
should be the political payoff of the war, not a payout table.

## The engine: claims and settlement

New namespace `FB.settlement` (its own IIFE file, loaded before `holywar.js`; it
depends only on `model`/`world` helpers). The engine owns case building, claim scoring,
and session flow. Consumers own asset discovery and award application.

### Concepts

- **Case**: one adjudication, opened when a campaign resolves in the attackers' favor.
  Lives at `state.greatHolyWar.settlement.case` while `phase === 'settlement'`, so it
  serializes with the campaign and dies with `finalize`.
- **Assets**: the things being assigned, resolved in a fixed order: the crown
  (sovereign rule of the new realm), sacred-site custody, complete captured duchies,
  then remaining captured counties.
- **Claims**: `(claimant, asset, basis scores)` records, computed by the consumer,
  weighed by the engine.
- **Awards**: the resolved assignments, applied by the consumer through the existing
  realm-creation code (`makeCampaignRealm`, `grantCaptured`, the player award paths).

### Data shapes

```js
case = {
  kind: 'holy_war',                  // extensible to other settlement kinds
  seats: [realmId],                  // sovereign attackers + the religious head
  assets: [ { id, kind, ids } ],     // kind: 'crown'|'sacred'|'duchy'|'county'
  claims: [ claim ],
  awards: [ { asset, claimant, form } ],
  step: n                            // session progress for the UI
};

claim = {
  claimant: 'player' | realmId,
  asset: assetId,
  basis: { contribution, vow, occupation, right, support, office },  // each 0..1
  weight: n                          // weighted sum, balance-tuned
};
```

Weights come from new `FBDATA.balance` knobs (`settlementContributionWeight`,
`settlementVowWeight`, `settlementOccupationWeight`, `settlementRightWeight`,
`settlementSupportWeight`, `settlementOfficeWeight`). The three old band thresholds
stay defined so existing mods and saves read cleanly, but decision logic no longer
consults them.

### Claim bases (holy-war consumer)

| Basis | Source | Notes |
| --- | --- | --- |
| contribution | normalized share of `campaign.contribution` for the claimant's camp | The existing scoring code is preserved untouched as evidence in settlement |
| vow | kept vow terms: seasons served vs promised, muster honored, and whether the named desire matches this asset | See "Vows deepened" below |
| occupation | for a county asset, `occupations[pid].occupiedBy === claimant`; for crown/duchy assets, the fraction of member counties the claimant occupied | Turns the already-tracked `occupiedBy` field from trivia into a claim |
| right | existing rights on the asset: a `fabricatedClaim` inside it, a `restorationRight`, or prior possession by a same-faith ruler (the confirmation case below) | Reuses the war-cause checks |
| support | local acceptance: culture and religion match between claimant and the asset's counties, development-weighted | Can later incorporate richer Common Voice components when those exist |
| office | religious standing: the head's blessing (a session move), piety rank, and service mode (`host` beats `expedition`) | The head is a seat, not a claimant, for land assets |

### Resolution: the settlement session

Matches the existing event idiom (probability rolls and opinion deltas, no ballots). A
short interactive session resolves assets in order; for each contested asset:

1. The engine computes claim weights; the presumptive award is the highest weight.
2. If the player is seated or claiming, they get session moves as event options:
   - **Press the claim**: a `namedChance` roll (diplomacy plus weight margin) to take
     an asset the weights would deny them.
   - **Endorse a rival**: concede the asset for a favor (opinion, gold, or a named
     future award boost this session).
   - **Offer terms**: take the asset but as a vassal of the sponsor, or with tribute.
   - **Object**: contest an AI award, costing standing with the council for a reroll.
3. The religious head blesses at most one claim per session (an `office` boost), with
   sacred-site custody the head's default interest.
4. AI-vs-AI assets resolve by weight alone; losers take an opinion hit against the
   winner. No simulated bargaining when the player is not involved.
5. Awards apply through the existing creation code; rank derives from awarded assets
   as today (kingdom on crown with captured majority, duchy, county), and the honor
   fallback (`nonLandReward`) survives for landless contributors.

**Confirmation of locals.** If an objective county's current holder already shares the
calling faith (reconquered heartland, mid-war conversion, or a defector), a
confirmation claim exists for them: awarding it keeps them in place as a vassal of the
new realm rather than displacing them. This provides the minimal distinction between
confirmed, subordinated, and displaced local rulers.

**Deferred forms** (out of scope for this arc): military orders, bishoprics and marches
as landholders, tributary states, mid-campaign splinter objectives (those belong to the
routes-and-contingents arc), and campaign councils during the war.

## Vows deepened

Extend the pledge with terms chosen at join time, on the existing
`state.player.greatHolyWar` object:

```js
vowTerms: {
  seasons: n,                        // promised seasons of service
  desire: { kind, id },              // 'crown'|'duchy'|'county'|'sacred'|'honor'
  beneficiary: charId | null,        // optional: a kinsman named for the reward
  served: n,                         // kept record, ticked by greatHolyWarSeason
  mustered: bool
}
```

- **Promise.** At `FB.joinGreatHolyWar`, the player picks a service length and names a
  desire. A named desire concentrates the vow basis on that asset and weakens it
  elsewhere: vows are a bet, not a bonus.
- **Beneficiary.** Naming a kinsman routes an awarded county to a cadet branch, using
  the machinery `settleDeclinedPlayerAllocation` already has for cadet rulers.
- **Keeping.** `served` accrues on the existing season tick. A vow is kept when
  `served >= seasons` at resolution; kept vows score the vow basis and feed the
  Oathfast reputation ([trait plan](3%20traits.md)).
- **Breaking.** Withdrawal before the promised service multiplies the existing
  penalties (piety and prestige, `FB.withdrawGreatHolyWar`) and records a broken vow in
  `greatHolyWarHistory`, which future campaigns read (a broken-vow past weakens the vow
  basis next time).
- **Inheritance.** The existing succession flow carries `vowTerms` to the heir;
  renewing keeps the `served` credit, declining stays penalty-free but forfeits the vow
  basis, exactly extending today's `renewalRequired` behavior.
- **Campaign modifiers.** While an unbroken public vow stands, the Oathbound Host
  campaign modifier applies; a contested settlement session can leave Fractured
  Command on a follow-up campaign. Both are defined in the
  [modifier plan](2%20modifiers.md) and are that framework's first users.

**AI vows.** Attacker participant records gain `{ vowSeasons, desire }`, rolled at join
from personality (zealous leaders name the sacred site, ambitious ones the crown), so
AI claims have texture and the session has rivals with legible motives. Two fields on
an existing record, no new structures.

## Save, compatibility, testing

- Everything is additive under save v3 with lazy initialization: new keys on the
  campaign, the pledge, and the history object, healed by `FB.ensureGreatHolyWar` and
  `FB.repairGreatHolyWar`. A pre-arc save loaded mid-campaign simply has no `vowTerms`
  (defaults apply) and, if already in the settlement phase, `repairGreatHolyWar`
  rebuilds a case from the stored `settlement` object or falls back to finalizing on
  the old band result.
- No save-format bump is required.
- `docs/MODDING.md` gains the new balance keys and any new event trigger/effect keys;
  all new player-facing text is routed through the i18n layer as authored.
- Testing is manual in the browser per the game repo rules. The checklist: call, pledge
  with terms, serve, resolve, run the session (press, endorse, object, bless),
  accept and decline awards, inherited renewal mid-campaign, withdrawal penalties, and
  loading an old save at each phase.

## Extensibility contract

What must stay consumer-agnostic so later settlement types are authoring jobs, not
rewrites:

- `kind` on the case; no holy-war assumptions in the engine core.
- Seat composition parameterized rather than assuming a religious head.
- Asset kinds extensible beyond land.
- Basis sets extensible beyond the holy-war legitimacy sources.
- Award application is consumer-owned callbacks; the engine never touches
  `FB.transferProvince` directly.

The engine answers the same questions across settlement types: who receives authority,
which local rulers are confirmed or displaced, and whether a new institution is
created.

## Ship

A MINOR version with its own devlog ("The settlement of the crusades"). `FB.VERSION`
bump and i18n catalog regeneration at integration, as always.

## Open questions

- Defender victories: does the losing attacker camp face any settlement (reparations,
  broken-vow fallout beyond the pledge), or is the council attacker-victory only?
  Recommendation: attacker-victory only in v1, matching today.
- Sacred-site custody: a custody flag plus piety income for the awarded realm, or the
  religious head as an actual landholder? Recommendation: custody flag in v1; a landed
  church remains out of scope.
- Grudges: an immediate opinion delta only, or a stored grievance consumed by later
  events? A "Settlement Grudge" realm modifier is a natural second user of the
  modifier framework if the opinion delta feels too thin.
- Whether mandatory defenders who flipped mid-war (conversion) can claim confirmation,
  or only pre-war same-faith holders.
