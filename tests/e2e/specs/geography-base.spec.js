'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'data/bookmark_476_wider.js', 'data/bookmark_476_wider_identities.js', 'data/geography_expansion.js',
  'data/bookmark_867_expansion.js', 'data/government_rollout.js',
  'data/map_data.js', 'data/counties.js', 'data/bookmarks.js',
  'data/bookmark_476.js',
  'data/bookmark_476_italy.js', 'data/bookmark_476_dalmatia_east.js',
  'data/bookmark_476_gaul_iberia.js', 'data/bookmark_476_africa.js', 'data/settlements.js', 'data/settlements_real.js',
  'data/geographies.js', 'data/eras.js', 'data/cultures.js',
  'js/util.js', 'js/world.js', 'js/title_ids.js', 'js/mods.js', 'js/mapview.js',
  'js/actions.js', 'js/main.js', 'js/save.js', 'js/save_v4.js'
]);
const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { startDeterministicGame } = require('../support/game/start');

/* Geography bases (docs/designs/provinces.md, Geography bases): retained
   bookmarks draw on europe_regional and expanded 476 uses its additive child; names follow the start year, layouts
   fall back to the base's default, and legacy geometry mods still apply. */

async function activate(page, id, revision) {
  return page.evaluate(function (input) {
    return new Promise(function (resolve) {
      FB.activateBookmark(input.id, null, function (error) {
        resolve(error ? String(error.message) : null);
      }, input.revision ? {revision:input.revision} : undefined);
    });
  }, {id:id,revision:revision});
}

test('europe_regional owns the legacy geometry and every core bookmark names it',
  async function ({ page }, testInfo) {
    test.setTimeout(120 * 1000);
    await openGame(page, testInfo);
    expect(await activate(page, '867', 'baseline')).toBe(null);
    const result = await page.evaluate(function () {
      const g = FBDATA.geographies.europe_regional;
      return {
        defaultGeography:FBDATA.defaultGeography,
        references:[g.bounds === FBDATA.bounds, g.land === FBDATA.land,
          g.seas === FBDATA.seas, g.rivers === FBDATA.rivers,
          g.straits === FBDATA.bookmarks['867'].straits,
          g.crossingClasses === FBDATA.bookmarks['867'].crossingClasses,
          g.provinces === FBDATA.bookmarks['867'].provinces],
        gridWidth:g.gridWidth,
        declared:['867', '1066', '476'].map(function (id) {
          return FBDATA.bookmarks[id].geography;
        }),
        faults:FB.validateGeography('europe_regional'),
        active:FB.activeGeographyId,
        projected:[FB.proj.W, FB.world.W, FB.proj.H === FB.world.H],
        scale:[FB.mapScale('siteSnapMax'), FB.mapScale('raidOverlandPx'),
          FB.mapScale('aiSeaRaidReachSq')],
        layouts:Object.keys(FBDATA.settlementLayouts).sort()
      };
    });
    expect(result.defaultGeography).toBe('europe_regional');
    expect(result.references).toEqual([true, true, true, true, true, true, true]);
    expect(result.gridWidth).toBe(1100);
    expect(result.declared).toEqual(['europe_regional', 'europe_regional', 'europe_regional']);
    expect(result.faults).toEqual([]);
    expect(result.active).toBe('europe_regional');
    expect(result.projected).toEqual([1100, 1100, true]);
    expect(result.scale).toEqual([45, 85, 28000]);
    expect(result.layouts).toEqual(expect.arrayContaining(['1066', '476', '476_wider_v2', '867', '867_inhabited_v2']));
  });

test('dated names prefer a matching culture and respect inclusive year windows',
  async function ({ page }, testInfo) {
    await openGame(page, testInfo);
    const result = await page.evaluate(function () {
      const list = [
        { to:499, name:'Ticinum' },
        { from:500, to:899, name:'Papia', culture:'lombard' },
        { from:500, name:'Pavia' }
      ];
      return [
        FB.datedPlaceName(list, 476, 'roman'),
        FB.datedPlaceName(list, 499, 'lombard'),
        FB.datedPlaceName(list, 500, 'lombard'),
        FB.datedPlaceName(list, 700, 'italian'),
        FB.datedPlaceName(list, 900, 'lombard'),
        FB.datedPlaceName([{ to:400, name:'Old' }], 476, 'roman'),
        FB.datedPlaceName(null, 476, 'roman')
      ];
    });
    expect(result).toEqual(['Ticinum', 'Ticinum', 'Papia', 'Pavia', 'Pavia', null, null]);
  });

test('476 resolves its period county names and heads from the date without mutating data',
  async function ({ page }, testInfo) {
    test.setTimeout(120 * 1000);
    await openGame(page, testInfo);
    expect(await activate(page, '476')).toBe(null);
    const late = await page.evaluate(function () {
      const raw = FB.bookmark('476').provinces.filter(function (p) {
        return p.id === 'barcelona' || p.id === 'split';
      });
      function head(pid) {
        const site = FB.world.sitesByProv[pid].list[0];
        return [site.site, site.name, site.kind, site.authored];
      }
      return {
        names:['barcelona', 'split', 'tunis', 'kairouan', 'fes', 'ravenna'].map(function (pid) {
          return FB.world.byId[pid].name;
        }),
        heads:[head('barcelona'), head('fes'), head('pliska'), head('split')],
        explicit:FB.world.sitesByProv.paris.list[0].site,
        raw:raw.map(function (p) {
          return [p.id, p.name, p.settlements === undefined];
        }).sort(function (a, b) { return a[0] < b[0] ? -1 : 1; }),
        geography:FB.activeGeographyId
      };
    });
    expect(late.names).toEqual(['Barcino', 'Salona', 'Carthage', 'Byzacena',
      'Volubilis', 'Ravenna']);
    expect(late.heads).toEqual([
      ['barcelona_476', 'Barcino', 'city', true],
      ['fes_476', 'Volubilis', 'town', true],
      ['pliska_476', 'Abritus', 'town', true],
      ['salona_476', 'Salona', 'city', true]
    ]);
    expect(late.explicit).toBe('paris_476');
    expect(late.raw).toEqual([['barcelona', 'Barcelona', true], ['split', 'Split', true]]);
    expect(late.geography).toBe('europe_regional_2');

    for (const id of ['867', '1066']) {
      expect(await activate(page, id)).toBe(null);
      const medieval = await page.evaluate(function () {
        return ['barcelona', 'split', 'tunis'].map(function (pid) {
          return FB.world.byId[pid].name;
        }).concat([FB.world.sitesByProv.barcelona.list[0].site]);
      });
      expect(medieval.slice(0, 3)).toEqual(['Barcelona', 'Split', 'Tunis']);
      expect(medieval[3]).not.toBe('barcelona_476');
    }
  });

test('site names and province names follow a bookmark start year and culture',
  async function ({ page }, testInfo) {
    test.setTimeout(120 * 1000);
    await openGame(page, testInfo);
    await page.evaluate(function () {
      const names = FBDATA.geographies.europe_regional.names;
      window.__savedNames = { roma:names.provinces.roma, ostia:names.sites.ostia };
      names.provinces.roma = [{ to:600, name:'Urbs' },
        { to:600, name:'Urbs Roma', culture:'roman' }];
      names.sites.ostia = [{ to:600, name:'Ostia Antica' }];
      FBDATA.bookmarks.geo_names = Object.assign({}, FB.bookmark('476','baseline'), { id:'geo_names',revision:'baseline' });
    });
    try {
      expect(await activate(page, 'geo_names')).toBe(null);
      const result = await page.evaluate(function () {
        return {
          roma:FB.world.byId.roma.name,
          romaCulture:FB.world.byId.roma.culture,
          sites:FB.world.sitesByProv.roma.list.slice(0, 2).map(function (site) {
            return site.site + ':' + site.name;
          })
        };
      });
      expect(result.romaCulture).toBe('roman');
      expect(result.roma).toBe('Urbs Roma');
      expect(result.sites).toEqual(['roma:Rome', 'ostia:Ostia Antica']);
    } finally {
      await page.evaluate(function () {
        const names = FBDATA.geographies.europe_regional.names;
        if (window.__savedNames.roma) names.provinces.roma = window.__savedNames.roma;
        else delete names.provinces.roma;
        if (window.__savedNames.ostia) names.sites.ostia = window.__savedNames.ostia;
        else delete names.sites.ostia;
        delete FBDATA.bookmarks.geo_names;
      });
    }
  });

test('a bookmark without layouts of its own falls back to the default layout',
  async function ({ page }, testInfo) {
    test.setTimeout(180 * 1000);
    await openGame(page, testInfo);
    await page.evaluate(function () {
      const base = FB.bookmark('867','baseline');
      function stripped(move) {
        return base.provinces.map(function (p) {
          if (p.wasteland) return p;
          const q = Object.assign({}, p);
          delete q.settlements;
          if (move && q.id === 'london') q.x += 0.5;
          return q;
        });
      }
      FBDATA.bookmarks.geo_fallback = Object.assign({}, base,
        { id:'geo_fallback', provinces:stripped(true) });
      FBDATA.bookmarks.geo_none = Object.assign({}, base,
        { id:'geo_none', provinces:stripped(false), settlementLayout:null });
    });
    try {
      expect(await activate(page, 'geo_fallback')).toBe(null);
      const fallback = await page.evaluate(function () {
        const roma = FB.activeBookmark.provinces.filter(function (p) {
          return p.id === 'roma';
        })[0];
        const expected = FBDATA.settlementLayouts['867'].roma;
        return {
          sameEntries:JSON.stringify(roma.settlements) === JSON.stringify(expected),
          copied:roma.settlements !== expected && roma.settlements[0] !== expected[0],
          romaHead:FB.world.sitesByProv.roma.list[0].site,
          romaAuthored:FB.world.sitesByProv.roma.list[0].authored,
          movedLondonAuthored:FB.world.sitesByProv.london.list[0].authored,
          rawUntouched:FBDATA.bookmarks.geo_fallback.provinces.every(function (p) {
            return p.wasteland || p.settlements === undefined;
          })
        };
      });
      expect(fallback).toEqual({ sameEntries:true, copied:true, romaHead:'roma',
        romaAuthored:true, movedLondonAuthored:false, rawUntouched:true });

      expect(await activate(page, 'geo_none')).toBe(null);
      const none = await page.evaluate(function () {
        return FB.world.sitesByProv.roma.list[0].authored;
      });
      expect(none).toBe(false);
    } finally {
      await page.evaluate(function () {
        delete FBDATA.bookmarks.geo_fallback;
        delete FBDATA.bookmarks.geo_none;
      });
    }
  });

test('loading uses the saved geography while new activation uses the edited bookmark and its own cache',
  async function ({ page }, testInfo) {
    test.setTimeout(180 * 1000);
    await openGame(page, testInfo);
    await startDeterministicGame(page);
    const result = await page.evaluate(async function () {
      const saved = JSON.parse(FB.save.serialize()), originalWorld = FB.world;
      const id = saved.state.start.id, original = saved.state.start.geography;
      const base = FBDATA.geographies[original];
      FBDATA.geographies.e2e_changed_base = Object.assign({}, base, {
        gridWidth:900,
        names:Object.assign({}, base.names, { provinces:Object.assign({}, base.names.provinces, {
          london:[{ name:'Changed London' }]
        }) })
      });
      const raw = FBDATA.bookmarks[id];
      raw.revisions.e2e_changed = Object.assign({},raw.revisions[raw.revision],{geography:'e2e_changed_base'});
      raw.revision = 'e2e_changed';
      function activate(options) {
        return new Promise(function (resolve, reject) {
          FB.activateBookmark(id, null, function (error) {
            if (error) reject(error); else resolve();
          }, options);
        });
      }
      await activate();
      const changedWorld = FB.world;
      const changed = { geography:FB.activeGeographyId, width:FB.world.W,
        name:FB.world.byId.london.name };
      await new Promise(function (resolve, reject) {
        if (!FB.game.loadData(saved, resolve)) reject(new Error('Load rejected'));
      });
      const restored = { geography:FB.activeGeographyId, width:FB.world.W,
        stamp:FB.state.start.geography, name:FB.world.byId.london.name,
        sameWorld:FB.world === originalWorld, loadError:FB.game.lastLoadError,
        roundTrip:JSON.parse(FB.save.serialize()).state.start.geography };
      await activate();
      const reused = FB.world === changedWorld;
      const unknown = await new Promise(function (resolve) {
        FB.activateBookmark(id, null, function (error) { resolve(error && error.message); },
          { geography:'e2e_missing_base' });
      });
      const unchanged = FB.world === changedWorld;
      return { original:original, originalWidth:originalWorld.W, changed:changed,
        restored:restored, reused:reused, unknown:unknown, unchanged:unchanged,
        declared:FB.bookmark(id).geography };
    });
    expect(result.changed).toEqual({ geography:'e2e_changed_base', width:900, name:'Changed London' });
    expect(result.restored).toEqual({ geography:result.original, width:result.originalWidth,
      stamp:result.original, name:'London', sameWorld:true, loadError:null, roundTrip:result.original });
    expect(result.reused).toBe(true);
    expect(result.unknown).toContain('Saved geography does not match its world revision');
    expect(result.unchanged).toBe(true);
    expect(result.declared).toBe('e2e_changed_base');
  });

test('concurrent activations of one bookmark keep different saved bases separate',
  async function ({ page }, testInfo) {
    test.setTimeout(180 * 1000);
    await openGame(page, testInfo);
    const result = await page.evaluate(async function () {
      const bm = FB.bookmark('867'), baseId = FB.bookmarkGeography(bm);
      const base = FBDATA.geographies[baseId];
      FBDATA.geographies.e2e_queued_base = Object.assign({}, base, { gridWidth:900 });
      FBDATA.bookmarks.e2e_queued = Object.assign({}, bm, { id:'e2e_queued', revision:'baseline',
        revisions:{baseline:{},queued:{geography:'e2e_queued_base'}} });
      function activate(revision,geography) {
        return new Promise(function (resolve, reject) {
          FB.activateBookmark('e2e_queued', null, function (error) {
            if (error) reject(error);
            else resolve({ geography:FB.activeGeographyId, width:FB.world.W });
          }, { revision:revision,geography:geography });
        });
      }
      return {base:baseId,rows:await Promise.all([activate('baseline',baseId), activate('queued','e2e_queued_base')])};
    });
    expect(result.rows).toEqual([{ geography:result.base, width:1100 },
      { geography:'e2e_queued_base', width:900 }]);
  });

test('legacy geometry mods replace the default geography and new bases validate',
  async function ({ page }, testInfo) {
    await openGame(page, testInfo);
    const result = await page.evaluate(function () {
      const g = FBDATA.geographies.europe_regional;
      const bounds = Object.assign({}, FBDATA.bounds);
      const rivers = FBDATA.rivers.slice();
      FB.mods.apply({ bounds:bounds, rivers:rivers });
      const legacy = [g.bounds === bounds, FBDATA.bounds === bounds,
        g.rivers === rivers, FBDATA.rivers === rivers,
        FB.mods.bookmarkAvailable('1066')];
      const region = {
        bounds:{ lonMin:120, lonMax:150, latMin:28, latMax:46 },
        land:[[125, 30, 145, 30, 145, 44, 125, 44]],
        gridWidth:900,
        knowledge:{ basins:{ east:{ provinces:['edo'] } },
          routes:[{ from:'east', to:'east' }] },
        provinces:[{ id:'edo', x:139.7, y:35.7, terrain:'farmland' }]
      };
      let rejected = '';
      try { FB.mods.apply({ geographies:{ test_region:region } }); }
      catch (error) { rejected = error.message; }
      region.knowledge.basins.west = { provinces:['edo'] };
      region.knowledge.routes = [{ from:'east', to:'west' }];
      FB.mods.apply({ geographies:{ test_region:region } });
      return {
        legacy:legacy,
        rejected:rejected,
        accepted:FBDATA.geographies.test_region === region,
        faults:FB.validateGeography('test_region'),
        unknownBookmark:FB.validateBookmark(Object.assign({}, FB.bookmark('867'),
          { geography:'nowhere' })).join('\n'),
        badHook:(function () {
          region.knowledge.basins.west.provinces = ['atlantis'];
          return FB.validateGeography('test_region').join('\n');
        })(),
        badName:FB.validateBookmark(Object.assign({}, FB.bookmark('867'), {
          provinces:FB.bookmark('867').provinces.map(function (p) {
            return p.id === 'roma'
              ? Object.assign({}, p, { names:[{ from:900, to:800, name:'Backwards' }] }) : p;
          })
        })).join('\n'),
        badLayout:FB.validateBookmark(Object.assign({}, FB.bookmark('867'),
          { settlementLayout:'missing_layout' })).join('\n')
      };
    });
    expect(result.legacy).toEqual([true, true, true, true, false]);
    expect(result.rejected).toContain('must join two different known basins');
    expect(result.accepted).toBe(true);
    expect(result.faults).toEqual([]);
    expect(result.unknownBookmark).toContain('unknown geography nowhere');
    expect(result.badHook).toContain('names unknown province atlantis');
    expect(result.badName).toContain('province roma has an invalid dated name at index 0');
    expect(result.badLayout).toContain('unknown settlement layout missing_layout');
  });
