'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, ['js/ui_panels.js', 'js/armies.js', 'js/main.js',
  'js/holywar.js', 'js/wars.js', 'js/logistics.js', 'data/map_data.js']);
const { test, expect } = require('../support/fixture');
const { startWarSafety } = require('../support/game/war-safety');

[
  { name:'desktop', width:1505, height:900, keyboard:true },
  { name:'mobile', width:390, height:844, keyboard:false }
].forEach(function (viewport) {
  test('Land de-muster returns troops and consumes one day on ' + viewport.name,
    async function ({ page }, testInfo) {
      await page.setViewportSize({ width:viewport.width, height:viewport.height });
      await startWarSafety(page, testInfo);
      const before = await page.evaluate(function () {
        const s = FB.state, host = FB.playerHost(s);
        host.path = []; host.goal = null; host.moveLeft = 0;
        host.at = s.player.provinceId;
        s.date.day = 20;
        s.eventQueue = []; s.slotDays = [];
        FB.selectArmy(host.id);
        FB.ui.showTab('prov'); FB.ui.refresh();
        return { id:host.id, turn:s.turn, men:FB.demusterPreview(s).men,
          rearm:FBDATA.balance.armyRearmDays };
      });
      const button = page.locator('#btn-host-demuster');
      await expect(page.locator('#btn-host-split + #btn-host-demuster')).toBeVisible();
      await expect(button).toBeEnabled();
      await expect(button).toContainText(String(before.men));
      await expect(button).toContainText(String(before.rearm) + ' days');
      await expect(button).toContainText('Takes 1 day');
      if (viewport.keyboard) await button.press('Enter');
      else await button.click();
      const after = await page.evaluate(function (id) {
        const s = FB.state;
        const pool = s.player.war.musterPool;
        return { present:s.armies.some(function (a) { return a.id === id; }),
          turn:s.turn, down:s.armyDown.player,
          men:Object.keys(pool).reduce(function (sum, key) { return sum + pool[key]; }, 0) };
      }, before.id);
      expect(after.present).toBe(false);
      expect(after.turn).toBe(before.turn + 1);
      expect(after.down).toBe(before.turn);
      expect(after.men).toBe(before.men);
      await expect(button).toHaveCount(0);
    });
});

test('Land de-muster blocks detachments, vows and stale primary-host selection', async function ({ page }, testInfo) {
  await startWarSafety(page, testInfo);
  await page.evaluate(function () {
    const s = FB.state, host = FB.playerHost(s);
    host.path = []; host.goal = null; host.moveLeft = 0;
    host.men = 1000; host.units = { levy:1000 }; host.size = 1000;
    const detachment = FB.splitHost(s, host);
    FB.selectArmy(detachment.id); FB.ui.showTab('prov'); FB.ui.refresh();
  });
  const button = page.locator('#btn-host-demuster');
  await expect(button).toBeDisabled();
  await expect(button).toContainText('primary host');
  await page.evaluate(function () {
    const s = FB.state;
    FB.selectArmy(FB.playerHost(s).id); FB.ui.refresh();
  });
  await expect(button).toBeEnabled();
  const before = await page.evaluate(function () {
    const s = FB.state, primary = FB.playerHost(s);
    const other = s.armies.find(function (a) { return a.realm === 'player' && a !== primary; });
    other.men += 1000; other.units.levy += 1000;
    return { turn:s.turn, count:s.armies.length };
  });
  // The rendered button refers to the old primary: it must not dismiss the new one.
  await button.click();
  expect(await page.evaluate(function () { return { turn:FB.state.turn, count:FB.state.armies.length }; })).toEqual(before);
  await page.evaluate(function () {
    FB.playerGreatHolyWarHostActive = function () { return true; };
    FB.selectArmy(FB.playerHost(FB.state).id); FB.ui.refresh();
  });
  await expect(button).toBeDisabled();
  await expect(button).toContainText('holy-war vow');
});

test('foreign-ground preview shows losses and foreign hosts have no de-muster control', async function ({ page }, testInfo) {
  await startWarSafety(page, testInfo);
  await page.evaluate(function () {
    const s = FB.state, host = FB.playerHost(s);
    host.at = s.realms[s.player.war.enemy].capital;
    FB.selectArmy(host.id); FB.ui.showTab('prov'); FB.ui.refresh();
  });
  await expect(page.locator('#btn-host-demuster')).toContainText('0 men return');
  await page.evaluate(function () {
    const s = FB.state, host = FB.playerHost(s);
    host.realm = s.player.war.enemy;
    FB.ui.refresh();
  });
  await expect(page.locator('#btn-host-demuster')).toHaveCount(0);
});
