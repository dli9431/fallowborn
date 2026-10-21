'use strict';
const path=require('path');
const {test,expect}=require('../support/fixture');
const {openGame}=require('../support/game/navigation');
const {dependsOnRuntime}=require('../support/runtime-dependencies');
const examples={harbor:require('../fixtures/authoring/sovereign-preparation-harbor.json'),
  dune:require('../fixtures/authoring/sovereign-preparation-dune.json')};
dependsOnRuntime(__filename,['index.html','data/technology.js','data/political_institutions.js','data/units.js',
  'js/starts.js','js/main.js','js/world.js','js/mods.js','js/stories.js','js/bookmark_setup.js',
  'js/government_lineage.js','js/government_selection.js','js/governments.js','js/model.js','js/authority.js',
  'js/home_authority.js','js/mobile_confederations.js','js/mobile_command.js','js/treasury.js','js/market.js',
  'js/population.js','js/logistics.js','js/climate.js','js/technology.js','js/armies.js','js/federates.js',
  'js/justice.js','js/intrigue.js','js/events.js','js/story_expedition_preparation.js','js/save.js','js/save_v4.js']);

async function importWorld(page,info,prefix,modified,revision) {
  await openGame(page,info);
  await page.evaluate(function(){FB.ui.showMods();});
  await page.locator('#modfile').setInputFiles(modified ? {name:'sovereign.json',mimeType:'application/json',
    buffer:Buffer.from(JSON.stringify(modified))} : path.resolve(__dirname,'../fixtures/authoring/sovereign-preparation-'+prefix+'.json'));
  await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded'}),page.locator('#mod-apply').click()]);
  await page.waitForFunction(function(prefix){return window.FB && FB.game && FB.game.bootReady && FBDATA.bookmarks[prefix+'_world'];},prefix);
  await page.evaluate(function(input){
    if(FBDATA.bookmarks[input.prefix+'_world'].revisions)
      FBDATA.bookmarks[input.prefix+'_world'].revision=input.revision || 'local_policy';
    FB.startProgression.noteTier(4);
    window.sovereignCase={id:input.prefix+'_preparation',rid:input.prefix==='harbor' ? 'harbor_following' : 'dune_coalition',
      origin:input.prefix==='harbor' ? 'harbor_ridge' : 'dune_pass',
      record:function(s){return s.stories[this.id];},
      leader:function(s){const d=FB.campaignBookmark(s).realms.find(function(d){return d.id===this.rid;},this);
        return this.record(s).bindings.find(function(b){return b.memberId===d.mobile.opening.leaderMemberId;}).characterId;},
      apply:function(s,action){return FB.expeditionPreparation.commit(s,FB.expeditionPreparation.review(s,this.id,action,this.leader(s)));},
      facts:function(s){return JSON.stringify([s.start,s.stories,s.realms,s.player.gold,s.market,s.population,s.armies]);},
      restore:function(){const before=this.facts(FB.state),save=JSON.parse(FB.save.serialize()),rng=FB.getRngState(),uid=FB.getUidCounter();
        FB.save.restore(save);FB.save.restore(JSON.parse(JSON.stringify(save)));
        return before===this.facts(FB.state) && rng===FB.getRngState() && uid===FB.getUidCounter();}};
    const adopt=FB.adoptStartingRealm;
    FB.adoptStartingRealm=function(s,sc,options){
      const t=s.stories && s.stories[sovereignCase.id],old=t && JSON.stringify(t.bindings),person=s.player.charId;
      const result=adopt(s,sc,options);
      sovereignCase.adoption={result:result,hadRecord:!!t,exact:!t || old===JSON.stringify(t.bindings),person:person===s.player.charId};
      return result;
    };
  },{prefix:prefix,revision:revision});
}
async function begin(page,prefix,entry) {
  const sc=examples[prefix].startScenarios[1];
  if(entry==='direct') {
    await page.evaluate(function(prefix){return new Promise(function(resolve,reject){
      FB.activateBookmark(prefix+'_world',null,function(error){if(error) reject(error);else resolve();});});},prefix);
    await page.evaluate(function(sc){FB.game.pending={scenario:FBDATA.startScenarios.find(function(s){return s.id===sc.id;}),
      bookmarkId:sc.bookmarkIds[0],provinceId:sc.fixedProvinceId,name:sc.characterName,sex:sc.sex,
      familyPreset:'standard',seed:'SOVEREIGN'};FB.game.start();FB.game.setPaused(true);},sc);
  } else {
    const full=page.locator('#btn-choose-beginning');
    if(await full.isVisible()) await full.click();else await page.getByRole('button',{name:'New Game',exact:true}).click();
    if(entry==='picker') {
      await page.locator('[data-bookmark="'+prefix+'_world"]').click();
      await page.locator('[data-scenario="'+sc.id+'"]').click();
    } else {
      await page.locator('#btn-bm-seed').click();
      await page.locator('#ng-seed').fill('SOVEREIGN-'+prefix+'_world-'+sc.id+'-'+sc.fixedProvinceId+'-'+sc.sex+'-'+sc.characterName.replace(/ /g,'_')+'-standard');
      await page.locator('#ng-seed').press('Enter');
    }
    await expect(page.locator('#chargen:not(.hidden)')).toBeVisible();
    await page.getByRole('button',{name:'Begin Your Story',exact:true}).click();
    await page.getByRole('button',{name:'Begin',exact:true}).click();
  }
  await page.evaluate(function(){FB.game.setPaused(true);FB.game.uiPrefs.hideTips=true;});
}

for(const prefix of ['harbor','dune']) {
  for(const entry of ['picker','code','direct']) {
    test(prefix+' '+entry+' adoption preserves original sovereign bindings and current pure authority',async function({page},info){
      await importWorld(page,info,prefix);await begin(page,prefix,entry);
      const result=await page.evaluate(function(prefix){
        const s=FB.state,C=sovereignCase,t=C.record(s),before=JSON.stringify(s),rng=FB.getRngState(),uid=FB.getUidCounter(),
          q=FB.expeditionPreparation.review(s,C.id,'authorize',s.player.charId),
          d=FB.campaignBookmark(s).realms.find(function(d){return d.id===C.rid;}),
          original=prefix==='harbor' ? 'harbor_upland' : 'dune_gate';
        return {adoption:C.adoption,allowed:q.allowed,bindings:JSON.stringify(t.bindings.map(function(b){return b.person;}))===
          JSON.stringify(d.mobile.opening.principals.map(function(b){return b.person;})),
          home:t.bindings.find(function(b){return b.characterId===s.player.charId;}).person.realmId===original,
          generation:t.bindings.find(function(b){return b.characterId===s.player.charId;}).person.generation===1,
          samePerson:C.leader(s)===s.player.charId,alias:t.provider.realmId==='player',noJurisdiction:t.openingJurisdiction===undefined,
          sovereign:s.owner[C.origin]==='player' && s.holder[C.origin]==='player' && !s.realms.player.liege,
          empty:!FB.mobile.row(s,C.rid) && !FB.mobile.host(s,C.rid) && FB.treasuryAvailable(s,C.rid)===0 && t.authorizedTurn===null,
          pure:before===JSON.stringify(s) && rng===FB.getRngState() && uid===FB.getUidCounter(),
          explicit:!!s.openingInfrastructureState,valid:FB.validateBookmark(FB.campaignBookmark(s)),
          raw:FB.validateBookmark(FBDATA.bookmarks[prefix+'_world']),
          revisions:FB.bookmarkRevisions(prefix+'_world').map(function(b){return FB.validateBookmark(b);})};
      },prefix);
      expect(result).toEqual({adoption:{result:true,hadRecord:prefix==='harbor',exact:true,person:true},allowed:true,bindings:true,
        home:true,generation:true,samePerson:true,alias:true,noJurisdiction:true,sovereign:true,empty:true,pure:true,
        explicit:prefix==='dune',valid:[],raw:[],revisions:[[],[]]});
    });
  }

  test(prefix+' paid formation keeps separate voluntary funding consent and finite conservation',async function({page},info){
    await importWorld(page,info,prefix);await begin(page,prefix,'code');
    const result=await page.evaluate(function(){
      const s=FB.state,C=sovereignCase,P=FB.expeditionPreparation,t=C.record(s),actor=s.player.charId;
      s.player.gold=500;s.realms.player.treasury.gold=500;
      const original=JSON.stringify(t.bindings),land=JSON.stringify([s.owner,s.holder]),people=Object.keys(s.chars).sort().join('|'),
        pop=s.population.counties[C.origin].count,priv=s.player.gold,pub=s.realms.player.treasury.gold,
        q=P.review(s,C.id,'contribute',actor),gift=P.commit(s,q),repeat=P.commit(s,q),
        separate=gift && s.player.gold===priv-q.cost && s.realms.player.treasury.gold===pub && t.authorizedTurn===null && !C.apply(s,'form'),
        authorized=C.apply(s,'authorize'),oldMoney=FB.treasuryAvailable(s,C.rid),stock=FB.marketProvisionSnapshot(s,C.origin).stock,
        form=P.review(s,C.id,'form',actor),formed=P.commit(s,form),again=P.commit(s,form);
      if(!formed) return {gift:gift,authorized:authorized,formed:formed,reason:form.reason};
      const row=FB.mobile.row(s,C.rid),host=FB.mobile.host(s,C.rid);
      return {gift:gift,repeat:repeat,separate:separate,authorized:authorized,formed:formed,again:again,
        money:Math.abs(oldMoney-FB.treasuryAvailable(s,C.rid)-form.cost)<1e-8,
        seller:Math.abs(s.realms.player.treasury.gold-pub-form.foodCost)<1e-8,
        food:stock-FB.marketProvisionSnapshot(s,C.origin).stock===t.formed.food && Math.abs(row.food+host.mobileFood-t.formed.food)<1e-8,
        unchanged:pop===s.population.counties[C.origin].count && land===JSON.stringify([s.owner,s.holder]) &&
          people===Object.keys(s.chars).sort().join('|') && original===JSON.stringify(t.bindings) && original===JSON.stringify(row.openingBindings),
        single:s.armies.filter(function(a){return a.realm===C.rid;}).length===1 && row.leaderId===actor,
        valid:FB.mobile.validate(s),restored:C.restore()};
    });
    expect(result).toEqual({gift:true,repeat:false,separate:true,authorized:true,formed:true,again:false,
      money:true,seller:true,food:true,unchanged:true,single:true,valid:true,restored:true});
  });

  test(prefix+' public grant does not authorize or debit the household and stale reviews fail atomically',async function({page},info){
    await importWorld(page,info,prefix);await begin(page,prefix,'picker');
    const result=await page.evaluate(function(){
      const C=sovereignCase,P=FB.expeditionPreparation,s=FB.state,actor=s.player.charId;
      s.realms.player.treasury.gold=500;
      const priv=s.player.gold,pub=s.realms.player.treasury.gold,q=P.review(s,C.id,'grant',actor),
        granted=P.commit(s,q),repeat=P.commit(s,q),separate=C.record(s).authorizedTurn===null && !C.apply(s,'form'),
        conserved=granted && s.player.gold===priv && Math.abs(pub-s.realms.player.treasury.gold-q.cost)<1e-8 && FB.treasuryAvailable(s,C.rid)===q.cost;
      C.apply(s,'authorize');
      const changes=[function(x){x.realms.player.ruler.generation=FB.realmRulerGeneration(x,'player')+1;},function(x){x.chars[actor].dead=true;},
        function(x){x.holder[C.origin]=C.rid;},function(x){x.owner[C.origin]=C.rid;},
        function(x){x.market.counties[C.origin][0][x.market.goods.indexOf('provisions')]=0;},
        function(x){x.turn=C.record(x).endTurn;},function(x){C.record(x).bindings[0].person.actorId='absent';},
        function(x){x.market.counties[C.origin][1][x.market.goods.indexOf('provisions')]*=1.01;},
        function(x){x.date.season=(x.date.season+1)%4;}];
      const stale=changes.map(function(change){const x=JSON.parse(JSON.stringify(s)),f=P.review(x,C.id,'form',actor);change(x);
        const before=JSON.stringify(x),rng=FB.getRngState(),uid=FB.getUidCounter();
        return f.allowed && !P.commit(x,f) && before===JSON.stringify(x) && rng===FB.getRngState() && uid===FB.getUidCounter();});
      return {granted:granted,repeat:repeat,separate:separate,conserved:conserved,stale:stale};
    });
    expect(result).toEqual({granted:true,repeat:false,separate:true,conserved:true,stale:Array(9).fill(true)});
  });

  test(prefix+' pending funded consented formed and every closed disposition restore exact original history twice',async function({page},info){
    await importWorld(page,info,prefix);await begin(page,prefix,'code');
    const result=await page.evaluate(function(){
      const C=sovereignCase,P=FB.expeditionPreparation,base=FB.save.serialize(),original=JSON.stringify(C.record(FB.state).bindings),
        pending=C.restore();
      FB.state.realms.player.treasury.gold=500;
      const grant=C.apply(FB.state,'grant'),funded=C.restore(),authorize=C.apply(FB.state,'authorize'),consented=C.restore(),
        formed=C.apply(FB.state,'form'),formation=formed && C.restore();
      const closed=['refused','stopped','expired','interrupted'].map(function(reason){
        FB.save.restore(JSON.parse(base));const s=FB.state,t=C.record(s);
        if(reason==='refused' || reason==='stopped') C.apply(s,reason==='refused' ? 'refuse' : 'stop');
        else {if(reason==='expired') s.turn=t.endTurn;else s.holder[C.origin]=C.rid;FB.stories.get(C.id).day(s,t);}
        return t.status==='closed' && t.reason===reason && C.restore() && original===JSON.stringify(C.record(FB.state).bindings) && !FB.mobile.row(FB.state,C.rid);
      });
      return {pending:pending,grant:grant,funded:funded,authorize:authorize,consented:consented,formed:formed,formation:formation,closed:closed};
    });
    expect(result).toEqual({pending:true,grant:true,funded:true,authorize:true,consented:true,formed:true,formation:true,closed:Array(4).fill(true)});
  });

  test(prefix+' altered original person source party attachment and definition saves reject without adoption',async function({page},info){
    await importWorld(page,info,prefix);await begin(page,prefix,'direct');
    const result=await page.evaluate(function(){
      const C=sovereignCase,save=JSON.parse(FB.save.serialize()),before=JSON.stringify(FB.state),rng=FB.getRngState(),uid=FB.getUidCounter(),
        changes=[function(t,s){t.bindings.find(function(b){return b.person.kind==='realm_ruler';}).person.realmId='player';},
          function(t,s){t.bindings.find(function(b){return b.person.kind==='realm_ruler';}).person.generation++;},
          function(t,s){t.bindings[0].characterId=s.player.charId+'_other';},function(t,s){t.bindings.pop();},
          function(t,s){delete s.chars[t.bindings[0].characterId];},function(t,s){t.reserves[0].count++;},
          function(t,s){t.definitionKey+=' ';},function(t,s){delete s.stories[C.id];},
          function(t,s){s.start.storyAttachments.world.push(C.id);}];
      return changes.map(function(change){const x=JSON.parse(JSON.stringify(save));change(x.state.stories[C.id],x.state);
        try{FB.save.restore(x);return false;}catch(error){return before===JSON.stringify(FB.state) && rng===FB.getRngState() && uid===FB.getUidCounter();}});
    });
    expect(result).toEqual(Array(9).fill(true));
  });

  test(prefix+' retained revision never enrolls a preparation or fills its account on restore',async function({page},info){
    await importWorld(page,info,prefix,null,'baseline');await begin(page,prefix,'code');
    const result=await page.evaluate(function(prefix){
      const C=sovereignCase,absent=!C.record(FB.state) && !FB.state.start.publicTreasury && !FB.mobile.row(FB.state,C.rid),
        save=JSON.parse(FB.save.serialize());FBDATA.bookmarks[prefix+'_world'].revision='local_policy';
      FB.save.restore(save);FB.save.restore(JSON.parse(JSON.stringify(save)));
      return {absent:absent,retained:FB.state.start.revision==='baseline',stillAbsent:!C.record(FB.state) && !FB.state.start.publicTreasury && !FB.mobile.row(FB.state,C.rid)};
    },prefix);
    expect(result).toEqual({absent:true,retained:true,stillAbsent:true});
  });

  test(prefix+' original ruler death and household succession retain exact parties without replacing the commander',async function({page},info){
    await importWorld(page,info,prefix);await begin(page,prefix,'code');
    const result=await page.evaluate(function(){
      const C=sovereignCase,s=FB.state,me=s.chars[s.player.charId],original=JSON.stringify(C.record(s).bindings),id=me.id,
        heir=FB.makeCharacter(s,{name:'Household heir',sex:'m',born:s.date.year-20,culture:me.culture,religion:me.religion,
          station:FB.stationOf(me),motherId:me.id});
      me.childrenIds.push(heir.id);FB.killChar(s,me);
      FB.game.succeedTo(heir.id);FB.ui.closeModal();FB.stories.get(C.id).day(FB.state,C.record(FB.state));
      return {original:original===JSON.stringify(C.record(FB.state).bindings),leader:C.leader(FB.state)===id,
        successor:FB.state.player.charId===heir.id,closed:C.record(FB.state).reason==='interrupted',
        retained:!!FB.state.chars[id] && FB.expeditionPreparation.referencesCharacter(FB.state,id),
        noEnrollment:!C.apply(FB.state,'form') && !FB.mobile.row(FB.state,C.rid),restore:C.restore()};
    });
    expect(result).toEqual({original:true,leader:true,successor:true,closed:true,retained:true,noEnrollment:true,restore:true});
  });
}

test('both complete imports validate purely and invalid original bindings fail detached validation',async function({page},info){
  await openGame(page,info);
  const result=await page.evaluate(function(examples){
    const before=JSON.stringify([FB.state,FBDATA]),rng=FB.getRngState(),uid=FB.getUidCounter(),
      registry=FB.stories.list().map(function(s){return s.id;}).join('|');
    const cases=Object.values(examples).map(function(example){
      const original=JSON.stringify(example),valid=FB.mods.validate(example),changes=[
        function(m,b,d){d.mobile.opening.principals.find(function(x){return x.person.kind==='realm_ruler';}).person.realmId='player';},
        function(m,b,d){d.mobile.command.landedCommandLink.homeGeneration++;},
        function(m,b,d){m.storyInstances[d.mobile.preparationId].provider.realmId=d.id;},
        function(m,b,d){m.storyInstances[d.mobile.preparationId].provisions.targetDays=0;}];
      return {valid:valid,pure:original===JSON.stringify(example),invalid:changes.map(function(change){
        const m=JSON.parse(JSON.stringify(example)),b=Object.values(m.bookmarks)[0].revisions.local_policy,d=b.realms.find(function(d){return d.mobile;});
        change(m,b,d);const bytes=JSON.stringify(m);return FB.mods.validate(m).length>0 && bytes===JSON.stringify(m);})};
    });
    return {cases:cases,pure:before===JSON.stringify([FB.state,FBDATA]) && rng===FB.getRngState() && uid===FB.getUidCounter() &&
      registry===FB.stories.list().map(function(s){return s.id;}).join('|')};
  },examples);
  expect(result).toEqual({cases:Array(2).fill({valid:[],pure:true,invalid:Array(4).fill(true)}),pure:true});
});

function lineageWorld() {
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
  return mod;
}

for(const formed of [false,true]) {
  test('supported sovereign court release retains '+(formed ? 'formed' : 'pending')+' original bindings with the actual public alias',async function({page},info){
    await importWorld(page,info,'dune',lineageWorld());await begin(page,'dune','picker');
    const result=await page.evaluate(function(formed){
      const C=sovereignCase,s=FB.state;s.realms.player.treasury.gold=500;
      const ready=!formed || C.apply(s,'grant') && C.apply(s,'authorize') && C.apply(s,'form'),
        original=JSON.stringify(C.record(s).bindings),cash=FB.treasuryPublicAccountSnapshot(s,'player').gold,
        released=FB.governmentSelection.releasePlayerCourt(s,s.chars[s.player.charId],true);
      FB.stories.get(C.id).day(s,C.record(s));
      return {ready:ready,released:released,alias:C.record(s).provider.realmId,
        publicAlias:s.start.publicTreasury.realmId,original:original===JSON.stringify(C.record(s).bindings),
        mobile:!formed || original===JSON.stringify(FB.mobile.row(s,C.rid).openingBindings),
        history:formed ? C.record(s).status==='formed' : C.record(s).reason==='interrupted',
        cash:cash===FB.treasuryPublicAccountSnapshot(s,'dune_gate').gold,restore:C.restore(),
        preserved:original===JSON.stringify(C.record(FB.state).bindings),again:!C.apply(FB.state,'form')};
    },formed);
    expect(result).toEqual({ready:true,released:'dune_gate',alias:'dune_gate',publicAlias:'dune_gate',original:true,
      mobile:true,history:true,cash:true,restore:true,preserved:true,again:true});
  });
}

test('legacy sovereign ruler provider keeps exact keys through normal late adoption and paid formation',async function({page},info){
  const mod=JSON.parse(JSON.stringify(examples.harbor));
  mod.storyInstances.harbor_preparation.provider={kind:'realm_ruler',realmId:'harbor_upland'};
  await importWorld(page,info,'harbor',mod);await begin(page,'harbor','code');
  const result=await page.evaluate(function(){
    const C=sovereignCase,s=FB.state,t=C.record(s),keys=Object.keys(t.provider).sort().join('|');s.realms.player.treasury.gold=500;
    const ready=C.apply(s,'grant') && C.apply(s,'authorize') && C.apply(s,'form');
    return {ready:ready,keys:keys,restore:C.restore(),original:C.record(FB.state).bindings.some(function(b){return b.person.realmId==='harbor_upland';})};
  });
  expect(result).toEqual({ready:true,keys:'characterId|generation|realmId',restore:true,original:true});
});

test('an original sovereign provider outside the opening actors survives canonical court death compaction',async function({page},info){
  const mod=JSON.parse(JSON.stringify(require('../fixtures/authoring/mobile-preparation-harbor.json')));
  mod.storyInstances.harbor_preparation.provider.realmId='harbor_upland';
  mod.bookmarks.harbor_world.realms.find(function(r){return r.mobile;}).mobile.origin='harbor_ridge';
  Object.values(mod.bookmarks.harbor_world.opening.actors).forEach(function(a){a.home='harbor_ridge';});
  await importWorld(page,info,'harbor',mod);
  await page.evaluate(function(){return new Promise(function(resolve,reject){
    FB.activateBookmark('harbor_world',null,function(error){if(error) reject(error);else resolve();});});});
  await page.evaluate(function(){const sc=FBDATA.startScenarios.find(function(sc){return sc.id==='harbor_household';});
    FB.game.pending={scenario:sc,bookmarkId:'harbor_world',provinceId:sc.fixedProvinceId,name:'Review',sex:'m',
      familyPreset:'standard',seed:'SOURCEPERSON'};FB.game.start();FB.game.setPaused(true);});
  const result=await page.evaluate(function(){
    const s=FB.state,C=sovereignCase,t=C.record(s),c=s.chars[t.provider.characterId],
      member=s.realms[t.provider.realmId].succession.members[c.royalLine.memberId],
      original=JSON.stringify(t),retained=FB.courtRecordRetained(s,c),
      outside=!Object.values(s.bookmarkSetup.actors).includes(c.id);
    FB.courtMemberDied(s,member,c);FB.stories.get(C.id).day(s,t);
    return {outside:outside,retained:retained,present:!!s.chars[c.id],closed:t.reason==='interrupted',
      identity:t.provider.characterId===c.id,party:JSON.stringify(JSON.parse(original).bindings)===JSON.stringify(t.bindings),
      source:JSON.stringify(JSON.parse(original).reserves)===JSON.stringify(t.released),restore:C.restore()};
  });
  expect(result).toEqual({outside:true,retained:true,present:true,closed:true,identity:true,party:true,source:true,restore:true});
});
