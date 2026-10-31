'use strict';
const path = require('path');
const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { startDeterministicGame } = require('../support/game/start');
const { dependsOnRuntime } = require('../support/runtime-dependencies');

dependsOnRuntime(__filename, [
  'data/technology.js', 'data/map_data.js',
  'js/technology.js', 'js/actions.js', 'js/lordships.js', 'js/world.js',
  'js/population.js', 'js/model.js', 'js/main.js',
  'js/ui_modals.js', 'js/ui_misc.js', 'js/mods.js', 'js/save.js'
]);

async function restoreCapacitySave(page, text) {
  await page.evaluate(function (saved) { FB.save.restore(JSON.parse(saved)); }, text);
}

async function stageCompactRuler(page) {
  return page.evaluate(function () {
    const s = FB.state, p = s.player;
    FB.game.setPaused(true);
    const pid = Object.keys(s.owner).sort().find(function (id) {
      const info = FB.world.sitesByProv[id];
      return s.owner[id] && info && info.authored <= info.legacyBase && info.list.length === 8;
    });
    if (!pid) throw new Error('An ordinary county with unused compiled sites is required');
    const info = FB.world.sitesByProv[pid];
    p.tier = 4; p.provs = [pid]; p.provinceId = pid; p.homeSettlement = 0;
    p.travel = null; p.liege = null; p.gold = 100000; p.prestige = 10000; p.piety = 10000;
    p.landPlots = []; p.landPlotMigration = 1; p.enterprises = [];
    s.owner[pid] = s.holder[pid] = 'player'; s.dev[pid] = 1;
    FB.foundPlayerRealm(s); s.realms.player.liege = null;
    s.realmTech.player = {completed:[], exposed:[], active:[], progress:{},
      reserve:0, priorities:{}, historicalSeeded:1};
    FB.invalidateTechBonuses();
    s.buildings[pid] = [];
    FB.ensurePopulationState(s);
    s.population.counties[pid].settlementCommunityProjects = {};
    s.settlementLordships.counties[pid] = {established:info.legacyBase, lordships:{}};
    s.settlementLordships.foundingVersion = 1;
    FB.invalidateBuildingIndex(s, pid); FB.invalidateSettlementLordships(s, pid);
    return {pid:pid, baseline:info.legacyBase};
  });
}

test('an independent ruler researches existing branches for paid local expansion', async function ({ page }, info) {
  await openGame(page, info); await startDeterministicGame(page); await stageCompactRuler(page);
  const r = await page.evaluate(function () {
    const s = FB.state, p = s.player, pid = p.provinceId;
    const targets = ['open_field_system','three_field','cadastral_surveys','urban_communes'];
    const known = {};
    function prerequisites(id) {
      const d = FBDATA.tech[id];
      (d.req || []).concat(d.reqAny && d.reqAny.length ? [d.reqAny[0]] : []).forEach(function (req) {
        if (known[req]) return;
        known[req] = true; prerequisites(req);
      });
    }
    targets.forEach(prerequisites);
    s.realmTech.player.completed = Object.keys(known).filter(function (id) { return targets.indexOf(id) < 0; });
    FB.invalidateTechBonuses();
    const before = {plots:FB.landPlotCapacity(s), sites:FB.settlementCapacity(s, pid),
      direct:FB.settlementCapacityProjection(s).limit, counties:FB.domainCap(s),
      visible:FB.settlementVisibleCount(s, pid), population:s.population.counties[pid].count};
    const operations = targets.map(function (id) {
      const started = FB.selectTechProject(s, id);
      FB.addResearch(s, FB.techCost(s, id));
      return {started:started, done:FB.hasTech(s, id)};
    });
    const after = {plots:FB.landPlotCapacity(s), sites:FB.settlementCapacity(s, pid),
      direct:FB.settlementCapacityProjection(s).limit, counties:FB.domainCap(s),
      visible:FB.settlementVisibleCount(s, pid), population:s.population.counties[pid].count};
    for (let i = 0; i < 5; i++) p.landPlots.push({provinceId:pid, settlement:0});
    let expectedSpend = 0;
    const gold = p.gold;
    const purchases = [6,7,8].map(function () {
      expectedSpend += FB.landPlotCost(s); return FB.buyLandPlot(s, 0);
    });
    const fullGold = p.gold, blocked = FB.buyLandPlot(s, 0);
    return {before:before, after:after, operations:operations, purchases:purchases,
      paid:gold - p.gold, expectedSpend:expectedSpend, blocked:blocked, fullGold:p.gold === fullGold,
      plots:FB.landCountAt(s, pid, 0), validation:FB.validateTechnologyData(true)};
  });
  expect(r.validation).toEqual([]);
  expect(r.operations).toEqual(Array(4).fill({started:true, done:true}));
  expect(r.before.plots).toBe(5); expect(r.after.plots).toBe(8);
  expect(r.after.sites).toBe(r.before.sites + 2);
  expect(r.after.direct).toBe(r.before.direct + 2);
  expect(r.after.counties).toBe(r.before.counties);
  expect(r.after.visible).toBe(r.before.visible); expect(r.after.population).toBe(r.before.population);
  expect(r.purchases).toEqual([true,true,true]); expect(r.paid).toBe(r.expectedSpend);
  expect(r).toMatchObject({blocked:false, fullGold:true, plots:8});
});

test('research unlocks a paid charter without creating residents and established property survives lost access', async function ({ page }, info) {
  await openGame(page, info); await startDeterministicGame(page); await stageCompactRuler(page);
  const r = await page.evaluate(function () {
    const s = FB.state, p = s.player, pid = p.provinceId, rec = s.realmTech.player;
    const before = FB.settlementFoundingEligibility(s, pid);
    rec.completed = ['cadastral_surveys']; FB.invalidateTechBonuses();
    const q = FB.settlementFoundingEligibility(s, pid), gold = p.gold;
    const population = s.population.counties[pid].count;
    rec.completed.push('urban_communes'); FB.invalidateTechBonuses();
    const stale = !FB.beginSettlementFounding(s, q) && p.gold === gold;
    rec.completed = ['cadastral_surveys']; FB.invalidateTechBonuses();
    const funded = FB.beginSettlementFounding(s, q), project = FB.activeSettlementFounding(s);
    const repeated = FB.beginSettlementFounding(s, q), spent = gold - p.gold;
    s.turn = project.dueTurn;
    rec.completed = []; FB.invalidateTechBonuses();
    const paused = !FB.completeSettlementFounding(s) && !!FB.activeSettlementFounding(s);
    rec.completed = ['cadastral_surveys']; FB.invalidateTechBonuses();
    const complete = FB.completeSettlementFounding(s);
    for (let i = 0; i < 8; i++) p.landPlots.push({provinceId:pid, settlement:0});
    const property = JSON.stringify(p.landPlots), yieldBefore = FB.landYield(s);
    rec.completed = []; FB.invalidateTechBonuses();
    const visible = FB.settlementVisibleCount(s, pid), capacity = FB.settlementCapacity(s, pid);
    const stable = property === JSON.stringify(p.landPlots) && yieldBefore === FB.landYield(s);
    const blocked = !FB.buyLandPlot(s, 0), save = FB.save.serialize();
    return {beforeReady:before.ready, ready:q.ready, funded:funded, repeated:repeated,
      spent:spent, cost:q.gold, stale:stale, paused:paused, complete:complete, visible:visible, capacity:capacity,
      stable:stable, blocked:blocked, population:s.population.counties[pid].count === population,
      save:save, pid:pid, property:property};
  });
  expect(r).toMatchObject({beforeReady:false, ready:true, funded:true, repeated:false,
    stale:true, paused:true, complete:true, stable:true, blocked:true, population:true});
  expect(r.spent).toBe(r.cost); expect(r.visible).toBe(r.capacity + 1);
  await restoreCapacitySave(page, r.save);
  expect(await page.evaluate(function (pid) {
    return {visible:FB.settlementVisibleCount(FB.state, pid), plots:JSON.stringify(FB.state.player.landPlots),
      known:FB.state.realmTech.player.completed};
  }, r.pid)).toEqual({visible:r.visible, plots:r.property, known:[]});
});

test('county sovereignty controls plot and site bonuses while AI and subordinate holders share administration', async function ({ page }, info) {
  await openGame(page, info); await startDeterministicGame(page); await stageCompactRuler(page);
  const r = await page.evaluate(function () {
    const s = FB.state, pid = s.player.provinceId;
    const other = Object.keys(s.realms).sort().find(function (id) {
      return id !== 'player' && s.realms[id].alive && !s.realms[id].liege;
    });
    s.realmTech[other] = {completed:[], exposed:[], active:[], progress:{}, reserve:0,
      priorities:{}, historicalSeeded:1};
    const empty = FB.settlementCapacityProjection(s, other);
    s.realmTech[other].completed = ['cadastral_surveys','urban_communes','professional_bailiffs','royal_chancery',
      'open_field_system','three_field'];
    FB.invalidateTechBonuses();
    const improved = FB.settlementCapacityProjection(s, other);
    const base = {plots:FB.landPlotCapacity(s), sites:FB.settlementCapacity(s, pid)};
    s.realms.player.liege = other;
    const subject = {plots:FB.landPlotCapacity(s), sites:FB.settlementCapacity(s, pid)};
    s.realms.player.liege = null;
    s.owner[pid] = other;
    const abroad = {plots:FB.landPlotCapacity(s), sites:FB.settlementCapacity(s, pid)};
    s.dev[pid] = 9;
    const saturated = FB.settlementCapacity(s, pid), next = FB.settlementDevelopment(s, pid).next;
    const playerKnowledge = s.realmTech.player.completed.slice();
    return {base:base, subject:subject, abroad:abroad, directDelta:improved.limit - empty.limit,
      saturated:saturated, next:next, playerKnowledge:playerKnowledge};
  });
  expect(r.directDelta).toBe(4); expect(r.playerKnowledge).toEqual([]);
  expect(r.subject).toEqual(r.abroad); expect(r.subject.plots).toBe(r.base.plots + 3);
  expect(r.subject.sites).toBe(r.base.sites + 2); expect(r.saturated).toBe(8); expect(r.next).toBe(null);
});

for (const width of [390,1360]) {
  test('capacity research is discoverable and plot purchases use the displayed limit at width ' + width, async function ({ page }, info) {
    await page.setViewportSize({width:width, height:844});
    await openGame(page, info); await startDeterministicGame(page); await stageCompactRuler(page);
    await page.evaluate(function () { FB.ui.showTech(); });
    await page.locator('#tech-search').fill('founding sites');
    await expect(page.locator('[data-tech-open="cadastral_surveys"]')).toBeVisible();
    await expect(page.locator('[data-tech-open="urban_communes"]')).toBeVisible();
    await page.locator('[data-tech-open="cadastral_surveys"]').click();
    await expect(page.locator('#gm-body')).toContainText('+1 founding sites per county (maximum 8)');
    await expect(page.locator('#gm-body')).toContainText('+1 directly governed settlement capacity');
    await page.evaluate(function () {
      const s = FB.state, pid = s.player.provinceId;
      s.realmTech.player.completed = ['open_field_system','three_field']; FB.invalidateTechBonuses();
      for (let i = 0; i < 7; i++) s.player.landPlots.push({provinceId:pid, settlement:0});
      FB.ui.showLandMarket();
    });
    const row = page.locator('[data-land-settlement="0"]');
    await expect(row).toContainText('7/8 plots');
    await expect(page.locator('#gm-body')).toContainText('Current capacity: 8 family plots per settlement.');
    await row.click();
    await expect(row).toContainText('8/8 plots'); await expect(row).toHaveAttribute('aria-disabled','true');
    await expect(row).toBeFocused();
  });
}

for (const input of [
  {file:'compact-estate.json', cost:40, plots:2, sites:0, direct:1},
  {file:'compact-county.json', cost:75, plots:1, sites:2, direct:3}
]) {
  test(input.file + ' uses the ordinary JSON import, validation and matching save contract', async function ({ page }, info) {
    await openGame(page, info); await page.evaluate(function () { FB.ui.showMods(); });
    await page.locator('#modfile').setInputFiles(path.resolve(__dirname,'../fixtures/authoring/'+input.file));
    await Promise.all([page.waitForEvent('domcontentloaded'),page.locator('#mod-apply').click()]);
    await page.waitForFunction(function (cost) {
      return window.FB && FB.game && FB.game.bootReady && FBDATA.tech.cadastral_surveys.cost === cost;
    }, input.cost);
    await startDeterministicGame(page); await stageCompactRuler(page);
    const r = await page.evaluate(function () {
      const s = FB.state, pid = s.player.provinceId, data = JSON.stringify(FBDATA.tech);
      const state = JSON.stringify(s), rng = FB.getRngState(), uid = FB.getUidCounter();
      const faults = [];
      ['landPlotCapacity','settlementSlots','settlementDomain'].forEach(function (key) {
        [-1,0.5,101,'2',null].forEach(function (value) {
          const def = JSON.parse(JSON.stringify(FBDATA.tech.cadastral_surveys));
          def.fx[key] = value;
          try { FB.mods.apply({tech:{cadastral_surveys:def}}); faults.push(0); }
          catch (error) { faults.push(error.message.length); }
        });
        const caps = {}; caps[key] = 0.5;
        try { FB.mods.apply({techCaps:caps}); faults.push(0); }
        catch (error) { faults.push(error.message.length); }
      });
      const pure = state === JSON.stringify(s) && data === JSON.stringify(FBDATA.tech) &&
        rng === FB.getRngState() && uid === FB.getUidCounter();
      const rec = s.realmTech.player;
      rec.completed = FBDATA.tech.cadastral_surveys.req.slice(); FB.invalidateTechBonuses();
      const before = [FB.landPlotCapacity(s),FB.settlementCapacity(s,pid),FB.settlementCapacityProjection(s).limit];
      const started = FB.selectTechProject(s,'cadastral_surveys'); FB.addResearch(s,FB.techCost(s,'cadastral_surveys'));
      const after = [FB.landPlotCapacity(s),FB.settlementCapacity(s,pid),FB.settlementCapacityProjection(s).limit];
      // A second completed source exercises independent national caps and the physical bound.
      rec.completed.push('urban_communes'); FB.invalidateTechBonuses();
      const caps = FBDATA.techCaps;
      const guards = ['landPlotCapacity','settlementSlots','settlementDomain'].every(function (key) {
        return FB.techBonus(s,key) <= caps[key];
      });
      return {faults:faults, pure:pure, started:started, delta:after.map(function (n,i) { return n-before[i]; }),
        guards:guards, record:JSON.stringify(rec), save:FB.save.serialize()};
    });
    expect(r.faults.every(function (n) { return n > 0; })).toBe(true);
    expect(r).toMatchObject({pure:true, started:true, guards:true, delta:[input.plots,input.sites,input.direct]});
    await restoreCapacitySave(page, r.save);
    expect(await page.evaluate(function () { return JSON.stringify(FB.state.realmTech.player); })).toBe(r.record);
    await page.evaluate(function () {
      const stored = JSON.parse(localStorage.getItem('fb_mods')), mod = JSON.parse(stored[0]);
      mod.tech.cadastral_surveys.fx.landPlotCapacity++; localStorage.setItem('fb_mods',JSON.stringify([JSON.stringify(mod)]));
    });
    await openGame(page, info);
    expect(await page.evaluate(function (text) {
      const state = FB.state, world = FB.world, rng = FB.getRngState(), uid = FB.getUidCounter();
      return FB.game.loadData(JSON.parse(text)) === false && state === FB.state && world === FB.world &&
        rng === FB.getRngState() && uid === FB.getUidCounter();
    }, r.save)).toBe(true);
  });
}
