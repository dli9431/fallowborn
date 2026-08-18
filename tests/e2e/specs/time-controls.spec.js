'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'data/events_tutorial.js',
  'js/main.js',
  'js/actions.js',
  'js/armies.js',
  'js/economy.js',
  'js/world.js',
  'js/papacy.js',
  'js/holywar.js',
  'js/modifiers.js',
  'js/politics.js',
  'js/institutions.js',
  'js/market.js',
  'js/events.js',
  'js/ui_misc.js',
  'js/ui_topbar.js',
  'js/ui_modals.js',
  'js/mapview.js',
  'js/save.js',
  'css/style.css'
]);

const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { startDeterministicGame } = require('../support/game/start');

test.beforeEach(async function ({ page }, testInfo) {
  await openGame(page, testInfo);
});

test('autoresolving fast-forward advances a paused game to the next season',
  async function ({ page }) {
    await startDeterministicGame(page);
    const before = await page.evaluate(function () {
      delete FB.state.player.flags.tutorial;
      FB.state.player.flags.tutorial_done = 1;
      FB.state.eventQueue = [];
      FB.state.slotDays = [];
      FB.queueEvent(FB.state, 'tut_welcome', {});
      FB.game.auto.all = true;
      FB.game.setPaused(true);
      return {
        turn:FB.state.turn,
        date:{
          year:FB.state.date.year,
          season:FB.state.date.season,
          day:FB.state.date.day
        }
      };
    });

    await page.locator('#btn-skip').click();
    await expect.poll(function () {
      return page.evaluate(function () { return !FB.game.fastForwarding; });
    }).toBe(true);

    const after = await page.evaluate(function () {
      return {
        turn:FB.state.turn,
        date:{
          year:FB.state.date.year,
          season:FB.state.date.season,
          day:FB.state.date.day
        },
        paused:FB.game.paused,
        autoresolved:FB.state.log.some(function (entry) {
          return entry.receipt && entry.receipt.eventId === 'tut_welcome' &&
            entry.receipt.automated;
        })
      };
    });
    expect(after.turn - before.turn).toBe(91 - before.date.day);
    expect(after.date).toEqual({
      year:before.date.year + (before.date.season === 3 ? 1 : 0),
      season:(before.date.season + 1) % 4,
      day:1
    });
    expect(after.paused).toBe(true);
    expect(after.autoresolved).toBe(true);
    await expect(page.locator('.event-receipt-toast')).toHaveCount(1);
  });

test('fast-forward matches individual days and avoids invariant repair loops',
  async function ({ page }, testInfo) {
    test.skip(testInfo.project.name !== 'chromium-file',
      'The bounded maintenance comparison belongs to the direct-file canary.');
    await startDeterministicGame(page);
    await page.evaluate(function () {
      delete FB.state.player.flags.tutorial;
      FB.state.player.flags.tutorial_done = 1;
      FB.state.slotDays = [];
      FB.state.eventQueue = [];
      /* Put both journeys on the ordinary restored-save boundary so additive
         load repairs cannot masquerade as a fast-forward difference. */
      FB.save.restore(JSON.parse(FB.save.serialize()));
      const initial = JSON.parse(FB.save.serialize());
      const picker = FB.pickDailyEvents;
      FB.pickDailyEvents = function () { return []; };

      function advanceOneDayAtATime() {
        const startSeason = FB.state.date.season;
        const startYear = FB.state.date.year;
        do {
          FB.game.passDay();
        } while (FB.state.date.season === startSeason &&
          FB.state.date.year === startYear);
        return FB.save.serialize();
      }

      const individual = advanceOneDayAtATime();
      FB.save.restore(initial);

      const counts = {
        localGovernment:0,
        politicalCourt:0,
        papacy:0,
        religiousHeads:0,
        modifiers:0,
        economy:0,
        rulerSync:0,
        promotions:0
      };
      const wrapped = [
        ['ensureLocalGovernment', 'localGovernment'],
        ['politicalCourt', 'politicalCourt'],
        ['ensurePapacy', 'papacy'],
        ['ensureReligiousHeads', 'religiousHeads'],
        ['ensureModifiers', 'modifiers'],
        ['ensureEconomy', 'economy'],
        ['syncMaterializedRealmRulers', 'rulerSync'],
        ['checkTierPromotions', 'promotions']
      ];
      const originals = {};
      for (let i = 0; i < wrapped.length; i++) {
        const name = wrapped[i][0], count = wrapped[i][1];
        originals[name] = FB[name];
        FB[name] = function () {
          counts[count]++;
          return originals[name].apply(this, arguments);
        };
      }

      window.__fastForwardSpec = {
        individual:individual,
        startTurn:FB.state.turn,
        counts:counts,
        wrapped:wrapped,
        originals:originals,
        picker:picker
      };
    });

    const yieldedMidSkip = await page.evaluate(function () {
      return new Promise(function (resolve) {
        document.getElementById('btn-skip').click();
        requestAnimationFrame(function () {
          const stored = window.__fastForwardSpec;
          const progressed = FB.state.turn - stored.startTurn;
          resolve(FB.game.fastForwarding && progressed > 0 && progressed < 90);
        });
      });
    });
    expect(yieldedMidSkip).toBe(true);
    await expect.poll(function () {
      return page.evaluate(function () { return !FB.game.fastForwarding; });
    }).toBe(true);

    const result = await page.evaluate(function () {
      const stored = window.__fastForwardSpec;
      const skipped = FB.save.serialize();
      const days = FB.state.turn - stored.startTurn;

      for (let i = 0; i < stored.wrapped.length; i++) {
        FB[stored.wrapped[i][0]] = stored.originals[stored.wrapped[i][0]];
      }
      /* A full repair after the optimized burst must be a no-op. This catches
         a due invariant that any retained snapshot failed to notice. */
      FB.ensureLocalGovernment(FB.state, true);
      FB.repairPolitics(FB.state);
      FB.ensureInstitutions(FB.state, { silent:true });
      FB.ensurePapacy(FB.state);
      FB.ensureReligiousHeads(FB.state);
      const repaired = FB.save.serialize();
      FB.pickDailyEvents = stored.picker;
      const result = {
        same:stored.individual === skipped,
        repairStable:skipped === repaired,
        days:days,
        paused:FB.game.paused,
        counts:stored.counts
      };
      delete window.__fastForwardSpec;
      return result;
    });

    expect(result.same).toBe(true);
    expect(result.repairStable).toBe(true);
    expect(result.days).toBe(90);
    expect(result.paused).toBe(true);
    expect(result.counts.localGovernment).toBe(0);
    expect(result.counts.politicalCourt).toBe(0);
    expect(result.counts.papacy).toBeLessThanOrEqual(5);
    expect(result.counts.religiousHeads).toBeLessThanOrEqual(5);
    expect(result.counts.modifiers).toBeLessThanOrEqual(2);
    expect(result.counts.economy).toBeLessThanOrEqual(6);
    expect(result.counts.rulerSync).toBeLessThanOrEqual(2);
    expect(result.counts.promotions).toBeLessThanOrEqual(2);
  });

test('realm county indexes persist across quiet days while strength stays current',
  async function ({ page }) {
    await startDeterministicGame(page);

    expect(await page.evaluate(function () {
      const state = FB.state;
      let realmId = null;
      let otherRealm = null;
      for (const pid in state.owner) {
        if (!realmId) realmId = state.owner[pid];
        else if (state.owner[pid] !== realmId) {
          otherRealm = state.owner[pid];
          break;
        }
      }
      let scans = 0;
      state.owner = new Proxy(state.owner, {
        ownKeys:function (target) {
          scans++;
          return Reflect.ownKeys(target);
        }
      });
      FB.invalidateRealmCache();

      const provinces = FB.realmProvinces(state, realmId).slice();
      const strength = FB.realmStrength(state, realmId);
      const afterInitial = scans;

      state.dev[provinces[0]]++;
      state.turn++;
      const sameList = FB.realmProvinces(state, realmId).join('|') ===
        provinces.join('|');
      const afterQuietDay = scans;
      const currentStrength = FB.realmStrength(state, realmId);
      const afterStrengthRefresh = scans;

      state.owner[provinces[0]] = otherRealm;
      FB.invalidateRealmCache();
      const rebuilt = FB.realmProvinces(state, realmId);

      return {
        initialScans:afterInitial,
        sameList:sameList,
        quietDayScans:afterQuietDay,
        currentStrength:currentStrength === strength + 1,
        strengthScans:afterStrengthRefresh,
        invalidationScans:scans,
        transferred:rebuilt.indexOf(provinces[0]) < 0
      };
    })).toEqual({
      initialScans:2,
      sameList:true,
      quietDayScans:2,
      currentStrength:true,
      strengthScans:3,
      invalidationScans:4,
      transferred:true
    });
  });

test('quiet army ticks retain the sovereign realm index', async function ({ page }) {
  await startDeterministicGame(page);

  expect(await page.evaluate(function () {
    const state = FB.state;
    state.player.war = null;
    state.greatHolyWar = null;
    state.armies = [];
    for (const id in state.realms) state.realms[id].war = null;
    let scans = 0;
    state.realms = new Proxy(state.realms, {
      ownKeys:function (target) {
        scans++;
        return Reflect.ownKeys(target);
      }
    });
    FB.invalidateRealmCache();

    FB.armyTick(state);
    const initialScans = scans;
    state.turn++;
    FB.armyTick(state);
    const quietDayScans = scans;
    FB.invalidateRealmCache();
    FB.armyTick(state);

    return {
      initialScans:initialScans,
      quietDayScans:quietDayScans,
      invalidationScans:scans
    };
  })).toEqual({
    initialScans:1,
    quietDayScans:1,
    invalidationScans:2
  });
});

test('direct-vassal reads retain the hierarchy index across quiet days',
  async function ({ page }) {
    await startDeterministicGame(page);

    expect(await page.evaluate(function () {
      const state = FB.state;
      let candidateId = null;
      for (const id in state.realms) {
        if (id !== 'player' && state.realms[id] && state.realms[id].alive) {
          candidateId = id;
          break;
        }
      }
      let scans = 0;
      state.realms = new Proxy(state.realms, {
        ownKeys:function (target) {
          scans++;
          return Reflect.ownKeys(target);
        }
      });
      FB.invalidateRealmCache();

      FB.playerVassals(state);
      const initialScans = scans;
      state.turn++;
      FB.playerVassals(state);
      const quietDayScans = scans;

      state.realms[candidateId].liege = 'player';
      FB.invalidateRealmCache();
      const rebuilt = FB.playerVassals(state);
      return {
        initialScans:initialScans,
        quietDayScans:quietDayScans,
        invalidationScans:scans,
        includesMutation:rebuilt.indexOf(candidateId) >= 0
      };
    })).toEqual({
      initialScans:1,
      quietDayScans:1,
      invalidationScans:2,
      includesMutation:true
    });
  });

test('desktop play button fits its full label and keyhint without truncation',
  async function ({ page }) {
    await startDeterministicGame(page);
    await page.setViewportSize({ width: 1920, height: 1080 });
    const endTurnBtn = page.locator('#btn-endturn');
    await expect(endTurnBtn).toBeVisible();
    await expect(endTurnBtn.locator('.keyhint')).toHaveText('Space');
    await expect(endTurnBtn.locator('.pp')).toHaveText(/▶ Play|❚❚ Pause/);

    const fits = await page.evaluate(function () {
      const btn = document.getElementById('btn-endturn');
      const pp = btn.querySelector('.pp');
      const skip = document.getElementById('btn-skip');
      const auto = document.getElementById('btn-auto');
      return {
        btnScrollW: btn.scrollWidth,
        btnClientW: btn.clientWidth,
        ppScrollW: pp.scrollWidth,
        ppClientW: pp.clientWidth,
        skipW: skip.offsetWidth,
        autoW: auto.offsetWidth,
        btnFits: btn.scrollWidth <= btn.clientWidth + 1,
        ppFits: pp.scrollWidth <= pp.clientWidth + 1
      };
    });

    expect(fits.btnFits).toBe(true);
    expect(fits.ppFits).toBe(true);
    expect(fits.skipW).toBeGreaterThan(0);
    expect(fits.autoW).toBeGreaterThan(0);
  });
