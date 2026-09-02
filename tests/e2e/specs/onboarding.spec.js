'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'data/map_data.js',
  'js/main.js',
  'js/save.js',
  'js/i18n.js',
  'js/events.js',
  'js/ui_misc.js',
  'js/ui_panels.js',
  'js/ui_modals.js',
  'data/actions.js',
  'js/actions.js',
  'css/style.css',
  'data/bookmarks.js',
  'data/economy.js',
  'data/events_common.js',
  'data/events_peasant.js',
  'data/events_tutorial.js',
  'data/technology.js',
  'data/lang_en.js',
  'data/lang_fr.js'
]);

const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const {
  START_CODE, startDeterministicGame:startBaseGame, unlockStartTier
} = require('../support/game/start');
const { waitForUiRefresh } = require('../support/game/ui');
const SERF_START_CODE = 'ASCENT-867-serf-london-f-Ada';

function startDeterministicGame(page, options) {
  const guided = Object.assign({ keepTutorial:true }, options || {});
  return startBaseGame(page, guided);
}

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
    await expect(page.getByRole('heading', {
      name: 'Choose a Starting Date', exact: true
    }))
      .toBeVisible();
    await page.locator('#btn-bm-seed').click();
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
    await expect(page.locator('[data-serf-start-pointer]')).toHaveCount(0);
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

test('fresh serf intro points to Rank & Realm even when guide hints are hidden',
  async function ({ page }) {
    await page.evaluate(function () {
      FB.game.uiPrefs.hideBeginnerHints = true;
      FB.game.saveUiPrefs();
    });
    await page.getByRole('button', { name:'New Game', exact:true }).click();
    await page.locator('#btn-bm-seed').click();
    const seedInput = page.locator('#ng-seed');
    await seedInput.fill(SERF_START_CODE);
    await seedInput.press('Enter');
    await expect(page.locator('#chargen:not(.hidden)')).toBeVisible();
    await page.getByRole('button', { name:'Begin Your Story', exact:true })
      .click();

    await expect(page.locator('[data-serf-start-pointer]')).toContainText(
      'Your station and routes to freedom are in Rank & Realm. First steps remain in Deeds.');
    await expect(page.locator('.coachmark')).toHaveCount(0);
  });

test('a saved guide-hints setting suppresses first-life onboarding surfaces',
  async function ({ page }) {
    await page.evaluate(function () {
      FB.game.uiPrefs.hideBeginnerHints = true;
      FB.game.saveUiPrefs();
    });
    await page.getByRole('button', { name:'New Game', exact:true }).click();
    await page.locator('#btn-bm-seed').click();
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

test('Daily Focus stays separate and desperate measures commits only after a choice',
  async function ({ page }) {
    await page.setViewportSize({ width:1280, height:800 });
    await startDeterministicGame(page, { keepFirstTimeTips:true });
    await finishOpeningMapTour(page);
    await page.getByRole('button', { name:'Got it', exact:true }).click();
    await page.locator('.coachmark', { hasText:'unpause with Play' })
      .getByRole('button', { name:'Got it', exact:true }).click();
    await page.evaluate(function () {
      FB.setPlayerTier(FB.state, 0, { tenureFormationReason:'rank_change' });
      FB.ui.refresh();
    });

    await expect(page.locator('#daily-focus-list'))
      .toContainText('repeats automatically whenever a day passes');
    await expect(page.locator('[data-action-group-body="work"] .actionsubhead'))
      .toContainText('One-time deeds');

    const poach = page.locator('[data-action-id="poach"]');
    const town = page.locator('[data-action-id="go_to_town"]');
    const poachRow = poach.locator('..');
    const townRow = town.locator('..');
    const immediate = page.locator('[data-action-id="seek_blessing"]');
    await expect(poach).toHaveAttribute('data-deed-flow', 'choices');
    await expect(poach).not.toContainText('Opens choices…');
    await expect(poachRow.locator('.deed-details'))
      .toContainText('Opens choices…');
    await expect(poachRow.locator('.deed-details'))
      .toContainText('Choose an illegal way');
    await expect(poachRow.locator('.deed-details')).toBeHidden();
    await expect(town).toHaveAttribute('data-deed-flow', 'choices');
    await expect(town).not.toContainText('Opens choices…');
    await expect(townRow.locator('.deed-details')).toContainText('Opens choices…');
    await page.locator('[data-action-group="faith"]').click();
    await expect(immediate).toBeVisible();
    const borders = await page.evaluate(function () {
      return {
        immediate:getComputedStyle(document.querySelector(
          '[data-action-id="seek_blessing"]')).borderColor,
        choices:getComputedStyle(document.querySelector(
          '[data-action-id="poach"]')).borderColor
      };
    });
    expect(borders.immediate).not.toBe(borders.choices);

    await poach.hover();
    await expect(page.locator('#tooltip')).toContainText('Opens choices…');
    await expect(page.locator('#tooltip')).toContainText('Choose an illegal way');
    await town.hover();
    await expect(page.locator('#tooltip')).toContainText('Opens choices…');
    await expect(page.locator('#tooltip')).toContainText('Spend a day at one');

    // Compact/tablet layouts swap the hover surface for the shared ? disclosure.
    await page.setViewportSize({ width:900, height:700 });
    await poach.hover();
    await expect(page.locator('#tooltip')).toBeHidden();
    const poachInfo = poachRow.locator('.deed-info');
    await expect(poachInfo).toBeVisible();
    await poachInfo.click();
    await expect(poachRow.locator('.deed-details')).toBeVisible();

    // Choosing an ongoing focus is not completing a one-time deed.
    await page.locator('[data-focus-id]:not(.focused)').first().click();
    expect(await page.evaluate(function () {
      return !!FB.state.player.flags.tut_deed;
    })).toBe(false);

    const before = await page.evaluate(function () {
      return {
        turn:FB.state.turn,
        rng:FB.getRngState(),
        cooldown:Object.prototype.hasOwnProperty.call(
          FB.state.player.cooldowns || {}, 'poach')
      };
    });
    await poach.click();
    await expect(page.getByRole('heading', { name:/Desperate measures/i }))
      .toBeVisible();
    await expect(page.locator('[data-serf-hostile-deed]')).toHaveCount(4);
    await expect(page.locator('#gm-body')).toContainText('Cut and sell forbidden wood');
    await expect(page.locator('#gm-body')).toContainText('Waylay a dues cart');
    expect(await page.evaluate(function () {
      return {
        turn:FB.state.turn,
        rng:FB.getRngState(),
        cooldown:Object.prototype.hasOwnProperty.call(
          FB.state.player.cooldowns || {}, 'poach'),
        tutorial:!!FB.state.player.flags.tut_deed
      };
    })).toEqual(Object.assign({}, before, { tutorial:false }));
    await page.getByRole('button', { name:'Not today', exact:true }).click();
    expect(await page.evaluate(function () {
      return {
        turn:FB.state.turn,
        rng:FB.getRngState(),
        cooldown:Object.prototype.hasOwnProperty.call(
          FB.state.player.cooldowns || {}, 'poach')
      };
    })).toEqual(before);

    await poach.click();
    await page.locator('[data-serf-hostile-deed]').first().click();
    await expect.poll(function () {
      return page.evaluate(function () {
        return !!FB.state.player.flags.tut_deed;
      });
    }).toBe(true);
    expect(await page.evaluate(function (turnBefore) {
      return {
        poach:!!FB.state.player.flags.tut_poach,
        cooldown:Object.prototype.hasOwnProperty.call(
          FB.state.player.cooldowns || {}, 'poach'),
        advanced:FB.state.turn === turnBefore + 1
      };
    }, before.turn)).toEqual({ poach:true, cooldown:true, advanced:true });
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
    const musicChoice = page.locator('#music-choice:not(.hidden)');
    await page.waitForFunction(function () {
      return document.querySelector('#title:not(.hidden)') ||
        document.querySelector('#music-choice:not(.hidden)');
    });
    if (await musicChoice.isVisible()) {
      await page.getByRole('button', {
        name:'Continue silently', exact:true
      }).click();
    }
    await expect(page.getByRole('button', { name:'New Game', exact:true }))
      .toBeVisible();
    expect(await page.evaluate(function () {
      return {
        grandfathered:FB.game.uiPrefs.tipsGrandfathered,
        onboardingStarted:FB.game.uiPrefs.onboardingStarted
      };
    })).toEqual({ grandfathered:true, onboardingStarted:true });

    await page.getByRole('button', { name:'New Game', exact:true }).click();
    await page.locator('#btn-bm-seed').click();
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

test('using a highlighted control learns and closes its one-step coachmark',
  async function ({ page }) {
    await page.getByRole('button', { name:'New Game', exact:true }).click();
    await page.locator('#btn-bm-seed').click();
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
    await expect(coach).toHaveCount(0);
    expect(await page.evaluate(function () {
      return !!FB.game.uiPrefs.tipsSeen['first-deed'];
    })).toBe(true);
    expect(await page.evaluate(function () {
      return FB.game.uiPrefs.hideTips;
    })).toBe(false);
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
      if (!me.spouseId) {
        const spouse = FB.makeCharacter(s, {
          name:'Spec Spouse', sex:me.sex === 'f' ? 'm' : 'f',
          culture:me.culture, religion:me.religion,
          born:s.date.year - 20, traitsN:0
        });
        me.spouseId = spouse.id;
        spouse.spouseId = me.id;
      }
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

test('the first-player family chapter bounds conception delay without changing later lives',
  async function ({ page }) {
    await startDeterministicGame(page);
    const result = await page.evaluate(function () {
      const s = FB.state, p = s.player, me = s.chars[p.charId];
      const spouse = FB.makeCharacter(s, {
        name:'Tutorial Spouse', sex:me.sex === 'f' ? 'm' : 'f',
        culture:me.culture, religion:me.religion,
        born:s.date.year - 20, traitsN:0
      });
      spouse.fertility = 1;
      spouse.spouseId = me.id;
      spouse.role = 'spouse';
      me.fertility = 1;
      me.spouseId = spouse.id;
      me.childrenIds = [];
      s.roles.spouse = spouse.id;
      p.flags.tut_track_first_steps = 1;
      p.flags.tut_family_guidance_started = 1;
      delete p.flags.tut_track_family_legacy;
      delete p.flags.noChildren;
      p.flags.tut_family_marriage_char_id = me.id;
      p.flags.tut_family_married_at =
        s.turn - FBDATA.balance.tutorialConceptionPityDays;
      p.marriedAt = s.turn; // a later doctrine-permitted wedding must not reset the lesson
      s.pregnant = null;

      const chance = FB.chance;
      const picker = FB.pickDailyEvents;
      FB.chance = function () { return false; };
      FB.pickDailyEvents = function () { return []; };
      FB.game.passDay();
      const tutorialPregnancy = s.pregnant && {
        motherId:s.pregnant.motherId,
        fatherId:s.pregnant.fatherId,
        days:s.pregnant.due - s.turn
      };

      s.pregnant = null;
      delete p.flags.tutorial;
      p.marriedAt = s.turn - FBDATA.balance.tutorialConceptionPityDays;
      FB.game.passDay();
      const ordinaryPregnancy = !!s.pregnant;
      FB.chance = chance;
      FB.pickDailyEvents = picker;
      return {
        tutorialPregnancy:tutorialPregnancy,
        ordinaryPregnancy:ordinaryPregnancy,
        parents:[me.id, spouse.id]
      };
    });
    expect(result.tutorialPregnancy).not.toBeNull();
    expect(result.tutorialPregnancy.days).toBe(270);
    expect(result.parents).toContain(result.tutorialPregnancy.motherId);
    expect(result.parents).toContain(result.tutorialPregnancy.fatherId);
    expect(result.ordinaryPregnancy).toBe(false);
  });

test('polygynous guidance completes the first wedding and makes later marriages optional',
  async function ({ page }) {
    await startDeterministicGame(page);
    const result = await page.evaluate(function () {
      const s = FB.state, p = s.player, me = s.chars[p.charId];
      me.sex = 'm';
      me.religion = 'norse_pagan';
      me.childrenIds = [];
      p.flags.tutorial = 1;
      p.flags.tut_track_first_steps = 1;
      p.flags.tut_family_guidance_started = 1;
      p.flags.tut_kin_tab = 1;
      delete p.flags.tut_track_family_legacy;
      FB.game.uiPrefs.hideTips = false;
      FB.game.uiPrefs.hideBeginnerHints = false;
      FB.game.uiPrefs.tipsGrandfathered = false;
      FB.game.uiPrefs.tipsSeen = FB.game.uiPrefs.tipsSeen || {};
      delete FB.game.uiPrefs.tipsSeen['family-marriage-doctrine'];

      function wed(name) {
        const spouse = FB.makeCharacter(s, {
          name:name, sex:'f', culture:me.culture,
          religion:me.religion, born:s.date.year - 20,
          station:FB.playerStation(s), traitsN:0
        });
        p.courtingId = spouse.id;
        p.flags.courting = 1;
        return FB.doMarry(s, { settleDowry:false });
      }
      s.turn = 40;
      const first = wed('First Wife');
      const firstAnchor = p.flags.tut_family_married_at;
      s.turn = 65;
      const second = wed('Second Wife');
      const status = FB.tutorialStatus(s);
      const action = FB.instantStatus(s, 'seek_match').action;
      const label = FB.ui._shared.actionLabel(s, 'seek_match', action);
      const desc = action.desc(s);
      const tip = FB.ui.maybeAdditionalMarriageTip();
      FB.ui.refresh();
      return {
        first:first, second:second,
        spouseCount:FB.spousesOf(s, me).length,
        doctrineLimit:FB.marriageDoctrine(me.religion, s).spouseLimit.m,
        firstAnchor:firstAnchor,
        anchorAfterSecond:p.flags.tut_family_married_at,
        latestWedding:p.marriedAt,
        track:status.track,
        steps:status.steps,
        label:label, desc:desc, tip:tip
      };
    });
    expect(result.first).toBe(true);
    expect(result.second).toBe(true);
    expect(result.spouseCount).toBe(2);
    expect(result.doctrineLimit).toBe(3);
    expect(result.firstAnchor).toBe(40);
    expect(result.anchorAfterSecond).toBe(40);
    expect(result.latestWedding).toBe(65);
    expect(result.track.note).toContain('up to 3 spouses');
    expect(result.track.note).toContain('additional marriages are optional');
    expect(result.steps[1]).toEqual({
      id:'wed', label:'Wed your first spouse', done:true
    });
    expect(result.label).toBe('💍 Seek an additional spouse…');
    expect(result.desc).toContain('2 of 3 spouse places are filled');
    expect(result.tip).toBe(true);
    await expect(page.locator('.coachmark')).toContainText(
      'Your faith permits up to 3 spouses');
    await expect(page.locator('#lefttabs .tab[data-tab="family"]'))
      .toHaveClass(/coachmark-lit/);
  });

test('a refused first proposal explains the next search and its cooldown',
  async function ({ page }) {
    await startDeterministicGame(page);
    const result = await page.evaluate(function () {
      const s = FB.state, p = s.player;
      p.flags.tutorial = 1;
      p.flags.tut_track_first_steps = 1;
      p.flags.tut_family_guidance_started = 1;
      p.flags.tut_kin_tab = 1;
      const proposal = FBDATA.events.filter(function (event) {
        return event.id === 'proposal_made';
      })[0];
      FB.applyEffects(s, proposal.options[0].failure.effects);
      p.cooldowns.seek_match = s.turn;
      const waiting = FB.instantStatus(s, 'seek_match');
      const waitingLabel = FB.ui._shared.actionLabel(
        s, 'seek_match', waiting.action);
      const waitingNote = FB.tutorialStatus(s).track.note;
      s.turn += FB.marriageProspectRefreshDays();
      const ready = FB.instantStatus(s, 'seek_match');
      return {
        waitingCan:waiting.can,
        waitingReason:waiting.reason,
        waitingLabel:waitingLabel,
        waitingNote:waitingNote,
        readyCan:ready.can,
        readyLabel:FB.ui._shared.actionLabel(s, 'seek_match', ready.action),
        readyNote:FB.tutorialStatus(s).track.note
      };
    });
    expect(result.waitingCan).toBe(false);
    expect(result.waitingReason).toContain('proposal was refused');
    expect(result.waitingReason).toContain('30 days');
    expect(result.waitingLabel).toBe('💍 Seek another match…');
    expect(result.waitingNote).toBe(result.waitingReason);
    expect(result.readyCan).toBe(true);
    expect(result.readyLabel).toBe('💍 Seek another match…');
    expect(result.readyNote).toContain('Seek another match');
  });

test('unfinished work guidance follows a minor child and points succession at Chronicle',
  async function ({ page }) {
    await startDeterministicGame(page);
    const result = await page.evaluate(function () {
      const s = FB.state, p = s.player, old = s.chars[p.charId];
      FB.ui.coachmarkReset();
      FB.game.uiPrefs.hideTips = false;
      FB.game.uiPrefs.hideBeginnerHints = false;
      FB.game.uiPrefs.tipsGrandfathered = false;
      FB.game.uiPrefs.tipsSeen = FB.game.uiPrefs.tipsSeen || {};
      delete FB.game.uiPrefs.tipsSeen.succession;
      p.flags.tutorial = 1;
      delete p.flags.tutorial_done;
      p.flags.tut_track_first_steps = 1;
      p.flags.tut_track_family_legacy = 1;
      p.tier = 0;
      p.enterpriseMigration = 1;
      p.enterprises = [{
        uid:'tutorial_inherited_enterprise',
        type:Object.keys(FBDATA.enterprises)[0],
        provinceId:p.provinceId, settlement:0, workerId:null
      }];
      p.landPlotMigration = 1;
      p.landPlots = [];

      const child = FB.makeCharacter(s, {
        name:'Young Successor', sex:old.sex,
        culture:old.culture, religion:old.religion,
        born:s.date.year - 8, dyn:old.dyn, traitsN:0,
        fatherId:old.sex === 'm' ? old.id : null,
        motherId:old.sex === 'f' ? old.id : null
      });
      old.childrenIds.push(child.id);
      old.dead = true;
      p.dead = true;
      FB.game.succeedTo(child.id);
      const status = FB.tutorialStatus(s);
      return {
        active:FB.tutorialActive(s),
        child:!!p.flags.tut_successor_child,
        relative:!!p.flags.tut_successor_relative,
        track:status && status.track,
        steps:status && status.steps
      };
    });
    expect(result.active).toBe(true);
    expect(result.child).toBe(true);
    expect(result.relative).toBe(false);
    expect(result.track.id).toBe('making_a_living');
    expect(result.track.note).toContain('previous head’s child');
    expect(result.track.note).toContain('adult deeds unlock at age 16');
    expect(result.steps.map(function (step) { return step.label; })).toEqual([
      'Come of age and take up a livelihood',
      'Start or continue a household enterprise',
      'Come of age, petition or buy freedom, then acquire land'
    ]);
    expect(result.steps[1].done).toBe(true);
    await expect(page.locator('.coachmark')).toContainText(
      'chronicle continues through your child');
    await expect(page.locator('#sidetabs .tab[data-tab="log"]'))
      .toHaveClass(/coachmark-lit/);
    await expect(page.locator('.coachmark')).toHaveClass(/over-map/);
  });

test('unfinished work guidance identifies an adult collateral successor',
  async function ({ page }) {
    await startDeterministicGame(page);
    const result = await page.evaluate(function () {
      const s = FB.state, p = s.player, old = s.chars[p.charId];
      FB.ui.coachmarkReset();
      FB.game.uiPrefs.hideTips = false;
      FB.game.uiPrefs.hideBeginnerHints = false;
      FB.game.uiPrefs.tipsGrandfathered = false;
      FB.game.uiPrefs.tipsSeen = FB.game.uiPrefs.tipsSeen || {};
      delete FB.game.uiPrefs.tipsSeen.succession;
      p.flags.tutorial = 1;
      delete p.flags.tutorial_done;
      p.flags.tut_track_first_steps = 1;
      p.flags.tut_track_family_legacy = 1;
      p.tier = 1;
      p.enterpriseMigration = 1;
      p.enterprises = [];
      p.landPlotMigration = 1;
      p.landPlots = [];

      const relative = FB.makeCharacter(s, {
        name:'Collateral Successor', sex:old.sex,
        culture:old.culture, religion:old.religion,
        born:s.date.year - 24, dyn:old.dyn, traitsN:0
      });
      old.dead = true;
      p.dead = true;
      FB.game.succeedTo(relative.id);
      const status = FB.tutorialStatus(s);
      return {
        child:!!p.flags.tut_successor_child,
        relative:!!p.flags.tut_successor_relative,
        track:status && status.track,
        steps:status && status.steps
      };
    });
    expect(result.child).toBe(false);
    expect(result.relative).toBe(true);
    expect(result.track.id).toBe('making_a_living');
    expect(result.track.note).toContain('play as a relative');
    expect(result.steps.map(function (step) { return step.label; })).toEqual([
      'Continue or take up a livelihood',
      'Start or continue a household enterprise',
      'Petition or buy freedom, then acquire your first land plot'
    ]);
    await expect(page.locator('.coachmark')).toContainText(
      'chronicle continues through a relative');
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

    // The shared deed-completion boundary clears the Deeds nudge. Full deed
    // flows are covered above; keep this nudge test free of event modals.
    await page.evaluate(function () {
      const s = FB.state;
      FB.noteDeedCompleted(s, 'go_to_town');
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

test('unlanded rank details keeps station, home, lord, and freedom concise at 390px with keyboard dismissal',
  async function ({ page }) {
    await page.setViewportSize({ width: 390, height: 844 });
    await startDeterministicGame(page);
    await page.evaluate(function () {
      FB.setPlayerTier(FB.state, 0, { tenureFormationReason:'rank_change' });
      FB.ui.refresh();
      FB.ui.showTab('char');
    });
    const rank = page.locator('#self-rank-details');
    await expect(rank).toBeVisible();

    // 1. Open the modal from the keyboard and verify its focus target.
    await rank.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('heading', { name:'Station & home', exact:true }))
      .toBeVisible();
    const closeBtn = page.locator('#rank-details-close');
    await expect(closeBtn).toBeVisible();
    await expect(closeBtn).toBeFocused();

    // 2. The shared mobile surface keeps only decision-relevant identity.
    await expect(page.locator('#gm-body .kv:has(span:text-is("Station")) b'))
      .toBeVisible();
    await expect(page.locator('#gm-body .kv:has(span:text-is("Home")) b'))
      .toBeVisible();
    await expect(page.locator('#gm-body .kv:has(span:text-is("Current lord")) b'))
      .toBeVisible();
    await expect(page.locator('#gm-body [data-tenure-summary]')).toBeVisible();
    await expect(page.locator('#gm-body [data-freedom-routes]')).toBeVisible();
    await expect(page.locator('#gm-body [data-tenure-duty]')).toHaveCount(0);
    await expect(page.locator('#gm-body [data-tenure-next-due]')).toHaveCount(0);
    await expect(page.locator('#gm-body [data-tenure-work]')).toHaveCount(0);
    await expect(page.locator('#gm-body [data-tenure-right]')).toHaveCount(0);
    await expect(page.locator('#gm-body [data-tenure-conditional]')).toHaveCount(0);
    await expect(page.locator('#gm-body')).not.toContainText('Held directly');
    await expect(page.locator('#gm-body')).not.toContainText('Direct demesne');
    await expect(page.locator('#gm-body')).not.toContainText('Path:');
    await expect(page.locator('#gm-body')).not.toContainText('Family shares:');
    await expect(page.locator('#gm-body')).not.toContainText('Current gold');
    await expect(page.locator('#gm-body')).not.toContainText('Affordable now');
    await expect(page.locator('#gm-body')).not.toContainText('petition at');

    // 3. Dismiss modal via Escape key and verify hidden state.
    await page.keyboard.press('Escape');
    await expect(page.locator('#genmodal')).toHaveClass(/hidden/);
  });

test('Station & home uses the same concise surface for all seven tenure archetypes',
  async function ({ page }) {
    await page.setViewportSize({ width:390, height:844 });
    await startDeterministicGame(page);

    const archetypes = [
      { id:'latin_manorial', title:'Manorial customary tenure', dutyCount:4,
        culture:'english', faith:'catholic', terrain:'farmland', dev0:5, kind:'village',
        rights:['gleaning_after_harvest'], nearest:'Boon harvest', pending:true,
        work:'Tend strips and serve the demesne' },
      { id:'irrigated_fellah', title:'Irrigated fellah tenure', dutyCount:4,
        culture:'arabic', faith:'sunni', terrain:'farmland', dev0:6, kind:'village',
        rights:['irrigation_turn'], nearest:'Crop-share delivery', work:'Tend fields and waterworks' },
      { id:'norse_coastal_service', title:'Coastal household-service tenure', dutyCount:3,
        culture:'norse', faith:'norse_pagan', terrain:'farmland', dev0:4, kind:'town',
        coastal:true, bookmarkId:'867', rights:['customary_shore_landing'],
        nearest:'Seasonal catch share', work:'Work shore, boats, and transport' },
      { id:'pastoral_steppe', title:'Pastoral dependent tenure', dutyCount:3,
        culture:'magyar', faith:'tengri', terrain:'steppe', dev0:3, kind:'village',
        coastal:false, bookmarkId:'867', rights:['customary_grazing_turn'],
        nearest:'Pasture due', work:'Tend the household herds' },
      { id:'woodland_dependence', title:'Woodland customary tenure', dutyCount:4,
        culture:'slavic', faith:'slavic_pagan', terrain:'forest', dev0:3, kind:'village',
        coastal:false, bookmarkId:'1066', rights:['storm_fallen_wood', 'seasonal_common_grazing'],
        nearest:'Woodland mast due', work:'Work woodland and clearings' },
      { id:'pagan_household_service', title:'Household-service tenure', dutyCount:3,
        culture:'norse', faith:'norse_pagan', terrain:'forest', dev0:2, kind:'village',
        coastal:false, bookmarkId:'867', rights:[], nearest:'Master’s harvest',
        work:'Serve the master’s household' },
      { id:'dependent_farming', title:'Dependent farming tenure', dutyCount:2,
        culture:'khazar', faith:'jewish', terrain:'steppe', dev0:1, kind:'town',
        coastal:false, bookmarkId:'867', rights:[], nearest:'Seasonal harvest',
        work:'Work the household holding' }
    ];

    for (const arch of archetypes) {
      await page.evaluate(function (fixture) {
        FB.state.player.tier = 0;
        const prov = FB.state.player.provinceId || 'london';
        const sett = FB.state.player.homeSettlement || 0;
        const res = FB.selectSerfTenureArchetype({
          provinceId:prov, settlementIndex:sett, culture:fixture.culture,
          faith:fixture.faith, terrain:fixture.terrain, dev0:fixture.dev0,
          coastal:!!fixture.coastal, bookmarkId:fixture.bookmarkId,
          settlementKind:fixture.kind, state:FB.state
        });
        if (res.archetype.id !== fixture.id) throw new Error('Unexpected tenure archetype.');

        FB.state.player.tenure = {
          version: 1,
          status: 'active',
          provinceId: prov,
          settlement: sett,
          archetypeId: fixture.id,
          formedTurn: FB.state.turn,
          formedBy: 'new_game',
          duties: res.resolvedDuties.map(function (d, index) {
            return {
              id:d.id,
              eventId:d.eventId,
              nextDueTurn:FB.state.turn + (index === 1 ? 5 : 50 + index),
              lastResolvedTurn:null
            };
          }),
          conditional: (res.archetype.conditionalDuties || []).map(function (c, index) {
            return {
              id:c.id,
              eventId:c.eventId,
              nextEligibleTurn:0,
              pendingTurn:fixture.pending && index === 0 ? FB.state.turn + 7 : null,
              lastResolvedTurn:null
            };
          }),
          rights: res.resolvedRights
        };
        FB.ui.showRankDetails();
      }, arch);

      const body = page.locator('#gm-body');
      await expect(body.locator('[data-tenure-summary]')).toBeVisible();
      await expect(body.locator('[data-freedom-routes]')).toBeVisible();
      await expect(body.locator('[data-tenure-home]')).toBeVisible();
      await expect(body.locator('.kv:has(span:text-is("Current lord")) b'))
        .toBeVisible();
      await expect(body.locator('.tenure-archetype-name')).toHaveCount(0);
      await expect(body.locator('[data-tenure-work]')).toHaveCount(0);
      await expect(body.locator('[data-tenure-duty]')).toHaveCount(0);
      await expect(body.locator('[data-tenure-next-due]')).toHaveCount(0);
      await expect(body.locator('[data-tenure-right]')).toHaveCount(0);
      await expect(body.locator('[data-tenure-conditional]')).toHaveCount(0);
      await expect(body).not.toContainText(arch.title);
      await expect(body).not.toContainText(arch.work);
      await expect(body).not.toContainText(arch.nearest);
      await expect(body).not.toContainText('Family shares:');
      const textLength = await body.evaluate(function (element) {
        return element.innerText.length;
      });
      expect(textLength).toBeLessThan(900);
      const hasHorizontalOverflow = await page.locator('#gm-body').evaluate(function (element) {
        return element.scrollWidth > element.clientWidth + 1;
      });
      expect(hasHorizontalOverflow).toBe(false);
      await page.locator('#rank-details-close').click();
    }
  });

test('Station & home keeps freeholder and gentry views to home and local ruler',
  async function ({ page }) {
    await startDeterministicGame(page);

    for (const tier of [1, 2]) {
      await page.evaluate(function (nextTier) {
        FB.setPlayerTier(FB.state, nextTier);
        FB.ui.showRankDetails();
      }, tier);

      const body = page.locator('#gm-body');
      await expect(page.getByRole('heading', {
        name:'Station & home', exact:true
      })).toBeVisible();
      await expect(body.locator('.kv:has(span:text-is("Station")) b'))
        .toBeVisible();
      await expect(body.locator('.kv:has(span:text-is("Home")) b'))
        .toBeVisible();
      await expect(body.locator('.kv:has(span:text-is("Local ruler")) b'))
        .toBeVisible();
      await expect(body.locator('[data-serf-tenure]')).toHaveCount(0);
      await expect(body.locator('[data-freedom-routes]')).toHaveCount(0);
      await expect(body.locator('.kv:has(span:text-is("Settlement"))'))
        .toHaveCount(0);
      await expect(body.locator('.kv:has(span:text-is("County"))'))
        .toHaveCount(0);
      const textLength = await body.evaluate(function (element) {
        return element.innerText.length;
      });
      expect(textLength).toBeLessThan(500);
      await page.locator('#rank-details-close').click();
    }
  });

test('Station & home modal renders English and an injected test locale without untranslated tokens or raw IDs',
  async function ({ page }) {
    await startDeterministicGame(page);

    // 1. English rendering: no raw {token} placeholders
    var englishText = await page.evaluate(function () {
      FB.setPlayerTier(FB.state, 0, { tenureFormationReason:'rank_change' });
      FB.ensureSerfTenure(FB.state, 'new_game');
      FB.ui.showRankDetails();
      var body = document.getElementById('gm-body');
      return {
        text: body ? body.innerText : '',
        hasRawTokens: body ? /\{[a-zA-Z0-9_]+\}/.test(body.innerText) : false,
        hasRawIds: body ? /(?:latin_manorial|week_work|demesne_harvest|gleaning_after_harvest)/.test(body.innerText) : false
      };
    });
    expect(englishText.text.length).toBeGreaterThan(0);
    expect(englishText.hasRawTokens).toBe(false);
    expect(englishText.hasRawIds).toBe(false);
    await page.locator('#rank-details-close').click();

    // 2. Load the real Preview-locale path and prove the concise shared chrome
    // localizes without reintroducing culture-specific tenure internals.
    var localized = await page.evaluate(function () {
      return new Promise(function (resolve) {
        localStorage.setItem('fb_lang', 'fr');
        FB.loadSelectedLocale(function (loaded) {
          var catalog = FBDATA.lang.fr;
          catalog.entries['ui:Station & home'] = {
            text:'Statut et foyer',
            hash:FB.i18nHash({ text:'Station & home' })
          };
          catalog.entries['ui:Home'] = {
            text:'Foyer',
            hash:FB.i18nHash({ text:'Home' })
          };
          catalog.entries['ui:Freedom'] = {
            text:'Liberté',
            hash:FB.i18nHash({ text:'Freedom' })
          };
          var customSummary =
            'Your household is bound to this home; customary service appears as events when it needs your decision.';
          catalog.entries['ui:' + customSummary] = {
            text:'Les coutumes locales apparaissent seulement lors d’un événement utile.',
            hash:FB.i18nHash({ text:customSummary })
          };
          FB.finalizeLocale(loaded);
          FB.ui.showRankDetails();
          var body = document.getElementById('gm-body');
          var heading = document.getElementById('gm-title');
          localStorage.setItem('fb_lang', 'en');
          resolve({
            locale:FB.locale,
            heading:heading ? heading.textContent : '',
            text:body ? body.innerText : ''
          });
        });
      });
    });
    expect(localized.locale).toBe('fr');
    expect(localized.heading).toContain('Statut et foyer');
    expect(localized.text).toContain('Foyer');
    expect(localized.text).toContain('Liberté');
    expect(localized.text).toContain(
      'Les coutumes locales apparaissent seulement lors d’un événement utile.');
    expect(localized.text).not.toContain('latin_manorial');
    expect(localized.text).not.toContain('week_work');
    await page.locator('#rank-details-close').click();
  });

test('Station & home keeps the live lord while hiding right variants and preserving state neutrality',
  async function ({ page }) {
    await startDeterministicGame(page);
    await page.evaluate(function () {
      FB.setPlayerTier(FB.state, 0, { tenureFormationReason:'rank_change' });
    });

    const testResults = await page.evaluate(function () {
      const state = FB.state;
      const results = {};

      // 1. Render state neutrality (RNG and state untouched)
      const rngBefore = FB.getRngState();
      const stateBefore = JSON.stringify(state);
      FB.ui.showRankDetails();
      FB.ui.showRankDetails();
      const rngAfter = FB.getRngState();
      const stateAfter = JSON.stringify(state);
      results.rngNeutral = rngBefore === rngAfter;
      results.stateNeutral = stateBefore === stateAfter;

      // 2. Live direct county controller update (state.holder)
      state.holder = state.holder || {};
      state.holder[state.player.provinceId] = 'vassal_county_realm';
      state.realms.vassal_county_realm = {
        id: 'vassal_county_realm',
        name: 'County of Surrey',
        ruler: 'char_local_count',
        alive: true
      };
      state.chars.char_local_count = {
        id: 'char_local_count',
        name: 'Wulfric',
        sex: 'm',
        born: state.date.year - 35,
        traits: []
      };
      const viewWithLocalHolder = FB.tenureView(state);
      results.derivedLocalLord = viewWithLocalHolder && viewWithLocalHolder.lordName;

      // 3. A zero-right internal variant remains valid but has no UI ledger.
      state.player.tenure.rights = [];
      const viewZeroRights = FB.tenureView(state);
      results.zeroRightsHandled = !!viewZeroRights;

      FB.ui.showRankDetails();

      return results;
    });

    expect(testResults.rngNeutral).toBe(true);
    expect(testResults.stateNeutral).toBe(true);
    expect(testResults.derivedLocalLord).toContain('Wulfric');
    expect(testResults.zeroRightsHandled).toBe(true);
    await expect(page.locator('#gm-body')).toContainText('Wulfric');
    await expect(page.locator('#gm-body [data-tenure-right]')).toHaveCount(0);
    await expect(page.locator('#gm-body')).not.toContainText(
      'No recognized customary rights recorded.');
    await page.locator('#rank-details-close').click();
  });
