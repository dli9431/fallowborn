'use strict';
const path = require('path');
const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { beginBookmark } = require('../support/game/bookmark-acceptance');
const { dependsOnRuntime } = require('../support/runtime-dependencies');
const river = require('../fixtures/authoring/household-locality-river.json');
dependsOnRuntime(__filename, ['index.html','js/story_household.js','js/story_household_observer.js',
  'js/stories.js','js/world.js','js/starts.js','js/mods.js','js/save.js','js/save_v4.js',
  'js/travel.js','js/intrigue.js','js/main.js','data/technology.js']);

async function imported(page, info, which, scenario) {
  await openGame(page, info);
  await page.evaluate(function () { FB.ui.showMods(); });
  await page.locator('#modfile').setInputFiles(path.resolve(__dirname,
    '../fixtures/authoring/household-locality-' + which + '.json'));
  await Promise.all([page.waitForNavigation({ waitUntil:'domcontentloaded' }), page.locator('#mod-apply').click()]);
  await page.waitForFunction(function () { return window.FB && FB.game && FB.game.bootReady; });
  await beginBookmark(page, info, which === 'river' ? 'harbor_world' : 'dune_world',
    scenario || (which === 'river' ? 'harbor_household' : 'dune_household'));
  await page.evaluate(function () { FB.state.player.homeSettlement = 0; });
}

test('two committed same-county, same-turn events retain distinct physical identities and share observer aliases', async function ({ page }, info) {
  await imported(page, info, 'river');
  expect(await page.evaluate(function () {
    const s = FB.state, source = 'river_local_records', id = 'river_notice', alias = 'river_notice_alias';
    s.turn = 5;
    const before = JSON.stringify([s.player.gold,s.population,s.chars,s.owner,s.holder,s.armies]);
    const first = FB.stories.apply(s,source,'record',FB.stories.quote(s,source,'record'));
    const item = s.stories[id].pending[0], firstKey = item.key;
    const aliases = firstKey === s.stories[alias].pending[0].key;
    const closed = FB.stories.apply(s,id,'records',FB.stories.quote(s,id,'records'));
    const repeated = FB.stories.apply(s,alias,'records',FB.stories.quote(s,alias,'records'));
    const wrongSite = FB.stories.quote(s,source,'record').allowed;
    s.player.homeSettlement = 1;
    const second = FB.stories.apply(s,source,'record',FB.stories.quote(s,source,'record'));
    const secondKey = s.stories[id].pending[0].key;
    const applied = FB.stories.apply(s,id,'records',FB.stories.quote(s,id,'records'));
    FB.stories.get(alias).day(s,s.stories[alias]);
    const a = JSON.parse(firstKey), b = JSON.parse(secondKey);
    return { first,second,closed,applied,repeated,wrongSite,aliases,
      county:a[3] === b[3],sameFact:JSON.stringify(a.slice(0,7)) === JSON.stringify(b.slice(0,7)),
      sites:[a[7],b[7]],receipts:Object.keys(s.stories[id].householdReceipts).length,
      aliasReceipts:Object.keys(s.stories[alias].householdReceipts).length,
      cursors:Object.keys(s.stories[id].cursors).length,
      unchanged:before === JSON.stringify([s.player.gold,s.population,s.chars,s.owner,s.holder,s.armies]) };
  })).toEqual({first:true,second:true,closed:true,applied:true,repeated:false,wrongSite:false,aliases:true,
    county:true,sameFact:true,sites:['harbor_meeting_hall','harbor_river_gate'],receipts:2,aliasReceipts:0,cursors:2,unchanged:true});
});

test('personal ownership survives observer expiry and absence without an observer closing its receipt', async function ({ page }, info) {
  await imported(page, info, 'river', 'river_personal_household');
  expect(await page.evaluate(function () {
    const s = FB.state, source = 'river_local_records', personal = 'river_personal_response', id = 'river_notice';
    s.turn = 5; FB.stories.apply(s,source,'record',FB.stories.quote(s,source,'record'));
    const key = s.stories[id].pending[0].key, preferred = FB.householdStories.owner(s,key);
    const hidden = FB.stories.status(s,id) === null, q = FB.stories.quote(s,personal,'record');
    s.player.homeSettlement = 1; s.turn = 12;
    FB.stories.get(id).day(s,s.stories[id]);
    FB.stories.get('river_notice_alias').day(s,s.stories.river_notice_alias);
    const absent = FB.stories.quote(s,personal,'record').allowed;
    const stale = FB.stories.apply(s,personal,'record',q), untouched = !FB.householdStories.receipt(s,key);
    s.player.homeSettlement = 0;
    const response = FB.stories.apply(s,personal,'record',FB.stories.quote(s,personal,'record'));
    return {preferred,hidden,absent,stale,untouched,response,
      owner:FB.householdStories.receipt(s,key).owner,observerReceipts:Object.keys(s.stories[id].householdReceipts).length};
  })).toEqual({preferred:'river_personal_response',hidden:true,absent:false,stale:false,untouched:true,response:true,
    owner:'river_personal_response',observerReceipts:0});
});

test('exact-site source decisions reject county-only presence, travel, captivity and absent layouts without mutation', async function ({ page }, info) {
  await imported(page, info, 'river');
  expect(await page.evaluate(function () {
    const s = FB.state, source = 'river_local_records', initial = JSON.stringify(s);
    const rng = FB.getRngState(), uid = FB.getUidCounter();
    const q = FB.stories.quote(s,source,'record'); FB.stories.quote(s,source,'record');
    const pure = initial === JSON.stringify(s) && rng === FB.getRngState() && uid === FB.getUidCounter();
    s.player.homeSettlement = 1;
    const wrong = FB.stories.quote(s,source,'record').allowed;
    s.player.homeSettlement = 0;
    s.player.travel = {currentId:'harbor_quay',destinationId:'harbor_quay',phase:'arrived'};
    const journey = FB.stories.quote(s,source,'record').allowed; s.player.travel = null;
    s.player.flags.in_prison = true;
    const captive = FB.stories.quote(s,source,'record').allowed; delete s.player.flags.in_prison;
    const layout = FB.world.sitesByProv.harbor_quay; delete FB.world.sitesByProv.harbor_quay;
    const missing = FB.stories.quote(s,source,'record').allowed; FB.world.sitesByProv.harbor_quay = layout;
    return {pure,ready:q.allowed,wrong,journey,captive,missing,decisions:Object.keys(s.stories[source].decisions).length};
  })).toEqual({pure:true,ready:true,wrong:false,journey:false,captive:false,missing:false,decisions:0});
});

test('independent short-lived hill reports do not reach remote, wrong-site or late households', async function ({ page }, info) {
  await imported(page, info, 'hill');
  expect(await page.evaluate(function () {
    const s = FB.state, source = 'hill_local_records', id = 'hill_notice';
    s.turn = 4; const initial = FB.stories.status(s,id);
    const committed = FB.stories.apply(s,source,'record',FB.stories.quote(s,source,'record'));
    const q = FB.stories.quote(s,id,'records'), pending = JSON.stringify(s.stories[id].pending);
    s.player.provinceId = 'dune_flats'; const remote = FB.stories.apply(s,id,'records',q);
    s.player.provinceId = 'dune_well'; s.player.homeSettlement = 1;
    const wrong = FB.stories.quote(s,id,'records').allowed;
    s.player.homeSettlement = 0; s.turn = 7;
    FB.stories.get(id).day(s,s.stories[id]);
    return {initial,committed,offered:q.allowed,remote,wrong,expiry:FB.stories.get(id).declaration.expiryTurns,
      pending:pending.length > 2,late:FB.stories.quote(s,id,'records').allowed,
      unchangedSource:Object.keys(s.stories[source].decisions).length === 1};
  })).toEqual({initial:null,committed:true,offered:true,remote:false,wrong:false,expiry:2,pending:true,late:false,unchangedSource:true});
});

test('pending and closed local saves retain source facts, aliases and RNG without replay or missing-record creation', async function ({ page }, info) {
  await imported(page, info, 'river');
  expect(await page.evaluate(function () {
    let s = FB.state; const source = 'river_local_records', id = 'river_notice';
    s.turn = 5; FB.stories.apply(s,source,'record',FB.stories.quote(s,source,'record'));
    const pending = JSON.stringify(s.stories), saved = JSON.parse(FB.save.serialize());
    const rng = FB.getRngState(), uid = FB.getUidCounter();
    FB.save.restore(saved); s = FB.state;
    const retained = pending === JSON.stringify(s.stories) && rng === FB.getRngState() && uid === FB.getUidCounter();
    const q = FB.stories.quote(s,id,'records'), first = FB.stories.apply(s,id,'records',q), repeated = FB.stories.apply(s,id,'records',q);
    FB.stories.get('river_notice_alias').day(s,s.stories.river_notice_alias);
    const done = JSON.parse(FB.save.serialize()), closed = JSON.stringify(s.stories);
    FB.save.restore(done); s = FB.state;
    const closedRetained = closed === JSON.stringify(s.stories);
    FB.stories.get(id).day(s,s.stories[id]);
    const quiet = FB.stories.status(s,id) === null;
    delete done.state.stories[id]; FB.save.restore(done);
    return {retained,first,repeated,closedRetained,quiet,missing:!FB.state.stories[id],
      sourceDecisions:Object.keys(FB.state.stories[source].decisions).length};
  })).toEqual({retained:true,first:true,repeated:false,closedRetained:true,quiet:true,missing:true,sourceDecisions:1});
});

test('version-two personal saves preserve mixed county and settlement tuples exactly', async function ({ page }, info) {
  await imported(page, info, 'hill', 'hill_personal_household');
  expect(await page.evaluate(function () {
    let s = FB.state; const source = 'hill_local_records', id = 'hill_personal_response';
    s.turn = 5; FB.stories.apply(s,source,'record',FB.stories.quote(s,source,'record'));
    const local = FB.stories.apply(s,id,'record',FB.stories.quote(s,id,'record'));
    s.turn = 6; FB.transferProvince(s,'dune_well','dune_gate');
    FB.stories.get(id).day(s,s.stories[id]);
    const county = FB.stories.apply(s,id,'record',FB.stories.quote(s,id,'record'));
    const keys = Object.keys(s.stories[id].householdReceipts), snapshot = JSON.stringify(s.stories[id]);
    const saved = JSON.parse(FB.save.serialize()); FB.save.restore(saved); s = FB.state;
    return {local,county,version:s.stories[id].version,lengths:keys.map(function (key) { return JSON.parse(key).length; }).sort(),
      retained:snapshot === JSON.stringify(s.stories[id]),phase:s.stories[id].phase};
  })).toEqual({local:true,county:true,version:2,lengths:[7,8],retained:true,phase:'done'});
});

test('retained county-only declarations keep version one and their exact original receipt key', async function ({ page }, info) {
  await imported(page, info, 'hill', 'hill_county_household');
  expect(await page.evaluate(function () {
    let s = FB.state; const id = 'hill_county_control', household = s.stories[id].householdId;
    const before = FB.topRealm(s,s.owner.dune_well);
    s.turn = 3; FB.transferProvince(s,'dune_well','dune_gate');
    FB.stories.get(id).day(s,s.stories[id]);
    const applied = FB.stories.apply(s,id,'record',FB.stories.quote(s,id,'record'));
    const key = Object.keys(s.stories[id].householdReceipts)[0];
    const expected = JSON.stringify([household,'control','rule_changed','dune_well',3,before,'dune_gate']);
    const saved = JSON.parse(FB.save.serialize()); FB.save.restore(saved); s = FB.state;
    return {applied,version:s.stories[id].version,exact:key === expected && !!s.stories[id].householdReceipts[expected],
      generatedDefaults:!('locality' in s.stories[id].decisions.county)};
  })).toEqual({applied:true,version:1,exact:true,generatedDefaults:true});
});

test('malformed local declarations reject detached without changing catalogues, state, messages, RNG or uid', async function ({ page }, info) {
  await openGame(page, info);
  expect(await page.evaluate(function (example) {
    const before = JSON.stringify(FBDATA), state = FB.state, facts = JSON.stringify(state);
    const rng = FB.getRngState(), uid = FB.getUidCounter(), stories = FB.stories.list();
    const rejected = ['unknown_site','foreign_site','slot','travel_id','absent_layout','ambiguous','fill',
      'unknown_field','uncommitted_source','unknown_milestone','nonlocal_source','economic_event','cycle'].map(function (fault) {
      const mod = JSON.parse(JSON.stringify(example)), e = mod.storyInstances.river_local_records.stages.place_0.localEvent;
      if (fault === 'unknown_site') e.siteId = 'missing_site';
      if (fault === 'foreign_site') e.provinceId = 'harbor_ridge';
      if (fault === 'slot') e.siteId = 0;
      if (fault === 'travel_id') e.siteId = 'pilgrim_jerusalem_christian';
      if (fault === 'absent_layout') delete mod.bookmarks.harbor_world.provinces[0].settlements;
      if (fault === 'ambiguous') mod.bookmarks.harbor_world.provinces[1].settlements = [{site:e.siteId,name:'Duplicate',kind:'town'}];
      if (fault === 'fill') mod.bookmarks.harbor_world.provinces[0].settlements[0].fill = true;
      if (fault === 'unknown_field') e.reward = 10;
      if (fault === 'uncommitted_source') mod.storyInstances.river_notice.sourceStoryId = 'harbor_offices';
      if (fault === 'unknown_milestone') mod.storyInstances.river_notice.beats[0].trigger = 'invented';
      if (fault === 'nonlocal_source') delete mod.storyInstances.river_notice.localities;
      if (fault === 'economic_event') mod.storyInstances.river_local_records.stages.place_0.choices[0].operation = {kind:'household_expense',amount:1};
      if (fault === 'cycle') mod.storyInstances.river_local_records.stages.place_1.choices[0].next = 'place_0';
      return FB.mods.validate(mod).length > 0;
    });
    return {rejected,pure:before === JSON.stringify(FBDATA) && state === FB.state && facts === JSON.stringify(state) &&
      rng === FB.getRngState() && uid === FB.getUidCounter() && stories.every(function (v,i) { return FB.stories.list()[i] === v; })};
  }, river)).toEqual({rejected:Array(13).fill(true),pure:true});
});

test('malformed and downgraded local records fail restore before adopting state or RNG', async function ({ page }, info) {
  await imported(page, info, 'river', 'river_personal_household');
  expect(await page.evaluate(function () {
    const s = FB.state, source = 'river_local_records', id = 'river_notice';
    s.turn = 5; FB.stories.apply(s,source,'record',FB.stories.quote(s,source,'record'));
    const pending = JSON.parse(FB.save.serialize()), personal = 'river_personal_response';
    FB.stories.apply(s,personal,'record',FB.stories.quote(s,personal,'record'));
    const finished = JSON.parse(FB.save.serialize()), before = FB.state, facts = JSON.stringify(s), rng = FB.getRngState(), uid = FB.getUidCounter();
    const rejected = ['source_version','observer_version','personal_version','missing_locality','wrong_locality',
      'pending_site','pending_token','future','cursor_scope','unknown','strip_receipt','retarget_receipt','invented_turn'].map(function (fault) {
      const saved = JSON.parse(JSON.stringify(fault.indexOf('receipt') >= 0 || fault === 'invented_turn' ? finished : pending));
      const records = saved.state.stories, item = records[id].pending[0];
      if (fault === 'source_version') records[source].version = 1;
      if (fault === 'observer_version') records[id].version = 1;
      if (fault === 'personal_version') records[personal].version = 1;
      if (fault === 'missing_locality') delete records[source].decisions.place_0.locality;
      if (fault === 'wrong_locality') records[source].decisions.place_0.locality.siteId = 'harbor_river_gate';
      if (fault === 'pending_site') item.event.siteId = 'harbor_river_gate';
      if (fault === 'pending_token') item.sourceToken = JSON.stringify(['reported',true]);
      if (fault === 'future') records[source].decisions.place_0.turn = 6;
      if (fault === 'cursor_scope') records[id].cursors['["report","harbor_quay","missing"]'] = Object.values(records[id].cursors)[0];
      if (fault === 'unknown') records[id].delivered = true;
      if (fault.indexOf('receipt') >= 0 || fault === 'invented_turn') {
        const receipts = records[personal].householdReceipts, key = Object.keys(receipts)[0], parts = JSON.parse(key), row = receipts[key];
        delete receipts[key];
        if (fault === 'strip_receipt') parts.pop();
        if (fault === 'retarget_receipt') parts[7] = 'harbor_river_gate';
        if (fault === 'invented_turn') parts[4] = 4;
        receipts[JSON.stringify(parts)] = row;
      }
      try { FB.save.restore(saved); return false; } catch (err) { return true; }
    });
    return {rejected,pure:before === FB.state && facts === JSON.stringify(FB.state) && rng === FB.getRngState() && uid === FB.getUidCounter()};
  })).toEqual({rejected:Array(13).fill(true),pure:true});
});

test('changed imported locality content rejects its old save fingerprint', async function ({ page }, info) {
  await imported(page, info, 'river');
  expect(await page.evaluate(function () {
    const saved = JSON.parse(FB.save.serialize()), next = JSON.parse(JSON.stringify(FBDATA.storyInstances.river_notice));
    next.expiryTurns = 4; FB.mods.apply({storyInstances:{river_notice:next}});
    const state = FB.state, facts = JSON.stringify(state), rng = FB.getRngState(), uid = FB.getUidCounter();
    let rejected = false; try { FB.save.restore(saved); } catch (err) { rejected = true; }
    return rejected && state === FB.state && facts === JSON.stringify(FB.state) && rng === FB.getRngState() && uid === FB.getUidCounter();
  })).toBe(true);
});

test('local source and response transactions replay identically from a matching save', async function ({ page }, info) {
  await imported(page, info, 'river');
  expect(await page.evaluate(function () {
    const initial = JSON.parse(FB.save.serialize());
    function replay() {
      FB.save.restore(JSON.parse(JSON.stringify(initial))); const s = FB.state;
      s.turn = 5;
      const source = 'river_local_records', id = 'river_notice';
      const first = FB.stories.apply(s,source,'record',FB.stories.quote(s,source,'record'));
      const response = FB.stories.apply(s,id,'records',FB.stories.quote(s,id,'records'));
      return JSON.stringify([first,response,s.stories,FB.getRngState(),FB.getUidCounter()]);
    }
    return replay() === replay();
  })).toBe(true);
});

test('death invalidates local source and notice confirmations and the shared review names the physical residence', async function ({ page }, info) {
  await imported(page, info, 'river');
  expect(await page.evaluate(function () {
    const s = FB.state, source = 'river_local_records', module = FB.stories.get(source), t = s.stories[source];
    const q = FB.stories.quote(s,source,'record'), review = module.review(s,t,'record',q).join(' ');
    s.chars[s.player.charId].dead = true;
    const sourceDead = FB.stories.apply(s,source,'record',q);
    s.chars[s.player.charId].dead = false;
    FB.stories.apply(s,source,'record',FB.stories.quote(s,source,'record'));
    const notice = FB.stories.quote(s,'river_notice','records');
    s.chars[s.player.charId].dead = true;
    const noticeDead = FB.stories.apply(s,'river_notice','records',notice);
    s.chars[s.player.charId].dead = false;
    const wrongSite = FB.stories.quote(s,source,'record');
    return {review:review.indexOf('Quay Hall') >= 0,sourceDead,offered:notice.allowed,noticeDead,
      blocked:!wrongSite.allowed && wrongSite.reason.indexOf('River Gate') >= 0};
  })).toEqual({review:true,sourceDead:false,offered:true,noticeDead:false,blocked:true});
});
