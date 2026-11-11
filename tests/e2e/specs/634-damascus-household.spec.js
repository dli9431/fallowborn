'use strict';
const {test,expect} = require('../support/fixture');
const path = require('path');
const {openGame,prepareGameContent} = require('../support/game/navigation');
const {restoreBookmark} = require('../support/game/bookmark-acceptance');
const {injectBrowserHarness} = require('../support/game/browser-harness');
const {dependsOnRuntime} = require('../support/runtime-dependencies');

dependsOnRuntime(__filename,['data/bookmark_manifest.js',
  'index.html','data/starts_634_damascus.js','data/story_households_634_damascus.js',
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

const ID = 'damascus_household_track_634';

async function beginBookmarkFromTitle(page) {
  await prepareGameContent(page);
  const code = await page.evaluate(function () {
    const b = FB.bookmark('634');
    FBDATA.bookmarks['634'].hidden = false;
    const raw = FBDATA.startScenarios.find(function (r) { return r.id === 'damascus_household_634'; });
    const sc = FB.startIdentity(raw,b);
    return 'BOOKMARKSMOKE-634-damascus_household_634-damascus-m-Review-established-0-' + sc.startCulture + '.' + sc.startReligion;
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
  await openGame(page,info);
  await beginBookmarkFromTitle(page);
}

async function choose(page,choice) {
  return page.evaluate(function (choice) {
    const s = FB.state, id = 'damascus_household_track_634';
    return FB.stories.apply(s,id,choice,FB.stories.quote(s,id,choice));
  },choice);
}

test('selectable 634 owns a complete Damascus household graph and actual resident identity', async function ({page},info) {
  await openGame(page,info);
  expect(await page.evaluate(function () {
    const b = FB.bookmark('634');
    if (!b) throw new Error(JSON.stringify(FB.bookmarkRuntimeDiagnostics()));
    const raw = FBDATA.startScenarios.find(function (r) { return r.id === 'damascus_household_634'; });
    const before = JSON.stringify(FBDATA), rng = FB.getRngState(), uid = FB.getUidCounter();
    const sc = FB.startIdentity(raw,b);
    const errors = FB.validateBookmark(b), p = b.provinces.find(function (p) { return p.id === 'damascus'; });
    const slots = FBDATA.settlementLayouts[b.settlementLayout].damascus;
    return {errors:errors,hidden:!!b.hidden,available:FB.bookmarkAvailable('634'),
      fresh:b.revision,fullHidden:FB.bookmark('634','core_courts_v4').hidden,
      tracks:FB.startTracks(sc,'damascus'),storyline:FB.startStoryTracks(sc,'damascus'),away:FB.startTracks(sc,'hira'),
      local:FB.startProvinceAllowed(sc,b,'damascus'),elsewhere:FB.startProvinceAllowed(sc,b,'hira'),
      resident:p.communities.some(function (c) { return c.culture === sc.startCulture && c.religion === sc.startReligion && c.populationShare0 > 0; }),
      family:Object.keys(sc.familyPresets),age:sc.startAge,resources:[sc.tier,sc.profession,sc.gold,sc.prestige,sc.piety],
      site:slots[0].site,coordinates:FBDATA.settlementSites[slots[0].site],
      institutions:b.localInstitutions,heads:b.religiousHeads,
      independent:!FBDATA.storyInstances.damascus_household_track_634.requires,
      pure:before === JSON.stringify(FBDATA) && rng === FB.getRngState() && uid === FB.getUidCounter()};
  })).toMatchObject({errors:[],hidden:false,available:true,fresh:'core_identities_v3',fullHidden:true,
    tracks:[ID,'opening_damascus_634'],storyline:[ID],away:[],local:true,elsewhere:false,resident:true,
    family:['established'],age:24,resources:[1,'craftsman',20,5,0],site:'damascus_493',
    coordinates:{x:36.29,y:33.51},institutions:{},heads:{},independent:true,pure:true});
  await beginBookmark(page,info,'634','damascus_household_634');
  expect(await page.evaluate(function () {
    const s = FB.state, c = s.chars[s.player.charId];
    return {phase:s.stories.damascus_household_track_634.phase,actor:s.stories.damascus_household_track_634.actorId === c.id,
      home:s.player.provinceId,culture:c.culture,faith:c.religion,age:FB.ageOf(c,s.date.year),
      family:FB.householdMembers(s).length > 1,profession:s.player.profession,gold:s.player.gold,
      errors:FBTEST.checkInvariants()};
  })).toEqual({phase:'household',actor:true,home:'damascus',culture:'syriac',faith:'chalcedonian_local_634',age:24,
    family:true,profession:'craftsman',gold:20,errors:[]});
});

test('six reviews reach a stationary conclusion with no payments or forced historical outcome', async function ({page},info) {
  await beginBookmark(page,info,'634','damascus_household_634');
  expect(await page.evaluate(function () {
    const s = FB.state, id = 'damascus_household_track_634';
    const resources = JSON.stringify([s.player.gold,s.player.prestige,s.player.piety,s.owner,s.chars,s.player.provinceId]);
    const phases = [], results = [];
    ['take_stock','defer_work','review_records','keep_plans','stay','continue_life'].forEach(function (choice) {
      phases.push(s.stories[id].phase);
      results.push(FB.stories.apply(s,id,choice,FB.stories.quote(s,id,choice)));
    });
    return {phases:phases,results:results,phase:s.stories[id].phase,turn:s.turn,
      unchanged:resources === JSON.stringify([s.player.gold,s.player.prestige,s.player.piety,s.owner,s.chars,s.player.provinceId]),
      travel:s.player.travel || null,receipts:s.stories[id].householdReceipts,
      goals:Object.keys(s.stories.opening_damascus_634.goals).map(function (key) { return s.stories.opening_damascus_634.goals[key].status; })};
  })).toEqual({phases:['household','crafting','obligations','local_life','horizon','livelihood'],
    results:[true,true,true,true,true,true],phase:'stayed',turn:0,unchanged:true,travel:null,receipts:{},goals:['pending','pending','completed']});
});

test('detached JSON validation rejects a missing storyline and an invented payment without mutation', async function ({page},info) {
  await openGame(page,info);
  expect(await page.evaluate(function () {
    const sc = FBDATA.startScenarios.find(function (r) { return r.id === 'damascus_household_634'; });
    const graph = FBDATA.storyInstances.damascus_household_track_634;
    const before = JSON.stringify(FBDATA), rng = FB.getRngState(), uid = FB.getUidCounter();
    function candidate() {
      return JSON.parse(JSON.stringify({name:'Household review',
        startScenarios:[sc],storyInstances:{damascus_household_track_634:graph}}));
    }
    const valid = FB.mods.validate(candidate());
    const missing = candidate(); missing.startScenarios[0].tracks = ['opening_damascus_634'];
    delete missing.startScenarios[0].trackLocations.damascus_household_track_634;
    const payment = candidate(); payment.storyInstances.damascus_household_track_634.stages.household.choices[0].operation = {kind:'give_gold',amount:20};
    return {valid:valid,missing:FB.mods.validate(missing).length > 0,payment:FB.mods.validate(payment).length > 0,
      pure:before === JSON.stringify(FBDATA) && rng === FB.getRngState() && uid === FB.getUidCounter()};
  })).toEqual({valid:[],missing:true,payment:true,pure:true});
});

test('craft work requires actual income and survives matching saves without replay', async function ({page},info) {
  await beginBookmark(page,info,'634','damascus_household_634');
  await choose(page,'take_stock');
  expect(await page.evaluate(function () {
    let s = FB.state;
    const id = 'damascus_household_track_634', cash = s.player.gold;
    const q = FB.stories.quote(s,id,'work_bench'), picked = FB.stories.apply(s,id,'work_bench',q);
    const pending = s.stories[id].phase === 'working' && s.player.gold === cash;
    const repeat = FB.stories.apply(s,id,'work_bench',q);
    FB.save.restore(JSON.parse(FB.save.serialize())); s = FB.state;
    const restored = s.stories[id].phase === 'working' && s.player.gold === cash;
    s.turn++; FB.tickFocus(s);
    const paid = s.player.gold > cash, phase = s.stories[id].phase;
    const funds = s.player.gold, records = JSON.stringify(s.stories);
    FBDATA.bookmarks['634'].hidden = true;
    FB.save.restore(JSON.parse(FB.save.serialize())); s = FB.state;
    return {picked:picked,pending:pending,repeat:repeat,restored:restored,paid:paid,phase:phase,
      exact:funds === s.player.gold && records === JSON.stringify(s.stories),
      earnings:s.stories.opening_damascus_634.earnings.craft_work > 0,hidden:FB.bookmark('634').hidden};
  })).toEqual({picked:true,pending:true,repeat:false,restored:true,paid:true,phase:'obligations',exact:true,earnings:true,hidden:true});
});

test('poor households can decline travel and stale remote choices change no resources', async function ({page},info) {
  await beginBookmark(page,info,'634','damascus_household_634');
  for (const c of ['take_stock','defer_work','review_records','keep_plans','consider_journey']) expect(await choose(page,c)).toBe(true);
  expect(await page.evaluate(function () {
    const s = FB.state, id = 'damascus_household_track_634';
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
  await beginBookmark(page,info,'634','damascus_household_634');
  expect(await page.evaluate(function () {
    const s = FB.state, id = 'damascus_household_track_634';
    const kin = FB.householdMembers(s).filter(function (c) { return c.id !== s.player.charId; }).map(function (c) { return [c.id,c.homeProvinceId]; });
    // Stage the travel boundary; this graph neither creates nor prices a journey.
    const original = s.player.travel, gold = s.player.gold;
    s.player.travel = {phase:'outbound'};
    FB.stories.get(id).day(s,s.stories[id]);
    const phase = s.stories[id].phase; s.player.travel = original;
    return {phase:phase,goldSame:gold === s.player.gold,home:s.player.provinceId,
      kinStayed:kin.every(function (r) { return s.chars[r[0]].homeProvinceId === r[1]; }),goal:s.stories.opening_damascus_634.goals.home_decision.status};
  })).toEqual({phase:'personal_journey',goldSame:true,home:'damascus',kinStayed:true,goal:'pending'});
});

test('death and succession archive the protagonist and legacy hidden restore never attaches missing tracks', async function ({page},info) {
  await beginBookmark(page,info,'634','damascus_household_634');
  const saved = await page.evaluate(function () {
    let s = FB.state;
    const id = 'damascus_household_track_634', profile = 'opening_damascus_634', saved = JSON.parse(FB.save.serialize());
    s.player.dead = true; FB.stories.get(id).day(s,s.stories[id]); FB.stories.get(profile).day(s,s.stories[profile]);
    if (s.stories[id].phase !== 'interrupted' || s.stories[profile].goals.craft_income.status !== 'archived') throw new Error('Death did not archive the plan');
    FB.save.restore(saved); s = FB.state;
    s.player.charId = FB.householdMembers(s).find(function (c) { return c.id !== s.player.charId && !c.dead; }).id;
    FB.stories.get(id).day(s,s.stories[id]); FB.stories.get(profile).day(s,s.stories[profile]);
    if (s.stories[id].phase !== 'interrupted' || s.stories[profile].goals.craft_income.status !== 'archived') throw new Error('Succession inherited the plan');
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
      absent:!FB.state.stories.damascus_household_track_634 && !FB.state.stories.opening_damascus_634};
  })).toEqual({hidden:true,home:'damascus',absent:true});
});

test('shared work review cancels back to the story and restores its originating card', async function ({page},info) {
  await beginBookmark(page,info,'634','damascus_household_634');
  await choose(page,'take_stock');
  await page.locator('[data-tab="actions"]').click();
  await page.evaluate(function () { FB.ui.refresh(); });
  const card = page.locator('[data-story-card="' + ID + '"]');
  await card.click();
  await page.locator('[data-story-choice="work_bench"]').click();
  await expect(page.locator('#gm-story-confirm')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('[data-story-choice="defer_work"]')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(card).toBeFocused();
  expect(await page.evaluate(function () {
    return {gold:FB.state.player.gold,phase:FB.state.stories.damascus_household_track_634.phase};
  })).toEqual({gold:20,phase:'crafting'});
});

test('actual local authority changes produce one costless notice and matching saves retain its receipt', async function ({page},info) {
  await beginBookmark(page,info,'634','damascus_household_634');
  expect(await page.evaluate(function () {
    let s = FB.state;
    const id = 'damascus_household_observer_634', m = FB.stories.get(id), t = s.stories[id];
    const initial = JSON.stringify(t), cash = s.player.gold;
    m.day(s,t); m.season(s,t);
    const quiet = !FB.stories.status(s,id) && initial === JSON.stringify(t);
    // Stage an ordinary authority boundary, without declaring a campaign or harm.
    const from = FB.topRealm(s,s.owner.damascus), target = 'rashidun_634';
    if (!s.realms[target]) throw new Error('Missing ordinary authority fixture');
    s.turn = 4; FB.transferProvince(s,'damascus',target); FB.stories.day(s);
    const event = t.pending[0].event;
    const expected = event.source === 'control' && event.milestone === 'rule_changed' &&
      event.provinceId === 'damascus' && event.turn === 4 && event.before === from && event.after === target;
    const saved = JSON.parse(FB.save.serialize()), pending = JSON.stringify(t);
    FB.save.restore(saved); s = FB.state;
    const restored = pending === JSON.stringify(s.stories[id]);
    const quote = FB.stories.quote(s,id,'review_records'), read = JSON.stringify(s);
    FB.stories.status(s,id); FB.stories.choices(s,id);
    const pure = read === JSON.stringify(s);
    s.player.provinceId = 'hira';
    const remote = FB.stories.apply(s,id,'review_records',quote);
    s.player.provinceId = 'damascus';
    const applied = FB.stories.apply(s,id,'review_records',FB.stories.quote(s,id,'review_records'));
    const repeated = FB.stories.apply(s,id,'review_records',quote);
    const closed = JSON.stringify(s.stories[id]);
    FB.save.restore(JSON.parse(FB.save.serialize())); s = FB.state; m.day(s,s.stories[id]);
    return {quiet:quiet,expected:expected,restored:restored,pure:pure,remote:remote,applied:applied,repeated:repeated,
      closed:closed === JSON.stringify(s.stories[id]),quietAgain:!FB.stories.status(s,id),
      gold:s.player.gold === cash,receipts:Object.keys(s.stories[id].householdReceipts).length,
      campaigns:FB.stories.attached(s).filter(function (id) { return FB.stories.get(id).declaration.type === 'campaign'; }).length};
  })).toEqual({quiet:true,expected:true,restored:true,pure:true,remote:false,applied:true,repeated:false,
    closed:true,quietAgain:true,gold:true,receipts:1,campaigns:0});
});

test('a remote authority change and an unchanged local war create no local notice', async function ({page},info) {
  await beginBookmark(page,info,'634','damascus_household_634');
  expect(await page.evaluate(function () {
    const s = FB.state, id = 'damascus_household_observer_634', m = FB.stories.get(id), t = s.stories[id];
    const before = JSON.stringify(t);
    s.turn = 3; FB.transferProvince(s,'hira','byzantium_634'); m.day(s,t);
    const remoteQuiet = before === JSON.stringify(t);
    const rid = FB.topRealm(s,s.owner.damascus);
    s.realms[rid].war = {enemy:'rashidun_634'}; m.day(s,t);
    return {remoteQuiet:remoteQuiet,quiet:!FB.stories.status(s,id),pending:t.pending.length,receipts:Object.keys(t.householdReceipts).length};
  })).toEqual({remoteQuiet:true,quiet:true,pending:0,receipts:0});
});

test('ordinary JSON import supplies an independent household configuration and exact save identity', async function ({page},info) {
  await openGame(page,info);
  expect(await page.evaluate(function (mod) { return FB.mods.validate(mod); },require('../fixtures/authoring/damascus-household-plans.json'))).toEqual([]);
  await page.evaluate(function () { FB.ui.showMods(); });
  await page.locator('#modfile').setInputFiles(path.resolve(__dirname,'../fixtures/authoring/damascus-household-plans.json'));
  await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded'}),page.locator('#mod-apply').click()]);
  await prepareGameContent(page);
  await beginBookmarkFromTitle(page,'634','damascus_household_634');
  expect(await page.evaluate(function () {
    const s = FB.state, id = 'damascus_reserve_example', gold = s.player.gold;
    const applied = FB.stories.apply(s,id,'keep',FB.stories.quote(s,id,'keep'));
    const saved = JSON.parse(FB.save.serialize()); FB.save.restore(saved);
    return {gold:gold,unchanged:FB.state.player.gold === gold,applied:applied,phase:FB.state.stories[id].phase,
      original:!!FB.state.stories.damascus_household_track_634,identity:FB.state.chars[FB.state.player.charId].religion};
  })).toEqual({gold:12,unchanged:true,applied:true,phase:'done',original:false,identity:'chalcedonian_local_634'});
});
