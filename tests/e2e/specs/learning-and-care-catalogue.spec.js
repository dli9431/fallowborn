'use strict';
const path = require('path');
const fs = require('fs');
const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { startDeterministicGame } = require('../support/game/start');
const { beginBookmark, restoreBookmark } = require('../support/game/bookmark-acceptance');
const { dependsOnRuntime } = require('../support/runtime-dependencies');
const baseline = require('../fixtures/learning-care-baseline.json');
const importPath = path.resolve(__dirname, '../fixtures/authoring/learning-and-care.json');

dependsOnRuntime(__filename, [
  'data/technology_learning.js', 'data/buildings_learning_care.js',
  'data/technology.js', 'data/map_data.js', 'data/markets.js', 'data/bookmarks.js',
  'data/eras.js', 'js/technology.js', 'js/actions.js', 'js/fortifications.js',
  'js/world.js', 'js/lordships.js', 'js/treasury.js', 'js/population.js', 'js/institutions.js',
  'js/mods.js', 'js/save.js', 'js/main.js', 'js/ui_modals.js', 'js/ui_misc.js'
]);

test.beforeEach(async function ({ page }, info) { await openGame(page, info); });

async function prepareLord(page, imported) {
  if (imported) {
    await page.evaluate(function () { FB.ui.showMods(); });
    await page.locator('#modfile').setInputFiles(importPath);
    await page.locator('#mod-apply').click();
    await page.waitForFunction(function () {
      return FB.game.bootReady && !!FBDATA.buildings.review_manuscript_room;
    });
  }
  await startDeterministicGame(page);
  await page.evaluate(function () {
    const s = FB.state, pid = s.player.provinceId;
    s.player.tier = 4; s.player.provs = [pid]; s.player.gold = 10000;
    s.owner[pid] = s.holder[pid] = 'player'; s.dev[pid] = 8;
    FB.foundPlayerRealm(s);
    FB.rememberSettlementSites(s, pid);
    for (let slot = 1; slot < FB.settlementVisibleCount(s, pid); slot++) {
      if (!FB.assignSettlementLordship(s, pid, slot, s.player.charId)) throw new Error('Site grant failed');
    }
    FB.invalidateSettlementLordships(s);
    s.buildings[pid] = [];
    FB.invalidateBuildingIndex(s, pid); FB.invalidateFortIndex();
  });
}

test('catalogue corrections retain costs, adoption, effects and stable knowledge identities', async function ({ page }) {
  const r = await page.evaluate(function (expected) {
    const retained = {};
    Object.keys(expected).forEach(function (id) {
      const t = FBDATA.tech[id];
      retained[id] = {cost:t.cost,history:t.history,fx:t.fx};
    });
    return { retained:retained, errors:FB.validateTechnologyData(true),
      buildings:FB.validateBuildingData(FBDATA.buildings,true),
      techCount:Object.keys(FBDATA.tech).length, buildingCount:Object.keys(FBDATA.buildings).length,
      scriptoria:FBDATA.tech.scriptoria.unlocks, paper:FBDATA.tech.paper_scholarship.unlocks,
      reqs:['universities','legal_studies','scholastic_method','canon_law_collections'].map(function (id) {
        return FBDATA.tech[id].req;
      }), capabilities:FBDATA.tech.universities.capabilities,
      library:FBDATA.buildings.library.requiresTech,
      buildingData:{library:FBDATA.buildings.library,hospital:FBDATA.buildings.hospital,
        hospice:FBDATA.buildings.hospice,cathedral:FBDATA.buildings.cathedral,
        temple:FBDATA.buildings.temple,university:FBDATA.buildings.university},
      reviews:['manuscript_library_access','charitable_guesthouse','building_hospital','building_cathedral'].map(function (id) {
        return FBDATA.techImpactReviews.features[id];
      }) };
  }, baseline.tech);
  expect(r.retained).toEqual(baseline.tech);
  expect(r.errors).toEqual([]); expect(r.buildings).toEqual([]);
  expect(r.techCount).toBe(187); expect(r.buildingCount).toBe(20);
  expect(r.scriptoria).toEqual(['rule:scriptoria','building:library']);
  expect(r.paper).toEqual([]); expect(r.library).toBe('scriptoria');
  expect(r.reqs).toEqual([
    ['scholarly_networks','scriptoria'], ['scholarly_networks','written_law'],
    ['scholarly_networks','translation_schools'], ['legal_studies','scriptoria']
  ]);
  expect(r.capabilities).toEqual(['parallel_research']);
  expect(r.buildingData).toMatchObject({
    library:{role:'scholarship',aiBuildOrder:15,cost:80,upkeep:1,devMin:4,research:1},
    hospital:{role:'care',aiBuildOrder:7,cost:90,upkeep:2,devMin:5,maxCounty:1,piety:1,pop:5,
      populationCrisisProtection:0.10,populationFamineProtection:0.05,requiresTech:'hospitals',
      constructionGroup:{id:'care_foundation',maxCounty:1}},
    hospice:{role:'care',aiBuildOrder:22,cost:55,upkeep:1,devMin:2,maxCounty:1,populationCrisisProtection:0.03,
      dev:0,pop:0,tax:0,research:0,piety:0,levy:0,retinue:0,archers:0,
      constructionGroup:{id:'care_foundation',maxCounty:1}},
    cathedral:{cost:240,upkeep:3,devMin:7,maxCounty:1,piety:4,prestige:15,pop:10,dev:1,
      populationCrisisProtection:0.15,communityFaithPressure:0.20,requiresTech:'ribbed_vaulting'},
    temple:{cost:70,upkeep:1,piety:2,pop:5,populationCrisisProtection:0.10,communityFaithPressure:0.12,requiresTech:'lime_mortar'},
    university:{cost:180,upkeep:3,devMin:7,maxDemesne:1,research:2,prestige:10,pop:5,migrationAttraction:2,requiresTech:'universities'}
  });
  expect(r.buildingData.hospice.requiresTech).toBeUndefined();
  expect(r.reviews.map(function (r) { return r.mode; })).toEqual(['soft','none','soft','hard']);
  expect(r.reviews[0].tech).toEqual(['scriptoria']);
  expect(r.reviews[2].tech).toEqual(['hospitals']);
  expect(r.reviews[3]).toMatchObject({tech:['ribbed_vaulting'],fallback:'temple'});
});

test('manuscript libraries are paid without paper and contribute national research once after delegation', async function ({ page }) {
  await prepareLord(page);
  const r = await page.evaluate(function () {
    const s = FB.state, pid = s.player.provinceId;
    const knowledge = FB.realmTechRecord(s);
    knowledge.completed = ['manuscript_codex'];
    const locked = FB.canBuildAt(s, pid, 1, 'library');
    knowledge.completed.push('scriptoria');
    FB.invalidateTechBonuses();
    const before = FB.techResearchRate(s), gold = s.player.gold;
    const cost = FB.buildCost(s, pid, 'library'), built = FB.build(s, pid, 1, 'library');
    const after = FB.techResearchRate(s);
    const c = FB.makeCharacter(s, {name:'Library Holder',born:s.date.year-30,
      station:3,culture:s.player.culture,religion:s.player.religion,traits:[]});
    const delegated = FB.assignSettlementLordship(s, pid, 1, c.id);
    const delegatedRate = FB.techResearchRate(s);
    const factor = 1 + FB.realmPolicyResearchFactor(s,FB.techRealmId(s));
    knowledge.completed.push('scholarly_networks','written_law','translation_schools');
    return {locked:locked,built:built,cost:cost,spent:gold-s.player.gold,
      delta:after-before,delegated:delegated,delegatedRate:delegatedRate,after:after,factor:factor,
      paper:FB.hasTech(s,'paper_scholarship'),
      advanced:['universities','legal_studies','scholastic_method'].map(function (id) {
        return FB.techPrerequisitesMet(s,id);
      })};
  });
  expect(r.locked).toBe(false); expect(r.built).toBe(true); expect(r.spent).toBe(r.cost);
  expect(r.paper).toBe(false); expect(r.delta).toBeCloseTo(r.factor,10);
  expect(r.delegated).toBe(true); expect(r.delegatedRate).toBe(r.after);
  expect(r.advanced).toEqual([true,true,true]);
});

test('authored completion and omission follow the corrected manuscript graph', async function ({ page }) {
  await startDeterministicGame(page);
  const r = await page.evaluate(function () {
    function seeded(omit) {
      const s = JSON.parse(JSON.stringify(FB.state));
      const rid = Object.keys(s.realms).filter(function (id) {
        return s.realms[id].alive && !s.realms[id].liege;
      })[0];
      s.realmTech = {};
      s.realms[rid].techSeed = {complete:['universities','scholastic_method','canon_law_collections'],omit:omit};
      FB.seedRealmTechnologies(s,true);
      return s.realmTech[rid].completed;
    }
    return {paperOmitted:seeded(['paper_making','paper_scholarship']),
      networkOmitted:seeded(['scholarly_networks']), lawOmitted:seeded(['written_law'])};
  });
  for (const id of ['scriptoria','scholarly_networks','universities','legal_studies','scholastic_method','canon_law_collections']) {
    expect(r.paperOmitted).toContain(id);
  }
  expect(r.paperOmitted).not.toContain('paper_making');
  expect(r.paperOmitted).not.toContain('paper_scholarship');
  for (const id of ['universities','legal_studies','scholastic_method','canon_law_collections']) {
    expect(r.networkOmitted).not.toContain(id);
  }
  expect(r.lawOmitted).not.toContain('legal_studies');
  expect(r.lawOmitted).not.toContain('canon_law_collections');
});

for (const bookmark of ['867','1066']) {
  test('fresh '+bookmark+' knowledge retains its baseline under this graph correction', async function ({ page }, info) {
    await beginBookmark(page,info,bookmark,'farmer');
    const r = await page.evaluate(function () {
      const prior = {
        universities:['scholarly_networks','paper_scholarship'],
        legal_studies:['universities','written_law'],
        scholastic_method:['universities','translation_schools']
      };
      const current = {}, declarations = JSON.stringify(FBDATA.bookmarks);
      const corrected = JSON.parse(JSON.stringify(FB.state)); corrected.realmTech = {};
      FB.seedRealmTechnologies(corrected,true);
      const old = JSON.parse(JSON.stringify(FB.state)); old.realmTech = {};
      try {
        Object.keys(prior).forEach(function (id) {
          current[id] = FBDATA.tech[id].req; FBDATA.tech[id].req = prior[id];
        });
        FB.seedRealmTechnologies(old,true);
      } finally {
        Object.keys(current).forEach(function (id) { FBDATA.tech[id].req = current[id]; });
      }
      function knowledge(state) {
        const out = {};
        Object.keys(state.realmTech).sort().forEach(function (id) {
          const rec = state.realmTech[id];
          out[id] = {completed:rec.completed.slice().sort(),exposed:rec.exposed.slice().sort()};
        });
        return out;
      }
      return {old:knowledge(old),corrected:knowledge(corrected),
        declarations:declarations===JSON.stringify(FBDATA.bookmarks)};
    });
    expect(Object.keys(r.old).length).toBeGreaterThan(10);
    expect(r.corrected).toEqual(r.old); expect(r.declarations).toBe(true);
  });
}

test('a guesthouse pays its real quote with no discovery, development or reward grant', async function ({ page }) {
  await prepareLord(page);
  const r = await page.evaluate(function () {
    const s = FB.state, pid = s.player.provinceId;
    FB.realmTechRecord(s).completed = []; FB.invalidateTechBonuses();
    s.dev[pid] = 1;
    const lowDev = FB.canBuildAt(s,pid,0,'hospice');
    s.dev[pid] = 2;
    const eligible = FB.canBuildAt(s,pid,0,'hospice'), cost = FB.buildCost(s,pid,'hospice');
    s.player.gold = cost-1;
    const poor = JSON.stringify(s), poorRng = FB.getRngState(), poorUid = FB.getUidCounter();
    const rejected = FB.build(s,pid,0,'hospice');
    const pure = poor===JSON.stringify(s) && poorRng===FB.getRngState() && poorUid===FB.getUidCounter();
    s.player.gold = 10000;
    const gold = s.player.gold, prestige = s.player.prestige, piety = s.player.piety;
    const opinion = JSON.stringify(s.popularSupport), dev = s.dev[pid];
    const built = FB.build(s,pid,0,'hospice');
    const repeatedGold = s.player.gold, repeat = FB.build(s,pid,0,'hospice');
    return {lowDev:lowDev,eligible:eligible,rejected:rejected,pure:pure,built:built,cost:cost,
      spent:gold-s.player.gold,repeat:repeat,repeatedGold:repeatedGold===s.player.gold,
      noAward:s.player.prestige===prestige && s.player.piety===piety &&
        JSON.stringify(s.popularSupport)===opinion && s.dev[pid]===dev,
      protection:FB.buildingBonusIn(s,pid,'populationCrisisProtection'),
      upkeep:FB.buildingBonus(s,'upkeep'),research:FB.buildingBonusIn(s,pid,'research'),
      hospital:FB.canBuildAt(s,pid,1,'hospital')};
  });
  expect(r).toMatchObject({lowDev:false,eligible:true,rejected:false,pure:true,built:true,
    repeat:false,repeatedGold:true,noAward:true,protection:0.03,upkeep:1,research:0,hospital:false});
  expect(r.spent).toBe(r.cost);
});

test('hospital and guesthouse ruins share capacity, old excess repairs and saves retain facts', async function ({ page }) {
  await prepareLord(page);
  const before = await page.evaluate(function () {
    const s = FB.state, pid = s.player.provinceId;
    const rec = FB.realmTechRecord(s);
    rec.completed = ['scriptoria','paper_scholarship','universities'];
    FB.invalidateTechBonuses();
    s.buildings[pid] = [{s:0,id:'hospice',ruined:true}]; FB.invalidateBuildingIndex(s,pid);
    rec.completed.push('hospitals');
    const blocked = FB.canBuildAt(s,pid,1,'hospital');
    const gold = s.player.gold, attempted = FB.build(s,pid,1,'hospital');
    const untouched = gold===s.player.gold;
    // A retained excess of two distinct assets remains legal to own and repair.
    s.buildings[pid].push({s:1,id:'hospital'}); FB.invalidateBuildingIndex(s,pid);
    const quote = FB.repairBuildingStatus(s,pid,0,'hospice');
    rec.completed = rec.completed.filter(function (id) { return id!=='hospitals'; });
    const repaired = FB.repairBuilding(s,pid,0,'hospice',quote.cost);
    const blockedAgain = FB.canBuildAt(s,pid,2,'hospice');
    return {blocked:blocked,attempted:attempted,untouched:untouched,repaired:repaired,
      paid:gold-s.player.gold,cost:quote.cost,blockedAgain:blockedAgain,
      protection:FB.buildingBonusIn(s,pid,'populationCrisisProtection'),
      records:JSON.stringify(s.buildings[pid]),completed:rec.completed.slice().sort(),save:FB.save.serialize()};
  });
  expect(before).toMatchObject({blocked:false,attempted:false,untouched:true,repaired:true,blockedAgain:false});
  expect(before.paid).toBe(before.cost); expect(before.protection).toBeCloseTo(0.13,10);
  await restoreBookmark(page,before.save);
  const after = await page.evaluate(function () {
    const s = FB.state, pid = s.player.provinceId;
    return {records:JSON.stringify(s.buildings[pid]),completed:FB.realmTechRecord(s).completed.slice().sort(),
      blocked:FB.canBuildAt(s,pid,2,'hospice'),capacity:FB.buildingConstructionGroupStatus(s,pid,'hospice').count};
  });
  expect(after).toEqual({records:before.records,completed:before.completed,blocked:false,capacity:2});
  const removed = await page.evaluate(function () {
    const s = FB.state, pid = s.player.provinceId;
    FB.demolishBuilding(s,pid,0,'hospice');
    const stillFull = FB.canBuildAt(s,pid,0,'hospice');
    FB.demolishBuilding(s,pid,1,'hospital');
    return {stillFull:stillFull,ready:FB.canBuildAt(s,pid,0,'hospice'),records:s.buildings[pid]};
  });
  expect(removed).toEqual({stillFull:false,ready:true,records:[]});
});

test('player automation respects care ruins and pays after deliberate removal', async function ({ page }) {
  await prepareLord(page);
  const r = await page.evaluate(function () {
    const s = FB.state, pid = s.player.provinceId;
    Object.keys(FBDATA.buildings).forEach(function (id) {
      if (id!=='hospice') delete FBDATA.buildings[id].aiBuildOrder;
    });
    s.buildings[pid] = [{s:0,id:'hospital',ruined:true}]; FB.invalidateBuildingIndex(s,pid);
    const before = s.player.gold;
    FB.autoBuild(s);
    const blocked = s.player.gold===before && s.buildings[pid].length===1;
    FB.demolishBuilding(s,pid,0,'hospital');
    const cost = FB.buildCost(s,pid,'hospice'), gold = s.player.gold;
    const built = FB.autoBuild(s);
    return {blocked:blocked,built:built,cost:cost,spent:gold-s.player.gold,
      count:FB.buildingCountIn(s,pid,'hospice',true)};
  });
  expect(r).toMatchObject({blocked:true,built:true,count:1}); expect(r.spent).toBe(r.cost);
});

test('private barons pay for and maintain a guesthouse without charging the county holder twice', async function ({ page }) {
  await prepareLord(page);
  const r = await page.evaluate(function () {
    const s = FB.state, pid = s.player.provinceId, me = s.chars[s.player.charId];
    const c = FB.makeCharacter(s,{name:'Guesthouse Holder',born:s.date.year-30,station:3,
      culture:me.culture,religion:me.religion,traits:[]});
    if (!FB.assignSettlementLordship(s,pid,1,c.id)) throw new Error('Private site grant failed');
    FB.settleBaronyAccounts(s,Math.floor(s.turn/90)+1);
    s.settlementLordships.accounts[c.id].gold = 1000;
    const playerGold = s.player.gold, playerUpkeep = FB.settlementActorFiscal(s,'player').upkeep;
    const cost = FB.buildCost(s,pid,'hospice',FB.settlementCountyHolder(s,pid));
    const built = FB.buildBarony(s,c.id,pid,1,'hospice');
    return {built:built,spent:1000-FB.baronyAccount(s,c.id).gold,cost:cost,
      playerUntouched:s.player.gold===playerGold,
      privateUpkeep:FB.settlementActorFiscal(s,{kind:'character',id:c.id}).upkeep,
      playerUpkeep:FB.settlementActorFiscal(s,'player').upkeep-playerUpkeep,
      blocked:FB.canBuildAt(s,pid,0,'hospice')};
  });
  expect(r).toMatchObject({built:true,playerUntouched:true,privateUpkeep:1,playerUpkeep:0,blocked:false});
  expect(r.spent).toBe(r.cost);
});

test('annual AI pays from public treasury and cannot stack a hospital onto its guesthouse', async function ({ page }) {
  await prepareLord(page);
  const r = await page.evaluate(function () {
    const s = FB.state;
    // Isolate the two actual catalogue alternatives, retaining canonical AI gates and payment.
    Object.keys(FBDATA.buildings).forEach(function (id) {
      if (id!=='hospice' && id!=='hospital') delete FBDATA.buildings[id].aiBuildOrder;
    });
    const rid = Object.keys(s.realms).filter(function (id) {
      return id!=='player' && s.realms[id].alive && !s.realms[id].liege && FB.realmHeldCounties(s,id).length;
    })[0];
    const counties = FB.realmHeldCounties(s,rid), pid = counties[0];
    counties.forEach(function (id) {
      s.dev[id] = 2; s.buildings[id] = id===pid ? [] : [{s:0,id:'hospice',ruined:true}];
      FB.invalidateBuildingIndex(s,id);
    });
    s.armies = []; s.greatHolyWar = null; FB.treasuryInitialize(s);
    Object.keys(s.realms).forEach(function (id) {
      if (s.realms[id].treasury) { s.realms[id].treasury.gold=0; s.realms[id].treasury.militaryAccrued=0; }
    });
    const account = s.realms[rid].treasury;
    FB.aiBuildingsYear(s);
    const poor = s.buildings[pid].length===0;
    account.gold = 100000;
    const gold = account.gold, upkeep = FB.treasurySnapshot(s).rows[rid].upkeep;
    const cost = FB.buildCost(s,pid,'hospice',rid);
    FB.aiBuildingsYear(s);
    const spent = gold-account.gold, records = JSON.stringify(s.buildings[pid]);
    const addedUpkeep = FB.treasurySnapshot(s).rows[rid].upkeep-upkeep;
    s.dev[pid] = 8; FB.realmTechRecord(s,rid).completed.push('hospitals');
    const blocked = FB.aiCanBuildAt(s,rid,pid,0,'hospital');
    const afterGold = account.gold;
    FB.aiBuildingsYear(s);
    return {poor:poor,spent:spent,cost:cost,addedUpkeep:addedUpkeep,blocked:blocked,
      built:s.buildings[pid].some(function (b) { return b.id==='hospice'; }),
      noSecondPurchase:afterGold===account.gold && records===JSON.stringify(s.buildings[pid])};
  });
  expect(r).toMatchObject({poor:true,built:true,addedUpkeep:1,blocked:false,noSecondPurchase:true});
  expect(r.spent).toBe(r.cost);
});

test('ordinary imported facilities differ in knowledge, payment, research and care capacity', async function ({ page }) {
  await prepareLord(page,true);
  const r = await page.evaluate(function () {
    const s = FB.state, pid = s.player.provinceId;
    const rec = FB.realmTechRecord(s); rec.completed = ['manuscript_codex']; FB.invalidateTechBonuses();
    const gold = s.player.gold, before = FB.techResearchRate(s);
    const cost = FB.buildCost(s,pid,'review_manuscript_room');
    const manuscript = FB.build(s,pid,0,'review_manuscript_room');
    const manuscriptSpent = gold-s.player.gold;
    const manuscriptResearch = FB.techResearchRate(s)-before;
    const paperWithoutKnowledge = FB.build(s,pid,1,'review_paper_collection');
    rec.completed.push('paper_scholarship'); FB.invalidateTechBonuses();
    const beforePaper = FB.techResearchRate(s);
    const paperGold = s.player.gold, paperCost = FB.buildCost(s,pid,'review_paper_collection');
    const paper = FB.build(s,pid,1,'review_paper_collection'), paperSpent = paperGold-s.player.gold;
    const research = manuscriptResearch + FB.techResearchRate(s)-beforePaper;
    const one = FB.build(s,pid,0,'review_two_place_guesthouse');
    const two = FB.build(s,pid,1,'review_two_place_guesthouse');
    const third = FB.build(s,pid,2,'review_two_place_guesthouse');
    const separate = FB.build(s,pid,0,'hospice');
    return {manuscript:manuscript,manuscriptSpent:manuscriptSpent,cost:cost,paperWithoutKnowledge:paperWithoutKnowledge,
      paper:paper,paperSpent:paperSpent,paperCost:paperCost,research:research,
      factor:1+FB.realmPolicyResearchFactor(s,FB.techRealmId(s)),
      one:one,two:two,third:third,separate:separate,save:FB.save.serialize(),sig:FB.mods.sig()};
  });
  expect(r).toMatchObject({manuscript:true,paperWithoutKnowledge:false,paper:true,one:true,two:true,third:false,separate:true});
  expect(r.manuscriptSpent).toBe(r.cost); expect(r.paperSpent).toBe(r.paperCost);
  expect(r.research).toBeCloseTo(2*r.factor,10);
  const records = await page.evaluate(function () { return JSON.stringify(FB.state.buildings[FB.state.player.provinceId]); });
  await restoreBookmark(page,r.save);
  expect(await page.evaluate(function () { return JSON.stringify(FB.state.buildings[FB.state.player.provinceId]); })).toBe(records);
  const changed = JSON.parse(fs.readFileSync(importPath,'utf8'));
  changed.buildings.review_manuscript_room.research = 0.75;
  await page.evaluate(function () { FB.ui.showMods(); });
  await page.locator('#modpaste').fill(JSON.stringify(changed));
  await page.locator('#mod-apply').click();
  await page.waitForFunction(function () { return FB.game.bootReady && FBDATA.buildings.review_manuscript_room.research===0.75; });
  const mismatch = await page.evaluate(function (saved) {
    const data = JSON.parse(saved), before = FB.state, rng = FB.getRngState(), uid = FB.getUidCounter();
    return {other:FB.save.otherWorld(data),loaded:FB.game.loadData(data),
      untouched:FB.state===before && rng===FB.getRngState() && uid===FB.getUidCounter()};
  },r.save);
  expect(mismatch).toEqual({other:true,loaded:false,untouched:true});
});

test('malformed imported learning and care definitions fail before changing state or catalogues', async function ({ page }) {
  await prepareLord(page);
  const r = await page.evaluate(function () {
    const s = FB.state, before = JSON.stringify(s), buildings = JSON.stringify(FBDATA.buildings);
    const tech = JSON.stringify(FBDATA.tech), sig = FB.mods.sig(), rng = FB.getRngState(), uid = FB.getUidCounter();
    const faults = [
      {buildings:{bad_room:{name:'Bad Room',role:'scholarship',cost:30,requiresTech:'missing_learning_gate'}}},
      {buildings:{bad_care:{name:'Bad Care',role:'care',cost:25,constructionGroup:{id:'care_foundation',maxCounty:2}}}},
      {tech:{legal_studies:Object.assign({},FBDATA.tech.legal_studies,{req:['canon_law_collections']})}}
    ].map(function (mod) { return FB.mods.validate(mod); });
    return {faults:faults,pure:before===JSON.stringify(s) && buildings===JSON.stringify(FBDATA.buildings) &&
      tech===JSON.stringify(FBDATA.tech) && sig===FB.mods.sig() && rng===FB.getRngState() && uid===FB.getUidCounter()};
  });
  expect(r.pure).toBe(true);
  r.faults.forEach(function (errors) { expect(errors.length).toBeGreaterThan(0); });
});
