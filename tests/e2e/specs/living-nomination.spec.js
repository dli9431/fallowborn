'use strict';
const path = require('path');
const {test, expect} = require('../support/fixture');
const {openGame, prepareGameContent} = require('../support/game/navigation');
const {beginBookmarkFromTitle} = require('../support/game/bookmark-acceptance');
const {dependsOnRuntime} = require('../support/runtime-dependencies');
const consultation = require('../fixtures/living-nomination/consultation.json');
const river = require('../fixtures/living-nomination/river-consultation.json');

dependsOnRuntime(__filename, ['data/political_institutions.js','data/technology.js',
  'js/government_selection.js','js/government_lineage.js','js/government_elective.js',
  'js/governments.js','js/government_ai.js','js/government_continuity.js',
  'js/world.js','js/model.js','js/main.js','js/starts.js','js/institutions.js',
  'js/station.js','js/justice.js','js/authority.js','js/treasury.js',
  'js/mods.js','js/save.js','js/save_v4.js','js/ui_modals.js','js/ui_misc.js']);

async function start(page, info, kind, livingOption) {
  await openGame(page, info);
  const mod = JSON.parse(JSON.stringify(kind === 'consultation' ? consultation : river));
  if (livingOption !== undefined) {
    const procedure=mod.governmentForms.river_consultation_demo.selectionProfile.procedure;
    if (livingOption === 'omit') delete procedure.livingNomination;
    else procedure.livingNomination=livingOption;
  }
  expect(await page.evaluate(function (mod) { return FB.mods.validate(mod); }, mod)).toEqual([]);
  await page.evaluate(function () { FB.ui.showMods(); });
  await page.locator('#modfile').setInputFiles(livingOption !== undefined ?
    {name:'river-control.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(mod))} :
    path.resolve(__dirname,'../fixtures/living-nomination/' + (kind === 'consultation' ? 'consultation.json' : 'river-consultation.json')));
  await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded'}), page.locator('#mod-apply').click()]);
  await prepareGameContent(page);
  await beginBookmarkFromTitle(page, kind === 'consultation' ? 'consultation_world' : 'river_consultation_world',
    kind === 'consultation' ? 'consultation_farmer' : 'river_farmer_demo');
  await page.evaluate(function (kind) {
    const s = FB.state, S = FB.governmentSelection;
    const rid = kind === 'consultation' ? 'consultation_court' : 'river_court_demo';
    const home = s.realms[rid].capital;
    FB.realmHeldCounties(s,rid).forEach(function (pid) { FB.setCountySupport(s,pid,40); });
    let c;
    if (kind === 'river') c = s.chars[s.localInstitutions.river_council_demo.representativeId];
    else {
      c = FB.makeCharacter(s,{name:'Nadir',dyn:'Independent House',sex:'m',born:s.date.year-30,
        culture:'arabic',religion:'consultation_faith_demo',station:2,role:'notable',quality:1,traitsN:0});
      c.homeProvinceId = home; c.gold = 29;
    }
    window.livingTest = {
      rid:rid, cid:c.id,
      request:function (cid, memberId) {
        const m = S.constituency(FB.state,rid).find(function (row) { return !memberId || row.id === memberId; });
        return {action:'nominate',memberId:m.id,characterId:cid || this.cid,
          actor:m.currentPrincipal && m.currentPrincipal.kind === 'character' ?
            {kind:'character',id:m.currentPrincipal.id} : {kind:'constituency',realmId:rid,id:m.id}};
      },
      snapshot:function () {
        return {state:FB.state,data:FBDATA,world:FB.world,active:FB.activeBookmark,
          bytes:JSON.stringify([FB.state,FBDATA,FB.englishMessages(),FB.stories.list(),
            FB.world && [FB.world.provs,FB.world.sites,FB.world.sitesByProv,FB.world.sitesRender],
            FB.mods.sig(),localStorage,FB.getRngState() >>> 0,FB.getUidCounter()])};
      },
      same:function (before) {
        const after = this.snapshot();
        return before.state === after.state && before.data === after.data && before.world === after.world &&
          before.active === after.active && before.bytes === after.bytes;
      },
      protectedFacts:function () {
        const s = FB.state;
        return JSON.stringify([s.owner,s.holder,s.player.gold,s.player.holdings,s.settlementLordships,
          s.realms[rid].treasury,s.religiousHeads,s.authority.appointments,s.authority.rights,s.authority.contracts]);
      },
      admit:function () { return S.apply(FB.state,S.quote(FB.state,rid,this.request())); },
      id:function () { return FB.state.chars[this.cid].royalLine.memberId; },
      roundTrip:function () {
        const before = JSON.parse(FB.save.serialize()), live = FB.state;
        const selection = JSON.stringify(S.state(live,rid));
        FB.save.restore(before);
        const after = JSON.parse(FB.save.serialize());
        return {selection:selection === JSON.stringify(S.state(FB.state,rid)),
          tree:JSON.stringify(before.state.realms[rid].succession) === JSON.stringify(after.state.realms[rid].succession),
          person:JSON.stringify(before.state.chars[this.cid]) === JSON.stringify(after.state.chars[this.cid]),
          uid:before.uid === after.uid,rng:(before.rng >>> 0) === (after.rng >>> 0),
          signature:before.mods === after.mods && !FB.save.otherWorld(before)};
      }
    };
  },kind);
}

for (const kind of ['consultation','river']) {
  test(kind + ' admits an existing person before a vacancy without authority, payment or kinship', async function ({page},info) {
    await start(page,info,kind);
    const result = await page.evaluate(function () {
      const L = livingTest, s = FB.state, S = FB.governmentSelection, rid = L.rid, t = s.realms[rid].succession;
      const c = s.chars[L.cid], person = JSON.stringify(c), property = L.protectedFacts();
      const generation = t.rulerGeneration, ruler = t.rulerMemberId, recognition = JSON.stringify(S.state(s,rid).recognition);
      const before = L.snapshot(), q = S.quote(s,rid,L.request());
      for (let i=0;i<3;i++) { S.nominees(s,rid); S.candidates(s,rid); S.constituency(s,rid); S.quote(s,rid,L.request()); }
      const pure = L.same(before), uid = FB.getUidCounter(), rng = FB.getRngState();
      const admitted = S.apply(s,q), member = t.members[L.id()], current = L.snapshot();
      const duplicate = S.apply(s,q), duplicatePure = L.same(current);
      const actual = JSON.parse(JSON.stringify(c)); delete actual.royalLine;
      return {allowed:q.allowed,cost:q.cost,pure:pure,admitted:admitted,duplicate:duplicate,duplicatePure:duplicatePure,
        samePerson:person === JSON.stringify(actual),member:member.role === 'electoral_candidate' && member.charId === c.id && member.parentId === null,
        relative:S.candidates(s,rid).some(function (id) { return /_authored_relative$/.test(id); }),
        noVacancy:S.state(s,rid).vacancy === null,unchanged:RulerUnchanged(),property:property === L.protectedFacts(),
        recognition:recognition === JSON.stringify(S.state(s,rid).recognition),
        noResolve:!S.quote(s,rid,{action:'resolve',actor:{kind:'realm',id:rid}}).allowed,
        counters:uid === FB.getUidCounter() && rng === FB.getRngState(),
        validation:FB.governments.validate(),technology:FB.validateTechnologyData(),
        impact:FBDATA.techImpactReviews.features.elective_crown_nomination.mode};
      function RulerUnchanged() { return t.rulerMemberId === ruler && t.rulerGeneration === generation; }
    });
    expect(result).toEqual({allowed:true,cost:0,pure:true,admitted:true,duplicate:false,duplicatePure:true,
      samePerson:true,member:true,relative:kind === 'consultation',noVacancy:true,unchanged:true,property:true,
      recognition:true,noResolve:true,counters:true,validation:[],technology:[],impact:'none'});
    for (let i=0;i<2;i++) expect(await page.evaluate(function () { return livingTest.roundTrip(); })).toEqual({
      selection:true,tree:true,person:true,uid:true,rng:true,signature:true});
  });

  test(kind + ' AI admits at the seasonal owner once and retains one qualified alternative', async function ({page},info) {
    await start(page,info,kind);
    const result = await page.evaluate(function () {
      const L = livingTest, s = FB.state, S = FB.governmentSelection, rid = L.rid, t = s.realms[rid].succession;
      // Establish the incumbent's independent mandate before isolating admission.
      if (!S.recognized(s,rid)) {
        S.apply(s,S.quote(s,rid,{action:'assent',actor:{kind:'realm',id:rid},candidateId:t.rulerMemberId,terms:S.profile(s,rid).terms}));
      }
      const baselineRecognized=S.recognized(s,rid);
      const property = L.protectedFacts(), ruler = t.rulerMemberId, generation = t.rulerGeneration;
      const recognition = JSON.stringify(S.state(s,rid).recognition), preference = t.designatedHeirId;
      const uid = FB.getUidCounter(), rng = FB.getRngState();
      const admitted = FB.governments.call(s,rid,'ai','offices',{}), first = L.snapshot();
      const repeat = FB.governments.call(s,rid,'ai','offices',{}), same = L.same(first);
      const count = Object.values(t.members).filter(function (m) { return m.role === 'electoral_candidate'; }).length;
      // Stage two seasonal boundaries without simulating elapsed days.
      s.turn += 90; FB.governments.call(s,rid,'ai','offices',{});
      s.turn += 90; FB.governments.call(s,rid,'ai','offices',{});
      return {baselineRecognized:baselineRecognized,admitted:admitted,repeat:repeat,same:same,count:count,
        noAccumulation:Object.values(t.members).filter(function (m) { return m.role === 'electoral_candidate'; }).length === count,
        noDesignation:t.designatedHeirId === preference,noAccession:t.rulerMemberId === ruler && t.rulerGeneration === generation,
        noVacancy:S.state(s,rid).vacancy === null,recognition:recognition === JSON.stringify(S.state(s,rid).recognition),
        property:property === L.protectedFacts(),counters:uid === FB.getUidCounter() && rng === FB.getRngState()};
    });
    expect(result).toEqual({baselineRecognized:true,admitted:true,repeat:false,same:true,count:1,noAccumulation:true,noDesignation:true,
      noAccession:true,noVacancy:true,recognition:true,property:true,counters:true});
  });
}

test('designation and weighted support remain independent of living admission and a resolved vacancy stays historical', async function ({page},info) {
  await start(page,info,'river');
  const result = await page.evaluate(function () {
    const L = livingTest, s = FB.state, S = FB.governmentSelection, rid = L.rid, t = s.realms[rid].succession;
    if (!L.admit()) throw new Error('Admission refused');
    const actor = {kind:'realm',id:rid}, id = L.id(), p = S.profile(s,rid), generation = t.rulerGeneration;
    const before = L.snapshot(), designation = S.quote(s,rid,{action:'designate',actor:actor,candidateId:id});
    const refused = !designation.allowed && !S.apply(s,designation) && L.same(before);
    const young = s.chars[s.localInstitutions.river_households_demo.representativeId];
    const underAge = !S.quote(s,rid,L.request(young.id)).allowed;
    const opened = S.apply(s,S.quote(s,rid,{action:'open',actor:actor,cause:'abdication'}));
    const weights = S.constituency(s,rid).map(function (m) { return m.weight; });
    const m = S.constituency(s,rid)[0];
    const supported = S.apply(s,S.quote(s,rid,{action:'support',actor:{kind:'character',id:m.currentPrincipal.id},
      memberId:m.id,candidateId:id,terms:p.terms}));
    const oneInsufficient = !S.quote(s,rid,{action:'resolve',actor:actor}).allowed;
    const second = S.constituency(s,rid)[1];
    young.born = s.date.year - 24;
    const secondSupport = S.apply(s,S.quote(s,rid,{action:'support',actor:{kind:'character',id:second.currentPrincipal.id},
      memberId:second.id,candidateId:id,terms:p.terms}));
    const resolved = S.apply(s,S.quote(s,rid,{action:'resolve',actor:actor}));
    const historic = JSON.stringify(S.state(s,rid).vacancy), property = L.protectedFacts();
    const extra = S.quote(s,rid,L.request(young.id,second.id));
    const laterAdmission = S.apply(s,extra);
    return {refused:refused,underAge:underAge,opened:opened,weights:weights,supported:supported,oneInsufficient:oneInsufficient,
      secondSupport:secondSupport,resolved:resolved,generation:t.rulerGeneration === generation+1,
      laterAdmission:laterAdmission,historical:historic === JSON.stringify(S.state(s,rid).vacancy),property:property === L.protectedFacts()};
  });
  expect(result).toEqual({refused:true,underAge:true,opened:true,weights:[2,1],supported:true,oneInsufficient:true,
    secondSupport:true,resolved:true,generation:true,laterAdmission:true,historical:true,property:true});
  expect(await page.evaluate(function () { return livingTest.roundTrip(); })).toEqual({selection:true,tree:true,person:true,uid:true,rng:true,signature:true});
});

test('the consultation incumbent separately designates but cannot accede without a vacancy and support', async function ({page},info) {
  await start(page,info,'consultation');
  const result = await page.evaluate(function () {
    const L = livingTest, s = FB.state, S = FB.governmentSelection, rid = L.rid, t = s.realms[rid].succession;
    L.admit();
    const old = t.rulerMemberId, actor = {kind:'character',id:t.members[old].charId}, id = L.id();
    const property = L.protectedFacts(), recognized = JSON.stringify(S.state(s,rid).recognition);
    const designated = S.apply(s,S.quote(s,rid,{action:'designate',actor:actor,candidateId:id}));
    const preference = t.designatedHeirId === id;
    const premature = !S.quote(s,rid,{action:'resolve',actor:actor}).allowed;
    const opened = S.apply(s,S.quote(s,rid,{action:'open',actor:actor,cause:'abdication'}));
    const noSupport = !S.quote(s,rid,{action:'resolve',actor:actor}).allowed;
    const m = S.constituency(s,rid)[0];
    const supported = S.apply(s,S.quote(s,rid,{action:'support',actor:{kind:'constituency',realmId:rid,id:m.id},
      memberId:m.id,candidateId:id,terms:S.profile(s,rid).terms}));
    const resolved = S.apply(s,S.quote(s,rid,{action:'resolve',actor:actor}));
    return {designated:designated,preference:preference,premature:premature,opened:opened,noSupport:noSupport,supported:supported,
      resolved:resolved,winner:t.rulerMemberId === id,property:property === L.protectedFacts(),recognition:recognized !== JSON.stringify(S.state(s,rid).recognition)};
  });
  expect(result).toEqual({designated:true,preference:true,premature:true,opened:true,noSupport:true,supported:true,
    resolved:true,winner:true,property:true,recognition:true});
});

test('omitted and false options retain vacancy-only nomination, including dead-incumbent admission', async function ({page},info) {
  await start(page,info,'consultation');
  const result = await page.evaluate(function () {
    const L = livingTest, s = FB.state, S = FB.governmentSelection, rid = L.rid, p = S.profile(s,rid);
    const out = [];
    [undefined,false,true].forEach(function (flag) {
      if (flag === undefined) delete p.procedure.livingNomination; else p.procedure.livingNomination = flag;
      const t = s.realms[rid].succession, ruler = t.members[t.rulerMemberId], c = s.chars[ruler.charId];
      if (flag === true) { ruler.alive = false; c.dead = true; }
      const before = L.snapshot(), q = S.quote(s,rid,L.request());
      out.push({allowed:q.allowed,applied:S.apply(s,q),pure:L.same(before),faults:S.profileFaults(p)});
    });
    const actor = {kind:'realm',id:rid};
    delete p.procedure.livingNomination;
    const opened = S.apply(s,S.quote(s,rid,{action:'open',actor:actor,cause:'death'}));
    const admitted = L.admit();
    return {out:out,opened:opened,admitted:admitted,candidate:S.state(s,rid).vacancy.candidates.indexOf(L.id()) >= 0};
  });
  expect(result).toEqual({out:[0,1,2].map(function () { return {allowed:false,applied:false,pure:true,faults:[]}; }),
    opened:true,admitted:true,candidate:true});
});

for (const option of ['omit',false]) {
  test('ordinary JSON control retains vacancy-only admission with option '+option, async function ({page},info) {
    await start(page,info,'river',option);
    const result=await page.evaluate(function (option) {
      const L=livingTest, s=FB.state, S=FB.governmentSelection, rid=L.rid, p=S.profile(s,rid);
      const exact=option==='omit' ? !Object.prototype.hasOwnProperty.call(p.procedure,'livingNomination') : p.procedure.livingNomination===false;
      const before=L.snapshot(), q=S.quote(s,rid,L.request());
      const refused=!q.allowed && !S.apply(s,q) && L.same(before);
      FB.governments.call(s,rid,'ai','offices',{});
      const noAIAdmission=!Object.values(s.realms[rid].succession.members).some(function (m) { return m.role==='electoral_candidate'; });
      const opened=S.apply(s,S.quote(s,rid,{action:'open',actor:{kind:'realm',id:rid},cause:'abdication'}));
      return {exact:exact,refused:refused,noAIAdmission:noAIAdmission,opened:opened,admitted:L.admit()};
    },option);
    expect(result).toEqual({exact:true,refused:true,noAIAdmission:true,opened:true,admitted:true});
  });
}

test('stale principals, residence, status, age and occupied bindings reject admission without mutation', async function ({page},info) {
  await start(page,info,'river');
  const result = await page.evaluate(function () {
    const L = livingTest, s = FB.state, S = FB.governmentSelection, rid = L.rid, c = s.chars[L.cid];
    const changes = [
      ['age',function () { c.born=s.date.year-20; }],
      ['unfree',function () { c.unfree=true; }],
      ['captivity',function () { c.captive=true; }],
      ['exile',function () { c.exiled=true; }],
      ['binding',function () { c.royalLine={realmId:rid,memberId:'occupied'}; }],
      ['foreign home',function () { c.homeProvinceId='invented'; }],
      ['principal',function () { s.chars[s.localInstitutions.river_households_demo.representativeId].dead=true; }],
      ['scope',function () { s.owner.river_home_demo='invented'; }]
    ];
    const out = changes.map(function (row) {
      const person = JSON.parse(JSON.stringify(c)), owner = s.owner.river_home_demo;
      const principal = s.chars[s.localInstitutions.river_households_demo.representativeId], dead = principal.dead;
      const request = L.request(L.cid,'river_households'), q = S.quote(s,rid,request);
      row[1](); const before = L.snapshot();
      const rejected = q.allowed && !S.apply(s,q) && !S.quote(s,rid,request).allowed && L.same(before);
      Object.keys(c).forEach(function (key) { delete c[key]; }); Object.assign(c,person);
      s.owner.river_home_demo=owner; principal.dead=dead;
      return {case:row[0],rejected:rejected};
    });
    return out;
  });
  expect(result).toEqual(['age','unfree','captivity','exile','binding','foreign home','principal','scope'].map(function (name) {
    return {case:name,rejected:true};
  }));
});

test('later candidate changes and new admissions invalidate designation and support reviews', async function ({page},info) {
  await start(page,info,'consultation');
  const result = await page.evaluate(function () {
    const L = livingTest, s = FB.state, S = FB.governmentSelection, rid = L.rid, actor={kind:'realm',id:rid};
    L.admit(); const c=s.chars[L.cid], id=L.id(), p=S.profile(s,rid);
    const cases = [
      ['age',function () { c.born=s.date.year-17; }], ['sex',function () { c.sex='f'; }],
      ['faith',function () { c.religion='catholic'; }], ['unfree',function () { c.unfree=true; }],
      ['captivity',function () { c.captive=true; }], ['death',function () { c.dead=true; }],
      ['binding',function () { c.royalLine.memberId='occupied'; }]
    ];
    const out=[];
    ['designate','support'].forEach(function (action) {
      if (action==='support') S.apply(s,S.quote(s,rid,{action:'open',actor:actor,cause:'abdication'}));
      cases.forEach(function (row) {
        const person=JSON.parse(JSON.stringify(c)), m=S.constituency(s,rid)[0];
        const request=action==='designate' ? {action:action,actor:actor,candidateId:id} :
          {action:action,actor:{kind:'constituency',realmId:rid,id:m.id},memberId:m.id,candidateId:id,terms:p.terms};
        const q=S.quote(s,rid,request); row[1](); const before=L.snapshot();
        out.push({action:action,case:row[0],rejected:q.allowed && !S.apply(s,q) && !S.quote(s,rid,request).allowed && L.same(before)});
        Object.keys(c).forEach(function (key) { delete c[key]; }); Object.assign(c,person);
      });
      const request=action==='designate' ? {action:action,actor:actor,candidateId:id} :
        {action:action,actor:{kind:'constituency',realmId:rid,id:'community'},memberId:'community',candidateId:id,terms:p.terms};
      const other=FB.makeCharacter(s,{name:'Other resident',dyn:'Other House',sex:'m',born:s.date.year-25,
        culture:'arabic',religion:'consultation_faith_demo',station:2,role:'notable',quality:1,traitsN:0});
      other.homeProvinceId='consultation_home';
      const prior=S.quote(s,rid,request), admitted=S.apply(s,S.quote(s,rid,L.request(other.id))), before=L.snapshot();
      out.push({action:action,case:'new admission',rejected:admitted && prior.allowed && !S.apply(s,prior) && S.quote(s,rid,request).allowed && L.same(before)});
    });
    return out;
  });
  expect(result).toEqual(['designate','support'].flatMap(function (action) {
    return ['age','sex','faith','unfree','captivity','death','binding','new admission'].map(function (name) { return {action:action,case:name,rejected:true}; });
  }));
});

test('invalid boolean and unknown procedure members reject ordinary imports without publication', async function ({page},info) {
  await start(page,info,'river');
  const result = await page.evaluate(function (mod) {
    const out=[];
    [null,0,1,'true',{},[],'unknown'].forEach(function (bad) {
      const input=JSON.parse(JSON.stringify(mod)), p=input.governmentForms.river_consultation_demo.selectionProfile;
      if (bad==='unknown') p.procedure.extraNomination=true; else p.procedure.livingNomination=bad;
      const bytes=JSON.stringify(input), before=livingTest.snapshot(), faults=FB.mods.validate(input);
      let threw=false; try { FB.mods.apply(input); } catch (error) { threw=true; }
      out.push({faults:faults.length>0,threw:threw,pure:livingTest.same(before),input:bytes===JSON.stringify(input)});
    });
    return out;
  },river);
  expect(result).toEqual(Array.from({length:7},function () { return {faults:true,threw:true,pure:true,input:true}; }));
});

test('the existing candidate cap, foreign royal exclusion and optional office qualification also bind living admission', async function ({page},info) {
  await start(page,info,'consultation');
  const result = await page.evaluate(function () {
    const L=livingTest, s=FB.state, S=FB.governmentSelection, rid=L.rid, p=S.profile(s,rid), t=s.realms[rid].succession;
    const relative=Object.keys(t.members).find(function (id) { return /_authored_relative$/.test(id); });
    const kin=t.members[relative].charId, foreign=FB.realmRulerCharacterSnapshot(s,'border_court').id;
    s.chars[foreign].religion='consultation_faith_demo'; s.chars[foreign].homeProvinceId='consultation_home';
    const before=L.snapshot();
    const unavailable=[kin,foreign].every(function (id) { return !S.quote(s,rid,L.request(id)).allowed; });
    const pure=L.same(before);
    p.eligibility.officeId='public_governor';
    const officeBefore=L.snapshot(), officeQuote=S.quote(s,rid,L.request());
    const noOffice=!officeQuote.allowed && !S.apply(s,officeQuote) && L.same(officeBefore);
    delete p.eligibility.officeId;
    // Reserve the whole cap for admitted people without changing the cap itself.
    t.members[relative].alive=false;
    if (kin) s.chars[kin].dead=true;
    let admitted=0;
    for (let i=0;i<65;i++) {
      const c=FB.makeCharacter(s,{name:'Local resident',sex:'m',culture:'arabic',religion:'consultation_faith_demo',
        born:s.date.year-30,station:2,role:'notable',quality:1,traitsN:0});
      c.homeProvinceId='consultation_home';
      const q=S.quote(s,rid,L.request(c.id));
      if (i<64) { if (S.apply(s,q)) admitted++; }
      else {
        const full=L.snapshot();
        return {unavailable:unavailable,pure:pure,noOffice:noOffice,admitted:admitted,
          cap:S.candidates(s,rid).length,reason:q.reasonId,rejected:!S.apply(s,q) && L.same(full),
          validation:S.validate(s,rid,S.state(s,rid))};
      }
    }
  });
  expect(result).toEqual({unavailable:true,pure:true,noOffice:true,admitted:64,cap:64,reason:'nomination_refused',rejected:true,validation:true});
});

test('strict detached restoration rejects forged bindings and exact changed mod content', async function ({page},info) {
  await start(page,info,'river');
  const result = await page.evaluate(function () {
    const L=livingTest, S=FB.governmentSelection, rid=L.rid;
    L.admit(); const id=L.id(), source=JSON.parse(FB.save.serialize());
    const out=[
      function (d) { d.state.chars[L.cid].royalLine.memberId='invented'; },
      function (d) { d.state.realms[rid].succession.members[id].parentId='invented'; },
      function (d) { delete d.state.chars[L.cid]; },
      function (d) { d.state.authority.governments[rid].selection.extra=true; }
    ].map(function (damage) {
      const bad=JSON.parse(JSON.stringify(source)); damage(bad);
      const input=JSON.stringify(bad), before=L.snapshot();
      let migration=false, restore=false;
      try { FB.save.v4.migrate(bad); } catch (error) { migration=/Invalid government selection state/.test(error.message); }
      try { FB.save.restore(bad); } catch (error) { restore=/Invalid government selection state/.test(error.message); }
      return {migration:migration,restore:restore,pure:L.same(before),input:input===JSON.stringify(bad)};
    });
    return {out:out,signature:source.mods===FB.mods.sig(),valid:S.validate(FB.state,rid,S.state(FB.state,rid))};
  });
  expect(result).toEqual({out:Array.from({length:4},function () { return {migration:true,restore:true,pure:true,input:true}; }),signature:true,valid:true});
  const saved=await page.evaluate(function () { return JSON.parse(FB.save.serialize()); });
  const changed=JSON.parse(JSON.stringify(river));
  changed.governmentForms.river_consultation_demo.selectionProfile.procedure.livingNomination=false;
  await page.evaluate(function () { FB.ui.closeModal(); FB.ui.showMods(); });
  await page.locator('#modfile').setInputFiles({name:'river-consultation.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(changed))});
  await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded'}),page.locator('#mod-apply').click()]);
  await prepareGameContent(page);
  expect(await page.evaluate(function (source) {
    const before=JSON.stringify([FB.state,FB.getRngState(),FB.getUidCounter(),localStorage,FB.mods.sig()]);
    const mismatch=FB.save.otherWorld(source), loaded=FB.game.loadData(source);
    return {mismatch:mismatch,loaded:loaded,pure:before===JSON.stringify([FB.state,FB.getRngState(),FB.getUidCounter(),localStorage,FB.mods.sig()])};
  },saved)).toEqual({mismatch:true,loaded:false,pure:true});
});

for (const width of [390,1280]) {
  test('living nomination review preserves navigation and explains separate decisions at width '+width, async function ({page},info) {
    await page.setViewportSize({width:width,height:800});
    await start(page,info,'river');
    const key=await page.evaluate(function () {
      const s=FB.state, L=livingTest;
      s.player.charId=L.cid; s.player.provinceId='river_home_demo';
      FB.ui.showLocalKingship({realmId:L.rid});
      return 'nominate-river_council-'+L.cid;
    });
    await expect(page.locator('#gm-body')).toContainText('A living interest may admit a candidate before a vacancy');
    const button=page.locator('[data-lineage-review="'+key+'"]');
    await expect(button).toBeEnabled();
    await expect(page.locator('#gm-body')).toContainText('No payment. Admission grants candidature only');
    await page.locator('#lineage-terms').selectOption('1');
    const disclosure=page.locator('[aria-controls="lineage-action-'+key+'"]');
    if (width===390) await disclosure.click();
    else await expect(disclosure).toBeHidden();
    await button.scrollIntoViewIfNeeded(); await button.focus();
    await expect(button).toHaveAttribute('aria-describedby','lineage-action-'+key);
    if (width===1280) {
      await expect(page.locator('#tooltip')).toBeVisible();
      await expect(page.locator('#tooltip')).toContainText('Confirmation rechecks every fact');
    }
    const scroll=await page.locator('#gm-body').evaluate(function (el) { return el.scrollTop; });
    expect(scroll).toBeGreaterThan(0);
    for (const escape of [true,false]) {
      await button.click();
      await expect(page.locator('#gm-body .review-person')).toContainText('Marina');
      await expect(page.locator('#gm-body')).toContainText('Nomination grants no crown, vote, land or household wealth');
      if (escape) await page.keyboard.press('Escape'); else await page.locator('[data-modal-nav="back"]').click();
      await expect(button).toBeFocused();
      await expect(page.locator('#lineage-terms')).toHaveValue('1');
      if (width===390) await expect(disclosure).toHaveAttribute('aria-expanded','true');
      else await expect(button).toHaveAttribute('aria-describedby','lineage-action-'+key);
      expect(await page.locator('#gm-body').evaluate(function (el) { return el.scrollTop; })).toBeCloseTo(scroll,0);
    }
    await button.click(); await page.locator('#lineage-confirm').click();
    await expect(page.locator('#gm-body .review-person')).toContainText('Marina');
    await page.locator('#lineage-continue').click();
    await expect(button).toHaveCount(0);
    await expect(page.locator('#lineage-terms')).toHaveValue('1');
    await expect(page.locator('#lineage-candidate')).toBeFocused();
    expect(await page.locator('#gm-body').evaluate(function (el) { return el.scrollTop; })).toBeCloseTo(scroll,0);
    expect(await page.evaluate(function () {
      const L=livingTest, s=FB.state, S=FB.governmentSelection;
      return s.realms[L.rid].succession.members[L.id()].role==='electoral_candidate' && S.state(s,L.rid).vacancy===null;
    })).toBe(true);
    await page.evaluate(function () {
      FB.state.chars[livingTest.cid].dead=true;
      FB.ui.showLocalKingship({realmId:livingTest.rid});
    });
    await expect(page.locator('[data-lineage-review^="nominate-"]')).toHaveCount(0);
  });
}
