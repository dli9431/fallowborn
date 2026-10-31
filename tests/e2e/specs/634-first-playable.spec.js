'use strict';
const fs = require('fs');
const path = require('path');
const {test,expect} = require('../support/fixture');
const {openGame} = require('../support/game/navigation');
const {openCrazyGame} = require('../support/game/crazygames-title');
const {mockCrazyGames} = require('../support/crazygames');
const {beginBookmark,restoreBookmark,facts} = require('../support/game/bookmark-acceptance');
const {dependsOnRuntime} = require('../support/runtime-dependencies');

dependsOnRuntime(__filename,[
  'index.html','data/bookmark_634.js','data/starts_634_ordinary.js','data/bookmark_634_identities.js',
  'data/bookmark_634_scaffold_a.js','data/bookmark_634_scaffold_b.js',
  'data/bookmark_634_scaffold_c.js','data/bookmark_634_scaffold_d.js',
  'data/bookmark_568.js','data/bookmark_568_identities.js','data/bookmark_493_world.js',
  'data/bookmark_476_wider.js','data/bookmark_476_wider_identities.js',
  'data/bookmarks.js','data/geographies.js','data/geography_expansion.js',
  'data/settlements.js','data/settlements_real.js','data/cultures.js','data/eras.js',
  'data/starts.js','data/climate.js','data/systems.js','data/traits.js',
  'data/political_institutions.js','data/assembly_polities.js','data/aristocratic_courts.js',
  'data/government_rollout.js','data/communal_revisions.js',
  'js/model.js','js/world.js','js/main.js','js/starts.js','js/bookmark_setup.js',
  'js/governments.js','js/government_recognition.js','js/government_elective.js','js/government_selection.js','js/climate.js',
  'js/government_civic.js','js/institutions.js','js/religious_institutions.js',
  'js/save.js','js/save_v4.js','js/systems.js','js/crazygames.js'
]);

const order = ['b01','b02','b03','b04','b05','b06','b07','b08','b09','b10',
  'b11','b12','b13','b14','b15','b16','b17','b18','b19','b20','b21',
  'b22','b23','b24','b25','b26','b27','b28','b29','scenery_a','scenery_b','scenery_c','scenery_d'];
const disabled = ['episcopal_sees','civic_institutions','papacy','excommunication','abbeys',
  'feudal_service','scutage','manorial_tenure','crown_bloc','tournaments','great_holy_wars'];
const source = fs.readFileSync(path.resolve(__dirname,'../../../data/bookmark_634.js'),'utf8');

for (const crazy of [false,true]) {
  test('634 composes the complete hidden opening on ' + (crazy ? 'CrazyGames' : 'standard'),
    async function ({page},info) {
      const pageErrors = [];
      page.on('pageerror',function (error) { pageErrors.push(error.message); });
      if (crazy) {
        await mockCrazyGames(page);
        await page.addInitScript(function () {
          window.FB_DISTRIBUTION = 'crazygames'; window.FB_CRAZYGAMES_STORAGE = 'localstorage';
        });
        await openCrazyGame(page,info);
      } else await openGame(page,info);
      const result = await page.evaluate(function (input) {
        const b = FB.bookmark('634'), data = JSON.stringify(FBDATA), rng = FB.getRngState(), uid = FB.getUidCounter();
        const courts = {}, counties = {}, faults = [];
        b.realms.forEach(function (r) {
          if (courts[r.id]) faults.push('duplicate court ' + r.id);
          courts[r.id] = r;
        });
        const expected = input.order.reduce(function (ids,key) {
          return ids.concat(FBDATA.bookmarkRegions634[key].provinces.map(function (p) { return p.id; }));
        },[]);
        const layout = FBDATA.settlementLayouts[b.settlementLayout];
        b.provinces.forEach(function (p) {
          if (counties[p.id]) faults.push('duplicate county ' + p.id);
          counties[p.id] = p;
          if (p.wasteland) {
            if (p.realm || p.communities || layout[p.id]) faults.push('inhabited scenery ' + p.id);
            return;
          }
          if (!courts[p.realm] || !layout[p.id] || !layout[p.id].length) faults.push('unresolved county ' + p.id);
          if (!FBDATA.climateZones[b.climate.provinces[p.id]]) faults.push('unresolved climate ' + p.id);
          layout[p.id].forEach(function (slot) {
            if (!FBDATA.settlementSites[slot.site]) faults.push('unresolved site ' + slot.site);
          });
        });
        b.realms.forEach(function (r) {
          const capital = counties[r.capital];
          if (!capital || capital.wasteland || (capital.realm !== r.id && !r.nonTerritorial) || r.liege && !courts[r.liege])
            faults.push('unresolved capital/liege ' + r.id);
          if (!FBDATA.governmentForms[r.government]) faults.push('unpublished government ' + r.id);
        });
        const validated = FB.validateBookmark(b);
        const nonTerritorial = b.realms.filter(function (r) { return r.nonTerritorial; })
          .map(function (r) { return [r.id,r.capital,counties[r.capital].realm]; });
        const otherBookmarks = ['476','867','1066'].map(function (id) {
          return {id:id,faults:FB.validateBookmark(FB.bookmark(id))};
        });
        return {metadata:[b.id,b.name,b.date,b.era,b.geography,b.settlementLayout,b.revision,b.openingRevision],
          hidden:b.hidden,available:FB.bookmarkAvailable('634'),listed:FB.bookmarks().some(function (v) { return v.id === '634'; }),
          count:b.provinces.length,inhabited:b.provinces.filter(function (p) { return !p.wasteland; }).length,
          complete:JSON.stringify(Object.keys(counties).sort()) === JSON.stringify(FB.geography(b.geography).provinces.map(function (p) { return p.id; }).sort()),
          ordered:JSON.stringify(b.provinces.map(function (p) { return p.id; })) === JSON.stringify(expected),
          courts:b.realms.length,named:b.realms.filter(function (r) { return r.ruler && r.ruler.name; }).map(function (r) { return r.ruler.name; }).sort(),
          climates:[b.climate.provinces.coruna,b.climate.provinces.medina],
          layouts:Object.keys(layout).length,crossings:b.straits.length,
          disabled:b.systems.disable,empty:[b.localInstitutions,b.religiousHeads,b.stories,b.scripted,b.opening],
          forms:FB.governments.problems('medinan_selection_pf_634'),faiths:FB.validateReligionData(null),
          faults:faults,validated:validated,nonTerritorial:nonTerritorial,otherBookmarks:otherBookmarks,
          pure:data === JSON.stringify(FBDATA) && rng === FB.getRngState() && uid === FB.getUidCounter()};
      },{order:order});
      expect(result).toEqual({metadata:['634','The Early Conquests',{year:634,season:2,day:1},'late_antique',
        'europe_regional_2','634_opening','baseline','baseline'],hidden:true,available:false,listed:false,
        count:527,inhabited:506,complete:true,ordered:true,courts:121,
        named:['Dagobert I','Heraclius','Oswald','Sigebert III','Umar','Yazdegerd III'],
        climates:['northern_temperate','arid'],layouts:506,crossings:22,disabled:disabled,
        empty:[{},{},[],[],{actors:{},appointments:{},estates:[],claims:[],migrations:[]}],
        forms:[],faiths:[],faults:[],validated:[],
        nonTerritorial:[['aures_634','constantine','byzantium_634']],
        otherBookmarks:[{id:'476',faults:[]},{id:'867',faults:[]},{id:'1066',faults:[]}],pure:true});
      expect(pageErrors).toEqual([]);
    });
}

test('634 rejects picker, codes, direct creation and Observe while hidden',async function ({page},info) {
  await openGame(page,info);
  const full = page.locator('#btn-choose-beginning');
  if (await full.isVisible()) await full.click();
  else await page.getByRole('button',{name:'New Game',exact:true}).click();
  await expect(page.locator('#bookmarklist [data-bookmark="634"]')).toHaveCount(0);
  await page.locator('#btn-bm-seed').click();
  await page.locator('#ng-seed').fill('REVIEW634-634-farmer_634-coruna-m-Review');
  await page.locator('#ng-seed').press('Enter');
  await expect(page.locator('#ng-seed-err')).toContainText('hidden for new campaigns');
  await expect(page.locator('#chargen:not(.hidden)')).toHaveCount(0);
  expect(await page.evaluate(function () { return FB.state; })).toBeNull();
  await page.locator('#ng-cancel').click();
  expect(await page.evaluate(function () {
    return new Promise(function (resolve) {
      FB.activateBookmark('634',null,function (error) { resolve(error && error.message || null); });
    });
  })).toBeNull();
  expect(await page.evaluate(function () {
    FB.game.pending = {bookmarkId:'634',seed:'REVIEW634',provinceId:'coruna',
      scenario:FBDATA.startScenarios.filter(function (s) { return s.id === 'farmer_634'; })[0]};
    const state = FB.state, rng = FB.getRngState(), uid = FB.getUidCounter();
    const start = FB.game.start(), observe = FB.game.startObserve();
    return {start:start,observe:observe,preserved:state === FB.state &&
      rng === FB.getRngState() && uid === FB.getUidCounter() && !FB.game.observe};
  })).toEqual({start:false,observe:false,preserved:true});
});

test('634 missing, duplicate and unresolved regional inputs reject without publishing a partial world',async function ({page},info) {
  await openGame(page,info);
  const problems = await page.evaluate(function (code) {
    const original = FBDATA.bookmarkRegions634, copy = function (v) { return JSON.parse(JSON.stringify(v)); };
    const rng = FB.getRngState(), uid = FB.getUidCounter(), data = JSON.stringify(FBDATA), failures = [];
    ['missing','missing_county','duplicate_county','duplicate_court','unknown_court','unknown_liege','wrong_capital',
      'territorial_foreign_capital','nonterritorial_missing_capital','nonterritorial_scenery_capital'].forEach(function (kind) {
      FBDATA.bookmarkRegions634 = copy(original);
      const regions = FBDATA.bookmarkRegions634;
      if (kind === 'missing') { delete regions.b29; regions.e2e_extra = {}; }
      if (kind === 'missing_county') regions.b01.provinces.pop();
      if (kind === 'duplicate_county') regions.b02.provinces.push(copy(regions.b01.provinces[0]));
      if (kind === 'duplicate_court') regions.b02.realms.push(copy(regions.b01.realms[0]));
      if (kind === 'unknown_court') regions.b01.provinces[0].realm = 'e2e_absent';
      if (kind === 'unknown_liege') regions.b01.realms[0].liege = 'e2e_absent';
      if (kind === 'wrong_capital') regions.b01.realms[0].capital = 'medina';
      const aures = regions.b22.realms.filter(function (r) { return r.id === 'aures_634'; })[0];
      if (kind === 'territorial_foreign_capital') aures.nonTerritorial = false;
      if (kind === 'nonterritorial_missing_capital') aures.capital = 'e2e_absent';
      if (kind === 'nonterritorial_scenery_capital') aures.capital = 'w_sahara_w';
      let rejected = false;
      try { (0,eval)(code); } catch (error) { rejected = /634/.test(error.message); }
      FBDATA.bookmarkRegions634 = original;
      failures.push(rejected && data === JSON.stringify(FBDATA) && rng === FB.getRngState() && uid === FB.getUidCounter());
    });
    return failures;
  },source);
  expect(problems).toEqual(Array(10).fill(true));
});

test('634 complete candidate validation rejects bad sites, faiths and capitals without changing state',async function ({page},info) {
  await openGame(page,info);
  expect(await page.evaluate(function () {
    const data = JSON.stringify(FBDATA), state = JSON.stringify(FB.state), rng = FB.getRngState(), uid = FB.getUidCounter();
    const rejected = ['site','faith','capital','scenery_start'].map(function (kind) {
      const b = JSON.parse(JSON.stringify(FB.bookmark('634')));
      if (kind === 'site') b.provinces[0].settlements = [{site:'e2e_absent',name:'Unknown',kind:'town'}];
      if (kind === 'faith') b.realms[0].religion = 'zoroastrian_sasanian_476';
      if (kind === 'capital') b.realms[0].capital = 'e2e_absent';
      if (kind === 'scenery_start') b.startLocations.farmer_634 = ['w_sahara_w'];
      return FB.validateBookmark(b).length > 0;
    });
    return {rejected:rejected,pure:data === JSON.stringify(FBDATA) && state === JSON.stringify(FB.state) &&
      rng === FB.getRngState() && uid === FB.getUidCounter()};
  })).toEqual({rejected:Array(4).fill(true),pure:true});
});

for (const scenario of ['farmer_634','craftsman_634']) {
  test('634 seeded ' + scenario + ' restores its hidden world and spent resources after another date is activated',
    async function ({page},info) {
      await beginBookmark(page,info,'634',scenario);
      expect(await page.evaluate(function (disabled) {
        const s = FB.state, b = FB.campaignBookmark(s);
        return {scenario:s.start.scenarioId,revision:s.start.revision,date:s.date,provinces:FB.world.provs.length,
          opening:s.bookmarkSetup.revision,actors:Object.keys(s.bookmarkSetup.actors),
          local:Object.keys(s.localInstitutions || {}),heads:Object.keys(s.religiousHeads || {}).filter(function (id) { return !!s.religiousHeads[id]; }),
          disabled:disabled.every(function (id) { return !FB.systemEnabled(s,id); }),
          courts:['byzantium_634','rashidun_634','sasanian_634'].map(function (id) { return s.realms[id].ruler.name; }),
          oldCourts:['east_568','sasanian_568','francia_568','yathrib_568','federates_476'].some(function (id) { return !!s.realms[id]; }),
          namedFamilies:b.realms.filter(function (r) { return r.ruler && r.ruler.name; }).every(function (r) {
            const court = s.realms[r.id].succession, ruler = court.members[court.rulerMemberId];
            return Object.keys(court.members).length === 1 && ruler.spouseDeclared &&
              ruler.spouseMemberId === null && ruler.childIds.length === 0;
          }),
          childAge:s.date.year - s.realms.sasanian_634.ruler.born,
          errors:FBTEST.checkInvariants(),valid:FB.save.v4.validatePlatform(s)};
      },disabled)).toEqual({scenario:scenario,revision:'baseline',date:{year:634,season:2,day:1},provinces:527,
        opening:'baseline',actors:[],local:[],heads:[],disabled:true,
        courts:['Heraclius','Umar','Yazdegerd III'],oldCourts:false,namedFamilies:true,childAge:10,errors:[],valid:true});
      await page.evaluate(function () { FB.state.player.gold -= 3; });
      const before = await facts(page);
      const saved = await page.evaluate(function () { return FB.save.serialize(); });
      expect(JSON.parse(saved).v).toBe(4);
      expect(await page.evaluate(function () {
        FBDATA.bookmarks['634'].hidden = true;
        return new Promise(function (resolve) {
          FB.activateBookmark('867',null,function (error) { resolve(error && error.message || null); });
        });
      })).toBeNull();
      await restoreBookmark(page,saved);
      expect(await facts(page)).toEqual(before);
      expect(await page.evaluate(function () {
        return {hidden:FB.bookmark('634').hidden,errors:FBTEST.checkInvariants(),valid:FB.save.v4.validatePlatform(FB.state)};
      })).toEqual({hidden:true,errors:[],valid:true});
    });
}

test('634 repeats a seeded opening while its composed world stays detached from staged inputs',async function ({page},info) {
  await beginBookmark(page,info,'634','farmer_634');
  const before = await facts(page);
  expect(await page.evaluate(function () {
    const world = JSON.stringify(FBDATA.bookmarks['634']), layout = JSON.stringify(FBDATA.settlementLayouts['634_opening']);
    const form = JSON.stringify(FBDATA.governmentForms.medinan_selection_pf_634);
    const faith = JSON.stringify(FBDATA.religions.early_islam_634);
    const a = FBDATA.bookmarkRegions634.b01, d = FBDATA.bookmarkRegions634.b24;
    const originals = [a.provinces[0].realm,a.layouts.coruna[0].name,d.governmentForms.medinan_selection_pf_634.name,
      FBDATA.bookmarkReligions634.early_islam_634.name];
    try {
      a.provinces[0].realm = 'e2e_unpublished'; a.layouts.coruna[0].name = 'Changed';
      d.governmentForms.medinan_selection_pf_634.name = 'Changed';
      FBDATA.bookmarkReligions634.early_islam_634.name = 'Changed';
      return world === JSON.stringify(FBDATA.bookmarks['634']) && layout === JSON.stringify(FBDATA.settlementLayouts['634_opening']) &&
        form === JSON.stringify(FBDATA.governmentForms.medinan_selection_pf_634) && faith === JSON.stringify(FBDATA.religions.early_islam_634);
    } finally {
      a.provinces[0].realm = originals[0]; a.layouts.coruna[0].name = originals[1];
      d.governmentForms.medinan_selection_pf_634.name = originals[2];
      FBDATA.bookmarkReligions634.early_islam_634.name = originals[3];
    }
  })).toBe(true);
  await beginBookmark(page,info,'634','farmer_634');
  expect(await facts(page)).toEqual(before);
});
