'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'data/map_data.js',
  'js/economy.js',
  'js/items.js',
  'js/market.js',
  'js/ui_modals.js',
  'data/economy.js'
]);

const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { startDeterministicGame } = require('../support/game/start');

/* Peddler stock bands: FB.offerItem (the peddler's full table) rolls a rarity
   class from the customer's station band — each peddlerWealthShift purse
   threshold crossed shops one band higher — then picks inside the class, so
   class odds survive collection of the unique definitions. The market's
   offer_gear path stays a flat ordinary-gear draw. The specs below sample the
   seeded stream rather than stubbing the RNG; bounds are loose because the
   exact counts are deterministic. */

test('bands the peddler’s full-table stock by station and purse',
  async function ({ page }, testInfo) {
    await openGame(page, testInfo);
    await startDeterministicGame(page);

    const counts = await page.evaluate(function () {
      const s = FB.state;
      function sample(runs) {
        const tally = { common:0, fine:0, famed:0 };
        for (let i = 0; i < runs; i++) {
          FB.clearItemOffer(s);
          s.eventQueue.length = 0;
          FB.offerItem(s, false);
          tally[FBDATA.items[s.player.itemOffer.id].rarity]++;
        }
        FB.clearItemOffer(s);
        s.eventQueue.length = 0;
        return tally;
      }
      const out = {};
      s.player.tier = 0;
      s.player.gold = 0;
      out.serf = sample(200);
      s.player.tier = 6;
      out.crowned = sample(200);
      /* a serf purse past both wealth thresholds shops the gentry band */
      s.player.tier = 0;
      s.player.gold = 1000;
      out.richSerf = sample(200);
      return out;
    });

    /* serf band 48/4/1: common dominates, famed is the rare aspirational
       glimpse — no more luxury stock for a serf than the data allows */
    expect(counts.serf.common).toBeGreaterThanOrEqual(150);
    expect(counts.serf.fine).toBeLessThanOrEqual(40);
    expect(counts.serf.famed).toBeLessThanOrEqual(12);
    expect(counts.serf.famed).toBeGreaterThanOrEqual(0);

    /* crowned band 2/7/6: heirlooms are the stock, ordinary gear the
       exception — no more mundane stock for a rich house */
    expect(counts.crowned.famed).toBeGreaterThan(counts.crowned.common);
    expect(counts.crowned.fine).toBeGreaterThan(counts.crowned.common);
    expect(counts.crowned.common).toBeLessThanOrEqual(80);

    /* gentry band 10/12/2: fine goods lead once the purse says so */
    expect(counts.richSerf.fine).toBeGreaterThanOrEqual(60);
    expect(counts.richSerf.fine).toBeGreaterThan(counts.serf.fine);
  });

test('keeps famed stock after the unique heirlooms are exhausted',
  async function ({ page }, testInfo) {
    await openGame(page, testInfo);
    await startDeterministicGame(page);

    const counts = await page.evaluate(function () {
      const s = FB.state;
      function sample(runs) {
        const tally = { common:0, fine:0, famed:0 };
        for (let i = 0; i < runs; i++) {
          FB.clearItemOffer(s);
          s.eventQueue.length = 0;
          FB.offerItem(s, false);
          tally[FBDATA.items[s.player.itemOffer.id].rarity]++;
        }
        FB.clearItemOffer(s);
        s.eventQueue.length = 0;
        return tally;
      }
      s.player.tier = 6;
      s.player.gold = 0;
      const out = {};
      /* Depleting authored uniques must not shrink the class odds: famed
         ordinary equipment remains valid stock for a wealthy household. */
      FB.grantItem(s, 'hero_sword');
      FB.grantItem(s, 'crown_of_old');
      out.depleted = sample(200);
      for (const id in FBDATA.items) {
        const def = FBDATA.items[id];
        if (def.rarity === 'famed' && def.unique && !def.eventOnly) {
          FB.grantItem(s, id);
        }
      }
      out.exhausted = sample(200);
      return out;
    });

    expect(counts.depleted.famed).toBeGreaterThanOrEqual(40);
    expect(counts.exhausted.famed).toBeGreaterThanOrEqual(40);
  });

test('labels the rare aspirational offer and still sells it',
  async function ({ page }, testInfo) {
    await openGame(page, testInfo);
    await startDeterministicGame(page);

    const result = await page.evaluate(function () {
      const s = FB.state;
      s.player.tier = 0;
      s.player.gold = 0;
      const seen = {};
      for (let i = 0; i < 500 && (!seen.common || !seen.aspirational); i++) {
        FB.clearItemOffer(s);
        s.eventQueue.length = 0;
        FB.offerItem(s, false);
        const rarity = FBDATA.items[s.player.itemOffer.id].rarity;
        const cls = s.eventQueue[s.eventQueue.length - 1].ctx.offerClass;
        if (rarity === 'common') seen.common = cls;
        else seen.aspirational = cls;
      }
      /* whatever the last offer is, an affordable purse can still buy it:
         bands condition stock, not the purchase flow */
      s.player.gold = 10000;
      const offer = s.player.itemOffer;
      const price = offer.price;
      const ref = offer.ref;
      const bought = FB.buyItemOffer(s);
      const purchase = {
        bought:bought,
        goldAfter:s.player.gold,
        expectedGold:10000 - price,
        owned:!!FB.itemOwner(s, ref),
        cleared:!s.player.itemOffer
      };
      /* the market gear draw stays flat ordinary stock without a class label */
      s.eventQueue.length = 0;
      FB.offerItem(s, true);
      const gear = {
        ordinary:FBDATA.items[s.player.itemOffer.id].unique === false,
        offerClass:s.eventQueue[s.eventQueue.length - 1].ctx.offerClass
      };
      FB.clearItemOffer(s);
      s.eventQueue.length = 0;
      return { seen:seen, purchase:purchase, gear:gear };
    });

    expect(result.seen.common).toBe('other');
    expect(result.seen.aspirational).toBe('aspirational');
    expect(result.purchase.bought).toBeTruthy();
    expect(result.purchase.goldAfter).toBe(result.purchase.expectedGold);
    expect(result.purchase.owned).toBe(true);
    expect(result.purchase.cleared).toBe(true);
    expect(result.gear.ordinary).toBe(true);
    expect(result.gear.offerClass).toBeUndefined();
  });
