'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'index.html', 'js/main.js', 'js/wars.js', 'js/world.js', 'js/armies.js',
  'js/fortifications.js', 'js/technology.js', 'data/technology.js', 'data/map_data.js'
]);
const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');

async function startObserverWar(page, testInfo) {
  await openGame(page, testInfo);
  await page.evaluate(function () {
    FB.game.pending = { seed:'OBSERVE-WAR-REGRESSION' };
    FB.game.startObserve();
    FB.game.setPaused(true);
    const s = FB.state;
    FB.ensureWars(s);
    const ids = Object.keys(s.realms).filter(function (id) {
      return id !== 'player' && s.realms[id].alive && !s.realms[id].liege &&
        s.realms[id].capital;
    }).sort();
    const target = s.realms[ids[1]].capital;
    const war = FB.registerOrdinaryWar(s, ids[0], {
      enemy:ids[1], target:target, legacy:false, casus:{ type:'border' }
    });
    window.observerWarId = war.id;
    s.date = { year:867, season:1, day:89 };
    s.turn = 178;
    s.armies = [];
  });
}

test('Observe resolves an exhausted AI war at the season boundary, not on an ordinary day', async function ({ page }, testInfo) {
  await startObserverWar(page, testInfo);
  const result = await page.evaluate(function () {
    const s = FB.state, w = s.wars[window.observerWarId];
    w.seasons = 31;
    const owner = s.owner[w.target];
    FB.game.passDay({ deferUi:true });
    const daily = { seasons:w.seasons, status:w.status };
    FB.game.passDay({ deferUi:true });
    return { daily:daily, seasons:w.seasons, status:w.status, result:w.result,
      unchanged:s.owner[w.target] === owner,
      truce:FB.truceExpiry(s, w.attacker, w.defender) > s.turn,
      events:s.eventQueue.length, observing:FB.game.observe };
  });
  expect(result).toEqual({ daily:{ seasons:31, status:'active' }, seasons:32,
    status:'ended', result:'white_peace', unchanged:true, truce:true,
    events:0, observing:true });
});

test('Observe advances an AI siege and awards its completed objective through the daily loop', async function ({ page }, testInfo) {
  await startObserverWar(page, testInfo);
  const result = await page.evaluate(function () {
    const s = FB.state, w = s.wars[window.observerWarId], target = w.target;
    // Hold the siege site constant between two seasonal pulses; the real daily
    // loop and seasonal siege/settlement code still execute on each pulse.
    function preparePulse() {
      s.date.day = 90;
      s.armies = [{ id:'observer-siege', realm:w.attacker, warId:w.id,
        at:target, from:target, goal:null, path:[], moveLeft:0, men:10000, size:10000,
        units:{ levy:10000 }, supply:100 }];
    }
    w.occupations[target] = { progress:0, fortLevel:0, occupied:false };
    preparePulse();
    FB.game.passDay({ deferUi:true });
    const progress = w.occupations[target] && w.occupations[target].progress;
    const initialOwner = s.owner[target];
    const required = FB.fortSiegeStatus(s, target, { fortLevel:0 }, []).required;
    w.occupations[target] = { progress:required - 1, fortLevel:0, occupied:false };
    preparePulse();
    FB.game.passDay({ deferUi:true });
    return { progress:progress, initialOwner:initialOwner, defender:w.defender,
      owner:s.owner[target], attacker:w.attacker, status:w.status,
      result:w.result, events:s.eventQueue.length };
  });
  expect(result.progress).toBeGreaterThan(0);
  expect(result.initialOwner).toBe(result.defender);
  expect(result.owner).toBe(result.attacker);
  expect(result.status).toBe('ended');
  expect(result.result).toBe('victory');
  expect(result.events).toBe(0);
});
