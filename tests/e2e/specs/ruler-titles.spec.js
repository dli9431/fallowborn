'use strict';

const { test, expect } = require('../support/fixture');
const {
  openGame,
  startDeterministicGame
} = require('../support/game');

/* AI realm rulers must be styled with the female rank words from
   FBDATA.titles.<group>_f when the ruler is female (Sultana, not Sultan). */
test('female AI realm rulers use female rank titles',
  async function ({ page }, testInfo) {
    test.skip(testInfo.project.name !== 'chromium-file',
      'The title probe runs against the primary file target.');

    await openGame(page, testInfo);
    await startDeterministicGame(page);
    const titles = await page.evaluate(function () {
      var s = FB.state;
      function provinceOfGroup(group) {
        for (var i = 0; i < FB.world.provs.length; i++) {
          var pr = FB.world.provs[i];
          if (!pr.wasteland && FB.religionOf(pr.religion).group === group) return pr;
        }
        return null;
      }
      function rankWord(group, rank, sex) {
        var pr = provinceOfGroup(group);
        if (!pr) return null;
        return FB.realmRankTitle(s, {
          id: 'probe_' + group + '_' + rank + '_' + sex,
          capital: pr.id,
          rank: rank,
          ruler: { sex: sex }
        });
      }
      return {
        muslimKingM: rankWord('muslim', 3, 'm'),
        muslimKingF: rankWord('muslim', 3, 'f'),
        muslimEmperorF: rankWord('muslim', 4, 'f'),
        muslimCountF: rankWord('muslim', 1, 'f'),
        christianKingM: rankWord('christian', 3, 'm'),
        christianKingF: rankWord('christian', 3, 'f'),
        christianDukeF: rankWord('christian', 2, 'f'),
        paganKingF: rankWord('pagan', 3, 'f'),
        jewishKingM: rankWord('jewish', 3, 'm'),
        jewishKingF: rankWord('jewish', 3, 'f'),
        jewishCountF: rankWord('jewish', 1, 'f')
      };
    });

    expect(titles.muslimKingM).toBe('Sultan');
    expect(titles.muslimKingF).toBe('Sultana');
    expect(titles.muslimEmperorF).toBe('Great Sultana');
    expect(titles.muslimCountF).toBe('Emira');
    expect(titles.christianKingM).toBe('King');
    expect(titles.christianKingF).toBe('Queen');
    expect(titles.christianDukeF).toBe('Duchess');
    expect(titles.paganKingF).toBe('Queen');
    expect(titles.jewishKingM).toBe('Khagan');
    expect(titles.jewishKingF).toBe('Khatun');
    expect(titles.jewishCountF).toBe('Begum');
  });
