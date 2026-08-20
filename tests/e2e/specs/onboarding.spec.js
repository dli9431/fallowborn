'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'js/main.js',
  'js/save.js',
  'js/ui_misc.js',
  'js/ui_panels.js',
  'js/ui_modals.js',
  'js/actions.js',
  'css/style.css',
  'data/bookmarks.js',
  'data/events_tutorial.js'
]);

const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const {
  START_CODE, startDeterministicGame, unlockStartTier
} = require('../support/game/start');
const { waitForUiRefresh } = require('../support/game/ui');

test.beforeEach(async function ({ page }, testInfo) {
  await openGame(page, testInfo);
  await unlockStartTier(page, 1);
});

async function finishOpeningMapTour(page) {
  const map = page.locator('.coachmark', { hasText:'map is yours to explore' });
  await expect(map).toBeVisible();
  await map.getByRole('button', { name:'Got it', exact:true }).click();
  const home = page.locator('.coachmark', { hasText:'Use Home to recenter' });
  await expect(home).toBeVisible();
  await home.getByRole('button', { name:'Got it', exact:true }).click();
  const filters = page.locator('.coachmark', { hasText:'Use Map filters' });
  await expect(filters).toBeVisible();
  await filters.getByRole('button', { name:'Got it', exact:true }).click();
  await expect(page.locator('.coachmark', { hasText:'Begin in Deeds' }))
    .toBeVisible();
}

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

    // the intro keeps the flavor and points at the playable first loop
    await expect(page.getByRole('heading', {
      name: 'Your Story Begins', exact: true
    })).toBeVisible();
    await expect(page.locator('#gm-body'))
      .toContainText('your First steps are listed there');
    await expect(page.locator('#gm-body')).not.toContainText('Press Space');
    await page.getByRole('button', { name: 'Begin', exact: true }).click();

    // no orientation sheet — the map tour is the first coachmark sequence
    await expect(page.locator('#genmodal')).toHaveClass(/hidden/);

    await finishOpeningMapTour(page);
    const firstCoach = page.locator('.coachmark', { hasText:'Begin in Deeds' });
    await expect(firstCoach).toBeVisible();
    await expect(page.locator('#sidetabs .tab[data-tab="actions"]'))
      .toHaveClass(/coachmark-lit/);
    expect(await page.evaluate(function () {
      return !!FB.game.uiPrefs.tipsSeen['first-deed'];
    })).toBe(false); // showing alone does not consume the tip
    await page.getByRole('button', { name:'Got it', exact:true }).click();
    const flowCoach = page.locator('.coachmark', { hasText:'unpause with Play' });
    await expect(flowCoach).toBeVisible();
    await expect(page.locator('#timebtns')).toHaveClass(/coachmark-lit/);
    await flowCoach.getByRole('button', { name:'Got it', exact:true }).click();
    await expect(page.locator('.coachmark')).toHaveCount(0);
    expect(await page.evaluate(function () {
      return !!FB.game.uiPrefs.tipsSeen['first-deed'];
    })).toBe(true);

    // Secondary areas wait until the player deliberately opens them.
    expect(await page.evaluate(function () {
      return !!FB.game.uiPrefs.tipsSeen['area-network'];
    })).toBe(false);
    await page.locator('#sidetabs .tab[data-tab="network"]').click();
    const networkCoach = page.locator('.coachmark', {
      hasText:'Network gathers the ties'
    });
    await expect(networkCoach).toBeVisible();
    await networkCoach.getByRole('button', { name:'Got it', exact:true }).click();
    await page.locator('#sidetabs .tab[data-tab="actions"]').click();

    // the First-steps checklist is the deterministic deed → time → event loop
    const card = page.locator('.tutorial-card');
    await expect(card).toBeVisible();
    await expect(card).toContainText('First steps');
    await expect(card.locator('li')).toHaveCount(3);
    await expect(card.locator('li.done')).toHaveCount(0);
    await expect(card.locator('li').first())
      .toContainText('Complete a one-time deed (not a Daily Focus)');
  });

test('a saved guide-hints setting suppresses first-life onboarding surfaces',
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
    await expect(page.locator('.coachmark')).toHaveCount(0);
    await page.getByRole('button', { name:'Begin', exact:true }).click();
    await expect(page.locator('#genmodal')).toHaveClass(/hidden/);
    await expect(page.locator('.tutorial-card')).toHaveCount(0);
  });

test('Daily Focus stays separate and an immediate deed completes First steps',
  async function ({ page }) {
    await page.setViewportSize({ width:1280, height:800 });
    await startDeterministicGame(page);
    await finishOpeningMapTour(page);
    await page.getByRole('button', { name:'Got it', exact:true }).click();
    await page.locator('.coachmark', { hasText:'unpause with Play' })
      .getByRole('button', { name:'Got it', exact:true }).click();

    await expect(page.locator('#daily-focus-list'))
      .toContainText('repeats automatically whenever a day passes');
    await expect(page.locator('[data-action-group-body="work"] .actionsubhead'))
      .toContainText('One-time deeds');

    const poach = page.locator('[data-action-id="poach"]');
    const town = page.locator('[data-action-id="go_to_town"]');
    const poachRow = poach.locator('..');
    const townRow = town.locator('..');
    await expect(poach).toHaveAttribute('data-deed-flow', 'now');
    await expect(poach).not.toContainText('Resolves now');
    await expect(poach).not.toContainText('Meat and coin');
    await expect(poachRow.locator('.deed-details'))
      .toContainText('Resolves now · spends one day');
    await expect(poachRow.locator('.deed-details')).toBeHidden();
    await expect(town).toHaveAttribute('data-deed-flow', 'choices');
    await expect(town).not.toContainText('Opens choices…');
    await expect(townRow.locator('.deed-details')).toContainText('Opens choices…');
    const borders = await page.evaluate(function () {
      return {
        immediate:getComputedStyle(document.querySelector(
          '[data-action-id="poach"]')).borderColor,
        choices:getComputedStyle(document.querySelector(
          '[data-action-id="go_to_town"]')).borderColor
      };
    });
    expect(borders.immediate).not.toBe(borders.choices);

    await poach.hover();
    await expect(page.locator('#tooltip')).toContainText(
      'Resolves now · spends one day');
    await expect(page.locator('#tooltip')).toContainText('Meat and coin');
    await town.hover();
    await expect(page.locator('#tooltip')).toContainText('Opens choices…');
    await expect(page.locator('#tooltip')).toContainText('Spend a day at one');

    // Compact/tablet layouts swap the hover surface for the shared ? disclosure.
    await page.setViewportSize({ width:900, height:700 });
    await town.hover();
    await expect(page.locator('#tooltip')).toBeHidden();
    const townInfo = townRow.locator('.deed-info');
    await expect(townInfo).toBeVisible();
    await townInfo.click();
    await expect(townRow.locator('.deed-details')).toBeVisible();

    // Choosing an ongoing focus is not completing a one-time deed.
    await page.locator('[data-focus-id]:not(.focused)').first().click();
    expect(await page.evaluate(function () {
      return !!FB.state.player.flags.tut_deed;
    })).toBe(false);

    await poach.click();
    await expect.poll(function () {
      return page.evaluate(function () {
        return !!FB.state.player.flags.tut_deed;
      });
    }).toBe(true);
  });

test('a choice-backed deed completes only after its confirmed day',
  async function ({ page }) {
    await startDeterministicGame(page);
    expect(await page.evaluate(function () {
      return !!FB.state.player.flags.tut_deed;
    })).toBe(false);

    await page.locator('[data-action-id="go_to_town"]').click();
    await expect(page.getByRole('heading', { name:'Where To?', exact:true }))
      .toBeVisible();
    expect(await page.evaluate(function () {
      return !!FB.state.player.flags.tut_deed;
    })).toBe(false);
    await page.getByRole('button', { name:'Stay home', exact:true }).click();
    expect(await page.evaluate(function () {
      return !!FB.state.player.flags.tut_deed;
    })).toBe(false);

    await page.locator('[data-action-id="go_to_town"]').click();
    await page.locator('[data-visit]').first().click();

    await expect.poll(function () {
      return page.evaluate(function () {
        return !!FB.state.player.flags.tut_deed;
      });
    }).toBe(true);
    const deedStep = await page.evaluate(function () {
      const status = FB.tutorialStatus(FB.state);
      return status.steps.filter(function (step) {
        return step.id === 'deed';
      })[0];
    });
    expect(deedStep.done).toBe(true);
  });

test('an affected tutorial save repairs its missing deed evidence',
  async function ({ page }) {
    await startDeterministicGame(page);
    const repaired = await page.evaluate(function () {
      const s = FB.state;
      delete s.player.flags.tut_deed;
      s.player.cooldowns = s.player.cooldowns || {};
      s.player.cooldowns.go_to_town = Math.max(0, s.turn - 1);
      const status = FB.tutorialStatus(s);
      const cooldownEvidence = status.steps.filter(function (step) {
        return step.id === 'deed';
      })[0].done;
      delete s.player.cooldowns.go_to_town;
      s.player.flags.tut_unpause = 1;
      s.player.flags.tut_event = 1;
      s.player.startGold = s.player.gold - 1; // legacy affected-save baseline
      return {
        cooldownEvidence:cooldownEvidence,
        completedLoopTrack:FB.tutorialStatus(s).track.id
      };
    });
    expect(repaired).toEqual({
      cooldownEvidence:true,
      completedLoopTrack:'family_legacy'
    });
  });

test('an existing profile is grandfathered out of first-life onboarding',
  async function ({ page }, testInfo) {
    test.skip(testInfo.project.name !== 'chromium-served',
      'The upgrade storage contract belongs to the served origin.');
    await startDeterministicGame(page);
    await page.evaluate(function () {
      FB.game.toTitle(); // leaves the autosave as evidence of prior play
      localStorage.removeItem('fb_ui'); // simulate upgrading from older prefs
    });
    await page.reload();
    await expect(page.getByRole('button', { name:'New Game', exact:true }))
      .toBeVisible();
    expect(await page.evaluate(function () {
      return {
        grandfathered:FB.game.uiPrefs.tipsGrandfathered,
        onboardingStarted:FB.game.uiPrefs.onboardingStarted
      };
    })).toEqual({ grandfathered:true, onboardingStarted:true });

    await page.getByRole('button', { name:'New Game', exact:true }).click();
    await page.locator('#ng-seed').fill(START_CODE);
    await page.getByRole('button', { name:/Use this seed/ }).click();
    await page.getByRole('button', { name:'Begin Your Story', exact:true }).click();
    await expect(page.locator('#gm-body')).not.toContainText('First steps');
    await expect(page.locator('#gm-body')).toContainText('daily focus and one-shot deeds');
    await page.getByRole('button', { name:'Begin', exact:true }).click();

    await expect(page.locator('.coachmark')).toHaveCount(0);
    await expect(page.locator('.tutorial-card')).toHaveCount(0);
    expect(await page.evaluate(function () {
      return !!FB.state.player.flags.tutorial;
    })).toBe(false);
  });

test('a coachmark is learned on interaction and can disable later tips in place',
  async function ({ page }) {
    await page.getByRole('button', { name:'New Game', exact:true }).click();
    await page.locator('#ng-seed').fill(START_CODE);
    await page.getByRole('button', { name:/Use this seed/ }).click();
    await page.getByRole('button', { name:'Begin Your Story', exact:true }).click();
    await page.getByRole('button', { name:'Begin', exact:true }).click();

    await finishOpeningMapTour(page);
    const coach = page.locator('.coachmark', { hasText:'Begin in Deeds' });
    await expect(coach).toBeVisible();
    expect(await page.evaluate(function () {
      return !!FB.game.uiPrefs.tipsSeen['first-deed'];
    })).toBe(false);

    await page.locator('#sidetabs .tab[data-tab="actions"]').click();
    expect(await page.evaluate(function () {
      return !!FB.game.uiPrefs.tipsSeen['first-deed'];
    })).toBe(true);
    await coach.getByRole('button', { name:'Stop tips', exact:true }).click();
    await expect(page.locator('.coachmark')).toHaveCount(0);
    expect(await page.evaluate(function () {
      return FB.game.uiPrefs.hideTips;
    })).toBe(true);
  });

test('First steps flip from ordinary play and the track advances',
  async function ({ page }) {
    await startDeterministicGame(page);
    await expect(page.locator('.tutorial-card')).toBeVisible();

    // letting the days flow flips its step through the real pause control
    let status = await page.evaluate(function () {
      FB.game.setPaused(false);
      FB.game.setPaused(true);
      FB.tutorialCheck(FB.state);
      return FB.tutorialStatus(FB.state);
    });
    expect(status.done).toBe(1); // days flow
    await expect(page.locator('.toast', {
      hasText: 'First steps 1/3: Let the days flow'
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

    // the event answer completes the track and advances to the next stage
    // instead of waiting on an RNG-dependent income result
    await page.evaluate(function () {
      const s = FB.state;
      s.player.flags.tut_event = 1; // written by the event-option handler
      FB.ui.refresh();
    });
    await waitForUiRefresh(page);
    status = await page.evaluate(function () {
      return FB.tutorialStatus(FB.state);
    });
    expect(status.track.id).toBe('family_legacy');
    await expect(page.locator('.tutorial-card')).toContainText('Family & legacy');

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
        queued:queued,
        welcomeMarked:!!FB.state.player.flags.tut_ev_welcome,
        first:first,
        second:second
      };
    });
    expect(hintResult).toEqual({
      suppressed:false,
      queued:[],
      welcomeMarked:true,
      first:true,
      second:false
    });

    // the per-save hint shows as a coachmark that waits for its dismissal
    await expect(page.locator('.coachmark', { hasText:'appears once' }))
      .toHaveCount(1);
    await page.getByRole('button', { name:'Got it', exact:true }).click();
    await expect(page.locator('.coachmark')).toHaveCount(0);

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
      // First steps: flip the three action/result steps
      flags.tut_unpause = 1;
      flags.tut_deed = 1;
      flags.tut_event = 1;
      FB.tutorialCheck(s);
      const secondTrack = FB.tutorialStatus(s).track.id;
      // Family & legacy
      flags.tut_kin_tab = 1;
      me.spouseId = me.spouseId || 'spec_spouse';
      me.childrenIds.push('spec_child');
      FB.tutorialCheck(s);
      const thirdTrack = FB.tutorialStatus(s).track.id;
      // Making a living: the livelihood comes with the scenario; add the rest
      s.player.enterprises = [{ type:'spec_enterprise' }];
      s.player.landPlotMigration = 1; // no legacy farm migration mid-test
      s.player.landPlots = [{ provinceId:s.player.provinceId, settlement:0 }];
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
    expect(result.secondTrack).toBe('family_legacy');
    expect(result.thirdTrack).toBe('making_a_living');
    expect(result.queued).toContain('tut_welcome');
    expect(result.queued).toContain('tut_livelihood');
    expect(result.queued).toContain('tut_legacy');
    expect(result.queued.indexOf('tut_legacy'))
      .toBeLessThan(result.queued.indexOf('tut_livelihood'));
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
    await expect(kinTab).not.toHaveClass(/nudge/);

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

    // Family guidance, including its tab nudge, waits for First steps.
    await page.evaluate(function () {
      FB.state.player.flags.tut_track_first_steps = 1;
      FB.ui.refresh();
    });
    await waitForUiRefresh(page);
    await expect(kinTab).toHaveClass(/nudge/);

    // opening the Kin tab stamps its step and clears its nudge
    await kinTab.click();
    await page.evaluate(function () { FB.ui.refresh(); });
    await waitForUiRefresh(page);
    await expect(kinTab).not.toHaveClass(/nudge/);
    const stamped = await page.evaluate(function () {
      return !!FB.state.player.flags.tut_kin_tab;
    });
    expect(stamped).toBe(true);
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
      FB.ui.showTab('family');
    });
    await expect(page.locator('#tab-family')).not.toContainText(
      'first deed of a dynasty');
    await page.evaluate(function () {
      FB.state.player.flags.tut_track_first_steps = 1;
      FB.ui.refresh();
    });
    await waitForUiRefresh(page);
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
      s.player.flags = { tutorial:1, tut_deed:1, tut_seen_deed:1 };
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
