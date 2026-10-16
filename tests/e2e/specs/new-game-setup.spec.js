'use strict';
const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { dependsOnRuntime } = require('../support/runtime-dependencies');

dependsOnRuntime(__filename, [
  'index.html', 'css/style.css', 'data/starts.js', 'data/wardrobes.js', 'data/eras.js',
  'data/bookmarks.js', 'data/bookmark_476.js', 'data/bookmark_476_wider.js',
  'data/mobile_confederations.js', 'data/bookmark_711.js', 'data/bookmark_800.js',
  'data/bookmark_1204.js', 'data/bookmark_1204_terrain.js',
  'js/main.js', 'js/ui_misc.js', 'js/portrait.js', 'js/starts.js', 'js/station.js', 'js/world.js'
]);

/* The ordinary new-game path: starting date, beginning, birthplace and
   character. Each case opens only the dates it inspects. */

async function newGame(page) {
  await page.getByRole('button', { name:'New Game', exact:true }).click();
  await expect(page.locator('#bookmarks:not(.hidden)')).toBeVisible();
}

async function chooseDate(page, id) {
  await page.locator('#bookmarklist [data-bookmark="' + id + '"]').click();
  await expect(page.locator('#newgame:not(.hidden)')).toBeVisible();
}

function quickStartPortraits(page) {
  return page.evaluate(function () {
    return [].map.call(document.querySelectorAll('#quickstartlist canvas'), function (canvas) {
      return canvas.toDataURL();
    });
  });
}

function scrollOf(page, id) {
  return page.evaluate(function (id) { return document.getElementById(id).scrollTop; }, id);
}

test('Quick Start portraits keep their own date’s dress after another date is previewed',
  async function ({ page }, testInfo) {
    await openGame(page, testInfo);
    await newGame(page);
    const before = await quickStartPortraits(page);
    expect(before.length).toBeGreaterThan(0);
    // 476 dresses its era in late antique costume; Quick Start lives are 867 and 1066.
    await chooseDate(page, '476');
    await page.locator('#btn-ng-back').click();
    await expect(page.locator('#bookmarks:not(.hidden)')).toBeVisible();
    expect(await quickStartPortraits(page)).toEqual(before);
  });

test('phone setup lists keep Back clear of the music controls and return to the chosen card',
  async function ({ page }, testInfo) {
    await page.setViewportSize({ width:390, height:844 });
    await openGame(page, testInfo);
    await newGame(page);
    // One Quick Start row leaves the first starting date on the first screen.
    const firstDate = await page.locator('#bookmarklist .scencard').first().boundingBox();
    expect(firstDate.y).toBeLessThan(844);
    await page.locator('#btn-bm-back').scrollIntoViewIfNeeded();
    expect(await page.evaluate(function () {
      const box = document.getElementById('btn-bm-back').getBoundingClientRect();
      const top = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
      return top && top.id;
    })).toBe('btn-bm-back');

    const date = page.locator('#bookmarklist [data-bookmark="476"]');
    await date.scrollIntoViewIfNeeded();
    const dateScroll = await scrollOf(page, 'bookmarks');
    expect(dateScroll).toBeGreaterThan(0);
    await date.click();
    await expect(page.locator('#newgame:not(.hidden)')).toBeVisible();

    const role = page.locator('#scenariolist [data-scenario="cleric_476"]');
    await role.scrollIntoViewIfNeeded();
    const roleScroll = await scrollOf(page, 'newgame');
    await role.click();
    await expect(page.locator('#pickprov:not(.hidden)')).toBeVisible();
    await page.locator('#btn-pick-back').click();
    await expect(page.locator('#newgame:not(.hidden)')).toBeVisible();
    await expect(role).toBeFocused();
    expect(await scrollOf(page, 'newgame')).toBe(roleScroll);

    await page.locator('#btn-ng-back').click();
    await expect(page.locator('#bookmarks:not(.hidden)')).toBeVisible();
    await expect(page.locator('#bookmarklist [data-bookmark="476"]')).toBeFocused();
    expect(await scrollOf(page, 'bookmarks')).toBe(dateScroll);
  });

test('story starts are grouped and say where their story begins', async function ({ page }, testInfo) {
  await openGame(page, testInfo);
  await newGame(page);
  await chooseDate(page, '476');
  await expect(page.locator('#scenariolist .scen-group'))
    .toHaveText(['Historical starts', 'Story starts', 'Open starts']);
  const federate = page.locator('#scenariolist [data-scenario="federate_476"]');
  await expect(federate.locator('.scenario-story')).toHaveText('Story start: choose Ravenna as your birthplace.');
  await federate.click();
  await expect(page.locator('#pickprov:not(.hidden)')).toBeVisible();
  await expect(page.locator('#pickinfo .pick-story'))
    .toHaveText('Story start: choose Ravenna. Elsewhere this role begins as an ordinary household.');
  expect(await page.evaluate(function () { return FB.game.pickProvince(FB.world.byId.pavia); })).toBe(true);
  await expect(page.locator('#pickinfo .pick-story'))
    .toHaveText('This birthplace begins an ordinary household. The story starts in Ravenna.');
  expect(await page.evaluate(function () { return FB.game.pickProvince(FB.world.byId.ravenna); })).toBe(true);
  await expect(page.locator('#pickinfo .pick-story'))
    .toHaveText('Story start: this birthplace begins the role’s story.');
});

test('date households lead later dates and a fixed place is named before the story begins',
  async function ({ page }, testInfo) {
    await openGame(page, testInfo);
    await newGame(page);
    for (const date of [{ id:'711', start:'Toledo Household' }, { id:'800', start:'Aachen Household' }]) {
      await chooseDate(page, date.id);
      await expect(page.locator('#scenariolist .scen-group')).toHaveText(['Historical starts', 'Open starts']);
      await expect(page.locator('#scenariolist .scencard h3').first()).toHaveText(date.start);
      // Fresh profiles still see why the general ladder is locked.
      await expect(page.locator('#scenariolist .scen-note')).toHaveText(
        'Locked beginnings open when any of your lives reaches their station. Beginnings written for a specific date are always open.');
      await page.locator('#btn-ng-back').click();
    }
    await chooseDate(page, '476');
    await page.locator('#scenariolist [data-scenario="mobile_household_476"]').click();
    await expect(page.locator('#chargen:not(.hidden)')).toBeVisible();
    await expect(page.locator('#cg-place')).toHaveText('Birthplace: Cherson');
    await expect(page.locator('#cg-fixed')).toBeHidden();
    await expect(page.locator('#cg-name-field')).toBeVisible();
  });

test('an existing court reads as a fixed identity and a Constantinople household begins there',
  async function ({ page }, testInfo) {
    await openGame(page, testInfo);
    await newGame(page);
    await chooseDate(page, '1204');
    await expect(page.locator('#scenariolist .scencard h3').first()).toHaveText('Constantinople Household');
    await expect(page.getByRole('heading', { name:'Siwa Delegate', exact:true })).toHaveCount(1);
    await page.locator('#scenariolist [data-scenario="muhammad_1204"]').click();
    await expect(page.locator('#chargen:not(.hidden)')).toBeVisible();
    await expect(page.locator('#cg-name-field')).toBeHidden();
    await expect(page.locator('#cg-reroll')).toBeHidden();
    await expect(page.locator('#cg-sex-row')).toBeHidden();
    await expect(page.locator('#cg-fixed .pick-location-title')).toHaveText('Muhammad II');
    await expect(page.locator('#cg-fixed .pick-location-meta')).toHaveText('Man');
    await expect(page.locator('#cg-place')).toHaveText('Birthplace: Gurganj');
    await expect(page.locator('#cg-family')).toContainText('age 35 · existing court family');
    await expect(page.locator('#btn-cg-start')).toBeFocused();

    await page.locator('#btn-cg-back').click();
    await expect(page.locator('#scenariolist [data-scenario="muhammad_1204"]')).toBeFocused();
    await page.locator('#scenariolist [data-scenario="constantinople_household_1204"]').click();
    await expect(page.locator('#chargen:not(.hidden)')).toBeVisible();
    await expect(page.locator('#cg-place')).toHaveText('Birthplace: Constantinople');
    await page.getByRole('button', { name:'Begin Your Story', exact:true }).click();
    await expect(page.getByRole('heading', { name:'Your Story Begins', exact:true })).toBeVisible();
    expect(await page.evaluate(function () {
      const s = FB.state, me = s.chars[s.player.charId];
      return { bookmark:s.start.id, county:s.player.provinceId,
        culture:me.culture, religion:me.religion, tier:s.player.tier };
    })).toMatchObject({ bookmark:'1204', county:'constantinople', culture:'greek', religion:'orthodox', tier:1 });
  });
