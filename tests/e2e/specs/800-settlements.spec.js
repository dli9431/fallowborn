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
  'js/world.js', 'js/royal_settlements.js', 'js/story_carolingian_800.js',
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
}

for (const crazy of [false, true]) {
  test('800 courts link real sons once and preserve their saved identity with flag ' + crazy,
    async function ({ page }, testInfo) {
      if (crazy) await page.addInitScript(function () { window.FB_DISTRIBUTION = 'crazygames'; });
      await observe(page, testInfo, null, crazy);
      const result = await page.evaluate(function () {
        let s = FB.state;
        const rec = s.stories.carolingian_settlements_800;
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
            cast:s.stories.carolingian_settlements_800.cast, opportunities:s.stories.carolingian_settlements_800.opportunities }),
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
      let s = FB.state, rec = s.stories.carolingian_settlements_800;
      s.date.year = 806;
      const before = JSON.stringify([s.owner,s.holder]);
      const q = FB.carolingian800.quote(s, rec, 'divisio');
      const planned = FB.carolingian800.apply(s, rec, 'divisio', q);
      const stable = before === JSON.stringify([s.owner,s.holder]);
      const primary = s.realms.carolingian_800.succession.members[rec.opportunities.divisio.plan.primaryId].charId;
      FB.save.restore(JSON.parse(FB.save.serialize())); s = FB.state; rec = s.stories.carolingian_settlements_800;
      FB.killChar(s, s.chars[rec.cast.charlemagne]);
      FB.stories.get('carolingian_settlements_800').day(s, rec);
      const outcome = rec.opportunities.divisio.result;
      const after = JSON.stringify([s.owner,s.holder,rec]);
      FB.stories.get('carolingian_settlements_800').day(s, rec);
      const once = after === JSON.stringify([s.owner,s.holder,rec]);
      FB.save.restore(JSON.parse(FB.save.serialize()));
      return { planned:planned, stable:stable, heir:FB.realmRulerCharacterSnapshot(FB.state, 'carolingian_800').id === primary,
        owners:[FB.state.owner.aachen,FB.state.owner.bordeaux,FB.state.owner.pavia],
        localRulers:[FB.realmRulerCharacterSnapshot(FB.state, 'aquitaine').id === rec.cast.louis,
          FB.realmRulerCharacterSnapshot(FB.state, 'italy').id === rec.cast.pippin],
        outcome:outcome, once:once, retained:FB.state.stories.carolingian_settlements_800.opportunities.divisio.result === outcome };
    });
    expect(result).toEqual({ planned:true, stable:true, heir:true,
      owners:['carolingian_800','aquitaine','italy'], localRulers:[true,true], outcome:'executed', once:true, retained:true });
  });

test('a surviving son inherits without cloning his court and 817 retains a senior empire',
  async function ({ page }, testInfo) {
    await observe(page, testInfo);
    const result = await page.evaluate(function () {
      const s = FB.state, rec = s.stories.carolingian_settlements_800, family = s.realms.carolingian_800.succession;
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
      const owners = JSON.stringify(s.owner), q = FB.carolingian800.quote(s, rec, 'ordinatio');
      const agreed = FB.carolingian800.apply(s, rec, 'ordinatio', q), plan = rec.opportunities.ordinatio.plan;
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
      const s = FB.state, rec = s.stories.carolingian_settlements_800, story = FB.stories.get('carolingian_settlements_800');
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
      const ord = FB.carolingian800.quote(s, rec, 'ordinatio');
      const agreement = FB.carolingian800.apply(s, rec, 'ordinatio', ord);
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
      const q = FB.carolingian800.quote(s, rec, 'verdun');
      const treaty = FB.carolingian800.apply(s, rec, 'verdun', q);
      const once = !FB.carolingian800.apply(s, rec, 'verdun', q);
      FB.save.restore(JSON.parse(FB.save.serialize()));
      return { agreement:agreement, ordinary:ordinary, treaty:treaty, once:once,
        ended:!FB.ordinaryWarById(FB.state, warId), foreign:FB.state.owner.magdeburg === foreign,
        localHolder:FB.state.holder.chartres === localHolder,
        owners:[FB.state.owner.paris, FB.state.owner.regensburg, FB.state.owner.aachen],
        free:shares.every(function (share) { return !FB.state.realms[share.realmId].liege; }),
        result:FB.state.stories.carolingian_settlements_800.opportunities.verdun.result };
    });
    expect(result).toEqual({ agreement:true, ordinary:true, treaty:true, once:true, ended:true,
      foreign:true, localHolder:true, owners:['carolingian_aquitaine_800','carolingian_bavaria_800','carolingian_800'],
      free:true, result:'agreed' });
  });

test('funded gifts and eastern recognition persist once and stale or hostile terms cannot apply',
  async function ({ page }, testInfo) {
    await observe(page, testInfo);
    const result = await page.evaluate(function () {
      const s = FB.state, rec = s.stories.carolingian_settlements_800;
      s.date.year = 802;
      const crown = s.realms.carolingian_800, abbasid = s.realms.abbasid;
      crown.treasury.gold = 100; abbasid.treasury.gold = 100;
      const q = FB.carolingian800.quote(s, rec, 'gifts');
      abbasid.treasury.gold = 101;
      const stale = !FB.carolingian800.apply(s, rec, 'gifts', q);
      abbasid.treasury.gold = 100;
      const gifts = FB.carolingian800.apply(s, rec, 'gifts', FB.carolingian800.quote(s, rec, 'gifts'));
      const funds = [crown.treasury.gold,abbasid.treasury.gold];
      const peaceful = !!FB.truceExpiry(s, 'carolingian_800', 'abbasid');
      s.date.year = 812;
      const war = FB.registerOrdinaryWar(s, 'carolingian_800', { enemy:'byzantium', target:'venezia', legacy:false,
        casus:{ type:'border', target:'venezia' }, objectives:[{ type:'border', target:'venezia' }] });
      const hostile = !FB.carolingian800.quote(s, rec, 'recognition').allowed;
      FB.settleOrdinaryWar(s, war.id, 'white_peace');
      FB.transferProvince(s, 'venezia', 'carolingian_800');
      const recognition = FB.carolingian800.apply(s, rec, 'recognition', FB.carolingian800.quote(s, rec, 'recognition'));
      const proof = rec.opportunities.recognition.plan.recognitionId;
      FB.save.restore(JSON.parse(FB.save.serialize()));
      const restored = FB.state, actor = { kind:'realm', id:'carolingian_800' };
      const savedRec = restored.stories.carolingian_settlements_800;
      const before = JSON.stringify([restored.realms.carolingian_800.treasury,restored.realms.abbasid.treasury,
        restored.authority.recognitions,restored.owner,savedRec.opportunities.gifts,savedRec.opportunities.recognition]);
      FB.stories.get('carolingian_settlements_800').season(restored, restored.stories.carolingian_settlements_800);
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
      const s = FB.state, rec = s.stories.carolingian_settlements_800, story = FB.stories.get('carolingian_settlements_800');
      s.date.year = 802;
      FB.killChar(s, s.chars[rec.cast.harun]); story.day(s, rec);
      const interrupted = rec.opportunities.gifts.result;
      s.date.year = 812; s.owner.split = 'cordoba'; story.day(s, rec);
      const diverted = rec.opportunities.recognition.result;
      let malformed = false;
      const copy = JSON.parse(JSON.stringify(rec)); copy.opportunities.divisio.phase = 'planned';
      copy.opportunities.divisio.turn = 0; copy.opportunities.divisio.plan = { shares:[] };
      try { story.validate(copy, s); } catch (_) { malformed = true; }
      const source = JSON.stringify(FB.bookmark('800'));
      const snapshot = JSON.stringify([s.owner,s.holder,s.stories]), rng = FB.getRngState();
      FB.stories.status(s, 'carolingian_settlements_800'); FB.carolingian800.quote(s, rec, 'recognition');
      return { interrupted:interrupted, diverted:diverted, malformed:malformed,
        pure:snapshot === JSON.stringify([s.owner,s.holder,s.stories]) && rng === FB.getRngState(),
        source:source === JSON.stringify(FB.bookmark('800')) };
    });
    expect(result).toEqual({ interrupted:'interrupted', diverted:'diverted', malformed:true, pure:true, source:true });
  });

test('867 stays detached and an older 800 save gains no historical people or story on restore',
  async function ({ page }, testInfo) {
    await observe(page, testInfo, '867');
    expect(await page.evaluate(function () { return !!FB.stories.record(FB.state, 'carolingian_settlements_800'); })).toBe(false);
    // A resumable household has its ordinary parents, unlike the observer's
    // placeholder soul, so this isolates historical-story restore behavior.
    await startParityGame(page, testInfo, {
      bookmark:'800', code:'SETTLEMENTS-800-farmer-london-m-Review'
    });
    const result = await page.evaluate(function () {
      delete FB.state.stories.carolingian_settlements_800;
      const before = Object.keys(FB.state.chars).sort().join('|');
      FB.save.restore(JSON.parse(FB.save.serialize()));
      return { absent:!FB.stories.record(FB.state, 'carolingian_settlements_800'),
        people:before === Object.keys(FB.state.chars).sort().join('|') };
    });
    expect(result).toEqual({ absent:true, people:true });
  });
