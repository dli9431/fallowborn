'use strict';
const fs = require('fs');
const path = require('path');
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'data/story_instances.js',
  'data/story_courts_476.js',
  'index.html', 'data/bookmark_476.js',
  'data/bookmark_476_wider.js', 'data/bookmark_476_wider_identities.js', 'data/geography_expansion.js',
  'data/bookmark_476_italy.js', 'data/bookmark_476_dalmatia_east.js',
  'data/bookmark_476_gaul_iberia.js', 'data/bookmark_476_africa.js',
  'data/bookmark_476_outer.js', 'data/mobile_confederations.js', 'data/assembly_polities.js',
  'data/counties.js', 'data/bookmarks.js', 'data/geographies.js',
  'data/climate.js', 'data/settlements.js', 'data/settlements_real.js',
  'data/eras.js', 'data/lexicons.js', 'js/world.js', 'js/title_ids.js',
  'js/climate.js', 'js/governments.js', 'js/lexicon.js', 'js/main.js',
  'js/stories.js', 'js/story_courts.js', 'js/authority.js',
  'js/armies.js', 'js/wars.js', 'js/save.js', 'js/save_v4.js'
]);
const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');

async function observe(page, testInfo, id) {
  await openGame(page, testInfo);
  const error = await page.evaluate(function (bookmarkId) {
    return new Promise(function (resolve) {
      FB.activateBookmark(bookmarkId, null, function (fault) {
        if (fault) { resolve(fault.message); return; }
        FB.game.pending = { seed:'AUTHORED-476-MAP' };
        FB.game.startObserve();
        FB.game.setPaused(true);
        resolve(null);
      });
    });
  }, id || '476');
  expect(error).toBe(null);
}

test('476 declarations do not read or remap another bookmark', async function ({}, testInfo) {
  test.skip(testInfo.project.name !== 'chromium-served', 'One source inspection is sufficient.');
  const root = path.resolve(__dirname, '../../..');
  for (const name of ['bookmark_476', 'bookmark_476_italy', 'bookmark_476_dalmatia_east',
    'bookmark_476_gaul_iberia', 'bookmark_476_africa', 'bookmark_476_outer']) {
    const source = fs.readFileSync(path.join(root, 'data', name + '.js'), 'utf8');
    expect(source).not.toMatch(/bookmarks\s*\[\s*['"](?:867|1066)['"]\s*\]/);
    expect(source).not.toMatch(/\bfunction\s*\(|\.map\s*\(|\.forEach\s*\(|\bcuratedSites\b/);
  }
});

test('476 owns a complete stable grid and independent Roman hierarchy', async function ({ page }, testInfo) {
  await observe(page, testInfo);
  const result = await page.evaluate(function () {
    const s = FB.state, b = FB.bookmark('476'), earlier = FB.bookmark('867');
    const inhabited = b.provinces.filter(function (p) { return !p.wasteland; });
    const titles = ['duchies', 'kingdoms', 'empires'];
    const before = JSON.stringify(earlier);
    const roman = inhabited.filter(function (p) {
      return ['italy','croatia','byzantium'].indexOf(p.realm) >= 0;
    });
    const custom = inhabited.filter(function (p) {
      return ['italy','croatia','byzantium'].indexOf(p.realm) < 0;
    });
    const snapshot = JSON.stringify(b);
    // Editing medieval politics cannot alter the already-authored 476 data.
    const medieval = earlier.provinces.find(function (p) { return p.id === 'ravenna'; });
    const owner = medieval.realm, level = medieval.duchy;
    let independent = false;
    try {
      medieval.realm = 'e2e_replaced'; medieval.duchy = null;
      independent = snapshot === JSON.stringify(b);
    }
    finally { medieval.realm = owner; medieval.duchy = level; }
    return {
      faults:FB.validateBookmark(b),
      stable:FB.bookmark('476','baseline').provinces.map(function (p) { return p.id; }).sort().join('|') ===
        earlier.provinces.map(function (p) { return p.id; }).sort().join('|'),
      unique:new Set(b.provinces.map(function (p) { return p.id; })).size === b.provinces.length,
      direct:inhabited.every(function (p) { return s.owner[p.id] === FB.topRealm(s,p.realm) && s.holder[p.id] === p.realm; }),
      names:FB.world.provs.every(function (p) { return typeof p.name === 'string' && p.name.length > 0; }),
      roman:roman.every(function (p) {
        const d = b.duchies[p.duchy], k = d && b.kingdoms[d.kingdom];
        return !!(d && k && b.empires[k.empire]);
      }),
      custom:custom.length > 0 && custom.every(function (p) {
        return !p.duchy && !FB.dejureOf(p.id).duchy;
      }),
      fresh:titles.every(function (table) {
        return b[table] !== earlier[table] && Object.keys(b[table]).every(function (id) {
          return /^(d|k|e)_476_/.test(id) && !earlier[table][id];
        });
      }),
      unchanged:independent && snapshot === JSON.stringify(b) && before === JSON.stringify(earlier),
      completed:['novgorod','nicosia','kiev','mecca','praha'].every(function (id) {
        const p = b.provinces.find(function (row) { return row.id === id; });
        return !p.wasteland && s.owner[id] === p.realm && s.holder[id] === p.realm;
      }),
      wider:['london','birka','antioch','jerusalem','baghdad','cashel','tallinn','cherson'].every(function (id) {
        const p = b.provinces.find(function (row) { return row.id === id; });
        return !p.wasteland && s.owner[id] === p.realm && s.holder[id] === p.realm;
      }),
      words:['duchy','kingdom','empire'].map(function (kind) {
        return FB.titleLevels.name(s, kind, { realm:'italy', viewer:null });
      })
    };
  });
  expect(result).toEqual({ faults:[], stable:true, unique:true, direct:true, names:true,
    roman:true, custom:true, fresh:true, unchanged:true, completed:true, wider:true,
    words:['province','diocese','prefecture'] });
});

test('476 title chains stay canonical through activation and an immediate save restore', async function ({ page }, testInfo) {
  await observe(page, testInfo);
  const result = await page.evaluate(function () {
    const book = FB.bookmark('476'), before = JSON.stringify(book);
    const normalization = FB.titleIds.normalizeBookmark(book);
    const typed = { kind:'duchy', id:'d_476_flaminia_picenum' };
    const migrated = FB.titleIds.migrateState({ claim:typed }, book);
    const invalidRank = JSON.parse(JSON.stringify(book));
    invalidRank.kingdoms.k_476_italia_annonaria.empire = 'k_476_italy';
    const missingParent = JSON.parse(JSON.stringify(book));
    missingParent.kingdoms.k_476_italia_annonaria.empire = 'e_476_missing';
    const ambiguous = JSON.parse(JSON.stringify(book));
    ambiguous.empires['476_italy'] = ambiguous.empires.e_476_italy;
    const chains = FB.world.provs.filter(function (p) { return !p.wasteland && p.duchy; })
      .every(function (p) {
        const d = normalization.duchies[p.duchy], k = d && normalization.kingdoms[d.kingdom];
        const dj = FB.dejureOf(p.id);
        return !!d && !!k && !!normalization.empires[k.empire] &&
          dj.duchy === p.duchy && dj.kingdom === d.kingdom && dj.empire === k.empire;
      });
    const expected = FB.dejureOf('ravenna');
    FB.setRealmTitle(FB.state, FB.state.realms.italy, 'empire', expected.empire);
    const saved = JSON.parse(FB.save.serialize());
    FB.save.restore(saved);
    return { faults:FB.validateBookmark(book), chains:chains,
      normalized:['duchies', 'kingdoms', 'empires'].every(function (table) {
        return Object.keys(normalization[table]).every(function (id) { return /^476_[a-z][a-z0-9_]*$/.test(id); });
      }),
      wrongRank:FB.validateBookmark(invalidRank).some(function (error) { return /Missing empire title/.test(error); }),
      missingParent:FB.validateBookmark(missingParent).some(function (error) { return /Missing empire title/.test(error); }),
      ambiguous:FB.validateBookmark(ambiguous).some(function (error) { return /Ambiguous empire title aliases/.test(error); }),
      claim:migrated.claim, ravenna:FB.dejureOf('ravenna'),
      restoredClaim:[FB.state.realms.italy.titleKind, FB.state.realms.italy.titleId],
      retained:JSON.stringify(expected) === JSON.stringify(FB.dejureOf('ravenna')),
      unchanged:before === JSON.stringify(book) };
  });
  expect(result).toEqual({ faults:[], chains:true, normalized:true,
    wrongRank:true, missingParent:true, ambiguous:true,
    claim:{ kind:'duchy', id:'476_flaminia_picenum' },
    ravenna:{ duchy:'476_flaminia_picenum', kingdom:'476_italia_annonaria', empire:'476_italy' },
    restoredClaim:['empire', '476_italy'],
    retained:true, unchanged:true });
});

test('period owners, seats, Gothic bodies and generated rulers follow the spring snapshot', async function ({ page }, testInfo) {
  await observe(page, testInfo);
  const result = await page.evaluate(function () {
    const s = FB.state, b = FB.bookmark('476'), w = s.stories.western_court_476;
    const cell = function (id) { return b.provinces.find(function (p) { return p.id === id; }); };
    const realm = function (id) { return b.realms.find(function (r) { return r.id === id; }); };
    return {
      vandal:['palermo','messina','siracusa','cagliari','sassari','ajaccio','mallorca']
        .every(function (id) { return cell(id).realm === 'aghlabids' && !cell(id).duchy; }),
      italian:['bari','foggia','taranto','brindisi','cosenza','reggio','linz']
        .every(function (id) { return cell(id).realm === 'italy'; }),
      provence:['arles','marseille'].map(function (id) { return cell(id).realm; }),
      seats:[realm('west_francia').capital, realm('franks_476').capital,
        realm('burgundy').capital, realm('suebi_476').capital],
      burgundian:FB.realmRulerCharacterSnapshot(s, 'burgundy').name,
      heir:s.realms.burgundy.succession.members[s.realms.burgundy.succession.heirId].name,
      junior:[s.chars[w.gundobadId].homeProvinceId, s.chars[w.godegiselId].homeProvinceId],
      amal:[realm('pannonia').nonTerritorial, realm('pannonia').capital,
        FB.realmTerritory(s, 'pannonia').length, s.owner.thessaloniki],
      strabo:[realm('thracian_goths_476').nonTerritorial,
        FB.realmRulerCharacterSnapshot(s, 'thracian_goths_476').name],
      pannonian:s.owner.sirmium,
      hosts:['host_476_amal','host_476_thracian'].map(function (id) {
        const host = s.armies.find(function (a) { return a.id === id; });
        return [host.realm, host.at, host.men > 0];
      }),
      zeno:[s.chars[w.zenoId].homeProvinceId, w.zenoCourt.site, s.owner.ikonion],
      generated:['suebi_476','armorica_476','mauri_476','altava_476','tingitana_476','rhein_franks_476','gepids_476']
        .every(function (id) {
          const r = realm(id), c = FB.realmRulerCharacterSnapshot(s, id);
          return r.ruler.generated === true && !r.ruler.name && c.generated === true &&
            typeof c.name === 'string' && !/Delegate|Chieftain/.test(c.name);
        })
    };
  });
  expect(result).toEqual({ vandal:true, italian:true, provence:['aquitaine','aquitaine'],
    seats:['laon','ghent','lyon','lugo'], burgundian:'Chilperic I', heir:'Gundobad',
    junior:['vienne','geneva'], amal:[true,'thessaloniki',0,'byzantium'],
    strabo:[true,'Theoderic Strabo'], pannonian:'gepids_476',
    hosts:[['pannonia','thessaloniki',true],['thracian_goths_476','adrianople',true]],
    zeno:['ikonion','isauria_476','byzantium'], generated:true });
});

test('476 layouts and local climates survive save restore without changing medieval geography', async function ({ page }, testInfo) {
  await observe(page, testInfo);
  const result = await page.evaluate(function () {
    const base = FBDATA.geographies.europe_regional;
    const before = JSON.stringify(base.climate), s = FB.state;
    const sites = function (id) {
      return FB.world.sitesByProv[id].list.filter(function (site) { return site.authored; })
        .map(function (site) { return site.site; });
    };
    const layouts = ['ravenna','split','tunis','kairouan','roma','laon','ghent'].map(sites);
    const seasons = function () {
      return ['ravenna','milano','ikonion','sirte'].map(function (id) {
        return [FB.climateZoneOf(id), FB.seasonKindAt(id, 1), FB.seasonKindAt(id, 3),
          FB.seasonKindHasAt(id, 3, 'hardship')];
      });
    };
    const initial = seasons();
    const names = ['pavia','venezia','lugo','laon','siracusa'].map(function (id) {
      return FB.world.byId[id].name;
    });
    const saved = JSON.parse(FB.save.serialize());
    FB.save.restore(saved);
    return { layouts:layouts, initial:initial, restored:seasons(), names:names,
      base:before === JSON.stringify(base.climate), geography:FB.activeGeographyId,
      noZoneState:!saved.state.climate,
      raw:FB.bookmark('476').provinces.every(function (p) { return p.settlements === undefined; }) };
  });
  expect(result.layouts).toEqual([
    ['ravenna_476','classis_476'], ['salona_476','split'], ['carthage_476'],
    ['sufetula_476','hadrumetum_476'], ['roma','ostia','portus_476'], ['soissons_476'], ['tournai_476']
  ]);
  expect(result.initial).toEqual([
    ['mediterranean','dry_summer','mild_winter',false],
    ['northern_temperate','summer','winter',true],
    ['continental','summer','winter',true], ['arid','hot_dry','cool_season',false]
  ]);
  expect(result.restored).toEqual(result.initial);
  expect(result.names).toEqual(['Ticinum','Altinum','Lucus Augusti','Augusta Suessionum','Syracusae']);
  expect(result.base).toBe(true);
  expect(result.geography).toBe('europe_regional_2');
  expect(result.noZoneState).toBe(true);
  expect(result.raw).toBe(true);
  for (const id of ['867','1066']) {
    const error = await page.evaluate(function (id) {
      return new Promise(function (resolve) {
        FB.activateBookmark(id, null, function (error) {
          resolve(error ? error.message : null);
        });
      });
    }, id);
    expect(error).toBe(null);
    expect(await page.evaluate(function () {
      return [FB.world.byId.siracusa.name, FB.climateZoneOf('ravenna'),
        FB.seasonKindAt('ravenna', 3)];
    })).toEqual(['Siracusa','northern_temperate','winter']);
  }
});

test('bookmark climate overrides and generated profiles reject malformed authoring', async function ({ page }, testInfo) {
  await openGame(page, testInfo);
  const result = await page.evaluate(function () {
    const b = FB.bookmark('476');
    const badZone = FB.validateBookmark(Object.assign({}, b,
      { climate:{ provinces:{ ravenna:'missing_zone' } } }));
    const badCounty = FB.validateBookmark(Object.assign({}, b,
      { climate:{ provinces:{ missing_county:'mediterranean' } } }));
    const malformed = Object.assign({}, b, { realms:b.realms.map(function (r) {
      return r.id !== 'suebi_476' ? r : Object.assign({}, r,
        { ruler:Object.assign({}, r.ruler, { generated:'yes' }) });
    }) });
    return { badZone:badZone.join('|'), badCounty:badCounty.join('|'),
      malformed:FB.validateBookmark(malformed).join('|') };
  });
  expect(result.badZone).toContain('unknown zone missing_zone');
  expect(result.badCounty).toContain('unknown county missing_county');
  expect(result.malformed).toContain('suebi_476 has an invalid ruler profile');
});

test('the authored 476 world runs one season and restores valid ownership and title ids', async function ({ page }, testInfo) {
  await observe(page, testInfo);
  const result = await page.evaluate(function () {
    const s = FB.state, initialTurn = s.turn;
    const authored = JSON.stringify(FB.bookmark('476'));
    for (let i = 0; i < 90; i++) {
      const turn = s.turn;
      FB.game.passDay({ deferUi:true });
      if (s.turn !== turn + 1) throw new Error('Observer stalled at day ' + i);
    }
    FB.save.restore(JSON.parse(FB.save.serialize()));
    const restored = FB.state;
    return { days:restored.turn - initialTurn, faults:FB.validateBookmark(FB.bookmark('476')),
      unchanged:authored === JSON.stringify(FB.bookmark('476')),
      valid:FB.world.provs.filter(function (p) { return !p.wasteland; }).every(function (p) {
        return !!restored.realms[restored.owner[p.id]] && !!restored.realms[restored.holder[p.id]] &&
          typeof p.name === 'string' && p.name.length > 0 &&
          (!p.duchy || /^476_[a-z][a-z0-9_]*$/.test(p.duchy));
      }),
      synthetic:!Object.keys(restored.realms).some(function (id) { return /undefined|null/.test(id); }) };
  });
  expect(result).toEqual({ days:90, faults:[], unchanged:true, valid:true, synthetic:true });
});
