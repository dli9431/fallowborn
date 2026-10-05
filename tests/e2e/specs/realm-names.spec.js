'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'js/world.js', 'js/title_ids.js', 'js/lexicon.js', 'js/station.js',
  'js/model.js', 'js/save.js', 'js/save_v4.js', 'js/i18n.js', 'js/authority.js',
  'js/governments.js', 'js/ambitions.js', 'js/actions.js', 'js/holywar.js',
  'js/main.js', 'js/messages.js', 'js/politics.js',
  'data/lexicons.js', 'data/eras.js', 'data/bookmarks.js', 'data/bookmark_476.js',
  'data/counties.js', 'data/map_data.js'
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
