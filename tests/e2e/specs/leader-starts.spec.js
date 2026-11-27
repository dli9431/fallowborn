'use strict';
const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { useReleasedStartRules } = require('../support/game/released-starts');
const { dependsOnRuntime } = require('../support/runtime-dependencies');

dependsOnRuntime(__filename, ['index.html', 'data/starts.js', 'data/starts_laskaris_1204.js',
  'data/bookmark_1204.js', 'data/bookmark_1204_terrain.js', 'data/bookmark_1204_campaigns.js',
  'data/starts_1241.js', 'data/bookmark_1241.js', 'data/bookmark_1241_operations.js',
  'data/bookmark_1241_core_starts.js', 'data/mobile_confederations.js', 'data/eras.js',
  'js/starts.js', 'js/main.js', 'js/world.js', 'js/model.js', 'js/station.js', 'js/governments.js',
  'js/bookmark_setup.js', 'js/mobile_confederations.js', 'js/mobile_command.js', 'js/mobile_columns.js',
  'js/treasury.js', 'js/armies.js', 'js/save.js', 'js/save_v4.js', 'js/ui_misc.js', 'js/ui_modals.js']);

/* The leaders of the 1204 and 1241 central conflicts are Historical starts
   that adopt their existing courts or command. */

async function openDate(page, info, date) {
  await useReleasedStartRules(page);
  await openGame(page, info);
  const full = page.locator('#btn-choose-beginning');
  if (await full.isVisible()) await full.click();
  else await page.getByRole('button', { name:'New Game', exact:true }).click();
  await page.locator('#bookmarklist [data-bookmark="' + date + '"]').click();
  await expect(page.locator('#newgame:not(.hidden)')).toBeVisible();
}

async function beginFromCard(page, id, name) {
  const card = page.locator('#scenariolist [data-scenario="' + id + '"]');
  await expect(card).toBeVisible();
  await expect(card).not.toHaveAttribute('aria-disabled');
  expect(await card.evaluate(function (el) {
    let previous = el.previousElementSibling;
    while (previous && !previous.classList.contains('scen-group')) previous = previous.previousElementSibling;
    return previous && previous.textContent;
  })).toBe('Historical starts');
  await expect(card.locator('.scenario-story')).toHaveCount(0);
  await card.click();
  await expect(page.locator('#chargen:not(.hidden)')).toBeVisible();
  await expect(page.locator('#cg-name')).toHaveValue(name);
  await expect(page.locator('#cg-name')).toHaveAttribute('readonly', '');
  await expect(page.locator('input[name=cg-family]')).toHaveCount(1);
  await page.getByRole('button', { name:'Begin Your Story', exact:true }).click();
  await page.getByRole('button', { name:'Begin', exact:true }).click();
  await page.evaluate(function () { FB.game.setPaused(true); });
}

test('Baldwin adopts the existing Latin court at Constantinople and survives a save', async function ({ page }, info) {
  await openDate(page, info, '1204');
  await beginFromCard(page, 'baldwin_1204', 'Baldwin of Flanders');
  expect(await page.evaluate(function () {
    const s = FB.state, me = s.chars[s.player.charId];
    function snapshot(state) {
      const c = state.chars[state.player.charId];
      return JSON.stringify([state.start, state.owner, state.holder, state.player.gold, state.player.tier,
        c.id, c.name, c.spouseId, c.childrenIds]);
    }
    const before = snapshot(s);
    FB.save.restore(JSON.parse(FB.save.serialize()));
    return { name:me.name, age:FB.ageOf(me, s.date.year), culture:me.culture, religion:me.religion,
      tier:s.player.tier, rank:s.realms.player.rank, home:s.player.provinceId,
      source:s.start.rulerRealmId, scenario:s.start.scenarioId, sourceRemoved:!s.realms.latin_1204,
      city:s.owner.constantinople, single:Object.values(s.chars).filter(function (c) {
        return !c.dead && c.name === 'Baldwin of Flanders';
      }).length, restored:before === snapshot(FB.state) };
  })).toEqual({ name:'Baldwin of Flanders', age:32, culture:'frankish', religion:'catholic', tier:7, rank:4,
    home:'constantinople', source:'latin_1204', scenario:'baldwin_1204', sourceRemoved:true,
    city:'player', single:1, restored:true });
});

test('a Baldwin code naming another county is rejected', async function ({ page }, info) {
  await openDate(page, info, '1204');
  await page.locator('#btn-ng-back').click();
  await page.locator('#btn-bm-seed').click();
  await page.locator('#ng-seed').fill('LEADER-1204-baldwin_1204-nicaea-m-Baldwin_of_Flanders');
  await page.locator('#ng-seed').press('Enter');
  await expect(page.locator('#chargen:not(.hidden)')).toHaveCount(0);
  await page.locator('#ng-seed').fill('LEADER-1204-baldwin_1204-constantinople-m-Baldwin_of_Flanders');
  await page.locator('#ng-seed').press('Enter');
  await expect(page.locator('#cg-name')).toHaveValue('Baldwin of Flanders');
});

test('Batu leads the existing western command without land and keeps it across a save', async function ({ page }, info) {
  await openDate(page, info, '1241');
  await beginFromCard(page, 'batu_1241', 'Batu');
  expect(await page.evaluate(function () {
    const s = FB.state, M = FB.mobile, id = 'mongol_western_command_1241', me = s.chars[s.player.charId];
    const facts = { name:me.name, culture:me.culture, religion:me.religion, source:s.start.rulerRealmId,
      revision:s.start.revision, actor:FB.bookmarkActor(s, 'batu_1241') === me, leader:M.leader(s, id) === me,
      commanded:M.commandValid(s, id), publicRealm:!!s.realms[id] && !s.realms.player,
      noLand:s.player.provs.length === 0 && FB.realmTerritory(s, id).length === 0,
      privateTier:s.player.tier, privateGold:s.player.gold, home:s.player.provinceId,
      valid:M.validate(s) };
    const row = JSON.stringify([M.row(s, id), s.player.charId, s.start]);
    FB.save.restore(JSON.parse(FB.save.serialize()));
    facts.restored = row === JSON.stringify([M.row(FB.state, id), FB.state.player.charId, FB.state.start]) &&
      M.leader(FB.state, id) === FB.state.chars[FB.state.player.charId];
    return facts;
  })).toEqual({ name:'Batu', culture:'mongol_1241', religion:'tengri', source:'mongol_western_command_1241',
    revision:'core_starts_v2', actor:true, leader:true, commanded:true, publicRealm:true, noLand:true,
    privateTier:1, privateGold:20, home:'volodymyr', valid:true, restored:true });
});

test('only the fresh 1241 world offers Batu, and only at the command origin', async function ({ page }, info) {
  await openDate(page, info, '1241');
  expect(await page.evaluate(function () {
    const sc = FBDATA.startScenarios.find(function (row) { return row.id === 'batu_1241'; });
    const fresh = FB.bookmark('1241');
    return { revision:fresh.revision, faults:FB.validateBookmark(fresh), listed:fresh.starts.indexOf(sc.id) >= 0,
      origin:FB.startProvinceAllowed(sc, fresh, 'volodymyr'), elsewhere:FB.startProvinceAllowed(sc, fresh, 'krakow'),
      earlier:['baseline', 'operations_v2'].map(function (id) {
        return FB.bookmark('1241', id).starts.indexOf(sc.id) >= 0;
      }) };
  })).toEqual({ revision:'core_starts_v2', faults:[], listed:true, origin:true, elsewhere:false, earlier:[false, false] });
});
