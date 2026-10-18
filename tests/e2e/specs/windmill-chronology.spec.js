'use strict';
const path = require('path');
const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { startDeterministicGame } = require('../support/game/start');
const { restoreBookmark } = require('../support/game/bookmark-acceptance');
const { dependsOnRuntime } = require('../support/runtime-dependencies');
const example = require('../fixtures/authoring/windmill-window.json');

dependsOnRuntime(__filename, [
  'index.html', 'data/technology.js', 'data/technology_wind.js', 'data/buildings_wind.js',
  'data/map_data.js', 'data/bookmarks.js', 'data/eras.js',
  'js/technology.js', 'js/actions.js', 'js/fortifications.js', 'js/world.js',
  'js/lordships.js', 'js/population.js', 'js/treasury.js', 'js/mods.js',
  'js/save.js', 'js/main.js', 'js/ui_modals.js'
]);

test.beforeEach(async function ({ page }, info) {
  await page.addInitScript(function () {
    window.FBDATA = window.FBDATA || {};
    ['techCorrections_wind', 'buildingCorrections_wind'].forEach(function (key) {
      Object.defineProperty(FBDATA, key, { configurable:true, set:function (value) {
        window[key + '_before'] = JSON.parse(JSON.stringify(
          key === 'techCorrections_wind' ? this.tech : this.buildings));
        Object.defineProperty(this, key, {
          configurable:true, enumerable:true, writable:true, value:value
        });
      } });
    });
  });
  await openGame(page, info);
});

async function prepareLord(page) {
  await startDeterministicGame(page);
  await page.evaluate(function () {
    const s = FB.state, p = s.player;
    p.tier = 4; p.provs = [p.provinceId, 'york']; p.gold = 10000; p.liege = null;
    for (const pid of p.provs) {
      s.owner[pid] = s.holder[pid] = 'player'; s.dev[pid] = 8;
      s.buildings[pid] = [];
      FB.invalidateBuildingIndex(s, pid);
    }
    FB.foundPlayerRealm(s);
    for (const pid of p.provs) {
      FB.rememberSettlementSites(s, pid);
      for (let slot = 1; slot < FB.settlementVisibleCount(s, pid); slot++) {
        if (!FB.assignSettlementLordship(s, pid, slot, p.charId)) throw new Error('Site grant failed');
      }
    }
    FB.invalidateSettlementLordships(s); FB.invalidateFortIndex();
    const knowledge = FB.realmTechRecord(s);
    knowledge.completed = ['quern_stones', 'water_power', 'windmill'];
    knowledge.active = []; knowledge.progress = {}; knowledge.priorities = {};
    s.wars = {}; s.armies = []; s.greatHolyWar = null;
    FB.game.setPaused(true);
  });
}

test('one technology and one building correction preserve every mechanical value and adoption pair', async function ({ page }) {
  const r = await page.evaluate(function () {
    const original = JSON.parse(JSON.stringify(window.techCorrections_wind_before.windmill));
    FB.normalizeTechDefinition('windmill', original);
    const tech = JSON.parse(JSON.stringify(FBDATA.tech.windmill));
    FB.normalizeTechDefinition('windmill', tech);
    const oldBuilding = JSON.parse(JSON.stringify(window.buildingCorrections_wind_before.windmill));
    const building = JSON.parse(JSON.stringify(FBDATA.buildings.windmill));
    const presentation = { name:tech.name, attested:tech.history.attested,
      buildingName:building.name, applicability:building.applicability };
    for (const t of [original, tech]) { delete t.name; delete t.desc; delete t.history.attested; }
    original.sources.push('HARVERSON');
    delete oldBuilding.desc; delete building.desc; delete building.applicability;
    const scripts = Array.from(document.querySelectorAll('script[src]')).map(function (el) {
      return el.getAttribute('src');
    });
    return { original:original, tech:tech, oldBuilding:oldBuilding, building:building,
      presentation:presentation, techErrors:FB.validateTechnologyData(true),
      buildingErrors:FB.validateBuildingData(FBDATA.buildings, true),
      techOwners:Object.keys(FBDATA.techCorrections_wind),
      buildingOwners:Object.keys(FBDATA.buildingCorrections_wind),
      sameTechIds:Object.keys(FBDATA.tech).sort().join() === Object.keys(window.techCorrections_wind_before).sort().join(),
      sameBuildingIds:Object.keys(FBDATA.buildings).sort().join() === Object.keys(window.buildingCorrections_wind_before).sort().join(),
      order:scripts.indexOf('data/technology_wind.js') > scripts.indexOf('data/technology.js') &&
        scripts.indexOf('data/buildings_wind.js') > scripts.indexOf('data/technology_wind.js') &&
        scripts.indexOf('data/buildings_wind.js') < scripts.indexOf('data/bookmarks.js'),
      review:FBDATA.techImpactReviews.features.building_windmill,
      dateReview:FBDATA.techImpactReviews.features.construction_applicability.mode };
  });
  expect(r.tech).toEqual(r.original); expect(r.building).toEqual(r.oldBuilding);
  expect(r.presentation).toEqual({ name:'Wind-Powered Milling', attested:[900,1200],
    buildingName:'Post Windmill', applicability:{ yearMin:1150 } });
  expect(r.techErrors).toEqual([]); expect(r.buildingErrors).toEqual([]);
  expect(r.techOwners).toEqual(['windmill']); expect(r.buildingOwners).toEqual(['windmill']);
  expect(r.sameTechIds && r.sameBuildingIds && r.order).toBe(true);
  expect(r.review).toMatchObject({ mode:'soft', tech:['windmill'] });
  expect(r.dateReview).toBe('none');
});

test('knowledge and research can precede 1150 while new construction rechecks the inclusive date without charge', async function ({ page }) {
  await prepareLord(page);
  const r = await page.evaluate(function () {
    const s = FB.state, pid = 'york', knowledge = FB.realmTechRecord(s);
    s.date.year = 1096;
    knowledge.completed = ['quern_stones', 'water_power'];
    const research = FB.selectTechProject(s, 'windmill', undefined, true);
    const researchCost = FB.techCostBreakdown(s, 'windmill').total;
    knowledge.active = []; knowledge.completed.push('windmill');
    const before = JSON.stringify(s), rng = FB.getRngState(), uid = FB.getUidCounter();
    const review = FB.buildingApplicabilityStatus(s, pid, 'windmill');
    const pure = before === JSON.stringify(s) && rng === FB.getRngState() && uid === FB.getUidCounter();
    const gold = s.player.gold, assets = JSON.stringify(s.buildings);
    const early = FB.build(s, pid, 0, 'windmill');
    s.date.year = 1149;
    const previous = FB.build(s, pid, 0, 'windmill');
    const noCharge = s.player.gold === gold && assets === JSON.stringify(s.buildings);
    const context = FB.buildingContext(s, pid);
    s.date.year = 1150;
    const boundary = FB.canBuildAt(s, pid, 0, 'windmill', context);
    knowledge.completed = ['quern_stones', 'water_power'];
    const missingKnowledge = FB.build(s, pid, 0, 'windmill');
    knowledge.completed.push('windmill');
    const cost = FB.buildCost(s, pid, 'windmill'), built = FB.build(s, pid, 0, 'windmill');
    const spent = gold - s.player.gold;
    s.date.year = 1204;
    return { research:research, researchCost:researchCost, review:review.code, pure:pure,
      early:early, previous:previous, noCharge:noCharge, boundary:boundary,
      missingKnowledge:missingKnowledge, built:built, spent:spent, cost:cost,
      later:FB.canBuildAt(s, pid, 1, 'windmill'),
      known:FB.techRequirementMet(s, 'windmill'),
      remote:s.player.provinceId !== pid };
  });
  expect(r).toMatchObject({ research:true, review:'yearMin', pure:true, early:false,
    previous:false, noCharge:true, boundary:true, missingKnowledge:false, built:true,
    later:true, known:true, remote:true });
  expect(r.researchCost).toBeGreaterThan(0); expect(r.spent).toBe(r.cost);
});

test('private barons share the boundary and pay for their own mill', async function ({ page }) {
  await prepareLord(page);
  const r = await page.evaluate(function () {
    const s = FB.state, pid = 'york', me = s.chars[s.player.charId];
    const patron = FB.makeCharacter(s, { name:'Mill Patron', station:3,
      born:s.date.year - 30, culture:me.culture, religion:me.religion, traits:[] });
    if (!FB.assignSettlementLordship(s, pid, 1, patron.id)) throw new Error('Grant failed');
    FB.settleBaronyAccounts(s, Math.floor(s.turn / 90) + 1);
    s.settlementLordships.accounts[patron.id].gold = 1000;
    const actor = { kind:'character', id:patron.id }, playerGold = s.player.gold;
    s.date.year = 1149;
    const early = FB.aiCanBuildAt(s, actor, pid, 1, 'windmill');
    const rejected = FB.buildBarony(s, patron.id, pid, 1, 'windmill');
    const noCharge = FB.baronyAccount(s, patron.id).gold === 1000;
    s.date.year = 1150;
    const ready = FB.aiCanBuildAt(s, actor, pid, 1, 'windmill');
    const holder = FB.settlementCountyHolder(s, pid);
    const cost = FB.buildCost(s, pid, 'windmill', holder);
    const built = FB.buildBarony(s, patron.id, pid, 1, 'windmill');
    return { early:early, rejected:rejected, noCharge:noCharge, ready:ready, built:built,
      spent:1000 - FB.baronyAccount(s, patron.id).gold, cost:cost,
      playerUnchanged:s.player.gold === playerGold };
  });
  expect(r).toMatchObject({ early:false, rejected:false, noCharge:true, ready:true, built:true, playerUnchanged:true });
  expect(r.spent).toBe(r.cost);
});

test('automation and annual realm AI use the same live date and canonical price', async function ({ page }) {
  await prepareLord(page);
  const r = await page.evaluate(function () {
    const s = FB.state, pid = 'york';
    Object.keys(FBDATA.buildings).forEach(function (id) {
      if (id === 'windmill' || FBDATA.buildings[id].fort) return;
      FBDATA.buildings[id] = Object.assign({}, FBDATA.buildings[id], { cost:1e9 });
      delete FBDATA.buildings[id].aiBuildOrder;
    });
    s.date.year = 1149;
    const gold = s.player.gold, outside = FB.autoBuild(s);
    const noAutoCharge = gold === s.player.gold;
    s.date.year = 1150;
    const autoCost = Math.min.apply(null, s.player.provs.map(function (pid) {
      return FB.buildCost(s, pid, 'windmill');
    }));
    const inside = FB.autoBuild(s);
    const autoSpent = gold - s.player.gold;
    s.buildings[pid] = []; FB.invalidateBuildingIndex(s, pid);
    s.realms.york.alive = true; s.realms.york.liege = 'player';
    s.realms.york.capital = pid;
    s.player.provs = [s.player.provinceId];
    s.holder[pid] = 'york'; s.owner[pid] = 'player';
    FB.invalidateSettlementLordships(s);
    Object.keys(s.realms).forEach(function (id) {
      if (s.realms[id].treasury) {
        s.realms[id].treasury.gold = id === 'york' ? 1e6 : 0;
        s.realms[id].treasury.militaryAccrued = 0;
      }
    });
    const treasury = s.realms.york.treasury, aiGold = treasury.gold;
    s.turn++;
    s.date.year = 1149; FB.aiBuildingsYear(s);
    const noAiCharge = treasury.gold === aiGold && s.buildings[pid].length === 0;
    s.date.year = 1150;
    const aiReady = FB.aiCanBuildAt(s, 'york', pid, 0, 'windmill');
    const aiCost = FB.buildCost(s, pid, 'windmill', 'york');
    FB.aiBuildingsYear(s);
    return { outside:outside, noAutoCharge:noAutoCharge, inside:inside,
      autoCost:autoCost, autoSpent:autoSpent, noAiCharge:noAiCharge, aiReady:aiReady,
      count:s.buildings[pid].filter(function (b) { return b.id === 'windmill'; }).length,
      aiCost:aiCost, aiSpent:aiGold - treasury.gold };
  });
  expect(r).toMatchObject({ outside:false, noAutoCharge:true, inside:true, noAiCharge:true, aiReady:true, count:1 });
  expect(r.autoSpent).toBe(r.autoCost); expect(r.aiSpent).toBe(r.aiCost);
});

test('inherited mills keep effects and paid repairs before the construction window and through matching restore', async function ({ page }) {
  await prepareLord(page);
  const r = await page.evaluate(function () {
    const s = FB.state, pid = 'york';
    s.date.year = 1149;
    s.buildings[pid] = [{ s:0, id:'windmill', devGranted:0 }];
    FB.invalidateBuildingIndex(s, pid);
    const retained = { tax:FB.buildingBonusIn(s, pid, 'tax'),
      capacity:FB.buildingBonusIn(s, pid, 'populationCapacity') };
    const blocked = FB.canBuildAt(s, pid, 1, 'windmill');
    const ruined = FB.demolishBuilding(s, pid, 0, 'windmill');
    const knowledge = FB.realmTechRecord(s);
    knowledge.completed = ['quern_stones', 'water_power'];
    const repair = FB.repairBuildingStatus(s, pid, 0, 'windmill'), gold = s.player.gold;
    const repaired = FB.repairBuilding(s, pid, 0, 'windmill', repair.cost);
    const selected = FB.selectTechProject(s, 'windmill', undefined, true);
    knowledge.progress.windmill = 7;
    return { retained:retained, blocked:blocked, ruined:ruined, ready:repair.ready,
      repaired:repaired, cost:repair.cost, spent:gold - s.player.gold, selected:selected,
      assets:JSON.stringify(s.buildings[pid]), knowledge:JSON.stringify(knowledge),
      save:FB.save.serialize() };
  });
  expect(r).toMatchObject({ retained:{ tax:2, capacity:0.05 }, blocked:false,
    ruined:true, ready:true, repaired:true, selected:true });
  expect(r.spent).toBe(r.cost);
  await restoreBookmark(page, r.save);
  const restored = await page.evaluate(function () {
    const s = FB.state;
    return { assets:JSON.stringify(s.buildings.york),
      knowledge:JSON.stringify(FB.realmTechRecord(s)),
      blocked:FB.canBuildAt(s, 'york', 1, 'windmill') };
  });
  expect(restored).toEqual({ assets:r.assets, knowledge:r.knowledge, blocked:false });
});

test('an ordinary JSON mill uses a different inclusive window, retains assets and rejects a changed saved fingerprint', async function ({ page }) {
  await page.evaluate(function () { FB.ui.showMods(); });
  await page.locator('#modfile').setInputFiles(path.resolve(__dirname, '../fixtures/authoring/windmill-window.json'));
  await page.locator('#mod-apply').click();
  await page.waitForFunction(function () { return FB.game.bootReady && !!FBDATA.buildings.windowed_windmill; });
  await prepareLord(page);
  const r = await page.evaluate(function (mod) {
    const s = FB.state, pid = 'york', id = 'windowed_windmill';
    const rows = [1149,1150,1169,1170,1190,1191,1204].map(function (year) {
      s.date.year = year;
      return [FB.canBuildAt(s, pid, 0, 'windmill'), FB.canBuildAt(s, pid, 0, id)];
    });
    s.date.year = 1170;
    const cost = FB.buildCost(s, pid, id), gold = s.player.gold;
    const built = FB.build(s, pid, 0, id), spent = gold - s.player.gold;
    s.date.year = 1191;
    const retained = FB.buildingBonusIn(s, pid, 'tax');
    const saved = FB.save.serialize();
    const before = JSON.stringify(s), data = JSON.stringify(FBDATA), rng = FB.getRngState(), uid = FB.getUidCounter();
    const bad = JSON.parse(JSON.stringify(mod));
    bad.buildings[id].applicability = { yearMin:1191, yearMax:1170 };
    const errors = FB.mods.validate(bad);
    return { rows:rows, built:built, cost:cost, spent:spent, retained:retained, saved:saved,
      invalid:errors.length > 0, pure:before === JSON.stringify(s) && data === JSON.stringify(FBDATA) &&
        rng === FB.getRngState() && uid === FB.getUidCounter() };
  }, example);
  expect(r.rows).toEqual([[false,false],[true,false],[true,false],[true,true],[true,true],[true,false],[true,false]]);
  expect(r).toMatchObject({ built:true, retained:1, invalid:true, pure:true });
  expect(r.spent).toBe(r.cost);
  await restoreBookmark(page, r.saved);
  const mismatch = await page.evaluate(function (args) {
    const saved = JSON.parse(args.saved), changed = JSON.parse(JSON.stringify(args.mod));
    const retained = FB.state.buildings.york.some(function (b) { return b.id === 'windowed_windmill'; });
    changed.buildings.windowed_windmill.applicability.yearMax = 1189;
    FB.mods.apply(changed);
    const before = JSON.stringify(FB.state), rng = FB.getRngState(), uid = FB.getUidCounter();
    let rejected = false;
    try { FB.save.restore(saved); } catch (error) { rejected = /different mod/.test(error.message); }
    return { retained:retained, mismatch:FB.save.otherWorld(saved), rejected:rejected,
      pure:before === JSON.stringify(FB.state) && rng === FB.getRngState() && uid === FB.getUidCounter() };
  }, { saved:r.saved, mod:example });
  expect(mismatch).toEqual({ retained:true, mismatch:true, rejected:true, pure:true });
});

for (const bookmark of ['867', '1066']) {
  test(bookmark + ' baseline starting knowledge and saved completion ids remain unchanged', async function ({ page }) {
    await page.evaluate(function (id) {
      FBDATA.bookmarks[id].revision = 'baseline';
      FB.startProgression.noteTier(1);
    }, bookmark);
    const fullStart = page.locator('#btn-choose-beginning');
    if (await fullStart.isVisible()) await fullStart.click();
    else await page.getByRole('button', { name:'New Game', exact:true }).click();
    await page.locator('#btn-bm-seed').click();
    await page.locator('#ng-seed').fill('WINDREVIEW-' + bookmark + '-farmer-london-f-Ada');
    await page.locator('#ng-seed').press('Enter');
    await expect(page.locator('#chargen:not(.hidden)')).toBeVisible();
    await page.getByRole('button', { name:'Begin Your Story', exact:true }).click();
    await page.getByRole('button', { name:'Begin', exact:true }).click();
    const r = await page.evaluate(function () {
      FB.game.setPaused(true);
      const current = JSON.parse(JSON.stringify(FB.state)); current.realmTech = {};
      FB.seedRealmTechnologies(current, true);
      const prior = JSON.parse(JSON.stringify(FB.state)); prior.realmTech = {};
      const effective = FBDATA.tech.windmill;
      try {
        FBDATA.tech.windmill = window.techCorrections_wind_before.windmill;
        FB.seedRealmTechnologies(prior, true);
      } finally { FBDATA.tech.windmill = effective; }
      const mismatches = Object.keys(current.realmTech).filter(function (rid) {
        return ['completed', 'exposed'].some(function (key) {
          return JSON.stringify(current.realmTech[rid][key].slice().sort()) !==
            JSON.stringify(prior.realmTech[rid][key].slice().sort());
        });
      });
      return { mismatches:mismatches, realms:Object.keys(current.realmTech).length,
        revision:FB.campaignBookmark(FB.state).revision || 'baseline',
        knowledge:JSON.stringify(FB.state.realmTech), save:FB.save.serialize() };
    });
    expect(r.mismatches).toEqual([]); expect(r.realms).toBeGreaterThan(10);
    expect(r.revision).toBe('baseline');
    await restoreBookmark(page, r.save);
    expect(await page.evaluate(function () { return JSON.stringify(FB.state.realmTech); })).toBe(r.knowledge);
  });
}
