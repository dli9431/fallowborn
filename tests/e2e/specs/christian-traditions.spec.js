'use strict';
const fs = require('fs');
const path = require('path');
const {test,expect} = require('../support/fixture');
const {openGame} = require('../support/game/navigation');
const {startParityGame} = require('../support/game/parity');
const {restoreBookmark} = require('../support/game/bookmark-acceptance');
const {releasedCatalogue} = require('../support/released-catalogue');
const {dependsOnRuntime} = require('../support/runtime-dependencies');

dependsOnRuntime(__filename, ['index.html','data/cultures.js','data/economy.js',
  'data/technology.js','data/bookmarks.js','data/bookmark_476.js','data/bookmark_493.js',
  'data/starts.js','data/religious_institutions.js','data/religious_activities.js',
  'data/bookmark_476_wider_identities.js','data/bookmark_476_wider.js',
  'data/bookmark_493_world.js','data/bookmark_711.js','data/bookmark_800_expansion.js',
  'data/bookmark_867_expansion.js','data/bookmark_1066_inhabited.js',
  'data/bookmark_1204_terrain.js','data/government_rollout.js',
  'data/christian_rollout.js',
  'js/model.js','js/economy.js','js/holywar.js','js/systems.js','js/technology.js',
  'js/population.js','js/institutions.js','js/religious_institutions.js','js/religious_activities.js',
  'js/local_office_appointments.js','js/authority.js','js/treasury.js','js/modifiers.js',
  'js/story_courts.js','js/main.js','js/religion.js','js/world.js','js/save.js','js/save_v4.js']);

async function startEarly(page, testInfo) {
  await startParityGame(page, testInfo, {
    bookmark:'476', code:'CHRISTIANPROFILES-476-federate_476-ravenna-m-Marcus-standard-0-gothic.homoian'
  });
}

async function startChurch493(page, testInfo, county) {
  await openGame(page,testInfo);
  await page.evaluate(function () { FBDATA.bookmarks['493'].hidden = false; });
  const beginning = page.locator('#btn-choose-beginning');
  if (await beginning.isVisible()) await beginning.click();
  else await page.getByRole('button',{name:'New Game',exact:true}).click();
  await page.locator('#btn-bm-seed').click();
  await page.locator('#ng-seed').fill('CHURCHSERVICE-493-farmer_493-' + county + '-m-Review-established');
  await page.locator('#ng-seed').press('Enter');
  await expect(page.locator('#chargen:not(.hidden)')).toBeVisible();
  await page.getByRole('button',{name:'Begin Your Story',exact:true}).click();
  await page.getByRole('button',{name:'Begin',exact:true}).click();
  await expect(page.locator('#game:not(.hidden)')).toBeVisible();
  await page.evaluate(function () {
    FB.game.setPaused(true); FB.game.uiPrefs.hideTips = true;
    FB.game.uiPrefs.hideBeginnerHints = true; FB.ui.coachmarkReset();
    delete FB.state.player.flags.tutorial; FBDATA.bookmarks['493'].hidden = true;
    window.churchAct = function (iid, cid, action, terms) {
      var q = FB.religiousInstitutionQuote(FB.state,iid,{kind:'character',id:cid},action,terms || {});
      if (!q || !q.allowed || !FB.religiousInstitutionApply(FB.state,q))
        throw new Error(action + ': ' + (q && q.reason));
      return q;
    };
  });
}

async function startDatedChurch(page, testInfo, bookmark, revision, county) {
  await openGame(page,testInfo);
  await page.evaluate(function (o) {
    FBDATA.bookmarks[o.bookmark].hidden = false;
    FBDATA.bookmarks[o.bookmark].revision = o.revision;
    FB.startProgression.noteTier(3);
  },{bookmark:bookmark,revision:revision});
  const beginning = page.locator('#btn-choose-beginning');
  if (await beginning.isVisible()) await beginning.click();
  else await page.getByRole('button',{name:'New Game',exact:true}).click();
  await page.locator('#btn-bm-seed').click();
  const scenario = bookmark === '476' ? 'farmer_476' : bookmark === '493' ? 'farmer_493' : 'farmer';
  await page.locator('#ng-seed').fill('DATEDCHURCH-' + bookmark + '-' + scenario + '-' + county + '-m-Review-established');
  await page.locator('#ng-seed').press('Enter');
  await expect(page.locator('#chargen:not(.hidden)')).toBeVisible();
  await page.getByRole('button',{name:'Begin Your Story',exact:true}).click();
  await page.getByRole('button',{name:'Begin',exact:true}).click();
  await expect(page.locator('#game:not(.hidden)')).toBeVisible();
  await page.evaluate(function () {
    FB.game.setPaused(true); FB.game.uiPrefs.hideTips = true;
    FB.game.uiPrefs.hideBeginnerHints = true; FB.ui.coachmarkReset();
    delete FB.state.player.flags.tutorial;
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

test('493 institutions keep the catholicos separate from the shah and open service groups without representatives',
  async function ({page},testInfo) {
    await startChurch493(page,testInfo,'baghdad');
    expect(await page.evaluate(function () {
      var s = FB.state, defs = FB.localInstitutionDefinitions(s);
      var head = FB.religiousOfficeSnapshot(s,'east_syriac_catholicos');
      var ids = ['ctesiphon_church_service_493','dvin_church_service_493'];
      var before = JSON.stringify(s), rng = FB.getRngState(), uid = FB.getUidCounter();
      var groups = ids.map(function (id) {
        var snap = FB.religiousInstitutionSnapshot(s,id);
        return {available:snap.available,members:Object.keys(snap.members).length,
          office:defs[id].officeId || null,property:defs[id].abbeyId || null,
          representative:s.localInstitutions[id].representativeId};
      });
      var omitted = ['476','711','800','867','1066','1204'].every(function (id) {
        return !(FB.bookmark(id).localInstitutions || {}).ctesiphon_catholicos_493;
      }) && !FB.bookmark('493','baseline').localInstitutions.ctesiphon_catholicos_493;
      var malformed = JSON.parse(JSON.stringify(FB.bookmark('493')));
      malformed.localInstitutions.ctesiphon_catholicos_493.jurisdictionIds = ['constructor'];
      var rejected = FB.validateBookmark(malformed).some(function (error) { return /invalid local jurisdiction/.test(error); });
      return {incumbent:{name:head.name,faith:head.religion,role:head.role,home:head.homeProvinceId},
        groups:groups,faithHead:FB.religionOf('east_syriac',s).head,
        shah:s.realms.sasanian_493.religion !== 'east_syriac',omitted:omitted,
        pure:before === JSON.stringify(s) && rng === FB.getRngState() && uid === FB.getUidCounter(),
        catalog:FB.religiousInstitutionCatalogFaults(FBDATA),activities:FB.religiousActivityCatalogFaults(FBDATA),
        impact:FBDATA.techImpactReviews.features.christian_local_church_service.mode,rejected:rejected};
    })).toEqual({incumbent:{name:'Acacius',faith:'east_syriac',role:'priest',home:'baghdad'},
      groups:[{available:true,members:0,office:null,property:null,representative:null},
        {available:true,members:0,office:null,property:null,representative:null}],
      faithHead:null,shah:true,omitted:true,pure:true,catalog:[],activities:[],impact:'none',rejected:true});
  });

test('493 married East Syriac clergy and household service do not imply ordination or monastic vows',
  async function ({page},testInfo) {
    await startChurch493(page,testInfo,'baghdad');
    expect(await page.evaluate(function () {
      var s = FB.state, c = s.chars[s.player.charId], iid = 'ctesiphon_church_service_493';
      c.religion = 'east_syriac'; c.skills.int = 8; c.skills.lea = 8; c.born = s.date.year - 30;
      var spouse = FB.makeCharacter(s,{name:'Fictional spouse',sex:'f',culture:'syriac',religion:'east_syriac',
        born:s.date.year - 28,role:'farmer',station:1});
      spouse.homeProvinceId = 'baghdad'; spouse.spouseId = c.id; c.spouseId = spouse.id;
      var heads = JSON.stringify(s.religiousHeads), population = JSON.stringify(s.population);
      var layWork = JSON.stringify(c.career);
      var prerequisite = !FB.religiousInstitutionQuote(s,iid,{kind:'character',id:c.id},'admit',{roleId:'cleric'}).allowed;
      churchAct(iid,c.id,'admit',{roleId:'household'});
      var preservedWork = layWork === JSON.stringify(c.career);
      churchAct(iid,c.id,'affiliate',{affiliationId:'east_syriac_nicene_reception'});
      c.career = {profession:'priest',experience:14};
      churchAct(iid,c.id,'admit',{roleId:'cleric'});
      churchAct(iid,spouse.id,'admit',{roleId:'household'});
      var femaleClergy = FB.religiousInstitutionQuote(s,iid,{kind:'character',id:spouse.id},'admit',{roleId:'cleric'});
      return {prerequisite:prerequisite,preservedWork:preservedWork,
        marriedCleric:s.localInstitutions[iid].members[c.id].roleId === 'cleric',
        spouse:s.localInstitutions[iid].members[spouse.id].roleId,femaleClergy:femaleClergy.allowed,
        vow:FB.religiousHouseholdRule(s,c,'priest').unmarried,
        affiliations:c.religiousAffiliations.map(function (a) { return a.id; }),
        unchanged:heads === JSON.stringify(s.religiousHeads) && population === JSON.stringify(s.population)};
    })).toEqual({prerequisite:true,preservedWork:true,marriedCleric:true,spouse:'household',femaleClergy:false,
      vow:false,affiliations:['east_syriac_nicene_reception'],unchanged:true});
  });

[
  {county:'baghdad',faith:'east_syriac',institution:'ctesiphon_church_service_493',activity:'ctesiphon_church_service_493',duration:2},
  {county:'dvin',faith:'caucasian_christian_476',institution:'dvin_church_service_493',activity:'dvin_church_relief_493',duration:1}
].forEach(function (f) {
  test(f.county + ' household service uses pure review, one payment and a retained single reward',
    async function ({page},testInfo) {
      await startChurch493(page,testInfo,f.county);
      expect(await page.evaluate(function (f) {
        var s = FB.state, c = s.chars[s.player.charId]; c.religion = f.faith;
        c.born = s.date.year - 30; c.health = 8; c.skills.int = 5;
        s.player.gold = 100; s.player.piety = 10;
        churchAct(f.institution,c.id,'admit',{roleId:'household'});
        var before = JSON.stringify(s), rng = FB.getRngState(), uid = FB.getUidCounter();
        var q = FB.religiousActivityQuote(s,f.activity,c.id);
        var pure = before === JSON.stringify(s) && rng === FB.getRngState() && uid === FB.getUidCounter();
        s.player.gold--;
        var staleBefore = JSON.stringify(s), stale = !FB.religiousActivityApply(s,q) && staleBefore === JSON.stringify(s);
        s.player.gold++;
        var land = JSON.stringify([s.owner,s.holder,s.population,s.religiousHeads,s.abbeys || null,c.career]);
        var started = FB.religiousActivityApply(s,FB.religiousActivityQuote(s,f.activity,c.id));
        var paid = s.player.gold;
        var saved = JSON.parse(FB.save.serialize()); FB.save.restore(saved);
        s = FB.state; c = s.chars[s.player.charId];
        var retained = !!c.religiousActivity && s.localInstitutions[f.institution].members[c.id].status === 'active';
        FB.religiousActivityTick(s);
        var early = !!c.religiousActivity && s.player.piety === 10;
        s.turn += f.duration; FB.religiousActivityTick(s); FB.religiousActivityTick(s);
        var history = c.religiousActivityHistory[FBDATA.religiousActivities[f.activity].milestone];
        return {pure:pure,stale:stale,started:started,spent:100 - paid,retained:retained,early:early,
          complete:!c.religiousActivity && history.performed && history.rewarded,piety:s.player.piety,intelligence:c.skills.int,
          repeat:FB.religiousActivityQuote(s,f.activity,c.id).allowed,
          unchanged:land === JSON.stringify([s.owner,s.holder,s.population,s.religiousHeads,s.abbeys || null,c.career])};
      },f)).toEqual({pure:true,stale:true,started:true,spent:2,retained:true,early:true,
        complete:true,piety:11,intelligence:f.county === 'baghdad' ? 6 : 5,repeat:false,unchanged:true});
    });
});

test('Dvin mediation needs current local assent and disputed support grants no government or doctrine',
  async function ({page},testInfo) {
    await startChurch493(page,testInfo,'dvin');
    expect(await page.evaluate(function () {
      var s = FB.state, c = s.chars[s.player.charId], iid = 'dvin_church_service_493';
      c.religion = 'caucasian_christian_476'; c.skills.int = 8; c.born = s.date.year - 30;
      churchAct(iid,c.id,'admit',{roleId:'helper'});
      var other = FB.makeCharacter(s,{name:'Fictional helper',sex:'f',culture:'armenian',
        religion:c.religion,born:s.date.year - 28,role:'notable',station:1});
      other.homeProvinceId = 'dvin'; other.skills.int = 8;
      churchAct(iid,other.id,'admit',{roleId:'helper'});
      var subject = {kind:'realm',id:FB.settlementCountyHolder(s,'dvin')};
      var terms = {subject:subject,provinceId:'dvin',source:'institution_support'};
      var modifiers = s.modifiers; delete s.modifiers;
      var missingBefore = JSON.stringify(s);
      var missing = FB.religiousInstitutionQuote(s,iid,{kind:'character',id:c.id},'mediate',terms).reason;
      var missingPure = missingBefore === JSON.stringify(s); s.modifiers = modifiers;
      churchAct(iid,other.id,'assent',{decision:'recognize',subject:subject});
      var before = JSON.stringify(s), rng = FB.getRngState(), uid = FB.getUidCounter();
      var q = FB.religiousInstitutionQuote(s,iid,{kind:'character',id:c.id},'mediate',terms);
      var pure = before === JSON.stringify(s) && rng === FB.getRngState() && uid === FB.getUidCounter();
      var outside = !FB.religiousInstitutionQuote(s,iid,{kind:'character',id:c.id},'mediate',
        Object.assign({},terms,{provinceId:'van'})).allowed;
      var canonical = JSON.stringify([s.owner,s.holder,s.population,s.religiousHeads,s.papacy || null,c.career]);
      var rights = s.authority.rights.length;
      var applied = FB.religiousInstitutionApply(s,q);
      var recognized = FB.political.legitimacy(s,subject,{kind:'county',id:'dvin'},terms.source)[0];
      churchAct(iid,other.id,'assent',{decision:'dispute',subject:subject});
      churchAct(iid,c.id,'dispute',Object.assign({},terms,{recognitionId:recognized.id}));
      return {missing:missing,missingPure:missingPure,pure:pure,outside:outside,applied:applied,
        issuer:recognized.issuer.kind,scope:recognized.scope,
        disputed:FB.political.legitimacy(s,subject,{kind:'county',id:'dvin'},terms.source).length,
        unchanged:rights === s.authority.rights.length && canonical === JSON.stringify(
          [s.owner,s.holder,s.population,s.religiousHeads,s.papacy || null,c.career])};
    })).toEqual({missing:'consent',missingPure:true,pure:true,outside:true,applied:true,issuer:'religious-institution',
      scope:{kind:'county',id:'dvin'},disputed:0,unchanged:true});
  });

test('catholicos mediation, bounded clerical AI and explicit vacancy use existing canonical records',
  async function ({page},testInfo) {
    await startChurch493(page,testInfo,'baghdad');
    expect(await page.evaluate(function () {
      var s = FB.state, id = 'ctesiphon_catholicos_493', iid = 'ctesiphon_church_service_493';
      var incumbent = FB.religiousOfficeSnapshot(s,'east_syriac_catholicos');
      var subject = {kind:'realm',id:FB.settlementCountyHolder(s,'baghdad')};
      var modifiers = s.modifiers; delete s.modifiers;
      var before = JSON.stringify(s), rng = FB.getRngState(), uid = FB.getUidCounter();
      var q = FB.localInstitutionMediationQuote(s,id,subject,'baghdad');
      var outside = !FB.localInstitutionMediationQuote(s,id,subject,'dvin').allowed;
      var pure = before === JSON.stringify(s) && rng === FB.getRngState() && uid === FB.getUidCounter();
      s.modifiers = modifiers;
      var mediated = !!FB.localInstitutionMediate(s,id,subject,'baghdad',q);
      incumbent.skills.int = 8; incumbent.skills.lea = 8;
      var admitted = FB.religiousInstitutionQuote(s,iid,{kind:'character',id:incumbent.id},'admit',{roleId:'cleric'}).allowed;
      var preserved = JSON.stringify([Object.keys(s.chars).sort(),s.owner,s.holder,s.population,s.religiousHeads,s.player.gold]);
      s.turn = 90; var actions = FB.religiousInstitutionAI(s), repeat = FB.religiousInstitutionAI(s);
      var parity = admitted && s.localInstitutions[iid].members[incumbent.id].roleId === 'cleric';
      var unchanged = preserved === JSON.stringify([Object.keys(s.chars).sort(),s.owner,s.holder,s.population,s.religiousHeads,s.player.gold]);
      var resigned = FB.localOfficeApply(s,FB.localOfficeQuote(s,id,'resign',{characterId:incumbent.id}));
      FB.ensureReligiousHeads(s); FB.ensureLocalInstitutions(s);
      var saved = JSON.parse(FB.save.serialize()); FB.save.restore(saved); s = FB.state;
      return {pure:pure,outside:outside,mediated:mediated,bounded:actions > 0 && actions <= 2,
        repeat:repeat,parity:parity,unchanged:unchanged,resigned:resigned,
        vacant:s.religiousHeads.east_syriac_catholicos === null &&
          FB.religiousOfficeSnapshot(s,'east_syriac_catholicos') === null &&
          s.religiousHeadVacancies.east_syriac_catholicos.formerHolder === incumbent.id};
    })).toEqual({pure:true,outside:true,mediated:true,bounded:true,repeat:0,parity:true,
      unchanged:true,resigned:true,vacant:true});
  });

test('retained 493 ledgers do not acquire newly declared service groups or a catholicos',
  async function ({page},testInfo) {
    await startChurch493(page,testInfo,'baghdad');
    expect(await page.evaluate(function () {
      var s = FB.state, incumbent = s.religiousHeads.east_syriac_catholicos;
      ['ctesiphon_catholicos_493','ctesiphon_church_service_493','dvin_church_service_493'].forEach(function (id) {
        delete s.localInstitutions[id];
      });
      delete s.religiousHeads.east_syriac_catholicos;
      delete s.religiousHeadVacancies.east_syriac_catholicos; delete s.chars[incumbent];
      var facts = JSON.stringify([s.localInstitutions,s.religiousHeads,s.religiousHeadVacancies,Object.keys(s.chars).sort()]);
      var saved = JSON.parse(FB.save.serialize()); FB.save.restore(saved); s = FB.state;
      FB.ensureReligiousHeads(s); FB.ensureLocalInstitutions(s); s.turn = 90; FB.religiousInstitutionAI(s);
      return {retained:facts === JSON.stringify([s.localInstitutions,s.religiousHeads,s.religiousHeadVacancies,Object.keys(s.chars).sort()]),
        absent:FB.religiousOfficeSnapshot(s,'east_syriac_catholicos') === null &&
          !FB.religiousInstitutionSnapshot(s,'ctesiphon_church_service_493')};
    })).toEqual({retained:true,absent:true});
  });


const datedChurchCases = [
  {id:'476',revision:'wider_v2',county:'baghdad',east:'Babowai',coptic:null,west:null,armenian:null,service:null},
  {id:'493',revision:'world_v2',county:'baghdad',east:'Acacius',coptic:null,west:null,armenian:null,service:'ctesiphon_church_service_493'},
  {id:'711',revision:'terrain_v2_governments_v2',county:'alexandria',east:null,coptic:'Alexander II',west:null,armenian:null,service:'alexandrian_service_711'},
  {id:'800',revision:'inhabited_v2_governments_v2',county:'baghdad',east:'Timothy I',coptic:'Mark II',west:'Cyriacus',armenian:null,service:'baghdad_service_800'},
  {id:'867',revision:'governments_v2',county:'baghdad',east:'Sergius',coptic:'Shenute I',west:null,armenian:'Zacharias',service:'baghdad_service_867'},
  {id:'1066',revision:'governments_v2',county:'constantinople',east:'Sabrisho III',coptic:'Christodoulos',west:'John bar Shushan',armenian:null,service:'constantinople_greek_service_1066'},
  {id:'1204',revision:'inhabited_v2',county:'constantinople',east:'Yahballaha II',coptic:'John VI',west:null,armenian:null,service:'constantinople_greek_service_1204'}
];

datedChurchCases.forEach(function (o) {
  test('dated Christian offices and service survive exact restore in ' + o.id,
    async function ({page},testInfo) {
      await startDatedChurch(page,testInfo,o.id,o.revision,o.county);
      expect(await page.evaluate(function (o) {
        var s = FB.state, offices = ['east_syriac_catholicos','alexandrian_coptic_patriarch',
          'west_syriac_patriarch','armenian_catholicos'];
        var before = JSON.stringify(s), rng = FB.getRngState(), uid = FB.getUidCounter();
        var names = offices.map(function (id) { var c = FB.religiousOfficeSnapshot(s,id); return c && c.name || null; });
        var group = o.service && FB.religiousInstitutionSnapshot(s,o.service);
        var pure = before === JSON.stringify(s) && rng === FB.getRngState() && uid === FB.getUidCounter();
        // Compare saved forms: restore inflates compacted defaults that live records omit.
        function saved() {
          var d = JSON.parse(FB.save.serialize()).state;
          return JSON.stringify([d.localInstitutions,d.religiousHeads,d.religiousHeadVacancies,
            d.papacy || null,d.chars,d.population,d.authority]);
        }
        var facts = saved();
        var text = FB.save.serialize(); FB.save.restore(JSON.parse(text)); s = FB.state;
        FB.ensureLocalInstitutions(s); FB.ensureReligiousHeads(s);
        return {names:names,pure:pure,service:!o.service || !!group && group.available && !group.holder,
          preserved:facts === saved(),
          restored:s.start.id === o.id && s.start.revision === o.revision,
          independent:FB.religiousHeadSnapshot(s,'east_syriac') === null,
          offMap:FB.localInstitutionList(s).filter(function (i) { return i.def.officeSystem === null && i.def.provinceId === null; })
            .every(function (i) {
              return i.def.jurisdictionIds.length === 0 &&
                !FB.localInstitutionMediationQuote(s,i.id,{kind:'realm',id:s.holder[o.county]},o.county).allowed;
            })};
      },o)).toEqual({names:[o.east,o.coptic,o.west,o.armenian],pure:true,service:true,
        preserved:true,restored:true,independent:true,offMap:true});
    });
});

test('all dated declarations validate while original revisions and unresolved consumers remain intact',
  async function ({page},testInfo) {
    await openGame(page,testInfo);
    expect(await page.evaluate(function () {
      var dates = ['476','493','711','800','867','1066','1204'];
      var errors = dates.map(function (id) { return FB.validateBookmark(FB.bookmark(id)); });
      ['867','1066'].forEach(function (id) {
        errors.push(FB.validateBookmark(FB.bookmark(id,'inhabited_v2_governments_v2')));
      });
      var baseline = dates.map(function (id) {
        var b = FB.bookmark(id,'baseline');
        return !Object.keys(b.localInstitutions || {}).some(function (iid) {
          return /^(alexandrian_|ibrim_service_|baghdad_catholicos_|east_syriac_catholicos_|constantinople_.*_service_|ctesiphon_catholicos_476)/.test(iid);
        });
      });
      var b = FB.bookmark('1204'), defs = b.localInstitutions;
      function rejects(change) {
        var copy = JSON.parse(JSON.stringify(FB.bookmark('800'))); change(copy.localInstitutions);
        return FB.localInstitutionDefinitionFaults(copy,FBDATA).length > 0;
      }
      var constantinople = b.provinces.filter(function (p) { return p.id === 'constantinople'; })[0];
      var old = FB.bookmark('1204','baseline').provinces.filter(function (p) { return p.id === 'constantinople'; })[0];
      return {errors:errors,baseline:baseline.every(Boolean),profiles:FB.religiousInstitutionCatalogFaults(FBDATA),
        activities:FB.religiousActivityCatalogFaults(FBDATA),
        disputed:defs.west_syriac_patriarch_1204.vacant && !defs.west_syriac_patriarch_1204.historicalName,
        held:!defs.ibrim_service_1204 && !defs.latin_patriarch_1204 && !defs.armenian_catholicos_1204,
        population:JSON.stringify(constantinople.communities) === JSON.stringify(old.communities),
        latin1066:!FB.bookmark('1066').localInstitutions.constantinople_latin_service_1066,
        invalidSystem:rejects(function (d) { d.baghdad_catholicos_800.officeSystem = 'missing_system'; }),
        invalidCommunion:rejects(function (d) { d.alexandrian_patriarch_800.communionWith = ['absent_office']; }),
        emptyOnMap:rejects(function (d) { d.baghdad_catholicos_800.jurisdictionIds = []; })};
    })).toEqual({errors:[[],[],[],[],[],[],[],[],[]],baseline:true,profiles:[],activities:[],
      disputed:true,held:true,population:true,latin1066:true,invalidSystem:true,invalidCommunion:true,emptyOnMap:true});
  });

test('800 synodical recognition is directional, personal, pure to read and cannot pass to a replacement',
  async function ({page},testInfo) {
    await startDatedChurch(page,testInfo,'800','inhabited_v2_governments_v2','baghdad');
    expect(await page.evaluate(function () {
      var s = FB.state, coptic = FB.religiousOfficeSnapshot(s,'alexandrian_coptic_patriarch');
      var west = FB.religiousOfficeSnapshot(s,'west_syriac_patriarch');
      var before = JSON.stringify(s), rng = FB.getRngState(), uid = FB.getUidCounter();
      var a = FB.political.legitimacy(s,{kind:'character',id:coptic.id},null,'church_support');
      var b = FB.political.legitimacy(s,{kind:'character',id:west.id},null,'church_support');
      var pure = before === JSON.stringify(s) && rng === FB.getRngState() && uid === FB.getUidCounter();
      var named = a.length === 1 && b.length === 1 && a[0].issuer.id === 'west_syriac_patriarch' &&
        b[0].issuer.id === 'alexandrian_coptic_patriarch' && a[0].scope === null && b[0].scope === null;
      var canonical = JSON.stringify([s.owner,s.holder,s.population,s.papacy || null,s.authority.rights]);
      var review = FB.localOfficeQuote(s,'west_syriac_patriarch_800','resign',{characterId:west.id});
      var resigned = FB.localOfficeApply(s,review);
      var lapsed = FB.political.legitimacy(s,{kind:'character',id:coptic.id},null,'church_support').length === 0;
      var replacement = FB.makeCharacter(s,{name:'Fictional replacement',sex:'m',culture:'syriac',religion:'eastern',
        born:750,role:'priest',station:3});
      s.religiousHeads.west_syriac_patriarch = replacement.id;
      var inherited = FB.political.legitimacy(s,{kind:'character',id:coptic.id},null,'church_support').length;
      return {pure:pure,named:named,resigned:resigned,lapsed:lapsed,inherited:inherited,
        unchanged:canonical === JSON.stringify([s.owner,s.holder,s.population,s.papacy || null,s.authority.rights])};
    })).toEqual({pure:true,named:true,resigned:true,lapsed:true,inherited:0,unchanged:true});
  });

test('1204 local role promises distinguish married Greek clergy, Latin clergy and ordinary households',
  async function ({page},testInfo) {
    await startDatedChurch(page,testInfo,'1204','inhabited_v2','constantinople');
    expect(await page.evaluate(function () {
      var s = FB.state, c = s.chars[s.player.charId], p = s.player;
      c.born = 1170; c.sex = 'm'; c.skills.int = 8; c.role = 'priest';
      c.career = {profession:'priest',experience:10};
      c.religion = p.religion = 'orthodox';
      FB.spousesSnapshot(s,c).forEach(function (spouse) { spouse.spouseId = null; });
      c.spouseId = null;
      var spouse = FB.makeCharacter(s,{name:'Fictional spouse',sex:'f',culture:'greek',religion:'orthodox',
        born:1174,role:'farmer',station:1});
      spouse.homeProvinceId = 'constantinople'; spouse.spouseId = c.id; c.spouseId = spouse.id;
      FB.touchFamily();
      var actor = {kind:'character',id:c.id}, greek = 'constantinople_greek_service_1204';
      function admit(iid,role) {
        return FB.religiousInstitutionQuote(s,iid,actor,'admit',{roleId:role});
      }
      var before = JSON.stringify(s), rng = FB.getRngState(), uid = FB.getUidCounter();
      var q = admit(greek,'priest'), pure = before === JSON.stringify(s) && rng === FB.getRngState() && uid === FB.getUidCounter();
      var allowed = q.allowed && FB.religiousInstitutionApply(s,q);
      var greekVow = FB.religiousHouseholdRule(s,c,'priest').unmarried;
      var withdraw = FB.religiousInstitutionQuote(s,greek,actor,'withdraw',{});
      FB.religiousInstitutionApply(s,withdraw);
      c.religion = p.religion = 'catholic';
      var latin = 'constantinople_latin_service_1204', denied = !admit(latin,'priest').allowed;
      var lay = admit(latin,'household');
      var household = lay.allowed && FB.religiousInstitutionApply(s,lay) && !FB.religiousHouseholdRule(s,c,'priest').unmarried;
      c.spouseId = null; spouse.spouseId = null;
      FB.touchFamily();
      var single = admit(latin,'priest'), admitted = single.allowed && FB.religiousInstitutionApply(s,single);
      var latinVow = FB.religiousHouseholdRule(s,c,'priest').unmarried;
      c.role = 'farmer'; c.career.profession = 'farmer';
      var noOrdination = !FB.religiousInstitutionRoleEligibility(s,latin,c.id,'priest');
      return {pure:pure,allowed:allowed,greekVow:greekVow,denied:denied,household:household,
        admitted:admitted,latinVow:latinVow,noOrdination:noOrdination};
    })).toEqual({pure:true,allowed:true,greekVow:false,denied:true,household:true,admitted:true,latinVow:true,noOrdination:true});
  });

test('local minority relief preserves communities, incumbents, papacy and active payment across another opening',
  async function ({page},testInfo) {
    await startDatedChurch(page,testInfo,'800','inhabited_v2_governments_v2','alexandria');
    const saved = await page.evaluate(function () {
      var s = FB.state, c = s.chars[s.player.charId], iid = 'alexandrian_service_800';
      c.religion = s.player.religion = 'eastern'; c.born = 760; s.player.gold = 20;
      var q = FB.religiousInstitutionQuote(s,iid,{kind:'character',id:c.id},'admit',{roleId:'household'});
      if (!q.allowed || !FB.religiousInstitutionApply(s,q)) throw new Error('Admission failed');
      var name = 'alexandrian_relief_800', actor = {kind:'character',id:c.id};
      var before = JSON.stringify(s), rng = FB.getRngState(), uid = FB.getUidCounter();
      var review = FB.religiousActivityQuote(s,name,c.id);
      if (before !== JSON.stringify(s) || rng !== FB.getRngState() || uid !== FB.getUidCounter()) throw new Error('Impure activity review');
      if (!review.allowed || !FB.religiousActivityApply(s,review)) throw new Error('Participation failed');
      if (!FB.createFaith(s,{id:'fictional_christian_reform',name:'Fictional household reform',parent:'eastern',
        icon:'+',relationToParent:'in_fold',properties:{clergyMarriage:true}})) throw new Error('Reform failed');
      if (!FB.startCountyCommunityProject(s,'alexandria',{kind:'faith',target:'eastern',
        sponsor:s.owner.alexandria,policy:'integrative'})) throw new Error('Project failed');
      var text = FB.save.serialize(), packed = JSON.parse(text).state;
      return {text:text,gold:s.player.gold,activity:JSON.stringify(c.religiousActivity),
        protected:[packed.religiousHeads,packed.religiousHeadVacancies,packed.papacy || null,packed.authority,
          packed.population,packed.faiths,packed.churchCouncils || null,packed.rulerFaithDecisions || null,
          packed.chars[packed.player.charId].career]};
    });
    await startDatedChurch(page,testInfo,'1204','inhabited_v2','constantinople');
    await restoreBookmark(page,saved.text);
    const result = await page.evaluate(function (saved) {
      var s = FB.state, c = s.chars[s.player.charId];
      var packed = JSON.parse(FB.save.serialize()).state;
      var protectedFacts = [packed.religiousHeads,packed.religiousHeadVacancies,packed.papacy || null,packed.authority,
        packed.population,packed.faiths,packed.churchCouncils || null,packed.rulerFaithDecisions || null,
        packed.chars[packed.player.charId].career];
      var restored = saved.activity === JSON.stringify(c.religiousActivity);
      var gold = s.player.gold, piety = s.player.piety;
      s.turn = c.religiousActivity.dueTurn; FB.religiousActivityTick(s);
      var completed = !c.religiousActivity && s.player.piety === piety + 1;
      return {protected:protectedFacts,restored:restored,gold:saved.gold === gold && gold === 18 && s.player.gold === gold,
        completed:completed,repeat:!FB.religiousActivityQuote(s,'alexandrian_relief_800',c.id).allowed,
        opening:s.start.id,absent:!s.localInstitutions.constantinople_greek_service_1204};
    },saved);
    expect(result.protected).toEqual(saved.protected);
    expect(result).toMatchObject({restored:true,gold:true,completed:true,repeat:true,opening:'800',absent:true});
  });


test('Samarkand service is local and voluntary while later AI creates no unverified clergy or recognition',
  async function ({page},testInfo) {
    await startDatedChurch(page,testInfo,'800','inhabited_v2_governments_v2','samarkand');
    expect(await page.evaluate(function () {
      var s = FB.state, c = s.chars[s.player.charId], iid = 'samarkand_service_800';
      var population = JSON.stringify(s.population), heads = JSON.stringify(s.religiousHeads);
      c.religion = s.player.religion = 'east_syriac'; c.born = 760; s.player.gold = 20;
      var q = FB.religiousInstitutionQuote(s,iid,{kind:'character',id:c.id},'admit',{roleId:'household'});
      var entered = q.allowed && FB.religiousInstitutionApply(s,q);
      var activity = FB.religiousActivityQuote(s,iid,c.id);
      s.player.provinceId = 'baghdad';
      var stale = !FB.religiousActivityApply(s,activity), gold = s.player.gold;
      s.player.provinceId = 'samarkand';
      var people = Object.keys(s.chars).sort().join(','), supports = JSON.stringify(s.authority.recognitions);
      s.turn = 90;
      var actions = FB.religiousInstitutionAI(s), again = FB.religiousInstitutionAI(s);
      return {entered:entered,offered:activity.allowed,stale:stale,unpaid:gold === 20 && s.player.gold === gold,
        actions:actions,again:again,unseeded:people === Object.keys(s.chars).sort().join(',') &&
          supports === JSON.stringify(s.authority.recognitions),
        unchanged:population === JSON.stringify(s.population) && heads === JSON.stringify(s.religiousHeads)};
    })).toEqual({entered:true,offered:true,stale:true,unpaid:true,actions:0,again:0,unseeded:true,unchanged:true});
  });

test('existing councils, official profession and their support restore without replay or primary-faith migration',
  async function ({page},testInfo) {
    await startEarly(page,testInfo);
    const result = await page.evaluate(function () {
      var s = FB.state; FB.treasuryTransfer(s,null,'italy',500);
      // The historical incumbent is fifteen. This fixture exercises the
      // adult ruler's council and profession, not the minority restriction.
      var ruler = FB.realmRulerCharacter(s,'italy');
      ruler.born = s.date.year - 30;
      s.realms.italy.ruler.born = ruler.born; s.realms.italy.ruler.age = 30;
      ruler.religion = s.realms.italy.religion = s.authority.governments.italy.eliteFaithId = 'homoian';
      var before = JSON.stringify(s), rng = FB.getRngState(), uid = FB.getUidCounter();
      var q = FB.churchCouncilQuote(s,'italy','nicene');
      var pure = before === JSON.stringify(s) && rng === FB.getRngState() && uid === FB.getUidCounter();
      var held = JSON.stringify([s.owner,s.holder]);
      var result = FB.conveneChurchCouncil(s,q);
      var conversion = FB.rulerFaithConversionStatus(s,'italy','nicene');
      var professed = FB.applyRulerFaithConversion(s,'italy','nicene',conversion);
      function facts(packed) { return [packed.churchCouncils,packed.rulerFaithDecisions,packed.authority,packed.religiousHeads,
        packed.population,packed.player.profession,packed.chars[packed.player.charId].career,packed.treasuryAccounting]; }
      var save = FB.save.serialize(), original = facts(JSON.parse(save).state);
      FB.save.restore(JSON.parse(save)); s = FB.state;
      var restored = facts(JSON.parse(FB.save.serialize()).state);
      var repeatBefore = JSON.stringify(s);
      var repeated = FB.conveneChurchCouncil(s,q);
      return {pure:pure,council:!!result,professed:professed,original:original,restored:restored,
        once:repeated === null && repeatBefore === JSON.stringify(s),
        held:held === JSON.stringify([s.owner,s.holder]),east:FB.religiousOfficeSnapshot(s,'east_syriac_catholicos').name};
    });
    expect(result.restored).toEqual(result.original);
    expect(result).toMatchObject({pure:true,council:true,professed:true,once:true,held:true,east:'Babowai'});
  });
