'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'js/actions.js',
  'js/model.js',
  'js/world.js',
  'js/modifiers.js',
  'js/papacy.js',
  'js/economy.js',
  'js/ui_modals.js',
  'js/ui_panels.js',
  'data/modifiers.js',
  'data/map_data.js',
  'data/cultures.js',
  'data/technology.js'
]);

const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { startDeterministicGame } = require('../support/game/start');

test.beforeEach(async function ({ page }, testInfo) {
  await openGame(page, testInfo);
  await startDeterministicGame(page);
});

test('offers both conversion deeds to adults', async function ({ page }) {
  const result = await page.evaluate(function () {
    const state = FB.state;
    const me = state.chars[state.player.charId];
    me.born = state.date.year - 35;
    return {
      faith:FB.instantStatus(state, 'convert_faith').shown,
      culture:FB.instantStatus(state, 'adopt_culture').shown
    };
  });
  expect(result.faith).toBe(true);
  expect(result.culture).toBe(true);
});

test('gates self faith conversion on piety and scales cost by faith distance',
  async function ({ page }) {
  const result = await page.evaluate(function () {
    const state = FB.state;
    const player = state.player;
    const me = state.chars[player.charId];
    me.religion = 'catholic';
    me.born = state.date.year - 35;

    player.piety = 0;
    const poor = FB.conversionStatus(state, 'faith', 'norse_pagan', 'self');

    player.piety = 1000;
    player.prestige = 1000;
    // a foreign faith pays the full base cost
    const foreign = FB.conversionStatus(state, 'faith', 'norse_pagan', 'self');
    // a campaign-founded in-fold child of catholic pays the reduced rate
    const sect = FB.createFaith(state, {
      name:'Test Sect', adjective:'Test', collective:'Testers',
      desc:'A test sect.', icon:'✝',
      group:'catholic', relationToParent:'in_fold'
    });
    const inFold = FB.conversionStatus(state, 'faith', sect, 'self');
    return {
      poorOk:poor.ok,
      poorReason:poor.reason,
      foreignOk:foreign.ok,
      foreignCost:foreign.pietyCost,
      foreignRelation:foreign.relation,
      inFoldOk:inFold.ok,
      inFoldCost:inFold.pietyCost,
      inFoldRelation:inFold.relation
    };
  });
  expect(result.poorOk).toBe(false);
  expect(result.poorReason).toContain('piety');
  expect(result.foreignOk).toBe(true);
  expect(result.foreignRelation).toBe('foreign');
  expect(result.foreignCost).toBe(100);
  expect(result.inFoldOk).toBe(true);
  expect(result.inFoldRelation).toBe('in_fold');
  expect(result.inFoldCost).toBe(60);
});

test('applies a self faith conversion with cost, opinion hit, and cooldown',
  async function ({ page }) {
  const result = await page.evaluate(function () {
    const state = FB.state;
    const player = state.player;
    const me = state.chars[player.charId];
    me.religion = 'catholic';
    me.born = state.date.year - 35;
    player.piety = 500;
    player.prestige = 100;
    player.pop = 20;
    const before = { piety:player.piety, pop:player.pop };
    const ok = FB.applyConversion(state, 'faith', 'orthodox', 'self');
    const again = FB.conversionStatus(state, 'faith', 'sunni', 'self');
    return {
      ok:ok,
      religion:me.religion,
      pietySpent:before.piety - player.piety,
      popDelta:player.pop - before.pop,
      cooldown:player.cooldowns['convert_faith:self'],
      againOk:again.ok,
      againReason:again.reason,
      newsKey:state.log.length && state.log[state.log.length - 1].msg
        ? state.log[state.log.length - 1].msg.key : null
    };
  });
  expect(result.ok).toBe(true);
  expect(result.religion).toBe('orthodox');
  expect(result.pietySpent).toBe(80); // 100 base × 0.8 schismatic
  expect(result.popDelta).toBe(-10);
  expect(typeof result.cooldown).toBe('number');
  expect(result.againOk).toBe(false);
  expect(result.againReason).toContain('Ready in');
  expect(result.newsKey).toBe('news.action.convert_faith');
});

test('converts the household and stirs zealot unrest at home',
  async function ({ page }) {
  const result = await page.evaluate(function () {
    const state = FB.state;
    const player = state.player;
    const me = state.chars[player.charId];
    me.religion = 'catholic';
    me.born = state.date.year - 35;
    player.piety = 1000;
    player.prestige = 1000;
    player.pop = 0;
    const household = FB.householdMembers(state);
    const ids = household.map(function (c) { return c.id; });
    const before = { piety:player.piety, prestige:player.prestige };
    const ok = FB.applyConversion(state, 'faith', 'orthodox', 'household');
    const home = player.provinceId;
    const modifiers = (state.modifiers.county[home] || [])
      .map(function (m) { return m.id; });
    return {
      ok:ok,
      ids:ids,
      religions:ids.map(function (id) { return state.chars[id].religion; }),
      pietySpent:before.piety - player.piety,
      prestigeSpent:before.prestige - player.prestige,
      pop:player.pop,
      modifiers:modifiers
    };
  });
  expect(result.ok).toBe(true);
  expect(result.ids.length).toBeGreaterThan(0);
  for (const religion of result.religions) expect(religion).toBe('orthodox');
  expect(result.pietySpent).toBe(200); // 250 base × 0.8 schismatic
  expect(result.prestigeSpent).toBe(120); // 150 base × 0.8 schismatic
  expect(result.pop).toBe(-30);
  expect(result.modifiers).toContain('zealot_unrest');
});

test('gates realm conversion to landed rulers and makes it once per ruler',
  async function ({ page }) {
  const result = await page.evaluate(function () {
    const state = FB.state;
    const player = state.player;
    const me = state.chars[player.charId];
    me.religion = 'catholic';
    me.born = state.date.year - 35;
    player.piety = 5000;
    player.prestige = 5000;
    player.tier = 0;
    delete state.realms.player;
    const commoner = FB.conversionStatus(state, 'faith', 'sunni', 'realm');

    player.tier = 3;
    player.provs = ['london'];
    state.realms.player = {
      name:'Testdom', alive:true, rank:1, capital:'london', religion:null
    };
    state.realms.vassal_test = { name:'Vassal', alive:true, liege:'player' };
    state.realms.fold_test = {
      name:'Old Fold', alive:true, capital:'roma', religion:'catholic'
    };
    const vassalBefore = FB.standingOf(state, { kind:'realm', id:'vassal_test' });
    const foldBefore = FB.standingOf(state, { kind:'realm', id:'fold_test' });
    const ok = FB.applyConversion(state, 'faith', 'sunni', 'realm');
    const vassalAfter = FB.standingOf(state, { kind:'realm', id:'vassal_test' });
    const foldAfter = FB.standingOf(state, { kind:'realm', id:'fold_test' });
    const second = FB.conversionStatus(state, 'faith', 'orthodox', 'realm');
    const modifiers = (state.modifiers.county.london || [])
      .map(function (m) { return m.id; });
    return {
      commonerOk:commoner.ok,
      ok:ok,
      realmReligion:state.realms.player.religion,
      religion:me.religion,
      marker:player.realmFaithConversion,
      vassalDelta:vassalAfter - vassalBefore,
      foldDelta:foldAfter - foldBefore,
      secondOk:second.ok,
      secondReason:second.reason,
      modifiers:modifiers
    };
  });
  expect(result.commonerOk).toBe(false);
  expect(result.ok).toBe(true);
  expect(result.realmReligion).toBe('sunni');
  expect(result.religion).toBe('sunni');
  expect(result.marker && result.marker.to).toBe('sunni');
  expect(result.vassalDelta).toBe(-35);
  // −25 explicit hit plus the faith-baseline re-base from same (+15) to
  // hostile/foreign (catholic vs sunni is authored hostile: −25)
  expect(result.foldDelta).toBeLessThanOrEqual(-25);
  expect(result.secondOk).toBe(false);
  expect(result.secondReason).toContain('already led the realm');
  expect(result.modifiers).toContain('zealot_unrest');
});

test('excommunicates an apostate from the papal faith while a Pope reigns',
  async function ({ page }) {
  const result = await page.evaluate(function () {
    const state = FB.state;
    const player = state.player;
    const me = state.chars[player.charId];
    me.religion = 'catholic';
    me.born = state.date.year - 35;
    me.traits = (me.traits || []).filter(function (id) {
      return id !== 'excommunicated';
    });
    player.piety = 1000;
    player.prestige = 1000;
    const pope = FB.religiousHeadOf(state, 'catholic');
    const status = FB.conversionStatus(state, 'faith', 'orthodox', 'self');
    const ok = FB.applyConversion(state, 'faith', 'orthodox', 'self');
    const papacy = FB.ensurePapacy(state);
    const obedience = papacy.obediences[papacy.romanObedience];
    const record = papacy.excommunications[obedience.id + ':' + me.id];
    return {
      pope:!!pope,
      excommunicates:status.excommunicates,
      ok:ok,
      trait:me.traits.indexOf('excommunicated') >= 0,
      cause:record ? record.cause : null,
      justified:record ? record.justified : null
    };
  });
  expect(result.pope).toBe(true);
  expect(result.excommunicates).toBe(true);
  expect(result.ok).toBe(true);
  expect(result.trait).toBe(true);
  expect(result.cause).toBe('apostasy');
  expect(result.justified).toBe(true);
});

test('adopts a culture for prestige and converts the household for both',
  async function ({ page }) {
  const result = await page.evaluate(function () {
    const state = FB.state;
    const player = state.player;
    const me = state.chars[player.charId];
    me.born = state.date.year - 35;
    const target = me.culture === 'norse' ? 'greek' : 'norse';
    player.prestige = 1000;
    player.piety = 1000;
    const selfBefore = player.prestige;
    const selfOk = FB.applyConversion(state, 'culture', target, 'self');
    // Read the self result now: the household scope below also converts the
    // player (household = the player plus FB.householdMembers).
    const selfCulture = me.culture;
    const selfSpent = selfBefore - player.prestige;
    const household = FB.householdMembers(state);
    const ids = household.map(function (c) { return c.id; });
    const other = target === 'norse' ? 'greek' : 'norse';
    const st = FB.conversionStatus(state, 'culture', other, 'household');
    const holdBefore = { prestige:player.prestige, piety:player.piety };
    const holdOk = FB.applyConversion(state, 'culture', other, 'household');
    return {
      selfOk:selfOk,
      culture:selfCulture,
      selfTarget:target,
      selfSpent:selfSpent,
      holdStatusOk:st.ok,
      holdCosts:{ piety:st.pietyCost, prestige:st.prestigeCost },
      holdOk:holdOk,
      holdSpent:{
        prestige:holdBefore.prestige - player.prestige,
        piety:holdBefore.piety - player.piety
      },
      cultures:ids.map(function (id) { return state.chars[id].culture; }),
      target:other,
      newsKey:state.log.length && state.log[state.log.length - 1].msg
        ? state.log[state.log.length - 1].msg.key : null
    };
  });
  expect(result.selfOk).toBe(true);
  expect(result.culture).toBe(result.selfTarget);
  expect(result.selfSpent).toBe(75);
  expect(result.holdStatusOk).toBe(true);
  expect(result.holdCosts).toEqual({ piety:100, prestige:300 });
  expect(result.holdOk).toBe(true);
  expect(result.holdSpent).toEqual({ prestige:300, piety:100 });
  for (const culture of result.cultures) expect(culture).toBe(result.target);
  expect(result.newsKey).toBe('news.action.adopt_culture');
});

test('records conversion in the technology impact ledger', async function ({ page }) {
  const result = await page.evaluate(function () {
    const features = FBDATA.techImpactReviews.features;
    const errors = FB.validateTechnologyData ? FB.validateTechnologyData() : [];
    return {
      faith:features.faith_conversion,
      culture:features.culture_adoption,
      errors:errors
    };
  });
  expect(result.faith.mode).toBe('none');
  expect(result.culture.mode).toBe('none');
  expect(result.faith.rationale.length).toBeGreaterThan(0);
  expect(result.culture.rationale.length).toBeGreaterThan(0);
  expect(result.errors).toEqual([]);
});
