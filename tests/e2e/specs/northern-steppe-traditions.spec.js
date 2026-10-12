'use strict';
const fs = require('fs');
const path = require('path');
const {test,expect} = require('../support/fixture');
const {openGame} = require('../support/game/navigation');
const {startDeterministicGame} = require('../support/game/start');
const {beginBookmark,restoreBookmark} = require('../support/game/bookmark-acceptance');
const {releasedCatalogue} = require('../support/released-catalogue');
const {dependsOnRuntime} = require('../support/runtime-dependencies');

dependsOnRuntime(__filename, ['data/cultures.js','data/technology.js','data/economy.js',
  'data/map_data.js','data/bookmarks.js','data/bookmark_476.js','data/bookmark_476_outer.js',
  'data/bookmark_476_gaul_iberia.js','data/bookmark_476_wider_identities.js',
  'data/bookmark_476_wider.js','data/bookmark_493_world.js','data/bookmark_711.js',
  'data/bookmark_711_terrain.js','js/model.js','js/world.js','js/events.js',
  'js/economy.js','js/mods.js','js/save.js','js/save_v4.js','js/main.js']);

test('released faiths and their inherited defaults keep their catalogue fingerprints',
  async function ({page},testInfo) {
    await openGame(page,testInfo);
    const fixture = JSON.parse(fs.readFileSync(path.join(__dirname,'../fixtures/released-catalogue.json'),'utf8'));
    expect((await page.evaluate(releasedCatalogue,fixture.selection)).hashes).toEqual(fixture.hashes);
  });

test('Germanic household queries override pagan doctrine without creating a religious office or ladder',
  async function ({page},testInfo) {
    await openGame(page,testInfo);
    expect(await page.evaluate(function () {
      const before = JSON.stringify(FBDATA), rng = FB.getRngState(), uid = FB.getUidCounter();
      const faith = 'germanic_pagan';
      const rules = ['head','holyWarTradition','raidingTradition','clergyMarriage',
        'religiousPaths','marriage.spouseLimit.m','roles.monasticF','words.cleric'];
      const local = rules.every(function (key) { return FB.faithValue(null,faith,key).sourceId === faith; });
      return {local:local,limits:FB.marriageDoctrine(faith,null).spouseLimit,
        marriage:FB.religionOf(faith,null).clergyMarriage,
        office:FB.faithOfficeId(faith,null),paths:FB.religionOf(faith,null).religiousPaths,
        holyWar:FB.religionOf(faith,null).holyWarTradition,
        words:[FB.faithDataText(null,null,faith,'roles.monasticF',{}),
          FB.faithDataText(null,null,faith,'roles.priestM',{}),
          FB.faithDataText(null,null,faith,'words.partnership',{})],
        errors:FB.validateReligionData(null),technology:FB.validateTechnologyData(true),
        impact:FBDATA.techImpactReviews.features.germanic_household_rules.mode,
        pure:before === JSON.stringify(FBDATA) && rng === FB.getRngState() && uid === FB.getUidCounter()};
    })).toEqual({local:true,limits:{m:1,f:1},marriage:true,office:null,paths:null,
      holyWar:null,words:['Religious student','Ritual participant','Trade partnership'],
      errors:[],technology:[],impact:'none',pure:true});
  });

test('faith-derived raiding is removed without disabling independent cultural eligibility',
  async function ({page},testInfo) {
    await openGame(page,testInfo);
    expect(await page.evaluate(function () {
      const before = JSON.stringify(FBDATA), rng = FB.getRngState(), uid = FB.getUidCounter();
      return {germanic:FB.hasFaithRaidingTradition('germanic_pagan',null),
        frankish:FB.hasRaidingTradition('frankish','germanic_pagan',null),
        norseCulture:FB.hasRaidingTradition('norse','germanic_pagan',null),
        released:FB.hasFaithRaidingTradition('norse_pagan',null),
        pure:before === JSON.stringify(FBDATA) && rng === FB.getRngState() && uid === FB.getUidCounter()};
    })).toEqual({germanic:false,frankish:false,norseCulture:true,released:true,pure:true});
  });

test('held regional profiles retain separate early availability and no universal head',
  async function ({page},testInfo) {
    await openGame(page,testInfo);
    expect(await page.evaluate(function () {
      const ids = ['insular_traditional_476','finnic_traditional_476','woodland_traditional_476',
        'steppe_traditional_476','caucasian_traditional_476'];
      const dates = ['476','493','711','800','867','1066','1204'];
      const before = JSON.stringify(FBDATA), rng = FB.getRngState(), uid = FB.getUidCounter();
      return {availability:ids.map(function (id) {
        return dates.map(function (date) { return FB.faithHistoricalAvailable(id,FB.bookmark(date),'community'); });
      }),heads:ids.map(function (id) { return FB.faithOfficeId(id,null); }),
      roots:ids.every(function (id) { return FB.faithLineage(id,null).length === 1; }),
      worlds:dates.map(function (id) { return FB.validateBookmark(FB.bookmark(id)); }),
      pure:before === JSON.stringify(FBDATA) && rng === FB.getRngState() && uid === FB.getUidCounter()};
    })).toEqual({availability:Array(5).fill([true,true,false,false,false,false,false]),
      heads:[null,null,null,null,null],roots:true,worlds:[[],[],[],[],[],[],[]],pure:true});
  });

test('early consumers preserve their independent Caucasian, Volga and mixed Irish assignments',
  async function ({page},testInfo) {
    await openGame(page,testInfo);
    expect(await page.evaluate(function () {
      const before = JSON.stringify(FBDATA), rng = FB.getRngState(), uid = FB.getUidCounter();
      const rows = ['476','493'].map(function (id) {
        const b = FB.bookmark(id);
        function county(pid) { return b.provinces.find(function (p) { return p.id === pid; }); }
        return {revision:b.revision,faiths:['sukhumi','magas','bolghar','bilyar'].map(function (pid) {
          return county(pid).religion;
        }),irish:county('tara').communities.map(function (c) { return [c.religion,c.populationShare0]; }),
        court:b.realms.find(function (r) { return r.id === (id === '476' ? 'abazgia_476' : 'alan_493'); }).religion};
      });
      return {rows:rows,pure:before === JSON.stringify(FBDATA) && rng === FB.getRngState() && uid === FB.getUidCounter()};
    })).toEqual({rows:[
      {revision:'wider_v2',faiths:['caucasian_traditional_476','steppe_traditional_476',
        'finnic_traditional_476','finnic_traditional_476'],
        irish:[['insular_traditional_476',6500],['nicene',3500]],court:'caucasian_traditional_476'},
      {revision:'world_v2',faiths:['caucasian_christian_476','caucasian_traditional_476',
        'steppe_traditional_476','steppe_traditional_476'],
        irish:[['insular_traditional_476',7500],['nicene',2500]],court:'caucasian_traditional_476'}
    ],pure:true});
  });

test('a religious student can marry under Germanic household rules while released Norse vows and capacity persist',
  async function ({page},testInfo) {
    await openGame(page,testInfo);
    await startDeterministicGame(page);
    expect(await page.evaluate(function () {
      const s = FB.state, me = s.chars[s.player.charId];
      FB.spousesSnapshot(s,me).forEach(function (c) { c.spouseId = null; c.spouseIds = []; });
      me.spouseId = null; me.spouseIds = []; me.betrothedId = null;
      me.sex = 'm'; me.born = s.date.year - 30; me.religion = 'germanic_pagan';
      me.career = {profession:'monk',rank:'journeyman',chosen:true,startedYear:s.date.year,
        experience:0,guildRank:'none',guildStanding:0};
      s.player.profession = 'monk'; s.player.courtingId = null;
      const partner = FB.makeCharacter(s,{name:'Ordinary Partner',sex:'f',born:s.date.year - 25,
        culture:me.culture,religion:me.religion,traits:[],opinion:100});
      partner.homeProvinceId = s.player.provinceId;
      const before = JSON.stringify(s), rng = FB.getRngState(), uid = FB.getUidCounter();
      const ordinary = FB.courtshipStatus(s,partner,false);
      const standings = FB.religiousStandings(s,me);
      const pure = before === JSON.stringify(s) && rng === FB.getRngState() && uid === FB.getUidCounter();
      me.religion = 'norse_pagan'; partner.religion = me.religion;
      const retained = FB.courtshipStatus(s,partner,false);
      me.spouseId = partner.id; me.spouseIds = [partner.id]; partner.spouseId = me.id;
      const norseCapacity = FB.canWedSnapshot(s);
      me.religion = 'germanic_pagan';
      const germanicCapacity = FB.canWedSnapshot(s);
      return {ordinary:ordinary.ready,standings:standings,retained:retained.code,
        capacity:[germanicCapacity,norseCapacity],pure:pure};
    })).toEqual({ordinary:true,standings:[],retained:'vocation_vow',capacity:[false,true],pure:true});
  });

test('held mixed communities, generated Germanic descendants and household state survive restore',
  async function ({page},testInfo) {
    await beginBookmark(page,testInfo,'493');
    const source = await page.evaluate(function () {
      const s = FB.state;
      const id = FB.createFaith(s,{id:'e2e_germanic_branch',name:'Local Household',parent:'germanic_pagan',
        relationToParent:'in_fold',founderId:s.player.charId});
      if (!id) throw new Error('Generated faith setup failed.');
      const child = FB.makeCharacter(s,{name:'Household Descendant',sex:'f',born:s.date.year - 8,
        culture:s.chars[s.player.charId].culture,religion:id,fatherId:s.player.charId,traits:[]});
      s.chars[s.player.charId].childrenIds.push(child.id);
      const facts = {community:FB.countyCommunities(s,'tara'),lineage:FB.faithLineage(id,s),
        doctrine:FB.marriageDoctrine(id,s),role:FB.faithValue(s,id,'roles.monasticF'),
        heads:JSON.parse(JSON.stringify(s.religiousHeads)),child:child.religion,
        start:JSON.parse(JSON.stringify(s.start))};
      return {saved:FB.save.serialize(),facts:facts,childId:child.id};
    });
    await openGame(page,testInfo);
    await restoreBookmark(page,source.saved);
    expect(await page.evaluate(function (input) {
      const s = FB.state, id = 'e2e_germanic_branch';
      return {community:FB.countyCommunities(s,'tara'),lineage:FB.faithLineage(id,s),
        doctrine:FB.marriageDoctrine(id,s),role:FB.faithValue(s,id,'roles.monasticF'),
        heads:JSON.parse(JSON.stringify(s.religiousHeads)),child:s.chars[input.childId].religion,
        start:JSON.parse(JSON.stringify(s.start))};
    },source)).toEqual(source.facts);
  });
