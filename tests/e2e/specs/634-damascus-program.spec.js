'use strict';
const {test,expect} = require('../support/fixture');
const path = require('path');
const {openGame,prepareGameContent} = require('../support/game/navigation');
const {restoreBookmark} = require('../support/game/bookmark-acceptance');
const {dependsOnRuntime} = require('../support/runtime-dependencies');

dependsOnRuntime(__filename,['data/bookmark_manifest.js',
  'index.html','data/starts_634_damascus.js','data/story_households_634_damascus.js',
  'data/bookmark_634.js','data/bookmark_sources.js','data/bookmark_634_identities.js',
  'data/bookmark_634_courts.js','data/bookmark_634_scaffold_a.js','data/bookmark_634_scaffold_b.js',
  'data/bookmark_634_scaffold_c.js','data/bookmark_634_scaffold_d.js',
  'js/bookmark_composition.js','js/bookmark_sources.js','js/bookmark_setup.js',
  'js/story_household.js','js/story_household_observer.js','js/story_opening_goals.js',
  'js/stories.js','js/starts.js','js/main.js','js/actions.js','js/world.js',
  'js/save.js','js/save_v4.js','js/mods.js','js/travel.js','js/i18n.js'
].concat('abcdefghijklmnopqrst'.split('').map(function (c) { return 'data/bookmark_634_courts_'+c+'.js'; })));

const ID = 'damascus_household_full_634';
async function load(page,info) {
  await openGame(page,info); await prepareGameContent(page);
}
async function start(page,scenario) {
  const code = await page.evaluate(function (id) {
    const b = FBDATA.bookmarks['634'];
    if (!b) throw new Error(JSON.stringify(FB.bookmarkRuntimeDiagnostics()));
    b.revision = 'core_courts_v4'; b.revisions.core_courts_v4.hidden = false;
    const row = FBDATA.startScenarios.find(function (r) { return r.id === id; });
    const identity = FB.startIdentity(row,FB.bookmark('634'));
    const errors = FB.validateBookmark(FB.bookmark('634'));
    if (errors.length) throw new Error(errors.join('\n'));
    return 'DAMASCUS-634-'+id+'-damascus-m-Review-established-0-'+identity.startCulture+'.'+identity.startReligion;
  },scenario || 'damascus_household_634');
  const full = page.locator('#btn-choose-beginning');
  if (await full.isVisible()) await full.click();
  else await page.getByRole('button',{name:'New Game',exact:true}).click();
  await page.locator('#btn-bm-seed').click(); await page.locator('#ng-seed').fill(code);
  await page.locator('#ng-seed').press('Enter');
  await expect(page.locator('#chargen:not(.hidden)')).toBeVisible();
  await page.getByRole('button',{name:'Begin Your Story',exact:true}).click();
  await page.getByRole('button',{name:'Begin',exact:true}).click();
  await page.evaluate(function () { FB.game.setPaused(true); });
}
async function choose(page,choice) {
  expect(await page.evaluate(function (choice) {
    return FB.stories.apply(FB.state,'damascus_household_full_634',choice,
      FB.stories.quote(FB.state,'damascus_household_full_634',choice));
  },choice)).toBe(true);
}

test('every offered revision retains a resident identity and complete revision-specific attachments',async function ({page},info) {
  await load(page,info);
  expect(await page.evaluate(function () {
    const before = JSON.stringify(FBDATA), rng = FB.getRngState(), uid = FB.getUidCounter();
    const row = FBDATA.startScenarios.find(function (r) { return r.id === 'damascus_household_634'; });
    const revisions = FB.bookmarkRevisions('634').map(function (r) {
      const b = FB.bookmark('634',r.revision), identity = FB.startIdentity(row,b);
      const p = b.provinces.find(function (p) { return p.id === 'damascus'; });
      return {revision:r.revision,errors:FB.validateBookmark(b),resident:p.communities.some(function (c) {
        return c.culture === identity.startCulture && c.religion === identity.startReligion && c.populationShare0 > 0;
      }),tracks:FB.startTracks(row,'damascus',b)};
    });
    const full = FBDATA.storyInstances.damascus_household_full_634;
    return {revisions:revisions,pure:before === JSON.stringify(FBDATA) && rng === FB.getRngState() && uid === FB.getUidCounter(),
      stages:Object.keys(full.stages).filter(function (id) { return !full.stages[id].terminal; }).length,
      hidden:FB.bookmark('634','core_courts_v4').hidden,selected:FB.bookmark('634').revision,
      noCampaign:!full.requires,journeys:Object.keys(full.stages).some(function (id) {
        return full.stages[id].choices.some(function (c) { return c.operation.kind === 'travel_site'; });
      })};
  })).toEqual({revisions:['baseline','scenery_protected_v1','ordinary_settlement_v2','core_identities_v3','core_courts_v4'].map(function (revision) {
    return {revision:revision,errors:[],resident:true,tracks:revision === 'core_courts_v4' ? [ID,'opening_damascus_full_634'] : ['damascus_household_track_634','opening_damascus_634']};
  }),pure:true,stages:7,hidden:true,selected:'core_identities_v3',noCampaign:true,journeys:false});
});

test('no work and no change still conclude peacefully with minority identity and exact repeated saves',async function ({page},info) {
  await load(page,info); await start(page);
  expect(await page.evaluate(function () {
    const s = FB.state, id = 'damascus_household_full_634';
    s.player.gold = 0;
    const before = JSON.stringify([s.player.gold,s.player.prestige,s.player.piety,s.chars,s.owner,s.holdings]);
    const applied = ['take_stock','defer_work','keep_plans','stay','continue_life'].map(function (c) {
      return FB.stories.apply(s,id,c,FB.stories.quote(s,id,c));
    });
    const unchanged = before === JSON.stringify([s.player.gold,s.player.prestige,s.player.piety,s.chars,s.owner,s.holdings]);
    const saved = JSON.parse(FB.save.serialize()), stories = JSON.stringify(s.stories), gold = s.player.gold;
    FB.save.restore(saved); FB.save.restore(JSON.parse(FB.save.serialize()));
    return {applied:applied,unchanged:unchanged,phase:FB.state.stories[id].phase,
      exact:stories === JSON.stringify(FB.state.stories) && gold === FB.state.player.gold,
      faith:FB.state.chars[FB.state.player.charId].religion,turn:FB.state.turn,
      original:!!FB.state.stories.damascus_household_track_634,
      attachments:FB.state.start.storyAttachments.tracks,
      receipts:Object.keys(FB.state.stories[id].householdReceipts).length,
      goal:FB.state.stories.opening_damascus_full_634.goals.home_decision.status};
  })).toEqual({applied:[true,true,true,true,true],unchanged:true,phase:'stayed',exact:true,faith:'chalcedonian_local_634',turn:0,
    original:false,attachments:[ID,'opening_damascus_full_634'],receipts:0,goal:'completed'});
});

test('work advances only after ordinary pay and interruption never transfers the biography',async function ({page},info) {
  await load(page,info); await start(page); await choose(page,'take_stock'); await choose(page,'work_bench');
  expect(await page.evaluate(function () {
    let s = FB.state; const id = 'damascus_household_full_634', cash = s.player.gold;
    FB.stories.day(s);
    const waiting = s.stories[id].phase === 'working' && cash === 20;
    FB.save.restore(JSON.parse(FB.save.serialize())); s = FB.state;
    s.turn++; FB.tickFocus(s);
    const paid = s.player.gold > cash, phase = s.stories[id].phase;
    const saved = JSON.parse(FB.save.serialize()), funds = s.player.gold;
    FB.save.restore(saved); s = FB.state;
    const noReplay = s.player.gold === funds && s.stories[id].phase === phase;
    s.player.dead = true; FB.stories.day(s);
    const death = s.stories[id].phase;
    FB.save.restore(saved); s = FB.state;
    s.player.charId = FB.householdMembers(s).find(function (c) { return c.id !== s.player.charId && !c.dead; }).id;
    FB.stories.day(s);
    return {waiting:waiting,paid:paid,phase:phase,noReplay:noReplay,death:death,succession:s.stories[id].phase,
      archived:s.stories.opening_damascus_full_634.goals.home_decision.status};
  })).toEqual({waiting:true,paid:true,phase:'local_life',noReplay:true,death:'interrupted',succession:'interrupted',archived:'archived'});
});

test('personal authority review owns one shared receipt and rejects stale or remote confirmation',async function ({page},info) {
  await load(page,info); await start(page); await choose(page,'take_stock'); await choose(page,'defer_work');
  expect(await page.evaluate(function () {
    let s = FB.state; const id = 'damascus_household_full_634', observer = 'damascus_household_observer_634';
    const quiet = !FB.stories.status(s,observer), gold = s.player.gold, faith = s.chars[s.player.charId].religion;
    s.turn = 3; FB.transferProvince(s,'damascus','rashidun_634'); FB.stories.day(s);
    const reserved = !FB.stories.status(s,observer);
    const enter = FB.stories.apply(s,id,'review_control',FB.stories.quote(s,id,'review_control'));
    const q = FB.stories.quote(s,id,'acknowledge'), before = JSON.stringify(s);
    FB.stories.status(s,id); FB.stories.choices(s,id);
    const pure = before === JSON.stringify(s);
    const saved = JSON.parse(FB.save.serialize()); FB.save.restore(saved); s = FB.state;
    s.player.provinceId = 'hira'; const remote = FB.stories.apply(s,id,'acknowledge',q); s.player.provinceId = 'damascus';
    const applied = FB.stories.apply(s,id,'acknowledge',FB.stories.quote(s,id,'acknowledge'));
    const repeat = FB.stories.apply(s,id,'acknowledge',q);
    FB.stories.day(s);
    const keys = Object.keys(s.stories[id].householdReceipts), exact = JSON.stringify(s.stories);
    FB.save.restore(JSON.parse(FB.save.serialize())); s = FB.state; FB.stories.day(s);
    return {quiet:quiet,reserved:reserved,enter:enter,pure:pure,remote:remote,applied:applied,repeat:repeat,
      keys:keys.length,owner:s.stories[id].householdReceipts[keys[0]].owner,
      observerReceipts:Object.keys(s.stories[observer].householdReceipts).length,
      observerQuiet:!FB.stories.status(s,observer),exact:exact === JSON.stringify(s.stories),
      unchanged:gold === s.player.gold && faith === s.chars[s.player.charId].religion,phase:s.stories[id].phase};
  })).toEqual({quiet:true,reserved:true,enter:true,pure:true,remote:false,applied:true,repeat:false,keys:1,owner:ID,
    observerReceipts:0,observerQuiet:true,exact:true,unchanged:true,phase:'horizon'});
});

test('departure closes only the local program and preserves family, funds and current-content restore',async function ({page},info) {
  await load(page,info); await start(page);
  const saved = await page.evaluate(function () {
    const s = FB.state, id = 'damascus_household_full_634', cash = s.player.gold;
    const kin = JSON.stringify(FB.householdMembers(s).map(function (c) { return [c.id,c.homeProvinceId]; }));
    s.player.travel = {phase:'outbound'}; FB.stories.get(id).day(s,s.stories[id]); delete s.player.travel;
    if (s.stories[id].phase !== 'personal_journey' || s.player.gold !== cash ||
        kin !== JSON.stringify(FB.householdMembers(s).map(function (c) { return [c.id,c.homeProvinceId]; }))) throw new Error('Departure supplied unowned effects');
    return FB.save.serialize();
  });
  await restoreBookmark(page,saved);
  expect(await page.evaluate(function () { return FB.state.stories.damascus_household_full_634.phase; })).toBe('personal_journey');
});

test('ordinary JSON import offers an independent household program with exact saved mod identity',async function ({page},info) {
  await load(page,info);
  await page.evaluate(function () { FB.ui.showMods(); });
  await page.locator('#modfile').setInputFiles(path.resolve(__dirname,'../fixtures/authoring/damascus-local-program.json'));
  await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded'}),page.locator('#mod-apply').click()]);
  await prepareGameContent(page); await start(page,'damascus_apprentice_example');
  expect(await page.evaluate(function () {
    let s = FB.state; const id = 'damascus_apprentice_track', cash = s.player.gold;
    const applied = FB.stories.apply(s,id,'remain',FB.stories.quote(s,id,'remain'));
    const saved = JSON.parse(FB.save.serialize()), signature = JSON.stringify(saved.mods);
    FB.save.restore(saved); s = FB.state;
    const current = JSON.stringify(FBDATA), rng = FB.getRngState(), uid = FB.getUidCounter();
    const bad = JSON.parse(JSON.stringify({name:'Invalid household',storyInstances:{damascus_apprentice_track:FBDATA.storyInstances[id]}}));
    bad.storyInstances[id].stages.home.choices[0].operation = {kind:'give_gold',amount:20};
    const rejected = FB.mods.validate(bad).length > 0;
    return {applied:applied,phase:s.stories[id].phase,gold:s.player.gold,cash:cash,
      signature:signature === JSON.stringify(JSON.parse(FB.save.serialize()).mods),
      original:!!s.stories.damascus_household_full_634,rejected:rejected,
      pure:current === JSON.stringify(FBDATA) && rng === FB.getRngState() && uid === FB.getUidCounter()};
  })).toEqual({applied:true,phase:'done',gold:9,cash:9,signature:true,original:false,rejected:true,pure:true});
});

test('an unavailable household graph withholds its start while the world remains usable',async function ({page},info) {
  await page.route('**/data/story_households_634_damascus.js',function (route) {
    return route.fulfill({body:'',contentType:'application/javascript'});
  });
  await load(page,info);
  expect(await page.evaluate(function () {
    return {world:!!FB.bookmark('634','core_courts_v4'),
      start:FBDATA.startScenarios.some(function (r) { return r.id === 'damascus_household_634'; }),
      farmer:FBDATA.startScenarios.some(function (r) { return r.id === 'farmer_634'; }),
      full:!!FBDATA.storyInstances.damascus_household_full_634};
  })).toEqual({world:true,start:false,farmer:true,full:false});
});
