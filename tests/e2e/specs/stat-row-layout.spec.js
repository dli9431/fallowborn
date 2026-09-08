'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, ['css/style.css', 'js/ui_misc.js', 'js/ui_modals.js',
  'js/papacy.js', 'data/papacy.js', 'data/actions.js', 'js/actions.js']);
const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { startDeterministicGame } = require('../support/game/start');

async function expectContainedRows(page, selector) {
  const failures = await page.locator(selector).evaluateAll(function (rows) {
    return rows.reduce(function (errors, row) {
      const box = row.getBoundingClientRect();
      const children = Array.from(row.children);
      if (!box.width || children.length < 2) return errors;
      const label = children[0].getBoundingClientRect();
      const value = children[1].getBoundingClientRect();
      const separateLines = value.top >= label.bottom - 1;
      if (!separateLines && value.left < label.right + 3) errors.push(row.textContent);
      children.forEach(function (child) {
        const rect = child.getBoundingClientRect();
        if (rect.left < box.left - 1 || rect.right > box.right + 1 ||
            child.scrollWidth > child.clientWidth + 1) errors.push(child.textContent);
      });
      return errors;
    }, []);
  });
  expect(failures).toEqual([]);
}

for (const width of [320, 593, 1280]) {
  test('Bishopric fields remain readable at ' + width + 'px', async function ({ page }, testInfo) {
    await openGame(page, testInfo);
    await startDeterministicGame(page);
    await page.setViewportSize({ width:width, height:850 });
    await page.evaluate(function () {
      const s = FB.state;
      const me = s.chars[s.player.charId];
      me.religion = 'catholic';
      me.bishopric = { seeProvinceId:s.player.provinceId, appointedTurn:s.turn,
        previousTier:2, appointerKind:'canonical', investiturePolicy:'canonical' };
      FB.ui.showBishopric();
    });
    await expect(page.locator('#gm-body .papacy-card')).toHaveCount(3);
    await expect(page.locator('[data-bishop-power="extraordinary_tithe"]'))
      .toContainText('💰 Levy an extraordinary tithe');
    await expectContainedRows(page, '#gm-body .kv');
    const typography = await page.locator('#gm-body .papacy-card .kv').first().evaluate(function (row) {
      const label = getComputedStyle(row.children[0]);
      const value = getComputedStyle(row.children[1]);
      const style = getComputedStyle(row);
      return {
        labelSize:parseFloat(label.fontSize), valueSize:parseFloat(value.fontSize),
        labelColor:label.color, valueColor:value.color,
        padding:parseFloat(style.paddingTop) + parseFloat(style.paddingBottom)
      };
    });
    expect(typography.labelSize).toBeLessThan(typography.valueSize);
    expect(typography.labelColor).not.toBe(typography.valueColor);
    expect(typography.padding).toBeGreaterThanOrEqual(12);
    const succession = page.locator('#gm-body .kv').filter({ hasText:'Non-hereditary' });
    expect(await succession.locator('span').first().evaluate(function (node) {
      return node.getBoundingClientRect().width;
    })).toBeGreaterThan(90);
    const temporalities = page.locator('.papacy-card').filter({
      has:page.locator('#bishop-temporalities-details')
    });
    const explanation = page.locator('#bishop-temporalities-details');
    await expect(explanation).toBeHidden();
    if (width <= 1100) {
      await temporalities.locator('.settcard-info').click();
      await expect(explanation).toBeVisible();
      await expect(explanation).toContainText('private property');
    } else {
      await temporalities.focus();
      await expect(page.locator('#tooltip')).toContainText('private property');
      await expect(explanation).toBeHidden();
    }
  });
}

test('shared rows wrap long fields and preserve compact summary heights', async function ({ page }, testInfo) {
  await openGame(page, testInfo);
  await page.evaluate(function () {
    const row = '<div class="kv"><span>Current ecclesiastical appointment</span>' +
      '<b><button class="linklike">VeryLongUnbrokenLocalizedNameWithoutSpacesAndWithManyLetters</button></b></div>';
    FB.ui.openModal('Layout regression', '<div style="width:220px;max-width:100%">' +
      row + '<div class="network-household-summary">' + row + '</div>' +
      '<div class="household-summary">' + row + '</div>' +
      '<div class="governance-domain-summary">' + row + '</div></div>');
  });
  await expectContainedRows(page, '#gm-body .kv');
  const heights = await page.locator('#gm-body .household-summary .kv > *, #gm-body .governance-domain-summary .kv > *')
    .evaluateAll(function (nodes) {
      return nodes.map(function (node) { return getComputedStyle(node).flexBasis; });
    });
  expect(heights).toEqual(['auto', 'auto', 'auto', 'auto']);
});

test('summary card labels share typography without restyling nested values', async function ({ page }, testInfo) {
  await openGame(page, testInfo);
  await page.evaluate(function () {
    const variants = ['papacy-card', 'household-summary', 'governance-domain-summary',
      'aggression-confirm-critical', 'privilege-card-critical', 'privilege-legal-details',
      'governance-vassal-overview', 'governance-vassal-stats', 'network-household-summary',
      'role-orientation'];
    FB.ui.openModal('Summary styles', variants.map(function (name) {
      return '<section class="' + name + '"><div class="kv">' +
        '<span>Current standing</span><b><span>Neutral</span></b></div></section>';
    }).join(''));
  });
  const rows = await page.locator('#gm-body .kv').evaluateAll(function (nodes) {
    return nodes.map(function (row) {
      const label = getComputedStyle(row.children[0]);
      const value = getComputedStyle(row.children[1]);
      const nested = getComputedStyle(row.children[1].firstChild);
      return { labelColor:label.color, valueColor:value.color,
        labelSize:parseFloat(label.fontSize), valueSize:parseFloat(value.fontSize),
        labelCase:label.textTransform, valueCase:nested.textTransform };
    });
  });
  expect(rows).toHaveLength(10);
  rows.forEach(function (row) {
    expect(row.labelColor).toBe(rows[0].labelColor);
    expect(row.labelSize).toBeLessThan(row.valueSize);
    expect(row.labelCase).toBe('none');
    expect(row.valueCase).toBe('none');
  });
});
