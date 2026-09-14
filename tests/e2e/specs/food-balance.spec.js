'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, ['js/market.js', 'js/logistics.js', 'js/population.js',
  'js/ui_modals.js', 'data/markets.js', 'data/map_data.js']);
const { test, expect } = require('../support/fixture');
const { startWarSafety } = require('../support/game/war-safety');

test('civilian food scales directly with population and opening surpluses spoil once per season', async function ({ page }, testInfo) {
  await startWarSafety(page, testInfo);
  const r = await page.evaluate(function () {
    const s = FB.state, pid = s.player.provinceId;
    const market = FB.ensureMarket(s), at = market.goods.indexOf('provisions');
    const pop = s.population.counties[pid];
    const count = pop.count;
    const before = FB.marketCounty(s, pid).goods.provisions.civilianFood;
    pop.count = count * 2;
    const after = FB.marketCounty(s, pid).goods.provisions.civilianFood;
    pop.count = count;
    market.counties[pid][0][at] = before * 10;
    const opening = market.counties[pid][0][at];
    s.turn += 90;
    FB.marketSeason(s);
    const result = FB.marketCounty(s, pid).goods.provisions;
    const stock = result.stock;
    const repeated = FB.marketSeason(s);
    return { before:before, after:after, count:count, spoiled:result.spoilage,
      expected:opening * 0.05 + (opening - before * 2) * 0.20,
      repeated:repeated, stable:stock === FB.marketCounty(s, pid).goods.provisions.stock };
  });
  expect(r.before).toBe(r.count / 40);
  expect(r.after).toBe(r.before * 2);
  expect(r.spoiled).toBeCloseTo(r.expected, 6);
  expect(r.repeated).toBe(false);
  expect(r.stable).toBe(true);
});

test('larger physical army rations preserve the normal-price gold calibration', async function ({ page }, testInfo) {
  await startWarSafety(page, testInfo);
  const r = await page.evaluate(function () {
    const s = FB.state, host = FB.playerHost(s), pid = host.at;
    const source = FB.marketProvisionSource(s, pid);
    const market = FB.ensureMarket(s), at = market.goods.indexOf('provisions');
    market.counties[pid][0][at] = source.demand * 100;
    host.men = 120; host.units = { levy:120 }; host.supply = FB.armyProvisionTarget(host);
    s.player.gold = 100000;
    const oldMen = FBDATA.balance.armyProvisionMenPerUnit;
    const oldPrice = FBDATA.balance.armyProvisionPrice;
    try {
      const current = FB.armyProvisionQuote(s, host, pid, 0);
      FBDATA.balance.armyProvisionMenPerUnit = 120;
      FBDATA.balance.armyProvisionPrice = 0.45;
      const previous = FB.armyProvisionQuote(s, host, pid, 0);
      return { units:current.units, oldUnits:previous.units, cost:current.cost, oldCost:previous.cost };
    } finally {
      FBDATA.balance.armyProvisionMenPerUnit = oldMen;
      FBDATA.balance.armyProvisionPrice = oldPrice;
    }
  });
  expect(r.units).toBeGreaterThan(0);
  expect(r.units).toBeCloseTo(r.oldUnits * 4, 8);
  expect(r.cost).toBeCloseTo(r.oldCost, 8);
});
