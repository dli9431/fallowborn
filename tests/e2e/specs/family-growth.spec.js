'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'js/main.js',
  'js/model.js',
  'js/world.js'
]);

const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { startDeterministicGame } = require('../support/game/start');
const { injectBrowserHarness } = require('../support/game/browser-harness');

/* Guards docs/plans/family-record-growth.md: an extreme fertility multiplier
   must stay a probability (kinConceiveCap), and past familyMaxChars the wider
   family must stop adding records (localStorage quota backstop) while sealed
   betrothals still wed. */

test.beforeEach(async function ({ page }, testInfo) {
  await openGame(page, testInfo);
});

test('an extreme fertility trait no longer means a birth every year',
  async function ({ page }, testInfo) {
    test.skip(testInfo.project.name !== 'chromium-file',
      'The conception clamp check runs against the primary file target.');
    test.slow();
    await startDeterministicGame(page);
    await injectBrowserHarness(page);

    const result = await page.evaluate(function () {
      FB.game.setPaused(true);
      const s = FB.state;
      const me = s.chars[s.player.charId];
      const year = s.date.year;
      /* Reuse a real trait so every system sees a complete record; only the
         multiplier is pushed to the stress-test extreme. */
      const lustful = FBDATA.traits.lustful;
      const realFert = lustful.fert;
      const mortality = FBDATA.balance.mortalityBase;
      lustful.fert = 1e9;
      FBDATA.balance.mortalityBase = 0; // nobody dies mid-check
      s.player.flags.noChildren = 1; // isolate kin births from the household
      me.born = year - 45;
      const wives = [];
      const couples = 12;
      for (let i = 0; i < couples; i++) {
        const son = FB.makeCharacter(s, {
          sex:'m', culture:me.culture, religion:me.religion,
          born:year - 25, traits:['lustful'], traitsN:0,
          dyn:me.dyn, fatherId:me.sex === 'm' ? me.id : null,
          motherId:me.sex === 'f' ? me.id : null
        });
        son.health = 8;
        const wife = FB.makeCharacter(s, {
          sex:'f', culture:me.culture, religion:me.religion,
          born:year - 25, traits:['lustful'], traitsN:0
        });
        wife.health = 8;
        son.spouseId = wife.id; wife.spouseId = son.id;
        me.childrenIds.push(son.id);
        wives.push(wife.id);
      }
      FB.touchFamily();
      const years = 2;
      try {
        FBTEST.advanceDays({
          days:360 * years, maxDays:360 * years,
          maxEvents:800, maxInterruptions:20, checkEvery:30
        });
      } finally {
        lustful.fert = realFert;
        FBDATA.balance.mortalityBase = mortality;
      }
      let babies = 0;
      for (const id of wives) babies += s.chars[id].childrenIds.length;
      return { opportunities:couples * years, babies:babies };
    });

    /* Unclamped, every one of the 24 conception rolls is a certainty. Clamped
       to kinConceiveCap the family is large but probabilistic. The seeded run
       is deterministic; these bounds reject only the certainty outcomes. */
    expect(result.babies).toBeGreaterThan(0);
    expect(result.babies).toBeLessThan(result.opportunities);
  });

test('past familyMaxChars the wider family adds no records, betrothals still wed',
  async function ({ page }, testInfo) {
    test.skip(testInfo.project.name !== 'chromium-file',
      'The family cap check runs against the primary file target.');
    test.slow();
    await startDeterministicGame(page);
    await injectBrowserHarness(page);

    const result = await page.evaluate(function () {
      FB.game.setPaused(true);
      const s = FB.state;
      const me = s.chars[s.player.charId];
      const year = s.date.year;
      const knob = FBDATA.balance.familyMaxChars;
      const mortality = FBDATA.balance.mortalityBase;
      FBDATA.balance.familyMaxChars = 0; // the house is always "full"
      FBDATA.balance.mortalityBase = 0;
      s.player.flags.noChildren = 1;
      me.born = year - 45;
      function son() {
        const k = FB.makeCharacter(s, {
          sex:'m', culture:me.culture, religion:me.religion,
          born:year - 25, traits:[], traitsN:0, dyn:me.dyn,
          fatherId:me.sex === 'm' ? me.id : null,
          motherId:me.sex === 'f' ? me.id : null
        });
        k.health = 8;
        me.childrenIds.push(k.id);
        return k;
      }
      const freeSon = son(); // unscripted wedding candidate
      const pledgedSon = son(); // sealed betrothal
      const bride = FB.makeCharacter(s, {
        sex:'f', culture:me.culture, religion:me.religion,
        born:year - 20, traits:[], traitsN:0
      });
      bride.health = 8;
      pledgedSon.betrothedId = bride.id;
      bride.betrothedId = pledgedSon.id;
      FB.touchFamily();
      const before = { family:FB.familySize(s) };
      try {
        FBTEST.advanceDays({
          days:360, maxDays:360,
          maxEvents:400, maxInterruptions:20, checkEvery:30
        });
      } finally {
        FBDATA.balance.familyMaxChars = knob;
        FBDATA.balance.mortalityBase = mortality;
      }
      return {
        before:before,
        after:{ family:FB.familySize(s) },
        freeSonWed:!!s.chars[freeSon.id].spouseId,
        pledgedWedTo:s.chars[pledgedSon.id].spouseId,
        brideId:bride.id,
        brideRole:s.chars[bride.id].role
      };
    });

    expect(result.freeSonWed).toBe(false); // unscripted weddings are gated
    expect(result.pledgedWedTo).toBe(result.brideId); // player promises hold
    expect(result.brideRole).toBe('kinspouse');
    /* Exactly one record joins the reachable family: the bride, who already
       existed. Any new kinspouse or baby record would raise this further. */
    expect(result.after.family - result.before.family).toBe(1);
  });

test('FB.familySize counts a linked tree once, dead and dangling links included',
  async function ({ page }) {
    await startDeterministicGame(page);

    const counts = await page.evaluate(function () {
      const s = FB.state;
      const me = s.chars[s.player.charId];
      const year = s.date.year;
      const stash = {
        fatherId:me.fatherId, motherId:me.motherId,
        spouseId:me.spouseId, childrenIds:me.childrenIds
      };
      function mk(opts) {
        return FB.makeCharacter(s, Object.assign({
          culture:me.culture, religion:me.religion,
          born:year - 40, traits:[], traitsN:0
        }, opts));
      }
      const dad = mk({ sex:'m' });
      const mom = mk({ sex:'f' });
      const sib = mk({ sex:'f', born:year - 18, fatherId:dad.id, motherId:mom.id });
      const grandpa = mk({ sex:'m', born:year - 70 });
      const kid = mk({ sex:'m', born:year - 5, fatherId:me.id });
      dad.spouseId = mom.id; mom.spouseId = dad.id;
      // shared parents must not double-count; the dangling id is tolerated
      dad.childrenIds = [me.id, sib.id, 'c_gone'];
      mom.childrenIds = [me.id, sib.id];
      dad.fatherId = grandpa.id;
      grandpa.childrenIds = [dad.id];
      grandpa.dead = true; // dead records are what accumulate — they count
      me.fatherId = dad.id; me.motherId = mom.id;
      me.spouseId = 'c_missing'; // dangling spouse id tolerated
      me.childrenIds = [kid.id];
      const tree = FB.familySize(s);
      const empty = FB.familySize({ chars:{}, player:{ charId:'x' } });
      me.fatherId = stash.fatherId; me.motherId = stash.motherId;
      me.spouseId = stash.spouseId; me.childrenIds = stash.childrenIds;
      return { tree:tree, empty:empty };
    });

    // me, dad, mom, sib, grandpa, kid
    expect(counts.tree).toBe(6);
    expect(counts.empty).toBe(0);
  });
