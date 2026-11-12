'use strict';
const fs = require('fs');
const path = require('path');
const {test,expect} = require('../support/fixture');
const {openGame,prepareGameContent} = require('../support/game/navigation');
const {beginBookmark,restoreBookmark} = require('../support/game/bookmark-acceptance');
const {eagerDocument,manifestRuns} = require('../fixtures/bookmark-manifest/eager-document');
const {dependsOnRuntime} = require('../support/runtime-dependencies');

const root = path.resolve(__dirname,'../../..');
const courtSources = [''].concat('abcdefghijklmnopqrst'.split('').map(function (s) { return '_'+s; }))
  .map(function (s) { return 'data/bookmark_634_courts'+s+'.js'; });
const dataSources = ['data/bookmark_634_identities.js'].concat(courtSources,[
  'data/bookmark_634_scaffold_a.js','data/bookmark_634_scaffold_b.js',
  'data/bookmark_634_scaffold_c.js','data/bookmark_634_scaffold_d.js','data/bookmark_634_routes.js',
  'data/starts_634_ordinary.js','data/bookmark_634.js','data/bookmark_634_campaigns.js',
  'data/story_campaigns_634.js','data/starts_634_ctesiphon.js','data/starts_634_rulers.js',
  'data/starts_634_damascus.js','data/starts_634_frontier.js','data/starts_634_medina.js',
  'data/story_ruler_agendas_634.js','data/story_households_634_ctesiphon.js',
  'data/story_households_634_damascus.js','data/story_households_634_frontier.js',
  'data/story_households_634_medina.js','data/story_household_effects_634.js',
  'data/story_opening_goals_634.js','data/start_ambitions_634.js'
]);
dependsOnRuntime(__filename,['data/bookmark_manifest.js','index.html','Dockerfile','.dockerignore','sw.js','data/bookmark_sources.js','data/story_instances.js',
  'data/bookmark_568_identities.js','data/bookmark_568_scaffold_b.js',
  'data/technology.js','js/bookmark_composition.js',
  'js/bookmark_sources.js','js/starts.js','js/stories.js','js/story_campaign.js',
  'js/story_household.js','js/story_household_observer.js','js/story_opening_goals.js',
  'js/story_ruler_agenda.js','js/bookmark_setup.js','js/actions.js','js/wars.js','js/world.js',
  'js/governments.js','js/government_selection.js','js/government_aristocracy.js',
  'js/treasury.js','js/technology.js','js/institutions.js','js/holywar.js','js/rebellions.js','js/save.js','js/save_v4.js','js/mods.js',
  'js/i18n.js','js/main.js','js/ui_misc.js','js/ui_modals.js'].concat(dataSources));

const worldStories = ['syrian_front_634','iraqi_front_634','damascus_household_observer_634',
  'ctesiphon_household_observer_634','medina_household_observer_634',
  'syrian_households_634','iraqi_households_634','district_authority_households_634'];
const starts = [
  {id:'umar_634',home:'medina',culture:'arabic',faith:'medinan_court_634',realm:'rashidun_634',
    tracks:['umar_court_agenda_634','opening_umar_court_634'],
    peace:['umar_keep_accounts','umar_keep_syria','umar_keep_iraq','umar_keep_court']},
  {id:'heraclius_634',home:'constantinople',culture:'greek',faith:'chalcedonian',realm:'byzantium_634',
    tracks:['heraclius_court_agenda_634','opening_heraclius_court_634'],
    peace:['heraclius_keep_administration','heraclius_keep_accounts','heraclius_keep_syria','heraclius_keep_court']},
  {id:'damascus_household_634',home:'damascus',culture:'syriac',faith:'chalcedonian_local_634',
    tracks:['damascus_household_full_634','opening_damascus_full_634'],
    peace:['take_stock','defer_work','keep_plans','stay','continue_life'],terminal:'stayed',focus:'craft_work'},
  {id:'ctesiphon_household_634',home:'baghdad',culture:'syriac',faith:'east_syriac_local_634',
    tracks:['ctesiphon_household_track_634','opening_ctesiphon_634'],
    peace:['take_stock','defer_work','review_records','keep_plans','stay','continue_life'],terminal:'stayed',focus:'work_land'},
  {id:'medina_household_634',home:'medina',culture:'arabic',faith:'early_islam_634',
    tracks:['medina_household_track_634','opening_medina_634'],
    peace:['consider_home','decline_work','preserve_savings','keep_day','reflect','independent_livelihood','leave_future_open'],
    terminal:'open_future',focus:'work_land'},
  {id:'frontier_household_634',home:'damascus',culture:'arabic',faith:'west_syriac_lay_634',
    tracks:['frontier_household_track_634','opening_frontier_634'],
    peace:['work_first','decline','independent','stay'],terminal:'close',focus:'craft_work'},
  {id:'farmer_634',home:'kufa',tracks:[],focus:'work_land'},
  {id:'craftsman_634',home:'damascus',tracks:[],focus:'craft_work'}
];

async function load(page,info) {
  await openGame(page,info); await prepareGameContent(page);
  expect(await page.evaluate(function () {
    const b = FB.bookmark('634','core_courts_v4');
    return b ? FB.validateBookmark(b) : FB.bookmarkRuntimeDiagnostics();
  })).toEqual([]);
}

async function begin(page,entry) {
  const setup = await page.evaluate(function (entry) {
    // Visibility is changed only inside this isolated review context.
    const raw = FBDATA.bookmarks['634']; raw.revision = 'core_courts_v4';
    raw.revisions.core_courts_v4.hidden = false;
    const b = FB.bookmark('634'), row = FBDATA.startScenarios.find(function (r) { return r.id === entry.id; });
    row.hidden = false;
    if (!FB.startProvinceAllowed(row,b,entry.home)) throw new Error('Unavailable start: '+entry.id);
    const identity = FB.startIdentity(row,b), county = b.provinces.find(function (p) { return p.id === entry.home; });
    if (row.rulerRealmId) {
      const adopt = FB.adoptStartingRealm;
      FB.adoptStartingRealm = function (s,scenario,options) {
        FB.adoptStartingRealm = adopt;
        const r = s.realms[scenario.rulerRealmId];
        window.adoptedCourt = {person:s.player.charId,generation:r.ruler.generation,
          gold:r.treasury.gold,knowledge:JSON.parse(JSON.stringify(s.realmTech[scenario.rulerRealmId])),
          kin:[s.chars[s.player.charId].spouseId,s.chars[s.player.charId].childrenIds]};
        return adopt(s,scenario,options);
      };
    }
    return {name:row.name,code:'CATALOGUE-634-'+row.id+'-'+entry.home+'-m-'+(row.characterName || 'Review')+
      '-'+(row.rulerRealmId ? 'standard' : 'established')+'-0-'+
      (identity.startCulture || county.culture)+'.'+(identity.startReligion || county.religion)};
  },entry);
  const full = page.locator('#btn-choose-beginning');
  if (await full.isVisible()) await full.click();
  else await page.getByRole('button',{name:'New Game',exact:true}).click();
  // Check the real offered picker before entering its equivalent start code.
  await page.locator('#bookmarklist [data-bookmark="634"]').click();
  await expect(page.getByRole('button',{name:new RegExp('^'+setup.name)})).toBeVisible();
  await page.locator('#btn-ng-back').click();
  await page.locator('#btn-bm-seed').click();
  await page.locator('#ng-seed').fill(setup.code); await page.locator('#ng-seed').press('Enter');
  await expect(page.locator('#chargen:not(.hidden)')).toBeVisible();
  await page.getByRole('button',{name:'Begin Your Story',exact:true}).click();
  await page.getByRole('button',{name:'Begin',exact:true}).click();
  await page.evaluate(function () { FB.game.setPaused(true); });
}

function facts() {
  const e = JSON.parse(FB.save.serialize()), s = FB.save.expandedSnapshot(e.state);
  // Restore materializes these optional empty ledgers. Normalize only the
  // detached comparison snapshot; every existing entry still compares exactly.
  if (s.countySupport === undefined) s.countySupport = {};
  s.rebellions = Object.assign({groups:{},warnings:{},cooldowns:{}},s.rebellions || {});
  s.greatHolyWarHistory = Object.assign({sequence:0,campaigns:[],cooldownUntil:{},firstCall:{},firstLaunched:{},
    headState:{},sacredLossSince:{},unlockChecked:{}},s.greatHolyWarHistory || {});
  function ordered(v) {
    if (Array.isArray(v)) return v.map(ordered);
    if (!v || typeof v !== 'object') return v;
    const out = {}; Object.keys(v).sort().forEach(function (k) { out[k] = ordered(v[k]); }); return out;
  }
  return {mods:e.mods,rng:e.rng>>>0,uid:e.uid,state:ordered(s)};
}

function sameFacts(actual,expected) {
  expect({mods:actual.mods,rng:actual.rng,uid:actual.uid}).toEqual({mods:expected.mods,rng:expected.rng,uid:expected.uid});
  const keys = Array.from(new Set(Object.keys(actual.state).concat(Object.keys(expected.state))));
  expect(keys.filter(function (key) { return JSON.stringify(actual.state[key]) !== JSON.stringify(expected.state[key]); }),
    'Every saved state section survives exactly').toEqual([]);
}

async function roundTrip(page) {
  const before = await page.evaluate(facts), saved = await page.evaluate(function () { return FB.save.serialize(); });
  // Switch away before loading: restoration must activate the saved revision.
  await page.evaluate(function () {
    FBDATA.bookmarks['634'].revision = 'core_identities_v3';
    FBDATA.bookmarks['634'].revisions.core_courts_v4.hidden = true;
    return new Promise(function (resolve,reject) {
      FB.activateBookmark('867',null,function (error) { if (error) reject(error); else resolve(); });
    });
  });
  await restoreBookmark(page,saved);
  sameFacts(await page.evaluate(facts),before);
  await restoreBookmark(page,await page.evaluate(function () { return FB.save.serialize(); }));
  sameFacts(await page.evaluate(facts),before);
}

test('complete catalogue has one loader position per source and no private or test runtime inputs',async function ({page},info) {
  const shell = fs.readFileSync(path.join(root,'index.html'),'utf8');
  const manifest = fs.readFileSync(path.join(root,'data/bookmark_manifest.js'),'utf8');
  const html = eagerDocument(shell,manifestRuns(manifest));
  const tags = Array.from(html.matchAll(/<script\b[^>]*\bsrc="([^"]+)"[^>]*>/g));
  dataSources.concat(['data/bookmark_sources.js','data/story_instances.js']).forEach(function (source) {
    const matching = tags.filter(function (m) { return m[1] === source; });
    expect(matching,source).toHaveLength(1); expect(matching[0][0]).toMatch(/\bdefer\b/);
    expect(fs.existsSync(path.join(root,source)),source).toBe(true);
  });
  expect(tags.filter(function (m) { return /(?:^|\/)(?:notes|tests|node_modules)\//.test(m[1]) || /[?#]/.test(m[1]); })).toEqual([]);
  const positions = dataSources.map(function (source) { return tags.findIndex(function (m) { return m[1] === source; }); });
  expect(positions).toEqual(positions.slice().sort(function (a,b) { return a-b; }));
  expect(tags.findIndex(function (m) { return m[1] === 'data/bookmark_sources.js'; })).toBeGreaterThan(positions[positions.length-1]);
  const docker = fs.readFileSync(path.join(root,'Dockerfile'),'utf8');
  expect(docker).toContain('COPY data/ /usr/share/nginx/html/data/');
  expect(docker).toContain('(css|js|data|mods)/');
  expect(docker).not.toMatch(/^COPY\s+(?:\.\s|(?:notes|tests)\/)/m);
  expect(fs.readFileSync(path.join(root,'.dockerignore'),'utf8').split(/\r?\n/)).toContain('tests');
  expect(fs.readFileSync(path.join(root,'sw.js'),'utf8')).toContain("'__FB_ASSET_LIST__'");
  // Engine dispatch is type-owned. Historical content ids belong in data.
  ['starts.js','stories.js','story_campaign.js','story_household.js','story_household_observer.js',
    'story_opening_goals.js','story_ruler_agenda.js'].forEach(function (name) {
    expect(fs.readFileSync(path.join(root,'js',name),'utf8').match(/['"][a-z_]*634[a-z_0-9]*['"]/g) || [],name).toEqual([]);
  });
  await load(page,info);
  expect(await page.evaluate(function (input) {
    const b = FB.bookmark('634','core_courts_v4'), earlier = FB.bookmark('634');
    const offered = FBDATA.startScenarios.filter(function (r) {
      return r.bookmarkIds && r.bookmarkIds.indexOf('634') >= 0 && (!b.starts || b.starts.indexOf(r.id) >= 0);
    });
    const registry = FB.stories.list().map(function (r) { return r.id; });
    const regions = Object.keys(FBDATA.bookmarkRegions634).sort();
    const sourceRealms = ['core'].concat('abcdefghijklmnopqrst'.split('')).reduce(function (rows,key) {
      return rows.concat(FBDATA['bookmarkRevisionContent_634_courts'+(key === 'core' ? '' : '_'+key)].realms);
    },[]);
    const ids = sourceRealms.map(function (r) { return r.id; });
    const fullOnly = ['syrian_front_634','iraqi_front_634','syrian_households_634','iraqi_households_634','district_authority_households_634'];
    return {selected:earlier.revision,hidden:b.hidden,date:b.date,era:b.era,geography:b.geography,
      counts:[b.provinces.length,b.provinces.filter(function (p) { return !p.wasteland; }).length,b.realms.length],
      regions:regions.length,courts:ids.length === 122 && new Set(ids).size === 122 &&
        b.realms.every(function (r) { return JSON.stringify(r) === JSON.stringify(sourceRealms.find(function (a) { return a.id === r.id; })); }),
      institutions:Object.keys(b.localInstitutions).length,
      world:b.stories.slice().sort(),starts:offered.map(function (r) { return r.id; }).sort(),
      tracks:input.starts.map(function (entry) {
        const r = offered.find(function (r) { return r.id === entry.id; });
        return FB.startTracks(r,entry.home,b).slice().sort();
      }),
      once:registry.length === new Set(registry).size && b.stories.every(function (id) { return registry.indexOf(id) >= 0; }),
      older:FB.bookmarkRevisions('634').filter(function (r) { return r.revision !== b.revision; }).every(function (r) {
        return fullOnly.every(function (id) { return r.stories.indexOf(id) < 0; }) &&
          input.starts.every(function (entry) {
            if (!entry.tracks.length) return true;
            const sc = offered.find(function (s) { return s.id === entry.id; });
            const tracks = FB.startTracks(sc,entry.home,r);
            return tracks.indexOf('damascus_household_full_634') < 0 && tracks.indexOf('umar_court_agenda_634') < 0 &&
              tracks.indexOf('heraclius_court_agenda_634') < 0;
          });
      }),
      valid:FB.bookmarkRevisions('634').every(function (r) { return FB.validateBookmark(r).length === 0; }),
      text:offered.every(function (r) { return !!r.name && !!r.desc && !!r.intro; }),
      held:!offered.some(function (r) { return /yazdegerd|jabala/.test(r.id); }) && !FB.stories.get('yazdegerd_agenda_634')};
  },{starts:starts})).toEqual({selected:'core_identities_v3',hidden:true,date:{year:634,season:2,day:1},era:'late_antique',
    geography:'europe_regional_2',counts:[527,506,122],regions:33,courts:true,institutions:6,
    world:worldStories.slice().sort(),starts:starts.map(function (r) { return r.id; }).sort(),
    tracks:starts.map(function (r) { return r.tracks.slice().sort(); }),once:true,older:true,valid:true,text:true,held:true});
});

for (const entry of starts) test(entry.id+' has a complete quiet opening, interruption and exact current-content restoration',async function ({page},info) {
  await load(page,info); await begin(page,entry);
  expect(await page.evaluate(function (input) {
    const entry = input.entry, s = FB.state, c = s.chars[s.player.charId], b = FB.campaignBookmark(s);
    const before = JSON.stringify([s,FB.getRngState(),FB.getUidCounter()]);
    const choices = entry.tracks.length ? FB.stories.choices(s,entry.tracks[0]) : [];
    FB.stories.cards(s); FB.stories.choices(s,'syrian_front_634');
    const pure = before === JSON.stringify([s,FB.getRngState(),FB.getUidCounter()]);
    const source = s.realms.sasanian_634, steward = FB.aristocracy.state(s,'sasanian_634').regency.stewardId;
    const copy = function () { FB.invalidateRealmCache(); return JSON.parse(JSON.stringify(s)); };
    let death = true, succession = true, archived = true;
    if (entry.tracks.length) {
      const id = entry.tracks[0], story = FB.stories.get(id), died = copy(), next = copy();
      died.player.dead = true; died.chars[died.player.charId].dead = true; story.day(died,died.stories[id]);
      if (entry.realm) {
        next.realms.player.ruler.generation++;
        if (next.realms.player.succession) next.realms.player.succession.rulerGeneration++;
      } else next.player.charId = FB.householdMembers(next).find(function (p) { return p.id !== next.player.charId && !p.dead; }).id;
      story.day(next,next.stories[id]);
      death = entry.realm ? died.stories[id].status === 'agenda_interrupted' : died.stories[id].phase === 'interrupted';
      succession = entry.realm ? next.stories[id].status === 'agenda_interrupted' : next.stories[id].phase === 'interrupted';
      const profileId = entry.tracks[1], profile = FB.stories.get(profileId);
      profile.day(died,died.stories[profileId]); profile.day(next,next.stories[profileId]);
      archived = [died,next].every(function (t) {
        return Object.keys(t.stories[profileId].goals).every(function (key) { return t.stories[profileId].goals[key].status === 'archived'; });
      });
    }
    let receipt = true;
    if (entry.id === 'damascus_household_634' || entry.id === 'frontier_household_634') {
      const t = copy(), id = entry.tracks[0], observer = 'damascus_household_observer_634';
      const choose = function (choice) { return FB.stories.apply(t,id,choice,FB.stories.quote(t,id,choice)); };
      const damascus = entry.id === 'damascus_household_634';
      (damascus ? ['take_stock','defer_work'] : ['work_first','decline']).forEach(function (choice) {
        if (!choose(choice)) throw new Error('Missing local review route');
      });
      t.turn = 3; FB.transferProvince(t,'damascus','rashidun_634'); FB.stories.day(t);
      const reserved = !FB.stories.status(t,observer), enter = choose(damascus ? 'review_control' : 'changed_control');
      const q = FB.stories.quote(t,id,'acknowledge'), applied = FB.stories.apply(t,id,'acknowledge',q);
      const duplicate = FB.stories.apply(t,id,'acknowledge',q); FB.stories.day(t);
      receipt = reserved && enter && applied && !duplicate &&
        Object.keys(t.stories[id].householdReceipts).length === 1 &&
        Object.keys(t.stories[observer].householdReceipts).length === 0 && !FB.stories.status(t,observer);
    }
    const old = window.adoptedCourt;
    return {scenario:s.start.scenarioId,revision:s.start.revision,home:s.player.provinceId,
      identity:!entry.faith || (c.culture === entry.culture && c.religion === entry.faith),
      resident:!!entry.realm || FB.provinceCommunities(b.provinces.find(function (p) { return p.id === entry.home; }))
        .some(function (p) { return p.culture === c.culture && p.religion === c.religion; }),
      court:entry.realm ? c.id === old.person && !s.realms[entry.realm] &&
        s.realms.player.ruler.generation === old.generation && s.realms.player.treasury.gold === old.gold &&
        JSON.stringify([c.spouseId,c.childrenIds]) === JSON.stringify(old.kin) : !s.realms.player,
      knowledge:!entry.realm || !s.realmTech[entry.realm] &&
        JSON.stringify(s.realmTech.player) === JSON.stringify(Object.assign({},old.knowledge,{historicalSeeded:1})),
      attachments:s.start.storyAttachments.world.slice().sort(),tracks:s.start.storyAttachments.tracks.slice().sort(),
      records:Object.keys(s.stories).sort(),first:entry.tracks.length ? choices.length > 0 : true,
      work:entry.focus ? FB.focusStatus(s,entry.focus).can : FB.governments.publicAuthorityReadiness(s,'player').allowed,
      sasanian:!!source && !FB.realmRulerCharacterSnapshot(s,'sasanian_634').dead &&
        !!s.chars[steward] && !s.chars[steward].dead && FB.governments.publicAuthorityReadiness(s,'sasanian_634').allowed,
      pure:pure,death:death,succession:succession,archived:archived,receipt:receipt,valid:FB.save.v4.validatePlatform(s)};
  },{entry:entry})).toEqual({scenario:entry.id,revision:'core_courts_v4',home:entry.home,identity:true,resident:true,court:true,knowledge:true,
    attachments:worldStories.slice().sort(),tracks:entry.tracks.slice().sort(),records:worldStories.concat(entry.tracks).sort(),
    first:true,work:true,sasanian:true,pure:true,death:true,succession:true,archived:true,receipt:true,valid:true});
  expect(await page.evaluate(function (entry) {
    const s = FB.state;
    const resources = JSON.stringify([s.turn,s.date,s.player.gold,s.player.prestige,s.player.piety,s.realms,
      s.chars,s.owner,s.holder,s.holdings,s.wars]);
    const applied = (entry.peace || []).every(function (choice) {
      const id = entry.tracks[0], q = FB.stories.quote(s,id,choice);
      return q.allowed && FB.stories.apply(s,id,choice,q) && !FB.stories.apply(s,id,choice,q);
    });
    const terminal = !entry.terminal || s.stories[entry.tracks[0]].phase === entry.terminal;
    const unchanged = resources === JSON.stringify([s.turn,s.date,s.player.gold,s.player.prestige,s.player.piety,s.realms,
      s.chars,s.owner,s.holder,s.holdings,s.wars]);
    // A real expense makes resource replay visible without advancing the daily loop.
    s.player.gold -= 2;
    return {applied:applied,terminal:terminal,unchanged:unchanged};
  },entry)).toEqual({applied:true,terminal:true,unchanged:true});
  await roundTrip(page);
});

test('malformed complete content rejects atomically and an absent personal graph withholds only its start',async function ({page},info) {
  await load(page,info);
  expect(await page.evaluate(function () {
    const before = JSON.stringify([FBDATA,FB.state,FB.getRngState(),FB.getUidCounter(),localStorage]), results = [];
    function reject(edit) {
      const b = JSON.parse(JSON.stringify(FBDATA.bookmarks['634'])); edit(b.revisions.core_courts_v4);
      results.push(FB.mods.validate({name:'Invalid complete opening',bookmarks:{'634':b}}).length > 0);
    }
    reject(function (b) { b.stories.push('absent_frontier_source'); });
    reject(function (b) { b.stories.push(b.stories[0]); });
    reject(function (b) { b.startTrackOverrides.entries.medina_household_634 = {tracks:['absent_household_track'],trackLocations:{}}; });
    reject(function (b) { b.localInstitutions.rome_see.site = 'absent_site'; });
    return {results:results,pure:before === JSON.stringify([FBDATA,FB.state,FB.getRngState(),FB.getUidCounter(),localStorage])};
  })).toEqual({results:[true,true,true,true],pure:true});
  await page.route('**/data/story_households_634_medina.js',function (route) {
    return route.fulfill({contentType:'application/javascript',body:''});
  });
  await page.reload({waitUntil:'domcontentloaded'}); await prepareGameContent(page);
  expect(await page.evaluate(function () {
    const b = FB.bookmark('634','core_courts_v4');
    return {world:!!b,diagnostics:FB.bookmarkRuntimeDiagnostics().some(function (r) { return r.startId === 'medina_household_634'; }),
      withheld:!FBDATA.startScenarios.some(function (r) { return r.id === 'medina_household_634'; }),
      siblings:['farmer_634','frontier_household_634','damascus_household_634','ctesiphon_household_634'].every(function (id) {
        return FBDATA.startScenarios.some(function (r) { return r.id === id; });
      }),other:FB.validateBookmark(FB.bookmark('867'))};
  })).toEqual({world:true,diagnostics:true,withheld:true,siblings:true,other:[]});
});

test('Damascus full program and goals have literal display owners with identical effective definitions',async function ({page},info) {
  const source = fs.readFileSync(path.join(root,'data/story_households_634_damascus.js'),'utf8');
  const literal = source.slice(source.indexOf('FBDATA.householdTracks_634_damascus = {'),source.indexOf('(function ()'));
  expect(literal).toContain("damascus_household_full_634:{ id:'damascus_household_full_634'");
  expect(literal).toContain("opening_damascus_full_634:{ id:'opening_damascus_full_634'");
  await load(page,info);
  const display = await page.evaluate(function () {
    const d = FB.stories.get('damascus_household_full_634').declaration;
    const g = FB.stories.get('opening_damascus_full_634').declaration, text = [d.title,d.intro,g.title,g.intro];
    Object.keys(d.stages).forEach(function (id) {
      const stage = d.stages[id]; text.push(stage.name,stage.text);
      stage.choices.forEach(function (c) { text.push(c.label,c.detail); });
    });
    g.goals.forEach(function (goal) { text.push(goal.name,goal.text); });
    return text;
  });
  display.forEach(function (text) { expect(literal,'Every display field is present before composition').toContain("'"+text+"'"); });
  function definitions() {
    return ['damascus_household_track_634','damascus_household_full_634','opening_damascus_634','opening_damascus_full_634']
      .map(function (id) { return JSON.stringify(FB.stories.get(id).declaration); });
  }
  const current = await page.evaluate(definitions);
  const previous = fs.readFileSync(path.join(__dirname,'../fixtures/literal-household/634-damascus-before.js'),'utf8');
  await page.route('**/data/story_households_634_damascus.js',function (route) {
    return route.fulfill({contentType:'application/javascript',body:previous});
  });
  await page.reload({waitUntil:'domcontentloaded'}); await prepareGameContent(page);
  expect(await page.evaluate(definitions)).toEqual(current);
});

for (const front of ['syrian','iraqi']) test(front+' frontier remains independent through no start, divergence, interruption and persistence',async function ({page},info) {
  await load(page,info); await begin(page,starts[0]);
  expect(await page.evaluate(function (front) {
    const s = FB.state, id = front+'_front_634', other = (front === 'syrian' ? 'iraqi' : 'syrian')+'_front_634';
    const story = FB.stories.get(id), d = FB.stories.definition(s,story.declaration);
    const tick = function (t) { FB.invalidateRealmCache(); story.day(t,t.stories[id]); };
    const clone = function () { return JSON.parse(JSON.stringify(s)); };
    const untouched = JSON.stringify(s.stories[other]), baseline = clone();
    const noStart = clone(); noStart.date = {year:635,season:3,day:90}; noStart.turn = 629; tick(noStart);
    const third = front === 'syrian' ? 'sasanian_634' : 'byzantium_634', diverted = clone();
    FB.transferProvince(diverted,d.target.provinceId,third); tick(diverted);
    const neighbor = Object.keys(FB.world.adj[d.target.provinceId]).sort().find(function (pid) { return !FB.world.byId[pid].wasteland; });
    FB.transferProvince(s,neighbor,'player');
    const recognition = FB.governmentSelection.state(s,'player');
    recognition.recognition.consents = FB.governmentSelection.constituency(s,'player')
      .filter(function (m) { return m.active; }).map(function (m) { return m.id; });
    FB.invalidateRealmCache();
    const q = FB.stories.quote(s,id,'face_campaign');
    const accepted = FB.stories.apply(s,id,'face_campaign',q), duplicate = FB.stories.apply(s,id,'face_campaign',q);
    const record = s.stories[id], war = FB.ordinaryWarById(s,record.warId), interrupted = clone();
    interrupted.realms.player.ruler.generation++; interrupted.realms.player.succession.rulerGeneration++;
    tick(interrupted);
    const won = clone(); FB.transferProvince(won,d.target.provinceId,'player'); tick(won);
    return {noStart:noStart.stories[id].reason,uncommitted:noStart.stories[id].startedTurn === null,
      diverted:diverted.stories[id].reason,interrupted:interrupted.stories[id].reason,won:won.stories[id].result,
      accepted:accepted,duplicate:duplicate,war:!!war && war.attacker === 'player' && war.casus.type === 'aggression',
      days:record.deadline-record.startedTurn,other:untouched === JSON.stringify(s.stories[other]),
      noGrants:baseline.player.gold === s.player.gold && baseline.realms.player.treasury.gold === s.realms.player.treasury.gold,
      phase:record.phase};
  },front)).toEqual({noStart:'window_closed',uncommitted:true,diverted:'target_changed',interrupted:'authority_lost',won:'won',
    accepted:true,duplicate:false,war:true,days:front === 'syrian' ? 360 : 180,other:true,noGrants:true,phase:'started'});
  await roundTrip(page);
});

async function beginImportedCourt(page,info) {
  await load(page,info);
  const mod = await page.evaluate(function () {
    const b = JSON.parse(JSON.stringify(FBDATA.bookmarks['634']));
    b.revision = 'core_courts_v4'; b.revisions.core_courts_v4.hidden = false;
    b.revisions.core_courts_v4.localInstitutions.rome_see.representative.skills.dip = 7;
    return {name:'Autumn court configuration',bookmarks:{'634':b}};
  });
  expect(await page.evaluate(function (m) { return FB.mods.validate(m); },mod)).toEqual([]);
  await page.evaluate(function () { FB.ui.showMods(); });
  await page.locator('#modfile').setInputFiles({name:'autumn-courts.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(mod),'utf8')});
  await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded'}),page.locator('#mod-apply').click()]);
  await prepareGameContent(page); await begin(page,starts[4]);
  await page.evaluate(function () {
    const s = FB.state, id = 'medina_household_track_634';
    ['consider_home','decline_work','buy_provisions'].forEach(function (choice) {
      if (!FB.stories.apply(s,id,choice,FB.stories.quote(s,id,choice))) throw new Error('Missing household expense choice');
    });
  });
  expect(await page.evaluate(function () { return FB.mods.sig(); })).toMatch(/^effective-1-[a-f0-9]{64}$/);
  return mod;
}

test('ordinary JSON full-world content restores twice and malformed saves reject before mutation',async function ({page},info) {
  await beginImportedCourt(page,info);
  await roundTrip(page);
  const saved = await page.evaluate(function () { return FB.save.serialize(); });
  await page.reload({waitUntil:'domcontentloaded'}); await prepareGameContent(page); await restoreBookmark(page,saved);
  expect(await page.evaluate(function (text) {
    const before = JSON.stringify([FBDATA,FB.state,FB.getRngState(),FB.getUidCounter(),localStorage]), cases = [];
    function reject(edit) {
      const e = JSON.parse(text); e.state = FB.save.expandedSnapshot(e.state); edit(e);
      let rejected = false; try { FB.save.restore(e); } catch (error) { rejected = true; }
      cases.push(rejected && before === JSON.stringify([FBDATA,FB.state,FB.getRngState(),FB.getUidCounter(),localStorage]));
    }
    reject(function (e) { e.mods = 'effective-1-'+Array(65).join('0'); });
    reject(function (e) { e.mods = 'crazygames-content-foreign'; });
    reject(function (e) { e.state.start.storyAttachments.tracks.push('absent_track'); });
    reject(function (e) { e.state.stories.syrian_front_634.warId = 'absent_war'; });
    return cases;
  },saved)).toEqual([true,true,true,true]);
});

test('changed ordinary JSON full-world definitions reject saved content before mutation',async function ({page},info) {
  const mod = await beginImportedCourt(page,info);
  const saved = await page.evaluate(function () { return FB.save.serialize(); });
  mod.bookmarks['634'].revisions.core_courts_v4.localInstitutions.rome_see.representative.skills.dip = 8;
  await page.evaluate(function () { FB.ui.showMods(); });
  await page.locator('#modfile').setInputFiles({name:'autumn-courts.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(mod),'utf8')});
  await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded'}),page.locator('#mod-apply').click()]);
  await prepareGameContent(page);
  expect(await page.evaluate(function (text) {
    const before = JSON.stringify([FBDATA,FB.state,FB.getRngState(),FB.getUidCounter(),localStorage]);
    let rejected = false; try { FB.save.restore(JSON.parse(text)); } catch (error) { rejected = /mod set|incompatible content/.test(error.message); }
    return {rejected:rejected,pure:before === JSON.stringify([FBDATA,FB.state,FB.getRngState(),FB.getUidCounter(),localStorage])};
  },saved)).toEqual({rejected:true,pure:true});
});

test('unrelated ordinary date keeps its own attachments and current-content persistence',async function ({page},info) {
  await beginBookmark(page,info,'867');
  const before = await page.evaluate(facts), saved = await page.evaluate(function () { return FB.save.serialize(); });
  expect(await page.evaluate(function () {
    return {id:FB.state.start.id,foreign:Object.keys(FB.state.stories || {}).filter(function (id) { return /634/.test(id); }),
      sasanian:!!FB.state.realms.sasanian_634};
  })).toEqual({id:'867',foreign:[],sasanian:false});
  await restoreBookmark(page,saved); await restoreBookmark(page,await page.evaluate(function () { return FB.save.serialize(); }));
  sameFacts(await page.evaluate(facts),before);
});
