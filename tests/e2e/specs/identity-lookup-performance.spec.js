'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'data/cultures.js', 'js/model.js', 'js/actions.js', 'js/events.js',
  'js/economy.js', 'js/world.js', 'js/travel.js', 'js/population.js', 'js/save.js'
]);
const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { startDeterministicGame } = require('../support/game/start');

test.beforeEach(async function ({ page }, testInfo) {
  await openGame(page, testInfo);
  await startDeterministicGame(page);
});

for (const kind of ['faith', 'culture']) {
  test(kind + ' lookups avoid repeated table scans and refresh after replacement, reform and restore', async function ({ page }) {
    const result = await page.evaluate(function (kind) {
      let s = FB.state;
      const field = kind === 'faith' ? 'faiths' : 'cultures';
      const create = kind === 'faith' ? FB.createFaith : FB.createCulture;
      const read = kind === 'faith' ? FB.religionOf : FB.cultureOf;
      const configure = kind === 'faith' ? FB.configureReligions : FB.configureCultures;
      const parent = kind === 'faith' ? 'catholic' : 'german';
      let id;
      for (let i = 0; i < 40; i++) id = create(s, { name:'Branch ' + i, parent:parent });
      const originalKeys = Object.keys;
      let scans = 0, correct = true;
      const before = JSON.stringify(s), rng = FB.getRngState();
      Object.keys = function (value) {
        if (value === s[field]) scans++;
        return originalKeys(value);
      };
      try {
        for (let i = 0; i < 100; i++) correct = correct && read(id, s).name === 'Branch 39';
      } finally { Object.keys = originalKeys; }
      const populatedScans = scans;
      const unchanged = before === JSON.stringify(s) && rng === FB.getRngState();
      s[field] = JSON.parse(JSON.stringify(s[field]));
      s[field][id].name = 'Replacement';
      const replaced = read(id, s).name;
      s[field][id].name = 'Reformed';
      configure(s);
      const reformed = read(id, s).name;
      FB.save.restore(JSON.parse(FB.save.serialize()));
      s = FB.state;
      const restored = read(id, s).name;
      s[field] = {};
      const parentName = read(parent, s).name;
      scans = 0;
      Object.keys = function (value) {
        if (value === s[field]) scans++;
        return originalKeys(value);
      };
      try {
        for (let i = 0; i < 100; i++) correct = correct && read(parent, s).name === parentName;
      } finally { Object.keys = originalKeys; }
      const emptyScans = scans;
      const fresh = create(s, { name:'After empty table', parent:parent });
      return { scans:populatedScans, correct:correct, unchanged:unchanged,
        replaced:replaced, reformed:reformed, restored:restored,
        emptyScans:emptyScans, fresh:read(fresh, s).name };
    }, kind);
    expect(result).toMatchObject({ correct:true, unchanged:true,
      replaced:'Replacement', reformed:'Reformed', restored:'Reformed', fresh:'After empty table' });
    expect(result.scans).toBeLessThanOrEqual(1);
    expect(result.emptyScans).toBeLessThanOrEqual(1);
  });
}

test('maternal discovery shares contact reads and learns fresh same-day contacts without rerolling', async function ({ page }) {
  const result = await page.evaluate(function () {
    const s = FB.state, p = s.player, me = s.chars[p.charId];
    me.culture = 'german';
    const ids = [], contacts = [];
    p.network = p.network || {};
    for (let i = 0; i < 3; i++) {
      const id = FB.createCulture(s, { name:'Maternal contact ' + i, parent:'nubian' });
      const c = FB.makeCharacter(s, { sex:'m', born:s.date.year - 25,
        culture:id, religion:me.religion, traitsN:0 });
      ids.push(id); contacts.push(c.id);
      if (i < 2) p.network[c.id] = 1;
    }
    const original = { presence:FB.conversionTargetPresence, kin:FB.kinOf,
      household:FB.householdMembers, lieges:FB.liegeChain };
    const calls = {}, counts = { kin:0, household:0, lieges:0 };
    FB.conversionTargetPresence = function (state, kind, id) {
      calls[id] = (calls[id] || 0) + 1;
      return original.presence.apply(this, arguments);
    };
    FB.kinOf = function () { counts.kin++; return original.kin.apply(this, arguments); };
    FB.householdMembers = function () { counts.household++; return original.household.apply(this, arguments); };
    FB.liegeChain = function () { counts.lieges++; return original.lieges.apply(this, arguments); };
    const rng = FB.getRngState();
    try { FB.learnMaternalCustoms(s); }
    finally {
      FB.conversionTargetPresence = original.presence;
      FB.kinOf = original.kin; FB.householdMembers = original.household;
      FB.liegeChain = original.lieges;
    }
    const first = ids.map(function (id) { return s.maternalCustomKnowledge[id] || null; });
    p.network[contacts[2]] = 1;
    FB.learnMaternalCustoms(s);
    delete p.network[contacts[0]]; s.chars[contacts[0]].dead = true;
    const beforeRead = JSON.stringify(s);
    const retained = FB.maternalCustomSources(s);
    return { first:first, counts:counts, calls:ids.map(function (id) { return calls[id]; }),
      later:s.maternalCustomKnowledge[ids[2]], retained:retained.indexOf(ids[0]) >= 0,
      pure:beforeRead === JSON.stringify(s), rngSame:rng === FB.getRngState() };
  });
  expect(result.first[0]).toMatchObject({ source:'network' });
  expect(result.first[1]).toMatchObject({ source:'network' });
  expect(result.first[2]).toBeNull();
  expect(result.calls).toEqual([1, 1, 1]);
  // Household projection itself can consult Kin once in addition to the contact list.
  expect(result.counts.kin).toBeLessThanOrEqual(2);
  expect(result.counts.household).toBe(1);
  expect(result.counts.lieges).toBeLessThanOrEqual(1);
  expect(result.later).toMatchObject({ source:'network' });
  expect(result).toMatchObject({ retained:true, pure:true, rngSame:true });
});
