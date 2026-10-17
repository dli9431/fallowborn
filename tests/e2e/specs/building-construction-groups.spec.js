'use strict';
const path = require('path');
const fs = require('fs');
const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { startDeterministicGame } = require('../support/game/start');
const { restoreBookmark } = require('../support/game/bookmark-acceptance');
const { dependsOnRuntime } = require('../support/runtime-dependencies');

dependsOnRuntime(__filename, [
  'js/actions.js', 'js/fortifications.js', 'js/mods.js', 'js/world.js',
  'js/lordships.js', 'js/treasury.js', 'js/ui_modals.js', 'js/ui_misc.js',
  'js/technology.js', 'js/save.js', 'js/main.js', 'js/population.js',
  'data/map_data.js', 'data/technology.js'
]);

test.beforeEach(async function ({ page }, info) {
  await openGame(page, info);
  await page.evaluate(function () { FB.ui.showMods(); });
  await page.locator('#modfile').setInputFiles(path.resolve(__dirname,
    '../fixtures/authoring/building-construction-groups.json'));
  await page.locator('#mod-apply').click();
  await page.waitForFunction(function () {
    return window.FB && FB.game && FB.game.bootReady && FBDATA.buildings.review_guest_house;
  });
  await startDeterministicGame(page);
  await page.evaluate(function () {
    const s = FB.state, pid = s.player.provinceId;
    window.groupCounty = pid;
    s.player.tier = 4; s.player.provs = [pid]; s.player.gold = 10000;
    s.owner[pid] = s.holder[pid] = 'player'; s.dev[pid] = 8;
    FB.foundPlayerRealm(s);
    FB.rememberSettlementSites(s, pid);
    for (let slot = 1; slot < FB.settlementVisibleCount(s, pid); slot++) {
      FB.assignSettlementLordship(s, pid, slot, s.player.charId);
    }
    FB.invalidateSettlementLordships(s);
    s.buildings[pid] = [];
    FB.invalidateBuildingIndex(s, pid); FB.invalidateFortIndex();
  });
});

test('ordinary imports support independent one- and two-place groups without role exclusion', async function ({ page }) {
  const r = await page.evaluate(function () {
    const s = FB.state, pid = groupCounty, before = s.player.gold;
    const firstCost = FB.buildCost(s, pid, 'review_guest_house');
    const first = FB.build(s, pid, 0, 'review_guest_house');
    const blockedGold = s.player.gold;
    const alternative = FB.build(s, pid, 1, 'review_quiet_house');
    const blockedSpent = blockedGold - s.player.gold;
    const otherRole = FB.canBuildAt(s, pid, 1, 'review_open_hall');
    const workshop = FB.build(s, pid, 0, 'review_workshop');
    const yard = FB.build(s, pid, 1, 'review_yard');
    const third = FB.canBuildAt(s, pid, 2, 'review_workshop');
    return { first:first, spent:before - blockedGold, firstCost:firstCost,
      alternative:alternative, blockedSpent:blockedSpent, otherRole:otherRole,
      workshop:workshop, yard:yard, third:third,
      group:FB.buildingConstructionGroupStatus(s, pid, 'review_yard'),
      review:FBDATA.techImpactReviews.features.construction_group_limits.mode };
  });
  expect(r).toMatchObject({ first:true, alternative:false, blockedSpent:0, otherRole:true,
    workshop:true, yard:true, third:false, review:'none', group:{ ok:false, count:2, limit:2, remaining:0 } });
  expect(r.spent).toBe(r.firstCost);
  expect(r.group.reason).toContain('including ruins');
});

test('ruins, duplicate physical records, stale contexts and grouped demolition conserve capacity', async function ({ page }) {
  const r = await page.evaluate(function () {
    const s = FB.state, pid = groupCounty;
    const context = FB.buildingContext(s, pid);
    s.buildings[pid].push({ s:0, id:'review_guest_house', ruined:true });
    s.buildings[pid].push({ s:0, id:'review_guest_house', ruined:true });
    const before = JSON.stringify(s), rng = FB.getRngState(), uid = FB.getUidCounter();
    const status = FB.buildingConstructionGroupStatus(s, pid, 'review_quiet_house');
    const stale = FB.canBuildAt(s, pid, 1, 'review_quiet_house', context);
    const rejected = FB.build(s, pid, 1, 'review_quiet_house');
    const pure = before === JSON.stringify(s) && rng === FB.getRngState() && uid === FB.getUidCounter();
    // A malformed old duplicate reserves one physical place, not two.
    s.buildings[pid].pop();
    const cleared = FB.demolishBuilding(s, pid, 0, 'review_guest_house');
    const room = FB.canBuildAt(s, pid, 1, 'review_quiet_house', context);
    const built = FB.build(s, pid, 1, 'review_quiet_house');
    const clearedStanding = FB.demolishBuilding(s, pid, 1, 'review_quiet_house');
    return { count:status.count, stale:stale, rejected:rejected, pure:pure,
      cleared:cleared, room:room, built:built, clearedStanding:clearedStanding, records:s.buildings[pid] };
  });
  expect(r).toEqual({ count:1, stale:false, rejected:false, pure:true, cleared:true,
    room:true, built:true, clearedStanding:true, records:[] });
});

test('old over-limit assets work and repair, and matching restore preserves exact records', async function ({ page }) {
  const before = await page.evaluate(function () {
    const s = FB.state, pid = groupCounty;
    s.buildings[pid] = [ { s:0, id:'review_guest_house' }, { s:1, id:'review_quiet_house', ruined:true } ];
    FB.invalidateBuildingIndex(s, pid);
    const quote = FB.repairBuildingStatus(s, pid, 1, 'review_quiet_house');
    const gold = s.player.gold;
    const repaired = FB.repairBuilding(s, pid, 1, 'review_quiet_house', quote.cost);
    return { repaired:repaired, cost:quote.cost, paid:gold - s.player.gold,
      bonus:FB.buildingBonusIn(s, pid, 'tax'), records:JSON.stringify(s.buildings[pid]),
      group:FB.buildingConstructionGroupStatus(s, pid, 'review_guest_house'), save:FB.save.serialize() };
  });
  expect(before.repaired).toBe(true); expect(before.paid).toBe(before.cost);
  expect(before.bonus).toBe(3);
  expect(before.group).toMatchObject({ count:2, limit:1, ok:false });
  await restoreBookmark(page, before.save);
  const after = await page.evaluate(function () {
    const s = FB.state, pid = groupCounty;
    return { records:JSON.stringify(s.buildings[pid]), bonus:FB.buildingBonusIn(s, pid, 'tax'),
      blocked:FB.canBuildAt(s, pid, 2, 'review_guest_house') };
  });
  expect(after).toEqual({ records:before.records, bonus:3, blocked:false });
});

test('detached validation rejects malformed and inconsistent groups without any publication', async function ({ page }) {
  const r = await page.evaluate(function () {
    const s = FB.state;
    const groups = [null, [], {}, { id:'x' }, { id:'', maxCounty:1 },
      { id:'Unsafe-id', maxCounty:1 }, { id:'constructor', maxCounty:1 },
      { id:'x', maxCounty:0 }, { id:'x', maxCounty:1.5 }, { id:'x', maxCounty:2049 },
      { id:'x', maxCounty:Infinity }, { id:'x', maxCounty:NaN },
      { id:'x', maxCounty:'1' }, { id:'x', maxCounty:1, extra:true },
      { id:'guest_foundations', maxCounty:2 }];
    const before = JSON.stringify(s), data = JSON.stringify(FBDATA.buildings);
    const signature = FB.mods.sig(), rng = FB.getRngState(), uid = FB.getUidCounter();
    const faults = groups.map(function (group) {
      const mod = { buildings:{ rejected_group:{ name:'Rejected', role:'care', cost:1, constructionGroup:group } } };
      const builtIn = FB.validateBuildingData(Object.assign({}, FBDATA.buildings, mod.buildings), true);
      return { imported:FB.mods.validate(mod).join('; '), builtIn:builtIn.join('; ') };
    });
    return { faults:faults, pure:before === JSON.stringify(s) && data === JSON.stringify(FBDATA.buildings) &&
      signature === FB.mods.sig() && rng === FB.getRngState() && uid === FB.getUidCounter() };
  });
  expect(r.pure).toBe(true);
  for (const fault of r.faults) {
    expect(fault.imported).toMatch(/constructionGroup/);
    expect(fault.builtIn).toMatch(/constructionGroup/);
  }
});

test('baron purchases share the county gate and pay once only when space is free', async function ({ page }) {
  const r = await page.evaluate(function () {
    const s = FB.state, pid = groupCounty, me = s.chars[s.player.charId];
    const baron = FB.makeCharacter(s, { name:'Guest Baron', born:s.date.year - 30,
      station:3, culture:me.culture, religion:me.religion, traits:[] });
    if (!FB.assignSettlementLordship(s, pid, 1, baron.id)) throw new Error('Baron grant failed');
    FB.settleBaronyAccounts(s, Math.floor(s.turn / 90) + 1);
    FB.baronyAccount(s, baron.id).gold = 1000;
    s.buildings[pid] = [{ s:0, id:'review_guest_house', ruined:true }];
    FB.invalidateBuildingIndex(s, pid);
    const blocked = FB.buildBarony(s, baron.id, pid, 1, 'review_quiet_house');
    const untouched = FB.baronyAccount(s, baron.id).gold;
    const cleared = FB.demolishBuilding(s, pid, 0, 'review_guest_house');
    const cost = FB.buildCost(s, pid, 'review_quiet_house', FB.settlementCountyHolder(s, pid));
    const built = FB.buildBarony(s, baron.id, pid, 1, 'review_quiet_house');
    const repeated = FB.buildBarony(s, baron.id, pid, 1, 'review_quiet_house');
    return { blocked:blocked, untouched:untouched, cleared:cleared, built:built, repeated:repeated,
      spent:1000 - FB.baronyAccount(s, baron.id).gold, cost:cost,
      playerBlocked:FB.canBuildAt(s, pid, 2, 'review_guest_house') };
  });
  expect(r).toMatchObject({ blocked:false, untouched:1000, cleared:true, built:true, repeated:false, playerBlocked:false });
  expect(r.spent).toBe(r.cost);
});

test('annual AI and player automation skip full groups and retain paid construction', async function ({ page }) {
  const r = await page.evaluate(function () {
    const s = FB.state, pid = groupCounty;
    // Isolate selection, retaining the real eligibility and payment consumers.
    for (const id in FBDATA.buildings) if (id !== 'review_guest_house') delete FBDATA.buildings[id].aiBuildOrder;
    s.buildings[pid] = [{ s:0, id:'review_quiet_house', ruined:true }];
    FB.invalidateBuildingIndex(s, pid);
    FB.autoBuild(s);
    const autoGrouped = s.buildings[pid].some(function (b) { return b.id === 'review_guest_house'; });
    FB.demolishBuilding(s, pid, 0, 'review_quiet_house');
    const playerGold = s.player.gold, autoCost = FB.buildCost(s, pid, 'review_guest_house');
    const autoBuilt = FB.autoBuild(s);
    const autoSpent = playerGold - s.player.gold;
    // Use a real AI court, its actual county and its own treasury.
    const rid = Object.keys(s.realms).filter(function (id) {
      return id !== 'player' && s.realms[id].alive && FB.realmHeldCounties(s, id).length;
    })[0];
    const counties = FB.realmHeldCounties(s, rid), target = counties[0];
    for (const county of counties) {
      s.buildings[county] = [{ s:0, id:'review_quiet_house', ruined:true }];
      FB.invalidateBuildingIndex(s, county);
    }
    FB.treasuryInitialize(s);
    s.armies = []; s.greatHolyWar = null;
    const account = s.realms[rid].treasury;
    account.gold = 100000; account.militaryAccrued = 0;
    const gold = account.gold;
    FB.aiBuildingsYear(s);
    const blocked = account.gold === gold && counties.every(function (county) {
      return !s.buildings[county].some(function (b) { return b.id === 'review_guest_house'; });
    });
    s.buildings[target] = []; FB.invalidateBuildingIndex(s, target);
    const cost = FB.buildCost(s, target, 'review_guest_house', rid);
    FB.aiBuildingsYear(s);
    return { autoGrouped:autoGrouped, autoBuilt:autoBuilt, autoSpent:autoSpent, autoCost:autoCost, blocked:blocked,
      aiBuilt:s.buildings[target].some(function (b) { return b.id === 'review_guest_house'; }),
      aiSpent:gold - account.gold, cost:cost };
  });
  expect(r.autoGrouped).toBe(false); expect(r.blocked).toBe(true);
  expect(r.autoBuilt).toBe(true); expect(r.autoSpent).toBe(r.autoCost);
  expect(r.aiBuilt).toBe(true); expect(r.aiSpent).toBe(r.cost);
});

test('fort foundations reserve group capacity while repairs and funded completion retain their place', async function ({ page }) {
  const r = await page.evaluate(function () {
    const s = FB.state, pid = groupCounty, fortId = FB.fortificationBuildingId();
    s.armies = []; s.greatHolyWar = null;
    // Attach the existing strategic consumer to the imported one-place group.
    const def = Object.assign({}, FBDATA.buildings[fortId], {
      constructionGroup:{ id:'guest_foundations', maxCounty:1 }
    });
    FB.mods.apply({ buildings:{ [fortId]:def } });
    FB.invalidateFortIndex();
    s.buildings[pid] = [{ s:0, id:'review_guest_house', ruined:true }];
    FB.invalidateBuildingIndex(s, pid);
    const blockedGold = s.player.gold;
    const blocked = FB.startFortProject(s, pid, 1, 1);
    const untouched = s.player.gold === blockedGold;
    FB.demolishBuilding(s, pid, 0, 'review_guest_house');
    const quote = FB.fortProjectStatus(s, pid, 1, 1);
    const project = FB.startFortProject(s, pid, 1, 1);
    if (!project) throw new Error('Expected an ordinary first-tier fort project');
    const firstPaid = blockedGold - s.player.gold;
    const foundationBlocks = !FB.canBuildAt(s, pid, 0, 'review_guest_house');
    // Simulate inherited excess after the project was paid, then its completion boundary.
    s.buildings[pid].push({ s:0, id:'review_guest_house' });
    FB.invalidateBuildingIndex(s, pid);
    s.turn = project.completeTurn;
    const completed = FB.fortificationDay(s);
    const standing = FB.fortAt(s, pid).level;
    const removed = FB.demolishFort(s, pid, 1);
    const absent = FB.fortAtSettlement(s, pid, 1, true) === null;
    s.buildings[pid].push({ s:1, id:fortId, ruined:true, ruinedLevel:1, level:0 });
    FB.invalidateFortIndex();
    const repairQuote = FB.fortProjectStatus(s, pid, 1, 1, { repair:true });
    const repairGold = s.player.gold;
    const repair = FB.startFortProject(s, pid, 1, 1, { repair:true });
    return { blocked:!!blocked, untouched:untouched, paid:firstPaid, expected:quote.cost,
      repairPaid:repairGold - s.player.gold, repairExpected:repairQuote.cost,
      foundationBlocks:foundationBlocks, completed:completed, standing:standing,
      removed:removed, absent:absent, repair:!!repair };
  });
  expect(r).toMatchObject({ blocked:false, untouched:true, foundationBlocks:true, completed:1,
    standing:1, removed:true, absent:true, repair:true });
  expect(r.paid).toBe(r.expected); expect(r.repairPaid).toBe(r.repairExpected);
});

test('changing a stored group under the same mod name rejects the previous save', async function ({ page }) {
  const saved = await page.evaluate(function () { return FB.save.serialize(); });
  const changed = JSON.parse(fs.readFileSync(path.resolve(__dirname,
    '../fixtures/authoring/building-construction-groups.json'), 'utf8'));
  changed.buildings.review_guest_house.constructionGroup.maxCounty = 2;
  changed.buildings.review_quiet_house.constructionGroup.maxCounty = 2;
  await page.evaluate(function () { FB.ui.showMods(); });
  await page.locator('#modpaste').fill(JSON.stringify(changed));
  await page.locator('#mod-apply').click();
  await page.waitForFunction(function () {
    return window.FB && FB.game && FB.game.bootReady &&
      FBDATA.buildings.review_guest_house.constructionGroup.maxCounty === 2;
  });
  const r = await page.evaluate(function (source) {
    const before = FB.state, data = JSON.parse(source), rng = FB.getRngState(), uid = FB.getUidCounter();
    return { mismatch:FB.save.otherWorld(data), loaded:FB.game.loadData(data),
      untouched:FB.state === before && rng === FB.getRngState() && uid === FB.getUidCounter() };
  }, saved);
  expect(r).toEqual({ mismatch:true, loaded:false, untouched:true });
});

test('ledger and grouped-ruin demolition disclose capacity and release it through confirmation', async function ({ page }) {
  await page.evaluate(function () {
    FB.state.buildings[groupCounty] = [{ s:0, id:'review_guest_house', ruined:true }];
    FB.invalidateBuildingIndex(FB.state, groupCounty);
    FB.ui.showBuildings(groupCounty);
  });
  await expect(page.locator('#gm-body')).toContainText('Construction group: 1/1 occupied, including ruins');
  await expect(page.locator('#gm-body')).toContainText('This construction group is full');
  await page.evaluate(function () { FB.ui.showSettlement(groupCounty, 0); });
  await page.locator('[data-demolish="review_guest_house"]').click();
  await expect(page.locator('#gm-body')).toContainText('construction group gains a free place');
  await page.locator('#gm-demolish-back').click();
  expect(await page.evaluate(function () { return FB.state.buildings[groupCounty].length; })).toBe(1);
  await page.locator('[data-demolish="review_guest_house"]').click();
  await page.locator('#gm-demolish-confirm').click();
  expect(await page.evaluate(function () {
    return FB.canBuildAt(FB.state, groupCounty, 0, 'review_quiet_house');
  })).toBe(true);
});
