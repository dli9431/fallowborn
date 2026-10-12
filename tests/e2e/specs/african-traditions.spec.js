'use strict';
const fs = require('fs');
const path = require('path');
const {test,expect} = require('../support/fixture');
const {openGame} = require('../support/game/navigation');
const {startHistoricalGame} = require('../support/game/historical-start');
const {restoreBookmark} = require('../support/game/bookmark-acceptance');
const {releasedCatalogue} = require('../support/released-catalogue');
const {dependsOnRuntime} = require('../support/runtime-dependencies');

dependsOnRuntime(__filename,[
  'index.html','data/cultures.js','data/economy.js','data/bookmarks.js',
  'data/bookmark_476_wider_identities.js','data/bookmark_476_wider.js',
  'data/bookmark_493_world.js','data/bookmark_711_terrain.js',
  'data/bookmark_800_expansion.js','data/bookmark_867_expansion.js',
  'data/bookmark_1066_inhabited.js','data/bookmark_1204_terrain.js',
  'data/government_rollout.js','data/starts.js','data/distribution_crazygames.js',
  'js/model.js','js/world.js','js/economy.js','js/population.js',
  'js/bookmark_setup.js','js/government_lineage.js','js/religion.js',
  'js/mods.js','js/save.js','js/save_v4.js','js/main.js','js/crazygames.js'
]);

const CURRENT = 'inhabited_v2_governments_v2';
async function startGhana(page,info,crazygames) {
  await page.addInitScript(function (revision) {
    document.addEventListener('DOMContentLoaded',function () {
      FBDATA.bookmarks['1066'].revision = revision;
    },{once:true});
  },CURRENT);
  await startHistoricalGame(page,info,{
    bookmark:'1066',code:'AFRICAN1066-1066-farmer-kumbi_district-m-Review-established'
  },crazygames);
}

test('African profile revisions preserve all released faith and default contracts',
  async function ({page},info) {
    await openGame(page,info);
    const fixture = JSON.parse(fs.readFileSync(
      path.join(__dirname,'../fixtures/released-catalogue.json'),'utf8'));
    expect((await page.evaluate(releasedCatalogue,fixture.selection)).hashes).toEqual(fixture.hashes);
    expect(await page.evaluate(function () {
      return {errors:FB.validateReligionData(null),
        removed:!FB.faithExists('wagadu_traditional_1066',null),
        replacement:FB.faithExists('ghana_local_practice_1066',null)};
    })).toEqual({errors:[],removed:true,replacement:true});
  });

test('Berber and Ghana profiles resolve local simulation rules without inherited specialist ladders',
  async function ({page},info) {
    await openGame(page,info);
    expect(await page.evaluate(function () {
      const before = JSON.stringify(FBDATA), rng = FB.getRngState(), uid = FB.getUidCounter();
      const rows = ['berber_traditional','ghana_local_practice_1066'].map(function (id) {
        const r = FB.religionOf(id,null);
        return {parent:r.parent,legal:r.legalTradition,head:r.head,
          holyWar:r.holyWarTradition,raiding:r.raidingTradition,
          clergyMarriage:r.clergyMarriage,spouses:r.marriage.spouseLimit,
          divorce:r.marriage.divorce,kinship:r.marriage.kinship,
          roles:r.roles,cleric:r.words.cleric,landed:r.words.landed,
          partnership:r.words.partnership,paths:r.religiousPaths,
          localSources:['marriage.spouseLimit.m','clergyMarriage','roles.monasticM',
            'holyWarTradition','raidingTradition'].every(function (key) {
              return FB.faithValue(null,id,key).sourceId === id;
            })};
      });
      return {rows:rows,pure:before === JSON.stringify(FBDATA) &&
        rng === FB.getRngState() && uid === FB.getUidCounter()};
    })).toEqual({rows:['pagan',null].map(function (parent) {
      return {parent:parent,legal:'customary',head:null,holyWar:null,raiding:false,
        clergyMarriage:true,spouses:{m:1,f:1},
        divorce:{kind:'sunder',direct:true,gold:0,piety:0,prestige:5,cooldownDays:0},
        kinship:{siblingRite:null},
        roles:{monasticM:'Devotee',monasticF:'Devotee',
          priestM:'Ritual keeper',priestF:'Ritual keeper'},
        cleric:'Ritual keeper',landed:'Ruler',partnership:'Trade partnership',
        paths:null,localSources:true};
    }),pure:true});
  });

test('the Ghana profile is independently scoped to 1066 and future assignments reject purely',
  async function ({page},info) {
    await openGame(page,info);
    expect(await page.evaluate(function () {
      const before = JSON.stringify(FBDATA), rng = FB.getRngState(), uid = FB.getUidCounter();
      const id = 'ghana_local_practice_1066';
      const allowed = ['476','493','711','800','867','1066','1204'].map(function (date) {
        return FB.faithHistoricalAvailable(id,FB.bookmark(date),'community');
      });
      const rejected = ['867','1204'].map(function (date) {
        const b = JSON.parse(JSON.stringify(FB.bookmark(date)));
        b.realms[0].religion = id;
        return FB.validateBookmark(b).some(function (error) {
          return error.indexOf('unavailable for this dated consumer') >= 0;
        });
      });
      return {allowed:allowed,rejected:rejected,
        pure:before === JSON.stringify(FBDATA) && rng === FB.getRngState() &&
          uid === FB.getUidCounter()};
    })).toEqual({allowed:[false,false,false,false,false,true,false],
      rejected:[true,true],pure:true});
  });

test('every 1066 Ghana consumer migrates together while the Muslim community remains separate',
  async function ({page},info) {
    await openGame(page,info);
    expect(await page.evaluate(function () {
      return ['inhabited_v2','inhabited_v2_governments_v2'].map(function (revision) {
        const b = FB.bookmark('1066',revision);
        const p = b.provinces.find(function (p) { return p.id === 'kumbi_district'; });
        const r = b.realms.find(function (r) { return r.id === 'wagadu_1066'; });
        const site = FBDATA.settlementLayouts[b.settlementLayout].kumbi_district[0].site;
        const point = FBDATA.settlementSites[site];
        return {errors:FB.validateBookmark(b),county:p.religion,court:r.religion,
          kin:r.royalCourt.members.map(function (c) { return [c.id,c.religion]; }),
          communities:p.communities.map(function (c) {
            return [c.culture,c.religion,c.populationShare0];
          }),total:p.communities.reduce(function (n,c) { return n + c.populationShare0; },0),
          oldReference:JSON.stringify(b).indexOf('wagadu_traditional_1066') >= 0,
          inBounds:point.x >= -11 && point.x <= 70 && point.y >= 13 && point.y <= 66};
      });
    })).toEqual([0,1].map(function () {
      return {errors:[],county:'ghana_local_practice_1066',court:'ghana_local_practice_1066',
        kin:[['ancestor','ghana_local_practice_1066'],['sister','ghana_local_practice_1066'],
          ['nephew','ghana_local_practice_1066']],
        communities:[['soninke_1066','ghana_local_practice_1066',7000],
          ['soninke_1066','sunni',3000]],total:10000,oldReference:false,inBounds:true};
    }));
  });

test('held Nile, Horn, Sahel and Niger assignments remain dated and distinct',
  async function ({page},info) {
    await openGame(page,info);
    expect(await page.evaluate(function () {
      const revisions = {'476':'wider_v2','493':'world_v2','711':'terrain_v2',
        '800':'inhabited_v2','867':'inhabited_v2','1066':'inhabited_v2',
        '1204':'inhabited_v2'};
      const rows = [
        ['476','dongola','nile_traditional_476'],['493','dongola','nile_traditional_476'],
        ['476','axum','horn_traditional_476'],['493','axum','horn_traditional_476'],
        ['476','jenne_district','sahel_traditional_476'],
        ['493','jenne_district','sahel_traditional_476'],
        ['711','gao_district','sahel_traditional_476'],
        ['800','gao_district','sahel_traditional_476'],
        ['867','kumbi_district','sahel_traditional_476'],
        ['1066','jenne_district','niger_traditional_1066'],
        ['1066','gao_district','niger_traditional_1066'],
        ['1204','jenne_district','sahel_traditional_476'],
        ['1204','gao_district','sahel_traditional_476'],
        ['1204','kumbi_district','sahel_traditional_476']
      ];
      return {held:rows.every(function (row) {
        const p = FB.bookmark(row[0],revisions[row[0]]).provinces.find(function (p) {
          return p.id === row[1];
        });
        return p && p.communities.some(function (c) { return c.religion === row[2]; });
      }),oldWorlds:['867','1066'].every(function (date) {
        return JSON.stringify(FB.bookmark(date,'baseline')).indexOf('ghana_local_practice_1066') < 0;
      }),gaoCourt:FB.bookmark('1066',revisions['1066']).realms.find(function (r) {
        return r.id === 'gao_1066';
      }).religion,futureCourt:FB.bookmark('1204',revisions['1204']).realms.find(function (r) {
        return r.id === 'wagadu_court_1204';
      }).religion};
    })).toEqual({held:true,oldWorlds:true,gaoCourt:'sunni',futureCourt:'sunni'});
  });

for (const crazygames of [false,true]) test('Ghana households and generated faith retain mixed population on restore, CrazyGames ' + crazygames,
  async function ({page},info) {
    await startGhana(page,info,crazygames);
    const source = await page.evaluate(function () {
      const s = FB.state, c = s.chars[s.player.charId], pid = 'kumbi_district';
      const faith = 'ghana_local_practice_1066';
      if (c.religion !== faith) throw new Error('The primary-community household did not migrate.');
      const id = FB.createFaith(s,{id:'e2e_ghana_household',name:'Household practice',
        parent:faith,relationToParent:'in_fold',properties:{clergyMarriage:true}});
      if (!id) throw new Error('Generated household faith was rejected.');
      const court = s.realms.wagadu_1066.succession;
      const ruler = court.members[court.rulerMemberId];
      const before = {start:s.start,communities:FB.countyCommunities(s,pid),
        count:s.population.counties[pid].count,player:c.religion,court:s.realms.wagadu_1066.religion,
        ruler:s.chars[ruler.charId].religion,kin:Object.keys(court.members).map(function (id) {
          const member = court.members[id];
          return [id,member.religion || s.realms.wagadu_1066.religion,
            member.charId ? s.chars[member.charId].religion : null];
        }),owner:s.owner[pid],holder:s.holder[pid],
        lineage:FB.faithLineage(id,s),definition:s.faiths[id],
        paths:FB.religiousPathOf(s,c),heads:JSON.parse(JSON.stringify(s.religiousHeads))};
      return {saved:FB.save.serialize(),before:before};
    });
    expect(source.before).toMatchObject({player:'ghana_local_practice_1066',
      court:'ghana_local_practice_1066',ruler:'ghana_local_practice_1066',paths:null});
    expect(source.before.communities.map(function (c) { return c.religion; }))
      .toEqual(['ghana_local_practice_1066','sunni']);
    expect(source.before.communities.reduce(function (n,c) { return n + c.count; },0))
      .toBe(source.before.count);
    expect(source.before.kin.every(function (row) {
      return row[1] === 'ghana_local_practice_1066' &&
        (row[2] === null || row[2] === 'ghana_local_practice_1066');
    })).toBe(true);
    await page.evaluate(function () {
      return new Promise(function (resolve,reject) {
        FB.activateBookmark('1204',null,function (error) {
          if (error) reject(error); else resolve();
        });
      });
    });
    await restoreBookmark(page,source.saved);
    expect(await page.evaluate(function () {
      const s = FB.state, c = s.chars[s.player.charId], pid = 'kumbi_district',
        id = 'e2e_ghana_household';
      const court = s.realms.wagadu_1066.succession;
      return {start:s.start,communities:FB.countyCommunities(s,pid),
        count:s.population.counties[pid].count,player:c.religion,court:s.realms.wagadu_1066.religion,
        ruler:s.chars[court.members[court.rulerMemberId].charId].religion,
        kin:Object.keys(court.members).map(function (id) {
          const member = court.members[id];
          return [id,member.religion || s.realms.wagadu_1066.religion,
            member.charId ? s.chars[member.charId].religion : null];
        }),owner:s.owner[pid],holder:s.holder[pid],
        lineage:FB.faithLineage(id,s),definition:s.faiths[id],
        paths:FB.religiousPathOf(s,c),heads:JSON.parse(JSON.stringify(s.religiousHeads))};
    })).toEqual(source.before);
  });
