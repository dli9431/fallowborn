'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'js/lordships.js', 'js/actions.js', 'js/events.js', 'js/world.js', 'js/wars.js',
  'js/armies.js', 'js/model.js', 'js/main.js', 'js/save.js', 'js/modifiers.js', 'js/institutions.js',
  'js/fortifications.js', 'js/treasury.js', 'js/market.js', 'data/units.js',
  'js/ui_modals.js', 'js/ui_wars.js', 'js/ui_panels.js', 'js/ui_misc.js', 'js/technology.js',
  'data/actions.js', 'data/map_data.js', 'data/technology.js', 'css/style.css'
]);
const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { startDeterministicGame } = require('../support/game/start');

test.beforeEach(async function ({ page }, testInfo) {
  await openGame(page, testInfo);
  await startDeterministicGame(page);
  await page.evaluate(function () {
    const s = FB.state, p = s.player, pid = p.provinceId;
    FB.game.setPaused(true);
    p.tier = 3; p.provs = []; p.gold = 10000; p.prestige = 1000; p.piety = 1000;
    p.cooldowns = {}; p.travel = null;
    const countId = FB.settlementCountyHolder(s, pid);
    const kingId = Object.keys(s.realms).sort().find(function (rid) {
      return rid !== countId && s.realms[rid].alive && s.realms[rid].rank >= 2 &&
        FB.realmRulerCharacterSnapshot(s, rid);
    });
    const count = s.realms[countId], king = s.realms[kingId];
    count.rank = 1; count.liege = kingId; king.liege = null;
    p.liege = countId;
    const grants = Object.keys(s.owner).sort().filter(function (id) { return id !== pid && FB.world.sitesByProv[id]; }).slice(0, 2);
    king.capital = grants[0];
    grants.forEach(function (id) { s.holder[id] = kingId; s.owner[id] = kingId; });
    s.owner[pid] = kingId;
    FB.invalidateSettlementLordships(s);
    FB.assignSettlementLordship(s, pid, 1, p.charId);
    s.settlementLordships.counties[pid].established = Math.max(3, FB.settlementVisibleCount(s, pid));
    const other = FB.makeCharacter(s, { station:3, born:s.date.year - 35,
      culture:s.chars[p.charId].culture, religion:s.chars[p.charId].religion, traits:[] });
    FB.assignSettlementLordship(s, pid, 2, other.id);
    FB.setRealmRulerStanding(s, kingId, 100);
    window.countyFixture = { pid:pid, countId:countId, kingId:kingId, grant:grants[1], seat:grants[0] };
  });
});

test('higher-ruler investiture protects seats and vassal counties and retains the family barony', async function ({ page }) {
  const r = await page.evaluate(function () {
    const s = FB.state, p = s.player, f = countyFixture;
    const candidates = FB.countyGrantCandidates(s);
    const status = FB.rankElevationStatus(s, null, { route:'county', county:f.grant });
    const before = JSON.stringify([s.settlementLordships.counties[f.pid], p.homeSettlement, p.manor, p.enterprises]);
    const oldHolder = s.holder[f.pid], gold = p.gold;
    const ctx = FB.rankElevationContext(s, status);
    const granted = FB.claimRankElevation(s, ctx);
    return { candidates:candidates.map(function (q) { return q.provinceId; }), seat:f.seat,
      home:f.pid, granted:granted, holder:s.holder[f.grant], homeHolder:s.holder[f.pid], oldHolder:oldHolder,
      retained:before === JSON.stringify([s.settlementLordships.counties[f.pid], p.homeSettlement, p.manor, p.enterprises]),
      tier:p.tier, liege:p.liege, king:f.kingId, spent:gold - p.gold, cost:status.cost.gold,
      twice:FB.claimRankElevation(s, ctx) };
  });
  expect(r.candidates).not.toContain(r.seat); expect(r.candidates).not.toContain(r.home);
  expect(r.granted).toBe(true); expect(r.holder).toBe('player'); expect(r.homeHolder).toBe(r.oldHolder);
  expect(r.retained).toBe(true); expect(r.tier).toBe(4); expect(r.liege).toBe(r.king);
  expect(r.spent).toBe(r.cost); expect(r.twice).toBe(false);
});

test('no spare county and changed ownership reject grants without payment', async function ({ page }) {
  const r = await page.evaluate(function () {
    const s = FB.state, f = countyFixture;
    const ctx = FB.rankElevationContext(s, FB.rankElevationStatus(s, null, { route:'county', county:f.grant }));
    const gold = s.player.gold;
    FB.realmHeldCounties(s, f.kingId).forEach(function (pid) { if (pid !== f.seat) s.holder[pid] = f.countId; });
    FB.invalidateSettlementLordships(s);
    return { available:FB.countyGrantCandidates(s).length,
      stale:FB.claimRankElevation(s, ctx), paid:gold !== s.player.gold,
      reason:FB.rankElevationStatus(s, null, { route:'county' }).reason };
  });
  expect(r.available).toBe(0); expect(r.stale).toBe(false); expect(r.paid).toBe(false);
  expect(r.reason).toContain('last personal county');
});

for (const kind of ['sanctioned', 'claim', 'usurpation']) {
  test(kind + ' challenge musters automatically and checks recruitment without nearby hosts', async function ({ page }) {
    const r = await page.evaluate(function (kind) {
      const s = FB.state, f = countyFixture;
      s.armies = [];
      if (kind !== 'usurpation') s.player.fabricatedClaims = { [f.pid]:{ pid:f.pid, madeTurn:s.turn } };
      if (kind === 'sanctioned') FB.requestCountyChallenge(s, FB.countyChallengeQuote(s, f.pid));
      const declared = FB.beginCountyChallenge(s, FB.countyChallengeQuote(s, f.pid));
      const automaticHost = s.armies.some(function (host) { return host.realm === 'player' && host.at === f.pid; });
      const remaining = FB.playerMusterSelectionQuote(s, null, 'gather').men;
      const eligible = FB.recruitmentTerritory(s, 'player');
      const blocked = FB.recruitmentCountyBlocked(s, 'player', f.pid, []);
      FB.revertSettlementLordship(s, f.pid, 1);
      const landlessBlocked = FB.recruitmentCountyBlocked(s, 'player', f.pid, []);
      return { declared:declared, automaticHost:automaticHost, remaining:remaining,
        blocked:blocked, landlessBlocked:landlessBlocked,
        rally:eligible.rally, expected:f.pid, counties:s.player.provs.length,
        holder:s.holder[f.pid], incumbent:f.countId };
    }, kind);
    expect(r).toMatchObject({ declared:true, automaticHost:true, remaining:0,
      blocked:false, landlessBlocked:true, counties:0 });
    expect(r.rally).toBe(r.expected);
    expect(r.holder).toBe(r.incumbent);
  });

  test(kind + ' challenger can muster a barony beside the incumbent host without owning a county', async function ({ page }) {
    const result = await page.evaluate(function (kind) {
      let s = FB.state;
      const f = countyFixture;
      s.armies = [];
      s.armyDown = {};
      // Save a zero call so declaration does not already exhaust the levy.
      s.player.musterSelection = {};
      if (kind !== 'usurpation') s.player.fabricatedClaims = { [f.pid]:{ pid:f.pid, madeTurn:s.turn } };
      if (kind === 'sanctioned') FB.requestCountyChallenge(s, FB.countyChallengeQuote(s, f.pid));
      const declared = FB.beginCountyChallenge(s, FB.countyChallengeQuote(s, f.pid));
      const zeroCall = !s.armies.some(function (host) { return host.realm === 'player'; });
      s.player.musterSelection = null;
      s.armies.push({ id:'incumbent_muster_test', realm:f.countId, at:f.pid,
        men:1000, size:1000, units:{ levy:1000 }, path:[], moveLeft:0 });
      // Exercise the persisted campaign too, rather than only its declaration context.
      FB.save.restore(JSON.parse(FB.save.serialize()));
      s = FB.state;
      const territory = FB.recruitmentTerritory(s, 'player');
      const quote = FB.playerMusterSelectionQuote(s, null, 'gather');
      FB.savePlayerMusterSelection(s, null, 'gather', f.pid);
      const host = FB.raisePlayerHost(s);
      return { declared:declared, zeroCall:zeroCall, eligible:territory.eligible.indexOf(f.pid) >= 0,
        canRaise:quote.canRaise, host:!!host, at:host && host.at,
        expected:f.pid, tier:s.player.tier, counties:s.player.provs.length,
        holder:s.holder[f.pid], incumbent:f.countId,
        twice:!!FB.raisePlayerHost(s),
        ownHostBlocks:FB.recruitmentCountyBlocked(s, 'player', f.pid) };
    }, kind);
    expect(result).toMatchObject({ declared:true, zeroCall:true, eligible:true, canRaise:true,
      host:true, tier:3, counties:0, twice:false, ownHostBlocks:false });
    expect(result.at).toBe(result.expected);
    expect(result.holder).toBe(result.incumbent);
  });

  test(kind + ' challenge discloses the defender and transfers only its county objective', async function ({ page }) {
    const r = await page.evaluate(function (kind) {
      const s = FB.state, p = s.player, f = countyFixture;
      if (kind !== 'usurpation') p.fabricatedClaims = { [f.pid]:{ pid:f.pid, madeTurn:s.turn } };
      if (kind === 'sanctioned') FB.requestCountyChallenge(s, FB.countyChallengeQuote(s, f.pid));
      const q = FB.countyChallengeQuote(s, f.pid);
      const oldBarony = JSON.stringify(s.settlementLordships.counties[f.pid].lordships);
      const property = JSON.stringify([p.manor, p.enterprises, p.holdings, p.landPlots]);
      const outside = Object.keys(s.holder).filter(function (pid) { return pid !== f.pid; }).map(function (pid) { return [pid, s.holder[pid]]; });
      const declared = FB.beginCountyChallenge(s, q);
      const w = FB.realmWars(s, 'player')[0];
      const early = FB.withOrdinaryWar(s, w.id, function () { return FB.warCapture(s); });
      w.occupations[f.pid] = { occupied:true, progress:0 };
      const won = FB.withOrdinaryWar(s, w.id, function () { return FB.warCapture(s); });
      return { justification:q.justification, enemy:q.enemy, expected:kind === 'sanctioned' ? f.countId : f.kingId,
        declared:declared, early:early, won:won, holder:s.holder[f.pid], tier:p.tier,
        barony:oldBarony === JSON.stringify(s.settlementLordships.counties[f.pid].lordships),
        property:property === JSON.stringify([p.manor, p.enterprises, p.holdings, p.landPlots]),
        outside:outside.every(function (r) { return s.holder[r[0]] === r[1]; }),
        disputed:!!(s.settlementLordships.disputedCounties || {})[f.pid],
        claims:(s.settlementLordships.countyClaims || {})[f.pid] || [],
        ended:w.status, liege:p.liege, superior:f.kingId };
    }, kind);
    expect(r.justification).toBe(kind); expect(r.enemy).toBe(r.expected);
    expect(r.declared).toBe(true); expect(r.early).toBe(false); expect(r.won).toBe(true);
    expect(r.holder).toBe('player'); expect(r.tier).toBe(4);
    expect(r.barony).toBe(true); expect(r.property).toBe(true); expect(r.outside).toBe(true);
    expect(r.disputed).toBe(kind !== 'sanctioned'); expect(r.claims.length).toBe(kind === 'usurpation' ? 1 : 0);
    expect(r.ended).toBe('ended'); expect(r.liege).toBe(r.superior);
  });
}

test('independent usurpation needs no superior recognition; defeat preserves the barony', async function ({ page }) {
  const r = await page.evaluate(function () {
    const s = FB.state, f = countyFixture;
    s.realms[f.countId].liege = null; s.owner[f.pid] = f.countId;
    FB.invalidateSettlementLordships(s);
    const q = FB.countyChallengeQuote(s, f.pid);
    const barony = JSON.stringify(FB.settlementLordship(s, f.pid, 1));
    const request = FB.requestCountyChallenge(s, q);
    FB.beginCountyChallenge(s, q);
    const w = FB.realmWars(s, 'player')[0];
    w.losses = FBDATA.balance.warWinsToTakeProvince;
    FB.withOrdinaryWar(s, w.id, function () { FB.warOutcome(s); });
    return { superior:q.superior, request:request, result:w.result,
      held:s.holder[f.pid] === f.countId, barony:barony === JSON.stringify(FB.settlementLordship(s, f.pid, 1)),
      tier:s.player.tier, liege:s.player.liege, count:f.countId, dead:s.player.dead,
      disputed:!!(s.settlementLordships.disputedCounties || {})[f.pid] };
  });
  expect(r.superior).toBeNull(); expect(r.request).toBe(false); expect(r.result).toBe('defeat');
  expect(r.held).toBe(true); expect(r.barony).toBe(true); expect(r.tier).toBe(3);
  expect(r.liege).toBe(r.count); expect(r.dead).toBeFalsy(); expect(r.disputed).toBe(false);
});

test('independent victory grants countship without a superior-recognition requirement', async function ({ page }) {
  const r = await page.evaluate(function () {
    const s = FB.state, f = countyFixture;
    s.realms[f.countId].liege = null; s.owner[f.pid] = f.countId;
    FB.invalidateSettlementLordships(s);
    FB.beginCountyChallenge(s, FB.countyChallengeQuote(s, f.pid));
    const w = FB.realmWars(s, 'player')[0]; w.occupations[f.pid] = { occupied:true };
    FB.withOrdinaryWar(s, w.id, function () { FB.warCapture(s); });
    return { tier:s.player.tier, liege:s.player.liege,
      disputed:!!(s.settlementLordships.disputedCounties || {})[f.pid],
      rival:(s.settlementLordships.countyClaims[f.pid] || []).length,
      repeat:FB.completeCountyChallenge(s, w) };
  });
  expect(r.tier).toBe(4); expect(r.liege).toBeFalsy(); expect(r.disputed).toBe(false);
  expect(r.rival).toBe(1); expect(r.repeat).toBe(false);
});

test('barons can fabricate local claims, retain them across save/load and cannot use stale declaration reviews', async function ({ page }) {
  const r = await page.evaluate(function () {
    let s = FB.state;
    const f = countyFixture, candidates = FB.claimCandidates(s);
    FB.fns.fabricate_claim_success(s, { pid:f.pid });
    const claim = FB.countyClaim(s, f.pid);
    const old = FB.countyChallengeQuote(s, f.pid), gold = s.player.gold;
    const authorized = FB.requestCountyChallenge(s, old);
    const stale = FB.beginCountyChallenge(s, old);
    const clean = s.player.gold === gold && !FB.realmWars(s, 'player').length;
    FB.beginCountyChallenge(s, FB.countyChallengeQuote(s, f.pid));
    const id = FB.realmWars(s, 'player')[0].id;
    FB.save.restore(JSON.parse(FB.save.serialize())); s = FB.state;
    return { candidate:candidates.indexOf(f.pid) >= 0, claim:claim, authorized:authorized.accepted,
      stale:stale, clean:clean, retained:FB.fabricatedClaimsOf(s).some(function (c) { return c.pid === f.pid; }),
      campaign:FB.ordinaryWarById(s, id).countyChallenge.justification,
      errors:FB.validateTechnologyData() };
  });
  expect(r.candidate).toBe(true); expect(r.claim).toBe('fabricated'); expect(r.authorized).toBe(true);
  expect(r.stale).toBe(false); expect(r.clean).toBe(true); expect(r.retained).toBe(true);
  expect(r.campaign).toBe('sanctioned'); expect(r.errors).toEqual([]);
});

test('recognition charges only on acceptance, preserves rival claims and survives save/load', async function ({ page }) {
  const r = await page.evaluate(function () {
    let s = FB.state;
    const f = countyFixture;
    FB.beginCountyChallenge(s, FB.countyChallengeQuote(s, f.pid));
    const w = FB.realmWars(s, 'player')[0]; w.occupations[f.pid] = { occupied:true };
    FB.withOrdinaryWar(s, w.id, function () { FB.warCapture(s); });
    FB.save.restore(JSON.parse(FB.save.serialize())); s = FB.state;
    const gold = s.player.gold, claims = JSON.stringify(s.settlementLordships.countyClaims);
    const chance = FB.chance; let refused, accepted, q;
    try {
      FB.chance = function () { return false; };
      refused = FB.petitionCountyRecognition(s, FB.countyRecognitionQuote(s, f.pid));
      const unpaid = gold === s.player.gold;
      s.turn += FB.countyPetitionDays(); q = FB.countyRecognitionQuote(s, f.pid);
      FB.chance = function () { return true; };
      accepted = FB.petitionCountyRecognition(s, q);
      return { refused:refused.accepted, accepted:accepted.accepted, unpaid:unpaid,
        spent:gold - s.player.gold, cost:q.cost.gold, held:s.holder[f.pid],
        disputed:!!s.settlementLordships.disputedCounties[f.pid],
        claims:claims === JSON.stringify(s.settlementLordships.countyClaims),
        repeat:FB.petitionCountyRecognition(s, q) };
    } finally { FB.chance = chance; }
  });
  expect(r.refused).toBe(false); expect(r.accepted).toBe(true); expect(r.unpaid).toBe(true);
  expect(r.spent).toBe(r.cost); expect(r.held).toBe('player'); expect(r.disputed).toBe(false);
  expect(r.claims).toBe(true); expect(r.repeat).toBe(false);
});

test('inheritance and explicit revocation/restoration preserve barony provenance and works', async function ({ page }) {
  const r = await page.evaluate(function () {
    const s = FB.state, p = s.player, f = countyFixture, me = s.chars[p.charId];
    const original = FB.settlementLordship(s, f.pid, 1);
    s.buildings[f.pid] = [{ s:1, id:'mill' }]; FB.invalidateBuildingIndex(s, f.pid);
    const inherited = FB.absorbRealm(s, f.countId, me);
    const retained = FB.settlementLordship(s, f.pid, 1).founderId === original.founderId;
    const recipient = FB.makeCharacter(s, { station:3, born:s.date.year - 40,
      culture:me.culture, religion:me.religion, traits:[] });
    FB.assignSettlementLordship(s, f.pid, 1, recipient.id);
    const provenance = FB.settlementLordship(s, f.pid, 1).founderId;
    const heir = FB.makeCharacter(s, { fatherId:recipient.id, station:3, born:s.date.year - 20,
      culture:me.culture, religion:me.religion, traits:[] });
    const revoked = FB.revokeSettlementLordship(s, f.pid, 1, recipient.id);
    recipient.dead = true;
    FB.settlementLordshipsCharacterDied(s, recipient.id);
    const restored = FB.restoreSettlementLordship(s, f.pid, 1, heir.id);
    return { inherited:inherited, retained:retained, tier:p.tier, revoked:revoked, restored:restored,
      founder:FB.settlementLordship(s, f.pid, 1).founderId, provenance:provenance,
      holder:FB.settlementLordship(s, f.pid, 1).holderId, heir:heir.id,
      works:s.buildings[f.pid][0].id, review:FBDATA.techImpactReviews.features.county_challenges.mode };
  });
  expect(r.inherited).toBe(true); expect(r.retained).toBe(true); expect(r.tier).toBeGreaterThanOrEqual(4);
  expect(r.revoked).toBe(true); expect(r.restored).toBe(true); expect(r.founder).toBe(r.provenance);
  expect(r.holder).toBe(r.heir);
  expect(r.works).toBe('mill'); expect(r.review).toBe('none');
});

test('mobile declaration review shows opposition, costs and county-only victory terms before committing', async function ({ page }) {
  await page.setViewportSize({ width:390, height:844 });
  await page.evaluate(function () { FB.ui.showCountyProgression(); });
  await page.locator('[data-county-challenge]').first().click();
  const review = page.locator('[data-county-challenge-review]');
  await expect(review).toContainText('Unclaimed usurpation');
  await expect(review).toContainText('defends the incumbent');
  await expect(review).toContainText('Aggression cost');
  await expect(review).toContainText('recognition must be petitioned');
  expect(await page.evaluate(function () { return FB.realmWars(FB.state, 'player').length; })).toBe(0);
  await page.getByRole('button', { name:'Back', exact:true }).click();
  await expect(page.locator('[data-county-challenge]').first()).toBeVisible();
  expect(await page.evaluate(function () { return document.documentElement.scrollWidth <= window.innerWidth; })).toBe(true);
});


test('county-local holding checks match full holdings and recruitment avoids domain scans', async function ({ page }) {
  const result = await page.evaluate(function () {
    const s = FB.state, f = window.countyFixture;
    const actors = ['player', f.countId, f.kingId, { kind:'character', id:s.player.charId }];
    const counties = [f.pid, f.grant, f.seat];
    const mismatch = [];
    actors.forEach(function (actor) {
      const all = FB.directSettlements(s, actor);
      counties.forEach(function (pid) {
        if (FB.holdsSettlementInCounty(s, actor, pid) !== all.some(function (site) {
          return site.provinceId === pid;
        })) mismatch.push(pid);
      });
    });
    const original = FB.directSettlements;
    let scans = 0;
    FB.directSettlements = function () { scans++; return original.apply(FB, arguments); };
    try {
      FB.recruitmentCountyBlocked(s, 'player', f.pid, []);
      FB.recruitmentCountyBlocked(s, f.kingId, f.pid, []);
    } finally { FB.directSettlements = original; }
    FB.revertSettlementLordship(s, f.pid, 1);
    return { mismatch:mismatch, scans:scans,
      removed:!FB.holdsSettlementInCounty(s, 'player', f.pid) };
  });
  expect(result).toEqual({ mismatch:[], scans:0, removed:true });
});

test('muster shares county population reads without changing troop totals', async function ({ page }) {
  const result = await page.evaluate(function () {
    const s = FB.state, f = window.countyFixture, original = FB.settlementPopulationShares;
    const territory = { rally:f.pid, eligible:[f.pid], counties:[f.pid], blocked:[] };
    function project(uncached) {
      const calls = {};
      FB.settlementPopulationShares = function (state, pid) {
        calls[pid] = (calls[pid] || 0) + 1;
        return original.apply(FB, arguments);
      };
      const fiscal = FB.settlementFiscalProjection;
      if (uncached) FB.settlementFiscalProjection = function (state, pid, slot, context) {
        return fiscal(state, pid, slot, { capacities:context.capacities });
      };
      try { return { men:FB.aiBaseHost(s, f.countId, territory, {}, {}), calls:calls }; }
      finally { FB.settlementFiscalProjection = fiscal; FB.settlementPopulationShares = original; }
    }
    const reference = project(true), optimized = project(false);
    FB.invalidateSettlementLordships(s, f.pid);
    const refreshed = project(false);
    return { reference:reference, optimized:optimized, refreshed:refreshed, pid:f.pid };
  });
  expect(result.optimized.men).toBe(result.reference.men);
  expect(result.refreshed.men).toBe(result.reference.men);
  expect(result.reference.calls[result.pid]).toBeGreaterThan(1);
  expect(result.optimized.calls[result.pid]).toBe(1);
  expect(result.refreshed.calls[result.pid]).toBe(1);
});


test('military-only muster matches full fiscal troops and refreshes after development and grants', async function ({ page }) {
  const result = await page.evaluate(function () {
    const s = FB.state, f = window.countyFixture;
    const original = FB.settlementFiscalProjection, tax = FB.settlementTaxBase;
    const territory = { rally:f.pid, eligible:[f.pid], counties:[f.pid], blocked:[] };
    const phase = {}, pairs = [];
    let militaryTaxReads = 0;
    function compare() {
      FB.settlementTaxBase = function () { militaryTaxReads++; return tax.apply(FB, arguments); };
      const actual = FB.aiBaseHost(s, f.countId, territory, {}, phase);
      FB.settlementTaxBase = tax;
      FB.settlementFiscalProjection = function (state, pid, slot, context) {
        return original(state, pid, slot, Object.assign({}, context, { militaryOnly:false }));
      };
      try { pairs.push([actual, FB.aiBaseHost(s, f.countId, territory, {}, {})]); }
      finally { FB.settlementFiscalProjection = original; }
    }
    try {
      compare();
      s.dev[f.pid] += 3;
      FB.invalidateSettlementLordships(s, f.pid);
      compare();
      FB.revertSettlementLordship(s, f.pid, 1);
      compare();
      // Daily callers use a new context even when there is no ownership revision.
      const before = FB.aiBaseHost(s, f.countId, territory, {}, {});
      s.dev[f.pid] += 10;
      const fresh = FB.aiBaseHost(s, f.countId, territory, {}, {});
      return { pairs:pairs, taxReads:militaryTaxReads, before:before, fresh:fresh };
    } finally { FB.settlementFiscalProjection = original; FB.settlementTaxBase = tax; }
  });
  for (const pair of result.pairs) expect(pair[0]).toBe(pair[1]);
  expect(result.taxReads).toBe(0);
  expect(result.fresh).toBeGreaterThan(result.before);
});


test('holding scans read visibility once per county and observe live ownership changes', async function ({ page }) {
  const result = await page.evaluate(function () {
    const s = FB.state, f = window.countyFixture, visible = FB.settlementVisibleCount;
    const baronId = FB.settlementHolder(s, f.pid, 2).id;
    const actors = [f.countId, f.kingId, 'player', { kind:'character', id:baronId }];
    const mismatches = [], reads = [];
    function compare() {
      actors.forEach(function (actor) {
        const counts = {};
        FB.settlementVisibleCount = function (state, pid) {
          counts[pid] = (counts[pid] || 0) + 1;
          return visible.apply(FB, arguments);
        };
        let actual;
        try { actual = FB.directSettlements(s, actor); }
        finally { FB.settlementVisibleCount = visible; }
        reads.push.apply(reads, Object.values(counts));
        const expected = [];
        Object.keys(s.owner).sort().forEach(function (pid) {
          for (let slot = 0; slot < visible(s, pid); slot++) {
            if (FB.settlementConstructionAuthority(s, pid, slot, actor).direct) {
              expected.push({ provinceId:pid, settlement:slot });
            }
          }
        });
        if (JSON.stringify(actual) !== JSON.stringify(expected)) mismatches.push(actor);
      });
    }
    compare();
    s.chars[baronId].dead = true;
    compare();
    s.holder[f.pid] = f.kingId;
    FB.invalidateSettlementLordships(s, f.pid);
    compare();
    return { mismatches:mismatches, reads:reads };
  });
  expect(result.mismatches).toEqual([]);
  expect(result.reads.length).toBeGreaterThan(0);
  expect(result.reads.every(function (n) { return n === 1; })).toBe(true);
});
