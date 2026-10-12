'use strict';
const fs = require('fs');
const path = require('path');
const {test,expect} = require('../support/fixture');
const {openGame} = require('../support/game/navigation');
const {startParityGame} = require('../support/game/parity');
const {releasedCatalogue} = require('../support/released-catalogue');
const {dependsOnRuntime} = require('../support/runtime-dependencies');

dependsOnRuntime(__filename, ['index.html','data/cultures.js','data/economy.js',
  'data/technology.js','data/bookmarks.js','data/bookmark_476.js',
  'data/bookmark_476_wider_identities.js','data/bookmark_476_wider.js',
  'data/bookmark_493_world.js','data/bookmark_711.js','data/bookmark_800_expansion.js',
  'data/bookmark_867_expansion.js','data/bookmark_1066_inhabited.js',
  'data/bookmark_1204_terrain.js','data/government_rollout.js',
  'js/model.js','js/economy.js','js/holywar.js','js/systems.js','js/technology.js',
  'js/institutions.js','js/religion.js','js/world.js','js/save.js','js/save_v4.js']);

async function startEarly(page, testInfo) {
  await startParityGame(page, testInfo, {
    bookmark:'476', code:'CHRISTIANPROFILES-476-federate_476-ravenna-m-Marcus-standard-0-gothic.homoian'
  });
}

test('early profiles use neutral war vocabulary and retain canonical offices and released doctrine',
  async function ({page},testInfo) {
    await openGame(page,testInfo);
    const fixture = JSON.parse(fs.readFileSync(path.join(__dirname,'../fixtures/released-catalogue.json'),'utf8'));
    expect((await page.evaluate(releasedCatalogue,fixture.selection)).hashes).toEqual(fixture.hashes);
    expect(await page.evaluate(function () {
      const before = JSON.stringify(FBDATA), rng = FB.getRngState(), uid = FB.getUidCounter();
      const early = ['nicene','homoian','chalcedonian','miaphysite','east_syriac'];
      const profiles = early.map(function (id) {
        const faith = FB.religionOf(id,null);
        return {id:id,tradition:faith.holyWarTradition,
          campaign:FB.holyWarCampaignType(null,id),
          office:faith.head && faith.head.officeId || null,
          succession:faith.head && faith.head.succession || null,
          clergyMarriage:faith.clergyMarriage};
      });
      const errors = ['476','493','711','800','867','1066','1204'].map(function (id) {
        return FB.validateBookmark(FB.bookmark(id));
      });
      return {profiles:profiles,errors:errors,original:FB.validateBookmark(FB.bookmark('476','baseline')),
        catalogue:FB.validateReligionData(null),
        pure:before === JSON.stringify(FBDATA) && rng === FB.getRngState() && uid === FB.getUidCounter()};
    })).toEqual({profiles:[
      {id:'nicene',tradition:null,campaign:'other',office:'rome_bishop',succession:'appointment',clergyMarriage:false},
      {id:'homoian',tradition:null,campaign:'other',office:'ravenna_homoian_bishop',succession:'appointment',clergyMarriage:false},
      {id:'chalcedonian',tradition:null,campaign:'other',office:'constantinople_patriarch',succession:'appointment',clergyMarriage:false},
      {id:'miaphysite',tradition:null,campaign:'other',office:'alexandria_patriarch',succession:'appointment',clergyMarriage:false},
      {id:'east_syriac',tradition:null,campaign:'other',office:null,succession:null,clergyMarriage:true}
    ],errors:[[],[],[],[],[],[],[]],original:[],catalogue:[],pure:true});
  });

test('held regional county, court and congregation assignments are preserved',
  async function ({page},testInfo) {
    await openGame(page,testInfo);
    const result = await page.evaluate(function () {
      return ['476','493'].map(function (id) {
        const b = FB.bookmark(id);
        const caucasian = b.provinces.filter(function (p) { return p.religion === 'caucasian_christian_476'; });
        const axum = b.provinces.find(function (p) { return p.id === 'axum'; });
        const local = b.localInstitutions;
        return {id:id,counties:caucasian.map(function (p) { return p.id; }).sort(),
          communities:caucasian.every(function (p) {
            return p.communities.length === 1 && p.communities[0].religion === 'caucasian_christian_476' &&
              p.communities[0].populationShare0 === 10000;
          }),
          courts:['kartli_','lazica_'].every(function (prefix) {
            const r = b.realms.find(function (r) { return r.id === prefix + id; });
            return r.religion === 'caucasian_christian_476' && (!r.royalCourt ||
              r.royalCourt.members.every(function (c) { return c.religion === 'caucasian_christian_476'; }));
          }),
          actors:Object.keys(b.opening.actors).filter(function (key) {
            return b.opening.actors[key].religion === 'caucasian_christian_476';
          }).sort(),
          congregations:[local['dvin_community_0_' + id].religion,local['axum_community_0_' + id].religion],
          aksum:b.realms.find(function (r) { return r.id === 'aksum_' + id; }).religion,
          axum:{religion:axum.religion,communities:axum.communities.map(function (c) {
            return [c.religion,c.populationShare0];
          })}};
      });
    });
    expect(result).toEqual([
      {id:'476',counties:['ani','dvin','kars','kutaisi','tbilisi','van'],communities:true,courts:true,
        actors:['dvin_magnate','dvin_magnate_heir','van_magnate','van_magnate_heir'],
        congregations:['caucasian_christian_476','aksumite_christian_476'],aksum:'aksumite_christian_476',
        axum:{religion:'aksumite_christian_476',communities:[['aksumite_christian_476',7000],['horn_traditional_476',3000]]}},
      {id:'493',counties:['ani','dvin','kars','kutaisi','sukhumi','tbilisi','van'],communities:true,courts:true,
        actors:['dvin_heir_493','dvin_principal_493'],
        congregations:['caucasian_christian_476','aksumite_christian_476'],aksum:'aksumite_christian_476',
        axum:{religion:'aksumite_christian_476',communities:[['aksumite_christian_476',7000],['horn_traditional_476',3000]]}}
    ]);
  });

test('East Syriac lay service charges existing costs without altering mixed communities or offices',
  async function ({page},testInfo) {
    await startEarly(page,testInfo);
    expect(await page.evaluate(function () {
      const s = FB.state, p = s.player, c = s.chars[p.charId];
      c.religion = 'east_syriac'; c.born = s.date.year - 40;
      p.gold = 500; p.piety = 500; p.prestige = 500;
      const population = JSON.stringify(s.population), offices = JSON.stringify(s.religiousHeads);
      const before = JSON.stringify(s), rng = FB.getRngState(), uid = FB.getUidCounter();
      const q = FB.religiousAdvance(s,c), standing = FB.religiousStandings(s,c);
      const pure = before === JSON.stringify(s) && rng === FB.getRngState() && uid === FB.getUidCounter();
      const gold = p.gold, prestige = p.prestige;
      const steps = [FB.takeReligiousStep(s,c),FB.takeReligiousStep(s,c)];
      const result = {review:{path:q.path.id,rank:q.step.id,blocked:q.blocked},pure:pure,
        standings:standing.map(function (r) { return r.kind; }),steps:steps,
        gold:gold - p.gold,prestige:p.prestige - prestige,
        path:FB.religiousPathOf(s,c).id,rank:FB.religiousPathOf(s,c).step.id,
        head:FB.religionOf(c.religion,s).head,
        unchanged:population === JSON.stringify(s.population) && offices === JSON.stringify(s.religiousHeads),
        impact:FBDATA.techImpactReviews.features.east_syriac_religious_progression.mode,
        medieval:['papacy','great_holy_wars','abbeys'].some(function (id) { return FB.systemEnabled(s,id); })};
      const saved = JSON.parse(FB.save.serialize());
      FB.save.restore(saved);
      const restored = FB.state, actor = restored.chars[restored.player.charId];
      result.restore = actor.religion === 'east_syriac' && actor.religiousRanks.late_antique_lay === 2 &&
        FB.religiousPathOf(restored,actor).step.id === 'local_patron' &&
        population === JSON.stringify(restored.population) && offices === JSON.stringify(restored.religiousHeads);
      return result;
    })).toEqual({review:{path:'late_antique_lay',rank:'almsgiver',blocked:false},pure:true,
      standings:['lay'],steps:[true,true],gold:40,prestige:8,path:'late_antique_lay',rank:'local_patron',
      head:null,unchanged:true,impact:'none',medieval:false,restore:true});
  });

test('female monastic service retains a distinct path and cannot silently become a bishop',
  async function ({page},testInfo) {
    await startEarly(page,testInfo);
    expect(await page.evaluate(function () {
      const s = FB.state, p = s.player, c = s.chars[p.charId];
      c.religion = 'east_syriac'; c.sex = 'f'; c.born = s.date.year - 40; c.skills.lea = 20;
      p.gold = 500; p.piety = 500; p.prestige = 500;
      const admitted = FB.beginCareer(s,c,'monk');
      c.career.experience = 10;
      const steps = [FB.takeReligiousStep(s,c),FB.takeReligiousStep(s,c)];
      const vocation = FB.religiousPathOf(s,c);
      const priest = FB.beginCareer(s,c,'priest');
      const monastic = {admitted:admitted,steps:steps,path:vocation.id,
        title:FB.religiousRankTitle(s,c,vocation),bishop:!!p.flags.bishop,
        priest:priest,career:c.career.profession};
      // A retained/modded clerical career must still obey the rank's own gate.
      c.career.profession = 'priest'; c.career.experience = 14;
      c.religiousRanks.late_antique_clerical = 2;
      const before = JSON.stringify(s), rng = FB.getRngState(), uid = FB.getUidCounter();
      const review = FB.religiousAdvance(s,c), applied = FB.takeReligiousStep(s,c);
      return {monastic:monastic,episcopal:{rank:review.step.id,blocked:review.blocked,applied:applied,
        pure:before === JSON.stringify(s) && rng === FB.getRngState() && uid === FB.getUidCounter()}};
    })).toEqual({monastic:{admitted:true,steps:[true,true],path:'late_antique_monastic',
      title:'Abbess',bishop:false,priest:false,career:'monk'},
      episcopal:{rank:'bishop',blocked:true,applied:false,pure:true}});
  });

test('East Syriac clerical progress preserves lay standing and saved rank indices',
  async function ({page},testInfo) {
    await startEarly(page,testInfo);
    expect(await page.evaluate(function () {
      const s = FB.state, p = s.player, c = s.chars[p.charId];
      c.religion = 'east_syriac'; c.born = s.date.year - 40; c.skills.lea = 20;
      p.gold = 500; p.piety = 500; p.prestige = 500;
      FB.takeReligiousStep(s,c);
      const admitted = FB.beginCareer(s,c,'priest');
      c.career.experience = 14;
      const heads = JSON.stringify(s.religiousHeads), land = JSON.stringify([s.owner,s.holder]);
      const steps = [FB.takeReligiousStep(s,c),FB.takeReligiousStep(s,c),FB.takeReligiousStep(s,c)];
      const ranks = JSON.stringify(c.religiousRanks);
      const standings = FB.religiousStandings(s,c).map(function (r) { return [r.kind,r.path.step.id]; });
      const save = JSON.parse(FB.save.serialize());
      FB.save.restore(save);
      const restored = FB.state, actor = restored.chars[restored.player.charId];
      const before = JSON.stringify(restored), rng = FB.getRngState(), uid = FB.getUidCounter();
      const path = FB.religiousPathOf(restored,actor), after = FB.religiousStandings(restored,actor);
      return {admitted:admitted,steps:steps,standings:standings,path:path.id,rank:path.step.id,
        ranks:ranks === JSON.stringify(actor.religiousRanks),
        restored:JSON.stringify(after.map(function (r) { return [r.kind,r.path.step.id]; })) === JSON.stringify(standings),
        canonical:heads === JSON.stringify(restored.religiousHeads) && land === JSON.stringify([restored.owner,restored.holder]),
        pure:before === JSON.stringify(restored) && rng === FB.getRngState() && uid === FB.getUidCounter()};
    })).toEqual({admitted:true,steps:[true,true,true],standings:[['lay','almsgiver'],['vocation','bishop']],
      path:'late_antique_clerical',rank:'bishop',ranks:true,restored:true,canonical:true,pure:true});
  });
