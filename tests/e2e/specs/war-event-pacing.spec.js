'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'data/events_war.js',
  'data/map_data.js',
  'data/technology.js',
  'data/units.js',
  'js/armies.js',
  'js/events.js',
  'js/fortifications.js',
  'js/holywar.js',
  'js/main.js',
  'js/technology.js',
  'js/ui_modals.js',
  'js/world.js'
]);

const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { startDeterministicGame } = require('../support/game/start');

test.beforeEach(async function ({ page }, testInfo) {
  await openGame(page, testInfo);
  await startDeterministicGame(page);
});

test('operational war events expire when their exact war ends or is replaced',
  async function ({ page }) {
    const result = await page.evaluate(function () {
      const s = FB.state;
      const p = s.player;
      const enemies = Object.keys(s.realms).filter(function (rid) {
        const realm = s.realms[rid];
        return rid !== 'player' && realm && realm.alive && !realm.liege;
      });
      p.war = {
        enemy:enemies[0], target:null, wins:0, losses:0, seasons:0,
        defending:true
      };
      FB.warFooting(s);
      s.eventQueue = [];
      const first = FB.queueWarEvent(s, 'war_council', {});
      const council = FB.eventById('war_council');
      const validDuringWar = FB.eventContextStillValid(s, council, first.ctx);

      p.war = {
        enemy:enemies[1], target:null, wins:0, losses:0, seasons:0,
        defending:true
      };
      FB.warFooting(s);
      const validAfterReplacement = FB.eventContextStillValid(s, council, first.ctx);
      const second = FB.queueWarEvent(s, 'war_council', {});
      FB.endPlayerWar(s);
      const validAfterPeace = FB.eventContextStillValid(s, council, second.ctx);

      return {
        enemyCount:enemies.length,
        validator:council.contextValidator,
        firstId:first.ctx.warEventId,
        secondId:second.ctx.warEventId,
        validDuringWar:validDuringWar,
        validAfterReplacement:validAfterReplacement,
        validAfterPeace:validAfterPeace
      };
    });

    expect(result.enemyCount).toBeGreaterThanOrEqual(2);
    expect(result.validator).toBe('war_event_context_valid');
    expect(result.firstId).not.toBe(result.secondId);
    expect(result.validDuringWar).toBe(true);
    expect(result.validAfterReplacement).toBe(false);
    expect(result.validAfterPeace).toBe(false);
  });

test('the daily picker yields one blocking event and leaves the rest queued',
  async function ({ page }) {
    const result = await page.evaluate(function () {
      const s = FB.state;
      s.player.stationFarewell = null;
      s.eventQueue = [];
      s.slotDays = [s.date.day];
      FB.queueEvent(s, 'field_battle_won', { pid:s.player.provinceId });
      FB.queueEvent(s, 'field_battle_lost', { pid:s.player.provinceId });
      const picked = FB.pickDailyEvents(s);
      return {
        picked:picked.map(function (item) { return item.id; }),
        queued:s.eventQueue.map(function (item) { return item.id; }),
        slotDays:s.slotDays.slice()
      };
    });

    expect(result.picked).toEqual(['field_battle_won']);
    expect(result.queued).toEqual(['field_battle_lost']);
    expect(result.slotDays).toEqual([]);
  });

test('slot-day selection reuses its event pool and shared trigger reads',
  async function ({ page }) {
    const result = await page.evaluate(function () {
      const s = FB.state;
      const originalEvents = FBDATA.events;
      const originalCheckTrigger = FB.checkTrigger;
      const originalTechList = FB.techList;
      const originalContextOptions = FB.eventContextOptions;
      let triggerCalls = 0;
      let techListCalls = 0;
      let contextCalls = 0;
      try {
        const events = [];
        for (let i = 0; i < 100; i++) {
          events.push({ id:'synthetic_never_' + i, trigger:{ never:true } });
        }
        events.push({
          id:'synthetic_fast_a', weight:5,
          trigger:{ notTechs:['synthetic_missing_technology'] },
          contextSelector:'synthetic_shared'
        });
        events.push({
          id:'synthetic_fast_b', weight:5,
          trigger:{ notTechs:['synthetic_missing_technology'] },
          contextSelector:'synthetic_shared'
        });
        FBDATA.events = events;
        FB.invalidateEventIndex();
        FB.checkTrigger = function () {
          triggerCalls++;
          return originalCheckTrigger.apply(this, arguments);
        };
        FB.techList = function () {
          techListCalls++;
          return originalTechList.apply(this, arguments);
        };
        FB.eventContextOptions = function (state, selector) {
          if (selector === 'synthetic_shared') {
            contextCalls++;
            return [{ marker:'shared' }];
          }
          return originalContextOptions(state, selector);
        };
        s.chars[s.player.charId].born = s.date.year - 20;
        s.player.war = null;
        s.player.travel = null;
        s.player.stationFarewell = null;
        s.eventQueue = [];
        s.slotDays = [s.date.day];
        const picked = FB.pickDailyEvents(s);
        return {
          picked:picked[0] && picked[0].id,
          marker:picked[0] && picked[0].ctx.marker,
          triggerCalls:triggerCalls,
          techListCalls:techListCalls,
          contextCalls:contextCalls
        };
      } finally {
        FBDATA.events = originalEvents;
        FB.checkTrigger = originalCheckTrigger;
        FB.techList = originalTechList;
        FB.eventContextOptions = originalContextOptions;
        FB.invalidateEventIndex();
      }
    });

    expect(['synthetic_fast_a', 'synthetic_fast_b']).toContain(result.picked);
    expect(result.marker).toBe('shared');
    expect(result.triggerCalls).toBe(2);
    expect(result.techListCalls).toBe(1);
    expect(result.contextCalls).toBe(1);
  });

test('a peaceful day with no hosts bypasses the field-army pipeline',
  async function ({ page }) {
    const result = await page.evaluate(function () {
      const s = FB.state;
      s.player.war = null;
      s.player.militaryCommand = null;
      s.greatHolyWar = null;
      s.armies = [];
      for (const rid in s.realms) {
        if (s.realms[rid]) s.realms[rid].war = null;
      }
      const originalPlayerHost = FB.playerHost;
      let playerHostCalls = 0;
      FB.playerHost = function () {
        playerHostCalls++;
        return originalPlayerHost.apply(this, arguments);
      };
      try {
        FB.armyTick(s);
        return {
          playerHostCalls:playerHostCalls,
          armies:s.armies.length
        };
      } finally {
        FB.playerHost = originalPlayerHost;
      }
    });

    expect(result).toEqual({ playerHostCalls:0, armies:0 });
  });

test('adjacent hosts plan from start-of-day counties and fight only after co-location',
  async function ({ page }) {
    const result = await page.evaluate(function () {
      const s = FB.state;
      const p = s.player;
      const adj = FB.world.adj;
      let triangle = null;
      for (const source in adj) {
        const neighbors = Object.keys(adj[source] || {}).filter(function (pid) {
          const pr = FB.world.byId[pid];
          return pr && !pr.wasteland && !FB.waterCrossing(source, pid);
        });
        for (let i = 0; i < neighbors.length && !triangle; i++) {
          for (let j = i + 1; j < neighbors.length; j++) {
            if (adj[neighbors[i]] && adj[neighbors[i]][neighbors[j]] &&
                !FB.waterCrossing(neighbors[i], neighbors[j])) {
              triangle = [source, neighbors[i], neighbors[j]];
              break;
            }
          }
        }
        if (triangle) break;
      }
      if (!triangle) throw new Error('Expected a three-county land triangle.');

      const playerSource = triangle[0];
      const emptyTarget = triangle[1];
      const enemySource = triangle[2];
      const enemyId = Object.keys(s.realms).filter(function (rid) {
        const realm = s.realms[rid];
        return rid !== 'player' && realm && realm.alive && !realm.liege;
      })[0];
      const oldAuto = FB.game.auto.hosts;
      const oldTechMarch = FB.techArmyMarchDays;
      const oldTerrain = {};
      const terrainIds = [playerSource, emptyTarget, enemySource].map(function (pid) {
        return FB.world.byId[pid].terrain || 'plains';
      });
      terrainIds.forEach(function (terrain) {
        oldTerrain[terrain] = FBDATA.balance.terrainMarchMult[terrain];
        FBDATA.balance.terrainMarchMult[terrain] = 1;
      });

      FB.game.auto.hosts = 'manual';
      FB.techArmyMarchDays = function () { return 1; };
      p.provinceId = playerSource;
      p.provs = [playerSource, emptyTarget];
      s.owner[playerSource] = 'player';
      s.owner[emptyTarget] = 'player';
      s.owner[enemySource] = enemyId;
      s.holder[playerSource] = 'player';
      s.holder[emptyTarget] = 'player';
      s.holder[enemySource] = enemyId;
      s.buildings[playerSource] = [];
      s.buildings[emptyTarget] = [];
      s.buildings[enemySource] = [];
      FB.invalidateFortIndex();
      p.war = {
        enemy:enemyId, target:enemySource, wins:0, losses:0, seasons:0,
        defending:false, strength:1
      };
      s.armyDown = {};
      s.armyDetachmentDown = {};
      s.armyCohorts = {};
      s.eventQueue = [];
      s.armies = [
        {
          id:'simultaneous-player', realm:'player', men:500, size:500,
          units:{ levy:500, arch:0, cav:0, ret:0, mercs:0 },
          at:playerSource, from:playerSource, moveLeft:1,
          path:[emptyTarget], goal:emptyTarget, supply:100, manual:1
        },
        {
          id:'simultaneous-enemy', realm:enemyId, men:500, size:500,
          units:{ levy:500, arch:0, cav:0, ret:0, mercs:0 },
          at:enemySource, from:enemySource, moveLeft:0,
          path:[], goal:null, supply:100
        }
      ];

      try {
        FB.armyTick(s);
        return {
          playerAt:s.armies[0] && s.armies[0].at,
          enemyAt:s.armies[1] && s.armies[1].at,
          target:emptyTarget,
          playerSource:playerSource,
          battleEvents:s.eventQueue.filter(function (item) {
            return item.id.indexOf('field_battle_') === 0;
          }).length,
          wins:p.war && p.war.wins,
          losses:p.war && p.war.losses
        };
      } finally {
        FB.game.auto.hosts = oldAuto;
        FB.techArmyMarchDays = oldTechMarch;
        for (const terrain in oldTerrain) {
          FBDATA.balance.terrainMarchMult[terrain] = oldTerrain[terrain];
        }
      }
    });

    expect(result.playerAt).toBe(result.target);
    expect(result.enemyAt).toBe(result.playerSource);
    expect(result.battleEvents).toBe(0);
    expect(result.wins).toBe(0);
    expect(result.losses).toBe(0);
  });

test('siege Chronicle progress keeps ledger precision but displays whole steps',
  async function ({ page }) {
    const result = await page.evaluate(function () {
      const s = FB.state;
      const p = s.player;
      const enemyId = Object.keys(s.realms).filter(function (rid) {
        const realm = s.realms[rid];
        return rid !== 'player' && realm && realm.alive && !realm.liege;
      })[0];
      const target = Object.keys(s.owner).filter(function (pid) {
        return s.owner[pid] === enemyId;
      })[0];
      const oldTechBonus = FB.techBonus;
      const oldChance = FB.chance;
      const oldBuildings = s.buildings[target];
      p.tier = 4;
      s.buildings[target] = [{ s:0, id:'walls', level:1 }];
      FB.invalidateFortIndex();
      p.war = {
        enemy:enemyId, target:target, wins:0, losses:0, seasons:0,
        defending:false, strength:1, siege:3
      };
      const host = {
        id:'decimal-siege-host', realm:'player', men:5000, size:5000,
        units:{ levy:5000, arch:0, cav:0, ret:0, mercs:0 },
        at:target, from:target, moveLeft:0, path:[], goal:null, supply:100
      };
      s.armies = [host];
      const required = FB.fortSiegeStatus(s, target,
        { fortLevel:1, progress:0 }, [host]).required;
      FB.techBonus = function (state, effect, realmId) {
        if (effect === 'siege' &&
            (realmId === undefined || realmId === 'player')) {
          return 0.19166666666666665;
        }
        return oldTechBonus.apply(this, arguments);
      };
      FB.chance = function () { return false; };

      let entry;
      try {
        FB.fns.war_siege(s);
        entry = s.log.slice().reverse().filter(function (item) {
          return item.msg && item.msg.key === 'news.war.siege_tightens';
        })[0];
        return {
          stored:p.war.siege,
          required:required,
          params:entry && entry.msg.params,
          text:entry ? FB.newsText(entry, s, p.charId) : ''
        };
      } finally {
        FB.techBonus = oldTechBonus;
        FB.chance = oldChance;
        s.buildings[target] = oldBuildings;
        FB.invalidateFortIndex();
      }
    });

    expect(result.stored).toBeCloseTo(4.575, 6);
    expect(result.params.progress).toBe(Math.round(result.stored));
    expect(result.params.required).toBe(Math.round(result.required));
    expect(result.text).toContain('(' + result.params.progress + '/' +
      result.params.required + ')');
    expect(result.text).not.toMatch(/\d+\.\d+/);
  });

test('pausing an open event defers an unread batch instead of opening it',
  async function ({ page }) {
    await page.evaluate(function () {
      const s = FB.state;
      s.eventQueue = [];
      FB.game.auto.all = false;
      FB.game.auto.war = false;
      FB.game.setPaused(true);
      FB.ui.runEvents([
        { id:'field_battle_won', ctx:{ pid:s.player.provinceId } },
        { id:'field_battle_lost', ctx:{ pid:s.player.provinceId } }
      ]);
    });

    await expect(page.locator('#eventmodal:not(.hidden)')).toBeVisible();
    await page.locator('#ev-options .evopt').first().click();
    await expect(page.locator('#eventmodal')).toHaveClass(/hidden/);

    const result = await page.evaluate(function () {
      return {
        paused:FB.game.paused,
        queued:FB.state.eventQueue.map(function (item) { return item.id; })
      };
    });
    expect(result.paused).toBe(true);
    expect(result.queued).toEqual(['field_battle_lost']);
  });

test('detachment battles score the campaign without personal event or capture spam',
  async function ({ page }) {
    const result = await page.evaluate(function () {
      const s = FB.state;
      const p = s.player;
      const home = p.provinceId;
      const second = Object.keys(FB.world.adj[home] || {}).filter(function (pid) {
        return FB.world.byId[pid] && !FB.world.byId[pid].wasteland;
      })[0];
      const enemyId = Object.keys(s.realms).filter(function (rid) {
        const realm = s.realms[rid];
        return rid !== 'player' && realm && realm.alive && !realm.liege;
      })[0];
      const oldRf = FB.rf;
      const oldChance = FB.chance;
      const oldCapture = FB.maybeCapturePlayer;
      const oldAuto = FB.game.auto.hosts;
      const oldNeed = FBDATA.balance.warWinsToTakeProvince;
      const oldSplit = FBDATA.balance.aiMultiHostStrength;
      let captures = 0;

      p.tier = 4;
      p.war = {
        enemy:enemyId, target:null, wins:0, losses:0, seasons:0,
        defending:true, strength:1
      };
      s.eventQueue = [];
      s.armyDown = {};
      s.armyDetachmentDown = {};
      s.armyCohorts = {};
      FB.game.auto.hosts = 'manual';
      FBDATA.balance.warWinsToTakeProvince = 99;
      FBDATA.balance.aiMultiHostStrength = Infinity;
      FB.rf = function () { return 1; };
      FB.chance = function () { return false; };
      FB.maybeCapturePlayer = function () { captures++; };
      s.armies = [
        {
          id:'primary_player_host', realm:'player', men:1500, size:1500,
          units:{ levy:1500, arch:0, cav:0, ret:0, mercs:0 },
          at:home, from:home, moveLeft:0, path:[], goal:null, supply:100
        },
        {
          id:'enemy_scout', realm:enemyId, men:80, size:80,
          units:{ levy:80, arch:0, cav:0, ret:0, mercs:0 },
          at:home, from:home, moveLeft:0, path:[], goal:null, supply:100
        },
        {
          id:'player_detachment', realm:'player', men:120, size:120,
          units:{ levy:120, arch:0, cav:0, ret:0, mercs:0 },
          at:second, from:second, moveLeft:0, path:[], goal:null, supply:100
        },
        {
          id:'enemy_main', realm:enemyId, men:1500, size:1500,
          units:{ levy:1500, arch:0, cav:0, ret:0, mercs:0 },
          at:second, from:second, moveLeft:0, path:[], goal:null, supply:100
        }
      ];

      FB.armyTick(s);
      const fieldEvents = s.eventQueue.filter(function (item) {
        return item.id.indexOf('field_battle_') === 0;
      });
      const battles = (p.war && p.war.battles || []).map(function (battle) {
        return {
          outcome:battle.outcome,
          primaryHostInvolved:battle.primaryHostInvolved
        };
      });
      const out = {
        second:second,
        wins:p.war && p.war.wins,
        losses:p.war && p.war.losses,
        fieldEvents:fieldEvents.map(function (item) { return item.id; }),
        battles:battles,
        captures:captures
      };

      FB.rf = oldRf;
      FB.chance = oldChance;
      FB.maybeCapturePlayer = oldCapture;
      FB.game.auto.hosts = oldAuto;
      FBDATA.balance.warWinsToTakeProvince = oldNeed;
      FBDATA.balance.aiMultiHostStrength = oldSplit;
      return out;
    });

    expect(result.second).toBeTruthy();
    expect(result.wins).toBe(1);
    expect(result.losses).toBe(1);
    expect(result.fieldEvents).toEqual(['field_battle_won']);
    expect(result.battles).toHaveLength(2);
    expect(result.battles).toEqual(expect.arrayContaining([
      { outcome:'win', primaryHostInvolved:true },
      { outcome:'loss', primaryHostInvolved:false }
    ]));
    expect(result.captures).toBe(0);
  });

test('great holy-war detachments write news while only the primary host opens a report',
  async function ({ page }) {
    const result = await page.evaluate(function () {
      const s = FB.state;
      const pid = s.player.provinceId;
      const enemyId = Object.keys(s.realms).filter(function (rid) {
        const realm = s.realms[rid];
        return rid !== 'player' && realm && realm.alive && !realm.liege;
      })[0];
      s.player.greatHolyWar = null;
      s.greatHolyWar = {
        id:'event_pacing_holy_war',
        phase:'active',
        resolve:0,
        contribution:{},
        participants:{
          attackers:[{ realm:'player', sovereign:false }],
          defenders:[{ realm:enemyId, sovereign:true }]
        }
      };
      s.eventQueue = [];
      const logStart = s.log.length;
      FB.greatHolyWarBattle(s, pid,
        { realm:'player', men:200 }, { realm:enemyId, men:100 }, 10, 80, {
          playerInvolved:true,
          primaryHostInvolved:false,
          won:true,
          enemyId:enemyId
        });
      const afterDetachment = s.eventQueue.map(function (item) { return item.id; });
      const detachedNews = s.log.slice(logStart).map(function (entry) {
        return entry.msg && entry.msg.key;
      }).filter(Boolean);

      FB.greatHolyWarBattle(s, pid,
        { realm:enemyId, men:200 }, { realm:'player', men:100 }, 10, 80, {
          playerInvolved:true,
          primaryHostInvolved:true,
          won:false,
          enemyId:enemyId
        });
      return {
        afterDetachment:afterDetachment,
        detachedNews:detachedNews,
        finalEvents:s.eventQueue.map(function (item) { return item.id; })
      };
    });

    expect(result.afterDetachment).toEqual([]);
    expect(result.detachedNews).toContain('news.holywar.detachment_victory');
    expect(result.finalEvents).toEqual(['ghw_field_battle_lost']);
  });

test('a wiped primary host cannot remuster and repeat its victory event during rearm',
  async function ({ page }) {
    const result = await page.evaluate(function () {
      const s = FB.state;
      const p = s.player;
      const pid = p.provinceId;
      const enemyId = Object.keys(s.realms).filter(function (rid) {
        const realm = s.realms[rid];
        return rid !== 'player' && realm && realm.alive && !realm.liege;
      })[0];
      const oldRf = FB.rf;
      const oldAiBaseHost = FB.aiBaseHost;
      const oldAuto = FB.game.auto.hosts;
      const oldNeed = FBDATA.balance.warWinsToTakeProvince;
      const oldSplit = FBDATA.balance.aiMultiHostStrength;
      const oldCapital = s.realms[enemyId].capital;
      const keptWars = {};
      for (const rid in s.realms) {
        keptWars[rid] = s.realms[rid].war;
        s.realms[rid].war = null;
      }

      p.war = {
        enemy:enemyId, target:null, wins:0, losses:0, seasons:0,
        defending:true, strength:1
      };
      s.eventQueue = [];
      s.armyDown = {};
      s.armyDetachmentDown = {};
      s.armyCohorts = {};
      FB.game.auto.hosts = 'manual';
      FBDATA.balance.warWinsToTakeProvince = 99;
      FBDATA.balance.aiMultiHostStrength = Infinity;
      FB.rf = function () { return 1; };
      FB.aiBaseHost = function (state, rid) {
        return rid === enemyId ? 100 : oldAiBaseHost(state, rid);
      };
      s.realms[enemyId].capital = pid;
      s.armies = [
        {
          id:'rearm_player_host', realm:'player', men:5000, size:5000,
          units:{ levy:5000, arch:0, cav:0, ret:0, mercs:0 },
          at:pid, from:pid, moveLeft:0, path:[], goal:null, supply:100
        },
        {
          id:'rearm_enemy_host', realm:enemyId, men:100, size:100,
          units:{ levy:100, arch:0, cav:0, ret:0, mercs:0 },
          at:pid, from:pid, moveLeft:0, path:[], goal:null, supply:100
        }
      ];

      const logStart = s.log.length;
      const battleTurn = s.turn;
      FB.armyTick(s);
      for (let day = 0; day < 5; day++) {
        s.turn++;
        FB.armyTick(s);
      }
      const enemyMusters = s.log.slice(logStart).filter(function (entry) {
        return entry.msg && entry.msg.key === 'news.army.enemy_musters';
      }).length;
      const out = {
        enemyId:enemyId,
        wins:p.war && p.war.wins,
        fieldEvents:s.eventQueue.filter(function (item) {
          return item.id.indexOf('field_battle_won') === 0;
        }).map(function (item) { return item.id; }),
        enemyHosts:FB.hostsOf(s, enemyId).length,
        armyDown:s.armyDown[enemyId],
        detachmentDown:s.armyDetachmentDown[enemyId],
        battleTurn:battleTurn,
        enemyMusters:enemyMusters
      };

      FB.rf = oldRf;
      FB.aiBaseHost = oldAiBaseHost;
      FB.game.auto.hosts = oldAuto;
      FBDATA.balance.warWinsToTakeProvince = oldNeed;
      FBDATA.balance.aiMultiHostStrength = oldSplit;
      s.realms[enemyId].capital = oldCapital;
      for (const rid in keptWars) s.realms[rid].war = keptWars[rid];
      return out;
    });

    expect(result.enemyId).toBeTruthy();
    expect(result.wins).toBe(1);
    expect(result.fieldEvents).toHaveLength(1);
    expect(result.enemyHosts).toBe(0);
    expect(result.armyDown).toBe(result.battleTurn);
    expect(result.detachmentDown).toBeUndefined();
    expect(result.enemyMusters).toBe(0);
  });

test('a host standing on the war target presses the siege at the season tick',
  async function ({ page }) {
    const result = await page.evaluate(function () {
      const s = FB.state;
      const p = s.player;
      const enemyId = Object.keys(s.realms).filter(function (rid) {
        const realm = s.realms[rid];
        return rid !== 'player' && realm && realm.alive && !realm.liege;
      })[0];
      const target = Object.keys(s.owner).filter(function (pid) {
        return s.owner[pid] === enemyId &&
          !(FB.fortAt && FB.fortAt(s, pid)) &&
          Object.keys(FB.world.adj[pid] || {}).length;
      })[0];
      const oldChance = FB.chance;
      FB.chance = function () { return false; }; // no unfortified sortie roll

      p.tier = 4;
      p.war = {
        enemy:enemyId, target:target, wins:0, losses:0, seasons:0,
        defending:false, strength:1
      };
      s.eventQueue = [];
      s.armies = [
        {
          id:'siege_host', realm:'player', men:500, size:500,
          units:{ levy:500, arch:0, cav:0, ret:0, mercs:0 },
          at:target, from:target, moveLeft:0, path:[], goal:null, supply:100
        }
      ];

      FB.playerWarTick(s);
      const siegeAfterPulse = p.war && p.war.siege;
      const councilQueued = s.eventQueue.some(function (item) {
        return item.id === 'war_council';
      });

      // the host marches away: the works stall where they stand
      s.armies[0].at = p.provinceId;
      FB.playerWarTick(s);
      const siegeAfterLeaving = p.war && p.war.siege;

      // back on the target but contested by the enemy host: still no progress
      s.armies[0].at = target;
      s.armies.push({
        id:'siege_enemy', realm:enemyId, men:900, size:900,
        units:{ levy:900, arch:0, cav:0, ret:0, mercs:0 },
        at:target, from:target, moveLeft:0, path:[], goal:null, supply:100
      });
      FB.playerWarTick(s);
      const siegeAfterContest = p.war && p.war.siege;

      FB.chance = oldChance;
      return {
        target:target,
        siegeAfterPulse:siegeAfterPulse,
        councilQueued:councilQueued,
        siegeAfterLeaving:siegeAfterLeaving,
        siegeAfterContest:siegeAfterContest,
        warActive:!!p.war
      };
    });

    expect(result.target).toBeTruthy();
    expect(result.siegeAfterPulse).toBeGreaterThanOrEqual(1);
    expect(result.councilQueued).toBe(true);
    expect(result.siegeAfterLeaving).toBe(result.siegeAfterPulse);
    expect(result.siegeAfterContest).toBe(result.siegeAfterPulse);
    expect(result.warActive).toBe(true);
  });

test('the season-tick siege breaches, takes the county, and queues no stale council',
  async function ({ page }) {
    const result = await page.evaluate(function () {
      const s = FB.state;
      const p = s.player;
      const enemyId = Object.keys(s.realms).filter(function (rid) {
        const realm = s.realms[rid];
        return rid !== 'player' && realm && realm.alive && !realm.liege;
      })[0];
      const target = Object.keys(s.owner).filter(function (pid) {
        return s.owner[pid] === enemyId &&
          !(FB.fortAt && FB.fortAt(s, pid));
      })[0];
      const oldChance = FB.chance;
      FB.chance = function () { return false; };

      p.tier = 4;
      const host = {
        id:'breach_host', realm:'player', men:500, size:500,
        units:{ levy:500, arch:0, cav:0, ret:0, mercs:0 },
        at:target, from:target, moveLeft:0, path:[], goal:null, supply:100
      };
      s.armies = [host];
      const required = FB.fortSiegeStatus(s, target, { progress:0 }, [host]).required;
      p.war = {
        enemy:enemyId, target:target, wins:0, losses:0, seasons:0,
        defending:false, strength:1, siege:required - 1
      };
      s.eventQueue = [];

      FB.playerWarTick(s);
      const out = {
        required:required,
        warEnded:!p.war,
        owner:s.owner[target],
        holder:s.holder && s.holder[target],
        ownsCounty:(p.provs || []).indexOf(target) >= 0,
        councilQueued:s.eventQueue.some(function (item) {
          return item.id === 'war_council';
        })
      };

      FB.chance = oldChance;
      return out;
    });

    expect(result.required).toBeGreaterThanOrEqual(3);
    expect(result.warEnded).toBe(true);
    expect(result.owner).toBe('player');
    expect(result.holder).toBe('player');
    expect(result.ownsCounty).toBe(true);
    expect(result.councilQueued).toBe(false);
  });

test('arrival on an uncontested war target queues one exact siege event',
  async function ({ page }) {
    const result = await page.evaluate(function () {
      const s = FB.state;
      const p = s.player;
      const enemyId = Object.keys(s.realms).filter(function (rid) {
        const realm = s.realms[rid];
        return rid !== 'player' && realm && realm.alive && !realm.liege;
      })[0];
      const target = Object.keys(s.owner).filter(function (pid) {
        return s.owner[pid] === enemyId &&
          !(FB.fortAt && FB.fortAt(s, pid)) &&
          Object.keys(FB.world.adj[pid] || {}).length;
      })[0];
      const source = Object.keys(FB.world.adj[target] || {})[0];
      const event = FB.eventById('war_occupation_policy');

      p.tier = 4;
      p.stationFarewell = null;
      p.war = {
        enemy:enemyId, target:target, wins:0, losses:0, seasons:0,
        defending:false, strength:1
      };
      s.eventQueue = [];
      s.armyDown = s.armyDown || {};
      s.armyDown[enemyId] = s.turn;
      s.armies = [
        {
          id:'arriving_siege_host', realm:'player', men:500, size:500,
          units:{ levy:500, arch:0, cav:0, ret:0, mercs:0 },
          at:source, from:source, moveLeft:1, path:[target], goal:target,
          supply:100, manual:1
        }
      ];

      const beforeArrival = FB.maybeQueuePlayerSiegeEvent(s);
      FB.armyTick(s);
      const queueAfterArrival = s.eventQueue.filter(function (item) {
        return item.id === 'war_occupation_policy';
      });
      FB.armyTick(s);
      const queueAfterSecondTick = s.eventQueue.filter(function (item) {
        return item.id === 'war_occupation_policy';
      });
      const picked = FB.pickDailyEvents(s);

      return {
        target:target,
        source:source,
        at:s.armies[0] && s.armies[0].at,
        beforeArrival:beforeArrival,
        triggerNever:!!(event.trigger && event.trigger.never),
        triggerChance:event.trigger && event.trigger.chance,
        validator:event.contextValidator,
        queuedCount:queueAfterArrival.length,
        secondTickCount:queueAfterSecondTick.length,
        queuedLocation:queueAfterArrival[0] && queueAfterArrival[0].ctx.locationId,
        queuedWarId:queueAfterArrival[0] && queueAfterArrival[0].ctx.warEventId,
        activeWarId:p.war && p.war.eventId,
        occupationEventQueued:p.war && p.war.occupationEventQueued,
        picked:picked.map(function (item) { return item.id; })
      };
    });

    expect(result.target).toBeTruthy();
    expect(result.source).toBeTruthy();
    expect(result.at).toBe(result.target);
    expect(result.beforeArrival).toBe(false);
    expect(result.triggerNever).toBe(true);
    expect(result.triggerChance).toBeUndefined();
    expect(result.validator).toBe('war_event_context_valid');
    expect(result.queuedCount).toBe(1);
    expect(result.secondTickCount).toBe(1);
    expect(result.queuedLocation).toBe(result.target);
    expect(result.queuedWarId).toBe(result.activeWarId);
    expect(result.occupationEventQueued).toBe(1);
    expect(result.picked).toEqual(['war_occupation_policy']);
  });

test('the occupation trigger follows the besieging host, not the siege ledger',
  async function ({ page }) {
    const result = await page.evaluate(function () {
      const s = FB.state;
      const p = s.player;
      const enemyId = Object.keys(s.realms).filter(function (rid) {
        const realm = s.realms[rid];
        return rid !== 'player' && realm && realm.alive && !realm.liege;
      })[0];
      const target = Object.keys(s.owner).filter(function (pid) {
        return s.owner[pid] === enemyId;
      })[0];

      p.tier = 4;
      p.war = {
        enemy:enemyId, target:target, wins:0, losses:0, seasons:0,
        defending:false, strength:1, siege:2
      };
      s.armies = [
        {
          id:'occupation_host', realm:'player', men:500, size:500,
          units:{ levy:500, arch:0, cav:0, ret:0, mercs:0 },
          at:target, from:target, moveLeft:0, path:[], goal:null, supply:100
        }
      ];
      const whileBesieging = FB.fns.war_active_occupation(s);

      // progress on the ledger but no host on the ground: no occupation
      s.armies[0].at = p.provinceId;
      const afterLeaving = FB.fns.war_active_occupation(s);

      // the target slipping out of enemy hands ends it too
      s.armies[0].at = target;
      s.owner[target] = 'player';
      const afterOwnerChange = FB.fns.war_active_occupation(s);
      s.owner[target] = enemyId;

      return {
        whileBesieging:whileBesieging,
        afterLeaving:afterLeaving,
        afterOwnerChange:afterOwnerChange
      };
    });

    expect(result.whileBesieging).toBe(true);
    expect(result.afterLeaving).toBe(false);
    expect(result.afterOwnerChange).toBe(false);
  });

test('the war council offers only map orders — no abstract battle, siege, or harry',
  async function ({ page }) {
    const result = await page.evaluate(function () {
      const def = FB.eventById('war_council');
      const customs = [];
      const chances = [];
      function collect(fx) {
        if (fx && fx.custom) customs.push(fx.custom);
      }
      (def.options || []).forEach(function (option) {
        if (option.chance !== undefined) chances.push(option.chance);
        collect(option.effects);
        collect(option.success && option.success.effects);
        collect(option.failure && option.failure.effects);
      });
      return {
        labels:(def.options || []).map(function (option) { return option.label; }),
        chances:chances,
        customs:customs,
        harryFn:typeof FB.fns.war_harry,
        noEnemyHostFn:typeof FB.fns.war_no_enemy_host
      };
    });

    expect(result.labels).toEqual([
      'Hunt down their field host.',
      'Fall back and refit.',
      'Seek terms.'
    ]);
    expect(result.chances).not.toContain('war_battle');
    expect(result.customs).not.toContain('war_siege');
    expect(result.customs).not.toContain('war_harry');
    expect(result.customs).not.toContain('war_win');
    expect(result.customs).not.toContain('war_loss');
    expect(result.harryFn).toBe('undefined');
    expect(result.noEnemyHostFn).toBe('undefined');
  });

test('campaign state tilts field-battle power and a real battle spends the blessing',
  async function ({ page }) {
    const result = await page.evaluate(function () {
      const s = FB.state;
      const p = s.player;
      const home = p.provinceId;
      const enemyId = Object.keys(s.realms).filter(function (rid) {
        const realm = s.realms[rid];
        return rid !== 'player' && realm && realm.alive && !realm.liege;
      })[0];
      const oldRf = FB.rf;
      const oldChance = FB.chance;
      const oldAuto = FB.game.auto.hosts;
      const oldNeed = FBDATA.balance.warWinsToTakeProvince;
      const oldSplit = FBDATA.balance.aiMultiHostStrength;

      p.tier = 4;
      p.war = {
        enemy:enemyId, target:null, wins:0, losses:0, seasons:0,
        defending:true, strength:1
      };
      const probe = {
        id:'power_probe', realm:'player', men:1000, size:1000,
        units:{ levy:1000, arch:0, cav:0, ret:0, mercs:0 },
        at:home, from:home, moveLeft:0, path:[], goal:null, supply:100
      };
      const base = FB.armyBattlePower(s, probe, home, 'attack');
      p.war.strength = 0.7;
      const worn = FB.armyBattlePower(s, probe, home, 'attack');
      p.war.strength = 1.1;
      const fresh = FB.armyBattlePower(s, probe, home, 'attack');
      p.war.strength = 1;
      p.war.led = 90;
      const led = FB.armyBattlePower(s, probe, home, 'attack');
      p.war.led = 0;
      p.war.rested = 1;
      const rested = FB.armyBattlePower(s, probe, home, 'attack');
      p.war.rested = 0;

      // a real field battle spends the war blessing
      s.eventQueue = [];
      s.armyDown = {};
      s.armyDetachmentDown = {};
      s.armyCohorts = {};
      FB.game.auto.hosts = 'manual';
      FBDATA.balance.warWinsToTakeProvince = 99;
      FBDATA.balance.aiMultiHostStrength = Infinity;
      FB.rf = function () { return 1; };
      FB.chance = function () { return false; };
      p.flags.blessed_war = 1;
      s.armies = [
        {
          id:'blessing_player_host', realm:'player', men:1500, size:1500,
          units:{ levy:1500, arch:0, cav:0, ret:0, mercs:0 },
          at:home, from:home, moveLeft:0, path:[], goal:null, supply:100
        },
        {
          id:'blessing_enemy_host', realm:enemyId, men:80, size:80,
          units:{ levy:80, arch:0, cav:0, ret:0, mercs:0 },
          at:home, from:home, moveLeft:0, path:[], goal:null, supply:100
        }
      ];
      FB.armyTick(s);
      const out = {
        base:base, worn:worn, fresh:fresh, led:led, rested:rested,
        blessedAfter:s.player.flags.blessed_war,
        battleEvents:s.eventQueue.filter(function (item) {
          return item.id.indexOf('field_battle_') === 0;
        }).map(function (item) { return item.id; })
      };

      FB.rf = oldRf;
      FB.chance = oldChance;
      FB.game.auto.hosts = oldAuto;
      FBDATA.balance.warWinsToTakeProvince = oldNeed;
      FBDATA.balance.aiMultiHostStrength = oldSplit;
      return out;
    });

    expect(result.worn).toBeCloseTo(result.base * 0.7, 6);
    expect(result.fresh).toBeCloseTo(result.base * 1.1, 6);
    expect(result.led).toBeCloseTo(result.base * 1.1, 6);
    expect(result.rested).toBeCloseTo(result.base * 1.05, 6);
    expect(result.blessedAfter).toBeUndefined();
    expect(result.battleEvents).toEqual(['field_battle_won']);
  });
