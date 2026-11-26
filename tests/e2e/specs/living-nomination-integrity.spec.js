'use strict';
const fs = require('fs');
const path = require('path');
const {test, expect} = require('../support/fixture');
const {dependsOnRuntime} = require('../support/runtime-dependencies');
const {openTitle} = require('../support/game/navigation');
const {installStoredMod} = require('../support/game/stored-mod');
const {beginBookmarkFromTitle} = require('../support/game/bookmark-acceptance');
const {start, river} = require('../support/game/living-nomination');
dependsOnRuntime(__filename, ['data/political_institutions.js','data/technology.js',
  'js/government_selection.js','js/government_lineage.js','js/government_elective.js',
  'js/governments.js','js/government_ai.js','js/government_continuity.js',
  'js/world.js','js/model.js','js/main.js','js/starts.js','js/institutions.js',
  'js/station.js','js/justice.js','js/authority.js','js/treasury.js',
  'js/mods.js','js/save.js','js/save_v4.js','js/ui_modals.js','js/ui_misc.js']);

function fixtureText(kind) {
  return fs.readFileSync(path.resolve(__dirname,'../fixtures/living-nomination/' +
    (kind === 'consultation' ? 'consultation.json' : 'river-consultation.json')),'utf8');
}

/* The shared start admits each fixture against the unmodded catalogue and
   imports it through the Mods file picker; the cases below that still use it
   keep that coverage. The rejection cases store the same fixture text and boot
   it once, then install the livingTest members they use exactly as the shared
   start defines them. */
async function storedStart(page, info, kind) {
  await openTitle(page, info);
  await installStoredMod(page, fixtureText(kind));
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
      admit:function () { return S.apply(FB.state,S.quote(FB.state,rid,this.request())); },
      id:function () { return FB.state.chars[this.cid].royalLine.memberId; }
    };
  },kind);
}

// Each half of the stale-candidate rejections has its own fresh page.
for (const group of [{name:'age, freedom, captivity and exile changes',cases:['age','unfree','captivity','exile']},
  {name:'stale principals, residence, scope and occupied bindings',cases:['binding','foreign home','principal','scope']}])
test(group.name+' reject admission without mutation', async function ({page},info) {
  await storedStart(page,info,'river');
  const result = await page.evaluate(function (names) {
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
    ].filter(function (row) { return names.indexOf(row[0]) >= 0; });
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
  },group.cases);
  expect(result).toEqual(group.cases.map(function (name) {
    return {case:name,rejected:true};
  }));
});

// Each action's later changes form two halves, each in its own fresh page.
for (const action of ['designate','support'])
for (const group of [{name:'later identity changes',cases:['age','sex','faith','unfree'],admission:false},
  {name:'later custody, death, binding changes and new admissions',cases:['captivity','death','binding'],admission:true}]) {
  test(group.name+' invalidate '+action+' reviews', async function ({page},info) {
    await storedStart(page,info,'consultation');
    const result = await page.evaluate(function (input) {
      const action = input.action;
      const L = livingTest, s = FB.state, S = FB.governmentSelection, rid = L.rid, actor={kind:'realm',id:rid};
      L.admit(); const c=s.chars[L.cid], id=L.id(), p=S.profile(s,rid);
      const cases = [
        ['age',function () { c.born=s.date.year-17; }], ['sex',function () { c.sex='f'; }],
        ['faith',function () { c.religion='catholic'; }], ['unfree',function () { c.unfree=true; }],
        ['captivity',function () { c.captive=true; }], ['death',function () { c.dead=true; }],
        ['binding',function () { c.royalLine.memberId='occupied'; }]
      ].filter(function (row) { return input.cases.indexOf(row[0]) >= 0; });
      const out=[];
      if (action==='support') S.apply(s,S.quote(s,rid,{action:'open',actor:actor,cause:'abdication'}));
      cases.forEach(function (row) {
        const person=JSON.parse(JSON.stringify(c)), m=S.constituency(s,rid)[0];
        const request=action==='designate' ? {action:action,actor:actor,candidateId:id} :
          {action:action,actor:{kind:'constituency',realmId:rid,id:m.id},memberId:m.id,candidateId:id,terms:p.terms};
        const q=S.quote(s,rid,request); row[1](); const before=L.snapshot();
        out.push({action:action,case:row[0],rejected:q.allowed && !S.apply(s,q) && !S.quote(s,rid,request).allowed && L.same(before)});
        Object.keys(c).forEach(function (key) { delete c[key]; }); Object.assign(c,person);
      });
      if (!input.admission) return out;
      const request=action==='designate' ? {action:action,actor:actor,candidateId:id} :
        {action:action,actor:{kind:'constituency',realmId:rid,id:'community'},memberId:'community',candidateId:id,terms:p.terms};
      const other=FB.makeCharacter(s,{name:'Other resident',dyn:'Other House',sex:'m',born:s.date.year-25,
        culture:'arabic',religion:'consultation_faith_demo',station:2,role:'notable',quality:1,traitsN:0});
      other.homeProvinceId='consultation_home';
      const prior=S.quote(s,rid,request), admitted=S.apply(s,S.quote(s,rid,L.request(other.id))), before=L.snapshot();
      out.push({action:action,case:'new admission',rejected:admitted && prior.allowed && !S.apply(s,prior) && S.quote(s,rid,request).allowed && L.same(before)});
      return out;
    },{action:action,cases:group.cases,admission:group.admission});
    expect(result).toEqual(group.cases.concat(group.admission ? ['new admission'] : []).map(function (name) {
      return {action:action,case:name,rejected:true};
    }));
  });
}

// The scalar and the structured invalid values each have their own fresh page.
for (const group of [{name:'invalid scalar procedure values',values:[null,0,1,'true']},
  {name:'invalid structured values and unknown procedure members',values:[{},[],'unknown']}])
test(group.name+' reject ordinary imports without publication', async function ({page},info) {
  await storedStart(page,info,'river');
  const result = await page.evaluate(function (args) {
    const mod=args.mod, out=[];
    args.values.forEach(function (bad) {
      const input=JSON.parse(JSON.stringify(mod)), p=input.governmentForms.river_consultation_demo.selectionProfile;
      if (bad==='unknown') p.procedure.extraNomination=true; else p.procedure.livingNomination=bad;
      const bytes=JSON.stringify(input), before=livingTest.snapshot(), faults=FB.mods.validate(input);
      let threw=false; try { FB.mods.apply(input); } catch (error) { threw=true; }
      out.push({faults:faults.length>0,threw:threw,pure:livingTest.same(before),input:bytes===JSON.stringify(input)});
    });
    return out;
  },{mod:river,values:group.values});
  expect(result).toEqual(Array.from({length:group.values.length},function () { return {faults:true,threw:true,pure:true,input:true}; }));
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

test('strict detached restoration rejects forged living nomination bindings', async function ({page},info) {
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
});

// The changed policy replaces the stored river configuration and boots once.
// Its Mods file picker import is covered by the ordinary JSON control cases.
test('changed living nomination policy rejects the original save fingerprint without effects', async function ({page},info) {
  await storedStart(page,info,'river');
  expect(await page.evaluate(function () {return livingTest.admit();})).toBe(true);
  const saved=await page.evaluate(function () { return JSON.parse(FB.save.serialize()); });
  const changed=JSON.parse(JSON.stringify(river));
  changed.governmentForms.river_consultation_demo.selectionProfile.procedure.livingNomination=false;
  await installStoredMod(page,JSON.stringify(changed));
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
