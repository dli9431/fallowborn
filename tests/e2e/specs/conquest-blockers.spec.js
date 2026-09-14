'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, ['js/armies.js', 'js/wars.js', 'js/world.js',
  'js/fortifications.js', 'js/logistics.js', 'js/holywar.js', 'js/ui_panels.js',
  'data/map_data.js', 'data/units.js']);
const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { startDeterministicGame } = require('../support/game/start');

async function arrange(page, testInfo) {
  await openGame(page, testInfo);
  await startDeterministicGame(page);
  return page.evaluate(function () {
    const s = FB.state, home = s.player.provinceId;
    const counties = [home].concat(FB.world.provs.filter(function (p) {
      return !p.wasteland && p.id !== home;
    }).slice(0, 3).map(function (p) { return p.id; }));
    const realms = Object.keys(s.realms).filter(function (id) {
      return id !== 'player' && s.realms[id].alive && !s.realms[id].liege;
    }).sort();
    s.player.tier = 4; s.player.liege = null; s.player.provs = [home];
    s.player.gold = 100000;
    FB.foundPlayerRealm(s);
    s.wars = {}; s.greatHolyWar = null;
    FB.ensureWars(s);
    const adj = {};
    counties.forEach(function (pid, i) {
      adj[pid] = {};
      if (i) adj[pid][counties[i - 1]] = 1;
      if (i < counties.length - 1) adj[pid][counties[i + 1]] = 1;
      s.owner[pid] = s.holder[pid] = i === 0 ? 'player' : i === 1 ? realms[1] : realms[0];
    });
    FB.world = Object.assign({}, FB.world, { adj:adj, waterAdj:{} });
    FB.invalidateRealmCache();
    const originalFort = FB.fortAt;
    FB.fortAt = function (state, pid) {
      if (counties.indexOf(pid) > 0) return { pid:pid, level:3, ruined:false };
      return originalFort(state, pid);
    };
    // Deterministic travel speeds isolate coordinated arrival from geography.
    FB.armyLegQuote = function (state, host) {
      return { totalDays:host.id === 'slow' ? 6 : 2, effectiveCapacity:100000,
        water:false, legs:1 };
    };
    const war = FB.registerOrdinaryWar(s, 'player', { enemy:realms[0],
      target:counties[3], legacy:false, casus:{ type:'aggression' } });
    function host(id, realm, at, men) {
      return { id:id, realm:realm, at:at, from:at, warId:war.id, men:men, size:men,
        units:{ levy:men, arch:0, cav:0, ret:0, mercs:0 },
        path:[], moveLeft:0, goal:null, supply:100 };
    }
    s.armies = [host('fast', 'player', home, 400), host('slow', 'player', home, 400)];
    FB.game.auto.hosts = 'off'; FB.game.auto.hostResupply = false;
    s.armyDown = {};
    Object.keys(s.realms).forEach(function (id) { s.armyDown[id] = s.turn; });
    window.conquestFixture = { counties:counties, war:war, enemy:realms[0], host:host };
    return { counties:counties, warId:war.id };
  });
}

test('neutral forts allow passage but hostile route forts and objectives block until occupied', async function ({ page }, testInfo) {
  const f = await arrange(page, testInfo);
  const result = await page.evaluate(function () {
    const s = FB.state, f = window.conquestFixture, host = s.armies[0];
    const blocked = f.counties.slice(1).map(function (pid) { return FB.fortBlocksArmy(s, pid, host); });
    const route = FB.findArmyPath(s, host, f.counties[3]);
    f.war.occupations[f.counties[3]] = { occupied:true, progress:0 };
    const breached = FB.fortBlocksArmy(s, f.counties[3], host);
    const defender = f.host('defender', f.enemy, f.counties[3], 500);
    f.war.occupations[f.counties[2]] = { occupied:true, progress:0, homeRealm:f.enemy };
    return { blocked:blocked, path:route.path, breached:breached,
      recapture:FB.fortBlocksArmy(s, f.counties[3], defender),
      routeOpen:!FB.fortBlocksArmy(s, f.counties[2], host),
      routeRecapture:FB.fortBlocksArmy(s, f.counties[2], defender) };
  });
  expect(result.blocked).toEqual([false, true, true]);
  expect(result.path).toEqual(f.counties.slice(1, 3));
  expect(result.breached).toBe(false);
  expect(result.recapture).toBe(true);
  expect(result.routeOpen).toBe(true);
  expect(result.routeRecapture).toBe(true);
});

test('offensive detachments gather, count combined strength, and march without merging', async function ({ page }, testInfo) {
  const f = await arrange(page, testInfo);
  const plans = await page.evaluate(function () {
    const s = FB.state, f = window.conquestFixture, target = f.counties[3];
    const individual = FB.fortSiegeStatus(s, target, {}, s.armies[0]).canProgress;
    s.armies.push(f.host('enemy', f.enemy, target, 500));
    const combined = FB.armyOffensiveCoordination(s, 'off');
    s.armies[1].at = f.counties[1];
    const gather = FB.armyOffensiveCoordination(s, 'off');
    s.armies[1].holdManual = true;
    const manual = FB.armyOffensiveCoordination(s, 'off');
    delete s.armies[1].holdManual;
    s.armies[1].at = f.counties[0];
    s.armies.pop();
    return { individual:individual, combined:combined.goals, gather:gather.goals,
      manual:manual.goals, defensive:FB.armyOffensiveCoordination(s, 'def').goals };
  });
  expect(plans.individual).toBe(false);
  expect(plans.combined).toEqual({ fast:f.counties[1], slow:f.counties[1] });
  expect(plans.gather).toEqual({ fast:f.counties[0], slow:f.counties[0] });
  expect(plans.manual).toEqual({});
  expect(plans.defensive).toEqual({});
  const moved = await page.evaluate(function () {
    const s = FB.state, home = s.armies[0].at;
    let early = false;
    for (let day = 0; day < 6; day++) {
      s.turn++;
      FB.armyTick(s);
      if (s.armies[0].at !== s.armies[1].at) early = true;
    }
    return { early:early, hosts:s.armies.filter(function (a) { return a.realm === 'player'; })
      .map(function (a) { return { id:a.id, at:a.at }; }), home:home };
  });
  expect(moved.early).toBe(false);
  expect(moved.hosts).toEqual([{ id:'fast', at:f.counties[1] }, { id:'slow', at:f.counties[1] }]);
  const victory = await page.evaluate(function () {
    const s = FB.state, f = window.conquestFixture, target = f.counties[3];
    const transitOwners = f.counties.slice(1, 3).map(function (pid) { return s.owner[pid]; });
    for (let day = 0; day < 12; day++) { s.turn++; FB.armyTick(s); }
    const stoppedAtFort = s.armies.every(function (a) { return a.at === f.counties[2]; });
    let routeOccupied = false;
    for (let season = 0; season < 16 && f.war.status === 'active'; season++) {
      s.turn += 90;
      FB.advanceOrdinaryObjectives(s, f.war.id);
      if (f.war.status !== 'active') break;
      routeOccupied = routeOccupied || !!(f.war.occupations[f.counties[2]] && f.war.occupations[f.counties[2]].occupied);
      for (let day = 0; day < 6; day++) { s.turn++; FB.armyTick(s); }
    }
    return { stoppedAtFort:stoppedAtFort, routeOccupied:routeOccupied, gained:s.player.provs.indexOf(target) >= 0,
      holder:s.holder[target], result:f.war.result,
      transitUnchanged:transitOwners.every(function (owner, i) { return s.owner[f.counties[i + 1]] === owner; }) };
  });
  expect(victory).toEqual({ stoppedAtFort:true, routeOccupied:true, gained:true, holder:'player', result:'victory', transitUnchanged:true });
});

test('siege projection reads objective progress and excludes hosts assigned elsewhere', async function ({ page }, testInfo) {
  await arrange(page, testInfo);
  const result = await page.evaluate(function () {
    const s = FB.state, f = window.conquestFixture, pid = f.counties[3];
    f.war.occupations[pid] = { progress:3, fortLevel:3, occupied:false };
    s.armies.forEach(function (a) { a.at = pid; });
    const before = JSON.stringify(f.war.occupations);
    const combined = FB.warSiegeProjection(s, pid);
    FB.ui.selectProvince(pid);
    const display = document.querySelector('[data-war-siege="' + pid + '"]');
    const displayedProgress = display && display.querySelector('progress').value;
    s.armies[1].warId = 'unrelated';
    const shortage = FB.warSiegeProjection(s, pid);
    const unchanged = before === JSON.stringify(f.war.occupations);
    f.war.occupations[pid].occupied = true;
    f.war.occupations[pid].progress = 0;
    const occupied = FB.warSiegeProjection(s, pid);
    return { percent:combined.percent, displayedProgress:displayedProgress, progress:combined.progress, eligible:combined.canProgress,
      shortage:shortage.blocker, missing:shortage.shortage, unchanged:unchanged,
      occupied:occupied.blocker, complete:occupied.percent };
  });
  expect(result).toEqual({ percent:50, displayedProgress:50, progress:3, eligible:true, shortage:'shortage',
    missing:20, unchanged:true, occupied:'occupied', complete:100 });
});
