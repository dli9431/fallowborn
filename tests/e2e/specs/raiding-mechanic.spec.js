'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'js/actions.js',
  'js/technology.js',
  'js/market.js',
  'js/population.js',
  'js/world.js',
  'js/armies.js',
  'js/fortifications.js',
  'js/ui_panels.js',
  'js/ui_modals.js',
  'js/ui_misc.js',
  'js/mapview.js',
  'js/keys.js',
  'index.html',
  'css/style.css',
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

      // Jewish Khazar culture retains the old Turkic core's raiding tradition
      me.culture = 'khazar';
      me.religion = 'jewish';
      var khazarEligible = FB.canRaid(s);

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
        khazar: khazarEligible,
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
    expect(result.khazar).toBe(true);
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

      var baseTargets = FB.raidTargets(s).map(function (t) { return t.pid; });
      var baseHasRome = baseTargets.indexOf('rome') >= 0;
      var baseHasRouen = baseTargets.indexOf('rouen') >= 0;

      // Complete longships technology
      var record = FB.realmTechRecord(s, realmId);
      record.completed.push('longships');
      var longshipRange = FB.raidRange(s);
      var longshipTargets = FB.raidTargets(s).map(function (t) { return t.pid; });
      var longshipHasRouen = longshipTargets.indexOf('rouen') >= 0;
      var longshipHasRome = longshipTargets.indexOf('rome') >= 0;

      // Complete navigation techs
      record.completed.push('celestial_navigation');
      record.completed.push('naval_logbooks');
      record.completed.push('mariners_compass');
      var navRange = FB.raidRange(s);

      return {
        baseRange: baseRange,
        baseHasRome: baseHasRome,
        baseHasRouen: baseHasRouen,
        longshipRange: longshipRange,
        longshipHasRouen: longshipHasRouen,
        longshipHasRome: longshipHasRome,
        navRange: navRange
      };
    });

    expect(result.baseRange).toBe(2);
    expect(result.baseHasRome).toBe(false);
    expect(result.baseHasRouen).toBe(false);
    expect(result.longshipRange).toBe(6);
    expect(result.longshipHasRouen).toBe(true);
    expect(result.longshipHasRome).toBe(false);
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

test('raiding expedition modal renders styled toolbar with strategy select and search filter',
  async function ({ page }) {
    await page.evaluate(function () {
      var s = FB.state;
      var p = s.player;
      var me = s.chars[p.charId];
      p.tier = 3;
      me.culture = 'norse';
      me.religion = 'norse_pagan';

      var realmId = FB.playerRealmId ? FB.playerRealmId(s) : 'player';
      var record = FB.realmTechRecord(s, realmId);
      record.completed.push('longships');

      FB.ui.showRaidTargets();
    });

    const toolbar = page.locator('#raid-target-toolbar');
    await expect(toolbar).toBeVisible();

    const strategySelect = page.locator('#raid-strategy-select');
    await expect(strategySelect).toBeVisible();
    await expect(strategySelect).toHaveValue('sack');

    const strategyHint = page.locator('#raid-strategy-hint');
    await expect(strategyHint).toBeVisible();
    await expect(strategyHint).toContainText('Assault settlements');

    const searchInput = page.locator('#raid-target-search');
    await expect(searchInput).toBeVisible();

    const searchClear = page.locator('#raid-search-clear');
    await expect(searchClear).toHaveClass(/hidden/);

    // Type a query that matches targets
    await searchInput.fill('paris');
    await expect(searchClear).not.toHaveClass(/hidden/);

    // Click clear button to reset
    await searchClear.click();
    await expect(searchInput).toHaveValue('');
    await expect(searchClear).toHaveClass(/hidden/);
  });

test('selecting raid target on map opens floating picker, highlights in-range counties, and allows launching raid',
  async function ({ page }) {
    await page.evaluate(function () {
      var s = FB.state;
      var p = s.player;
      var me = s.chars[p.charId];
      p.tier = 3;
      me.culture = 'norse';
      me.religion = 'norse_pagan';

      var realmId = FB.playerRealmId ? FB.playerRealmId(s) : 'player';
      var record = FB.realmTechRecord(s, realmId);
      record.completed.push('longships');

      FB.ui.showRaidTargets();
    });

    const pickMapBtn = page.locator('#raid-pick-map');
    await expect(pickMapBtn).toBeVisible();
    await pickMapBtn.click();

    const raidPicker = page.locator('#raid-picker');
    await expect(raidPicker).toBeVisible();
    await expect(raidPicker).not.toHaveClass(/hidden/);

    const checkState = await page.evaluate(function () {
      return {
        pickerOpen: FB.ui.raidPickerOpen(),
        hasTargets: Array.isArray(FB.map.raidTargets) && FB.map.raidTargets.length > 0,
        focusActive: FB.map.focusGroupActive,
        focusMembersCount: (FB.map.focusMembers || []).filter(Boolean).length
      };
    });

    expect(checkState.pickerOpen).toBe(true);
    expect(checkState.hasTargets).toBe(true);
    expect(checkState.focusActive).toBe(true);
    expect(checkState.focusMembersCount).toBeGreaterThan(0);

    // Pick a valid reachable target on map
    await page.evaluate(function () {
      var targetPid = FB.map.raidTargets[0];
      FB.ui.raidPickProvince(targetPid, true);
    });

    const launchBtn = page.locator('#raid-picker-launch');
    await expect(launchBtn).toBeEnabled();

    // Click launch raid
    await launchBtn.click();
    await expect(raidPicker).toHaveClass(/hidden/);

    const resolutionDone = page.locator('#gm-raid-done');
    await expect(resolutionDone).toBeVisible();
  });

test('raid against overwhelming garrison resistance is repelled with troop casualties',
  async function ({ page }) {
    var result = await page.evaluate(function () {
      var s = FB.state;
      var p = s.player;
      var me = s.chars[p.charId];
      p.tier = 3;
      p.gold = 50;
      p.prestige = 100;
      me.culture = 'norse';
      me.religion = 'norse_pagan';

      var targetPid = 'paris';
      // Home one land step from the target: the Channel crossing needs
      // longships, so a London start would find no route at all
      var homeAdj = FB.world.adj[targetPid] || {};
      for (var nb in homeAdj) {
        var npr = FB.world.byId[nb];
        if (npr && !npr.wasteland) { p.provinceId = nb; break; }
      }
      // Setup heavy fort and huge realm defense. Forts are settlement-scoped
      // 'walls' records in state.buildings; a fresh buildings object busts
      // the fort index cache.
      var walled = {};
      for (var key in (s.buildings || {})) walled[key] = s.buildings[key];
      walled[targetPid] = [{ id:'walls', s:0, level:3, ruined:false }];
      s.buildings = walled;
      s.owner = s.owner || {};
      s.owner[targetPid] = 'france';
      s.realms = s.realms || {};
      s.realms.france = { id:'france', name:'Kingdom of France', alive:true, military:5000 };
      if (FB.invalidateRealmCache) FB.invalidateRealmCache();

      // Calculate combat odds
      var spoils = FB.calculateRaidSpoils(s, targetPid, 'sack', p.charId);

      // Execute raid against overwhelming odds
      var report = FB.executeRaid(s, targetPid, 'sack', p.charId, 'settle');

      return {
        success: report.success,
        combatAdvantage: spoils.combatAdvantage,
        casualties: report.casualties,
        // turn 0 at game start is a valid down-stamp — check presence, not truthiness
        armyDownTriggered: !!(s.armyDown && s.armyDown.player !== undefined)
      };
    });

    expect(result.success).toBe(false);
    expect(result.combatAdvantage).toBeLessThan(0.40);
    expect(result.casualties).toBeGreaterThan(10);
    expect(result.armyDownTriggered).toBe(true);
  });

test('raid calculates multi-county route passage battles sequentially through intermediate territories',
  async function ({ page }) {
    var result = await page.evaluate(function () {
      var s = FB.state;
      var p = s.player;
      var me = s.chars[p.charId];
      p.tier = 5;
      me.culture = 'norse';
      me.religion = 'norse_pagan';

      // An overland chain three marches deep (home -> a -> b -> target), so
      // the expedition must fight through two intermediate counties. The BFS
      // follows land adjacency only, so a London start stays on its own
      // landmass and never needs longships.
      var start = 'london';
      var adj = FB.world.adj;
      var prev = {}; prev[start] = start;
      var depth = {}; depth[start] = 0;
      var q = [start];
      var target = null;
      for (var qi = 0; qi < q.length && !target; qi++) {
        var cur = q[qi];
        if (depth[cur] >= 3) continue;
        for (var nb in (adj[cur] || {})) {
          if (prev[nb] !== undefined) continue;
          var npr = FB.world.byId[nb];
          if (!npr || npr.wasteland) continue;
          prev[nb] = cur;
          depth[nb] = depth[cur] + 1;
          q.push(nb);
          if (depth[nb] === 3) { target = nb; break; }
        }
      }
      if (!target) {
        return { hasRoute:false, routeLength:0, marchSkirmishesCount:0,
          repelled:true, raiderMen:0, survivingMen:0, totalCasualties:0 };
      }
      // Clear any standing walls along the chain so nothing blocks the march
      var chain = [target];
      while (chain[0] !== start) chain.unshift(prev[chain[0]]);
      var buildings = {};
      for (var key in (s.buildings || {})) buildings[key] = s.buildings[key];
      for (var i = 0; i < chain.length; i++) {
        buildings[chain[i]] = (buildings[chain[i]] || []).filter(function (b) { return b.id !== 'walls'; });
      }
      s.buildings = buildings;

      p.provinceId = start;
      p.provs = [start];

      // Ensure player has a strong raiding muster
      s.dev = s.dev || {};
      s.dev[start] = 20;

      // Setup enemy realm for the territory along the march
      s.owner = s.owner || {};
      for (var j = 1; j < chain.length; j++) s.owner[chain[j]] = 'france';
      s.realms = s.realms || {};
      s.realms.france = { id:'france', name:'Kingdom of France', alive:true, military:1200 };
      if (FB.invalidateRealmCache) FB.invalidateRealmCache();

      var spoils = FB.calculateRaidSpoils(s, target, 'sack', p.charId);

      return {
        hasRoute: Array.isArray(spoils.route) && spoils.route.length > 0,
        routeLength: spoils.route.length,
        marchSkirmishesCount: spoils.marchSkirmishes.length,
        repelled: !spoils.success,
        raiderMen: spoils.raiderMen,
        survivingMen: spoils.survivingMen,
        totalCasualties: spoils.casualties
      };
    });

    expect(result.hasRoute).toBe(true);
    expect(result.routeLength).toBeGreaterThanOrEqual(2);
    expect(result.raiderMen).toBeGreaterThan(0);
    expect(result.repelled).toBe(false);
    // every hostile county on the march produced its own sequential skirmish
    expect(result.marchSkirmishesCount).toBe(result.routeLength);
    expect(result.survivingMen).toBeLessThan(result.raiderMen);
    expect(result.totalCasualties).toBeGreaterThan(0);
  });

test('hostile fortifications block raider passage to interior counties and fortify direct assaults',
  async function ({ page }) {
    var result = await page.evaluate(function () {
      var s = FB.state;
      var p = s.player;
      var me = s.chars[p.charId];
      p.tier = 4;
      p.provinceId = 'london';
      p.provs = ['london'];
      me.culture = 'norse';
      me.religion = 'norse_pagan';

      // A fortified foreign border county one land step away. Forts are
      // 'walls' records in state.buildings; a fresh object busts the fort
      // index cache.
      var fortAdj = FB.world.adj['london'] || {};
      var fortPid = null;
      for (var hb in fortAdj) {
        var hpr = FB.world.byId[hb];
        if (hpr && !hpr.wasteland) { fortPid = hb; break; }
      }
      var walled = {};
      for (var key in (s.buildings || {})) walled[key] = s.buildings[key];
      walled[fortPid] = [{ id:'walls', s:0, level:2, ruined:false }];
      s.buildings = walled;
      s.owner = s.owner || {};
      s.owner[fortPid] = 'france';
      s.realms = s.realms || {};
      s.realms.france = { id:'france', name:'Kingdom of France', alive:true, military:1000 };
      if (FB.invalidateRealmCache) FB.invalidateRealmCache();

      // Verify whether the fort county itself is targetable
      var fortRoute = FB.raidMarchRoute(s, p.provinceId, fortPid);

      // Check calculateRaidSpoils defense with fort
      var fortSpoils = FB.calculateRaidSpoils(s, fortPid, 'sack', p.charId);

      return {
        fortRouteValid: !!fortRoute,
        fortGarrisonMen: fortSpoils.garrisonMen
      };
    });

    expect(result.fortRouteValid).toBe(true);
    expect(result.fortGarrisonMen).toBeGreaterThan(150);
  });

test('raid target list and map overlay properly indicate intermediate and destination fortifications',
  async function ({ page }) {
    var result = await page.evaluate(function () {
      var s = FB.state;
      var p = s.player;
      var me = s.chars[p.charId];
      p.tier = 4;
      p.provinceId = 'london';
      p.provs = ['london'];
      me.culture = 'norse';
      me.religion = 'norse_pagan';

      // A fortified foreign neighbor within overland reach (Paris would need
      // longships; a direct land neighbor does not). Forts are 'walls'
      // records in state.buildings; a fresh object busts the fort index.
      var adj = FB.world.adj['london'] || {};
      var targetPid = null;
      for (var nb in adj) {
        var npr = FB.world.byId[nb];
        if (npr && !npr.wasteland) { targetPid = nb; break; }
      }
      var walled = {};
      for (var key in (s.buildings || {})) walled[key] = s.buildings[key];
      walled[targetPid] = [{ id:'walls', s:0, level:2, ruined:false }];
      s.buildings = walled;
      s.owner = s.owner || {};
      s.owner[targetPid] = 'france';
      s.realms = s.realms || {};
      s.realms.france = { id:'france', name:'Kingdom of France', alive:true, military:1000 };
      if (FB.invalidateRealmCache) FB.invalidateRealmCache();

      var targets = FB.raidTargets(s, p.charId);
      var fortTarget = null;
      for (var i = 0; i < targets.length; i++) {
        if (targets[i].pid === targetPid) {
          fortTarget = targets[i];
          break;
        }
      }

      return {
        hasTargets: targets.length > 0,
        fortTargetFound: !!fortTarget,
        fortTargetLevel: fortTarget ? fortTarget.fortLevel : 0,
        hasIntermediateInfo: fortTarget ? (typeof fortTarget.intermediateCounties === 'number') : false
      };
    });

    expect(result.hasTargets).toBe(true);
    expect(result.fortTargetFound).toBe(true);
    expect(result.fortTargetLevel).toBe(2);
    expect(result.hasIntermediateInfo).toBe(true);
  });

test('assaulting fortified counties inflicts significantly higher casualties than raiding unfortified counties',
  async function ({ page }) {
    var result = await page.evaluate(function () {
      var s = FB.state;
      var p = s.player;
      var me = s.chars[p.charId];
      p.tier = 4;
      me.culture = 'norse';
      me.religion = 'norse_pagan';

      // Home one land step from Paris: the Channel crossing needs longships,
      // so a London start would find no route at all
      var homeAdj = FB.world.adj['paris'] || {};
      for (var hb in homeAdj) {
        var hpr = FB.world.byId[hb];
        if (hpr && !hpr.wasteland) { p.provinceId = hb; p.provs = [hb]; break; }
      }

      s.dev = s.dev || {};
      s.dev[p.provinceId] = 12;

      s.owner = s.owner || {};
      s.owner.paris = 'france';
      s.realms = s.realms || {};
      s.realms.france = { id:'france', name:'Kingdom of France', alive:true, military:100 };
      if (FB.invalidateRealmCache) FB.invalidateRealmCache();

      // Unfortified: strip any standing walls from Paris (a fresh buildings
      // object busts the fort index cache)
      var plain = {};
      for (var key in (s.buildings || {})) plain[key] = s.buildings[key];
      plain.paris = (plain.paris || []).filter(function (b) { return b.id !== 'walls'; });
      s.buildings = plain;
      var unfortifiedSpoils = FB.calculateRaidSpoils(s, 'paris', 'sack', p.charId);

      // Fortified county (Level 2 stone stronghold)
      var walled = {};
      for (var key2 in s.buildings) walled[key2] = s.buildings[key2];
      walled.paris = [{ id:'walls', s:0, level:2, ruined:false }];
      s.buildings = walled;
      var fortifiedSpoils = FB.calculateRaidSpoils(s, 'paris', 'sack', p.charId);

      return {
        unfortCasualties: unfortifiedSpoils.casualties,
        fortCasualties: fortifiedSpoils.casualties,
        unfortGarrison: unfortifiedSpoils.garrisonMen,
        fortGarrison: fortifiedSpoils.garrisonMen
      };
    });

    expect(result.fortGarrison).toBeGreaterThan(result.unfortGarrison * 2);
    expect(result.fortCasualties).toBeGreaterThan(result.unfortCasualties * 2);
  });

test('menText rounds floating point values and raid modal provides Find target input',
  async function ({ page }) {
    var textResult = await page.evaluate(function () {
      var s = FB.state;
      var rawNumber = 1453.0804803426895;
      var rendered = FB.ui._shared.menText(s, rawNumber);
      return {
        hasDecimals: rendered.indexOf('.') >= 0,
        rendered: rendered
      };
    });

    expect(textResult.hasDecimals).toBe(false);
    expect(textResult.rendered).toBe('1453 men');
  });

test('land panel realm host renders current and max capacity when recovering or under population capacity',
  async function ({ page }) {
    var result = await page.evaluate(function () {
      var s = FB.state;
      var p = s.player;
      p.tier = 4;
      p.provinceId = 'london';
      p.provs = ['london'];
      s.dev = s.dev || {};
      s.dev.london = 20;

      // Set population well below the data-driven baseline to simulate under-capacity
      s.population = s.population || { counties: {} };
      var base = FB.countyPopulationBaseline(s, 'london');
      s.population.counties.london = {
        count: Math.max(100, Math.round(base * 0.6 / 100) * 100),
        base: base, natural: 0, migration: 0, losses: 0
      };

      s.owner = s.owner || {};
      s.owner.london = 'player';
      s.realms = s.realms || {};
      s.realms.player = { id: 'player', name: 'Realm of London', alive: true, capital: 'london' };

      // the own-realm card shows the real muster composition: current host
      // (population-factored) against the full-population baseline
      var expectedCur = FB.playerLevy(s);
      var expectedMax = Math.max(FB.playerMaxLevy(s), expectedCur);

      // Render the Land tab for the county
      FB.ui.selectProvince('london');
      var html = document.getElementById('tab-prov').innerHTML;
      return {
        htmlSnippet: html.slice(html.indexOf('Realm host'), html.indexOf('Realm host') + 120),
        expected: '~' + expectedCur + '/' + expectedMax + ' ',
        underCapacity: expectedCur < expectedMax
      };
    });

    expect(result.underCapacity).toBe(true);
    expect(result.htmlSnippet.indexOf('Realm host')).toBe(0);
    expect(result.htmlSnippet).toContain(result.expected);
  });

test('land panel realm host counts the overpopulation bonus in its maximum',
  async function ({ page }) {
    var result = await page.evaluate(function () {
      var s = FB.state;
      var p = s.player;
      p.tier = 4;
      p.provinceId = 'london';
      p.provs = ['london'];
      s.dev = s.dev || {};
      s.dev.london = 20;

      // Overpopulated county: 2.25x the data-driven baseline rides the 1.5 cap
      s.population = s.population || { counties: {} };
      var base = FB.countyPopulationBaseline(s, 'london');
      s.population.counties.london = {
        count: Math.round(base * 2.25 / 100) * 100,
        base: base, natural: 0, migration: 0, losses: 0
      };

      s.owner = s.owner || {};
      s.owner.london = 'player';
      s.realms = s.realms || {};
      s.realms.player = { id: 'player', name: 'Realm of London', alive: true, capital: 'london' };

      var factor = FB.countyPopulationFactor(s, 'london');

      // the own-realm card reads the full muster composition; its maximum
      // never sits below the current host when overpopulation boosts the levy
      var currentHost = FB.playerLevy(s);
      var expectedMax = Math.max(FB.playerMaxLevy(s), currentHost);

      // Fresh out of a raid: the host is inside its rearm window
      s.armyDown = s.armyDown || {};
      s.armyDown.player = s.turn;
      var rearm = FB.rearmScale(s, 'player');
      var expectedCur = Math.round(currentHost * rearm);
      FB.ui.selectProvince('london');
      var rearmHtml = document.getElementById('tab-prov').innerHTML;

      // Fully rearmed again: the display simplifies to the plain maximum
      delete s.armyDown.player;
      FB.ui.selectProvince('london');
      var recoveredHtml = document.getElementById('tab-prov').innerHTML;

      function realmHostValue(html) {
        var i = html.indexOf('Realm host');
        if (i < 0) return '';
        var m = html.slice(i, i + 160).match(/<b>([^<]*)<\/b>/);
        return m ? m[1] : '';
      }
      return {
        rearmValue: realmHostValue(rearmHtml),
        recoveredValue: realmHostValue(recoveredHtml),
        expectedRearm: '~' + expectedCur + '/' + expectedMax + ' men',
        expectedRecovered: '~' + expectedMax + ' men',
        factor: factor
      };
    });

    expect(result.factor).toBeGreaterThan(1);
    expect(result.rearmValue).toBe(result.expectedRearm);
    expect(result.recoveredValue).toBe(result.expectedRecovered);
  });

test('raid defenders use the county share of the realm host, not a flat tithe of realm size',
  async function ({ page }) {
    var result = await page.evaluate(function () {
      var s = FB.state;
      var p = s.player;
      var me = s.chars[p.charId];
      p.tier = 4;
      p.provinceId = 'london';
      p.provs = ['london'];
      me.culture = 'norse';
      me.religion = 'norse_pagan';
      s.dev = s.dev || {};
      s.dev.london = 30;

      // a poor border county adjacent to home, owned by a sprawling kingdom
      var adj = FB.world.adj['london'] || {};
      var targetPid = null;
      for (var nid in adj) {
        var npr = FB.world.byId[nid];
        if (npr && !npr.wasteland) { targetPid = nid; break; }
      }
      s.dev[targetPid] = 3;
      s.owner = s.owner || {};
      s.owner[targetPid] = 'big_realm';
      s.realms = s.realms || {};
      s.realms.big_realm = { id:'big_realm', name:'Great Kingdom', alive:true };
      var assigned = 0;
      for (var j = 0; j < FB.world.provs.length && assigned < 12; j++) {
        var pr2 = FB.world.provs[j];
        if (!pr2 || pr2.wasteland || pr2.id === targetPid || pr2.id === 'london') continue;
        s.owner[pr2.id] = 'big_realm';
        s.dev[pr2.id] = 15;
        assigned++;
      }
      if (FB.invalidateRealmCache) FB.invalidateRealmCache();
      // strip any standing walls from the target (fresh object busts the fort index)
      var plain = {};
      for (var key in (s.buildings || {})) plain[key] = s.buildings[key];
      plain[targetPid] = (plain[targetPid] || []).filter(function (b) { return b.id !== 'walls'; });
      s.buildings = plain;

      var host = FB.realmDefensiveStrength(s, 'big_realm');
      var realmDev = FB.realmStrength(s, 'big_realm');
      var spoils = FB.calculateRaidSpoils(s, targetPid, 'sack', p.charId);
      var expectedShare = Math.round(host * Math.min(1, 3 / realmDev));
      var expectedDef = Math.max(30, 3 * 18 + expectedShare);
      return {
        repelled: !spoils.success,
        garrison: spoils.garrisonMen,
        expectedDef: expectedDef,
        oldFlatTithe: Math.round(host * 0.06),
        realmDev: realmDev
      };
    });

    expect(result.realmDev).toBeGreaterThan(30);
    expect(result.repelled).toBe(false);
    expect(result.garrison).toBe(result.expectedDef);
    // the old flat tithe would have fielded far more men in a poor border county
    expect(result.garrison).toBeLessThan(result.oldFlatTithe);
  });

test('costly raid re-arms from surviving strength, not the shattered floor',
  async function ({ page }) {
    var result = await page.evaluate(function () {
      var s = FB.state;
      var p = s.player;
      var me = s.chars[p.charId];
      p.tier = 4;
      p.provinceId = 'london';
      p.provs = ['london'];
      me.culture = 'norse';
      me.religion = 'norse_pagan';

      // a successful but costly expedition: 55% casualties, 45% march home
      var origCalc = FB.calculateRaidSpoils;
      FB.calculateRaidSpoils = function () {
        return {
          targetPid: 'paris', strategy: 'sack', success: true, victoryGrade: 'costly',
          combatAdvantage: 0.6, stoppedProvince: null, route: ['paris'], marchSkirmishes: [],
          raiderMen: 1000, survivingMen: 450, garrisonMen: 300,
          gold: 30, prestige: 10,
          goods: { provisions: 0, wares: 0, materials: 0, transport: 0, luxuries: 0 },
          popLoss: 100, captives: 40, ruinedBuildings: [], devLoss: false,
          casualties: 550, wounded: false
        };
      };
      try {
        FB.executeRaid(s, 'paris', 'sack', p.charId);
      } finally {
        FB.calculateRaidSpoils = origCalc;
      }

      var scale = FB.rearmScale(s, 'player');
      var survival = s.armyDownSurvival && s.armyDownSurvival.player;

      // a later shattering resets the down-turn and must not inherit the raid's floor
      s.armyDown.player = s.turn + 1;
      var scaleAfterShatter = FB.rearmScale(s, 'player');

      return {
        scale: scale,
        survivalFrac: survival && survival.frac,
        scaleAfterShatter: scaleAfterShatter
      };
    });

    expect(result.survivalFrac).toBeCloseTo(0.45, 5);
    expect(result.scale).toBeCloseTo(0.45, 5);
    expect(result.scaleAfterShatter).toBeCloseTo(0.15, 5);
  });
