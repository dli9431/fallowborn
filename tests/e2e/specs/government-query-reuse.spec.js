'use strict';
const path = require('path');
const {test,expect} = require('../support/fixture');
const {openGame,prepareGameContent} = require('../support/game/navigation');
const {beginBookmarkFromTitle} = require('../support/game/bookmark-acceptance');
const {openCrazyGame} = require('../support/game/crazygames-title');
const {mockCrazyGames} = require('../support/crazygames');
const {dependsOnRuntime} = require('../support/runtime-dependencies');

dependsOnRuntime(__filename,[
  'js/government_selection.js','js/government_continuity.js','js/government_collective.js',
  'js/government_levy.js','js/government_revenue.js','js/government_council.js','js/government_diplomacy.js',
  'js/government_ai.js','js/government_support.js','js/government_lineage.js','js/government_elective.js',
  'js/government_assembly.js','js/mobile_confederations.js','js/civic_strategies.js','js/ecclesiastical_strategies.js',
  'data/mobile_confederations.js','data/civic_profiles.js','data/ecclesiastical_profiles.js',
  'js/systems.js','js/politics.js','js/religion.js','data/eras.js','data/cultures.js',
  'index.html','data/aristocratic_courts.js','data/bookmark_476.js','data/bookmark_476_wider.js',
  'data/bookmark_1096.js','data/bookmark_1204.js','data/systems.js','data/assembly_polities.js','data/political_institutions.js',
  'js/government_aristocracy.js','js/government_recognition.js','js/government_administration.js',
  'js/governments.js','js/authority.js','js/lordships.js','js/actions.js','js/world.js','js/model.js',
  'js/justice.js','js/fiscal.js','js/treasury.js','js/save.js','js/save_v4.js','js/mods.js',
  'js/main.js','js/starts.js','js/bookmark_setup.js','js/crazygames.js','data/distribution_crazygames.js'
]);

async function inject(page) {
  for (const file of ['reference.js','probe.js'])
    await page.addScriptTag({path:path.resolve(__dirname,'../fixtures/government-query-reuse/'+file)});
}
async function start(page,info,crazygames,bookmark) {
  if (crazygames) {
    await mockCrazyGames(page);
    await page.addInitScript(function () { window.FB_DISTRIBUTION='crazygames'; window.FB_CRAZYGAMES_STORAGE='localstorage'; });
    await openCrazyGame(page,info);
  } else await openGame(page,info);
  await beginBookmarkFromTitle(page,bookmark || '476');
  await inject(page);
}

for (const crazygames of [false,true]) {
  test('ordered constituency reference parity observes same-turn ledger and eligibility mutations, distribution '+crazygames, async function ({page},info) {
    await start(page,info,crazygames);
    const result=await page.evaluate(function () {
      const H=GOV_QUERY,s=FB.state,A=FB.aristocracy,rid='sasanian_476';
      const baseline=H.copy(s), profiles=H.copy(FBDATA.aristocraticProfiles), definitions=JSON.stringify(FBDATA);
      const cases=[];
      function check(label,edit,active) {
        Object.assign(s,H.copy(baseline));
        FBDATA.aristocraticProfiles=H.copy(profiles);
        FB.governments.invalidate(); FB.rebuildRulerIndex(s);
        const data=A.state(s,rid),m=data.interests[0];
        const office=s.authority.appointments.find(function (r) { return r.id===m.appointmentId; });
        const right=s.authority.rights.find(function (r) { return r.id===m.rightIds[0]; });
        edit(s,data,m,office,right,s.chars[office.holder.id]);
        const output=H.pair(s,rid,H.voices);
        if (output.error) throw new Error(label+': '+output.error.message);
        if (active!==undefined && output.value[0].active!==active) throw new Error(label+': wrong eligibility');
        cases.push(label);
      }
      check('opening',function () {},true);
      check('rights and appointments replaced and reversed',function (s) {
        s.authority.rights=H.copy(s.authority.rights).reverse();
        s.authority.appointments=H.copy(s.authority.appointments).reverse();
      },true);
      check('interest array reordered',function (s,d) { d.interests.reverse(); });
      check('duplicate requested id',function (s,d,m) { m.rightIds.push(m.rightIds[0]); },true);
      check('one matching row',function (s,d,m) { m.rightIds=[m.rightIds[0]]; },false);
      check('two rows with the same record id',function (s,d,m,a,r) {
        m.rightIds=[r.id,r.id]; s.authority.rights.push(H.copy(r));
      },true);
      check('three matching rows',function (s,d,m,a,r) { s.authority.rights.push(H.copy(r)); },false);
      check('missing requested id',function (s,d,m) { m.rightIds[0]='absent'; },false);
      check('missing appointment',function (s,d,m) { m.appointmentId='absent'; },false);
      check('duplicate appointment keeps first',function (s,d,m,a) {
        const duplicate=H.copy(a); duplicate.status='removed'; s.authority.appointments.unshift(duplicate);
      },false);
      check('later duplicate appointment cannot replace first',function (s,d,m,a) {
        const duplicate=H.copy(a); duplicate.holder.id='absent'; s.authority.appointments.push(duplicate);
      },true);
      check('strength 49',function (s,d,m,a,r) { r.strength=49; },false);
      check('strength 50',function (s,d,m,a,r) { r.strength=50; },true);
      check('revoked right',function (s,d,m,a,r) { r.status='revoked'; },false);
      check('lapsed right',function (s,d,m,a,r) { r.status='lapsed'; },false);
      check('right beneficiary changed',function (s,d,m,a,r) { r.beneficiary={kind:'realm',id:rid}; },false);
      check('expired appointment',function (s,d,m,a) { a.endTurn=s.turn; },false);
      check('appointment ends next turn',function (s,d,m,a) { a.endTurn=s.turn+1; },true);
      check('inactive appointment',function (s,d,m,a) { a.status='removed'; },false);
      check('missing holder character',function (s,d,m,a) { delete s.chars[a.holder.id]; },false);
      for (const field of ['dead','captive','imprisoned','exiled','unfree'])
        check(field,function (s,d,m,a,r,c) { c[field]=true; },false);
      check('judicial custody',function (s,d,m,a,r,c) {
        s.intrigue.captives.push({captiveId:c.id,captorId:s.player.charId,source:'judicial',endTurn:s.turn+1});
      },false);
      check('expired custody',function (s,d,m,a,r,c) {
        s.intrigue.captives.push({captiveId:c.id,captorId:s.player.charId,source:'judicial',endTurn:s.turn});
      },true);
      check('dynasty changed',function (s,d,m,a,r,c) { c.dyn='Other'; },false);
      check('age below threshold',function (s,d,m,a,r,c) { c.born=s.date.year-A.profile(s,rid).minimumAge+1; },false);
      check('age at threshold',function (s,d,m,a,r,c) { c.born=s.date.year-A.profile(s,rid).minimumAge; },true);
      check('date changes eligibility',function (s,d,m,a,r,c) {
        c.born=s.date.year-A.profile(s,rid).minimumAge+1; s.date.year++;
      },true);
      check('holder overrides owner',function (s,d,m) { s.holder[m.scope.id]='byzantium'; },false);
      check('missing holder falls back to owner',function (s,d,m) { delete s.holder[m.scope.id]; s.owner[m.scope.id]=rid; },true);
      check('empty holder falls back to owner',function (s,d,m) { s.holder[m.scope.id]=''; s.owner[m.scope.id]=rid; },true);
      check('fallback owner changed',function (s,d,m) { delete s.holder[m.scope.id]; s.owner[m.scope.id]='byzantium'; },false);
      check('profile age replaced',function (s,d,m,a,r,c) {
        FBDATA.aristocraticProfiles[d.profileId].minimumAge=s.date.year-c.born+1;
      },false);
      check('profile weight changed',function (s,d,m) { FBDATA.aristocraticProfiles[d.profileId].interests[0].weight=7; });
      check('government form replaced',function (s) { s.authority.governments[rid].formId='regnum'; });
      check('live provincial terms changed',function (s,d,m,a) { a.publicTerms.share=0.3; a.provincialTerms.levy=0.6; a.provincialTerms.status='withheld'; },true);
      check('empty rights',function (s) { s.authority.rights=[]; },false);
      check('empty appointments',function (s) { s.authority.appointments=[]; },false);
      check('empty interests',function (s,d) { d.interests=[]; });
      check('no profile',function (s,d) { delete FBDATA.aristocraticProfiles[d.profileId]; });
      Object.assign(s,H.copy(baseline)); FBDATA.aristocraticProfiles=profiles; FB.governments.invalidate();
      const detached=A.constituency(s,rid),original=JSON.stringify(detached);
      detached[0].rightIds.reverse(); detached[0].scope.id='changed'; detached[0].principal.id='changed'; detached[0].terms.levy=0;
      const isolated=JSON.stringify(A.constituency(s,rid))===original;
      const sparse=A.state(s,rid).interests; delete sparse[1]; H.pair(s,rid,H.voices);
      Object.assign(s,H.copy(baseline));
      return {cases:cases.length,isolated:isolated,definitions:definitions===JSON.stringify(FBDATA),distribution:FB.platform.isCrazyGames};
    });
    expect(result.cases).toBeGreaterThanOrEqual(40);
    expect(result).toMatchObject({isolated:true,definitions:true,distribution:crazygames});
  });
}

test('strict ids, unusual membership, missing fields and malformed failures retain the original route', async function ({page},info) {
  await start(page,info);
  const result=await page.evaluate(function () {
    const H=GOV_QUERY,s=FB.state,A=FB.aristocracy,rid='sasanian_476',baseline=H.copy(s),results=[];
    function check(label,edit) {
      Object.assign(s,H.copy(baseline)); FB.governments.invalidate();
      const m=A.state(s,rid).interests[0],a=s.authority.appointments.find(function (r) { return r.id===m.appointmentId; });
      const r=s.authority.rights.find(function (r) { return r.id===m.rightIds[0]; });
      edit(m,a,r);
      const output=H.pair(s,rid,H.voices); results.push({label:label,error:output.error || null});
      return output;
    }
    for (const id of [undefined,null,0,NaN,false]) check('id '+String(id),function (m,a,r) {
      m.appointmentId=id; a.id=id; m.rightIds=[id]; r.id=id;
    });
    check('string versus numeric',function (m,a,r) { m.appointmentId='0'; a.id=0; m.rightIds=['0']; r.id=0; });
    check('reserved dictionary keys',function (m,a,r) { m.appointmentId='__proto__'; a.id='__proto__'; m.rightIds=['constructor','constructor']; r.id='constructor'; });
    check('missing id properties',function (m,a,r) { delete m.appointmentId; delete a.id; delete r.id; m.rightIds=[undefined]; });
    check('string membership',function (m) { m.rightIds=m.rightIds.join(','); });
    check('custom membership',function (m) { m.rightIds.indexOf=function () { return 0; }; });
    check('missing rightIds with empty ledger',function (m) { delete m.rightIds; s.authority.rights=[]; });
    const malformed=[
      function (m) { delete m.rightIds; },
      function (m) { m.rightIds={}; },
      function (m) { m.rightIds=null; },
      function (m,a) { a.holder=null; },
      function () { s.authority.appointments.push(null); },
      function () { s.authority.rights.push(null); },
      function () { A.state(s,rid).interests[1]=null; },
      function () { A.state(s,rid).interests={}; },
      function () { s.authority.appointments={}; },
      function () { s.authority.rights={}; }
    ];
    const errors=malformed.map(function (edit,i) { return !!check('malformed '+i,edit).error; });
    Object.assign(s,H.copy(baseline));
    const rejected=[
      function (s,d) { d.interests[0].rightIds.push(d.interests[0].rightIds[0]); },
      function (s,d) { s.authority.rights.push(H.copy(s.authority.rights[0])); },
      function (s,d) { s.authority.appointments.push(H.copy(s.authority.appointments[0])); },
      function (s,d) { delete d.interests[0].appointmentId; }
    ].map(function (edit) {
      const copy=H.copy(s); edit(copy,A.state(copy,rid));
      return !!H.result(function () { return FB.save.v4.validateAuthority(copy.authority,copy); }).error;
    });
    return {errors:errors,rejected:rejected,cases:results.length};
  });
  expect(result.errors).toEqual(Array(10).fill(true));
  expect(result.rejected).toEqual(Array(4).fill(true));
  expect(result.cases).toBe(21);
});

test('fiscal projections, tax, levy, assent and recognition match across staged boundaries and live refusals', async function ({page},info) {
  await start(page,info);
  const result=await page.evaluate(function () {
    const H=GOV_QUERY,s=FB.state,A=FB.aristocracy,rid='sasanian_476',baseline=H.copy(s),labels=[],probes=[];
    function check(label,edit) {
      Object.assign(s,H.copy(baseline)); FB.governments.invalidate(); FB.rebuildRulerIndex(s);
      const d=A.state(s,rid),m=d.interests[0],a=s.authority.appointments.find(function (r) { return r.id===m.appointmentId; });
      edit(s,d,m,a);
      const output=H.pair(s,rid,H.consumers);
      if (output.error) throw new Error(label+': '+output.error.message);
      if (labels.length<3) probes.push({phase:label,turn:s.turn,date:H.copy(s.date),sites:output.value.fiscalCalls});
      labels.push(label); return output.value;
    }
    const ordinary=check('ordinary',function () {});
    check('season end',function (s) { s.turn=89; s.date.season=0; s.date.day=89; });
    check('annual boundary',function (s) { s.turn=359; s.date.season=3; s.date.day=89; });
    const refused=check('withheld assent',function (s,d,m,a) { a.provincialTerms.status='withheld'; });
    check('expired appointment',function (s,d,m,a) { a.endTurn=s.turn; });
    check('weak right',function (s,d,m) { s.authority.rights.find(function (r) { return r.id===m.rightIds[0]; }).strength=49; });
    check('public vacancy',function (s) {
      s.authority.governments[rid].publicVacancy={cause:'abdication',openedTurn:s.turn,generation:FB.realmRulerGeneration(s,rid)};
    });
    check('minor with steward',function (s,d,m,a) {
      const ruler=s.realms[rid].succession.members[s.realms[rid].succession.rulerMemberId];
      ruler.born=s.date.year-10; if (ruler.charId) s.chars[ruler.charId].born=ruler.born;
      d.regency={generation:FB.realmRulerGeneration(s,rid),stewardId:a.holder.id,sinceTurn:s.turn};
    });
    check('minor with captive steward',function (s,d,m,a) {
      const ruler=s.realms[rid].succession.members[s.realms[rid].succession.rulerMemberId];
      ruler.born=s.date.year-10; if (ruler.charId) s.chars[ruler.charId].born=ruler.born;
      d.regency={generation:FB.realmRulerGeneration(s,rid),stewardId:a.holder.id,sinceTurn:s.turn};
      s.chars[a.holder.id].captive=true;
    });
    check('explicit recognition refusal',function (s,d,m,a) {
      const R=FB.governmentRecognition,review=R.supportQuote(s,a.holder,rid,m.id,null);
      if (!R.applySupport(s,review)) throw new Error('Could not stage the principal\'s refusal');
    });
    Object.assign(s,H.copy(baseline));
    return {cases:labels.length,tax:ordinary.fiscal[0].amounts.tax,levy:ordinary.fiscal[0].amounts.levy,
      refusedTax:refused.fiscal[0].amounts.tax,refusedLevy:refused.fiscal[0].amounts.levy,
      denied:refused.assent[0].allowed===false,probes:probes};
  });
  expect(result.cases).toBe(10);
  expect(result.tax).toBeGreaterThan(0); expect(result.levy).toBeGreaterThan(0);
  expect(result.refusedTax).toBeCloseTo(result.tax*0.5,10);
  expect(result.refusedLevy).toBeCloseTo(result.levy*0.5,10);
  expect(result.denied).toBe(true);
  for (const probe of result.probes) for (const site of probe.sites) expect(site.calls.length).toBeGreaterThanOrEqual(2);
  await info.attach('constituency-fiscal-call-counts',{body:Buffer.from(JSON.stringify(result.probes,null,2)),contentType:'application/json'});
});

test('actual ledger visits include index construction, row selection and ordering for small and larger valid ledgers', async function ({page},info) {
  await start(page,info);
  const rows=await page.evaluate(function () {
    const H=GOV_QUERY,base=H.copy(FB.state),rid='sasanian_476',out=[];
    for (const input of [{count:0,kind:'rights'},{count:64,kind:'rights'},{count:256,kind:'rights'},
      {count:64,kind:'appointments'},{count:256,kind:'appointments'}]) {
      const s=H.copy(base); H.history(s,rid,input.count,input.kind);
      const d=FB.aristocracy.state(s,rid),I=d.interests.length,R=s.authority.rights.length,P=s.authority.appointments.length;
      FB.aristocracy.constituency(s,rid);
      const reference=H.measure(s,rid,GOV_QUERY_REFERENCE),candidate=H.measure(s,rid,FB.aristocracy.constituency);
      if (JSON.stringify(reference.value)!==JSON.stringify(candidate.value)) throw new Error('Counted result differs');
      out.push({history:input,interests:I,rights:R,appointments:P,requested:d.interests.reduce(function (n,m) { return n+m.rightIds.length; },0),
        reference:reference.counts,candidate:candidate.counts,outputOrder:candidate.value.map(function (m) { return m.id; })});
    }
    for (const n of [0,1]) {
      const s=H.copy(base); FB.aristocracy.state(s,rid).interests.length=n;
      // The public government lookup is independent of constituency indexing.
      FB.aristocracy.profile(s,rid);
      const reference=H.measure(s,rid,GOV_QUERY_REFERENCE),candidate=H.measure(s,rid,FB.aristocracy.constituency);
      out.push({interests:n,rights:s.authority.rights.length,appointments:s.authority.appointments.length,
        reference:reference.counts,candidate:candidate.counts,outputOrder:candidate.value.map(function (m) { return m.id; })});
    }
    return out;
  });
  for (const row of rows) {
    expect(row.reference.rightsInspected).toBe(row.interests*row.rights);
    expect(row.reference.appointmentsInspected).toBe(row.interests*row.appointments);
    expect(row.outputOrder).toHaveLength(row.interests);
    if (row.interests<2) expect(row.candidate).toEqual(row.reference);
    else {
      expect(row.candidate.rightsInspected).toBe(row.rights);
      expect(row.candidate.appointmentsInspected).toBe(row.appointments);
      expect(row.candidate.rightsFilters).toBe(0); expect(row.candidate.assignmentSearches).toBe(0);
      expect(row.candidate.appointmentEntries).toBe(row.appointments);
      expect(row.candidate.membershipBuckets).toBe(row.requested);
      expect(row.candidate.requestedMemberships).toBe(row.requested);
      expect(row.candidate.selectedRows).toBe(2*row.interests);
      expect(row.candidate.dictionaries).toBe(2);
      expect(row.candidate.sortComparisons).toBe(0);
      expect(row.candidate.orders).toHaveLength(row.interests);
      for (const order of row.candidate.orders) expect(order[0]).toBeLessThan(order[1]);
    }
  }
  await info.attach('constituency-operation-counts',{body:Buffer.from(JSON.stringify(rows,null,2)),contentType:'application/json'});
  console.log('Constituency operation counts: '+JSON.stringify(rows));
});

test('rights eligibility checks keep ledger order even when requests are reversed or duplicated', async function ({page},info) {
  await start(page,info);
  const result=await page.evaluate(function () {
    const H=GOV_QUERY,s=FB.state,rid='sasanian_476',m=FB.aristocracy.state(s,rid).interests[0],log=[];
    m.rightIds.reverse(); m.rightIds.push(m.rightIds[0]);
    const expected=[];
    s.authority.rights.forEach(function (r,i) {
      if (m.rightIds.indexOf(r.id)<0) return;
      expected.push(i); const status=r.status;
      Object.defineProperty(r,'status',{configurable:true,enumerable:true,get:function () { log.push(i); return status; }});
    });
    log.length=0; FB.aristocracy.constituency(s,rid); const candidate=log.slice();
    log.length=0; GOV_QUERY_REFERENCE(s,rid); const reference=log.slice();
    return {candidate:candidate,reference:reference,expected:expected};
  });
  expect(result.candidate).toEqual(result.expected); expect(result.candidate).toEqual(result.reference);
});

for (const bookmark of ['1096','1204']) {
  test(bookmark+' without aristocratic data keeps empty reads and matching restore', async function ({page},info) {
    await start(page,info,false,bookmark);
    const result=await page.evaluate(function () {
      const H=GOV_QUERY,s=FB.state;
      const before=H.pair(s,'player',H.voices);
      const envelope=JSON.parse(FB.save.serialize()); FB.save.restore(envelope);
      const after=H.pair(FB.state,'player',H.voices);
      return {before:before.value,after:after.value,rng:(envelope.rng>>>0)===(FB.getRngState()>>>0),uid:envelope.uid===FB.getUidCounter()};
    });
    expect(result).toEqual({before:[],after:[],rng:true,uid:true});
  });
}

async function importedProfile(page) {
  return page.evaluate(function () {
    const realm=FB.bookmark('476').realms.find(function (r) { return r.id==='sasanian_476'; });
    return FBDATA.aristocraticProfiles[realm.aristocraticProfileId || 'sasanian_476'];
  });
}
function profileMod(profile,weight) {
  const changed=JSON.parse(JSON.stringify(profile)); changed.interests[0].weight=weight;
  return {name:'Constituency query profile',aristocraticProfiles:{query_court:changed}};
}
async function importProfile(page,mod) {
  expect(await page.evaluate(function (mod) { return FB.mods.validate(mod); },mod)).toEqual([]);
  await page.evaluate(function () { FB.ui.showMods(); });
  await page.locator('#modfile').setInputFiles({name:'query-court.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(mod))});
  await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded'}),page.locator('#mod-apply').click()]);
  await prepareGameContent(page);
}
async function importedFacts(page) {
  await beginBookmarkFromTitle(page,'476'); await inject(page);
  return page.evaluate(function () {
    const H=GOV_QUERY,s=FB.state,rid='sasanian_476',d=FB.aristocracy.state(s,rid);
    const original=H.pair(s,rid,H.voices).value;
    d.profileId='query_court';
    const changed=H.pair(s,rid,H.voices).value;
    const envelope=JSON.parse(FB.save.serialize()); FB.save.restore(envelope);
    const restored=H.pair(FB.state,rid,H.voices).value;
    return {weight:changed[0].weight,original:original[0].weight,restored:JSON.stringify(changed)===JSON.stringify(restored),
      signature:FB.mods.sig(),matching:!FB.save.otherWorld(envelope),count:FB.mods.count()};
  });
}

test('ordinary JSON profile import exposes detached current results and matching restore', async function ({page},info) {
  await openGame(page,info);
  const profile=await importedProfile(page);
  await importProfile(page,profileMod(profile,4));
  const result=await importedFacts(page);
  expect(result).toMatchObject({weight:4,original:profile.interests[0].weight,restored:true,matching:true,count:1});
});

test('ordinary JSON profile replacement keeps one stored mod and exposes its independent configuration', async function ({page},info) {
  await openGame(page,info);
  const profile=await importedProfile(page);
  await importProfile(page,profileMod(profile,4));
  const first=await page.evaluate(function () {
    return {signature:FB.mods.sig(),weight:FBDATA.aristocraticProfiles.query_court.interests[0].weight,count:FB.mods.count()};
  });
  expect(first).toMatchObject({weight:4,count:1});
  await importProfile(page,profileMod(profile,8));
  const result=await importedFacts(page);
  expect(result).toMatchObject({weight:8,original:profile.interests[0].weight,restored:true,matching:true,count:1});
  expect(result.signature).not.toBe(first.signature);
});

test('ordinary JSON profile removal discards warmed constituency reads and restores the unmodded catalogue', async function ({page},info) {
  await openGame(page,info);
  const profile=await importedProfile(page);
  await importProfile(page,profileMod(profile,4));
  expect(await importedFacts(page)).toMatchObject({weight:4,restored:true,matching:true,count:1});
  await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded'}),page.evaluate(function () { FB.mods.removeAt(0); })]);
  await prepareGameContent(page); await beginBookmarkFromTitle(page,'476'); await inject(page);
  const removed=await page.evaluate(function () {
    const voices=GOV_QUERY.pair(FB.state,'sasanian_476',GOV_QUERY.voices).value;
    return {absent:!FBDATA.aristocraticProfiles.query_court,count:FB.mods.count(),signature:FB.mods.sig(),
      voices:voices.length,weight:voices[0].weight};
  });
  expect(removed).toMatchObject({absent:true,count:0,signature:'',weight:profile.interests[0].weight});
  expect(removed.voices).toBeGreaterThan(1);
});

async function injectScalar(page) {
  for (const file of ['scalar-reference.js','scalar-probe.js'])
    await page.addScriptTag({path:path.resolve(__dirname,'../fixtures/government-query-reuse/'+file)});
  await injectResolver(page);
}

function scalarMod(enabled) {
  return {name:'Scalar government rules',governmentForms:{scalar_court:{
    holders:enabled ? 'direct' : 'feudal_vassals',succession:'dynastic',territory:'fixed',consent:'territorial',
    legalTradition:{default:'faith'},systems:{royal_council:enabled}
  }}};
}
async function openStoredScalarMod(page,info,enabled) {
  // Stage the first stored configuration once; replacement and removal still
  // use their normal public paths. Both configurations have separate file imports.
  await page.addInitScript(function (mod) {
    if (location.protocol==='about:' || sessionStorage.getItem('scalar_query_seeded')) return;
    localStorage.setItem('fb_mods',JSON.stringify([JSON.stringify(mod)]));
    sessionStorage.setItem('scalar_query_seeded','1');
  },scalarMod(enabled));
  await openGame(page,info);
  expect(await page.evaluate(function () { return FB.mods.count(); })).toBe(1);
}
async function scalarOpening(page,thorough) {
  await beginBookmarkFromTitle(page,'476'); await injectScalar(page);
  return page.evaluate(function (thorough) {
    const H=GOV_SCALAR,Q=FB.political,s=FB.state;
    const rid=Object.keys(s.realms).find(function (id) {
      return id!=='player' && s.realms[id].alive && Q.governmentFormId(s,{kind:'realm',id:id})==='regnum';
    });
    if (!rid) throw new Error('No ordinary court for the imported form');
    const ref={kind:'realm',id:rid};
    const context={realm:rid,faith:null,bookmark:{}};
    if (thorough) H.compare(s,[ref],[context],FB.systems.ids());
    if (!FB.authoritySetGovernment(s,rid,'scalar_court')) throw new Error('Could not select imported form');
    H.compare(s,[ref],[context],thorough ? FB.systems.ids() : ['royal_council']);
    GOV_RESOLVER.pure(s,function () { GOV_RESOLVER.compare(s,rid); });
    return {rid:rid,enabled:FB.systemEnabled(s,'royal_council',context),form:Q.governmentFormId(s,ref),
      count:FB.mods.count(),signature:FB.mods.sig()};
  },thorough);
}
async function scalarModFacts(page) {
  const opening=await scalarOpening(page,true);
  return page.evaluate(function (rid) {
    const H=GOV_SCALAR,Q=FB.political,s=FB.state,ref={kind:'realm',id:rid};
    const context={realm:rid,faith:null,bookmark:{}};
    const envelope=JSON.parse(FB.save.serialize()),before=JSON.stringify(s),data=JSON.stringify(FBDATA);
    const storage=JSON.stringify(localStorage),signature=FB.mods.sig(),rng=FB.getRngState(),uid=FB.getUidCounter();
    const rejected=[function (form) { form.holders='absent'; },function (form) {
      form.systems={enable:['royal_council'],disable:['royal_council']};
    }].map(function (edit) {
      const form=H.copy(FBDATA.governmentForms.scalar_court); edit(form);
      const mod={name:'Invalid scalar rules',governmentForms:{scalar_court:form}};
      return FB.mods.validate(mod).length>0 && FB.mods.store(JSON.stringify(mod))===false;
    });
    H.compare(s,[ref],[context],FB.systems.ids());
    const pure=before===JSON.stringify(s) && data===JSON.stringify(FBDATA) && storage===JSON.stringify(localStorage) &&
      signature===FB.mods.sig() && rng===FB.getRngState() && uid===FB.getUidCounter();
    const enabled=FB.systemEnabled(s,'royal_council',context);
    FB.save.restore(envelope);
    H.compare(FB.state,[ref],[context],FB.systems.ids());
    GOV_RESOLVER.pure(FB.state,function () { GOV_RESOLVER.compare(FB.state,rid); });
    return {enabled:enabled,restored:FB.systemEnabled(FB.state,'royal_council',context)===enabled,
      form:Q.governmentFormId(FB.state,ref),matching:!FB.save.otherWorld(envelope),count:FB.mods.count(),
      signature:signature,rejected:rejected,pure:pure};
  },opening.rid);
}

test('ordinary JSON government import preserves scalar parity, detached restore and pure rejection', async function ({page},info) {
  await openGame(page,info); await importProfile(page,scalarMod(true));
  expect(await scalarModFacts(page)).toMatchObject({enabled:true,restored:true,form:'scalar_court',
    matching:true,count:1,rejected:[true,true],pure:true});
});

test('independent ordinary JSON government import preserves disabled rules, restore and pure rejection', async function ({page},info) {
  await openGame(page,info); await importProfile(page,scalarMod(false));
  expect(await scalarModFacts(page)).toMatchObject({enabled:false,restored:true,form:'scalar_court',
    matching:true,count:1,rejected:[true,true],pure:true});
});

test('ordinary JSON government replacement exposes the independent configuration without stale results', async function ({page},info) {
  await openStoredScalarMod(page,info,true);
  const first=await page.evaluate(function () {
    return {signature:FB.mods.sig(),enabled:FBDATA.governmentForms.scalar_court.systems.royal_council};
  });
  expect(first.enabled).toBe(true);
  await importProfile(page,scalarMod(false));
  const result=await scalarOpening(page,false);
  expect(result).toMatchObject({enabled:false,form:'scalar_court',count:1});
  expect(result.signature).not.toBe(first.signature);
});

test('ordinary JSON government removal discards warmed scalar answers and restores authored forms', async function ({page},info) {
  await openStoredScalarMod(page,info,false);
  expect(await scalarOpening(page,false)).toMatchObject({enabled:false,form:'scalar_court',count:1});
  await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded'}),page.evaluate(function () { FB.mods.removeAt(0); })]);
  await prepareGameContent(page); await beginBookmarkFromTitle(page,'476'); await injectScalar(page);
  const result=await page.evaluate(function () {
    const s=FB.state,ref={kind:'realm',id:'sasanian_476'};
    GOV_SCALAR.compare(s,[ref],[undefined,{realm:ref.id,faith:null,bookmark:{}}],FB.systems.ids());
    GOV_RESOLVER.pure(s,function () { GOV_RESOLVER.compare(s,ref.id); });
    return {absent:!FBDATA.governmentForms.scalar_court,count:FB.mods.count(),signature:FB.mods.sig(),
      form:FB.political.governmentFormId(s,ref)};
  });
  expect(result).toEqual({absent:true,count:0,signature:'',form:'aristocratic_monarchy'});
});

for (const family of ['rows','forms','defaults','actors','contexts']) {
  for (const crazygames of [false,true]) {
    test('scalar government '+family+' match detached queries through same-turn changes, distribution '+crazygames, async function ({page},info) {
      await start(page,info,crazygames); await injectScalar(page);
      const result=await page.evaluate(function (family) {
        const H=GOV_SCALAR,Q=FB.political,s=FB.state,rid='sasanian_476',ref={kind:'realm',id:rid};
        const baseline=H.copy(s),forms=H.copy(FBDATA.governmentForms),eras=H.copy(FBDATA.eras),labels=[];
        const contexts=[undefined,{realm:rid,faith:null,bookmark:{}},{realm:ref,bookmark:{}},
          {character:s.player.charId,bookmark:{}},{faith:'catholic',bookmark:{}},
          {realm:'absent',faith:null,bookmark:{}},{realm:null,faith:null,bookmark:{}},
          {character:'absent',bookmark:{}}];
        const ids=['royal_council','papacy','abbeys','great_holy_wars','feudal_service'];
        let currentFamily='rows';
        function reset() {
          Object.assign(s,H.copy(baseline)); FBDATA.governmentForms=H.copy(forms); FBDATA.eras=H.copy(eras);
        }
        function check(label,edit,expected) {
          if (family!==currentFamily) return;
          reset();
          Q.governmentFormId(s,ref); FB.systemEnabled(s,'royal_council',contexts[1]);
          edit();
          H.compare(s,[ref],contexts,ids);
          const actual=Q.governmentFormId(s,ref);
          if (actual!==expected) throw new Error(label+': expected '+expected+', got '+actual);
          labels.push(label);
        }
        const original=baseline.authority.governments[rid].formId,def=baseline.start.defaultGovernment;
        check('explicit row',function () {},original);
        check('same-turn form edit',function () { s.authority.governments[rid].formId='territorial'; },'territorial');
        check('row replacement',function () { s.authority.governments[rid]={formId:'regnum'}; },'regnum');
        check('missing own row',function () { delete s.authority.governments[rid]; },def);
        check('inherited row is ignored',function () {
          s.authority.governments=Object.create({sasanian_476:{formId:'territorial'}});
        },def);
        for (const value of [null,false,0,'',[],{},'malformed'])
          check('malformed row '+JSON.stringify(value),function () { s.authority.governments[rid]=value; },def);
        currentFamily='forms';
        for (const value of [undefined,null,false,0,''])
          check('falsy saved form '+String(value),function () { s.authority.governments[rid]={formId:value}; },def);
        check('unknown saved form',function () { s.authority.governments[rid].formId='absent'; },null);
        check('definition removed',function () { delete FBDATA.governmentForms[original]; },null);
        check('falsy definition',function () { FBDATA.governmentForms[original]=null; },null);
        check('recognized definition with invalid strategy',function () {
          FBDATA.governmentForms.scalar_invalid_strategy=H.copy(forms.territorial);
          FBDATA.governmentForms.scalar_invalid_strategy.holders='absent';
          s.authority.governments[rid].formId='scalar_invalid_strategy';
          if (FB.governments.forRealm(s,rid)!==null) throw new Error('Invalid strategy was accepted by dispatch');
        },'scalar_invalid_strategy');
        check('malformed recognized definition',function () { FBDATA.governmentForms[original]=true; },original);
        check('government table replacement',function () { s.authority.governments={[rid]:{formId:'regnum'}}; },'regnum');
        currentFamily='defaults';
        for (const value of [null,[],false,'malformed'])
          check('malformed authority '+JSON.stringify(value),function () { s.authority=value; },def);
        check('missing authority',function () { delete s.authority; },def);
        check('changed default',function () { delete s.authority.governments[rid]; s.start.defaultGovernment='territorial'; },'territorial');
        check('unstamped default',function () { delete s.authority.governments[rid]; delete s.start.defaultGovernment; },'territorial');
        check('missing start',function () { delete s.authority.governments[rid]; delete s.start; },'territorial');
        check('unknown default',function () { delete s.authority.governments[rid]; s.start.defaultGovernment='absent'; },null);
        currentFamily='actors';
        check('dead realm',function () { s.realms[rid].alive=false; },null);
        check('missing realm',function () { delete s.realms[rid]; },null);
        check('missing player',function () { delete s.player; },null);
        check('ruler generation replaced',function () { s.realms[rid].ruler.generation=FB.realmRulerGeneration(s,rid)+1; },original);
        reset();
        const sequence=[];
        if (family==='actors') {
          const invalidRefs=[null,{},ref.id,{kind:'character',id:s.player.charId},{kind:'realm',id:'absent'},
            {kind:'realm',id:null},{kind:'realm',id:0},{kind:'realm',id:''}];
          H.compare(s,invalidRefs,contexts,FB.systems.ids());
          H.compare(null,[ref],contexts,ids);
          labels.push('invalid typed references','absent state');
        }
        if (family==='contexts') {
          // Consecutive reads keep both state and catalogue identity across edits.
          for (const formId of ['regnum','territorial',original]) {
            s.authority.governments[rid].formId=formId;
            H.compare(s,[ref],contexts,ids); sequence.push(Q.governmentFormId(s,ref));
            labels.push('current form '+formId);
          }
          const c=H.copy(s.chars[s.player.charId]);
          c.id='scalar_resident'; c.role='contact'; delete c.royalLine;
          c.homeProvinceId=s.player.provinceId; s.chars[c.id]=c;
          const resident=[{character:c.id,bookmark:{}},{character:c,bookmark:{}}];
          for (const holder of [rid,'byzantium',null]) {
            s.holder[c.homeProvinceId]=holder; H.compare(s,[ref],resident,ids);
            labels.push('residence holder '+holder);
          }
          c.homeProvinceId=s.realms[rid].capital; H.compare(s,[ref],resident,ids);
          labels.push('changed residence');
          c.dead=true; H.compare(s,[ref],resident,ids);
          labels.push('dead character context');
          s.realms.player=Object.assign(H.copy(s.realms[rid]),{id:'player',alive:false});
          s.player.liege=rid; s.realms.player.alive=false; H.compare(s,[ref],contexts,ids);
          labels.push('player liege context');
          s.realms.player.alive=true; s.authority.governments.player={formId:'territorial'};
          H.compare(s,[{kind:'realm',id:'player'}],contexts,ids);
          labels.push('player realm context');
        }
        reset();
        return {cases:labels.length,sequence:sequence,original:original,distribution:FB.platform.isCrazyGames};
      },family);
      expect(result.cases).toBe({rows:12,forms:11,defaults:9,actors:6,contexts:10}[family]);
      if (family==='contexts') expect(result.sequence).toEqual(['regnum','territorial',result.original]);
      expect(result.distribution).toBe(crazygames);
    });
  }
}

async function injectResolver(page) {
  for (const file of ['resolver-reference.js','resolver-probe.js'])
    await page.addScriptTag({path:path.resolve(__dirname,'../fixtures/government-query-reuse/'+file)});
}

for (const bookmark of ['476','1096','1204']) {
  for (const crazygames of [false,true]) {
    test(bookmark+' resolver misses validate once with reference parity and matching restore, distribution '+crazygames, async function ({page},info) {
      await start(page,info,crazygames,bookmark); await injectResolver(page);
      const result=await page.evaluate(function () {
        const H=GOV_RESOLVER,R=GOV_RESOLVER_REFERENCE,G=FB.governments,s=FB.state;
        const ids=Object.keys(s.realms).filter(function (rid) { return s.realms[rid].alive; });
        const saved=FB.save.serialize(),envelope=JSON.parse(saved);
        const rows=H.pure(s,function () {
          G.invalidate(); R.invalidate();
          const reference=H.measure(function () { return ids.map(function (rid) { return R.forRealm(s,rid); }); });
          const candidate=H.measure(function () { return ids.map(function (rid) { return G.forRealm(s,rid); }); });
          if (reference.result.error || candidate.result.error) throw new Error('Valid opening resolution failed');
          candidate.result.value.forEach(function (form,i) {
            if (!form) throw new Error('Living realm has no valid form: '+ids[i]);
            H.resolved(form,reference.result.value[i]);
          });
          const hits=H.measure(function () {
            return ids.every(function (rid,i) { return G.forRealm(s,rid)===candidate.result.value[i]; });
          });
          const referenceHits=H.measure(function () {
            return ids.every(function (rid,i) { return R.forRealm(s,rid)===reference.result.value[i]; });
          });
          ids.forEach(function (rid) { H.compare(s,rid); });
          Object.keys(FBDATA.governmentForms).forEach(function (id) {
            if (H.resolve(id).error) throw new Error('Native form failed: '+id);
          });
          const direct=H.measure(function () { return G.resolve(candidate.result.value[0].id); });
          return {reference:reference.counts,candidate:candidate.counts,hits:hits.counts,
            referenceHits:referenceHits.counts,hitIdentity:hits.result.value && referenceHits.result.value,
            direct:direct.counts};
        });
        const serialized=saved===FB.save.serialize(),restores=[];
        for (let i=0;i<2;i++) {
          FB.save.restore(H.copy(envelope));
          H.pure(FB.state,function () { ids.forEach(function (rid) { H.compare(FB.state,rid); }); });
          restores.push({different:FB.state!==s,matching:!FB.save.otherWorld(envelope),
            rng:(FB.getRngState()>>>0)===(envelope.rng>>>0),uid:FB.getUidCounter()===envelope.uid,
            stamp:FB.state.start.revision===envelope.state.start.revision});
        }
        return {realms:ids.length,rows:rows,serialized:serialized,restores:restores,distribution:FB.platform.isCrazyGames};
      });
      expect(result.realms).toBeGreaterThan(0);
      expect(result.rows.reference.problems).toBe(result.realms*2);
      expect(result.rows.candidate.problems).toBe(result.realms);
      expect(result.rows.reference.strategyIds).toBe(result.realms*3);
      expect(result.rows.candidate.strategyIds).toBe(result.realms*2);
      expect(result.rows.reference.profiles).toBe(result.rows.candidate.profiles*2);
      expect(result.rows.hits).toEqual({problems:0,strategyIds:0,profiles:0});
      expect(result.rows.referenceHits).toEqual(result.rows.hits);
      expect(result.rows.hitIdentity).toBe(true);
      expect(result.rows.direct).toMatchObject({problems:1,strategyIds:2});
      expect(result.serialized).toBe(true);
      expect(result.restores).toEqual(Array(2).fill({different:true,matching:true,rng:true,uid:true,stamp:true}));
      expect(result.distribution).toBe(crazygames);
      await info.attach('government-validation-counts',{body:Buffer.from(JSON.stringify(result,null,2)),contentType:'application/json'});
      console.log(bookmark+' distribution '+crazygames+' government validation counts: '+JSON.stringify(result.rows));
    });
  }
}

test('scalar system reads preserve layer precedence, fallback and immediate definition edits', async function ({page},info) {
  await start(page,info); await injectScalar(page);
  const result=await page.evaluate(function () {
    const H=GOV_SCALAR,s=FB.state,rid='sasanian_476',ref={kind:'realm',id:rid};
    const forms=FBDATA.governmentForms,era=FBDATA.eras[FB.campaignEra(s)],oldEra=H.copy(era);
    const context={realm:rid,faith:null,bookmark:{}},answers=[];
    FBDATA.governmentForms=H.copy(forms);
    FBDATA.governmentForms.scalar_form=H.copy(forms.territorial);
    s.authority.governments[rid].formId='scalar_form';
    const form=FBDATA.governmentForms.scalar_form;
    function read() {
      H.compare(s,[ref],[context],['royal_council','great_holy_wars','scalar_unknown_system']);
      return FB.systemEnabled(s,'royal_council',context);
    }
    try {
      era.systems=null; form.systems=null; answers.push(read());
      era.systems={disable:['royal_council']}; answers.push(read());
      form.systems={enable:['royal_council']}; answers.push(read());
      s.faiths=Object.assign({},s.faiths,{scalar_branch:{name:'Scalar branch',parent:'catholic',
        properties:{systems:{disable:['royal_council']}}}});
      if (!FB.faithExists('scalar_branch',s)) throw new Error('Layer fixture faith was not installed');
      context.faith='scalar_branch'; answers.push(read());
      context.bookmark={systems:{enable:['royal_council']}}; answers.push(read());
      context.bookmark={}; context.faith=null;
      form.systems.enable=[]; form.systems.disable=['royal_council']; answers.push(read());
      FBDATA.governmentForms=H.copy(FBDATA.governmentForms);
      FBDATA.governmentForms.scalar_form.systems={royal_council:true}; answers.push(read());
      // A null scalar answer keeps the system scope's own default, then era fallback.
      s.authority.governments[rid].formId='absent'; s.start.defaultGovernment='scalar_form'; answers.push(read());
      delete s.start.defaultGovernment; era.defaultGovernment='scalar_form'; answers.push(read());
      s.start.defaultGovernment='absent'; answers.push(read());
      const overrides=[
        {greatHolyWars:false},{greatHolyWars:true},
        {greatHolyWars:false,systems:{enable:['great_holy_wars']}},
        {greatHolyWars:true,systems:{disable:['great_holy_wars']}}
      ].map(function (bookmark) {
        const ctx={realm:rid,faith:null,bookmark:bookmark};
        H.compare(s,[ref],[ctx],['great_holy_wars']);
        return H.measure(function () { return FB.systemEnabled(s,'great_holy_wars',ctx); });
      });
      return {answers:answers,overrides:overrides};
    } finally { FBDATA.governmentForms=forms; Object.assign(era,oldEra); }
  });
  expect(result.answers).toEqual([true,false,true,false,true,false,true,true,true,false]);
  expect(result.overrides.map(function (r) { return r.value; })).toEqual([false,true,true,false]);
  for (const row of result.overrides) expect(row.counts).toMatchObject({scalarQueries:0,publicQueries:0,actorQueries:0,rulesStringifies:0,rulesParses:0});
});

for (const bookmark of ['476','1096','1204']) {
  test(bookmark+' system scopes eliminate only their rules copies and preserve detached queries and restore', async function ({page},info) {
    await start(page,info,false,bookmark); await injectScalar(page);
    const result=await page.evaluate(function () {
      const H=GOV_SCALAR,R=GOV_SCALAR_REFERENCE,Q=FB.political,s=FB.state;
      const refs=Object.keys(s.realms).filter(function (id) { return id!=='player' && s.realms[id].alive; }).slice(0,4)
        .map(function (id) { return {kind:'realm',id:id}; });
      const ids=['royal_council','papacy','abbeys'];
      function systems(query) {
        return refs.map(function (ref) {
          return ids.map(function (id) { return query(s,id,{realm:ref.id,faith:null,bookmark:{}}); });
        });
      }
      const before=JSON.stringify(s),data=JSON.stringify(FBDATA),rng=FB.getRngState(),uid=FB.getUidCounter();
      const reference=H.measure(function () { return systems(R.systemEnabled); });
      const candidate=H.measure(function () { return systems(FB.systemEnabled); });
      const scalar=H.measure(function () { return refs.map(function (ref) { return Q.governmentFormId(s,ref); }); });
      const detached=H.measure(function () { return [Q.government(s,refs[0]),Q.government(s,refs[0])]; });
      const a=detached.value[0],b=detached.value[1],original=JSON.stringify(b);
      a.formId='changed';
      const layer=a.rules.systems,key=Object.keys(layer)[0];
      if (Array.isArray(layer[key])) layer[key].push('changed'); else layer[key]=!layer[key];
      if (a.rules.legalTradition && typeof a.rules.legalTradition==='object') a.rules.legalTradition.default='changed';
      const isolated=a!==b && a.rules!==b.rules && JSON.stringify(b)===original &&
        JSON.stringify(Q.government(s,refs[0]))===original;
      H.compare(s,refs,[undefined,{faith:null,realm:null,bookmark:{}}],FB.systems.ids());
      const available=ids.map(function (id) { return [FB.systemAvailable(s,id),R.systemAvailable(s,id)]; });
      const pure=before===JSON.stringify(s) && data===JSON.stringify(FBDATA) && rng===FB.getRngState() && uid===FB.getUidCounter();
      const envelope=JSON.parse(FB.save.serialize());
      s.authority.governments[refs[0].id]={formId:'territorial'};
      H.compare(s,refs,[{realm:refs[0].id,faith:null,bookmark:{}}],ids);
      const restores=[];
      for (let i=0;i<2;i++) {
        FB.save.restore(H.copy(envelope));
        H.compare(FB.state,refs,[undefined,{realm:refs[0].id,faith:null,bookmark:{}}],ids);
        restores.push({different:FB.state!==s,turn:FB.state.turn===envelope.state.turn,
          rng:(FB.getRngState()>>>0)===(envelope.rng>>>0),uid:FB.getUidCounter()===envelope.uid,
          matching:!FB.save.otherWorld(envelope),form:Q.governmentFormId(FB.state,refs[0])===scalar.value[0]});
      }
      return {reference:reference,candidate:candidate,scalar:scalar.counts,public:detached.counts,
        pure:pure,isolated:isolated,available:available,restores:restores};
    });
    expect(result.candidate.value).toEqual(result.reference.value);
    expect(result.reference.counts).toMatchObject({publicQueries:12,scalarQueries:0,actorQueries:12,rulesStringifies:12,rulesParses:12});
    expect(result.candidate.counts).toMatchObject({publicQueries:0,scalarQueries:12,actorQueries:12,rulesStringifies:0,rulesParses:0});
    expect(result.candidate.counts.nestedRulesStringifies).toBe(result.reference.counts.nestedRulesStringifies);
    expect(result.candidate.counts.nestedRulesParses).toBe(result.reference.counts.nestedRulesParses);
    expect(result.scalar).toMatchObject({scalarQueries:4,actorQueries:4,rulesStringifies:0,rulesParses:0});
    expect(result.public).toMatchObject({publicQueries:2,actorQueries:2,rulesStringifies:2,rulesParses:2});
    expect(result.pure).toBe(true); expect(result.isolated).toBe(true);
    for (const row of result.available) expect(row[0]).toBe(row[1]);
    expect(result.restores).toEqual(Array(2).fill({different:true,turn:true,rng:true,uid:true,matching:true,form:true}));
    const counts={reference:result.reference.counts,candidate:result.candidate.counts,scalar:result.scalar,public:result.public};
    await info.attach('government-rules-copy-counts',{body:Buffer.from(JSON.stringify(counts,null,2)),contentType:'application/json'});
    console.log(bookmark+' government rules copy counts: '+JSON.stringify(counts));
  });
}

test('resolver cache matches fallback stamps, same-turn changes and existing in-place edit behavior', async function ({page},info) {
  await openGame(page,info); await injectResolver(page);
  const result=await page.evaluate(function () {
    const H=GOV_RESOLVER,R=GOV_RESOLVER_REFERENCE,G=FB.governments,forms=FBDATA.governmentForms;
    const initial={turn:0,realms:{court:{alive:true},dead:{alive:false}},start:{defaultGovernment:'regnum'},
      authority:{governments:{court:{formId:'resolver_court'}}}};
    const s=H.copy(initial),labels=[];
    function reset() {
      Object.assign(s,H.copy(initial));
      FBDATA.governmentForms=Object.assign({},forms,{resolver_court:H.copy(forms.territorial)});
      G.invalidate(); R.invalidate();
    }
    function check(label,edit,id) {
      reset(); H.compare(s,'court'); edit();
      const actual=H.pure(s,function () { return H.compare(s,'court'); });
      if (actual.error || (actual.value && actual.value.id)!==id) throw new Error(label+': wrong form');
      labels.push(label);
    }
    try {
      check('same-turn form id',function () { s.authority.governments.court.formId='regnum'; },'regnum');
      check('row replaced',function () { s.authority.governments.court={formId:'regnum'}; },'regnum');
      check('authority replaced',function () { s.authority={governments:{court:{formId:'regnum'}}}; },'regnum');
      check('missing authority',function () { delete s.authority; },'regnum');
      check('missing row',function () { delete s.authority.governments.court; },'regnum');
      for (const id of [undefined,null,false,0,''])
        check('falsy stamp '+String(id),function () { s.authority.governments.court.formId=id; },'regnum');
      check('unstamped default',function () { delete s.authority; delete s.start.defaultGovernment; },'territorial');
      check('missing start',function () { delete s.authority; delete s.start; },'territorial');
      check('unknown default',function () { delete s.authority; s.start.defaultGovernment='absent'; },null);
      check('invalid saved stamp does not fall back',function () { s.authority.governments.court.formId='absent'; },null);
      check('dead realm',function () { s.realms.court.alive=false; },null);
      check('missing realm',function () { delete s.realms.court; },null);
      check('replaced definition',function () {
        FBDATA.governmentForms.resolver_court=Object.assign({},forms.regnum);
      },'resolver_court');
      check('replaced catalogue',function () {
        FBDATA.governmentForms=Object.assign({},FBDATA.governmentForms,{resolver_court:H.copy(forms.regnum)});
      },'resolver_court');
      check('removed definition',function () { delete FBDATA.governmentForms.resolver_court; },null);
      const boundaries=[];
      for (const turn of [89,359]) {
        reset(); const warm=G.forRealm(s,'court'); R.forRealm(s,'court');
        s.turn=turn; s.date={year:476,season:turn===89 ? 0 : 3,day:89};
        const measured=H.measure(function () { return G.forRealm(s,'court'); }); H.compare(s,'court');
        boundaries.push({turn:turn,problems:measured.counts.problems,newResult:measured.result.value!==warm});
      }
      reset(); const warm=G.forRealm(s,'court'),reference=R.forRealm(s,'court');
      FBDATA.governmentForms.resolver_court.holders='absent';
      H.compare(s,'court');
      const stale=H.measure(function () { return G.forRealm(s,'court'); });
      const inPlace=stale.result.value===warm && R.forRealm(s,'court')===reference &&
        warm.strategies.holders===forms.territorial.holders && !!H.resolve('resolver_court').error;
      G.invalidate(); R.invalidate(); const invalidated=H.compare(s,'court').value===null;
      // A cached null remains null after an in-place repair until invalidation.
      FBDATA.governmentForms.resolver_court.holders='direct';
      const nullHit=H.compare(s,'court').value===null && !H.resolve('resolver_court').error;
      G.invalidate(); R.invalidate(); const repaired=!!H.compare(s,'court').value;
      const cached=G.forRealm(s,'court'),cachedReference=R.forRealm(s,'court');
      cached.strategies.holders='caller_changed'; cachedReference.strategies.holders='caller_changed';
      H.compare(s,'court');
      const returnedMutation=G.forRealm(s,'court')===cached && cached.strategies.holders==='caller_changed';
      const other=H.copy(s); H.compare(other,'court');
      const stateIdentity=G.forRealm(other,'court')!==cached && G.forRealm(other,'court').strategies.holders==='direct';
      const missing=H.pure(s,function () {
        return [null,{}, {realms:{}}].every(function (state) {
          return H.compare(state,'court').value===null;
        }) && H.compare(s,'absent').value===null && H.compare(s,'dead').value===null;
      });
      const early=H.measure(function () {
        return [G.forRealm(null,'court'),G.forRealm({},'court'),G.forRealm(s,'absent'),G.forRealm(s,'dead')];
      });
      return {cases:labels.length,boundaries:boundaries,inPlace:inPlace,staleValidations:stale.counts.problems,
        invalidated:invalidated,nullHit:nullHit,repaired:repaired,returnedMutation:returnedMutation,
        stateIdentity:stateIdentity,missing:missing,early:early.counts};
    } finally { FBDATA.governmentForms=forms; G.invalidate(); R.invalidate(); }
  });
  expect(result.cases).toBe(19);
  expect(result.boundaries).toEqual([{turn:89,problems:1,newResult:true},{turn:359,problems:1,newResult:true}]);
  expect(result).toMatchObject({inPlace:true,staleValidations:0,invalidated:true,nullHit:true,repaired:true,
    returnedMutation:true,stateIdentity:true,missing:true});
  expect(result.early).toEqual({problems:0,strategyIds:0,profiles:0});
});

test('resolver keeps delegated references, registry contracts, callback order and exception recovery', async function ({page},info) {
  await openGame(page,info); await injectResolver(page);
  const result=await page.evaluate(function () {
    const H=GOV_RESOLVER,R=GOV_RESOLVER_REFERENCE,G=FB.governments,forms=FBDATA.governmentForms;
    const contracts=G.interfaces(),profileFaults=FB.governmentSelection.profileFaults,log=[];
    const s={turn:0,realms:{court:{alive:true}},authority:{governments:{court:{formId:'resolver_court'}}}};
    const territory=Object.assign({},G.strategy('territory','fixed'),{profile:function (state,rid,context) {
      log.push(rid+':'+context.marker); return {realm:rid,marker:context.marker,movingCourt:false};
    }});
    G.register('territory','resolver_target',territory);
    G.register('territory','resolver_delegate',{delegate:'resolver_target',allowsTitleGrowth:false});
    FBDATA.governmentForms=Object.assign({},forms,{resolver_court:Object.assign({},H.copy(forms.territorial),
      {territory:'resolver_delegate',succession:'office',holders:'resolver_late'})});
    try {
      const beforeRegister=H.compare(s,'court').value===null;
      const holder=Object.assign({},G.strategy('holders','direct'));
      G.register('holders','resolver_late',holder); R.invalidate();
      const registered=H.compare(s,'court').value;
      const delegated=registered.use.territory!==territory && registered.use.territory.profile===territory.profile &&
        registered.use.territory.allowsTitleGrowth===false && registered.use.succession.eligible===G.strategy('succession','dynastic').eligible;
      log.length=0; H.compare(s,'court'); const callbackOrder=log.slice();
      const outer=G.forRealm(s,'court');
      holder.marker={live:true}; H.compare(s,'court');
      const liveReference=G.forRealm(s,'court')===outer && outer.use.holders===holder && outer.use.holders.marker.live;
      G.contract('holders',contracts.holders.concat(['resolverRequired'])); R.invalidate();
      const incomplete=H.compare(s,'court').value===null;
      const first=G.problems('resolver_court')[0];
      holder.resolverRequired=function () { return true; };
      const repairHit=H.compare(s,'court').value===null && !H.resolve('resolver_court').error;
      G.invalidate(); R.invalidate(); const repaired=!!H.compare(s,'court').value;
      G.contract('holders',contracts.holders); R.invalidate();
      // Public-crown validation runs its real profile validator, once per miss.
      FBDATA.governmentForms.resolver_court=H.copy(forms.elective_monarchy);
      FBDATA.governmentForms.resolver_court.strategyParameters={ai:{warChance:0},council:{seats:[]}};
      const candidate=H.measure(function () { return G.forRealm(s,'court'); });
      const reference=H.measure(function () { return R.forRealm(s,'court'); });
      H.resolved(candidate.result.value,reference.result.value);
      const direct=H.measure(function () { return G.resolve('resolver_court'); });
      G.invalidate(); R.invalidate();
      FB.governmentSelection.profileFaults=function () { throw new Error('Resolver profile fixture failure'); };
      const failed=H.compare(s,'court'); H.resolve('resolver_court');
      FB.governmentSelection.profileFaults=profileFaults;
      const recovered=H.measure(function () { return G.forRealm(s,'court'); }); H.compare(s,'court');
      return {beforeRegister:beforeRegister,delegated:delegated,callbackOrder:callbackOrder,liveReference:liveReference,
        incomplete:incomplete,first:first,repairHit:repairHit,repaired:repaired,candidate:candidate.counts,
        reference:reference.counts,direct:direct.counts,failed:failed.error,recovered:recovered.counts};
    } finally {
      FB.governmentSelection.profileFaults=profileFaults; G.contract('holders',contracts.holders);
      FBDATA.governmentForms=forms; G.invalidate(); R.invalidate();
    }
  });
  expect(result).toMatchObject({beforeRegister:true,delegated:true,liveReference:true,incomplete:true,repairHit:true,repaired:true});
  expect(result.callbackOrder).toEqual(['court:query','court:query']);
  expect(result.first).toEqual({kind:'incomplete',slot:'holders',id:'resolver_late'});
  expect(result.candidate).toEqual({problems:1,strategyIds:2,profiles:1});
  expect(result.reference).toEqual({problems:2,strategyIds:3,profiles:2});
  expect(result.direct).toEqual(result.candidate);
  expect(result.failed).toEqual({name:'Error',message:'Resolver profile fixture failure'});
  expect(result.recovered).toEqual(result.candidate);
});

test('same-turn government mod replacement invalidates warmed construction and preserves JSON dispatch parity', async function ({page},info) {
  await openGame(page,info); await injectResolver(page);
  const result=await page.evaluate(function (configs) {
    const H=GOV_RESOLVER,R=GOV_RESOLVER_REFERENCE,G=FB.governments;
    const s={turn:0,realms:{court:{alive:true}},authority:{governments:{court:{formId:'scalar_court'}}}};
    const rows=[];
    for (const config of configs) {
      const previous=G.forRealm(s,'court');
      FB.mods.apply(JSON.parse(JSON.stringify(config))); R.invalidate();
      const measured=H.measure(function () { return G.forRealm(s,'court'); });
      const actual=H.pure(s,function () { return H.compare(s,'court'); });
      if (actual.error || !actual.value) throw new Error('Replacement form failed');
      H.resolve('scalar_court');
      rows.push({holders:actual.value.strategies.holders,changed:actual.value!==previous,
        sameTurn:s.turn===0,validations:measured.counts.problems});
    }
    return rows;
  },[scalarMod(true),scalarMod(false),scalarMod(true)]);
  expect(result).toEqual([
    {holders:'direct',changed:true,sameTurn:true,validations:1},
    {holders:'feudal_vassals',changed:true,sameTurn:true,validations:1},
    {holders:'direct',changed:true,sameTurn:true,validations:1}
  ]);
});
