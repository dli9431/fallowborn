'use strict';

const { test, expect } = require('../support/fixture');
const {
  START_CODE,
  openGame,
  startDeterministicGame
} = require('../support/game');

test('served origin provides persistent storage for save slots',
  async function ({ page }, testInfo) {
    test.skip(testInfo.project.name !== 'chromium-served',
      'The complete storage contract belongs to the served origin.');

    await openGame(page, testInfo);
    expect(await page.evaluate(function () {
      localStorage.setItem('fallowborn_contract_probe', 'persistent');
      return {
        available: FB.save.available,
        auto: FB.save.read('auto'),
        slot: FB.save.read(1)
      };
    })).toEqual({
      available: true,
      auto: null,
      slot: null
    });

    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.locator('#title:not(.hidden)')).toBeVisible();
    expect(await page.evaluate(function () {
      const value = localStorage.getItem('fallowborn_contract_probe');
      localStorage.removeItem('fallowborn_contract_probe');
      return value;
    })).toBe('persistent');

    await startDeterministicGame(page);
    expect(await page.evaluate(function () {
      const auto = FB.save.read('auto');
      const stored = FB.save.toSlot(1);
      const slot = FB.save.read(1);
      return {
        stored: stored,
        autoVersion: auto && auto.v,
        autoSeed: auto && auto.state.seed,
        slotVersion: slot && slot.v,
        slotSeed: slot && slot.state.seed
      };
    })).toEqual({
      stored: true,
      autoVersion: 3,
      autoSeed: START_CODE,
      slotVersion: 3,
      slotSeed: START_CODE
    });

    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.locator('#title:not(.hidden)')).toBeVisible();
    expect(await page.evaluate(function () {
      return {
        autoSeed: FB.save.read('auto').state.seed,
        slotSeed: FB.save.read(1).state.seed
      };
    })).toEqual({
      autoSeed: START_CODE,
      slotSeed: START_CODE
    });
  });

test('an eager-court save stays within the storage budget and reloads whole',
  async function ({ page }, testInfo) {
    test.slow();
    test.skip(testInfo.project.name !== 'chromium-served',
      'The storage budget belongs to the served origin.');

    await openGame(page, testInfo);
    await startDeterministicGame(page);

    expect(await page.evaluate(function () {
      const elapsedYears = 60;
      for (let year = 0; year < elapsedYears; year++) {
        FB.state.date.year++;
        FB.state.turn += 360;
        FB.worldTick(FB.state);
      }
      const payload = FB.save.serialize();
      const before = JSON.parse(payload);
      const records = Object.keys(before.state.chars).length;
      let courtRecords = 0;
      for (const id in before.state.chars) {
        if (before.state.chars[id].royalLine) courtRecords++;
      }
      const stored = FB.save.toSlot(1);
      const reread = FB.save.read(1);
      return {
        stored:stored,
        rereadable:!!reread && reread.v === 3,
        elapsedYears:elapsedYears,
        records:records,
        courtRecords:courtRecords,
        bytes:payload.length,
        recordsSurviveRoundTrip:
          !!reread && Object.keys(reread.state.chars).length === records
      };
    }).then(function (result) {
      return {
        stored:result.stored,
        rereadable:result.rereadable,
        longCampaign:result.elapsedYears === 60,
        recordsSurviveRoundTrip:result.recordsSurviveRoundTrip,
        /* Court population is bound by the map, so this is a flat ceiling and
           not a figure that should drift upward with campaign length. The
           measured full-court range is 1.1-1.4 MB; 1.5 MB leaves a narrow
           serialization margin without weakening that acceptance target. */
        courtRecordsPresent:result.courtRecords > 100,
        withinBudget:result.bytes < 1.5 * 1024 * 1024
      };
    })).toEqual({
      stored:true,
      rereadable:true,
      longCampaign:true,
      recordsSurviveRoundTrip:true,
      courtRecordsPresent:true,
      withinBudget:true
    });
  });

test('save compaction rehydrates court links and technology exposure',
  async function ({ page }, testInfo) {
    await openGame(page, testInfo);
    await startDeterministicGame(page);

    expect(await page.evaluate(function () {
      const s = FB.state;
      let sample = null;
      for (const rid in s.realms) {
        const realm = s.realms[rid];
        const succession = realm && realm.alive && rid !== 'player' &&
          realm.succession;
        const member = succession && succession.rulerMemberId &&
          succession.members[succession.rulerMemberId];
        const c = member && member.charId && s.chars[member.charId];
        if (!member || !c || member.role === 'consort' ||
            member.charId !== FB.courtCharacterId(member.id)) continue;
        sample = {
          rid:rid,
          memberId:member.id,
          charId:c.id,
          childCount:member.childIds.length
        };
        break;
      }
      let techSample = null;
      for (const rid in s.realmTech) {
        const record = s.realmTech[rid];
        for (const id of record.completed) {
          if (record.exposed.indexOf(id) >= 0) {
            techSample = { rid:rid, id:id };
            break;
          }
        }
        if (techSample) break;
      }
      if (!sample || !techSample) return { skipped:true };

      const payload = JSON.parse(FB.save.serialize());
      const rawSuccession = payload.state.realms[sample.rid].succession;
      const rawMember = rawSuccession.members[sample.memberId];
      const rawChar = payload.state.chars[sample.charId];
      const rawTech = payload.state.realmTech[techSample.rid];
      const own = Object.prototype.hasOwnProperty;
      const compact = !own.call(rawMember, 'charId') &&
        !own.call(rawMember, 'childIds') &&
        !own.call(rawMember, 'alive') &&
        !own.call(rawMember, 'role') &&
        !own.call(rawChar, 'dead') &&
        !own.call(rawChar, 'role') &&
        !own.call(rawChar, 'fatherId') &&
        !own.call(rawChar, 'motherId') &&
        rawTech.completed.indexOf(techSample.id) >= 0 &&
        rawTech.exposed.indexOf(techSample.id) < 0;

      FB.save.restore(payload);
      const restoredMember = FB.state.realms[sample.rid]
        .succession.members[sample.memberId];
      const restoredChar = FB.state.chars[sample.charId];
      const restoredTech = FB.state.realmTech[techSample.rid];
      const restoredRuler = FB.realmRulerCharacterSnapshot(
        FB.state, sample.rid);
      return {
        skipped:false,
        compact:compact,
        member:!!restoredMember && restoredMember.charId === sample.charId &&
          restoredMember.alive === true && restoredMember.role === null &&
          restoredMember.childIds.length === sample.childCount,
        character:!!restoredChar && restoredChar.dead === false &&
          restoredChar.role === null && restoredChar.fatherId === null &&
          restoredChar.motherId === null,
        ruler:!!restoredRuler && restoredRuler.id === sample.charId,
        exposure:!!restoredTech &&
          restoredTech.exposed.indexOf(techSample.id) >= 0
      };
    })).toEqual({
      skipped:false,
      compact:true,
      member:true,
      character:true,
      ruler:true,
      exposure:true
    });
  });

test('a quota-shaped storage failure advises export, not a generic error',
  async function ({ page }, testInfo) {
    await openGame(page, testInfo);
    await startDeterministicGame(page);

    const result = await page.evaluate(function () {
      const original = Storage.prototype.setItem;
      Storage.prototype.setItem = function () {
        throw new DOMException('storage is full', 'QuotaExceededError');
      };
      try {
        const stored = FB.save.toSlot(1);
        const texts = [];
        const nodes = document.querySelectorAll('#toasts .toast');
        for (const el of nodes) texts.push(el.textContent);
        return { stored:stored, texts:texts };
      } finally {
        Storage.prototype.setItem = original;
      }
    });

    expect(result.stored).toBe(false);
    expect(result.texts.some(function (t) {
      return t.indexOf('outgrown') >= 0 && t.indexOf('Export') >= 0;
    })).toBe(true);
  });
