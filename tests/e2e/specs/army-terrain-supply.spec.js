'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'js/armies.js',
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

test('a host drains supply abroad, starves at 0, and refills at home',
  async function ({ page }) {
    const result = await page.evaluate(function () {
      const state = FB.state;
      const originalWorld = FB.world;
      const originalWar = state.player.war;
      const originalHosts = state.armies;
      const originalDown = state.armyDown;
      const originalAuto = FB.game.auto.hosts;
      const originalSeason = state.date.season;
      const rid = FB.techRealmId(state, 'player');
      const originalTech = state.realmTech[rid];
      state.realmTech[rid] = {
        completed:[], exposed:[], active:[], progress:{},
        reserve:0, priorities:{}
      };

      const playerSovereign = FB.playerRealmId(state);
      const sovereigns = [];
      for (const realmId in state.realms) {
        const realm = state.realms[realmId];
        if (realmId !== 'player' && realm && realm.alive && !realm.liege) {
          sovereigns.push(realmId);
        }
      }
      sovereigns.sort();
      let enemy = null;
      for (let i = 0; i < sovereigns.length; i++) {
        if (sovereigns[i] !== playerSovereign) { enemy = sovereigns[i]; break; }
      }
      for (const realmId in state.realms) {
        if (state.realms[realmId]) state.realms[realmId].war = null;
      }
      state.armyDown = {};
      FB.game.auto.hosts = 'manual';

      FB.world = {
        adj:{ a:{ e1:1 }, e1:{ a:1, e2:1 }, e2:{ e1:1, e3:1 }, e3:{ e2:1 } },
        waterAdj:{ a:{}, e1:{}, e2:{}, e3:{} },
        byId:{
          a:{ id:'a', name:'A', cx:0, cy:0, terrain:'farmland' },
          e1:{ id:'e1', name:'E1', cx:20, cy:0, terrain:'farmland' },
          e2:{ id:'e2', name:'E2', cx:40, cy:0, terrain:'farmland' },
          e3:{ id:'e3', name:'E3', cx:60, cy:0, terrain:'farmland' }
        }
      };
      const keptOwner = {}, keptHolder = {};
      ['a', 'e1', 'e2', 'e3'].forEach(function (pid) {
        keptOwner[pid] = state.owner[pid];
        keptHolder[pid] = state.holder ? state.holder[pid] : undefined;
      });
      state.holder = state.holder || {};
      state.holder.a = 'player'; // home ground
      state.owner.e1 = enemy;
      state.owner.e2 = enemy;
      state.owner.e3 = enemy;
      state.player.war = { enemy:enemy, defending:true };

      const host = {
        id:'supply_host', realm:'player', men:1000, size:1000,
        units:{ levy:1000, arch:0, cav:0, ret:0, mercs:0 },
        at:'e3', from:'e3', moveLeft:0, path:[], goal:null, supply:50
      };
      state.armies = [host];

      /* deep in enemy land (three counties past the frontier), out of winter:
         1.2 × terrain 1 × (1 + 0.25 × 3) = 2.1 supply per day */
      state.date.season = 1;
      FB.armyTick(state);
      const afterDrain = host.supply;

      /* winter bites harder */
      host.supply = 50;
      state.date.season = 3;
      FB.armyTick(state);
      const afterWinter = host.supply;

      /* the well runs dry: attrition gnaws daily, the news fires once */
      host.supply = 1;
      state.date.season = 1;
      FB.armyTick(state);
      const starving = { supply:host.supply, men:host.men };
      FB.armyTick(state);
      const starvingAgain = { supply:host.supply, men:host.men };
      const starvingNews = state.log.filter(function (entry) {
        return entry.msg && entry.msg.key === 'news.army.host_starving';
      }).length;

      const abroadStatus = FB.hostSupplyStatus(state, host);

      /* home ground: a starving host eats before it fills its ranks */
      host.at = 'a';
      host.from = 'a';
      FB.armyTick(state);
      const firstHome = { supply:host.supply, men:host.men };
      FB.armyTick(state);
      const secondHome = { supply:host.supply, men:host.men };
      const homeStatus = FB.hostSupplyStatus(state, host);

      state.date.season = originalSeason;
      state.armies = originalHosts;
      state.armyDown = originalDown;
      state.player.war = originalWar;
      FB.game.auto.hosts = originalAuto;
      state.realmTech[rid] = originalTech;
      ['a', 'e1', 'e2', 'e3'].forEach(function (pid) {
        if (keptOwner[pid] === undefined) delete state.owner[pid];
        else state.owner[pid] = keptOwner[pid];
        if (keptHolder[pid] === undefined) delete state.holder[pid];
        else state.holder[pid] = keptHolder[pid];
      });
      FB.world = originalWorld;
      return {
        enemy:enemy,
        afterDrain:afterDrain,
        afterWinter:afterWinter,
        starving:starving,
        starvingAgain:starvingAgain,
        starvingNews:starvingNews,
        abroadStatus:abroadStatus,
        firstHome:firstHome,
        secondHome:secondHome,
        homeStatus:homeStatus
      };
    });

    expect(result.enemy).toBeTruthy();
    expect(result.afterDrain).toBeCloseTo(47.9, 8);
    expect(result.afterWinter).toBeCloseTo(46.85, 8);
    expect(result.starving.supply).toBe(0);
    expect(result.starving.men).toBe(990);
    expect(result.starvingAgain.men).toBe(980);
    expect(result.starvingNews).toBe(1);
    expect(result.abroadStatus.status).toBe('starving');
    expect(result.abroadStatus.friendly).toBe(false);
    expect(result.firstHome.men).toBe(980); // 0 supply: no reinforcement
    expect(result.firstHome.supply).toBe(3);
    expect(result.secondHome.men).toBe(1000); // fed again: ranks refill
    expect(result.secondHome.supply).toBe(6);
    expect(result.homeStatus.status).toBe('low');
    expect(result.homeStatus.friendly).toBe(true);
    expect(result.homeStatus.daysToAttrition).toBeNull();
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
    await expect(panel).toContainText('Supply:');
    await expect(panel).toContainText('Low');
    await expect(panel).toContainText('days before hunger bites');
  });
