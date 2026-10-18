'use strict';
const path=require('path');
const {test,expect}=require('../support/fixture');
const {openGame}=require('../support/game/navigation');
const {beginBookmark}=require('../support/game/bookmark-acceptance');
const {dependsOnRuntime}=require('../support/runtime-dependencies');
const examples={harbor:require('../fixtures/authoring/mobile-preparation-harbor.json'),
  upland:require('../fixtures/authoring/mobile-preparation-upland.json')};
dependsOnRuntime(__filename,[
  'js/story_expedition_program.js','index.html','data/mobile_confederations.js','data/units.js','data/technology.js',
  'js/story_expedition_preparation.js','js/mobile_confederations.js','js/mobile_command.js','js/mobile_columns.js',
  'js/expedition_programs.js','js/home_authority.js','js/treasury.js','js/population.js','js/market.js',
  'js/federates.js','js/governments.js','js/government_selection.js','js/government_civic.js','js/authority.js',
  'js/world.js','js/mods.js','js/stories.js','js/bookmark_setup.js','js/starts.js','js/model.js','js/armies.js',
  'js/logistics.js','js/travel.js','js/story_expedition_participation.js','js/story_household.js','js/story_household_party.js',
  'js/household_party_travel.js','js/household_party_camp.js','js/save.js','js/save_v4.js','js/main.js']);

async function begin(page,info,label) {
  await openGame(page,info);
  await page.evaluate(function () {FB.ui.showMods();});
  await page.locator('#modfile').setInputFiles(path.resolve(__dirname,'../fixtures/authoring/mobile-preparation-'+label+'.json'));
  await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded'}),page.locator('#mod-apply').click()]);
  const prefix=label==='harbor' ? 'harbor' : 'dune';
  await page.waitForFunction(function (prefix) {return window.FB && FB.game && FB.game.bootReady && FBDATA.bookmarks[prefix+'_world'];},prefix);
  await beginBookmark(page,info,prefix+'_world',prefix+'_household');
  await page.evaluate(function (label) {
    window.preparationCase={id:label+'_preparation',rid:label==='harbor' ? 'harbor_following' : 'dune_coalition',
      origin:label==='harbor' ? 'harbor_quay' : 'dune_well',
      record:function (s) {return s.stories[this.id];},
      leader:function (s) {const t=this.record(s),d=FB.stories.get(this.id).declaration;
        const realm=FB.campaignBookmark(s).realms.find(function (r) {return r.id===d.realmId;});
        return t.bindings.find(function (b) {return b.memberId===realm.mobile.opening.leaderMemberId;}).characterId;},
      authorize:function (s) {const P=FB.expeditionPreparation;return P.commit(s,P.review(s,this.id,'authorize',this.record(s).provider.characterId));},
      grant:function (s) {const P=FB.expeditionPreparation;return P.commit(s,P.review(s,this.id,'grant',this.record(s).provider.characterId));},
      form:function (s) {const P=FB.expeditionPreparation;return P.commit(s,P.review(s,this.id,'form',this.leader(s)));}
    };
  },label);
}

for (const label of ['harbor','upland']) {
  test(label+' ordinary import attaches a zero-funded preparation without a host or county withdrawal',async function ({page},info) {
    await begin(page,info,label);
    const result=await page.evaluate(function () {
      const s=FB.state,C=preparationCase,P=FB.expeditionPreparation,t=C.record(s),
        before=JSON.stringify(s),rng=FB.getRngState(),uid=FB.getUidCounter(),q=P.review(s,C.id,'form',C.leader(s));
      const pure=before===JSON.stringify(s) && rng===FB.getRngState() && uid===FB.getUidCounter();
      return {status:t.status,noHost:!FB.mobile.row(s,C.rid) && !s.armies.some(function(a){return a.realm===C.rid;}) &&
        !s.authority.migrations.some(function(m){return m.realmId===C.rid;}),zero:FB.treasuryAvailable(s,C.rid)===0,
        reserved:t.reserves.reduce(function(n,c){return n+c.count;},0),consumed:t.consumed.length,
        denied:!q.allowed,pure:pure,valid:FB.mobile.validate(s),definition:FB.validateBookmark(FB.campaignBookmark(s)).length};
    });
    expect(result).toEqual({status:'preparing',noHost:true,zero:true,reserved:label==='harbor' ? 1400 : 0,consumed:0,denied:true,pure:true,valid:true,definition:0});
  });

  test(label+' later formation pays once and conserves the exact people, public money and market food',async function ({page},info) {
    await begin(page,info,label);
    const result=await page.evaluate(function () {
      const s=FB.state,C=preparationCase,P=FB.expeditionPreparation,M=FB.mobile;
      s.turn=2;s.date.day=3;
      const authorized=C.authorize(s),unfunded=P.review(s,C.id,'form',C.leader(s)),grant=C.grant(s),
        q=P.review(s,C.id,'form',C.leader(s)),t=C.record(s),before={population:s.population.counties[C.origin].count,
          stock:FB.marketProvisionSnapshot(s,C.origin).stock,public:FB.treasuryAvailable(s,C.rid),
          seller:FB.treasuryAvailable(s,t.provider.realmId),private:s.player.gold,people:Object.keys(s.chars).sort(),
          rng:FB.getRngState(),uid:FB.getUidCounter(),land:JSON.stringify([s.owner,s.holder])};
      const formed=P.commit(s,q),repeat=P.commit(s,q),r=M.row(s,C.rid),a=M.host(s,C.rid),moving=M.migration(s,C.rid);
      if (!formed) return {authorized:authorized,grant:grant,reason:q.reason,formed:formed};
      return {authorized:authorized,unfunded:!unfunded.allowed && unfunded.reason==='funds',grant:grant,formed:formed,repeat:repeat,
        source:C.record(s).reserves.length===0 && C.record(s).consumed.reduce(function(n,c){return n+c.count;},0)===M.total(s,C.rid),
        people:M.total(s,C.rid),localWithdrawal:before.population-s.population.counties[C.origin].count,
        food:before.stock-FB.marketProvisionSnapshot(s,C.origin).stock,
        paid:Math.abs(before.public-FB.treasuryAvailable(s,C.rid)-q.cost)<1e-8,
        seller:Math.abs(FB.treasuryAvailable(s,t.provider.realmId)-before.seller-q.foodCost)<1e-8,
        actual:Math.abs(r.food+a.mobileFood-C.record(s).formed.food)<1e-8,
        host:s.armies.filter(function(h){return h.realm===C.rid;}).length===1 && a.men===160 &&
          a.mobileRoster.reduce(function(n,c){return n+c.count;},0)===a.men && a.at===C.origin && moving.at===C.origin,
        arrivals:r.accounting.initial===0 && r.accounting.arrivals===M.total(s,C.rid),
        unchanged:before.private===s.player.gold && before.land===JSON.stringify([s.owner,s.holder]) &&
          JSON.stringify(before.people)===JSON.stringify(Object.keys(s.chars).sort()) && before.rng===FB.getRngState() && before.uid===FB.getUidCounter(),
        identity:r.leaderId===C.leader(s) && C.record(s).formed.migrationId===moving.id && C.record(s).formed.turn===2,
        valid:M.validate(s)};
    });
    expect(result).toEqual({authorized:true,unfunded:true,grant:true,formed:true,repeat:false,source:true,
      people:label==='harbor' ? 1400 : 1600,localWithdrawal:label==='harbor' ? 0 : 1600,
      food:label==='harbor' ? 40 : 60,paid:true,seller:true,actual:true,host:true,arrivals:true,unchanged:true,identity:true,valid:true});
  });

  test(label+' matching pending and formed saves retain reserves and never replay initialization',async function ({page},info) {
    await begin(page,info,label);
    const result=await page.evaluate(function () {
      const C=preparationCase,P=FB.expeditionPreparation;
      const pending=JSON.stringify(C.record(FB.state)),before=JSON.stringify([FB.state.population,FB.state.armies,FB.state.realms[C.rid].treasury]);
      FB.save.restore(JSON.parse(FB.save.serialize()));
      const reserve=pending===JSON.stringify(C.record(FB.state)) && before===JSON.stringify([FB.state.population,FB.state.armies,FB.state.realms[C.rid].treasury]);
      const s=FB.state;C.authorize(s);C.grant(s);const formed=C.form(s);
      if (!formed) return {reserve:reserve,formed:formed};
      const facts=function(s){return JSON.stringify([C.record(s),FB.mobile.row(s,C.rid),FB.mobile.migration(s,C.rid),FB.mobile.host(s,C.rid),
        s.population.counties[C.origin],s.realms[C.rid].treasury,FB.marketProvisionSnapshot(s,C.origin)]);};
      const snapshot=facts(s),save=FB.save.serialize();FB.save.restore(JSON.parse(save));
      const restored=snapshot===facts(FB.state),repeated=!C.form(FB.state);
      FB.mobile.initialize(FB.state,FB.campaignBookmark(FB.state).realms);FB.stories.start(FB.state);
      return {reserve:reserve,formed:formed,restored:restored,repeated:repeated,notReattached:snapshot===facts(FB.state),valid:FB.mobile.validate(FB.state)};
    });
    expect(result).toEqual({reserve:true,formed:true,restored:true,repeated:true,notReattached:true,valid:true});
  });
}

test('detached malformed ordinary imports reject without publishing or changing RNG, UID or input',async function ({page},info) {
  await openGame(page,info);
  const result=await page.evaluate(function (source) {
    const edits=[function(m,d,p){p.source.cohorts[0].count++;},function(m,d,p){p.source.cohorts.push(p.source.cohorts[0]);},
      function(m,d,p){p.source.cohorts[0].memberId='missing_member';},function(m,d,p){p.source.cohorts[0].religion='missing_faith';},
      function(m,d,p){p.source.provinceId=d.mobile.origin;},function(m,d,p){p.source.kind='local';},
      function(m,d,p){p.termDays=1441;},function(m,d,p){p.provisions.food=0;},function(m,d,p){p.provisions.free=true;},
      function(m,d,p){p.provider.realmId=d.id;},function(m,d,p){p.acceptance='automatic';},function(m,d,p){p.ai='teleport';},
      function(m,d,p){d.mobile.treasury=50;},function(m,d,p){d.mobile.food=50;},function(m,d,p){delete d.mobile.funding;},
      function(m,d,p){d.mobile.opening.principals.pop();},function(m,d,p){d.mobile.preparationId='missing_story';},
      function(m,d,p){m.bookmarks.harbor_world.stories.pop();},function(m,d,p){p.effect={army:100};}];
    const before=JSON.stringify([FB.state,FBDATA]),rng=FB.getRngState(),uid=FB.getUidCounter();
    const errors=edits.map(function(edit){const mod=JSON.parse(JSON.stringify(source)),d=mod.bookmarks.harbor_world.realms.find(function(r){return r.mobile;}),
      p=mod.storyInstances.harbor_preparation;edit(mod,d,p);const bytes=JSON.stringify(mod);return FB.mods.validate(mod).length>0 && bytes===JSON.stringify(mod);});
    return {errors:errors,pure:before===JSON.stringify([FB.state,FBDATA]) && rng===FB.getRngState() && uid===FB.getUidCounter()};
  },examples.harbor);
  expect(result).toEqual({errors:Array(19).fill(true),pure:true});
});

test('stale actor, authority, source, provisions, account and consent facts reject atomic formation',async function ({page},info) {
  await begin(page,info,'upland');
  const result=await page.evaluate(function () {
    const C=preparationCase,P=FB.expeditionPreparation;C.authorize(FB.state);C.grant(FB.state);
    return [function(s,t){s.chars[C.leader(s)].dead=true;},function(s,t){s.chars[t.bindings[1].characterId].captive=true;},
      function(s,t){s.chars[t.bindings[1].characterId].homeProvinceId='dune_pass';},
      function(s,t){s.chars[t.provider.characterId].captive=true;},function(s,t){s.realms[t.provider.realmId].ruler.generation++;},
      function(s,t){s.chars[FB.bookmarkActor(s,'dune_authorizer').id].dead=true;},
      function(s,t){s.holder[C.origin]='dune_gate';},function(s,t){s.owner[C.origin]='dune_gate';},
      function(s,t){s.realms[C.rid].treasury.gold=0;},function(s,t){t.authorizedTurn=null;t.revision++;},
      function(s,t){s.population.counties[C.origin].count--;},function(s,t){s.market.counties[C.origin][0][s.market.goods.indexOf('provisions')]=0;},
      function(s,t){s.turn=t.endTurn;},function(s,t){s.armies.push({id:'following_'+C.rid,realm:C.rid});}].map(function(change){
        const s=JSON.parse(JSON.stringify(FB.state)),t=C.record(s),q=P.review(s,C.id,'form',C.leader(s));
        change(s,t);const before=JSON.stringify(s),rng=FB.getRngState(),uid=FB.getUidCounter();
        return q.allowed && !P.commit(s,q) && before===JSON.stringify(s) && rng===FB.getRngState() && uid===FB.getUidCounter();
      });
  });
  expect(result).toEqual(Array(14).fill(true));
});

test('public and private preparation funding retain consent, separate accounts and one-use review stamps',async function ({page},info) {
  await begin(page,info,'harbor');
  const result=await page.evaluate(function () {
    const s=FB.state,C=preparationCase,P=FB.expeditionPreparation,t=C.record(s),old=s.player.charId;
    const wrong=P.review(s,C.id,'grant',C.leader(s)),before=s.player.gold;
    s.player.charId=C.leader(s);
    const q=P.review(s,C.id,'contribute',s.player.charId),paid=P.commit(s,q),repeat=P.commit(s,q);
    const cost=s.player.gold===before-q.cost && FB.treasuryAvailable(s,C.rid)===q.cost;
    s.player.charId=old;
    return {wrong:!wrong.allowed,paid:paid,repeat:repeat,cost:cost,noHost:!FB.mobile.host(s,C.rid),noConsent:t.authorizedTurn===null,
      noForm:!C.form(s),valid:FB.mobile.validate(s)};
  });
  expect(result).toEqual({wrong:true,paid:true,repeat:false,cost:true,noHost:true,noConsent:true,noForm:true,valid:true});
});

test('refuse, stop, expiry and changed principals close without departure or local population effects',async function ({page},info) {
  await begin(page,info,'harbor');
  const result=await page.evaluate(function () {
    const C=preparationCase,P=FB.expeditionPreparation,story=FB.stories.get(C.id);
    return ['refuse','stop','expired','interrupted'].map(function(action){
      const s=JSON.parse(JSON.stringify(FB.state)),t=C.record(s),before=JSON.stringify([s.population,s.market,s.realms,s.player.gold]),
        people=t.reserves.reduce(function(n,c){return n+c.count;},0);
      if (action==='expired') {s.turn=t.endTurn;story.day(s,t);}
      else if (action==='interrupted') {s.chars[C.leader(s)].dead=true;story.day(s,t);}
      else P.commit(s,P.review(s,C.id,action,C.leader(s)));
      const valid=story.validate(t,s)===undefined;
      return t.status==='closed' && t.reason===({refuse:'refused',stop:'stopped'}[action] || action) &&
        t.reserves.length===0 && t.released.reduce(function(n,c){return n+c.count;},0)===people &&
        !FB.mobile.row(s,C.rid) && before===JSON.stringify([s.population,s.market,s.realms,s.player.gold]) && valid;
    });
  });
  expect(result).toEqual(Array(4).fill(true));
});

test('a local no-departure ending withdraws nothing and closed acceptance never supplies consent',async function ({page},info) {
  await begin(page,info,'upland');
  const result=await page.evaluate(function () {
    const s=FB.state,C=preparationCase,t=C.record(s),story=FB.stories.get(C.id),before=JSON.stringify([s.population,s.market,s.realms]);
    story.day(s,t);const closedPolicy=t.authorizedTurn===null;
    s.turn=t.endTurn;story.day(s,t);
    return {closedPolicy:closedPolicy,closed:t.status==='closed' && t.reason==='expired',empty:!t.reserves.length && !t.consumed.length && !t.released.length,
      unchanged:before===JSON.stringify([s.population,s.market,s.realms]),valid:FB.mobile.validate(s)};
  });
  expect(result).toEqual({closedPolicy:true,closed:true,empty:true,unchanged:true,valid:true});
});

test('NPC provider consent uses the same quote and never automates a player provider',async function ({page},info) {
  await begin(page,info,'harbor');
  const result=await page.evaluate(function () {
    const C=preparationCase,story=FB.stories.get(C.id),s=JSON.parse(JSON.stringify(FB.state)),t=C.record(s),old=s.player.charId;
    s.player.charId=t.provider.characterId;story.day(s,t);const player=t.authorizedTurn===null;
    s.player.charId=old;story.day(s,t);
    return {player:player,npc:t.authorizedTurn===s.turn,noHost:!FB.mobile.row(s,C.rid),zero:FB.treasuryAvailable(s,C.rid)===0};
  });
  expect(result).toEqual({player:true,npc:true,noHost:true,zero:true});
});

test('strict optional preparation saves reject erased, duplicated and forged provenance before adoption',async function ({page},info) {
  await begin(page,info,'harbor');
  const result=await page.evaluate(function () {
    const C=preparationCase,s=FB.state,save=JSON.parse(FB.save.serialize()),before=JSON.stringify(s),rng=FB.getRngState(),uid=FB.getUidCounter();
    const edits=[function(x){delete x.state.stories[C.id];},function(x){delete x.state.stories;},
      function(x){x.state.stories[C.id].version=2;},function(x){x.state.stories[C.id].definitionKey+=' ';},
      function(x){x.state.stories[C.id].reserves[0].count++;},function(x){x.state.stories[C.id].reserves.push(x.state.stories[C.id].reserves[0]);},
      function(x){x.state.stories[C.id].authorizedTurn=99;},function(x){x.state.stories[C.id].endTurn++;},
      function(x){x.state.stories[C.id].provider.generation=0;},function(x){x.state.stories[C.id].formed={hostId:'fake'};},
      function(x){x.state.stories[C.id].consumed=x.state.stories[C.id].reserves;},function(x){x.state.stories[C.id].gold=10;}];
    const rejected=edits.map(function(edit){const x=JSON.parse(JSON.stringify(save));edit(x);try {FB.save.restore(x);return false;} catch(e){return true;}});
    return {rejected:rejected,unchanged:before===JSON.stringify(FB.state) && rng===FB.getRngState() && uid===FB.getUidCounter()};
  });
  expect(result).toEqual({rejected:Array(12).fill(true),unchanged:true});
});

test('a pending checkpoint replays the actual formation and depleted resources deterministically',async function ({page},info) {
  await begin(page,info,'upland');
  const result=await page.evaluate(function () {
    const C=preparationCase,save=FB.save.serialize();
    function run() {
      const s=FB.state;s.turn=3;s.date.day=4;
      const okay=C.authorize(s) && C.grant(s) && C.form(s);
      return JSON.stringify({okay:okay,record:C.record(s),mobile:FB.mobile.row(s,C.rid),host:FB.mobile.host(s,C.rid),
        migration:FB.mobile.migration(s,C.rid),population:s.population.counties[C.origin],market:FB.marketProvisionSnapshot(s,C.origin),
        treasury:s.realms[C.rid].treasury,seller:s.realms[C.record(s).provider.realmId].treasury,people:Object.keys(s.chars).sort(),
        rng:FB.getRngState()>>>0,uid:FB.getUidCounter()});
    }
    const first=run();FB.save.restore(JSON.parse(save));const second=run();
    return {formed:JSON.parse(first).okay,replay:first===second};
  });
  expect(result).toEqual({formed:true,replay:true});
});

test('formed receipts reject forged owner identities and erased mobile state without replay',async function ({page},info) {
  await begin(page,info,'harbor');
  const result=await page.evaluate(function () {
    const C=preparationCase,s=FB.state;C.authorize(s);C.grant(s);
    if (!C.form(s)) return {formed:false};
    const save=JSON.parse(FB.save.serialize()),before=JSON.stringify(s),rng=FB.getRngState(),uid=FB.getUidCounter();
    const edits=[function(x){x.state.stories[C.id].formed.hostId='foreign_host';},
      function(x){x.state.stories[C.id].formed.migrationId='foreign_migration';},function(x){x.state.stories[C.id].formed.generation++;},
      function(x){x.state.stories[C.id].formed.food++;},function(x){x.state.stories[C.id].formed.trainingCost++;},
      function(x){x.state.stories[C.id].formed.foodCost=-1;},function(x){x.state.stories[C.id].formed.turn=20;},
      function(x){x.state.stories[C.id].consumed[0].count++;},function(x){x.state.stories[C.id].reserves=x.state.stories[C.id].consumed;},
      function(x){delete x.state.authority.governments[C.rid].mobile;},function(x){x.state.stories[C.id].status='preparing';}];
    return {formed:true,rejected:edits.map(function(edit){const x=JSON.parse(JSON.stringify(save));edit(x);
      try{FB.save.restore(x);return false;}catch(e){return true;}}),
      unchanged:before===JSON.stringify(FB.state) && rng===FB.getRngState() && uid===FB.getUidCounter()};
  });
  expect(result).toEqual({formed:true,rejected:Array(11).fill(true),unchanged:true});
});

test('ordinary unit gates, zero stock and insufficient local residents refuse without partial costs',async function ({page},info) {
  await begin(page,info,'upland');
  const result=await page.evaluate(function () {
    const C=preparationCase,P=FB.expeditionPreparation;C.authorize(FB.state);C.grant(FB.state);
    const checks=[];
    for (const change of [function(s){s.population.counties[C.origin].count=1;},
      function(s){s.market.counties[C.origin][0][s.market.goods.indexOf('provisions')]=0;},
      function(s){s.realms[C.rid].treasury.militaryAccrued=s.realms[C.rid].treasury.gold;}]) {
      const s=JSON.parse(JSON.stringify(FB.state));change(s);const before=JSON.stringify(s),q=P.review(s,C.id,'form',C.leader(s));
      checks.push(!q.allowed && !P.commit(s,q) && before===JSON.stringify(s));
    }
    const s=JSON.parse(JSON.stringify(FB.state)),unit=FBDATA.unitClasses.cav,old=unit.notCultures;
    unit.notCultures=[s.chars[C.leader(s)].culture];
    const before=JSON.stringify(s),q=P.review(s,C.id,'form',C.leader(s));
    checks.push(!q.allowed && !P.commit(s,q) && before===JSON.stringify(s));
    if (old===undefined) delete unit.notCultures;else unit.notCultures=old;
    return checks;
  });
  expect(result).toEqual(Array(4).fill(true));
});

test('the original formation receipt survives canonical host loss and commander death without reforming',async function ({page},info) {
  await begin(page,info,'harbor');
  const result=await page.evaluate(function () {
    const C=preparationCase,s=FB.state,M=FB.mobile;C.authorize(s);C.grant(s);
    if (!C.form(s)) return {formed:false};
    const receipt=JSON.stringify(C.record(s).formed),a=M.host(s,C.rid),n=a.men,c=s.chars[C.leader(s)];
    a.men=0;Object.keys(a.units).forEach(function(id){a.units[id]=0;});M.losses(s,a,n);FB.disbandArmy(s,a);
    c.dead=true;FB.royalCharDied(s,c,C.rid);
    const valid=M.validate(s),save=FB.save.serialize();FB.save.restore(JSON.parse(save));
    return {formed:true,valid:valid,receipt:receipt===JSON.stringify(C.record(FB.state).formed),
      noHost:!M.host(FB.state,C.rid),noReform:!C.form(FB.state),noReplacement:M.row(FB.state,C.rid).leaderId===null};
  });
  expect(result).toEqual({formed:true,valid:true,receipt:true,noHost:true,noReform:true,noReplacement:true});
});

test('shared preparation review displays actual costs and returns through Back without forming',async function ({page},info) {
  await begin(page,info,'harbor');
  await page.evaluate(function () {
    const C=preparationCase,s=FB.state;C.authorize(s);C.grant(s);s.player.charId=C.leader(s);FB.ui.showStorySheet(C.id);
  });
  await page.locator('[data-story-choice="form"]').click();
  await expect(page.locator('#genmodal')).toContainText('Public training cost:');
  await expect(page.locator('#genmodal')).toContainText('Public provision cost:');
  await page.locator('#genmodal').getByRole('button',{name:'Back',exact:true}).click();
  await expect(page.locator('[data-story-choice="form"]')).toBeVisible();
  expect(await page.evaluate(function () {return FB.state.stories[preparationCase.id].status;})).toBe('preparing');
});
