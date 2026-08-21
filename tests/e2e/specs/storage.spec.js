'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'js/main.js',
  'js/save.js',
  'js/ui_modals.js'
]);

const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { START_CODE, startDeterministicGame } = require('../support/game/start');
const COMPLETE_SAVE_BUDGET = 1.6 * 1024 * 1024;

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

    const result = await page.evaluate(function () {
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
    });

    expect({
      stored:result.stored,
      rereadable:result.rereadable,
      longCampaign:result.elapsedYears === 60,
      recordsSurviveRoundTrip:result.recordsSurviveRoundTrip,
      courtRecordsPresent:result.courtRecords > 100
    }).toEqual({
      stored:true,
      rereadable:true,
      longCampaign:true,
      recordsSurviveRoundTrip:true,
      courtRecordsPresent:true
    });
    /* Court population is bound by the map, so this is a flat ceiling and not
       a figure that should drift upward with campaign length. The county-market
       state has its own 64 KB cap; 1.6 MB preserves a narrow combined
       serialization margin. Keep the byte assertion direct so a regression
       reports its exact payload instead of only a derived false boolean. */
    expect(result.bytes).toBeLessThan(COMPLETE_SAVE_BUDGET);
  });

test('save compaction rehydrates succession, court links, and technology exposure',
  async function ({ page }, testInfo) {
    await openGame(page, testInfo);
    await startDeterministicGame(page);

    expect(await page.evaluate(function () {
      const s = FB.state;
      let sample = null;
      let emptyChildCharId = null;
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
      for (const id in s.chars) {
        const c = s.chars[id];
        if (c && c.royalLine && Array.isArray(c.childrenIds) &&
            !c.childrenIds.length) {
          emptyChildCharId = id;
          break;
        }
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
      if (!sample || !emptyChildCharId || !techSample) return { skipped:true };

      const liveRealm = s.realms[sample.rid];
      const liveMember = liveRealm.succession.members[sample.memberId];
      const liveChar = s.chars[sample.charId];
      const deadMemberId = 'royal_e2e_compact_dead';
      liveRealm.alive = true;
      liveRealm.liege = null;
      liveRealm.aggression = 0;
      liveRealm.war = null;
      liveRealm.op = 0;
      liveMember.alive = true;
      liveChar.health = 8;
      liveChar.faithStandingBase = 0;
      liveRealm.succession.members[deadMemberId] = {
        id:deadMemberId, name:'Recorded Ancestor', sex:'m', born:800,
        alive:false, parentId:null, childIds:[], charId:null, died:850
      };
      const liveTech = s.realmTech[techSample.rid];
      liveTech.active = [];
      liveTech.progress = {};
      liveTech.priorities = {};
      const buildingPid = liveRealm.capital;
      const building = { s:0, id:'granary' };
      s.buildings[buildingPid] = s.buildings[buildingPid] || [];
      s.buildings[buildingPid].push(building);

      const payload = JSON.parse(FB.save.serialize());
      const rawRealm = payload.state.realms[sample.rid];
      const rawSuccession = payload.state.realms[sample.rid].succession;
      const rawMember = rawSuccession.members[sample.memberId];
      const rawDeadMember = rawSuccession.members[deadMemberId];
      const rawChar = payload.state.chars[sample.charId];
      const rawEmptyChildChar = payload.state.chars[emptyChildCharId];
      const rawTech = payload.state.realmTech[techSample.rid];
      const rawBuilding = payload.state.buildings[buildingPid]
        [payload.state.buildings[buildingPid].length - 1];
      const own = Object.prototype.hasOwnProperty;
      const compact = !own.call(rawRealm, 'id') &&
        !own.call(rawRealm, 'alive') &&
        !own.call(rawRealm, 'liege') &&
        !own.call(rawRealm, 'aggression') &&
        !own.call(rawRealm, 'war') &&
        !own.call(rawRealm, 'op') &&
        !own.call(rawSuccession, 'heirId') &&
        !own.call(rawMember, 'id') &&
        !own.call(rawMember, 'charId') &&
        !own.call(rawMember, 'childIds') &&
        !own.call(rawMember, 'alive') &&
        !own.call(rawMember, 'role') &&
        !own.call(rawDeadMember, 'id') &&
        !own.call(rawDeadMember, 'alive') &&
        !own.call(rawDeadMember, 'parentId') &&
        !own.call(rawDeadMember, 'charId') &&
        !own.call(rawChar, 'id') &&
        !own.call(rawChar, 'dead') &&
        !own.call(rawChar, 'role') &&
        !own.call(rawChar, 'fatherId') &&
        !own.call(rawChar, 'motherId') &&
        !own.call(rawChar, 'health') &&
        !own.call(rawChar, 'faithStandingBase') &&
        !own.call(rawEmptyChildChar, 'childrenIds') &&
        !own.call(rawTech, 'active') &&
        !own.call(rawTech, 'progress') &&
        !own.call(rawTech, 'priorities') &&
        rawTech.completed.indexOf(techSample.id) >= 0 &&
        (!rawTech.exposed || rawTech.exposed.indexOf(techSample.id) < 0) &&
        !own.call(rawBuilding, 's');

      FB.save.restore(payload);
      const restoredRealm = FB.state.realms[sample.rid];
      const restoredMember = restoredRealm.succession.members[sample.memberId];
      const restoredDeadMember = restoredRealm.succession.members[deadMemberId];
      const restoredChar = FB.state.chars[sample.charId];
      const restoredEmptyChildChar = FB.state.chars[emptyChildCharId];
      const restoredTech = FB.state.realmTech[techSample.rid];
      const restoredBuilding = FB.state.buildings[buildingPid]
        [FB.state.buildings[buildingPid].length - 1];
      const restoredRuler = FB.realmRulerCharacterSnapshot(
        FB.state, sample.rid);
      return {
        skipped:false,
        compact:compact,
        realm:!!restoredRealm && restoredRealm.id === sample.rid &&
          restoredRealm.alive === true && restoredRealm.liege === null &&
          restoredRealm.aggression === 0 && restoredRealm.war === null &&
          restoredRealm.op === 0 &&
          restoredRealm.succession.heirId ===
            (restoredRealm.succession.order[0] || null),
        member:!!restoredMember && restoredMember.id === sample.memberId &&
          restoredMember.charId === sample.charId &&
          restoredMember.alive === true && restoredMember.role === null &&
          restoredMember.childIds.length === sample.childCount,
        deadMember:!!restoredDeadMember &&
          restoredDeadMember.id === deadMemberId &&
          restoredDeadMember.alive === false &&
          restoredDeadMember.parentId === null &&
          restoredDeadMember.charId === null &&
          restoredDeadMember.childIds.length === 0,
        character:!!restoredChar && restoredChar.id === sample.charId &&
          restoredChar.dead === false && restoredChar.health === 8 &&
          restoredChar.faithStandingBase === 0 &&
          restoredChar.role === null && restoredChar.fatherId === null &&
          restoredChar.motherId === null &&
          !!restoredEmptyChildChar &&
          Array.isArray(restoredEmptyChildChar.childrenIds) &&
          restoredEmptyChildChar.childrenIds.length === 0,
        ruler:!!restoredRuler && restoredRuler.id === sample.charId,
        exposure:!!restoredTech &&
          restoredTech.exposed.indexOf(techSample.id) >= 0 &&
          Array.isArray(restoredTech.active) &&
          Object.keys(restoredTech.progress).length === 0 &&
          Object.keys(restoredTech.priorities).length === 0,
        building:!!restoredBuilding && restoredBuilding.s === 0 &&
          restoredBuilding.id === 'granary'
      };
    })).toEqual({
      skipped:false,
      compact:true,
      realm:true,
      member:true,
      deadMember:true,
      character:true,
      ruler:true,
      exposure:true,
      building:true
    });
  });

test('slots store compressed, verify their round trip, and read back the same life',
  async function ({ page }, testInfo) {
    test.skip(testInfo.project.name !== 'chromium-served',
      'The storage encoding contract belongs to the served origin.');

    await openGame(page, testInfo);
    await startDeterministicGame(page);

    expect(await page.evaluate(function () {
      /* Hostile codec input on purpose: high-BMP glyphs, a typographic
         apostrophe, and an astral emoji (a surrogate pair). */
      FB.state.player.e2eUnicodeProbe = '⚔ Æthelflæd’s café — 👑';
      const payload = FB.save.serialize();
      const stored = FB.save.toSlot(1);
      const raw = localStorage.getItem('fb_slot1');
      const reread = FB.save.read(1);
      return {
        stored:stored,
        compressed:!!raw && raw.indexOf('FBC1.') === 0,
        /* localStorage counts UTF-16 units; halving the character count is a
           conservative floor for the observed several-fold LZ ratio. */
        smaller:!!raw && raw.length * 2 < payload.length,
        identical:!!reread && JSON.stringify(reread) === payload,
        probe:reread && reread.state.player.e2eUnicodeProbe
      };
    })).toEqual({
      stored:true,
      compressed:true,
      smaller:true,
      identical:true,
      probe:'⚔ Æthelflæd’s café — 👑'
    });
  });

test('legacy plain slots and FBS1 exports still load; fresh exports are FBS2',
  async function ({ page }, testInfo) {
    test.skip(testInfo.project.name !== 'chromium-served',
      'The storage encoding contract belongs to the served origin.');

    await openGame(page, testInfo);
    await startDeterministicGame(page);

    expect(await page.evaluate(function (startCode) {
      const payload = FB.save.serialize();
      localStorage.setItem('fb_slot2', payload);
      const legacySlot = FB.save.read(2);
      const legacyExport = 'FBS1.' +
        btoa(unescape(encodeURIComponent(payload)));
      const legacyParsed = FB.save.parseExport(legacyExport);
      const fresh = FB.save.exportState();
      const freshParsed = FB.save.parseExport(fresh);
      return {
        legacySlotSeed:legacySlot && legacySlot.state.seed === startCode,
        legacyImportSeed:legacyParsed && legacyParsed.state.seed === startCode,
        freshPrefix:fresh.slice(0, 5),
        freshImportSeed:freshParsed && freshParsed.state.seed === startCode,
        freshSmaller:fresh.length * 2 < legacyExport.length
      };
    }, START_CODE)).toEqual({
      legacySlotSeed:true,
      legacyImportSeed:true,
      freshPrefix:'FBS2.',
      freshImportSeed:true,
      freshSmaller:true
    });
  });

test('save-format-3 restore lazily repairs malformed intrigue state and conduct',
  async function ({ page }, testInfo) {
    await openGame(page, testInfo);
    await startDeterministicGame(page);

    const result = await page.evaluate(function () {
      const s = FB.state;
      const me = s.chars[s.player.charId];
      me.conduct = { schemes:99, deceit:-99, cruelty:'not-a-number' };
      s.player.flags.in_prison = 1;
      s.intrigue = {
        aiSchemes:'broken',
        captives:[null, {}, { captiveId:'missing', captorId:'also-missing' },
          { captiveId:me.id, captorId:'missing' }],
        leverage:{ actorId:me.id },
        cooldowns:[],
        nextId:-9,
        startYear:'bad-year',
        startsThisYear:99,
        playerFacingStartsThisYear:99,
        hearing:'not-a-hearing',
        legalCustody:{}
      };
      const payload = JSON.parse(FB.save.serialize());
      FB.save.restore(payload);
      const restored = FB.state;
      const repaired = restored.intrigue;
      const restoredMe = restored.chars[restored.player.charId];
      return {
        incomingVersion:payload.v,
        outgoingVersion:JSON.parse(FB.save.serialize()).v,
        arrays:[
          Array.isArray(repaired.aiSchemes),
          Array.isArray(repaired.captives),
          Array.isArray(repaired.leverage)
        ],
        lengths:[repaired.aiSchemes.length, repaired.captives.length,
          repaired.leverage.length],
        cooldownObject:!!repaired.cooldowns &&
          !Array.isArray(repaired.cooldowns),
        nextId:repaired.nextId,
        startYear:repaired.startYear,
        startsThisYear:repaired.startsThisYear,
        playerFacingStartsThisYear:repaired.playerFacingStartsThisYear,
        hearing:repaired.hearing,
        legalCustody:repaired.legalCustody,
        unrelatedPrisonPreserved:!!restored.player.flags.in_prison,
        conduct:restoredMe.conduct
      };
    });

    expect(result.incomingVersion).toBe(3);
    expect(result.outgoingVersion).toBe(3);
    expect(result.arrays).toEqual([true, true, true]);
    expect(result.lengths).toEqual([0, 0, 0]);
    expect(result.cooldownObject).toBe(true);
    expect(result.nextId).toBe(1);
    expect(result.startYear).toBeNull();
    expect(result.startsThisYear).toBe(2);
    expect(result.playerFacingStartsThisYear).toBe(1);
    expect(result.hearing).toBeNull();
    expect(result.legalCustody).toBeNull();
    expect(result.unrelatedPrisonPreserved).toBe(true);
    expect(result.conduct).toEqual({ schemes:3, deceit:-3, cruelty:0 });
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

test('autosave snapshots synchronously, writes on a later task, and flushes safely',
  async function ({ page }, testInfo) {
    await openGame(page, testInfo);
    await startDeterministicGame(page);

    /* The season-boundary autosave keeps its synchronous snapshot but defers
       the write: the slot must not hold the new snapshot in the same task,
       must hold it a task later as ready plain JSON (without a full codec
       round trip), and flushPending must land it synchronously (the
       background-pause path depends on that). A second autosave before the
       write supersedes the first. */
    expect(await page.evaluate(async function (startCode) {
      FB.state.player.gold += 777;
      FB.save.autosave();
      const sync = FB.save.read('auto');
      const deferred = !sync ||
        sync.state.player.gold !== FB.state.player.gold;

      await new Promise(function (resolve) { setTimeout(resolve, 0); });
      const landed = FB.save.read('auto');
      const landedRaw = localStorage.getItem('fb_auto');

      const goldAfter = FB.state.player.gold;
      FB.state.player.gold += 1;
      FB.save.autosave();
      FB.state.player.gold += 1000;
      FB.save.autosave(); // supersedes the still-pending snapshot
      await new Promise(function (resolve) { setTimeout(resolve, 0); });
      const latest = FB.save.read('auto');

      const pagehideGold = FB.state.player.gold += 10;
      FB.save.autosave();
      window.dispatchEvent(new Event('pagehide'));
      const pagehideFlush = FB.save.read('auto');

      const directGold = FB.state.player.gold += 100;
      FB.save.autosave();
      FB.save.flushPending();
      const flushed = FB.save.read('auto');
      return {
        deferred:deferred,
        landedPlain:!!landedRaw && landedRaw.charAt(0) === '{',
        landedVersion:landed && landed.v,
        landedSeed:landed && landed.state.seed,
        superseded:!!latest && latest.state.player.gold === goldAfter + 1001,
        pagehideFlush:!!pagehideFlush &&
          pagehideFlush.state.player.gold === pagehideGold,
        flushedNow:!!flushed && flushed.state.player.gold === directGold
      };
    }, START_CODE)).toEqual({
      deferred:true,
      landedPlain:true,
      landedVersion:3,
      landedSeed:START_CODE,
      superseded:true,
      pagehideFlush:true,
      flushedNow:true
    });
  });

test('autosave compresses only when a plain write reaches storage quota',
  async function ({ page }, testInfo) {
    test.skip(testInfo.project.name !== 'chromium-served',
      'The storage encoding fallback belongs to the served-origin contract.');
    await openGame(page, testInfo);
    await startDeterministicGame(page);

    expect(await page.evaluate(function () {
      const original = Storage.prototype.setItem;
      const attempts = [];
      Storage.prototype.setItem = function (storageKey, value) {
        if (storageKey === 'fb_auto') {
          const text = String(value);
          attempts.push(text.charAt(0) === '{' ? 'plain' :
            (text.indexOf('FBC1.') === 0 ? 'compressed' : 'other'));
          if (attempts.length === 1) {
            throw new DOMException('storage is full', 'QuotaExceededError');
          }
        }
        return original.call(this, storageKey, value);
      };
      try {
        FB.state.player.gold += 4321;
        const expectedGold = FB.state.player.gold;
        FB.save.autosave();
        FB.save.flushPending();
        const raw = localStorage.getItem('fb_auto');
        const reread = FB.save.read('auto');
        return {
          attempts:attempts,
          compressed:!!raw && raw.indexOf('FBC1.') === 0,
          readable:!!reread && reread.state.player.gold === expectedGold
        };
      } finally {
        Storage.prototype.setItem = original;
      }
    })).toEqual({
      attempts:['plain', 'compressed'],
      compressed:true,
      readable:true
    });
  });
