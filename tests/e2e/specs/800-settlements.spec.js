'use strict';
const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { openCrazyGame } = require('../support/game/crazygames-title');
const { mockCrazyGames } = require('../support/crazygames');
const { startParityGame } = require('../support/game/parity');
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'index.html', 'data/bookmark_800.js', 'data/bookmark_800_history.js',
  'data/bookmarks.js', 'data/technology.js', 'data/political_institutions.js',
  'data/distribution_crazygames.js', 'js/crazygames.js',
  'js/world.js', 'js/royal_settlements.js', 'js/story_settlements.js', 'data/story_instances.js',
  'js/stories.js', 'js/model.js', 'js/governments.js', 'js/station.js', 'js/localfolk.js',
  'js/wars.js', 'js/authority.js', 'js/treasury.js', 'js/events.js',
  'js/main.js', 'js/save.js', 'js/save_v4.js'
]);
async function observe(page, testInfo, bookmark, crazygames) {
  if (crazygames) {
    await mockCrazyGames(page);
    await openCrazyGame(page, testInfo);
  }
  else await openGame(page, testInfo);
  const error = await page.evaluate(function (bookmark) {
    return new Promise(function (resolve) {
      FB.activateBookmark(bookmark, null, function (fault) {
        if (fault) { resolve(fault.message); return; }
        FB.game.pending = { seed:'SETTLEMENTS-' + bookmark + '-OBSERVER' };
        FB.game.startObserve(); FB.game.setPaused(true); resolve(null);
      });
    });
  }, bookmark || '800');
  expect(error).toBe(null);
  await page.evaluate(function () {
    // A test-only view keeps the pre-conversion journeys readable. Every
    // mutation and save still uses the five independently registered records.
    window.settlementRecord = function (s) {
      return { cast:s.stories.divisio_800.cast, pressure:s.stories.verdun_800.pressure,
        opportunities:{ divisio:s.stories.divisio_800, ordinatio:s.stories.ordinatio_800,
          gifts:s.stories.gifts_800, recognition:s.stories.recognition_800, verdun:s.stories.verdun_800 } };
    };
    window.settlementStory = {
      day:function (s) { ['divisio','ordinatio','gifts','recognition','verdun'].forEach(function (key) {
        FB.stories.get(key + '_800').day(s, s.stories[key + '_800']);
      }); },
      season:function (s) { ['divisio','ordinatio','gifts','recognition','verdun'].forEach(function (key) {
        FB.stories.get(key + '_800').season(s, s.stories[key + '_800']);
      }); }
    };
  });
}

for (const crazy of [false, true]) {
  test('800 courts link real sons once and preserve their saved identity with flag ' + crazy,
    async function ({ page }, testInfo) {
      if (crazy) await page.addInitScript(function () { window.FB_DISTRIBUTION = 'crazygames'; });
      await observe(page, testInfo, null, crazy);
      const result = await page.evaluate(function () {
        let s = FB.state;
        const rec = settlementRecord(s);
        const father = s.chars[rec.cast.charlemagne], louis = s.chars[rec.cast.louis], pippin = s.chars[rec.cast.pippin];
        const family = s.realms.carolingian_800.succession;
        const before = JSON.stringify({ owner:s.owner, holder:s.holder, cast:rec.cast, opportunities:rec.opportunities });
        const genuine = louis.fatherId === father.id && pippin.fatherId === father.id &&
          father.childrenIds.indexOf(louis.id) >= 0 && father.childrenIds.indexOf(pippin.id) >= 0;
        const copies = Object.keys(family.members).filter(function (id) {
          return family.members[id].charId === louis.id;
        }).length;
        const singlePerson = Object.keys(s.chars).filter(function (id) {
          return s.chars[id].name === 'Louis' && s.chars[id].born === 778 && s.chars[id].dyn === 'Carolingian';
        }).length;
        const platform = FB.save.v4.validatePlatform(JSON.parse(FB.save.serialize()).state);
        FB.save.restore(JSON.parse(FB.save.serialize())); s = FB.state;
        return { genuine:genuine, copies:copies, singlePerson:singlePerson, platform:platform,
          kinship:FB.royalKinshipDegreeSnapshot(s, s.chars[louis.id], s.chars[pippin.id]),
          closeKin:FB.royalCloseKinSnapshot(s, s.chars[louis.id], s.chars[pippin.id]),
          consort:FB.realmConsortMember(s, 'carolingian_800') === null,
          identity:FB.realmRulerCharacterSnapshot(s, 'aquitaine').id === louis.id,
          retained:before === JSON.stringify({ owner:s.owner, holder:s.holder,
            cast:settlementRecord(s).cast, opportunities:settlementRecord(s).opportunities }),
          future:FB.bookmark('800').realms.every(function (r) {
            return !r.royalCourt || r.royalCourt.members.every(function (m) { return m.born <= 800; });
          }), faults:FB.validateBookmark(FB.bookmark('800')), technology:FB.validateTechnologyData() };
      });
      expect(result).toEqual({ genuine:true, copies:1, singlePerson:1, platform:true, kinship:'full_sibling', closeKin:true, consort:true,
        identity:true, retained:true, future:true, faults:[], technology:[] });
    });
}

test('a compact linked descendant materializes in its original court without a duplicate identity',
  async function ({ page }, testInfo) {
    await observe(page, testInfo);
    const result = await page.evaluate(function () {
      const s = FB.state, source = FB.authoredRoyalMemberSnapshot(s, 'aquitaine', 'lothair');
      // Restore a compact living member to exercise the ordinary lazy-fill boundary.
      const identity = source.charId || FB.courtCharacterId(source.id);
      if (source.charId) delete s.chars[source.charId];
      source.charId = null;
      FB.refreshRealmSuccession(s, 'carolingian_800');
      const family = s.realms.carolingian_800.succession;
      const memberId = Object.keys(family.members).find(function (id) {
        const ref = family.members[id].branchRef;
        return ref && ref.realmId === 'aquitaine' && ref.memberId === source.id;
      });
      const person = FB.materializeRoyalMember(s, 'carolingian_800', memberId);
      const line = JSON.stringify(person.royalLine);
      FB.save.restore(JSON.parse(FB.save.serialize()));
      return { stable:person.id === identity, original:line === JSON.stringify({ realmId:'aquitaine', memberId:source.id }),
        linked:FB.state.realms.carolingian_800.succession.members[memberId].charId === person.id,
        single:Object.keys(FB.state.chars).filter(function (id) {
          return FB.state.chars[id].name === 'Lothair' && FB.state.chars[id].born === 795 &&
            FB.state.chars[id].dyn === 'Carolingian';
        }).length };
    });
    expect(result).toEqual({ stable:true, original:true, linked:true, single:1 });
  });

test('806 plans preserve ownership until a natural accession and execute once after restore',
  async function ({ page }, testInfo) {
    await observe(page, testInfo);
    const result = await page.evaluate(function () {
      let s = FB.state, rec = settlementRecord(s);
      s.date.year = 806;
      const before = JSON.stringify([s.owner,s.holder]);
      const q = FB.stories.quote(s, 'divisio_800', 'approve');
      const planned = FB.stories.apply(s, 'divisio_800', 'approve', q);
      const stable = before === JSON.stringify([s.owner,s.holder]);
      const primary = s.realms.carolingian_800.succession.members[rec.opportunities.divisio.plan.primaryId].charId;
      FB.save.restore(JSON.parse(FB.save.serialize())); s = FB.state; rec = settlementRecord(s);
      FB.killChar(s, s.chars[rec.cast.charlemagne]);
      settlementStory.day(s, rec);
      const outcome = rec.opportunities.divisio.result;
      const after = JSON.stringify([s.owner,s.holder,rec]);
      settlementStory.day(s, rec);
      const once = after === JSON.stringify([s.owner,s.holder,rec]);
      FB.save.restore(JSON.parse(FB.save.serialize()));
      return { planned:planned, stable:stable, heir:FB.realmRulerCharacterSnapshot(FB.state, 'carolingian_800').id === primary,
        owners:[FB.state.owner.aachen,FB.state.owner.bordeaux,FB.state.owner.pavia],
        localRulers:[FB.realmRulerCharacterSnapshot(FB.state, 'aquitaine').id === rec.cast.louis,
          FB.realmRulerCharacterSnapshot(FB.state, 'italy').id === rec.cast.pippin],
        outcome:outcome, once:once, retained:FB.state.stories.divisio_800.result === outcome };
    });
    expect(result).toEqual({ planned:true, stable:true, heir:true,
      owners:['carolingian_800','aquitaine','italy'], localRulers:[true,true], outcome:'executed', once:true, retained:true });
  });

test('a surviving son inherits without cloning his court and 817 retains a senior empire',
  async function ({ page }, testInfo) {
    await observe(page, testInfo);
    const result = await page.evaluate(function () {
      const s = FB.state, rec = settlementRecord(s), family = s.realms.carolingian_800.succession;
      const louis = Object.keys(family.members).find(function (id) { return family.members[id].charId === rec.cast.louis; });
      FB.designateRoyalHeir(s, 'carolingian_800', louis);
      const louisId = rec.cast.louis;
      const lothairMember = FB.authoredRoyalMemberSnapshot(s, 'aquitaine', 'lothair');
      const lothair = FB.materializeRoyalMember(s, 'aquitaine', lothairMember.id).id;
      const funds = s.realms.carolingian_800.treasury.gold + s.realms.aquitaine.treasury.gold;
      FB.killChar(s, s.chars[rec.cast.charlemagne]);
      const absorbed = !s.realms.aquitaine.alive && FB.realmRulerCharacterSnapshot(s, 'carolingian_800').id === louisId;
      const conserved = s.realms.carolingian_800.treasury.gold === funds;
      s.date.year = 817;
      const owners = JSON.stringify(s.owner), q = FB.stories.quote(s, 'ordinatio_800', 'approve');
      const agreed = FB.stories.apply(s, 'ordinatio_800', 'approve', q), plan = rec.opportunities.ordinatio.plan;
      const primary = s.realms.carolingian_800.succession.members[plan.primaryId];
      const junior = plan.shares[0].realmId;
      FB.save.restore(JSON.parse(FB.save.serialize()));
      return { absorbed:absorbed, conserved:conserved, agreed:agreed,
        senior:primary.charId === lothair && FB.state.realms.carolingian_800.succession.heirId === primary.id,
        united:owners === JSON.stringify(FB.state.owner), junior:FB.state.realms[junior].liege,
        local:FB.state.holder.bordeaux === junior, dynasty:FB.realmRulerCharacterSnapshot(FB.state, junior).dyn,
        noNamedFuture:!Object.keys(FB.state.chars).some(function (id) {
          return FB.state.chars[id].name === 'Charles the Bald';
        }) };
    });
    expect(result).toEqual({ absorbed:true, conserved:true, agreed:true, senior:true,
      united:true, junior:'carolingian_800', local:true, dynasty:'Carolingian', noNamedFuture:true });
  });

test('sibling pressure opens an ordinary war and a three-party 843 agreement ends it without taking foreign land',
  async function ({ page }, testInfo) {
    await observe(page, testInfo);
    const result = await page.evaluate(function () {
      const s = FB.state, rec = settlementRecord(s), story = settlementStory;
      const family = s.realms.carolingian_800.succession;
      const louisMember = Object.keys(family.members).find(function (id) { return family.members[id].charId === rec.cast.louis; });
      FB.designateRoyalHeir(s, 'carolingian_800', louisMember);
      FB.killChar(s, s.chars[rec.cast.charlemagne]);
      s.date.year = 806;
      // A counterfactual third son is an ordinary simulated birth, not a future historical seed.
      const father = s.chars[rec.cast.louis], mother = FB.spouseSnapshot(s, father);
      const baby = FB.makeCharacter(s, { name:'Test son', sex:'m', born:806,
        culture:'frankish', religion:'catholic', dyn:'Carolingian', fatherId:father.id, motherId:mother.id });
      father.childrenIds.push(baby.id); mother.childrenIds.push(baby.id);
      FB.registerRoyalBirth(s, baby, father, mother);
      s.date.year = 817;
      const ord = FB.stories.quote(s, 'ordinatio_800', 'approve');
      const agreement = FB.stories.apply(s, 'ordinatio_800', 'approve', ord);
      const shares = rec.opportunities.ordinatio.plan.shares;
      FB.killChar(s, father);
      const chance = FB.chance;
      try {
        FB.chance = function (p) { return p === 0.35; };
        s.date.year = 840;
        for (let i = 0; i < 4; i++) { s.date.season = i; story.season(s, rec); }
      } finally { FB.chance = chance; }
      const warId = rec.pressure.warId, war = FB.ordinaryWarById(s, warId);
      const ordinary = !!war && war.casus.type === 'independence' && s.owner.bordeaux === shares[0].realmId;
      // A foreign conquest cannot enter the negotiated award.
      FB.transferProvince(s, 'magdeburg', 'denmark');
      const foreign = s.owner.magdeburg;
      const localHolder = s.holder.chartres;
      s.date.year = 843;
      const q = FB.stories.quote(s, 'verdun_800', 'approve');
      const treaty = FB.stories.apply(s, 'verdun_800', 'approve', q);
      const once = !FB.stories.apply(s, 'verdun_800', 'approve', q);
      FB.save.restore(JSON.parse(FB.save.serialize()));
      return { agreement:agreement, ordinary:ordinary, treaty:treaty, once:once,
        ended:!FB.ordinaryWarById(FB.state, warId), foreign:FB.state.owner.magdeburg === foreign,
        localHolder:FB.state.holder.chartres === localHolder,
        owners:[FB.state.owner.paris, FB.state.owner.regensburg, FB.state.owner.aachen],
        free:shares.every(function (share) { return !FB.state.realms[share.realmId].liege; }),
        result:FB.state.stories.verdun_800.result };
    });
    expect(result).toEqual({ agreement:true, ordinary:true, treaty:true, once:true, ended:true,
      foreign:true, localHolder:true, owners:['carolingian_aquitaine_800','carolingian_bavaria_800','carolingian_800'],
      free:true, result:'agreed' });
  });

test('funded gifts and eastern recognition persist once and stale or hostile terms cannot apply',
  async function ({ page }, testInfo) {
    await observe(page, testInfo);
    const result = await page.evaluate(function () {
      const s = FB.state, rec = settlementRecord(s);
      s.date.year = 802;
      const crown = s.realms.carolingian_800, abbasid = s.realms.abbasid;
      crown.treasury.gold = 100; abbasid.treasury.gold = 100;
      const q = FB.stories.quote(s, 'gifts_800', 'approve');
      abbasid.treasury.gold = 101;
      const stale = !FB.stories.apply(s, 'gifts_800', 'approve', q);
      abbasid.treasury.gold = 100;
      const gifts = FB.stories.apply(s, 'gifts_800', 'approve', FB.stories.quote(s, 'gifts_800', 'approve'));
      const funds = [crown.treasury.gold,abbasid.treasury.gold];
      const peaceful = !!FB.truceExpiry(s, 'carolingian_800', 'abbasid');
      s.date.year = 812;
      const war = FB.registerOrdinaryWar(s, 'carolingian_800', { enemy:'byzantium', target:'venezia', legacy:false,
        casus:{ type:'border', target:'venezia' }, objectives:[{ type:'border', target:'venezia' }] });
      const hostile = !FB.stories.quote(s, 'recognition_800', 'approve').allowed;
      FB.settleOrdinaryWar(s, war.id, 'white_peace');
      FB.transferProvince(s, 'venezia', 'carolingian_800');
      const recognition = FB.stories.apply(s, 'recognition_800', 'approve', FB.stories.quote(s, 'recognition_800', 'approve'));
      const proof = rec.opportunities.recognition.plan.recognitionId;
      FB.save.restore(JSON.parse(FB.save.serialize()));
      const restored = FB.state, actor = { kind:'realm', id:'carolingian_800' };
      const savedRec = settlementRecord(restored);
      const before = JSON.stringify([restored.realms.carolingian_800.treasury,restored.realms.abbasid.treasury,
        restored.authority.recognitions,restored.owner,savedRec.opportunities.gifts,savedRec.opportunities.recognition]);
      settlementStory.season(restored, settlementRecord(restored));
      return { stale:stale, gifts:gifts, funds:funds, peaceful:peaceful, hostile:hostile, recognition:recognition,
        coast:restored.owner.venezia, proof:FB.political.legitimacy(restored, actor, actor, 'imperial_commission')
          .some(function (row) { return row.id === proof; }),
        repeated:before === JSON.stringify([restored.realms.carolingian_800.treasury,restored.realms.abbasid.treasury,
          restored.authority.recognitions,restored.owner,savedRec.opportunities.gifts,savedRec.opportunities.recognition]) };
    });
    expect(result).toEqual({ stale:true, gifts:true, funds:[110,90], peaceful:true, hostile:true,
      recognition:true, coast:'byzantium', proof:true, repeated:true });
  });

test('divergent capitals, dead negotiating rulers and malformed plans fail closed',
  async function ({ page }, testInfo) {
    await observe(page, testInfo);
    const result = await page.evaluate(function () {
      const s = FB.state, rec = settlementRecord(s), story = settlementStory;
      s.date.year = 802;
      FB.killChar(s, s.chars[rec.cast.harun]); story.day(s, rec);
      const interrupted = rec.opportunities.gifts.result;
      s.date.year = 812; s.owner.split = 'cordoba'; story.day(s, rec);
      const diverted = rec.opportunities.recognition.result;
      let malformed = false;
      const copy = JSON.parse(JSON.stringify(rec)); copy.opportunities.divisio.phase = 'planned';
      copy.opportunities.divisio.turn = 0; copy.opportunities.divisio.plan = { shares:[] };
      try { FB.stories.get('divisio_800').validate(copy.opportunities.divisio, s); } catch (_) { malformed = true; }
      const source = JSON.stringify(FB.bookmark('800'));
      const snapshot = JSON.stringify([s.owner,s.holder,s.stories]), rng = FB.getRngState();
      FB.stories.status(s, 'divisio_800'); FB.stories.quote(s, 'recognition_800', 'approve');
      return { interrupted:interrupted, diverted:diverted, malformed:malformed,
        pure:snapshot === JSON.stringify([s.owner,s.holder,s.stories]) && rng === FB.getRngState(),
        source:source === JSON.stringify(FB.bookmark('800')) };
    });
    expect(result).toEqual({ interrupted:'interrupted', diverted:'diverted', malformed:true, pure:true, source:true });
  });

test('867 stays detached and an older 800 save gains no historical people or story on restore',
  async function ({ page }, testInfo) {
    await observe(page, testInfo, '867');
    expect(await page.evaluate(function () { return ['divisio','ordinatio','gifts','recognition','verdun'].some(function (key) { return !!FB.stories.record(FB.state, key + '_800'); }); })).toBe(false);
    // A resumable household has its ordinary parents, unlike the observer's
    // placeholder soul, so this isolates historical-story restore behavior.
    await startParityGame(page, testInfo, {
      bookmark:'800', code:'SETTLEMENTS-800-farmer-london-m-Review'
    });
    const result = await page.evaluate(function () {
      ['divisio','ordinatio','gifts','recognition','verdun'].forEach(function (key) { delete FB.state.stories[key + '_800']; });
      const before = Object.keys(FB.state.chars).sort().join('|');
      FB.save.restore(JSON.parse(FB.save.serialize()));
      return { absent:['divisio','ordinatio','gifts','recognition','verdun'].every(function (key) { return !FB.stories.record(FB.state, key + '_800'); }),
        people:before === Object.keys(FB.state.chars).sort().join('|') };
    });
    expect(result).toEqual({ absent:true, people:true });
  });

test('bundled 800 saves migrate their pending, planned and concluded opportunities without replay', async function ({ page }, testInfo) {
  await observe(page, testInfo);
  const result = await page.evaluate(function () {
    let s = FB.state;
    s.date.year = 806;
    s.realms.carolingian_800.treasury.gold = 100; s.realms.abbasid.treasury.gold = 100;
    ['divisio','gifts'].forEach(function (key) {
      const id = key + '_800'; FB.stories.apply(s, id, 'approve', FB.stories.quote(s, id, 'approve'));
    });
    const old = JSON.parse(FB.save.serialize()), rows = {}, cast = old.state.stories.divisio_800.cast;
    const pressure = old.state.stories.verdun_800.pressure;
    function snapshot(rows) { return JSON.stringify(Object.keys(rows).sort().map(function (id) { return [id,rows[id]]; })); }
    const expected = snapshot(old.state.stories), before = JSON.stringify([s.chars,s.owner,s.holder,s.realms,s.authority,s.log]);
    ['divisio','ordinatio','gifts','recognition','verdun'].forEach(function (key) {
      const id = key + '_800', row = old.state.stories[id];
      delete row.approvals; delete row.cast; delete row.pressure; rows[key] = row; delete old.state.stories[id];
    });
    old.state.stories.carolingian_settlements_800 = { cast:cast, pressure:pressure, opportunities:rows };
    const source = JSON.stringify(old), rng = FB.getRngState();
    const migrated = FB.save.v4.migrate(old);
    const detached = source === JSON.stringify(old);
    FB.save.restore(old); s = FB.state;
    return { detached:detached, records:snapshot(migrated.state.stories) === expected,
      restored:snapshot(s.stories) === expected,
      effects:before === JSON.stringify([s.chars,s.owner,s.holder,s.realms,s.authority,s.log]),
      rng:rng === FB.getRngState(), absent:!s.stories.carolingian_settlements_800,
      phases:[s.stories.divisio_800.phase,s.stories.gifts_800.result,s.stories.ordinatio_800.phase] };
  });
  expect(result).toEqual({ detached:true, records:true, restored:true, effects:true, rng:true, absent:true,
    phases:['planned','agreed','pending'] });
});

for (const damage of ['conflict','missing_opportunity','bad_cast','bad_pressure','bad_plan']) {
  test('bundled 800 migration rejects ' + damage + ' without changing the caller or live campaign', async function ({ page }, testInfo) {
    await observe(page, testInfo);
    const result = await page.evaluate(function (damage) {
      const save = JSON.parse(FB.save.serialize()), source = { cast:save.state.stories.divisio_800.cast,
        pressure:save.state.stories.verdun_800.pressure, opportunities:{} };
      ['divisio','ordinatio','gifts','recognition','verdun'].forEach(function (key) {
        const row = save.state.stories[key + '_800']; delete row.approvals; delete row.cast; delete row.pressure;
        source.opportunities[key] = row; delete save.state.stories[key + '_800'];
      });
      save.state.stories.carolingian_settlements_800 = source;
      if (damage === 'conflict') save.state.stories.gifts_800 = { phase:'pending' };
      if (damage === 'missing_opportunity') delete source.opportunities.gifts;
      if (damage === 'bad_cast') source.cast.harun = 12;
      if (damage === 'bad_pressure') source.pressure.amount = -1;
      if (damage === 'bad_plan') { source.opportunities.divisio.phase = 'planned'; source.opportunities.divisio.turn = 0; source.opportunities.divisio.plan = { shares:[] }; }
      const before = JSON.stringify(save), live = JSON.stringify(FB.state), rng = FB.getRngState();
      let rejected = false;
      try { FB.save.v4.migrate(save); } catch (_) { rejected = true; }
      return { rejected:rejected, caller:before === JSON.stringify(save), live:live === JSON.stringify(FB.state), rng:rng === FB.getRngState() };
    }, damage);
    expect(result).toEqual({ rejected:true, caller:true, live:true, rng:true });
  });
}

test('a player court must review gifts, and changed rulers interrupt its saved authorization', async function ({ page }, testInfo) {
  await observe(page, testInfo);
  const result = await page.evaluate(function () {
    const s = FB.state, originalPlayer = s.player.charId, cast = s.stories.divisio_800.cast;
    s.player.charId = cast.charlemagne; s.date.year = 802;
    s.realms.carolingian_800.treasury.gold = 100; s.realms.abbasid.treasury.gold = 100;
    const rec = s.stories.gifts_800, story = FB.stories.get('gifts_800'), chance = FB.chance;
    let draws = 0;
    try {
      FB.chance = function () { draws++; return true; };
      story.season(s, rec);
      const waited = draws === 0 && rec.phase === 'pending' && s.realms.carolingian_800.treasury.gold === 100;
      const q = FB.stories.quote(s, 'gifts_800', 'approve');
      const review = story.review(s, rec, 'approve', q);
      const authorized = FB.stories.apply(s, 'gifts_800', 'approve', q);
      const consent = Object.keys(rec.approvals).length === 1 && rec.phase === 'pending';
      // An unrelated ruler cannot inherit the prior personal agreement.
      s.player.charId = originalPlayer; FB.killChar(s, s.chars[cast.harun]); story.season(s, rec);
      return { waited:waited, authorized:authorized, consent:consent, review:review.length >= 3,
        result:rec.result, draws:draws, funds:[s.realms.carolingian_800.treasury.gold,s.realms.abbasid.treasury.gold] };
    } finally { FB.chance = chance; s.player.charId = originalPlayer; }
  });
  expect(result).toEqual({ waited:true, authorized:true, consent:true, review:true, result:'interrupted', draws:0, funds:[100,100] });
});

test('800 autonomous attempts keep the original eligibility and RNG order', async function ({ page }, testInfo) {
  await observe(page, testInfo);
  const result = await page.evaluate(function () {
    const s = FB.state, chance = FB.chance, draws = [], candidates = [];
    // Recognition overlaps the divisio window. Earlier embassy gifts have
    // expired; the future designation and treaty consume no random draw.
    s.date.year = 812;
    try {
      FB.chance = function (value) { draws.push(value); return false; };
      ['divisio','ordinatio','gifts','recognition','verdun'].forEach(function (key) {
        const id = key + '_800', rec = s.stories[id];
        FB.stories.get(id).season(s, rec);
        if (rec.attemptSeason !== null) candidates.push(id);
      });
      const before = JSON.stringify(s.stories);
      ['divisio','ordinatio','gifts','recognition','verdun'].forEach(function (key) {
        FB.stories.get(key + '_800').season(s, s.stories[key + '_800']);
      });
      return { candidates:candidates, draws:draws, once:before === JSON.stringify(s.stories), expired:s.stories.gifts_800.result };
    } finally { FB.chance = chance; }
  });
  expect(result).toEqual({ candidates:['divisio_800','recognition_800'], draws:[0.65,0.65], once:true, expired:'expired' });
});

for (const id of ['divisio_800','ordinatio_800','gifts_800','recognition_800','verdun_800']) {
  test(id + ' rejects malformed typed save records on the detached copy', async function ({ page }, testInfo) {
    await observe(page, testInfo);
    const result = await page.evaluate(function (id) {
      const save = JSON.parse(FB.save.serialize()), row = save.state.stories[id];
      row.phase = 'resolved'; row.result = 'agreed'; row.turn = 0;
      row.plan = id === 'recognition_800' ? { recognitionId:17 } : { shares:[] };
      const before = JSON.stringify(save), live = JSON.stringify(FB.state), rng = FB.getRngState();
      let rejected = false;
      try { FB.save.v4.migrate(save); } catch (_) { rejected = true; }
      return { rejected:rejected, caller:before === JSON.stringify(save), live:live === JSON.stringify(FB.state), rng:rng === FB.getRngState() };
    }, id);
    expect(result).toEqual({ rejected:true, caller:true, live:true, rng:true });
  });
}
