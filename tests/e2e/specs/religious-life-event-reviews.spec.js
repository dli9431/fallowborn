'use strict';
const path = require('path');
const {test,expect} = require('../support/fixture');
test.describe.configure({mode:'parallel'});
const {openGame,prepareGameContent} = require('../support/game/navigation');
const {startPreparedParityGame} = require('../support/game/parity');
const {restoreBookmark} = require('../support/game/bookmark-acceptance');
const {dependsOnRuntime} = require('../support/runtime-dependencies');
const {engineSources} = require('../support/source-literals');
const {quotedCounts} = require('../support/content-id-reviews');
const examples = ['religious-life-event-reviews.json','religious-life-event-reviews-funds.json'];
dependsOnRuntime(__filename,[
  'index.html','js/main.js','js/bookmark_setup.js','js/bookmark_sources.js','js/starts.js',
  'data/starts.js','data/bookmark_493.js','data/bookmark_1204_terrain.js','data/government_rollout.js',
  'data/economy.js','data/intrigue.js','data/cultures.js','data/political_institutions.js','data/events_religious_life.js','data/religious_activities.js','data/religious_institutions.js',
  'data/episcopal_claims.js','data/religious_cases.js','data/holy_war_causes.js','data/christian_rollout.js',
  'data/bookmark_1204.js','data/bookmark_493_world.js','data/ecclesiastical_profiles.js','data/systems.js',
  'js/schema.js','js/events.js','js/religious_activities.js','js/religious_institutions.js',
  'js/episcopal_claims.js','js/religious_cases.js','js/holywar.js','js/model.js','js/authority.js',
  'js/government_ecclesiastical.js','js/ecclesiastical_strategies.js','js/justice.js','js/lordships.js',
  'js/treasury.js','js/papacy.js','js/systems.js','js/abbeys.js','js/mods.js','js/save.js','js/save_v4.js','js/localfolk.js','js/world.js',
  'js/ui_modals.js','js/ui_misc.js'
]);

async function start(page,info,imported,funds) {
  await openGame(page,info);
  if (imported) {
    const file = path.resolve(__dirname,'../fixtures/authoring',examples[funds ? 1 : 0]);
    await page.evaluate(function () {FB.ui.showMods();});
    await page.locator('#modfile').setInputFiles(file);
    await Promise.all([page.waitForEvent('domcontentloaded'),page.locator('#mod-apply').click()]);
    await prepareGameContent(page);
  }
  await startPreparedParityGame(page,funds ? {unhide:true,bookmark:'493',revision:'jewish_samaritan_v3',code:'REVIEW-493-farmer_493-sardis-m-Reader-established-0-greek.jewish'} :
    {unhide:true,bookmark:'1204',code:'REVIEW-1204-baron-roma-m-Reader'});
  await page.evaluate(function () {
    window.reviewTools = {
      facts:function (s,includeQueue) {
        return JSON.stringify({gold:s.player.gold,piety:s.player.piety,prestige:s.player.prestige,
          institutions:s.localInstitutions,claims:s.authority.episcopalClaims,cases:s.authority.religiousCases,
          receipts:s.authority.receipts,houses:s.abbeys,offenses:s.justice && s.justice.offenses || [],queue:includeQueue ? s.eventQueue : undefined,
          people:Object.keys(s.chars).sort().map(function (id) {const c=s.chars[id];return [id,c.religiousActivity,c.religiousActivityHistory,c.religiousAffiliations,c.wealth];}),
          treasuries:Object.keys(s.realms).sort().map(function (id) {return [id,s.realms[id].treasury && s.realms[id].treasury.gold];}),
          campaign:s.greatHolyWar,pledge:s.player.greatHolyWar,heads:s.religiousHeads,support:s.countySupport || {},owner:s.owner,holder:s.holder});
      },
      exact:function () {return JSON.stringify([FB.state,FB.getRngState(),FB.getUidCounter(),Object.assign({},localStorage)]);},
      rejectIncomplete:function (ev,ctx,keys) {
        const s=FB.state,q=FB.eventReviews.quote(s,ev.options[0],ctx),before=this.exact();
        if (!q || !q.quote.allowed) throw new Error('Missing original review');
        return keys.every(function (key) {
          const incomplete=JSON.parse(JSON.stringify(ctx));delete incomplete[key];
          const contextBefore=JSON.stringify(incomplete);
          return FB.eventReviews.quote(s,ev.options[0],incomplete)===null &&
            !FB.eventReviews.commit(s,ev.options[0],incomplete,q) && contextBefore===JSON.stringify(incomplete);
        }) && before===this.exact();
      },
      exercise:function (id,deny) {
        const s=FB.state,ev=FB.eventById(id),ctx=FB.eventContextFor(s,ev,{}),opt=ev.options[0];
        if (!ctx) throw new Error('Cannot bind '+id);
        const before=this.exact(),rng=FB.getRngState(),uid=FB.getUidCounter();
        const q=FB.eventReviews.quote(s,opt,ctx);
        if (!q || !q.quote.allowed) throw new Error('Unavailable review '+id+': '+JSON.stringify(q));
        for(let i=0;i<3;i++) {
          if (JSON.stringify(FB.eventReviews.quote(s,opt,ctx))!==JSON.stringify(q)) throw new Error('Unstable quote');
          FB.eventReviews.details(s,q);FB.checkTrigger(s,ev.trigger,ctx);
        }
        const pure=before===this.exact();
        s.turn++;
        const changed=this.exact(),stale=!FB.resolveEventOption(s,ev,opt,ctx,{reviewed:q}) && changed===this.exact();
        s.turn--;
        const denied=JSON.parse(JSON.stringify(s));deny(denied);
        const deniedBefore=JSON.stringify(denied),deniedQ=FB.eventReviews.quote(denied,opt,ctx);
        const authority=(!deniedQ || !deniedQ.quote.allowed) && !FB.eventReviews.commit(denied,opt,ctx,q) && deniedBefore===JSON.stringify(denied);
        const world=FBDATA.bookmarks[s.start.id];
        const owner=q.type==='holy_war_vow' ? 'great_holy_wars' : q.type==='episcopal_claim' ? 'event_episcopal_claims' : q.type==='religious_case' ? 'event_religious_cases' : 'event_religious_institutions';
        const systems=world.systems;world.systems=Object.assign({},systems);world.systems[owner]=false;
        const disabledBefore=this.exact(),disabled=FB.eventReviews.quote(s,opt,ctx)===null && !FB.eventReviews.commit(s,opt,ctx,q) &&
          !FB.eventStateReaders.test(s,[Object.assign({},ev.trigger.state[0],{not:true})],ctx) && disabledBefore===this.exact();
        world.systems=systems;
        const refusal=JSON.parse(JSON.stringify(s)),refusalBefore=this.facts(refusal);
        FB.resolveEventOption(refusal,ev,ev.options[1],JSON.parse(JSON.stringify(ctx)),{automated:true});
        const refused=refusalBefore===this.facts(refusal);
        const automated=JSON.parse(JSON.stringify(s));
        const auto=FB.resolveEventOption(automated,ev,opt,JSON.parse(JSON.stringify(ctx)),{automated:true});
        const autoRng=FB.getRngState()>>>0,autoUid=FB.getUidCounter();
        FB.setRngState(rng);FB.setUidCounter(uid);
        const receipt=FB.resolveEventOption(s,ev,opt,ctx,{reviewed:FB.eventReviews.quote(s,opt,ctx)});
        const parity=!!auto && !!receipt && this.facts(automated)===this.facts(s) && autoRng===(FB.getRngState()>>>0) && autoUid===FB.getUidCounter();
        const again=this.exact(),duplicate=!FB.eventReviews.commit(s,opt,ctx,q)&&again===this.exact();
        return {pure:pure,stale:stale,authority:authority,disabled:disabled,refused:refused,parity:parity,duplicate:duplicate};
      },
      save:function () {
        const saved=FB.save.serialize();
        window.reviewCheckpoint={facts:this.facts(FB.state,true),rng:FB.getRngState()>>>0,uid:FB.getUidCounter(),sig:FB.mods.sig()};
        return saved;
      }
    };
  });
}
async function roundTrip(page,saved) {
  await restoreBookmark(page,saved);
  await restoreBookmark(page,await page.evaluate(function () {return FB.save.serialize();}));
  expect(await page.evaluate(function () {
    return reviewCheckpoint.facts===reviewTools.facts(FB.state,true)&&reviewCheckpoint.rng===(FB.getRngState()>>>0)&&
      reviewCheckpoint.uid===FB.getUidCounter()&&reviewCheckpoint.sig===FB.mods.sig();
  })).toBe(true);
  expect(await page.evaluate(function () {
    const bad=JSON.parse(FB.save.serialize()),s=bad.state,c=s.chars[s.player.charId];
    if (s.authority.episcopalClaims && s.authority.episcopalClaims.length) s.authority.episcopalClaims[0].definitionFingerprint='altered';
    else if (c.religiousActivity) c.religiousActivity.paid=-1;
    else if (s.abbeys && s.abbeys.houses.some(function (h) {return h.activityInstitutionId;}))
      s.abbeys.houses.find(function (h) {return h.activityInstitutionId;}).restrictedFunds.building_care=-1;
    else if (s.greatHolyWar && s.greatHolyWar.cause) s.greatHolyWar.cause.generation=0;
    else throw new Error('Missing malformed-save scenario');
    const before=reviewTools.exact();let rejected=false;
    try {FB.save.restore(bad);}catch(error) {rejected=true;}
    return rejected&&before===reviewTools.exact();
  })).toBe(true);
}
function expectReview(result) {
  expect(result).toEqual({pure:true,stale:true,authority:true,disabled:true,refused:true,parity:true,duplicate:true});
}

for (const imported of [false,true]) {
  const source=imported ? 'ordinary JSON' : 'native';
  test(source+' membership and activity reviews share pure gates, automation and exact restore',async function ({page},info) {
    await start(page,info,imported);
    const result=await page.evaluate(function (imported) {
      const s=FB.state,p=s.player,c=s.chars[p.charId],iid='constantinople_latin_service_1204';
      p.provinceId='constantinople';p.homeSettlement=0;p.gold=200;c.religion='catholic';c.born=1170;c.skills.int=8;
      FB.localFolkArrive(s,p.provinceId);
      const role=imported ? 'visitor' : 'household';
      const admission=reviewTools.exercise(imported ? 'river_membership_review' : 'religious_life_latin_household',function (v) {v.chars[v.player.charId].dead=true;});
      const membership=s.localInstitutions[iid].members[c.id].roleId===role;
      const activity=reviewTools.exercise(imported ? 'river_activity_review' : 'religious_life_latin_activity',function (v) {v.player.gold=0;});
      const paid=imported ? 3 : 2;
      return {admission:admission,activity:activity,membership:membership,charged:p.gold===200-paid,
        activityId:c.religiousActivity.activityId,saved:reviewTools.save()};
    },imported);
    expectReview(result.admission);expectReview(result.activity);expect(result.membership).toBe(true);expect(result.charged).toBe(true);
    expect(result.activityId).toBe(imported ? 'river_household_learning' : 'constantinople_latin_service_1204');
    await roundTrip(page,result.saved);
  });

  test(source+' rent and named case reviews retain exact parties and separate finite accounts',async function ({page},info) {
    await start(page,info,imported);
    const result=await page.evaluate(function (imported) {
      const s=FB.state,C=FB.episcopalClaims,R=FB.religiousCases,pid=imported ? 'spoleto' : 'roma';
      const rent=imported ? 'river_rent' : 'roman_temporal_rent',discipline=imported ? 'river_clerical_peace' : 'roman_clerical_violence';
      s.player.provinceId=pid;s.player.gold=200;
      FB.localFolkArrive(s,pid);
      FB.rememberSettlementSites(s,pid);
      let slot=FB.directSettlements(s,{kind:'character',id:s.player.charId}).find(function (v) {return v.provinceId===pid&&v.settlement>0;});
      slot=slot ? slot.settlement : 1;
      if (!FB.assignSettlementLordship(s,pid,slot,s.player.charId) && !C.snapshot(s,rent,slot)) throw new Error('Grant unavailable');
      const snap=C.snapshot(s,rent,slot),bishop=snap.bishopId,privateBefore=C.privateAccount(s,bishop).gold;
      function claim(action,who) {const q=C.quote(s,rent,slot,who,action);if(!q || !q.allowed || !C.apply(s,q))throw new Error(action+': '+JSON.stringify(q));}
      claim('demand',bishop);claim('compensation',bishop);
      const rentEvent=FB.eventById(imported ? 'river_rent_review' : 'religious_life_other_party');
      const rentContext=FB.eventContextFor(s,rentEvent,{}),changedGrant=JSON.parse(JSON.stringify(s));
      changedGrant.settlementLordships.counties[pid].lordships[slot].grantedTurn++;
      const changedGrantBefore=JSON.stringify(changedGrant);
      const boundGrant=FB.eventReviews.quote(changedGrant,rentEvent.options[0],rentContext)===null&&changedGrantBefore===JSON.stringify(changedGrant);
      const incompleteGrant=reviewTools.rejectIncomplete(rentEvent,rentContext,['settlement','episcopalClaimSource']);
      const rentReview=reviewTools.exercise(imported ? 'river_rent_review' : 'religious_life_other_party',function (v) {v.owner[pid]='france_1204';});
      const compensation=imported ? 7 : 12;
      const claimPaid=s.player.gold===200-compensation && C.privateAccount(s,bishop).gold===privateBefore;
      if (imported) {
        s.realms.papacy_1204.liege='france_1204';
        FB.ecclesiasticalGovernment.row(s,'papacy_1204').scope.forEach(function (province) {s.owner[province]='france_1204';});
        FB.invalidateRealmCache();FB.materializeRealmRuler(s,'france_1204');
        const judge=FB.realmRulerCharacterSnapshot(s,'france_1204');
        [{kind:'realm',id:'france_1204'},{kind:'character',id:judge.id}].forEach(function (beneficiary,index) {
          if(!FB.authorityEstablishRight(s,{issuer:{kind:'realm',id:'papacy_1204'},beneficiary:beneficiary,
            scope:{kind:'county',id:pid},power:'peace',basis:'judgment',basisRef:'fictional-river-venue-'+index}))throw new Error('Scoped secular mandate failed');
        });
      }
      const victim=FB.makeCharacter(s,{name:'Recorded local cleric',sex:'m',culture:'italian',religion:'catholic',born:1160,station:1,traitsN:0});
      victim.homeProvinceId=pid;victim.role='priest';victim.career={profession:'priest'};victim.wealth=17;
      s.provChars=s.provChars || {};s.provChars[pid]=s.provChars[pid] || [];s.provChars[pid].push(victim.id);
      const court=C.courtContext(s,FBDATA.religiousCases[discipline]);
      const o=FB.justiceRecordOffense(s,court.courtId,s.player.charId,'abduction','material',true,victim.id,'recorded-review-occurrence');
      if (!o) throw new Error('Canonical offense unavailable');
      function matter(action) {const q=R.quote(s,discipline,o.id,bishop,action);if(!q || !q.allowed || !R.apply(s,q))throw new Error(action+': '+JSON.stringify(q && q.reason));}
      matter('charge');matter('settlement');
      const event=FB.eventById(imported ? 'river_case_review' : 'religious_life_case_consent');
      const ctx=FB.eventContextFor(s,event,{}),offer=R.snapshot(s,discipline,o.id).record.offer;
      const bound=ctx.offenseId===o.id&&ctx.participants.defendant===s.player.charId&&ctx.participants.victim===victim.id&&ctx.participants.bishop===bishop;
      const changedSource=JSON.parse(JSON.stringify(s));changedSource.justice.offenses.find(function (v) {return v.id===o.id;}).sourceId='replacement-source';
      const changedSourceBefore=JSON.stringify(changedSource);
      const boundSource=FB.eventReviews.quote(changedSource,event.options[0],ctx)===null&&changedSourceBefore===JSON.stringify(changedSource);
      const incompleteSource=reviewTools.rejectIncomplete(event,ctx,['offenseId','religiousCaseSource']);
      const privateGold=s.player.gold,seeGold=FB.treasuryAvailable(s,snap.realmId),courtGold=FB.treasuryAvailable(s,court.courtRealmId),victimGold=victim.wealth;
      const caseReview=reviewTools.exercise(event.id,function (v) {v.owner[pid]='france_1204';v.holder[pid]='france_1204';});
      const paid=privateGold-s.player.gold===offer.amount+offer.fee &&
        (imported ? FB.treasuryAvailable(s,snap.realmId)===seeGold&&Math.abs(FB.treasuryAvailable(s,court.courtRealmId)-courtGold-offer.amount)<1e-8 : Math.abs(FB.treasuryAvailable(s,snap.realmId)-seeGold-offer.fee)<1e-8) &&
        victim.wealth-victimGold===(imported ? 0 : offer.amount) && C.privateAccount(s,bishop).gold===privateBefore;
      const distinct=!imported || court.courtRealmId!==snap.realmId&&court.courtId!==bishop;
      const frozen=JSON.stringify(ctx),other=FB.makeCharacter(s,{name:'Unrelated neighbor',sex:'m',culture:'italian',religion:'catholic',born:1170,station:0,traitsN:0});
      other.homeProvinceId=pid;
      const noRecast=JSON.stringify(FB.eventContextFor(s,event,ctx))===frozen;
      const pending=FB.justiceRecordOffense(s,court.courtId,s.player.charId,'abduction','testimony',true,victim.id,'second-recorded-review-occurrence');
      const charge=R.quote(s,discipline,pending.id,bishop,'charge');
      if(!charge.allowed || !R.apply(s,charge))throw new Error('Pending source charge failed');
      const proposal=R.quote(s,discipline,pending.id,bishop,'settlement');
      if(!proposal.allowed || !R.apply(s,proposal))throw new Error('Pending source proposal failed');
      const queued=FB.queueEvent(s,event.id,{offenseId:pending.id});
      const exactQueue=!!queued&&queued.ctx.offenseId===pending.id&&queued.ctx.participants.victim===victim.id;
      return {rent:rentReview,case:caseReview,claimPaid:claimPaid,paid:paid,bound:bound,boundGrant:boundGrant,boundSource:boundSource,incompleteGrant:incompleteGrant,incompleteSource:incompleteSource,distinct:distinct,noRecast:noRecast,exactQueue:exactQueue,saved:reviewTools.save()};
    },imported);
    expectReview(result.rent);expectReview(result.case);
    expect(result).toMatchObject({claimPaid:true,paid:true,bound:true,boundGrant:true,boundSource:true,incompleteGrant:true,incompleteSource:true,distinct:true,noRecast:true,exactQueue:true});
    await roundTrip(page,result.saved);
  });

  test(source+' restricted gifts and completed service conserve institutional property',async function ({page},info) {
    await start(page,info,imported,true);
    const result=await page.evaluate(function (imported) {
      const s=FB.state,c=s.chars[s.player.charId],iid='jewish_sardis_congregation_493',profile='jewish_sardis_giving_493';
      c.religion='jewish';c.born=460;s.player.provinceId='sardis';s.player.gold=100;
      FB.setPlayerTier(s,1,{stationFarewell:false});s.player.manor=null;s.player.landPlotMigration=1;
      s.player.landPlots=[{provinceId:'sardis',settlement:0}];
      const land={provinceId:'sardis',settlement:0,count:1};
      const foundation=FB.religiousPatronageQuote(s,profile,c.id,'foundation',{land:land});
      if(!foundation || !foundation.allowed || !FB.religiousPatronageApply(s,foundation))throw new Error('Foundation: '+JSON.stringify(foundation && foundation.reason));
      const q=FB.religiousInstitutionQuote(s,iid,{kind:'character',id:c.id},'admit',{roleId:'worshipper'});
      if(!q.allowed || !FB.religiousInstitutionApply(s,q))throw new Error('Admission failed');
      const h=s.abbeys.houses.find(function (h) {return h.activityInstitutionId===iid;});
      const property=JSON.stringify([h.plots,h.capital,h.treasury]);
      const gift=reviewTools.exercise(imported ? 'river_fund_review' : 'religious_life_fund_exhausted',function (v) {v.player.gold=0;});
      const amount=2,capacity=h.restrictedFunds.building_care===amount;
      const fundedBefore=h.restrictedFunds.building_care;
      const care=reviewTools.exercise(imported ? 'river_care_review' : 'religious_life_funded_care',function (v) {v.abbeys.houses.find(function (h) {return h.activityInstitutionId===iid;}).restrictedFunds.building_care=0;});
      const commitment=JSON.parse(JSON.stringify(c.religiousActivity));
      const canceled=JSON.parse(JSON.stringify(s));
      const cancel=FB.religiousActivityCancel(canceled,c.id,commitment) && canceled.abbeys.houses.find(function (h) {return h.activityInstitutionId===iid;}).restrictedFunds.building_care===fundedBefore;
      s.turn=c.religiousActivity.dueTurn;FB.religiousActivityTick(s);
      const spent=h.restrictedFunds.building_care===fundedBefore-(imported ? 2 : 1) && !c.religiousActivity &&
        c.religiousActivityHistory[imported ? 'river_care_done' : 'jewish_synagogue_care_done'].rewarded;
      const unchanged=property===JSON.stringify([h.plots,h.capital,h.treasury])&&s.player.landPlots.length===0;
      return {gift:gift,care:care,capacity:capacity,cancel:cancel,spent:spent,unchanged:unchanged,saved:reviewTools.save()};
    },imported);
    expectReview(result.gift);expectReview(result.care);
    expect(result).toMatchObject({capacity:true,cancel:true,spent:true,unchanged:true});
    await roundTrip(page,result.saved);
  });

  test(source+' vows use the live canonical call and preserve obligations on restore',async function ({page},info) {
    await start(page,info,imported);
    const result=await page.evaluate(function (imported) {
      const s=FB.state;
      s.turn=9*360;s.date={year:1213,season:0,day:1};s.chars[s.player.charId].religion='catholic';
      // Stage the ordinary arrival and adult court projections at this boundary.
      FB.localFolkArrive(s,s.player.provinceId);
      Object.keys(s.realms).forEach(function (rid) {FB.materializeRealmConsort(s,rid);});
      const papacy=FB.ensurePapacy(s,'catholic');papacy.obediences[papacy.romanObedience].authority=80;
      s.greatHolyWarHistory.cooldownUntil.catholic=0;
      const target=FB.greatHolyWarTargets(s,'catholic',true).find(function (t) {return t.causeId==='albigensian_protection';});
      if(!target)throw new Error('Regional target unavailable');
      const call=FB.callGreatHolyWar(s,'catholic',target.targetId,'papacy_1204');
      if(!call)throw new Error('Canonical call failed');
      const regional=FB.checkTrigger(s,FB.eventById('religious_life_regional_call').trigger,{});
      const facts=JSON.stringify([s.owner,s.holder,s.player.gold]),id=imported ? 'river_vow_review' : 'religious_life_call';
      const review=reviewTools.exercise(id,function (v) {v.chars[v.player.charId].captive=true;});
      const vow=s.player.greatHolyWar,valid=regional && vow.vowTerms.seasons===(imported ? 8 : 4) && vow.vowTerms.desire.kind===(imported ? 'neutral' : 'honor') &&
        vow.campaignId===call.id && facts===JSON.stringify([s.owner,s.holder,s.player.gold]);
      return {review:review,valid:valid,saved:reviewTools.save()};
    },imported);
    expectReview(result.review);expect(result.valid).toBe(true);
    await roundTrip(page,result.saved);
  });
}

test('phone review Cancel and Escape retain the exact event, parties, scroll and focus',async function ({page},info) {
  await start(page,info,false);
  await page.setViewportSize({width:390,height:844});
  await page.evaluate(function () {
    const s=FB.state;
    FB.rememberSettlementSites(s,'roma');FB.assignSettlementLordship(s,'roma',1,s.player.charId);
    const ev=FB.eventById('religious_life_charter'),ctx=FB.eventContextFor(s,ev,{});
    if (!ctx || !ctx.participants.bishop) throw new Error('Missing named rent parties');
    FB.game.auto.all=false;FB.game.auto.major=false;FB.game.auto.minor=false;
    FB.ui.runEvents([{id:ev.id,ctx:ctx}],{syncRulers:false});
    const extra=document.createElement('div');extra.style.height='900px';document.getElementById('ev-text').appendChild(extra);
    document.querySelector('#eventmodal .modalcard').scrollTop=150;
    window.cancelCheckpoint=reviewTools.exact();
  });
  async function ready() {await expect.poll(function () {return page.evaluate(function () {return !FB.ui.eventInputGuarded();});}).toBe(true);}
  for(const exit of ['cancel','escape']) {
    await ready();
    await page.locator('#ev-options .evopt').first().click();
    await expect(page.locator('#event-review-confirm')).toBeVisible();
    await expect(page.locator('[data-event-participant="bishop"]')).toBeVisible();
    await ready();
    if(exit==='cancel')await page.locator('#event-review-cancel').click();else await page.keyboard.press('Escape');
    await expect(page.locator('#event-review-confirm')).toHaveCount(0);
    await expect(page.locator('#ev-options .evopt').first()).toBeFocused();
    await expect(page.locator('[data-event-participant="bishop"]')).toBeVisible();
    expect(await page.evaluate(function () {return cancelCheckpoint===reviewTools.exact();})).toBe(true);
    expect(await page.evaluate(function () {return document.querySelector('#eventmodal .modalcard').scrollTop;})).toBeGreaterThan(0);
  }
});


// Reviewed counts and category totals live in fixtures/engine-ids/content-id-allowlist.json and content-id-metric.json; change them with the source.
test('religious adapters retain closed content identity reviews and exact owner protocol counts',async function ({page},info) {
  await openGame(page,info);
  const tables=await page.evaluate(function () {
    const out={};
    function plain(v) {return !!v&&Object.prototype.toString.call(v)==='[object Object]';}
    function walk(name,v,depth) {
      if(Array.isArray(v)) {const ids=v.filter(function (r) {return plain(r)&&typeof r.id==='string';}).map(function (r) {return r.id;});if(ids.length)out[name]=ids;return;}
      if(!plain(v))return;const keys=Object.keys(v);if(!keys.length)return;
      if(keys.every(function (k) {return plain(v[k]);})) {out[name]=keys;return;}
      if(depth<2)keys.forEach(function (k) {walk(name+'.'+k,v[k],depth+1);});
    }
    Object.keys(FBDATA).forEach(function (k) {walk(k,FBDATA[k],0);});return out;
  });
  const reviews=require('../fixtures/engine-ids/content-id-allowlist.json'),owners=new Map();
  Object.keys(tables).forEach(function (table) {
    if(reviews.ignoredTables.some(function (r) {return table===r.table||table.indexOf(r.table+'.')===0;}))return;
    tables[table].forEach(function (id) {if(id.length>=3)owners.set(id,[table]);});
  });
  const sources=engineSources(),counts=quotedCounts(sources);
  const ownedFiles=new Set(['js/schema.js','js/events.js','js/religious_institutions.js','js/religious_activities.js','js/episcopal_claims.js','js/religious_cases.js','js/holywar.js']);
  sources.filter(function (source) {return ownedFiles.has(source.file);}).forEach(function (source) {
    new Set(source.scan.literals.map(function (row) {return row.value;})).forEach(function (id) {
      if(!owners.has(id))return;
      const review=reviews.hooks.find(function (hook) {return hook.id===id;});
      expect(review && review.uses[source.file],source.file+': '+id).toBe(counts.get(source.file+'\n'+id));
    });
  });
  for(const hook of reviews.hooks)for(const file of ['js/schema.js','js/events.js','js/religious_institutions.js','js/religious_activities.js','js/episcopal_claims.js','js/religious_cases.js','js/holywar.js'])
    if(Object.prototype.hasOwnProperty.call(hook.uses || {},file))expect(counts.get(file+'\n'+hook.id)||0,file+': '+hook.id).toBe(hook.uses[file]);
});


test('a blocked rent review takes the declared costless automated refusal',async function ({page},info) {
  await start(page,info,false);
  const result=await page.evaluate(function () {
    const s=FB.state;FB.rememberSettlementSites(s,'roma');FB.assignSettlementLordship(s,'roma',1,s.player.charId);
    const C=FB.episcopalClaims,snap=C.snapshot(s,'roman_temporal_rent',1);
    ['demand','compensation'].forEach(function (action) {const q=C.quote(s,'roman_temporal_rent',1,snap.bishopId,action);if(!q.allowed || !C.apply(s,q))throw new Error('Offer staging failed');});
    const ev=JSON.parse(JSON.stringify(FB.eventById('religious_life_other_party'))),ctx=FB.eventContextFor(s,ev,{});
    ev.options[0].review.args.action='adjudicate';
    const before=reviewTools.facts(s),rng=FB.getRngState(),uid=FB.getUidCounter();
    const q=FB.eventReviews.quote(s,ev.options[0],ctx);
    const receipt=FB.resolveEventOption(s,ev,ev.options[0],ctx,{automated:true});
    return !!q&&!q.quote.allowed&&!!receipt&&receipt.optionIndex===1&&before===reviewTools.facts(s)&&rng===FB.getRngState()&&uid===FB.getUidCounter();
  });
  expect(result).toBe(true);
});


test('typed review candidates reject unknown authority and missing named parties atomically',async function ({page},info) {
  await openGame(page,info);await prepareGameContent(page);
  for(const file of examples) {
    const mod=require(path.resolve(__dirname,'../fixtures/authoring',file));
    const result=await page.evaluate(function (mod) {
      const before=JSON.stringify(FBDATA),rng=FB.getRngState(),uid=FB.getUidCounter(),storage=JSON.stringify(localStorage);
      const valid=FB.mods.validate(mod),trials=[];
      mod.events.forEach(function (ev,index) {
        const bad=JSON.parse(JSON.stringify(mod));bad.events[index].options[0].review.args.unknownAuthority=true;
        trials.push(bad);
        if(ev.participants) {const missing=JSON.parse(JSON.stringify(mod));missing.events[index].participants=[];missing.events[index].participantCards=[];trials.push(missing);}
      });
      const rejected=trials.every(function (bad) {
        let failed=false;try {FB.mods.apply(bad);}catch(error) {failed=true;}
        return failed&&FB.mods.validate(bad).length>0;
      });
      return {valid:valid,rejected:rejected,pure:before===JSON.stringify(FBDATA)&&rng===FB.getRngState()&&uid===FB.getUidCounter()&&storage===JSON.stringify(localStorage)};
    },mod);
    expect(result).toEqual({valid:[],rejected:true,pure:true});
  }
});
