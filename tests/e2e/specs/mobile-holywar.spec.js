'use strict';
const path = require('path');
const {test,expect} = require('../support/fixture');
const {openGame} = require('../support/game/navigation');
const {beginBookmark} = require('../support/game/bookmark-acceptance');
const {dependsOnRuntime} = require('../support/runtime-dependencies');
const examples = {harbor:require('../fixtures/authoring/mobile-vow-harbor.json'),
  upland:require('../fixtures/authoring/mobile-vow-upland.json')};

dependsOnRuntime(__filename, ['index.html','data/technology.js','data/mobile_confederations.js','data/units.js',
  'js/holywar.js','js/armies.js','js/federates.js','js/mobile_confederations.js','js/mobile_command.js',
  'js/mobile_columns.js','js/story_expedition_participation.js','js/travel.js','js/stories.js',
  'js/story_history.js','js/story_household.js','js/governments.js','js/government_selection.js',
  'js/authority.js','js/treasury.js','js/religion.js','js/wars.js','js/settlement.js','js/home_authority.js','js/starts.js','js/bookmark_setup.js',
  'js/world.js','js/model.js','js/station.js','js/mods.js','js/save.js','js/save_v4.js',
  'js/ui_mobile.js','js/ui_misc.js','js/ui_modals.js','js/main.js']);

async function begin(page, info, label, modified) {
  await openGame(page,info);
  await page.evaluate(function () {FB.ui.showMods();});
  await page.locator('#modfile').setInputFiles(modified ? {name:'mobile-vow.json',mimeType:'application/json',
    buffer:Buffer.from(JSON.stringify(modified))} : path.resolve(__dirname,'../fixtures/authoring/mobile-vow-'+label+'.json'));
  await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded'}),page.locator('#mod-apply').click()]);
  const prefix = label === 'harbor' ? 'harbor' : 'dune';
  await page.waitForFunction(function (prefix) {return window.FB && FB.game && FB.game.bootReady &&
    FBDATA.bookmarks[prefix+'_world'];},prefix);
  await beginBookmark(page,info,prefix+'_world',prefix+'_household');
  await page.evaluate(function (label) {
    const prefix = label === 'harbor' ? 'harbor' : 'dune';
    window.vowTest = {rid:label === 'harbor' ? 'harbor_following' : 'dune_coalition',
      head:label === 'harbor' ? 'harbor_commune' : 'dune_oasis',faith:prefix+'_belief',target:prefix+'_country',
      enemy:label === 'harbor' ? 'harbor_dissent' : 'dune_gate',
      county:label === 'harbor' ? 'harbor_gardens' : 'dune_pass',story:label+'_participation',
      part:function (s) {return s.greatHolyWar.participants.attackers.find(function (p) {return p.realm === this.rid;});},
      call:function (manual) {
        const s=FB.state, original=s.player.charId;
        s.date={year:901,season:0,day:1};
        // A player-led command waits for a reviewed decision. Restore the
        // household protagonist after staging that call-time control choice.
        if (manual) s.player.charId=FB.mobile.row(s,this.rid).leaderId;
        const result=FB.callGreatHolyWar(s,this.faith,this.target,this.head);
        s.player.charId=original;
        if (!result) throw new Error('Expected a legal religious call');
        return result;
      },
      join:function () {
        const s=FB.state, actor=FB.mobile.row(s,this.rid).leaderId;
        return FB.commitMobileGreatHolyWar(s,FB.mobileGreatHolyWarReview(s,this.rid,actor,'join'));
      },
      launch:function () {
        const s=FB.state;
        FB.joinGreatHolyWar(s,'attackers',this.head);
        s.greatHolyWar.launchTurn=s.turn;
        FB.greatHolyWarTick(s);
        if (!s.greatHolyWar || s.greatHolyWar.phase !== 'active') throw new Error('Expected launch');
      }
    };
  },label);
}

for (const label of ['harbor','upland']) {
  test(label+' ordinary import joins one zero-paper mobile host through a pure review',async function ({page},info) {
    await begin(page,info,label);
    const result=await page.evaluate(function () {
      const s=FB.state,t=vowTest,M=FB.mobile,h=M.host(s,t.rid),r=M.row(s,t.rid);
      t.call(true);
      const old=JSON.stringify([s.armies,r.members,r.accounting,r.food,s.owner,s.holder,s.player.gold]),
        before=JSON.stringify(s),rng=FB.getRngState(),uid=FB.getUidCounter();
      const q=FB.mobileGreatHolyWarReview(s,t.rid,r.leaderId,'join');
      const pure=before===JSON.stringify(s)&&rng===FB.getRngState()&&uid===FB.getUidCounter();
      const strength=FB.greatHolyWarStrength(s,'attackers'),joined=FB.commitMobileGreatHolyWar(s,q);
      const delta=FB.greatHolyWarStrength(s,'attackers')-strength;
      return {pure:pure,allowed:q.allowed,joined:joined,repeat:FB.commitMobileGreatHolyWar(s,q),
        unchanged:old===JSON.stringify([s.armies,r.members,r.accounting,r.food,s.owner,s.holder,s.player.gold]),
        delta:delta,actual:h.men,paper:FB.aiBaseHost(s,t.rid),
        bound:t.part(s).mobileVow.hostId===h.id&&t.part(s).mobileVow.leaderId===r.leaderId,
        personal:s.player.greatHolyWar||null,tech:FBDATA.techImpactReviews.features.mobile_religious_vows.mode};
    });
    expect(result).toMatchObject({pure:true,allowed:true,joined:true,repeat:false,unchanged:true,paper:0,bound:true,personal:null,tech:'none'});
    expect(result.delta).toBe(result.actual);
    expect(result.actual).toBeGreaterThan(0);
  });

  test(label+' automatic volunteers use the same binding, actual muster and unchanged camp',async function ({page},info) {
    await begin(page,info,label);
    const result=await page.evaluate(function () {
      const s=FB.state,t=vowTest,M=FB.mobile,host=M.host(s,t.rid),migration=M.migration(s,t.rid),camp=migration.at;
      t.call(false);
      const part=t.part(s),id=host.id,count=s.armies.filter(function (h) {return h.realm===t.rid;}).length;
      t.launch();
      const before=JSON.stringify([s.armies,part,s.greatHolyWar.contribution]);
      FB.greatHolyWarTick(s);FB.greatHolyWarMarkMuster(s,t.rid);
      return {bound:!!part.mobileVow,mustered:part.mustered,holy:host.warId,court:host.mobileCourt,
        one:s.armies.filter(function (h) {return h.realm===t.rid;}).length===count&&M.host(s,t.rid).id===id,
        camp:migration.at===camp,orders:FB.federateHostTravelling(s,host),
        repeat:before===JSON.stringify([s.armies,part,s.greatHolyWar.contribution])};
    });
    expect(result).toEqual({bound:true,mustered:true,holy:'holy',court:false,one:true,camp:true,orders:false,repeat:true});
  });
}

for (const cause of ['faith','leader_faith','leader_generation','death','custody','office','recall']) {
  test('mobile vow interrupts without replacement or lost obligations after '+cause,async function ({page},info) {
    await begin(page,info,'harbor');
    const result=await page.evaluate(function (cause) {
      const s=FB.state,t=vowTest,M=FB.mobile;t.call(true);t.join();t.launch();
      const part=t.part(s),original=JSON.stringify(part.mobileVow),host=M.host(s,t.rid),r=M.row(s,t.rid);
      if (cause==='faith') s.realms[t.rid].religion='harbor_other';
      if (cause==='leader_faith') s.chars[r.leaderId].religion='harbor_other';
      if (cause==='leader_generation') s.realms[t.rid].ruler.generation++;
      if (cause==='death') s.chars[r.leaderId].dead=true;
      if (cause==='custody') s.chars[r.leaderId].captive=true;
      if (cause==='office') s.realms.harbor_upland.ruler.generation++;
      if (cause==='recall') r.command.status='recalled';
      const before=JSON.stringify([s.armies,r.members,r.accounting,r.food,s.owner,s.holder]),people=Object.keys(s.chars).length;
      const camp=FB.greatHolyWarCamp(s,t.rid);
      FB.greatHolyWarTick(s);
      const settled=JSON.stringify([part,s.greatHolyWar.contribution]);FB.greatHolyWarTick(s);
      const prior=JSON.parse(original);
      return {camp:camp,status:part.mobileVow.status,ended:part.mobileVow.endedTurn===s.turn,war:host.warId,
        binding:part.mobileVow.leaderId===prior.leaderId&&part.mobileVow.generation===prior.generation,
        pools:before===JSON.stringify([s.armies.map(function (h) {const v=JSON.parse(JSON.stringify(h));
          if(h.id===host.id){v.warId='holy';}return v;}),r.members,r.accounting,r.food,s.owner,s.holder]),
        people:Object.keys(s.chars).length===people,rejoin:t.join(),repeat:settled===JSON.stringify([part,s.greatHolyWar.contribution])};
    },cause);
    expect(result).toMatchObject({camp:null,status:'interrupted',ended:true,war:null,binding:true,pools:true,people:true,rejoin:false,repeat:true});
  });
}

test('withdrawal retains field people, casualties and contribution and cannot enroll again',async function ({page},info) {
  await begin(page,info,'upland');
  const result=await page.evaluate(function () {
    const s=FB.state,t=vowTest,M=FB.mobile;t.call(true);t.join();t.launch();
    const part=t.part(s),host=M.host(s,t.rid);FB.applyHostLosses(host,7,s);
    FB.addGreatHolyWarContribution(s,t.rid,9);
    const before=JSON.stringify([host.men,host.mobileRoster,M.row(s,t.rid),s.greatHolyWar.contribution]);
    const q=FB.mobileGreatHolyWarReview(s,t.rid,M.row(s,t.rid).leaderId,'withdraw');
    const done=FB.commitMobileGreatHolyWar(s,q);
    FB.ui.showHolyWarOverview();
    const displayed=document.querySelector('[data-holy-war-participant="'+t.rid+'"]');
    return {done:done,again:FB.commitMobileGreatHolyWar(s,q),rejoin:t.join(),status:part.mobileVow.status,
      outcome:part.vowOutcome,camp:FB.greatHolyWarCamp(s,t.rid),
      displayed:displayed.dataset.holyWarMen,withdrawn:displayed.textContent.indexOf('Withdrawn')>=0,
      unchanged:before===JSON.stringify([host.men,host.mobileRoster,M.row(s,t.rid),s.greatHolyWar.contribution])};
  });
  expect(result).toEqual({done:true,again:false,rejoin:false,status:'withdrawn',outcome:'broken',camp:null,displayed:'0',withdrawn:true,unchanged:true});
});

test('defeated field force leaves the camp, vow and prior service without fictitious strength',async function ({page},info) {
  await begin(page,info,'harbor');
  const result=await page.evaluate(function () {
    const s=FB.state,t=vowTest,M=FB.mobile;t.call(true);t.join();t.launch();
    const host=M.host(s,t.rid),part=t.part(s),camp=M.migration(s,t.rid).at,old=FB.greatHolyWarStrength(s,'attackers');
    const men=host.men;FB.applyHostLosses(host,men,s);FB.mobileHostDisband(s,host);
    s.armies=s.armies.filter(function (h) {return h.id!==host.id;});
    FB.greatHolyWarTick(s);
    return {delta:old-FB.greatHolyWarStrength(s,'attackers'),men:men,status:M.row(s,t.rid).status,
      camp:M.migration(s,t.rid).at===camp,vow:part.mobileVow.status,mustered:part.mustered,
      noHost:M.host(s,t.rid)===null,dead:M.row(s,t.rid).accounting.dead>=men};
  });
  expect(result.delta).toBe(result.men);
  expect(result).toMatchObject({status:'active',camp:true,vow:'active',mustered:true,noHost:true,dead:true});
});

for (const label of ['harbor','upland']) {
  test(label+' admission and optional personal vow never duplicate the force or passive contribution',async function ({page},info) {
    await begin(page,info,label);
    const result=await page.evaluate(function () {
      const s=FB.state,t=vowTest,P=FB.expeditionParticipants,rec=s.stories[t.story],module=FB.stories.get(t.story);
      P.commit(s,P.review(s,t.story,'request',s.player.charId,module.declaration.roles[0].id));module.day(s,rec);
      if(rec.status!=='active') throw new Error('Expected real individual admission');
      const noVow=!s.player.greatHolyWar;t.call(true);t.join();
      const old=JSON.stringify([s.armies,FB.mobile.row(s,t.rid),s.player.gold]);
      const joined=FB.joinGreatHolyWar(s,'attackers');
      const unchanged=old===JSON.stringify([s.armies,FB.mobile.row(s,t.rid),s.player.gold]);
      t.launch();FB.greatHolyWarSeason(s);
      const pledge=s.player.greatHolyWar,mustered=pledge.vowTerms.mustered;
      const credit=s.greatHolyWar.contribution.player||0,force=JSON.stringify(s.armies);
      const safe=FB.fns.ghw_service_safe(s),danger=FB.fns.ghw_service_danger(s);
      P.commit(s,P.review(s,t.story,'leave',s.player.charId));
      const served=pledge.vowTerms.served;FB.greatHolyWarSeason(s);
      return {noVow:noVow,joined:joined,unchanged:unchanged,mode:pledge.mode,land:pledge.landEligible,mustered:mustered,
        credit:credit,safe:safe,danger:danger,noForce:force===JSON.stringify(s.armies),
        retained:pledge.vow&&!pledge.withdrawn,stopped:served===pledge.vowTerms.served};
    });
    expect(result).toEqual({noVow:true,joined:true,unchanged:true,mode:'mobile',land:false,mustered:true,
      credit:0,safe:false,danger:false,noForce:true,retained:true,stopped:true});
  });
}

test('matching restore preserves the binding and rejects malformed optional references without repair',async function ({page},info) {
  await begin(page,info,'upland');
  const result=await page.evaluate(function () {
    const s=FB.state,t=vowTest;t.call(true);t.join();t.launch();
    const before=JSON.stringify([s.greatHolyWar,s.armies,FB.mobile.row(s,t.rid),s.player.gold]),rng=FB.getRngState(),uid=FB.getUidCounter();
    FB.save.v4.validatePlatform(s);
    const bad=[function(v){v.schema=2;},function(v){v.hostId='invented';},function(v){v.leaderId='absent';},
      function(v){v.generation=999;},function(v){v.joinedTurn=1;},function(v){v.endedTurn=0;},
      function(v){v.status='rewarded';},function(v){v.men=100;}].map(function(change) {
        const candidate=JSON.parse(JSON.stringify(s));change(t.part(candidate).mobileVow);
        const bytes=JSON.stringify(candidate);let rejected=false;
        try{FB.save.v4.validatePlatform(candidate);}catch(e){rejected=true;}
        return rejected&&bytes===JSON.stringify(candidate);
      });
    FB.save.restore(JSON.parse(FB.save.serialize()));
    const restored=FB.state;
    return {bad:bad,same:before===JSON.stringify([restored.greatHolyWar,restored.armies,FB.mobile.row(restored,t.rid),restored.player.gold]),
      rng:rng===FB.getRngState(),uid:uid===FB.getUidCounter(),rejoin:t.join()};
  });
  expect(result).toEqual({bad:Array(8).fill(true),same:true,rng:true,uid:true,rejoin:false});
});

test('ordinary import rejects invalid mandate, role and opening references without mutation',async function ({page},info) {
  await openGame(page,info);
  const result=await page.evaluate(function (source) {
    return [function(x){x.bookmarks.harbor_world.realms.find(function(r){return r.mobile;}).mobile.command.operations.push('invented_vow');},
      function(x){x.storyInstances.harbor_participation.roles[0].kind='army';},
      function(x){x.bookmarks.harbor_world.realms.find(function(r){return r.mobile;}).mobile.opening.leaderMemberId='absent';}].map(function(change) {
        const input=JSON.parse(JSON.stringify(source));change(input);
        const before=JSON.stringify([FB.state,FBDATA,input]),rng=FB.getRngState(),uid=FB.getUidCounter();
        return FB.mods.validate(input).length>0&&before===JSON.stringify([FB.state,FBDATA,input])&&rng===FB.getRngState()&&uid===FB.getUidCounter();
      });
  },examples.harbor);
  expect(result).toEqual([true,true,true]);
});

test('a changed reviewed host or campaign rejects a stale commitment without spending or adding people',async function ({page},info) {
  await begin(page,info,'harbor');
  const result=await page.evaluate(function () {
    const s=FB.state,t=vowTest;t.call(true);
    const q=FB.mobileGreatHolyWarReview(s,t.rid,FB.mobile.row(s,t.rid).leaderId,'join');
    FB.mobile.host(s,t.rid).mobileFood+=1;
    const before=JSON.stringify(s),rng=FB.getRngState(),uid=FB.getUidCounter();
    return !FB.commitMobileGreatHolyWar(s,q)&&before===JSON.stringify(s)&&rng===FB.getRngState()&&uid===FB.getUidCounter();
  });
  expect(result).toBe(true);
});

test('host, mandate, permission, actor and finite service gates reject without mutation',async function ({page},info) {
  await begin(page,info,'harbor');
  const result=await page.evaluate(function () {
    const base=FB.state,t=vowTest;t.call(true);
    return [function(s){s.armies=s.armies.filter(function(h){return h.realm!==t.rid;});},
      function(s){FB.mobile.host(s,t.rid).moveLeft=2;},
      function(s){FB.mobile.row(s,t.rid).command.status='recalled';},
      function(s){s.realms.harbor_upland.ruler.generation++;},
      function(s){s.chars[FB.mobile.row(s,t.rid).leaderId].captive=true;}].map(function(change) {
        const s=JSON.parse(JSON.stringify(base));change(s);
        const before=JSON.stringify(s),rng=FB.getRngState(),uid=FB.getUidCounter();
        const q=FB.mobileGreatHolyWarReview(s,t.rid,FB.mobile.row(s,t.rid).leaderId,'join');
        return !q.allowed&&!FB.commitMobileGreatHolyWar(s,q)&&before===JSON.stringify(s)&&rng===FB.getRngState()&&uid===FB.getUidCounter();
      });
  });
  expect(result).toEqual(Array(5).fill(true));
});

test('a valid imported command without war permission cannot promise its host',async function ({page},info) {
  const input=JSON.parse(JSON.stringify(examples.harbor));
  const command=input.bookmarks.harbor_world.realms.find(function(r){return r.mobile;}).mobile.command;
  command.operations=command.operations.filter(function(op){return op!=='war';});
  await begin(page,info,'harbor',input);
  expect(await page.evaluate(function () {
    const s=FB.state,t=vowTest;t.call(true);
    return !t.join()&&!t.part(s)&&s.player.greatHolyWar===null;
  })).toBe(true);
});

test('supplied service counters never create a historical mobile muster',async function ({page},info) {
  await begin(page,info,'upland');
  const result=await page.evaluate(function () {
    const s=FB.state,t=vowTest;t.call(true);
    const joined=FB.joinGreatHolyWar(s,'attackers',t.rid,{seasons:8,served:8,mustered:true,desire:{kind:'honor',id:null}});
    return {joined:joined,served:t.part(s).served,mustered:t.part(s).mustered,seasons:t.part(s).vowSeasons};
  });
  expect(result).toEqual({joined:true,served:0,mustered:false,seasons:8});
});

test('personal mobile references reject erased or mismatched admission without reenrollment',async function ({page},info) {
  await begin(page,info,'harbor');
  const result=await page.evaluate(function () {
    const s=FB.state,t=vowTest,P=FB.expeditionParticipants,m=FB.stories.get(t.story);
    P.commit(s,P.review(s,t.story,'request',s.player.charId,'guest'));m.day(s,s.stories[t.story]);
    t.call(true);t.join();FB.joinGreatHolyWar(s,'attackers');
    FB.save.v4.validatePlatform(s);
    const changes=[function(c){delete c.player.greatHolyWar.mobileParticipation;},
      function(c){c.player.greatHolyWar.mobileParticipation.participationId='missing';},
      function(c){c.player.greatHolyWar.mobileParticipation.schema=2;},
      function(c){c.player.greatHolyWar.mobileParticipation.hostId='invented';},
      function(c){c.player.greatHolyWar.landEligible=true;}];
    return changes.map(function(change) {
      const c=JSON.parse(JSON.stringify(s));change(c);const before=JSON.stringify(c);let bad=false;
      try{FB.save.v4.validatePlatform(c);}catch(e){bad=true;}
      return bad&&before===JSON.stringify(c);
    });
  });
  expect(result).toEqual(Array(5).fill(true));
});

test('same saved opening replays the actual campaign, host and accounting deterministically',async function ({page},info) {
  await begin(page,info,'upland');
  const result=await page.evaluate(function () {
    const opening=FB.save.serialize();
    function run() {
      const s=FB.state,t=vowTest;t.call(true);t.join();t.launch();
      FB.applyHostLosses(FB.mobile.host(s,t.rid),5,s);FB.greatHolyWarSeason(s);
      return JSON.stringify([s.greatHolyWar,s.armies,FB.mobile.row(s,t.rid),s.owner,s.holder,FB.getRngState(),FB.getUidCounter()]);
    }
    const first=run();FB.save.restore(JSON.parse(opening));
    return first===run();
  });
  expect(result).toBe(true);
});

test('real mobile field losses receive one canonical battle credit and never a copied player credit',async function ({page},info) {
  await begin(page,info,'upland');
  const result=await page.evaluate(function () {
    const s=FB.state,t=vowTest;t.call(true);t.join();t.launch();
    const mobile=FB.mobile.host(s,t.rid),enemy={realm:t.enemy,men:80},before=s.greatHolyWar.contribution[t.rid]||0;
    FB.applyHostLosses(mobile,6,s);
    const done=FB.greatHolyWarBattle(s,t.county,mobile,enemy,6,100);
    return {done:done,credit:s.greatHolyWar.contribution[t.rid]-before,player:s.greatHolyWar.contribution.player||0,
      matches:mobile.men===mobile.mobileRoster.reduce(function(n,c){return n+c.count;},0)};
  });
  expect(result).toEqual({done:true,credit:6,player:0,matches:true});
});

test('only actual occupied objectives enter the one canonical settlement and its awards cannot replay',async function ({page},info) {
  await begin(page,info,'upland');
  const result=await page.evaluate(function () {
    const s=FB.state,t=vowTest;t.call(true);t.join();t.launch();
    const campaign=s.greatHolyWar,owner=JSON.stringify(s.owner),camp=FB.mobile.migration(s,t.rid).at;
    FB.addGreatHolyWarContribution(s,t.rid,100);
    const noPreview=FB.greatHolyWarStrength(s,'attackers')>0&&owner===JSON.stringify(s.owner);
    // This is the existing occupation owner's committed field outcome, not
    // a historical win or a grant made by the mobile adapter.
    campaign.occupations[t.county]={occupied:true,progress:0,progressCamp:'attackers',occupiedBy:t.rid};
    const originalObserve=FB.game.observe;FB.game.observe=true;
    const resolved=FB.resolveGreatHolyWar(s,'attackers','objectives');FB.game.observe=originalObserve;
    const entry=s.greatHolyWarHistory.campaigns.find(function(c){return c.id===campaign.id;});
    const snapshot=JSON.stringify([s.owner,s.holder,s.realms,s.authority,s.armies,s.greatHolyWarHistory]);
    const repeated=FB.resolveGreatHolyWar(s,'attackers','objectives');FB.repairGreatHolyWar(s);
    return {noPreview:noPreview,resolved:resolved,finished:s.greatHolyWar===null,repeated:repeated,
      once:s.greatHolyWarHistory.campaigns.filter(function(c){return c.id===campaign.id;}).length,
      captured:campaign.settlement.captured,county:t.county,awards:!!entry&&entry.awards.length>0,
      changed:s.owner[t.county]!==t.enemy,camp:FB.mobile.migration(s,t.rid).at===camp,
      noReplay:snapshot===JSON.stringify([s.owner,s.holder,s.realms,s.authority,s.armies,s.greatHolyWarHistory])};
  });
  expect(result).toMatchObject({noPreview:true,resolved:true,finished:true,repeated:false,once:1,awards:true,changed:true,camp:true,noReplay:true});
  expect(result.captured).toEqual([result.county]);
});

test('mobile vow review preserves form state through Escape and confirms only current terms',async function ({page},info) {
  await begin(page,info,'harbor');
  await page.evaluate(function () {
    const s=FB.state,t=vowTest;t.call(true);
    // Stage control by the already existing landed commander for this UI
    // boundary. No second person or command is created by the interaction.
    s.player.charId=FB.mobile.row(s,t.rid).leaderId;
    FB.ui.showMobileConfederation(t.rid);
  });
  await page.locator('#mobile-count').fill('27');
  await page.locator('#mobile-count').dispatchEvent('change');
  await page.getByRole('button',{name:'Pledge the existing host',exact:true}).click();
  await expect(page.getByText('This binds the current commander', {exact:false})).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('#mobile-count')).toHaveValue('27');
  await page.getByRole('button',{name:'Pledge the existing host',exact:true}).click();
  await page.locator('#mobile-confirm').click();
  await page.locator('#mobile-continue').click();
  await expect(page.locator('#mobile-count')).toHaveValue('27');
  expect(await page.evaluate(function () {return !!vowTest.part(FB.state).mobileVow;})).toBe(true);
});
