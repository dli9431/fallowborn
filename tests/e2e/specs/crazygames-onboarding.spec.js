'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, ['js/bookmark_sources.js',
  'index.html', 'css/style.css', 'js/main.js', 'js/ui_misc.js',
  'js/ui_panels.js', 'js/ui_modals.js', 'js/ui_topbar.js', 'js/actions.js',
  'js/events.js', 'js/model.js', 'js/portrait.js', 'js/economy.js', 'js/technology.js',
  'js/lordships.js', 'js/world.js', 'js/messages.js', 'js/i18n.js',
  'js/save.js', 'js/util.js', 'js/travel.js', 'js/crazygames.js', 'js/music.js',
  'data/music_catalog.js', 'data/starts.js',
  'data/actions.js', 'data/economy.js', 'data/bookmarks.js', 'data/travel.js',
  'data/map_data.js', 'data/counties.js', 'data/settlements.js',
  'data/settlements_real.js', 'data/cultures.js', 'data/traits.js',
  'data/technology.js', 'data/events_common.js', 'data/events_peasant.js', 'data/events_tutorial.js',
  'data/distribution_crazygames.js'
]);
const { test, expect } = require('../support/fixture');
test.describe.configure({mode:'parallel'});
const { mockCrazyGames } = require('../support/crazygames');
const { openGame } = require('../support/game/navigation');
const { startDeterministicGame } = require('../support/game/start');

async function finishOpeningLoop(page, gold) {
  await page.evaluate(function (funds) {
    FB.ui.coachmarkReset();
    const s = FB.state;
    const flags = s.player.flags;
    // Isolate the post-event handoff without manufacturing a child.
    flags.tut_deed = 1;
    flags.tut_unpause = 1;
    flags.tut_event = 1;
    flags.tut_ev_welcome = 1;
    s.player.gold = funds;
    const seen = FB.game.uiPrefs.tipsSeen;
    seen['first-deed'] = 1;
    seen['first-time-flow'] = 1;
    seen['first-event-result'] = 1;
    FB.game.saveUiPrefs();
    FB.ui.refresh();
  }, gold);
}

async function marryForEnterprise(page) {
  expect(await page.evaluate(function () {
    const s = FB.state, me = s.chars[s.player.charId];
    // Model a marriage made during guidance, not an already-established household
    // that correctly skips the entire Family & legacy track on its first check.
    s.player.flags.tut_family_guidance_started = 1;
    const match = FB.makeCharacter(s, {
      name:'Household Spouse', sex:me.sex === 'm' ? 'f' : 'm',
      culture:me.culture, religion:me.religion, born:me.born,
      station:FB.playerStation(s), opinion:100, traitsN:0
    });
    return FB.beginCourtship(s, match) && FB.doMarry(s, { settleDowry:false });
  })).toBe(true);
}

async function prepareCourtship(page) {
  return page.evaluate(function () {
    const s = FB.state, p = s.player, me = s.chars[p.charId];
    FB.game.uiPrefs.hideTips = true;
    FB.game.saveUiPrefs();
    FB.ui.coachmarkReset();
    p.gold = 1000;
    const candidate = FB.makeCharacter(s, {
      name:'Local Match', sex:me.sex === 'm' ? 'f' : 'm',
      culture:me.culture, religion:me.religion, born:s.date.year - 20,
      station:FB.playerStation(s),
      opinion:0, traitsN:0, role:'suitor'
    });
    candidate.homeProvinceId = p.provinceId;
    const ref = { kind:'character', id:candidate.id };
    // Friendship and courtship retain their ordinary rates with an SDK present.
    const friendship = FB.socialAttentionAssign(s, candidate);
    FB.tickSocialAttention(s);
    const friendshipGain = FB.standingOf(s, ref);
    FB.adjustStanding(s, ref, -friendshipGain, 'spec:reset-standing');
    const rng = FB.getRngState();
    const preview = FB.socialVisitPreview(s, candidate, { courtship:true, readOnly:true });
    const days = FB.socialAttentionDaysToThreshold(s, candidate, true);
    const previewUsedRng = FB.getRngState() !== rng;
    FB.pickSuitor(s, candidate.id);
    const began = FB.beginCourtship(s, candidate);
    return { id:candidate.id, friendship:friendship, friendshipGain:friendshipGain,
      began:began, previewRate:preview.dailyRate, days:days,
      previewUsedRng:previewUsedRng, rate:FB.socialAttentionStatus(s, candidate).rate,
      proposal:FB.canPropose(s) };
  });
}

test('standard build with SDK' +
    ' applies its courtship rate and acceptance only after eligibility',
    async function ({ page }, testInfo) {
      await mockCrazyGames(page);
      await openGame(page, testInfo);
      await startDeterministicGame(page);
      const initial = await prepareCourtship(page);
      const expectedRate = 0.2;
      const expectedDays = 200;
      expect(initial.friendship).toBe(true);
      expect(initial.friendshipGain).toBeCloseTo(0.2);
      expect(initial.began).toBe(true);
      expect(initial.rate).toBeCloseTo(expectedRate);
      expect(initial.previewRate).toBeCloseTo(expectedRate);
      expect(initial.days).toBe(expectedDays);
      expect(initial.previewUsedRng).toBe(false);
      expect(initial.proposal).toBe(false);
      const result = await page.evaluate(function (args) {
        const s = FB.state, p = s.player, candidate = s.chars[args.id];
        const ref = { kind:'character', id:candidate.id };
        const restoredRate = FB.socialAttentionStatus(s, candidate).rate;
        // Road travel still pauses attention; the opening bonus cannot bypass it.
        p.travel = { phase:'outbound', currentId:p.provinceId };
        FB.tickSocialAttention(s);
        const roadGain = FB.standingOf(s, ref);
        p.travel = null;
        const tooSoon = FB.canPropose(s);
        const earlyChance = FB.namedChance(s, 'proposal');
        for (let day = 0; day < args.days - 1; day++) {
          s.turn++;
          FB.tickSocialAttention(s);
        }
        const beforeLastDay = FB.canPropose(s);
        s.turn++;
        FB.tickSocialAttention(s);
        const ready = FB.canPropose(s);
        const chance = FB.namedChance(s, 'proposal');
        const standing = FB.standingOf(s, ref);
        candidate.dead = true;
        const deadTarget = FB.canPropose(s);
        candidate.dead = false;
        const rng = FB.getRngState();
        const ev = FB.eventById('proposal_made');
        const receipt = FB.resolveEventOption(s, ev, ev.options[0], {});
        return { restoredRate:restoredRate, roadGain:roadGain,
          tooSoon:tooSoon, earlyChance:earlyChance, beforeLastDay:beforeLastDay,
          ready:ready, chance:chance, standing:standing, deadTarget:deadTarget,
          result:receipt && receipt.result, usedRng:FB.getRngState() !== rng,
          spouse:FB.spousesSnapshot(s, s.chars[p.charId]).some(function (c) {
            return c.id === candidate.id;
          }) };
      }, { id:initial.id, days:expectedDays });
      expect(result.restoredRate).toBeCloseTo(expectedRate);
      expect(result.roadGain).toBe(0);
      expect(result.tooSoon).toBe(false);
      expect(result.earlyChance).toBeLessThan(1);
      expect(result.beforeLastDay).toBe(false);
      expect(result.ready).toBe(true);
      expect(result.standing).toBeCloseTo(40);
      expect(result.deadTarget).toBe(false);
      expect(result.usedRng).toBe(true);
      expect(result.chance).toBeLessThan(1);
    });

test('a standard phone build with an SDK present keeps the town-first and later-enterprise flow',
  async function ({ page }, testInfo) {
    await page.setViewportSize({ width:390, height:844 });
    await mockCrazyGames(page);
    await openGame(page, testInfo);
    await startDeterministicGame(page, { keepFirstTimeTips:true });
    await page.locator('.coachmark', { hasText:'Low health greatly increases' })
      .getByRole('button', { name:'Got it', exact:true }).click();
    await expect(page.locator('.coachmark')).toContainText('Try Go into town');
    await expect(page.locator('[data-action-id="go_to_town"]'))
      .toHaveClass(/coachmark-lit/);
    await page.evaluate(function () {
      FB.ui.coachmarkReset();
      const s = FB.state;
      const candidate = FB.spawnSuitor(s)[1];
      FB.pickSuitor(s, candidate.id);
      FB.ui.runEvents([{ id:'meet_suitor', ctx:{} }]);
    });
    await expect.poll(function () {
      return page.evaluate(function () { return FB.ui.eventInputGuarded(); });
    }).toBe(false);
    await page.locator('#ev-options .evopt').first().click();
    expect(await page.evaluate(function () {
      return !!FB.state.player.flags.tut_event;
    })).toBe(true);
    await finishOpeningLoop(page, 1000);
    await expect(page.locator('.coachmark')).toContainText('map is yours to explore');
    expect(await page.evaluate(function () {
      return { crazy:FB.platform.isCrazyGames,
        early:!!FB.game.uiPrefs.tipsSeen['cg-enterprise-ready'],
        handled:FB.ui.resumeCrazyGamesHouseholdTips() };
    })).toEqual({ crazy:false, early:false, handled:false });
    await marryForEnterprise(page);
    expect(await page.evaluate(function () {
      const s = FB.state;
      const before = FB.tutorialStatus(s).track.id;
      s.player.flags.tut_track_family_legacy = 1;
      const after = FB.tutorialStatus(s);
      return { before:before, after:after.track.id,
        steps:after.steps.map(function (step) { return step.id; }) };
    })).toEqual({ before:'family_legacy', after:'making_a_living',
      steps:['livelihood', 'enterprise', 'land'] });
    await expect(page.locator('#tutorial-objective')).toHaveCount(0);
    expect(await page.evaluate(function () {
      return JSON.parse(FB.save.serialize()).meta.household || null;
    })).toBe(null);
  });

