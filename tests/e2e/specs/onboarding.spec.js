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

test('a saved guide-hints setting suppresses new-life map and orientation popups',
  async function ({ page }) {
    await page.evaluate(function () {
      FB.game.uiPrefs.hideBeginnerHints = true;
      FB.game.saveUiPrefs();
    });
    await page.getByRole('button', { name:'New Game', exact:true }).click();
    const seedInput = page.locator('#ng-seed');
    await seedInput.fill(START_CODE);
    await seedInput.press('Enter');
    await expect(page.locator('#chargen:not(.hidden)')).toBeVisible();
    await page.getByRole('button', { name:'Begin Your Story', exact:true }).click();
    await expect(page.getByRole('heading', {
      name:'Your Story Begins', exact:true
    })).toBeVisible();
    await expect(page.locator('#toasts')).not.toContainText('Drag to pan');
    await page.getByRole('button', { name:'Begin', exact:true }).click();
    await expect(page.locator('#genmodal')).toHaveClass(/hidden/);
    await expect(page.locator('.tutorial-card')).toHaveCount(0);
  });

test('First steps flip from ordinary play and the track advances',
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

    // the event answer flag and the first earned coin complete the track —
    // and the checklist advances to the next stage instead of retiring
    await page.evaluate(function () {
      const s = FB.state;
      s.player.flags.tut_event = 1; // written by the event-option handler
      s.player.gold = s.player.startGold + 1;
      FB.ui.refresh();
    });
    await waitForUiRefresh(page);
    status = await page.evaluate(function () {
      return FB.tutorialStatus(FB.state);
    });
    expect(status.track.id).toBe('making_a_living');
    await expect(page.locator('.tutorial-card')).toContainText('Making a living');

    const advanced = await page.evaluate(function () {
      const flags = FB.state.player.flags;
      return {
        tutorial:!!flags.tutorial,
        done:!!flags.tutorial_done,
        trackMarked:!!flags.tut_track_first_steps,
        news:FB.state.log.filter(function (entry) {
          return entry.msg && entry.msg.key === 'news.tutorial.track_done';
        }).length
      };
    });
    expect(advanced).toEqual({ tutorial:true, done:false, trackMarked:true, news:1 });
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

test('the guide-hints preference silences checklists, popups, and tutorial chapters',
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
      FB.state.player.roleOrientationsSeen = {};
      const orientation = FB.ui.maybeShowRoleOrientation();
      delete FB.state.player.flags.tut_ev_welcome;
      FB.state.turn = 2;
      const queued = [];
      const queueEvent = FB.queueEvent;
      FB.queueEvent = function (state, id) { queued.push(id); };
      FB.tutorialCheck(FB.state);
      FB.queueEvent = queueEvent;
      FB.game.uiPrefs.hideBeginnerHints = false;
      const first = FB.ui.maybeHint('spec-hint-2', 'appears once');
      const second = FB.ui.maybeHint('spec-hint-2', 'appears once');
      return {
        suppressed:suppressed,
        orientation:orientation,
        queued:queued,
        welcomeMarked:!!FB.state.player.flags.tut_ev_welcome,
        first:first,
        second:second
      };
    });
    expect(hintResult).toEqual({
      suppressed:false,
      orientation:false,
      queued:[],
      welcomeMarked:true,
      first:true,
      second:false
    });

    // a save without the tutorial stamp (every pre-feature life) never sees it
    await page.evaluate(function () {
      delete FB.state.player.flags.tutorial;
      FB.ui.refresh();
    });
    await waitForUiRefresh(page);
    await expect(page.locator('.tutorial-card')).toHaveCount(0);
  });

test('the checklist walks its tracks and retires after the last one',
  async function ({ page }) {
    await startDeterministicGame(page);
    const result = await page.evaluate(function () {
      const s = FB.state, flags = s.player.flags;
      const me = s.chars[s.player.charId];
      s.turn = 5;
      FB.tutorialCheck(s); // queues the scripted welcome chapter
      const firstTrack = FB.tutorialStatus(s).track.id;
      // First steps: the scenario's focus counts; flip the rest from play
      flags.tut_unpause = 1;
      flags.tut_deed = 1;
      flags.tut_event = 1;
      s.player.gold = s.player.startGold + 1;
      FB.tutorialCheck(s);
      const secondTrack = FB.tutorialStatus(s).track.id;
      // Making a living: the livelihood comes with the scenario; add the rest
      s.player.enterprises = [{ type:'spec_enterprise' }];
      s.player.landPlotMigration = 1; // no legacy farm migration mid-test
      s.player.landPlots = [{ provinceId:s.player.provinceId, settlement:0 }];
      FB.tutorialCheck(s);
      const thirdTrack = FB.tutorialStatus(s).track.id;
      // Family & legacy
      flags.tut_kin_tab = 1;
      me.spouseId = me.spouseId || 'spec_spouse';
      me.childrenIds.push('spec_child');
      FB.tutorialCheck(s);
      const queued = s.eventQueue.map(function (e) { return e.id; });
      const news = s.log.filter(function (entry) {
        return entry.msg && entry.msg.key === 'news.tutorial.all_done';
      }).length;
      const retired = { tutorial:!!flags.tutorial, done:!!flags.tutorial_done,
        status:FB.tutorialStatus(s) };
      s.player.enterprises = [];
      return { firstTrack:firstTrack, secondTrack:secondTrack,
        thirdTrack:thirdTrack, queued:queued, news:news, retired:retired };
    });
    expect(result.firstTrack).toBe('first_steps');
    expect(result.secondTrack).toBe('making_a_living');
    expect(result.thirdTrack).toBe('family_legacy');
    expect(result.queued).toContain('tut_welcome');
    expect(result.queued).toContain('tut_livelihood');
    expect(result.queued).toContain('tut_legacy');
    expect(result.news).toBe(1);
    expect(result.retired.tutorial).toBe(false);
    expect(result.retired.done).toBe(true);
    expect(result.retired.status).toBe(null);
    await page.evaluate(function () { FB.ui.refresh(); });
    await waitForUiRefresh(page);
    await expect(page.locator('.tutorial-card')).toHaveCount(0);
  });

test('landed rulers skip the livelihood track',
  async function ({ page }) {
    await startDeterministicGame(page);
    const result = await page.evaluate(function () {
      const s = FB.state, flags = s.player.flags;
      s.player.tier = 3; // a landed start never sees livelihood steps
      flags.tut_unpause = 1;
      flags.tut_deed = 1;
      flags.tut_event = 1;
      s.player.gold = s.player.startGold + 1;
      FB.tutorialCheck(s);
      const id = FB.tutorialStatus(s).track.id;
      const livelihoodQueued = s.eventQueue.filter(function (e) {
        return e.id === 'tut_livelihood';
      }).length;
      s.player.tier = 1; // restore the scenario's station
      return { id:id, livelihoodQueued:livelihoodQueued };
    });
    expect(result.id).toBe('family_legacy');
    expect(result.livelihoodQueued).toBe(0);
  });

test('the scripted chain queues its welcome once, and dismissal stops it',
  async function ({ page }) {
    await startDeterministicGame(page);
    const welcomes = await page.evaluate(function () {
      const s = FB.state;
      s.turn = 5;
      FB.tutorialCheck(s);
      FB.tutorialCheck(s); // idempotent
      return s.eventQueue.filter(function (e) {
        return e.id === 'tut_welcome';
      }).length;
    });
    expect(welcomes).toBe(1);

    // dismissing the checklist stops every later chapter
    const chapters = await page.evaluate(function () {
      const s = FB.state, flags = s.player.flags;
      delete flags.tutorial; // the per-save opt-out
      flags.tut_unpause = 1;
      flags.tut_deed = 1;
      flags.tut_event = 1;
      s.player.gold = s.player.startGold + 1;
      FB.tutorialCheck(s);
      return s.eventQueue.filter(function (e) {
        return e.id === 'tut_livelihood' || e.id === 'tut_legacy';
      }).length;
    });
    expect(chapters).toBe(0);
  });

test('tab nudges point at the next unfinished lesson',
  async function ({ page }) {
    await startDeterministicGame(page);
    const deedsTab = page.locator('#sidetabs .tab[data-tab="actions"]');
    const kinTab = page.locator('#lefttabs .tab[data-tab="family"]');
    await expect(deedsTab).toHaveClass(/nudge/);
    await expect(kinTab).toHaveClass(/nudge/);

    // a real deed clears the Deeds nudge
    await page.evaluate(function () {
      const s = FB.state;
      const runnable = FB.listInstants(s).filter(function (item) {
        const st = FB.instantStatus(s, item.a.id);
        return st.shown && st.can && !item.a.noConsume;
      })[0];
      FB.runInstant(s, runnable.a.id);
      FB.ui.refresh();
    });
    await waitForUiRefresh(page);
    await expect(deedsTab).not.toHaveClass(/nudge/);

    // opening the Kin tab stamps its step and clears its nudge
    await kinTab.click();
    await expect(page.getByRole('heading', {
      name: 'The Kin tab', exact: true })).toBeVisible();
    await page.locator('#panel-intro-continue').click();
    await expect(page.locator('#genmodal')).toHaveClass(/hidden/);
    await page.evaluate(function () { FB.ui.refresh(); });
    await waitForUiRefresh(page);
    await expect(kinTab).not.toHaveClass(/nudge/);
    const stamped = await page.evaluate(function () {
      return !!FB.state.player.flags.tut_kin_tab;
    });
    expect(stamped).toBe(true);
  });

test('panel intro sheets open once, deep-link to the Guide, and yield to the preference',
  async function ({ page }) {
    await startDeterministicGame(page);
    await page.locator('#sidetabs .tab[data-tab="network"]').click();
    await expect(page.getByRole('heading', {
      name: 'The Network tab', exact: true })).toBeVisible();
    // the header info icon opens the real Guide, not a copy
    const introGuide = page.locator('#genmodal .gm-heading > #panel-intro-guide');
    await expect(introGuide).toHaveClass(/modal-guide-button/);
    await expect(page.locator('#genmodal .gm-footer #panel-intro-guide'))
      .toHaveCount(0);
    await introGuide.click();
    await expect(page.locator('#guide-controls')).toBeVisible();
    await page.evaluate(function () { FB.ui.closeModal(); });
    await expect(page.locator('#genmodal')).toHaveClass(/hidden/);
    const seen = await page.evaluate(function () {
      return FB.state.player.panelIntrosSeen || {};
    });
    expect(seen.network).toBe(1);

    // second visit: no sheet opens again
    await page.locator('#sidetabs .tab[data-tab="actions"]').click();
    await page.locator('#sidetabs .tab[data-tab="network"]').click();
    await expect(page.locator('#genmodal')).toHaveClass(/hidden/);

    // the preference suppresses unseen intros — and lifting it lets them through
    await page.evaluate(function () {
      FB.game.uiPrefs.hideBeginnerHints = true;
    });
    await page.locator('#sidetabs .tab[data-tab="prov"]').click();
    await expect(page.locator('#genmodal')).toHaveClass(/hidden/);
    await page.evaluate(function () {
      FB.game.uiPrefs.hideBeginnerHints = false;
    });
    await page.locator('#sidetabs .tab[data-tab="actions"]').click();
    await page.locator('#sidetabs .tab[data-tab="prov"]').click();
    await expect(page.getByRole('heading', {
      name: 'The Land tab', exact: true })).toBeVisible();
    await page.locator('#panel-intro-continue').click();
  });

test('beginner lines in the stat breakdown and empty Kin panel honor the preference',
  async function ({ page }) {
    await startDeterministicGame(page);
    const lines = await page.evaluate(function () {
      const html = FB.ui._shared.statBreakdownHtml('gold');
      FB.game.uiPrefs.hideBeginnerHints = true;
      const hiddenHtml = FB.ui._shared.statBreakdownHtml('gold');
      FB.game.uiPrefs.hideBeginnerHints = false;
      return { on:html.indexOf('Money pays for land') >= 0,
        off:hiddenHtml.indexOf('Money pays for land') >= 0 };
    });
    expect(lines).toEqual({ on:true, off:false });

    // the Kin panel adds a courtship pointer when unwed and childless
    await page.evaluate(function () {
      const s = FB.state, me = s.chars[s.player.charId];
      me.spouseId = null;
      me.childrenIds = [];
      for (const id in s.chars) {
        if (s.chars[id].spouseId === me.id) s.chars[id].spouseId = null;
      }
      s.player.panelIntrosSeen = { family:1 }; // keep the intro sheet out
      FB.ui.showTab('family');
    });
    await expect(page.locator('#tab-family')).toContainText(
      'first deed of a dynasty');
    await page.evaluate(function () {
      FB.game.uiPrefs.hideBeginnerHints = true;
      FB.ui.refresh();
    });
    await waitForUiRefresh(page);
    await expect(page.locator('#tab-family')).not.toContainText(
      'first deed of a dynasty');
    await page.evaluate(function () {
      FB.game.uiPrefs.hideBeginnerHints = false;
    });
  });

test('a mid-checklist save from the single-track version keeps its progress',
  async function ({ page }) {
    await startDeterministicGame(page);
    const status = await page.evaluate(function () {
      const s = FB.state;
      s.player.flags = { tutorial:1, tut_seen_focus:1 }; // pre-tracks shape
      return FB.tutorialStatus(s);
    });
    expect(status.track.id).toBe('first_steps');
    expect(status.steps[0].done).toBe(true);
    expect(status.done).toBe(1);
  });

test('unlanded rank details modal shows settlement, county ruler, and station context instead of noble demesne counts',
  async function ({ page }) {
    await startDeterministicGame(page);
    const rank = page.locator('#self-rank-details');
    await expect(rank).toBeVisible();
    await rank.click();

    await expect(page.getByRole('heading', { name:'Station & home', exact:true }))
      .toBeVisible();
    await expect(page.locator('#gm-body .kv:has(span:text-is("Settlement")) b'))
      .toBeVisible();
    await expect(page.locator('#gm-body .kv:has(span:text-is("County ruler")) b'))
      .toBeVisible();
    await expect(page.locator('#gm-body .panelh')).toContainText('Home');
    await expect(page.locator('#gm-body')).not.toContainText('Held directly');
    await expect(page.locator('#gm-body')).not.toContainText('Direct demesne');
    await expect(page.locator('#gm-body')).not.toContainText('Path:');
    await page.locator('#rank-details-close').click();
  });
