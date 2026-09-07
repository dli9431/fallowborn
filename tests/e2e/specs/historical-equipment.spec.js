'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'data/map_data.js', 'data/technology.js', 'data/economy.js',
  'js/population.js', 'js/items.js', 'js/economy.js', 'js/technology.js', 'js/model.js',
  'js/portrait.js', 'js/ui_modals.js', 'js/save.js'
]);
const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { startDeterministicGame } = require('../support/game/start');

test.beforeEach(async function ({ page }, testInfo) {
  await openGame(page, testInfo);
  await startDeterministicGame(page);
});

test('historical production requires the exact technology, date and county culture', async function ({ page }) {
  const result = await page.evaluate(function () {
    const s = FB.state;
    const province = FB.world.byId[s.player.provinceId];
    const record = FB.realmTechRecord(s);
    const ids = ['knightly_mail', 'lamellar_cuirass', 'knights_plate', 'mail_coif',
      'knightly_lance', 'steppe_bow', 'crucible_sword', 'pattern_welded_sword',
      'mail_chausses', 'plate_sabatons', 'knightly_bascinet'];
    const rows = ids.map(function (id) {
      const def = FBDATA.items[id];
      const tech = def.requiresTech;
      s.population.counties[province.id].identity.culture = def.cultures[0];
      s.date.year = def.yearMin;
      record.completed = record.completed.filter(function (known) { return known !== tech; });
      const locked = FB.itemAvailability(s, id, province.id);
      record.completed.push(tech);
      const ready = FB.itemAvailability(s, id, province.id).ready;
      s.date.year = def.yearMin - 1;
      const tooEarly = !FB.itemAvailability(s, id, province.id).ready;
      s.date.year = def.yearMin;
      s.population.counties[province.id].identity.culture = 'finnic';
      const foreign = !FB.itemAvailability(s, id, province.id).ready;
      return { id:id, missing:locked.missing, ready:ready, tooEarly:tooEarly, foreign:foreign,
        ledger:FBDATA.techImpactReviews.features['equipment_' + id].mode };
    });
    return { rows:rows, fallback:FB.itemAvailability(s, 'padded_jack').ready };
  });
  expect(result.fallback).toBe(true);
  for (const row of result.rows) {
    expect(row.missing).toHaveLength(1);
    expect(row.ready).toBe(true);
    expect(row.tooEarly).toBe(true);
    expect(row.foreign).toBe(true);
    expect(row.ledger).toBe('hard');
  }
});

test('stalls sell well-made armor while auctions preserve masterwork lots through save and technology loss', async function ({ page }) {
  const result = await page.evaluate(function () {
    let s = FB.state;
    const pid = s.player.provinceId;
    s.population.counties[pid].identity.culture = 'frankish';
    s.date.year = 1400;
    s.player.gold = 100000;
    s.dev[pid] = 7;
    const record = FB.realmTechRecord(s);
    if (record.completed.indexOf('plate_armor') < 0) record.completed.push('plate_armor');
    const items = FBDATA.items;
    const lotTypes = FBDATA.auctionLotTypes;
    const odds = FBDATA.balance.shopQualityOdds;
    const techOdds = FBDATA.balance.shopQualityOddsTech;
    try {
      FBDATA.items = { knights_plate:items.knights_plate };
      FBDATA.auctionLotTypes = { item:{ weight:1 }, enterprise:{ weight:0 }, claim:{ weight:0 } };
      FBDATA.balance.shopQualityOdds = { plain:0, well:0, masterwork:1 };
      FBDATA.balance.shopQualityOddsTech = FBDATA.balance.shopQualityOdds;
      const stock = FB.shopStock(s, pid, 'town');
      const offer = stock.offers[0];
      const shopQuality = FB.resolveItem(s, offer.ref).quality;
      const auction = FB.beginAuction(s, FB.auctionVenues(s)[0]);
      const ref = auction.lot.ref;
      const quality = FB.resolveItem(s, ref).quality;
      const value = auction.lot.value;
      record.completed = record.completed.filter(function (id) { return id !== 'plate_armor'; });
      const bought = !!FB.buyShopItem(s, pid, 'town', offer.ref);
      const cached = FB.shopStock(s, pid, 'town') === stock;
      const saved = JSON.parse(FB.save.serialize());
      FB.save.restore(saved);
      s = FB.state;
      const restored = FB.auctionOf(s);
      const restoredRef = restored.lot.ref;
      restored.rivalMaximum = restored.currentBid;
      FB.placeAuctionBid(s, 1);
      const owned = FB.itemOwner(s, ref);
      const equipped = FB.equipItem(s, s.player.charId, 'body', ref);
      s.date.season = (s.date.season + 1) % 4;
      const freshLocked = FB.shopStock(s, pid, 'town').offers.length === 0;
      return { shopQuality:shopQuality, quality:quality, value:value,
        expectedValue:items.knights_plate.value * 4, bought:bought, cached:cached,
        savedRef:restoredRef === ref, owned:owned && owned.kind, equipped:equipped.ok,
        freshLocked:freshLocked };
    } finally {
      FBDATA.items = items;
      FBDATA.auctionLotTypes = lotTypes;
      FBDATA.balance.shopQualityOdds = odds;
      FBDATA.balance.shopQualityOddsTech = techOdds;
    }
  });
  expect(result.shopQuality).toBe('well');
  expect(result.quality).toBe('masterwork');
  expect(result.value).toBe(result.expectedValue);
  expect(result.bought).toBe(true);
  expect(result.cached).toBe(true);
  expect(result.savedRef).toBe(true);
  expect(result.owned).toBe('armory');
  expect(result.equipped).toBe(true);
  expect(result.freshLocked).toBe(true);
});

test('locked armor stays discoverable and cannot leak into peddler or loot pools', async function ({ page }) {
  const result = await page.evaluate(function () {
    const s = FB.state;
    const record = FB.realmTechRecord(s);
    record.completed = record.completed.filter(function (id) { return id !== 'plate_armor'; });
    FB.ui.showItemShop(s.player.provinceId, 'town');
    const text = document.body.textContent;
    const items = FBDATA.items;
    try {
      FBDATA.items = { knights_plate:items.knights_plate };
      return { visible:text.indexOf('Knight') >= 0 && text.indexOf('Plate Armor') >= 0,
        gear:FB.offerItem(s, true), peddler:FB.offerItem(s, false),
        loot:FB.lootItem(s, 'common', 'spoils') };
    } finally { FBDATA.items = items; }
  });
  expect(result.visible).toBe(true);
  expect(result.gear).toBeNull();
  expect(result.peddler).toBeNull();
  expect(result.loot).toBeNull();
  const disclosure = page.locator('summary').filter({ hasText:'Regional arms and armor' });
  await disclosure.focus();
  await page.keyboard.press('Enter');
  await expect(disclosure.locator('..')).toHaveAttribute('open', '');
});


test('armor renders distinctly and deterministically without changing saved state', async function ({ page }) {
  const result = await page.evaluate(function () {
    const s = FB.state;
    const c = s.chars[s.player.charId];
    const ids = ['knightly_mail', 'lamellar_cuirass', 'knights_plate', 'mail_coif',
      'mail_chausses', 'plate_sabatons', 'knightly_bascinet'];
    const refs = ids.map(function (id) {
      return FB.grantItem(s, id, { quality:'well' });
    });
    const before = JSON.stringify(s);
    function render(ref, id) {
      const canvas = document.createElement('canvas');
      canvas.width = 192; canvas.height = 360;
      const loadout = {};
      loadout[FBDATA.items[id].slot] = ref;
      FB.paintPaperDoll(canvas, c, s, { loadout:loadout });
      return canvas.toDataURL();
    }
    const images = refs.map(function (ref, i) { return render(ref, ids[i]); });
    const repeated = refs.every(function (ref, i) { return render(ref, ids[i]) === images[i]; });
    const after = JSON.stringify(s);
    const original = FBDATA.items.knights_plate.requiresTech;
    let validatesItem;
    try {
      FBDATA.items.knights_plate.requiresTech = 'missing_equipment_technology';
      validatesItem = FB.validateTechnologyData().some(function (error) {
        return error.indexOf('knights_plate') >= 0 && error.indexOf('missing_equipment_technology') >= 0;
      });
    } finally { FBDATA.items.knights_plate.requiresTech = original; }
    return { repeated:repeated, unchanged:before === after,
      distinct:new Set(images).size, validatesItem:validatesItem };
  });
  expect(result.repeated).toBe(true);
  expect(result.unchanged).toBe(true);
  expect(result.distinct).toBe(7);
  expect(result.validatesItem).toBe(true);
});

test('knightly sets share production gates and maintain protection tiers at every quality', async function ({ page }) {
  const result = await page.evaluate(function () {
    const s = FB.state;
    const sets = [
      ['mail_coif', 'knightly_mail', 'mail_chausses'],
      ['knightly_bascinet', 'knights_plate', 'plate_sabatons']
    ];
    const gates = sets.map(function (ids) {
      return ids.map(function (id) {
        const d = FBDATA.items[id];
        return { tech:d.requiresTech, year:d.yearMin, cultures:d.cultures,
          slot:d.slot, market:d.militaryMarket };
      });
    });
    function battle(id, quality) {
      return FB.resolveItem(s, FB.createItemInstance(s, id, { quality:quality })).fx.battle || 0;
    }
    const tiers = ['plain', 'well', 'masterwork'].map(function (quality) {
      const padded = battle('padded_jack', quality);
      const mail = battle('knightly_mail', quality);
      const lamellar = battle('lamellar_cuirass', quality);
      const plate = battle('knights_plate', quality);
      return { body:padded < mail && mail === lamellar && mail < plate,
        head:battle('nasal_helm', quality) === battle('mail_coif', quality) &&
          battle('mail_coif', quality) < battle('knightly_bascinet', quality),
        feet:battle('mail_chausses', quality) < battle('plate_sabatons', quality),
        weapons:battle('broad_sword', quality) === battle('bearded_axe', quality) &&
          battle('broad_sword', quality) < battle('pattern_welded_sword', quality) &&
          battle('pattern_welded_sword', quality) < battle('crucible_sword', quality) &&
          battle('crucible_sword', quality) < battle('knightly_lance', quality),
        bow:battle('steppe_bow', quality) >=
          battle('broad_sword', quality) + battle('round_shield', quality) };
    });
    return { gates:gates, tiers:tiers,
      masterworkPadding:battle('padded_jack', 'masterwork'), plainMail:battle('knightly_mail', 'plain'),
      masterworkMail:battle('knightly_mail', 'masterwork'), plainPlate:battle('knights_plate', 'plain'),
      errors:FB.validateTechnologyData() };
  });
  for (const [index, set] of result.gates.entries()) {
    expect(set.map(function (row) { return row.slot; })).toEqual(['head', 'body', 'feet']);
    for (const row of set) {
      expect(row.tech).toBe(index === 0 ? 'mail_hauberks' : 'plate_armor');
      expect(row.year).toBe(index === 0 ? 1200 : 1400);
      expect(row.cultures).toEqual(set[0].cultures);
      expect(row.market).toBe(true);
    }
  }
  for (const row of result.tiers) expect(row).toEqual({ body:true, head:true, feet:true, weapons:true, bow:true });
  expect(result.masterworkPadding).toBeLessThan(result.plainMail);
  expect(result.masterworkMail).toBeLessThan(result.plainPlate);
  expect(result.errors).toEqual([]);
});

test('new knightly head and foot equipment survives save and production-gate loss while equipped', async function ({ page }) {
  const result = await page.evaluate(function () {
    const s = FB.state;
    const cid = s.player.charId;
    const refs = ['mail_chausses', 'plate_sabatons', 'knightly_bascinet'].map(function (id) {
      return FB.grantItem(s, id, { quality:'well' });
    });
    const mailEquipped = FB.equipItem(s, cid, 'feet', refs[0]).ok;
    const plateEquipped = FB.equipItem(s, cid, 'feet', refs[1]).ok;
    const helmEquipped = FB.equipItem(s, cid, 'head', refs[2]).ok;
    FB.realmTechRecord(s).completed = [];
    s.date.year = 867;
    FB.save.restore(JSON.parse(FB.save.serialize()));
    const restored = FB.state;
    const loadout = FB.loadoutReadOnly(restored, cid);
    return { equipped:mailEquipped && plateEquipped && helmEquipped,
      feet:loadout.feet === refs[1], head:loadout.head === refs[2],
      owned:refs.every(function (ref) { return FB.itemOwner(restored, ref).kind === 'armory'; }),
      bonus:FB.itemBonusReadOnly(restored, 'battle') };
  });
  expect(result.equipped).toBe(true);
  expect(result.feet).toBe(true);
  expect(result.head).toBe(true);
  expect(result.owned).toBe(true);
  expect(result.bonus).toBeGreaterThanOrEqual(0.08);
});
