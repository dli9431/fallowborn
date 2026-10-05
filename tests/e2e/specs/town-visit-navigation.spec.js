'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'js/actions.js', 'js/events.js', 'js/main.js', 'js/world.js',
  'js/ui_misc.js', 'js/ui_modals.js', 'js/keys.js',
  'data/actions.js', 'data/events_common.js', 'css/style.css'
]);

const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { startDeterministicGame } = require('../support/game/start');

async function outingState(page) {
  return page.evaluate(function () {
    const s = FB.state;
    return {
      turn:s.turn, gold:s.player.gold, piety:s.player.piety,
      prestige:s.player.prestige, rng:FB.getRngState(),
      queue:JSON.stringify(s.eventQueue), cooldown:s.player.cooldowns.go_to_town,
      deed:!!s.player.flags.tut_deed, event:!!s.player.flags.tut_event
    };
  });
}

[
  { name:'desktop Back', mobile:false, route:'button' },
  { name:'desktop Escape', mobile:false, route:'escape' },
  { name:'mobile browser Back', mobile:true, route:'browser' }
].forEach(function (journey) {
  test(journey.name + ' restores the town list without committing an outing',
    async function ({ page }, testInfo) {
      await page.setViewportSize(journey.mobile
        ? { width:390, height:600 } : { width:1100, height:600 });
      await openGame(page, testInfo);
      await startDeterministicGame(page, { keepTutorial:true });
      // A long county list makes scroll restoration observable without changing
      // the universal fixture or requiring a particular historical layout.
      await page.evaluate(function () {
        const original = FB.settlementsOf;
        FB.settlementsOf = function (s, pid) {
          const list = original(s, pid);
          if (pid !== s.player.provinceId) return list;
          const out = [];
          for (let i = 0; i < 18; i++) {
            out.push(Object.assign({}, list[0], {
              name:'Outing destination ' + i,
              kind:['village', 'town', 'city'][i % 3]
            }));
          }
          return out;
        };
      });
      const before = await outingState(page);
      await page.locator('[data-action-id="go_to_town"]').click();
      const provisional = await outingState(page);

      for (const kind of ['village', 'town', 'city']) {
        const destination = page.locator('[data-visit][data-kind="' + kind + '"]').last();
        await destination.focus();
        await destination.scrollIntoViewIfNeeded();
        const scroll = await page.locator('#gm-body').evaluate(function (body) {
          return body.scrollTop;
        });
        expect(scroll).toBeGreaterThan(0);
        await destination.click();
        await expect(page.locator('[data-settlement-option]').first()).toBeVisible();
        await expect(page.locator('.gm-footer').getByRole('button', {
          name:'Back', exact:true
        })).toBeEnabled();
        await expect(page.locator('.gm-footer').getByRole('button', {
          name:'Close', exact:true
        })).toBeEnabled();
        expect(await outingState(page)).toEqual(provisional);

        if (journey.route === 'escape') await page.keyboard.press('Escape');
        else if (journey.route === 'browser') await page.evaluate(function () { history.back(); });
        else await page.locator('.gm-footer').getByRole('button', {
          name:'Back', exact:true
        }).click();

        await expect(page.locator('#gm-title')).toHaveText('Where To?');
        await expect(destination).toBeFocused();
        await expect.poll(function () {
          return page.locator('#gm-body').evaluate(function (body) { return body.scrollTop; });
        }).toBe(scroll);
        expect(await outingState(page)).toEqual(provisional);
      }

      // Close from the nested view exits the whole flow and clears its cooldown.
      await page.locator('[data-visit][data-kind="city"]').last().click();
      await page.locator('.gm-footer').getByRole('button', {
        name:'Close', exact:true
      }).click();
      await expect(page.locator('#genmodal')).toHaveClass(/hidden/);
      await expect(page.locator('[data-action-id="go_to_town"]')).toBeEnabled();
      expect(await outingState(page)).toEqual(before);
    });
});

test('choosing an outing activity spends one day and resolves that option once',
  async function ({ page }, testInfo) {
    await openGame(page, testInfo);
    await startDeterministicGame(page, { keepTutorial:true });
    await page.evaluate(function () {
      FB.state.eventQueue = [];
      FB.state.slotDays = [];
      FB.game.auto.all = true;
      FB.game.uiPrefs.autoResumeAfterEvents = false;
    });
    const before = await outingState(page);
    await page.locator('[data-action-id="go_to_town"]').click();
    const town = page.locator('[data-visit][data-kind="town"]').first();
    await expect(town).toBeVisible();
    await town.click();
    await expect(page.locator('#eventmodal')).toHaveClass(/hidden/);
    // This authored town option grants three piety, unlike its other activities.
    await page.locator('[data-settlement-option="4"]').click();
    await expect(page.locator('#genmodal')).toHaveClass(/hidden/);
    await expect(page.locator('#eventmodal')).toHaveClass(/hidden/);
    const after = await outingState(page);
    expect(after.turn).toBe(before.turn + 1);
    expect(after.piety).toBe(before.piety + 3);
    expect(after.deed).toBe(true);
    expect(after.event).toBe(true);
    expect(typeof after.cooldown).toBe('number');
    expect(await page.evaluate(function () {
      return FB.state.eventQueue.filter(function (item) {
        return /^visit_/.test(item.id);
      }).length;
    })).toBe(0);
  });
