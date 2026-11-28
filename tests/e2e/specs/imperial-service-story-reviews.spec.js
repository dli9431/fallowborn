'use strict';
const path = require('path');
const {test,expect} = require('../support/fixture');
const {openGame,openTitle,prepareGameContent} = require('../support/game/navigation');
const {startHistoricalGame} = require('../support/game/historical-start');
const {beginBookmarkFromTitle} = require('../support/game/bookmark-acceptance');
const {expectModAdmission} = require('../support/game/mod-admission');
const {dependsOnRuntime} = require('../support/runtime-dependencies');
const imported = require('../fixtures/authoring/imperial-service-story-reviews-lantern.json');
dependsOnRuntime(__filename,[
  'data/story_imperial_service.js','data/events_imperial_service.js','data/bookmark_manifest.js',
  'data/office_mandates.js','data/starts_imperial_officer.js','data/story_instances.js','data/starts.js',
  'data/bookmark_476_dalmatia_east.js','data/bookmark_493.js','data/travel.js','data/technology.js','data/units.js',
  'js/story_household.js','js/story_ruler_agenda.js','js/story_opening_goals.js','js/office_mandates.js',
  'js/authority.js','js/government_administration.js','js/government_recognition.js','js/armies.js',
  'js/government_aristocracy.js','js/governments.js','js/systems.js','js/model.js','js/politics.js',
  'js/home_authority.js','js/government_support.js','js/government_selection.js','js/government_continuity.js',
  'js/federates.js','js/world.js','js/bookmark_setup.js','data/political_institutions.js',
  'js/treasury.js','js/travel.js','js/stories.js','js/story_track.js','js/schema.js','js/events.js',
  'js/mods.js','js/starts.js','js/save.js','js/save_v4.js','js/bookmark_sources.js','js/main.js',
  'js/ui_modals.js','js/ui_misc.js'
]);
test.describe.configure({mode:'parallel'});

async function importStories(page,info) {
  await openGame(page,info);
  await page.evaluate(function () {FB.ui.showMods();});
  await expectModAdmission(page,imported);
  await page.locator('#modfile').setInputFiles(path.resolve(__dirname,'../fixtures/authoring/imperial-service-story-reviews-lantern.json'));
  await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded'}),page.locator('#mod-apply').click()]);
  await prepareGameContent(page);
}
async function start(page,info,kind) {
  if (kind === 'json') {
    await importStories(page,info);
    await beginBookmarkFromTitle(page,'mandate_coast','mandate_household');
  } else await startHistoricalGame(page,info,{bookmark:kind,code:kind === '476' ?
    'SERVICE-476-court_service_household_476-split-m-Officer' : 'SERVICE-493-farmer_493-constantinople-m-Officer'});
  await page.evaluate(function (kind) {
    const s = FB.state;
    window.serviceCase = kind === 'json' ? {rid:'lantern_court',office:'lantern_marshal',story:'lantern_service_story',
      agenda:'lantern_commander_story',profile:'lantern_service_goals',petition:'lantern_petition',command:'lantern_command',loss:'lantern_accept_loss',fee:4} :
      kind === '476' ? {rid:'croatia',office:'court_service_command',story:'salona_service_household',agenda:'imperial_service_commander',
        profile:'opening_imperial_service',petition:'service_petition',command:'service_scope',loss:'service_loss',fee:15} :
        {rid:'east_493',office:'court_service_command',story:'eastern_service_household_493',agenda:'imperial_service_commander_493',
          profile:'opening_imperial_service_493',petition:'eastern_service_petition',command:'eastern_service_scope',loss:'eastern_service_loss',fee:15};
    const a = serviceCase, pid = s.realms[a.rid].capital;
    s.player.gold = 100;s.player.prestige = 100;s.chars[s.player.charId].skills.mar = 20;
    FB.setRealmRulerStanding(s,a.rid,25);
    // Stage a finite standing force through the existing host record contract.
    const h = {id:'service-proof-host',realm:a.rid,at:pid,from:pid,men:80,size:80,
      units:{levy:72,ret:8},supply:100,moveLeft:0,path:[],goal:null,warId:null,scenarioStanding:true,scenarioEndTurn:s.turn+900};
    s.armies.push(h);FB.hostUnits(h);FB.hostSupply(h);a.hostId = h.id;
    FB.game.setPaused(true);FB.ui.closeModal();
  },kind);
}

async function acquire(page) {
  return page.evaluate(function () {
    const s = FB.state, a = serviceCase, q = FB.stories.quote(s,a.story,a.petition);
    if (!q.allowed) throw new Error(JSON.stringify(q));
    if (!FB.stories.apply(s,a.story,a.petition,q)) throw new Error('Petition failed');
    a.appointmentId = s.stories[a.story].decisions.petition.office.appointmentId;
    return {fee:100-s.player.gold,mandate:a.appointmentId,agenda:s.stories[a.agenda].mandateId};
  });
}

for (const kind of ['476','493','json']) test(kind + ' household goals acquire, exercise and lose the canonical mandate with exact restore',async function ({page},info) {
  await start(page,info,kind);
  const initial = await page.evaluate(function () {
    const s = FB.state,a = serviceCase,before = JSON.stringify(s),rng = FB.getRngState(),uid = FB.getUidCounter();
    const goals = Object.values(s.stories[a.profile].goals).map(function (r) {return r.status;});
    for (let i=0;i<3;i++) FB.stories.quote(s,a.story,a.petition);
    return {goals:goals,pure:before === JSON.stringify(s) && rng === FB.getRngState() && uid === FB.getUidCounter(),
      commander:s.stories[a.agenda].mandateId,technology:FBDATA.techImpactReviews.features.court_office_mandates.mode};
  });
  expect(initial).toEqual({goals:['pending','pending','pending'],pure:true,commander:null,technology:'none'});
  const got = await acquire(page);
  expect(got.fee).toBe(kind === 'json' ? 4 : 15);expect(got.agenda).toBe(got.mandate);
  const used = await page.evaluate(function () {
    const s = FB.state,a = serviceCase,story = FB.stories.get(a.story),q = FB.stories.quote(s,a.story,a.command);
    const row = s.authority.appointments.find(function (r) {return r.id === a.appointmentId;});
    const publicBefore = JSON.stringify(FB.treasuryPublicAccountSnapshot(s,a.rid)),gold = s.player.gold;
    const stale = FB.stories.quote(s,a.story,a.command);
    FB.setRealmRulerStanding(s,a.rid,-80);
    const denied = JSON.stringify(s),rng = FB.getRngState(),uid = FB.getUidCounter();
    const rejection = !FB.stories.apply(s,a.story,a.command,stale) && denied === JSON.stringify(s) && rng === FB.getRngState() && uid === FB.getUidCounter();
    FB.setRealmRulerStanding(s,a.rid,25);
    const fresh = FB.stories.quote(s,a.story,a.command),ok = FB.stories.apply(s,a.story,a.command,fresh);
    if (!ok) throw new Error(JSON.stringify(fresh));
    const host = s.armies.find(function (h) {return h.id === a.hostId;});
    const goals = Object.values(s.stories[a.profile].goals).map(function (r) {return r.status;});
    // Forward only the ordinary narrative stages; none can complete the loss goal.
    if (a.story !== 'lantern_service_story') for (const key of ['gates','accounts','interests','favor']) {
      const c = story.declaration.stages[key].choices[0],v = FB.stories.quote(s,a.story,c.id);
      if (!FB.stories.apply(s,a.story,c.id,v)) throw new Error(key);
    }
    const beforeLoss = !FB.stories.quote(s,a.story,a.loss).allowed;
    const dismissal = FB.officeMandates.review(s,{kind:'realm',id:a.rid},row.id,'dismiss');
    if (!FB.officeMandates.commit(s,dismissal)) throw new Error(JSON.stringify(dismissal));
    const loss = FB.stories.quote(s,a.story,a.loss);
    if (!FB.stories.apply(s,a.story,a.loss,loss)) throw new Error(JSON.stringify(loss));
    return {q:q.allowed,rejection:rejection,goals:goals,beforeLoss:beforeLoss,hostGoal:host.goal,
      lossGoals:Object.values(s.stories[a.profile].goals).map(function (r) {return r.status;}),
      ended:FB.political.appointmentStatus(s,row),response:row.mandate.response.choice,
      sameMoney:gold === s.player.gold && publicBefore === JSON.stringify(FB.treasuryPublicAccountSnapshot(s,a.rid)),
      revoked:!FB.officeMandates.review(s,row.holder,row.id,'command',{hostId:host.id,destination:host.at}).allowed};
  });
  expect(used).toMatchObject({q:true,rejection:true,goals:['completed','completed','pending'],beforeLoss:true,
    lossGoals:['completed','completed','completed'],ended:'removed',response:'accept',sameMoney:true,revoked:true});
  expect(used.hostGoal).toBeTruthy();
  const persistence = await page.evaluate(function () {
    const source = JSON.parse(FB.save.serialize()),rounds = [],diagnostics = [];
    function canonical(value) {
      if (Array.isArray(value)) return value.map(canonical);
      if (value && typeof value === 'object') {const out = {};Object.keys(value).sort().forEach(function (k) {out[k] = canonical(value[k]);});return out;}
      return value;
    }
    function selected(s) {
      const treasury = s.realms[serviceCase.rid].treasury;
      return [s.stories,s.authority,s.owner,s.holder,s.player.gold,s.armies,s.player.holdings,
        treasury && [treasury.gold,treasury.militaryAccrual]];
    }
    function facts(s) {return JSON.stringify(canonical(selected(FB.save.expandedSnapshot(s))));}
    function differences(a,b,path,out) {
      if (out.length >= 12 || JSON.stringify(canonical(a)) === JSON.stringify(canonical(b))) return;
      if (a && b && typeof a === 'object' && typeof b === 'object') {
        Array.from(new Set(Object.keys(a).concat(Object.keys(b)))).forEach(function (key) {differences(a[key],b[key],path+'.'+key,out);});
      } else out.push({path:path,before:a,after:b});
    }
    const before = facts(source.state);
    for (let i=0;i<2;i++) {
      FB.save.restore(i ? JSON.parse(FB.save.serialize()) : source);
      const after = JSON.parse(FB.save.serialize()).state;
      rounds.push(before === facts(after) && source.uid === FB.getUidCounter() && (source.rng >>> 0) === (FB.getRngState() >>> 0));
      if (!rounds[i]) {
        const diff = [];differences(selected(FB.save.expandedSnapshot(source.state)),selected(FB.save.expandedSnapshot(after)),'state',diff);
        diagnostics.push({round:i,differences:diff,uid:[source.uid,FB.getUidCounter()],rng:[source.rng >>> 0,FB.getRngState() >>> 0]});
      }
    }
    const a = serviceCase;
    const rejected = [
      function (d) {delete d.state.stories[a.story].decisions.petition.office;},
      function (d) {d.state.stories[a.story].decisions.petition.office.appointmentId = 'missing';},
      function (d) {d.state.stories[a.story].decisions.petition.office.action = 'command';},
      function (d) {d.state.stories[a.agenda].mandateId = 'missing';},
      function (d) {delete d.state.authority.appointments.find(function (r) {return r.id === a.appointmentId;}).mandate.response;},
      function (d) {d.mods += 'changed';}
    ].map(function (change) {
      const d = JSON.parse(JSON.stringify(source));change(d);
      const live = FB.state,state = JSON.stringify(live),storage = JSON.stringify(localStorage),rng = FB.getRngState(),uid = FB.getUidCounter();
      let failed = false;try {if (d.mods !== source.mods) failed = FB.game.loadData(d) === false;else FB.save.restore(d);} catch (e) {failed = true;}
      return failed && live === FB.state && state === JSON.stringify(FB.state) && storage === JSON.stringify(localStorage) && rng === FB.getRngState() && uid === FB.getUidCounter();
    });
    return {rounds:rounds,rejected:rejected,diagnostics:diagnostics};
  });
  expect(persistence).toEqual({rounds:[true,true],rejected:Array(6).fill(true),diagnostics:[]});
});

test('cold 493 prepares the shipped stories and start bindings without importing or injecting definitions',async function ({page},info) {
  await openTitle(page,info);
  expect(await page.evaluate(function () {return FB.game.contentReady;})).toBe(false);
  await page.evaluate(function () {return new Promise(function (resolve,reject) {
    FB.bookmarkSources.loadDates(['493'],function (e) {if (e) reject(e);else resolve();});
  });});
  const result = await page.evaluate(function () {
    const report = FB.bookmarkSources.prepareSetup('493'),bm = FB.bookmark('493');
    const entry = FB.startTrackSet(FBDATA.startScenarios.find(function (s) {return s.id === 'farmer_493';}),bm);
    return {published:report.published,worldFaults:report.worldFaults,starts:report.starts.filter(function (r) {return !r.ready;}),
      complete:FB.game.contentReady,tracks:entry.tracks,declared:!!FBDATA.storyInstances.eastern_service_household_493,
      activeSlot:document.querySelectorAll('script[src*="data/story_imperial_service.js"]').length};
  });
  expect(result).toMatchObject({published:true,worldFaults:[],starts:[],complete:false,declared:true,activeSlot:1});
  expect(result.tracks).toEqual(['eastern_service_household_493','imperial_service_commander_493','imperial_service_emperor_493','opening_imperial_service_493']);
  await page.evaluate(function () {FBDATA.bookmarks['493'].hidden = false;});
  await page.getByRole('button',{name:'New Game',exact:true}).click();
  await page.locator('#btn-bm-seed').click();
  await page.locator('#ng-seed').fill('COLD-493-farmer_493-constantinople-m-Officer');
  await page.locator('#ng-seed').press('Enter');
  await expect(page.locator('#chargen:not(.hidden)')).toBeVisible();
  await page.getByRole('button',{name:'Begin Your Story',exact:true}).click();
  await page.getByRole('button',{name:'Begin',exact:true}).click();
  const coldRestore = await page.evaluate(function () {
    FB.game.setPaused(true);
    const source = JSON.parse(FB.save.serialize()),initial = JSON.stringify(source.state.stories),rounds = [];
    for (let i=0;i<2;i++) {
      FB.save.restore(i ? JSON.parse(FB.save.serialize()) : source);
      rounds.push(initial === JSON.stringify(FB.state.stories) && source.uid === FB.getUidCounter() &&
        (source.rng >>> 0) === (FB.getRngState() >>> 0) && source.mods === FB.mods.sig());
    }
    return {rounds:rounds,complete:FB.game.contentReady,world:FB.state.start.id,privateGold:FB.state.player.gold,
      dormant:FB.state.stories.imperial_service_emperor_493.generation,
      noOffice:!FB.state.authority.appointments.some(function (r) {return r.holder.id === FB.state.player.charId && !!r.mandate;})};
  });
  expect(coldRestore).toEqual({rounds:[true,true],complete:false,world:'493',privateGold:20,dormant:0,noOffice:true});
});

test('cold 476 retains healthy service starts when the later date is unloaded',async function ({page},info) {
  await openTitle(page,info);
  await page.evaluate(function () {return new Promise(function (resolve,reject) {
    FB.bookmarkSources.loadDates(['476'],function (e) {if (e) reject(e);else resolve();});
  });});
  const result = await page.evaluate(function () {
    const report = FB.bookmarkSources.prepareSetup('476');
    return {published:report.published,worldFaults:report.worldFaults,rejected:report.starts.filter(function (s) {return !s.ready;}),
      complete:FB.game.contentReady,track:!!FBDATA.storyInstances.salona_service_household};
  });
  expect(result).toEqual({published:true,worldFaults:[],rejected:[],complete:false,track:true});
});

test('imperial service households, agendas and goal profiles use plain player text without disclaimers',async function ({page},info) {
  await openTitle(page,info);
  await page.evaluate(function () {return new Promise(function (resolve,reject) {
    FB.bookmarkSources.loadDates(['476','493'],function (e) {if (e) reject(e);else resolve();});
  });});
  const result = await page.evaluate(function () {
    const report = FB.bookmarkSources.prepareSetup('493');
    const ids = ['salona_service_household','eastern_service_household_493','imperial_service_emperor','imperial_service_commander',
      'imperial_service_emperor_493','imperial_service_commander_493','imperial_service_eastern_commander_476',
      'opening_imperial_service','opening_imperial_service_493'];
    const banned = /grants? no |creates? no |Record (a |an )?(costless )?(priority|intention|preference)|Record attention|\bordinary\b|\bactual(ly)?\b|\bexisting\b|\boriginal\b|\bauthored\b|historical opportunity|political opportunity/i;
    const labelWords = /\b(ordinary|actual|actually|existing|current|original|authored|declared)\b/i;
    const table = FBDATA.householdTracks_imperial_service || {},faults = [],details = {},missing = [];
    function check(owner,field,value,prose) {
      if (typeof value !== 'string' || !value) {faults.push(owner + ' ' + field + ' is missing');return;}
      if (/[A-Za-z]\?[A-Za-z]/.test(value)) faults.push(owner + ' ' + field + ' has a lost apostrophe');
      if (value.indexOf('—') >= 0) faults.push(owner + ' ' + field + ' has an em dash');
      if (prose && banned.test(value)) faults.push(owner + ' ' + field + ' uses boilerplate: ' + value);
      if (/[{}]/.test(FB.T(value))) faults.push(owner + ' ' + field + ' leaves an unrendered placeholder');
    }
    function choice(owner,c) {
      check(owner + '/' + c.id,'label',c.label,false);
      check(owner + '/' + c.id,'detail',c.detail,true);
      if (typeof c.label === 'string' && (c.label.trim().split(/\s+/).length > 8 || labelWords.test(c.label))) faults.push(owner + '/' + c.id + ' label: ' + c.label);
      details[c.detail] = (details[c.detail] || 0) + 1;
    }
    const counts = ids.map(function (id) {
      const def = FBDATA.storyInstances[id] || table[id];
      if (!def) {missing.push(id);return [id,0,0];}
      check(id,'title',def.title,false);
      check(id,'intro',def.intro,true);
      let stages = 0,choices = 0;
      if (def.type === 'opening_profile') {
        def.goals.forEach(function (g) {check(id + '/' + g.id,'name',g.name,false);check(id + '/' + g.id,'text',g.text,true);stages++;});
        (def.contacts || []).forEach(function (c) {check(id + '/' + c.id,'contact label',c.label,false);check(id + '/' + c.id,'contact text',c.text,true);});
        return [id,stages,choices];
      }
      const list = Array.isArray(def.stages) ? def.stages : Object.keys(def.stages).map(function (key) {return Object.assign({id:key},def.stages[key]);});
      list.forEach(function (st) {
        stages++;check(id + '/' + st.id,'name',st.name,false);check(id + '/' + st.id,'text',st.text,true);
        st.choices.forEach(function (c) {choices++;choice(id + '/' + st.id,c);});
      });
      if (def.type === 'ruler_agenda' && !/These priorities shape your court’s story; orders, payments and wars go through Rank & Realm, Land and the map\.$/.test(def.intro)) faults.push(id + ' intro lacks the limit sentence');
      return [id,stages,choices];
    });
    return {published:report.published,missing:missing,faults:faults,counts:counts,
      repeated:Object.keys(details).filter(function (d) {return details[d] > 2;})};
  });
  expect(result).toEqual({published:true,missing:[],faults:[],repeated:[],counts:[
    ['salona_service_household',22,38],['eastern_service_household_493',12,17],
    ['imperial_service_emperor',3,7],['imperial_service_commander',3,8],['imperial_service_emperor_493',3,7],
    ['imperial_service_commander_493',3,8],['imperial_service_eastern_commander_476',3,8],
    ['opening_imperial_service',3,0],['opening_imperial_service_493',3,0]]});
});

test('typed mandate stories and bindings reject malformed ordinary JSON candidates atomically',async function ({page},info) {
  await openGame(page,info);
  const result = await page.evaluate(function (fixture) {
    const before = JSON.stringify([FBDATA,FB.state]),rng = FB.getRngState(),uid = FB.getUidCounter();
    const good = FB.mods.validate(fixture);
    const edits = [
      function (d) {d.storyInstances.lantern_service_story.stages.petition.choices[0].operation.service.input.free = true;},
      function (d) {d.storyInstances.lantern_service_story.stages.command.choices[0].operation.service.action = 'grant';},
      function (d) {d.storyInstances.lantern_commander_story.binding.kind = 'sovereign';},
      function (d) {d.storyInstances.lantern_commander_story.binding.officeId = 'praeses';},
      function (d) {d.storyInstances.lantern_court_story.stages[0].choices[0].service.action = 'command';},
      function (d) {d.storyInstances.lantern_service_goals.goals[0].criterion.choiceId = 'lantern_stop_petition';},
      function (d) {d.storyInstances.lantern_service_story.stages.petition.choices[0].operation.service.realmId = 'absent';},
      function (d) {d.storyInstances.lantern_commander_story.binding.waitForOffice = true;},
      function (d) {d.storyInstances.lantern_service_story.stages.command.choices[0].next = 'petition';}
    ];
    return {good:good,rejected:edits.map(function (edit) {const d = JSON.parse(JSON.stringify(fixture));edit(d);
      const original = JSON.stringify(d);return FB.mods.validate(d).length > 0 && original === JSON.stringify(d);}),
      pure:before === JSON.stringify([FBDATA,FB.state]) && rng === FB.getRngState() && uid === FB.getUidCounter()};
  },imported);
  expect(result).toEqual({good:[],rejected:Array(9).fill(true),pure:true});
});

for (const kind of ['476','json']) test(kind + ' canonical event reviews share manual and automated petitions and pure refusal',async function ({page},info) {
  await start(page,info,kind);
  const result = await page.evaluate(function (kind) {
    const s = FB.state,a = serviceCase,ev = FB.eventById(kind === 'json' ? 'lantern_service_petition_event' : 'service_court_petition');
    const option = ev.options[0],ctx = FB.eventContextFor(s,ev,{}),q = FB.eventReviews.quote(s,option,ctx);
    const before = JSON.stringify(s),rng = FB.getRngState(),uid = FB.getUidCounter();
    const missing = !FB.resolveEventOption(s,ev,option,ctx,{}) && before === JSON.stringify(s);
    const transactions = JSON.stringify([s.authority,s.player.gold,s.player.prestige,s.owner,s.holder,s.chars]);
    const refusal = FB.resolveEventOption(s,ev,ev.options[1],ctx,{}) && transactions === JSON.stringify([s.authority,s.player.gold,s.player.prestige,s.owner,s.holder,s.chars]) && rng === FB.getRngState() && uid === FB.getUidCounter();
    s.player.gold--;
    const changed = JSON.stringify(s),stale = !FB.resolveEventOption(s,ev,option,ctx,{reviewed:q}) && changed === JSON.stringify(s) && rng === FB.getRngState() && uid === FB.getUidCounter();
    const manual = JSON.parse(changed),auto = JSON.parse(changed),fresh = FB.eventReviews.quote(manual,option,ctx);
    const m = FB.resolveEventOption(manual,ev,option,ctx,{reviewed:fresh}),mRng = FB.getRngState() >>> 0,mUid = FB.getUidCounter();
    FB.setRngState(rng);FB.setUidCounter(uid);
    const automatic = FB.resolveEventOption(auto,ev,option,ctx,{automated:true});
    const parity = !!m && !!automatic && JSON.stringify(manual.authority) === JSON.stringify(auto.authority) && manual.player.gold === auto.player.gold && mRng === (FB.getRngState() >>> 0) && mUid === FB.getUidCounter();
    return {quote:!!q && q.quote.allowed,party:ctx.participants.official === s.player.charId,missing:missing,refusal:!!refusal,stale:stale,parity:parity};
  },kind);
  expect(result).toEqual({quote:true,party:true,missing:true,refusal:true,stale:true,parity:true});
});

for (const mobile of [false,true]) test((mobile ? 'compact' : 'desktop') + ' mandate story review cancellation retains the sheet and funds',async function ({page},info) {
  await page.setViewportSize(mobile ? {width:390,height:700} : {width:1280,height:720});
  await start(page,info,'476');
  await page.evaluate(function () {window.cancelState = JSON.stringify(FB.state);FB.ui.showStorySheet(serviceCase.story);});
  const choice = page.locator('[data-story-choice="service_petition"]');
  await choice.click();await expect(page.locator('#gm-story-confirm')).toBeVisible();
  await expect(page.locator('#gm-body')).toContainText('15');
  await page.keyboard.press('Escape');
  await expect(choice).toBeVisible();
  expect(await page.evaluate(function () {return cancelState === JSON.stringify(FB.state);})).toBe(true);
});

for (const kind of ['476','json']) test(kind + ' mandate adapters reject disabled systems, changed holders and succession before writes',async function ({page},info) {
  await start(page,info,kind);await acquire(page);
  const result = await page.evaluate(function () {
    const s = FB.state,a = serviceCase,M = FB.officeMandates,service = FB.stories.get(a.story).declaration.stages.command;
    const args = service ? service.choices[0].operation.service : FB.stories.get(a.story).declaration.stages.scope.choices[0].operation.service;
    function quote() {return M.storyReview(s,args,s.player.charId,a.appointmentId);}
    function denied(change,restore) {
      const q = quote();change();const before = JSON.stringify(s),rng = FB.getRngState(),uid = FB.getUidCounter();
      const pass = q.allowed && !M.storyCommit(s,args,s.player.charId,a.appointmentId,q) && before === JSON.stringify(s) && rng === FB.getRngState() && uid === FB.getUidCounter();restore();return pass;
    }
    const me = s.chars[s.player.charId],originalDead = me.dead,originalUnfree = me.unfree;
    const holder = denied(function () {me.unfree = true;},function () {if (originalUnfree === undefined) delete me.unfree;else me.unfree = originalUnfree;});
    const dead = denied(function () {me.dead = true;},function () {if (originalDead === undefined) delete me.dead;else me.dead = originalDead;});
    const gen = s.realms[a.rid].ruler.generation;
    const succession = denied(function () {s.realms[a.rid].ruler.generation = FB.realmRulerGeneration(s,a.rid)+1;},function () {if (gen === undefined) delete s.realms[a.rid].ruler.generation;else s.realms[a.rid].ruler.generation = gen;});
    const raw = FBDATA.bookmarks[s.start.id],systems = raw.systems;
    const disabled = denied(function () {raw.systems = Object.assign({},systems,{roman_offices:false});},function () {raw.systems = systems;});
    const row = s.authority.appointments.find(function (r) {return r.id === a.appointmentId;});
    const canonical = M.review(s,row.holder,row.id,'command',{hostId:a.hostId,destination:args.input.destination});
    raw.systems = Object.assign({},systems,{roman_offices:false});
    const disabledBefore = JSON.stringify(s),disabledRng = FB.getRngState(),disabledUid = FB.getUidCounter();
    const directDisabled = canonical.allowed && !M.review(s,row.holder,row.id,'command',canonical.input).allowed && !M.commit(s,canonical) &&
      disabledBefore === JSON.stringify(s) && disabledRng === FB.getRngState() && disabledUid === FB.getUidCounter();
    raw.systems = systems;
    const ended = {realmId:a.rid,officeId:a.office,action:'accept_loss',input:{}};
    FB.setRealmRulerStanding(s,a.rid,-80);
    const suspendedLoss = !M.storyReview(s,ended,s.player.charId,row.id).allowed;
    const agenda = FB.stories.get(a.agenda),agendaChoice = agenda.declaration.stages[0].choices.find(function (c) {return c.operation === 'agenda_mandate';});
    const agendaQuote = FB.stories.quote(s,a.agenda,agendaChoice.id),blocker = agenda.blocker(s,s.stories[a.agenda],agendaQuote.reason);
    const disclosed = !agendaQuote.allowed && /suspended/.test(blocker);
    FB.setRealmRulerStanding(s,a.rid,25);
    const stale = quote(),date = s.date.season*90+s.date.day-1+row.endTurn-s.turn;
    s.turn = row.endTurn;s.date.year += Math.floor(date/360);s.date.season = Math.floor((date%360)/90);s.date.day = date%90+1;
    const before = JSON.stringify(s),expiry = !M.storyCommit(s,args,s.player.charId,row.id,stale) && before === JSON.stringify(s);
    const loss = M.storyReview(s,ended,s.player.charId,row.id),accepted = M.storyCommit(s,ended,s.player.charId,row.id,loss);
    return {holder:holder,dead:dead,succession:succession,disabled:disabled,directDisabled:directDisabled,suspendedLoss:suspendedLoss,disclosed:disclosed,expiry:expiry,accepted:!!accepted};
  });
  expect(result).toEqual({holder:true,dead:true,succession:true,disabled:true,directDisabled:true,suspendedLoss:true,disclosed:true,expiry:true,accepted:true});
});

for (const kind of ['476','json']) test(kind + ' court agenda dismisses the exact subordinate without borrowing personal consent',async function ({page},info) {
  if (kind === 'json') await importStories(page,info);
  else await openGame(page,info);
  await page.evaluate(function (kind) {
    const id = kind === 'json' ? 'lantern_ruler_story' : 'nepos_476';
    FBDATA.startScenarios.find(function (s) {return s.id === id;}).hidden = false;
  },kind);
  await page.getByRole('button',{name:'New Game',exact:true}).click();
  await page.locator('#btn-bm-seed').click();
  await page.locator('#ng-seed').fill(kind === 'json' ? 'COURT-mandate_coast-lantern_ruler_story-harbor_quay-f-Iria_Vale' : 'COURT-476-nepos_476-split-m-Julius_Nepos');
  await page.locator('#ng-seed').press('Enter');
  await expect(page.locator('#chargen:not(.hidden)')).toBeVisible();
  await page.getByRole('button',{name:'Begin Your Story',exact:true}).click();
  await page.getByRole('button',{name:'Begin',exact:true}).click();
  const result = await page.evaluate(function (kind) {
    FB.game.setPaused(true);
    const s = FB.state,M = FB.officeMandates,storyId = kind === 'json' ? 'lantern_court_story' : 'imperial_service_emperor',story = FB.stories.get(storyId),t = s.stories[storyId];
    const me = s.chars[s.player.charId],candidate = Object.values(s.chars).find(function (c) {return c.id !== me.id && !c.dead && !c.unfree && FB.ageOf(c,s.date.year)>=18 && !FB.isReigningRealmRuler(s,c);});
    if (!candidate) throw new Error('No existing subordinate');candidate.skills.mar = 20;
    const pid = s.player.provinceId,host = {id:'court-story-host',realm:'player',at:pid,from:pid,men:80,size:80,units:{levy:80},supply:100,path:[],moveLeft:0,goal:null,warId:null};
    s.armies.push(host);FB.hostSupply(host);
    const q = FB.officeAppointmentQuote(s,{kind:'character',id:me.id},{institutionId:'player',officeId:kind === 'json' ? 'lantern_marshal' : 'court_service_command',
      holder:{kind:'character',id:candidate.id},scope:{kind:'host',id:host.id}});
    if (!q.allowed) throw new Error(JSON.stringify(q));
    const appointment = FB.officeSeekAppointment(s,q);story.observe(s,t);
    const bound = t.mandateId === appointment.id && candidate.id !== t.subjectId;
    if (kind !== 'json') for (let i=0;i<2;i++) {
      const c = story.declaration.stages[t.step].choices.find(function (c) {return c.operation === 'agenda_priority';});
      if (!FB.stories.apply(s,storyId,c.id,FB.stories.quote(s,storyId,c.id))) throw new Error('Priority failed');
    }
    const id = kind === 'json' ? 'lantern_court_story_act' : 'service_emperor_dismiss';
    const removal = FB.stories.quote(s,storyId,id),gold = s.player.gold,before = JSON.stringify(s),rng = FB.getRngState(),uid = FB.getUidCounter();
    const denied = !M.storyReview(s,story.declaration.stages[t.step].choices[0].service,candidate.id,appointment.id).allowed;
    const pure = before === JSON.stringify(s) && rng === FB.getRngState() && uid === FB.getUidCounter();
    const removed = FB.stories.apply(s,storyId,id,removal),row = s.authority.appointments.find(function (r) {return r.id === appointment.id;});
    const saved = JSON.parse(FB.save.serialize());FB.save.restore(saved);
    return {bound:bound,denied:denied,pure:pure,removed:removed,status:row.status,privateGold:gold === FB.state.player.gold,
      evidence:FB.state.stories[storyId].decisions.slice(-1)[0].office,restored:JSON.stringify(saved.state.stories) === JSON.stringify(FB.state.stories)};
  },kind);
  expect(result).toMatchObject({bound:true,denied:true,pure:true,removed:true,status:'removed',privateGold:true,restored:true});
  expect(result.evidence.action).toBe('dismiss');
});

test('public JSON petition charges its productive public source and a dormant court agenda binds only after real accession',async function ({page},info) {
  await start(page,info,'json');
  const result = await page.evaluate(function () {
    const s = FB.state,M = FB.officeMandates,R = FB.governmentRecognition,rid = 'ridge_court',pid = 'harbor_ridge',me = {kind:'character',id:s.player.charId};
    s.player.provinceId = pid;s.realms[rid].treasury.gold = 100;
    FB.setRealmRulerStanding(s,rid,25);
    const site = FB.settlementGrantSites(s,pid,rid)[0],notable = FB.bookmarkActor(s,'ridge_notable');
    if (!site || !FB.assignSettlementLordship(s,pid,site.settlement,notable.id)) throw new Error('No productive public source');
    const h = {id:'service-public-host',realm:rid,at:pid,from:pid,men:80,size:80,units:{levy:80},supply:100,path:[],goal:null,moveLeft:0,warId:null};
    s.armies.push(h);FB.hostSupply(h);
    const ev = FB.eventById('lantern_public_petition_event'),ctx = FB.eventContextFor(s,ev,{}),option = ev.options[0];
    const q = FB.eventReviews.quote(s,option,ctx),privateGold = s.player.gold,publicGold = s.realms[rid].treasury.gold;
    if (!q || !q.quote.allowed) throw new Error(JSON.stringify(q));
    const raw = FBDATA.bookmarks[s.start.id],systems = raw.systems;
    raw.systems = Object.assign({},systems,{public_offices:false});
    const disabledState = JSON.stringify(s),disabledRng = FB.getRngState(),disabledUid = FB.getUidCounter(),blocked = FB.eventReviews.quote(s,option,ctx);
    const disabledPetition = (!blocked || !blocked.quote.allowed) && !FB.resolveEventOption(s,ev,option,ctx,{reviewed:q}) &&
      disabledState === JSON.stringify(s) && disabledRng === FB.getRngState() && disabledUid === FB.getUidCounter();
    raw.systems = systems;
    const oldHolder = s.holder[pid];s.holder[pid] = 'lantern_court';
    const denied = JSON.stringify(s),rng = FB.getRngState(),uid = FB.getUidCounter();
    const stale = !FB.resolveEventOption(s,ev,option,ctx,{reviewed:q}) && denied === JSON.stringify(s) && rng === FB.getRngState() && uid === FB.getUidCounter();
    s.holder[pid] = oldHolder;
    const fresh = FB.eventReviews.quote(s,option,ctx);
    if (!FB.resolveEventOption(s,ev,option,ctx,{reviewed:fresh})) throw new Error('Public petition failed');
    const r = s.authority.appointments.find(function (r) {return r.mandate && r.institutionId === rid && r.holder.id === me.id;});
    const publicPayment = publicGold-s.realms[rid].treasury.gold === fresh.quote.quote.cost && s.player.gold === privateGold;
    const command = M.review(s,me,r.id,'command',{hostId:h.id,destination:pid});
    raw.systems = Object.assign({},systems,{public_offices:false});
    const commandState = JSON.stringify(s),commandRng = FB.getRngState(),commandUid = FB.getUidCounter();
    const disabledCommand = command.allowed && !M.review(s,me,r.id,'command',command.input).allowed && !M.commit(s,command) &&
      commandState === JSON.stringify(s) && commandRng === FB.getRngState() && commandUid === FB.getUidCounter();
    raw.systems = systems;
    const agenda = FB.stories.get('lantern_public_court_story'),record = s.stories.lantern_public_court_story;
    const dormant = record.generation === 0 && FB.stories.choices(s,agenda.id).map(function (c) {return c.id;}).join() === 'agenda_stop_program';
    if (!M.commit(s,M.review(s,me,r.id,'acclaim',{hostId:h.id}))) throw new Error('Acclamation failed');
    const candidate = R.candidates(s,rid).find(function (c) {return c.charId === me.id;}),seat = R.members(s,rid).find(function (m) {return m.principal.id === me.id;});
    if (!R.applySupport(s,R.supportQuote(s,me,rid,seat.id,candidate.id))) throw new Error('Own recognition failed');
    const accession = M.review(s,{kind:'realm',id:rid},r.id,'accede');
    if (!M.commit(s,accession)) throw new Error(JSON.stringify(accession));
    agenda.observe(s,record);
    const activated = record.generation > 0 && record.subjectId === s.player.charId && FB.station.rulesRealm(s.player,s);
    const source = JSON.parse(FB.save.serialize());FB.save.restore(source);FB.save.restore(JSON.parse(FB.save.serialize()));
    return {stale:stale,disabledPetition:disabledPetition,disabledCommand:disabledCommand,publicPayment:publicPayment,dormant:dormant,activated:activated,
      restored:JSON.stringify(source.state.stories.lantern_public_court_story) === JSON.stringify(FB.state.stories.lantern_public_court_story),
      privateGold:privateGold === FB.state.player.gold,original:r.mandate.originalInstitutionId === rid,holder:r.holder.id === me.id};
  });
  expect(result).toEqual({stale:true,disabledPetition:true,disabledCommand:true,publicPayment:true,dormant:true,activated:true,restored:true,privateGold:true,original:true,holder:true});
});

test('native service can commission a real opening federate host without changing its owner or population',async function ({page},info) {
  await start(page,info,'476');
  const result = await page.evaluate(function () {
    const s = FB.state,M = FB.officeMandates,h = s.armies.find(function (h) {return h.id === 'host_476_amal';});
    if (!h) throw new Error('Missing native contracted host');
    s.player.provinceId = h.at;FB.setRealmRulerStanding(s,'byzantium',25);
    const args = {realmId:'byzantium',officeId:'court_service_command',action:'petition',input:{hostId:h.id}},before = JSON.stringify([s.owner,s.holder,h.realm,h.men,h.units]),gold = s.player.gold;
    const q = M.storyReview(s,args,s.player.charId,null),r = M.storyCommit(s,args,s.player.charId,null,q);
    if (!r) throw new Error(JSON.stringify(q));
    const command = {realmId:'byzantium',officeId:'court_service_command',action:'command',input:{destination:'adrianople'}};
    const reviewed = M.storyReview(s,command,s.player.charId,r.id),used = M.storyCommit(s,command,s.player.charId,r.id,reviewed);
    return {used:!!used,conserved:before === JSON.stringify([s.owner,s.holder,h.realm,h.men,h.units]),fee:gold-s.player.gold,
      actual:r.scope.id === h.id,owner:h.realm,goal:h.goal};
  });
  expect(result).toMatchObject({used:true,conserved:true,fee:15,actual:true});
  expect(result.goal).toBe('adrianople');expect(result.owner).not.toBe('player');
});

for (const kind of ['476','json']) test(kind + ' service payment needs independent consent and finite court funds for both event resolutions',async function ({page},info) {
  await start(page,info,kind);await acquire(page);
  const result = await page.evaluate(function (kind) {
    const s = FB.state,a = serviceCase,M = FB.officeMandates,foreign = kind === 'json' ? 'ridge_court' : 'pannonia',template = kind === 'json' ? 'lantern_service' : 'court_paid_service';
    const me = {kind:'character',id:s.player.charId},h = {id:'service-payment-host',realm:foreign,at:s.realms[foreign].capital,men:40,size:40,units:{levy:40},supply:100,path:[],goal:null,moveLeft:0,warId:null};
    s.armies.push(h);FB.hostSupply(h);s.realms[a.rid].treasury.gold = 100;
    const offered = M.commit(s,M.review(s,me,a.appointmentId,'offer',{templateId:template,federateRealmId:foreign,hostId:h.id}));
    if (!offered) throw new Error('Canonical offer failed');
    const ev = FB.eventById(kind === 'json' ? 'lantern_service_payment_event' : 'service_court_gates'),option = ev.options[0],ctx = FB.eventContextFor(s,ev,{});
    const noConsent = !FB.eventReviews.quote(s,option,ctx).quote.allowed;
    if (!FB.authorityConsentContract(s,offered.id,foreign)) throw new Error('Outside consent failed');
    const current = FB.eventReviews.quote(s,option,ctx),generation = s.realms[foreign].ruler.generation;
    s.realms[foreign].ruler.generation = FB.realmRulerGeneration(s,foreign)+1;
    const replaced = JSON.stringify(s),staleParty = !FB.resolveEventOption(s,ev,option,ctx,{reviewed:current}) && replaced === JSON.stringify(s);
    if (generation === undefined) delete s.realms[foreign].ruler.generation;else s.realms[foreign].ruler.generation = generation;
    const gold = s.player.gold;s.player.gold = 1000;s.realms[a.rid].treasury.gold = 0;
    const before = JSON.stringify(s),rng = FB.getRngState(),uid = FB.getUidCounter(),denied = FB.eventReviews.quote(s,option,ctx);
    const poorCourt = !denied.quote.allowed && !FB.resolveEventOption(s,ev,option,ctx,{reviewed:denied}) && before === JSON.stringify(s) && rng === FB.getRngState() && uid === FB.getUidCounter();
    s.player.gold = gold;s.realms[a.rid].treasury.gold = 100;
    const stale = FB.eventReviews.quote(s,option,ctx);s.realms[a.rid].treasury.gold--;
    const changed = JSON.stringify(s),staleMoney = !FB.resolveEventOption(s,ev,option,ctx,{reviewed:stale}) && changed === JSON.stringify(s);
    const q = FB.eventReviews.quote(s,option,ctx),manual = JSON.parse(changed),auto = JSON.parse(changed);
    const initial = FB.political.contract(s,offered.id).initialPay,publicBefore = s.realms[a.rid].treasury.gold;
    const manualResult = FB.resolveEventOption(manual,ev,option,ctx,{reviewed:q}),mUid = FB.getUidCounter(),mRng = FB.getRngState() >>> 0;
    FB.setUidCounter(uid);FB.setRngState(rng);
    const automatic = FB.resolveEventOption(auto,ev,option,ctx,{automated:true});
    const contract = FB.political.contract(manual,offered.id),parity = !!manualResult && !!automatic &&
      JSON.stringify(manual.authority) === JSON.stringify(auto.authority) && manual.player.gold === auto.player.gold &&
      manual.realms[a.rid].treasury.gold === auto.realms[a.rid].treasury.gold && mUid === FB.getUidCounter() && mRng === (FB.getRngState() >>> 0);
    const settled = JSON.stringify(manual),duplicate = !FB.resolveEventOption(manual,ev,option,ctx,{reviewed:q}) && settled === JSON.stringify(manual);
    if (kind !== 'json' && !FB.stories.apply(s,a.story,a.command,FB.stories.quote(s,a.story,a.command))) throw new Error('Command failed');
    const record = s.stories[a.story],stage = FB.stories.get(a.story).declaration.stages[record.phase];
    const choice = stage.choices.find(function (c) {return c.operation.kind === 'mandate_service' && c.operation.service.action === 'consent';});
    const stageId = record.phase;
    if (!choice || !FB.stories.apply(s,a.story,choice.id,FB.stories.quote(s,a.story,choice.id))) throw new Error('Story service payment failed');
    const evidence = record.decisions[stageId].office,commitment = JSON.stringify(FB.political.contract(s,offered.id));
    if (!M.commit(s,M.review(s,{kind:'realm',id:a.rid},a.appointmentId,'dismiss'))) throw new Error('Court dismissal failed');
    const obligation = commitment === JSON.stringify(FB.political.contract(s,offered.id)) && FB.political.contract(s,offered.id).effective;
    const balances = [s.realms[a.rid].treasury.gold,s.realms[foreign].treasury.gold,s.player.gold];
    const saved = JSON.parse(FB.save.serialize());
    FB.save.restore(saved);FB.save.restore(JSON.parse(FB.save.serialize()));
    return {noConsent:noConsent,poorCourt:poorCourt,staleParty:staleParty,staleMoney:staleMoney,parity:parity,duplicate:duplicate,active:contract.effective,publicPayer:contract.publicPayer,
      debit:publicBefore-manual.realms[a.rid].treasury.gold,initial:initial,privateGold:manual.player.gold === gold,
      obligation:obligation,
      evidence:evidence.contractId === offered.id && evidence.action === 'consent',
      restored:JSON.stringify(saved.state.authority) === JSON.stringify(FB.state.authority) &&
        JSON.stringify(saved.state.stories[a.story]) === JSON.stringify(FB.state.stories[a.story]) &&
        JSON.stringify(balances) === JSON.stringify([FB.state.realms[a.rid].treasury.gold,FB.state.realms[foreign].treasury.gold,FB.state.player.gold])};
  },kind);
  expect(result).toMatchObject({noConsent:true,poorCourt:true,staleParty:true,staleMoney:true,parity:true,duplicate:true,active:true,publicPayer:true,privateGold:true,obligation:true,evidence:true,restored:true});
  expect(result.debit).toBe(result.initial);expect(result.initial).toBeGreaterThan(0);
});

for (const kind of ['476','json']) test(kind + ' household court journey uses the ordinary route and restores without an office',async function ({page},info) {
  await start(page,info,kind);
  const result = await page.evaluate(function (kind) {
    const s = FB.state,a = serviceCase,id = kind === 'json' ? 'lantern_court_journey' : 'service_seek_eastern_court',q = FB.stories.quote(s,a.story,id);
    const before = JSON.stringify(s),rng = FB.getRngState(),uid = FB.getUidCounter();
    for (let i=0;i<3;i++) FB.stories.quote(s,a.story,id);
    const pure = before === JSON.stringify(s) && rng === FB.getRngState() && uid === FB.getUidCounter();
    if (!q.allowed || !FB.stories.apply(s,a.story,id,q)) throw new Error(JSON.stringify(q));
    const saved = JSON.parse(FB.save.serialize()),travel = JSON.stringify(saved.state.player.travel);
    FB.save.restore(saved);FB.save.restore(JSON.parse(FB.save.serialize()));
    return {pure:pure,travel:!!FB.state.player.travel,route:travel === JSON.stringify(JSON.parse(FB.save.serialize()).state.player.travel),
      target:FB.state.player.travel.destinationRealm,noOffice:!FB.state.authority.appointments.some(function (r) {return r.mandate && r.holder.id === s.player.charId;}),
      goals:Object.values(FB.state.stories[a.profile].goals).map(function (g) {return g.status;})};
  },kind);
  expect(result).toMatchObject({pure:true,travel:true,route:true,noOffice:true,goals:['pending','pending','pending']});
  expect(result.target).toBe(kind === 'json' ? 'ridge_court' : 'byzantium');
});

test('a changed ordinary JSON story under the same name rejects its prior exact save without adoption',async function ({page},info) {
  await start(page,info,'json');await acquire(page);
  const result = await page.evaluate(function (fixture) {
    const saved = JSON.parse(FB.save.serialize()),changed = JSON.parse(JSON.stringify(fixture));
    changed.storyInstances.lantern_service_story.stages.command.choices[0].operation.service.input.destination = 'harbor_quay';
    FB.mods.apply(changed);
    const live = FB.state,before = JSON.stringify(live),storage = JSON.stringify(localStorage),rng = FB.getRngState(),uid = FB.getUidCounter();
    let rejected = false;try {FB.save.restore(saved);} catch (e) {rejected = true;}
    return {mismatch:FB.save.otherWorld(saved),rejected:rejected,
      pure:live === FB.state && before === JSON.stringify(FB.state) && storage === JSON.stringify(localStorage) && rng === FB.getRngState() && uid === FB.getUidCounter()};
  },imported);
  expect(result).toEqual({mismatch:true,rejected:true,pure:true});
});
