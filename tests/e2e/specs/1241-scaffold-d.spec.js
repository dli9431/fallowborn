'use strict';
const {test,expect} = require('../support/fixture');
const {dependsOnRuntime} = require('../support/runtime-dependencies');
const {openGame} = require('../support/game/navigation');
const {restoreBookmark} = require('../support/game/bookmark-acceptance');

dependsOnRuntime(__filename,[
  'index.html','data/bookmark_1241.js','data/bookmark_1241_scaffold_d.js','data/identities_1241.js',
  'data/bookmark_1241_scaffold_a.js','data/bookmark_1241_scaffold_b.js','data/bookmark_1241_scaffold_c.js',
  'data/bookmark_1204.js','data/bookmark_1204_terrain.js','data/bookmarks.js',
  'data/counties.js','data/map_data.js','data/cultures.js','data/eras.js',
  'data/geographies.js','data/geography_expansion.js','data/settlements.js',
  'data/settlements_real.js','data/bookmark_476_wider_identities.js',
  'data/political_institutions.js','data/starts.js','data/government_rollout.js',
  'js/model.js','js/world.js','js/population.js','js/main.js','js/starts.js',
  'js/bookmark_setup.js','js/save.js','js/save_v4.js','js/ui_misc.js','js/i18n.js'
]);

const coverage = {
  bohemia_poland:'veligrad olomouc brno praha plzen budejovice poznan gniezno plock krakow wroclaw gdansk szczecin',
  caucasus_caspian:'van ani kars dvin tbilisi kutaisi sukhumi magas samandar derbent',
  arabia:'mecca medina yamama qatif sanaa aden shibam muscat nizwa sohar najran_oasis tayma_oasis w_arabia w_nefud',
  maghreb:'tunis kairouan tripoli sirte barqa fes tangier tlemcen tahert algiers constantine oran aghmat sale sijilmasa draa_oases garama ghadames_oasis awjila_oasis w_sahara_w w_sahara_c w_sahara_e',
  africa_horn_sahel:'dongola soba axum lalibela zeila jenne_district gao_district chad_lakeshore qasr_ibrim kumbi_district timbuktu_district w_sahel w_nubia',
  iraq_iran_west:'baghdad samarra kufa basra wasit rayy qazvin hamadan isfahan qom tabriz ardabil amol gorgan rasht central_iran_oases w_kavir',
  iran_south_khorasan:'shiraz istakhr kerman bam hormuz merv nishapur herat eastern_iran_oases sarakhs_oasis w_lut',
  transoxiana_khwarazm:'balkh termez bukhara samarkand usrushana chach nurata_foothills lower_syr_darya kath_district gurganj_district w_karakum w_kyzylkum',
  afghan_indus:'ghor zaranj bust kandahar ghazni kabul bamiyan tiz panjgur qusdar mansura debal shebar_valley gomal_valley thar_margin w_registan w_hindukush w_sulaiman w_thar'
};

test('1241 quadrant d covers its exact physical partition with valid dated references',async function ({page},info) {
  await openGame(page,info);
  const result = await page.evaluate(function (expected) {
    const faults = [], rows = {}, courts = {}, seeds = {}, outside = {};
    const opening = {id:'1241',era:'high_medieval',date:{year:1241,season:0,day:1}};
    const foreign = ['egypt_1241','rum_1241','hre_1241'];
    FB.geography('europe_regional_2').provinces.forEach(function (p) { seeds[p.id] = p; });
    function identity(culture,faith,scope) {
      const staged = FBDATA.bookmarkReligions1241[faith];
      return !!FBDATA.cultures[culture] && (staged ?
        JSON.stringify(staged.availability.bookmarkIds) === '["1241"]' :
        FB.faithHistoricalAvailable(faith,opening,scope));
    }
    Object.keys(expected).forEach(function (key) {
      const b = FBDATA.bookmarkRegions1241[key];
      if (!b) { faults.push('missing block '+key); return; }
      if (JSON.stringify(b.provinces.map(function (p) { return p.id; }).sort()) !==
          JSON.stringify(expected[key].split(' ').sort())) faults.push('partition '+key);
      b.provinces.forEach(function (p) {
        if (rows[p.id] || !seeds[p.id]) faults.push('duplicate or unknown county '+p.id);
        rows[p.id] = p;
      });
      b.realms.forEach(function (r) {
        if (courts[r.id]) faults.push('duplicate court '+r.id);
        courts[r.id] = r;
      });
    });
    function owner(id) {
      if (courts[id]) return;
      outside[id] = true;
      if (foreign.indexOf(id)<0) faults.push('unresolved court '+id);
    }
    Object.keys(expected).forEach(function (key) {
      const b = FBDATA.bookmarkRegions1241[key];
      if (!b) return;
      const inhabited = b.provinces.filter(function (p) { return !p.wasteland; });
      if (JSON.stringify(Object.keys(b.layouts).sort()) !==
          JSON.stringify(inhabited.map(function (p) { return p.id; }).sort())) faults.push('layout coverage '+key);
      b.provinces.forEach(function (p) {
        if (p.wasteland) {
          if (p.realm || p.communities || b.layouts[p.id]) faults.push('scenery politics '+p.id);
          return;
        }
        owner(p.realm);
        if (!Number.isInteger(p.dev) || p.dev<1 || p.dev>10) faults.push('development '+p.id);
        if (p.duchy) {
          const d = b.duchies[p.duchy], k = d && b.kingdoms[d.kingdom];
          if (!k || !b.empires[k.empire]) faults.push('title chain '+p.id);
        }
        const pairs = {};
        if (p.communities.reduce(function (sum,c) { return sum+c.populationShare0; },0) !== 10000)
          faults.push('population shares '+p.id);
        p.communities.forEach(function (c) {
          const pair = c.culture+':'+c.religion;
          if (pairs[pair] || !identity(c.culture,c.religion,'community')) faults.push('community '+p.id);
          pairs[pair] = true;
        });
        if (p.culture !== p.communities[0].culture || p.religion !== p.communities[0].religion)
          faults.push('principal community '+p.id);
        const sites = {};
        (b.layouts[p.id] || []).forEach(function (s) {
          if (!FBDATA.settlementSites[s.site] || sites[s.site] ||
              ['village','town','city'].indexOf(s.kind)<0) faults.push('settlement '+p.id);
          sites[s.site] = true;
        });
      });
      b.realms.forEach(function (r) {
        const capital = rows[r.capital];
        if (!capital || capital.wasteland || capital.realm !== r.id) faults.push('capital '+r.id);
        if (r.liege) owner(r.liege);
        if (!FBDATA.governmentForms[r.government] || !identity(r.ruler.culture,r.religion,'ruler'))
          faults.push('court identity '+r.id);
      });
    });
    // A court cannot be declared twice when another quadrant is also loaded.
    Object.keys(FBDATA.bookmarkRegions1241).forEach(function (key) {
      if (Object.prototype.hasOwnProperty.call(expected,key)) return;
      FBDATA.bookmarkRegions1241[key].realms.forEach(function (r) {
        if (courts[r.id]) faults.push('foreign duplicate court '+r.id);
      });
    });
    return {faults:faults,total:Object.keys(rows).length,courts:Object.keys(courts).length,
      inhabited:Object.keys(rows).filter(function (id) { return !rows[id].wasteland; }).length,
      outside:Object.keys(outside).sort()};
  },coverage);
  expect(result).toEqual({faults:[],total:131,courts:38,inhabited:106,
    outside:['egypt_1241','hre_1241','rum_1241']});
});

test('1241 quadrant d preserves uncorrected residents and trimmed settlement order independently',async function ({page},info) {
  await openGame(page,info);
  const faults = await page.evaluate(function (keys) {
    const source = FB.bookmark('1204','inhabited_v2'), old = {}, faults = [];
    const layouts = FBDATA.settlementLayouts[source.settlementLayout];
    source.provinces.forEach(function (p) { old[p.id] = p; });
    keys.forEach(function (key) {
      const b = FBDATA.bookmarkRegions1241[key];
      b.provinces.forEach(function (p) {
        const prior = old[p.id];
        if (!prior || !!p.wasteland !== !!prior.wasteland) { faults.push('disposition '+p.id); return; }
        ['name','x','y','terrain','duchy','maxRadiusKm','names'].forEach(function (field) {
          if (JSON.stringify(p[field]) !== JSON.stringify(prior[field])) faults.push('physical '+p.id+':'+field);
        });
        if (p === prior) faults.push('shared county '+p.id);
        if (p.wasteland) return;
        const communities = JSON.parse(JSON.stringify(prior.communities));
        communities.forEach(function (c) {
          if (c.religion === 'sahel_traditional_476') c.religion = 'sahel_local_practice_1241';
        });
        if (p.id === 'yamama') communities[0].culture = 'arabic';
        if (p.id === 'qom') communities.splice(0,communities.length,
          {culture:'persian',religion:'shia',populationShare0:8000},
          {culture:'persian',religion:'sunni',populationShare0:2000});
        if (JSON.stringify(p.communities) !== JSON.stringify(communities) || p.dev !== prior.dev ||
            p.culture !== communities[0].culture || p.religion !== communities[0].religion)
          faults.push('residents '+p.id);
        if (JSON.stringify(b.layouts[p.id]) !== JSON.stringify(layouts[p.id])) faults.push('ordered slots '+p.id);
        if (p.communities === prior.communities || p.communities[0] === prior.communities[0] ||
            b.layouts[p.id] === layouts[p.id] || b.layouts[p.id][0] === layouts[p.id][0])
          faults.push('shared nested object '+p.id);
      });
    });
    return faults;
  },Object.keys(coverage));
  expect(faults).toEqual([]);
});

test('1241 quadrant d binds corrected rulers and keeps uncertain people and jurisdictions provisional',async function ({page},info) {
  await openGame(page,info);
  const data = await page.evaluate(function (keys) {
    const courts = {}, rows = {};
    keys.forEach(function (key) {
      const b = FBDATA.bookmarkRegions1241[key];
      b.realms.forEach(function (r) { courts[r.id] = r; });
      b.provinces.forEach(function (p) { rows[p.id] = p; });
    });
    return {courts:courts,rows:rows};
  },Object.keys(coverage));
  const r = data.courts, p = data.rows;
  const named = {
    silesia_1241:['Henry II the Pious',1200,'m'],
    bohemia_1241:['Wenceslas I',1205,'m'],georgia_1241:['Rusudan',1194,'f'],
    almohad_1241:['Abd al-Wahid II al-Rashid',1218,'m'],
    abbasid_1241:['al-Mustansir Billah',1192,'m']
  };
  Object.keys(r).forEach(function (id) {
    expect(id).toMatch(/_1241$/);
    if (named[id]) {
      expect([r[id].ruler.name,r[id].ruler.born,r[id].ruler.sex]).toEqual(named[id]);
      expect(r[id].ruler.generated).toBeUndefined();
    } else {
      expect(r[id].ruler.generated).toBe(true);
      expect(r[id].ruler.name).toBeUndefined();
      expect(r[id].ruler.born).toBe(1206);
    }
    ['royalCourt','mobile','nonTerritorial','civicRights','institutions','recognition'].forEach(function (field) {
      if (id === 'silesia_1241' && field === 'royalCourt') return;
      expect(r[id][field]).toBeUndefined();
    });
    if (id !== 'bohemia_1241' && id !== 'zayyanid_1241') expect(r[id].liege).toBeUndefined();
  });
  expect(r.bohemia_1241.liege).toBe('hre_1241');
  expect(r.zayyanid_1241.liege).toBe('almohad_1241');
  expect(r.georgia_1241.capital).toBe('kutaisi');
  expect(r.pomerelia_local_1241).toMatchObject({capital:'gdansk',religion:'catholic',
    ruler:{generated:true,culture:'slavic'}});
  expect(r.zayyanid_1241).toMatchObject({capital:'tlemcen',religion:'sunni',
    ruler:{generated:true,culture:'berber'}});
  expect(r.alodia_1241).toMatchObject({capital:'soba',religion:'eastern',
    ruler:{generated:true,culture:'nubian'}});
  expect(r.makuria_1241.name).toBe('Makuria');
  expect(r.kerman_local_1241.name).toBe('Qutlugh-Khanid Kirman');
  expect(r.sistan_1241.name).toBe('Mihrabanid Sistan');
  expect(Object.keys(r).filter(function (id) { return r[id].ruler.generated; })).toHaveLength(33);
  ['khwarazm_1241','ghurid_1241','karakhanid_1241','qara_khitai_1241',
    'qipchaq_following_1241','mongol_western_command_1241','koten_following_1241'].forEach(function (id) {
    expect(r[id]).toBeUndefined();
  });
  const owners = {
    krakow:'silesia_1241',plock:'mazovia_local_1241',gdansk:'pomerelia_local_1241',van:'rum_1241',
    samandar:'caspian_local_1241',sanaa:'rasulid_yemen_1241',zeila:'rasulid_yemen_1241',
    tunis:'hafsid_1241',kairouan:'hafsid_1241',constantine:'hafsid_1241',tripoli:'hafsid_1241',
    aghmat:'almohad_1241',tlemcen:'zayyanid_1241',sirte:'almohad_1241',barqa:'egypt_1241',
    soba:'alodia_1241',dongola:'makuria_1241',qasr_ibrim:'makuria_1241',tabriz:'azerbaijan_local_1241',
    rayy:'iran_west_local_1241',kerman:'kerman_local_1241',bam:'kerman_local_1241',hormuz:'kerman_local_1241',
    herat:'khorasan_local_1241',sarakhs_oasis:'khorasan_local_1241',samarkand:'transoxiana_local_1241',
    gurganj_district:'khwarazm_local_1241',balkh:'balkh_local_1241',bamiyan:'bamiyan_local_1241',
    shebar_valley:'bamiyan_local_1241'
  };
  Object.keys(owners).forEach(function (id) { expect(p[id].realm).toBe(owners[id]); });
  expect(p.yamama.culture).toBe('arabic');
  expect(p.yamama.communities).toEqual([{culture:'arabic',religion:'sunni',populationShare0:10000}]);
  expect(p.qom.religion).toBe('shia');
  expect(p.qom.communities).toEqual([
    {culture:'persian',religion:'shia',populationShare0:8000},
    {culture:'persian',religion:'sunni',populationShare0:2000}
  ]);
  expect(r.iran_west_local_1241.religion).toBe('sunni');
  expect(p.gao_district.religion).toBe('sahel_local_practice_1241');
  expect(r.gao_court_1241.religion).toBe('sunni');
  expect(p.gao_district.communities.map(function (c) { return [c.religion,c.populationShare0]; }))
    .toEqual([['sahel_local_practice_1241',6000],['sunni',4000]]);
  expect(p.kumbi_district.communities.map(function (c) { return [c.religion,c.populationShare0]; }))
    .toEqual([['sunni',7000],['sahel_local_practice_1241',3000]]);
  expect(p.central_iran_oases.religion).toBe('shia');
  expect(p.central_iran_oases.communities[0].populationShare0).toBe(7000);
  ['najran_oasis','tayma_oasis','garama','ghadames_oasis','awjila_oasis','chad_lakeshore',
    'timbuktu_district','eastern_iran_oases','gomal_valley','thar_margin'].forEach(function (id) {
    expect(p[id].wasteland).toBe(true);
    expect(p[id].realm).toBeUndefined();
  });
});

test('1241 corrected communities and courts reach fresh play and matching restore without reseeding',
  async function ({page},info) {
    await openGame(page,info);
    const full = page.locator('#btn-choose-beginning');
    if (await full.isVisible()) await full.click();
    else await page.getByRole('button',{name:'New Game',exact:true}).click();
    await page.locator('#btn-bm-seed').click();
    await page.locator('#ng-seed').fill('CORRECT1241-1241-serf-qom-m-Review-standard-0-persian.sunni');
    await page.locator('#ng-seed').press('Enter');
    await expect(page.locator('#chargen:not(.hidden)')).toBeVisible();
    await expect(page.locator('input[name=cg-community]')).toHaveCount(2);
    await expect(page.locator('input[name=cg-community]').nth(1)).toBeChecked();
    await page.getByRole('button',{name:'Begin Your Story',exact:true}).click();
    await expect(page.locator('#game:not(.hidden)')).toBeVisible();
    await page.evaluate(function () { FB.game.setPaused(true); });
    await page.getByRole('button',{name:'Begin',exact:true}).click();
    const checkpoint = await page.evaluate(function () { return FB.save.serialize(); });
    function snapshot() {
      const s = FB.state, me = s.chars[s.player.charId], b = FB.campaignBookmark(s);
      const faults = FB.validateBookmark(b), populations = {};
      ['qom','yamama'].forEach(function (id) {
        const communities = FB.countyCommunities(s,id), total = FB.countyPopulation(s,id);
        const authored = FB.world.byId[id].communities;
        if (communities.reduce(function (sum,c) { return sum + c.count; },0) !== total ||
            total !== FB.countyPopulationBaseline(s,id)) faults.push('population total '+id);
        communities.forEach(function (c,index) {
          const declared = authored[index];
          if (!declared || c.culture !== declared.culture || c.religion !== declared.religion ||
              Math.abs(c.count - total * declared.populationShare0 / 10000) > 1)
            faults.push('population share '+id);
        });
        populations[id] = communities.map(function (c) { return [c.culture,c.religion,c.count]; });
      });
      const rulers = ['bohemia_1241','georgia_1241','almohad_1241','abbasid_1241'].map(function (id) {
        const r = s.realms[id], succession = r.succession;
        const member = succession && succession.members[succession.rulerMemberId];
        const person = member && s.chars[member.charId];
        if (!person || person.name !== r.ruler.name || person.born !== r.ruler.born || person.sex !== r.ruler.sex)
          faults.push('ruler identity '+id);
        return [id,r.ruler.name,r.ruler.born,r.ruler.sex,r.capital,member && member.charId];
      });
      return {faults:faults,home:s.player.provinceId,identity:[me.culture,me.religion],turn:s.turn,
        populations:populations,rulers:rulers,heads:s.religiousHeads,
        owners:['gdansk','tlemcen','soba','qom'].map(function (id) { return s.owner[id]; }),
        courtFaith:s.realms.iran_west_local_1241.religion,
        characterIds:Object.keys(s.chars).sort(),rng:FB.getRngState() >>> 0,uid:FB.getUidCounter()};
    }
    const original = await page.evaluate(snapshot);
    expect(original.faults).toEqual([]);
    expect(original.home).toBe('qom');
    expect(original.identity).toEqual(['persian','sunni']);
    expect(original.turn).toBe(0);
    expect(original.owners).toEqual(['pomerelia_local_1241','zayyanid_1241','alodia_1241','iran_west_local_1241']);
    expect(original.courtFaith).toBe('sunni');
    expect(original.populations.qom.map(function (c) { return c.slice(0,2); }))
      .toEqual([['persian','shia'],['persian','sunni']]);
    expect(original.populations.yamama.map(function (c) { return c.slice(0,2); })).toEqual([['arabic','sunni']]);
    expect(original.rulers.map(function (r) { return r.slice(0,5); })).toEqual([
      ['bohemia_1241','Wenceslas I',1205,'m','praha'],
      ['georgia_1241','Rusudan',1194,'f','kutaisi'],
      ['almohad_1241','Abd al-Wahid II al-Rashid',1218,'m','aghmat'],
      ['abbasid_1241','al-Mustansir Billah',1192,'m','baghdad']
    ]);
    expect(new Set(original.rulers.map(function (r) { return r[5]; })).size).toBe(4);
    expect(original.heads.sunni).toBe('abbasid_1241');
    await page.evaluate(function () {
      return new Promise(function (resolve,reject) {
        FB.activateBookmark('1204',null,function (error) { if (error) reject(error); else resolve(); });
      });
    });
    await restoreBookmark(page,checkpoint);
    expect(await page.evaluate(snapshot)).toEqual(original);
  });

test('1241 quadrant d loading and edits leave effective worlds and sibling blocks untouched',async function ({page},info) {
  await openGame(page,info);
  function snapshot(keys) {
    const siblings = {};
    Object.keys(FBDATA.bookmarkRegions1241 || {}).forEach(function (key) {
      if (keys.indexOf(key)<0) siblings[key] = FBDATA.bookmarkRegions1241[key];
    });
    return {worlds:JSON.stringify(FBDATA.bookmarks),layouts:JSON.stringify(FBDATA.settlementLayouts),
      sites:JSON.stringify(FBDATA.settlementSites),cultures:JSON.stringify(FBDATA.cultures),
      religions:JSON.stringify(FBDATA.religions),starts:JSON.stringify(FBDATA.startScenarios),
      stories:JSON.stringify(FBDATA.storyInstances),siblings:JSON.stringify(siblings),
      state:JSON.stringify(FB.state),active:FB.activeBookmarkId,rng:FB.getRngState(),uid:FB.getUidCounter()};
  }
  const keys = Object.keys(coverage);
  const before = await page.evaluate(snapshot,keys);
  await page.addScriptTag({url:new URL('data/bookmark_1241_scaffold_d.js',page.url()).href});
  expect(await page.evaluate(snapshot,keys)).toEqual(before);
  await page.evaluate(function () {
    const b = FBDATA.bookmarkRegions1241.transoxiana_khwarazm;
    b.provinces[0].communities[0].populationShare0 = 1;
    b.layouts.balkh[0].name = 'Independent declaration';
    b.realms[0].ruler.born = 1207;
  });
  expect(await page.evaluate(snapshot,keys)).toEqual(before);
});
