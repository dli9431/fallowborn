'use strict';
const path = require('path');
const {test,expect} = require('../support/fixture');
const {openGame} = require('../support/game/navigation');
const {startHistoricalGame} = require('../support/game/historical-start');
const {restoreBookmark} = require('../support/game/bookmark-acceptance');
const {releasedCatalogue} = require('../support/released-catalogue');
const released = require('../fixtures/released-catalogue.json');
const {dependsOnRuntime} = require('../support/runtime-dependencies');

dependsOnRuntime(__filename,[
  'index.html','data/institutions_1096.js','data/identities_1096.js','data/bookmark_1096.js',
  'data/bookmark_1096_scaffold_a.js','data/bookmark_1096_scaffold_b.js',
  'data/bookmark_1096_scaffold_c.js','data/bookmark_1096_scaffold_d.js',
  'data/religious_institutions.js','data/political_institutions.js','data/cultures.js',
  'data/bookmarks.js','data/systems.js','data/eras.js',
  'js/world.js','js/model.js','js/institutions.js','js/religious_institutions.js',
  'js/local_office_appointments.js','js/government_ecclesiastical.js','js/authority.js',
  'js/starts.js','js/mods.js','js/save.js','js/save_v4.js','js/main.js','js/crazygames.js'
]);

const groups = ['cologne_jewish_congregation_1096','mainz_jewish_congregation_1096',
  'worms_jewish_congregation_1096','speyer_jewish_congregation_1096'];
const ids = groups.concat('durham_see_1096');

async function begin(page,info,county,crazygames) {
  await startHistoricalGame(page,info,{bookmark:'1096',
    code:'LOCALGROUPS-1096-farmer-'+(county || 'mainz')+'-f-Leah-established-0-ashkenazi.jewish'},!!crazygames);
}

function snapshot() {
  const s = FB.state;
  return JSON.parse(JSON.stringify({institutions:s.localInstitutions,heads:s.religiousHeads,
    vacancies:s.religiousHeadVacancies,people:Object.keys(s.chars).sort().map(function (id) {
      const c = s.chars[id];
      return [c.id,c.born,c.dead,c.culture,c.religion,c.homeProvinceId,c.spouseId,c.childrenIds,
        c.career,c.religiousAffiliations || []];
    }),resources:[s.player.gold,s.player.piety,s.player.prestige],
    start:s.start,rng:FB.getRngState() >>> 0,uid:FB.getUidCounter()}));
}

test('the complete 1096 table has separate local groups and an evidenced vacant office',async function ({page},info) {
  await openGame(page,info);
  expect(await page.evaluate(function (input) {
    const b = FB.bookmark('1096'), definitions = b.localInstitutions;
    return {ids:Object.keys(definitions),world:FB.validateBookmark(b),
      catalog:FB.religiousInstitutionCatalogFaults(FBDATA),
      detached:input.ids.every(function (id) {
        return definitions[id] !== FBDATA.bookmarkInstitutions1096[id] &&
          definitions[id].jurisdictionIds !== FBDATA.bookmarkInstitutions1096[id].jurisdictionIds;
      }),
      scopes:input.groups.map(function (id) {
        const d = definitions[id];
        return [d.provinceId,d.site,d.religion,d.profileId,d.vacant,d.freshOnly];
      }),
      office:definitions.durham_see_1096,
      heads:b.religiousHeads,
      noStaff:input.ids.every(function (id) {
        const d = definitions[id];
        return !d.representative && !d.historicalName && !d.abbeyId;
      }),
      noLegacyFallback:!definitions.rome_see && !definitions.constantinople_see,
      prior:['476','493','711','800','867','1066','1204','1241'].every(function (date) {
        const defs = FB.bookmark(date).localInstitutions || {};
        return input.ids.every(function (id) { return !defs[id]; });
      })};
  },{ids:ids,groups:groups})).toEqual({ids:ids,world:[],catalog:[],detached:true,
    scopes:[['cologne','cologne_head','jewish','jewish_local_congregation_later',true,true],
      ['mainz','mainz_head','jewish','jewish_local_congregation_later',true,true],
      ['worms','worms_head','jewish','jewish_local_congregation_later',true,true],
      ['worms','geo_speyer_2830582','jewish','jewish_local_congregation_later',true,true]],
    office:{city:'Durham',kind:'see',provinceId:'durham',site:'durham_head',culture:'anglo_saxon',
      religion:'catholic',officeId:'durham_bishop',officeSystem:null,jurisdictionIds:['durham'],vacant:true,freshOnly:true},
    heads:{catholic:'papacy_1096',sunni:'abbasid_1096'},noStaff:true,noLegacyFallback:true,prior:true});
  expect((await page.evaluate(releasedCatalogue,released.selection)).hashes).toEqual(released.hashes);
});

test('reloading the source stages data without publishing or initializing a campaign',async function ({page},info) {
  await begin(page,info);
  const before = await page.evaluate(function () {
    return {data:JSON.stringify(FBDATA),state:JSON.stringify(FB.state),
      rng:FB.getRngState(),uid:FB.getUidCounter()};
  });
  await page.addScriptTag({path:path.resolve(__dirname,'../../../data/institutions_1096.js')});
  expect(await page.evaluate(function (before) {
    return before.data === JSON.stringify(FBDATA) && before.state === JSON.stringify(FB.state) &&
      before.rng === FB.getRngState() && before.uid === FB.getUidCounter();
  },before)).toBe(true);
});

test('fresh installation allocates no people, private money, property or institutional members',async function ({page},info) {
  await begin(page,info);
  expect(await page.evaluate(function (input) {
    const s = JSON.parse(JSON.stringify(FB.state));
    delete s.localInstitutions;
    delete s.religiousHeads.durham_bishop;
    delete s.religiousHeadVacancies.durham_bishop;
    const people = JSON.stringify(s.chars), accounts = JSON.stringify([s.player,s.realms,s.abbeys]),
      rng = FB.getRngState(), uid = FB.getUidCounter();
    FB.ensureLocalInstitutions(s,null,{fresh:true});
    const first = JSON.stringify(s.localInstitutions);
    FB.ensureLocalInstitutions(s,null,{fresh:true});
    return {ids:Object.keys(s.localInstitutions),
      noPeople:people === JSON.stringify(s.chars) && rng === FB.getRngState() && uid === FB.getUidCounter(),
      resources:accounts === JSON.stringify([s.player,s.realms,s.abbeys]),
      empty:input.groups.every(function (id) {
        const r = s.localInstitutions[id];
        return r.representativeId === null && !Object.keys(r.members).length && !r.rightIds.length;
      }),
      office:s.religiousHeads.durham_bishop,vacancy:s.religiousHeadVacancies.durham_bishop,
      once:first === JSON.stringify(s.localInstitutions)};
  },{groups:groups})).toEqual({ids:ids,noPeople:true,resources:true,empty:true,
    office:null,vacancy:{turn:0,formerHolder:null},once:true});
});

test('local voluntary admission preserves ordinary household work, family, faith and resources',async function ({page},info) {
  await begin(page,info);
  expect(await page.evaluate(function () {
    const s = FB.state, actor = {kind:'character',id:s.player.charId}, iid = 'mainz_jewish_congregation_1096';
    const unchanged = JSON.stringify([s.player,s.chars,s.realms,s.abbeys,s.authority]),
      rng = FB.getRngState(), uid = FB.getUidCounter();
    const before = JSON.stringify(s), q = FB.religiousInstitutionQuote(s,iid,actor,'admit',{roleId:'worshipper'});
    const repeated = FB.religiousInstitutionQuote(s,iid,actor,'admit',{roleId:'worshipper'});
    const pure = before === JSON.stringify(s) && JSON.stringify(q) === JSON.stringify(repeated);
    const remote = FB.religiousInstitutionQuote(s,'cologne_jewish_congregation_1096',actor,'admit',{roleId:'worshipper'});
    const applied = FB.religiousInstitutionApply(s,q), replay = FB.religiousInstitutionApply(s,q);
    const membership = s.localInstitutions[iid].members[actor.id];
    const unsupported = ['affiliate','appoint','recognize','mediate'].every(function (action) {
      return !FB.religiousInstitutionQuote(s,iid,actor,action,{}).allowed;
    });
    const withdrawn = FB.religiousInstitutionApply(s,FB.religiousInstitutionQuote(s,iid,actor,'withdraw',{}));
    return {pure:pure,allowed:q.allowed,remote:remote.allowed,applied:applied,replay:replay,
      role:membership.roleId,unsupported:unsupported,withdrawn:withdrawn,
      status:s.localInstitutions[iid].members[actor.id].status,
      unchanged:unchanged === JSON.stringify([s.player,s.chars,s.realms,s.abbeys,s.authority]) &&
        rng === FB.getRngState() && uid === FB.getUidCounter()};
  })).toEqual({pure:true,allowed:true,remote:false,applied:true,replay:false,role:'worshipper',
    unsupported:true,withdrawn:true,status:'withdrawn',unchanged:true});
});

test('Worms and Speyer keep separate memberships under the existing county-residence rule',async function ({page},info) {
  await begin(page,info,'worms');
  expect(await page.evaluate(function () {
    const s = FB.state, actor = {kind:'character',id:s.player.charId},
      worm = 'worms_jewish_congregation_1096', speyer = 'speyer_jewish_congregation_1096';
    const a = FB.religiousInstitutionApply(s,FB.religiousInstitutionQuote(s,worm,actor,'admit',{roleId:'worshipper'}));
    const b = FB.religiousInstitutionQuote(s,speyer,actor,'admit',{roleId:'worshipper'});
    const separate = !s.localInstitutions[speyer].members[actor.id];
    const joined = FB.religiousInstitutionApply(s,b);
    const left = FB.religiousInstitutionApply(s,FB.religiousInstitutionQuote(s,worm,actor,'withdraw',{}));
    return {a:a,b:b.allowed,separate:separate,joined:joined,left:left,
      sites:[s.localInstitutions[worm].site,s.localInstitutions[speyer].site],
      statuses:[s.localInstitutions[worm].members[actor.id].status,s.localInstitutions[speyer].members[actor.id].status],
      noOffice:!FB.religiousInstitutionSnapshot(s,speyer).definition.officeId,
      noProperty:FB.religiousInstitutionSnapshot(s,speyer).property === null};
  })).toEqual({a:true,b:true,separate:true,joined:true,left:true,sites:['worms_head','geo_speyer_2830582'],
    statuses:['withdrawn','active'],noOffice:true,noProperty:true});
});

test('malformed locality, invented staff and unsupported powers fail detached validation without mutation',async function ({page},info) {
  await begin(page,info);
  expect(await page.evaluate(function () {
    const before = JSON.stringify([FBDATA,FB.state]), rng = FB.getRngState(), uid = FB.getUidCounter();
    const changes = [
      function (d) { d.site = 'absent_site'; },
      function (d) { d.provinceId = 'cologne'; },
      function (d) { d.profileId = 'absent_profile'; },
      function (d) { d.historicalName = 'Invented Rabbi'; },
      function (d) { d.officeId = 'invented_court'; },
      function (d) { d.jurisdictionIds = ['absent_county']; },
      function (d) { d.refugeCapacity = 10; },
      function (d) { d.religion = 'ismaili_fatimid'; }
    ];
    const rejected = changes.map(function (change) {
      const b = JSON.parse(JSON.stringify(FB.bookmark('1096')));
      change(b.localInstitutions.mainz_jewish_congregation_1096);
      return FB.validateBookmark(b).length > 0;
    });
    const distinctOffice = JSON.parse(JSON.stringify(FB.bookmark('1096')));
    distinctOffice.localInstitutions.durham_see_1096.officeId = 'catholic';
    return {rejected:rejected,headConflict:FB.validateBookmark(distinctOffice).length > 0,
      pure:before === JSON.stringify([FBDATA,FB.state]) && rng === FB.getRngState() && uid === FB.getUidCounter()};
  })).toEqual({rejected:Array(8).fill(true),headConflict:true,pure:true});
});

for (const crazygames of [false,true]) {
  test('membership and the separate vacant bishop survive restore on '+(crazygames ? 'CrazyGames' : 'standard'),
    async function ({page},info) {
      await begin(page,info,'mainz',crazygames);
      await page.evaluate(function () {
        const s = FB.state, actor = {kind:'character',id:s.player.charId}, iid = 'mainz_jewish_congregation_1096';
        if (!FB.religiousInstitutionApply(s,FB.religiousInstitutionQuote(s,iid,actor,'admit',{roleId:'worshipper'})))
          throw new Error('Local admission failed');
      });
      const before = await page.evaluate(snapshot);
      const saved = await page.evaluate(function () { return FB.save.serialize(); });
      await restoreBookmark(page,saved);
      expect(await page.evaluate(snapshot)).toEqual(before);
      expect(await page.evaluate(function () {
        const s = FB.state, pope = FB.realmRulerCharacterSnapshot(s,'papacy_1096');
        return {durham:s.religiousHeads.durham_bishop,representative:s.localInstitutions.durham_see_1096.representativeId,
          pope:pope && pope.name,distinct:s.religiousHeads.catholic !== s.religiousHeads.durham_bishop};
      })).toEqual({durham:null,representative:null,pope:'Urban II',distinct:true});
    });
}

for (const absentLedger of [false,true]) {
  test('an older save with '+(absentLedger ? 'no' : 'an empty')+' local ledger gains no institutions during restore',
    async function ({page},info) {
      await begin(page,info);
      const saved = await page.evaluate(function (absent) {
        const s = FB.state;
        if (absent) delete s.localInstitutions; else s.localInstitutions = {};
        delete s.religiousHeads.durham_bishop;
        delete s.religiousHeadVacancies.durham_bishop;
        return FB.save.serialize();
      },absentLedger);
      const before = await page.evaluate(snapshot);
      await restoreBookmark(page,saved);
      expect(await page.evaluate(snapshot)).toEqual(before);
      expect(await page.evaluate(function () {
        const s = FB.state;
        FB.ensureLocalInstitutions(s);
        FB.ensureReligiousHeads(s);
        return {count:Object.keys(s.localInstitutions || {}).length,
          bishop:Object.prototype.hasOwnProperty.call(s.religiousHeads,'durham_bishop')};
      })).toEqual({count:0,bishop:false});
    });
}

test('strict saved localities and memberships reject malformed rows without repairing them',async function ({page},info) {
  await begin(page,info);
  expect(await page.evaluate(function () {
    const before = JSON.stringify(FB.state), rng = FB.getRngState(), uid = FB.getUidCounter();
    const faults = [
      function (s) { s.localInstitutions.worms_jewish_congregation_1096.site = 'geo_speyer_2830582'; },
      function (s) { s.localInstitutions.mainz_jewish_congregation_1096.members.absent_person =
        {roleId:'worshipper',status:'active',joinedTurn:0,changedTurn:0}; },
      function (s) { s.localInstitutions.mainz_jewish_congregation_1096.members[s.player.charId] =
        {roleId:'invented_rabbi',status:'active',joinedTurn:0,changedTurn:0}; }
    ].map(function (change) {
      const s = JSON.parse(before); change(s); const unchanged = JSON.stringify(s);
      try { FB.validateLocalInstitutionState(s); FB.validateReligiousInstitutionState(s); }
      catch (e) { return unchanged === JSON.stringify(s); }
      return false;
    });
    return {faults:faults,pure:before === JSON.stringify(FB.state) && rng === FB.getRngState() && uid === FB.getUidCounter()};
  })).toEqual({faults:[true,true,true],pure:true});
});

test('the ordinary JSON importer retains date-local declarations and exact content fingerprints',async function ({page},info) {
  await openGame(page,info);
  const mod = await page.evaluate(function () {
    const b = JSON.parse(JSON.stringify(FBDATA.bookmarks['1096']));
    const mod = {name:'1096 local institution review',bookmarks:{'1096':b}};
    const before = JSON.stringify([FBDATA,FB.state]), rng = FB.getRngState(), uid = FB.getUidCounter();
    const faults = FB.mods.validate(mod);
    if (faults.length) throw new Error(faults.join('\n'));
    if (before !== JSON.stringify([FBDATA,FB.state]) || rng !== FB.getRngState() || uid !== FB.getUidCounter())
      throw new Error('Detached validation mutated the campaign');
    return mod;
  });
  await page.evaluate(function () { FB.ui.showMods(); });
  await page.locator('#modfile').setInputFiles({name:'institutions-1096.json',
    mimeType:'application/json',buffer:Buffer.from(JSON.stringify(mod))});
  await Promise.all([page.waitForEvent('domcontentloaded'),page.locator('#mod-apply').click()]);
  await page.waitForFunction(function () { return window.FB && FB.game && FB.game.bootReady && FB.mods.count() === 1; });
  await begin(page,info);
  expect(await page.evaluate(function () { return Object.keys(FB.localInstitutionDefinitions(FB.state)); })).toEqual(ids);
  const saved = await page.evaluate(function () { return FB.save.serialize(); });
  await restoreBookmark(page,saved);
  mod.bookmarks['1096'].localInstitutions.mainz_jewish_congregation_1096.city = 'Changed local group';
  await page.evaluate(function (mod) { localStorage.setItem('fb_mods',JSON.stringify([JSON.stringify(mod)])); },mod);
  await openGame(page,info);
  expect(await page.evaluate(function (saved) {
    const source = JSON.parse(saved), unchanged = JSON.stringify(source), state = FB.state, world = FB.world,
      rng = FB.getRngState(), uid = FB.getUidCounter();
    return FB.game.loadData(source) === false && unchanged === JSON.stringify(source) && state === FB.state &&
      world === FB.world && rng === FB.getRngState() && uid === FB.getUidCounter();
  },saved)).toBe(true);
});
