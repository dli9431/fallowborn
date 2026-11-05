'use strict';
const fs = require('fs');
const path = require('path');
const {test,expect} = require('../support/fixture');
const {openGame,prepareGameContent} = require('../support/game/navigation');
const {useReleasedStartRules} = require('../support/game/released-starts');
const {beginBookmarkFromTitle} = require('../support/game/bookmark-acceptance');
const {dependsOnRuntime} = require('../support/runtime-dependencies');

dependsOnRuntime(__filename,[
  'index.html','data/starts_634_rulers.js','data/story_ruler_agendas_634.js',
  'data/starts_634_ordinary.js','data/bookmark_634.js','data/bookmark_634_identities.js',
  'data/bookmark_634_scaffold_a.js','data/bookmark_634_scaffold_b.js',
  'data/bookmark_634_scaffold_c.js','data/bookmark_634_scaffold_d.js',
  'data/bookmark_sources.js','data/story_instances.js','data/starts.js',
  'js/bookmark_sources.js','js/bookmark_composition.js','js/starts.js',
  'js/stories.js','js/story_ruler_agenda.js','js/main.js','js/world.js',
  'js/government_selection.js','js/government_elective.js','js/treasury.js',
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
      }),held:!FB.stories.get('yazdegerd_agenda_634') && !FBDATA.startScenarios.some(function (s) { return s.id === 'yazdegerd_634'; }),
      stages:FB.stories.get('umar_agenda_634').declaration.stages.map(function (st) { return [st.id,st.year,st.season]; }),
      pure:before === JSON.stringify(FBDATA) && rng === FB.getRngState() && uid === FB.getUidCounter()};
  })).toEqual({hidden:[undefined,true],available:true,faults:[],tracks:['umar_agenda_634'],locations:['medina'],
    revision:'ordinary_settlement_v2',layout:'634_opening',isolated:true,held:true,
    stages:[['accession_review_634',634,2],['syrian_review_634',634,2],['iraqi_review_634',634,2],['mandate_conclusion_634',634,2]],pure:true});
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
    const saved = JSON.parse(FB.save.serialize()); delete saved.state.stories[id];
    saved.state.start.storyAttachments.tracks = saved.state.start.storyAttachments.tracks.filter(function (track) { return track !== id; });
    FB.save.restore(saved); FB.stories.day(FB.state);
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
      }),held:!FB.stories.get('yazdegerd_agenda_634') && !FBDATA.startScenarios.some(function (s) { return s.id === 'yazdegerd_634'; }),
      stages:FB.stories.get('heraclius_agenda_634').declaration.stages.map(function (st) { return [st.id,st.year,st.season]; }),
      pure:before === JSON.stringify(FBDATA) && rng === FB.getRngState() && uid === FB.getUidCounter()};
  })).toEqual({hidden:[undefined,true],available:true,faults:[],tracks:['heraclius_agenda_634'],locations:['constantinople'],
    revision:'ordinary_settlement_v2',layout:'634_opening',isolated:true,held:true,
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
    const saved = JSON.parse(FB.save.serialize()); delete saved.state.stories[id];
    saved.state.start.storyAttachments.tracks = saved.state.start.storyAttachments.tracks.filter(function (track) { return track !== id; });
    FB.save.restore(saved); FB.stories.day(FB.state);
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
