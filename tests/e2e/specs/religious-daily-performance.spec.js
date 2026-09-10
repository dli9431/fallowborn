
'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, ['js/world.js', 'js/model.js', 'js/holywar.js', 'data/cultures.js']);
const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { startDeterministicGame } = require('../support/game/start');

test('head recovery repairs once and skips realms below claim rank', async function ({ page }, testInfo) {
  await openGame(page, testInfo); await startDeterministicGame(page);
  const result = await page.evaluate(function () {
    const s = FB.state;
    FB.ensureReligiousHeads(s);
    const religion = FB.religionIds(s, false).filter(function (id) {
      const rel = FB.religionOf(id, s);
      return rel.head && rel.head.recovery === 'claim';
    })[0];
    if (!religion) throw new Error('Missing claim office fixture');
    const office = FB.faithOfficeId(religion, s);
    for (const rid in s.realms) s.realms[rid].rank = 0;
    s.religiousHeads[office] = null;
    s.religiousHeadVacancies[office] = { turn:s.turn - 1000 };
    const ensure = FB.ensureReligiousHeads, eligible = FB.religiousHeadHolderEligible;
    let repairs = 0, candidates = 0;
    FB.ensureReligiousHeads = function () { repairs++; return ensure.apply(this, arguments); };
    FB.religiousHeadHolderEligible = function () { candidates++; return eligible.apply(this, arguments); };
    const rng = FB.getRngState();
    try {
      FB.religiousHeadRecoveryTick(s);
      return { repairs:repairs, candidates:candidates, vacant:s.religiousHeads[office] === null,
        rngStable:rng === FB.getRngState() };
    } finally { FB.ensureReligiousHeads = ensure; FB.religiousHeadHolderEligible = eligible; }
  });
  expect(result.repairs).toBe(1); expect(result.candidates).toBe(0);
  expect(result.vacant).toBe(true); expect(result.rngStable).toBe(true);
});

test('restored heads before holy-war unlock do not scan target kingdoms', async function ({ page }, testInfo) {
  await openGame(page, testInfo); await startDeterministicGame(page);
  const result = await page.evaluate(function () {
    const s = FB.state;
    FB.ensureGreatHolyWar(s);
    s.greatHolyWar = null;
    const history = s.greatHolyWarHistory;
    for (const id of ['catholic', 'muslim']) {
      history.headState[id] = { restoredTurn:s.turn - 400 };
      history.unlockChecked[id] = true;
      delete history.firstLaunched[id];
    }
    const original = FB.greatHolyWarTargets;
    let searches = 0;
    FB.greatHolyWarTargets = function () { searches++; return original.apply(this, arguments); };
    const rng = FB.getRngState();
    try {
      FB.greatHolyWarTick(s);
      return { searches:searches, rngStable:rng === FB.getRngState(), campaign:s.greatHolyWar };
    } finally { FB.greatHolyWarTargets = original; }
  });
  expect(result).toEqual({ searches:0, rngStable:true, campaign:null });
});
