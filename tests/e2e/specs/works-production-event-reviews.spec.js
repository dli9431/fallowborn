'use strict';
const fs=require('fs');
const path=require('path');
const {test,expect}=require('../support/fixture');
test.describe.configure({mode:'parallel'});
const {openGame,prepareGameContent}=require('../support/game/navigation');
const {restoreBookmark}=require('../support/game/bookmark-acceptance');
const {describeSharedPage,isSharedPage,activateBookmark}=require('../support/shared-page');
const {dependsOnRuntime}=require('../support/runtime-dependencies');
const examples={shore:require('../fixtures/authoring/works-production-event-reviews-shore.json'),river:require('../fixtures/authoring/works-production-event-reviews-river.json')};
dependsOnRuntime(__filename,['data/events_works_technology.js','data/production.js','data/production_fish_drying.js',
  'data/map_data.js','data/economy.js','data/economy_maritime.js','data/technology.js',
  'data/travel.js','js/travel.js',
  'data/production_seasonal_pasture.js','data/buildings_boathouses.js','data/buildings_fish_drying.js','data/maritime_work.js',
  'data/building_profiles.js','data/building_seasons.js','data/production_economy.js','data/site_resources.js','data/systems.js',
  'js/production.js','js/production_economy.js','js/building_profiles.js','js/building_operations.js','js/building_seasons.js',
  'js/site_resources.js','js/maritime_work.js','js/events.js','js/schema.js','js/systems.js','js/mods.js','js/world.js',
  'js/treasury.js','js/lordships.js','js/actions.js','js/economy.js','js/market.js','js/technology.js','js/climate.js',
  'js/politics.js','js/authority.js','js/home_authority.js','js/settlement.js','js/building_institutions.js','js/logistics.js',
  'js/main.js','js/starts.js','js/model.js','js/util.js','js/save.js','js/save_v4.js','js/ui_modals.js','js/ui_misc.js','css/style.css']);

/* A stored boot uses the exact fixture JSON the Mods dialog stores, so the page
   prepares only the modded catalogue once. On a shared page the group booted
   that stored text once (sharedWorks below). The rejected-apply case and the
   restore, dialog-cancellation and modified public cases keep fresh pages; the
   restore and dialog cases keep the Mods dialog import. */
async function boot(page,info,kind,options) {
  const fixture=path.resolve(__dirname,'../fixtures/authoring/works-production-event-reviews-'+kind+'.json');
  if (isSharedPage(page)) {
    expect(await page.evaluate(function () {return FB.mods.count();})).toBe(1);
  } else if (options && options.stored) {
    await page.addInitScript(function (source) {
      if (localStorage.getItem('fb_mods')===null) localStorage.setItem('fb_mods',JSON.stringify([source]));
    },fs.readFileSync(fixture,'utf8'));
    await openGame(page,info);
    expect(await page.evaluate(function () {return FB.mods.count();})).toBe(1);
  } else {
    await openGame(page,info);
    await page.evaluate(function () {FB.ui.showMods();});
    if (options && options.public) {
      const m=JSON.parse(JSON.stringify(examples[kind]));m.bookmarks['works_reviews_'+kind].realms[0].publicTreasury={schema:1};
      await page.locator('#modfile').setInputFiles({name:'works-production-event-reviews-public.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(m))});
    } else await page.locator('#modfile').setInputFiles(fixture);
    await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded'}),page.locator('#mod-apply').click()]);
    await prepareGameContent(page);
  }
  const full=page.locator('#btn-choose-beginning');
  if (await full.isVisible()) await full.click();else await page.getByRole('button',{name:'New Game',exact:true}).click();
  await page.locator('#btn-bm-seed').click();
  await page.locator('#ng-seed').fill('WORKS-works_reviews_'+kind+'-works_reviews_'+kind+'_ruler-resource_quay-m-Ivo_Reed-standard');
  await page.locator('#ng-seed').press('Enter');
  await expect(page.locator('#chargen:not(.hidden)')).toBeVisible();
  await page.getByRole('button',{name:'Begin Your Story',exact:true}).click();
  await page.getByRole('button',{name:'Begin',exact:true}).click();
  await page.evaluate(function (kind) {
    FB.game.setPaused(true);FB.game.auto.all=true;FB.game.auto.style='first';
    FB.game.uiPrefs.hideTips=true;FB.game.uiPrefs.hideBeginnerHints=true;
    const s=FB.state;s.slotDays=[];
    // Explicit finite fixture funding uses the existing private and public accounts.
    s.player.gold=2000;
    s.realms['works_reviews_'+kind+'_buyer'].treasury.gold=10000;
    const record=FB.realmTechRecord(s,FB.techRealmId(s));
    ['water_power','undershot_watermill','bloomery_iron','coastal_piloting','harbor_works','naval_levies','knarrs','sternpost_rudder'].forEach(function (id) {
      if (record.completed.indexOf(id)<0) record.completed.push(id);
    });
    FB.invalidateTechBonuses();
    window.worksTest={
      copy:function (x) {return JSON.parse(JSON.stringify(x));},
      facts:function (t) {
        t=FB.save.expandedSnapshot(t);
        return FB.contentValues.canonical([t.production || null,t.siteResources || null,t.buildingOperations || null,t.buildingSeasons || null,
          t.buildings,t.dev,t.player.gold,t.player.enterprises,t.settlementLordships && t.settlementLordships.accounts,
          Object.keys(t.realms).sort().map(function (id) {return [id,t.realms[id].treasury || null];})]);
      },
      terms:function (t,id) {
        const ev=FB.eventById(id),ctx=FB.eventContextFor(t,ev,{}),option=ev.options[0];
        const q=ctx && FB.eventReviews.quote(t,option,ctx);
        return {ev:ev,ctx:ctx,option:option,q:q};
      },
      commit:function (t,id,automated) {
        const r=worksTest.terms(t,id);
        if (!r.q || !r.q.quote.allowed) throw new Error(id+': '+JSON.stringify(r.q));
        if (!FB.resolveEventOption(t,r.ev,r.option,r.ctx,automated ? {automated:true} : {reviewed:r.q})) throw new Error('Commit failed: '+id);
        return r;
      },
      canonical:function (t,q) {
        const owners={works_construction:FB.buildingProfiles,production_batch:FB.production,production_exchange:FB.productionEconomy,
          building_operation:FB.buildingOperations,seasonal_operation:FB.buildingSeasons,maritime_operation:FB.maritimeWork};
        return owners[q.type].commit(t,q.quote);
      }
    };
  },kind);
}

async function paidWork(page,siteId,recipeId,finish) {
  await page.evaluate(function (input) {
    const s=FB.state,P=FB.production;
    const batch=P.commit(s,P.aiQuote(s,input.site,'reserve',{recipeId:input.recipe,disposition:'store'}));
    if (!batch) throw new Error('Actual paid reservation required at '+input.site);
    for (let n=0;n<FBDATA.productionRecipes[input.recipe].workDays;n++) {
      if (!P.perform(s,P.aiQuote(s,input.site,'work',{batchId:batch}))) throw new Error('Actual canonical workday required');
    }
    if (input.finish && !P.commit(s,P.aiQuote(s,input.site,'finish',{batchId:batch}))) throw new Error('Actual completion required');
    P.validate(s);
  },{site:siteId,recipe:recipeId,finish:finish});
}

// One stored boot per fixture with its world active; each case begins its own start.
function sharedWorks(kind) {
  return {boot:async function (page,info) {
    await page.addInitScript(function (source) {
      if (localStorage.getItem('fb_mods')===null) localStorage.setItem('fb_mods',JSON.stringify([source]));
    },fs.readFileSync(path.resolve(__dirname,'../fixtures/authoring/works-production-event-reviews-'+kind+'.json'),'utf8'));
    await openGame(page,info);
    expect(await page.evaluate(function () {return FB.mods.count();})).toBe(1);
    await activateBookmark(page,'works_reviews_'+kind);
  }};
}

for (const kind of ['shore','river']) {
  test(kind+' ordinary JSON rejects malformed typed reviews atomically and retains native declarations',async function ({page},info) {
    await boot(page,info,kind,{stored:true});
    const result=await page.evaluate(function (mod) {
      const s=FB.state,before=JSON.stringify(s),data=JSON.stringify(FBDATA),sig=FB.mods.sig(),rng=FB.getRngState(),uid=FB.getUidCounter();
      const valid=FB.mods.validate(mod).length===0,rejected=[];
      function reject(edit) {
        const candidate=worksTest.copy(mod);edit(candidate);const original=JSON.stringify(candidate);
        const faults=FB.mods.validate(candidate);let failed=false;
        try {FB.mods.apply(candidate);} catch (error) {failed=true;}
        rejected.push(faults.length>0 && failed && original===JSON.stringify(candidate));
      }
      reject(function (m) {m.events[0].options[0].review.args.profileId='missing_profile';});
      reject(function (m) {m.events[0].options[0].review.args.buildingId='mill';});
      reject(function (m) {m.events[1].options[0].review.args.quantity=0;});
      reject(function (m) {m.events[1].options[0].review.args.consent=true;});
      reject(function (m) {m.events[1].participants.pop();});
      reject(function (m) {m.events[4].options[0].review.args.recipeId='missing_recipe';});
      reject(function (m) {m.events[4].options[0].review.args.operation='work';});
      reject(function (m) {m.events[5].options[0].review.args.recipeId='review_batch';});
      reject(function (m) {m.events[7].options[0].review.args.profileId='missing_water';});
      reject(function (m) {m.events[8].options[0].review.args.operation='harvest';});
      reject(function (m) {m.events[9].options[0].review.args.invoiceCredit=999;});
      reject(function (m) {m.events[0].participantCards=[];});
      reject(function (m) {m.events[0].options[1].require={goldMin:1};});
      reject(function (m) {m.events[0].trigger.state=[{reader:'works_resource',args:{unit:'water',status:'available',amount:20}}];});
      reject(function (m) {m.events[0].trigger.state=[{reader:'production_account',args:{status:'stock',goodId:'missing_good'}}];});
      reject(function (m) {m.events[0].trigger.state=[{reader:'production_account',args:{status:'ready',technologyOnly:true}}];});
      const legacy=worksTest.copy(FB.eventById('operating_terms_notice'));
      const existing=FB.validateEventReviews(legacy).length===0 && FB.eventStateReaders.list().some(function (r) {return r.id==='owned_enterprise_law';});
      return {valid:valid,rejected:rejected,existing:existing,pure:before===JSON.stringify(s)&&data===JSON.stringify(FBDATA)&&sig===FB.mods.sig()&&rng===FB.getRngState()&&uid===FB.getUidCounter()};
    },examples[kind]);
    expect(result.rejected).toEqual(Array(16).fill(true));expect(result).toMatchObject({valid:true,existing:true,pure:true});
  });

  test(kind+' completion and cancellation reviews preserve spent resources and exact queued identities through two restores',async function ({page},info) {
    await boot(page,info,kind);
    await paidWork(page,'review_plant','review_batch',false);
    await page.evaluate(function (kind) {
      worksTest.commit(FB.state,'works_reviews_'+kind+'_finish');
      worksTest.commit(FB.state,'works_reviews_'+kind+'_water');
      worksTest.commit(FB.state,'works_reviews_'+kind+'_pasture');
      worksTest.commit(FB.state,'works_reviews_'+kind+'_buy');
      worksTest.commit(FB.state,'works_reviews_'+kind+'_build');
    },kind);
    await paidWork(page,'boat_plant','prepare_boathouse_work',true);
    const saved=await page.evaluate(function (kind) {
      const s=FB.state,T=worksTest;T.commit(s,'works_reviews_'+kind+'_maritime');
      const ev=FB.eventById('works_boat_release'),ctx=FB.eventContextFor(s,ev,{});
      if(!FB.queueEvent(s,ev.id,ctx))throw new Error('Exact invoice decision must queue');
      const live=JSON.stringify(s),storage=JSON.stringify(localStorage),rng=FB.getRngState(),uid=FB.getUidCounter();
      const corruptions=[function (t) {t.production.economy.receipts[0].paid++;},
        function (t) {t.siteResources.sources.review_intake.consumed=1000000000;},
        function (t) {t.buildingOperations.receipts[Object.keys(t.buildingOperations.receipts)[0]].paid++;},
        function (t) {t.buildingSeasons.terms[0].characterId='missing_original_person';},
        function (t) {t.production.maritime.invoices[0].credit++;},
        function (t) {t.buildings.resource_quay.find(function (b) {return b.id==='review_hall';}).buildingProfile.definition='changed';}];
      corruptions.forEach(function (change) {
        const t=T.copy(s);change(t);const before=JSON.stringify(t);let rejected=false;
        try {FB.save.v4.validatePlatform(t);} catch (error) {rejected=true;}
        if(!rejected || before!==JSON.stringify(t))throw new Error('Malformed account provenance must reject without repair');
      });
      const wrongMods=JSON.parse(FB.save.serialize());wrongMods.mods+='changed';let rejected=false;
      try {FB.save.restore(wrongMods);} catch (error) {rejected=true;}
      if(!rejected || live!==JSON.stringify(s) || storage!==JSON.stringify(localStorage) || rng!==FB.getRngState() || uid!==FB.getUidCounter())
        throw new Error('Changed mods must reject before live state or storage changes');
      window.worksCheckpoint={facts:T.facts(s),queue:JSON.stringify(s.eventQueue),rng:FB.getRngState()>>>0,uid:FB.getUidCounter(),sig:FB.mods.sig()};
      return FB.save.serialize();
    },kind);
    for (let n=0;n<2;n++) {
      await restoreBookmark(page,n?await page.evaluate(function () {return FB.save.serialize();}):saved);
      const restored=await page.evaluate(function () {
        const s=FB.state,c=worksCheckpoint;
        FB.production.validate(s);FB.siteResources.validate(s);FB.buildingSeasons.validate(s);FB.buildingOperations.validate(s);
        const entry=s.eventQueue.find(function (q) {return q.id==='works_boat_release';}),ev=FB.eventById(entry.id);
        const quote=FB.eventReviews.quote(s,ev.options[0],entry.ctx);
        const current=worksTest.facts(s);let at=0;
        while(at<c.facts.length&&at<current.length&&c.facts[at]===current[at])at++;
        return {quote:!!quote&&quote.quote.allowed,facts:c.facts===current,queue:c.queue===JSON.stringify(s.eventQueue),
          rng:c.rng===(FB.getRngState()>>>0),uid:c.uid===FB.getUidCounter(),sig:c.sig===FB.mods.sig(),
          difference:c.facts===current ? null : [c.facts.slice(Math.max(0,at-60),at+100),current.slice(Math.max(0,at-60),at+100)]};
      });
      expect(restored).toEqual({quote:true,facts:true,queue:true,rng:true,uid:true,sig:true,difference:null});
    }
    const cancelled=await page.evaluate(function () {
      const s=FB.state,T=worksTest,available=FB.production.snapshot(s).find(function (r) {return r.site.id==='boat_plant';}).lots.reduce(function (n,l) {return n+l.available;},0),gold=s.player.gold;
      const entry=s.eventQueue.find(function (q) {return q.id==='works_boat_release';}),ev=FB.eventById(entry.id);
      const quote=FB.eventReviews.quote(s,ev.options[0],entry.ctx);
      if(!quote || !quote.quote.allowed || !FB.resolveEventOption(s,ev,ev.options[0],entry.ctx,{reviewed:quote}))throw new Error('Original restored invoice context must commit without recasting');
      const invoice=s.production.maritime.invoices[0];
      return {status:invoice.status,paid:s.player.gold===gold,released:FB.production.snapshot(s).find(function (r) {return r.site.id==='boat_plant';}).lots.reduce(function (n,l) {return n+l.available;},0)>available};
    });
    expect(cancelled).toEqual({status:'cancelled',paid:true,released:true});
  });

  describeSharedPage(kind+' shared works reviews',sharedWorks(kind),function () {
  for (const native of [true,false]) test(kind+' '+(native?'native':'ordinary JSON')+' reviews share canonical commits, pure refusal, stale authority and automation',async function ({page},info) {
    await boot(page,info,kind);
    // A real paid batch supplies the finite sale output and maintained-work credit.
    await paidWork(page,'review_plant','review_batch',true);
    await paidWork(page,'boat_plant','prepare_boathouse_work',true);
    const result=await page.evaluate(function (input) {
      const s=FB.state,T=worksTest,prefix='works_reviews_'+input.kind+'_';
      const ids=input.native ? ['works_mill_now','works_owned_delivery','works_buyer_ready','works_reserve_batch',
        'works_water_route','works_pasture_open','works_boat_invoice'] :
        ['build','buy','sell','reserve','water','pasture','maritime'].map(function (id) {return prefix+id;});
      const base=T.copy(s),rows=[];
      for (const id of ids) {
        const t=T.copy(base),r=T.terms(t,id),rng=FB.getRngState(),uid=FB.getUidCounter(),before=JSON.stringify(t);
        if (!r.q || !r.q.quote.allowed) throw new Error('Unavailable '+id+': '+JSON.stringify(r));
        for (let n=0;n<3;n++) {FB.eventReviews.quote(t,r.option,r.ctx);FB.eventReviews.details(t,r.q);FB.eventContextStillValid(t,r.ev,r.ctx);}
        const pure=before===JSON.stringify(t)&&rng===FB.getRngState()&&uid===FB.getUidCounter();
        const missing=!FB.resolveEventOption(t,r.ev,r.option,r.ctx,{}) && before===JSON.stringify(t);
        const altered=T.copy(r.ctx);altered.worksSource.id='missing_source';
        const denied=!FB.resolveEventOption(t,r.ev,r.option,altered,{reviewed:r.q}) && before===JSON.stringify(t);
        const malformed=T.copy(r.ctx);delete malformed.worksSource.asset;
        const invalidSource=!FB.resolveEventOption(t,r.ev,r.option,malformed,{reviewed:r.q})&&before===JSON.stringify(t);
        const old=T.copy(t);old.turn++;old.date.day++;const oldBefore=JSON.stringify(old);
        const stale=!FB.resolveEventOption(old,r.ev,r.option,r.ctx,{reviewed:r.q}) && oldBefore===JSON.stringify(old);
        const captive=T.copy(t);captive.chars[captive.player.charId].imprisoned=true;const captiveBefore=JSON.stringify(captive);
        const authority=!FB.resolveEventOption(captive,r.ev,r.option,r.ctx,{reviewed:r.q})&&captiveBefore===JSON.stringify(captive);
        const succession=T.copy(t);succession.realms.player.ruler.generation=FB.realmRulerGeneration(succession,'player')+1;
        const successionBefore=JSON.stringify(succession);
        const generation=!FB.resolveEventOption(succession,r.ev,r.option,r.ctx,{reviewed:r.q})&&successionBefore===JSON.stringify(succession);
        const lost=T.copy(t),person=r.ctx.participants.counterparty || r.ctx.participants.operator;lost.chars[person].dead=true;
        const lostBefore=JSON.stringify(lost);
        const livePerson=!FB.resolveEventOption(lost,r.ev,r.option,r.ctx,{reviewed:r.q})&&lostBefore===JSON.stringify(lost)&&
          !FB.eventContextFor(lost,r.ev,r.ctx,true);
        const enabled=FBDATA.systems.event_works.defaultEnabled;FBDATA.systems.event_works.defaultEnabled=false;
        const disabled=!FB.eventReviews.quote(t,r.option,r.ctx) && !FB.eventStateReaders.test(t,[{reader:'works_payer',args:{minimum:0},not:true}],r.ctx);
        FBDATA.systems.event_works.defaultEnabled=enabled;
        const rejectionsPure=before===JSON.stringify(t)&&rng===FB.getRngState()&&uid===FB.getUidCounter();
        const refusal=T.copy(t),refusalBefore=T.facts(refusal);
        const declined=FB.resolveEventOption(refusal,r.ev,r.ev.options[1],r.ctx,{});
        const refusalPure=!!declined&&T.facts(refusal)===refusalBefore&&rng===FB.getRngState()&&uid===FB.getUidCounter();
        const automaticRefusal=T.copy(t),refusalFacts=T.facts(automaticRefusal);
        const refused=FB.resolveEventOption(automaticRefusal,r.ev,r.option,altered,{automated:true});
        const fallback=!!refused&&refused.optionIndex===1&&T.facts(automaticRefusal)===refusalFacts&&rng===FB.getRngState()&&uid===FB.getUidCounter();
        FB.setRngState(rng);FB.setUidCounter(uid);
        const canonical=T.copy(t),ok=T.canonical(canonical,r.q),canonicalFacts=T.facts(canonical);
        FB.setRngState(rng);FB.setUidCounter(uid);
        const auto=T.copy(t),automatic=FB.resolveEventOption(auto,r.ev,r.option,r.ctx,{automated:true});
        FB.setRngState(rng);FB.setUidCounter(uid);
        const committed=FB.resolveEventOption(t,r.ev,r.option,r.ctx,{reviewed:r.q});
        const settled=JSON.stringify(t),duplicate=!FB.resolveEventOption(t,r.ev,r.option,r.ctx,{reviewed:r.q})&&settled===JSON.stringify(t);
        rows.push({id:id,pure:pure,rejectionsPure:rejectionsPure,missing:missing,denied:denied,invalidSource:invalidSource,stale:stale,authority:authority,generation:generation,livePerson:livePerson,disabled:disabled,
          refusal:refusalPure,fallback:fallback,duplicate:duplicate,parity:!!ok&&!!automatic&&!!committed&&canonicalFacts===T.facts(auto)&&canonicalFacts===T.facts(t),
          parties:!!r.q.participants&&r.q.participants.operator===s.player.charId,
          noRecast:!FB.eventContextFor(t,r.ev,{participants:{}},true)});
      }
      return rows;
    },{kind:kind,native:native});
    for (const row of result) expect(row,row.id).toMatchObject({pure:true,rejectionsPure:true,missing:true,denied:true,invalidSource:true,stale:true,authority:true,generation:true,livePerson:true,disabled:true,
      refusal:true,fallback:true,duplicate:true,parity:true,parties:true,noRecast:true});
  });

  test(kind+' finite observations cover practical shortages, weather, water, care and paid maritime stages without writing',async function ({page},info) {
    await boot(page,info,kind);
    const result=await page.evaluate(function () {
      const s=FB.state,T=worksTest,before=JSON.stringify(s),rng=FB.getRngState(),uid=FB.getUidCounter(),observations=[];
      function read(t,reader,args) {return FB.eventStateReaders.test(t,[{reader:reader,args:args}],{});}
      function observe(reader,args,change,setup) {
        const positive=T.copy(s);if(setup)setup(positive);
        const negative=T.copy(positive);change(negative);
        const a=JSON.stringify(positive),b=JSON.stringify(negative);
        const yes=read(positive,reader,args),no=read(negative,reader,args);
        read(positive,reader,args);read(negative,reader,args);
        observations.push({reader:reader,yes:yes,no:no,pure:a===JSON.stringify(positive)&&b===JSON.stringify(negative)});
      }
      observe('production_account',{siteId:'review_plant',status:'ready'},function (t) {t.player.gold=0;});
      observe('production_account',{siteId:'review_plant',status:'technology_ready'},function (t) {
        const id=FB.techRealmId(t);t.realmTech[id].completed=t.realmTech[id].completed.filter(function (x) {return x!=='bloomery_iron';});
      });
      observe('production_exchange',{routeId:'review_buy',operation:'buy',quantity:1,status:'available'},function (t) {t.player.gold=0;});
      observe('works_water',{assignmentId:'review_fill',status:'dry'},function (t) {
        if(!FB.buildingOperations.commit(t,FB.buildingOperations.quote(t,{countyId:'resource_quay',settlement:1,buildingId:'review_fill',actor:{kind:'realm',id:'player'}}))) throw new Error('Actual fill required');
      });
      observe('works_water',{assignmentId:'review_service',status:'active'},function (t) {
        t.buildings.resource_quay.find(function (b) {return b.id==='review_service';}).ruined=true;
      },function (t) {
        for(const id of ['review_fill','review_service']) {
          const q=FB.buildingOperations.quote(t,{countyId:'resource_quay',settlement:1,buildingId:id,actor:{kind:'realm',id:'player'}});
          if(!FB.buildingOperations.commit(t,q))throw new Error('Actual paid service required: '+JSON.stringify(q));
        }
      });
      observe('works_water',{assignmentId:'review_fill',status:'unfunded'},function (t) {t.player.gold=2000;},function (t) {
        t.player.gold=0;
        const q=FB.buildingOperations.quote(t,{countyId:'resource_quay',settlement:1,buildingId:'review_fill',actor:{kind:'realm',id:'player'}});
        if(q.allowed || !(q.cost>0))throw new Error('An unfunded review must disclose its actual required payment');
      });
      observe('works_season',{assignmentId:'review_pasture',status:'open_ready'},function (t) {
        if(!FB.travelStart(t,'expedition','resource_bank',null))throw new Error('An ordinary paid journey must reserve local care');
      });
      observe('works_season',{assignmentId:'review_fish',status:'open_ready'},function (t) {t.date.season=2;});
      observe('works_resource',{unit:'grazing',status:'available'},function (t) {
        const q=FB.siteResources.quote(t,{operation:'reserve',sourceId:'review_ground',actor:{kind:'realm',id:'player'},amount:FB.siteResources.snapshot(t).find(function (r) {return r.id==='review_ground';}).capacity});
        if(!FB.siteResources.commit(t,q))throw new Error('Actual finite claim required');
      });
      // Shortages are observed through canonical reservations, not invented lots.
      const t=T.copy(s),batch=FB.production.commit(t,FB.production.aiQuote(t,'review_plant','reserve',{recipeId:'review_batch',disposition:'store'}));
      const pending=read(t,'production_account',{siteId:'review_plant',status:'pending'});
      const cancelled=FB.production.commit(t,FB.production.aiQuote(t,'review_plant','cancel',{batchId:batch}));
      const released=!read(t,'production_account',{siteId:'review_plant',status:'pending'});
      return {observations:observations,pending:pending,cancelled:cancelled,released:released,
        pure:before===JSON.stringify(s)&&rng===FB.getRngState()&&uid===FB.getUidCounter()};
    });
    for (const row of result.observations) expect(row,row.reader).toMatchObject({yes:true,no:false,pure:true});
    expect(result).toMatchObject({pending:true,cancelled:true,released:true,pure:true});
  });

  for (const native of [true,false]) test(kind+' '+(native?'native':'JSON')+' settlement, stock allocation and cancellation use original completed work',async function ({page},info) {
    await boot(page,info,kind);
    await page.evaluate(function () {
      const s=FB.state;
      if(!FB.buildingSeasons.commit(s,FB.buildingSeasons.quote(s,{operation:'open',assignmentId:'review_fish',actor:{kind:'realm',id:'player'},lotId:null}))) throw new Error('Actual fish window required');
    });
    await paidWork(page,'review_fish','dry_fish',true);
    await paidWork(page,'boat_plant','prepare_boathouse_work',true);
    await paidWork(page,'review_plant','review_batch',false);
    const result=await page.evaluate(function (input) {
      const s=FB.state,T=worksTest,prefix='works_reviews_'+input.kind+'_';
      T.commit(s,prefix+'water');T.commit(s,prefix+'maritime');
      const ids=input.native ? ['works_finished_work','works_hold_inputs','works_drying_stock','works_service_due','works_boat_complete','works_boat_release'] :
        ['finish','cancel_batch','allocate','water_use','complete_invoice','cancel_invoice'].map(function (x) {return prefix+x;});
      const base=T.copy(s),results=[];
      for(const id of ids) {
        const t=T.copy(base),r=T.terms(t,id),rng=FB.getRngState(),uid=FB.getUidCounter();
        if(!r.q || !r.q.quote.allowed)throw new Error(id+': '+JSON.stringify(r.q));
        const before=JSON.stringify(t);FB.eventReviews.quote(t,r.option,r.ctx);FB.eventReviews.details(t,r.q);
        const pure=before===JSON.stringify(t)&&rng===FB.getRngState()&&uid===FB.getUidCounter();
        const fork=T.copy(t),canonical=T.canonical(fork,r.q),facts=T.facts(fork);
        FB.setRngState(rng);FB.setUidCounter(uid);
        const automatic=T.copy(t),auto=FB.resolveEventOption(automatic,r.ev,r.option,r.ctx,{automated:true});
        FB.setRngState(rng);FB.setUidCounter(uid);
        const committed=FB.resolveEventOption(t,r.ev,r.option,r.ctx,{reviewed:r.q});
        FB.production.validate(t);FB.siteResources.validate(t);FB.buildingSeasons.validate(t);FB.buildingOperations.validate(t);
        const settled=JSON.stringify(t),repeat=!FB.resolveEventOption(t,r.ev,r.option,r.ctx,{reviewed:r.q})&&settled===JSON.stringify(t);
        results.push({id:id,pure:pure,repeat:repeat,parity:!!canonical&&!!auto&&!!committed&&facts===T.facts(t)&&facts===T.facts(automatic)});
      }
      return results;
    },{kind:kind,native:native});
    for(const row of result)expect(row,row.id).toMatchObject({pure:true,repeat:true,parity:true});
  });

  test(kind+' native observations follow actual finite account transitions',async function ({page},info) {
    await boot(page,info,kind);
    await page.evaluate(function () {
      window.worksObserved=[];
      window.observeWork=function (id,t) {
        t=t || FB.state;
        // A read must retain the exact generator representation as well as its bits.
        if(FB.getRngState()>=0)FB.rng();
        if(FB.getRngState()>=0)FB.rng();
        if(FB.getRngState()>=0)throw new Error('Observation fixture requires a signed generator state');
        const ev=FB.eventById(id),before=JSON.stringify(t),rng=FB.getRngState(),uid=FB.getUidCounter();
        const available=FB.eventPeriodEnabled(t,ev)&&FB.checkTrigger(t,ev.trigger,{});
        const repeated=FB.checkTrigger(t,ev.trigger,{}),ctx=FB.eventContextFor(t,ev,{});
        const enabled=FBDATA.systems.event_works.defaultEnabled;FBDATA.systems.event_works.defaultEnabled=false;
        const disabled=!FB.checkTrigger(t,ev.trigger,{});FBDATA.systems.event_works.defaultEnabled=enabled;
        worksObserved.push({id:id,available:available,repeated:repeated,context:!!ctx,disabled:disabled,
          pure:before===JSON.stringify(t)&&rng===FB.getRngState()&&uid===FB.getUidCounter(),
          unchangedState:before===JSON.stringify(t),rng:[rng,FB.getRngState()],uid:[uid,FB.getUidCounter()]});
      };
      ['works_owned_delivery','works_reserve_batch','works_new_recipe','works_dry_cistern','works_water_route',
        'works_pasture_open','works_drying_window','works_mill_now'].forEach(function (id) {observeWork(id);});
      const poor=worksTest.copy(FB.state);poor.player.gold=0;observeWork('works_processing_purse',poor);
      const away=worksTest.copy(FB.state);
      if(!FB.travelStart(away,'expedition','resource_bank',null))throw new Error('An ordinary paid journey must reserve the original worker');
      observeWork('works_late_worker',away);
      observeWork('works_pasture_care',away);
      const s=FB.state,who={kind:'realm',id:'player'};
      const claim=FB.siteResources.commit(s,FB.siteResources.quote(s,{operation:'reserve',sourceId:'review_intake',actor:who,amount:1}));
      observeWork('works_water_reserved');
      if(!FB.siteResources.commit(s,FB.siteResources.quote(s,{operation:'release',sourceId:'review_intake',actor:who,reservationId:claim})))throw new Error('Claim release required');
      worksTest.commit(s,'works_water_route');observeWork('works_service_due');worksTest.commit(s,'works_service_due');observeWork('works_shared_demand');
      const competing=worksTest.terms(s,'works_shared_demand');
      if(!competing.q || competing.q.quote.allowed || competing.q.quote.reason!=='period')throw new Error('The competing service must disclose its occupied demand');
      if(!FB.buildingSeasons.commit(s,FB.buildingSeasons.quote(s,{operation:'open',assignmentId:'review_fish',actor:who,lotId:null})))throw new Error('Fish window required');
    });
    await paidWork(page,'review_fish','dry_fish',true);
    await page.evaluate(function () {observeWork('works_drying_stock');});
    await paidWork(page,'boat_plant','prepare_boathouse_work',true);
    await page.evaluate(function () {
      observeWork('works_boat_invoice');worksTest.commit(FB.state,'works_boat_invoice');
      observeWork('works_boat_complete');observeWork('works_boat_release');
      worksTest.commit(FB.state,'works_boat_release');
      const s=FB.state,a=FB.maritimeWork.snapshot(s,'resource_quay','resource_intake')[0],p=FBDATA.maritimeWorkProfiles[a.profileId];
      const enterprise=FB.acquireEnterprise(s,p.enterpriseType,'resource_quay',0);
      if(!enterprise)throw new Error('Ordinary paid enterprise required for a next-stage review');
      FB.unassignEnterpriseWorker(s,s.player.charId);observeWork('works_boat_upgrade');
    });
    await paidWork(page,'review_plant','review_batch',false);
    await page.evaluate(function () {
      observeWork('works_hold_inputs');observeWork('works_finished_work');worksTest.commit(FB.state,'works_finished_work');
      observeWork('works_buyer_ready');
      const poor=worksTest.copy(FB.state),buyer=FB.productionEconomy.aiQuote(poor,'review_sell',1,'sell').buyer;
      poor.realms[buyer.id].treasury.gold=0;observeWork('works_seller_waiting',poor);
    });
    await paidWork(page,'review_plant','review_batch',true);
    const observed=await page.evaluate(function () {
      observeWork('works_input_short');
      const s=FB.state,q=FB.productionEconomy.aiQuote(s,'review_sell',2,'sell');
      if(!FB.productionEconomy.commit(s,q))throw new Error('Finite funded sale required');
      if(!FB.eventStateReaders.test(s,[{reader:'production_exchange',args:{routeId:'review_sell',operation:'sell',quantity:1,status:'demand_spent'}}],{}))throw new Error('Declared demand must remain finite');
      return worksObserved;
    });
    expect(observed).toHaveLength(24);
    for(const row of observed)expect.soft(row,JSON.stringify(row)).toMatchObject({available:true,repeated:true,context:true,disabled:true,pure:true});
  });

  test(kind+' native and JSON next-stage reviews retain the ordinary upgrade, payment and original enterprise',async function ({page},info) {
    await boot(page,info,kind);await paidWork(page,'boat_plant','prepare_boathouse_work',true);
    const result=await page.evaluate(function (kind) {
      const s=FB.state,T=worksTest,a=FB.maritimeWork.snapshot(s,'resource_quay','resource_intake')[0],p=FBDATA.maritimeWorkProfiles[a.profileId];
      const enterprise=FB.acquireEnterprise(s,p.enterpriseType,'resource_quay',0);
      if(!enterprise)throw new Error('Ordinary existing enterprise required');
      const baseline=T.copy(s),rows=[];
      for(const id of ['works_boat_upgrade','works_reviews_'+kind+'_upgrade_invoice']) {
        const t=T.copy(baseline),rng=FB.getRngState(),uid=FB.getUidCounter(),r=T.terms(t,id);
        if(!r.q || !r.q.quote.allowed)throw new Error(id+': '+JSON.stringify(r.q));
        const level=FB.enterpriseUpgradeLevel(enterprise),gold=t.player.gold;
        T.commit(t,id);
        const next=T.terms(t,'works_boat_complete'),canonical=T.copy(t);
        if(!next.q || !next.q.quote.allowed)throw new Error('Original next-stage invoice required');
        const ok=T.canonical(canonical,next.q);
        FB.setRngState(rng);FB.setUidCounter(uid);
        T.commit(t,'works_boat_complete');FB.production.validate(t);
        rows.push({parity:!!ok&&T.facts(canonical)===T.facts(t),same:t.player.enterprises.length===1&&t.player.enterprises[0].uid===enterprise.uid,
          level:FB.enterpriseUpgradeLevel(t.player.enterprises[0])===level+1,charge:gold-t.player.gold,due:next.q.quote.due});
      }
      return rows;
    },kind);
    for(const row of result){expect(row).toMatchObject({parity:true,same:true,level:true});expect(row.charge).toBeCloseTo(row.due,8);}
  });

  test(kind+' capture cannot authorize another original owner and preserves personal cancellation',async function ({page},info) {
    await boot(page,info,kind);await paidWork(page,'boat_plant','prepare_boathouse_work',true);
    const result=await page.evaluate(function (kind) {
      const s=FB.state,T=worksTest,P=FB.production;
      const mine=P.commit(s,P.aiQuote(s,'review_plant','reserve',{recipeId:'review_batch',disposition:'store'}));
      const other=P.commit(s,P.aiQuote(s,'review_depot','reserve',{recipeId:'review_batch',disposition:'store'}));
      if(!mine || !other)throw new Error('Both original owners must pay for their own finite batches');
      T.commit(s,'works_boat_invoice');
      const buyer='works_reviews_'+kind+'_buyer',capturedBank=T.copy(s);
      capturedBank.owner.resource_bank='player';capturedBank.holder.resource_bank='player';
      const oldBatch=capturedBank.production.batches.find(function (b) {return b.id===other;});
      const original=P.quote(capturedBank,{operation:'cancel',siteId:'review_depot',actor:oldBatch.actor,batchId:other});
      const before=JSON.stringify(capturedBank),rng=FB.getRngState(),uid=FB.getUidCounter();
      const foreign=T.terms(capturedBank,'works_reviews_'+kind+'_foreign_batch');
      const refused=(!foreign.ctx || !foreign.q || !foreign.q.quote.allowed)&&before===JSON.stringify(capturedBank)&&
        rng===FB.getRngState()&&uid===FB.getUidCounter();
      const rows=[];
      for(const id of ['works_hold_inputs','works_reviews_'+kind+'_cancel_batch','works_boat_release','works_reviews_'+kind+'_cancel_invoice']) {
        const t=T.copy(s),r=T.terms(t,id),source=T.copy(r.ctx);
        t.owner.resource_quay=buyer;t.holder.resource_quay=buyer;
        const gold=t.player.gold,stock=JSON.stringify(t.production.lots),q=FB.eventReviews.quote(t,r.option,source);
        const committed=q&&q.quote.allowed&&FB.eventReviews.commit(t,r.option,source,q);
        rows.push(!!committed&&t.player.gold===gold&&stock===JSON.stringify(t.production.lots));
      }
      return {originalAllowed:original.allowed,foreignRefused:refused,personal:rows};
    },kind);
    expect(result).toEqual({originalAllowed:true,foreignRefused:true,personal:[true,true,true,true]});
  });
  });
}

test('event confirmation cancellation retains mounted controls and spends no stock, cash, RNG or identity',async function ({page},info) {
  await boot(page,info,'shore');
  await page.evaluate(function () {
    const s=FB.state,ev=FB.eventById('works_owned_delivery');FB.game.auto.all=false;
    FB.game.auto.major=false;FB.game.auto.minor=false;FB.ui.runEvents([{id:ev.id,ctx:FB.eventContextFor(s,ev,{})}]);
    window.worksUiBefore=JSON.stringify(s);window.worksUiRng=FB.getRngState();window.worksUiUid=FB.getUidCounter();
  });
  const option=page.locator('#ev-options .evopt').first();await expect(option).toBeVisible();
  await page.evaluate(function () {window.worksUiNode=document.querySelector('#ev-options .evopt');});
  for (const route of ['cancel','back','escape']) {
    await expect.poll(function () {return page.evaluate(function () {return !FB.ui.eventInputGuarded();});}).toBe(true);
    await option.click();await expect(page.locator('#event-review-cancel')).toBeVisible();
    await expect.poll(function () {return page.evaluate(function () {return !FB.ui.eventInputGuarded();});}).toBe(true);
    if (route==='cancel') await page.locator('#event-review-cancel').click();
    else if (route==='back') await page.locator('#event-nav-back').click();else await page.keyboard.press('Escape');
    await expect(option).toBeFocused();
    expect(await page.evaluate(function () {
      return worksUiBefore===JSON.stringify(FB.state)&&worksUiRng===FB.getRngState()&&worksUiUid===FB.getUidCounter()&&worksUiNode===document.querySelector('#ev-options .evopt');
    })).toBe(true);
  }
});

test('preserved public construction pays the canonical account and never substitutes private funds',async function ({page},info) {
  await boot(page,info,'shore',{public:true});
  const result=await page.evaluate(function () {
    const s=FB.state,T=worksTest;s.realms.player.treasury.gold=10000;s.player.gold=0;
    const r=T.terms(s,'works_reviews_shore_build');
    if(!r.q || !r.q.quote.allowed)throw new Error('Public construction quote must use the existing works account: '+JSON.stringify(r.q));
    const privateGold=s.player.gold,publicGold=s.realms.player.treasury.gold,cost=r.q.quote.cost;
    const q=r.q;s.realms.player.treasury.gold--;
    const before=JSON.stringify(s),rng=FB.getRngState(),uid=FB.getUidCounter();
    const stale=!FB.resolveEventOption(s,r.ev,r.option,r.ctx,{reviewed:q})&&before===JSON.stringify(s)&&rng===FB.getRngState()&&uid===FB.getUidCounter();
    s.realms.player.treasury.gold=publicGold;
    T.commit(s,'works_reviews_shore_build');
    const paid=publicGold-s.realms.player.treasury.gold;
    const t=T.copy(s);t.realms.player.treasury.gold=0;t.player.gold=10000;
    const request={countyId:'resource_quay',settlement:0,buildingId:'mill',actor:{kind:'character',id:t.player.charId}};
    const denied=!FB.buildingProfiles.quote(t,request).allowed;
    return {stale:stale,paid:paid,cost:cost,privateUnchanged:s.player.gold===privateGold,denied:denied,
      actual:s.realms.player.treasury.gold,expected:publicGold-cost};
  });
  expect(result).toMatchObject({stale:true,privateUnchanged:true,denied:true});expect(result.actual).toBe(result.expected);
  expect(result.paid).toBeCloseTo(result.cost,8);
});
