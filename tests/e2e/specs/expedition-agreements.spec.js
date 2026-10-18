'use strict';
const path=require('path');
const {test,expect}=require('../support/fixture');
const {openGame}=require('../support/game/navigation');
const {dependsOnRuntime}=require('../support/runtime-dependencies');
const examples={harbor:require('../fixtures/authoring/expedition-terms-harbor.json'),
  dune:require('../fixtures/authoring/expedition-terms-upland.json')};
dependsOnRuntime(__filename,['index.html','data/technology.js','data/mobile_confederations.js','data/units.js',
  'js/story_expedition_agreements.js','js/stories.js','js/bookmark_setup.js','js/mobile_confederations.js',
  'js/mobile_command.js','js/mobile_columns.js','js/expedition_programs.js','js/government_selection.js',
  'js/government_civic.js','js/civic_transactions.js','js/government_support.js','js/government_continuity.js','js/governments.js',
  'js/authority.js','js/treasury.js','js/market.js','js/armies.js','js/federates.js','js/politics.js','js/justice.js',
  'js/population.js','js/settlement.js','js/world.js','js/starts.js','js/model.js','js/mods.js',
  'js/save.js','js/save_v4.js','js/main.js','js/ui_misc.js','js/ui_panels.js','js/i18n.js']);

async function start(page,info,prefix,modified) {
  await openGame(page,info);
  await page.evaluate(function () {FB.ui.showMods();});
  await page.locator('#modfile').setInputFiles(modified ? {name:'terms.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(modified))} :
    path.resolve(__dirname,'../fixtures/authoring/expedition-terms-'+
    (prefix==='harbor' ? 'harbor' : 'upland')+'.json'));
  await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded'}),page.locator('#mod-apply').click()]);
  await page.waitForFunction(function (p) {return window.FB && FB.game && FB.game.bootReady && FBDATA.bookmarks[p+'_world'];},prefix);
  const sc=examples[prefix].startScenarios.find(function (s) {return s.id===prefix+'_command_start';});
  const code='TERMS-'+prefix+'_world-'+sc.id+'-'+sc.fixedProvinceId+'-'+sc.sex+'-'+
    sc.characterName.replace(/-/g,'').replace(/ /g,'_')+'-standard';
  if (await page.locator('#btn-choose-beginning').isVisible()) await page.locator('#btn-choose-beginning').click();
  else await page.getByRole('button',{name:'New Game',exact:true}).click();
  await page.locator('#btn-bm-seed').click();await page.locator('#ng-seed').fill(code);await page.locator('#ng-seed').press('Enter');
  await expect(page.locator('#chargen:not(.hidden)')).toBeVisible();
  await expect(page.locator('#cg-name')).toHaveValue(sc.characterName);
  await page.getByRole('button',{name:'Begin Your Story',exact:true}).click();
  await page.getByRole('button',{name:'Begin',exact:true}).click();
  await page.evaluate(function () {FB.game.setPaused(true);});
}

for (const prefix of ['harbor','dune']) {
  test(prefix+' imports distinct finite records reviews with pure quotes, bilateral consent and exact restore',async function ({page},info) {
    await start(page,info,prefix);
    const result=await page.evaluate(function (p) {
      const s=FB.state,E=FB.expeditionAgreements,id=p+'_terms',r=s.stories[id],m=FB.stories.get(id),d=m.declaration;
      s.turn=d.firstTurn;s.date=FB.dateAtTurn(s,s.turn);
      const resources=JSON.stringify([s.owner,s.holder,s.authority,s.armies,s.player.gold,s.chars]),
        bytes=JSON.stringify(s),rng=FB.getRngState(),uid=FB.getUidCounter();
      const q=E.review(s,id,'acknowledge',r.partyIds[0]),q2=E.review(s,id,'acknowledge',r.partyIds[1]);
      m.validate(r,s);FB.stories.status(s,id);
      const pure=bytes===JSON.stringify(s) && rng===FB.getRngState() && uid===FB.getUidCounter();
      const replay=JSON.parse(JSON.stringify(s)),a=E.commit(s,id,q);
      const same=E.commit(replay,id,E.review(replay,id,'acknowledge',r.partyIds[0])) && JSON.stringify(replay)===JSON.stringify(s);
      const pending=r.status==='pending',stale=!E.commit(s,id,q2),repeat=!E.commit(s,id,q);
      m.day(s,r);m.validate(r,s);
      const finished=JSON.stringify(r),unpaid=resources===JSON.stringify([s.owner,s.holder,s.authority,s.armies,s.player.gold,s.chars]);
      FB.save.restore(JSON.parse(FB.save.serialize()));
      return {pure:pure,a:a,same:same,pending:pending,stale:stale,repeat:repeat,reviewed:r.status==='reviewed',
        unpaid:unpaid,restored:finished===JSON.stringify(FB.state.stories[id]),
        scope:d.countyIds.length,kind:d.kind,tech:FBDATA.techImpactReviews.features.expedition_records_reviews.mode};
    },prefix);
    expect(result).toEqual({pure:true,a:true,same:true,pending:true,stale:true,repeat:true,reviewed:true,unpaid:true,restored:true,
      scope:prefix==='harbor' ? 0 : 2,kind:prefix==='harbor' ? 'limited_assurance' : 'restoration_review',tech:'none'});
  });
}

test('ordinary detached validation rejects unsupported obligations and unresolved scope without mutation',async function ({page},info) {
  await openGame(page,info);
  const result=await page.evaluate(function (source) {
    const edits=[function(d){d.mode='enforced';},function(d){delete d.mode;},function(d){d.kind='homage';},
      function(d){d.payment=20;},function(d){d.operations=['transfer'];},function(d){d.accessAgreementId='invented';},
      function(d){d.firstTurn=-1;},function(d){d.endTurn=1441;},function(d){d.endTurn=d.firstTurn;},
      function(d){d.actor.realmId='absent';},function(d){d.source.realmId=d.actor.realmId;},
      function(d){d.countyIds=['absent'];},function(d){d.countyIds=['dune_pass','dune_pass'];},
      function(d){d.countyIds=[];},function(d){d.countyIds=Array(17).fill('dune_pass');},
      function(d){d.source.kind='external_authority';},function(d){d.actor.extra=true;},
      function(d){d.name=' ';},function(d,x){
        const bm=x.bookmarks.dune_world;
        for(let i=0;i<4;i++){const n='extra_terms_'+i;x.storyInstances[n]=Object.assign({},d,{id:n});bm.stories.push(n);}
      }];
    return edits.map(function (edit) {
      const x=JSON.parse(JSON.stringify(source));edit(x.storyInstances.dune_terms,x);
      const bytes=JSON.stringify(x),data=JSON.stringify(FBDATA),state=JSON.stringify(FB.state),rng=FB.getRngState(),uid=FB.getUidCounter();
      return FB.mods.validate(x).length>0 && bytes===JSON.stringify(x) && data===JSON.stringify(FBDATA) &&
        state===JSON.stringify(FB.state) && rng===FB.getRngState() && uid===FB.getUidCounter();
    });
  },examples.dune);
  expect(result).toEqual(Array(19).fill(true));
});

test('a pending review restores without AI acknowledgment or payment and cannot lose its attachment',async function ({page},info) {
  await start(page,info,'harbor');
  const result=await page.evaluate(function () {
    const s=FB.state,id='harbor_terms',before=JSON.stringify(s.stories[id]),
      resources=JSON.stringify([s.owner,s.holder,s.authority,s.armies,s.player.gold]);
    FB.save.restore(JSON.parse(FB.save.serialize()));
    const pending=before===JSON.stringify(FB.state.stories[id]),preserved=resources===JSON.stringify([
      FB.state.owner,FB.state.holder,FB.state.authority,FB.state.armies,FB.state.player.gold]);
    const missing=JSON.parse(FB.save.serialize());delete missing.state.stories[id];
    const bytes=JSON.stringify(FB.state),rng=FB.getRngState(),uid=FB.getUidCounter();let rejected=false;
    try {FB.save.restore(missing);} catch(error) {rejected=true;}
    return {pending:pending,preserved:preserved,rejected:rejected,
      pure:bytes===JSON.stringify(FB.state) && rng===FB.getRngState() && uid===FB.getUidCounter()};
  });
  expect(result).toEqual({pending:true,preserved:true,rejected:true,pure:true});
});

test('campaigns without the optional declaration restore without creating a review',async function ({page},info) {
  const input=JSON.parse(JSON.stringify(examples.harbor));
  delete input.storyInstances.harbor_terms;input.bookmarks.harbor_world.stories=[];
  await start(page,info,'harbor',input);
  const absent=await page.evaluate(function () {
    FB.save.restore(JSON.parse(FB.save.serialize()));return !FB.state.stories.harbor_terms;
  });
  expect(absent).toBe(true);
});

test('unsupported assurances and claims cannot become active promises or transfer rights',async function ({page},info) {
  await start(page,info,'dune');
  const result=await page.evaluate(function () {
    const s=FB.state,id='dune_terms',r=s.stories[id],m=FB.stories.get(id),E=FB.expeditionAgreements;
    s.turn=5;s.date=FB.dateAtTurn(s,5);
    const rid=m.declaration.actor.realmId,before=JSON.stringify([s.owner,s.holder,s.authority,s.armies,s.player.gold,s.player.piety]);
    E.commit(s,id,E.review(s,id,'acknowledge',r.partyIds[0]));m.day(s,r);
    const actor={kind:'realm',id:rid};
    return {reviewed:r.status==='reviewed',unchanged:before===JSON.stringify([s.owner,s.holder,s.authority,s.armies,s.player.gold,s.player.piety]),
      noGrant:!FB.mobile.review(s,{realmId:rid,action:'land',terms:{countyId:'dune_pass'},actor:actor}).review.allowed,
      noPassage:!FB.mobile.passage(s,rid,'dune_pass',true),noPatron:FB.mobile.migration(s,rid).patronRealmId===null,
      noFulfilled:Object.keys(r).indexOf('fulfillmentReceipt')<0,
      disclosure:FB.stories.status(s,id).lines.join(' ').includes('does not prove a lawful capture')};
  });
  expect(result).toEqual({reviewed:true,unchanged:true,noGrant:true,noPassage:true,noPatron:true,noFulfilled:true,disclosure:true});
});

test('refusal, party loss, command suspension and finite expiry close only their own review',async function ({page},info) {
  await start(page,info,'harbor');
  const result=await page.evaluate(function () {
    const base=FB.state,E=FB.expeditionAgreements,id='harbor_terms',m=FB.stories.get(id);
    return ['decline','death','custody','generation','command','expiry'].map(function (kind) {
      const s=JSON.parse(JSON.stringify(base)),r=s.stories[id],rid=m.declaration.actor.realmId;
      const q=E.review(s,id,'acknowledge',r.partyIds[0]);
      if(kind==='decline') E.commit(s,id,E.review(s,id,'decline',r.partyIds[1]));
      if(kind==='death') s.chars[r.partyIds[1]].dead=true;
      if(kind==='custody') s.chars[r.partyIds[1]].captive=true;
      if(kind==='generation') s.realms[m.declaration.source.realmId].ruler.generation=r.generations[1]+1;
      if(kind==='command') FB.mobile.row(s,rid).command.status='recalled';
      if(kind==='expiry') {s.turn=m.declaration.endTurn;s.date=FB.dateAtTurn(s,s.turn);}
      const before=JSON.stringify([s.owner,s.holder,s.authority,s.armies,s.player.gold]),stale=!E.commit(s,id,q);
      m.day(s,r);m.validate(r,s);const once=JSON.stringify(r);m.day(s,r);
      return {status:r.status,stale:stale,once:once===JSON.stringify(r),preserved:before===JSON.stringify([
        s.owner,s.holder,s.authority,s.armies,s.player.gold])};
    });
  });
  expect(result).toEqual(['declined','interrupted','interrupted','interrupted','interrupted','expired'].map(function (status) {
    return {status:status,stale:true,once:true,preserved:true};
  }));
});

test('scope changes invalidate restitution reviews, and an unrelated person cannot acknowledge',async function ({page},info) {
  await start(page,info,'dune');
  const result=await page.evaluate(function () {
    const s=FB.state,E=FB.expeditionAgreements,id='dune_terms',r=s.stories[id];
    const early=!E.review(s,id,'acknowledge',r.partyIds[0]).allowed;s.turn=5;s.date=FB.dateAtTurn(s,5);
    const q=E.review(s,id,'acknowledge',r.partyIds[0]);s.owner.dune_pass='dune_oasis';
    const before=JSON.stringify(s),rng=FB.getRngState(),uid=FB.getUidCounter();
    const stale=!E.commit(s,id,q),outsider=!E.review(s,id,'acknowledge',FB.bookmarkActor(s,'dune_deputy').id).allowed;
    return {early:early,stale:stale,outsider:outsider,pure:before===JSON.stringify(s) && rng===FB.getRngState() && uid===FB.getUidCounter()};
  });
  expect(result).toEqual({early:true,stale:true,outsider:true,pure:true});
});

test('separate canonical access charges once and survives a declined records review and restore',async function ({page},info) {
  await start(page,info,'dune');
  const result=await page.evaluate(function () {
    const s=FB.state,M=FB.mobile,E=FB.expeditionAgreements,rid='dune_coalition',partner='dune_gate',r=M.row(s,rid);
    const gold=FB.treasuryAvailable(s,rid),credit=FB.treasuryAvailable(s,partner);
    const offer=M.review(s,{realmId:rid,action:'offer',actor:{kind:'realm',id:rid},terms:{kind:'access',partnerId:partner,
      countyIds:['dune_pass'],capacity:100,allowRecruit:false,price:7,duration:20}});
    const offered=M.commit(s,offer),a=r.agreements.find(function (a) {return a.kind==='access';});
    const q=M.review(s,{realmId:rid,action:'accept',terms:{agreementId:a.id},actor:{kind:'realm',id:partner}});
    const changed=JSON.parse(JSON.stringify(s));changed.holder.dune_pass='dune_oasis';
    const stale=!M.commit(changed,q),accepted=M.commit(s,q),repeat=!M.commit(s,q);
    s.turn=5;s.date=FB.dateAtTurn(s,5);
    const declined=E.commit(s,'dune_terms',E.review(s,'dune_terms','decline',s.player.charId));
    const paid=FB.treasuryAvailable(s,rid),received=FB.treasuryAvailable(s,partner),record=JSON.stringify(r.agreements);
    FB.save.restore(JSON.parse(FB.save.serialize()));
    return {offered:offered,stale:stale,accepted:accepted,repeat:repeat,declined:declined,debit:gold-paid,credit:received-credit,
      noReplay:paid===FB.treasuryAvailable(FB.state,rid) && received===FB.treasuryAvailable(FB.state,partner),
      preserved:record===JSON.stringify(M.row(FB.state,rid).agreements),passage:M.passage(FB.state,rid,'dune_pass',true)};
  });
  expect(result).toEqual({offered:true,stale:true,accepted:true,repeat:true,declined:true,debit:7,credit:7,noReplay:true,preserved:true,passage:true});
});

test('market purchases require local access, finite stock and actual public payment',async function ({page},info) {
  await start(page,info,'dune');
  const result=await page.evaluate(function () {
    const s=FB.state,M=FB.mobile,rid='dune_coalition',r=M.row(s,rid),partner='dune_gate';
    M.commit(s,M.review(s,{realmId:rid,action:'offer',actor:{kind:'realm',id:rid},terms:{kind:'access',partnerId:partner,
      countyIds:['dune_pass'],capacity:100,allowRecruit:false,price:7,duration:20}}));
    const a=r.agreements.find(function (a) {return a.kind==='access';});
    M.commit(s,M.review(s,{realmId:rid,action:'accept',terms:{agreementId:a.id},actor:{kind:'realm',id:partner}}));
    const request={realmId:rid,action:'trade',terms:{countyId:'dune_pass',count:1,direction:'buy'},actor:{kind:'realm',id:rid}};
    const remote=!M.review(s,request).review.allowed;
    // Stage actual camp presence; purchase behavior, not a travel journey, is under test.
    M.migration(s,rid).at='dune_pass';
    const stock=FB.marketProvisionSnapshot(s,'dune_pass'),food=r.food,gold=FB.treasuryAvailable(s,rid),privateGold=s.player.gold;
    const tooMuch=JSON.parse(JSON.stringify(request));tooMuch.terms.count=stock.stock+1;
    const bounded=!M.review(s,tooMuch).review.allowed,q=M.review(s,request),bought=M.commit(s,q);
    return {remote:remote,bounded:bounded,bought:bought,food:r.food-food,stock:stock.stock-FB.marketProvisionSnapshot(s,'dune_pass').stock,
      paid:Math.abs(gold-FB.treasuryAvailable(s,rid)-q.review.cost)<0.000001,positive:q.review.cost>0,private:s.player.gold===privateGold};
  });
  expect(result).toEqual({remote:true,bounded:true,bought:true,food:1,stock:1,paid:true,positive:true,private:true});
});

test('malformed review saves reject before adopting state or RNG',async function ({page},info) {
  await start(page,info,'harbor');
  const result=await page.evaluate(function () {
    const id='harbor_terms',saved=JSON.parse(FB.save.serialize());
    const edits=[function(r){r.version=2;},function(r){r.extra=true;},function(r){delete r.reason;},
      function(r){r.partyIds[0]='absent';},function(r){r.partyIds[0]=r.partyIds[1];},function(r){r.generations[0]=999999;},
      function(r){r.status='active';},function(r){r.status='fulfilled';},function(r){r.decisions[0]='approve';},
      function(r){r.decisionTurns[0]=1;},function(r){r.revision=1;},function(r){r.openedTurn=999999;},
      function(r){r.endedTurn=0;},function(r){r.partyIds=null;},function(r){r.decisions=[null];}];
    return edits.map(function (edit) {
      const x=JSON.parse(JSON.stringify(saved));edit(x.state.stories[id]);
      const bytes=JSON.stringify(FB.state),rng=FB.getRngState(),uid=FB.getUidCounter();let rejected=false;
      try {FB.save.restore(x);} catch(error) {rejected=true;}
      return rejected && bytes===JSON.stringify(FB.state) && rng===FB.getRngState() && uid===FB.getUidCounter();
    });
  });
  expect(result).toEqual(Array(15).fill(true));
});

test('matching saved content cannot silently change the review term or claim scope',async function ({page},info) {
  await start(page,info,'dune');
  const result=await page.evaluate(function (input) {
    const saved=JSON.parse(FB.save.serialize());input.storyInstances.dune_terms.endTurn++;
    if (FB.mods.validate(input).length) return false;
    FB.mods.apply(input);
    const bytes=JSON.stringify(FB.state),rng=FB.getRngState(),uid=FB.getUidCounter();let rejected=false;
    try {FB.save.restore(saved);} catch(error) {rejected=/different mod/.test(error.message);}
    return rejected && bytes===JSON.stringify(FB.state) && rng===FB.getRngState() && uid===FB.getUidCounter();
  },examples.dune);
  expect(result).toBe(true);
});

for (const viewport of [{width:1280,height:800},{width:390,height:844}]) {
  test('records-only disclosure and modal return at '+viewport.width+' pixels',async function ({page},info) {
    await page.setViewportSize(viewport);await start(page,info,'harbor');
    await page.evaluate(function () {FB.ui.showStorySheet('harbor_terms');});
    await page.locator('[data-story-choice="acknowledge"]').click();
    await expect(page.locator('#gm-body')).toContainText('creates no enforceable promise');
    await expect(page.locator('#gm-body')).toContainText('Payer: none');
    await page.keyboard.press('Escape');
    await expect(page.locator('[data-story-choice="acknowledge"]')).toBeVisible();
    expect(await page.evaluate(function () {return FB.state.stories.harbor_terms.decisions;})).toEqual([null,null]);
  });
}
