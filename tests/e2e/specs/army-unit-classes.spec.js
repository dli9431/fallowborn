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
   capped composition-counter swing in field battles — plus the combat-role
   split and replacement cohorts of
   docs/plans/political-choice-war-depth-and-life-paths.md step 11. These tests
   are authored
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
      let maxSplitDeviation = 0;
      for (const classId in classes) {
        if (!Object.prototype.hasOwnProperty.call(classes, classId)) continue;
        const classDef = classes[classId];
        if (classDef.attack === undefined && classDef.defense === undefined) {
          continue;
        }
        if (!(classDef.attack > 0) || !(classDef.defense > 0)) {
          maxSplitDeviation = Infinity;
          break;
        }
        maxSplitDeviation = Math.max(maxSplitDeviation,
          Math.abs((classDef.attack + classDef.defense) / 2 - classDef.quality));
      }
      return {
        validation:FB.validateTechnologyData(),
        baseline:['levy', 'arch', 'cav', 'ret', 'mercs'].every(function (id) {
          return !!classes[id];
        }),
        gates:gates,
        maxSplitDeviation:maxSplitDeviation,
        crossbowUnlock:FBDATA.tech.crossbows.unlocks.indexOf('unit:crossbow') >= 0,
        pikeUnlock:FBDATA.tech.infantry_polearms.unlocks.indexOf('unit:pike') >= 0,
        cataphractUnlock:
          FBDATA.tech.cataphract_armor.unlocks.indexOf('unit:cataphract') >= 0,
        newClassReview:reviews.new_unit_classes,
        cultureReview:reviews.culture_unit_classes,
        rolesReview:reviews.unit_attack_defense_roles,
        cohortReview:reviews.professional_replacement_cohorts
      };
    });

    expect(result.validation).toEqual([]);
    expect(result.baseline).toBe(true);
    for (const id of Object.keys(result.gates)) {
      expect(result.gates[id].tech).not.toBe(false);
      expect(result.gates[id].cultures).toBe(true);
    }
    /* the combat-role split stays rebalance-neutral: every split pair
       averages to the long-standing quality */
    expect(result.maxSplitDeviation).toBeLessThan(0.001);
    expect(result.crossbowUnlock).toBe(true);
    expect(result.pikeUnlock).toBe(true);
    expect(result.cataphractUnlock).toBe(true);
    expect(result.newClassReview.mode).toBe('hard');
    expect(result.newClassReview.tech).toEqual(
      ['crossbows', 'infantry_polearms', 'cataphract_armor']);
    expect(result.cultureReview.mode).toBe('none');
    expect(result.rolesReview.mode).toBe('none');
    expect(result.cohortReview.mode).toBe('none');
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

test('attack equal to defense reproduces the pre-split battle exactly',
  async function ({ page }) {
    const result = await page.evaluate(function () {
      const state = FB.state;
      const classes = FBDATA.unitClasses;
      const keptSplit = {};
      for (const classId in classes) {
        if (!Object.prototype.hasOwnProperty.call(classes, classId)) continue;
        keptSplit[classId] = {
          attack:classes[classId].attack, defense:classes[classId].defense
        };
        classes[classId].attack = classes[classId].quality;
        classes[classId].defense = classes[classId].quality;
      }
      const originalWorld = FB.world;
      const originalHosts = state.armies;
      const originalDown = state.armyDown;
      const originalAuto = FB.game.auto.hosts;
      const originalRf = FB.rf;
      const originalWar = state.player.war;
      const keptMultiHost = FBDATA.balance.aiMultiHostStrength;
      FBDATA.balance.aiMultiHostStrength = Infinity; // no pre-battle split
      const sovereigns = [];
      for (const realmId in state.realms) {
        const realm = state.realms[realmId];
        if (realmId !== 'player' && realm && realm.alive && !realm.liege) {
          sovereigns.push(realmId);
        }
      }
      sovereigns.sort();
      const bigRealmId = sovereigns[0], smallRealmId = sovereigns[1];
      const keptTech = [
        state.realmTech[bigRealmId], state.realmTech[smallRealmId]
      ];
      for (const realmId in state.realms) {
        if (state.realms[realmId]) state.realms[realmId].war = null;
      }
      state.player.war = null;
      state.armyDown = {};
      FB.game.auto.hosts = 'manual';
      state.realmTech[bigRealmId] = {
        completed:[], exposed:[], active:[], progress:{},
        reserve:0, priorities:{}
      };
      state.realmTech[smallRealmId] = {
        completed:[], exposed:[], active:[], progress:{},
        reserve:0, priorities:{}
      };
      const bigRealm = state.realms[bigRealmId];
      const smallRealm = state.realms[smallRealmId];
      const keptMar = [bigRealm.ruler.mar, smallRealm.ruler.mar];
      const keptWar = [bigRealm.war, smallRealm.war];
      bigRealm.ruler.mar = 5;
      smallRealm.ruler.mar = 5;
      bigRealm.war = { enemy:smallRealmId };
      smallRealm.war = { enemy:bigRealmId };
      FB.rf = function () { return 1; };

      /* open farmland: no home-ground bonus names a defender, so this is a
         meeting engagement and no defender coin is drawn */
      FB.world = {
        adj:{ f:{} },
        waterAdj:{ f:{} },
        byId:{ f:{ id:'f', name:'F', cx:0, cy:0, terrain:'farmland' } }
      };
      const bigHost = {
        id:'big_host', realm:bigRealmId, men:1000, size:1000,
        units:{ levy:1000 }, at:'f', from:'f', moveLeft:0, path:[],
        goal:null, supply:100
      };
      const smallHost = {
        id:'small_host', realm:smallRealmId, men:800, size:800,
        units:{ levy:800 }, at:'f', from:'f', moveLeft:3, path:[],
        goal:'f', supply:100
      };
      state.armies = [bigHost, smallHost];

      /* role parity: with attack === defense === quality the role reads match
         the terrain-aware quality average exactly */
      const mixed = { levy:100, arch:50, ret:20 };
      const roleAttack = FB.compRoleQuality(mixed, 170, 'hills', 'attack');
      const roleDefense = FB.compRoleQuality(mixed, 170, 'hills', 'defense');
      const neutral = FB.compTerrainQuality(mixed, 170, 'hills');
      const flatRole = FB.compRoleQuality(mixed, 170, null, 'defense');
      const flatNeutral = FB.compQuality(mixed, 170);
      const powerAttack = FB.armyBattlePower(state, bigHost, 'f', 'attack');
      const powerDefense = FB.armyBattlePower(state, bigHost, 'f', 'defense');
      const powerNeutral = FB.armyBattlePower(state, bigHost, 'f');

      const turn = state.turn;
      FB.armyTick(state);
      const bigAfter = state.armies.filter(function (a) {
        return a.id === 'big_host';
      })[0] || null;
      const smallAfter = state.armies.filter(function (a) {
        return a.id === 'small_host';
      })[0] || null;

      state.armies = originalHosts;
      state.armyDown = originalDown;
      state.player.war = originalWar;
      FB.game.auto.hosts = originalAuto;
      FB.rf = originalRf;
      FBDATA.balance.aiMultiHostStrength = keptMultiHost;
      bigRealm.ruler.mar = keptMar[0];
      smallRealm.ruler.mar = keptMar[1];
      bigRealm.war = keptWar[0];
      smallRealm.war = keptWar[1];
      if (keptTech[0] === undefined) delete state.realmTech[bigRealmId];
      else state.realmTech[bigRealmId] = keptTech[0];
      if (keptTech[1] === undefined) delete state.realmTech[smallRealmId];
      else state.realmTech[smallRealmId] = keptTech[1];
      FB.world = originalWorld;
      for (const classId in keptSplit) {
        classes[classId].attack = keptSplit[classId].attack;
        classes[classId].defense = keptSplit[classId].defense;
      }
      return {
        roleAttack:roleAttack, roleDefense:roleDefense, neutral:neutral,
        flatRole:flatRole, flatNeutral:flatNeutral,
        powerAttack:powerAttack, powerDefense:powerDefense,
        powerNeutral:powerNeutral,
        turn:turn,
        bigMen:bigAfter ? bigAfter.men : null,
        smallMen:smallAfter ? smallAfter.men : null,
        smallBroken:smallAfter ? smallAfter.broken : null
      };
    });

    expect(result.roleAttack).toBe(result.neutral);
    expect(result.roleDefense).toBe(result.neutral);
    expect(result.flatRole).toBe(result.flatNeutral);
    expect(result.powerAttack).toBe(result.powerNeutral);
    expect(result.powerDefense).toBe(result.powerNeutral);
    /* the hand-computed pre-split outcome: 1000 levy beat 800 levy at equal
       martial with no RNG spread — the winner pays 0.28 × 0.8 of its men,
       the loser 0.62 of its own */
    expect(result.bigMen).toBe(776);
    expect(result.smallMen).toBe(304);
    expect(result.smallBroken).toBe(result.turn);
  });

test('replacement cohorts drill on a fixed clock and the premium ends on completion',
  async function ({ page }) {
    const result = await page.evaluate(function () {
      const state = FB.state;
      const originalAuto = FB.game.auto.hosts;
      FB.game.auto.hosts = 'manual';
      /* levy losses never enter the ledger; slain men-at-arms do */
      FB.noteCohortLosses(state, 'player', { ret:40, levy:100, total:140 });
      const before = FB.cohortStatus(state, 'player');
      const upkeepBefore = FB.playerHostUpkeepParts(state);
      /* the ledger survives save/load verbatim and repairs additively */
      state.armyCohorts = JSON.parse(JSON.stringify(state.armyCohorts));
      state.armyCohorts.deadrealm = {
        ret:{ batches:[{ n:5, readyTurn:1 }], ready:2 }
      };
      state.armyCohorts.player.ret.batches.push({ n:'junk' });
      state.armyCohorts.player.bogus = 'not a record';
      FB.armiesEnsure(state);
      const repaired = FB.cohortStatus(state, 'player');
      const deadRealmDropped = !state.armyCohorts.deadrealm;
      /* host dismissal in between: no host is fielded while the drilling
         runs — the cohort is the realm's, not the host's */
      state.turn += 120; // ret replaceDays
      FB.armyTick(state);
      const after = FB.cohortStatus(state, 'player');
      const upkeepAfter = FB.playerHostUpkeepParts(state);
      FB.game.auto.hosts = originalAuto;
      return {
        pendingBefore:before.classes.ret ? before.classes.ret.pending : null,
        readyBefore:before.classes.ret ? before.classes.ret.ready : null,
        daysLeftBefore:before.classes.ret ? before.classes.ret.daysLeft : null,
        levyTracked:!!before.classes.levy,
        reinforceBefore:upkeepBefore.reinforcement,
        totalBefore:upkeepBefore.total,
        pendingRepaired:repaired.classes.ret ? repaired.classes.ret.pending : null,
        deadRealmDropped:deadRealmDropped,
        pendingAfter:after.classes.ret ? after.classes.ret.pending : 0,
        readyAfter:after.classes.ret ? after.classes.ret.ready : 0,
        reinforceAfter:upkeepAfter.reinforcement
      };
    });

    expect(result.pendingBefore).toBe(40);
    expect(result.readyBefore).toBe(0);
    expect(result.daysLeftBefore).toBe(120);
    expect(result.levyTracked).toBe(false);
    expect(result.reinforceBefore).toBeGreaterThan(0);
    /* no host is fielded: the premium alone is the whole seasonal bill */
    expect(result.totalBefore).toBe(result.reinforceBefore);
    expect(result.pendingRepaired).toBe(40);
    expect(result.deadRealmDropped).toBe(true);
    expect(result.pendingAfter).toBe(0);
    expect(result.readyAfter).toBe(40);
    /* the surcharge ends exactly when the replacement completes */
    expect(result.reinforceAfter).toBe(0);
  });

test('drilled replacements survive dismissal and answer the next fresh muster',
  async function ({ page }) {
    const result = await page.evaluate(function () {
      const state = FB.state;
      const p = state.player;
      const originalAuto = FB.game.auto.hosts;
      const originalWar = p.war;
      FB.game.auto.hosts = 'manual';
      let enemyId = null;
      for (const realmId in state.realms) {
        const realm = state.realms[realmId];
        if (realmId !== 'player' && realm && realm.alive && !realm.liege) {
          enemyId = realmId;
          break;
        }
      }
      p.war = { enemy:enemyId };
      FB.noteCohortLosses(state, 'player', { ret:80, total:80 });
      state.turn += 120;
      FB.armyTick(state); // the drilling completes with no host fielded
      const readyBefore = FB.cohortStatus(state, 'player').classes.ret.ready;
      /* a fresh muster — never a de-muster-capped one — takes them at no
         surcharge */
      const host = FB.raisePlayerHost(state);
      const retAfterMuster = host.units.ret;
      const menAfterMuster = host.men;
      const readyAfterMuster = FB.cohortStatus(state, 'player').readyTotal;
      /* a resting host on home ground draws the next batch in before the
         levy refill claims the room */
      host.size = 300;
      state.holder[host.at] = 'player';
      FB.noteCohortLosses(state, 'player', { ret:50, total:50 });
      state.turn += 120;
      FB.armyTick(state);
      const final = FB.cohortStatus(state, 'player');
      const out = {
        readyBefore:readyBefore,
        retAfterMuster:retAfterMuster,
        menAfterMuster:menAfterMuster,
        readyAfterMuster:readyAfterMuster,
        retFinal:host.units.ret,
        levyFinal:host.units.levy,
        menFinal:host.men,
        pendingFinal:final.pendingTotal,
        readyFinal:final.readyTotal
      };
      p.war = originalWar;
      FB.game.auto.hosts = originalAuto;
      return out;
    });

    expect(result.readyBefore).toBe(80);
    expect(result.retAfterMuster).toBe(80);
    expect(result.menAfterMuster).toBe(80);
    expect(result.readyAfterMuster).toBe(0);
    expect(result.retFinal).toBe(130); // 80 mustered + 50 drilled back
    expect(result.levyFinal).toBe(6); // 2% of the 300-man size, after the cohort
    expect(result.menFinal).toBe(136);
    expect(result.pendingFinal).toBe(0);
    expect(result.readyFinal).toBe(0);
  });

test('a mod-removed class falls last in the casualty order and still repairs',
  async function ({ page }) {
    const result = await page.evaluate(function () {
      const state = FB.state;
      const pid = state.player.provinceId;
      const host = {
        id:'mod_host', realm:'player', men:150, size:150,
        units:{ levy:100, gunknights:50 },
        at:pid, from:pid, moveLeft:0, path:[], goal:null, supply:100
      };
      state.armies = [host];
      FB.armiesEnsure(state);
      FB.hostUnits(host);
      const losses = FB.applyHostLosses(host, 120);
      const out = {
        kept:state.armies.length === 1,
        archFilled:host.units.arch === 0,
        unknownKept:losses ? true : true,
        levyLost:losses.levy,
        unknownLost:losses.gunknights || 0,
        totalLost:losses.total,
        menAfter:host.men,
        unknownAfter:host.units.gunknights,
        quality:FB.compQuality(host.units, host.men),
        parts:FB.unitClassParts(state, host.units).join(', ')
      };
      FB.noteCohortLosses(state, 'player', losses);
      out.cohortPending = FB.cohortStatus(state, 'player').pendingTotal;
      return out;
    });

    expect(result.kept).toBe(true);
    expect(result.archFilled).toBe(true);
    /* known classes fall in casualty order first; the unknown class covers
       the remainder so headcount and units never drift apart */
    expect(result.levyLost).toBe(100);
    expect(result.unknownLost).toBe(20);
    expect(result.totalLost).toBe(120);
    expect(result.menAfter).toBe(30);
    expect(result.unknownAfter).toBe(30);
    expect(result.quality).toBe(1); // a table-less class fights at the fallback
    expect(result.parts).toContain('gunknights'); // and still renders
    /* unknown classes are not professionals: no cohort entry */
    expect(result.cohortPending).toBe(0);
  });

test('every culture-gated class has a reachable culture on the map',
  async function ({ page }) {
    const result = await page.evaluate(function () {
      const missing = [];
      const classes = FBDATA.unitClasses || {};
      for (const classId in classes) {
        if (!Object.prototype.hasOwnProperty.call(classes, classId)) continue;
        const cultures = classes[classId].cultures || [];
        for (const culture of cultures) {
          if (!FBDATA.cultures[culture]) {
            missing.push(classId + ':' + culture + ':data');
            continue;
          }
          let onMap = false;
          for (const pid in FB.world.byId) {
            if (FB.world.byId[pid].culture === culture) { onMap = true; break; }
          }
          if (!onMap) missing.push(classId + ':' + culture + ':map');
        }
      }
      return { missing:missing };
    });

    expect(result.missing).toEqual([]);
  });

test('the host card shows attack, defense, and replacement state',
  async function ({ page }) {
    await page.evaluate(function () {
      const state = FB.state;
      const host = {
        id:'cohort_card_host', realm:'player', men:600, size:600,
        units:{ levy:400, arch:0, cav:0, ret:200, mercs:0 },
        at:state.player.provinceId, from:state.player.provinceId,
        moveLeft:0, path:[], goal:null, supply:100
      };
      state.armies = [host];
      FB.noteCohortLosses(state, 'player', { ret:30, total:30 });
      FB.selectArmy(host.id);
      FB.ui.showTab('prov');
      FB.ui.refresh();
    });
    const panel = page.locator('#tab-prov');
    await expect(panel).toContainText('attack 2.4');
    await expect(panel).toContainText('defense 2.6');
    await expect(panel).toContainText('upkeep 2 per 100');
    await expect(panel).toContainText('Replacing 30 Men-at-arms');
    await expect(panel).toContainText('ready in 120 days');
    await expect(panel).toContainText('replacement drilling');
  });
