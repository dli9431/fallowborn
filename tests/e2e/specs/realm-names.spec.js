'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'js/world.js', 'js/title_ids.js', 'js/lexicon.js', 'js/station.js',
  'js/model.js', 'js/save.js', 'js/save_v4.js', 'js/i18n.js', 'js/authority.js',
  'js/governments.js', 'js/ambitions.js', 'js/actions.js', 'js/holywar.js',
  'js/main.js', 'js/messages.js', 'js/politics.js',
  'data/lexicons.js', 'data/eras.js', 'data/bookmarks.js', 'data/bookmark_476.js',
  'data/bookmark_476_italy.js', 'data/bookmark_476_dalmatia_east.js',
  'data/bookmark_476_gaul_iberia.js', 'data/bookmark_476_africa.js',
  'data/counties.js', 'data/map_data.js', 'data/political_institutions.js'
]);
const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { startDeterministicGame } = require('../support/game/start');

test.beforeEach(async function ({ page }, testInfo) {
  await openGame(page, testInfo);
  await startDeterministicGame(page);
  await page.evaluate(function () { FB.game.setPaused(true); });
});

test('generated vassals preserve medieval styles and typed duchy identity', async function ({ page }) {
  const result = await page.evaluate(function () {
    const s = FB.state;
    const duchies = Object.keys(s.realms).map(function (id) { return s.realms[id]; })
      .filter(function (r) { return r.generated && r.nameStyle && r.nameStyle.kind === 'duchy'; });
    const counties = Object.keys(s.realms).map(function (id) { return s.realms[id]; })
      .filter(function (r) { return r.generated && r.nameStyle && r.nameStyle.kind === 'county'; });
    return {
      duchies:duchies.length, counties:counties.length,
      duchyNames:duchies.every(function (r) {
        return r.titleKind === 'duchy' && FBDATA.duchies[r.titleId] &&
          r.name === 'Duchy of ' + FBDATA.duchies[r.titleId].name;
      }),
      countyNames:counties.every(function (r) { return r.name === 'County of ' + r.nameStyle.place; })
    };
  });
  expect(result.duchies).toBeGreaterThan(0);
  expect(result.counties).toBeGreaterThan(0);
  expect(result.duchyNames).toBe(true);
  expect(result.countyNames).toBe(true);
});

test('creation and ducal recognition use the subject government and proper place', async function ({ page }) {
  const result = await page.evaluate(function () {
    const s = FB.state;
    const did = Object.keys(FBDATA.duchies).find(function (id) { return FB.duchyCounties(id).length >= 2; });
    const counties = FB.duchyCounties(did), place = FBDATA.duchies[did].name;
    s.start.era = 'late_antique';
    s.start.defaultGovernment = 'roman_civic';
    const realm = FB.makeVassalRealm(s, { id:'e2e_civic_count', titleKind:'county',
      titleId:counties[0], titlePlace:FB.world.byId[counties[0]].name,
      capital:counties[0], rank:1, liege:null, culture:'frankish', religion:'catholic' });
    FB.authoritySeedGovernments(s, { e2e_civic_count:'regnum' });
    s.authority.governments[realm.id].formId = 'roman_civic';
    counties.forEach(function (pid) { s.owner[pid] = s.holder[pid] = realm.id; });
    FB.invalidateRealmCache();
    const promoted = FB.recognizeCompleteDuchy(s, realm.id, { silent:true });
    const before = realm.name;
    const snapshot = FB.realmRulerTitleSnapshot(s, realm, s.chars[s.player.charId]);
    // The player's terminology must not decide a foreign realm's name.
    s.authority.governments[realm.id] = { formId:'regnum' };
    const foreign = realm.name;
    s.authority.governments[realm.id] = { formId:'roman_civic' };
    return { promoted:promoted, did:did, before:before, foreign:foreign,
      place:place, snapshotPlace:snapshot.place, id:realm.titleId, kind:realm.titleKind };
  });
  expect(result.promoted).toBe(result.did);
  expect(result.kind).toBe('duchy');
  expect(result.id).toBe(result.did);
  expect(result.before).toBe('Province of ' + result.place);
  expect(result.foreign).toBe('District of ' + result.place);
  expect(result.snapshotPlace).toBe(result.place);
});

test('player realm creation resolves kingdom and empire terminology from the lexicon', async function ({ page }) {
  const result = await page.evaluate(function () {
    const s = FB.state, p = s.player;
    const eid = Object.keys(FBDATA.empires).find(function (id) {
      return FB.empireKingdoms(id).filter(function (kid) { return FB.kingdomCounties(kid).length; }).length >= 2;
    });
    const kids = FB.empireKingdoms(eid).filter(function (kid) { return FB.kingdomCounties(kid).length; });
    p.provs = FB.kingdomCounties(kids[0]).slice();
    p.provinceId = p.provs[0]; p.liege = null; p.tier = 6;
    FB.foundPlayerRealm(s);
    FB.authoritySeedGovernments(s, { player:'roman_civic' });
    FB.foundPlayerRealm(s);
    const realm = s.realms.player;
    const kingdom = { name:realm.name, id:realm.titleId, kind:realm.titleKind,
      place:FBDATA.kingdoms[realm.titleId].name, snapshot:FB.titleSnapshot(s).place };
    p.provs = kids.reduce(function (all, kid) { return all.concat(FB.kingdomCounties(kid)); }, []);
    realm.ambitionTitleRegion = kingdom.id;
    FB.foundPlayerRealm(s);
    const preferredKingdom = { kind:realm.titleKind, id:realm.titleId };
    p.tier = 7;
    // A modded empire term exercises the third generated title level.
    FBDATA.lexicons.governments.roman_civic.terms.empire = { one:'imperium', other:'imperia' };
    FB.lexicon.reset();
    FB.foundPlayerRealm(s);
    return { kingdom:kingdom, preferredKingdom:preferredKingdom,
      empire:{ name:realm.name, id:realm.titleId, kind:realm.titleKind,
      place:FBDATA.empires[realm.titleId].name, snapshot:FB.titleSnapshot(s).place } };
  });
  expect(result.kingdom.kind).toBe('kingdom');
  expect(result.kingdom.name).toBe('Diocese of ' + result.kingdom.place);
  expect(result.kingdom.snapshot).toBe(result.kingdom.place);
  expect(result.preferredKingdom).toEqual({ kind:'kingdom', id:result.kingdom.id });
  expect(result.empire.kind).toBe('empire');
  expect(result.empire.name).toBe('Imperium of ' + result.empire.place);
  expect(result.empire.snapshot).toBe(result.empire.place);
});

test('generated naming records and title IDs survive ordinary saves and legacy alias migration', async function ({ page }) {
  const result = await page.evaluate(function () {
    const s = FB.state;
    const rid = Object.keys(s.realms).find(function (id) {
      return s.realms[id].titleKind === 'duchy' && s.realms[id].nameStyle;
    });
    const realm = s.realms[rid];
    const forms = {}; forms[rid] = 'roman_civic';
    FB.authoritySeedGovernments(s, forms);
    const name = realm.name, id = realm.titleId, place = realm.nameStyle.place;
    const saved = JSON.parse(FB.save.serialize());
    const stored = saved.state.realms[rid];
    const noRenderedName = !Object.prototype.hasOwnProperty.call(stored, 'name');
    stored.titleId = 'd_' + id;
    const migrated = FB.save.v4.migrate(saved);
    FB.save.restore(migrated);
    const once = FB.state.realms[rid].name;
    const next = JSON.parse(FB.save.serialize());
    FB.save.restore(next);
    const restored = FB.state.realms[rid];
    return { noRenderedName:noRenderedName, name:name, once:once, twice:restored.name,
      id:id, restoredId:restored.titleId, place:place, snapshotPlace:FB.realmTitlePlace(restored),
      storedStyle:stored.nameStyle };
  });
  expect(result.noRenderedName).toBe(true);
  expect(result.once).toBe(result.name);
  expect(result.twice).toBe(result.name);
  expect(result.restoredId).toBe(result.id);
  expect(result.snapshotPlace).toBe(result.place);
  expect(result.storedStyle).toEqual({ kind:'duchy', place:result.place });
});

test('scripted realm creation preserves an explicit claim behind a custom proper name', async function ({ page }) {
  const result = await page.evaluate(function () {
    const s = JSON.parse(JSON.stringify(FB.state));
    FB.repairRealmNames(s);
    const kid = Object.keys(FBDATA.kingdoms).find(function (id) { return FB.kingdomCounties(id).length; });
    const capital = FB.kingdomCounties(kid)[0];
    const original = FBDATA.scripted;
    FBDATA.scripted = [{ id:'e2e_named_crown', year:s.date.year, season:s.date.season, day:s.date.day,
      newRealm:{ id:'e2e_scripted_crown', name:'The New Court', color:'#123456', capital:capital,
        rank:3, titleKind:'kingdom', titleId:kid }, targets:[capital], news:'A new court takes its seat.' }];
    try {
      FB.scriptedTick(s);
      const realm = s.realms.e2e_scripted_crown;
      return { name:realm.name, kind:realm.titleKind, id:realm.titleId,
        claim:FB.realmKingdomClaim(s, realm.id), expected:kid };
    } finally { FBDATA.scripted = original; }
  });
  expect(result.name).toBe('The New Court');
  expect(result.kind).toBe('kingdom');
  expect(result.id).toBe(result.expected);
  expect(result.claim).toBe(result.expected);
});

test('inheriting a generated crown copies its naming record and canonical claim', async function ({ page }) {
  const result = await page.evaluate(function () {
    const s = FB.state, p = s.player, me = s.chars[p.charId];
    p.tier = 5; p.provs = [p.provinceId]; p.liege = null;
    FB.foundPlayerRealm(s);
    const mine = s.realms.player;
    FB.setRealmTitle(s, mine, 'duchy', Object.keys(FBDATA.duchies)[0]);
    const kid = Object.keys(FBDATA.kingdoms).find(function (id) {
      return FB.kingdomCounties(id).some(function (pid) { return pid !== p.provinceId; });
    });
    const capital = FB.kingdomCounties(kid).find(function (pid) { return pid !== p.provinceId; });
    const inherited = FB.makeVassalRealm(s, { id:'e2e_inherited_crown', titleKind:'kingdom',
      titleId:kid, capital:capital, rank:3, liege:null, culture:'frankish', religion:'catholic' });
    FB.authoritySeedGovernments(s, { player:'roman_civic', e2e_inherited_crown:'regnum' });
    s.owner[capital] = s.holder[capital] = inherited.id;
    FB.invalidateRealmCache();
    const joined = FB.absorbRealm(s, inherited.id, me);
    const news = s.log.find(function (entry) {
      return entry.msg && entry.msg.key === 'news.world.realm_inherited';
    });
    const independentStyle = mine.nameStyle !== inherited.nameStyle;
    inherited.nameStyle.place = 'Changed after inheritance';
    const name = mine.name;
    const saved = JSON.parse(FB.save.serialize());
    const stored = saved.state.realms.player;
    FB.save.restore(FB.save.v4.migrate(saved));
    const restored = FB.state.realms.player;
    return { joined:joined, independentStyle:independentStyle, name:name,
      place:FBDATA.kingdoms[kid].name, kid:kid, style:stored.nameStyle,
      noRenderedName:!Object.prototype.hasOwnProperty.call(stored, 'name'),
      kind:restored.titleKind, id:restored.titleId, restoredName:restored.name,
      titlePlace:FB.realmTitlePlace(restored),
      newsName:news.msg.params.realm.$realmName, newsAudience:news.audience,
      newsText:FB.newsText(news, FB.state) };
  });
  expect(result.joined).toBe(true);
  expect(result.independentStyle).toBe(true);
  expect(result.noRenderedName).toBe(true);
  expect(result.style).toEqual({ kind:'kingdom', place:result.place });
  expect(result.kind).toBe('kingdom');
  expect(result.id).toBe(result.kid);
  expect(result.titlePlace).toBe(result.place);
  expect(result.name).toBe('Diocese of ' + result.place);
  expect(result.restoredName).toBe(result.name);
  expect(result.newsName.place).toBe(result.place);
  expect(result.newsName.term.text).toBe('kingdom');
  expect(result.newsText).toBe('👑 Kingdom of ' + result.place + ' joins your rule by rightful succession.');
  expect(result.newsAudience).toBe(3);
});

for (const hasClaim of [true, false]) {
  test('inheriting a custom realm ' + (hasClaim ? 'copies its explicit claim' : 'clears the previous claim'),
    async function ({ page }) {
      const result = await page.evaluate(function (claim) {
        const s = FB.state, p = s.player;
        p.tier = 6; p.provs = [p.provinceId]; p.liege = null;
        FB.foundPlayerRealm(s);
        const mine = s.realms.player;
        const kids = Object.keys(FBDATA.kingdoms).filter(function (id) { return FB.kingdomCounties(id).length; });
        FB.setRealmTitle(s, mine, 'kingdom', kids[0]);
        const inherited = FB.makeVassalRealm(s, { id:'e2e_custom_inheritance', name:'The New Court',
          capital:FB.kingdomCounties(kids[1])[0], rank:3, liege:null,
          culture:'frankish', religion:'catholic', claimKind:claim ? 'kingdom' : null,
          claimId:claim ? kids[1] : null });
        s.owner[inherited.capital] = s.holder[inherited.capital] = inherited.id;
        FB.invalidateRealmCache();
        const joined = FB.absorbRealm(s, inherited.id, s.chars[p.charId]);
        const saved = JSON.parse(FB.save.serialize());
        FB.save.restore(saved);
        const restored = FB.state.realms.player;
        return { joined:joined, name:restored.name, generated:!!restored.nameStyle,
          kind:restored.titleKind || null, id:restored.titleId || null, expected:kids[1] };
      }, hasClaim);
      expect(result.joined).toBe(true);
      expect(result.name).toBe('The New Court');
      expect(result.generated).toBe(false);
      expect(result.kind).toBe(hasClaim ? 'kingdom' : null);
      expect(result.id).toBe(hasClaim ? result.expected : null);
    });
}

test('a lesser inheritance preserves the player’s primary naming record and claim', async function ({ page }) {
  const result = await page.evaluate(function () {
    const s = FB.state, p = s.player;
    p.tier = 6; p.provs = [p.provinceId]; p.liege = null;
    FB.foundPlayerRealm(s);
    const mine = s.realms.player;
    const kid = Object.keys(FBDATA.kingdoms)[0];
    FB.setRealmTitle(s, mine, 'kingdom', kid);
    const before = JSON.stringify(mine.nameStyle);
    const did = Object.keys(FBDATA.duchies).find(function (id) {
      return FB.duchyCounties(id).some(function (pid) { return pid !== p.provinceId; });
    });
    const inherited = FB.makeVassalRealm(s, { id:'e2e_lesser_inheritance', titleKind:'duchy',
      titleId:did, capital:FB.duchyCounties(did).find(function (pid) { return pid !== p.provinceId; }),
      rank:2, liege:null, culture:'frankish', religion:'catholic' });
    s.owner[inherited.capital] = s.holder[inherited.capital] = inherited.id;
    FB.invalidateRealmCache();
    return { joined:FB.absorbRealm(s, inherited.id, s.chars[p.charId]),
      preserved:JSON.stringify(mine.nameStyle) === before,
      kind:mine.titleKind, id:mine.titleId, expected:kid };
  });
  expect(result.joined).toBe(true);
  expect(result.preserved).toBe(true);
  expect(result.kind).toBe('kingdom');
  expect(result.id).toBe(result.expected);
});
