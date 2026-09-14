'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, ['data/events_war.js', 'js/ui_modals.js',
  'js/ui_misc.js', 'js/i18n.js', 'js/events.js', 'js/wars.js', 'css/style.css']);
const { test, expect } = require('../support/fixture');
const { startWarSafety } = require('../support/game/war-safety');

for (const compact of [false, true]) {
  test('war instructions use ' + (compact ? 'a compact disclosure' : 'a hover and focus tooltip'),
    async function ({ page }, testInfo) {
      await page.setViewportSize(compact ? { width:390, height:844 } : { width:1280, height:900 });
      await startWarSafety(page, testInfo);
      const result = await page.evaluate(function () {
        const s = FB.state, ev = FB.eventById('war_muster');
        const ctx = FB.warEventContext(s, {});
        const explanation = FB.eventText(s, s.player.charId, ev, 'desc', ctx);
        const narrative = FB.eventText(s, s.player.charId, ev, 'text', ctx);
        FB.ui.runEvents([{ id:ev.id, ctx:ctx }]);
        return { narrative:narrative, explanation:explanation };
      });
      expect(result.narrative).not.toContain('move a host');
      expect(result.explanation).toContain('move a host');
      expect(result.explanation).not.toContain('{target}');
      const card = page.locator('[data-event-background]');
      const details = page.locator('#event-background-details');
      await expect(card).toBeVisible();
      await expect(details).toBeHidden();
      await expect(page.locator('#ev-options')).toContainText('Use the current muster');
      if (compact) {
        const button = card.locator('.settcard-info');
        await button.click();
        await expect(button).toHaveAttribute('aria-expanded', 'true');
        await expect(details).toBeVisible();
        await expect(details).toHaveText(result.explanation);
        await button.focus();
        await page.keyboard.press('Enter');
        await expect(details).toBeHidden();
        await expect(button).toHaveAttribute('aria-expanded', 'false');
      } else {
        await card.hover();
        await expect(page.locator('#tooltip')).toBeVisible();
        await expect(page.locator('#tooltip')).toContainText(result.explanation);
        await page.mouse.move(0, 0);
        await card.focus();
        await expect(page.locator('#tooltip')).toBeVisible();
        await expect(page.locator('#tooltip')).toContainText(result.explanation);
        await expect(details).toBeHidden();
      }
      const prose = await page.evaluate(function () {
        return ['war_muster', 'war_enforcement_defense', 'war_grain_seller'].map(function (id) {
          const ev = FB.eventById(id);
          return { text:ev.text, desc:ev.desc };
        });
      });
      expect(prose.every(function (ev) { return !!ev.desc; })).toBe(true);
      expect(prose[1].text).not.toContain('50 prestige');
      expect(prose[1].desc).toContain('50 prestige');
      expect(prose[2].text).not.toContain('refill');
      expect(prose[2].desc).toContain('refills');
    });
}
