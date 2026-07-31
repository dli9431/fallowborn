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
        return id !== 'seed_selection';
      });
      record.active = record.active.filter(function (id) {
        return id !== 'seed_selection';
      });
      FB.ui.showTech();
    });

    await page.locator('#tech-search').fill('Orchard');
    const seedSelection = page.locator(
      '[data-tech-open="seed_selection"]:not(.hidden)');
    await expect(seedSelection).toBeVisible();
    await expect(seedSelection).toContainText('Seed Selection');
    await expect(seedSelection).toContainText('Orchard');
    await seedSelection.click();
    await expect(page.locator('#gm-body')).toContainText('Requires all');

    await page.evaluate(function () {
      FB.ui.showEnterpriseMarket(0);
    });
    const lockedOrchard = page.locator(
      '[data-enterprise-tech="seed_selection"]');
    await expect(lockedOrchard).toBeVisible();
    await expect(lockedOrchard).toContainText('Orchard');
    await expect(lockedOrchard).toContainText('Requires Seed Selection');
    await lockedOrchard.click();
    await expect(page.getByRole('heading', { name:/Seed Selection/ }))
      .toBeVisible();
  });

test('the Guide searches skills and live technology unlock terms',
  async function ({ page }) {
    const onboarding = await page.evaluate(function () {
      return {
        seen:!!FB.state.player.roleOrientationsSeen['role-tier-0'],
        repeated:FB.ui.maybeShowRoleOrientation()
      };
    });
    expect(onboarding).toEqual({ seen:true, repeated:false });

    await page.evaluate(function () {
      FB.state.player.tier = 1;
      delete FB.state.player.roleOrientationsSeen['role-tier-1'];
      FB.ui.maybeShowRoleOrientation();
    });
    await expect(page.getByRole('heading', {
      name:'New role: Freeholder', exact:true
    })).toBeVisible();
    await page.getByRole('button', { name:'Got it', exact:true }).click();
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
    await expect(page.locator('#gm-body')).toContainText('national research');
    await expect(page.locator('#gm-body')).toContainText('education and tutoring');
    await expect(page.locator('#gm-body')).toContainText('Papal systems');

    await page.getByRole('button', { name:'Back to Guide', exact:true }).click();
    await page.locator('#guide-search').fill('Orchard');
    const technology = page.locator('[data-guide-entry="tech-seed_selection"]');
    await expect(technology).toBeVisible();
    await expect(technology).toContainText('Seed Selection');
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
