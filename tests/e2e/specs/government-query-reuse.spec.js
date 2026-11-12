'use strict';
const path = require('path');
const {test,expect} = require('../support/fixture');
const {openGame,prepareGameContent} = require('../support/game/navigation');
const {beginBookmarkFromTitle} = require('../support/game/bookmark-acceptance');
const {openCrazyGame} = require('../support/game/crazygames-title');
const {mockCrazyGames} = require('../support/crazygames');
const {dependsOnRuntime} = require('../support/runtime-dependencies');

dependsOnRuntime(__filename,[
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
