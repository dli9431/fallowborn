'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, ['js/modifiers.js', 'js/institutions.js', 'js/world.js',
  'js/armies.js', 'js/rebellions.js', 'js/wars.js', 'js/fortifications.js',
  'data/modifiers.js', 'data/map_data.js', 'data/political_institutions.js']);
const { test, expect } = require('../support/fixture');
const { startWarSafety } = require('../support/game/war-safety');

test('county reads and mutations never inspect unrelated modifier records', async function ({ page }, testInfo) {
  const ids = await startWarSafety(page, testInfo);
  const result = await page.evaluate(function (ids) {
    const s = FB.state;
    s.modifiers = { county:{} }; s.countySupport = {};
    FB.addModifier(s, 'uprising_settlement', ids.second, { silent:true });
    const list = s.modifiers.county[ids.second];
    let foreignReads = 0;
    Object.defineProperty(s.modifiers.county, ids.second, { configurable:true, enumerable:true,
      get:function () { foreignReads++; return list; }, set:function () { foreignReads++; } });
    try {
      FB.setCountySupport(s, ids.home, -50);
      FB.addModifier(s, 'commons_uprising', ids.home, { silent:true });
      const active = FB.modBonus(s, 'levy', ids.home);
      FB.removeModifier(s, 'commons_uprising', ids.home);
      const cleared = FB.modBonus(s, 'levy', ids.home);
      return { foreignReads:foreignReads, active:active, cleared:cleared };
    } finally {
      Object.defineProperty(s.modifiers.county, ids.second, { configurable:true, enumerable:true, writable:true, value:list });
    }
  }, ids);
  expect(result.foreignReads).toBe(0);
  expect(result.active).toBeLessThan(result.cleared);
  expect(result.cleared).toBeCloseTo(-0.5);
});

test('local modifier reads see expiry and replacement without a full repair', async function ({ page }, testInfo) {
  const ids = await startWarSafety(page, testInfo);
  const result = await page.evaluate(function (ids) {
    const s = FB.state, pid = ids.home;
    s.modifiers = { county:{} }; s.countySupport = {};
    FB.addModifier(s, 'uprising_settlement', pid, { silent:true });
    s.modifiers.county[pid][0].endTurn = s.turn + 1;
    const before = FB.countyPopularSupport(s, pid);
    s.turn++;
    const after = FB.countyPopularSupport(s, pid);
    s.modifiers.county[pid] = [null, { id:'uprising_settlement', endTurn:s.turn + 10 },
      { id:'uprising_settlement', endTurn:s.turn + 20 }];
    const records = FB.countyModifierRecords(s, pid);
    return { before:before, after:after, repaired:records.length,
      duration:records[0].endTurn - s.turn, restored:FB.countyPopularSupport(s, pid) };
  }, ids);
  expect(result).toEqual({ before:10, after:0, repaired:1, duration:20, restored:10 });
});

test('privilege eligibility stays live without building a presentation summary', async function ({ page }, testInfo) {
  const ids = await startWarSafety(page, testInfo);
  const result = await page.evaluate(function (ids) {
    const s = FB.state, summary = FB.privilegeSummary;
    s.privileges = [{ defId:'confirmed_custom', scopeId:ids.home, endTurn:s.turn + 1 }];
    let summaries = 0;
    FB.privilegeSummary = function () { summaries++; return summary.apply(this, arguments); };
    try {
      const local = FB.hasPrivilege(s, 'confirmed_custom', ids.home);
      const foreign = FB.hasPrivilege(s, 'confirmed_custom', ids.second);
      s.turn++;
      const expired = FB.hasPrivilege(s, 'confirmed_custom', ids.home);
      delete s.privileges[0].endTurn;
      const restored = FB.hasPrivilege(s, 'confirmed_custom', ids.home);
      s.privileges = [];
      const revoked = FB.hasPrivilege(s, 'confirmed_custom', ids.home);
      return { summaries:summaries, local:local, foreign:foreign, expired:expired, restored:restored, revoked:revoked };
    } finally { FB.privilegeSummary = summary; }
  }, ids);
  expect(result).toEqual({ summaries:0, local:true, foreign:false, expired:false, restored:true, revoked:false });
});

test('AI levy projections read support once and immediately reflect revolt and recovery', async function ({ page }, testInfo) {
  const ids = await startWarSafety(page, testInfo);
  const result = await page.evaluate(function (ids) {
    const s = FB.state, pid = s.realms[ids.other].capital;
    s.modifiers = { county:{} }; s.countySupport = {};
    s.dev[pid] = 1000; // Keep the comparison above the realm's garrison burden.
    const territory = { eligible:[pid], blocked:[], rally:pid, development:s.dev[pid] || 1 };
    const support = FB.countyPopularSupport;
    let reads = 0;
    FB.countyPopularSupport = function (state, county) {
      if (county === pid) reads++;
      return support.apply(this, arguments);
    };
    try {
      FB.setCountySupport(s, pid, -50);
      const calm = FB.aiBaseHost(s, ids.other, territory), calmReads = reads;
      FB.addModifier(s, 'commons_uprising', pid, { silent:true });
      reads = 0;
      const revolt = FB.aiBaseHost(s, ids.other, territory), revoltReads = reads;
      FB.removeModifier(s, 'commons_uprising', pid);
      FB.setCountySupport(s, pid, 0);
      const recovered = FB.aiBaseHost(s, ids.other, territory);
      return { calm:calm, revolt:revolt, recovered:recovered, calmReads:calmReads, revoltReads:revoltReads };
    } finally { FB.countyPopularSupport = support; }
  }, ids);
  expect(result.calmReads).toBe(1);
  expect(result.revoltReads).toBe(1);
  expect(result.revolt).toBeLessThan(result.calm);
  expect(result.recovered).toBeGreaterThan(result.calm);
});

test('AI muster passes its existing territory projection into the capacity calculation', async function ({ page }, testInfo) {
  const ids = await startWarSafety(page, testInfo);
  const result = await page.evaluate(function (ids) {
    const s = FB.state, base = FB.aiBaseHost;
    s.armies = [];
    delete s.armyDown[ids.enemy];
    let firstProjection = null;
    FB.aiBaseHost = function (state, rid, projection) {
      if (rid === ids.enemy && firstProjection === null) firstProjection = !!(projection && projection.eligible);
      return base.apply(this, arguments);
    };
    try { FB.armyTick(s); return firstProjection; }
    finally { FB.aiBaseHost = base; }
  }, ids);
  expect(result).toBe(true);
});
