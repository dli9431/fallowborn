'use strict';
const path = require('path');
const { test, expect } = require('../support/fixture');
const { openGame, prepareGameContent } = require('../support/game/navigation');
const { beginBookmarkFromTitle } = require('../support/game/bookmark-acceptance');
const { dependsOnRuntime } = require('../support/runtime-dependencies');
const example = require('../fixtures/authoring/household-observer-local-control.json');

dependsOnRuntime(__filename, ['index.html','js/story_household_observer.js','js/story_household.js',
  'js/stories.js','js/story_campaign.js','js/world.js','js/starts.js','js/mods.js',
  'js/save.js','js/save_v4.js','js/main.js','data/technology.js']);

async function imported(page, info, scenario, fixture) {
  await openGame(page, info);
  await page.evaluate(function () { FB.ui.showMods(); });
  await page.locator('#modfile').setInputFiles(path.resolve(__dirname,
    '../fixtures/authoring/' + (fixture || 'household-observer-local-control.json')));
  await Promise.all([page.waitForNavigation({ waitUntil:'domcontentloaded' }), page.locator('#mod-apply').click()]);
  await prepareGameContent(page);
  await page.waitForFunction(function () { return window.FB && FB.game && FB.game.bootReady; });
  await beginBookmarkFromTitle(page, 'dune_world', scenario || 'dune_household');
}

test('ordinary JSON sources seed unchanged baselines without a campaign or an opening notice', async function ({ page }, info) {
  await imported(page, info);
  expect(await page.evaluate(function () {
    const s = FB.state, id = 'well_control_notice', module = FB.stories.get(id), t = s.stories[id];
    const initial = JSON.stringify(t), saved = JSON.parse(FB.save.serialize());
    const baseline = t.controls.dune_well;
    s.turn = 4; module.day(s,t); module.season(s,t); module.year(s,t);
    const unchanged = initial === JSON.stringify(t);
    // A new person in the same sovereign court is not a change of sovereignty.
    s.realms.dune_oasis.ruler.generation++;
    s.realms.dune_oasis.succession.rulerGeneration++;
    module.day(s,t);
    FB.save.restore(saved);
    return {source:module.declaration.source,requires:module.requires || [],
      campaigns:FB.stories.attached(FB.state).filter(function (storyId) { return FB.stories.get(storyId).declaration.type === 'campaign'; }).length,
      baseline:baseline,unchanged:unchanged,cursors:Object.keys(t.cursors).length,
      visible:module.status(s,t),restored:JSON.stringify(FB.state.stories[id]) === initial};
  })).toEqual({source:{type:'local_control'},requires:[],campaigns:0,
    baseline:{before:null,after:'dune_oasis',turn:null},unchanged:true,cursors:0,visible:null,restored:true});
});

test('an ordinary transfer creates one shared control receipt and costless aliases cannot replay it', async function ({ page }, info) {
  await imported(page, info);
  expect(await page.evaluate(function () {
    const s = FB.state, id = 'well_control_notice', alias = 'well_control_alias', t = s.stories[id];
    s.turn = 5; FB.transferProvince(s,'dune_well','dune_gate');
    const before = JSON.stringify(s), rng = FB.getRngState(), uid = FB.getUidCounter();
    FB.stories.day(s);
    const item = t.pending[0], q = FB.stories.quote(s,id,'records');
    const read = JSON.stringify(s);
    FB.stories.cards(s); FB.stories.quote(s,id,'records'); FB.stories.choices(s,id);
    FB.stories.get(id).review(s,t,'records',q);
    const pure = read === JSON.stringify(s) && rng === FB.getRngState() && uid === FB.getUidCounter();
    const same = s.stories[alias].pending[0].key === item.key;
    const applied = FB.stories.apply(s,id,'records',q);
    const repeat = FB.stories.apply(s,alias,'records',FB.stories.quote(s,alias,'records'));
    FB.stories.day(s); FB.stories.season(s); FB.stories.year(s);
    const after = JSON.parse(before), now = JSON.parse(JSON.stringify(s));
    delete after.stories; delete now.stories;
    return {event:item.event,key:item.key === JSON.stringify([t.householdId,'control','rule_changed','dune_well',5,'dune_oasis','dune_gate']),
      expiry:item.expiresTurn,same:same,pure:pure,applied:applied,repeat:repeat,
      receipts:Object.keys(t.householdReceipts).length,aliasReceipts:Object.keys(s.stories[alias].householdReceipts).length,
      visible:FB.stories.status(s,id),unchanged:JSON.stringify(after) === JSON.stringify(now)};
  })).toEqual({event:{source:'control',milestone:'rule_changed',provinceId:'dune_well',turn:5,before:'dune_oasis',after:'dune_gate'},
    key:true,expiry:35,same:true,pure:true,applied:true,repeat:false,receipts:1,aliasReceipts:0,visible:null,unchanged:true});
});

test('multiple counties retain separate cursors and a remote change cannot be collected later', async function ({ page }, info) {
  await imported(page, info);
  expect(await page.evaluate(function () {
    const s = FB.state, id = 'well_control_notice', module = FB.stories.get(id), t = s.stories[id];
    s.turn = 6; FB.transferProvince(s,'dune_flats','dune_gate'); FB.transferProvince(s,'dune_well','dune_gate');
    module.day(s,t);
    const places = t.pending.map(function (item) { return item.provinceId; });
    const count = Object.keys(t.cursors).length;
    FB.stories.apply(s,id,'records',FB.stories.quote(s,id,'records'));
    s.player.provinceId = 'dune_flats'; module.day(s,t); module.day(s,t);
    const saved = JSON.parse(FB.save.serialize()); FB.save.restore(saved);
    return {places:places,count:count,visible:FB.stories.status(FB.state,id),
      controls:Object.keys(FB.state.stories[id].controls).length,cursors:Object.keys(FB.state.stories[id].cursors).length};
  })).toEqual({places:['dune_well'],count:2,visible:null,controls:2,cursors:2});
});

test('the independent pass configuration uses its own scope, continuation choice and short expiry', async function ({ page }, info) {
  await imported(page, info, 'pass_control_household');
  expect(await page.evaluate(function () {
    const s = FB.state, id = 'pass_control_notice', module = FB.stories.get(id), t = s.stories[id];
    s.turn = 3; FB.transferProvince(s,'dune_pass','dune_oasis'); module.day(s,t);
    const q = FB.stories.quote(s,id,'records'), expires = t.pending[0].expiresTurn;
    s.turn = 7; module.day(s,t);
    return {offered:q.allowed,operation:module.declaration.beats[0].choices[0].operation,expires:expires,
      other:FB.stories.status(s,'well_control_notice'),visible:FB.stories.status(s,id),
      stale:FB.stories.apply(s,id,'records',q),closure:Object.values(t.householdReceipts)[0].status};
  })).toEqual({offered:true,operation:'continue_livelihood',expires:6,other:null,visible:null,stale:false,closure:'expired'});
});

test('presence, controller generation and a later sovereign change invalidate reviews', async function ({ page }, info) {
  await imported(page, info);
  expect(await page.evaluate(function () {
    const s = FB.state, id = 'well_control_notice', module = FB.stories.get(id), t = s.stories[id];
    s.turn = 5; FB.transferProvince(s,'dune_well','dune_gate'); module.day(s,t);
    const q = FB.stories.quote(s,id,'records');
    s.player.travel = {currentId:'dune_flats'};
    const absent = FB.stories.apply(s,id,'records',q); s.player.travel = null;
    s.realms.dune_gate.ruler.generation++; s.realms.dune_gate.succession.rulerGeneration++;
    const generation = FB.stories.apply(s,id,'records',q);
    module.day(s,t);
    const noNewOccurrence = t.pending.length === 0;
    s.turn = 8; FB.transferProvince(s,'dune_well','dune_oasis');
    const stale = FB.stories.apply(s,id,'records',q); module.day(s,t);
    const current = t.pending[0].event;
    return {absent:absent,generation:generation,noNewOccurrence:noNewOccurrence,stale:stale,current:current,
      fresh:FB.stories.apply(s,id,'records',FB.stories.quote(s,id,'records'))};
  })).toEqual({absent:false,generation:false,noNewOccurrence:true,stale:false,
    current:{source:'control',milestone:'rule_changed',provinceId:'dune_well',turn:8,before:'dune_gate',after:'dune_oasis'},fresh:true});
});

test('a personal control incident owns the ordinary occurrence before its own day hook', async function ({ page }, info) {
  await imported(page, info, 'personal_control_household');
  expect(await page.evaluate(function () {
    const s = FB.state, id = 'well_control_notice', personal = 'personal_control_track', t = s.stories[id];
    s.turn = 5; FB.transferProvince(s,'dune_well','dune_gate'); FB.stories.get(id).day(s,t);
    const key = t.pending[0].key, preferred = FB.householdStories.owner(s,key);
    const hidden = FB.stories.status(s,id), baseline = s.stories[personal].controls.dune_well.turn;
    const applied = FB.stories.apply(s,personal,'record',FB.stories.quote(s,personal,'record'));
    FB.stories.get(id).day(s,t);
    return {preferred:preferred,hidden:hidden,baseline:baseline,applied:applied,
      owner:FB.householdStories.receipt(s,key).owner,receipts:Object.keys(t.householdReceipts).length,visible:FB.stories.status(s,id)};
  })).toEqual({preferred:'personal_control_track',hidden:null,baseline:null,applied:true,
    owner:'personal_control_track',receipts:0,visible:null});
});

test('restore retains unobserved baselines, pending and closed notices without replay or missing-record initialization', async function ({ page }, info) {
  await imported(page, info);
  expect(await page.evaluate(function () {
    let s = FB.state; const id = 'well_control_notice', module = FB.stories.get(id);
    s.turn = 5; FB.transferProvince(s,'dune_well','dune_gate');
    const baseline = JSON.stringify(s.stories[id]), unobserved = JSON.parse(FB.save.serialize());
    FB.save.restore(unobserved); s = FB.state;
    const quiet = baseline === JSON.stringify(s.stories[id]) && FB.stories.status(s,id) === null;
    module.day(s,s.stories[id]);
    const pending = JSON.stringify(s.stories[id]), saved = JSON.parse(FB.save.serialize());
    FB.save.restore(saved); s = FB.state;
    const retained = pending === JSON.stringify(s.stories[id]);
    const applied = FB.stories.apply(s,id,'records',FB.stories.quote(s,id,'records'));
    const finished = JSON.parse(FB.save.serialize()), closed = JSON.stringify(s.stories[id]);
    FB.save.restore(finished); s = FB.state; module.day(s,s.stories[id]);
    const noReplay = closed === JSON.stringify(s.stories[id]) && FB.stories.status(s,id) === null;
    delete finished.state.stories[id];
    finished.state.start.storyAttachments.world = finished.state.start.storyAttachments.world.filter(function (v) { return v !== id; });
    FB.save.restore(finished); FB.stories.day(FB.state);
    return {quiet:quiet,retained:retained,applied:applied,noReplay:noReplay,missing:!FB.state.stories[id]};
  })).toEqual({quiet:true,retained:true,applied:true,noReplay:true,missing:true});
});

test('malformed ordinary sources reject validation and import without publishing or consuming identities', async function ({ page }, info) {
  await openGame(page, info);
  expect(await page.evaluate(function (example) {
    const before = JSON.stringify(FBDATA), state = FB.state, facts = JSON.stringify(state);
    const rng = FB.getRngState(), uid = FB.getUidCounter(), stories = FB.stories.list();
    const valid = FB.mods.validate(example).length === 0;
    const rejected = ['null','string','unknown_type','unknown_field','missing_type','mixed','missing_source','localities',
      'trigger','previous','service','place'].map(function (fault) {
      const mod = JSON.parse(JSON.stringify(example)), d = mod.storyInstances.well_control_notice;
      if (fault === 'null') d.source = null;
      if (fault === 'string') d.source = 'local_control';
      if (fault === 'unknown_type') d.source.type = 'arbitrary_state';
      if (fault === 'unknown_field') d.source.field = 'player.gold';
      if (fault === 'missing_type') d.source = {};
      if (fault === 'mixed') d.sourceStoryId = 'ordinary_household_track';
      if (fault === 'missing_source') delete d.source;
      if (fault === 'localities') d.localities = [{provinceId:'dune_well',siteId:'dune_meeting_hall'}];
      if (fault === 'trigger') d.beats[0].trigger = 'won';
      if (fault === 'previous') d.beats[0].reach = 'previous';
      if (fault === 'service') d.beats[0].reach = 'service';
      if (fault === 'place') d.provinceIds.push('missing_county');
      const copy = JSON.stringify(mod), errors = FB.mods.validate(mod);
      let refused = false; try { FB.mods.apply(mod); } catch (err) { refused = true; }
      return errors.length > 0 && refused && copy === JSON.stringify(mod);
    });
    return {valid:valid,rejected:rejected,pure:before === JSON.stringify(FBDATA) && state === FB.state && facts === JSON.stringify(state) &&
      rng === FB.getRngState() && uid === FB.getUidCounter() && stories.length === FB.stories.list().length &&
      stories.every(function (story,i) { return FB.stories.list()[i] === story; })};
  }, example)).toEqual({valid:true,rejected:Array(12).fill(true),pure:true});
});

test('malformed control baselines, cursors, pending facts and closures reject before save adoption', async function ({ page }, info) {
  await imported(page, info);
  expect(await page.evaluate(function () {
    const s = FB.state, id = 'well_control_notice';
    s.turn = 5; FB.transferProvince(s,'dune_well','dune_gate'); FB.stories.get(id).day(s,s.stories[id]);
    const pending = JSON.parse(FB.save.serialize());
    FB.stories.apply(s,id,'records',FB.stories.quote(s,id,'records'));
    const finished = JSON.parse(FB.save.serialize()), before = JSON.stringify(s), rng = FB.getRngState(), uid = FB.getUidCounter();
    const rejected = ['missing_baseline','future_baseline','unchanged_transition','baseline_cursor','missing_cursor','cursor_scope',
      'cursor_turn','cursor_token','source','milestone','county','token','occurrence','control','version','unknown',
      'receipt_source','receipt_county','receipt_unchanged','receipt_future','receipt_site'].map(function (fault) {
      const saved = JSON.parse(JSON.stringify(fault.indexOf('receipt_') === 0 ? finished : pending));
      const t = saved.state.stories[id], item = t.pending[0], address = '["changed","dune_well"]';
      if (fault === 'missing_baseline') delete t.controls.dune_well;
      if (fault === 'future_baseline') t.controls.dune_well.turn = 6;
      if (fault === 'unchanged_transition') t.controls.dune_well.before = 'dune_gate';
      if (fault === 'baseline_cursor') t.controls.dune_well.turn = null;
      if (fault === 'missing_cursor') delete t.cursors[address];
      if (fault === 'cursor_scope') t.cursors['["changed","dune_pass"]'] = t.cursors[address];
      if (fault === 'cursor_turn') t.cursors[address].turn = 4;
      if (fault === 'cursor_token') t.cursors[address].token = '["rule_changed",true]';
      if (fault === 'source') item.event.source = 'ordinary_household_track';
      if (fault === 'milestone') item.event.milestone = 'won';
      if (fault === 'county') item.event.provinceId = 'dune_pass';
      if (fault === 'token') item.sourceToken = '["rule_changed",true]';
      if (fault === 'occurrence') item.event.turn = 4;
      if (fault === 'control') item.control[2] = 'dune_oasis';
      if (fault === 'version') t.version = 2;
      if (fault === 'unknown') t.sourceState = {};
      if (fault.indexOf('receipt_') === 0) {
        const key = Object.keys(t.householdReceipts)[0], parts = JSON.parse(key), closure = t.householdReceipts[key];
        delete t.householdReceipts[key];
        if (fault === 'receipt_source') parts[1] = id;
        if (fault === 'receipt_county') parts[3] = 'dune_pass';
        if (fault === 'receipt_unchanged') parts[5] = parts[6];
        if (fault === 'receipt_future') parts[4] = 6;
        if (fault === 'receipt_site') parts.push('dune_meeting_hall');
        t.householdReceipts[JSON.stringify(parts)] = closure;
      }
      const input = JSON.stringify(saved);
      try { FB.save.restore(saved); return false; }
      catch (err) { return /Invalid household observer record/.test(err.message) && input === JSON.stringify(saved) &&
        FB.state === s && before === JSON.stringify(s) && rng === FB.getRngState() && uid === FB.getUidCounter(); }
    });
    return rejected;
  })).toEqual(Array(21).fill(true));
});

test('existing campaign observers keep version-one records, victory aliases and matching restore', async function ({ page }, info) {
  await imported(page, info, 'dune_household', 'household-observers.json');
  expect(await page.evaluate(function () {
    let s = FB.state; const id = 'well_household_notice', module = FB.stories.get(id), t = s.stories[id];
    const opening = FB.stories.status(s,id);
    s.player.provinceId = 'dune_flats'; s.turn = 10; FB.transferProvince(s,'dune_flats','dune_gate');
    Object.assign(s.stories.dune_border_review,{phase:'resolved',result:'won',outcomeTurn:10});
    module.day(s,t);
    const item = t.pending[0], record = JSON.stringify(t), saved = JSON.parse(FB.save.serialize());
    FB.save.restore(saved); s = FB.state;
    const retained = record === JSON.stringify(s.stories[id]);
    const applied = FB.stories.apply(s,id,'records',FB.stories.quote(s,id,'records'));
    const closed = JSON.parse(FB.save.serialize()); FB.save.restore(closed); s = FB.state; module.day(s,s.stories[id]);
    return {opening:opening,version:t.version,sourceStoryId:module.declaration.sourceStoryId,
      source:item.event.source,keyLength:JSON.parse(item.key).length,retained:retained,applied:applied,visible:FB.stories.status(s,id)};
  })).toEqual({opening:null,version:1,sourceStoryId:'dune_border_review',source:'control',keyLength:7,retained:true,applied:true,visible:null});
});

test('existing exact-site sources retain version-two facts, expiry and matching restore', async function ({ page }, info) {
  await imported(page, info, 'dune_household', 'household-locality-hill.json');
  expect(await page.evaluate(function () {
    let s = FB.state; const id = 'hill_notice', source = 'hill_local_records';
    s.player.homeSettlement = 0; s.turn = 4;
    const committed = FB.stories.apply(s,source,'record',FB.stories.quote(s,source,'record'));
    const item = s.stories[id].pending[0], record = JSON.stringify(s.stories[id]), saved = JSON.parse(FB.save.serialize());
    FB.save.restore(saved); s = FB.state;
    const retained = record === JSON.stringify(s.stories[id]);
    const applied = FB.stories.apply(s,id,'records',FB.stories.quote(s,id,'records'));
    return {committed:committed,version:s.stories[id].version,source:item.event.source,site:item.event.siteId,
      keyLength:JSON.parse(item.key).length,expiry:item.expiresTurn,retained:retained,applied:applied};
  })).toEqual({committed:true,version:2,source:'hill_local_records',site:'dune_meeting_hall',keyLength:8,
    expiry:6,retained:true,applied:true});
});
