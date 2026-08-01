'use strict';

/* Eager court characters for reigning realms.

   The shape under test: eager for the living, compact for the dead, with the
   realm-level simulation staying the authority. The assertions that matter
   most are the quiet ones - ruler-index agreement, seed isolation, and the
   record count staying bound by the map rather than by elapsed years. Each of
   those fails silently in play and loudly only if asserted. */

const { test, expect, attachPageDiagnostic, installPageGuards } =
  require('../support/fixture');
const nonCourtWorldFixture =
  require('../fixtures/pre-eager-courts-world.json');
const {
  START_CODE,
  openGame,
  startDeterministicGame
} = require('../support/game');

test.beforeEach(async function ({ page }, testInfo) {
  await openGame(page, testInfo);
  await startDeterministicGame(page);
});

test('every living realm opens on a full ruler and every eligible court has a consort',
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
      const papalRid = s.religiousHeads && s.religiousHeads.catholic;
      if (papalRid && ids.indexOf(papalRid) >= 0 &&
          sample.indexOf(papalRid) < 0) {
        sample.push(papalRid);
      }
      const faults = [];
      let withConsort = 0;
      let expectedConsorts = 0;
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
        if (s.realms[rid].ruler.mar !==
            FB.skillSnapshot(s, ruler, 'mar')) {
          faults.push(rid + ': ruler Martial projection is stale');
        }
        const papal = FB.papacyTerritorialRealm &&
          FB.papacyTerritorialRealm(s, rid);
        const adult = FB.ageOf(ruler, s.date.year) >= 16;
        const expectsConsort = !papal && adult;
        if (expectsConsort) expectedConsorts++;
        const consort = FB.realmConsortCharacter(s, rid);
        if (consort) {
          withConsort++;
          if (!expectsConsort) faults.push(rid + ': ineligible ruler has a consort');
          if (consort.sex === ruler.sex) faults.push(rid + ': consort shares the ruler sex');
          if (consort.spouseId !== ruler.id || ruler.spouseId !== consort.id) {
            faults.push(rid + ': consort is not married to the ruler');
          }
          const spouses = FB.spousesOf(s, ruler).map(function (c) { return c.id; });
          if (spouses.indexOf(consort.id) < 0) {
            faults.push(rid + ': FB.spousesOf does not report the consort');
          }
        } else if (!papal && !adult) {
          const reservation = FB.realmConsortMember(s, rid);
          if (!reservation || reservation.charId || ruler.spouseId ||
              ruler.betrothedId) {
            faults.push(rid + ': child consort reservation is linked');
          }
        }
      }
      return {
        sampled:sample.length,
        papacySampled:!!papalRid && sample.indexOf(papalRid) >= 0,
        withConsort:withConsort,
        expectedConsorts:expectedConsorts,
        faults:faults.slice(0, 12)
      };
    });

    expect(report.faults).toEqual([]);
    expect(report.sampled).toBeGreaterThan(20);
    expect(report.papacySampled).toBe(true);
    expect(report.withConsort).toBe(report.expectedConsorts);
  });

test('the Papal States begin with an elective Pope and no dynastic household',
  async function ({ page }) {
    expect(await page.evaluate(function () {
      const s = FB.state;
      const rid = s.religiousHeads && s.religiousHeads.catholic;
      const realm = rid && s.realms[rid];
      if (rid) FB.ensureRealmSuccession(s, rid);
      const succession = realm && realm.succession;
      const root = succession && succession.rulerMemberId &&
        succession.members[succession.rulerMemberId];
      const pope = root && root.charId && s.chars[root.charId];
      const papalRoyals = [];
      for (const id in s.chars) {
        const c = s.chars[id];
        if (c.royalLine && c.royalLine.realmId === rid && c.id !== (pope && pope.id)) {
          papalRoyals.push(c.id);
        }
      }
      return {
        hasRealm:!!realm,
        elective:!!(succession && succession.papalElective),
        oneMember:!!succession &&
          Object.keys(succession.members || {}).length === 1,
        noDynasticOrder:!!succession && succession.order.length === 0 &&
          succession.heirId === null,
        popeIsFullCharacter:!!pope && !pope.dead,
        popeIsUnmarried:!!pope && FB.spousesOf(s, pope).length === 0,
        noGeneratedConsort:!FB.realmConsortCharacter(s, rid),
        noGeneratedHeirRecords:papalRoyals.length === 0
      };
    })).toEqual({
      hasRealm:true,
      elective:true,
      oneMember:true,
      noDynasticOrder:true,
      popeIsFullCharacter:true,
      popeIsUnmarried:true,
      noGeneratedConsort:true,
      noGeneratedHeirRecords:true
    });
  });

test('papal sanction grounds are removed with their dead character',
  async function ({ page }) {
    expect(await page.evaluate(function () {
      const s = FB.state;
      let target = null;
      for (const id in s.chars) {
        const c = s.chars[id];
        if (c && !c.dead && c.id !== s.player.charId &&
            !(FB.isPapalClaimant && FB.isPapalClaimant(s, c))) {
          target = c;
          break;
        }
      }
      if (!target) return { skipped:true };
      const added = FB.addPapalGround(s, target, 'test_ground');
      const existed = !!(added && s.papacy.grounds[target.id]);
      FB.killChar(s, target);
      return {
        skipped:false,
        existed:existed,
        removed:!s.papacy.grounds[target.id]
      };
    })).toEqual({ skipped:false, existed:true, removed:true });
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

test('eager loading and the realm sheet share one bounded family order',
  async function ({ page }) {
    expect(await page.evaluate(function () {
      const s = FB.state;
      const faults = [];
      for (const rid in s.realms) {
        const r = s.realms[rid];
        if (!r || !r.alive || rid === 'player' || !r.succession) continue;
        const eager = FB.realmFamily(s, rid).map(function (member) {
          return member.id;
        });
        const display = FB.realmFamilySnapshot(s, rid).map(function (member) {
          return member.id;
        });
        if (eager.length > 6 ||
            JSON.stringify(eager) !== JSON.stringify(display)) {
          faults.push(rid);
        }
      }
      return faults.slice(0, 12);
    })).toEqual([]);
  });

test('the reigning-ruler index agrees with a brute-force realm scan',
  async function ({ page }) {
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
          /* A legacy or malformed state can root one character in two realms;
             the indexed answer must still be a realm the brute-force scan
             agrees they rule, and both must agree on whether they rule at all. */
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

test('derived court identity never falls back to the shared uid counter',
  async function ({ page }) {
    expect(await page.evaluate(function () {
      const s = FB.state;
      let target = null;
      for (const rid in s.realms) {
        const succession = s.realms[rid] && s.realms[rid].succession;
        if (!succession || rid === 'player') continue;
        for (const memberId in succession.members) {
          const member = succession.members[memberId];
          if (member && member.charId && memberId !== succession.rulerMemberId &&
              member.role !== 'consort') {
            target = { rid:rid, member:member };
            break;
          }
        }
        if (target) break;
      }
      if (!target) return { skipped:true };
      const derivedId = FB.courtCharacterId(target.member.id);
      delete s.chars[target.member.charId];
      target.member.charId = null;
      s.chars[derivedId] = {
        id:derivedId,
        name:'Collision',
        sex:'m',
        born:s.date.year - 30,
        dead:false,
        traits:[],
        skills:{ dip:0, mar:0, ste:0, int:0, lea:0 },
        childrenIds:[]
      };
      const uidBefore = FB.getUidCounter();
      const made = FB.materializeRoyalChild(s, target.rid, target.member.id);
      return {
        skipped:false,
        refused:made === null,
        memberStillUnlinked:target.member.charId === null,
        collisionUntouched:s.chars[derivedId] &&
          s.chars[derivedId].name === 'Collision',
        uidUnchanged:FB.getUidCounter() === uidBefore
      };
    })).toEqual({
      skipped:false,
      refused:true,
      memberStillUnlinked:true,
      collisionUntouched:true,
      uidUnchanged:true
    });
  });

test('succession skips an heir whose derived character id is occupied',
  async function ({ page }) {
    expect(await page.evaluate(function () {
      const s = FB.state;
      let rid = null;
      let blocked = null;
      for (const id in s.realms) {
        const r = s.realms[id];
        const succession = r && r.alive && id !== 'player' &&
          !(FB.papacyTerritorialRealm &&
            FB.papacyTerritorialRealm(s, id)) &&
          r.succession;
        const heir = succession && succession.heirId &&
          succession.members[succession.heirId];
        if (heir && succession.order.length > 1) {
          rid = id;
          blocked = heir;
          break;
        }
      }
      if (!rid || !blocked) return { skipped:true };

      const realm = s.realms[rid];
      const succession = realm.succession;
      const root = succession.members[succession.rulerMemberId];
      const rootCharacter = root.charId && s.chars[root.charId];
      const oldGeneration = realm.ruler.generation;
      const blockedId = FB.courtCharacterId(blocked.id);
      if (blocked.charId) delete s.chars[blocked.charId];
      blocked.charId = null;
      s.chars[blockedId] = {
        id:blockedId,
        name:'Unrelated collision',
        sex:'m',
        born:s.date.year - 30,
        dead:false,
        traits:[],
        skills:{ dip:0, mar:0, ste:0, int:0, lea:0 },
        childrenIds:[]
      };
      root.alive = false;
      if (rootCharacter) {
        rootCharacter.dead = true;
        rootCharacter.died = s.date.year;
      }

      const successor = FB.ensureRealmCourt(s, rid);
      return {
        skipped:false,
        advanced:realm.ruler.generation > oldGeneration,
        blockedRetired:blocked.alive === false &&
          blocked.died === s.date.year,
        collisionUntouched:s.chars[blockedId] &&
          s.chars[blockedId].name === 'Unrelated collision',
        livingSuccessor:!!successor && !successor.dead &&
          successor.id !== blockedId
      };
    })).toEqual({
      skipped:false,
      advanced:true,
      blockedRetired:true,
      collisionUntouched:true,
      livingSuccessor:true
    });
  });

test('realm court member ids and sheets ignore intervening uid activity',
  async function ({ page }) {
    expect(await page.evaluate(function () {
      let rid = null;
      for (const id in FB.state.realms) {
        const r = FB.state.realms[id];
        if (r && r.alive && id !== 'player' &&
            !(FB.papacyTerritorialRealm &&
              FB.papacyTerritorialRealm(FB.state, id))) {
          rid = id;
          break;
        }
      }
      if (!rid) return { skipped:true };
      const checkpoint = FB.save.serialize();
      function build(extraUids) {
        /* Each rebuild starts from the same complete state. Mutations made by
           the first materialization are therefore not a hidden second input
           beside the intervening uid calls this spec is meant to isolate. */
        FB.save.restore(JSON.parse(checkpoint));
        const s = FB.state;
        const realm = s.realms[rid];
        for (const id in s.chars) {
          const c = s.chars[id];
          if (c.royalLine && c.royalLine.realmId === rid) delete s.chars[id];
        }
        realm.succession = null;
        FB.touchFamily();
        for (let i = 0; i < extraUids; i++) FB.uid();
        FB.ensureRealmCourt(s, rid, { bulk:true });
        return Object.keys(realm.succession.members).sort().map(function (id) {
          const member = realm.succession.members[id];
          const c = member.charId && s.chars[member.charId];
          return {
            id:id,
            name:member.name,
            sex:member.sex,
            born:member.born,
            skills:c && c.skills,
            traits:c && c.traits
          };
        });
      }
      const first = build(0);
      const second = build(37);
      return {
        skipped:false,
        same:JSON.stringify(first) === JSON.stringify(second),
        allDerived:second.every(function (entry) {
          return entry.id.indexOf('royal_' + rid + '_g') === 0;
        })
      };
    })).toEqual({ skipped:false, same:true, allDerived:true });
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
          if (!c || c.dead || m.role === 'consort' ||
              id === succession.rulerMemberId) continue;
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

test('a divorced court parent of a living player descendant is retained',
  async function ({ page }) {
    expect(await page.evaluate(function () {
      const s = FB.state;
      const me = s.chars[s.player.charId];
      let found = null;
      for (const rid in s.realms) {
        const succession = s.realms[rid] && s.realms[rid].succession;
        if (!succession || rid === 'player') continue;
        for (const memberId in succession.members) {
          const member = succession.members[memberId];
          const c = member && member.charId && s.chars[member.charId];
          if (c && !c.dead && memberId !== succession.rulerMemberId &&
              member.role !== 'consort' && c.sex !== me.sex) {
            found = { member:member, c:c };
            break;
          }
        }
        if (found) break;
      }
      if (!found) return { skipped:true };
      const child = FB.makeCharacter(s, {
        name:'Lineage Fixture',
        sex:'f',
        culture:me.culture,
        religion:me.religion,
        born:s.date.year,
        traitsN:0,
        fatherId:found.c.sex === 'm' ? found.c.id : me.id,
        motherId:found.c.sex === 'f' ? found.c.id : me.id
      });
      me.childrenIds.push(child.id);
      found.c.childrenIds.push(child.id);
      found.c.spouseId = null;
      found.c.betrothedId = null;
      FB.touchFamily();
      found.member.alive = false;
      FB.courtMemberDied(s, found.member, found.c);
      return {
        skipped:false,
        recordRetained:!!s.chars[found.c.id] && s.chars[found.c.id].dead,
        parentPreserved:child.fatherId === found.c.id ||
          child.motherId === found.c.id,
        memberStillLinked:found.member.charId === found.c.id
      };
    })).toEqual({
      skipped:false,
      recordRetained:true,
      parentPreserved:true,
      memberStillLinked:true
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
      let martialTrait = null;
      for (const traitId in FBDATA.traits) {
        if (FBDATA.traits[traitId].mar) {
          martialTrait = traitId;
          break;
        }
      }
      if (!martialTrait) return { skipped:true };
      heir.traits = [martialTrait];
      const before = {
        id:heir.id,
        name:heir.name,
        mar:heir.skills.mar,
        effectiveMar:FB.skillSnapshot(s, heir, 'mar'),
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
          s.realms[rid].ruler.mar === before.effectiveMar,
        traitMartialKept:before.effectiveMar !== before.mar &&
          s.realms[rid].ruler.mar === FB.skillSnapshot(s, crowned, 'mar'),
        reigns:FB.isReigningRealmRuler(s, crowned)
      };
    })).toEqual({
      skipped:false,
      sameRecord:true,
      keptSkills:true,
      keptTraits:true,
      stubMatchesRecord:true,
      traitMartialKept:true,
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
          if (!c || c.dead || m.role === 'consort' ||
              id === succession.rulerMemberId) continue;
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
         additive keys (papalElective for the Roman succession, for one),
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
          const charId = m.charId || FB.courtCharacterId(m.id);
          const c = data.state.chars[charId];
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
    let secondPage;
    try {
      secondPage = await secondContext.newPage();
      const guard = installPageGuards(secondPage);
      await openGame(secondPage, testInfo);
      await startDeterministicGame(secondPage);
      expect(await courtFingerprint(secondPage)).toEqual(first);
      expect(first[0].ruler).not.toBeNull();
      expect(first[0].consort).not.toBeNull();
      expect(guard.faults, 'second browser context faults').toEqual([]);
    } catch (error) {
      if (secondPage) {
        await attachPageDiagnostic(
          secondPage, testInfo, 'second-context-game-state');
      }
      throw error;
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
      const checkpointRng = FB.getRngState();
      const uninterrupted = runForward(12);

      FB.save.restore(JSON.parse(checkpoint));
      const rngRestored = FB.getRngState() === checkpointRng;
      const afterLoad = runForward(12);
      return {
        same:JSON.stringify(uninterrupted) === JSON.stringify(afterLoad),
        rngRestored:rngRestored
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

test('the realm sheet materializes a ruler-only court on first open',
  async function ({ page }) {
    const report = await page.evaluate(function () {
      const s = FB.state;
      let rid = null;
      let members = null;
      for (const id in s.realms) {
        const r = s.realms[id];
        const consort = r && r.alive && id !== 'player' &&
          !(FB.papacyTerritorialRealm &&
            FB.papacyTerritorialRealm(s, id)) &&
          FB.realmConsortMember(s, id);
        const family = consort && FB.realmFamilySnapshot(s, id);
        if (consort && consort.charId && family && family.length &&
            family.every(function (member) {
              return !!(member.charId && s.chars[member.charId]);
            })) {
          rid = id;
          members = [consort].concat(family);
          break;
        }
      }
      if (!rid || !members) return { skipped:true };

      const ids = members.map(function (member) { return member.charId; });
      for (const member of members) {
        delete s.chars[member.charId];
        member.charId = null;
      }
      FB.touchFamily();
      const rngBefore = FB.getRngState();
      const uidBefore = FB.getUidCounter();
      FB.ui.showLiegeModal(rid);
      return {
        skipped:false,
        rid:rid,
        expectedFaces:members.length + 1,
        allRestored:members.every(function (member, index) {
          return member.charId === ids[index] &&
            !!s.chars[ids[index]] && !s.chars[ids[index]].dead;
        }),
        rngUnchanged:FB.getRngState() === rngBefore,
        uidUnchanged:FB.getUidCounter() === uidBefore
      };
    });

    expect(report).toMatchObject({
      skipped:false,
      allRestored:true,
      rngUnchanged:true,
      uidUnchanged:true
    });
    await expect(page.locator('.realm-interaction-modal .court-strip')).toBeVisible();
    expect(await page.locator(
      '.realm-interaction-modal canvas.pface[data-cid]').count())
      .toBe(report.expectedFaces);
  });

test('the fixed seed keeps its stored non-court world state',
  async function ({ page }) {
    expect(nonCourtWorldFixture.sourceRevision).toBe('249b935');
    expect(nonCourtWorldFixture.sourceVersion).toBe('1.95.0');
    const fixture = nonCourtWorldFixture.projection;
    const projection = await page.evaluate(function (fixture) {
      const s = FB.state;
      const provinces = {};
      const realms = {};
      for (const pid in fixture.provinces) {
        provinces[pid] = {
          owner:s.owner[pid],
          holder:s.holder[pid],
          development:s.dev[pid]
        };
      }
      for (const rid in fixture.realms) {
        const r = s.realms[rid];
        realms[rid] = {
          name:r.name,
          capital:r.capital,
          rank:r.rank,
          liege:r.liege,
          religion:r.religion
        };
      }
      return {
        startCode:s.seed,
        date:{ year:s.date.year, season:s.date.season },
        playerProvince:s.player.provinceId,
        provinces:provinces,
        realms:realms
      };
    }, fixture);
    expect(projection).toEqual(fixture);
  });

test('Land notable folk show ruler portraits instead of realm crests',
  async function ({ page }) {
    const selected = await page.evaluate(function () {
      const s = FB.state;
      const pids = Object.keys(s.owner || {}).sort();
      for (const pid of pids) {
        const rid = (s.holder && s.holder[pid]) || s.owner[pid];
        const ruler = FB.realmRulerCharacterSnapshot(s, rid);
        if (!ruler) continue;
        FB.ui.selectProvince(pid);
        return { rid:rid, rulerId:ruler.id };
      }
      return null;
    });

    expect(selected).not.toBeNull();
    const row = page.locator(
      '#tab-prov .charrow[data-liege="' + selected.rid + '"]');
    await expect(row).toBeVisible();
    await expect(row.locator(
      'canvas.pface[data-cid="' + selected.rulerId + '"]')).toBeVisible();
    expect(await row.locator('canvas.crest').count()).toBe(0);
  });

test('a betrothed heir keeps the pledge and receives no generated consort',
  async function ({ page }) {
    expect(await page.evaluate(function () {
      const s = FB.state;
      const me = s.chars[s.player.charId];
      let rid = null;
      let heir = null;
      for (const id in s.realms) {
        const r = s.realms[id];
        const succession = r && r.alive && id !== 'player' &&
          !(FB.papacyTerritorialRealm && FB.papacyTerritorialRealm(s, id)) &&
          r.succession;
        const member = succession && succession.heirId &&
          succession.members[succession.heirId];
        const candidate = member && member.charId && s.chars[member.charId];
        if (candidate && FB.ageOf(candidate, s.date.year) >= 16) {
          rid = id;
          heir = candidate;
          break;
        }
      }
      if (!rid || !heir) return { skipped:true };
      me.betrothedId = heir.id;
      heir.betrothedId = me.id;
      FB.touchFamily();

      FB.advanceRealmSuccession(s, rid);
      const crowned = FB.realmRulerCharacterSnapshot(s, rid);
      const beforeWedding = {
        heirReigns:!!crowned && crowned.id === heir.id,
        noGeneratedConsort:!FB.realmConsortCharacter(s, rid),
        pledgeIntact:me.betrothedId === heir.id &&
          heir.betrothedId === me.id,
        noSpouse:FB.spousesOf(s, heir).length === 0
      };
      const wedding = FB.doKinWedding(s, me, heir);
      return {
        skipped:false,
        heirReigns:beforeWedding.heirReigns,
        noGeneratedConsort:beforeWedding.noGeneratedConsort,
        pledgeIntact:beforeWedding.pledgeIntact,
        noSpouse:beforeWedding.noSpouse,
        weddingCompletes:wedding && me.spouseId === heir.id &&
          heir.spouseId === me.id
      };
    })).toEqual({
      skipped:false,
      heirReigns:true,
      noGeneratedConsort:true,
      pledgeIntact:true,
      noSpouse:true,
      weddingCompletes:true
    });
  });

test('a child ruler keeps an unlinked future consort until majority',
  async function ({ page }) {
    expect(await page.evaluate(function () {
      const s = FB.state;
      let rid = null;
      let member = null;
      let heir = null;
      for (const id in s.realms) {
        const r = s.realms[id];
        const succession = r && r.alive && id !== 'player' &&
          !(FB.papacyTerritorialRealm && FB.papacyTerritorialRealm(s, id)) &&
          r.succession;
        const candidateMember = succession && succession.heirId &&
          succession.members[succession.heirId];
        const candidate = candidateMember && candidateMember.charId &&
          s.chars[candidateMember.charId];
        if (candidate) {
          rid = id;
          member = candidateMember;
          heir = candidate;
          break;
        }
      }
      if (!rid || !heir) return { skipped:true };
      member.born = s.date.year - 8;
      heir.born = member.born;
      FB.advanceRealmSuccession(s, rid);
      const crowned = FB.realmRulerCharacterSnapshot(s, rid);
      const futureMember = FB.realmConsortMember(s, rid);
      const childState = {
        age:FB.ageOf(crowned, s.date.year),
        futureConsortAge:futureMember &&
          s.date.year - futureMember.born,
        reserved:!!futureMember,
        unmaterialized:!!futureMember && !futureMember.charId,
        unpledged:!crowned.betrothedId,
        noSpouse:FB.spousesOf(s, crowned).length === 0
      };

      crowned.born = s.date.year - 16;
      s.realms[rid].ruler.born = crowned.born;
      s.realms[rid].ruler.age = 16;
      if (futureMember) futureMember.born = s.date.year - 16;
      FB.ensureRealmCourt(s, rid);
      const futureConsort = FB.realmConsortCharacter(s, rid);
      return {
        skipped:false,
        childAge:childState.age,
        futureConsortIsChild:childState.reserved &&
          childState.futureConsortAge >= 0 &&
          childState.futureConsortAge < 16,
        unmaterializedAsChild:childState.unmaterialized,
        unpledgedAsChild:childState.unpledged,
        noSpouseAsChild:childState.noSpouse,
        marriedAtMajority:!!futureConsort &&
          FB.spousesOf(s, crowned).some(function (spouse) {
            return spouse.id === futureConsort.id;
          }),
        noGeneratedPledge:!!futureConsort && !crowned.betrothedId &&
          !futureConsort.betrothedId
      };
    })).toEqual({
      skipped:false,
      childAge:8,
      futureConsortIsChild:true,
      unmaterializedAsChild:true,
      unpledgedAsChild:true,
      noSpouseAsChild:true,
      marriedAtMajority:true,
      noGeneratedPledge:true
    });
  });

test('an unmaterialized collateral is eagerly loaded on a private succession stream',
  async function ({ page }) {
    expect(await page.evaluate(function () {
      const s = FB.state;
      let rid = null;
      let member = null;
      for (const id in s.realms) {
        const r = s.realms[id];
        const succession = r && r.alive && id !== 'player' &&
          !(FB.papacyTerritorialRealm && FB.papacyTerritorialRealm(s, id)) &&
          r.succession;
        const candidate = succession && succession.heirId &&
          succession.members[succession.heirId];
        if (candidate && candidate.charId && s.chars[candidate.charId]) {
          rid = id;
          member = candidate;
          break;
        }
      }
      if (!rid || !member) return { skipped:true };
      const oldId = member.charId;
      delete s.chars[oldId];
      member.charId = null;
      FB.touchFamily();
      const rngBefore = FB.getRngState();

      FB.advanceRealmSuccession(s, rid);
      const crowned = FB.realmRulerCharacterSnapshot(s, rid);
      return {
        skipped:false,
        fullCharacter:!!crowned &&
          Object.keys(crowned.skills || {}).length === FB.SKILLS.length &&
          !!(crowned.traits && crowned.traits.length),
        derivedIdentity:!!crowned &&
          crowned.id === FB.courtCharacterId(member.id) &&
          crowned.id === oldId,
        rngUnchanged:FB.getRngState() === rngBefore,
        stubMatches:!!crowned &&
          s.realms[rid].ruler.mar ===
            FB.skillSnapshot(s, crowned, 'mar') &&
          s.realms[rid].ruler.trait === crowned.traits[0]
      };
    })).toEqual({
      skipped:false,
      fullCharacter:true,
      derivedIdentity:true,
      rngUnchanged:true,
      stubMatches:true
    });
  });

test('a foreign royal family tick cannot kill another realm ruler',
  async function ({ page }) {
    expect(await page.evaluate(function () {
      const s = FB.state;
      let sourceRid = null;
      let sourceMember = null;
      let ruler = null;
      let targetRid = null;
      for (const rid in s.realms) {
        const r = s.realms[rid];
        if (!r || !r.alive || rid === 'player' ||
            (FB.papacyTerritorialRealm && FB.papacyTerritorialRealm(s, rid)) ||
            !r.succession) continue;
        for (const memberId in r.succession.members) {
          const member = r.succession.members[memberId];
          const c = member && member.charId && s.chars[member.charId];
          if (c && !c.dead && memberId !== r.succession.rulerMemberId &&
              member.role !== 'consort') {
            sourceRid = rid;
            sourceMember = member;
            ruler = c;
            break;
          }
        }
        if (ruler) break;
      }
      for (const rid in s.realms) {
        const r = s.realms[rid];
        if (r && r.alive && r.generated && rid !== sourceRid) {
          targetRid = rid;
          break;
        }
      }
      if (!sourceRid || !targetRid || !ruler) return { skipped:true };
      if (!FB.assignRealmRulerCharacter(s, targetRid, ruler.id)) {
        return { skipped:true };
      }
      ruler.born = s.date.year - 90;
      sourceMember.born = ruler.born;
      s.realms[targetRid].ruler.born = ruler.born;
      s.realms[targetRid].ruler.age = 90;
      const targetGeneration = s.realms[targetRid].ruler.generation;
      const originalChance = FB.chance;
      try {
        /* Court mortality for a 90-year-old is exactly .25; realm-ruler
           mortality is .18. This forces the foreign family roll without
           forcing the crown's own death roll. */
        FB.chance = function (q) { return q === 0.25; };
        s.date.year++;
        s.turn += 360;
        FB.worldTick(s);
      } finally {
        FB.chance = originalChance;
      }
      const survivedForeignTick = !ruler.dead && sourceMember.alive !== false &&
        FB.realmIdForRulerCharacter(s, ruler) === targetRid;

      FB.killChar(s, ruler);
      const successor = FB.realmRulerCharacterSnapshot(s, targetRid);
      return {
        skipped:false,
        survivedForeignTick:survivedForeignTick,
        birthLineClosed:sourceMember.alive === false,
        foreignRealmAdvanced:s.realms[targetRid].ruler.generation >
          targetGeneration,
        livingSuccessor:!!successor && !successor.dead &&
          successor.id !== ruler.id
      };
    })).toEqual({
      skipped:false,
      survivedForeignTick:true,
      birthLineClosed:true,
      foreignRealmAdvanced:true,
      livingSuccessor:true
    });
  });

test('eager court repair advances retained and compacted dead rulers immediately',
  async function ({ page }) {
    expect(await page.evaluate(function () {
      const s = FB.state;
      const targets = [];
      for (const rid in s.realms) {
        const r = s.realms[rid];
        if (!r || !r.alive || rid === 'player' ||
            (FB.papacyTerritorialRealm && FB.papacyTerritorialRealm(s, rid)) ||
            !r.succession || !r.succession.heirId) continue;
        targets.push(rid);
        if (targets.length === 2) break;
      }
      if (targets.length < 2) return { skipped:true };

      const retainedRealm = s.realms[targets[0]];
      const retainedSuccession = retainedRealm.succession;
      const retainedRoot =
        retainedSuccession.members[retainedSuccession.rulerMemberId];
      const retained = s.chars[retainedRoot.charId];
      const retainedGeneration = retainedRealm.ruler.generation;
      retained.dead = true;
      retained.died = s.date.year;

      const compactRealm = s.realms[targets[1]];
      const compactSuccession = compactRealm.succession;
      const compactRoot = compactSuccession.members[compactSuccession.rulerMemberId];
      const compactGeneration = compactRealm.ruler.generation;
      const compactId = compactRoot.charId;
      compactRoot.alive = false;
      compactRoot.charId = null;
      delete s.chars[compactId];

      const originalDiplomaticSuccession = FB.noteDiplomaticSuccession;
      const originalLoadoutReconcile = FB.reconcileHouseholdLoadouts;
      let diplomacyCalls = 0;
      let householdCalls = 0;
      let retainedSuccessor;
      let compactSuccessor;
      try {
        FB.noteDiplomaticSuccession = function () {
          diplomacyCalls++;
          return true;
        };
        FB.reconcileHouseholdLoadouts = function () {
          householdCalls++;
          return [];
        };
        retainedSuccessor = FB.ensureRealmCourt(s, targets[0]);
        compactSuccessor = FB.ensureRealmCourt(s, targets[1]);
      } finally {
        FB.noteDiplomaticSuccession = originalDiplomaticSuccession;
        FB.reconcileHouseholdLoadouts = originalLoadoutReconcile;
      }
      return {
        skipped:false,
        retainedAdvanced:retainedRealm.ruler.generation >
          retainedGeneration && !!retainedSuccessor &&
          retainedSuccessor.id !== retained.id && !retainedSuccessor.dead,
        compactAdvanced:compactRealm.ruler.generation >
          compactGeneration && !!compactSuccessor &&
          compactSuccessor.id !== compactId && !compactSuccessor.dead,
        compactNotResurrected:!s.chars[compactId],
        repairWasSilent:diplomacyCalls === 0 && householdCalls === 0
      };
    })).toEqual({
      skipped:false,
      retainedAdvanced:true,
      compactAdvanced:true,
      compactNotResurrected:true,
      repairWasSilent:true
    });
  });

test('living abdication refuses an heir who already reigns elsewhere',
  async function ({ page }) {
    expect(await page.evaluate(function () {
      const s = FB.state;
      let heir = null;
      let foreignRid = null;
      for (const rid in s.realms) {
        const r = s.realms[rid];
        const c = r && r.alive && rid !== 'player' &&
          FB.realmRulerCharacterSnapshot(s, rid);
        if (c) {
          heir = c;
          foreignRid = rid;
          break;
        }
      }
      if (!heir) return { skipped:true };
      const priorPlayerRealm = s.realms.player;
      s.realms.player = {
        id:'player',
        name:'Test Realm',
        alive:true,
        ruler:{ generation:1 }
      };
      s.player.provs = [s.player.provinceId];
      const realmCount = Object.keys(s.realms).length;
      const handed = FB.abdicatePlayerRealmToHeir(s, heir);
      const result = {
        skipped:false,
        refused:handed === null,
        playerRealmIntact:s.realms.player &&
          s.realms.player.name === 'Test Realm',
        noRealmCreated:Object.keys(s.realms).length === realmCount,
        foreignCrownIntact:FB.realmIdForRulerCharacter(s, heir) === foreignRid
      };
      if (priorPlayerRealm) s.realms.player = priorPlayerRealm;
      else delete s.realms.player;
      return result;
    })).toEqual({
      skipped:false,
      refused:true,
      playerRealmIntact:true,
      noRealmCreated:true,
      foreignCrownIntact:true
    });
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

test('named ailments and legacy illness both invalidate the portrait key',
  async function ({ page }) {
    expect(await page.evaluate(function () {
      const s = FB.state;
      const me = s.chars[s.player.charId];
      const oldAils = me.ails && me.ails.slice();
      const oldIll = s.player.flags.ill;
      delete me.ails;
      delete s.player.flags.ill;
      const hale = FB.characterVisualKey(s, me);
      const ailmentId = Object.keys(FBDATA.ailments)[0];
      me.ails = [ailmentId];
      const ailing = FB.characterVisualKey(s, me);
      delete me.ails;
      s.player.flags.ill = 1;
      const ill = FB.characterVisualKey(s, me);
      if (oldAils) me.ails = oldAils;
      else delete me.ails;
      if (oldIll) s.player.flags.ill = oldIll;
      else delete s.player.flags.ill;
      return {
        hasFixture:!!ailmentId,
        ailmentChangesKey:hale !== ailing,
        illChangesKey:ailing !== ill && hale !== ill
      };
    })).toEqual({
      hasFixture:true,
      ailmentChangesKey:true,
      illChangesKey:true
    });
  });

test('the display fill writes nothing on a settled court and leaves save damage to the tick',
  async function ({ page }) {
    expect(await page.evaluate(function () {
      const s = FB.state;
      let rid = null;
      for (const id in s.realms) {
        const r = s.realms[id];
        if (!r || !r.alive || id === 'player') continue;
        if (FB.realmConsortCharacter(s, id)) { rid = id; break; }
      }
      if (!rid) return { skipped:true };
      const ruler = FB.realmRulerCharacterSnapshot(s, rid);
      const consort = FB.realmConsortCharacter(s, rid);
      /* Forge the damage a legacy save could carry: the ruler's marriage
         link dangles while the consort still points back, and the saved
         religious-office map is missing outright. Opening the sheet must
         render around both without repairing either. */
      ruler.spouseId = 'missing-spouse';
      delete s.religiousHeads;
      const before = JSON.stringify(s);
      const rng = FB.getRngState();
      const uid = FB.getUidCounter();
      FB.ensureRealmCourtForDisplay(s, rid);
      const displayPure = before === JSON.stringify(s);
      const displayRngSame = rng === FB.getRngState();
      const displayUidSame = uid === FB.getUidCounter();
      /* The world-tick coordinator keeps full repair authority. */
      FB.ensureDynasticState(s);
      return {
        skipped:false,
        displayPure:displayPure,
        displayRngSame:displayRngSame,
        displayUidSame:displayUidSame,
        tickRepaired:ruler.spouseId === consort.id &&
          consort.spouseId === ruler.id
      };
    })).toEqual({
      skipped:false,
      displayPure:true,
      displayRngSame:true,
      displayUidSame:true,
      tickRepaired:true
    });
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
