'use strict';

const path = require('path');
const {test,expect} = require('../support/fixture');
const {dependsOnRuntime} = require('../support/runtime-dependencies');
const {openGame} = require('../support/game/navigation');
const {beginBookmark,restoreBookmark} = require('../support/game/bookmark-acceptance');

dependsOnRuntime(__filename,[
  'index.html','data/bookmark_1096.js','data/identities_1096.js',
  'data/bookmark_1096_scaffold_a.js','data/bookmark_1096_scaffold_b.js',
  'data/bookmark_1096_scaffold_c.js','data/bookmark_1096_scaffold_d.js','data/bookmarks.js','data/counties.js',
  'data/bookmark_1066_inhabited.js','data/geographies.js','data/geography_expansion.js',
  'data/settlements.js','data/settlements_real.js','data/cultures.js','data/traits.js',
  'data/eras.js','data/government_rollout.js','js/model.js','js/world.js',
  'js/population.js','js/main.js','js/save.js','js/save_v4.js'
]);

const packets = {
  britain_south:'winchester salisbury dorset bath exeter canterbury rochester chichester lewes london colchester tamworth derby nottingham leicester gloucester worcester warwick chester shrewsbury northampton bedford norwich ipswich cambridge lincoln stamford gwynedd powys cardigan carmarthen cardiff cornwall'.split(' '),
  nordic_baltic:'agder stavanger bergen oslo tonsberg trondheim halogaland uppsala birka skara vaxjo kalmar visby norrland arhus viborg hedeby ribe roskilde lund sambia natangia samogitia vilnius riga jersika tallinn tartu turku hame savo kexholm torne_district w_lapland'.split(' '),
  central_danube:'veligrad olomouc brno nitra bratislava praha plzen budejovice poznan gniezno plock krakow wroclaw gdansk szczecin mecklenburg lubeck szekesfehervar moson sirmium osijek gyula cluj pliska silistra vidin zagreb sisak'.split(' '),
  rus_steppe:'novgorod ladoga pskov rostov suzdal beloozero smolensk kiev pereyaslavl chernigov kursk polotsk vitebsk turov minsk volodymyr lutsk etelkoz atil sarkel tmutarakan cherson bolghar bilyar upper_kama vychegda_district onega_district sarysu_corridor w_steppe_e w_ural w_taiga w_north'.split(' '),
  jazira:'mosul amida edessa harran raqqa'.split(' ')
};

async function loadScaffold(page, testInfo) {
  await openGame(page,testInfo);
  await page.addScriptTag({path:path.resolve(__dirname,'../../../data/bookmark_1096_scaffold_c.js')});
}

test('1096 quadrant c stages exactly its counties and keeps all source declarations unchanged', async function ({page}, testInfo) {
  await openGame(page,testInfo);
  const before = await page.evaluate(function () {
    return JSON.stringify({bookmarks:FBDATA.bookmarks,layouts:FBDATA.settlementLayouts,
      sites:FBDATA.settlementSites,cultures:FBDATA.cultures,religions:FBDATA.religions,
      current:FB.bookmark('1066')});
  });
  await page.addScriptTag({path:path.resolve(__dirname,'../../../data/bookmark_1096_scaffold_c.js')});
  const after = await page.evaluate(function () {
    return JSON.stringify({bookmarks:FBDATA.bookmarks,layouts:FBDATA.settlementLayouts,
      sites:FBDATA.settlementSites,cultures:FBDATA.cultures,religions:FBDATA.religions,
      current:FB.bookmark('1066')});
  });
  expect(after).toBe(before);
  const coverage = await page.evaluate(function (expected) {
    var seen = {}, duplicates = [], actual = {}, inhabited = 0, retained = [];
    Object.keys(expected).forEach(function (key) {
      var block = FBDATA.bookmarkRegions1096[key];
      actual[key] = block.provinces.map(function (p) {
        if (seen[p.id]) duplicates.push(p.id);
        seen[p.id] = true;
        if (p.wasteland) retained.push(p.id); else inhabited++;
        return p.id;
      });
    });
    return {actual:actual,duplicates:duplicates,count:Object.keys(seen).length,
      inhabited:inhabited,retained:retained.sort()};
  },packets);
  expect(coverage.actual).toEqual(packets);
  expect(coverage.duplicates).toEqual([]);
  expect(coverage.count).toBe(132);
  expect(coverage.inhabited).toBe(122);
  expect(coverage.retained).toEqual(['torne_district','upper_kama','vychegda_district',
    'onega_district','sarysu_corridor','w_lapland','w_steppe_e','w_ural','w_taiga','w_north'].sort());
});

test('1096 quadrant c preserves physical inputs and uncorrected residents with ordered settlement layouts', async function ({page}, testInfo) {
  await loadScaffold(page,testInfo);
  const result = await page.evaluate(function (keys) {
    var source = FB.bookmark('1066','inhabited_v2'), byId = {}, faults = [];
    var traditional = {religion:'slavic_pagan',communities:[
      {culture:'slavic',religion:'slavic_pagan',populationShare0:9000},
      {culture:'slavic',religion:'catholic',populationShare0:1000}
    ]};
    var corrections = {szczecin:traditional,mecklenburg:traditional,lubeck:traditional,
      etelkoz:{culture:'turkic',religion:'tengri'}};
    source.provinces.forEach(function (p) { byId[p.id] = p; });
    keys.forEach(function (key) {
      var block = FBDATA.bookmarkRegions1096[key];
      block.provinces.forEach(function (p) {
        var old = byId[p.id];
        if (!old) { faults.push(p.id + ': missing source'); return; }
        var correction = corrections[p.id] || {};
        ['name','x','y','terrain','duchy','dev','population0','culture','religion','communities','wasteland','maxRadiusKm'].forEach(function (field) {
          var expected = Object.prototype.hasOwnProperty.call(correction,field) ? correction[field] : old[field];
          if (JSON.stringify(p[field]) !== JSON.stringify(expected)) faults.push(p.id + ': unexpected ' + field);
        });
        if (p === old || p.communities && p.communities === old.communities) faults.push(p.id + ': shared source object');
        var layout = block.layouts[p.id];
        var oldLayout = FBDATA.settlementLayouts['1066_inhabited_v2'][p.id];
        if (p.wasteland) {
          if (layout || p.realm || p.culture || p.religion) faults.push(p.id + ': authored scenery authority');
        } else {
          if (JSON.stringify(layout) !== JSON.stringify(oldLayout)) faults.push(p.id + ': changed layout');
          if (!layout || !layout.length || layout === oldLayout) faults.push(p.id + ': missing or shared layout');
          (layout || []).forEach(function (row,index) {
            if (row === oldLayout[index]) faults.push(p.id + ': shared slot');
          });
        }
      });
    });
    return faults;
  },Object.keys(packets));
  expect(result).toEqual([]);
});

test('1096 quadrant c resolves its local references and declares only the three foreign courts', async function ({page}, testInfo) {
  await loadScaffold(page,testInfo);
  const result = await page.evaluate(function (keys) {
    var provinces = {}, realms = {}, faults = [], external = {};
    var foreign = {hre_1096:'frankfurt',byzantium_1096:'constantinople',croatia_1096:'knin'};
    var definition = {id:'1096',era:'high_medieval',geography:'europe_regional_2',date:{year:1096,season:0,day:1}};
    keys.forEach(function (key) {
      var block = FBDATA.bookmarkRegions1096[key];
      if (block !== FBDATA['bookmarkRevisionContent_1096_' + key]) faults.push(key + ': missing literal label owner');
      block.provinces.forEach(function (p) { provinces[p.id] = p; });
      block.realms.forEach(function (r) {
        if (realms[r.id] || foreign[r.id]) faults.push(r.id + ': duplicated court');
        realms[r.id] = r;
      });
    });
    function realmRef(id) {
      if (!realms[id] && !foreign[id]) faults.push(id + ': unknown court');
      if (foreign[id]) external[id] = true;
    }
    function identity(row,consumer,owner) {
      if (!FB.cultureExists(row.culture,null)) faults.push(owner + ': unknown culture');
      if (!FB.faithHistoricalAvailable(row.religion,definition,consumer)) faults.push(owner + ': unavailable faith');
    }
    Object.keys(provinces).forEach(function (id) {
      var p = provinces[id];
      if (p.wasteland) return;
      realmRef(p.realm);
      if (!FBDATA.duchies[p.duchy]) faults.push(id + ': unknown duchy');
      var communities = p.communities || [{culture:p.culture,religion:p.religion,populationShare0:10000}];
      var pairs = {}, total = 0;
      communities.forEach(function (c) {
        identity(c,'community',id);
        var pair = c.culture + '/' + c.religion;
        if (pairs[pair]) faults.push(id + ': duplicate community');
        pairs[pair] = true; total += c.populationShare0;
      });
      if (total !== 10000 || communities[0].culture !== p.culture || communities[0].religion !== p.religion) faults.push(id + ': invalid community shares');
    });
    Object.keys(realms).forEach(function (id) {
      var r = realms[id], capital = provinces[r.capital];
      if (!capital || capital.wasteland || capital.realm !== id) faults.push(id + ': invalid capital');
      if (!FBDATA.governmentForms[r.government]) faults.push(id + ': unknown government');
      if (r.liege) realmRef(r.liege);
      identity({culture:r.ruler.culture,religion:r.religion},'character',id);
      if (!FBDATA.traits[r.ruler.trait]) faults.push(id + ': unknown trait');
      if (r.ruler.generated && (r.ruler.name || r.royalCourt || r.ruler.born < 1041 || r.ruler.born > 1076)) faults.push(id + ': fabricated historical identity');
    });
    keys.forEach(function (key) {
      var block = FBDATA.bookmarkRegions1096[key];
      Object.keys(block.layouts).forEach(function (pid) {
        if (!provinces[pid] || provinces[pid].wasteland) faults.push(pid + ': layout outside inhabited coverage');
        block.layouts[pid].forEach(function (row) {
          if (!FBDATA.settlementSites[row.site]) faults.push(pid + ': unknown site ' + row.site);
        });
      });
    });
    return {faults:faults,courts:Object.keys(realms).length,external:Object.keys(external).sort()};
  },Object.keys(packets));
  expect(result).toEqual({faults:[],courts:32,external:['byzantium_1096','croatia_1096','hre_1096']});
});

test('1096 quadrant c redates court identities and separates contested source jurisdictions', async function ({page}, testInfo) {
  await loadScaffold(page,testInfo);
  const result = await page.evaluate(function (keys) {
    var provinces = {}, realms = {}, named = [], generated = 0;
    keys.forEach(function (key) {
      var block = FBDATA.bookmarkRegions1096[key];
      block.provinces.forEach(function (p) { provinces[p.id] = p; });
      block.realms.forEach(function (r) {
        realms[r.id] = r;
        if (r.ruler.generated) generated++;
        else named.push([r.id,r.ruler.name,r.ruler.born,r.ruler.culture,r.religion]);
      });
    });
    var owners = {};
    ['veligrad','olomouc','brno','nitra','bratislava','etelkoz','zagreb','sisak','pliska','silistra','vidin','cherson',
      'smolensk','volodymyr','lutsk','minsk','kursk','turov','rostov','suzdal','beloozero',
      'mosul','amida','edessa','harran','raqqa'].forEach(function (id) { owners[id] = provinces[id].realm; });
    return {named:named.sort(),generated:generated,owners:owners,
      englandResidents:provinces.london.culture,edessaResidents:provinces.edessa.communities,
      edessaCourt:[realms.edessa_1096.ruler.culture,realms.edessa_1096.religion],
      rusLieges:['kiev_1096','novgorod_1096','smolensk_1096','chernigov_1096','pereyaslavl_1096','polotsk_1096','turov_volhynia_1096','volhynia_1096']
        .filter(function (id) { return !!realms[id].liege; })};
  },Object.keys(packets));
  expect(result.named).toEqual([
    ['denmark_1096','Erik I Ejegod',1056,'norse','catholic'],
    ['england_1096','William II Rufus',1060,'norman','catholic'],
    ['kiev_1096','Sviatopolk II',1050,'rus','orthodox'],
    ['norway_1096','Magnus III',1073,'norse','catholic']
  ]);
  expect(result.generated).toBe(28);
  expect(result.owners).toEqual({veligrad:'bohemia_1096',olomouc:'bohemia_1096',brno:'bohemia_1096',
    nitra:'hungary_1096',bratislava:'hungary_1096',etelkoz:'cuman_courts_1096',zagreb:'croatia_1096',sisak:'croatia_1096',
    pliska:'byzantium_1096',silistra:'byzantium_1096',vidin:'byzantium_1096',cherson:'byzantium_1096',
    smolensk:'smolensk_1096',volodymyr:'volhynia_1096',lutsk:'volhynia_1096',minsk:'polotsk_1096',
    kursk:'pereyaslavl_1096',turov:'turov_volhynia_1096',rostov:'novgorod_1096',suzdal:'novgorod_1096',beloozero:'novgorod_1096',
    mosul:'mosul_1096',amida:'amida_1096',edessa:'edessa_1096',harran:'harran_1096',raqqa:'raqqa_1096'});
  expect(result.englandResidents).toBe('english');
  expect(result.edessaResidents).toEqual([{culture:'arabic',religion:'sunni',populationShare0:7000},
    {culture:'syriac',religion:'eastern',paired:true,populationShare0:3000}]);
  expect(result.edessaCourt).toEqual(['armenian','orthodox']);
  expect(result.rusLieges).toEqual([]);
});

test('1096 corrected courts and residents reach the composed world while held profiles stay provisional', async function ({page}, testInfo) {
  await openGame(page,testInfo);
  const result = await page.evaluate(function () {
    var b = FB.bookmark('1096'), provinces = {}, realms = {};
    b.provinces.forEach(function (p) { provinces[p.id] = p; });
    b.realms.forEach(function (r) { realms[r.id] = r; });
    return {
      baltic:['szczecin','mecklenburg','lubeck'].map(function (id) {
        return [provinces[id].religion,provinces[id].communities];
      }),
      obotrite:[realms.obotrite_1096.capital,realms.obotrite_1096.religion,realms.obotrite_1096.ruler.generated],
      etelkoz:[provinces.etelkoz.culture,provinces.etelkoz.religion],
      rus:['smolensk_1096','volhynia_1096','turov_volhynia_1096'].map(function (id) {
        var r = realms[id];
        return [r.id,r.name,r.capital,r.government,r.rank,r.religion,r.ruler.generated,r.ruler.culture,r.ruler.born];
      }),
      amida:[realms.amida_1096.ruler.culture,realms.amida_1096.ruler.generated,provinces.amida.communities],
      erik:realms.denmark_1096.ruler.born,
      held:[realms.sweden_1096.capital,realms.sweden_1096.ruler.generated,
        provinces.gwynedd.realm,provinces.powys.realm,provinces.gdansk.religion],
      validated:FB.validateBookmark(b)
    };
  });
  expect(result.baltic).toEqual(['szczecin','mecklenburg','lubeck'].map(function () {
    return ['slavic_pagan',[{culture:'slavic',religion:'slavic_pagan',populationShare0:9000},
      {culture:'slavic',religion:'catholic',populationShare0:1000}]];
  }));
  expect(result.obotrite).toEqual(['lubeck','catholic',true]);
  expect(result.etelkoz).toEqual(['turkic','tengri']);
  expect(result.rus).toEqual([
    ['smolensk_1096','Smolensk','smolensk','territorial',2,'orthodox',true,'rus',1060],
    ['volhynia_1096','Volhynia','volodymyr','territorial',2,'orthodox',true,'rus',1060],
    ['turov_volhynia_1096','Turov','turov','territorial',2,'orthodox',true,'rus',1060]
  ]);
  expect(result.amida).toEqual(['turkic',true,[{culture:'arabic',religion:'sunni',populationShare0:7000},
    {culture:'syriac',religion:'eastern',paired:true,populationShare0:3000}]]);
  expect(result.erik).toBe(1056);
  expect(result.held).toEqual(['uppsala',true,'gwynedd_powys_1096','gwynedd_powys_1096','catholic']);
  expect(result.validated).toEqual([]);
});

test('1096 corrected owners, court identities and mixed residents survive fresh creation and restore', async function ({page}, testInfo) {
  await beginBookmark(page,testInfo,'1096','farmer');
  function snapshot() {
    var s = FB.state;
    return {
      owners:['smolensk','volodymyr','lutsk','minsk','kursk','turov'].map(function (id) {
        return [id,s.owner[id],FB.topRealm(s,s.holder[id])];
      }),
      courts:['smolensk_1096','volhynia_1096','turov_volhynia_1096','obotrite_1096','amida_1096'].map(function (id) {
        var r = s.realms[id], ruler = FB.realmRulerCharacterSnapshot(s,id);
        return [id,r.capital,r.religion,ruler && ruler.culture,ruler && ruler.id];
      }),
      residents:['szczecin','mecklenburg','lubeck','etelkoz','amida'].map(function (id) {
        var communities = FB.countyCommunities(s,id);
        return {id:id,pairs:communities.map(function (c) { return [c.culture,c.religion]; }),
          partitioned:communities.reduce(function (sum,c) { return sum + c.count; },0) === FB.countyPopulation(s,id),
          catholicShare:FB.countyReligionShare(s,id,'catholic')};
      }),
      errors:FBTEST.checkInvariants(),saveErrors:FB.save.v4.validatePlatform(s)
    };
  }
  const before = await page.evaluate(snapshot);
  expect(before.owners).toEqual([
    ['smolensk','smolensk_1096','smolensk_1096'],['volodymyr','volhynia_1096','volhynia_1096'],
    ['lutsk','volhynia_1096','volhynia_1096'],['minsk','polotsk_1096','polotsk_1096'],
    ['kursk','pereyaslavl_1096','pereyaslavl_1096'],['turov','turov_volhynia_1096','turov_volhynia_1096']
  ]);
  expect(before.courts.map(function (r) { return r.slice(0,4); })).toEqual([
    ['smolensk_1096','smolensk','orthodox','rus'],['volhynia_1096','volodymyr','orthodox','rus'],
    ['turov_volhynia_1096','turov','orthodox','rus'],['obotrite_1096','lubeck','catholic','slavic'],
    ['amida_1096','amida','sunni','turkic']
  ]);
  expect(before.courts.every(function (r) { return typeof r[4] === 'string' && !!r[4]; })).toBe(true);
  expect(new Set(before.courts.map(function (r) { return r[4]; })).size).toBe(5);
  before.residents.forEach(function (r,index) {
    expect(r.partitioned).toBe(true);
    if (index < 3) {
      expect(r.pairs).toEqual([['slavic','slavic_pagan'],['slavic','catholic']]);
      expect(r.catholicShare).toBeCloseTo(0.1,3);
    }
  });
  expect(before.residents[3].pairs).toEqual([['turkic','tengri']]);
  expect(before.residents[4].pairs).toEqual([['arabic','sunni'],['syriac','eastern']]);
  expect(before.errors).toEqual([]);
  expect(before.saveErrors).toEqual([]);
  const save = await page.evaluate(function () { return FB.save.serialize(); });
  await restoreBookmark(page,save);
  expect(await page.evaluate(snapshot)).toEqual(before);
});
