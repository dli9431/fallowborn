'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'js/main.js', 'js/save.js', 'js/armies.js', 'js/wars.js', 'js/fortifications.js',
  'js/world.js', 'js/events.js', 'js/actions.js', 'js/ui_topbar.js', 'js/ui_misc.js',
  'js/ui_modals.js', 'js/mapview.js'
]);
const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');

// Opt-in diagnostic: an owner's save is input data, never a committed fixture.
test('profile one fast-forward from an exported save', async function ({ page }, testInfo) {
  test.skip(!process.env.FB_PROFILE_SAVE, 'Set FB_PROFILE_SAVE to an exported save path.');
  test.skip(testInfo.project.name !== 'chromium-served', 'CPU sampling requires Chromium.');
  test.setTimeout(120000);
  const source = fs.readFileSync(path.resolve(process.env.FB_PROFILE_SAVE), 'utf8');
  await openGame(page, testInfo);
  await page.evaluate(function (text) {
    const data = FB.save.parseExport(text);
    if (!data) throw new Error('Profile input is not a readable exported save.');
    FB.game.uiPrefs.hideTips = true;
    FB.game.uiPrefs.hideBeginnerHints = true;
    FB.ui.coachmarkReset();
    window.__profileLoaded = false;
    FB.game.loadData(data, function () {
      FB.game.setPaused(true);
      window.__profileLoaded = true;
    });
  }, source);
  await expect.poll(function () {
    return page.evaluate(function () { return window.__profileLoaded; });
  }, { timeout:60000 }).toBe(true);
  await expect(page.locator('#game:not(.hidden)')).toBeVisible();
  // Let load repair and initial rendering finish before collecting samples.
  await page.evaluate(function () {
    return new Promise(function (resolve) {
      requestAnimationFrame(function () { requestAnimationFrame(resolve); });
    });
  });
  const referenceRegroup = process.env.FB_PROFILE_REGROUP_REFERENCE === '1';
  await page.evaluate(function (reference) {
    if (!reference) return;
    // Previous regroup algorithm, retained only for diagnostic comparisons.
    FB.armyRegroupGoal = function (state, army) {
      const p = state.player;
      const home = army.realm === 'player'
        ? ((state.realms.player && state.realms.player.alive && state.realms.player.capital) ||
          (p.provs && p.provs[0]) || p.provinceId)
        : (state.realms[army.realm] || {}).capital;
      const candidates = Object.keys((FB.world || {}).byId || {}).sort();
      if (home) candidates.unshift(home);
      let best = null, days = Infinity;
      for (const pid of candidates) {
        if (!FB.armyFriendlyProvince(state, army, pid) || !FB.armyCanPursue(state, army, pid)) continue;
        const route = FB.findArmyPath(state, army, pid);
        if (!route || route.blockedByFort) continue;
        if (pid === home) return pid;
        if (route.totalDays < days) { best = pid; days = route.totalDays; }
      }
      return best;
    };
  }, referenceRegroup);
  const session = await page.context().newCDPSession(page);
  await session.send('Profiler.enable');
  await session.send('Profiler.start');
  let result;
  try {
    result = await page.evaluate(function () {
      return new Promise(function (resolve, reject) {
        const stages = {}, originals = [], days = [], frames = [];
        function wrap(owner, name, label) {
          if (typeof owner[name] !== 'function') return;
          const original = owner[name];
          originals.push({ owner:owner, name:name, original:original });
          owner[name] = function () {
            const start = performance.now(), turn = FB.state.turn;
            try { return original.apply(this, arguments); }
            finally {
              const elapsed = performance.now() - start;
              const row = stages[label] || (stages[label] = { calls:0, totalMs:0, maxMs:0 });
              row.calls++; row.totalMs += elapsed; row.maxMs = Math.max(row.maxMs, elapsed);
              if (label === 'passDay') days.push({ turn:turn, ms:elapsed });
            }
          };
        }
        ['learnMaternalCustoms', 'tickFocus', 'localGovernmentDay', 'scriptedTick',
          'fortificationDay', 'religiousHeadRecoveryTick', 'papacyDay', 'guildMonopolyTick',
          'modifierTick', 'intrigueDay', 'politicsDay', 'institutionsDay', 'financeDay',
          'intrigueSeason', 'marketSeason', 'techSeason', 'playerWarTick', 'tickForeignPolicy',
          'financeSeason', 'worldTick', 'armyTick', 'greatHolyWarTick', 'travelTick',
          'giftDeliveryTick', 'tenureDay', 'pickDailyEvents', 'syncMaterializedRealmRulers'
        ].forEach(function (name) { wrap(FB, name, name); });
        wrap(FB.game, 'passDay', 'passDay');
        wrap(FB.game, 'afterEvents', 'afterEvents');
        wrap(FB.ui, 'fastForwardFinished', 'fastForwardFinished');
        wrap(FB.save, 'serialize', 'save.serialize');
        const s = FB.state, startTurn = s.turn;
        const initial = { turn:s.turn, date:Object.assign({}, s.date), tier:s.player.tier,
          armies:s.armies.length, activeWars:FB.ordinaryWars(s).length };
        // Browser-local preferences are absent from exported saves. Fix their
        // values so story slots do not stop this one-season diagnostic early.
        FB.game.auto.all = true; FB.game.auto.style = 'first'; FB.game.auto.hosts = 'manual';
        FB.game.auto.build = false; FB.game.auto.research = false;
        const start = performance.now();
        let previous = start, skipEnded = null;
        function restore() {
          originals.forEach(function (entry) { entry.owner[entry.name] = entry.original; });
        }
        const timeout = setTimeout(function () {
          FB.game.setPaused(true);
          restore(); reject(new Error('Fast-forward exceeded the 30-second diagnostic limit.'));
        }, 30000);
        function frame() {
          // rAF's supplied timestamp precedes earlier callbacks in that frame;
          // read the clock here so a costly final day is included in skipMs.
          const now = performance.now();
          frames.push(now - previous); previous = now;
          if (FB.game.fastForwarding) { requestAnimationFrame(frame); return; }
          if (skipEnded === null) { skipEnded = now; requestAnimationFrame(frame); return; }
          // Include completion rendering and the deferred autosave write.
          if (now - skipEnded < 100) { requestAnimationFrame(frame); return; }
          clearTimeout(timeout);
          restore();
          resolve({ initial:initial, daysAdvanced:FB.state.turn - startTurn,
            finalDate:FB.state.date, dead:!!FB.state.player.dead,
            skipMs:skipEnded - start, includingCompletionMs:now - start,
            maxFrameGapMs:Math.max.apply(Math, frames), frameGapsMs:frames,
            days:days, stages:stages, automation:{ all:true, style:'first', hosts:'manual' },
            note:'Stage timings are inclusive and overlap; CPU sampling and wrappers add overhead.' });
        }
        FB.game.skipAhead();
        requestAnimationFrame(frame);
      });
    });
  } finally {
    const sampled = await session.send('Profiler.stop');
    const cpuPath = testInfo.outputPath('season-cpu.cpuprofile');
    fs.writeFileSync(cpuPath, JSON.stringify(sampled.profile));
    await testInfo.attach('season-cpu.cpuprofile', {
      path:cpuPath, contentType:'application/json'
    });
    await session.detach();
  }
  const snapshot = await page.evaluate(function () { return FB.save.serialize(); });
  result.stateSha256 = crypto.createHash('sha256').update(snapshot).digest('hex');
  result.referenceRegroup = referenceRegroup;
  const timingsPath = testInfo.outputPath('season-timings.json');
  fs.writeFileSync(timingsPath, JSON.stringify(result, null, 2));
  await testInfo.attach('season-timings.json', {
    path:timingsPath, contentType:'application/json'
  });
  expect(result.daysAdvanced).toBeGreaterThan(0);
  expect(result.daysAdvanced).toBeLessThanOrEqual(90);
});
