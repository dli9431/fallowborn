'use strict';
const {test,expect} = require('../support/fixture');
const {dependsOnRuntime} = require('../support/runtime-dependencies');
const {openGame} = require('../support/game/navigation');
const {beginBookmark,restoreBookmark} = require('../support/game/bookmark-acceptance');

dependsOnRuntime(__filename,[
  'index.html','data/bookmark_1096_scaffold_a.js','data/bookmark_1096.js','data/bookmarks.js',
  'data/bookmark_1066_inhabited.js','data/map_data.js','data/counties.js',
  'data/geographies.js','data/geography_expansion.js','data/settlements.js',
  'data/settlements_real.js','data/cultures.js','data/eras.js','data/climate.js',
  'data/political_institutions.js','js/world.js','js/model.js','js/governments.js',
  'js/starts.js','js/main.js','js/save.js','js/save_v4.js','js/bookmark_setup.js'
]);

const packets = {
  west_north:('paris chartres sens orleans rouen caen evreux bayeux angers tours le_mans blois bourges ' +
    'reims troyes chalons amiens st_quentin laon bruges ghent boulogne arras rennes nantes vannes ' +
    'quimper st_brieuc liege verdun').split(' '),
  west_south:('bordeaux agen perigueux poitiers angouleme limoges toulouse albi cahors rodez clermont ' +
    'le_puy bayonne auch narbonne beziers carcassonne dijon besancon auxerre lyon macon vienne arles ' +
    'marseille avignon nice geneva chambery grenoble').split(' '),
  iberia_north:('coruna santiago ourense lugo oviedo leon astorga zamora burgos santander alava salamanca ' +
    'avila caceres pamplona logrono aragon toledo cuenca guadalajara').split(' '),
  iberia_south:('sevilla cordoba ecija niebla granada malaga almeria guadix badajoz merida evora lisboa ' +
    'santarem coimbra silves beja valencia murcia denia albacete tortosa tarragona lerida zaragoza huesca ' +
    'tudela mallorca barcelona girona urgell').split(' '),
  maghreb:('tunis kairouan tripoli sirte barqa fes tangier tlemcen tahert algiers constantine oran aghmat ' +
    'sale sijilmasa draa_oases garama ghadames_oasis awjila_oasis w_sahara_w w_sahara_c w_sahara_e').split(' ')
};

test('1096 western blocks cover their exact physical partition with valid local and external references',
  async function ({page},info) {
    await openGame(page,info);
    const result = await page.evaluate(function (expected) {
      const blocks = FBDATA.bookmarkRegions1096, seen = {}, courts = {}, faults = [], counts = [];
      const geography = FB.geography('europe_regional_2'), seeds = {};
      const external = ['hre_1096','fatimid_1096'];
      geography.provinces.forEach(function (p) { seeds[p.id] = p; });
      Object.keys(expected).forEach(function (key) {
        const block = blocks[key];
        if (!block) { faults.push('missing block ' + key); return; }
        const ids = block.provinces.map(function (p) { return p.id; }).sort();
        if (JSON.stringify(ids) !== JSON.stringify(expected[key].slice().sort())) faults.push('partition ' + key);
        counts.push(block.provinces.length);
        block.realms.forEach(function (r) {
          if (courts[r.id]) faults.push('duplicate realm ' + r.id);
          courts[r.id] = r;
        });
        block.provinces.forEach(function (p) {
          if (seen[p.id] || !seeds[p.id]) faults.push('duplicate or unknown county ' + p.id);
          seen[p.id] = p;
          if (p.wasteland) {
            if (p.realm || p.communities || block.settlementLayouts[p.id]) faults.push('scenery politics ' + p.id);
            return;
          }
          const pairs = {};
          if (p.communities.reduce(function (sum,c) { return sum + c.populationShare0; },0) !== 10000)
            faults.push('community total ' + p.id);
          p.communities.forEach(function (c) {
            const pair = c.culture + ':' + c.religion;
            if (pairs[pair] || !FB.cultureAssignable(c.culture,null) || !FB.faithAssignable(c.religion,null))
              faults.push('community identity ' + p.id);
            pairs[pair] = true;
          });
          if (p.culture !== p.communities[0].culture || p.religion !== p.communities[0].religion)
            faults.push('principal community ' + p.id);
          if (p.duchy) {
            const d = block.duchies[p.duchy], k = d && block.kingdoms[d.kingdom];
            if (!d || !k || k.empire && !block.empires[k.empire]) faults.push('title chain ' + p.id);
          }
          const slots = block.settlementLayouts[p.id], sites = {};
          if (!slots || !slots.length) { faults.push('missing layout ' + p.id); return; }
          slots.forEach(function (slot) {
            if (sites[slot.site] || !FBDATA.settlementSites[slot.site] ||
                ['village','town','city'].indexOf(slot.kind) < 0) faults.push('invalid site ' + p.id);
            sites[slot.site] = true;
          });
        });
        Object.keys(block.settlementLayouts).forEach(function (id) {
          if (expected[key].indexOf(id) < 0) faults.push('foreign layout ' + id);
        });
      });
      const foreign = {};
      Object.keys(seen).forEach(function (id) {
        const p = seen[id];
        if (!p.wasteland && !courts[p.realm]) {
          foreign[p.realm] = true;
          if (external.indexOf(p.realm) < 0) faults.push('unresolved realm ' + p.realm);
        }
      });
      Object.keys(courts).forEach(function (id) {
        const r = courts[id], capital = seen[r.capital];
        if (!capital || capital.wasteland || capital.realm !== id) faults.push('capital ' + id);
        if (!FBDATA.governmentForms[r.government] || !FB.faithAssignable(r.religion,null) ||
            !FB.cultureAssignable(r.ruler.culture,null)) faults.push('court identity ' + id);
        if (r.liege && !courts[r.liege] && external.indexOf(r.liege) < 0) faults.push('liege ' + id);
        if (!Number.isInteger(r.ruler.born) || r.ruler.born > 1080 || r.ruler.born < 976)
          faults.push('adult ruler ' + id);
      });
      return {faults:faults,counts:counts,total:Object.keys(seen).length,
        inhabited:Object.keys(seen).filter(function (id) { return !seen[id].wasteland; }).length,
        realms:Object.keys(courts).length,external:Object.keys(foreign).sort()};
    },packets);
    expect(result).toEqual({faults:[],counts:[30,30,20,30,22],total:132,inhabited:127,
      realms:20,external:['fatimid_1096','hre_1096']});
  });

test('1096 western redating keeps bounded holdings and unresolved rulers without converting residents',
  async function ({page},info) {
    await openGame(page,info);
    const result = await page.evaluate(function (keys) {
      const rows = {}, courts = {}, source = FB.bookmark('1066','inhabited_v2');
      const prior = {}, sourceLayouts = FBDATA.settlementLayouts[source.settlementLayout];
      const faults = [];
      source.provinces.forEach(function (p) { prior[p.id] = p; });
      keys.forEach(function (key) {
        const block = FBDATA.bookmarkRegions1096[key];
        block.realms.forEach(function (r) { courts[r.id] = r; });
        block.provinces.forEach(function (p) {
          rows[p.id] = p;
          const old = prior[p.id];
          if (!old || !!p.wasteland !== !!old.wasteland) faults.push('source disposition ' + p.id);
          if (p.wasteland || !old) return;
          const expected = old.communities || [{culture:old.culture,religion:old.religion,populationShare0:10000}];
          if (JSON.stringify(p.communities) !== JSON.stringify(expected) || p.dev !== old.dev)
            faults.push('changed source residents or development ' + p.id);
          if (JSON.stringify(block.settlementLayouts[p.id]) !== JSON.stringify(sourceLayouts[p.id]))
            faults.push('changed source slot order ' + p.id);
        });
      });
      const generated = Object.keys(courts).filter(function (id) { return courts[id].ruler.generated; }).sort();
      generated.forEach(function (id) {
        const r = courts[id];
        if (r.ruler.name || r.ruler.born < 1041 || r.ruler.born > 1076 || r.royalCourt)
          faults.push('unresolved historical person ' + id);
      });
      return {faults:faults,generated:generated,
        named:Object.keys(courts).filter(function (id) { return !courts[id].ruler.generated; }).map(function (id) {
          return [id,courts[id].ruler.name,courts[id].ruler.born];
        }),
        ownership:['verdun','liege','toulouse','toledo','coimbra','huesca','valencia','murcia','denia',
          'albacete','cuenca','guadalajara','caceres','mallorca','sale','barqa','logrono','santarem','tunis',
          'kairouan'].map(function (id) { return [id,rows[id].realm]; }),
        godfrey:Object.keys(rows).filter(function (id) { return rows[id].realm === 'lower_lotharingia_1096'; }),
        raymond:Object.keys(rows).filter(function (id) { return rows[id].realm === 'toulouse_1096'; }),
        valencia:[courts.valencia_1096.religion,rows.valencia.religion],
        capitals:['almoravid_1096','zirid_1096','hammadid_1096'].map(function (id) { return courts[id].capital; })};
    },Object.keys(packets));
    expect(result).toEqual({faults:[],generated:[
      'awjila_local_1096','balearic_1096','barcelona_1096','brittany_1096','caceres_frontier_1096',
      'cuenca_frontier_1096','ghadames_local_1096','hammadid_1096',
      'normandy_1096','tunis_local_1096','valencia_1096','zaragoza_1096'],
      named:[['france_1096','Philip I',1052],['lower_lotharingia_1096','Godfrey of Bouillon',1060],
        ['aquitaine_1096','William IX',1071],['toulouse_1096','Raymond IV',1042],
        ['leon_castile_1096','Alfonso VI',1040],['aragon_pamplona_1096','Peter I',1068],
        ['almoravid_1096','Yusuf ibn Tashfin',1009],['zirid_1096','Tamim ibn al-Muizz',1031]],
      ownership:[['verdun','lower_lotharingia_1096'],['liege','hre_1096'],['toulouse','toulouse_1096'],
        ['toledo','leon_castile_1096'],['coimbra','leon_castile_1096'],['huesca','zaragoza_1096'],
        ['valencia','valencia_1096'],['murcia','almoravid_1096'],['denia','almoravid_1096'],
        ['albacete','almoravid_1096'],['cuenca','cuenca_frontier_1096'],
        ['guadalajara','leon_castile_1096'],['caceres','caceres_frontier_1096'],
        ['mallorca','balearic_1096'],['sale','almoravid_1096'],['barqa','fatimid_1096'],
        ['logrono','leon_castile_1096'],['santarem','leon_castile_1096'],['tunis','tunis_local_1096'],
        ['kairouan','zirid_1096']],
      godfrey:['verdun'],raymond:['toulouse'],valencia:['catholic','sunni'],
      capitals:['aghmat','kairouan','constantine']});
  });

test('western corrections compose one Tunis court and a Mahdia county anchor without converting residents',
  async function ({page},info) {
    await openGame(page,info);
    const result = await page.evaluate(function () {
      const b = FB.bookmark('1096'), counties = {}, courts = {};
      const source = FB.bookmark('1066','inhabited_v2'), prior = {};
      const before = JSON.stringify(FBDATA), rng = FB.getRngState(), uid = FB.getUidCounter();
      b.provinces.forEach(function (p) { counties[p.id] = p; });
      b.realms.forEach(function (r) { courts[r.id] = r; });
      source.provinces.forEach(function (p) { prior[p.id] = p; });
      const ids = ['logrono','guadalajara','santarem','tunis'];
      const local = courts.tunis_local_1096, zirid = courts.zirid_1096;
      const errors = FB.validateBookmark(b);
      return {errors:errors,owners:ids.map(function (id) { return [id,counties[id].realm]; }),
        residentsPreserved:ids.every(function (id) {
          const p = counties[id], old = prior[id];
          const communities = old.communities || [{culture:old.culture,religion:old.religion,populationShare0:10000}];
          return p.culture === old.culture && p.religion === old.religion && p.dev === old.dev &&
            JSON.stringify(p.communities) === JSON.stringify(communities);
        }),
        affiliations:[courts.leon_castile_1096.religion,counties.guadalajara.religion,counties.santarem.religion],
        local:{name:local.name,capital:local.capital,rank:local.rank,government:local.government,
          religion:local.religion,ruler:local.ruler,liege:local.liege || null,royalCourt:local.royalCourt || null},
        localCount:b.realms.filter(function (r) { return r.id === local.id; }).length,
        localCounties:b.provinces.filter(function (p) { return p.realm === local.id; }).map(function (p) { return p.id; }),
        retired:!!courts.guadalajara_frontier_1096 || b.provinces.some(function (p) { return p.realm === 'guadalajara_frontier_1096'; }),
        zirid:[zirid.capital,zirid.ruler.name,zirid.ruler.born,zirid.ruler.culture,zirid.religion],
        kairouan:[counties.kairouan.name,counties.kairouan.realm],
        cities:FBDATA.settlementLayouts[b.settlementLayout].kairouan.filter(function (slot) {
          return slot.kind === 'city';
        }).map(function (slot) { return [slot.site,slot.name]; }),
        pure:before === JSON.stringify(FBDATA) && rng === FB.getRngState() && uid === FB.getUidCounter()};
    });
    expect(result).toEqual({errors:[],owners:[['logrono','leon_castile_1096'],['guadalajara','leon_castile_1096'],
      ['santarem','leon_castile_1096'],['tunis','tunis_local_1096']],residentsPreserved:true,
      affiliations:['catholic','sunni','sunni'],
      local:{name:'Tunis court',capital:'tunis',rank:1,government:'territorial',religion:'sunni',
        ruler:{sex:'m',culture:'berber',born:1061,mar:8,trait:'patient',generated:true},liege:null,royalCourt:null},
      localCount:1,localCounties:['tunis'],retired:false,
      zirid:['kairouan','Tamim ibn al-Muizz',1031,'berber','sunni'],kairouan:['Kairouan','zirid_1096'],
      cities:[['kairouan','Kairouan'],['mahdia','Mahdia']],pure:true});
  });

test('fresh western ownership and generated Tunis identity survive a campaign restore',async function ({page},info) {
  await beginBookmark(page,info,'1096','farmer');
  const snapshot = function () {
    const s = FB.state, local = s.realms.tunis_local_1096, zirid = s.realms.zirid_1096;
    const person = FB.realmRulerCharacter(s,local.id);
    return {owners:['logrono','guadalajara','santarem','tunis','kairouan'].map(function (id) { return [id,s.owner[id]]; }),
      holders:['logrono','guadalajara','santarem','tunis','kairouan'].map(function (id) { return [id,s.holder[id]]; }),
      holderSovereigns:['logrono','guadalajara','santarem','tunis','kairouan'].map(function (id) {
        return [id,FB.topRealm(s,s.holder[id])];
      }),
      local:{capital:local.capital,generated:local.ruler.generated,name:local.ruler.name,born:local.ruler.born},
      person:{id:person.id,name:person.name,generated:person.generated,born:person.born},
      zirid:{capital:zirid.capital,name:zirid.ruler.name,born:zirid.ruler.born},
      retired:!!s.realms.guadalajara_frontier_1096,
      communities:['guadalajara','santarem','tunis'].map(function (id) { return [id,FB.countyCommunities(s,id)]; })};
  };
  const original = await page.evaluate(snapshot);
  const owners = [['logrono','leon_castile_1096'],['guadalajara','leon_castile_1096'],
    ['santarem','leon_castile_1096'],['tunis','tunis_local_1096'],['kairouan','zirid_1096']];
  expect(original).toMatchObject({owners:owners,holderSovereigns:owners,retired:false,
    local:{capital:'tunis',generated:true,born:1061},person:{generated:true,born:1061},
    zirid:{capital:'kairouan',name:'Tamim ibn al-Muizz',born:1031}});
  expect(original.local.name).toEqual(expect.any(String));
  expect(original.local.name.length).toBeGreaterThan(0);
  const saved = await page.evaluate(function () { return FB.save.serialize(); });
  await restoreBookmark(page,saved);
  expect(await page.evaluate(snapshot)).toEqual(original);
});

test('reloading western staging leaves active worlds, layouts, people and RNG untouched',
  async function ({page},info) {
    await openGame(page,info);
    const before = await page.evaluate(function () {
      return {bookmarks:JSON.stringify(FBDATA.bookmarks),layouts:JSON.stringify(FBDATA.settlementLayouts),
        sites:JSON.stringify(FBDATA.settlementSites),state:JSON.stringify(FB.state),
        rng:FB.getRngState(),uid:FB.getUidCounter(),active:FB.activeBookmarkId};
    });
    await page.addScriptTag({url:new URL('data/bookmark_1096_scaffold_a.js',page.url()).href});
    const after = await page.evaluate(function (keys) {
      const facts = {bookmarks:JSON.stringify(FBDATA.bookmarks),layouts:JSON.stringify(FBDATA.settlementLayouts),
        sites:JSON.stringify(FBDATA.settlementSites),state:JSON.stringify(FB.state),
        rng:FB.getRngState(),uid:FB.getUidCounter(),active:FB.activeBookmarkId};
      const faults = [];
      keys.forEach(function (key) {
        const b = FBDATA.bookmarkRegions1096[key];
        if (b.storyIds.length || Object.keys(b.opening.actors).length || Object.keys(b.opening.appointments).length ||
            b.opening.estates.length || b.opening.claims.length || b.opening.migrations.length)
          faults.push('unexpected opening effect ' + key);
      });
      const staging = FBDATA.bookmarkRegions1096.west_north;
      staging.provinces[0].communities[0].populationShare0 = 1;
      staging.settlementLayouts.paris[0].name = 'Independent staging';
      facts.bookmarksAfterMutation = JSON.stringify(FBDATA.bookmarks);
      facts.layoutsAfterMutation = JSON.stringify(FBDATA.settlementLayouts);
      return {facts:facts,faults:faults};
    },Object.keys(packets));
    expect(after.faults).toEqual([]);
    expect(after.facts).toEqual(Object.assign({},before,{
      bookmarksAfterMutation:before.bookmarks,layoutsAfterMutation:before.layouts
    }));
  });
