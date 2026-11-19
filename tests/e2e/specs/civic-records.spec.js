'use strict';
const path = require('path');
const { test, expect } = require('../support/fixture');
const { dependsOnRuntime } = require('../support/runtime-dependencies');
const { openGame } = require('../support/game/navigation');
const { beginBookmark, beginBookmarkFromTitle } = require('../support/game/bookmark-acceptance');
const recordsMod = require('../fixtures/authoring/civic-records.json');

dependsOnRuntime(__filename, [
  'data/economy.js', 'data/actions.js', 'data/technology.js', 'data/starts.js',
  'js/actions.js', 'js/economy.js', 'js/schema.js', 'js/mods.js',
  'js/main.js', 'js/day_phases.js', 'js/authority.js', 'js/starts.js',
  'js/save.js', 'js/save_v4.js', 'js/technology.js', 'js/stories.js', 'js/story_household.js'
]);

test.describe.configure({ mode:'parallel' });

// Observe the actual focus phase inside ordinary elapsed days, separating its
// wages from other household cash flow without replacing any game decision.
async function workDays(page, count) {
  return page.evaluate(function (days) {
    const rows = [], original = FB.tickFocus;
    FB.tickFocus = function (s) {
      const before = s.player.gold, focus = s.player.focus;
      const c = s.chars[s.player.charId];
      const multiplier = FB.professionDoesWork(c.career.profession, 'administration')
        ? FB.householdWorkMultiplier(s, c.career.profession) : 1;
      const expected = (2 + FB.skillOf(c, 'ste') / 4 + FB.skillOf(c, 'lea') / 8 +
        Number((FB.careerSpecialization(s, c) || { fx:{} }).fx.focusGold || 0)) * multiplier / 90;
      original(s);
      rows.push({ focus:focus, after:s.player.focus,
        pay:s.player.gold - before, expected:expected });
    };
    const turn = FB.state.turn, date = JSON.stringify(FB.state.date);
    try {
      for (let i = 0; i < days; i++) FB.game.passDay({ deferUi:true });
    } finally { FB.tickFocus = original; }
    return { rows:rows, elapsed:FB.state.turn - turn,
      dated:date !== JSON.stringify(FB.state.date) };
  }, count);
}

function expectRecordsPay(result, days) {
  expect(result.elapsed).toBe(days);
  expect(result.dated).toBe(true);
  expect(result.rows).toHaveLength(days);
  result.rows.forEach(function (row) {
    expect(row.focus).toBe('keep_records');
    expect(row.after).toBe('keep_records');
    expect(row.pay).toBeGreaterThan(0);
    expect(row.pay).toBeCloseTo(row.expected, 10);
  });
}

test('supported curialis opening selects records without pay or office and earns only on working days',
  async function ({ page }, info) {
    await beginBookmark(page, info, '476', 'curialis_476');
    const selection = await page.evaluate(function () {
      const s = FB.state, c = s.chars[s.player.charId];
      const technology = FB.realmTechRecord(s, FB.techRealmId(s));
      technology.completed = technology.completed.filter(function (id) { return id !== 'bureaucratic_offices'; });
      const before = { gold:s.player.gold, turn:s.turn, career:JSON.stringify(c.career),
        authority:JSON.stringify(s.authority), tier:s.player.tier,
        owner:s.owner.ravenna, holder:s.holder.ravenna };
      const available = FB.focusStatus(s, 'keep_records');
      FB.setFocus(s, 'keep_records');
      return { before:before, after:{ gold:s.player.gold, turn:s.turn,
        career:JSON.stringify(c.career), authority:JSON.stringify(s.authority),
        tier:s.player.tier, owner:s.owner.ravenna, holder:s.holder.ravenna },
        scenario:s.start.scenarioId, profession:c.career.profession,
        rank:c.career.rank, chosen:c.career.chosen, focus:s.player.focus,
        shown:available.shown, can:available.can,
        listed:FB.listFocuses(s).some(function (f) { return f.id === 'keep_records'; }),
        policy:FBDATA.actionPolicies.keep_records.professions,
        mode:FBDATA.techImpactReviews.features.period_476_civic_career.mode,
        technologyFaults:FB.validateTechnologyData(true),
        judge:FB.political.permission(s, { kind:'character', id:c.id }, 'judge', { provinceId:'ravenna' }).allowed };
    });
    expect(selection).toMatchObject({ scenario:'curialis_476', profession:'curialis',
      rank:'journeyman', chosen:true, focus:'keep_records', shown:true, can:true,
      listed:true, mode:'none', judge:false, technologyFaults:[] });
    expect(selection.policy).toEqual(['administration', 'curialis']);
    expect(selection.after).toEqual(selection.before);
    expectRecordsPay(await workDays(page, 2), 2);

    const restored = await page.evaluate(function () {
      const s = FB.state, c = s.chars[s.player.charId];
      const before = { gold:s.player.gold, turn:s.turn, focus:s.player.focus,
        career:JSON.parse(JSON.stringify(c.career)), appointments:JSON.parse(JSON.stringify(s.authority.appointments)),
        owner:s.owner.ravenna, holder:s.holder.ravenna, tier:s.player.tier };
      FB.save.restore(JSON.parse(FB.save.serialize()));
      const loaded = FB.state, head = loaded.chars[loaded.player.charId];
      return { before:before, after:{ gold:loaded.player.gold, turn:loaded.turn,
        focus:loaded.player.focus, career:JSON.parse(JSON.stringify(head.career)),
        appointments:JSON.parse(JSON.stringify(loaded.authority.appointments)), owner:loaded.owner.ravenna,
        holder:loaded.holder.ravenna, tier:loaded.player.tier },
        can:FB.focusStatus(loaded, 'keep_records').can,
        ownAppointments:loaded.authority.appointments.filter(function (row) {
          return row.holder.kind === 'character' && row.holder.id === head.id;
        }).length };
    });
    expect(restored.after).toEqual(restored.before);
    expect(restored.can).toBe(true);
    expect(restored.ownAppointments).toBe(0);
    expectRecordsPay(await workDays(page, 1), 1);
    await page.evaluate(function () { FB.setFocus(FB.state, 'rest'); });
    const resting = await workDays(page, 1);
    expect(resting.elapsed).toBe(1);
    expect(resting.rows).toHaveLength(1);
    expect(resting.rows[0]).toMatchObject({ focus:'rest', after:'rest', pay:0 });
  });

test('records retains Administration and rejects unrelated, unqualified and unavailable work',
  async function ({ page }, info) {
    await beginBookmark(page, info, '476', 'curialis_476');
    const result = await page.evaluate(function () {
      const s = FB.state, c = s.chars[s.player.charId], cases = [];
      const original = JSON.parse(JSON.stringify(c.career)), born = c.born;
      function check(label, change) {
        c.career = JSON.parse(JSON.stringify(original)); c.born = born;
        s.player.tier = 2; s.player.travel = null; s.player.focus = 'rest';
        delete s.player.flags.polly_1;
        change(); FB.syncPlayerCareer(s);
        const before = JSON.stringify(s), rng = FB.getRngState(), uid = FB.getUidCounter();
        const status = FB.focusStatus(s, 'keep_records');
        FB.setFocus(s, 'keep_records');
        cases.push({ label:label, can:status.can, shown:status.shown,
          unchanged:before === JSON.stringify(s) && rng === FB.getRngState() && uid === FB.getUidCounter() });
      }
      check('farmer', function () { c.career.profession = 'farmer'; });
      check('civic role alone', function () { c.career.profession = 'civic_clerk'; });
      check('other learned career', function () { c.career.profession = 'physician'; });
      check('apprentice', function () { c.career.rank = 'apprentice'; });
      check('Administration trainee', function () { c.career.profession = 'administration'; c.career.rank = 'apprentice'; });
      check('unassigned', function () { c.career.rank = 'unassigned'; });
      check('unchosen', function () { c.career.chosen = false; });
      check('minor', function () { c.born = s.date.year - 15; });
      check('landed', function () { s.player.tier = 4; });
      check('travel', function () { s.player.travel = { phase:'outbound' }; });
      check('afield', function () { s.player.flags.polly_1 = true; });
      c.career = original; c.born = born; s.player.tier = 2; s.player.travel = null;
      delete s.player.flags.polly_1;
      FB.syncPlayerCareer(s); FB.setFocus(s, 'keep_records');
      c.career.profession = 'farmer'; FB.syncPlayerCareer(s);
      s.player.focusBack = 'rest';
      const beforeStale = s.player.gold;
      FB.tickFocus(s);
      const stale = { focus:s.player.focus, pay:s.player.gold - beforeStale };
      s.player.tier = 1;
      c.career = { profession:'administration', rank:'master', specialization:'notary',
        chosen:true, experience:10, startedYear:s.date.year - 10, guildRank:'none', guildStanding:0 };
      FB.syncPlayerCareer(s);
      const before = { gold:s.player.gold, turn:s.turn };
      FB.setFocus(s, 'keep_records');
      return { cases:cases, stale:stale, administration:FB.focusStatus(s, 'keep_records').can,
        noSelectionPay:s.player.gold === before.gold && s.turn === before.turn,
        income:FB.focusIncome(s).gold,
        expected:(2 + FB.skillOf(c, 'ste') / 4 + FB.skillOf(c, 'lea') / 8 + 1) * FB.householdWorkMultiplier(s, 'administration') };
    });
    expect(result.cases).toHaveLength(11);
    result.cases.forEach(function (row) {
      expect(row, row.label).toMatchObject({ can:false, shown:false, unchanged:true });
    });
    expect(result.stale.focus).not.toBe('keep_records');
    expect(result.stale.pay).toBe(0);
    expect(result.administration).toBe(true);
    expect(result.noSelectionPay).toBe(true);
    expect(result.income).toBeCloseTo(result.expected, 10);
    expectRecordsPay(await workDays(page, 1), 1);
  });

for (const group of [
  ['empty', 'duplicate', 'unknown'],
  ['missing administration', 'too many', 'not an array'],
  ['extra field', 'missing list', 'reserved field']
]) {
  test('records policy rejects ' + group.join(', ') + ' without publication',
    async function ({ page }, info) {
      await openGame(page, info);
      const result = await page.evaluate(function (input) {
        const before = JSON.stringify([FBDATA.actionPolicies, FBDATA.careers, FB.state, FB.mods.list()]);
        const rng = FB.getRngState(), uid = FB.getUidCounter(), signature = FB.mods.sig();
        const rows = input.group.map(function (kind) {
          const mod = JSON.parse(JSON.stringify(input.mod)), policy = mod.actionPolicies.keep_records;
          if (kind === 'empty') policy.professions = [];
          if (kind === 'duplicate') policy.professions.push('archive_keeper');
          if (kind === 'unknown') policy.professions.push('unknown_records_career');
          if (kind === 'missing administration') policy.professions = ['archive_keeper'];
          if (kind === 'too many') {
            policy.professions = ['administration'];
            for (let i = 0; i < 16; i++) {
              const id = 'archive_example_' + i;
              mod.careers[id] = JSON.parse(JSON.stringify(mod.careers.archive_keeper));
              policy.professions.push(id);
            }
          }
          if (kind === 'not an array') policy.professions = 'administration';
          if (kind === 'extra field') policy.appointment = 'judicial_vicar';
          if (kind === 'missing list') delete policy.professions;
          if (kind === 'reserved field') Object.defineProperty(policy, 'constructor', { value:{}, enumerable:true });
          return { kind:kind, faults:FB.mods.validate(mod) };
        });
        return { rows:rows, pure:before === JSON.stringify([FBDATA.actionPolicies, FBDATA.careers, FB.state, FB.mods.list()]) &&
          rng === FB.getRngState() && uid === FB.getUidCounter() && signature === FB.mods.sig() };
      }, { group:group, mod:recordsMod });
      expect(result.pure).toBe(true);
      result.rows.forEach(function (row) {
        expect(row.faults.length, row.kind).toBeGreaterThan(0);
        expect(row.faults.join('\n'), row.kind).toContain('actionPolicies.keep_records');
      });
    });
}

test('ordinary JSON imports independent records eligibility and pays the imported archive household',
  async function ({ page }, info) {
    await openGame(page, info);
    const validation = await page.evaluate(function (mod) {
      const before = JSON.stringify([FBDATA.actionPolicies, FBDATA.careers, FB.state, FB.mods.list()]);
      const rng = FB.getRngState(), uid = FB.getUidCounter(), signature = FB.mods.sig();
      const faults = FB.mods.validate(mod);
      return { faults:faults, signature:signature,
        pure:before === JSON.stringify([FBDATA.actionPolicies, FBDATA.careers, FB.state, FB.mods.list()]) &&
          rng === FB.getRngState() && uid === FB.getUidCounter() && signature === FB.mods.sig() };
    }, recordsMod);
    expect(validation.faults).toEqual([]);
    expect(validation.pure).toBe(true);
    await page.evaluate(function () { FB.ui.showMods(); });
    await page.locator('#modfile').setInputFiles(path.resolve(__dirname, '../fixtures/authoring/civic-records.json'));
    await Promise.all([page.waitForNavigation({ waitUntil:'domcontentloaded' }), page.locator('#mod-apply').click()]);
    await page.waitForFunction(function () { return window.FB && FB.game && FB.game.bootReady; });
    await beginBookmarkFromTitle(page, '867', 'archive_household');
    const result = await page.evaluate(function () {
      const s = FB.state, c = s.chars[s.player.charId];
      const before = { gold:s.player.gold, turn:s.turn, authority:JSON.stringify(s.authority) };
      const quote = FB.stories.quote(s, 'archive_records_track', 'work');
      const applied = FB.stories.apply(s, 'archive_records_track', 'work', quote);
      const selected = s.player.focus;
      const unchanged = s.player.gold === before.gold && s.turn === before.turn && JSON.stringify(s.authority) === before.authority;
      const policy = FBDATA.actionPolicies.keep_records.professions.slice(), signature = FB.mods.sig();
      const career = c.career.profession;
      c.career.profession = 'curialis'; FB.syncPlayerCareer(s);
      const curialisDenied = !FB.focusStatus(s, 'keep_records').can;
      c.career.profession = career; FB.syncPlayerCareer(s);
      return { policy:policy, career:career, selected:selected, unchanged:unchanged,
        curialisDenied:curialisDenied, signature:signature, start:s.start.scenarioId,
        applied:applied, phase:s.stories.archive_records_track.phase };
    });
    expect(result).toMatchObject({ policy:['administration', 'archive_keeper'], career:'archive_keeper',
      selected:'keep_records', unchanged:true, curialisDenied:true, start:'archive_household',
      applied:true, phase:'working' });
    expect(result.signature).not.toBe(validation.signature);
    expectRecordsPay(await workDays(page, 2), 2);
    expect(await page.evaluate(function () { return FB.state.stories.archive_records_track.phase; })).toBe('paid');
    const restored = await page.evaluate(function () {
      const gold = FB.state.player.gold, signature = FB.mods.sig();
      const career = JSON.parse(JSON.stringify(FB.state.chars[FB.state.player.charId].career));
      FB.save.restore(JSON.parse(FB.save.serialize()));
      return { gold:FB.state.player.gold === gold, signature:FB.mods.sig() === signature,
        career:JSON.parse(JSON.stringify(FB.state.chars[FB.state.player.charId].career)), beforeCareer:career,
        focus:FB.state.player.focus, can:FB.focusStatus(FB.state, 'keep_records').can,
        phase:FB.state.stories.archive_records_track.phase };
    });
    expect(restored).toMatchObject({ gold:true, signature:true, focus:'keep_records', can:true, phase:'paid' });
    expect(restored.career).toEqual(restored.beforeCareer);
  });
