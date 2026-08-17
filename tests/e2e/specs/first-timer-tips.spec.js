'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'js/main.js',
  'js/ui_misc.js',
  'js/ui_modals.js',
  'js/save.js',
  'js/actions.js',
  'css/style.css'
]);

const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { startDeterministicGame } = require('../support/game/start');
const { openMenu, waitForUiRefresh } = require('../support/game/ui');

test.beforeEach(async function ({ page }, testInfo) {
  await openGame(page, testInfo);
});

test('the first-time drip teaches in order and records each tip once',
  async function ({ page }, testInfo) {
    await startDeterministicGame(page);
    const coach = page.locator('.coachmark');

    // one drip per natural day: the first call teaches the game controls,
    // pointing at the menu button it speaks of
    expect(await page.evaluate(function () { return FB.ui.dailyTip(); }))
      .toBe(true);
    await expect(coach).toHaveCount(1);
    await expect(coach).toContainText('game controls live in the Settings');
    await expect(page.locator('#btn-menu')).toHaveClass(/coachmark-lit/);

    // the next natural day's lesson queues behind the open one — lessons
    // neither stack nor fade before they are read
    expect(await page.evaluate(function () { return FB.ui.dailyTip(); }))
      .toBe(true);
    await expect(coach).toHaveCount(1);
    await expect(coach).toContainText('game controls live in the Settings');

    // dismissing the open lesson brings the queued one up
    await page.getByRole('button', { name:'Got it', exact:true }).click();
    await expect(coach).toContainText('How to play');
    await expect(page.locator('.coachmark', {
      hasText: 'game controls live in the Settings'
    })).toHaveCount(0);

    // a later day teaches the next tip — never an already-seen one again
    expect(await page.evaluate(function () { return FB.ui.dailyTip(); }))
      .toBe(true);
    await page.getByRole('button', { name:'Got it', exact:true }).click();
    await expect(coach).toContainText('runs the game one day at a time');

    const seen = await page.evaluate(function () {
      return {
        seen: FB.game.uiPrefs.tipsSeen,
        stored: JSON.parse(localStorage.getItem('fb_ui') || '{}').tipsSeen
      };
    });
    expect(seen.seen['drip-controls']).toBe(1);
    expect(seen.seen['drip-guide']).toBe(1);
    if (testInfo.project.name.endsWith('-served')) {
      expect(seen.stored['drip-controls']).toBe(1);
      expect(seen.stored['drip-guide']).toBe(1);
    }
  });

test('a coachmark points at the control it teaches and waits to be read',
  async function ({ page }) {
    await startDeterministicGame(page);
    expect(await page.evaluate(function () { return FB.ui.dailyTip(); }))
      .toBe(true);
    const coach = page.locator('.coachmark');
    await expect(coach).toBeVisible();

    // the menu button sits at the top of the screen, so the lesson opens
    // beneath it with the arrow on top, roughly centered on the button
    await expect(coach).toHaveClass(/arrow-top/);
    const geo = await page.evaluate(function () {
      const c = document.querySelector('.coachmark').getBoundingClientRect();
      const t = document.querySelector('#btn-menu').getBoundingClientRect();
      return { coachTop:c.top, targetBottom:t.bottom,
        coachMid:c.left + c.width / 2, targetMid:t.left + t.width / 2 };
    });
    expect(geo.coachTop).toBeGreaterThanOrEqual(geo.targetBottom);
    expect(Math.abs(geo.coachMid - geo.targetMid)).toBeLessThan(180);

    // no toast-style fade: the lesson rides out a full UI refresh, and only
    // its dismiss button clears it (and the target's highlight)
    await page.evaluate(function () { FB.ui.refresh(); });
    await waitForUiRefresh(page);
    await expect(coach).toBeVisible();
    await page.getByRole('button', { name:'Got it', exact:true }).click();
    await expect(page.locator('.coachmark')).toHaveCount(0);
    await expect(page.locator('#btn-menu')).not.toHaveClass(/coachmark-lit/);
  });

test('a lesson stills the days while it is read',
  async function ({ page }) {
    await startDeterministicGame(page);
    const coach = page.locator('.coachmark');

    // the first unpause teaches the time controls — and holds the days still
    await page.evaluate(function () { FB.game.setPaused(false); });
    await expect(coach).toContainText('days now flow');
    expect(await page.evaluate(function () { return FB.game.paused; }))
      .toBe(true);
    await page.getByRole('button', { name:'Got it', exact:true }).click();

    // unpaused again (that lesson is spent), the days run...
    await page.evaluate(function () { FB.game.setPaused(false); });
    expect(await page.evaluate(function () { return FB.game.paused; }))
      .toBe(false);
    await expect(page.locator('.coachmark')).toHaveCount(0);

    // ...until the next lesson pops, which stills them again
    expect(await page.evaluate(function () { return FB.ui.dailyTip(); }))
      .toBe(true);
    await expect(coach).toContainText('game controls live in the Settings');
    expect(await page.evaluate(function () { return FB.game.paused; }))
      .toBe(true);
  });

test('an F-skip burst breaks when a lesson pops mid-skip',
  async function ({ page }) {
    await startDeterministicGame(page);
    const outcome = await page.evaluate(function () {
      // spend the one-time time-flow lesson, then run the days again
      FB.game.setPaused(false);
      document.querySelector('.coachmark-dismiss').click();
      FB.game.setPaused(false);
      const startTurn = FB.state.turn;
      // a lesson arriving on a plain day, fired through the real coachmark
      // layer from a wrapped daily tick
      const passDay = FB.game.passDay;
      let fired = false;
      FB.game.passDay = function () {
        const r = passDay.apply(this, arguments);
        if (!fired && r === 'day') {
          fired = true;
          FB.ui.maybeTip('spec-skip-lesson', '💡 spec lesson', '#btn-menu');
        }
        return r;
      };
      FB.game.skipAhead();
      FB.game.passDay = passDay;
      return { startTurn:startTurn, endTurn:FB.state.turn,
        fired:fired, paused:FB.game.paused,
        coach:!!document.querySelector('.coachmark') };
    });
    expect(outcome.fired).toBe(true);
    expect(outcome.paused).toBe(true);
    expect(outcome.coach).toBe(true);
    // the burst stopped on the lesson instead of burning on to a happening
    expect(outcome.endTurn - outcome.startTurn).toBeLessThan(10);
  });

test('Next pages to the next lesson once the lit control had its touch',
  async function ({ page }) {
    await startDeterministicGame(page);
    const coach = page.locator('.coachmark');
    const next = page.getByRole('button', { name:'Next', exact:true });

    expect(await page.evaluate(function () { return FB.ui.dailyTip(); }))
      .toBe(true);
    await expect(coach).toContainText('game controls live in the Settings');
    await expect(page.locator('#btn-menu')).toHaveClass(/coachmark-lit/);
    await expect(next).toBeDisabled();

    // every hint has a Back button with a stop behind it — the first drip
    // lesson rewinds to the tour's first stop, the map lesson
    await page.locator('.coachmark-back').click();
    await expect(coach).toContainText('Drag to pan');
    await expect(page.locator('#mapwrap')).toHaveClass(/coachmark-lit/);
    await expect(page.locator('.coachmark-back')).toHaveCount(0); // stop zero
    await page.locator('#mapwrap').dispatchEvent('pointerdown'); // its touch
    await expect(next).toBeEnabled();
    await next.click();
    await expect(coach).toContainText('game controls live in the Settings');

    // Next stays shut until the lit control is touched
    await expect(next).toBeDisabled();
    await page.locator('#btn-menu').click(); // the menu sheet opens
    // ...and the lesson floats above the sheet, at the ⚙ Settings button,
    // with its over-sheet text
    await expect(page.locator('#m-settings')).toHaveClass(/coachmark-lit/);
    await expect(coach).toContainText('Settings holds the game controls');
    await expect(next).toBeEnabled();

    // no waiting for the next natural day — the tour walks on above the
    // open sheet (a desktop sheet stays up) to the Guide button
    await next.click();
    await expect(page.locator('#m-help')).toHaveClass(/coachmark-lit/);
    await expect(coach).toContainText('How to play');
    await expect(next).toBeEnabled();

    // the pace lesson lives outside the sheet: Next from the Guide lesson
    // closes the sheet itself and hands it the screen — and it asks for no
    // touch, since unpausing could pop an event and break the tour
    await next.click();
    await expect(page.locator('#genmodal')).toHaveClass(/hidden/);
    await expect(coach).toContainText('runs the game one day at a time');
    await expect(page.locator('#timebtns')).toHaveClass(/coachmark-lit/);
    await expect(next).toBeEnabled();

    await next.click();
    await expect(coach).toContainText('Deeds tab');
    await expect(page.locator('#sidetabs .tab[data-tab="actions"]'))
      .toHaveClass(/coachmark-lit/);
    await expect(next).toBeDisabled(); // a new lesson wants its own touch

    // the Deeds pane is open by default, so using it counts as the touch:
    // scrolling it (a wheel over the pane) arms Next without tapping the tab
    await page.locator('#tab-actions').dispatchEvent('wheel');
    await expect(next).toBeEnabled();

    // the buttons line up Got it, Back, Next — and Back rewinds one lesson
    const order = await page.evaluate(function () {
      const row = document.querySelector('.coachmark-actions');
      return Array.prototype.map.call(row.children, function (b) {
        return b.className;
      });
    });
    expect(order).toEqual([
      'btn small coachmark-dismiss',
      'btn small coachmark-back',
      'btn small coachmark-next'
    ]);
    await page.locator('.coachmark-back').click();
    await expect(coach).toContainText('runs the game one day at a time');
    await expect(next).toBeEnabled(); // still the free pace lesson

    // Back from the pace lesson reopens the menu sheet and points at
    // ❓ How to play in it — on the desktop sheet as on the phone one
    await page.locator('.coachmark-back').click();
    await expect(page.locator('#genmodal')).not.toHaveClass(/hidden/);
    await expect(page.locator('#m-help')).toHaveClass(/coachmark-lit/);
    await expect(coach).toContainText('How to play');

    // and the tour walks forward again from the sheet: Next closes it and
    // the pace lesson takes the screen
    await next.click();
    await expect(page.locator('#genmodal')).toHaveClass(/hidden/);
    await expect(coach).toContainText('runs the game one day at a time');
    await next.click();
    await expect(coach).toContainText('Deeds tab');

    // paged lessons are recorded, so the daily drip never re-teaches them
    const seen = await page.evaluate(function () {
      return FB.game.uiPrefs.tipsSeen;
    });
    expect(seen['drip-controls']).toBe(1);
    expect(seen['drip-guide']).toBe(1);
    expect(seen['drip-speed']).toBe(1);
  });

test('a drawer-bound tab aims its lesson at the portrait on small screens',
  async function ({ page }) {
    await startDeterministicGame(page);
    await page.setViewportSize({ width:390, height:844 }); // phone layout

    expect(await page.evaluate(function () {
      return FB.ui.maybeTip('drip-self',
        '💡 spec self lesson', '#lefttabs .tab[data-tab="char"]');
    })).toBe(true);
    const coach = page.locator('.coachmark');
    await expect(coach).toContainText('spec self lesson');
    // the Self tab sits in the closed drawer, so the lesson points at the
    // portrait that exposes it
    await expect(page.locator('#tb-portrait')).toHaveClass(/coachmark-lit/);
    await expect(page.locator('#lefttabs .tab[data-tab="char"]'))
      .not.toHaveClass(/coachmark-lit/);

    // the portrait touch opens the drawer and arms Next
    const next = page.getByRole('button', { name:'Next', exact:true });
    await expect(next).toBeDisabled();
    await page.locator('#tb-portrait').click();
    await expect(page.locator('body')).toHaveClass(/showself/);
    await expect(next).toBeEnabled();

    // Next keeps the drawer open: the Kin lesson points at the exposed tab
    await next.click();
    await expect(page.locator('body')).toHaveClass(/showself/);
    await expect(coach).toContainText('Kin tab');
    await expect(page.locator('#lefttabs .tab[data-tab="family"]'))
      .toHaveClass(/coachmark-lit/);
  });

test('a desktop lesson counts its open pane or a hover as the touch',
  async function ({ page }) {
    await startDeterministicGame(page);
    const coach = page.locator('.coachmark');
    const next = page.getByRole('button', { name:'Next', exact:true });

    // the Self pane is open by default on desktop: scrolling it (a wheel
    // over the pane) is the touch, the tab itself need not be tapped
    expect(await page.evaluate(function () {
      return FB.ui.maybeTip('drip-self',
        '💡 spec self lesson', '#lefttabs .tab[data-tab="char"]');
    })).toBe(true);
    await expect(coach).toContainText('spec self lesson');
    await expect(next).toBeDisabled();
    await page.locator('#tab-char').dispatchEvent('wheel');
    await expect(next).toBeEnabled();
    await page.getByRole('button', { name:'Got it', exact:true }).click();

    // the top-bar lesson teaches the hover breakdowns, so the pointer
    // moving over the stats arms Next
    expect(await page.evaluate(function () {
      return FB.ui.maybeTip('drip-topbar',
        '💡 spec topbar lesson', '#tb-stats');
    })).toBe(true);
    await expect(coach).toContainText('spec topbar lesson');
    await expect(next).toBeDisabled();
    await page.locator('#tb-stats').dispatchEvent('pointerenter');
    await expect(next).toBeEnabled();
  });

test('the final lesson keeps a single right-side Got it',
  async function ({ page }) {
    await startDeterministicGame(page);
    // every orientation lesson but the last (corner notes) was already taught
    await page.evaluate(function () {
      const prefs = FB.game.uiPrefs;
      prefs.tipsSeen = prefs.tipsSeen || {};
      ['drip-controls', 'drip-guide', 'drip-speed', 'drip-deeds', 'drip-self',
        'drip-kin', 'drip-land', 'drip-network', 'drip-chronicle',
        'drip-topbar'].forEach(function (id) {
        prefs.tipsSeen[id] = 1;
      });
    });
    expect(await page.evaluate(function () { return FB.ui.dailyTip(); }))
      .toBe(true);
    const coach = page.locator('.coachmark');
    await expect(coach).toContainText('corner notes fade on their own');

    // no Next on the last stop: Back left of one right-side Got it
    await expect(page.getByRole('button', { name:'Next', exact:true }))
      .toHaveCount(0);
    const order = await page.evaluate(function () {
      const row = document.querySelector('.coachmark-actions');
      return Array.prototype.map.call(row.children, function (b) {
        return b.className;
      });
    });
    expect(order).toEqual([
      'btn small coachmark-back',
      'btn small coachmark-dismiss'
    ]);
    await page.getByRole('button', { name:'Got it', exact:true }).click();
    await expect(coach).toHaveCount(0);
  });

test('menu lessons chain above the sheet, closing it only when the tour leaves',
  async function ({ page }) {
    await startDeterministicGame(page);
    await page.setViewportSize({ width:390, height:844 }); // phone layout
    const coach = page.locator('.coachmark');
    const next = page.getByRole('button', { name:'Next', exact:true });

    // the controls lesson points at the menu button first, gated as usual
    expect(await page.evaluate(function () { return FB.ui.dailyTip(); }))
      .toBe(true);
    await expect(coach).toContainText('game controls live in the Settings');
    await expect(page.locator('#btn-menu')).toHaveClass(/coachmark-lit/);
    await expect(next).toBeDisabled();

    // opening the menu re-presents it above the sheet, at ⚙ Settings, with
    // its over-sheet text and a free Next (the touch already happened)
    await page.locator('#btn-menu').click();
    await expect(page.locator('#m-settings')).toBeVisible();
    await expect(page.locator('#m-settings')).toHaveClass(/coachmark-lit/);
    await expect(coach).toContainText('Settings holds the game controls');
    await expect(next).toBeEnabled();

    // Next chains above the open sheet to the Guide button — menu lessons
    // do not close the sheet between each other
    await next.click();
    await expect(page.locator('#genmodal')).not.toHaveClass(/hidden/);
    await expect(page.locator('#m-help')).toHaveClass(/coachmark-lit/);
    await expect(coach).toContainText('How to play');

    // the sheet closes only when the tour steps outside it (the pace lesson)
    await next.click();
    await expect(page.locator('#genmodal')).toHaveClass(/hidden/);
    await expect(coach).toContainText('runs the game one day at a time');
    await expect(page.locator('#timebtns')).toHaveClass(/coachmark-lit/);

    // the pace lesson sits above the bottom bar pointing down at it, never
    // covering the controls
    await expect(coach).toHaveClass(/arrow-bottom/);
    const paceGeo = await page.evaluate(function () {
      const c = document.querySelector('.coachmark').getBoundingClientRect();
      const t = document.querySelector('#timebtns').getBoundingClientRect();
      return { coachBottom:c.bottom, barTop:t.top };
    });
    expect(paceGeo.coachBottom).toBeLessThanOrEqual(paceGeo.barTop);

    // Back from it reopens the sheet and points at ❓ How to play
    await page.locator('.coachmark-back').click();
    await expect(page.locator('#genmodal')).not.toHaveClass(/hidden/);
    await expect(page.locator('#m-help')).toHaveClass(/coachmark-lit/);
    await expect(coach).toContainText('How to play');
    await page.getByRole('button', { name:'Got it', exact:true }).click();
    await page.evaluate(function () { FB.ui.closeModal(); });

    const seen = await page.evaluate(function () {
      return FB.game.uiPrefs.tipsSeen;
    });
    expect(seen['drip-controls']).toBe(1);
    expect(seen['drip-guide']).toBe(1);
    expect(seen['drip-speed']).toBe(1);
  });

test('a lesson waits out an open dialog instead of fighting it',
  async function ({ page }) {
    await startDeterministicGame(page);
    await openMenu(page);

    // fired while a dialog holds the screen: counted, but not shown yet —
    // not even by the refresh pump that would otherwise surface it
    expect(await page.evaluate(function () {
      return FB.ui.maybeTip('spec-land-lesson', '💡 spec land lesson',
        '#sidetabs .tab[data-tab="prov"]');
    })).toBe(true);
    await page.evaluate(function () { FB.ui.refresh(); });
    await waitForUiRefresh(page);
    await expect(page.locator('.coachmark')).toHaveCount(0);

    // closing the dialog hands the screen to the waiting lesson
    await page.evaluate(function () { FB.ui.closeModal(); });
    await expect(page.locator('#genmodal')).toHaveClass(/hidden/);
    const coach = page.locator('.coachmark');
    await expect(coach).toHaveCount(1);
    await expect(coach).toContainText('spec land lesson');
  });

test('a menu lesson fired under the open menu floats above the sheet',
  async function ({ page }) {
    await startDeterministicGame(page);
    await openMenu(page);

    // the controls lesson's home is the menu: it shows over the sheet at
    // ⚙ Settings rather than hiding beneath it
    expect(await page.evaluate(function () { return FB.ui.dailyTip(); }))
      .toBe(true);
    const coach = page.locator('.coachmark');
    await expect(coach).toHaveCount(1);
    await expect(coach).toContainText('Settings holds the game controls');
    await expect(page.locator('#m-settings')).toHaveClass(/coachmark-lit/);
    await expect(page.getByRole('button', { name:'Next', exact:true }))
      .toBeEnabled();
  });

test('fired tips stay fired across a reload and a continue',
  async function ({ page }, testInfo) {
    test.skip(testInfo.project.name !== 'chromium-served',
      'The storage contract belongs to the served origin.');
    await startDeterministicGame(page);
    expect(await page.evaluate(function () { return FB.ui.dailyTip(); }))
      .toBe(true);
    await expect(page.locator('.coachmark', {
      hasText: 'game controls live in the Settings'
    })).toHaveCount(1);

    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.locator('#title:not(.hidden)')).toBeVisible();
    await page.locator('#btn-continue').click();
    await expect(page.locator('#game:not(.hidden)')).toBeVisible();

    // the controls lesson survived the reload; the drip resumes with the Guide
    expect(await page.evaluate(function () {
      return FB.game.uiPrefs.tipsSeen['drip-controls'];
    })).toBe(1);
    expect(await page.evaluate(function () { return FB.ui.dailyTip(); }))
      .toBe(true);
    await expect(page.locator('.coachmark', {
      hasText: 'How to play'
    })).toHaveCount(1);
    await expect(page.locator('.coachmark', {
      hasText: 'game controls live in the Settings'
    })).toHaveCount(0);
  });

test('Settings offers a first-time tips switch, and both switches silence tips',
  async function ({ page }) {
    await startDeterministicGame(page);
    await page.locator('#btn-menu').click();
    await page.locator('#m-settings').click();

    const hideTips = page.getByRole('checkbox', {
      name: /Disable first-time tips/
    });
    await expect(hideTips).not.toBeChecked();
    await expect(page.locator('label.autorow', { has: hideTips }))
      .toContainText('guide-hints switch above');
    const guideHints = page.getByRole('checkbox', {
      name: /Disable guide hints/
    });
    await expect(page.locator('label.autorow', { has: guideHints }))
      .toContainText('first-time tips');

    // the dedicated switch, through the real Settings modal
    await hideTips.check();
    await expect.poll(async function () {
      return page.evaluate(function () {
        return {
          preference: FB.game.uiPrefs.hideTips,
          stored: JSON.parse(localStorage.getItem('fb_ui')).hideTips
        };
      });
    }).toEqual({ preference: true, stored: true });
    expect(await page.evaluate(function () { return FB.ui.dailyTip(); }))
      .toBe(false);

    // the wider guide-hints switch silences the tips as well
    await page.evaluate(function () {
      FB.game.uiPrefs.hideTips = false;
      FB.game.uiPrefs.hideBeginnerHints = true;
      FB.game.saveUiPrefs();
    });
    expect(await page.evaluate(function () { return FB.ui.dailyTip(); }))
      .toBe(false);
  });

test('an install with an existing save is grandfathered out of tips',
  async function ({ page }, testInfo) {
    test.skip(testInfo.project.name !== 'chromium-served',
      'The storage contract belongs to the served origin.');
    await startDeterministicGame(page);
    await expect.poll(async function () {
      return page.evaluate(function () { return FB.save.hasAnySave(); });
    }).toBe(true);

    // an upgrade arrives with prefs that predate the tips layer
    await page.evaluate(function () { localStorage.removeItem('fb_ui'); });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.locator('#title:not(.hidden)')).toBeVisible();
    await expect.poll(async function () {
      return page.evaluate(function () {
        return FB.game.uiPrefs.tipsGrandfathered;
      });
    }).toBe(true);

    await page.locator('#btn-continue').click();
    await expect(page.locator('#game:not(.hidden)')).toBeVisible();
    expect(await page.evaluate(function () { return FB.ui.dailyTip(); }))
      .toBe(false);
    await expect(page.locator('.coachmark')).toHaveCount(0);
  });

test('a contextual tip fires at its moment and never twice',
  async function ({ page }) {
    await startDeterministicGame(page);
    const bought = await page.evaluate(function () {
      FB.state.player.gold = 100000;
      const available = FB.landAvailable(FB.state);
      if (!available.length) return false;
      const settlement = available[0].settlement;
      return FB.buyLandPlot(FB.state, settlement) &&
        FB.buyLandPlot(FB.state, settlement);
    });
    expect(bought).toBe(true);
    // it opens pointing at the Land tab it recommends, lit until dismissed
    await expect(page.locator('.coachmark', {
      hasText: 'first plot of land'
    })).toHaveCount(1);
    await expect(page.locator('#sidetabs .tab[data-tab="prov"]'))
      .toHaveClass(/coachmark-lit/);
    await page.getByRole('button', { name:'Got it', exact:true }).click();
    await expect(page.locator('.coachmark')).toHaveCount(0);
    await expect(page.locator('#sidetabs .tab[data-tab="prov"]'))
      .not.toHaveClass(/coachmark-lit/);
    expect(await page.evaluate(function () {
      return FB.ui.tipDue('first-plot');
    })).toBe(false);
  });
