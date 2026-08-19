'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'js/armies.js',
  'js/world.js',
  'js/fortifications.js',
  'js/holywar.js',
  'js/events.js',
  'js/save.js',
  'data/units.js',
  'data/map_data.js',
  'data/technology.js'
]);

/* Multiple hosts per realm (docs/plans/archive/warfare-terrain-supply-units-and-multihost.md
   phase 3): splitting and merging player hosts, encirclement destruction and
   the elevated capture odds, save/load round-trip of detachments, and AI
   detachments above the multi-host strength threshold. These tests are
   authored for the owner-run Playwright harness and deliberately do not
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

test('splitting a host fields two banners with proportional men and supply',
  async function ({ page }) {
    const result = await page.evaluate(function () {
      const state = FB.state;
      const originalHosts = state.armies;
      const home = state.player.provinceId;
      const host = {
        id:'split_host', realm:'player', men:500, size:500,
        units:{ levy:300, arch:50, cav:50, ret:100, mercs:0 },
        at:home, from:home, moveLeft:0, path:[], goal:null, supply:80
      };
      state.armies = [host];

      const marching = {
        id:'marching_host', realm:'player', men:400, size:400,
        units:{ levy:400, arch:0, cav:0, ret:0, mercs:0 },
        at:home, from:home, moveLeft:2, path:[home], goal:home, supply:100
      };
      const tiny = {
        id:'tiny_host', realm:'player', men:60, size:60,
        units:{ levy:60, arch:0, cav:0, ret:0, mercs:0 },
        at:home, from:home, moveLeft:0, path:[], goal:null, supply:100
      };
      const marchingStatus = FB.splitHostStatus(state, marching);
      const tinyStatus = FB.splitHostStatus(state, tiny);
      const status = FB.splitHostStatus(state, host);
      const detachment = FB.splitHost(state, host);
      const splitNews = state.log.filter(function (entry) {
        return entry.msg && entry.msg.key === 'news.army.host_splits';
      }).length;
      const pick = function (units) {
        return units ? {
          levy:units.levy, arch:units.arch, cav:units.cav,
          ret:units.ret, mercs:units.mercs
        } : null;
      };
      const out = {
        status:status,
        marchingOk:marchingStatus.ok,
        tinyOk:tinyStatus.ok,
        tinyReason:tinyStatus.reason,
        hostCount:state.armies.length,
        hostMen:host.men,
        detachmentMen:detachment ? detachment.men : null,
        hostSupply:host.supply,
        detachmentSupply:detachment ? detachment.supply : null,
        hostUnits:pick(FB.hostUnits(host)),
        detachmentUnits:detachment ? pick(FB.hostUnits(detachment)) : null,
        detachmentHold:detachment ? detachment.holdManual : null,
        primaryIsHost:FB.hostOf(state, 'player') === host,
        splitNews:splitNews,
        minMen:FBDATA.balance.armyMinMen
      };
      state.armies = originalHosts;
      return out;
    });

    expect(result.status.ok).toBe(true);
    expect(result.status.targetMen).toBe(250);
    expect(result.marchingOk).toBe(false); // a host on the march does not divide
    expect(result.tinyOk).toBe(false); // 60 men cannot field two 40-man banners
    expect(result.tinyReason).toContain('40');
    expect(result.hostCount).toBe(2);
    expect(result.hostMen).toBe(250);
    expect(result.detachmentMen).toBe(250);
    expect(result.hostMen).toBeGreaterThanOrEqual(result.minMen);
    expect(result.detachmentMen).toBeGreaterThanOrEqual(result.minMen);
    /* the carried supply divides with the men: 80 split in half */
    expect(result.hostSupply).toBe(40);
    expect(result.detachmentSupply).toBe(40);
    /* every class divides in proportion and the totals are conserved */
    expect(result.hostUnits).toEqual({ levy:150, arch:25, cav:25, ret:50, mercs:0 });
    expect(result.detachmentUnits).toEqual({ levy:150, arch:25, cav:25, ret:50, mercs:0 });
    expect(result.detachmentHold).toBe(1); // a fresh detachment holds until ordered
    expect(result.primaryIsHost).toBe(true); // ties keep the original banner primary
    expect(result.splitNews).toBe(1);
  });

test('merging recombines two co-located hosts into one',
  async function ({ page }) {
    const result = await page.evaluate(function () {
      const state = FB.state;
      const originalHosts = state.armies;
      const home = state.player.provinceId;
      const host = {
        id:'merge_host', realm:'player', men:500, size:500,
        units:{ levy:300, arch:50, cav:50, ret:100, mercs:0 },
        at:home, from:home, moveLeft:0, path:[], goal:null, supply:80
      };
      state.armies = [host];
      const detachment = FB.splitHost(state, host);
      const partner = FB.mergeableHost(state, host);
      const merged = FB.mergeHosts(state, host, partner);
      const mergeNews = state.log.filter(function (entry) {
        return entry.msg && entry.msg.key === 'news.army.hosts_merge';
      }).length;
      const mergedUnits = merged ? FB.hostUnits(merged) : null;
      const out = {
        partnerIsDetachment:partner === detachment,
        survivorIsHost:merged === host,
        hostCount:state.armies.length,
        men:merged ? merged.men : null,
        size:merged ? merged.size : null,
        supply:merged ? merged.supply : null,
        units:mergedUnits ? {
          levy:mergedUnits.levy, arch:mergedUnits.arch, cav:mergedUnits.cav,
          ret:mergedUnits.ret, mercs:mergedUnits.mercs
        } : null,
        mergeNews:mergeNews
      };
      state.armies = originalHosts;
      return out;
    });

    expect(result.partnerIsDetachment).toBe(true);
    expect(result.survivorIsHost).toBe(true);
    expect(result.hostCount).toBe(1);
    expect(result.men).toBe(500);
    expect(result.size).toBe(500);
    expect(result.supply).toBe(40); // the pooled halves of the divided stock
    expect(result.units).toEqual({ levy:300, arch:50, cav:50, ret:100, mercs:0 });
    expect(result.mergeNews).toBe(1);
  });

test('a host shattered while cut off is destroyed outright, with graver capture odds',
  async function ({ page }) {
    const result = await page.evaluate(function () {
      const state = FB.state;
      const originalWorld = FB.world;
      const originalHosts = state.armies;
      const originalDown = state.armyDown;
      const originalWar = state.player.war;
      const originalAuto = FB.game.auto.hosts;
      const originalRf = FB.rf;
      const originalChance = FB.chance;
      const originalTier = state.player.tier;

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

      /* the capture roll: encircled odds beat the field base by the knob gap */
      state.player.war = { enemy:enemy, defending:true };
      state.player.tier = 3;
      let seen = null;
      FB.chance = function (probability) { seen = probability; return false; };
      FB.maybeCapturePlayer(state, true);
      const encircledOdds = seen;
      seen = null;
      FB.maybeCapturePlayer(state, false);
      const baseOdds = seen;
      FB.chance = originalChance;
      state.player.tier = originalTier;

      /* a pocket with a single hostile way out: x touches only enemy e1 */
      FB.world = {
        adj:{ x:{ e1:1 }, e1:{ x:1 } },
        waterAdj:{ x:{}, e1:{} },
        byId:{
          x:{ id:'x', name:'X', cx:0, cy:0, terrain:'farmland' },
          e1:{ id:'e1', name:'E1', cx:20, cy:0, terrain:'farmland' }
        }
      };
      const keptOwnerX = state.owner.x, keptOwnerE1 = state.owner.e1;
      const keptHolderX = state.holder ? state.holder.x : undefined;
      state.holder = state.holder || {};
      state.holder.x = 'player';
      state.owner.e1 = enemy;

      const host = {
        id:'pocket_host', realm:'player', men:60, size:60,
        units:{ levy:60, arch:0, cav:0, ret:0, mercs:0 },
        at:'x', from:'x', moveLeft:0, path:[], goal:null, supply:100
      };
      const foe = {
        id:'pocket_foe', realm:enemy, men:2000, size:2000,
        units:{ levy:2000, arch:0, cav:0, ret:0, mercs:0 },
        at:'x', from:'x', moveLeft:0, path:[], goal:null, supply:100
      };
      state.armies = [host, foe];
      const cutOff = FB.hostCutOff(state, host);

      FB.rf = function () { return 1; };
      const turn = state.turn;
      FB.armyTick(state);

      const survivors = state.armies.map(function (a) { return a.id; });
      const destroyedNews = state.log.filter(function (entry) {
        return entry.msg && entry.msg.key === 'news.army.host_destroyed_encircled';
      }).length;
      const out = {
        enemy:enemy,
        encircledOdds:encircledOdds,
        baseOdds:baseOdds,
        cutOff:cutOff,
        survivors:survivors,
        armyDownPlayer:state.armyDown.player,
        turn:turn,
        destroyedNews:destroyedNews
      };

      FB.rf = originalRf;
      state.armies = originalHosts;
      state.armyDown = originalDown;
      state.player.war = originalWar;
      FB.game.auto.hosts = originalAuto;
      if (keptOwnerX === undefined) delete state.owner.x; else state.owner.x = keptOwnerX;
      if (keptOwnerE1 === undefined) delete state.owner.e1;
      else state.owner.e1 = keptOwnerE1;
      if (keptHolderX === undefined) delete state.holder.x;
      else state.holder.x = keptHolderX;
      FB.world = originalWorld;
      return out;
    });

    expect(result.enemy).toBeTruthy();
    expect(result.cutOff).toBe(true);
    /* captureChanceEncircled (0.6) over captureChanceBase (0.35) */
    expect(result.encircledOdds - result.baseOdds).toBeCloseTo(0.25, 8);
    /* the shattered pocket host is destroyed, not routed home */
    expect(result.survivors).toEqual(['pocket_foe']);
    expect(result.armyDownPlayer).toBe(result.turn);
    expect(result.destroyedNews).toBe(1);
  });

test('detachments survive a save/load round trip',
  async function ({ page }) {
    const result = await page.evaluate(function () {
      const before = FB.save.serialize();
      const home = FB.state.player.provinceId;
      const host = {
        id:'roundtrip_host', realm:'player', men:400, size:400,
        units:{ levy:400, arch:0, cav:0, ret:0, mercs:0 },
        at:home, from:home, moveLeft:0, path:[], goal:null, supply:60
      };
      FB.state.armies = [host];
      FB.splitHost(FB.state, host);
      const payload = JSON.parse(FB.save.serialize());
      FB.save.restore(payload);
      const hosts = FB.hostsOf(FB.state, 'player').map(function (a) {
        return { men:a.men, supply:a.supply };
      });
      FB.save.restore(JSON.parse(before));
      return { hosts:hosts };
    });

    expect(result.hosts.length).toBe(2);
    expect(result.hosts[0]).toEqual({ men:200, supply:30 });
    expect(result.hosts[1]).toEqual({ men:200, supply:30 });
  });

test('a strong AI aggressor fields a detachment in an offensive war',
  async function ({ page }) {
    const result = await page.evaluate(function () {
      const state = FB.state;
      const originalHosts = state.armies;
      const originalDown = state.armyDown;
      const originalDetachmentDown = state.armyDetachmentDown;
      const originalWar = state.player.war;
      const originalAuto = FB.game.auto.hosts;
      const knob = FBDATA.balance.aiMultiHostStrength;

      const sovereigns = [];
      for (const realmId in state.realms) {
        const realm = state.realms[realmId];
        if (realmId !== 'player' && realm && realm.alive && !realm.liege) {
          sovereigns.push(realmId);
        }
      }
      sovereigns.sort(function (a, b) {
        return FB.aiBaseHost(state, b) - FB.aiBaseHost(state, a) ||
          (a < b ? -1 : a > b ? 1 : 0);
      });
      const aggressor = sovereigns[0];
      const defender = sovereigns[1];
      const keptWars = {};
      for (const realmId in state.realms) {
        keptWars[realmId] = state.realms[realmId].war;
        state.realms[realmId].war = null;
      }
      state.player.war = null;
      state.armies = [];
      state.armyDown = {};
      state.armyDetachmentDown = {};
      FB.game.auto.hosts = 'manual';
      /* the strongest realm clears the bar by a single spear */
      FBDATA.balance.aiMultiHostStrength = FB.aiBaseHost(state, aggressor) - 1;
      state.realms[aggressor].war = { enemy:defender };

      FB.armyTick(state);
      const hosts = FB.hostsOf(state, aggressor).map(function (a) {
        return { men:a.men, size:a.size };
      });
      const out = {
        aggressor:aggressor,
        muster:FB.aiBaseHost(state, aggressor),
        hosts:hosts,
        detachmentRearm:state.armyDetachmentDown[aggressor]
      };

      FBDATA.balance.aiMultiHostStrength = knob;
      state.armies = originalHosts;
      state.armyDown = originalDown;
      state.armyDetachmentDown = originalDetachmentDown;
      state.player.war = originalWar;
      FB.game.auto.hosts = originalAuto;
      for (const realmId in keptWars) {
        state.realms[realmId].war = keptWars[realmId];
      }
      return out;
    });

    expect(result.hosts.length).toBe(2);
    /* splitting conserves men: the two banners sum to the muster */
    expect(result.hosts[0].men + result.hosts[1].men).toBe(result.muster);
    expect(result.hosts[1].men).toBe(
      Math.round(result.muster * FBDATA.balance.aiDetachmentFrac));
    expect(result.hosts[1].men).toBeGreaterThanOrEqual(FBDATA.balance.armyMinMen);
    /* no detachment was destroyed: the shorter rearm clock stays unset */
    expect(result.detachmentRearm).toBeUndefined();
  });
