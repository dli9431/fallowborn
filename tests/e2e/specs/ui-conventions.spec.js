'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, ['index.html', 'css/style.css', 'js/ui_misc.js', 'js/ui_panels.js',
  'js/ui_modals.js', 'js/ui_topbar.js', 'js/actions.js', 'data/actions.js',
  'js/papacy.js', 'data/papacy.js']);
const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { startDeterministicGame } = require('../support/game/start');

async function inspectFacts(page, selector) {
  return page.locator(selector).evaluateAll(function (rows) {
    return rows.reduce(function (result, row) {
      if (!row.getBoundingClientRect().width || row.children.length !== 2 ||
          row.children[1].tagName !== 'B') return result;
      const label = getComputedStyle(row.children[0]);
      const value = getComputedStyle(row.children[1]);
      const root = getComputedStyle(document.documentElement);
      const labelBox = row.children[0].getBoundingClientRect();
      const valueBox = row.children[1].getBoundingClientRect();
      result.count++;
      if (label.textTransform !== 'none' || value.textTransform !== 'none' ||
          label.fontWeight !== '400' || Number(value.fontWeight) < 600 ||
          parseFloat(label.fontSize) !== parseFloat(root.getPropertyValue('--ui-label-size')) ||
          parseFloat(value.fontSize) !== parseFloat(root.getPropertyValue('--ui-value-size')) ||
          (valueBox.top < labelBox.bottom - 1 && valueBox.left < labelBox.right)) {
        result.failures.push(row.textContent);
      }
      return result;
    }, { count:0, failures:[] });
  });
}

test('Self keeps a long house name beside its edit control', async function ({ page }, testInfo) {
  await openGame(page, testInfo);
  await startDeterministicGame(page);
  await page.evaluate(function () {
    FB.state.chars[FB.state.player.charId].dyn = 'House of the long northern valley';
    FB.ui.showTab('char');
  });
  for (const width of [1280, 390, 320]) {
    await page.setViewportSize({ width:width, height:850 });
    const layout = await page.locator('.dynasty-house-value').evaluate(function (node) {
      const name = node.querySelector('b').getBoundingClientRect();
      const button = node.querySelector('button').getBoundingClientRect();
      const box = node.getBoundingClientRect();
      return { gap:button.left - name.right,
        centerDifference:Math.abs((name.top + name.bottom - button.top - button.bottom) / 2),
        overflow:button.right - box.right, nameAlignment:getComputedStyle(node.querySelector('b')).textAlign };
    });
    expect(layout.gap).toBeGreaterThanOrEqual(7);
    expect(layout.centerDifference).toBeLessThanOrEqual(1);
    expect(layout.overflow).toBeLessThanOrEqual(1);
    expect(layout.nameAlignment).toBe('left');
  }
  await page.locator('#self-rename-house').click();
  await expect(page.locator('#rename-house-name')).toHaveValue('House of the long northern valley');
});

for (const width of [390, 1280]) {
  test('panels and information sheets share readable facts at ' + width + 'px', async function ({ page }, testInfo) {
    await openGame(page, testInfo);
    await startDeterministicGame(page);
    await page.setViewportSize({ width:width, height:850 });
    let count = 0;
    for (const tab of ['actions', 'char', 'family', 'network', 'prov', 'log']) {
      await page.evaluate(function (name) { FB.ui.showTab(name); }, tab);
      const facts = await inspectFacts(page, '#tab-' + tab + ' .kv');
      count += facts.count;
      expect(facts.failures, tab).toEqual([]);
    }
    for (const method of ['showFinance', 'showHousehold', 'showPlots', 'showSettings',
      'showAutoResolve', 'showMenu']) {
      await page.evaluate(function (name) { FB.ui[name](); }, method);
      await expect(page.locator('#gm-title')).toBeVisible();
      const facts = await inspectFacts(page, '#gm-body .kv');
      count += facts.count;
      expect(facts.failures, method).toEqual([]);
      const uppercase = await page.locator('#gm-body *, #gm-title').evaluateAll(function (nodes) {
        return nodes.filter(function (node) {
          return node.getBoundingClientRect().width &&
            (getComputedStyle(node).textTransform === 'uppercase' ||
              getComputedStyle(node).fontVariant === 'small-caps');
        }).map(function (node) { return node.textContent; });
      });
      expect(uppercase, method).toEqual([]);
      await page.evaluate(function () { FB.ui.closeModal(); });
    }
    expect(count).toBeGreaterThan(5);
  });
}

test('Network sections match Deeds and expand without an enclosing body border', async function ({ page }, testInfo) {
  await openGame(page, testInfo);
  await startDeterministicGame(page);
  await page.evaluate(function () { FB.ui.showTab('actions'); });
  const skin = function (node) {
    const s = getComputedStyle(node);
    return { color:s.color, background:s.backgroundColor, padding:s.padding,
      radius:s.borderRadius, fontSize:s.fontSize, fontWeight:s.fontWeight };
  };
  const deed = page.locator('#tab-actions .actiongroup-toggle').first();
  const expected = await deed.evaluate(skin);
  await page.evaluate(function () { FB.ui.showTab('network'); });
  const network = page.locator('#tab-network .large-list-section-toggle').first();
  // Compare neutral controls so active-section selection does not change the sample.
  const actual = await network.evaluate(skin);
  expect(actual.color).toBe(expected.color);
  expect(actual.padding).toBe(expected.padding);
  expect(actual.radius).toBe(expected.radius);
  expect(actual.fontSize).toBe(expected.fontSize);
  expect(actual.fontWeight).toBe(expected.fontWeight);
  await network.focus();
  const wasExpanded = await network.getAttribute('aria-expanded');
  await page.keyboard.press('Enter');
  await expect(network).toHaveAttribute('aria-expanded', wasExpanded === 'true' ? 'false' : 'true');
  if (wasExpanded === 'true') await page.keyboard.press('Enter');
  const bodyId = await network.getAttribute('aria-controls');
  const body = page.locator('#' + bodyId);
  await expect(body).toBeVisible();
  const borders = await body.evaluate(function (node) {
    const s = getComputedStyle(node);
    return [s.borderTopWidth, s.borderRightWidth, s.borderBottomWidth, s.borderLeftWidth];
  });
  expect(borders).toEqual(['0px', '0px', '0px', '0px']);
  await expect(network).toBeFocused();
});

test('Automation explanations work with hover, keyboard focus, and compact disclosures', async function ({ page }, testInfo) {
  await openGame(page, testInfo);
  await startDeterministicGame(page);
  await page.setViewportSize({ width:1280, height:850 });
  await page.evaluate(function () { FB.ui.showAutoResolve(); });
  const card = page.locator('.ui-control-row').filter({ has:page.locator('#ar-minor') });
  const details = card.locator('.settcard-details');
  const checkbox = page.locator('#ar-minor');
  const original = await checkbox.isChecked();
  await expect(details).toBeHidden();
  await checkbox.focus();
  await expect(page.locator('#tooltip')).toBeVisible();
  await expect(page.locator('#tooltip')).toContainText('Everyday happenings');
  await card.hover();
  await expect(page.locator('#tooltip')).toContainText('Everyday happenings');
  await expect(page.locator('.ui-control-warning')).toBeVisible();
  await expect(page.locator('.ui-control-warning')).toContainText('mortal danger');
  await page.setViewportSize({ width:390, height:850 });
  const disclosure = card.locator('.settcard-info');
  await expect(disclosure).toBeVisible();
  await disclosure.click();
  await expect(details).toBeVisible();
  await expect(page.locator('#tooltip')).toBeHidden();
  expect(await checkbox.isChecked()).toBe(original);
  const box = await disclosure.boundingBox();
  expect(box.width).toBeGreaterThanOrEqual(44);
  expect(box.height).toBeGreaterThanOrEqual(44);
  await disclosure.click();
  await expect(details).toBeHidden();
});
