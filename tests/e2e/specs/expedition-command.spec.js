'use strict';
const path=require('path');
const {test,expect}=require('../support/fixture');
const {openGame}=require('../support/game/navigation');
const {beginBookmark}=require('../support/game/bookmark-acceptance');
const {dependsOnRuntime}=require('../support/runtime-dependencies');
const harbor=require('../fixtures/authoring/landed-expedition-harbor.json');

dependsOnRuntime(__filename,['index.html','data/mobile_confederations.js','data/units.js','data/technology.js',
  'js/mobile_confederations.js','js/mobile_command.js','js/mobile_columns.js','js/home_authority.js','js/authority.js',
  'js/governments.js','js/government_selection.js','js/government_support.js','js/government_continuity.js',
  'js/world.js','js/model.js','js/events.js','js/starts.js','js/bookmark_setup.js','js/main.js','js/station.js',
  'js/treasury.js','js/federates.js','js/population.js','js/market.js','js/armies.js','js/technology.js',
  'js/mods.js','js/stories.js','js/save.js','js/save_v4.js','js/ui_mobile.js','js/ui_misc.js','js/ui_modals.js']);

async function importWorld(page,info,which,modified) {
  await openGame(page,info);
  await page.evaluate(function () {FB.ui.showMods();});
  await page.locator('#modfile').setInputFiles(modified ? {name:'landed-command.json',mimeType:'application/json',
    buffer:Buffer.from(JSON.stringify(modified))} : path.resolve(__dirname,'../fixtures/authoring/landed-expedition-'+which+'.json'));
  await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded'}),page.locator('#mod-apply').click()]);
  const prefix=which==='harbor' ? 'harbor' : 'dune';
  await page.waitForFunction(function (prefix) {return window.FB && FB.game && FB.game.bootReady && FBDATA.bookmarks[prefix+'_world'];},prefix);
}
async function beginHome(page) {
  const full=page.locator('#btn-choose-beginning');
  if (await full.isVisible()) await full.click();
  else await page.getByRole('button',{name:'New Game',exact:true}).click();
  await page.locator('#btn-bm-seed').click();
  await page.locator('#ng-seed').fill('LANDEDCOMMAND-harbor_world-harbor_home_start-harbor_ridge-f-Orin_Vale-standard');
  await page.locator('#ng-seed').press('Enter');
  await expect(page.locator('#chargen:not(.hidden)')).toBeVisible();
  await page.getByRole('button',{name:'Begin Your Story',exact:true}).click();
  await page.getByRole('button',{name:'Begin',exact:true}).click();
  await page.evaluate(function () {FB.game.setPaused(true);});
}
async function start(page,info,modified) {
  await importWorld(page,info,'harbor',modified);
  await beginBookmark(page,info,'harbor_world','harbor_household');
}

test('a landed principal retains one home crown, family, public command and private station',async function ({page},info) {
  await start(page,info);
  const result=await page.evaluate(function () {
    const s=FB.state,M=FB.mobile,rid='harbor_following',c=FB.bookmarkActor(s,'harbor_home_ruler');
    const before=JSON.stringify(s),rng=FB.getRngState(),uid=FB.getUidCounter(),r=M.row(s,rid);
    const facts={same:M.leader(s,rid)===c && FB.realmRulerCharacterSnapshot(s,'harbor_upland')===c,
      home:FB.realmIdForRulerCharacter(s,c),noElection:r.selection===null,
      noCommandLand:FB.realmTerritory(s,rid).length===0,
      homeLand:FB.realmTerritory(s,'harbor_upland').length>0,
      privateStation:FB.station.subject(c,s).tier===FB.realmRank.tier(s.realms.harbor_upland,s),
      oneIdentity:Object.keys(s.chars).filter(function (id) {return s.chars[id].name===c.name;}).length===1,
      declared:M.landedLink(s,rid).characterId===c.id && M.landedLink(s,rid).homeRealmId==='harbor_upland',
      separate:s.realms[rid].treasury!==s.realms.harbor_upland.treasury,
      publicGold:FB.treasuryAvailable(s,rid),total:M.total(s,rid)===r.accounting.initial,valid:M.validate(s)};
    M.commandSnapshot(s,rid);M.leader(s,rid);M.landedCommandReason(s,rid);
    facts.pure=before===JSON.stringify(s) && rng===FB.getRngState() && uid===FB.getUidCounter();
    return facts;
  });
  expect(result).toMatchObject({same:true,home:'harbor_upland',noElection:true,noCommandLand:true,homeLand:true,
    privateStation:true,oneIdentity:true,declared:true,separate:true,total:true,valid:true,pure:true});
  expect(result.publicGold).toBeGreaterThan(0);
});

test('the independent nonlanded import retains voluntary consent without a deputy or superior recall',async function ({page},info) {
  await importWorld(page,info,'upland');
  await beginBookmark(page,info,'dune_world','dune_household');
  const result=await page.evaluate(function () {
    const s=FB.state,M=FB.mobile,rid='dune_coalition',r=M.row(s,rid),c=M.leader(s,rid);
    return {active:M.commandValid(s,rid),link:M.landedLink(s,rid),noSponsor:M.migration(s,rid).patronRealmId===null,
      noCivilDeputy:s.authority.appointments.every(function (a) {return a.officeId!=='dune_civil_deputy';}),
      noRecall:!M.reviewCommand(s,{realmId:rid,commandId:r.command.id,action:'recall',actor:{kind:'character',id:c.id}}).review.allowed,
      noElection:r.selection===null,valid:M.validate(s)};
  });
  expect(result).toEqual({active:true,link:null,noSponsor:true,noCivilDeputy:true,noRecall:true,noElection:true,valid:true});
});

for (const explicit of [false,true]) {
test('a home start with '+(explicit ? 'explicit' : 'ordinary')+' infrastructure retains its separate command and money',async function ({page},info) {
  const input=JSON.parse(JSON.stringify(harbor));
  if (explicit) input.bookmarks.harbor_world.openingInfrastructure={version:1,placements:[]};
  await importWorld(page,info,'harbor',input);
  await beginHome(page);
  const result=await page.evaluate(function () {
    const s=FB.state,M=FB.mobile,rid='harbor_following',me=s.chars[s.player.charId];
    const gold=s.player.gold,publicGold=FB.treasuryAvailable(s,rid),tier=s.player.tier;
    const q=FB.homeAuthority.fundingQuote(s,{source:{kind:'private',characterId:me.id},characterId:me.id,recipientRealmId:rid,amount:1});
    const funded=FB.homeAuthority.fund(s,q),duplicate=FB.homeAuthority.fund(s,q);
    const falsePublic=FB.homeAuthority.fundingQuote(s,{source:{kind:'public',realmId:'player'},
      characterId:me.id,recipientRealmId:rid,amount:1});
    const saved=JSON.parse(FB.save.serialize());FB.save.restore(saved);
    const t=FB.state;
    return {same:M.leader(t,rid).id===me.id && FB.bookmarkActor(t,'harbor_home_ruler').id===me.id,
      home:FB.realmIdForRulerCharacter(t,me.id),stable:!!t.realms[rid] && !t.realms.harbor_upland,
      land:t.player.provs.length>0 && FB.realmTerritory(t,rid).length===0,
      generation:M.landedLink(t,rid).homeGeneration===FB.realmRulerGeneration(t,'player'),
      originalRef:M.row(t,rid).openingBindings[1].person.realmId==='harbor_upland',funded:funded,duplicate:duplicate,
      privateMoney:t.player.gold===gold-1,publicMoney:FB.treasuryAvailable(t,rid)===publicGold+1,
      tier:t.player.tier===tier,noFalsePublic:!falsePublic.allowed,valid:M.validate(t)};
  });
  expect(result).toEqual({same:true,home:'player',stable:true,land:true,generation:true,originalRef:true,
    funded:true,duplicate:false,privateMoney:true,publicMoney:true,tier:true,noFalsePublic:true,valid:true});
});
}

test('members consent only to their own pledge and cannot appoint a successor',async function ({page},info) {
  await start(page,info);
  const result=await page.evaluate(function () {
    const s=FB.state,M=FB.mobile,rid='harbor_following',r=M.row(s,rid),c=M.leader(s,rid);
    const m=r.members.find(function (m) {return m.principal.id===c.id;}),other=r.members.find(function (x) {return x.id!==m.id;});
    const total=M.total(s,rid),money=FB.treasuryAvailable(s,rid),generation=FB.realmRulerGeneration(s,rid);
    function pledge(actor,member,allegiance) {return M.review(s,{realmId:rid,action:'pledge',actor:actor,
      terms:{memberId:member.id,pledge:member.pledge,allegiance:allegiance}});}
    const foreign=!pledge(other.principal,m,false).review.allowed;
    const withdrew=M.commit(s,pledge(m.principal,m,false)),suspended=!M.commandValid(s,rid);
    const noVote=!M.review(s,{realmId:rid,action:'support',actor:other.principal,terms:{candidateId:other.principal.id}}).review.allowed;
    const renewed=M.commit(s,pledge(m.principal,m,true));
    return {foreign:foreign,withdrew:withdrew,suspended:suspended,noVote:noVote,renewed:renewed,
      same:M.leader(s,rid).id===c.id && FB.realmRulerGeneration(s,rid)===generation,
      conserved:M.total(s,rid)===total && FB.treasuryAvailable(s,rid)===money,noElection:r.selection===null,valid:M.validate(s)};
  });
  expect(result).toEqual({foreign:true,withdrew:true,suspended:true,noVote:true,renewed:true,same:true,conserved:true,noElection:true,valid:true});
});

test('a departing commander has only the actual deputy powers at home',async function ({page},info) {
  await start(page,info);
  const result=await page.evaluate(function () {
    const s=FB.state,M=FB.mobile,H=FB.homeAuthority,rid='harbor_following',c=M.leader(s,rid);
    const host=M.host(s,rid),moving=M.migration(s,rid);
    moving.at='harbor_quay';host.at='harbor_quay';
    const deputy=FB.bookmarkActor(s,'harbor_civil_officer');
    const request={characterId:deputy.id,appointmentId:s.bookmarkSetup.appointments.harbor_civil_service.id};
    const grant=H.quote(s,'harbor_upland','grant',request).allowed;
    const noWar=!H.quote(s,'harbor_upland','war').allowed,noLevy=!H.quote(s,'harbor_upland','levy').allowed;
    const noPersonalGrant=!H.quote(s,'harbor_upland','grant',{characterId:c.id}).allowed;
    const retained=FB.realmIdForRulerCharacter(s,c)==='harbor_upland' && M.commandValid(s,rid);
    s.authority.appointments.find(function (a) {return a.id===request.appointmentId;}).status='removed';
    const recalled=!H.quote(s,'harbor_upland','grant').allowed;
    moving.at='harbor_ridge';host.at='harbor_ridge';
    return {grant:grant,noWar:noWar,noLevy:noLevy,noPersonalGrant:noPersonalGrant,retained:retained,recalled:recalled,
      returned:H.quote(s,'harbor_upland','war',{characterId:c.id}).allowed};
  });
  expect(result).toEqual({grant:true,noWar:true,noLevy:true,noPersonalGrant:true,retained:true,recalled:true,returned:true});
});

for (const condition of ['custody','incapacity','generation','office','expiry','consent']) {
  test(condition+' immediately suspends the command and invalidates an earlier public review',async function ({page},info) {
    await start(page,info);
    const result=await page.evaluate(function (condition) {
      const s=FB.state,M=FB.mobile,rid='harbor_following',r=M.row(s,rid),c=M.leader(s,rid),host=M.host(s,rid);
      const review=M.review(s,{realmId:rid,action:'recruit',terms:{count:10,unitId:'arch'},actor:{kind:'character',id:c.id}});
      if (condition==='custody') c.imprisoned=true;
      if (condition==='incapacity') c.health=0;
      if (condition==='generation') s.realms.harbor_upland.ruler.generation=FB.realmRulerGeneration(s,'harbor_upland')+1;
      if (condition==='office') FB.assignRealmRulerCharacter(s,'harbor_upland',FB.bookmarkActor(s,'harbor_civil_officer').id,{replaceAuthored:true});
      if (condition==='expiry') {s.turn=90;s.date.season=1;}
      if (condition==='consent') r.members.find(function (m) {return m.principal.id===c.id;}).allegiance=false;
      const before=JSON.stringify(s),rng=FB.getRngState(),uid=FB.getUidCounter();
      const blocked=!M.commandValid(s,rid) && !M.leader(s,rid) && !M.commit(s,review);
      const pure=before===JSON.stringify(s) && rng===FB.getRngState() && uid===FB.getUidCounter();
      const money=FB.treasuryAvailable(s,rid),people=M.total(s,rid);
      host.path=['harbor_quay'];host.goal='harbor_quay';host.moveLeft=3;
      // Stage the boundary, never simulate a multi-year journey.
      s.turn++;s.date.day++;FB.mobileDay(s);
      return {initial:review.review.allowed,blocked:blocked,pure:pure,stopped:host.path.length===0 && host.moveLeft===0,
        reason:M.landedLink(s,rid).reason!==null,unchangedMoney:FB.treasuryAvailable(s,rid)===money,
        conserved:M.total(s,rid)===people,noElection:r.selection===null};
    },condition);
    expect(result).toEqual({initial:true,blocked:true,pure:true,stopped:true,reason:true,unchangedMoney:true,conserved:true,noElection:true});
  });
}

test('one death notifies the home crown and command once without inheriting the command',async function ({page},info) {
  await start(page,info);
  const result=await page.evaluate(function () {
    const s=FB.state,M=FB.mobile,rid='harbor_following',r=M.row(s,rid),c=M.leader(s,rid);
    const total=M.total(s,rid),money=FB.treasuryAvailable(s,rid),generation=FB.realmRulerGeneration(s,'harbor_upland');
    FB.killChar(s,c);
    const successor=FB.realmRulerCharacterSnapshot(s,'harbor_upland'),next=FB.realmRulerGeneration(s,'harbor_upland');
    const revision=r.revision;
    FB.royalCharDied(s,c,'harbor_upland');M.ai(s,rid);
    const saved=JSON.parse(FB.save.serialize());FB.save.restore(saved);
    return {dead:c.dead,advanced:next>generation,successor:!successor || successor.id!==c.id,
      once:r.revision===revision && FB.realmRulerGeneration(s,'harbor_upland')===next,
      vacant:r.leaderId===null && r.command.status==='vacant' && r.selection===null,
      original:M.landedLink(FB.state,rid).characterId===c.id,noCommander:M.leader(FB.state,rid)===null,
      conserved:M.total(FB.state,rid)===total && FB.treasuryAvailable(FB.state,rid)===money,valid:M.validate(FB.state)};
  });
  expect(result).toEqual({dead:true,advanced:true,successor:true,once:true,vacant:true,original:true,noCommander:true,conserved:true,valid:true});
});

test('only the real superior can recall a commissioned landed command and nobody can replace its person',async function ({page},info) {
  const input=JSON.parse(JSON.stringify(harbor)),d=input.bookmarks.harbor_world.realms.find(function (d) {return d.mobile;});
  d.government='expedition_command';d.mobile.command.superior={kind:'opening_actor',actorId:'harbor_civil_officer'};
  await start(page,info,input);
  const result=await page.evaluate(function () {
    const s=FB.state,M=FB.mobile,rid='harbor_following',r=M.row(s,rid),commander=M.leader(s,rid);
    const superior=FB.bookmarkActor(s,'harbor_civil_officer'),other=FB.bookmarkActor(s,'harbor_companion');
    function q(action,actor,candidate) {
      const request={realmId:rid,commandId:r.command.id,action:action,actor:{kind:'character',id:actor.id}};
      if (candidate) request.candidateId=candidate.id;
      return M.reviewCommand(s,request);
    }
    const denied=!q('recall',commander).review.allowed && !q('recall',other).review.allowed;
    const noReplacement=!q('appoint',superior,other).review.allowed;
    const stale=q('recall',superior);superior.imprisoned=true;
    const staleDenied=!M.commit(s,stale);superior.imprisoned=false;
    const recalled=M.commit(s,q('recall',superior));
    return {denied:denied,noReplacement:noReplacement,staleDenied:staleDenied,recalled:recalled,
      noRenewal:!q('appoint',superior,commander).review.allowed,suspended:!M.commandValid(s,rid),
      keptHome:FB.realmRulerCharacterSnapshot(s,'harbor_upland')===commander,valid:M.validate(s)};
  });
  expect(result).toEqual({denied:true,noReplacement:true,staleDenied:true,recalled:true,noRenewal:true,suspended:true,keptHome:true,valid:true});
});

test('malformed or cross-bound landed declarations reject without mutating an import candidate',async function ({page},info) {
  await openGame(page,info);
  const result=await page.evaluate(function (source) {
    const changes=[function (d,b,x) {x.schema=2;},function (d,b,x) {x.homeGeneration++;},
      function (d,b,x) {x.endTurn=0;},function (d,b,x) {x.endTurn=1441;},function (d,b,x) {x.extra=true;},
      function (d,b,x) {x.actorId='harbor_companion';},function (d,b,x) {x.homeRealmId=d.id;},
      function (d,b,x) {x.homeRealmId=['harbor_upland'];},
      function (d,b,x) {delete d.mobile.command.landedCommandLink;},
      function (d,b,x) {d.mobile.command.operations.push('settle');},
      function (d,b,x) {d.mobile.origin='harbor_quay';},
      function (d,b,x,all) {delete all.governmentForms.harbor_home_court.homeAuthority;},
      function (d,b,x) {b.opening.actors.harbor_home_ruler.ref.realmId='harbor_commune';}];
    return changes.map(function (change) {
      const input=JSON.parse(JSON.stringify(source)),b=input.bookmarks.harbor_world,d=b.realms.find(function (d) {return d.mobile;});
      change(d,b,d.mobile.command.landedCommandLink,input);
      const before=JSON.stringify([input,FBDATA,FB.state]),rng=FB.getRngState(),uid=FB.getUidCounter();
      const errors=FB.mods.validate(input);
      return errors.length>0 && before===JSON.stringify([input,FBDATA,FB.state]) && rng===FB.getRngState() && uid===FB.getUidCounter();
    });
  },harbor);
  expect(result).toEqual(Array(13).fill(true));
});

test('saved links are required and strictly pinned while restore preserves unreconciled suspension and spent funds',async function ({page},info) {
  await start(page,info);
  const result=await page.evaluate(function () {
    const s=FB.state,M=FB.mobile,rid='harbor_following',c=M.leader(s,rid);
    FB.treasurySpend(s,rid,2);c.imprisoned=true;
    function owned(t) {return JSON.stringify([t.bookmarkSetup,t.authority.governments[rid],M.host(t,rid),M.migration(t,rid),
      t.realms[rid].treasury,t.player.gold,Object.keys(t.chars).sort(),t.chars[c.id].imprisoned]);}
    const saved=JSON.parse(FB.save.serialize()),before=owned(s);
    const changes=[function (g) {delete g.landedCommandLink;},function (g) {g.landedCommandLink.schema=2;},
      function (g) {g.landedCommandLink.extra=true;},function (g) {g.landedCommandLink.characterId='missing';},
      function (g) {g.landedCommandLink.homeRealmId=rid;},function (g) {g.landedCommandLink.homeGeneration++;},
      function (g) {g.landedCommandLink.commandGeneration++;},function (g) {g.landedCommandLink.reason='safe';},
      function (g) {g.landedCommandLink.changedTurn=999;},function (g) {g.landedCommandLink.revision=-1;},
      function (g,t) {delete t.authority.governments[rid];}];
    const rejected=changes.map(function (change) {
      const bad=JSON.parse(JSON.stringify(saved));change(bad.state.authority.governments[rid],bad.state);
      const bytes=JSON.stringify(bad),state=JSON.stringify(FB.state),rng=FB.getRngState(),uid=FB.getUidCounter();
      try {FB.save.restore(bad);return false;} catch (e) {
        return bytes===JSON.stringify(bad) && state===JSON.stringify(FB.state) && rng===FB.getRngState() && uid===FB.getUidCounter();
      }
    });
    FB.save.restore(saved);
    const t=FB.state;
    return {rejected:rejected,exact:before===owned(t),
      suspended:!M.commandValid(t,rid),notReconciled:M.landedLink(t,rid).reason===null,
      valid:M.validate(t),rng:(saved.rng>>>0)===(FB.getRngState()>>>0),uid:saved.uid===FB.getUidCounter()};
  });
  expect(result).toEqual({rejected:Array(11).fill(true),exact:true,suspended:true,notReconciled:true,valid:true,rng:true,uid:true});
});

test('the landed home start replays exactly and presents its finite separate command in the shared sheet',async function ({page},info) {
  await importWorld(page,info,'harbor');await beginHome(page);
  async function facts() {return page.evaluate(function () {
    const s=FB.state;return JSON.stringify([s.chars,s.player,s.owner,s.holder,s.bookmarkSetup,s.authority,s.armies,s.stories,
      FB.getRngState()>>>0,FB.getUidCounter()]);
  });}
  const first=await facts();
  await page.evaluate(function () {FB.ui.showMobileConfederation('harbor_following');});
  await expect(page.locator('#modal')).toContainText('Home office');
  await expect(page.locator('#modal')).toContainText('90 days remaining');
  await expect(page.locator('#modal')).toContainText('Public treasury');
  await page.evaluate(function () {FB.ui.closeModal();FB.ui.showScreen('title');});
  await beginHome(page);expect(await facts()).toBe(first);
});
