'use strict';

const { test, expect } = require('../support/fixture');
const {
  openGame,
  startDeterministicGame
} = require('../support/game');

test.beforeEach(async function ({ page }, testInfo) {
  await openGame(page, testInfo);
  await startDeterministicGame(page);
});

test('technology search discovers unlocks and locked links follow role access',
  async function ({ page }) {
    await page.evaluate(function () {
      const s = FB.state;
      s.player.tier = 3;
      const record = FB.realmTechRecord(s, FB.techRealmId(s));
      record.completed = record.completed.filter(function (id) {
        return id !== 'horizontal_loom';
      });
      record.active = record.active.filter(function (id) {
        return id !== 'horizontal_loom';
      });
      FB.ui.showTech();
    });

    await page.locator('#tech-search').fill('Workshop');
    const horizontalLoom = page.locator(
      '[data-tech-open="horizontal_loom"]:not(.hidden)');
    await expect(horizontalLoom).toBeVisible();
    await expect(horizontalLoom).toContainText('Horizontal Loom');
    await expect(horizontalLoom).toContainText('Workshop');
    await horizontalLoom.click();
    await expect(page.locator('#gm-body')).toContainText('Requires all');

    await page.evaluate(function () {
      FB.state.dev[FB.state.player.provinceId] = 5;
      FB.ui.showEnterpriseMarket(0);
    });
    const lockedWorkshop = page.locator(
      '[data-enterprise-explain="workshop_business"]');
    await expect(lockedWorkshop).toBeVisible();
    await expect(lockedWorkshop).toContainText('Workshop');
    await expect(lockedWorkshop).toContainText('Requires Horizontal Loom');
    await expect(lockedWorkshop).toHaveAttribute(
      'data-enterprise-available', 'false');
    await expect(lockedWorkshop).toBeEnabled();
    await lockedWorkshop.click();
    await expect(page.getByRole('heading', { name:'Workshop requirements' }))
      .toBeVisible();
    await expect(page.locator('[data-enterprise-blocker="technology"]'))
      .toContainText('Requires Horizontal Loom');
    await page.locator(
      '[data-enterprise-requirement-tech="horizontal_loom"]').click();
    await expect(page.getByRole('heading', { name:/Horizontal Loom/ }))
      .toBeVisible();

    await page.evaluate(function () {
      FB.state.player.tier = 1;
      FB.ui.showEnterpriseMarket(0);
    });
    const commonWorkshop = page.locator(
      '[data-enterprise-explain="workshop_business"]');
    await expect(commonWorkshop).toBeEnabled();
    await expect(commonWorkshop).toHaveAttribute(
      'data-enterprise-available', 'false');
    await expect(commonWorkshop).toContainText('Requires Horizontal Loom');
    await commonWorkshop.click();
    await expect(page.locator('[data-enterprise-blocker="technology"]'))
      .toContainText('Requires Horizontal Loom');
    await expect(page.locator(
      '[data-enterprise-requirement-tech="horizontal_loom"]'))
      .toHaveCount(0);
  });

test('enterprise catalogue keeps blocked choices explainable and idle warnings actionable',
  async function ({ page }) {
    const fixture = await page.evaluate(function () {
      const s = FB.state;
      const home = s.player.provinceId;
      FBDATA.enterprises.idle_purchase_fixture = {
        name:'Unstaffed Store', icon:'house', cost:1,
        profession:'merchant', yield:1,
        desc:'A fixture that can be bought without a qualified worker.'
      };
      s.player.gold = 50;
      s.dev[home] = 1;
      s.player.enterprises = [];
      for (const worker of FB.householdWorkers(s)) {
        worker.career = {
          profession:'farmer', rank:'journeyman', experience:3,
          startedYear:s.date.year - 3, guildRank:'none',
          guildStanding:0, chosen:true
        };
      }
      const technology = FB.realmTechRecord(s, FB.techRealmId(s));
      technology.completed = technology.completed.filter(function (id) {
        return id !== 'horizontal_loom';
      });
      FB.ui.showLivelihoods();
      return {
        count:Object.keys(FBDATA.enterprises).length,
        settlements:FB.settlementsOf(s, home).length,
        gold:s.player.gold,
        turn:s.turn
      };
    });

    await expect(page.locator('[data-enterprise-settlement]'))
      .toHaveCount(fixture.settlements);
    await page.locator('[data-enterprise-settlement="0"]').click();
    const options = page.locator(
      '[data-enterprise-buy], [data-enterprise-explain]');
    await expect(options).toHaveCount(fixture.count);
    const ordering = await options.evaluateAll(function (nodes) {
      return nodes.map(function (node) {
        return node.classList.contains('blocked') ? 'blocked' : 'available';
      });
    });
    const firstBlocked = ordering.indexOf('blocked');
    expect(firstBlocked).toBeGreaterThan(0);
    expect(ordering.slice(firstBlocked).every(function (state) {
      return state === 'blocked';
    })).toBe(true);

    const blockedWorkshop = page.locator(
      '[data-enterprise-explain="workshop_business"]');
    await expect(blockedWorkshop).toContainText('Unavailable');
    await expect(blockedWorkshop).toContainText('Needs county development');
    await blockedWorkshop.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('heading', { name:'Workshop requirements' }))
      .toBeVisible();
    await expect(page.locator('[data-enterprise-blocker="development"]'))
      .toBeVisible();
    await expect(page.locator('[data-enterprise-blocker="technology"]'))
      .toBeVisible();
    await expect(page.locator('[data-enterprise-blocker="funds"]'))
      .toContainText('short');
    expect(await page.evaluate(function () {
      return { gold:FB.state.player.gold, turn:FB.state.turn };
    })).toEqual({ gold:fixture.gold, turn:fixture.turn });

    await page.locator('#enterprise-requirements-back').click();
    await expect(blockedWorkshop).toBeFocused();

    const idlePurchase = page.locator(
      '[data-enterprise-buy="idle_purchase_fixture"]');
    await expect(idlePurchase).toContainText('Can buy — will be idle');
    await expect(idlePurchase).toContainText('eligible for Trade work');
    await expect(idlePurchase).toContainText('it will stand idle');
    await page.evaluate(function () {
      FB.state.player.gold = 0;
    });
    await idlePurchase.click();
    await expect(page.locator('#toasts'))
      .toContainText('Enterprise requirements changed');
    expect(await page.evaluate(function () {
      return {
        acquired:FB.state.player.enterprises.some(function (entry) {
          return entry.type === 'idle_purchase_fixture';
        }),
        turn:FB.state.turn
      };
    })).toEqual({ acquired:false, turn:fixture.turn });

    await page.evaluate(function () {
      FB.state.player.gold = 50;
      FB.ui.showEnterpriseMarket(0, undefined, true);
    });
    await page.locator('[data-enterprise-buy="idle_purchase_fixture"]').click();
    await expect.poll(function () {
      return page.evaluate(function () {
        const enterprise = FB.state.player.enterprises.filter(function (entry) {
          return entry.type === 'idle_purchase_fixture';
        })[0];
        return enterprise ? enterprise.workerId : 'missing';
      });
    }).toBeNull();
  });

test('the role orientation is a focused sheet with a Guide deep link',
  async function ({ page }) {
    const onboarding = await page.evaluate(function () {
      return {
        seen:!!FB.state.player.roleOrientationsSeen['role-tier-1'],
        repeated:FB.ui.maybeShowRoleOrientation()
      };
    });
    expect(onboarding).toEqual({ seen:true, repeated:false });

    await page.evaluate(function () {
      delete FB.state.player.roleOrientationsSeen['role-tier-1'];
      FB.ui.maybeShowRoleOrientation();
    });
    // a focused sheet for the role just entered — never the whole Guide
    await expect(page.getByRole('heading', {
      name:'Freeholder', exact:true
    })).toBeVisible();
    const orientationBody = page.locator('#gm-body');
    await expect(orientationBody).toContainText('New resources');
    await expect(orientationBody).toContainText('Recurring duties');
    await expect(orientationBody).toContainText('Good first actions');
    await expect(page.locator('#guide-controls')).toHaveCount(0);
    await expect(page.locator('[data-guide-entry]')).toHaveCount(0);
    await page.locator('#orientation-continue').click();
    await expect(page.locator('#genmodal')).toHaveClass(/hidden/);
    expect(await page.evaluate(function () {
      return {
        seen:!!FB.state.player.roleOrientationsSeen['role-tier-1'],
        repeated:FB.ui.maybeShowRoleOrientation()
      };
    })).toEqual({ seen:true, repeated:false });

    // the complete orientation stays one tap away from the header info icon
    await page.evaluate(function () {
      FB.ui.showRoleOrientation('role-tier-1');
    });
    const orientationGuide = page.locator(
      '#genmodal .gm-heading > #orientation-guide');
    await expect(orientationGuide).toHaveClass(/modal-guide-button/);
    await expect(orientationGuide).toHaveAttribute(
      'aria-label', 'Read more in the Guide');
    await expect(page.locator('#genmodal .gm-footer #orientation-guide'))
      .toHaveCount(0);
    await orientationGuide.click();
    await expect(page.getByRole('heading', {
      name:'Guide', exact:true
    })).toBeVisible();
    const freeholder = page.locator('[data-guide-entry="role-tier-1"]');
    await expect(freeholder).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('#guide-entry-detail-role-tier-1'))
      .toContainText('Good first actions');
    await page.getByRole('button', { name:'Close', exact:true }).click();
    // Guide close dismisses the guide outright — no menu detour
    await expect(page.locator('#genmodal')).toHaveClass(/hidden/);

    await page.evaluate(function () {
      FB.ui.showGuide();
    });
    await expect(page.locator('#genmodal')).toHaveClass(/guide-modal/);
    const guideChrome = await page.locator('#guide-controls').evaluate(function (controls) {
      const search = document.getElementById('guide-search');
      const footer = document.querySelector('#gm-body .gm-footer');
      const controlStyle = getComputedStyle(controls);
      const footerStyle = getComputedStyle(footer);
      return {
        footerBackground:footerStyle.backgroundImage,
        footerBorder:footerStyle.borderTopWidth,
        searchInset:Math.round(search.getBoundingClientRect().left -
          controls.getBoundingClientRect().left),
        toolbarPaddingLeft:controlStyle.paddingLeft,
        toolbarPaddingRight:controlStyle.paddingRight
      };
    });
    expect(guideChrome.footerBackground).toBe('none');
    expect(guideChrome.footerBorder).toBe('1px');
    expect(guideChrome.searchInset).toBe(2);
    expect(guideChrome.toolbarPaddingLeft).toBe('2px');
    expect(guideChrome.toolbarPaddingRight).toBe('2px');
    const guideEntryCount = await page.locator('[data-guide-entry]').count();
    await expect(page.locator('[data-guide-more-info]'))
      .toHaveCount(guideEntryCount);
    const dayDocs = page.locator(
      '#guide-entry-detail-day-to-day [data-guide-more-info]');
    await expect(dayDocs).toHaveAttribute('href',
      'https://github.com/dli9431/fallowborn/blob/main/docs/designs/time.md#daily-time-focuses-and-deeds');
    await expect(dayDocs).toHaveAttribute('target', '_blank');
    await expect(dayDocs).toHaveAttribute('rel', 'noopener');
    const guideDocHrefs = await page.locator('[data-guide-more-info]')
      .evaluateAll(function (links) {
        return links.map(function (link) { return link.getAttribute('href'); });
      });
    expect(guideDocHrefs.every(function (href) {
      return href.indexOf('.md#') >= 0;
    })).toBe(true);
    const exactGuideDocs = {
      resources:'docs/README.md#resources-and-reputation',
      roles:'docs/README.md#the-ladder',
      'role-monk':'docs/README.md#the-religious-ladder',
      'role-priest':'docs/README.md#the-religious-ladder',
      'role-bishop':'docs/designs/papacy.md#bishoprics-and-investiture',
      'role-cardinal':'docs/designs/papacy.md#cardinals',
      'role-pope':'docs/designs/papacy.md#authority-and-governance',
      careers:'docs/designs/characters.md#careers-training-and-work',
      'career-farmer':'docs/designs/characters.md#careers-training-and-work',
      'family-scopes':
        'docs/designs/characters.md#family-house-and-household-scope',
      inheritance:'docs/designs/characters.md#succession-and-inheritance',
      'child-identity':
        'docs/designs/marriage.md#child-culture-faith-and-house',
      'exceptional-sibling-courtship':
        'docs/designs/marriage.md#exceptional-sibling-courtship',
      'settlements-development':
        'docs/designs/development.md#settlements-and-development',
      travel:'docs/designs/travel.md#data-and-destinations',
      war:'docs/designs/war.md#causes-and-defensive-alliances',
      government:'docs/README.md#the-feudal-ladder'
    };
    for (const entryId in exactGuideDocs) {
      await expect(page.locator('#guide-entry-detail-' + entryId +
        ' [data-guide-more-info]')).toHaveAttribute('href',
        'https://github.com/dli9431/fallowborn/blob/main/' +
          exactGuideDocs[entryId]);
    }
    const generatedGuideDocErrors = await page.evaluate(function () {
      const root = 'https://github.com/dli9431/fallowborn/blob/main/';
      const groups = [
        ['[data-guide-entry^="skill-"]',
          root + 'docs/designs/characters.md#skills'],
        ['[data-guide-entry^="role-tier-"]',
          root + 'docs/README.md#the-ladder'],
        ['[data-guide-entry^="career-"]',
          root + 'docs/designs/characters.md#careers-training-and-work']
      ];
      const errors = [];
      groups.forEach(function (group) {
        document.querySelectorAll(group[0]).forEach(function (entry) {
          const detail = document.getElementById(
            entry.getAttribute('aria-controls'));
          const href = detail.querySelector('[data-guide-more-info]')
            .getAttribute('href');
          if (href !== group[1]) errors.push(entry.dataset.guideEntry);
        });
      });
      return errors;
    });
    expect(generatedGuideDocErrors).toEqual([]);
    await expect(page.locator(
      '#guide-entry-detail-role-tier-1 [data-guide-more-info]'))
      .toHaveAttribute('href',
        'https://github.com/dli9431/fallowborn/blob/main/docs/README.md#the-ladder');
    await expect(page.locator(
      '#guide-entry-detail-role-bishop [data-guide-more-info]'))
      .toHaveAttribute('href',
        'https://github.com/dli9431/fallowborn/blob/main/docs/designs/papacy.md#bishoprics-and-investiture');

    await page.locator('#guide-search').fill('religious advancement');
    const learning = page.locator('[data-guide-entry="skill-lea"]');
    await expect(learning).toBeVisible();
    await learning.click();
    await expect(learning).toHaveAttribute('aria-expanded', 'true');
    const learningDetail = page.locator('#guide-entry-detail-skill-lea');
    await expect(learningDetail).toBeVisible();
    await expect(learningDetail).toContainText('national research');
    await expect(learningDetail).toContainText('education and tutoring');
    await expect(learningDetail).toContainText('Papal systems');
    await expect(learningDetail.locator('[data-guide-more-info]'))
      .toHaveAttribute('href',
        'https://github.com/dli9431/fallowborn/blob/main/docs/designs/characters.md#skills');
    await expect(page.locator('#guide-search')).toBeVisible();

    await page.locator('#guide-search').fill('Workshop');
    const technology = page.locator('[data-guide-entry="tech-horizontal_loom"]');
    await expect(technology).toHaveCount(0);
    await expect(page.locator('#guide-category option[value="technology"]'))
      .toHaveCount(0);

    await page.evaluate(function () {
      FB.state.player.tier = 3;
      FB.ui.showGuide();
    });
    await page.locator('#guide-search').fill('Workshop');
    const landedTechnology = page.locator(
      '[data-guide-entry="tech-horizontal_loom"]');
    await expect(landedTechnology).toBeVisible();
    await expect(landedTechnology).toContainText('Horizontal Loom');
    const landedGuideEntryCount = await page.locator('[data-guide-entry]').count();
    await expect(page.locator('[data-guide-more-info]'))
      .toHaveCount(landedGuideEntryCount);
    const landedGuideDocHrefs = await page.locator('[data-guide-more-info]')
      .evaluateAll(function (links) {
        return links.map(function (link) { return link.getAttribute('href'); });
      });
    expect(landedGuideDocHrefs.every(function (href) {
      return href.indexOf('.md#') >= 0;
    })).toBe(true);
    await expect(page.locator(
      '#guide-entry-detail-technology [data-guide-more-info]'))
      .toHaveAttribute('href',
        'https://github.com/dli9431/fallowborn/blob/main/docs/designs/tech.md#research-slots-reserve-and-completion');
    const technologyGuideDocErrors = await page.evaluate(function () {
      const root = 'https://github.com/dli9431/fallowborn/blob/main/' +
        'docs/research/medieval-technology-catalogue.md#';
      const sections = {
        agriculture:'agriculture-and-animal-power-26',
        crafts:'crafts-materials-and-industry-30',
        commerce:'commerce-transport-and-infrastructure-24',
        learning:'learning-medicine-and-natural-knowledge-25',
        governance:'governance-law-and-institutions-25',
        warfare:'warfare-and-fortification-32',
        seafaring:'seafaring-and-navigation-18'
      };
      const errors = [];
      document.querySelectorAll('[data-guide-entry^="tech-"]')
        .forEach(function (entry) {
          const id = entry.dataset.guideEntry.slice(5);
          const detail = document.getElementById(
            entry.getAttribute('aria-controls'));
          const href = detail.querySelector('[data-guide-more-info]')
            .getAttribute('href');
          const def = FBDATA.tech[id];
          if (!def || href !== root + sections[def.domain]) errors.push(id);
        });
      return errors;
    });
    expect(technologyGuideDocErrors).toEqual([]);
    await expect(page.locator(
      '#guide-entry-detail-tech-horizontal_loom [data-guide-more-info]'))
      .toHaveAttribute('href',
        'https://github.com/dli9431/fallowborn/blob/main/docs/research/medieval-technology-catalogue.md#crafts-materials-and-industry-30');
  });

test('succession and child identity explanations use the live family rules',
  async function ({ page }) {
    const result = await page.evaluate(function () {
      const s = FB.state;
      const me = s.chars[s.player.charId];
      const spouse = FB.makeCharacter(s, {
        name:'Edwin', sex:'m', born:s.date.year - 24,
        culture:'anglo_saxon', religion:me.religion, dyn:'Otherhouse'
      });
      const child = FB.makeCharacter(s, {
        name:'Beatrice', sex:'f', born:s.date.year - 4,
        culture:me.culture, religion:me.religion, dyn:me.dyn,
        fatherId:spouse.id, motherId:me.id
      });
      const collateralSpouse = FB.makeCharacter(s, {
        name:'Martin', sex:'m', born:s.date.year - 5,
        culture:'frankish', religion:me.religion, dyn:'Martinhouse'
      });
      me.spouseId = spouse.id;
      spouse.spouseId = me.id;
      me.childrenIds.push(child.id);
      spouse.childrenIds.push(child.id);
      FB.touchFamily();

      const review = FB.heirReview(s);
      const line = FB.childIdentityPreview(s, me, spouse, true);
      const collateral = FB.childIdentityPreview(
        s, child, collateralSpouse, false);
      const childRow = review.filter(function (row) {
        return row.character.id === child.id;
      })[0];
      const spouseRow = review.filter(function (row) {
        return row.character.id === spouse.id;
      })[0];
      return {
        child:{
          id:child.id, eligible:childRow.eligible, code:childRow.code
        },
        spouse:{
          id:spouse.id, eligible:spouseRow.eligible, code:spouseRow.code
        },
        collateralSpouseId:collateralSpouse.id,
        line:line,
        collateral:collateral
      };
    });

    expect(result.child.eligible).toBe(true);
    expect(result.child.code).toBe('child');
    expect(result.spouse.eligible).toBe(false);
    expect(result.spouse.code).toBe('spouse');
    expect(result.line.dynastyParentId).toBe(
      await page.evaluate(function () { return FB.state.player.charId; }));
    expect(result.collateral.cultureParentId).toBe(result.child.id);
    expect(result.collateral.dynastyParentId).toBe(
      result.collateralSpouseId);

    await page.evaluate(function () {
      FB.ui.showHeirPick();
    });
    await expect(page.locator('[data-namedheir]').first())
      .toContainText('Eligible: living child');
    await expect(page.locator('.succession-review')).toContainText(
      'marriage joins the household');
  });

test('settlement growth reports every derived threshold and the bookmark baseline',
  async function ({ page }) {
    const rows = await page.evaluate(function () {
      const s = FB.state;
      const pid = s.player.provinceId;
      const original = s.dev[pid];
      const out = [];
      for (const development of [2, 3, 4, 5, 6, 7, 9]) {
        s.dev[pid] = development;
        out.push(FB.settlementDevelopment(s, pid));
      }
      s.dev[pid] = original;
      return out;
    });

    /* London's head settlement is authored as a town, so the dev-4 head-town
       threshold is already satisfied at the baseline and is never promised. */
    expect(rows.map(function (row) {
      return [row.development, row.next, row.change];
    })).toEqual([
      [2, 3, 'new_village'],
      [3, 5, 'new_village'],
      [4, 5, 'new_village'],
      [5, 6, 'second_town'],
      [6, 7, 'head_city'],
      [7, 9, 'new_village'],
      [9, null, null]
    ]);
    expect(rows[0].bookmark).toBeGreaterThan(0);

    await page.evaluate(function () {
      FB.ui.showSettlement(FB.state.player.provinceId, 0);
    });
    await expect(page.locator('.settlement-development-summary'))
      .toContainText('County development');
    await expect(page.locator('.settlement-development-summary'))
      .toContainText('chronicle began');
    await expect(page.getByRole('button', {
      name:'Guide: settlements and development', exact:true
    })).toBeVisible();
  });
