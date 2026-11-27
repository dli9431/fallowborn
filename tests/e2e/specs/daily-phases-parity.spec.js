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
      refreshes:2, autosaves:0, stateBytes:1983674, sha256:'8d6551d8c57d3f72d590cf277d963ee0ff6d17efa80b8181240bae3173bc79ca',
      sortedSha256:'8db7eb5a0698e8e82d0017c5d40311b84ca8b5138b261b541de8d020c868654a' },
    { name:'season', result:'season', turn:90, date:{ year:867, season:1, day:1 }, rng:512636533, uid:1580,
      refreshes:4, autosaves:1, stateBytes:2103810, sha256:'0b20ba1135c7a8afba4aaaae31e67349b0088b2d91ba39a5521b41fd2e3e0252',
      sortedSha256:'c3de0aacd48b91a42d94412f3169de4d3cac392c138fa4ad9a260e0c9769c0d3' },
    { name:'year', result:'season', turn:360, date:{ year:868, season:0, day:1 }, rng:2191761640, uid:1595,
      refreshes:6, autosaves:2, stateBytes:2500271, sha256:'9b6441a467c2a40d2940a7e7abd151b3a5de21e0c015b91b64129bd2c2cff5a8',
      sortedSha256:'dbfebaf7dd865289f6e1b3dd111b353f09594b520af47e6f00145747ebd26158' }
  ],
  observe:[
    { name:'day', result:'day', turn:10, date:{ year:867, season:0, day:11 }, rng:1765797802, uid:3124,
      refreshes:1, autosaves:0, stateBytes:1936351, sha256:'11fb357a2baa3e1432f49fc92fb4b80091363ad4a4e6bf0fb8da055a3dfec0c8',
      sortedSha256:'79de3fe30943bea9b6e1aac5a23501a275428ca3ac114e8adf4ed80024566e14' },
    { name:'season', result:'season', turn:90, date:{ year:867, season:1, day:1 }, rng:1592457608, uid:3126,
      refreshes:2, autosaves:0, stateBytes:2046047, sha256:'182b918ce5412d5b1d9c858405db03f31377768e9a5c67caa419e50cabd07e8e',
      sortedSha256:'8bc2491e3fb892cff52a8741737f584471fdcffe41a09674a484f8ae160037e5' },
    { name:'year', result:'season', turn:360, date:{ year:868, season:0, day:1 }, rng:2959453030, uid:3132,
      refreshes:3, autosaves:0, stateBytes:2454260, sha256:'faa1e41b2c74894668b544aea5bbef1a74cadbd0d4ae234ad4d03c92cb2698f2',
      sortedSha256:'99efeaa5bb06054cddc4499915935eecbc958804e1674c6323f6a7c104aa4120' }
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
