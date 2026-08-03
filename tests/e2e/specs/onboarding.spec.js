'use strict';

const { test, expect } = require('../support/fixture');
const {
  openGame,
  startDeterministicGame,
  START_CODE,
  waitForUiRefresh
} = require('../support/game');

test.beforeEach(async function ({ page }, testInfo) {
  await openGame(page, testInfo);
});

test('a new life gets a short intro, a focused orientation, and First steps',
  async function ({ page }) {
    await page.getByRole('button', { name: 'New Game', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'New Game', exact: true }))
      .toBeVisible();
    await page.locator('#ng-seed').fill(START_CODE);
    await page.getByRole('button', { name: /Use this seed/ }).click();
    await expect(page.locator('#chargen:not(.hidden)')).toBeVisible();
    await page.getByRole('button', { name: 'Begin Your Story', exact: true })
      .click();

    // the intro keeps the flavor and points at the Deeds tab — no control dump
    await expect(page.getByRole('heading', {
      name: 'Your Story Begins', exact: true
    })).toBeVisible();
    await expect(page.locator('#gm-body'))
      .toContainText('your First steps are listed there');
    await expect(page.locator('#gm-body')).not.toContainText('Press Space');
    await page.getByRole('button', { name: 'Begin', exact: true }).click();

    // a focused orientation sheet opens — never the whole Guide
    await expect(page.getByRole('heading', { name: 'Freeholder', exact: true }))
      .toBeVisible();
    await expect(page.locator('#gm-body')).toContainText('Good first actions');
    await expect(page.locator('#guide-controls')).toHaveCount(0);
    await page.locator('#orientation-continue').click();
    await expect(page.locator('#genmodal')).toHaveClass(/hidden/);

    // the First-steps checklist tops the Deeds tab; the start's focus
    // already counts, so a brand-new player sees one step done
    const card = page.locator('.tutorial-card');
    await expect(card).toBeVisible();
    await expect(card).toContainText('First steps');
    await expect(card.locator('li')).toHaveCount(5);
    await expect(card.locator('li.done')).toHaveCount(1);
    await expect(card.locator('li.done').first()).toContainText('daily focus');
  });

test('First steps flip from ordinary play and the checklist retires itself',
  async function ({ page }) {
    await startDeterministicGame(page);
    await expect(page.locator('.tutorial-card')).toBeVisible();

    // letting the days flow flips its step through the real pause control
    await page.evaluate(function () { FB.game.setPaused(false); });
    await page.evaluate(function () { FB.game.setPaused(true); });
    let status = await page.evaluate(function () {
      FB.tutorialCheck(FB.state);
      return FB.tutorialStatus(FB.state);
    });
    expect(status.done).toBe(2); // focus + days flow
    await expect(page.locator('.toast', {
      hasText: 'First steps 2/5: Let the days flow'
    }))
      .toBeVisible();

    // a real day-spending deed flips its step through the runInstant choke point
    await page.evaluate(function () {
      const s = FB.state;
      const runnable = FB.listInstants(s).filter(function (item) {
        const st = FB.instantStatus(s, item.a.id);
        return st.shown && st.can && !item.a.noConsume;
      })[0];
      FB.runInstant(s, runnable.a.id);
    });

    // the event answer flag and the first earned coin complete the set
    await page.evaluate(function () {
      const s = FB.state;
      s.player.flags.tut_event = 1; // written by the event-option handler
      s.player.gold = s.player.startGold + 1;
      FB.tutorialCheck(s);
    });
    status = await page.evaluate(function () {
      return FB.tutorialStatus(FB.state);
    });
    expect(status.done).toBe(5);

    const retired = await page.evaluate(function () {
      const flags = FB.state.player.flags;
      return {
        tutorial:!!flags.tutorial,
        done:!!flags.tutorial_done,
        news:FB.state.log.filter(function (entry) {
          return entry.msg && entry.msg.key === 'news.tutorial.first_steps';
        }).length
      };
    });
    expect(retired).toEqual({ tutorial:false, done:true, news:1 });
    await waitForUiRefresh(page);
    await expect(page.locator('.tutorial-card')).toHaveCount(0);
  });

test('dismissing First steps is a per-save opt-out',
  async function ({ page }) {
    await startDeterministicGame(page);
    await expect(page.locator('.tutorial-card')).toBeVisible();
    await page.locator('#tutorial-dismiss').click();
    await expect(page.locator('.tutorial-card')).toHaveCount(0);
    const kept = await page.evaluate(function () {
      return {
        tutorial:!!FB.state.player.flags.tutorial,
        active:FB.tutorialActive(FB.state)
      };
    });
    expect(kept).toEqual({ tutorial:false, active:false });
    // and stays gone through later refreshes
    await page.evaluate(function () { FB.ui.refresh(); });
    await waitForUiRefresh(page);
    await expect(page.locator('.tutorial-card')).toHaveCount(0);
  });

test('the beginner-hints preference silences the checklist and hints',
  async function ({ page }) {
    await startDeterministicGame(page);
    await expect(page.locator('.tutorial-card')).toBeVisible();

    await page.evaluate(function () {
      FB.game.uiPrefs.hideBeginnerHints = true;
      FB.ui.refresh();
    });
    await waitForUiRefresh(page);
    await expect(page.locator('.tutorial-card')).toHaveCount(0);

    const hintResult = await page.evaluate(function () {
      const suppressed = FB.ui.maybeHint('spec-hint', 'should not appear');
      FB.game.uiPrefs.hideBeginnerHints = false;
      const first = FB.ui.maybeHint('spec-hint-2', 'appears once');
      const second = FB.ui.maybeHint('spec-hint-2', 'appears once');
      return { suppressed:suppressed, first:first, second:second };
    });
    expect(hintResult).toEqual({ suppressed:false, first:true, second:false });

    // a save without the tutorial stamp (every pre-feature life) never sees it
    await page.evaluate(function () {
      delete FB.state.player.flags.tutorial;
      FB.ui.refresh();
    });
    await waitForUiRefresh(page);
    await expect(page.locator('.tutorial-card')).toHaveCount(0);
  });
