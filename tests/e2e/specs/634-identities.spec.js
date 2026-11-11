'use strict';
const {prepareGameContent} = require('../support/game/navigation');
const fs = require('fs');
const path = require('path');
const {test,expect} = require('../support/fixture');
const {openGame} = require('../support/game/navigation');
const {openCrazyGame} = require('../support/game/crazygames-title');
const {mockCrazyGames} = require('../support/crazygames');
const {manifestRuns,manifestFiles} = require('../fixtures/bookmark-manifest/eager-document');
const {dependsOnRuntime} = require('../support/runtime-dependencies');

dependsOnRuntime(__filename,['data/bookmark_manifest.js','index.html','data/bookmark_634_identities.js','data/bookmark_634.js','data/starts_634_ordinary.js',
  'data/bookmark_568_identities.js','data/bookmark_476_wider_identities.js',
  'data/cultures.js','data/bookmarks.js','data/eras.js','js/model.js',
  'data/starts_634_damascus.js','data/starts_634_ctesiphon.js','data/bookmark_634_scaffold_d.js',
  'js/justice.js','js/intrigue.js','js/authority.js','js/starts.js','js/save.js','js/save_v4.js','js/bookmark_sources.js',
  'js/mods.js','js/world.js','js/bookmark_composition.js','js/main.js','js/ui_misc.js','js/ui_modals.js','js/crazygames.js'].concat(manifestFiles(manifestRuns(fs.readFileSync(path.resolve(__dirname,'../../../data/bookmark_manifest.js'),'utf8')))
  .filter(function (file) { return /634/.test(file); })));

const FAITHS = ['alexandria_imperial_chalcedonian_634','early_islam_634','zoroastrian_sasanian_634','chalcedonian_local_634','east_syriac_local_634','west_syriac_lay_634'];
const SOURCE_FAITHS = ['insular_traditional_476','finnic_traditional_476','woodland_traditional_476',
  'steppe_traditional_476','caucasian_traditional_476','nile_traditional_476','horn_traditional_476',
  'arabian_traditional_476','iranian_traditional_476','sogdian_traditional_476',
  'caucasian_christian_476','aksumite_christian_476','buddhist_476','brahmanical_476','sahel_traditional_476'];

for (const crazy of [false,true]) {
  test('634 identity source reload preserves composed catalogues on ' + (crazy ? 'CrazyGames' : 'standard'),
    async function ({page},info) {
      if (crazy) {
        await mockCrazyGames(page);
        await page.addInitScript(function () {
          window.FB_DISTRIBUTION = 'crazygames';
          window.FB_CRAZYGAMES_STORAGE = 'localstorage';
        });
        await openCrazyGame(page,info);
      } else await openGame(page,info);
      const before = await page.evaluate(function () {
        return {data:JSON.stringify(FBDATA),state:JSON.stringify(FB.state),
          rng:FB.getRngState(),uid:FB.getUidCounter()};
      });
      await page.addScriptTag({path:path.resolve(__dirname,'../../../data/bookmark_634_identities.js')});
      expect(await page.evaluate(function (before) {
        return {ids:Object.keys(FBDATA.bookmarkReligions634),
          sources:Object.keys(FBDATA.bookmarkFaithAvailability634),
          published:Object.keys(FBDATA.bookmarkReligions634).every(function (id) {
            return FB.faithExists(id,null);
          }),hidden:FBDATA.bookmarks['634'].hidden,
          unchanged:before.data === JSON.stringify(FBDATA) && before.state === JSON.stringify(FB.state) &&
            before.rng === FB.getRngState() && before.uid === FB.getUidCounter()};
      },before)).toEqual({ids:FAITHS,sources:SOURCE_FAITHS,published:true,hidden:undefined,unchanged:true});
    });
}

test('same-import date and faiths validate purely and publish through the ordinary file picker',async function ({page},info) {
  await openGame(page,info);
  const mod = JSON.parse(fs.readFileSync(path.join(__dirname,'../fixtures/634-identity-world.json'),'utf8'));
  mod.religions = await page.evaluate(function () { return FBDATA.bookmarkReligions634; });
  const prior = await page.evaluate(function () {
    return JSON.stringify({religions:FBDATA.religions,bookmarks:FBDATA.bookmarks});
  });
  expect(await page.evaluate(function (mod) {
    const before = JSON.stringify(FBDATA), state = JSON.stringify(FB.state);
    const rng = FB.getRngState(), uid = FB.getUidCounter();
    const errors = FB.mods.validate(mod);
    const rejected = ['unknown','duplicate','reversed','consumer','old_faith'].map(function (kind) {
      const bad = JSON.parse(JSON.stringify(mod));
      const a = bad.religions.early_islam_634.availability;
      if (kind === 'unknown') a.bookmarkIds = ['e2e_absent'];
      if (kind === 'duplicate') a.bookmarkIds = ['634','634'];
      if (kind === 'reversed') a.yearMax = 600;
      if (kind === 'consumer') a.consumers = ['ordination'];
      if (kind === 'old_faith') bad.bookmarks['634'].realms[0].religion = 'zoroastrian_sasanian_476';
      return FB.mods.validate(bad).length > 0;
    });
    return {errors:errors,rejected:rejected,pure:before === JSON.stringify(FBDATA) && state === JSON.stringify(FB.state) &&
      rng === FB.getRngState() && uid === FB.getUidCounter()};
  },mod)).toEqual({errors:[],rejected:[true,true,true,true,true],pure:true});
  await page.evaluate(function () { FB.ui.showMods(); });
  await page.locator('#modfile').setInputFiles({name:'634-identity-world.json',mimeType:'application/json',
    buffer:Buffer.from(JSON.stringify(mod),'utf8')});
  await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded'}),page.locator('#mod-apply').click()]);
  await prepareGameContent(page);
  await page.waitForFunction(function () {
    return window.FB && FB.game && FB.game.bootReady && FB.mods.count() === 1 && FBDATA.bookmarks['634'];
  });
  expect(await page.evaluate(function (prior) {
    const ids = Object.keys(FBDATA.bookmarkReligions634), world = FB.bookmark('634');
    const earlier = JSON.parse(prior);
    const consumers = ['community','character','ruler','institution','start','story','conversion','project'];
    return {errors:FB.validateBookmark(world),faithErrors:FB.validateReligionData(null),
      earlierUnchanged:['religions','bookmarks'].every(function (key) {
        return Object.keys(earlier[key]).every(function (id) {
          if (key === 'bookmarks' && id === '634') return true;
          return JSON.stringify(earlier[key][id]) === JSON.stringify(FBDATA[key][id]);
        });
      }),
      scopes:ids.map(function (id) {
        const rel = FB.religionOf(id,null);
        const permitted = id === 'alexandria_imperial_chalcedonian_634' ? ['character','institution'] :
          ['chalcedonian_local_634','east_syriac_local_634'].indexOf(id) >= 0
          ? ['community','character','start','story','conversion','project'] : consumers;
        return {parent:rel.parent,relation:rel.relationToParent,law:rel.legalTradition,
          head:rel.head,paths:rel.religiousPaths,war:rel.holyWarTradition,raid:rel.raidingTradition,
          spouses:rel.marriage.spouseLimit,rite:rel.marriage.kinship.siblingRite,
          excluded:consumers.filter(function (consumer) { return permitted.indexOf(consumer)<0; }).every(function (consumer) {
            return !FB.faithHistoricalAvailable(id,world,consumer);
          }),
          current:permitted.every(function (consumer) { return FB.faithHistoricalAvailable(id,world,consumer); }),
          retained:permitted.every(function (consumer) {
            return FB.faithHistoricalAvailable(id,Object.assign({},world,{date:{year:700,season:0,day:1}}),consumer);
          }),otherDates:Object.keys(FBDATA.bookmarks).filter(function (date) { return date !== '634'; }).every(function (date) {
            return consumers.every(function (consumer) { return !FB.faithHistoricalAvailable(id,FB.bookmark(date),consumer); });
          })};
      }),earlyTournament:FB.religionOf('early_islam_634',null).tournamentTradition,
      withheldDivorce:['early_islam_634','west_syriac_lay_634'].every(function (id) {
        return FB.religionOf(id,null).marriage.divorce.enabled === false;
      }),noAbbasid:FB.faithLineage('early_islam_634',null).indexOf('sunni') < 0,
      oldWindow:FB.faithAvailability('zoroastrian_sasanian_476',null).yearMax,
      minimumYears:ids.every(function (id) {
        const year = FB.faithAvailability(id,null).yearMin;
        const consumer = id === 'alexandria_imperial_chalcedonian_634' ? 'character' : 'community';
        return !FB.faithHistoricalAvailable(id,Object.assign({},world,{date:{year:year-1,season:0,day:1}}),consumer);
      })};
  },prior)).toEqual({errors:[],faithErrors:[],earlierUnchanged:true,scopes:[
    {parent:'chalcedonian',relation:'in_fold',law:'latin',spouses:{m:1,f:1},
      paths:{lay:'late_antique_lay',professions:{monk:'late_antique_monastic',priest:'late_antique_clerical'}}},
    {parent:'muslim',relation:'in_fold',law:'muslim',spouses:{m:4,f:1}},
    {parent:'zoroastrian',relation:'in_fold',law:'sasanian_custom_476',spouses:{m:1,f:1}},
    {parent:'chalcedonian',relation:'in_fold',law:'byzantine',spouses:{m:1,f:1}},
    {parent:'east_syriac',relation:'in_fold',law:'sasanian_custom_476',spouses:{m:1,f:1}},
    {parent:'miaphysite',relation:'in_fold',law:'customary',spouses:{m:1,f:1}}
  ].map(function (row) { return Object.assign({head:null,paths:null,war:null,raid:false,
    rite:null,current:true,retained:true,otherDates:true,excluded:true},row); }),
    earlyTournament:null,withheldDivorce:true,noAbbasid:true,oldWindow:493,minimumYears:true});
});

test('source selector union preserves doctrine, all earlier dates and narrower restrictions',async function ({page},info) {
  await openGame(page,info);
  expect(await page.evaluate(function () {
    const copy = function (value) { return JSON.parse(JSON.stringify(value)); };
    const original = FBDATA.religions, bookmarks = FBDATA.bookmarks;
    const ids = Object.keys(FBDATA.bookmarkFaithAvailability634);
    const consumers = ['community','character','ruler','institution','start','story','conversion','project'];
    const dates = Object.keys(bookmarks);
    function permissions() {
      return ids.map(function (id) { return dates.map(function (date) {
        return consumers.map(function (consumer) { return FB.faithHistoricalAvailable(id,FB.bookmark(date),consumer); });
      }); });
    }
    const prior = JSON.stringify(permissions());
    const doctrine = ids.map(function (id) { return JSON.stringify(FB.religionOf(id,null)); });
    const rng = FB.getRngState(), uid = FB.getUidCounter();
    try {
      FBDATA.bookmarks = Object.assign({},bookmarks,{'634':{id:'634',era:'late_antique',date:{year:634,season:2,day:1}}});
      FBDATA.religions = copy(original);
      function publish() {
        ids.forEach(function (id) {
          const a = FBDATA.religions[id].availability;
          FBDATA.bookmarkFaithAvailability634[id].bookmarkIds.forEach(function (date) {
            if (a.bookmarkIds.indexOf(date) < 0) a.bookmarkIds.push(date);
          });
        });
        FB.invalidateReligionData();
      }
      publish(); publish();
      const parity = prior === JSON.stringify(permissions());
      const unchanged = ids.every(function (id,i) { return doctrine[i] === JSON.stringify(FB.religionOf(id,null)); });
      const eligible = ids.every(function (id) { return consumers.every(function (consumer) {
        return FB.faithHistoricalAvailable(id,FB.bookmark('634'),consumer);
      }); });
      const exact = ids.every(function (id) {
        return JSON.stringify(FBDATA.religions[id].availability.bookmarkIds) ===
          JSON.stringify(original[id].availability.bookmarkIds);
      });
      const id = ids[0];
      FBDATA.religions[id].availability = {bookmarkIds:['476','493'],yearMin:476,yearMax:600,
        eras:['late_antique'],consumers:['community']};
      publish();
      const yearBlocked = !FB.faithHistoricalAvailable(id,FB.bookmark('634'),'community');
      FBDATA.religions[id].availability.yearMax = 634;
      FB.invalidateReligionData();
      const restricted = FB.faithHistoricalAvailable(id,FB.bookmark('634'),'community') &&
        !FB.faithHistoricalAvailable(id,FB.bookmark('634'),'start') &&
        !FB.faithHistoricalAvailable(id,Object.assign({},FB.bookmark('634'),{era:'high_medieval'}),'community');
      return {parity:parity,doctrine:unchanged,eligible:eligible,exact:exact,yearBlocked:yearBlocked,
        restricted:restricted,valid:FB.validateReligionData(null),pure:rng === FB.getRngState() && uid === FB.getUidCounter()};
    } finally {
      FBDATA.religions = original; FBDATA.bookmarks = bookmarks; FB.invalidateReligionData();
    }
  })).toEqual({parity:true,doctrine:true,eligible:true,exact:true,yearBlocked:true,restricted:true,valid:[],pure:true});
});


const {restoreBookmark} = require('../support/game/bookmark-acceptance');
const coreFixture = path.join(__dirname,'../fixtures/634-core-identities');

async function coreStart(page,scenario,revision) {
  const original = await page.evaluate(function (revision) {
    const raw = FBDATA.bookmarks['634'], original = raw.revision;
    if (revision) raw.revision = revision;
    if (revision === 'core_courts_v4') raw.revisions.core_courts_v4.hidden = false;
    return original;
  },revision);
  // This scenario-local journey resolves the revision identity before spelling
  // the optional resident suffix; the shared helper reads the raw start fields.
  const code = await page.evaluate(function (id) {
    const world = FB.bookmark('634');
    const start = FB.startIdentity(FBDATA.startScenarios.find(function (row) { return row.id === id; }),world);
    return 'COREIDENTITY-634-' + id + '-' + start.fixedProvinceId + '-m-Review-established-0-' +
      start.startCulture + '.' + start.startReligion;
  },scenario);
  const full = page.locator('#btn-choose-beginning');
  if (await full.isVisible()) await full.click();
  else await page.getByRole('button',{name:'New Game',exact:true}).click();
  await page.locator('#btn-bm-seed').click();
  await page.locator('#ng-seed').fill(code);
  await page.locator('#ng-seed').press('Enter');
  await expect(page.locator('#chargen:not(.hidden)')).toBeVisible();
  await page.getByRole('button',{name:'Begin Your Story',exact:true}).click();
  await page.getByRole('button',{name:'Begin',exact:true}).click();
  await page.evaluate(function () { FB.game.setPaused(true); FB.game.uiPrefs.hideTips = true; });
  await page.evaluate(function (original) {
    delete FBDATA.bookmarks['634'].hidden;
    FBDATA.bookmarks['634'].revision = original;
    FBDATA.bookmarks['634'].revisions.core_courts_v4.hidden = true;
  },original);
}

for (const entry of [
  ['baseline','damascus_household_634','chalcedonian'],
  ['scenery_protected_v1','ctesiphon_household_634','east_syriac'],
  ['ordinary_settlement_v2','damascus_household_634','chalcedonian'],
  ['core_identities_v3','damascus_household_634','chalcedonian_local_634'],
  ['core_courts_v4','ctesiphon_household_634','east_syriac_local_634']
]) {
  test.describe('634 current imported ' + entry[0],function () {
    let previous;
    test.beforeEach(async function ({page},info) {
      await openGame(page,info);
      await page.evaluate(function () { FB.ui.showMods(); });
      await page.locator('#modfile').setInputFiles(path.join(coreFixture,'household-overlay.json'));
      await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded'}),page.locator('#mod-apply').click()]);
      await prepareGameContent(page);
      await coreStart(page,entry[1],entry[0]);
      previous = await page.evaluate(function () {
        FB.state.player.gold -= 3;
        return {text:FB.save.serialize(),roots:FB.mods.retainedCatalogueRoots(),
          worlds:FB.bookmarkRevisions('634'),stored:localStorage.getItem('fb_mods')};
      });
      await info.attach('retained-core-catalogue',{body:JSON.stringify(previous.roots),contentType:'application/json'});
      await page.reload({waitUntil:'domcontentloaded'});
      await prepareGameContent(page);
    });
    test('exact imported save keeps people, resident pairs, starts and world meaning',async function ({page}) {
      expect(await page.evaluate(function (previous) {
        const worlds = FB.bookmarkRevisions('634');
        return {same:previous.worlds.every(function (world) {
          return JSON.stringify(world) === JSON.stringify(worlds.find(function (row) { return row.revision === world.revision; }));
        }),fresh:FB.bookmark('634').revision,stored:localStorage.getItem('fb_mods') === previous.stored,
          roots:FB.mods.retainedCatalogueRoots()};
      },previous)).toMatchObject({same:true,fresh:'core_identities_v3',stored:true,roots:previous.roots});
      expect(await page.evaluate(function (text) {
        const saved = JSON.parse(text), original = JSON.stringify(saved), before = JSON.stringify(FB.state);
        const rng = FB.getRngState(), uid = FB.getUidCounter();
        const valid = FB.mods.saveCompatibility(saved);
        const wrong = JSON.parse(text); wrong.mods += 'changed';
        const rejected = FB.mods.saveCompatibility(wrong);
        return {accepted:valid.compatible,rejected:!rejected.compatible,
          pure:original === JSON.stringify(saved) && before === JSON.stringify(FB.state) && rng === FB.getRngState() && uid === FB.getUidCounter()};
      },previous.text)).toEqual({accepted:true,rejected:true,pure:true});
      await restoreBookmark(page,previous.text);
      expect(await page.evaluate(function (input) {
        const old = JSON.parse(input.text), next = JSON.parse(FB.save.serialize());
        const keys = ['start','chars','player','population','stories','bookmarkSetup','authority','localInstitutions'];
        return {same:keys.every(function (key) { return JSON.stringify(old.state[key]) === JSON.stringify(next.state[key]); }),
          faith:FB.campaignStart(FB.state).startReligion,
          rng:(old.rng >>> 0) === (next.rng >>> 0),uid:old.uid === next.uid,mods:next.mods === FB.mods.sig() && next.mods === old.mods};
      },previous)).toEqual({same:true,faith:entry[2],rng:true,uid:true,mods:true});
      const current = await page.evaluate(function () { return FB.save.serialize(); });
      await restoreBookmark(page,current);
      expect(await page.evaluate(function () { return FB.campaignStart(FB.state).startReligion; })).toBe(entry[2]);
    });
  });
}

test('634 fresh local adapters preserve weights and withhold institutional and ruler admission',async function ({page},info) {
  await openGame(page,info);
  expect(await page.evaluate(function () {
    const world = FB.bookmark('634');
    if (!world) throw new Error(JSON.stringify(FB.bookmarkRuntimeDiagnostics()));
    const baseline = FB.bookmarkRevisions('634').find(function (row) { return row.revision === 'baseline'; });
    const pairs = [['damascus','chalcedonian','chalcedonian_local_634'],['baghdad','east_syriac','east_syriac_local_634']];
    const unchanged = world.provinces.every(function (row) {
      const expected = JSON.parse(JSON.stringify(baseline.provinces.find(function (old) { return old.id === row.id; })));
      const pair = pairs.find(function (p) { return p[0] === row.id; });
      if (pair) expected.communities.find(function (c) { return c.culture === 'syriac' && c.religion === pair[1]; }).religion = pair[2];
      return JSON.stringify(expected) === JSON.stringify(row);
    });
    return {unchanged:unchanged,errors:FB.validateBookmark(world),institutions:world.localInstitutions,
      faiths:pairs.map(function (pair) {
        const id = pair[2], rel = FB.religionOf(id,null);
        return {parent:rel.parent,head:rel.head,paths:rel.religiousPaths,divorce:rel.marriage.divorce.enabled,
          allowed:['community','character','start','story','conversion','project'].every(function (consumer) { return FB.faithHistoricalAvailable(id,world,consumer); }),
          denied:['ruler','institution'].every(function (consumer) { return !FB.faithHistoricalAvailable(id,world,consumer); })};
      })};
  })).toEqual({unchanged:true,errors:[],institutions:{},faiths:[
    {parent:'chalcedonian',head:null,paths:null,divorce:false,allowed:true,denied:true},
    {parent:'east_syriac',head:null,paths:null,divorce:false,allowed:true,denied:true}
  ]});
  await coreStart(page,'damascus_household_634');
  expect(await page.evaluate(function () { return FB.state.chars[FB.state.player.charId].religion; })).toBe('chalcedonian_local_634');
  const saved = await page.evaluate(function () { return FB.save.serialize(); });
  await restoreBookmark(page,saved);
  expect(await page.evaluate(function () { return FB.campaignStart(FB.state).startReligion; })).toBe('chalcedonian_local_634');
});

for (const imported of [false,true]) test('634 ' + (imported ? 'imported' : 'native') + ' Sasanian civil law resolves public intrigue hearings without replacing religious law',async function ({page},info) {
  await openGame(page,info);
  if (imported) {
    await page.evaluate(function () { FB.ui.showMods(); });
    await page.locator('#modfile').setInputFiles(path.join(coreFixture,'civil-review.json'));
    await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded'}),page.locator('#mod-apply').click()]);
    await prepareGameContent(page);
  }
  await coreStart(page,'ctesiphon_household_634');
  expect(await page.evaluate(function () {
    const s = FB.state, actor = FB.materializeRealmRuler(s,'sasanian_634');
    const originalIdentity = FB.political.governingIdentity(s,'sasanian_634');
    const secular = FB.justiceTradition(s,actor.id), religious = FB.justiceTradition(s,actor.id,'religious');
    s.player.gold = 500; s.player.piety = 100; s.eventQueue = [];
    const offense = FB.justiceExposeScheme(s,{id:'abduction',actorId:s.player.charId,
      recordId:'civil-review',context:{characterId:actor.id}},'redhanded',false);
    const custody = FB.captureIntrigue(s,actor.id,s.player.charId,'judicial','sasanian_634');
    const queued = FB.justiceApplyPunishment(s,actor.id,s.player.charId,'imprisonment',offense.id);
    if (!queued.ok) throw new Error(JSON.stringify(queued));
    const ctx = {justiceId:s.justice.pending.id,studentId:actor.id}, ev = FB.eventById('justice_hearing');
    const before = JSON.stringify(s), rng = FB.getRngState(), uid = FB.getUidCounter();
    const pay = FB.fns.justice_can_pay(s,ctx), penance = FB.fns.justice_can_penance(s,ctx);
    const pure = before === JSON.stringify(s) && rng === FB.getRngState() && uid === FB.getUidCounter();
    const applied = FB.resolveEventOption(s,ev,ev.options.find(function (o) { return o.effects.custom === 'justice_submit'; }),ctx);
    const after = JSON.stringify(s), repeated = FB.resolveEventOption(s,ev,ev.options.find(function (o) { return o.effects.custom === 'justice_submit'; }),ctx);
    const replayPure = after === JSON.stringify(s), sentence = s.justice.last.sentence;
    const npc = FB.makeCharacter(s,{name:'Witness',sex:'m',culture:'syriac',religion:'east_syriac_local_634',born:s.date.year-30,station:0,traitsN:0});
    npc.homeProvinceId = 'baghdad';
    FB.intrigueAutoSentence(s,{id:'abduction',actorId:npc.id,recordId:'civil-ai',context:{characterId:actor.id}},'redhanded',false);
    const uncaptured = !FB.justiceCustodyOf(s,npc.id);
    FB.captureIntrigue(s,actor.id,npc.id,'judicial','sasanian_634');
    delete s.justice.lastSeason; FB.justiceSeason(s);
    return {faith:s.chars[s.player.charId].religion,identity:originalIdentity.legalIdentityId,
      ai:s.justice.last.sentence,uncaptured:uncaptured,
      secular:secular.id,religious:religious.id,source:secular.source,pay:pay,penance:penance,pure:pure,
      applied:!!applied,closed:offense.closed,repeated:repeated,replayPure:replayPure,
      sentence:sentence,term:custody.endTurn - custody.captureTurn};
  })).toMatchObject({faith:'east_syriac_local_634',identity:'sasanian_civil_634',secular:'sasanian_civil_634',
    religious:'sasanian_custom_476',source:'elite',pay:!imported,penance:false,pure:true,applied:true,closed:true,
    repeated:false,replayPure:true,sentence:'imprisonment',ai:imported ? 'fine' : 'imprisonment',uncaptured:true});
  const saved = await page.evaluate(function () { return FB.save.serialize(); });
  await restoreBookmark(page,saved);
  expect(await page.evaluate(function () { return FB.political.governingIdentity(FB.state,'sasanian_634').legalIdentityId; })).toBe('sasanian_civil_634');
});
