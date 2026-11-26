'use strict';
const fs = require('fs');
const path = require('path');
const {test, expect} = require('../support/fixture');
const {dependsOnRuntime} = require('../support/runtime-dependencies');
const {openTitle} = require('../support/game/navigation');
const {installStoredMod} = require('../support/game/stored-mod');
const {beginBookmarkFromTitle} = require('../support/game/bookmark-acceptance');
const {start} = require('../support/game/living-nomination');
dependsOnRuntime(__filename, ['data/political_institutions.js','data/technology.js',
  'js/government_selection.js','js/government_lineage.js','js/government_elective.js',
  'js/governments.js','js/government_ai.js','js/government_continuity.js',
  'js/world.js','js/model.js','js/main.js','js/starts.js','js/institutions.js',
  'js/station.js','js/justice.js','js/authority.js','js/treasury.js',
  'js/mods.js','js/save.js','js/save_v4.js','js/ui_modals.js','js/ui_misc.js']);

/* The shared start admits each fixture against the unmodded catalogue and
   imports it through the Mods file picker; the designation, incumbent and
   ordinary JSON control cases keep it. The admission, AI and option cases
   store the same fixture text and boot it once, then install the livingTest
   harness exactly as the shared start defines it. */
async function storedStart(page, info, kind) {
  await openTitle(page, info);
  await installStoredMod(page, fs.readFileSync(path.resolve(__dirname,'../fixtures/living-nomination/' +
    (kind === 'consultation' ? 'consultation.json' : 'river-consultation.json')),'utf8'));
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
    await storedStart(page,info,kind);
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
    await storedStart(page,info,kind);
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
  await storedStart(page,info,'consultation');
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

