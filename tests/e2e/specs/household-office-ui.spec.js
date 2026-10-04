'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'data/economy.js', 'js/agency.js', 'js/economy.js', 'js/model.js', 'js/events.js',
  'js/politics.js', 'js/items.js', 'js/ui_misc.js', 'js/ui_modals.js',
  'js/main.js', 'css/style.css'
]);
const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { startDeterministicGame } = require('../support/game/start');

async function startHousehold(page, testInfo, options) {
  await openGame(page, testInfo);
  await startDeterministicGame(page);
  return page.evaluate(function (opts) {
    var s = FB.state;
    FB.game.paused = true;
    var me = s.chars[s.player.charId];
    s.player.tier = 1;
    s.player.gold = 100;
    s.player.familyOffices = {};
    s.player.retainers = [];
    function person(name, sex, age) {
      return FB.makeCharacter(s, {
        name:name, sex:sex, born:s.date.year - age,
        culture:me.culture, religion:me.religion, dyn:me.dyn, traitsN:0
      });
    }
    var daughter = person('Fara', 'f', 20);
    daughter[me.sex === 'f' ? 'motherId' : 'fatherId'] = me.id;
    me.childrenIds.push(daughter.id);
    FB.setCareer(s, daughter, 'merchant', 'journeyman');
    if (opts.married) {
      var husband = person('Berengar', 'm', 24);
      daughter.spouseId = husband.id;
      husband.spouseId = daughter.id;
    }
    var factor = person('Genovefa', 'f', 30);
    FB.setCareer(s, factor, 'merchant', 'journeyman');
    factor.role = 'retainer';
    if (opts.occupied) s.player.retainers.push({
      charId:factor.id, office:'factor', pay:2,
      startedTurn:s.turn, unpaid:0
    });
    FB.touchFamily();
    FB.ui.refresh();
    return { daughter:daughter.id, factor:factor.id, turn:s.turn, gold:s.player.gold };
  }, options || {});
}

for (const viewport of [
  { name:'desktop', width:1505, height:900 },
  { name:'mobile', width:390, height:844 }
]) {
  test.describe(viewport.name + ' household office reviews', function () {
    test.use({ viewport:{ width:viewport.width, height:viewport.height } });

    test('married daughter sees membership and named holder blockers with retained navigation',
      async function ({ page }, testInfo) {
        const ids = await startHousehold(page, testInfo, { married:true, occupied:true });
        await page.evaluate(function (cid) { FB.ui.showCharModal(cid); }, ids.daughter);
        const review = page.locator('[data-interaction-action="management.family.office"]');
        await expect(review).toHaveText(/Review household offices/);
        await review.focus();
        await review.click();
        const factor = page.locator('[data-family-office="factor"]');
        await expect(factor).toBeDisabled();
        await expect(factor).toContainText('Married children and grandchildren');
        const toggle = page.locator('[aria-controls="family-office-details-factor"]');
        await toggle.click();
        const details = page.locator('#family-office-details-factor');
        await expect(details).toContainText('cannot hold an unpaid family office');
        await expect(details).toContainText('Already held by Genovefa');
        await expect(details).toContainText('Manage household service');
        await expect(details).not.toContainText('Requires the');
        const holder = page.locator('#family-office-holder-factor');
        await holder.scrollIntoViewIfNeeded();
        await holder.focus();
        const scroll = await page.locator('#gm-body').evaluate(function (el) { return el.scrollTop; });
        await holder.click();
        await expect(page.locator('#gm-body')).toContainText('Genovefa');
        await page.keyboard.press('Escape');
        await expect(toggle).toHaveAttribute('aria-expanded', 'true');
        await expect(details).toBeVisible();
        await expect(holder).toBeFocused();
        await expect.poll(function () {
          return page.locator('#gm-body').evaluate(function (el) { return el.scrollTop; });
        }).toBe(scroll);
        const state = await page.evaluate(function (cid) {
          var s = FB.state;
          return {
            status:FB.familyOfficeStatus(s, 'factor', cid),
            appointed:FB.appointFamilyOffice(s, 'factor', cid),
            turn:s.turn, gold:s.player.gold
          };
        }, ids.daughter);
        expect(state.status.reasons).toEqual([
          { type:'married_descendant' },
          { type:'occupied', charId:ids.factor, paid:true }
        ]);
        expect(state.appointed).toBe(false);
        expect(state.turn).toBe(ids.turn);
        expect(state.gold).toBe(ids.gold);
        await page.locator('#gm-body > .gm-footer > #gm-cancel').click();
        await expect(review).toBeFocused();
      });

    test('an occupied office at confirmation refreshes requirements without spending a day',
      async function ({ page }, testInfo) {
        const ids = await startHousehold(page, testInfo);
        await page.evaluate(function (cid) { FB.ui.showFamilyOffice(cid); }, ids.daughter);
        const factor = page.locator('[data-family-office="factor"]');
        await expect(factor).toBeEnabled();
        await page.locator('[aria-controls="family-office-details-factor"]').click();
        await page.evaluate(function (cid) {
          var s = FB.state;
          s.player.retainers.push({ charId:cid, office:'factor', pay:2, startedTurn:s.turn, unpaid:0 });
        }, ids.factor);
        await factor.scrollIntoViewIfNeeded();
        await factor.focus();
        const scroll = await page.locator('#gm-body').evaluate(function (el) { return el.scrollTop; });
        await factor.click();
        await expect(factor).toBeDisabled();
        await expect(factor).toContainText('Already held by Genovefa');
        await expect(page.locator('#family-office-details-factor')).toBeVisible();
        await expect(factor.locator('xpath=ancestor::*[contains(@class,"review-action-card")]')).toBeFocused();
        expect(await page.locator('#gm-body').evaluate(function (el) { return el.scrollTop; })).toBe(scroll);
        const state = await page.evaluate(function () {
          return { turn:FB.state.turn, gold:FB.state.player.gold, offices:FB.state.player.familyOffices };
        });
        expect(state).toEqual({ turn:ids.turn, gold:ids.gold, offices:{} });
      });

    test('paid factor dismissal can be cancelled and then frees the office without a deed day',
      async function ({ page }, testInfo) {
        const ids = await startHousehold(page, testInfo, { occupied:true });
        const standing = await page.evaluate(function (cid) {
          FB.ui.showCharModal(cid);
          return FB.standingOf(FB.state, { kind:'character', id:cid });
        }, ids.factor);
        await page.locator('[data-interaction-action="management.retainer"]').click();
        await page.locator('#retainer-dismiss').focus();
        await page.locator('#retainer-dismiss').click();
        await expect(page.locator('#retainer-dismiss-confirm')).toContainText('−15 Standing');
        await expect(page.locator('#retainer-dismiss-confirm')).toContainText('spends no day');
        await page.locator('#gm-body > .gm-footer > #gm-cancel').click();
        await expect(page.locator('#retainer-dismiss')).toBeFocused();
        expect(await page.evaluate(function (cid) {
          return !!FB.retainerRecord(FB.state, cid);
        }, ids.factor)).toBe(true);
        await page.locator('#retainer-dismiss').click();
        await page.keyboard.press('Escape');
        await expect(page.locator('#retainer-dismiss')).toBeFocused();
        await page.locator('#retainer-dismiss').click();
        await page.locator('#retainer-dismiss-confirm').click();
        const result = await page.evaluate(function (ids) {
          var s = FB.state;
          return {
            record:FB.retainerRecord(s, ids.factor),
            canAppoint:FB.canAppointFamilyOffice(s, 'factor', ids.daughter),
            standing:FB.standingOf(s, { kind:'character', id:ids.factor }),
            turn:s.turn, gold:s.player.gold
          };
        }, ids);
        expect(result).toEqual({
          record:null, canAppoint:true, standing:standing - 15,
          turn:ids.turn, gold:ids.gold
        });
      });
  });
}

test('unmarried adult daughter can take the vacant factor office through its review',
  async function ({ page }, testInfo) {
    const ids = await startHousehold(page, testInfo);
    await page.evaluate(function (cid) { FB.ui.showCharModal(cid); }, ids.daughter);
    await page.locator('[data-interaction-action="management.family.office"]').click();
    const factor = page.locator('[data-family-office="factor"]');
    await expect(factor).toBeEnabled();
    await expect(factor).toContainText('unpaid family duty');
    await expect(factor).toContainText('spends one day');
    await factor.click();
    const result = await page.evaluate(function (cid) {
      return { office:FB.familyOfficeRecord(FB.state, cid), turn:FB.state.turn };
    }, ids.daughter);
    expect(result.office).toEqual({ office:'factor', charId:ids.daughter });
    expect(result.turn).toBe(ids.turn + 1);
  });

test('reviews disclose age, station, occupation and unpaid holder requirements',
  async function ({ page }, testInfo) {
    const ids = await startHousehold(page, testInfo);
    await page.evaluate(function (cid) {
      var s = FB.state;
      s.chars[cid].born = s.date.year - 15;
      FB.ui.showFamilyOffice(cid);
    }, ids.daughter);
    await page.locator('[aria-controls="family-office-details-steward"]').click();
    await expect(page.locator('#family-office-details-steward')).toContainText('Requires age 16');
    await expect(page.locator('#family-office-details-steward')).toContainText('Requires station Gentry');
    await expect(page.locator('#family-office-details-steward')).toContainText('occupation');
    await page.evaluate(function (cid) {
      var s = FB.state;
      s.chars[cid].born = s.date.year - 20;
      FB.appointFamilyOffice(s, 'factor', cid);
      FB.ui.showRetainerHire();
    }, ids.daughter);
    await expect(page.locator('[data-retainer-office="factor"]')).toBeDisabled();
    await expect(page.locator('[data-retainer-office="factor"]')).toContainText('Already held by Fara');
    await expect(page.locator('[data-retainer-office="factor"]')).toContainText('Relieve them');
    await page.evaluate(function (cid) { FB.ui.showFamilyOffice(cid); }, ids.daughter);
    await expect(page.locator('#family-office-remove')).toContainText('Relieve them of');
  });
