'use strict';

const crypto = require('crypto');
const { test, expect } = require('../support/fixture');
const { dependsOnRuntime } = require('../support/runtime-dependencies');
const { openGame } = require('../support/game/navigation');
const { startDeterministicGame } = require('../support/game/start');

dependsOnRuntime(__filename, [
  'index.html', 'js/main.js', 'js/day_phases.js', 'js/util.js', 'js/actions.js',
  'js/world.js', 'js/events.js', 'js/economy.js', 'js/armies.js', 'js/stories.js',
  'js/building_seasons.js', 'js/systems.js', 'js/treasury.js',
  'js/holywar.js', 'js/tournaments.js', 'js/save.js', 'js/save_v4.js'
]);

// Complete serialized state, RNG and UID captured before extracting the scheduler.
const baseline = {
  play:[
    { name:'day', result:'day', turn:10, date:{ year:867, season:0, day:11 }, rng:2013589264, uid:1574,
      refreshes:2, autosaves:0, stateBytes:1983674, sha256:'9a161ef3fd1a4a06070290f99dd9a95f764bd7d0e70cf0691de29f5f63bbd6b7' },
    { name:'season', result:'season', turn:90, date:{ year:867, season:1, day:1 }, rng:512636533, uid:1580,
      refreshes:4, autosaves:1, stateBytes:2103810, sha256:'3cf1d802d190b5ef4e75f0850f008e5066651bf674d740f1d60423777ac2c398' },
    { name:'year', result:'season', turn:360, date:{ year:868, season:0, day:1 }, rng:2191761640, uid:1595,
      refreshes:6, autosaves:2, stateBytes:2500271, sha256:'92236fc979ed4a95036a5a20c534b483567e3d269c87a1760aab122b4696f257' }
  ],
  observe:[
    { name:'day', result:'day', turn:10, date:{ year:867, season:0, day:11 }, rng:1765797802, uid:3124,
      refreshes:1, autosaves:0, stateBytes:1936351, sha256:'ad4ede3a9a07c1949b45b8db0199bbb04cb49a97ee4e0584ef7bea9a2b7d686c' },
    { name:'season', result:'season', turn:90, date:{ year:867, season:1, day:1 }, rng:1592457608, uid:3126,
      refreshes:2, autosaves:0, stateBytes:2046047, sha256:'11af1dad3ce53713e4303b57afbb56e65ee419a0e0ca474edad778a07e71fa0e' },
    { name:'year', result:'season', turn:360, date:{ year:868, season:0, day:1 }, rng:2959453030, uid:3132,
      refreshes:3, autosaves:0, stateBytes:2454260, sha256:'f0643740eb1c82e9260e6791b549934b078d295e4a3fddc5610aa61547360a9d' }
  ]
};

['play', 'observe'].forEach(function (mode) {
  test(mode + ' daily, seasonal and annual passes retain their fixed-seed fingerprints',
    async function ({ page }, testInfo) {
      await openGame(page, testInfo);
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
