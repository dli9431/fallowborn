'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'data/story_instances.js',
  'data/story_courts_476.js',
  'index.html', 'data/bookmarks.js', 'data/bookmark_476.js',
  'data/bookmark_476_africa.js', 'data/bookmark_476_gaul_iberia.js',
  'data/technology.js', 'js/governments.js', 'js/world.js', 'js/model.js',
  'js/story_courts.js', 'js/story_campaign.js', 'js/authority.js',
  'js/main.js', 'js/save.js', 'js/save_v4.js', 'js/ui_modals.js'
]);
const { test, expect } = require('../support/fixture');
const { startParityGame } = require('../support/game/parity');
const { startHistoricalGame } = require('../support/game/historical-start');
const { openGame } = require('../support/game/navigation');

async function start(page, testInfo, crazygames) {
  await startHistoricalGame(page, testInfo, { bookmark:'476',
    code:'ROYALKIN-476-federate_476-ravenna-m-Marcus-standard-0-gothic.homoian' }, !!crazygames);
}

for (const crazy of [false, true]) {
  test('authored kin, pure court reads and immediate save identity with flag ' + crazy,
    async function ({ page }, testInfo) {
      await start(page, testInfo, crazy);
      const result = await page.evaluate(function () {
        const s = FB.state, r = s.realms.aghlabids, family = r.succession;
        const huneric = FB.authoredRoyalMemberSnapshot(s, r.id, 'huneric');
        const gento = FB.authoredRoyalMemberSnapshot(s, r.id, 'gento');
        const son = s.chars[huneric.charId], king = FB.realmRulerCharacterSnapshot(s, r.id);
        const saved = JSON.parse(FB.save.serialize());
        const before = JSON.stringify(s), rng = FB.getRngState(), uid = FB.getUidCounter();
        FB.realmFamilySnapshot(s, r.id); FB.royalKinshipDegreeSnapshot(s, king, son);
        FB.political.actor(s, { kind:'realm', id:r.id });
        const pure = before === JSON.stringify(s) && rng === FB.getRngState() && uid === FB.getUidCounter();
        FB.save.restore(saved);
        const restored = FB.authoredRoyalMemberSnapshot(FB.state, r.id, 'huneric');
        return { name:son.name, age:FB.ageOf(son, 476), son:son.fatherId === king.id,
          heir:family.heirId === huneric.id, policy:family.policyId,
          noConsort:!FB.realmConsortMember(FB.state, r.id) && !king.spouseId && !son.spouseId,
          deadAncestor:gento.alive === false && !gento.charId,
          identity:restored.charId === son.id && FB.state.chars[son.id].royalLine.memberId === huneric.id,
          dynasty:son.dyn === king.dyn, pure:pure, faults:FB.validateBookmark(FB.bookmark('476')),
          technology:FB.validateTechnologyData() };
      });
      expect(result).toEqual({ name:'Huneric', age:61, son:true, heir:true,
        policy:'agnatic_seniority', noConsort:true, deadAncestor:true,
        identity:true, dynasty:true, pure:true, faults:[], technology:[] });
    });
}

test('ordinary deaths select surviving uncles and nephews and suspend a mandate exactly once',
  async function ({ page }, testInfo) {
    await start(page, testInfo);
    const result = await page.evaluate(function () {
      const s = FB.state, r = s.realms.aghlabids, family = r.succession;
      const member = function (id) { return FB.authoredRoyalMemberSnapshot(s, r.id, id); };
      const kill = function (id) {
        const m = member(id), c = FB.materializeRoyalMember(s, r.id, m.id);
        FB.killChar(s, c);
      };
      const person = { kind:'character', id:s.player.charId };
      const appointment = FB.authorityAppoint(s, { officeId:'defensor_civitatis',
        institutionId:r.id, appointer:{ kind:'realm', id:r.id }, holder:person,
        scope:{ kind:'county', id:'tunis' } });
      const ownership = JSON.stringify([s.owner, s.holder]), gold = r.treasury.gold;
      const generation = family.rulerGeneration, firstKing = FB.realmRulerCharacterSnapshot(s, r.id);
      FB.killChar(s, firstKing);
      const first = FB.realmRulerCharacterSnapshot(s, r.id);
      const once = family.rulerGeneration === generation + 1;
      const suspended = !FB.political.power(s, person, 'peace', { provinceId:'tunis' }).allowed;
      const uncle = member('theoderic');
      const nephew = member('gunthamund');
      const avuncular = FB.royalKinshipDegreeSnapshot(s, first, { royalLine:{ realmId:r.id, memberId:nephew.id } });
      kill('huneric');
      const second = FB.realmRulerCharacterSnapshot(s, r.id).id === uncle.charId;
      kill('godagis'); kill('theoderic');
      const third = FB.realmRulerCharacterSnapshot(s, r.id);
      FB.save.restore(JSON.parse(FB.save.serialize()));
      return { appointment:!!appointment, first:first.name, once:once, suspended:suspended,
        second:second, third:third.name, avuncular:avuncular,
        generations:family.rulerGeneration - generation,
        sameDynasty:third.dyn === firstKing.dyn,
        unchanged:ownership === JSON.stringify([s.owner, s.holder]) && gold === r.treasury.gold,
        savedParent:FB.authoredRoyalMemberSnapshot(FB.state, r.id, 'gunthamund').fatherId === member('gento').id };
    });
    expect(result).toEqual({ appointment:true, first:'Huneric', once:true, suspended:true,
      second:true, third:'Gunthamund', avuncular:'avuncular', generations:3,
      sameDynasty:true, unchanged:true, savedParent:true });
  });

test('annual court mortality removes an elder heir before the ordinary ruler death selects the survivor',
  async function ({ page }, testInfo) {
    await start(page, testInfo);
    const result = await page.evaluate(function () {
      const s = FB.state, r = s.realms.aghlabids, family = r.succession;
      const huneric = FB.authoredRoyalMemberSnapshot(s, r.id, 'huneric');
      // Artificial ages isolate the two existing mortality thresholds.
      huneric.born = 386; s.chars[huneric.charId].born = 386;
      const king = FB.realmRulerCharacterSnapshot(s, r.id);
      king.born = 350; family.members[family.rulerMemberId].born = 350;
      r.ruler.born = 350; r.ruler.age = 126;
      const generation = family.rulerGeneration, chance = FB.chance, tech = FB.techBonus;
      const scale = FBDATA.balance.mortalityBase;
      try {
        FBDATA.balance.mortalityBase = 0.012;
        FB.techBonus = function (state, key, rid) { return key === 'health' ? 0 : tech(state, key, rid); };
        FB.chance = function (q) { return q === 0.25 || q === 0.18; };
        s.date.year++; s.turn += 360; FB.worldTick(s);
      } finally {
        FB.chance = chance; FB.techBonus = tech; FBDATA.balance.mortalityBase = scale;
      }
      return { heirDied:huneric.alive === false,
        ruler:FB.realmRulerCharacterSnapshot(s, r.id).name,
        once:family.rulerGeneration === generation + 1 };
    });
    expect(result).toEqual({ heirDied:true, ruler:'Theoderic', once:true });
  });

test('declaration validation rejects bad people, references, cycles, spouses and preferred eligibility atomically',
  async function ({ page }, testInfo) {
    await start(page, testInfo);
    const result = await page.evaluate(function () {
      const original = FBDATA.bookmarkRegions476.africa.realms[0].royalCourt;
      const ruler = FBDATA.bookmarkRegions476.africa.realms[0].ruler;
      const provinces = {};
      FBDATA.provinces.forEach(function (p) { provinces[p.id] = p; });
      const cases = [
        function (c) { c.members.push(c.members[0]); },
        function (c) { c.members[0].fatherId = 'unknown'; },
        function (c) { c.members[0].fatherId = 'huneric'; },
        function (c) { c.members[0].fatherId = 'theoderic'; c.members[1].fatherId = 'huneric'; },
        function (c) { c.members[0].born = 477; },
        function (c) { c.members[0].culture = 'missing'; },
        function (c) { c.members[0].religion = 'missing'; },
        function (c) { c.members[2].died = 400; },
        function (c) { c.members[2].died = 477; },
        function (c) { c.members[0].spouseId = 'theoderic'; },
        function (c) { c.succession.policyId = 'missing'; },
        function (c) { c.succession.preferredMemberId = 'gento'; },
        function (c) { c.members[0].sex = 'f'; },
        function (c) { c.members[0].born = 470; },
        function (c) { c.founderId = 'eudocia'; },
        function (c) { c.members = Array(25).fill(c.members[0]); }
      ];
      const bytes = JSON.stringify(FB.state), data = JSON.stringify(FBDATA.bookmarks),
        rng = FB.getRngState(), uid = FB.getUidCounter();
      const rejected = cases.map(function (change) {
        const court = JSON.parse(JSON.stringify(original)); change(court);
        return FB.royalCourtFaults(court, ruler, 476, provinces).length > 0;
      });
      const unknownParents = JSON.parse(JSON.stringify(original));
      delete unknownParents.members[0].fatherId;
      unknownParents.succession = { policyId:'dynastic' };
      return { rejected:rejected, unknownAccepted:!FB.royalCourtFaults(unknownParents, ruler, 476, provinces).length,
        untouched:bytes === JSON.stringify(FB.state) && data === JSON.stringify(FBDATA.bookmarks) &&
          rng === FB.getRngState() && uid === FB.getUidCounter() };
    });
    expect(result).toEqual({ rejected:Array(16).fill(true), unknownAccepted:true, untouched:true });
  });

test('a dead opening heir is skipped and the no-male frontier includes women and minors',
  async function ({ page }, testInfo) {
    await start(page, testInfo);
    const result = await page.evaluate(function () {
      const s = FB.state, r = s.realms.aghlabids, family = r.succession;
      const huneric = FB.authoredRoyalMemberSnapshot(s, r.id, 'huneric');
      FB.killChar(s, s.chars[huneric.charId]);
      const skipped = family.heirId !== huneric.id && !family.openingPreferredId;
      for (const id in family.members) {
        const m = family.members[id];
        if (id === family.rulerMemberId || m.alive === false) continue;
        m.sex = 'f'; if (m.charId) s.chars[m.charId].sex = 'f';
      }
      FB.refreshRealmSuccession(s, r.id);
      const female = family.members[family.heirId].sex === 'f';
      const candidate = family.members[family.heirId];
      candidate.sex = 'm'; candidate.born = 470;
      if (candidate.charId) { s.chars[candidate.charId].sex = 'm'; s.chars[candidate.charId].born = 470; }
      FB.refreshRealmSuccession(s, r.id);
      const minorFallback = family.heirId === candidate.id;
      const policy = FB.governments.successionForRealm(s, r.id);
      const ineligible = !policy.eligible(candidate, family, 476, family.dynasticOrder);
      candidate.born = 450;
      if (candidate.charId) s.chars[candidate.charId].born = 450;
      FB.refreshRealmSuccession(s, r.id);
      return { skipped:skipped, female:female, minorFallback:minorFallback,
        ineligible:ineligible, adult:family.heirId === candidate.id };
    });
    expect(result).toEqual({ skipped:true, female:true, minorFallback:true, ineligible:true, adult:true });
  });

test('empty authored adult courts recover an unrelated successor without inventing children',
  async function ({ page }, testInfo) {
    await start(page, testInfo);
    expect(await page.evaluate(function () {
      const s = FB.state, rows = [];
      ['m','f'].forEach(function (sex) {
        const rid = 'empty_authored_' + sex;
        const r = s.realms[rid] = { id:rid, name:'Empty authored court', capital:'tunis',
          rank:3, religion:'homoian', alive:true,
          ruler:{ name:'Unaccompanied ruler', sex:sex, culture:'vandal', born:430, age:46, mar:8, generation:1 } };
        FB.initializeRoyalCourts(s,[{id:rid,royalCourt:{spouseId:null,members:[]}}]);
        const family = r.succession, root = family.members[family.rulerMemberId], heir = family.members[family.heirId];
        const ruler = FB.realmRulerCharacterSnapshot(s,rid);
        const uid = FB.getUidCounter(), rng = FB.getRngState(), identity = family.heirId;
        FB.refreshRealmSuccession(s,rid);
        rows.push({id:rid,ruler:ruler.id,heir:identity,
          childless:root.childIds.length === 0 && ruler.childrenIds.length === 0,
          unwed:!ruler.spouseId && !FB.realmConsortMember(s,rid),
          unrelated:!!heir && !heir.parentId && !heir.fatherId && !heir.motherId,
          once:identity === family.heirId && uid === FB.getUidCounter() && rng === FB.getRngState()});
      });
      FB.save.restore(JSON.parse(FB.save.serialize()));
      return rows.map(function (row) {
        const r = FB.state.realms[row.id], me = FB.state.chars[row.ruler];
        return {childless:row.childless,unwed:row.unwed,unrelated:row.unrelated,once:row.once,
          retained:r.succession.heirId === row.heir && me.childrenIds.length === 0};
      });
    })).toEqual([0,1].map(function () {
      return {childless:true,unwed:true,unrelated:true,once:true,retained:true};
    }));
  });

test('generated relatives, two parents and a declared living spouse use the ordinary materializers',
  async function ({ page }, testInfo) {
    await start(page, testInfo);
    const result = await page.evaluate(function () {
      const s = FB.state;
      const r = s.realms.court_test = { id:'court_test', name:'Court', capital:'tunis',
        rank:3, religion:'homoian', alive:true,
        ruler:{ name:'Founder', sex:'m', culture:'vandal', born:420, age:56, mar:8, generation:1 } };
      const court = { spouseId:'wife', members:[
        { id:'wife', name:'Partner', sex:'f', born:425, culture:'roman', religion:'nicene', spouseId:'ruler' },
        { id:'son', generated:true, sex:'m', born:450, culture:'vandal', religion:'homoian', fatherId:'ruler', motherId:'wife', mar:9, trait:'patient' }
      ] };
      FB.initializeRoyalCourts(s, [{ id:r.id, royalCourt:court }]);
      const member = FB.authoredRoyalMemberSnapshot(s, r.id, 'son');
      const son = s.chars[member.charId], wife = FB.realmConsortCharacter(s, r.id), king = FB.realmRulerCharacterSnapshot(s, r.id);
      const named = son.name, id = son.id;
      const newborn = FB.makeCharacter(s, { name:'Later Child', sex:'f', born:476,
        culture:'vandal', religion:'homoian', dyn:king.dyn, fatherId:king.id, motherId:wife.id });
      FB.registerRoyalBirth(s, newborn, king, wife);
      const uid = FB.getUidCounter();
      FB.registerRoyalBirth(s, newborn, king, wife);
      const noDuplicate = FB.getUidCounter() === uid;
      const newbornId = newborn.royalLine.memberId;
      FB.save.restore(JSON.parse(FB.save.serialize()));
      const restored = FB.state.chars[id];
      const birth = FB.state.realms[r.id].succession.members[newbornId];
      return { generated:son.generated && member.generated, spouse:wife.spouseId === king.id && king.spouseId === wife.id,
        parents:restored.fatherId === king.id && restored.motherId === wife.id,
        identity:restored.name === named && restored.id === id,
        martial:FB.skillSnapshot(FB.state, restored, 'mar'),
        trait:restored.traits.indexOf('patient') >= 0,
        birth:birth.fatherId === king.royalLine.memberId && birth.motherId === wife.royalLine.memberId && noDuplicate,
        children:FB.state.realms[r.id].succession.members[wife.royalLine.memberId].childIds.filter(function (cid) { return cid === member.id; }).length };
    });
    expect(result).toEqual({ generated:true, spouse:true, parents:true, identity:true, martial:9, trait:true, birth:true, children:1 });
  });

test('lazy materialization and dead-record compaction preserve both ancestry and exact identity',
  async function ({ page }, testInfo) {
    await start(page, testInfo);
    const result = await page.evaluate(function () {
      const s = FB.state;
      // A detached court has no opening office or story retaining its father.
      const definition = FBDATA.realms.find(function (d) {return d.id === 'aghlabids';});
      const r = s.realms.e2e_compaction_court = {id:'e2e_compaction_court',name:'Compaction court',
        capital:'tunis',rank:3,religion:'homoian',alive:true,
        ruler:JSON.parse(JSON.stringify(s.realms.aghlabids.ruler))};
      FB.initializeRoyalCourts(s,[{id:r.id,royalCourt:JSON.parse(JSON.stringify(definition.royalCourt))}]);
      const hilderic = FB.authoredRoyalMemberSnapshot(s, r.id, 'hilderic');
      const c = FB.materializeRoyalMember(s, r.id, hilderic.id);
      const repeat = FB.materializeRoyalMember(s, r.id, hilderic.id);
      const father = s.chars[c.fatherId], fatherId = father.royalLine.memberId;
      const motherId = hilderic.motherId;
      FB.courtMemberDied(s,r.succession.members[fatherId],father);
      const compacted = !s.chars[father.id] && r.succession.members[fatherId].charId === null;
      FB.save.restore(JSON.parse(FB.save.serialize()));
      const restored = FB.authoredRoyalMemberSnapshot(FB.state, r.id, 'hilderic');
      const restoredFather = FB.authoredRoyalMemberSnapshot(FB.state, r.id, 'huneric');
      return { same:c === repeat, identity:restored.charId === c.id,
        compacted:compacted, father:restored.fatherId === restoredFather.id,
        mother:restored.motherId === motherId,
        childLinks:restoredFather.childIds.filter(function (id) { return id === restored.id; }).length };
    });
    expect(result).toEqual({ same:true, identity:true, compacted:true, father:true, mother:true, childLinks:1 });
  });

test('opening preference expires at death and seniority ties use stable member identity',
  async function ({ page }, testInfo) {
    await start(page, testInfo);
    const result = await page.evaluate(function () {
      const s = FB.state, r = s.realms.aghlabids, family = r.succession;
      const huneric = FB.authoredRoyalMemberSnapshot(s, r.id, 'huneric');
      const theoderic = FB.authoredRoyalMemberSnapshot(s, r.id, 'theoderic');
      family.openingPreferredId = theoderic.id;
      FB.refreshRealmSuccession(s, r.id);
      const opening = family.heirId === theoderic.id;
      const gaiseric = FB.realmRulerCharacterSnapshot(s, r.id);
      FB.killChar(s, gaiseric);
      const notReapplied = family.rulerMemberId === huneric.id && !family.openingPreferredId;
      const godagis = FB.authoredRoyalMemberSnapshot(s, r.id, 'godagis');
      theoderic.born = godagis.born;
      if (theoderic.charId) s.chars[theoderic.charId].born = theoderic.born;
      FB.refreshRealmSuccession(s, r.id);
      const tied = family.heirId === [godagis.id, theoderic.id].sort()[0];
      return { opening:opening, notReapplied:notReapplied, tied:tied };
    });
    expect(result).toEqual({ opening:true, notReapplied:true, tied:true });
  });

for (const width of [1280, 390]) {
  test('the existing court strip labels surviving nephews at width ' + width,
    async function ({ page }, testInfo) {
      await page.setViewportSize({ width:width, height:800 });
      await start(page, testInfo);
      await page.evaluate(function () {
        FB.killChar(FB.state, FB.realmRulerCharacterSnapshot(FB.state, 'aghlabids'));
        FB.ui.showCharModal(FB.realmRulerCharacterSnapshot(FB.state, 'aghlabids').id);
      });
      await expect(page.locator('#genmodal .court-strip')).toContainText('Nephew');
      await expect(page.locator('#genmodal .court-strip')).toContainText('Gunthamund');
      await expect(page.locator('#genmodal .court-strip')).toContainText('Heir');
    });
}

test('malformed saved policy and genealogy fail before state, RNG or uid adoption',
  async function ({ page }, testInfo) {
    await start(page, testInfo);
    const result = await page.evaluate(function () {
      const saved = JSON.parse(FB.save.serialize()), current = FB.state;
      const rng = FB.getRngState(), uid = FB.getUidCounter(), bytes = JSON.stringify(current);
      const changes = [
        function (s) { s.policyId = 'missing'; },
        function (s) { s.founderId = 'missing'; },
        function (s) { s.members[s.order[0]].fatherId = 'missing'; },
        function (s) { s.members[s.rulerMemberId].fatherId = s.order[0]; },
        function (s) { s.order.push(s.order[0]); },
        function (s) { s.members[s.order[0]].spouseMemberId = s.rulerMemberId; },
        function (s) { s.members[s.order[0]].charId = current.player.charId; }
      ];
      return changes.map(function (change) {
        const bad = JSON.parse(JSON.stringify(saved)); change(bad.state.realms.aghlabids.succession);
        let rejected = false;
        try { FB.save.restore(bad); } catch (_) { rejected = true; }
        return rejected && FB.state === current && bytes === JSON.stringify(current) &&
          rng === FB.getRngState() && uid === FB.getUidCounter();
      });
    });
    expect(result).toEqual(Array(7).fill(true));
  });

test('an older generated 476 family receives no historical actors on restore',
  async function ({ page }, testInfo) {
    await page.addInitScript(function () {
      document.addEventListener('DOMContentLoaded',function () {
        const initialize = FB.initializeRoyalCourts;
        FB.initializeRoyalCourts = function (state,definitions) {
          FB.initializeRoyalCourts = initialize;
          return initialize(state,definitions.filter(function (d) {return d.id !== 'aghlabids';}));
        };
      },{once:true});
    });
    await start(page, testInfo);
    const result = await page.evaluate(function () {
      const s = FB.state, r = s.realms.aghlabids;
      FB.ensureRealmCourt(s, r.id);
      const saved = JSON.parse(FB.save.serialize());
      const family = JSON.stringify(saved.state.realms.aghlabids.succession);
      FB.save.restore(saved);
      const next = JSON.parse(FB.save.serialize());
      return { unchanged:family === JSON.stringify(next.state.realms.aghlabids.succession),
        policy:FB.state.realms.aghlabids.succession.policyId || null,
        absent:!FB.authoredRoyalMemberSnapshot(FB.state, r.id, 'huneric'),
        rng:(FB.getRngState() >>> 0) === (saved.rng >>> 0), uid:FB.getUidCounter() === saved.uid };
    });
    expect(result).toEqual({ unchanged:true, policy:null, absent:true, rng:true, uid:true });
  });

test('Clovis and Burgundian story actors share the data-authored court identities',
  async function ({ page }, testInfo) {
    await start(page, testInfo);
    const result = await page.evaluate(function () {
      const s = FB.state, w = s.stories.western_court_476;
      const clovis = FB.authoredRoyalMemberSnapshot(s, 'franks_476', 'clovis');
      const gundobad = FB.authoredRoyalMemberSnapshot(s, 'burgundy', 'gundobad');
      const godegisel = FB.authoredRoyalMemberSnapshot(s, 'burgundy', 'godegisel');
      const uncle = FB.realmRulerCharacterSnapshot(s, 'burgundy');
      const relation = FB.royalKinshipDegreeSnapshot(s, uncle, s.chars[gundobad.charId]);
      const bound = w.clovisId === clovis.charId && w.gundobadId === gundobad.charId && w.godegiselId === godegisel.charId;
      const unique = ['Clovis','Gundobad','Godegisel'].every(function (name) {
        return Object.keys(s.chars).filter(function (id) { return s.chars[id].name === name && s.chars[id].royalLine; }).length === 1;
      });
      FB.killChar(s, s.chars[w.childericId]); FB.killChar(s, uncle);
      FB.save.restore(JSON.parse(FB.save.serialize()));
      return { bound:bound, unique:unique, relation:relation,
        frank:FB.realmRulerCharacterSnapshot(FB.state, 'franks_476').id === w.clovisId,
        burgundy:FB.realmRulerCharacterSnapshot(FB.state, 'burgundy').id === w.gundobadId,
        story:FB.state.stories.western_court_476.clovisId === w.clovisId };
    });
    expect(result).toEqual({ bound:true, unique:true, relation:'avuncular', frank:true, burgundy:true, story:true });
  });

for (const bookmark of ['867','1066']) {
  test('schema-absent ' + bookmark + ' creation and imported saves retain RNG and uid progression',
    async function ({ page }, testInfo) {
      await startParityGame(page, testInfo, { bookmark:bookmark,
        code:'ROYALKIN-' + bookmark + '-serf-london-m-Osric' });
      const result = await page.evaluate(function () {
        const s = FB.state, before = JSON.stringify(s), rng = FB.getRngState(), uid = FB.getUidCounter();
        FB.initializeRoyalCourts(s, FBDATA.realms);
        const untouched = before === JSON.stringify(s) && rng === FB.getRngState() && uid === FB.getUidCounter();
        const saved = JSON.parse(FB.save.serialize());
        const courts = JSON.stringify(Object.keys(saved.state.realms).map(function (id) { return saved.state.realms[id].succession; }));
        FB.save.restore(saved);
        const next = JSON.parse(FB.save.serialize());
        return { untouched:untouched, rng:(FB.getRngState() >>> 0) === (saved.rng >>> 0), uid:FB.getUidCounter() === saved.uid,
          courts:courts === JSON.stringify(Object.keys(next.state.realms).map(function (id) { return next.state.realms[id].succession; })) };
      });
      expect(result).toEqual({ untouched:true, rng:true, uid:true, courts:true });
    });
}

test('one 476 observer season retains valid saved royal links and story identities',
  async function ({ page }, testInfo) {
    await openGame(page, testInfo);
    const error = await page.evaluate(function () {
      return new Promise(function (resolve) {
        FB.activateBookmark('476', null, function (error) {
          if (error) { resolve(error.message); return; }
          FB.game.pending = { seed:'ROYAL-SEASON' }; FB.game.startObserve();
          FB.game.setPaused(true); resolve(null);
        });
      });
    });
    expect(error).toBe(null);
    const result = await page.evaluate(function () {
      const s = FB.state, initialTurn = s.turn;
      for (let i = 0; i < 90; i++) {
        const turn = s.turn; FB.game.passDay({ deferUi:true });
        if (s.turn !== turn + 1) throw new Error('Observer stalled on day ' + i);
      }
      const data = JSON.parse(FB.save.serialize());
      FB.save.restore(data);
      const family = FB.state.realms.aghlabids.succession;
      return { days:FB.state.turn - initialTurn, policy:family.policyId,
        valid:FB.save.v4.validatePlatform(JSON.parse(FB.save.serialize()).state),
        parent:FB.authoredRoyalMemberSnapshot(FB.state, 'aghlabids', 'gunthamund').fatherId ===
          FB.authoredRoyalMemberSnapshot(FB.state, 'aghlabids', 'gento').id,
        faults:FB.validateBookmark(FB.bookmark('476')) };
    });
    expect(result).toEqual({ days:90, policy:'agnatic_seniority', valid:true, parent:true, faults:[] });
  });
