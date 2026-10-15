'use strict';
const path = require('path');
const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { beginBookmark } = require('../support/game/bookmark-acceptance');
const { dependsOnRuntime } = require('../support/runtime-dependencies');
const harbor = require('../fixtures/authoring/harbor-contracts.json');
const dune = require('../fixtures/authoring/dune-contracts.json');
dependsOnRuntime(__filename, ['data/markets.js','js/story_government_selection.js','data/actions.js','data/ambitions.js','data/policies.js','data/economy.js','data/papacy.js','data/travel.js','data/tournaments.js','data/traits.js','data/starts.js','data/political_institutions.js','index.html','data/story_instances.js','data/story_courts_476.js',
  'data/civic_profiles.js','js/stories.js','js/story_courts.js','js/story_track.js',
  'js/story_campaign.js','js/story_history.js','js/story_settlements.js','js/story_polity_foundation.js',
  'js/mods.js','js/world.js','js/main.js','js/messages.js','js/save.js','js/save_v4.js']);

test('ordinary file import creates new stories and branching tracks, reloads and removes them', async function ({ page }, info) {
  await openGame(page, info);
  const base = await page.evaluate(function () { return FB.stories.list().map(function (d) { return d.id; }); });
  await page.evaluate(function () { FB.ui.showMods(); });
  await page.locator('#modfile').setInputFiles(path.resolve(__dirname, '../fixtures/authoring/harbor-contracts.json'));
  await page.locator('#mod-apply').click();
  await page.waitForFunction(function () { return FB.game.bootReady && !!FB.stories.get('harbor_court'); });
  const imported = await page.evaluate(function () { return {
    order:FB.stories.list().map(function (d) { return d.id; }),
    faults:FB.validateBookmark(FB.bookmark('harbor_courts_900')),
    messages:!!FB.englishMessage(FBDATA.storyInstances.harbor_court.news.opening.key)
  }; });
  expect(imported.order.filter(function (id) { return base.includes(id); })).toEqual(base);
  expect(imported.faults).toEqual([]);
  expect(imported.messages).toBe(true);
  await beginBookmark(page, info, 'harbor_courts_900', 'harbor_court_household');
  const journey = await page.evaluate(function () {
    const s = FB.state, id = 'harbor_service';
    const pending = JSON.parse(FB.save.serialize());
    const reviewed = FB.stories.quote(s, id, 'harbor_refuse_involvement');
    const before = JSON.stringify(s), rng = FB.getRngState(), uid = FB.getUidCounter();
    FB.stories.cards(s); FB.stories.choices(s, id); FB.stories.quote(s, id, 'harbor_refuse_involvement');
    const pure = before === JSON.stringify(s) && rng === FB.getRngState() && uid === FB.getUidCounter();
    const applied = FB.stories.apply(s, id, 'harbor_refuse_involvement', reviewed);
    const repeated = FB.stories.apply(s, id, 'harbor_refuse_involvement', reviewed);
    const finished = JSON.parse(FB.save.serialize());
    FB.save.restore(pending);
    const resumed = FB.stories.apply(FB.state, id, 'harbor_refuse_involvement', FB.stories.quote(FB.state, id, 'harbor_refuse_involvement'));
    const replay = JSON.stringify(FB.state.stories) === JSON.stringify(finished.state.stories);
    FB.save.restore(finished);
    return { pure:pure, applied:applied, repeated:repeated, resumed:resumed, replay:replay,
      result:FB.state.stories[id].result, same:JSON.stringify(FB.state.stories) === JSON.stringify(finished.state.stories) };
  });
  expect(journey).toEqual({ pure:true, applied:true, repeated:false, resumed:true, replay:true, result:'declined', same:true });
  await page.evaluate(function () { FB.ui.showMods(); });
  await page.locator('#mod-clear').click();
  await page.waitForFunction(function () { return FB.game.bootReady && !FB.stories.get('harbor_court'); });
  expect(await page.evaluate(function () { return FB.stories.list().map(function (d) { return d.id; }); })).toEqual(base);
});

for (const fault of ['type','anchor','cycle','operation','reference','message','duplicate']) {
  test('invalid imported story ' + fault + ' preserves registries, messages, storage and state', async function ({ page }, info) {
    await openGame(page, info);
    const result = await page.evaluate(function (input) {
      const mod = input.mod, d = mod.storyInstances.harbor_civic;
      if (input.fault === 'type') d.type = 'unknown_type';
      if (input.fault === 'anchor') d.registrationAfter = 'missing_anchor';
      if (input.fault === 'cycle') mod.storyInstances.harbor_court.requires = ['harbor_civic'];
      if (input.fault === 'operation') d.choices[Object.keys(d.choices)[0]].operation = 'write_state';
      if (input.fault === 'reference') d.cast.delegate = { kind:'story', storyId:'harbor_court', field:'missing' };
      if (input.fault === 'message') mod.storyInstances.harbor_court.news.opening.key = 'not-a-message';
      if (input.fault === 'duplicate') d.id = 'harbor_court';
      const before = JSON.stringify(FBDATA), list = FB.stories.list(), messages = JSON.stringify(FB.englishMessages());
      const state = FB.state, rng = FB.getRngState(), uid = FB.getUidCounter(), stored = localStorage.getItem('fb_mods');
      const errors = FB.mods.validate(mod), rejected = FB.mods.store(JSON.stringify(mod));
      return { errors:errors, rejected:rejected, unchanged:before === JSON.stringify(FBDATA) && state === FB.state &&
        rng === FB.getRngState() && uid === FB.getUidCounter() && stored === localStorage.getItem('fb_mods') &&
        messages === JSON.stringify(FB.englishMessages()) && list.every(function (story, i) { return story === FB.stories.list()[i]; }) };
    }, { mod:harbor, fault:fault });
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.rejected).toBe(false);
    expect(result.unchanged).toBe(true);
  });
}

test('candidate compilation is detached and same-id overrides rebuild dependents without registering factories', async function ({ page }, info) {
  await openGame(page, info);
  const result = await page.evaluate(function (mod) {
    const before = FB.stories.list(), messages = JSON.stringify(FB.englishMessages());
    const faults = FB.mods.validate(mod);
    const isolated = before.every(function (story, i) { return FB.stories.list()[i] === story; }) &&
      !FB.stories.get('harbor_court') && messages === JSON.stringify(FB.englishMessages());
    FB.mods.apply(mod);
    const first = FB.stories.get('harbor_court');
    const replacement = JSON.parse(JSON.stringify(mod.storyInstances.harbor_court));
    replacement.parameters.seasonalPay += 3;
    FB.mods.apply({ storyInstances:{ harbor_court:replacement } });
    let sealed = false;
    try { FB.stories.registerType('untrusted_type', function () {}); } catch (error) { sealed = true; }
    return { faults:faults, isolated:isolated, replaced:first !== FB.stories.get('harbor_court'), sealed:sealed,
      unique:FB.stories.list().filter(function (story) { return story.id === 'harbor_court'; }).length };
  }, harbor);
  expect(result).toEqual({ faults:[], isolated:true, replaced:true, sealed:true, unique:1 });
});

test('prospective stored stacks honor import order and reject a dangling same-name replacement', async function ({ page },info) {
  await openGame(page,info);
  const result = await page.evaluate(function (mods) {
    const before = JSON.stringify(FBDATA), stories = FB.stories.list(), rng = FB.getRngState(), uid = FB.getUidCounter();
    const first = FB.mods.store(JSON.stringify(mods[0])), second = FB.mods.store(JSON.stringify(mods[1]));
    const stored = localStorage.getItem('fb_mods');
    const replacement = JSON.parse(JSON.stringify(mods[0])); delete replacement.storyInstances;
    const rejected = FB.mods.store(JSON.stringify(replacement));
    return { first:first,second:second,rejected:rejected,stored:stored === localStorage.getItem('fb_mods'),
      names:FB.mods.list().map(function (row) { return row.name; }),pure:before === JSON.stringify(FBDATA) &&
        stories.every(function (story,i) { return story === FB.stories.list()[i]; }) && rng === FB.getRngState() && uid === FB.getUidCounter() };
  },[harbor,dune]);
  expect(result).toMatchObject({ first:true,second:true,rejected:false,stored:true,pure:true });
  expect(result.names).toEqual([harbor.name,dune.name]);
  await page.reload();
  await page.waitForFunction(function () { return FB.game.bootReady && !!FB.stories.get('dune_court'); });
  expect(await page.evaluate(function () { return [!!FB.stories.get('harbor_court'),FBDATA.agencyRules.familyProgressChance]; })).toEqual([true,.2]);
});

test('changing imported graph content rejects the old save before state adoption', async function ({ page },info) {
  await openGame(page,info);
  await page.evaluate(function (mod) { FB.mods.store(JSON.stringify(mod)); },harbor);
  await page.reload(); await page.waitForFunction(function () { return FB.game.bootReady && !!FB.stories.get('harbor_court'); });
  await beginBookmark(page,info,'harbor_courts_900','harbor_court_household');
  const result = await page.evaluate(function () {
    const saved = JSON.parse(FB.save.serialize());
    const next = JSON.parse(JSON.stringify(FBDATA.storyInstances.harbor_court)); next.parameters.seasonalPay++;
    FB.mods.apply({ storyInstances:{ harbor_court:next } });
    const state = FB.state, facts = JSON.stringify(state), rng = FB.getRngState(), uid = FB.getUidCounter();
    let rejected = false; try { FB.save.restore(saved); } catch (error) { rejected = true; }
    return { rejected:rejected,pure:state === FB.state && facts === JSON.stringify(FB.state) && rng === FB.getRngState() && uid === FB.getUidCounter() };
  });
  expect(result).toEqual({ rejected:true,pure:true });
});
