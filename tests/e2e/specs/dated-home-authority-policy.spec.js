'use strict';
const path=require('path');
const {test,expect}=require('../support/fixture');
const {openGame}=require('../support/game/navigation');
const {beginBookmark}=require('../support/game/bookmark-acceptance');
const {dependsOnRuntime}=require('../support/runtime-dependencies');
const examples={harbor:require('../fixtures/authoring/dated-home-authority-harbor.json'),
  dune:require('../fixtures/authoring/dated-home-authority-dune.json')};
dependsOnRuntime(__filename,['index.html','data/mobile_confederations.js','data/political_institutions.js',
  'data/eras.js','js/home_authority.js','js/mobile_command.js','js/mobile_confederations.js',
  'js/story_expedition_preparation.js','js/mobile_columns.js','js/governments.js','js/government_levy.js','js/government_continuity.js',
  'js/government_selection.js','js/authority.js','js/politics.js','js/world.js','js/bookmark_setup.js',
  'js/starts.js','js/main.js','js/model.js','js/treasury.js','js/market.js','js/population.js',
  'js/federates.js','js/armies.js','js/travel.js','js/stories.js','js/mods.js','js/save.js','js/save_v4.js']);

async function importWorld(page,info,prefix,modified) {
  await openGame(page,info);
  await page.evaluate(function () {FB.ui.showMods();});
  await page.locator('#modfile').setInputFiles(modified ? {name:'dated-home-policy.json',mimeType:'application/json',
    buffer:Buffer.from(JSON.stringify(modified))} : path.resolve(__dirname,'../fixtures/authoring/dated-home-authority-'+prefix+'.json'));
  await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded'}),page.locator('#mod-apply').click()]);
  await page.waitForFunction(function (prefix) {return window.FB && FB.game && FB.game.bootReady && FBDATA.bookmarks[prefix+'_world'];},prefix);
}
async function beginHome(page,prefix,revision,entry) {
  await page.evaluate(function (input) {
    FBDATA.bookmarks[input.prefix+'_world'].revision=input.revision;
    FB.startProgression.noteTier(4);
  },{prefix:prefix,revision:revision});
  const full=page.locator('#btn-choose-beginning');
  if(await full.isVisible()) await full.click();
  else await page.getByRole('button',{name:'New Game',exact:true}).click();
  const sc=examples[prefix].startScenarios[1];
  if(entry==='picker') {
    await page.locator('[data-bookmark="'+prefix+'_world"]').click();
    await page.locator('[data-scenario="'+sc.id+'"]').click();
  } else {
    await page.locator('#btn-bm-seed').click();
    await page.locator('#ng-seed').fill('DATEDHOME-'+prefix+'_world-'+sc.id+'-'+sc.fixedProvinceId+'-'+sc.sex+'-'+sc.characterName.replace(/ /g,'_')+'-standard');
    await page.locator('#ng-seed').press('Enter');
  }
  await expect(page.locator('#chargen:not(.hidden)')).toBeVisible();
  await expect(page.locator('#cg-name')).toHaveValue(sc.characterName);
  await page.getByRole('button',{name:'Begin Your Story',exact:true}).click();
  await page.getByRole('button',{name:'Begin',exact:true}).click();
  await page.evaluate(function () {FB.game.setPaused(true);});
}

for(const prefix of ['harbor','dune']) {
  for(const entry of ['picker','code']) {
    test(prefix+' '+entry+' adopts the original form and person with a scoped policy',async function({page},info) {
      await importWorld(page,info,prefix);
      await beginHome(page,prefix,'local_policy',entry);
      const result=await page.evaluate(function(prefix) {
        const s=FB.state,H=FB.homeAuthority,id=prefix+'_preparation',t=s.stories[id],actor=FB.bookmarkActor(s,prefix+'_home_ruler'),
          before=JSON.stringify(s),rng=FB.getRngState(),uid=FB.getUidCounter(),bm=FB.campaignBookmark(s),
          q=H.quote(s,'player','levy'),r=FB.governments.forRealm(s,'player');
        const pure=before===JSON.stringify(s) && rng===FB.getRngState() && uid===FB.getUidCounter();
        return {revision:s.start.revision,scenario:s.start.scenarioId,form:r.id,original:actor.id===s.player.charId,
          provider:t.provider.characterId===actor.id && t.provider.realmId==='player',
          allowed:q.allowed && q.characterId===actor.id,policy:H.policy(s,'player'),
          global:FBDATA.governmentForms.territorial.homeAuthority===undefined,
          equal:JSON.stringify(s.homeAuthorityPolicies.policies)===JSON.stringify(bm.homeAuthorityPolicies),
          separate:s.homeAuthorityPolicies.policies!==bm.homeAuthorityPolicies,
          noHost:!FB.mobile.row(s,FB.stories.get(id).declaration.realmId),
          noFreeMoney:FB.treasuryAvailable(s,FB.stories.get(id).declaration.realmId)===0,
          valid:H.validate(s),pure:pure};
      },prefix);
      expect(result).toEqual({revision:'local_policy',scenario:prefix+'_home_start',form:'territorial',original:true,
        provider:true,allowed:true,policy:{schema:1,presence:prefix==='harbor'?'capital':'territory',delegation:prefix==='harbor'},
        global:true,equal:true,separate:true,noHost:true,noFreeMoney:true,valid:true,pure:true});
    });

    test(prefix+' retained '+entry+' keeps the same scenario without policy commands or inferred deputies',async function({page},info) {
      await importWorld(page,info,prefix);
      await beginHome(page,prefix,'baseline',entry);
      const result=await page.evaluate(function(prefix) {
        const s=FB.state,H=FB.homeAuthority,before=JSON.stringify([s.chars,s.realms,s.authority,s.stories]),
          actor=FB.bookmarkActor(s,prefix+'_home_ruler');
        FBDATA.bookmarks[prefix+'_world'].revision='local_policy';
        const absent=s.homeAuthorityPolicies===undefined && H.policy(s,'player')===null,
          noCommand=Object.keys(s.authority.governments).every(function(id){return !s.authority.governments[id].mobile;});
        const save=FB.save.serialize();FB.save.restore(JSON.parse(save));FB.save.restore(JSON.parse(save));
        return {revision:FB.state.start.revision,scenario:FB.state.start.scenarioId,original:actor.id===FB.state.player.charId,
          form:FB.governments.forRealm(FB.state,'player').id,absent:absent,noCommand:noCommand,
          noDeputy:!FB.state.authority.appointments.some(function(a){return a.officeId===prefix+'_civil_deputy';}),noPreparation:!FB.state.stories[prefix+'_preparation'],
          unchanged:before===JSON.stringify([FB.state.chars,FB.state.realms,FB.state.authority,FB.state.stories]),
          freshPolicy:!!FB.bookmark(prefix+'_world').homeAuthorityPolicies,valid:H.validate(FB.state)};
      },prefix);
      expect(result).toEqual({revision:'baseline',scenario:prefix+'_home_start',original:true,form:'territorial',absent:true,
        noCommand:true,noDeputy:true,noPreparation:true,unchanged:true,freshPolicy:true,valid:true});
    });
  }

  test(prefix+' actual home decisions funding and once-only formation share the dated resolver',async function({page},info) {
    await importWorld(page,info,prefix);
    await beginHome(page,prefix,'local_policy','code');
    const result=await page.evaluate(function(prefix) {
      const s=FB.state,P=FB.expeditionPreparation,id=prefix+'_preparation',t=s.stories[id],rid=FB.stories.get(id).declaration.realmId,
        actor=s.player.charId,before={people:Object.keys(s.chars).sort().join('|'),population:JSON.stringify(s.population),
          land:JSON.stringify([s.owner,s.holder]),stock:FB.marketProvisionSnapshot(s,s.player.provinceId).stock};
      const grant=P.review(s,id,'grant',actor),publicBefore=FB.treasuryAvailable(s,'player'),
        paid=P.commit(s,grant),replay=P.commit(s,grant),authorized=P.commit(s,P.review(s,id,'authorize',actor)),
        form=P.review(s,id,'form',actor),formed=P.commit(s,form),repeat=P.commit(s,form);
      if(!formed) return {paid:paid,authorized:authorized,formed:formed,reason:form.reason};
      const row=FB.mobile.row(s,rid),host=FB.mobile.host(s,rid);
      return {paid:paid,replay:replay,authorized:authorized,formed:formed,repeat:repeat,
        charged:Math.abs(FB.treasuryAvailable(s,'player')-(publicBefore-grant.cost+form.foodCost))<1e-8,
        target:Math.abs(FB.treasuryAvailable(s,rid))<1e-8,
        stock:before.stock-FB.marketProvisionSnapshot(s,s.player.provinceId).stock===t.formed.food,
        food:row.food+host.mobileFood===t.formed.food,original:FB.mobile.leader(s,rid).id===actor,
        home:FB.mobile.landedHomeRealm(s,actor)==='player',formId:FB.governments.forRealm(s,'player').id,
        unchanged:before.people===Object.keys(s.chars).sort().join('|') && before.population===JSON.stringify(s.population) && before.land===JSON.stringify([s.owner,s.holder]),
        valid:FB.mobile.validate(s)};
    },prefix);
    expect(result).toEqual({paid:true,replay:false,authorized:true,formed:true,repeat:false,charged:true,target:true,stock:true,
      food:true,original:true,home:true,formId:'territorial',unchanged:true,valid:true});
  });

  test(prefix+' absence and exact delegation apply to player and NPC canonical decisions',async function({page},info) {
    await importWorld(page,info,prefix);
    await beginHome(page,prefix,'local_policy','code');
    const result=await page.evaluate(function(prefix) {
      const s=FB.state,H=FB.homeAuthority,home=s.player.provinceId,
        other=prefix==='harbor'?'harbor_gardens':'dune_flats',outside=prefix==='harbor'?'harbor_quay':'dune_well';
      s.player.travel={phase:'arrived',currentId:other,legDaysLeft:0};
      const local=H.quote(s,'player','levy').allowed;
      s.player.travel.currentId=outside;
      const absent=!H.quote(s,'player','levy').allowed,
        levy=!FB.governments.call(s,'player','levy','mayCall',{}),
        grant=H.quote(s,'player','grant'),appointment=H.quote(s,'player','appointment');
      if(grant.appointmentId) {
        const row=s.authority.appointments.find(function(a){return a.id===grant.appointmentId;});row.status='removed';
      }
      const revoked=!H.quote(s,'player','grant').allowed;
      s.player.travel=null;
      return {local:local,absent:absent,levy:levy,grant:grant.allowed,appointment:appointment.allowed,
        exact:prefix!=='harbor' || grant.characterId===FB.bookmarkActor(s,'harbor_civil_officer').id,
        revoked:revoked,returned:H.quote(s,'player','levy').allowed,home:s.player.provinceId===home};
    },prefix);
    expect(result).toEqual({local:prefix==='dune',absent:true,levy:true,grant:prefix==='harbor',appointment:prefix==='harbor',
      exact:true,revoked:true,returned:true,home:true});
  });

  test(prefix+' NPC preparation uses the same original policy without automating funds or replacing officeholders',async function({page},info) {
    await importWorld(page,info,prefix);
    await beginBookmark(page,info,prefix+'_world',prefix+'_household');
    const result=await page.evaluate(function(prefix) {
      const s=FB.state,id=prefix+'_preparation',story=FB.stories.get(id),t=s.stories[id],rid=t.provider.realmId,
        before=JSON.stringify([s.realms,s.player.gold,s.armies,s.chars,s.authority.appointments]);
      story.day(s,t);
      const consent=t.authorizedTurn===0,unchanged=before===JSON.stringify([s.realms,s.player.gold,s.armies,s.chars,s.authority.appointments]);
      const clone=JSON.parse(JSON.stringify(s));clone.chars[t.provider.characterId].dead=true;
      const denied=!FB.homeAuthority.quote(clone,rid,'levy').allowed;
      story.day(clone,clone.stories[id]);
      return {consent:consent,unchanged:unchanged,denied:denied,interrupted:clone.stories[id].reason==='interrupted',
        same:clone.stories[id].provider.characterId===t.provider.characterId,noHost:!FB.mobile.row(s,story.declaration.realmId)};
    },prefix);
    expect(result).toEqual({consent:true,unchanged:true,denied:true,interrupted:true,same:true,noHost:true});
  });

  test(prefix+' matching pending closed and formed saves retain exact policies without replay',async function({page},info) {
    await importWorld(page,info,prefix);
    await beginHome(page,prefix,'local_policy','code');
    const result=await page.evaluate(function(prefix) {
      const P=FB.expeditionPreparation,id=prefix+'_preparation';
      function facts(s) {return JSON.stringify([s.homeAuthorityPolicies,s.chars,s.authority,s.stories,s.realms,s.player.gold,s.population,s.market,s.armies]);}
      function restore() {const serialized=FB.save.serialize(),before=facts(FB.state),rng=FB.getRngState(),uid=FB.getUidCounter();
        FB.save.restore(JSON.parse(serialized));FB.save.restore(JSON.parse(serialized));
        return before===facts(FB.state) && rng===FB.getRngState() && uid===FB.getUidCounter();}
      const pending=restore(),pendingSave=FB.save.serialize(),closedState=FB.state,
        refused=P.commit(closedState,P.review(closedState,id,'refuse',closedState.player.charId)),closed=refused && restore();
      FB.save.restore(JSON.parse(pendingSave));
      const s=FB.state,actor=s.player.charId,
        grant=P.commit(s,P.review(s,id,'grant',actor)),consent=P.commit(s,P.review(s,id,'authorize',actor)),
        formed=P.commit(s,P.review(s,id,'form',actor)),saved=formed && restore();
      const t=JSON.parse(JSON.stringify(FB.state));t.realms.player.alive=false;
      const before=facts(t),rng=FB.getRngState(),uid=FB.getUidCounter(),historical=FB.homeAuthority.validate(t),
        pure=before===facts(t) && rng===FB.getRngState() && uid===FB.getUidCounter();
      return {pending:pending,closed:closed,grant:grant,consent:consent,formed:formed,saved:saved,historical:historical,pure:pure};
    },prefix);
    expect(result).toEqual({pending:true,closed:true,grant:true,consent:true,formed:true,saved:true,historical:true,pure:true});
  });
}

test('malformed compositions reject through detached ordinary JSON without publishing identities or policies',async function({page},info) {
  await openGame(page,info);
  const result=await page.evaluate(function(source) {
    const changes=[function(p,b){b.homeAuthorityPolicies=null;},function(p,b){b.homeAuthorityPolicies=[];},
      function(p,b){b.homeAuthorityPolicies={};},function(p,b){b.homeAuthorityPolicies.unknown_form=p;delete b.homeAuthorityPolicies.territorial;},
      function(p){p.schema=2;},function(p){p.presence='everywhere';},function(p){p.delegation='yes';},
      function(p){p.extra=true;},function(p){delete p.presence;},function(p,b){b.homeAuthorityPolicies.territorial=null;},
      function(p,b){delete b.homeAuthorityPolicies;},function(p,b){b.homeAuthorityPolicies.territorial=false;}];
    return changes.map(function(change){const d=JSON.parse(JSON.stringify(source)),b=d.bookmarks.harbor_world.revisions.local_policy;
      change(b.homeAuthorityPolicies.territorial,b);
      const before=JSON.stringify([FB.state,FBDATA]),rng=FB.getRngState(),uid=FB.getUidCounter();
      const errors=FB.mods.validate(d);
      return errors.length>0 && before===JSON.stringify([FB.state,FBDATA]) && rng===FB.getRngState() && uid===FB.getUidCounter();});
  },examples.harbor);
  expect(result).toEqual(Array(12).fill(true));
});

test('forged or deleted opted-in policy provenance fails detached adoption without policy or deputy repair',async function({page},info) {
  await importWorld(page,info,'harbor');await beginHome(page,'harbor','local_policy','code');
  const result=await page.evaluate(function() {
    const source=JSON.parse(FB.save.serialize()),changes=[function(s){delete s.homeAuthorityPolicies;},
      function(s){s.homeAuthorityPolicies=null;},function(s){s.homeAuthorityPolicies.schema=2;},
      function(s){s.homeAuthorityPolicies.extra=true;},function(s){delete s.homeAuthorityPolicies.policies;},
      function(s){s.homeAuthorityPolicies.policies={};},function(s){s.homeAuthorityPolicies.policies.territorial.presence='territory';},
      function(s){s.homeAuthorityPolicies.policies.territorial.delegation=false;},
      function(s){s.homeAuthorityPolicies.policies.territorial.extra=true;},
      function(s){s.homeAuthorityPolicies.policies.unknown_form={schema:1,presence:'capital',delegation:true};}];
    return changes.map(function(change){const data=JSON.parse(JSON.stringify(source));change(data.state);
      const before=JSON.stringify([FB.state,data.state,FBDATA]),rng=FB.getRngState(),uid=FB.getUidCounter();
      let rejected=false;try{FB.save.v4.migrate(data);}catch(error){rejected=true;}
      return rejected && before===JSON.stringify([FB.state,data.state,FBDATA]) && rng===FB.getRngState() && uid===FB.getUidCounter();});
  });
  expect(result).toEqual(Array(10).fill(true));
});

test('retained home adoption preserves a real liege and rejects unsolicited policy provenance',async function({page},info) {
  const source=JSON.parse(JSON.stringify(examples.harbor)),bm=source.bookmarks.harbor_world;
  bm.revision='baseline';
  bm.revisions.baseline.realms.find(function(r){return r.id==='harbor_upland';}).liege='harbor_commune';
  await importWorld(page,info,'harbor',source);await beginHome(page,'harbor','baseline','code');
  const result=await page.evaluate(function(){
    const s=FB.state,before=JSON.stringify(s),forged=JSON.parse(JSON.stringify(s));
    forged.homeAuthorityPolicies={schema:1,policies:{territorial:{schema:1,presence:'capital',delegation:true}}};
    let rejected=false;try{FB.homeAuthority.validate(forged);}catch(error){rejected=true;}
    return {liege:s.player.liege,realmLiege:s.realms.player.liege,owner:s.owner.harbor_ridge,holder:s.holder.harbor_ridge,
      form:FB.governments.forRealm(s,'player').id,absent:s.homeAuthorityPolicies===undefined,
      rejected:rejected,pure:before===JSON.stringify(s)};
  });
  expect(result).toEqual({liege:'harbor_commune',realmLiege:'harbor_commune',owner:'harbor_commune',holder:'player',
    form:'territorial',absent:true,rejected:true,pure:true});
});

test('the resolver retains form defaults and isolates other worlds and saved revisions',async function({page},info) {
  await importWorld(page,info,'harbor');await beginHome(page,'harbor','local_policy','code');
  const result=await page.evaluate(function(){
    const H=FB.homeAuthority,s=FB.state,global=JSON.stringify(FBDATA.governmentForms),before=JSON.stringify(s),
      rng=FB.getRngState(),uid=FB.getUidCounter(),fresh=FB.bookmark('harbor_world'),old=FB.bookmark('harbor_world','baseline'),
      unrelated=FB.bookmark('867'),declared={homeAuthorityPolicies:{territorial:{schema:1,presence:'territory',delegation:false}}};
    return {fresh:H.resolvePolicy(fresh,'territorial').presence,old:H.resolvePolicy(old,'territorial'),
      unrelated:H.resolvePolicy(unrelated,'territorial'),unknown:H.resolvePolicy(fresh,'missing_form'),
      fallback:H.resolvePolicy(declared,'hosted_following')===(FBDATA.governmentForms.hosted_following.homeAuthority || null),
      live:H.policy(s,'player').presence,pure:global===JSON.stringify(FBDATA.governmentForms) && before===JSON.stringify(s) && rng===FB.getRngState() && uid===FB.getUidCounter()};
  });
  expect(result).toEqual({fresh:'capital',old:null,unrelated:null,unknown:null,fallback:true,live:'capital',pure:true});
});

test('dated command policies preserve the opening-campaign compatibility boundary',async function({page},info) {
  await openGame(page,info);
  const source=require('../fixtures/authoring/mobile-opening-campaigns-harbor.json');
  const result=await page.evaluate(function(source) {
    const good=FB.mods.validate(source),d=JSON.parse(JSON.stringify(source));
    d.bookmarks.harbor_world.homeAuthorityPolicies={hosted_following:{schema:1,presence:'capital',delegation:false}};
    const before=JSON.stringify([FB.state,FBDATA]),rng=FB.getRngState(),uid=FB.getUidCounter(),errors=FB.mods.validate(d);
    return {good:good.length,bad:errors.length>0,pure:before===JSON.stringify([FB.state,FBDATA]) && rng===FB.getRngState() && uid===FB.getUidCounter()};
  },source);
  expect(result).toEqual({good:0,bad:true,pure:true});
});

test('policy provenance survives current form and office loss without restoring original eligibility',async function({page},info) {
  await importWorld(page,info,'dune');await beginHome(page,'dune','local_policy','code');
  const result=await page.evaluate(function() {
    const s=JSON.parse(JSON.stringify(FB.state)),H=FB.homeAuthority,original=JSON.stringify(s.homeAuthorityPolicies),
      before=JSON.stringify(s),rng=FB.getRngState(),uid=FB.getUidCounter();
    H.validate(s);
    const pure=before===JSON.stringify(s) && rng===FB.getRngState() && uid===FB.getUidCounter();
    const changed=FB.authoritySetGovernment(s,'player','regnum');
    const converted=changed && H.policy(s,'player')===H.resolvePolicy(FB.campaignBookmark(s),'regnum') && H.validate(s);
    s.realms.player.alive=false;
    return {pure:pure,converted:converted,dead:H.policy(s,'player')===null && H.validate(s),
      retained:original===JSON.stringify(s.homeAuthorityPolicies)};
  });
  expect(result).toEqual({pure:true,converted:true,dead:true,retained:true});
});
