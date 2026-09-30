'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
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
const { mockCrazyGames } = require('../support/crazygames');
const { openGame, targetUrl } = require('../support/game/navigation');
const { startDeterministicGame } = require('../support/game/start');

async function openPortal(page, testInfo) {
  await page.goto(targetUrl(testInfo), { waitUntil:'domcontentloaded' });
  await page.waitForFunction(function () {
    return window.FB && FB.game && FB.game.bootReady;
  });
  // The harness loads the standard tree, which includes music omitted by the packager.
  const silent = page.locator('#music-choice-silent');
  if (await silent.isVisible()) await silent.click();
  await expect(page.locator('#btn-newgame')).toContainText('Play as Osric');
  await expect(page.locator('#btn-newgame')).toBeVisible();
}

async function startPortal(page, testInfo) {
  await mockCrazyGames(page);
  await page.addInitScript(function () {
    window.FB_DISTRIBUTION = 'crazygames';
    window.FB_CRAZYGAMES_STORAGE = 'localstorage';
  });
  await openPortal(page, testInfo);
  await page.evaluate(function () {
    // Fix only the synchronous freshSeed call, then restore the browser clock.
    const now = Date.now, random = Math.random;
    try {
      Date.now = function () { return 1790467200000; };
      Math.random = function () { return 0.314159; };
      document.getElementById('btn-newgame').click();
    } finally {
      Date.now = now;
      Math.random = random;
    }
  });
  await expect(page.locator('.coachmark')).toContainText('use Seek a match');
  expect(await page.evaluate(function () {
    return !!FB.game.uiPrefs.tipsSeen['health-warning'];
  })).toBe(false);
}

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

async function saveAndContinue(page, testInfo) {
  expect(await page.evaluate(function () {
    return new Promise(function (resolve) { FB.save.toSlot('auto', resolve); });
  })).toBe(true);
  await openPortal(page, testInfo);
  await page.locator('#btn-continue').click();
  await expect(page.locator('#game:not(.hidden)')).toBeVisible();
}

async function continueDecisionOutcome(page) {
  await expect(page.locator('#eventmodal')).toHaveClass(/decision-outcome-modal/);
  await expect(page.locator('#outcome-continue')).toBeVisible();
  await expect.poll(function () {
    return page.evaluate(function () { return FB.ui.eventInputGuarded(); });
  }).toBe(false);
  await page.locator('#outcome-continue').click();
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
    // Friendship stays at the ordinary rate even for the portal founder.
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

for (const portal of [true, false]) {
  test((portal ? 'CrazyGames founder' : 'standard build with SDK') +
    ' applies its courtship rate and acceptance only after eligibility',
    async function ({ page }, testInfo) {
      if (portal) await startPortal(page, testInfo);
      else {
        await mockCrazyGames(page);
        await openGame(page, testInfo);
        await startDeterministicGame(page);
      }
      const initial = await prepareCourtship(page);
      const expectedRate = portal ? 2 : 0.2;
      const expectedDays = portal ? 20 : 200;
      expect(initial.friendship).toBe(true);
      expect(initial.friendshipGain).toBeCloseTo(0.2);
      expect(initial.began).toBe(true);
      expect(initial.rate).toBeCloseTo(expectedRate);
      expect(initial.previewRate).toBeCloseTo(expectedRate);
      expect(initial.days).toBe(expectedDays);
      expect(initial.previewUsedRng).toBe(false);
      expect(initial.proposal).toBe(false);
      if (portal) await saveAndContinue(page, testInfo);
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
      if (portal) {
        expect(result.chance).toBe(1);
        expect(result.result).toBe('success');
        expect(result.spouse).toBe(true);
      } else expect(result.chance).toBeLessThan(1);
    });
}

test('CrazyGames courtship assistance ends at succession and needs no new save fields',
  async function ({ page }, testInfo) {
    await startPortal(page, testInfo);
    await prepareCourtship(page);
    const founder = await page.evaluate(function () {
      const s = FB.state, p = s.player, old = s.chars[p.charId];
      const founderId = p.houseFounderId;
      delete p.houseFounderId;
      const legacyFirstLife = FB.crazyGamesFirstCharacter(s);
      p.houseFounderId = 'another_character';
      const differentCharacter = FB.crazyGamesFirstCharacter(s);
      p.houseFounderId = founderId;
      old.born = s.date.year - 40;
      const child = FB.makeCharacter(s, {
        name:'Adult Successor', sex:old.sex, culture:old.culture,
        religion:old.religion, born:s.date.year - 18, dyn:old.dyn, traitsN:0,
        fatherId:old.sex === 'm' ? old.id : null,
        motherId:old.sex === 'f' ? old.id : null
      });
      old.childrenIds.push(child.id);
      old.dead = true;
      p.dead = true;
      FB.game.succeedTo(child.id);
      return { legacyFirstLife:legacyFirstLife, differentCharacter:differentCharacter,
        generation:s.generation, founderId:founderId,
        retainedFounder:p.houseFounderId, assisted:FB.crazyGamesFirstCharacter(s) };
    });
    expect(founder.legacyFirstLife).toBe(true);
    expect(founder.differentCharacter).toBe(false);
    expect(founder.generation).toBe(2);
    expect(founder.retainedFounder).toBe(founder.founderId);
    expect(founder.assisted).toBe(false);
    const successor = await prepareCourtship(page);
    expect(successor.began).toBe(true);
    expect(successor.rate).toBeCloseTo(0.2);
    expect(successor.days).toBe(200);
    const result = await page.evaluate(function () {
      const s = FB.state, p = s.player;
      FB.adjustStanding(s, { kind:'character', id:p.courtingId }, 100,
        'spec:successor-ready');
      delete p.houseFounderId;
      return { ready:FB.canPropose(s), chance:FB.namedChance(s, 'proposal'),
        assisted:FB.crazyGamesFirstCharacter(s),
        rate:FB.socialAttentionStatus(s, s.chars[p.courtingId]).rate };
    });
    expect(result.ready).toBe(true);
    expect(result.chance).toBeLessThan(1);
    expect(result.assisted).toBe(false);
    expect(result.rate).toBeCloseTo(0.2);
  });

for (const viewport of [
  { name:'desktop', width:1280, height:800 },
  { name:'phone', width:390, height:844 }
]) {
  test('CrazyGames ' + viewport.name + ' guides match, event, wedding, then enterprise',
    async function ({ page }, testInfo) {
      await page.setViewportSize({ width:viewport.width, height:viewport.height });
      await startPortal(page, testInfo);
      await page.evaluate(function () {
        // This journey teaches an explicit Play click. Automatic event resume
        // already satisfies that checklist step and correctly skips its hint.
        FB.game.uiPrefs.autoResumeAfterEvents = false;
      });
      await expect(page.locator('[data-action-id="seek_match"]'))
        .toHaveClass(/coachmark-lit/);
      await page.locator('[data-action-id="seek_match"]').click();
      await expect(page.locator('#match-local')).toBeVisible();
      await expect(page.locator('#match-dynastic')).toHaveCount(0);
      expect(await page.evaluate(function () {
        return { deed:!!FB.state.player.flags.tut_deed,
          courting:FB.state.player.courtingId || null,
          timeLesson:!!FB.game.uiPrefs.tipsSeen['first-time-flow'] };
      })).toEqual({ deed:false, courting:null, timeLesson:false });
      // Closing the root route picker must not complete the first action.
      await expect(page.locator('#gm-cancel')).toBeDisabled();
      await page.locator('#genmodal [data-modal-nav="close"]').click();
      await expect(page.locator('#genmodal')).toHaveClass(/hidden/);
      await expect(page.locator('.coachmark')).toHaveCount(0);
      await page.locator('[data-action-id="seek_match"]').click();
      await page.locator('#match-local').click();
      await expect(page.locator('[data-suitor-card]')).toHaveCount(3);
      await expect(page.locator('[data-suitor-card] canvas.pface')).toHaveCount(3);
      await expect(page.locator('[data-suitor-card] [data-suitor-skill]')).toHaveCount(15);
      await expect.poll(function () {
        return page.locator('[data-suitor-card]').evaluateAll(function (cards) {
          return cards.every(function (card) {
            const face = card.querySelector('canvas.pface');
            const s = FB.state, c = s.chars[card.dataset.suitorCard];
            const look = c && FB.characterLook(c, s.date.year, s);
            return c && c.sex === 'f' && look.female &&
              face && face._fbPortraitStamp &&
              face._fbPortraitStamp.indexOf('|' + FB.characterVisualKey(s, c) + '@') >= 0 &&
              face.dataset.cid === card.dataset.suitorCard &&
              card.querySelectorAll('button[data-trait]').length > 0;
          });
        });
      }).toBe(true);
      const prospect = page.locator('[data-suitor]').nth(1);
      const id = await prospect.getAttribute('data-suitor');
      const preview = await page.evaluate(function (id) {
        const s = FB.state, c = s.chars[id];
        return { ids:s.player.suitorIds.slice(), character:{ id:c.id, name:c.name, sex:c.sex,
          born:c.born, culture:c.culture, religion:c.religion,
          skills:c.skills, traits:c.traits } };
      }, id);
      await prospect.click();
      await expect(page.locator('#ev-title')).toContainText('A Possible Match');
      expect(await page.evaluate(function () {
        const s = FB.state;
        return { deed:!!s.player.flags.tut_deed, courting:s.player.courtingId,
          spouses:FB.spousesSnapshot(s, s.chars[s.player.charId]).length };
      })).toEqual({ deed:true, courting:id, spouses:0 });
      expect(await page.evaluate(function (ids) {
        return ids.filter(function (id) { return !!FB.state.chars[id]; });
      }, preview.ids)).toEqual([id]);
      await expect.poll(function () {
        return page.evaluate(function () { return FB.ui.eventInputGuarded(); });
      }).toBe(false);
      await page.locator('#ev-options').getByRole('button', {
        name:/Pursue this match/
      }).click();
      const attention = page.locator('.coachmark');
      await expect(attention).toContainText('already has your personal attention');
      await expect(attention).toContainText('Use Play');
      await expect(attention).not.toContainText('Kin');
      await expect(attention).not.toContainText('Tap your portrait');
      await expect(page.locator('#timebtns')).toHaveClass(/coachmark-lit/);
      await expect(page.locator('#lefttabs .tab[data-tab="family"]'))
        .not.toHaveClass(/coachmark-lit/);
      expect(await page.evaluate(function () {
        const s = FB.state;
        return { assigned:FB.socialAttentionStatus(s, s.chars[s.player.courtingId]).assigned,
          timeLesson:!!FB.game.uiPrefs.tipsSeen['first-time-flow'],
          resultLesson:!!FB.game.uiPrefs.tipsSeen['first-event-result'],
          answeredEvent:!!s.player.flags.tut_event };
      })).toEqual({ assigned:true, timeLesson:false, resultLesson:false,
        answeredEvent:false });
      expect(await page.evaluate(function () {
        return { paused:FB.game.paused, unpaused:!!FB.state.player.flags.tut_unpause };
      })).toEqual({ paused:true, unpaused:false });
      await attention.getByRole('button', { name:'Got it', exact:true }).click();
      await expect(page.locator('.coachmark')).toContainText('unpause with Play');
      await page.locator('.coachmark').getByRole('button', { name:'Got it', exact:true }).click();
      await page.evaluate(function () {
        const s = FB.state;
        // Use the real Play handler, then bound the fixture before a live tick.
        document.getElementById('btn-endturn').click();
        FB.game.setPaused(true);
        s.player.gold = 1000;
        FB.adjustStanding(s, { kind:'character', id:s.player.courtingId },
          100, 'spec:proposal-ready-before-event');
        FB.ui.refresh();
      });
      await expect(page.locator('.coachmark')).toHaveCount(0);
      expect(await page.evaluate(function () {
        return { event:!!FB.state.player.flags.tut_event,
          proposalLesson:!!FB.game.uiPrefs.tipsSeen['family-propose'],
          firstSteps:!!FB.state.player.flags.tut_track_first_steps };
      })).toEqual({ event:false, proposalLesson:false, firstSteps:false });
      await page.evaluate(function () {
        FB.state.player.flags.tut_ev_welcome = 1;
        FB.ui.runEvents([{ id:'tut_welcome', ctx:{} }]);
      });
      await expect(page.locator('#ev-title')).toContainText('A Neighbor’s Welcome');
      await expect.poll(function () {
        return page.evaluate(function () { return FB.ui.eventInputGuarded(); });
      }).toBe(false);
      await page.locator('#ev-options .evopt').first().click();
      await expect(page.locator('.coachmark')).toContainText('Your choice changed the story');
      await page.locator('.coachmark').getByRole('button', { name:'Got it', exact:true }).click();
      await expect(page.locator('.coachmark')).toContainText('use Propose marriage');
      await page.locator('[data-action-id="propose"]').click();
      await expect(page.locator('#ev-title')).toContainText('The Question Is Asked');
      expect(await page.evaluate(function () {
        const s = FB.state;
        return { spouses:FB.spousesSnapshot(s, s.chars[s.player.charId]).length,
          enterpriseLesson:!!FB.game.uiPrefs.tipsSeen['cg-enterprise-ready'] };
      })).toEqual({ spouses:0, enterpriseLesson:false });
      await expect.poll(function () {
        return page.evaluate(function () { return FB.ui.eventInputGuarded(); });
      }).toBe(false);
      await page.locator('#ev-options .evopt').first().click();
      await continueDecisionOutcome(page);
      await expect(page.locator('.coachmark')).toContainText('Start your family business');
      expect(await page.evaluate(function () {
        const s = FB.state;
        return FB.spousesSnapshot(s, s.chars[s.player.charId]).map(function (c) {
          return { id:c.id, name:c.name, sex:c.sex, born:c.born, culture:c.culture,
            religion:c.religion, skills:c.skills, traits:c.traits };
        });
      })).toEqual([preview.character]);
    });

  test('CrazyGames ' + viewport.name + ' resumes an assigned courtship hint at Play',
    async function ({ page }, testInfo) {
      await page.setViewportSize({ width:viewport.width, height:viewport.height });
      await startPortal(page, testInfo);
      expect(await page.evaluate(function () {
        FB.ui.coachmarkReset();
        const s = FB.state, candidates = FB.spawnSuitor(s);
        const candidate = candidates[1] || candidates[0];
        FB.pickSuitor(s, candidate.id);
        const began = FB.beginCourtship(s, candidate);
        s.player.flags.tut_deed = 1;
        FB.ui.resumeFirstPlayerTip();
        return began;
      })).toBe(true);
      await expect(page.locator('.coachmark')).toContainText('already has your personal attention');
      await saveAndContinue(page, testInfo);
      const attention = page.locator('.coachmark');
      await expect(attention).toContainText('Use Play');
      await expect(attention).not.toContainText('Kin');
      await expect(page.locator('#timebtns')).toHaveClass(/coachmark-lit/);
      await expect(page.locator('body')).not.toHaveClass(/showself/);
      const played = await page.locator('#btn-endturn').evaluate(function (button) {
        const s = FB.state, before = JSON.stringify(s.player.socialAttention);
        button.click();
        const result = {running:!FB.game.paused,unpaused:!!s.player.flags.tut_unpause,
          learned:!!FB.game.uiPrefs.tipsSeen['family-courtship'],
          sameAssignment:before === JSON.stringify(s.player.socialAttention)};
        // Exercise the real control while keeping the fixture before its first tick.
        FB.game.setPaused(true);
        return result;
      });
      expect(played).toEqual({running:true,unpaused:true,learned:true,sameAssignment:true});
      await expect(page.locator('.coachmark')).toHaveCount(0);
    });

  test('CrazyGames ' + viewport.name + ' guides enterprise, freedom, and land before childbirth',
    async function ({ page }, testInfo) {
      await page.setViewportSize({ width:viewport.width, height:viewport.height });
      await startPortal(page, testInfo);
      await page.evaluate(function () {
        // Keep event answers from advancing extra days between the bounded
        // purchases, including after the journey saves and continues.
        FB.game.uiPrefs.autoResumeAfterEvents = false;
        FB.game.saveUiPrefs();
      });
      await marryForEnterprise(page);
      await finishOpeningLoop(page, 0);
      const plan = page.locator('.coachmark', { hasText:'Your next goal is a family business' });
      await expect(plan).toBeVisible();
      await expect(plan).toContainText('more');
      await expect(page.locator('.tutorial-card')).toContainText('Making a living');
      await expect(page.locator('.tutorial-card')).toContainText('Secure your household’s freedom');
      await expect(page.locator('[data-action-id="livelihoods"]'))
        .toHaveClass(/coachmark-lit/);
      expect(await page.evaluate(function () {
        const s = FB.state;
        return { gold:s.player.gold, enterprises:s.player.enterprises.length,
          spouses:FB.spousesSnapshot(s, s.chars[s.player.charId]).length,
          familyDone:!!s.player.flags.tut_track_family_legacy,
          mapSeen:!!FB.game.uiPrefs.tipsSeen['map-controls'] };
      })).toEqual({ gold:0, enterprises:0, spouses:1, familyDone:false, mapSeen:false });
      await plan.getByRole('button', { name:'Got it', exact:true }).click();
      const saving = page.locator('.coachmark', { hasText:'Choose an earning Daily Focus' });
      await expect(saving).toBeVisible();
      await expect(saving).toContainText('Play or Skip season');
      expect(await page.evaluate(function () {
        const seen = FB.game.uiPrefs.tipsSeen;
        return { saving:!!seen['cg-enterprise-saving'], health:!!seen['health-warning'] };
      })).toEqual({ saving:false, health:false });
      // An unread saving lesson stays ahead of health through Continue.
      await saveAndContinue(page, testInfo);
      await expect(saving).toBeVisible();
      await saving.getByRole('button', { name:'Got it', exact:true }).click();
      const health = page.locator('.coachmark', { hasText:'Low health greatly increases' });
      await expect(health).toContainText('chance of dying');
      await expect(health).toContainText('Rest and mend under Daily Focus in Deeds');
      await expect(page.locator('#tb-health')).toHaveClass(/coachmark-lit/);
      expect(await page.evaluate(function () {
        const seen = FB.game.uiPrefs.tipsSeen;
        return { saving:!!seen['cg-enterprise-saving'], health:!!seen['health-warning'] };
      })).toEqual({ saving:true, health:false });
      // Continue resumes the warning until acknowledged, then health changes
      // must not repeat this once-per-profile lesson.
      await saveAndContinue(page, testInfo);
      await expect(health).toBeVisible();
      await health.getByRole('button', { name:'Got it', exact:true }).click();
      expect(await page.evaluate(function () {
        const me = FB.state.chars[FB.state.player.charId];
        const previousHealth = me.health;
        me.health = 4;
        FB.ui.refresh();
        FB.ui.resumeFirstPlayerTip();
        me.health = previousHealth;
        return { memory:FB.game.uiPrefs.tipsSeen['health-warning'],
          stored:JSON.parse(localStorage.getItem('fb_ui')).tipsSeen['health-warning'] };
      })).toEqual({ memory:1, stored:1 });
      await expect(page.locator('.coachmark')).toHaveCount(0);

      const purchase = await page.evaluate(function () {
        const s = FB.state;
        const field = FB.enterprisePurchaseStatus(s, 'field_strip',
          s.player.provinceId, 0);
        // Funding is a bounded fixture for the reminder, not a simulated grind.
        s.player.gold = field.cost;
        FB.ui.refresh();
        return { cost:field.cost, label:FB.money(field.cost) };
      });
      const ready = page.locator('.coachmark', { hasText:'Start your family business' });
      await expect(ready).toBeVisible();
      await expect(ready).toContainText(purchase.label);
      await page.locator('[data-action-id="livelihoods"]').click();
      const businesses = page.locator('[data-list-section="new-enterprises"] .large-list-section-toggle');
      if (await businesses.getAttribute('aria-expanded') === 'false') await businesses.click();
      await page.locator('[data-enterprise-settlement="0"]').click();
      await expect(page.locator('[data-enterprise-buy="field_strip"]')).toBeEnabled();
      await page.locator('[data-enterprise-buy="field_strip"]').click();
      expect(await page.evaluate(function () {
        const s = FB.state;
        return { gold:s.player.gold, enterprise:s.player.enterprises[0].type,
          familyDone:!!s.player.flags.tut_track_family_legacy };
      })).toEqual({ gold:0, enterprise:'field_strip', familyDone:false });
      await page.locator('#genmodal [data-modal-nav="close"]').click();
      // Buying spends a day, so the fixture's marriage dues now come due.
      // Guidance must wait for that real event, then resume the household goal.
      await expect(page.locator('#ev-title')).toHaveText('Leave to Wed');
      expect(await page.evaluate(function () {
        return { busy:FB.ui.eventsBusy(),
          learned:!!FB.game.uiPrefs.tipsSeen['cg-enterprise-income'] };
      })).toEqual({ busy:true, learned:false });
      await expect.poll(function () {
        return page.evaluate(function () { return FB.ui.eventInputGuarded(); });
      }).toBe(false);
      await page.locator('#ev-options').getByRole('button', {
        name:/Work the fine in extra days/
      }).click();
      await expect(page.locator('#eventmodal')).toHaveClass(/hidden/);
      // The household goal stays ahead of the map tour and hostile-deed lesson.
      await expect(page.locator('.coachmark')).toContainText('enterprise can help fund your freedom');
      await page.locator('.coachmark').getByRole('button', { name:'Got it', exact:true }).click();
      await expect(page.locator('.coachmark')).toContainText('Your next goal is freedom');
      const freedomPrice = await page.evaluate(function () {
        return FB.freedomPurchaseStatus(FB.state).quote.price;
      });
      await saveAndContinue(page, testInfo);
      await expect(page.locator('.coachmark')).toContainText('Your next goal is freedom');
      expect(await page.evaluate(function () {
        const s = FB.state, p = s.player;
        return { tier:p.tier, gold:p.gold, children:s.chars[p.charId].childrenIds.length,
          map:!!FB.game.uiPrefs.tipsSeen['map-controls'],
          poach:!!FB.game.uiPrefs.tipsSeen['first-poach'],
          freedom:FB.tutorialStatus(s).steps.find(function (step) {
            return step.id === 'freedom';
          }).done };
      })).toEqual({ tier:0, gold:0, children:0, map:false, poach:false, freedom:false });
      await page.locator('.coachmark').getByRole('button', { name:'Got it', exact:true }).click();
      await page.evaluate(function (price) {
        FB.state.player.gold = price;
        FB.ui.refresh();
      }, freedomPrice);
      await expect(page.locator('.coachmark')).toContainText('You can now buy your household’s freedom');
      await page.locator('[data-action-id="review_serf_tenure"]').click();
      await page.locator('#rank-buy-freedom').click();
      await page.locator('#freedom-purchase-confirm').click();
      await continueDecisionOutcome(page);
      await expect(page.locator('.coachmark')).toContainText('Your household is free. Save for your first land plot');
      expect(await page.evaluate(function () {
        const s = FB.state;
        return { tier:s.player.tier, plots:FB.landPlots(s).length,
          children:s.chars[s.player.charId].childrenIds.length,
          familyDone:!!s.player.flags.tut_track_family_legacy,
          freedom:FB.tutorialStatus(s).steps.find(function (step) {
            return step.id === 'freedom';
          }).done };
      })).toEqual({ tier:1, plots:0, children:0, familyDone:false, freedom:true });
      await page.locator('.coachmark').getByRole('button', { name:'Got it', exact:true }).click();
      const landPrice = await page.evaluate(function () {
        const price = FB.landPlotCost(FB.state);
        FB.state.player.gold = price;
        FB.ui.refresh();
        return price;
      });
      await expect(page.locator('.coachmark')).toContainText('can afford its first land plot');
      await page.locator('[data-action-id="buy_land"]').click();
      await page.locator('[data-land-settlement="0"]').click();
      expect(await page.evaluate(function () {
        return { plots:FB.landPlots(FB.state).length, gold:FB.state.player.gold,
          price:FB.landPlotCost(FB.state) };
      })).toEqual({ plots:1, gold:0, price:landPrice });
      await page.locator('#genmodal [data-modal-nav="close"]').click();
      await expect(page.locator('.coachmark')).toContainText('Your first plot of land');
      await page.locator('.coachmark').getByRole('button', { name:'Got it', exact:true }).click();
      await expect(page.locator('.coachmark')).toContainText('map is yours to explore');
      expect(await page.evaluate(function () {
        return { livingDone:!!FB.state.player.flags.tut_track_making_a_living,
          familyDone:!!FB.state.player.flags.tut_track_family_legacy,
          children:FB.state.chars[FB.state.player.charId].childrenIds.length };
      })).toEqual({ livingDone:true, familyDone:false, children:0 });
    });
}

test('CrazyGames waits through paid final service and resumes land guidance after release',
  async function ({ page }, testInfo) {
    await startPortal(page, testInfo);
    await page.evaluate(function () {
      // Final service advances only at the explicit turn boundaries below.
      FB.game.uiPrefs.autoResumeAfterEvents = false;
      FB.game.saveUiPrefs();
    });
    await marryForEnterprise(page);
    const terms = await page.evaluate(function () {
      const s = FB.state;
      s.player.gold = 1000;
      const bought = FB.buyEnterprise(s, 'field_strip', 0);
      const lord = FB.getRole(s, 'lord', true);
      const ref = { kind:'character', id:lord.id };
      FB.adjustStanding(s, ref, 60 - FB.standingOf(s, ref), 'spec:freedom-terms');
      const offer = FB.createFreedomOffer(s, 'petition');
      return { bought:!!bought, price:offer.price, serviceDays:offer.serviceDays };
    });
    expect(terms.bought).toBe(true);
    expect(terms.serviceDays).toBe(90);
    await finishOpeningLoop(page, 0);
    await expect(page.locator('.coachmark')).toContainText('enterprise can help fund your freedom');
    await page.locator('.coachmark').getByRole('button', { name:'Got it', exact:true }).click();
    await expect(page.locator('.coachmark')).toContainText('Your saved freedom terms cost');
    await expect(page.locator('.coachmark')).toContainText('90 days of final service');
    expect(await page.evaluate(function () {
      return FB.freedomOfferAcceptanceStatus(FB.state).ready;
    })).toBe(false);
    await page.locator('.coachmark').getByRole('button', { name:'Got it', exact:true }).click();
    await page.evaluate(function (price) {
      FB.state.player.gold = price;
      FB.ui.refresh();
    }, terms.price);
    await expect(page.locator('.coachmark')).toContainText('You can accept these terms now');
    await page.locator('[data-action-id="review_serf_tenure"]').click();
    await page.locator('#rank-petition-freedom').click();
    await page.locator('#freedom-offer-accept').click();
    await continueDecisionOutcome(page);
    await expect(page.locator('.coachmark')).toContainText('Finish your final service');
    const paid = await page.evaluate(function () {
      const s = FB.state;
      const offer = s.player.freedomOffer;
      return { tier:s.player.tier, status:offer.status, paid:offer.paidPrice,
        land:FB.landPlots(s).length, remaining:offer.serviceEndTurn - s.turn };
    });
    expect(paid).toMatchObject({ tier:0, status:'service', paid:terms.price, land:0 });
    expect(paid.remaining).toBeGreaterThan(0);
    await saveAndContinue(page, testInfo);
    await expect(page.locator('.coachmark')).toContainText('Finish your final service');
    await page.locator('.coachmark').getByRole('button', { name:'Got it', exact:true }).click();
    await page.evaluate(function () {
      const s = FB.state;
      s.turn = s.player.freedomOffer.serviceEndTurn - 1;
      FB.freedomDay(s);
      FB.ui.refresh();
    });
    await expect(page.locator('.coachmark')).toHaveCount(0);
    expect(await page.evaluate(function () { return FB.state.player.tier; })).toBe(0);
    await page.evaluate(function () {
      const s = FB.state;
      s.turn = s.player.freedomOffer.serviceEndTurn;
      FB.freedomDay(s);
      FB.ui.refresh();
    });
    await expect(page.locator('.coachmark')).toContainText('Your household is free. Save for your first land plot');
    expect(await page.evaluate(function () {
      const s = FB.state;
      return { tier:s.player.tier, land:FB.landPlots(s).length,
        children:s.chars[s.player.charId].childrenIds.length,
        track:FB.tutorialStatus(s).track.id };
    })).toEqual({ tier:1, land:0, children:0, track:'making_a_living' });
  });

test('CrazyGames skips freedom for a free household and skips already-owned property',
  async function ({ page }, testInfo) {
    await startPortal(page, testInfo);
    await marryForEnterprise(page);
    expect(await page.evaluate(function () {
      const s = FB.state;
      s.player.gold = 1000;
      return !!FB.buyEnterprise(s, 'field_strip', 0) &&
        !!FB.resolveSerfFreedom(s, { route:'purchase' }, {});
    })).toBe(true);
    await finishOpeningLoop(page, 0);
    await expect(page.locator('.coachmark')).toContainText('Save for your first land plot');
    expect(await page.evaluate(function () {
      const seen = FB.game.uiPrefs.tipsSeen;
      return { income:!!seen['cg-enterprise-income'],
        freedom:!!seen['cg-freedom-plan'], ready:!!seen['cg-freedom-ready'] };
    })).toEqual({ income:false, freedom:false, ready:false });
    await page.locator('.coachmark').getByRole('button', { name:'Got it', exact:true }).click();
    expect(await page.evaluate(function () {
      const s = FB.state;
      s.player.gold = FB.landPlotCost(s);
      const bought = FB.buyLandPlot(s, 0);
      FB.ui.coachmarkReset();
      FB.ui.refresh();
      return bought;
    })).toBe(true);
    await expect(page.locator('.coachmark')).toContainText('map is yours to explore');
    expect(await page.evaluate(function () {
      return !!FB.state.player.flags.tut_track_making_a_living;
    })).toBe(true);
  });

test('CrazyGames keeps economic guidance after a child completes the family track',
  async function ({ page }, testInfo) {
    await startPortal(page, testInfo);
    await marryForEnterprise(page);
    await page.evaluate(function () {
      const s = FB.state, p = s.player, me = s.chars[p.charId];
      p.gold = 1000;
      FB.buyEnterprise(s, 'field_strip', 0);
      p.flags.tut_kin_tab = 1;
      p.flags.tut_family_guidance_started = 1;
      const child = FB.makeCharacter(s, {
        name:'First Child', sex:'f', culture:me.culture, religion:me.religion,
        born:s.date.year, dyn:me.dyn, fatherId:me.id, motherId:me.spouseId, traitsN:0
      });
      me.childrenIds.push(child.id);
    });
    await finishOpeningLoop(page, 0);
    await expect(page.locator('.coachmark')).toContainText('enterprise can help fund your freedom');
    expect(await page.evaluate(function () {
      return { familyDone:!!FB.state.player.flags.tut_track_family_legacy,
        track:FB.tutorialStatus(FB.state).track.id };
    })).toEqual({ familyDone:true, track:'making_a_living' });
    await page.locator('.coachmark').getByRole('button', { name:'Got it', exact:true }).click();
    await expect(page.locator('.coachmark')).toContainText('Your next goal is freedom');
  });

test('CrazyGames resumes unread marriage and enterprise prompts and respects Stop tips',
  async function ({ page }, testInfo) {
    await startPortal(page, testInfo);
    await saveAndContinue(page, testInfo);
    await expect(page.locator('.coachmark')).toContainText('use Seek a match');
    await marryForEnterprise(page);
    await finishOpeningLoop(page, 0);
    await expect(page.locator('.coachmark')).toContainText('Your next goal is a family business');
    await saveAndContinue(page, testInfo);
    await expect(page.locator('.coachmark')).toContainText('Your next goal is a family business');
    await page.locator('.coachmark').getByRole('button', { name:'Stop tips', exact:true }).click();
    await page.evaluate(function () {
      FB.state.player.gold = 1000;
      FB.ui.refresh();
    });
    await expect(page.locator('.coachmark')).toHaveCount(0);
    await saveAndContinue(page, testInfo);
    await expect(page.locator('.coachmark')).toHaveCount(0);
  });

test('CrazyGames does not recommend an enterprise with unmet nonfinancial requirements',
  async function ({ page }, testInfo) {
    await startPortal(page, testInfo);
    await marryForEnterprise(page);
    await page.evaluate(function () {
      for (const id in FBDATA.enterprises) FBDATA.enterprises[id].devMin = 999;
    });
    await finishOpeningLoop(page, 1000);
    await expect(page.locator('.coachmark')).toContainText('map is yours to explore');
    await expect(page.locator('.coachmark')).not.toContainText('family business');
  });

test('CrazyGames waits for courtship and a successful wedding before any enterprise hint',
  async function ({ page }, testInfo) {
    await startPortal(page, testInfo);
    const courtship = await page.evaluate(function () {
      const s = FB.state;
      const candidates = FB.spawnSuitor(s);
      const candidate = candidates[1] || candidates[0];
      FB.pickSuitor(s, candidate.id);
      const began = FB.beginCourtship(s, candidate);
      return { began:began, days:FB.socialAttentionDaysToThreshold(s, candidate, true) };
    });
    expect(courtship.began).toBe(true);
    expect(courtship.days).toBeGreaterThan(0);
    await finishOpeningLoop(page, 1000);
    const attention = page.locator('.coachmark', { hasText:'already has your personal attention' });
    await expect(attention).toBeVisible();
    await expect(attention).toContainText('About ' + courtship.days + ' in-game day');
    await expect(attention).toContainText('Use Play');
    await expect(attention).not.toContainText('Kin');
    await expect(page.locator('#timebtns')).toHaveClass(/coachmark-lit/);
    expect(await page.evaluate(function () {
      const s = FB.state;
      return { proposal:FB.instantStatus(s, 'propose').can,
        business:s.player.enterprises.length,
        familyIntro:!!FB.game.uiPrefs.tipsSeen['family-guidance'],
        map:!!FB.game.uiPrefs.tipsSeen['map-controls'] };
    })).toEqual({ proposal:false, business:0, familyIntro:false, map:false });
    await attention.getByRole('button', { name:'Got it', exact:true }).click();
    await expect(page.locator('.coachmark')).toContainText('Keep courting your match');
    await page.locator('.coachmark').getByRole('button', { name:'Got it', exact:true }).click();
    await expect(page.locator('.coachmark')).toHaveCount(0);
    await saveAndContinue(page, testInfo);
    await expect(page.locator('.coachmark')).toHaveCount(0);
    await page.evaluate(function () {
      const s = FB.state;
      FB.adjustStanding(s, { kind:'character', id:s.player.courtingId },
        100, 'spec:crazygames-courtship');
      FB.ui.refresh();
    });
    await expect(page.locator('.coachmark')).toContainText('use Propose marriage');
    await expect(page.locator('.coachmark')).toContainText('This proposal will be accepted.');
    await expect(page.locator('[data-action-id="propose"]')).toHaveClass(/coachmark-lit/);
    await page.locator('.coachmark').getByRole('button', { name:'Got it', exact:true }).click();
    await page.evaluate(function () { FB.ui.refresh(); });
    await expect(page.locator('.coachmark')).toHaveCount(0);
    expect(await page.evaluate(function () {
      const seen = FB.game.uiPrefs.tipsSeen;
      return { plan:!!seen['cg-enterprise-plan'], saving:!!seen['cg-enterprise-saving'],
        purchase:!!seen['cg-enterprise-ready'],
        spouses:FB.spousesSnapshot(FB.state,
          FB.state.chars[FB.state.player.charId]).length };
    })).toEqual({ plan:false, saving:false, purchase:false, spouses:0 });
  });

for (const viewport of [
  { name:'phone portrait', width:390, height:844 },
  { name:'phone landscape', width:844, height:390 },
  { name:'tablet', width:768, height:1024 }
]) {
  test('CrazyGames ' + viewport.name + ' keeps Kin guidance through the portrait and drawer',
    async function ({ page }, testInfo) {
      await page.setViewportSize({ width:viewport.width, height:viewport.height });
      await startPortal(page, testInfo);
      expect(await page.evaluate(function () {
        FB.ui.coachmarkReset();
        FB.state.player.flags.tut_track_first_steps = 1;
        return FB.ui.maybeTabTip('family');
      })).toBe(true);
      const hint = page.locator('.coachmark');
      const portrait = page.locator('#tb-portrait');
      const kin = page.locator('#lefttabs .tab[data-tab="family"]');
      await expect(hint).toContainText('Tap your portrait, then choose Kin.');
      await expect(hint).not.toHaveClass(/noarrow/);
      await expect(portrait).toHaveClass(/coachmark-lit/);
      await expect(kin).not.toBeVisible();
      const portraitBox = await portrait.boundingBox();
      const hintBox = await hint.boundingBox();
      expect(hintBox.y).toBeGreaterThanOrEqual(portraitBox.y + portraitBox.height);
      expect(hintBox.x).toBeGreaterThanOrEqual(0);
      expect(hintBox.x + hintBox.width).toBeLessThanOrEqual(viewport.width);
      expect(hintBox.y + hintBox.height).toBeLessThanOrEqual(viewport.height);

      await portrait.click();
      await expect(page.locator('body')).toHaveClass(/showself/);
      await expect(hint).toContainText('Kin is your household and dynasty');
      await expect(hint).not.toContainText('Tap your portrait');
      await expect(kin).toHaveClass(/coachmark-lit/);
      await expect(portrait).not.toHaveClass(/coachmark-lit/);
      expect(await page.evaluate(function () {
        return { kin:!!FB.game.uiPrefs.tipsSeen['area-kin'],
          self:!!FB.game.uiPrefs.tipsSeen['area-self'] };
      })).toEqual({ kin:false, self:false });
      const kinBox = await kin.boundingBox();
      const drawerHintBox = await hint.boundingBox();
      expect(drawerHintBox.y).toBeGreaterThanOrEqual(kinBox.y + kinBox.height);

      await page.locator('#btn-closeself').click();
      await expect(hint).toContainText('Tap your portrait, then choose Kin.');
      await expect(portrait).toHaveClass(/coachmark-lit/);
      await expect(kin).not.toHaveClass(/coachmark-lit/);
      await portrait.click();
      await kin.click();
      await expect(page.locator('#tab-family')).toBeVisible();
      await expect(hint).toHaveCount(0);
      expect(await page.evaluate(function () {
        return !!FB.game.uiPrefs.tipsSeen['area-kin'];
      })).toBe(true);
    });

  test('CrazyGames ' + viewport.name + ' reanchors Self guidance as the layout changes',
    async function ({ page }, testInfo) {
      await page.setViewportSize({ width:viewport.width, height:viewport.height });
      await startPortal(page, testInfo);
      expect(await page.evaluate(function () {
        FB.ui.coachmarkReset();
        return FB.ui.maybeSelfTip();
      })).toBe(true);
      const hint = page.locator('.coachmark');
      const portrait = page.locator('#tb-portrait');
      const self = page.locator('#lefttabs .tab[data-tab="char"]');
      await expect(hint).toContainText('Tap your portrait to open Self');
      await expect(portrait).toHaveClass(/coachmark-lit/);

      await page.setViewportSize({ width:1280, height:800 });
      await expect(self).toHaveClass(/coachmark-lit/);
      await expect(portrait).not.toHaveClass(/coachmark-lit/);
      await expect(hint).toContainText('Self shows your character');
      await expect(hint).toHaveClass(/over-map/);
      await page.setViewportSize({ width:viewport.width, height:viewport.height });
      await expect(hint).toContainText('Tap your portrait to open Self');
      await expect(hint).not.toHaveClass(/over-map|noarrow/);
      await expect(portrait).toHaveClass(/coachmark-lit/);

      // Opening the drawer through navigation must update an already-open hint too.
      await page.evaluate(function () { FB.ui.showTab('char'); });
      await expect(hint).toContainText('Self shows your character');
      await expect(hint).not.toContainText('Tap your portrait');
      await expect(self).toHaveClass(/coachmark-lit/);
      await page.locator('#btn-closeself').click();
      await expect(portrait).toHaveClass(/coachmark-lit/);
      await expect(hint).toContainText('Tap your portrait to open Self');
      await portrait.click();
      await expect(hint).toHaveCount(0);
      await expect(page.locator('#tab-char')).toBeVisible();
    });
}

test('CrazyGames still explains assigning attention when courtship has no assignment',
  async function ({ page }, testInfo) {
    await startPortal(page, testInfo);
    expect(await page.evaluate(function () {
      FB.ui.coachmarkReset();
      const s = FB.state, candidates = FB.spawnSuitor(s);
      const candidate = candidates[1] || candidates[0];
      FB.pickSuitor(s, candidate.id);
      if (!FB.beginCourtship(s, candidate)) return false;
      FB.socialAttentionWithdraw(s, candidate.id, true);
      return FB.ui.maybeFamilyCourtshipTip();
    })).toBe(true);
    await expect(page.locator('.coachmark')).toContainText('Give them personal attention');
    await expect(page.locator('.coachmark')).not.toContainText('already has your personal attention');
    await expect(page.locator('#lefttabs .tab[data-tab="family"]')).toHaveClass(/coachmark-lit/);
    await expect(page.locator('#timebtns')).not.toHaveClass(/coachmark-lit/);
  });

test('CrazyGames falls back to an available deed for an already married start',
  async function ({ page }, testInfo) {
    await startPortal(page, testInfo);
    await page.evaluate(function () {
      FB.ui.coachmarkReset();
      const s = FB.state, me = s.chars[s.player.charId];
      const spouse = FB.makeCharacter(s, {
        sex:'f', culture:me.culture, religion:me.religion,
        born:me.born, role:'spouse'
      });
      me.spouseId = spouse.id;
      spouse.spouseId = me.id;
      s.roles.spouse = spouse.id;
      FB.ui.resumeFirstPlayerTip();
    });
    await expect(page.locator('.coachmark')).toContainText('Try Go into town');
    await expect(page.locator('[data-action-id="go_to_town"]')).toHaveClass(/coachmark-lit/);
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

for (const width of [907, 390]) {
  test('business shortcut reviews costs before buying at width ' + width,
    async function ({ page }, testInfo) {
      await page.setViewportSize({ width:width, height:width === 907 ? 510 : 844 });
      await startPortal(page, testInfo);
      await marryForEnterprise(page);
      await finishOpeningLoop(page, 0);
      const before = await page.evaluate(function () {
        return { turn:FB.state.turn, rng:FB.getRngState() };
      });
      /* the coachmark path returns to the deed it pointed at: record the
         Deeds scroll owner's offset so closing cannot jump to the checklist */
      const deedsScroll = function (restore) {
        let node = document.querySelector('#tab-actions [data-action-id="livelihoods"]') ||
          document.getElementById('tab-actions');
        while (node && node !== document.body) {
          const style = getComputedStyle(node);
          if (/(auto|scroll)/.test(style.overflowY) && node.scrollHeight > node.clientHeight) {
            if (restore === undefined) return node.scrollTop;
            return Math.abs(node.scrollTop - restore) <= 1;
          }
          node = node.parentElement;
        }
        return restore === undefined ? 0 : true;
      };
      const scrollBefore = await page.evaluate(deedsScroll);
      await page.locator('.coachmark-enterprise').click();
      await expect(page.locator('#enterprise-review-buy')).toBeDisabled();
      await expect(page.locator('[data-enterprise-blocker="funds"]')).toBeVisible();
      expect(await page.evaluate(function () {
        return { turn:FB.state.turn, rng:FB.getRngState(), gold:FB.state.player.gold,
          enterprises:FB.state.player.enterprises.length };
      })).toEqual({ turn:before.turn, rng:before.rng, gold:0, enterprises:0 });
      // Root reviews use the shared disabled Back and enabled Close footer.
      await expect(page.locator('#enterprise-requirements-back')).toHaveText('Back');
      await expect(page.locator('#enterprise-requirements-back')).toBeDisabled();
      await page.locator('#genmodal [data-modal-nav="close"]').click();
      await expect(page.locator('#genmodal')).toHaveClass(/hidden/);
      await expect(page.locator('#tutorial-business-review')).toBeVisible();
      await expect(page.locator('#tutorial-business-review')).not.toBeFocused();
      expect(await page.evaluate(deedsScroll, scrollBefore)).toBe(true);
      expect(await page.evaluate(function () {
        const button = document.getElementById('tutorial-business-review');
        return button.getBoundingClientRect().height >= 44;
      })).toBe(true);
      const quote = await page.evaluate(function () {
        FB.game.uiPrefs.hideTips = true;
        FB.game.uiPrefs.autoResumeAfterEvents = false;
        FB.ui.coachmarkReset();
        const s = FB.state, offer = FB.ui.crazyGamesFirstEnterprise(s);
        s.player.gold = offer.cost;
        FB.ui.refresh();
        return { cost:offer.cost, type:offer.id, settlement:offer.settlement, turn:s.turn };
      });
      await page.locator('#tutorial-business-review').click();
      await expect(page.locator('#enterprise-review-buy')).toBeEnabled();
      await expect(page.locator('#genmodal')).toContainText('Eligible workers');
      await page.keyboard.press('Escape');
      await expect(page.locator('#genmodal')).toHaveClass(/hidden/);
      await expect(page.locator('#tutorial-business-review')).toBeFocused();
      await page.locator('#tutorial-business-review').press('Enter');
      await expect(page.locator('#enterprise-review-buy')).toBeEnabled();
      expect(await page.evaluate(function () {
        const node = document.getElementById('enterprise-review-buy');
        const rect = node.getBoundingClientRect();
        return rect.left >= 0 && rect.right <= innerWidth;
      })).toBe(true);
      await page.locator('#enterprise-review-buy').click();
      expect(await page.evaluate(function () {
        const s = FB.state, e = s.player.enterprises[0];
        return { gold:s.player.gold, turn:s.turn, count:s.player.enterprises.length,
          type:e.type, settlement:e.settlement };
      })).toEqual({ gold:0, turn:quote.turn + 1, count:1,
        type:quote.type, settlement:quote.settlement });
    });
}

test('a changed business quote requires another review and never silently charges more',
  async function ({ page }, testInfo) {
    await startPortal(page, testInfo);
    await marryForEnterprise(page);
    await finishOpeningLoop(page, 1000);
    await page.locator('.coachmark-enterprise').click();
    const before = await page.evaluate(function () {
      const oldCost = FB.enterpriseCost;
      FB.enterpriseCost = function () { return oldCost.apply(this, arguments) + 1; };
      return { gold:FB.state.player.gold, turn:FB.state.turn };
    });
    await page.locator('#enterprise-review-buy').click();
    await expect(page.locator('#genmodal')).toBeVisible();
    await expect(page.locator('#toasts')).toContainText('requirements changed');
    expect(await page.evaluate(function () {
      return { gold:FB.state.player.gold, turn:FB.state.turn,
        count:FB.state.player.enterprises.length };
    })).toEqual({ gold:before.gold, turn:before.turn, count:0 });
  });

test('objective progress updates during live days without replacing the checklist',
  async function ({ page }, testInfo) {
    await startPortal(page, testInfo);
    const courtship = await prepareCourtship(page);
    await finishOpeningLoop(page, 0);
    await page.evaluate(function () { FB.ui.showTab('actions'); });
    await expect(page.locator('[data-objective-detail]')).toContainText('20 attention days');
    const after = await page.evaluate(function () {
      const s = FB.state, card = document.getElementById('tutorial-objective');
      const rng = FB.getRngState();
      FB.tickSocialAttention(s);
      FB.ui._shared.renderActiveTab({ liveTick:true });
      return { same:card === document.getElementById('tutorial-objective'),
        rngSame:rng === FB.getRngState(),
        days:FB.socialAttentionDaysToThreshold(s, s.chars[s.player.courtingId], true) };
    });
    expect(after).toEqual({ same:true, rngSame:true, days:courtship.days - 1 });
    await expect(page.locator('[data-objective-detail]')).toContainText('19 attention days');
    expect(await page.evaluate(function () {
      const s = FB.state;
      FB.adjustStanding(s, { kind:'character', id:s.player.courtingId }, 100, 'spec:ready');
      return FB.doMarry(s, { settleDowry:false });
    })).toBe(true);
    await finishOpeningLoop(page, 0);
    const funds = await page.evaluate(function () {
      const s = FB.state, card = document.getElementById('tutorial-objective');
      s.player.gold = 3;
      FB.ui._shared.renderActiveTab({ liveTick:true });
      return { same:card === document.getElementById('tutorial-objective'), text:FB.money(3) };
    });
    expect(funds.same).toBe(true);
    await expect(page.locator('[data-objective-detail]')).toContainText(funds.text);
  });

test('Continue previews saved achievements and restores the unfinished household objective',
  async function ({ page }, testInfo) {
    await page.setViewportSize({ width:390, height:844 });
    await startPortal(page, testInfo);
    await marryForEnterprise(page);
    await finishOpeningLoop(page, 1000);
    const saved = await page.evaluate(function () {
      FB.game.uiPrefs.hideTips = true;
      FB.game.saveUiPrefs();
      FB.ui.coachmarkReset();
      const s = FB.state;
      const offer = FB.ui.crazyGamesFirstEnterprise(s);
      FB.buyEnterprise(s, offer.id, offer.settlement);
      s.player.gold = 7;
      FB.ui.showTab('log');
      const rng = FB.getRngState(), turn = s.turn;
      const meta = JSON.parse(FB.save.serialize()).meta;
      return { meta:meta, rngSame:rng === FB.getRngState(), turnSame:turn === s.turn };
    });
    expect(saved.rngSame).toBe(true);
    expect(saved.turnSame).toBe(true);
    expect(saved.meta.household.enterprises).toBe(1);
    expect(saved.meta.household.objective.id).toBe('freedom');
    expect(saved.meta.household.objective.funds).toBe(7);
    expect(saved.meta.household.objective).not.toHaveProperty('text');
    expect(await page.evaluate(function () {
      return new Promise(function (resolve) { FB.save.toSlot('auto', resolve); });
    })).toBe(true);
    await openPortal(page, testInfo);
    await expect(page.locator('#continue-preview')).toContainText(saved.meta.name);
    await expect(page.locator('#continue-preview')).toContainText('Family businesses established: 1');
    await expect(page.locator('[data-continue-objective]')).toContainText('Save for freedom');
    expect(await page.locator('#continue-preview').evaluate(function (node) {
      const rect = node.getBoundingClientRect();
      return rect.left >= 0 && rect.right <= innerWidth && node.scrollWidth <= node.clientWidth;
    })).toBe(true);
    expect(await page.evaluate(function () { return FB.state; })).toBe(null);
    await page.locator('#btn-continue').click();
    await expect(page.locator('#tutorial-objective')).toBeVisible();
    await expect(page.locator('[data-objective-title]')).toHaveText('Save for freedom');
    expect(await page.evaluate(function () { return FB.game.paused; })).toBe(true);
  });

test('freedom funding switches to final-service days without claiming early release',
  async function ({ page }, testInfo) {
    await startPortal(page, testInfo);
    await marryForEnterprise(page);
    await finishOpeningLoop(page, 1000);
    const offer = await page.evaluate(function () {
      FB.game.uiPrefs.hideTips = true;
      FB.ui.coachmarkReset();
      const s = FB.state;
      FB.buyEnterprise(s, 'field_strip', 0);
      const lord = FB.getRole(s, 'lord', true);
      const ref = { kind:'character', id:lord.id };
      FB.adjustStanding(s, ref, 60 - FB.standingOf(s, ref), 'spec:terms');
      const terms = FB.createFreedomOffer(s, 'petition');
      s.player.gold = terms.price;
      FB.ui.refresh();
      return { price:terms.price, days:terms.serviceDays };
    });
    await expect(page.locator('[data-objective-detail]')).toContainText('for your saved terms');
    expect(await page.evaluate(function () {
      const accepted = FB.beginFreedomFinalService(FB.state);
      FB.ui.refresh();
      return !!accepted;
    })).toBe(true);
    await expect(page.locator('[data-objective-title]')).toHaveText('Finish your final service');
    const remaining = await page.evaluate(function () {
      const s = FB.state;
      s.turn += 1;
      FB.ui._shared.renderActiveTab({ liveTick:true });
      return { tier:s.player.tier };
    });
    expect(remaining.tier).toBe(0);
    await expect(page.locator('[data-objective-detail]')).toContainText(String(offer.days - 1) + ' in-game days remain');
  });

test('an old save without preview metadata still offers Continue and gains a live objective',
  async function ({ page }, testInfo) {
    await startPortal(page, testInfo);
    await marryForEnterprise(page);
    await finishOpeningLoop(page, 0);
    expect(await page.evaluate(function () {
      // Keep any page-hide checkpoint in the old metadata shape as well.
      FB.ui.crazyGamesCampaignSummary = function () { return null; };
      const data = JSON.parse(FB.save.serialize());
      delete data.meta.household;
      return new Promise(function (resolve) {
        FB.crazySave.write(JSON.stringify(data), function (ok) { resolve(ok); });
      });
    })).toBe(true);
    await openPortal(page, testInfo);
    await expect(page.locator('#continue-preview')).toBeVisible();
    await expect(page.locator('[data-continue-objective]')).toHaveCount(0);
    await page.locator('#btn-continue').click();
    await expect(page.locator('[data-objective-title]')).toHaveText('Start a family business');
  });

test('optional preview failures cannot prevent saving and hidden guidance stays hidden on Continue',
  async function ({ page }, testInfo) {
    await startPortal(page, testInfo);
    const result = await page.evaluate(function () {
      const summary = FB.ui.crazyGamesCampaignSummary;
      let data;
      try {
        FB.ui.crazyGamesCampaignSummary = function () { throw new Error('preview unavailable'); };
        data = JSON.parse(FB.save.serialize());
      } finally { FB.ui.crazyGamesCampaignSummary = summary; }
      FB.game.uiPrefs.hideBeginnerHints = true;
      FB.game.uiPrefs.hideTips = true;
      FB.game.saveUiPrefs();
      FB.ui.coachmarkReset();
      return { character:data.state.player.charId,
        expected:FB.state.player.charId, summary:data.meta.household || null };
    });
    expect(result.character).toBe(result.expected);
    expect(result.summary).toBe(null);
    await saveAndContinue(page, testInfo);
    await expect(page.locator('#tutorial-objective')).toHaveCount(0);
    await expect(page.locator('.coachmark')).toHaveCount(0);
  });
