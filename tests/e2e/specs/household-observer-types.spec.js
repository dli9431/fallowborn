'use strict';
const path = require('path');
const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { beginBookmark } = require('../support/game/bookmark-acceptance');
const { dependsOnRuntime } = require('../support/runtime-dependencies');
const examples = require('../fixtures/authoring/household-observers.json');
dependsOnRuntime(__filename, ['index.html','js/story_household_observer.js','js/story_household.js',
  'js/stories.js','js/story_campaign.js','js/story_agreements.js','js/story_government_selection.js',
  'js/world.js','js/starts.js','js/mods.js','js/save.js','js/save_v4.js','js/main.js','data/technology.js']);

async function imported(page, info, scenario) {
  await openGame(page, info);
  await page.evaluate(function () { FB.ui.showMods(); });
  await page.locator('#modfile').setInputFiles(path.resolve(__dirname, '../fixtures/authoring/household-observers.json'));
  await Promise.all([page.waitForNavigation({ waitUntil:'domcontentloaded' }), page.locator('#mod-apply').click()]);
  await page.waitForFunction(function () { return window.FB && FB.game && FB.game.bootReady && !!FB.stories.get('road_household_notice'); });
  await beginBookmark(page, info, 'dune_world', scenario || 'dune_household');
}

test('JSON observers have independent sources, reach and expiry without initial historical replay', async function ({ page }, info) {
  await imported(page, info);
  expect(await page.evaluate(function () {
    const s = FB.state, a = FB.stories.get('road_household_notice'), b = FB.stories.get('well_household_notice');
    const initial = [a.status(s,s.stories[a.id]), b.status(s,s.stories[b.id])];
    s.turn = 10; s.player.provinceId = 'dune_flats';
    Object.assign(s.stories.dune_border_review, {phase:'resolved',result:'won',outcomeTurn:10});
    b.day(s,s.stories[b.id]);
    const q = FB.stories.quote(s,b.id,'records'), before = JSON.stringify(s), rng = FB.getRngState(), uid = FB.getUidCounter();
    FB.stories.cards(s); FB.stories.quote(s,b.id,'records'); FB.stories.choices(s,b.id);
    const pure = before === JSON.stringify(s) && rng === FB.getRngState() && uid === FB.getUidCounter();
    s.turn = 16; b.day(s,s.stories[b.id]);
    return { initial:initial, expiry:b.declaration.expiryTurns, otherExpiry:a.declaration.expiryTurns,
      offered:q.allowed, pure:pure, expired:!FB.stories.status(s,b.id), stale:FB.stories.apply(s,b.id,'records',q) };
  })).toEqual({ initial:[null,null], expiry:5, otherExpiry:30, offered:true, pure:true, expired:true, stale:false });
});

test('local presence, source changes, control and the current decision maker invalidate reviews', async function ({ page }, info) {
  await imported(page, info);
  expect(await page.evaluate(function () {
    const s = FB.state, id = 'well_household_notice', module = FB.stories.get(id), t = s.stories[id];
    s.turn = 10; s.player.provinceId = 'dune_flats';
    Object.assign(s.stories.dune_border_review, {phase:'resolved',result:'won',outcomeTurn:10});
    module.day(s,t); const q = FB.stories.quote(s,id,'records');
    s.player.provinceId = 'dune_well'; const moved = FB.stories.apply(s,id,'records',q);
    s.player.provinceId = 'dune_flats'; s.stories.dune_border_review.reason = 'changed';
    const changed = FB.stories.apply(s,id,'records',q);
    const fresh = FB.stories.quote(s,id,'records');
    s.realms.dune_oasis.ruler.generation++;
    const control = FB.stories.apply(s,id,'records',fresh);
    const before = JSON.stringify([s.player.gold,s.owner,s.populations]);
    module.day(s,t);
    return { offered:q.allowed, moved:moved, changed:changed, control:control,
      unchanged:before === JSON.stringify([s.player.gold,s.owner,s.populations]), remaining:t.pending.length };
  })).toEqual({ offered:true, moved:false, changed:false, control:false, unchanged:true, remaining:0 });
});

test('a personal incident wins before its own dispatch and victory aliases actual control', async function ({ page }, info) {
  await imported(page, info, 'pass_household');
  expect(await page.evaluate(function () {
    const s = FB.state, id = 'road_household_notice', module = FB.stories.get(id), t = s.stories[id];
    s.turn = 7;
    Object.assign(s.stories.dune_settlement,{phase:'started',startedTurn:7,deadline:19,warId:'review_war'});
    module.day(s,t);
    const hidden = FB.stories.status(s,id) === null, untouched = Object.keys(t.householdReceipts).length === 0;
    const q = FB.stories.quote(s,'pass_household_track','personal');
    const personal = FB.stories.apply(s,'pass_household_track','personal',q);
    s.turn = 8; s.realms.dune_coalition.liege = 'dune_oasis'; FB.invalidateRealmCache();
    FB.transferProvince(s,'dune_pass','dune_coalition');
    Object.assign(s.stories.dune_settlement,{phase:'resolved',result:'won',outcomeTurn:8});
    module.day(s,t);
    const item = t.pending.filter(function (n) { return n.beatId === 'road_household_notice_won'; })[0];
    const alias = item && item.event.source;
    const preferred = item && FB.householdStories.owner(s,item.key);
    const personalRule = FB.stories.apply(s,'pass_household_track','personal_rule',FB.stories.quote(s,'pass_household_track','personal_rule'));
    module.day(s,t);
    return { hidden:hidden, untouched:untouched, personal:personal, alias:alias, preferred:preferred,
      personalRule:personalRule, observerReceipts:Object.keys(t.householdReceipts).length, visible:FB.stories.status(s,id) };
  })).toEqual({ hidden:true, untouched:true, personal:true, alias:'control', preferred:'pass_household_track',
    personalRule:true, observerReceipts:0, visible:null });
});

test('pending and resolved notices round trip and missing records remain absent', async function ({ page }, info) {
  await imported(page, info);
  expect(await page.evaluate(function () {
    let s = FB.state; const id = 'well_household_notice';
    s.turn = 10; s.player.provinceId = 'dune_flats';
    Object.assign(s.stories.dune_border_review,{phase:'resolved',result:'won',outcomeTurn:10});
    FB.stories.get(id).day(s,s.stories[id]);
    const pending = JSON.stringify(s.stories[id]), saved = JSON.parse(FB.save.serialize());
    FB.save.restore(saved); s = FB.state;
    const retained = pending === JSON.stringify(s.stories[id]);
    const q = FB.stories.quote(s,id,'records'), gold = s.player.gold;
    const applied = FB.stories.apply(s,id,'records',q), repeated = FB.stories.apply(s,id,'records',q);
    const finished = JSON.parse(FB.save.serialize()); FB.save.restore(finished); s = FB.state;
    FB.stories.get(id).day(s,s.stories[id]);
    const replay = FB.stories.status(s,id), receipt = Object.keys(s.stories[id].householdReceipts).length;
    delete finished.state.stories[id]; FB.save.restore(finished);
    return {retained:retained,applied:applied,repeated:repeated,replay:replay,receipt:receipt,
      gold:gold === FB.state.player.gold,missing:!FB.state.stories[id]};
  })).toEqual({retained:true,applied:true,repeated:false,replay:null,receipt:1,gold:true,missing:true});
});

test('a remote campaign reaches a household only when its actual host arrives', async function ({ page }, info) {
  await imported(page, info);
  expect(await page.evaluate(function () {
    const s = FB.state, id = 'road_household_notice', module = FB.stories.get(id), t = s.stories[id];
    s.turn = 7;
    Object.assign(s.stories.dune_settlement,{phase:'started',startedTurn:7,deadline:19,warId:'review_war'});
    module.day(s,t); const remote = FB.stories.status(s,id);
    s.armies.push({id:'review_host',realm:'dune_coalition',men:30,warId:'review_war',at:'dune_well'});
    module.day(s,t); const reached = !!FB.stories.status(s,id);
    const q = FB.stories.quote(s,id,'records');
    s.armies = s.armies.filter(function (a) { return a.id !== 'review_host'; });
    const stale = FB.stories.apply(s,id,'records',q);
    return {remote:remote,reached:reached,stale:stale};
  })).toEqual({remote:null,reached:true,stale:false});
});

test('household continuity requires a fresh heir review and never repeats a closed response', async function ({ page }, info) {
  await imported(page, info);
  expect(await page.evaluate(function () {
    const s = FB.state, id = 'well_household_notice', module = FB.stories.get(id), t = s.stories[id];
    s.turn = 10; s.player.provinceId = 'dune_flats';
    Object.assign(s.stories.dune_border_review,{phase:'resolved',result:'won',outcomeTurn:10});
    module.day(s,t); const q = FB.stories.quote(s,id,'records'), householdId = t.householdId;
    const relative = FB.householdMembers(s).filter(function (c) { return !c.dead && c.id !== s.player.charId; })[0];
    if (!relative) throw new Error('The standard household needs a living relative.');
    s.player.charId = relative.id;
    const stale = FB.stories.apply(s,id,'records',q);
    module.day(s,t);
    const applied = FB.stories.apply(s,id,'records',FB.stories.quote(s,id,'records'));
    module.day(s,t);
    return {stale:stale,applied:applied,household:householdId === t.householdId,
      actor:t.actorId === relative.id,receipts:Object.keys(t.householdReceipts).length,visible:FB.stories.status(s,id)};
  })).toEqual({stale:false,applied:true,household:true,actor:true,receipts:1,visible:null});
});

for (const fault of ['operation','source','trigger','place','limit','unknown']) {
  test('invalid observer ' + fault + ' rejects without publishing or consuming identities', async function ({ page }, info) {
    await openGame(page, info);
    const result = await page.evaluate(function (input) {
      const mod = input.mod, d = mod.storyInstances.road_household_notice;
      if (input.fault === 'operation') d.beats[0].choices[0].operation = 'grant_money';
      if (input.fault === 'source') d.sourceStoryId = 'dune_candidacy';
      if (input.fault === 'trigger') d.beats[0].trigger = 'unknown_milestone';
      if (input.fault === 'place') d.provinceIds.push('missing_county');
      if (input.fault === 'limit') d.expiryTurns = 10000;
      if (input.fault === 'unknown') d.writeState = 'player.gold';
      const before = JSON.stringify(FBDATA), list = FB.stories.list(), rng = FB.getRngState(), uid = FB.getUidCounter();
      const errors = FB.mods.validate(mod);
      return { rejected:errors.length > 0, pure:before === JSON.stringify(FBDATA) && rng === FB.getRngState() &&
        uid === FB.getUidCounter() && list.every(function (m,i) { return FB.stories.list()[i] === m; }) };
    }, {mod:examples,fault:fault});
    expect(result).toEqual({rejected:true,pure:true});
  });
}

test('malformed observer save data rejects before adoption', async function ({ page }, info) {
  await imported(page, info);
  expect(await page.evaluate(function () {
    const saved = JSON.parse(FB.save.serialize()), before = FB.state, rng = FB.getRngState(), uid = FB.getUidCounter();
    saved.state.stories.road_household_notice.cursors.fake_beat = {token:'["won",true]',turn:0};
    let rejected = false; try { FB.save.restore(saved); } catch (err) { rejected = true; }
    return rejected && before === FB.state && rng === FB.getRngState() && uid === FB.getUidCounter();
  })).toBe(true);
});
