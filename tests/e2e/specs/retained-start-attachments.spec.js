'use strict';
const {test,expect}=require('../support/fixture');
const {openGame}=require('../support/game/navigation');
const {beginBookmark}=require('../support/game/bookmark-acceptance');
const {dependsOnRuntime}=require('../support/runtime-dependencies');
const sources={harbor:require('../fixtures/authoring/mobile-preparation-harbor.json'),
  upland:require('../fixtures/authoring/mobile-preparation-upland.json')};
dependsOnRuntime(__filename,['index.html','data/mobile_confederations.js','js/main.js','js/stories.js',
  'js/starts.js','js/save.js','js/save_v4.js','js/mods.js','js/world.js','js/bookmark_setup.js',
  'js/story_expedition_participation.js','js/story_household_party.js','js/story_expedition_preparation.js',
  'js/household_party_travel.js','js/household_party_camp.js','js/story_opening_goals.js',
  'js/story_government_selection.js','js/home_authority.js','js/mobile_confederations.js',
  'js/mobile_command.js','js/model.js','js/population.js','js/market.js','js/treasury.js']);

function configuration(label) {
  const input=JSON.parse(JSON.stringify(sources[label])),prefix=label==='harbor'?'harbor':'dune';
  const start=input.startScenarios[0],prior=start.tracks[0],extra=prefix+'_prior_review';
  input.storyInstances[extra]=Object.assign({},input.storyInstances[prior],{id:extra});
  const admission=prefix+'_admission',party=prefix+'_family_plan';
  const realm=input.bookmarks[prefix+'_world'].realms.find(function(r){return r.mobile;}).id;
  input.storyInstances[admission]={id:admission,type:'expedition_participation',title:'Review a voluntary place',
    intro:'Admission is separate from family consent and formation.',host:{kind:'realm_ruler',realmId:realm},
    termDays:label==='harbor'?30:12,capacity:label==='harbor'?4:2,acceptance:label==='harbor'?'volunteers':'closed',
    roles:[{id:'guest',kind:'civilian'}]};
  input.storyInstances[party]={id:party,type:'household_party',title:'Review household consent',
    intro:'Association moves nobody and spends no money.',requires:[admission],maxMembers:label==='harbor'?2:3,
    allowDependents:label!=='harbor',invitationDays:label==='harbor'?7:3,adultPolicy:label==='harbor'?'volunteers':'refuse'};
  start.tracks.push(extra,admission,party);
  [extra,admission,party].forEach(function(id){start.trackLocations[id]=[start.fixedProvinceId];});
  return input;
}

async function prepare(page,info,label,older) {
  const input=configuration(label),prefix=label==='harbor'?'harbor':'dune';
  await openGame(page,info);
  await page.evaluate(function(){FB.ui.showMods();});
  await page.locator('#modfile').setInputFiles({name:'retained-attachments-'+label+'.json',
    mimeType:'application/json',buffer:Buffer.from(JSON.stringify(input))});
  await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded'}),page.locator('#mod-apply').click()]);
  await page.waitForFunction(function(prefix){return window.FB&&FB.game&&FB.game.bootReady&&FBDATA.bookmarks[prefix+'_world'];},prefix);
  if(older) await page.evaluate(function(prefix){
    const bm=FBDATA.bookmarks[prefix+'_world'],start=FBDATA.startScenarios.find(function(r){return r.id===prefix+'_household';});
    // Stage the earlier trusted catalogue before creation. The actual imported
    // mod and its exact fingerprint stay unchanged throughout this journey.
    window.expandedAttachments={bookmark:JSON.parse(JSON.stringify(bm)),tracks:start.tracks.slice(),
      locations:JSON.parse(JSON.stringify(start.trackLocations))};
    const prep=bm.realms.find(function(r){return r.mobile;}).mobile.preparationId;
    bm.realms=bm.realms.filter(function(r){return !r.mobile;});
    bm.stories=bm.stories.filter(function(id){return id!==prep;});
    start.tracks=start.tracks.slice(0,2);
    Object.keys(start.trackLocations).forEach(function(id){if(start.tracks.indexOf(id)<0)delete start.trackLocations[id];});
  },prefix);
  await beginBookmark(page,info,prefix+'_world',prefix+'_household');
}

for(const label of ['harbor','upland']) {
  for(const legacy of [false,true]) {
    test(label+' retains an original two-track '+(legacy?'legacy':'stamped')+' save under the expanded catalogue',async function({page},info){
      await prepare(page,info,label,true);
      const result=await page.evaluate(function(args){
        const prefix=args.label==='harbor'?'harbor':'dune',save=JSON.parse(FB.save.serialize());
        const originalTracks=save.state.start.storyAttachments.tracks.slice(),sig=save.mods;
        if(args.legacy){delete save.state.start.storyAttachments;delete save.storyAttachmentSchema;}
        FBDATA.bookmarks[prefix+'_world']=window.expandedAttachments.bookmark;
        const start=FBDATA.startScenarios.find(function(r){return r.id===prefix+'_household';});
        start.tracks=window.expandedAttachments.tracks;start.trackLocations=window.expandedAttachments.locations;
        function inventory(s){return JSON.stringify([s.stories,s.chars,s.player.gold,s.player.provinceId,
          s.player.travel,s.authority,s.armies,s.population,s.treasuryAccounting]);}
        const old=inventory(FB.state),rng=FB.getRngState(),uid=FB.getUidCounter();
        let stable=true;
        for(let i=0;i<3;i++){
          FB.save.restore(save);
          stable=stable&&old===inventory(FB.state);
          const next=JSON.parse(FB.save.serialize());
          stable=stable&&next.mods===sig&&JSON.stringify(next.state.stories)===JSON.stringify(save.state.stories);
          save.state=next.state;
        }
        return {originalTracks:originalTracks.length,expandedTracks:start.tracks.length,stable:stable,
          retained:args.legacy?FB.state.start.storyAttachments===undefined:
            JSON.stringify(FB.state.start.storyAttachments.tracks)===JSON.stringify(originalTracks),
          noPreparation:!Object.keys(FB.state.stories).some(function(id){
            const module=FB.stories.get(id);return module.declaration&&module.declaration.type==='expedition_preparation';
          }),
          rng:rng===FB.getRngState(),uid:uid===FB.getUidCounter(),
          legacyEnvelope:!args.legacy||JSON.parse(FB.save.serialize()).storyAttachmentSchema===undefined};
      },{label:label,legacy:legacy});
      expect(result).toEqual({originalTracks:2,expandedTracks:4,stable:true,retained:true,noPreparation:true,rng:true,uid:true,legacyEnvelope:true});
    });
  }

  test(label+' fresh expanded starts require all three new records and reject malformed provenance atomically',async function({page},info){
    await prepare(page,info,label,false);
    const result=await page.evaluate(function(label){
      const prefix=label==='harbor'?'harbor':'dune',base=JSON.parse(FB.save.serialize()),ids=[prefix+'_admission',prefix+'_family_plan',label+'_preparation'];
      const old=JSON.stringify(FB.state),rng=FB.getRngState(),uid=FB.getUidCounter();
      const changes=ids.map(function(id){return function(d){delete d.state.stories[id];};}).concat([
        function(d){delete d.state.stories;},function(d){delete d.state.start.storyAttachments;},
        function(d){delete d.storyAttachmentSchema;},function(d){d.storyAttachmentSchema=2;},
        function(d){d.state.start.storyAttachments.schema=2;},function(d){d.state.start.storyAttachments.extra=true;},
        function(d){d.state.start.storyAttachments=null;},function(d){d.state.start.storyAttachments.tracks={};},
        function(d){d.state.start.storyAttachments.tracks.push(d.state.start.storyAttachments.tracks[0]);},
        function(d){d.state.start.storyAttachments.world.push(prefix+'_admission');},
        function(d){d.state.start.storyAttachments.tracks.push('unknown_original_track');},
        function(d){d.state.start.storyAttachments.tracks=Array(513).fill(prefix+'_admission');}
      ]);
      const refused=changes.map(function(change){
        const bad=JSON.parse(JSON.stringify(base));change(bad);let failed=false;
        try{FB.save.restore(bad);}catch(e){failed=true;}
        return failed&&old===JSON.stringify(FB.state)&&rng===FB.getRngState()&&uid===FB.getUidCounter();
      });
      const records=JSON.stringify(FB.state.stories),snapshot=JSON.stringify(FB.state.start.storyAttachments);
      for(let i=0;i<3;i++)FB.save.restore(JSON.parse(FB.save.serialize()));
      return {refused:refused,all:ids.every(function(id){return !!FB.state.stories[id];}),
        stable:records===JSON.stringify(FB.state.stories)&&snapshot===JSON.stringify(FB.state.start.storyAttachments),
        none:FBDATA.techImpactReviews.features.retained_start_attachments.mode};
    },label);
    expect(result.refused).toEqual(Array(15).fill(true));
    expect(result).toMatchObject({all:true,stable:true,none:'none'});
  });
}

test('succession retains the founder attachments and does not enroll or pay for the successor',async function({page},info){
  await prepare(page,info,'harbor',false);
  const result=await page.evaluate(function(){
    const s=FB.state,founder=s.player.charId,original=JSON.stringify(s.start.storyAttachments),
      successor=Object.keys(s.chars).map(function(id){return s.chars[id];}).find(function(c){
        return c.id!==founder&&!c.dead&&c.role==='sibling'&&FB.ageOf(c,s.date.year)>=16;
      });
    s.chars[founder].dead=true;s.player.charId=successor.id;s.player.dead=false;s.player.travel=null;
    ['harbor_admission','harbor_family_plan'].forEach(function(id){FB.stories.get(id).day(s,s.stories[id]);});
    const before=JSON.stringify([s.stories,s.chars,s.player.gold,s.player.provinceId,s.player.travel,s.authority,s.armies]);
    for(let i=0;i<3;i++)FB.save.restore(JSON.parse(FB.save.serialize()));
    const now=FB.state;
    return {snapshot:original===JSON.stringify(now.start.storyAttachments),
      stable:before===JSON.stringify([now.stories,now.chars,now.player.gold,now.player.provinceId,now.player.travel,now.authority,now.armies]),
      actor:now.stories.harbor_admission.actorId===founder&&now.stories.harbor_family_plan.actorId===founder,
      noEnrollment:now.player.travel===null&&now.stories.harbor_admission.roleId===null};
  });
  expect(result).toEqual({snapshot:true,stable:true,actor:true,noEnrollment:true});
});

test('a different imported configuration still fails the exact mod fingerprint',async function({page},info){
  await prepare(page,info,'harbor',false);
  const result=await page.evaluate(function(){
    const saved=JSON.parse(FB.save.serialize()),old=JSON.stringify(FB.state);saved.mods+='different-content';
    try{FB.save.restore(saved);return false;}catch(e){return old===JSON.stringify(FB.state);}
  });
  expect(result).toBe(true);
});
