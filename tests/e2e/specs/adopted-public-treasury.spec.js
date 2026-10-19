'use strict';
const path = require('path');
const {test,expect} = require('../support/fixture');
const {openGame} = require('../support/game/navigation');
const {beginBookmark} = require('../support/game/bookmark-acceptance');
const {dependsOnRuntime} = require('../support/runtime-dependencies');
const examples = {
  harbor:require('../fixtures/authoring/adopted-public-treasury-harbor.json'),
  dune:require('../fixtures/authoring/adopted-public-treasury-dune.json')
};
dependsOnRuntime(__filename,['index.html','data/technology.js','data/political_institutions.js','data/units.js','data/markets.js',
  'js/treasury.js','js/starts.js','js/world.js','js/main.js','js/actions.js','js/save.js','js/save_v4.js',
  'js/mods.js','js/model.js','js/lordships.js','js/market.js','js/logistics.js','js/armies.js',
  'js/home_authority.js','js/mobile_confederations.js','js/mobile_command.js','js/story_expedition_preparation.js',
  'js/government_lineage.js','js/government_elective.js','js/government_administration.js','js/government_civic.js',
  'js/civic_transactions.js','js/agency.js','js/economy.js','js/events.js','js/institutions.js','js/intrigue.js',
  'js/justice.js','js/religious_institutions.js','js/story_track.js','js/fiscal.js','js/building_operations.js',
  'js/fortifications.js','js/fort_profiles.js','js/ui_modals.js']);

async function importWorld(page,info,prefix,modified) {
  await openGame(page,info);
  await page.evaluate(function(){FB.ui.showMods();});
  await page.locator('#modfile').setInputFiles(modified ? {name:'public-treasury.json',mimeType:'application/json',
    buffer:Buffer.from(JSON.stringify(modified))} : path.resolve(__dirname,'../fixtures/authoring/adopted-public-treasury-'+prefix+'.json'));
  await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded'}),page.locator('#mod-apply').click()]);
  await page.waitForFunction(function(prefix){return window.FB && FB.game && FB.game.bootReady && FBDATA.bookmarks[prefix+'_world'];},prefix);
}
async function begin(page,prefix,entry,revision) {
  await page.evaluate(function(input){
    FBDATA.bookmarks[input.prefix+'_world'].revision=input.revision;
    FB.startProgression.noteTier(4);
    window.publicBoot={adoptions:[],accounts:[]};
    const adopt=FB.adoptStartingRealm,initialize=FB.treasuryInitialize;
    FB.adoptStartingRealm=function(s,scenario,options){
      const from=s.realms[scenario.rulerRealmId],row=from && from.treasury,
        before=row && JSON.stringify(row),form=from && FB.governments.forRealm(s,scenario.rulerRealmId).id,
        person=s.player.charId,liege=from && from.liege;
      const result=adopt(s,scenario,options);
      publicBoot.adoptions.push({result:result,hadAccount:!!row,
        same:!row || row===s.realms.player.treasury,publicGold:row && row.gold,
        cashUnchanged:!row || before===JSON.stringify(Object.assign({},row,{publicOwnerId:undefined})),
        privateGold:s.player.gold,form:FB.governments.forRealm(s,'player').id,
        sameForm:form===FB.governments.forRealm(s,'player').id,samePerson:person===s.player.charId,
        sameLiege:(liege || null)===(s.player.liege || null)});
      return result;
    };
    FB.treasuryInitialize=function(s,options){
      const result=initialize(s,options);
      publicBoot.accounts.push({adopted:!!s.realms.player,
        publicGold:s.realms.player && s.realms.player.treasury && s.realms.player.treasury.gold,
        privateGold:s.player.gold});
      return result;
    };
  },{prefix:prefix,revision:revision || 'local_policy'});
  const full=page.locator('#btn-choose-beginning');
  if(await full.isVisible()) await full.click();
  else await page.getByRole('button',{name:'New Game',exact:true}).click();
  const sc=examples[prefix].startScenarios[1];
  if(entry==='picker') {
    await page.locator('[data-bookmark="'+prefix+'_world"]').click();
    await page.locator('[data-scenario="'+sc.id+'"]').click();
  } else {
    await page.locator('#btn-bm-seed').click();
    await page.locator('#ng-seed').fill('PUBLICCASH-'+prefix+'_world-'+sc.id+'-'+sc.fixedProvinceId+'-'+sc.sex+'-'+sc.characterName.replace(/ /g,'_')+'-standard');
    await page.locator('#ng-seed').press('Enter');
  }
  await expect(page.locator('#chargen:not(.hidden)')).toBeVisible();
  await page.getByRole('button',{name:'Begin Your Story',exact:true}).click();
  await page.getByRole('button',{name:'Begin',exact:true}).click();
  await page.evaluate(function(){FB.game.setPaused(true);FB.game.uiPrefs.hideTips=true;});
}

for(const prefix of ['harbor','dune']) {
  for(const entry of ['picker','code']) {
    test(prefix+' '+entry+' conserves the original account through real ordinary adoption',async function({page},info){
      await importWorld(page,info,prefix);await begin(page,prefix,entry);
      const result=await page.evaluate(function(prefix){
        const s=FB.state,sc=FBDATA.startScenarios.find(function(r){return r.id===prefix+'_home_start';}),
          boot=publicBoot.adoptions[0],row=s.realms.player.treasury,before=JSON.stringify(s),
          rng=FB.getRngState(),uid=FB.getUidCounter();
        const q=FB.treasuryPublicAccountSnapshot(s,'player'),valid=FB.treasuryValidatePreservation(s),
          again=FB.adoptStartingRealm(s,sc);
        return {one:publicBoot.adoptions.length===2 && publicBoot.adoptions[1].result===false,
          initial:boot.result && boot.sameForm && boot.samePerson && boot.sameLiege,
          same:prefix==='harbor' ? boot.hadAccount && boot.same && boot.cashUnchanged && boot.publicGold===row.gold :
            !boot.hadAccount && publicBoot.accounts[0].adopted && publicBoot.accounts[0].publicGold===row.gold,
          public:q.gold===row.gold && q.available===Math.max(0,row.gold-row.militaryAccrued),
          private:s.player.gold===sc.gold,owner:row.publicOwnerId===s.start.rulerRealmId,
          original:FB.bookmarkActor(s,prefix+'_home_ruler').id===s.player.charId,
          form:FB.governments.forRealm(s,'player').id,valid:valid,again:again,
          pure:before===JSON.stringify(s) && rng===FB.getRngState() && uid===FB.getUidCounter()};
      },prefix);
      expect(result).toEqual({one:true,initial:true,same:true,public:true,private:true,owner:true,original:true,
        form:'territorial',valid:true,again:false,pure:true});
    });
  }

  test(prefix+' retained revision keeps the unified dynastic purse and legacy restore',async function({page},info){
    await importWorld(page,info,prefix);await begin(page,prefix,'code','baseline');
    const result=await page.evaluate(function(){
      const s=FB.state,before=s.player.gold,save=FB.save.serialize();
      FB.save.restore(JSON.parse(save));FB.save.restore(JSON.parse(save));
      return {absent:FB.state.start.publicTreasury===undefined,noPublic:!FB.treasuryPublicAccountSnapshot(FB.state,'player'),
        unchanged:FB.state.player.gold===before,valid:FB.treasuryValidatePreservation(FB.state)};
    });
    expect(result).toEqual({absent:true,noPublic:true,unchanged:true,valid:true});
  });

  test(prefix+' the unadopted original realm remains an ordinary NPC public account',async function({page},info){
    await importWorld(page,info,prefix);
    await beginBookmark(page,info,prefix+'_world',prefix+'_household');
    const result=await page.evaluate(function(prefix){
      const s=FB.state,original=prefix==='harbor'?'harbor_upland':'dune_gate',
        publicBefore=JSON.stringify(s.realms[original].treasury),privateBefore=s.player.gold,save=FB.save.serialize();
      FB.save.restore(JSON.parse(save));
      return {public:!!FB.treasuryPublicAccountSnapshot(FB.state,original),absent:FB.state.start.publicTreasury===undefined,
        unchanged:publicBefore===JSON.stringify(FB.state.realms[original].treasury) && privateBefore===FB.state.player.gold,
        valid:FB.treasuryValidatePreservation(FB.state)};
    },prefix);
    expect(result).toEqual({public:true,absent:true,unchanged:true,valid:true});
  });

  test(prefix+' public grants private gifts and actual formation conserve distinct owners exactly once',async function({page},info){
    await importWorld(page,info,prefix);await begin(page,prefix,'code');
    const result=await page.evaluate(function(prefix){
      const s=FB.state,H=FB.homeAuthority,P=FB.expeditionPreparation,id=prefix+'_preparation',
        d=FB.stories.get(id).declaration,rid=d.realmId,actor=s.player.charId;
      s.realms.player.treasury.gold=200;
      const initial=JSON.stringify([s.realms,s.player.gold,s.market,s.population,s.chars]),
        publicBefore=s.realms.player.treasury.gold,privateBefore=s.player.gold,
        gift=H.fundingQuote(s,{source:{kind:'private',characterId:actor},recipientRealmId:rid,amount:2,characterId:actor}),
        pure=initial===JSON.stringify([s.realms,s.player.gold,s.market,s.population,s.chars]),
        gifted=H.fund(s,gift),giftAgain=H.fund(s,gift),privateAfter=s.player.gold,
        grant=P.review(s,id,'grant',actor),paid=P.commit(s,grant),again=P.commit(s,grant),
        consent=P.commit(s,P.review(s,id,'authorize',actor)),stock=FB.marketProvisionSnapshot(s,s.player.provinceId).stock,
        beforeProvider=s.realms.player.treasury.gold,form=P.review(s,id,'form',actor),
        formed=P.commit(s,form),repeat=P.commit(s,form);
      if(!formed) return {gifted:gifted,paid:paid,consent:consent,formed:formed,reason:form.reason};
      return {gifted:gifted,giftAgain:giftAgain,private:privateAfter===privateBefore-2 && s.player.gold===privateAfter,
        paid:paid,again:again,consent:consent,formed:formed,repeat:repeat,pure:pure,
        grantDebit:Math.abs(beforeProvider-(publicBefore-grant.cost))<1e-8,
        seller:Math.abs(s.realms.player.treasury.gold-beforeProvider-form.foodCost)<1e-8,
        total:Math.abs(s.realms.player.treasury.gold+s.player.gold+s.realms[rid].treasury.gold-
          (publicBefore+privateBefore-form.trainingCost))<1e-8,
        stock:stock-FB.marketProvisionSnapshot(s,s.player.provinceId).stock===d.provisions.food,
        valid:FB.treasuryValidatePreservation(s) && FB.mobile.validate(s)};
    },prefix);
    expect(result).toEqual({gifted:true,giftAgain:false,private:true,paid:true,again:false,consent:true,formed:true,
      repeat:false,pure:true,grantDebit:true,seller:true,total:true,stock:true,valid:true});
  });

  test(prefix+' military reserves exhaustion stale reviews and personal payments never cross purses',async function({page},info){
    await importWorld(page,info,prefix);await begin(page,prefix,'code');
    const result=await page.evaluate(function(prefix){
      const s=FB.state,H=FB.homeAuthority,rid=FB.stories.get(prefix+'_preparation').declaration.realmId,
        row=s.realms.player.treasury,privateBefore=s.player.gold;
      row.gold=10;row.militaryAccrued=8;
      const denied=!H.fundingQuote(s,{source:{kind:'public',realmId:'player'},recipientRealmId:rid,amount:3,characterId:s.player.charId}).allowed,
        q=H.fundingQuote(s,{source:{kind:'public',realmId:'player'},recipientRealmId:rid,amount:2,characterId:s.player.charId});
      row.gold--;
      const stale=!H.fund(s,q);row.gold++;
      const paid=H.fund(s,H.fundingQuote(s,q.input)),empty=FB.treasuryAvailable(s,'player')===0,
        noPrivateFallback=!FB.treasuryTransfer(s,'player',rid,1),privateUntouched=s.player.gold===privateBefore;
      row.gold=20;row.militaryAccrued=0;
      const salary=FB.treasuryPayPrivate(s,'player',3),salarySeparate=row.gold===17 && s.player.gold===privateBefore+3,
        personal=FB.treasuryTransferPersonal(s,'player',null,2),personalSeparate=row.gold===17 && s.player.gold===privateBefore+1;
      return {denied:denied,stale:stale,paid:paid,empty:empty,noPrivateFallback:noPrivateFallback,
        privateUntouched:privateUntouched,salary:salary,salarySeparate:salarySeparate,personal:personal,personalSeparate:personalSeparate};
    },prefix);
    expect(result).toEqual({denied:true,stale:true,paid:true,empty:true,noPrivateFallback:true,privateUntouched:true,
      salary:true,salarySeparate:true,personal:true,personalSeparate:true});
  });

  test(prefix+' one seasonal fiscal boundary and daily military bill settle only in the public account',async function({page},info){
    await importWorld(page,info,prefix);await begin(page,prefix,'code');
    const result=await page.evaluate(function(){
      const s=FB.state,row=s.realms.player.treasury,privateBefore=s.player.gold;
      row.gold=100;row.militaryAccrued=7;s.turn=90;
      const tax=FB.playerTaxParts(s),amount=FB.playerTax(s,tax)-FB.buildingBonus(s,'upkeep')-
        (FB.fortUpkeep ? FB.fortUpkeep(s) : 0)-FB.modifierUpkeep(s,'gold')-FB.playerGovernmentCosts(s,tax).total,
        settled=FB.treasurySeason(s,tax),before=row.gold,
        applied=FB.treasuryDynasticSeason(s,amount,tax),once=row.gold===100+amount-7,
        noNpcDouble=before===100,repeat=FB.treasuryDynasticSeason(s,amount,tax) && row.gold===100+amount-7;
      s.turn++;const militaryBefore=row.gold;
      FB.treasuryCommitMilitary(s,{costs:{player:2},playerMercs:0});
      return {settled:settled,applied:applied,once:once,noNpcDouble:noNpcDouble,repeat:repeat,
        daily:row.gold===militaryBefore-2 && row.militaryAccrued===0,
        private:s.player.gold===privateBefore,summary:row.lastSummary.closing===100+amount-7,
        valid:FB.treasuryValidatePreservation(s)};
    });
    expect(result).toEqual({settled:true,applied:true,once:true,noNpcDouble:true,repeat:true,daily:true,private:true,summary:true,valid:true});
  });

  test(prefix+' public distribution revaluation and retirement preserve canonical balances',async function({page},info){
    await importWorld(page,info,prefix);await begin(page,prefix,'code');
    const result=await page.evaluate(function(prefix){
      const s=FB.state,row=s.realms.player.treasury,privateBefore=s.player.gold;
      row.gold=1000;row.militaryAccrued=4;
      const q=FB.publicDistributionQuote(s,'player'),paid=FB.publicDistribution(s,'player',q.minimum),
        again=FB.publicDistribution(s,'player',q.minimum),after=row.gold;
      s.date.year++;FB.treasuryRevalue(s,0.5);const revalued=row.gold===after/2;
      FB.treasuryRevalue(s,0.5);const once=row.gold===after/2;
      const other=prefix==='harbor'?'harbor_commune':'dune_oasis',target=s.realms[other].treasury,
        to=target.gold,accrued=target.militaryAccrued,balance=row.gold;
      FB.treasuryRetireRealm(s,'player',other);FB.treasuryRetireRealm(s,'player',other);
      const retired=row.retired && row.gold===0 && row.militaryAccrued===0 &&
        target.gold===to+balance && target.militaryAccrued===accrued+4;
      FB.treasuryInitialize(s);
      return {paid:paid,again:again,revalued:revalued,once:once,retired:retired,
        noRestock:row.gold===0 && !FB.treasuryPublicAccountSnapshot(s,'player'),
        private:s.player.gold===privateBefore,valid:FB.treasuryValidatePreservation(s)};
    },prefix);
    expect(result).toEqual({paid:true,again:false,revalued:true,once:true,retired:true,noRestock:true,private:true,valid:true});
  });

  test(prefix+' pending formed terminal and succession saves retain depleted public and private accounts',async function({page},info){
    await importWorld(page,info,prefix);await begin(page,prefix,'code');
    const result=await page.evaluate(function(prefix){
      const P=FB.expeditionPreparation,id=prefix+'_preparation';
      function facts(s){return JSON.stringify([s.start.publicTreasury,s.realms,s.player.gold,s.stories,s.population,s.market,s.armies]);}
      function restore(){const before=facts(FB.state),save=FB.save.serialize(),rng=FB.getRngState(),uid=FB.getUidCounter();
        FB.save.restore(JSON.parse(save));FB.save.restore(JSON.parse(save));
        return before===facts(FB.state) && rng===FB.getRngState() && uid===FB.getUidCounter();}
      FB.state.realms.player.treasury.gold=200;
      const pending=restore(),pendingSave=FB.save.serialize(),s=FB.state,actor=s.player.charId,
        paid=P.commit(s,P.review(s,id,'grant',actor)),authorized=P.commit(s,P.review(s,id,'authorize',actor)),
        formed=P.commit(s,P.review(s,id,'form',actor)),saved=formed && restore();
      FB.save.restore(JSON.parse(pendingSave));
      const refused=P.commit(FB.state,P.review(FB.state,id,'refuse',FB.state.player.charId)),terminal=refused && restore();
      const current=FB.state.chars[FB.state.player.charId];
      let heir=FB.heirsOf(FB.state)[0],succession=false;
      if(!heir){heir=FB.makeCharacter(FB.state,{name:'Household heir',sex:'m',born:FB.state.date.year-20,
        culture:current.culture,religion:current.religion,station:FB.stationOf(current),
        fatherId:current.sex==='m'?current.id:null,motherId:current.sex==='f'?current.id:null});current.childrenIds.push(heir.id);}
      if(heir){const cash=FB.state.realms.player.treasury.gold,origin=JSON.stringify(FB.state.start.publicTreasury);
        FB.game.succeedTo(heir.id,{livingAbdication:true});FB.ui.closeModal();
        succession=FB.state.realms.player.treasury.gold===cash && origin===JSON.stringify(FB.state.start.publicTreasury) && restore();}
      return {pending:pending,paid:paid,authorized:authorized,formed:formed,saved:saved,terminal:terminal,succession:succession};
    },prefix);
    expect(result).toEqual({pending:true,paid:true,authorized:true,formed:true,saved:true,terminal:true,succession:true});
  });

  test(prefix+' real public construction and household forecasts use their actual funds',async function({page},info){
    await importWorld(page,info,prefix);await begin(page,prefix,'code');
    const result=await page.evaluate(function(prefix){
      const s=FB.state,row=s.realms.player.treasury,pid=s.player.provinceId,id=prefix+'_public_store';
      row.gold=10000;s.player.gold=0;
      const privateBudget=FB.playerCivilianBudget(s),publicBudget=FB.treasuryDynasticBudget(s),
        cost=FB.buildCost(s,pid,id),before=row.gold,allowed=FB.canBuildAt(s,pid,0,id),
        built=FB.build(s,pid,0,id),repeat=FB.build(s,pid,0,id),
        conserved=built && row.gold===before-cost && s.player.gold===0;
      row.gold=10;s.player.gold=-500;
      const noPrivateCrisis=FB.fiscalCrisisQuote(s).debt===0;
      row.gold=-100;s.player.gold=500;
      const publicCrisis=FB.fiscalCrisisQuote(s).debt===100;
      row.gold=10;s.player.gold=0;
      FB.ui.showFinance();
      return {forecast:privateBudget.receipts<publicBudget.receipts,allowed:allowed,built:built,repeat:repeat,
        conserved:conserved,noPrivateCrisis:noPrivateCrisis,publicCrisis:publicCrisis};
    },prefix);
    expect(result).toEqual({forecast:true,allowed:true,built:true,repeat:false,conserved:true,noPrivateCrisis:true,publicCrisis:true});
    await expect(page.getByText('Public receipts and government expenses use this account. Your household purse pays personal costs.',{exact:true})).toBeVisible();
  });

  test(prefix+' actual army provisions debit public cash and credit public market dues with reserved bills protected',async function({page},info){
    await importWorld(page,info,prefix);await begin(page,prefix,'code');
    const result=await page.evaluate(function(){
      const s=FB.state,row=s.realms.player.treasury;
      row.gold=10;row.militaryAccrued=8;s.player.gold=0;FB.game.auto.buySupplies=true;
      const host={id:'public-provision-boundary',realm:'player',at:s.player.provinceId,
        men:100,size:100,units:{levy:100},supply:0,path:[],moveLeft:0},
        q=FB.armyProvisionQuote(s,host),before=row.gold,
        stock=(q.sources || []).reduce(function(n,r){return n+FB.marketProvisionSource(s,r.pid).stock;},0);
      FB.provisionArmy(s,host);
      const left=(q.sources || []).reduce(function(n,r){return n+FB.marketProvisionSource(s,r.pid).stock;},0),
        expectedDues=(q.sources || []).reduce(function(n,r){return n+((s.holder[r.pid] || s.owner[r.pid])==='player' ? r.cost*0.1 : 0);},0),
        paid=q.units>0 && q.cost<=2 && Math.abs(row.gold-(before-q.cost+expectedDues))<1e-8,
        conserved=Math.abs(stock-left-q.units)<1e-8,privateUntouched=s.player.gold===0;
      row.gold=8;s.player.gold=1000;s.turn++;
      const exhausted=FB.armyProvisionQuote(s,host);
      return {paid:paid,conserved:conserved,privateUntouched:privateUntouched,
        noFallback:exhausted.cost===0 && exhausted.units===0,military:row.militaryAccrued===8};
    });
    expect(result).toEqual({paid:true,conserved:true,privateUntouched:true,noFallback:true,military:true});
  });

  test(prefix+' finite market exhaustion rejects stale formation without changing any account or source',async function({page},info){
    await importWorld(page,info,prefix);await begin(page,prefix,'code');
    const result=await page.evaluate(function(prefix){
      const s=FB.state,P=FB.expeditionPreparation,id=prefix+'_preparation',actor=s.player.charId;
      s.realms.player.treasury.gold=200;
      const funded=P.commit(s,P.review(s,id,'grant',actor)),authorized=P.commit(s,P.review(s,id,'authorize',actor)),
        reviewed=P.review(s,id,'form',actor),pid=s.player.provinceId,stock=FB.marketProvisionSnapshot(s,pid).stock,
        removed=FB.marketWithdrawProvisions(s,pid,stock),
        before=JSON.stringify([s.realms,s.player.gold,s.market,s.population,s.stories,s.authority]),
        formed=P.commit(s,reviewed),fresh=P.review(s,id,'form',actor);
      return {funded:funded,authorized:authorized,ready:reviewed.allowed,removed:removed,formed:formed,
        denied:!fresh.allowed && fresh.reason==='provisions',
        unchanged:before===JSON.stringify([s.realms,s.player.gold,s.market,s.population,s.stories,s.authority])};
    },prefix);
    expect(result).toEqual({funded:true,authorized:true,ready:true,removed:true,formed:false,denied:true,unchanged:true});
  });
}

test('ordinary JSON rejects malformed or institutional preservation without publishing any state',async function({page},info){
  await openGame(page,info);
  const result=await page.evaluate(function(source){
    const changes=[function(r){r.publicTreasury=null;},function(r){r.publicTreasury=[];},
      function(r){r.publicTreasury={};},function(r){r.publicTreasury.schema=2;},
      function(r){r.publicTreasury.extra=true;},function(r){r.publicTreasury.gold=500;},
      function(r){r.publicTreasury=true;},function(r,b){b.realms.find(function(x){return x.mobile;}).publicTreasury={schema:1};},
      function(r,b){b.realms[0].publicTreasury={schema:1};}];
    return changes.map(function(change){const d=JSON.parse(JSON.stringify(source)),bm=d.bookmarks.harbor_world.revisions.local_policy,
      r=bm.realms.find(function(r){return r.id==='harbor_upland';});change(r,bm);
      const before=JSON.stringify([FB.state,FBDATA]),rng=FB.getRngState(),uid=FB.getUidCounter(),errors=FB.mods.validate(d);
      return errors.length>0 && before===JSON.stringify([FB.state,FBDATA]) && rng===FB.getRngState() && uid===FB.getUidCounter();});
  },examples.harbor);
  expect(result).toEqual(Array(9).fill(true));
});

test('forged erased duplicated or restocked public saves reject before repair and adoption',async function({page},info){
  await importWorld(page,info,'harbor');await begin(page,'harbor','code');
  const result=await page.evaluate(function(){
    const source=JSON.parse(FB.save.serialize()),changes=[function(s){delete s.start.publicTreasury;},
      function(s){s.start.publicTreasury=null;},function(s){s.start.publicTreasury.schema=2;},
      function(s){s.start.publicTreasury.extra=true;},function(s){s.start.publicTreasury.originalRealmId='harbor_commune';},
      function(s){s.start.publicTreasury.realmId='harbor_commune';},function(s){delete s.realms.player.treasury;},
      function(s){delete s.realms.player.treasury.publicOwnerId;},function(s){s.realms.player.treasury.publicOwnerId='harbor_commune';},
      function(s){s.realms.player.treasury.militaryAccrued=-1;},function(s){s.realms.player.treasury.gold='100';},
      function(s){s.realms.player.treasury.retired=true;},function(s){s.realms.harbor_commune.treasury=JSON.parse(JSON.stringify(s.realms.player.treasury));},
      function(s){s.start.publicTreasury.retirement={turn:0,recipientId:null};},
      function(s){s.treasuryAccounting.mode='accounting';},function(s){s.realms.player.treasury.lastSettledSeason=999;}];
    return changes.map(function(change){const data=JSON.parse(JSON.stringify(source));change(data.state);
      const before=JSON.stringify([FB.state,data.state,FBDATA]),rng=FB.getRngState(),uid=FB.getUidCounter();
      let rejected=false;try{FB.save.v4.migrate(data);}catch(error){rejected=true;}
      return rejected && before===JSON.stringify([FB.state,data.state,FBDATA]) && rng===FB.getRngState() && uid===FB.getUidCounter();});
  });
  expect(result).toEqual(Array(16).fill(true));
});

test('actual vassal adoption retains its original liege owner and holding without acquiring sovereignty',async function({page},info){
  const source=JSON.parse(JSON.stringify(examples.harbor)),bm=source.bookmarks.harbor_world;
  const home=bm.revisions.baseline.realms.find(function(r){return r.id==='harbor_upland';});
  home.liege='harbor_commune';home.publicTreasury={schema:1};
  await importWorld(page,info,'harbor',source);await begin(page,'harbor','code','baseline');
  const result=await page.evaluate(function(){const s=FB.state;return {liege:s.player.liege,realmLiege:s.realms.player.liege,
    owner:s.owner.harbor_ridge,holder:s.holder.harbor_ridge,public:!!FB.treasuryPublicAccountSnapshot(s,'player'),
    private:s.player.gold,form:FB.governments.forRealm(s,'player').id,valid:FB.treasuryValidatePreservation(s)};});
  expect(result).toEqual({liege:'harbor_commune',realmLiege:'harbor_commune',owner:'harbor_commune',holder:'player',
    public:true,private:17,form:'territorial',valid:true});
});
