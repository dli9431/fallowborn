'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'js/ui_topbar.js', 'js/world.js', 'js/economy.js', 'js/fortifications.js', 'js/ui_modals.js', 'js/ui_misc.js', 'js/keys.js', 'js/i18n.js', 'js/treasury.js',
  'js/armies.js', 'js/actions.js', 'js/logistics.js', 'js/modifiers.js',
  'data/map_data.js', 'data/modifiers.js', 'css/style.css'
]);
const { test, expect } = require('../support/fixture');
const { startWarSafety } = require('../support/game/war-safety');

for (const width of [390, 1280]) {
  test('distribution preview preserves Finance position on Back, Escape, payment and mobile browser Back at ' + width,
    async function ({ page }, testInfo) {
      await page.setViewportSize({ width:width, height:844 });
      await startWarSafety(page, testInfo);
      await page.evaluate(function () {
        FB.state.player.gold = 10000;
        FB.ui.showFinance();
      });
      if (width === 390) await page.locator('[aria-controls="finance-government-details"]').click();
      else {
        await page.locator('#finance-government').hover();
        await expect(page.locator('#tooltip')).toContainText('Administration follows landed revenue');
      }
      const trigger = page.locator('#finance-distribution');
      await trigger.scrollIntoViewIfNeeded();
      const original = await page.locator('#gm-body').evaluate(function (body) { return body.scrollTop; });
      const gold = await page.evaluate(function () { return FB.state.player.gold; });
      // Desktop browser Back navigates the page; only mobile layouts own
      // browser-history entries for modal layers.
      const returnWays = width === 390 ? ['button', 'escape', 'history'] : ['button', 'escape'];
      for (const way of returnWays) {
        await trigger.click();
        await expect(page.locator('[data-public-distribution]')).toHaveCount(3);
        await expect(page.locator('#gm-body')).toContainText('Larger gifts provide the same benefit');
        if (way === 'button') await page.locator('#distribution-back').click();
        else if (way === 'escape') await page.keyboard.press('Escape');
        else await page.evaluate(function () { history.back(); });
        await expect(trigger).toBeVisible();
        if (width === 390) await expect(page.locator('#finance-government-details')).toBeVisible();
        await expect.poll(function () {
          return page.locator('#gm-body').evaluate(function (body) { return body.scrollTop; });
        }).toBeCloseTo(original, 0);
        await expect(trigger).toBeFocused();
      }
      expect(await page.evaluate(function () { return FB.state.player.gold; })).toBe(gold);
      await trigger.click();
      const amount = Number(await page.locator('[data-public-distribution]').first().getAttribute('data-public-distribution'));
      await page.locator('[data-public-distribution]').first().click();
      await expect(trigger).toBeDisabled();
      await expect(trigger).toContainText('Available again in 360 days');
      if (width === 390) await expect(page.locator('#finance-government-details')).toBeVisible();
      expect(await page.evaluate(function () { return FB.state.player.gold; })).toBeCloseTo(gold - amount, 8);
      await expect(page.locator('#finance-government')).toBeFocused();
    });
}

test('distribution payment revalidates a stale preview', async function ({ page }, testInfo) {
  await startWarSafety(page, testInfo);
  await page.evaluate(function () { FB.state.player.gold = 10000; FB.ui.showFinance(); });
  await page.locator('#finance-distribution').click();
  await page.evaluate(function () { FB.state.player.gold = 0; });
  await page.locator('[data-public-distribution]').first().click();
  await expect(page.locator('#finance-distribution')).toBeDisabled();
  expect(await page.evaluate(function () {
    return { gold:FB.state.player.gold, cooldown:FB.state.player.distributionNextTurn || 0 };
  })).toEqual({ gold:0, cooldown:0 });
});

test('ruler treasury amount uses locale routing without a details tooltip or balance changes', async function ({ page }, testInfo) {
  await page.setViewportSize({ width:390, height:844 });
  const ids = await startWarSafety(page, testInfo);
  const result = await page.evaluate(function (ids) {
    const s = FB.state, row = s.realms[ids.enemy].treasury;
    s.turn += 90; FB.treasurySeason(s);
    const before = row.gold, translate = FB.T, seen = [];
    // Exercise the new labels through the real localization boundary without changing catalogs.
    FB.T = function (text, params) { seen.push(text); return translate(text, params); };
    try {
      FB.ui.showLiegeModal(ids.enemy);
      return { unchanged:row.gold === before, seen:seen };
    } finally { FB.T = translate; }
  }, ids);
  expect(result.unchanged).toBe(true);
  expect(result.seen).toContain('Available treasury');
  await expect(page.locator('.realm-ruler-treasury')).toContainText('Available treasury');
  await expect(page.locator('[aria-controls="ruler-treasury-details"]')).toHaveCount(0);
  await expect(page.locator('#ruler-treasury-details')).toHaveCount(0);
});


for (const width of [390, 1280]) {
  test('seasonal budget groups sources into subtotals with the net total last at ' + width, async function ({ page }, testInfo) {
    await page.setViewportSize({ width:width, height:844 });
    await startWarSafety(page, testInfo);
    const r = await page.evaluate(function () {
      const s = FB.state;
      s.buildings[s.player.provs[0]] = [{ id:'barracks', s:0 }, { id:'market', s:0 }];
      FB.invalidateBuildingIndex(s, s.player.provs[0]);
      const budget = FB.incomeBreakdown(s).gold;
      const gold = s.player.gold, turn = s.turn;
      FB.ui.showStatModal('gold');
      return { total:budget.total, subtotal:budget.groups.reduce(function (sum, group) { return sum + group.total; }, 0),
        ids:budget.groups.map(function (group) { return group.id; }),
        lines:budget.groups.reduce(function (n, group) { return n + group.lines.length; }, 0), count:budget.lines.length,
        unchanged:gold === s.player.gold && turn === s.turn };
    });
    expect(r.subtotal).toBeCloseTo(r.total, 6);
    expect(r.lines).toBe(r.count); expect(r.unchanged).toBe(true);
    expect(r.ids).toContain('income'); expect(r.ids).toContain('buildings');
    expect(r.ids).toContain('government'); expect(r.ids).toContain('army');
    await expect(page.locator('[data-budget-group] .bd-subtotal')).toHaveCount(r.ids.length);
    await expect(page.locator('#gm-body .bd-row').last()).toHaveClass(/bd-net-total/);
    await expect(page.locator('.bd-net-total')).toContainText('Estimated net each season');
  });
}

test('building income adjustments reconcile low and high support with the actual tax calculation', async function ({ page }, testInfo) {
  await startWarSafety(page, testInfo);
  const results = await page.evaluate(function () {
    const s = FB.state, original = FB.countySupportFactor;
    s.player.provs.forEach(function (pid) {
      s.buildings[pid] = [{ id:'market', s:0 }]; FB.invalidateBuildingIndex(s, pid);
    });
    try {
      return [0, 0.5, 1.5].map(function (factor) {
        FB.countySupportFactor = function () { return factor; };
        const taxes = FB.playerTaxParts(s), bd = FB.incomeBreakdown(s).gold;
        const correction = bd.lines.filter(function (line) { return line.label === 'Building income: support and rebellion'; })[0];
        const gross = s.player.provs.length * FBDATA.buildings.market.tax;
        return { correction:correction ? correction.amount : 0, expected:taxes.tolls - gross,
          sum:bd.groups.reduce(function (n, group) { return n + group.total; }, 0), total:bd.total };
      });
    } finally { FB.countySupportFactor = original; }
  });
  for (const result of results) {
    expect(result.correction).toBeCloseTo(result.expected, 8);
    expect(result.sum).toBeCloseTo(result.total, 6);
  }
});


for (const height of [600, 786]) {
  test('desktop budget tooltip keeps its scrolled net total inside the viewport at height ' + height, async function ({ page }, testInfo) {
    await page.setViewportSize({ width:1280, height:height });
    await startWarSafety(page, testInfo);
    await page.evaluate(function () {
      const original = FB.incomeBreakdown;
      FB.incomeBreakdown = function (state) {
        const result = original(state);
        const lines = [];
        for (let i = 0; i < 70; i++) lines.push({ label:'Budget source ' + i, amount:1, group:'income' });
        result.gold = { lines:lines, total:70, groups:[{ id:'income', label:'Income subtotal', lines:lines, total:70 }] };
        return result;
      };
      FB.ui.refresh();
    });
    await page.locator('#tb-stats .stat[data-stat="gold"]').hover();
    const tip = page.locator('#tooltip');
    await expect(tip).toBeVisible();
    const initial = await tip.evaluate(function (el) {
      const rect = el.getBoundingClientRect();
      return { top:rect.top, bottom:rect.bottom, scrollable:el.scrollHeight > el.clientHeight };
    });
    expect(initial.top).toBeGreaterThanOrEqual(8);
    expect(initial.bottom).toBeLessThanOrEqual(height - 7);
    expect(initial.scrollable).toBe(true);
    await tip.hover();
    await page.mouse.wheel(0, 10000);
    await expect.poll(async function () {
      return tip.evaluate(function (el) {
        const total = el.querySelector('.bd-net-total').getBoundingClientRect();
        const box = el.getBoundingClientRect();
        return total.top >= box.top && total.bottom <= box.bottom && total.bottom <= window.innerHeight;
      });
    }).toBe(true);
    await expect(tip).toBeVisible();
  });
}
