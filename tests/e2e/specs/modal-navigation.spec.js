'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'index.html', 'js/ui_misc.js', 'js/ui_modals.js', 'js/ui_panels.js',
  'js/keys.js', 'js/economy.js', 'js/items.js', 'js/travel.js',
  'data/economy.js', 'css/style.css'
]);
const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { startDeterministicGame } = require('../support/game/start');

test.beforeEach(async function ({ page }, testInfo) {
  await openGame(page, testInfo);
  await startDeterministicGame(page);
});

test('root footer disables Back and keeps decisions in the body', async function ({ page }) {
  await page.evaluate(function () {
    window.navigationCommits = 0;
    FB.ui.openModal('Navigation test', '<p>Review this decision.</p>' +
      '<div class="gm-footer"><button id="navigation-confirm" class="btn">Confirm</button>' +
      '<button id="navigation-cancel" class="btn">Cancel</button></div>');
    document.getElementById('navigation-confirm').onclick = function () {
      window.navigationCommits++;
    };
  });
  const footer = page.locator('#gm-body > .gm-footer');
  await expect(footer.locator('button')).toHaveText(['Back', 'Close']);
  await expect(footer.locator('[data-modal-nav="back"]')).toBeDisabled();
  await expect(page.locator('.modal-body-actions #navigation-confirm')).toBeVisible();
  await page.locator('#navigation-confirm').click();
  expect(await page.evaluate(function () { return window.navigationCommits; })).toBe(1);
  await footer.locator('[data-modal-nav="close"]').click();
  await expect(page.locator('#genmodal')).toHaveClass(/hidden/);
  expect(await page.evaluate(function () { return window.navigationCommits; })).toBe(1);
});

test('Back retains a scrolled parent and Close exits a three-view chain', async function ({ page }) {
  await page.evaluate(function () {
    let html = '';
    for (let i = 0; i < 30; i++) html += '<p>Navigation row ' + i + '</p>';
    html += '<button id="navigation-child" class="btn">Details</button>';
    FB.ui.openModal('Parent list', html);
    document.getElementById('navigation-child').onclick = function () {
      FB.ui.openModal('Child detail', '<button id="navigation-grandchild" class="btn">More details</button>',
        { historyView:true });
      document.getElementById('navigation-grandchild').onclick = function () {
        FB.ui.openModal('Grandchild detail', '<p>Last view</p>', { historyView:true });
      };
    };
  });
  const child = page.locator('#navigation-child');
  await child.scrollIntoViewIfNeeded();
  const scroll = await page.locator('#gm-body').evaluate(function (body) { return body.scrollTop; });
  expect(scroll).toBeGreaterThan(0);
  await child.click();
  await page.locator('[data-modal-nav="back"]').click();
  await expect(child).toBeFocused();
  await expect.poll(function () {
    return page.locator('#gm-body').evaluate(function (body) { return body.scrollTop; });
  }).toBe(scroll);
  await child.click();
  await page.locator('#navigation-grandchild').click();
  await page.locator('[data-modal-nav="close"]').click();
  await expect(page.locator('#genmodal')).toHaveClass(/hidden/);
  await page.evaluate(function () { FB.ui.openModal('Fresh root', '<p>New sheet</p>', { historyView:true }); });
  await expect(page.locator('[data-modal-nav="back"]')).toBeDisabled();
});

test('required decisions and their nested detail views cannot be closed away', async function ({ page }) {
  await page.evaluate(function () {
    FB.ui.openModal('Required decision', '<button class="btn" id="required-details">Details</button>',
      { dismissable:false });
    document.getElementById('required-details').onclick = function () {
      FB.ui.openModal('Required decision details', '<p>Read-only details</p>', { historyView:true });
    };
  });
  await expect(page.locator('[data-modal-nav="back"]')).toBeDisabled();
  await expect(page.locator('[data-modal-nav="close"]')).toBeDisabled();
  await page.locator('#required-details').click();
  await expect(page.locator('[data-modal-nav="close"]')).toBeDisabled();
  await page.locator('[data-modal-nav="back"]').click();
  await expect(page.locator('#gm-title')).toHaveText('Required decision');
});

test('management surfaces share a side-by-side navigation-only footer at mobile width', async function ({ page }) {
  await page.setViewportSize({ width:390, height:740 });
  for (const method of ['showMenu', 'showSettings', 'showSaveLoad', 'showHousehold',
    'showHouseholdPlan', 'showLivelihoods', 'showLandMarket', 'showEnterpriseStaffingPreview']) {
    await page.evaluate(function (method) {
      FB.ui.closeModal();
      FB.ui[method]();
    }, method);
    const footer = page.locator('#gm-body > .gm-footer');
    await expect(footer.locator('button')).toHaveText(['Back', 'Close']);
    const layout = await footer.evaluate(function (node) {
      const back = node.children[0].getBoundingClientRect();
      const close = node.children[1].getBoundingClientRect();
      return { aligned:Math.abs(back.top - close.top) < 2,
        fits:close.right <= node.getBoundingClientRect().right + 1,
        sized:back.height >= 44 && close.height >= 44 };
    });
    expect(layout, method).toEqual({ aligned:true, fits:true, sized:true });
  }
});

test('Close dismisses the equipment picker and its underlying sheet in one click', async function ({ page }) {
  await page.evaluate(function () {
    FB.ui.showEquipmentModal(FB.state.player.charId);
  });
  const slot = page.locator('#gm-body [data-equip-slot]').first();
  await slot.click();
  const picker = page.locator('#equip-picker-overlay');
  await expect(picker).toBeVisible();
  await expect(picker.locator('[data-modal-nav="back"]')).toBeEnabled();
  await picker.locator('[data-modal-nav="close"]').click();
  await expect(picker).toHaveCount(0);
  await expect(page.locator('#genmodal')).toHaveClass(/hidden/);
});

test('travel picker separates the return route from closing the planning flow', async function ({ page }) {
  await page.evaluate(function () {
    const s = FB.state;
    s.player.tier = 1;
    s.player.gold = 10000;
    FB.ui.showTravelPurposes();
  });
  const purpose = page.locator('[data-travel-purpose]:not([data-travel-purpose="trade"]):not(:disabled)').first();
  await purpose.click();
  await expect(page.locator('#travel-picker')).toBeVisible();
  await expect(page.locator('.travel-picker-actions button')).toHaveText(['Back', 'Close']);
  await expect(page.locator('.travel-picker-actions #travel-picker-continue')).toHaveCount(0);
  await page.locator('#travel-picker-back').click();
  await expect(purpose).toBeVisible();
  await purpose.click();
  await page.locator('#travel-picker-cancel').click();
  await expect(page.locator('#travel-picker')).toBeHidden();
  await expect(page.locator('#genmodal')).toBeHidden();
  expect(await page.evaluate(function () { return FB.state.player.gold; })).toBe(10000);
});

test('Close also dismisses a management sheet reopened by outcome acknowledgement', async function ({ page }) {
  await page.evaluate(function () {
    window.navigationAcknowledgements = 0;
    FB.ui.openModal('Settled result', '<p>Decision complete</p>', {
      onDismiss:function () {
        window.navigationAcknowledgements++;
        FB.ui.openModal('Refreshed management', '<p>Updated values</p>');
      }
    });
  });
  await page.locator('[data-modal-nav="close"]').click();
  await expect(page.locator('#genmodal')).toHaveClass(/hidden/);
  expect(await page.evaluate(function () { return window.navigationAcknowledgements; })).toBe(1);
});
