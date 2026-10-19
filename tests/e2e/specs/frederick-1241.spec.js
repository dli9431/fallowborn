'use strict';
const {test,expect}=require('../support/fixture');
const {openGame}=require('../support/game/navigation');
const {startParityGame}=require('../support/game/parity');
const {dependsOnRuntime}=require('../support/runtime-dependencies');

dependsOnRuntime(__filename,[
  'index.html','data/bookmark_1241.js','data/bookmark_1241_frederick.js',
  'data/bookmark_1241_scaffold_a.js','data/bookmark_1241_scaffold_b.js',
  'data/bookmark_1241_scaffold_c.js','data/bookmark_1241_scaffold_d.js',
  'data/ecclesiastical_profiles.js','data/starts_frederick_1241.js',
  'data/story_frederick_1241.js','data/story_ruler_agendas.js',
  'data/government_rollout.js','js/main.js','js/starts.js','js/world.js','js/model.js',
  'js/items.js','js/papacy.js','js/stories.js','js/story_ruler_agenda.js',
  'js/story_opening_goals.js','js/bookmark_setup.js','js/save.js','js/save_v4.js',
  'js/household_party_travel.js','js/government_ecclesiastical.js'
]);

async function start(page,info) {
  return startParityGame(page,info,{bookmark:'1241',scenario:'frederick_1241',
    code:'FREDERICK-1241-frederick_1241-ravenna-m-Frederick_II-standard-0-german.catholic'});
}

test('fresh Frederick world keeps the retained baseline and one imperial person',async function ({page},info) {
  await openGame(page,info);
  const result=await page.evaluate(function () {
    const fresh=FB.bookmark('1241'),old=FB.bookmark('1241','baseline');
    const ruler=fresh.realms.find(function (r) { return r.id==='hre_1241'; });
    const oldRuler=old.realms.find(function (r) { return r.id==='hre_1241'; });
    const pope=fresh.realms.find(function (r) { return r.id==='papacy_1241'; });
    const scenario=FBDATA.startScenarios.find(function (sc) {return sc.id==='frederick_1241';});
    return {revision:fresh.revision,valid:FB.validateBookmark(fresh),oldValid:FB.validateBookmark(old),
      unique:fresh.realms.filter(function (r) {return r.ruler.name==='Frederick II';}).map(function (r) {return r.id;}),
      cap:ruler.capital,born:ruler.ruler.born,family:ruler.royalCourt.members.map(function (m) {return [m.id,m.born,m.homeProvinceId];}),
      oldFamily:!!oldRuler.royalCourt,oldFirst:FBDATA.settlementLayouts[old.settlementLayout].ravenna[0].site,
      first:FBDATA.settlementLayouts[fresh.settlementLayout].ravenna[0].site,
      separate:oldRuler!==ruler && oldRuler.ruler!==ruler.ruler,
      pope:[pope.ruler.name,pope.ecclesiastical.profileId],
      eligibility:[FB.startProvinceAllowed(scenario,fresh,'ravenna'),FB.startProvinceAllowed(scenario,old,'ravenna'),
        FB.startProvinceAllowed(scenario,fresh,'frankfurt')],
      track:FB.startStoryTracks(scenario,'ravenna')};
  });
  expect(result).toEqual({revision:'frederick_v2',valid:[],oldValid:[],unique:['hre_1241'],cap:'frankfurt',born:1194,
    family:[['isabella',1214,'capua'],['conrad',1228,'frankfurt'],['henry',1238,'capua'],['margaret',1237,'capua']],
    oldFamily:false,oldFirst:'ravenna_head',first:'faenza_camp_1241',separate:true,
    pope:['Gregory IX','papal_temporal_1241'],eligibility:[true,false,false],track:['frederick_agenda_1241']});
});

test('start code adopts one married emperor at the camp and restores the separate family',async function ({page},info) {
  await start(page,info);
  const result=await page.evaluate(function () {
    function facts() {
      const s=FB.state,me=s.chars[s.player.charId];
      const names=['Isabella of England','Conrad IV','Henry','Margaret'];
      const family=names.map(function (name) {
        const c=Object.keys(s.chars).map(function (id) {return s.chars[id];}).find(function (c) {
          return c.name===name && (c.id===me.spouseId || (me.childrenIds || []).indexOf(c.id)>=0);
        });
        return c && {id:c.id,name:c.name,born:c.born,residence:FB.characterResidence(s,c),location:FB.characterLocation(s,c),
          parent:c.name==='Conrad IV' ? c.fatherId===me.id : c.name==='Isabella of England' ? c.spouseId===me.id : c.fatherId===me.id && c.motherId===me.spouseId};
      });
      return {id:me.id,name:me.name,born:me.born,age:FB.ageOf(me,s.date.year),family:family,
        home:s.player.provinceId,site:FB.world.byId[s.player.provinceId].settlements[s.player.homeSettlement].site,
        ruler:s.start.rulerRealmId,oldCourt:!!s.realms.hre_1241,capital:s.realms.player.capital,
        privatePlots:s.player.landPlots,people:Object.keys(s.chars).length,
        agenda:s.stories.frederick_agenda_1241,profile:s.stories.opening_frederick_1241};
    }
    const before=facts(),saved=JSON.parse(FB.save.serialize());
    FB.save.restore(saved);
    return {before:before,same:JSON.stringify(before)===JSON.stringify(facts())};
  });
  expect(result.same).toBe(true);
  expect(result.before).toMatchObject({name:'Frederick II',born:1194,age:47,home:'ravenna',site:'faenza_camp_1241',
    ruler:'hre_1241',oldCourt:false,capital:'frankfurt',privatePlots:[],agenda:{status:'agenda_open'}});
  expect(result.before.family.map(function (c) {return [c.name,c.born,c.residence,c.location,c.parent];})).toEqual([
    ['Isabella of England',1214,'capua','capua',true],['Conrad IV',1228,'frankfurt','frankfurt',true],
    ['Henry',1238,'capua','capua',true],['Margaret',1237,'capua','capua',true]
  ]);
});

test('eight dated reviews and optional goals grant no funds or political outcomes',async function ({page},info) {
  await start(page,info);
  const result=await page.evaluate(function () {
    const s=FB.state,id='frederick_agenda_1241',d=FB.stories.get(id).declaration;
    function assets() {return JSON.stringify([s.player.gold,s.owner,s.holder,s.armies,s.authority,s.realms,s.chars]);}
    const before=assets(),rng=FB.getRngState(),uid=FB.getUidCounter(),bytes=JSON.stringify(s);
    FB.stories.cards(s);FB.stories.choices(s,id);FB.stories.quote(s,id,'fi_household');
    const pure=bytes===JSON.stringify(s) && rng===FB.getRngState() && uid===FB.getUidCounter();
    const reviews=[];
    d.stages.forEach(function (stage) {
      s.date={year:stage.year,season:stage.season,day:1};s.turn++;
      const choice=stage.choices[0],quote=FB.stories.quote(s,id,choice.id);
      reviews.push(FB.stories.apply(s,id,choice.id,quote));
    });
    const profile=s.stories.opening_frederick_1241;
    const record=JSON.stringify([s.stories[id],profile]),saved=JSON.parse(FB.save.serialize());
    FB.save.restore(saved);
    return {pure:pure,reviews:reviews,noReward:before===assets(),status:s.stories[id].status,
      goals:profile.goals,retained:record===JSON.stringify([FB.state.stories[id],FB.state.stories.opening_frederick_1241])};
  });
  expect(result).toMatchObject({pure:true,reviews:Array(8).fill(true),noReward:true,status:'agenda_complete',retained:true});
  expect(Object.values(result.goals).map(function (g) {return g.status;})).toEqual(['completed','completed','completed']);
});

test('changed papal circumstances and empty funds leave costless alternatives and a voluntary stop',async function ({page},info) {
  await start(page,info);
  const result=await page.evaluate(function () {
    const s=FB.state,id='frederick_agenda_1241';
    s.player.gold=0;
    s.realms.papacy_1241.alive=false;
    const before=JSON.stringify([s.owner,s.holder,s.armies,s.player.gold]),choices=[];
    ['fi_keep_court','fi_keep_accounts','fi_keep_rights','fi_keep_obligations','fi_keep_council'].forEach(function (choice) {
      choices.push(FB.stories.apply(s,id,choice,FB.stories.quote(s,id,choice)));
    });
    const future=FB.stories.choices(s,id).map(function (c) {return c.id;});
    const stopped=FB.stories.apply(s,id,'agenda_stop_program',FB.stories.quote(s,id,'agenda_stop_program'));
    return {choices:choices,future:future,stopped:stopped,status:s.stories[id].status,
      same:before===JSON.stringify([s.owner,s.holder,s.armies,s.player.gold])};
  });
  expect(result).toEqual({choices:Array(5).fill(true),future:['agenda_stop_program'],stopped:true,status:'agenda_stopped',same:true});
});

for (const loss of ['death','succession','office']) {
  test('the personal agenda closes once on '+loss,async function ({page},info) {
    await start(page,info);
    const result=await page.evaluate(function (loss) {
      const s=FB.state,id='frederick_agenda_1241',t=s.stories[id],q=FB.stories.quote(s,id,'fi_household');
      if (loss==='death') s.chars[s.player.charId].dead=true;
      if (loss==='succession') s.realms.player.ruler.generation++;
      if (loss==='office') s.realms.player.alive=false;
      const refused=FB.stories.apply(s,id,'fi_household',q)===false;
      FB.stories.get(id).day(s,t);
      const ended=JSON.stringify(t);FB.stories.get(id).day(s,t);
      return {refused:refused,status:t.status,once:ended===JSON.stringify(t),choices:FB.stories.choices(s,id)};
    },loss);
    expect(result).toEqual({refused:true,status:'agenda_interrupted',once:true,choices:[]});
  });
}

test('a matching retained baseline save keeps its Ravenna layout and has no Frederick agenda',async function ({page},info) {
  await openGame(page,info);
  await page.evaluate(function () { FBDATA.bookmarks['1241'].revision='baseline';FB.startProgression.noteTier(3); });
  const full=page.locator('#btn-choose-beginning');
  if (await full.isVisible()) await full.click();
  else await page.getByRole('button',{name:'New Game',exact:true}).click();
  await page.locator('#btn-bm-seed').click();
  await page.locator('#ng-seed').fill('RETAINED-1241-hungarian_village_household_1241-szekesfehervar-m-Resident-standard');
  await page.locator('#ng-seed').press('Enter');
  await page.getByRole('button',{name:'Begin Your Story',exact:true}).click();
  await page.getByRole('button',{name:'Begin',exact:true}).click();
  const result=await page.evaluate(function () {
    FB.game.setPaused(true);
    const saved=JSON.parse(FB.save.serialize());
    FB.save.restore(saved);
    const b=FB.campaignBookmark(FB.state);
    return {revision:b.revision,first:FBDATA.settlementLayouts[b.settlementLayout].ravenna[0].site,
      agenda:!!FB.state.stories.frederick_agenda_1241};
  });
  expect(result).toEqual({revision:'baseline',first:'ravenna_head',agenda:false});
});
