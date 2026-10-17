'use strict';
const {test,expect} = require('../support/fixture');
const {openGame} = require('../support/game/navigation');
const {beginBookmark,restoreBookmark} = require('../support/game/bookmark-acceptance');
const {dependsOnRuntime} = require('../support/runtime-dependencies');

dependsOnRuntime(__filename,[
  'index.html','data/starts_1241.js','data/story_households_1241.js',
  'data/bookmark_1241.js','data/bookmark_1241_scaffold_a.js',
  'data/bookmark_1241_scaffold_b.js','data/bookmark_1241_scaffold_c.js',
  'data/bookmark_1241_scaffold_d.js','data/identities_1241.js','data/starts.js',
  'data/travel.js','data/events_travel.js','data/actions.js','data/economy.js',
  'data/story_instances.js','data/settlements.js','data/settlements_real.js',
  'js/story_household.js','js/story_opening_goals.js','js/stories.js','js/starts.js',
  'js/bookmark_setup.js','js/actions.js','js/travel.js','js/events.js','js/wars.js',
  'js/main.js','js/world.js','js/model.js','js/save.js','js/save_v4.js',
  'js/ui_misc.js','js/ui_panels.js'
]);

const ID = 'hungarian_village_track_1241';
const SCENARIO = 'hungarian_village_household_1241';

async function choose(page,choice) {
  return page.evaluate(function (choice) {
    const s = FB.state, id = 'hungarian_village_track_1241';
    return FB.stories.apply(s,id,choice,FB.stories.quote(s,id,choice));
  },choice);
}

async function departure(page,info) {
  await beginBookmark(page,info,'1241',SCENARIO);
  for (const c of ['seek_work','defer_work','inspect_road']) expect(await choose(page,c)).toBe(true);
}

test('the fictional farm has a complete place-bound story and ordinary farmer property', async function ({page},info) {
  await openGame(page,info);
  expect(await page.evaluate(function () {
    const b = FB.bookmark('1241'), sc = FBDATA.startScenarios.find(function (r) { return r.id === 'hungarian_village_household_1241'; });
    const data = JSON.stringify(FBDATA), rng = FB.getRngState(), uid = FB.getUidCounter();
    const errors = FB.validateBookmark(b), p = b.provinces.find(function (r) { return r.id === 'szekesfehervar'; });
    return {errors:errors,hidden:b.hidden,bookmarks:sc.bookmarkIds,
      local:FB.startProvinceAllowed(sc,b,'szekesfehervar'),away:FB.startProvinceAllowed(sc,b,'bratislava'),
      tracks:FB.startTracks(sc,'szekesfehervar'),awayTracks:FB.startTracks(sc,'bratislava'),
      storyline:FB.startStoryTracks(sc,'szekesfehervar'),family:Object.keys(sc.familyPresets),
      stock:[sc.tier,sc.profession,sc.gold,sc.prestige,sc.piety,sc.startEffects.landPlots],
      community:p.communities.some(function (c) { return c.culture === sc.startCulture && c.religion === sc.startReligion; }),
      noOffice:!sc.rulerRealmId,noInventedIncident:!FBDATA.storyInstances.hungarian_village_track_1241.requires,
      pure:data === JSON.stringify(FBDATA) && rng === FB.getRngState() && uid === FB.getUidCounter()};
  })).toEqual({errors:[],hidden:true,bookmarks:['1241'],local:true,away:false,
    tracks:[ID,'opening_hungarian_village_1241'],awayTracks:[],storyline:[ID],family:['standard'],
    stock:[1,'farmer',20,5,0,1],community:true,noOffice:true,noInventedIncident:true,pure:true});
  await beginBookmark(page,info,'1241',SCENARIO);
  expect(await page.evaluate(function () {
    const s = FB.state, c = s.chars[s.player.charId], pr = FB.world.byId.szekesfehervar;
    const site = FB.settlementsOf(s,pr.id)[s.player.homeSettlement];
    const physical = FB.provinceAtGrid(site.x,site.y);
    return {phase:s.stories.hungarian_village_track_1241.phase,home:s.player.provinceId,
      age:FB.ageOf(c,s.date.year),identity:[c.culture,c.religion],profession:s.player.profession,
      gold:s.player.gold,family:FB.householdMembers(s).length > 1,
      plots:FB.landPlots(s).map(function (r) { return [r.provinceId,r.settlement]; }),
      physical:physical && physical.id,noContract:!s.stories.hungarian_village_track_1241.jobs,
      goals:Object.keys(s.stories.opening_hungarian_village_1241.goals).length,errors:FBTEST.checkInvariants()};
  })).toEqual({phase:'household',home:'szekesfehervar',age:24,identity:['magyar','catholic'],profession:'farmer',
    gold:20,family:true,plots:[['szekesfehervar',0]],physical:'szekesfehervar',noContract:true,goals:3,errors:[]});
});

test('the complete stay path asserts no attack, pays no reward and survives restore', async function ({page},info) {
  await beginBookmark(page,info,'1241',SCENARIO);
  expect(await page.evaluate(function () {
    let s = FB.state;
    const id = 'hungarian_village_track_1241', funds = [s.player.gold,s.player.prestige,s.player.piety];
    const owners = JSON.stringify(s.owner), people = Object.keys(s.chars).length, plots = JSON.stringify(FB.landPlots(s));
    function pick(c) { return FB.stories.apply(s,id,c,FB.stories.quote(s,id,c)); }
    const choices = ['take_stock','keep_money','defer_work','stay'].map(pick);
    const record = JSON.stringify(s.stories);
    FB.save.restore(JSON.parse(FB.save.serialize())); s = FB.state;
    return {choices:choices,phase:s.stories[id].phase,home:s.player.provinceId,travel:s.player.travel || null,
      exact:record === JSON.stringify(s.stories),noReward:JSON.stringify(funds) === JSON.stringify([s.player.gold,s.player.prestige,s.player.piety]),
      unchanged:owners === JSON.stringify(s.owner) && people === Object.keys(s.chars).length && plots === JSON.stringify(FB.landPlots(s)),
      receipts:Object.keys(s.stories[id].householdReceipts).length,
      goals:[s.stories.opening_hungarian_village_1241.goals.farm_income.status,s.stories.opening_hungarian_village_1241.goals.home_decision.status],
      repeat:pick('stay')};
  })).toEqual({choices:[true,true,true,true],phase:'stayed',home:'szekesfehervar',travel:null,
    exact:true,noReward:true,unchanged:true,receipts:0,goals:['pending','completed'],repeat:false});
});

test('supply reviews charge once and reject stale, unaffordable or remote confirmation', async function ({page},info) {
  await beginBookmark(page,info,'1241',SCENARIO);
  await choose(page,'take_stock');
  expect(await page.evaluate(function () {
    const s = FB.state, id = 'hungarian_village_track_1241';
    const original = s.player.gold, stale = FB.stories.quote(s,id,'buy_supplies');
    s.player.gold = 0;
    const failed = FB.stories.apply(s,id,'buy_supplies',stale), free = FB.stories.quote(s,id,'keep_money').allowed;
    s.player.gold = original;
    const remoteQuote = FB.stories.quote(s,id,'buy_supplies'); s.player.provinceId = 'bratislava';
    const remote = FB.stories.apply(s,id,'buy_supplies',remoteQuote); s.player.provinceId = 'szekesfehervar';
    const q = FB.stories.quote(s,id,'buy_supplies'), bought = FB.stories.apply(s,id,'buy_supplies',q);
    return {failed:failed,free:free,remote:remote,bought:bought,charge:original - s.player.gold,
      repeat:FB.stories.apply(s,id,'buy_supplies',q),phase:s.stories[id].phase};
  })).toEqual({failed:false,free:true,remote:false,bought:true,charge:3,repeat:false,phase:'work'});
});

test('goals distinguish savings and selected work from actual farm earnings', async function ({page},info) {
  await beginBookmark(page,info,'1241',SCENARIO);
  await choose(page,'seek_work');
  await choose(page,'work_fields');
  expect(await page.evaluate(function () {
    const s = FB.state, id = 'opening_hungarian_village_1241', profile = FB.stories.get(id), t = s.stories[id];
    const selected = s.stories.hungarian_village_track_1241.phase;
    s.player.gold = 30; profile.day(s,t);
    const savings = t.goals.household_reserve.status, unpaid = t.goals.farm_income.status;
    s.turn++; FB.tickFocus(s);
    const paid = t.earnings.work_land > 0, progressing = t.goals.farm_income.status;
    // Stage accumulated prior earnings just below the goal, then use a real payment.
    t.earnings.work_land = 4.999999;
    s.turn++; FB.tickFocus(s);
    const cash = s.player.gold, record = JSON.stringify(t); profile.day(s,t); profile.day(s,t);
    return {selected:selected,savings:savings,unpaid:unpaid,paid:paid,progressing:progressing,earned:t.goals.farm_income.status,
      phase:s.stories.hungarian_village_track_1241.phase,recorded:t.earnings.work_land >= 5,
      noReward:cash === s.player.gold,once:record === JSON.stringify(t)};
  })).toEqual({selected:'working',savings:'completed',unpaid:'pending',paid:true,progressing:'pending',earned:'completed',phase:'earned',recorded:true,noReward:true,once:true});
});

test('war reviews observe the home sovereign and peace without inventing a local battle', async function ({page},info) {
  await beginBookmark(page,info,'1241',SCENARIO);
  await choose(page,'seek_work'); await choose(page,'defer_work');
  expect(await page.evaluate(function () {
    const s = FB.state, id = 'hungarian_village_track_1241', story = FB.stories.get(id), t = s.stories[id];
    const funds = s.player.gold, owner = JSON.stringify(s.owner);
    const remote = FB.registerOrdinaryWar(s,'england_1241',{enemy:'france_1241',target:'paris'});
    story.day(s,t); const quiet = t.phase;
    FB.settleOrdinaryWar(s,remote.id,'white_peace');
    const local = FB.registerOrdinaryWar(s,'hungary_1241',{enemy:'hre_1241',target:s.realms.hre_1241.capital});
    story.day(s,t); const review = t.phase;
    const waited = FB.stories.apply(s,id,'wait_for_news',FB.stories.quote(s,id,'wait_for_news'));
    FB.settleOrdinaryWar(s,local.id,'white_peace'); story.day(s,t);
    const after = t.phase, concluded = FB.stories.apply(s,id,'resume_livelihood',FB.stories.quote(s,id,'resume_livelihood'));
    return {quiet:quiet,review:review,waited:waited,after:after,concluded:concluded,phase:t.phase,
      noLoss:funds === s.player.gold,noConquest:owner === JSON.stringify(s.owner),receipts:Object.keys(t.householdReceipts).length};
  })).toEqual({quiet:'outlook',review:'war_review',waited:true,after:'obligations',concluded:true,phase:'stayed',noLoss:true,noConquest:true,receipts:0});
});

test('personal travel charges its quote once, restores in flight and grants no family move', async function ({page},info) {
  await departure(page,info);
  const result = await page.evaluate(function () {
    let s = FB.state;
    const id = 'hungarian_village_track_1241';
    function pick(c) { return FB.stories.apply(s,id,c,FB.stories.quote(s,id,c)); }
    const kin = FB.householdMembers(s).filter(function (c) { return c.id !== s.player.charId; }).map(function (c) { return [c.id,c.homeProvinceId]; });
    const plots = JSON.stringify(FB.landPlots(s));
    s.player.gold = 0; const poor = pick('go_alone'); s.player.gold = 1000;
    const q = FB.stories.quote(s,id,'go_alone'), cash = s.player.gold;
    const begun = FB.stories.apply(s,id,'go_alone',q), charge = cash - s.player.gold, repeat = FB.stories.apply(s,id,'go_alone',q);
    const journey = JSON.stringify(s.player.travel), funds = s.player.gold;
    FB.save.restore(JSON.parse(FB.save.serialize())); s = FB.state;
    const retained = journey === JSON.stringify(s.player.travel) && funds === s.player.gold;
    for (let day = 0; day < 45 && s.player.travel.phase === 'outbound'; day++) { s.turn++; FB.travelTick(s); }
    FB.stories.get(id).day(s,s.stories[id]);
    const arrived = s.stories[id].phase, earlySettlement = pick('settle');
    const noGrant = FBDATA.events.find(function (e) { return e.id === 'hungarian_visit_arrival_1241'; }).options.every(function (o) { return Object.keys(o.effects).join(',') === 'custom'; });
    const personal = pick('visit_only');
    return {poor:poor,begun:begun,charge:charge,cost:q.facts.terms.cost,repeat:repeat,retained:retained,arrived:arrived,
      earlySettlement:earlySettlement,noGrant:noGrant,personal:personal,home:s.player.provinceId,phase:s.stories[id].phase,
      kinStayed:kin.every(function (r) { return s.chars[r[0]].homeProvinceId === r[1]; }),plotsKept:plots === JSON.stringify(FB.landPlots(s))};
  });
  expect(result.charge).toBe(result.cost);
  expect(result).toMatchObject({poor:false,begun:true,repeat:false,retained:true,arrived:'arrival',earlySettlement:false,
    noGrant:true,personal:true,home:'szekesfehervar',phase:'temporary',kinStayed:true,plotsKept:true});
});

test('later settlement needs real residence and work, retains old property and pays no reward', async function ({page},info) {
  await departure(page,info);
  expect(await page.evaluate(function () {
    let s = FB.state;
    const id = 'hungarian_village_track_1241';
    function pick(c) { return FB.stories.apply(s,id,c,FB.stories.quote(s,id,c)); }
    s.player.gold = 1000; pick('go_alone');
    for (let day = 0; day < 45 && s.player.travel.phase === 'outbound'; day++) { s.turn++; FB.travelTick(s); }
    FB.stories.get(id).day(s,s.stories[id]); FB.travelCapstoneDone(s);
    const early = pick('settle');
    // Stage the residence boundary, then the distinct local-work boundary.
    s.turn += 360; s.date.year++;
    const unworked = pick('settle'); s.player.travel.workEvents = 4;
    const funds = s.player.gold, plots = JSON.stringify(FB.landPlots(s)), settled = pick('settle');
    const record = JSON.stringify(s.stories); FB.save.restore(JSON.parse(FB.save.serialize())); s = FB.state;
    return {early:early,unworked:unworked,settled:settled,phase:s.stories[id].phase,home:s.player.provinceId,travel:s.player.travel,
      retained:record === JSON.stringify(s.stories),noReward:funds === s.player.gold,
      plotsKept:plots === JSON.stringify(FB.landPlots(s)),goal:s.stories.opening_hungarian_village_1241.goals.home_decision.status,repeat:pick('settle')};
  })).toEqual({early:false,unworked:false,settled:true,phase:'resettled',home:'bratislava',travel:null,
    retained:true,noReward:true,plotsKept:true,goal:'completed',repeat:false});
});

test('unreachable, cancelled and expired departure retain a complete stay path', async function ({page},info) {
  await departure(page,info);
  expect(await page.evaluate(function () {
    const s = FB.state, id = 'hungarian_village_track_1241';
    function pick(c) { return FB.stories.apply(s,id,c,FB.stories.quote(s,id,c)); }
    const edges = FB.world.adj.szekesfehervar; FB.world.adj.szekesfehervar = {};
    const unreachable = pick('go_alone'), fallback = FB.stories.quote(s,id,'postpone').allowed;
    FB.world.adj.szekesfehervar = edges;
    s.date.year = 1242; const expired = pick('go_alone'); s.date.year = 1241;
    const begun = pick('go_alone'); FB.travelCancel(s); FB.stories.get(id).day(s,s.stories[id]);
    return {unreachable:unreachable,fallback:fallback,expired:expired,begun:begun,phase:s.stories[id].phase,home:s.player.provinceId};
  })).toEqual({unreachable:false,fallback:true,expired:false,begun:true,phase:'interrupted_journey',home:'szekesfehervar'});
});

test('a personal round trip ends at the unchanged household home', async function ({page},info) {
  await departure(page,info);
  expect(await page.evaluate(function () {
    const s = FB.state, id = 'hungarian_village_track_1241';
    function pick(c) { return FB.stories.apply(s,id,c,FB.stories.quote(s,id,c)); }
    const plots = JSON.stringify(FB.landPlots(s)); pick('go_alone');
    for (let day = 0; day < 45 && s.player.travel.phase === 'outbound'; day++) { s.turn++; FB.travelTick(s); }
    FB.stories.get(id).day(s,s.stories[id]); FB.travelCapstoneDone(s);
    // Stage the minimum stay, then tick only the bounded return journey.
    s.turn += 90;
    const returning = pick('return_home');
    for (let day = 0; day < 45 && s.player.travel; day++) { s.turn++; FB.travelTick(s); }
    FB.stories.get(id).day(s,s.stories[id]);
    return {returning:returning,phase:s.stories[id].phase,home:s.player.provinceId,
      travel:s.player.travel || null,plotsKept:plots === JSON.stringify(FB.landPlots(s))};
  })).toEqual({returning:true,phase:'returned',home:'szekesfehervar',travel:null,plotsKept:true});
});

test('death and succession archive the personal opening and hidden restore creates no missing tracks', async function ({page},info) {
  await beginBookmark(page,info,'1241',SCENARIO);
  const saved = await page.evaluate(function () {
    let s = FB.state;
    const id = 'hungarian_village_track_1241', goals = 'opening_hungarian_village_1241', saved = JSON.parse(FB.save.serialize());
    s.player.dead = true; FB.stories.get(id).day(s,s.stories[id]); FB.stories.get(goals).day(s,s.stories[goals]);
    if (s.stories[id].phase !== 'interrupted' || s.stories[goals].goals.farm_income.status !== 'archived') throw new Error('Death retained a personal opening');
    FB.save.restore(saved); s = FB.state;
    s.player.charId = FB.householdMembers(s).find(function (c) { return c.id !== s.player.charId && !c.dead; }).id;
    FB.stories.get(id).day(s,s.stories[id]); FB.stories.get(goals).day(s,s.stories[goals]);
    if (s.stories[id].phase !== 'interrupted' || s.stories[goals].goals.farm_income.status !== 'archived') throw new Error('Succession inherited personal opening');
    delete saved.state.stories[id]; delete saved.state.stories[goals];
    FBDATA.bookmarks['1241'].hidden = true; return JSON.stringify(saved);
  });
  await restoreBookmark(page,saved);
  expect(await page.evaluate(function () {
    return {hidden:FB.bookmark('1241').hidden,home:FB.state.player.provinceId,
      absent:!FB.state.stories.hungarian_village_track_1241 && !FB.state.stories.opening_hungarian_village_1241};
  })).toEqual({hidden:true,home:'szekesfehervar',absent:true});
});

test('the shared supply review cancels without payment and restores focus', async function ({page},info) {
  await beginBookmark(page,info,'1241',SCENARIO);
  await choose(page,'take_stock');
  await page.locator('[data-tab="actions"]').click(); await page.evaluate(function () { FB.ui.refresh(); });
  const card = page.locator('[data-story-card="' + ID + '"]');
  await card.click(); await page.locator('[data-story-choice="buy_supplies"]').click();
  await expect(page.locator('#gm-story-confirm')).toBeVisible();
  await page.keyboard.press('Escape'); await expect(page.locator('[data-story-choice="keep_money"]')).toBeVisible();
  await page.keyboard.press('Escape'); await expect(card).toBeFocused();
  expect(await page.evaluate(function () { return FB.state.player.gold; })).toBe(20);
});
