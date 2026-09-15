'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'js/ui_modals.js', 'js/ui_misc.js', 'js/main.js', 'js/armies.js', 'css/style.css'
]);
const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { startDeterministicGame } = require('../support/game/start');

[
  { name:'desktop', width:1505, height:900 },
  { name:'mobile', width:390, height:844 }
].forEach(function (viewport) {
  test('army control explains each mode on ' + viewport.name, async function ({ page }, testInfo) {
    await page.setViewportSize({ width:viewport.width, height:viewport.height });
    await openGame(page, testInfo);
    await startDeterministicGame(page);
    await page.evaluate(function () {
      FB.game.setPaused(true);
      FB.state.player.tier = 4;
      FB.game.auto.hosts = 'manual';
      FB.ui.showAutoResolve();
    });
    const modes = [
      { value:'manual', label:'You give orders', detail:'Forced retreats still happen' },
      { value:'def', label:'Auto: defend your lands', detail:'They do not seek enemy war targets' },
      { value:'off', label:'Auto: attack war targets', detail:'Choice preference controls how much risk' }
    ];
    for (const mode of modes) {
      const radio = page.getByRole('radio', { name:mode.label, exact:true });
      await expect(radio).toBeVisible();
      if (viewport.name === 'desktop') {
        await radio.focus();
        await expect(page.locator('#tooltip')).toBeVisible();
        await expect(page.locator('#tooltip')).toContainText(mode.detail);
      } else {
        const info = page.locator('[aria-controls="ar-hosts-' + mode.value + '-details"]');
        await info.click();
        await expect(info).toHaveAttribute('aria-expanded', 'true');
        await expect(page.locator('#ar-hosts-' + mode.value + '-details')).toBeVisible();
        await expect(page.locator('#ar-hosts-' + mode.value + '-details')).toContainText(mode.detail);
        // Reading details must never select an army mode.
        expect(await page.evaluate(function () { return FB.game.auto.hosts; })).toBe('manual');
        await info.click();
      }
    }
    for (const mode of [modes[1], modes[2], modes[0]]) {
      await page.getByRole('radio', { name:mode.label, exact:true }).check();
      expect(await page.evaluate(function () { return FB.game.auto.hosts; })).toBe(mode.value);
    }
    await page.locator('#ar-close').click();
    await page.evaluate(function () { FB.ui.showAutoResolve(); });
    await expect(page.getByRole('radio', { name:'You give orders', exact:true })).toBeChecked();
  });
});
