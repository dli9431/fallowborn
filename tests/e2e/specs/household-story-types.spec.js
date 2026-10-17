'use strict';
const path = require('path');
const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { beginBookmark } = require('../support/game/bookmark-acceptance');
const { dependsOnRuntime } = require('../support/runtime-dependencies');
const examples = require('../fixtures/authoring/household-graphs.json');
dependsOnRuntime(__filename, ['index.html','data/bookmarks.js','data/starts.js','data/technology.js',
  'js/story_household.js','js/stories.js','js/starts.js','js/mods.js','js/world.js','js/main.js',
  'js/save.js','js/save_v4.js','js/actions.js','js/travel.js','js/i18n.js','js/model.js']);

async function importExamples(page, info) {
  await openGame(page, info);
  await page.evaluate(function () { FB.ui.showMods(); });
  await page.locator('#modfile').setInputFiles(path.resolve(__dirname, '../fixtures/authoring/household-graphs.json'));
  await Promise.all([page.waitForNavigation({ waitUntil:'domcontentloaded' }), page.locator('#mod-apply').click()]);
  await page.waitForFunction(function () { return window.FB && FB.game && FB.game.bootReady && !!FB.stories.get('quay_household_example'); });
}

test('ordinary JSON import supplies two different household graphs with durable decisions', async function ({ page }, info) {
  await importExamples(page, info);
  await beginBookmark(page, info, '867', 'quay_household_example_start');
  const result = await page.evaluate(function () {
    let s = FB.state;
    const id = 'quay_household_example', before = JSON.stringify(s), rng = FB.getRngState(), uid = FB.getUidCounter();
    const q = FB.stories.quote(s, id, 'keep_private');
    FB.stories.cards(s); FB.stories.choices(s, id);
    const wrongHome = FB.stories.start(s, { tracks:['hill_household_example'] }).length;
    const pure = before === JSON.stringify(s) && rng === FB.getRngState() && uid === FB.getUidCounter();
    s.player.gold++;
    const stale = FB.stories.apply(s, id, 'keep_private', q);
    s.player.gold--;
    const applied = FB.stories.apply(s, id, 'keep_private', FB.stories.quote(s, id, 'keep_private'));
    const repeated = FB.stories.apply(s, id, 'keep_private', q);
    const rec = JSON.stringify(s.stories[id]), saved = JSON.parse(FB.save.serialize());
    FB.save.restore(saved); s = FB.state;
    const retained = rec === JSON.stringify(s.stories[id]);
    // Matching older saves remain without a newly introduced optional track.
    delete saved.state.stories[id];
    FB.save.restore(saved);
    return { pure:pure, wrongHome:wrongHome, stale:stale, applied:applied, repeated:repeated, retained:retained,
      missing:!FB.state.stories || !FB.state.stories[id] };
  });
  expect(result).toEqual({ pure:true, wrongHome:0, stale:false, applied:true, repeated:false, retained:true, missing:true });
});

test('the independent dated graph expires without a reward or replay', async function ({ page }, info) {
  await importExamples(page, info);
  await beginBookmark(page, info, '867', 'hill_household_example_start');
  expect(await page.evaluate(function () {
    const s = FB.state, id = 'hill_household_example', t = s.stories[id];
    const money = s.player.gold, rng = FB.getRngState();
    s.date.year = 868; s.turn = 360;
    const stale = FB.stories.quote(s, id, 'remain').allowed;
    FB.stories.get(id).year(s, t);
    const once = JSON.stringify(t);
    FB.stories.get(id).day(s, t);
    return { phase:t.phase, stale:stale, once:once === JSON.stringify(t),
      money:money === s.player.gold, rng:rng === FB.getRngState() };
  })).toEqual({ phase:'expired', stale:false, once:true, money:true, rng:true });
});

for (const fault of ['operation','predicate','reference','unreachable','dead_end','unknown_key','incident_cycle','prototype_cycle']) {
  test('invalid household ' + fault + ' rejects without publishing or consuming state', async function ({ page }, info) {
    await openGame(page, info);
    const result = await page.evaluate(function (input) {
      const m = input.mod, d = m.storyInstances.quay_household_example;
      if (input.fault === 'operation') d.stages.invitation.choices[0].operation = { kind:'give_gold', amount:50 };
      if (input.fault === 'predicate') d.stages.invitation.choices[0].when = { kind:'eval', expression:'true' };
      if (input.fault === 'reference') d.stages.invitation.choices[0].when = { kind:'story_state', storyId:'missing_story', stateField:'phase', values:['started'] };
      if (input.fault === 'unreachable') d.stages.orphan = { name:'Orphan', text:'Unused.', terminal:true, choices:[], transitions:[] };
      if (input.fault === 'dead_end') { d.stages.prepared.terminal = undefined; }
      if (input.fault === 'unknown_key') d.stages.invitation.effects = { gold:50 };
      if (input.fault === 'prototype_cycle') {
        d.initialStage = 'constructor';
        d.stages = { constructor:{ name:'An unfinished loop', text:'No terminal exists.', transitions:[],
          choices:[{ id:'again', label:'Again', detail:'This graph cannot finish.', next:'constructor', operation:{ kind:'record_decision' } }] } };
      }
      if (input.fault === 'incident_cycle') {
        d.stages.invitation.incident = { source:'control', provinceId:'paris', milestone:'rule_changed' };
        d.stages.invitation.afterIncident = 'prepared';
        d.stages.invitation.choices[0].next = 'invitation';
      }
      const before = JSON.stringify(FBDATA), list = FB.stories.list(), rng = FB.getRngState(), uid = FB.getUidCounter();
      const stored = localStorage.getItem('fb_mods'), messages = JSON.stringify(FB.englishMessages());
      const errors = FB.mods.validate(m);
      return { errors:errors, pure:before === JSON.stringify(FBDATA) && stored === localStorage.getItem('fb_mods') &&
        rng === FB.getRngState() && uid === FB.getUidCounter() && messages === JSON.stringify(FB.englishMessages()) &&
        list.every(function (row, i) { return row === FB.stories.list()[i]; }) };
    }, { mod:examples, fault:fault });
    expect(result.errors.length).toBeGreaterThan(0); expect(result.pure).toBe(true);
  });
}

test('control receipts prefer the personal track before dispatch and remain closed across restore', async function ({ page }, info) {
  await importExamples(page, info);
  await beginBookmark(page, info, '867', 'hill_household_example_start');
  expect(await page.evaluate(function () {
    const s = FB.state, id = 'hill_household_example', t = s.stories[id];
    const baseline = FB.stories.quote(s, id, 'remain').allowed;
    const old = FB.topRealm(s, s.owner.aachen);
    const other = Object.keys(s.realms).filter(function (rid) {
      return rid !== 'player' && s.realms[rid].alive && FB.topRealm(s, rid) === rid && rid !== old;
    }).sort()[0];
    s.turn = 7;
    FB.transferProvince(s, 'aachen', other);
    const q = FB.stories.quote(s, id, 'remain'), key = q.facts.incident;
    const preferred = FB.householdStories.owner(s, key);
    const notConsumed = !FB.householdStories.receipt(s, key);
    FB.stories.get(id).day(s, t);
    const applied = FB.stories.apply(s, id, 'remain', FB.stories.quote(s, id, 'remain'));
    const closure = FB.householdStories.receipt(s, key), data = JSON.stringify(t);
    const saved = JSON.parse(FB.save.serialize()); FB.save.restore(saved);
    return { baseline:baseline, preferred:preferred, notConsumed:notConsumed, applied:applied,
      status:closure.status, key:JSON.parse(key), retained:data === JSON.stringify(FB.state.stories[id]),
      repeated:FB.stories.apply(FB.state, id, 'remain', q), ownerAfter:FB.householdStories.owner(FB.state, key) };
  })).toMatchObject({ baseline:false, preferred:'hill_household_example', notConsumed:true, applied:true,
    status:'resolved', retained:true, repeated:false, ownerAfter:null });
});

test('invalid household records reject before save adoption', async function ({ page }, info) {
  await importExamples(page, info);
  await beginBookmark(page, info, '867', 'quay_household_example_start');
  expect(await page.evaluate(function () {
    const saved = JSON.parse(FB.save.serialize()), before = FB.state, rng = FB.getRngState(), uid = FB.getUidCounter();
    saved.state.stories.quay_household_example.decisions.invitation = { choiceId:'missing', turn:0, actorId:FB.state.player.charId };
    var rejected = false;
    try { FB.save.restore(saved); } catch (e) { rejected = true; }
    return rejected && FB.state === before && rng === FB.getRngState() && uid === FB.getUidCounter();
  })).toBe(true);
});

test('dated journey gates apply before departure and preserve an existing commitment', async function ({ page }, info) {
  await importExamples(page, info);
  await beginBookmark(page, info, '867', 'quay_household_example_start');
  expect(await page.evaluate(function () {
    const s = FB.state, purpose = 'household_example_journey';
    const early = FB.travelEligible(s, purpose, { readOnly:true }) === true;
    s.date.year = 868; s.turn = 360; s.player.gold = 1000;
    const available = FB.travelEligible(s, purpose, { readOnly:true }) === true;
    const started = FB.travelStart(s, purpose, 'aachen');
    s.date.year = 870; s.turn = 1080;
    FB.travelTick(s);
    const grandfathered = !!s.player.travel;
    FB.travelCancel(s);
    const late = FB.travelEligible(s, purpose, { readOnly:true }) === true;
    return { early:early, available:available, started:started, grandfathered:grandfathered, late:late };
  })).toEqual({ early:false, available:true, started:true, grandfathered:true, late:false });
});
