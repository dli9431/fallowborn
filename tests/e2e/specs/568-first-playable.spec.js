'use strict';
const {test,expect} = require('../support/fixture');
const {openGame} = require('../support/game/navigation');
const {beginBookmark,restoreBookmark,facts} = require('../support/game/bookmark-acceptance');
const {dependsOnRuntime} = require('../support/runtime-dependencies');

dependsOnRuntime(__filename,[
  'index.html','data/bookmark_568.js','data/starts_568.js','data/bookmark_568_identities.js',
  'data/bookmark_568_scaffold_a.js','data/bookmark_568_scaffold_b.js',
  'data/bookmark_568_scaffold_c.js','data/bookmark_568_scaffold_d.js',
  'data/bookmarks.js','data/bookmark_493.js','data/bookmark_493_world.js',
  'data/bookmark_476_wider.js','data/bookmark_476_wider_identities.js',
  'data/geographies.js','data/geography_expansion.js','data/settlements.js',
  'data/cultures.js','data/eras.js','data/starts.js','data/climate.js',
  'data/political_institutions.js','data/aristocratic_courts.js','data/assembly_polities.js',
  'data/government_rollout.js','data/communal_revisions.js',
  'js/world.js','js/model.js','js/main.js','js/starts.js','js/bookmark_setup.js',
  'js/government_administration.js','js/government_aristocracy.js',
  'js/save.js','js/save_v4.js','js/systems.js'
]);

const regions = ['italy','balkans','anatolia','levant_egypt','iran_caucasus',
  'frankish_northwest','frankish_southwest','rhine_alps','central_europe',
  'iberia_north_interior','iberia_south_east','britain_south_east','britain_north',
  'britain_west','ireland','scandinavia_baltic','danube_avars','steppe_rivers',
  'central_asia_sindh','arabia','maghreb','horn_sahel'];

test('568 composes every physical county once, in ledger order, with unique courts and valid references',
  async function ({page},testInfo) {
    await openGame(page,testInfo);
    const result = await page.evaluate(function (order) {
      const b = FB.bookmark('568'), rng = FB.getRngState(), uid = FB.getUidCounter();
      const before = JSON.stringify(FBDATA), counties = {}, courts = {}, faults = [];
      b.provinces.forEach(function (p) {
        if (counties[p.id]) faults.push('duplicate county ' + p.id);
        counties[p.id] = p;
      });
      b.realms.forEach(function (r) {
        if (courts[r.id]) faults.push('duplicate court ' + r.id);
        courts[r.id] = r;
      });
      const expected = order.reduce(function (ids,key) {
        return ids.concat(FBDATA.bookmarkRegions568[key].provinces.map(function (p) { return p.id; }));
      },[]);
      const geography = FB.geography('europe_regional_2').provinces.map(function (p) { return p.id; });
      const layout = FBDATA.settlementLayouts[b.settlementLayout];
      b.provinces.forEach(function (p) {
        if (p.wasteland) {
          if (layout[p.id] || p.realm || p.communities) faults.push('inhabited scenery ' + p.id);
          return;
        }
        if (!courts[p.realm] || !layout[p.id] || !layout[p.id].length) faults.push('unresolved county ' + p.id);
        if (!FBDATA.climateZones[b.climate.provinces[p.id]]) faults.push('unresolved climate ' + p.id);
        layout[p.id].forEach(function (slot) {
          if (!FBDATA.settlementSites[slot.site]) faults.push('unresolved site ' + slot.site);
        });
      });
      const validated = FB.validateBookmark(b);
      return {count:b.provinces.length,inhabited:b.provinces.filter(function (p) { return !p.wasteland; }).length,
        complete:JSON.stringify(Object.keys(counties).sort()) === JSON.stringify(geography.sort()),
        ordered:JSON.stringify(b.provinces.map(function (p) { return p.id; })) === JSON.stringify(expected),
        courts:b.realms.length,named:b.realms.filter(function (r) { return r.ruler && r.ruler.name; })
          .map(function (r) { return r.ruler.name; }).sort(),
        anchors:['constantinople','metz','narbonne','exeter'].map(function (id) { return counties[id].realm; }),
        metadata:[b.name,b.date,b.era,b.geography,b.revision,b.openingRevision],
        faults:faults,validated:validated,
        pure:before === JSON.stringify(FBDATA) && rng === FB.getRngState() && uid === FB.getUidCounter()};
    },regions);
    expect(result).toEqual({count:527,inhabited:506,complete:true,ordered:true,courts:132,
      named:['Chilperic I','Guntram','Justin II','Khosrow I','Sigebert I'],
      anchors:['east_568','austrasia_568','visigoths_568','dumnonia_568'],
      metadata:['The Lombards Depart',{year:568,season:0,day:1},'late_antique','europe_regional_2','migration_v1','migration_v1'],
      faults:[],validated:[],pure:true});
  });

test('568 remains hidden from picker, codes, direct creation and Observe', async function ({page},testInfo) {
  await openGame(page,testInfo);
  expect(await page.evaluate(function () {
    return {hidden:FB.bookmark('568').hidden,offered:FB.bookmarkAvailable('568'),
      listed:FB.bookmarks().some(function (b) { return b.id === '568'; }),
      inspectable:FB.bookmarks(true).some(function (b) { return b.id === '568'; })};
  })).toEqual({hidden:true,offered:false,listed:false,inspectable:true});
  const full = page.locator('#btn-choose-beginning');
  if (await full.isVisible()) await full.click();
  else await page.getByRole('button',{name:'New Game',exact:true}).click();
  await expect(page.locator('#bookmarklist')).not.toContainText('The Lombards Depart');
  await page.locator('#btn-bm-seed').click();
  await page.locator('#ng-seed').fill('REVIEW568-568-farmer_568-ravenna-m-Review');
  await page.locator('#ng-seed').press('Enter');
  await expect(page.locator('#ng-seed-err')).toContainText('hidden for new campaigns');
  await page.locator('#ng-cancel').click();
  expect(await page.evaluate(function () {
    return new Promise(function (resolve) {
      FB.activateBookmark('568',null,function (error) { resolve(error && error.message || null); });
    });
  })).toBeNull();
  expect(await page.evaluate(function () {
    FB.game.pending = {bookmarkId:'568',seed:'REVIEW568',provinceId:'ravenna',
      scenario:FBDATA.startScenarios.find(function (s) { return s.id === 'farmer_568'; })};
    const state = FB.state, rng = FB.getRngState(), uid = FB.getUidCounter();
    return {start:FB.game.start(),observe:FB.game.startObserve(),
      unchanged:state === FB.state && rng === FB.getRngState() && uid === FB.getUidCounter()};
  })).toEqual({start:false,observe:false,unchanged:true});
});

for (const scenario of ['farmer_568','craftsman_568']) {
  test('568 seeded ' + scenario + ' restores its hidden world after another date is activated',
    async function ({page},testInfo) {
      await beginBookmark(page,testInfo,'568',scenario);
      expect(await page.evaluate(function () {
        const s = FB.state, b = FB.campaignBookmark(s);
        return {start:s.start.id,revision:s.start.revision,date:s.date,
          provinces:FB.world.provs.length,opening:s.bookmarkSetup.revision,
          actors:Object.keys(s.bookmarkSetup.actors).sort(),institutions:Object.keys(b.localInstitutions),
          italy:['ravenna','pavia','friuli'].map(function (id) { return s.owner[id]; }),
          disabled:['papacy','great_holy_wars','manorial_tenure','feudal_service','scutage','tournaments']
            .every(function (id) { return !FB.systemEnabled(s,id); }),
          errors:FBTEST.checkInvariants(),valid:FB.save.v4.validatePlatform(s)};
      })).toEqual({start:'568',revision:'migration_v1',date:{year:568,season:0,day:1},
        provinces:527,opening:'migration_v1',
        actors:['ctesiphon_delegate_568','dvin_principal_568','hamadan_principal_568','ray_principal_568'],
        institutions:[],italy:['east_568','east_568','east_568'],disabled:true,errors:[],valid:true});
      const before = await facts(page);
      const save = await page.evaluate(function () { return FB.save.serialize(); });
      expect(JSON.parse(save).v).toBe(4);
      expect(await page.evaluate(function () {
        FBDATA.bookmarks['568'].hidden = true;
        return new Promise(function (resolve) {
          FB.activateBookmark('867',null,function (error) { resolve(error && error.message || null); });
        });
      })).toBeNull();
      await restoreBookmark(page,save);
      expect(await facts(page)).toEqual(before);
      expect(await page.evaluate(function () {
        return {hidden:FB.bookmark('568').hidden,errors:FBTEST.checkInvariants(),
          valid:FB.save.v4.validatePlatform(FB.state)};
      })).toEqual({hidden:true,errors:[],valid:true});
    });
}

test('568 repeats a seeded opening without borrowing source-world people or mutable region rows',
  async function ({page},testInfo) {
    await beginBookmark(page,testInfo,'568','farmer_568');
    const first = await facts(page);
    expect(await page.evaluate(function () {
      const b = FB.bookmark('568'), bytes = JSON.stringify(b);
      const row = FBDATA.bookmarkRegions568.italy.provinces[0];
      const prior = row.realm;
      try {
        row.realm = 'unpublished_replacement';
        return bytes === JSON.stringify(b) && !FB.state.realms.ostrogoths_493 &&
          !FB.state.realms.east_493 && !FB.state.realms.federates_476;
      } finally { row.realm = prior; }
    })).toBe(true);
    await beginBookmark(page,testInfo,'568','farmer_568');
    expect(await facts(page)).toEqual(first);
  });
