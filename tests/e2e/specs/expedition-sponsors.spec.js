'use strict';
const path=require('path');
const {test,expect}=require('../support/fixture');
const {openGame}=require('../support/game/navigation');
const {beginBookmark}=require('../support/game/bookmark-acceptance');
const {dependsOnRuntime}=require('../support/runtime-dependencies');
const examples={harbor:require('../fixtures/authoring/mobile-expedition-harbor.json'),
  dune:require('../fixtures/authoring/mobile-expedition-dune.json')};
const sponsored=require('../fixtures/authoring/mobile-command-dune.json');
dependsOnRuntime(__filename,['index.html','data/mobile_confederations.js','data/units.js','data/technology.js',
  'js/mobile_confederations.js','js/mobile_command.js','js/expedition_programs.js','js/mobile_columns.js','js/federates.js','js/government_continuity.js',
  'js/governments.js','js/government_selection.js','js/government_support.js','js/bookmark_setup.js','js/world.js','js/mods.js',
  'js/authority.js','js/treasury.js','js/armies.js','js/population.js','js/settlement.js','js/starts.js','js/util.js',
  'js/save.js','js/save_v4.js','js/ui_mobile.js','js/ui_misc.js','js/main.js','js/wars.js','js/model.js','js/station.js','js/technology.js']);

async function start(page,info,prefix,input) {
  await openGame(page,info);
  await page.evaluate(function () {FB.ui.showMods();});
  await page.locator('#modfile').setInputFiles(input ? {
    name:'expedition-example.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(input))
  } : path.resolve(__dirname,'../fixtures/authoring/mobile-expedition-'+prefix+'.json'));
  await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded'}),page.locator('#mod-apply').click()]);
  await page.waitForFunction(function (prefix) {return window.FB && FB.game && FB.game.bootReady && FBDATA.bookmarks[prefix+'_world'];},prefix);
  await beginBookmark(page,info,prefix+'_world',prefix+'_household');
}

for (const prefix of ['harbor','dune']) {
  test(prefix+' imports an independent expedition with conserved resources and matching restore',async function ({page},info) {
    await start(page,info,prefix);
    const result=await page.evaluate(function (prefix) {
      const s=FB.state,M=FB.mobile,d=FB.campaignBookmark(s).realms.find(function (d) {return d.mobile;});
      const rid=d.id,r=M.row(s,rid),moving=M.migration(s,rid),host=M.host(s,rid);
      const bytes=JSON.stringify(s),rng=FB.getRngState(),uid=FB.getUidCounter(),snapshot=M.commandSnapshot(s,rid);
      FB.save.v4.validateAuthority(s.authority,s);M.validate(s);M.commandSnapshot(s,rid);M.initialize(s,[d]);
      const pure=bytes===JSON.stringify(s) && rng===FB.getRngState() && uid===FB.getUidCounter();
      const record=JSON.stringify([r,moving,host,s.chars,s.owner,s.holder,FB.treasuryAvailable(s,rid),s.player.gold]);
      FB.save.restore(JSON.parse(FB.save.serialize()));
      const restored=FB.state;
      return {pure:pure,independent:moving.sponsorship,patron:moving.patronRealmId,
        total:M.total(restored,rid)===r.accounting.initial,treasury:FB.treasuryAvailable(restored,rid)===d.mobile.treasury+
          ((FBDATA.balance.aiTreasuryOpeningFloor || [0,10,20,30,40])[Math.min(4,d.rank)] || 0),
        food:r.food+host.mobileFood===d.mobile.food,oneHost:s.armies.filter(function (a) {return a.realm===rid;}).length===1,
        active:snapshot.effective,external:!!(snapshot.superior && snapshot.superior.externalAuthorityId),
        noInventedPerson:prefix!=='dune' || !FB.bookmarkActor(restored,'dune_authorizer'),
        noLand:FB.realmTerritory(restored,rid).length===0,
        restored:record===JSON.stringify([M.row(restored,rid),M.migration(restored,rid),M.host(restored,rid),
          restored.chars,restored.owner,restored.holder,FB.treasuryAvailable(restored,rid),restored.player.gold]),valid:M.validate(restored)};
    },prefix);
    expect(result).toEqual({pure:true,independent:{schema:1,kind:'independent'},patron:null,total:true,treasury:true,
      food:true,oneHost:true,active:true,external:prefix==='dune',noInventedPerson:true,noLand:true,restored:true,valid:true});
  });
}

test('detached imports reject sponsor ambiguities and malformed external warrants without mutation',async function ({page},info) {
  await openGame(page,info);
  const result=await page.evaluate(function (source) {
    const changes=[
      function (t) {delete t.sponsorship;},function (t) {t.patronRealmId='dune_oasis';},
      function (t) {delete t.patronRealmId;},function (t) {t.sponsorship=null;},
      function (t) {t.sponsorship.schema=2;},function (t) {t.sponsorship.kind='patron';},
      function (t) {t.sponsorship.extra=true;},function (t) {delete t.opening;},
      function (t) {delete t.command;},function (t) {t.origin='missing';},function (t) {t.target='missing';},
      function (t) {t.command.superior.generation=0;},function (t) {t.command.superior.endTurn=0;},
      function (t) {t.command.superior.endTurn=1441;},function (t) {t.command.superior.endTurn=1.5;},
      function (t) {t.command.superior.id='';},function (t) {t.command.superior.name=' ';},
      function (t) {t.command.superior.realmId='dune_gate';},function (t) {t.command.superior.actorId='dune_incumbent';}
    ];
    return changes.map(function (change) {
      const input=JSON.parse(JSON.stringify(source)),t=input.bookmarks.dune_world.realms.find(function (r) {return r.mobile;}).mobile;
      change(t);
      const bytes=JSON.stringify(input),state=JSON.stringify(FB.state),data=JSON.stringify(FBDATA),rng=FB.getRngState(),uid=FB.getUidCounter();
      return FB.mods.validate(input).length>0 && bytes===JSON.stringify(input) && state===JSON.stringify(FB.state) &&
        data===JSON.stringify(FBDATA) && rng===FB.getRngState() && uid===FB.getUidCounter();
    });
  },examples.dune);
  expect(result).toEqual(Array(19).fill(true));
});

test('independence supplies no access, outside consent, service, land award or free money',async function ({page},info) {
  await start(page,info,'dune');
  const result=await page.evaluate(function () {
    const s=FB.state,M=FB.mobile,rid='dune_coalition',r=M.row(s,rid),moving=M.migration(s,rid);
    const bytes=JSON.stringify(s),rng=FB.getRngState(),uid=FB.getUidCounter();
    const noPassage=!M.passage(s,rid,'dune_pass',true);
    const noLand=!M.review(s,{realmId:rid,action:'land',terms:{countyId:moving.at},actor:{kind:'realm',id:rid}}).review.allowed;
    const noSettle=!M.review(s,{realmId:rid,action:'settle',terms:{countyId:moving.at,count:M.total(s,rid),final:true},
      actor:{kind:'realm',id:rid}}).review.allowed;
    const noRequest=['land','service','force'].every(function (kind) {return FB.federateRequest(s,moving.id,kind)===false;});
    const noAward=FB.political.federateSettlementQuote(s,moving.id)===null;
    return {noPassage:noPassage,noLand:noLand,noSettle:noSettle,noRequest:noRequest,noAward:noAward,
      pure:bytes===JSON.stringify(s) && rng===FB.getRngState() && uid===FB.getUidCounter(),
      initialFunds:FB.treasuryAvailable(s,rid)===70+
        ((FBDATA.balance.aiTreasuryOpeningFloor || [0,10,20,30,40])[2] || 0),noContract:moving.contractId===null,valid:M.validate(s)};
  });
  expect(result).toEqual({noPassage:true,noLand:true,noSettle:true,noRequest:true,noAward:true,pure:true,
    initialFunds:true,noContract:true,valid:true});
});

test('the migration constructor rejects undeclared sponsor waivers before creating people or hosts',async function ({page},info) {
  await start(page,info,'dune');
  const result=await page.evaluate(function () {
    const original=FB.state,M=FB.mobile,rid='dune_coalition';
    const changes=[function (spec) {delete spec.sponsorship;},function (spec) {spec.sponsorship.schema=2;},
      function (spec) {spec.patronRealmId='dune_gate';},function (spec) {spec.origin='dune_flats';},
      function (spec) {spec.target='dune_well';},function (spec) {spec.hostId='unowned_host';},
      function (spec) {spec.realmId='dune_gate';}];
    return changes.map(function (change) {
      const s=JSON.parse(JSON.stringify(original));
      s.armies=s.armies.filter(function (a) {return a.realm!==rid;});
      s.authority.migrations=s.authority.migrations.filter(function (m) {return m.realmId!==rid;});
      const spec={realmId:rid,patronRealmId:null,sponsorship:{schema:1,kind:'independent'},origin:'dune_well',
        target:'dune_pass',hostId:'following_'+rid,settlementForm:M.profile(s,rid).settlementForm,
        endTurn:1000,men:160,units:{cav:70,arch:40,ret:50}};
      change(spec);
      const bytes=JSON.stringify(s),rng=FB.getRngState(),uid=FB.getUidCounter();
      return FB.federateBeginMigration(s,spec)===null && bytes===JSON.stringify(s) &&
        rng===FB.getRngState() && uid===FB.getUidCounter();
    });
  });
  expect(result).toEqual(Array(7).fill(true));
});

test('independent recruitment uses the same finite people and public funds for player and AI reviews',async function ({page},info) {
  await start(page,info,'dune');
  const result=await page.evaluate(function () {
    const s=FB.state,M=FB.mobile,rid='dune_coalition',r=M.row(s,rid),host=M.host(s,rid);
    const total=M.total(s,rid),men=host.men,gold=FB.treasuryAvailable(s,rid),privateGold=s.player.gold;
    const request={realmId:rid,action:'recruit',terms:{count:10,unitId:'arch'},actor:{kind:'character',id:r.leaderId}};
    const review=M.review(s,request),aiRequest=JSON.parse(JSON.stringify(request));aiRequest.actor={kind:'realm',id:rid};
    const ai=M.review(s,aiRequest),same=review.review.allowed===ai.review.allowed && review.review.cost===ai.review.cost;
    const replay=JSON.parse(JSON.stringify(s)),replayReview=M.review(replay,request);
    const committed=M.commit(s,review),replayed=M.commit(replay,replayReview),repeat=!M.commit(s,review),staleAI=!M.commit(s,ai);
    return {same:same,committed:committed,repeat:repeat,staleAI:staleAI,replay:replayed && JSON.stringify(s)===JSON.stringify(replay),men:host.men-men,
      conserved:M.total(s,rid)===total,debit:Math.abs(gold-FB.treasuryAvailable(s,rid)-review.review.cost)<0.000001,
      privateUnchanged:s.player.gold===privateGold,valid:M.validate(s)};
  });
  expect(result).toEqual({same:true,committed:true,repeat:true,staleAI:true,replay:true,men:10,conserved:true,debit:true,privateUnchanged:true,valid:true});
});

test('settlement on actually owned land uses one real seat and conserves the civilian transfer',async function ({page},info) {
  await start(page,info,'dune');
  const result=await page.evaluate(function () {
    const s=FB.state,M=FB.mobile,rid='dune_coalition',county='dune_well';
    s.owner[county]=rid;s.holder[county]=rid;FB.invalidateRealmCache();
    const total=M.total(s,rid),residents=s.population.counties[county].count;
    const noPatronBypass=FB.political.federateSettlementQuote(s,M.migration(s,rid).id)===null;
    const review=M.review(s,{realmId:rid,action:'settle',actor:{kind:'realm',id:rid},terms:{countyId:county,count:100,final:false}});
    const accepted=M.commit(s,review),repeat=!M.commit(s,review),moving=M.migration(s,rid);
    FB.save.v4.validateAuthority(s.authority,s);
    const record=JSON.stringify([M.row(s,rid),moving,s.population.counties[county]]);
    FB.save.restore(JSON.parse(FB.save.serialize()));
    return {accepted:accepted,repeat:repeat,noPatronBypass:noPatronBypass,seats:moving.session.seats,
      conserved:M.total(FB.state,rid)===total-100 && FB.state.population.counties[county].count===residents+100,
      noPatron:moving.patronRealmId===null,restored:record===JSON.stringify([M.row(FB.state,rid),M.migration(FB.state,rid),
        FB.state.population.counties[county]]),valid:M.validate(FB.state)};
  });
  expect(result).toEqual({accepted:true,repeat:true,noPatronBypass:true,seats:['dune_coalition'],conserved:true,noPatron:true,restored:true,valid:true});
});

test('independent access still requires the real holder and one conserved payment',async function ({page},info) {
  await start(page,info,'dune');
  const result=await page.evaluate(function () {
    const s=FB.state,M=FB.mobile,rid='dune_coalition',partner='dune_gate',r=M.row(s,rid);
    const gold=FB.treasuryAvailable(s,rid),outside=FB.treasuryAvailable(s,partner),privateGold=s.player.gold;
    const offer=M.review(s,{realmId:rid,action:'offer',actor:{kind:'realm',id:rid},terms:{kind:'access',partnerId:partner,
      countyIds:['dune_pass'],capacity:100,allowRecruit:false,price:7,duration:20}});
    const offered=M.commit(s,offer),a=r.agreements[0],beforeAcceptance=!M.passage(s,rid,'dune_pass',true);
    const review=M.review(s,{realmId:rid,action:'accept',terms:{agreementId:a.id},actor:{kind:'realm',id:partner}});
    const changed=JSON.parse(JSON.stringify(s));changed.holder.dune_pass='dune_oasis';
    const stale=!M.commit(changed,review),accepted=M.commit(s,review),repeat=!M.commit(s,review);
    return {offered:offered,beforeAcceptance:beforeAcceptance,stale:stale,accepted:accepted,repeat:repeat,
      passage:M.passage(s,rid,'dune_pass',true),debit:gold-FB.treasuryAvailable(s,rid),
      credit:FB.treasuryAvailable(s,partner)-outside,privateUnchanged:privateGold===s.player.gold,
      stillIndependent:M.migration(s,rid).patronRealmId===null,owner:s.owner.dune_pass,valid:M.validate(s)};
  });
  expect(result).toEqual({offered:true,beforeAcceptance:true,stale:true,accepted:true,repeat:true,passage:true,
    debit:7,credit:7,privateUnchanged:true,stillIndependent:true,owner:'dune_gate',valid:true});
});

test('an external warrant expires at its boundary without a successor, replay or supply grant',async function ({page},info) {
  await start(page,info,'dune');
  const result=await page.evaluate(function () {
    const s=FB.state,M=FB.mobile,rid='dune_coalition',r=M.row(s,rid),host=M.host(s,rid);
    const review=M.review(s,{realmId:rid,action:'recruit',terms:{count:10,unitId:'arch'},actor:{kind:'realm',id:rid}});
    const total=M.total(s,rid),gold=FB.treasuryAvailable(s,rid),people=Object.keys(s.chars).sort().join('|'),food=r.food;
    host.path=['dune_flats'];host.goal='dune_flats';host.moveLeft=4;
    s.date=FB.dateAtTurn(s,270);s.turn=270;r.lastAI=3;
    const expired=!M.commandValid(s,rid),stale=!M.commit(s,review);
    M.day(s);
    const record=JSON.stringify([r,M.migration(s,rid),host]);
    FB.save.restore(JSON.parse(FB.save.serialize()));
    return {expired:expired,stale:stale,stopped:host.path.length===0 && host.moveLeft===0,consumed:r.food<food,
      preserved:total===M.total(FB.state,rid) && gold===FB.treasuryAvailable(FB.state,rid),
      people:people===Object.keys(FB.state.chars).sort().join('|'),noElection:r.selection===null,
      stillExpired:!M.commandValid(FB.state,rid),
      restored:record===JSON.stringify([M.row(FB.state,rid),M.migration(FB.state,rid),M.host(FB.state,rid)]),valid:M.validate(FB.state)};
  });
  expect(result).toEqual({expired:true,stale:true,stopped:true,consumed:true,preserved:true,people:true,
    noElection:true,stillExpired:true,restored:true,valid:true});
});

test('neither a commander nor an outside local ruler can impersonate the external issuer',async function ({page},info) {
  await start(page,info,'dune');
  const result=await page.evaluate(function () {
    const s=FB.state,M=FB.mobile,rid='dune_coalition',r=M.row(s,rid),before=JSON.stringify(s),rng=FB.getRngState(),uid=FB.getUidCounter();
    const actors=[{kind:'character',id:r.leaderId},{kind:'realm',id:'dune_gate'},
      {kind:'external_authority',id:'glassroad_council'}];
    const refused=actors.every(function (actor) {return ['appoint','recall'].every(function (action) {
      const request={realmId:rid,commandId:r.command.id,action:action,actor:actor};
      if(action==='appoint') request.candidateId=r.members[1].principal.id;
      return !M.reviewCommand(s,request).review.allowed;
    });});
    return {refused:refused,pure:before===JSON.stringify(s) && rng===FB.getRngState() && uid===FB.getUidCounter()};
  });
  expect(result).toEqual({refused:true,pure:true});
});

test('a committed host interruption preserves the independent camp and authority without grants',async function ({page},info) {
  await start(page,info,'dune');
  const result=await page.evaluate(function () {
    const s=FB.state,M=FB.mobile,rid='dune_coalition',r=M.row(s,rid),host=M.host(s,rid),moving=M.migration(s,rid);
    const gold=FB.treasuryAvailable(s,rid),people=Object.keys(s.chars).length;
    FB.mobileMigrationInterrupted(s,moving,'host_lost');
    const once=JSON.stringify([r.accounting,r.members,r.food,moving]);
    FB.mobileMigrationInterrupted(s,moving,'host_lost');
    return {once:once===JSON.stringify([r.accounting,r.members,r.food,moving]),independent:moving.sponsorship.kind==='independent',
      patron:moving.patronRealmId,active:r.status==='active',authority:M.commandValid(s,rid),
      noGrant:gold===FB.treasuryAvailable(s,rid),noNewPeople:people===Object.keys(s.chars).length};
  });
  expect(result).toEqual({once:true,independent:true,patron:null,active:true,authority:true,noGrant:true,noNewPeople:true});
});

test('saved sponsorship and external issuer variants reject missing, forged and mixed provenance',async function ({page},info) {
  await start(page,info,'dune');
  const result=await page.evaluate(function () {
    const M=FB.mobile,rid='dune_coalition';
    const changes=[function (r,m) {delete m.sponsorship;},function (r,m) {m.sponsorship.schema=2;},
      function (r,m) {m.sponsorship.extra=true;},function (r,m) {m.patronRealmId='dune_gate';},
      function (r,m) {m.choice='service';},function (r,m) {m.choice='force';},function (r,m) {m.origin='dune_flats';},
      function (r,m) {r.command.issuer.generation++;},
      function (r,m) {r.command.issuer.externalAuthorityId='missing';},
      function (r,m) {r.command.issuer.characterId=r.leaderId;},function (r,m) {r.command.issuer=null;}];
    return changes.map(function (change) {
      const s=JSON.parse(JSON.stringify(FB.state));change(M.row(s,rid),M.migration(s,rid));
      const bytes=JSON.stringify(s),rng=FB.getRngState(),uid=FB.getUidCounter();let rejected=false;
      try {FB.save.v4.validateAuthority(s.authority,s);M.validate(s);} catch(error) {rejected=true;}
      return rejected && bytes===JSON.stringify(s) && rng===FB.getRngState() && uid===FB.getUidCounter();
    });
  });
  expect(result).toEqual(Array(11).fill(true));
});

test('retained sponsored imports still need their actual patron and reject a bare null',async function ({page},info) {
  await start(page,info,'dune',sponsored);
  const result=await page.evaluate(function (input) {
    const s=FB.state,M=FB.mobile,rid='dune_coalition',m=M.migration(s,rid);
    const kept=m.patronRealmId==='dune_oasis' && m.sponsorship===undefined && M.commandValid(s,rid);
    input.bookmarks.dune_world.realms.find(function (d) {return d.mobile;}).mobile.patronRealmId=null;
    const before=JSON.stringify(s),data=JSON.stringify(FBDATA),rng=FB.getRngState(),uid=FB.getUidCounter();
    const rejected=FB.mods.validate(input).length>0;
    FB.save.restore(JSON.parse(FB.save.serialize()));
    return {kept:kept,rejected:rejected,pure:before===JSON.stringify(s) && data===JSON.stringify(FBDATA) &&
      rng===FB.getRngState() && uid===FB.getUidCounter(),restored:M.migration(FB.state,rid).patronRealmId==='dune_oasis',valid:M.validate(FB.state)};
  },JSON.parse(JSON.stringify(sponsored)));
  expect(result).toEqual({kept:true,rejected:true,pure:true,restored:true,valid:true});
});

test('changing independent sponsorship or external authority invalidates an existing exact mod save',async function ({page},info) {
  await start(page,info,'dune');
  const result=await page.evaluate(function (input) {
    const saved=FB.save.serialize(),d=input.bookmarks.dune_world.realms.find(function (d) {return d.mobile;});
    d.mobile.command.superior.generation++;
    FB.mods.apply(input);
    const before=JSON.stringify(FB.state);let mismatch=false;
    try {FB.save.restore(JSON.parse(saved));} catch(error) {mismatch=/different mod/.test(error.message);}
    return {mismatch:mismatch,pure:before===JSON.stringify(FB.state)};
  },JSON.parse(JSON.stringify(examples.dune)));
  expect(result).toEqual({mismatch:true,pure:true});
});

test('an independent import needs no former patron court and restores without inventing one',async function ({page},info) {
  const input=JSON.parse(JSON.stringify(examples.dune)),bm=input.bookmarks.dune_world;
  input.name='Independent expedition without the former hosting court';
  bm.realms=bm.realms.filter(function (d) {return d.id!=='dune_oasis';});
  bm.provinces.forEach(function (p) {if(p.realm==='dune_oasis') p.realm='dune_gate';});
  // Remove that court's unrelated civic stories before importing the complete world.
  input.storyInstances={};delete input.startScenarios[0].tracks;delete input.startScenarios[0].trackLocations;
  delete input.startScenarios[0].fixedProvinceId;
  await start(page,info,'dune',input);
  const result=await page.evaluate(function () {
    const s=FB.state,M=FB.mobile,rid='dune_coalition',m=M.migration(s,rid);
    const record=JSON.stringify([M.row(s,rid),m,M.host(s,rid),s.chars,s.owner,s.holder,
      FB.treasuryAvailable(s,rid),s.player.gold]);
    const rng=FB.getRngState(),uid=FB.getUidCounter();
    FB.save.restore(JSON.parse(FB.save.serialize()));
    const restored=FB.state;
    return {absent:!restored.realms.dune_oasis,patron:M.migration(restored,rid).patronRealmId,
      independent:M.migration(restored,rid).sponsorship.kind,command:M.commandValid(restored,rid),
      noRequest:FB.federateRequest(restored,m.id,'land')===false,
      noLand:FB.realmTerritory(restored,rid).length===0,
      unchanged:record===JSON.stringify([M.row(restored,rid),M.migration(restored,rid),M.host(restored,rid),
        restored.chars,restored.owner,restored.holder,FB.treasuryAvailable(restored,rid),restored.player.gold]),
      identity:rng===FB.getRngState() && uid===FB.getUidCounter(),valid:M.validate(restored)};
  });
  expect(result).toEqual({absent:true,patron:null,independent:'independent',command:true,noRequest:true,
    noLand:true,unchanged:true,identity:true,valid:true});
});

test('loss of a former hosting polity does not become a sponsor or interrupt an independent mandate',async function ({page},info) {
  await start(page,info,'dune');
  const result=await page.evaluate(function () {
    const s=FB.state,M=FB.mobile,rid='dune_coalition';
    // Stage extinction and successor control directly, without a long war simulation.
    s.realms.dune_oasis.alive=false;
    Object.keys(s.owner).forEach(function (pid) {if(s.owner[pid]==='dune_oasis') s.owner[pid]='dune_gate';});
    Object.keys(s.holder).forEach(function (pid) {if(s.holder[pid]==='dune_oasis') s.holder[pid]='dune_gate';});
    FB.invalidateRealmCache();
    const bytes=JSON.stringify(s),rng=FB.getRngState(),uid=FB.getUidCounter(),m=M.migration(s,rid);
    const review=M.review(s,{realmId:rid,action:'recruit',terms:{count:10,unitId:'arch'},actor:{kind:'realm',id:rid}});
    FB.save.v4.validateAuthority(s.authority,s);M.validate(s);
    return {command:M.commandValid(s,rid),recruit:review.review.allowed,patron:m.patronRealmId,
      noPassage:!M.passage(s,rid,'dune_pass',true),noRequest:!FB.federateRequest(s,m.id,'land'),
      noAward:FB.political.federateSettlementQuote(s,m.id)===null,
      pure:bytes===JSON.stringify(s) && rng===FB.getRngState() && uid===FB.getUidCounter()};
  });
  expect(result).toEqual({command:true,recruit:true,patron:null,noPassage:true,noRequest:true,noAward:true,pure:true});
});

test('required-patron constructors cannot turn missing or dead patrons into independent expeditions',async function ({page},info) {
  await start(page,info,'dune',sponsored);
  const result=await page.evaluate(function () {
    const M=FB.mobile,rid='dune_coalition';
    return ['null','missing','dead'].map(function (kind) {
      const s=JSON.parse(JSON.stringify(FB.state)),m=M.migration(s,rid);
      s.armies=s.armies.filter(function (a) {return a.id!==m.hostId;});
      s.authority.migrations=s.authority.migrations.filter(function (row) {return row.id!==m.id;});
      const spec={realmId:rid,patronRealmId:kind==='null' ? null : kind==='missing' ? 'missing_patron' : m.patronRealmId,
        origin:m.origin,target:m.target,hostId:m.hostId,settlementForm:m.settlementForm,
        endTurn:m.endTurn,men:160,units:{cav:70,arch:40,ret:50}};
      if(kind==='dead') s.realms[m.patronRealmId].alive=false;
      const bytes=JSON.stringify(s),rng=FB.getRngState(),uid=FB.getUidCounter();
      return FB.federateBeginMigration(s,spec)===null && bytes===JSON.stringify(s) &&
        rng===FB.getRngState() && uid===FB.getUidCounter();
    });
  });
  expect(result).toEqual([true,true,true]);
});

test('sponsorship provenance changes invalidate an already allowed resource review without a debit',async function ({page},info) {
  await start(page,info,'dune');
  const result=await page.evaluate(function () {
    const M=FB.mobile,rid='dune_coalition';
    return ['removed','schema','patron'].map(function (kind) {
      const s=JSON.parse(JSON.stringify(FB.state)),m=M.migration(s,rid);
      const review=M.review(s,{realmId:rid,action:'recruit',terms:{count:10,unitId:'arch'},actor:{kind:'realm',id:rid}});
      if(kind==='removed') delete m.sponsorship;
      if(kind==='schema') m.sponsorship.schema=2;
      if(kind==='patron') m.patronRealmId='dune_oasis';
      const bytes=JSON.stringify(s),rng=FB.getRngState(),uid=FB.getUidCounter();
      return review.review.allowed && !M.commit(s,review) && bytes===JSON.stringify(s) &&
        rng===FB.getRngState() && uid===FB.getUidCounter();
    });
  });
  expect(result).toEqual([true,true,true]);
});

test('sponsorless commands still suspend on the death of their distinct actual superior',async function ({page},info) {
  const input=JSON.parse(JSON.stringify(sponsored));
  const mobile=input.bookmarks.dune_world.realms.find(function (d) {return d.mobile;}).mobile;
  mobile.patronRealmId=null;mobile.sponsorship={schema:1,kind:'independent'};
  await start(page,info,'dune',input);
  const result=await page.evaluate(function () {
    const s=FB.state,M=FB.mobile,rid='dune_coalition',r=M.row(s,rid),host=M.host(s,rid),m=M.migration(s,rid);
    const review=M.review(s,{realmId:rid,action:'recruit',terms:{count:10,unitId:'arch'},actor:{kind:'realm',id:rid}});
    const issuer=FB.bookmarkActor(s,'dune_authorizer');issuer.dead=true;
    const total=M.total(s,rid),gold=FB.treasuryAvailable(s,rid),privateGold=s.player.gold;
    const bytes=JSON.stringify(s),rng=FB.getRngState(),uid=FB.getUidCounter();
    const suspended=!M.commandValid(s,rid) && !M.commit(s,review);
    const pure=bytes===JSON.stringify(s) && rng===FB.getRngState() && uid===FB.getUidCounter();
    host.path=['dune_flats'];host.goal='dune_flats';host.moveLeft=4;
    s.date=FB.dateAtTurn(s,s.turn+1);s.turn++;M.day(s);
    const record=JSON.stringify([r,m,host]);
    FB.save.restore(JSON.parse(FB.save.serialize()));
    return {reviewed:review.review.allowed,suspended:suspended,pure:pure,stopped:host.path.length===0 && host.moveLeft===0,
      independent:m.sponsorship.kind==='independent' && m.patronRealmId===null,
      preserved:total===M.total(FB.state,rid) && gold===FB.treasuryAvailable(FB.state,rid) && privateGold===FB.state.player.gold,
      noSuccessor:FB.bookmarkActor(FB.state,'dune_authorizer').dead && M.row(FB.state,rid).selection===null,
      stillSuspended:!M.commandValid(FB.state,rid),
      restored:record===JSON.stringify([M.row(FB.state,rid),M.migration(FB.state,rid),M.host(FB.state,rid)]),valid:M.validate(FB.state)};
  });
  expect(result).toEqual({reviewed:true,suspended:true,pure:true,stopped:true,independent:true,preserved:true,
    noSuccessor:true,stillSuspended:true,restored:true,valid:true});
});

test('changing only the sponsorship policy rejects the prior exact-content save before adoption',async function ({page},info) {
  await start(page,info,'dune');
  const result=await page.evaluate(function (input) {
    const saved=FB.save.serialize(),mobile=input.bookmarks.dune_world.realms.find(function (d) {return d.mobile;}).mobile;
    delete mobile.sponsorship;mobile.patronRealmId='dune_oasis';
    const errors=FB.mods.validate(input);
    if(errors.length) return {errors:errors};
    FB.mods.apply(input);
    const before=JSON.stringify(FB.state),rng=FB.getRngState(),uid=FB.getUidCounter();let mismatch=false;
    try {FB.save.restore(JSON.parse(saved));} catch(error) {mismatch=/different mod/.test(error.message);}
    return {mismatch:mismatch,pure:before===JSON.stringify(FB.state) && rng===FB.getRngState() && uid===FB.getUidCounter()};
  },JSON.parse(JSON.stringify(examples.dune)));
  expect(result).toEqual({mismatch:true,pure:true});
});

test('the shared command sheet discloses independence and the real external term',async function ({page},info) {
  await start(page,info,'dune');
  await page.evaluate(function () {FB.ui.showMobileConfederation('dune_coalition');});
  await expect(page.locator('#gm-body')).toContainText('Independent');
  await expect(page.locator('#gm-body')).toContainText('Glassroad Council');
  await expect(page.locator('#gm-body')).toContainText('270 days remaining');
  await expect(page.locator('#gm-body')).not.toContainText('Recall commander');
  await expect(page.locator('#gm-body')).not.toContainText('Commission Sela');
});
