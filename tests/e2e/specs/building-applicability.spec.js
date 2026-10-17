'use strict';
const path = require('path');
const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { startDeterministicGame } = require('../support/game/start');
const { dependsOnRuntime } = require('../support/runtime-dependencies');
const examples = require('../fixtures/authoring/building-applicability.json');

dependsOnRuntime(__filename, [
  'data/map_data.js', 'data/technology.js', 'data/eras.js', 'data/geographies.js',
  'data/geography_expansion.js', 'data/counties.js', 'data/cultures.js',
  'js/fortifications.js', 'js/actions.js', 'js/lordships.js', 'js/technology.js',
  'js/world.js', 'js/population.js', 'js/model.js', 'js/mods.js', 'js/treasury.js',
  'js/save.js', 'js/save_v4.js', 'js/ui_modals.js'
]);

async function importedStart(page, info) {
  await openGame(page, info);
  await page.evaluate(function () { FB.ui.showMods(); });
  await page.locator('#modfile').setInputFiles(path.resolve(__dirname,
    '../fixtures/authoring/building-applicability.json'));
  await Promise.all([page.waitForNavigation({ waitUntil:'domcontentloaded' }),
    page.locator('#mod-apply').click()]);
  await page.waitForFunction(function () {
    return window.FB && FB.game && FB.game.bootReady && FBDATA.buildings.dated_guest_court;
  });
  await startDeterministicGame(page);
  await page.evaluate(function () {
    const s = FB.state, p = s.player, home = p.provinceId;
    p.tier = 4; p.provs = [home, 'york', 'toledo']; p.gold = 10000; p.liege = null;
    for (const pid of p.provs) {
      s.owner[pid] = s.holder[pid] = 'player';
      s.dev[pid] = 8;
      s.buildings[pid] = [];
      FB.invalidateBuildingIndex(s, pid);
    }
    FB.foundPlayerRealm(s);
    s.realms.player.techTraditions = ['latin'];
    // The household stays in London; both building sites are elsewhere.
    s.population.counties.york.identity.culture = 'english';
    s.population.counties.toledo.identity.culture = 'andalusi';
    FB.invalidateSettlementLordships(s);
    FB.invalidateFortIndex();
  });
}

test('bundled and detached JSON validation reject malformed scopes without publication', async function ({ page }, info) {
  await openGame(page, info);
  const result = await page.evaluate(function (mod) {
    const before = JSON.stringify(FBDATA), state = JSON.stringify(FB.state);
    const rng = FB.getRngState(), uid = FB.getUidCounter();
    const valid = FB.mods.validate(mod);
    const cases = [null, [], { yearMin:'860' }, { yearMax:900.5 },
      { yearMin:901, yearMax:900 }, { unknown:true }, { eras:[] },
      { eras:['missing_era'] }, { countyIds:['missing_county'] },
      { countyIds:['york', 'york'] }, { cultures:['missing_culture'] },
      { cultures:['english', 'english'] }, { traditions:['missing_tradition'] },
      { traditions:['latin', 'latin'] }, { traditions:[] }, { countyIds:[3] }];
    const faults = cases.map(function (scope) {
      const candidate = JSON.parse(JSON.stringify(mod));
      candidate.buildings.dated_copy_room.applicability = scope;
      const errors = FB.mods.validate(candidate);
      const table = Object.assign({}, FBDATA.buildings, candidate.buildings);
      return { detached:errors.some(function (e) { return e.indexOf('applicability') >= 0; }),
        bundled:FB.validateBuildingData(table, true).some(function (e) { return e.indexOf('applicability') >= 0; }) };
    });
    const numeric = JSON.parse(JSON.stringify(mod));
    numeric.buildings.dated_copy_room.applicability.yearMax = Infinity;
    const nonfinite = FB.mods.validate(numeric).length > 0;
    return { valid:valid, faults:faults, nonfinite:nonfinite,
      pure:before === JSON.stringify(FBDATA) && state === JSON.stringify(FB.state) &&
        rng === FB.getRngState() && uid === FB.getUidCounter() };
  }, examples);
  expect(result.valid).toEqual([]);
  expect(result.faults).toEqual(Array(16).fill({ detached:true, bundled:true }));
  expect(result.nonfinite).toBe(true);
  expect(result.pure).toBe(true);
});

test('same-mod identities and physical additions resolve before installation', async function ({ page }, info) {
  await openGame(page, info);
  const result = await page.evaluate(function (mod) {
    const candidate = JSON.parse(JSON.stringify(mod));
    candidate.cultures = { copy_residents:JSON.parse(JSON.stringify(FBDATA.cultures.english)) };
    candidate.cultures.copy_residents.name = 'Copy residents';
    candidate.techTraditions = { copy_learning:{ name:'Copy learning', cultures:['copy_residents'], religions:[] } };
    candidate.geographies = { copy_geography:{ extends:'europe_regional', provinceAdditions:[
      { id:'copy_county', name:'Copy County', x:0.2, y:52, terrain:'farmland', wasteland:true }
    ] } };
    candidate.buildings.dated_copy_room.applicability = {
      cultures:['copy_residents'], traditions:['copy_learning'], countyIds:['copy_county']
    };
    const before = JSON.stringify(FBDATA), rng = FB.getRngState(), uid = FB.getUidCounter();
    return { errors:FB.mods.validate(candidate), pure:before === JSON.stringify(FBDATA) &&
      rng === FB.getRngState() && uid === FB.getUidCounter() };
  }, examples);
  expect(result).toEqual({ errors:[], pure:true });
});

test('two ordinary JSON examples use inclusive dates, AND dimensions and OR alternatives', async function ({ page }, info) {
  await importedStart(page, info);
  const result = await page.evaluate(function () {
    const s = FB.state, id = 'dated_copy_room', other = 'dated_guest_court';
    const yearRows = [859, 860, 900, 901].map(function (year) {
      s.date.year = year;
      return FB.buildingApplicabilityStatus(s, 'york', id).ready;
    });
    s.date.year = 890;
    s.realms.player.techTraditions = ['islamic'];
    const second = FB.buildingApplicabilityStatus(s, 'toledo', other).ready;
    const wrongTradition = FB.buildingApplicabilityStatus(s, 'york', id).code;
    s.realms.player.techTraditions = ['latin'];
    const wrongCounty = FB.buildingApplicabilityStatus(s, 'toledo', id).code;
    const oldEra = s.start.era;
    s.start.era = 'high_medieval';
    const wrongEra = FB.buildingApplicabilityStatus(s, 'york', id).code;
    s.start.era = oldEra;
    const identity = s.population.counties.york.identity;
    identity.culture = 'norse';
    const wrongCulture = FB.buildingApplicabilityStatus(s, 'york', id).code;
    identity.culture = 'english';
    const rec = s.population.counties.york, total = rec.count;
    rec.communities = [
      { culture:'english', religion:'catholic', count:Math.round(total * 0.4) },
      { culture:'norse', religion:'catholic', count:total - Math.round(total * 0.4) }
    ];
    const primaryWithoutMajority = FB.buildingApplicabilityStatus(s, 'york', id).ready;
    s.realms.player.techTraditions = ['persianate'];
    s.population.counties.toledo.identity.culture = 'arabic';
    const alternatives = FB.buildingApplicabilityStatus(s, 'toledo', other).ready;
    const betaGold = s.player.gold, betaCost = FB.buildCost(s, 'toledo', other);
    const secondBuilt = FB.build(s, 'toledo', 0, other);
    const secondCharged = betaGold - s.player.gold === betaCost;
    const missingState = FB.buildingApplicabilityStatus(null, 'york', id).ready;
    const unknownCounty = FB.buildingApplicabilityStatus(s, 'absent_county', id).ready;
    return { yearRows:yearRows, second:second, wrongTradition:wrongTradition,
      wrongCounty:wrongCounty, wrongEra:wrongEra, wrongCulture:wrongCulture,
      primaryWithoutMajority:primaryWithoutMajority, alternatives:alternatives,
      secondBuilt:secondBuilt, secondCharged:secondCharged,
      missingState:missingState, unknownCounty:unknownCounty,
      remote:s.player.provinceId !== 'york' && s.player.provinceId !== 'toledo',
      review:FBDATA.techImpactReviews.features.construction_applicability.mode };
  });
  expect(result).toEqual({ yearRows:[false, true, true, false], second:true,
    wrongTradition:'traditions', wrongCounty:'countyIds', wrongEra:'eras', wrongCulture:'cultures',
    primaryWithoutMajority:true, alternatives:true, secondBuilt:true, secondCharged:true,
    missingState:false, unknownCounty:false,
    remote:true, review:'none' });
});

test('pure reviews and stale live confirmations never charge an unavailable site', async function ({ page }, info) {
  await importedStart(page, info);
  const result = await page.evaluate(function () {
    const s = FB.state, id = 'dated_copy_room', pid = 'york';
    const context = FB.buildingContext(s, pid);
    const before = JSON.stringify(s), rng = FB.getRngState(), uid = FB.getUidCounter();
    const review = FB.buildingApplicabilityStatus(s, pid, id);
    const pure = before === JSON.stringify(s) && rng === FB.getRngState() && uid === FB.getUidCounter();
    const gold = s.player.gold;
    s.date.year = 901;
    const stale = FB.build(s, pid, 0, id);
    const cached = FB.canBuildAt(s, pid, 0, id, context);
    s.date.year = 900;
    s.population.counties.york.identity.culture = 'norse';
    const changedCulture = FB.build(s, pid, 0, id);
    s.population.counties.york.identity.culture = 'english';
    s.realms.player.techTraditions = ['nordic'];
    const changedPayer = FB.build(s, pid, 0, id);
    s.realms.player.techTraditions = ['latin'];
    const changedHolder = Object.keys(s.realms).find(function (rid) { return rid !== 'player' && s.realms[rid].alive; });
    s.holder[pid] = s.owner[pid] = changedHolder;
    FB.invalidateSettlementLordships(s);
    const transferred = FB.build(s, pid, 0, id);
    s.holder[pid] = s.owner[pid] = 'player';
    FB.invalidateSettlementLordships(s);
    const invalidSite = FB.build(s, pid, 1000, id);
    const noCharge = gold === s.player.gold && s.buildings[pid].length === 0;
    const cost = FB.buildCost(s, pid, id), built = FB.build(s, pid, 0, id);
    const repeated = FB.build(s, pid, 0, id);
    return { review:review.ready, pure:pure, stale:stale, cached:cached,
      changedCulture:changedCulture, changedPayer:changedPayer, transferred:transferred,
      invalidSite:invalidSite, noCharge:noCharge,
      built:built, repeated:repeated, cost:cost, spent:gold - s.player.gold,
      records:s.buildings[pid].length };
  });
  expect(result).toMatchObject({ review:true, pure:true, stale:false, cached:false,
    changedCulture:false, changedPayer:false, transferred:false, invalidSite:false,
    noCharge:true, built:true, repeated:false, records:1 });
  expect(result.spent).toBe(result.cost);
});

test('vassal rulers and NPC barons use the paying sovereign, with local residents independent', async function ({ page }, info) {
  await importedStart(page, info);
  const result = await page.evaluate(function () {
    const s = FB.state, pid = 'york', id = 'dated_copy_room', rid = 'york';
    s.realms[rid].alive = true; s.realms[rid].liege = 'player';
    s.realms[rid].techTraditions = ['nordic'];
    s.holder[pid] = rid; s.owner[pid] = 'player';
    FB.invalidateSettlementLordships(s);
    const sovereign = FB.techRealmId(s, rid);
    const ruler = FB.aiCanBuildAt(s, rid, pid, 0, id);
    const me = s.chars[s.player.charId];
    const baron = FB.makeCharacter(s, { name:'Copy Patron', station:3,
      born:s.date.year - 30, culture:me.culture, religion:me.religion, traits:[] });
    if (!FB.assignSettlementLordship(s, pid, 1, baron.id)) throw new Error('Grant failed');
    FB.settleBaronyAccounts(s, Math.floor(s.turn / 90) + 1);
    s.settlementLordships.accounts[baron.id].gold = 1000;
    const actor = { kind:'character', id:baron.id };
    const baronReady = FB.aiCanBuildAt(s, actor, pid, 1, id);
    s.date.year = 901;
    const denied = FB.buildBarony(s, baron.id, pid, 1, id);
    const preserved = FB.baronyAccount(s, baron.id).gold === 1000;
    s.date.year = 900;
    const cost = FB.buildCost(s, pid, id, rid);
    const paid = FB.buildBarony(s, baron.id, pid, 1, id);
    return { sovereign:sovereign, ruler:ruler, baronReady:baronReady, denied:denied,
      preserved:preserved, paid:paid, cost:cost, spent:1000 - FB.baronyAccount(s, baron.id).gold,
      playerGold:s.player.gold, local:FB.countyCulture(s, pid) };
  });
  expect(result).toMatchObject({ sovereign:'player', ruler:true, baronReady:true,
    denied:false, preserved:true, paid:true, playerGold:10000, local:'english' });
  expect(result.spent).toBe(result.cost);
});

test('a private player baron uses the target holder instead of an unrelated home sovereign', async function ({ page }, info) {
  await importedStart(page, info);
  const result = await page.evaluate(function () {
    const s = FB.state, pid = 'york', home = s.player.provinceId;
    s.player.tier = 3; s.player.provs = []; s.player.liege = null;
    s.realms.player.alive = false;
    s.realms.york.alive = true; s.realms.york.liege = null;
    s.realms.york.techTraditions = ['latin'];
    s.owner[pid] = s.holder[pid] = 'york';
    const homeRealm = Object.keys(s.realms).find(function (rid) {
      return rid !== 'player' && rid !== 'york' && s.realms[rid].alive && !s.realms[rid].liege;
    });
    s.owner[home] = s.holder[home] = homeRealm;
    s.realms[homeRealm].techTraditions = ['steppe'];
    if (!FB.assignSettlementLordship(s, pid, 1, s.player.charId)) throw new Error('Grant failed');
    FB.invalidateSettlementLordships(s);
    return { allowed:FB.canBuildAt(s, pid, 1, 'dated_copy_room'),
      foreign:FB.canBuildAt(s, pid, 0, 'dated_copy_room'),
      home:s.player.provinceId === home, targetTech:FB.techRealmId(s, 'york') };
  });
  expect(result).toEqual({ allowed:true, foreign:false, home:true, targetTech:'york' });
});

test('automation and annual realm purchases share applicability and exact payment', async function ({ page }, info) {
  await importedStart(page, info);
  const result = await page.evaluate(function () {
    const s = FB.state, pid = 'york', id = 'dated_copy_room';
    Object.keys(FBDATA.buildings).forEach(function (bid) {
      if (bid === id || FBDATA.buildings[bid].fort) return;
      FBDATA.buildings[bid] = Object.assign({}, FBDATA.buildings[bid], { cost:1e9 });
      delete FBDATA.buildings[bid].aiBuildOrder;
    });
    s.date.year = 901;
    const playerGold = s.player.gold, outside = FB.autoBuild(s);
    const noAutoCharge = s.player.gold === playerGold;
    s.date.year = 900;
    const playerCost = FB.buildCost(s, pid, id), inside = FB.autoBuild(s);
    const autoSpent = playerGold - s.player.gold;
    s.buildings[pid] = []; FB.invalidateBuildingIndex(s, pid);
    s.holder[pid] = 'york'; s.owner[pid] = 'player';
    s.realms.york.alive = true; s.realms.york.liege = 'player';
    FB.invalidateSettlementLordships(s);
    Object.keys(s.realms).forEach(function (rid) {
      if (s.realms[rid].treasury) {
        s.realms[rid].treasury.gold = rid === 'york' ? 1e6 : 0;
        s.realms[rid].treasury.militaryAccrued = 0;
      }
    });
    s.armies = []; s.greatHolyWar = null;
    const treasury = s.realms.york.treasury;
    const aiGold = treasury.gold;
    s.date.year = 901;
    FB.aiBuildingsYear(s);
    const aiOutside = s.buildings[pid].length === 0 && treasury.gold === aiGold;
    s.date.year = 900;
    const aiCost = FB.buildCost(s, pid, id, 'york');
    FB.aiBuildingsYear(s);
    return { outside:outside, noAutoCharge:noAutoCharge, inside:inside,
      autoSpent:autoSpent, playerCost:playerCost, aiOutside:aiOutside,
      records:s.buildings[pid].filter(function (b) { return b.id === id; }).length,
      aiSpent:aiGold - treasury.gold, aiCost:aiCost };
  });
  expect(result).toMatchObject({ outside:false, noAutoCharge:true, inside:true, aiOutside:true, records:1 });
  expect(result.autoSpent).toBe(result.playerCost);
  expect(result.aiSpent).toBe(result.aiCost);
});

test('annual fort planning skips an ineligible capital before selecting and funding another county', async function ({ page }, info) {
  await importedStart(page, info);
  const result = await page.evaluate(function () {
    const s = FB.state, rid = 'york', fortId = FB.fortificationBuildingId();
    const forts = {};
    forts[fortId] = Object.assign({}, FBDATA.buildings[fortId], {
      applicability:{ yearMin:860, yearMax:900, countyIds:['toledo'] }
    });
    FB.mods.apply({ buildings:forts });
    s.realms.york.alive = true; s.realms.york.liege = 'player'; s.realms.york.capital = 'york';
    for (const pid of ['york', 'toledo']) {
      s.holder[pid] = rid; s.owner[pid] = 'player';
      s.buildings[pid] = [];
      FB.invalidateBuildingIndex(s, pid);
    }
    FB.invalidateFortIndex(); FB.invalidateSettlementLordships(s);
    const knowledge = FB.realmTechRecord(s);
    knowledge.completed = ['ringworks'];
    s.wars = {}; s.armies = []; s.greatHolyWar = null;
    Object.keys(s.realms).forEach(function (id) { s.realms[id].fortProjectYear = s.date.year; });
    s.realms.york.fortWorks = 400;
    s.realms.york.fortWorksYear = s.date.year;
    s.realms.york.fortProjectYear = null;
    FB.fortAIYear(s);
    const capitalSkipped = !FB.fortAt(s, 'york');
    const project = FB.fortAt(s, 'toledo');
    const started = !!project && project.targetLevel === 1;
    const charged = 400 - s.realms.york.fortWorks;
    s.buildings.toledo = []; FB.invalidateBuildingIndex(s, 'toledo'); FB.invalidateFortIndex();
    s.date.year = 901;
    s.realms.york.fortWorksYear = s.date.year;
    s.realms.york.fortProjectYear = null;
    const works = s.realms.york.fortWorks;
    FB.fortAIYear(s);
    return { capitalSkipped:capitalSkipped, started:started, charged:charged,
      work:FBDATA.forts.levels[1].work,
      expired:!FB.fortAt(s, 'toledo') && s.realms.york.fortWorks === works };
  });
  expect(result).toMatchObject({ capitalSkipped:true, started:true, expired:true });
  expect(result.charged).toBe(result.work);
});

test('retained property, ruins and funded forts survive later ineligibility and matching restore', async function ({ page }, info) {
  await importedStart(page, info);
  const result = await page.evaluate(function () {
    let s = FB.state;
    const pid = 'york', id = 'dated_copy_room';
    s.wars = {}; s.armies = []; s.greatHolyWar = null;
    const built = FB.build(s, pid, 0, id);
    const fortId = FB.fortificationBuildingId();
    const forts = {};
    forts[fortId] = Object.assign({}, FBDATA.buildings[fortId], {
      applicability:{ yearMin:860, yearMax:900, countyIds:[pid] }
    });
    FB.mods.apply({ buildings:forts });
    const knowledge = FB.realmTechRecord(s);
    if (knowledge.completed.indexOf('ringworks') < 0) knowledge.completed.push('ringworks');
    const started = !!FB.startFortProject(s, pid, 1, 1);
    const due = FB.fortAt(s, pid).completeTurn;
    s.date.year = 901;
    s.population.counties.york.identity.culture = 'norse';
    s.realms.player.techTraditions = ['nordic'];
    const retained = FB.buildingBonusIn(s, pid, 'tax');
    const demolished = FB.demolishBuilding(s, pid, 0, id);
    const repair = FB.repairBuildingStatus(s, pid, 0, id);
    const repaired = FB.repairBuilding(s, pid, 0, id, repair.cost);
    const before = JSON.stringify(s.buildings[pid]);
    const saved = JSON.parse(FB.save.serialize());
    FB.save.restore(saved); s = FB.state;
    const sameAssets = before === JSON.stringify(s.buildings[pid]);
    s.turn = due;
    FB.fortificationDay(s);
    const completed = FB.fortAt(s, pid).level;
    const blockedNewFort = FB.fortProjectStatus(s, pid, 1, 2).reason;
    const fortDemolished = FB.demolishFort(s, pid, 1);
    const fortRepair = FB.repairBuildingStatus(s, pid, 1, fortId).ready;
    const noStatusSaved = !Object.prototype.hasOwnProperty.call(s, 'buildingApplicability');
    return { built:built, started:started, retained:retained, demolished:demolished,
      repair:repair.ready, repaired:repaired, sameAssets:sameAssets, completed:completed,
      blockedNewFort:blockedNewFort, fortDemolished:fortDemolished, fortRepair:fortRepair,
      noStatusSaved:noStatusSaved };
  });
  expect(result).toEqual({ built:true, started:true, retained:1, demolished:true,
    repair:true, repaired:true, sameAssets:true, completed:1, blockedNewFort:'applicability',
    fortDemolished:true, fortRepair:true, noStatusSaved:true });
});

test('changed applicability under the same mod name rejects a saved fingerprint without mutation', async function ({ page }, info) {
  await importedStart(page, info);
  const result = await page.evaluate(function (mod) {
    const saved = JSON.parse(FB.save.serialize());
    const matching = !FB.save.otherWorld(saved);
    const changed = JSON.parse(JSON.stringify(mod));
    changed.buildings.dated_copy_room.applicability.yearMax = 899;
    FB.mods.apply(changed);
    const before = JSON.stringify(FB.state), rng = FB.getRngState(), uid = FB.getUidCounter();
    let rejected = false;
    try { FB.save.restore(saved); } catch (error) { rejected = /different mod/.test(error.message); }
    return { matching:matching, mismatch:FB.save.otherWorld(saved), rejected:rejected,
      pure:before === JSON.stringify(FB.state) && rng === FB.getRngState() && uid === FB.getUidCounter() };
  }, examples);
  expect(result).toEqual({ matching:true, mismatch:true, rejected:true, pure:true });
});

test('missing context fails closed while omitted applicability retains legacy availability', async function ({ page }, info) {
  await importedStart(page, info);
  const result = await page.evaluate(function () {
    const s = FB.state, pid = 'york', id = 'dated_copy_room';
    const oldEra = s.start.era;
    s.start.era = 'missing_era';
    const era = FB.buildingApplicabilityStatus(s, pid, id).code;
    s.start.era = oldEra;
    s.population.counties.york.identity.culture = 'missing_culture';
    const culture = FB.buildingApplicabilityStatus(s, pid, id).code;
    s.population.counties.york.identity.culture = 'english';
    const payer = FB.buildingApplicabilityStatus(s, pid, id, 'missing_payer').code;
    const year = s.date.year;
    delete s.date.year;
    const date = FB.buildingApplicabilityStatus(s, pid, id).code;
    s.date.year = year;
    const scenery = Object.keys(FB.world.byId).find(function (key) { return FB.world.byId[key].wasteland; });
    const uninhabited = FB.buildingApplicabilityStatus(s, scenery, id).ready;
    const def = FBDATA.buildings[id];
    FBDATA.buildings[id] = Object.assign({}, def);
    delete FBDATA.buildings[id].applicability;
    s.date.year = 1200;
    const legacy = FB.canBuildAt(s, pid, 0, id);
    FBDATA.buildings[id].applicability = { eras:[oldEra] };
    const stamped = FB.buildingApplicabilityStatus(s, pid, id).ready;
    return { era:era, culture:culture, payer:payer, date:date,
      uninhabited:uninhabited, legacy:legacy, stamped:stamped };
  });
  expect(result).toEqual({ era:'context', culture:'context', payer:'context', date:'context',
    uninhabited:false, legacy:true, stamped:true });
});

test('Building Works exposes the localized first reason and a stale Raise spends nothing', async function ({ page }, info) {
  await importedStart(page, info);
  await page.evaluate(function () {
    FB.state.date.year = 859;
    FB.ui.showBuildings('york');
  });
  const card = page.locator('.settcard').filter({ hasText:'Dated Copy Room' });
  await expect(page.locator('#gm-body')).toContainText('Construction is available from 860.');
  await expect(page.locator('[data-bquick="dated_copy_room"]')).toBeDisabled();
  await page.evaluate(function () { FB.state.date.year = 860; FB.ui.showBuildings('york'); });
  const raise = page.locator('[data-bquick="dated_copy_room"]');
  await expect(raise).toBeEnabled();
  const before = await page.evaluate(function () {
    const gold = FB.state.player.gold;
    FB.state.date.year = 901;
    return gold;
  });
  await raise.click();
  await expect(page.locator('#gm-body')).toContainText('Construction was available through 900.');
  await expect(raise).toBeDisabled();
  expect(await page.evaluate(function () { return FB.state.player.gold; })).toBe(before);
  await expect(page.locator('#gm-title')).toContainText('York');
  // The reason remains visible with Details closed, without hover or focus.
  await expect(card).toContainText('Construction was available through 900.');
});
