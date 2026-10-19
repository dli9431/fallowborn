'use strict';
const path=require('path');
const {test,expect}=require('../support/fixture');
const {openGame}=require('../support/game/navigation');
const {beginBookmark}=require('../support/game/bookmark-acceptance');
const {dependsOnRuntime}=require('../support/runtime-dependencies');
const examples={harbor:require('../fixtures/authoring/local-formation-harbor.json'),
  upland:require('../fixtures/authoring/local-formation-upland.json')};
dependsOnRuntime(__filename,['index.html','data/mobile_confederations.js','data/political_institutions.js',
  'js/story_expedition_preparation.js','js/home_authority.js','js/authority.js','js/politics.js',
  'js/governments.js','js/government_continuity.js','js/government_selection.js','js/government_civic.js',
  'js/mobile_confederations.js','js/mobile_command.js','js/mobile_columns.js','js/mobile_guard.js','js/mobile_camps.js',
  'js/treasury.js','js/market.js','js/population.js','js/federates.js','js/armies.js','js/logistics.js',
  'js/bookmark_setup.js','js/stories.js','js/starts.js','js/mods.js','js/world.js','js/model.js',
  'js/travel.js','js/save.js','js/save_v4.js','js/main.js']);

async function begin(page,info,label,legacy) {
  await openGame(page,info);
  await page.evaluate(function () {FB.ui.showMods();});
  const name=(legacy ? 'mobile-preparation-' : 'local-formation-')+label+'.json';
  await page.locator('#modfile').setInputFiles(path.resolve(__dirname,'../fixtures/authoring',name));
  await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded'}),page.locator('#mod-apply').click()]);
  const prefix=label==='harbor' ? 'harbor' : 'dune';
  await page.waitForFunction(function (prefix) {return window.FB && FB.game && FB.game.bootReady && FBDATA.bookmarks[prefix+'_world'];},prefix);
  await beginBookmark(page,info,prefix+'_world',prefix+'_household');
  await page.evaluate(function (label) {
    window.formationCase={id:label+'_preparation',rid:label==='harbor' ? 'harbor_following' : 'dune_coalition',
      origin:label==='harbor' ? 'harbor_quay' : 'dune_well',remote:label==='harbor' ? 'harbor_ridge' : 'dune_pass',
      record:function(s){return s.stories[this.id];},
      leader:function(s){const t=this.record(s),d=FB.stories.get(this.id).declaration,
        realm=FB.campaignBookmark(s).realms.find(function(r){return r.id===d.realmId;});
        return t.bindings.find(function(b){return b.memberId===realm.mobile.opening.leaderMemberId;}).characterId;},
      authorize:function(s){return FB.expeditionPreparation.commit(s,FB.expeditionPreparation.review(s,this.id,'authorize',this.record(s).provider.characterId));},
      fund:function(s){
        for(let n=0;n<32;n++) {const q=FB.expeditionPreparation.review(s,this.id,'contribute',s.player.charId);
          if(q.cost===0) return true;
          if(!q.allowed || !FB.expeditionPreparation.commit(s,q)) return false;}
        return false;},
      form:function(s){return FB.expeditionPreparation.commit(s,FB.expeditionPreparation.review(s,this.id,'form',this.leader(s)));}
    };
  },label);
}

for(const label of ['harbor','upland']) {
  test(label+' ordinary JSON binds actual scoped authority away from the origin sovereign without a host or gift',async function({page},info){
    await begin(page,info,label);
    const result=await page.evaluate(function(){
      const s=FB.state,C=formationCase,P=FB.expeditionPreparation,t=C.record(s),story=FB.stories.get(C.id),
        sovereign=FB.realmRulerCharacterSnapshot(s,t.provider.realmId),before=JSON.stringify(s),rng=FB.getRngState(),uid=FB.getUidCounter(),
        q=P.review(s,C.id,'authorize',t.provider.characterId),give=P.review(s,C.id,'contribute',s.player.charId);
      return {different:FB.homeAuthority.location(s,sovereign)!==C.origin,local:q.allowed,
        deputy:t.provider.appointmentId!==null,household:s.player.charId!==C.leader(s) && story.choices(s,t).some(function(c){return c.id==='contribute';}),
        capped:give.cost>0 && give.cost<=story.declaration.householdContribution.maximum,
        unformed:t.status==='preparing' && !FB.mobile.row(s,C.rid) && !FB.mobile.host(s,C.rid),
        zero:FB.treasuryAvailable(s,C.rid)===0 && t.authorizedTurn===null,
        pure:before===JSON.stringify(s) && rng===FB.getRngState() && uid===FB.getUidCounter(),
        valid:FB.mobile.validate(s),definition:FB.validateBookmark(FB.campaignBookmark(s)).length};
    });
    expect(result).toEqual({different:true,local:true,deputy:label==='upland',household:true,capped:true,unformed:true,zero:true,pure:true,valid:true,definition:0});
  });

  test(label+' capped household gifts debit private money only and form once using finite paid market stock',async function({page},info){
    await begin(page,info,label);
    const result=await page.evaluate(function(){
      const s=FB.state,C=formationCase,P=FB.expeditionPreparation,t=C.record(s);s.player.gold=500;
      const before={private:s.player.gold,provider:FB.treasuryAvailable(s,t.provider.realmId),
        population:s.population.counties[C.origin].count,stock:FB.marketProvisionSnapshot(s,C.origin).stock,
        people:Object.keys(s.chars).sort().join('|'),rng:FB.getRngState(),uid:FB.getUidCounter(),land:JSON.stringify([s.owner,s.holder])},
        q=P.review(s,C.id,'contribute',s.player.charId),paid=P.commit(s,q),repeat=P.commit(s,q),
        separate=t.authorizedTurn===null && !FB.mobile.host(s,C.rid) && !P.review(s,C.id,'form',s.player.charId).allowed,
        privateOnly=s.player.gold===before.private-q.cost && FB.treasuryAvailable(s,C.rid)===q.cost &&
          FB.treasuryAvailable(s,t.provider.realmId)===before.provider,
        funded=C.fund(s),total=before.private-s.player.gold,authorized=C.authorize(s),
        ready=P.review(s,C.id,'form',C.leader(s)),formed=P.commit(s,ready),duplicate=P.commit(s,ready);
      if(!formed) return {paid:paid,funded:funded,authorized:authorized,formed:formed,reason:ready.reason};
      const r=FB.mobile.row(s,C.rid),host=FB.mobile.host(s,C.rid);
      return {paid:paid,repeat:repeat,separate:separate,privateOnly:privateOnly,funded:funded,authorized:authorized,formed:formed,duplicate:duplicate,
        exact:Math.abs(total-ready.cost)<1e-8 && Math.abs(total-FB.treasuryAvailable(s,C.rid)-ready.cost)<1e-8,
        seller:Math.abs(FB.treasuryAvailable(s,t.provider.realmId)-before.provider-ready.foodCost)<1e-8,
        food:before.stock-FB.marketProvisionSnapshot(s,C.origin).stock===t.formed.food && Math.abs(r.food+host.mobileFood-t.formed.food)<1e-8,
        population:before.population-s.population.counties[C.origin].count,
        people:FB.mobile.total(s,C.rid),single:s.armies.filter(function(a){return a.realm===C.rid;}).length===1,
        unchanged:before.people===Object.keys(s.chars).sort().join('|') && before.rng===FB.getRngState() &&
          before.uid===FB.getUidCounter() && before.land===JSON.stringify([s.owner,s.holder]),valid:FB.mobile.validate(s)};
    });
    expect(result).toEqual({paid:true,repeat:false,separate:true,privateOnly:true,funded:true,authorized:true,formed:true,duplicate:false,
      exact:true,seller:true,food:true,population:label==='upland' ? 1600 : 0,people:label==='upland' ? 1600 : 1400,single:true,unchanged:true,valid:true});
  });

  test(label+' stale donor presence purse journey and original authority cannot apply a reviewed gift',async function({page},info){
    await begin(page,info,label);
    const result=await page.evaluate(function(){
      const C=formationCase,P=FB.expeditionPreparation;FB.state.player.gold=500;
      const changes=[function(s,t){s.player.gold=0;},function(s,t){s.player.provinceId=C.remote;},
        function(s,t){s.player.travel={phase:'arrived',currentId:C.origin,legDaysLeft:0};},
        function(s,t){s.chars[s.player.charId].dead=true;},function(s,t){s.chars[s.player.charId].unfree=true;},
        function(s,t){s.chars[s.player.charId].born=s.date.year-12;},function(s,t){s.chars[t.provider.characterId].dead=true;},
        function(s,t){s.realms[t.provider.realmId].ruler.generation++;},function(s,t){s.holder[C.origin]=C.remote;},
        function(s,t){s.turn=t.endTurn;},function(s,t){s.treasuryAccounting=s.treasuryAccounting || {};
          s.treasuryAccounting.fundingRevision=(s.treasuryAccounting.fundingRevision || 0)+1;}];
      return changes.map(function(change){const s=JSON.parse(JSON.stringify(FB.state)),t=C.record(s),q=P.review(s,C.id,'contribute',s.player.charId);
        change(s,t);const before=JSON.stringify(s),rng=FB.getRngState(),uid=FB.getUidCounter();
        return q.allowed && !P.commit(s,q) && before===JSON.stringify(s) && rng===FB.getRngState() && uid===FB.getUidCounter();});
    });
    expect(result).toEqual(Array(11).fill(true));
  });

  test(label+' pending contributed and formed matching restores preserve authority and never debit or form again',async function({page},info){
    await begin(page,info,label);
    const result=await page.evaluate(function(){
      const C=formationCase,P=FB.expeditionPreparation;
      function facts(s){return JSON.stringify([C.record(s),s.player.gold,s.treasuryAccounting,s.realms[C.rid].treasury,
        s.population,s.market,s.armies,s.authority,s.chars]);}
      function restore(){const before=facts(FB.state),save=FB.save.serialize();FB.save.restore(JSON.parse(save));
        FB.save.restore(JSON.parse(save));return before===facts(FB.state);}
      const pending=restore();FB.state.player.gold=500;
      const gift=P.commit(FB.state,P.review(FB.state,C.id,'contribute',FB.state.player.charId)),contributed=restore(),
        okay=C.fund(FB.state) && C.authorize(FB.state) && C.form(FB.state),formed=okay && restore(),
        before=facts(FB.state),again=!C.form(FB.state);
      FB.mobile.initialize(FB.state,FB.campaignBookmark(FB.state).realms);FB.stories.start(FB.state);
      return {pending:pending,gift:gift,contributed:contributed,formed:formed,again:again,noReplay:before===facts(FB.state),valid:FB.mobile.validate(FB.state)};
    });
    expect(result).toEqual({pending:true,gift:true,contributed:true,formed:true,again:true,noReplay:true,valid:true});
  });

  test(label+' zero-funded wait refusal expiry and interrupted authority create no host or market purchase',async function({page},info){
    await begin(page,info,label);
    const result=await page.evaluate(function(){
      const C=formationCase,P=FB.expeditionPreparation,story=FB.stories.get(C.id);
      return ['wait','refuse','expired','interrupted'].map(function(action){
        const s=JSON.parse(JSON.stringify(FB.state)),t=C.record(s),before=JSON.stringify([s.population,s.market,s.realms,s.player.gold]);
        if(action==='wait') {C.authorize(s);P.commit(s,P.review(s,C.id,'wait',C.leader(s)));}
        else if(action==='refuse') P.commit(s,P.review(s,C.id,'refuse',t.provider.characterId));
        else {if(action==='expired') s.turn=t.endTurn;else s.chars[t.provider.characterId].dead=true;story.day(s,t);}
        const appropriate=action==='wait' ? t.status==='preparing' && !C.form(s) : t.status==='closed' &&
          t.reason===(action==='refuse' ? 'refused' : action);
        return appropriate && !FB.mobile.row(s,C.rid) && before===JSON.stringify([s.population,s.market,s.realms,s.player.gold]) && story.validate(t,s)===undefined;
      });
    });
    expect(result).toEqual(Array(4).fill(true));
  });

  test(label+' NPC policy shares the canonical consent review without contributing private or public money',async function({page},info){
    await begin(page,info,label);
    const result=await page.evaluate(function(){
      const s=FB.state,C=formationCase,t=C.record(s),P=FB.expeditionPreparation,story=FB.stories.get(C.id),
        before=JSON.stringify([s.player.gold,s.realms,s.market,s.population]),
        quoted=P.review(s,C.id,'authorize',t.provider.characterId),manual=JSON.parse(JSON.stringify(s));
      const okay=P.commit(manual,quoted);story.day(s,t);
      return {okay:okay,authorized:t.authorizedTurn!==null,
        same:story.declaration.acceptance!=='volunteers' || JSON.stringify(t)===JSON.stringify(C.record(manual)),
        noGift:before===JSON.stringify([s.player.gold,s.realms,s.market,s.population]),noHost:!FB.mobile.row(s,C.rid)};
    });
    expect(result).toEqual({okay:true,authorized:label==='harbor',same:true,noGift:true,noHost:true});
  });
}

test('detached imports reject invalid provider and contribution policies without mutation',async function({page},info){
  await openGame(page,info);
  const result=await page.evaluate(function(examples){
    const changes=[function(m,b,p){p.provider.kind='anyone';},function(m,b,p){p.provider.remote=true;},
      function(m,b,p){p.provider.actorId='absent_actor';},function(m,b,p){p.provider.realmId=p.realmId;},
      function(m,b,p){p.provider.actorId=Object.keys(b.opening.actors)[0];},
      function(m,b,p){delete m.governmentForms[b.realms.find(function(r){return r.id===p.provider.realmId;}).government].homeAuthority;},
      function(m,b,p){p.householdContribution.kind='tax';},function(m,b,p){p.householdContribution.maximum=0;},
      function(m,b,p){p.householdContribution.maximum=1000001;},function(m,b,p){p.householdContribution.maximum='7';},
      function(m,b,p){p.householdContribution.public=true;},function(m,b,p){delete p.householdContribution.maximum;},
      function(m,b,p){b.realms.find(function(r){return r.mobile;}).mobile.funding.privateContributions=false;},
      function(m,b,p){b.realms.find(function(r){return r.mobile;}).mobile.funding.maximum=1;}];
    const before=JSON.stringify([FB.state,FBDATA]),rng=FB.getRngState(),uid=FB.getUidCounter();
    const rejected=Object.keys(examples).map(function(label){return changes.map(function(change){
      const mod=JSON.parse(JSON.stringify(examples[label])),b=Object.values(mod.bookmarks)[0],p=mod.storyInstances[label+'_preparation'];
      change(mod,b,p);const bytes=JSON.stringify(mod);return FB.mods.validate(mod).length>0 && bytes===JSON.stringify(mod);});});
    const noDelegation=JSON.parse(JSON.stringify(examples.upland));noDelegation.governmentForms.dune_formation_court.homeAuthority.delegation=false;
    return {rejected:rejected,delegation:FB.mods.validate(noDelegation).length>0,
      pure:before===JSON.stringify([FB.state,FBDATA]) && rng===FB.getRngState() && uid===FB.getUidCounter()};
  },examples);
  expect(result).toEqual({rejected:[Array(14).fill(true),Array(14).fill(true)],delegation:true,pure:true});
});

test('incumbent and deputy public grant permissions remain distinct from levy consent and private gifts',async function({page},info){
  await begin(page,info,'harbor');
  const result=await page.evaluate(function(){
    const s=FB.state,C=formationCase,P=FB.expeditionPreparation,t=C.record(s),before={private:s.player.gold,
      source:FB.treasuryAvailable(s,t.provider.realmId),target:FB.treasuryAvailable(s,C.rid)},
      q=P.review(s,C.id,'grant',t.provider.characterId),paid=P.commit(s,q),replay=P.commit(s,q);
    return {paid:paid,replay:replay,private:s.player.gold===before.private,
      exact:Math.abs(before.source-FB.treasuryAvailable(s,t.provider.realmId)-q.cost)<1e-8 && FB.treasuryAvailable(s,C.rid)-before.target===q.cost,
      separate:t.authorizedTurn===null && !FB.mobile.host(s,C.rid)};
  });
  expect(result).toEqual({paid:true,replay:false,private:true,exact:true,separate:true});
});

test('a levy-only county deputy authorizes but never grants and revoked or replaced authority interrupts',async function({page},info){
  await begin(page,info,'upland');
  const result=await page.evaluate(function(){
    const s=FB.state,C=formationCase,P=FB.expeditionPreparation,t=C.record(s),story=FB.stories.get(C.id),
      q=P.review(s,C.id,'grant',t.provider.characterId),denied=!q.allowed,authorized=C.authorize(s);
    const scenarios=[function(s,t,a){a.status='removed';},function(s,t,a){a.endTurn=s.turn;},
      function(s,t,a){a.appointerGeneration++;},function(s,t,a){a.scope.id='dune_flats';},
      function(s,t,a){s.chars[t.provider.characterId].homeProvinceId='dune_flats';},
      function(s,t,a){s.chars[t.provider.characterId].imprisoned=true;},
      function(s,t,a){s.realms[t.provider.realmId].ruler.generation++;}];
    const rejected=scenarios.map(function(change){const v=JSON.parse(JSON.stringify(s)),r=C.record(v),
      a=v.authority.appointments.find(function(a){return a.id===r.provider.appointmentId;});
      const old=JSON.stringify(r.provider);change(v,r,a);const before=JSON.stringify(v),review=P.review(v,C.id,'authorize',r.provider.characterId),
        pure=before===JSON.stringify(v);story.day(v,r);
      return !review.allowed && pure && r.status==='closed' && r.reason==='interrupted' && old===JSON.stringify(r.provider) && !FB.mobile.row(v,C.rid);});
    return {denied:denied,authorized:authorized,rejected:rejected};
  });
  expect(result).toEqual({denied:true,authorized:true,rejected:Array(7).fill(true)});
});

test('canonical expiry and recall preserve original deputy provenance on restore without selecting a replacement',async function({page},info){
  await begin(page,info,'upland');
  const result=await page.evaluate(function(){
    const C=formationCase,story=FB.stories.get(C.id),s=FB.state,t=C.record(s);C.authorize(s);
    const a=s.authority.appointments.find(function(a){return a.id===t.provider.appointmentId;}),
      original=JSON.stringify(t.provider),removed=FB.authorityAppointmentTransition(s,a.id,'remove');
    story.day(s,t);const receipt=JSON.stringify(t),save=FB.save.serialize();FB.save.restore(JSON.parse(save));
    return {removed:removed,closed:C.record(FB.state).status==='closed',original:original===JSON.stringify(C.record(FB.state).provider),
      same:receipt===JSON.stringify(C.record(FB.state)),noHost:!FB.mobile.row(FB.state,C.rid)};
  });
  expect(result).toEqual({removed:true,closed:true,original:true,same:true,noHost:true});
});

test('a newer issuer may reaffirm the retained office without renewing the original formation consent',async function({page},info){
  await begin(page,info,'upland');
  const result=await page.evaluate(function(){
    const s=FB.state,C=formationCase,t=C.record(s),story=FB.stories.get(C.id),a=s.authority.appointments.find(function(a){return a.id===t.provider.appointmentId;});
    C.authorize(s);const original=JSON.stringify(t.provider);s.realms[t.provider.realmId].ruler.generation++;
    const contested=FB.authorityAppointmentTransition(s,a.id,'contest'),confirmed=FB.authorityAppointmentTransition(s,a.id,'confirm');
    story.day(s,t);const valid=story.validate(t,s)===undefined;
    return {contested:contested,confirmed:confirmed,interrupted:t.reason==='interrupted',valid:valid,
      original:original===JSON.stringify(t.provider),noHost:!FB.mobile.row(s,C.rid)};
  });
  expect(result).toEqual({contested:true,confirmed:true,interrupted:true,valid:true,original:true,noHost:true});
});

test('strict scoped-provider saves reject forged actor appointment and generation before adoption',async function({page},info){
  await begin(page,info,'upland');
  const result=await page.evaluate(function(){
    const C=formationCase,save=JSON.parse(FB.save.serialize()),before=JSON.stringify(FB.state),rng=FB.getRngState(),uid=FB.getUidCounter(),
      edits=[function(x){delete x.state.stories[C.id].provider.appointmentId;},function(x){x.state.stories[C.id].provider.appointmentId=null;},
        function(x){x.state.stories[C.id].provider.appointmentId='absent';},function(x){x.state.stories[C.id].provider.characterId=x.state.player.charId;},
        function(x){x.state.stories[C.id].provider.generation++;},function(x){x.state.stories[C.id].provider.extra=true;},
        function(x){delete x.state.stories[C.id];},function(x){x.state.stories[C.id].provider.characterId=null;x.state.stories[C.id].provider.appointmentId=null;}];
    return {rejected:edits.map(function(edit){const x=JSON.parse(JSON.stringify(save));edit(x);try{FB.save.restore(x);return false;}catch(error){return true;}}),
      pure:before===JSON.stringify(FB.state) && rng===FB.getRngState() && uid===FB.getUidCounter()};
  });
  expect(result).toEqual({rejected:Array(8).fill(true),pure:true});
});

test('depleted market rejects fully funded formation without creating provisions or losing gifts on closure',async function({page},info){
  await begin(page,info,'upland');
  const result=await page.evaluate(function(){
    const s=FB.state,C=formationCase,P=FB.expeditionPreparation;s.player.gold=500;const okay=C.fund(s) && C.authorize(s),
      money=FB.treasuryAvailable(s,C.rid),privateGold=s.player.gold;
    s.market.counties[C.origin][0][s.market.goods.indexOf('provisions')]=0;
    const before=JSON.stringify(s),q=P.review(s,C.id,'form',C.leader(s)),failed=!P.commit(s,q),pure=before===JSON.stringify(s),
      stop=P.commit(s,P.review(s,C.id,'stop',C.leader(s)));
    return {okay:okay,failed:failed,reason:q.reason,pure:pure,stop:stop,noHost:!FB.mobile.host(s,C.rid),
      retained:money===FB.treasuryAvailable(s,C.rid) && privateGold===s.player.gold};
  });
  expect(result).toEqual({okay:true,failed:true,reason:'provisions',pure:true,stop:true,noHost:true,retained:true});
});

for(const label of ['harbor','upland']) {
  test(label+' legacy declarations retain exact provider snapshots commander-only gifts and matching restore',async function({page},info){
    await begin(page,info,label,true);
    const result=await page.evaluate(function(){
      const C=formationCase,s=FB.state,t=C.record(s),P=FB.expeditionPreparation;
      s.player.gold=500;const denied=!P.review(s,C.id,'contribute',s.player.charId).allowed,
        legacy=Object.keys(t.provider).sort().join('|')==='characterId|generation|realmId',snapshot=JSON.stringify(t),save=FB.save.serialize();
      FB.save.restore(JSON.parse(save));
      return {denied:denied,legacy:legacy,same:snapshot===JSON.stringify(C.record(FB.state)),
        local:P.review(FB.state,C.id,'authorize',C.record(FB.state).provider.characterId).allowed};
    });
    expect(result).toEqual({denied:true,legacy:true,same:true,local:true});
  });
}

test('the local household contribution review names its exact private amount and preserves Back and Escape',async function({page},info){
  await begin(page,info,'harbor');
  await page.setViewportSize({width:390,height:844});
  await page.evaluate(function(){FB.state.player.gold=500;FB.ui.showStorySheet(formationCase.id);});
  await expect(page.locator('[data-story-choice="form"]')).toHaveCount(0);
  await page.locator('[data-story-choice="contribute"]').click();
  await expect(page.locator('#genmodal')).toContainText('Private contribution:');
  await expect(page.locator('#genmodal')).toContainText('no formation consent or refund');
  await page.locator('#genmodal').getByRole('button',{name:'Back',exact:true}).click();
  await expect(page.locator('[data-story-choice="contribute"]')).toBeVisible();
  await page.locator('[data-story-choice="contribute"]').click();
  await page.keyboard.press('Escape');
  await expect(page.locator('[data-story-choice="contribute"]')).toBeVisible();
  expect(await page.evaluate(function(){return FB.treasuryAvailable(FB.state,formationCase.rid);})).toBe(0);
});
