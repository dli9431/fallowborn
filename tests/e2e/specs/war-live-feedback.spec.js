'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'js/armies.js', 'js/world.js', 'js/fortifications.js', 'js/ui_panels.js',
  'js/ui_topbar.js', 'js/ui_misc.js', 'data/map_data.js', 'data/units.js'
]);
const { test, expect } = require('../support/fixture');
const { startWarSafety } = require('../support/game/war-safety');

test('siege projection reports fractional progress, absence, contested ground and defensive works',
  async function ({ page }, testInfo) {
    const ids = await startWarSafety(page, testInfo);
    const result = await page.evaluate(function (ids) {
      const s = FB.state, w = s.player.war;
      w.siegeFortLevel = 0; w.siege = 2.999;
      s.date.day = 89;
      s.armies = [];
      const absent = FB.warSiegeProjection(s);
      s.armies = [{ id:'besieger', realm:'player', at:w.target, men:10000,
        size:10000, supply:100, path:[], moveLeft:0 }];
      const active = FB.warSiegeProjection(s);
      s.armies.push({ id:'defender', realm:ids.enemy, at:w.target, men:40 });
      const contested = FB.warSiegeProjection(s);
      w.defending = true; w.enemyTarget = ids.home;
      w.enemySiegeFortLevel = 0; w.enemySiege = 1.5;
      s.armies = [{ id:'invader', realm:ids.enemy, at:ids.home,
        men:10000, size:10000, supply:100, path:[], moveLeft:0 }];
      const defensive = FB.warSiegeProjection(s, ids.home);
      const unrelated = FB.warSiegeProjection(s, ids.second);
      return { absent:absent, active:active, contested:contested,
        defensive:defensive, unrelated:unrelated };
    }, ids);
    expect(result.absent.blocker).toBe('absent');
    expect(result.absent.percent).toBe(99);
    expect(result.active.blocker).toBeNull();
    expect(result.active.breached).toBe(false);
    expect(result.active.days).toBe(2);
    expect(result.contested.blocker).toBe('contested');
    expect(result.defensive.percent).toBe(50);
    expect(result.defensive.defending).toBe(true);
    expect(result.unrelated).toBeNull();
  });

test('live siege values update without replacing the focused disclosure',
  async function ({ page }, testInfo) {
    await startWarSafety(page, testInfo);
    await page.evaluate(function () {
      FB.state.player.war.siegeFortLevel = 0;
      FB.state.player.war.siege = 1;
      FB.ui.revealDeedAction('muster_host');
      FB.ui.refresh();
    });
    const info = page.locator('#deeds-war-card .settcard-info');
    await expect(info).toBeVisible();
    await info.click();
    await info.focus();
    await page.evaluate(function () {
      window.warDisclosureControl = document.querySelector('#deeds-war-card .settcard-info');
      FB.state.player.war.siege = 2.5;
      FB.state.date.day = 90;
      FB.ui.refresh({ liveTick:true });
    });
    await expect(page.locator('#deeds-war-card progress')).toHaveAttribute('value', '83');
    await expect(page.locator('#deeds-war-card [data-war-siege]')).toContainText('1 days');
    await expect(info).toBeFocused();
    await expect(info).toHaveAttribute('aria-expanded', 'true');
    expect(await page.evaluate(function () {
      return window.warDisclosureControl === document.querySelector('#deeds-war-card .settcard-info');
    })).toBe(true);
  });

test('pursuit evaluates combined defending stacks and regroups away from occupied home',
  async function ({ page }, testInfo) {
    const ids = await startWarSafety(page, testInfo);
    const result = await page.evaluate(function (ids) {
      const s = FB.state;
      const attacker = { id:'pursuer', realm:ids.enemy, at:ids.second,
        men:1000, size:1000, units:{ levy:1000 }, supply:100 };
      const defenders = [0, 1].map(function (i) {
        return { id:'defender-' + i, realm:'player', at:ids.home,
          men:800, size:800, units:{ levy:800 }, supply:100 };
      });
      s.armies = [attacker, defenders[0]];
      const single = FB.armyCanPursue(s, attacker, ids.home);
      s.armies.push(defenders[1]);
      const combined = FB.armyCanPursue(s, attacker, ids.home);
      const capital = s.realms[ids.enemy].capital;
      defenders.forEach(function (h) { h.at = capital; h.men = 100000; h.units.levy = h.men; });
      const regroup = FB.armyRegroupGoal(s, attacker);
      return { single:single, combined:combined, regroup:regroup, capital:capital };
    }, ids);
    expect(result.combined).toBe(false);
    expect(result.regroup).not.toBe(result.capital);
  });

test('low-supply warnings rearm after recovery and starvation loses 0.25 percent per day',
  async function ({ page }, testInfo) {
    const ids = await startWarSafety(page, testInfo);
    const result = await page.evaluate(function (ids) {
      const s = FB.state;
      const host = { id:'supply-safety', realm:'player', at:s.player.war.target,
        men:4000, size:4000, units:{ levy:4000 }, supply:30,
        path:[], moveLeft:0, holdManual:1 };
      s.armies = [host];
      s.armyDown[ids.enemy] = s.turn;
      function warnings() {
        return s.log.filter(function (entry) {
          return entry.msg && entry.msg.key === 'news.army.low_supply';
        }).length;
      }
      FB.armyTick(s);
      const first = warnings();
      FB.armyTick(s);
      const repeated = warnings();
      host.at = ids.home; host.supply = 29;
      FB.armyTick(s);
      const recovered = !host.lowSupplyWarned;
      host.at = s.player.war.target; host.supply = 30;
      FB.armyTick(s);
      const rearmed = warnings();
      host.supply = 0;
      FB.armyTick(s);
      return { first:first, repeated:repeated, recovered:recovered,
        rearmed:rearmed, men:host.men, rate:FBDATA.balance.supplyAttritionPerDay };
    }, ids);
    expect(result.first).toBe(1);
    expect(result.repeated).toBe(1);
    expect(result.recovered).toBe(true);
    expect(result.rearmed).toBe(2);
    expect(result.rate).toBe(0.0025);
    expect(result.men).toBe(3990);
  });

test('the AI order phase regroups an outmatched pursuer instead of chasing the player',
  async function ({ page }, testInfo) {
    const ids = await startWarSafety(page, testInfo);
    const result = await page.evaluate(function (ids) {
      const s = FB.state, capital = s.realms[ids.enemy].capital;
      const army = { id:'ai-pursuit', realm:ids.enemy, at:capital, men:1000,
        size:1000, units:{ levy:1000 }, supply:100, path:[], moveLeft:0 };
      s.armies = [army, { id:'overwhelming-player', realm:'player', at:ids.home,
        men:100000, size:100000, units:{ levy:100000 }, supply:100, path:[], moveLeft:0 }];
      const order = FB.orderArmy;
      let chosen = null;
      FB.orderArmy = function (state, host, goal) {
        if (host.id === army.id) chosen = goal;
        return false;
      };
      FB.armyTick(s);
      FB.orderArmy = order;
      return { chosen:chosen, capital:capital };
    }, ids);
    expect(result.chosen).toBe(result.capital);
    expect(result.chosen).not.toBe(ids.home);
  });

test('the missing-balance fallback also applies 0.25 percent starvation losses',
  async function ({ page }, testInfo) {
    const ids = await startWarSafety(page, testInfo);
    const men = await page.evaluate(function (ids) {
      const s = FB.state, configured = FBDATA.balance.supplyAttritionPerDay;
      delete FBDATA.balance.supplyAttritionPerDay;
      const host = { id:'fallback-supply', realm:'player', at:s.player.war.target,
        men:4000, size:4000, units:{ levy:4000 }, supply:0, path:[], moveLeft:0 };
      s.armies = [host]; s.armyDown[ids.enemy] = s.turn;
      FB.armyTick(s);
      FBDATA.balance.supplyAttritionPerDay = configured;
      return host.men;
    }, ids);
    expect(men).toBe(3990);
  });
