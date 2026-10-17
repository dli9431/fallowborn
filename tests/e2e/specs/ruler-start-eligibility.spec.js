'use strict';
const path = require('path');
const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { dependsOnRuntime } = require('../support/runtime-dependencies');
const examples = require('../fixtures/authoring/ruler-faith-starts.json');
dependsOnRuntime(__filename, ['index.html', 'data/bookmarks.js', 'data/starts.js',
  'data/bookmark_476.js', 'data/bookmark_476_dalmatia_east.js', 'data/government_rollout.js',
  'data/bookmark_1066_inhabited.js', 'js/starts.js', 'js/mods.js', 'js/world.js',
  'js/main.js', 'js/stories.js', 'js/save.js', 'js/save_v4.js', 'js/ui_misc.js', 'js/ui_panels.js']);

test('ruler faith reads only its definition, honors explicit faith and leaves missing faith absent', async function ({ page }, info) {
  await openGame(page, info);
  expect(await page.evaluate(function () {
    const bm = FB.bookmark('1066'), r = bm.realms.find(function (r) { return r.id === 'england_1066'; });
    const before = JSON.stringify(bm), rng = FB.getRngState(), uid = FB.getUidCounter();
    const inherited = FB.startRulerFaith(bm, r);
    const explicit = Object.assign({}, r, { religion:'orthodox' });
    const explicitFaith = FB.startRulerFaith(bm, explicit);
    const copy = JSON.parse(JSON.stringify(bm));
    copy.provinces.find(function (p) { return p.id === r.capital; }).religion = 'orthodox';
    const revised = FB.startRulerFaith(copy, r);
    const missing = FB.startRulerFaith({ provinces:[] }, r);
    return { inherited, explicitFaith, revised, missing,
      pure:before === JSON.stringify(bm) && rng === FB.getRngState() && uid === FB.getUidCounter() };
  })).toEqual({ inherited:'catholic', explicitFaith:'orthodox', revised:'orthodox', missing:null, pure:true });
});

test('independent explicit and inherited-faith courts import through Mods and reject identity mismatches purely', async function ({ page }, info) {
  await openGame(page, info);
  const rejected = await page.evaluate(function (mod) {
    const before = JSON.stringify(FBDATA), rng = FB.getRngState(), uid = FB.getUidCounter();
    const valid = FB.mods.validate(mod);
    const invalid = ['startReligion','characterName','sex','governmentForm','tier'].map(function (field) {
      const copy = JSON.parse(JSON.stringify(mod));
      copy.startScenarios[0][field] = { startReligion:'orthodox', characterName:'Another ruler',
        sex:'f', governmentForm:'roman_civic', tier:5 }[field];
      return FB.mods.validate(copy).length > 0;
    });
    return { valid, invalid, pure:before === JSON.stringify(FBDATA) && rng === FB.getRngState() && uid === FB.getUidCounter() };
  }, examples);
  expect(rejected).toEqual({ valid:[], invalid:[true,true,true,true,true], pure:true });
  await page.evaluate(function () { FB.ui.showMods(); });
  await page.locator('#modfile').setInputFiles(path.resolve(__dirname, '../fixtures/authoring/ruler-faith-starts.json'));
  await Promise.all([page.waitForNavigation({ waitUntil:'domcontentloaded' }), page.locator('#mod-apply').click()]);
  await page.waitForFunction(function () { return window.FB && FB.game && FB.game.bootReady; });
  await page.getByRole('button', { name:'New Game', exact:true }).click();
  await page.locator('#bookmarklist [data-bookmark="1066"]').click();
  await expect(page.getByRole('button', { name:'English court example' })).toBeVisible();
  await page.locator('#btn-bm-seed').click();
  await page.locator('#ng-seed').fill('FAITH-1066-inherited_court_example-london-m-Harold_Godwinson');
  await page.locator('#ng-seed').press('Enter');
  await expect(page.locator('#cg-name')).toHaveValue('Harold Godwinson');
  await page.getByRole('button', { name:'Begin Your Story', exact:true }).click();
  await page.getByRole('button', { name:'Begin', exact:true }).click();
  expect(await page.evaluate(function () {
    const s = FB.state;
    s.player.flags.tutorial = 1;
    delete s.player.flags.tut_track_ruler_play;
    delete s.player.flags.tut_ruler_story;
    const status = FB.tutorialStatus(s);
    const saved = JSON.parse(FB.save.serialize());
    FB.save.restore(saved);
    const restored = FB.tutorialStatus(FB.state);
    FB.state.player.flags.tut_ruler_governance = 1;
    FB.state.player.flags.tut_unpause = 1;
    FB.tutorialCheck(FB.state);
    return { steps:status.steps.map(function (step) { return step.id; }),
      restored:restored.steps.map(function (step) { return step.id; }),
      completed:!!FB.state.player.flags.tut_track_ruler_play,
      noFakeReceipt:!FB.state.player.flags.tut_ruler_story };
  })).toEqual({ steps:['ruler_governance','unpause'], restored:['ruler_governance','unpause'],
    completed:true, noFakeReceipt:true });
});
