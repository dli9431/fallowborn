'use strict';
const {test,expect} = require('../support/fixture');
const {dependsOnRuntime} = require('../support/runtime-dependencies');
const {openGame} = require('../support/game/navigation');

dependsOnRuntime(__filename,[
  'index.html','data/bookmark_1096_scaffold_d.js','data/identities_1096.js',
  'data/bookmark_1096.js','data/bookmark_1096_scaffold_a.js',
  'data/bookmark_1096_scaffold_b.js','data/bookmark_1096_scaffold_c.js',
  'data/bookmarks.js','data/bookmark_1066_inhabited.js','data/map_data.js',
  'data/counties.js','data/geographies.js','data/geography_expansion.js',
  'data/settlements.js','data/settlements_real.js','data/cultures.js',
  'data/bookmark_476_wider_identities.js','data/eras.js','data/climate.js',
  'data/political_institutions.js','data/government_rollout.js','data/starts.js',
  'js/world.js','js/model.js','js/governments.js','js/population.js',
  'js/main.js','js/starts.js','js/ui_misc.js','js/ui_modals.js'
]);

const packets = {
  anatolia_caucasus:('nicaea dorylaion ancyra amorion smyrna sardis ephesos attaleia ikonion caesarea ' +
    'sebasteia trebizond sinope tarsos adana nicosia van ani kars dvin tbilisi kutaisi sukhumi magas samandar derbent').split(' '),
  syria_palestine:('damascus homs aleppo hama manbij antioch jerusalem acre amman palmyra_district w_syrian').split(' '),
  egypt:('alexandria rosetta fustat fayyum asyut luxor aswan siwa_oasis').split(' '),
  arabia:('mecca medina yamama qatif sanaa aden shibam muscat nizwa sohar najran_oasis tayma_oasis w_arabia w_nefud').split(' '),
  iran_iraq:('baghdad samarra kufa basra wasit rayy qazvin hamadan isfahan qom tabriz ardabil shiraz istakhr ' +
    'kerman bam hormuz merv nishapur herat amol gorgan rasht central_iran_oases eastern_iran_oases sarakhs_oasis w_kavir w_lut').split(' '),
  eastern_edge:('ghor balkh termez zaranj bust kandahar ghazni kabul bamiyan bukhara samarkand usrushana chach ' +
    'tiz panjgur qusdar mansura debal shebar_valley gomal_valley thar_margin nurata_foothills lower_syr_darya ' +
    'kath_district gurganj_district w_registan w_hindukush w_sulaiman w_thar w_karakum w_kyzylkum').split(' '),
  horn_sahel:('dongola soba axum lalibela zeila jenne_district gao_district chad_lakeshore qasr_ibrim ' +
    'kumbi_district timbuktu_district w_sahel w_nubia').split(' ')
};

test('1096 eastern blocks cover the exact partition and resolve their courts, titles and sites',
  async function ({page},info) {
    await openGame(page,info);
    const result = await page.evaluate(function (expected) {
      const blocks = FBDATA.bookmarkRegions1096, rows = {}, courts = {}, faults = [], counts = [];
      const seeds = {}, external = {};
      FB.geography('europe_regional_2').provinces.forEach(function (p) { seeds[p.id] = p; });
      function identity(culture,faith) {
        const staged = FBDATA.bookmarkReligions1096[faith];
        return FB.cultureAssignable(culture,null) && (staged ?
          JSON.stringify(staged.availability.bookmarkIds) === '["1096"]' : FB.faithAssignable(faith,null));
      }
      Object.keys(expected).forEach(function (key) {
        const b = blocks[key];
        if (!b) { faults.push('missing block ' + key); return; }
        if (JSON.stringify(b.provinces.map(function (p) { return p.id; }).sort()) !==
            JSON.stringify(expected[key].slice().sort())) faults.push('partition ' + key);
        counts.push(b.provinces.length);
        b.realms.forEach(function (r) {
          if (courts[r.id]) faults.push('duplicate court ' + r.id);
          courts[r.id] = r;
        });
        b.provinces.forEach(function (p) {
          if (rows[p.id] || !seeds[p.id]) faults.push('duplicate or unknown county ' + p.id);
          rows[p.id] = p;
          if (p.wasteland) {
            if (p.realm || p.communities || b.settlementLayouts[p.id]) faults.push('scenery politics ' + p.id);
            return;
          }
          const pairs = {};
          if (p.communities.reduce(function (sum,c) { return sum + c.populationShare0; },0) !== 10000)
            faults.push('community total ' + p.id);
          p.communities.forEach(function (c) {
            const pair = c.culture + ':' + c.religion;
            if (pairs[pair] || !identity(c.culture,c.religion)) faults.push('community identity ' + p.id);
            pairs[pair] = true;
          });
          if (p.culture !== p.communities[0].culture || p.religion !== p.communities[0].religion)
            faults.push('principal identity ' + p.id);
          if (p.duchy) {
            const d = b.duchies[p.duchy], k = d && b.kingdoms[d.kingdom];
            if (!d || !k || k.empire && !b.empires[k.empire]) faults.push('title chain ' + p.id);
          }
          const sites = {}, slots = b.settlementLayouts[p.id];
          if (!slots || !slots.length) { faults.push('missing layout ' + p.id); return; }
          slots.forEach(function (s) {
            if (sites[s.site] || !FBDATA.settlementSites[s.site] ||
                ['village','town','city'].indexOf(s.kind) < 0) faults.push('site ' + p.id);
            sites[s.site] = true;
          });
        });
        Object.keys(b.settlementLayouts).forEach(function (id) {
          if (expected[key].indexOf(id) < 0) faults.push('foreign layout ' + id);
        });
      });
      Object.keys(rows).forEach(function (id) {
        const p = rows[id];
        if (!p.wasteland && !courts[p.realm]) {
          external[p.realm] = true;
          if (p.realm !== 'byzantium_1096') faults.push('unresolved court ' + p.realm);
        }
      });
      Object.keys(courts).forEach(function (id) {
        const r = courts[id], capital = rows[r.capital];
        if (!capital || capital.wasteland || capital.realm !== id) faults.push('capital ' + id);
        if (!FBDATA.governmentForms[r.government] || !identity(r.ruler.culture,r.religion))
          faults.push('court identity ' + id);
        if (r.liege) faults.push('unreviewed allegiance ' + id);
        if (!Number.isInteger(r.ruler.born)) faults.push('birth ' + id);
      });
      return {faults:faults,counts:counts,total:Object.keys(rows).length,
        inhabited:Object.keys(rows).filter(function (id) { return !rows[id].wasteland; }).length,
        courts:Object.keys(courts).length,external:Object.keys(external)};
    },packets);
    expect(result).toEqual({faults:[],counts:[26,11,8,14,28,31,13],total:131,
      inhabited:107,courts:38,external:['byzantium_1096']});
  });

test('1096 eastern corrections preserve other residents, development and settlement slot order',
  async function ({page},info) {
    await openGame(page,info);
    const faults = await page.evaluate(function (keys) {
      const source = FB.bookmark('1066','inhabited_v2'), prior = {}, faults = [];
      const layouts = FBDATA.settlementLayouts[source.settlementLayout];
      const faithMap = {ghana_local_practice_1066:'ghana_local_practice_1096',
        niger_traditional_1066:'niger_traditional_1096'};
      source.provinces.forEach(function (p) { prior[p.id] = p; });
      keys.forEach(function (key) {
        const b = FBDATA.bookmarkRegions1096[key];
        b.provinces.forEach(function (p) {
          const old = prior[p.id];
          if (!old || !!p.wasteland !== !!old.wasteland) { faults.push('source disposition ' + p.id); return; }
          if (p.wasteland) return;
          let communities = JSON.parse(JSON.stringify(old.communities ||
            [{culture:old.culture,religion:old.religion,populationShare0:10000}]));
          communities.forEach(function (c) { c.religion = faithMap[c.religion] || c.religion; });
          if (key === 'egypt') communities[0].religion = 'sunni';
          if (p.id === 'yamama') communities[0].culture = 'arabic';
          if (p.id === 'qom') communities = [
            {culture:'persian',religion:'shia',populationShare0:8000},
            {culture:'persian',religion:'sunni',populationShare0:2000}
          ];
          if (JSON.stringify(p.communities) !== JSON.stringify(communities) || p.dev !== old.dev ||
              p.culture !== communities[0].culture || p.religion !== communities[0].religion)
            faults.push('resident or development change ' + p.id);
          if (JSON.stringify(b.settlementLayouts[p.id]) !== JSON.stringify(layouts[p.id]))
            faults.push('slot order ' + p.id);
        });
      });
      return faults;
    },Object.keys(packets));
    expect(faults).toEqual([]);
  });

test('1096 eastern courts retain real birth years and explicit generated-ruler holds',
  async function ({page},info) {
    await openGame(page,info);
    const result = await page.evaluate(function (keys) {
      const courts = {}, rows = {}, faults = [];
      keys.forEach(function (key) {
        const b = FBDATA.bookmarkRegions1096[key];
        b.realms.forEach(function (r) { courts[r.id] = r; });
        b.provinces.forEach(function (p) { rows[p.id] = p; });
      });
      const generated = Object.keys(courts).filter(function (id) { return courts[id].ruler.generated; });
      generated.forEach(function (id) {
        const r = courts[id];
        if (r.ruler.name || r.royalCourt || r.ruler.born < 1041 || r.ruler.born > 1076)
          faults.push('fabricated biography ' + id);
      });
      return {faults:faults,generated:generated.length,
        named:Object.keys(courts).filter(function (id) { return !courts[id].ruler.generated; }).map(function (id) {
          return [id,courts[id].ruler.name,courts[id].ruler.born];
        }),
        ownership:['nicaea','ikonion','smyrna','tarsos','kutaisi','derbent','damascus','jerusalem','acre',
          'mecca','nizwa','merv','balkh','kerman','ghor','gurganj_district','soba','zeila'].map(function (id) {
          return [id,rows[id].realm];
        }),
        faiths:['fatimid_1096','sulayhid_1096','omani_courts_1096','wagadu_1096','jenne_1096'].map(function (id) {
          return [id,courts[id].religion];
        })};
    },Object.keys(packets));
    expect(result).toEqual({faults:[],generated:35,
      named:[['seljuk_1096','Berkyaruk',1081],['abbasid_1096','al-Mustazhir',1078],
        ['ghaznavid_1096','Ibrahim ibn Masud',1033]],
      ownership:[['nicaea','rum_1096'],['ikonion','rum_1096'],['smyrna','smyrna_local_1096'],
        ['tarsos','cilician_courts_1096'],['kutaisi','georgia_1096'],['derbent','caspian_local_1096'],
        ['damascus','damascus_1096'],['jerusalem','jerusalem_1096'],['acre','fatimid_1096'],
        ['mecca','mecca_1096'],['nizwa','omani_courts_1096'],['merv','khorasan_1096'],
        ['balkh','khorasan_1096'],['kerman','kerman_1096'],['ghor','ghor_local_1096'],
        ['gurganj_district','khwarazm_local_1096'],['soba','alodia_1096'],['zeila','zeila_local_1096']],
      faiths:[['fatimid_1096','shia'],['sulayhid_1096','shia'],['omani_courts_1096','sunni'],
        ['wagadu_1096','ghana_local_practice_1096'],['jenne_1096','niger_traditional_1096']]});
  });

test('1096 corrected communities reach setup and seed populations and ownership without changing totals',
  async function ({page},info) {
    await openGame(page,info);
    const full = page.locator('#btn-choose-beginning');
    if (await full.isVisible()) await full.click();
    else await page.getByRole('button',{name:'New Game',exact:true}).click();
    await page.locator('#btn-bm-seed').click();
    await page.locator('#ng-seed').fill('CORRECT1096-1096-serf-qom-m-Review-standard-0-persian.sunni');
    await page.locator('#ng-seed').press('Enter');
    await expect(page.locator('#chargen:not(.hidden)')).toBeVisible();
    await expect(page.locator('input[name=cg-community]')).toHaveCount(2);
    await expect(page.locator('input[name=cg-community]').nth(1)).toBeChecked();
    await page.getByRole('button',{name:'Begin Your Story',exact:true}).click();
    await expect(page.locator('#game:not(.hidden)')).toBeVisible();
    await page.evaluate(function () { FB.game.setPaused(true); });
    await page.getByRole('button',{name:'Begin',exact:true}).click();
    const result = await page.evaluate(function () {
      const s = FB.state, me = s.chars[s.player.charId], b = FB.campaignBookmark(s);
      const populations = {}, faults = FB.validateBookmark(b), courts = {};
      b.realms.forEach(function (r) { courts[r.id] = r; });
      ['alexandria','rosetta','fustat','fayyum','asyut','luxor','aswan','yamama','qom'].forEach(function (id) {
        const p = FB.world.byId[id], communities = FB.countyCommunities(s,id);
        const total = FB.countyPopulation(s,id);
        if (communities.reduce(function (sum,c) { return sum + c.count; },0) !== total ||
            total !== FB.countyPopulationBaseline(s,id)) faults.push('changed population total ' + id);
        if (communities.length !== p.communities.length) faults.push('community count ' + id);
        communities.forEach(function (c,index) {
          const authored = p.communities[index];
          if (!authored || c.culture !== authored.culture || c.religion !== authored.religion ||
              Math.abs(c.count - total * authored.populationShare0 / 10000) > 1)
            faults.push('opening share ' + id);
        });
        populations[id] = communities.map(function (c) { return c.culture + '/' + c.religion; });
      });
      return {home:s.player.provinceId,identity:[me.culture,me.religion],turn:s.turn,
        owners:['bust','zaranj','sarakhs_oasis','qom'].map(function (id) { return s.owner[id]; }),
        courts:['ghaznavid_1096','sistan_1096','khorasan_1096','bahrain_1096'].map(function (id) {
          return [id,b.realms.filter(function (r) { return r.id === id; }).length,courts[id].capital];
        }),
        bahrayn:courts.bahrain_1096.name,
        courtFaiths:[s.realms.fatimid_1096.religion,s.realms.seljuk_1096.religion],
        populations:populations,faults:faults};
    });
    expect(result.home).toBe('qom');
    expect(result.identity).toEqual(['persian','sunni']);
    expect(result.turn).toBe(0);
    expect(result.owners).toEqual(['ghaznavid_1096','sistan_1096','khorasan_1096','seljuk_1096']);
    expect(result.courts).toEqual([
      ['ghaznavid_1096',1,'ghazni'],['sistan_1096',1,'zaranj'],
      ['khorasan_1096',1,'merv'],['bahrain_1096',1,'qatif']
    ]);
    expect(result.bahrayn).toBe('Uyunid Bahrayn court');
    expect(result.courtFaiths).toEqual(['shia','sunni']);
    for (const id of ['alexandria','rosetta','fustat','fayyum','asyut','luxor','aswan'])
      expect(result.populations[id]).toEqual(['arabic/sunni','coptic/eastern']);
    expect(result.populations.yamama).toEqual(['arabic/sunni']);
    expect(result.populations.qom).toEqual(['persian/shia','persian/sunni']);
    expect(result.faults).toEqual([]);
  });

test('reloading the 1096 eastern scaffold leaves effective worlds, catalogues and simulation untouched',
  async function ({page},info) {
    await openGame(page,info);
    function snapshot() {
      return {bookmarks:JSON.stringify(FBDATA.bookmarks),layouts:JSON.stringify(FBDATA.settlementLayouts),
        sites:JSON.stringify(FBDATA.settlementSites),religions:JSON.stringify(FBDATA.religions),
        state:JSON.stringify(FB.state),rng:FB.getRngState(),uid:FB.getUidCounter(),active:FB.activeBookmarkId};
    }
    const before = await page.evaluate(snapshot);
    await page.addScriptTag({url:new URL('data/bookmark_1096_scaffold_d.js',page.url()).href});
    expect(await page.evaluate(snapshot)).toEqual(before);
    const empty = await page.evaluate(function (keys) {
      return keys.every(function (key) {
        const b = FBDATA.bookmarkRegions1096[key];
        return !b.storyIds.length && !b.localInstitutions.length &&
          !Object.keys(b.opening.actors).length && !Object.keys(b.opening.appointments).length &&
          !b.opening.estates.length && !b.opening.claims.length && !b.opening.migrations.length;
      });
    },Object.keys(packets));
    expect(empty).toBe(true);
    await page.evaluate(function () {
      const b = FBDATA.bookmarkRegions1096.anatolia_caucasus;
      b.provinces[0].communities[0].populationShare0 = 1;
      b.settlementLayouts.nicaea[0].name = 'Independent staging';
    });
    expect(await page.evaluate(snapshot)).toEqual(before);
  });
