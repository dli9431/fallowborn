'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'data/actions.js',
  'js/actions.js',
  'js/armies.js', 'js/logistics.js', 'js/market.js',
  'js/world.js', 'js/wars.js',
  'js/fortifications.js', 'js/util.js',
  'js/holywar.js',
  'js/events.js',
  'js/mapview.js',
  'js/ui_misc.js',
  'js/ui_panels.js',
  'js/ui_wars.js',
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
      FB.state.player.tier = 4;
      FB.state.player.liege = null;
      FB.state.player.provs = [FB.state.player.provinceId];
      FB.foundPlayerRealm(FB.state);
      FB.state.owner[FB.state.player.provinceId] = 'player';
      FB.state.holder[FB.state.player.provinceId] = 'player';
      FB.invalidateRealmCache();

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
        /* Strong enough to shatter sixty men, but below the separately
           covered overrun threshold so encirclement owns the destruction. */
        id:'pocket_foe', realm:enemy, men:100, size:100,
        units:{ levy:100, arch:0, cav:0, ret:0, mercs:0 },
        at:'x', from:'x', moveLeft:0, path:[], goal:null, supply:100
      };
      state.armies = [host, foe];
      // Raw fixture wars need the same registry binding as the daily tick
      // before querying hostility or encirclement.
      FB.ensureWars(state);
      FB.assignCampaignHosts(state);
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
      FB.state.player.tier = 4;
      FB.state.player.liege = null;
      FB.state.player.provs = [FB.state.player.provinceId];
      FB.foundPlayerRealm(FB.state);
      FB.state.owner[FB.state.player.provinceId] = 'player';
      FB.state.holder[FB.state.player.provinceId] = 'player';
      FB.invalidateRealmCache();

      const before = FB.save.serialize();
      const home = FB.state.player.provinceId;
      /* peacetime hosts are not a legal persistent state: repairWars drops
         every host whose realm has no active war on restore */
      let enemy = null;
      for (const realmId in FB.state.realms) {
        const realm = FB.state.realms[realmId];
        if (realmId !== 'player' && realm && realm.alive && !realm.liege) {
          enemy = realmId;
          break;
        }
      }
      FB.state.player.war = { enemy:enemy };
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
        detachmentFrac:FBDATA.balance.aiDetachmentFrac,
        minMen:FBDATA.balance.armyMinMen,
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
      Math.round(result.muster * result.detachmentFrac));
    expect(result.hosts[1].men).toBeGreaterThanOrEqual(result.minMen);
    /* no detachment was destroyed: the shorter rearm clock stays unset */
    expect(result.detachmentRearm).toBeUndefined();
  });

test('co-located split groups have sufficient non-overlapping spatial separation and direct tap selection',
  async function ({ page }) {
    const result = await page.evaluate(function () {
      const state = FB.state;
      const originalHosts = state.armies;
      const home = state.player.provinceId;
      const hostA = {
        id:'host_a', realm:'player', men:400, size:400,
        units:{ levy:400, arch:0, cav:0, ret:0, mercs:0 },
        at:home, from:home, moveLeft:0, path:[], goal:null, supply:100
      };
      state.armies = [hostA];
      const hostB = FB.splitHost(state, hostA);
      const hostC = FB.splitHost(state, hostA);

      const pr = FB.world.byId[home];
      const posA = FB.armyWorldPos(state, hostA);
      const posB = FB.armyWorldPos(state, hostB);
      const posC = FB.armyWorldPos(state, hostC);

      const distAB = Math.hypot(posA[0] - posB[0], posA[1] - posB[1]);
      const distBC = Math.hypot(posB[0] - posC[0], posB[1] - posC[1]);
      const distCA = Math.hypot(posC[0] - posA[0], posC[1] - posA[1]);

      const sites = (FB.world && FB.world.sitesByProv && FB.world.sitesByProv[home])
        ? FB.world.sitesByProv[home].list : [{ x: pr.cx, y: pr.cy }];
      const seat = sites[0];
      const distSeatA = Math.hypot(posA[0] - seat.x, posA[1] - seat.y);
      const distSeatB = Math.hypot(posB[0] - seat.x, posB[1] - seat.y);
      const distSeatC = Math.hypot(posC[0] - seat.x, posC[1] - seat.y);
      const screenScale = FB.map.zoom / (FB.map.dpr || 1);
      const originalRefresh = FB.ui.refresh;
      let exactRefreshes = 0;
      FB.ui.refresh = function (options) {
        if (!options || !options.liveTick) exactRefreshes++;
      };

      // Direct tap selection on host B's world coordinates
      FB.selectArmy(null);
      FB.armyTap(state, pr, posB[0], posB[1]);
      const selAfterTapB = FB.selectedArmy(state);

      // Direct tap selection on host C's world coordinates
      FB.armyTap(state, pr, posC[0], posC[1]);
      const selAfterTapC = FB.selectedArmy(state);

      // Tapping the already-selected host C halts it and deselects
      FB.armyTap(state, pr, posC[0], posC[1]);
      const selAfterHaltC = FB.selectedArmy(state);

      FB.ui.refresh = originalRefresh;
      state.armies = originalHosts;
      FB.selectArmy(null);

      return {
        hostCount:3,
        home:home,
        distAB:distAB * screenScale,
        distBC:distBC * screenScale,
        distCA:distCA * screenScale,
        distSeatA:distSeatA * screenScale,
        distSeatB:distSeatB * screenScale,
        distSeatC:distSeatC * screenScale,
        provAId:FB.provinceAtGrid(posA[0], posA[1]) ? FB.provinceAtGrid(posA[0], posA[1]).id : null,
        provBId:FB.provinceAtGrid(posB[0], posB[1]) ? FB.provinceAtGrid(posB[0], posB[1]).id : null,
        provCId:FB.provinceAtGrid(posC[0], posC[1]) ? FB.provinceAtGrid(posC[0], posC[1]).id : null,
        hasOutline:!!FB.provinceOutline(home),
        selBId:selAfterTapB ? selAfterTapB.id : null,
        selCId:selAfterTapC ? selAfterTapC.id : null,
        selAfterHaltC:selAfterHaltC,
        exactRefreshes:exactRefreshes,
        targetBId:hostB ? hostB.id : null,
        targetCId:hostC ? hostC.id : null
      };
    });

    expect(result.hostCount).toBe(3);
    // All 3 co-located hosts must have significant spatial separation with no overlap
    expect(result.distAB).toBeGreaterThan(15);
    expect(result.distBC).toBeGreaterThan(15);
    expect(result.distCA).toBeGreaterThan(15);
    // All hosts must be spaced away from the settlement seat
    expect(result.distSeatA).toBeGreaterThan(15);
    expect(result.distSeatB).toBeGreaterThan(15);
    expect(result.distSeatC).toBeGreaterThan(15);
    // All hosts must remain strictly inside their own county boundaries
    expect(result.provAId).toBe(result.home);
    expect(result.provBId).toBe(result.home);
    expect(result.provCId).toBe(result.home);
    // Zoomed-out troop border outline must exist
    expect(result.hasOutline).toBe(true);
    expect(result.selBId).toBe(result.targetBId);
    expect(result.selCId).toBe(result.targetCId);
    expect(result.selAfterHaltC).toBeNull();
    expect(result.exactRefreshes).toBe(1);
  });

test('wartime marker layout survives pan and quiet days until an army visibly changes',
  async function ({ page }) {
    const result = await page.evaluate(function () {
      const state = FB.state;
      const originalHosts = state.armies;
      const originalTurn = state.turn;
      const originalAtGrid = FB.provinceAtGrid;
      const originalViewX = FB.map.viewX;
      const home = state.player.provinceId;
      const host = {
        id:'layout_cache_primary', realm:'player', men:400, size:400,
        units:{ levy:400, arch:0, cav:0, ret:0, mercs:0 },
        at:home, from:home, moveLeft:0, path:[], goal:null, supply:100
      };
      state.armies = [host];
      const detachment = FB.splitHost(state, host);
      let gridHits = 0;
      FB.provinceAtGrid = function (x, y) {
        gridHits++;
        return originalAtGrid(x, y);
      };

      const first = [
        FB.armyWorldPos(state, host),
        FB.armyWorldPos(state, detachment)
      ];
      const firstFrameHits = gridHits;
      FB.map.viewX += 25;
      const second = [
        FB.armyWorldPos(state, host),
        FB.armyWorldPos(state, detachment)
      ];
      const panFrameHits = gridHits;

      state.turn++;
      FB.armyWorldPos(state, host);
      const quietDayHits = gridHits;
      FB.splitHost(state, host);
      FB.armyWorldPos(state, host);
      const changedArmyHits = gridHits;
      FB.provinceOutline(home);
      const preparedBounds = FB.world.provs.filter(function (pr) {
        return !!pr._bounds;
      }).length;

      FB.provinceAtGrid = originalAtGrid;
      FB.map.viewX = originalViewX;
      state.turn = originalTurn;
      state.armies = originalHosts;
      return {
        first:first,
        second:second,
        firstFrameHits:firstFrameHits,
        panFrameHits:panFrameHits,
        quietDayHits:quietDayHits,
        changedArmyHits:changedArmyHits,
        preparedBounds:preparedBounds,
        provinceCount:FB.world.provs.length
      };
    });

    expect(result.firstFrameHits).toBeGreaterThan(0);
    expect(result.panFrameHits).toBe(result.firstFrameHits);
    expect(result.second).toEqual(result.first);
    expect(result.quietDayHits).toBe(result.panFrameHits);
    expect(result.changedArmyHits).toBeGreaterThan(result.quietDayHits);
    expect(result.preparedBounds).toBe(result.provinceCount);
  });

test('Land tab renders modular war card with critical troop summary, decisions, and interactive details',
  async function ({ page }) {
    await page.evaluate(function () {
      const state = FB.state;
      const home = state.player.provinceId;
      const host = {
        id:'test_war_card_host', realm:'player', men:600, size:600,
        units:{ levy:300, arch:100, cav:50, ret:150, mercs:0 },
        at:home, from:home, moveLeft:0, path:[], goal:null, supply:85
      };
      state.armies = [host];
      FB.selectArmy(host.id);
      FB.ui.showTab('prov');
      FB.ui.refresh();
    });

    const warCard = page.locator('#land-war-card');
    await expect(warCard).toBeVisible();
    await expect(warCard.locator('.settcard-head')).toContainText('War & Host');
    await expect(warCard).toContainText('Status');
    await expect(warCard).toContainText('Troops');
    await expect(warCard).toContainText('Supply & Upkeep');
    await expect(warCard.locator('#btn-host-split')).toBeVisible();
    await expect(warCard.locator('#btn-host-halt')).toBeVisible();

    // The details container is initially hidden on card face
    const details = warCard.locator('#war-card-details');
    await expect(details).toHaveClass(/hidden/);

    // Clicking the '?' toggle button expands the details (mobile/touch interaction)
    const infoBtn = warCard.locator('.settcard-info');
    await infoBtn.click();
    await expect(details).not.toHaveClass(/hidden/);
    await expect(details).toContainText('Troop Composition & Battle Quality');
    await expect(details).toContainText('attack');
    await expect(details).toContainText('defense');

    // Clicking '?' again collapses the details
    await infoBtn.click();
    await expect(details).toHaveClass(/hidden/);
  });

test('Land tab shows war card when selecting a county containing troops without explicit army selection',
  async function ({ page }) {
    await page.evaluate(function () {
      const state = FB.state;
      const home = state.player.provinceId;
      const host = {
        id:'county_stationed_host', realm:'player', men:450, size:450,
        units:{ levy:300, arch:150, cav:0, ret:0, mercs:0 },
        at:home, from:home, moveLeft:0, path:[], goal:null, supply:100
      };
      state.armies = [host];
      FB.selectArmy(null); // Clear selected army
      FB.map.select(home); // Select the county containing the host
      FB.ui.showTab('prov');
      FB.ui.refresh();
    });

    const warCard = page.locator('#land-war-card');
    await expect(warCard).toBeVisible();
    await expect(warCard.locator('.settcard-head')).toContainText('War & Host');
    await expect(warCard).toContainText('450');
    await expect(warCard.locator('#btn-host-split')).toBeVisible();
  });

test('Deeds campaign list opens host assignments and shared details',
  async function ({ page }) {
    const fixture = await page.evaluate(function () {
      const state = FB.state;
      state.player.tier = 4;
      state.player.liege = null;
      state.player.provs = [state.player.provinceId];
      FB.foundPlayerRealm(state);
      state.owner[state.player.provinceId] = 'player';
      state.holder[state.player.provinceId] = 'player';
      FB.invalidateRealmCache();
      const enemy = Object.keys(state.realms).filter(function (id) {
        return id !== 'player' && state.realms[id].alive && !state.realms[id].liege;
      }).sort()[0];
      const target = state.realms[enemy].capital;
      const war = FB.registerOrdinaryWar(state, 'player', {
        enemy:enemy, target:target, wins:1, losses:0, strength:1,
        started:state.turn - 30
      });
      const home = state.player.provinceId;
      state.armies = [{
        id:'deeds_test_host', realm:'player', warId:war.id, men:7800, size:7800,
        units:{ levy:3300, arch:1000, cav:1300, ret:2200, mercs:0 },
        at:home, from:home, moveLeft:0, path:[], goal:null, supply:70
      }];
      FB.ui.showTab('actions');
      FB.ui.refresh();
      return { id:war.id, enemy:state.realms[enemy].name,
        county:FB.world.byId[target].name };
    });

    const list = page.locator('[data-campaign-list]');
    await expect(list).toBeVisible();
    const campaign = list.locator('[data-campaign-open="' + fixture.id + '"]');
    await expect(campaign).toContainText(fixture.enemy);
    await expect(campaign).toContainText('0/1 objectives occupied');
    await campaign.click();
    const sheet = page.locator('[data-campaign-detail="' + fixture.id + '"]');
    await expect(sheet).toBeVisible();
    await expect(sheet).toContainText(fixture.county);
    await expect(sheet).toContainText('7800 men');
    await expect(sheet).toContainText('Total upkeep');
    await expect(sheet.locator('[data-host-campaign="deeds_test_host"]')).toHaveValue(fixture.id);
    const hosts = sheet.locator('#campaign-host-details-section');
    const details = hosts.locator('#campaign-host-details');
    await expect(details).toBeHidden();
    await hosts.locator('.settcard-info').click();
    await expect(details).toBeVisible();
    await expect(details).toContainText('Hosts share troops, supplies, and upkeep');
    await hosts.locator('.settcard-info').click();
    await expect(details).toBeHidden();
    await page.locator('#campaign-back').click();
    await expect(list).toBeVisible();
    await expect(campaign).toContainText('0/1 objectives occupied');
  });

test('ownership badges distinguish controlled hosts from same-color allies at every zoom',
  async function ({ page }) {
    const results = await page.evaluate(function () {
      const s = FB.state, home = s.player.provinceId;
      const makeHost = function (id, realm) {
        return { id:id, realm:realm, at:home, from:home, men:400, size:400,
          units:{ levy:400 }, path:[], moveLeft:0, supply:100 };
      };
      s.armies = [makeHost('badge-primary', 'player'),
        makeHost('badge-split', 'player'), makeHost('badge-ally', 'badge-realm'),
        makeHost('badge-command', 'badge-realm')];
      s.realms['badge-realm'] = { id:'badge-realm', alive:true, name:'Ally',
        color:'#3fae4a', capital:home, rank:4 };
      s.player.militaryCommand = { sovereignRealmId:'badge-realm', hostId:'badge-command' };
      const originalCommand = FB.activeMilitaryCommand;
      const originalCutOff = FB.hostCutOff;
      FB.activeMilitaryCommand = function () { return s.player.militaryCommand; };
      FB.hostCutOff = function () { return true; };
      FB.selectArmy(null);
      const canvas = document.createElement('canvas');
      canvas.width = 1000; canvas.height = 800;
      const ctx = canvas.getContext('2d');
      const originalFill = ctx.fillText;
      const originalDraw = ctx.drawImage;
      let badges = [];
      const expected = document.createElement('canvas');
      expected.width = 48; expected.height = 56;
      ctx.drawImage = function (image, x, y) {
        badges.push({ x:x, y:y, matches:image.toDataURL() === expected.toDataURL() });
        return originalDraw.apply(this, arguments);
      };
      let labels = [];
      ctx.fillText = function (text, x, y) {
        labels.push({ text:text, x:x, y:y });
        return originalFill.apply(this, arguments);
      };
      const results = [];
      try {
        for (const dpr of [1, 2]) {
          for (const zoom of [0.8, 2, 5]) {
            // Changing the dynasty must refresh the cached army heraldry.
            s.chars[s.player.charId].dyn = 'Army crest ' + dpr + ' ' + zoom;
            FB.drawCrest(expected, s.chars[s.player.charId].dyn);
            labels = [];
            badges = [];
            FB.renderArmies(ctx, function () { return [400, 400]; }, zoom, dpr);
            const warnings = labels.filter(function (label) { return label.text === '✂'; });
            results.push({ badges:badges.length, warnings:warnings.length,
              matchingCrests:badges.every(function (badge) { return badge.matches; }),
              hasYouLabel:labels.some(function (label) { return label.text === FB.T('You'); }),
              aboveWarnings:badges.every(function (badge) {
                return warnings.every(function (warning) { return badge.y < warning.y - 12 * dpr; });
              }), selected:FB.selectedArmy(s) });
          }
        }
      } finally {
        FB.activeMilitaryCommand = originalCommand;
        FB.hostCutOff = originalCutOff;
      }
      return results;
    });
    expect(results).toHaveLength(6);
    for (const result of results) {
      expect(result).toEqual({ badges:3, warnings:4, aboveWarnings:true,
        hasYouLabel:false, matchingCrests:true, selected:null });
    }
  });

test('Map routes show controlled hosts and only the active-war enemy',
  async function ({ page }) {
    const result = await page.evaluate(function () {
      const state = FB.state;
      const home = state.player.provinceId;
      const adj = Object.keys(FB.world.adj[home] || {});
      const targetPid = adj[0];
      const makeHost = function (id, realm) {
        return {
          id:id, realm:realm, men:500, size:500,
          units:{ levy:300, arch:200, cav:0, ret:0, mercs:0 },
          at:home, from:home, moveLeft:10, path:[targetPid],
          goal:targetPid, supply:90
        };
      };
      const playerHost = makeHost('marching_route_host', 'player');
      const enemyHost = makeHost('marching_enemy_host', 'route_enemy');
      const bystanderHost = makeHost('marching_bystander_host', 'route_bystander');
      state.realms.route_enemy = {
        id:'route_enemy', name:'Route Enemy', alive:true,
        capital:targetPid, color:'#8f3028', rank:4
      };
      state.realms.route_bystander = {
        id:'route_bystander', name:'Route Bystander', alive:true,
        capital:targetPid, color:'#405080', rank:4
      };
      state.armies = [playerHost, enemyHost, bystanderHost];
      state.player.war = {
        enemy:'route_enemy', target:targetPid, wins:0, losses:0,
        seasons:0, defending:false, strength:1
      };

      let routeDash = false;
      let routeStrokes = [];
      const mockCtx = {
        canvas: { width: 800, height: 600 },
        strokeStyle: '',
        lineWidth: 1,
        fillStyle: '',
        font: '',
        textAlign: '',
        textBaseline: '',
        setLineDash: function (dash) { routeDash = !!dash.length; },
        beginPath: function () {},
        moveTo: function () {},
        lineTo: function () {},
        stroke: function () {
          if (routeDash) routeStrokes.push(this.strokeStyle);
        },
        arc: function () {},
        ellipse: function () {},
        closePath: function () {},
        fill: function () {},
        fillText: function () {},
        drawImage: function () {},
        strokeText: function () {},
        save: function () {},
        restore: function () {},
        scale: function () {},
        translate: function () {}
      };
      const toScreen = function (x, y) { return [x * 10, y * 10]; };
      FB.renderArmies(mockCtx, toScreen, 2, 1);
      const wartimeRoutes = routeStrokes.slice();

      routeStrokes = [];
      state.player.war = null;
      FB.renderArmies(mockCtx, toScreen, 2, 1);

      return {
        wartimeRoutes:wartimeRoutes,
        peacetimeRoutes:routeStrokes,
        playerHasPath:playerHost.path.length > 0,
        enemyHasPath:enemyHost.path.length > 0,
        bystanderHasPath:bystanderHost.path.length > 0
      };
    });

    expect(result.playerHasPath).toBe(true);
    expect(result.enemyHasPath).toBe(true);
    expect(result.bystanderHasPath).toBe(true);
    expect(result.wartimeRoutes).toEqual([
      'rgba(255, 215, 80, 0.92)',
      'rgba(220, 68, 54, 0.96)'
    ]);
    expect(result.peacetimeRoutes).toEqual([
      'rgba(255, 215, 80, 0.92)'
    ]);
  });

test('Ordering army to a second location overrides the path directly instead of chaining',
  async function ({ page }) {
    const result = await page.evaluate(function () {
      const state = FB.state;
      const home = state.player.provinceId;
      const adj = Object.keys(FB.world.adj[home] || {});
      const dest1 = adj[0];
      const dest2 = adj.length > 1 ? adj[1] : adj[0];

      const host = {
        id:'override_test_host', realm:'player', men:400, size:400,
        units:{ levy:400, arch:0, cav:0, ret:0, mercs:0 },
        at:home, from:home, moveLeft:0, path:[], goal:null, supply:100
      };
      state.armies = [host];

      // 1. First move order to dest1
      FB.orderArmy(state, host, dest1);
      const path1 = host.path.slice();
      const goal1 = host.goal;

      // 2. Second move order to dest2 (override)
      FB.orderArmy(state, host, dest2);
      const path2 = host.path.slice();
      const goal2 = host.goal;

      return {
        path1: path1,
        goal1: goal1,
        path2: path2,
        goal2: goal2,
        // Path2 must not start with dest1 if dest2 is different (it shouldn't chain)
        chained: (dest1 !== dest2) ? (path2[0] === dest1 && path2.indexOf(dest2) > 0) : false
      };
    });

    expect(result.goal2).not.toBeNull();
    expect(result.chained).toBe(false);
  });

test('Armies resupply and are friendly in vassal and realm lands',
  async function ({ page }) {
    const result = await page.evaluate(function () {
      const state = FB.state;
      state.player.liege = 'test_liege';
      state.realms.test_liege = {
        id:'test_liege', name:'Test Liege', alive:true, liege:null
      };
      state.realms.test_vassal = {
        id:'test_vassal', name:'Vassal Duke', alive:true, liege:'test_liege'
      };
      let enemy = null;
      for (const rid in state.realms) {
        const realm = state.realms[rid];
        if (rid !== 'player' && rid !== 'test_liege' && realm && realm.alive &&
            !realm.liege) {
          enemy = rid;
          break;
        }
      }
      state.player.war = { enemy:enemy, defending:false };

      /* Use a live map county: armiesEnsure correctly rejects invented
         province ids before the supply pass. Keep it outside the player's
         personal holdings so the vassal relationship is what makes it
         friendly. */
      const playerProvs = state.player.provs || [];
      const vassalPid = Object.keys(FB.world.byId).find(function (pid) {
        const province = FB.world.byId[pid];
        return province && !province.wasteland &&
          playerProvs.indexOf(pid) < 0 && state.holder[pid] !== 'player';
      });
      state.holder[vassalPid] = 'test_vassal';
      state.owner[vassalPid] = 'test_liege';

      const host = {
        id:'vassal_resupply_host', realm:'player', men:400, size:400,
        units:{ levy:400, arch:0, cav:0, ret:0, mercs:0 },
        at:vassalPid, from:vassalPid, moveLeft:0, path:[], goal:null, supply:50
      };
      state.armies = [host];

      const isFriendly = FB.armyFriendlyProvince(state, host, vassalPid);

      // Run supply tick
      FB.armyTick(state);

      return {
        isFriendly: isFriendly,
        supplyAfter: host.supply
      };
    });

    expect(result.isFriendly).toBe(true);
    expect(result.supplyAfter).toBeGreaterThan(50);
  });

test('local provisioning reuses county demand while reading live stocks',
  async function ({ page }) {
    const result = await page.evaluate(function () {
      const s = FB.state, pid = s.player.provinceId;
      FB.ensureMarket(s);
      const first = FB.marketProvisionSource(s, pid);
      const original = FB.settlementsOf;
      let reads = 0;
      FB.settlementsOf = function () { reads++; return original.apply(this, arguments); };
      try {
        FB.marketWithdrawProvisions(s, pid, 0.012345);
        const second = FB.marketProvisionSource(s, pid);
        FB.marketProvisionSource(s, pid);
        return { removed:first.stock - second.stock, demand:first.demand === second.demand, reads:reads };
      } finally { FB.settlementsOf = original; }
    });
    expect(result.removed).toBeCloseTo(0.012345, 8);
    expect(result.demand).toBe(true);
    expect(result.reads).toBe(0);
  });
