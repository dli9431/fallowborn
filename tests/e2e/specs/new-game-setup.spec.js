'use strict';
const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { dependsOnRuntime } = require('../support/runtime-dependencies');
const { useReleasedStartRules } = require('../support/game/released-starts');

dependsOnRuntime(__filename, [
  'index.html', 'css/style.css', 'data/starts.js', 'data/wardrobes.js', 'data/eras.js',
  'data/bookmarks.js', 'data/bookmark_476.js', 'data/bookmark_476_wider.js',
  'data/mobile_confederations.js', 'data/bookmark_711.js', 'data/bookmark_800.js',
  'data/bookmark_1204.js', 'data/bookmark_1204_terrain.js',
  'js/main.js', 'js/ui_misc.js', 'js/portrait.js', 'js/starts.js', 'js/station.js', 'js/world.js',
  'js/mapview.js'
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
  await useReleasedStartRules(page);
  await openGame(page, testInfo);
  await newGame(page);
  await chooseDate(page, '476');
  // 476's existing-ruler starts are hidden, so only story and open starts show.
  await expect(page.locator('#scenariolist .scen-group')).toHaveText(['Story starts', 'Open starts']);
  const federate = page.locator('#scenariolist [data-scenario="federate_476"]');
  await expect(federate.locator('.scenario-story'))
    .toHaveText('Story start: begins in Ravenna. Another birthplace gives an ordinary household.');
  await federate.click();
  // The story's county is chosen by default; any other allowed county remains a tap away.
  await expect(page.locator('#pickprov:not(.hidden)')).toBeVisible();
  await expect(page.locator('#pickinfo .pick-location-title')).toHaveText('Ravenna');
  await expect(page.locator('#pickinfo .pick-story'))
    .toHaveText('Story start: this birthplace begins the role’s story.');
  expect(await page.evaluate(function () { return FB.game.pickProvince(FB.world.byId.pavia); })).toBe(true);
  await expect(page.locator('#pickinfo .pick-story'))
    .toHaveText('This birthplace begins an ordinary household. The story starts in Ravenna.');
  // Back returns to the beginnings rather than an empty map.
  await page.locator('#btn-pick-back').click();
  await expect(page.locator('#newgame:not(.hidden)')).toBeVisible();
  await expect(federate).toBeFocused();
  // Continuing from the default reaches character creation in Ravenna, and
  // Back from there resumes the map on Ravenna before leaving it.
  await federate.click();
  await page.locator('#btn-pick-random').click();
  await expect(page.locator('#chargen:not(.hidden)')).toBeVisible();
  await expect(page.locator('#cg-place')).toContainText('Ravenna');
  await page.locator('#btn-cg-back').click();
  await expect(page.locator('#pickinfo .pick-location-title')).toHaveText('Ravenna');
  await page.locator('#btn-pick-back').click();
  await expect(page.locator('#newgame:not(.hidden)')).toBeVisible();
});

test('a beginning limited to some counties keeps only those in color on the birthplace map',
  async function ({ page }, testInfo) {
    await openGame(page, testInfo);
    await newGame(page);
    await chooseDate(page, '476');
    await page.locator('#scenariolist [data-scenario="colonus_476"]').click();
    await expect(page.locator('#pickprov:not(.hidden)')).toBeVisible();
    await expect(page.locator('#pickinfo .pick-limit')).toHaveText('Only the counties in color offer this beginning.');
    expect(await page.evaluate(function () {
      const scenario = FB.game.pending.scenario, bookmark = FB.activeBookmark;
      const settled = FB.world.provs.filter(function (pr) { return !pr.wasteland; });
      const offered = settled.filter(function (pr) { return FB.startProvinceAllowed(scenario, bookmark, pr.id); });
      const waste = FB.world.provs.filter(function (pr) { return pr.wasteland; })[0];
      return { limited:FB.game.pickLimited, some:offered.length > 0 && offered.length < settled.length,
        colored:offered.every(function (pr) { return !FB.map.mutedOf(pr.id); }),
        muted:settled.filter(function (pr) { return offered.indexOf(pr) < 0; }).every(function (pr) { return FB.map.mutedOf(pr.id); }),
        waste:!waste || FB.map.mutedOf(waste.id) };
    })).toEqual({ limited:true, some:true, colored:true, muted:true, waste:true });
    await page.locator('#btn-pick-back').click();
    // An unrestricted role keeps every county in its realm color.
    await page.locator('#scenariolist [data-scenario="farmer_476"]').click();
    await expect(page.locator('#pickprov:not(.hidden)')).toBeVisible();
    await expect(page.locator('#pickinfo .pick-limit')).toHaveCount(0);
    expect(await page.evaluate(function () { return [FB.game.pickLimited, FB.map.mutedOf]; })).toEqual([false, null]);
  });

test('fixed-place households are story starts shown on their own county',
  async function ({ page }, testInfo) {
    await useReleasedStartRules(page);
    await openGame(page, testInfo);
    await newGame(page);
    for (const date of [{ id:'711', start:'Toledo Household' }, { id:'800', start:'Aachen Household' }]) {
      await chooseDate(page, date.id);
      await expect(page.locator('#scenariolist .scen-group')).toHaveText(['Story starts', 'Open starts']);
      await expect(page.locator('#scenariolist .scencard h3').first()).toHaveText(date.start);
      // Fresh profiles still see why the general ladder is locked.
      await expect(page.locator('#scenariolist .scen-note')).toHaveText(
        'Locked beginnings open when any of your lives reaches their station. Beginnings written for a specific date are always open.');
      await page.locator('#btn-ng-back').click();
    }
    await chooseDate(page, '476');
    const pontic = page.locator('#scenariolist [data-scenario="mobile_household_476"]');
    await expect(pontic.locator('.scenario-story')).toHaveText('Story start: begins in Cherson.');
    await pontic.click();
    await expect(page.locator('#pickprov:not(.hidden)')).toBeVisible();
    await expect(page.locator('#pickinfo .pick-location-title')).toHaveText('Cherson');
    await expect(page.locator('#pickinfo .pick-story'))
      .toHaveText('Story start: this birthplace begins the role’s story.');
    // The household's county is fixed; another county is refused.
    expect(await page.evaluate(function () { return FB.game.pickProvince(FB.world.byId.ravenna); })).toBe(false);
    await page.locator('#btn-pick-random').click();
    await expect(page.locator('#chargen:not(.hidden)')).toBeVisible();
    await expect(page.locator('#cg-place')).toHaveText('Birthplace: Cherson');
    await expect(page.locator('#cg-fixed')).toBeHidden();
    await expect(page.locator('#cg-name-field')).toBeVisible();
    await page.locator('#btn-cg-back').click();
    await expect(page.locator('#pickinfo .pick-location-title')).toHaveText('Cherson');
    await page.locator('#btn-pick-back').click();
    await expect(page.locator('#newgame:not(.hidden)')).toBeVisible();
    await expect(pontic).toBeFocused();
  });

test('an existing court reads as a fixed identity and a Constantinople household begins there',
  async function ({ page }, testInfo) {
    await openGame(page, testInfo);
    await newGame(page);
    await chooseDate(page, '1204');
    await expect(page.locator('#scenariolist .scen-group'))
      .toHaveText(['Historical starts', 'Story starts', 'Open starts']);
    await expect(page.locator('#scenariolist .scencard h3').first()).toHaveText('Muhammad II at Gurganj');
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
    await expect(page.locator('#pickinfo .pick-location-title')).toHaveText('Constantinople');
    await page.locator('#btn-pick-random').click();
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

test('the 476 branch review switch opens hidden and earned beginnings', async function ({ page }, testInfo) {
  await openGame(page, testInfo);
  expect(await page.evaluate(function () { return FBDATA.reviewOpenStarts; })).toBe(true);
  await newGame(page);
  await chooseDate(page, '476');
  // The hidden courts are offered under Historical starts and nothing is locked.
  await expect(page.locator('#scenariolist .scen-group')).toHaveText(['Historical starts', 'Story starts', 'Open starts']);
  await expect(page.locator('#scenariolist [data-scenario="nepos_476"]')).toHaveCount(1);
  await expect(page.locator('#scenariolist .scencard.locked')).toHaveCount(0);
  await page.locator('#btn-ng-back').click();
  await chooseDate(page, '867');
  await expect(page.locator('#scenariolist [data-scenario="baron"]')).not.toHaveClass(/locked/);
  await expect(page.locator('#scenariolist .scen-note')).toHaveCount(0);
});
