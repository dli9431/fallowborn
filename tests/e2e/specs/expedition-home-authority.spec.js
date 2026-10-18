'use strict';
const {test,expect}=require('../support/fixture');
const {openGame}=require('../support/game/navigation');
const {startAuthority,examples}=require('../support/game/expedition-authority');
const {dependsOnRuntime}=require('../support/runtime-dependencies');
dependsOnRuntime(__filename,['index.html','data/mobile_confederations.js','data/political_institutions.js',
  'js/home_authority.js','js/governments.js','js/government_continuity.js','js/government_levy.js',
  'js/government_administration.js','js/authority.js','js/treasury.js','js/wars.js','js/armies.js',
  'js/actions.js','js/fortifications.js','js/lordships.js','js/mobile_confederations.js','js/mobile_command.js',
  'js/bookmark_setup.js','js/starts.js','js/main.js','js/model.js','js/travel.js','js/mods.js','js/save_v4.js']);

for(const prefix of ['harbor','dune']) {
  test(prefix+' imports a pure local presence policy and existing exact deputy',async function ({page},info) {
    await startAuthority(page,info,prefix);
    const result=await page.evaluate(function (prefix) {
      const s=FB.state,H=FB.homeAuthority,rid=prefix==='harbor'?'harbor_upland':'dune_gate';
      const before=JSON.stringify(s),rng=FB.getRngState(),uid=FB.getUidCounter();
      const quotes=['levy','appointment','grant','war','spend'].map(function (op) {return H.quote(s,rid,op);});
      const deputy=FB.bookmarkActor(s,prefix+'_civil_officer');
      const delegated=H.quote(s,rid,'grant',{characterId:deputy.id});
      const denied=H.quote(s,rid,'war',{characterId:deputy.id});
      return {local:quotes.every(function (q) {return q.allowed && q.appointmentId===null;}),
        delegated:delegated.allowed,exactPower:!denied.allowed,person:delegated.characterId===deputy.id,
        pure:before===JSON.stringify(s)&&rng===FB.getRngState()&&uid===FB.getUidCounter()};
    },prefix);
    expect(result).toEqual({local:true,delegated:prefix==='harbor',exactPower:true,person:prefix==='harbor',pure:true});
  });
  test(prefix+' blocks absent home decisions while private funds and committed payments remain available',async function ({page},info) {
    await startAuthority(page,info,prefix,true);
    const result=await page.evaluate(function (prefix) {
      const s=FB.state,H=FB.homeAuthority,home=s.player.provinceId;
      const outside=prefix==='harbor'?'harbor_quay':'dune_well';
      s.player.travel={phase:'arrived',currentId:outside,legDaysLeft:0};
      const absent=['levy','war'].map(function (op) {return H.quote(s,'player',op).allowed;});
      const grants=H.quote(s,'player','grant').allowed,appointments=H.quote(s,'player','appointment').allowed;
      const blocked=!FB.governments.call(s,'player','levy','mayCall',{}),gold=s.player.gold;
      const paid=FB.treasuryTransfer(s,'player',null,1);
      s.player.travel=null;
      return {absent:absent,grants:grants,appointments:appointments,blocked:blocked,paid:paid,
        private:s.player.gold===gold-1,returned:H.quote(s,'player','war').allowed,home:s.player.provinceId===home};
    },prefix);
    expect(result).toEqual({absent:[false,false],grants:prefix==='harbor',appointments:prefix==='harbor',
      blocked:true,paid:true,private:true,returned:true,home:true});
  });
}

test('expiry, recall, issuer generation, scope, custody and a host Ban never supply missing civil powers',async function ({page},info) {
  await startAuthority(page,info,'harbor');
  const result=await page.evaluate(function () {
    const s=FB.state,H=FB.homeAuthority,rid='harbor_upland',c=FB.bookmarkActor(s,'harbor_civil_officer');
    const a=s.authority.appointments.find(function (a) {return a.officeId==='harbor_civil_deputy';});
    function allowed(state) {return H.quote(state,rid,'grant',{characterId:c.id,appointmentId:a.id}).allowed;}
    const scenarios=[function (t) {t.turn=30;},function (t) {t.authority.appointments.find(function (r) {return r.id===a.id;}).status='removed';},
      function (t) {t.authority.appointments.find(function (r) {return r.id===a.id;}).appointerGeneration++;},
      function (t) {t.authority.appointments.find(function (r) {return r.id===a.id;}).scope={kind:'host',id:FB.mobile.host(t,'harbor_following').id};},
      function (t) {t.chars[c.id].imprisoned=true;},function (t) {t.chars[c.id].dead=true;},
      function (t) {t.chars[c.id].homeProvinceId='harbor_quay';}];
    const rejected=scenarios.map(function (change) {const t=JSON.parse(JSON.stringify(s));change(t);return !allowed(t);});
    const scoped=JSON.parse(JSON.stringify(s)),row=scoped.authority.appointments.find(function (r) {return r.id===a.id;});
    row.scope={kind:'county',id:'harbor_ridge'};
    s.armies.push({id:'home-authority-host',realm:rid,at:'harbor_ridge',men:20,units:{levy:20},path:[],supply:100});
    const military=FB.authorityAppoint(s,{officeId:'harbor_host_officer',institutionId:rid,
      appointer:{kind:'realm',id:rid},holder:{kind:'character',id:c.id},scope:{kind:'host',id:'home-authority-host'}});
    return {base:allowed(s),rejected:rejected,realmBlocked:!allowed(scoped),
      county:H.quote(scoped,rid,'grant',{characterId:c.id,appointmentId:a.id,provinceId:'harbor_ridge'}).allowed,
      ban:!!military && FB.political.power(s,{kind:'character',id:c.id},'ban',{hostId:'home-authority-host'}).allowed,
      noCivilWar:!H.quote(s,rid,'war',{characterId:c.id}).allowed,
      unsupported:!H.quote(s,rid,'conquer_all').allowed};
  });
  expect(result).toEqual({base:true,rejected:Array(7).fill(true),realmBlocked:true,county:true,ban:true,noCivilWar:true,unsupported:true});
});

test('malformed imported home policies and office powers reject without publishing or consuming identities',async function ({page},info) {
  await openGame(page,info);
  const result=await page.evaluate(function (source) {
    const changes=[function (d) {d.governmentForms.harbor_home_court.homeAuthority.schema=2;},
      function (d) {d.governmentForms.harbor_home_court.homeAuthority.presence='everywhere';},
      function (d) {d.governmentForms.harbor_home_court.homeAuthority.delegation='yes';},
      function (d) {d.governmentForms.harbor_home_court.homeAuthority.extra=true;},
      function (d) {d.authorityOffices.harbor_civil_deputy.homePowers=['ban'];},
      function (d) {d.authorityOffices.harbor_civil_deputy.homePowers=['war','war'];},
      function (d) {d.authorityOffices.harbor_host_officer.homePowers=['grant'];}];
    return changes.map(function (change) {
      const d=JSON.parse(JSON.stringify(source));change(d);
      const before=JSON.stringify([FB.state,FBDATA]),rng=FB.getRngState(),uid=FB.getUidCounter();
      return FB.mods.validate(d).length>0 && before===JSON.stringify([FB.state,FBDATA]) && rng===FB.getRngState() && uid===FB.getUidCounter();
    });
  },examples.harbor);
  expect(result).toEqual(Array(7).fill(true));
});

test('an exact already accepted service award remains deliverable during absence without permitting a new grant',async function ({page},info) {
  await startAuthority(page,info,'harbor',true);
  const result=await page.evaluate(function () {
    const s=FB.state,pid=s.player.provinceId,Q=FB.political;
    s.dev[pid]=8;FB.rememberSettlementSites(s,pid);
    const site=FB.settlementGrantSites(s,pid,'player')[0],recipient=FB.bookmarkActor(s,'harbor_civil_officer');
    const contract=FB.authorityOfferContract(s,{patronRealmId:'player',federateRealmId:'harbor_commune',
      payPerSeason:0,endTurn:s.turn+30,settlementCountyIds:[],settlementAwards:[{provinceId:pid,settlement:site.settlement,recipientId:recipient.id}]});
    const one=FB.authorityConsentContract(s,contract.id,'player'),two=FB.authorityConsentContract(s,contract.id,'harbor_commune');
    s.player.travel={phase:'arrived',currentId:'harbor_quay',legDaysLeft:0};
    s.authority.appointments.filter(function (a) {return a.officeId==='harbor_civil_deputy';}).forEach(function (a) {a.status='removed';});
    const newGrant=FB.settlementGrantQuote(s,pid,site.settlement,recipient.id,'player');
    const quoted=Q.contractAwardQuote(s,contract.id,0),before=JSON.stringify(s);
    const forged=FB.settlementGrantQuote(s,pid,site.settlement,recipient.id,'player',{contractId:contract.id,awardIndex:1});
    const pure=before===JSON.stringify(s),paid=FB.authorityFulfillContractAward(s,contract.id,0,quoted);
    return {one:one,two:two,newGrant:newGrant===null,quoted:!!quoted,forged:forged===null,pure:pure,paid:paid,
      once:!FB.authorityFulfillContractAward(s,contract.id,0,quoted),holder:FB.settlementHolder(s,pid,site.settlement).id===recipient.id};
  });
  expect(result).toEqual({one:true,two:true,newGrant:true,quoted:true,forged:true,pure:true,paid:true,once:true,holder:true});
});
