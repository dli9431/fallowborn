'use strict';
const path = require('path');
const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { startDeterministicGame } = require('../support/game/start');
const { beginBookmark, restoreBookmark } = require('../support/game/bookmark-acceptance');
const { releasedCatalogue } = require('../support/released-catalogue');
const { dependsOnRuntime } = require('../support/runtime-dependencies');
const released = require('../fixtures/released-catalogue.json');

dependsOnRuntime(__filename, [
  'index.html', 'data/technology.js', 'data/technology_early_refinements.js',
  'data/technology_foundations.js', 'data/technology_learning.js',
  'data/technology_civic_military.js', 'data/technology_maritime.js', 'data/technology_wind.js',
  'data/bookmarks.js', 'data/bookmark_867_expansion.js', 'data/bookmark_1066_inhabited.js',
  'data/eras.js', 'data/cultures.js', 'data/economy.js', 'data/map_data.js',
  'js/technology.js', 'js/economy.js', 'js/mods.js', 'js/save.js', 'js/save_v4.js',
  'js/main.js', 'js/world.js', 'js/starts.js', 'js/ui_modals.js', 'js/i18n.js'
]);

const additions = ['bookhand_standardization', 'feltmaking'];
const traditions = ['default','latin','byzantine','islamic','persianate','slavic',
  'nordic','steppe','baltic_finnic','caucasian','northeast_african'];

test.beforeEach(async function ({ page }) {
  // Observe the actual shipped source before and after its composer, before
  // the unrelated correction maps run. Never execute game scripts in Node.
  await page.addInitScript(function () {
    window.FBDATA = window.FBDATA || {};
    function snapshot() {
      return JSON.parse(JSON.stringify({tech:FBDATA.tech,caps:FBDATA.techCaps,
        grants:FBDATA.capabilities,buildings:FBDATA.buildings}));
    }
    Object.defineProperty(FBDATA,'tech_early_refinements',{
      configurable:true,
      set:function (value) {
        window.__beforeRefinements = snapshot();
        Object.defineProperty(this,'tech_early_refinements',{
          configurable:true,enumerable:true,writable:true,value:value});
      }
    });
    document.addEventListener('load',function (event) {
      const node = event.target;
      if (node.tagName === 'SCRIPT' && node.getAttribute('src') === 'data/technology_early_refinements.js')
        window.__afterRefinements = snapshot();
    },true);
  });
});

async function stageSovereign(page) {
  await page.evaluate(function () {
    const s = FB.state, pid = s.player.provinceId;
    FB.game.setPaused(true);
    s.player.tier = 4; s.player.provs = [pid]; s.player.gold = 10000;
    s.owner[pid] = s.holder[pid] = 'player'; s.dev[pid] = 8;
    FB.foundPlayerRealm(s); s.realms.player.liege = null;
    s.realmTech.player = {completed:[],exposed:[],active:[],progress:{},
      reserve:0,priorities:{},historicalSeeded:1};
    FB.invalidateTechBonuses();
  });
}

test('two complete refinements add only their declared effects, graph and simulation windows', async function ({ page }, info) {
  await openGame(page,info);
  const r = await page.evaluate(function () {
    const before = window.__beforeRefinements, after = window.__afterRefinements;
    const retained = JSON.parse(JSON.stringify(after.tech));
    Object.keys(FBDATA.tech_early_refinements).forEach(function (id) { delete retained[id]; });
    return {retained:retained,before:before.tech,
      newIds:Object.keys(after.tech).filter(function (id) { return !before.tech[id]; }).sort(),
      counts:[Object.keys(before.tech).length,Object.keys(after.tech).length],
      capsSame:JSON.stringify(before.caps) === JSON.stringify(after.caps),
      grantsSame:JSON.stringify(before.grants) === JSON.stringify(after.grants),
      assetsSame:JSON.stringify(before.buildings) === JSON.stringify(after.buildings),
      definitions:FBDATA.tech_early_refinements,
      reviews:[FBDATA.techImpactReviews.features.feltmaking,
        FBDATA.techImpactReviews.features.bookhand_standardization],
      errors:FB.validateTechnologyData(true),
      sources:Array.from(document.scripts).map(function (s) { return s.getAttribute('src'); }).filter(Boolean)};
  });
  expect(r.newIds).toEqual(additions); expect(r.counts).toEqual([187,189]);
  expect(r.retained).toEqual(r.before);
  expect(r.capsSame && r.grantsSame && r.assetsSame).toBe(true); expect(r.errors).toEqual([]);
  const felt = r.definitions.feltmaking, book = r.definitions.bookhand_standardization;
  expect(felt).toMatchObject({domain:'crafts',cost:20,req:[],unlocks:[],capabilities:[],
    history:{attested:[-500,600]},fx:{costs:{enterprise:-0.005}},sources:['HERODOTUS_IV_73_75']});
  expect(book).toMatchObject({domain:'learning',cost:50,req:['scriptoria','classical_grammar'],
    unlocks:[],capabilities:[],history:{attested:[650,850]},fx:{education:0.005},
    sources:['HMML_ST_GALL_116','CAMBRIDGE_MOORE_BEDE','MET_BOOKHANDS']});
  expect(traditions.map(function (id) { return felt.history.adoption[id]; })).toEqual([
    [-200,850],[-200,850],[-200,850],[-200,850],[-300,600],[-200,800],
    [-200,850],[-500,300],[-100,1000],[-300,700],[200,1000]
  ]);
  expect(traditions.map(function (id) { return book.history.adoption[id]; })).toEqual([
    [950,1200],[750,900],[800,950],[650,900],[700,950],[850,1100],
    [950,1150],[1000,1250],[1000,1250],[750,1000],[750,1050]
  ]);
  r.reviews.forEach(function (review, index) {
    expect(review).toMatchObject({mode:'soft',tech:[index ? 'bookhand_standardization' : 'feltmaking']});
    expect(review.rationale).toContain('Ordinary');
  });
  const source = 'data/technology_early_refinements.js';
  expect(r.sources.filter(function (s) { return s === source; })).toHaveLength(1);
  expect(r.sources.indexOf(source)).toBe(r.sources.indexOf('data/technology.js') + 1);
  expect(r.sources.indexOf(source)).toBeLessThan(r.sources.indexOf('data/technology_foundations.js'));
});

test('paid research adds one soft refinement without granting money, property, units or offices', async function ({ page }, info) {
  await openGame(page,info); await startDeterministicGame(page); await stageSovereign(page);
  const r = await page.evaluate(function () {
    const s = FB.state, rec = s.realmTech.player;
    const facts = function () { return JSON.stringify([s.player.gold,s.player.enterprises,s.player.holdings,
      s.buildings,s.armies,s.authority,s.localInstitutions,s.religiousHeads]); };
    const before = facts(); rec.completed = ['scriptoria'];
    const locked = FB.techCandidate(s,'bookhand_standardization').reqLocked;
    const denied = FB.selectTechProject(s,'bookhand_standardization');
    rec.completed = ['scriptoria','classical_grammar','water_power']; FB.invalidateTechBonuses();
    const start = {enterprise:FB.techCostFactor(s,'enterprise'),education:FB.techBonus(s,'education')};
    const started = [], paid = [];
    ['feltmaking','bookhand_standardization'].forEach(function (id) {
      started.push(FB.selectTechProject(s,id));
      const price = FB.techCost(s,id), old = rec.progress[id] || 0;
      FB.addResearch(s,price-old-1);
      paid.push({price:price,pending:!FB.hasTech(s,id)});
      FB.addResearch(s,1);
    });
    const final = {enterprise:FB.techCostFactor(s,'enterprise'),education:FB.techBonus(s,'education')};
    return {locked:locked,denied:denied,started:started,paid:paid,start:start,final:final,
      completed:rec.completed.filter(function (id) { return id === 'feltmaking' || id === 'bookhand_standardization'; }).sort(),
      active:rec.active,unchanged:before === facts(),repeat:FB.selectTechProject(s,'feltmaking'),
      floor:FBDATA.techCaps.costFloor.enterprise,educationCap:FBDATA.techCaps.education};
  });
  expect(r).toMatchObject({locked:true,denied:false,started:[true,true],completed:additions,
    active:[],unchanged:true,repeat:false,floor:0.55,educationCap:0.20});
  for (const item of r.paid) { expect(item.price).toBeGreaterThan(1); expect(item.pending).toBe(true); }
  expect(r.final.enterprise).toBeCloseTo(r.start.enterprise - 0.005,10);
  expect(r.final.education).toBeCloseTo(r.start.education + 0.005,10);
});

for (const year of [867,1066]) {
  test(year + ' fresh knowledge has exact refinement deltas and unchanged retained knowledge and world hashes', async function ({ page }, info) {
    await beginBookmark(page,info,String(year),'farmer');
    const r = await page.evaluate(function (input) {
      const table = FBDATA.tech, s = FB.state, declarations = JSON.stringify(FBDATA.bookmarks);
      function seed(tradition, remove) {
        const copy = JSON.parse(JSON.stringify(s)); copy.realmTech = {};
        if (tradition) copy.realms = {review:{id:'review',alive:true,capital:s.player.provinceId,
          techTraditions:[tradition === 'default' ? 'latin' : tradition]}};
        try {
          if (remove || tradition === 'default') {
            FBDATA.tech = Object.assign({},table);
            input.ids.forEach(function (id) {
              if (remove) delete FBDATA.tech[id];
              else {
                // A valid declaration can supply only the default window.
                // Use a real tradition whose missing pair falls back to it.
                FBDATA.tech[id] = JSON.parse(JSON.stringify(table[id]));
                FBDATA.tech[id].history.adoption = {default:table[id].history.adoption.default};
              }
            });
          }
          FB.seedRealmTechnologies(copy,true);
          const out = {};
          Object.keys(copy.realmTech).sort().forEach(function (rid) {
            const rec = copy.realmTech[rid];
            out[rid] = {completed:rec.completed.slice().sort(),exposed:rec.exposed.slice().sort()};
          });
          return out;
        } finally { FBDATA.tech = table; FB.invalidateTechBonuses(); }
      }
      const contexts = input.traditions.concat(['actual_world']);
      return {rows:contexts.map(function (tradition) {
        const name = tradition === 'actual_world' ? null : tradition;
        const current = seed(name,false), prior = seed(name,true), projected = {};
        Object.keys(current).forEach(function (rid) {
          projected[rid] = {};
          ['completed','exposed'].forEach(function (field) {
            projected[rid][field] = current[rid][field].filter(function (id) { return input.ids.indexOf(id) < 0; });
          });
        });
        return {tradition:tradition,prior:prior,projected:projected,current:current};
      }),declarations:declarations === JSON.stringify(FBDATA.bookmarks)};
    },{ids:additions,traditions:traditions});
    expect(r.declarations).toBe(true);
    const felt867 = ['default','latin','byzantine','islamic','persianate','slavic','nordic','steppe','caucasian'];
    const book1066 = ['latin','byzantine','islamic','persianate','caucasian','northeast_african'];
    for (const row of r.rows) {
      expect(row.projected).toEqual(row.prior);
      if (row.tradition === 'actual_world') { expect(Object.keys(row.current).length).toBeGreaterThan(10); continue; }
      const rec = row.current.review;
      expect(rec.completed.includes('feltmaking')).toBe(year === 1066 || felt867.includes(row.tradition));
      expect(rec.completed.includes('bookhand_standardization')).toBe(year === 1066 && book1066.includes(row.tradition));
      expect(rec.exposed.includes('bookhand_standardization')).toBe(year === 1066 ||
        !['default','nordic','steppe','baltic_finnic'].includes(row.tradition));
    }
    expect((await page.evaluate(releasedCatalogue,released.selection)).hashes).toEqual(released.hashes);
  });
}

test('mixed traditions choose one whole window and omissions never grant a replacement', async function ({ page }, info) {
  await beginBookmark(page,info,'867','farmer');
  const r = await page.evaluate(function () {
    function seed(year, traditions, omit) {
      const s = JSON.parse(JSON.stringify(FB.state)); s.date.year = year; s.realmTech = {};
      s.start.era = year < 1000 ? 'early_medieval' : 'high_medieval';
      s.realms = {review:{id:'review',alive:true,capital:s.player.provinceId,
        techTraditions:traditions,techSeed:{omit:omit || []}}};
      FB.seedRealmTechnologies(s,true);
      return s.realmTech.review.completed.filter(function (id) {
        return id === 'feltmaking' || id === 'bookhand_standardization';
      }).sort();
    }
    return {feltBoundary:[seed(849,['latin']),seed(850,['latin'])],
      bookBoundary:[seed(899,['latin']),seed(900,['latin'])],
      mixed:[seed(899,['latin','nordic']),seed(900,['nordic','latin'])],
      equalEmergence:[seed(799,['latin','slavic']),seed(800,['slavic','latin'])],
      omissions:[seed(1066,['latin'],['feltmaking']),seed(1066,['latin'],['scriptoria']),
        seed(1066,['latin'],['bookhand_standardization'])]};
  });
  expect(r).toEqual({feltBoundary:[[],['feltmaking']],bookBoundary:[['feltmaking'],additions],
    mixed:[['feltmaking'],additions],equalEmergence:[[],['feltmaking']],
    omissions:[['bookhand_standardization'],['feltmaking'],['feltmaking']]});
});

test('the same start replays paid player and nonplayer refinement completion', async function ({ page }, info) {
  const snapshots = [];
  for (let run = 0; run < 2; run++) {
    await openGame(page,info); await startDeterministicGame(page); await stageSovereign(page);
    snapshots.push(await page.evaluate(function () {
      const s = FB.state;
      const other = Object.keys(s.realms).filter(function (id) {
        const realm = s.realms[id]; return id !== 'player' && realm.alive && !realm.liege;
      }).sort()[0];
      if (!other) throw new Error('No independent research court');
      const rows = ['player',other].map(function (rid) {
        s.realmTech[rid] = {completed:['scriptoria','classical_grammar'],exposed:[],active:[],
          progress:{},reserve:0,priorities:{},historicalSeeded:1};
        const operations = ['feltmaking','bookhand_standardization'].map(function (id) {
          const started = FB.selectTechProject(s,id,rid,rid !== 'player');
          const cost = FB.techCost(s,id,rid); FB.addResearch(s,cost,rid);
          return {started:started,cost:cost,completed:FB.hasTech(s,id,rid)};
        });
        return {id:rid,operations:operations,record:s.realmTech[rid],
          enterprise:FB.techCostFactor(s,'enterprise',rid),education:FB.techBonus(s,'education',rid)};
      });
      return {rows:rows,rng:FB.getRngState(),uid:FB.getUidCounter()};
    }));
  }
  expect(snapshots[1]).toEqual(snapshots[0]);
  for (const row of snapshots[0].rows) for (const operation of row.operations) {
    expect(operation).toMatchObject({started:true,completed:true}); expect(operation.cost).toBeGreaterThan(0);
  }
});

test('an old matching save retains partial research and actual property without adding new knowledge', async function ({ page }, info) {
  await openGame(page,info); await startDeterministicGame(page); await stageSovereign(page);
  const before = await page.evaluate(function () {
    const s = FB.state, pid = s.player.provinceId;
    s.realmTech.player = {completed:['manuscript_codex'],exposed:['manuscript_codex','scriptoria'],
      active:['scriptoria'],progress:{scriptoria:7.25},reserve:3.5,priorities:{scriptoria:1200},historicalSeeded:1};
    s.buildings[pid] = [{s:0,id:'library'},{s:0,id:'hospice',ruined:true}];
    FB.invalidateBuildingIndex(s,pid); s.date.year = 1300;
    return {record:JSON.stringify(s.realmTech.player),assets:JSON.stringify(s.buildings),save:FB.save.serialize()};
  });
  await restoreBookmark(page,before.save);
  expect(await page.evaluate(function () {
    const s = FB.state;
    return {record:JSON.stringify(s.realmTech.player),assets:JSON.stringify(s.buildings),
      newKnowledge:FB.hasTech(s,'feltmaking') || FB.hasTech(s,'bookhand_standardization'),
      available:FB.techCandidate(s,'feltmaking').available,
      locked:FB.techCandidate(s,'bookhand_standardization').reqLocked};
  })).toEqual({record:before.record,assets:before.assets,newKnowledge:false,available:true,locked:true});
});

for (const input of [
  {file:'refinements-felting.json',id:'feltmaking',cost:27,known:['spindle_whorl'],missing:[],amount:-0.012,channel:'enterprise'},
  {file:'refinements-bookhands.json',id:'bookhand_standardization',cost:62,
    known:['scriptoria','classical_grammar','translation_schools'],missing:['scriptoria','classical_grammar'],amount:0.009,channel:'education'}
]) {
  test(input.file + ' imports independent terms, rejects malformed candidates purely and preserves exact saved content', async function ({ page }, info) {
    await openGame(page,info); await page.evaluate(function () { FB.ui.showMods(); });
    await page.locator('#modfile').setInputFiles(path.resolve(__dirname,'../fixtures/authoring/'+input.file));
    await Promise.all([page.waitForEvent('domcontentloaded'),page.locator('#mod-apply').click()]);
    await page.waitForFunction(function (p) {
      return window.FB && FB.game && FB.game.bootReady && FBDATA.tech[p.id].cost === p.cost;
    },input);
    await startDeterministicGame(page); await stageSovereign(page);
    const r = await page.evaluate(function (p) {
      const s = FB.state, rec = s.realmTech.player, data = JSON.stringify(FBDATA.tech);
      const state = JSON.stringify(s), rng = FB.getRngState(), uid = FB.getUidCounter();
      const faults = ['missing','cycle','window','effect'].map(function (kind) {
        const mod = {tech:{}}; mod.tech[p.id] = JSON.parse(JSON.stringify(FBDATA.tech[p.id]));
        if (kind === 'missing') mod.tech[p.id].req = ['missing_refinement_requirement'];
        if (kind === 'cycle') mod.tech[p.id].req = [p.id];
        if (kind === 'window') mod.tech[p.id].history.adoption.default = [1200,700];
        if (kind === 'effect') mod.tech[p.id].fx = {costs:{unknown_cost_channel:-0.1}};
        return FB.mods.validate(mod);
      });
      const pure = state === JSON.stringify(s) && data === JSON.stringify(FBDATA.tech) &&
        rng === FB.getRngState() && uid === FB.getUidCounter();
      rec.completed = p.missing; const locked = FB.techCandidate(s,p.id).reqLocked;
      rec.completed = p.known; FB.invalidateTechBonuses();
      const baseline = p.channel === 'enterprise' ? FB.techCostModifier(s,'enterprise') : FB.techBonus(s,'education');
      const started = FB.selectTechProject(s,p.id); FB.addResearch(s,FB.techCost(s,p.id));
      const final = p.channel === 'enterprise' ? FB.techCostModifier(s,'enterprise') : FB.techBonus(s,'education');
      const saved = {record:JSON.stringify(rec),save:FB.save.serialize()};
      // Imported effect magnitudes still use the ordinary national guards.
      const original = FBDATA.tech[p.id].fx;
      FBDATA.tech[p.id].fx = {costs:{enterprise:-2},education:2}; FB.invalidateTechBonuses();
      const guards = [FB.techCostFactor(s,'enterprise'),FB.techBonus(s,'education')];
      FBDATA.tech[p.id].fx = original; FB.invalidateTechBonuses();
      return {faults:faults,pure:pure,locked:locked,started:started,delta:final-baseline,
        guards:guards,record:saved.record,save:saved.save};
    },input);
    r.faults.forEach(function (errors) { expect(errors.length).toBeGreaterThan(0); });
    expect(r).toMatchObject({pure:true,locked:true,started:true,guards:[0.55,0.20]});
    expect(r.delta).toBeCloseTo(input.amount,10);
    await restoreBookmark(page,r.save);
    expect(await page.evaluate(function () { return JSON.stringify(FB.state.realmTech.player); })).toBe(r.record);
    await page.evaluate(function (p) {
      const stored = JSON.parse(localStorage.getItem('fb_mods')), mod = JSON.parse(stored[0]);
      mod.tech[p.id].cost++; localStorage.setItem('fb_mods',JSON.stringify([JSON.stringify(mod)]));
    },input);
    await openGame(page,info);
    expect(await page.evaluate(function (text) {
      const state = FB.state, world = FB.world, rng = FB.getRngState(), uid = FB.getUidCounter();
      return FB.game.loadData(JSON.parse(text)) === false && state === FB.state && world === FB.world &&
        rng === FB.getRngState() && uid === FB.getUidCounter();
    },r.save)).toBe(true);
  });
}
