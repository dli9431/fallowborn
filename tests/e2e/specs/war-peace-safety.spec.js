'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'data/events_war.js', 'js/events.js', 'js/world.js', 'js/armies.js',
  'js/ui_modals.js', 'js/ui_misc.js', 'js/keys.js',
  'js/messages.js', 'js/portrait.js', 'css/style.css'
]);
const { test, expect } = require('../support/fixture');
const { startWarSafety } = require('../support/game/war-safety');

async function ready(page) {
  await expect.poll(function () {
    return page.evaluate(function () { return FB.ui.eventInputGuarded(); });
  }).toBe(false);
}
async function openPeace(page, id, defending) {
  return page.evaluate(function (args) {
    const s = FB.state;
    s.player.war.defending = args.defending;
    const event = FB.queueWarEvent(s, args.id, {});
    s.eventQueue = [];
    FB.ui.runEvents([event]);
    return { gold:s.player.gold, prestige:s.player.prestige, rng:FB.getRngState() };
  }, { id:id, defending:defending });
}
const choices = [
  ['war_tribute_offer', 'Take the tribute.', false],
  ['war_council', 'Seek terms.', false],
  ['war_council', 'Seek terms.', true],
  ['war_negotiated_withdrawal', 'Negotiate the withdrawal.', false],
  ['war_submission_offer', 'Bend the knee.', true],
  ['war_submission_offer', 'Buy the peace with heavy tribute.', true]
];
for (const touch of [false, true]) {
  test.describe(touch ? 'touch peace' : 'desktop peace', function () {
    test.use({ hasTouch:touch, viewport:{ width:390, height:844 } });
    for (const [id, label, defending] of choices) {
      test(id + ' / ' + label + ' / ' + defending, async function ({ page }, testInfo) {
        await startWarSafety(page, testInfo);
        const before = await openPeace(page, id, defending);
        const terms = await page.evaluate(function (args) {
          const event = FB.eventById(args.id);
          const option = event.options.find(function (o) { return o.label === args.label; });
          return FB.warPeaceTerms(FB.state, option.effects.custom);
        }, { id:id, label:label });
        await expect(page.locator('#eventmodal')).toBeFocused();
        await ready(page);
        const option = page.locator('#ev-options').getByRole('button', { name:label, exact:false });
        if (touch) await option.tap(); else await option.click();
        await expect(page.locator('#war-peace-confirm')).toBeVisible();
        await expect(page.locator('#ev-text')).toContainText('Gold change:');
        await page.evaluate(function () { document.getElementById('war-peace-confirm').click(); });
        expect(await page.evaluate(function () { return !!FB.state.player.war; })).toBe(true);
        await page.keyboard.press('Escape');
        await expect(option).toBeVisible();
        expect(await page.evaluate(function () {
          return { gold:FB.state.player.gold, prestige:FB.state.player.prestige, rng:FB.getRngState() };
        })).toEqual(before);
        await ready(page);
        await option.click();
        await ready(page);
        await page.locator('#war-peace-confirm').click();
        expect(await page.evaluate(function () { return FB.state.player.war; })).toBeNull();
        expect(await page.evaluate(function () { return FB.state.player.gold; })).toBe(before.gold + terms.gold);
        expect(await page.evaluate(function () { return FB.state.player.prestige; })).toBe(before.prestige + terms.prestige);
        expect(await page.evaluate(function () { return Object.keys(FB.state.truces).length; })).toBe(1);
        await expect(page.locator('#outcome-continue')).toBeVisible();
        await expect(page.locator('#ev-text')).toContainText('war');
        await expect(page.locator('#ev-text canvas.pface').first()).toBeVisible();
        const settled = await page.evaluate(function () {
          return { gold:FB.state.player.gold, prestige:FB.state.player.prestige,
            choices:FB.state.log.filter(function (e) { return !!e.receipt; }).length };
        });
        await ready(page);
        await page.locator('#outcome-continue').click();
        expect(await page.evaluate(function () {
          return { gold:FB.state.player.gold, prestige:FB.state.player.prestige,
            choices:FB.state.log.filter(function (e) { return !!e.receipt; }).length };
        })).toEqual(settled);
      });
    }
  });
}

test('held activation keys cannot cross a confirmation and stale wars cannot resolve',
  async function ({ page }, testInfo) {
    await startWarSafety(page, testInfo);
    await openPeace(page, 'war_tribute_offer', false);
    await ready(page);
    await page.keyboard.down('1');
    await expect(page.locator('#war-peace-confirm')).toBeVisible();
    await ready(page);
    await page.keyboard.down('1');
    expect(await page.evaluate(function () { return !!FB.state.player.war; })).toBe(true);
    await page.keyboard.up('1');
    await page.evaluate(function () {
      FB.state.player.war = Object.assign({}, FB.state.player.war, { wins:0 });
    });
    await page.keyboard.press('Tab');
    await page.keyboard.press('Enter');
    expect(await page.evaluate(function () { return FB.state.player.gold; })).toBe(500);
    await expect(page.locator('#war-peace-confirm')).toHaveCount(0);
  });

test('category automation shows voluntary peace while Resolve everything may resolve it',
  async function ({ page }, testInfo) {
    await startWarSafety(page, testInfo);
    await page.evaluate(function () { FB.game.auto.war = true; FB.game.auto.major = true; });
    await openPeace(page, 'war_tribute_offer', false);
    await expect(page.locator('#eventmodal')).toBeVisible();
    await ready(page);
    await page.locator('#ev-options .evopt').nth(1).click();
    await page.evaluate(function () {
      FB.game.setPaused(true);
      FB.game.auto.all = true;
      const item = FB.queueWarEvent(FB.state, 'war_council', {});
      FB.state.eventQueue = [];
      FB.ui.runEvents([item]);
    });
    await expect(page.locator('#eventmodal')).toBeHidden();
  });
