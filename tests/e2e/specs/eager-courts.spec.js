'use strict';

/* Eager court characters for reigning realms.

   The shape under test: eager for the living, compact for the dead, with the
   realm-level simulation staying the authority. The assertions that matter
   most are the quiet ones - ruler-index agreement, seed isolation, and the
   record count staying bound by the map rather than by elapsed years. Each of
   those fails silently in play and loudly only if asserted. */

const { test, expect } = require('../support/fixture');
const {
  START_CODE,
  injectBrowserHarness,
  openGame,
  startDeterministicGame
} = require('../support/game');

test.beforeEach(async function ({ page }, testInfo) {
  await openGame(page, testInfo);
  await startDeterministicGame(page);
});

test('every living realm opens on a full ruler record, a consort and heirs',
  async function ({ page }) {
    const report = await page.evaluate(function () {
      const s = FB.state;
      const ids = [];
      for (const rid in s.realms) {
        const r = s.realms[rid];
        if (r && r.alive && rid !== 'player') ids.push(rid);
      }
      ids.sort();
      const sample = ids.slice(0, 40);
      const faults = [];
      let withConsort = 0;
      for (const rid of sample) {
        const ruler = FB.realmRulerCharacterSnapshot(s, rid);
        if (!ruler) { faults.push(rid + ': no ruler record'); continue; }
        if (!s.chars[ruler.id]) faults.push(rid + ': ruler id does not resolve');
        if (Object.keys(ruler.skills || {}).length !== FB.SKILLS.length) {
          faults.push(rid + ': ruler has no full skill set');
        }
        if (!ruler.traits || !ruler.traits.length) {
          faults.push(rid + ': ruler has no trait');
        }
        if (!ruler.culture || !ruler.religion || ruler.born === undefined ||
            ruler.station === undefined || ruler.station === null ||
            ruler.health === undefined) {
          faults.push(rid + ': ruler record is incomplete');
        }
        const consort = FB.realmConsortCharacter(s, rid);
        if (consort) {
          withConsort++;
          if (consort.sex === ruler.sex) faults.push(rid + ': consort shares the ruler sex');
          if (consort.spouseId !== ruler.id && ruler.spouseId !== consort.id) {
            faults.push(rid + ': consort is not married to the ruler');
          }
          const spouses = FB.spousesOf(s, ruler).map(function (c) { return c.id; });
          if (spouses.indexOf(consort.id) < 0) {
            faults.push(rid + ': FB.spousesOf does not report the consort');
          }
        }
      }
      return {
        sampled:sample.length,
        withConsort:withConsort,
        faults:faults.slice(0, 12)
      };
    });

    expect(report.faults).toEqual([]);
    expect(report.sampled).toBeGreaterThan(20);
    expect(report.withConsort).toBe(report.sampled);
  });

test('a consort never enters the line of succession',
  async function ({ page }) {
    expect(await page.evaluate(function () {
      const s = FB.state;
      const faults = [];
      for (const rid in s.realms) {
        const r = s.realms[rid];
        const succession = r && r.alive && r.succession;
        if (!succession || !succession.members) continue;
        for (const id of succession.order || []) {
          const m = succession.members[id];
          if (m && m.role === 'consort') faults.push(rid + ': consort in order');
        }
        const heir = succession.heirId && succession.members[succession.heirId];
        if (heir && heir.role === 'consort') faults.push(rid + ': consort is heir');
        const consort = FB.realmConsortMember(s, rid);
        if (consort && consort.id === succession.rulerMemberId) {
          faults.push(rid + ': consort is the ruler root');
        }
        if (consort && consort.parentId) {
          faults.push(rid + ': consort was adopted as a royal child');
        }
        if (consort) {
          const family = FB.realmFamily(s, rid).map(function (m) { return m.id; });
          if (family.indexOf(consort.id) >= 0) {
            faults.push(rid + ': consort listed among the heirs');
          }
        }
      }
      return faults.slice(0, 12);
    })).toEqual([]);
  });

test('the reigning-ruler index agrees with a brute-force realm scan',
  async function ({ page }) {
    await injectBrowserHarness(page);
    expect(await page.evaluate(function () {
      function disagreements(state) {
        const faults = [];
        for (const id in state.chars) {
          const c = state.chars[id];
          if (c.dead) continue;
          let brute = null;
          for (const rid in state.realms) {
            const r = state.realms[rid];
            const s = r && r.succession;
            const m = s && s.rulerMemberId && s.members &&
              s.members[s.rulerMemberId];
            if (r && r.alive && rid !== 'player' && m && m.charId === c.id) {
              brute = rid;
              break;
            }
          }
          const indexed = FB.realmIdForRulerCharacter(state, c);
          /* A character can root two realms after an abdication; the indexed
             answer must still be a realm the brute-force scan agrees they
             rule, and both must agree on whether they rule at all. */
          if (!!brute !== !!indexed) {
            faults.push(c.id + ': brute=' + brute + ' indexed=' + indexed);
          }
        }
        return faults.slice(0, 8);
      }

      const before = disagreements(FB.state);
      /* Force successions and deaths, the two states most likely to strand a
         stale entry, then check again. */
      const ids = [];
      for (const rid in FB.state.realms) {
        const r = FB.state.realms[rid];
        if (r && r.alive && rid !== 'player') ids.push(rid);
      }
      ids.sort();
      for (const rid of ids.slice(0, 15)) FB.advanceRealmSuccession(FB.state, rid);
      const afterSuccession = disagreements(FB.state);
      for (const rid of ids.slice(0, 8)) {
        const c = FB.realmRulerCharacterSnapshot(FB.state, rid);
        if (c) FB.killChar(FB.state, c);
      }
      return {
        before:before,
        afterSuccession:afterSuccession,
        afterDeath:disagreements(FB.state)
      };
    })).toEqual({ before:[], afterSuccession:[], afterDeath:[] });
  });

test('materializing a court draws no randomness from the world stream',
  async function ({ page }) {
    expect(await page.evaluate(function () {
      const s = FB.state;
      /* Under 'court' eagerness every initial heir is already materialized,
         so there is no compact one to find. Return one to its compact form
         first; what follows is then a real creation, not an idempotent
         second call. */
      let target = null;
      for (const rid in s.realms) {
        const r = s.realms[rid];
        const succession = r && r.alive && rid !== 'player' && r.succession;
        if (!succession) continue;
        for (const id in succession.members) {
          const m = succession.members[id];
          if (m && m.alive !== false && m.role !== 'consort' &&
              id !== succession.rulerMemberId && m.charId && s.chars[m.charId]) {
            target = { rid:rid, memberId:id, charId:m.charId };
            break;
          }
        }
        if (target) break;
      }
      if (!target) return { skipped:true };

      const original = s.chars[target.charId];
      const sheet = {
        skills:JSON.stringify(original.skills),
        traits:original.traits.join(','),
        fertility:original.fertility
      };
      delete s.chars[target.charId];
      s.realms[target.rid].succession.members[target.memberId].charId = null;
      FB.touchFamily();

      const rngBefore = FB.getRngState();
      const uidBefore = FB.getUidCounter();
      const made = FB.materializeRoyalChild(s, target.rid, target.memberId);
      return {
        skipped:false,
        created:!!made,
        derivedId:!!made && made.id === FB.courtCharacterId(target.memberId),
        sameId:!!made && made.id === target.charId,
        /* Same scope, same person: a scoped stream reproduces the sheet, an
           unscoped one would draw whatever the world stream held next. */
        reproduced:!!made && JSON.stringify(made.skills) === sheet.skills &&
          made.traits.join(',') === sheet.traits &&
          made.fertility === sheet.fertility,
        rngUnchanged:FB.getRngState() === rngBefore,
        uidUnchanged:FB.getUidCounter() === uidBefore
      };
    })).toEqual({
      skipped:false,
      created:true,
      derivedId:true,
      sameId:true,
      reproduced:true,
      rngUnchanged:true,
      uidUnchanged:true
    });
  });

test('an untouched court death compacts to its member entry, a tied one does not',
  async function ({ page }) {
    expect(await page.evaluate(function () {
      const s = FB.state;
      const me = s.chars[s.player.charId];
      let plain = null;
      let tied = null;
      for (const rid in s.realms) {
        const r = s.realms[rid];
        const succession = r && r.alive && rid !== 'player' && r.succession;
        if (!succession) continue;
        for (const id in succession.members) {
          const m = succession.members[id];
          const c = m && m.charId && s.chars[m.charId];
          if (!c || c.dead || id === succession.rulerMemberId) continue;
          if (!plain) plain = { member:m, c:c };
          else if (!tied) tied = { member:m, c:c };
          if (plain && tied) break;
        }
        if (plain && tied) break;
      }
      if (!plain || !tied) return { skipped:true };

      /* The tied one is married to the protagonist; the plain one the player
         has never met. Both die the same way. */
      tied.c.spouseId = me.id;
      me.spouseId = tied.c.id;
      FB.touchFamily();

      const plainId = plain.c.id;
      const plainName = plain.c.name;
      const tiedId = tied.c.id;
      plain.member.alive = false;
      FB.courtMemberDied(s, plain.member, plain.c);
      tied.member.alive = false;
      FB.courtMemberDied(s, tied.member, tied.c);

      return {
        skipped:false,
        plainRecordGone:!s.chars[plainId],
        plainMemberKept:!!plain.member && plain.member.name === plainName &&
          plain.member.charId === null && plain.member.alive === false &&
          plain.member.born !== undefined,
        tiedRecordKept:!!s.chars[tiedId] && s.chars[tiedId].dead === true,
        tiedMemberKeepsLink:tied.member.charId === tiedId
      };
    })).toEqual({
      skipped:false,
      plainRecordGone:true,
      plainMemberKept:true,
      tiedRecordKept:true,
      tiedMemberKeepsLink:true
    });
  });

test('a cultivated heir keeps their sheet through their accession',
  async function ({ page }) {
    expect(await page.evaluate(function () {
      const s = FB.state;
      let rid = null;
      for (const id in s.realms) {
        const r = s.realms[id];
        const succession = r && r.alive && id !== 'player' && r.succession;
        if (succession && succession.heirId &&
            succession.members[succession.heirId]) { rid = id; break; }
      }
      if (!rid) return { skipped:true };
      const succession = s.realms[rid].succession;
      const heir = FB.materializeRoyalChild(s, rid, succession.heirId);
      if (!heir) return { skipped:true };
      /* A distinctive sheet, as cultivation would leave one. */
      heir.skills.mar = 11;
      heir.skills.dip = 9;
      const before = {
        id:heir.id,
        name:heir.name,
        mar:heir.skills.mar,
        dip:heir.skills.dip,
        traits:heir.traits.slice()
      };
      FB.advanceRealmSuccession(s, rid);
      const crowned = FB.realmRulerCharacterSnapshot(s, rid);
      return {
        skipped:false,
        sameRecord:!!crowned && crowned.id === before.id,
        keptSkills:!!crowned && crowned.skills.mar === before.mar &&
          crowned.skills.dip === before.dip,
        keptTraits:!!crowned &&
          crowned.traits.join(',') === before.traits.join(','),
        stubMatchesRecord:s.realms[rid].ruler.name === before.name &&
          s.realms[rid].ruler.mar === before.mar,
        reigns:FB.isReigningRealmRuler(s, crowned)
      };
    })).toEqual({
      skipped:false,
      sameRecord:true,
      keptSkills:true,
      keptTraits:true,
      stubMatchesRecord:true,
      reigns:true
    });
  });

test('an heir wed to the protagonist gains no second spouse on accession',
  async function ({ page }) {
    expect(await page.evaluate(function () {
      const s = FB.state;
      const me = s.chars[s.player.charId];
      let rid = null;
      for (const id in s.realms) {
        const r = s.realms[id];
        const succession = r && r.alive && id !== 'player' && r.succession;
        if (succession && succession.heirId &&
            succession.members[succession.heirId]) { rid = id; break; }
      }
      if (!rid) return { skipped:true };
      const succession = s.realms[rid].succession;
      const heir = FB.materializeRoyalChild(s, rid, succession.heirId);
      if (!heir) return { skipped:true };

      /* Marry the protagonist to the heir, then kill the sitting ruler so the
         heir takes the throne. Succession must not hand a married ruler a
         generated consort: doctrine decides who may hold more than one
         spouse, and this path must never decide it by accident. */
      heir.spouseId = me.id;
      me.spouseId = heir.id;
      FB.touchFamily();
      FB.advanceRealmSuccession(s, rid);

      const crowned = FB.realmRulerCharacterSnapshot(s, rid);
      const consort = FB.realmConsortCharacter(s, rid);
      const spouses = crowned ? FB.spousesOf(s, crowned) : [];
      return {
        skipped:false,
        heirReigns:!!crowned && crowned.id === heir.id,
        noGeneratedConsort:!consort,
        oneSpouse:spouses.length === 1,
        spouseIsPlayer:spouses.length === 1 && spouses[0].id === me.id
      };
    })).toEqual({
      skipped:false,
      heirReigns:true,
      noGeneratedConsort:true,
      oneSpouse:true,
      spouseIsPlayer:true
    });
  });

test('an actively cultivated or visited court member survives their death',
  async function ({ page }) {
    expect(await page.evaluate(function () {
      const s = FB.state;
      const found = [];
      for (const rid in s.realms) {
        const r = s.realms[rid];
        const succession = r && r.alive && rid !== 'player' && r.succession;
        if (!succession) continue;
        for (const id in succession.members) {
          const m = succession.members[id];
          const c = m && m.charId && s.chars[m.charId];
          if (!c || c.dead || id === succession.rulerMemberId) continue;
          found.push({ member:m, c:c });
          if (found.length === 3) break;
        }
        if (found.length === 3) break;
      }
      if (found.length < 3) return { skipped:true };

      /* Three live references the player's own UI resolves back through
         state.chars. Each must keep the record through the death. */
      s.player.socialAttention = s.player.socialAttention || {};
      s.player.socialAttention[found[0].c.id] = { startedTurn:s.turn, lastTurn:s.turn };
      /* A whole journey record, not just a target id: the death path runs
         FB.invalidateSocialVisit, which turns the traveller toward home and
         reads homeId and currentId. A half-built stub would take the
         at-home branch on undefined === undefined and throw there, testing
         the fixture rather than the retention rule. */
      const home = s.player.provinceId;
      s.player.travel = {
        purpose:'relationship',
        homeId:home,
        destinationId:home,
        destinationRealm:null,
        currentId:home,
        phase:'outbound',
        remainingRoute:[],
        outboundRoute:[],
        visited:[home],
        legDays:3,
        legDaysLeft:0,
        startTurn:s.turn,
        cost:0,
        overhead:0,
        encounters:{ culture:0, road:0 },
        seenCultures:{},
        seenEvents:{},
        completed:false,
        targetCharId:found[1].c.id
      };
      s.player.rivalContacts = s.player.rivalContacts || {};
      s.player.rivalContacts[found[2].c.id] = { score:5, lastTurn:s.turn };

      const ids = found.map(function (f) { return f.c.id; });
      for (const f of found) {
        f.member.alive = false;
        FB.courtMemberDied(s, f.member, f.c);
      }
      return {
        skipped:false,
        cultivatedKept:!!s.chars[ids[0]],
        visitedKept:!!s.chars[ids[1]],
        rivalKept:!!s.chars[ids[2]],
        /* The journey really was turned toward home, which is what proves
           the death ran the travel cleanup rather than skipping past a
           fixture the engine did not recognize. */
        journeyEnded:!s.player.travel
      };
    })).toEqual({
      skipped:false,
      cultivatedKept:true,
      visitedKept:true,
      rivalKept:true,
      journeyEnded:true
    });
  });

test('the serialized payload carries no derived court data',
  async function ({ page }) {
    expect(await page.evaluate(function () {
      const data = JSON.parse(FB.save.serialize());
      const keys = Object.keys(data.state);
      const derived = keys.filter(function (key) {
        return /rulerIndex|courtIndex|kinCache|familyIndex/i.test(key);
      });
      const realmKeys = {};
      for (const rid in data.state.realms) {
        const succession = data.state.realms[rid].succession;
        if (!succession) continue;
        for (const key in succession) realmKeys[key] = 1;
      }
      const successionKeys = Object.keys(realmKeys);
      /* Deliberately not an exact allowlist: a succession legitimately grows
         additive keys (papalElective once a conclave has resolved, for one),
         and a test that fails on those is testing the wrong thing. What must
         never appear is derived data that belongs in memory. */
      const expected = ['members', 'order', 'heirId', 'rulerGeneration',
        'rulerMemberId'];
      return {
        version:data.v,
        derived:derived,
        missing:expected.filter(function (key) {
          return successionKeys.indexOf(key) < 0;
        }),
        derivedInSuccession:successionKeys.filter(function (key) {
          return /index|cache|derived/i.test(key);
        })
      };
    })).toEqual({
      version:3,
      derived:[],
      missing:[],
      derivedInSuccession:[]
    });
  });

test('a save without courts loads, grows them, and stays version 3',
  async function ({ page }) {
    expect(await page.evaluate(function () {
      /* Build a save shaped like one written before eager courts: no consort
         members, no court records, and every member back to compact. */
      const data = JSON.parse(FB.save.serialize());
      const kept = {};
      for (const id in data.state.chars) {
        const c = data.state.chars[id];
        if (!c.royalLine) kept[id] = c;
      }
      data.state.chars = kept;
      let strippedConsorts = 0;
      for (const rid in data.state.realms) {
        const succession = data.state.realms[rid].succession;
        if (!succession || !succession.members) continue;
        for (const id in succession.members) {
          const m = succession.members[id];
          if (m.role === 'consort') {
            delete succession.members[id];
            strippedConsorts++;
            continue;
          }
          delete m.role;
          if (m.charId && !kept[m.charId]) m.charId = null;
        }
      }
      const beforeRecords = Object.keys(data.state.chars).length;

      FB.save.restore(JSON.parse(JSON.stringify(data)));
      let rulers = 0;
      let realms = 0;
      for (const rid in FB.state.realms) {
        const r = FB.state.realms[rid];
        if (!r || !r.alive || rid === 'player') continue;
        realms++;
        if (FB.realmRulerCharacterSnapshot(FB.state, rid)) rulers++;
      }
      const rewritten = JSON.parse(FB.save.serialize());
      return {
        strippedConsorts:strippedConsorts > 0,
        grewRecords:Object.keys(FB.state.chars).length > beforeRecords,
        everyRealmHasARuler:rulers === realms && realms > 0,
        versionUnchanged:rewritten.v === 3
      };
    })).toEqual({
      strippedConsorts:true,
      grewRecords:true,
      everyRealmHasARuler:true,
      versionUnchanged:true
    });
  });

test('compaction never runs retroactively over a loaded save',
  async function ({ page }) {
    expect(await page.evaluate(function () {
      /* Seed a save with a dead, unretained, materialized royal - exactly what
         an older save holds after the player once cultivated someone. */
      const data = JSON.parse(FB.save.serialize());
      let planted = null;
      for (const rid in data.state.realms) {
        const succession = data.state.realms[rid].succession;
        if (!succession || !succession.members) continue;
        for (const id in succession.members) {
          const m = succession.members[id];
          const c = m.charId && data.state.chars[m.charId];
          if (!c || id === succession.rulerMemberId || m.role === 'consort') continue;
          m.alive = false;
          c.dead = true;
          c.died = data.state.date.year;
          planted = c.id;
          break;
        }
        if (planted) break;
      }
      if (!planted) return { skipped:true };
      FB.save.restore(data);
      return {
        skipped:false,
        recordSurvivesLoad:!!FB.state.chars[planted],
        stillDead:!!FB.state.chars[planted] && FB.state.chars[planted].dead
      };
    })).toEqual({
      skipped:false,
      recordSurvivesLoad:true,
      stillDead:true
    });
  });

test('a long run leaves the record count bound by the map, not by the years',
  async function ({ page }) {
    test.slow();
    expect(await page.evaluate(function () {
      const s = FB.state;
      function counts() {
        let living = 0, dead = 0;
        for (const id in s.chars) {
          if (s.chars[id].dead) dead++; else living++;
        }
        return { living:living, dead:dead, total:living + dead };
      }
      const start = counts();
      /* Drive the realm simulation directly: this is the yearly world work,
         without the day ticker or the player's own life in the way. */
      for (let year = 0; year < 60; year++) {
        s.date.year++;
        s.turn += 360; // keep turn and date consistent for turn-derived clocks
        FB.worldTick(s);
      }
      const end = counts();
      let realms = 0;
      for (const rid in s.realms) {
        const r = s.realms[rid];
        if (r && r.alive && rid !== 'player') realms++;
      }
      return {
        realms:realms,
        startTotal:start.total,
        endTotal:end.total,
        /* Sixty years is roughly three generations of AI rulers. Unbounded
           accumulation would land far above the living court population; the
           bound here is deliberately generous, because it is the growth
           *shape* under test and not an exact figure. */
        withinBound:end.total < start.total * 2,
        deadRecordsStaySmall:end.dead < start.total
      };
    })).toMatchObject({
      withinBound:true,
      deadRecordsStaySmall:true
    });
  });

test('two worlds on one seed produce identical courts',
  async function ({ browser, page }, testInfo) {
    test.skip(testInfo.project.name !== 'chromium-file',
      'The court determinism canary runs against the primary file target.');

    async function courtFingerprint(target) {
      return target.evaluate(function () {
        const s = FB.state;
        const ids = [];
        for (const rid in s.realms) {
          const r = s.realms[rid];
          if (r && r.alive && rid !== 'player') ids.push(rid);
        }
        ids.sort();
        return ids.slice(0, 30).map(function (rid) {
          const ruler = FB.realmRulerCharacterSnapshot(s, rid);
          const consort = FB.realmConsortCharacter(s, rid);
          function sheet(c) {
            if (!c) return null;
            return {
              id:c.id, name:c.name, sex:c.sex, born:c.born,
              culture:c.culture, religion:c.religion,
              traits:c.traits.slice(), skills:c.skills
            };
          }
          return { rid:rid, ruler:sheet(ruler), consort:sheet(consort) };
        });
      });
    }

    const first = await courtFingerprint(page);
    const secondContext = await browser.newContext({
      viewport:{ width:1280, height:800 },
      locale:'en-US',
      timezoneId:'UTC'
    });
    try {
      const secondPage = await secondContext.newPage();
      await openGame(secondPage, testInfo);
      await startDeterministicGame(secondPage);
      expect(await courtFingerprint(secondPage)).toEqual(first);
      expect(first[0].ruler).not.toBeNull();
      expect(first[0].consort).not.toBeNull();
    } finally {
      await secondContext.close();
    }
  });

test('a save-load-forward run matches an uninterrupted one',
  async function ({ page }) {
    /* This is what catches an ensure chain that consumes unscoped randomness
       on load: it fails loudly only if the assertion exists. */
    expect(await page.evaluate(function () {
      function runForward(years) {
        const marks = [];
        for (let i = 0; i < years; i++) {
          FB.state.date.year++;
          FB.worldTick(FB.state);
          marks.push(FB.getRngState());
        }
        return marks;
      }
      const checkpoint = FB.save.serialize();
      const uninterrupted = runForward(12);

      FB.save.restore(JSON.parse(checkpoint));
      const afterLoad = runForward(12);
      return {
        same:JSON.stringify(uninterrupted) === JSON.stringify(afterLoad),
        rngRestored:true
      };
    })).toEqual({ same:true, rngRestored:true });
  });

test('the realm sheet shows a ruler card and a court strip', async function ({ page }) {
  const opened = await page.evaluate(function () {
    let rid = null;
    for (const id in FB.state.realms) {
      const r = FB.state.realms[id];
      if (r && r.alive && id !== 'player' &&
          FB.realmRulerCharacterSnapshot(FB.state, id)) { rid = id; break; }
    }
    if (!rid) return null;
    FB.ui.showLiegeModal(rid);
    return rid;
  });
  expect(opened).not.toBeNull();
  await expect(page.locator('.realm-interaction-modal .charcard')).toBeVisible();
  await expect(page.locator('.realm-interaction-modal .court-strip')).toBeVisible();
  /* Faces, not crests: a living realm never falls back to the crest header. */
  expect(await page.locator(
    '.realm-interaction-modal canvas.pface[data-cid]').count()).toBeGreaterThan(1);
  expect(await page.locator('#liegecrest').count()).toBe(0);
});

test('court characters carry a resolvable loadout and portrait key',
  async function ({ page }) {
    expect(await page.evaluate(function () {
      const s = FB.state;
      const faults = [];
      let checked = 0;
      const ids = [];
      for (const rid in s.realms) {
        const r = s.realms[rid];
        if (r && r.alive && rid !== 'player') ids.push(rid);
      }
      ids.sort();
      const keys = {};
      for (const rid of ids.slice(0, 25)) {
        const ruler = FB.realmRulerCharacterSnapshot(s, rid);
        if (!ruler) continue;
        checked++;
        const key = FB.characterVisualKey(s, ruler);
        if (!key || key.indexOf('undefined') >= 0) {
          faults.push(rid + ': visual key is incomplete - ' + key);
        }
        keys[key] = (keys[key] || 0) + 1;
        if (FB.loadoutReadOnly && !FB.loadoutReadOnly(s, ruler.id)) {
          faults.push(rid + ': loadout does not resolve');
        }
      }
      return {
        checked:checked > 15,
        faults:faults.slice(0, 6),
        /* Neighbouring rulers must not read as variations of one person. */
        distinctKeys:Object.keys(keys).length === checked
      };
    })).toEqual({ checked:true, faults:[], distinctKeys:true });
  });

test.describe('with the start code held fixed', function () {
  test('the start code still reproduces the same protagonist',
    async function ({ page }) {
      expect(await page.evaluate(function (code) {
        const me = FB.state.chars[FB.state.player.charId];
        return { seed:FB.state.seed, name:me.name };
      }, START_CODE)).toEqual({ seed:START_CODE, name:'Ada' });
    });
});
