'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'index.html',
  'css',
  'js',
  'data'
]);

const { test, expect } = require('../support/fixture');
const { attachPageDiagnostic } = require('../support/game-diagnostic');
const { installPageGuards } = require('../support/page-contract');
const { openGame } = require('../support/game/navigation');
const { startDeterministicGame } = require('../support/game/start');
const { injectBrowserHarness } = require('../support/game/browser-harness');

async function runScript(page, testInfo) {
  await openGame(page, testInfo);
  await startDeterministicGame(page);
  await injectBrowserHarness(page);
  return page.evaluate(function () {
    const result = FBTEST.advanceDays({
      days: 30,
      maxDays: 30,
      maxEvents: 20,
      maxInterruptions: 0,
      checkEvery: 10,
      style: 'first'
    });
    return JSON.parse(result.serialized);
  });
}

test('the same start and scripted decisions serialize identically in two contexts',
  async function ({ browser, page }, testInfo) {
    test.skip(testInfo.project.name !== 'chromium-file',
      'The determinism canary runs against the primary file target.');

    const first = await runScript(page, testInfo);
    const secondContext = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      locale: 'en-US',
      timezoneId: 'UTC'
    });
    let secondPage;

    try {
      secondPage = await secondContext.newPage();
      const guard = installPageGuards(secondPage);
      const second = await runScript(secondPage, testInfo);
      expect(guard.faults, 'second browser context faults').toEqual([]);
      expect(second).toEqual(first);
    } catch (error) {
      if (secondPage) {
        await attachPageDiagnostic(secondPage, testInfo, 'second-context-game-state');
        if (!secondPage.isClosed()) {
          const screenshotPath = testInfo.outputPath('second-context-failure.png');
          await secondPage.screenshot({ path: screenshotPath, fullPage: true });
          await testInfo.attach('second-context-failure', {
            path: screenshotPath,
            contentType: 'image/png'
          });
        }
      }
      throw error;
    } finally {
      await secondContext.close();
    }
  });

test('a fixed seed pins the courts as well as the protagonist',
  async function ({ page }, testInfo) {
    test.skip(testInfo.project.name !== 'chromium-file',
      'The court seed canary runs against the primary file target.');

    await openGame(page, testInfo);
    await startDeterministicGame(page);

    /* Court generation runs on a stream scoped to the world seed and the
       realm, so re-seeding the shared world stream to anything at all must
       leave an already-materialized court exactly where it was, and a court
       materialized afterwards must match the one materialized before. */
    expect(await page.evaluate(function () {
      const s = FB.state;
      function fingerprint(rid) {
        const c = FB.realmRulerCharacterSnapshot(s, rid);
        return c ? c.id + '|' + c.name + '|' + JSON.stringify(c.skills) +
          '|' + c.traits.join(',') : null;
      }
      const ids = [];
      for (const rid in s.realms) {
        const r = s.realms[rid];
        if (r && r.alive && rid !== 'player') ids.push(rid);
      }
      ids.sort();
      const target = ids[0];
      const first = fingerprint(target);

      /* Drop the record and rebuild it from a deliberately different point in
         the shared stream. A scoped court reproduces; an unscoped one does not. */
      const succession = s.realms[target].succession;
      const member = succession.members[succession.rulerMemberId];
      const charId = member.charId;
      delete s.chars[charId];
      member.charId = null;
      FB.seedRng(FB.hashSeed('a completely different stream position'));
      FB.materializeRealmRuler(s, target);
      return { first:first, second:fingerprint(target) };
    }).then(function (result) {
      return result.first !== null && result.first === result.second;
    })).toBe(true);
  });

test('serf tenure formation, legacy repair, context-slot resolution, and archetype matrix produce identical state without consuming or polluting the RNG stream',
  async function ({ page }, testInfo) {
    test.skip(testInfo.project.name !== 'chromium-file',
      'The tenure determinism canary runs against the primary file target.');

    await openGame(page, testInfo);
    await startDeterministicGame(page);

    expect(await page.evaluate(function () {
      const s = FB.state;
      FB.setPlayerTier(s, 0, { tenureFormationReason:'rank_change' });
      delete s.player.tenure;
      const startSnapshot = JSON.stringify(s);

      const rngBefore = FB.getRngState();

      // Two independent formations from the exact same serialized start state.
      const firstState = JSON.parse(startSnapshot);
      const secondState = JSON.parse(startSnapshot);
      const tenure1 = FB.ensureSerfTenure(firstState, 'new_game');
      const tenureRepeat = FB.ensureSerfTenure(secondState, 'new_game');
      const view1 = FB.tenureView(firstState);

      // Legacy repair neutrality from the same state shape.
      const repairState = JSON.parse(startSnapshot);
      const tenureRepaired = FB.ensureSerfTenure(repairState, 'legacy_repair');

      const rngAfter = FB.getRngState();

      // Full Phase E matrix of archetype selections
      const matrix = [
        // Catholic Iberian (Barcelona)
        { prov: 'barcelona', sett: 0, culture: 'iberian', faith: 'catholic', terrain: 'farmland', dev0: 5, kind: 'village', expected: 'latin_manorial' },
        // Muslim Sunni (Fustat, high dev)
        { prov: 'fustat', sett: 0, culture: 'arabic', faith: 'sunni', terrain: 'farmland', dev0: 6, kind: 'village', expected: 'irrigated_fellah' },
        // Muslim Shia (Fustat 1066)
        { prov: 'fustat', sett: 0, culture: 'arabic', faith: 'shia', terrain: 'farmland', dev0: 6, kind: 'village', expected: 'irrigated_fellah' },
        // Slavic Pagan (Novgorod 867)
        { prov: 'novgorod', sett: 0, culture: 'slavic', faith: 'slavic_pagan', terrain: 'forest', dev0: 2, kind: 'village', expected: 'pagan_household_service' },
        // Baltic Pagan Finnic (Novgorod 1066)
        { prov: 'novgorod', sett: 0, culture: 'finnic', faith: 'baltic_pagan', terrain: 'forest', dev0: 3, kind: 'village', expected: 'pagan_household_service' },
        // Unsupported Jewish
        { prov: 'khazaria', sett: 0, culture: 'khazar', faith: 'jewish', terrain: 'steppe', dev0: 2, kind: 'town', expected: 'dependent_farming' },
        // Unsupported Steppe Tengri
        { prov: 'sarai', sett: 0, culture: 'steppe_nomad', faith: 'tengri', terrain: 'steppe', dev0: 0, kind: 'camp', expected: 'dependent_farming' },
        // Unsupported Desert Bedouin
        { prov: 'medina', sett: 0, culture: 'bedouin', faith: 'sunni', terrain: 'desert', dev0: 2, kind: 'village', expected: 'dependent_farming' },
        // Low-development Muslim
        { prov: 'desert_oasis', sett: 0, culture: 'arabic', faith: 'sunni', terrain: 'farmland', dev0: 2, kind: 'village', expected: 'dependent_farming' }
      ];

      const matrixMatches = matrix.every(function (cfg) {
        const sel1 = FB.selectSerfTenureArchetype({
          provinceId: cfg.prov, settlementIndex: cfg.sett, culture: cfg.culture,
          faith: cfg.faith, terrain: cfg.terrain, dev0: cfg.dev0, settlementKind: cfg.kind, state: s
        });
        const sel2 = FB.selectSerfTenureArchetype({
          provinceId: cfg.prov, settlementIndex: cfg.sett, culture: cfg.culture,
          faith: cfg.faith, terrain: cfg.terrain, dev0: cfg.dev0, settlementKind: cfg.kind, state: s
        });
        return sel1.archetype.id === cfg.expected &&
          JSON.stringify(sel1) === JSON.stringify(sel2);
      });

      // Selection independence from age, sex, gold, or family preset
      const presetYouth = FB.selectSerfTenureArchetype({
        provinceId: 'barcelona', settlementIndex: 0, culture: 'iberian', faith: 'catholic',
        terrain: 'farmland', dev0: 5, settlementKind: 'village', familyPreset: 'standard', age: 18, sex: 'f', gold: 5, state: s
      });
      const presetEstablished = FB.selectSerfTenureArchetype({
        provinceId: 'barcelona', settlementIndex: 0, culture: 'iberian', faith: 'catholic',
        terrain: 'farmland', dev0: 5, settlementKind: 'village', familyPreset: 'established', age: 40, sex: 'm', gold: 50, state: s
      });
      const presetIndependent = presetYouth.archetype.id === presetEstablished.archetype.id &&
        JSON.stringify(presetYouth.resolvedDuties) === JSON.stringify(presetEstablished.resolvedDuties);

      // Context-slot resolution test:
      // 1. latin_manorial in forest -> pannage_due
      const forestLatin = FB.selectSerfTenureArchetype({
        provinceId: 'london', settlementIndex: 0, culture: 'english',
        faith: 'catholic', terrain: 'forest', dev0: 5, settlementKind: 'village', state: s
      });
      const forestFacility = forestLatin.resolvedDuties.filter(function (d) { return d.id === 'local_facility_due'; })[0];

      // 2. latin_manorial in farmland town (non-village) -> fallback mill_multure
      const townLatin = FB.selectSerfTenureArchetype({
        provinceId: 'london', settlementIndex: 0, culture: 'english',
        faith: 'catholic', terrain: 'farmland', dev0: 5, settlementKind: 'town', state: s
      });
      const townFacility = townLatin.resolvedDuties.filter(function (d) { return d.id === 'local_facility_due'; })[0];

      // 3. pagan_household_service in forest -> deadwood_amerced (context slot)
      const forestPagan = FB.selectSerfTenureArchetype({
        provinceId: 'novgorod', settlementIndex: 0, culture: 'slavic',
        faith: 'slavic_pagan', terrain: 'forest', dev0: 2, settlementKind: 'village', state: s
      });
      const forestPaganHeavy = forestPagan.resolvedDuties.filter(function (d) { return d.id === 'local_heavy_service'; })[0];

      return {
        tenureStatus: tenure1 && tenure1.status,
        repeatedIdentical: JSON.stringify(tenure1) === JSON.stringify(tenureRepeat),
        repairedActive: tenureRepaired && tenureRepaired.status === 'active',
        hasLord: !!(view1 && view1.lordName),
        rngPreserved: rngBefore === rngAfter,
        matrixMatches: matrixMatches,
        presetIndependent: presetIndependent,
        forestFacilityEvent: forestFacility && forestFacility.eventId,
        townFacilityEvent: townFacility && townFacility.eventId,
        forestPaganHeavyEvent: forestPaganHeavy && forestPaganHeavy.eventId
      };
    })).toEqual({
      tenureStatus: 'active',
      repeatedIdentical: true,
      repairedActive: true,
      hasLord: true,
      rngPreserved: true,
      matrixMatches: true,
      presetIndependent: true,
      forestFacilityEvent: 'serf_pannage_due',
      townFacilityEvent: 'serf_mill_multure',
      forestPaganHeavyEvent: 'serf_deadwood_amerced'
    });
  });
