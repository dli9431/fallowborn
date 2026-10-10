'use strict';
const { test, expect } = require('../support/fixture');
const { dependsOnRuntime } = require('../support/runtime-dependencies');
const { startHistoricalGame } = require('../support/game/historical-start');
const { waitForUiRefresh } = require('../support/game/ui');
dependsOnRuntime(__filename, [
  'index.html', 'data/actions.js', 'data/cultures.js', 'data/eras.js', 'data/systems.js',
  'data/political_institutions.js', 'data/bookmark_476.js', 'data/bookmark_476_italy.js',
  'data/bookmark_476_dalmatia_east.js', 'data/bookmark_476_gaul_iberia.js',
  'data/bookmark_476_africa.js', 'data/bookmark_476_outer.js', 'data/bookmark_476_wider.js',
  'data/bookmark_476_wider_identities.js', 'data/distribution_crazygames.js',
  'js/institutions.js', 'js/actions.js', 'js/model.js', 'js/systems.js',
  'js/ui_modals.js', 'js/ui_panels.js', 'js/ui_misc.js', 'js/crazygames.js', 'css/style.css'
]);

for (const crazygames of [false, true]) {
  test('Bishoprics follows personal faith in both Deeds layouts, distribution ' + crazygames,
    async function ({ page }, testInfo) {
      if (crazygames) await page.setViewportSize({ width:390, height:844 });
      await startHistoricalGame(page, testInfo, { bookmark:'476',
        code:'CHURCHFAITH-476-federate_476-ravenna-m-Marcus-standard-0-gothic.homoian' }, crazygames);
      for (const actionType of [false, true]) {
        for (const faith of ['homoian', 'nicene', 'miaphysite', 'zoroastrian', 'germanic_pagan']) {
          const eligible = ['homoian', 'nicene', 'miaphysite'].includes(faith);
          const result = await page.evaluate(function (input) {
            const s = FB.state;
            s.chars[s.player.charId].religion = input.faith;
            FB.game.uiPrefs.groupDeedsByActionType = input.actionType;
            const before = JSON.stringify(s), rng = FB.getRngState(), uid = FB.getUidCounter();
            const all = FB.localInstitutionList(s, 'church');
            const personal = FB.playerChurchInstitutions(s);
            const status = FB.instantStatus(s, 'church_dealings');
            const defs = FB.localInstitutionDefinitions(s);
            const expected = Object.keys(defs).filter(function (id) {
              const def = defs[id];
              return s.localInstitutions[id] && def.religion === input.faith &&
                (def.officeId || def.kind === 'congregation');
            }).sort();
            // Lists are detached reads even when the caller edits the returned rows.
            if (personal.length) personal[0].record.demands.length = 0;
            const pure = before === JSON.stringify(s) && rng === FB.getRngState() && uid === FB.getUidCounter();
            FB.ui.refresh();
            FB.ui.revealDeedAction('church_dealings');
            return { shown:status.shown, pure:pure, expected:expected,
              ownCongregation:all.some(function (item) {
                return item.def.kind === 'congregation' && item.def.religion === input.faith;
              }),
              foreignRetained:all.some(function (item) { return item.def.religion !== input.faith; }) };
          }, { faith:faith, actionType:actionType });
          expect(result.shown, faith).toBe(eligible);
          expect(result.pure, faith).toBe(true);
          expect(result.foreignRetained, faith).toBe(true);
          await waitForUiRefresh(page);
          const deed = page.locator('#tab-actions [data-action-id="church_dealings"]');
          if (!eligible) {
            if (faith === 'zoroastrian') expect(result.ownCongregation).toBe(true);
            await expect(deed).toHaveCount(0);
            await page.evaluate(function () {
              FB.runInstant(FB.state, 'church_dealings');
              FB.ui.showLocalInstitutions('church');
            });
            await expect(page.locator('#genmodal')).toHaveClass(/hidden/);
            continue;
          }
          await expect(deed).toBeVisible();
          await deed.click();
          const cards = page.locator('#gm-body [data-local-institution]');
          expect(await cards.evaluateAll(function (nodes) {
            return nodes.map(function (node) { return node.dataset.localInstitution; }).sort();
          }), faith).toEqual(result.expected);
          if (faith === 'homoian') {
            await expect(page.locator('[data-local-institution="ravenna_homoian_see"]')).toHaveCount(1);
            await expect(page.locator('[data-local-institution="ravenna_see"]')).toHaveCount(0);
          }
          if (faith === 'nicene') {
            const vacant = page.locator('[data-local-institution="carthage_see"]');
            await expect(vacant).toContainText('Vacant');
            await expect(vacant.locator('[data-local-action="mediate"]')).toBeDisabled();
            await expect(page.locator('[data-local-institution="carthage_homoian_see"]')).toHaveCount(0);
            const review = page.locator('[data-local-institution="altava_see"] [data-local-action="mediate"]');
            await review.scrollIntoViewIfNeeded();
            await review.focus();
            const scroll = await page.locator('#gm-body').evaluate(function (node) { return node.scrollTop; });
            expect(scroll).toBeGreaterThan(0);
            await review.press('Enter');
            await page.locator('[data-modal-nav="back"]').click();
            await expect(review).toBeFocused();
            expect(Math.abs(await page.locator('#gm-body').evaluate(function (node) { return node.scrollTop; }) - scroll)).toBeLessThan(3);
            expect(await cards.evaluateAll(function (nodes) {
              return nodes.map(function (node) { return node.dataset.localInstitution; }).sort();
            })).toEqual(result.expected);
          }
          if (faith === 'miaphysite') {
            await expect(page.locator('[data-local-institution="alexandria_see"]')).toHaveCount(1);
            await expect(page.locator('[data-local-institution="antioch_see"]')).toHaveCount(1);
            await expect(page.locator('[data-local-institution="rome_see"]')).toHaveCount(0);
          }
          await page.locator('[data-modal-nav="close"]').click();
        }
      }
    });
}
