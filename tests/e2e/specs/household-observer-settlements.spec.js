'use strict';
const path = require('path');
const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { beginBookmark } = require('../support/game/bookmark-acceptance');
const { dependsOnRuntime } = require('../support/runtime-dependencies');
const example = require('../fixtures/authoring/household-settlement-observers.json');

dependsOnRuntime(__filename, ['index.html','js/story_household_observer.js','js/story_household.js',
  'js/story_settlements.js','js/story_history.js','js/story_polity_foundation.js','js/stories.js',
  'js/mods.js','js/world.js','js/wars.js','js/holywar.js','js/starts.js','js/main.js',
  'js/save.js','js/save_v4.js','data/technology.js']);

async function imported(page, info) {
  await openGame(page, info);
  await page.evaluate(function () { FB.ui.showMods(); });
  await page.locator('#modfile').setInputFiles(path.resolve(__dirname, '../fixtures/authoring/household-settlement-observers.json'));
  await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded'}), page.locator('#mod-apply').click()]);
  await page.waitForFunction(function () { return window.FB && FB.game && FB.game.bootReady && !!FB.stories.get('gift_household_notice'); });
  await beginBookmark(page, info, 'dune_world', 'dune_household');
}

test('JSON gift and inheritance observers keep planning, execution and expiry distinct', async function ({page}, info) {
  await imported(page, info);
  expect(await page.evaluate(function () {
    const s = FB.state, a = FB.stories.get('gift_household_notice'), b = FB.stories.get('inheritance_household_notice');
    const initial = [a.status(s,s.stories[a.id]),b.status(s,s.stories[b.id])];
    s.turn = 10; s.player.provinceId = 'dune_well';
    Object.assign(s.stories.dune_gifts,{phase:'resolved',result:'agreed',turn:10});
    const funds = JSON.stringify([s.player.gold,s.owner,s.realms]);
    a.day(s,s.stories[a.id]);
    const gift = FB.stories.quote(s,a.id,'records').allowed;
    s.turn = 16; a.day(s,s.stories[a.id]);
    s.player.provinceId = 'dune_pass';
    Object.assign(s.stories.dune_inheritance,{phase:'planned',turn:16,plan:{shares:[]}});
    b.day(s,s.stories[b.id]);
    const planned = s.stories[b.id].pending[0].beatId;
    FB.stories.apply(s,b.id,'records',FB.stories.quote(s,b.id,'records'));
    s.turn = 17;
    Object.assign(s.stories.dune_inheritance,{phase:'resolved',result:'executed',turn:17});
    b.day(s,s.stories[b.id]);
    const executed = s.stories[b.id].pending[0].beatId;
    const before = JSON.stringify(s), rng = FB.getRngState(), uid = FB.getUidCounter();
    FB.stories.cards(s); FB.stories.quote(s,b.id,'records');
    return {initial:initial,gift:gift,expired:!FB.stories.status(s,a.id),planned:planned,executed:executed,
      pure:before === JSON.stringify(s) && rng === FB.getRngState() && uid === FB.getUidCounter(),
      funds:funds === JSON.stringify([s.player.gold,s.owner,s.realms])};
  })).toEqual({initial:[null,null],gift:true,expired:true,planned:'inheritance_household_notice_agreed',
    executed:'inheritance_household_notice_executed',pure:true,funds:true});
});

test('source court death and extinction require a fresh costless notice review', async function ({page}, info) {
  await imported(page, info);
  expect(await page.evaluate(function () {
    const s = FB.state, id = 'gift_household_notice'; s.turn = 10; s.player.provinceId = 'dune_well';
    Object.assign(s.stories.dune_gifts,{phase:'resolved',result:'agreed',turn:10});
    FB.stories.get(id).day(s,s.stories[id]);
    const q = FB.stories.quote(s,id,'records'), ruler = FB.realmRulerCharacterSnapshot(s,'dune_gate');
    ruler.dead = true;
    const dead = FB.stories.apply(s,id,'records',q);
    const next = FB.stories.quote(s,id,'records'); s.realms.dune_gate.alive = false;
    return {offered:q.allowed,dead:dead,extinct:FB.stories.apply(s,id,'records',next)};
  })).toEqual({offered:true,dead:false,extinct:false});
});

test('a diplomatic notice restores once and absent observers remain absent', async function ({page}, info) {
  await imported(page, info);
  expect(await page.evaluate(function () {
    let s = FB.state; const id = 'gift_household_notice';
    s.turn = 10; s.player.provinceId = 'dune_well';
    Object.assign(s.stories.dune_gifts,{phase:'resolved',result:'agreed',turn:10});
    FB.stories.get(id).day(s,s.stories[id]);
    const pending = JSON.stringify(s.stories[id]), saved = JSON.parse(FB.save.serialize());
    FB.save.restore(saved); s = FB.state;
    const retained = pending === JSON.stringify(s.stories[id]);
    const q = FB.stories.quote(s,id,'records'), applied = FB.stories.apply(s,id,'records',q);
    const again = FB.stories.apply(s,id,'records',q), finished = JSON.parse(FB.save.serialize());
    FB.save.restore(finished); s = FB.state; FB.stories.get(id).day(s,s.stories[id]);
    const closed = FB.stories.status(s,id) === null;
    delete finished.state.stories[id]; FB.save.restore(finished);
    return {retained:retained,applied:applied,again:again,closed:closed,missing:!FB.state.stories[id]};
  })).toEqual({retained:true,applied:true,again:false,closed:true,missing:true});
});

for (const fault of ['trigger','service','effect','source']) {
  test('new source adapters reject malformed JSON '+fault+' without publishing', async function ({page}, info) {
    await openGame(page, info);
    expect(await page.evaluate(function (input) {
      const d = input.mod.storyInstances.gift_household_notice;
      if (input.fault === 'trigger') d.beats[0].trigger = 'executed';
      if (input.fault === 'service') d.beats[0].reach = 'service';
      if (input.fault === 'effect') d.beats[0].choices[0].operation = 'grant_money';
      if (input.fault === 'source') d.sourceStoryId = 'dune_candidacy';
      const before = JSON.stringify(FBDATA), rng = FB.getRngState(), uid = FB.getUidCounter();
      const errors = FB.mods.validate(input.mod);
      return {rejected:errors.length > 0,pure:before === JSON.stringify(FBDATA) && rng === FB.getRngState() && uid === FB.getUidCounter()};
    }, {mod:example,fault:fault})).toEqual({rejected:true,pure:true});
  });
}
