'use strict';
const {test,expect}=require('../support/fixture');
const {openGame}=require('../support/game/navigation');
const {beginBookmark}=require('../support/game/bookmark-acceptance');
const {dependsOnRuntime}=require('../support/runtime-dependencies');
const examples={harbor:require('../fixtures/authoring/preparation-review-harbor.json'),
  upland:require('../fixtures/authoring/preparation-review-upland.json')};
dependsOnRuntime(__filename,['index.html','data/technology.js','data/mobile_confederations.js','data/units.js',
  'js/story_expedition_agreements.js','js/story_expedition_preparation.js','js/stories.js','js/bookmark_setup.js',
  'js/mobile_confederations.js','js/mobile_command.js','js/mobile_columns.js','js/expedition_programs.js',
  'js/home_authority.js','js/treasury.js','js/market.js','js/population.js','js/federates.js',
  'js/governments.js','js/government_civic.js','js/government_selection.js','js/civic_transactions.js',
  'js/authority.js','js/world.js','js/starts.js','js/model.js','js/armies.js','js/mods.js',
  'js/save.js','js/save_v4.js','js/main.js','js/ui_misc.js','js/ui_panels.js','js/i18n.js']);

async function begin(page,info,label,modified) {
  await openGame(page,info);
  await page.evaluate(function () {FB.ui.showMods();});
  await page.locator('#modfile').setInputFiles({name:'formation-review.json',mimeType:'application/json',
    buffer:Buffer.from(JSON.stringify(modified || examples[label]))});
  await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded'}),page.locator('#mod-apply').click()]);
  const prefix=label==='harbor' ? 'harbor' : 'dune';
  await page.waitForFunction(function (p) {return window.FB && FB.game && FB.game.bootReady && FBDATA.bookmarks[p+'_world'];},prefix);
  await beginBookmark(page,info,prefix+'_world',prefix+'_household');
  await page.evaluate(function (label) {
    FB.game.setPaused(true);
    window.reviewCase={id:label+'_formation_review',preparationId:label+'_preparation',
      module:function () {return FB.stories.get(this.id);},
      turn:function (s,n) {s.turn=n;s.date=FB.dateAtTurn(s,n);},
      form:function (s) {
        const P=FB.expeditionPreparation,t=s.stories[this.preparationId],
          rid=FB.stories.get(this.preparationId).declaration.realmId,
          def=FB.campaignBookmark(s).realms.find(function (r) {return r.id===rid;}),
          leader=t.bindings.find(function (b) {return b.memberId===def.mobile.opening.leaderMemberId;}).characterId;
        return P.commit(s,P.review(s,this.preparationId,'authorize',t.provider.characterId)) &&
          P.commit(s,P.review(s,this.preparationId,'grant',t.provider.characterId)) &&
          P.commit(s,P.review(s,this.preparationId,'form',leader));
      }
    };
  },label);
}

for (const label of ['harbor','upland']) {
  test(label+' ordinary import waits without a host, then reviews the one actual formation',async function ({page},info) {
    await begin(page,info,label);
    const result=await page.evaluate(function () {
      const C=reviewCase,E=FB.expeditionAgreements,s=FB.state,m=C.module(),initial=s.stories[C.id],
        prep=s.stories[C.preparationId],before=JSON.stringify(s),rng=FB.getRngState(),uid=FB.getUidCounter(),
        q=E.review(s,C.id,'acknowledge',initial.partyIds[0]);
      m.validate(initial,s);FB.stories.status(s,C.id);
      const pure=before===JSON.stringify(s) && rng===FB.getRngState() && uid===FB.getUidCounter(),
        waiting=initial.status==='waiting' && initial.formation===null && !q.allowed && q.reason==='formation',
        noHost=!FB.mobile.row(s,m.declaration.actor.realmId),original=initial.preparation.leaderId===initial.partyIds[0];
      C.turn(s,2);m.day(s,initial);
      const stillWaiting=initial.status==='waiting',formed=C.form(s),r=s.stories[C.id];
      if (!formed) return {formed:formed};
      m.day(s,r);m.validate(r,s);
      const pending=r.status==='pending' && r.revision===1 && r.formation.turn===2 &&
        r.formation.leaderId===r.partyIds[0] && r.generations[0]===r.formation.generation,
        early=!E.review(s,C.id,'acknowledge',r.partyIds[0]).allowed;
      C.turn(s,m.declaration.firstTurn);
      const resources=JSON.stringify([s.owner,s.holder,s.armies,s.population,s.realms,s.player.gold]),
        first=E.review(s,C.id,'acknowledge',r.partyIds[0]),other=E.review(s,C.id,'acknowledge',r.partyIds[1]),
        accepted=E.commit(s,C.id,first),stale=!E.commit(s,C.id,other),repeat=!E.commit(s,C.id,first);
      m.day(s,r);m.validate(r,s);
      const terminal=JSON.stringify(r);m.day(s,r);
      return {pure:pure,waiting:waiting,noHost:noHost,original:original,stillWaiting:stillWaiting,formed:formed,
        pending:pending,early:early,accepted:accepted,stale:stale,repeat:repeat,reviewed:r.status==='reviewed',
        once:terminal===JSON.stringify(r),unpaid:resources===JSON.stringify([s.owner,s.holder,s.armies,s.population,s.realms,s.player.gold]),
        revision:r.revision,acceptance:FB.stories.get(C.preparationId).declaration.acceptance,
        tech:FBDATA.techImpactReviews.features.expedition_records_reviews.mode};
    });
    expect(result).toEqual({pure:true,waiting:true,noHost:true,original:true,stillWaiting:true,formed:true,
      pending:true,early:true,accepted:true,stale:true,repeat:true,reviewed:true,once:true,unpaid:true,revision:3,
      acceptance:label==='harbor' ? 'volunteers' : 'closed',tech:'none'});
  });

  test(label+' matching waiting, unobserved formation, pending and terminal saves never advance the review',async function ({page},info) {
    await begin(page,info,label);
    const result=await page.evaluate(function () {
      const C=reviewCase;
      function roundTrip() {
        const before=JSON.stringify([FB.state.stories,FB.state.armies,FB.state.population,FB.state.realms,FB.state.chars]);
        FB.save.restore(JSON.parse(FB.save.serialize()));
        return before===JSON.stringify([FB.state.stories,FB.state.armies,FB.state.population,FB.state.realms,FB.state.chars]);
      }
      const waiting=roundTrip();C.turn(FB.state,2);const formed=C.form(FB.state),unobserved=roundTrip(),
        stillWaiting=FB.state.stories[C.id].status==='waiting';
      C.module().day(FB.state,FB.state.stories[C.id]);const pending=roundTrip();
      C.turn(FB.state,C.module().declaration.firstTurn);C.module().day(FB.state,FB.state.stories[C.id]);
      const reviewed=FB.state.stories[C.id].status==='reviewed',terminal=roundTrip();
      return {waiting:waiting,formed:formed,unobserved:unobserved,stillWaiting:stillWaiting,pending:pending,reviewed:reviewed,terminal:terminal};
    });
    expect(result).toEqual({waiting:true,formed:true,unobserved:true,stillWaiting:true,pending:true,reviewed:true,terminal:true});
  });
}

test('detached imports reject malformed, foreign and unordered preparation bindings without mutation',async function ({page},info) {
  await openGame(page,info);
  const result=await page.evaluate(function (source) {
    const edits=[function(d){d.waitForFormation=null;},function(d){d.waitForFormation={};},
      function(d){d.waitForFormation.extra=true;},function(d){d.waitForFormation.preparationId='absent';},
      function(d){d.waitForFormation.commandId='foreign_command';},function(d){d.requires=[];},
      function(d){delete d.registrationAfter;},function(d){d.registrationAfter='absent';},
      function(d,x){x.storyInstances.harbor_preparation.realmId='harbor_commune';},
      function(d,x){x.bookmarks.harbor_world.stories=x.bookmarks.harbor_world.stories.filter(function(id){return id!=='harbor_preparation';});}];
    return edits.map(function (edit) {
      const x=JSON.parse(JSON.stringify(source));edit(x.storyInstances.harbor_formation_review,x);
      const input=JSON.stringify(x),data=JSON.stringify(FBDATA),state=JSON.stringify(FB.state),
        ids=FB.stories.list().map(function(m){return m.id;}).join('|'),rng=FB.getRngState(),uid=FB.getUidCounter();
      return FB.mods.validate(x).length>0 && input===JSON.stringify(x) && data===JSON.stringify(FBDATA) &&
        state===JSON.stringify(FB.state) && ids===FB.stories.list().map(function(m){return m.id;}).join('|') &&
        rng===FB.getRngState() && uid===FB.getUidCounter();
    });
  },examples.harbor);
  expect(result).toEqual(Array(10).fill(true));
});

test('refusal, stopped preparation, preparation expiry, interruption and review expiry stay terminal',async function ({page},info) {
  await begin(page,info,'harbor');
  const result=await page.evaluate(function () {
    const C=reviewCase,base=FB.state,m=C.module(),P=FB.expeditionPreparation;
    return ['refuse','stop','expired','interrupted','review_expiry','party'].map(function (kind) {
      const s=JSON.parse(JSON.stringify(base)),t=s.stories[C.preparationId];
      if (kind==='refuse' || kind==='stop') P.commit(s,P.review(s,C.preparationId,kind,t.provider.characterId));
      if (kind==='expired') {C.turn(s,t.endTurn);FB.stories.get(C.preparationId).day(s,t);}
      if (kind==='interrupted') {s.chars[t.bindings[0].characterId].travel={};FB.stories.get(C.preparationId).day(s,t);}
      if (kind==='review_expiry') C.turn(s,m.declaration.endTurn);
      if (kind==='party') s.chars[s.stories[C.id].partyIds[1]].dead=true;
      const resources=JSON.stringify([s.owner,s.holder,s.armies,s.population,s.player.gold]);
      m.day(s,s.stories[C.id]);m.validate(s.stories[C.id],s);
      const terminal=JSON.stringify(s.stories[C.id]);m.day(s,s.stories[C.id]);
      return {status:s.stories[C.id].status,reason:s.stories[C.id].reason,
        once:terminal===JSON.stringify(s.stories[C.id]),
        denied:!FB.expeditionAgreements.review(s,C.id,'acknowledge',s.stories[C.id].partyIds[0]).allowed,
        unchanged:resources===JSON.stringify([s.owner,s.holder,s.armies,s.population,s.player.gold])};
    });
  });
  expect(result).toEqual([['declined','preparation_refused'],['interrupted','preparation_stopped'],
    ['expired','preparation_expired'],['interrupted','preparation_interrupted'],['expired','term'],['interrupted','party']]
    .map(function(row){return {status:row[0],reason:row[1],once:true,denied:true,unchanged:true};}));
});

test('original command loss after formation and later restoration cannot reopen the review',async function ({page},info) {
  await begin(page,info,'harbor');
  const result=await page.evaluate(function () {
    const C=reviewCase,s=FB.state,m=C.module();C.turn(s,2);const formed=C.form(s);
    const r=s.stories[C.id];m.day(s,r);C.turn(s,m.declaration.firstTurn);
    const q=FB.expeditionAgreements.review(s,C.id,'acknowledge',r.partyIds[0]),row=FB.mobile.row(s,m.declaration.actor.realmId);
    row.command.status='recalled';const stale=!FB.expeditionAgreements.commit(s,C.id,q);m.day(s,r);m.validate(r,s);
    const terminal=JSON.stringify(r);row.command.status='active';m.day(s,r);
    return {formed:formed,stale:stale,status:r.status,reason:r.reason,terminal:terminal===JSON.stringify(r)};
  });
  expect(result).toEqual({formed:true,stale:true,status:'interrupted',reason:'command',terminal:true});
});

test('the original parties and generations remain binding before formation',async function ({page},info) {
  await begin(page,info,'harbor');
  const result=await page.evaluate(function () {
    const C=reviewCase,m=C.module();
    return ['leader','source','generation'].map(function(kind) {
      const s=JSON.parse(JSON.stringify(FB.state)),r=s.stories[C.id];
      if (kind==='leader') s.chars[r.partyIds[0]].dead=true;
      if (kind==='source') s.chars[r.partyIds[1]].captive=true;
      if (kind==='generation') s.realms[m.declaration.actor.realmId].ruler.generation=r.generations[0]+1;
      m.day(s,r);m.validate(r,s);
      return r.status==='interrupted' && r.reason==='party' && r.formation===null && r.revision===1;
    });
  });
  expect(result).toEqual([true,true,true]);
});

test('a formed review can be declined through the shared player transaction without changing formation',async function ({page},info) {
  await begin(page,info,'harbor');
  const result=await page.evaluate(function () {
    const C=reviewCase,s=FB.state,m=C.module();C.turn(s,2);const formed=C.form(s),r=s.stories[C.id];
    m.day(s,r);C.turn(s,m.declaration.firstTurn);
    // Stage only the reviewed actor; this checks the shared player wrapper,
    // not a new-game identity or inheritance transaction.
    s.player.charId=r.partyIds[0];
    const before=JSON.stringify([s.stories[C.preparationId],s.armies,s.realms,s.population]),q=m.quote(s,r,'decline'),
      replay=JSON.parse(JSON.stringify(s)),accepted=m.apply(s,r,'decline',q),
      deterministic=m.apply(replay,replay.stories[C.id],'decline',m.quote(replay,replay.stories[C.id],'decline')) &&
        JSON.stringify(replay.stories[C.id])===JSON.stringify(r),repeat=!m.apply(s,r,'decline',q);
    m.validate(r,s);
    return {formed:formed,accepted:accepted,deterministic:deterministic,repeat:repeat,status:r.status,reason:r.reason,
      unchanged:before===JSON.stringify([s.stories[C.preparationId],s.armies,s.realms,s.population])};
  });
  expect(result).toEqual({formed:true,accepted:true,deterministic:true,repeat:true,status:'declined',reason:'decline',unchanged:true});
});

test('a refusal disposition restores without retrying formation or acknowledgment',async function ({page},info) {
  await begin(page,info,'harbor');
  const result=await page.evaluate(function () {
    const C=reviewCase,s=FB.state,P=FB.expeditionPreparation,t=s.stories[C.preparationId],
      refused=P.commit(s,P.review(s,C.preparationId,'refuse',t.provider.characterId));
    C.module().day(s,s.stories[C.id]);
    const before=JSON.stringify([s.stories,s.armies,s.population,s.realms]);
    FB.save.restore(JSON.parse(FB.save.serialize()));
    return refused && FB.state.stories[C.id].reason==='preparation_refused' &&
      before===JSON.stringify([FB.state.stories,FB.state.armies,FB.state.population,FB.state.realms]);
  });
  expect(result).toBe(true);
});

test('a review expired before formation stays closed when the separate preparation later forms',async function ({page},info) {
  const input=JSON.parse(JSON.stringify(examples.harbor));input.storyInstances.harbor_formation_review.endTurn=6;
  await begin(page,info,'harbor',input);
  const result=await page.evaluate(function () {
    const C=reviewCase,s=FB.state,m=C.module();C.turn(s,6);m.day(s,s.stories[C.id]);
    const before=JSON.stringify(s.stories[C.id]),formed=C.form(s);m.day(s,s.stories[C.id]);m.validate(s.stories[C.id],s);
    FB.save.restore(JSON.parse(FB.save.serialize()));
    return {formed:formed,same:before===JSON.stringify(FB.state.stories[C.id]),status:FB.state.stories[C.id].status};
  });
  expect(result).toEqual({formed:true,same:true,status:'expired'});
});

test('forged optional saves reject without replacing state, RNG or UID',async function ({page},info) {
  await begin(page,info,'harbor');
  const result=await page.evaluate(function () {
    const C=reviewCase,saved=JSON.parse(FB.save.serialize());
    const edits=[function(r){r.version=1;},function(r){delete r.preparation;},function(r){r.preparation.commandId='foreign';},
      function(r){r.preparation.leaderId=r.partyIds[1];},function(r){r.preparation.realmGeneration++;},
      function(r){r.preparation.issuer={characterId:r.partyIds[1],generation:1};},
      function(r){r.formation={turn:0};},function(r){r.status='pending';},function(r){r.revision=1;},
      function(r){r.decisions[0]='acknowledge';r.decisionTurns[0]=0;},
      function(r){r.status='declined';r.reason='preparation_refused';r.endedTurn=0;r.revision=1;},
      function(r,x){delete x.state.stories[C.id];}];
    return edits.map(function(edit){
      const x=JSON.parse(JSON.stringify(saved));edit(x.state.stories[C.id],x);
      const before=JSON.stringify(FB.state),rng=FB.getRngState(),uid=FB.getUidCounter();let rejected=false;
      try {FB.save.restore(x);} catch(error) {rejected=true;}
      return rejected && before===JSON.stringify(FB.state) && rng===FB.getRngState() && uid===FB.getUidCounter();
    });
  });
  expect(result).toEqual(Array(12).fill(true));
});

test('formed receipt provenance and review expiry remain strict after activation',async function ({page},info) {
  await begin(page,info,'harbor');
  const result=await page.evaluate(function () {
    const C=reviewCase,s=FB.state,m=C.module();C.turn(s,2);const formed=C.form(s);m.day(s,s.stories[C.id]);
    const saved=JSON.parse(FB.save.serialize()),edits=[function(r){r.formation.hostId='foreign_host';},
      function(r){r.formation.generation++;},function(r){r.formation.turn++;},
      function(r){r.formation=null;},function(r){r.status='waiting';},function(r){r.revision=0;}],
      rejected=edits.map(function(edit){
        const x=JSON.parse(JSON.stringify(saved));edit(x.state.stories[C.id]);
        const before=JSON.stringify(FB.state),rng=FB.getRngState(),uid=FB.getUidCounter();let failed=false;
        try {FB.save.restore(x);} catch(error) {failed=true;}
        return failed && before===JSON.stringify(FB.state) && rng===FB.getRngState() && uid===FB.getUidCounter();
      });
    C.turn(s,m.declaration.endTurn);m.day(s,s.stories[C.id]);m.validate(s.stories[C.id],s);
    return {formed:formed,rejected:rejected,status:s.stories[C.id].status,reason:s.stories[C.id].reason,
      receipt:s.stories[C.id].formation.turn===2,revision:s.stories[C.id].revision};
  });
  expect(result).toEqual({formed:true,rejected:Array(6).fill(true),status:'expired',reason:'term',receipt:true,revision:2});
});

test('legacy worlds without the optional review restore without attaching it',async function ({page},info) {
  const input=JSON.parse(JSON.stringify(examples.harbor));delete input.storyInstances.harbor_formation_review;
  input.bookmarks.harbor_world.stories=input.bookmarks.harbor_world.stories.filter(function(id){return id!=='harbor_formation_review';});
  await begin(page,info,'harbor',input);
  expect(await page.evaluate(function () {
    FB.save.restore(JSON.parse(FB.save.serialize()));return !FB.state.stories.harbor_formation_review &&
      FB.state.stories.harbor_preparation.status==='preparing';
  })).toBe(true);
});

test('ordinary immediate-command declarations retain version 1 and their exact save fields',async function ({page},info) {
  await begin(page,info,'harbor',require('../fixtures/authoring/expedition-terms-harbor.json'));
  const result=await page.evaluate(function () {
    const s=FB.state,r=s.stories.harbor_terms,m=FB.stories.get('harbor_terms');m.validate(r,s);
    const before=JSON.stringify(r);FB.save.restore(JSON.parse(FB.save.serialize()));
    return r.version===1 && !Object.prototype.hasOwnProperty.call(r,'preparation') &&
      !Object.prototype.hasOwnProperty.call(r,'formation') && r.status!=='waiting' &&
      before===JSON.stringify(FB.state.stories.harbor_terms);
  });
  expect(result).toBe(true);
});

for (const viewport of [{width:1280,height:800},{width:390,height:844}]) {
  test('waiting source card explains formation and exposes no premature choices at '+viewport.width,async function ({page},info) {
    await page.setViewportSize(viewport);await begin(page,info,'harbor');
    await page.evaluate(function () {FB.ui.showStorySheet(reviewCase.id);});
    await expect(page.locator('#gm-body')).toContainText('Waiting for the original expedition to form');
    await expect(page.locator('#gm-body')).toContainText('Payer: none');
    await expect(page.locator('[data-story-choice="acknowledge"]')).toHaveCount(0);
    await page.keyboard.press('Escape');
    expect(await page.evaluate(function () {return FB.state.stories[reviewCase.id].status;})).toBe('waiting');
  });
}
