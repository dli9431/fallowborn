'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, ['js/armies.js', 'js/fortifications.js', 'js/wars.js',
  'js/world.js', 'js/logistics.js', 'js/ui_misc.js', 'data/counties.js',
  'data/map_data.js', 'data/bookmarks.js']);
const { test, expect } = require('../support/fixture');
const { startWarSafety } = require('../support/game/war-safety');

async function setup(page, testInfo) {
  await startWarSafety(page, testInfo);
  await page.evaluate(function () {
    const s = FB.state;
    const host = FB.playerHost(s);
    window.orderHost = host;
    window.orderWar = FB.ordinaryWarById(s, host.warId);
    window.orderWorld = FB.world;
    const adj = { avignon:{ le_puy:1, arles:1 }, le_puy:{ avignon:1, vienne:1 },
      vienne:{ le_puy:1 }, arles:{ avignon:1 }, isolated:{} };
    const byId = {};
    Object.keys(adj).forEach(function (pid, i) {
      byId[pid] = { id:pid, name:pid, terrain:'farmland', cx:i, cy:0 };
    });
    window.orderGraph = Object.assign({}, FB.world, { adj:adj, byId:byId, waterAdj:{} });
    host.at = host.from = 'avignon'; host.path = []; host.goal = null;
    host.moveLeft = 0; host.men = host.size = 2463;
    host.units = { levy:2463 }; host.supply = 100;
    FB.fortBlocksArmy = function () { return false; };
    FB.armyFriendlyProvince = function (state, host, pid) { return pid === 'avignon'; };
    FB.waterCrossing = function () { return null; };
    FB.armyMarchDays = function () { return 6; };
  });
}

test('an unchanged legal march keeps its elapsed leg and a rejected order preserves it', async function ({ page }, testInfo) {
  await setup(page, testInfo);
  const r = await page.evaluate(function () {
    const previousWorld = FB.world;
    try {
      if (window.orderGraph) FB.world = window.orderGraph;
      const s = FB.state, host = window.orderHost;
      FB.orderArmy(s, host, 'vienne');
      host.moveLeft = 3;
      const second = FB.orderArmy(s, host, 'vienne');
      const remaining = host.moveLeft;
      const rejected = FB.orderArmy(s, host, 'isolated');
      return { second:second, remaining:remaining, rejected:rejected,
        goal:host.goal, path:host.path, after:host.moveLeft };
    } finally { FB.world = previousWorld; }
  });
  expect(r).toEqual({ second:true, remaining:3, rejected:false,
    goal:'vienne', path:['le_puy', 'vienne'], after:3 });
});

test('fort previews identify the actual stop and pinned orders identify the current fort', async function ({ page }, testInfo) {
  await setup(page, testInfo);
  const r = await page.evaluate(function () {
    const previousWorld = FB.world;
    try {
      if (window.orderGraph) FB.world = window.orderGraph;
      const s = FB.state, host = window.orderHost;
      FB.fortBlocksArmy = function (state, pid) { return pid === 'le_puy'; };
      const plan = FB.armyOrderPlan(s, host, 'vienne');
      FB.orderArmy(s, host, 'vienne', plan);
      const path = host.path.slice();
      host.at = 'le_puy'; host.from = 'avignon'; host.path = []; host.moveLeft = 0;
      const pinned = FB.armyOrderPlan(s, host, 'vienne');
      const back = FB.armyOrderPlan(s, host, 'avignon');
      return { stop:plan.stop, requested:plan.requested, blocker:plan.blockedByFort,
        path:path, pinned:pinned.reason, pinnedAt:pinned.blockedByFort, back:back.ok };
    } finally { FB.world = previousWorld; }
  });
  expect(r).toEqual({ stop:'le_puy', requested:'vienne', blocker:'le_puy',
    path:['le_puy'], pinned:'pinned', pinnedAt:'le_puy', back:true });
});

test('a displaced enemy banner orders its own county and rejection retains selection', async function ({ page }, testInfo) {
  await setup(page, testInfo);
  const r = await page.evaluate(function () {
    const previousWorld = FB.world;
    try {
      if (window.orderGraph) FB.world = window.orderGraph;
      const s = FB.state, host = window.orderHost;
      const enemy = { id:'banner', realm:window.orderWar.enemy, at:'vienne',
        men:2379, size:2379, units:{ levy:2379 }, path:[], moveLeft:0 };
      s.armies = [host, enemy];
      FB.armyAtWorld = function () { return enemy; };
      FB.selectArmy(host.id);
      FB.armyTap(s, FB.world.byId.arles, 0, 0);
      const destination = host.goal;
      FB.selectArmy(host.id);
      FB.armyAtWorld = function () { return null; };
      FB.armyTap(s, FB.world.byId.isolated, 0, 0);
      return { destination:destination, selected:FB.selectedArmy(s).id, id:host.id };
    } finally { FB.world = previousWorld; }
  });
  expect(r.destination).toBe('vienne');
  expect(r.selected).toBe(r.id);
});

test('pursuit skips an unreachable nearest enemy and an unfavorable reachable enemy', async function ({ page }, testInfo) {
  await setup(page, testInfo);
  const r = await page.evaluate(function () {
    const previousWorld = FB.world;
    try {
      if (window.orderGraph) FB.world = window.orderGraph;
      const s = FB.state, host = window.orderHost;
      FB.world.byId.isolated.cx = 0.1;
      s.armies = [host, { realm:'enemy', at:'isolated', men:100 },
        { realm:'enemy', at:'le_puy', men:10000 }, { realm:'enemy', at:'arles', men:100 }];
      FB.armiesHostile = function (state, a, b) { return a.realm !== b.realm; };
      FB.armyCanPursue = function (state, army, pid) { return pid !== 'le_puy'; };
      const rng = FB.getRngState();
      return { goal:FB.armyPursuitGoal(s, host), unchanged:FB.getRngState() === rng };
    } finally { FB.world = previousWorld; }
  });
  expect(r).toEqual({ goal:'arles', unchanged:true });
});

test('siege alternatives respect occupation, reachability, fort force, and campaign objectives', async function ({ page }, testInfo) {
  await setup(page, testInfo);
  const r = await page.evaluate(function () {
    const previousWorld = FB.world;
    try {
      if (window.orderGraph) FB.world = window.orderGraph;
      const s = FB.state, host = window.orderHost, war = window.orderWar;
      war.attacker = host.realm; war.objectives = [{ target:'isolated' }, { target:'vienne' }, { target:'arles' }];
      war.occupations = {};
      FB.armyCanPursue = function () { return true; };
      FB.fortSiegeStatus = function (state, pid) { return { canProgress:pid !== 'vienne' }; };
      const first = FB.armyCampaignAdvanceGoal(s, host);
      war.occupations.arles = { occupied:true };
      const noForce = FB.armyCampaignAdvanceGoal(s, host);
      FB.fortSiegeStatus = function () { return { canProgress:true }; };
      FB.fortBlocksArmy = function (state, pid) { return pid === 'le_puy'; };
      const neutralBlocker = FB.armyCampaignAdvanceGoal(s, host);
      war.objectives.push({ target:'le_puy' });
      const objectiveFort = FB.armyCampaignAdvanceGoal(s, host);
      return { first:first, noForce:noForce, neutralBlocker:neutralBlocker, objectiveFort:objectiveFort };
    } finally { FB.world = previousWorld; }
  });
  expect(r).toEqual({ first:'arles', noForce:null, neutralBlocker:null, objectiveFort:'le_puy' });
});

test('the saved Avignon to Vienne scenario exposes either a valid march or its first fort', async function ({ page }, testInfo) {
  await startWarSafety(page, testInfo);
  const r = await page.evaluate(function () {
    const previousWorld = FB.world;
    try {
      if (window.orderGraph) FB.world = window.orderGraph;
      const s = FB.state, host = FB.playerHost(s);
      // Minimal facts from bug.txt; retain the real generated county graph.
      host.at = 'avignon'; host.from = 'le_puy'; host.path = [];
      host.goal = 'avignon'; host.moveLeft = 0; host.men = 2463; host.supply = 100;
      s.player.provinceId = 'avignon'; s.player.provs = ['avignon'];
      s.owner.avignon = s.holder.avignon = 'player';
      s.buildings.avignon = [];
      for (const pid of ['vienne', 'lyon', 'grenoble']) {
        s.owner[pid] = s.holder[pid] = 'burgundy'; s.buildings[pid] = [{ id:'walls', level:1 }];
      }
      s.buildings.le_puy = [{ id:'walls', level:2 }];
      FB.invalidateRealmCache(); FB.invalidateFortIndex();
      const plan = FB.armyOrderPlan(s, host, 'vienne');
      return { ok:plan.ok, requested:plan.requested, stop:plan.stop,
        blocker:plan.blockedByFort, path:plan.path,
        legal:plan.path.every(function (pid, i) {
          return !!FB.world.adj[i ? plan.path[i - 1] : 'avignon'][pid];
        }) };
    } finally { FB.world = previousWorld; }
  });
  expect(r.ok).toBe(true);
  expect(r.requested).toBe('vienne');
  expect(r.path.length).toBeGreaterThan(0);
  expect(r.stop).toBe(r.blocker || 'vienne');
  expect(r.legal).toBe(true);
});
