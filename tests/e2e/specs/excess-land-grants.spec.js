'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'js/util.js', 'js/lordships.js', 'js/actions.js', 'js/ui_modals.js', 'js/ui_misc.js',
  'js/world.js', 'js/model.js', 'js/settlement.js', 'js/population.js', 'js/modifiers.js',
  'js/save.js', 'js/technology.js', 'data/technology.js', 'data/map_data.js', 'css/style.css'
]);
const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { startDeterministicGame } = require('../support/game/start');

test.beforeEach(async function ({ page }, testInfo) {
  await openGame(page, testInfo);
  await startDeterministicGame(page);
  await page.evaluate(function () {
    const s = FB.state, p = s.player;
    const ids = FB.world.provs.filter(function (pr) {
      return !pr.wasteland && FB.settlementsOf(s, pr.id).length >= 3;
    }).slice(0, 9).map(function (pr) { return pr.id; });
    p.tier = 6; p.provs = ids; p.provinceId = ids[0]; p.homeSettlement = 0; p.liege = null;
    p.protections = {}; p.householdStandards = {};
    s.chars[p.charId].skills.ste = 0;
    for (const pid of ids) {
      s.owner[pid] = 'player'; s.holder[pid] = 'player'; s.dev[pid] = 30;
      FB.rememberSettlementSites(s, pid);
      s.settlementLordships.counties[pid].lordships = {};
    }
    FB.foundPlayerRealm(s); s.realms.player.capital = ids[0];
    FB.invalidateRealmCache(); FB.invalidateSettlementLordships(s);
    window.excessTestIds = ids;
  });
});

for (const width of [390, 1280]) {
  test('county and settlement reservations retain scroll and focus at width ' + width, async function ({ page }) {
    await page.setViewportSize({ width:width, height:844 });
    await page.evaluate(function () { FB.ui.showGrantLand(); });
    for (const selector of ['[data-grant-protection]', '[data-settlement-protection]']) {
      const button = page.locator(selector).last();
      await button.focus();
      const position = await page.locator('#gm-body').evaluate(function (el) { return el.scrollTop; });
      for (const pressed of ['true', 'false', 'true']) {
        await button.press('Enter');
        await expect(button).toHaveAttribute('aria-pressed', pressed);
        await expect(button).toBeFocused();
        await expect.poll(async function () {
          return page.locator('#gm-body').evaluate(function (el) { return el.scrollTop; });
        }).toBe(position);
      }
    }
    const saved = await page.evaluate(function () {
      return JSON.parse(FB.save.serialize()).state.player.protections;
    });
    expect(saved.grantCounty).toHaveLength(1);
    expect(saved.grantSettlement).toHaveLength(1);
    await expect(page.locator('[data-grant-land-site]').last()).toBeDisabled();
    await page.locator('#grant-excess').click();
    await expect(page.locator('#gm-title')).toHaveText('Grant excess counties / settlements');
    await page.locator('#excess-grant-back').click();
    await expect(page.locator('#gm-title')).toHaveText('Grant Land');
    await expect(page.locator('#grant-excess')).toBeFocused();
  });
}

test('batch is read-only until confirmed, honors nested reservations and stops at the limits', async function ({ page }) {
  const result = await page.evaluate(function () {
    const s = FB.state, ids = window.excessTestIds;
    FB.setProtected(s, 'grantCounty', ids[1], true);
    FB.setProtected(s, 'grantSettlement', ids[2] + ':1', true);
    const before = FB.save.serialize(), rng = FB.getRngState();
    const plan = FB.excessLandGrantPlan(s);
    const pure = before === FB.save.serialize() && rng === FB.getRngState();
    const first = plan.counties[0].provinceId;
    FB.setProtected(s, 'grantCounty', first, true);
    const reservedState = FB.save.serialize();
    const rejected = !FB.applyExcessLandGrantPlan(s, plan);
    const unchanged = reservedState === FB.save.serialize();
    FB.setProtected(s, 'grantCounty', first, false);
    const current = FB.excessLandGrantPlan(s);
    const initial = FB.directSettlements(s).length;
    const countSites = FB.directSettlements(s).filter(function (site) {
      return current.counties.some(function (row) { return row.provinceId === site.provinceId; });
    }).length;
    const applied = FB.applyExcessLandGrantPlan(s, current);
    return { pure:pure, rejected:rejected, unchanged:unchanged, applied:applied,
      tech:FBDATA.techImpactReviews.features.excess_land_grants.mode,
      protectedCounties:ids.slice(0, 3).every(function (pid) { return s.holder[pid] === 'player'; }),
      reservedSite:FB.settlementHolder(s, ids[2], 1),
      countyCount:s.player.provs.length, countyLimit:current.countyLimit,
      countyRemaining:current.countyRemaining,
      settlementCount:FB.directSettlements(s).length,
      expectedCount:initial - countSites - current.settlements.length,
      sorted:current.counties.every(function (row, i, all) { return !i || row.net >= all[i - 1].net; }),
      settled:current.settlements.every(function (row) {
        const holder = FB.settlementHolder(s, row.provinceId, row.settlement);
        return holder.kind === 'character' && FB.stationOf(s.chars[holder.id]) >= 3;
      }) };
  });
  expect(result).toMatchObject({ pure:true, rejected:true, unchanged:true, applied:true,
    tech:'none', protectedCounties:true, reservedSite:{ kind:'realm', id:'player' }, sorted:true, settled:true });
  expect(result.countyCount).toBe(result.countyLimit + result.countyRemaining);
  expect(result.settlementCount).toBe(result.expectedCount);
});

test('settlement-only excess respects reservations, stale quotes and newest-slot ties', async function ({ page }) {
  const result = await page.evaluate(function () {
    const s = FB.state, p = s.player, ids = window.excessTestIds;
    // Keep every county reserved, so the settlement path must handle the excess.
    for (const pid of ids) FB.setProtected(s, 'grantCounty', pid, true);
    const fiscal = FB.settlementFiscalProjection;
    // Equal returns isolate the deterministic recency tie breaker.
    FB.settlementFiscalProjection = function () { return { amounts:{ net:1 } }; };
    let tied;
    try { tied = FB.excessLandGrantPlan(s); }
    finally { FB.settlementFiscalProjection = fiscal; }
    const newest = ids[ids.length - 1];
    const highest = FB.settlementVisibleCount(s, newest) - 1;
    const target = FB.excessLandGrantPlan(s).settlements[0];
    const c = FB.makeCharacter(s, { name:'Reserve Candidate', station:2, born:s.date.year - 30,
      culture:s.chars[p.charId].culture, religion:s.chars[p.charId].religion, traits:[] });
    c.homeProvinceId = target.provinceId;
    const quote = FB.settlementGrantQuote(s, target.provinceId, target.settlement, c.id, 'player');
    FB.setProtected(s, 'grantSettlement', target.provinceId + ':' + target.settlement, true);
    const rejected = !FB.confirmSettlementGrant(s, quote);
    const plan = FB.excessLandGrantPlan(s);
    const applied = FB.applyExcessLandGrantPlan(s, plan);
    return { first:tied.settlements[0], newest:newest, highest:highest,
      countyGrants:plan.counties.length, rejected:rejected, applied:applied,
      omitted:!plan.settlements.some(function (row) {
        return row.provinceId === target.provinceId && row.settlement === target.settlement;
      }), countyCount:p.provs.length, originalCount:ids.length };
  });
  expect(result.first.provinceId).toBe(result.newest);
  expect(result.first.settlement).toBe(result.highest);
  expect(result).toMatchObject({ countyGrants:0, rejected:true, applied:true, omitted:true });
  expect(result.countyCount).toBe(result.originalCount);
});

test('low productivity outranks recency and fully reserved holdings cannot be granted', async function ({ page }) {
  const result = await page.evaluate(function () {
    const s = FB.state, ids = window.excessTestIds, fiscal = FB.settlementFiscalProjection;
    const poor = ids[1];
    let plan;
    FB.settlementFiscalProjection = function (state, pid) {
      return { amounts:{ net:pid === poor ? -100 : 10 } };
    };
    try { plan = FB.excessLandGrantPlan(s); }
    finally { FB.settlementFiscalProjection = fiscal; }
    for (const pid of ids) {
      FB.setProtected(s, 'grantCounty', pid, true);
      for (const site of FB.settlementGrantSites(s, pid, 'player')) {
        FB.setProtected(s, 'grantSettlement', pid + ':' + site.settlement, true);
      }
    }
    const blocked = FB.excessLandGrantPlan(s), before = FB.save.serialize(), rng = FB.getRngState();
    const applied = FB.applyExcessLandGrantPlan(s, blocked);
    return { poorestFirst:plan.counties[0].provinceId === poor, applied:applied,
      countyGrants:blocked.counties.length, settlementGrants:blocked.settlements.length,
      remaining:blocked.countyRemaining + blocked.settlementRemaining,
      unchanged:before === FB.save.serialize() && rng === FB.getRngState() };
  });
  expect(result).toMatchObject({ poorestFirst:true, applied:false, countyGrants:0,
    settlementGrants:0, unchanged:true });
  expect(result.remaining).toBeGreaterThan(0);
});
