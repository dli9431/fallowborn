'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'js/ui_misc.js', 'js/ui_modals.js', 'js/main.js', 'js/model.js', 'js/events.js'
]);
const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { startDeterministicGame } = require('../support/game/start');

test('succession labels name each male and female close relation', async function ({ page }, testInfo) {
  await openGame(page, testInfo);
  await startDeterministicGame(page);
  const cases = [
    ['child', 'son', 'daughter'], ['grandchildren', 'grandson', 'granddaughter'],
    ['parents', 'father', 'mother'], ['siblings', 'brother', 'sister'],
    ['grandparents', 'grandfather', 'grandmother'],
    ['nieces_nephews', 'nephew', 'niece'], ['uncles_aunts', 'uncle', 'aunt'],
    ['cousins', 'cousin', 'cousin']
  ];
  const labels = await page.evaluate(function (cases) {
    return cases.map(function (entry) {
      return ['m', 'f'].map(function (sex) {
        return FB.ui._shared.heirEligibilityText(FB.state,
          { eligible:true, code:entry[0], character:{ sex:sex } });
      });
    });
  }, cases);
  for (let i = 0; i < cases.length; i++) {
    expect(labels[i][0]).toContain('living ' + cases[i][1] + ' of');
    expect(labels[i][1]).toContain('living ' + cases[i][2] + ' of');
    expect(labels[i].join(' ')).not.toContain(' or ');
  }
});

test('player death shows nephew and niece separately in the successor buttons', async function ({ page }, testInfo) {
  await openGame(page, testInfo);
  await startDeterministicGame(page);
  const ids = await page.evaluate(function () {
    const s = FB.state, me = s.chars[s.player.charId];
    const sibling = FB.siblingsOf(s, me).find(function (c) { return !c.dead; });
    if (!sibling) throw new Error('Expected a sibling in the starting family');
    const ids = ['m', 'f'].map(function (sex) {
      const options = { name:sex === 'm' ? 'Test Nephew' : 'Test Niece', sex:sex,
        born:s.date.year - 18, culture:me.culture, religion:me.religion, dyn:me.dyn, traitsN:0 };
      options[sibling.sex === 'f' ? 'motherId' : 'fatherId'] = sibling.id;
      const c = FB.makeCharacter(s, options);
      if (sibling.childrenIds.indexOf(c.id) < 0) sibling.childrenIds.push(c.id);
      return c.id;
    });
    FB.touchFamily();
    FB.game.die('Died testing successor relationship labels.');
    return ids;
  });
  await expect(page.locator('[data-heir="' + ids[0] + '"]')).toContainText('living nephew of the family');
  await expect(page.locator('[data-heir="' + ids[1] + '"]')).toContainText('living niece of the family');
});
