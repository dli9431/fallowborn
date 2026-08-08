'use strict';

const { test, expect } = require('../support/fixture');
const { openGame, startDeterministicGame } = require('../support/game');

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

test('Self rank opens demesne details and changes the persistent focus color',
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

    const rank = page.locator('#self-rank-details');
    await expect(rank).toBeVisible();
    await expect(rank).toContainText('Duchess');
    await rank.click();

    await expect(page.getByRole('heading', { name:'Realm & demesne', exact:true }))
      .toBeVisible();
    await expect(page.locator('#gm-body .kv:has(span:text-is("Held directly")) b'))
      .toContainText('1 of');
    await expect(page.locator('#gm-body')).toContainText(homeName);
    await expect(page.locator('#realm-highlight-change')).toBeVisible();

    await page.locator('#realm-highlight-color').evaluate(function (input) {
      input.value = '#4f8fa8';
      input.dispatchEvent(new Event('input', { bubbles:true }));
    });
    const changed = await page.evaluate(function () {
      return {
        preference:FB.game.uiPrefs.realmHighlightColor,
        map:FB.map.focusColor(),
        stored:JSON.parse(localStorage.getItem('fb_ui')).realmHighlightColor,
        swatch:document.getElementById('realm-highlight-swatch').style.backgroundColor
      };
    });
    expect(changed).toEqual({
      preference:'#4f8fa8',
      map:'#4f8fa8',
      stored:'#4f8fa8',
      swatch:'rgb(79, 143, 168)'
    });

    await page.locator('#realm-highlight-reset').click();
    await expect.poll(function () {
      return page.evaluate(function () {
        return FB.game.uiPrefs.realmHighlightColor;
      });
    }).toBe('#e8dec4');
  });
