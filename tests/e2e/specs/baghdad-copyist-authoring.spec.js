'use strict';
const path = require('path');
const { test, expect } = require('../support/fixture');
const { openGame, prepareGameContent } = require('../support/game/navigation');
const { beginBookmarkFromTitle } = require('../support/game/bookmark-acceptance');
const { dependsOnRuntime } = require('../support/runtime-dependencies');
const example = require('../fixtures/authoring/baghdad-copyist-commissions.json');

test.describe.configure({ mode:'parallel' });
dependsOnRuntime(__filename, ['index.html','data/bookmark_manifest.js','data/story_baghdad_commissions_800.js',
  'js/story_household.js','js/stories.js','js/mods.js','js/starts.js','js/save.js','js/save_v4.js','js/treasury.js','js/day_phases.js']);

const TRACK = 'paris_copy_terms_example';
const FIXTURE = path.resolve(__dirname, '../fixtures/authoring/baghdad-copyist-commissions.json');

async function importMod(page, input) {
  await page.evaluate(function () { FB.ui.showMods(); });
  await page.locator('#modfile').setInputFiles(input);
  await Promise.all([page.waitForNavigation({ waitUntil:'domcontentloaded' }), page.locator('#mod-apply').click()]);
  await prepareGameContent(page);
}

test('the Mods file picker admits independent terms and rejects a matching-name change on restore', async function ({ page }, info) {
  await openGame(page,info);
  await importMod(page,FIXTURE);
  await beginBookmarkFromTitle(page,'867','paris_copy_terms_start');
  const played = await page.evaluate(function (id) {
    FB.pickDailyEvents = function () { return []; };
    function choose(choice) { return FB.stories.apply(FB.state,id,choice,FB.stories.quote(FB.state,id,choice)); }
    const opening = JSON.parse(FB.save.serialize()), initial = FB.state.player.gold, turn = FB.state.turn;
    const short = choose('short'), shortGold = FB.state.player.gold - initial;
    const shortDays = FB.state.turn - turn, shortRepeat = choose('long');
    FB.save.restore(opening);
    const started = choose('long'), delivered = choose('deliver');
    const pending = JSON.parse(FB.save.serialize()), held = FB.state.stories[id].jobs.long_copy.escrow;
    FB.save.restore(pending);
    const settled = choose('settle'), repeated = choose('settle');
    const t = FB.state.stories[id], row = t.jobs.long_copy, saved = FB.save.serialize();
    FB.save.restore(JSON.parse(saved));
    return { saved, short, shortGold, shortDays, shortRepeat, started, delivered, held, settled, repeated,
      ledger:[row.daysWorked,row.paid,row.refunded,row.escrow], gain:FB.state.player.gold-initial,
      patrons:Object.keys(t.jobPatrons), restored:JSON.stringify(t) === JSON.stringify(FB.state.stories[id]) };
  },TRACK);
  expect(played).toMatchObject({ short:true, shortGold:4, shortDays:1, shortRepeat:false, started:true, delivered:true,
    held:4, settled:true, repeated:false, ledger:[2,6,3,0], gain:6, patrons:['short_copy'], restored:true });
  expect(JSON.parse(played.saved).mods).toMatch(/^effective-1-[a-f0-9]{64}$/);

  const changed = JSON.parse(JSON.stringify(example));
  changed.storyInstances[TRACK].jobs.long_copy.settlementGold = 2;
  await importMod(page,{ name:'baghdad-copyist-commissions.json', mimeType:'application/json', buffer:Buffer.from(JSON.stringify(changed)) });
  expect(await page.evaluate(function (saved) {
    const e = JSON.parse(saved), original = FB.state;
    const before = JSON.stringify([FBDATA,FB.state,FB.getRngState(),FB.getUidCounter()]);
    let rejected = false;
    try { FB.save.restore(e); } catch (error) { rejected = /mod set|incompatible content/.test(error.message); }
    return { rejected, changed:e.mods !== FB.mods.sig(), same:original === FB.state &&
      before === JSON.stringify([FBDATA,FB.state,FB.getRngState(),FB.getUidCounter()]) };
  },played.saved)).toEqual({ rejected:true, changed:true, same:true });
});

test('candidate validation rejects invalid patron links while preserving the effective catalogue', async function ({ page }, info) {
  await openGame(page,info);
  expect(await page.evaluate(function (input) {
    const before = JSON.stringify([FBDATA,FB.state,FB.getRngState(),FB.getUidCounter()]);
    const list = FB.stories.list();
    const accepted = FB.mods.validate(input.example);
    const rejected = ['missing','long_copy','wrong_payer'].map(function (fault) {
      const candidate = JSON.parse(JSON.stringify(input.example)), def = candidate.storyInstances[input.id];
      if (fault === 'wrong_payer') {
        def.requirements.realms.push('lotharingia');
        def.jobs.long_copy.payerRealmId = 'lotharingia';
      } else def.jobs.long_copy.patronJobId = fault;
      return JSON.stringify(FB.mods.validate(candidate)).includes('job patron binding');
    });
    return { accepted, rejected, pure:before === JSON.stringify([FBDATA,FB.state,FB.getRngState(),FB.getUidCounter()]) &&
      list.every(function (row,i) { return FB.stories.list()[i] === row; }) };
  },{ example, id:TRACK })).toEqual({ accepted:[], rejected:[true,true,true], pure:true });
});
