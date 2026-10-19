'use strict';
const {test,expect} = require('../support/fixture');
const {openGame} = require('../support/game/navigation');
const {startParityGame} = require('../support/game/parity');
const {dependsOnRuntime} = require('../support/runtime-dependencies');

dependsOnRuntime(__filename,[
  'index.html','data/bookmark_1096.js','data/bookmark_1096_scaffold_d.js',
  'data/starts_antioch_1096.js','data/story_antioch_1096.js','data/starts.js',
  'data/story_instances.js','data/eras.js','data/political_institutions.js',
  'js/starts.js','js/main.js','js/world.js','js/model.js','js/stories.js',
  'js/story_ruler_agenda.js','js/story_opening_goals.js','js/save.js','js/save_v4.js',
  'js/bookmark_setup.js','js/treasury.js','js/ui_misc.js','js/ui_modals.js'
]);

const AGENDA = 'antioch_agenda_1096';
const PROFILE = 'opening_antioch_1096';
async function start(page,info) {
  // The ordinary code grammar removes hyphens inside personal names.
  await startParityGame(page,info,{
    bookmark:'1096',scenario:'yaghi_siyan_1096',
    code:'ANTIOCH-1096-yaghi_siyan_1096-antioch-m-YaghiSiyan-standard'
  });
}

test('Antioch offers one valid existing-ruler start with a real storyline',async function ({page},info) {
  await openGame(page,info);
  expect(await page.evaluate(function () {
    const b = FB.bookmark('1096'), sc = FBDATA.startScenarios.find(function (r) { return r.id === 'yaghi_siyan_1096'; });
    const before = JSON.stringify(FBDATA), rng = FB.getRngState(), uid = FB.getUidCounter();
    const r = b.realms.find(function (r) { return r.id === 'antioch_1096'; });
    return {errors:FB.validateBookmark(b),count:b.realms.filter(function (r) { return r.id === 'antioch_1096'; }).length,
      local:FB.startProvinceAllowed(sc,b,'antioch'),away:FB.startProvinceAllowed(sc,b,'aleppo'),
      tracks:FB.startTracks(sc,'antioch'),storyline:FB.startStoryTracks(sc,'antioch'),
      match:[r.ruler.name,sc.characterName,r.rank,sc.tier,sc.governmentForm],
      household:r.royalCourt,site:FBDATA.settlementLayouts['1096'].antioch[0].site,
      pure:before === JSON.stringify(FBDATA) && rng === FB.getRngState() && uid === FB.getUidCounter()};
  })).toMatchObject({errors:[],count:1,local:true,away:false,
    tracks:[AGENDA,PROFILE],storyline:[AGENDA],
    match:['Yaghi-Siyan','Yaghi-Siyan',2,5,'territorial'],pure:true,
    household:{spouseId:null,members:[{id:'shams_al_dawla',born:1070,fatherId:'ruler',spouseId:null,homeProvinceId:'antioch'}]}});
  const full = page.locator('#btn-choose-beginning');
  if (await full.isVisible()) await full.click();
  else await page.getByRole('button',{name:'New Game',exact:true}).click();
  await page.locator('#bookmarklist [data-bookmark="1096"]').click();
  const card = page.locator('#scenariolist [data-scenario="yaghi_siyan_1096"]');
  await expect(card).toBeVisible();
  await expect(card).not.toHaveAttribute('aria-disabled','true');
});

test('wrong-county direct creation rejects without changing state, RNG or definitions',async function ({page},info) {
  await openGame(page,info);
  expect(await page.evaluate(function () {
    return new Promise(function (resolve) {
      FB.activateBookmark('1096',null,function (error) { resolve(error && error.message || null); });
    });
  })).toBeNull();
  expect(await page.evaluate(function () {
    const sc = FBDATA.startScenarios.find(function (r) { return r.id === 'yaghi_siyan_1096'; });
    FB.game.pending = {bookmarkId:'1096',scenario:sc,provinceId:'aleppo',seed:'ANTIOCH'};
    const state = FB.state, before = JSON.stringify(state), data = JSON.stringify(FBDATA);
    const rng = FB.getRngState(), uid = FB.getUidCounter(), accepted = FB.game.start();
    return {accepted:accepted,same:state === FB.state && before === JSON.stringify(FB.state),
      pure:data === JSON.stringify(FBDATA) && rng === FB.getRngState() && uid === FB.getUidCounter()};
  })).toEqual({accepted:false,same:true,pure:true});
});

test('the start adopts one historical household, court and fixed directory target across restore',async function ({page},info) {
  await start(page,info);
  expect(await page.evaluate(function () {
    const s = FB.state, me = s.chars[s.player.charId], son = s.chars[me.childrenIds[0]];
    const t = s.stories.opening_antioch_1096, people = FB.stories.get('opening_antioch_1096').people(s,t);
    const target = FB.stories.resolve(s,{kind:'realm_ruler',realmId:'seljuk_1096'});
    const initial = {
      ruler:[me.name,me.born,me.culture,me.religion],son:[son.name,son.born,son.fatherId === me.id],
      children:me.childrenIds.length,spouse:me.spouseId || null,home:s.player.provinceId,
      owned:s.owner.antioch,held:s.holder.antioch,oldRealm:!!s.realms.antioch_1096,
      duplicate:Object.keys(s.chars).filter(function (id) { return s.chars[id].name === 'Yaghi-Siyan'; }).length,
      binding:s.start.rulerRealmId,goals:Object.keys(t.goals).length,ready:t.ready,
      contact:people[0].characterId === target && t.contacts.seljuk_court === target,
      noFriend:!(s.player.friendContacts || {})[target],targetName:s.chars[target].name,
      agenda:s.stories.antioch_agenda_1096.subjectId === me.id
    };
    const bytes = JSON.stringify([s.stories.antioch_agenda_1096,t,me,son,s.player.gold,s.owner]);
    FB.save.restore(JSON.parse(FB.save.serialize()));
    const restored = FB.state;
    return {initial:initial,retained:bytes === JSON.stringify([restored.stories.antioch_agenda_1096,
      restored.stories.opening_antioch_1096,restored.chars[me.id],restored.chars[son.id],restored.player.gold,restored.owner])};
  })).toEqual({initial:{ruler:['Yaghi-Siyan',1040,'turkic','sunni'],son:['Shams al-Dawla',1070,true],
    children:1,spouse:null,home:'antioch',owned:'player',held:'player',oldRealm:false,duplicate:1,
    binding:'antioch_1096',goals:3,ready:true,contact:true,noFriend:true,targetName:'Berkyaruk',agenda:true},retained:true});
});

test('all eight reviews record priorities without creating resources, treaties, conquest or a siege',async function ({page},info) {
  await start(page,info);
  expect(await page.evaluate(function () {
    const s = FB.state, id = 'antioch_agenda_1096', story = FB.stories.get(id), t = s.stories[id];
    function resources() { return JSON.stringify([s.player.gold,s.player.prestige,s.player.piety,s.owner,s.holder,s.armies,s.wars,s.pacts,s.authority.contracts]); }
    const before = resources(), bytes = JSON.stringify(s), rng = FB.getRngState(), uid = FB.getUidCounter();
    FB.stories.cards(s); FB.stories.choices(s,id); FB.stories.quote(s,id,'as01_local_rule');
    const pure = bytes === JSON.stringify(s) && rng === FB.getRngState() && uid === FB.getUidCounter();
    const applied = [], repeated = [], dates = [];
    story.declaration.stages.forEach(function (stage) {
      // Stage review boundaries directly; no daily or multi-year simulation.
      s.date = {year:stage.year,season:stage.season,day:1}; s.turn++;
      const c = stage.choices.find(function (c) { return c.operation === 'agenda_priority'; });
      const quote = FB.stories.quote(s,id,c.id);
      applied.push(FB.stories.apply(s,id,c.id,quote));
      repeated.push(FB.stories.apply(s,id,c.id,quote)); dates.push([stage.year,stage.season]);
    });
    const record = JSON.stringify(t), cash = s.player.gold;
    FB.save.restore(JSON.parse(FB.save.serialize()));
    return {pure:pure,applied:applied,repeated:repeated,dates:dates,status:t.status,
      conserved:before === resources(),noReward:cash === FB.state.player.gold,
      goals:[s.stories.opening_antioch_1096.goals.antioch_accounts.status,
        s.stories.opening_antioch_1096.goals.antioch_upkeep.status,s.stories.opening_antioch_1096.goals.antioch_continuation.status],
      retained:record === JSON.stringify(FB.state.stories[id])};
  })).toEqual({pure:true,applied:Array(8).fill(true),repeated:Array(8).fill(false),
    dates:[[1096,0],[1096,0],[1096,1],[1096,2],[1096,3],[1097,0],[1097,2],[1097,3]],
    status:'agenda_complete',conserved:true,noReward:true,goals:['pending','completed','completed'],retained:true});
});

test('reviews respect dates and can be stopped before the next window without ending ordinary play',async function ({page},info) {
  await start(page,info);
  expect(await page.evaluate(function () {
    const s = FB.state, id = 'antioch_agenda_1096';
    function pick(c) { return FB.stories.apply(s,id,c,FB.stories.quote(s,id,c)); }
    const initial = JSON.stringify([s.player.gold,s.owner,s.armies,s.chars[s.player.charId].childrenIds]);
    const opening = [pick('as01_local_rule'),pick('as02_upkeep')];
    const early = pick('as03_relations'), stopped = pick('agenda_stop_program');
    const again = pick('agenda_stop_program'), phase = s.stories[id].status;
    const dismiss = FB.stories.apply(s,'opening_antioch_1096','dismiss_antioch_continuation',
      FB.stories.quote(s,'opening_antioch_1096','dismiss_antioch_continuation'));
    const record = JSON.stringify(s.stories);
    FB.save.restore(JSON.parse(FB.save.serialize()));
    return {opening:opening,early:early,stopped:stopped,again:again,phase:phase,dismiss:dismiss,
      retained:record === JSON.stringify(FB.state.stories),
      unchanged:initial === JSON.stringify([s.player.gold,s.owner,s.armies,s.chars[s.player.charId].childrenIds])};
  })).toEqual({opening:[true,true],early:false,stopped:true,again:false,phase:'agenda_stopped',dismiss:true,retained:true,unchanged:true});
});

test('losing actual jurisdiction interrupts the personal program and archives its office goals',async function ({page},info) {
  await start(page,info);
  expect(await page.evaluate(function () {
    const s = FB.state, id = 'antioch_agenda_1096', gold = s.player.gold;
    FB.transferProvince(s,'antioch','aleppo_1096');
    FB.stories.get(id).day(s,s.stories[id]);
    FB.stories.get('opening_antioch_1096').day(s,s.stories.opening_antioch_1096);
    return {status:s.stories[id].status,goals:[s.stories.opening_antioch_1096.goals.antioch_accounts.status,
      s.stories.opening_antioch_1096.goals.antioch_upkeep.status],
      refused:!FB.stories.apply(s,id,'as01_local_rule',FB.stories.quote(s,id,'as01_local_rule')),
      noAward:s.player.gold === gold};
  })).toEqual({status:'agenda_interrupted',goals:['archived','archived'],refused:true,noAward:true});
});

test('malformed program or contact saves reject before campaign adoption',async function ({page},info) {
  await start(page,info);
  expect(await page.evaluate(function () {
    const saved = JSON.parse(FB.save.serialize());
    return ['program','contact'].map(function (fault) {
      const broken = JSON.parse(JSON.stringify(saved));
      if (fault === 'program') broken.state.stories.antioch_agenda_1096.step = 1;
      else broken.state.stories.opening_antioch_1096.contacts.seljuk_court = 'missing_person';
      const live = FB.state, bytes = JSON.stringify(live), input = JSON.stringify(broken);
      const rng = FB.getRngState(), uid = FB.getUidCounter();
      let rejected = false;
      try { FB.save.restore(broken); } catch (_) { rejected = true; }
      return {rejected:rejected,pure:live === FB.state && bytes === JSON.stringify(FB.state) &&
        input === JSON.stringify(broken) && rng === FB.getRngState() && uid === FB.getUidCounter()};
    });
  })).toEqual([{rejected:true,pure:true},{rejected:true,pure:true}]);
});
