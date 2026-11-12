'use strict';
const path = require('path');
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'index.html', 'data/systems.js', 'data/eras.js', 'data/bookmarks.js',
  'data/bookmark_476.js',
  'data/bookmark_1096.js', 'data/bookmark_1204.js',
  'data/bookmark_476_italy.js', 'data/bookmark_476_dalmatia_east.js',
  'data/bookmark_476_gaul_iberia.js', 'data/bookmark_476_africa.js', 'data/cultures.js', 'data/political_institutions.js',
  'data/political_blocs.js', 'data/policies.js', 'data/actions.js', 'data/economy.js',
  'data/traits.js', 'data/events_council.js', 'data/events_parliament.js',
  'data/events_peasant.js', 'data/events_tournament.js', 'data/events_paths.js',
  'data/events_world.js', 'data/events_war.js', 'data/events_noble.js',
  'js/systems.js', 'js/model.js', 'js/world.js', 'js/governments.js', 'js/authority.js',
  'js/main.js', 'js/actions.js', 'js/economy.js', 'js/events.js', 'js/politics.js',
  'js/institutions.js', 'js/religion.js', 'js/council.js', 'js/parliament.js', 'js/papacy.js',
  'js/holywar.js', 'js/abbeys.js', 'js/tournaments.js', 'js/save.js',
  'js/travel.js', 'js/wars.js', 'js/rebellions.js',
  'js/crazygames.js', 'data/distribution_crazygames.js', 'js/save_v4.js',
  'js/mods.js', 'js/ui_panels.js', 'js/ui_modals.js', 'js/ui_topbar.js',
  'js/ui_misc.js', 'js/ui_tournaments.js', 'js/mapview.js'
]);
const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { startDeterministicGame } = require('../support/game/start');
const { startParityGame } = require('../support/game/parity');
const { openCrazyGame } = require('../support/game/crazygames-title');
const { mockCrazyGames } = require('../support/crazygames');
const baseline476 = require('../fixtures/systems-476.json');

async function installAvailabilityReference(page) {
  await page.evaluate(function () {
    // Bounded availability oracle from 9ce6727e2bc7882a95e0c6c8984c22d96a074df0.
    function own(o, k) { return !!o && Object.prototype.hasOwnProperty.call(o, k); }
    function plain(o) { return !!o && typeof o === 'object' && !Array.isArray(o); }
    function requireId(id) {
      if (!(typeof id === 'string' && own(FBDATA.systems, id))) throw new Error('Unknown system ' + String(id) + '.');
    }
    function override(layer, id, previous) {
      if (!plain(layer)) return previous;
      if (own(layer, id) && typeof layer[id] === 'boolean') return layer[id];
      if (Array.isArray(layer.enable) && layer.enable.indexOf(id) >= 0) return true;
      if (Array.isArray(layer.disable) && layer.disable.indexOf(id) >= 0) return false;
      return previous;
    }
    function bookmark(state, context) {
      if (context && context.bookmark) return context.bookmark;
      var start = state && state.start;
      return start && start.id !== undefined && FB.bookmark ? FB.campaignBookmark(state) : FB.activeBookmark;
    }
    window.referenceSystemAvailable = function (state, id) {
      requireId(id);
      var bm = bookmark(state);
      var final = override(bm && bm.systems, id, null);
      if (final !== null) return final;
      if (id === 'great_holy_wars' && bm && typeof bm.greatHolyWars === 'boolean') return bm.greatHolyWars;
      if (FB.systemEnabled(state, id, { faith:null, realm:null })) return true;
      var faiths = FBDATA.religions || {};
      for (var faith in faiths) if (own(faiths, faith) && FB.systemEnabled(state, id, { faith:faith })) return true;
      for (var generated in state && state.faiths || {}) {
        if (FB.systemEnabled(state, id, { faith:generated })) return true;
      }
      for (var rid in state && state.realms || {}) {
        if (state.realms[rid] && state.realms[rid].alive && FB.systemEnabled(state, id, { realm:rid })) return true;
      }
      return false;
    };
  });
}

test('availability retains every scoped evaluation and short circuit while resolving its world once',
  async function ({ page }, info) {
    await openGame(page, info);
    await installAvailabilityReference(page);
    const rows = await page.evaluate(function () {
      const live = FBDATA, active = FB.activeBookmark, lookup = FB.bookmark;
      const enabled = FB.systemEnabled, government = FB.political.governmentFormId;
      const rows = [], id = 'royal_council';
      function run(stage, reference, missing, independent) {
        const base = {id:'e2e_availability', era:'early_medieval', revision:'fresh',
          revisions:{baseline:{}, fresh:{}}};
        const first = {name:'First', properties:{systems:{}}};
        const second = {name:'Second', properties:{systems:{}}};
        const s = {start:{id:base.id, revision:'baseline', era:base.era, defaultGovernment:'e2e_default'},
          faiths:{e2e_branch_a:{name:'Branch A', parent:'e2e_first', properties:{systems:{}}},
            e2e_branch_b:{name:'Branch B', parent:'e2e_second', properties:{systems:{}}}},
          realms:{dead:{alive:false}, absent:null, first:{alive:true, religion:'e2e_first'},
            second:{alive:true, religion:'e2e_second'}}};
        const era = Object.assign({}, live.eras.early_medieval, {systems:{}});
        const forms = {e2e_default:{systems:{}}, e2e_first:{systems:{}}, e2e_second:{systems:{}}};
        const defs = Object.assign({}, live.systems, {royal_council:Object.assign({}, live.systems[id], {defaultEnabled:false})});
        window.FBDATA = Object.assign({}, live, {systems:defs, eras:Object.assign({}, live.eras, {early_medieval:era}),
          bookmarks:{e2e_availability:base, e2e_other:{id:'e2e_other', systems:{royal_council:true}}},
          religions:{e2e_first:first, e2e_second:second}, governmentForms:forms});
        FB.activeBookmark = {id:'another_date', systems:{royal_council:true}};
        if (stage === 'default') defs[id].defaultEnabled = true;
        if (stage === 'era') era.systems = {enable:[id]};
        if (stage === 'government') forms.e2e_default.systems = {enable:[id]};
        if (stage === 'static first') first.properties.systems[id] = true;
        if (stage === 'static second') second.properties.systems[id] = true;
        if (stage === 'generated first') s.faiths.e2e_branch_a.properties.systems[id] = true;
        if (stage === 'generated second') s.faiths.e2e_branch_b.properties.systems[id] = true;
        if (stage === 'realm first') forms.e2e_first.systems[id] = true;
        if (stage === 'realm second') forms.e2e_second.systems[id] = true;
        if (stage === 'bookmark enable') base.systems = {enable:[id]};
        if (stage === 'bookmark disable') { base.systems = {disable:[id]}; defs[id].defaultEnabled = true; }
        let system = id;
        if (stage === 'legacy') { system = 'great_holy_wars'; base.greatHolyWars = false; }
        if (stage === 'legacy overridden') {
          system = 'great_holy_wars'; base.greatHolyWars = false; base.systems = {great_holy_wars:true};
        }
        if (missing) delete FBDATA.bookmarks[base.id];
        const before = JSON.stringify([s, FBDATA]), rng = FB.getRngState(), uid = FB.getUidCounter();
        const visits = [], contexts = [], worlds = [];
        let lookups = 0, independentLookups = 0, inIndependent = false;
        FB.bookmark = function (bid, revision) {
          if (inIndependent) independentLookups++; else lookups++;
          return lookup(bid, revision);
        };
        FB.political.governmentFormId = function (state, ref) {
          if (independent) {
            inIndependent = true;
            try {
              const answer = enabled({start:{id:'e2e_other'}}, id, {faith:null, realm:null});
              if (!answer) throw new Error('Independent query reused the outer world');
            }
            finally { inIndependent = false; }
          }
          return 'e2e_' + ref.id;
        };
        FB.systemEnabled = function (state, sid, context) {
          contexts.push(context);
          worlds.push(context.bookmark);
          const shape = {};
          Object.keys(context).forEach(function (key) { if (key !== 'bookmark') shape[key] = context[key]; });
          visits.push(shape);
          Object.freeze(context);
          return enabled(state, sid, context);
        };
        const caller = Object.freeze({faith:'caller', realm:'caller'});
        const value = (reference ? referenceSystemAvailable : FB.systemAvailable)(s, system, caller);
        const sample = {value:value, visits:visits.slice(), lookups:lookups, independentLookups:independentLookups,
          fresh:new Set(contexts).size === contexts.length,
          borrowed:worlds.every(function (world) { return reference || missing ? world === undefined : world === lookup(base.id, 'baseline'); }),
          pure:before === JSON.stringify([s, FBDATA]) && rng === FB.getRngState() && uid === FB.getUidCounter() &&
            caller.faith === 'caller' && caller.realm === 'caller'};
        // These mutations occur between complete public reads, in the same turn.
        if (stage === 'negative' && !reference && !missing && !independent) {
          function compare(expected) {
            const actual = FB.systemAvailable(s, id), original = referenceSystemAvailable(s, id);
            if (actual !== original || actual !== expected) throw new Error('Same-turn scope mutation was not observed');
          }
          s.faiths.e2e_branch_a.properties.systems[id] = true; FB.invalidateFaithState(s); compare(true);
          s.faiths.e2e_branch_a.properties.systems[id] = false; FB.invalidateFaithState(s); compare(false);
          first.properties.systems[id] = true; FB.invalidateReligionData(); compare(true);
          delete first.properties.systems[id]; FB.invalidateReligionData(); compare(false);
          forms.e2e_first.systems[id] = true; compare(true);
          // The realm-only check must infer faith and let it override government.
          s.realms.first.religion = 'e2e_branch_a'; compare(false);
          s.realms.first.religion = 'e2e_first'; compare(true);
          forms.e2e_first.systems[id] = false; compare(false);
        }
        return sample;
      }
      try {
        const stages = ['negative','default','era','government','static first','static second',
          'generated first','generated second','realm first','realm second',
          'bookmark enable','bookmark disable','legacy','legacy overridden'];
        stages.forEach(function (stage) {
          rows.push({stage:stage, candidate:run(stage, false), reference:run(stage, true)});
        });
        rows.push({stage:'missing world', candidate:run('negative', false, true), reference:run('negative', true, true)});
        rows.push({stage:'independent queries', candidate:run('negative', false, false, true),
          reference:run('negative', true, false, true)});
        return rows;
      } finally {
        window.FBDATA = live; FB.activeBookmark = active; FB.bookmark = lookup;
        FB.systemEnabled = enabled; FB.political.governmentFormId = government;
      }
    });
    const allVisits = [{faith:null, realm:null}, {faith:'e2e_first'}, {faith:'e2e_second'},
      {faith:'e2e_branch_a'}, {faith:'e2e_branch_b'}, {realm:'first'}, {realm:'second'}];
    const lengths = [7,1,1,1,2,3,4,5,6,7,0,0,0,0,7,7];
    rows.forEach(function (row, index) {
      const c = row.candidate, r = row.reference;
      expect(c.visits, row.stage).toEqual(allVisits.slice(0, lengths[index]));
      expect(c.visits, row.stage).toEqual(r.visits);
      expect(c.value, row.stage).toBe(r.value);
      expect(c.value, row.stage).toBe(['negative','bookmark disable','legacy','missing world','independent queries'].indexOf(row.stage) < 0);
      expect(c.lookups, row.stage).toBe(row.stage === 'missing world' ? 1 + lengths[index] : 1);
      expect(r.lookups, row.stage).toBe(1 + lengths[index]);
      expect(c.independentLookups, row.stage).toBe(row.stage === 'independent queries' ? 2 : 0);
      expect(c.independentLookups, row.stage).toBe(r.independentLookups);
      expect(c.fresh && c.borrowed && c.pure && r.fresh && r.borrowed && r.pure, row.stage).toBe(true);
    });
  });

for (const crazygames of [false, true]) {
test('availability matches the original search for retained campaigns, active dates and restored states, distribution ' + crazygames,
  async function ({ page }, info) {
    if (crazygames) {
      await mockCrazyGames(page);
      await page.addInitScript(function () { window.FB_DISTRIBUTION = 'crazygames'; window.FB_CRAZYGAMES_STORAGE = 'localstorage'; });
      await openCrazyGame(page, info);
    } else await openGame(page, info);
    await installAvailabilityReference(page);
    await page.addScriptTag({path:path.resolve(__dirname, '../fixtures/resolved-world-cache/uncached-bookmark.js')});
    await startDeterministicGame(page);
    const result = await page.evaluate(function () {
      const lookup = FB.bookmark, active = FB.activeBookmark, rows = [];
      function compare(s, label) {
        const before = JSON.stringify([s, FBDATA]), rng = FB.getRngState(), uid = FB.getUidCounter();
        FB.systems.ids().forEach(function (id) {
          const actual = FB.systemAvailable(s, id);
          FB.bookmark = uncachedBookmark;
          let expected;
          try { expected = referenceSystemAvailable(s, id); }
          finally { FB.bookmark = lookup; }
          if (actual !== expected) throw new Error(label + ': ' + id);
        });
        if (before !== JSON.stringify([s, FBDATA]) || rng !== FB.getRngState() || uid !== FB.getUidCounter())
          throw new Error(label + ': mutated query inputs');
        rows.push(label);
      }
      try {
        ['476','1096','1204'].forEach(function (id) {
          const base = FBDATA.bookmarks[id];
          FB.activeBookmark = FB.bookmark(id === '476' ? '1204' : '476');
          [undefined, 'baseline', base.revision].forEach(function (revision) {
            const s = {start:{id:id, revision:revision}, faiths:{e2e_branch:{name:'Branch', parent:'catholic',
              properties:{systems:{enable:['royal_council']}}}}, realms:{dead:{alive:false},
              live:{alive:true, religion:'e2e_branch'}}};
            compare(s, id + ':' + String(revision));
          });
        });
        compare(null, 'no state'); compare({}, 'no start');
        compare({start:{}}, 'missing start id'); compare({start:{id:null}}, 'null start id');
        FB.activeBookmark = null;
        compare(null, 'no active world');
        compare({start:{id:'e2e_missing_world', revision:'INVALID'}}, 'missing campaign world');
        FB.activeBookmark = active;
        compare(FB.state, 'before restore');
        const saved = FB.save.parseExport(FB.save.exportState());
        const fingerprint = FB.mods.fingerprint(FB.campaignBookmark(FB.state)), signature = FB.mods.sig();
        FB.activeBookmark = FB.bookmark('1204');
        compare(FB.state, 'campaign with another active date');
        FB.activeBookmark = active;
        FB.save.restore(saved);
        compare(FB.state, 'after restore');
        return {rows:rows, fingerprint:fingerprint === FB.mods.fingerprint(FB.campaignBookmark(FB.state)),
          signature:signature === FB.mods.sig(), restored:FB.state.start.id === saved.state.start.id};
      } finally { FB.bookmark = lookup; FB.activeBookmark = active; }
    });
    expect(result.rows).toHaveLength(18);
    expect(result).toMatchObject({fingerprint:true, signature:true, restored:true});
  });
}

test('system rules resolve default, era, government, faith, then bookmark without mutation',
  async function ({ page }, testInfo) {
    await openGame(page, testInfo);
    await startDeterministicGame(page);
    const result = await page.evaluate(function () {
      const s = FB.state;
      const rid = Object.keys(s.realms).find(function (id) {
        return id !== 'player' && s.realms[id].alive;
      });
      const era = FBDATA.eras[FB.campaignEra(s)];
      const form = FBDATA.governmentForms[FB.political.government(s,
        { kind:'realm', id:rid }).formId];
      const originalEra = era.systems, originalForm = form.systems;
      const trial = Object.assign({}, s, { faiths:{
        e2e_system_branch:{ name:'System branch', parent:'catholic',
          properties:{ systems:{ disable:['royal_council'] } } }
      } });
      const context = { realm:rid, faith:null, bookmark:{} };
      try {
        era.systems = null; form.systems = null;
        const answers = [FB.systemEnabled(trial, 'royal_council', context)];
        era.systems = { disable:['royal_council'] };
        answers.push(FB.systemEnabled(trial, 'royal_council', context));
        form.systems = { enable:['royal_council'] };
        answers.push(FB.systemEnabled(trial, 'royal_council', context));
        context.faith = 'e2e_system_branch';
        answers.push(FB.systemEnabled(trial, 'royal_council', context));
        context.bookmark = { systems:{ enable:['royal_council'] } };
        answers.push(FB.systemEnabled(trial, 'royal_council', context));
        const before = JSON.stringify(trial), rng = FB.getRngState(), uid = FB.getUidCounter();
        FB.systems.ids().forEach(function (id) {
          FB.systemEnabled(trial, id, context);
          FB.systemAvailable(trial, id);
        });
        return { answers:answers,
          inheritedPapacy:FB.faithHasSystem('e2e_system_branch', 'papacy', trial),
          errors:FB.validateReligionData(trial),
          pure:before === JSON.stringify(trial) && rng === FB.getRngState() && uid === FB.getUidCounter() };
      } finally {
        era.systems = originalEra; form.systems = originalForm;
      }
    });
    expect(result).toEqual({ answers:[true, false, true, false, true],
      inheritedPapacy:true, errors:[], pure:true });
  });

test('availability scopes abbey residents without querying abbey eligibility or changing residence',
  async function ({ page }, testInfo) {
    await openGame(page, testInfo);
    await startDeterministicGame(page);
    const result = await page.evaluate(function () {
      const s = FB.state, home = s.player.provinceId;
      const holder = Object.assign({}, s.chars[s.player.charId], {
        id:'e2e_abbey_holder', role:'contact', homeProvinceId:home
      });
      const resident = Object.assign({}, holder, { id:'e2e_abbey_resident' });
      s.chars[holder.id] = holder;
      s.chars[resident.id] = resident;
      const county = Object.keys(s.owner).find(function (pid) { return pid !== home; });
      s.abbeys = { houses:[{ provinceId:county, holderId:holder.id,
        residents:[{ charId:resident.id }] }] };
      const before = JSON.stringify(s), rng = FB.getRngState(), uid = FB.getUidCounter();
      const queries = [holder, resident].map(function (c) {
        return FB.systemEnabled(s, 'abbeys', { character:c, bookmark:{} });
      });
      const expected = FB.systemEnabled(s, 'abbeys', {
        realm:s.holder[county] || s.owner[county], faith:holder.religion, bookmark:{}
      });
      const pure = before === JSON.stringify(s) && rng === FB.getRngState() && uid === FB.getUidCounter();
      // FB.bookmark resolves a copy; availability overrides live on the base declaration.
      FBDATA.bookmarks[s.start.id].systems = { disable:['abbeys'] };
      return { queries:queries, expected:expected, pure:pure,
        residence:[FB.characterResidence(s, holder), FB.characterResidence(s, resident)],
        county:county, disabledOffice:FB.abbeyOf(s, holder) };
    });
    expect(result.queries).toEqual([result.expected, result.expected]);
    expect(result.residence).toEqual([result.county, result.county]);
    expect(result.pure).toBe(true);
    expect(result.disabledOffice).toBeNull();
  });

test('unknown and malformed system requirements fail before a mod mutates data',
  async function ({ page }, testInfo) {
    await openGame(page, testInfo);
    const result = await page.evaluate(function () {
      const original = JSON.stringify(FBDATA.events);
      let query = '', mod = '';
      try { FB.systemEnabled(null, 'e2e_missing_system'); }
      catch (error) { query = error.message; }
      try { FB.mods.apply({ events:[{ id:'e2e_bad_system', title:'Invalid',
        trigger:{ never:true }, text:'Invalid system', options:[
          { label:'Continue', require:{ systems:['e2e_missing_system'] }, effects:{} }
        ] }] }); }
      catch (error) { mod = error.message; }
      const broken = Object.assign({}, FB.bookmark('867'), {
        systems:{ disable:['e2e_missing_system'] }
      });
      return { query:query, mod:mod,
        bookmark:FB.validateBookmark(broken).join('\n'),
        duplicate:FB.systems.validateLayer({ enable:['papacy'], disable:['papacy'] }, 'Test').join('\n'),
        malformed:FB.systems.validateContent({ systems:'papacy' }, 'Test').join('\n'),
        unchanged:original === JSON.stringify(FBDATA.events) };
    });
    expect(result.query).toContain('Unknown system');
    expect(result.mod).toContain('Unknown system');
    expect(result.bookmark).toContain('Unknown system');
    expect(result.duplicate).toContain('more than once');
    expect(result.malformed).toContain('nonempty list');
    expect(result.unchanged).toBe(true);
  });

for (const bookmark of ['867', '1066']) {
  test(bookmark + ' keeps the medieval availability set and legacy holy-war compatibility',
    async function ({ page }, testInfo) {
      await openGame(page, testInfo);
      const result = await page.evaluate(function (id) {
        const s = { start:{ id:id } }, before = JSON.stringify(s);
        const rng = FB.getRngState(), uid = FB.getUidCounter();
        const enabled = FB.systems.ids().filter(function (system) {
          return FB.systemEnabled(s, system, { faith:'catholic' });
        }).sort();
        const legacy = { id:'e2e_legacy', era:'early_medieval', greatHolyWars:false };
        return { enabled:enabled,
          nonPapal:FB.systemEnabled(s, 'papacy', { faith:'sunni' }),
          sanctions:FB.systemEnabled(s, 'excommunication', { faith:'sunni' }),
          worldPapacy:FB.systemAvailable(s, 'papacy'),
          legacy:FB.systemEnabled(null, 'great_holy_wars', { bookmark:legacy }),
          override:FB.systemEnabled(null, 'great_holy_wars', {
            bookmark:Object.assign({}, legacy, { systems:{ enable:['great_holy_wars'] } }) }),
          errors:FB.validateBookmark(FB.bookmark(id)),
          pure:before === JSON.stringify(s) && rng === FB.getRngState() && uid === FB.getUidCounter() };
      }, bookmark);
      expect(result.enabled).toEqual([
        'abbeys', 'crown_bloc', 'estates', 'excommunication', 'feudal_service',
        'great_holy_wars', 'guild_elections', 'manorial_tenure', 'papacy',
        'royal_council', 'scutage', 'tournaments'
      ]);
      expect(result).toMatchObject({ nonPapal:false, sanctions:true, worldPapacy:true,
        legacy:false, override:true, errors:[], pure:true });
    });
}

test('mods can tag actions and choices, and disabled focus ticks stay idle',
  async function ({ page }, testInfo) {
    await openGame(page, testInfo);
    await startDeterministicGame(page);
    const result = await page.evaluate(function () {
      const s = FB.state;
      FB.mods.apply({
        focuses:[{
          id:'e2e_optional_focus', handler:'declarative_focus',
          label:'Optional study', desc:'A system-scoped study focus.',
          order:FBDATA.focuses.length, contexts:['home'], systems:['abbeys'],
          seasonal:{ gold:90 }, skillChances:{ lea:0.25 }
        }, { id:'study', systems:['abbeys'] }],
        deeds:[{
          id:'e2e_optional_choice', handler:'declarative_deed', capability:'resource_choice',
          label:'Optional grant', desc:'A grant with optional choices.',
          order:FBDATA.deeds.length, group:'life', cooldownDays:0, spendsDay:false,
          choices:[{ id:'accept', label:'Accept', system:'abbeys', effects:{ gold:1 } }]
        }]
      });
      const focus = FB.focusStatus(s, 'e2e_optional_focus').action;
      const enabled = FB.declarativeChoiceStatuses(s, 'e2e_optional_choice').length;
      FBDATA.bookmarks[s.start.id].systems = { disable:['abbeys'] };
      const before = JSON.stringify(s), rng = FB.getRngState(), uid = FB.getUidCounter();
      focus.tick(s);
      const choice = FB.declarativeChoiceStatus(s, 'e2e_optional_choice', 'accept');
      const deed = FB.instantStatus(s, 'e2e_optional_choice');
      const refused = deed.action.run(s, { choiceId:'accept' });
      return { enabled:enabled,
        focusHidden:!FB.focusStatus(s, 'e2e_optional_focus').shown && !FB.focusStatus(s, 'study').shown,
        deedHidden:!deed.shown, choices:FB.declarativeChoiceStatuses(s, 'e2e_optional_choice').length,
        choiceHidden:!choice.shown && !choice.can, refused:refused,
        pure:before === JSON.stringify(s) && rng === FB.getRngState() && uid === FB.getUidCounter() };
    });
    expect(result).toEqual({ enabled:1, focusHidden:true, deedHidden:true,
      choices:0, choiceHidden:true, refused:false, pure:true });
  });

test('476 availability baseline hides disabled deeds, events, sanctions and map controls',
  async function ({ page }, testInfo) {
    await startParityGame(page, testInfo, {
      bookmark:'476', code:'SYSTEMS-476-federate_476-ravenna-m-Marcus-standard-0-gothic.homoian'
    });
    const result = await page.evaluate(function () {
      const s = FB.state;
      const disabled = FB.systems.ids().filter(function (id) {
        return !FB.systemEnabled(s, id, { faith:'catholic' });
      }).sort();
      const visible = FB.listInstants(s).map(function (entry) { return entry.a.id; });
      const hiddenDeeds = FBDATA.deeds.filter(function (def) {
        return !FB.systemContentEnabled(s, def);
      }).every(function (def) { return visible.indexOf(def.id) < 0 && !FB.instantStatus(s, def.id).can; });
      const before = JSON.stringify(s), rng = FB.getRngState();
      const ignored = FB.queueEvent(s, 'serf_tenure_review', {}) === null;
      const option = FB.eventOptionStatus(s, null,
        { label:'Pay scutage', systems:['scutage'], effects:{ gold:-8 } }, {});
      const refused = FB.resolveEventOption(s, null,
        { label:'Pay scutage', systems:['scutage'], effects:{ gold:-8 } }, {}) === false;
      FB.ui.refresh();
      return { disabled:disabled, hiddenDeeds:hiddenDeeds, ignored:ignored,
        hiddenOption:!option.visible && !option.ready, refused:refused,
        papacy:!!s.papacy, tenure:!!s.player.tenure, tournaments:!!s.tournaments,
        pure:before === JSON.stringify(s) && rng === FB.getRngState(),
        crown:!!(FB.politicalSummary(s) || {}).blocs?.some(function (bloc) { return bloc.archetypeId === 'crown'; }) };
    });
    expect(result).toEqual(Object.assign({}, baseline476, {
      hiddenDeeds:true, ignored:true, hiddenOption:true, refused:true, pure:true
    }));
    await expect(page.locator('#btn-events')).toBeHidden();
    await expect(page.locator('[data-action-id="games_calendar"]')).toHaveCount(0);
    await expect(page.locator('[data-action-id="papacy"]')).toHaveCount(0);
  });

test('disabled lifecycle hooks stay idle across season and year boundaries and on restore',
  async function ({ page }, testInfo) {
    await openGame(page, testInfo);
    await startDeterministicGame(page);
    const result = await page.evaluate(function () {
      const s = FB.state, calls = {};
      FBDATA.bookmarks[s.start.id].systems = { disable:FB.systems.ids() };
      function spy(object, key) {
        calls[key] = 0;
        object[key] = function () { calls[key]++; };
      }
      ['papacyDay','papacySeason','papacyYearly','papacyPendingDecision',
        'abbeySeason','greatHolyWarTick','greatHolyWarSeason','greatHolyWarYearly',
        'sacredCustodySeason','tenureDay','councilEnsure','councilYearly',
        'parliamentEnsure','parliamentYearly','ensurePapacyState','repairAbbeys','repairGreatHolyWar'].forEach(function (key) {
        spy(FB, key);
      });
      ['ensure','reconcile','samplePlayer','season','tick'].forEach(function (key) {
        spy(FB.tournaments, key);
      });
      FB.game.setPaused(true);
      Object.assign(FB.game.auto, { all:true, style:'first' });
      s.date.season = 3; s.date.day = 90;
      const turn = s.turn, year = s.date.year;
      FB.game.passDay();
      const advanced = s.turn === turn + 1 && s.date.year === year + 1;
      const saved = FB.save.parseExport(FB.save.exportState());
      FB.save.restore(saved);
      return { calls:calls, advanced:advanced };
    });
    expect(result.advanced).toBe(true);
    expect(result.calls).toEqual(Object.fromEntries(Object.keys(result.calls).map(function (key) {
      return [key, 0];
    })));
  });

test('disabled saved institutions stay dormant and their traits contribute no effects',
  async function ({ page }, testInfo) {
    await openGame(page, testInfo);
    await startDeterministicGame(page);
    const result = await page.evaluate(function () {
      const s = FB.state, c = s.chars[s.player.charId];
      FBDATA.bookmarks[s.start.id].systems = { disable:FB.systems.ids() };
      const rid = Object.keys(s.realms).find(function (id) {
        return id !== 'player' && s.realms[id].alive;
      });
      s.realms[rid].feudalContract = { charterId:'scutage_compact',
        tenure:'term', expiryTurn:1, grantTurn:0 };
      s.player.tenure = { status:'active', duties:[{ id:'test_duty', dueTurn:0 }] };
      s.council = { authority:90, seats:{} };
      s.papacy = { obediences:{}, realmObedience:{} };
      s.tournaments = { events:[], annual:[] };
      const before = JSON.stringify([s.realms[rid].feudalContract, s.player.tenure,
        s.council, s.papacy, s.tournaments]), rng = FB.getRngState();
      const refusedTrait = FB.addTrait(c, 'excommunicated', s) === false;
      c.traits.push('excommunicated');
      const withSentence = FB.traitAgg(c, s);
      const excommunicated = FB.playerExcommunicated(s);
      c.traits.pop();
      const withoutSentence = FB.traitAgg(c, s);
      FB.ensureFeudalContracts(s);
      FB.tenureDay(s);
      FB.councilYearly(s);
      FB.papacyProvinceTransferred(s, 'roma', rid, null);
      FB.papacyRealmDied(s, rid);
      const contract = FB.feudalContractOf(s, rid);
      return {
        refusedTrait:refusedTrait, traitIgnored:JSON.stringify(withSentence) === JSON.stringify(withoutSentence),
        excommunicated:excommunicated, tenure:FB.activeSerfTenure(s),
        council:FB.councilSummary(s), papacy:FB.ensurePapacy(s),
        games:FB.tournaments.ensure(s), elections:FB.electionList(s).length,
        hereditary:contract.tenure === 'hereditary', customary:contract.charterId === 'customary_service',
        unchanged:before === JSON.stringify([s.realms[rid].feudalContract, s.player.tenure,
          s.council, s.papacy, s.tournaments]) && rng === FB.getRngState()
      };
    });
    expect(result).toEqual({ refusedTrait:true, traitIgnored:true,
      excommunicated:false, tenure:null, council:null, papacy:null, games:null,
      elections:0, hereditary:true, customary:true, unchanged:true });
  });

test('disabled queued events are discarded before context repair or participant binding',
  async function ({ page }, testInfo) {
    await openGame(page, testInfo);
    await startDeterministicGame(page);
    const result = await page.evaluate(function () {
      const s = FB.state, ctx = {};
      FBDATA.bookmarks[s.start.id].systems = { disable:['manorial_tenure'] };
      s.slotDays = [];
      s.eventQueue = [{ id:'serf_tenure_review', ctx:ctx }];
      const rng = FB.getRngState(), uid = FB.getUidCounter();
      let bindings = 0;
      FB.ensureEventParticipants = function () { bindings++; return {}; };
      const selected = FB.pickDailyEvents(s);
      return { selected:selected, queued:s.eventQueue, ctx:ctx, bindings:bindings,
        tenureSelection:FB.serfTenureSelection(s, { faith:'catholic' }),
        pure:rng === FB.getRngState() && uid === FB.getUidCounter() };
    });
    expect(result).toEqual({ selected:[], queued:[], ctx:{}, bindings:0,
      tenureSelection:null, pure:true });
  });

test('disabled saved holy wars cannot block play, settle, repair or earn service',
  async function ({ page }, testInfo) {
    await openGame(page, testInfo);
    await startDeterministicGame(page);
    const result = await page.evaluate(function () {
      const s = FB.state;
      FBDATA.bookmarks[s.start.id].systems = { disable:['great_holy_wars'] };
      s.greatHolyWar = { id:'e2e_dormant_call', callingReligion:'catholic',
        callerRealm:'papacy', phase:'settlement', contribution:{ player:1 },
        settlement:{ pendingPlayer:{ sovereign:true }, case:{ status:'open' } } };
      s.player.greatHolyWar = { campaignId:s.greatHolyWar.id,
        camp:'attackers', vow:true, renewalRequired:true };
      const before = JSON.stringify(s), rng = FB.getRngState(), uid = FB.getUidCounter();
      const answers = [FB.ensureGreatHolyWar(s), FB.greatHolyWarSettlementNeedsPlayer(s),
        FB.greatHolyWarSettlementChoice(s, true), FB.greatHolyWarSettlementMove(s, 'accept'),
        FB.addGreatHolyWarContribution(s, 'player', 10), FB.withdrawGreatHolyWar(s),
        FB.renewGreatHolyWarVow(s), FB.playerGreatHolyWarCamp(s)];
      FB.repairGreatHolyWar(s);
      FB.greatHolyWarSuccession(s);
      FB.fns.ghw_service_danger(s);
      FB.greatHolyWarTick(s);
      return { answers:answers,
        pure:before === JSON.stringify(s) && rng === FB.getRngState() && uid === FB.getUidCounter() };
    });
    expect(result).toEqual({ answers:[null, false, false, false, false, false, false, null], pure:true });
  });
