'use strict';
const {test,expect} = require('../support/fixture');
const path = require('path');
const {openGame,prepareGameContent} = require('../support/game/navigation');
const {restoreBookmark} = require('../support/game/bookmark-acceptance');
const {injectBrowserHarness} = require('../support/game/browser-harness');
const {dependsOnRuntime} = require('../support/runtime-dependencies');

dependsOnRuntime(__filename,['data/bookmark_manifest.js',
  'index.html','data/starts_634_ctesiphon.js','data/story_households_634_ctesiphon.js',
  'data/bookmark_634.js','data/starts_634_ordinary.js','data/bookmark_634_identities.js',
  'data/bookmark_634_scaffold_a.js','data/bookmark_634_scaffold_b.js',
  'data/bookmark_634_scaffold_c.js','data/bookmark_634_scaffold_d.js',
  'data/bookmark_sources.js','data/story_instances.js','data/settlements.js',
  'data/starts.js','data/actions.js','data/economy.js','data/travel.js',
  'js/bookmark_composition.js','js/bookmark_sources.js','js/bookmark_setup.js',
  'js/story_household_observer.js','js/story_household.js','js/story_opening_goals.js','js/stories.js','js/starts.js',
  'js/main.js','js/model.js','js/world.js','js/actions.js','js/economy.js',
  'js/travel.js','js/save.js','js/save_v4.js','js/mods.js','js/i18n.js',
  'js/ui_misc.js','js/ui_panels.js'
]);

const ID = 'ctesiphon_household_track_634';

async function beginCtesiphonFromTitle(page) {
  const code = await page.evaluate(function () {
    const b = FB.bookmark('634');
    FBDATA.bookmarks['634'].hidden = false;
    const raw = FBDATA.startScenarios.find(function (r) { return r.id === 'ctesiphon_household_634'; });
    const sc = FB.startIdentity(raw,b);
    return 'CTESIPHON-634-ctesiphon_household_634-baghdad-m-Review-established-0-' + sc.startCulture + '.' + sc.startReligion;
  });
  const full = page.locator('#btn-choose-beginning');
  if (await full.isVisible()) await full.click();
  else await page.getByRole('button',{name:'New Game',exact:true}).click();
  await page.locator('#btn-bm-seed').click();
  await page.locator('#ng-seed').fill(code); await page.locator('#ng-seed').press('Enter');
  await expect(page.locator('#chargen:not(.hidden)')).toBeVisible();
  await page.getByRole('button',{name:'Begin Your Story',exact:true}).click();
  await page.getByRole('button',{name:'Begin',exact:true}).click();
  await injectBrowserHarness(page);
  await page.evaluate(function () {
    FB.game.setPaused(true); FB.game.auto.all = true; FB.game.auto.style = 'first';
    FB.game.uiPrefs.hideTips = true; FB.game.uiPrefs.hideBeginnerHints = true;
    delete FB.state.player.flags.tutorial;
  });
}
async function beginBookmark(page,info) {
  await openGame(page,info); await prepareGameContent(page);
  await beginCtesiphonFromTitle(page);
}

async function choose(page,choice) {
  return page.evaluate(function (choice) {
    const s = FB.state, id = 'ctesiphon_household_track_634';
    return FB.stories.apply(s,id,choice,FB.stories.quote(s,id,choice));
  },choice);
}

test('selectable 634 owns a complete Ctesiphon household graph and actual resident identity', async function ({page},info) {
  await openGame(page,info);
  expect(await page.evaluate(function () {
    const b = FB.bookmark('634'), raw = FBDATA.startScenarios.find(function (r) { return r.id === 'ctesiphon_household_634'; });
    const sc = FB.startIdentity(raw,b);
    const before = JSON.stringify(FBDATA), rng = FB.getRngState(), uid = FB.getUidCounter();
    const errors = FB.validateBookmark(b), p = b.provinces.find(function (p) { return p.id === 'baghdad'; });
    const slots = FBDATA.settlementLayouts[b.settlementLayout].baghdad;
    return {errors:errors,hidden:!!b.hidden,available:FB.bookmarkAvailable('634'),
      tracks:FB.startTracks(sc,'baghdad'),storyline:FB.startStoryTracks(sc,'baghdad'),away:FB.startTracks(sc,'hira'),
      local:FB.startProvinceAllowed(sc,b,'baghdad'),elsewhere:FB.startProvinceAllowed(sc,b,'hira'),
      resident:p.communities.some(function (c) { return c.culture === sc.startCulture && c.religion === sc.startReligion && c.populationShare0 > 0; }),
      family:Object.keys(sc.familyPresets),age:sc.startAge,resources:[sc.tier,sc.profession,sc.gold,sc.prestige,sc.piety],
      site:slots[0].site,coordinates:FBDATA.settlementSites[slots[0].site],
      institutions:b.localInstitutions,heads:b.religiousHeads,
      independent:!FBDATA.storyInstances.ctesiphon_household_track_634.requires,
      pure:before === JSON.stringify(FBDATA) && rng === FB.getRngState() && uid === FB.getUidCounter()};
  })).toMatchObject({errors:[],hidden:false,available:true,
    tracks:[ID,'opening_ctesiphon_634'],storyline:[ID],away:[],local:true,elsewhere:false,resident:true,
    family:['established'],age:24,resources:[1,'farmer',20,5,0],site:'baghdad_outer_476',
    coordinates:{x:44.58,y:33.1},institutions:{},heads:{},independent:true,pure:true});
  await beginBookmark(page,info,'634','ctesiphon_household_634');
  expect(await page.evaluate(function () {
    const s = FB.state, c = s.chars[s.player.charId];
    return {phase:s.stories.ctesiphon_household_track_634.phase,actor:s.stories.ctesiphon_household_track_634.actorId === c.id,
      home:s.player.provinceId,culture:c.culture,faith:c.religion,age:FB.ageOf(c,s.date.year),
      family:FB.householdMembers(s).length > 1,profession:s.player.profession,gold:s.player.gold,
      errors:FBTEST.checkInvariants()};
  })).toEqual({phase:'household',actor:true,home:'baghdad',culture:'syriac',faith:'east_syriac_local_634',age:24,
    family:true,profession:'farmer',gold:20,errors:[]});
});

test('six reviews reach a stationary conclusion with no payments or forced historical outcome', async function ({page},info) {
  await beginBookmark(page,info,'634','ctesiphon_household_634');
  expect(await page.evaluate(function () {
    const s = FB.state, id = 'ctesiphon_household_track_634';
    const resources = JSON.stringify([s.player.gold,s.player.prestige,s.player.piety,s.owner,s.chars,s.player.provinceId]);
    const phases = [], results = [];
    ['take_stock','defer_work','review_records','keep_plans','stay','continue_life'].forEach(function (choice) {
      phases.push(s.stories[id].phase);
      results.push(FB.stories.apply(s,id,choice,FB.stories.quote(s,id,choice)));
    });
    return {phases:phases,results:results,phase:s.stories[id].phase,turn:s.turn,
      unchanged:resources === JSON.stringify([s.player.gold,s.player.prestige,s.player.piety,s.owner,s.chars,s.player.provinceId]),
      travel:s.player.travel || null,receipts:s.stories[id].householdReceipts,
      goals:Object.keys(s.stories.opening_ctesiphon_634.goals).map(function (key) { return s.stories.opening_ctesiphon_634.goals[key].status; })};
  })).toEqual({phases:['household','farming','obligations','local_life','horizon','livelihood'],
    results:[true,true,true,true,true,true],phase:'stayed',turn:0,unchanged:true,travel:null,receipts:{},goals:['pending','pending','completed']});
});

test('detached JSON validation rejects a missing storyline and an invented payment without mutation', async function ({page},info) {
  await openGame(page,info);
  expect(await page.evaluate(function () {
    const sc = FBDATA.startScenarios.find(function (r) { return r.id === 'ctesiphon_household_634'; });
    const graph = FBDATA.storyInstances.ctesiphon_household_track_634;
    const before = JSON.stringify(FBDATA), rng = FB.getRngState(), uid = FB.getUidCounter();
    function candidate() {
      return JSON.parse(JSON.stringify({name:'Household review',
        startScenarios:[sc],storyInstances:{ctesiphon_household_track_634:graph}}));
    }
    const valid = FB.mods.validate(candidate());
    const missing = candidate(); missing.startScenarios[0].tracks = ['opening_ctesiphon_634'];
    delete missing.startScenarios[0].trackLocations.ctesiphon_household_track_634;
    const payment = candidate(); payment.storyInstances.ctesiphon_household_track_634.stages.household.choices[0].operation = {kind:'give_gold',amount:20};
    return {valid:valid,missing:FB.mods.validate(missing).length > 0,payment:FB.mods.validate(payment).length > 0,
      pure:before === JSON.stringify(FBDATA) && rng === FB.getRngState() && uid === FB.getUidCounter()};
  })).toEqual({valid:[],missing:true,payment:true,pure:true});
});

test('fieldwork requires actual income and survives matching saves without replay', async function ({page},info) {
  await beginBookmark(page,info,'634','ctesiphon_household_634');
  await choose(page,'take_stock');
  expect(await page.evaluate(function () {
    let s = FB.state;
    const id = 'ctesiphon_household_track_634', cash = s.player.gold;
    const q = FB.stories.quote(s,id,'work_fields'), picked = FB.stories.apply(s,id,'work_fields',q);
    const pending = s.stories[id].phase === 'working' && s.player.gold === cash;
    const repeat = FB.stories.apply(s,id,'work_fields',q);
    FB.save.restore(JSON.parse(FB.save.serialize())); s = FB.state;
    const restored = s.stories[id].phase === 'working' && s.player.gold === cash;
    s.turn++; FB.tickFocus(s);
    const paid = s.player.gold > cash, phase = s.stories[id].phase;
    const funds = s.player.gold, records = JSON.stringify(s.stories);
    FBDATA.bookmarks['634'].hidden = true;
    FB.save.restore(JSON.parse(FB.save.serialize())); s = FB.state;
    return {picked:picked,pending:pending,repeat:repeat,restored:restored,paid:paid,phase:phase,
      exact:funds === s.player.gold && records === JSON.stringify(s.stories),
      earnings:s.stories.opening_ctesiphon_634.earnings.work_land > 0,hidden:FB.bookmark('634').hidden};
  })).toEqual({picked:true,pending:true,repeat:false,restored:true,paid:true,phase:'obligations',exact:true,earnings:true,hidden:true});
});

test('poor households can decline travel and stale remote choices change no resources', async function ({page},info) {
  await beginBookmark(page,info,'634','ctesiphon_household_634');
  for (const c of ['take_stock','defer_work','review_records','keep_plans','consider_journey']) expect(await choose(page,c)).toBe(true);
  expect(await page.evaluate(function () {
    const s = FB.state, id = 'ctesiphon_household_track_634';
    s.player.gold = 0;
    const noJourney = !s.player.travel, q = FB.stories.quote(s,id,'remain');
    const home = s.player.provinceId; s.player.provinceId = 'hira';
    const remote = FB.stories.apply(s,id,'remain',q);
    s.player.provinceId = home;
    const remain = FB.stories.apply(s,id,'remain',FB.stories.quote(s,id,'remain'));
    const finish = FB.stories.apply(s,id,'continue_life',FB.stories.quote(s,id,'continue_life'));
    return {noJourney:noJourney,remote:remote,remain:remain,finish:finish,gold:s.player.gold,phase:s.stories[id].phase};
  })).toEqual({noJourney:true,remote:false,remain:true,finish:true,gold:0,phase:'stayed'});
});

test('ordinary personal departure is observed without asserting arrival or moving relatives', async function ({page},info) {
  await beginBookmark(page,info,'634','ctesiphon_household_634');
  expect(await page.evaluate(function () {
    const s = FB.state, id = 'ctesiphon_household_track_634';
    const kin = FB.householdMembers(s).filter(function (c) { return c.id !== s.player.charId; }).map(function (c) { return [c.id,c.homeProvinceId]; });
    // Stage the travel boundary; this graph neither creates nor prices a journey.
    const original = s.player.travel, gold = s.player.gold;
    s.player.travel = {phase:'outbound'};
    FB.stories.get(id).day(s,s.stories[id]);
    const phase = s.stories[id].phase; s.player.travel = original;
    return {phase:phase,goldSame:gold === s.player.gold,home:s.player.provinceId,
      kinStayed:kin.every(function (r) { return s.chars[r[0]].homeProvinceId === r[1]; }),goal:s.stories.opening_ctesiphon_634.goals.home_decision.status};
  })).toEqual({phase:'personal_journey',goldSame:true,home:'baghdad',kinStayed:true,goal:'pending'});
});

test('death and succession archive the protagonist and legacy hidden restore never attaches missing tracks', async function ({page},info) {
  await beginBookmark(page,info,'634','ctesiphon_household_634');
  const saved = await page.evaluate(function () {
    let s = FB.state;
    const id = 'ctesiphon_household_track_634', profile = 'opening_ctesiphon_634', saved = JSON.parse(FB.save.serialize());
    s.player.dead = true; FB.stories.get(id).day(s,s.stories[id]); FB.stories.get(profile).day(s,s.stories[profile]);
    if (s.stories[id].phase !== 'interrupted' || s.stories[profile].goals.field_income.status !== 'archived') throw new Error('Death did not archive the plan');
    FB.save.restore(saved); s = FB.state;
    s.player.charId = FB.householdMembers(s).find(function (c) { return c.id !== s.player.charId && !c.dead; }).id;
    FB.stories.get(id).day(s,s.stories[id]); FB.stories.get(profile).day(s,s.stories[profile]);
    if (s.stories[id].phase !== 'interrupted' || s.stories[profile].goals.field_income.status !== 'archived') throw new Error('Succession inherited the plan');
    delete saved.state.stories[id]; delete saved.state.stories[profile];
    // Before attachment ledgers, missing stories were not an opt-in request.
    delete saved.state.start.storyAttachments;
    delete saved.storyAttachmentSchema;
    FBDATA.bookmarks['634'].hidden = true;
    return JSON.stringify(saved);
  });
  await restoreBookmark(page,saved);
  expect(await page.evaluate(function () {
    return {hidden:FB.bookmark('634').hidden,home:FB.state.player.provinceId,
      absent:!FB.state.stories.ctesiphon_household_track_634 && !FB.state.stories.opening_ctesiphon_634};
  })).toEqual({hidden:true,home:'baghdad',absent:true});
});

test('shared work review cancels back to the story and restores its originating card', async function ({page},info) {
  await beginBookmark(page,info,'634','ctesiphon_household_634');
  await choose(page,'take_stock');
  await page.locator('[data-tab="actions"]').click();
  await page.evaluate(function () { FB.ui.refresh(); });
  const card = page.locator('[data-story-card="' + ID + '"]');
  await card.click();
  await page.locator('[data-story-choice="work_fields"]').click();
  await expect(page.locator('#gm-story-confirm')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('[data-story-choice="defer_work"]')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(card).toBeFocused();
  expect(await page.evaluate(function () {
    return {gold:FB.state.player.gold,phase:FB.state.stories.ctesiphon_household_track_634.phase};
  })).toEqual({gold:20,phase:'farming'});
});


test('Ctesiphon observes only actual local sovereignty with private accounts and exact pending saves', async function ({page},info) {
  await beginBookmark(page,info,'634','ctesiphon_household_634');
  expect(await page.evaluate(function () {
    let s = FB.state;
    const id = 'ctesiphon_household_observer_634', m = FB.stories.get(id), t = s.stories[id];
    const quiet = !FB.stories.status(s,id), cash = s.player.gold;
    const from = FB.topRealm(s,s.owner.baghdad), target = 'byzantium_634';
    s.turn = 4; FB.transferProvince(s,'baghdad',target); m.day(s,t);
    const event = t.pending[0].event;
    const expected = event.source === 'control' && event.milestone === 'rule_changed' &&
      event.provinceId === 'baghdad' && event.turn === 4 && event.before === from && event.after === target;
    const pending = JSON.stringify(t);
    FB.save.restore(JSON.parse(FB.save.serialize())); s = FB.state;
    const restored = pending === JSON.stringify(s.stories[id]);
    const quote = FB.stories.quote(s,id,'review_records'), read = JSON.stringify(s);
    FB.stories.status(s,id); FB.stories.choices(s,id);
    const pure = read === JSON.stringify(s);
    s.player.provinceId = 'hira';
    const remote = FB.stories.apply(s,id,'review_records',quote);
    s.player.provinceId = 'baghdad';
    const accounts = JSON.stringify(s.realms);
    const applied = FB.stories.apply(s,id,'review_records',FB.stories.quote(s,id,'review_records'));
    const repeated = FB.stories.apply(s,id,'review_records',quote);
    const closed = JSON.stringify(s.stories[id]);
    FB.save.restore(JSON.parse(FB.save.serialize())); s = FB.state; m.day(s,s.stories[id]);
    return {quiet:quiet,expected:expected,restored:restored,pure:pure,remote:remote,applied:applied,repeated:repeated,
      closed:closed === JSON.stringify(s.stories[id]),quietAgain:!FB.stories.status(s,id),
      gold:s.player.gold === cash,publicSame:accounts === JSON.stringify(s.realms),
      receipts:Object.keys(s.stories[id].householdReceipts).length};
  })).toEqual({quiet:true,expected:true,restored:true,pure:true,remote:false,applied:true,repeated:false,
    closed:true,quietAgain:true,gold:true,publicSame:true,receipts:1});
});

test('remote control and war context supply neither a local transfer notice nor public money', async function ({page},info) {
  await beginBookmark(page,info,'634','ctesiphon_household_634');
  for (const c of ['take_stock','defer_work','review_records']) expect(await choose(page,c)).toBe(true);
  expect(await page.evaluate(function () {
    const s = FB.state, id = 'ctesiphon_household_observer_634', m = FB.stories.get(id), t = s.stories[id];
    const before = JSON.stringify(t), gold = s.player.gold;
    const peace = FB.stories.quote(s,'ctesiphon_household_track_634','war_context').allowed;
    s.turn = 3; FB.transferProvince(s,'hira','byzantium_634'); m.day(s,t);
    const remoteQuiet = before === JSON.stringify(t);
    const rid = FB.topRealm(s,s.owner.baghdad);
    s.realms[rid].war = {enemy:'rashidun_634'}; m.day(s,t);
    const applied = FB.stories.apply(s,'ctesiphon_household_track_634','war_context',FB.stories.quote(s,'ctesiphon_household_track_634','war_context'));
    const resumed = FB.stories.apply(s,'ctesiphon_household_track_634','resume_plans',FB.stories.quote(s,'ctesiphon_household_track_634','resume_plans'));
    return {peace:peace,remoteQuiet:remoteQuiet,quiet:!FB.stories.status(s,id),pending:t.pending.length,
      applied:applied,resumed:resumed,gold:s.player.gold === gold,phase:s.stories.ctesiphon_household_track_634.phase};
  })).toEqual({peace:false,remoteQuiet:true,quiet:true,pending:0,applied:true,resumed:true,gold:true,phase:'horizon'});
});

test('assembled Ctesiphon uses the actual ancient site, living court and resident faith without replay', async function ({page},info) {
  await openGame(page,info); await prepareGameContent(page);
  expect(await page.evaluate(function () { return FB.bookmark('634','core_courts_v4').hidden; })).toBe(true);
  await page.evaluate(function () {
    FBDATA.bookmarks['634'].revision = 'core_courts_v4';
    FBDATA.bookmarks['634'].revisions.core_courts_v4.hidden = false;
  });
  await beginCtesiphonFromTitle(page);
  const result = await page.evaluate(function () {
    let s = FB.state;
    const b = FB.campaignBookmark(s), c = s.chars[s.player.charId];
    const site = FBDATA.settlementLayouts[b.settlementLayout].baghdad[0];
    const identity = c.culture === 'syriac' && c.religion === 'east_syriac_local_634';
    const resident = FB.provinceCommunities(b.provinces.find(function (p) { return p.id === 'baghdad'; })).some(function (r) {
      return r.culture === c.culture && r.religion === c.religion;
    });
    const court = s.realms.sasanian_634.ruler.name;
    const id = 'ctesiphon_household_track_634';
    ['take_stock','work_fields'].forEach(function (choice) { FB.stories.apply(s,id,choice,FB.stories.quote(s,id,choice)); });
    s.turn++; FB.tickFocus(s);
    const paid = s.player.gold > 20, phase = s.stories[id].phase;
    const saved = JSON.parse(FB.save.serialize());
    function facts() {
      const e = JSON.parse(FB.save.serialize()), state = FB.save.expandedSnapshot(e.state);
      return [state.player,state.chars,state.stories,state.realms,state.property];
    }
    const before = facts(), rng = FB.getRngState() >>> 0, uid = FB.getUidCounter();
    FB.save.restore(saved); const once = facts();
    FB.save.restore(JSON.parse(FB.save.serialize()));
    return {revision:b.revision,identity:identity,resident:resident,court:court,site:site.site,name:site.name,
      paid:paid,phase:phase,once:once,twice:facts(),before:before,rng:rng === (FB.getRngState() >>> 0),uid:uid === FB.getUidCounter(),
      observer:!!FB.state.stories.ctesiphon_household_observer_634};
  });
  expect(result.once).toEqual(result.before); expect(result.twice).toEqual(result.before);
  delete result.once; delete result.twice; delete result.before;
  expect(result).toEqual({revision:'core_courts_v4',identity:true,resident:true,court:'Yazdegerd III',site:'baghdad_outer_476',name:'Ctesiphon',
    paid:true,phase:'obligations',rng:true,uid:true,observer:true});
});

test('ordinary JSON import supplies independent property and stationary decisions', async function ({page},info) {
  await openGame(page,info);
  await prepareGameContent(page);
  expect(await page.evaluate(function (m) { return FB.mods.validate(m); },require('../fixtures/authoring/ctesiphon-household-plans.json'))).toEqual([]);
  await page.evaluate(function () { FB.ui.showMods(); });
  await page.locator('#modfile').setInputFiles(path.resolve(__dirname,'../fixtures/authoring/ctesiphon-household-plans.json'));
  await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded'}),page.locator('#mod-apply').click()]);
  await prepareGameContent(page);
  await beginCtesiphonFromTitle(page);
  expect(await page.evaluate(function () {
    const s = FB.state, id = 'ctesiphon_reserve_example', gold = s.player.gold;
    const applied = FB.stories.apply(s,id,'keep',FB.stories.quote(s,id,'keep'));
    const saved = JSON.parse(FB.save.serialize()); FB.save.restore(saved);
    FB.save.restore(JSON.parse(FB.save.serialize()));
    return {gold:gold,unchanged:FB.state.player.gold === gold,applied:applied,phase:FB.state.stories[id].phase,
      original:!!FB.state.stories.ctesiphon_household_track_634,identity:FB.state.chars[FB.state.player.charId].religion};
  })).toEqual({gold:12,unchanged:true,applied:true,phase:'done',original:false,identity:'east_syriac_local_634'});
});
