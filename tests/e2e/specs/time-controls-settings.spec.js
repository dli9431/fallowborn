'use strict';
const {prepareGameContent} = require('../support/game/navigation');
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

test.beforeEach(async function ({ page }, testInfo) {
  await openGame(page, testInfo);
});

[
  { name:'desktop', width:1505, height:900 },
  { name:'mobile', width:390, height:844 }
].forEach(function (viewport) {
  test('campaign facts retain content-sized heights on ' + viewport.name,
    async function ({ page }) {
      await page.setViewportSize({ width:viewport.width, height:viewport.height });
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
        const host = {
          id:'compact_war_host', realm:'player', men:500, size:500,
          units:{ levy:500, arch:0, cav:0, ret:0, mercs:0 },
          at:home, from:home, moveLeft:0, path:[], goal:null, supply:82
        };
        s.armies = [host];
        FB.selectArmy(host.id);
        FB.ui.showTab('actions');
        FB.ui.refresh();
      });
      await waitForUiRefresh(page);
      await page.locator('#tab-actions [data-campaign-open]').click();
      const card = page.locator('[data-campaign-detail]');
      await expect(card).toBeVisible();
      await expect(card.locator('.kv').first()).toBeVisible();
      const facts = await card.locator('.kv').evaluateAll(function (rows) {
        return rows.map(function (row) {
          const label = row.querySelector(':scope > span');
          const value = row.querySelector(':scope > b');
          function excessHeight(node) {
            const text = document.createRange();
            text.selectNodeContents(node);
            return node.getBoundingClientRect().height - text.getBoundingClientRect().height;
          }
          return {
            labelSpace:excessHeight(label), valueSpace:excessHeight(value),
            height:row.getBoundingClientRect().height,
            wraps:row.scrollWidth <= row.clientWidth + 1
          };
        });
      });
      for (const fact of facts) {
        // Allow font line-box leading, but not inherited 9em/12em flex heights.
        expect(fact.labelSpace).toBeLessThan(12);
        expect(fact.valueSpace).toBeLessThan(12);
        expect(fact.height).toBeLessThan(120);
        expect(fact.wraps).toBe(true);
      }
    });
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
    await prepareGameContent(page);
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
  });

// Its own case keeps each journey to one reload instead of chaining two
// full content preparations after the shared boot.
test('an out-of-range stored game speed is clamped to the fastest setting',
  async function ({ page }) {
    await page.evaluate(function () { FB.ui.showSettings(); });
    await page.locator('#set-speed').evaluate(function (input) {
      input.value = '1';
      input.dispatchEvent(new Event('input', { bubbles:true }));
      input.dispatchEvent(new Event('change', { bubbles:true }));
    });
    await page.evaluate(function () {
      const stored = JSON.parse(localStorage.getItem('fb_ui'));
      stored.speedIdx = 99;
      localStorage.setItem('fb_ui', JSON.stringify(stored));
    });
    await page.reload({ waitUntil:'domcontentloaded' });
    await prepareGameContent(page);
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

test('Settings can group Deeds into direct, personal, and ruler action types',
  async function ({ page }) {
    await startDeterministicGame(page);
    await page.evaluate(function () { FB.ui.showSettings(); });
    const setting = page.getByRole('checkbox', {
      name:'Group Deeds by action type'
    });
    await expect(setting).not.toBeChecked();
    await setting.check();
    expect(await page.evaluate(function () {
      return {
        preference:FB.game.uiPrefs.groupDeedsByActionType,
        stored:JSON.parse(localStorage.getItem('fb_ui'))
          .groupDeedsByActionType
      };
    })).toEqual({ preference:true, stored:true });

    await page.evaluate(function () {
      const ids = [
        'poach', 'seek_blessing', 'give_alms', 'raid_expedition',
        'go_to_town', 'declare_war', 'adopt_tech', 'foreign_policy'
      ];
      for (const action of FB.instants) {
        if (ids.indexOf(action.id) < 0) continue;
        action.show = function () { return true; };
        action.can = function () { return true; };
      }
      FB.ui.closeModal();
      FB.ui._shared.markActionsDirty();
      FB.ui.showTab('actions', { history:false });
    });

    expect(await page.locator('#tab-actions [data-action-section]')
      .evaluateAll(function (headers) {
        return headers.map(function (header) {
          return header.getAttribute('data-action-section');
        });
      })).toEqual(['focus', 'deeds', 'personal', 'ruler']);

    const direct = page.locator(
      '#tab-actions [data-action-group-body="deeds"]');
    for (const id of [
      'seek_blessing', 'give_alms', 'raid_expedition'
    ]) {
      await expect(direct.locator('[data-action-id="' + id + '"]'))
        .toBeVisible();
    }
    await page.locator('#tab-actions [data-action-group="personal"]').click();
    await expect(page.locator(
      '#tab-actions [data-action-group-body="personal"] ' +
      '[data-action-id="poach"]')).toBeVisible();
    await expect(page.locator(
      '#tab-actions [data-action-group-body="personal"] ' +
      '[data-action-id="go_to_town"]')).toBeVisible();
    await page.locator('#tab-actions [data-action-group="ruler"]').click();
    const ruler = page.locator(
      '#tab-actions [data-action-group-body="ruler"]');
    for (const id of ['declare_war', 'adopt_tech', 'foreign_policy']) {
      await expect(ruler.locator('[data-action-id="' + id + '"]'))
        .toBeVisible();
    }

    await page.reload({ waitUntil:'domcontentloaded' });
    await prepareGameContent(page);
    await expect.poll(function () {
      return page.evaluate(function () {
        return !!(window.FB && FB.game && FB.game.bootReady && FB.ui);
      });
    }).toBe(true);
    await page.evaluate(function () { FB.ui.showSettings(); });
    await expect(page.getByRole('checkbox', {
      name:'Group Deeds by action type'
    })).toBeChecked();
  });

test('event toasts dismiss in place unless Settings enables Chronicle navigation',
  async function ({ page }) {
    await startDeterministicGame(page);
    const beforeLog = await page.evaluate(function () {
      FB.ui.showTab('actions', { history:false });
      FB.ui.eventReceiptToast({
        title:FB.msg('news.e2e.toast.title', 'A Result'),
        option:FB.msg('news.e2e.toast.option', 'Continue.'),
        outcome:FB.msg('news.e2e.toast.outcome', 'The matter is settled.'),
        impacts:[]
      });
      return FB.state.log.length;
    });
    const firstToast = page.locator('.event-receipt-toast');
    await expect(firstToast).toHaveAttribute('title', 'Dismiss');
    await firstToast.click();
    await expect(firstToast).toHaveCount(0);
    await expect(page.locator('.tab[data-tab="actions"]')).toHaveClass(/active/);
    expect(await page.evaluate(function () { return FB.state.log.length; }))
      .toBe(beforeLog);

    await page.evaluate(function () { FB.ui.showSettings(); });
    const redirect = page.getByRole('checkbox', {
      name:'Open Chronicle when dismissing event toasts'
    });
    await expect(redirect).not.toBeChecked();
    const setting = page.locator('.settings-detail-toggle', { has:redirect });
    await setting.hover();
    await expect(page.locator('#tooltip'))
      .toContainText('always recorded in the Chronicle');
    await redirect.check();
    await expect.poll(function () {
      return page.evaluate(function () {
        return {
          preference:FB.game.uiPrefs.eventToastOpensChronicle,
          stored:JSON.parse(localStorage.getItem('fb_ui'))
            .eventToastOpensChronicle
        };
      });
    }).toEqual({ preference:true, stored:true });

    await page.evaluate(function () {
      FB.ui.closeModal();
      FB.ui.showTab('actions', { history:false });
      FB.ui.eventReceiptToast({
        title:FB.msg('news.e2e.toast.title', 'A Result'),
        option:FB.msg('news.e2e.toast.option', 'Continue.'),
        outcome:FB.msg('news.e2e.toast.outcome', 'The matter is settled.'),
        impacts:[]
      });
    });
    const secondToast = page.locator('.event-receipt-toast');
    await expect(secondToast)
      .toHaveAttribute('title', 'Open Choices in the Chronicle');
    await secondToast.click();
    await expect(page.locator('.tab[data-tab="log"]')).toHaveClass(/active/);

    await page.setViewportSize({ width:390, height:844 });
    await page.evaluate(function () { FB.ui.showSettings(); });
    const compactSetting = page.locator('.settings-detail-toggle', {
      has:page.getByRole('checkbox', {
        name:'Open Chronicle when dismissing event toasts'
      })
    });
    const info = compactSetting.locator('.settcard-info');
    await expect(info).toBeVisible();
    await info.click();
    await expect(compactSetting.locator('.settings-detail-toggle-details'))
      .toBeVisible();
    await expect(compactSetting.locator('.settings-detail-toggle-details'))
      .toContainText('always recorded in the Chronicle');
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
    await expect(page.locator('#tab-actions [data-campaign-open]')).toContainText('0/1');

    await page.evaluate(function () {
      const sentinel = document.createElement('i');
      sentinel.id = 'deeds-drag-sentinel';
      document.getElementById('tab-actions').appendChild(sentinel);
      FB.map.pointers.panel_drag = [0, 0];
      FB.playerHost(FB.state).supply = 81;
      const war = FB.realmWars(FB.state, 'player')[0];
      war.occupations[war.target] = { occupied:true };
      FB.ui.refresh();
    });
    await page.evaluate(function () {
      return new Promise(function (resolve) {
        requestAnimationFrame(function () { requestAnimationFrame(resolve); });
      });
    });
    await expect(page.locator('#deeds-drag-sentinel')).toHaveCount(1);
    await expect(page.locator('#tab-actions [data-campaign-open]')).toContainText('0/1');

    await page.evaluate(function () {
      delete FB.map.pointers.panel_drag;
      FB.ui.flushMapInteractionRefresh();
    });
    await expect(page.locator('#deeds-drag-sentinel')).toHaveCount(0);
    await expect(page.locator('#tab-actions [data-campaign-open]')).toContainText('1/1');

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

