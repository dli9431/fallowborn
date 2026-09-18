'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'js/lordships.js', 'js/world.js', 'js/settlement.js', 'js/population.js',
  'js/actions.js', 'js/main.js', 'js/model.js', 'js/save.js', 'js/modifiers.js', 'js/events.js',
  'js/economy.js', 'js/treasury.js', 'js/mapview.js',
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
    p.gentryGeneration = 0; // Founding lifecycle cases begin with an established gentle house.
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
    const prestige = p.prestige;
    FB.beginSettlementFounding(s, q);
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

test('legacy charter occupation pauses time; missing prestige and travel retain the funded charter without partial grants', async function ({ page }) {
  const r = await page.evaluate(function () {
    const s = FB.state, p = s.player, pid = p.provinceId;
    const q = FB.settlementFoundingEligibility(s, pid);
    FB.beginSettlementFounding(s, q);
    // Simulate a saved charter funded under the original completion-payment terms.
    delete s.settlementLordships.founding[pid].costsPaid;
    p.prestige += q.prestige; p.piety += q.piety;
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
  await expect(page.locator('#founding-action-details')).toContainText('Pay now');
  await expect(page.locator('#founding-action-details')).not.toContainText('Due at completion');
  await expect(page.locator('#founding-action-details')).toContainText('250 prestige');
  await expect(page.locator('.modal-title-info')).toBeVisible();
  await page.locator('.modal-title-info').click();
  await expect(page.locator('#gm-title-details')).toBeVisible();
  await page.locator('#founding-ruler').click();
  await page.locator('#genmodal').getByRole('button', { name:'Back', exact:true }).click();
  await expect(page.locator('#gm-title-details')).toBeVisible();
  await expect(page.locator('.modal-title-info')).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('#founding-ruler')).toBeFocused();
  await page.locator('.modal-title-info').click();
  await expect(page.locator('#gm-title-details')).toBeHidden();
  await page.locator('.modal-title-info').click();
  await expect(page.locator('#gm-title-details')).toBeVisible();
  await expect(page.locator('#founding-action-details')).toContainText('360 days');
  await expect(page.locator('#founding-petition')).toBeVisible();
  await page.locator('#founding-confirm').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#founding-action-details')).toContainText('Construction paid');
  await page.locator('#founding-cancel-review').click();
  await expect(page.locator('#gm-body')).toContainText('will not be refunded');
  await expect(page.getByRole('button', { name:'Cancel charter', exact:true })).toBeVisible();
  await expect(page.locator('#genmodal').getByRole('button', { name:'Back', exact:true })).toHaveCount(1);
  await page.locator('#founding-keep-back').click();
  await expect(page.locator('#founding-action-details')).toContainText('Construction paid');
  expect(await page.evaluate(function () {
    return document.documentElement.scrollWidth <= window.innerWidth;
  })).toBe(true);
  await page.locator('#founding-cancel-review').click();
  await page.locator('#founding-cancel-confirm').click();
  expect(await page.evaluate(function () { return FB.activeSettlementFounding(FB.state); })).toBeNull();
});


test('new barony charters require inherited Gentry and recheck stale reviews before payment', async function ({ page }) {
  const result = await page.evaluate(function () {
    const s = FB.state, p = s.player, pid = p.provinceId;
    const ready = FB.settlementFoundingEligibility(s, pid);
    p.gentryGeneration = p.lineDepth;
    const blocked = FB.settlementFoundingEligibility(s, pid);
    const before = JSON.stringify([p.gold, p.prestige, p.piety, s.turn]);
    const stale = FB.beginSettlementFounding(s, ready);
    const denied = FB.beginSettlementFounding(s, blocked);
    const unchanged = before === JSON.stringify([p.gold, p.prestige, p.piety, s.turn]);
    p.gentryGeneration = 0;
    const funded = FB.beginSettlementFounding(s, FB.settlementFoundingEligibility(s, pid));
    // Funded commitments from older saves keep their original terms.
    p.gentryGeneration = p.lineDepth;
    s.turn = FB.activeSettlementFounding(s).dueTurn;
    const completed = FB.completeSettlementFounding(s);
    return { ready:ready.ready, blocked:blocked.ready, reason:blocked.reason,
      stale:stale, denied:denied, unchanged:unchanged, funded:funded, completed:completed };
  });
  expect(result).toMatchObject({ ready:true, blocked:false, stale:false, denied:false,
    unchanged:true, funded:true, completed:true });
  expect(result.reason).toContain('later generation');
});

test('county rulers found direct holdings without moving their seat or changing rank', async function ({ page }) {
  const result = await page.evaluate(function () {
    const s = FB.state, p = s.player, pid = p.provinceId;
    p.tier = 4; p.provs = [pid];
    s.holder[pid] = 'player'; s.owner[pid] = 'player';
    FB.foundPlayerRealm(s);
    const oldHome = p.homeSettlement, oldCount = FB.settlementVisibleCount(s, pid);
    const quote = FB.settlementFoundingEligibility(s, pid);
    const funded = FB.beginSettlementFounding(s, quote);
    const project = FB.activeSettlementFounding(s);
    if (!project) throw new Error('Expected ruler charter');
    s.turn = project.dueTurn;
    const oldHolder = s.holder[pid];
    s.holder[pid] = Object.keys(s.realms).find(function (id) { return id !== 'player' && s.realms[id].alive; });
    FB.invalidateSettlementLordships(s);
    const lost = FB.settlementFoundingStatus(s).ready;
    s.holder[pid] = oldHolder;
    FB.invalidateSettlementLordships(s);
    const completed = FB.completeSettlementFounding(s);
    return { funded:funded, ready:quote.ready, completed:completed, lost:lost,
      rank:p.tier, home:p.homeSettlement, oldHome:oldHome,
      count:FB.settlementVisibleCount(s, pid), expected:oldCount+1,
      holder:FB.settlementHolder(s, pid, oldCount),
      lordship:FB.settlementLordship(s, pid, oldCount) };
  });
  expect(result).toMatchObject({ funded:true, ready:true, completed:true, lost:false,
    rank:4, holder:{ kind:'realm', id:'player' }, lordship:null });
  expect(result.home).toBe(result.oldHome);
  expect(result.count).toBe(result.expected);
});

test('ruler founding review offers county selection and direct-holding terms', async function ({ page }) {
  await page.evaluate(function () {
    const s = FB.state, pid = s.player.provinceId;
    s.player.tier = 4; s.player.provs = [pid];
    s.holder[pid] = 'player'; s.owner[pid] = 'player'; FB.foundPlayerRealm(s);
    FB.ui.showSettlementFounding();
  });
  await expect(page.locator('#founding-county')).toBeVisible();
  await expect(page.locator('#founding-action-details')).toContainText('New direct holding');
  await expect(page.locator('#gm-title-details')).toContainText('Your rank and household seat stay unchanged');
  await expect(page.locator('#founding-petition')).toHaveCount(0);
  await expect(page.locator('#founding-confirm')).toBeEnabled();
});


test('development blocker distinguishes unlocked capacity from eight physical sites', async function ({ page }) {
  const result = await page.evaluate(function () {
    const s = FB.state, pid = s.player.provinceId;
    s.dev[pid] = 1;
    const capacity = FB.settlementCapacity(s, pid);
    s.settlementLordships.counties[pid] = { established:capacity, lordships:{} };
    FB.invalidateSettlementLordships(s, pid);
    const q = FB.settlementFoundingEligibility(s, pid);
    return { capacity:capacity, ready:q.ready, reason:q.reason };
  });
  expect(result.capacity).toBeLessThan(8);
  expect(result.ready).toBe(false);
  expect(result.reason).toContain('current development allows ' + result.capacity);
  expect(result.reason).toContain('Raise county development');
});

test('full county charter shows eight-site capacity and explains that every site is founded', async function ({ page }) {
  await page.evaluate(function () {
    const s = FB.state, pid = 'barcelona';
    s.player.provinceId = pid;
    s.settlementLordships.counties[pid] = { established:8, lordships:{} };
    s.dev[pid] = 1;
    FB.invalidateSettlementLordships(s, pid);
    FB.ui.showSettlementFounding();
  });
  await expect(page.locator('[data-founding-review]')).toContainText('8/8');
  await expect(page.locator('[data-founding-review]')).not.toContainText('unlocked');
  await expect(page.locator('#founding-capacity-details')).toContainText('All settlement sites in this county are already founded.');
  await expect(page.locator('[data-founding-status]')).toHaveCount(0);
  await expect(page.locator('#founding-confirm')).toBeDisabled();
});

test('settlement rename persists without changing geography and rejects unheld sites', async function ({ page }) {
  const result = await page.evaluate(function () {
    let s = FB.state; const pid = s.player.provinceId;
    s.player.tier = 3;
    FB.assignSettlementLordship(s, pid, 1, s.player.charId);
    const site = FB.world.sitesByProv[pid].list[1], original = site.name;
    const denied = FB.renameSettlement(s, pid, 0, 'Not mine');
    const bad = FB.renameSettlement(s, pid, 1, '<bad>');
    const good = FB.renameSettlement(s, pid, 1, '  New Haven  ');
    FB.save.restore(JSON.parse(FB.save.serialize())); s = FB.state;
    return { denied:denied.ok, bad:bad.ok, good:good.ok,
      name:FB.settlementsOf(s, pid)[1].name,
      unchanged:FB.world.sitesByProv[pid].list[1].name === original };
  });
  expect(result).toEqual({ denied:false, bad:false, good:true, name:'New Haven', unchanged:true });
});

test('settlement pencil opens a keyboard name editor and returns to the sheet', async function ({ page }) {
  await page.setViewportSize({ width:390, height:844 });
  await page.evaluate(function () {
    const s = FB.state, pid = s.player.provinceId;
    s.player.tier = 3; FB.assignSettlementLordship(s, pid, 1, s.player.charId);
    FB.ui.showSettlement(pid, 1);
  });
  await page.locator('#settlement-rename').click();
  await page.locator('#settlement-name').fill('New Haven');
  await page.locator('#settlement-name').press('Enter');
  await expect(page.locator('#gm-title')).toContainText('New Haven');
  await expect(page.locator('#settlement-rename')).toBeFocused();
  await page.locator('#settlement-rename').click();
  await page.locator('#settlement-name').fill('Discard this');
  await page.getByRole('button', { name:'Back', exact:true }).click();
  await expect(page.locator('#gm-title')).toContainText('New Haven');
  await expect(page.locator('#settlement-rename')).toBeFocused();
});


test('new charter pays prestige upfront, survives loading and completes without another charge', async function ({ page }) {
  const result = await page.evaluate(function () {
    let s = FB.state; const pid = s.player.provinceId;
    s.player.prestige = 0;
    const denied = FB.settlementFoundingEligibility(s, pid);
    const rejected = FB.beginSettlementFounding(s, denied);
    s.player.prestige = 1000;
    const q = FB.settlementFoundingEligibility(s, pid), before = s.player.prestige;
    FB.beginSettlementFounding(s, q);
    const spent = before - s.player.prestige;
    FB.save.restore(JSON.parse(FB.save.serialize())); s = FB.state;
    const project = FB.activeSettlementFounding(s);
    s.player.prestige = 0; s.player.piety = 0; s.turn = project.dueTurn;
    const completed = FB.completeSettlementFounding(s);
    return { ready:denied.ready, rejected:rejected, reason:denied.reason,
      spent:spent, cost:q.prestige, paid:project.costsPaid, completed:completed,
      prestige:s.player.prestige, piety:s.player.piety };
  });
  expect(result).toMatchObject({ ready:false, rejected:false, paid:true, completed:true, prestige:0, piety:0 });
  expect(result.reason).toContain('prestige');
  expect(result.spent).toBe(result.cost);
});


test('charter action and capacity terms use touch disclosures instead of expanded prose', async function ({ page }) {
  await page.setViewportSize({ width:390, height:844 });
  await page.evaluate(function () { FB.ui.showSettlementFounding(); });
  await expect(page.locator('#founding-action-details')).toBeHidden();
  await expect(page.locator('[data-founding-review]')).not.toContainText('Pay now');
  await page.locator('[aria-controls="founding-action-details"]').click();
  await expect(page.locator('#founding-action-details')).toBeVisible();
  await expect(page.locator('#founding-action-details')).toContainText('Settlement');
  await expect(page.locator('#founding-action-details')).toContainText('Construction time');
  await expect(page.locator('#founding-action-details')).toContainText('Benefit');
  await page.locator('[aria-controls="founding-capacity-details"]').click();
  await expect(page.locator('#founding-capacity-details')).toBeVisible();
  await expect(page.locator('#founding-capacity-details')).toContainText('non-refundable');
  await page.locator('[aria-controls="founding-holdings-details"]').click();
  await expect(page.locator('#founding-holdings-details')).toBeVisible();
});


test('charter and elevation actions use full-width plot-style buttons with cost details', async function ({ page }) {
  await page.setViewportSize({ width:390, height:844 });
  await page.evaluate(function () { FB.ui.showSettlementFounding(); });
  await expect(page.locator('#founding-confirm')).toHaveClass(/actionbtn/);
  const widths = await page.evaluate(function () {
    return { action:document.querySelector('.charter-actions > .charter-info').getBoundingClientRect().width,
      group:document.querySelector('.charter-actions').getBoundingClientRect().width };
  });
  expect(Math.abs(widths.action - widths.group)).toBeLessThan(2);
  await page.evaluate(function () { FB.ui.closeModal(); FB.ui.showRankElevation('barony'); });
  await expect(page.locator('#rank-elevation-confirm')).toHaveClass(/actionbtn/);
  await page.locator('[aria-controls="rank-elevation-confirm-details"]').click();
  await expect(page.locator('#rank-elevation-confirm-details')).toBeVisible();
  await expect(page.locator('#rank-elevation-confirm-details')).toContainText('prestige');
  await expect(page.locator('#rank-elevation-confirm-details .kv > b')).toHaveCSS('flex-grow', '0');
  await expect(page.locator('#rank-elevation-confirm-details .kv')).toHaveCSS('margin-bottom', '8px');
});
