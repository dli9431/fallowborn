'use strict';
const {test,expect} = require('../support/fixture');
const {openGame,prepareGameContent} = require('../support/game/navigation');
const {beginBookmarkFromTitle,restoreBookmark} = require('../support/game/bookmark-acceptance');
const {installPageGuards} = require('../support/page-contract');
const {dependsOnRuntime} = require('../support/runtime-dependencies');

dependsOnRuntime(__filename,['data/bookmark_manifest.js','index.html','data/bookmark_634.js','data/bookmark_sources.js',
  'data/bookmark_634_identities.js','data/starts_634_rulers.js','data/bookmark_634_courts.js',
  'data/starts_634_damascus.js','data/starts_634_ctesiphon.js','data/story_ruler_agendas_634.js',
  'data/bookmark_634_scaffold_a.js','data/bookmark_634_scaffold_b.js',
  'data/bookmark_634_scaffold_c.js','data/bookmark_634_scaffold_d.js',
  'js/bookmark_sources.js','js/bookmark_composition.js','js/bookmark_setup.js',
  'js/government_aristocracy.js','js/government_selection.js','js/model.js',
  'js/institutions.js','js/religious_institutions.js','js/world.js','js/starts.js',
  'js/save.js','js/save_v4.js','js/mods.js','js/main.js'].concat(
    'abcdefghijklmnopqrst'.split('').map(function (c) { return 'data/bookmark_634_courts_'+c+'.js'; })));

async function load(page,info) {
  await openGame(page,info); await prepareGameContent(page);
  expect(await page.evaluate(function () {
    return FB.bookmark('634') ? FB.validateBookmark(FB.bookmark('634','core_courts_v4')) : FB.bookmarkRuntimeDiagnostics();
  })).toEqual([]);
}
async function review(page,info,scenario,imported) {
  await load(page,info);
  if (imported) {
    const mod=await page.evaluate(function () {
      const b=JSON.parse(JSON.stringify(FBDATA.bookmarks['634']));
      b.revision='core_courts_v4'; b.revisions.core_courts_v4.hidden=false;
      // A real content change, beyond the isolated visibility switch.
      b.revisions.core_courts_v4.localInstitutions.rome_see.representative.skills.dip=7;
      return {name:'Autumn institution review',bookmarks:{'634':b}};
    });
    expect(await page.evaluate(function (m) { return FB.mods.validate(m); },mod)).toEqual([]);
    await page.evaluate(function () { FB.ui.showMods(); });
    await page.locator('#modfile').setInputFiles({name:'autumn-institutions.json',mimeType:'application/json',
      buffer:Buffer.from(JSON.stringify(mod),'utf8')});
    await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded'}),page.locator('#mod-apply').click()]);
    await prepareGameContent(page);
  } else await page.evaluate(function () {
    // Owner review only in this browser context; shipped visibility stays hidden.
    FBDATA.bookmarks['634'].revision='core_courts_v4';
    FBDATA.bookmarks['634'].revisions.core_courts_v4.hidden=false;
  });
  await beginBookmarkFromTitle(page,'634',scenario || 'farmer_634');
}
function facts() {
  const e=JSON.parse(FB.save.serialize()),s=FB.save.expandedSnapshot(e.state);
  return {signature:e.mods,rng:e.rng>>>0,uid:e.uid,
    value:JSON.stringify([s.start,s.date,s.turn,s.player,s.chars,s.owner,s.holder,s.realms,
      s.bookmarkSetup,s.authority,s.religiousHeads,s.religiousHeadVacancies,s.localInstitutions,
      s.stories,s.holdings,s.property,s.population])};
}

test('complete hidden opening consumes each court once and preserves the selectable world',async function ({page},info) {
  await load(page,info);
  expect(await page.evaluate(function () { return Object.keys(FB.mods.retainedCatalogueRoots()); })).toContain('storyInstances');
  expect(await page.evaluate(function () {
    const b=FB.bookmark('634','core_courts_v4'),old=FB.bookmark('634'),raw=FBDATA.bookmarks['634'];
    const rows=FBDATA.bookmarkRevisionContent_634_courts.realms.slice();
    'abcdefghijklmnopqrst'.split('').forEach(function (c) {
      Array.prototype.push.apply(rows,FBDATA['bookmarkRevisionContent_634_courts_'+c].realms);
    });
    const same=function (a,b) { return JSON.stringify(a)===JSON.stringify(b); };
    const institutions=Object.keys(b.localInstitutions);
    const starts=FBDATA.startScenarios.filter(function (r) { return r.bookmarkIds && r.bookmarkIds.indexOf('634')>=0; });
    return {fresh:old.revision,visible:FB.bookmarkAvailable('634'),hidden:b.hidden,
      counts:[b.provinces.length,b.provinces.filter(function (p) { return !p.wasteland; }).length,
        b.realms.length,Object.keys(b.duchies).length,Object.keys(b.kingdoms).length,Object.keys(b.empires).length],
      courts:rows.length===122 && new Set(rows.map(function (r) { return r.id; })).size===122 &&
        rows.every(function (r) { return same(r,b.realms.find(function (x) { return x.id===r.id; })); }),
      landscape:same(b.provinces,old.provinces) && ['duchies','kingdoms','empires','climate','straits','crossingClasses','systems'].every(function (k) { return same(b[k],old[k]); }),
      layouts:b.provinces.every(function (p) { return p.wasteland || (FBDATA.settlementLayouts['634_opening'][p.id] || []).length>0; }),
      earlierEmpty:FB.bookmarkRevisions('634').filter(function (r) { return r.revision!=='core_courts_v4'; }).every(function (r) {
        return Object.keys(r.localInstitutions).length===0 && Object.keys(r.opening.actors).length===0;
      }),
      institutions:institutions,scoped:institutions.every(function (id) { const d=b.localInstitutions[id];
        return same(d.jurisdictionIds,[d.provinceId]) && d.communionWith.length===0 && d.freshOnly && d.vacant===false; }),
      actors:same(b.opening.actors,FBDATA.bookmarkOpeningActors634),
      starts:starts.map(function (r) { return r.id; }).sort(),
      identities:starts.filter(function (r) { return ['umar_634','heraclius_634','damascus_household_634','ctesiphon_household_634'].indexOf(r.id)>=0; }).map(function (r) {
        const v=FB.startIdentity(r,b); return [r.id,v.startReligion,v.governmentForm || null];
      }).sort(),
      held:!starts.some(function (r) { return /yazdegerd|jabala/.test(r.id); }),
      fronts:['syrian_front_634','iraqi_front_634'].map(function (id) {
        return [id,!!FBDATA.storyInstances[id],b.stories.indexOf(id)>=0,old.stories.indexOf(id)>=0];
      }),
      baseline:raw.revisions.baseline};
  })).toEqual({fresh:'core_identities_v3',visible:true,hidden:true,counts:[527,506,122,244,50,50],
    courts:true,landscape:true,layouts:true,earlierEmpty:true,
    institutions:['constantinople_see','jerusalem_see','rome_see','ctesiphon_catholicos_634','antioch_west_syriac_claim_634','alexandria_imperial_claim_634'],
    scoped:true,actors:true,starts:['craftsman_634','ctesiphon_household_634','damascus_household_634','farmer_634','frontier_household_634','heraclius_634','medina_household_634','umar_634'],
    identities:[['ctesiphon_household_634','east_syriac_local_634',null],['damascus_household_634','chalcedonian_local_634',null],
      ['heraclius_634','chalcedonian','administrative_monarchy'],['umar_634','medinan_court_634','medinan_selection_634']],held:true,fronts:[['syrian_front_634',true,true,false],['iraqi_front_634',true,true,false]],baseline:{}});
});

test('six distinct incumbents initialize without global seeds or extra authority',async function ({page},info) {
  await load(page,info);
  await page.evaluate(function () { delete FBDATA.localInstitutions; });
  await page.evaluate(function () {
    FBDATA.bookmarks['634'].revision='core_courts_v4';
    FBDATA.bookmarks['634'].revisions.core_courts_v4.hidden=false;
  });
  await beginBookmarkFromTitle(page,'634','farmer_634');
  expect(await page.evaluate(function () {
    const s=FB.state,defs=FB.localInstitutionDefinitions(s),ids=Object.keys(defs);
    const chars=ids.map(function (id) { return s.chars[s.localInstitutions[id].representativeId]; });
    const before=JSON.stringify([s,FB.getRngState(),FB.getUidCounter()]);
    const outside=ids.every(function (id) { const d=defs[id];
      return !FB.localInstitutionMediationQuote(s,id,{kind:'realm',id:'byzantium_634'},d.provinceId==='roma'?'jerusalem':'roma').allowed;
    });
    const pure=before===JSON.stringify([s,FB.getRngState(),FB.getUidCounter()]);
    FB.ensureLocalInstitutions(s,null,{fresh:true});
    const a=FB.bookmarkActor(s,'sasanian_magnate_a_634');
    return {names:chars.map(function (c) { return c.name; }),births:chars.map(function (c) { return c.born; }),
      homes:chars.map(function (c) { return c.homeProvinceId; }),distinct:new Set(chars.map(function (c) { return c.id; })).size,
      offices:ids.every(function (id,i) { return FB.religiousOfficeSnapshot(s,defs[id].officeId).id===chars[i].id; }),
      priests:chars.every(function (c) { return c.role==='priest' && !c.generatedOfficeholder && c.traits.length===0 && c.childrenIds.length===0 && !c.spouseId; }),
      noGrants:chars.every(function (c) { return !s.authority.appointments.some(function (r) { return r.holder && r.holder.id===c.id; }); }),
      noCommunion:!s.authority.recognitions.some(function (r) { return r.issuer.kind==='religious-office' && chars.some(function (c) { return r.subject.id===c.id; }); }),
      oldHead:!FB.religiousOfficeSnapshot(s,'alexandria_patriarch'),
      nullHeads:FB.religionOf('early_islam_634',s).head===null && FB.religionOf('alexandria_imperial_chalcedonian_634',s).head===null,
      medinan:FB.religiousHeadSnapshot(s,'medinan_court_634').id===FB.realmRulerCharacterSnapshot(s,'rashidun_634').id,
      steward:FB.aristocracy.state(s,'sasanian_634').regency.stewardId===a.id,
      outside:outside,pure:pure,once:before===JSON.stringify([s,FB.getRngState(),FB.getUidCounter()]),
      ledger:Object.keys(s.localInstitutions).length,valid:FB.validateLocalInstitutionState(s)};
  })).toEqual({names:['Sergius I','Sophronius','Honorius I','Isho’yahb II','John of the Sedre','Cyrus'],
    births:[570,550,575,575,580,580],homes:['constantinople','jerusalem','roma','baghdad','antioch','alexandria'],
    distinct:6,offices:true,priests:true,noGrants:true,noCommunion:true,oldHead:true,nullHeads:true,medinan:true,steward:true,
    outside:true,pure:true,once:true,ledger:6,valid:true});
});

for (const imported of [false,true]) test((imported?'JSON':'native')+' assembled current content restores twice with spent resources and rejects malformed saves',async function ({page},info) {
  await review(page,info,'farmer_634',imported);
  await page.evaluate(function () { FB.state.player.gold-=7; });
  if (!imported) await page.evaluate(function () {
    // A matching campaign remains loadable after review visibility is withdrawn.
    FBDATA.bookmarks['634'].revisions.core_courts_v4.hidden=true;
    FBDATA.bookmarks['634'].revision='core_identities_v3';
  });
  const before=await page.evaluate(facts);
  if (imported) expect(before.signature).toMatch(/^effective-1-[a-f0-9]{64}$/);
  const saved=await page.evaluate(function () { return FB.save.serialize(); });
  await restoreBookmark(page,saved);
  expect(await page.evaluate(facts)).toEqual(before);
  const resaved=await page.evaluate(function () { return FB.save.serialize(); });
  await restoreBookmark(page,resaved);
  expect(await page.evaluate(facts)).toEqual(before);
  expect(await page.evaluate(function (text) {
    const original=JSON.parse(text),before=JSON.stringify([FBDATA,FB.state,FB.getRngState(),FB.getUidCounter(),localStorage]);
    const cases=[];
    function reject(edit) {
      const e=JSON.parse(text); e.state=FB.save.expandedSnapshot(e.state); edit(e);
      let rejected=false; try { FB.save.restore(e); } catch(error) { rejected=true; }
      cases.push(rejected && before===JSON.stringify([FBDATA,FB.state,FB.getRngState(),FB.getUidCounter(),localStorage]));
    }
    reject(function (e) { e.state.localInstitutions.rome_see.site='antioch_493'; });
    reject(function (e) { e.state.localInstitutions.rome_see.representativeId='missing_person'; });
    reject(function (e) { e.state.localInstitutions.rome_see.standing.invalid=101; });
    reject(function (e) { e.mods='effective-1-'+Array(65).join('0'); });
    reject(function (e) { e.mods='crazygames-content-foreign'; });
    reject(function (e) { e.state.start.revision='absent_revision'; });
    return {cases:cases,signature:FB.mods.saveCompatibility(original).compatible};
  },resaved)).toEqual({cases:[true,true,true,true,true,true],signature:true});

});

test.describe('assembled JSON reload and changed-content boundaries',function () {
  let sample;
  test.beforeAll(async function ({browser},info) {
    const context=await browser.newContext(),page=await context.newPage(),guard=installPageGuards(page);
    try {
      await review(page,info,'farmer_634',true);
      await page.evaluate(function () { FB.state.player.gold-=7; });
      sample={text:await page.evaluate(function () { return FB.save.serialize(); }),before:await page.evaluate(facts),
        configuration:await page.evaluate(function () { return [localStorage.getItem('fb_mods'),localStorage.getItem('fb_mods_bundled')]; })};
    } finally { try { expect(guard.faults).toEqual([]); } finally { await context.close(); } }
  });
  async function restoreSample(page,info) {
    await page.addInitScript(function (configuration) {
      if (sessionStorage.getItem('assembled-json-seeded')) return;
      if (configuration[0]!==null) localStorage.setItem('fb_mods',configuration[0]);
      if (configuration[1]!==null) localStorage.setItem('fb_mods_bundled',configuration[1]);
      sessionStorage.setItem('assembled-json-seeded','1');
    },sample.configuration);
    await openGame(page,info); await restoreBookmark(page,sample.text);
    expect(await page.evaluate(facts)).toEqual(sample.before);
  }
  test('current JSON content reloads with exact spent resources and commitments',async function ({page},info) {
    await restoreSample(page,info);
    await page.reload({waitUntil:'domcontentloaded'}); await prepareGameContent(page);
    await restoreBookmark(page,sample.text);
    expect(await page.evaluate(facts)).toEqual(sample.before);
  });
  test('changed JSON institution content rejects matching-name saves before mutation',async function ({page},info) {
    await restoreSample(page,info);
    const changed=await page.evaluate(function () {
      const b=JSON.parse(JSON.stringify(FBDATA.bookmarks['634']));
      b.revisions.core_courts_v4.localInstitutions.rome_see.representative.skills.dip=8;
      return {name:'Autumn institution review',bookmarks:{'634':b}};
    });
    await page.evaluate(function () { FB.ui.showMods(); });
    await page.locator('#modfile').setInputFiles({name:'autumn-institutions.json',mimeType:'application/json',
      buffer:Buffer.from(JSON.stringify(changed),'utf8')});
    await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded'}),page.locator('#mod-apply').click()]);
    await prepareGameContent(page);
    expect(await page.evaluate(function (text) {
      const e=JSON.parse(text),before=JSON.stringify([FBDATA,FB.state,FB.getRngState(),FB.getUidCounter(),localStorage]);
      let rejected=false; try { FB.save.restore(e); } catch(error) { rejected=/mod set|incompatible content/.test(error.message); }
      return {rejected:rejected,changed:e.mods!==FB.mods.sig(),
        pure:before===JSON.stringify([FBDATA,FB.state,FB.getRngState(),FB.getUidCounter(),localStorage])};
    },sample.text)).toEqual({rejected:true,changed:true,pure:true});
  });
});

test('invalid complete candidates reject purely and missing court input withholds publication',async function ({page},info) {
  await load(page,info);
  expect(await page.evaluate(function () {
    const before=JSON.stringify([FBDATA,FB.getRngState(),FB.getUidCounter()]),out=[];
    function reject(edit) {
      const b=JSON.parse(JSON.stringify(FBDATA.bookmarks['634'])); edit(b.revisions.core_courts_v4);
      out.push(FB.mods.validate({name:'Invalid autumn opening',bookmarks:{'634':b}}).length>0);
    }
    reject(function (b) { b.localInstitutions.rome_see.representative.born=630; });
    reject(function (b) { b.localInstitutions.rome_see.representative.home='roma'; });
    reject(function (b) { b.localInstitutions.rome_see.officeId='east_syriac_catholicos'; });
    reject(function (b) { delete b.opening.actors.sasanian_magnate_a_634; });
    reject(function (b) { b.hidden='yes'; });
    return {out:out,pure:before===JSON.stringify([FBDATA,FB.getRngState(),FB.getUidCounter()])};
  })).toEqual({out:[true,true,true,true,true],pure:true});
  await page.route('**/data/bookmark_634_courts_t.js',function (route) { return route.fulfill({body:'',contentType:'application/javascript'}); });
  await page.reload({waitUntil:'domcontentloaded'}); await prepareGameContent(page);
  const failed=await page.evaluate(function () {
    return {absent:!FB.bookmark('634'),diagnostics:FB.bookmarkRuntimeDiagnostics(),other:!!FB.bookmark('867')};
  });
  expect(failed.absent).toBe(true); expect(failed.other).toBe(true);
  expect(JSON.stringify(failed.diagnostics)).toContain('Missing 634 court declaration: t');
});

async function enterCode(page,code) {
  const full=page.locator('#btn-choose-beginning');
  if (await full.isVisible()) await full.click();
  else await page.getByRole('button',{name:'New Game',exact:true}).click();
  await page.locator('#btn-bm-seed').click(); await page.locator('#ng-seed').fill(code);
  await page.locator('#ng-seed').press('Enter');
  await expect(page.locator('#chargen:not(.hidden)')).toBeVisible();
  await page.getByRole('button',{name:'Begin Your Story',exact:true}).click();
  await page.getByRole('button',{name:'Begin',exact:true}).click();
  await page.evaluate(function () { FB.game.setPaused(true); });
}
for (const id of ['umar_634','heraclius_634','damascus_household_634','ctesiphon_household_634']) {
  test(id+' uses the assembled identity and restores its commitments',async function ({page},info) {
    await load(page,info);
    const code=await page.evaluate(function (id) {
      const b=FBDATA.bookmarks['634']; b.revision='core_courts_v4'; b.revisions.core_courts_v4.hidden=false;
      const row=FBDATA.startScenarios.find(function (r) { return r.id===id; });
      row.hidden=false;
      const projected=FB.startIdentity(row,FB.bookmark('634'));
      if (row.rulerRealmId) {
        const adopt=FB.adoptStartingRealm;
        FB.adoptStartingRealm=function (s,scenario,options) {
          const r=s.realms[scenario.rulerRealmId];
          window.originalCourt={person:s.player.charId,generation:FB.realmRulerGeneration(s,r.id),
            treasury:r.treasury && r.treasury.gold,source:r.id};
          FB.adoptStartingRealm=adopt; return adopt(s,scenario,options);
        };
      }
      const family=row.rulerRealmId?'standard':'established';
      return 'ASSEMBLED-634-'+id+'-'+row.fixedProvinceId+'-m-'+(row.characterName || 'Review')+'-'+family+'-0-'+projected.startCulture+'.'+projected.startReligion;
    },id);
    await enterCode(page,code);
    expect(await page.evaluate(function (id) {
      const s=FB.state,start=FB.campaignStart(s),c=s.chars[s.player.charId],old=window.originalCourt;
      const tracks=FB.startTracks(start,s.player.provinceId,FB.campaignBookmark(s));
      const result={id:s.start.scenarioId,revision:s.start.revision,faith:c.religion,
        attached:tracks.length>0 && tracks.every(function (track) { return !!s.stories[track]; }),six:Object.keys(s.localInstitutions).length===6};
      if (old) {
        result.adopted=c.id===old.person && !s.realms[old.source] && FB.realmRulerGeneration(s,'player')===old.generation;
        result.form=FB.governments.forRealm(s,'player').id;
        result.money=s.player.gold===100 && s.realms.player.treasury.gold===old.treasury;
      }
      return result;
    },id)).toEqual(Object.assign({id:id,revision:'core_courts_v4',attached:true,six:true,
      faith:{umar_634:'medinan_court_634',heraclius_634:'chalcedonian',damascus_household_634:'chalcedonian_local_634',ctesiphon_household_634:'east_syriac_local_634'}[id]},
      /umar|heraclius/.test(id)?{adopted:true,form:id==='umar_634'?'medinan_selection_634':'administrative_monarchy',money:true}:{}));
    const before=await page.evaluate(facts);
    await page.evaluate(function () { FB.save.restore(JSON.parse(FB.save.serialize())); FB.save.restore(JSON.parse(FB.save.serialize())); });
    expect(await page.evaluate(facts)).toEqual(before);
  });
}

test('local institution transactions conserve funds and absent fresh-only offices stay absent on restore',async function ({page},info) {
  await review(page,info);
  expect(await page.evaluate(function () {
    const s=FB.state,subject={kind:'realm',id:'byzantium_634'},before=FB.treasuryAvailable(s,'byzantium_634');
    const remote=FB.localInstitutionQuote(s,'rome_see',{kind:'character',id:s.player.charId},'petition');
    const quote=FB.localInstitutionMediationQuote(s,'rome_see',subject,'roma');
    const agreement=FB.localInstitutionSettle(s,'rome_see',subject,{provision:true,protection:true,courts:true,tolerance:true});
    const after=FB.treasuryAvailable(s,'byzantium_634');
    return {remote:remote.allowed,seat:quote.allowed,ratified:agreement && agreement.stage,
      spent:before-after,residence:FB.characterLocation(s,s.chars[s.localInstitutions.rome_see.representativeId])};
  })).toMatchObject({remote:false,seat:true,ratified:'ratified',spent:5,residence:'roma'});
  const before=await page.evaluate(facts);
  await page.evaluate(function () { FB.save.restore(JSON.parse(FB.save.serialize())); FB.save.restore(JSON.parse(FB.save.serialize())); });
  expect(await page.evaluate(facts)).toEqual(before);
  expect(await page.evaluate(function () {
    const e=JSON.parse(FB.save.serialize()); e.state=FB.save.expandedSnapshot(e.state);
    // This optional fresh office was never initialized in the represented save.
    delete e.state.localInstitutions.alexandria_imperial_claim_634;
    delete e.state.religiousHeads.alexandria_imperial_patriarch_634;
    delete e.state.religiousHeadVacancies.alexandria_imperial_patriarch_634;
    FB.save.restore(e);
    const before=JSON.stringify([FB.state.chars,FB.getRngState(),FB.getUidCounter()]);
    FB.ensureLocalInstitutions(FB.state,null,{fresh:false});
    FB.save.restore(JSON.parse(FB.save.serialize()));
    return {absent:!FB.state.localInstitutions.alexandria_imperial_claim_634 &&
      !FB.religiousOfficeSnapshot(FB.state,'alexandria_imperial_patriarch_634'),
      noReplay:before===JSON.stringify([FB.state.chars,FB.getRngState(),FB.getUidCounter()])};
  })).toEqual({absent:true,noReplay:true});
});
