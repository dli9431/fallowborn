'use strict';
const path=require('path');
const {test,expect}=require('../support/fixture');
const {openGame}=require('../support/game/navigation');
const {beginBookmark}=require('../support/game/bookmark-acceptance');
const {dependsOnRuntime}=require('../support/runtime-dependencies');
const examples={harbor:require('../fixtures/authoring/subordinate-formation-harbor.json'),
  dune:require('../fixtures/authoring/subordinate-formation-dune.json')};
dependsOnRuntime(__filename,['index.html','data/technology.js','data/eras.js','data/political_institutions.js',
  'js/world.js','js/starts.js','js/model.js','js/bookmark_setup.js','js/stories.js','js/mods.js','js/main.js',
  'js/governments.js','js/government_continuity.js','js/government_lineage.js','js/government_selection.js',
  'js/authority.js','js/politics.js','js/home_authority.js','js/mobile_confederations.js','js/mobile_command.js',
  'js/mobile_columns.js','js/mobile_guard.js','js/mobile_camps.js','js/story_expedition_preparation.js',
  'js/treasury.js','js/market.js','js/population.js','js/armies.js','js/wars.js','js/holywar.js','js/rebellions.js',
  'js/fortifications.js','js/logistics.js','js/federates.js',
  'js/travel.js','js/justice.js','js/intrigue.js','js/events.js','js/save.js','js/save_v4.js']);

async function begin(page,info,prefix,modified,household) {
  await openGame(page,info);
  await page.evaluate(function(){FB.ui.showMods();});
  await page.locator('#modfile').setInputFiles(modified ? {name:'subordinate.json',mimeType:'application/json',
    buffer:Buffer.from(JSON.stringify(modified))} : path.resolve(__dirname,'../fixtures/authoring/subordinate-formation-'+prefix+'.json'));
  await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded'}),page.locator('#mod-apply').click()]);
  await page.waitForFunction(function(prefix){return window.FB && FB.game && FB.game.bootReady && FBDATA.bookmarks[prefix+'_world'];},prefix);
  if(prefix==='harbor' || household) await beginBookmark(page,info,prefix+'_world',prefix+'_household');
  else {
    await page.evaluate(function(){FB.startProgression.noteTier(4);});
    const full=page.locator('#btn-choose-beginning');
    if(await full.isVisible()) await full.click();
    else await page.getByRole('button',{name:'New Game',exact:true}).click();
    await page.locator('[data-bookmark="dune_world"]').click();
    await page.locator('[data-scenario="dune_home_start"]').click();
    await expect(page.locator('#chargen:not(.hidden)')).toBeVisible();
    await page.getByRole('button',{name:'Begin Your Story',exact:true}).click();
    await page.getByRole('button',{name:'Begin',exact:true}).click();
    await page.evaluate(function(){FB.game.setPaused(true);FB.game.uiPrefs.hideTips=true;});
  }
  await page.evaluate(function(prefix){
    window.subordinateCase={id:prefix+'_preparation',rid:prefix==='harbor' ? 'harbor_following' : 'dune_coalition',
      origin:prefix==='harbor' ? 'harbor_meadow' : 'dune_pass',
      record:function(s){return s.stories[this.id];},
      leader:function(s){const t=this.record(s),d=FB.campaignBookmark(s).realms.find(function(d){return d.id===this.rid;},this);
        return t.bindings.find(function(b){return b.memberId===d.mobile.opening.leaderMemberId;}).characterId;},
      authorize:function(s){return FB.expeditionPreparation.commit(s,FB.expeditionPreparation.review(s,this.id,'authorize',this.record(s).provider.characterId));},
      localGift:function(s){s.player.gold=500;s.player.provinceId=this.origin;
        for(let n=0;n<64;n++) {const q=FB.expeditionPreparation.review(s,this.id,'contribute',s.player.charId);
          if(q.cost===0) return true;if(!q.allowed || !FB.expeditionPreparation.commit(s,q)) return false;}return false;},
      form:function(s){return FB.expeditionPreparation.commit(s,FB.expeditionPreparation.review(s,this.id,'form',this.leader(s)));}
    };
  },prefix);
}

for(const prefix of ['harbor','dune']) {
  test(prefix+' actual JSON binds a subordinate office and its original people without changing sovereignty',async function({page},info){
    await begin(page,info,prefix);
    const result=await page.evaluate(function(prefix){
      const s=FB.state,C=subordinateCase,t=C.record(s),j=t.openingJurisdiction,
        before=JSON.stringify(s),rng=FB.getRngState(),uid=FB.getUidCounter(),
        q=FB.expeditionPreparation.review(s,C.id,'authorize',t.provider.characterId);
      return {allowed:q.allowed,distinct:s.owner[C.origin]!==s.holder[C.origin],
        holder:s.holder[C.origin]===t.provider.realmId,sovereign:FB.topRealm(s,t.provider.realmId)===s.owner[C.origin],
        exact:j.realms.every(function(r){return !!s.chars[r.characterId];}),
        generated:!!s.realms[t.provider.realmId].generated,adopted:t.provider.realmId==='player',
        private:prefix!=='dune' || s.player.gold===31,
        original:j.realms[0].realmId===(prefix==='harbor' ? 'c_harbor_meadow' : 'dune_gate'),
        empty:!FB.mobile.row(s,C.rid) && !FB.mobile.host(s,C.rid) && FB.treasuryAvailable(s,C.rid)===0 && t.authorizedTurn===null,
        pure:before===JSON.stringify(s) && rng===FB.getRngState() && uid===FB.getUidCounter()};
    },prefix);
    expect(result).toEqual({allowed:true,distinct:true,holder:true,sovereign:true,exact:true,generated:prefix==='harbor',
      adopted:prefix==='dune',private:true,original:true,empty:true,pure:true});
  });

  test(prefix+' private gifts public grants and local consent remain independent real-account transactions',async function({page},info){
    await begin(page,info,prefix);
    const result=await page.evaluate(function(){
      const s=FB.state,C=subordinateCase,P=FB.expeditionPreparation,t=C.record(s);s.player.gold=500;s.player.provinceId=C.origin;
      const privateGold=s.player.gold,source=FB.treasuryPublicAccountSnapshot(s,t.provider.realmId),
        q=P.review(s,C.id,'contribute',s.player.charId),paid=P.commit(s,q),repeat=P.commit(s,q),
        gift=paid && s.player.gold===privateGold-q.cost && FB.treasuryAvailable(s,C.rid)===q.cost &&
          FB.treasuryPublicAccountSnapshot(s,t.provider.realmId).gold===source.gold && t.authorizedTurn===null,
        grant=P.review(s,C.id,'grant',t.provider.characterId),granted=P.commit(s,grant),
        publicOnly=granted && s.player.gold===privateGold-q.cost &&
          Math.abs(FB.treasuryPublicAccountSnapshot(s,t.provider.realmId).gold-source.gold+grant.cost)<1e-8,
        separate=t.authorizedTurn===null && !C.form(s),authorized=C.authorize(s);
      return {gift:gift,repeat:repeat,publicOnly:publicOnly,separate:separate,authorized:authorized,noHost:!FB.mobile.host(s,C.rid)};
    });
    expect(result).toEqual({gift:true,repeat:false,publicOnly:true,separate:true,authorized:true,noHost:true});
  });

  test(prefix+' paid formation conserves real people money food and original office exactly once',async function({page},info){
    await begin(page,info,prefix);
    const result=await page.evaluate(function(){
      const s=FB.state,C=subordinateCase,P=FB.expeditionPreparation,t=C.record(s),funded=C.localGift(s),authorized=C.authorize(s),
        before={seller:FB.treasuryPublicAccountSnapshot(s,t.provider.realmId).gold,money:FB.treasuryAvailable(s,C.rid),
          stock:FB.marketProvisionSnapshot(s,C.origin).stock,population:s.population.counties[C.origin].count,
          people:Object.keys(s.chars).sort().join('|'),land:JSON.stringify([s.owner,s.holder]),
          provenance:JSON.stringify(t.openingJurisdiction),rng:FB.getRngState(),uid:FB.getUidCounter()},
        q=P.review(s,C.id,'form',C.leader(s)),formed=P.commit(s,q),repeat=P.commit(s,q);
      if(!formed) return {funded:funded,authorized:authorized,formed:formed,reason:q.reason};
      const row=FB.mobile.row(s,C.rid),host=FB.mobile.host(s,C.rid);
      return {funded:funded,authorized:authorized,formed:formed,repeat:repeat,
        seller:Math.abs(FB.treasuryPublicAccountSnapshot(s,t.provider.realmId).gold-before.seller-q.foodCost)<1e-8,
        debit:Math.abs(before.money-FB.treasuryAvailable(s,C.rid)-q.cost)<1e-8,
        food:before.stock-FB.marketProvisionSnapshot(s,C.origin).stock===t.formed.food && Math.abs(row.food+host.mobileFood-t.formed.food)<1e-8,
        population:before.population-s.population.counties[C.origin].count,
        total:FB.mobile.total(s,C.rid),single:s.armies.filter(function(a){return a.realm===C.rid;}).length===1,
        same:before.people===Object.keys(s.chars).sort().join('|') && before.land===JSON.stringify([s.owner,s.holder]) &&
          before.provenance===JSON.stringify(t.openingJurisdiction) && before.rng===FB.getRngState() && before.uid===FB.getUidCounter(),
        valid:FB.mobile.validate(s)};
    });
    expect(result).toEqual({funded:true,authorized:true,formed:true,repeat:false,seller:true,debit:true,food:true,
      population:prefix==='dune' ? 1600 : 0,total:prefix==='dune' ? 1600 : 1400,single:true,same:true,valid:true});
  });

  test(prefix+' changed relationships people custody or access reject every stale paid decision atomically',async function({page},info){
    await begin(page,info,prefix);
    const result=await page.evaluate(function(){
      const C=subordinateCase,P=FB.expeditionPreparation;C.localGift(FB.state);C.authorize(FB.state);
      const changes=[function(s,t){s.owner[C.origin]=C.rid;},function(s,t){s.holder[C.origin]=s.owner[C.origin];},
        function(s,t){s.realms[t.provider.realmId].liege=null;},function(s,t){s.realms[t.provider.realmId].capital=C.origin+'_absent';},
        function(s,t){s.realms[t.provider.realmId].ruler.generation++;},function(s,t){s.chars[t.provider.characterId].dead=true;},
        function(s,t){s.chars[t.provider.characterId].imprisoned=true;},
        function(s,t){const r=t.openingJurisdiction.realms.slice(-1)[0];s.realms[FB.startRealmId(s,r.realmId)].ruler.generation++;},
        function(s,t){s.chars[t.openingJurisdiction.realms.slice(-1)[0].characterId].dead=true;},
        function(s,t){s.chars[t.provider.characterId].travel={};},
        function(s,t){s.turn=t.endTurn;},function(s,t){s.market.counties[C.origin][0][s.market.goods.indexOf('provisions')]=0;}];
      return changes.map(function(change){const s=JSON.parse(JSON.stringify(FB.state)),t=C.record(s),q=P.review(s,C.id,'form',C.leader(s));
        change(s,t);const before=JSON.stringify(s),rng=FB.getRngState(),uid=FB.getUidCounter();
        return q.allowed && !P.commit(s,q) && before===JSON.stringify(s) && rng===FB.getRngState() && uid===FB.getUidCounter();});
    });
    expect(result).toEqual(Array(12).fill(true));
  });

  test(prefix+' wait refusal expiry and interruption leave no new host payment or recruited people',async function({page},info){
    await begin(page,info,prefix);
    const result=await page.evaluate(function(){
      const C=subordinateCase,P=FB.expeditionPreparation,story=FB.stories.get(C.id);
      return ['wait','refuse','expired','interrupted'].map(function(action){
        const s=JSON.parse(JSON.stringify(FB.state)),t=C.record(s),before=JSON.stringify([s.realms,s.population,s.market,s.player.gold]);
        if(action==='wait') P.commit(s,P.review(s,C.id,'wait',C.leader(s)));
        else if(action==='refuse') P.commit(s,P.review(s,C.id,'refuse',t.provider.characterId));
        else {if(action==='expired') s.turn=t.endTurn;else s.owner[C.origin]=C.rid;story.day(s,t);}
        return (action==='wait' ? t.status==='preparing' : t.status==='closed' && t.reason===(action==='refuse' ? 'refused' : action)) &&
          before===JSON.stringify([s.realms,s.population,s.market,s.player.gold]) && !FB.mobile.row(s,C.rid) && story.validate(t,s)===undefined;
      });
    });
    expect(result).toEqual(Array(4).fill(true));
  });

  test(prefix+' matching pending funded formed and divergent terminal restores never select or replay',async function({page},info){
    await begin(page,info,prefix);
    const result=await page.evaluate(function(){
      const C=subordinateCase;
      function restore(){const before=JSON.stringify([C.record(FB.state),FB.state.realms,FB.state.player.gold,FB.state.market,FB.state.population,FB.state.armies]),
        save=JSON.parse(FB.save.serialize());FB.save.restore(save);FB.save.restore(JSON.parse(JSON.stringify(save)));
        return before===JSON.stringify([C.record(FB.state),FB.state.realms,FB.state.player.gold,FB.state.market,FB.state.population,FB.state.armies]);}
      const pending=restore(),funded=C.localGift(FB.state),paid=restore(),authorized=C.authorize(FB.state),consent=restore(),
        formed=C.form(FB.state),saved=formed && restore();
      const s=FB.state,t=C.record(s),old=JSON.stringify(t.openingJurisdiction);s.realms[t.provider.realmId].liege=null;
      const divergent=restore();
      return {pending:pending,funded:funded,paid:paid,authorized:authorized,consent:consent,formed:formed,saved:saved,
        divergent:divergent,original:old===JSON.stringify(C.record(FB.state).openingJurisdiction),again:!C.form(FB.state)};
    });
    expect(result).toEqual({pending:true,funded:true,paid:true,authorized:true,consent:true,formed:true,saved:true,divergent:true,original:true,again:true});
  });

  test(prefix+' forged or erased jurisdiction saves reject before adopting live state RNG or identities',async function({page},info){
    await begin(page,info,prefix);
    const result=await page.evaluate(function(){
      const C=subordinateCase,save=JSON.parse(FB.save.serialize()),before=JSON.stringify(FB.state),rng=FB.getRngState(),uid=FB.getUidCounter(),
        changes=[function(t,s){delete t.openingJurisdiction;},function(t,s){t.openingJurisdiction.schema=2;},
          function(t,s){t.openingJurisdiction.extra=true;},function(t,s){t.openingJurisdiction.origin='absent';},
          function(t,s){t.openingJurisdiction.realms.reverse();},function(t,s){t.openingJurisdiction.realms.pop();},
          function(t,s){t.openingJurisdiction.realms[0].realmId='player';},
          function(t,s){t.openingJurisdiction.realms[0].characterId=s.player.charId+'_other';},
          function(t,s){t.openingJurisdiction.realms[0].generation++;},function(t,s){t.openingJurisdiction.realms[0].liegeId=null;},
          function(t,s){t.openingJurisdiction.realms[0].capital='absent';},
          function(t,s){delete s.chars[t.openingJurisdiction.realms.slice(-1)[0].characterId];},
          function(t,s){t.openingJurisdiction.appointment={id:'absent'};}];
      const rejected=changes.map(function(change){const x=JSON.parse(JSON.stringify(save));change(x.state.stories[C.id],x.state);
        try{FB.save.restore(x);return false;}catch(error){return true;}});
      return {rejected:rejected,pure:before===JSON.stringify(FB.state) && rng===FB.getRngState() && uid===FB.getUidCounter()};
    });
    expect(result).toEqual({rejected:Array(13).fill(true),pure:true});
  });

  test(prefix+' original sovereign death keeps its navigable record and interrupts without replacement',async function({page},info){
    await begin(page,info,prefix);
    const result=await page.evaluate(function(){
      const s=FB.state,C=subordinateCase,t=C.record(s),story=FB.stories.get(C.id),j=t.openingJurisdiction,
        original=JSON.stringify(j),r=j.realms.slice(-1)[0],c=s.chars[r.characterId],
        member=s.realms[r.realmId].succession.members[c.royalLine.memberId],retained=FB.courtRecordRetained(s,c);
      FB.courtMemberDied(s,member,c);story.day(s,t);
      const save=JSON.parse(FB.save.serialize());FB.save.restore(save);
      return {retained:retained,present:!!FB.state.chars[c.id],closed:C.record(FB.state).reason==='interrupted',
        original:original===JSON.stringify(C.record(FB.state).openingJurisdiction),noHost:!FB.mobile.host(FB.state,C.rid)};
    });
    expect(result).toEqual({retained:true,present:true,closed:true,original:true,noHost:true});
  });

  test(prefix+' exhausted finite market blocks formation while closure retains contributed funds',async function({page},info){
    await begin(page,info,prefix);
    const result=await page.evaluate(function(){
      const s=FB.state,C=subordinateCase,P=FB.expeditionPreparation,funded=C.localGift(s),authorized=C.authorize(s),
        money=FB.treasuryAvailable(s,C.rid),privateGold=s.player.gold;
      s.market.counties[C.origin][0][s.market.goods.indexOf('provisions')]=0;
      const before=JSON.stringify(s),q=P.review(s,C.id,'form',C.leader(s)),failed=!P.commit(s,q),pure=before===JSON.stringify(s),
        stopped=P.commit(s,P.review(s,C.id,'stop',C.leader(s)));
      return {funded:funded,authorized:authorized,failed:failed,reason:q.reason,pure:pure,stopped:stopped,
        retained:money===FB.treasuryAvailable(s,C.rid) && privateGold===s.player.gold,noHost:!FB.mobile.host(s,C.rid)};
    });
    expect(result).toEqual({funded:true,authorized:true,failed:true,reason:'provisions',pure:true,stopped:true,retained:true,noHost:true});
  });

  test(prefix+' enemy military occupation blocks formation while legal sovereignty and direct holding stay unchanged',async function({page},info){
    await begin(page,info,prefix);
    const result=await page.evaluate(function(prefix){
      const s=FB.state,C=subordinateCase,P=FB.expeditionPreparation,t=C.record(s),story=FB.stories.get(C.id),
        funded=C.localGift(s),authorized=C.authorize(s),q=P.review(s,C.id,'form',C.leader(s)),
        owners=JSON.stringify([s.owner,s.holder]),sovereign=s.owner[C.origin],
        enemy=prefix==='harbor' ? 'harbor_commune' : 'dune_oasis',
        war=FB.registerOrdinaryWar(s,enemy,{enemy:sovereign,target:C.origin,legacy:false,occupations:{}});
      war.occupations[C.origin]={occupied:true,progress:100,homeRealm:sovereign};
      const before=JSON.stringify(s),rejected=!P.commit(s,q),fresh=!P.review(s,C.id,'form',C.leader(s)).allowed,
        pure=before===JSON.stringify(s);story.day(s,t);
      return {funded:funded,authorized:authorized,rejected:rejected,fresh:fresh,pure:pure,
        legal:owners===JSON.stringify([s.owner,s.holder]),closed:t.reason==='interrupted',noHost:!FB.mobile.row(s,C.rid)};
    },prefix);
    expect(result).toEqual({funded:true,authorized:true,rejected:true,fresh:true,pure:true,legal:true,closed:true,noHost:true});
  });
}

test('candidate jurisdiction bindings reject detached mismatches without generating holders or consuming RNG',async function({page},info){
  await openGame(page,info);
  const result=await page.evaluate(function(examples){
    const before=JSON.stringify([FB.state,FBDATA]),rng=FB.getRngState(),uid=FB.getUidCounter(),
      changes=[function(p,b){p.provider.jurisdiction.kind='sovereign';},function(p,b){p.provider.jurisdiction.extra=true;},
        function(p,b){p.provider.jurisdiction.sovereignRealmId=p.provider.realmId;},
        function(p,b){p.provider.jurisdiction.sovereignRealmId='absent';},function(p,b){p.provider.realmId='absent';},
        function(p,b){p.provider.kind='realm_ruler';},function(p,b){p.provider.jurisdiction=null;},
        function(p,b){delete p.provider.jurisdiction.sovereignRealmId;},function(p,b){p.provider.jurisdiction=[];}];
    const rejected=Object.values(examples).map(function(example){return changes.map(function(change){
      const m=JSON.parse(JSON.stringify(example)),b=Object.values(m.bookmarks)[0],p=Object.values(m.storyInstances).find(function(d){return d.type==='expedition_preparation';});
      change(p,b);const original=JSON.stringify(m);return FB.mods.validate(m).length>0 && original===JSON.stringify(m);});});
    return {rejected:rejected,pure:before===JSON.stringify([FB.state,FBDATA]) && rng===FB.getRngState() && uid===FB.getUidCounter()};
  },examples);
  expect(result).toEqual({rejected:[Array(9).fill(true),Array(9).fill(true)],pure:true});
});

test('unopted retained ruler world restores without jurisdiction preparation public-account conversion or a host',async function({page},info){
  const mod=JSON.parse(JSON.stringify(examples.dune));mod.bookmarks.dune_world.revision='baseline';
  await begin(page,info,'dune',mod);
  const result=await page.evaluate(function(){
    const s=FB.state,save=JSON.parse(FB.save.serialize()),before=JSON.stringify([s.realms,s.player.gold,s.stories]);FB.save.restore(save);
    return {absent:!FB.state.stories.dune_preparation && !FB.state.start.publicTreasury && !FB.mobile.row(FB.state,'dune_coalition'),
      same:before===JSON.stringify([FB.state.realms,FB.state.player.gold,FB.state.stories]),form:FB.governments.forRealm(FB.state,'player').id};
  });
  expect(result).toEqual({absent:true,same:true,form:'territorial'});
});

test('NPC direct-holder consent uses the same transaction without touching either purse',async function({page},info){
  await begin(page,info,'harbor');
  const result=await page.evaluate(function(){
    const s=FB.state,C=subordinateCase,t=C.record(s),story=FB.stories.get(C.id),other=JSON.parse(JSON.stringify(s)),
      before=JSON.stringify([s.realms,s.player.gold,s.population,s.market]);
    const okay=C.authorize(other);story.day(s,t);
    return {okay:okay,same:JSON.stringify(t)===JSON.stringify(C.record(other)),unchanged:before===JSON.stringify([s.realms,s.player.gold,s.population,s.market])};
  });
  expect(result).toEqual({okay:true,same:true,unchanged:true});
});

test('direct funding reviews include the same live jurisdiction facts and reject a stale sovereign change',async function({page},info){
  await begin(page,info,'harbor');
  const result=await page.evaluate(function(){
    const s=FB.state,C=subordinateCase,t=C.record(s),q=FB.homeAuthority.fundingQuote(s,
      {source:{kind:'public',realmId:t.provider.realmId},recipientRealmId:C.rid,amount:1,characterId:t.provider.characterId,provinceId:C.origin});
    s.realms[t.provider.realmId].liege=null;
    const before=JSON.stringify(s),rejected=!FB.homeAuthority.fund(s,q);
    return {allowed:q.allowed,rejected:rejected,pure:before===JSON.stringify(s),noConsent:t.authorizedTurn===null,noHost:!FB.mobile.row(s,C.rid)};
  });
  expect(result).toEqual({allowed:true,rejected:true,pure:true,noConsent:true,noHost:true});
});

test('a declared county deputy retains exact scope while levy consent grants no public spending power',async function({page},info){
  const mod=JSON.parse(JSON.stringify(examples.dune)),world=mod.bookmarks.dune_world.revisions.local_policy;
  world.homeAuthorityPolicies.territorial.delegation=true;
  mod.authorityOffices={dune_formation_deputy:{name:'Formation deputy',desc:'Local levy consent only.',
    powers:['peace'],scopes:['county'],succession:'reaffirm',recognitionSources:[],homePowers:['levy']}};
  world.opening.actors.dune_local_officer={name:'Iri Sen',sex:'f',born:867,culture:'dune_folk',religion:'dune_belief',
    station:1,role:'commander',home:'dune_pass',skills:{mar:5}};
  world.opening.appointments.dune_local_levy={officeId:'dune_formation_deputy',actorId:'dune_local_officer',
    realmId:'dune_gate',scope:{kind:'county',id:'dune_pass'},endTurn:18};
  mod.storyInstances.dune_preparation.provider.actorId='dune_local_officer';
  await begin(page,info,'dune',mod);
  const result=await page.evaluate(function(){
    const s=FB.state,C=subordinateCase,P=FB.expeditionPreparation,t=C.record(s),story=FB.stories.get(C.id),
      bound=JSON.stringify(t.openingJurisdiction),grant=P.review(s,C.id,'grant',t.provider.characterId),authorized=C.authorize(s),
      saved=JSON.parse(FB.save.serialize());FB.save.restore(saved);
    const exact=bound===JSON.stringify(C.record(FB.state).openingJurisdiction),changes=[
      function(s,t,a){a.scope={kind:'realm',id:t.provider.realmId};},function(s,t,a){a.officeId='public_commander';},
      function(s,t,a){a.endTurn=19;},function(s,t,a){a.appointerGeneration++;},
      function(s,t,a){a.holder.id=s.player.charId;},function(s,t,a){s.chars[t.provider.characterId].dead=true;},
      function(s,t,a){s.chars[t.provider.characterId].homeProvinceId='dune_flats';}];
    const rejected=changes.map(function(change){const v=JSON.parse(JSON.stringify(FB.state)),r=C.record(v),
      a=v.authority.appointments.find(function(a){return a.id===r.provider.appointmentId;});
      const q=P.review(v,C.id,'contribute',v.player.charId);change(v,r,a);const before=JSON.stringify(v),
        noDebit=!P.commit(v,q) && before===JSON.stringify(v);story.day(v,r);
      return noDebit && r.reason==='interrupted' && bound===JSON.stringify(r.openingJurisdiction);});
    const state=FB.state,record=C.record(state),removed=FB.authorityAppointmentTransition(state,record.provider.appointmentId,'remove');
    story.day(state,record);const closed=JSON.parse(FB.save.serialize());FB.save.restore(closed);
    return {deputy:t.provider.appointmentId!==null,denied:!grant.allowed,authorized:authorized,exact:exact,rejected:rejected,
      removed:removed,closed:C.record(FB.state).reason==='interrupted',original:bound===JSON.stringify(C.record(FB.state).openingJurisdiction)};
  });
  expect(result).toEqual({deputy:true,denied:true,authorized:true,exact:true,rejected:Array(7).fill(true),removed:true,closed:true,original:true});
});

test('ordinary protagonist succession preserves the original vassal provenance and public account',async function({page},info){
  await begin(page,info,'dune');
  const result=await page.evaluate(function(){
    const C=subordinateCase,s=FB.state,t=C.record(s),old=JSON.stringify(t.openingJurisdiction),
      cash=FB.treasuryPublicAccountSnapshot(s,'player').gold;
    let heir=FB.heirsOf(s)[0];
    if(!heir) {const me=s.chars[s.player.charId];heir=FB.makeCharacter(s,{name:'Mira',sex:'f',born:s.date.year-20,
      culture:me.culture,religion:me.religion,station:FB.stationOf(me),
      fatherId:me.sex==='m' ? me.id : null,motherId:me.sex==='f' ? me.id : null});me.childrenIds.push(heir.id);}
    FB.game.succeedTo(heir.id,{livingAbdication:true});FB.ui.closeModal();
    FB.stories.get(C.id).day(FB.state,C.record(FB.state));
    const save=JSON.parse(FB.save.serialize());FB.save.restore(save);
    return {original:old===JSON.stringify(C.record(FB.state).openingJurisdiction),
      cash:cash===FB.treasuryPublicAccountSnapshot(FB.state,'player').gold,
      closed:C.record(FB.state).reason==='interrupted',noHost:!FB.mobile.row(FB.state,C.rid)};
  });
  expect(result).toEqual({original:true,cash:true,closed:true,noHost:true});
});

test('ordinary adoption after story binding preserves original member and jurisdiction references',async function({page},info){
  const mod=JSON.parse(JSON.stringify(examples.dune));delete mod.bookmarks.dune_world.revisions.local_policy.openingInfrastructure;
  await begin(page,info,'dune',mod);
  const result=await page.evaluate(function(){
    const C=subordinateCase,s=FB.state,t=C.record(s),original=JSON.stringify([t.bindings,t.openingJurisdiction]),
      ids=t.bindings.filter(function(b){return b.person.kind==='realm_ruler';}).map(function(b){return b.person.realmId;}),
      saved=JSON.parse(FB.save.serialize());FB.save.restore(saved);
    const same=original===JSON.stringify([C.record(FB.state).bindings,C.record(FB.state).openingJurisdiction]),
      funded=C.localGift(FB.state),authorized=C.authorize(FB.state),formed=C.form(FB.state);
    const after=JSON.parse(FB.save.serialize());FB.save.restore(after);
    return {ids:ids,same:same,funded:funded,authorized:authorized,formed:formed,
      original:original===JSON.stringify([C.record(FB.state).bindings,C.record(FB.state).openingJurisdiction])};
  });
  expect(result).toEqual({ids:['dune_gate'],same:true,funded:true,authorized:true,formed:true,original:true});
});

test('a supported court release changes live account aliases while preserving original jurisdiction and member provenance',async function({page},info){
  const mod=JSON.parse(JSON.stringify(examples.dune)),b=mod.bookmarks.dune_world;
  mod.governmentForms.dune_lineage={holders:'direct',succession:'kin_acclamation',territory:'fixed',consent:'local_reserved',
    levy:'local_obligations',revenue:'local_obligations',council:'local_interests',diplomacy:'territorial_diplomacy',
    ai:'local_kingship',ladder:'inherited_ladder',officeCatalogue:[],homeAuthority:{schema:1,presence:'territory',delegation:false},
    selectionProfile:{eligibility:{minAge:16},tieBreak:'seniority',consensus:0.6,quorum:0.6,negotiationCost:8,
      terms:{levy:0.6,revenue:0.65},reserved:['levy','war','treaty','grant','extraordinary_tax'],members:[
        {id:'dune_kin_interest',name:'Dune kin',principal:'senior_kin',scope:'realm',basis:'kin_recognition',weight:3,
          continuity:'senior_kin',minimumSupport:-15,minimumMartial:0,maximumLevy:0.8,maximumRevenue:0.8},
        {id:'dune_home_interest',name:'Dune households',principal:'capital_community',scope:'capital',basis:'community_assent',weight:3,
          continuity:'institution',minimumSupport:-5,minimumMartial:0,maximumLevy:0.7,maximumRevenue:0.7}]}};
  [b].concat(Object.values(b.revisions)).forEach(function(layer){layer.realms.filter(function(r){return r.id==='dune_gate';})
    .forEach(function(r){r.government='dune_lineage';});});
  mod.startScenarios.find(function(s){return s.id==='dune_home_start';}).governmentForm='dune_lineage';
  await begin(page,info,'dune',mod);
  const result=await page.evaluate(function(){
    const s=FB.state,C=subordinateCase,t=C.record(s),old=JSON.stringify([t.bindings,t.openingJurisdiction]),
      cash=FB.treasuryPublicAccountSnapshot(s,'player').gold,me=s.chars[s.player.charId],
      released=FB.governmentSelection.releasePlayerCourt(s,me,true);
    FB.stories.get(C.id).day(s,t);const original=old===JSON.stringify([t.bindings,t.openingJurisdiction]),
      save=JSON.parse(FB.save.serialize());FB.save.restore(save);
    return {released:released,original:original,saved:old===JSON.stringify([C.record(FB.state).bindings,C.record(FB.state).openingJurisdiction]),
      provider:C.record(FB.state).provider.realmId,alias:FB.state.start.publicTreasury.realmId,
      cash:cash===FB.treasuryPublicAccountSnapshot(FB.state,'dune_gate').gold,
      closed:C.record(FB.state).reason==='interrupted',noHost:!FB.mobile.row(FB.state,C.rid)};
  });
  expect(result).toEqual({released:'dune_gate',original:true,saved:true,provider:'dune_gate',alias:'dune_gate',cash:true,closed:true,noHost:true});
});

test('original command issuer succession invalidates consent without granting the sovereign local authority',async function({page},info){
  const mod=JSON.parse(JSON.stringify(examples.harbor)),b=mod.bookmarks.harbor_world,
    following=b.realms.find(function(r){return r.mobile;});
  following.government='expedition_command';
  following.mobile.command.superior={kind:'realm_ruler',realmId:'harbor_upland'};
  await begin(page,info,'harbor',mod);
  const result=await page.evaluate(function(){
    const C=subordinateCase,s=FB.state,t=C.record(s),P=FB.expeditionPreparation,story=FB.stories.get(C.id),
      sovereign=FB.realmRulerCharacterSnapshot(s,'harbor_upland'),
      denied=!P.review(s,C.id,'authorize',sovereign.id).allowed,original=JSON.stringify(t.issuer),
      authorized=C.authorize(s),old=P.review(s,C.id,'grant',t.provider.characterId);
    FB.killChar(s,sovereign);const before=JSON.stringify(s),stale=!P.commit(s,old) && before===JSON.stringify(s);
    story.day(s,t);const save=JSON.parse(FB.save.serialize());FB.save.restore(save);
    return {denied:denied,authorized:authorized,stale:stale,original:original===JSON.stringify(C.record(FB.state).issuer),
      closed:C.record(FB.state).reason==='interrupted',noHost:!FB.mobile.host(FB.state,C.rid)};
  });
  expect(result).toEqual({denied:true,authorized:true,stale:true,original:true,closed:true,noHost:true});
});

test('phone formation review explains local consent and preserves the shared Back and Escape path',async function({page},info){
  await begin(page,info,'dune');await page.setViewportSize({width:390,height:844});
  await page.evaluate(function(){FB.ui.showStorySheet(subordinateCase.id);});
  await expect(page.locator('#genmodal')).toContainText('direct holder');
  await page.locator('[data-story-choice="authorize"]').click();
  await page.locator('#genmodal').getByRole('button',{name:'Back',exact:true}).click();
  await expect(page.locator('[data-story-choice="authorize"]')).toBeVisible();
  await page.locator('[data-story-choice="authorize"]').click();await page.keyboard.press('Escape');
  await expect(page.locator('[data-story-choice="authorize"]')).toBeVisible();
  expect(await page.evaluate(function(){return subordinateCase.record(FB.state).authorizedTurn;})).toBeNull();
});
