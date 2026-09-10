
'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, ['js/economy.js', 'js/model.js', 'js/population.js', 'data/economy.js']);
const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { startDeterministicGame } = require('../support/game/start');

test('enterprise income batches contracts and sees later deaths and assignments', async function ({ page }, testInfo) {
  await openGame(page, testInfo); await startDeterministicGame(page);
  const result = await page.evaluate(function () {
    const s = FB.state;
    s.player.gold = 10000; s.player.enterpriseMigration = 1;
    s.player.enterprises = []; s.player.enterpriseLabor = [];
    for (let i = 0; i < 12; i++) {
      const e = { uid:'read_batch_' + i, type:i % 2 ? 'press_business' : 'orchard_business',
        provinceId:s.player.provinceId, settlement:0, workerId:null };
      s.player.enterprises.push(e);
      if (!FB.hireEnterpriseWorker(s, e.uid)) throw new Error('Fixture hire failed');
    }
    let reads = 0;
    for (const record of s.player.enterpriseLabor) {
      let pay = record.pay;
      Object.defineProperty(record, 'pay', { enumerable:true, configurable:true,
        get:function () { reads++; return pay; }, set:function (value) { pay = value; } });
    }
    const rng = FB.getRngState();
    const first = FB.livelihoodBreakdown(s), firstReads = reads;
    reads = 0;
    const second = FB.livelihoodBreakdown(s), secondReads = reads;
    const readRngStable = rng === FB.getRngState();
    const lost = s.player.enterpriseLabor[0].charId;
    s.chars[lost].dead = true;
    const after = FB.livelihoodBreakdown(s);
    const deadRemoved = !s.player.enterpriseLabor.some(function (r) { return r.charId === lost; });
    const empty = s.player.enterprises[0];
    const yieldAfterDeath = FB.enterpriseYield(s, empty);
    const hired = FB.hireEnterpriseWorker(s, empty.uid);
    const yieldAfterHire = FB.enterpriseYield(s, empty);
    // A failing calculation must not leave a cache installed for the next call.
    const old = FB.enterpriseYield;
    FB.enterpriseYield = function () { throw new Error('probe'); };
    try { FB.livelihoodBreakdown(s); } catch (e) {} finally { FB.enterpriseYield = old; }
    const recovered = FB.livelihoodBreakdown(s);
    return { firstReads:firstReads, secondReads:secondReads,
      stable:JSON.stringify(first) === JSON.stringify(second), deadRemoved:deadRemoved,
      yieldAfterDeath:yieldAfterDeath, hired:hired, yieldAfterHire:yieldAfterHire,
      recovered:recovered.length > 0, after:after.length > 0,
      rngStable:readRngStable };
  });
  expect(result.firstReads).toBeLessThanOrEqual(24);
  expect(result.secondReads).toBeLessThanOrEqual(24);
  expect(result.rngStable).toBe(true); expect(result.stable).toBe(true); expect(result.deadRemoved).toBe(true);
  expect(result.yieldAfterDeath).toBe(0); expect(result.hired).toBe(true);
  expect(result.yieldAfterHire).toBeGreaterThan(0); expect(result.recovered).toBe(true);
});


test('annual enterprise snapshot normalizes once and keeps county effects equivalent and fresh', async function ({ page }, testInfo) {
  await openGame(page, testInfo); await startDeterministicGame(page);
  const result = await page.evaluate(function () {
    const s = FB.state, pid = s.player.provinceId;
    s.player.gold = 100000; s.player.enterpriseMigration = 1;
    s.player.enterprises = []; s.player.enterpriseLabor = [];
    const enterprise = { uid:'annual_upgrade_probe', type:'orchard_business', provinceId:pid,
      settlement:0, level:2, workerId:null };
    s.player.enterprises.push(enterprise);
    for (let i = 0; i < 10 && !FB.enterpriseFullyStaffed(s, enterprise); i++) {
      if (!FB.hireEnterpriseWorker(s, enterprise.uid)) throw new Error('Fixture hire failed');
    }
    if (!FB.enterpriseFullyStaffed(s, enterprise)) throw new Error('Fixture is not staffed');
    const other = Object.keys(FB.world.byId).find(function (id) {
      return id !== pid && !FB.world.byId[id].wasteland;
    });
    const expected = FB.enterpriseUpgradeEffects(s, pid);
    const cap = FB.countyPopulationCapacity(s, pid);
    const attraction = FB.countyMigrationAttraction(s, pid, {
      population:FB.countyPopulation(s, pid), capacity:cap,
      occupied:!!FB.countyConflictSnapshot(s)[pid], ownerAtWar:false, severeShock:false
    });
    const list = FB.enterpriseList; let reads = 0;
    FB.enterpriseList = function () { reads++; return list.apply(this, arguments); };
    try {
      const snapshot = FB.enterpriseUpgradeEffectsByCounty(s), snapshotReads = reads;
      const actualCap = FB.countyPopulationCapacity(s, pid, snapshot[pid]);
      const actualAttraction = FB.countyMigrationAttraction(s, pid, {
        population:FB.countyPopulation(s, pid), capacity:actualCap, enterpriseEffects:snapshot[pid],
        occupied:!!FB.countyConflictSnapshot(s)[pid], ownerAtWar:false, severeShock:false
      });
      const afterQueries = reads;
      const empty = snapshot[other] || {};
      FB.countyPopulationCapacity(s, other, empty);
      FB.countyBuildingAttraction(s, other, empty);
      const afterEmpty = reads;
      const worker = s.player.enterpriseLabor[0].charId;
      s.chars[worker].dead = true;
      const afterDeath = FB.enterpriseUpgradeEffectsByCounty(s);
      return { expected:expected, actual:snapshot[pid], snapshotReads:snapshotReads,
        afterQueries:afterQueries, afterEmpty:afterEmpty, cap:cap, actualCap:actualCap,
        attraction:attraction, actualAttraction:actualAttraction,
        removed:!afterDeath[pid], unchanged:JSON.stringify(snapshot[pid]) === JSON.stringify(expected) };
    } finally { FB.enterpriseList = list; }
  });
  expect(result.actual).toEqual(result.expected);
  expect(result.actual.populationCapacity).toBeGreaterThan(0);
  expect(result.actual.migrationAttraction).toBeGreaterThan(0);
  expect(result.snapshotReads).toBe(1);
  expect(result.afterQueries).toBe(1); expect(result.afterEmpty).toBe(1);
  expect(result.actualCap).toBe(result.cap);
  expect(result.actualAttraction).toBe(result.attraction);
  expect(result.removed).toBe(true); expect(result.unchanged).toBe(true);
});
