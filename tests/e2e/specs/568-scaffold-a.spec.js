'use strict';

const path = require('path');
const {test,expect} = require('../support/fixture');
const {openGame} = require('../support/game/navigation');
const {openCrazyGame} = require('../support/game/crazygames-title');
const {mockCrazyGames} = require('../support/crazygames');
const {dependsOnRuntime} = require('../support/runtime-dependencies');

dependsOnRuntime(__filename,[
  'index.html','data/bookmark_568.js','data/starts_568.js',
  'data/bookmark_568_scaffold_a.js','data/bookmark_568_identities.js',
  'data/bookmark_568_scaffold_b.js','data/bookmark_568_scaffold_c.js','data/bookmark_568_scaffold_d.js',
  'data/bookmark_493.js','data/bookmark_493_world.js','data/bookmark_476_wider.js',
  'data/bookmark_476_wider_identities.js','data/counties.js','data/geographies.js','data/geography_expansion.js',
  'data/cultures.js','data/traits.js','data/climate.js',
  'data/eras.js','data/settlements.js','data/settlements_real.js',
  'data/political_institutions.js','data/aristocratic_courts.js',
  'js/model.js','js/world.js','js/bookmark_setup.js','js/main.js','js/starts.js',
  'js/population.js','js/ui_modals.js',
  'js/government_administration.js','js/government_aristocracy.js','js/crazygames.js'
]);

const packets = {
  italy:'torino aosta genoa milano pavia brescia verona trento padova venezia aquileia friuli parma modena bologna ravenna firenze pisa siena lucca spoleto perugia ancona roma viterbo benevento capua salerno bari taranto foggia brindisi reggio cosenza palermo messina siracusa cagliari sassari ajaccio'.split(' '),
  iran_caucasus:'van ani kars dvin tbilisi kutaisi sukhumi magas samandar derbent baghdad samarra kufa basra wasit rayy qazvin hamadan isfahan qom tabriz ardabil shiraz istakhr kerman bam hormuz merv nishapur herat amol gorgan rasht central_iran_oases eastern_iran_oases sarakhs_oasis w_kavir w_lut'.split(' '),
  central_europe:'hamburg hannover braunschweig magdeburg erfurt leipzig meissen veligrad olomouc brno nitra bratislava praha plzen budejovice poznan gniezno plock krakow wroclaw gdansk szczecin mecklenburg lubeck'.split(' '),
  iberia_north_interior:'coruna santiago ourense lugo oviedo leon astorga zamora burgos santander alava salamanca avila caceres pamplona logrono aragon toledo cuenca guadalajara'.split(' '),
  britain_west:'gwynedd powys cardigan carmarthen cardiff cornwall'.split(' ')
};

for (const crazygames of [false,true]) {
  test('568 quadrant a loads inertly on ' + (crazygames ? 'CrazyGames' : 'standard') + ' boot', async function ({page},testInfo) {
    if (crazygames) {
      await mockCrazyGames(page);
      await page.addInitScript(function () {
        window.FB_DISTRIBUTION = 'crazygames';
        window.FB_CRAZYGAMES_STORAGE = 'localstorage';
      });
      await openCrazyGame(page,testInfo);
    } else await openGame(page,testInfo);
    const before = await page.evaluate(function () {
      window.scaffoldSnapshot568 = function () {
        return JSON.stringify([FBDATA.bookmarks,FBDATA.settlementLayouts,FBDATA.settlementSites,
          FBDATA.cultures,FBDATA.religions,FBDATA.administrationProfiles,FBDATA.aristocraticProfiles,
          FB.getRngState(),FB.getUidCounter()]);
      };
      FBDATA.bookmarkRegions568.siblingSentinel = {provinces:[]};
      return window.scaffoldSnapshot568();
    });
    await page.addScriptTag({path:path.resolve(__dirname,'../../../data/bookmark_568_scaffold_a.js')});
    expect(await page.evaluate(function () { return window.scaffoldSnapshot568(); })).toBe(before);
    expect(await page.evaluate(function (keys) {
      const scripts = Array.prototype.map.call(document.scripts,function (s) { return s.getAttribute('src'); });
      return {distribution:FB.platform.isCrazyGames,
        loaded:scripts.indexOf('data/bookmark_568_scaffold_a.js') > scripts.indexOf('data/bookmark_493_world.js'),
        blocks:keys.every(function (key) { return !!FBDATA.bookmarkRegions568[key]; }),
        sibling:!!FBDATA.bookmarkRegions568.siblingSentinel,
        selectableWorld:FB.bookmarkAvailable('568'),layout:!!FBDATA.settlementLayouts['568'],
        policies:!!FBDATA.administrationProfiles.sasanian_provinces_568 && !!FBDATA.aristocraticProfiles.sasanian_568};
    },Object.keys(packets))).toEqual({distribution:crazygames,loaded:true,blocks:true,sibling:true,
      selectableWorld:true,layout:true,policies:true});
  });
}

test('568 quadrant a covers each allocated county once with complete inhabited layouts', async function ({page},testInfo) {
  await openGame(page,testInfo);
  const result = await page.evaluate(function (keys) {
    const actual = {}, seen = {}, duplicates = [], scenery = [], faults = [];
    const seeds = {};
    FB.geography('europe_regional_2').provinces.forEach(function (p) { seeds[p.id] = p; });
    keys.forEach(function (key) {
      const b = FBDATA.bookmarkRegions568[key];
      actual[key] = b.provinces.map(function (p) {
        if (seen[p.id]) duplicates.push(p.id);
        seen[p.id] = true;
        if (!seeds[p.id]) faults.push(p.id + ': unknown physical county');
        if (p.wasteland) {
          scenery.push(p.id);
          if (p.realm || p.culture || p.religion || p.communities || b.layouts[p.id]) faults.push(p.id + ': inhabited scenery');
        } else {
          if (!b.layouts[p.id] || !b.layouts[p.id].length) faults.push(p.id + ': missing layout');
          if (p.duchy && !b.duchies[p.duchy]) faults.push(p.id + ': missing district');
          (b.layouts[p.id] || []).forEach(function (slot) {
            if (!FBDATA.settlementSites[slot.site]) faults.push(p.id + ': unknown site ' + slot.site);
          });
          if (b.climate[p.id] && !FBDATA.climateZones[b.climate[p.id]]) faults.push(p.id + ': unknown climate');
        }
        return p.id;
      });
      Object.keys(b.layouts).forEach(function (id) {
        if (!b.provinces.some(function (p) { return p.id === id && !p.wasteland; })) faults.push(id + ': foreign layout');
      });
    });
    return {actual:actual,duplicates:duplicates,count:Object.keys(seen).length,scenery:scenery.sort(),faults:faults};
  },Object.keys(packets));
  expect(result).toEqual({actual:packets,duplicates:[],count:128,scenery:['w_kavir','w_lut'],faults:[]});
});

test('568 quadrant a resolves local references and declares shared courts only once', async function ({page},testInfo) {
  await openGame(page,testInfo);
  const result = await page.evaluate(function (keys) {
    const provinces = {}, realms = {}, faults = [], outside = {}, external = {east_568:'constantinople',austrasia_568:'metz'};
    const foreignCapitals = {visigoths_568:'narbonne',dumnonia_568:'exeter'};
    const candidate = {id:'568',era:'late_antique',date:{year:568,season:0,day:1}};
    const oldReligions = FBDATA.religions, oldBookmarks = FBDATA.bookmarks;
    try {
      // Register only metadata in this isolated context so availability selectors can resolve the date.
      FBDATA.bookmarks = Object.assign({},oldBookmarks,{'568':candidate});
      FBDATA.religions = Object.assign({},oldReligions);
      Object.keys(FBDATA.bookmarkFaithAvailability568).forEach(function (id) {
        const old = oldReligions[id], availability = JSON.parse(JSON.stringify(old.availability));
        if (availability.bookmarkIds.indexOf('568') < 0) availability.bookmarkIds.push('568');
        FBDATA.religions[id] = Object.assign({},old,{availability:availability});
      });
      FB.invalidateReligionData();
      keys.forEach(function (key) {
        const b = FBDATA.bookmarkRegions568[key];
        b.provinces.forEach(function (p) { provinces[p.id] = p; });
        b.realms.forEach(function (r) {
          if (realms[r.id] || external[r.id]) faults.push(r.id + ': duplicate sovereign');
          realms[r.id] = r;
        });
      });
      function court(id) {
        if (!realms[id] && !external[id]) faults.push(id + ': missing court');
        if (external[id]) outside[id] = true;
      }
      function identity(row,consumer,id) {
        if (!FB.cultureExists(row.culture,null)) faults.push(id + ': invalid culture');
        if (!FB.faithHistoricalAvailable(row.religion,candidate,consumer)) faults.push(id + ': unavailable faith');
      }
      Object.keys(provinces).forEach(function (id) {
        const p = provinces[id];
        if (p.wasteland) return;
        court(p.realm);
        const pairs = {}, communities = p.communities || [];
        let total = 0;
        communities.forEach(function (c) {
          identity(c,'community',id);
          const pair = c.culture + '/' + c.religion;
          if (pairs[pair] || !Number.isInteger(c.populationShare0) || c.populationShare0 <= 0) faults.push(id + ': invalid share');
          pairs[pair] = true; total += c.populationShare0;
        });
        if (total !== 10000 || !communities[0] || communities[0].culture !== p.culture || communities[0].religion !== p.religion) faults.push(id + ': invalid primary community');
        if (p.customaryRights.some(function (r) { return r.basis !== 'possession' || r.basisRef; })) faults.push(id + ': copied tenure');
      });
      Object.keys(realms).forEach(function (id) {
        const r = realms[id], capital = provinces[r.capital];
        if (!foreignCapitals[id] && (!capital || capital.wasteland || capital.realm !== id)) faults.push(id + ': invalid capital');
        if (foreignCapitals[id] && foreignCapitals[id] !== r.capital) faults.push(id + ': changed outside anchor');
        if (!FBDATA.governmentForms[r.government]) faults.push(id + ': unknown government');
        if (r.liege) court(r.liege);
        identity({culture:r.ruler.culture,religion:r.religion},'character',id);
        if (!FBDATA.traits[r.ruler.trait]) faults.push(id + ': unknown trait');
        if (r.ruler.generated && (r.ruler.name || r.ruler.born < 523 || r.ruler.born > 543 || r.royalCourt)) faults.push(id + ': invented historical person');
        if (r.royalCourt) faults.push.apply(faults,FB.royalCourtFaults(r.royalCourt,r.ruler,568,provinces));
      });
      keys.forEach(function (key) {
        const b = FBDATA.bookmarkRegions568[key];
        Object.keys(b.opening.actors).forEach(function (id) { identity(b.opening.actors[id],'character',id); });
        faults.push.apply(faults,FB.openingDefinitionFaults(Object.assign({},candidate,{
          provinces:b.provinces,realms:b.realms,opening:b.opening
        })));
      });
      return {faults:faults,courts:Object.keys(realms).length,external:Object.keys(outside).sort(),foreignCapitals:foreignCapitals};
    } finally {
      FBDATA.religions = oldReligions;
      FBDATA.bookmarks = oldBookmarks;
      FB.invalidateReligionData();
    }
  },Object.keys(packets));
  expect(result).toEqual({faults:[],courts:22,external:['austrasia_568','east_568'],
    foreignCapitals:{visigoths_568:'narbonne',dumnonia_568:'exeter'}});
});

test('568 quadrant a redates courts without transplanting dead rulers, kin or historical transactions', async function ({page},testInfo) {
  await openGame(page,testInfo);
  const result = await page.evaluate(function (keys) {
    const provinces = {}, realms = {}, named = [], faults = [];
    keys.forEach(function (key) {
      const b = FBDATA.bookmarkRegions568[key];
      b.provinces.forEach(function (p) { provinces[p.id] = p; });
      b.realms.forEach(function (r) {
        realms[r.id] = r;
        if (!r.ruler.generated) named.push([r.id,r.ruler.name,r.ruler.born,r.religion]);
      });
      if (b.storyIds.length || Object.keys(b.institutions).length || Object.keys(b.opening.appointments).length ||
          b.opening.estates.length || b.opening.claims.length || b.opening.migrations.length) faults.push(key + ': inherited historical operation');
    });
    const italianOwners = FBDATA.bookmarkRegions568.italy.provinces.map(function (p) { return p.realm; });
    return {named:named,faults:faults,italy:italianOwners.every(function (id) { return id === 'east_568'; }),
      lieges:[realms.lazica_568.liege,realms.kartli_568.liege,realms.thuringian_568.liege],
      eastIran:['merv','nishapur','herat','sarakhs_oasis','central_iran_oases','eastern_iran_oases'].map(function (id) { return provinces[id].realm; }),
      suevicCourt:realms.suebi_568.religion,
      westBritain:['gwynedd','powys','cardiff','cornwall'].map(function (id) { return provinces[id].realm; }),
      historicalKin:realms.sasanian_568.royalCourt.members};
  },Object.keys(packets));
  expect(result).toEqual({named:[['sasanian_568','Khosrow I',513,'zoroastrian']],faults:[],italy:true,
    lieges:['east_568','sasanian_568','austrasia_568'],eastIran:Array(6).fill('sasanian_568'),
    suevicCourt:'nicene',westBritain:['western_britons_568','powys_568','south_wales_568','dumnonia_568'],historicalKin:[]});
});

test('568 Hira includes Arab Christians without changing its principal community or traditional court', async function ({page},testInfo) {
  await openGame(page,testInfo);
  expect(await page.evaluate(function () {
    const block = FBDATA.bookmarkRegions568.iran_caucasus, b = FB.bookmark('568');
    const staged = block.provinces.find(function (p) { return p.id === 'kufa'; });
    const county = b.provinces.find(function (p) { return p.id === 'kufa'; });
    const court = b.realms.find(function (r) { return r.id === 'lakhmid_568'; });
    const before = JSON.stringify(FBDATA), rng = FB.getRngState(), uid = FB.getUidCounter();
    const errors = FB.validateBookmark(b);
    return {errors:errors,communities:FB.provinceCommunities(county),
      shares:county.communities.reduce(function (sum,c) { return sum + c.populationShare0; },0),
      staged:JSON.stringify(staged.communities) === JSON.stringify(county.communities),
      portrait:[county.culture,county.religion,county.realm,county.dev],
      court:[court.capital,court.ruler.culture,court.religion,court.liege,court.ruler.generated],
      layout:FBDATA.settlementLayouts['568'].kufa,
      assignable:FB.faithHistoricalAvailable('east_syriac',b,'community'),
      pure:before === JSON.stringify(FBDATA) && rng === FB.getRngState() && uid === FB.getUidCounter()};
  })).toEqual({errors:[],communities:[
    {culture:'syriac',religion:'east_syriac',populationShare0:6000},
    {culture:'arabian_476',religion:'arabian_traditional_476',populationShare0:2000},
    {culture:'arabian_476',religion:'east_syriac',populationShare0:2000}],shares:10000,staged:true,
    portrait:['syriac','east_syriac','lakhmid_568',3],
    court:['kufa','arabian_476','arabian_traditional_476','sasanian_568',true],
    layout:[{site:'kufa_493',name:'Hira district',kind:'town'}],assignable:true,pure:true});
});

test('568 Hira offers its new resident choice to an ordinary household and conserves opening population', async function ({page},testInfo) {
  await openGame(page,testInfo);
  const fullStart = page.locator('#btn-choose-beginning');
  if (await fullStart.isVisible()) await fullStart.click();
  else await page.getByRole('button',{name:'New Game',exact:true}).click();
  await page.locator('#btn-bm-seed').click();
  await page.locator('#ng-seed').fill('HIRA568-568-craftsman_568-kufa-m-Review-standard-0-arabian_476.east_syriac');
  await page.locator('#ng-seed').press('Enter');
  await expect(page.locator('#chargen:not(.hidden)')).toBeVisible();
  const choices = page.locator('input[name=cg-community]');
  await expect(choices).toHaveCount(3);
  await expect(choices.nth(2)).toBeChecked();
  await page.getByRole('button',{name:'Begin Your Story',exact:true}).click();
  await page.getByRole('button',{name:'Begin',exact:true}).click();
  const result = await page.evaluate(function () {
    FB.game.setPaused(true);
    const s = FB.state, me = s.chars[s.player.charId], county = s.population.counties.kufa;
    const communities = FB.countyCommunities(s,'kufa');
    return {bookmark:s.start.id,home:s.player.provinceId,identity:[me.culture,me.religion],
      owner:s.owner.kufa,principal:[FB.world.byId.kufa.culture,FB.world.byId.kufa.religion],
      pairs:communities.map(function (c) { return c.culture + '/' + c.religion; }),
      count:county.count,total:communities.reduce(function (sum,c) { return sum + c.count; },0),
      counts:communities.map(function (c) { return c.count; }),
      changes:[county.natural,county.migration,county.losses]};
  });
  expect(result).toMatchObject({bookmark:'568',home:'kufa',identity:['arabian_476','east_syriac'],
    owner:'lakhmid_568',principal:['syriac','east_syriac'],
    pairs:['syriac/east_syriac','arabian_476/arabian_traditional_476','arabian_476/east_syriac'],
    changes:[0,0,0]});
  expect(result.count).toBeGreaterThan(0);
  expect(result.total).toBe(result.count);
  for (let i = 0; i < result.counts.length; i++) {
    expect(result.counts[i]).toBeGreaterThan(0);
    expect(Math.abs(result.counts[i] - result.count * [0.6,0.2,0.2][i])).toBeLessThanOrEqual(1);
  }
});

test('568 Sasanian court has valid date-owned provincial profiles and adult opening actors', async function ({page},testInfo) {
  await openGame(page,testInfo);
  expect(await page.evaluate(function () {
    const b = FBDATA.bookmarkRegions568.iran_caucasus;
    const oldAdministration = FBDATA.administrationProfiles, oldAristocracy = FBDATA.aristocraticProfiles;
    const before = JSON.stringify([oldAdministration,oldAristocracy,b,FB.getRngState(),FB.getUidCounter()]);
    let result;
    try {
      FBDATA.administrationProfiles = Object.assign({},oldAdministration,b.administrationProfiles);
      FBDATA.aristocraticProfiles = Object.assign({},oldAristocracy,b.aristocraticProfiles);
      const candidate = {id:'568',era:'late_antique',date:{year:568,season:0,day:1},
        provinces:b.provinces,realms:b.realms,opening:b.opening};
      const broken = JSON.parse(JSON.stringify(candidate));
      delete broken.opening.actors.ray_principal_568;
      result = {administration:FB.validateAdministrationProfiles(b.administrationProfiles),
        aristocracy:FB.aristocracy.validateProfiles(),opening:FB.aristocracy.openingFaults(candidate),
        missingActorRejected:FB.aristocracy.openingFaults(broken).length > 0,
        actors:Object.keys(b.opening.actors).length,
        generated:Object.keys(b.opening.actors).every(function (id) {
          const actor = b.opening.actors[id];
          return !actor.name && !actor.father && !actor.mother && actor.born === 533 &&
            b.provinces.some(function (p) { return p.id === actor.home && p.realm === 'sasanian_568'; });
        })};
    } finally {
      FBDATA.administrationProfiles = oldAdministration;
      FBDATA.aristocraticProfiles = oldAristocracy;
    }
    result.unchanged = before === JSON.stringify([oldAdministration,oldAristocracy,b,FB.getRngState(),FB.getUidCounter()]);
    return result;
  })).toEqual({administration:[],aristocracy:[],opening:[],missingActorRejected:true,
    actors:4,generated:true,unchanged:true});
});

test('568 region literals remain independent when a source declaration changes', async function ({page},testInfo) {
  await openGame(page,testInfo);
  const before = await page.evaluate(function () { return JSON.stringify(FBDATA.bookmarkRegions568); });
  await page.evaluate(function () {
    const source = FBDATA.bookmarkCandidates['493'];
    const p = source.provinces.filter(function (row) { return row.id === 'ravenna'; })[0];
    p.communities[0].populationShare0 = 1;
    source.realms[0].ruler.born = 1;
    FBDATA.settlementLayouts['493'].ravenna[0].name = 'Changed source';
    FBDATA.bookmarkExpansion493.provinces[0].realm = 'changed';
  });
  await page.addScriptTag({path:path.resolve(__dirname,'../../../data/bookmark_568_scaffold_a.js')});
  expect(await page.evaluate(function () { return JSON.stringify(FBDATA.bookmarkRegions568); })).toBe(before);
});
