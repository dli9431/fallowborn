'use strict';
const fs = require('fs');
const path = require('path');
const {test,expect} = require('../support/fixture');
const {openGame} = require('../support/game/navigation');
const {startDeterministicGame} = require('../support/game/start');
const {beginBookmark,restoreBookmark} = require('../support/game/bookmark-acceptance');
const {releasedCatalogue} = require('../support/released-catalogue');
const {dependsOnRuntime} = require('../support/runtime-dependencies');

dependsOnRuntime(__filename, ['data/cultures.js','data/bookmarks.js','data/bookmark_476.js',
  'data/bookmark_476_outer.js','data/bookmark_476_wider_identities.js','data/bookmark_476_wider.js',
  'data/bookmark_493.js','data/bookmark_493_world.js','data/economy.js','data/technology.js','data/starts.js',
  'js/model.js','js/world.js','js/economy.js','js/religion.js','js/technology.js','js/population.js','js/authority.js',
  'js/politics.js','js/save.js','js/save_v4.js','js/mods.js','js/starts.js','js/main.js']);

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
      dated:[[true,true,false,false,true,false,false,false],[true,true,false,false,true,false,false,false],
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
