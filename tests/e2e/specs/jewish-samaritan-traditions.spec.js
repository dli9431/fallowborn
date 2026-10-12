'use strict';
const fs = require('fs');
const path = require('path');
const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { startDeterministicGame } = require('../support/game/start');
const { restoreBookmark } = require('../support/game/bookmark-acceptance');
const { startHistoricalGame } = require('../support/game/historical-start');
const { releasedCatalogue } = require('../support/released-catalogue');
const { dependsOnRuntime } = require('../support/runtime-dependencies');

dependsOnRuntime(__filename, [
  'data/cultures.js', 'data/economy.js', 'data/technology.js',
  'data/bookmarks.js', 'data/bookmark_476.js', 'data/bookmark_476_wider.js',
  'data/bookmark_493_world.js', 'data/bookmark_711.js', 'data/bookmark_800.js',
  'data/bookmark_1066_inhabited.js', 'data/bookmark_1204_terrain.js',
  'js/model.js', 'js/economy.js', 'js/events.js', 'js/actions.js',
  'js/population.js', 'js/world.js', 'js/mods.js', 'js/systems.js',
  'js/save.js', 'js/save_v4.js', 'js/technology.js', 'js/ui_modals.js',
  'index.html', 'data/religious_institutions.js', 'data/religious_activities.js',
  'data/political_institutions.js', 'data/systems.js', 'data/actions.js',
  'data/distribution_crazygames.js', 'js/religious_institutions.js',
  'js/religious_activities.js', 'js/institutions.js', 'js/authority.js',
  'js/treasury.js', 'js/abbeys.js', 'js/religion.js', 'js/settlement.js',
  'js/justice.js', 'js/intrigue.js', 'js/travel.js', 'js/main.js',
  'js/crazygames.js', 'js/politics.js', 'js/progression.js', 'js/station.js',
  'js/ui_religious_institutions.js', 'js/ui_religious_activities.js', 'js/ui_misc.js'
]);

async function household(page) {
  await page.evaluate(function () {
    FB.game.setPaused(true);
    const s = FB.state, me = s.chars[s.player.charId];
    me.born = s.date.year - 30;
    me.religion = 'jewish';
    s.player.gold = 1000; s.player.piety = 1000; s.player.prestige = 1000;
    let spouse = FB.spouseOf(s, me);
    if (!spouse) {
      spouse = FB.makeCharacter(s, {name:'Communal Spouse',
        sex:me.sex === 'f' ? 'm' : 'f', culture:me.culture, religion:'jewish',
        born:s.date.year - 30, role:'spouse', station:1, traits:[]});
      me.spouseId = spouse.id; spouse.spouseId = me.id;
      FB.touchFamily();
    }
    spouse.religion = 'jewish';
    FB.careerOf(s, me); FB.careerOf(s, spouse);
  });
}

test('additive profiles preserve the released catalogue and validate through JSON mods',
  async function ({ page }, testInfo) {
    await openGame(page, testInfo);
    const fixture = JSON.parse(fs.readFileSync(
      path.join(__dirname, '../fixtures/released-catalogue.json'), 'utf8'));
    expect((await page.evaluate(releasedCatalogue, fixture.selection)).hashes).toEqual(fixture.hashes);
    expect(await page.evaluate(function () {
      const before = JSON.stringify(FBDATA), rng = FB.getRngState(), uid = FB.getUidCounter();
      const definitions = {}, paths = {};
      ['rabbanite','karaite','samaritan'].forEach(function (id) {
        definitions[id] = JSON.parse(JSON.stringify(FBDATA.religions[id]));
        paths[id + '_lay'] = JSON.parse(JSON.stringify(FBDATA.religiousPaths[id + '_lay']));
      });
      return {errors:FB.validateReligionData(null),
        modErrors:FB.mods.validate({name:'Communal profile declarations',
          religions:definitions, religiousPaths:paths}),
        pure:before === JSON.stringify(FBDATA) && rng === FB.getRngState() && uid === FB.getUidCounter()};
    })).toEqual({errors:[], modErrors:[], pure:true});
  });

test('institution-only rabbinic scope and independent dated identity scopes reject unreviewed consumers',
  async function ({ page }, testInfo) {
    await openGame(page, testInfo);
    expect(await page.evaluate(function () {
      const dates = ['476','493','711','800','867','1066','1204'];
      const before = JSON.stringify(FBDATA), rng = FB.getRngState(), uid = FB.getUidCounter();
      function scope(id, consumer) {
        return dates.map(function (date) {
          return FB.faithHistoricalAvailable(id, FB.bookmark(date), consumer);
        });
      }
      const excluded = ['start','conversion','project','ruler','story'].every(function (consumer) {
        return ['rabbanite','karaite','samaritan'].every(function (id) {
          return !FB.faithHistoricalAvailable(id, FB.bookmark('1204'), consumer);
        });
      });
      return {rabbinicInstitutions:scope('rabbanite','institution'),
        rabbinicHouseholds:scope('rabbanite','character'),
        rabbinicCommunities:scope('rabbanite','community'),
        karaite:scope('karaite','community'), samaritan:scope('samaritan','community'),
        excluded:excluded,
        pure:before === JSON.stringify(FBDATA) && rng === FB.getRngState() && uid === FB.getUidCounter()};
    })).toEqual({rabbinicInstitutions:[true,true,true,true,true,true,true],
      rabbinicHouseholds:[false,false,false,false,false,false,false],
      rabbinicCommunities:[false,false,false,false,false,false,false],
      karaite:[false,false,false,false,false,true,true],
      samaritan:[true,true,true,true,false,false,true], excluded:true, pure:true});
  });

test('Samaritan identity has no rabbinic ancestry or central office and cannot certify specialists',
  async function ({ page }, testInfo) {
    await openGame(page, testInfo);
    expect(await page.evaluate(function () {
      const sam = FB.religionOf('samaritan', null), rab = FB.religionOf('rabbanite', null);
      const kar = FB.religionOf('karaite', null);
      return {samaritanLineage:FB.faithLineage('samaritan', null),
        rabbinicLineage:FB.faithLineage('rabbanite', null),
        karaiteLineage:FB.faithLineage('karaite', null),
        independent:!FB.faithIsA('samaritan','jewish',null),
        headless:[sam,rab,kar].every(function (r) {
          return r.head === null && r.holyWarTradition === null && FB.faithOfficeId(r.id,null) === null;
        }),
        noProfessionAdmission:[sam,rab,kar].every(function (r) {
          return Object.keys(r.religiousPaths.professions).length === 0;
        }),
        roles:[sam.roles.priestM, rab.roles.priestM, kar.roles.priestM],
        rabbinicRoles:[rab.roles.teacher, rab.roles.rabbi, rab.roles.judge],
        priestLabel:sam.roles.samaritan_priest};
    })).toEqual({samaritanLineage:['samaritan'], rabbinicLineage:['rabbanite','jewish'],
      karaiteLineage:['karaite','jewish'], independent:true, headless:true,
      noProfessionAdmission:true,
      roles:['Community Representative','Community Representative','Community Representative'],
      rabbinicRoles:['Teacher','Rabbi','Communal Judge'], priestLabel:'Priest'});
  });

test('ordinary participation works for poor households of either sex without profession or office promotion',
  async function ({ page }, testInfo) {
    await openGame(page, testInfo);
    await startDeterministicGame(page);
    await household(page);
    expect(await page.evaluate(function () {
      const s = FB.state, me = s.chars[s.player.charId];
      s.player.gold = 0; s.player.piety = 0; s.player.prestige = 0;
      const originalFaith = me.religion, originalSex = me.sex;
      const results = [];
      ['rabbanite','karaite','samaritan'].forEach(function (id) {
        ['m','f'].forEach(function (sex) {
          me.religion = id; me.sex = sex;
          const before = JSON.stringify(s), rng = FB.getRngState(), uid = FB.getUidCounter();
          const standing = FB.religiousPathOf(s, me);
          const advance = FB.religiousAdvance(s, me);
          const applied = FB.takeReligiousStep(s, me);
          results.push({id:standing.id, kind:standing.kind, rank:standing.step.id,
            next:standing.next || null, advance:advance, applied:applied,
            pure:before === JSON.stringify(s) && rng === FB.getRngState() && uid === FB.getUidCounter()});
        });
      });
      me.religion = originalFaith; me.sex = originalSex;
      return {results:results, technology:FBDATA.techImpactReviews.features.jewish_samaritan_lay_profiles.mode};
    })).toEqual({results:['rabbanite','rabbanite','karaite','karaite','samaritan','samaritan'].map(function (id) {
      return {id:id + '_lay', kind:'lay', rank:'participant', next:null,
        advance:null, applied:false, pure:true};
    }), technology:'none'});
  });

test('new profiles withhold dissolution without changing legacy get or household property',
  async function ({ page }, testInfo) {
    await openGame(page, testInfo);
    await startDeterministicGame(page);
    await household(page);
    expect(await page.evaluate(function () {
      const s = FB.state, me = s.chars[s.player.charId], spouse = FB.spouseOf(s, me);
      const legacy = FB.marriageEndStatus(s, spouse);
      const results = ['rabbanite','karaite','samaritan'].map(function (id) {
        me.religion = id;
        const before = JSON.stringify(s), rng = FB.getRngState(), uid = FB.getUidCounter();
        const quote = FB.marriageEndStatus(s, spouse);
        const trigger = FB.checkTrigger(s, {marriageEndReady:true}, {});
        const initiated = FB.checkTrigger(s, {marriageEndReady:true}, {marriageEndInitiated:true});
        return {ready:quote.ready, reason:quote.reason,
          trigger:trigger, initiated:initiated,
          pure:before === JSON.stringify(s) && rng === FB.getRngState() && uid === FB.getUidCounter()};
      });
      me.religion = 'jewish';
      return {legacy:{ready:legacy.ready, kind:legacy.kind, direct:legacy.direct}, results:results};
    })).toEqual({legacy:{ready:true, kind:'get', direct:true}, results:[1,2,3].map(function () {
      return {ready:false, reason:'This community requires a locally recognized marriage review.',
        trigger:false, initiated:false, pure:true};
    })});
  });

test('a held petition remains blocked after initiation and malformed policy values reject atomically',
  async function ({ page }, testInfo) {
    await openGame(page, testInfo);
    await startDeterministicGame(page);
    await household(page);
    expect(await page.evaluate(function () {
      const s = FB.state, me = s.chars[s.player.charId], spouse = FB.spouseOf(s, me);
      const id = FB.createFaith(s, {id:'e2e_local_review', name:'Local review', parent:'jewish',
        relationToParent:'in_fold', properties:{marriage:{divorce:{direct:false, enabled:false}}}});
      me.religion = id;
      const before = JSON.stringify(s), rng = FB.getRngState(), uid = FB.getUidCounter();
      const quote = FB.marriageEndStatus(s, spouse);
      const initiated = FB.checkTrigger(s, {marriageEndReady:true}, {marriageEndInitiated:true});
      const invalid = FB.createFaith(s, {id:'e2e_bad_review', name:'Bad review', parent:'jewish',
        properties:{marriage:{divorce:{enabled:'no'}}}});
      const modErrors = FB.mods.validate({name:'Bad local policy', religions:{
        e2e_bad_mod_review:{name:'Bad local policy',parent:'jewish',
          properties:{marriage:{divorce:{enabled:0}}}}
      }});
      return {id:id, ready:quote.ready, direct:quote.direct, initiated:initiated,
        invalid:invalid, invalidMod:modErrors.some(function (e) {
          return e.indexOf('marriage.divorce.enabled must be boolean') >= 0;
        }), pure:before === JSON.stringify(s) && rng === FB.getRngState() && uid === FB.getUidCounter()};
    })).toEqual({id:'e2e_local_review', ready:false, direct:false, initiated:false,
      invalid:null, invalidMod:true, pure:true});
  });

test('profile registration adds no opening population and new conversion projects reject without mutation',
  async function ({ page }, testInfo) {
    await openGame(page, testInfo);
    expect(await page.evaluate(function () {
      const ids = ['rabbanite','karaite','samaritan'], assigned = [];
      function scan(value) {
        if (!value || typeof value !== 'object') return;
        Object.keys(value).forEach(function (key) {
          if (['religion','faithId','startReligion','eliteFaithId'].indexOf(key) >= 0 &&
              ids.indexOf(value[key]) >= 0) assigned.push(value[key]);
          scan(value[key]);
        });
      }
      const dates = ['476','493','711','800','867','1066','1204'];
      dates.forEach(function (id) { scan(FB.bookmark(id)); });
      return {assigned:assigned, errors:dates.map(function (id) { return FB.validateBookmark(FB.bookmark(id)); })};
    })).toEqual({assigned:[], errors:[[],[],[],[],[],[],[]]});
    await startDeterministicGame(page);
    expect(await page.evaluate(function () {
      FB.game.setPaused(true);
      const s = FB.state, before = JSON.stringify(s), rng = FB.getRngState(), uid = FB.getUidCounter();
      const results = ['rabbanite','karaite','samaritan'].map(function (id) {
        return FB.startCountyCommunityProject(s, s.player.provinceId,
          {kind:'faith', target:id, sponsor:'player', policy:'voluntary'});
      });
      return {results:results,
        pure:before === JSON.stringify(s) && rng === FB.getRngState() && uid === FB.getUidCounter()};
    })).toEqual({results:[null,null,null], pure:true});
  });

test('legacy Jewish households, generated ancestry and an ongoing project survive restore without reclassification',
  async function ({ page }, testInfo) {
    await openGame(page, testInfo);
    await startDeterministicGame(page);
    await household(page);
    const saved = await page.evaluate(function () {
      const s = FB.state, me = s.chars[s.player.charId], spouse = FB.spouseOf(s, me);
      const id = FB.createFaith(s, {id:'e2e_jewish_descendant', name:'Household tradition',
        parent:'jewish', relationToParent:'in_fold'});
      const child = FB.makeCharacter(s, {name:'Communal Child', sex:'m', culture:me.culture,
        religion:id, born:s.date.year - 8, dyn:me.dyn, role:'child', traits:[],
        motherId:me.sex === 'f' ? me.id : spouse.id,
        fatherId:me.sex === 'm' ? me.id : spouse.id});
      me.childrenIds.push(child.id); spouse.childrenIds.push(child.id); FB.touchFamily();
      const pid = s.player.provinceId;
      if (!FB.startCountyCommunityProject(s,pid,
        {kind:'faith',target:'jewish',sponsor:'player',policy:'voluntary'})) {
        throw new Error('Legacy project creation failed.');
      }
      return {text:FB.save.serialize(), ids:[me.id,spouse.id,child.id], pid:pid,
        expected:{faiths:[me.religion,spouse.religion,child.religion],
          links:[me.spouseId,spouse.spouseId,child.fatherId,child.motherId],
          lineage:FB.faithLineage(id,s),
          project:FB.countyCommunityProject(s,pid,'faith'),
          communities:FB.countyCommunities(s,pid),
          legacyRules:{marriage:FB.marriageDoctrine('jewish',s),
            clergyMarriage:FB.religionOf('jewish',s).clergyMarriage,
            monastic:FB.religionOf('jewish',s).roles.monasticM}}};
    });
    await openGame(page, testInfo);
    await restoreBookmark(page, saved.text);
    expect(await page.evaluate(function (input) {
      const s = FB.state, people = input.ids.map(function (id) { return s.chars[id]; });
      return {faiths:people.map(function (c) { return c.religion; }),
        links:[people[0].spouseId,people[1].spouseId,people[2].fatherId,people[2].motherId],
        lineage:FB.faithLineage(people[2].religion,s),
        project:FB.countyCommunityProject(s,input.pid,'faith'),
        communities:FB.countyCommunities(s,input.pid),
        legacyRules:{marriage:FB.marriageDoctrine('jewish',s),
          clergyMarriage:FB.religionOf('jewish',s).clergyMarriage,
          monastic:FB.religionOf('jewish',s).roles.monasticM}};
    }, {ids:saved.ids,pid:saved.pid})).toEqual(saved.expected);
  });

/* These placements are fixtures at the test household's home. F09 owns
   historical site bindings and independently accepted opening revisions. */
async function communalHousehold(page, testInfo, crazygames) {
  await startHistoricalGame(page, testInfo, {
    bookmark:'476', code:'COMMUNAL-476-curialis_476-ravenna-m-Marcus-established-0-roman.nicene'
  }, !!crazygames);
  await household(page);
  await page.evaluate(function () {
    const s = FB.state, me = s.chars[s.player.charId], spouse = FB.spouseOf(s, me);
    const pid = s.player.provinceId, site = FB.world.sitesByProv[pid].list[0].site;
    me.health = 8; me.skills.int = 3; me.role = 'farmer';
    s.player.profession = 'farmer'; s.player.gold = 2; s.player.piety = 0;
    delete s.player.professionBack;
    FB.careerOf(s,me).profession = 'farmer';
    s.player.prestige = 0; s.player.travel = null; s.player.flags.on_campaign = false;
    s.player.flags.with_liege_host = false;
    s.player.manor = null; s.player.landPlots = []; s.player.landPlotMigration = 1;
    spouse.homeProvinceId = pid; spouse.born = s.date.year - 30; spouse.health = 8;
    spouse.role = 'farmer'; FB.careerOf(s,spouse).profession = 'farmer';
    FB.setPlayerTier(s, 1, {stationFarewell:false});
    const defs = Object.assign({}, FB.campaignBookmark(s).localInstitutions || {});
    defs.jewish_meso_study_circle_476 = {city:'Fixture study circle', kind:'school',
      provinceId:pid, site:site, religion:'jewish', culture:me.culture,
      profileId:'jewish_study_circle_early', vacant:true, jurisdictionIds:[pid]};
    defs.jewish_sardis_congregation_476 = {city:'Fixture synagogue congregation', kind:'congregation',
      provinceId:pid, site:site, religion:'jewish', culture:me.culture,
      profileId:'jewish_sardis_congregation', vacant:true, jurisdictionIds:[pid],
      abbeyId:'e2e_synagogue_property'};
    defs.e2e_samaritan_congregation = {city:'Fixture Samaritan congregation', kind:'congregation',
      provinceId:pid, site:site, religion:'samaritan', culture:me.culture,
      profileId:'samaritan_lay_congregation', vacant:true, jurisdictionIds:[pid]};
    FBDATA.bookmarks[s.start.id].revisions[s.start.revision].localInstitutions = defs;
    s.localInstitutions = s.localInstitutions || {};
    ['jewish_meso_study_circle_476','jewish_sardis_congregation_476','e2e_samaritan_congregation'].forEach(function (id) {
      s.localInstitutions[id] = FB.religiousInstitutionOpeningRow(id, defs[id]);
    });
    const helper = FB.makeCharacter(s, {name:'Fixture fellow learner', religion:'jewish',
      culture:me.culture, sex:'f', born:s.date.year - 30, role:'notable', station:1});
    helper.homeProvinceId = pid; helper.skills.int = 4;
    window.communalFixture = {pid:pid, cid:me.id, spouse:spouse.id, helper:helper.id,
      patron:FB.settlementCountyHolder(s, pid),
      land:{provinceId:pid,settlement:0,count:2}};
    window.communalAct = function (iid, cid, action, terms) {
      const q = FB.religiousInstitutionQuote(FB.state, iid, {kind:'character',id:cid}, action, terms || {});
      if (!q || !q.allowed || !FB.religiousInstitutionApply(FB.state, q))
        throw new Error(action + ': ' + (q && q.reason));
      return q;
    };
    window.foundSynagogueProperty = function () {
      const state = FB.state, f = communalFixture;
      state.player.landPlots = [{provinceId:f.pid,settlement:0},{provinceId:f.pid,settlement:0}];
      const q = FB.religiousPatronageQuote(state, 'jewish_sardis_giving_476', f.cid, 'foundation', {land:f.land});
      if (!q || !q.allowed || !FB.religiousPatronageApply(state, q))
        throw new Error('Foundation: ' + (q && q.reason));
      return state.abbeys.houses.find(function (h) { return h.id === 'e2e_synagogue_property'; });
    };
  });
}

test('communal contracts validate independently and register no opening places, offices or destinations',
  async function ({page}, testInfo) {
    await openGame(page, testInfo);
    expect(await page.evaluate(function () {
      const before = JSON.stringify(FBDATA), rng = FB.getRngState(), uid = FB.getUidCounter();
      const ids = ['jewish_study_circle_early','jewish_sardis_congregation',
        'jewish_study_group_1204','samaritan_lay_congregation'];
      const placed = ['476','493','711','800','867','1066','1204'].some(function (id) {
        const b = FB.bookmark(id);
        return Object.keys(b.localInstitutions || {}).some(function (iid) {
          return ids.indexOf(b.localInstitutions[iid].profileId) >= 0;
        });
      });
      return {institutions:FB.religiousInstitutionCatalogFaults(FBDATA),
        activities:FB.religiousActivityCatalogFaults(FBDATA),
        mod:FB.mods.validate({name:'Jewish and Samaritan communal contracts',
          religiousAffiliations:FBDATA.religiousAffiliations,
          religiousInstitutionProfiles:FBDATA.religiousInstitutionProfiles,
          religiousActivities:FBDATA.religiousActivities, religiousPatronage:FBDATA.religiousPatronage}),
        placed:placed,
        headless:ids.every(function (id) { return FBDATA.religiousInstitutionProfiles[id].selection === null; }),
        noJudicialShortcut:ids.every(function (id) {
          const p = FBDATA.religiousInstitutionProfiles[id];
          return p.actions.indexOf('mediate') < 0 && !p.roles.priest && !p.roles.rabbi && !p.roles.judge;
        }),
        noJourney:Object.keys(FBDATA.religiousActivities).every(function (id) {
          return FBDATA.religiousActivities[id].mode === 'local';
        }),
        technology:['religious_activity_participation','religious_activity_patronage',
          'religious_institution_membership','religious_institution_recognition'].map(function (id) {
          return FBDATA.techImpactReviews.features[id].mode;
        }),
        pure:before === JSON.stringify(FBDATA) && rng === FB.getRngState() && uid === FB.getUidCounter()};
    })).toEqual({institutions:[],activities:[],mod:[],placed:false,headless:true,
      noJudicialShortcut:true,noJourney:true,technology:['none','none','none','none'],pure:true});
  });

test('free household worship and study preserve married ordinary work and cannot stack local study rewards',
  async function ({page}, testInfo) {
    await communalHousehold(page, testInfo);
    expect(await page.evaluate(function () {
      const s = FB.state, f = communalFixture, me = s.chars[f.cid], spouse = s.chars[f.spouse];
      s.player.gold = 0;
      const career = JSON.stringify([s.player.profession,me.role,spouse.role,spouse.career]);
      const links = JSON.stringify([me.spouseId,spouse.spouseId]);
      const before = JSON.stringify(s), rng = FB.getRngState(), uid = FB.getUidCounter();
      const q = FB.religiousActivityQuote(s, 'jewish_household_study', f.cid);
      const worship = FB.religiousActivityQuote(s, 'jewish_household_worship', f.spouse);
      const pure = before === JSON.stringify(s) && rng === FB.getRngState() && uid === FB.getUidCounter();
      const started = FB.religiousActivityApply(s,q) && FB.religiousActivityApply(s,worship);
      s.turn++; FB.religiousActivityTick(s);
      const early = !!me.religiousActivity && !spouse.religiousActivity && s.player.piety === 1;
      s.turn++; FB.religiousActivityTick(s);
      communalAct('jewish_meso_study_circle_476', f.cid, 'admit', {roleId:'learner'});
      const repeat = FB.religiousActivityQuote(s,'jewish_meso_study_circle_476_lesson',f.cid);
      return {pure:pure,started:started,early:early,learned:me.skills.int === 4,
        free:s.player.gold === 0,repeat:repeat.reason,
        married:links === JSON.stringify([me.spouseId,spouse.spouseId]),
        work:career === JSON.stringify([s.player.profession,me.role,spouse.role,spouse.career]),
        noOffice:FB.religiousInstitutionSnapshot(s,'jewish_meso_study_circle_476').holderId === null,
        noVow:!FB.religiousMembershipUnmarried(s,me)};
    })).toEqual({pure:true,started:true,early:true,learned:true,free:true,repeat:'commitment',
      married:true,work:true,noOffice:true,noVow:true});
  });

test('local learning affiliation and helper competence stay separate from identity and judicial permission',
  async function ({page}, testInfo) {
    await communalHousehold(page, testInfo);
    expect(await page.evaluate(function () {
      const s = FB.state, f = communalFixture, iid = 'jewish_meso_study_circle_476';
      const c = s.chars[f.cid], people = Object.keys(s.chars).length;
      const protectedFacts = JSON.stringify([c.religion,s.owner,s.holder,s.communities,s.population,s.religiousHeads]);
      const before = JSON.stringify(s), first = FB.religiousInstitutionQuote(s,iid,
        {kind:'character',id:c.id},'admit',{roleId:'study_helper'});
      const withheld = !first.allowed && before === JSON.stringify(s);
      communalAct(iid,c.id,'admit',{roleId:'learner'});
      communalAct(iid,c.id,'affiliate',{affiliationId:'jewish_rabbinic_learning_early'});
      const skillGate = !FB.religiousInstitutionRoleEligibility(s,iid,c.id,'study_helper');
      c.skills.int = 4;
      communalAct(iid,c.id,'admit',{roleId:'study_helper'});
      const specialist = FB.religiousInstitutionSnapshot(s,iid).members[c.id].roleId;
      const denied = ['appoint','mediate'].map(function (action) {
        const q = FB.religiousInstitutionQuote(s,iid,{kind:'character',id:c.id},action,{});
        return !q.allowed && !FB.religiousInstitutionApply(s,q);
      });
      const affiliations = c.religiousAffiliations.map(function (a) { return [a.id,a.institutionId]; });
      communalAct(iid,c.id,'withdraw',{});
      return {withheld:withheld,skillGate:skillGate,role:specialist,denied:denied,
        affiliation:affiliations,removed:c.religiousAffiliations.length === 0,
        identity:protectedFacts === JSON.stringify([c.religion,s.owner,s.holder,s.communities,s.population,s.religiousHeads]),
        noPeople:Object.keys(s.chars).length === people};
    })).toEqual({withheld:true,skillGate:true,role:'study_helper',denied:[true,true],
      affiliation:[['jewish_rabbinic_learning_early','jewish_meso_study_circle_476']],
      removed:true,identity:true,noPeople:true});
  });

test('two local communities require actual member assent and protected county worship for support',
  async function ({page}, testInfo) {
    await communalHousehold(page,testInfo);
    expect(await page.evaluate(function () {
      const s = FB.state, f = communalFixture, ids = ['jewish_meso_study_circle_476','jewish_sardis_congregation_476'];
      const subject = {kind:'character',id:f.cid}, beforePeople = Object.keys(s.chars).length;
      const results = ids.map(function (iid, i) {
        const roleId = i ? 'worshipper' : 'learner';
        communalAct(iid,f.cid,'admit',{roleId:roleId});
        communalAct(iid,f.spouse,'admit',{roleId:roleId});
        const actor = {kind:'character',id:f.cid};
        const terms = {subject:subject,provinceId:f.pid,source:'institution_support'};
        const before = JSON.stringify(s), noConsent = FB.religiousInstitutionQuote(s,iid,actor,'recognize',terms);
        const denied = !noConsent.allowed && !FB.religiousInstitutionApply(s,noConsent) && before === JSON.stringify(s);
        communalAct(iid,f.spouse,'assent',{decision:'recognize',subject:subject});
        const outside = FB.religiousInstitutionQuote(s,iid,actor,'recognize',Object.assign({},terms,{provinceId:'unknown_county'}));
        communalAct(iid,f.cid,'recognize',terms);
        return {denied:denied,outside:outside.reason,
          recognition:FB.religiousInstitutionSnapshot(s,iid).recognitions.some(function (r) {
            return r.status === 'active' && r.scope.kind === 'county' && r.scope.id === f.pid;
          })};
      });
      const population = JSON.stringify(s.population);
      FB.authoritySetIdentity(s,f.patron,{eliteCultureId:s.chars[f.cid].culture,eliteFaithId:'jewish',
        legalIdentityId:'latin',tolerance:'persecution',taxation:'equal',justicePolicy:'personal'});
      const blocked = ids.map(function (iid) { return FB.religiousInstitutionQuote(s,iid,
        {kind:'character',id:f.cid},'recognize',
        {subject:{kind:'character',id:f.spouse},provinceId:f.pid,source:'institution_support'}).reason; });
      return {results:results,blocked:blocked,population:population === JSON.stringify(s.population),
        noPeople:beforePeople === Object.keys(s.chars).length};
    })).toEqual({results:[{denied:true,outside:'scope',recognition:true},{denied:true,outside:'scope',recognition:true}],
      blocked:['protection','protection'],population:true,noPeople:true});
  });

test('small synagogue gifts and delivered care use conserved institutional property without buying membership',
  async function ({page}, testInfo) {
    await communalHousehold(page,testInfo);
    expect(await page.evaluate(function () {
      const s = FB.state, f = communalFixture, h = foundSynagogueProperty();
      const gold = s.player.gold, member = FB.religiousInstitutionSnapshot(s,'jewish_sardis_congregation_476').members[f.cid];
      const gift = FB.religiousPatronageQuote(s,'jewish_sardis_giving_476',f.cid,'donation',{fund:'building_care',amount:1});
      const given = FB.religiousPatronageApply(s,gift), twice = FB.religiousPatronageApply(s,gift);
      const wealth = [h.capital,h.treasury,JSON.stringify(h.plots)];
      communalAct('jewish_sardis_congregation_476',f.cid,'admit',{roleId:'worshipper'});
      const care = FB.religiousActivityApply(s,FB.religiousActivityQuote(s,'jewish_sardis_congregation_476_care',f.cid));
      s.turn += 2; FB.religiousActivityTick(s);
      const spent = h.activitySpent, balance = h.restrictedFunds.building_care;
      communalAct('jewish_sardis_congregation_476',f.cid,'withdraw',{});
      s.chars[f.spouse].dead = true;
      return {given:given,twice:twice,smallGift:gold - s.player.gold === 1,
        noBoughtMembership:member === undefined,noHouseholdPlots:s.player.landPlots.length === 0,
        property:JSON.stringify(h.plots) === JSON.stringify([f.land]),care:care,spent:spent,balance:balance,
        retained:JSON.stringify(wealth) === JSON.stringify([h.capital,h.treasury,JSON.stringify(h.plots)]),
        noIncome:h.rents === 0};
    })).toEqual({given:true,twice:false,smallGift:true,noBoughtMembership:true,noHouseholdPlots:true,
      property:true,care:true,spent:1,balance:0,retained:true,noIncome:true});
  });

test('persecution cancels shared synagogue service without spending its restricted gift or erasing household worship',
  async function ({page}, testInfo) {
    await communalHousehold(page,testInfo);
    expect(await page.evaluate(function () {
      const s = FB.state, f = communalFixture, h = foundSynagogueProperty();
      communalAct('jewish_sardis_congregation_476',f.cid,'admit',{roleId:'worshipper'});
      FB.religiousPatronageApply(s,FB.religiousPatronageQuote(s,'jewish_sardis_giving_476',f.cid,
        'donation',{fund:'building_care',amount:1}));
      const started = FB.religiousActivityApply(s,FB.religiousActivityQuote(s,'jewish_sardis_congregation_476_care',f.cid));
      const property = JSON.stringify(h), people = Object.keys(s.chars).length;
      const identities = JSON.stringify([s.chars[f.cid].religion,s.chars[f.spouse].religion,s.communities,s.population]);
      FB.authoritySetIdentity(s,f.patron,{eliteCultureId:s.chars[f.cid].culture,eliteFaithId:'jewish',
        legalIdentityId:'latin',tolerance:'persecution',taxation:'equal',justicePolicy:'personal'});
      s.turn += 2; FB.religiousActivityTick(s);
      return {started:started,interrupted:!s.chars[f.cid].religiousActivity,
        noReward:s.player.piety === 0,property:property === JSON.stringify(h),
        householdPrayer:FB.religiousActivityQuote(s,'jewish_household_worship',f.cid).allowed,
        identities:identities === JSON.stringify([s.chars[f.cid].religion,s.chars[f.spouse].religion,s.communities,s.population]),
        people:people === Object.keys(s.chars).length};
    })).toEqual({started:true,interrupted:true,noReward:true,property:true,householdPrayer:true,identities:true,people:true});
  });

test('Samaritan lay worship creates no priestly eligibility and held dates remain unavailable',
  async function ({page}, testInfo) {
    await communalHousehold(page,testInfo);
    expect(await page.evaluate(function () {
      const s = FB.state, f = communalFixture, me = s.chars[f.cid], spouse = s.chars[f.spouse];
      me.religion = 'samaritan'; spouse.religion = 'samaritan'; s.player.gold = 0;
      const head = JSON.stringify(s.religiousHeads), links = JSON.stringify([me.spouseId,spouse.spouseId]);
      communalAct('e2e_samaritan_congregation',f.cid,'admit',{roleId:'worshipper'});
      const noPriest = !FB.religiousInstitutionRoleEligibility(s,'e2e_samaritan_congregation',f.cid,'priest');
      const started = FB.religiousActivityApply(s,FB.religiousActivityQuote(s,'samaritan_household_worship',f.spouse));
      s.turn++; FB.religiousActivityTick(s);
      const original = JSON.parse(JSON.stringify(s.start)), originalDate = s.date.year;
      const held = ['867','1066'].map(function (id) {
        s.start.id = id; s.start.revision = id === '1066' ? 'inhabited_v2' : 'baseline'; s.date.year = Number(id);
        const q = FB.religiousActivityQuote(s,'samaritan_household_worship',f.cid);
        return !q.allowed;
      });
      s.start = original; s.date.year = originalDate;
      return {noPriest:noPriest,started:started,worship:s.player.piety === 1,held:held,
        heads:head === JSON.stringify(s.religiousHeads),
        married:links === JSON.stringify([me.spouseId,spouse.spouseId]),
        independent:!FB.faithIsA(me.religion,'jewish',s)};
    })).toEqual({noPriest:true,started:true,worship:true,held:[true,true],heads:true,married:true,independent:true});
  });

test('Karaite worship has its own dated household scope without creating a destination or legal remedy',
  async function ({page}, testInfo) {
    await communalHousehold(page,testInfo);
    expect(await page.evaluate(function () {
      const s = FB.state, f = communalFixture, c = s.chars[f.cid];
      c.religion = 'karaite';
      const start = JSON.parse(JSON.stringify(s.start)), year = s.date.year;
      const gates = ['476','493','1066','1204'].map(function (id) {
        s.start.id = id;
        s.start.revision = id === '476' ? 'wider_v2' : id === '493' ? 'world_v2' : 'inhabited_v2';
        s.date.year = Number(id);
        return FB.religiousActivityQuote(s,'karaite_household_worship',f.cid).allowed;
      });
      s.start = start; s.date.year = year;
      const d = FBDATA.religiousActivities.karaite_household_worship;
      return {gates:gates,local:d.mode === 'local' && d.institutionId === null && d.siteId === null,
        noLaw:FB.religionOf('karaite',s).marriage.divorce.enabled === false};
    })).toEqual({gates:[false,false,true,true],local:true,noLaw:true});
  });

test('date and retained-revision gates plus stale gift reviews reject without charging the household',
  async function ({page}, testInfo) {
    await communalHousehold(page,testInfo);
    expect(await page.evaluate(function () {
      const s = FB.state, f = communalFixture;
      const wrong493 = !FB.religiousActivityQuote(s,'jewish_meso_study_circle_493_lesson',f.cid).allowed;
      const wrong1204 = !FB.religiousActivityQuote(s,'alexandria_communal_school_1204_lesson',f.cid).allowed;
      const revision = s.start.revision; s.start.revision = 'baseline';
      const baseline = !FB.religiousActivityQuote(s,'jewish_household_study',f.cid).allowed;
      s.start.revision = revision;
      foundSynagogueProperty();
      const gift = FB.religiousPatronageQuote(s,'jewish_sardis_giving_476',f.cid,'donation',{fund:'building_care',amount:1});
      s.player.gold--;
      const before = JSON.stringify(s), rejected = !FB.religiousPatronageApply(s,gift);
      return {wrong493:wrong493,wrong1204:wrong1204,baseline:baseline,rejected:rejected,
        pure:before === JSON.stringify(s)};
    })).toEqual({wrong493:true,wrong1204:true,baseline:true,rejected:true,pure:true});
  });

test('communal AI uses the same free lay admission and cannot fund itself from the player or invent specialists',
  async function ({page}, testInfo) {
    await communalHousehold(page,testInfo);
    expect(await page.evaluate(function () {
      const s = FB.state, f = communalFixture;
      const h = foundSynagogueProperty();
      const me = s.chars[f.cid], sids = ['jewish_meso_study_circle_476','jewish_sardis_congregation_476'];
      const household = JSON.stringify([s.player.gold,s.player.piety,s.player.profession,me.religion,me.spouseId]);
      s.turn = 90;
      const admitted = FB.religiousInstitutionAI(s), repeat = FB.religiousInstitutionAI(s);
      const npc = sids.map(function (iid) { return FB.religiousInstitutionSnapshot(s,iid).members[f.helper]; });
      const publicGift = FB.religiousPatronageQuote(s,'jewish_sardis_public_giving_476',f.cid,
        'donation',{fund:'building_care',amount:1});
      const property = JSON.stringify(h), before = JSON.stringify(s);
      const publicDenied = !publicGift.allowed && !FB.religiousPatronageApply(s,publicGift) && before === JSON.stringify(s);
      return {admitted:admitted > 0 && admitted <= 4,repeat:repeat,
        lay:npc.every(function (m,i) { return m && m.roleId === (i ? 'worshipper' : 'learner'); }),
        noPlayerMembership:sids.every(function (iid) { return !s.localInstitutions[iid].members[f.cid]; }),
        household:household === JSON.stringify([s.player.gold,s.player.piety,s.player.profession,me.religion,me.spouseId]),
        publicDenied:publicDenied,property:property === JSON.stringify(h)};
    })).toEqual({admitted:true,repeat:0,lay:true,noPlayerMembership:true,household:true,publicDenied:true,property:true});
  });

test('a public synagogue gift charges the real ruler treasury and matches the household-funded service account',
  async function ({page}, testInfo) {
    await communalHousehold(page,testInfo);
    expect(await page.evaluate(function () {
      const s = FB.state, f = communalFixture, h = foundSynagogueProperty();
      FB.treasuryInitialize(s); s.treasuryAccounting.mode = 'active';
      let rid = Object.keys(s.realms).sort().find(function (id) {
        const c = FB.realmRulerCharacterSnapshot(s,id);
        return c && FB.treasuryCharacterRealm(s,c.id) === id && FB.characterResidence(s,c) === f.pid;
      });
      if (!rid) {
        rid = Object.keys(s.realms).sort().find(function (id) {
          const c = FB.realmRulerCharacterSnapshot(s,id);
          return c && FB.treasuryCharacterRealm(s,c.id) === id;
        });
        if (!rid) throw new Error('Expected an existing public treasury');
        s.realms[rid].capital = f.pid;
      }
      const c = FB.realmRulerCharacterSnapshot(s,rid);
      c.religion = 'jewish'; c.health = 8; c.born = s.date.year - 30;
      s.realms[rid].treasury.gold = 3; s.realms[rid].treasury.militaryAccrued = 0;
      const household = s.player.gold, balance = FB.treasuryAvailable(s,rid);
      const q = FB.religiousPatronageQuote(s,'jewish_sardis_public_giving_476',c.id,
        'donation',{fund:'building_care',amount:1});
      const applied = FB.religiousPatronageApply(s,q);
      const spent = balance - FB.treasuryAvailable(s,rid);
      s.realms[rid].treasury.gold = 0;
      const dry = !FB.religiousPatronageQuote(s,'jewish_sardis_public_giving_476',c.id,
        'donation',{fund:'building_care',amount:1}).allowed;
      return {applied:applied,payer:q.payer && q.payer.id === rid,cost:q.cost,
        spent:spent,
        service:h.restrictedFunds.building_care,household:household === s.player.gold,dry:dry};
    })).toEqual({applied:true,payer:true,cost:1,spent:1,service:1,household:true,dry:true});
  });

test('poor household study uses the shared narrow-screen review and retains Details and focus on Back',
  async function ({page}, testInfo) {
    await communalHousehold(page,testInfo);
    await page.setViewportSize({width:390,height:844});
    await page.evaluate(function () {
      FB.state.player.gold = 0;
      window.communalBeforeReview = [JSON.stringify(FB.state),FB.getRngState(),FB.getUidCounter()];
      FB.ui.showReligiousActivities();
    });
    const review = page.locator('#activity-review-jewish_household_study');
    const card = review.locator('xpath=../..');
    await expect(review).toBeEnabled();
    await card.getByRole('button',{name:'Details',exact:true}).click();
    await review.click();
    await expect(page.locator('#gm-body')).toContainText('Jewish household study');
    await expect(page.locator('#gm-body')).toContainText('Household purse');
    await expect(page.locator('#gm-body')).toContainText('2 days at this location');
    expect(await page.evaluate(function () {
      const box = document.getElementById('gm-body');
      return {pure:JSON.stringify(communalBeforeReview) ===
        JSON.stringify([JSON.stringify(FB.state),FB.getRngState(),FB.getUidCounter()]),
        fits:box.scrollWidth <= box.clientWidth + 1};
    })).toEqual({pure:true,fits:true});
    await page.keyboard.press('Escape');
    await expect(review).toBeFocused();
    await expect(card.getByRole('button',{name:'Details',exact:true})).toHaveAttribute('aria-expanded','true');
  });

function communalSavedFacts() {
  const s = FB.state, f = communalFixture;
  return JSON.parse(JSON.stringify({start:s.start,rng:FB.getRngState() >>> 0,uid:FB.getUidCounter(),
    player:[s.player.gold,s.player.piety,s.player.prestige,s.player.profession,s.player.landPlots],
    people:[f.cid,f.spouse].map(function (id) { const c = s.chars[id]; return [c.id,c.religion,c.spouseId,
      c.religiousAffiliations,c.religiousActivity,c.religiousActivityHistory,c.skills]; }),
    institutions:s.localInstitutions,heads:s.religiousHeads,abbeys:s.abbeys,communities:s.communities,population:s.population}));
}

for (const distribution of ['standard','CrazyGames']) {
  test(distribution + ' communal restore after another bookmark retains a gift and replays one funded service',
    async function ({page}, testInfo) {
      await communalHousehold(page,testInfo,distribution === 'CrazyGames');
      const source = await page.evaluate(function () {
        const s = FB.state, f = communalFixture;
        foundSynagogueProperty();
        communalAct('jewish_sardis_congregation_476',f.cid,'admit',{roleId:'worshipper'});
        communalAct('jewish_meso_study_circle_476',f.spouse,'admit',{roleId:'learner'});
        communalAct('jewish_meso_study_circle_476',f.spouse,'affiliate',{affiliationId:'jewish_rabbinic_learning_early'});
        if (!FB.religiousPatronageApply(s,FB.religiousPatronageQuote(s,'jewish_sardis_giving_476',f.cid,
          'donation',{fund:'building_care',amount:1})) ||
          !FB.religiousActivityApply(s,FB.religiousActivityQuote(s,'jewish_sardis_congregation_476_care',f.cid)))
          throw new Error('Expected gift and service');
        return FB.save.serialize();
      });
      const before = await page.evaluate(communalSavedFacts);
      await page.evaluate(function () { FB.state.turn += 2; FB.religiousActivityTick(FB.state); });
      const after = await page.evaluate(communalSavedFacts);
      await page.evaluate(function () {
        return new Promise(function (resolve,reject) {
          FB.activateBookmark('1204',null,function (error) { if (error) reject(error); else resolve(); });
        });
      });
      await restoreBookmark(page,source);
      expect(await page.evaluate(communalSavedFacts)).toEqual(before);
      await page.evaluate(function () { FB.state.turn += 2; FB.religiousActivityTick(FB.state); });
      expect(await page.evaluate(communalSavedFacts)).toEqual(after);
    });
}
