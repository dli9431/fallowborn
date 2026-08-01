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

test('technology search discovers authored unlocks and locked enterprises link back',
  async function ({ page }) {
    await page.evaluate(function () {
      const s = FB.state;
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
      '[data-enterprise-tech="horizontal_loom"]');
    await expect(lockedWorkshop).toBeVisible();
    await expect(lockedWorkshop).toContainText('Workshop');
    await expect(lockedWorkshop).toContainText('Requires Horizontal Loom');
    await lockedWorkshop.click();
    await expect(page.getByRole('heading', { name:/Horizontal Loom/ }))
      .toBeVisible();
  });

test('the Guide keeps orientations and topic details in one searchable sheet',
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
    await expect(page.getByRole('heading', {
      name:'Guide', exact:true
    })).toBeVisible();
    await expect(page.locator('#guide-controls')).toBeVisible();
    const freeholder = page.locator('[data-guide-entry="role-tier-1"]');
    await expect(freeholder).toHaveAttribute('aria-expanded', 'true');
    const freeholderDetail = page.locator('#guide-entry-detail-role-tier-1');
    await expect(freeholderDetail).toBeVisible();
    await expect(freeholderDetail).toContainText('New resources');
    await expect(freeholderDetail).toContainText('Recurring duties');
    await expect(freeholderDetail).toContainText('Good first actions');
    await expect(page.getByRole('button', { name:'Open deeper guide' }))
      .toHaveCount(0);
    await expect(page.getByRole('button', { name:'Replay this orientation' }))
      .toHaveCount(0);
    await page.getByRole('button', { name:'Close', exact:true }).click();
    expect(await page.evaluate(function () {
      return {
        seen:!!FB.state.player.roleOrientationsSeen['role-tier-1'],
        repeated:FB.ui.maybeShowRoleOrientation()
      };
    })).toEqual({ seen:true, repeated:false });

    await page.evaluate(function () {
      FB.ui.showGuide();
    });
    await expect(page.locator('#genmodal')).toHaveClass(/guide-modal/);

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
    await expect(page.locator('#guide-search')).toBeVisible();

    await page.locator('#guide-search').fill('Workshop');
    const technology = page.locator('[data-guide-entry="tech-horizontal_loom"]');
    await expect(technology).toBeVisible();
    await expect(technology).toContainText('Horizontal Loom');
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
      for (const development of [3, 4, 5, 6, 7]) {
        s.dev[pid] = development;
        out.push(FB.settlementDevelopment(s, pid));
      }
      s.dev[pid] = original;
      return out;
    });

    expect(rows.map(function (row) {
      return [row.development, row.next, row.change];
    })).toEqual([
      [3, 4, 'head_town'],
      [4, 5, 'new_village'],
      [5, 6, 'second_town'],
      [6, 7, 'head_city'],
      [7, null, null]
    ]);
    expect(rows[0].bookmark).toBeGreaterThan(0);

    await page.evaluate(function () {
      FB.ui.showSettlement(FB.state.player.provinceId, 0);
    });
    await expect(page.locator('.settlement-development-summary'))
      .toContainText('County development');
    await expect(page.locator('.settlement-development-summary'))
      .toContainText('Bookmark start');
    await expect(page.getByRole('button', {
      name:'Guide: settlements and development', exact:true
    })).toBeVisible();
  });
