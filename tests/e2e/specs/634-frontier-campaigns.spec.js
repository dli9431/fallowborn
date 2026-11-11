'use strict';
const fs = require('fs');
const path = require('path');
const {test,expect} = require('../support/fixture');
const {openGame,prepareGameContent} = require('../support/game/navigation');
const {beginBookmarkFromTitle,restoreBookmark} = require('../support/game/bookmark-acceptance');
const {dependsOnRuntime} = require('../support/runtime-dependencies');

dependsOnRuntime(__filename,['data/bookmark_manifest.js','index.html','data/bookmark_634.js','data/bookmark_634_campaigns.js',
  'data/story_campaigns_634.js','data/bookmark_634_courts.js','data/bookmark_634_identities.js',
  'data/bookmark_634_scaffold_d.js','data/story_campaigns.js','data/story_courts_476.js','data/bookmark_476_gaul_iberia.js',
  'data/starts_634_rulers.js','data/bookmark_sources.js','data/technology.js',
  'js/story_campaign.js','js/stories.js','js/starts.js','js/actions.js','js/wars.js','js/world.js',
  'js/government_selection.js','js/government_lineage.js','js/government_aristocracy.js',
  'js/governments.js','js/politics.js','js/bookmark_composition.js','js/bookmark_sources.js',
  'js/armies.js','js/save.js','js/save_v4.js','js/mods.js']);

async function load(page,info) {
  await openGame(page,info); await prepareGameContent(page);
  expect(await page.evaluate(function () {
    return FB.bookmark('634') ? FB.validateBookmark(FB.bookmark('634','core_courts_v4')) : FB.bookmarkRuntimeDiagnostics();
  })).toEqual([]);
}
async function start(page,info,id,imported,afterInitialization) {
  await load(page,info);
  if (imported) {
    const fixture=JSON.parse(fs.readFileSync(path.join(__dirname,'../fixtures/authoring/frontier-campaigns.json'),'utf8'));
    const mod=await page.evaluate(function (m) {
      const b=JSON.parse(JSON.stringify(FBDATA.bookmarks['634']));
      b.revision='core_courts_v4'; b.revisions.core_courts_v4.hidden=false;
      b.revisions.core_courts_v4.stories=b.revisions.core_courts_v4.stories.concat(Object.keys(m.storyInstances));
      m.bookmarks={'634':b}; return m;
    },fixture);
    expect(await page.evaluate(function (m) { return FB.mods.validate(m); },mod)).toEqual([]);
    await page.evaluate(function () { FB.ui.showMods(); });
    await page.locator('#modfile').setInputFiles({name:'frontier-campaigns.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(mod),'utf8')});
    await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded'}),page.locator('#mod-apply').click()]);
    await prepareGameContent(page);
  }
  await page.evaluate(function () {
    // Review visibility in this isolated context only.
    FBDATA.bookmarks['634'].revision='core_courts_v4';
    FBDATA.bookmarks['634'].revisions.core_courts_v4.hidden=false;
  });
  if (!id || id==='farmer_634') await beginBookmarkFromTitle(page,'634','farmer_634');
  else {
    if (afterInitialization) await page.evaluate(function (phase) {
      const adopt=FB.adoptStartingRealm;
      FB.adoptStartingRealm=function (s,scenario,options) {
        FB.adoptStartingRealm=adopt;
        // Stage the real original court before its ordinary adoption. This
        // exercises the same supported entry point with existing story facts.
        const original=s.start.rulerRealmId; delete s.start.rulerRealmId;
        FB.stories.start(s,{});
        const id='syrian_front_634',d=FB.stories.get(id).declaration;
        if (phase==='started') {
          const nb=Object.keys(FB.world.adj.damascus).sort().find(function (p) { return !FB.world.byId[p].wasteland; });
          FB.transferProvince(s,nb,d.actor.realmId);
          const r=FB.governmentSelection.state(s,d.actor.realmId);
          if (r && r.recognition) r.recognition.consents=FB.governmentSelection.constituency(s,d.actor.realmId).filter(function (m) { return m.active; }).map(function (m) { return m.id; });
          FB.stories.get(id).day(s,s.stories[id]);
          if (s.stories[id].phase!=='started') throw new Error('Staged original court could not declare.');
        }
        window.beforeAdoption=JSON.parse(JSON.stringify(s.stories[id]));
        if (original!==undefined) s.start.rulerRealmId=original;
        return adopt(s,scenario,options);
      };
    },afterInitialization);
    const code=await page.evaluate(function (id) {
      const row=FBDATA.startScenarios.find(function (r) { return r.id===id; }); row.hidden=false;
      const p=FB.startIdentity(row,FB.bookmark('634'));
      return 'FRONTIER-634-'+id+'-'+row.fixedProvinceId+'-m-'+row.characterName+'-standard-0-'+p.startCulture+'.'+p.startReligion;
    },id);
    const full=page.locator('#btn-choose-beginning');
    if (await full.isVisible()) await full.click();
    else await page.getByRole('button',{name:'New Game',exact:true}).click();
    await page.locator('#btn-bm-seed').click(); await page.locator('#ng-seed').fill(code); await page.locator('#ng-seed').press('Enter');
    await expect(page.locator('#chargen:not(.hidden)')).toBeVisible();
    await page.getByRole('button',{name:'Begin Your Story',exact:true}).click();
    await page.getByRole('button',{name:'Begin',exact:true}).click();
  }
  await page.evaluate(function () {
    FB.game.setPaused(true);
    window.FT={
      copy:function (value) { return JSON.parse(JSON.stringify(value)); },
      def:function (s,id) { return FB.stories.definition(s,FB.stories.get(id).declaration); },
      tick:function (s,id) { FB.stories.get(id).day(s,s.stories[id]); },
      border:function (s,id) {
        const d=FT.def(s,id),p=d.target.provinceId;
        const nb=Object.keys(FB.world.adj[p] || {}).sort().find(function (pid) { return FB.world.byId[pid] && !FB.world.byId[pid].wasteland; });
        if (!nb) throw new Error('The staged objective needs a real inhabited neighbor.');
        FB.transferProvince(s,nb,d.actor.realmId); return nb;
      },
      consent:function (s,rid) {
        const record=FB.governmentSelection.state(s,rid);
        if (record && record.recognition) record.recognition.consents=FB.governmentSelection.constituency(s,rid).filter(function (m) { return m.active; }).map(function (m) { return m.id; });
      },
      allow:function (s,id) { FT.border(s,id); FT.consent(s,FT.def(s,id).actor.realmId); },
      choose:function (s,id,choice) { return FB.stories.apply(s,id,choice,FB.stories.quote(s,id,choice)); },
      clone:function () { const s=FT.copy(FB.state); FB.invalidateRealmCache(); return s; },
      bytes:function (s) { return JSON.stringify([s,FB.getRngState(),FB.getUidCounter()]); }
    };
  });
}
function savedFacts() {
  const e=JSON.parse(FB.save.serialize()),s=FB.save.expandedSnapshot(e.state);
  return {mods:e.mods,rng:e.rng>>>0,uid:e.uid,
    facts:JSON.stringify([s.start,s.player,s.date,s.turn,s.owner,s.holder,s.realms,s.chars,
      s.stories,s.wars,s.warHistory,s.authority,s.governmentSelection,s.governmentRecognition,s.log])};
}
async function roundTrip(page) {
  const before=await page.evaluate(savedFacts),text=await page.evaluate(function () { return FB.save.serialize(); });
  await restoreBookmark(page,text); const first=await page.evaluate(savedFacts);
  expect(first.mods).toBe(before.mods); expect(first.rng).toBe(before.rng); expect(first.uid).toBe(before.uid);
  expect(first.facts===before.facts,'All campaign facts survive the first restore exactly').toBe(true);
  await restoreBookmark(page,await page.evaluate(function () { return FB.save.serialize(); }));
  const second=await page.evaluate(savedFacts);
  expect(second.mods).toBe(before.mods); expect(second.rng).toBe(before.rng); expect(second.uid).toBe(before.uid);
  expect(second.facts===before.facts,'All campaign facts survive re-save and second restore exactly').toBe(true);
}

test('only the hidden assembled revision attaches two independent district opportunities',async function ({page},info) {
  await load(page,info);
  expect(await page.evaluate(function () {
    const b=FB.bookmark('634','core_courts_v4'),old=FB.bookmark('634');
    const defs=['syrian_front_634','iraqi_front_634'].map(function (id) { return FB.stories.get(id).declaration; });
    return {fresh:old.revision,hidden:b.hidden,available:FB.bookmarkAvailable('634'),
      older:FB.bookmarkRevisions('634').filter(function (r) { return r.revision!=='core_courts_v4'; }).every(function (r) {
        return !r.stories.some(function (id) { return /^(syrian|iraqi)_front_634$/.test(id); });
      }),sameOpening:JSON.stringify(b.provinces)===JSON.stringify(old.provinces),
      targets:defs.map(function (d) { return [d.id,d.actor.realmId,d.target.provinceId,d.target.ownerIds,d.durationDays,d.requires,d.conditions,!!d.news]; }),
      owners:['damascus','kufa'].map(function (id) { return b.provinces.find(function (p) { return p.id===id; }).realm; }),
      attached:defs.every(function (d) { return b.stories.filter(function (id) { return id===d.id; }).length===1; }),
      tech:['campaign_ordinary_admission','period_634_syrian_front','period_634_iraqi_front'].map(function (id) { return FBDATA.techImpactReviews.features[id].mode; }),
      excluded:!FBDATA.startScenarios.some(function (r) { return /yazdegerd|jabala/.test(r.id); })};
  })).toEqual({fresh:'core_identities_v3',hidden:true,available:true,older:true,sameOpening:true,
    targets:[['syrian_front_634','rashidun_634','damascus',['byzantium_634'],360,[],[],false],
      ['iraqi_front_634','rashidun_634','kufa',['sasanian_634'],180,[],[],false]],
    owners:['byzantium_634','sasanian_634'],attached:true,tech:['none','none','none'],excluded:true});
  await beginBookmarkFromTitle(page,'634','farmer_634');
  expect(await page.evaluate(function () { return ['syrian_front_634','iraqi_front_634'].every(function (id) { return !FB.state.stories[id]; }); })).toBe(true);
});

test('Umar may decline one front and commit to the other with ordinary aggression costs',async function ({page},info) {
  await start(page,info,'umar_634');
  expect(await page.evaluate(function () {
    const s=FB.state,id='iraqi_front_634',other='syrian_front_634'; FT.allow(s,id);
    const before=FT.bytes(s),q=FB.stories.quote(s,id,'face_campaign'),pure=before===FT.bytes(s);
    const review=FB.stories.get(id).review(s,s.stories[id],'face_campaign',q);
    const declined=FT.choose(s,other,'leave_campaign');
    const owners=JSON.stringify(s.owner),faiths=JSON.stringify(s.population),gold=s.player.gold;
    const prestige=s.player.prestige,publicGold=s.realms.player.treasury.gold;
    const accepted=FT.choose(s,id,'face_campaign'),r=s.stories[id],w=FB.ordinaryWarById(s,r.warId);
    return {allowed:q.allowed,pure:pure,
      reviewedCosts:review.indexOf(FB.T('Prestige: {change}.',{change:q.facts.admission.costs.aggression.prestigeChange}))>=0 &&
        review.some(function (line) { return line.indexOf('180')>=0; }) && review.indexOf(FB.T('War hostility adds a Standing change of {change} with the opposing court, ending at {after}.',
          {change:q.facts.admission.costs.enemyStanding.change,after:q.facts.admission.costs.enemyStanding.after}))>=0,
      declined:declined,accepted:accepted,
      retry:FT.choose(s,id,'face_campaign'),other:s.stories[other].reason,phase:r.phase,
      alias:!s.realms.rashidun_634 && w.attacker==='player',defender:w.defender,cause:w.casus.type,
      deadline:r.deadline===r.startedTurn+180,owner:owners===JSON.stringify(s.owner),faith:faiths===JSON.stringify(s.population),
      gold:s.player.gold===gold && s.realms.player.treasury.gold===publicGold,
      prestige:s.player.prestige-prestige,count:FB.aggressionDeclarationCount(s,'player'),
      support:FB.countyPopularSupport(s,'medina'),alive:!s.chars[s.player.charId].dead && !FB.realmRulerCharacterSnapshot(s,'sasanian_634').dead};
  })).toMatchObject({allowed:true,pure:true,reviewedCosts:true,declined:true,accepted:true,retry:false,other:'player_declined',phase:'started',
    alias:true,defender:'sasanian_634',cause:'aggression',deadline:true,owner:true,faith:true,gold:true,prestige:-20,count:1,alive:true});
  await roundTrip(page);
});

test('pending boundaries, stale quotes and refused registration spend no commitment or political cost',async function ({page},info) {
  await start(page,info,'umar_634');
  expect(await page.evaluate(function () {
    const s=FB.state,id='syrian_front_634'; FT.allow(s,id);
    const base=FT.copy(s),checks=[];
    function denied(edit) {
      const t=FT.copy(base); FB.invalidateRealmCache(); edit(t);
      const before=FT.bytes(t),q=FB.stories.quote(t,id,'face_campaign'); FT.tick(t,id);
      checks.push(!q.allowed && t.stories[id].startedTurn===null && before===FT.bytes(t));
    }
    denied(function (t) { t.pacts=t.pacts || {}; t.pacts.byzantium_634=t.turn+10; });
    denied(function (t) { t.truces=t.truces || {}; t.truces[JSON.stringify(['byzantium_634','player'])]=t.turn+10; });
    denied(function (t) { FB.formAlliance(t,'player','byzantium_634','diplomacy'); });
    denied(function (t) { const r=FB.governmentSelection.state(t,'player'); r.recognition.consents=[]; });
    denied(function (t) { t.player.flags.in_prison=1; });
    denied(function (t) { t.chars[FB.realmRulerCharacterSnapshot(t,'byzantium_634').id].dead=true; });
    const register=FB.registerOrdinaryWar,unchanged=FT.bytes(s),q=FB.stories.quote(s,id,'face_campaign');
    let refused;
    try {
      FB.registerOrdinaryWar=function () { return null; };
      refused=!FB.stories.apply(s,id,'face_campaign',q) && unchanged===FT.bytes(s);
    } finally { FB.registerOrdinaryWar=register; }
    s.date={year:635,season:3,day:89}; s.turn=628;
    const last=FB.stories.quote(s,id,'face_campaign');
    s.date.day=90;
    const cutoff=!FB.stories.quote(s,id,'face_campaign').allowed && !FB.stories.apply(s,id,'face_campaign',last);
    FT.tick(s,id); const closed=FT.copy(s.stories[id]); s.date={year:636,season:0,day:1}; FT.tick(s,id);
    return {checks:checks,allowed:q.allowed,refused:refused,last:last.allowed,cutoff:cutoff,
      closed:closed.reason,unspent:closed.startedTurn===null,unchanged:JSON.stringify(closed)===JSON.stringify(s.stories[id])};
  })).toEqual({checks:Array(6).fill(true),allowed:true,refused:true,last:true,cutoff:true,closed:'window_closed',unspent:true,unchanged:true});
  await roundTrip(page);
});

test('AI admission waits for actual permission and rejected starts retain the whole duration',async function ({page},info) {
  await start(page,info);
  expect(await page.evaluate(function () {
    const s=FB.state,id='iraqi_front_634'; FT.allow(s,id);
    const base=FT.copy(s),checks=[];
    function wait(edit) {
      const t=FT.copy(base); FB.invalidateRealmCache(); edit(t);
      const before=FT.bytes(t); FT.tick(t,id);
      checks.push(before===FT.bytes(t) && t.stories[id].deadline===null);
    }
    wait(function (t) { FB.governmentSelection.state(t,'rashidun_634').recognition.consents=[]; });
    wait(function (t) { t.truces=t.truces || {}; t.truces[JSON.stringify(['rashidun_634','sasanian_634'])]=t.turn+1; });
    wait(function (t) { FB.formAlliance(t,'rashidun_634','sasanian_634','diplomacy'); });
    wait(function (t) { t.chars[FB.realmRulerCharacterSnapshot(t,'rashidun_634').id].dead=true; });
    const register=FB.registerOrdinaryWar,before=FT.bytes(s);
    let atomic;
    try { FB.registerOrdinaryWar=function () { return null; }; FT.tick(s,id); atomic=before===FT.bytes(s); }
    finally { FB.registerOrdinaryWar=register; }
    s.turn=20; FT.tick(s,id);
    const r=s.stories[id],war=FB.ordinaryWarById(s,r.warId);
    return {checks:checks,atomic:atomic,started:r.startedTurn,deadline:r.deadline,
      cause:war.casus.type,actor:war.attacker,count:FB.aggressionDeclarationCount(s,'rashidun_634'),
      other:s.stories.syrian_front_634.phase,owner:s.owner.kufa};
  })).toEqual({checks:Array(4).fill(true),atomic:true,started:20,deadline:200,cause:'aggression',actor:'rashidun_634',count:1,
    other:'pending',owner:'sasanian_634'});
  await roundTrip(page);
});

for (const id of ['syrian_front_634','iraqi_front_634']) test(id+' observes control, court continuity and ordinary war endings',async function ({page},info) {
  await start(page,info);
  expect(await page.evaluate(function (id) {
    const s=FB.state,d=FT.def(s,id),rid=d.actor.realmId,enemy=s.owner[d.target.provinceId],county=d.target.provinceId;
    const other=enemy==='sasanian_634'?'byzantium_634':'sasanian_634'; FT.allow(s,id);
    const pending=FT.copy(s),cases={};
    function pendingResult(name,edit) { const t=FT.copy(pending); FB.invalidateRealmCache(); edit(t); FT.tick(t,id); cases[name]=t.stories[id].reason; }
    pendingResult('held',function (t) { FB.transferProvince(t,county,rid); });
    pendingResult('third',function (t) { FB.transferProvince(t,county,other); });
    pendingResult('extinct',function (t) { t.realms[rid].alive=false; });
    pendingResult('lost',function (t) { t.realms[enemy].alive=false; });
    // A holder within the same sovereign never becomes an invented opponent.
    const subordinate=Object.keys(s.realms).find(function (r) { return s.realms[r].alive && r!==rid && r!==enemy; });
    const held=FT.copy(pending); held.realms[subordinate].liege=enemy; held.holder[county]=subordinate;
    FB.invalidateRealmCache(); FT.tick(held,id);
    cases.holder=FB.ordinaryWarById(held,held.stories[id].warId).defender===enemy;
    // A lawful current successor may commit before the story stamps authority.
    const successor=FT.copy(pending),old=FB.realmRulerCharacterSnapshot(successor,rid);
    const next=FB.makeCharacter(successor,{sex:'m',born:600,culture:old.culture,religion:old.religion,homeProvinceId:'medina'});
    FB.assignRealmRulerCharacter(successor,rid,next.id,{replaceAuthored:true});
    const recognition=FB.governmentSelection.state(successor,rid).recognition;
    recognition.generation=FB.realmRulerGeneration(successor,rid);
    recognition.memberId=successor.realms[rid].succession.rulerMemberId;
    FT.tick(successor,id); cases.precommit=successor.stories[id].actorId===next.id &&
      successor.stories[id].actorGeneration===FB.realmRulerGeneration(successor,rid);
    FT.tick(s,id); const started=FT.copy(s),deadline=s.stories[id].deadline;
    function result(name,edit) { const t=FT.copy(started); FB.invalidateRealmCache(); edit(t); FT.tick(t,id); cases[name]=t.stories[id].reason; }
    result('ended',function (t) { FB.settleOrdinaryWar(t,t.stories[id].warId,'white_peace'); });
    result('timeout',function (t) { t.turn=deadline; });
    result('succession',function (t) { t.realms[rid].ruler.generation++; t.realms[rid].succession.rulerGeneration++; });
    result('death',function (t) { t.chars[t.stories[id].actorId].dead=true; });
    result('diversion',function (t) { FB.transferProvince(t,county,other); });
    result('defender',function (t) { t.realms[enemy].ruler.generation++; t.realms[enemy].succession.rulerGeneration++; });
    result('beforeDeadline',function (t) { t.turn=deadline-1; t.date={year:636,season:0,day:1}; });
    result('won',function (t) {
      FB.transferProvince(t,county,rid); t.turn=deadline;
      t.realms[rid].ruler.generation++; t.realms[rid].succession.rulerGeneration++;
    });
    s.turn=deadline; FT.tick(s,id); const warStillActive=!!FB.ordinaryWarById(s,s.stories[id].warId);
    return {cases:cases,warStillActive:warStillActive,owner:s.owner[county],other:s.stories[id==='syrian_front_634'?'iraqi_front_634':'syrian_front_634'].phase};
  },id)).toEqual({cases:{held:'already_held',third:'target_changed',extinct:'actor_extinct',lost:'target_lost',holder:true,precommit:true,
    ended:'campaign_ended',timeout:'campaign_timeout',succession:'authority_lost',death:'authority_lost',diversion:'third_party_control',
    defender:null,beforeDeadline:null,won:'objective_held'},warStillActive:true,owner:id==='syrian_front_634'?'byzantium_634':'sasanian_634',other:'pending'});
  await roundTrip(page);
});

test('Heraclius can decline, and defender adoption after initialization preserves the same commitment',async function ({page},info) {
  await start(page,info,'heraclius_634');
  expect(await page.evaluate(function () {
    const s=FB.state,id='syrian_front_634'; FT.allow(s,id);
    const before=JSON.stringify([s.owner,s.player.gold,s.realms.player.treasury,s.wars]);
    const q=FB.stories.quote(s,id,'face_campaign'),declined=FT.choose(s,id,'leave_campaign');
    return {party:q.allowed,declined:declined,reason:s.stories[id].reason,
      unchanged:before===JSON.stringify([s.owner,s.player.gold,s.realms.player.treasury,s.wars]),other:s.stories.iraqi_front_634.phase};
  })).toEqual({party:true,declined:true,reason:'player_declined',unchanged:true,other:'pending'});
  await roundTrip(page);
});

for (const court of ['umar_634','heraclius_634']) for (const phase of ['pending','started']) {
  test(court+' adoption after '+phase+' initialization preserves original court continuity',async function ({page},info) {
    await start(page,info,court,false,phase);
    expect(await page.evaluate(function (input) {
      const s=FB.state,id='syrian_front_634',before=window.beforeAdoption,rec=s.stories[id];
      const wanted=FT.copy(before);
      if (input.court==='heraclius_634' && wanted.targetOwnerId) wanted.targetOwnerId='player';
      const same=JSON.stringify(wanted)===JSON.stringify(rec),w=rec.warId && FB.ordinaryWarById(s,rec.warId);
      const exact=FT.bytes(s); FB.remapWarRealm(s,s.start.rulerRealmId,'player');
      const remapOnce=exact===FT.bytes(s);
      FB.stories.start(s,{});
      const notReset=JSON.stringify(wanted)===JSON.stringify(s.stories[id]);
      if (input.phase==='started') FT.tick(s,id);
      return {same:same,notReset:notReset,remapOnce:remapOnce,phase:rec.phase,
        actor:input.phase==='started' ? w.attacker : FT.def(s,id).actor.realmId,
        target:input.phase==='started' ? w.defender : FT.def(s,id).target.ownerIds[0],
        generation:rec.actorGeneration===null || rec.actorGeneration===FB.realmRulerGeneration(s,FT.def(s,id).actor.realmId)};
    },{court:court,phase:phase})).toEqual({same:true,notReset:true,remapOnce:true,phase:phase,
      actor:court==='umar_634'?'player':'rashidun_634',target:court==='heraclius_634'?'player':'byzantium_634',generation:true});
    await roundTrip(page);
  });
}

test('real JSON policies retain independent authority, duration, exact definitions and atomic rejection',async function ({page},info) {
  await start(page,info,'farmer_634',true);
  expect(await page.evaluate(function () {
    const s=FB.state,id='eastern_counterfront'; FT.allow(s,id);
    const steward=FB.aristocracy.state(s,'sasanian_634').regency.stewardId;
    s.chars[steward].imprisoned=true;
    const before=FT.bytes(s); FT.tick(s,id); const waiting=before===FT.bytes(s);
    delete s.chars[steward].imprisoned;
    // This frontier attacks an adult foreign court. The young actor needs its
    // existing steward; no defender assent or age veto is manufactured.
    const ready=FB.governments.publicAuthorityReadiness(s,'sasanian_634');
    FT.tick(s,id); const r=s.stories[id],w=FB.ordinaryWarById(s,r.warId);
    const rejects=[],original=JSON.stringify([FBDATA,FB.state,FB.getRngState(),FB.getUidCounter(),localStorage]);
    const def=FT.copy(FB.stories.get('western_counterfront').declaration);
    function reject(edit,world) {
      const d=FT.copy(def); edit(d); const m={name:'Rejected frontier',storyInstances:{western_counterfront:d}};
      if (world) m.bookmarks={'634':FT.copy(FBDATA.bookmarks['634'])};
      rejects.push(FB.mods.validate(m).length>0 && original===JSON.stringify([FBDATA,FB.state,FB.getRngState(),FB.getUidCounter(),localStorage]));
    }
    reject(function (d) { d.admission.schema=2; }); reject(function (d) { d.admission.mode='force'; });
    reject(function (d) { d.admission.cause='border'; }); reject(function (d) { d.admission.callback='grant'; });
    reject(function (d) { d.commission={source:'office',issuerRealmId:'byzantium_634'}; });
    reject(function (d) { d.commission=null; }); reject(function (d) { d.migrationId=null; });
    reject(function (d) { d.settlement=null; });
    reject(function (d) { d.firstDate={year:634,season:2,day:1}; d.lastDate={year:636,season:3,day:90}; });
    reject(function (d) { d.actor.realmId='absent_court'; },true);
    reject(function (d) { d.target.provinceId='absent_county'; },true);
    return {waiting:waiting,ready:ready.kind,phase:r.phase,days:r.deadline-r.startedTurn,actor:w.attacker,defender:w.defender,
      other:s.stories.western_counterfront.phase,rejects:rejects};
  })).toEqual({waiting:true,ready:'stewardship',phase:'started',days:2,actor:'sasanian_634',defender:'byzantium_634',other:'pending',rejects:Array(11).fill(true)});
  await page.evaluate(function () { FB.state.player.gold-=9; });
  await roundTrip(page);
  expect(await page.evaluate(function () {
    const text=FB.save.serialize();
    const d=JSON.parse(JSON.stringify(FBDATA.storyInstances.eastern_counterfront)); d.durationDays++;
    FB.mods.apply({storyInstances:{eastern_counterfront:d}});
    const state=FB.state,facts=JSON.stringify([state,FB.getRngState(),FB.getUidCounter(),localStorage]);
    let rejected=false; try { FB.save.restore(JSON.parse(text)); } catch (_) { rejected=true; }
    return rejected && state===FB.state && facts===JSON.stringify([FB.state,FB.getRngState(),FB.getUidCounter(),localStorage]);
  })).toBe(true);
});

test('pending and started provenance reject malformed saves before any live mutation',async function ({page},info) {
  await start(page,info);
  await roundTrip(page);
  expect(await page.evaluate(function () {
    const s=FB.state,id='syrian_front_634'; FT.allow(s,id); FT.tick(s,id);
    const text=FB.save.serialize(),before=JSON.stringify([FB.state,FB.getRngState(),FB.getUidCounter(),localStorage]),results=[];
    function reject(edit) {
      const e=JSON.parse(text); e.state=FB.save.expandedSnapshot(e.state); edit(e.state.stories[id],e.state);
      let refused=false; try { FB.save.restore(e); } catch (_) { refused=true; }
      results.push(refused && before===JSON.stringify([FB.state,FB.getRngState(),FB.getUidCounter(),localStorage]));
    }
    reject(function (r) { r.deadline++; }); reject(function (r) { r.actorId=s.player.charId; });
    reject(function (r) { r.targetOwnerId='sasanian_634'; }); reject(function (r) { r.warId='unrelated_war'; });
    reject(function (r) { r.phase='pending'; }); reject(function (r) { r.originalCourt='player'; });
    reject(function (r) { r.playerDecision='declined'; });
    reject(function (r) { r.actorGeneration++; });
    reject(function (r,saved) { saved.warSerial++; r.warId='war_'+saved.warSerial; });
    return results;
  })).toEqual(Array(9).fill(true));
});

test('no frontier, busy courts and unrelated household land never manufacture an eligible court',async function ({page},info) {
  await start(page,info);
  expect(await page.evaluate(function () {
    const base=FT.copy(FB.state),id='syrian_front_634',d=FT.def(base,id),checks=[];
    const without=FT.copy(base);
    Object.keys(FB.world.adj.damascus).forEach(function (p) {
      if (without.owner[p]===d.actor.realmId) FB.transferProvince(without,p,'byzantium_634');
    });
    FT.tick(without,id); checks.push(without.stories[id].phase==='pending' && without.stories[id].deadline===null);
    const busy=FT.copy(base); FT.allow(busy,id);
    FB.registerOrdinaryWar(busy,'byzantium_634',{enemy:'sasanian_634',target:'kufa',legacy:false,casus:{type:'aggression',target:'kufa'}});
    FT.tick(busy,id); checks.push(busy.stories[id].phase==='pending' && busy.stories[id].warId===null);
    const law=FT.copy(base); FT.allow(law,id); law.realms.rashidun_634.liege='sasanian_634';
    law.warLaws=law.warLaws || {}; law.warLaws.sasanian_634={external_campaigns:{level:'prohibited',setYear:634,setTurn:0}};
    FB.invalidateRealmCache(); FT.tick(law,id); checks.push(law.stories[id].phase==='pending' && law.stories[id].deadline===null);
    const unrelated=FT.copy(base); unrelated.realms.rashidun_634.alive=false;
    unrelated.owner.damascus='player'; unrelated.holder.damascus='player';
    FT.tick(unrelated,id); checks.push(unrelated.stories[id].reason==='actor_extinct' && unrelated.stories[id].warId===null &&
      !unrelated.start.rulerRealmId && FT.def(unrelated,id).actor.realmId==='rashidun_634');
    return checks;
  })).toEqual(Array(4).fill(true));
});

test('a current won objective restores hidden without repeating any declaration or outcome',async function ({page},info) {
  await start(page,info);
  await page.evaluate(function () {
    const s=FB.state,id='iraqi_front_634'; FT.allow(s,id); FT.tick(s,id);
    FB.transferProvince(s,'kufa','rashidun_634'); FT.tick(s,id);
    if (s.stories[id].result!=='won') throw new Error('The staged objective was not observed.');
    s.player.gold-=5;
    FBDATA.bookmarks['634'].revision='core_identities_v3';
    FBDATA.bookmarks['634'].revisions.core_courts_v4.hidden=true;
  });
  await roundTrip(page);
  expect(await page.evaluate(function () {
    const s=FB.state,before=JSON.stringify([s.stories,s.wars,s.log,s.player.gold,s.owner]);
    FB.stories.get('iraqi_front_634').day(s,s.stories.iraqi_front_634);
    return before===JSON.stringify([s.stories,s.wars,s.log,s.player.gold,s.owner]) &&
      s.start.revision==='core_courts_v4' && FB.bookmark('634','core_courts_v4').hidden;
  })).toBe(true);
});

test('extinction of an adopted court closes its commitment while its household may survive',async function ({page},info) {
  await start(page,info,'umar_634');
  expect(await page.evaluate(function () {
    const s=FB.state,id='syrian_front_634'; FT.allow(s,id);
    const pending=FT.copy(s);
    if (!FT.choose(s,id,'face_campaign')) throw new Error('The staged original court could not commit.');
    return [pending,FT.copy(s)].map(function (t) {
      const wasStarted=t.stories[id].phase==='started',wars=Object.keys(t.wars || {}).length;
      t.realms.player.alive=false; FT.tick(t,id);
      const closed=FT.copy(t.stories[id]),alive=!t.chars[t.player.charId].dead;
      t.realms.player.alive=true; FB.transferProvince(t,'kufa','player'); FT.tick(t,id);
      return {reason:closed.reason,result:closed.result,alive:alive,
        durable:JSON.stringify(closed)===JSON.stringify(t.stories[id]),
        wars:Object.keys(t.wars || {}).length===wars,wasStarted:wasStarted};
    });
  })).toEqual([{reason:'actor_extinct',result:'interrupted',alive:true,durable:true,wars:true,wasStarted:false},
    {reason:'authority_lost',result:'interrupted',alive:true,durable:true,wars:true,wasStarted:true}]);
});

test('released unopted campaigns retain their ordinary border admission and saved record',async function ({page},info) {
  await openGame(page,info); await prepareGameContent(page);
  await beginBookmarkFromTitle(page,'476');
  expect(await page.evaluate(function () {
    const s=FB.state,id='clovis_syagrius_476',court=s.stories.western_court_476;
    FB.assignRealmRulerCharacter(s,'franks_476',court.clovisId,{replaceAuthored:true});
    s.date.year=486;
    // Finish the staged succession/age boundary through the ordinary eager
    // court owner before comparing a save with its first restored state.
    FB.ensureRealmCourt(s,'franks_476'); FB.ensureRealmCourt(s,'italy');
    const rec=s.stories[id],def=FB.stories.get(id).declaration;
    FB.stories.get(id).day(s,rec);
    const w=FB.ordinaryWarById(s,rec.warId);
    return {policy:!!def.admission,phase:rec.phase,cause:w && w.casus.type,
      deadline:rec.deadline===rec.startedTurn+def.durationDays,owner:s.owner.laon};
  })).toEqual({policy:false,phase:'started',cause:'border',deadline:true,owner:'west_francia'});
  await roundTrip(page);
});
