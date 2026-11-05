'use strict';
const path = require('path');
const {test,expect} = require('../support/fixture');
const {openGame,prepareGameContent} = require('../support/game/navigation');
const {beginBookmarkFromTitle} = require('../support/game/bookmark-acceptance');
const {dependsOnRuntime} = require('../support/runtime-dependencies');
const charter = require('../fixtures/opening-minority-stewardship/young-charter.json');
const river = require('../fixtures/opening-minority-stewardship/river-minority.json');

dependsOnRuntime(__filename,[
  'data/aristocratic_courts.js','data/political_institutions.js','data/eras.js','data/technology.js',
  'js/governments.js','js/government_aristocracy.js','js/government_administration.js',
  'js/government_recognition.js','js/government_continuity.js','js/government_lineage.js',
  'js/bookmark_setup.js','js/authority.js','js/treasury.js','js/world.js','js/model.js',
  'js/starts.js','js/main.js','js/station.js','js/justice.js','js/fiscal.js',
  'js/save.js','js/save_v4.js','js/mods.js','js/stories.js','js/messages.js','js/i18n.js',
  'js/ui_misc.js','js/ui_modals.js'
]);

async function start(page,info,kind,options) {
  options=options || {};
  await openGame(page,info);
  const mod=JSON.parse(JSON.stringify(kind==='charter' ? charter : river));
  const world=Object.values(mod.bookmarks)[0], realm=world.realms[0], profile=Object.values(mod.aristocraticProfiles)[0];
  if (options.adult) realm.ruler.born=world.date.year-30;
  if (options.omit) delete profile.openingStewardActorId;
  expect(await page.evaluate(function (mod) { return FB.mods.validate(mod); },mod)).toEqual([]);
  await page.evaluate(function () { FB.ui.showMods(); });
  await page.locator('#modfile').setInputFiles(options.adult || options.omit ?
    {name:'opening-control.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(mod))} :
    path.resolve(__dirname,'../fixtures/opening-minority-stewardship/'+(kind==='charter' ? 'young-charter' : 'river-minority')+'.json'));
  await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded'}),page.locator('#mod-apply').click()]);
  await prepareGameContent(page);
  if (options.player) {
    const sid=realm.id+'_ruler';
    await page.evaluate(function (sid) {
      FBDATA.startScenarios.find(function (s) { return s.id===sid; }).hidden=false;
    },sid);
    const beginning=page.locator('#btn-choose-beginning');
    if (await beginning.isVisible()) await beginning.click();
    else await page.getByRole('button',{name:'New Game',exact:true}).click();
    await page.locator('#btn-bm-seed').click();
    await page.locator('#ng-seed').fill('MINORITY-'+world.id+'-'+sid+'-'+realm.capital+'-'+realm.ruler.sex+'-'+realm.ruler.name+'-standard');
    await page.locator('#ng-seed').press('Enter');
    await expect(page.locator('#chargen:not(.hidden)')).toBeVisible();
    await page.getByRole('button',{name:'Begin Your Story',exact:true}).click();
    await page.getByRole('button',{name:'Begin',exact:true}).click();
  } else await beginBookmarkFromTitle(page,world.id,mod.startScenarios[0].id);
  await page.evaluate(function (input) {
    FB.game.setPaused(true); FB.game.auto.all=true; FB.game.uiPrefs.hideTips=true;
    const s=FB.state, rid=input.player ? 'player' : input.rid;
    FB.realmHeldCounties(s,rid).forEach(function (pid) { FB.setCountySupport(s,pid,40); });
    if (rid==='player') s.player.gold=1000; else s.realms[rid].treasury.gold=1000;
    window.MINORITY={rid:rid,actor:{kind:'realm',id:rid},
      data:function () { return FB.aristocracy.state(FB.state,this.rid); },
      voices:function () { return FB.aristocracy.constituency(FB.state,this.rid); },
      profile:function () { return FB.aristocracy.profile(FB.state,this.rid); },
      snapshot:function () {
        return {state:FB.state,data:FBDATA,world:FB.world,active:FB.activeBookmark,
          bytes:JSON.stringify([FB.state,FBDATA,FB.englishMessages(),FB.stories.list(),FB.mods.sig(),
            FB.world && [FB.world.provs,FB.world.sites,FB.world.sitesByProv],localStorage,FB.getRngState()>>>0,FB.getUidCounter()])};
      },
      same:function (before) {
        const after=this.snapshot();
        return before.state===after.state && before.data===after.data && before.world===after.world &&
          before.active===after.active && before.bytes===after.bytes;
      },
      input:function () {
        const m=this.voices()[0];
        return {institutionId:this.rid,officeId:FB.administrationProfile(FB.state,this.rid).governor,
          holderId:FB.state.bookmarkSetup.actors.public_applicant,provinceId:m.scope.id,scope:m.scope};
      },
      roundTrip:function () {
        const original=JSON.parse(FB.save.serialize()), rid=this.rid;
        const ordered=function (value) {
          if (Array.isArray(value)) return value.map(ordered);
          if (!value || typeof value!=='object') return value;
          const out={}; Object.keys(value).sort().forEach(function (key) { out[key]=ordered(value[key]); }); return out;
        };
        const facts=function (compact) {
          const s=FB.save.expandedSnapshot(compact), treasury=s.realms[rid].treasury;
          // Existing treasury restoration supplies the absent zero cooldown.
          if (treasury && treasury.distributionCooldown===undefined) treasury.distributionCooldown=0;
          return ordered({opening:s.bookmarkSetup,government:s.authority.governments[rid],
            appointments:s.authority.appointments,rights:s.authority.rights,owner:s.owner,holder:s.holder,
            tree:s.realms[rid].succession,householdGold:s.player.gold,treasury:treasury,people:Object.keys(s.chars).sort()});
        };
        const before=facts(original.state), seed=FB.aristocracy.seed;
        let noSeed=true;
        FB.aristocracy.seed=function () { noSeed=false; throw new Error('Restore invoked fresh seeding'); };
        try { FB.save.restore(original); FB.save.restore(JSON.parse(FB.save.serialize())); }
        finally { FB.aristocracy.seed=seed; }
        const after=JSON.parse(FB.save.serialize());
        const restored=facts(after.state), different=Object.keys(before).filter(function (key) {
          return JSON.stringify(before[key])!==JSON.stringify(restored[key]);
        });
        if (different.length) throw new Error('Changed restored facts: '+JSON.stringify(different.map(function (key) {
          return {key:key,before:before[key],after:restored[key]};
        })));
        return {facts:!different.length,rng:(original.rng>>>0)===(after.rng>>>0),uid:original.uid===after.uid,
          signature:original.mods===after.mods && !FB.save.otherWorld(original),noSeed:noSeed};
      }
    };
  },{rid:realm.id,player:!!options.player});
}

for (const kind of ['charter','river']) {
  test(kind+' fresh minority binds the declared principal once and restores exact public facts',async function ({page},info) {
    await start(page,info,kind);
    const result=await page.evaluate(function () {
      const M=MINORITY,s=FB.state,p=M.profile(),data=M.data(),G=FB.governments;
      const before=M.snapshot(), regency=JSON.stringify(data.regency), people=Object.keys(s.chars).length;
      const selected=s.bookmarkSetup.actors[p.openingStewardActorId], sitting=FB.realmRulerCharacterSnapshot(s,M.rid);
      const reads=[];
      for (let i=0;i<3;i++) {
        reads.push(G.publicAuthorityReadiness(s,M.rid).kind);
        FB.publicAppointmentQuote(s,M.actor,M.input());
        FB.governmentRecognition.supportQuote(s,M.actor,M.rid,'court',FB.governmentRecognition.candidates(s,M.rid)[0].id);
      }
      const pure=M.same(before);
      FB.aristocracy.seed(s); FB.stories.start(s); FB.aristocracy.seed(s);
      const once=M.same(before) && regency===JSON.stringify(data.regency);
      return {age:s.date.year-sitting.born,minimum:p.minimumAge,threshold:p.threshold,
        interests:data.interests.length,selected:data.regency.stewardId===selected,
        notStrongest:M.voices().find(function (m) { return m.principal.id===selected; }).weight <
          Math.max.apply(null,M.voices().map(function (m) { return m.weight; })),
        generation:data.regency.generation===FB.realmRulerGeneration(s,M.rid),turn:data.regency.sinceTurn===s.turn,
        noAccession:!s.authority.governments[M.rid].lastAccession && sitting.id!==selected,
        people:people===Object.keys(s.chars).length,pure:pure,once:once,reads:reads,restore:M.roundTrip()};
    });
    expect(result).toEqual({age:kind==='charter' ? 10 : 13,minimum:kind==='charter' ? 16 : 18,
      threshold:kind==='charter' ? 0.6 : 0.7,interests:kind==='charter' ? 2 : 3,selected:true,notStrongest:true,
      generation:true,turn:true,noAccession:true,people:true,pure:true,once:true,
      reads:['stewardship','stewardship','stewardship'],restore:{facts:true,rng:true,uid:true,signature:true,noSeed:true}});
  });

  test(kind+' every public seam fails closed while independent magnate decisions remain available',async function ({page},info) {
    await start(page,info,kind);
    const result=await page.evaluate(function () {
      const M=MINORITY,s=FB.state,A=FB.aristocracy,R=FB.governmentRecognition,G=FB.governments;
      const office=FB.publicAppoint(s,FB.publicAppointmentQuote(s,M.actor,M.input()));
      if (!office) throw new Error('Expected funded public appointment');
      const input=Object.assign({},M.input(),{officeId:FB.administrationProfile(s,M.rid).fiscal});
      const incumbent=s.chars[M.data().regency.stewardId], voice=M.voices().find(function (m) { return m.principal.id!==incumbent.id; });
      const assignment=s.authority.appointments.find(function (row) { return row.id===M.voices().find(function (m) { return m.principal.id===incumbent.id; }).appointmentId; });
      const right=s.authority.rights.find(function (r) { return r.id===M.voices().find(function (m) { return m.principal.id===incumbent.id; }).rightIds[0]; });
      const candidate=R.candidates(s,M.rid)[0], terms=M.profile().defaultTerms;
      const cases=[
        ['captivity',function () { incumbent.captive=true; }],['death',function () { incumbent.dead=true; }],
        ['unfree',function () { incumbent.unfree=true; }],['exile',function () { incumbent.exiled=true; }],
        ['imprisonment',function () { incumbent.imprisoned=true; }],
        ['underage',function () { incumbent.born=s.date.year-M.profile().minimumAge+1; }],
        ['jurisdiction',function () { right.strength=49; }],['removal',function () { assignment.status='removed'; }],
        ['generation',function () { M.data().regency.generation++; }],['absence',function () { M.data().regency=null; }]
      ];
      const rows=cases.map(function (entry) {
        const original=JSON.parse(JSON.stringify([incumbent,assignment,right,M.data().regency]));
        const review=[FB.publicAppointmentQuote(s,M.actor,input),FB.publicOfficeQuote(s,M.actor,office.id,'remove'),
          FB.publicOfficeQuote(s,M.actor,office.id,'audit'),FB.publicOfficeQuote(s,office.holder,office.id,'remit',0.75),
          R.supportQuote(s,M.actor,M.rid,'court',candidate.id),R.supportQuote(s,M.actor,M.rid,voice.id,candidate.id,terms),
          A.provincialQuote(s,M.actor,M.rid,voice.id,'negotiate',terms)];
        if (!review.every(function (q) { return q.allowed; })) throw new Error('Baseline public review unavailable');
        entry[1](); const before=M.snapshot();
        const stale=[FB.publicAppoint(s,review[0]),FB.publicOfficeApply(s,review[1]),FB.publicOfficeApply(s,review[2]),
          FB.publicOfficeApply(s,review[3]),R.applySupport(s,review[4]),R.applySupport(s,review[5]),A.apply(s,review[6])];
        const consent=['levy','war','treaty','grant','extraordinary_tax'].map(function (op) { return FB.political.consent(s,M.actor,op,{}).allowed; });
        const personActor={kind:'character',id:FB.realmRulerCharacterSnapshot(s,M.rid).id};
        const blocked=!G.publicAuthorityReadiness(s,M.rid).allowed && !FB.publicAppointmentQuote(s,personActor,input).allowed &&
          !FB.publicAppointmentEffective(s,s.authority.appointments.find(function (r) { return r.id===office.id; })) &&
          !FB.political.power(s,office.holder,'peace',{provinceId:input.provinceId}).allowed;
        const pure=M.same(before), independent=R.supportQuote(s,voice.principal,M.rid,voice.id,candidate.id).allowed &&
          R.supportQuote(s,voice.principal,M.rid,voice.id,null).allowed;
        const withheld=A.apply(s,A.provincialQuote(s,voice.principal,M.rid,voice.id,'withhold'));
        const enforcement=A.provincialQuote(s,M.actor,M.rid,voice.id,'enforce');
        const principalBargain=A.provincialQuote(s,voice.principal,M.rid,voice.id,'negotiate',terms);
        const assent=A.apply(s,A.provincialQuote(s,voice.principal,M.rid,voice.id,'assent'));
        [incumbent,assignment,right].forEach(function (o,i) {
          Object.keys(o).forEach(function (k) { delete o[k]; }); Object.assign(o,original[i]);
        });
        M.data().regency=original[3];
        return {case:entry[0],stale:stale.every(function (v) { return !v; }),consent:consent.every(function (v) { return !v; }),
          blocked:blocked,pure:pure,independent:independent,withheld:withheld,assent:assent,
          enforcement:!enforcement.allowed,principalBargain:!principalBargain.allowed};
      });
      return rows;
    });
    expect(result).toEqual(['captivity','death','unfree','exile','imprisonment','underage','jurisdiction','removal','generation','absence'].map(function (name) {
      return {case:name,stale:true,consent:true,blocked:true,pure:true,independent:true,withheld:true,assent:true,enforcement:true,principalBargain:true};
    }));
  });

  test(kind+' reviewed replacement and staged adulthood restore authority without money or sovereignty',async function ({page},info) {
    await start(page,info,kind);
    const result=await page.evaluate(function () {
      const M=MINORITY,s=FB.state,A=FB.aristocracy,G=FB.governments,old=M.data().regency.stewardId;
      const sitting=FB.realmRulerCharacterSnapshot(s,M.rid),gen=FB.realmRulerGeneration(s,M.rid),people=Object.keys(s.chars).sort();
      const money=JSON.stringify([s.player.gold,s.realms[M.rid].treasury,Object.values(s.chars).map(function (c) { return c.gold; })]);
      const property=JSON.stringify([s.owner,s.holder,s.bookmarkSetup.estates]);
      s.chars[old].captive=true;
      const q=A.stewardQuote(s,M.actor,M.rid), before=M.snapshot();
      const pure=q.allowed && M.same(before), next=s.chars[q.stewardId];
      next.captive=true; const changed=M.snapshot(), stale=!A.steward(s,q) && M.same(changed); delete next.captive;
      const fresh=A.stewardQuote(s,M.actor,M.rid), replaced=A.steward(s,fresh), once=!A.steward(s,fresh);
      const restored=G.publicAuthorityReadiness(s,M.rid).kind==='stewardship' && FB.political.consent(s,M.actor,'war',{}).allowed;
      const noSovereignPower=!FB.political.consent(s,{kind:'character',id:next.id},'war',{}).allowed;
      next.captive=true;
      s.date.year=sitting.born+M.profile().minimumAge-1;
      const below=!G.publicAuthorityReadiness(s,M.rid).allowed;
      s.date.year++;
      const adult=G.publicAuthorityReadiness(s,M.rid).kind==='adult' && FB.political.consent(s,M.actor,'war',{}).allowed;
      FB.publicOfficeSettle(s,null,0,false); A.seed(s);
      return {pure:pure,stale:stale,replaced:replaced,once:once,restored:restored,noSovereignPower:noSovereignPower,below:below,adult:adult,
        ended:M.data().regency===null,generation:gen===FB.realmRulerGeneration(s,M.rid),
        identity:sitting.id===FB.realmRulerCharacterSnapshot(s,M.rid).id && JSON.stringify(people)===JSON.stringify(Object.keys(s.chars).sort()),
        money:money===JSON.stringify([s.player.gold,s.realms[M.rid].treasury,Object.values(s.chars).map(function (c) { return c.gold; })]),
        property:property===JSON.stringify([s.owner,s.holder,s.bookmarkSetup.estates])};
    });
    expect(result).toEqual({pure:true,stale:true,replaced:true,once:true,restored:true,noSovereignPower:true,below:true,adult:true,ended:true,generation:true,identity:true,money:true,property:true});
  });

  test(kind+' player adoption retains the young sovereign and the already bound steward',async function ({page},info) {
    await start(page,info,kind,{player:true});
    const result=await page.evaluate(function () {
      const M=MINORITY,s=FB.state,r=M.data().regency,p=M.profile(), before=M.snapshot();
      FB.aristocracy.seed(s); FB.stories.start(s);
      const result={rid:M.rid,age:s.date.year-s.chars[s.player.charId].born,once:M.same(before),
        principal:r.stewardId===s.bookmarkSetup.actors[p.openingStewardActorId],
        generation:r.generation===FB.realmRulerGeneration(s,'player'),
        ready:FB.governments.publicAuthorityReadiness(s,'player').kind,
        war:FB.political.consent(s,{kind:'character',id:s.player.charId},'war',{}).allowed,restore:M.roundTrip()};
      const live=FB.state,R=FB.governmentRecognition,actor={kind:'character',id:live.player.charId};
      const candidate=R.candidates(live,'player')[0],steward=live.chars[M.data().regency.stewardId];
      const voice=M.voices().find(function (m) { return m.principal.id!==steward.id; }),readyBefore=M.snapshot();
      const designation=R.supportQuote(live,actor,'player','court',candidate.id);
      const bargain=R.supportQuote(live,actor,'player',voice.id,candidate.id,p.defaultTerms);
      const pure=M.same(readyBefore);
      steward.captive=true; const impaired=M.snapshot();
      result.recognition={ready:designation.allowed && bargain.allowed,pure:pure,
        blocked:!R.supportQuote(live,actor,'player','court',candidate.id).allowed &&
          !R.supportQuote(live,actor,'player',voice.id,candidate.id,p.defaultTerms).allowed,
        stale:!R.applySupport(live,designation) && !R.applySupport(live,bargain),
        independent:R.supportQuote(live,voice.principal,'player',voice.id,candidate.id).allowed,
        rejectedPure:M.same(impaired)};
      return result;
    });
    expect(result).toEqual({rid:'player',age:kind==='charter' ? 10 : 13,once:true,principal:true,generation:true,ready:'stewardship',war:true,
      restore:{facts:true,rng:true,uid:true,signature:true,noSeed:true},
      recognition:{ready:true,pure:true,blocked:true,stale:true,independent:true,rejectedPure:true}});
  });
}

for (const options of [{adult:true},{omit:true},{adult:true,omit:true}]) {
  test('opening controls '+JSON.stringify(options)+' keep regency absent and never allocate a steward',async function ({page},info) {
    await start(page,info,'charter',options);
    const result=await page.evaluate(function () {
      const M=MINORITY,s=FB.state,before=M.snapshot(), map=Object.assign({},s.bookmarkSetup.actors);
      FB.aristocracy.seed(s); FB.stories.start(s);
      const ready=FB.governments.publicAuthorityReadiness(s,M.rid);
      return {regency:M.data().regency,once:M.same(before),map:JSON.stringify(map)===JSON.stringify(s.bookmarkSetup.actors),
        count:Object.keys(map).length,ready:ready.allowed,kind:ready.kind,legacy:ready.legacy,restore:M.roundTrip()};
    });
    expect(result).toEqual({regency:null,once:true,map:true,count:5,ready:true,
      kind:options.adult ? 'adult' : 'minor_without_steward',legacy:!options.adult,
      restore:{facts:true,rng:true,uid:true,signature:true,noSeed:true}});
  });
}

test('adult public vacancies retain court recognition without materializing another ruler',async function ({page},info) {
  await start(page,info,'charter',{adult:true,omit:true});
  const result=await page.evaluate(function () {
    const M=MINORITY,s=FB.state,R=FB.governmentRecognition,t=s.realms[M.rid].succession;
    const king=FB.realmRulerCharacterSnapshot(s,M.rid),candidate=R.candidates(s,M.rid)[0];
    king.dead=true; t.members[t.rulerMemberId].alive=false;
    s.authority.governments[M.rid].publicVacancy={generation:FB.realmRulerGeneration(s,M.rid),cause:'death',openedTurn:s.turn};
    const before=M.snapshot(),q=R.supportQuote(s,M.actor,M.rid,'court',candidate.id),pure=M.same(before);
    return {ready:FB.governments.publicAuthorityReadiness(s,M.rid).allowed,pure:pure,recognition:q.allowed && R.applySupport(s,q),
      vacancy:!FB.political.consent(s,M.actor,'war',{}).allowed};
  });
  expect(result).toEqual({ready:true,pure:true,recognition:true,vacancy:true});
});

test('confirmation, enforcement and governor replacement recheck stewardship while private repayment continues',async function ({page},info) {
  await start(page,info,'charter');
  const result=await page.evaluate(function () {
    const M=MINORITY,s=FB.state,A=FB.aristocracy;
    const office=FB.publicAppoint(s,FB.publicAppointmentQuote(s,M.actor,M.input()));
    const row=s.authority.appointments.find(function (r) { return r.id===office.id; });
    const holder=s.chars[row.holder.id], steward=s.chars[M.data().regency.stewardId], voice=M.voices()[1];
    row.publicTerms.confirmation='reaffirm'; row.appointerGeneration=FB.realmRulerGeneration(s,M.rid)-1;
    const confirm=FB.publicOfficeQuote(s,M.actor,row.id,'confirm');
    const withheld=A.apply(s,A.provincialQuote(s,voice.principal,M.rid,voice.id,'withhold'));
    const enforce=A.provincialQuote(s,M.actor,M.rid,voice.id,'enforce');
    steward.captive=true;
    const before=M.snapshot(),denied=confirm.allowed && enforce.allowed &&
      !FB.publicOfficeApply(s,confirm) && !A.apply(s,enforce) && M.same(before);
    row.publicTerms.arrears=3; holder.gold=9;
    const purse=s.realms[M.rid].treasury.gold,repay=FB.publicOfficeQuote(s,row.holder,row.id,'repay');
    const repaid=repay.allowed && FB.publicOfficeApply(s,repay) && holder.gold===6 &&
      s.realms[M.rid].treasury.gold===purse+3 && row.publicTerms.arrears===0;
    delete steward.captive;
    const confirmed=FB.publicOfficeApply(s,FB.publicOfficeQuote(s,M.actor,row.id,'confirm'));
    const enforced=A.apply(s,A.provincialQuote(s,M.actor,M.rid,voice.id,'enforce'));
    const property=JSON.stringify([s.owner,s.holder,s.bookmarkSetup.estates,s.authority.rights]),fee=FB.administrationProfile(s,M.rid).appointmentCost;
    const removed=FB.publicOfficeApply(s,FB.publicOfficeQuote(s,M.actor,row.id,'remove'));
    const input=Object.assign({},M.input(),{holderId:s.bookmarkSetup.actors.alder_heir});
    const gold=s.realms[M.rid].treasury.gold,replacement=FB.publicAppoint(s,FB.publicAppointmentQuote(s,M.actor,input));
    return {withheld:withheld,denied:denied,repaid:repaid,confirmed:confirmed,enforced:enforced,removed:removed,
      replaced:!!replacement && replacement.holder.id===input.holderId,fee:gold-s.realms[M.rid].treasury.gold===fee,
      property:property===JSON.stringify([s.owner,s.holder,s.bookmarkSetup.estates,s.authority.rights])};
  });
  expect(result).toEqual({withheld:true,denied:true,repaid:true,confirmed:true,enforced:true,removed:true,replaced:true,fee:true,property:true});
});

test('invalid opening actors and policy imports remain detached and unpublished',async function ({page},info) {
  await start(page,info,'river');
  const result=await page.evaluate(function (mod) {
    const mutations=[
      function (p) { p.openingStewardActorId=null; },function (p) { p.openingStewardActorId=17; },
      function (p) { p.openingStewardActorId=''; },function (p) { p.openingStewardActorId='missing'; },
      function (p) { p.openingStewardActorId='hazel_heir'; },
      function (p,b) { delete b.opening.actors.hazel_principal; },
      function (p,b) { b.opening.actors.hazel_principal.dyn='foreign'; },
      function (p,b) { b.opening.actors.hazel_principal.born=b.date.year-17; },
      function (p,b) { b.opening.actors.hazel_principal.captive=true; },
      function (p,b) { b.opening.actors.hazel_principal={ref:{kind:'realm_ruler',realmId:'river_court'}}; },
      function (p,b) { b.provinces[2].realm='foreign_court'; },
      function (p) { p.minimumAge=19; }
    ];
    return mutations.map(function (mutate) {
      const input=JSON.parse(JSON.stringify(mod)), p=input.aristocraticProfiles.river_stewardship,b=input.bookmarks.river_minority_world;
      mutate(p,b);
      const bytes=JSON.stringify(input),before=MINORITY.snapshot(), faults=FB.mods.validate(input);
      let threw=false; try { FB.mods.apply(input); } catch (error) { threw=true; }
      return {rejected:faults.length>0 && threw,pure:MINORITY.same(before),input:bytes===JSON.stringify(input)};
    });
  },river);
  expect(result).toEqual(Array.from({length:12},function () { return {rejected:true,pure:true,input:true}; }));
});

test('AI fails closed without capable interests, then uses the same lawful replacement and recognition',async function ({page},info) {
  await start(page,info,'river');
  const result=await page.evaluate(function () {
    const M=MINORITY,s=FB.state,A=FB.aristocracy,old=M.data().regency.stewardId;
    M.voices().forEach(function (m) { s.chars[m.principal.id].captive=true; });
    const facts=function () { return JSON.stringify([s.owner,s.holder,s.bookmarkSetup,s.authority.appointments,s.authority.rights,
      s.authority.governments[M.rid].recognition,s.realms[M.rid].treasury,s.player.gold,s.log]); };
    const before=facts(),rng=FB.getRngState(),uid=FB.getUidCounter();
    A.ai(s,M.rid); FB.publicRecognitionAI(s,M.rid);
    const blocked=!FB.governments.publicAuthorityReadiness(s,M.rid).allowed && before===facts();
    const expected=A.constituency(s,M.rid).filter(function (m) { return m.principal.id!==old; }).sort(function (a,b) { return b.weight-a.weight; })[0];
    M.voices().forEach(function (m) { if (m.principal.id!==old) delete s.chars[m.principal.id].captive; });
    const quote=A.stewardQuote(s,M.actor,M.rid),treasury=JSON.stringify(s.realms[M.rid].treasury);
    A.ai(s,M.rid); FB.publicRecognitionAI(s,M.rid);
    return {blocked:blocked,expected:quote.stewardId===expected.principal.id,
      replacement:M.data().regency.stewardId===quote.stewardId,
      court:!!s.authority.governments[M.rid].recognition.court,
      funds:treasury===JSON.stringify(s.realms[M.rid].treasury),uid:uid===FB.getUidCounter(),rng:rng===FB.getRngState()};
  });
  expect(result).toEqual({blocked:true,expected:true,replacement:true,court:true,funds:true,uid:true,rng:true});
});

test('detached regency validation rejects missing or forged bindings and matching impaired saves never reseed',async function ({page},info) {
  await start(page,info,'river');
  const result=await page.evaluate(function () {
    const M=MINORITY,s=FB.state,rid=M.rid,original=JSON.parse(FB.save.serialize());
    const changes=[function (d) { d.regency=null; },function (d) { d.regency.generation=0; },
      function (d) { d.regency.stewardId=s.bookmarkSetup.actors.public_applicant; },
      function (d) { d.regency.sinceTurn=s.turn+1; }];
    const rejected=changes.map(function (change) {
      const input=JSON.parse(JSON.stringify(original)); change(input.state.authority.governments[rid].aristocracy);
      const bytes=JSON.stringify(input),before=M.snapshot(); let failed=false;
      try { FB.save.restore(input); } catch (error) { failed=true; }
      return failed && M.same(before) && bytes===JSON.stringify(input);
    });
    s.chars[M.data().regency.stewardId].dead=true;
    const impaired=M.roundTrip(),unchanged=MINORITY.data().regency.stewardId===original.state.authority.governments[rid].aristocracy.regency.stewardId;
    return {rejected:rejected,impaired:impaired,unchanged:unchanged,blocked:!FB.governments.publicAuthorityReadiness(FB.state,rid).allowed};
  });
  expect(result).toEqual({rejected:[true,true,true,true],impaired:{facts:true,rng:true,uid:true,signature:true,noSeed:true},unchanged:true,blocked:true});
});

test('a changed imported stewardship policy keeps exact incompatible-save fingerprints',async function ({page},info) {
  await start(page,info,'river');
  const saved=await page.evaluate(function () { return FB.save.serialize(); });
  const mod=JSON.parse(JSON.stringify(river));
  mod.aristocraticProfiles.river_stewardship.openingStewardActorId='cedar_principal';
  await page.evaluate(function () { FB.ui.showMods(); });
  await page.locator('#modfile').setInputFiles({name:'changed-steward.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(mod))});
  await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded'}),page.locator('#mod-apply').click()]);
  await prepareGameContent(page);
  const result=await page.evaluate(function (saved) {
    const input=JSON.parse(saved), before=JSON.stringify([FB.state,FBDATA,FB.englishMessages(),FB.stories.list(),localStorage,FB.getRngState(),FB.getUidCounter()]);
    const other=FB.save.otherWorld(input); let rejected=false;
    try { FB.save.restore(input); } catch (error) { rejected=true; }
    return {other:!!other,rejected:rejected,pure:before===JSON.stringify([FB.state,FBDATA,FB.englishMessages(),FB.stories.list(),localStorage,FB.getRngState(),FB.getUidCounter()])};
  },saved);
  expect(result).toEqual({other:true,rejected:true,pure:true});
});
