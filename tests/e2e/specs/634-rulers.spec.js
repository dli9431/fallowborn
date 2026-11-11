'use strict';
const fs = require('fs');
const path = require('path');
const {test,expect} = require('../support/fixture');
const {openGame,prepareGameContent} = require('../support/game/navigation');
const {useReleasedStartRules} = require('../support/game/released-starts');
const {beginBookmarkFromTitle} = require('../support/game/bookmark-acceptance');
const {dependsOnRuntime} = require('../support/runtime-dependencies');

dependsOnRuntime(__filename,['data/bookmark_manifest.js',
  'index.html','data/starts_634_rulers.js','data/story_ruler_agendas_634.js',
  'data/starts_634_ordinary.js','data/bookmark_634.js','data/bookmark_634_identities.js',
  'data/bookmark_634_scaffold_a.js','data/bookmark_634_scaffold_b.js',
  'data/bookmark_634_scaffold_c.js','data/bookmark_634_scaffold_d.js',
  'data/bookmark_sources.js','data/story_instances.js','data/starts.js',
  'js/bookmark_sources.js','js/bookmark_composition.js','js/starts.js',
  'js/stories.js','js/story_ruler_agenda.js','js/main.js','js/world.js',
  'js/government_selection.js','js/government_elective.js','js/treasury.js',
  'data/bookmark_634_courts.js','js/bookmark_setup.js','js/governments.js',
  'data/bookmark_634_campaigns.js','data/story_campaigns_634.js','js/story_campaign.js',
  'js/government_aristocracy.js','js/government_recognition.js','js/government_administration.js',
  'js/authority.js','js/politics.js',
  'js/government_civic.js','js/civic_transactions.js','js/civic_strategies.js',
  'js/save.js','js/save_v4.js','js/mods.js','js/ui_misc.js','js/ui_modals.js'
]);

async function beginUmar(page,info,code,fromTitle) {
  if (!fromTitle) {
    await useReleasedStartRules(page);
    await openGame(page,info);
  }
  await page.evaluate(function () {
    // Acceptance review is confined to this fresh browser context.
    FBDATA.bookmarks['634'].hidden = false;
    FBDATA.startScenarios.find(function (s) { return s.id === 'umar_634'; }).hidden = false;
    const adopt = FB.adoptStartingRealm;
    FB.adoptStartingRealm = function (s,scenario) {
      const c = s.chars[s.player.charId], r = s.realms[scenario.rulerRealmId];
      window.__umarCourt = {person:c.id,family:[c.spouseId,c.childrenIds.slice()],
        treasury:r.treasury.gold,owners:Object.keys(s.owner).filter(function (id) { return s.owner[id] === r.id; }).sort()};
      FB.adoptStartingRealm = adopt;
      return adopt(s,scenario);
    };
  });
  const full = page.locator('#btn-choose-beginning');
  if (await full.isVisible()) await full.click();
  else await page.getByRole('button',{name:'New Game',exact:true}).click();
  if (code) {
    await page.locator('#btn-bm-seed').click();
    await page.locator('#ng-seed').fill('UMAR634-634-umar_634-medina-m-Umar-standard');
    await page.locator('#ng-seed').press('Enter');
  } else {
    await page.locator('#bookmarklist [data-bookmark="634"]').click();
    await page.getByRole('button',{name:/^Umar at Medina /}).click();
  }
  await expect(page.locator('#cg-name')).toHaveValue('Umar');
  await expect(page.locator('#cg-name')).toHaveAttribute('readonly','');
  await page.getByRole('button',{name:'Begin Your Story',exact:true}).click();
  await page.getByRole('button',{name:'Begin',exact:true}).click();
  await page.evaluate(function () { FB.game.setPaused(true); });
}

test('634 keeps the complete Umar graph hidden and validation pure',async function ({page},info) {
  await useReleasedStartRules(page);
  await openGame(page,info);
  expect(await page.evaluate(function () {
    const b = FB.bookmark('634'), scenario = FBDATA.startScenarios.find(function (s) { return s.id === 'umar_634'; });
    const before = JSON.stringify(FBDATA), rng = FB.getRngState(), uid = FB.getUidCounter();
    const faults = FB.validateBookmark(b);
    const tracks = FB.startStoryTracks(scenario,'medina',null,b);
    return {hidden:[b.hidden,scenario.hidden],available:FB.bookmarkAvailable('634'),faults:faults,
      tracks:tracks,locations:b.startLocations.umar_634,revision:b.revision,layout:b.settlementLayout,
      isolated:['476','568','867','1066'].every(function (id) {
        return !FB.startRuntimeReport(scenario,FB.bookmark(id)).available;
      }),yazdegerdHidden:FBDATA.startScenarios.some(function (s) { return s.id === 'yazdegerd_634' && s.hidden; }) && b.starts.indexOf('yazdegerd_634') < 0,
      stages:FB.stories.get('umar_agenda_634').declaration.stages.map(function (st) { return [st.id,st.year,st.season]; }),
      pure:before === JSON.stringify(FBDATA) && rng === FB.getRngState() && uid === FB.getUidCounter()};
  })).toEqual({hidden:[undefined,true],available:true,faults:[],tracks:['umar_agenda_634'],locations:['medina'],
    revision:'core_identities_v3',layout:'634_opening',isolated:true,yazdegerdHidden:true,
    stages:[['accession_review_634',634,2],['syrian_review_634',634,2],['iraqi_review_634',634,2],['mandate_conclusion_634',634,2]],pure:true});
});

async function beginYazdegerd(page,info,code,fromTitle) {
  if (!fromTitle) {
    await useReleasedStartRules(page);
    await openGame(page,info);
  }
  await page.evaluate(function () {
    const raw=FBDATA.bookmarks['634'];
    if (!raw || !FBDATA.startScenarios.some(function (s) { return s.id==='yazdegerd_634'; }))
      throw new Error(JSON.stringify(FB.bookmarkRuntimeDiagnostics()));
    // Isolated owner review; production revision and scenario stay hidden.
    raw.revision='core_courts_v4'; raw.revisions.core_courts_v4.hidden=false;
    FBDATA.startScenarios.find(function (s) { return s.id==='yazdegerd_634'; }).hidden=false;
    const adopt=FB.adoptStartingRealm;
    FB.adoptStartingRealm=function (s,scenario) {
      const c=s.chars[s.player.charId], r=s.realms[scenario.rulerRealmId];
      window.__yazdegerdCourt={person:c.id,family:[c.spouseId,c.childrenIds.slice()],
        funds:FB.treasuryAvailable(s,r.id),generation:FB.realmRulerGeneration(s,r.id),
        regency:JSON.stringify(FB.aristocracy.state(s,r.id).regency),
        owners:Object.keys(s.owner).filter(function (id) { return s.owner[id]===r.id; }).sort()};
      FB.adoptStartingRealm=adopt;
      return adopt(s,scenario);
    };
    window.__yazdegerdFacts=function (withoutStories) {
      const e=JSON.parse(FB.save.serialize()),s=FB.save.expandedSnapshot(e.state);
      function ordered(value) {
        if (Array.isArray(value)) return value.map(ordered);
        if (!value || typeof value!=='object') return value;
        const out={}; Object.keys(value).sort().forEach(function (key) { out[key]=ordered(value[key]); }); return out;
      }
      const treasury=s.realms.player.treasury;
      if (treasury && treasury.distributionCooldown===undefined) treasury.distributionCooldown=0;
      return JSON.stringify(ordered([s.start,s.date,s.turn,s.player,s.chars,s.realms,s.owner,s.holder,
        s.authority,s.bookmarkSetup,withoutStories ? null : s.stories,s.armies,e.rng>>>0,e.uid,e.mods]));
    };
  });
  const full=page.locator('#btn-choose-beginning');
  if (await full.isVisible()) await full.click();
  else await page.getByRole('button',{name:'New Game',exact:true}).click();
  if (code) {
    await page.locator('#btn-bm-seed').click();
    await page.locator('#ng-seed').fill('YAZDEGERD634-634-yazdegerd_634-baghdad-m-Yazdegerd III-standard');
    await page.locator('#ng-seed').press('Enter');
  } else {
    await page.locator('#bookmarklist [data-bookmark="634"]').click();
    await page.getByRole('button',{name:/^Yazdegerd at Ctesiphon /}).click();
  }
  await expect(page.locator('#cg-name')).toHaveValue('Yazdegerd III');
  await expect(page.locator('#cg-name')).toHaveAttribute('readonly','');
  await page.getByRole('button',{name:'Begin Your Story',exact:true}).click();
  await page.getByRole('button',{name:'Begin',exact:true}).click();
  await page.evaluate(function () { FB.game.setPaused(true); });
}

test('Yazdegerd is hidden, complete and isolated to the capable full court revision',async function ({page},info) {
  await useReleasedStartRules(page); await openGame(page,info);
  expect(await page.evaluate(function () {
    const scenario=FBDATA.startScenarios.find(function (s) { return s.id==='yazdegerd_634'; });
    if (!scenario || !FB.bookmark('634')) throw new Error(JSON.stringify(FB.bookmarkRuntimeDiagnostics()));
    const before=JSON.stringify([FBDATA,FB.getRngState(),FB.getUidCounter()]);
    const full=FB.bookmark('634','core_courts_v4'),old=FB.bookmark('634');
    const oldStarts=['farmer_634','craftsman_634','ctesiphon_household_634','umar_634','heraclius_634',
      'damascus_household_634','frontier_household_634','medina_household_634'];
    const revisions=FB.bookmarkRevisions('634');
    const faults=revisions.map(function (b) { return FB.validateBookmark(b); });
    const earlier=revisions.filter(function (b) { return b.revision!=='core_courts_v4'; });
    return {hidden:[scenario.hidden,full.hidden],fresh:old.revision,faults:faults.every(function (f) { return !f.length; }),
      earlier:earlier.every(function (b) { return JSON.stringify(b.starts)===JSON.stringify(oldStarts) &&
        !FB.startRuntimeReport(scenario,b).available; }),
      full:JSON.stringify(full.starts)===JSON.stringify(oldStarts.slice(0,5).concat(['yazdegerd_634'],oldStarts.slice(5))) &&
        FB.startRuntimeReport(scenario,full).available,
      tracks:FB.startStoryTracks(scenario,'baghdad',null,full),locations:full.startLocations.yazdegerd_634,
      isolated:['476','568','867','1066'].every(function (id) { return !FB.startRuntimeReport(scenario,FB.bookmark(id)).available; }),
      pure:before===JSON.stringify([FBDATA,FB.getRngState(),FB.getUidCounter()])};
  })).toEqual({hidden:[true,true],fresh:'core_identities_v3',faults:true,earlier:true,full:true,
    tracks:['yazdegerd_agenda_634'],locations:['baghdad'],isolated:true,pure:true});
});

for (const code of [false,true]) {
  test('Yazdegerd adopts the child, Ctesiphon site and stewardship once through '+(code?'a code':'the picker'),async function ({page},info) {
    await beginYazdegerd(page,info,code);
    expect(await page.evaluate(function () {
      const s=FB.state,c=s.chars[s.player.charId],original=window.__yazdegerdCourt,r=s.realms.player;
      const regency=FB.aristocracy.state(s,'player').regency,profile=FB.aristocracy.profile(s,'player');
      const before=window.__yazdegerdFacts();
      FB.aristocracy.seed(s); FB.stories.start(s);
      const once=before===window.__yazdegerdFacts();
      const seed=FB.aristocracy.seed;
      FB.aristocracy.seed=function () { throw new Error('Restore replayed court initialization'); };
      try { FB.save.restore(JSON.parse(FB.save.serialize())); FB.save.restore(JSON.parse(FB.save.serialize())); }
      finally { FB.aristocracy.seed=seed; }
      return {name:c.name,born:c.born,age:s.date.year-c.born,tier:s.player.tier,rank:r.rank,
        community:[c.culture,c.religion],home:s.player.provinceId,
        site:FB.settlementsOf(s,'baghdad')[s.player.homeSettlement].site,
        form:FB.governments.forRealm(s,'player').id,source:s.start.rulerRealmId,
        adopted:original.person===c.id && !s.realms.sasanian_634,
        unique:Object.values(s.chars).filter(function (p) { return p.name==='Yazdegerd III' && !p.dead; }).length,
        family:JSON.stringify([c.spouseId,c.childrenIds])===JSON.stringify(original.family) && !c.spouseId && !c.childrenIds.length,
        funds:original.funds===FB.treasuryAvailable(s,'player'),
        owners:JSON.stringify(original.owners)===JSON.stringify(Object.keys(s.owner).filter(function (id) { return s.owner[id]==='player'; }).sort()),
        generation:original.generation===FB.realmRulerGeneration(s,'player'),
        steward:regency.stewardId===s.bookmarkSetup.actors[profile.openingStewardActorId] &&
          original.regency===JSON.stringify(regency) && regency.stewardId!==c.id,
        readiness:FB.governments.publicAuthorityReadiness(s,'player').kind,
        agenda:s.stories.yazdegerd_agenda_634.subjectId===c.id,once:once,restored:before===window.__yazdegerdFacts()};
    })).toEqual({name:'Yazdegerd III',born:624,age:10,tier:7,rank:4,community:['persian','zoroastrian_sasanian_634'],
      home:'baghdad',site:'baghdad_outer_476',form:'aristocratic_monarchy',source:'sasanian_634',adopted:true,
      unique:1,family:true,funds:true,owners:true,generation:true,steward:true,readiness:'stewardship',agenda:true,once:true,restored:true});
  });
}

test('Yazdegerd public acts require stewardship and assent, with canonical replacement and majority',async function ({page},info) {
  await beginYazdegerd(page,info,true);
  expect(await page.evaluate(function () {
    const s=FB.state,A=FB.aristocracy,G=FB.governments,R=FB.governmentRecognition,actor={kind:'realm',id:'player'};
    const me=s.chars[s.player.charId],data=A.state(s,'player'),profile=A.profile(s,'player'),generation=FB.realmRulerGeneration(s,'player');
    const first=A.constituency(s,'player')[0],other=A.constituency(s,'player')[1],steward=s.chars[data.regency.stewardId];
    const money=FB.treasuryAvailable(s,'player'),property=JSON.stringify([s.owner,s.holder,s.bookmarkSetup.estates]),people=Object.keys(s.chars).sort();
    const q=A.provincialQuote(s,actor,'player',other.id,'negotiate',{revenue:0.6,levy:0.5});
    const initial=q.allowed && G.publicAuthorityReadiness(s,'player').kind==='stewardship';
    steward.captive=true;
    const before=window.__yazdegerdFacts();
    const stale=!A.apply(s,q), blocked=['levy','war','treaty','grant','extraordinary_tax'].every(function (op) {
      return !FB.political.consent(s,actor,op,{}).allowed &&
        !FB.political.consent(s,{kind:'character',id:me.id},op,{}).allowed;
    });
    const publicBlocked=!A.provincialQuote(s,actor,'player',other.id,'negotiate',profile.defaultTerms).allowed &&
      !R.supportQuote(s,actor,'player','court',me.id).allowed;
    const pure=before===window.__yazdegerdFacts();
    const withheld=A.apply(s,A.provincialQuote(s,other.principal,'player',other.id,'withhold'));
    const replacement=A.stewardQuote(s,actor,'player');
    const replaced=A.steward(s,replacement),repeated=!A.steward(s,replacement);
    const reserved=!FB.political.consent(s,actor,'extraordinary_tax',{}).allowed;
    const independent=A.apply(s,A.provincialQuote(s,other.principal,'player',other.id,'assent'));
    const interestsRequired=FB.political.consent(s,actor,'war',{}).allowed &&
      !FB.political.consent(s,actor,'extraordinary_tax',{}).allowed;
    // Restore the staged incapacity; a steward alone cannot replace this interest's assent.
    steward.captive=false;
    const recovered=FB.political.consent(s,actor,'war',{}).allowed && FB.political.consent(s,actor,'extraordinary_tax',{}).allowed;
    const principalNotKing=!FB.political.consent(s,other.principal,'war',{}).allowed;
    const fresh=A.provincialQuote(s,actor,'player',first.id,'negotiate',{revenue:0.6,levy:0.5});
    const negotiated=A.apply(s,fresh),spent=money-FB.treasuryAvailable(s,'player')===profile.negotiationCost;
    const saved=window.__yazdegerdFacts(); FB.save.restore(JSON.parse(FB.save.serialize()));
    FB.save.restore(JSON.parse(FB.save.serialize())); const restored=saved===window.__yazdegerdFacts();
    const live=FB.state,liveData=A.state(live,'player'),current=live.chars[liveData.regency.stewardId];
    current.captive=true; live.date.year=me.born+profile.minimumAge-1;
    const below=!G.publicAuthorityReadiness(live,'player').allowed;
    live.date.year++;
    const adult=G.publicAuthorityReadiness(live,'player').kind==='adult' && FB.political.consent(live,actor,'war',{}).allowed;
    const adultFunds=FB.treasuryAvailable(live,'player'); FB.publicOfficeSettle(live,null,0,true);
    const ended=liveData.regency===null,adultFacts=window.__yazdegerdFacts();
    FB.save.restore(JSON.parse(FB.save.serialize())); FB.save.restore(JSON.parse(FB.save.serialize()));
    return {initial:initial,stale:stale,blocked:blocked,publicBlocked:publicBlocked,pure:pure,withheld:withheld,
      replaced:replaced,repeated:repeated,reserved:reserved,independent:independent,interestsRequired:interestsRequired,recovered:recovered,principalNotKing:principalNotKing,
      negotiated:negotiated,spent:spent,restored:restored,below:below,adult:adult,ended:ended,
      adultRestored:adultFacts===window.__yazdegerdFacts() && A.state(FB.state,'player').regency===null,
      noPayment:adultFunds===FB.treasuryAvailable(live,'player'),
      sameRuler:live.player.charId===me.id && FB.realmRulerGeneration(live,'player')===generation &&
        JSON.stringify(people)===JSON.stringify(Object.keys(live.chars).sort()),
      property:property===JSON.stringify([live.owner,live.holder,live.bookmarkSetup.estates])};
  })).toEqual({initial:true,stale:true,blocked:true,publicBlocked:true,pure:true,withheld:true,replaced:true,repeated:true,
    reserved:true,independent:true,interestsRequired:true,recovered:true,principalNotKing:true,negotiated:true,spent:true,restored:true,below:true,
    adult:true,ended:true,adultRestored:true,noPayment:true,sameRuler:true,property:true});
});

test('Yazdegerd four costless reviews preserve pending and complete saves without replay',async function ({page},info) {
  await beginYazdegerd(page,info,true);
  expect(await page.evaluate(function () {
    const id='yazdegerd_agenda_634',definition=FB.stories.get(id).declaration;
    let s=FB.state;
    function resources() { return window.__yazdegerdFacts(true); }
    const original=resources(),rng=FB.getRngState(),uid=FB.getUidCounter(),before=window.__yazdegerdFacts();
    FB.stories.cards(s); FB.stories.choices(s,id); FB.stories.quote(s,id,'yazdegerd_observe_recognition');
    const pure=before===window.__yazdegerdFacts();
    const conditional=!FB.stories.quote(s,id,'yazdegerd_observe_recognition').allowed;
    const applied=[],repeated=[],restored=[];
    definition.stages.forEach(function (stage,index) {
      const choice=stage.choices[index===3 ? 0 : stage.choices.length-1].id;
      const q=FB.stories.quote(s,id,choice);
      applied.push(FB.stories.apply(s,id,choice,q)); repeated.push(FB.stories.apply(s,id,choice,q));
      const facts=window.__yazdegerdFacts();
      FB.save.restore(JSON.parse(FB.save.serialize())); FB.save.restore(JSON.parse(FB.save.serialize())); s=FB.state;
      restored.push(facts===window.__yazdegerdFacts());
    });
    const malformed=JSON.parse(FB.save.serialize());
    malformed.state.stories[id].decisions[0].choiceId='unsupported_saved_review';
    const live=window.__yazdegerdFacts(),storage=JSON.stringify(localStorage),wire=JSON.stringify(malformed);
    let rejected=false; try { FB.save.restore(malformed); } catch (error) { rejected=true; }
    const atomic=rejected && wire===JSON.stringify(malformed) && live===window.__yazdegerdFacts() && storage===JSON.stringify(localStorage);
    return {pure:pure,conditional:conditional,stages:s.stories[id].decisions.map(function (d) { return d.stageId; }),
      applied:applied,repeated:repeated,restored:restored,status:s.stories[id].status,
      unchanged:original===resources(),rng:rng===FB.getRngState(),uid:uid===FB.getUidCounter(),home:s.player.provinceId,atomic:atomic};
  })).toEqual({pure:true,conditional:true,stages:['minority_court','provincial_obligations','iraqi_frontier','sasanian_continuation'],
    applied:[true,true,true,true],repeated:[false,false,false,false],restored:[true,true,true,true],status:'agenda_complete',
    unchanged:true,rng:true,uid:true,home:'baghdad',atomic:true});
});

test('Yazdegerd conditional reviews respect the empty royal household and a real quiet frontier ending',async function ({page},info) {
  await beginYazdegerd(page,info,true);
  expect(await page.evaluate(function () {
    const s=FB.state,id='yazdegerd_agenda_634',R=FB.governmentRecognition,voice=FB.aristocracy.constituency(s,'player')[0];
    const noCandidate=R.candidates(s,'player').length===0;
    const withdrawn=R.applySupport(s,R.supportQuote(s,voice.principal,'player',voice.id,null));
    const before=JSON.stringify([s.player,s.realms,s.owner,s.holder,s.authority,s.armies]);
    const noPositive=!FB.stories.quote(s,id,'yazdegerd_observe_recognition').allowed &&
      !FB.stories.apply(s,id,'yazdegerd_observe_recognition',FB.stories.quote(s,id,'yazdegerd_observe_recognition'));
    const retained=FB.stories.apply(s,id,'yazdegerd_keep_court',FB.stories.quote(s,id,'yazdegerd_keep_court'));
    const noPublicEffects=before===JSON.stringify([s.player,s.realms,s.owner,s.holder,s.authority,s.armies]);
    const provinces=FB.stories.apply(s,id,'yazdegerd_keep_provinces',FB.stories.quote(s,id,'yazdegerd_keep_provinces'));
    const pending=!FB.stories.quote(s,id,'yazdegerd_observe_iraq').allowed;
    const declined=FB.stories.apply(s,'iraqi_front_634','leave_campaign',FB.stories.quote(s,'iraqi_front_634','leave_campaign'));
    const source=JSON.stringify(s.stories.iraqi_front_634),funds=FB.treasuryAvailable(s,'player');
    const acknowledged=FB.stories.apply(s,id,'yazdegerd_observe_iraq',FB.stories.quote(s,id,'yazdegerd_observe_iraq'));
    const sourceUnchanged=source===JSON.stringify(s.stories.iraqi_front_634) && funds===FB.treasuryAvailable(s,'player');
    const saved=window.__yazdegerdFacts(); FB.save.restore(JSON.parse(FB.save.serialize())); FB.save.restore(JSON.parse(FB.save.serialize()));
    return {noCandidate:noCandidate,withdrawn:withdrawn,noPositive:noPositive,retained:retained,noPublicEffects:noPublicEffects,provinces:provinces,
      pending:pending,declined:declined,acknowledged:acknowledged,sourceUnchanged:sourceUnchanged,restored:saved===window.__yazdegerdFacts()};
  })).toEqual({noCandidate:true,withdrawn:true,noPositive:true,retained:true,noPublicEffects:true,provinces:true,pending:true,declined:true,acknowledged:true,sourceUnchanged:true,restored:true});
});

for (const reason of ['death','generation','stop']) {
  test('Yazdegerd archives unfinished reviews on '+reason,async function ({page},info) {
    await beginYazdegerd(page,info,true);
    expect(await page.evaluate(function (reason) {
      const s=FB.state,id='yazdegerd_agenda_634',story=FB.stories.get(id),t=s.stories[id];
      const q=FB.stories.quote(s,id,'yazdegerd_review_court');
      if (reason==='death') s.chars[s.player.charId].dead=true;
      else if (reason==='generation') {
        s.realms.player.ruler.generation++; s.realms.player.succession.rulerGeneration++;
        FB.aristocracy.state(s,'player').regency.generation=s.realms.player.ruler.generation;
      }
      else FB.stories.apply(s,id,'agenda_stop_program',FB.stories.quote(s,id,'agenda_stop_program'));
      const stale=!FB.stories.apply(s,id,q.id,q); story.day(s,t); const record=JSON.stringify(t); story.day(s,t);
      FB.save.restore(JSON.parse(FB.save.serialize())); FB.save.restore(JSON.parse(FB.save.serialize()));
      return {stale:stale,status:t.status,once:record===JSON.stringify(t),restored:record===JSON.stringify(FB.state.stories[id]),
        choices:FB.stories.choices(FB.state,id)};
    },reason)).toEqual({stale:true,status:reason==='stop' ? 'agenda_stopped' : 'agenda_interrupted',once:true,restored:true,choices:[]});
  });
}

test('Yazdegerd malformed graph rejects only its full-revision start unit',async function ({page},info) {
  test.skip(!info.project.name.endsWith('-served'),'Source interception requires a served origin.');
  const source=fs.readFileSync(path.resolve(__dirname,'../../../data/story_ruler_agendas_634.js'),'utf8');
  await page.route('**/data/story_ruler_agendas_634.js',function (route) {
    return route.fulfill({contentType:'application/javascript',body:source.replace("id:'yazdegerd_review_court'","id:'agenda_stop_program'")});
  });
  await openGame(page,info);
  expect(await page.evaluate(function () {
    const b=FB.bookmark('634','core_courts_v4'),report=FB.bookmarkCompositions.sourceReports().find(function (r) { return r.id==='autumn_634'; });
    if (!b || !report) throw new Error(JSON.stringify(FB.bookmarkRuntimeDiagnostics()));
    return {world:report.published,unit:report.starts.find(function (r) { return r.id==='yazdegerd_634'; }).ready,
      absent:!FB.stories.get('yazdegerd_agenda_634') && !b.startLocations.yazdegerd_634 && b.starts.indexOf('yazdegerd_634')<0 &&
        !FBDATA.startScenarios.some(function (s) { return s.id==='yazdegerd_634'; }),faults:FB.validateBookmark(b),
      siblings:['umar_634','heraclius_634','farmer_634','craftsman_634'].every(function (id) {
        return FBDATA.startScenarios.some(function (s) { return s.id===id; });
      })};
  })).toEqual({world:true,unit:false,absent:true,faults:[],siblings:true});
});

test('Yazdegerd real JSON agenda import retains its own decisions and future stop route',async function ({page},info) {
  await useReleasedStartRules(page); await openGame(page,info);
  const fixture=path.resolve(__dirname,'../fixtures/authoring/634-yazdegerd-review.json');
  expect(await page.evaluate(function (mod) {
    const before=JSON.stringify([FBDATA,FB.getRngState(),FB.getUidCounter()]),faults=FB.mods.validate(mod);
    return {faults:faults,pure:before===JSON.stringify([FBDATA,FB.getRngState(),FB.getUidCounter()])};
  },JSON.parse(fs.readFileSync(fixture,'utf8')))).toEqual({faults:[],pure:true});
  await page.evaluate(function () { FB.ui.showMods(); });
  await page.locator('#modfile').setInputFiles(fixture);
  await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded'}),page.locator('#mod-apply').click()]);
  await prepareGameContent(page); await beginYazdegerd(page,info,true,true);
  expect(await page.evaluate(function () {
    const s=FB.state,id='yazdegerd_agenda_634';
    const applied=FB.stories.apply(s,id,'keep_records',FB.stories.quote(s,id,'keep_records'));
    const future=!FB.stories.quote(s,id,'keep_later_records').allowed;
    const saved=window.__yazdegerdFacts(); FB.save.restore(JSON.parse(FB.save.serialize())); FB.save.restore(JSON.parse(FB.save.serialize()));
    const restored=saved===window.__yazdegerdFacts();
    const stopped=FB.stories.apply(FB.state,id,'agenda_stop_program',FB.stories.quote(FB.state,id,'agenda_stop_program'));
    const terminal=window.__yazdegerdFacts(); FB.save.restore(JSON.parse(FB.save.serialize()));
    return {applied:applied,future:future,restored:restored,stopped:stopped,terminal:terminal===window.__yazdegerdFacts(),
      stage:FB.state.stories[id].decisions[0].stageId,status:FB.state.stories[id].status};
  })).toEqual({applied:true,future:true,restored:true,stopped:true,terminal:true,stage:'present_records',status:'agenda_stopped'});
});

for (const code of [false,true]) {
  test('Umar adopts the existing court once through '+(code?'a code':'the picker'),async function ({page},info) {
    await beginUmar(page,info,code);
    expect(await page.evaluate(async function () {
      const s = FB.state, c = s.chars[s.player.charId], original = window.__umarCourt, r = s.realms.player;
      function snapshot(s) {
        return JSON.stringify([s.start,s.player.charId,s.player.gold,s.player.tier,s.owner,s.holder,
          s.stories,s.realms.player.treasury,Object.keys(s.chars).sort()]);
      }
      const before = snapshot(s);
      const saved = JSON.parse(FB.save.serialize());
      FBDATA.bookmarks['634'].hidden = true;
      FBDATA.startScenarios.find(function (row) { return row.id === 'umar_634'; }).hidden = true;
      await new Promise(function (resolve,reject) {
        FB.activateBookmark('867',null,function (error) { if (error) reject(error); else resolve(); });
      });
      await new Promise(function (resolve,reject) {
        FB.activateBookmark(saved.state.start.id,null,function (error) { if (error) reject(error); else resolve(); },
          {revision:saved.state.start.revision,geography:saved.state.start.geography});
      });
      FB.save.restore(saved);
      return {name:c.name,tier:s.player.tier,rank:r.rank,home:s.player.provinceId,
        community:[c.culture,c.religion],form:FB.governments.forRealm(FB.state,'player').id,source:s.start.rulerRealmId,
        adopted:c.id === original.person && !s.realms.rashidun_634 && FB.startRealmId(s,'rashidun_634') === 'player',
        unique:Object.values(s.chars).filter(function (p) { return p.name === 'Umar' && !p.dead; }).length,
        family:JSON.stringify([c.spouseId,c.childrenIds]) === JSON.stringify(original.family),
        treasury:r.treasury.gold === original.treasury && s.player.gold === 100,
        owners:JSON.stringify(Object.keys(s.owner).filter(function (id) { return s.owner[id] === 'player'; }).sort()) === JSON.stringify(original.owners),
        site:FB.settlementsOf(s,'medina')[s.player.homeSettlement].site,
        agenda:s.stories.umar_agenda_634.subjectId === c.id,
        exclusions:!Object.values(s.religiousHeads || {}).some(Boolean) && Object.keys(s.localInstitutions || {}).length === 0,
        restored:before === snapshot(FB.state)};
    })).toEqual({name:'Umar',tier:7,rank:4,home:'medina',community:['arabic','early_islam_634'],
      form:'medinan_selection_pf_634',source:'rashidun_634',adopted:true,unique:1,family:true,
      treasury:true,owners:true,site:'medina_493',agenda:true,exclusions:true,restored:true});
  });
}

test('all four reviews conclude at Medina without time, rewards or replay',async function ({page},info) {
  await beginUmar(page,info,true);
  expect(await page.evaluate(function () {
    const id = 'umar_agenda_634';
    function resources(s) { return JSON.stringify([s.turn,s.date,s.player,s.owner,s.holder,s.realms,s.armies,s.authority]); }
    let s = FB.state;
    const definition = FB.stories.get(id).declaration;
    let unchanged = true;
    const applied = [], repeated = [], stages = [];
    const pure = JSON.stringify(s), rng = FB.getRngState(), uid = FB.getUidCounter();
    FB.stories.cards(s); FB.stories.choices(s,id); FB.stories.quote(s,id,'umar_review_mandate_634');
    const reviewPure = pure === JSON.stringify(s) && rng === FB.getRngState() && uid === FB.getUidCounter();
    definition.stages.forEach(function (stage,index) {
      stages.push(stage.id);
      const start = resources(s);
      const choice = stage.choices[index === 3 ? 0 : 1].id, quote = FB.stories.quote(s,id,choice);
      applied.push(FB.stories.apply(s,id,choice,quote));
      repeated.push(FB.stories.apply(s,id,choice,quote));
      unchanged = unchanged && start === resources(s);
      const record = JSON.stringify(s.stories[id]), saved = JSON.parse(FB.save.serialize());
      FB.save.restore(saved); s = FB.state;
      if (JSON.stringify(s.stories[id]) !== record) throw new Error('Agenda restore changed its decisions');
    });
    const complete = s.stories[id].status;
    const saved = JSON.parse(FB.save.serialize()), companion = 'opening_umar_634';
    delete saved.state.stories[id];
    saved.state.start.storyAttachments.tracks = saved.state.start.storyAttachments.tracks.filter(function (track) { return track !== id; });
    const before = JSON.stringify([FBDATA,FB.state,FB.getRngState(),FB.getUidCounter(),localStorage]), wire = JSON.stringify(saved);
    let rejected = false; try { FB.save.restore(saved); } catch (error) { rejected = true; }
    if (!rejected || wire !== JSON.stringify(saved) || before !== JSON.stringify([FBDATA,FB.state,FB.getRngState(),FB.getUidCounter(),localStorage]))
      throw new Error('An incomplete ruler graph must reject atomically');
    delete saved.state.stories[companion];
    saved.state.start.storyAttachments.tracks = saved.state.start.storyAttachments.tracks.filter(function (track) { return track !== companion; });
    FB.save.restore(saved); FB.stories.day(FB.state);
    if (FB.state.stories[companion]) throw new Error('Restore attached an absent opening companion');
    return {reviewPure:reviewPure,applied:applied,repeated:repeated,stages:stages,status:complete,
      unchanged:unchanged,absent:!FB.state.stories[id]};
  })).toEqual({reviewPure:true,applied:[true,true,true,true],repeated:[false,false,false,false],
    stages:['accession_review_634','syrian_review_634','iraqi_review_634','mandate_conclusion_634'],
    status:'agenda_complete',unchanged:true,absent:true});
});

for (const reason of ['death','generation','stop']) {
  test('Umar archives the personal program on '+reason,async function ({page},info) {
    await beginUmar(page,info,true);
    expect(await page.evaluate(function (reason) {
      const s = FB.state, id = 'umar_agenda_634', story = FB.stories.get(id), t = s.stories[id];
      const quote = FB.stories.quote(s,id,'umar_review_mandate_634');
      if (reason === 'death') s.chars[s.player.charId].dead = true;
      else if (reason === 'generation') {
        s.realms.player.ruler.generation++;
        s.realms.player.succession.rulerGeneration++;
      }
      else FB.stories.apply(s,id,'agenda_stop_program',FB.stories.quote(s,id,'agenda_stop_program'));
      const stale = FB.stories.apply(s,id,quote.id,quote);
      story.day(s,t); const ended = JSON.stringify(t); story.day(s,t);
      const saved = JSON.parse(FB.save.serialize()); FB.save.restore(saved);
      return {stale:stale,status:t.status,once:ended === JSON.stringify(t),
        choices:FB.stories.choices(FB.state,id),restored:ended === JSON.stringify(FB.state.stories[id])};
    },reason)).toEqual({stale:false,status:reason === 'stop' ? 'agenda_stopped' : 'agenda_interrupted',once:true,choices:[],restored:true});
  });
}

test('a malformed Umar graph withholds the whole start while ordinary siblings remain valid',async function ({page},info) {
  test.skip(!info.project.name.endsWith('-served'),'Source interception requires a served origin.');
  const source = fs.readFileSync(path.resolve(__dirname,'../../../data/story_ruler_agendas_634.js'),'utf8');
  await page.route('**/data/story_ruler_agendas_634.js',function (route) {
    return route.fulfill({contentType:'application/javascript',body:source.replace("operation:'agenda_priority'","operation:'unsupported_review'")});
  });
  await openGame(page,info);
  expect(await page.evaluate(function () {
    const b = FB.bookmark('634'), report = FB.bookmarkCompositions.sourceReports().find(function (r) { return r.id === 'autumn_634'; });
    return {world:report.published,unit:report.starts.find(function (r) { return r.id === 'umar_634'; }).ready,
      absent:!FB.stories.get('umar_agenda_634') && !FBDATA.storyInstances.umar_agenda_634 && !b.startLocations.umar_634 &&
        !FBDATA.startScenarios.some(function (s) { return s.id === 'umar_634'; }),
      faults:FB.validateBookmark(b),siblings:['farmer_634','craftsman_634'].every(function (id) {
        return FBDATA.startScenarios.some(function (s) { return s.id === id; });
      })};
  })).toEqual({world:true,unit:false,absent:true,faults:[],siblings:true});
  await beginBookmarkFromTitle(page,'634','farmer_634');
});

test('an ordinary JSON import can replace the personal reviews and restore its own decisions',async function ({page},info) {
  await useReleasedStartRules(page);
  await openGame(page,info);
  expect(await page.evaluate(function (mod) { return FB.mods.validate(mod); },JSON.parse(fs.readFileSync(path.resolve(__dirname,'../fixtures/authoring/634-ruler-review.json'),'utf8')))).toEqual([]);
  await page.evaluate(function () { FB.ui.showMods(); });
  await page.locator('#modfile').setInputFiles(path.resolve(__dirname,'../fixtures/authoring/634-ruler-review.json'));
  await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded'}),page.locator('#mod-apply').click()]);
  await prepareGameContent(page);
  await beginUmar(page,info,true,true);
  expect(await page.evaluate(function () {
    const s = FB.state, id = 'umar_agenda_634', before = JSON.stringify([s.player,s.owner,s.realms,s.armies]);
    const applied = FB.stories.apply(s,id,'import_keep_634',FB.stories.quote(s,id,'import_keep_634'));
    const unchanged = before === JSON.stringify([s.player,s.owner,s.realms,s.armies]);
    const record = JSON.stringify(s.stories[id]), saved = JSON.parse(FB.save.serialize());
    FB.save.restore(saved);
    return {applied:applied,status:FB.state.stories[id].status,
      stage:FB.state.stories[id].decisions[0].stageId,
      retained:record === JSON.stringify(FB.state.stories[id]),
      unchanged:unchanged};
  })).toEqual({applied:true,status:'agenda_complete',stage:'import_accounts_634',retained:true,unchanged:true});
});

async function beginHeraclius(page,info,code,fromTitle) {
  if (!fromTitle) {
    await useReleasedStartRules(page);
    await openGame(page,info);
  }
  await page.evaluate(function () {
    // Acceptance review is confined to this fresh browser context.
    FBDATA.bookmarks['634'].hidden = false;
    FBDATA.startScenarios.find(function (s) { return s.id === 'heraclius_634'; }).hidden = false;
    const adopt = FB.adoptStartingRealm;
    FB.adoptStartingRealm = function (s,scenario) {
      const c = s.chars[s.player.charId], r = s.realms[scenario.rulerRealmId];
      window.__heracliusCourt = {person:c.id,family:[c.spouseId,c.childrenIds.slice()],
        treasury:r.treasury.gold,owners:Object.keys(s.owner).filter(function (id) { return s.owner[id] === r.id; }).sort()};
      FB.adoptStartingRealm = adopt;
      return adopt(s,scenario);
    };
  });
  const full = page.locator('#btn-choose-beginning');
  if (await full.isVisible()) await full.click();
  else await page.getByRole('button',{name:'New Game',exact:true}).click();
  if (code) {
    await page.locator('#btn-bm-seed').click();
    await page.locator('#ng-seed').fill('HERACLIUS634-634-heraclius_634-constantinople-m-Heraclius-standard');
    await page.locator('#ng-seed').press('Enter');
  } else {
    await page.locator('#bookmarklist [data-bookmark="634"]').click();
    await page.getByRole('button',{name:/^Heraclius at Constantinople /}).click();
  }
  await expect(page.locator('#cg-name')).toHaveValue('Heraclius');
  await expect(page.locator('#cg-name')).toHaveAttribute('readonly','');
  await page.getByRole('button',{name:'Begin Your Story',exact:true}).click();
  await page.getByRole('button',{name:'Begin',exact:true}).click();
  await page.evaluate(function () { FB.game.setPaused(true); });
}

test('634 keeps the complete Heraclius graph hidden and validation pure',async function ({page},info) {
  await useReleasedStartRules(page);
  await openGame(page,info);
  expect(await page.evaluate(function () {
    const b = FB.bookmark('634'), scenario = FBDATA.startScenarios.find(function (s) { return s.id === 'heraclius_634'; });
    if (!b || !scenario) throw new Error(JSON.stringify(FB.bookmarkRuntimeDiagnostics()));
    const before = JSON.stringify(FBDATA), rng = FB.getRngState(), uid = FB.getUidCounter();
    const faults = FB.validateBookmark(b);
    const tracks = FB.startStoryTracks(scenario,'constantinople',null,b);
    return {hidden:[b.hidden,scenario.hidden],available:FB.bookmarkAvailable('634'),faults:faults,
      tracks:tracks,locations:b.startLocations.heraclius_634,revision:b.revision,layout:b.settlementLayout,
      isolated:['476','568','867','1066'].every(function (id) {
        return !FB.startRuntimeReport(scenario,FB.bookmark(id)).available;
      }),yazdegerdHidden:FBDATA.startScenarios.some(function (s) { return s.id === 'yazdegerd_634' && s.hidden; }) && b.starts.indexOf('yazdegerd_634') < 0,
      stages:FB.stories.get('heraclius_agenda_634').declaration.stages.map(function (st) { return [st.id,st.year,st.season]; }),
      pure:before === JSON.stringify(FBDATA) && rng === FB.getRngState() && uid === FB.getUidCounter()};
  })).toEqual({hidden:[undefined,true],available:true,faults:[],tracks:['heraclius_agenda_634'],locations:['constantinople'],
    revision:'core_identities_v3',layout:'634_opening',isolated:true,yazdegerdHidden:true,
    stages:[['imperial_court_review_634',634,2],['eastern_holdings_review_634',634,2],['defense_diplomacy_review_634',634,2],['imperial_conclusion_634',634,2]],pure:true});
});

for (const code of [false,true]) {
  test('Heraclius adopts the existing court once through '+(code?'a code':'the picker'),async function ({page},info) {
    await beginHeraclius(page,info,code);
    expect(await page.evaluate(async function () {
      const s = FB.state, c = s.chars[s.player.charId], original = window.__heracliusCourt, r = s.realms.player;
      function snapshot(s) {
        return JSON.stringify([s.start,s.player.charId,s.player.gold,s.player.tier,s.owner,s.holder,
          s.stories,s.realms.player.treasury,Object.keys(s.chars).sort()]);
      }
      const before = snapshot(s);
      const saved = JSON.parse(FB.save.serialize());
      FBDATA.bookmarks['634'].hidden = true;
      FBDATA.startScenarios.find(function (row) { return row.id === 'heraclius_634'; }).hidden = true;
      await new Promise(function (resolve,reject) {
        FB.activateBookmark('867',null,function (error) { if (error) reject(error); else resolve(); });
      });
      await new Promise(function (resolve,reject) {
        FB.activateBookmark(saved.state.start.id,null,function (error) { if (error) reject(error); else resolve(); },
          {revision:saved.state.start.revision,geography:saved.state.start.geography});
      });
      FB.save.restore(saved);
      return {name:c.name,tier:s.player.tier,rank:r.rank,home:s.player.provinceId,
        community:[c.culture,c.religion],form:FB.governments.forRealm(FB.state,'player').id,source:s.start.rulerRealmId,
        adopted:c.id === original.person && !s.realms.byzantium_634 && FB.startRealmId(s,'byzantium_634') === 'player',
        unique:Object.values(s.chars).filter(function (p) { return p.name === 'Heraclius' && !p.dead; }).length,
        family:JSON.stringify([c.spouseId,c.childrenIds]) === JSON.stringify(original.family),
        treasury:!r.treasury && s.player.gold === original.treasury,
        owners:JSON.stringify(Object.keys(s.owner).filter(function (id) { return s.owner[id] === 'player'; }).sort()) === JSON.stringify(original.owners),
        site:FB.settlementsOf(s,'constantinople')[s.player.homeSettlement].site,
        agenda:s.stories.heraclius_agenda_634.subjectId === c.id,
        opening:c.born === 575 && !c.spouseId && c.childrenIds.length === 0 &&
          !s.stories.umar_agenda_634 && s.start.scenarioId === 'heraclius_634' &&
          s.date.year === 634 && s.date.season === 2 && s.date.day === 1,
        exclusions:!Object.values(s.religiousHeads || {}).some(Boolean) && Object.keys(s.localInstitutions || {}).length === 0,
        restored:before === snapshot(FB.state)};
    })).toEqual({name:'Heraclius',tier:7,rank:4,home:'constantinople',community:['greek','chalcedonian'],
      form:'roman_civic',source:'byzantium_634',adopted:true,unique:1,family:true,
      treasury:true,owners:true,site:'constantinople',agenda:true,opening:true,exclusions:true,restored:true});
  });
}

test('all four reviews conclude at Constantinople without time, rewards or replay',async function ({page},info) {
  await beginHeraclius(page,info,true);
  expect(await page.evaluate(function () {
    const id = 'heraclius_agenda_634';
    function resources(s) { return JSON.stringify([s.turn,s.date,s.player,s.owner,s.holder,s.realms,s.armies,s.authority]); }
    let s = FB.state;
    const definition = FB.stories.get(id).declaration;
    let unchanged = true;
    const applied = [], repeated = [], stages = [];
    const pure = JSON.stringify(s), rng = FB.getRngState(), uid = FB.getUidCounter();
    FB.stories.cards(s); FB.stories.choices(s,id); FB.stories.quote(s,id,'heraclius_review_court_634');
    const reviewPure = pure === JSON.stringify(s) && rng === FB.getRngState() && uid === FB.getUidCounter();
    definition.stages.forEach(function (stage,index) {
      stages.push(stage.id);
      const start = resources(s);
      const choice = stage.choices[index === 3 ? 0 : 1].id, quote = FB.stories.quote(s,id,choice);
      applied.push(FB.stories.apply(s,id,choice,quote));
      repeated.push(FB.stories.apply(s,id,choice,quote));
      unchanged = unchanged && start === resources(s);
      const record = JSON.stringify(s.stories[id]), saved = JSON.parse(FB.save.serialize());
      FB.save.restore(saved); s = FB.state;
      if (JSON.stringify(s.stories[id]) !== record) throw new Error('Agenda restore changed its decisions');
    });
    const complete = s.stories[id].status;
    const saved = JSON.parse(FB.save.serialize()), companion = 'opening_heraclius_634';
    delete saved.state.stories[id];
    saved.state.start.storyAttachments.tracks = saved.state.start.storyAttachments.tracks.filter(function (track) { return track !== id; });
    const before = JSON.stringify([FBDATA,FB.state,FB.getRngState(),FB.getUidCounter(),localStorage]), wire = JSON.stringify(saved);
    let rejected = false; try { FB.save.restore(saved); } catch (error) { rejected = true; }
    if (!rejected || wire !== JSON.stringify(saved) || before !== JSON.stringify([FBDATA,FB.state,FB.getRngState(),FB.getUidCounter(),localStorage]))
      throw new Error('An incomplete ruler graph must reject atomically');
    delete saved.state.stories[companion];
    saved.state.start.storyAttachments.tracks = saved.state.start.storyAttachments.tracks.filter(function (track) { return track !== companion; });
    FB.save.restore(saved); FB.stories.day(FB.state);
    if (FB.state.stories[companion]) throw new Error('Restore attached an absent opening companion');
    return {reviewPure:reviewPure,applied:applied,repeated:repeated,stages:stages,status:complete,
      unchanged:unchanged,absent:!FB.state.stories[id]};
  })).toEqual({reviewPure:true,applied:[true,true,true,true],repeated:[false,false,false,false],
    stages:['imperial_court_review_634','eastern_holdings_review_634','defense_diplomacy_review_634','imperial_conclusion_634'],
    status:'agenda_complete',unchanged:true,absent:true});
});

for (const reason of ['death','generation','stop']) {
  test('Heraclius archives the personal program on '+reason,async function ({page},info) {
    await beginHeraclius(page,info,true);
    expect(await page.evaluate(function (reason) {
      const s = FB.state, id = 'heraclius_agenda_634', story = FB.stories.get(id), t = s.stories[id];
      const quote = FB.stories.quote(s,id,'heraclius_review_court_634');
      if (reason === 'death') s.chars[s.player.charId].dead = true;
      else if (reason === 'generation') {
        s.realms.player.ruler.generation++;
        if (s.realms.player.succession) s.realms.player.succession.rulerGeneration++;
      }
      else FB.stories.apply(s,id,'agenda_stop_program',FB.stories.quote(s,id,'agenda_stop_program'));
      const stale = FB.stories.apply(s,id,quote.id,quote);
      story.day(s,t); const ended = JSON.stringify(t); story.day(s,t);
      const saved = JSON.parse(FB.save.serialize()); FB.save.restore(saved);
      return {stale:stale,status:t.status,once:ended === JSON.stringify(t),
        choices:FB.stories.choices(FB.state,id),restored:ended === JSON.stringify(FB.state.stories[id])};
    },reason)).toEqual({stale:false,status:reason === 'stop' ? 'agenda_stopped' : 'agenda_interrupted',once:true,choices:[],restored:true});
  });
}

test('a malformed Heraclius graph withholds the whole start while ordinary siblings remain valid',async function ({page},info) {
  test.skip(!info.project.name.endsWith('-served'),'Source interception requires a served origin.');
  const source = fs.readFileSync(path.resolve(__dirname,'../../../data/story_ruler_agendas_634.js'),'utf8');
  await page.route('**/data/story_ruler_agendas_634.js',function (route) {
    return route.fulfill({contentType:'application/javascript',body:source.replace("id:'heraclius_review_court_634'", "id:'agenda_stop_program'")});
  });
  await openGame(page,info);
  expect(await page.evaluate(function () {
    const b = FB.bookmark('634'), report = FB.bookmarkCompositions.sourceReports().find(function (r) { return r.id === 'autumn_634'; });
    return {world:report.published,unit:report.starts.find(function (r) { return r.id === 'heraclius_634'; }).ready,
      absent:!FB.stories.get('heraclius_agenda_634') && !FBDATA.storyInstances.heraclius_agenda_634 && !b.startLocations.heraclius_634 &&
        !FBDATA.startScenarios.some(function (s) { return s.id === 'heraclius_634'; }),
      faults:FB.validateBookmark(b),siblings:['umar_634','farmer_634','craftsman_634'].every(function (id) {
        return FBDATA.startScenarios.some(function (s) { return s.id === id; });
      })};
  })).toEqual({world:true,unit:false,absent:true,faults:[],siblings:true});
  await beginBookmarkFromTitle(page,'634','farmer_634');
});
