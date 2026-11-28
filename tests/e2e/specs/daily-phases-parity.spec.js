'use strict';

const crypto = require('crypto');
const { test, expect } = require('../support/fixture');
const { dependsOnRuntime } = require('../support/runtime-dependencies');
const { openTitle } = require('../support/game/navigation');
const { startDeterministicGame } = require('../support/game/start');

dependsOnRuntime(__filename, [
  'index.html', 'js/main.js', 'js/day_phases.js', 'js/util.js', 'js/actions.js',
  'js/world.js', 'js/events.js', 'js/economy.js', 'js/armies.js', 'js/stories.js',
  'js/building_seasons.js', 'js/systems.js', 'js/treasury.js',
  'js/holywar.js', 'js/tournaments.js', 'js/save.js', 'js/save_v4.js'
]);

// Complete serialized state, RNG and UID captured before extracting the scheduler.
// sha256 follows property order, so it also changes when a state field is created
// in a new place; sortedSha256 does not, which tells the two apart in a failure.
const baseline = {
  play:[
    { name:'day', result:'day', turn:10, date:{ year:867, season:0, day:11 }, rng:2013589264, uid:1574,
      refreshes:2, autosaves:0, stateBytes:1983264, sha256:'d562571407ef5eee6880d631e7061d3b20fb5429b2f36e5712b1f146e2638970',
      sortedSha256:'8ad60831e22fcca3ce0036cea9b5710e792ba5d35b4fbf76f53759f2a5c8fa3c' },
    { name:'season', result:'season', turn:90, date:{ year:867, season:1, day:1 }, rng:512636533, uid:1580,
      refreshes:4, autosaves:1, stateBytes:2103394, sha256:'9bee97d03efd5ee292c37f822d6d7457d2355fdb578140b9c7b0dd14dd7b2433',
      sortedSha256:'c31cbfe8d8fa586c0a2beb5931f20ed8470e4a05729b55223cb21c207eed7914' },
    { name:'year', result:'season', turn:360, date:{ year:868, season:0, day:1 }, rng:2191761640, uid:1595,
      refreshes:6, autosaves:2, stateBytes:2499852, sha256:'82d2d81ce843ce8efd1edd67d5a1717c4161ca5e96c3cbcf1aa6468acc055f95',
      sortedSha256:'ec31218def9679b54e7a991fdb250d8bf6b7da98ced4de0e2da7251f6449c887' }
  ],
  observe:[
    { name:'day', result:'day', turn:10, date:{ year:867, season:0, day:11 }, rng:1765797802, uid:3124,
      refreshes:1, autosaves:0, stateBytes:1935956, sha256:'17864c1f89b94d7dd9099c6b4685f90b7b60b39d8e77d2a50ef6d3790d052757',
      sortedSha256:'30bdb77e30489c028472584b065fbc3810a074554c541ecfbccca6479fd40b2b' },
    { name:'season', result:'season', turn:90, date:{ year:867, season:1, day:1 }, rng:1592457608, uid:3126,
      refreshes:2, autosaves:0, stateBytes:2045650, sha256:'4b82f2c8ca21884df469ca639d2da136562e8a68020d83acc8374ddbcb7b5ac0',
      sortedSha256:'7e2e3ffd6bd23bd672fe34b0563ab45dde7657b78486d63990e1cbeca05e46da' },
    { name:'year', result:'season', turn:360, date:{ year:868, season:0, day:1 }, rng:2959453030, uid:3132,
      refreshes:3, autosaves:0, stateBytes:2453863, sha256:'edc3ce3afad43044ce58d7fb4489e7be2da408f5ca93b2065f974d72dfcb2ea6',
      sortedSha256:'c998ba2d0e9136ac1dce480076431190a2b8e742249b2ca0e61271b7456159f2' }
  ]
};

// The same state with every object's keys sorted, so two states that differ only
// in property order share this digest.
function withSortedKeys(value) {
  if (Array.isArray(value)) return value.map(withSortedKeys);
  if (!value || typeof value !== 'object') return value;
  const sorted = {};
  Object.keys(value).sort().forEach(function (key) { sorted[key] = withSortedKeys(value[key]); });
  return sorted;
}

['play', 'observe'].forEach(function (mode) {
  test(mode + ' daily, seasonal and annual passes retain their fixed-seed fingerprints',
    async function ({ page }, testInfo) {
      await openTitle(page, testInfo);
      await startDeterministicGame(page);
      const captures = await page.evaluate(function (mode) {
        const G = FB.game;
        if (mode === 'observe') {
          G.pending = { seed:'DAILY-PHASES-OBSERVER' };
          if (G.startObserve() === false) throw new Error('Observer start was rejected.');
        }
        G.setPaused(true);
        G.auto.all = true; G.auto.style = 'first';
        FB.ui.closeModal();
        const s = FB.state;
        const refresh = FB.ui.refresh, autosave = FB.save.autosave;
        let refreshes = 0, autosaves = 0;
        FB.ui.refresh = function () { refreshes++; return refresh.apply(this, arguments); };
        FB.save.autosave = function () { autosaves++; return autosave.apply(this, arguments); };
        const captures = [];
        try {
          // Stage each date directly: only three actual daily passes, including winter.
          [
            { name:'day', turn:9, season:0, day:10 },
            { name:'season', turn:89, season:0, day:90 },
            { name:'year', turn:359, season:3, day:90 }
          ].forEach(function (stage) {
            s.turn = stage.turn;
            s.date = { year:867, season:stage.season, day:stage.day };
            const result = G.passDay();
            captures.push({
              name:stage.name, result:result, turn:s.turn, date:s.date,
              state:JSON.stringify(s), rng:FB.getRngState() >>> 0,
              uid:FB.getUidCounter(), refreshes:refreshes, autosaves:autosaves
            });
          });
        } finally {
          FB.ui.refresh = refresh; FB.save.autosave = autosave;
        }
        return captures;
      }, mode);
      const fingerprints = captures.map(function (capture) {
        const state = capture.state;
        delete capture.state;
        capture.stateBytes = Buffer.byteLength(state, 'utf8');
        capture.sha256 = crypto.createHash('sha256').update(state).digest('hex');
        capture.sortedSha256 = crypto.createHash('sha256')
          .update(JSON.stringify(withSortedKeys(JSON.parse(state)))).digest('hex');
        return capture;
      });
      await testInfo.attach(mode + '-fingerprints', {
        body:JSON.stringify(fingerprints, null, 2), contentType:'application/json'
      });
      expect(fingerprints.map(function (f) { return [f.result, f.turn]; }))
        .toEqual([['day', 10], ['season', 90], ['season', 360]]);
      expect(fingerprints).toEqual(baseline[mode]);
    });
});
