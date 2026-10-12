'use strict';
const fs = require('fs');
const path = require('path');
const {test,expect} = require('../support/fixture');
const {openGame} = require('../support/game/navigation');
const {startDeterministicGame} = require('../support/game/start');
const {beginBookmark,restoreBookmark} = require('../support/game/bookmark-acceptance');
const {releasedCatalogue} = require('../support/released-catalogue');
const {startHistoricalGame} = require('../support/game/historical-start');
const {dependsOnRuntime} = require('../support/runtime-dependencies');

dependsOnRuntime(__filename, ['data/cultures.js','data/economy.js','data/technology.js',
  'data/map_data.js','data/bookmarks.js','data/bookmark_476.js','data/bookmark_476_wider_identities.js',
  'data/bookmark_476_wider.js','data/bookmark_493.js','data/bookmark_493_world.js','data/bookmark_711.js',
  'data/bookmark_711_terrain.js','data/bookmark_800.js','data/bookmark_800_expansion.js',
  'data/bookmark_867_expansion.js','data/bookmark_1066_inhabited.js',
  'data/bookmark_1204.js','data/bookmark_1204_terrain.js','js/model.js','js/world.js','js/events.js',
  'js/actions.js','js/economy.js','js/papacy.js','js/population.js','js/mods.js',
  'js/save.js','js/save_v4.js','js/main.js', 'index.html',
  'data/religious_institutions.js','data/religious_activities.js','data/political_institutions.js',
  'data/systems.js','data/actions.js','data/distribution_crazygames.js',
  'data/intrigue.js','data/starts.js','data/settlements.js',
  'js/religious_institutions.js','js/religious_activities.js','js/institutions.js',
  'js/authority.js','js/treasury.js','js/abbeys.js','js/religion.js','js/settlement.js',
  'js/justice.js','js/intrigue.js','js/travel.js','js/technology.js','js/systems.js',
  'js/crazygames.js','js/politics.js','js/progression.js','js/station.js']);

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
      return {rows:rows,errors:FB.validateReligionData(null),technology:FB.validateTechnologyData(true),
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

/* These district-city bindings are fixtures, not historical monastery sites.
   Dated physical placement remains a separate acceptance decision. */
async function layHousehold(page, testInfo, crazygames) {
  await startHistoricalGame(page,testInfo,{
    bookmark:'711',code:'LAYHOUSE-711-farmer-ghazni-f-Pema-established'
  },!!crazygames);
  await page.evaluate(function () {
    const s = FB.state, me = s.chars[s.player.charId];
    FB.game.setPaused(true);
    me.born = s.date.year - 30; me.health = 8; me.religion = 'buddhist_711';
    me.skills.int = 3; me.role = 'farmer';
    s.player.profession = 'farmer'; FB.careerOf(s,me).profession = 'farmer';
    s.player.gold = 10; s.player.piety = 0; s.player.prestige = 0;
    s.player.travel = null; s.player.flags.on_campaign = false; s.player.flags.with_liege_host = false;
    s.player.manor = null; s.player.landPlots = []; s.player.landPlotMigration = 1;
    FB.setPlayerTier(s,1,{stationFarewell:false});
    let spouse = FB.spouseOf(s,me);
    if (!spouse) {
      spouse = FB.makeCharacter(s,{name:'Lay Partner',sex:'m',born:s.date.year - 30,
        religion:me.religion,culture:me.culture,role:'spouse',station:1,traits:[]});
      me.spouseId = spouse.id; spouse.spouseId = me.id; FB.touchFamily();
    }
    spouse.born = s.date.year - 30; spouse.health = 8; spouse.religion = me.religion;
    spouse.homeProvinceId = 'ghazni'; spouse.skills.int = 3;
    FB.careerOf(s,spouse).profession = 'farmer';
    const defs = Object.assign({},FB.campaignBookmark(s).localInstitutions || {});
    defs.tapa_sardar_house_711 = {city:'Fixture Ghazni learning house',kind:'monastery',
      provinceId:'ghazni',site:'ghazni_711',religion:'buddhist_711',culture:me.culture,
      profileId:'tapa_sardar_lay_support',vacant:true,jurisdictionIds:['ghazni'],
      abbeyId:'e2e_tapa_sardar_property'};
    defs.tepe_narenj_house_711 = {city:'Fixture Kabul learning house',kind:'monastery',
      provinceId:'kabul',site:'kabul_711',religion:'buddhist_711',culture:me.culture,
      profileId:'tepe_narenj_lay_support',vacant:true,jurisdictionIds:['kabul'],
      abbeyId:'e2e_tepe_narenj_property'};
    FBDATA.bookmarks[s.start.id].revisions[s.start.revision].localInstitutions = defs;
    s.localInstitutions = s.localInstitutions || {};
    ['tapa_sardar_house_711','tepe_narenj_house_711'].forEach(function (id) {
      s.localInstitutions[id] = FB.religiousInstitutionOpeningRow(id,defs[id]);
    });
    const helper = FB.makeCharacter(s,{name:'Fellow lay learner',sex:'f',born:s.date.year - 30,
      religion:'buddhist_711',culture:me.culture,role:'notable',station:1});
    helper.homeProvinceId = 'ghazni'; helper.skills.int = 4; helper.health = 8;
    window.buddhistFixture = {cid:me.id,spouse:spouse.id,helper:helper.id};
    window.layAdmit = function (iid,cid,role) {
      const q = FB.religiousInstitutionQuote(s,iid,{kind:'character',id:cid},'admit',{roleId:role});
      if (!q || !q.allowed || !FB.religiousInstitutionApply(s,q)) throw new Error('Admission: ' + (q && q.reason));
    };
    window.foundLayHouse = function (key) {
      const pid = key === 'tapa_sardar' ? 'ghazni' : 'kabul';
      s.player.provinceId = pid;
      s.player.landPlots = s.player.landPlots.concat([{provinceId:pid,settlement:0},{provinceId:pid,settlement:0}]);
      const q = FB.religiousPatronageQuote(s,key + '_giving_711',me.id,'foundation',
        {land:{provinceId:pid,settlement:0,count:2}});
      if (!q || !q.allowed || !FB.religiousPatronageApply(s,q)) throw new Error('Foundation: ' + (q && q.reason));
      return s.abbeys.houses.find(function (h) { return h.activityInstitutionId === key + '_house_711'; });
    };
  });
}

test('lay house contracts validate without seeding historical premises, ordination or journeys',
  async function ({page},testInfo) {
    await openGame(page,testInfo);
    expect(await page.evaluate(function () {
      const before = JSON.stringify(FBDATA), rng = FB.getRngState(), uid = FB.getUidCounter();
      const profiles = ['tapa_sardar_lay_support','tepe_narenj_lay_support'];
      const placed = ['476','493','711','800','867','1066','1204'].some(function (id) {
        const b = FB.bookmark(id);
        return Object.keys(b.localInstitutions || {}).some(function (iid) {
          return profiles.includes(b.localInstitutions[iid].profileId);
        });
      });
      return {institutions:FB.religiousInstitutionCatalogFaults(FBDATA),
        activities:FB.religiousActivityCatalogFaults(FBDATA),
        mods:FB.mods.validate({name:'Lay Buddhist support',religiousInstitutionProfiles:FBDATA.religiousInstitutionProfiles,
          religiousActivities:FBDATA.religiousActivities,religiousPatronage:FBDATA.religiousPatronage}),
        placed:placed,noOrdination:profiles.every(function (id) {
          const p = FBDATA.religiousInstitutionProfiles[id];
          return p.selection === null && !p.roles.novice && !p.roles.ordained &&
            !p.roles.abbot && !p.roles.abbess && !p.actions.includes('appoint');
        }),noJourney:['buddhist_household_practice_early','buddhist_household_study_early',
          'buddhist_household_practice_711','buddhist_household_study_711',
          'tapa_sardar_learning_711','tepe_narenj_learning_711'].every(function (id) {
          return FBDATA.religiousActivities[id].mode === 'local';
        }),technology:['religious_activity_participation','religious_activity_patronage',
          'religious_activity_outreach','religious_institution_membership'].map(function (id) {
          return FBDATA.techImpactReviews.features[id].mode;
        }),pure:before === JSON.stringify(FBDATA) && rng === FB.getRngState() && uid === FB.getUidCounter()};
    })).toEqual({institutions:[],activities:[],mods:[],placed:false,noOrdination:true,
      noJourney:true,technology:['none','none','none','none'],pure:true});
  });

test('household activities keep early and 711 faith, date and revision qualifications separate',
  async function ({page},testInfo) {
    await layHousehold(page,testInfo);
    expect(await page.evaluate(function () {
      const s = FB.state, me = s.chars[buddhistFixture.cid];
      const initial = JSON.stringify(s), start = s.start, year = s.date.year;
      const born = me.born, faith = me.religion, rng = FB.getRngState(), uid = FB.getUidCounter();
      const scopes = [
        ['476','wider_v2',476,'buddhist_476'],['493','world_v2',493,'buddhist_476'],
        ['711','terrain_v2_governments_v2',711,'buddhist_711'],
        ['476','wider_v2',476,'buddhist_711'],['711','terrain_v2_governments_v2',711,'buddhist_476'],
        ['711','baseline',711,'buddhist_711'],['493','world_v2',494,'buddhist_476'],
        ['800','inhabited_v2_governments_v2',800,'buddhist_711'],
        ['1204','inhabited_v2_governments_v2',1204,'buddhist_476']
      ];
      const allowed = scopes.map(function (scope) {
        s.start = Object.assign({},start,{id:scope[0],revision:scope[1]});
        s.date.year = scope[2]; me.born = scope[2] - 30; me.religion = scope[3];
        return ['buddhist_household_practice_early','buddhist_household_study_early',
          'buddhist_household_practice_711','buddhist_household_study_711'].map(function (id) {
          return FB.religiousActivityQuote(s,id,me.id).allowed;
        });
      });
      s.start = start; s.date.year = year; me.born = born; me.religion = faith;
      return {allowed:allowed,pure:initial === JSON.stringify(s) &&
        rng === FB.getRngState() && uid === FB.getUidCounter()};
    })).toEqual({allowed:[[true,true,false,false],[true,true,false,false],[false,false,true,true],
      [false,false,false,false],[false,false,false,false],[false,false,false,false],
      [false,false,false,false],[false,false,false,false],[false,false,false,false]],pure:true});
  });

test('unplaced and out-of-period support does not expose unrelated household activity controls',
  async function ({page},testInfo) {
    await startHistoricalGame(page,testInfo,{
      bookmark:'711',code:'LAYVISIBLE-711-farmer-ghazni-f-Pema-established'
    });
    expect(await page.evaluate(function () {
      const s = FB.state, me = s.chars[s.player.charId];
      FBDATA.religiousActivities = Object.keys(FBDATA.religiousActivities).reduce(function (out,id) {
        if (/^buddhist_household_|^tapa_sardar_learning_|^tepe_narenj_learning_/.test(id))
          out[id] = FBDATA.religiousActivities[id];
        return out;
      },{});
      FBDATA.religiousPatronage = Object.keys(FBDATA.religiousPatronage).reduce(function (out,id) {
        if (/^tapa_sardar_|^tepe_narenj_/.test(id)) out[id] = FBDATA.religiousPatronage[id];
        return out;
      },{});
      FB.game.setPaused(true); me.religion = 'buddhist_711';
      const household = FB.religiousActivityVisible(s,me.id);
      me.religion = 'jewish';
      const unrelated = FB.religiousActivityVisible(s,me.id);
      me.religion = 'buddhist_711'; s.date.year = 800;
      const initial = JSON.stringify(s), rng = FB.getRngState(), uid = FB.getUidCounter();
      return {household:household,unrelated:unrelated,later:FB.religiousActivityVisible(s,me.id),
        pure:initial === JSON.stringify(s) && rng === FB.getRngState() && uid === FB.getUidCounter()};
    })).toEqual({household:true,unrelated:false,later:false,pure:true});
  });

test('free practice and study preserve a poor married household and ordinary work',
  async function ({page},testInfo) {
    await layHousehold(page,testInfo);
    expect(await page.evaluate(function () {
      const s = FB.state, f = buddhistFixture, me = s.chars[f.cid], spouse = s.chars[f.spouse];
      s.player.gold = 0;
      const links = JSON.stringify([me.spouseId,spouse.spouseId]), heads = JSON.stringify(s.religiousHeads);
      const study = FB.religiousActivityApply(s,FB.religiousActivityQuote(s,'buddhist_household_study_711',f.cid));
      const practice = FB.religiousActivityApply(s,FB.religiousActivityQuote(s,'buddhist_household_practice_711',f.spouse));
      s.turn += 2; FB.religiousActivityTick(s);
      return {study:study,practice:practice,int:me.skills.int,piety:s.player.piety,gold:s.player.gold,
        work:[FB.careerOf(s,me).profession,FB.careerOf(s,spouse).profession],
        links:links === JSON.stringify([me.spouseId,spouse.spouseId]),heads:heads === JSON.stringify(s.religiousHeads),
        repeat:!FB.religiousActivityQuote(s,'buddhist_household_study_711',f.cid).allowed,
        noProperty:!(s.abbeys && s.abbeys.houses.length),
        vows:FB.religiousMembershipUnmarried(s,me) || FB.religiousMembershipUnmarried(s,spouse)};
    })).toEqual({study:true,practice:true,int:4,piety:1,gold:0,work:['farmer','farmer'],
      links:true,heads:true,repeat:true,noProperty:true,vows:false});
  });

test('independent local admissions enforce location and declared age or competence without landed patronage',
  async function ({page},testInfo) {
    await layHousehold(page,testInfo);
    expect(await page.evaluate(function () {
      const s = FB.state, f = buddhistFixture, me = s.chars[f.cid];
      s.player.gold = 0; me.born = s.date.year - 16;
      const initial = [FB.religiousInstitutionRoleEligibility(s,'tapa_sardar_house_711',f.cid,'learner'),
        FB.religiousInstitutionRoleEligibility(s,'tapa_sardar_house_711',f.cid,'study_helper'),
        FB.religiousInstitutionRoleEligibility(s,'tepe_narenj_house_711',f.cid,'learner')];
      layAdmit('tapa_sardar_house_711',f.cid,'learner');
      s.player.provinceId = 'kabul';
      const young = !FB.religiousInstitutionRoleEligibility(s,'tepe_narenj_house_711',f.cid,'learner');
      layAdmit('tepe_narenj_house_711',f.cid,'visitor');
      me.born = s.date.year - 30;
      layAdmit('tepe_narenj_house_711',f.cid,'learner');
      const before = JSON.stringify(s), rng = FB.getRngState(), uid = FB.getUidCounter();
      const denied = ['novice','ordained','abbess'].every(function (role) {
        return !FB.religiousInstitutionRoleEligibility(s,'tepe_narenj_house_711',f.cid,role);
      });
      const appoint = FB.religiousInstitutionQuote(s,'tepe_narenj_house_711',{kind:'character',id:f.cid},
        'appoint',{candidateId:f.cid});
      return {initial:initial,young:young,roles:[s.localInstitutions.tapa_sardar_house_711.members[f.cid].roleId,
        s.localInstitutions.tepe_narenj_house_711.members[f.cid].roleId],
        denied:denied,appoint:!appoint.allowed,pure:before === JSON.stringify(s) &&
          rng === FB.getRngState() && uid === FB.getUidCounter(),gold:s.player.gold};
    })).toEqual({initial:[true,false,false],young:true,roles:['learner','learner'],denied:true,
      appoint:true,pure:true,gold:0});
  });

test('each founded recipient owns its exact plot group and small cross-faith gifts stay restricted',
  async function ({page},testInfo) {
    await layHousehold(page,testInfo);
    expect(await page.evaluate(function () {
      const s = FB.state, f = buddhistFixture, me = s.chars[f.cid], initial = s.player.gold;
      const first = foundLayHouse('tapa_sardar'), second = foundLayHouse('tepe_narenj');
      me.religion = 'jewish';
      const gift = FB.religiousPatronageQuote(s,'tepe_narenj_giving_711',f.cid,'donation',{fund:'learning',amount:2});
      const given = FB.religiousPatronageApply(s,gift);
      const before = JSON.stringify(s), overflow = FB.religiousPatronageQuote(s,'tepe_narenj_giving_711',f.cid,
        'donation',{fund:'learning',amount:8});
      const wrong = FB.religiousPatronageQuote(s,'tapa_sardar_giving_711',f.cid,'donation',{fund:'learning',amount:1});
      return {spent:initial - s.player.gold,land:s.player.landPlots.length,
        plots:[first.plots[0],second.plots[0]],funds:[first.restrictedFunds.learning || 0,second.restrictedFunds.learning],
        given:given,overflow:!overflow.allowed,wrongPlace:!wrong.allowed,pure:before === JSON.stringify(s),
        fundsSeparate:first.treasury === 0 && second.treasury === 0 && first.capital === 0 && second.capital === 0,
        faith:me.religion};
    })).toEqual({spent:3,land:0,plots:[{provinceId:'ghazni',settlement:0,count:2},
      {provinceId:'kabul',settlement:0,count:2}],funds:[0,2],given:true,overflow:true,
      wrongPlace:true,pure:true,fundsSeparate:true,faith:'jewish'});
  });

test('prepaid lessons consume their own service once and cannot stack household or other-venue learning',
  async function ({page},testInfo) {
    await layHousehold(page,testInfo);
    expect(await page.evaluate(function () {
      const s = FB.state, f = buddhistFixture, me = s.chars[f.cid], spouse = s.chars[f.spouse];
      const first = foundLayHouse('tapa_sardar');
      layAdmit('tapa_sardar_house_711',f.cid,'learner');
      FB.religiousPatronageApply(s,FB.religiousPatronageQuote(s,'tapa_sardar_giving_711',f.cid,'donation',{fund:'learning',amount:1}));
      const started = FB.religiousActivityApply(s,FB.religiousActivityQuote(s,'tapa_sardar_learning_711',f.cid));
      s.turn++; FB.religiousActivityTick(s);
      const early = first.restrictedFunds.learning === 1 && me.skills.int === 3;
      s.turn++; FB.religiousActivityTick(s);
      const home = !FB.religiousActivityQuote(s,'buddhist_household_study_711',f.cid).allowed;
      const second = foundLayHouse('tepe_narenj');
      layAdmit('tepe_narenj_house_711',f.cid,'learner');
      spouse.homeProvinceId = 'kabul'; layAdmit('tepe_narenj_house_711',f.spouse,'learner');
      FB.religiousPatronageApply(s,FB.religiousPatronageQuote(s,'tepe_narenj_giving_711',f.cid,'donation',{fund:'learning',amount:2}));
      const stacked = !FB.religiousActivityQuote(s,'tepe_narenj_learning_711',f.cid).allowed;
      const other = FB.religiousActivityApply(s,FB.religiousActivityQuote(s,'tepe_narenj_learning_711',f.spouse));
      s.turn += 3; FB.religiousActivityTick(s);
      return {started:started,early:early,home:home,stacked:stacked,other:other,
        int:[me.skills.int,spouse.skills.int],restricted:[first.restrictedFunds.learning,second.restrictedFunds.learning],
        spent:[first.activitySpent,second.activitySpent]};
    })).toEqual({started:true,early:true,home:true,stacked:true,other:true,int:[4,4],restricted:[0,0],spent:[1,3]});
  });

test('restricted public worship interrupts a funded lesson while households and property persist',
  async function ({page},testInfo) {
    await layHousehold(page,testInfo);
    expect(await page.evaluate(function () {
      const s = FB.state, f = buddhistFixture, h = foundLayHouse('tapa_sardar');
      layAdmit('tapa_sardar_house_711',f.cid,'learner');
      FB.religiousPatronageApply(s,FB.religiousPatronageQuote(s,'tapa_sardar_giving_711',f.cid,'donation',{fund:'learning',amount:1}));
      const started = FB.religiousActivityApply(s,FB.religiousActivityQuote(s,'tapa_sardar_learning_711',f.cid));
      const property = JSON.stringify(h), community = JSON.stringify(FB.countyCommunities(s,'ghazni'));
      const patron = FB.settlementCountyHolder(s,'ghazni');
      if (!FB.authoritySetIdentity(s,patron,{eliteCultureId:'turkic',eliteFaithId:'buddhist_711',
        legalIdentityId:'customary',tolerance:'persecution',taxation:'equal',justicePolicy:'personal'}))
        throw new Error('Expected an explicit worship restriction');
      s.turn += 2; FB.religiousActivityTick(s);
      const household = FB.religiousActivityApply(s,FB.religiousActivityQuote(s,'buddhist_household_practice_711',f.cid));
      s.turn++; FB.religiousActivityTick(s);
      return {started:started,cancelled:!s.chars[f.cid].religiousActivityHistory.buddhist_household_study_done,
        household:household,piety:s.player.piety,int:s.chars[f.cid].skills.int,
        property:property === JSON.stringify(h),community:community === JSON.stringify(FB.countyCommunities(s,'ghazni')),
        faith:s.chars[f.cid].religion};
    })).toEqual({started:true,cancelled:true,household:true,piety:1,int:3,property:true,community:true,faith:'buddhist_711'});
  });

test('withdrawal and donor death create no succession and cannot privatize the learning house',
  async function ({page},testInfo) {
    await layHousehold(page,testInfo);
    expect(await page.evaluate(function () {
      const s = FB.state, f = buddhistFixture, h = foundLayHouse('tapa_sardar');
      layAdmit('tapa_sardar_house_711',f.cid,'supporter');
      const property = JSON.stringify(h), heads = JSON.stringify(s.religiousHeads), people = Object.keys(s.chars).length;
      const withdrawn = FB.religiousInstitutionApply(s,FB.religiousInstitutionQuote(s,'tapa_sardar_house_711',
        {kind:'character',id:f.cid},'withdraw',{}));
      s.chars[f.cid].dead = true;
      FB.religiousInstitutionSnapshot(s,'tapa_sardar_house_711');
      return {withdrawn:withdrawn,status:s.localInstitutions.tapa_sardar_house_711.members[f.cid].status,
        property:property === JSON.stringify(h),heads:heads === JSON.stringify(s.religiousHeads),
        people:people === Object.keys(s.chars).length,holder:h.holderId};
    })).toEqual({withdrawn:true,status:'withdrawn',property:true,heads:true,people:true,holder:null});
  });

test('occupation interrupts the house service without spending its restricted gift or ending lay membership',
  async function ({page},testInfo) {
    await layHousehold(page,testInfo);
    expect(await page.evaluate(function () {
      const s = FB.state, f = buddhistFixture, h = foundLayHouse('tapa_sardar');
      layAdmit('tapa_sardar_house_711',f.cid,'learner');
      FB.religiousPatronageApply(s,FB.religiousPatronageQuote(s,'tapa_sardar_giving_711',f.cid,
        'donation',{fund:'learning',amount:1}));
      const started = FB.religiousActivityApply(s,FB.religiousActivityQuote(s,'tapa_sardar_learning_711',f.cid));
      const property = JSON.stringify(h), heads = JSON.stringify(s.religiousHeads);
      s.owner.ghazni = 'umayyad_711';
      s.turn += 2; FB.religiousActivityTick(s);
      return {started:started,interrupted:!s.chars[f.cid].religiousActivity,
        rewarded:!!(s.chars[f.cid].religiousActivityHistory || {}).buddhist_household_study_done,
        property:property === JSON.stringify(h),heads:heads === JSON.stringify(s.religiousHeads),
        member:s.localInstitutions.tapa_sardar_house_711.members[f.cid].status,
        faith:s.chars[f.cid].religion};
    })).toEqual({started:true,interrupted:true,rewarded:false,property:true,heads:true,
      member:'active',faith:'buddhist_711'});
  });

test('dated, retained-revision and stale reviews fail without spending or allocating state',
  async function ({page},testInfo) {
    await layHousehold(page,testInfo);
    expect(await page.evaluate(function () {
      const s = FB.state, f = buddhistFixture, start = JSON.parse(JSON.stringify(s.start)), year = s.date.year;
      const before = JSON.stringify(s), rng = FB.getRngState(), uid = FB.getUidCounter();
      FB.religiousActivityQuote(s,'buddhist_household_study_711',f.cid);
      FB.religiousInstitutionSnapshot(s,'tapa_sardar_house_711');
      const pure = before === JSON.stringify(s) && rng === FB.getRngState() && uid === FB.getUidCounter();
      s.start.revision = 'baseline';
      const retained = !FB.religiousActivityQuote(s,'buddhist_household_study_711',f.cid).allowed;
      s.start = start; s.date.year = 800;
      const later = !FB.religiousActivityQuote(s,'tapa_sardar_learning_711',f.cid).allowed;
      s.date.year = year;
      foundLayHouse('tapa_sardar');
      const gift = FB.religiousPatronageQuote(s,'tapa_sardar_giving_711',f.cid,'donation',{fund:'learning',amount:1});
      s.player.gold--;
      const staleState = JSON.stringify(s), stale = !FB.religiousPatronageApply(s,gift);
      return {pure:pure,retained:retained,later:later,stale:stale,unchanged:staleState === JSON.stringify(s)};
    })).toEqual({pure:true,retained:true,later:true,stale:true,unchanged:true});
  });

test('lay support funds one existing voluntary project without a second progress or population ledger',
  async function ({page},testInfo) {
    await layHousehold(page,testInfo);
    expect(await page.evaluate(function () {
      const s = FB.state, f = buddhistFixture, h = foundLayHouse('tapa_sardar');
      s.owner.ghazni = 'player'; s.holder.ghazni = 'player'; s.realms.player.alive = true; s.realms.player.liege = null;
      const rec = s.population.counties.ghazni;
      rec.communityProjects = {faith:{target:'buddhist_711',sponsor:'player',policy:'voluntary',startTurn:s.turn,
        progress:0.375,converted:12,resistance:0.2,lastTransfer:2,lastYear:s.date.year}};
      const before = JSON.stringify(rec.communities), gold = s.player.gold;
      const terms = {fund:'learning',amount:1,provinceId:'ghazni',settlement:null,target:'buddhist_711',policy:'voluntary'};
      const q = FB.religiousPatronageQuote(s,'tapa_sardar_giving_711',f.cid,'outreach',terms);
      const applied = FB.religiousPatronageApply(s,q), repeated = FB.religiousPatronageApply(s,q);
      const second = FB.religiousPatronageQuote(s,'tapa_sardar_giving_711',f.cid,'outreach',terms);
      const project = rec.communityProjects.faith;
      return {applied:applied,repeated:repeated,second:!second.allowed,spent:gold - s.player.gold,
        progress:project.progress,converted:project.converted,community:before === JSON.stringify(rec.communities),
        support:project.activitySupport,houseSpent:h.activitySpent};
    })).toMatchObject({applied:true,repeated:false,second:true,spent:1,progress:0.375,converted:12,
      community:true,support:{institutionId:'tapa_sardar_house_711',amount:1},houseSpent:1});
  });

test('autonomous lay membership and public gifts use real NPC accounts with bounded reserves',
  async function ({page},testInfo) {
    await layHousehold(page,testInfo);
    expect(await page.evaluate(function () {
      const s = FB.state, f = buddhistFixture, h = foundLayHouse('tapa_sardar');
      s.turn = 90;
      const gold = s.player.gold, heads = JSON.stringify(s.religiousHeads);
      s.localInstitutions = {tapa_sardar_house_711:s.localInstitutions.tapa_sardar_house_711,
        tepe_narenj_house_711:s.localInstitutions.tepe_narenj_house_711};
      const admissions = FB.religiousInstitutionAI(s), repeat = FB.religiousInstitutionAI(s);
      const members = s.localInstitutions.tapa_sardar_house_711.members;
      const npc = Object.keys(members).some(function (cid) {
        return cid !== f.cid && cid !== f.spouse && members[cid].roleId === 'learner';
      });
      FB.treasuryInitialize(s); s.treasuryAccounting.mode = 'active';
      const rid = FB.settlementCountyHolder(s,'ghazni'), c = FB.realmRulerCharacterSnapshot(s,rid);
      if (!c || !FB.treasuryCounterparty(s,rid)) throw new Error('Expected the district ruler account');
      c.homeProvinceId = 'ghazni'; c.health = 8; c.born = s.date.year - 30;
      s.realms[rid].treasury.gold = 3; s.realms[rid].treasury.militaryAccrued = 0;
      const amount = FB.treasuryAvailable(s,rid);
      const q = FB.religiousPatronageQuote(s,'tapa_sardar_public_giving_711',c.id,'donation',{fund:'learning',amount:1});
      const paid = FB.religiousPatronageApply(s,q);
      const reserve = !FB.religiousPatronageQuote(s,'tapa_sardar_public_giving_711',c.id,'donation',{fund:'learning',amount:2}).allowed;
      const player = !FB.religiousPatronageQuote(s,'tapa_sardar_public_giving_711',f.cid,'donation',{fund:'learning',amount:1}).allowed;
      FBDATA.religiousActivities = {};
      FBDATA.religiousPatronage = {tapa_sardar_public_giving_711:FBDATA.religiousPatronage.tapa_sardar_public_giving_711};
      s.player.war = null;
      Object.keys(s.realms).forEach(function (id) {
        s.realms[id].war = null;
        if (id !== rid && s.realms[id].treasury) {
          s.realms[id].treasury.gold = 0; s.realms[id].treasury.militaryAccrued = 0;
        }
      });
      let aiPaid = 0;
      for (let period = 2; period <= 2 + Math.ceil(Object.keys(s.realms).length / 16); period++) {
        s.turn = period * 90; aiPaid += FB.religiousActivityAI(s);
      }
      const aiRepeat = FB.religiousActivityAI(s);
      return {bounded:admissions > 0 && admissions <= 3,repeat:repeat,npc:npc,
        noPlayer:!s.localInstitutions.tapa_sardar_house_711.members[f.cid],paid:paid,
        aiPaid:aiPaid,aiRepeat:aiRepeat,
        spent:amount - FB.treasuryAvailable(s,rid),restricted:h.restrictedFunds.learning,reserve:reserve,
        player:player,gold:gold === s.player.gold,heads:heads === JSON.stringify(s.religiousHeads)};
    })).toEqual({bounded:true,repeat:0,npc:true,noPlayer:true,paid:true,aiPaid:1,aiRepeat:0,spent:2,restricted:2,
      reserve:true,player:true,gold:true,heads:true});
  });

function laySavedFacts() {
  const s = FB.state, f = buddhistFixture;
  return JSON.parse(JSON.stringify({start:s.start,gold:s.player.gold,piety:s.player.piety,
    people:[f.cid,f.spouse].map(function (id) {
      const c = s.chars[id]; return [c.religion,c.spouseId,c.skills.int,c.religiousActivity,c.religiousActivityHistory];
    }),heads:s.religiousHeads,institutions:s.localInstitutions,property:s.abbeys,
    communities:FB.countyCommunities(s,'ghazni')}));
}
for (const distribution of ['standard','CrazyGames']) {
  test(distribution + ' lay support restore after another bookmark preserves gifts and completes one lesson',
    async function ({page},testInfo) {
      await layHousehold(page,testInfo,distribution === 'CrazyGames');
      const saved = await page.evaluate(function () {
        const s = FB.state, f = buddhistFixture;
        foundLayHouse('tapa_sardar');
        layAdmit('tapa_sardar_house_711',f.spouse,'learner');
        FB.religiousPatronageApply(s,FB.religiousPatronageQuote(s,'tapa_sardar_giving_711',f.cid,
          'donation',{fund:'learning',amount:1}));
        if (!FB.religiousActivityApply(s,FB.religiousActivityQuote(s,'tapa_sardar_learning_711',f.spouse)))
          throw new Error('Expected prepaid lesson');
        return FB.save.serialize();
      });
      const before = await page.evaluate(laySavedFacts);
      await page.evaluate(function () { FB.state.turn += 2; FB.religiousActivityTick(FB.state); });
      const after = await page.evaluate(laySavedFacts);
      await page.evaluate(function () {
        return new Promise(function (resolve,reject) {
          FB.activateBookmark('1204',null,function (error) { if (error) reject(error); else resolve(); });
        });
      });
      await restoreBookmark(page,saved);
      expect(await page.evaluate(laySavedFacts)).toEqual(before);
      await page.evaluate(function () { FB.state.turn += 2; FB.religiousActivityTick(FB.state); });
      expect(await page.evaluate(laySavedFacts)).toEqual(after);
    });
}
