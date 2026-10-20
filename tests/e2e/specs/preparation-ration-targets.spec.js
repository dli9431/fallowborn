'use strict';
const path=require('path');
const {test,expect}=require('../support/fixture');
const {openGame}=require('../support/game/navigation');
const {beginBookmark}=require('../support/game/bookmark-acceptance');
const {dependsOnRuntime}=require('../support/runtime-dependencies');
const examples={harbor:require('../fixtures/authoring/ration-preparation-harbor.json'),
  upland:require('../fixtures/authoring/ration-preparation-upland.json')};
dependsOnRuntime(__filename,['index.html','data/technology.js','data/units.js','data/climate.js',
  'js/mobile_confederations.js','js/story_expedition_preparation.js','js/mobile_command.js','js/mobile_columns.js',
  'js/logistics.js','js/climate.js','js/technology.js','js/treasury.js','js/home_authority.js','js/market.js',
  'js/population.js','js/federates.js','js/armies.js','js/authority.js','js/governments.js','js/bookmark_setup.js',
  'js/world.js','js/mods.js','js/starts.js','js/stories.js','js/model.js','js/government_selection.js',
  'js/justice.js','js/intrigue.js','js/main.js','js/save.js','js/save_v4.js']);

async function begin(page,info,label,fixed) {
  await openGame(page,info);
  await page.evaluate(function(){FB.ui.showMods();});
  await page.locator('#modfile').setInputFiles(path.resolve(__dirname,'../fixtures/authoring/'+
    (fixed ? 'mobile-preparation-' : 'ration-preparation-')+label+'.json'));
  await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded'}),page.locator('#mod-apply').click()]);
  const prefix=label==='harbor' ? 'harbor' : 'dune';
  await page.waitForFunction(function(prefix){return window.FB && FB.game && FB.game.bootReady && FBDATA.bookmarks[prefix+'_world'];},prefix);
  await beginBookmark(page,info,prefix+'_world',prefix+'_household');
  await page.evaluate(function(input){
    window.rationCase={id:input.label+'_preparation',rid:input.prefix==='harbor' ? 'harbor_following' : 'dune_coalition',
      origin:input.prefix==='harbor' ? 'harbor_quay' : 'dune_well',
      record:function(s){return s.stories[this.id];},
      declaration:function(s){return FB.campaignBookmark(s).realms.find(function(d){return d.id===this.rid;},this);},
      leader:function(s){const d=this.declaration(s);return this.record(s).bindings.find(function(b){
        return b.memberId===d.mobile.opening.leaderMemberId;}).characterId;},
      authorize:function(s){const P=FB.expeditionPreparation;return P.commit(s,P.review(s,this.id,'authorize',this.record(s).provider.characterId));},
      grant:function(s){const P=FB.expeditionPreparation;return P.commit(s,P.review(s,this.id,'grant',this.record(s).provider.characterId));},
      form:function(s){const P=FB.expeditionPreparation;return P.commit(s,P.review(s,this.id,'form',this.leader(s)));},
      facts:function(s){return JSON.stringify([this.record(s),s.realms,s.market,s.population,s.authority,s.armies,s.player.gold,s.realmTech]);},
      restore:function(){const before=this.facts(FB.state),save=JSON.parse(FB.save.serialize());
        FB.save.restore(save);FB.save.restore(JSON.parse(JSON.stringify(save)));return before===this.facts(FB.state);}
    };
  },{label:label,prefix:prefix});
}

for(const label of ['harbor','upland']) {
  test(label+' ordinary JSON offers a pure actual-roster target without an unformed host or technology repair',async function({page},info){
    await begin(page,info,label);
    const result=await page.evaluate(function(){
      const C=rationCase,s=FB.state,M=FB.mobile,P=FB.expeditionPreparation,d=C.declaration(s),
        before=JSON.stringify([s,FBDATA]),rng=FB.getRngState(),uid=FB.getUidCounter(),
        projection=M.preformationRations(s,d),target=M.rationTarget(d.mobile.profileId,projection,
          FB.stories.get(C.id).declaration.provisions.targetDays),q=P.review(s,C.id,'form',C.leader(s)),
        pure=before===JSON.stringify([s,FBDATA]) && rng===FB.getRngState() && uid===FB.getUidCounter(),
        detached=JSON.parse(JSON.stringify(s));
      delete detached.realmTech[C.rid];const bytes=JSON.stringify(detached);
      M.preformationRations(detached,d);
      return {valid:FB.validateBookmark(FB.campaignBookmark(s)).length,
        technology:FBDATA.techImpactReviews.features.expedition_preparation_ration_target.mode==='none',empty:!M.row(s,C.rid) && !M.host(s,C.rid),
        pure:pure,noRepair:bytes===JSON.stringify(detached),camp:projection.campPeople,
        classes:Object.keys(projection.units).length,food:q.food===target.food,
        rounding:target.food===Math.ceil(target.campDaily*q.provisions.target.targetDays)+
          Math.ceil(target.fieldDaily*q.provisions.target.targetDays),
        capacity:target.fieldFood<=target.fieldCapacity,zero:FB.treasuryAvailable(s,C.rid)===0 && C.record(s).authorizedTurn===null};
    });
    expect(result).toEqual({valid:0,technology:true,empty:true,pure:true,noRepair:true,camp:label==='harbor' ? 1240 : 1400,
      classes:label==='harbor' ? 2 : 3,food:true,rounding:true,capacity:true,zero:true});
  });

  test(label+' private gift public grant and consent are separate before one finite conserved purchase',async function({page},info){
    await begin(page,info,label);
    const result=await page.evaluate(function(){
      const C=rationCase,s=FB.state,P=FB.expeditionPreparation,M=FB.mobile,t=C.record(s);s.player.gold=500;s.player.provinceId=C.origin;
      const privateBefore=s.player.gold,seller=FB.treasuryPublicAccountSnapshot(s,t.provider.realmId).gold,
        gift=P.review(s,C.id,'contribute',s.player.charId),given=P.commit(s,gift),
        privateOnly=given && s.player.gold===privateBefore-gift.cost && gift.cost===5 &&
          t.authorizedTurn===null && FB.treasuryPublicAccountSnapshot(s,t.provider.realmId).gold===seller,
        grant=P.review(s,C.id,'grant',t.provider.characterId),granted=P.commit(s,grant),
        publicOnly=granted && s.player.gold===privateBefore-gift.cost &&
          Math.abs(FB.treasuryPublicAccountSnapshot(s,t.provider.realmId).gold-seller+grant.cost)<1e-8,
        independent=!C.form(s) && !M.host(s,C.rid),authorized=C.authorize(s),
        q=P.review(s,C.id,'form',C.leader(s)),before={stock:FB.marketProvisionSnapshot(s,C.origin).stock,
          money:FB.treasuryAvailable(s,C.rid),seller:FB.treasuryPublicAccountSnapshot(s,t.provider.realmId).gold,
          population:s.population.counties[C.origin].count,people:Object.keys(s.chars).sort().join('|'),
          rng:FB.getRngState(),uid:FB.getUidCounter()},formed=P.commit(s,q),repeat=P.commit(s,q);
      if(!formed) return {formed:formed,reason:q.reason,privateOnly:privateOnly,publicOnly:publicOnly};
      const row=M.row(s,C.rid),host=M.host(s,C.rid),receipt=t.formed.provisionTarget,
        actual=M.hostSupplySnapshot(s,host);
      return {privateOnly:privateOnly,publicOnly:publicOnly,independent:independent,authorized:authorized,formed:formed,repeat:repeat,
        stock:before.stock-FB.marketProvisionSnapshot(s,C.origin).stock===q.food,
        debit:Math.abs(before.money-FB.treasuryAvailable(s,C.rid)-q.cost)<1e-8,
        seller:Math.abs(FB.treasuryPublicAccountSnapshot(s,t.provider.realmId).gold-before.seller-q.foodCost)<1e-8,
        exact:t.formed.food===q.food && t.formed.foodCost===q.food*receipt.unitPrice &&
          row.food===receipt.campFood && host.mobileFood===receipt.fieldFood && row.food+host.mobileFood===q.food,
        consumption:Math.ceil(actual.daily*receipt.targetDays)===receipt.fieldFood,
        count:M.total(s,C.rid),withdrawal:before.population-s.population.counties[C.origin].count,
        single:s.armies.filter(function(a){return a.realm===C.rid;}).length===1,
        unchanged:before.people===Object.keys(s.chars).sort().join('|') && before.rng===FB.getRngState() && before.uid===FB.getUidCounter(),
        valid:M.validate(s)};
    });
    expect(result).toEqual({privateOnly:true,publicOnly:true,independent:true,authorized:true,formed:true,repeat:false,
      stock:true,debit:true,seller:true,exact:true,consumption:true,count:label==='harbor' ? 1400 : 1600,
      withdrawal:label==='harbor' ? 0 : 1600,single:true,unchanged:true,valid:true});
  });

  test(label+' ration technology terrain price and stock changes invalidate reviewed gifts grants and formation',async function({page},info){
    await begin(page,info,label);
    const result=await page.evaluate(function(){
      const C=rationCase,P=FB.expeditionPreparation;
      const changes=[function(s){s.date.season=(s.date.season+1)%4;},
        function(s){FB.realmTechRecord(s,C.rid).completed.push('pack_saddles');},
        function(s){const i=s.market.goods.indexOf('provisions');s.market.counties[C.origin][1][i]*=1.01;},
        function(s){const i=s.market.goods.indexOf('provisions');s.market.counties[C.origin][0][i]--;},
        function(s){FB.world.byId[C.origin].terrain='mountains';}];
      const terrain=FB.world.byId[C.origin].terrain,checks=[];
      for(const action of ['contribute','grant','form']) for(const change of changes) {
        const s=JSON.parse(JSON.stringify(FB.state)),t=C.record(s);s.player.gold=500;s.player.provinceId=C.origin;
        const tech=FB.realmTechRecord(s,C.rid);
        tech.completed=tech.completed.filter(function(id){return !FBDATA.tech[id] || !(FBDATA.tech[id].fx || {}).supply;});
        if(action==='form') {C.authorize(s);C.grant(s);}
        const actor=action==='form' ? C.leader(s) : action==='grant' ? t.provider.characterId : s.player.charId,
          q=P.review(s,C.id,action,actor);
        change(s);const before=JSON.stringify(s),rng=FB.getRngState(),uid=FB.getUidCounter(),
          next=P.review(s,C.id,action,actor);
        checks.push(q.allowed && JSON.stringify(q)!==JSON.stringify(next) && !P.commit(s,q) &&
          before===JSON.stringify(s) && rng===FB.getRngState() && uid===FB.getUidCounter());
        FB.world.byId[C.origin].terrain=terrain;
      }
      return checks;
    });
    expect(result).toEqual(Array(15).fill(true));
  });

  test(label+' exhausted provisions and an uncarryable target never debit even voluntary funding',async function({page},info){
    await begin(page,info,label);
    const result=await page.evaluate(function(){
      const C=rationCase,P=FB.expeditionPreparation,s=FB.state;s.player.gold=500;s.player.provinceId=C.origin;
      const terrain=FB.world.byId[C.origin].terrain,old=FBDATA.balance.supplyDrainTerrain[terrain],
        checks=[];
      for(const mode of ['empty','price','carriage']) {
        const next=JSON.parse(JSON.stringify(s)),i=next.market.goods.indexOf('provisions');
        if(mode==='empty') next.market.counties[C.origin][0][i]=0;
        if(mode==='price') next.market.counties[C.origin][1][i]=100;
        if(mode==='carriage') FBDATA.balance.supplyDrainTerrain[terrain]=100;
        const before=JSON.stringify(next);
        for(const action of ['contribute','grant','form']) {
          const actor=action==='form' ? C.leader(next) : action==='grant' ? C.record(next).provider.characterId : next.player.charId,
            q=P.review(next,C.id,action,actor);
          checks.push(!q.allowed && !P.commit(next,q) && before===JSON.stringify(next));
        }
        if(old===undefined) delete FBDATA.balance.supplyDrainTerrain[terrain];else FBDATA.balance.supplyDrainTerrain[terrain]=old;
      }
      return checks;
    });
    expect(result).toEqual(Array(9).fill(true));
  });

  test(label+' pending funded authorized formed and closed matching saves retain original purchases without replay',async function({page},info){
    await begin(page,info,label);
    const result=await page.evaluate(function(){
      const C=rationCase,initial=FB.save.serialize(),pending=C.restore(),granted=C.grant(FB.state),funded=C.restore(),
        authorized=C.authorize(FB.state),consent=C.restore(),formed=C.form(FB.state),saved=formed && C.restore();
      const s=FB.state,record=JSON.stringify(C.record(s)),host=FB.mobile.host(s,C.rid);
      if(!host) return {formed:formed};
      s.date=FB.dateAtTurn(s,270);s.turn=270;
      s.market.counties[C.origin][1][s.market.goods.indexOf('provisions')]*=1.1;
      FB.realmTechRecord(s,C.rid).completed=[];
      const changed=C.restore(),historical=record===JSON.stringify(C.record(FB.state));
      FB.save.restore(JSON.parse(initial));const t=C.record(FB.state);
      FB.expeditionPreparation.commit(FB.state,FB.expeditionPreparation.review(FB.state,C.id,'refuse',t.provider.characterId));
      const closed=C.restore();
      return {pending:pending,granted:granted,funded:funded,authorized:authorized,consent:consent,formed:formed,saved:saved,
        changed:changed,historical:historical,closed:closed,absent:!C.record(FB.state).formed && !FB.mobile.host(FB.state,C.rid)};
    });
    expect(result).toEqual({pending:true,granted:true,funded:true,authorized:true,consent:true,formed:true,saved:true,
      changed:true,historical:true,closed:true,absent:true});
  });

  test(label+' forged target receipts reject before adopting state RNG people or catalogue',async function({page},info){
    await begin(page,info,label);
    const result=await page.evaluate(function(){
      const C=rationCase,s=FB.state;C.authorize(s);C.grant(s);if(!C.form(s)) return {formed:false};
      const save=JSON.parse(FB.save.serialize()),before=JSON.stringify([FB.state,FBDATA]),rng=FB.getRngState(),uid=FB.getUidCounter(),
        edits=[function(f){delete f.provisionTarget;},function(f){f.provisionTarget.schema=2;},
          function(f){f.provisionTarget.targetDays++;},function(f){f.provisionTarget.extra=true;},
          function(f){f.provisionTarget.ration.campPeople++;},function(f){f.provisionTarget.ration.units.absent=1;},
          function(f){f.provisionTarget.ration.carryDays++;},function(f){f.provisionTarget.ration.provisionUse=-1;},
          function(f){f.provisionTarget.ration.drainBase=0;},function(f){f.provisionTarget.ration.extra=true;},
          function(f){f.provisionTarget.campFood++;},function(f){f.provisionTarget.fieldFood++;},
          function(f){f.provisionTarget.unitPrice++;},function(f){f.food++;},function(f){f.foodCost++;}];
      return {formed:true,rejected:edits.map(function(edit){const next=JSON.parse(JSON.stringify(save));
        edit(next.state.stories[C.id].formed);try {FB.save.restore(next);return false;}catch(error){return true;}}),
        pure:before===JSON.stringify([FB.state,FBDATA]) && rng===FB.getRngState() && uid===FB.getUidCounter()};
    });
    expect(result).toEqual({formed:true,rejected:Array(15).fill(true),pure:true});
  });

  test(label+' actual field losses movement and consumption leave the historical purchase intact',async function({page},info){
    await begin(page,info,label);
    const result=await page.evaluate(function(){
      const C=rationCase,s=FB.state,M=FB.mobile;C.authorize(s);C.grant(s);if(!C.form(s)) return {formed:false};
      const before=JSON.stringify(C.record(s).formed),host=M.host(s,C.rid),unit=Object.keys(host.units).find(function(id){return host.units[id]>=10;});
      host.men-=10;host.units[unit]-=10;M.losses(s,host,10);
      const other=FB.world.provs.find(function(p){return p.id!==C.origin && !p.wasteland;});host.at=other.id;
      s.date=FB.dateAtTurn(s,1);s.turn=1;
      const stock=host.mobileFood,paid=FB.provisionArmy(s,host),changed=stock-host.mobileFood===paid;
      return {formed:true,consumed:paid>0 && changed,valid:M.validate(s),restored:C.restore(),
        original:before===JSON.stringify(C.record(FB.state).formed),once:!C.form(FB.state)};
    });
    expect(result).toEqual({formed:true,consumed:true,valid:true,restored:true,original:true,once:true});
  });

  test(label+' fixed-food pending formed and terminal receipts preserve their original exact keys',async function({page},info){
    await begin(page,info,label,true);
    const result=await page.evaluate(function(){
      const C=rationCase,pending=C.restore(),initial=FB.save.serialize(),authorized=C.authorize(FB.state),
        granted=C.grant(FB.state),formed=C.form(FB.state),t=C.record(FB.state),
        legacy=formed && !Object.prototype.hasOwnProperty.call(t.formed,'provisionTarget') &&
          Object.keys(t.formed).length===9,
        food=t.formed && t.formed.food,saved=formed && C.restore();
      FB.save.restore(JSON.parse(initial));const s=FB.state;s.date=FB.dateAtTurn(s,C.record(s).endTurn);s.turn=C.record(s).endTurn;
      FB.stories.get(C.id).day(s,C.record(s));const closed=C.restore();
      return {pending:pending,authorized:authorized,granted:granted,formed:formed,legacy:legacy,food:food,saved:saved,closed:closed};
    });
    expect(result).toEqual({pending:true,authorized:true,granted:true,formed:true,legacy:true,
      food:label==='harbor' ? 40 : 60,saved:true,closed:true});
  });
}

test('both complete detached target imports accept and malformed targets reject without publication',async function({page},info){
  await openGame(page,info);
  const result=await page.evaluate(function(examples){
    const before=JSON.stringify([FB.state,FBDATA]),rng=FB.getRngState(),uid=FB.getUidCounter(),
      edits=[function(p){p.provisions.targetDays=0;},function(p){p.provisions.targetDays=15;},
        function(p){p.provisions.targetDays=1.5;},function(p){p.provisions.targetDays='7';},
        function(p){p.provisions.food=20;},function(p){delete p.provisions.targetDays;},
        function(p){p.provisions.maxUnitPrice=0;},function(p){p.provisions.free=true;},
        function(p){p.provisions.carryDays=90;}],accepted=[],rejected=[];
    for(const label of ['harbor','upland']) {
      const source=examples[label],bytes=JSON.stringify(source);accepted.push(FB.mods.validate(source).length===0 && bytes===JSON.stringify(source));
      rejected.push(edits.map(function(edit){const m=JSON.parse(bytes);edit(m.storyInstances[label+'_preparation']);
        const input=JSON.stringify(m);return FB.mods.validate(m).length>0 && input===JSON.stringify(m);}));
    }
    return {accepted:accepted,rejected:rejected,pure:before===JSON.stringify([FB.state,FBDATA]) && rng===FB.getRngState() && uid===FB.getUidCounter()};
  },examples);
  expect(result).toEqual({accepted:[true,true],rejected:[Array(9).fill(true),Array(9).fill(true)],pure:true});
});

test('direct public funding retains exact ration and market facts in its own stale-review boundary',async function({page},info){
  await begin(page,info,'harbor');
  const result=await page.evaluate(function(){
    const C=rationCase,H=FB.homeAuthority,t=C.record(FB.state),checks=[];
    for(const kind of ['technology','stock']) {
      const s=JSON.parse(JSON.stringify(FB.state)),rec=FB.realmTechRecord(s,C.rid);
      rec.completed=rec.completed.filter(function(id){return !FBDATA.tech[id] || !(FBDATA.tech[id].fx || {}).supply;});
      const q=H.fundingQuote(s,{source:{kind:'public',realmId:t.provider.realmId},recipientRealmId:C.rid,
        amount:1,characterId:t.provider.characterId});
      if(kind==='technology') FB.realmTechRecord(s,C.rid).completed.push('pack_saddles');
      else s.market.counties[C.origin][0][s.market.goods.indexOf('provisions')]--;
      const before=JSON.stringify(s);checks.push(q.allowed && !H.fund(s,q) && before===JSON.stringify(s));
    }
    return checks;
  });
  expect(result).toEqual([true,true]);
});

test('the phone review discloses the camp field and total purchase and restores focus on Back and Escape',async function({page},info){
  await page.setViewportSize({width:390,height:844});
  await begin(page,info,'harbor');
  await page.evaluate(function(){FB.state.player.gold=500;FB.state.player.provinceId=rationCase.origin;FB.ui.showStorySheet(rationCase.id);});
  const choice=page.locator('[data-story-choice="contribute"]');
  await choice.click();
  await expect(page.locator('#genmodal')).toContainText('Target: 14 days');
  await expect(page.locator('#genmodal')).toContainText('Camp provisions:');
  await page.locator('#genmodal').getByRole('button',{name:'Back',exact:true}).click();
  await expect(choice).toBeFocused();
  await choice.click();await page.keyboard.press('Escape');
  await expect(choice).toBeFocused();
});
