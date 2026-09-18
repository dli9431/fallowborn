'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'index.html', 'js/ui_misc.js', 'js/ui_modals.js', 'js/ui_panels.js',
  'js/keys.js', 'js/economy.js', 'js/items.js', 'js/travel.js',
  'data/economy.js', 'data/map_data.js', 'css/style.css'
]);
const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { startDeterministicGame } = require('../support/game/start');

test.beforeEach(async function ({ page }, testInfo) {
  await openGame(page, testInfo);
  await startDeterministicGame(page);
});

for (const noFocus of [false, true]) {
  test('deferred modal focus preserves an explicit destination with noFocus ' + noFocus, async function ({ page }) {
    await page.evaluate(function (noFocus) {
      FB.ui.openModal('Focus return', '<button id="focus-first">First</button>' +
        '<button id="focus-return">Return target</button>', { noFocus:noFocus });
      document.getElementById('focus-return').focus({ preventScroll:true });
      // Queue behind the modal's deferred focus, so the assertion cannot pass early.
      setTimeout(function () {
        document.getElementById('focus-return').dataset.settled = 'true';
      }, 0);
    }, noFocus);
    const target = page.locator('#focus-return');
    await expect(target).toHaveAttribute('data-settled', 'true');
    await expect(target).toBeFocused();
  });
}

test('autofocus still selects the default control or the deliberate-choice dialog', async function ({ page }) {
  await page.evaluate(function () {
    FB.ui.openModal('Ordinary sheet', '<button id="default-focus">Default</button>');
  });
  await expect(page.locator('#default-focus')).toBeFocused();
  await page.evaluate(function () {
    FB.ui.openModal('Deliberate choice', '<button id="deliberate-choice">Choose</button>', { noFocus:true });
  });
  await expect(page.locator('#genmodal')).toBeFocused();
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
    FB.grantItem(FB.state, 'keen_seax', { quality:'plain' });
    FB.ui.showEquipmentModal(FB.state.player.charId);
  });
  const slot = page.locator('#gm-body [data-equip-slot="rightHand"]');
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

for (const dismissal of ['Close', 'backdrop']) {
  test(dismissal + ' also dismisses a management sheet reopened by outcome acknowledgement', async function ({ page }) {
    await page.evaluate(function () {
      window.navigationAcknowledgements = 0;
      FB.ui.openModal('Settled result', '<p>Decision complete</p>', {
        onDismiss:function () {
          window.navigationAcknowledgements++;
          FB.ui.openModal('Refreshed management', '<p>Updated values</p>');
        }
      });
    });
    if (dismissal === 'Close') await page.locator('[data-modal-nav="close"]').click();
    else await page.locator('#genmodal').click({ position:{ x:2, y:2 } });
    await expect(page.locator('#genmodal')).toHaveClass(/hidden/);
    expect(await page.evaluate(function () { return window.navigationAcknowledgements; })).toBe(1);
  });
}

test('a trailing backdrop click leaves a new sheet open and keyboard navigation available', async function ({ page }) {
  await page.evaluate(function () {
    document.dispatchEvent(new PointerEvent('pointerdown', { bubbles:true }));
    FB.ui.openModal('Fresh sheet', '<p>Opened on release</p>');
    document.getElementById('genmodal').dispatchEvent(
      new MouseEvent('click', { bubbles:true, cancelable:true, detail:1 }));
  });
  await expect(page.locator('#gm-title')).toHaveText('Fresh sheet');
  await expect(page.locator('#genmodal')).toBeVisible();
  await page.locator('[data-modal-nav="close"]').press('Enter');
  await expect(page.locator('#genmodal')).toBeHidden();
});

test('backdrop cannot dismiss a required decision through its child sheet', async function ({ page }) {
  await page.evaluate(function () {
    FB.ui.openModal('Required decision', '<p>Choose an outcome</p>', { dismissable:false });
    FB.ui.openModal('Decision details', '<p>Supporting information</p>', { historyView:true });
  });
  await page.locator('#genmodal').click({ position:{ x:2, y:2 } });
  await expect(page.locator('#gm-title')).toHaveText('Decision details');
  await page.locator('[data-modal-nav="back"]').click();
  await expect(page.locator('#gm-title')).toHaveText('Required decision');
});

test('deferred Back restoration cannot focus or scroll a replacement modal', async function ({ page }) {
  // Desktop retained history makes Back synchronous, leaving its focus task
  // pending while another view opens in the same turn.
  await page.setViewportSize({ width:1280, height:844 });
  await page.evaluate(function () {
    let rows = '';
    for (let i = 0; i < 40; i++) rows += '<p>Retained row ' + i + '</p>';
    FB.ui.openModal('Parent', rows);
    document.getElementById('gm-body').scrollTop = 200;
    FB.ui.openModal('Child', '<p>Details</p>', { historyView:true });
    FB.ui.backModal();
    FB.ui.closeModalStack();
    FB.ui.openModal('Replacement', '<button id="replacement-focus">First</button>' + rows, { noFocus:true });
    setTimeout(function () { document.getElementById('genmodal').dataset.restoreSettled = 'true'; }, 0);
  });
  await expect(page.locator('#genmodal')).toHaveAttribute('data-restore-settled', 'true');
  await expect(page.locator('#genmodal')).toBeFocused();
  expect(await page.locator('#gm-body').evaluate(function (body) { return body.scrollTop; })).toBe(0);
});
