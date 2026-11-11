'use strict';
const fs = require('fs');
const path = require('path');
const {test,expect} = require('../support/fixture');
const {openTitle,openGame} = require('../support/game/navigation');
const {useReleasedStartRules} = require('../support/game/released-starts');
const {restoreBookmark} = require('../support/game/bookmark-acceptance');
const {manifestRuns,manifestFiles} = require('../fixtures/bookmark-manifest/eager-document');
const {dependsOnRuntime} = require('../support/runtime-dependencies');

const manifest = fs.readFileSync(path.resolve(__dirname,'../../../data/bookmark_manifest.js'),'utf8');
dependsOnRuntime(__filename,['index.html','data/bookmark_manifest.js','data/bookmark_sources.js',
  'data/starts.js','data/bookmarks.js','data/story_instances.js','data/start_ambitions_634.js',
  'js/bookmark_sources.js','js/bookmark_composition.js','js/starts.js','js/main.js',
  'js/stories.js','js/bookmark_setup.js','js/story_ruler_agenda.js','js/story_household.js',
  'js/story_household_observer.js','js/story_opening_goals.js','js/story_campaign.js',
  'js/governments.js','js/government_aristocracy.js','js/treasury.js','js/world.js',
  'js/save.js','js/save_v4.js','js/mods.js'].concat(manifestFiles(manifestRuns(manifest))
    .filter(function (file) { return /634/.test(file); })));

const worldStories = ['syrian_front_634','iraqi_front_634','ctesiphon_household_observer_634',
  'damascus_household_observer_634','medina_household_observer_634',
  'syrian_households_634','iraqi_households_634','district_authority_households_634'];
const starts = [
  {id:'umar_634',home:'medina',name:'Umar',culture:'arabic',faith:'medinan_court_634',realm:'rashidun_634',
    form:'medinan_selection_634',tracks:['umar_court_agenda_634','opening_umar_court_634'],choice:'umar_keep_accounts'},
  {id:'heraclius_634',home:'constantinople',name:'Heraclius',culture:'greek',faith:'chalcedonian',realm:'byzantium_634',
    form:'administrative_monarchy',tracks:['heraclius_court_agenda_634','opening_heraclius_court_634'],choice:'heraclius_keep_administration'},
  {id:'yazdegerd_634',home:'baghdad',name:'Yazdegerd III',culture:'persian',faith:'zoroastrian_sasanian_634',realm:'sasanian_634',
    form:'aristocratic_monarchy',tracks:['yazdegerd_agenda_634'],choice:'yazdegerd_keep_court'},
  {id:'ctesiphon_household_634',home:'baghdad',culture:'syriac',faith:'east_syriac_local_634',
    tracks:['ctesiphon_household_track_634','opening_ctesiphon_634'],choice:'take_stock'},
  {id:'damascus_household_634',home:'damascus',culture:'syriac',faith:'chalcedonian_local_634',
    tracks:['damascus_household_full_634','opening_damascus_full_634'],choice:'take_stock'},
  {id:'frontier_household_634',home:'damascus',culture:'arabic',faith:'west_syriac_lay_634',
    tracks:['frontier_household_track_634','opening_frontier_634'],choice:'work_first'},
  {id:'medina_household_634',home:'medina',culture:'arabic',faith:'early_islam_634',
    tracks:['medina_household_track_634','opening_medina_634'],choice:'consider_home'},
  {id:'farmer_634',home:'kufa',tracks:[]},
  {id:'craftsman_634',home:'damascus',tracks:[]}
];
const offeredIds = starts.map(function (entry) { return entry.id; });
const worldStartIds = ['farmer_634','craftsman_634','ctesiphon_household_634','umar_634','heraclius_634',
  'yazdegerd_634','damascus_household_634','frontier_household_634','medina_household_634'];

async function chooseBeginning(page) {
  const full = page.locator('#btn-choose-beginning');
  if (await full.isVisible()) await full.click();
  else await page.getByRole('button',{name:'New Game',exact:true}).click();
}

async function enterCode(page,code) {
  await chooseBeginning(page);
  await page.locator('#btn-bm-seed').click();
  await page.locator('#ng-seed').fill(code);
  await page.locator('#ng-seed').press('Enter');
  await expect(page.locator('#chargen:not(.hidden)')).toBeVisible();
}

function savedFacts() {
  const envelope = JSON.parse(FB.save.serialize()), s = FB.save.expandedSnapshot(envelope.state);
  // Canonical restore materializes these empty defaults. Normalize only the
  // detached comparison; every populated ledger and saved fact stays exact.
  if (s.countySupport === undefined) s.countySupport = {};
  s.rebellions = Object.assign({groups:{},warnings:{},cooldowns:{}},s.rebellions || {});
  s.greatHolyWarHistory = Object.assign({sequence:0,campaigns:[],cooldownUntil:{},firstCall:{},firstLaunched:{},
    headState:{},sacredLossSince:{},unlockChecked:{}},s.greatHolyWarHistory || {});
  Object.keys(s.realms).forEach(function (id) {
    const treasury = s.realms[id].treasury;
    if (treasury && treasury.distributionCooldown === undefined) treasury.distributionCooldown = 0;
  });
  function ordered(value) {
    if (Array.isArray(value)) return value.map(ordered);
    if (!value || typeof value !== 'object') return value;
    const out = {}; Object.keys(value).sort().forEach(function (key) { out[key] = ordered(value[key]); }); return out;
  }
  return {mods:envelope.mods,rng:envelope.rng>>>0,uid:envelope.uid,state:ordered(s)};
}

async function preserveTwice(page,saved,before) {
  // Any replay of fresh setup or grants must fail, even when it would be
  // idempotent and therefore escape a final-state comparison.
  await page.evaluate(function () {
    window.__freshHooks = {start:FB.stories.start,seed:FB.aristocracy.seed};
    FB.stories.start = FB.aristocracy.seed = function () { throw new Error('Restore initialized fresh content'); };
  });
  try {
    for (let pass = 0; pass < 2; pass++) {
      await restoreBookmark(page,saved);
      const after = await page.evaluate(savedFacts);
      expect({mods:after.mods,rng:after.rng,uid:after.uid}).toEqual({mods:before.mods,rng:before.rng,uid:before.uid});
      const keys = Array.from(new Set(Object.keys(before.state).concat(Object.keys(after.state))));
      expect(keys.filter(function (key) {
        return JSON.stringify(before.state[key]) !== JSON.stringify(after.state[key]);
      }), 'Every saved section survives load and re-save').toEqual([]);
      saved = await page.evaluate(function () { return FB.save.serialize(); });
    }
  } finally {
    await page.evaluate(function () {
      FB.stories.start = window.__freshHooks.start; FB.aristocracy.seed = window.__freshHooks.seed;
    });
  }
}

for (const review of [false,true]) test('634 offers exactly the approved starts with review '+review,async function ({page},info) {
  if (!review) await useReleasedStartRules(page);
  await openTitle(page,info); await chooseBeginning(page);
  await page.locator('#bookmarklist [data-bookmark="634"]').click();
  await expect(page.locator('#newgame:not(.hidden)')).toBeVisible();
  expect(await page.locator('#scenariolist .scen-group').allTextContents())
    .toEqual(['Historical starts','Story starts','Open starts']);
  expect(await page.locator('#scenariolist [data-scenario]').evaluateAll(function (cards) {
    return cards.map(function (card) { return card.getAttribute('data-scenario'); });
  })).toEqual(offeredIds);
  for (const id of offeredIds) {
    const card = page.locator('#scenariolist [data-scenario="'+id+'"]');
    await expect(card).not.toHaveAttribute('aria-disabled','true');
    await expect(card).not.toHaveClass(/locked/);
  }
  expect(await page.evaluate(function () {
    const b = FB.bookmark('634');
    if (!b) throw new Error(JSON.stringify(FB.bookmarkRuntimeDiagnostics()));
    return {revision:b.revision,hidden:b.hidden,date:b.date,era:b.era,geography:b.geography,layout:b.settlementLayout,
      counts:[b.provinces.length,b.realms.length,Object.keys(b.localInstitutions).length],starts:b.starts,
      stories:b.stories,faults:FB.validateBookmark(b),state:FB.state,distribution:FB.platform.isCrazyGames};
  })).toEqual({revision:'core_courts_v4',hidden:false,date:{year:634,season:2,day:1},era:'late_antique',
    geography:'europe_regional_2',layout:'634_opening',counts:[527,122,6],starts:worldStartIds,
    stories:worldStories,faults:[],state:null,distribution:false});
  // Selecting a ruler uses its fixed identity and Back returns to the same list.
  await page.locator('#scenariolist [data-scenario="yazdegerd_634"]').click();
  await expect(page.locator('#cg-name')).toHaveValue('Yazdegerd III');
  await page.locator('#btn-cg-back').click();
  await expect(page.locator('#scenariolist [data-scenario]')).toHaveCount(9);
});

for (const entry of starts) test(entry.id+' code and direct creation select full content and restore without initialization',async function ({page},info) {
  await useReleasedStartRules(page); await openGame(page,info);
  await page.evaluate(function (entry) {
    if (!entry.realm) return;
    const adopt = FB.adoptStartingRealm;
    FB.adoptStartingRealm = function (s,scenario,options) {
      FB.adoptStartingRealm = adopt;
      const c = s.chars[s.player.charId], r = s.realms[scenario.rulerRealmId];
      window.__court = {person:c.id,generation:r.ruler.generation,funds:FB.treasuryAvailable(s,r.id),
        family:JSON.stringify([c.spouseId,c.childrenIds])};
      return adopt(s,scenario,options);
    };
  },entry);
  const code = 'ACTIVATE634-634-'+entry.id+'-'+entry.home+'-m-'+(entry.name || 'Review')+'-'+
    (entry.realm ? 'standard' : 'established')+(entry.faith ? '-0-'+entry.culture+'.'+entry.faith : '');
  await enterCode(page,code);
  // The public constructor consumes the ordinary parsed setup, with no
  // visibility, identity, track or revision overrides in this fixture.
  await page.evaluate(function () { FB.game.start(); FB.game.setPaused(true); });
  await page.getByRole('button',{name:'Begin',exact:true}).click();
  expect(await page.evaluate(function (entry) {
    FB.game.setPaused(true);
    const s = FB.state, c = s.chars[s.player.charId], b = FB.campaignBookmark(s), old = window.__court;
    const county = b.provinces.find(function (p) { return p.id === entry.home; });
    const choice = !entry.choice || FB.stories.apply(s,entry.tracks[0],entry.choice,
      FB.stories.quote(s,entry.tracks[0],entry.choice));
    const court = entry.realm ? c.id === old.person && !s.realms[entry.realm] && s.realms.player.ruler.generation === old.generation &&
      FB.treasuryAvailable(s,'player') === old.funds && JSON.stringify([c.spouseId,c.childrenIds]) === old.family &&
      FB.governments.forRealm(s,'player').id === entry.form : !s.realms.player;
    s.player.gold -= 3;
    return {id:s.start.id,scenario:s.start.scenarioId,revision:s.start.revision,home:s.player.provinceId,
      identity:entry.faith ? c.culture === entry.culture && c.religion === entry.faith :
        FB.provinceCommunities(county).some(function (p) { return p.culture === c.culture && p.religion === c.religion; }),
      court:court,
      tracks:s.start.storyAttachments.tracks.slice().sort(),world:s.start.storyAttachments.world.slice().sort(),
      records:Object.keys(s.stories).sort(),choice:!!choice,valid:FB.save.v4.validatePlatform(s)};
  },entry)).toEqual({id:'634',scenario:entry.id,revision:'core_courts_v4',home:entry.home,identity:true,court:true,
    tracks:entry.tracks.slice().sort(),world:worldStories.slice().sort(),records:worldStories.concat(entry.tracks).sort(),choice:true,valid:true});
  const before = await page.evaluate(savedFacts), saved = await page.evaluate(function () { return FB.save.serialize(); });
  await page.evaluate(function () {
    return new Promise(function (resolve,reject) {
      FB.activateBookmark('867',null,function (error) { if (error) reject(error); else resolve(); });
    });
  });
  await preserveTwice(page,saved,before);
});

test('ordinary household picker creates the complete world and a cold page resumes it',async function ({page},info) {
  await useReleasedStartRules(page); await openTitle(page,info); await chooseBeginning(page);
  await page.locator('#bookmarklist [data-bookmark="634"]').click();
  await page.evaluate(function () { FB.game.pending.seed = 'PICKER634'; });
  await page.locator('#scenariolist [data-scenario="damascus_household_634"]').click();
  await expect(page.locator('#pickprov:not(.hidden)')).toBeVisible();
  await page.locator('#btn-pick-random').click();
  await expect(page.locator('#chargen:not(.hidden)')).toBeVisible();
  await page.locator('#cg-name').fill('Resident');
  await page.getByRole('button',{name:'Begin Your Story',exact:true}).click();
  await page.getByRole('button',{name:'Begin',exact:true}).click();
  expect(await page.evaluate(function () {
    FB.game.setPaused(true);
    const s = FB.state;
    s.player.gold -= 4;
    return {revision:s.start.revision,scenario:s.start.scenarioId,
      tracks:s.start.storyAttachments.tracks.slice().sort(),world:s.start.storyAttachments.world.slice().sort()};
  })).toEqual({revision:'core_courts_v4',scenario:'damascus_household_634',
    tracks:['damascus_household_full_634','opening_damascus_full_634'],world:worldStories.slice().sort()});
  const before = await page.evaluate(savedFacts), saved = await page.evaluate(function () { return FB.save.serialize(); });
  await openTitle(page,info);
  await preserveTwice(page,saved,before);
});

for (const id of ['634','867']) test(id+' retained or released-world selection keeps its own content on restore',async function ({page},info) {
  await useReleasedStartRules(page); await openGame(page,info);
  if (id === '634') await page.evaluate(function () { FBDATA.bookmarks['634'].revision = 'core_identities_v3'; });
  await enterCode(page,id === '634' ? 'RETAIN634-634-farmer_634-kufa-m-Review-established' : 'RELEASED867-867-serf-london-m-Review-standard');
  await page.getByRole('button',{name:'Begin Your Story',exact:true}).click();
  await page.getByRole('button',{name:'Begin',exact:true}).click();
  expect(await page.evaluate(function () {
    FB.game.setPaused(true); FB.state.player.gold -= 1;
    return Object.keys(FB.state.stories || {}).filter(function (id) {
      return ['syrian_front_634','iraqi_front_634','umar_court_agenda_634','heraclius_court_agenda_634','damascus_household_full_634'].indexOf(id) >= 0;
    });
  })).toEqual([]);
  const before = await page.evaluate(savedFacts), saved = await page.evaluate(function () { return FB.save.serialize(); });
  await page.evaluate(function () {
    const raw = FBDATA.bookmarks['634']; raw.revision = 'core_courts_v4';
    return new Promise(function (resolve,reject) {
      FB.activateBookmark('634',null,function (error) { if (error) reject(error); else resolve(); });
    });
  });
  await preserveTwice(page,saved,before);
});

test('634 Observe uses the full world without enrolling a personal start',async function ({page},info) {
  await useReleasedStartRules(page); await openTitle(page,info); await chooseBeginning(page);
  await page.locator('#bookmarklist [data-bookmark="634"]').click();
  await page.evaluate(function () {
    const observe = FB.game.startObserve;
    FB.game.startObserve = function () {
      const result = observe.apply(this,arguments); FB.game.setPaused(true); FB.game.startObserve = observe; return result;
    };
  });
  await page.locator('#scenariolist button').filter({hasText:'Observe'}).click();
  await expect(page.locator('#game:not(.hidden)')).toBeVisible();
  expect(await page.evaluate(function () {
    const s = FB.state;
    return {observe:FB.game.observe,id:s.start.id,revision:s.start.revision,date:s.date,
      personal:FB.stories.list().filter(function (story) { return story.kind === 'track' && !!s.stories[story.id]; }).map(function (story) { return story.id; }),
      world:Object.keys(s.stories).sort(),sasanian:FB.governments.forRealm(s,'sasanian_634').id};
  })).toEqual({observe:true,id:'634',revision:'core_courts_v4',date:{year:634,season:2,day:1},
    personal:[],world:worldStories.slice().sort(),sasanian:'aristocratic_monarchy'});
});

test('unsupported and hidden beginnings reject codes and direct setup atomically',async function ({page},info) {
  await useReleasedStartRules(page); await openGame(page,info); await chooseBeginning(page);
  await page.locator('#bookmarklist [data-bookmark="634"]').click();
  expect(await page.evaluate(function () {
    const b = FB.bookmark('634');
    return FBDATA.startScenarios.filter(function (row) {
      return FB.startRuntimeReport(row,b).available;
    }).map(function (row) { return row.id; }).sort();
  })).toEqual(offeredIds.slice().sort());
  // A stale preview cannot bypass a subsequently hidden authored declaration.
  await page.evaluate(function () { FBDATA.startScenarios.find(function (row) { return row.id === 'umar_634'; }).hidden = true; });
  await page.locator('#btn-ng-back').click();
  await page.locator('#bookmarklist [data-bookmark="634"]').click();
  await expect(page.locator('#scenariolist [data-scenario="umar_634"]')).toHaveCount(0);
  await page.locator('#btn-ng-back').click(); await page.locator('#btn-bm-seed').click();
  for (const id of ['umar_634','jabala_634','paid_service_634','serf','federate_476','cleric_493']) {
    await page.locator('#ng-seed').fill('HIDDEN634-634-'+id+'-medina-m-'+(id === 'umar_634' ? 'Umar' : 'Review')+'-standard');
    await page.locator('#ng-seed').press('Enter');
    await expect(page.locator('#ng-seed-err')).not.toHaveText('');
    await expect(page.locator('#chargen:not(.hidden)')).toHaveCount(0);
  }
  await page.locator('#ng-cancel').click();
  expect(await page.evaluate(function (ids) {
    const rejected = FBDATA.startScenarios.filter(function (row) { return ids.indexOf(row.id) < 0 || row.hidden; });
    rejected.push({id:'jabala_634'},{id:'paid_service_634'});
    return rejected.every(function (row) {
      const stale = Object.assign({},row,{hidden:false});
      FB.game.pending = {bookmarkId:'634',scenario:stale,seed:'HIDDEN634',provinceId:row.fixedProvinceId || 'medina'};
      const state = FB.state, rng = FB.getRngState(), uid = FB.getUidCounter(), storage = JSON.stringify(localStorage);
      return FB.game.start() === false && FB.state === state && FB.getRngState() === rng &&
        FB.getUidCounter() === uid && JSON.stringify(localStorage) === storage && !FB.game.observe;
    });
  },offeredIds)).toBe(true);
});

test('hiding the effective 634 world closes every fresh route including Observe',async function ({page},info) {
  await useReleasedStartRules(page); await openGame(page,info);
  await page.evaluate(function () { FBDATA.bookmarks['634'].revisions.core_courts_v4.hidden = true; });
  await chooseBeginning(page); await expect(page.locator('#bookmarklist [data-bookmark="634"]')).toHaveCount(0);
  await page.locator('#btn-bm-seed').click();
  await page.locator('#ng-seed').fill('HIDDEN634-634-farmer_634-kufa-m-Review-established');
  await page.locator('#ng-seed').press('Enter');
  await expect(page.locator('#ng-seed-err')).toContainText('hidden for new campaigns');
  await page.locator('#ng-cancel').click();
  await page.evaluate(function () {
    return new Promise(function (resolve,reject) {
      FB.activateBookmark('634',null,function (error) { if (error) reject(error); else resolve(); });
    });
  });
  expect(await page.evaluate(function () {
    FB.game.pending = {bookmarkId:'634',seed:'HIDDEN634',provinceId:'kufa',
      scenario:FBDATA.startScenarios.find(function (row) { return row.id === 'farmer_634'; })};
    const state = FB.state, rng = FB.getRngState(), uid = FB.getUidCounter();
    return {start:FB.game.start(),observe:FB.game.startObserve(),
      pure:FB.state === state && FB.getRngState() === rng && FB.getUidCounter() === uid && !FB.game.observe};
  })).toEqual({start:false,observe:false,pure:true});
});
