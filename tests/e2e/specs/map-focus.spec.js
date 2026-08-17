'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'js/mapview.js',
  'js/ui_panels.js',
  'js/ui_topbar.js',
  'css/style.css'
]);

const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { startDeterministicGame } = require('../support/game/start');
const { waitForUiRefresh } = require('../support/game/ui');

test.beforeEach(async function ({ page }, testInfo) {
  await openGame(page, testInfo);
  await startDeterministicGame(page);
});

test('map focus preserves member colors and shades only land outside the group',
  async function ({ page }) {
    const result = await page.evaluate(function () {
      const home = FB.state.player.provinceId;
      const selected = FB.world.byId[home];
      let outsideIndex = -1;
      for (let i = 0; i < FB.world.provs.length; i++) {
        if (i !== selected.idx && !FB.world.provs[i].wasteland) {
          outsideIndex = i;
          break;
        }
      }
      function firstPixel(provinceIndex) {
        const target = provinceIndex + 1;
        for (let k = 0; k < FB.world.grid.length; k++) {
          if (FB.world.grid[k] === target) {
            return { x:k % FB.world.W, y:Math.floor(k / FB.world.W) };
          }
        }
        return null;
      }
      FB.map.select(home, function (pid) {
        return pid === home ? 'test-focus' : null;
      });
      const insidePoint = firstPixel(selected.idx);
      const outsidePoint = firstPixel(outsideIndex);
      const inside = Array.prototype.slice.call(FB.map.hiliteCtx.getImageData(
        insidePoint.x, insidePoint.y, 1, 1).data);
      const outside = Array.prototype.slice.call(FB.map.hiliteCtx.getImageData(
        outsidePoint.x, outsidePoint.y, 1, 1).data);
      return {
        color:FB.map.focusColor(),
        groupActive:FB.map.focusGroupActive,
        selectedMember:FB.map.focusMembers[selected.idx],
        outsideMember:FB.map.focusMembers[outsideIndex],
        groupOutline:!!FB.map.groupOutline,
        selectedOutline:!!FB.map.selectedOutline,
        insideAlpha:inside[3],
        outsideChannels:outside.slice(0, 3),
        outsideAlpha:outside[3]
      };
    });

    expect(result).toMatchObject({
      color:'#e8dec4',
      groupActive:true,
      selectedMember:true,
      outsideMember:false,
      groupOutline:true,
      selectedOutline:true,
      insideAlpha:0,
      outsideAlpha:56
    });
    expect(result.outsideChannels).toHaveLength(3);
    expect(result.outsideChannels[0]).toBeLessThan(result.outsideChannels[1]);
    expect(result.outsideChannels[1]).toBeLessThan(result.outsideChannels[2]);
  });

test('Self rank shows demesne details and Settings changes text and map presentation',
  async function ({ page }) {
    const homeName = await page.evaluate(function () {
      const s = FB.state;
      const home = s.player.provinceId;
      s.player.tier = 5;
      s.player.liege = null;
      s.player.provs = [home];
      FB.foundPlayerRealm(s);
      FB.ui.showTab('char');
      FB.ui.refresh();
      return FB.L(FB.world.byId[home].name);
    });

    // Jumping straight to tier 5 used to open the Duke orientation sheet —
    // the coachmark hints carry that teaching now, so the Self tab is free
    const rank = page.locator('#self-rank-details');
    await expect(rank).toBeVisible();
    await expect(rank).toContainText('Duchess');
    await rank.click();

    await expect(page.getByRole('heading', { name:'Realm & demesne', exact:true }))
      .toBeVisible();
    await expect(page.locator('#gm-body .kv:has(span:text-is("Held directly")) b'))
      .toContainText('1 of');
    await expect(page.locator('#gm-body')).toContainText(homeName);
    await expect(page.locator('#set-realm-highlight-change')).toHaveCount(0);
    await page.locator('#rank-details-close').click();

    await page.locator('#btn-menu').click();
    await page.locator('#m-settings').click();
    await expect(page.getByRole('heading', { name:'Settings', exact:true }))
      .toBeVisible();
    await expect(page.locator('#set-main-text-color-change')).toBeVisible();
    await expect(page.locator('#set-main-text-color')).toHaveValue('#f2eadb');
    await expect(page.locator('body'))
      .toHaveCSS('color', 'rgb(242, 234, 219)');
    await expect(page.locator('#tab-actions .actionbtn').first())
      .toHaveCSS('color', 'rgb(242, 234, 219)');
    await expect(page.locator('#set-helper-text-color-change')).toBeVisible();
    await expect(page.locator('#set-helper-text-color')).toHaveValue('#c9b991');
    await expect(page.locator('#set-speed-label'))
      .toHaveCSS('color', 'rgb(201, 185, 145)');
    await expect(page.locator('#tab-actions .actionbtn .adesc').first())
      .toHaveCSS('color', 'rgb(201, 185, 145)');

    await page.locator('#set-main-text-color').evaluate(function (input) {
      input.value = '#fff4df';
      input.dispatchEvent(new Event('input', { bubbles:true }));
    });
    const mainText = await page.evaluate(function () {
      return {
        preference:FB.game.uiPrefs.mainTextColor,
        stored:JSON.parse(localStorage.getItem('fb_ui')).mainTextColor,
        property:document.documentElement.style.getPropertyValue(
          '--main-text-color'),
        bodyColor:getComputedStyle(document.body).color,
        actionColor:getComputedStyle(document.querySelector(
          '#tab-actions .actionbtn')).color
      };
    });
    expect(mainText).toEqual({
      preference:'#fff4df',
      stored:'#fff4df',
      property:'#fff4df',
      bodyColor:'rgb(255, 244, 223)',
      actionColor:'rgb(255, 244, 223)'
    });

    await page.locator('#set-helper-text-color').evaluate(function (input) {
      input.value = '#d7f0ff';
      input.dispatchEvent(new Event('input', { bubbles:true }));
    });
    const helperText = await page.evaluate(function () {
      return {
        preference:FB.game.uiPrefs.helperTextColor,
        stored:JSON.parse(localStorage.getItem('fb_ui')).helperTextColor,
        property:document.documentElement.style.getPropertyValue(
          '--helper-text-color'),
        settingsColor:getComputedStyle(
          document.getElementById('set-speed-label')).color,
        actionColor:getComputedStyle(document.querySelector(
          '#tab-actions .actionbtn .adesc')).color
      };
    });
    expect(helperText).toEqual({
      preference:'#d7f0ff',
      stored:'#d7f0ff',
      property:'#d7f0ff',
      settingsColor:'rgb(215, 240, 255)',
      actionColor:'rgb(215, 240, 255)'
    });

    await expect(page.locator('#set-realm-highlight-change')).toBeVisible();
    await expect(page.locator('#gm-body')).toHaveCSS('padding-right', '10px');
    await page.locator('#set-realm-highlight-change').scrollIntoViewIfNeeded();

    const pickerTarget = await page.evaluate(function () {
      const control = document.getElementById('set-realm-highlight-change');
      const rect = control.getBoundingClientRect();
      const hit = document.elementFromPoint(
        rect.left + rect.width / 2, rect.top + rect.height / 2);
      return hit && hit.id;
    });
    expect(pickerTarget).toBe('set-realm-highlight-color');
    await page.locator('#set-realm-highlight-color').focus();
    await expect(page.locator('#set-realm-highlight-color')).toBeFocused();
    await expect(page.locator('#set-realm-highlight-opacity')).toHaveValue('100');
    await expect(page.locator('#set-realm-highlight-opacity-value')).toHaveText('100%');

    await waitForUiRefresh(page);
    const baseBefore = await page.evaluate(function () {
      const provinceIndex = FB.world.byId[FB.state.player.provinceId].idx;
      const target = provinceIndex + 1;
      for (let k = 0; k < FB.world.grid.length; k++) {
        if (FB.world.grid[k] !== target) continue;
        const x = k % FB.world.W;
        const y = Math.floor(k / FB.world.W);
        return {
          x:x,
          y:y,
          rgb:Array.prototype.slice.call(
            FB.map.baseCtx.getImageData(x, y, 1, 1).data, 0, 3)
        };
      }
      return null;
    });
    expect(baseBefore).not.toBeNull();

    await page.locator('#set-realm-highlight-color').evaluate(function (input) {
      input.value = '#4f8fa8';
      input.dispatchEvent(new Event('input', { bubbles:true }));
    });
    await waitForUiRefresh(page);
    const changed = await page.evaluate(function (sample) {
      return {
        preference:FB.game.uiPrefs.realmHighlightColor,
        map:FB.map.focusColor(),
        realmMapColor:FB.map.colorOf('player'),
        stored:JSON.parse(localStorage.getItem('fb_ui')).realmHighlightColor,
        swatch:document.getElementById('set-realm-highlight-swatch').style.backgroundColor,
        baseBefore:sample.rgb,
        baseAfter:Array.prototype.slice.call(
          FB.map.baseCtx.getImageData(sample.x, sample.y, 1, 1).data, 0, 3)
      };
    }, baseBefore);
    expect(changed).toMatchObject({
      preference:'#4f8fa8',
      map:'#4f8fa8',
      realmMapColor:'#4f8fa8',
      stored:'#4f8fa8',
      swatch:'rgb(79, 143, 168)'
    });
    expect(changed.baseAfter[0]).toBeLessThan(changed.baseBefore[0]);
    expect(changed.baseAfter[2] - changed.baseAfter[0])
      .toBeGreaterThan(changed.baseBefore[2] - changed.baseBefore[0]);

    await page.locator('#set-realm-highlight-opacity').evaluate(function (input) {
      input.value = '35';
      input.dispatchEvent(new Event('input', { bubbles:true }));
      input.dispatchEvent(new Event('change', { bubbles:true }));
    });
    await waitForUiRefresh(page);
    const softened = await page.evaluate(function (sample) {
      return {
        preference:FB.game.uiPrefs.realmHighlightOpacity,
        map:FB.map.focusOpacity(),
        realmMapOpacity:FB.map.colorOpacityOf('player'),
        stored:JSON.parse(localStorage.getItem('fb_ui')).realmHighlightOpacity,
        output:document.getElementById('set-realm-highlight-opacity-value').textContent,
        value:document.getElementById('set-realm-highlight-opacity').value,
        base:Array.prototype.slice.call(
          FB.map.baseCtx.getImageData(sample.x, sample.y, 1, 1).data, 0, 3)
      };
    }, baseBefore);
    expect(softened).toMatchObject({
      preference:0.35,
      map:0.35,
      realmMapOpacity:0.35,
      stored:0.35,
      output:'35%',
      value:'35'
    });
    expect(softened.base[0]).toBeGreaterThan(changed.baseAfter[0]);

    await page.locator('#set-realm-highlight-reset').click();
    await expect.poll(function () {
      return page.evaluate(function () {
        return FB.game.uiPrefs.realmHighlightColor;
      });
    }).toBe('#e8dec4');
    await page.locator('#set-main-text-color-reset').click();
    await expect.poll(function () {
      return page.evaluate(function () {
        return FB.game.uiPrefs.mainTextColor;
      });
    }).toBe('#f2eadb');
    await page.locator('#set-helper-text-color-reset').click();
    await expect.poll(function () {
      return page.evaluate(function () {
        return FB.game.uiPrefs.helperTextColor;
      });
    }).toBe('#c9b991');
  });
