'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'js/items.js',
  'js/market.js',
  'js/technology.js',
  'js/ui_modals.js',
  'data/map_data.js',
  'data/markets.js',
  'data/events_common.js'
]);

const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { startDeterministicGame } = require('../support/game/start');

/* The market stall shop: town/city settlement visits open a small seasonal
   stock of materialized ordinary gear (FB.shopStock), rerolled through the
   seeded RNG only when the season, county, or settlement kind changes, with
   orphaned unsold instances discarded on reroll. Buying deducts the quoted
   price and moves the exact instance to the armory; selling reuses the flat
   itemSellRatio through FB.sellItem and excludes worn or pledged gear. The
   urban_markets technology widens the stock without gating it. */

test('keeps one seasonal stock per county and kind, then rerolls cleanly',
  async function ({ page }, testInfo) {
    await openGame(page, testInfo);
    await startDeterministicGame(page);

    const result = await page.evaluate(function () {
      const s = FB.state;
      const pid = s.player.provinceId;
      const first = FB.shopStock(s, pid, 'town');
      const again = FB.shopStock(s, pid, 'town');
      const sameRecord = again === first;
      const firstRefs = first.offers.map(function (o) { return o.ref; });
      const sizes = FBDATA.balance.shopStockSize;
      const withinBand = first.offers.length >= sizes.town[0] &&
        first.offers.length <= sizes.town[1];
      /* every offer is a materialized ordinary instance with a positive
         integer price */
      const wellFormed = first.offers.every(function (o) {
        const item = FB.resolveItem(s, o.ref);
        return item && item.ordinary && item.quality &&
          Number.isInteger(o.price) && o.price >= 1;
      });
      /* a different settlement kind is a different shop */
      const city = FB.shopStock(s, pid, 'city');
      const cityDiffers = city !== first;
      /* a new season rerolls and discards orphaned unsold instances */
      s.date.season = (s.date.season + 1) % 4;
      const second = FB.shopStock(s, pid, 'town');
      const orphansGone = firstRefs.every(function (ref) {
        return !s.itemInstances[ref];
      });
      return {
        sameRecord:sameRecord,
        hasOffers:first.offers.length > 0,
        withinBand:withinBand,
        wellFormed:wellFormed,
        cityDiffers:cityDiffers,
        rerolled:second !== first,
        orphansGone:orphansGone
      };
    });

    expect(result.sameRecord).toBe(true);
    expect(result.hasOffers).toBe(true);
    expect(result.withinBand).toBe(true);
    expect(result.wellFormed).toBe(true);
    expect(result.cityDiffers).toBe(true);
    expect(result.rerolled).toBe(true);
    expect(result.orphansGone).toBe(true);
  });

test('buys an offer into the armory at exactly its quoted price',
  async function ({ page }, testInfo) {
    await openGame(page, testInfo);
    await startDeterministicGame(page);

    const result = await page.evaluate(function () {
      const s = FB.state;
      const pid = s.player.provinceId;
      s.player.gold = 5000;
      const stock = FB.shopStock(s, pid, 'town');
      const offer = stock.offers[0];
      const out = {
        bought:FB.buyShopItem(s, pid, 'town', offer.ref) === offer.ref,
        goldExact:s.player.gold === 5000 - offer.price,
        owned:FB.itemOwner(s, offer.ref) &&
          FB.itemOwner(s, offer.ref).kind === 'armory',
        removed:stock.offers.every(function (o) { return o.ref !== offer.ref; })
      };
      /* a purse short of the price is refused and the offer stays */
      if (stock.offers.length) {
        const next = stock.offers[0];
        s.player.gold = next.price - 1;
        out.poorRefused = FB.buyShopItem(s, pid, 'town', next.ref) === null &&
          stock.offers[0].ref === next.ref;
      }
      return out;
    });

    expect(result.bought).toBe(true);
    expect(result.goldExact).toBe(true);
    expect(result.owned).toBe(true);
    expect(result.removed).toBe(true);
    if (result.poorRefused !== undefined) expect(result.poorRefused).toBe(true);
  });

test('the sell counter skips worn gear and sells at the flat ratio',
  async function ({ page }, testInfo) {
    await openGame(page, testInfo);
    await startDeterministicGame(page);

    const result = await page.evaluate(function () {
      const s = FB.state;
      const me = s.player.charId;
      const ref = FB.grantItem(s, 'bearded_axe', { quality:'well' });
      const item = FB.resolveItem(s, ref);
      const expected = Math.round(item.value * FBDATA.balance.itemSellRatio);
      const listed = FB.shopSellables(s).filter(function (e) {
        return e.ref === ref;
      });
      const listedPrice = listed.length === 1 ? listed[0].price : null;
      /* equipping takes it off the counter */
      FB.equipItem(s, me, 'rightHand', ref);
      const equippedHidden = FB.shopSellables(s).every(function (e) {
        return e.ref !== ref;
      });
      /* back in the armory, the sale pays the flat ratio and no more */
      FB.unequipItem(s, me, 'rightHand');
      s.player.gold = 100;
      FB.sellItem(s, ref);
      return {
        listedPrice:listedPrice,
        expected:expected,
        equippedHidden:equippedHidden,
        goldAfter:s.player.gold,
        sold:FB.itemOwner(s, ref) === null
      };
    });

    expect(result.listedPrice).toBe(result.expected);
    expect(result.equippedHidden).toBe(true);
    expect(result.sold).toBe(true);
    expect(result.goldAfter).toBe(100 + result.expected);
  });

test('urban_markets widens the stock without gating the baseline shop',
  async function ({ page }, testInfo) {
    await openGame(page, testInfo);
    await startDeterministicGame(page);

    const result = await page.evaluate(function () {
      const s = FB.state;
      const pid = s.player.provinceId;
      /* pin the size range so the technology bonus is exact */
      const oldSizes = FBDATA.balance.shopStockSize;
      FBDATA.balance.shopStockSize = { town:[5, 5], city:[5, 5] };
      const oldHasTech = FB.hasTech;
      try {
        FB.hasTech = function () { return false; };
        delete s.player.shopStock;
        const baseline = FB.shopStock(s, pid, 'town').offers.length;
        FB.hasTech = function (st, id) { return id === 'urban_markets'; };
        delete s.player.shopStock;
        const widened = FB.shopStock(s, pid, 'town').offers.length;
        return {
          baseline:baseline,
          widened:widened,
          bonus:FBDATA.balance.shopStockTechBonus
        };
      } finally {
        FB.hasTech = oldHasTech;
        FBDATA.balance.shopStockSize = oldSizes;
      }
    });

    expect(result.baseline).toBe(5);
    expect(result.widened).toBe(5 + result.bonus);
  });

test('the shop modal lists every offer and sells through the UI',
  async function ({ page }, testInfo) {
    await openGame(page, testInfo);
    await startDeterministicGame(page);

    const setup = await page.evaluate(function () {
      const s = FB.state;
      s.player.gold = 10000;
      FB.ui.deferItemShopOpen(s.player.provinceId, 'town');
      return {
        offers:s.player.shopStock.offers.length,
        firstPrice:s.player.shopStock.offers[0].price
      };
    });

    await expect(page.locator('#genmodal')).toBeVisible();
    await expect(page.locator('.shop-buy')).toHaveCount(setup.offers);

    await page.locator('.shop-buy').first().click();
    const after = await page.evaluate(function () {
      const s = FB.state;
      return {
        gold:s.player.gold,
        remaining:s.player.shopStock.offers.length,
        armory:s.player.items.length
      };
    });
    expect(after.gold).toBe(10000 - setup.firstPrice);
    expect(after.remaining).toBe(setup.offers - 1);
    expect(after.armory).toBeGreaterThan(0);
  });
