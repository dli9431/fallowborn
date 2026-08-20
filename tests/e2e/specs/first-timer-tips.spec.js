'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'js/main.js',
  'js/ui_misc.js',
  'js/ui_modals.js',
  'js/ui_panels.js',
  'js/save.js',
  'js/actions.js',
  'css/style.css'
]);

const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { START_CODE, startDeterministicGame } = require('../support/game/start');
const { openMenu, waitForUiRefresh } = require('../support/game/ui');

test.beforeEach(async function ({ page }, testInfo) {
  await openGame(page, testInfo);
});

async function startFirstCampaign(page) {
  await page.getByRole('button', { name:'New Game', exact:true }).click();
  await page.locator('#ng-seed').fill(START_CODE);
  await page.getByRole('button', { name:/Use this seed/ }).click();
  await page.getByRole('button', { name:'Begin Your Story', exact:true }).click();
  await page.getByRole('button', { name:'Begin', exact:true }).click();
  await expect(page.locator('#game:not(.hidden)')).toBeVisible();
}

async function finishOpeningMapTour(page) {
  const map = page.locator('.coachmark', { hasText:'map is yours to explore' });
  await expect(map).toBeVisible();
  await expect(page.locator('#mapwrap')).toHaveClass(/coachmark-lit/);
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

test('the first prompt begins with the map and is saved only after acknowledgement',
  async function ({ page }, testInfo) {
    await startFirstCampaign(page);
    const coach = page.locator('.coachmark', { hasText:'map is yours to explore' });
    await expect(coach).toBeVisible();
    await expect(page.locator('#mapwrap'))
      .toHaveClass(/coachmark-lit/);

    expect(await page.evaluate(function () {
      return !!FB.game.uiPrefs.tipsSeen['map-controls'];
    })).toBe(false);

    // A screen reset releases an unread tip instead of consuming it.
    expect(await page.evaluate(function () {
      FB.ui.coachmarkReset();
      return FB.ui.resumeFirstPlayerTip();
    })).toBe(true);
    await expect(coach).toBeVisible();
    expect(await page.evaluate(function () {
      return !!FB.game.uiPrefs.tipsSeen['map-controls'];
    })).toBe(false);

    await coach.getByRole('button', { name:'Got it', exact:true }).click();
    const home = page.locator('.coachmark', { hasText:'Use Home to recenter' });
    await expect(home).toBeVisible();
    await expect(page.locator('#btn-home')).toHaveClass(/coachmark-lit/);
    const learned = await page.evaluate(function () {
      return {
        memory:FB.game.uiPrefs.tipsSeen['map-controls'],
        stored:(JSON.parse(localStorage.getItem('fb_ui') || '{}').tipsSeen || {})
          ['map-controls'],
        repeats:FB.ui.resumeFirstPlayerTip()
      };
    });
    expect(learned.memory).toBe(1);
    expect(learned.repeats).toBe(false);
    if (testInfo.project.name.endsWith('-served')) expect(learned.stored).toBe(1);
  });

test('an unread first prompt returns after reload and Continue',
  async function ({ page }, testInfo) {
    test.skip(testInfo.project.name !== 'chromium-served',
      'The reload storage contract belongs to the served origin.');
    await startFirstCampaign(page);
    await expect(page.locator('.coachmark', { hasText:'map is yours to explore' }))
      .toBeVisible();
    expect(await page.evaluate(function () {
      return !!FB.game.uiPrefs.tipsSeen['map-controls'];
    })).toBe(false);

    await page.reload({ waitUntil:'domcontentloaded' });
    await expect(page.locator('#title:not(.hidden)')).toBeVisible();
    await page.locator('#btn-continue').click();
    await expect(page.locator('#game:not(.hidden)')).toBeVisible();
    await expect(page.locator('.coachmark', { hasText:'map is yours to explore' }))
      .toBeVisible();
  });

test('the Deeds lesson hands the player to the flow of days',
  async function ({ page }) {
    await startFirstCampaign(page);
    await finishOpeningMapTour(page);
    await page.getByRole('button', { name:'Got it', exact:true }).click();
    const flow = page.locator('.coachmark', { hasText:'unpause with Play' });
    await expect(flow).toBeVisible();
    await expect(page.locator('#timebtns')).toHaveClass(/coachmark-lit/);
    expect(await page.evaluate(function () {
      return !!FB.game.uiPrefs.tipsSeen['first-time-flow'];
    })).toBe(false);
  });

test('the map sequence comes first and Making a living waits for Family & legacy',
  async function ({ page }) {
    await startFirstCampaign(page);
    await finishOpeningMapTour(page);
    await page.getByRole('button', { name:'Got it', exact:true }).click();
    await page.locator('.coachmark', { hasText:'unpause with Play' })
      .getByRole('button', { name:'Got it', exact:true }).click();
    await page.evaluate(function () {
      const flags = FB.state.player.flags;
      flags.tut_deed = 1;
      flags.tut_unpause = 1;
      flags.tut_event = 1;
      FB.tutorialCheck(FB.state);
    });
    const self = page.locator('.coachmark', {
      hasText:'Self shows your character'
    });
    await expect(self).toBeVisible();
    await expect(page.locator('#lefttabs .tab[data-tab="char"]'))
      .toHaveClass(/coachmark-lit/);
    await self.getByRole('button', { name:'Got it', exact:true }).click();
    await page.evaluate(function () {
      FB.ui.coachmarkReset();
      FB.game.uiPrefs.tipsSeen['area-kin'] = 1;
    });
    expect(await page.evaluate(function () {
      return FB.tutorialStatus(FB.state).track.id;
    })).toBe('family_legacy');
    await page.evaluate(function () {
      const s = FB.state;
      const me = s.chars[s.player.charId];
      s.player.flags.tut_kin_tab = 1;
      me.spouseId = me.spouseId || 'spec_spouse';
      me.childrenIds.push('spec_child');
      FB.tutorialCheck(s);
    });

    const enterprise = page.locator('.coachmark', {
      hasText:'Work, training & enterprises'
    });
    await expect(enterprise).toBeVisible();
    await expect(page.locator('#tab-actions')).toHaveClass(/active/);
    await expect(page.locator('[data-action-group="work"]'))
      .toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('[data-action-id="livelihoods"]'))
      .toHaveClass(/coachmark-lit/);
    expect(await page.evaluate(function () {
      FB.ui.coachmarkReset();
      return FB.ui.resumeFirstPlayerTip();
    })).toBe(true);
    await expect(enterprise).toBeVisible();
    await enterprise.getByRole('button', { name:'Got it', exact:true }).click();
    await expect(page.locator('.coachmark')).toHaveCount(0);
    await page.evaluate(function () {
      const s = FB.state;
      const type = Object.keys(FBDATA.enterprises)[0];
      s.player.enterpriseMigration = 1;
      s.player.enterprises = [{
        uid:'spec_enterprise', type:type, provinceId:s.player.provinceId,
        settlement:0, workerId:null
      }];
      FB.tutorialCheck(s);
    });

    const land = page.locator('.coachmark', { hasText:'Land comes after freedom' });
    await expect(land).toBeVisible();
    await expect(page.locator('[data-action-group="realm"]'))
      .toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('[data-action-id="buy_freedom"]'))
      .toHaveClass(/coachmark-lit/);
    await land.getByRole('button', { name:'Got it', exact:true }).click();
    await expect(page.locator('.coachmark')).toHaveCount(0);
    expect(await page.evaluate(function () {
      const seen = FB.game.uiPrefs.tipsSeen;
      return {
        map:seen['map-controls'],
        home:seen['map-home'],
        filters:seen['map-filters'],
        enterprise:seen['making-enterprise'],
        land:seen['making-land']
      };
    })).toEqual({ map:1, home:1, filters:1, enterprise:1, land:1 });
  });

test('compact layouts teach the map before Self through the portrait',
  async function ({ page }) {
    await page.setViewportSize({ width:768, height:900 });
    await startFirstCampaign(page);
    await finishOpeningMapTour(page);
    await page.getByRole('button', { name:'Got it', exact:true }).click();
    await page.locator('.coachmark', { hasText:'unpause with Play' })
      .getByRole('button', { name:'Got it', exact:true }).click();
    await page.evaluate(function () {
      const flags = FB.state.player.flags;
      flags.tut_deed = 1;
      flags.tut_unpause = 1;
      flags.tut_event = 1;
      FB.tutorialCheck(FB.state);
    });

    const self = page.locator('.coachmark', {
      hasText:'Tap your portrait to open Self'
    });
    await expect(self).toBeVisible();
    await expect(page.locator('#tb-portrait')).toHaveClass(/coachmark-lit/);
    await expect(page.locator('#lefttabs')).not.toBeVisible();
    await page.locator('#tb-portrait').click();
    await expect(page.locator('body')).toHaveClass(/showself/);
    await self.getByRole('button', { name:'Got it', exact:true }).click();

    await expect(page.locator('body')).not.toHaveClass(/showself/);
    await expect(page.locator('.coachmark', { hasText:'map is yours to explore' }))
      .toHaveCount(0);
  });

test('the Kin lesson leads through finding a match and proposing marriage',
  async function ({ page }) {
    await startFirstCampaign(page);
    await finishOpeningMapTour(page);
    await page.getByRole('button', { name:'Got it', exact:true }).click();
    await page.locator('.coachmark', { hasText:'unpause with Play' })
      .getByRole('button', { name:'Got it', exact:true }).click();

    await page.locator('#lefttabs .tab[data-tab="family"]').click();
    await expect(page.locator('.coachmark')).toHaveCount(0);
    expect(await page.evaluate(function () {
      return !!FB.state.player.flags.tut_seen_kin_tab;
    })).toBe(false);

    await page.evaluate(function () {
      const s = FB.state;
      const flags = s.player.flags;
      const seen = FB.game.uiPrefs.tipsSeen;
      seen['map-controls'] = 1;
      seen['map-home'] = 1;
      seen['map-filters'] = 1;
      flags.tut_deed = 1;
      flags.tut_unpause = 1;
      flags.tut_event = 1;
      FB.tutorialCheck(s);
    });

    const kin = page.locator('.coachmark', {
      hasText:'Kin is your household and dynasty'
    });
    await expect(kin).toBeVisible();
    await kin.getByRole('button', { name:'Got it', exact:true }).click();

    const match = page.locator('.coachmark', {
      hasText:'use Seek a match'
    });
    await expect(match).toBeVisible();
    await expect(page.locator('#tab-actions')).toHaveClass(/active/);
    await expect(page.locator('[data-action-group="life"]'))
      .toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('[data-action-id="seek_match"]'))
      .toHaveClass(/coachmark-lit/);
    await match.getByRole('button', { name:'Got it', exact:true }).click();

    expect(await page.evaluate(function () {
      const s = FB.state;
      const candidates = FB.spawnSuitor(s);
      const suitor = candidates[1] || candidates[0];
      FB.pickSuitor(s, suitor.id);
      const began = FB.beginCourtship(s, suitor);
      FB.ui.refresh();
      return began;
    })).toBe(true);
    const courtship = page.locator('.coachmark', {
      hasText:'person under Courting'
    });
    await expect(courtship).toBeVisible();
    await expect(page.locator('#lefttabs .tab[data-tab="family"]'))
      .toHaveClass(/coachmark-lit/);
    await courtship.getByRole('button', { name:'Got it', exact:true }).click();

    await page.evaluate(function () {
      const s = FB.state;
      s.player.gold = 100000;
      FB.adjustStanding(s, { kind:'character', id:s.player.courtingId },
        100, 'spec:family-guidance');
      FB.ui.refresh();
    });
    const proposal = page.locator('.coachmark', {
      hasText:'use Propose marriage'
    });
    await expect(proposal).toBeVisible();
    await expect(page.locator('[data-action-group="life"]'))
      .toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('[data-action-id="propose"]'))
      .toHaveClass(/coachmark-lit/);
  });

test('an established marriage silently skips Family & legacy guidance',
  async function ({ page }) {
    await startFirstCampaign(page);
    await finishOpeningMapTour(page);
    await page.getByRole('button', { name:'Got it', exact:true }).click();
    await page.locator('.coachmark', { hasText:'unpause with Play' })
      .getByRole('button', { name:'Got it', exact:true }).click();

    await page.evaluate(function () {
      const s = FB.state;
      const me = s.chars[s.player.charId];
      const spouse = FB.makeCharacter(s, {
        sex:me.sex === 'm' ? 'f' : 'm',
        culture:me.culture,
        religion:me.religion,
        born:me.born,
        role:'spouse'
      });
      me.spouseId = spouse.id;
      spouse.spouseId = me.id;
      s.roles.spouse = spouse.id;
      FB.ui.refresh();
    });
    await page.locator('#lefttabs .tab[data-tab="family"]').click();
    await expect(page.locator('.coachmark')).toHaveCount(0);

    const result = await page.evaluate(function () {
      const s = FB.state;
      const flags = s.player.flags;
      const seen = FB.game.uiPrefs.tipsSeen;
      seen['map-controls'] = 1;
      seen['map-home'] = 1;
      seen['map-filters'] = 1;
      flags.tut_deed = 1;
      flags.tut_unpause = 1;
      flags.tut_event = 1;
      FB.tutorialCheck(s);
      return {
        track:FB.tutorialStatus(s).track.id,
        established:!!flags.tut_family_established,
        familyComplete:!!flags.tut_track_family_legacy,
        checked:[flags.tut_seen_kin_tab, flags.tut_seen_wed,
          flags.tut_seen_heir],
        legacyEvents:s.eventQueue.filter(function (event) {
          return event.id === 'tut_legacy';
        }).length
      };
    });
    expect(result).toEqual({
      track:'making_a_living',
      established:true,
      familyComplete:true,
      checked:[1, 1, 1],
      legacyEvents:0
    });

    const enterprise = page.locator('.coachmark', {
      hasText:'Work, training & enterprises'
    });
    await expect(enterprise).toBeVisible();
    await enterprise.getByRole('button', { name:'Got it', exact:true }).click();
    await page.locator('#lefttabs .tab[data-tab="family"]').click();
    await expect(page.locator('.coachmark')).toHaveCount(0);
  });

test('the land lesson points a freeholder directly at the land market deed',
  async function ({ page }) {
    await startDeterministicGame(page);
    expect(await page.evaluate(function () {
      const s = FB.state;
      FB.game.uiPrefs.hideTips = false;
      s.player.tier = 1;
      s.player.gold = 100;
      FB.ui.refresh();
      return FB.ui.maybeMakingLandTip();
    })).toBe(true);
    const land = page.locator('.coachmark', {
      hasText:'use Buy a plot of land'
    });
    await expect(land).toBeVisible();
    await expect(page.locator('[data-action-id="buy_land"]'))
      .toHaveClass(/coachmark-lit/);
    await expect(land).not.toContainText('Buy your freedom');
  });

test('secondary areas teach themselves only when opened', async function ({ page }) {
  await startFirstCampaign(page);
  await finishOpeningMapTour(page);
  await page.getByRole('button', { name:'Got it', exact:true }).click();
  await page.locator('.coachmark', { hasText:'unpause with Play' })
    .getByRole('button', { name:'Got it', exact:true }).click();
  await expect(page.locator('.coachmark')).toHaveCount(0);
  expect(await page.evaluate(function () {
    return {
      land:!!FB.game.uiPrefs.tipsSeen['area-land'],
      network:!!FB.game.uiPrefs.tipsSeen['area-network'],
      chronicle:!!FB.game.uiPrefs.tipsSeen['area-chronicle']
    };
  })).toEqual({ land:false, network:false, chronicle:false });

  await page.locator('#sidetabs .tab[data-tab="prov"]').click();
  const coach = page.locator('.coachmark', { hasText:'Land looks closely' });
  await expect(coach).toBeVisible();
  await expect(page.getByRole('button', { name:'Next', exact:true })).toHaveCount(0);
  await expect(page.getByRole('button', { name:'Back', exact:true })).toHaveCount(0);
  await coach.getByRole('button', { name:'Got it', exact:true }).click();
  expect(await page.evaluate(function () {
    return !!FB.game.uiPrefs.tipsSeen['area-land'];
  })).toBe(true);
});

test('Stop tips is available in place and clears queued first-time lessons',
  async function ({ page }) {
    await startFirstCampaign(page);
    const coach = page.locator('.coachmark');
    await expect(coach.getByRole('button', { name:'Stop tips', exact:true }))
      .toBeVisible();
    await page.evaluate(function () {
      FB.ui.maybeTip('queued-after-first', 'Queued lesson', '#timebtns', {
        noNext:true
      });
    });
    await coach.getByRole('button', { name:'Stop tips', exact:true }).click();
    await expect(page.locator('.coachmark')).toHaveCount(0);
    expect(await page.evaluate(function () {
      return {
        disabled:FB.game.uiPrefs.hideTips,
        later:FB.ui.maybeTip('later-lesson', 'Later lesson', '#timebtns')
      };
    })).toEqual({ disabled:true, later:false });
  });

test('a coachmark points, survives refresh, and stills running days',
  async function ({ page }) {
    await startFirstCampaign(page);
    await finishOpeningMapTour(page);
    await page.getByRole('button', { name:'Got it', exact:true }).click();
    await page.locator('.coachmark', { hasText:'unpause with Play' })
      .getByRole('button', { name:'Got it', exact:true }).click();
    await page.evaluate(function () {
      FB.game.uiPrefs.hideTips = false;
      FB.game.setPaused(false);
      FB.ui.maybeTip('spec-time-lesson', 'Synthetic time lesson', '#timebtns', {
        noNext:true
      });
    });
    const coach = page.locator('.coachmark', { hasText:'Synthetic time lesson' });
    await expect(coach).toBeVisible();
    await expect(page.locator('#timebtns')).toHaveClass(/coachmark-lit/);
    expect(await page.evaluate(function () { return FB.game.paused; })).toBe(true);

    await page.evaluate(function () { FB.ui.refresh(); });
    await waitForUiRefresh(page);
    await expect(coach).toBeVisible();
    const held = await page.evaluate(function () {
      const turn = FB.state.turn;
      FB.game.skipAhead();
      return { days:FB.state.turn - turn, fastForwarding:FB.game.fastForwarding };
    });
    expect(held).toEqual({ days:0, fastForwarding:false });
  });

test('desktop panel coachmarks place their cards over the map',
  async function ({ page }) {
    await startDeterministicGame(page);
    await page.setViewportSize({ width:1280, height:800 });
    await page.evaluate(function () {
      FB.ui.coachmarkReset();
      FB.ui.coachmark('Synthetic left-panel lesson', '#tab-char', {
        noNext:true
      });
    });
    const coach = page.locator('.coachmark');
    await expect(coach).toHaveClass(/over-map/);
    await expect(coach).toHaveClass(/arrow-left/);
    const leftPlacement = await page.evaluate(function () {
      const card = document.querySelector('.coachmark').getBoundingClientRect();
      const map = document.querySelector('#mapwrap').getBoundingClientRect();
      return {
        insideLeft:card.left >= map.left,
        insideRight:card.right <= map.right,
        insideTop:card.top >= map.top,
        insideBottom:card.bottom <= map.bottom
      };
    });
    expect(leftPlacement).toEqual({
      insideLeft:true, insideRight:true, insideTop:true, insideBottom:true
    });
    await coach.getByRole('button', { name:'Got it', exact:true }).click();

    await page.evaluate(function () {
      FB.ui.coachmark('Synthetic right-panel lesson',
        '#sidetabs .tab[data-tab="actions"]', { noNext:true });
    });
    await expect(coach).toHaveClass(/over-map/);
    await expect(coach).toHaveClass(/arrow-right/);
    const rightPlacement = await page.evaluate(function () {
      const card = document.querySelector('.coachmark').getBoundingClientRect();
      const map = document.querySelector('#mapwrap').getBoundingClientRect();
      return card.left >= map.left && card.right <= map.right &&
        card.top >= map.top && card.bottom <= map.bottom;
    });
    expect(rightPlacement).toBe(true);
  });

test('a lesson waits out an open dialog', async function ({ page }) {
  await startDeterministicGame(page);
  await page.evaluate(function () { FB.game.uiPrefs.hideTips = false; });
  await openMenu(page);
  expect(await page.evaluate(function () {
    return FB.ui.maybeTip('spec-dialog-lesson', 'Synthetic waiting lesson',
      '#sidetabs .tab[data-tab="prov"]', { noNext:true });
  })).toBe(true);
  await page.evaluate(function () { FB.ui.refresh(); });
  await waitForUiRefresh(page);
  await expect(page.locator('.coachmark')).toHaveCount(0);

  await page.evaluate(function () { FB.ui.closeModal(); });
  await expect(page.locator('.coachmark', { hasText:'Synthetic waiting lesson' }))
    .toBeVisible();
});

test('a hidden drawer target falls back to the portrait on phones',
  async function ({ page }) {
    await startDeterministicGame(page);
    await page.setViewportSize({ width:390, height:844 });
    expect(await page.evaluate(function () {
      FB.game.uiPrefs.hideTips = false;
      return FB.ui.maybeTip('spec-self-lesson', 'Synthetic Self lesson',
        '#lefttabs .tab[data-tab="char"]', { noNext:true });
    })).toBe(true);
    await expect(page.locator('#tb-portrait')).toHaveClass(/coachmark-lit/);
    await expect(page.locator('#lefttabs .tab[data-tab="char"]'))
      .not.toHaveClass(/coachmark-lit/);
    await page.locator('#tb-portrait').click();
    await expect(page.locator('body')).toHaveClass(/showself/);
    expect(await page.evaluate(function () {
      return !!FB.game.uiPrefs.tipsSeen['spec-self-lesson'];
    })).toBe(true);
  });

test('Settings keeps both guidance switches as persistent opt-outs',
  async function ({ page }) {
    await startDeterministicGame(page);
    await page.evaluate(function () {
      FB.game.uiPrefs.hideTips = false;
      FB.game.saveUiPrefs();
    });
    await page.locator('#btn-menu').click();
    await page.locator('#m-settings').click();
    const hideTips = page.getByRole('checkbox', {
      name:/Disable first-time tips/
    });
    const guideHints = page.getByRole('checkbox', {
      name:/Disable guide hints/
    });
    await expect(hideTips).not.toBeChecked();
    await expect(page.locator('label.autorow', { has: hideTips }))
      .toContainText('guide-hints switch above');
    await hideTips.check();
    await expect.poll(function () {
      return page.evaluate(function () {
        const stored = JSON.parse(localStorage.getItem('fb_ui') || '{}');
        return { memory:FB.game.uiPrefs.hideTips, stored:stored.hideTips };
      });
    }).toEqual({ memory:true, stored:true });
    await expect(guideHints).not.toBeChecked();
  });

test('a situational tip fires at its moment and never twice',
  async function ({ page }) {
    await startDeterministicGame(page);
    await page.evaluate(function () { FB.game.uiPrefs.hideTips = false; });
    const bought = await page.evaluate(function () {
      FB.state.player.gold = 100000;
      const available = FB.landAvailable(FB.state);
      if (!available.length) return false;
      const settlement = available[0].settlement;
      return FB.buyLandPlot(FB.state, settlement) &&
        FB.buyLandPlot(FB.state, settlement);
    });
    expect(bought).toBe(true);
    const coach = page.locator('.coachmark', { hasText:'first plot of land' });
    await expect(coach).toBeVisible();
    await expect(page.locator('#sidetabs .tab[data-tab="prov"]'))
      .toHaveClass(/coachmark-lit/);
    await coach.getByRole('button', { name:'Got it', exact:true }).click();
    expect(await page.evaluate(function () {
      return FB.ui.tipDue('first-plot');
    })).toBe(false);
  });
