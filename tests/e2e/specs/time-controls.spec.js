'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'data/events_tutorial.js',
  'js/main.js',
  'data/actions.js',
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
  'js/ui_panels.js',
  'js/keys.js',
  'js/ui_topbar.js',
  'js/ui_modals.js',
  'js/mapview.js',
  'js/save.js',
  'css/style.css'
]);

const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { startDeterministicGame } = require('../support/game/start');
const { waitForUiRefresh } = require('../support/game/ui');

test.beforeEach(async function ({ page }, testInfo) {
  await openGame(page, testInfo);
});

test('game speed defaults to fastest and persists as a bounded browser preference',
  async function ({ page }) {
    expect(await page.evaluate(function () {
      return {
        speedIdx:FB.game.speedIdx,
        preference:FB.game.uiPrefs.speedIdx,
        fastest:FB.game.SPEEDS.length - 1
      };
    })).toEqual({ speedIdx:4, preference:4, fastest:4 });

    await page.evaluate(function () { FB.ui.showSettings(); });
    await expect(page.locator('#set-speed')).toHaveValue('4');
    await expect(page.locator('#set-speed-label')).toContainText('fastest');
    await page.locator('#set-speed').evaluate(function (input) {
      input.value = '1';
      input.dispatchEvent(new Event('input', { bubbles:true }));
      input.dispatchEvent(new Event('change', { bubbles:true }));
    });
    expect(await page.evaluate(function () {
      return {
        speedIdx:FB.game.speedIdx,
        preference:FB.game.uiPrefs.speedIdx,
        stored:JSON.parse(localStorage.getItem('fb_ui')).speedIdx
      };
    })).toEqual({ speedIdx:1, preference:1, stored:1 });

    await page.reload({ waitUntil:'domcontentloaded' });
    await expect.poll(function () {
      return page.evaluate(function () {
        return !!(window.FB && FB.game && FB.game.bootReady && FB.ui);
      });
    }).toBe(true);
    expect(await page.evaluate(function () {
      return {
        speedIdx:FB.game.speedIdx,
        preference:FB.game.uiPrefs.speedIdx
      };
    })).toEqual({ speedIdx:1, preference:1 });
    await page.evaluate(function () { FB.ui.showSettings(); });
    await expect(page.locator('#set-speed')).toHaveValue('1');

    await page.evaluate(function () {
      const stored = JSON.parse(localStorage.getItem('fb_ui'));
      stored.speedIdx = 99;
      localStorage.setItem('fb_ui', JSON.stringify(stored));
    });
    await page.reload({ waitUntil:'domcontentloaded' });
    await expect.poll(function () {
      return page.evaluate(function () {
        return !!(window.FB && FB.game && FB.game.bootReady);
      });
    }).toBe(true);
    expect(await page.evaluate(function () {
      return {
        speedIdx:FB.game.speedIdx,
        preference:FB.game.uiPrefs.speedIdx,
        fastest:FB.game.SPEEDS.length - 1
      };
    })).toEqual({ speedIdx:4, preference:4, fastest:4 });
  });

test('map interaction defers exact Deeds and Land war-card rebuilds until release',
  async function ({ page }) {
    await startDeterministicGame(page);
    await page.evaluate(function () {
      const s = FB.state;
      const home = s.player.provinceId;
      const enemy = Object.keys(s.realms).filter(function (rid) {
        const realm = s.realms[rid];
        return rid !== 'player' && realm && realm.alive && !realm.liege;
      })[0];
      FB.game.setPaused(true);
      s.player.war = {
        enemy:enemy, target:null, wins:0, losses:0, seasons:0,
        defending:true, strength:1
      };
      const host = {
        id:'panel_drag_host', realm:'player', men:500, size:500,
        units:{ levy:500, arch:0, cav:0, ret:0, mercs:0 },
        at:home, from:home, moveLeft:0, path:[], goal:null, supply:82
      };
      s.armies = [host];
      FB.selectArmy(host.id);
      FB.map.select(home);
      FB.ui.showTab('actions');
    });
    await page.evaluate(function () {
      return new Promise(function (resolve) {
        requestAnimationFrame(function () { requestAnimationFrame(resolve); });
      });
    });
    await expect(page.locator('#deeds-war-card')).toContainText('82%');

    await page.evaluate(function () {
      const sentinel = document.createElement('i');
      sentinel.id = 'deeds-drag-sentinel';
      document.getElementById('tab-actions').appendChild(sentinel);
      FB.map.pointers.panel_drag = [0, 0];
      FB.playerHost(FB.state).supply = 81;
      FB.ui.refresh();
    });
    await page.evaluate(function () {
      return new Promise(function (resolve) {
        requestAnimationFrame(function () { requestAnimationFrame(resolve); });
      });
    });
    await expect(page.locator('#deeds-drag-sentinel')).toHaveCount(1);
    await expect(page.locator('#deeds-war-card')).toContainText('82%');

    await page.evaluate(function () {
      delete FB.map.pointers.panel_drag;
      FB.ui.flushMapInteractionRefresh();
    });
    await expect(page.locator('#deeds-drag-sentinel')).toHaveCount(0);
    await expect(page.locator('#deeds-war-card')).toContainText('81%');

    await page.evaluate(function () { FB.ui.showTab('prov'); });
    await expect(page.locator('#land-war-card .settcard-head > b')).toContainText('500');
    await page.evaluate(function () {
      const sentinel = document.createElement('i');
      sentinel.id = 'land-drag-sentinel';
      document.getElementById('tab-prov').appendChild(sentinel);
      FB.map.pointers.panel_drag = [0, 0];
      FB.playerHost(FB.state).men = 499;
      FB.ui.refresh();
    });
    await page.evaluate(function () {
      return new Promise(function (resolve) {
        requestAnimationFrame(function () { requestAnimationFrame(resolve); });
      });
    });
    await expect(page.locator('#land-drag-sentinel')).toHaveCount(1);
    await expect(page.locator('#land-war-card .settcard-head > b')).toContainText('500');

    await page.evaluate(function () {
      delete FB.map.pointers.panel_drag;
      FB.ui.flushMapInteractionRefresh();
    });
    await expect(page.locator('#land-drag-sentinel')).toHaveCount(0);
    await expect(page.locator('#land-war-card .settcard-head > b')).toContainText('499');
  });

test('natural clock ticks keep heavy warfare panels mounted until an exact refresh',
  async function ({ page }) {
    await startDeterministicGame(page);
    await page.evaluate(function () {
      const s = FB.state;
      const home = s.player.provinceId;
      const enemy = Object.keys(s.realms).filter(function (rid) {
        const realm = s.realms[rid];
        return rid !== 'player' && realm && realm.alive && !realm.liege;
      })[0];
      FB.game.setPaused(true);
      s.player.war = {
        enemy:enemy, target:null, wins:0, losses:0, seasons:0,
        defending:true, strength:1
      };
      s.armies = [{
        id:'live_panel_host', realm:'player', men:500, size:500,
        units:{ levy:500, arch:0, cav:0, ret:0, mercs:0 },
        at:home, from:home, moveLeft:0, path:[], goal:null, supply:82
      }];
      FB.selectArmy('live_panel_host');
      FB.map.select(home);
      s.player.cooldowns = s.player.cooldowns || {};
      s.player.cooldowns.go_to_town = s.turn;
      FB.ui.showTab('actions');
      FB.ui.refresh();
    });
    await page.evaluate(function () {
      return new Promise(function (resolve) {
        requestAnimationFrame(function () { requestAnimationFrame(resolve); });
      });
    });
    await expect(page.locator('#deeds-war-card')).toContainText('82%');
    await expect(page.locator('#deed-details-go_to_town'))
      .toContainText('Ready in 30 days');

    await page.evaluate(function () {
      const sentinel = document.createElement('i');
      sentinel.id = 'deeds-live-tick-sentinel';
      document.getElementById('tab-actions').appendChild(sentinel);
      FB.playerHost(FB.state).supply = 81;
      FB.state.turn++;
      FB.ui.refresh({ liveTick:true });
    });
    await page.evaluate(function () {
      return new Promise(function (resolve) {
        requestAnimationFrame(function () { requestAnimationFrame(resolve); });
      });
    });
    await expect(page.locator('#deeds-live-tick-sentinel')).toHaveCount(1);
    await expect(page.locator('#deeds-war-card')).toContainText('82%');
    await expect(page.locator('#deed-details-go_to_town'))
      .toContainText('Ready in 30 days');

    /* A bounded live pass updates visible deed eligibility without triggering
       the all-or-nothing Deeds renderer merely because supply changed. */
    await page.evaluate(function () {
      FB.state.turn += 20;
      FB.ui.refresh({ liveTick:true });
    });
    await page.evaluate(function () {
      return new Promise(function (resolve) {
        requestAnimationFrame(function () { requestAnimationFrame(resolve); });
      });
    });
    await expect(page.locator('#deeds-live-tick-sentinel')).toHaveCount(1);
    await expect(page.locator('#deeds-war-card')).toContainText('82%');
    await expect(page.locator('#deed-details-go_to_town'))
      .toContainText('Ready in 9 days');

    await page.evaluate(function () { FB.ui.refresh(); });
    await expect(page.locator('#deeds-live-tick-sentinel')).toHaveCount(0);
    await expect(page.locator('#deeds-war-card')).toContainText('81%');

    await page.evaluate(function () {
      FB.ui.showTab('prov');
      FB.ui.refresh();
    });
    await page.evaluate(function () {
      return new Promise(function (resolve) {
        requestAnimationFrame(function () { requestAnimationFrame(resolve); });
      });
    });
    await expect(page.locator('#land-war-card .settcard-head > b')).toContainText('500');
    await page.evaluate(function () {
      const sentinel = document.createElement('i');
      sentinel.id = 'land-live-tick-sentinel';
      document.getElementById('tab-prov').appendChild(sentinel);
      FB.playerHost(FB.state).men = 499;
      FB.state.turn++;
      FB.ui.refresh({ liveTick:true });
    });
    await page.evaluate(function () {
      return new Promise(function (resolve) {
        requestAnimationFrame(function () { requestAnimationFrame(resolve); });
      });
    });
    await expect(page.locator('#land-live-tick-sentinel')).toHaveCount(1);
    await expect(page.locator('#land-war-card .settcard-head > b')).toContainText('500');

    await page.evaluate(function () {
      FB.map.pointers.live_panel_drag = [0, 0];
      FB.state.turn += 20;
      FB.ui.refresh({ liveTick:true });
    });
    await page.evaluate(function () {
      return new Promise(function (resolve) {
        requestAnimationFrame(function () { requestAnimationFrame(resolve); });
      });
    });
    await expect(page.locator('#land-live-tick-sentinel')).toHaveCount(1);
    await expect(page.locator('#land-war-card .settcard-head > b')).toContainText('500');

    /* Releasing a drag must preserve the deferred request's live priority;
       it must not promote that tick into a full Land-panel rebuild. */
    await page.evaluate(function () {
      delete FB.map.pointers.live_panel_drag;
      FB.ui.flushMapInteractionRefresh();
    });
    await page.evaluate(function () {
      return new Promise(function (resolve) {
        requestAnimationFrame(function () { requestAnimationFrame(resolve); });
      });
    });
    await expect(page.locator('#land-live-tick-sentinel')).toHaveCount(1);
    await expect(page.locator('#land-war-card .settcard-head > b')).toContainText('500');

    await page.evaluate(function () { FB.ui.refresh(); });
    await expect(page.locator('#land-live-tick-sentinel')).toHaveCount(0);
    await expect(page.locator('#land-war-card .settcard-head > b')).toContainText('499');
  });

test('natural ticks retain Self and Network trees while updating visible Self values',
  async function ({ page }) {
    await startDeterministicGame(page);
    await page.setViewportSize({ width:1280, height:800 });
    await page.evaluate(function () {
      FB.game.setPaused(true);
      FB.ui.showTab('char', { history:false });
      FB.ui.showTab('network', { history:false });
      FB.ui.refresh();
    });
    await waitForUiRefresh(page);

    const liveValues = await page.evaluate(function () {
      const selfSentinel = document.createElement('i');
      selfSentinel.id = 'self-live-tick-sentinel';
      document.getElementById('tab-char').appendChild(selfSentinel);
      const networkSentinel = document.createElement('i');
      networkSentinel.id = 'network-live-tick-sentinel';
      document.getElementById('tab-network').appendChild(networkSentinel);
      const s = FB.state;
      const me = s.chars[s.player.charId];
      me.born = s.date.year - 42;
      me.health = 4;
      s.player.pop = 73;
      FB.state.turn++;
      FB.ui.refresh({ liveTick:true });
      return {
        age:String(FB.ageOf(me, s.date.year)),
        voice:String(Math.round(FB.popEffective ? FB.popEffective(s) : s.player.pop))
      };
    });
    await waitForUiRefresh(page);
    await expect(page.locator('#self-live-tick-sentinel')).toHaveCount(1);
    await expect(page.locator('#network-live-tick-sentinel')).toHaveCount(1);
    await expect(page.locator('#tab-char .kv:has(span:text-is("Age")) b'))
      .toHaveText(liveValues.age);
    await expect(page.locator('#tab-char .kv:has(span:text-is("Health")) b'))
      .toHaveText('4 / 10 ' + String.fromCharCode(183) + ' Grievously wounded');
    await expect(page.locator('#tab-char .kv:has(span:text-is("Common Voice")) b'))
      .toHaveText(liveValues.voice);

    await page.evaluate(function () {
      FB.ui._shared.resetPanelMarkup();
      FB.ui.refresh();
    });
    await waitForUiRefresh(page);
    await expect(page.locator('#self-live-tick-sentinel')).toHaveCount(0);
    await expect(page.locator('#network-live-tick-sentinel')).toHaveCount(0);
  });

test('daily focus validation skips presentation preview work',
  async function ({ page }) {
    await startDeterministicGame(page);
    const result = await page.evaluate(function () {
      const s = FB.state;
      s.player.travel = null;
      const focus = FB.listFocuses(s)[0];
      s.player.focus = focus.id;
      const originalPreview = focus.preview;
      let calls = 0;
      focus.preview = function () {
        calls++;
        return originalPreview ? originalPreview.apply(this, arguments) : {};
      };
      FB.validateFocus(s);
      const dailyCalls = calls;
      FB.focusStatus(s, focus.id);
      const explicitCalls = calls;
      if (originalPreview) focus.preview = originalPreview;
      else delete focus.preview;
      return {
        focusId:focus.id,
        dailyCalls:dailyCalls,
        explicitCalls:explicitCalls
      };
    });

    expect(result.focusId).toBeTruthy();
    expect(result.dailyCalls).toBe(0);
    expect(result.explicitCalls).toBe(1);
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

test('fast-forward completion refreshes visible deeds without rebuilding the panel',
  async function ({ page }) {
    await startDeterministicGame(page);
    await page.evaluate(function () {
      delete FB.state.player.flags.tutorial;
      FB.state.player.flags.tutorial_done = 1;
      FB.state.eventQueue = [];
      FB.state.slotDays = [];
      FB.state.player.cooldowns = FB.state.player.cooldowns || {};
      FB.state.player.cooldowns.go_to_town = FB.state.turn;
      FB.game.auto.all = true;
      FB.game.setPaused(true);
      FB.ui.showTab('actions', { history:false });
    });
    await waitForUiRefresh(page);
    const before = await page.evaluate(function () {
      const sentinel = document.createElement('i');
      sentinel.id = 'fast-forward-panel-sentinel';
      document.getElementById('tab-actions').appendChild(sentinel);
      return {
        turn:FB.state.turn,
        dateText:document.getElementById('tb-date').textContent,
        deedText:document.querySelector(
          '#deed-details-go_to_town .deed-status-text').textContent
      };
    });

    await page.locator('#btn-skip').click();
    await expect.poll(function () {
      return page.evaluate(function () { return !FB.game.fastForwarding; });
    }).toBe(true);
    await waitForUiRefresh(page);

    const after = await page.evaluate(function () {
      return {
        turn:FB.state.turn,
        dateText:document.getElementById('tb-date').textContent,
        paused:FB.game.paused
      };
    });
    expect(after.turn).toBeGreaterThan(before.turn);
    expect(after.dateText).not.toBe(before.dateText);
    expect(after.paused).toBe(true);
    await expect(page.locator('#fast-forward-panel-sentinel')).toHaveCount(1);
    await expect(page.locator('#deed-details-go_to_town .deed-status-text'))
      .not.toHaveText(before.deedText);

    await page.evaluate(function () { FB.ui.refresh(); });
    await waitForUiRefresh(page);
    await expect(page.locator('#fast-forward-panel-sentinel')).toHaveCount(0);
  });

test('fast-forward yields after two days without requesting per-day UI refreshes',
  async function ({ page }) {
    await startDeterministicGame(page);
    const result = await page.evaluate(function () {
      delete FB.state.player.flags.tutorial;
      FB.state.player.flags.tutorial_done = 1;
      FB.state.eventQueue = [];
      FB.state.slotDays = [];
      FB.game.paused = true;

      const originalAnimationFrame = window.requestAnimationFrame;
      const originalRefresh = FB.ui.refresh;
      const callbacks = [];
      let refreshes = 0;
      window.requestAnimationFrame = function (callback) {
        callbacks.push(callback);
        return callbacks.length;
      };
      FB.ui.refresh = function () {
        refreshes++;
        return originalRefresh.apply(this, arguments);
      };
      const before = FB.state.turn;
      try {
        FB.game.skipAhead();
        const scheduledBeforeWork = callbacks.length;
        callbacks.shift()();
        return {
          scheduledBeforeWork:scheduledBeforeWork,
          days:FB.state.turn - before,
          refreshes:refreshes,
          stillRunning:FB.game.fastForwarding,
          continuationQueued:callbacks.length
        };
      } finally {
        window.requestAnimationFrame = originalAnimationFrame;
        FB.ui.refresh = originalRefresh;
        FB.game.fastForwarding = false;
        FB.game.paused = true;
      }
    });

    expect(result.scheduledBeforeWork).toBe(1);
    expect(result.days).toBeGreaterThan(0);
    expect(result.days).toBeLessThanOrEqual(2);
    expect(result.refreshes).toBe(0);
    expect(result.stillRunning).toBe(true);
    expect(result.continuationQueued).toBe(1);
  });

test('daily maintenance skips vassal discovery for non-landed households',
  async function ({ page }) {
    await startDeterministicGame(page);
    expect(await page.evaluate(function () {
      const original = FB.playerVassals;
      let calls = 0;
      FB.playerVassals = function () {
        calls++;
        return original.apply(this, arguments);
      };
      try {
        FB.state.player.tier = 0;
        FB.state.player.localCouncil = null;
        FB.state.player.castellany = null;
        delete FB.state.player.flags.councilman;
        FB.localGovernmentDay(FB.state);
        return calls;
      } finally {
        FB.playerVassals = original;
      }
    })).toBe(0);
  });

test('fast-forward records news immediately but renders only its final five toasts afterward',
  async function ({ page }) {
    await startDeterministicGame(page);
    const result = await page.evaluate(function () {
      const box = document.getElementById('toasts');
      box.innerHTML = '';
      const before = FB.state.log.length;
      FB.game.fastForwarding = true;
      for (let i = 1; i <= 7; i++) {
        FB.news(FB.state, 'Fast-forward notice ' + i);
      }
      const during = box.children.length;
      const recorded = FB.state.log.length - before;
      FB.game.fastForwarding = false;
      FB.ui.fastForwardFinished();
      return {
        during:during,
        recorded:recorded,
        after:Array.prototype.map.call(box.children, function (toast) {
          return toast.textContent;
        })
      };
    });
    expect(result).toEqual({
      during:0,
      recorded:7,
      after:[
        'Fast-forward notice 3',
        'Fast-forward notice 4',
        'Fast-forward notice 5',
        'Fast-forward notice 6',
        'Fast-forward notice 7'
      ]
    });
  });

test('fast-forward matches individual days and avoids invariant repair loops',
  async function ({ page }, testInfo) {
    test.skip(testInfo.project.name !== 'chromium-file',
      'The bounded maintenance comparison belongs to the direct-file canary.');
    await startDeterministicGame(page);
    await page.evaluate(function () {
      delete FB.state.player.flags.tutorial;
      FB.state.player.flags.tutorial_done = 1;
      /* Clicking Skip records that this life has started time. Establish the
         same durable tutorial metadata before both comparison routes so this
         control-level receipt is not mistaken for a simulation difference. */
      FB.state.player.flags.tut_unpause = 1;
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
        institutionPolicies:0,
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
        ['realmPolicySync', 'institutionPolicies'],
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
    expect(result.counts.institutionPolicies).toBeLessThanOrEqual(2);
    expect(result.counts.papacy).toBeLessThanOrEqual(5);
    expect(result.counts.religiousHeads).toBeLessThanOrEqual(5);
    expect(result.counts.modifiers).toBeLessThanOrEqual(2);
    /* Seasonal settlement, an adjacent annual price tick, and post-skip Coin
       & Credit eligibility each reuse their normalized record. */
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
        const rid = state.owner[pid];
        /* A Catholic sovereign's default investiture policy scales its
           realmStrength by 5%, which would blur the exact dev→strength step
           this spec asserts; use a realm beyond the papal reach instead. */
        if (!realmId && FB.papacyRealmStrengthMultiplier(state, rid) === 1) realmId = rid;
        else if (realmId && rid !== realmId) {
          otherRealm = rid;
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

test('clicking a panel tab leaves Space as the pause hotkey', async function ({ page }) {
  await startDeterministicGame(page);
  await page.evaluate(function () {
    delete FB.state.player.flags.tutorial;
    FB.state.player.flags.tutorial_done = 1;
    FB.state.eventQueue = [];
    FB.state.slotDays = [];
    FB.game.uiPrefs.hideTips = true;
    FB.game.uiPrefs.hideBeginnerHints = true;
    FB.game.setPaused(true);
  });

  const landTab = page.locator('#sidetabs .tab[data-tab="prov"]');
  await landTab.click();
  await expect(landTab).toHaveClass(/active/);
  /* A pointer click must not leave the tab focused: a focused button swallows
     Space as native activation, stealing the pause hotkey until another tab
     is clicked. Keyboard activation (event detail 0) still keeps focus. */
  await expect(landTab).not.toBeFocused();
  await expect.poll(function () {
    return page.evaluate(function () { return FB.game.paused; });
  }).toBe(true);

  await page.keyboard.press('Space');
  await expect.poll(function () {
    return page.evaluate(function () { return FB.game.paused; });
  }).toBe(false);
  await page.keyboard.press('Space');
  await expect.poll(function () {
    return page.evaluate(function () { return FB.game.paused; });
  }).toBe(true);

  const kinTab = page.locator('#lefttabs .tab[data-tab="family"]');
  await kinTab.click();
  await expect(kinTab).toHaveClass(/active/);
  await expect(kinTab).not.toBeFocused();
  await page.keyboard.press('Space');
  await expect.poll(function () {
    return page.evaluate(function () { return FB.game.paused; });
  }).toBe(false);
});

test('tab switches render only the selected desktop panel column',
  async function ({ page }) {
    await startDeterministicGame(page);
    await page.setViewportSize({ width:1280, height:800 });
    const result = await page.evaluate(function () {
      delete FB.state.player.flags.tutorial;
      FB.state.player.flags.tutorial_done = 1;
      FB.state.eventQueue = [];
      FB.state.slotDays = [];
      FB.game.uiPrefs.hideTips = true;
      FB.game.uiPrefs.hideBeginnerHints = true;
      FB.game.setPaused(true);

      FB.ui.showTab('char', { history:false });
      FB.ui.showTab('actions', { history:false });

      const originalPaintFaces = FB.paintFaces;
      const painted = [];
      FB.paintFaces = function (root) {
        painted.push(root && root.id);
        return originalPaintFaces.apply(this, arguments);
      };

      FB.ui.showTab('prov', { history:false });
      const rightSwitchPainted = painted.slice();

      painted.length = 0;
      FB.ui.showTab('actions', { history:false });
      const sentinel = document.createElement('i');
      sentinel.id = 'right-panel-switch-sentinel';
      document.getElementById('tab-actions').appendChild(sentinel);
      painted.length = 0;
      FB.ui.showTab('family', { history:false });

      const leftSwitchPainted = painted.slice();
      const rightPanelPreserved = !!document.getElementById(
        'right-panel-switch-sentinel');
      FB.paintFaces = originalPaintFaces;
      return {
        rightSwitchPainted:rightSwitchPainted,
        leftSwitchPainted:leftSwitchPainted,
        rightPanelPreserved:rightPanelPreserved
      };
    });

    expect(result.rightSwitchPainted).toEqual(['tab-prov']);
    expect(result.leftSwitchPainted).toEqual(['tab-family']);
    expect(result.rightPanelPreserved).toBe(true);
  });

test('returning to clean Deeds reuses its mounted tree until a refresh request',
  async function ({ page }) {
    await startDeterministicGame(page);
    await page.setViewportSize({ width:1280, height:800 });
    await page.evaluate(function () {
      FB.game.setPaused(true);
    });
    await waitForUiRefresh(page);
    await page.evaluate(function () {
      FB.ui.showTab('actions', { history:false });
      window.__originalListInstants = FB.listInstants;
      window.__deedsListCalls = 0;
      FB.listInstants = function () {
        window.__deedsListCalls++;
        return window.__originalListInstants.apply(this, arguments);
      };
      const sentinel = document.createElement('i');
      sentinel.id = 'clean-deeds-tree-sentinel';
      document.getElementById('tab-actions').appendChild(sentinel);
    });

    await page.locator('#sidetabs .tab[data-tab="prov"]').click();
    await page.locator('#sidetabs .tab[data-tab="actions"]').click();
    await expect(page.locator('#clean-deeds-tree-sentinel')).toHaveCount(1);
    expect(await page.evaluate(function () {
      return window.__deedsListCalls;
    })).toBe(0);

    await page.locator('#sidetabs .tab[data-tab="prov"]').click();
    await page.evaluate(function () {
      FB.state.player.gold++;
      FB.ui.refresh();
    });
    await waitForUiRefresh(page);
    await page.locator('#sidetabs .tab[data-tab="actions"]').click();
    await expect(page.locator('#clean-deeds-tree-sentinel')).toHaveCount(0);
    expect(await page.evaluate(function () {
      return window.__deedsListCalls;
    })).toBe(1);
    await page.evaluate(function () {
      FB.listInstants = window.__originalListInstants;
      delete window.__originalListInstants;
      delete window.__deedsListCalls;
    });
  });

test('collapsed Deeds groups defer eligibility work until opened',
  async function ({ page }) {
    await startDeterministicGame(page);
    const beforeOpen = await page.evaluate(function () {
      FB.ui.showTab('actions', { history:false });
      const realmToggle = document.querySelector(
        '#tab-actions [data-action-group="realm"]');
      if (realmToggle && realmToggle.getAttribute('aria-expanded') === 'true') {
        realmToggle.click();
      }
      const action = FB.instants.filter(function (candidate) {
        return candidate.id === 'buy_land';
      })[0];
      window.__originalBuyLandCan = action.can;
      window.__buyLandCanCalls = 0;
      action.can = function () {
        window.__buyLandCanCalls++;
        return window.__originalBuyLandCan.apply(this, arguments);
      };
      FB.ui.showTab('actions', { history:false });
      return window.__buyLandCanCalls;
    });
    expect(beforeOpen).toBe(0);

    await page.locator('#tab-actions [data-action-group="realm"]').click();
    expect(await page.evaluate(function () {
      return window.__buyLandCanCalls;
    })).toBe(1);
    await expect(page.locator('#tab-actions [data-action-id="buy_land"]'))
      .toBeVisible();
    await page.evaluate(function () {
      const action = FB.instants.filter(function (candidate) {
        return candidate.id === 'buy_land';
      })[0];
      action.can = window.__originalBuyLandCan;
      delete window.__originalBuyLandCan;
      delete window.__buyLandCanCalls;
    });
  });

test('desktop panel tabs keep full titles with trailing reserved key badges',
  async function ({ page }) {
    await startDeterministicGame(page);
    await page.evaluate(function () {
      delete FB.state.player.flags.tutorial;
      FB.state.player.flags.tutorial_done = 1;
      FB.state.eventQueue = [];
      FB.state.slotDays = [];
      FB.game.uiPrefs.hideTips = true;
      FB.game.uiPrefs.hideBeginnerHints = true;
      FB.game.uiPrefs.actionBindings = {
        b:'action:livelihoods',
        g:'action:livelihoods',
        t:'action:livelihoods',
        u:'action:livelihoods',
        y:'action:livelihoods'
      };
      FB.ui.refresh();
    });

    const tabs = [
      ['char', 'Self', 'T'],
      ['family', 'Kin', 'G'],
      ['actions', 'Deeds', 'B'],
      ['prov', 'Land', 'Y'],
      ['network', 'Network', 'N'],
      ['log', 'Chronicle', 'U']
    ];
    for (const item of tabs) {
      const tab = page.locator('.tab[data-tab="' + item[0] + '"]');
      await expect(tab.locator('.tablabel')).toHaveText(item[1]);
      await expect(tab.locator('.keyhint')).toHaveText(item[2]);
      await expect(tab).toHaveAttribute(
        'aria-label', item[1] + ' (' + item[2] + ')');
    }

    await page.keyboard.press('KeyG');
    await expect(page.locator('.tab[data-tab="family"]')).toHaveClass(/active/);
    await page.keyboard.press('KeyT');
    await expect(page.locator('.tab[data-tab="char"]')).toHaveClass(/active/);
    await page.keyboard.press('KeyY');
    await expect(page.locator('.tab[data-tab="prov"]')).toHaveClass(/active/);
    await page.keyboard.press('KeyB');
    await expect(page.locator('.tab[data-tab="actions"]')).toHaveClass(/active/);
    await page.keyboard.press('KeyN');
    await expect(page.locator('.tab[data-tab="network"]')).toHaveClass(/active/);
    await page.keyboard.press('KeyU');
    await expect(page.locator('.tab[data-tab="log"]')).toHaveClass(/active/);
    await expect(page.locator('#genmodal')).toHaveClass(/hidden/);
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
