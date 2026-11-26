'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'data/events_tutorial.js',
  'js/main.js',
  'js/wars.js',
  'js/ui_wars.js',
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
  'js/treasury.js',
  'js/logistics.js',
  'js/events.js',
  'js/ui_misc.js',
  'js/ui_panels.js',
  'js/portrait.js',
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
const { describeSharedPage, isSharedPage, activateBookmark } = require('../support/shared-page');

// Every case starts its own campaign; no state crosses test boundaries. The
// cases share one page booted with the 867 world active and reset before each
// case; the reset also restores the war-cause query the Declare War case wraps,
// removes toasts the previous case raised and drops the Self drawer body class
// a left-panel tab leaves (inert on desktop; a new campaign clears it too).
test.beforeEach(async function ({ page }, testInfo) {
  if (!isSharedPage(page)) await openGame(page, testInfo);
});

describeSharedPage('clock ticks and fast-forward', { boot:async function (page, testInfo) {
  await openGame(page, testInfo);
  await activateBookmark(page, '867');
  await page.evaluate(function () { window.timeControlsBooted = { warCauses:FB.warCauses }; });
}, reset:async function (page) {
  await page.evaluate(function () {
    FB.warCauses = window.timeControlsBooted.warCauses;
    delete window.__deedWarCauseCalls;
    const toasts = document.getElementById('toasts');
    while (toasts && toasts.firstChild) toasts.removeChild(toasts.firstChild);
    document.body.classList.remove('showself');
  });
} }, function () {
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
      s.player.tier = 4;
      s.player.provs = [home];
      s.owner[home] = 'player'; s.holder[home] = 'player';
      FB.foundPlayerRealm(s);
      FB.invalidateRealmCache();
      FB.registerOrdinaryWar(s, 'player', {
        enemy:enemy, target:home, wins:0, losses:0, seasons:0,
        defending:true, strength:1
      });
      if (FB.realmWars(s, 'player').length !== 1) throw new Error('Expected one registered panel campaign.');
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
    await expect(page.locator('#tab-actions [data-campaign-open]')).toContainText('0/1');
    await expect(page.locator('#deed-details-go_to_town'))
      .toContainText('Ready in 30 days');

    await page.evaluate(function () {
      const sentinel = document.createElement('i');
      sentinel.id = 'deeds-live-tick-sentinel';
      document.getElementById('tab-actions').appendChild(sentinel);
      FB.playerHost(FB.state).supply = 81;
      const war = FB.realmWars(FB.state, 'player')[0];
      war.occupations[war.target] = { occupied:true };
      FB.state.turn++;
      FB.ui.refresh({ liveTick:true });
    });
    await page.evaluate(function () {
      return new Promise(function (resolve) {
        requestAnimationFrame(function () { requestAnimationFrame(resolve); });
      });
    });
    await expect(page.locator('#deeds-live-tick-sentinel')).toHaveCount(1);
    await expect(page.locator('#tab-actions [data-campaign-open]')).toContainText('1/1');
    await expect(page.locator('#deed-details-go_to_town'))
      .toContainText('Ready in 30 days');

    /* A bounded live pass updates visible deed eligibility without triggering
       the all-or-nothing Deeds renderer while campaign progress updates in place. */
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
    await expect(page.locator('#tab-actions [data-campaign-open]')).toContainText('1/1');
    await expect(page.locator('#deed-details-go_to_town'))
      .toContainText('Ready in 9 days');

    await page.evaluate(function () { FB.ui.refresh(); });
    await expect(page.locator('#deeds-live-tick-sentinel')).toHaveCount(0);
    await expect(page.locator('#tab-actions [data-campaign-open]')).toContainText('1/1');

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

test('natural ticks retain Self and Network trees while updating visible player values',
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

    // Popular support belongs to counties, not the personal Self panel.
    await expect(page.locator('#tab-char [data-self-value="voice"]')).toHaveCount(0);

    const liveValues = await page.evaluate(function () {
      const selfSentinel = document.createElement('i');
      selfSentinel.id = 'self-live-tick-sentinel';
      document.getElementById('tab-char').appendChild(selfSentinel);
      const networkSentinel = document.createElement('i');
      networkSentinel.id = 'network-live-tick-sentinel';
      document.getElementById('tab-network').appendChild(networkSentinel);
      const s = FB.state;
      const me = s.chars[s.player.charId];
      const selfPortraitStamp = document.getElementById('selfportrait')._fbPortraitStamp;
      const topbarPortraitStamp = document.getElementById('tb-portrait')._fbPortraitStamp;
      me.born = s.date.year - 42;
      me.health = 4;
      for (let i = 0; i < FB.SKILLS.length; i++) {
        me.skills[FB.SKILLS[i]] += i + 1;
      }
      FB.setCountySupport(s, s.player.provinceId, 73);
      s.player.gold = 123;
      s.player.prestige = 456;
      s.player.piety = 789;
      FB.state.turn++;
      FB.ui.refresh({ liveTick:true });
      return {
        age:String(FB.ageOf(me, s.date.year)),
        skills:FB.SKILLS.reduce(function (values, key) {
          values[key] = String(FB.skillOf(me, key));
          return values;
        }, {}),
        gold:FB.money(s.player.gold, { omitPrimarySymbol:true }),
        selfPortraitStamp:selfPortraitStamp,
        topbarPortraitStamp:topbarPortraitStamp
      };
    });
    await waitForUiRefresh(page);
    await expect(page.locator('#self-live-tick-sentinel')).toHaveCount(1);
    await expect(page.locator('#network-live-tick-sentinel')).toHaveCount(1);
    await expect(page.locator('#tab-char [data-self-value="age"] b'))
      .toHaveText(liveValues.age);
    await expect(page.locator('#tab-char [data-self-value="health"] b'))
      .toHaveText('4 / 10 ' + String.fromCharCode(183) + ' Grievously wounded');
    await expect(page.locator('#tab-char [data-self-value="voice"] b'))
      .toHaveCount(0);
    for (const key of Object.keys(liveValues.skills)) {
      await expect(page.locator('#tab-char [data-self-skill="' + key + '"] .num'))
        .toHaveText(liveValues.skills[key]);
    }
    await expect(page.locator('#tb-gold .mono')).toHaveText(liveValues.gold);
    await expect(page.locator('#tb-prestige .mono')).toHaveText('456');
    await expect(page.locator('#tb-piety .mono')).toHaveText('789');
    await expect(page.locator('#tb-health .mono')).toHaveText('4');
    const portraitStamps = await page.evaluate(function () {
      return {
        self:document.getElementById('selfportrait')._fbPortraitStamp,
        topbar:document.getElementById('tb-portrait')._fbPortraitStamp
      };
    });
    expect(portraitStamps.self).not.toBe(liveValues.selfPortraitStamp);
    expect(portraitStamps.topbar).not.toBe(liveValues.topbarPortraitStamp);

    await page.evaluate(function () {
      FB.ui._shared.resetPanelMarkup();
      FB.ui.refresh();
    });
    await waitForUiRefresh(page);
    await expect(page.locator('#self-live-tick-sentinel')).toHaveCount(0);
    await expect(page.locator('#network-live-tick-sentinel')).toHaveCount(0);
  });

test('natural ticks retain Kin while updating spouse and child ages',
  async function ({ page }) {
    await startDeterministicGame(page);
    await page.setViewportSize({ width:1280, height:800 });
    const family = await page.evaluate(function () {
      const s = FB.state;
      const me = s.chars[s.player.charId];
      const spouse = FB.makeCharacter(s, {
        name:'Live Spouse', sex:me.sex === 'm' ? 'f' : 'm',
        born:s.date.year - 30, culture:me.culture, religion:me.religion,
        dyn:'Live House', traitsN:0
      });
      const child = FB.makeCharacter(s, {
        name:'Live Child', sex:'m', born:s.date.year - 15,
        fatherId:me.sex === 'm' ? me.id : spouse.id,
        motherId:me.sex === 'f' ? me.id : spouse.id,
        culture:me.culture, religion:me.religion, dyn:me.dyn,
        traitsN:0
      });
      me.spouseId = spouse.id;
      spouse.spouseId = me.id;
      me.childrenIds.push(child.id);
      spouse.childrenIds.push(child.id);
      child.edu = { focus:'dip' };
      FB.game.setPaused(true);
      FB.ui.showTab('family', { history:false });
      FB.ui.refresh();
      return { spouseId:spouse.id, childId:child.id };
    });
    await waitForUiRefresh(page);

    await page.evaluate(function () {
      const sentinel = document.createElement('i');
      sentinel.id = 'kin-live-tick-sentinel';
      document.getElementById('tab-family').appendChild(sentinel);
      FB.state.date.year++;
      FB.state.turn++;
      FB.ui.refresh({ liveTick:true });
    });
    await waitForUiRefresh(page);

    await expect(page.locator('#kin-live-tick-sentinel')).toHaveCount(1);
    await expect(page.locator('[data-live-kin-age="spouse"]' +
      '[data-live-age-cid="' + family.spouseId + '"]')).toHaveText('Age 31');
    await expect(page.locator('[data-live-kin-age="child"]' +
      '[data-live-age-cid="' + family.childId + '"]')).toHaveText('Son · age 16');
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

test('fast-forward batches six cheap days without requesting per-day UI refreshes',
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
      const originalNow = Object.getOwnPropertyDescriptor(
        window.performance, 'now');
      const callbacks = [];
      let refreshes = 0;
      Object.defineProperty(window.performance, 'now', {
        configurable:true,
        value:function () { return 0; }
      });
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
        if (originalNow) {
          Object.defineProperty(window.performance, 'now', originalNow);
        } else {
          delete window.performance.now;
        }
        window.requestAnimationFrame = originalAnimationFrame;
        FB.ui.refresh = originalRefresh;
        FB.game.fastForwarding = false;
        FB.game.paused = true;
      }
    });

    expect(result.scheduledBeforeWork).toBe(1);
    expect(result.days).toBe(6);
    expect(result.refreshes).toBe(0);
    expect(result.stillRunning).toBe(true);
    expect(result.continuationQueued).toBe(1);
  });

test('offensive host automation resumes during fast-forward after manual control',
  async function ({ page }) {
    await startDeterministicGame(page);
    const result = await page.evaluate(function () {
      const state = FB.state;
      const player = state.player;
      const enemyId = Object.keys(state.realms).filter(function (rid) {
        const realm = state.realms[rid];
        return rid !== 'player' && realm && realm.alive && !realm.liege;
      })[0];
      const originalWorld = FB.world;
      const originalPassDay = FB.game.passDay;
      const originalAnimationFrame = window.requestAnimationFrame;
      const originalFinished = FB.ui.fastForwardFinished;
      const originalMapRequest = FB.map.request;
      const originalHosts = FB.game.auto.hosts;
      const callbacks = [];
      let days = 0;
      try {
        for (const rid in state.realms) {
          if (state.realms[rid]) state.realms[rid].war = null;
        }
        FB.world = {
          adj:{ home:{ target:1 }, target:{ home:1 } },
          waterAdj:{ home:{}, target:{} },
          byId:{
            home:{ id:'home', name:'Home', cx:0, cy:0, terrain:'farmland' },
            target:{ id:'target', name:'Target', cx:20, cy:0,
              terrain:'farmland' }
          }
        };
        player.provinceId = 'home';
        player.provs = ['home'];
        state.realms[enemyId].capital = 'target';
        state.owner.home = 'player';
        state.holder.home = 'player';
        state.owner.target = enemyId;
        state.holder.target = enemyId;
        player.war = {
          enemy:enemyId, target:'target', wins:0, losses:0,
          seasons:0, defending:false, strength:1
        };
        state.armies = [{
          id:'fast-forward-auto-host', realm:'player', men:500, size:500,
          units:{ levy:500 }, at:'home', from:'home', moveLeft:0,
          path:[], goal:null, supply:100
        }];
        state.armyDown = {};
        state.armyDown[enemyId] = state.turn;
        state.armyDetachmentDown = {};
        state.armyCohorts = {};
        FB.invalidateRealmCache();
        FB.invalidateFortIndex();
        FB.map.request = function () {};

        FB.game.auto.hosts = 'off';
        FB.armyTick(state);
        FB.game.auto.hosts = 'manual';
        FB.enforceManualHostControl(state);
        const heldAfterManual = !!state.armies[0].holdManual;
        FB.game.auto.hosts = 'off';

        FB.game.passDay = function () {
          state.turn++;
          days++;
          FB.armyTick(state);
          return state.armies[0].at === 'target' ? 'season' : 'day';
        };
        window.requestAnimationFrame = function (callback) {
          callbacks.push(callback);
          return callbacks.length;
        };
        FB.ui.fastForwardFinished = function () {};
        FB.game.paused = true;
        FB.game.skipAhead();
        while (callbacks.length && FB.game.fastForwarding) callbacks.shift()();
        return {
          heldAfterManual:heldAfterManual,
          at:state.armies[0].at,
          days:days,
          paused:FB.game.paused
        };
      } finally {
        FB.game.passDay = originalPassDay;
        window.requestAnimationFrame = originalAnimationFrame;
        FB.ui.fastForwardFinished = originalFinished;
        FB.map.request = originalMapRequest;
        FB.game.auto.hosts = originalHosts;
        FB.game.fastForwarding = false;
        FB.game.paused = true;
        FB.world = originalWorld;
        FB.invalidateRealmCache();
        FB.invalidateFortIndex();
      }
    });

    expect(result.heldAfterManual).toBe(false);
    expect(result.at).toBe('target');
    expect(result.days).toBeGreaterThan(0);
    expect(result.days).toBeLessThan(92);
    expect(result.paused).toBe(true);
  });

test('status-only deed refresh reuses visibility and skips previews',
  async function ({ page }) {
    await startDeterministicGame(page);
    await page.evaluate(function () {
      FB.game.setPaused(true);
      FB.ui.showTab('actions', { history:false });
    });
    await waitForUiRefresh(page);

    const calls = await page.evaluate(function () {
      const mounted = document.querySelector(
        '#tab-actions [data-action-id]');
      let action = null;
      for (const candidate of FB.instants) {
        if (mounted && candidate.id === mounted.getAttribute('data-action-id')) {
          action = candidate;
          break;
        }
      }
      const originalShow = action.show;
      const originalPreview = action.preview;
      let shows = 0, previews = 0;
      action.show = function () {
        shows++;
        return originalShow.apply(this, arguments);
      };
      action.preview = function () {
        previews++;
        return originalPreview
          ? originalPreview.apply(this, arguments) : {};
      };
      try {
        FB.ui._shared.refreshVisibleDeedStatuses({ force:true });
        return { shows:shows, previews:previews };
      } finally {
        action.show = originalShow;
        if (originalPreview) action.preview = originalPreview;
        else delete action.preview;
      }
    });

    expect(calls).toEqual({ shows:1, previews:0 });
  });

test('Declare War defers cause discovery until its conquest picker opens',
  async function ({ page }) {
    await startDeterministicGame(page);
    await page.evaluate(function () {
      const s = FB.state;
      s.player.tier = 4;
      s.player.war = null;
      FB.game.uiPrefs.groupDeedsByActionType = true;
      const originalWarCauses = FB.warCauses;
      window.__deedWarCauseCalls = 0;
      FB.warCauses = function () {
        window.__deedWarCauseCalls++;
        return originalWarCauses.apply(FB, arguments);
      };
      FB.game.setPaused(true);
      FB.ui.showTab('actions', { history:false });
      FB.ui.refresh();
    });
    await waitForUiRefresh(page);

    await page.locator(
      '#tab-actions [data-action-group="ruler"]').click();
    const declareWar = page.locator(
      '#tab-actions [data-action-id="declare_war"]');
    await expect(declareWar).toBeEnabled();
    expect(await page.evaluate(function () {
      return window.__deedWarCauseCalls;
    })).toBe(0);

    await page.evaluate(function () { FB.ui.refresh(); });
    await waitForUiRefresh(page);
    await expect(declareWar).toBeEnabled();
    expect(await page.evaluate(function () {
      return window.__deedWarCauseCalls;
    })).toBe(0);

    await declareWar.click();
    await expect(page.getByRole('heading', {
      name:'Choose Your Conquest'
    })).toBeVisible();
    expect(await page.evaluate(function () {
      return window.__deedWarCauseCalls;
    })).toBeGreaterThan(0);
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
});

