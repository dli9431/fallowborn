'use strict';
const fs = require('fs');
const path = require('path');
const {test,expect} = require('../support/fixture');
const {openGame,prepareGameContent} = require('../support/game/navigation');
const {restoreBookmark} = require('../support/game/bookmark-acceptance');
const {dependsOnRuntime} = require('../support/runtime-dependencies');

dependsOnRuntime(__filename,['data/bookmark_manifest.js',
  'index.html','data/starts_634_rulers.js','data/story_ruler_agendas_634.js',
  'data/bookmark_634.js','data/bookmark_634_courts.js','data/bookmark_634_scaffold_d.js',
  'data/bookmark_634_identities.js','data/bookmark_634_campaigns.js','data/story_campaigns_634.js',
  'data/bookmark_sources.js','data/story_instances.js','js/bookmark_composition.js','js/bookmark_sources.js',
  'js/starts.js','js/story_ruler_agenda.js','js/story_campaign.js','js/stories.js',
  'js/government_selection.js','js/government_administration.js','js/authority.js','js/treasury.js',
  'js/actions.js','js/wars.js','js/world.js','js/save.js','js/save_v4.js','js/mods.js','js/ui_modals.js'
]);

async function load(page,info) {
  await openGame(page,info);
  await prepareGameContent(page);
  expect(await page.evaluate(function () {
    const b = FB.bookmark('634','core_courts_v4');
    return b ? FB.validateBookmark(b) : FB.bookmarkRuntimeDiagnostics();
  })).toEqual([]);
}

async function start(page,info,id,loaded,picker) {
  if (!loaded) await load(page,info);
  const identity = await page.evaluate(function (id) {
    // Visibility changes belong only to this isolated acceptance context.
    const b = FBDATA.bookmarks['634']; b.revision = 'core_courts_v4';
    b.revisions.core_courts_v4.hidden = false;
    const row = FBDATA.startScenarios.find(function (r) { return r.id === id; }); row.hidden = false;
    const p = FB.startIdentity(row,FB.bookmark('634'));
    const adopt = FB.adoptStartingRealm;
    FB.adoptStartingRealm = function (s,scenario,options) {
      FB.adoptStartingRealm = adopt;
      const r = s.realms[scenario.rulerRealmId], c = s.chars[s.player.charId];
      window.originalCourt = {person:c.id,name:c.name,born:c.born,faith:c.religion,culture:c.culture,
        rank:r.rank,treasury:r.treasury.gold,family:[c.spouseId,c.childrenIds.slice()],
        owners:Object.keys(s.owner).filter(function (pid) { return s.owner[pid] === r.id; }).sort()};
      return adopt(s,scenario,options);
    };
    return {name:row.characterName,code:'COURT634-634-'+row.id+'-'+row.fixedProvinceId+'-m-'+row.characterName+
      '-standard-0-'+p.startCulture+'.'+p.startReligion};
  },id);
  const full = page.locator('#btn-choose-beginning');
  if (await full.isVisible()) await full.click();
  else await page.getByRole('button',{name:'New Game',exact:true}).click();
  if (picker) {
    await page.locator('#bookmarklist [data-bookmark="634"]').click();
    await page.getByRole('button',{name:new RegExp('^'+identity.name+' at ')}).click();
  } else {
    await page.locator('#btn-bm-seed').click();
    await page.locator('#ng-seed').fill(identity.code);
    await page.locator('#ng-seed').press('Enter');
  }
  await expect(page.locator('#cg-name')).toHaveValue(identity.name);
  await expect(page.locator('#cg-name')).toHaveAttribute('readonly','');
  await page.getByRole('button',{name:'Begin Your Story',exact:true}).click();
  await page.getByRole('button',{name:'Begin',exact:true}).click();
  await page.evaluate(function () {
    FB.game.setPaused(true);
    window.RA = {
      choose:function (id,choice) { return FB.stories.apply(FB.state,id,choice,FB.stories.quote(FB.state,id,choice)); },
      resources:function (s) { return JSON.stringify([s.turn,s.date,s.player,s.realms,s.chars,s.owner,s.holder,
        s.armies,s.wars,s.warHistory,s.authority,s.governmentSelection,s.governmentRecognition,s.population,s.log]); },
      permit:function (id) {
        const s = FB.state, d = FB.stories.definition(s,FB.stories.get(id).declaration);
        const nb = Object.keys(FB.world.adj[d.target.provinceId]).sort().find(function (pid) { return !FB.world.byId[pid].wasteland; });
        FB.transferProvince(s,nb,d.actor.realmId);
        const rec = FB.governmentSelection.state(s,d.actor.realmId);
        if (rec && rec.recognition) rec.recognition.consents = FB.governmentSelection.constituency(s,d.actor.realmId)
          .filter(function (m) { return m.active; }).map(function (m) { return m.id; });
      }
    };
  });
}

function persistedFacts() {
  const e = JSON.parse(FB.save.serialize()), s = FB.save.expandedSnapshot(e.state);
  function ordered(v) {
    if (Array.isArray(v)) return v.map(ordered);
    if (!v || typeof v !== 'object') return v;
    const out = {}; Object.keys(v).sort().forEach(function (k) { out[k] = ordered(v[k]); }); return out;
  }
  return {mods:e.mods,rng:e.rng >>> 0,uid:e.uid,facts:JSON.stringify(ordered([
    s.start,s.player,s.date,s.turn,s.owner,s.holder,s.chars,s.realms,s.armies,s.stories,
    s.wars,s.warHistory,s.authority,s.governmentSelection,s.governmentRecognition,s.population,s.log
  ]))};
}
async function roundTrip(page) {
  const before = await page.evaluate(persistedFacts);
  for (let i = 0; i < 2; i++) {
    await restoreBookmark(page,await page.evaluate(function () { return FB.save.serialize(); }));
    expect(await page.evaluate(persistedFacts)).toEqual(before);
  }
}

test('assembled courts select exactly two four-review agendas without changing earlier worlds or visibility',async function ({page},info) {
  await load(page,info);
  expect(await page.evaluate(function () {
    const b = FB.bookmark('634','core_courts_v4'), fresh = FB.bookmark('634');
    const before = JSON.stringify(FBDATA), rng = FB.getRngState(), uid = FB.getUidCounter();
    const rulers = FBDATA.startScenarios.filter(function (r) { return r.bookmarkIds && r.bookmarkIds.indexOf('634') >= 0 && r.rulerRealmId; });
    const rows = rulers.map(function (r) {
      const tracks = FB.startStoryTracks(r,r.fixedProvinceId,null,b), def = FB.stories.get(tracks[0]).declaration;
      const offered = FB.startSelectorReport(r,b);
      return {id:r.id,hidden:r.hidden,offered:offered.valid && offered.matches,tracks:tracks,
        dates:def.stages.map(function (st) { return [st.year,st.season]; }),
        alternatives:def.stages.every(function (st) { return st.choices.some(function (c) { return c.operation === 'agenda_priority'; }); }),
        earlier:FB.bookmarkRevisions('634').filter(function (w) { return w.revision !== b.revision; }).every(function (w) {
          return JSON.stringify(FB.startTracks(r,r.fixedProvinceId,w)) === JSON.stringify(r.tracks);
        }),identity:FB.startIdentity(r,b).governmentForm};
    });
    const faults = FB.validateBookmark(b);
    return {fresh:fresh.revision,hidden:b.hidden,rows:rows,faults:faults,
      excluded:!FB.stories.get('yazdegerd_agenda_634') && !FBDATA.startScenarios.some(function (r) { return /yazdegerd/.test(r.id); }),
      pure:before === JSON.stringify(FBDATA) && rng === FB.getRngState() && uid === FB.getUidCounter()};
  })).toEqual({fresh:'core_identities_v3',hidden:true,rows:[
    {id:'umar_634',hidden:true,offered:true,tracks:['umar_court_agenda_634'],dates:Array(4).fill([634,2]),alternatives:true,earlier:true,identity:'medinan_selection_634'},
    {id:'heraclius_634',hidden:true,offered:true,tracks:['heraclius_court_agenda_634'],dates:Array(4).fill([634,2]),alternatives:true,earlier:true,identity:'administrative_monarchy'}
  ],faults:[],excluded:true,pure:true});
});

for (const who of ['umar','heraclius']) {
  test(who+' adopts the actual assembled incumbent and can finish all four reviews peacefully',async function ({page},info) {
    await start(page,info,who+'_634',false,who === 'heraclius');
    expect(await page.evaluate(function (who) {
      const s = FB.state, original = window.originalCourt, c = s.chars[s.player.charId], r = s.realms.player;
      const id = who+'_court_agenda_634', story = FB.stories.get(id), t = s.stories[id];
      const initial = RA.resources(s), rng = FB.getRngState(), uid = FB.getUidCounter();
      FB.stories.cards(s); story.status(s,t); FB.stories.choices(s,id);
      const pure = initial === RA.resources(s) && rng === FB.getRngState() && uid === FB.getUidCounter();
      const applied = [], repeated = [];
      story.declaration.stages.forEach(function (st,index) {
        const choice = st.choices.find(function (c) { return index === 3 ? c.operation === 'agenda_finish' : c.label === 'Retain present arrangements'; });
        const q = FB.stories.quote(s,id,choice.id);
        applied.push(FB.stories.apply(s,id,choice.id,q)); repeated.push(FB.stories.apply(s,id,choice.id,q));
      });
      return {name:c.name,person:c.id === original.person,born:c.born,community:[c.culture,c.religion],
        family:JSON.stringify([c.spouseId,c.childrenIds]) === JSON.stringify(original.family),
        rank:r.rank,tier:s.player.tier,treasury:r.treasury.gold === original.treasury,privateFunds:s.player.gold,
        source:s.start.rulerRealmId,alias:!s.realms[s.start.rulerRealmId],
        owners:JSON.stringify(Object.keys(s.owner).filter(function (pid) { return s.owner[pid] === 'player'; }).sort()) === JSON.stringify(original.owners),
        binding:t.subjectId === c.id && t.generation === FB.realmRulerGeneration(s,'player'),
        date:s.date,form:FB.governments.forRealm(s,'player').id,home:s.player.provinceId,
        attachments:s.start.storyAttachments.tracks,applied:applied,repeated:repeated,pure:pure,
        status:t.status,unchanged:initial === RA.resources(s),
        noCommitment:['syrian_front_634','iraqi_front_634'].every(function (f) { return s.stories[f].playerDecision === null; })};
    },who)).toEqual({name:who === 'umar' ? 'Umar' : 'Heraclius',person:true,born:who === 'umar' ? 582 : 575,
      community:who === 'umar' ? ['arabic','medinan_court_634'] : ['greek','chalcedonian'],family:true,
      rank:4,tier:7,treasury:true,privateFunds:100,source:who === 'umar' ? 'rashidun_634' : 'byzantium_634',alias:true,
      owners:true,binding:true,date:{year:634,season:2,day:1},form:who === 'umar' ? 'medinan_selection_634' : 'administrative_monarchy',
      home:who === 'umar' ? 'medina' : 'constantinople',attachments:[who+'_court_agenda_634','opening_'+who+'_court_634'],
      applied:[true,true,true,true],repeated:[false,false,false,false],pure:true,status:'agenda_complete',unchanged:true,noCommitment:true});
    await roundTrip(page);
  });
}

test('the compact agenda shows its original portrait and retains the scrolled review through character and decision returns',async function ({page},info) {
  await page.setViewportSize({width:390,height:650});
  await start(page,info,'umar_634');
  const person = await page.evaluate(function () {
    RA.choose('umar_court_agenda_634','umar_keep_accounts');
    FB.ui.showStorySheet('umar_court_agenda_634');
    return FB.state.player.charId;
  });
  const link = page.locator('[data-story-person="'+person+'"]');
  await expect(link.locator('canvas.pface')).toHaveCount(1);
  await expect(page.locator('#gm-body p').filter({hasText:/^The Syrian frontier:/})).toHaveCount(1);
  await expect(page.locator('#gm-body')).toContainText('Available public funds:');
  await link.focus();
  const scroll = await page.evaluate(function () { const b = document.getElementById('gm-body'); b.scrollTop = 120; return b.scrollTop; });
  expect(scroll).toBeGreaterThan(0);
  await page.keyboard.press('Enter');
  await expect(page.locator('#cm-close')).toBeVisible();
  await page.locator('#cm-close').click();
  await expect(page.locator('#gm-title')).toHaveText('Umar: mandate and frontiers');
  await expect.poll(function () { return page.locator('#gm-body').evaluate(function (b) { return b.scrollTop; }); }).toBe(scroll);
  await expect(link).toBeFocused();
  const retain = page.locator('[data-story-choice="umar_keep_syria"]');
  await retain.focus();
  const reviewScroll = await page.locator('#gm-body').evaluate(function (b) { return b.scrollTop; });
  await page.keyboard.press('Enter');
  await expect(page.locator('#gm-story-confirm')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('#gm-title')).toHaveText('Umar: mandate and frontiers');
  await expect.poll(function () { return page.locator('#gm-body').evaluate(function (b) { return b.scrollTop; }); }).toBe(reviewScroll);
  await expect(retain).toBeFocused();
});

test('Umar delegates independent frontier decisions to ordinary war with its actual costs and stale gates',async function ({page},info) {
  await start(page,info,'umar_634');
  expect(await page.evaluate(function () {
    const s = FB.state, id = 'umar_court_agenda_634';
    RA.choose(id,'umar_keep_accounts');
    const blocked = FB.stories.quote(s,id,'umar_face_syria');
    const source = FB.stories.get('syrian_front_634');
    const liveBlocker = !blocked.allowed && FB.stories.get(id).blocker(s,s.stories[id],blocked.reason) ===
      source.blocker(s,s.stories.syrian_front_634,blocked.facts.source.reason);
    const before = RA.resources(s), q = FB.stories.quote(s,id,'umar_decline_syria');
    const pure = before === RA.resources(s);
    const decline = FB.stories.apply(s,id,'umar_decline_syria',q);
    RA.permit('iraqi_front_634');
    const direct = FB.stories.quote(s,'iraqi_front_634','face_campaign');
    const reviewed = FB.stories.quote(s,id,'umar_face_iraq');
    s.player.gold--;
    const changed = RA.resources(s), stale = !FB.stories.apply(s,id,'umar_face_iraq',reviewed) && changed === RA.resources(s);
    const fresh = FB.stories.quote(s,id,'umar_face_iraq'), story = FB.stories.get(id);
    const lines = story.review(s,s.stories[id],'umar_face_iraq',fresh);
    const owner = JSON.stringify(s.owner), population = JSON.stringify(s.population), funds = [s.player.gold,s.realms.player.treasury.gold];
    const prestige = s.player.prestige, commit = FB.stories.apply(s,id,'umar_face_iraq',fresh);
    const rec = s.stories.iraqi_front_634, war = FB.ordinaryWarById(s,rec.warId);
    return {liveBlocker:liveBlocker,pure:pure,decline:decline,source:s.stories.syrian_front_634.reason,allowed:direct.allowed && fresh.allowed,
      delegated:JSON.stringify(reviewed.facts.source) === JSON.stringify(direct),stale:stale,commit:commit,
      costs:lines.indexOf(FB.T('Prestige: {change}.',{change:-20})) >= 0 && lines.some(function (l) { return l.indexOf('180') >= 0; }),
      retry:FB.stories.apply(s,id,'umar_face_iraq',fresh),phase:rec.phase,attacker:war.attacker,defender:war.defender,
      unchanged:owner === JSON.stringify(s.owner) && population === JSON.stringify(s.population) &&
        JSON.stringify(funds) === JSON.stringify([s.player.gold,s.realms.player.treasury.gold]),
      prestige:s.player.prestige-prestige,deadline:rec.deadline === rec.startedTurn+180,
      finish:RA.choose(id,'umar_finish_court')};
  })).toEqual({liveBlocker:true,pure:true,decline:true,source:'player_declined',allowed:true,delegated:true,stale:true,commit:true,costs:true,
    retry:false,phase:'started',attacker:'player',defender:'sasanian_634',unchanged:true,prestige:-20,deadline:true,finish:true});
  await roundTrip(page);
});

test('Heraclius faces the Syrian opportunity as its actual defender without a grant or historical victory',async function ({page},info) {
  await start(page,info,'heraclius_634');
  expect(await page.evaluate(function () {
    const s = FB.state, id = 'heraclius_court_agenda_634';
    const appointments = FB.stories.quote(s,id,'heraclius_observe_appointments');
    const officeTruth = appointments.allowed === (appointments.facts.source.rows.length > 0);
    RA.choose(id,'heraclius_keep_administration'); RA.choose(id,'heraclius_keep_accounts');
    RA.permit('syrian_front_634');
    const q = FB.stories.quote(s,id,'heraclius_face_syria'), owner = JSON.stringify(s.owner), population = JSON.stringify(s.population);
    const funds = [s.player.gold,s.realms.player.treasury.gold], applied = FB.stories.apply(s,id,'heraclius_face_syria',q);
    const r = s.stories.syrian_front_634, w = FB.ordinaryWarById(s,r.warId);
    return {officeTruth:officeTruth,allowed:q.allowed,applied:applied,attacker:w.attacker,defender:w.defender,
      phase:r.phase,result:r.result,deadline:r.deadline === r.startedTurn+360,
      unchanged:owner === JSON.stringify(s.owner) && population === JSON.stringify(s.population) &&
        JSON.stringify(funds) === JSON.stringify([s.player.gold,s.realms.player.treasury.gold]),
      unrelated:s.stories.iraqi_front_634.playerDecision === null,finish:RA.choose(id,'heraclius_finish_court')};
  })).toEqual({officeTruth:true,allowed:true,applied:true,attacker:'rashidun_634',defender:'player',phase:'started',result:null,
    deadline:true,unchanged:true,unrelated:true,finish:true});
  await roundTrip(page);
});

for (const who of ['umar','heraclius']) {
  test(who+' shows live source ownership, records a diversion truthfully and preserves the pending review',async function ({page},info) {
    await start(page,info,who+'_634');
    expect(await page.evaluate(function (who) {
      const s = FB.state, id = who+'_court_agenda_634', story = FB.stories.get(id);
      if (who === 'umar') RA.choose(id,'umar_keep_accounts');
      else { RA.choose(id,'heraclius_keep_administration'); RA.choose(id,'heraclius_keep_accounts'); }
      const before = RA.resources(s), rng = FB.getRngState(), uid = FB.getUidCounter(), t = s.stories[id];
      const initial = story.status(s,t).lines;
      const pure = before === RA.resources(s) && rng === FB.getRngState() && uid === FB.getUidCounter();
      const old = FB.stories.quote(s,id,who === 'umar' ? 'umar_decline_syria' : 'heraclius_decline_syria');
      FB.transferProvince(s,'damascus','sasanian_634');
      FB.stories.get('syrian_front_634').day(s,s.stories.syrian_front_634);
      const lines = story.status(s,t).lines, unchanged = RA.resources(s);
      const stale = !FB.stories.apply(s,id,old.id,old) && unchanged === RA.resources(s);
      const record = RA.choose(id,who+'_record_syria');
      return {pure:pure,initialFunds:initial.indexOf(FB.T('Available public funds: {money:funds}. Private purse: {money:privateFunds}.',
        {funds:FB.treasuryAvailable(s,'player'),privateFunds:s.player.gold})) >= 0,
        controller:lines.indexOf(FB.T('Objective: {province}. Current controller: {realm}.',
          {province:FB.world.byId.damascus.name,realm:s.realms.sasanian_634.name})) >= 0,
        diverted:lines.indexOf(FB.T('{story}: {status}.',{story:FB.stories.get('syrian_front_634').title(s),status:FB.T('History took another course')})) >= 0,
        stale:stale,result:s.stories.syrian_front_634.result,record:record,unchanged:unchanged === RA.resources(s),
        armies:s.stories.syrian_front_634.warId === null};
    },who)).toEqual({pure:true,initialFunds:true,controller:true,diverted:true,stale:true,result:'diverted',record:true,unchanged:true,armies:true});
    await roundTrip(page);
  });

  test(who+' binds the original ruler generation, interrupts once and never attaches an absent agenda on restore',async function ({page},info) {
    await start(page,info,who+'_634');
    expect(await page.evaluate(function (who) {
      const id = who+'_court_agenda_634', story = FB.stories.get(id), base = JSON.parse(JSON.stringify(FB.state));
      const checks = ['death','generation','jurisdiction'].map(function (reason) {
        const s = JSON.parse(JSON.stringify(base)), t = s.stories[id]; FB.invalidateRealmCache();
        const q = story.quote(s,t,story.declaration.stages[0].choices[0].id);
        if (reason === 'death') s.chars[s.player.charId].dead = true;
        else if (reason === 'generation') {
          s.realms.player.ruler.generation++;
          if (s.realms.player.succession) s.realms.player.succession.rulerGeneration++;
        }
        else Object.keys(s.owner).forEach(function (pid) { if (s.owner[pid] === 'player') s.owner[pid] = 'sasanian_634'; });
        FB.invalidateRealmCache();
        const refused = !story.apply(s,t,q.id,q); story.day(s,t);
        const ended = JSON.stringify(t); story.day(s,t); story.validate(t,s);
        return refused && t.status === 'agenda_interrupted' && ended === JSON.stringify(t) && story.choices(s,t).length === 0;
      });
      FB.invalidateRealmCache();
      const stop = RA.choose(id,'agenda_stop_program'), saved = JSON.parse(FB.save.serialize());
      FB.save.restore(saved);
      const stopped = FB.state.stories[id].status === 'agenda_stopped';
      const absent = JSON.parse(FB.save.serialize()), companion = 'opening_'+who+'_court_634';
      delete absent.state.stories[id];
      absent.state.start.storyAttachments.tracks = absent.state.start.storyAttachments.tracks.filter(function (track) { return track !== id; });
      const before = JSON.stringify([FBDATA,FB.state,FB.getRngState(),FB.getUidCounter(),localStorage]), wire = JSON.stringify(absent);
      let rejected = false; try { FB.save.restore(absent); } catch (error) { rejected = true; }
      if (!rejected || wire !== JSON.stringify(absent) || before !== JSON.stringify([FBDATA,FB.state,FB.getRngState(),FB.getUidCounter(),localStorage]))
        throw new Error('An incomplete ruler graph must reject atomically');
      delete absent.state.stories[companion];
      absent.state.start.storyAttachments.tracks = absent.state.start.storyAttachments.tracks.filter(function (track) { return track !== companion; });
      FB.save.restore(absent); FB.stories.day(FB.state);
      return {checks:checks,stop:stop,stopped:stopped,absent:!FB.state.stories[id] && !FB.state.stories[companion]};
    },who)).toEqual({checks:[true,true,true],stop:true,stopped:true,absent:true});
    await roundTrip(page);
  });
}

test('independent ordinary JSON reviews retain exact commitments, reject malformed sources purely and keep a future stop route',async function ({page},info) {
  await load(page,info);
  const fixturePath = path.resolve(__dirname,'../fixtures/authoring/634-court-agenda.json');
  const mod = JSON.parse(fs.readFileSync(fixturePath,'utf8'));
  expect(await page.evaluate(function (mod) {
    const before = JSON.stringify(FBDATA), rng = FB.getRngState(), uid = FB.getUidCounter();
    const valid = FB.mods.validate(mod), invalid = [];
    function rejected(change) { const m = JSON.parse(JSON.stringify(mod)); change(m.storyInstances.umar_court_agenda_634); invalid.push(FB.mods.validate(m).length > 0); }
    rejected(function (d) { d.stages[0].choices[0].choiceId = 'invent_victory'; });
    rejected(function (d) { d.stages[0].choices[0].amount = 1; });
    rejected(function (d) { d.requires = []; });
    rejected(function (d) { d.stages[0].choices.pop(); });
    return {valid:valid,invalid:invalid,pure:before === JSON.stringify(FBDATA) && rng === FB.getRngState() && uid === FB.getUidCounter()};
  },mod)).toEqual({valid:[],invalid:[true,true,true,true],pure:true});
  await page.evaluate(function () { FB.ui.showMods(); });
  await page.locator('#modfile').setInputFiles(fixturePath);
  await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded'}),page.locator('#mod-apply').click()]);
  await prepareGameContent(page);
  await start(page,info,'umar_634',true);
  expect(await page.evaluate(function () {
    const s = FB.state, id = 'umar_court_agenda_634', before = RA.resources(s);
    const decline = RA.choose(id,'import_decline_iraq');
    return {decline:decline,iraq:s.stories.iraqi_front_634.reason,syria:s.stories.syrian_front_634.playerDecision,
      choices:FB.stories.choices(s,id).map(function (c) { return c.id; }),future:FB.stories.quote(s,id,'import_finish_accounts').allowed,
      resources:before === RA.resources(s)};
  })).toEqual({decline:true,iraq:'player_declined',syria:null,choices:['agenda_stop_program'],future:false,resources:true});
  await roundTrip(page);
  expect(await page.evaluate(function () {
    return RA.choose('umar_court_agenda_634','agenda_stop_program') && FB.state.stories.umar_court_agenda_634.status === 'agenda_stopped';
  })).toBe(true);
  await roundTrip(page);
  const saved = await page.evaluate(function () { return FB.save.serialize(); });
  mod.storyInstances.umar_court_agenda_634.stages[0].text = 'A changed Iraqi review under the same mod name.';
  await page.evaluate(function () { FB.ui.showMods(); });
  await page.locator('#modfile').setInputFiles({name:'634-court-agenda.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(mod),'utf8')});
  await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded'}),page.locator('#mod-apply').click()]);
  await prepareGameContent(page);
  expect(await page.evaluate(async function (text) {
    const e = JSON.parse(text);
    await new Promise(function (resolve,reject) {
      FB.activateBookmark(e.state.start.id,null,function (error) { if (error) reject(error); else resolve(); },
        {revision:e.state.start.revision,geography:e.state.start.geography});
    });
    const before = JSON.stringify([FB.state,FBDATA]), rng = FB.getRngState(), uid = FB.getUidCounter();
    let rejected = false;
    try { FB.save.restore(e); } catch (error) { rejected = /mod|content|signature/i.test(error.message); }
    return {rejected:rejected,pure:before === JSON.stringify([FB.state,FBDATA]) && rng === FB.getRngState() && uid === FB.getUidCounter()};
  },saved)).toEqual({rejected:true,pure:true});
});
