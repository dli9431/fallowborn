'use strict';
const {test,expect} = require('../support/fixture');
const {openGame} = require('../support/game/navigation');
const {beginBookmark,restoreBookmark} = require('../support/game/bookmark-acceptance');
const {dependsOnRuntime} = require('../support/runtime-dependencies');

dependsOnRuntime(__filename,[
  'index.html','data/starts_568_ravenna.js','data/story_households_568_ravenna.js',
  'data/bookmark_568.js','data/bookmark_568_identities.js','data/starts_568.js',
  'data/bookmark_568_scaffold_a.js','data/bookmark_568_scaffold_b.js',
  'data/bookmark_568_scaffold_c.js','data/bookmark_568_scaffold_d.js',
  'data/starts.js','data/travel.js','data/events_travel.js','data/actions.js',
  'data/story_instances.js','data/economy.js','data/government_rollout.js',
  'data/communal_revisions.js','data/eras.js','data/technology.js',
  'js/story_household.js','js/story_opening_goals.js','js/stories.js','js/starts.js',
  'js/bookmark_setup.js','js/actions.js','js/travel.js','js/events.js','js/economy.js',
  'js/main.js','js/world.js','js/model.js','js/save.js','js/save_v4.js',
  'js/i18n.js','js/ui_misc.js','js/ui_panels.js'
]);

const ID = 'ravenna_household_track_568';

async function choose(page,choice) {
  return page.evaluate(function (choice) {
    const s = FB.state, id = 'ravenna_household_track_568';
    return FB.stories.apply(s,id,choice,FB.stories.quote(s,id,choice));
  },choice);
}

async function departure(page,info) {
  await beginBookmark(page,info,'568','ravenna_household_568');
  for (const choice of ['seek_customers','defer_work','inspect_road']) expect(await choose(page,choice)).toBe(true);
}

test('Ravenna binds a complete local storyline and optional goals to the selectable 568 world', async function ({page},info) {
  await openGame(page,info);
  expect(await page.evaluate(function () {
    const b = FB.bookmark('568'), sc = FBDATA.startScenarios.find(function (r) { return r.id === 'ravenna_household_568'; });
    const before = JSON.stringify(FBDATA), rng = FB.getRngState(), uid = FB.getUidCounter();
    const errors = FB.validateBookmark(b), county = b.provinces.find(function (p) { return p.id === 'ravenna'; });
    return {errors:errors,selectable:FB.bookmarkAvailable('568'),bookmarks:sc.bookmarkIds,
      local:FB.startProvinceAllowed(sc,b,'ravenna'),away:FB.startProvinceAllowed(sc,b,'bologna'),
      tracks:FB.startTracks(sc,'ravenna'),awayTracks:FB.startTracks(sc,'bologna'),
      storyline:FB.startStoryTracks(sc,'ravenna'),
      family:Object.keys(sc.familyPresets),resources:[sc.tier,sc.profession,sc.gold,sc.prestige,sc.piety],
      noGrant:!sc.startEffects && !sc.rulerRealmId,
      community:county.communities.some(function (c) { return c.culture === sc.startCulture && c.religion === sc.startReligion; }),
      sourceFree:!FBDATA.storyInstances.ravenna_household_track_568.requires,
      pure:before === JSON.stringify(FBDATA) && rng === FB.getRngState() && uid === FB.getUidCounter()};
  })).toEqual({errors:[],selectable:true,bookmarks:['568'],local:true,away:false,
    tracks:[ID,'opening_ravenna_568'],awayTracks:[],storyline:[ID],family:['established'],
    resources:[1,'craftsman',15,5,0],noGrant:true,community:true,sourceFree:true,pure:true});
  await beginBookmark(page,info,'568','ravenna_household_568');
  expect(await page.evaluate(function () {
    const s = FB.state, t = s.stories.ravenna_household_track_568, c = s.chars[s.player.charId];
    return {phase:t.phase,actor:t.actorId === c.id,home:s.player.provinceId,
      age:FB.ageOf(c,s.date.year),culture:c.culture,faith:c.religion,
      family:FB.householdMembers(s).length > 1,profession:s.player.profession,gold:s.player.gold,
      goals:Object.keys(s.stories.opening_ravenna_568.goals).length,
      noJobs:!t.jobs,errors:FBTEST.checkInvariants()};
  })).toEqual({phase:'household',actor:true,home:'ravenna',age:30,culture:'roman',faith:'nicene',
    family:true,profession:'craftsman',gold:15,goals:3,noJobs:true,errors:[]});
});

test('staying without purchases or work closes truthfully and grants no resources', async function ({page},info) {
  await beginBookmark(page,info,'568','ravenna_household_568');
  expect(await page.evaluate(function () {
    const s = FB.state, id = 'ravenna_household_track_568';
    const funds = [s.player.gold,s.player.prestige,s.player.piety], owner = JSON.stringify(s.owner), people = Object.keys(s.chars).length;
    function pick(c) { return FB.stories.apply(s,id,c,FB.stories.quote(s,id,c)); }
    const chosen = [pick('take_stock'),pick('keep_money'),pick('defer_work'),pick('stay')];
    const g = s.stories.opening_ravenna_568;
    return {chosen:chosen,phase:s.stories[id].phase,home:s.player.provinceId,travel:s.player.travel || null,
      same:JSON.stringify(funds) === JSON.stringify([s.player.gold,s.player.prestige,s.player.piety]) && owner === JSON.stringify(s.owner) && people === Object.keys(s.chars).length,
      goals:[g.goals.craft_income.status,g.goals.household_reserve.status,g.goals.home_decision.status]};
  })).toEqual({chosen:[true,true,true,true],phase:'stayed',home:'ravenna',travel:null,same:true,
    goals:['pending','pending','completed']});
});

test('supplies charge once and selecting craft work does not certify paid work', async function ({page},info) {
  await beginBookmark(page,info,'568','ravenna_household_568');
  expect(await choose(page,'take_stock')).toBe(true);
  expect(await page.evaluate(function () {
    const s = FB.state, id = 'ravenna_household_track_568', start = s.player.gold;
    const q = FB.stories.quote(s,id,'buy_supplies'), bought = FB.stories.apply(s,id,'buy_supplies',q);
    const charge = start - s.player.gold, repeat = FB.stories.apply(s,id,'buy_supplies',q);
    const cash = s.player.gold, worked = FB.stories.apply(s,id,'work_bench',FB.stories.quote(s,id,'work_bench'));
    const pending = s.stories[id].phase === 'working' && s.stories.opening_ravenna_568.goals.craft_income.status === 'pending';
    const noWage = cash === s.player.gold;
    s.turn++; FB.tickFocus(s);
    return {bought:bought,charge:charge,repeat:repeat,worked:worked,pending:pending,noWage:noWage,
      paid:s.player.gold > cash,phase:s.stories[id].phase,
      earnings:s.stories.opening_ravenna_568.earnings.craft_work > 0};
  })).toEqual({bought:true,charge:3,repeat:false,worked:true,pending:true,noWage:true,paid:true,phase:'earned',earnings:true});
});

test('goals distinguish a reserve from actual earnings and pay no reward', async function ({page},info) {
  await beginBookmark(page,info,'568','ravenna_household_568');
  expect(await choose(page,'seek_customers')).toBe(true);
  expect(await choose(page,'work_bench')).toBe(true);
  expect(await page.evaluate(function () {
    const s = FB.state, id = 'opening_ravenna_568', profile = FB.stories.get(id), t = s.stories[id];
    s.player.gold = 25; profile.day(s,t);
    const reserve = t.goals.household_reserve.status, notEarned = t.goals.craft_income.status;
    for (let day = 0; day < 30 && t.goals.craft_income.status === 'pending'; day++) { s.turn++; FB.tickFocus(s); }
    const cash = s.player.gold, record = JSON.stringify(t);
    profile.day(s,t); profile.day(s,t);
    return {reserve:reserve,notEarned:notEarned,earned:t.goals.craft_income.status,
      noReward:cash === s.player.gold,once:record === JSON.stringify(t)};
  })).toEqual({reserve:'completed',notEarned:'pending',earned:'completed',noReward:true,once:true});
});

test('stale, poor and remote supply reviews preserve the purse and a free fallback', async function ({page},info) {
  await beginBookmark(page,info,'568','ravenna_household_568');
  await choose(page,'take_stock');
  expect(await page.evaluate(function () {
    const s = FB.state, id = 'ravenna_household_track_568', quote = FB.stories.quote(s,id,'buy_supplies');
    FB.transferProvince(s,'ravenna','lombards_568');
    const cash = s.player.gold, stale = FB.stories.apply(s,id,'buy_supplies',quote), noCharge = cash === s.player.gold;
    s.player.gold = 0;
    const poor = FB.stories.quote(s,id,'buy_supplies').allowed, fallback = FB.stories.quote(s,id,'keep_money').allowed;
    s.player.gold = cash;
    const fresh = FB.stories.quote(s,id,'buy_supplies');
    s.player.provinceId = 'bologna';
    const remote = FB.stories.apply(s,id,'buy_supplies',fresh);
    FB.stories.get(id).day(s,s.stories[id]);
    return {stale:stale,noCharge:noCharge,poor:poor,fallback:fallback,remote:remote,phase:s.stories[id].phase,cashSame:cash === s.player.gold};
  })).toEqual({stale:false,noCharge:true,poor:false,fallback:true,remote:false,phase:'remote',cashSame:true});
});

test('a real journey charges its quote once, restores in flight and leaves relatives at home', async function ({page},info) {
  await departure(page,info);
  const result = await page.evaluate(function () {
    let s = FB.state;
    const id = 'ravenna_household_track_568';
    function pick(c) { return FB.stories.apply(s,id,c,FB.stories.quote(s,id,c)); }
    const kin = FB.householdMembers(s).filter(function (c) { return c.id !== s.player.charId; }).map(function (c) { return [c.id,c.homeProvinceId]; });
    s.player.gold = 0; const poor = pick('go_alone');
    s.player.gold = 1000;
    const q = FB.stories.quote(s,id,'go_alone'), money = s.player.gold;
    const begun = FB.stories.apply(s,id,'go_alone',q), charge = money - s.player.gold;
    const again = FB.stories.apply(s,id,'go_alone',q), journey = JSON.stringify(s.player.travel), funds = s.player.gold;
    FB.save.restore(JSON.parse(FB.save.serialize())); s = FB.state;
    const retained = journey === JSON.stringify(s.player.travel) && funds === s.player.gold;
    for (let day = 0; day < 90 && s.player.travel.phase === 'outbound'; day++) { s.turn++; FB.travelTick(s); }
    FB.stories.get(id).day(s,s.stories[id]);
    const arrived = s.stories[id].phase, earlySettlement = pick('settle');
    const arrivalQueued = s.eventQueue.some(function (e) { return e.id === 'ravenna_bononia_arrival_568'; });
    const capstone = FBDATA.events.find(function (e) { return e.id === 'ravenna_bononia_arrival_568'; });
    const noGrant = capstone.options.every(function (o) { return Object.keys(o.effects).join(',') === 'custom'; });
    const personal = pick('visit_only');
    return {poor:poor,begun:begun,charge:charge,cost:q.facts.terms.cost,again:again,retained:retained,
      arrived:arrived,arrivalQueued:arrivalQueued,earlySettlement:earlySettlement,noGrant:noGrant,personal:personal,home:s.player.provinceId,
      kinStayed:kin.every(function (r) { return s.chars[r[0]].homeProvinceId === r[1]; }),phase:s.stories[id].phase};
  });
  expect(result.charge).toBe(result.cost);
  expect(result).toMatchObject({poor:false,begun:true,again:false,retained:true,arrived:'arrival',arrivalQueued:true,earlySettlement:false,
    noGrant:true,personal:true,home:'ravenna',kinStayed:true,phase:'temporary'});
});

test('settlement needs the ordinary residence and work boundary and restores without replay', async function ({page},info) {
  await departure(page,info);
  expect(await page.evaluate(function () {
    let s = FB.state;
    const id = 'ravenna_household_track_568';
    function pick(c) { return FB.stories.apply(s,id,c,FB.stories.quote(s,id,c)); }
    s.player.gold = 1000; const begun = pick('go_alone');
    for (let day = 0; day < 90 && s.player.travel.phase === 'outbound'; day++) { s.turn++; FB.travelTick(s); }
    FB.stories.get(id).day(s,s.stories[id]); FB.travelCapstoneDone(s);
    // Stage the ordinary residence/work boundary; do not simulate a year.
    s.turn += 360; s.date.year++; s.player.travel.workEvents = 4;
    const settled = pick('settle'), money = s.player.gold, record = JSON.stringify(s.stories);
    FB.save.restore(JSON.parse(FB.save.serialize())); s = FB.state;
    return {begun:begun,settled:settled,home:s.player.provinceId,travel:s.player.travel,
      phase:s.stories[id].phase,goal:s.stories.opening_ravenna_568.goals.home_decision.status,
      exact:money === s.player.gold && record === JSON.stringify(s.stories),
      repeated:pick('settle')};
  })).toEqual({begun:true,settled:true,home:'bologna',travel:null,phase:'resettled',goal:'completed',exact:true,repeated:false});
});

test('unreachable and cancelled travel leaves a complete stay path without claiming arrival', async function ({page},info) {
  await departure(page,info);
  expect(await page.evaluate(function () {
    const s = FB.state, id = 'ravenna_household_track_568';
    function pick(c) { return FB.stories.apply(s,id,c,FB.stories.quote(s,id,c)); }
    const adjacency = FB.world.adj.ravenna; FB.world.adj.ravenna = {};
    const unreachable = pick('go_alone'), postpone = FB.stories.quote(s,id,'postpone').allowed;
    FB.world.adj.ravenna = adjacency;
    const began = pick('go_alone'); FB.travelCancel(s);
    FB.stories.get(id).day(s,s.stories[id]);
    return {unreachable:unreachable,postpone:postpone,began:began,phase:s.stories[id].phase,home:s.player.provinceId,
      goal:s.stories.opening_ravenna_568.goals.home_decision.status};
  })).toEqual({unreachable:false,postpone:true,began:true,phase:'interrupted_journey',home:'ravenna',goal:'pending'});
});

test('the return option completes an actual personal round trip', async function ({page},info) {
  await departure(page,info);
  expect(await page.evaluate(function () {
    const s = FB.state, id = 'ravenna_household_track_568';
    function pick(c) { return FB.stories.apply(s,id,c,FB.stories.quote(s,id,c)); }
    pick('go_alone');
    for (let day = 0; day < 45 && s.player.travel.phase === 'outbound'; day++) { s.turn++; FB.travelTick(s); }
    FB.stories.get(id).day(s,s.stories[id]); FB.travelCapstoneDone(s);
    // Stage the minimum-stay boundary without simulating another season.
    s.turn += 90;
    const returning = pick('return_home');
    for (let day = 0; day < 45 && s.player.travel; day++) { s.turn++; FB.travelTick(s); }
    FB.stories.get(id).day(s,s.stories[id]);
    return {returning: returning,phase:s.stories[id].phase,home:s.player.provinceId,travel:s.player.travel || null};
  })).toEqual({returning:true,phase:'returned',home:'ravenna',travel:null});
});

test('death and succession archive personal plans and hidden restore never initializes missing tracks', async function ({page},info) {
  await beginBookmark(page,info,'568','ravenna_household_568');
  const saved = await page.evaluate(function () {
    let s = FB.state;
    const id = 'ravenna_household_track_568';
    const saved = JSON.parse(FB.save.serialize());
    s.player.dead = true;
    FB.stories.get(id).day(s,s.stories[id]); FB.stories.get('opening_ravenna_568').day(s,s.stories.opening_ravenna_568);
    if (s.stories[id].phase !== 'interrupted' || s.stories.opening_ravenna_568.goals.craft_income.status !== 'archived') throw new Error('Personal plans survived death');
    FB.save.restore(saved); s = FB.state;
    // Stage the successor boundary without replaying the opening for the heir.
    s.player.charId = FB.householdMembers(s).find(function (c) { return c.id !== s.player.charId && !c.dead; }).id;
    FB.stories.get(id).day(s,s.stories[id]); FB.stories.get('opening_ravenna_568').day(s,s.stories.opening_ravenna_568);
    if (s.stories[id].phase !== 'interrupted' || s.stories.opening_ravenna_568.goals.craft_income.status !== 'archived') throw new Error('Personal plans survived succession');
    delete saved.state.stories[id]; delete saved.state.stories.opening_ravenna_568;
    FBDATA.bookmarks['568'].hidden = true;
    return JSON.stringify(saved);
  });
  await restoreBookmark(page,saved);
  expect(await page.evaluate(function () {
    return {hidden:FB.bookmark('568').hidden,home:FB.state.player.provinceId,
      absent:!FB.state.stories.ravenna_household_track_568 && !FB.state.stories.opening_ravenna_568};
  })).toEqual({hidden:true,home:'ravenna',absent:true});
});

test('the shared supply review cancels freely and confirms only one private purchase', async function ({page},info) {
  await beginBookmark(page,info,'568','ravenna_household_568');
  await choose(page,'take_stock');
  await page.locator('[data-tab="actions"]').click();
  await page.evaluate(function () { FB.ui.refresh(); });
  const card = page.locator('[data-story-card="' + ID + '"]');
  await card.click();
  await page.locator('[data-story-choice="buy_supplies"]').click();
  await expect(page.locator('#gm-story-confirm')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('[data-story-choice="keep_money"]')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(card).toBeFocused();
  expect(await page.evaluate(function () { return FB.state.player.gold; })).toBe(15);
  await card.click(); await page.locator('[data-story-choice="buy_supplies"]').click();
  await page.locator('#gm-story-confirm').click();
  expect(await page.evaluate(function () {
    return {gold:FB.state.player.gold,phase:FB.state.stories.ravenna_household_track_568.phase};
  })).toEqual({gold:12,phase:'customers'});
});
