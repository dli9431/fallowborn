'use strict';
const {test,expect}=require('../support/fixture');
const {openGame}=require('../support/game/navigation');
const {beginBookmark}=require('../support/game/bookmark-acceptance');
const {dependsOnRuntime}=require('../support/runtime-dependencies');
const imports={harbor:require('../fixtures/authoring/mobile-vow-harbor.json'),
  upland:require('../fixtures/authoring/mobile-vow-upland.json')};
const callId='eastern_undertaking_1096', observerId='eastern_undertaking_households_1096';

dependsOnRuntime(__filename,[
  'index.html','data/bookmark_1096.js','data/bookmark_1096_campaigns.js',
  'data/story_household_effects_1096.js','data/story_world_1096.js','data/expeditions_1096.js',
  'data/bookmark_1096_scaffold_a.js','data/bookmark_1096_scaffold_b.js',
  'data/bookmark_1096_scaffold_c.js','data/bookmark_1096_scaffold_d.js',
  'data/identities_1096.js','data/institutions_1096.js','data/cultures.js','data/eras.js',
  'data/starts_pilgrim_1096.js','data/story_pilgrim_1096.js','data/technology.js','data/papacy.js',
  'js/stories.js','js/story_history.js','js/story_household_observer.js','js/story_household.js',
  'js/holywar.js','js/papacy.js','js/religion.js','js/world.js','js/starts.js','js/bookmark_setup.js',
  'js/armies.js','js/federates.js','js/settlement.js','js/wars.js','js/treasury.js',
  'js/mobile_confederations.js','js/mobile_command.js','js/mobile_columns.js','js/home_authority.js',
  'js/story_expedition_participation.js','js/expedition_programs.js','js/model.js','js/station.js',
  'js/governments.js','js/government_selection.js','js/authority.js','js/systems.js','js/mods.js',
  'js/save.js','js/save_v4.js','js/main.js','js/util.js'
]);

async function historical(page,info) {
  await beginBookmark(page,info,'1096','pilgrim_household_1096');
  await page.evaluate(function (ids) {
    window.worldCase={id:ids[0],observer:ids[1],
      // A detached, player-pending opening permits direct boundary checks.
      // Existing canonical people are retained; no declaration is fabricated.
      pending:function () {
        const s=JSON.parse(JSON.stringify(FB.state)), original=s.player.charId;
        s.greatHolyWar=null;s.greatHolyWarHistory={};
        s.player.charId=s.stories[this.id].openingCall.headCharacterId;
        s.stories[this.id]=FB.stories.get(this.id).init(s);
        if (s.stories[this.id].phase!=='pending') throw new Error('Expected the current head to retain a decision');
        s.player.charId=original;return s;
      },
      day:function (s) {FB.stories.get(this.id).day(s,s.stories[this.id]);},
      date:function (s,turn) {s.date=FB.dateAtTurn(s,turn);s.turn=turn;}
    };
  },[callId,observerId]);
}

test('1096 attaches one current call with no historical expedition, duplicate news or involuntary vow',async function ({page},info) {
  await historical(page,info);
  const result=await page.evaluate(function () {
    const s=FB.state,C=worldCase,r=s.stories[C.id],c=s.greatHolyWar,b=FB.campaignBookmark(s);
    const before=JSON.stringify([s.stories,s.greatHolyWar,s.greatHolyWarHistory,s.armies,s.owner,s.chars]);
    const attached=FB.stories.start(s);C.day(s);FB.prepareOpeningHolyWarCalls(s);
    return {valid:FB.validateBookmark(b),stories:b.stories,
      calls:b.stories.filter(function (id) {return FBDATA.storyInstances[id].type==='holy_war';}),
      linked:r.phase==='started' && r.openingCall.disposition==='called' && r.campaignId===c.id &&
        r.calledTurn===c.calledTurn && r.callerRealmId===c.callerRealm && r.callerCharacterId===c.callerClaimantId,
      target:c.targetKingdom,phase:c.phase,sequence:s.greatHolyWarHistory.sequence,
      seeded:r.seededIds,archive:s.greatHolyWarHistory.campaigns,attached:attached,
      repeat:before===JSON.stringify([s.stories,s.greatHolyWar,s.greatHolyWarHistory,s.armies,s.owner,s.chars]),
      second:FB.callGreatHolyWar(s,'catholic','syria','papacy_1096'),
      historicalHosts:b.realms.filter(function (r) {return !!r.mobile;}).length,
      personal:s.player.greatHolyWar || null,local:FB.stories.status(s,C.observer),
      news:FBDATA.storyInstances[C.id].news || null,
      dates:[FBDATA.storyInstances[C.id].firstDate,FBDATA.storyInstances[C.id].lastDate]};
  });
  expect(result).toEqual({valid:[],stories:[callId,observerId],calls:[callId],linked:true,target:'syria',
    phase:'preparation',sequence:1,seeded:[],archive:[],attached:[],repeat:true,second:false,
    historicalHosts:0,personal:null,local:null,news:null,
    dates:[{year:1096,season:0,day:1},{year:1096,season:0,day:90}]});
});

for (const cause of ['missing_head','dead_head','generation','authority','cooldown','friendly_target','missed_window']) {
  test('the actual 1096 declaration closes without calling for '+cause,async function ({page},info) {
    await historical(page,info);
    const result=await page.evaluate(function (cause) {
      const C=worldCase,s=C.pending(),r=s.stories[C.id],head=r.openingCall.headRealmId;
      if (cause==='missing_head') s.realms[head].alive=false;
      if (cause==='dead_head') s.chars[r.openingCall.headCharacterId].dead=true;
      if (cause==='generation') s.realms[head].ruler.generation++;
      if (cause==='authority') {
        const p=FB.papacyState(s,'catholic');p.obediences[p.romanObedience].authority=0;
      }
      if (cause==='cooldown') {FB.ensureGreatHolyWar(s);s.greatHolyWarHistory.cooldownUntil.catholic=100;}
      if (cause==='friendly_target') FB.kingdomCounties('syria').forEach(function (pid) {
        s.owner[pid]=head;s.holder[pid]=head;
      });
      if (cause==='missed_window') C.date(s,90);
      const facts=JSON.stringify([s.owner,s.holder,s.chars,s.armies,s.player.gold]);C.day(s);
      const closed=JSON.stringify([r,s.greatHolyWar,s.greatHolyWarHistory]),rng=FB.getRngState(),uid=FB.getUidCounter();
      C.day(s);FB.prepareOpeningHolyWarCalls(s);
      return {phase:r.phase,result:r.result,disposition:r.openingCall.disposition,campaign:s.greatHolyWar,
        linked:r.campaignId,noTransaction:facts===JSON.stringify([s.owner,s.holder,s.chars,s.armies,s.player.gold]),
        stable:closed===JSON.stringify([r,s.greatHolyWar,s.greatHolyWarHistory]) &&
          rng===FB.getRngState() && uid===FB.getUidCounter()};
    },cause);
    expect(result).toEqual({phase:'resolved',result:'diverted',disposition:'unavailable',campaign:null,
      linked:null,noTransaction:true,stable:true});
  });
}

test('later dates create no substitute historical march, conquest, appointment or report',async function ({page},info) {
  await historical(page,info);
  const result=await page.evaluate(function () {
    const C=worldCase,base=FB.state;
    return [75,234,451,840,1184].map(function (turn) {
      const s=JSON.parse(JSON.stringify(base));C.date(s,turn);
      const before=JSON.stringify([s.owner,s.holder,s.chars,s.realms,s.armies,s.player.gold,s.greatHolyWarHistory]);
      C.day(s);FB.expeditionPrograms.day(s);FB.stories.get(C.observer).day(s,s.stories[C.observer]);
      return before===JSON.stringify([s.owner,s.holder,s.chars,s.realms,s.armies,s.player.gold,s.greatHolyWarHistory]) &&
        !FB.stories.status(s,C.observer) && !s.player.greatHolyWar &&
        Object.keys(FBDATA.storyExpeditions1096).length===0 && s.player.provinceId==='cologne';
    });
  });
  expect(result).toEqual(Array(5).fill(true));
});

test('the current head can decline at the last opening boundary without charging a household',async function ({page},info) {
  await historical(page,info);
  const result=await page.evaluate(function () {
    const C=worldCase,s=C.pending(),r=s.stories[C.id];s.player.charId=r.openingCall.headCharacterId;C.date(s,89);
    const before=JSON.stringify([s.player.gold,s.owner,s.holder,s.armies,s.chars]),rng=FB.getRngState(),uid=FB.getUidCounter();
    const q=FB.stories.quote(s,C.id,'decline'),applied=FB.stories.apply(s,C.id,'decline',q);
    C.date(s,90);C.day(s);
    return {allowed:q.allowed,applied:applied,result:r.result,disposition:r.openingCall.disposition,campaign:s.greatHolyWar,
      noFine:before===JSON.stringify([s.player.gold,s.owner,s.holder,s.armies,s.chars]),
      random:rng===FB.getRngState() && uid===FB.getUidCounter()};
  });
  expect(result).toEqual({allowed:true,applied:true,result:'declined',disposition:'declined',campaign:null,noFine:true,random:true});
});

test('matching saves retain the one campaign and missing older story records remain absent',async function ({page},info) {
  await historical(page,info);
  const result=await page.evaluate(function () {
    const C=worldCase,owners=function () {const s=FB.state;return JSON.stringify([s.stories,s.greatHolyWar,
      s.greatHolyWarHistory,s.owner,s.holder,s.chars,s.realms,s.armies,s.player.gold]);};
    const before=owners(),rng=FB.getRngState(),uid=FB.getUidCounter(),saved=JSON.parse(FB.save.serialize());
    FB.save.restore(saved);FB.stories.restore(FB.state);FB.prepareOpeningHolyWarCalls(FB.state);
    const exact=before===owners(),random=(rng>>>0)===(FB.getRngState()>>>0) && uid===FB.getUidCounter();
    delete saved.state.stories[C.id];delete saved.state.stories[C.observer];
    FB.save.restore(saved);FB.stories.restore(FB.state);FB.prepareOpeningHolyWarCalls(FB.state);
    return {exact:exact,random:random,missing:!FB.state.stories[C.id] && !FB.state.stories[C.observer],
      campaign:FB.state.greatHolyWar.id===saved.state.greatHolyWar.id,sequence:FB.state.greatHolyWarHistory.sequence};
  });
  expect(result).toEqual({exact:true,random:true,missing:true,campaign:true,sequence:1});
});

test('1096 call provenance rejects malformed saves before replacing the current campaign',async function ({page},info) {
  await historical(page,info);
  const result=await page.evaluate(function () {
    const C=worldCase,source=JSON.parse(FB.save.serialize());
    return [function (saved) {saved.state.stories[C.id].openingCall.schema=2;},
      function (saved) {saved.state.stories[C.id].openingCall.headCharacterId='missing_head';},
      function (saved) {saved.state.greatHolyWar.targetKingdom='unrelated_target';}].map(function (change) {
      const saved=JSON.parse(JSON.stringify(source));change(saved);
      const state=FB.state,before=JSON.stringify(state),rng=FB.getRngState(),uid=FB.getUidCounter();
      let rejected=false;try {FB.save.restore(saved);} catch (error) {rejected=true;}
      return rejected && state===FB.state && before===JSON.stringify(FB.state) &&
        rng===FB.getRngState() && uid===FB.getUidCounter();
    });
  });
  expect(result).toEqual([true,true,true]);
});

test('the local observer reads an actual failed campaign once and rejects stale source-person reviews',async function ({page},info) {
  await historical(page,info);
  const result=await page.evaluate(function () {
    let s=FB.state;const C=worldCase,campaign=s.greatHolyWar.id;
    // Boundary setup: a household is actually resident and present in the objective county.
    s.player.provinceId='jerusalem';s.player.travel=null;C.date(s,1);
    const owners=JSON.stringify([s.owner,s.holder,s.player.gold]);
    const settled=FB.resolveGreatHolyWar(s,'defenders','defense');C.day(s);
    const observer=FB.stories.get(C.observer);observer.day(s,s.stories[C.observer]);
    const item=s.stories[C.observer].pending[0],q=FB.stories.quote(s,C.observer,'livelihood');
    const key=FB.householdStories.receiptKey(s.stories[C.observer].householdId,
      {source:C.id,milestone:'failed',provinceId:'jerusalem',turn:s.turn,before:null,after:null});
    const head=s.chars[s.stories[C.id].callerCharacterId];head.dead=true;
    const before=JSON.stringify(s),stale=FB.stories.apply(s,C.observer,'livelihood',q),pure=before===JSON.stringify(s);
    head.dead=false;
    const applied=FB.stories.apply(s,C.observer,'livelihood',FB.stories.quote(s,C.observer,'livelihood'));
    const closed=JSON.stringify(s.stories[C.observer]),saved=JSON.parse(FB.save.serialize());
    FB.save.restore(saved);s=FB.state;observer.day(s,s.stories[C.observer]);
    return {settled:settled,offered:q.allowed,key:item.key===key,stale:stale,pure:pure,applied:applied,
      replay:FB.stories.apply(s,C.observer,'livelihood',q),closed:closed===JSON.stringify(s.stories[C.observer]),
      noReward:owners===JSON.stringify([s.owner,s.holder,s.player.gold]),
      once:s.greatHolyWarHistory.campaigns.filter(function (c) {return c.id===campaign;}).length};
  });
  expect(result).toEqual({settled:true,offered:true,key:true,stale:false,pure:true,applied:true,replay:false,
    closed:true,noReward:true,once:1});
});

test('an expired local report closes without replacing a campaign outcome or rewarding a household',async function ({page},info) {
  await historical(page,info);
  const result=await page.evaluate(function () {
    const s=FB.state,C=worldCase;s.player.provinceId='jerusalem';s.player.travel=null;C.date(s,1);
    FB.resolveGreatHolyWar(s,'defenders','defense');C.day(s);
    const story=FB.stories.get(C.observer),r=s.stories[C.observer];story.day(s,r);
    const offered=!!FB.stories.status(s,C.observer),q=FB.stories.quote(s,C.observer,'livelihood');
    const before=JSON.stringify([s.owner,s.holder,s.greatHolyWarHistory,s.player.gold]);
    C.date(s,32);story.day(s,r);
    return {offered:offered,status:FB.stories.status(s,C.observer),stale:FB.stories.apply(s,C.observer,'livelihood',q),
      expired:Object.keys(r.householdReceipts).every(function (key) {return r.householdReceipts[key].status==='expired';}),
      receipts:Object.keys(r.householdReceipts).length,
      unchanged:before===JSON.stringify([s.owner,s.holder,s.greatHolyWarHistory,s.player.gold])};
  });
  expect(result).toEqual({offered:true,status:null,stale:false,expired:true,receipts:1,unchanged:true});
});

// Each complete independent world is uploaded through the ordinary Mods picker.
// Rebinding the shipped declarations demonstrates data composition, not historical evidence.
async function imported(page,info,label,withPersonal) {
  await openGame(page,info);
  const definitions=await page.evaluate(function (ids) {
    return ids.map(function (id) {return JSON.parse(JSON.stringify(FBDATA.storyInstances[id]));});
  },[callId,observerId]);
  const source=JSON.parse(JSON.stringify(imports[label])),prefix=label==='harbor' ? 'harbor' : 'dune';
  const id=prefix+'_world_call',notice=prefix+'_world_notice',b=source.bookmarks[prefix+'_world'];
  const call=definitions[0],observer=definitions[1],county=prefix+(label==='harbor' ? '_gardens' : '_pass');
  call.id=id;call.religion=prefix+'_belief';call.target.kingdomId=prefix+'_country';
  call.firstDate={year:901,season:0,day:label==='harbor' ? 1 : 3};
  call.lastDate={year:901,season:0,day:label==='harbor' ? 6 : 9};
  observer.id=notice;observer.sourceStoryId=id;observer.requires=[id];
  observer.provinceIds=[county];observer.requirements.provinces=[county];observer.expiryTurns=label==='harbor' ? 5 : 12;
  b.date={year:901,season:0,day:1};b.stories.push(id,notice);
  source.storyInstances[id]=call;source.storyInstances[notice]=observer;
  if (withPersonal) {
    const track=prefix+'_personal_report',scenario=source.startScenarios.find(function (d) {return d.id===prefix+'_household';});
    source.storyInstances[track]={id:track,type:'household_track',title:'The household’s own report',intro:'Review a real campaign ending.',
      homeProvinceId:scenario.fixedProvinceId,continuity:'protagonist',initialStage:'waiting',interruptedStage:'interrupted',
      requires:[id],requirements:{provinces:[county,scenario.fixedProvinceId]},stages:{
        waiting:{name:'A campaign report',text:'Review the actual ending at home.',
          incident:{source:'story',storyId:id,milestone:'failed',provinceId:county},afterIncident:'finished',
          choices:[{id:'acknowledge',label:'Review the ending',detail:'No payment or reward.',
            operation:{kind:'record_decision'},next:'finished'}],transitions:[]},
        finished:{name:'Report reviewed',text:'Ordinary life continues.',terminal:true,choices:[],transitions:[]},
        interrupted:{name:'Report interrupted',text:'The original personal review has ended.',terminal:true,choices:[],transitions:[]}
      }};
    scenario.tracks.push(track);scenario.trackLocations[track]=[scenario.fixedProvinceId];
  }
  await page.evaluate(function () {FB.ui.showMods();});
  await page.locator('#modfile').setInputFiles({name:'world-'+label+'.json',mimeType:'application/json',
    buffer:Buffer.from(JSON.stringify(source))});
  await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded'}),page.locator('#mod-apply').click()]);
  await page.waitForFunction(function (id) {return window.FB && FB.game && FB.game.bootReady && !!FB.stories.get(id);},id);
  await beginBookmark(page,info,prefix+'_world',prefix+'_household');
  return {id:id,notice:notice,county:county,rid:label==='harbor' ? 'harbor_following' : 'dune_coalition',
    head:prefix+(label==='harbor' ? '_commune' : '_oasis')};
}

test('an imported personal review and world notice share the exact canonical outcome receipt',async function ({page},info) {
  const ids=await imported(page,info,'upland',true);
  const result=await page.evaluate(function (ids) {
    const s=FB.state,track='dune_personal_report',story=FB.stories.get(ids.id),observer=FB.stories.get(ids.notice);
    s.date=FB.dateAtTurn(s,2);s.turn=2;story.day(s,s.stories[ids.id]);
    s.player.provinceId=ids.county;s.player.travel=null;
    const resolved=FB.resolveGreatHolyWar(s,'defenders','defense');story.day(s,s.stories[ids.id]);
    observer.day(s,s.stories[ids.notice]);
    const item=s.stories[ids.notice].pending[0],preferred=item && FB.householdStories.owner(s,item.key),
      hidden=FB.stories.status(s,ids.notice)===null,
      applied=FB.stories.apply(s,track,'acknowledge',FB.stories.quote(s,track,'acknowledge'));
    observer.day(s,s.stories[ids.notice]);
    return {resolved:resolved,preferred:preferred,hidden:hidden,applied:applied,
      source:item.event.source,personal:Object.keys(s.stories[track].householdReceipts),key:item.key,
      observerReceipts:Object.keys(s.stories[ids.notice].householdReceipts).length,status:FB.stories.status(s,ids.notice)};
  },ids);
  expect(result).toMatchObject({resolved:true,preferred:'dune_personal_report',hidden:true,applied:true,
    source:ids.id,observerReceipts:0,status:null});
  expect(result.personal).toEqual([result.key]);
});

for (const label of ['harbor','upland']) {
  test(label+' imported undertaking binds one actual mobile muster, battle credit and canonical award',async function ({page},info) {
    const ids=await imported(page,info,label);
    const result=await page.evaluate(function (ids) {
      const s=FB.state,M=FB.mobile,story=FB.stories.get(ids.id),rec=s.stories[ids.id],
        initial=rec.phase,host=M.host(s,ids.rid),hostId=host.id,camp=M.migration(s,ids.rid).at;
      const positions=JSON.stringify([host.at,M.migration(s,ids.rid).at,s.owner,s.player.gold]);
      if (rec.phase==='pending') {
        FB.greatHolyWarYearly(s);FB.greatHolyWarTick(s);
        if (s.greatHolyWar) throw new Error('A pending window must reserve this faith’s opening');
        s.date=FB.dateAtTurn(s,2);s.turn=2;story.day(s,rec);
      }
      const c=s.greatHolyWar;if (!c) throw new Error('Expected the imported eligible call');
      const part=c.participants.attackers.find(function (p) {return p.realm===ids.rid;});
      if (!part) throw new Error('Expected ordinary mobile volunteers');
      const noMarch=positions===JSON.stringify([host.at,M.migration(s,ids.rid).at,s.owner,s.player.gold]);
      FB.joinGreatHolyWar(s,'attackers',ids.head);c.launchTurn=s.turn;FB.greatHolyWarTick(s);
      const mustered=part.mustered && part.mobileVow.hostId===hostId && M.host(s,ids.rid).id===hostId;
      const count=s.armies.filter(function (a) {return a.realm===ids.rid;}).length;
      FB.greatHolyWarMarkMuster(s,ids.rid);story.day(s,rec);FB.prepareOpeningHolyWarCalls(s);
      const one=count===s.armies.filter(function (a) {return a.realm===ids.rid;}).length;
      const previous=c.contribution[ids.rid] || 0;
      FB.applyHostLosses(host,6,s);
      const battle=FB.greatHolyWarBattle(s,ids.county,host,{realm:s.owner[ids.county],men:80},6,100);
      const credit=(c.contribution[ids.rid] || 0)-previous;
      const noPlayerCredit=(c.contribution.player || 0)===0;
      // The canonical occupation owner's committed result is staged directly.
      // A calendar date and a local observer never supply this fact.
      c.occupations[ids.county]={occupied:true,progress:0,progressCamp:'attackers',occupiedBy:ids.rid};
      const original=FB.game.observe;FB.game.observe=true;
      const settled=FB.resolveGreatHolyWar(s,'attackers','objectives');FB.game.observe=original;
      story.day(s,rec);
      const archive=s.greatHolyWarHistory.campaigns.find(function (x) {return x.id===c.id;});
      const saved=JSON.parse(FB.save.serialize()),before=JSON.stringify([s.owner,s.holder,s.realms,s.armies,
        s.greatHolyWarHistory,s.stories]),rng=FB.getRngState(),uid=FB.getUidCounter();
      const repeat=FB.resolveGreatHolyWar(s,'attackers','objectives');
      FB.save.restore(saved);story.day(FB.state,FB.state.stories[ids.id]);FB.stories.restore(FB.state);
      const x=FB.state;
      return {initial:initial,noMarch:noMarch,mustered:mustered,one:one,battle:battle,credit:credit,
        noPlayerCredit:noPlayerCredit,settled:settled,result:rec.result,captured:c.settlement.captured,
        awards:archive.awards.length>0,once:x.greatHolyWarHistory.campaigns.filter(function (r) {return r.id===c.id;}).length,
        repeat:repeat,camp:M.migration(x,ids.rid).at===camp,
        exact:before===JSON.stringify([x.owner,x.holder,x.realms,x.armies,x.greatHolyWarHistory,x.stories]),
        random:(rng>>>0)===(FB.getRngState()>>>0) && uid===FB.getUidCounter()};
    },ids);
    expect(result).toEqual({initial:label==='harbor' ? 'started' : 'pending',noMarch:true,mustered:true,one:true,
      battle:true,credit:6,noPlayerCredit:true,settled:true,result:'won',captured:[ids.county],awards:true,
      once:1,repeat:false,camp:true,exact:true,random:true});
  });
}
