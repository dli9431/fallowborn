'use strict';
const {test,expect} = require('../support/fixture');
const {openGame} = require('../support/game/navigation');
const {openCrazyGame} = require('../support/game/crazygames-title');
const {mockCrazyGames} = require('../support/crazygames');
const {dependsOnRuntime} = require('../support/runtime-dependencies');
const examples = {harbor:require('../fixtures/authoring/existing-person-harbor.json'),
  dune:require('../fixtures/authoring/existing-person-dune.json')};

dependsOnRuntime(__filename,['index.html','js/bookmark_composition.js','js/mods.js','js/world.js',
  'js/starts.js','js/stories.js','js/story_household.js','js/story_campaign.js','js/model.js','js/messages.js',
  'js/governments.js','js/government_lineage.js','js/title_ids.js','js/religion.js','js/systems.js',
  'js/main.js','js/crazygames.js','js/lexicon.js','js/ui_misc.js','js/ui_modals.js',
  'data/bookmarks.js','data/starts.js','data/geographies.js','data/cultures.js',
  'data/settlements.js','data/settlements_real.js','data/political_institutions.js','data/eras.js']);

// These are two independently authored ordinary JSON examples. The adapter
// supplies ownership envelopes only; engine rules still validate every record.
function composition(prefix) {
  const mod = JSON.parse(JSON.stringify(examples[prefix]));
  const bookmark = mod.bookmarks[prefix + '_world'];
  bookmark.starts = [];
  const catalogs = {};
  Object.keys(mod).forEach(function (key) {
    if (['name','bookmarks','startScenarios'].indexOf(key) < 0) catalogs[key] = mod[key];
  });
  return {id:prefix + '_composition',source:'fixtures/authoring/existing-person-' + prefix + '.json',
    bookmark:bookmark,catalogs:catalogs,starts:mod.startScenarios.map(function (definition) {
      return {definition:definition,source:prefix + ':' + definition.id};
    })};
}

for (const crazy of [false,true]) {
  test('independent detached compositions publish canonical catalogues on ' + (crazy ? 'CrazyGames' : 'standard'),
    async function ({page},info) {
      if (crazy) {
        await mockCrazyGames(page);
        await page.addInitScript(function () {
          window.FB_DISTRIBUTION = 'crazygames'; window.FB_CRAZYGAMES_STORAGE = 'localstorage';
        });
        await openCrazyGame(page,info);
      } else await openGame(page,info);
      const result = await page.evaluate(function (inputs) {
        const rng = FB.getRngState(), uid = FB.getUidCounter(), state = FB.state, world = FB.world;
        const sourceSiteId = Object.keys(FBDATA.settlementSites).find(function (id) {
          return FBDATA.settlementSites[id].names;
        });
        const sourceSite = FBDATA.settlementSites[sourceSiteId], sourceText = JSON.stringify(sourceSite);
        const records = inputs.map(function (input,index) {
          const prefix = index ? 'dune' : 'harbor', formId = prefix + '_monarchy';
          const form = JSON.parse(JSON.stringify(FBDATA.governmentForms.regnum));
          if (Object.prototype.hasOwnProperty.call(form,'id')) form.id = formId;
          input.catalogs.governmentForms = {}; input.catalogs.governmentForms[formId] = form;
          input.bookmark.realms[0].government = formId;
          input.starts[2].definition.governmentForm = formId;
          const layout = {};
          input.bookmark.provinces.forEach(function (province) {
            if (province.settlements) { layout[province.id] = province.settlements; delete province.settlements; }
          });
          input.catalogs.settlementLayouts = {}; input.catalogs.settlementLayouts[input.bookmark.id] = layout;
          input.catalogs.settlementSites = {};
          input.catalogs.settlementSites[sourceSiteId] = {x:sourceSite.x,y:sourceSite.y};
          const before = JSON.stringify(FBDATA), messages = JSON.stringify(FB.englishMessages()), stories = FB.stories.list();
          const englishRecords = Object.assign({},FB.englishMessages());
          const ticket = FB.bookmarkCompositions.prepare(input), report = ticket.report(), preview = ticket.preview();
          const detached = before === JSON.stringify(FBDATA) && messages === JSON.stringify(FB.englishMessages()) &&
            stories.every(function (story,i) { return FB.stories.list()[i] === story; });
          const importFaults = preview && FB.mods.validate(preview);
          if (preview) preview.bookmarks[input.bookmark.id].realms = [];
          report.ready = false;
          const published = ticket.publish(), installed = FBDATA;
          const repeatedTicket = ticket.publish();
          const storiesAfter = FB.stories.list();
          const repeated = FB.bookmarkCompositions.prepare(input).publish();
          return {detached:detached,importFaults:importFaults,published:published,repeatedTicket:repeatedTicket,
            repeated:repeated,worldFaults:FB.validateBookmark(FB.bookmark(input.bookmark.id)),
            starts:FBDATA.startScenarios.filter(function (s) { return s.bookmarkIds && s.bookmarkIds[0] === input.bookmark.id; })
              .map(function (s) { return {id:s.id,valid:FB.startRuntimeReport(s,FB.bookmark(input.bookmark.id)).valid}; }),
            layout:!!FBDATA.settlementLayouts[input.bookmark.id],form:FB.governments.problems(formId),
            noRepeatMutation:installed === FBDATA && storiesAfter.every(function (story,i) { return FB.stories.list()[i] === story; }),
            unownedMessages:Object.keys(englishRecords).every(function (key) { return FB.englishMessages()[key] === englishRecords[key]; }),
            scenarioAlias:FB.game.SCENARIOS === FBDATA.startScenarios};
        });
        return {records:records,sitePreserved:FBDATA.settlementSites[sourceSiteId] === sourceSite &&
          JSON.stringify(sourceSite) === sourceText,pureCampaign:rng === FB.getRngState() && uid === FB.getUidCounter() &&
          state === FB.state && world === FB.world};
      },[composition('harbor'),composition('dune')]);
      expect(result.sitePreserved).toBe(true);
      expect(result.pureCampaign).toBe(true);
      result.records.forEach(function (row) {
        expect(row).toMatchObject({detached:true,importFaults:[],worldFaults:[],layout:true,form:[],
          noRepeatMutation:true,unownedMessages:true,scenarioAlias:true,published:{ready:true,published:true,reused:false},
          repeated:{ready:true,published:true,reused:true}});
        expect(row.repeatedTicket).toEqual(row.published);
        expect(row.published.starts).toHaveLength(3);
        expect(row.published.starts.every(function (start) { return start.ready && !start.faults.length; })).toBe(true);
        expect(row.starts).toHaveLength(3);
        expect(row.starts.every(function (start) { return start.valid; })).toBe(true);
      });
    });
}

test('a rejected start withholds its story graph and dependent starts while healthy siblings publish',async function ({page},info) {
  await openGame(page,info);
  const result = await page.evaluate(function (input) {
    const base = input.catalogs.storyInstances.harbor_existing_track;
    const bad = input.starts[0], good = input.starts[1], dependent = JSON.parse(JSON.stringify(good));
    delete input.catalogs.storyInstances;
    function graph(unit,id) {
      const declaration = JSON.parse(JSON.stringify(base)); declaration.id = id;
      unit.storyInstances = {}; unit.storyInstances[id] = declaration; unit.definition.tracks = [id];
      return declaration;
    }
    graph(bad,'composition_rejected_track').type = 'composition_missing_type';
    graph(good,'composition_healthy_track');
    dependent.definition.id = 'composition_dependent'; dependent.requires = [bad.definition.id];
    graph(dependent,'composition_dependent_track');
    // Dependency order is explicit and independent of declaration order.
    input.starts = [dependent,good,bad,input.starts[2]];
    const before = JSON.stringify(FBDATA), english = JSON.stringify(FB.englishMessages());
    const rng = FB.getRngState(), uid = FB.getUidCounter();
    const ticket = FB.bookmarkCompositions.prepare(input), report = ticket.report();
    const detached = before === JSON.stringify(FBDATA) && english === JSON.stringify(FB.englishMessages());
    const payload = ticket.preview(), importFaults = payload && FB.mods.validate(payload), published = ticket.publish();
    return {report:report,published:published,detached:detached,importFaults:importFaults,
      world:!!FBDATA.bookmarks.harbor_world,worldFaults:FB.validateBookmark(FB.bookmark('harbor_world')),
      rejectedAbsent:!FBDATA.startScenarios.some(function (s) { return s.id === bad.definition.id || s.id === dependent.definition.id; }) &&
        !FBDATA.storyInstances.composition_rejected_track && !FBDATA.storyInstances.composition_dependent_track &&
        !FB.stories.get('composition_rejected_track') && !FB.englishMessage('news.composition.composition_rejected_track'),
      healthy:!!FB.stories.get('composition_healthy_track'),
      starts:FBDATA.bookmarks.harbor_world.starts,unchangedIds:rng === FB.getRngState() && uid === FB.getUidCounter()};
  },composition('harbor'));
  expect(result).toMatchObject({world:true,detached:true,importFaults:[],worldFaults:[],rejectedAbsent:true,
    healthy:true,unchangedIds:true,published:{published:true}});
  expect(result.report.starts.map(function (s) { return s.ready; })).toEqual([false,true,false,true]);
  expect(result.report.starts[0].faults.join(' ')).toContain('Required start unit was rejected');
  expect(result.report.starts[2]).toMatchObject({source:'harbor:harbor_existing_household'});
  expect(result.report.starts[2].faults.join(' ')).toContain('unknown story type');
  expect(result.starts).toEqual(['harbor_ordinary_household','harbor_existing_ruler']);
});

test('bad worlds, ownership conflicts and dangling bindings publish no products',async function ({page},info) {
  await openGame(page,info);
  const result = await page.evaluate(function (original) {
    const live = FBDATA, before = JSON.stringify(live), english = JSON.stringify(FB.englishMessages()), stories = FB.stories.list();
    const rng = FB.getRngState(), uid = FB.getUidCounter(), state = FB.state, world = FB.world;
    function attempt(change) {
      const input = JSON.parse(JSON.stringify(original)); change(input);
      const ticket = FB.bookmarkCompositions.prepare(input), result = ticket.publish();
      return {result:result,preview:ticket.preview()};
    }
    const results = [
      attempt(function (input) { input.bookmark.realms[0].capital = 'composition_missing_capital'; }),
      attempt(function (input) {
        const id = Object.keys(FBDATA.settlementSites)[0], old = FBDATA.settlementSites[id];
        input.catalogs.settlementSites = {}; input.catalogs.settlementSites[id] = {x:old.x + 1,y:old.y};
      }),
      attempt(function (input) { input.catalogs.cultures.frankish = {name:'Conflicting declaration'}; }),
      attempt(function (input) { input.bookmark.starts = ['composition_missing_start']; }),
      attempt(function (input) { input.bookmark.starts = [input.starts[0].definition.id]; }),
      attempt(function (input) { input.catalogs = null; }),
      attempt(function (input) { input.starts.push(input.starts[0]); })
    ];
    return {results:results,unchanged:FBDATA === live && before === JSON.stringify(FBDATA) && english === JSON.stringify(FB.englishMessages()) &&
      stories.every(function (story,i) { return FB.stories.list()[i] === story; }) && rng === FB.getRngState() &&
      uid === FB.getUidCounter() && state === FB.state && world === FB.world};
  },composition('harbor'));
  expect(result.unchanged).toBe(true);
  result.results.forEach(function (row) {
    expect(row.preview).toBeNull();
    expect(row.result).toMatchObject({source:'fixtures/authoring/existing-person-harbor.json',ready:false,published:false});
    expect(row.result.worldFaults.length).toBeGreaterThan(0);
  });
  expect(result.results[0].result.worldFaults.join(' ')).toContain('composition_missing_capital');
  expect(result.results[1].result.worldFaults.join(' ')).toContain('Conflicting composition declaration');
  expect(result.results[3].result.worldFaults.join(' ')).toContain('unregistered start composition_missing_start');
});

test('stale preparation, changed owners and cyclic optional dependencies cannot replace declarations',async function ({page},info) {
  await openGame(page,info);
  const result = await page.evaluate(function (input) {
    const stale = FB.bookmarkCompositions.prepare(input), priorName = FBDATA.cultures.frankish.name;
    let staleResult;
    try { FBDATA.cultures.frankish.name = 'Composition stale probe'; staleResult = stale.publish(); }
    finally { FBDATA.cultures.frankish.name = priorName; }
    const first = FB.bookmarkCompositions.prepare(input).publish(), live = FBDATA, before = JSON.stringify(live);
    const changed = JSON.parse(JSON.stringify(input)); changed.starts[0].definition.gold++;
    const changedResult = FB.bookmarkCompositions.prepare(changed).publish();
    const conflict = JSON.parse(JSON.stringify(input)); conflict.id = 'different_owner'; conflict.bookmark.name += ' changed';
    const conflictResult = FB.bookmarkCompositions.prepare(conflict).publish();
    return {stale:staleResult,first:first,changed:changedResult,conflict:conflictResult,
      unchanged:FBDATA === live && before === JSON.stringify(live)};
  },composition('harbor'));
  expect(result.stale).toMatchObject({published:false});
  expect(result.stale.worldFaults.join(' ')).toContain('stale');
  expect(result.first).toMatchObject({published:true});
  expect(result.changed.worldFaults.join(' ')).toContain('owner has changed');
  expect(result.conflict.worldFaults.join(' ')).toContain('Conflicting composition world');
  expect(result.unchanged).toBe(true);
  const cycles = composition('dune');
  cycles.starts[0].requires = [cycles.starts[1].definition.id];
  cycles.starts[1].requires = [cycles.starts[0].definition.id];
  const report = await page.evaluate(function (input) { return FB.bookmarkCompositions.prepare(input).publish(); },cycles);
  expect(report).toMatchObject({published:true});
  expect(report.starts.map(function (s) { return s.ready; })).toEqual([false,false,true]);
  expect(report.starts[0].faults.join(' ')).toContain('Cyclic start-unit dependencies');
});

test('record faults and conflicting optional messages stay with their owning starts',async function ({page},info) {
  await openGame(page,info);
  const result = await page.evaluate(function (input) {
    function campaign(id,text) {
      return {id:id,type:'campaign',name:'Detached declaration',desc:'An optional start-owned graph.',
        actor:{realmId:'harbor_house'},target:{provinceId:'harbor_quay'},firstYear:900,lastYear:901,durationDays:30,
        news:{started:{key:'news.composition.shared_optional',text:text}}};
    }
    const first = input.starts[0], second = input.starts[1], bad = JSON.parse(JSON.stringify(second));
    first.storyInstances = {composition_first_message:campaign('composition_first_message','Original optional message')};
    second.storyInstances = {composition_conflict_message:campaign('composition_conflict_message','Conflicting optional message')};
    bad.definition.id = 'composition_bad_resources'; bad.definition.gold = -1;
    const dependent = JSON.parse(JSON.stringify(input.starts[2]));
    dependent.definition.id = 'composition_later_dependent'; dependent.requires = [first.definition.id];
    input.starts = [dependent,first,second,bad,input.starts[2]];
    const ticket = FB.bookmarkCompositions.prepare(input), preview = ticket.preview(), report = ticket.publish();
    const invalidImport = JSON.parse(JSON.stringify(preview)); invalidImport.startScenarios.push(bad.definition);
    return {report:report,strictInvalid:FB.mods.validate(invalidImport),
      installed:FBDATA.startScenarios.filter(function (s) { return s.bookmarkIds && s.bookmarkIds[0] === 'harbor_world'; })
        .map(function (s) { return s.id; }),
      conflictAbsent:!FBDATA.storyInstances.composition_conflict_message && !FB.stories.get('composition_conflict_message'),
      message:FB.englishMessage('news.composition.shared_optional'),worldFaults:FB.validateBookmark(FB.bookmark('harbor_world'))};
  },composition('harbor'));
  expect(result.report).toMatchObject({published:true});
  expect(result.report.starts.map(function (s) { return s.ready; })).toEqual([true,true,false,false,true]);
  expect(result.report.starts[2].faults.join(' ')).toContain('Conflicting composition message');
  expect(result.report.starts[3].faults.join(' ')).toContain('gold');
  expect(result.installed).toEqual(['composition_later_dependent','harbor_existing_household','harbor_existing_ruler']);
  expect(result.conflictAbsent).toBe(true);
  expect(result.message).toEqual({text:'Original optional message'});
  expect(result.worldFaults).toEqual([]);
  expect(result.strictInvalid.length).toBeGreaterThan(0);
});

test('additive faith availability preserves other dates and rejects undeclared ownership',async function ({page},info) {
  await openGame(page,info);
  const result = await page.evaluate(function (input) {
    const id = Object.keys(FBDATA.religions).find(function (id) {
      const row = FBDATA.religions[id];
      return row.availability && Array.isArray(row.availability.bookmarkIds) && row.availability.bookmarkIds.length;
    });
    const prior = JSON.parse(JSON.stringify(FBDATA.religions[id]));
    input.availability = {}; input.availability[id] = {bookmarkIds:[input.bookmark.id]};
    const published = FB.bookmarkCompositions.prepare(input).publish();
    const expected = JSON.parse(JSON.stringify(prior)); expected.availability.bookmarkIds.push(input.bookmark.id);
    const actual = JSON.stringify(FBDATA.religions[id]), live = FBDATA;
    const changed = JSON.parse(JSON.stringify(input)); changed.id = 'composition_bad_availability';
    changed.availability[id].bookmarkIds = ['composition_unowned_world'];
    const rejected = FB.bookmarkCompositions.prepare(changed).publish();
    return {published:published,preserved:actual === JSON.stringify(expected),rejected:rejected,
      unchanged:live === FBDATA && actual === JSON.stringify(FBDATA.religions[id])};
  },composition('harbor'));
  expect(result).toMatchObject({published:{published:true},preserved:true,rejected:{published:false},unchanged:true});
  expect(result.rejected.worldFaults.join(' ')).toContain('Invalid additive composition availability');
});

test('unrelated broken declarations remain strict import errors without blocking a trusted ownership unit',async function ({page},info) {
  await openGame(page,info);
  const result = await page.evaluate(function (input) {
    const unrelated = JSON.parse(JSON.stringify(input.bookmark)); unrelated.id = 'composition_unrelated_world';
    unrelated.realms[0].capital = 'composition_unknown_capital'; FBDATA.bookmarks[unrelated.id] = unrelated;
    const dangling = JSON.parse(JSON.stringify(input.starts[1].definition));
    dangling.id = 'composition_unrelated_start'; dangling.bookmarkIds = ['composition_absent_world'];
    FBDATA.startScenarios.push(dangling);
    const before = JSON.stringify(FBDATA), ticket = FB.bookmarkCompositions.prepare(input), preview = ticket.preview();
    const detached = before === JSON.stringify(FBDATA), strictFaults = preview && FB.mods.validate(preview);
    const published = ticket.publish(), start = FBDATA.startScenarios.find(function (s) { return s.id === input.starts[1].definition.id; });
    return {detached:detached,strictFaults:strictFaults,published:published,
      worldFaults:FB.validateBookmarkWorld(FB.bookmark(input.bookmark.id)),available:FB.startRuntimeReport(start,FB.bookmark(input.bookmark.id)).available,
      unrelatedPreserved:FBDATA.bookmarks[unrelated.id] === unrelated && FBDATA.startScenarios.indexOf(dangling) >= 0};
  },composition('harbor'));
  expect(result).toMatchObject({detached:true,published:{published:true},worldFaults:[],available:true,unrelatedPreserved:true});
  expect(result.strictFaults.length).toBeGreaterThan(0);
});

test('re-evaluating a faith owner preserves availability added by another composition',async function ({page},info) {
  await openGame(page,info);
  const result = await page.evaluate(function (inputs) {
    const first = inputs[0], second = inputs[1];
    first.catalogs.religions.harbor_belief.availability = {bookmarkIds:[first.bookmark.id]};
    second.availability = {harbor_belief:{bookmarkIds:[second.bookmark.id]}};
    const initial = FB.bookmarkCompositions.prepare(first).publish();
    const extended = FB.bookmarkCompositions.prepare(second).publish();
    const live = FBDATA, faith = FBDATA.religions.harbor_belief;
    const repeated = FB.bookmarkCompositions.prepare(first).publish();
    const conflicting = JSON.parse(JSON.stringify(first)); conflicting.id = 'composition_conflicting_faith';
    conflicting.catalogs.religions.harbor_belief.name = 'An incompatible replacement';
    const rejected = FB.bookmarkCompositions.prepare(conflicting).publish();
    return {initial:initial,extended:extended,repeated:repeated,rejected:rejected,
      edges:faith.availability.bookmarkIds,preserved:live === FBDATA && faith === FBDATA.religions.harbor_belief};
  },[composition('harbor'),composition('dune')]);
  expect(result).toMatchObject({initial:{published:true},extended:{published:true},
    repeated:{published:true,reused:true},rejected:{published:false},preserved:true});
  expect(result.edges).toEqual(['harbor_world','dune_world']);
  expect(result.rejected.worldFaults.join(' ')).toContain('Conflicting composition declaration: religions.harbor_belief');
});

test('supplied revisions keep explicit bindings and reject an identity incompatible with one offered revision',async function ({page},info) {
  await openGame(page,info);
  const result = await page.evaluate(function (input) {
    input.bookmark.revision = 'fresh';
    const retainedRealms = JSON.parse(JSON.stringify(input.bookmark.realms));
    retainedRealms[0].royalCourt.members.find(function (member) { return member.id === 'chosen'; }).name = 'Retained named person';
    input.bookmark.revisions = {baseline:{starts:[],realms:retainedRealms},
      fresh:{starts:[],realms:JSON.parse(JSON.stringify(input.bookmark.realms))}};
    input.starts[1].locations = [input.starts[1].definition.fixedProvinceId];
    const ticket = FB.bookmarkCompositions.prepare(input), preview = ticket.preview(), published = ticket.publish();
    return {published:published,strictFaults:preview && FB.mods.validate(preview),revisions:FB.bookmarkRevisions(input.bookmark.id)
      .map(function (world) { return {revision:world.revision,starts:world.starts,locations:world.startLocations,
        faults:FB.validateBookmark(world)}; })};
  },composition('harbor'));
  expect(result.published).toMatchObject({published:true});
  expect(result.published.starts.map(function (s) { return s.ready; })).toEqual([false,true,true]);
  expect(result.published.starts[0]).toMatchObject({revision:'baseline'});
  expect(result.strictFaults).toEqual([]);
  expect(result.revisions.map(function (world) { return world.revision; })).toEqual(['baseline','fresh']);
  result.revisions.forEach(function (world) {
    expect(world.starts).toEqual(['harbor_ordinary_household','harbor_existing_ruler']);
    expect(world.locations).toEqual({harbor_ordinary_household:['harbor_gardens']});
    expect(world.faults).toEqual([]);
  });
});

test('a message-registration exception restores catalogues, messages and the compiled registry',async function ({page},info) {
  await openGame(page,info);
  const result = await page.evaluate(function (input) {
    input.catalogs.storyInstances.composition_messages = {id:'composition_messages',type:'campaign',
      name:'A declared campaign',desc:'A detached publication check.',actor:{realmId:'harbor_house'},
      target:{provinceId:'harbor_quay'},firstYear:900,lastYear:901,durationDays:30,
      news:{started:{key:'news.composition.rollback.first',text:'First composition message'},
        won:{key:'news.composition.rollback.second',text:'Second composition message'}}};
    input.bookmark.stories = ['composition_messages'];
    const ticket = FB.bookmarkCompositions.prepare(input), prepared = ticket.report();
    const live = FBDATA, before = JSON.stringify(live), english = FB.englishMessages();
    const englishBefore = Object.assign({},english), englishText = JSON.stringify(english), registry = FB.stories.list();
    const register = FB.registerMessage, rng = FB.getRngState(), uid = FB.getUidCounter();
    let report, registered = 0;
    try {
      FB.registerMessage = function (key,record) {
        if (key === 'news.composition.rollback.second') throw new Error('Composition registration rollback probe');
        register(key,record); if (key === 'news.composition.rollback.first') registered++;
      };
      report = ticket.publish();
    } finally { FB.registerMessage = register; }
    const unchanged = live === FBDATA && before === JSON.stringify(FBDATA) && englishText === JSON.stringify(english) &&
      Object.keys(englishBefore).every(function (key) { return englishBefore[key] === english[key]; }) &&
      registry.every(function (story,i) { return FB.stories.list()[i] === story; }) &&
      rng === FB.getRngState() && uid === FB.getUidCounter();
    return {prepared:prepared,report:report,registered:registered,unchanged:unchanged,retry:ticket.publish()};
  },composition('harbor'));
  expect(result.prepared.ready).toBe(true);
  expect(result.registered).toBe(1);
  expect(result.report).toMatchObject({published:false});
  expect(result.report.worldFaults).toContain('Composition registration rollback probe');
  expect(result.unchanged).toBe(true);
  expect(result.retry).toMatchObject({published:true});
});

for (const prefix of ['harbor','dune']) {
  test(prefix + ' accepted composition preview follows the ordinary JSON file import path',async function ({page},info) {
    await openGame(page,info);
    const prepared = await page.evaluate(function (input) {
      const ticket = FB.bookmarkCompositions.prepare(input), payload = ticket.preview();
      return {report:ticket.report(),payload:payload,faults:payload && FB.mods.validate(payload)};
    },composition(prefix));
    expect(prepared.report.ready).toBe(true);
    expect(prepared.faults).toEqual([]);
    prepared.payload.name = prefix + ' composed import';
    await page.evaluate(function () { FB.ui.showMods(); });
    await page.locator('#modfile').setInputFiles({name:prefix + '-composition.json',mimeType:'application/json',
      buffer:Buffer.from(JSON.stringify(prepared.payload))});
    await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded'}),page.locator('#mod-apply').click()]);
    await page.waitForFunction(function (prefix) {
      return window.FB && FB.game && FB.game.bootReady && FBDATA.bookmarks[prefix + '_world'];
    },prefix);
    const imported = await page.evaluate(function (prefix) {
      const world = FB.bookmark(prefix + '_world');
      return {faults:FB.validateBookmark(world),starts:FBDATA.startScenarios.filter(function (s) {
        return s.bookmarkIds && s.bookmarkIds[0] === world.id;
      }).map(function (s) { return {id:s.id,valid:FB.startRuntimeReport(s,world).valid}; }),sig:FB.mods.sig()};
    },prefix);
    expect(imported.faults).toEqual([]);
    expect(imported.starts.map(function (s) { return s.id; })).toEqual(examples[prefix].startScenarios.map(function (s) { return s.id; }));
    expect(imported.starts.every(function (s) { return s.valid; })).toBe(true);
    expect(imported.sig).toMatch(/^effective-1-/);
  });
}
