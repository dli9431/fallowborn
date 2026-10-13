'use strict';
const fs = require('fs');
const path = require('path');
const {test,expect} = require('../support/fixture');
const {openGame} = require('../support/game/navigation');
const {startDeterministicGame} = require('../support/game/start');
const {beginBookmark,restoreBookmark} = require('../support/game/bookmark-acceptance');
const {startHistoricalGame} = require('../support/game/historical-start');
const {releasedCatalogue} = require('../support/released-catalogue');
const {dependsOnRuntime} = require('../support/runtime-dependencies');

dependsOnRuntime(__filename, ['data/cultures.js','data/bookmarks.js','data/bookmark_476.js',
  'data/bookmark_476_outer.js','data/bookmark_476_wider_identities.js','data/bookmark_476_wider.js',
  'data/bookmark_493.js','data/bookmark_493_world.js','data/economy.js','data/technology.js','data/starts.js',
  'js/model.js','js/world.js','js/economy.js','js/religion.js','js/technology.js','js/population.js','js/authority.js',
  'js/politics.js','js/save.js','js/save_v4.js','js/mods.js','js/starts.js','js/main.js',
  'data/religious_institutions.js','data/religious_activities.js','data/political_institutions.js',
  'data/settlements.js','data/systems.js','data/distribution_crazygames.js','data/intrigue.js',
  'js/religious_institutions.js','js/religious_activities.js','js/institutions.js','js/treasury.js',
  'js/abbeys.js','js/settlement.js','js/justice.js','js/intrigue.js','js/travel.js','js/systems.js',
  'js/crazygames.js','js/progression.js','js/station.js']);

test('a fresh Sasanian court context preserves the released catalogue and separates role vocabulary',
  async function ({page},testInfo) {
    await openGame(page,testInfo);
    const fixture = JSON.parse(fs.readFileSync(path.join(__dirname,'../fixtures/released-catalogue.json'),'utf8'));
    expect((await page.evaluate(releasedCatalogue,fixture.selection)).hashes).toEqual(fixture.hashes);
    expect(await page.evaluate(function () {
      const before = JSON.stringify(FBDATA), rng = FB.getRngState(), uid = FB.getUidCounter();
      const id = 'zoroastrian_sasanian_476', root = FB.religionOf('zoroastrian',null);
      const fresh = FB.religionOf(id,null);
      return {errors:FB.validateReligionData(null),technology:FB.validateTechnologyData(true),
        ancestry:FB.faithIsA(id,'zoroastrian',null),relation:FB.faithRelation(null,id,'zoroastrian'),
        legal:[root.legalTradition,fresh.legalTradition],marriage:fresh.marriage,
        inheritedMarriage:JSON.stringify(fresh.marriage) === JSON.stringify(root.marriage),
        head:FB.faithOfficeId(id,null),routes:fresh.religiousPaths,
        roles:fresh.roles,clergyMarriage:fresh.clergyMarriage,
        review:FBDATA.techImpactReviews.features.iranian_local_faith_contexts.mode,
        pure:before === JSON.stringify(FBDATA) && rng === FB.getRngState() && uid === FB.getUidCounter()};
    })).toEqual({errors:[],technology:[],ancestry:true,relation:'in_fold',
      legal:['latin','sasanian_custom_476'],
      marriage:{spouseLimit:{m:1,f:1},divorce:{kind:'sunder',direct:true,gold:0,piety:15,
        prestige:5,cooldownDays:360},acceptedRelations:['same','in_fold'],kinship:{siblingRite:'xwedodah'}},
      inheritedMarriage:true,head:null,routes:null,
      roles:{monasticM:'Learner',monasticF:'Learner',priestM:'Fire custodian',priestF:'Fire custodian',
        teacher:'Herbed',fireCustodian:'Fire custodian'},clergyMarriage:true,review:'none',pure:true});
  });

test('dated court affiliation does not migrate provincial communities or the retained 476 opening',
  async function ({page},testInfo) {
    await openGame(page,testInfo);
    expect(await page.evaluate(function () {
      const before = JSON.stringify(FBDATA), rng = FB.getRngState(), uid = FB.getUidCounter();
      const id = 'zoroastrian_sasanian_476', dates = ['476','493','711','800','867','1066','1204'];
      const consumers = ['ruler','character','community','institution','start','story','conversion','project'];
      const openings = ['476','493'].map(function (date) {
        const b = FB.bookmark(date), realm = b.realms.find(function (r) { return r.id === 'sasanian_' + date; });
        return {errors:FB.validateBookmark(b),faith:realm.religion,
          noCountyMigration:b.provinces.every(function (p) {
            return p.religion !== id && !(p.communities || []).some(function (c) { return c.religion === id; });
          }),headless:!Object.prototype.hasOwnProperty.call(b.religiousHeads,id)};
      });
      const original = FB.bookmark('476','baseline'), wider = FB.bookmark('476');
      const b = JSON.parse(JSON.stringify(wider));
      b.provinces.find(function (p) { return !p.wasteland; }).religion = id;
      return {openings:openings,
        original:original.realms.find(function (r) { return r.id === 'sasanian_476'; }).religion,
        originalErrors:FB.validateBookmark(original),
        elite:wider.realms.find(function (r) { return r.id === 'sasanian_476'; }).governingIdentity.eliteFaithId,
        starts:[original,wider].map(function (world) {
          return ['peroz_476','peroz_sasanian_476'].map(function (scenario) { return world.starts.indexOf(scenario) >= 0; });
        }),
        boundaries:[475,476,493,494].map(function (year) {
          const dated = Object.assign({},wider,{date:{year:year,season:0,day:1}});
          return [FB.faithHistoricalAvailable(id,dated,'ruler'),
            FB.faithHistoricalAvailable('mesopotamian_traditional',dated,'community')];
        }),
        dated:dates.map(function (date) {
          return consumers.map(function (consumer) { return FB.faithHistoricalAvailable(id,FB.bookmark(date),consumer); });
        }),countyRejected:FB.validateBookmark(b).some(function (error) {
          return error.indexOf('unavailable for this dated consumer') >= 0;
        }),pure:before === JSON.stringify(FBDATA) && rng === FB.getRngState() && uid === FB.getUidCounter()};
    })).toEqual({openings:[{errors:[],faith:'zoroastrian_sasanian_476',noCountyMigration:true,headless:true},
      {errors:[],faith:'zoroastrian_sasanian_476',noCountyMigration:true,headless:true}],
      original:'zoroastrian',originalErrors:[],elite:'zoroastrian_sasanian_476',starts:[[true,false],[false,true]],
      boundaries:[[false,false],[true,true],[true,true],[false,false]],
      dated:[[true,true,false,true,true,false,false,false],[true,true,false,true,true,false,false,false],
        ...Array.from({length:5},function () { return Array(8).fill(false); })],countyRejected:true,pure:true});
  });

async function courtFacts(page,input) {
  return page.evaluate(function (input) {
    const s = FB.state, ruler = FB.realmRulerCharacter(s,input.realm);
    const relative = FB.authoredRoyalMemberSnapshot(s,input.realm,input.relative);
    return {start:s.start,faith:s.realms[input.realm].religion,ruler:ruler.religion,relative:relative.religion,
      counties:FB.campaignBookmark(s).provinces.filter(function (p) { return !p.wasteland; })
        .map(function (p) { return {id:p.id,communities:FB.countyCommunities(s,p.id)}; }),
      noRank:FB.religiousPathOf(s,ruler) === null,standings:FB.religiousStandings(s,ruler)};
  },input);
}

for (const opening of [{date:'476',relative:'balash'},{date:'493',relative:'jamasp'}]) {
  test('the ' + opening.date + ' court and separately authored kin retain their own affiliation through restore',
    async function ({page},testInfo) {
      await beginBookmark(page,testInfo,opening.date);
      const input = {realm:'sasanian_' + opening.date,relative:opening.relative};
      const before = await courtFacts(page,input);
      expect(before).toMatchObject({faith:'zoroastrian_sasanian_476',ruler:'zoroastrian_sasanian_476',
        relative:'zoroastrian',noRank:true,standings:[]});
      const saved = await page.evaluate(function () { return FB.save.serialize(); });
      await openGame(page,testInfo);
      await restoreBookmark(page,saved);
      expect(await courtFacts(page,input)).toEqual(before);
    });
}

test('the wider Peroz beginning adopts the same court profile without changing the retained beginning',
  async function ({page},testInfo) {
    await openGame(page,testInfo);
    await page.evaluate(function () {
      FB.bookmark('476').hidden = false;
      FBDATA.startScenarios.find(function (s) { return s.id === 'peroz_sasanian_476'; }).hidden = false;
    });
    const beginning = page.locator('#btn-choose-beginning');
    if (await beginning.isVisible()) await beginning.click();
    else await page.getByRole('button',{name:'New Game',exact:true}).click();
    await page.locator('#btn-bm-seed').click();
    await page.locator('#ng-seed').fill('IRANIANREVIEW-476-peroz_sasanian_476-baghdad-m-Peroz-standard-0-persian.zoroastrian_sasanian_476');
    await page.locator('#ng-seed').press('Enter');
    await expect(page.locator('#chargen:not(.hidden)')).toBeVisible();
    await page.getByRole('button',{name:'Begin Your Story',exact:true}).click();
    await page.getByRole('button',{name:'Begin',exact:true}).click();
    expect(await page.evaluate(function () {
      FB.game.setPaused(true);
      const s = FB.state, scenario = FBDATA.startScenarios.find(function (row) { return row.id === 'peroz_476'; });
      return {scenario:s.start.scenarioId,faith:s.chars[s.player.charId].religion,realm:s.realms.player.religion,
        original:scenario.startReligion,originalHidden:scenario.hidden,
        freshHidden:FBDATA.startScenarios.find(function (row) { return row.id === 'peroz_sasanian_476'; }).hidden};
    })).toEqual({scenario:'peroz_sasanian_476',faith:'zoroastrian_sasanian_476',realm:'zoroastrian_sasanian_476',
      original:'zoroastrian',originalHidden:true,freshHidden:false});
  });

test('Harran has bounded local worship without inherited monastic, sacred-war or raiding policy',
  async function ({page},testInfo) {
    await openGame(page,testInfo);
    expect(await page.evaluate(function () {
      const before = JSON.stringify(FBDATA), rng = FB.getRngState(), uid = FB.getUidCounter();
      const id = 'mesopotamian_traditional', local = FB.religionOf(id,null);
      const dates = ['476','493','711','800','867','1066','1204'];
      const mixes = ['476','493'].map(function (date) {
        return FB.bookmark(date).provinces.find(function (p) { return p.id === 'harran'; }).communities
          .map(function (c) { return [c.religion,c.populationShare0]; });
      });
      return {name:local.name,head:FB.faithOfficeId(id,null),legal:local.legalTradition,
        holyWar:local.holyWarTradition,raiding:FB.hasFaithRaidingTradition(id,null),routes:local.religiousPaths,
        spouseLimit:local.marriage.spouseLimit,siblingRite:local.marriage.kinship.siblingRite,
        clergyMarriage:local.clergyMarriage,roles:local.roles,words:local.words,
        gates:dates.map(function (date) { return FB.faithHistoricalAvailable(id,FB.bookmark(date),'community'); }),
        mixes:mixes,pure:before === JSON.stringify(FBDATA) && rng === FB.getRngState() && uid === FB.getUidCounter()};
    })).toEqual({name:'Harranian local worship',head:null,legal:'customary',holyWar:null,raiding:false,routes:null,
      spouseLimit:{m:1,f:1},siblingRite:null,clergyMarriage:true,
      roles:{monasticM:'Devotee',monasticF:'Devotee',priestM:'Ritual keeper',priestF:'Ritual keeper'},
      words:{deity:'the moon deity',cleric:'ritual keeper',temple:'shrine',landed:'Lord',partnership:'Trade partnership'},
      gates:[true,true,false,false,false,false,false],
      mixes:[[['miaphysite',5000],['mesopotamian_traditional',5000]],[['miaphysite',8000],['chalcedonian',2000]]],pure:true});
  });

test('unresolved local identities keep their separate early consumers and later scenery stays empty',
  async function ({page},testInfo) {
    await openGame(page,testInfo);
    expect(await page.evaluate(function () {
      const before = JSON.stringify(FBDATA), rng = FB.getRngState(), uid = FB.getUidCounter();
      function counties(date,faith) {
        return FB.bookmark(date).provinces.filter(function (p) {
          return !p.wasteland && (p.religion === faith || (p.communities || []).some(function (c) {
            return c.religion === faith;
          }));
        }).map(function (p) { return p.id; }).sort();
      }
      const scenery = FB.bookmark('493').provinces.find(function (p) { return p.id === 'lower_syr_darya'; });
      return {iranian:['476','493'].map(function (date) { return counties(date,'iranian_traditional_476'); }),
        sogdian:['476','493'].map(function (date) { return counties(date,'sogdian_traditional_476'); }),
        scenery:!!scenery.wasteland && !scenery.communities,
        noSpeculativeFaith:!FB.faithExists('manichaean',null) && !FB.faithExists('mazdakite',null),
        pure:before === JSON.stringify(FBDATA) && rng === FB.getRngState() && uid === FB.getUidCounter()};
    })).toEqual({iranian:[['balkh','bamiyan','ghazni','ghor','kabul','kandahar','panjgur','qusdar','termez','tiz'],
      ['balkh','bamiyan','ghazni','ghor','kabul','kandahar','kath_district','panjgur','qusdar','shebar_valley','termez','tiz']],
      sogdian:[['bukhara','chach','lower_syr_darya','nurata_foothills','samarkand','usrushana'],
        ['bukhara','chach','nurata_foothills','samarkand','usrushana']],scenery:true,noSpeculativeFaith:true,pure:true});
  });

test('released and generated Zoroastrian doctrine, mixed communities and an existing project survive restore',
  async function ({page},testInfo) {
    await openGame(page,testInfo);
    await startDeterministicGame(page);
    const source = await page.evaluate(function () {
      const s = FB.state, pid = s.player.provinceId;
      const id = FB.createFaith(s,{id:'e2e_saved_zoroastrian',name:'Saved Zoroastrian branch',parent:'zoroastrian',
        relationToParent:'in_fold',founderId:s.player.charId,
        properties:{marriage:{divorce:{piety:7,cooldownDays:120}}}});
      if (!id) throw new Error('Faith creation failed.');
      const transfer = FB.convertCountyCommunity(s,pid,{kind:'faith',target:id,amount:100});
      if (!transfer || transfer.count !== 100) throw new Error('Mixed community setup failed.');
      if (!FB.startCountyCommunityProject(s,pid,{kind:'faith',target:id,sponsor:'player',policy:'voluntary'}))
        throw new Error('Project creation failed.');
      s.population.counties[pid].communityProjects.faith.progress = 0.25;
      const before = {root:FB.religionOf('zoroastrian',s).properties,child:FB.religionOf(id,s).properties,
        lineage:FB.faithLineage(id,s),communities:FB.countyCommunities(s,pid),
        project:FB.countyCommunityProject(s,pid,'faith')};
      return {saved:FB.save.serialize(),before:before,pid:pid};
    });
    expect(source.before.root).toMatchObject({legalTradition:'latin',clergyMarriage:true,
      roles:{monasticM:'Herbad',monasticF:'Herbad',priestM:'Mobed',priestF:'Mobed'},
      marriage:{kinship:{siblingRite:'xwedodah'},divorce:{piety:15,cooldownDays:360}}});
    expect(source.before.child.marriage.divorce).toMatchObject({piety:7,cooldownDays:120});
    await openGame(page,testInfo);
    await restoreBookmark(page,source.saved);
    expect(await page.evaluate(function (input) {
      const s = FB.state, id = 'e2e_saved_zoroastrian';
      return {root:FB.religionOf('zoroastrian',s).properties,child:FB.religionOf(id,s).properties,
        lineage:FB.faithLineage(id,s),communities:FB.countyCommunities(s,input.pid),
        project:FB.countyCommunityProject(s,input.pid,'faith')};
    },source)).toEqual(source.before);
  });

/* The city binding below is a fictional contract fixture, not a temple placement. */
async function iranianServiceHousehold(page,testInfo,date,crazygames) {
  date = date || '493';
  await startHistoricalGame(page,testInfo,{bookmark:date,
    code:'FIRESERVICE-' + date + '-farmer_' + date + '-baghdad-f-Dena-established'},!!crazygames);
  await page.evaluate(function (date) {
    const s = FB.state, me = s.chars[s.player.charId];
    me.born = s.date.year - 30; me.health = 8; me.religion = 'zoroastrian_sasanian_476';
    me.sex = 'f'; me.skills.int = 3; me.role = 'farmer';
    s.player.profession = 'farmer'; FB.careerOf(s,me).profession = 'farmer';
    s.player.provinceId = 'baghdad'; s.player.gold = 20; s.player.piety = 0; s.player.prestige = 0;
    s.player.travel = null; s.player.war = null;
    s.player.flags.on_campaign = false; s.player.flags.with_liege_host = false;
    s.player.manor = null; s.player.landPlots = []; s.player.landPlotMigration = 1;
    FB.setPlayerTier(s,1,{stationFarewell:false});
    let spouse = FB.spouseOf(s,me);
    if (!spouse) {
      spouse = FB.makeCharacter(s,{name:'Household Partner',sex:'m',born:s.date.year - 30,
        religion:me.religion,culture:me.culture,role:'spouse',station:1,traits:[]});
      me.spouseId = spouse.id; spouse.spouseId = me.id; FB.touchFamily();
    }
    spouse.born = s.date.year - 30; spouse.health = 8; spouse.religion = me.religion;
    spouse.homeProvinceId = 'baghdad'; spouse.skills.int = 3;
    FB.careerOf(s,spouse).profession = 'farmer';
    const iid = 'sasanian_service_' + date;
    const defs = Object.assign({},FB.campaignBookmark(s).localInstitutions || {});
    defs[iid] = {city:'Fixture lay service group',kind:'ritual_community',
      provinceId:'baghdad',site:'baghdad_outer_476',religion:me.religion,culture:me.culture,
      profileId:'sasanian_lay_service',vacant:true,jurisdictionIds:['baghdad'],
      abbeyId:'e2e_sasanian_property_' + date};
    FBDATA.bookmarks[s.start.id].revisions[s.start.revision].localInstitutions = defs;
    s.localInstitutions[iid] = FB.religiousInstitutionOpeningRow(iid,defs[iid]);
    const patron = FB.settlementCountyHolder(s,'baghdad');
    if (!FB.authoritySetIdentity(s,patron,{eliteCultureId:'persian',eliteFaithId:me.religion,
      legalIdentityId:'customary',tolerance:'tolerant',taxation:'equal',justicePolicy:'personal'}))
      throw new Error('Fixture protected access failed');
    window.iranianFixture = {iid:iid,cid:me.id,spouse:spouse.id,date:date,
      giving:'sasanian_household_support_' + date,publicGiving:'sasanian_public_support_' + date};
    window.iranianAdmit = function (cid,role) {
      const q = FB.religiousInstitutionQuote(s,iid,{kind:'character',id:cid},'admit',{roleId:role});
      if (!q || !q.allowed || !FB.religiousInstitutionApply(s,q)) throw new Error('Admission: ' + (q && q.reason));
    };
    window.iranianFound = function () {
      s.player.landPlots = [{provinceId:'baghdad',settlement:0},{provinceId:'baghdad',settlement:0}];
      const q = FB.religiousPatronageQuote(s,iranianFixture.giving,me.id,'foundation',
        {land:{provinceId:'baghdad',settlement:0,count:2}});
      if (!q || !q.allowed || !FB.religiousPatronageApply(s,q)) throw new Error('Foundation: ' + (q && q.reason));
      return s.abbeys.houses.find(function (h) { return h.activityInstitutionId === iid; });
    };
    window.iranianGive = function (fund,amount) {
      const q = FB.religiousPatronageQuote(s,iranianFixture.giving,me.id,'donation',{fund:fund,amount:amount});
      if (!q || !q.allowed || !FB.religiousPatronageApply(s,q)) throw new Error('Giving: ' + (q && q.reason));
    };
  },date);
}

test('Iranian lay contracts validate without seeding premises, clergy or held identities',async function ({page},testInfo) {
  await openGame(page,testInfo);
  expect(await page.evaluate(function () {
    const before = JSON.stringify(FBDATA), rng = FB.getRngState(), uid = FB.getUidCounter();
    const p = FBDATA.religiousInstitutionProfiles.sasanian_lay_service;
    return {institutions:FB.religiousInstitutionCatalogFaults(FBDATA),
      activities:FB.religiousActivityCatalogFaults(FBDATA),technology:FB.validateTechnologyData(true),
      mods:FB.mods.validate({name:'Iranian lay service',religiousInstitutionProfiles:FBDATA.religiousInstitutionProfiles,
        religiousActivities:FBDATA.religiousActivities,religiousPatronage:FBDATA.religiousPatronage}),
      placed:['476','493','711','800','867','1066','1204'].some(function (id) {
        return Object.values(FB.bookmark(id).localInstitutions || {}).some(function (d) {
          return d.profileId === 'sasanian_lay_service';
        });
      }),roles:Object.keys(p.roles),noOffice:p.selection === null && !p.actions.includes('appoint'),
      reviews:['sasanian_household_observance','sasanian_lay_learning','sasanian_lay_service','sasanian_service_support']
        .map(function (id) { return FBDATA.techImpactReviews.features[id].mode; }),
      held:!FB.faithExists('manichaean',null) && !FB.faithExists('mazdakite',null),
      pure:before === JSON.stringify(FBDATA) && rng === FB.getRngState() && uid === FB.getUidCounter()};
  })).toEqual({institutions:[],activities:[],technology:[],mods:[],placed:false,roles:['learner','supporter'],
    noOffice:true,reviews:['none','none','none','none'],held:true,pure:true});
});

for (const date of ['476','493']) {
  test(date + ' poor married households can observe and study without office or property',async function ({page},testInfo) {
    await iranianServiceHousehold(page,testInfo,date);
    expect(await page.evaluate(function () {
      const s = FB.state, f = iranianFixture, me = s.chars[f.cid], spouse = s.chars[f.spouse];
      s.player.gold = 0;
      const heads = JSON.stringify(s.religiousHeads), houses = JSON.stringify(s.abbeys);
      const kin = [me.spouseId,spouse.spouseId], career = JSON.stringify(me.career);
      const start = FB.religiousActivityApply(s,FB.religiousActivityQuote(s,'zoroastrian_religious_learning',f.cid));
      const other = FB.religiousActivityApply(s,FB.religiousActivityQuote(s,'zoroastrian_household_fire_observance',f.spouse));
      s.turn++; FB.religiousActivityTick(s);
      const early = me.skills.int === 3 && !!me.religiousActivity;
      s.turn++; FB.religiousActivityTick(s);
      return {start:start,other:other,early:early,int:me.skills.int,piety:s.player.piety,gold:s.player.gold,
        repeat:!FB.religiousActivityQuote(s,'zoroastrian_religious_learning',f.cid).allowed,
        heads:heads === JSON.stringify(s.religiousHeads),houses:houses === JSON.stringify(s.abbeys),
        kin:JSON.stringify(kin) === JSON.stringify([me.spouseId,spouse.spouseId]),career:career === JSON.stringify(me.career),
        membership:Object.keys(s.localInstitutions[f.iid].members).length};
    })).toEqual({start:true,other:true,early:true,int:4,piety:1,gold:0,repeat:true,
      heads:true,houses:true,kin:true,career:true,membership:0});
  });
}

test('lay admission does not grant a teacher, custodian, priest or inherited career',async function ({page},testInfo) {
  await iranianServiceHousehold(page,testInfo);
  expect(await page.evaluate(function () {
    const s = FB.state, f = iranianFixture, me = s.chars[f.cid];
    const gold = s.player.gold, heads = JSON.stringify(s.religiousHeads), career = JSON.stringify(me.career);
    iranianAdmit(f.cid,'learner'); iranianAdmit(f.spouse,'supporter');
    const invalid = ['teacher','fire_custodian','priest'].map(function (role) {
      const q = FB.religiousInstitutionQuote(s,f.iid,{kind:'character',id:f.cid},'admit',{roleId:role});
      const before = JSON.stringify(s);
      return !!q && !q.allowed && !FB.religiousInstitutionApply(s,q) && before === JSON.stringify(s);
    });
    return {invalid:invalid,roles:[s.localInstitutions[f.iid].members[f.cid].roleId,
      s.localInstitutions[f.iid].members[f.spouse].roleId],gold:gold === s.player.gold,
      heads:heads === JSON.stringify(s.religiousHeads),career:career === JSON.stringify(me.career),
      marriage:FB.religiousMembershipUnmarried(s,me),priest:FB.religiousCareerReview(s,me,'priest',true).allowed,
      property:FB.religiousInstitutionSnapshot(s,f.iid).property};
  })).toEqual({invalid:[true,true,true],roles:['learner','supporter'],gold:true,heads:true,career:true,
    marriage:false,priest:false,property:null});
});

test('foundation conserves land and separate capital, treasury and restricted gifts',async function ({page},testInfo) {
  await iranianServiceHousehold(page,testInfo);
  expect(await page.evaluate(function () {
    const s = FB.state, f = iranianFixture, gold = s.player.gold, h = iranianFound();
    const me = s.chars[f.cid]; me.religion = 'jewish';
    iranianGive('learning',2); iranianGive('fire_care',1); iranianGive('relief',1);
    const before = JSON.stringify(s), rng = FB.getRngState(), uid = FB.getUidCounter();
    const overflow = FB.religiousPatronageQuote(s,f.giving,f.cid,'donation',{fund:'learning',amount:5});
    const duplicate = FB.religiousPatronageQuote(s,f.giving,f.cid,'foundation',
      {land:{provinceId:'baghdad',settlement:0,count:2}});
    return {spent:gold - s.player.gold,land:s.player.landPlots.length,plots:h.plots,
      capital:h.capital,treasury:h.treasury,spentSupplies:h.activitySpent,holder:h.holderId,
      funds:h.restrictedFunds,overflow:!overflow.allowed,duplicate:!duplicate.allowed,
      noMembership:!s.localInstitutions[f.iid].members[f.cid],faith:me.religion,
      pure:before === JSON.stringify(s) && rng === FB.getRngState() && uid === FB.getUidCounter()};
  })).toEqual({spent:8,land:0,plots:[{provinceId:'baghdad',settlement:0,count:2}],capital:2,treasury:1,
    spentSupplies:1,holder:null,funds:{learning:2,fire_care:1,relief:1},overflow:true,duplicate:true,
    noMembership:true,faith:'jewish',pure:true});
});

test('local services consume the matching fund once and share household reward guards',async function ({page},testInfo) {
  await iranianServiceHousehold(page,testInfo);
  expect(await page.evaluate(function () {
    const s = FB.state, f = iranianFixture, h = iranianFound();
    iranianAdmit(f.cid,'learner'); iranianAdmit(f.spouse,'supporter');
    iranianGive('learning',1); iranianGive('fire_care',1); iranianGive('relief',1);
    const wrongRole = !FB.religiousActivityQuote(s,'sasanian_learning_493',f.spouse).allowed;
    const learning = FB.religiousActivityApply(s,FB.religiousActivityQuote(s,'sasanian_learning_493',f.cid));
    const fire = FB.religiousActivityApply(s,FB.religiousActivityQuote(s,'sasanian_fire_care_493',f.spouse));
    s.turn++; FB.religiousActivityTick(s);
    const early = h.restrictedFunds.learning === 1 && h.restrictedFunds.fire_care === 0;
    s.turn++; FB.religiousActivityTick(s);
    const guards = !FB.religiousActivityQuote(s,'zoroastrian_religious_learning',f.cid).allowed &&
      !FB.religiousActivityQuote(s,'zoroastrian_household_fire_observance',f.spouse).allowed;
    const relief = FB.religiousActivityApply(s,FB.religiousActivityQuote(s,'sasanian_relief_493',f.spouse));
    s.turn++; FB.religiousActivityTick(s);
    return {wrongRole:wrongRole,learning:learning,fire:fire,early:early,guards:guards,relief:relief,
      funds:h.restrictedFunds,spent:h.activitySpent,int:s.chars[f.cid].skills.int,piety:s.player.piety,
      noOffice:FB.religiousInstitutionSnapshot(s,f.iid).holderId === null};
  })).toEqual({wrongRole:true,learning:true,fire:true,early:true,guards:true,relief:true,
    funds:{learning:0,fire_care:0,relief:0},spent:4,int:4,piety:2,noOffice:true});
});

test('changed local access interrupts service without consuming its gift or rewriting communities',async function ({page},testInfo) {
  await iranianServiceHousehold(page,testInfo);
  expect(await page.evaluate(function () {
    const s = FB.state, f = iranianFixture, h = iranianFound();
    iranianAdmit(f.cid,'learner'); iranianGive('learning',1);
    const started = FB.religiousActivityApply(s,FB.religiousActivityQuote(s,'sasanian_learning_493',f.cid));
    const property = JSON.stringify(h), communities = JSON.stringify(FB.countyCommunities(s,'baghdad'));
    const patron = FB.settlementCountyHolder(s,'baghdad');
    if (!FB.authoritySetIdentity(s,patron,{eliteCultureId:'persian',eliteFaithId:'zoroastrian_sasanian_476',
      legalIdentityId:'customary',tolerance:'persecution',taxation:'equal',justicePolicy:'personal'}))
      throw new Error('Fixture restriction failed');
    s.turn += 2; FB.religiousActivityTick(s);
    const household = FB.religiousActivityApply(s,FB.religiousActivityQuote(s,'zoroastrian_household_fire_observance',f.cid));
    s.turn++; FB.religiousActivityTick(s);
    return {started:started,interrupted:!s.chars[f.cid].religiousActivity,
      reward:!!(s.chars[f.cid].religiousActivityHistory || {}).zoroastrian_learning_done,
      household:household,piety:s.player.piety,int:s.chars[f.cid].skills.int,
      property:property === JSON.stringify(h),communities:communities === JSON.stringify(FB.countyCommunities(s,'baghdad')),
      member:s.localInstitutions[f.iid].members[f.cid].status};
  })).toEqual({started:true,interrupted:true,reward:false,household:true,piety:1,int:3,
    property:true,communities:true,member:'active'});
});

test('withdrawal interrupts learning and never returns institutional assets to the donor',async function ({page},testInfo) {
  await iranianServiceHousehold(page,testInfo);
  expect(await page.evaluate(function () {
    const s = FB.state, f = iranianFixture, h = iranianFound();
    iranianAdmit(f.cid,'learner'); iranianGive('learning',1);
    const started = FB.religiousActivityApply(s,FB.religiousActivityQuote(s,'sasanian_learning_493',f.cid));
    const property = JSON.stringify(h), gold = s.player.gold;
    const withdrawn = FB.religiousInstitutionApply(s,FB.religiousInstitutionQuote(s,f.iid,
      {kind:'character',id:f.cid},'withdraw',{}));
    s.turn += 2; FB.religiousActivityTick(s);
    return {started:started,withdrawn:withdrawn,interrupted:!s.chars[f.cid].religiousActivity,
      reward:!!(s.chars[f.cid].religiousActivityHistory || {}).zoroastrian_learning_done,
      property:property === JSON.stringify(h),gold:gold === s.player.gold,land:s.player.landPlots.length,
      holder:h.holderId};
  })).toEqual({started:true,withdrawn:true,interrupted:true,reward:false,property:true,gold:true,land:0,holder:null});
});

test('date, revision, faith and stale reviews reject without side effects',async function ({page},testInfo) {
  await iranianServiceHousehold(page,testInfo);
  expect(await page.evaluate(function () {
    const s = FB.state, f = iranianFixture, me = s.chars[f.cid];
    const start = s.start, year = s.date.year, faith = me.religion, born = me.born;
    const before = JSON.stringify(s), rng = FB.getRngState(), uid = FB.getUidCounter();
    const allowed = [
      ['476','wider_v2',476,faith],['493','world_v2',493,faith],
      ['476','baseline',476,faith],['493','world_v2',494,faith],
      ['711','terrain_v2_governments_v2',711,faith],['493','world_v2',493,'zoroastrian'],
      ['493','world_v2',493,'iranian_traditional_476'],['493','world_v2',493,'sogdian_traditional_476']
    ].map(function (scope) {
      s.start = Object.assign({},start,{id:scope[0],revision:scope[1]}); s.date.year = scope[2]; me.born = scope[2] - 30; me.religion = scope[3];
      return FB.religiousActivityQuote(s,'zoroastrian_household_fire_observance',f.cid).allowed;
    });
    s.start = start; s.date.year = year; me.born = born; me.religion = faith;
    const pure = before === JSON.stringify(s) && rng === FB.getRngState() && uid === FB.getUidCounter();
    iranianFound();
    const quote = FB.religiousPatronageQuote(s,f.giving,f.cid,'donation',{fund:'learning',amount:1});
    s.player.gold--;
    const changed = JSON.stringify(s), stale = !FB.religiousPatronageApply(s,quote);
    return {allowed:allowed,pure:pure,stale:stale,unchanged:changed === JSON.stringify(s)};
  })).toEqual({allowed:[true,true,false,false,false,false,false,false],pure:true,stale:true,unchanged:true});
});

test('public patronage spends the actual NPC account and bounded AI respects its reserve',async function ({page},testInfo) {
  await iranianServiceHousehold(page,testInfo);
  expect(await page.evaluate(function () {
    const s = FB.state, f = iranianFixture, h = iranianFound();
    FB.treasuryInitialize(s); s.treasuryAccounting.mode = 'active';
    const rid = FB.settlementCountyHolder(s,'baghdad'), c = FB.realmRulerCharacterSnapshot(s,rid);
    if (!c || !FB.treasuryCounterparty(s,rid)) throw new Error('Expected public account');
    c.homeProvinceId = 'baghdad'; c.health = 8; c.born = s.date.year - 30;
    s.realms[rid].treasury.gold = 4; s.realms[rid].treasury.militaryAccrued = 0;
    const gold = s.player.gold, amount = FB.treasuryAvailable(s,rid);
    const paid = FB.religiousPatronageApply(s,FB.religiousPatronageQuote(s,f.publicGiving,c.id,
      'donation',{fund:'learning',amount:1}));
    const reserve = !FB.religiousPatronageQuote(s,f.publicGiving,c.id,'donation',{fund:'learning',amount:2}).allowed;
    const player = !FB.religiousPatronageQuote(s,f.publicGiving,f.cid,'donation',{fund:'learning',amount:1}).allowed;
    FBDATA.religiousActivities = {};
    FBDATA.religiousPatronage = {[f.publicGiving]:FBDATA.religiousPatronage[f.publicGiving]};
    Object.keys(s.realms).forEach(function (id) {
      s.realms[id].war = null;
      if (id !== rid && s.realms[id].treasury) {
        s.realms[id].treasury.gold = 0; s.realms[id].treasury.militaryAccrued = 0;
      }
    });
    let aiPaid = 0;
    for (let period = 1; period <= 1 + Math.ceil(Object.keys(s.realms).length / 16); period++) {
      s.turn = period * 90; aiPaid += FB.religiousActivityAI(s);
    }
    const repeat = FB.religiousActivityAI(s);
    return {paid:paid,reserve:reserve,player:player,aiPaid:aiPaid,repeat:repeat,
      spent:amount - FB.treasuryAvailable(s,rid),gold:gold === s.player.gold,
      learning:h.restrictedFunds.learning,fire:h.restrictedFunds.fire_care};
  })).toEqual({paid:true,reserve:true,player:true,aiPaid:1,repeat:0,spent:2,gold:true,learning:1,fire:1});
});

function iranianSavedFacts() {
  const s = FB.state, f = iranianFixture;
  return JSON.parse(JSON.stringify({start:s.start,gold:s.player.gold,piety:s.player.piety,
    people:[f.cid,f.spouse].map(function (cid) {
      const c = s.chars[cid]; return [c.religion,c.spouseId,c.skills.int,c.religiousActivity,c.religiousActivityHistory];
    }),heads:s.religiousHeads,institutions:s.localInstitutions,property:s.abbeys,
    communities:FB.countyCommunities(s,'baghdad')}));
}
for (const distribution of ['standard','CrazyGames']) {
  test(distribution + ' restores Iranian gifts and completes a funded lesson once',async function ({page},testInfo) {
    await iranianServiceHousehold(page,testInfo,'493',distribution === 'CrazyGames');
    const saved = await page.evaluate(function () {
      const s = FB.state, f = iranianFixture;
      iranianFound(); iranianAdmit(f.spouse,'learner'); iranianGive('learning',1);
      if (!FB.religiousActivityApply(s,FB.religiousActivityQuote(s,'sasanian_learning_493',f.spouse)))
        throw new Error('Expected funded lesson');
      return FB.save.serialize();
    });
    const before = await page.evaluate(iranianSavedFacts);
    await page.evaluate(function () { FB.state.turn += 2; FB.religiousActivityTick(FB.state); });
    const after = await page.evaluate(iranianSavedFacts);
    await page.evaluate(function () {
      return new Promise(function (resolve,reject) {
        FB.activateBookmark('1204',null,function (error) { if (error) reject(error); else resolve(); });
      });
    });
    await restoreBookmark(page,saved);
    expect(await page.evaluate(iranianSavedFacts)).toEqual(before);
    await page.evaluate(function () { FB.state.turn += 2; FB.religiousActivityTick(FB.state); });
    expect(await page.evaluate(iranianSavedFacts)).toEqual(after);
  });
}


test('unplaced Iranian services and gifts fail closed without creating recipients',async function ({page},testInfo) {
  await beginBookmark(page,testInfo,'493');
  expect(await page.evaluate(function () {
    const s = FB.state, me = s.chars[s.player.charId];
    me.religion = 'zoroastrian_sasanian_476'; me.born = s.date.year - 30;
    const before = JSON.stringify(s), rng = FB.getRngState(), uid = FB.getUidCounter();
    const services = ['learning','fire_care','relief'].map(function (kind) {
      const q = FB.religiousActivityQuote(s,'sasanian_' + kind + '_493',me.id);
      return !!q && !q.allowed && !FB.religiousActivityApply(s,q);
    });
    const gift = FB.religiousPatronageQuote(s,'sasanian_household_support_493',me.id,
      'donation',{fund:'learning',amount:1});
    return {services:services,gift:!!gift && !gift.allowed && !FB.religiousPatronageApply(s,gift),
      recipient:FB.religiousInstitutionSnapshot(s,'sasanian_service_493'),
      pure:before === JSON.stringify(s) && rng === FB.getRngState() && uid === FB.getUidCounter()};
  })).toEqual({services:[true,true,true],gift:true,recipient:null,pure:true});
});
