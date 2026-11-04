'use strict';
const path = require('path');
const {test,expect} = require('../support/fixture');
const {openGame,prepareGameContent} = require('../support/game/navigation');
const {beginBookmarkFromTitle} = require('../support/game/bookmark-acceptance');
const {dependsOnRuntime} = require('../support/runtime-dependencies');
const examples = require('../fixtures/authoring/household-control-predicate.json');
const retainedExamples = require('../fixtures/authoring/household-graphs.json');

dependsOnRuntime(__filename,[
  'index.html','data/bookmarks.js','data/starts.js','js/story_household.js',
  'js/stories.js','js/starts.js','js/mods.js','js/world.js','js/main.js',
  'js/model.js','js/save.js','js/save_v4.js','js/i18n.js'
]);

async function importedStart(page,info,start,fixture) {
  await openGame(page,info);
  let source = examples;
  if (fixture) {
    source = JSON.parse(JSON.stringify(retainedExamples));
    // Keep the existing graph declarations intact and supply explicit resident start identities.
    source.startScenarios.forEach(function (scenario) {
      scenario.startCulture = 'frankish'; scenario.startReligion = 'catholic';
    });
  }
  expect(await page.evaluate(function (source) { return FB.mods.validate(source); },source)).toEqual([]);
  await page.evaluate(function () { FB.ui.showMods(); });
  if (fixture) await page.locator('#modfile').setInputFiles({name:'retained-household-graphs.json',mimeType:'application/json',
    buffer:Buffer.from(JSON.stringify(source))});
  else await page.locator('#modfile').setInputFiles(path.resolve(__dirname,'../fixtures/authoring/household-control-predicate.json'));
  await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded'}),page.locator('#mod-apply').click()]);
  await prepareGameContent(page);
  await beginBookmarkFromTitle(page,'867',start);
}

test('an unchanged imported baseline offers only the unchanged choice and survives restore', async function ({page},info) {
  await importedStart(page,info,'quay_control_example_start');
  expect(await page.evaluate(function () {
    let s = FB.state;
    const id = 'quay_control_example', story = FB.stories.get(id), baseline = FB.topRealm(s,s.owner.paris);
    const initial = JSON.stringify(s.stories[id]), state = JSON.stringify(s), data = JSON.stringify(FBDATA);
    const rng = FB.getRngState(), uid = FB.getUidCounter();
    const changed = FB.stories.quote(s,id,'review_change'), unchanged = FB.stories.quote(s,id,'keep_routine');
    FB.stories.cards(s); FB.stories.choices(s,id);
    const pure = state === JSON.stringify(s) && data === JSON.stringify(FBDATA) && rng === FB.getRngState() && uid === FB.getUidCounter();
    const saved = JSON.parse(FB.save.serialize());
    let initialized = 0;
    const init = story.init;
    story.init = function (state) { initialized++; return init(state); };
    try { FB.save.restore(saved); } finally { story.init = init; }
    s = FB.state;
    const restored = initial === JSON.stringify(s.stories[id]);
    const before = JSON.stringify([s.player.gold,s.player.prestige,s.player.piety,s.owner]);
    const rejected = FB.stories.apply(s,id,'review_change',changed);
    const applied = FB.stories.apply(s,id,'keep_routine',FB.stories.quote(s,id,'keep_routine'));
    return {changed:changed.allowed,unchanged:unchanged.allowed,pure:pure,restored:restored,initialized:initialized,
      rejected:rejected,applied:applied,phase:s.stories[id].phase,version:s.stories[id].version,
      controls:s.stories[id].controls,baseline:baseline,receipts:s.stories[id].householdReceipts,
      unchangedResources:before === JSON.stringify([s.player.gold,s.player.prestige,s.player.piety,s.owner])};
  })).toMatchObject({changed:false,unchanged:true,pure:true,restored:true,initialized:0,rejected:false,applied:true,
    phase:'unchanged',version:1,controls:{paris:{before:null,turn:null}},receipts:{},unchangedResources:true});
  expect(await page.evaluate(function () {
    const s = FB.state;
    return s.stories.quay_control_example.controls.paris.after === FB.topRealm(s,s.owner.paris);
  })).toBe(true);
});

for (const closure of ['resolved','expired']) {
  test('an actual change routes by a pure projection and a ' + closure + ' receipt stays unavailable after restore', async function ({page},info) {
    await importedStart(page,info,'quay_control_example_start');
    const opening = await page.evaluate(function () {
      const s = FB.state, id = 'quay_control_example', t = s.stories[id];
      const old = FB.topRealm(s,s.owner.paris);
      const next = Object.keys(s.realms).filter(function (rid) {
        return rid !== 'player' && rid !== old && s.realms[rid].alive && FB.topRealm(s,rid) === rid;
      }).sort()[0];
      if (!next) throw new Error('The control fixture needs an independent recipient');
      const stale = FB.stories.quote(s,id,'keep_routine');
      s.turn = 7; FB.transferProvince(s,'paris',next);
      const before = JSON.stringify(s), data = JSON.stringify(FBDATA), rng = FB.getRngState(), uid = FB.getUidCounter();
      const q = FB.stories.quote(s,id,'review_change'), unchanged = FB.stories.quote(s,id,'keep_routine');
      // The target stage projects its occurrence even before the saved baseline is updated.
      const target = FB.stories.get(id).quote(s,Object.assign({},t,{phase:'control_review'}),'acknowledge');
      const preferred = FB.householdStories.owner(s,target.facts.incident);
      const pure = before === JSON.stringify(s) && data === JSON.stringify(FBDATA) && rng === FB.getRngState() && uid === FB.getUidCounter();
      const saved = JSON.parse(FB.save.serialize());
      FB.save.restore(saved);
      const restored = FB.state, retained = JSON.stringify(t) === JSON.stringify(restored.stories[id]);
      const beforeRoute = JSON.stringify([restored.player.gold,restored.player.prestige,restored.player.piety,restored.owner]);
      const rejected = FB.stories.apply(restored,id,'keep_routine',stale);
      const routed = FB.stories.apply(restored,id,'review_change',FB.stories.quote(restored,id,'review_change'));
      const projected = FB.stories.quote(restored,id,'acknowledge');
      FB.stories.get(id).day(restored,restored.stories[id]);
      const observed = FB.stories.quote(restored,id,'acknowledge');
      return {changed:q.allowed,unchanged:unchanged.allowed,pure:pure,retained:retained,rejected:rejected,routed:routed,
        preferred:preferred,phase:restored.stories[id].phase,control:restored.stories[id].controls.paris,
        old:old,next:next,key:JSON.parse(projected.facts.incident),sameOccurrence:projected.facts.incident === observed.facts.incident,
        receipts:restored.stories[id].householdReceipts,
        resources:beforeRoute === JSON.stringify([restored.player.gold,restored.player.prestige,restored.player.piety,restored.owner])};
    });
    expect(opening).toMatchObject({changed:true,unchanged:false,pure:true,retained:true,rejected:false,routed:true,
      preferred:'quay_control_example',phase:'control_review',sameOccurrence:true,receipts:{},resources:true});
    expect(opening.control).toEqual({before:opening.old,after:opening.next,turn:7});
    expect(opening.key.slice(1)).toEqual(['control','rule_changed','paris',7,opening.old,opening.next]);

    expect(await page.evaluate(function (closure) {
      let s = FB.state;
      const id = 'quay_control_example', key = FB.stories.quote(s,id,'acknowledge').facts.incident;
      const before = JSON.stringify([s.player.gold,s.player.prestige,s.player.piety,s.owner]);
      let applied = null;
      if (closure === 'resolved') applied = FB.stories.apply(s,id,'acknowledge',FB.stories.quote(s,id,'acknowledge'));
      else { s.turn += 3; FB.stories.get(id).day(s,s.stories[id]); }
      const record = JSON.stringify(s.stories[id]);
      FB.save.restore(JSON.parse(FB.save.serialize())); s = FB.state;
      const state = JSON.stringify(s), rng = FB.getRngState(), uid = FB.getUidCounter();
      const changed = FB.stories.quote(s,id,'review_again'), unchanged = FB.stories.quote(s,id,'resume');
      return {applied:applied,phase:s.stories[id].phase,receipt:FB.householdStories.receipt(s,key),
        retained:record === JSON.stringify(s.stories[id]),changed:changed.allowed,unchanged:unchanged.allowed,
        pure:state === JSON.stringify(s) && rng === FB.getRngState() && uid === FB.getUidCounter(),
        resources:before === JSON.stringify([s.player.gold,s.player.prestige,s.player.piety,s.owner])};
    },closure)).toMatchObject({applied:closure === 'resolved' ? true : null,phase:'aftermath',
      receipt:{owner:'quay_control_example',status:closure,turn:closure === 'resolved' ? 7 : 10},
      retained:true,changed:false,unchanged:true,pure:true,resources:true});
  });
}

test('the independent automatic graph takes both control and unchanged routes from fresh baselines', async function ({page},info) {
  await importedStart(page,info,'hill_control_example_start');
  expect(await page.evaluate(function () {
    let s = FB.state;
    const id = 'hill_control_example', initial = JSON.parse(FB.save.serialize());
    FB.stories.get(id).day(s,s.stories[id]);
    const unchanged = s.stories[id].phase;
    FB.save.restore(initial); s = FB.state;
    const old = FB.topRealm(s,s.owner.aachen);
    const next = Object.keys(s.realms).filter(function (rid) {
      return rid !== 'player' && rid !== old && s.realms[rid].alive && FB.topRealm(s,rid) === rid;
    }).sort()[0];
    if (!next) throw new Error('The automatic fixture needs an independent recipient');
    s.turn = 4; FB.transferProvince(s,'aachen',next);
    FB.stories.get(id).day(s,s.stories[id]);
    const phase = s.stories[id].phase, q = FB.stories.quote(s,id,'remain');
    const applied = FB.stories.apply(s,id,'remain',q);
    const record = JSON.stringify(s.stories[id]);
    FB.save.restore(JSON.parse(FB.save.serialize())); s = FB.state;
    return {unchanged:unchanged,phase:phase,allowed:q.allowed,applied:applied,finished:s.stories[id].phase,
      retained:record === JSON.stringify(s.stories[id]),receipt:FB.householdStories.receipt(s,q.facts.incident).status};
  })).toEqual({unchanged:'routine',phase:'control_review',allowed:true,applied:true,finished:'remained',retained:true,receipt:'resolved'});
});

test('a different sovereign at fresh attachment is the baseline rather than an invented incident', async function ({page},info) {
  await importedStart(page,info,'farmer');
  expect(await page.evaluate(function () {
    let s = FB.state;
    const id = 'quay_control_example', old = FB.topRealm(s,s.owner.paris);
    const next = Object.keys(s.realms).filter(function (rid) {
      return rid !== 'player' && rid !== old && s.realms[rid].alive && FB.topRealm(s,rid) === rid;
    }).sort()[0];
    if (!next) throw new Error('The fresh attachment fixture needs an independent sovereign');
    // Stage a fresh household attachment after a different local-control assignment.
    s.player.provinceId = 'paris'; s.chars[s.player.charId].homeProvinceId = 'paris';
    FB.transferProvince(s,'paris',next);
    const attached = FB.stories.start(s,{tracks:[id]});
    s.start.storyAttachments.tracks.push(id);
    const controls = JSON.stringify(s.stories[id].controls);
    const before = FB.stories.quote(s,id,'review_change').allowed;
    const alternative = FB.stories.quote(s,id,'keep_routine').allowed;
    FB.save.restore(JSON.parse(FB.save.serialize())); s = FB.state;
    const retained = controls === JSON.stringify(s.stories[id].controls);
    const afterRestore = FB.stories.quote(s,id,'review_change').allowed;
    s.turn = 8; FB.transferProvince(s,'paris',old);
    const actualChange = FB.stories.quote(s,id,'review_change').allowed;
    const unmodified = controls === JSON.stringify(s.stories[id].controls);
    FB.stories.get(id).day(s,s.stories[id]);
    return {attached:attached,before:before,alternative:alternative,retained:retained,afterRestore:afterRestore,
      actualChange:actualChange,unmodified:unmodified,baseline:JSON.parse(controls),observed:s.stories[id].controls,old:old,next:next};
  })).toMatchObject({attached:['quay_control_example'],before:false,alternative:true,retained:true,afterRestore:false,
    actualChange:true,unmodified:true,baseline:{paris:{before:null,turn:null}},observed:{paris:{turn:8}}});
  expect(await page.evaluate(function () {
    const c = FB.state.stories.quay_control_example.controls.paris;
    return c.before !== c.after && c.after === FB.topRealm(FB.state,FB.state.owner.paris);
  })).toBe(true);
});

test('malformed control predicates reject detached candidates without publication or state consumption', async function ({page},info) {
  await openGame(page,info);
  expect(await page.evaluate(function (examples) {
    const data = JSON.stringify(FBDATA), rng = FB.getRngState(), uid = FB.getUidCounter(), list = FB.stories.list();
    const storage = localStorage.getItem('fb_mods'), messages = JSON.stringify(FB.englishMessages()), state = FB.state;
    const valid = FB.mods.validate(examples);
    const errors = ['missing','unknown','inherited','wrong_type','no_incident','wrong_source','wrong_milestone','extra'].map(function (fault) {
      const m = JSON.parse(JSON.stringify(examples)), d = m.storyInstances.quay_control_example;
      const p = d.stages.review.choices[0].when;
      if (fault === 'missing') delete p.stageId;
      if (fault === 'unknown') p.stageId = 'missing_stage';
      if (fault === 'inherited') p.stageId = 'constructor';
      if (fault === 'wrong_type') p.stageId = 4;
      if (fault === 'no_incident') p.stageId = 'unchanged';
      if (fault === 'wrong_source') d.stages.control_review.incident.source = 'story';
      if (fault === 'wrong_milestone') d.stages.control_review.incident.milestone = 'won';
      if (fault === 'extra') p.realmId = 'west_francia';
      return {fault:fault,rejected:FB.mods.validate(m).some(function (e) { return e.indexOf('control change predicate') >= 0; })};
    });
    return {valid:valid,errors:errors,pure:data === JSON.stringify(FBDATA) && rng === FB.getRngState() && uid === FB.getUidCounter() &&
      state === FB.state && storage === localStorage.getItem('fb_mods') && messages === JSON.stringify(FB.englishMessages()) &&
      list.length === FB.stories.list().length && list.every(function (story,i) { return story === FB.stories.list()[i]; })};
  },examples)).toEqual({valid:[],errors:['missing','unknown','inherited','wrong_type','no_incident','wrong_source','wrong_milestone','extra'].map(function (fault) {
    return {fault:fault,rejected:true};
  }),pure:true});
});

test('an existing graph keeps its controls, receipt routes and missing-record restore semantics', async function ({page},info) {
  await importedStart(page,info,'hill_household_example_start','household-graphs.json');
  expect(await page.evaluate(function () {
    let s = FB.state;
    const id = 'hill_household_example', opening = JSON.parse(FB.save.serialize());
    const unavailable = FB.stories.quote(s,id,'remain').allowed;
    const old = FB.topRealm(s,s.owner.aachen);
    const next = Object.keys(s.realms).filter(function (rid) {
      return rid !== 'player' && rid !== old && s.realms[rid].alive && FB.topRealm(s,rid) === rid;
    }).sort()[0];
    if (!next) throw new Error('The retained graph needs an independent recipient');
    s.turn = 6; FB.transferProvince(s,'aachen',next);
    const q = FB.stories.quote(s,id,'remain');
    const applied = FB.stories.apply(s,id,'remain',q), record = JSON.stringify(s.stories[id]);
    FB.save.restore(JSON.parse(FB.save.serialize())); s = FB.state;
    const retained = record === JSON.stringify(s.stories[id]);
    // Stage an already closed occurrence at its incident boundary.
    s.stories[id].phase = 'wait';
    FB.stories.get(id).day(s,s.stories[id]);
    const afterIncident = s.stories[id].phase;
    delete opening.state.stories[id];
    opening.state.start.storyAttachments.tracks = opening.state.start.storyAttachments.tracks.filter(function (track) { return track !== id; });
    FB.save.restore(opening);
    return {unavailable:unavailable,applied:applied,retained:retained,afterIncident:afterIncident,
      missing:!FB.state.stories[id],repeated:FB.stories.apply(s,id,'remain',q)};
  })).toEqual({unavailable:false,applied:true,retained:true,afterIncident:'expired',missing:true,repeated:false});
});
