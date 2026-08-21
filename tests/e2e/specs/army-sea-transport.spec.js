'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'js/armies.js',
  'js/travel.js',
  'js/ui_panels.js',
  'js/world.js',
  'data/map_data.js'
]);

const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { startDeterministicGame } = require('../support/game/start');

test.use({
  viewport:{ width:390, height:844 },
  hasTouch:true
});

async function startGame(page, testInfo) {
  await openGame(page, testInfo);
  await startDeterministicGame(page);
}

test('validates, bookmarks, and compiles crossing classes separately from adjacency',
  async function ({ page }, testInfo) {
    await startGame(page, testInfo);

    const result = await page.evaluate(function () {
      function canonical(pair) {
        return pair[0] < pair[1]
          ? pair[0] + '|' + pair[1]
          : pair[1] + '|' + pair[0];
      }
      function definition(overrides) {
        const source = FB.bookmark('867');
        const copy = {};
        for (const key in source) copy[key] = source[key];
        copy.id = 'sea_validation';
        for (const key in (overrides || {})) copy[key] = overrides[key];
        return copy;
      }

      const classified = {};
      for (const pair of FBDATA.straits) {
        const key = canonical(pair);
        classified[key] = FBDATA.crossingClasses[key];
      }
      let landEdge = null;
      for (const from in FB.world.adj) {
        for (const to in FB.world.adj[from]) {
          if (!FB.waterCrossing(from, to)) {
            landEdge = [from, to];
            break;
          }
        }
        if (landEdge) break;
      }

      const optional = definition();
      delete optional.crossingClasses;
      const reversed = definition({
        crossingClasses:{ 'canterbury|boulogne':'narrow' }
      });
      const orphaned = definition({
        crossingClasses:{ 'baghdad|nishapur':'coastal' }
      });
      const unknownCounty = definition({
        crossingClasses:{ 'missing_county|tunis':'open' }
      });
      const unknownClass = definition({
        crossingClasses:{ 'boulogne|canterbury':'oceanic' }
      });

      return {
        straitAdjacency:FB.world.adj.boulogne.canterbury,
        straitWater:FB.waterCrossing('boulogne', 'canterbury'),
        landEdge:landEdge,
        landWater:FB.waterCrossing(landEdge[0], landEdge[1]),
        allClassified:Object.keys(classified).length === FBDATA.straits.length &&
          Object.keys(classified).every(function (key) {
            return ['narrow','coastal','open'].indexOf(classified[key]) >= 0;
          }),
        bookmark867:FBDATA.bookmarks['867'].crossingClasses[
          'boulogne|canterbury'],
        bookmark1066:FBDATA.bookmarks['1066'].crossingClasses[
          'palermo|tunis'],
        optionalErrors:FB.validateBookmark(optional).filter(function (error) {
          return error.indexOf('crossing') >= 0;
        }),
        reversed:FB.validateBookmark(reversed),
        orphaned:FB.validateBookmark(orphaned),
        unknownCounty:FB.validateBookmark(unknownCounty),
        unknownClass:FB.validateBookmark(unknownClass)
      };
    });

    expect(result.straitAdjacency).toBe(1);
    expect(result.straitWater).toBe('narrow');
    expect(result.landEdge).toHaveLength(2);
    expect(result.landWater).toBeNull();
    expect(result.allClassified).toBe(true);
    expect(result.bookmark867).toBe('narrow');
    expect(result.bookmark1066).toBe('open');
    expect(result.optionalErrors).toEqual([]);
    expect(result.reversed.join('\n')).toContain('is not canonical');
    expect(result.orphaned.join('\n')).toContain('does not reference a strait');
    expect(result.unknownCounty.join('\n')).toContain('references a missing province');
    expect(result.unknownClass.join('\n')).toContain('has invalid class oceanic');
  });

test('an unclassified atomic bookmark defaults its water edges to narrow',
  async function ({ page }, testInfo) {
    await startGame(page, testInfo);

    const result = await page.evaluate(function () {
      return new Promise(function (resolve) {
        const source = FB.bookmark('867');
        const definition = {};
        for (const key in source) definition[key] = source[key];
        definition.id = 'sea_default';
        definition.crossingClasses = {};
        FBDATA.bookmarks.sea_default = definition;
        FB.activateBookmark('sea_default', function () {}, function (error) {
          resolve({
            error:error && error.message,
            active:FB.activeBookmarkId,
            installed:FBDATA.crossingClasses,
            crossing:FB.waterCrossing('boulogne', 'canterbury'),
            symmetric:FB.world.waterAdj.canterbury.boulogne,
            adjacent:FB.world.adj.boulogne.canterbury
          });
        });
      });
    });

    expect(result.error).toBeNull();
    expect(result.active).toBe('sea_default');
    expect(result.installed).toEqual({});
    expect(result.crossing).toBe('narrow');
    expect(result.symmetric).toBe('narrow');
    expect(result.adjacent).toBe(1);
  });

test('technology uses sovereign max capacity, caps sea speed, and leaves land speed alone',
  async function ({ page }, testInfo) {
    await startGame(page, testInfo);

    const result = await page.evaluate(function () {
      const state = FB.state;
      function record(rid, completed) {
        state.realmTech[rid] = {
          completed:completed.slice(), exposed:[], active:[],
          progress:{}, reserve:0, priorities:{}
        };
      }

      const playerRid = FB.techRealmId(state, 'player');
      record(playerRid, []);
      const base = FB.techSeaTransportCapacity(state, 'player');
      const landBase = FB.techArmyMarchDays(state, 'player');

      record(playerRid, ['square_sail','coastal_piloting','longships']);
      const max = FB.techSeaTransportCapacity(state, 'player');
      const landWithSails = FB.techArmyMarchDays(state, 'player');

      let vassal = null;
      for (const rid in state.realms) {
        if (state.realms[rid] && state.realms[rid].alive &&
            state.realms[rid].liege) {
          vassal = rid;
          break;
        }
      }
      const sovereign = FB.techRealmId(state, vassal);
      record(sovereign, ['convoy_systems']);
      const vassalCapacity = FB.techSeaTransportCapacity(state, vassal);

      FBDATA.tech.__sea_speed_a = { fx:{ seaMovement:0.3 } };
      FBDATA.tech.__sea_speed_b = { fx:{ seaMovement:0.3 } };
      record(playerRid, ['__sea_speed_a','__sea_speed_b']);
      const cappedSpeed = FB.techBonus(state, 'seaMovement', 'player');
      delete FBDATA.tech.__sea_speed_a;
      delete FBDATA.tech.__sea_speed_b;

      let coastal = null, landlocked = null;
      for (const rid in state.realms) {
        const realm = state.realms[rid];
        if (!realm || !realm.alive || realm.liege) continue;
        const provinces = FB.realmProvinces(state, rid);
        const isCoastal = provinces.some(function (pid) {
          return FB.world.byId[pid] && FB.world.byId[pid].coastal;
        });
        if (isCoastal && !coastal) coastal = rid;
        if (!isCoastal && !landlocked) landlocked = rid;
      }

      const square = FBDATA.tech.square_sail;
      const capacity = square.fx.seaTransport;
      record(coastal, []);
      const coastalWith = FB.techAIScore(state, 'square_sail', coastal);
      delete square.fx.seaTransport;
      const coastalWithout = FB.techAIScore(state, 'square_sail', coastal);
      square.fx.seaTransport = capacity;

      record(landlocked, []);
      const landlockedWith = FB.techAIScore(state, 'square_sail', landlocked);
      delete square.fx.seaTransport;
      const landlockedWithout = FB.techAIScore(
        state, 'square_sail', landlocked);
      square.fx.seaTransport = capacity;

      square.fx.seaTransport = 400.5;
      const invalidCapacity = FB.validateTechnologyData().filter(function (error) {
        return error.indexOf('square_sail') >= 0 &&
          error.indexOf('positive integer') >= 0;
      });
      square.fx.seaTransport = capacity;

      return {
        base:base,
        max:max,
        landBase:landBase,
        landWithSails:landWithSails,
        vassal:vassal,
        sovereign:sovereign,
        vassalCapacity:vassalCapacity,
        cappedSpeed:cappedSpeed,
        coastalRatio:coastalWith / coastalWithout,
        landlockedRatio:landlockedWith / landlockedWithout,
        invalidCapacity:invalidCapacity,
        validation:FB.validateTechnologyData().filter(function (error) {
          return error.indexOf('seaTransport') >= 0 ||
            error.indexOf('seaMovement') >= 0;
        })
      };
    });

    expect(result.base).toBe(250);
    expect(result.max).toBe(1500);
    expect(result.landWithSails).toBe(result.landBase);
    expect(result.vassal).toBeTruthy();
    expect(result.sovereign).toBeTruthy();
    expect(result.vassalCapacity).toBe(8000);
    expect(result.cappedSpeed).toBe(0.4);
    expect(result.coastalRatio).toBeCloseTo(1.25, 8);
    expect(result.landlockedRatio).toBeCloseTo(0.5, 8);
    expect(result.invalidCapacity).toHaveLength(1);
    expect(result.validation).toEqual([]);
  });

test('quotes land and every crossing class at capacity boundaries and campaign speed',
  async function ({ page }, testInfo) {
    await startGame(page, testInfo);

    const result = await page.evaluate(function () {
      const state = FB.state;
      const originalWorld = FB.world;
      const originalCampaign = FB.campaignHostModBonus;
      const rid = FB.techRealmId(state, 'player');
      state.realmTech[rid] = {
        completed:[], exposed:[], active:[], progress:{},
        reserve:0, priorities:{}
      };
      FB.world = {
        adj:{ a:{ b:1, n:1, c:1, o:1 }, b:{ a:1 },
          n:{ a:1 }, c:{ a:1 }, o:{ a:1 } },
        waterAdj:{
          a:{ n:'narrow', c:'coastal', o:'open' },
          b:{}, n:{ a:'narrow' }, c:{ a:'coastal' }, o:{ a:'open' }
        },
        byId:{
          a:{ id:'a', name:'A' }, b:{ id:'b', name:'B' },
          n:{ id:'n', name:'N' }, c:{ id:'c', name:'C' },
          o:{ id:'o', name:'O' }
        }
      };

      const army = { realm:'player', men:500, at:'a' };
      const land = FB.armyLegQuote(state, army, 'a', 'b');
      const narrowAt = FB.armyLegQuote(state, army, 'a', 'n');
      army.men = 501;
      const narrowAbove = FB.armyLegQuote(state, army, 'a', 'n');
      army.men = 251;
      const coastal = FB.armyLegQuote(state, army, 'a', 'c');
      army.men = 189;
      const open = FB.armyLegQuote(state, army, 'a', 'o');

      FB.campaignHostModBonus = function (liveState, key) {
        return key === 'marchSpeed' ? 0.5 : 0;
      };
      const campaignLand = FB.armyLegQuote(state, army, 'a', 'b');
      const campaignOpen = FB.armyLegQuote(state, army, 'a', 'o');

      FB.world = originalWorld;
      FB.campaignHostModBonus = originalCampaign;
      return {
        land:land,
        narrowAt:narrowAt,
        narrowAbove:narrowAbove,
        coastal:coastal,
        open:open,
        campaignLand:campaignLand,
        campaignOpen:campaignOpen
      };
    });

    expect(result.land).toMatchObject({
      water:false, cycles:1, totalDays:6
    });
    expect(result.narrowAt).toMatchObject({
      water:true, crossingClass:'narrow', nationalCapacity:250,
      effectiveCapacity:500, cycles:1, cycleDays:2, totalDays:2
    });
    expect(result.narrowAbove.cycles).toBe(2);
    expect(result.narrowAbove.totalDays).toBe(4);
    expect(result.coastal).toMatchObject({
      effectiveCapacity:250, cycles:2, cycleDays:4, totalDays:8
    });
    expect(result.open).toMatchObject({
      effectiveCapacity:188, cycles:2, cycleDays:7, totalDays:14
    });
    expect(result.campaignLand.totalDays).toBe(4);
    expect(result.campaignOpen.cycleDays).toBe(5);
    expect(result.campaignOpen.totalDays).toBe(10);
  });

test('weighted routing changes with capacity, invalidates per-world caches, and stays stable',
  async function ({ page }, testInfo) {
    await startGame(page, testInfo);

    const result = await page.evaluate(function () {
      const state = FB.state;
      const originalWorld = FB.world;
      const rid = FB.techRealmId(state, 'player');
      function record(completed) {
        state.realmTech[rid] = {
          completed:completed.slice(), exposed:[], active:[],
          progress:{}, reserve:0, priorities:{}
        };
      }
      FB.world = {
        adj:{
          a:{ d:1, b:1 }, b:{ a:1, d:1 }, d:{ a:1, b:1 },
          t:{ c:1, b2:1 }, c:{ t:1, z:1 },
          b2:{ t:1, z:1 }, z:{ c:1, b2:1 }
        },
        waterAdj:{
          a:{ d:'open' }, d:{ a:'open' }, b:{},
          t:{}, c:{}, b2:{}, z:{}
        },
        byId:{
          a:{ id:'a' }, b:{ id:'b' }, d:{ id:'d' },
          t:{ id:'t' }, c:{ id:'c' }, b2:{ id:'b2' }, z:{ id:'z' }
        }
      };
      const army = { realm:'player', men:1500, at:'a' };
      FB.setRngState(123456789);
      const before = FB.getRngState();

      record([]);
      const low = FB.findArmyPath(state, army, 'd');
      const plain = FB.findPath('a', 'd');
      record(['convoy_systems']);
      const high = FB.findArmyPath(state, army, 'd');

      army.at = 't';
      const tie = FB.findArmyPath(state, army, 'z');

      /* Reuse the same endpoint ids in a replacement world. Cached neighbors
         from the first graph would miss this new direct edge unless the
         per-world route caches invalidate by world identity. */
      FB.world = {
        adj:{ t:{ z:1 }, z:{ t:1 } },
        waterAdj:{ t:{}, z:{} },
        byId:{ t:{ id:'t' }, z:{ id:'z' } }
      };
      const replaced = FB.findArmyPath(state, army, 'z');
      const after = FB.getRngState();
      FB.world = originalWorld;
      return {
        low:low, high:high, tie:tie, replaced:replaced, plain:plain,
        before:before, after:after
      };
    });

    expect(result.low).toEqual({
      path:['b','d'], totalDays:12, waterLegs:0
    });
    expect(result.high).toEqual({
      path:['d'], totalDays:7, waterLegs:1
    });
    expect(result.tie).toEqual({
      path:['b2','z'], totalDays:12, waterLegs:0
    });
    expect(result.replaced).toEqual({
      path:['z'], totalDays:6, waterLegs:0
    });
    expect(result.plain).toEqual(['d']);
    expect(result.after).toBe(result.before);
  });

test('AI, player automation, prey hunts, and battle routs share weighted timing',
  async function ({ page }, testInfo) {
    await startGame(page, testInfo);

    const result = await page.evaluate(function () {
      const state = FB.state;
      const originalWorld = FB.world;
      const originalAuto = {
        hosts:FB.game.auto.hosts,
        style:FB.game.auto.style
      };
      const originalRf = FB.rf;
      const sovereigns = [];
      for (const rid in state.realms) {
        const realm = state.realms[rid];
        if (rid !== 'player' && realm && realm.alive && !realm.liege) {
          sovereigns.push(rid);
        }
      }
      sovereigns.sort();
      const first = sovereigns[0], second = sovereigns[1];
      const firstCapital = state.realms[first].capital;
      const secondCapital = state.realms[second].capital;
      const playerWar = state.player.war;
      for (const rid in state.realms) {
        if (state.realms[rid]) state.realms[rid].war = null;
      }
      state.player.war = null;
      state.armyDown = {};
      FB.world = {
        adj:{
          a:{ d:1, b:1 }, b:{ a:1, d:1 }, d:{ a:1, b:1 }
        },
        waterAdj:{ a:{ d:'open' }, d:{ a:'open' }, b:{} },
        byId:{
          a:{ id:'a', name:'Alpha', cx:0, cy:0 },
          b:{ id:'b', name:'Beta', cx:50, cy:50 },
          d:{ id:'d', name:'Delta', cx:100, cy:0 }
        }
      };
      state.realms[first].capital = 'a';
      state.realms[second].capital = 'd';
      function clearTech(rid) {
        state.realmTech[FB.techRealmId(state, rid)] = {
          completed:[], exposed:[], active:[], progress:{},
          reserve:0, priorities:{}
        };
      }
      clearTech(first);
      clearTech(second);
      clearTech('player');
      function host(id, realm, men, at) {
        return {
          id:id, realm:realm, men:men, size:men,
          at:at, from:at, moveLeft:0, path:[], goal:null
        };
      }

      state.realms[first].war = { enemy:second };
      const ai = host('ai_first', first, 1500, 'a');
      const aiEnemy = host('ai_second', second, 1500, 'd');
      state.armies = [ai, aiEnemy];
      FB.armyTick(state);
      const aiRoute = {
        path:ai.path.slice(), moveLeft:ai.moveLeft
      };

      state.realms[first].war = null;
      state.realms[second].war = null;
      state.player.war = { enemy:second, defending:false, target:'d' };
      FB.game.auto.hosts = 'manual';
      const hunter = host('player_hunt', 'player', 1500, 'a');
      hunter.huntPrey = second;
      const hunted = host('hunt_target', second, 1500, 'd');
      state.armies = [hunter, hunted];
      FB.armyTick(state);
      const huntRoute = {
        path:hunter.path.slice(), moveLeft:hunter.moveLeft
      };

      FB.game.auto.hosts = 'off';
      FB.game.auto.style = 'bold';
      const automated = host('player_auto', 'player', 10000, 'a');
      const autoEnemy = host('auto_target', second, 100, 'd');
      state.armies = [automated, autoEnemy];
      FB.armyTick(state);
      const automatedRoute = {
        path:automated.path.slice(), moveLeft:automated.moveLeft
      };

      state.player.war = null;
      FB.game.auto.hosts = 'manual';
      state.realms[first].war = { enemy:second };
      state.realms[second].capital = 'a';
      /* Keep this a rout rather than the separately covered overrun/stack-wipe
         branch, so the retreat path and its first weighted leg remain live. */
      const winner = host('rout_winner', first, 1500, 'd');
      const loser = host('rout_loser', second, 1000, 'd');
      state.armies = [winner, loser];
      FB.setRngState(987654321);
      FB.rf = function () { return 1; };
      FB.armyTick(state);
      FB.rf = originalRf;
      const routed = state.armies.filter(function (army) {
        return army.id === 'rout_loser';
      })[0];
      const routRoute = routed ? {
        broken:routed.broken,
        path:routed.path.slice(),
        moveLeft:routed.moveLeft
      } : null;

      state.realms[first].capital = firstCapital;
      state.realms[second].capital = secondCapital;
      state.realms[first].war = null;
      state.realms[second].war = null;
      state.player.war = playerWar;
      FB.game.auto.hosts = originalAuto.hosts;
      FB.game.auto.style = originalAuto.style;
      FB.rf = originalRf;
      FB.world = originalWorld;
      return {
        aiRoute:aiRoute,
        huntRoute:huntRoute,
        automatedRoute:automatedRoute,
        routRoute:routRoute
      };
    });

    expect(result.aiRoute).toEqual({
      path:['b','d'], moveLeft:5
    });
    expect(result.huntRoute).toEqual({
      path:['b','d'], moveLeft:5
    });
    expect(result.automatedRoute).toEqual({
      path:['b','d'], moveLeft:5
    });
    expect(result.routRoute).not.toBeNull();
    expect(result.routRoute.broken).toEqual(expect.any(Number));
    expect(result.routRoute.path).toEqual(['b','a']);
    expect(result.routRoute.moveLeft).toBe(6);
  });

test('saved countdowns survive reload and new orders requote current technology and allegiance',
  async function ({ page }, testInfo) {
    await startGame(page, testInfo);

    const result = await page.evaluate(function () {
      const state = FB.state;
      const originalWorld = FB.world;
      FB.world = {
        adj:{
          a:{ b:1 }, b:{ a:1, c:1 }, c:{ b:1 }, z:{}
        },
        waterAdj:{
          a:{ b:'open' }, b:{ a:'open' }, c:{}, z:{}
        },
        byId:{
          a:{ id:'a' }, b:{ id:'b' }, c:{ id:'c' }, z:{ id:'z' }
        }
      };
      const playerRid = FB.techRealmId(state, 'player');
      state.realmTech[playerRid] = {
        completed:[], exposed:[], active:[], progress:{},
        reserve:0, priorities:{}
      };
      const saved = JSON.stringify({
        realm:'player', men:1200, at:'a', from:'a',
        path:['b'], goal:'b', moveLeft:19
      });
      const army = JSON.parse(saved);
      state.realmTech[playerRid] = {
        completed:['convoy_systems'], exposed:[], active:[],
        progress:{}, reserve:0, priorities:{}
      };

      const rerouted = FB.orderArmy(state, army, 'c');
      const afterTechnology = {
        next:army.path[0], remainder:army.path.slice(1),
        moveLeft:army.moveLeft, from:army.from
      };

      let vassal = null;
      for (const rid in state.realms) {
        if (state.realms[rid] && state.realms[rid].alive &&
            state.realms[rid].liege) {
          vassal = rid;
          break;
        }
      }
      army.realm = vassal;
      FB.orderArmy(state, army, 'c');
      const afterAllegiance = army.moveLeft;

      const failed = FB.orderArmy(state, army, 'z');
      const afterFailure = {
        path:army.path.slice(), goal:army.goal, moveLeft:army.moveLeft
      };
      const halted = FB.orderArmy(state, army, 'a');
      const afterHalt = {
        path:army.path.slice(), goal:army.goal, moveLeft:army.moveLeft
      };
      FB.world = originalWorld;
      return {
        rerouted:rerouted,
        afterTechnology:afterTechnology,
        afterAllegiance:afterAllegiance,
        failed:failed,
        afterFailure:afterFailure,
        halted:halted,
        afterHalt:afterHalt
      };
    });

    expect(result.rerouted).toBe(true);
    expect(result.afterTechnology).toEqual({
      next:'b', remainder:['c'], moveLeft:7, from:'a'
    });
    expect(result.afterAllegiance).toBe(19);
    expect(result.failed).toBe(false);
    expect(result.afterFailure).toEqual({
      path:['b'], goal:'b', moveLeft:19
    });
    expect(result.halted).toBe(true);
    expect(result.afterHalt).toEqual({
      path:[], goal:null, moveLeft:0
    });
  });

test('technology and host UI explain sea effects with pointer and keyboard parity',
  async function ({ page }, testInfo) {
    await startGame(page, testInfo);

    await page.evaluate(function () {
      FB.state.player.tier = 3;
      FB.ui.showTechDetail('convoy_systems');
    });
    await expect(page.locator('#genmodal')).toContainText(
      'Sea transport capacity: up to');
    await expect(page.locator('#genmodal')).toContainText(/8,?000 men/);

    await page.evaluate(function () {
      FB.ui.showTechDetail('naval_logbooks');
    });
    await expect(page.locator('#genmodal')).toContainText('sea-crossing speed');

    await page.evaluate(function () {
      FB.ui.showTechDetail('road_surveys');
    });
    await expect(page.locator('#genmodal')).toContainText(
      'overland army movement speed');

    const feedback = await page.evaluate(function () {
      FB.ui.closeModal();
      const state = FB.state;
      const originalWorld = FB.world;
      const originalToast = FB.ui.toast;
      const rid = FB.techRealmId(state, 'player');
      state.realmTech[rid] = {
        completed:['convoy_systems'], exposed:[], active:[],
        progress:{}, reserve:0, priorities:{}
      };
      FB.world = {
        adj:{
          a:{ d:1, b:1 }, b:{ a:1, d:1 }, d:{ a:1, b:1 }
        },
        waterAdj:{ a:{ d:'open' }, d:{ a:'open' }, b:{} },
        byId:{
          a:{ id:'a', name:'Alpha', cx:0, cy:0 },
          b:{ id:'b', name:'Beta', cx:50, cy:50 },
          d:{ id:'d', name:'Delta', cx:100, cy:0 }
        },
        provs:[]
      };
      const messages = [];
      FB.ui.toast = function (text, params) {
        messages.push(FB.T(text, params));
      };
      function order(pointer) {
        const host = {
          id:'host_' + pointer, realm:'player', men:1500, size:1500,
          at:'a', from:'a', moveLeft:0, path:[], goal:null
        };
        state.armies = [host];
        FB.selectArmy(host.id);
        if (pointer) {
          FB.armyTap(state, FB.world.byId.d, 100, 0);
        } else {
          FB.armyTap(state, FB.world.byId.d);
        }
        return { path:host.path.slice(), moveLeft:host.moveLeft };
      }
      const keyboard = order(false);
      const pointer = order(true);

      const landHost = {
        id:'host_land', realm:'player', men:1500, size:1500,
        at:'a', from:'a', moveLeft:0, path:[], goal:null
      };
      state.armies = [landHost];
      FB.selectArmy(landHost.id);
      FB.armyTap(state, FB.world.byId.b);
      const landMessage = messages[messages.length - 1];

      FB.ui.toast = originalToast;
      FB.world = originalWorld;
      return {
        keyboard:keyboard,
        pointer:pointer,
        waterMessage:messages[0],
        pointerMessage:messages[1],
        landMessage:landMessage
      };
    });

    expect(feedback.keyboard).toEqual(feedback.pointer);
    expect(feedback.waterMessage).toBe(feedback.pointerMessage);
    expect(feedback.waterMessage).toContain('about 7 days');
    expect(feedback.waterMessage).toContain('1 water crossing');
    expect(feedback.waterMessage).toMatch(/6,?000 men per cycle/);
    expect(feedback.waterMessage).toContain('needs 1 cycle');
    expect(feedback.landMessage).toContain('about 6 days');
    expect(feedback.landMessage).not.toContain('water crossing');
    expect(feedback.landMessage).not.toContain('capacity');

    await page.evaluate(function () {
      const state = FB.state;
      const host = {
        id:'selected_water_host', realm:'player', men:900, size:900,
        at:'canterbury', from:'canterbury', moveLeft:11,
        path:['boulogne'], goal:'boulogne'
      };
      state.armies = [host];
      FB.selectArmy(host.id);
      FB.ui.selectProvince(host.at);
      FB.ui.refresh();
    });
    const status = page.locator('#land-war-card .land-kv').filter({
      hasText:'Status'
    }).first();
    await expect(status).toContainText('Preparing the crossing to Boulogne');
    await expect(status).toContainText('11 days remaining');
    await expect(status).not.toContainText('at sea');

    const box = await status.boundingBox();
    expect(box).not.toBeNull();
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(390);
  });
