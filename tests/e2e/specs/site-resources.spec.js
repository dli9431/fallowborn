'use strict';
const path = require('path');
const {test,expect} = require('../support/fixture');
const {openGame} = require('../support/game/navigation');
const {beginBookmark} = require('../support/game/bookmark-acceptance');
const {dependsOnRuntime} = require('../support/runtime-dependencies');
const examples = {river:require('../fixtures/authoring/site-resources-river.json'),upland:require('../fixtures/authoring/site-resources-upland.json')};
dependsOnRuntime(__filename,['index.html','data/site_resources.js','data/technology.js','data/political_institutions.js',
  'js/site_resources.js','js/world.js','js/title_ids.js','js/mods.js','js/save.js','js/save_v4.js','js/starts.js',
  'js/main.js','js/bookmark_setup.js','js/lordships.js','js/authority.js','js/politics.js','js/governments.js',
  'js/government_continuity.js','js/government_selection.js','js/home_authority.js','js/ui_modals.js','js/ui_misc.js']);

async function importExample(page,info,name,ruler) {
  await openGame(page,info);
  await page.evaluate(function () { FB.ui.showMods(); });
  await page.locator('#modfile').setInputFiles(path.resolve(__dirname,'../fixtures/authoring/site-resources-' + name + '.json'));
  await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded'}),page.locator('#mod-apply').click()]);
  await page.waitForFunction(function (name) { return window.FB && FB.game && FB.game.bootReady && FBDATA.bookmarks['resource_' + name]; },name);
  if (!ruler) return beginBookmark(page,info,'resource_' + name,'resource_' + name + '_household');
  const full = page.locator('#btn-choose-beginning');
  if (await full.isVisible()) await full.click();
  else await page.getByRole('button',{name:'New Game',exact:true}).click();
  await page.locator('#btn-bm-seed').click();
  await page.locator('#ng-seed').fill('RESOURCECLAIMS-resource_river-resource_river_ruler-resource_quay-m-Ivo_Reed-standard');
  await page.locator('#ng-seed').press('Enter');
  await expect(page.locator('#chargen:not(.hidden)')).toBeVisible();
  await page.getByRole('button',{name:'Begin Your Story',exact:true}).click();
  await page.getByRole('button',{name:'Begin',exact:true}).click();
  await page.evaluate(function () { FB.game.setPaused(true); });
}

for (const name of ['river','upland']) {
  test(name + ' imports typed physical resources without initializing stock or changing other owners',async function ({page},info) {
    await importExample(page,info,name);
    const result = await page.evaluate(function () {
      const s=FB.state,R=FB.siteResources,bm=FB.campaignBookmark(s),before=JSON.stringify(s),data=JSON.stringify(FBDATA),rng=FB.getRngState(),uid=FB.getUidCounter();
      const p=R.compile(bm),rows=R.snapshot(s),again=R.compile(bm);
      return {errors:p.errors,rows:rows,repeat:JSON.stringify(p)===JSON.stringify(again),missing:s.siteResources===undefined,
        pure:before===JSON.stringify(s)&&data===JSON.stringify(FBDATA)&&rng===FB.getRngState()&&uid===FB.getUidCounter(),review:FBDATA.techImpactReviews.features.site_resource_claims.mode};
    });
    expect(result).toMatchObject({errors:[],repeat:true,missing:true,pure:true,review:'none'});
    expect(result.rows).toHaveLength(3);
    expect(result.rows[0]).toMatchObject({kind:'flow',available:name==='river'?12:3,periodDays:name==='river'?7:30});
    expect(result.rows[1]).toMatchObject({kind:'storage',stock:0,available:0,periodDays:null});
    expect(result.rows[2]).toMatchObject({kind:'access',unit:name==='river'?'launching':'grazing'});
  });

  test(name + ' conserves competing reservations and actual source-to-store transfers',async function ({page},info) {
    await importExample(page,info,name);
    const result=await page.evaluate(function () {
      const s=FB.state,R=FB.siteResources,plan=R.compile(FB.campaignBookmark(s)),source=plan.sources[0],store=plan.sources[1];
      const actor=FB.settlementHolder(s,source.countyId,source.slot);
      function q(op,extra) { return R.quote(s,Object.assign({operation:op,sourceId:source.id,actor:actor},extra)); }
      const other=JSON.stringify([s.player,s.realms,s.owner,s.holder,s.chars,s.population,s.buildings,s.armies,s.authority]);
      const empty=R.quote(s,{operation:'reserve',sourceId:store.id,actor:actor,amount:1});
      const a=q('reserve',{amount:2}),b=q('reserve',{amount:2});
      const claim=R.commit(s,a),repeat=R.commit(s,a),competing=R.commit(s,b);
      const transfer=q('transfer',{reservationId:claim,destinationId:store.id});
      const moved=R.commit(s,transfer),again=R.commit(s,transfer);
      const beforeUse=R.snapshot(s),useActor=FB.settlementHolder(s,store.countyId,store.slot);
      const held=R.commit(s,R.quote(s,{operation:'reserve',sourceId:store.id,actor:useActor,amount:1}));
      const used=R.commit(s,R.quote(s,{operation:'consume',sourceId:store.id,actor:useActor,reservationId:held}));
      const afterUse=R.snapshot(s);
      return {empty:empty.allowed,claim:typeof claim==='number',repeat:repeat,competing:competing,moved:moved,again:again,used:used,
        source:beforeUse[0],stored:beforeUse[1].stock,remaining:afterUse[1].stock,
        other:other===JSON.stringify([s.player,s.realms,s.owner,s.holder,s.chars,s.population,s.buildings,s.armies,s.authority])};
    });
    expect(result).toMatchObject({empty:false,claim:true,repeat:false,competing:false,moved:true,again:false,used:true,stored:2,remaining:1,other:true});
    expect(result.source).toMatchObject({consumed:2,reserved:0,available:name==='river'?10:1});
  });

  test(name + ' renews only bounded flow at its declared period without refilling storage or reviving old claims',async function ({page},info) {
    await importExample(page,info,name);
    const result=await page.evaluate(function () {
      const s=FB.state,R=FB.siteResources,p=R.compile(FB.campaignBookmark(s)),a=p.sources[0],to=p.sources[1],actor=FB.settlementHolder(s,a.countyId,a.slot);
      function q(op,extra) {return R.quote(s,Object.assign({operation:op,sourceId:a.id,actor:actor},extra));}
      const first=R.commit(s,q('reserve',{amount:1}));R.commit(s,q('transfer',{reservationId:first,destinationId:to.id}));
      const expired=R.commit(s,q('reserve',{amount:1}));
      s.turn=a.profile.periodDays-1;const last=R.snapshot(s)[0];
      s.turn=a.profile.periodDays;const before=JSON.stringify(s),fresh=R.snapshot(s);
      const pure=before===JSON.stringify(s),lost=R.commit(s,q('consume',{reservationId:expired}));
      const next=R.commit(s,q('reserve',{amount:a.profile.capacity}));
      return {last:last.available,available:fresh[0].available,stock:fresh[1].stock,pure:pure,lost:lost,next:next,expired:expired,
        consumed:s.siteResources.sources[a.id].consumed,reserved:R.snapshot(s)[0].reserved};
    });
    expect(result).toMatchObject({last:(name==='river'?12:3)-2,available:name==='river'?12:3,stock:1,pure:true,lost:false,consumed:0,reserved:name==='river'?12:3});
    expect(result.next).toBeGreaterThan(result.expired);
  });
}

test('release, overdraw, overfull storage and unrelated destinations cannot mint or duplicate capacity',async function ({page},info) {
  await importExample(page,info,'river');
  const result=await page.evaluate(function () {
    const s=FB.state,R=FB.siteResources,actor={kind:'realm',id:'resource_river_court'};
    function reserve(amount) { return R.commit(s,R.quote(s,{operation:'reserve',sourceId:'river_intake',actor:actor,amount:amount})); }
    function end(op,id,to) { const request={operation:op,sourceId:'river_intake',actor:actor,reservationId:id};if(to)request.destinationId=to;return R.commit(s,R.quote(s,request)); }
    const first=reserve(5),moved=end('transfer',first,'river_cistern'),second=reserve(1),before=JSON.stringify(s);
    const full=end('transfer',second,'river_cistern'),other=end('transfer',second,'river_slip'),over=reserve(7);
    const pure=before===JSON.stringify(s),release=end('release',second),repeat=end('release',second);
    const invalid=[0,-1,0.5,1000001,null,'2'].map(function (amount) { const before=JSON.stringify(s);return !reserve(amount)&&before===JSON.stringify(s); });
    return {moved:moved,full:full,other:other,over:over,pure:pure,release:release,repeat:repeat,invalid:invalid,rows:R.snapshot(s)};
  });
  expect(result).toMatchObject({moved:true,full:false,other:false,over:false,pure:true,release:true,repeat:false,invalid:Array(6).fill(true)});
  expect(result.rows[0]).toMatchObject({available:7,consumed:5,reserved:0});
  expect(result.rows[1]).toMatchObject({stock:5});
});

test('a permitted existing office is exact, current, scoped and independent of owning the court',async function ({page},info) {
  await importExample(page,info,'upland');
  const result=await page.evaluate(function () {
    const s=FB.state,R=FB.siteResources,actor={kind:'character',id:s.player.charId};
    const request={operation:'reserve',sourceId:'upland_fold',actor:actor,amount:1};
    const absent=R.quote(s,request).allowed;
    const appointed=FB.authorityAppoint(s,{officeId:'resource_keeper',institutionId:'resource_fold_court',appointer:{kind:'realm',id:'resource_fold_court'},holder:actor,scope:{kind:'county',id:'resource_fold'},endTurn:10});
    const original=JSON.parse(JSON.stringify(s));
    const changes=[function(t){t.turn=10;},function(t){t.authority.appointments.find(function(a){return a.id===appointed.id;}).status='removed';},
      function(t){t.authority.appointments.find(function(a){return a.id===appointed.id;}).scope.id='resource_hill';},
      function(t){t.authority.appointments.find(function(a){return a.id===appointed.id;}).appointerGeneration++;},
      function(t){t.chars[t.player.charId].imprisoned=true;},function(t){t.chars[t.player.charId].dead=true;},
      function(t){t.holder.resource_fold='resource_hill_court';}];
    const checks=changes.map(function(change){const t=JSON.parse(JSON.stringify(original)),q=R.quote(t,request);change(t);const before=JSON.stringify(t);
      return q.allowed&&!R.commit(t,q)&&!R.quote(t,request).allowed&&before===JSON.stringify(t);});
    const q=R.quote(s,request),committed=R.commit(s,q);
    return {absent:absent,appointed:!!appointed,allowed:q.allowed,committed:typeof committed==='number',checks:checks};
  });
  expect(result).toEqual({absent:false,appointed:true,allowed:true,committed:true,checks:Array(7).fill(true)});
});

test('capture, custody, time and competing source changes invalidate reviewed holder claims',async function ({page},info) {
  await importExample(page,info,'river',true);
  const result=await page.evaluate(function () {
    const s=FB.state,R=FB.siteResources,request={operation:'reserve',sourceId:'river_intake',actor:{kind:'realm',id:'player'},amount:2};
    const changes=[function(t){t.turn++;},function(t){t.chars[t.player.charId].captive=true;},function(t){t.chars[t.player.charId].dead=true;},
      function(t){delete t.owner.resource_quay;delete t.holder.resource_quay;},
      function(t){R.commit(t,R.quote(t,Object.assign({},request,{amount:1})));}];
    const rows=changes.map(function(change){const t=JSON.parse(JSON.stringify(s)),q=R.quote(t,request);change(t);const before=JSON.stringify(t),rng=FB.getRngState(),uid=FB.getUidCounter();
      return q.allowed&&!R.commit(t,q)&&before===JSON.stringify(t)&&rng===FB.getRngState()&&uid===FB.getUidCounter();});
    return rows;
  });
  expect(result).toEqual(Array(5).fill(true));
});

test('new realm generations cannot inherit reservations and dead original people remain historical save references',async function ({page},info) {
  await importExample(page,info,'upland');
  const result=await page.evaluate(function () {
    const s=FB.state,R=FB.siteResources,actor={kind:'realm',id:'resource_hill_court'};
    const held=R.commit(s,R.quote(s,{operation:'reserve',sourceId:'upland_roof',actor:actor,amount:2}));
    const request={operation:'consume',sourceId:'upland_roof',actor:actor,reservationId:held},review=R.quote(s,request);
    const claim=s.siteResources.sources.upland_roof.reservations[0];
    s.realms.resource_hill_court.ruler.generation=FB.realmRulerGeneration(s,'resource_hill_court')+1;
    const before=JSON.stringify(s),generation=!R.quote(s,request).allowed&&!R.commit(s,review)&&before===JSON.stringify(s);
    s.chars[claim.characterId].dead=true;
    const deceased=JSON.stringify(s);R.validate(s);
    return {generation:generation,retained:deceased===JSON.stringify(s),amount:s.siteResources.sources.upland_roof.reservations[0].amount,
      unavailable:!R.quote(s,request).allowed};
  });
  expect(result).toEqual({generation:true,retained:true,amount:2,unavailable:true});
});

test('detached imports reject malformed capacities, sites, rights, aliases and source graphs without publication',async function ({page},info) {
  await openGame(page,info);
  const result=await page.evaluate(function (example) {
    const before=JSON.stringify([FBDATA,FB.state,localStorage]),rng=FB.getRngState(),uid=FB.getUidCounter(),sig=FB.mods.sig();
    const changes=[function(m){m.siteResourceProfiles.river_flow.capacity=-1;},function(m){m.siteResourceProfiles.river_flow.capacity=0.5;},
      function(m){m.siteResourceProfiles.river_flow.periodDays=0;},function(m){m.siteResourceProfiles.river_store.periodDays=7;},
      function(m){m.siteResourceProfiles.river_flow.unit='grazing';},function(m){m.siteResourceProfiles.river_flow.extra=true;},
      function(m,a){a[0].siteId='resource_cistern';},function(m,a){a[0].countyId='resource_rocks';},
      function(m,a){a.push(JSON.parse(JSON.stringify(a[0])));},function(m,a){const row=JSON.parse(JSON.stringify(a[0]));row.id='second_intake';a.push(row);},
      function(m,a){a[0].rights={kind:'holder',officeId:'imperial_office'};},function(m,a){a[0].rights={kind:'permission',institutionId:'resource_river_court',officeId:'missing'};},
      function(m,a){a[0].suitability={source:false};},function(m,a){a[1].connectedSourceId='missing';},
      function(m,a){a[1].connectedSourceId=a[1].id;},function(m,a){a[1].connectedSourceId=a[2].id;},
      function(m,a){a[1].stock=3;},function(m){m.siteResourceProfiles=[];},
      function(m,a){m.geographies.resource_river_land.sites.resource_cistern={x:1.5,y:2};},
      function(m,a){a[1].rights=[{kind:'holder'},{kind:'permission'}];}];
    const errors=changes.map(function(change){const m=JSON.parse(JSON.stringify(example)),a=m.bookmarks.resource_river.revisions.supplied.siteResourceAssignments;change(m,a);return FB.mods.validate(m);});
    const valid=FB.mods.validate(example);
    return {errors:errors,valid:valid,pure:before===JSON.stringify([FBDATA,FB.state,localStorage])&&rng===FB.getRngState()&&uid===FB.getUidCounter()&&sig===FB.mods.sig()};
  },examples.river);
  expect(result.valid).toEqual([]);expect(result.pure).toBe(true);
  result.errors.forEach(function(errors){expect(errors.join(' ')).toMatch(/siteResource/);});
});

test('matching restore retains used capacity, empty stores, unique claims and consumed review revisions',async function ({page},info) {
  await importExample(page,info,'river');
  const result=await page.evaluate(function () {
    const s=FB.state,R=FB.siteResources,request={operation:'reserve',sourceId:'river_intake',actor:{kind:'realm',id:'resource_river_court'},amount:3};
    const q=R.quote(s,request),held=R.commit(s,q);R.commit(s,R.quote(s,Object.assign({},request,{amount:1})));
    const use=R.quote(s,{operation:'consume',sourceId:request.sourceId,actor:request.actor,reservationId:held});R.commit(s,use);
    const original=JSON.stringify(s.siteResources),before=JSON.stringify(s),rng=FB.getRngState(),uid=FB.getUidCounter();
    const changes=[function(r){r.version=2;},function(r){r.extra=true;},function(r){r.definition='changed';},function(r){r.nextId=1;},
      function(r){r.sources.river_intake.consumed=13;},function(r){r.sources.river_intake.stock=1;},function(r){r.sources.river_intake.period=1;},
      function(r){r.sources.river_intake.reservations[0].amount=12;},function(r){r.sources.river_intake.reservations[0].characterId='missing';},
      function(r){r.sources.river_intake.reservations[0].generation++;},
      function(r){r.sources.river_intake.reservations.push(r.sources.river_intake.reservations[0]);},
      function(r){r.sources.missing=r.sources.river_intake;},function(r){r.sources.river_intake.profileId='river_store';}];
    const rejected=changes.map(function(change){const t=JSON.parse(JSON.stringify(s));change(t.siteResources);const source=JSON.stringify(t);
      try{FB.save.v4.validatePlatform(t);return false;}catch(error){return /site resource/.test(error.message)&&source===JSON.stringify(t);}});
    const pure=before===JSON.stringify(s)&&rng===FB.getRngState()&&uid===FB.getUidCounter();
    FB.save.restore(JSON.parse(FB.save.serialize()));
    const same=original===JSON.stringify(FB.state.siteResources),repeat=R.commit(FB.state,use);
    const legacy=JSON.parse(JSON.stringify(FB.state));delete legacy.siteResources;FB.save.v4.validatePlatform(legacy);
    return {rejected:rejected,pure:pure,same:same,repeat:repeat,legacy:legacy.siteResources===undefined,empty:R.snapshot(FB.state)[1].stock};
  });
  expect(result).toEqual({rejected:Array(13).fill(true),pure:true,same:true,repeat:false,legacy:true,empty:0});
});

test('replayed same-seed campaigns retain exact resource, population and identity facts without a new opening grant',async function ({page},info) {
  await importExample(page,info,'upland');
  async function facts() {
    return page.evaluate(function () {
      const s=FB.state,R=FB.siteResources,request={operation:'reserve',sourceId:'upland_roof',actor:{kind:'realm',id:'resource_hill_court'},amount:2};
      const fresh=s.siteResources===undefined,id=R.commit(s,R.quote(s,request));
      R.commit(s,R.quote(s,{operation:'transfer',sourceId:request.sourceId,actor:request.actor,reservationId:id,destinationId:'upland_tank'}));
      return {fresh:fresh,facts:JSON.stringify([s.siteResources,s.population,s.chars,s.buildings,s.owner,s.holder]),rng:FB.getRngState()>>>0,uid:FB.getUidCounter()};
    });
  }
  const first=await facts();
  await beginBookmark(page,info,'resource_upland','resource_upland_household');
  expect(await facts()).toEqual(first);
});

test('whole revisions retain absent and empty resource declarations and released worlds stay unopted',async function ({page},info) {
  await importExample(page,info,'river');
  const result=await page.evaluate(function () {
    const R=FB.siteResources;
    return {baseline:R.compile(FB.bookmark('resource_river','baseline')),dry:R.compile(FB.bookmark('resource_river','dry')),
      released:['867','1066'].map(function(id){return R.compile(FB.bookmark(id));})};
  });
  expect(result.baseline).toEqual({sources:[],errors:[]});expect(result.dry).toEqual(result.baseline);
  expect(result.released).toEqual([result.baseline,result.baseline]);
});

test('changed resource content changes the exact mod fingerprint and rejects a previous save without adoption',async function ({page},info) {
  await importExample(page,info,'river');
  const result=await page.evaluate(function (source) {
    const saved=JSON.parse(FB.save.serialize()),signature=FB.mods.sig(),changed=JSON.parse(JSON.stringify(source));
    changed.siteResourceProfiles.river_flow.capacity++;
    FB.mods.apply(changed);
    const before=JSON.stringify(FB.state),rng=FB.getRngState(),uid=FB.getUidCounter();
    let rejected=false;
    try{FB.save.restore(saved);}catch(error){rejected=/different mod/.test(error.message);}
    return {changed:signature!==FB.mods.sig(),mismatch:FB.save.otherWorld(saved),rejected:rejected,
      pure:before===JSON.stringify(FB.state)&&rng===FB.getRngState()&&uid===FB.getUidCounter()};
  },examples.river);
  expect(result).toEqual({changed:true,mismatch:true,rejected:true,pure:true});
});

for (const viewport of [{width:1280,height:800},{width:390,height:844}]) {
test(viewport.width + 'px settlement resource reviews retain amount and focus through Back and Escape and commit only on confirmation',async function ({page},info) {
  await page.setViewportSize(viewport);
  await importExample(page,info,'river',true);
  await page.evaluate(function(){FB.ui.closeModal();FB.ui.showSettlement('resource_quay',0);});
  await page.locator('#settlement-resources').click();
  await page.locator('#resource-amount-river_intake').fill('2');
  await page.locator('#resource-amount-river_intake').press('Tab');
  await page.locator('[data-resource-review="0"]').click();
  await expect(page.locator('#gm-title')).toContainText('Review allocation');
  expect(await page.evaluate(function(){return FB.state.siteResources===undefined;})).toBe(true);
  await page.keyboard.press('Escape');
  await expect(page.locator('#resource-amount-river_intake')).toHaveValue('2');
  await expect(page.locator('[data-resource-review="0"]')).toBeFocused();
  await page.locator('[data-resource-review="0"]').click();
  await page.locator('#resource-confirm').click();
  expect(await page.evaluate(function(){return FB.siteResources.snapshot(FB.state)[0].reserved;})).toBe(2);
  await page.locator('#gm-cancel').click();
  await expect(page.locator('#settlement-resources')).toBeFocused();
});
}
