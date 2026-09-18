'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'js/ui_modals.js', 'js/ui_misc.js', 'js/ui_panels.js', 'js/model.js', 'js/events.js',
  'js/main.js', 'js/actions.js', 'js/world.js', 'data/technology.js', 'data/map_data.js', 'css/style.css'
]);
const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { startDeterministicGame } = require('../support/game/start');

test.beforeEach(async function ({ page }, testInfo) {
  await openGame(page, testInfo);
  await startDeterministicGame(page);
  await page.evaluate(function () { FB.game.setPaused(true); });
});

for (const width of [390, 1280]) {
  test('ordinary family sheets navigate through spouses, children and parents at ' + width, async function ({ page }) {
    await page.setViewportSize({ width:width, height:844 });
    const ids = await page.evaluate(function () {
      const s = FB.state, me = s.chars[s.player.charId];
      function person(sex) {
        return FB.makeCharacter(s, { sex:sex, born:s.date.year - 22, station:1,
          culture:me.culture, religion:me.religion, traitsN:0 });
      }
      const child = person('f'), partner = person('m'), grandchild = person('f');
      child[me.sex === 'f' ? 'motherId' : 'fatherId'] = me.id;
      me.childrenIds.push(child.id);
      child.spouseId = partner.id; partner.spouseId = child.id;
      grandchild.motherId = child.id; grandchild.fatherId = partner.id;
      grandchild.born = s.date.year - 2;
      child.childrenIds.push(grandchild.id); partner.childrenIds.push(grandchild.id);
      FB.touchFamily();
      FB.ui.showCharModal(child.id);
      return { child:child.id, partner:partner.id, grandchild:grandchild.id, head:me.id };
    });
    const link = function (id) { return page.locator('[data-baron-family-cid="' + id + '"]'); };
    await expect(link(ids.partner)).toContainText('Husband');
    await expect(link(ids.grandchild)).toContainText('Daughter');
    await expect(link(ids.head)).toBeVisible();
    await link(ids.grandchild).focus();
    const scroll = await page.locator('#gm-body').evaluate(function (body) { return body.scrollTop; });
    await page.keyboard.press('Enter');
    await expect(link(ids.child)).toContainText('Mother');
    await expect(link(ids.partner)).toContainText('Father');
    await link(ids.child).click();
    await expect(link(ids.grandchild)).toContainText('Daughter');
    await page.locator('#cm-close').click();
    await expect(link(ids.child)).toBeFocused();
    await page.locator('#cm-close').click();
    await expect(link(ids.grandchild)).toBeFocused();
    expect(await page.locator('#gm-body').evaluate(function (body) { return body.scrollTop; })).toBeCloseTo(scroll, 0);
  });
}

for (const sex of ['m', 'f']) {
  test('ordinary ' + (sex === 'm' ? 'nephew' : 'niece') + ' matches support pledging, replacement and wedding', async function ({ page }) {
    const id = await page.evaluate(function (sex) {
      const s = FB.state, me = s.chars[s.player.charId];
      const sibling = FB.siblingsOf(s, me).find(function (c) { return !c.dead; });
      if (!sibling) throw new Error('Expected a sibling');
      const kin = FB.makeCharacter(s, { sex:sex, born:s.date.year - 12, station:1,
        culture:me.culture, religion:me.religion, traitsN:0 });
      kin[sibling.sex === 'f' ? 'motherId' : 'fatherId'] = sibling.id;
      sibling.childrenIds.push(kin.id);
      s.player.gold = 10000; s.player.prestige = 1000;
      FB.touchFamily();
      FB.ui.showCharModal(kin.id);
      return kin.id;
    }, sex);
    await page.getByRole('button', { name:'Arrange a match…', exact:false }).click();
    await expect(page.locator('[data-match]')).toHaveCount(3);
    await expect(page.locator('#match-policy-protection')).toHaveCount(0);
    const result = await page.evaluate(function (id) {
      const s = FB.state, kin = s.chars[id];
      const household = FB.isHouseholdCharacter(s, id);
      const first = FB.spawnMatchCandidates(s, kin).find(function (c) { return FB.kinMatchTerms(s, kin, c).ok; });
      kin.royalLine = {};
      const royalBlocked = !FB.arrangedMatchKind(s, id);
      delete kin.royalLine;
      const parentKey = kin.motherId ? 'motherId' : 'fatherId';
      first[parentKey] = kin[parentKey];
      FB.touchFamily();
      const gold = s.player.gold;
      const kinshipBlocked = !FB.sealKinMatch(s, kin, first) && s.player.gold === gold;
      delete first[parentKey];
      FB.touchFamily();
      first.born = s.date.year - 12;
      const pledged = FB.sealKinMatch(s, kin, first);
      const options = { replacingBetrothedId:first.id };
      const next = FB.spawnMatchCandidates(s, kin, options).find(function (c) { return FB.kinMatchTerms(s, kin, c, options).ok; });
      next.born = s.date.year - 12;
      const replaced = FB.sealKinMatch(s, kin, next, options);
      const released = FB.breakBetrothal(s, kin);
      const final = FB.spawnMatchCandidates(s, kin).find(function (c) { return FB.kinMatchTerms(s, kin, c).ok; });
      kin.born = s.date.year - 20; final.born = s.date.year - 20;
      const wed = FB.sealKinMatch(s, kin, final);
      return { household:household, royalBlocked:royalBlocked, kinshipBlocked:kinshipBlocked,
        pledged:pledged, replaced:replaced, released:!!released,
        wed:wed, spouses:kin.spouseId === final.id && final.spouseId === kin.id,
        forbidden:FB.kinMatchTerms(s, kin, final).ok,
        tech:FBDATA.techImpactReviews.features.collateral_family_matches.mode };
    }, id);
    expect(result).toEqual({ household:false, royalBlocked:true, kinshipBlocked:true,
      pledged:true, replaced:true, released:true,
      wed:true, spouses:true, forbidden:false, tech:'none' });
  });
}
