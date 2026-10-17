'use strict';
const {test,expect} = require('../support/fixture');
const {openGame} = require('../support/game/navigation');
const {beginBookmark,restoreBookmark} = require('../support/game/bookmark-acceptance');
const {dependsOnRuntime} = require('../support/runtime-dependencies');

dependsOnRuntime(__filename,[
  'index.html','data/starts_pilgrim_1096.js','data/story_pilgrim_1096.js',
  'data/bookmark_1096.js','data/identities_1096.js',
  'data/bookmark_1096_scaffold_a.js','data/bookmark_1096_scaffold_b.js',
  'data/bookmark_1096_scaffold_c.js','data/bookmark_1096_scaffold_d.js',
  'data/starts.js','data/travel.js','data/events_travel.js','data/actions.js',
  'data/story_instances.js','data/economy.js','data/government_rollout.js',
  'data/communal_revisions.js','data/eras.js','data/technology.js',
  'js/story_household.js','js/story_opening_goals.js','js/stories.js','js/starts.js',
  'js/bookmark_setup.js','js/actions.js','js/travel.js','js/events.js','js/economy.js',
  'js/main.js','js/world.js','js/model.js','js/save.js','js/save_v4.js',
  'js/i18n.js','js/ui_misc.js','js/ui_panels.js'
]);

const ID = 'pilgrim_household_track_1096';

async function choose(page,choice) {
  return page.evaluate(function (choice) {
    const s = FB.state, id = 'pilgrim_household_track_1096';
    return FB.stories.apply(s,id,choice,FB.stories.quote(s,id,choice));
  },choice);
}

async function departure(page,info) {
  await beginBookmark(page,info,'1096','pilgrim_household_1096');
  for (const choice of ['take_stock','review_journey']) expect(await choose(page,choice)).toBe(true);
}

test('a complete Cologne household and goals are registered behind the hidden bookmark gate', async function ({page},info) {
  await openGame(page,info);
  expect(await page.evaluate(function () {
    const b = FB.bookmark('1096'), sc = FBDATA.startScenarios.find(function (r) { return r.id === 'pilgrim_household_1096'; });
    const source = JSON.stringify(FBDATA), rng = FB.getRngState(), uid = FB.getUidCounter();
    const errors = FB.validateBookmark(b), county = b.provinces.find(function (p) { return p.id === 'cologne'; });
    return {errors:errors,hidden:b.hidden,offered:FB.bookmarkAvailable('1096'),bookmarks:sc.bookmarkIds,
      local:FB.startProvinceAllowed(sc,b,'cologne'),away:FB.startProvinceAllowed(sc,b,'mainz'),
      tracks:FB.startTracks(sc,'cologne'),awayTracks:FB.startTracks(sc,'mainz'),storyline:FB.startStoryTracks(sc,'cologne'),
      family:Object.keys(sc.familyPresets),resources:[sc.startAge,sc.tier,sc.profession,sc.gold,sc.prestige,sc.piety],
      noGrant:!sc.startEffects && !sc.rulerRealmId,community:county.communities.some(function (c) { return c.culture === sc.startCulture && c.religion === sc.startReligion; }),
      sourceFree:!FBDATA.storyInstances.pilgrim_household_track_1096.requires,
      pure:source === JSON.stringify(FBDATA) && rng === FB.getRngState() && uid === FB.getUidCounter()};
  })).toEqual({errors:[],hidden:true,offered:false,bookmarks:['1096'],local:true,away:false,
    tracks:[ID,'opening_pilgrim_1096'],awayTracks:[],storyline:[ID],family:['established'],
    resources:[30,1,'craftsman',15,5,0],noGrant:true,community:true,sourceFree:true,pure:true});
  await beginBookmark(page,info,'1096','pilgrim_household_1096');
  expect(await page.evaluate(function () {
    const s = FB.state, c = s.chars[s.player.charId], profile = s.stories.opening_pilgrim_1096;
    return {phase:s.stories.pilgrim_household_track_1096.phase,home:s.player.provinceId,
      age:FB.ageOf(c,s.date.year),culture:c.culture,faith:c.religion,profession:s.player.profession,
      gold:s.player.gold,family:FB.householdMembers(s).length > 1,travel:s.player.travel || null,
      goals:Object.keys(profile.goals).length,contact:FB.stories.resolve(s,{kind:'realm_ruler',realmId:'hre_1096'}) === profile.contacts.imperial_ruler,
      errors:FBTEST.checkInvariants()};
  })).toEqual({phase:'household',home:'cologne',age:30,culture:'german',faith:'catholic',profession:'craftsman',
    gold:15,family:true,travel:null,goals:3,contact:true,errors:[]});
});

test('the stay and postpone paths create no income, journey, command or protection', async function ({page},info) {
  await departure(page,info);
  expect(await page.evaluate(function () {
    const s = FB.state, id = 'pilgrim_household_track_1096';
    const funds = [s.player.gold,s.player.prestige,s.player.piety], owner = JSON.stringify(s.owner), people = Object.keys(s.chars).length;
    function pick(c) { return FB.stories.apply(s,id,c,FB.stories.quote(s,id,c)); }
    const chosen = [pick('postpone'),pick('keep_livelihood')], goals = s.stories.opening_pilgrim_1096.goals;
    return {chosen:chosen,phase:s.stories[id].phase,home:s.player.provinceId,travel:s.player.travel || null,
      same:JSON.stringify(funds) === JSON.stringify([s.player.gold,s.player.prestige,s.player.piety]) && owner === JSON.stringify(s.owner) && people === Object.keys(s.chars).length,
      goals:[goals.craft_income.status,goals.private_reserve.status,goals.home_decision.status]};
  })).toEqual({chosen:[true,true],phase:'stayed',home:'cologne',travel:null,same:true,goals:['pending','pending','completed']});
});

test('work selection and savings cannot masquerade as earned craft income', async function ({page},info) {
  await beginBookmark(page,info,'1096','pilgrim_household_1096');
  for (const choice of ['take_stock','prepare','work_bench']) expect(await choose(page,choice)).toBe(true);
  expect(await page.evaluate(function () {
    const s = FB.state, profile = FB.stories.get('opening_pilgrim_1096'), t = s.stories.opening_pilgrim_1096;
    const working = s.stories.pilgrim_household_track_1096.phase;
    s.player.gold = 50; profile.day(s,t);
    const reserve = t.goals.private_reserve.status, notEarned = t.goals.craft_income.status;
    const cash = s.player.gold; s.turn++; FB.tickFocus(s);
    const phase = s.stories.pilgrim_household_track_1096.phase, paid = s.player.gold > cash;
    for (let day = 0; day < 45 && t.goals.craft_income.status === 'pending'; day++) { s.turn++; FB.tickFocus(s); }
    const money = s.player.gold, snapshot = JSON.stringify(t); profile.day(s,t); profile.day(s,t);
    return {working:working,reserve:reserve,notEarned:notEarned,paid:paid,phase:phase,
      earned:t.goals.craft_income.status,noReward:money === s.player.gold,once:snapshot === JSON.stringify(t)};
  })).toEqual({working:'working',reserve:'completed',notEarned:'pending',paid:true,phase:'earned',earned:'completed',noReward:true,once:true});
});

test('poor, imprisoned, disconnected and stale departure reviews retain a free fallback', async function ({page},info) {
  await departure(page,info);
  expect(await page.evaluate(function () {
    const s = FB.state, id = 'pilgrim_household_track_1096';
    function q() { return FB.stories.quote(s,id,'go_alone'); }
    s.player.gold = 0; const poor = q().allowed, fallback = FB.stories.quote(s,id,'stay_instead').allowed;
    s.player.gold = 1000; s.player.flags.in_prison = 1; const prisoner = q().allowed; delete s.player.flags.in_prison;
    const adj = FB.world.adj.cologne; FB.world.adj.cologne = {}; const disconnected = q().allowed; FB.world.adj.cologne = adj;
    const stale = q(); s.player.gold--;
    const cash = s.player.gold, rejected = FB.stories.apply(s,id,'go_alone',stale);
    return {poor:poor,fallback:fallback,prisoner:prisoner,disconnected:disconnected,rejected:rejected,
      noCharge:cash === s.player.gold,phase:s.stories[id].phase,travel:s.player.travel || null,
      constantinople:FB.travelSiteSnapshot(s,'pilgrim_constantinople')};
  })).toEqual({poor:false,fallback:true,prisoner:false,disconnected:false,rejected:false,noCharge:true,phase:'departure',travel:null,constantinople:null});
});

test('solo pilgrimage pays exactly the ordinary quote, leaves kin home and restores in flight', async function ({page},info) {
  await departure(page,info);
  expect(await page.evaluate(function () {
    let s = FB.state; const id = 'pilgrim_household_track_1096';
    const kin = FB.householdMembers(s).filter(function (c) { return c.id !== s.player.charId; }).map(function (c) { return [c.id,c.homeProvinceId]; });
    s.player.gold = 1000;
    const q = FB.stories.quote(s,id,'go_alone'), cash = s.player.gold;
    const started = FB.stories.apply(s,id,'go_alone',q), exactCharge = cash - s.player.gold === q.facts.terms.cost;
    const repeated = FB.stories.apply(s,id,'go_alone',q), journey = JSON.stringify(s.player.travel), funds = s.player.gold, record = JSON.stringify(s.stories);
    FB.save.restore(JSON.parse(FB.save.serialize())); s = FB.state;
    return {started:started,exactCharge:exactCharge,repeated:repeated,home:s.player.provinceId,
      destination:s.player.travel.destinationId,purpose:s.player.travel.purpose,phase:s.stories[id].phase,
      retained:journey === JSON.stringify(s.player.travel) && funds === s.player.gold && record === JSON.stringify(s.stories),
      kinStayed:kin.every(function (r) { return s.chars[r[0]].homeProvinceId === r[1]; }),
      goal:s.stories.opening_pilgrim_1096.goals.home_decision.status};
  })).toEqual({started:true,exactCharge:true,repeated:false,home:'cologne',destination:'jerusalem',purpose:'pilgrimage',phase:'travelling',retained:true,kinStayed:true,goal:'pending'});
});

test('arrival is observed only after the canonical final leg and return waits for actual home arrival', async function ({page},info) {
  await departure(page,info);
  expect(await page.evaluate(function () {
    const s = FB.state, id = 'pilgrim_household_track_1096', story = FB.stories.get(id);
    function pick(c) { return FB.stories.apply(s,id,c,FB.stories.quote(s,id,c)); }
    s.player.gold = 1000; const started = pick('go_alone'), t = s.player.travel;
    // Stage the last real route leg; the test targets observation and return,
    // not months of daily simulation or the independent road encounters.
    t.currentId = t.outboundRoute[t.outboundRoute.length - 2] || t.homeId;
    t.visited = [t.homeId].concat(t.outboundRoute.slice(0,-1));
    t.remainingRoute = [t.destinationId]; t.legDaysLeft = 1;
    const before = s.stories[id].phase; s.turn++; FB.travelTick(s); story.day(s,s.stories[id]);
    const arrival = s.stories[id].phase, pending = s.stories.opening_pilgrim_1096.goals.home_decision.status;
    const queued = s.eventQueue.some(function (e) { return e.id === FBDATA.travelRules.pilgrimage.arrivalEvent; });
    FB.travelCapstoneDone(s);
    const early = pick('return_home'); s.turn += FBDATA.balance.travelMinStayDays || 90;
    const returning = pick('return_home'), stillPending = s.stories.opening_pilgrim_1096.goals.home_decision.status;
    t.currentId = t.outboundRoute[0]; t.remainingRoute = [t.homeId]; t.legDaysLeft = 1;
    s.turn++; FB.travelTick(s); story.day(s,s.stories[id]);
    FB.stories.get('opening_pilgrim_1096').day(s,s.stories.opening_pilgrim_1096);
    return {started:started,before:before,arrival:arrival,pending:pending,queued:queued,early:early,returning:returning,
      stillPending:stillPending,phase:s.stories[id].phase,home:s.player.provinceId,travel:s.player.travel || null,
      completed:s.stories.opening_pilgrim_1096.goals.home_decision.status};
  })).toEqual({started:true,before:'travelling',arrival:'arrival',pending:'pending',queued:true,early:false,returning:true,
    stillPending:'pending',phase:'returned',home:'cologne',travel:null,completed:'completed'});
});

test('turning back and cancellation do not claim a destination arrival', async function ({page},info) {
  await departure(page,info);
  expect(await page.evaluate(function () {
    const s = FB.state, id = 'pilgrim_household_track_1096', story = FB.stories.get(id);
    function pick(c) { return FB.stories.apply(s,id,c,FB.stories.quote(s,id,c)); }
    const initial = JSON.parse(FB.save.serialize());
    s.player.gold = 1000; const started = pick('go_alone'), returned = pick('turn_back');
    story.day(s,s.stories[id]);
    const actual = s.stories[id].phase;
    FB.save.restore(initial);
    const restored = FB.state; restored.player.gold = 1000;
    FB.stories.apply(restored,id,'go_alone',FB.stories.quote(restored,id,'go_alone'));
    FB.travelCancel(restored); story.day(restored,restored.stories[id]);
    return {started:started,turnedBack:returned,actual:actual,cancelled:restored.stories[id].phase,
      home:restored.player.provinceId,goal:restored.stories.opening_pilgrim_1096.goals.home_decision.status};
  })).toEqual({started:true,turnedBack:true,actual:'returned',cancelled:'journey_ended',home:'cologne',goal:'pending'});
});

test('the bounded opening closes without cancelling a live personal journey', async function ({page},info) {
  await departure(page,info);
  expect(await page.evaluate(function () {
    const s = FB.state, id = 'pilgrim_household_track_1096'; s.player.gold = 1000;
    FB.stories.apply(s,id,'go_alone',FB.stories.quote(s,id,'go_alone'));
    const travel = JSON.stringify(s.player.travel), cash = s.player.gold;
    s.date.year = 1097; s.date.season = 0; s.date.day = 1; s.turn = 360;
    FB.stories.get(id).day(s,s.stories[id]);
    return {phase:s.stories[id].phase,home:s.player.provinceId,
      same:travel === JSON.stringify(s.player.travel) && cash === s.player.gold,
      pending:s.stories.opening_pilgrim_1096.goals.home_decision.status};
  })).toEqual({phase:'deferred',home:'cologne',same:true,pending:'pending'});
});

test('death and succession archive the personal graph and missing saved tracks remain missing', async function ({page},info) {
  await beginBookmark(page,info,'1096','pilgrim_household_1096');
  const saved = await page.evaluate(function () {
    let s = FB.state; const id = 'pilgrim_household_track_1096', saved = JSON.parse(FB.save.serialize());
    s.player.dead = true;
    FB.stories.get(id).day(s,s.stories[id]); FB.stories.get('opening_pilgrim_1096').day(s,s.stories.opening_pilgrim_1096);
    if (s.stories[id].phase !== 'interrupted' || s.stories.opening_pilgrim_1096.goals.craft_income.status !== 'archived') throw new Error('Personal plan survived death');
    FB.save.restore(saved); s = FB.state;
    s.player.charId = FB.householdMembers(s).find(function (c) { return c.id !== s.player.charId && !c.dead; }).id;
    FB.stories.get(id).day(s,s.stories[id]); FB.stories.get('opening_pilgrim_1096').day(s,s.stories.opening_pilgrim_1096);
    if (s.stories[id].phase !== 'interrupted' || s.stories.opening_pilgrim_1096.goals.craft_income.status !== 'archived') throw new Error('Personal plan replayed for heir');
    delete saved.state.stories[id]; delete saved.state.stories.opening_pilgrim_1096;
    FBDATA.bookmarks['1096'].hidden = true;
    return JSON.stringify(saved);
  });
  await restoreBookmark(page,saved);
  expect(await page.evaluate(function () {
    return {hidden:FB.bookmark('1096').hidden,home:FB.state.player.provinceId,
      absent:!FB.state.stories.pilgrim_household_track_1096 && !FB.state.stories.opening_pilgrim_1096};
  })).toEqual({hidden:true,home:'cologne',absent:true});
});

test('shared journey review cancels freely and confirms a single ordinary fare', async function ({page},info) {
  await departure(page,info);
  await page.evaluate(function () { FB.state.player.gold = 1000; });
  await page.locator('[data-tab="actions"]').click();
  await page.evaluate(function () { FB.ui.refresh(); });
  const card = page.locator('[data-story-card="' + ID + '"]');
  await card.click(); await page.locator('[data-story-choice="go_alone"]').click();
  await expect(page.locator('#gm-story-confirm')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('[data-story-choice="postpone"]')).toBeVisible();
  await page.keyboard.press('Escape'); await expect(card).toBeFocused();
  expect(await page.evaluate(function () { return [FB.state.player.gold,FB.state.player.travel || null]; })).toEqual([1000,null]);
  const cost = await page.evaluate(function () { return FB.stories.quote(FB.state,'pilgrim_household_track_1096','go_alone').facts.terms.cost; });
  await card.click(); await page.locator('[data-story-choice="go_alone"]').click();
  await page.locator('#gm-story-confirm').click();
  expect(await page.evaluate(function () {
    return {gold:FB.state.player.gold,phase:FB.state.stories.pilgrim_household_track_1096.phase,home:FB.state.player.provinceId};
  })).toEqual({gold:1000-cost,phase:'travelling',home:'cologne'});
});
