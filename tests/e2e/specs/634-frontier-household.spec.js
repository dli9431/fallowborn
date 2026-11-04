'use strict';
const {test,expect} = require('../support/fixture');
const {openGame,prepareGameContent} = require('../support/game/navigation');
const {beginBookmark,beginBookmarkFromTitle,restoreBookmark} = require('../support/game/bookmark-acceptance');
const {dependsOnRuntime} = require('../support/runtime-dependencies');

dependsOnRuntime(__filename,[
  'index.html','data/starts_634_frontier.js','data/story_households_634_frontier.js',
  'data/bookmark_634.js','data/starts_634_ordinary.js','data/bookmark_634_identities.js',
  'data/bookmark_634_scaffold_a.js','data/bookmark_634_scaffold_b.js',
  'data/bookmark_634_scaffold_c.js','data/bookmark_634_scaffold_d.js',
  'data/bookmark_sources.js','data/story_instances.js','data/settlements.js',
  'data/starts.js','data/actions.js','data/economy.js','data/systems.js','data/traits.js',
  'js/bookmark_composition.js','js/bookmark_sources.js','js/bookmark_setup.js',
  'js/story_household.js','js/story_household_observer.js','js/stories.js','js/starts.js',
  'js/main.js','js/model.js','js/world.js','js/wars.js','js/actions.js','js/economy.js',
  'js/save.js','js/save_v4.js','js/mods.js','js/i18n.js'
]);

const ID = 'frontier_household_track_634';
async function choose(page,choice) {
  return page.evaluate(function (choice) {
    const s = FB.state, id = 'frontier_household_track_634';
    return FB.stories.apply(s,id,choice,FB.stories.quote(s,id,choice));
  },choice);
}
async function connections(page) {
  expect(await choose(page,'work_first')).toBe(true);
  expect(await choose(page,'decline')).toBe(true);
}

test('complete hidden frontier start preserves identity, layout and exclusions', async function ({page},info) {
  await openGame(page,info);
  expect(await page.evaluate(function () {
    const b = FB.bookmark('634');
    if (!b) throw new Error(JSON.stringify(FB.bookmarkRuntimeDiagnostics()));
    const sc = FBDATA.startScenarios.find(function (r) { return r.id === 'frontier_household_634'; });
    const data = JSON.stringify(FBDATA), rng = FB.getRngState(), uid = FB.getUidCounter();
    const errors = FB.validateBookmark(b), p = b.provinces.find(function (p) { return p.id === 'damascus'; });
    const def = FBDATA.storyInstances.frontier_household_track_634;
    return {errors:errors,hidden:b.hidden,available:FB.bookmarkAvailable('634'),
      tracks:FB.startStoryTracks(sc,'damascus'),away:FB.startTracks(sc,'baghdad'),
      home:FB.startProvinceAllowed(sc,b,'damascus'),remote:FB.startProvinceAllowed(sc,b,'baghdad'),
      pair:p.communities.some(function (c) { return c.culture === sc.startCulture && c.religion === sc.startReligion && c.populationShare0 > 0; }),
      family:Object.keys(sc.familyPresets),age:sc.startAge,resources:[sc.tier,sc.profession,sc.gold,sc.prestige,sc.piety],
      site:FBDATA.settlementLayouts[b.settlementLayout].damascus[0],heads:b.religiousHeads,institutions:b.localInstitutions,
      disabled:b.systems,independent:!def.requires && !def.jobs,
      beats:Object.keys(def.stages).filter(function (id) { return id !== 'left' && id !== 'interrupted'; }),
      pure:data === JSON.stringify(FBDATA) && rng === FB.getRngState() && uid === FB.getUidCounter()};
  })).toMatchObject({errors:[],hidden:true,available:false,tracks:[ID],away:[],home:true,remote:false,pair:true,
    family:['established'],age:30,resources:[1,'craftsman',20,5,0],site:{site:'damascus_493',name:'Damascus',kind:'city'},
    heads:{},institutions:{},independent:true,pure:true,
    disabled:{disable:['episcopal_sees','civic_institutions','papacy','excommunication','abbeys',
      'feudal_service','scutage','manorial_tenure','crown_bloc','tournaments','great_holy_wars']},
    beats:['opening','livelihood','earned','connections','pressure','control','outlook','close']});
  await beginBookmarkFromTitle(page,'634','frontier_household_634');
  expect(await page.evaluate(function () {
    const s = FB.state, c = s.chars[s.player.charId];
    return {home:s.player.provinceId,culture:c.culture,faith:c.religion,age:FB.ageOf(c,s.date.year),
      family:FB.householdMembers(s).length > 1,actor:s.stories.frontier_household_track_634.actorId === c.id,
      realm:!!s.realms.player,errors:FBTEST.checkInvariants()};
  })).toEqual({home:'damascus',culture:'arabic',faith:'west_syriac_lay_634',age:30,family:true,actor:true,realm:false,errors:[]});
});

test('declined work and unchanged control conclude at home without payment or conquest', async function ({page},info) {
  await beginBookmark(page,info,'634','frontier_household_634');
  expect(await page.evaluate(function () {
    const s = FB.state, id = 'frontier_household_track_634';
    const before = JSON.stringify([s.player.gold,s.player.prestige,s.player.piety,s.owner,s.chars]);
    const results = ['connections_first','decline','independent','stay'].map(function (c) {
      return FB.stories.apply(s,id,c,FB.stories.quote(s,id,c));
    });
    return {results:results,phase:s.stories[id].phase,turn:s.turn,home:s.player.provinceId,
      controls:s.stories[id].controls,receipts:s.stories[id].householdReceipts,
      same:before === JSON.stringify([s.player.gold,s.player.prestige,s.player.piety,s.owner,s.chars]),
      observers:FB.stories.list().filter(function (row) { return row.declaration && row.declaration.type === 'household_observer' &&
        (row.declaration.provinceIds || []).indexOf('damascus') >= 0 && s.stories[row.id]; }).map(function (row) { return row.id; })};
  })).toMatchObject({results:[true,true,true,true],phase:'close',turn:0,home:'damascus',
    controls:{damascus:{before:null,turn:null}},receipts:{},same:true,observers:[]});
});

test('focus selection, savings and unrelated work pay no story wage; actual craft income alone advances', async function ({page},info) {
  await beginBookmark(page,info,'634','frontier_household_634');
  await choose(page,'work_first');
  expect(await page.evaluate(function () {
    let s = FB.state;
    const id = 'frontier_household_track_634', cash = s.player.gold;
    const q = FB.stories.quote(s,id,'craft'), picked = FB.stories.apply(s,id,'craft',q);
    const pending = s.stories[id].phase === 'earned' && s.player.gold === cash;
    s.player.gold += 10;
    FB.stories.get(id).day(s,s.stories[id]);
    FB.stories.get(id).householdFocusPaid(s,s.stories[id],'work_land');
    const unrelated = s.stories[id].phase;
    FB.save.restore(JSON.parse(FB.save.serialize())); s = FB.state;
    const record = JSON.stringify(s.stories[id]), funds = s.player.gold;
    FB.save.restore(JSON.parse(FB.save.serialize())); s = FB.state;
    const retained = record === JSON.stringify(s.stories[id]) && funds === s.player.gold;
    s.turn++; FB.tickFocus(s);
    const paid = s.player.gold > funds, phase = s.stories[id].phase, after = s.player.gold;
    FB.stories.get(id).day(s,s.stories[id]);
    return {picked:picked,pending:pending,unrelated:unrelated,retained:retained,paid:paid,phase:phase,
      noSecondWage:s.player.gold === after,repeat:FB.stories.apply(s,id,'craft',q)};
  })).toEqual({picked:true,pending:true,unrelated:'earned',retained:true,paid:true,phase:'connections',noSecondWage:true,repeat:false});
});

test('ineligible work retains a free route and pending work can be reconsidered', async function ({page},info) {
  await beginBookmark(page,info,'634','frontier_household_634');
  await choose(page,'work_first');
  expect(await page.evaluate(function () {
    const s = FB.state, id = 'frontier_household_track_634', previous = s.player.profession;
    s.player.profession = 'farmer';
    const q = FB.stories.quote(s,id,'craft'), before = s.player.gold;
    const rejected = FB.stories.apply(s,id,'craft',q);
    const declined = FB.stories.apply(s,id,'decline',FB.stories.quote(s,id,'decline'));
    s.player.profession = previous;
    return {allowed:q.allowed,rejected:rejected,declined:declined,unchanged:before === s.player.gold};
  })).toEqual({allowed:false,rejected:false,declined:true,unchanged:true});
  await choose(page,'independent'); await choose(page,'stay');
  await beginBookmark(page,info,'634','frontier_household_634');
  for (const c of ['work_first','craft','reconsider','independent','stay']) expect(await choose(page,c)).toBe(true);
});

test('local war enables only a costless context review; remote war and peace do not', async function ({page},info) {
  await beginBookmark(page,info,'634','frontier_household_634');
  await connections(page);
  expect(await page.evaluate(function () {
    const s = FB.state, id = 'frontier_household_track_634';
    const local = FB.topRealm(s,s.owner.damascus), others = Object.keys(s.realms).filter(function (r) {
      return r !== local && s.realms[r].alive && FB.topRealm(s,r) === r;
    }).sort();
    s.wars = {};
    const peaceful = FB.stories.quote(s,id,'local_pressure').allowed;
    s.wars = {war_1:{id:'war_1',attacker:others[0],defender:others[1],status:'active',startedTurn:0}};
    const remote = FB.stories.quote(s,id,'local_pressure').allowed;
    s.wars = {war_2:{id:'war_2',attacker:local,defender:others[0],status:'active',startedTurn:0}};
    const before = JSON.stringify([s.player.gold,s.player.prestige,s.player.piety,s.chars,s.owner]);
    const localAllowed = FB.stories.quote(s,id,'local_pressure').allowed;
    const reviewed = FB.stories.apply(s,id,'local_pressure',FB.stories.quote(s,id,'local_pressure'));
    const phase = s.stories[id].phase;
    const continued = FB.stories.apply(s,id,'continue_work',FB.stories.quote(s,id,'continue_work'));
    return {peaceful:peaceful,remote:remote,local:localAllowed,reviewed:reviewed,phase:phase,continued:continued,
      receipts:s.stories[id].householdReceipts,same:before === JSON.stringify([s.player.gold,s.player.prestige,s.player.piety,s.chars,s.owner])};
  })).toEqual({peaceful:false,remote:false,local:true,reviewed:true,phase:'pressure',continued:true,receipts:{},same:true});
});

test('actual local control projects one pure receipt and matching restore never replays it', async function ({page},info) {
  await beginBookmark(page,info,'634','frontier_household_634');
  await connections(page);
  expect(await page.evaluate(function () {
    let s = FB.state;
    const id = 'frontier_household_track_634', old = FB.topRealm(s,s.owner.damascus);
    const next = Object.keys(s.realms).filter(function (r) { return r !== old && s.realms[r].alive && FB.topRealm(s,r) === r; }).sort()[0];
    const baseline = JSON.stringify(s.stories[id].controls);
    const absent = FB.stories.quote(s,id,'changed_control').allowed;
    s.turn = 7; FB.transferProvince(s,'baghdad',next);
    const remote = FB.stories.quote(s,id,'changed_control').allowed;
    FB.transferProvince(s,'damascus',next);
    const before = JSON.stringify(s), data = JSON.stringify(FBDATA), rng = FB.getRngState(), uid = FB.getUidCounter();
    const q = FB.stories.quote(s,id,'changed_control');
    const pure = before === JSON.stringify(s) && data === JSON.stringify(FBDATA) && rng === FB.getRngState() && uid === FB.getUidCounter();
    const projectedBaseline = baseline === JSON.stringify(s.stories[id].controls);
    FB.save.restore(JSON.parse(FB.save.serialize())); s = FB.state;
    const routed = FB.stories.apply(s,id,'changed_control',FB.stories.quote(s,id,'changed_control'));
    const review = FB.stories.quote(s,id,'acknowledge'), key = review.facts.incident;
    const owner = FB.householdStories.owner(s,key), money = s.player.gold;
    const applied = FB.stories.apply(s,id,'acknowledge',review);
    const repeated = FB.stories.apply(s,id,'acknowledge',review);
    const records = JSON.stringify(s.stories[id]);
    FB.save.restore(JSON.parse(FB.save.serialize())); s = FB.state;
    const retained = records === JSON.stringify(s.stories[id]) && money === s.player.gold;
    const receipt = FB.householdStories.receipt(s,key);
    // Exercise the existing already-closed incident boundary without a second transaction.
    s.stories[id].phase = 'control'; FB.stories.get(id).day(s,s.stories[id]);
    return {absent:absent,remote:remote,available:q.allowed,pure:pure,baseline:projectedBaseline,
      routed:routed,owner:owner,applied:applied,repeated:repeated,retained:retained,
      receipt:receipt,keyMatches:key === JSON.stringify([s.stories[id].householdId,'control','rule_changed','damascus',7,old,next]),phase:s.stories[id].phase,
      count:Object.keys(s.stories[id].householdReceipts).length};
  })).toMatchObject({absent:false,remote:false,available:true,pure:true,baseline:true,routed:true,owner:ID,
    applied:true,repeated:false,retained:true,receipt:{owner:ID,status:'resolved',turn:7},keyMatches:true,phase:'outlook',count:1});
});

test('a different sovereign at attachment is quiet and the first season uses campaign time', async function ({page},info) {
  await beginBookmark(page,info,'634','craftsman_634');
  expect(await page.evaluate(function () {
    let s = FB.state;
    const id = 'frontier_household_track_634', old = FB.topRealm(s,s.owner.damascus);
    const next = Object.keys(s.realms).filter(function (r) { return r !== old && s.realms[r].alive && FB.topRealm(s,r) === r; }).sort()[0];
    s.player.provinceId = 'damascus'; s.chars[s.player.charId].homeProvinceId = 'damascus';
    FB.transferProvince(s,'damascus',next);
    FB.stories.start(s,{tracks:[id]}); s.start.storyAttachments.tracks.push(id);
    const control = s.stories[id].controls.damascus;
    s.turn = 89;
    ['work_first','decline','independent'].forEach(function (c) { FB.stories.apply(s,id,c,FB.stories.quote(s,id,c)); });
    const enteredLate = s.stories[id].stageTurn === 89;
    FB.stories.get(id).day(s,s.stories[id]); const early = s.stories[id].phase;
    s.turn = 90; FB.stories.get(id).day(s,s.stories[id]);
    const phase = s.stories[id].phase, records = JSON.stringify(s.stories[id]);
    FB.save.restore(JSON.parse(FB.save.serialize())); s = FB.state;
    return {quiet:control.turn === null && control.before === null && control.after === next,enteredLate:enteredLate,
      early:early,phase:phase,receipts:s.stories[id].householdReceipts,retained:records === JSON.stringify(s.stories[id])};
  })).toEqual({quiet:true,enteredLate:true,early:'outlook',phase:'close',receipts:{},retained:true});
});

test('first-season fallback exits pending work but preserves an available actual change review', async function ({page},info) {
  await beginBookmark(page,info,'634','frontier_household_634');
  await choose(page,'work_first'); await choose(page,'craft');
  expect(await page.evaluate(function () {
    let s = FB.state;
    const id = 'frontier_household_track_634', saved = JSON.parse(FB.save.serialize()), gold = s.player.gold;
    s.turn = 90; FB.stories.get(id).day(s,s.stories[id]); const outlook = s.stories[id].phase;
    FB.stories.get(id).day(s,s.stories[id]); const closed = s.stories[id].phase;
    FB.save.restore(saved); s = FB.state;
    const old = FB.topRealm(s,s.owner.damascus), next = Object.keys(s.realms).filter(function (r) {
      return r !== old && s.realms[r].alive && FB.topRealm(s,r) === r;
    }).sort()[0];
    s.turn = 90; FB.transferProvince(s,'damascus',next); FB.stories.get(id).day(s,s.stories[id]);
    const pending = s.stories[id].phase;
    FB.stories.apply(s,id,'reconsider',FB.stories.quote(s,id,'reconsider'));
    return {outlook:outlook,closed:closed,pending:pending,review:FB.stories.quote(s,id,'changed_control').allowed,gold:s.player.gold === gold};
  })).toEqual({outlook:'outlook',closed:'close',pending:'earned',review:true,gold:true});
});

test('departure, death and succession end only the protagonist plan and hidden restore preserves missing records', async function ({page},info) {
  await beginBookmark(page,info,'634','frontier_household_634');
  const saved = await page.evaluate(function () {
    let s = FB.state;
    const id = 'frontier_household_track_634', opening = JSON.parse(FB.save.serialize());
    const kin = FB.householdMembers(s).map(function (c) { return [c.id,c.homeProvinceId]; });
    const money = s.player.gold, q = FB.stories.quote(s,id,'work_first');
    s.player.provinceId = 'baghdad';
    if (FB.stories.apply(s,id,'work_first',q)) throw new Error('Remote stale choice applied');
    FB.stories.get(id).day(s,s.stories[id]);
    if (s.stories[id].phase !== 'left' || s.player.gold !== money || !kin.every(function (c) { return s.chars[c[0]].homeProvinceId === c[1]; })) throw new Error('Departure changed kin or resources');
    FB.save.restore(opening); s = FB.state;
    s.player.travel = {phase:'outbound'}; FB.stories.get(id).day(s,s.stories[id]);
    if (s.stories[id].phase !== 'left') throw new Error('Journey did not end local plan');
    FB.save.restore(opening); s = FB.state;
    s.player.dead = true; FB.stories.get(id).day(s,s.stories[id]);
    if (s.stories[id].phase !== 'interrupted') throw new Error('Death did not interrupt');
    FB.save.restore(opening); s = FB.state;
    s.player.charId = FB.householdMembers(s).find(function (c) { return c.id !== s.player.charId && !c.dead; }).id;
    FB.stories.get(id).day(s,s.stories[id]);
    if (s.stories[id].phase !== 'interrupted') throw new Error('Successor inherited plan');
    delete opening.state.stories[id];
    delete opening.state.start.storyAttachments; delete opening.storyAttachmentSchema;
    FBDATA.bookmarks['634'].hidden = true;
    return JSON.stringify(opening);
  });
  await restoreBookmark(page,saved);
  expect(await page.evaluate(function () { return {hidden:FB.bookmark('634').hidden,missing:!FB.state.stories.frontier_household_track_634}; })).toEqual({hidden:true,missing:true});
});

test('detached import validation is pure and an ordinary JSON replacement uses the same graph and save contract', async function ({page},info) {
  await openGame(page,info);
  const imported = await page.evaluate(function () {
    const sc = FBDATA.startScenarios.find(function (r) { return r.id === 'frontier_household_634'; });
    const graph = FBDATA.storyInstances.frontier_household_track_634;
    const candidate = JSON.parse(JSON.stringify({name:'Independent craft review',startScenarios:[sc],storyInstances:{frontier_household_track_634:graph}}));
    const before = JSON.stringify(FBDATA), rng = FB.getRngState(), uid = FB.getUidCounter();
    const valid = FB.mods.validate(candidate);
    const missing = JSON.parse(JSON.stringify(candidate)); missing.startScenarios[0].tracks = [];
    const payment = JSON.parse(JSON.stringify(candidate)); payment.storyInstances.frontier_household_track_634.stages.opening.choices[0].operation = {kind:'give_gold',amount:20};
    const bad = [FB.mods.validate(missing).length > 0,FB.mods.validate(payment).length > 0];
    const pure = before === JSON.stringify(FBDATA) && rng === FB.getRngState() && uid === FB.getUidCounter();
    // Independent configuration: a smaller purse and a direct costless home conclusion.
    candidate.startScenarios[0].gold = 7;
    candidate.storyInstances.frontier_household_track_634.stages.opening.choices.push({id:'remain_now',label:'Remain here',detail:'Conclude immediately without payment.',operation:{kind:'record_decision'},next:'close'});
    return {valid:valid,bad:bad,pure:pure,candidate:candidate};
  });
  expect(imported).toMatchObject({valid:[],bad:[true,true],pure:true});
  await page.evaluate(function () { FB.ui.showMods(); });
  await page.locator('#modfile').setInputFiles({name:'independent-craft-review.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(imported.candidate))});
  await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded'}),page.locator('#mod-apply').click()]);
  await prepareGameContent(page);
  await beginBookmarkFromTitle(page,'634','frontier_household_634');
  expect(await choose(page,'remain_now')).toBe(true);
  expect(await page.evaluate(function () {
    const record = JSON.stringify(FB.state.stories.frontier_household_track_634);
    FB.save.restore(JSON.parse(FB.save.serialize()));
    return {gold:FB.state.player.gold,phase:FB.state.stories.frontier_household_track_634.phase,retained:record === JSON.stringify(FB.state.stories.frontier_household_track_634)};
  })).toEqual({gold:7,phase:'close',retained:true});
});
