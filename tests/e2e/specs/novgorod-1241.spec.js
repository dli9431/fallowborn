'use strict';
const {test,expect} = require('../support/fixture');
const {openGame} = require('../support/game/navigation');
const {beginBookmark,restoreBookmark} = require('../support/game/bookmark-acceptance');
const {dependsOnRuntime} = require('../support/runtime-dependencies');

dependsOnRuntime(__filename,[
  'data/bookmark_1241_alexander.js','data/starts_alexander_1241.js','data/story_alexander_1241.js',
  'index.html','data/starts_novgorod_1241.js','data/story_novgorod_1241.js',
  'data/bookmark_1241.js','data/identities_1241.js',
  'data/bookmark_1241_scaffold_a.js','data/bookmark_1241_scaffold_b.js',
  'data/bookmark_1241_scaffold_c.js','data/bookmark_1241_scaffold_d.js',
  'data/starts.js','data/story_instances.js','data/start_ambitions.js',
  'data/settlements.js','data/settlements_real.js','data/actions.js','data/economy.js',
  'data/government_rollout.js','data/eras.js','data/technology.js',
  'js/story_household.js','js/story_opening_goals.js','js/stories.js','js/starts.js',
  'js/bookmark_setup.js','js/actions.js','js/economy.js','js/travel.js',
  'js/main.js','js/world.js','js/model.js','js/save.js','js/save_v4.js',
  'js/i18n.js','js/ui_misc.js','js/ui_panels.js'
]);

const ID = 'novgorod_household_track_1241';
const OPENING = 'opening_novgorod_1241';
const stayPath = ['take_stock','postpone_work','keep_to_work','leave_public_business',
  'keep_arrangements','stay','continue_life','finish'];

async function choose(page,choice) {
  return page.evaluate(function (choice) {
    const s = FB.state, id = 'novgorod_household_track_1241';
    return FB.stories.apply(s,id,choice,FB.stories.quote(s,id,choice));
  },choice);
}

test('the selectable date has a complete fictional Novgorod household without adopting Alexander',async function ({page},info) {
  await openGame(page,info);
  expect(await page.evaluate(function () {
    const b = FB.bookmark('1241'), sc = FBDATA.startScenarios.find(function (s) { return s.id === 'novgorod_household_1241'; });
    const data = JSON.stringify(FBDATA), rng = FB.getRngState(), uid = FB.getUidCounter();
    const p = b.provinces.find(function (p) { return p.id === 'novgorod'; });
    const court = b.realms.find(function (r) { return r.id === 'novgorod_1241'; });
    const errors = FB.validateBookmark(b);
    const home = FBDATA.settlementLayouts[b.settlementLayout].novgorod[0];
    return {errors:errors,hidden:b.hidden === true,available:FB.bookmarkAvailable('1241'),dates:sc.bookmarkIds,
      local:FB.startProvinceAllowed(sc,b,'novgorod'),away:FB.startProvinceAllowed(sc,b,'ladoga'),
      tracks:FB.startTracks(sc,'novgorod'),storyline:FB.startStoryTracks(sc,'novgorod'),
      family:Object.keys(sc.familyPresets),resources:[sc.tier,sc.profession,sc.gold,sc.prestige,sc.piety],
      ordinary:!sc.startEffects && !sc.rulerRealmId && !sc.characterName,
      community:p.communities.some(function (c) { return c.culture === sc.startCulture && c.religion === sc.startReligion; }),
      home:[home.site,home.name,home.kind],courtGenerated:court.ruler.generated === true,
      separateAlexander:FBDATA.startScenarios.find(function (s) { return s.id === 'alexander_1241'; }).fixedProvinceId === 'rostov' && !sc.existingPerson && !FBDATA.storyInstances.novgorod_agenda_1241,
      noSource:!FBDATA.storyInstances.novgorod_household_track_1241.requires,
      pure:data === JSON.stringify(FBDATA) && rng === FB.getRngState() && uid === FB.getUidCounter()};
  })).toEqual({errors:[],hidden:false,available:true,dates:['1241'],local:true,away:false,
    tracks:[ID,OPENING],storyline:[ID],family:['standard'],resources:[1,'craftsman',15,5,0],
    ordinary:true,community:true,home:['novgorod','Novgorod','city'],courtGenerated:true,separateAlexander:true,noSource:true,pure:true});
  await beginBookmark(page,info,'1241','novgorod_household_1241');
  expect(await page.evaluate(function () {
    const s = FB.state, t = s.stories.novgorod_household_track_1241, c = s.chars[s.player.charId];
    return {phase:t.phase,actor:t.actorId === c.id,home:s.player.provinceId,
      site:FB.world.byId.novgorod.settlements[s.player.homeSettlement].site,
      age:FB.ageOf(c,s.date.year),culture:c.culture,faith:c.religion,
      family:FB.householdMembers(s).length > 1,profession:s.player.profession,gold:s.player.gold,
      noLand:s.player.landPlots.length === 0 && s.player.holdings.length === 0 && s.player.provs.length === 0,
      contacts:s.stories.opening_novgorod_1241.contacts,errors:FBTEST.checkInvariants()};
  })).toEqual({phase:'household',actor:true,home:'novgorod',site:'novgorod',age:24,culture:'rus',faith:'orthodox',
    family:true,profession:'craftsman',gold:15,noLand:true,contacts:{},errors:[]});
});

test('all eight local beats finish unpaid without changing courts, people, faith or property',async function ({page},info) {
  await beginBookmark(page,info,'1241','novgorod_household_1241');
  expect(await page.evaluate(function (path) {
    const s = FB.state, id = 'novgorod_household_track_1241';
    function facts() { return JSON.stringify([s.player.gold,s.player.prestige,s.player.piety,s.owner,s.chars,s.player.landPlots,s.player.travel]); }
    const before = facts();
    const chosen = path.map(function (c) { return FB.stories.apply(s,id,c,FB.stories.quote(s,id,c)); });
    return {chosen:chosen,phase:s.stories[id].phase,decisions:Object.keys(s.stories[id].decisions).length,
      unchanged:before === facts(),receipts:s.stories[id].householdReceipts,
      goals:Object.keys(s.stories.opening_novgorod_1241.goals).map(function (g) { return s.stories.opening_novgorod_1241.goals[g].status; })};
  },stayPath)).toEqual({chosen:Array(8).fill(true),phase:'concluded',decisions:8,unchanged:true,receipts:{},
    goals:['pending','pending','completed']});
});

test('craft selection, actual pay and savings remain separate facts',async function ({page},info) {
  await beginBookmark(page,info,'1241','novgorod_household_1241');
  expect(await choose(page,'plan_work')).toBe(true);
  expect(await page.evaluate(function () {
    const s = FB.state, id = 'novgorod_household_track_1241', opening = 'opening_novgorod_1241';
    const money = s.player.gold, q = FB.stories.quote(s,id,'work_bench');
    const selected = FB.stories.apply(s,id,'work_bench',q), repeated = FB.stories.apply(s,id,'work_bench',q);
    const unpaid = s.player.gold === money && s.stories[id].phase === 'working';
    s.player.gold = 25; FB.stories.get(opening).day(s,s.stories[opening]);
    const reserve = s.stories[opening].goals.household_reserve.status;
    const notEarned = s.stories[opening].goals.craft_income.status;
    s.turn++; FB.tickFocus(s);
    const paid = s.player.gold > 25, phase = s.stories[id].phase;
    // Stage the cumulative-income boundary and let actual work cross it.
    s.stories[opening].earnings.craft_work = 5 - 0.000001;
    s.turn++; FB.tickFocus(s);
    const cash = s.player.gold, record = JSON.stringify(s.stories);
    FB.stories.get(id).day(s,s.stories[id]); FB.stories.get(opening).day(s,s.stories[opening]);
    return {selected:selected,repeated:repeated,unpaid:unpaid,reserve:reserve,notEarned:notEarned,paid:paid,phase:phase,
      earned:s.stories[opening].goals.craft_income.status,noReward:cash === s.player.gold,
      once:record === JSON.stringify(s.stories)};
  })).toEqual({selected:true,repeated:false,unpaid:true,reserve:'completed',notEarned:'pending',paid:true,phase:'frontier',
    earned:'completed',noReward:true,once:true});
});

test('unavailable work can be postponed, stale reviews fail and departure archives the local plan',async function ({page},info) {
  await beginBookmark(page,info,'1241','novgorod_household_1241');
  await choose(page,'take_stock');
  expect(await page.evaluate(function () {
    const s = FB.state, id = 'novgorod_household_track_1241', q = FB.stories.quote(s,id,'work_bench');
    const profession = s.player.profession, money = s.player.gold;
    s.player.profession = 'farmer';
    const blocked = FB.stories.quote(s,id,'work_bench').allowed;
    const fallback = FB.stories.quote(s,id,'postpone_work').allowed;
    const stale = FB.stories.apply(s,id,'work_bench',q);
    s.player.profession = profession;
    const fresh = FB.stories.quote(s,id,'postpone_work');
    s.player.provinceId = 'ladoga';
    const remote = FB.stories.apply(s,id,'postpone_work',fresh);
    FB.stories.get(id).day(s,s.stories[id]);
    return {blocked:blocked,fallback:fallback,stale:stale,remote:remote,phase:s.stories[id].phase,noMoney:money === s.player.gold};
  })).toEqual({blocked:false,fallback:true,stale:false,remote:false,phase:'remote',noMoney:true});
});

test('midpoint and completed hidden-world restores preserve decisions without replay',async function ({page},info) {
  await beginBookmark(page,info,'1241','novgorod_household_1241');
  for (const choice of stayPath.slice(0,3)) expect(await choose(page,choice)).toBe(true);
  const saved = await page.evaluate(function () {
    FBDATA.bookmarks['1241'].hidden = true;
    return {save:FB.save.serialize(),stories:JSON.stringify(FB.state.stories),people:Object.keys(FB.state.chars).length,gold:FB.state.player.gold};
  });
  await restoreBookmark(page,saved.save);
  expect(await page.evaluate(function (saved) {
    return {hidden:FB.bookmark('1241').hidden,exact:saved.stories === JSON.stringify(FB.state.stories),
      people:saved.people === Object.keys(FB.state.chars).length,gold:FB.state.player.gold};
  },saved)).toEqual({hidden:true,exact:true,people:true,gold:15});
  for (const choice of stayPath.slice(3)) expect(await choose(page,choice)).toBe(true);
  const final = await page.evaluate(function () {
    return {save:FB.save.serialize(),stories:JSON.stringify(FB.state.stories),rng:FB.getRngState() >>> 0,uid:FB.getUidCounter()};
  });
  await restoreBookmark(page,final.save);
  expect(await page.evaluate(function (saved) {
    const s = FB.state, id = 'novgorod_household_track_1241';
    return {exact:saved.stories === JSON.stringify(s.stories),gold:s.player.gold,
      repeated:FB.stories.apply(s,id,'finish',FB.stories.quote(s,id,'finish')),
      stable:saved.rng === (FB.getRngState() >>> 0) && saved.uid === FB.getUidCounter()};
  },final)).toEqual({exact:true,gold:15,repeated:false,stable:true});
});

test('death, succession and a year of deferral close once; missing records remain missing on restore',async function ({page},info) {
  await beginBookmark(page,info,'1241','novgorod_household_1241');
  const save = await page.evaluate(function () {
    let s = FB.state;
    const id = 'novgorod_household_track_1241', opening = 'opening_novgorod_1241', saved = JSON.parse(FB.save.serialize());
    function update() { FB.stories.get(id).day(s,s.stories[id]); FB.stories.get(opening).day(s,s.stories[opening]); }
    s.player.dead = true; update();
    if (s.stories[id].phase !== 'interrupted' || s.stories[opening].goals.craft_income.status !== 'archived') throw new Error('Death did not archive the opening');
    FB.save.restore(saved); s = FB.state;
    s.player.charId = FB.householdMembers(s).find(function (c) { return c.id !== s.player.charId && !c.dead; }).id;
    update();
    if (s.stories[id].phase !== 'interrupted') throw new Error('Successor inherited the opening');
    FB.save.restore(saved); s = FB.state;
    s.turn = 360; s.date.year = 1242; update();
    const records = JSON.stringify(s.stories), gold = s.player.gold; update();
    if (s.stories[id].phase !== 'postponed' || records !== JSON.stringify(s.stories) || gold !== s.player.gold) throw new Error('Deferral replayed an effect');
    delete saved.state.stories[id]; delete saved.state.stories[opening];
    FBDATA.bookmarks['1241'].hidden = true;
    return JSON.stringify(saved);
  });
  await restoreBookmark(page,save);
  expect(await page.evaluate(function () {
    return {home:FB.state.player.provinceId,absent:!FB.state.stories.novgorod_household_track_1241 && !FB.state.stories.opening_novgorod_1241};
  })).toEqual({home:'novgorod',absent:true});
});

test('the shared story review cancels freely and restores its Deeds card focus',async function ({page},info) {
  await beginBookmark(page,info,'1241','novgorod_household_1241');
  await choose(page,'take_stock');
  const focus = await page.evaluate(function () { return FB.state.player.focus; });
  await page.locator('[data-tab="actions"]').click();
  await page.evaluate(function () { FB.ui.refresh(); });
  const card = page.locator('[data-story-card="' + ID + '"]');
  await card.click();
  await page.locator('[data-story-choice="work_bench"]').click();
  await expect(page.locator('#gm-story-confirm')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('[data-story-choice="postpone_work"]')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(card).toBeFocused();
  expect(await page.evaluate(function () {
    return {phase:FB.state.stories.novgorod_household_track_1241.phase,gold:FB.state.player.gold,focus:FB.state.player.focus};
  })).toEqual({phase:'customers',gold:15,focus:focus});
});
