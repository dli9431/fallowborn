'use strict';
const {test,expect} = require('../support/fixture');
const {openGame,prepareGameContent} = require('../support/game/navigation');
const {beginBookmarkFromTitle} = require('../support/game/bookmark-acceptance');
const {dependsOnRuntime} = require('../support/runtime-dependencies');
const path = require('path');

dependsOnRuntime(__filename,[
  'index.html','data/bookmark_634_courts.js','data/bookmark_634_identities.js','data/starts_634_rulers.js',
  'data/bookmark_634.js','data/bookmark_634_scaffold_a.js','data/bookmark_634_scaffold_b.js',
  'data/bookmark_634_scaffold_c.js','data/bookmark_634_scaffold_d.js','data/story_ruler_agendas_634.js',
  'data/aristocratic_courts.js','data/political_institutions.js','data/bookmark_sources.js',
  'js/bookmark_sources.js','js/bookmark_composition.js','js/bookmark_setup.js','js/governments.js',
  'js/government_selection.js','js/government_elective.js','js/government_aristocracy.js',
  'js/government_administration.js','js/government_recognition.js','js/authority.js',
  'js/model.js','js/world.js','js/starts.js','js/main.js','js/treasury.js','js/mods.js','js/save.js','js/save_v4.js',
  'js/lordships.js','js/fiscal.js','js/settlement.js','js/title_ids.js'
]);

// Assemble only in this isolated review. Production sources remain unpublished.
function candidate() {
  const copy=function (v) { return JSON.parse(JSON.stringify(v)); };
  const table=FBDATA.bookmarkRevisionContent_634_courts, raw=copy(FBDATA.bookmarks['634']);
  const current=FB.bookmark('634'), opening=copy(current.opening);
  opening.actors=copy(FBDATA.bookmarkOpeningActors634);
  const openings=copy(current.openingRevisions);
  openings.core_courts_v4=copy(opening);
  raw.revisions.core_courts_v4={
    realms:current.realms.map(function (r) { return copy(table.realms.find(function (v) { return v.id===r.id; }) || r); }),
    opening:opening,openingRevision:'core_courts_v4',openingRevisions:openings
  };
  raw.revision='core_courts_v4';
  return {name:'Autumn core court review',bookmarks:{'634':raw},
    religions:copy(FBDATA.bookmarkCourtReligions634),governmentForms:copy(table.governmentForms),
    administrationProfiles:copy(table.administrationProfiles),aristocraticProfiles:copy(table.aristocraticProfiles),
    startScenarios:copy(FBDATA.startScenarios_634_rulers)};
}

async function load(page,info) {
  await openGame(page,info);
  await prepareGameContent(page);
  expect(await page.evaluate(function () {
    return FB.bookmark('634') ? [] : FB.bookmarkRuntimeDiagnostics();
  })).toEqual([]);
}

async function importCourts(page,revision) {
  const mod=await page.evaluate(candidate);
  if (revision) mod.bookmarks['634'].revision=revision;
  // JSON import canonicalizes typed title aliases and omitted parents. Compare
  // that boundary on both sides; raw native retention is asserted separately.
  const predecessors=await page.evaluate(function () {
    return FB.bookmarkRevisions('634').map(FB.titleIds.normalizeBookmark);
  });
  expect(await page.evaluate(function (m) { return FB.mods.validate(m); },mod)).toEqual([]);
  await page.evaluate(function () { FB.ui.showMods(); });
  await page.locator('#modfile').setInputFiles({name:'634-core-courts.json',mimeType:'application/json',
    buffer:Buffer.from(JSON.stringify(mod),'utf8')});
  await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded'}),page.locator('#mod-apply').click()]);
  await prepareGameContent(page);
  expect(await page.evaluate(function (before) {
    return before.map(function (world) {
      return FB.titleIds.normalizeBookmark(FB.bookmarkRevisions('634').find(function (b) { return b.revision===world.revision; }));
    });
  },predecessors)).toEqual(predecessors);
}

function roundTrip() {
  function facts(envelope) {
    const s=FB.save.expandedSnapshot(envelope.state);
    return JSON.stringify([s.start,s.bookmarkSetup,s.authority,s.religiousHeads,s.religiousHeadVacancies,
      s.owner,s.holder,s.player.gold,Object.keys(s.chars).sort(),s.realms.sasanian_634.succession]);
  }
  const before=JSON.parse(FB.save.serialize()), initial=facts(before), seed=FB.aristocracy.seed;
  let noSeed=true;
  FB.aristocracy.seed=function () { noSeed=false; throw new Error('Restoration replayed court setup'); };
  try {
    FB.save.restore(before);
    const middle=JSON.parse(FB.save.serialize());
    if (facts(middle)!==initial) throw new Error('First restoration changed court facts');
    FB.save.restore(middle);
  } finally { FB.aristocracy.seed=seed; }
  const after=JSON.parse(FB.save.serialize());
  return {facts:facts(after)===initial,noSeed:noSeed,rng:(before.rng>>>0)===(after.rng>>>0),
    uid:before.uid===after.uid,signature:before.mods===after.mods && !FB.save.otherWorld(before)};
}

test('core companions stay inert and preserve every preceding ruler projection',async function ({page},info) {
  await load(page,info);
  const mod=await page.evaluate(candidate);
  expect(await page.evaluate(function (mod) {
    const raw=FBDATA.bookmarks['634'];
    const before=JSON.stringify([FBDATA,FB.state,FB.getRngState(),FB.getUidCounter()]);
    const faults=FB.mods.validate(mod);
    const retained=FB.bookmarkRevisions('634').every(function (world) {
      return JSON.stringify(FB.bookmarkRevisions('634',mod.bookmarks['634']).find(function (b) {
        return b.revision===world.revision;
      }))===JSON.stringify(world);
    });
    const projections=FBDATA.startScenarios_634_rulers.every(function (row) {
      const old=FBDATA.startScenarios.find(function (r) { return r.id===row.id; });
      return Object.keys(raw.revisions).every(function (revision) {
        return JSON.stringify(FB.startIdentity(row,{id:'634',revision:revision}))===JSON.stringify(old);
      });
    });
    const rejected=[];
    function reject(edit) {
      const bad=JSON.parse(JSON.stringify(mod)); edit(bad);
      rejected.push(FB.mods.validate(bad).length>0);
    }
    reject(function (m) { delete m.bookmarks['634'].revisions.core_courts_v4.opening.actors.sasanian_magnate_a_634; });
    reject(function (m) { m.bookmarks['634'].revisions.core_courts_v4.opening.actors.sasanian_magnate_a_634={ref:{kind:'realm_ruler',realmId:'sasanian_634'}}; });
    reject(function (m) { m.bookmarks['634'].revisions.core_courts_v4.opening.actors.sasanian_magnate_a_634.dyn='Foreign house'; });
    reject(function (m) { m.bookmarks['634'].revisions.core_courts_v4.opening.actors.sasanian_magnate_a_634.born=630; });
    reject(function (m) { m.aristocraticProfiles.sasanian_634.interests[0].provinceId='medina'; });
    reject(function (m) { m.religions.medinan_court_634.properties.head.realm='byzantium_634'; });
    reject(function (m) { m.religions.medinan_court_634.properties.head.seat='w_arabia'; });
    reject(function (m) { m.bookmarks['634'].revisions.core_courts_v4.realms.find(function (r) { return r.id==='rashidun_634'; }).religion='early_islam_634'; });
    reject(function (m) { m.startScenarios[0].revisionIdentities['634'].core_courts_v4.governmentForm='regnum'; });
    return {faults:faults,rejected:rejected,projections:projections,retained:retained,
      fresh:raw.revision,head:FBDATA.religions.early_islam_634.properties.head,
      unpublished:!FBDATA.religions.medinan_court_634 && !FBDATA.governmentForms.medinan_selection_634 &&
        !FBDATA.administrationProfiles.byzantine_634 && !raw.revisions.core_courts_v4,
      pure:before===JSON.stringify([FBDATA,FB.state,FB.getRngState(),FB.getUidCounter()])};
  },mod)).toEqual({faults:[],rejected:Array(9).fill(true),projections:true,retained:true,fresh:'core_identities_v3',head:null,
    unpublished:true,pure:true});
});

test('dated actors initialize minority stewardship and scoped source-backed interests once',async function ({page},info) {
  await load(page,info); await importCourts(page);
  await beginBookmarkFromTitle(page,'634','farmer_634');
  expect(await page.evaluate(function () {
    const s=FB.state,A=FB.aristocracy,p=A.profile(s,'sasanian_634'),data=A.state(s,'sasanian_634');
    const actors=['sasanian_magnate_a_634','sasanian_magnate_b_634'].map(function (id) { return FB.bookmarkActor(s,id); });
    const voices=A.constituency(s,'sasanian_634');
    const offices=data.interests.map(function (m) { return s.authority.appointments.find(function (a) { return a.id===m.appointmentId; }); });
    const before=JSON.stringify([s,FB.getRngState(),FB.getUidCounter()]);
    A.seed(s); A.seed(s);
    const once=before===JSON.stringify([s,FB.getRngState(),FB.getUidCounter()]);
    const ready=FB.governments.publicAuthorityReadiness(s,'sasanian_634').allowed;
    actors[0].captive=true;
    const blocked=!FB.governments.publicAuthorityReadiness(s,'sasanian_634').allowed;
    delete actors[0].captive;
    return {fault:A.validateState(s),age:634-FB.realmRulerCharacterSnapshot(s,'sasanian_634').born,
      selected:data.regency.stewardId===actors[0].id,weights:voices.map(function (m) { return m.weight; }),
      homes:actors.map(function (c) { return c.homeProvinceId; }),generated:actors.every(function (c) { return c.generatedOfficeholder; }),
      distinct:actors[0].dyn!==actors[1].dyn,terms:offices.map(function (a) { return [a.publicTerms.source.provinceId,a.publicTerms.share,a.provincialTerms.levy]; }),
      rights:data.interests.every(function (m) { return m.rightIds.length===2; }),
      estates:s.bookmarkSetup.estates.length,openingAppointments:Object.keys(s.bookmarkSetup.appointments).length,
      threshold:p.threshold,minimum:p.minimumAge,once:once,ready:ready,blocked:blocked,
      romanOffices:FB.administrationProfile(s,'byzantium_634').offices};
  })).toEqual({fault:null,age:10,selected:true,weights:[3,2],homes:['qazvin','isfahan'],generated:true,distinct:true,
    terms:[['qazvin',0.25,0.7],['isfahan',0.25,0.7]],rights:true,estates:0,openingAppointments:0,
    threshold:0.6,minimum:16,once:true,ready:true,blocked:true,
    romanOffices:['public_governor','public_fiscal_officer','public_commander']});
  expect(await page.evaluate(roundTrip)).toEqual({facts:true,noSeed:true,rng:true,uid:true,signature:true});
});

for (const start of ['umar_634','heraclius_634']) {
  test(start+' adopts the canonical court and dated constitution without a second incumbent',async function ({page},info) {
    await load(page,info); await importCourts(page);
    const code=await page.evaluate(function (id) {
      const row=FBDATA.startScenarios.find(function (v) { return v.id===id; }); row.hidden=false;
      const adopt=FB.adoptStartingRealm;
      FB.adoptStartingRealm=function (s,scenario,options) {
        const r=s.realms[scenario.rulerRealmId];
        window.originalCourt={person:s.player.charId,generation:FB.realmRulerGeneration(s,r.id),
          treasury:r.treasury && r.treasury.gold,source:r.id};
        FB.adoptStartingRealm=adopt; return adopt(s,scenario,options);
      };
      const projected=FB.startIdentity(row,FB.bookmark('634'));
      const county=FB.bookmark('634').provinces.find(function (p) { return p.id===row.fixedProvinceId; });
      const base='CORECOURTS-634-'+id+'-'+row.fixedProvinceId+'-m-'+row.characterName;
      return projected.startCulture===county.culture && projected.startReligion===county.religion ? base :
        base+'-standard-0-'+projected.startCulture+'.'+projected.startReligion;
    },start);
    const full=page.locator('#btn-choose-beginning');
    if (await full.isVisible()) await full.click();
    else await page.getByRole('button',{name:'New Game',exact:true}).click();
    await page.locator('#btn-bm-seed').click(); await page.locator('#ng-seed').fill(code);
    await page.locator('#ng-seed').press('Enter');
    await expect(page.locator('#chargen:not(.hidden)')).toBeVisible();
    await page.getByRole('button',{name:'Begin Your Story',exact:true}).click();
    await page.getByRole('button',{name:'Begin',exact:true}).click();
    expect(await page.evaluate(function (input) {
      FB.game.setPaused(true);
      const id=input.id;
      const s=FB.state,c=s.chars[s.player.charId],original=window.originalCourt;
      const head=FB.religiousHeadSnapshot(s,'medinan_court_634');
      const rid=id==='umar_634' ? 'player' : 'rashidun_634';
      const ruler=rid==='player' ? c : FB.realmRulerCharacterSnapshot(s,rid);
      return {form:FB.governments.forRealm(s,'player').id,faith:c.religion,
        same:c.id===original.person,generation:FB.realmRulerGeneration(s,'player')===original.generation,
        sourceGone:!s.realms[original.source],head:!!head && head.id===ruler.id,
        revision:s.start.revision,scenario:s.start.scenarioId,
        exactSeed:s.seed===input.code,
        accountConserved:id==='umar_634' ? s.player.gold===100 && s.realms.player.treasury.gold===original.treasury :
          s.player.gold===original.treasury && !s.realms.player.treasury,
        treasuryOwner:FB.treasuryCounterparty(s,'player')};
    },{id:start,code:code})).toEqual({form:start==='umar_634' ? 'medinan_selection_634' : 'administrative_monarchy',
      faith:start==='umar_634' ? 'medinan_court_634' : 'chalcedonian',same:true,generation:true,
      sourceGone:true,head:true,revision:'core_courts_v4',scenario:start,exactSeed:true,accountConserved:true,treasuryOwner:'player'});
    expect(await page.evaluate(roundTrip)).toEqual({facts:true,noSeed:true,rng:true,uid:true,signature:true});
  });
}

test('Medinan living nomination admits a non-relative without accession or office',async function ({page},info) {
  await load(page,info); await importCourts(page);
  await beginBookmarkFromTitle(page,'634','farmer_634');
  expect(await page.evaluate(function () {
    const s=FB.state,S=FB.governmentSelection,rid='rashidun_634';
    const c=FB.makeCharacter(s,{sex:'m',culture:'arabic',religion:'early_islam_634',born:604,
      dyn:'Independent garden',station:2,role:'notable',quality:1,traitsN:0}); c.homeProvinceId='medina';
    const m=S.constituency(s,rid)[0], incumbent=FB.realmRulerCharacterSnapshot(s,rid).id;
    const input={action:'nominate',memberId:m.id,characterId:c.id,
      actor:m.currentPrincipal && m.currentPrincipal.kind==='character' ? m.currentPrincipal : {kind:'constituency',realmId:rid,id:m.id}};
    const before=JSON.stringify([s,FB.getRngState(),FB.getUidCounter()]),q=S.quote(s,rid,input);
    const pure=before===JSON.stringify([s,FB.getRngState(),FB.getUidCounter()]);
    const money=JSON.stringify([s.realms[rid].treasury,s.player.gold,c.gold]);
    const applied=!!S.apply(s,q), duplicate=!!S.apply(s,q);
    return {allowed:q.allowed,applied:applied,duplicate:duplicate,pure:pure,
      unrelated:!c.fatherId && !c.motherId,incumbent:FB.realmRulerCharacterSnapshot(s,rid).id===incumbent,
      head:FB.religiousHeadSnapshot(s,'medinan_court_634').id===incumbent,
      money:money===JSON.stringify([s.realms[rid].treasury,s.player.gold,c.gold]),
      ancestry:S.profile(s,rid).eligibility.ancestry,living:S.profile(s,rid).procedure.livingNomination};
  })).toEqual({allowed:true,applied:true,duplicate:false,pure:true,unrelated:true,incumbent:true,head:true,money:true,
    ancestry:false,living:true});
  expect(await page.evaluate(roundTrip)).toEqual({facts:true,noSeed:true,rng:true,uid:true,signature:true});
});

for (const revision of ['baseline','core_identities_v3']) {
  test(revision+' retains headless courts after adding the complete companions',async function ({page},info) {
    await load(page,info); await importCourts(page,revision);
    await beginBookmarkFromTitle(page,'634','farmer_634');
    expect(await page.evaluate(function (revision) {
      const s=FB.state,office='medinan_caliph_634';
      const before=JSON.stringify([s,FB.getRngState(),FB.getUidCounter()]);
      FB.bindPoliticalReligiousHeads(s,'rashidun_634',true);
      FB.bindPoliticalReligiousHeads(s,'rashidun_634');
      return {revision:s.start.revision,forms:['rashidun_634','byzantium_634','sasanian_634'].map(function (id) {
        return FB.governments.forRealm(s,id).id;
      }),faith:FB.realmReligionId(s,'rashidun_634'),
      absent:!Object.prototype.hasOwnProperty.call(s.religiousHeads,office) &&
        !Object.prototype.hasOwnProperty.call(s.religiousHeadVacancies || {},office) && !FB.religiousOffices(s)[office],
      actors:Object.keys(s.bookmarkSetup.actors),pure:before===JSON.stringify([s,FB.getRngState(),FB.getUidCounter()])};
    },revision)).toEqual({revision:revision,forms:['medinan_selection_pf_634','roman_civic','regnum'],
      faith:'early_islam_634',absent:true,actors:[],pure:true});
    expect(await page.evaluate(roundTrip)).toEqual({facts:true,noSeed:true,rng:true,uid:true,signature:true});
  });
}

test('dated public profiles require funded scoped commissions and reject legacy and thematic grants',async function ({page},info) {
  await load(page,info); await importCourts(page);
  await beginBookmarkFromTitle(page,'634','farmer_634');
  expect(await page.evaluate(function () {
    const s=FB.state,c=s.chars[s.player.charId];
    c.born=600; FB.SKILLS.forEach(function (skill) { c.skills[skill]=20; });
    return ['byzantium_634','sasanian_634'].map(function (rid) {
      const pid=s.realms[rid].capital,p=FB.administrationProfile(s,rid),actor={kind:'realm',id:rid};
      const site=FB.settlementGrantSites(s,pid,rid)[0];
      if (!site) throw new Error('No secondary settlement for the public-source fixture');
      const holder=FB.makeCharacter(s,{sex:'m',culture:FB.countyCulture(s,pid),religion:FB.countyReligion(s,pid),
        born:600,station:3,traits:[]}); holder.homeProvinceId=pid;
      if (!FB.assignSettlementLordship(s,pid,site.settlement,holder.id)) throw new Error('Source fixture grant failed');
      s.realms[rid].treasury.gold=100;
      const input={institutionId:rid,officeId:p.governor,holderId:c.id,provinceId:pid,scope:{kind:'county',id:pid}};
      const before=JSON.stringify([s,FB.getRngState(),FB.getUidCounter()]);
      const q=FB.publicAppointmentQuote(s,actor,input);
      const foreign=FB.publicAppointmentQuote(s,actor,Object.assign({},input,{officeId:'byzantine_strategos'}));
      const legacy=FB.officeAppointmentQuote(s,actor,{institutionId:rid,officeId:p.governor,
        holder:{kind:'character',id:c.id},scope:input.scope});
      const pure=before===JSON.stringify([s,FB.getRngState(),FB.getUidCounter()]);
      s.realms[rid].treasury.gold=0;
      const unfunded=!FB.publicAppoint(s,q);
      s.realms[rid].treasury.gold=100;
      const fresh=FB.publicAppointmentQuote(s,actor,input),row=FB.publicAppoint(s,fresh);
      if (!row) throw new Error('Public appointment rejected: '+fresh.reason);
      const balance=s.realms[rid].treasury.gold,duplicate=!FB.publicAppoint(s,fresh);
      const result={valid:q.allowed,pure:pure,foreign:!foreign.allowed,legacy:!legacy.allowed,
        unfunded:unfunded,fee:100-balance,duplicate:duplicate,balance:s.realms[rid].treasury.gold===balance,
        source:row.publicTerms.source.provinceId===pid,share:row.publicTerms.share,
        confirmation:row.publicTerms.confirmation,legacyTransition:FB.officeTransitionQuote(s,actor,row.id,'remove')===null};
      if (!FB.publicOfficeApply(s,FB.publicOfficeQuote(s,actor,row.id,'remove'))) throw new Error('Canonical removal failed');
      return result;
    });
  })).toEqual([
    {valid:true,pure:true,foreign:true,legacy:true,unfunded:true,fee:5,duplicate:true,balance:true,source:true,share:0.1,confirmation:'reaffirm',legacyTransition:true},
    {valid:true,pure:true,foreign:true,legacy:true,unfunded:true,fee:5,duplicate:true,balance:true,source:true,share:0.1,confirmation:'continues',legacyTransition:true}
  ]);
  expect(await page.evaluate(roundTrip)).toEqual({facts:true,noSeed:true,rng:true,uid:true,signature:true});
});

test('independent JSON minority selects the weaker third principal with different terms',async function ({page},info) {
  await load(page,info);
  await page.evaluate(function () { FB.ui.showMods(); });
  await page.locator('#modfile').setInputFiles(path.resolve(__dirname,'../fixtures/opening-minority-stewardship/river-minority.json'));
  await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded'}),page.locator('#mod-apply').click()]);
  await prepareGameContent(page);
  await beginBookmarkFromTitle(page,'river_minority_world','river_minority_household');
  expect(await page.evaluate(function () {
    const s=FB.state,A=FB.aristocracy,p=A.profile(s,'river_court'),a=A.state(s,'river_court');
    const selected=FB.bookmarkActor(s,'hazel_principal');
    const before=JSON.parse(FB.save.serialize());
    FB.save.restore(before); FB.save.restore(JSON.parse(FB.save.serialize()));
    const after=JSON.parse(FB.save.serialize());
    return {age:s.date.year-FB.realmRulerCharacterSnapshot(s,'river_court').born,
      minimum:p.minimumAge,threshold:p.threshold,terms:p.defaultTerms,
      selected:a.regency.stewardId===selected.id,weights:p.interests.map(function (m) { return m.weight; }),
      authority:JSON.stringify(before.state.authority)===JSON.stringify(after.state.authority),
      actors:JSON.stringify(before.state.bookmarkSetup)===JSON.stringify(after.state.bookmarkSetup),
      rng:(before.rng>>>0)===(after.rng>>>0),uid:before.uid===after.uid,signature:before.mods===after.mods};
  })).toEqual({age:13,minimum:18,threshold:0.7,terms:{revenue:0.65,levy:0.55},selected:true,weights:[6,3,1],
    authority:true,actors:true,rng:true,uid:true,signature:true});
});
