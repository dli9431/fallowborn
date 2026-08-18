'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'js/armies.js',
  'js/world.js',
  'js/events.js',
  'js/fortifications.js',
  'js/technology.js',
  'js/ui_panels.js',
  'data/units.js',
  'data/map_data.js',
  'data/technology.js',
  'data/cultures.js',
  'data/counties.js'
]);

/* Data-driven unit classes (docs/plans/warfare-terrain-supply-units-and-multihost.md
   phase 2): the FBDATA.unitClasses table, technology/culture gating, and the
   capped composition-counter swing in field battles. These tests are authored
   for the owner-run Playwright harness and deliberately do not execute in the
   authoring flow. */

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

test('the unit-class table validates and every gate resolves',
  async function ({ page }) {
    const result = await page.evaluate(function () {
      const classes = FBDATA.unitClasses || {};
      const gates = {};
      for (const id in classes) {
        if (!Object.prototype.hasOwnProperty.call(classes, id)) continue;
        const def = classes[id];
        gates[id] = {
          tech:(def.requiresTech || null) && !!FBDATA.tech[def.requiresTech],
          cultures:(def.cultures || []).every(function (culture) {
            return !!FBDATA.cultures[culture];
          })
        };
      }
      const reviews = FBDATA.techImpactReviews.features;
      return {
        validation:FB.validateTechnologyData(),
        baseline:['levy', 'arch', 'cav', 'ret', 'mercs'].every(function (id) {
          return !!classes[id];
        }),
        gates:gates,
        crossbowUnlock:FBDATA.tech.crossbows.unlocks.indexOf('unit:crossbow') >= 0,
        pikeUnlock:FBDATA.tech.infantry_polearms.unlocks.indexOf('unit:pike') >= 0,
        cataphractUnlock:
          FBDATA.tech.cataphract_armor.unlocks.indexOf('unit:cataphract') >= 0,
        newClassReview:reviews.new_unit_classes,
        cultureReview:reviews.culture_unit_classes
      };
    });

    expect(result.validation).toEqual([]);
    expect(result.baseline).toBe(true);
    for (const id of Object.keys(result.gates)) {
      expect(result.gates[id].tech).not.toBe(false);
      expect(result.gates[id].cultures).toBe(true);
    }
    expect(result.crossbowUnlock).toBe(true);
    expect(result.pikeUnlock).toBe(true);
    expect(result.cataphractUnlock).toBe(true);
    expect(result.newClassReview.mode).toBe('hard');
    expect(result.newClassReview.tech).toEqual(
      ['crossbows', 'infantry_polearms', 'cataphract_armor']);
    expect(result.cultureReview.mode).toBe('none');
  });

test('a pike-heavy defender breaks a cavalry charge at equal numbers',
  async function ({ page }) {
    const result = await page.evaluate(function () {
      const state = FB.state;
      const originalWorld = FB.world;
      const originalHosts = state.armies;
      const originalDown = state.armyDown;
      const originalAuto = FB.game.auto.hosts;
      const originalRf = FB.rf;
      const originalWar = state.player.war;

      const playerSovereign = FB.playerRealmId(state);
      const sovereigns = [];
      for (const realmId in state.realms) {
        const realm = state.realms[realmId];
        if (realmId !== 'player' && realm && realm.alive && !realm.liege) {
          sovereigns.push(realmId);
        }
      }
      sovereigns.sort();
      const picked = [];
      for (let i = 0; i < sovereigns.length && picked.length < 2; i++) {
        if (sovereigns[i] !== playerSovereign) picked.push(sovereigns[i]);
      }
      const pikeRealmId = picked[0], cavRealmId = picked[1];
      const keptTech = [
        state.realmTech[pikeRealmId], state.realmTech[cavRealmId]
      ];
      for (const realmId in state.realms) {
        if (state.realms[realmId]) state.realms[realmId].war = null;
      }
      state.player.war = null;
      state.armyDown = {};
      FB.game.auto.hosts = 'manual';
      /* level the field: identical ruler martial, no national technology,
         no RNG spread — only composition, terrain, and counters decide */
      state.realmTech[pikeRealmId] = {
        completed:[], exposed:[], active:[], progress:{},
        reserve:0, priorities:{}
      };
      state.realmTech[cavRealmId] = {
        completed:[], exposed:[], active:[], progress:{},
        reserve:0, priorities:{}
      };
      const pikeRealm = state.realms[pikeRealmId];
      const cavRealm = state.realms[cavRealmId];
      const keptMar = [pikeRealm.ruler.mar, cavRealm.ruler.mar];
      const keptWar = [pikeRealm.war, cavRealm.war];
      pikeRealm.ruler.mar = 5;
      cavRealm.ruler.mar = 5;
      pikeRealm.war = { enemy:cavRealmId };
      cavRealm.war = { enemy:pikeRealmId };
      FB.rf = function () { return 1; };

      FB.world = {
        adj:{ m:{} },
        waterAdj:{ m:{} },
        byId:{ m:{ id:'m', name:'M', cx:0, cy:0, terrain:'mountains' } }
      };
      const pikeHost = {
        id:'pike_host', realm:pikeRealmId, men:1000, size:1000,
        units:{ levy:0, arch:0, cav:0, ret:0, mercs:0, pike:1000 },
        at:'m', from:'m', moveLeft:0, path:[], goal:'m', supply:100
      };
      const cavHost = {
        id:'cav_host', realm:cavRealmId, men:1000, size:1000,
        units:{ levy:0, arch:0, cav:1000, ret:0, mercs:0 },
        at:'m', from:'m', moveLeft:3, path:[], goal:'m', supply:100
      };
      state.armies = [pikeHost, cavHost];

      const counterPike = FB.armyBattleCounterMultiplier(
        pikeHost.units, cavHost.units);
      const counterCav = FB.armyBattleCounterMultiplier(
        cavHost.units, pikeHost.units);
      /* pre-roll expectation: terrain + defense + the counter cap put the
         pike block ahead of the charging cavalry at equal numbers */
      const powerPike = FB.armyBattlePower(state, pikeHost, 'm') *
        counterPike * 1.2;
      const powerCav = FB.armyBattlePower(state, cavHost, 'm') * counterCav;

      const turn = state.turn;
      FB.armyTick(state);
      const pikeAfter = state.armies.filter(function (a) {
        return a.id === 'pike_host';
      })[0] || null;
      const cavAfter = state.armies.filter(function (a) {
        return a.id === 'cav_host';
      })[0] || null;

      state.armies = originalHosts;
      state.armyDown = originalDown;
      state.player.war = originalWar;
      FB.game.auto.hosts = originalAuto;
      FB.rf = originalRf;
      pikeRealm.ruler.mar = keptMar[0];
      cavRealm.ruler.mar = keptMar[1];
      pikeRealm.war = keptWar[0];
      cavRealm.war = keptWar[1];
      if (keptTech[0] === undefined) delete state.realmTech[pikeRealmId];
      else state.realmTech[pikeRealmId] = keptTech[0];
      if (keptTech[1] === undefined) delete state.realmTech[cavRealmId];
      else state.realmTech[cavRealmId] = keptTech[1];
      FB.world = originalWorld;
      return {
        counterPike:counterPike,
        counterCav:counterCav,
        powerPike:powerPike,
        powerCav:powerCav,
        turn:turn,
        pikeMen:pikeAfter ? pikeAfter.men : null,
        cavMen:cavAfter ? cavAfter.men : null,
        cavBroken:cavAfter ? cavAfter.broken : null
      };
    });

    expect(result.counterPike).toBeCloseTo(1.2, 8); // +0.6 counter, capped at the swing
    expect(result.counterCav).toBe(1); // cavalry holds no answer to pikes
    expect(result.powerPike).toBeGreaterThan(result.powerCav);
    expect(result.pikeMen).not.toBeNull();
    expect(result.pikeMen).toBeGreaterThan(700); // the winner pays for a close fight
    expect(result.pikeMen).toBeLessThan(1000);
    expect(result.cavMen).not.toBeNull();
    expect(result.cavMen).toBeLessThan(result.pikeMen);
    expect(result.cavBroken).toBe(result.turn); // the charge shatters and routs
  });

test('culture-gated classes muster only for their own cultures',
  async function ({ page }) {
    const result = await page.evaluate(function () {
      const state = FB.state;
      const p = state.player;
      const me = state.chars[p.charId];
      const keptCulture = me.culture;
      const keptProvs = p.provs;

      me.culture = 'frankish';
      p.provs = [p.provinceId];
      const frankComp = FB.playerCompositionBreakdown(state, true).units;

      me.culture = 'norse';
      const norseComp = FB.playerCompositionBreakdown(state, true).units;

      me.culture = keptCulture;
      p.provs = keptProvs;
      return {
        frankLevy:frankComp.levy,
        frankHuscarl:frankComp.huscarl || 0,
        norseLevy:norseComp.levy,
        norseHuscarl:norseComp.huscarl || 0
      };
    });

    expect(result.frankLevy).toBeGreaterThan(0);
    expect(result.frankHuscarl).toBe(0); // a Frankish levy fields no huscarls
    expect(result.norseHuscarl).toBeGreaterThan(0);
    /* the conversion preserves the headcount: levy + huscarls is unchanged */
    expect(result.norseLevy + result.norseHuscarl).toBe(result.frankLevy);
    expect(result.norseHuscarl).toBe(Math.round(result.frankLevy * 0.15));
  });

test('unit-class gates read the player character culture',
  async function ({ page }) {
    const result = await page.evaluate(function () {
      const state = FB.state;
      const me = state.chars[state.player.charId];
      const keptCulture = me.culture;
      const out = {};
      me.culture = 'frankish';
      out.frankHuscarl = FB.unitClassUnlocked(state, 'huscarl');
      me.culture = 'norse';
      out.norseHuscarl = FB.unitClassUnlocked(state, 'huscarl');
      out.norseCamel = FB.unitClassUnlocked(state, 'camel');
      out.norsePike = FB.unitClassUnlocked(state, 'pike'); // tech-gated: absent
      me.culture = keptCulture;
      return out;
    });

    expect(result.frankHuscarl).toBe(false);
    expect(result.norseHuscarl).toBe(true);
    expect(result.norseCamel).toBe(false);
    expect(result.norsePike).toBe(false);
  });

test('the selected host readout lists unlocked classes with their icons',
  async function ({ page }) {
    await page.evaluate(function () {
      const state = FB.state;
      const host = {
        id:'unit_class_readout_host', realm:'player', men:600, size:600,
        units:{ levy:400, arch:0, cav:0, ret:0, mercs:0, huscarl:200 },
        at:state.player.provinceId, from:state.player.provinceId,
        moveLeft:0, path:[], goal:null, supply:100
      };
      state.armies = [host];
      FB.selectArmy(host.id);
      FB.ui.showTab('prov');
      FB.ui.refresh();
    });
    const panel = page.locator('#tab-prov');
    await expect(panel).toContainText('Huscarls');
    await expect(panel).toContainText('🪓');
    await expect(panel).toContainText('400 levy');
  });
