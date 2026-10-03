'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'index.html', 'data/systems.js', 'data/eras.js', 'data/bookmarks.js',
  'data/bookmark_476.js', 'data/cultures.js', 'data/political_institutions.js',
  'data/political_blocs.js', 'data/policies.js', 'data/actions.js', 'data/economy.js',
  'data/traits.js', 'data/events_council.js', 'data/events_parliament.js',
  'data/events_peasant.js', 'data/events_tournament.js', 'data/events_paths.js',
  'data/events_world.js', 'data/events_war.js', 'data/events_noble.js',
  'js/systems.js', 'js/model.js', 'js/world.js', 'js/governments.js', 'js/authority.js',
  'js/main.js', 'js/actions.js', 'js/economy.js', 'js/events.js', 'js/politics.js',
  'js/institutions.js', 'js/council.js', 'js/parliament.js', 'js/papacy.js',
  'js/holywar.js', 'js/abbeys.js', 'js/tournaments.js', 'js/save.js',
  'js/mods.js', 'js/ui_panels.js', 'js/ui_modals.js', 'js/ui_topbar.js',
  'js/ui_misc.js', 'js/ui_tournaments.js', 'js/mapview.js'
]);
const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { startDeterministicGame } = require('../support/game/start');
const { startParityGame } = require('../support/game/parity');
const baseline476 = require('../fixtures/systems-476.json');

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
      FB.bookmark(s.start.id).systems = { disable:['abbeys'] };
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
      FB.bookmark(s.start.id).systems = { disable:FB.systems.ids() };
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
    expect(Object.values(result.calls)).toEqual(Object.keys(result.calls).map(function () { return 0; }));
  });

test('disabled saved institutions stay dormant and their traits contribute no effects',
  async function ({ page }, testInfo) {
    await openGame(page, testInfo);
    await startDeterministicGame(page);
    const result = await page.evaluate(function () {
      const s = FB.state, c = s.chars[s.player.charId];
      FB.bookmark(s.start.id).systems = { disable:FB.systems.ids() };
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
      FB.bookmark(s.start.id).systems = { disable:['manorial_tenure'] };
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
      FB.bookmark(s.start.id).systems = { disable:['great_holy_wars'] };
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
