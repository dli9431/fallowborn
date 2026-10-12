'use strict';
const fs = require('fs');
const path = require('path');
const {test,expect} = require('../support/fixture');
const {openGame} = require('../support/game/navigation');
const {startDeterministicGame} = require('../support/game/start');
const {beginBookmark,restoreBookmark} = require('../support/game/bookmark-acceptance');
const {releasedCatalogue} = require('../support/released-catalogue');
const {dependsOnRuntime} = require('../support/runtime-dependencies');

dependsOnRuntime(__filename, ['data/cultures.js','data/economy.js','data/technology.js',
  'data/map_data.js','data/bookmarks.js','data/bookmark_476.js','data/bookmark_476_wider_identities.js',
  'data/bookmark_476_wider.js','data/bookmark_493.js','data/bookmark_493_world.js','data/bookmark_711.js',
  'data/bookmark_711_terrain.js','data/bookmark_800.js','data/bookmark_800_expansion.js',
  'data/bookmark_867_expansion.js','data/bookmark_1066_inhabited.js',
  'data/bookmark_1204.js','data/bookmark_1204_terrain.js','js/model.js','js/world.js','js/events.js',
  'js/actions.js','js/economy.js','js/papacy.js','js/population.js','js/mods.js',
  'js/save.js','js/save_v4.js','js/main.js']);

test('Buddhist household corrections preserve the released effective catalogue',
  async function ({page},testInfo) {
    await openGame(page,testInfo);
    const fixture = JSON.parse(fs.readFileSync(path.join(__dirname,'../fixtures/released-catalogue.json'),'utf8'));
    expect((await page.evaluate(releasedCatalogue,fixture.selection)).hashes).toEqual(fixture.hashes);
  });

test('household profiles resolve independent study rules without an ordained ladder or central office',
  async function ({page},testInfo) {
    await openGame(page,testInfo);
    expect(await page.evaluate(function () {
      const before = JSON.stringify(FBDATA), rng = FB.getRngState(), uid = FB.getUidCounter();
      const rows = ['buddhist_476','buddhist_711'].map(function (id) {
        const rel = FB.religionOf(id,null), marriage = FB.marriageDoctrine(id,null);
        return {root:FB.faithLineage(id,null),office:FB.faithOfficeId(id,null),
          local:['head','legalTradition','holyWarTradition','raidingTradition','religiousPaths',
            'clergyMarriage','roles.monasticF','roles.priestF'].every(function (key) {
              return FB.faithValue(null,id,key).sourceId === id;
            }),marriage:rel.clergyMarriage,paths:rel.religiousPaths,
          holyWar:rel.holyWarTradition,raiding:FB.hasFaithRaidingTradition(id,null),
          legal:rel.legalTradition,limits:marriage.spouseLimit,
          divorce:[marriage.end.kind,marriage.end.direct,marriage.end.gold,
            marriage.end.piety,marriage.end.prestige,marriage.end.cooldownDays],
          words:['roles.monasticM','roles.monasticF','roles.priestM','roles.priestF',
            'words.cleric','words.temple'].map(function (key) {
              return FB.faithDataText(null,null,id,key,{});
            })};
      });
      return {rows:rows,errors:FB.validateReligionData(null),technology:FB.validateTechnologyData(),
        impact:FBDATA.techImpactReviews.features.buddhist_household_participation.mode,
        pure:before === JSON.stringify(FBDATA) && rng === FB.getRngState() && uid === FB.getUidCounter()};
    })).toEqual({rows:['buddhist_476','buddhist_711'].map(function (id) {
      return {root:[id],office:null,local:true,marriage:true,paths:null,holyWar:null,raiding:false,
        legal:'customary',limits:{m:1,f:1},
        divorce:['sunder',true,0,0,id === 'buddhist_476' ? 5 : 0,id === 'buddhist_476' ? 0 : 360],
        words:['Religious student','Religious student','Religious participant',
          'Religious participant','religious participant','place of worship']};
    }),errors:[],technology:[],impact:'none',pure:true});
  });

test('held identities retain their separate opening scopes and every fresh world validates',
  async function ({page},testInfo) {
    await openGame(page,testInfo);
    expect(await page.evaluate(function () {
      const dates = ['476','493','711','800','867','1066','1204'];
      const before = JSON.stringify(FBDATA), rng = FB.getRngState(), uid = FB.getUidCounter();
      return {available:['buddhist_476','buddhist_711'].map(function (id) {
        return dates.map(function (date) { return FB.faithHistoricalAvailable(id,FB.bookmark(date),'community'); });
      }),worlds:dates.map(function (id) { return FB.validateBookmark(FB.bookmark(id)); }),
        invented:FB.religionIds(null,false).indexOf('buddhist_community') >= 0,
        pure:before === JSON.stringify(FBDATA) && rng === FB.getRngState() && uid === FB.getUidCounter()};
    })).toEqual({available:[[true,true,false,false,false,false,true],
      [false,false,true,false,false,false,false]],worlds:[[],[],[],[],[],[],[]],invented:false,pure:true});
  });

test('early mixed-community consumers retain distinct opening assignments and shares',
  async function ({page},testInfo) {
    await openGame(page,testInfo);
    expect(await page.evaluate(function () {
      const before = JSON.stringify(FBDATA), rng = FB.getRngState(), uid = FB.getUidCounter();
      const rows = ['476','493'].map(function (id) {
        const b = FB.bookmark(id);
        function shares(pid) {
          return b.provinces.find(function (p) { return p.id === pid; }).communities
            .map(function (c) { return [c.religion,c.populationShare0]; });
        }
        return {revision:b.revision,balkh:shares('balkh'),indus:shares('mansura'),
          sogdia:shares('samarkand'),court:b.realms.find(function (r) {
            return r.id === (id === '476' ? 'kabul_476' : 'kabul_493');
          }).religion};
      });
      const later = FB.bookmark('711');
      return {rows:rows,later:['kandahar','ghazni','kabul','bamiyan'].map(function (pid) {
        return later.provinces.find(function (p) { return p.id === pid; }).communities
          .map(function (c) { return [c.religion,c.populationShare0]; });
      }),pure:before === JSON.stringify(FBDATA) && rng === FB.getRngState() && uid === FB.getUidCounter()};
    })).toEqual({rows:[
      {revision:'wider_v2',balkh:[['buddhist_476',6500],['iranian_traditional_476',3500]],
        indus:[['brahmanical_476',6000],['buddhist_476',4000]],
        sogdia:[['sogdian_traditional_476',10000]],court:'buddhist_476'},
      {revision:'world_v2',balkh:[['buddhist_476',7500],['iranian_traditional_476',2500]],
        indus:[['brahmanical_476',10000]],
        sogdia:[['sogdian_traditional_476',8500],['buddhist_476',1500]],court:'buddhist_476'}
    ],later:Array(4).fill([['buddhist_711',10000]]),pure:true});
  });

test('the held 1204 superior court neither changes Samarkand residents nor supplies a Buddhist institution',
  async function ({page},testInfo) {
    await openGame(page,testInfo);
    expect(await page.evaluate(function () {
      const b = FB.bookmark('1204'), before = JSON.stringify(FBDATA);
      const rng = FB.getRngState(), uid = FB.getUidCounter();
      const court = b.realms.find(function (r) { return r.id === 'qara_khitai_1204'; });
      const county = b.provinces.find(function (p) { return p.id === 'samarkand'; });
      return {court:[court.religion,court.nonTerritorial,court.capital,court.government],
        residents:county.religion,
        BuddhistResidents:(county.communities || []).some(function (c) { return c.religion === 'buddhist_476'; }),
        institutions:Object.keys(b.localInstitutions || {}).filter(function (key) {
          return ['buddhist_476','buddhist_711'].indexOf(b.localInstitutions[key].religion) >= 0;
        }),office:FB.faithOfficeId(court.religion,null),
        pure:before === JSON.stringify(FBDATA) && rng === FB.getRngState() && uid === FB.getUidCounter()};
    })).toEqual({court:['buddhist_476',true,'samarkand','regnum'],residents:'sunni',
      BuddhistResidents:false,institutions:[],office:null,pure:true});
  });

test('ordinary male and female religious students retain courtship without acquiring ordained standing',
  async function ({page},testInfo) {
    await openGame(page,testInfo);
    await startDeterministicGame(page);
    expect(await page.evaluate(function () {
      const s = FB.state, me = s.chars[s.player.charId];
      FB.spousesSnapshot(s,me).forEach(function (c) { c.spouseId = null; c.spouseIds = []; });
      me.spouseId = null; me.spouseIds = []; me.betrothedId = null;
      me.born = s.date.year - 30;
      me.career = {profession:'monk',rank:'journeyman',chosen:true,startedYear:s.date.year,
        experience:0,guildRank:'none',guildStanding:0};
      s.player.profession = 'monk'; s.player.courtingId = null;
      return ['buddhist_476','buddhist_711'].map(function (id) {
        me.religion = id;
        return ['m','f'].map(function (sex) {
          me.sex = sex;
          const partner = FB.makeCharacter(s,{name:'Lay Partner',sex:sex === 'm' ? 'f' : 'm',
            born:s.date.year - 25,culture:me.culture,religion:id,traits:[],opinion:100});
          partner.homeProvinceId = s.player.provinceId;
          const before = JSON.stringify(s), rng = FB.getRngState(), uid = FB.getUidCounter();
          const ready = FB.courtshipStatus(s,partner,false).ready;
          const standings = FB.religiousStandings(s,me);
          return {ready:ready,standings:standings,office:FB.faithOfficeId(id,s),
            pure:before === JSON.stringify(s) && rng === FB.getRngState() && uid === FB.getUidCounter()};
        });
      });
    })).toEqual(Array(2).fill(Array(2).fill({ready:true,standings:[],office:null,pure:true})));
  });

for (const opening of [{bookmark:'493',faith:'buddhist_476',county:'balkh'},
  {bookmark:'711',faith:'buddhist_711',county:'kabul'}]) {
  test('households, generated ancestry and a sponsored project survive ' + opening.bookmark + ' restore',
    async function ({page},testInfo) {
      await beginBookmark(page,testInfo,opening.bookmark);
      const source = await page.evaluate(function (input) {
        const s = FB.state, me = s.chars[s.player.charId], pid = s.player.provinceId;
        const id = FB.createFaith(s,{id:'e2e_buddhist_household',name:'Household Practice',parent:input.faith,
          relationToParent:'in_fold',founderId:me.id});
        if (!id) throw new Error('Generated household setup failed.');
        const child = FB.makeCharacter(s,{name:'Lay Descendant',sex:'f',born:s.date.year - 8,
          culture:me.culture,religion:id,fatherId:me.id,traits:[]});
        me.childrenIds.push(child.id);
        if (!FB.startCountyCommunityProject(s,pid,{kind:'faith',target:id,sponsor:'player',policy:'voluntary'}))
          throw new Error('Project setup failed.');
        s.population.counties[pid].communityProjects.faith.progress = 0.25;
        const facts = {mixed:FB.countyCommunities(s,input.county),
          project:FB.countyCommunityProject(s,pid,'faith'),lineage:FB.faithLineage(id,s),
          doctrine:FB.marriageDoctrine(id,s),role:FB.faithValue(s,id,'roles.monasticF'),
          child:[child.religion,child.fatherId],children:me.childrenIds.slice(),
          spouses:FB.spousesSnapshot(s,me).map(function (c) { return c.id; }),gold:s.player.gold,
          heads:JSON.parse(JSON.stringify(s.religiousHeads)),
          institutions:JSON.parse(JSON.stringify(s.localInstitutions || {})),
          start:JSON.parse(JSON.stringify(s.start))};
        return {saved:FB.save.serialize(),facts:facts,childId:child.id,pid:pid,county:input.county};
      },opening);
      await openGame(page,testInfo);
      await restoreBookmark(page,source.saved);
      expect(await page.evaluate(function (input) {
        const s = FB.state, me = s.chars[s.player.charId], id = 'e2e_buddhist_household';
        const child = s.chars[input.childId];
        return {mixed:FB.countyCommunities(s,input.county),
          project:FB.countyCommunityProject(s,input.pid,'faith'),lineage:FB.faithLineage(id,s),
          doctrine:FB.marriageDoctrine(id,s),role:FB.faithValue(s,id,'roles.monasticF'),
          child:[child.religion,child.fatherId],children:me.childrenIds.slice(),
          spouses:FB.spousesSnapshot(s,me).map(function (c) { return c.id; }),gold:s.player.gold,
          heads:JSON.parse(JSON.stringify(s.religiousHeads)),
          institutions:JSON.parse(JSON.stringify(s.localInstitutions || {})),
          start:JSON.parse(JSON.stringify(s.start))};
      },source)).toEqual(source.facts);
    });
}
