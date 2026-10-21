'use strict';
const path=require('path');
const {test,expect}=require('../support/fixture');
const {openGame}=require('../support/game/navigation');
const {beginBookmark}=require('../support/game/bookmark-acceptance');
const {dependsOnRuntime}=require('../support/runtime-dependencies');
const examples={harbor:require('../fixtures/authoring/passage-policy-harbor.json'),
  dune:require('../fixtures/authoring/passage-policy-dune.json')};
dependsOnRuntime(__filename,['index.html','data/mobile_confederations.js','data/political_institutions.js','data/technology.js',
  'js/expedition_programs.js','js/mobile_confederations.js','js/mobile_command.js','js/mobile_columns.js',
  'js/story_expedition_program.js','js/home_authority.js','js/world.js','js/model.js','js/authority.js',
  'js/governments.js','js/government_ai.js','js/government_administration.js','js/government_continuity.js',
  'js/government_civic.js','js/government_support.js','js/civic_transactions.js','js/modifiers.js',
  'js/government_selection.js','js/government_lineage.js','js/bookmark_setup.js',
  'js/starts.js','js/main.js','js/stories.js','js/armies.js','js/wars.js','js/federates.js','js/population.js',
  'js/market.js','js/treasury.js','js/logistics.js','js/save.js','js/save_v4.js','js/mods.js']);

async function start(page,info,prefix,options) {
  options=options || {};
  await openGame(page,info);
  await page.evaluate(function () {FB.ui.showMods();});
  await page.locator('#modfile').setInputFiles(options.mod ? {name:'passage-policy.json',mimeType:'application/json',
    buffer:Buffer.from(JSON.stringify(options.mod))} : path.resolve(__dirname,'../fixtures/authoring/passage-policy-'+prefix+'.json'));
  await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded'}),page.locator('#mod-apply').click()]);
  await page.waitForFunction(function (prefix) {return window.FB && FB.game && FB.game.bootReady && FBDATA.bookmarks[prefix+'_world'];},prefix);
  if (options.baseline) await page.evaluate(function (prefix) {FBDATA.bookmarks[prefix+'_world'].revision='baseline';},prefix);
  if (options.outside) {
    await page.evaluate(function () {FB.startProgression.noteTier(7);});
    const full=page.locator('#btn-choose-beginning');
    if (await full.isVisible()) await full.click();
    else await page.getByRole('button',{name:'New Game',exact:true}).click();
    await page.locator('#btn-bm-seed').click();
    await page.locator('#ng-seed').fill('OUTSIDE-dune_world-dune_outside_start-dune_pass-f-Kavi_Aran-standard');
    await page.locator('#ng-seed').press('Enter');
    await expect(page.locator('#chargen:not(.hidden)')).toBeVisible();
    await page.getByRole('button',{name:'Begin Your Story',exact:true}).click();
    await page.getByRole('button',{name:'Begin',exact:true}).click();
    await page.evaluate(function () {FB.game.setPaused(true);});
  } else await beginBookmark(page,info,prefix+'_world',prefix+'_household');
  await page.evaluate(function () {
    const d=FB.campaignBookmark(FB.state).realms.find(function (d) {return d.mobile;});
    window.passageCase={rid:d.id,
      negotiate:function (s) {
        for (let i=0;i<9 && FB.mobile.row(s,this.rid).expeditionProgram.steps[0].status==='pending';i++) {
          FB.expeditionPrograms.day(s);s.turn++;
        }
        return FB.mobile.row(s,this.rid).expeditionProgram.steps[0].status==='complete';
      },
      cancel:function (s) {return FB.mobile.commit(s,FB.expeditionPrograms.reviewControl(s,{realmId:this.rid,
        action:'cancel',stepId:null,actor:{kind:'character',id:FB.mobile.row(s,this.rid).leaderId}}));}};
  });
}

for (const prefix of ['harbor','dune']) {
  test(prefix+' ordinary import validates both revisions and leaves existing government AI and offices intact',async function ({page},info) {
    await start(page,info,prefix);
    const r=await page.evaluate(function (prefix) {
      const s=FB.state,E=FB.expeditionPrograms,C=passageCase,b=FBDATA.bookmarks[prefix+'_world'],
        before=JSON.stringify([s,FBDATA]),rng=FB.getRngState(),uid=FB.getUidCounter(),q=E.review(s,C.rid,'permission'),
        outside=q.operation.request.terms.partnerId,form=FB.governments.forRealm(s,outside);
      const faults=FB.validateBookmark(b),revisions=FB.bookmarkRevisions(b.id).map(function (b) {return FB.validateBookmark(b,true);});
      return {faults:faults,revisions:revisions,pure:before===JSON.stringify([s,FBDATA]) && rng===FB.getRngState() && uid===FB.getUidCounter(),
        allowed:q.allowed,form:form.id,defaultNegotiates:form.use.ai.canNegotiate(s,outside,{}),
        offices:prefix!=='harbor' || form.use.ai.offices===FB.publicAdministrationAI,
        direct:s.holder[q.operation.request.terms.countyIds[0]]===outside,
        policy:q.operation.review.accessOrigin.passagePolicy,schema:q.operation.review.accessOrigin.schema,
        marker:s.localPassagePolicies.policies!==FB.campaignBookmark(s).localPassagePolicies,
        noAccess:!FB.mobile.provisioningAccess(s,C.rid,q.operation.request.terms.countyIds[0]),
        tech:FBDATA.techImpactReviews.features.expedition_local_passage_policy.mode};
    },prefix);
    expect(r).toEqual({faults:[],revisions:[[],[]],pure:true,allowed:true,
      form:prefix==='harbor' ? 'administrative_monarchy' : 'territorial',defaultNegotiates:prefix!=='harbor',
      offices:true,direct:true,policy:{formId:prefix==='harbor' ? 'administrative_monarchy' : 'territorial',response:'accept'},
      schema:2,marker:true,noAccess:true,tech:'none'});
  });

  test(prefix+' daily offer and separate response pay exactly once and retain original receipts',async function ({page},info) {
    await start(page,info,prefix);
    const r=await page.evaluate(function () {
      const s=FB.state,E=FB.expeditionPrograms,M=FB.mobile,C=passageCase,row=M.row(s,C.rid),money=FB.treasuryAvailable(s,C.rid),
        land=JSON.stringify([s.owner,s.holder]),people=M.total(s,C.rid),balances={};
      Object.keys(s.realms).forEach(function (id) {balances[id]=FB.treasuryAvailable(s,id);});
      E.day(s);const a=row.agreements[0],offered=a.status==='offered' && !M.provisioningAccess(s,C.rid,a.countyIds[0]);
      const before=JSON.stringify(s);E.day(s);const bounded=before===JSON.stringify(s);s.turn++;
      const complete=C.negotiate(s),paid=row.agreements.reduce(function (n,a) {return n+a.price;},0),credits={};
      row.agreements.forEach(function (a) {credits[a.partnerId]=(credits[a.partnerId] || 0)+a.price;});
      return {offered:offered,bounded:bounded,complete:complete,count:row.agreements.length,
        accepted:row.agreements.every(function (a) {return a.status==='active' && a.accessOrigin.schema===2 &&
          a.accessOrigin.chain[0].personId===FB.realmRulerCharacterSnapshot(s,a.partnerId).id && M.provisioningAccess(s,C.rid,a.countyIds[0]);}),
        paid:Math.abs(money-FB.treasuryAvailable(s,C.rid)-paid)<1e-8,
        credited:Object.keys(credits).every(function (id) {return Math.abs(FB.treasuryAvailable(s,id)-balances[id]-credits[id])<1e-8;}),
        conserved:people===M.total(s,C.rid) && land===JSON.stringify([s.owner,s.holder]),valid:M.validate(s)};
    });
    expect(r).toEqual({offered:true,bounded:true,complete:true,count:prefix==='harbor' ? 3 : 2,
      accepted:true,paid:true,credited:true,conserved:true,valid:true});
  });

  test(prefix+' complete physical path preflight uses actual access and distinct field and camp positions',async function ({page},info) {
    await start(page,info,prefix);
    const r=await page.evaluate(function (prefix) {
      const s=FB.state,C=passageCase,E=FB.expeditionPrograms,M=FB.mobile,complete=C.negotiate(s),row=M.row(s,C.rid);
      const q=E.review(s,C.rid,'approach'),a=M.host(s,C.rid),origin=a.at,camp=M.migration(s,C.rid).at,
        path=q.operation.review.path,covered=path.every(function (pid) {return M.passage(s,C.rid,pid,prefix==='harbor');}),
        receipts=row.agreements.length,issued=E.commit(s,q),target=a.goal;
      for (let i=0;i<25 && a.at!==target;i++) {s.turn++;FB.mobileDay(s);FB.armyTick(s);FB.federateDay(s);}
      return {complete:complete,covered:covered,bounds:receipts<=12 && path.length<=16,issued:issued,arrived:a.at===target && target!==origin,
        camp:prefix==='harbor' ? M.migration(s,C.rid).at===target : M.migration(s,C.rid).at===camp,valid:M.validate(s)};
    },prefix);
    expect(r).toEqual({complete:true,covered:true,bounds:true,
      issued:true,arrived:true,camp:true,valid:true});
  });

  test(prefix+' pending offered accepted in-flight cancelled and ended saves restore without dispatch or replay',async function ({page},info) {
    await start(page,info,prefix);
    const r=await page.evaluate(function () {
      const C=passageCase,M=FB.mobile,E=FB.expeditionPrograms;
      function roundtrip() {
        const s=FB.state,bytes=JSON.stringify([s.localPassagePolicies,M.row(s,C.rid),s.armies,s.owner,s.holder,s.market,s.population,s.treasury]),
          rng=FB.getRngState(),uid=FB.getUidCounter();
        for (let i=0;i<2;i++) FB.save.restore(JSON.parse(FB.save.serialize()));
        const n=FB.state;
        return bytes===JSON.stringify([n.localPassagePolicies,M.row(n,C.rid),n.armies,n.owner,n.holder,n.market,n.population,n.treasury]) &&
          rng===FB.getRngState() && uid===FB.getUidCounter() && M.validate(n);
      }
      const pending=roundtrip();E.day(FB.state);const offered=roundtrip();FB.state.turn++;
      E.day(FB.state);const accepted=roundtrip();FB.state.turn++;
      const complete=C.negotiate(FB.state),issued=E.commit(FB.state,E.review(FB.state,C.rid,'approach')),flight=roundtrip(),
        cancelled=C.cancel(FB.state),terminal=roundtrip();
      FB.state.turn=60;FB.mobileDay(FB.state);
      const ended=M.row(FB.state,C.rid).agreements.every(function (a) {return a.status==='ended';}) && roundtrip();
      return {pending:pending,offered:offered,accepted:accepted,complete:complete,issued:issued,flight:flight,
        cancelled:cancelled,terminal:terminal,ended:ended};
    });
    expect(r).toEqual({pending:true,offered:true,accepted:true,complete:true,issued:true,flight:true,cancelled:true,terminal:true,ended:true});
  });

  test(prefix+' retained revision and unstamped legacy saves acquire no policy provenance',async function ({page},info) {
    await start(page,info,prefix,{baseline:true});
    const r=await page.evaluate(function (prefix) {
      const C=passageCase,E=FB.expeditionPrograms,M=FB.mobile,s=FB.state;
      E.day(s);FBDATA.bookmarks[prefix+'_world'].revision='passage_policy';
      const origin=JSON.stringify(M.row(s,C.rid).agreements[0].accessOrigin),absent=s.localPassagePolicies===undefined;
      let save=JSON.parse(FB.save.serialize());delete save.state.start.revision;
      for (let i=0;i<2;i++) {FB.save.restore(save);save=JSON.parse(FB.save.serialize());}
      const n=FB.state;
      return {absent:absent && n.localPassagePolicies===undefined,
        original:origin===JSON.stringify(M.row(n,C.rid).agreements[0].accessOrigin),schema:M.row(n,C.rid).agreements[0].accessOrigin.schema,
        savedPolicy:FB.campaignBookmark(n).localPassagePolicies===undefined,
        freshPolicy:!!FB.bookmark(prefix+'_world').localPassagePolicies,valid:M.validate(n)};
    },prefix);
    expect(r).toEqual({absent:true,original:true,schema:1,savedPolicy:true,freshPolicy:true,valid:true});
  });

  for (const response of ['absent','decline']) {
    test(prefix+' imported '+response+' policy preserves refusal or the original default',async function ({page},info) {
      const mod=JSON.parse(JSON.stringify(examples[prefix])),revision=mod.bookmarks[prefix+'_world'].revisions.passage_policy,
        form=prefix==='harbor' ? 'administrative_monarchy' : 'territorial';
      if (response==='absent') delete revision.localPassagePolicies;
      else revision.localPassagePolicies[form].response='decline';
      await start(page,info,prefix,{mod:mod});
      const r=await page.evaluate(function () {
        const s=FB.state,C=passageCase,E=FB.expeditionPrograms,M=FB.mobile,money=FB.treasuryAvailable(s,C.rid);
        E.day(s);s.turn++;E.day(s);const a=M.row(s,C.rid).agreements[0];
        return {status:a.status,paid:money-FB.treasuryAvailable(s,C.rid),price:a.price,
          permission:M.provisioningAccess(s,C.rid,a.countyIds[0]),count:M.row(s,C.rid).agreements.length,valid:M.validate(s)};
      });
      const accepts=prefix==='dune' && response==='absent';
      expect(r).toEqual({status:accepts ? 'active' : 'ended',paid:accepts ? r.price : 0,price:r.price,
        permission:accepts,count:1,valid:true});
    });
  }
}

test('malformed policies reject complete ordinary candidates purely at raw and effective bookmark boundaries',async function ({page},info) {
  await openGame(page,info);
  const r=await page.evaluate(function (source) {
    const changes=[null,false,[],{}, {unknown:{schema:1,response:'accept'}},
      {territorial:{schema:2,response:'accept'}},{territorial:{schema:1,response:true}},
      {territorial:{schema:1,response:'maybe'}},{territorial:{schema:1,response:'accept',capacity:100}},
      {territorial:{response:'accept'}}];
    return changes.map(function (policy) {
      const mod=JSON.parse(JSON.stringify(source));mod.bookmarks.dune_world.revisions.passage_policy.localPassagePolicies=policy;
      const bytes=JSON.stringify([mod,FBDATA,FB.state]),rng=FB.getRngState(),uid=FB.getUidCounter(),errors=FB.mods.validate(mod);
      return errors.length>0 && bytes===JSON.stringify([mod,FBDATA,FB.state]) && rng===FB.getRngState() && uid===FB.getUidCounter();
    });
  },examples.dune);
  expect(r).toEqual(Array(10).fill(true));
});

test('a willing public court still sells only finite stock through the ordinary paid supply review',async function ({page},info) {
  await start(page,info,'harbor');
  const r=await page.evaluate(function () {
    const s=FB.state,C=passageCase,E=FB.expeditionPrograms,M=FB.mobile;C.negotiate(s);
    const row=M.row(s,C.rid),full=!E.review(s,C.rid,'stock').allowed,route=E.review(s,C.rid,'approach').allowed;
    row.food=0;
    const q=E.review(s,C.rid,'stock'),money=FB.treasuryAvailable(s,C.rid),at=M.migration(s,C.rid).at,
      stock=FB.marketProvisionSnapshot(s,at).stock,quantity=q.operation.request.terms.count,cost=q.operation.review.cost,
      bought=E.commit(s,q);
    return {full:full,route:route,bought:bought,finite:quantity>0 && quantity<=stock,
      paid:Math.abs(money-FB.treasuryAvailable(s,C.rid)-cost)<1e-8,
      withdrawn:Math.abs(stock-FB.marketProvisionSnapshot(s,at).stock-quantity)<1e-8,
      food:row.food===quantity,replay:!E.commit(s,q),valid:M.validate(s)};
  });
  expect(r).toEqual({full:true,route:true,bought:true,finite:true,paid:true,withdrawn:true,food:true,replay:true,valid:true});
});

test('an unconfigured form in an opted-in world keeps its default response and exact null policy history',async function ({page},info) {
  const mod=JSON.parse(JSON.stringify(examples.dune));
  delete mod.bookmarks.dune_world.revisions.passage_policy.localPassagePolicies.territorial;
  await start(page,info,'dune',{mod:mod});
  const r=await page.evaluate(function () {
    const s=FB.state,C=passageCase,E=FB.expeditionPrograms,M=FB.mobile;E.day(s);s.turn++;E.day(s);
    const a=M.row(s,C.rid).agreements[0],before=JSON.stringify(a),policy=a.accessOrigin.passagePolicy;
    FB.save.restore(JSON.parse(FB.save.serialize()));
    return {policy:policy,schema:a.accessOrigin.schema,status:a.status,
      original:before===JSON.stringify(M.row(FB.state,C.rid).agreements[0]),valid:M.validate(FB.state)};
  });
  expect(r).toEqual({policy:{formId:'territorial',response:null},schema:2,status:'active',original:true,valid:true});
});

test('original policy-map key order is immaterial on matching restore',async function ({page},info) {
  await start(page,info,'dune');
  const r=await page.evaluate(function () {
    const s=FB.state,p=s.localPassagePolicies.policies;
    s.localPassagePolicies.policies={dune_council:p.dune_council,territorial:p.territorial};
    FB.save.restore(JSON.parse(FB.save.serialize()));
    return FB.expeditionPrograms.validatePassagePolicies(FB.state);
  });
  expect(r).toBe(true);
});

test('stale policy form authority occupation capacity money and manual facts reject without payment',async function ({page},info) {
  await start(page,info,'harbor');
  const r=await page.evaluate(function () {
    const C=passageCase,E=FB.expeditionPrograms,M=FB.mobile,base=JSON.parse(JSON.stringify(FB.state));E.day(base);base.turn++;
    const changes=[function (s,a) {s.authority.governments[a.partnerId].formId='territorial';},
      function (s,a) {s.holder[a.countyIds[0]]='harbor_commune';},
      function (s,a) {s.realms[a.partnerId].succession.rulerGeneration++;},
      function (s,a) {s.chars[a.accessOrigin.chain[0].personId].captive=true;},
      function (s,a) {s.population.counties[a.countyIds[0]].count=1;},
      function (s) {FB.treasurySpend(s,C.rid,FB.treasuryAvailable(s,C.rid));},
      function (s) {M.host(s,C.rid).holdManual=1;},
      function (s,a) {const w=FB.registerOrdinaryWar(s,'harbor_commune',{
        enemy:s.owner[a.countyIds[0]],target:a.countyIds[0],legacy:false,occupations:{}});
        w.occupations[a.countyIds[0]]={occupied:true,progress:100,homeRealm:s.owner[a.countyIds[0]]};}];
    const rejected=changes.map(function (change) {
      const s=JSON.parse(JSON.stringify(base)),a=M.row(s,C.rid).agreements[0],q=E.review(s,C.rid,'permission');
      change(s,a);const before=JSON.stringify(s);
      return q.allowed && !E.commit(s,q) && !E.review(s,C.rid,'permission').allowed && before===JSON.stringify(s);
    });
    const q=E.review(base,C.rid,'permission'),policy=FBDATA.bookmarks.harbor_world.revisions.passage_policy.localPassagePolicies.administrative_monarchy;
    policy.response='decline';const before=JSON.stringify(base),policyRejected=!E.commit(base,q) && before===JSON.stringify(base);
    policy.response='accept';return {rejected:rejected,policy:policyRejected};
  });
  expect(r).toEqual({rejected:Array(8).fill(true),policy:true});
});

test('a willing civic policy still requires the actual independent treaty constituency',async function ({page},info) {
  const mod=JSON.parse(JSON.stringify(examples.dune)),b=mod.bookmarks.dune_world;
  b.revisions.passage_policy.localPassagePolicies.dune_council.response='accept';
  b.provinces.find(function (p) {return p.id==='dune_flats';}).realm='dune_oasis';
  await start(page,info,'dune',{mod:mod});
  const r=await page.evaluate(function () {
    const s=FB.state,C=passageCase,E=FB.expeditionPrograms,M=FB.mobile;
    E.day(s);s.turn++;
    const a=M.row(s,C.rid).agreements[0],support=FB.governments.support;
    support.profile(s,a.partnerId).members.forEach(function (member) {member.support=0;});
    support.row(s,a.partnerId).scopes.forEach(function (pid) {FB.setCountySupport(s,pid,-100);});
    const before=JSON.stringify(s),q=E.review(s,C.rid,'permission');
    return {court:a.partnerId,action:q.operation.request.action,consent:q.operation.review.partnerConsent.allowed,
      denied:!q.allowed,pure:before===JSON.stringify(s),offered:a.status==='offered',valid:M.validate(s)};
  });
  expect(r).toEqual({court:'dune_oasis',action:'accept',consent:false,denied:true,pure:true,offered:true,valid:true});
});

for (const decision of ['accept','decline']) {
  test('actual outside player chooses '+decision+' even with a refusing NPC policy',async function ({page},info) {
    const mod=JSON.parse(JSON.stringify(examples.dune));
    mod.bookmarks.dune_world.revisions.passage_policy.localPassagePolicies.territorial.response='decline';
    await start(page,info,'dune',{mod:mod,outside:true});
    const r=await page.evaluate(function (decision) {
      const s=FB.state,C=passageCase,E=FB.expeditionPrograms,M=FB.mobile;E.day(s);s.turn++;E.day(s);
      const a=M.row(s,C.rid).agreements[0],money=FB.treasuryAvailable(s,C.rid),pending=a.status==='offered',
        original=a.partnerId==='player' && a.accessOrigin.chain[0].personId===s.player.charId,
        q=M.review(s,{realmId:C.rid,action:decision,terms:{agreementId:a.id},actor:{kind:'character',id:s.player.charId}}),
        done=M.commit(s,q),repeat=!M.commit(s,q);
      return {pending:pending,original:original,done:done,repeat:repeat,status:a.status,
        charged:Math.abs(money-FB.treasuryAvailable(s,C.rid)-(decision==='accept' ? a.price : 0))<1e-8,
        permission:M.provisioningAccess(s,C.rid,a.countyIds[0]),valid:M.validate(s)};
    },decision);
    expect(r).toEqual({pending:true,original:true,done:true,repeat:true,status:decision==='accept' ? 'active' : 'ended',
      charged:true,permission:decision==='accept',valid:true});
  });
}

test('changed policy or outside form stops only the owned route and never rewrites original history',async function ({page},info) {
  await start(page,info,'harbor');
  const r=await page.evaluate(function () {
    const C=passageCase,E=FB.expeditionPrograms,M=FB.mobile,base=JSON.parse(JSON.stringify(FB.state));C.negotiate(base);
    return ['policy','form','death'].map(function (kind) {
      const s=JSON.parse(JSON.stringify(base)),row=M.row(s,C.rid),a=M.host(s,C.rid),q=E.review(s,C.rid,'approach'),
        issued=E.commit(s,q),at=a.at,origins=JSON.stringify(row.agreements.map(function (v) {return v.accessOrigin;})),
        policy=FBDATA.bookmarks.harbor_world.revisions.passage_policy.localPassagePolicies.administrative_monarchy;
      if (kind==='policy') policy.response='decline';
      else if (kind==='form') s.authority.governments[row.agreements[0].partnerId].formId='territorial';
      else s.chars[row.agreements[0].accessOrigin.chain[0].personId].dead=true;
      E.reconcile(s);
      const stopped=issued && a.at===at && !a.path.length && !a.moveLeft && !a.goal,
        denied=row.agreements.every(function (v) {return !M.provisioningAccess(s,C.rid,v.countyIds[0]);}),
        unchanged=origins===JSON.stringify(row.agreements.map(function (v) {return v.accessOrigin;}));
      policy.response='accept';return stopped && denied && unchanged;
    });
  });
  expect(r).toEqual([true,true,true]);
});

test('policy provenance rejects missing forged downgraded and undeclared records before restore repair',async function ({page},info) {
  await start(page,info,'harbor');
  const r=await page.evaluate(function () {
    const C=passageCase,E=FB.expeditionPrograms,M=FB.mobile,base=JSON.parse(JSON.stringify(FB.state));E.day(base);
    const changes=[function (s) {delete s.localPassagePolicies;},function (s) {s.localPassagePolicies.schema=2;},
      function (s) {s.localPassagePolicies.extra=true;},function (s) {s.localPassagePolicies.policies={};},
      function (s) {s.localPassagePolicies.policies.administrative_monarchy.response='decline';},
      function (s) {delete M.row(s,C.rid).agreements[0].accessOrigin.passagePolicy;},
      function (s) {M.row(s,C.rid).agreements[0].accessOrigin.schema=1;},
      function (s) {M.row(s,C.rid).agreements[0].accessOrigin.passagePolicy.response=null;},
      function (s) {M.row(s,C.rid).agreements[0].accessOrigin.passagePolicy.extra=true;}];
    const rejected=changes.map(function (change) {
      const s=JSON.parse(JSON.stringify(base));change(s);const bytes=JSON.stringify(s);
      let denied=false;try {FB.save.v4.validatePlatform(s);} catch(error) {denied=true;}
      return denied && bytes===JSON.stringify(s);
    });
    const retained=JSON.parse(JSON.stringify(base));retained.start.revision='baseline';
    let undeclared=false;try {E.validatePassagePolicies(retained);} catch(error) {undeclared=true;}
    return {rejected:rejected,undeclared:undeclared};
  });
  expect(r).toEqual({rejected:Array(9).fill(true),undeclared:true});
});

test('bounded dispatch replay retains deterministic original policies and canonical responses',async function ({page},info) {
  await start(page,info,'dune');
  const r=await page.evaluate(function () {
    const C=passageCase,base=JSON.parse(JSON.stringify(FB.state)),rng=FB.getRngState(),uid=FB.getUidCounter();
    function replay() {const s=JSON.parse(JSON.stringify(base));C.negotiate(s);return JSON.stringify(s);}
    return {same:replay()===replay(),rng:rng===FB.getRngState(),uid:uid===FB.getUidCounter()};
  });
  expect(r).toEqual({same:true,rng:true,uid:true});
});
