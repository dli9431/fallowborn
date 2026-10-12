'use strict';
const fs = require('fs');
const path = require('path');
const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { startDeterministicGame } = require('../support/game/start');
const { restoreBookmark } = require('../support/game/bookmark-acceptance');
const { releasedCatalogue } = require('../support/released-catalogue');
const { dependsOnRuntime } = require('../support/runtime-dependencies');

dependsOnRuntime(__filename, [
  'data/cultures.js', 'data/economy.js', 'data/technology.js',
  'data/bookmarks.js', 'data/bookmark_476.js', 'data/bookmark_476_wider.js',
  'data/bookmark_493_world.js', 'data/bookmark_711.js', 'data/bookmark_800.js',
  'data/bookmark_1066_inhabited.js', 'data/bookmark_1204_terrain.js',
  'js/model.js', 'js/economy.js', 'js/events.js', 'js/actions.js',
  'js/population.js', 'js/world.js', 'js/mods.js', 'js/systems.js',
  'js/save.js', 'js/save_v4.js', 'js/technology.js', 'js/ui_modals.js'
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
