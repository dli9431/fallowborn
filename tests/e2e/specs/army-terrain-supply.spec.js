'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'js/armies.js', 'js/logistics.js', 'js/market.js',
  'js/world.js',
  'js/fortifications.js',
  'data/map_data.js',
  'data/counties.js',
  'data/technology.js'
]);

/* Terrain in battle and movement, supply lines, and attrition. These tests
   are authored for the owner-run Playwright harness and deliberately do not
   execute in the authoring flow. */

const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { startDeterministicGame } = require('../support/game/start');

test.use({
  viewport:{ width:390, height:844 },
  hasTouch:true
});

test.beforeEach(async function ({ page }, testInfo) {
  await openGame(page, testInfo);
  await startDeterministicGame(page);
});

test('terrain prices march legs and routes a host around bad going',
  async function ({ page }) {
    const result = await page.evaluate(function () {
      const state = FB.state;
      const originalWorld = FB.world;
      const rid = FB.techRealmId(state, 'player');
      const originalTech = state.realmTech[rid];
      state.realmTech[rid] = {
        completed:[], exposed:[], active:[], progress:{},
        reserve:0, priorities:{}
      };
      FB.world = {
        adj:{ a:{ b:1, d:1 }, b:{ a:1, c:1 }, d:{ a:1, c:1 }, c:{ b:1, d:1 } },
        waterAdj:{ a:{}, b:{}, c:{}, d:{} },
        byId:{
          a:{ id:'a', name:'A', terrain:'farmland' },
          b:{ id:'b', name:'B', terrain:'mountains' },
          c:{ id:'c', name:'C', terrain:'farmland' },
          d:{ id:'d', name:'D', terrain:'farmland' }
        }
      };
      const army = { realm:'player', men:500, at:'a' };
      const farmland = FB.armyLegQuote(state, army, 'a', 'd');
      const mountains = FB.armyLegQuote(state, army, 'a', 'b');
      const route = FB.findArmyPath(state, army, 'c');
      /* an unknown terrain never breaks a quote */
      FB.world.byId.b.terrain = 'lava';
      const unknown = FB.armyLegQuote(state, army, 'a', 'b');
      FB.world = originalWorld;
      state.realmTech[rid] = originalTech;
      return {
        farmland:farmland, mountains:mountains, route:route, unknown:unknown
      };
    });

    expect(result.farmland.totalDays).toBe(6);
    expect(result.mountains.totalDays).toBe(12);
    expect(result.mountains.totalDays).toBeGreaterThan(result.farmland.totalDays);
    expect(result.route).toEqual({ path:['d','c'], totalDays:12, waterLegs:0 });
    expect(result.unknown.totalDays).toBe(6);
  });

test('terrain and supply shape battle power, and the technology data validates',
  async function ({ page }) {
    const result = await page.evaluate(function () {
      const state = FB.state;
      const originalWorld = FB.world;
      const rid = FB.techRealmId(state, 'player');
      const originalTech = state.realmTech[rid];
      function record(completed) {
        state.realmTech[rid] = {
          completed:completed.slice(), exposed:[], active:[], progress:{},
          reserve:0, priorities:{}
        };
      }
      record([]);
      FB.world = {
        adj:{ f:{}, s:{}, m:{} },
        waterAdj:{ f:{}, s:{}, m:{} },
        byId:{
          f:{ id:'f', name:'F', terrain:'forest' },
          s:{ id:'s', name:'S', terrain:'steppe' },
          m:{ id:'m', name:'M', terrain:'mountains' }
        }
      };
      const cavalry = {
        realm:'player', men:800, supply:100,
        units:{ levy:0, arch:0, cav:800, ret:0, mercs:0 }
      };
      const freshForest = FB.armyBattlePower(state, cavalry, 'f');
      const freshSteppe = FB.armyBattlePower(state, cavalry, 's');
      cavalry.supply = 20; // below the low threshold
      const lowForest = FB.armyBattlePower(state, cavalry, 'f');
      cavalry.supply = 0; // starving
      const starvedForest = FB.armyBattlePower(state, cavalry, 'f');
      cavalry.supply = 100;

      const qualityForest = FB.compTerrainQuality(cavalry.units, 800, 'forest');
      const qualitySteppe = FB.compTerrainQuality(cavalry.units, 800, 'steppe');
      const qualityUnknown = FB.compTerrainQuality(cavalry.units, 800, 'lava');
      const qualityNeutral = FB.compQuality(cavalry.units, 800);

      record(['pack_saddles']);
      const oneGrant = FB.techBonus(state, 'supply', 'player');
      record(['pack_saddles', 'wheeled_carts', 'logistics_magazines']);
      const allGrants = FB.techBonus(state, 'supply', 'player');
      FBDATA.tech.__supply_test = { fx:{ supply:0.5 } };
      record(['__supply_test']);
      const capped = FB.techBonus(state, 'supply', 'player');
      delete FBDATA.tech.__supply_test;

      const features = FBDATA.techImpactReviews.features;
      const validation = FB.validateTechnologyData().filter(function (error) {
        return error.indexOf('supply') >= 0 ||
          error.indexOf('field_supply_attrition') >= 0 ||
          error.indexOf('terrain_combat_modifiers') >= 0;
      });

      FB.world = originalWorld;
      state.realmTech[rid] = originalTech;
      return {
        freshForest:freshForest,
        freshSteppe:freshSteppe,
        lowForest:lowForest,
        starvedForest:starvedForest,
        qualityForest:qualityForest,
        qualitySteppe:qualitySteppe,
        qualityUnknown:qualityUnknown,
        qualityNeutral:qualityNeutral,
        oneGrant:oneGrant,
        allGrants:allGrants,
        capped:capped,
        fieldReview:features.field_supply_attrition,
        terrainReview:features.terrain_combat_modifiers,
        validation:validation
      };
    });

    expect(result.freshForest).toBeLessThan(result.freshSteppe);
    expect(result.freshForest / result.freshSteppe).toBeCloseTo(0.6 / 1.15, 8);
    expect(result.lowForest).toBeCloseTo(result.freshForest * 0.9, 8);
    expect(result.starvedForest).toBeCloseTo(result.freshForest * 0.75, 8);
    expect(result.qualityForest).toBeCloseTo(1.2, 8);
    expect(result.qualitySteppe).toBeCloseTo(2.3, 8);
    expect(result.qualityUnknown).toBeCloseTo(result.qualityNeutral, 8);
    expect(result.oneGrant).toBeCloseTo(0.05, 8);
    expect(result.allGrants).toBeCloseTo(0.2, 8);
    expect(result.capped).toBe(0.25);
    expect(result.fieldReview.mode).toBe('soft');
    expect(result.fieldReview.tech).toEqual(
      ['pack_saddles', 'wheeled_carts', 'logistics_magazines']);
    expect(result.terrainReview.mode).toBe('none');
    expect(result.validation).toEqual([]);
  });

test('empty local markets expose terrain and winter consumption without a homeland-distance penalty',
  async function ({ page }) {
    const result = await page.evaluate(function () {
      const state = FB.state, pid = state.player.provinceId;
      const host = { realm:'player', men:1000, units:{ levy:1000 }, at:pid, supply:50 };
      FB.game.auto.buySupplies = false;
      state.date.season = 1;
      const summer = FB.armyProvisionUse(state, host);
      state.date.season = 3;
      const winter = FB.armyProvisionUse(state, host);
      const status = FB.hostSupplyStatus(state, host);
      return { summer:summer, winter:winter, days:status.daysToAttrition };
    });
    expect(result.summer).toBeGreaterThan(0);
    expect(result.winter / result.summer).toBeCloseTo(1.5, 8);
    expect(result.days).toBeGreaterThan(0);
  });

test('daily troop replenishment redraws the map on a bounded cadence',
  async function ({ page }) {
    const result = await page.evaluate(function () {
      const state = FB.state;
      const originalTurn = state.turn;
      const originalWar = state.player.war;
      const originalHosts = state.armies;
      const originalDown = state.armyDown;
      const originalCohorts = state.armyCohorts;
      const originalAuto = FB.game.auto.hosts;
      const originalRequest = FB.map.request;
      const home = state.player.provinceId;
      state.holder = state.holder || {};
      const originalHolder = state.holder[home];
      const playerSovereign = FB.playerRealmId(state);
      let enemy = null;
      for (const realmId in state.realms) {
        const realm = state.realms[realmId];
        if (realmId !== playerSovereign && realmId !== 'player' &&
            realm && realm.alive && !realm.liege) {
          enemy = realmId;
          break;
        }
      }

      state.player.war = { enemy:enemy, defending:true };
      state.armyDown = {};
      for (const realmId in state.realms) state.armyDown[realmId] = state.turn;
      state.armyCohorts = {};
      state.holder[home] = 'player';
      FB.game.auto.hosts = 'manual';
      const host = {
        id:'reinforcement_render_host', realm:'player', men:400, size:1000,
        units:{ levy:400, arch:0, cav:0, ret:0, mercs:0 },
        at:home, from:home,
        moveLeft:0, path:[], goal:null, supply:100
      };
      state.armies = [host];

      let requests = 0;
      FB.map.request = function () { requests++; };
      for (let day = 0; day < 30; day++) {
        state.turn++;
        FB.armyTick(state);
      }

      const out = {
        enemy:enemy,
        men:host.men,
        requests:requests
      };
      FB.map.request = originalRequest;
      state.turn = originalTurn;
      state.player.war = originalWar;
      state.armies = originalHosts;
      state.armyDown = originalDown;
      state.armyCohorts = originalCohorts;
      if (originalHolder === undefined) delete state.holder[home];
      else state.holder[home] = originalHolder;
      FB.game.auto.hosts = originalAuto;
      return out;
    });

    expect(result.enemy).toBeTruthy();
    expect(result.men).toBe(1000);
    /* The five-day cadence yields six paints over thirty days, or seven when
       the final completion falls between cadence days. The old hot path
       requested all thirty daily repaints while the host stood still. */
    expect(result.requests).toBeGreaterThanOrEqual(6);
    expect(result.requests).toBeLessThanOrEqual(7);
  });

test('the selected host readout reports its supply in the Land tab',
  async function ({ page }) {
    await page.evaluate(function () {
      const state = FB.state;
      const playerSovereign = FB.playerRealmId(state);
      let enemy = null;
      const sovereigns = [];
      for (const realmId in state.realms) {
        const realm = state.realms[realmId];
        if (realmId !== 'player' && realm && realm.alive && !realm.liege) {
          sovereigns.push(realmId);
        }
      }
      sovereigns.sort();
      for (let i = 0; i < sovereigns.length; i++) {
        if (sovereigns[i] !== playerSovereign) { enemy = sovereigns[i]; break; }
      }
      const province = FB.realmProvinces(state, enemy)[0];
      const host = {
        id:'supply_readout_host', realm:'player', men:900, size:900,
        units:{ levy:900, arch:0, cav:0, ret:0, mercs:0 },
        at:province, from:province, moveLeft:0, path:[], goal:null, supply:20
      };
      state.armies = [host];
      FB.selectArmy(host.id);
      FB.ui.showTab('prov');
      FB.ui.refresh();
    });
    const panel = page.locator('#tab-prov');
    await expect(panel).toContainText('Supply & Upkeep');
    await expect(panel).toContainText('Low (20%)');
    await expect(panel.locator('[data-host-provision]')).not.toBeEmpty();
  });
