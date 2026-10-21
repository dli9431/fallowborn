'use strict';
const path=require('path');
const {test,expect}=require('../support/fixture');
const {openGame}=require('../support/game/navigation');
const {beginBookmark}=require('../support/game/bookmark-acceptance');
const {dependsOnRuntime}=require('../support/runtime-dependencies');

dependsOnRuntime(__filename,[
  'index.html','data/expeditions_1096.js','data/bookmark_1096.js',
  'data/bookmark_1096_western_expeditions.js','data/story_western_rulers_1096.js',
  'data/bookmark_1096_scaffold_a.js','data/bookmark_1096_scaffold_b.js',
  'data/bookmark_1096_scaffold_c.js','data/bookmark_1096_scaffold_d.js',
  'data/identities_1096.js','data/institutions_1096.js','data/mobile_confederations.js',
  'data/starts_pilgrim_1096.js','data/story_pilgrim_1096.js','data/units.js','data/technology.js',
  'js/story_expedition_preparation.js','js/story_expedition_program.js','js/expedition_programs.js',
  'js/mobile_confederations.js','js/mobile_command.js','js/mobile_columns.js','js/home_authority.js',
  'js/government_selection.js','js/governments.js','js/government_support.js','js/authority.js',
  'js/population.js','js/market.js','js/treasury.js','js/armies.js','js/federates.js','js/logistics.js',
  'js/holywar.js','js/wars.js','js/religion.js','js/technology.js','js/stories.js','js/mods.js',
  'js/world.js','js/bookmark_setup.js','js/starts.js','js/model.js','js/station.js','js/util.js',
  'js/save.js','js/save_v4.js','js/main.js'
]);

test('western formations begin as finite preparations without a host or duplicate home ruler',async function ({page},info) {
  await beginBookmark(page,info,'1096','pilgrim_household_1096');
  const facts=await page.evaluate(function () {
    const s=FB.state,b=FB.campaignBookmark(s),prefixes=['godfrey','raymond','bohemond'];
    return {valid:FB.validateBookmark(b),rows:prefixes.map(function (prefix) {
      const rid=prefix+'_host_1096',id=prefix+'_preparation_1096',t=s.stories[id],actor=t.bindings[0].characterId,
        home=prefix==='godfrey' ? 'lower_lotharingia_1096' : prefix==='raymond' ? 'toulouse_1096' : 'bohemond_lordships_1096';
      return {declared:b.realms.some(function (d) {return d.id===rid;}),status:t.status,
        program:s.stories[prefix+'_program_1096'].status,
        one:actor===FB.realmRulerCharacterSnapshot(s,home).id,
        empty:!FB.mobile.row(s,rid) && !FB.mobile.host(s,rid) && FB.treasuryAvailable(s,rid)===0,
        army:s.armies.some(function (a) {return a.realm===rid;})};
    }),home:s.player.provinceId};
  });
  expect(facts).toEqual({valid:[],rows:Array(3).fill({declared:true,status:'preparing',program:'preparing',one:true,empty:true,army:false}),home:'cologne'});
});

test('later dates alone cannot fund western formations or dispatch a road or sea crossing',async function ({page},info) {
  await beginBookmark(page,info,'1096','pilgrim_household_1096');
  const results=await page.evaluate(function () {
    const base=FB.state,rng=FB.getRngState(),uid=FB.getUidCounter();
    const ids=['godfrey','raymond','bohemond'];
    return [42,75,210,359,360].map(function (turn) {
      const s=JSON.parse(JSON.stringify(base));s.date=FB.dateAtTurn(s,turn);s.turn=turn;
      const before=JSON.stringify(s);
      const rejected=ids.every(function (id) {
        const actor=s.stories[id+'_preparation_1096'].bindings[0].characterId,
          formation=FB.expeditionPreparation.review(s,id+'_preparation_1096','form',actor),
          route=FB.expeditionPrograms.review(s,id+'_host_1096','first_leg');
        return !formation.allowed && !FB.expeditionPreparation.commit(s,formation) &&
          !route.allowed && !FB.expeditionPrograms.commit(s,route);
      });
      FB.expeditionPrograms.day(s);
      return rejected && before===JSON.stringify(s) && rng===FB.getRngState() && uid===FB.getUidCounter();
    });
  });
  expect(results).toEqual(Array(5).fill(true));
});

test('matching historical restore retains people, accounts and unformed sources at a later boundary',async function ({page},info) {
  await beginBookmark(page,info,'1096','pilgrim_household_1096');
  const result=await page.evaluate(function () {
    const s=FB.state;s.date=FB.dateAtTurn(s,210);s.turn=210;
    const owners=function () {const x=FB.state;return JSON.stringify([x.chars,x.realms,x.armies,
      Object.keys(x.authority.governments).map(function (id) {return FB.mobile.row(x,id);}),
      x.authority.migrations,x.population,x.market,x.owner,x.holder,x.stories,x.player.gold]);};
    const before=owners(),rng=FB.getRngState(),uid=FB.getUidCounter(),saved=FB.save.serialize();
    FB.save.restore(JSON.parse(saved));
    const exact=before===owners();FB.stories.start(FB.state);
    FB.mobile.initialize(FB.state,FB.campaignBookmark(FB.state).realms);FB.expeditionPrograms.day(FB.state);
    return {exact:exact,noReplay:before===owners(),rng:(rng>>>0)===(FB.getRngState()>>>0),
      uid:uid===FB.getUidCounter(),date:FB.state.date,valid:FB.mobile.validate(FB.state)};
  });
  expect(result).toEqual({exact:true,noReplay:true,rng:true,uid:true,date:{year:1096,season:2,day:31},valid:true});
});

// Complete fictional imports prove the shared owners remain usable with this loaded batch.
// They establish the generic owners independently of the dated declarations.
async function imported(page,info,label) {
  await openGame(page,info);
  await page.evaluate(function () {FB.ui.showMods();});
  await page.locator('#modfile').setInputFiles(path.resolve(__dirname,'../fixtures/authoring/expedition-story-'+label+'.json'));
  await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded'}),page.locator('#mod-apply').click()]);
  const prefix=label==='harbor' ? 'harbor' : 'dune';
  await page.waitForFunction(function (prefix) {
    return window.FB && FB.game && FB.game.bootReady && FBDATA.bookmarks[prefix+'_world'];
  },prefix);
  await beginBookmark(page,info,prefix+'_world',prefix+'_household');
  await page.evaluate(function (label) {
    const s=FB.state,prefix=label==='harbor' ? 'harbor' : 'dune';
    window.expeditionCase={
      id:label+'_story_program',preparationId:label+'_preparation',
      rid:label==='harbor' ? 'harbor_following' : 'dune_coalition',
      faith:prefix+'_belief',head:prefix+(label==='harbor' ? '_commune' : '_oasis'),target:prefix+'_country',
      actor:function (s) {return s.stories[this.id].actorId;},
      next:function (s) {s.date=FB.dateAtTurn(s,s.turn+1);s.turn++;},
      run:function (s,action,actor,step) {
        return FB.expeditionStoryPrograms.commit(s,FB.expeditionStoryPrograms.review(s,this.id,action,actor || this.actor(s),step));
      },
      form:function (s) {
        const provider=s.stories[this.preparationId].provider.characterId;
        if (!this.run(s,'authorize',provider)) return false;
        this.next(s);if (!this.run(s,'grant',provider)) return false;
        this.next(s);return this.run(s,'form');
      },
      launch:function (s) {
        const d=FB.campaignBookmark(s).realms.find(function (d) {return d.id===this.rid;},this);
        for (let i=0;i<d.mobile.expeditionProgram.steps[0].terms.waypoints.length;i++) {
          this.next(s);if (!this.run(s,'step',null,'assembly')) return false;
        }
        this.next(s);const old=s.player.charId;s.player.charId=this.actor(s);
        const called=FB.callGreatHolyWar(s,this.faith,this.target,this.head);s.player.charId=old;
        if (!called || !FB.commitMobileGreatHolyWar(s,FB.mobileGreatHolyWarReview(s,this.rid,this.actor(s),'join'))) return false;
        FB.joinGreatHolyWar(s,'attackers',this.head);s.greatHolyWar.launchTurn=s.turn;FB.greatHolyWarTick(s);
        return s.greatHolyWar.phase==='active';
      },
      owners:function () {
        const x=FB.state;return JSON.stringify([x.stories[this.id],x.stories[this.preparationId],x.realms,x.chars,
          FB.mobile.row(x,this.rid),FB.mobile.host(x,this.rid),FB.mobile.migration(x,this.rid),
          x.population,x.market,x.owner,x.holder,x.player.gold,x.greatHolyWar]);
      }
    };
  },label);
}

for (const label of ['harbor','upland']) {
  test(label+' imported preparation waits without departure and restores without reserved-source replay',async function ({page},info) {
    await imported(page,info,label);
    const result=await page.evaluate(function () {
      const C=expeditionCase,s=FB.state,people=JSON.stringify(Object.keys(s.chars).sort());
      const owners=JSON.stringify([s.population,s.market,s.realms,s.armies,s.player.gold]);
      const q=FB.expeditionStoryPrograms.review(s,C.id,'form',C.actor(s)),before=JSON.stringify(s),
        refused=!q.allowed && !FB.expeditionStoryPrograms.commit(s,q) && before===JSON.stringify(s),
        wait=C.run(s,'wait'),checkpoint=C.owners(),rng=FB.getRngState(),uid=FB.getUidCounter();
      FB.save.restore(JSON.parse(FB.save.serialize()));
      const x=FB.state;
      return {refused:refused,wait:wait,noHost:!FB.mobile.host(x,C.rid),same:checkpoint===C.owners(),
        conserved:owners===JSON.stringify([x.population,x.market,x.realms,x.armies,x.player.gold]),
        people:people===JSON.stringify(Object.keys(x.chars).sort()),
        rng:(rng>>>0)===(FB.getRngState()>>>0),uid:uid===FB.getUidCounter()};
    });
    expect(result).toEqual({refused:true,wait:true,noHost:true,same:true,conserved:true,people:true,rng:true,uid:true});
  });

  test(label+' imported funded command blocks denied passage, moves through the real owners and restores exactly',async function ({page},info) {
    await imported(page,info,label);
    const result=await page.evaluate(function () {
      const C=expeditionCase,s=FB.state,M=FB.mobile,W=FB.expeditionStoryPrograms;
      const formed=C.form(s),launched=formed && C.launch(s);
      if (!formed || !launched) return {formed:formed,launched:launched};
      const q=W.review(s,C.id,'step',C.actor(s),'objective'),target=q.operation.review.objective.countyId;
      // A current controller may deny passage. No dated intent can supply its consent.
      const blocked=JSON.parse(JSON.stringify(s));blocked.owner[target]=C.head;blocked.holder[target]=C.head;
      const bytes=JSON.stringify(blocked),rng=FB.getRngState(),uid=FB.getUidCounter(),
        denied=W.review(blocked,C.id,'step',C.actor(blocked),'objective');
      const pure=!denied.allowed && !W.commit(blocked,denied) && bytes===JSON.stringify(blocked) &&
        rng===FB.getRngState() && uid===FB.getUidCounter();
      const a=M.host(s,C.rid),origin=a.at,camp=M.migration(s,C.rid).at,commander=M.row(s,C.rid).leaderId,
        privateGold=s.player.gold,people=JSON.stringify(Object.keys(s.chars).sort()),issued=W.commit(s,q),
        noTeleport=a.at===origin && M.migration(s,C.rid).at===camp;
      let days=0;
      // Only actual daily movement is under test, bounded to 30 days and the first county change.
      while (days<30 && a.at===origin && s.armies.indexOf(a)>=0) {
        C.next(s);days++;FB.mobileDay(s);FB.armyTick(s);FB.federateDay(s);
      }
      const checkpoint=C.owners(),rngAfter=FB.getRngState(),uidAfter=FB.getUidCounter();
      FB.save.restore(JSON.parse(FB.save.serialize()));
      return {formed:formed,launched:launched,blocked:pure,issued:issued,noTeleport:noTeleport,moved:a.at!==origin,
        camp:M.migration(FB.state,C.rid).at===camp,commander:M.row(FB.state,C.rid).leaderId===commander,
        privateGold:FB.state.player.gold===privateGold,people:people===JSON.stringify(Object.keys(FB.state.chars).sort()),
        exact:checkpoint===C.owners(),rng:(rngAfter>>>0)===(FB.getRngState()>>>0),uid:uidAfter===FB.getUidCounter(),
        valid:M.validate(FB.state),days:days};
    });
    expect(result).toMatchObject({formed:true,launched:true,blocked:true,issued:true,noTeleport:true,moved:true,camp:true,
      commander:true,privateGold:true,people:true,exact:true,rng:true,uid:true,valid:true});
    expect(result.days).toBeLessThanOrEqual(30);
  });
}
