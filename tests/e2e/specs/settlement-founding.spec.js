'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'js/lordships.js', 'js/world.js', 'js/settlement.js', 'js/population.js',
  'js/actions.js', 'js/main.js', 'js/model.js', 'js/save.js', 'js/modifiers.js', 'js/events.js',
  'js/economy.js', 'js/treasury.js',
  'js/ui_modals.js', 'js/ui_panels.js', 'js/ui_misc.js', 'js/technology.js',
  'data/actions.js', 'data/map_data.js', 'data/technology.js', 'data/settlements.js', 'data/economy.js',
  'css/style.css'
]);
const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { startDeterministicGame } = require('../support/game/start');

test.beforeEach(async function ({ page }, testInfo) {
  await openGame(page, testInfo);
  await startDeterministicGame(page);
  await page.evaluate(function () {
    const s = FB.state, p = s.player;
    FB.game.setPaused(true);
    p.tier = 2; p.provs = []; p.gold = 10000; p.prestige = 1000; p.piety = 1000;
    // Find an actual compiled unused site without manufacturing world slots.
    const pid = Object.keys(s.owner).sort().find(function (id) {
      if (!FB.world.sitesByProv[id] || !FB.settlementCountyHolder(s, id)) return false;
      const previous = s.dev[id];
      s.dev[id] = 9;
      const available = FB.settlementCapacity(s, id) > FB.settlementVisibleCount(s, id);
      if (previous === undefined) delete s.dev[id]; else s.dev[id] = previous;
      return available;
    });
    if (!pid) throw new Error('Fixture requires an unused compiled settlement site');
    p.provinceId = pid; p.homeSettlement = 0; p.travel = null;
    s.dev[pid] = 9;
    FB.ensurePopulationState(s);
  });
});

test('an explicit founded count is not inflated by bookmark development on restore', async function ({ page }) {
  const r = await page.evaluate(function () {
    let s = FB.state;
    const pid = 'barcelona';
    s.player.provinceId = pid; s.player.homeSettlement = 0;
    s.player.enterprises = []; s.buildings[pid] = [];
    s.population.counties[pid].settlementCommunityProjects = {};
    s.settlementLordships.counties[pid] = { established:2, lordships:{} };
    s.settlementLordships.foundingVersion = 1;
    s.dev[pid] = 9;
    FB.invalidateBuildingIndex(s, pid);
    FB.invalidateSettlementLordships(s, pid);
    const before = FB.settlementVisibleCount(s, pid);
    FB.save.restore(JSON.parse(FB.save.serialize()));
    s = FB.state;
    return { before:before, after:FB.settlementVisibleCount(s, pid),
      established:s.settlementLordships.counties[pid].established,
      capacity:FB.settlementCapacity(s, pid), sites:FB.settlementsOf(s, pid).length };
  });
  expect(r).toMatchObject({ before:2, after:2, established:2, sites:2 });
  expect(r.capacity).toBeGreaterThan(2);
});

test('development unlocks capacity without revealing sites; migration preserves old reveals and authored places', async function ({ page }) {
  const r = await page.evaluate(function () {
    const s = FB.state, pid = s.player.provinceId, info = FB.world.sitesByProv[pid];
    const initial = FB.settlementVisibleCount(s, pid), capacity = FB.settlementCapacity(s, pid);
    s.dev[pid] = 1;
    const fallen = FB.settlementVisibleCount(s, pid);
    s.dev[pid] = 9;
    const grown = FB.settlementVisibleCount(s, pid);
    delete s.settlementLordships.foundingVersion;
    const legacy = FB.settlementVisibleCount(s, pid);
    FB.ensureSettlementLordships(s);
    s.dev[pid] = 1;
    FB.ensureSettlementLordships(s);
    return { initial:initial, fallen:fallen, grown:grown, capacity:capacity,
      authored:info.authored, legacy:legacy, restored:FB.settlementVisibleCount(s, pid) };
  });
  expect(r.initial).toBeGreaterThanOrEqual(r.authored);
  expect(r.fallen).toBe(r.initial); expect(r.grown).toBe(r.initial);
  expect(r.capacity).toBeGreaterThan(r.initial);
  expect(r.restored).toBe(r.legacy); expect(r.legacy).toBe(r.capacity);
});

test('funding reserves one slot, charges once, rejects stale terms and cancels without a refund or promotion', async function ({ page }) {
  const r = await page.evaluate(function () {
    const s = FB.state, p = s.player, pid = p.provinceId;
    const quote = FB.settlementFoundingEligibility(s, pid), before = JSON.stringify(s);
    FB.settlementFoundingEligibility(s, pid);
    const pure = before === JSON.stringify(s), gold = p.gold;
    p.gold = 0;
    const poor = FB.beginSettlementFounding(s, quote);
    p.gold = gold;
    const funded = FB.beginSettlementFounding(s, quote);
    const project = FB.activeSettlementFounding(s);
    const again = FB.beginSettlementFounding(s, quote);
    const reserved = FB.settlementFoundingEligibility(s, pid).ready;
    const cancelled = FB.cancelSettlementFounding(s, project), after = p.gold;
    const released = FB.settlementFoundingEligibility(s, pid);
    FB.beginSettlementFounding(s, released);
    const staleCancel = FB.cancelSettlementFounding(s, project);
    return { pure:pure, poor:poor, funded:funded, again:again, reserved:reserved,
      cancelled:cancelled, spent:gold - after, cost:quote.gold, tier:p.tier,
      released:released.ready, sameSlot:released.settlement === project.settlement,
      staleCancel:staleCancel, active:!!FB.activeSettlementFounding(s) };
  });
  expect(r).toMatchObject({ pure:true, poor:false, funded:true, again:false, reserved:false,
    cancelled:true, tier:2, released:true, sameSlot:true, staleCancel:false, active:true });
  expect(r.spent).toBe(r.cost);
});

test('completion conserves every community, retains private property and grants land and rank exactly once', async function ({ page }) {
  const r = await page.evaluate(function () {
    const s = FB.state, p = s.player, pid = p.provinceId;
    p.manor = { provinceId:pid, settlement:0 };
    p.enterprises = [{ uid:'founding_property', type:Object.keys(FBDATA.enterprises)[0],
      provinceId:pid, settlement:0, workerId:null }];
    const recBefore = s.population.counties[pid], first = recBefore.communities[0];
    const other = Object.keys(s.population.counties).sort().map(function (id) {
      return s.population.counties[id].communities[0];
    }).find(function (c) { return c.culture !== first.culture || c.religion !== first.religion; });
    const minority = Math.floor(recBefore.count / 3);
    recBefore.communities = [
      { culture:first.culture, religion:first.religion, count:recBefore.count - minority },
      { culture:other.culture, religion:other.religion, count:minority }
    ];
    FB.materializeSettlementCommunities(s, pid);
    const communities = JSON.stringify(FB.countyCommunities(s, pid));
    const population = s.population.counties[pid].count, development = s.dev[pid];
    const property = JSON.stringify([p.manor, p.landPlots, p.enterprises, p.holdings]);
    const q = FB.settlementFoundingEligibility(s, pid);
    FB.beginSettlementFounding(s, q);
    const prestige = p.prestige;
    s.turn += q.days;
    const completed = FB.settlementFoundingDay(s);
    const repeated = FB.completeSettlementFounding(s);
    const rec = s.population.counties[pid];
    return { completed:completed, repeated:repeated, tier:p.tier, home:p.homeSettlement,
      slot:q.settlement, visible:FB.settlementVisibleCount(s, pid),
      prestige:prestige - p.prestige, cost:q.prestige,
      population:rec.count === population, development:s.dev[pid] === development,
      communities:communities === JSON.stringify(FB.countyCommunities(s, pid)),
      property:property === JSON.stringify([p.manor, p.landPlots, p.enterprises, p.holdings]),
      settlers:rec.communities.reduce(function (n, c) { return n + c.bySettlement[q.settlement]; }, 0),
      partitions:rec.communities.every(function (c) { return c.bySettlement.reduce(function (a, b) { return a + b; }, 0) === c.count; }),
      direct:FB.settlementConstructionAuthority(s, pid, q.settlement).direct,
      liege:p.liege, count:FB.settlementCountyHolder(s, pid),
      source:FB.settlementLordship(s, pid, q.settlement).source };
  });
  expect(r).toMatchObject({ completed:true, repeated:false, tier:3, population:true,
    development:true, communities:true, property:true, partitions:true, direct:true, source:'founding' });
  expect(r.home).toBe(r.slot); expect(r.visible).toBe(r.slot + 1);
  expect(r.prestige).toBe(r.cost); expect(r.settlers).toBeGreaterThan(0);
  expect(r.liege).toBe(r.count);
});

test('occupation pauses time; missing prestige and travel retain the funded charter without partial grants', async function ({ page }) {
  const r = await page.evaluate(function () {
    const s = FB.state, p = s.player, pid = p.provinceId;
    const q = FB.settlementFoundingEligibility(s, pid);
    FB.beginSettlementFounding(s, q);
    s.occupations = s.occupations || {}; s.occupations[pid] = { occupied:true };
    s.turn += 90; FB.settlementFoundingDay(s);
    const paused = FB.activeSettlementFounding(s), reason = FB.settlementFoundingStatus(s).reason;
    delete s.occupations[pid];
    s.turn = paused.dueTurn; p.prestige = 0;
    const blocked = FB.settlementFoundingDay(s);
    const unchanged = p.tier === 2 && FB.settlementVisibleCount(s, pid) === q.settlement;
    p.prestige = q.prestige; p.travel = { destination:pid };
    const travel = FB.completeSettlementFounding(s);
    p.travel = null;
    const completed = FB.completeSettlementFounding(s);
    return { paused:paused.pausedDays, remaining:paused.dueTurn - paused.lastTurn,
      days:q.days, reason:reason, blocked:blocked, unchanged:unchanged, travel:travel, completed:completed };
  });
  expect(r.paused).toBe(90); expect(r.remaining).toBe(r.days);
  expect(r.reason).toContain('Paused'); expect(r.blocked).toBe(false);
  expect(r.unchanged).toBe(true); expect(r.travel).toBe(false); expect(r.completed).toBe(true);
});

test('capacity recovery retains a paid charter and founding has no technology gate', async function ({ page }) {
  const r = await page.evaluate(function () {
    const s = FB.state, p = s.player, pid = p.provinceId;
    const q = FB.settlementFoundingEligibility(s, pid);
    FB.beginSettlementFounding(s, q);
    const project = FB.activeSettlementFounding(s), gold = p.gold, prestige = p.prestige;
    s.dev[pid] = 1; s.turn = project.dueTurn;
    const blocked = FB.completeSettlementFounding(s);
    const reason = FB.settlementFoundingStatus(s).reason;
    const retained = FB.activeSettlementFounding(s).id === project.id && p.gold === gold && p.prestige === prestige;
    s.dev[pid] = 9;
    const completed = FB.completeSettlementFounding(s, project);
    return { blocked:blocked, reason:reason, retained:retained, completed:completed,
      review:FBDATA.techImpactReviews.features.settlement_founding.mode,
      errors:FB.validateTechnologyData() };
  });
  expect(r.blocked).toBe(false); expect(r.reason).toContain('development must recover');
  expect(r.retained).toBe(true); expect(r.completed).toBe(true);
  expect(r.review).toBe('none'); expect(r.errors).toEqual([]);
});

test('founding replay after save loading preserves population, fiscal authority and RNG', async function ({ page }) {
  const result = await page.evaluate(function () {
    const s = FB.state, pid = s.player.provinceId;
    FB.beginSettlementFounding(s, FB.settlementFoundingEligibility(s, pid));
    const saved = JSON.parse(FB.save.serialize());
    function replay() {
      FB.save.restore(JSON.parse(JSON.stringify(saved)));
      const live = FB.state, project = FB.activeSettlementFounding(live);
      const population = live.population.counties[pid].count;
      live.turn = project.dueTurn;
      const completed = FB.completeSettlementFounding(live);
      const rng = FB.getRngState();
      const projection = FB.settlementFiscalProjection(live, pid, project.settlement);
      const authority = FB.settlementConstructionAuthority(live, pid, project.settlement).direct;
      const income = FB.playerTax(live), levy = FB.playerLevy(live);
      return { completed:completed, authority:authority, income:income, levy:levy,
        populationBefore:population, populationAfter:live.population.counties[pid].count,
        communities:live.population.counties[pid].communities,
        holder:FB.settlementHolder(live, pid, project.settlement),
        amounts:projection.amounts, lordships:live.settlementLordships,
        gold:live.player.gold, prestige:live.player.prestige,
        rng:rng, pure:JSON.stringify(rng) === JSON.stringify(FB.getRngState()) };
    }
    const first = replay(), second = replay();
    const features = FBDATA.techImpactReviews.features;
    return { first:first, second:second, modes:[features.settlement_lordship.mode,
      features.settlement_founding.mode, features.settlement_administration.mode,
      features.county_investiture.mode, features.county_challenges.mode,
      features.county_recognition.mode] };
  });
  expect(result.first).toEqual(result.second);
  expect(result.first).toMatchObject({ completed:true, authority:true, pure:true });
  expect(result.first.populationAfter).toBe(result.first.populationBefore);
  expect(result.modes).toEqual(['none', 'none', 'soft', 'none', 'none', 'none']);
});

test('funded charters survive save loading, inheritance and replacement of the count', async function ({ page }) {
  const r = await page.evaluate(function () {
    let s = FB.state;
    const pid = s.player.provinceId, oldId = s.player.charId;
    FB.beginSettlementFounding(s, FB.settlementFoundingEligibility(s, pid));
    const original = FB.activeSettlementFounding(s);
    FB.save.restore(JSON.parse(FB.save.serialize()));
    s = FB.state;
    const roundTrip = JSON.stringify(original) === JSON.stringify(FB.activeSettlementFounding(s));
    const old = s.chars[oldId], heir = FB.makeCharacter(s, { station:2,
      culture:old.culture, religion:old.religion, born:s.date.year - 25, traits:[] });
    s.player.charId = heir.id;
    FB.settlementLordshipsPlayerSuccession(s, oldId, heir.id);
    const nextCount = Object.keys(s.realms).sort().find(function (rid) {
      return rid !== original.grantorRealmId && FB.realmRulerCharacterSnapshot(s, rid);
    });
    s.holder[pid] = nextCount; s.owner[pid] = nextCount;
    FB.invalidateSettlementLordships(s, pid);
    const inherited = FB.activeSettlementFounding(s);
    s.turn = inherited.dueTurn;
    const completed = FB.completeSettlementFounding(s);
    const estate = FB.settlementLordship(s, pid, original.settlement);
    return { roundTrip:roundTrip, sponsor:inherited.sponsorId, heir:heir.id,
      completed:completed, founder:estate && estate.founderId, old:oldId,
      holder:estate && estate.holderId, liege:s.player.liege, count:nextCount };
  });
  expect(r.roundTrip).toBe(true); expect(r.sponsor).toBe(r.heir);
  expect(r.completed).toBe(true); expect(r.founder).toBe(r.old);
  expect(r.holder).toBe(r.heir); expect(r.liege).toBe(r.count);
});

test('mobile charter review exposes costs and both routes; cancellation Back retains the project view', async function ({ page }) {
  await page.setViewportSize({ width:390, height:844 });
  await page.evaluate(function () { FB.ui.showSettlementFounding(); });
  await expect(page.locator('[data-founding-review]')).toContainText('Pay now');
  await expect(page.locator('[data-founding-review]')).toContainText('Due at completion');
  await expect(page.locator('[data-founding-review]')).toContainText('360 days');
  await expect(page.locator('#founding-petition')).toBeVisible();
  await page.locator('#founding-confirm').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('[data-founding-review]')).toContainText('Construction paid');
  await page.locator('#founding-cancel-review').click();
  await expect(page.locator('#gm-body')).toContainText('will not be refunded');
  await expect(page.getByRole('button', { name:'Cancel charter', exact:true })).toBeVisible();
  await expect(page.locator('#genmodal').getByRole('button', { name:'Back', exact:true })).toHaveCount(1);
  await page.locator('#founding-keep-back').click();
  await expect(page.locator('[data-founding-review]')).toContainText('Construction paid');
  expect(await page.evaluate(function () {
    return document.documentElement.scrollWidth <= window.innerWidth;
  })).toBe(true);
  await page.locator('#founding-cancel-review').click();
  await page.locator('#founding-cancel-confirm').click();
  expect(await page.evaluate(function () { return FB.activeSettlementFounding(FB.state); })).toBeNull();
});
