'use strict';
const path = require('path');
const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { beginBookmark } = require('../support/game/bookmark-acceptance');
const { dependsOnRuntime } = require('../support/runtime-dependencies');
const examples = require('../fixtures/authoring/household-work.json');

dependsOnRuntime(__filename, ['index.html','data/actions.js','data/starts.js','data/technology.js',
  'js/actions.js','js/story_household.js','js/stories.js','js/starts.js','js/mods.js','js/main.js',
  'js/model.js','js/save.js','js/save_v4.js','js/government_civic.js','js/civic_transactions.js']);

async function importExamples(page, info) {
  await openGame(page, info);
  await page.evaluate(function () { FB.ui.showMods(); });
  await page.locator('#modfile').setInputFiles(path.resolve(__dirname, '../fixtures/authoring/household-work.json'));
  await Promise.all([page.waitForNavigation({ waitUntil:'domcontentloaded' }), page.locator('#mod-apply').click()]);
  await page.waitForFunction(function () { return window.FB && FB.game && FB.game.bootReady && FB.stories.get('bench_work_example'); });
}

test('JSON work graphs charge once and observe actual focus income without replay', async function ({ page }, info) {
  await importExamples(page, info);
  await beginBookmark(page, info, '867', 'bench_work_example_start');
  expect(await page.evaluate(function () {
    let s = FB.state;
    const id = 'bench_work_example';
    function choose(c) { return FB.stories.apply(s, id, c, FB.stories.quote(s, id, c)); }
    s.player.gold = 2;
    const poor = choose('buy'), unchanged = s.player.gold === 2;
    s.player.gold = 10;
    const reviewed = FB.stories.quote(s, id, 'buy');
    s.player.gold++;
    const stale = FB.stories.apply(s, id, 'buy', reviewed), bought = choose('buy');
    const charged = s.player.gold === 8, repeat = choose('buy');
    const selected = choose('work'), unearned = s.stories[id].phase;
    s.player.gold += 100;
    FB.stories.get(id).day(s, s.stories[id]);
    const gift = s.stories[id].phase;
    const pending = JSON.stringify(s.stories[id]);
    FB.save.restore(JSON.parse(FB.save.serialize())); s = FB.state;
    const pendingRetained = pending === JSON.stringify(s.stories[id]);
    const gold = s.player.gold;
    FB.tickFocus(s);
    const paid = s.stories[id].phase, gained = s.player.gold > gold;
    const done = JSON.stringify(s.stories[id]), funds = s.player.gold;
    FB.save.restore(JSON.parse(FB.save.serialize())); s = FB.state;
    return { poor:poor, unchanged:unchanged, stale:stale, bought:bought, charged:charged, repeat:repeat,
      selected:selected, unearned:unearned, gift:gift, pendingRetained:pendingRetained, paid:paid, gained:gained,
      restored:done === JSON.stringify(s.stories[id]) && funds === s.player.gold };
  })).toEqual({ poor:false, unchanged:true, stale:false, bought:true, charged:true, repeat:false,
    selected:true, unearned:'working', gift:'working', pendingRetained:true, paid:'paid', gained:true, restored:true });
});

test('the independent field graph uses field income and household continuity', async function ({ page }, info) {
  await importExamples(page, info);
  await beginBookmark(page, info, '867', 'field_work_example_start');
  expect(await page.evaluate(function () {
    const s = FB.state, id = 'field_work_example';
    const selected = FB.stories.apply(s, id, 'work', FB.stories.quote(s, id, 'work'));
    const gold = s.player.gold;
    FB.tickFocus(s);
    return { selected:selected, focus:s.player.focus, paid:s.player.gold > gold, phase:s.stories[id].phase };
  })).toEqual({ selected:true, focus:'work_land', paid:true, phase:'closed' });
});

test('personal work interrupts on death and rejects a successor before lifecycle dispatch', async function ({ page }, info) {
  await importExamples(page, info);
  await beginBookmark(page, info, '867', 'bench_work_example_start');
  expect(await page.evaluate(function () {
    const s = FB.state, id = 'bench_work_example', t = s.stories[id], actor = s.player.charId;
    const q = FB.stories.quote(s, id, 'buy'), before = s.player.gold;
    const heir = Object.keys(s.chars).find(function (cid) { return cid !== actor && !s.chars[cid].dead; });
    s.player.charId = heir;
    const inherited = FB.stories.apply(s, id, 'buy', q);
    s.player.charId = actor; s.chars[actor].dead = true;
    FB.stories.get(id).day(s, t);
    return { inherited:inherited, phase:t.phase, original:t.actorId === actor, unchanged:before === s.player.gold };
  })).toEqual({ inherited:false, phase:'interrupted', original:true, unchanged:true });
});

for (const fault of ['focus','expense','work_target','personal_route']) {
  test('malformed JSON work ' + fault + ' rejects without mutations', async function ({ page }, info) {
    await openGame(page, info);
    const result = await page.evaluate(function (input) {
      const m = input.mod, d = m.storyInstances.bench_work_example;
      if (input.fault === 'focus') d.stages.select_work.choices[0].operation.focusId = 'missing_focus';
      if (input.fault === 'expense') d.stages.supplies.choices[0].operation.amount = -3;
      if (input.fault === 'work_target') d.stages.working.afterWork.next = 'missing_stage';
      if (input.fault === 'personal_route') d.interruptedStage = 'working';
      const before = JSON.stringify(FBDATA), rng = FB.getRngState(), uid = FB.getUidCounter();
      const errors = FB.mods.validate(m);
      return { rejected:errors.length > 0, pure:before === JSON.stringify(FBDATA) && rng === FB.getRngState() && uid === FB.getUidCounter() };
    }, { mod:examples, fault:fault });
    expect(result).toEqual({ rejected:true, pure:true });
  });
}
