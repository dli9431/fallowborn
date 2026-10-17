'use strict';
const path = require('path');
const {test,expect} = require('../support/fixture');
const {dependsOnRuntime} = require('../support/runtime-dependencies');
const {openGame} = require('../support/game/navigation');
const {openCrazyGame} = require('../support/game/crazygames-title');
const {mockCrazyGames} = require('../support/crazygames');

dependsOnRuntime(__filename,[
  'index.html','data/bookmark_568.js','data/starts_568.js',
  'data/bookmark_568_scaffold_b.js','data/bookmark_568_identities.js',
  'data/bookmark_493.js','data/bookmark_493_world.js','data/bookmark_476_wider.js',
  'data/bookmark_476_wider_identities.js','data/bookmarks.js','data/counties.js',
  'data/geographies.js','data/geography_expansion.js','data/cultures.js',
  'data/eras.js','data/political_institutions.js','data/settlements.js','data/map_data.js',
  'data/settlements_real.js','js/systems.js','js/religion.js','js/model.js','js/world.js'
]);

const sourcePath = path.resolve(__dirname,'../../..','data/bookmark_568_scaffold_b.js');
const coverage = {
  frankish_southwest:'bordeaux agen perigueux poitiers angouleme limoges toulouse albi cahors rodez clermont le_puy bayonne auch narbonne beziers carcassonne dijon besancon auxerre lyon macon vienne arles marseille avignon nice geneva chambery grenoble',
  rhine_alps:'metz verdun nancy strasbourg basel aachen trier luxembourg liege cologne utrecht amsterdam groningen bremen wurzburg nurnberg bamberg frankfurt mainz worms koblenz augsburg ulm konstanz zurich freiburg munich regensburg passau salzburg wien linz klagenfurt graz',
  britain_south_east:'winchester salisbury dorset bath exeter canterbury rochester chichester lewes london colchester tamworth derby nottingham leicester gloucester worcester warwick chester shrewsbury northampton bedford norwich ipswich cambridge lincoln stamford',
  ireland:'ulaid tir_eoghain tara dublin kilkenny wexford galway tuam roscommon cashel cork limerick',
  danube_avars:'szekesfehervar moson sirmium osijek gyula cluj pliska silistra vidin zagreb sisak',
  arabia:'mecca medina yamama qatif sanaa aden shibam muscat nizwa sohar najran_oasis tayma_oasis w_arabia w_nefud'
};

for (const crazy of [false,true]) {
  test('568 quadrant b has complete coverage and resolvable references ('+(crazy?'CrazyGames':'standard')+')',async function ({page},info) {
    if (crazy) {
      await mockCrazyGames(page);
      await page.addInitScript(function () {
        window.FB_DISTRIBUTION = 'crazygames';
        window.FB_CRAZYGAMES_STORAGE = 'localstorage';
      });
      await openCrazyGame(page,info);
    } else await openGame(page,info);
    const result = await page.evaluate(function (coverage) {
      const faults = [], counties = {}, realms = {}, external = [
        'austrasia_568','neustria_568','burgundy_568','visigoths_568','east_568','dumnonia_568'
      ];
      const physical = {};
      FBDATA.geographies.europe_regional.provinces.concat(
        FBDATA.geographies.europe_regional_2.provinceAdditions
      ).forEach(function (p) { physical[p.id] = p; });
      let inhabited = 0, scenery = 0;
      Object.keys(coverage).forEach(function (key) {
        const block = FBDATA.bookmarkRegions568[key];
        if (!block) { faults.push('missing block '+key); return; }
        const actual = block.provinces.map(function (p) { return p.id; }).sort();
        if (JSON.stringify(actual) !== JSON.stringify(coverage[key].split(' ').sort())) faults.push('coverage '+key);
        const lived = block.provinces.filter(function (p) { return !p.wasteland; }).map(function (p) { return p.id; }).sort();
        if (JSON.stringify(lived) !== JSON.stringify(Object.keys(block.settlementLayouts).sort())) faults.push('layout coverage '+key);
        block.realms.forEach(function (r) {
          if (realms[r.id] || external.indexOf(r.id)>=0) faults.push('duplicate/shared court '+r.id);
          realms[r.id] = r;
        });
        block.provinces.forEach(function (p) {
          if (counties[p.id]) faults.push('duplicate county '+p.id);
          counties[p.id] = p;
          const seed = physical[p.id];
          if (!seed || p.x !== seed.x || p.y !== seed.y || p.terrain !== seed.terrain) faults.push('physical seed '+p.id);
          if (p.wasteland) {
            scenery++;
            if (p.realm || p.communities || p.dev || block.settlementLayouts[p.id]) faults.push('inhabited scenery '+p.id);
            return;
          }
          inhabited++;
          const d = block.duchies[p.duchy], k = d && block.kingdoms[d.kingdom];
          if (!d || !k || !block.empires[k.empire]) faults.push('titles '+p.id);
          if (!Number.isInteger(p.dev) || p.dev<1 || p.dev>10 || !block.climate[p.id]) faults.push('development/climate '+p.id);
          if (p.communities[0].culture !== p.culture || p.communities[0].religion !== p.religion ||
              p.communities.reduce(function (sum,c) { return sum+c.populationShare0; },0) !== 10000) faults.push('communities '+p.id);
          p.communities.forEach(function (c) {
            if (!(FBDATA.cultures[c.culture] || FBDATA.bookmarkCultures568[c.culture]) || !FBDATA.religions[c.religion]) faults.push('identity '+p.id);
            const availability = FB.faithAvailability(c.religion,null), staged = FBDATA.bookmarkFaithAvailability568[c.religion];
            if (availability.bookmarkIds && availability.bookmarkIds.indexOf('568')<0 &&
                (!staged || staged.bookmarkIds.indexOf('568')<0)) faults.push('faith eligibility input '+p.id);
          });
          const sites = {};
          block.settlementLayouts[p.id].forEach(function (s) {
            if ((!FBDATA.settlementSites[s.site] && !block.settlementSites[s.site]) || sites[s.site]) faults.push('site '+p.id);
            if (['village','town','city'].indexOf(s.kind)<0) faults.push('settlement kind '+p.id);
            sites[s.site] = true;
          });
        });
      });
      Object.keys(counties).forEach(function (id) {
        const p = counties[id];
        if (!p.wasteland && !realms[p.realm] && external.indexOf(p.realm)<0) faults.push('unowned '+id);
      });
      Object.keys(realms).forEach(function (id) {
        const r = realms[id];
        if (!counties[r.capital] || counties[r.capital].realm !== id) faults.push('capital '+id);
        if (r.liege && !realms[r.liege] && external.indexOf(r.liege)<0) faults.push('liege '+id);
        if (!FBDATA.governmentForms[r.government] || !FBDATA.religions[r.religion] ||
            !(FBDATA.cultures[r.ruler.culture] || FBDATA.bookmarkCultures568[r.ruler.culture])) faults.push('court definitions '+id);
        const availability = FB.faithAvailability(r.religion,null), staged = FBDATA.bookmarkFaithAvailability568[r.religion];
        if (availability.bookmarkIds && availability.bookmarkIds.indexOf('568')<0 &&
            (!staged || staged.bookmarkIds.indexOf('568')<0)) faults.push('court faith eligibility input '+id);
      });
      return {faults:faults,inhabited:inhabited,scenery:scenery,courts:Object.keys(realms).length};
    },coverage);
    expect(result).toEqual({faults:[],inhabited:126,scenery:2,courts:27});
  });
}

test('568 redating keeps residents distinct from their controllers and holds named people',async function ({page},info) {
  await openGame(page,info);
  const result = await page.evaluate(function (keys) {
    const courts = {}, counties = {}, faults = [];
    keys.forEach(function (key) {
      const block = FBDATA.bookmarkRegions568[key];
      block.realms.forEach(function (r) { courts[r.id] = r; });
      block.provinces.forEach(function (p) { counties[p.id] = p; });
      if (Object.keys(block.opening.actors).length || Object.keys(block.opening.appointments).length ||
          block.opening.estates.length || block.opening.claims.length || block.opening.migrations.length ||
          Object.keys(block.localInstitutions).length || block.storyIds.length || block.storyCampaigns.length) faults.push('source transactions '+key);
      block.provinces.filter(function (p) { return !p.wasteland; }).forEach(function (p) {
        if (!/_568$/.test(p.realm) || p.customaryRights.some(function (r) { return r.basis !== 'possession' || r.basisRef; })) faults.push('old authority '+p.id);
      });
      ['duchies','kingdoms','empires'].forEach(function (table) {
        if (Object.keys(block[table]).some(function (id) { return id.indexOf('_493')>=0; })) faults.push('old titles '+key);
      });
    });
    return {courts:courts,counties:counties,faults:faults};
  },Object.keys(coverage));
  expect(result.faults).toEqual([]);
  Object.values(result.courts).forEach(function (r) {
    expect(r.ruler.generated).toBe(true);
    expect(r.ruler.name).toBeUndefined();
    expect(r.ruler.born).toBe(533);
    expect(r.royalCourt).toBeUndefined();
    expect(r.mobile).toBeUndefined();
  });
  const r = result.courts, p = result.counties;
  expect([r.lombards_568.ruler.culture,r.avars_568.ruler.culture]).toEqual(['langobard_568','avar_568']);
  expect([r.lombards_568.government,r.avars_568.government]).toEqual(['regnum','regnum']);
  expect(p.moson.culture).toBe('roman');
  expect(p.moson.communities.some(function (c) { return c.culture==='langobard_568'; })).toBe(true);
  expect(p.gyula.culture).toBe('gepid');
  expect([p.gyula.x,p.gyula.y]).toEqual([23.57,46.07]);
  expect(p.sirmium.realm).toBe('east_568');
  expect([p.sisak.realm,p.zagreb.realm,p.osijek.realm]).toEqual(['lombards_568','lombards_568','avars_568']);
  expect(p.metz.realm).toBe('austrasia_568');
  expect(p.narbonne.realm).toBe('visigoths_568');
  expect(p.exeter.realm).toBe('dumnonia_568');
  expect(p.winchester.culture).toBe('brittonic');
  expect(r.wessex_568.ruler.culture).toBe('saxon_476');
  expect([p.tara.religion,r.midland_irish_568.religion]).toEqual(['insular_traditional_476','nicene']);
  expect([p.sanaa.religion,r.south_arabia_568.religion]).toEqual(['jewish','miaphysite']);
  expect(r.bavaria_568.liege).toBe('austrasia_568');
});

test('568 scaffold registration is inert and owns detached source values',async function ({page},info) {
  await openGame(page,info);
  const before = await page.evaluate(function () {
    return JSON.stringify({bookmarks:FBDATA.bookmarks,cultures:FBDATA.cultures,religions:FBDATA.religions,
      layouts:FBDATA.settlementLayouts,sites:FBDATA.settlementSites,active:FB.activeBookmarkId});
  });
  await page.addScriptTag({path:sourcePath});
  const result = await page.evaluate(function (keys) {
    const old = FB.bookmark('493','world_v2'), originals = {}, faults = [];
    old.provinces.forEach(function (p) { originals[p.id] = p; });
    const oldLayouts = FBDATA.settlementLayouts[old.settlementLayout];
    keys.forEach(function (key) {
      const block = FBDATA.bookmarkRegions568[key];
      block.provinces.forEach(function (p) {
        if (p.wasteland || p.id==='najran_oasis') return;
        const original = originals[p.id];
        if (!original) { faults.push('source '+p.id); return; }
        if (p === original || p.communities === original.communities ||
            block.settlementLayouts[p.id] === oldLayouts[p.id]) faults.push('shared object '+p.id);
        const communities = JSON.parse(JSON.stringify(original.communities));
        const expectedLayout = JSON.parse(JSON.stringify(oldLayouts[p.id]));
        if (p.id==='gyula') expectedLayout[0].name = 'Upper Mures district';
        if (['moson','szekesfehervar','gyula','cluj'].indexOf(p.id)>=0) {
          communities.forEach(function (c) {
            if (c.culture==='gothic') c.culture = ['gyula','cluj'].indexOf(p.id)>=0 ? 'gepid' : 'langobard_568';
          });
        }
        if (p.dev !== original.dev || JSON.stringify(p.communities) !== JSON.stringify(communities) ||
            JSON.stringify(block.settlementLayouts[p.id]) !== JSON.stringify(expectedLayout)) faults.push('source preservation '+p.id);
      });
    });
    const scripts = Array.prototype.map.call(document.scripts,function (s) { return s.getAttribute('src'); });
    return {faults:faults,selectableWorld:FB.bookmarkAvailable('568'),
      registered:scripts.indexOf('data/bookmark_568_scaffold_b.js') > scripts.indexOf('data/bookmark_493_world.js'),
      after:JSON.stringify({bookmarks:FBDATA.bookmarks,cultures:FBDATA.cultures,religions:FBDATA.religions,
        layouts:FBDATA.settlementLayouts,sites:FBDATA.settlementSites,active:FB.activeBookmarkId})};
  },Object.keys(coverage));
  expect(result.faults).toEqual([]);
  expect(result.selectableWorld).toBe(true);
  expect(result.registered).toBe(true);
  expect(result.after).toBe(before);
});
