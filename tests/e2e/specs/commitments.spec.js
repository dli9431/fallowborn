'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'data/map_data.js',
  'data/actions.js',
  'js/actions.js',
  'js/armies.js',
  'js/events.js',
  'js/main.js',
  'js/model.js',
  'js/world.js',
  'js/keys.js',
  'js/ui_misc.js',
  'js/ui_panels.js',
  'js/ui_modals.js',
  'css/style.css'
]);

const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { startDeterministicGame } = require('../support/game/start');
const { waitForUiRefresh } = require('../support/game/ui');

test.beforeEach(async function ({ page }, testInfo) {
  await openGame(page, testInfo);
  await startDeterministicGame(page);
});

test('ongoing commitments adapt by layout and route to existing controls',
  async function ({ page }) {
    await page.evaluate(function () {
      const seen = FB.state.player.panelIntrosSeen =
        FB.state.player.panelIntrosSeen || {};
      seen.network = 1;
    });
    const summary = page.locator('#ongoing-commitments');
    await expect(summary).toBeVisible();
    await expect(summary.getByRole('heading', {
      name:'Ongoing commitments',
      exact:true
    })).toBeVisible();
    const focusCommitment = summary.locator('[data-commitment="focus"]');
    await expect(focusCommitment).toBeHidden();
    await expect(summary.locator(
      '[data-commitment="personal-attention"]')).toContainText(
      'Personal attention');
    // a commoner has no say over national research, so the row stays out
    await expect(summary.locator('[data-commitment="research"]')).toHaveCount(0);

    await page.setViewportSize({ width:360, height:740 });
    await expect(focusCommitment).toBeVisible();
    await focusCommitment.click();
    const focusList = page.locator('#daily-focus-list');
    await expect(focusList).toBeFocused();
    const focusAlignment = await focusList.evaluate(function (heading) {
      return Math.abs(heading.getBoundingClientRect().top -
        document.getElementById('sidebody').getBoundingClientRect().top);
    });
    expect(focusAlignment).toBeLessThanOrEqual(12);

    await page.setViewportSize({ width:1280, height:720 });
    await expect(focusCommitment).toBeHidden();

    const mixedCourtship = await page.evaluate(function () {
      const s = FB.state;
      const protagonist = s.chars[s.player.charId];
      protagonist.culture = 'norse';
      protagonist.religion = 'norse_pagan';
      const candidate = FB.makeCharacter(s, {
        name:'Áine', sex:protagonist.sex === 'm' ? 'f' : 'm',
        culture:'gaelic', religion:'catholic',
        born:s.date.year - 24, role:'suitor', opinion:40,
        station:FB.playerStation(s), traitsN:0
      });
      s.player.courtingId = candidate.id;
      s.player.flags.courting = 1;
      s.player.socialAttention = {};
      s.player.socialAttention[candidate.id] = {
        startedTurn:s.turn, lastTurn:s.turn
      };
      FB.ui.refresh();
      return {
        name:candidate.name,
        threshold:FB.courtshipStandingThreshold(s, candidate),
        days:FB.socialAttentionDaysToThreshold(s, candidate)
      };
    });
    await waitForUiRefresh(page);
    await expect(summary.locator(
      '[data-commitment="personal-attention"]')).toContainText(
      mixedCourtship.days + ' days to +' + mixedCourtship.threshold);

    await summary.locator('[data-commitment="personal-attention"]').click();
    await expect(page.locator('#genmodal')).not.toHaveClass(/hidden/);
    await expect(page.locator('#gm-title')).toContainText(mixedCourtship.name);
    await expect(page.locator('#gm-body')).toContainText('Personal attention');
    await page.locator('#cm-close').click();

    // landed ranks get the research row and its route to the Technology sheet
    await page.evaluate(function () {
      const s = FB.state;
      s.player.tier = 4;
      s.player.liege = null;
      s.player.provs = [s.player.provinceId];
      FB.foundPlayerRealm(s);
      s.player.roleOrientationsSeen = s.player.roleOrientationsSeen || {};
      s.player.roleOrientationsSeen['role-tier-' + s.player.tier] = 1;
      FB.ui.refresh();
    });
    await waitForUiRefresh(page);
    await page.locator('#sidetabs [data-tab="actions"]').click();
    await expect(summary.locator('[data-commitment="research"]')).toContainText(
      'National research');
    await summary.locator('[data-commitment="research"]').click();
    await expect(page.getByRole('heading', {
      name:'Technology',
      exact:true
    })).toBeVisible();
    await page.getByRole('button', { name:'Close', exact:true }).click();
  });

test('common households do not see ruler-only technology or automation controls',
  async function ({ page }) {
    const access = await page.evaluate(function () {
      FB.state.player.panelIntrosSeen =
        FB.state.player.panelIntrosSeen || {};
      FB.state.player.panelIntrosSeen.prov = 1;
      FB.game.auto.hosts = 'off';
      FB.game.auto.build = true;
      FB.game.auto.research = true;
      FB.ui.refresh();
      return FB.techUiRelevant(FB.state);
    });
    expect(access).toBe(false);
    await waitForUiRefresh(page);
    await expect(page.locator('#btn-auto')).not.toContainText('✓');

    await page.locator('#sidetabs [data-tab="prov"]').click();
    await expect(page.locator('#tab-prov')).not.toContainText(
      'Technological development');

    await page.locator('#btn-auto').click();
    await expect(page.locator('input[name="ar-hosts"]')).toHaveCount(0);
    await expect(page.locator('#ar-build')).toHaveCount(0);
    await expect(page.locator('#ar-research')).toHaveCount(0);
    await expect(page.locator('#ar-research-mode')).toHaveCount(0);
    await expect(page.locator('#gm-body')).not.toContainText(
      'Only a sovereign player chooses national technology');
    await page.locator('#ar-close').click();

    await page.evaluate(function () {
      FB.ui.showGuide({ closeToGame:true });
    });
    await expect(page.locator('#guide-category option[value="technology"]'))
      .toHaveCount(0);
    await expect(page.locator('[data-guide-entry="technology"]')).toHaveCount(0);
    await expect(page.locator('[data-guide-entry^="tech-"]')).toHaveCount(0);
    await page.locator('#guide-close').click();

    const opened = await page.evaluate(function () {
      return {
        catalogue:FB.ui.showTech(),
        detail:FB.ui.showTechDetail('horizontal_loom')
      };
    });
    expect(opened).toEqual({ catalogue:false, detail:false });
    await expect(page.locator('#genmodal')).toHaveClass(/hidden/);

    await page.evaluate(function () {
      FB.state.player.tier = 3;
      FB.ui.showAutoResolve();
    });
    await expect(page.locator('input[name="ar-hosts"]')).toHaveCount(3);
    await expect(page.locator('#ar-host-resupply')).toBeVisible();
    await expect(page.locator('#ar-host-resupply')).toBeChecked();
    await page.locator('#ar-host-resupply').uncheck();
    expect(await page.evaluate(function () {
      return {
        live:FB.game.auto.hostResupply,
        stored:JSON.parse(localStorage.getItem('fb_automation')).hostResupply
      };
    })).toEqual({ live:false, stored:false });
    await expect(page.locator('#ar-build')).toBeVisible();
    await expect(page.locator('#ar-research')).toHaveCount(0);
    await expect(page.locator('#gm-body')).toContainText(
      'Only a sovereign player chooses national technology');
  });

test('the commitments title collapses and restores its ledger',
  async function ({ page }, testInfo) {
    const summary = page.locator('#ongoing-commitments');
    const toggle = summary.getByRole('button', {
      name:'Ongoing commitments',
      exact:true
    });
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await toggle.click();
    await expect(summary).toBeVisible();
    await expect(summary.locator('#ongoing-commitment-list')).toBeHidden();
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(toggle).toBeFocused();
    await expect.poll(async function () {
      return page.evaluate(function () {
        return FB.game.uiPrefs.commitmentsCollapsed;
      });
    }).toBe(true);
    if (testInfo.project.name.endsWith('-served')) {
      await expect.poll(async function () {
        return page.evaluate(function () {
          const prefs = JSON.parse(localStorage.getItem('fb_ui') || '{}');
          return prefs.commitmentsCollapsed;
        });
      }).toBe(true);
    }

    await toggle.click();
    await expect(summary.locator('#ongoing-commitment-list')).toBeVisible();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await expect.poll(async function () {
      return page.evaluate(function () {
        return FB.game.uiPrefs.commitmentsCollapsed;
      });
    }).toBe(false);
  });

test('daily focuses use deed disclosures and Settings can disable guide hints',
  async function ({ page }) {
    const structure = await page.locator('#tab-actions').evaluate(
      function (panel) {
        const children = Array.prototype.slice.call(panel.children);
        const focusBody = panel.querySelector(
          '[data-action-group-body="focus"]');
        const focusIndex = children.indexOf(focusBody);
        let firstGroup = -1;
        for (let i = 0; i < children.length; i++) {
          if (firstGroup < 0 &&
              children[i].matches('[data-action-group]')) firstGroup = i;
        }
        return {
          focusCount:focusBody
            ? focusBody.querySelectorAll('[data-focus-id]').length : 0,
          firstGroup:firstGroup,
          allBeforeGroups:focusIndex >= 0 &&
            (firstGroup < 0 || focusIndex < firstGroup)
        };
      });
    expect(structure.focusCount).toBeGreaterThan(0);
    expect(structure.firstGroup).toBeGreaterThanOrEqual(0);
    expect(structure.allBeforeGroups).toBe(true);

    const focusButton = page.locator('[data-focus-id]').first();
    const focusRow = focusButton.locator('..');
    await expect(focusButton).toHaveClass(/deed-main-action/);
    await expect(focusButton.locator('.adesc')).toHaveCount(0);
    const focusDetails = (await focusRow.locator('.deed-details')
      .textContent()).trim();
    expect(focusDetails.length).toBeGreaterThan(0);
    expect(await focusButton.evaluate(function (button) {
      const style = getComputedStyle(button);
      return { fontSize:style.fontSize, fontWeight:style.fontWeight };
    })).toEqual({ fontSize:'16px', fontWeight:'600' });
    await focusButton.hover();
    await expect(page.locator('#tooltip')).toContainText(focusDetails);
    await page.setViewportSize({ width:900, height:720 });
    const focusInfo = focusRow.locator('.deed-info');
    await expect(focusInfo).toBeVisible();
    await focusInfo.click();
    await expect(focusRow.locator('.deed-details')).toBeVisible();
    await focusInfo.click();
    await expect(focusRow.locator('.deed-details')).toBeHidden();

    const pathHint = page.locator('#tab-actions .path-hint');
    await expect(pathHint).toBeVisible();
    await page.locator('#btn-menu').click();
    await page.locator('#m-settings').click();
    await expect(page.getByRole('checkbox', {
      name:/Keep daily focuses together/
    })).toHaveCount(0);
    await expect(page.getByRole('checkbox', {
      name:/Hide ongoing commitments/
    })).toHaveCount(0);

    const repeatDeedSectionKeys = page.getByRole('checkbox', {
      name:/Repeat Deeds section keys/
    });
    await expect(repeatDeedSectionKeys).not.toBeChecked();
    await expect(page.locator('label.autorow', {
      has:repeatDeedSectionKeys
    })).toContainText('section keys always leave their section open');
    await repeatDeedSectionKeys.check();
    await expect.poll(async function () {
      return page.evaluate(function () {
        return {
          preference:FB.game.uiPrefs.repeatDeedSectionHotkeys,
          stored:JSON.parse(localStorage.getItem('fb_ui'))
            .repeatDeedSectionHotkeys
        };
      });
    }).toEqual({ preference:true, stored:true });

    const hideBeginnerHints = page.getByRole('checkbox', {
      name:/Disable guide hints/
    });
    await expect(hideBeginnerHints).not.toBeChecked();
    await expect(page.locator('label.autorow', { has:hideBeginnerHints }))
      .toContainText('role orientation popups');
    await hideBeginnerHints.check();
    await expect(pathHint).toHaveCount(0);
    await expect.poll(async function () {
      return page.evaluate(function () {
        return {
          preference:FB.game.uiPrefs.hideBeginnerHints,
          stored:JSON.parse(localStorage.getItem('fb_ui')).hideBeginnerHints
        };
      });
    }).toEqual({ preference:true, stored:true });
  });

test('deed section keys preserve selection and optionally toggle a local QWE-ASD-ZXC grid',
  async function ({ page }) {
    await page.evaluate(function () {
      const s = FB.state;
      s.chars[s.player.charId].sex = 'f';
      s.player.tier = 3;
      s.player.liege = null;
      s.player.provs = [s.player.provinceId];
      s.player.focus = 'govern';
      FB.foundPlayerRealm(s);
      FB.ui.refresh();
    });
    await waitForUiRefresh(page);

    const panel = page.locator('#tab-actions');
    const focusList = panel.locator('#daily-focus-list');
    const work = panel.locator('[data-action-group="work"]');
    const life = panel.locator('[data-action-group="life"]');
    await expect(focusList.locator('.deed-section-keyhint')).toHaveText('1');
    await expect(work.locator('.deed-section-keyhint')).toHaveText('2');
    await expect(life.locator('.deed-section-keyhint')).toHaveText('3');
    await expect(focusList).toHaveAttribute('aria-current', 'true');
    await expect(panel.locator('[data-focus-id] .deed-item-keyhint'))
      .toHaveCount(5);
    await expect(panel.locator('[data-focus-id="rest"] .deed-item-keyhint'))
      .toHaveText('Q');
    await expect(life).toHaveAttribute('aria-expanded', 'false');

    await page.keyboard.press('Digit1');
    await expect(focusList).toBeFocused();
    await expect(focusList).toHaveAttribute('aria-current', 'true');
    await expect(focusList).toHaveAttribute('aria-expanded', 'true');
    await expect(panel.locator('[data-action-group-body="focus"]')).toBeVisible();
    await expect(panel.locator('[data-focus-id] .deed-item-keyhint'))
      .toHaveCount(5);
    await page.keyboard.press('Digit1');
    await expect(focusList).toBeFocused();
    await expect(focusList).toHaveAttribute('aria-expanded', 'true');
    await expect(panel.locator('[data-action-group-body="focus"]')).toBeVisible();
    const focusKeys = await panel.locator('[data-focus-id]').evaluateAll(
      function (buttons) {
        return buttons.map(function (button) {
          return {
            id:button.getAttribute('data-focus-id'),
            key:button.querySelector('.deed-item-keyhint').textContent
          };
        });
      });
    expect(focusKeys).toEqual([
      { id:'rest', key:'Q' },
      { id:'pray', key:'W' },
      { id:'courtly_graces', key:'E' },
      { id:'govern', key:'A' },
      { id:'patronize', key:'S' }
    ]);
    await panel.locator(
      '[data-action-group-body="work"] [data-action-id]').first().evaluate(
      function (button) {
        const original = FB.runInstant;
        FB.runInstant = function () {};
        button.click();
        FB.runInstant = original;
      });
    await expect(focusList).toHaveAttribute('aria-current', 'true');
    await expect(work).not.toHaveAttribute('aria-current', 'true');
    const activeSectionClick = await panel.evaluate(function (element) {
      const hint = element.querySelector(
        '[data-focus-id="rest"] .deed-item-keyhint');
      hint._deedShortcutProbe = true;
      window.__deedOriginalSetFocus = FB.setFocus;
      FB.setFocus = function (_, id) { window.__deedFocusTarget = id; };
      return !!hint;
    });
    expect(activeSectionClick).toBe(true);
    await page.keyboard.press('q');
    const activeSectionResult = await panel.evaluate(function (element) {
      const hint = element.querySelector(
        '[data-focus-id="rest"] .deed-item-keyhint');
      const result = {
        target:window.__deedFocusTarget,
        hintPreserved:!!(hint && hint._deedShortcutProbe)
      };
      FB.setFocus = window.__deedOriginalSetFocus;
      delete window.__deedOriginalSetFocus;
      delete window.__deedFocusTarget;
      return result;
    });
    expect(activeSectionResult).toEqual({
      target:'rest', hintPreserved:true
    });
    await page.keyboard.press('q');
    await expect.poll(function () {
      return page.evaluate(function () { return FB.state.player.focus; });
    }).toBe('rest');
    await expect(page.locator('#genmodal')).toHaveClass(/hidden/);
    await waitForUiRefresh(page);

    await panel.evaluate(function (element) {
      element.querySelector('[data-focus-id]')._deedsAccordionProbe = true;
    });
    const beforeScroll = await page.locator('#sidebody').evaluate(
      function (sidebody) { return sidebody.scrollTop; });
    await page.keyboard.press('Digit3');
    await expect(life).toHaveAttribute('aria-expanded', 'true');
    await expect(life).toHaveAttribute('aria-current', 'true');
    await expect(life).toBeFocused();
    await expect(focusList).not.toHaveAttribute('aria-current', 'true');
    const lifeBody = panel.locator('[data-action-group-body="life"]');
    await expect(lifeBody).toHaveCount(1);
    await expect(lifeBody.locator('[data-action-id]').first()).toBeVisible();
    const opened = await panel.evaluate(function (element) {
      const buttons = element.querySelectorAll(
        '[data-action-group-body="life"] [data-action-id]');
      const hints = [];
      for (let i = 0; i < buttons.length; i++) {
        const hint = buttons[i].querySelector('.deed-item-keyhint');
        if (hint) hints.push(hint.textContent);
      }
      return {
        focusPreserved:!!element.querySelector('[data-focus-id]')
          ._deedsAccordionProbe,
        focusHints:element.querySelectorAll(
          '[data-focus-id] .deed-item-keyhint').length,
        workHints:element.querySelectorAll(
          '[data-action-group-body="work"] .deed-item-keyhint').length,
        hints:hints
      };
    });
    expect(opened.focusPreserved).toBe(true);
    expect(opened.focusHints).toBe(0);
    expect(opened.workHints).toBe(0);
    expect(opened.hints.slice(0, 9)).toEqual(
      ['Q', 'W', 'E', 'A', 'S', 'D', 'Z', 'X', 'C'].slice(
        0, opened.hints.length));
    const firstLifeId = await lifeBody.locator('[data-action-id]').first()
      .evaluate(function (button) {
        const id = button.getAttribute('data-action-id');
        button.click = function () { window.__deedShortcutTarget = id; };
        return id;
      });
    await page.keyboard.press('q');
    expect(await page.evaluate(function () {
      return window.__deedShortcutTarget;
    })).toBe(firstLifeId);
    const scrolled = await page.locator('#sidebody').evaluate(
      function (sidebody) { return sidebody.scrollTop; });
    expect(scrolled).toBeGreaterThan(beforeScroll);

    await lifeBody.locator('[data-action-id]').first().evaluate(
      function (button) { button._deedsAccordionProbe = true; });
    await page.keyboard.press('Digit3');
    await expect(life).toHaveAttribute('aria-expanded', 'true');
    await expect(lifeBody).toHaveCount(1);

    await page.evaluate(function () {
      FB.game.uiPrefs.repeatDeedSectionHotkeys = true;
      FB.game.saveUiPrefs();
    });
    await page.keyboard.press('Digit3');
    await expect(life).toHaveAttribute('aria-expanded', 'false');
    await expect(lifeBody).toHaveCount(0);
    await expect(life).toBeFocused();

    await page.keyboard.press('Digit3');
    await expect(lifeBody).toHaveCount(1);
    const reopened = await lifeBody.locator('[data-action-id]').first()
      .evaluate(function (button) { return !!button._deedsAccordionProbe; });
    expect(reopened).toBe(true);
  });

test('conditional commitments expose travel, finance, and political management',
  async function ({ page }) {
    const setup = await page.evaluate(function () {
      const s = FB.state;
      const economy = FB.ensureEconomy(s);
      economy.loans.push({
        id:economy.nextId++,
        kind:'household',
        face:5,
        denomination:'nominal',
        dueTurn:s.turn + 180,
        dueSeason:(s.date.season + 2) % 4,
        dueYear:s.date.year,
        status:'active',
        defaultKind:'revenue'
      });
      s.player.tier = 4;
      s.player.liege = null;
      s.player.provs = [s.player.provinceId];
      FB.foundPlayerRealm(s);
      s.player.roleOrientationsSeen = s.player.roleOrientationsSeen || {};
      s.player.roleOrientationsSeen['role-tier-' + s.player.tier] = 1;

      let journey = null;
      for (const purposeId in FBDATA.travelPurposes) {
        if (!Object.prototype.hasOwnProperty.call(
            FBDATA.travelPurposes, purposeId) ||
            purposeId === 'trade' ||
            FB.travelEligible(s, purposeId) !== true) continue;
        const choices = FB.travelDestinations(s, purposeId);
        for (let i = 0; i < choices.length; i++) {
          if (choices[i].cost <= s.player.gold &&
              FB.travelStart(s, purposeId, choices[i].destinationId,
                choices[i].destinationRealm)) {
            journey = {
              purpose:purposeId,
              destination:choices[i].destinationId
            };
            break;
          }
        }
        if (journey) break;
      }
      FB.ui.refresh();
      return {
        journey:journey,
        capacity:FB.politicalAttentionCapacity(s)
      };
    });
    await waitForUiRefresh(page);
    expect(setup.journey).not.toBeNull();
    expect(setup.capacity).toBeGreaterThan(0);

    const summary = page.locator('#ongoing-commitments');
    await expect(summary.locator('[data-commitment="travel"]')).toBeVisible();
    await expect(summary.locator('[data-commitment="finance"]')).toContainText(
      'Loans: 1');
    await expect(summary.locator(
      '[data-commitment="political-attention"]')).toBeVisible();
    await expect(summary.locator('[data-commitment="focus"]')).toHaveClass(
      /disabled/);
    await expect(summary.locator('[data-commitment="focus"]')).toContainText(
      'paused while traveling');

    await summary.locator('[data-commitment="travel"]').click();
    await expect(page.locator(
      '[data-action-id="travel_turn_back"]')).toBeFocused();

    await summary.locator('[data-commitment="finance"]').click();
    await expect(page.getByRole('heading', {
      name:'💰 Coin & Credit',
      exact:true
    })).toBeVisible();
    await page.getByRole('button', { name:'Close', exact:true }).click();

    await summary.locator('[data-commitment="political-attention"]').click();
    await expect(page.getByRole('heading', {
      name:'Foreign Policy',
      exact:true
    })).toBeVisible();
    await expect(page.locator('#gm-body > .gm-footer > #gm-cancel'))
      .toHaveText('Close');
  });

test('ongoing commitments remain within a narrow mobile panel',
  async function ({ page }) {
    await page.setViewportSize({ width:360, height:740 });
    const geometry = await page.locator('#ongoing-commitments').evaluate(
      function (summary) {
        const box = summary.getBoundingClientRect();
        return {
          left:box.left,
          right:box.right,
          viewport:document.documentElement.clientWidth,
          documentWidth:document.documentElement.scrollWidth
        };
      });
    expect(geometry.left).toBeGreaterThanOrEqual(0);
    expect(geometry.right).toBeLessThanOrEqual(geometry.viewport);
    expect(geometry.documentWidth).toBeLessThanOrEqual(geometry.viewport);
  });

test('serfs see neither the commitments ledger nor deeds they cannot use',
  async function ({ page }) {
    await page.evaluate(function () {
      const s = FB.state;
      s.player.tier = 0;
      s.player.roleOrientationsSeen = s.player.roleOrientationsSeen || {};
      s.player.roleOrientationsSeen['role-tier-0'] = 1;
      s.player.panelIntrosSeen = s.player.panelIntrosSeen || {};
      s.player.panelIntrosSeen.network = 1;
      FB.ui.refresh();
    });
    await waitForUiRefresh(page);

    // the whole commitments ledger stays out of a serf's way
    await expect(page.locator('#ongoing-commitments')).toHaveCount(0);

    // unusable deeds are hidden, but work and training stays: serfs can
    // hold the farming career, apprentice children, and run field enterprises
    const deedIds = await page.evaluate(function () {
      return FB.listInstants(FB.state).map(function (item) { return item.a.id; });
    });
    expect(deedIds).toContain('livelihoods');
    expect(deedIds).toContain('petition_freedom');
    expect(deedIds).toContain('buy_freedom');
    expect(deedIds).not.toContain('coin_credit');
    expect(deedIds).not.toContain('adopt_tech');
    await expect(page.locator('[data-action-id="coin_credit"]')).toHaveCount(0);
    await expect(page.locator('[data-action-id="livelihoods"]')).toBeVisible();
    await page.locator('[data-action-group="realm"]').click();
    await expect(page.locator('[data-action-id="petition_freedom"]')).toBeVisible();
    await expect(page.locator('[data-action-id="buy_freedom"]')).toBeVisible();
    await expect(page.locator('[data-action-id="adopt_tech"]')).toHaveCount(0);

    // Self offers the livelihood summary as a direct management route.
    await page.locator('#lefttabs [data-tab="char"]').click();
    const selfWork = page.locator('#self-work');
    await expect(selfWork).toBeVisible();
    await selfWork.click();
    const livelihoodModal = page.locator('#genmodal');
    await expect(livelihoodModal).not.toHaveClass(/hidden/);
    await expect(page.locator('#gm-title')).toContainText('Work & Enterprises');
    await livelihoodModal.getByRole('button', { name:'Close', exact:true }).click();
    await expect(livelihoodModal).toHaveClass(/hidden/);

    // Network remains the persistent management route and drops Finance on the same rule.
    await page.locator('#sidetabs [data-tab="network"]').click();
    await expect(page.locator('#network-work')).toBeVisible();
    await expect(page.locator('#network-finance')).toHaveCount(0);

    // obligations on the book make Coin & Credit worth surfacing again
    await page.evaluate(function () {
      const s = FB.state;
      const economy = FB.ensureEconomy(s);
      economy.loans.push({
        id:economy.nextId++,
        kind:'household',
        face:5,
        denomination:'nominal',
        dueTurn:s.turn + 180,
        dueSeason:(s.date.season + 2) % 4,
        dueYear:s.date.year,
        status:'active',
        defaultKind:'revenue'
      });
      FB.ui.refresh();
    });
    await waitForUiRefresh(page);
    await expect(page.locator('#network-finance')).toBeVisible();
    await page.locator('#sidetabs [data-tab="actions"]').click();
    await expect(page.locator('[data-action-id="coin_credit"]')).toBeVisible();
  });

test('ruler deed section extending past nine items exposes Shift+letter shortcuts',
  async function ({ page }) {
    await page.evaluate(function () {
      const s = FB.state;
      s.player.tier = 5;
      s.player.liege = null;
      s.player.provs = [s.player.provinceId, 1, 2, 3];
      FB.foundPlayerRealm(s);
      FB.ui.refresh();
    });
    await waitForUiRefresh(page);

    const panel = page.locator('#tab-actions');
    const realmHeader = panel.locator('[data-action-group="realm"]');
    await expect(realmHeader.locator('.deed-section-keyhint')).toHaveText('5');

    await page.keyboard.press('Digit5');
    await expect(realmHeader).toHaveAttribute('aria-expanded', 'true');
    await expect(realmHeader).toHaveAttribute('aria-current', 'true');

    const realmBody = panel.locator('[data-action-group-body="realm"]');
    const buttons = realmBody.locator('[data-action-id]');
    const count = await buttons.count();
    expect(count).toBeGreaterThan(9);

    const hints = await buttons.evaluateAll(function (btnList) {
      return btnList.map(function (btn) {
        const hint = btn.querySelector('.deed-item-keyhint');
        return hint ? hint.textContent : null;
      });
    });

    const expectedKeys = ['Q', 'W', 'E', 'A', 'S', 'D', 'Z', 'X', 'C',
      '⇧Q', '⇧W', '⇧E', '⇧A', '⇧S', '⇧D', '⇧Z', '⇧X', '⇧C'];
    for (let i = 0; i < count && i < expectedKeys.length; i++) {
      expect(hints[i]).toBe(expectedKeys[i]);
    }

    const tenthId = await buttons.nth(9).evaluate(function (btn) {
      const id = btn.getAttribute('data-action-id');
      btn.click = function () { window.__deedShortcutTarget = id; };
      return id;
    });
    await page.keyboard.press('Shift+KeyQ');
    expect(await page.evaluate(function () {
      return window.__deedShortcutTarget;
    })).toBe(tenthId);

  });

test('automation hotkey uses V and btn-auto displays V keyhint',
  async function ({ page }) {
    await page.setViewportSize({ width: 1200, height: 800 });
    const autoBtn = page.locator('#btn-auto');
    await expect(autoBtn.locator('.keyhint')).toHaveText('V');
    await expect(autoBtn).toHaveAttribute('title', 'Automation (V)');
    await expect(autoBtn).toHaveAttribute('aria-label', 'Automation (V)');

    await page.keyboard.press('KeyZ');
    await expect(page.locator('#genmodal')).toHaveClass(/hidden/);

    await page.keyboard.press('KeyV');
    await expect(page.locator('#genmodal')).not.toHaveClass(/hidden/);
    await expect(page.locator('#ar-close')).toHaveText('Close');
    await page.locator('#ar-close').click();
    await expect(page.locator('#genmodal')).toHaveClass(/hidden/);
  });

test('modal hotkeys toggle open modals and Escape closes any modal',
  async function ({ page }) {
    await page.setViewportSize({ width: 1200, height: 800 });

    // 1. Automation hotkey V toggles modal open and closed
    await page.keyboard.press('KeyV');
    await expect(page.locator('#genmodal')).not.toHaveClass(/hidden/);
    await expect(page.locator('#ar-close')).toBeVisible();

    await page.keyboard.press('KeyV');
    await expect(page.locator('#genmodal')).toHaveClass(/hidden/);

    // 2. Automation hotkey V opens modal, Escape closes it
    await page.keyboard.press('KeyV');
    await expect(page.locator('#genmodal')).not.toHaveClass(/hidden/);
    await page.keyboard.press('Escape');
    await expect(page.locator('#genmodal')).toHaveClass(/hidden/);

    // 3. Menu hotkey M toggles modal open and closed
    await page.keyboard.press('KeyM');
    await expect(page.locator('#genmodal')).not.toHaveClass(/hidden/);
    await expect(page.locator('#m-resume')).toBeVisible();

    await page.keyboard.press('KeyM');
    await expect(page.locator('#genmodal')).toHaveClass(/hidden/);

    // 4. Menu opened via Escape, pressing Escape again closes it
    await page.keyboard.press('Escape');
    await expect(page.locator('#genmodal')).not.toHaveClass(/hidden/);
    await expect(page.locator('#m-resume')).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(page.locator('#genmodal')).toHaveClass(/hidden/);

    // 5. Action shortcut (e.g. Q for livelihoods) toggles modal open and closed
    await page.evaluate(function () { FB.ui.showTab('prov'); });
    await page.keyboard.press('KeyQ');
    await expect(page.locator('#genmodal')).not.toHaveClass(/hidden/);

    await page.keyboard.press('KeyQ');
    await expect(page.locator('#genmodal')).toHaveClass(/hidden/);

    // 6. Non-dismissable modal closes on Escape
    await page.evaluate(function () {
      FB.ui.openModal('Non-dismissable Dialog', '<p>Test</p>', { dismissable: false });
    });
    await expect(page.locator('#genmodal')).not.toHaveClass(/hidden/);
    await page.keyboard.press('Escape');
    await expect(page.locator('#genmodal')).toHaveClass(/hidden/);

    // 7. Input inside modal focused, Escape closes modal
    await page.evaluate(function () {
      FB.ui.openModal('Input Dialog', '<input id="test-inp" type="text">');
      document.getElementById('test-inp').focus();
    });
    await expect(page.locator('#genmodal')).not.toHaveClass(/hidden/);
    await page.keyboard.press('Escape');
    await expect(page.locator('#genmodal')).toHaveClass(/hidden/);
  });
