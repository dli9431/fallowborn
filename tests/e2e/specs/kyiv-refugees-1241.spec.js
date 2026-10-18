'use strict';
const {test,expect} = require('../support/fixture');
const {openGame} = require('../support/game/navigation');
const {beginBookmark,restoreBookmark} = require('../support/game/bookmark-acceptance');
const {dependsOnRuntime} = require('../support/runtime-dependencies');

dependsOnRuntime(__filename,[
  'index.html','data/starts_kyiv_refugees_1241.js','data/story_kyiv_refugees_1241.js',
  'data/bookmark_1241.js','data/identities_1241.js',
  'data/bookmark_1241_scaffold_a.js','data/bookmark_1241_scaffold_b.js',
  'data/bookmark_1241_scaffold_c.js','data/bookmark_1241_scaffold_d.js',
  'data/starts.js','data/story_instances.js','data/start_ambitions.js',
  'data/travel.js','data/events_travel.js','data/actions.js','data/economy.js',
  'data/settlements.js','data/settlements_real.js','data/geography_expansion.js',
  'data/eras.js','data/government_rollout.js','data/communal_revisions.js',
  'js/story_household.js','js/story_opening_goals.js','js/stories.js','js/starts.js',
  'js/bookmark_setup.js','js/actions.js','js/travel.js','js/events.js',
  'js/main.js','js/world.js','js/model.js','js/economy.js','js/save.js','js/save_v4.js',
  'js/i18n.js','js/ui_misc.js','js/ui_panels.js','js/ui_modals.js'
]);

const ID = 'kyiv_refugee_track_1241';

async function choose(page,choice) {
  return page.evaluate(function (choice) {
    const s = FB.state, id = 'kyiv_refugee_track_1241';
    return FB.stories.apply(s,id,choice,FB.stories.quote(s,id,choice));
  },choice);
}

async function roadReview(page,info) {
  await beginBookmark(page,info,'1241','kyiv_refugee_household_1241');
  for (const choice of ['take_stock','postpone_work','household_first','set_reports_aside','inspect_road']) {
    expect(await choose(page,choice)).toBe(true);
  }
}

test('the selectable date declares a complete resident household without changing older starts', async function ({page},info) {
  await openGame(page,info);
  expect(await page.evaluate(function () {
    const sc = FBDATA.startScenarios.find(function (r) { return r.id === 'kyiv_refugee_household_1241'; });
    const b = FB.bookmark('1241'), before = JSON.stringify(FBDATA), rng = FB.getRngState(), uid = FB.getUidCounter();
    const errors = FB.validateBookmark(b), county = b.provinces.find(function (p) { return p.id === 'volodymyr'; });
    return {hidden:b.hidden === true,offered:FB.bookmarkAvailable('1241'),errors:errors,bookmarks:sc.bookmarkIds,
      local:FB.startProvinceAllowed(sc,b,'volodymyr'),away:FB.startProvinceAllowed(sc,b,'lutsk'),
      older:Object.prototype.hasOwnProperty.call(FB.bookmark('1204').startLocations || {},sc.id),
      tracks:FB.startTracks(sc,'volodymyr'),awayTracks:FB.startTracks(sc,'lutsk'),story:FB.startStoryTracks(sc,'volodymyr'),
      resources:[sc.tier,sc.profession,sc.gold,sc.prestige,sc.piety],noGrant:!sc.startEffects && !sc.rulerRealmId,
      resident:county.communities.some(function (c) { return c.culture === 'rus' && c.religion === 'orthodox'; }),
      site:FBDATA.settlementLayouts[b.settlementLayout].volodymyr[0].site,
      pure:before === JSON.stringify(FBDATA) && rng === FB.getRngState() && uid === FB.getUidCounter()};
  })).toEqual({hidden:false,offered:true,errors:[],bookmarks:['1241'],local:true,away:false,older:false,
    tracks:[ID,'opening_kyiv_refugees_1241'],awayTracks:[],story:[ID],resources:[1,'craftsman',15,5,0],
    noGrant:true,resident:true,site:'volodymyr',pure:true});
  // beginBookmark follows the ordinary start-code and character-creation UI.
  await beginBookmark(page,info,'1241','kyiv_refugee_household_1241');
  expect(await page.evaluate(function () {
    const s = FB.state, c = s.chars[s.player.charId], site = FB.settlementsOf(s,'volodymyr')[s.player.homeSettlement];
    return {phase:s.stories.kyiv_refugee_track_1241.phase,actor:s.stories.kyiv_refugee_track_1241.actorId === c.id,
      home:s.player.provinceId,site:site.site,inCounty:FB.provinceAtGrid(site.x,site.y).id,
      age:FB.ageOf(c,s.date.year),identity:[c.culture,c.religion],family:FB.householdMembers(s).length > 1,
      resources:[s.player.profession,s.player.gold,s.player.prestige,s.player.piety],
      plots:s.player.landPlots.length,enterprises:s.player.enterprises.length,office:s.player.provs.length,
      goals:Object.keys(s.stories.opening_kyiv_refugees_1241.goals).length,
      noJobs:!s.stories.kyiv_refugee_track_1241.jobs,errors:FBTEST.checkInvariants()};
  })).toEqual({phase:'inventory',actor:true,home:'volodymyr',site:'volodymyr',inCounty:'volodymyr',age:24,
    identity:['rus','orthodox'],family:true,resources:['craftsman',15,5,0],plots:0,enterprises:0,office:0,goals:3,noJobs:true,errors:[]});
});

test('all eight reviews complete without work, a live report, a job or a journey', async function ({page},info) {
  await beginBookmark(page,info,'1241','kyiv_refugee_household_1241');
  expect(await page.evaluate(function () {
    const s = FB.state, id = 'kyiv_refugee_track_1241', money = [s.player.gold,s.player.prestige,s.player.piety];
    const owner = JSON.stringify(s.owner), chars = Object.keys(s.chars).length, health = s.chars[s.player.charId].health;
    const choices = ['take_stock','keep_looking','meet_later','remember_departure','postpone_road','review_home','continue_here'];
    const picked = choices.map(function (c) { return FB.stories.apply(s,id,c,FB.stories.quote(s,id,c)); });
    const g = s.stories.opening_kyiv_refugees_1241;
    return {picked:picked,phase:s.stories[id].phase,decisions:Object.keys(s.stories[id].decisions).length,
      same:JSON.stringify(money) === JSON.stringify([s.player.gold,s.player.prestige,s.player.piety]) && owner === JSON.stringify(s.owner) && chars === Object.keys(s.chars).length && health === s.chars[s.player.charId].health,
      home:s.player.provinceId,travel:s.player.travel,turn:s.turn,receipts:Object.keys(s.stories[id].householdReceipts).length,
      goals:[g.goals.craft_income.status,g.goals.household_reserve.status,g.goals.home_decision.status]};
  })).toEqual({picked:[true,true,true,true,true,true,true],phase:'future',decisions:7,same:true,home:'volodymyr',travel:null,turn:0,receipts:0,
    goals:['pending','pending','completed']});
});

test('craft income requires real work and restore never repeats a payment', async function ({page},info) {
  await beginBookmark(page,info,'1241','kyiv_refugee_household_1241');
  await choose(page,'work_first');
  expect(await page.evaluate(function () {
    let s = FB.state; const id = 'kyiv_refugee_track_1241';
    const quote = FB.stories.quote(s,id,'work_bench'), money = s.player.gold;
    const chosen = FB.stories.apply(s,id,'work_bench',quote), noWage = s.player.gold === money;
    const repeat = FB.stories.apply(s,id,'work_bench',quote);
    s.player.gold = 25; FB.stories.get('opening_kyiv_refugees_1241').day(s,s.stories.opening_kyiv_refugees_1241);
    FB.stories.get(id).day(s,s.stories[id]);
    const pending = s.stories[id].phase === 'working' && s.stories.opening_kyiv_refugees_1241.goals.craft_income.status === 'pending';
    const cash = s.player.gold; s.turn++; FB.tickFocus(s);
    const paid = s.player.gold > cash, phase = s.stories[id].phase, stories = JSON.stringify(s.stories), funds = s.player.gold;
    FB.save.restore(JSON.parse(FB.save.serialize())); s = FB.state;
    FB.stories.get(id).day(s,s.stories[id]);
    return {chosen:chosen,noWage:noWage,repeat:repeat,pending:pending,paid:paid,phase:phase,
      earnings:s.stories.opening_kyiv_refugees_1241.earnings.craft_work > 0,
      exact:funds === s.player.gold && stories === JSON.stringify(s.stories)};
  })).toEqual({chosen:true,noWage:true,repeat:false,pending:true,paid:true,phase:'earned',earnings:true,exact:true});
});

test('old reports and changed ownership neither inflict losses nor fabricate local incidents', async function ({page},info) {
  await beginBookmark(page,info,'1241','kyiv_refugee_household_1241');
  for (const c of ['take_stock','postpone_work','household_first']) await choose(page,c);
  expect(await page.evaluate(function () {
    const s = FB.state, id = 'kyiv_refugee_track_1241', quote = FB.stories.quote(s,id,'remember_departure');
    const health = s.chars[s.player.charId].health, cash = s.player.gold, plots = JSON.stringify(s.player.landPlots);
    FB.transferProvince(s,'kiev','hungary_1241');
    FB.stories.get(id).day(s,s.stories[id]);
    const stillReports = s.stories[id].phase === 'reports';
    FB.transferProvince(s,'volodymyr','hungary_1241');
    const stale = FB.stories.apply(s,id,'remember_departure',quote);
    FB.stories.get(id).day(s,s.stories[id]);
    const fresh = FB.stories.apply(s,id,'set_reports_aside',FB.stories.quote(s,id,'set_reports_aside'));
    return {stillReports:stillReports,stale:stale,fresh:fresh,phase:s.stories[id].phase,
      noLoss:cash === s.player.gold && health === s.chars[s.player.charId].health && plots === JSON.stringify(s.player.landPlots),
      receipts:Object.keys(s.stories[id].householdReceipts).length};
  })).toEqual({stillReports:true,stale:false,fresh:true,phase:'roads',noLoss:true,receipts:0});
});

test('poor, stale and unreachable travel reviews retain a complete free stay path', async function ({page},info) {
  await roadReview(page,info);
  expect(await page.evaluate(function () {
    const s = FB.state, id = 'kyiv_refugee_track_1241';
    function pick(c) { return FB.stories.apply(s,id,c,FB.stories.quote(s,id,c)); }
    s.player.gold = 0; const poor = pick('go_alone'), free = FB.stories.quote(s,id,'cancel_plan').allowed;
    s.player.gold = 1000; const quote = FB.stories.quote(s,id,'go_alone');
    s.player.gold--; const stale = FB.stories.apply(s,id,'go_alone',quote), money = s.player.gold;
    const adjacency = FB.world.adj.volodymyr; FB.world.adj.volodymyr = {};
    const unreachable = pick('go_alone'); FB.world.adj.volodymyr = adjacency;
    const complete = [pick('cancel_plan'),pick('review_home'),pick('continue_here')];
    return {poor:poor,free:free,stale:stale,unreachable:unreachable,complete:complete,
      phase:s.stories[id].phase,noCharge:money === s.player.gold,travel:s.player.travel};
  })).toEqual({poor:false,free:true,stale:false,unreachable:false,complete:[true,true,true],phase:'future',noCharge:true,travel:null});
});

test('a real solo journey charges once, restores in flight and distinguishes arrival from home', async function ({page},info) {
  await roadReview(page,info);
  const result = await page.evaluate(function () {
    let s = FB.state; const id = 'kyiv_refugee_track_1241';
    function pick(c) { return FB.stories.apply(s,id,c,FB.stories.quote(s,id,c)); }
    const kin = FB.householdMembers(s).filter(function (c) { return c.id !== s.player.charId; }).map(function (c) { return [c.id,c.homeProvinceId]; });
    s.player.gold = 1000; const q = FB.stories.quote(s,id,'go_alone'), money = s.player.gold;
    const began = FB.stories.apply(s,id,'go_alone',q), cost = money - s.player.gold, repeated = FB.stories.apply(s,id,'go_alone',q);
    const saved = JSON.stringify(s.player.travel), funds = s.player.gold, count = Object.keys(s.chars).length;
    FB.save.restore(JSON.parse(FB.save.serialize())); s = FB.state;
    const retained = saved === JSON.stringify(s.player.travel) && funds === s.player.gold && count === Object.keys(s.chars).length;
    for (let day = 0; day < 90 && s.player.travel.phase === 'outbound'; day++) { s.turn++; FB.travelTick(s); }
    FB.stories.get(id).day(s,s.stories[id]);
    const arrival = s.stories[id].phase, earlySettlement = pick('settle');
    const capstone = s.eventQueue.some(function (e) { return e.id === 'volhynian_visit_arrival_1241'; });
    const visited = pick('visit_only');
    return {began:began,cost:cost,quoted:q.facts.terms.cost,repeated:repeated,retained:retained,arrival:arrival,
      earlySettlement:earlySettlement,capstone:capstone,visited:visited,phase:s.stories[id].phase,
      home:s.player.provinceId,present:s.player.travel.currentId,kinStayed:kin.every(function (r) { return s.chars[r[0]].homeProvinceId === r[1]; })};
  });
  expect(result.cost).toBe(result.quoted);
  expect(result).toMatchObject({began:true,repeated:false,retained:true,arrival:'arrival',earlySettlement:false,
    capstone:true,visited:true,phase:'temporary',home:'volodymyr',present:'lutsk',kinStayed:true});
});

test('cancelled and unresolved journeys never become arrivals or household moves', async function ({page},info) {
  await roadReview(page,info);
  expect(await page.evaluate(function () {
    const s = FB.state, id = 'kyiv_refugee_track_1241';
    function pick(c) { return FB.stories.apply(s,id,c,FB.stories.quote(s,id,c)); }
    s.player.gold = 1000; const began = pick('go_alone'), saved = JSON.parse(FB.save.serialize());
    FB.travelCancel(s); FB.stories.get(id).day(s,s.stories[id]);
    const cancelled = s.stories[id].phase, closed = pick('continue_here');
    FB.save.restore(saved);
    const journey = JSON.stringify(FB.state.player.travel), funds = FB.state.player.gold;
    const unresolved = FB.stories.apply(FB.state,id,'leave_journey_open',FB.stories.quote(FB.state,id,'leave_journey_open'));
    return {began:began,cancelled:cancelled,closed:closed,unresolved:unresolved,phase:FB.state.stories[id].phase,
      unchanged:journey === JSON.stringify(FB.state.player.travel) && funds === FB.state.player.gold,home:FB.state.player.provinceId};
  })).toEqual({began:true,cancelled:'residence_home',closed:true,unresolved:true,phase:'unresolved',unchanged:true,home:'volodymyr'});
});

test('permanent settlement needs real residence and local work and restores without replay', async function ({page},info) {
  await roadReview(page,info);
  expect(await page.evaluate(function () {
    let s = FB.state; const id = 'kyiv_refugee_track_1241';
    function pick(c) { return FB.stories.apply(s,id,c,FB.stories.quote(s,id,c)); }
    s.player.gold = 1000; const began = pick('go_alone');
    for (let day = 0; day < 90 && s.player.travel.phase === 'outbound'; day++) { s.turn++; FB.travelTick(s); }
    FB.stories.get(id).day(s,s.stories[id]); FB.travelCapstoneDone(s);
    const early = pick('settle');
    // Stage the canonical residence boundary rather than simulating a year.
    s.turn += 360; s.date.year++; s.player.travel.workEvents = 4;
    const settled = pick('settle'), cash = s.player.gold, records = JSON.stringify(s.stories), count = Object.keys(s.chars).length;
    FB.save.restore(JSON.parse(FB.save.serialize())); s = FB.state;
    return {began:began,early:early,settled:settled,home:s.player.provinceId,travel:s.player.travel,phase:s.stories[id].phase,
      goal:s.stories.opening_kyiv_refugees_1241.goals.home_decision.status,plots:s.player.landPlots.length,
      exact:cash === s.player.gold && records === JSON.stringify(s.stories) && count === Object.keys(s.chars).length,
      repeat:pick('settle')};
  })).toEqual({began:true,early:false,settled:true,home:'lutsk',travel:null,phase:'resettled',goal:'completed',plots:0,exact:true,repeat:false});
});

test('the return choice completes only after the ordinary journey reaches home', async function ({page},info) {
  await roadReview(page,info);
  expect(await page.evaluate(function () {
    const s = FB.state, id = 'kyiv_refugee_track_1241';
    function pick(c) { return FB.stories.apply(s,id,c,FB.stories.quote(s,id,c)); }
    s.player.gold = 1000; pick('go_alone');
    for (let day = 0; day < 45 && s.player.travel.phase === 'outbound'; day++) { s.turn++; FB.travelTick(s); }
    FB.stories.get(id).day(s,s.stories[id]); FB.travelCapstoneDone(s);
    const early = pick('return_home');
    s.turn += 90; const returned = pick('return_home'), pending = s.stories[id].phase;
    for (let day = 0; day < 45 && s.player.travel; day++) { s.turn++; FB.travelTick(s); }
    FB.stories.get(id).day(s,s.stories[id]);
    return {early:early,returned:returned,pending:pending,phase:s.stories[id].phase,home:s.player.provinceId,travel:s.player.travel};
  })).toEqual({early:false,returned:true,pending:'returning',phase:'returned',home:'volodymyr',travel:null});
});

test('death and succession archive the opening and matching hidden restore attaches nothing new', async function ({page},info) {
  await beginBookmark(page,info,'1241','kyiv_refugee_household_1241');
  const saved = await page.evaluate(function () {
    let s = FB.state; const id = 'kyiv_refugee_track_1241', opening = 'opening_kyiv_refugees_1241', saved = JSON.parse(FB.save.serialize());
    s.player.dead = true;
    FB.stories.get(id).day(s,s.stories[id]); FB.stories.get(opening).day(s,s.stories[opening]);
    if (s.stories[id].phase !== 'interrupted' || s.stories[opening].goals.craft_income.status !== 'archived') throw new Error('Opening survived death');
    FB.save.restore(saved); s = FB.state;
    s.player.charId = FB.householdMembers(s).find(function (c) { return c.id !== s.player.charId && !c.dead; }).id;
    FB.stories.get(id).day(s,s.stories[id]); FB.stories.get(opening).day(s,s.stories[opening]);
    if (s.stories[id].phase !== 'interrupted' || s.stories[opening].goals.craft_income.status !== 'archived') throw new Error('Opening followed an heir');
    delete saved.state.stories[id]; delete saved.state.stories[opening];
    FBDATA.bookmarks['1241'].hidden = true;
    return JSON.stringify(saved);
  });
  await restoreBookmark(page,saved);
  expect(await page.evaluate(function () {
    return {hidden:FB.bookmark('1241').hidden,home:FB.state.player.provinceId,
      absent:!FB.state.stories.kyiv_refugee_track_1241 && !FB.state.stories.opening_kyiv_refugees_1241};
  })).toEqual({hidden:true,home:'volodymyr',absent:true});
});

test('the shared journey review cancels freely and confirms only the actual travel charge', async function ({page},info) {
  await roadReview(page,info);
  await page.evaluate(function () { FB.state.player.gold = 1000; FB.ui.refresh(); });
  await page.locator('[data-tab="actions"]').click();
  const card = page.locator('[data-story-card="' + ID + '"]');
  await card.click(); await page.locator('[data-story-choice="go_alone"]').click();
  await expect(page.locator('#gm-story-confirm')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('[data-story-choice="cancel_plan"]')).toBeVisible();
  await page.keyboard.press('Escape'); await expect(card).toBeFocused();
  expect(await page.evaluate(function () { return FB.state.player.gold; })).toBe(1000);
  await card.click(); await page.locator('[data-story-choice="go_alone"]').click();
  await page.locator('#gm-story-confirm').click();
  expect(await page.evaluate(function () {
    return {phase:FB.state.stories.kyiv_refugee_track_1241.phase,journey:!!FB.state.player.travel,
      charged:FB.state.player.gold < 1000,home:FB.state.player.provinceId};
  })).toEqual({phase:'travelling',journey:true,charged:true,home:'volodymyr'});
});
