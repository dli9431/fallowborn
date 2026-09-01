'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'js/main.js',
  'js/model.js',
  'js/world.js',
  'js/events.js'
]);

const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { startDeterministicGame } = require('../support/game/start');
const { injectBrowserHarness } = require('../support/game/browser-harness');

test('a bounded simulation preserves game-state invariants',
  async function ({ page }, testInfo) {
    test.skip(testInfo.project.name !== 'chromium-file',
      'The initial invariant smoke test runs against the primary file target.');

    await openGame(page, testInfo);
    await startDeterministicGame(page);
    await injectBrowserHarness(page);
    const result = await page.evaluate(function () {
      return FBTEST.advanceDays({
        days: 120,
        maxDays: 120,
        maxEvents: 80,
        maxInterruptions: 0,
        checkEvery: 15,
        style: 'first'
      });
    });

    expect(result).toMatchObject({
      startTurn: 0,
      endTurn: 120,
      advanced: 120,
      interruptions: 0
    });
    expect(result.events).toBeLessThanOrEqual(80);
    expect(await page.evaluate(function () {
      return FBTEST.checkInvariants();
    })).toEqual([]);
  });

test('year-boundary work does not grow with the character record count',
  async function ({ page }, testInfo) {
    test.skip(testInfo.project.name !== 'chromium-file',
      'The year-boundary cost check runs against the primary file target.');
    test.slow();

    await openGame(page, testInfo);
    await startDeterministicGame(page);
    await injectBrowserHarness(page);

    /* The defect this guards against is O(records x realms): every record
       that is not a reigning ruler paying a full realm scan in the yearly
       mortality pass. Rather than time it, which is flaky in CI, assert the
       shape directly - a tenfold record count must not multiply the number of
       realm lookups the reigning-ruler question costs. */
    expect(await page.evaluate(function () {
      const s = FB.state;
      function probe() {
        let realmReads = 0;
        const realms = s.realms;
        const proxy = new Proxy(realms, {
          get:function (target, key) {
            if (typeof key === 'string') realmReads++;
            return target[key];
          },
          ownKeys:function (target) { return Reflect.ownKeys(target); }
        });
        s.realms = proxy;
        try {
          for (const id in s.chars) {
            const c = s.chars[id];
            if (c.dead) continue;
            FB.isReigningRealmRuler(s, c);
          }
        } finally {
          s.realms = realms;
        }
        return realmReads;
      }

      const baselineRecords = Object.keys(s.chars).length;
      const baselineReads = probe();

      /* Add a thousand ordinary records - the shape a long campaign reaches. */
      const me = s.chars[s.player.charId];
      for (let i = 0; i < 1000; i++) {
        FB.makeCharacter(s, {
          culture:me.culture, religion:me.religion,
          born:s.date.year - 30, traitsN:0
        });
      }
      const grownReads = probe();
      return {
        baselineRecords:baselineRecords,
        grownRecords:Object.keys(s.chars).length,
        /* Each added record may cost a small constant number of realm reads,
           never one per realm. The realm count is in the hundreds, so a
           per-record scan would blow through this bound immediately. */
        perAddedRecord:(grownReads - baselineReads) / 1000,
        realms:Object.keys(s.realms).length
      };
    }).then(function (result) {
      return {
        grew:result.grownRecords > result.baselineRecords,
        boundedPerRecord:result.perAddedRecord < 8,
        manyRealms:result.realms > 100
      };
    })).toEqual({ grew:true, boundedPerRecord:true, manyRealms:true });
  });

test('a death-heavy realm rollover reuses one family snapshot',
  async function ({ page }, testInfo) {
    test.skip(testInfo.project.name !== 'chromium-file',
      'The rollover shape check runs against the primary file target.');
    await openGame(page, testInfo);
    await startDeterministicGame(page);

    expect(await page.evaluate(function () {
      const s = FB.state;
      const originalSnapshot = FB.familyLinksSnapshot;
      const originalKin = FB.kinOf;
      const originalChance = FB.chance;
      const originalMortality = FBDATA.balance.mortalityBase;
      let snapshots = 0;
      let kinReads = 0;
      let deaths = 0;
      for (const rid in s.realms) {
        const succession = s.realms[rid] && s.realms[rid].succession;
        if (!succession) continue;
        for (const memberId in succession.members) {
          const member = succession.members[memberId];
          if (member && memberId !== succession.rulerMemberId) {
            member.born = s.date.year - 90;
          }
        }
      }
      FB.familyLinksSnapshot = function (state) {
        snapshots++;
        return originalSnapshot(state);
      };
      FB.kinOf = function (state) {
        kinReads++;
        return originalKin(state);
      };
      FBDATA.balance.mortalityBase = 0.024;
      FB.chance = function (q) {
        /* A 90-year-old court member has .25 base mortality, doubled by the
           balance knob. Keep realm rulers and unrelated yearly rolls alive. */
        if (Math.abs(q - 0.5) < 0.0000001) {
          deaths++;
          return true;
        }
        return false;
      };
      try {
        s.date.year++;
        s.turn += 360;
        FB.worldTick(s);
      } finally {
        FB.familyLinksSnapshot = originalSnapshot;
        FB.kinOf = originalKin;
        FB.chance = originalChance;
        FBDATA.balance.mortalityBase = originalMortality;
      }
      return {
        manyDeaths:deaths > 20,
        snapshots:snapshots,
        kinReads:kinReads
      };
    })).toEqual({ manyDeaths:true, snapshots:1, kinReads:1 });
  });

test('home pestilence mortality does not follow extended kin to another county',
  async function ({ page }, testInfo) {
    test.skip(testInfo.project.name !== 'chromium-file',
      'The yearly family-mortality check runs against the primary file target.');
    await openGame(page, testInfo);
    await startDeterministicGame(page);

    expect(await page.evaluate(function () {
      FB.game.setPaused(true);
      const s = FB.state;
      const me = s.chars[s.player.charId];
      const home = s.player.provinceId;
      const away = FB.world.provs.find(function (province) {
        return !province.wasteland && province.id !== home;
      }).id;
      const sibling = FB.makeCharacter(s, {
        sex:'f', culture:me.culture, religion:me.religion,
        born:s.date.year - 40, traits:[], traitsN:0, dyn:me.dyn,
        fatherId:me.fatherId, motherId:me.motherId
      });
      const localNiece = FB.makeCharacter(s, {
        sex:'f', culture:me.culture, religion:me.religion,
        born:s.date.year - 30, traits:[], traitsN:0, dyn:me.dyn,
        motherId:sibling.id
      });
      const remoteNiece = FB.makeCharacter(s, {
        sex:'f', culture:me.culture, religion:me.religion,
        born:s.date.year - 30, traits:[], traitsN:0, dyn:me.dyn,
        motherId:sibling.id
      });
      localNiece.homeProvinceId = home;
      remoteNiece.homeProvinceId = away;
      sibling.childrenIds.push(localNiece.id, remoteNiece.id);
      FB.touchFamily();

      const originalChance = FB.chance;
      s.player.flags.plague_here = 1;
      s.date.season = 3;
      s.date.day = 90;
      FB.chance = function (chance) {
        /* Age 30 has 0.8% base mortality. Only a resident receives the
           pestilence's additional five percentage points. */
        return Math.abs(chance - 0.058) < 0.0000001;
      };
      try {
        FB.game.passDay();
      } finally {
        FB.chance = originalChance;
      }
      return {
        localDead:localNiece.dead,
        remoteDead:remoteNiece.dead,
        localAtHome:FB.characterResidence(s, localNiece) === home,
        remoteAtAway:FB.characterResidence(s, remoteNiece) === away,
        localRelation:FB.kinOf(s).byId[localNiece.id],
        remoteRelation:FB.kinOf(s).byId[remoteNiece.id]
      };
    })).toEqual({
      localDead:true,
      remoteDead:false,
      localAtHome:true,
      remoteAtAway:true,
      localRelation:'Niece',
      remoteRelation:'Niece'
    });
  });
