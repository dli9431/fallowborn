'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'js/portrait.js',
  'js/station.js',
  'js/economy.js',
  'js/model.js',
  'data/cultures.js',
  'data/wardrobes.js',
  'data/eras.js',
  'data/economy.js'
]);
const { test } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { parityMode, settleParityFixture } = require('../support/parity-fixtures');

/* Owner-run portrait parity: for each core bookmark, a fixed matrix of
   synthetic characters (every culture, one faith per faith group, every
   station, every career role, child, adult and elder) painted as busts and
   adult figures, recording each pixel hash and the resolved look. It uses
   only portrait APIs older than wardrobes (a start id on a bare state, the
   tier and profession options), so the same file captures a baseline from
   an older tree (docs/TESTS.md, Raster parity describes the copy step).
   Runs only when FB_PARITY is capture or compare. */
test.describe.configure({ mode:'parallel' });

const PORTRAIT_BOOKMARKS = [
  { id:'867', year:867 },
  { id:'1066', year:1066 },
  { id:'476', year:476 }
];

for (const bookmark of PORTRAIT_BOOKMARKS) {
  test('portrait parity ' + bookmark.id, async function ({ page }, testInfo) {
    test.skip(!parityMode(), 'Set FB_PARITY=capture or FB_PARITY=compare to run parity journeys.');
    test.skip(testInfo.project.name !== 'chromium-served',
      'Parity journeys use the served Chromium target.');
    test.setTimeout(10 * 60 * 1000);

    await openGame(page, testInfo);
    const snapshot = await page.evaluate(function (mark) {
      const state = { start:{ id:mark.id }, date:{ year:mark.year, season:0, day:1 } };
      function pixelHash(canvas) {
        const data = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
        let hash = 2166136261;
        for (let i = 0; i < data.length; i++) hash = Math.imul(hash ^ data[i], 16777619);
        return hash >>> 0;
      }
      function lookFacts(look) {
        return [look.headwear, look.headwearVariant, look.hairStyle, look.beardKind,
          look.beardCut, look.cloth.kind, look.cloth.raw.join(','),
          look.pigment.toFixed(6), look.hair.base.join(','), look.eyeKey,
          look.coversHair ? 'covered' : 'bare'].join(' ');
      }
      const out = {};
      function record(key, c, tier, profession, figure) {
        const opts = { tier:tier, profession:profession, loadout:{} };
        const look = FB.characterLook(c, mark.year, state, opts);
        const bust = document.createElement('canvas');
        bust.width = 96; bust.height = 108;
        FB.paintPortrait(bust, c, mark.year, Object.assign({ state:state }, opts));
        let row = lookFacts(look) + ' | bust ' + pixelHash(bust);
        if (figure) {
          const doll = document.createElement('canvas');
          doll.width = 192; doll.height = 360;
          FB.paintPaperDoll(doll, c, state, opts);
          row += ' | figure ' + pixelHash(doll);
        }
        out[key] = row;
      }
      function person(id, sex, age, culture, religion, tier, profession) {
        return { id:id, name:id, sex:sex, born:mark.year - age, culture:culture,
          religion:religion, dyn:'House ' + culture, health:8, traits:[],
          station:tier, role:profession };
      }
      const labor = FB.roleCareer('labor') || 'none';
      const cultures = Object.keys(FBDATA.cultures).sort();
      cultures.forEach(function (culture) {
        ['m', 'f'].forEach(function (sex) {
          ['a', 'b', 'c', 'd'].forEach(function (seed) {
            const id = 'culture-' + culture + '-' + sex + '-' + seed;
            record(id, person(id, sex, 30, culture, 'catholic', 0, labor), 0, labor, false);
          });
        });
      });
      const faiths = {};
      Object.keys(FBDATA.religions).sort().forEach(function (id) {
        const group = FB.religionOf(id).group;
        if (!faiths[group]) faiths[group] = id;
      });
      const professions = ['none'];
      ['labor', 'craft', 'trading', 'arms', 'clergy', 'cloister', 'noble'].forEach(function (role) {
        const id = FB.roleCareer(role);
        if (id && professions.indexOf(id) < 0) professions.push(id);
      });
      Object.keys(faiths).sort().forEach(function (group) {
        ['m', 'f'].forEach(function (sex) {
          [8, 30, 60].forEach(function (age) {
            for (let tier = 0; tier <= 7; tier++) {
              professions.forEach(function (profession) {
                const id = ['faith', group, sex, age, tier, profession].join('-');
                const culture = cultures[(tier + age) % cultures.length];
                record(id, person(id, sex, age, culture, faiths[group], tier, profession),
                  tier, profession, age === 30);
              });
            }
          });
        });
      });
      return out;
    }, bookmark);
    await settleParityFixture(testInfo, 'portraits-' + bookmark.id, {
      id:'portraits-' + bookmark.id,
      kind:'portraits',
      bookmark:bookmark.id
    }, { portraits:snapshot });
  });
}
