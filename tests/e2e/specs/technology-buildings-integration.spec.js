'use strict';
const path = require('path');
const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { restoreBookmark } = require('../support/game/bookmark-acceptance');
const { releasedCatalogue } = require('../support/released-catalogue');
const { dependsOnRuntime } = require('../support/runtime-dependencies');
const released = require('../fixtures/released-catalogue.json');
const example = require('../fixtures/authoring/technology-buildings-composition.json');

dependsOnRuntime(__filename, [
  'index.html', 'data/map_data.js', 'data/technology.js', 'data/technology_early_refinements.js', 'data/technology_foundations.js',
  'data/technology_learning.js', 'data/buildings_learning_care.js',
  'data/technology_civic_military.js', 'data/buildings_civic_military.js',
  'data/technology_maritime.js', 'data/buildings_maritime.js', 'data/economy_maritime.js',
  'data/technology_wind.js', 'data/buildings_wind.js', 'data/economy.js',
  'data/bookmarks.js', 'data/bookmark_867_expansion.js', 'data/bookmark_1066_inhabited.js',
  'data/geographies.js', 'data/geography_expansion.js', 'data/cultures.js', 'data/eras.js',
  'data/settlements.js', 'data/settlements_real.js', 'data/starts.js',
  'data/political_institutions.js', 'js/technology.js', 'js/actions.js', 'js/world.js',
  'js/main.js', 'js/mods.js', 'js/save.js', 'js/save_v4.js', 'js/fortifications.js',
  'js/lordships.js', 'js/settlement.js', 'js/treasury.js', 'js/population.js',
  'js/institutions.js', 'js/governments.js', 'js/government_administration.js'
]);

async function startCampaign(page, bookmark, revision) {
  await page.evaluate(function (input) {
    if (input.revision) FBDATA.bookmarks[input.bookmark].revision = input.revision;
    FB.startProgression.noteTier(3);
  }, { bookmark:bookmark, revision:revision });
  const full = page.locator('#btn-choose-beginning');
  if (await full.isVisible()) await full.click();
  else await page.getByRole('button', { name:'New Game', exact:true }).click();
  await page.locator('#btn-bm-seed').click();
  const county = bookmark === 'composition_world' ? 'composition_port' : 'london';
  await page.locator('#ng-seed').fill('COMPOSITION-' + bookmark + '-farmer-' + county + '-f-Ada');
  await page.locator('#ng-seed').press('Enter');
  await expect(page.locator('#chargen:not(.hidden)')).toBeVisible();
  await page.getByRole('button', { name:'Begin Your Story', exact:true }).click();
  await page.getByRole('button', { name:'Begin', exact:true }).click();
  await page.evaluate(function () { FB.game.setPaused(true); });
}

async function importExample(page, info) {
  await openGame(page, info);
  await page.evaluate(function () { FB.ui.showMods(); });
  await page.locator('#modfile').setInputFiles(path.resolve(__dirname,
    '../fixtures/authoring/technology-buildings-composition.json'));
  await Promise.all([page.waitForEvent('domcontentloaded'), page.locator('#mod-apply').click()]);
  await page.waitForFunction(function () {
    return window.FB && FB.game && FB.game.bootReady && !!FBDATA.bookmarks.composition_world;
  });
}

function knowledgeSnapshot() {
  const records = JSON.parse(JSON.stringify(FB.state.realmTech));
  Object.keys(records).forEach(function (id) {
    records[id].completed.sort(); records[id].exposed.sort();
  });
  return records;
}

test.beforeEach(async function ({ page }) {
  // Observe the real base tables at their first correction, through the shipped
  // index. No game source is executed in Node or registered by this test.
  await page.addInitScript(function () {
    window.FBDATA = window.FBDATA || {};
    Object.defineProperty(window.FBDATA, 'techCorrections_foundations', {
      configurable:true,
      set:function (value) {
        window.__compositionBase = JSON.parse(JSON.stringify({
          tech:this.tech, buildings:this.buildings, caps:this.techCaps,
          capabilities:this.capabilities, fortLevels:this.fortLevels
        }));
        Object.defineProperty(this, 'techCorrections_foundations', {
          configurable:true, enumerable:true, writable:true, value:value
        });
      }
    });
  });
});

test('all supplements compose once with stable effects, grants, budgets and released world fixtures', async function ({ page }, info) {
  await openGame(page, info);
  const r = await page.evaluate(function () {
    const base = window.__compositionBase;
    const techMaps = ['foundations','learning','civic_military','maritime','wind'];
    const buildingMaps = ['learning_care','civic_military','maritime','wind'];
    function owners(prefix, maps, table) {
      const seen = {}, duplicates = [], stale = [], counts = [];
      maps.forEach(function (suffix) {
        const records = FBDATA[prefix + suffix]; counts.push(Object.keys(records).length);
        Object.keys(records).forEach(function (id) {
          if (seen[id]) duplicates.push(id);
          seen[id] = suffix;
          if (Object.keys(records[id]).some(function (key) {
            return JSON.stringify(records[id][key]) !== JSON.stringify(table[id][key]);
          })) stale.push(id);
        });
      });
      return { duplicates:duplicates, stale:stale, counts:counts };
    }
    const scalarChanges = Object.keys(base.tech).filter(function (id) {
      return ['domain','cost','fx','capabilities'].some(function (key) {
        return JSON.stringify(base.tech[id][key]) !== JSON.stringify(FBDATA.tech[id][key]);
      }) || JSON.stringify(base.tech[id].history.adoption) !== JSON.stringify(FBDATA.tech[id].history.adoption);
    });
    const buildingChanges = Object.keys(base.buildings).filter(function (id) {
      return Object.keys(base.buildings[id]).some(function (key) {
        return (typeof base.buildings[id][key] === 'number' || typeof base.buildings[id][key] === 'boolean' || key === 'role') &&
          JSON.stringify(base.buildings[id][key]) !== JSON.stringify(FBDATA.buildings[id][key]);
      });
    });
    const heldTech = ['aqueduct_maintenance','qanat_construction','masonry_circuits','stockfish_curing',
      'vertical_axis_windmill','pastoral_waterworks','tuna_trapping','cotton_cultivation',
      'sugar_processing','manuscript_scholarship','galley_yard_practice','horizontal_watermill',
      'bog_iron','seasonal_pasture_management','motte_and_bailey'];
    const heldBuildings = ['aqueduct','qanat_waterworks','public_bath','urban_cisterns','paper_workshop',
      'bloomery_smithy','horizontal_mill','boathouse','fish_drying_station','shieling','fairground',
      'relay_station','pasture_well_network','felt_yard','timber_streetworks','tonnara',
      'cotton_preparation_yard','sugar_workshop','mint_workshop','funduq','notarial_office',
      'manuscript_library','cathedral_school','galley_yard','episcopal_complex','congregational_mosque',
      'monastic_house','timber_church','madrasa','communal_hall','assembly_booths','tower_house',
      'earl_hall','consular_hall','turf_farmstead','estate_storehouse','timber_strongpoint','urban_circuit','ribat'];
    return {
      techOwners:owners('techCorrections_', techMaps, FBDATA.tech),
      buildingOwners:owners('buildingCorrections_', buildingMaps, FBDATA.buildings),
      techIds:Object.keys(FBDATA.tech).sort(), baseIds:Object.keys(base.tech).sort(),
      addedBuildings:Object.keys(FBDATA.buildings).filter(function (id) { return !base.buildings[id]; }),
      counts:[Object.keys(FBDATA.tech).length,Object.keys(FBDATA.buildings).length],
      scalarChanges:scalarChanges, buildingChanges:buildingChanges,
      caps:FBDATA.techCaps, baseCaps:base.caps, grants:FBDATA.capabilities, baseGrants:base.capabilities,
      fortLevels:FBDATA.fortLevels, baseFortLevels:base.fortLevels,
      unexpected:heldTech.filter(function (id) { return !!FBDATA.tech[id]; })
        .concat(heldBuildings.filter(function (id) { return !!FBDATA.buildings[id]; })),
      errors:FB.validateTechnologyData(true).concat(FB.validateBuildingData(FBDATA.buildings,true)),
      sources:Array.from(document.scripts).map(function (s) { return s.getAttribute('src'); }).filter(Boolean),
      inferredWorlds:Object.keys(FBDATA.bookmarks).filter(function (id) {
        return FB.bookmarkRevisions(id).some(function (b) { return b.openingInfrastructure !== undefined; });
      })
    };
  });
  expect(r.techOwners).toEqual({ duplicates:[], stale:[], counts:[9,6,12,8,1] });
  expect(r.buildingOwners).toEqual({ duplicates:[], stale:[], counts:[3,3,1,1] });
  expect(r.counts).toEqual([189,20]); expect(r.techIds).toEqual(r.baseIds);
  expect(r.addedBuildings).toEqual(['hospice']);
  expect(r.scalarChanges).toEqual([]); expect(r.buildingChanges).toEqual([]);
  expect(r.caps).toEqual(r.baseCaps); expect(r.grants).toEqual(r.baseGrants);
  expect(r.fortLevels).toEqual(r.baseFortLevels);
  expect(r.unexpected).toEqual([]); expect(r.errors).toEqual([]); expect(r.inferredWorlds).toEqual([]);
  const supplements = ['data/technology_early_refinements.js','data/technology_foundations.js','data/technology_learning.js',
    'data/buildings_learning_care.js','data/technology_civic_military.js','data/buildings_civic_military.js',
    'data/technology_maritime.js','data/buildings_maritime.js','data/technology_wind.js','data/buildings_wind.js'];
  for (const source of supplements) {
    expect(r.sources.filter(function (s) { return s === source; })).toHaveLength(1);
    expect(r.sources.indexOf(source)).toBeGreaterThan(r.sources.indexOf('data/technology.js'));
    expect(r.sources.indexOf(source)).toBeLessThan(r.sources.indexOf('data/bookmarks.js'));
  }
  expect(r.sources.indexOf('data/economy_maritime.js')).toBe(r.sources.indexOf('data/economy.js') + 1);
  expect(r.sources.filter(function (s) { return s === 'data/economy_maritime.js'; })).toHaveLength(1);
  expect((await page.evaluate(releasedCatalogue,released.selection)).hashes).toEqual(released.hashes);
});

for (const bookmark of ['867','1066']) for (const revision of ['baseline',null]) {
  test(bookmark + ' ' + (revision || 'current') + ' composes fresh knowledge and retains saved projects without reseeding', async function ({ page }, info) {
    await openGame(page,info); await startCampaign(page,bookmark,revision);
    const r = await page.evaluate(function () {
      const currentTable = FBDATA.tech, s = FB.state;
      const declarations = JSON.stringify(FBDATA.bookmarks);
      function seeded() {
        const copy = JSON.parse(JSON.stringify(s)); copy.realmTech = {};
        FB.seedRealmTechnologies(copy,true);
        const out = {};
        Object.keys(copy.realmTech).sort().forEach(function (rid) {
          const rec = copy.realmTech[rid];
          out[rid] = { completed:rec.completed.slice().sort(), exposed:rec.exposed.slice().sort() };
        });
        return out;
      }
      const corrected = seeded(); let prior;
      try { FBDATA.tech = JSON.parse(JSON.stringify(window.__compositionBase.tech)); prior = seeded(); }
      finally { FBDATA.tech = currentTable; FB.invalidateTechBonuses(); }
      const rec = FB.realmTechRecord(s);
      // Deliberately dated saved knowledge and a partial project are campaign
      // facts, even when the current graph would seed a different fresh record.
      rec.completed = ['manuscript_codex']; rec.exposed = ['manuscript_codex','scriptoria'];
      rec.active = ['scriptoria']; rec.progress = { scriptoria:7 }; rec.reserve = 3;
      rec.historicalSeeded = 1; FB.invalidateTechBonuses();
      return { corrected:corrected, prior:prior, declarations:declarations === JSON.stringify(FBDATA.bookmarks),
        buildings:JSON.stringify(s.buildings),
        geography:s.start.geography, revision:s.start.revision, save:FB.save.serialize() };
    });
    expect(Object.keys(r.corrected).length).toBeGreaterThan(10);
    expect(r.corrected).toEqual(r.prior); expect(r.declarations).toBe(true);
    if (revision) expect(r.revision).toBe(revision);
    const knowledge = await page.evaluate(knowledgeSnapshot);
    await restoreBookmark(page,r.save);
    expect(await page.evaluate(knowledgeSnapshot)).toEqual(knowledge);
    expect(await page.evaluate(function () {
      return { buildings:JSON.stringify(FB.state.buildings),
        geography:FB.state.start.geography, revision:FB.state.start.revision };
    })).toEqual({ buildings:r.buildings, geography:r.geography, revision:r.revision });
  });
}

for (const revision of ['inherited','empty']) {
  test('ordinary composed import boots and restores the ' + revision + ' inventory policy', async function ({ page }, info) {
    await importExample(page,info); await startCampaign(page,'composition_world',revision);
    const r = await page.evaluate(function () {
      const s = FB.state, before = JSON.stringify(s), rng = FB.getRngState(), uid = FB.getUidCounter();
      const repeat = FB.initializeOpeningInfrastructure(s); FB.repairForts(s);
      return { repeat:repeat, pure:before === JSON.stringify(s) && rng === FB.getRngState() && uid === FB.getUidCounter(),
        marker:s.openingInfrastructureState, buildings:s.buildings,
        count:Object.values(s.buildings).reduce(function (n,rows) { return n+rows.length; },0),
        dev:s.dev.composition_port, save:FB.save.serialize() };
    });
    expect(r).toMatchObject({ repeat:false, pure:true, dev:8, count:revision === 'inherited' ? 5 : 0 });
    expect(r.marker).toEqual({ version:1, explicit:true, bookmarkId:'composition_world', revision:revision });
    if (revision === 'inherited') expect(r.buildings.composition_port).toEqual([
      { s:0,id:'library',devGranted:0 }, { s:1,id:'hospice',devGranted:0 },
      { s:2,id:'composition_reading_room',devGranted:0,ruined:true }
    ]);
    else expect(r.buildings).toEqual({});
    expect(JSON.parse(r.save).mods).toMatch(/^effective-1-[a-f0-9]{64}$/);
    const knowledge = await page.evaluate(knowledgeSnapshot);
    await restoreBookmark(page,r.save);
    expect(await page.evaluate(knowledgeSnapshot)).toEqual(knowledge);
    expect(await page.evaluate(function () { return FB.state.buildings; })).toEqual(r.buildings);
    // A change to either policy is incompatible, under the same mod name.
    await page.evaluate(function (revision) {
      const mods = JSON.parse(localStorage.getItem('fb_mods')), mod = JSON.parse(mods[0]);
      const policy = mod.bookmarks.composition_world.revisions[revision].openingInfrastructure;
      if (revision === 'inherited') policy.placements[0].condition = 'ruined';
      else policy.placements.push({ countyId:'composition_port',siteId:'composition_hall',buildingId:'library',condition:'standing' });
      localStorage.setItem('fb_mods',JSON.stringify([JSON.stringify(mod)]));
    },revision);
    await openGame(page,info);
    expect(await page.evaluate(function (text) {
      const s = FB.state, world = FB.world, rng = FB.getRngState(), uid = FB.getUidCounter();
      return FB.save.otherWorld(JSON.parse(text)) && FB.game.loadData(JSON.parse(text)) === false &&
        s === FB.state && world === FB.world && rng === FB.getRngState() && uid === FB.getUidCounter();
    },r.save)).toBe(true);
    await page.evaluate(function () { FB.mods.clear(); });
    await page.waitForFunction(function () {
      return window.FB && FB.game && FB.game.bootReady && !FBDATA.bookmarks.composition_world;
    });
    expect(await page.evaluate(function (text) {
      const s = FB.state, world = FB.world, rng = FB.getRngState(), uid = FB.getUidCounter();
      return FB.game.loadData(JSON.parse(text)) === false && s === FB.state && world === FB.world &&
        rng === FB.getRngState() && uid === FB.getUidCounter();
    },r.save)).toBe(true);
  });
}

test('composed scopes, group occupancy, research and inherited repair share paid transactions', async function ({ page }, info) {
  await importExample(page,info); await startCampaign(page,'composition_world','inherited');
  const r = await page.evaluate(function () {
    const s = FB.state, pid = 'composition_port';
    s.player.tier = 4; s.player.provs = [pid]; s.player.gold = 10000; s.player.liege = null;
    s.owner[pid] = s.holder[pid] = 'player'; FB.foundPlayerRealm(s);
    FB.rememberSettlementSites(s,pid);
    for (let slot=1; slot<FB.settlementVisibleCount(s,pid); slot++) {
      if (!FB.assignSettlementLordship(s,pid,slot,s.player.charId)) throw new Error('Site grant failed');
    }
    FB.invalidateSettlementLordships(s);
    const rec = FB.realmTechRecord(s);
    rec.completed = ['manuscript_codex','scriptoria','water_power','windmill','hospitals'];
    FB.invalidateTechBonuses();
    const beforeResearch = FB.techResearchRate(s), factor = 1+FB.realmPolicyResearchFactor(s,FB.techRealmId(s));
    const gold = s.player.gold, dev = s.dev[pid];
    const blockedCare = FB.build(s,pid,0,'hospital');
    const beforeDate = FB.build(s,pid,0,'windmill');
    s.date.year = 1150;
    const groupFull = !FB.buildingConstructionGroupStatus(s,pid,'composition_paper_room').ok;
    const blockedGroup = FB.build(s,pid,2,'composition_paper_room');
    const noCharges = gold === s.player.gold;
    s.date.year = 1161;
    const outside = FB.buildingApplicabilityStatus(s,pid,'composition_reading_room').ready;
    const repair = FB.repairBuildingStatus(s,pid,2,'composition_reading_room');
    const repairGold = s.player.gold;
    const repaired = FB.repairBuilding(s,pid,2,'composition_reading_room',repair.cost);
    const repairedResearch = FB.techResearchRate(s), repairSpent = repairGold-s.player.gold;
    const removed = FB.demolishBuilding(s,pid,2,'composition_reading_room');
    s.date.year = 1150;
    const missingPaperGold = s.player.gold;
    const missingPaper = FB.build(s,pid,2,'composition_paper_room');
    const missingPaperFree = missingPaperGold === s.player.gold;
    rec.completed.push('paper_scholarship'); FB.invalidateTechBonuses();
    const price = FB.buildCost(s,pid,'composition_paper_room'), paperGold = s.player.gold;
    const paper = FB.build(s,pid,2,'composition_paper_room'), paperSpent = paperGold-s.player.gold;
    const newResearch = FB.techResearchRate(s);
    const windPrice = FB.buildCost(s,pid,'windmill'), windGold = s.player.gold;
    const wind = FB.build(s,pid,0,'windmill'), windSpent = windGold-s.player.gold;
    const staleGold = s.player.gold;
    const replacement = FB.build(s,pid,0,'composition_reading_room');
    const noReplacementCharge = staleGold === s.player.gold;
    return { blockedCare:blockedCare, beforeDate:beforeDate, blockedGroup:blockedGroup, groupFull:groupFull, noCharges:noCharges,
      outside:outside, repaired:repaired, repairReady:repair.ready, repairCost:repair.cost, repairSpent:repairSpent,
      researchDelta:repairedResearch-beforeResearch, factor:factor, removed:removed,
      missingPaper:missingPaper, missingPaperFree:missingPaperFree, paper:paper, price:price, paperSpent:paperSpent,
      // Paper Scholarship adds its own national 0.25; the replacement room changes 0.5 to 0.75.
      newResearchDelta:newResearch-repairedResearch, wind:wind, windPrice:windPrice, windSpent:windSpent,
      replacement:replacement, noReplacementCharge:noReplacementCharge,
      devBefore:dev, devAfter:s.dev[pid], buildings:s.buildings, save:FB.save.serialize() };
  });
  expect(r).toMatchObject({ blockedCare:false,beforeDate:false,blockedGroup:false,groupFull:true,noCharges:true,outside:false,
    repaired:true,repairReady:true,removed:true,missingPaper:false,missingPaperFree:true,paper:true,wind:true,
    replacement:false,noReplacementCharge:true });
  expect(r.repairSpent).toBeCloseTo(r.repairCost,8);
  expect(r.paperSpent).toBe(r.price); expect(r.windSpent).toBe(r.windPrice);
  expect(r.researchDelta).toBeCloseTo(0.5*r.factor,10);
  expect(r.newResearchDelta).toBeCloseTo(0.5*r.factor,10);
  expect(r.devAfter).toBe(r.devBefore+1);
  await restoreBookmark(page,r.save);
  expect(await page.evaluate(function () {
    FB.initializeOpeningInfrastructure(FB.state); FB.repairForts(FB.state);
    return FB.state.buildings;
  })).toEqual(r.buildings);
  expect(r.buildings.composition_port.some(function (row) { return row.id === 'composition_reading_room'; })).toBe(false);
});

test('annual AI keeps the full catalogue and refuses an unfunded care purchase including reserves', async function ({ page }, info) {
  await importExample(page,info);
  await page.evaluate(function () {
    FBDATA.bookmarks.composition_world.revision = 'empty';
    return new Promise(function (resolve,reject) {
      FB.activateBookmark('composition_world',null,function (error) {
        if (error) { reject(error); return; }
        FB.game.pending = { seed:'COMPOSITION-AI',bookmarkId:'composition_world' };
        if (FB.game.startObserve() === false) { reject(new Error('Observer start failed')); return; }
        FB.game.setPaused(true); resolve();
      });
    });
  });
  const r = await page.evaluate(function () {
    const s = FB.state, rid = 'composition_crown', pid = 'composition_port';
    Object.keys(s.realms).forEach(function (id) {
      if (s.realms[id].treasury) { s.realms[id].treasury.gold = 0; s.realms[id].treasury.militaryAccrued = 0; }
      s.dev[s.realms[id].capital] = 2;
    });
    FB.realmTechRecord(s,rid).completed = []; FB.invalidateTechBonuses();
    FB.invalidateRealmCache();
    s.armies = []; s.greatHolyWar = null;
    function people() {
      return JSON.stringify(Object.keys(s.population.counties).sort().map(function (id) {
        return [id,s.population.counties[id].count];
      }));
    }
    const priorities = JSON.stringify(FBDATA.buildings), population = people();
    const reserves = FB.treasuryConstructionReserves(s), seasons = FB.balanceFor(s,rid,'realmReserveSeasons');
    const cost = FB.buildCost(s,pid,'hospice',rid), account = s.realms[rid].treasury;
    account.gold = reserves[rid]+cost+seasons-1;
    const poorGold = account.gold; FB.aiBuildingsYear(s);
    const poor = account.gold === poorGold && !s.buildings[pid];
    account.gold += 2;
    const gold = account.gold, upkeep = FB.treasurySnapshot(s).rows[rid].upkeep;
    FB.aiBuildingsYear(s);
    const spent = gold-account.gold, addedUpkeep = FB.treasurySnapshot(s).rows[rid].upkeep-upkeep;
    const remaining = account.gold, records = JSON.stringify(s.buildings);
    FB.aiBuildingsYear(s);
    return { poor:poor, cost:cost, spent:spent, addedUpkeep:addedUpkeep,
      buildings:s.buildings[pid], protected:remaining+1e-8 >= reserves[rid]+seasons,
      noSecondPurchase:remaining === account.gold && records === JSON.stringify(s.buildings),
      sameCatalogue:priorities === JSON.stringify(FBDATA.buildings), samePeople:population === people() };
  });
  expect(r).toMatchObject({ poor:true,addedUpkeep:1,protected:true,noSecondPurchase:true,sameCatalogue:true,samePeople:true });
  expect(r.spent).toBe(r.cost); expect(r.buildings).toEqual([{ s:0,id:'hospice' }]);
});

test('combined invalid scopes, groups and inventory fail before publication', async function ({ page }, info) {
  await openGame(page,info);
  const results = await page.evaluate(function (source) {
    return ['scope','group','inventory','site'].map(function (kind) {
      const mod = JSON.parse(JSON.stringify(source));
      if (kind === 'scope') mod.buildings.composition_reading_room.applicability.countyIds = ['missing_composition_county'];
      if (kind === 'group') mod.buildings.composition_paper_room.constructionGroup.maxCounty = 2;
      const rows = mod.bookmarks.composition_world.revisions.inherited.openingInfrastructure.placements;
      if (kind === 'inventory') rows.push({ countyId:'composition_port',siteId:'composition_hall',buildingId:'hospital',condition:'standing' });
      if (kind === 'site') rows[0].siteId = 'missing_composition_site';
      const declarations = JSON.stringify([FBDATA.tech,FBDATA.buildings,FBDATA.bookmarks,FBDATA.geographies,FBDATA.settlementLayouts]);
      const s = FB.state, world = FB.world, rng = FB.getRngState(), uid = FB.getUidCounter(), storage = JSON.stringify(localStorage);
      const faults = FB.mods.validate(mod);
      return { rejected:faults.length > 0, pure:declarations === JSON.stringify([
        FBDATA.tech,FBDATA.buildings,FBDATA.bookmarks,FBDATA.geographies,FBDATA.settlementLayouts]) &&
        s === FB.state && world === FB.world && rng === FB.getRngState() && uid === FB.getUidCounter() &&
        storage === JSON.stringify(localStorage) };
    });
  },example);
  expect(results).toEqual(Array(4).fill({ rejected:true,pure:true }));
});
