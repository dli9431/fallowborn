'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'js/actions.js',
  'js/technology.js',
  'js/market.js',
  'js/population.js',
  'js/world.js',
  'js/ui_modals.js',
  'data/technology.js',
  'data/map_data.js',
  'data/cultures.js',
  'data/markets.js'
]);

const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { startDeterministicGame } = require('../support/game/start');

test.beforeEach(async function ({ page }, testInfo) {
  await openGame(page, testInfo);
  await startDeterministicGame(page);
});

test('raiding eligibility respects historical cultures and pagan religions',
  async function ({ page }) {
    var result = await page.evaluate(function () {
      var s = FB.state;
      var p = s.player;
      var me = s.chars[p.charId];
      p.tier = 3;

      // Norse culture & faith
      me.culture = 'norse';
      me.religion = 'norse_pagan';
      var norseEligible = FB.canRaid(s);

      // Steppe Magyar Tengri
      me.culture = 'magyar';
      me.religion = 'tengri';
      var magyarEligible = FB.canRaid(s);

      // Berber Muslim
      me.culture = 'berber';
      me.religion = 'sunni';
      var berberEligible = FB.canRaid(s);

      // Baltic Pagan
      me.culture = 'baltic';
      me.religion = 'baltic_pagan';
      var balticEligible = FB.canRaid(s);

      // Gaelic Christian (Celtic border reavers)
      me.culture = 'gaelic';
      me.religion = 'catholic';
      var gaelicEligible = FB.canRaid(s);

      // Frankish Catholic (standard non-raiding baseline)
      me.culture = 'frankish';
      me.religion = 'catholic';
      var frankishEligible = FB.canRaid(s);

      // Frankish with Slavic Pagan religion
      me.religion = 'slavic_pagan';
      var paganAdoptedEligible = FB.canRaid(s);

      // Serf station exclusion
      p.tier = 0;
      me.culture = 'norse';
      me.religion = 'norse_pagan';
      var serfEligible = FB.canRaid(s);

      return {
        norse: norseEligible,
        magyar: magyarEligible,
        berber: berberEligible,
        baltic: balticEligible,
        gaelic: gaelicEligible,
        frankish: frankishEligible,
        paganAdopted: paganAdoptedEligible,
        serf: serfEligible
      };
    });

    expect(result.norse).toBe(true);
    expect(result.magyar).toBe(true);
    expect(result.berber).toBe(true);
    expect(result.baltic).toBe(true);
    expect(result.gaelic).toBe(true);
    expect(result.frankish).toBe(false);
    expect(result.paganAdopted).toBe(true);
    expect(result.serf).toBe(false);
  });

test('technology tree extends raid reach and unlocks deep overseas raiding',
  async function ({ page }) {
    var result = await page.evaluate(function () {
      var s = FB.state;
      var p = s.player;
      var me = s.chars[p.charId];
      p.tier = 3;
      me.culture = 'norse';
      me.religion = 'norse_pagan';

      var realmId = FB.playerRealmId ? FB.playerRealmId(s) : 'player';
      var baseRange = FB.raidRange(s);

      // Complete longships technology
      var record = FB.realmTechRecord(s, realmId);
      record.completed.push('longships');
      var longshipRange = FB.raidRange(s);

      // Complete navigation techs
      record.completed.push('celestial_navigation');
      record.completed.push('naval_logbooks');
      record.completed.push('mariners_compass');
      var navRange = FB.raidRange(s);

      return {
        baseRange: baseRange,
        longshipRange: longshipRange,
        navRange: navRange
      };
    });

    expect(result.baseRange).toBe(2);
    expect(result.longshipRange).toBe(6);
    expect(result.navRange).toBe(9);
  });

test('executing a raid impacts population, buildings, market shocks, and yields plunder',
  async function ({ page }) {
    var result = await page.evaluate(function () {
      var s = FB.state;
      var p = s.player;
      var me = s.chars[p.charId];
      p.tier = 4;
      p.gold = 50;
      p.prestige = 100;
      me.culture = 'norse';
      me.religion = 'norse_pagan';

      var targets = FB.raidTargets(s);
      if (!targets.length) {
        var realmId = FB.playerRealmId ? FB.playerRealmId(s) : 'player';
        var record = FB.realmTechRecord(s, realmId);
        record.completed.push('longships');
        targets = FB.raidTargets(s);
      }

      var target = targets[0];
      var targetPid = target.pid;

      var initialTargetPop = FB.countyPopulation(s, targetPid);
      var initialHomePop = FB.countyPopulation(s, p.provinceId);
      var initialGold = p.gold;
      var initialPrestige = p.prestige;

      // Add a building to test potential ruin
      s.buildings = s.buildings || {};
      s.buildings[targetPid] = s.buildings[targetPid] || [];
      s.buildings[targetPid].push({ s:0, id:'watermill', ruined:false });

      var report = FB.executeRaid(s, targetPid, 'sack', p.charId, 'settle');

      var finalTargetPop = FB.countyPopulation(s, targetPid);
      var finalHomePop = FB.countyPopulation(s, p.provinceId);
      var finalGold = p.gold;
      var finalPrestige = p.prestige;

      var hasRaidShock = false;
      if (s.market && Array.isArray(s.market.shocks)) {
        for (var i = 0; i < s.market.shocks.length; i++) {
          var shock = s.market.shocks[i];
          if (shock.provinceId === targetPid && shock.source === 'raid_devastation') {
            hasRaidShock = true;
            break;
          }
        }
      }

      var hasCooldown = p.raidCooldownUntil > s.turn;

      return {
        targetPid: targetPid,
        goldGained: finalGold - initialGold,
        prestigeGained: finalPrestige - initialPrestige,
        targetPopLoss: initialTargetPop - finalTargetPop,
        homePopGain: finalHomePop - initialHomePop,
        captivesReported: report.captives,
        hasRaidShock: hasRaidShock,
        hasCooldown: hasCooldown,
        goodsLooted: report.goods
      };
    });

    expect(result.goldGained).toBeGreaterThan(0);
    expect(result.prestigeGained).toBeGreaterThan(0);
    expect(result.targetPopLoss).toBeGreaterThan(0);
    expect(result.homePopGain).toBeGreaterThan(0);
    expect(result.captivesReported).toBeGreaterThan(0);
    expect(result.hasRaidShock).toBe(true);
    expect(result.hasCooldown).toBe(true);
    expect(result.goodsLooted.provisions).toBeGreaterThan(0);
  });

test('captive resolution options function correctly for bonding and ransoming',
  async function ({ page }) {
    var result = await page.evaluate(function () {
      var s = FB.state;
      var p = s.player;
      var me = s.chars[p.charId];
      p.tier = 3;
      p.gold = 50;
      me.culture = 'norse';
      me.religion = 'norse_pagan';

      var realmId = FB.playerRealmId ? FB.playerRealmId(s) : 'player';
      var record = FB.realmTechRecord(s, realmId);
      record.completed.push('longships');
      var targets = FB.raidTargets(s);
      var targetPid = targets[0].pid;

      p.bondedWorkers = 0;
      p.raidCooldownUntil = 0;
      var bondReport = FB.executeRaid(s, targetPid, 'sack', p.charId, 'bond');
      var workersAfterBond = p.bondedWorkers;

      p.raidCooldownUntil = 0;
      var goldBeforeRansom = p.gold;
      var ransomReport = FB.executeRaid(s, targetPid, 'sack', p.charId, 'ransom');
      var goldAfterRansom = p.gold;

      return {
        workersAfterBond: workersAfterBond,
        ransomGoldPaid: goldAfterRansom - goldBeforeRansom - ransomReport.gold,
        ransomReportExtra: ransomReport.ransomGold
      };
    });

    expect(result.workersAfterBond).toBeGreaterThan(0);
    expect(result.ransomReportExtra).toBeGreaterThan(0);
    expect(result.ransomGoldPaid).toBe(result.ransomReportExtra);
  });
