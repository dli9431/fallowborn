'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'data/story_courts_476.js',
  'index.html','data/bookmark_476.js','data/bookmark_476_italy.js','data/bookmarks.js',
  'data/bookmark_476_africa.js','data/bookmark_476_dalmatia_east.js','data/bookmark_476_gaul_iberia.js',
  'data/settlements.js','data/geographies.js','data/starts.js','data/eras.js','data/technology.js','data/systems.js','data/traits.js',
  'data/political_institutions.js','data/story_campaigns.js','data/cultures.js',
  'js/bookmark_setup.js','js/story_agreements.js','data/story_instances.js','js/story_campaign.js',
  'js/story_courts.js','js/stories.js','js/starts.js','js/authority.js','js/treasury.js',
  'js/population.js','js/world.js','js/model.js','js/institutions.js','js/religion.js','js/events.js',
  'js/save.js','js/save_v4.js','js/ui_modals.js','js/main.js','js/technology.js','js/systems.js','js/settlement.js','js/federates.js',
  'data/distribution_crazygames.js','js/crazygames.js'
]);
const { test, expect } = require('../support/fixture');
const { startHistoricalGame } = require('../support/game/historical-start');
const { openGame } = require('../support/game/navigation');

async function start(page, testInfo, crazygames) {
  await startHistoricalGame(page, testInfo, { bookmark:'476',
    code:'ITALYFOLLOWUP-476-federate_476-ravenna-m-Marcus-standard-0-gothic.homoian' }, crazygames);
}
async function startOdoacer(page, testInfo) {
  await openGame(page, testInfo);
  await page.evaluate(function () {
    FBDATA.startScenarios.find(function (s) { return s.id === 'odoacer_476'; }).hidden = false;
  });
  const full = page.locator('#btn-choose-beginning');
  if (await full.isVisible()) await full.click();
  else await page.getByRole('button', { name:'New Game', exact:true }).click();
  await page.locator('#btn-bm-seed').click();
  await page.locator('#ng-seed').fill('ITALYFOLLOWUP-476-odoacer_476-pavia-m-Odoacer');
  await page.locator('#ng-seed').press('Enter');
  await expect(page.locator('#chargen:not(.hidden)')).toBeVisible();
  await page.getByRole('button', { name:'Begin Your Story', exact:true }).click();
  await page.getByRole('button', { name:'Begin', exact:true }).click();
  await page.evaluate(function () { FB.game.setPaused(true); });
}

for (const crazygames of [false,true]) {
  test('declarative Italian families, property and civilian seeds restore once, distribution ' + crazygames,
    async function ({ page }, testInfo) {
      await start(page,testInfo,crazygames);
      const result = await page.evaluate(function () {
        const s=FB.state, w=s.stories.western_court_476, setup=s.bookmarkSetup;
        const father=FB.bookmarkActor(s,'basilius'), son=FB.bookmarkActor(s,'senator');
        const estate=FB.privateEstates(s,father.id)[0];
        const ownership=JSON.stringify([s.owner,s.holder]);
        const migration=setup.migrations[0];
        const cohorts=FB.countyCommunities(s,'linz').concat(FB.countyCommunities(s,'wien'));
        const total=cohorts.reduce(function (n,c) {return n+c.count;},0);
        const scoped=s.authority.appointments.find(function (a) {return a.id===w.orestesOfficeId;});
        const stored=JSON.stringify([setup,s.population,s.authority]);
        const rng=FB.getRngState(),count=Object.keys(s.chars).length;
        FB.stories.start(s,{});
        const repeat=stored===JSON.stringify([setup,s.population,s.authority]) && rng===FB.getRngState() && count===Object.keys(s.chars).length;
        const saved=JSON.parse(FB.save.serialize());
        // The v4 serializer stamps authority.schema on its detached copy.
        const before=[saved.state.bookmarkSetup,saved.state.population,saved.state.authority];
        FB.save.restore(saved);
        const after=JSON.parse(JSON.stringify([FB.state.bookmarkSetup,FB.state.population,FB.state.authority]));
        const rngAfter=FB.getRngState(), countAfter=Object.keys(FB.state.chars).length;
        FB.save.restore(JSON.parse(FB.save.serialize()));
        const again=JSON.parse(JSON.stringify([FB.state.bookmarkSetup,FB.state.population,FB.state.authority]));
        return { name:son.name,linked:son.fatherId===father.id && father.childrenIds.includes(son.id),
          scoped:scoped.scope.kind==='host' && scoped.scope.id==='host_476_italy' && scoped.holder.id===w.orestesId,
          privateProperty:estate.basis==='tenure' && estate.evidence==='decian_family_property_476' && estate.share0===1000,
          noPublicGrant:!s.authority.rights.some(function (r) {return r.beneficiary.id===father.id;}),
          demanded:setup.claims[0].status==='demanded' && setup.claims[0].contractId===null,
          civilians:migration.count>0 && migration.cohorts.every(function (c) {return c.culture==='roman' && c.religion==='nicene';}),
          exact:total===FB.countyPopulation(s,'linz')+FB.countyPopulation(s,'wien'),
          noTerritorialMove:ownership===JSON.stringify([FB.state.owner,FB.state.holder]),repeat:repeat,
          before:before,after:after,again:again,
          restored:rngAfter===FB.getRngState() && countAfter===Object.keys(FB.state.chars).length,
          modes:['historical_opening_households','private_family_estates','non_episcopal_congregations','tribute_cession_agreements','civilian_evacuation']
            .map(function (id) {return FBDATA.techImpactReviews.features[id].mode;}),
          technology:FB.validateTechnologyData(),bookmark:FB.validateBookmark(FB.bookmark('476')) };
      });
      expect(result.after).toEqual(result.before);
      expect(result.again).toEqual(result.after);
      delete result.before; delete result.after; delete result.again;
      expect(result).toEqual({name:'Caecina Decius Maximus Basilius',linked:true,scoped:true,privateProperty:true,
        noPublicGrant:true,demanded:true,civilians:true,exact:true,noTerritorialMove:true,repeat:true,restored:true,
        modes:['none','none','none','none','none'],technology:[],bookmark:[]});
    });
}

test('historical bishops and a non-episcopal congregation use separate living identities', async function ({page},testInfo) {
  await start(page,testInfo);
  const result=await page.evaluate(function () {
    const s=FB.state,bishop=FB.religiousOfficeSnapshot(s,'ticinum_bishop');
    const id='favianis_congregation',rep=s.chars[s.localInstitutions[id].representativeId];
    const support=FB.localInstitutionMediate(s,id,{kind:'realm',id:'rugi_476'},'wien');
    const notBishop=Object.keys(s.religiousHeads).every(function (key) {return s.religiousHeads[key]!==rep.id;});
    const mediated=!!support && support.issuer.kind==='character' && support.issuer.id===rep.id;
    const noTemporalPower=!FB.political.power(s,{kind:'character',id:rep.id},'peace',{provinceId:'wien'}).allowed;
    const pure=JSON.stringify([s.localInstitutions,s.chars]),rng=FB.getRngState();
    FB.localInstitutionList(s,'church'); FB.stories.cards(s);
    const readsPure=pure===JSON.stringify([s.localInstitutions,s.chars]) && rng===FB.getRngState();
    s.chars[s.player.charId].religion=rep.religion;
    FB.ui.showLocalInstitutions('church');
    const mediationUi=!!document.querySelector('[data-local-review="favianis_congregation"][data-local-action="mediate"]');
    rep.dead=true;
    const lost=FB.political.legitimacy(s,{kind:'realm',id:'rugi_476'},{kind:'county',id:'wien'},'church_support').length===0;
    s.turn=90; FB.localInstitutionsSeason(s);
    const successor=s.chars[s.localInstitutions[id].representativeId];
    FB.save.restore(JSON.parse(FB.save.serialize()));
    return {born:bishop.born,age:FB.ageOf(bishop,476),skills:bishop.skills.dip,role:rep.role,name:rep.name,
      notBishop:notBishop,mediated:mediated,noTemporalPower:noTemporalPower,readsPure:readsPure,mediationUi:mediationUi,lost:lost,
      successor:successor.id!==rep.id && successor.role==='monk' && successor.name!=='Severinus'};
  });
  expect(result).toEqual({born:438,age:38,skills:12,role:'monk',name:'Severinus',notBishop:true,
    mediated:true,noTemporalPower:true,readsPure:true,mediationUi:true,lost:true,successor:true});
});

test('independent settlement mixes conserve both margins and private estates inherit without conquest', async function ({page},testInfo) {
  await start(page,testInfo);
  const result=await page.evaluate(function () {
    const s=FB.state,county=FB.countyCommunities(s,'linz'),sites=[0,1].map(function (slot) {return FB.settlementCommunities(s,'linz',slot);});
    const local=sites.map(function (rows) {return rows.filter(function (c) {return c.religion==='homoian';}).reduce(function (n,c) {return n+c.count;},0);});
    const count=FB.settlementPopulations(s,'linz');
    const before=JSON.stringify(s.owner),population=JSON.stringify(s.population);
    const parent=FB.bookmarkActor(s,'basilius'),heir=FB.bookmarkActor(s,'senator');
    parent.dead=true;
    // The ordinary story dispatch observes death; no initialization runs.
    FB.stories.day(s);
    const estate=FB.privateEstates(s,heir.id)[0];
    const stored=JSON.stringify(s.bookmarkSetup.estates);
    FB.save.restore(JSON.parse(FB.save.serialize()));
    return {different:local[0]>local[1],rowTotals:sites.every(function (rows,i) {return rows.reduce(function (n,c) {return n+c.count;},0)===count[i];}),
      columnTotal:local[0]+local[1]===county.filter(function (c) {return c.religion==='homoian';}).reduce(function (n,c) {return n+c.count;},0),
      inherited:!!estate && estate.dynasty===heir.dyn,unchanged:before===JSON.stringify(s.owner) && population===JSON.stringify(s.population),
      durable:stored===JSON.stringify(FB.state.bookmarkSetup.estates)};
  });
  expect(result).toEqual({different:true,rowTotals:true,columnTotal:true,inherited:true,unchanged:true,durable:true});
});

test('Italian selectors follow live event context through restore and reject malformed authoring',async function ({page},testInfo) {
  await start(page,testInfo);
  const result=await page.evaluate(function () {
    const s=FB.state,event=FB.eventById('italy_476_civic_records');
    const atHome=FB.checkTrigger(s,event.trigger),outside=FB.checkTrigger(s,event.trigger,{locationId:'split'});
    s.player.provinceId='split';
    const context=FB.checkTrigger(s,event.trigger,{locationId:'ravenna'}),nowOutside=FB.checkTrigger(s,event.trigger);
    let rejected=0;
    [[],['ravenna','ravenna'],['not_a_county'],'ravenna',[42]].forEach(function (ids) {
      try {FB.validateCommunityEvent({trigger:{countyIds:ids}});} catch (e) {rejected++;}
    });
    FB.save.restore(JSON.parse(FB.save.serialize()));
    const loaded=!FB.checkTrigger(FB.state,event.trigger) && FB.checkTrigger(FB.state,event.trigger,{locationId:'ravenna'});
    const bm=JSON.parse(JSON.stringify(FB.bookmark('476')));
    bm.opening.actors.senator.father='missing_actor';
    const badActor=FB.validateBookmark(bm).length>0;
    bm.opening=JSON.parse(JSON.stringify(FB.bookmark('476').opening));
    bm.opening.appointments.ravenna_delegate.scope.id='split';
    const badScope=FB.validateBookmark(bm).length>0;
    const saved=JSON.parse(FB.save.serialize());
    saved.state.bookmarkSetup.estates[0].share0=10001;
    let badSave=false; try {FB.save.v4.validatePlatform(saved.state);} catch (e) {badSave=true;}
    return {atHome:atHome,outside:outside,context:context,nowOutside:nowOutside,rejected:rejected,loaded:loaded,badActor:badActor,badScope:badScope,badSave:badSave};
  });
  expect(result).toEqual({atHome:true,outside:false,context:true,nowOutside:false,rejected:5,loaded:true,badActor:true,badScope:true,badSave:true});
});

for (const ending of ['paid','unpaid','succession','foothold_lost']) {
  test('Sicilian bilateral consent and durable tribute: '+ending,async function ({page},testInfo) {
    await startOdoacer(page,testInfo);
    const result=await page.evaluate(function (ending) {
      const s=FB.state,id='sicilian_tribute_476',story=FB.stories.get(id),r=s.stories[id];
      FB.transferProvince(s,'ravenna','player');
      s.turn=270;s.player.gold=100;
      const population=JSON.stringify(s.population);
      story.day(s,r);
      const waiting=r.phase==='pending' && r.approvals.player===undefined && r.approvals.aghlabids!==undefined && s.owner.messina==='aghlabids';
      const reviewed=FB.stories.quote(s,id,'approve');
      s.player.gold++;
      const stale=!FB.stories.apply(s,id,'approve',reviewed) && s.owner.messina==='aghlabids';
      const accepted=FB.stories.apply(s,id,'approve',FB.stories.quote(s,id,'approve'));
      const first=s.player.gold,paid=r.totalPaid;
      const ceded=s.owner.messina==='player' && s.owner.siracusa==='player' && s.owner.palermo==='aghlabids';
      const stored=JSON.stringify(r);
      FB.save.restore(JSON.parse(FB.save.serialize()));
      const restored=JSON.stringify(FB.state.stories[id])===stored && FB.state.player.gold===first;
      const live=FB.state,record=live.stories[id];
      if (ending==='unpaid') live.player.gold=0;
      if (ending==='succession') live.realms.aghlabids.ruler.generation=FB.realmRulerGeneration(live,'aghlabids')+1;
      if (ending==='foothold_lost') FB.transferProvince(live,'palermo','player');
      live.turn=630;
      story.day(live,record);
      const after=live.player.gold,recorded=JSON.stringify(record);
      story.day(live,record);
      return {waiting:waiting,stale:stale,accepted:accepted,ceded:ceded,firstPaid:paid,
        firstCost:101-first,restored:restored,population:population===JSON.stringify(live.population),
        phase:record.phase,result:record.result,reason:record.reason,
        laterPaid:record.totalPaid,repeat:after===live.player.gold && recorded===JSON.stringify(record)};
    },ending);
    expect(result).toMatchObject({waiting:true,stale:true,accepted:true,ceded:true,firstPaid:20,firstCost:20,restored:true,population:true,repeat:true});
    expect(result).toMatchObject(ending==='paid' ? {phase:'active',result:null,laterPaid:40} : ending==='unpaid'
      ? {phase:'resolved',result:'breached',reason:'unpaid',laterPaid:20} : {phase:'resolved',result:'interrupted',laterPaid:20});
  });
}

test('a court may decline the Sicilian agreement without affording tribute',async function ({page},testInfo) {
  await startOdoacer(page,testInfo);
  const result=await page.evaluate(function () {
    const s=FB.state,id='sicilian_tribute_476';
    FB.transferProvince(s,'ravenna','player');s.turn=270;s.player.gold=0;
    const before=JSON.stringify([s.owner,s.population,s.player.gold]);
    const unaffordable=!FB.stories.quote(s,id,'approve').allowed;
    const q=FB.stories.quote(s,id,'decline');
    const declined=q.allowed && FB.stories.apply(s,id,'decline',q);
    FB.save.restore(JSON.parse(FB.save.serialize()));
    return {unaffordable:unaffordable,declined:declined,unchanged:before===JSON.stringify([FB.state.owner,FB.state.population,FB.state.player.gold]),
      result:FB.state.stories[id].result,reason:FB.state.stories[id].reason};
  });
  expect(result).toEqual({unaffordable:true,declined:true,unchanged:true,result:'diverted',reason:'declined'});
});

test('agreement save validation rejects unearned payments and fabricated civilian arrivals before adoption',async function ({page},testInfo) {
  await start(page,testInfo);
  const result=await page.evaluate(function () {
    const source=FB.save.serialize();
    return [function (s) {s.stories.sicilian_tribute_476.totalPaid=20;},function (s) {
      const r=s.stories.norican_evacuation_476;
      r.phase='active';r.actorId=s.stories.western_court_476.odoacerId;
      r.actorGeneration=FB.realmRulerGeneration(s,'federates_476');r.lastPeriod=0;
      r.routes=[{from:'wien',to:'ravenna',planned:10,moved:11}];
    }].map(function (mutate) {
      const saved=JSON.parse(source),live=FB.state;mutate(saved.state);
      let rejected=false;try {FB.save.restore(saved);} catch (e) {rejected=true;}
      return rejected && FB.state===live;
    });
  });
  expect(result).toEqual([true,true]);
});

test('a calendar year alone cannot evacuate Noricum; authorized batches conserve cohorts and stop on changed control',async function ({page},testInfo) {
  await startOdoacer(page,testInfo);
  const result=await page.evaluate(function () {
    const s=FB.state,id='norican_evacuation_476',story=FB.stories.get(id),r=s.stories[id];
    s.date.year=488;s.turn=12*360;
    const opening=JSON.stringify(s.population);
    story.day(s,r);
    const noDate=opening===JSON.stringify(s.population) && r.phase==='pending';
    FB.transferProvince(s,'ravenna','player');FB.transferProvince(s,'wien','player');
    const campaign=s.stories.rugian_frontier_476;
    campaign.phase='resolved';campaign.result='won';campaign.reason='objective_secured';campaign.outcomeTurn=s.turn;
    story.day(s,r);
    const waiting=r.phase==='pending' && opening===JSON.stringify(s.population);
    function cohorts() {
      const total={};['wien','ravenna'].forEach(function (pid) {FB.countyCommunities(s,pid).forEach(function (c) {
        const key=c.culture+'|'+c.religion;total[key]=(total[key]||0)+c.count;
      });});return total;
    }
    const before=JSON.stringify(cohorts()),source=FB.countyPopulation(s,'wien');
    const accepted=FB.stories.apply(s,id,'authorize',FB.stories.quote(s,id,'authorize'));
    const first=r.routes[0].moved,owner=JSON.stringify(s.owner),rng=FB.getRngState();
    story.day(s,r);
    const once=r.routes[0].moved===first && rng===FB.getRngState();
    s.turn+=90;story.day(s,r);
    const second=r.routes[0].moved,conserved=before===JSON.stringify(cohorts());
    const stored=JSON.stringify(r),population=JSON.stringify(s.population);
    FB.save.restore(JSON.parse(FB.save.serialize()));
    const restored=stored===JSON.stringify(FB.state.stories[id]) && population===JSON.stringify(FB.state.population);
    const live=FB.state;FB.transferProvince(live,'ravenna','italy');
    const count=FB.countyPopulation(live,'wien');live.turn+=90;story.day(live,live.stories[id]);
    return {noDate:noDate,waiting:waiting,accepted:accepted,first:first,second:second,once:once,conserved:conserved,
      demographicChange:source-FB.countyPopulation(s,'wien')===second,ownership:owner===JSON.stringify(s.owner),
      restored:restored,stopped:live.stories[id].result==='interrupted' && count===FB.countyPopulation(live,'wien')};
  });
  expect(result).toEqual({noDate:true,waiting:true,accepted:true,first:1000,second:2000,once:true,conserved:true,
    demographicChange:true,ownership:true,restored:true,stopped:true});
});

test('legacy saves without opening records do not manufacture property, cohorts or agreements on restore',async function ({page},testInfo) {
  await start(page,testInfo);
  const result=await page.evaluate(function () {
    const saved=JSON.parse(FB.save.serialize());
    delete saved.state.bookmarkSetup;
    delete saved.state.stories.sicilian_tribute_476;
    delete saved.state.stories.norican_evacuation_476;
    const population=JSON.stringify(saved.state.population),ids=Object.keys(saved.state.chars).length;
    FB.save.restore(saved);
    return {absent:FB.state.bookmarkSetup===undefined && !FB.state.stories.sicilian_tribute_476 && !FB.state.stories.norican_evacuation_476,
      population:population===JSON.stringify(FB.state.population),actors:ids===Object.keys(FB.state.chars).length};
  });
  expect(result).toEqual({absent:true,population:true,actors:true});
});
