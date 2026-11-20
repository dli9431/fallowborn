'use strict';

const path = require('path');
const { test, expect } = require('../support/fixture');
const { openGame, prepareGameContent } = require('../support/game/navigation');
const { startDeterministicGame } = require('../support/game/start');
const { dependsOnRuntime } = require('../support/runtime-dependencies');
const lamps = require('../fixtures/authoring/household-shortfall-lamps.json');

dependsOnRuntime(__filename, [
  'data/economy.js', 'js/actions.js', 'js/economy.js', 'js/market.js',
  'js/mods.js', 'js/save.js', 'js/ui_misc.js', 'js/ui_modals.js'
]);

test('an ordinary JSON standard uses live prices and yields to fallback after one reduction', async function ({ page }, info) {
  await openGame(page, info);
  const validation = await page.evaluate(function (fixture) {
    const before = JSON.stringify([FBDATA.householdStandards, FB.state, FB.mods.sig()]);
    const rng = FB.getRngState(), uid = FB.getUidCounter();
    const accepted = FB.mods.validate(fixture);
    const malformed = JSON.parse(JSON.stringify(fixture));
    malformed.householdStandards.winter_lamps.levels[0].marketBasket.constructor = 1;
    const rejected = FB.mods.validate(malformed);
    return {
      accepted, rejected,
      pure:before === JSON.stringify([FBDATA.householdStandards, FB.state, FB.mods.sig()]) &&
        rng === FB.getRngState() && uid === FB.getUidCounter()
    };
  }, lamps);
  expect(validation.accepted).toEqual([]);
  expect(validation.rejected).toHaveLength(1);
  expect(validation.rejected[0]).toContain('householdStandards.winter_lamps.levels[0].marketBasket.constructor');
  expect(validation.pure).toBe(true);

  await page.evaluate(function () { FB.ui.showMods(); });
  await page.locator('#modfile').setInputFiles(path.resolve(__dirname, '../fixtures/authoring/household-shortfall-lamps.json'));
  await Promise.all([page.waitForNavigation({ waitUntil:'domcontentloaded' }), page.locator('#mod-apply').click()]);
  await prepareGameContent(page);
  expect(await page.evaluate(function () {
    return FBDATA.householdStandards.winter_lamps.levels.length;
  })).toBe(2);
  await startDeterministicGame(page);

  const preview = await page.evaluate(function () {
    FB.game.setPaused(true);
    const s = FB.state, p = s.player;
    const research = FB.realmTechRecord(s, FB.techRealmId(s));
    if (research.completed.indexOf('warp_weighted_loom') < 0) research.completed.push('warp_weighted_loom');
    const market = FB.ensureMarket(s);
    const prices = market.counties[p.provinceId][1];
    prices[market.goods.indexOf('materials')] = 2;
    prices[market.goods.indexOf('wares')] = 1.25;
    p.householdStandards = { luxuries:1 };
    p.gold = 100;
    const bought = [FB.buyHouseholdStandard(s, 'winter_lamps'), FB.buyHouseholdStandard(s, 'winter_lamps')];
    const quote = FB.householdShortfallQuote(s, 'winter_lamps');
    FB.runInstant(s, 'better_household');
    return { bought, quote, saving:FB.money(2.75), staying:FB.money(1.25), gold:p.gold };
  });
  expect(preview.bought).toEqual([true, true]);
  expect(preview.quote).toEqual({ level:2, nextActive:true, nextUpkeep:1.25, saving:2.75 });
  await page.getByLabel('Choose first expense to lapse').selectOption('winter_lamps');
  await expect(page.locator('#household-shortfall-preview')).toContainText(preview.saving);
  await expect(page.locator('#household-shortfall-preview')).toContainText(preview.staying);
  await expect(page.locator('#household-shortfall-preview')).toContainText('Lamps for every room');
  await expect(page.locator('#household-shortfall-preview')).toContainText(
    'Reading lamp · Adds 1 percentage point to yearly education chances.');
  await page.getByRole('button', { name:'Set first expense', exact:true }).click();

  const result = await page.evaluate(function () {
    const current = FB.state;
    const goldBefore = current.player.gold;
    const source = JSON.parse(FB.save.serialize());
    const changed = Object.assign({}, source, { mods:'effective-1-' + '0'.repeat(64) });
    const matched = FB.mods.saveCompatibility(source).compatible;
    const rejectsDifferent = !FB.mods.saveCompatibility(changed).compatible;
    const s = FB.save.restore(source);
    const restoredId = FB.householdShortfallFirst(s);
    s.player.gold = 1.25;
    const settled = FB.householdStandardsSeason(s);
    return {
      goldBefore, matched, rejectsDifferent, signature:source.mods, restoredId, settled,
      gold:s.player.gold, standards:s.player.householdStandards,
      education:FB.householdStandardEffect(s, 'education'), first:FB.householdShortfallFirst(s)
    };
  });
  expect(result.signature).toMatch(/^effective-1-[a-f0-9]{64}$/);
  expect(result).toMatchObject({
    goldBefore:preview.gold, matched:true, rejectsDifferent:true, restoredId:'winter_lamps',
    settled:{ paid:1.25, reduced:['winter_lamps', 'luxuries'] },
    gold:0, standards:{ winter_lamps:1 }, education:0.01, first:null
  });
});
