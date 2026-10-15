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
  'data/african_religious_rollout.js','data/islamic_profiles.js',
  'data/geographies.js','data/geography_expansion.js','data/settlements.js',
  'data/bookmark_476.js','data/bookmark_493.js','data/bookmark_711.js','data/bookmark_800.js',
  'data/bookmark_1204.js',
  'js/model.js','js/world.js','js/economy.js','js/population.js',
  'js/bookmark_setup.js','js/government_lineage.js','js/religion.js',
  'js/mods.js','js/save.js','js/save_v4.js','js/main.js','js/crazygames.js',
  'data/religious_institutions.js','data/religious_activities.js','data/technology.js',
  'data/political_institutions.js','data/systems.js','js/religious_institutions.js',
  'js/religious_activities.js','js/authority.js','js/institutions.js','js/treasury.js',
  'js/abbeys.js','js/settlement.js','js/governments.js','js/modifiers.js',
  'js/justice.js','js/intrigue.js','js/systems.js','js/station.js','js/wars.js',
  'data/modifiers.js','js/technology.js'
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

async function startAfricanPlay(page,info,date,property,crazygames) {
  const revision = date === '476' ? 'wider_v2' : date === '493' ? 'world_v2' : CURRENT;
  const pid = date === '1066' ? 'kumbi_district' : 'garama';
  await page.addInitScript(function (input) {
    document.addEventListener('DOMContentLoaded',function () {
      FBDATA.bookmarks[input.date].revision = input.revision;
      FBDATA.bookmarks[input.date].hidden = false;
    },{once:true});
  },{date:date,revision:revision});
  await startHistoricalGame(page,info,{bookmark:date,
    code:'AFRICANPLAY' + date + '-' + date + '-' + (date === '476' || date === '493' ? 'farmer_' + date : 'farmer') +
      '-' + pid + '-f-Review-established' +
      (date === '1066' ? '-0-soninke_1066.sunni' : '')},crazygames);
  await page.evaluate(installAfricanPlaySeat,property);
}

/* Fictional seats exercise shipped profiles without accepting historical site bindings. */
function installAfricanPlaySeat(property) {
  var s = FB.state, c = s.chars[s.player.charId], pid = s.player.provinceId;
  var ghana = s.start.id === '1066';
  var iid = ghana ? 'ghana_muslim_congregation_1066' : 'garama_offering_community_' + s.start.id;
  var profile = ghana ? 'ghana_muslim_learning_1066' : 'garama_offering_community';
  var faith = ghana ? 'sunni' : 'berber_traditional';
  if (c.religion !== faith) throw new Error('Expected the independently selected household community.');
  c.born = s.date.year - 30; c.health = 8; c.skills.int = 4;
  s.player.gold = 100; s.player.piety = 0; s.player.prestige = 0; s.player.travel = null;
  var defs = Object.assign({},FB.campaignBookmark(s).localInstitutions || {});
  defs[iid] = {city:'Fictional local review community',kind:ghana ? 'congregation' : 'ritual_community',
    provinceId:pid,site:FB.world.sitesByProv[pid].list[0].site,religion:faith,culture:c.culture,
    profileId:profile,vacant:true,jurisdictionIds:[pid]};
  if (property) defs[iid].abbeyId = 'test_ghana_learning_property';
  var raw = FBDATA.bookmarks[s.start.id];
  raw.revisions[s.start.revision].localInstitutions = defs;
  s.localInstitutions = s.localInstitutions || {};
  s.localInstitutions[iid] = FB.religiousInstitutionOpeningRow(iid,defs[iid]);
  window.africanPlay = {iid:iid,pid:pid,cid:c.id,role:ghana ? 'learner' : 'participant',
    activity:ghana ? 'ghana_muslim_household_learning_1066' : 'garama_funeral_offerings_' + s.start.id};
  window.foundAfricanLearningHouse = function () {
    var s = FB.state, f = africanPlay;
    FB.setPlayerTier(s,1,{stationFarewell:false});
    s.player.manor = null; s.player.landPlotMigration = 1;
    s.player.landPlots = [{provinceId:f.pid,settlement:0},{provinceId:f.pid,settlement:0}];
    var q = FB.religiousPatronageQuote(s,'ghana_muslim_learning_support_1066',f.cid,
      'foundation',{land:{provinceId:f.pid,settlement:0,count:2}});
    if (!q || !q.allowed || !FB.religiousPatronageApply(s,q)) throw new Error('Foundation: ' + (q && q.reason));
    var admission = FB.religiousInstitutionQuote(s,f.iid,{kind:'character',id:f.cid},'admit',{roleId:'learner'});
    if (!admission.allowed || !FB.religiousInstitutionApply(s,admission)) throw new Error('Lay admission failed.');
    return s.abbeys.houses.find(function (h) { return h.activityInstitutionId === f.iid; });
  };
}

test('African communal catalogues validate purely and retain earlier worlds without new seats',
  async function ({page},info) {
    await openGame(page,info);
    expect(await page.evaluate(function () {
      var before = JSON.stringify(FBDATA), rng = FB.getRngState(), uid = FB.getUidCounter();
      var ids = ['garama_offering_community_476','garama_offering_community_493','ghana_muslim_congregation_1066'];
      var absent = ['476','493','711','800','867','1066','1204'].every(function (date) {
        var b = FBDATA.bookmarks[date], revisions = b.revisions ? Object.keys(b.revisions).filter(function (id) {
          return !/_african_v1$/.test(id);
        }) : [null];
        return revisions.every(function (revision) {
          var defs = FB.bookmark(date,revision).localInstitutions || {};
          return ids.every(function (id) { return !defs[id]; });
        });
      });
      return {institutions:FB.religiousInstitutionCatalogFaults(FBDATA),
        activities:FB.religiousActivityCatalogFaults(FBDATA),absent:absent,
        pure:before === JSON.stringify(FBDATA) && rng === FB.getRngState() && uid === FB.getUidCounter(),
        technology:['african_lay_community_participation','ghana_local_learning_service',
          'ghana_local_learning_support'].map(function (id) { return FBDATA.techImpactReviews.features[id].mode; })};
    })).toEqual({institutions:[],activities:[],absent:true,pure:true,technology:['none','none','none']});
  });

for (const date of ['476','493']) test('Garama ' + date + ' offers poor households a headless local action with one receipt',
  async function ({page},info) {
    await startAfricanPlay(page,info,date,false,false);
    expect(await page.evaluate(function () {
      var s = FB.state, f = africanPlay, c = s.chars[f.cid];
      s.player.gold = 1; s.player.landPlots = [];
      var retained = JSON.stringify([c.religion,c.career,s.player.profession,s.religiousHeads,s.owner,s.holder,
        s.population,s.abbeys,FB.systemAvailable(s,'abbeys'),FB.systemAvailable(s,'papacy')]);
      var before = JSON.stringify(s), rng = FB.getRngState(), uid = FB.getUidCounter();
      var q = FB.religiousActivityQuote(s,f.activity,f.cid);
      var pure = before === JSON.stringify(s) && rng === FB.getRngState() && uid === FB.getUidCounter();
      var noCareer = !FB.religiousCareerReview(s,c,'monk',true).allowed;
      var started = FB.religiousActivityApply(s,q);
      s.turn++; FB.religiousActivityTick(s);
      return {pure:pure,started:started,gold:s.player.gold,piety:s.player.piety,
        receipt:c.religiousActivityHistory.garama_funeral_offering.performed,
        repeat:FB.religiousActivityQuote(s,f.activity,f.cid).reason,noCareer:noCareer,
        retained:retained === JSON.stringify([c.religion,c.career,s.player.profession,s.religiousHeads,s.owner,s.holder,
          s.population,s.abbeys,FB.systemAvailable(s,'abbeys'),FB.systemAvailable(s,'papacy')]),
        member:Object.keys(s.localInstitutions[f.iid].members).length};
    })).toEqual({pure:true,started:true,gold:0,piety:1,receipt:true,repeat:'commitment',
      noCareer:true,retained:true,member:0});
  });

test('Garama access, date and revision changes reject review without payment or conversion',
  async function ({page},info) {
    await startAfricanPlay(page,info,'476',false,false);
    expect(await page.evaluate(function () {
      var s = FB.state, f = africanPlay, d = FBDATA.religiousActivities[f.activity];
      var q = FB.religiousActivityQuote(s,f.activity,f.cid), outcomes = [];
      [function () { s.start.revision = 'baseline'; },
        function () { s.date.year = 494; },
        function () { s.localInstitutions[f.iid].status = 'suspended'; },
        function () { s.owner[f.pid] = 'player'; }].forEach(function (change) {
          var prior = {revision:s.start.revision,year:s.date.year,status:s.localInstitutions[f.iid].status,owner:s.owner[f.pid]};
          change(); var before = JSON.stringify(s);
          outcomes.push(!FB.religiousActivityQuote(s,f.activity,f.cid).allowed &&
            !FB.religiousActivityApply(s,q) && before === JSON.stringify(s));
          s.start.revision = prior.revision; s.date.year = prior.year;
          s.localInstitutions[f.iid].status = prior.status; s.owner[f.pid] = prior.owner;
        });
      var before = JSON.stringify(s), different = FB.religiousActivityQuote(s,'garama_funeral_offerings_493',f.cid);
      return {outcomes:outcomes,separate:!different.allowed && !FB.religiousActivityApply(s,different) &&
        before === JSON.stringify(s),calendar:d.calendar,journey:d.siteId};
    })).toEqual({outcomes:[true,true,true,true],separate:true,calendar:'any_day',journey:null});
  });

test('Ghana minority households learn without wealth, land, clerical admission or manuscript technology',
  async function ({page},info) {
    await startAfricanPlay(page,info,'1066',false,false);
    expect(await page.evaluate(function () {
      var s = FB.state, f = africanPlay, c = s.chars[f.cid];
      s.player.gold = 0; s.player.landPlots = [];
      FB.realmTechRecord(s).completed = FB.techList(s).filter(function (id) { return id !== 'manuscript_codex'; });
      var before = JSON.stringify([s.population,s.owner,s.holder,s.realms.wagadu_1066.religion,
        s.religiousHeads,c.career,s.player.profession,FB.religiousPathOf(s,c),s.abbeys]);
      var actor = {kind:'character',id:c.id};
      var specialist = FB.religiousInstitutionQuote(s,f.iid,actor,'admit',{roleId:'custodian'});
      var judge = FB.religiousInstitutionQuote(s,f.iid,actor,'mediate',{
        subject:actor,provinceId:f.pid,source:'institution_support'});
      var started = FB.religiousActivityApply(s,FB.religiousActivityQuote(s,f.activity,c.id));
      s.turn++; FB.religiousActivityTick(s);
      return {started:started,spent:s.player.gold,piety:s.player.piety,
        noOffice:!specialist.allowed && !judge.allowed,
        retained:before === JSON.stringify([s.population,s.owner,s.holder,s.realms.wagadu_1066.religion,
          s.religiousHeads,c.career,s.player.profession,FB.religiousPathOf(s,c),s.abbeys]),
        court:s.realms.wagadu_1066.religion,household:c.religion,skill:c.skills.int,
        manuscript:FB.hasTech(s,'manuscript_codex')};
    })).toEqual({started:true,spent:0,piety:1,noOffice:true,retained:true,
      court:'ghana_local_practice_1066',household:'sunni',skill:4,manuscript:false});
  });

test('Ghana gifts conserve property and a qualified local lesson consumes one prepaid service',
  async function ({page},info) {
    await startAfricanPlay(page,info,'1066',true,false);
    expect(await page.evaluate(function () {
      var s = FB.state, f = africanPlay, h = foundAfricanLearningHouse();
      var missing = FB.religiousActivityQuote(s,'ghana_mosque_learning_service_1066',f.cid).reason;
      var c = s.chars[f.cid], gold = s.player.gold;
      var gift = FB.religiousPatronageQuote(s,'ghana_muslim_learning_support_1066',f.cid,
        'donation',{fund:'learning',amount:3});
      var given = FB.religiousPatronageApply(s,gift), repeat = FB.religiousPatronageApply(s,gift);
      var q = FB.religiousActivityQuote(s,'ghana_mosque_learning_service_1066',f.cid);
      var started = FB.religiousActivityApply(s,q);
      var early = FB.religiousActivityFinish(s,f.cid,false);
      s.turn += 2; FB.religiousActivityTick(s);
      var withdrawn = FB.religiousInstitutionApply(s,FB.religiousInstitutionQuote(s,f.iid,
        {kind:'character',id:f.cid},'withdraw',{}));
      return {missing:missing,given:given,repeat:repeat,started:started,early:early,
        giftCost:gold - s.player.gold,skill:c.skills.int,spent:h.activitySpent,fund:h.restrictedFunds.learning,
        conserved:s.player.gold + h.capital + h.treasury + h.activitySpent + h.restrictedFunds.learning === 100,
        plots:h.plots[0].count,householdPlots:s.player.landPlots.length,
        withdrawn:withdrawn,property:s.abbeys.houses.indexOf(h) >= 0,
        member:s.localInstitutions[f.iid].members[f.cid].status};
    })).toEqual({missing:'service',given:true,repeat:false,started:true,early:false,giftCost:3,
      skill:5,spent:5,fund:0,conserved:true,plots:2,householdPlots:0,
      withdrawn:true,property:true,member:'withdrawn'});
  });

test('Ghana cross-faith donors retain identity and stale gifts cannot change restricted property',
  async function ({page},info) {
    await startAfricanPlay(page,info,'1066',true,false);
    expect(await page.evaluate(function () {
      var s = FB.state, f = africanPlay, h = foundAfricanLearningHouse();
      s.chars[f.cid].religion = 'ghana_local_practice_1066';
      var identities = JSON.stringify([s.population,s.owner,s.holder,s.religiousHeads,s.chars[f.cid].religion]);
      var q = FB.religiousPatronageQuote(s,'ghana_muslim_learning_support_1066',f.cid,
        'donation',{fund:'learning',amount:3});
      s.player.gold--; var before = JSON.stringify(s), stale = !FB.religiousPatronageApply(s,q);
      var unchanged = before === JSON.stringify(s);
      var fresh = FB.religiousPatronageQuote(s,'ghana_muslim_learning_support_1066',f.cid,
        'donation',{fund:'learning',amount:3});
      var applied = FB.religiousPatronageApply(s,fresh);
      var denied = !FB.religiousActivityQuote(s,'ghana_mosque_learning_service_1066',f.cid).allowed;
      return {stale:stale,unchanged:unchanged,applied:applied,fund:h.restrictedFunds.learning,denied:denied,
        identities:identities === JSON.stringify([s.population,s.owner,s.holder,s.religiousHeads,s.chars[f.cid].religion]),
        recipient:h.religion};
    })).toEqual({stale:true,unchanged:true,applied:true,fund:3,denied:true,identities:true,recipient:'sunni'});
  });

test('loss of protected worship interrupts Ghana learning while gifts and minority population remain',
  async function ({page},info) {
    await startAfricanPlay(page,info,'1066',true,false);
    expect(await page.evaluate(function () {
      var s = FB.state, f = africanPlay, h = foundAfricanLearningHouse();
      FB.religiousPatronageApply(s,FB.religiousPatronageQuote(s,'ghana_muslim_learning_support_1066',f.cid,
        'donation',{fund:'learning',amount:3}));
      var property = JSON.stringify(h), population = JSON.stringify(s.population), c = s.chars[f.cid];
      var started = FB.religiousActivityApply(s,FB.religiousActivityQuote(s,'ghana_mosque_learning_service_1066',f.cid));
      FB.addModifier(s,'persecuted_minorities',f.pid,{silent:true});
      var blocked = !FB.religiousActivityQuote(s,f.activity,f.cid).allowed;
      s.turn += 2; FB.religiousActivityTick(s);
      return {started:started,blocked:blocked,canceled:!c.religiousActivity,skill:c.skills.int,
        receipt:!c.religiousActivityHistory,property:property === JSON.stringify(h),
        population:population === JSON.stringify(s.population),faith:c.religion};
    })).toEqual({started:true,blocked:true,canceled:true,skill:4,receipt:true,
      property:true,population:true,faith:'sunni'});
  });

test('Ghana outreach supports one existing voluntary project without a second conversion path',
  async function ({page},info) {
    await startAfricanPlay(page,info,'1066',true,false);
    expect(await page.evaluate(function () {
      var s = FB.state, f = africanPlay, h = foundAfricanLearningHouse();
      s.owner[f.pid] = 'player'; s.holder[f.pid] = 'player';
      FB.foundPlayerRealm(s); s.realms.player.liege = null; // the household now rules this county
      var rec = s.population.counties[f.pid], communities = JSON.stringify(rec.communities);
      rec.communityProjects = {faith:{target:'sunni',sponsor:'player',policy:'voluntary',startTurn:s.turn,
        progress:0.375,converted:12,resistance:0.2,lastTransfer:2,lastYear:s.date.year}};
      var p = rec.communityProjects.faith, terms = {fund:'learning',amount:3,provinceId:f.pid,
        settlement:null,target:'sunni',policy:'voluntary'};
      var q = FB.religiousPatronageQuote(s,'ghana_muslim_learning_support_1066',f.cid,'outreach',terms);
      var started = FB.religiousPatronageApply(s,q), repeat = FB.religiousPatronageApply(s,q);
      var after = JSON.stringify(s), rejected = FB.religiousPatronageQuote(s,'ghana_muslim_learning_support_1066',f.cid,
        'outreach',Object.assign({},terms,{target:'ghana_local_practice_1066'}));
      return {started:started,repeat:repeat,progress:p.progress,converted:p.converted,spent:h.activitySpent,
        support:p.activitySupport.amount,communities:communities === JSON.stringify(rec.communities),
        mismatch:!rejected.allowed && !FB.religiousPatronageApply(s,rejected) && after === JSON.stringify(s)};
    })).toEqual({started:true,repeat:false,progress:0.375,converted:12,spent:5,support:3,
      communities:true,mismatch:true});
  });

test('Ghana public patronage uses the local-practice ruler account and respects reserve and quarterly limits',
  async function ({page},info) {
    await startAfricanPlay(page,info,'1066',true,false);
    expect(await page.evaluate(function () {
      var s = FB.state, f = africanPlay, h = foundAfricanLearningHouse(), rid = 'wagadu_1066';
      FB.treasuryInitialize(s); s.treasuryAccounting.mode = 'active';
      var c = FB.realmRulerCharacterSnapshot(s,rid);
      c.health = 8; c.born = s.date.year - 30;
      s.realms[rid].treasury.gold = 30; s.realms[rid].treasury.militaryAccrued = 0;
      var realms = Object.keys(s.realms).sort(), period = 1;
      for (; period <= realms.length; period++) {
        var offset = period * 16 % realms.length;
        if (Array.from({length:Math.min(16,realms.length)},function (_,i) {
          return realms[(offset + i) % realms.length];
        }).indexOf(rid) >= 0) break;
      }
      s.turn = period * 90;
      var purse = s.player.gold, gold = FB.treasuryAvailable(s,rid), houses = s.abbeys.houses.length;
      var q = FB.religiousPatronageQuote(s,'ghana_public_learning_support_1066',c.id,
        'donation',{fund:'learning',amount:3});
      var applied = FB.religiousActivityAI(s), repeat = FB.religiousActivityAI(s);
      var spent = gold - FB.treasuryAvailable(s,rid);
      s.realms[rid].treasury.gold = 10;
      var blocked = FB.religiousPatronageQuote(s,'ghana_public_learning_support_1066',c.id,
        'donation',{fund:'learning',amount:3});
      return {eligible:q.allowed,payer:q.payer.id === rid,applied:applied,repeat:repeat,
        spent:spent,fund:h.restrictedFunds.learning,ownPurse:purse === s.player.gold,
        reserve:!blocked.allowed,faith:c.religion,houses:s.abbeys.houses.length === houses};
    })).toEqual({eligible:true,payer:true,applied:1,repeat:0,spent:3,fund:3,
      ownPurse:true,reserve:true,faith:'ghana_local_practice_1066',houses:true});
  });

function africanPlayFacts() {
  var s = FB.state, f = africanPlay;
  // Saves omit a zero faith Standing base; absent and zero have the same meaning.
  var person = Object.assign({faithStandingBase:0},s.chars[f.cid]);
  return JSON.parse(JSON.stringify({start:s.start,date:s.date,turn:s.turn,
    rng:FB.getRngState() >>> 0,uid:FB.getUidCounter(),person:person,
    purse:[s.player.gold,s.player.piety,s.player.prestige,s.player.landPlots],
    property:s.abbeys,population:s.population,owner:s.owner,holder:s.holder,
    institution:s.localInstitutions[f.iid],heads:s.religiousHeads,faiths:s.faiths,
    court:s.realms.wagadu_1066.religion}));
}

for (const crazygames of [false,true]) test('Ghana learning retains its community, prepaid property and commitment on restore, CrazyGames ' + crazygames,
  async function ({page},info) {
    await startAfricanPlay(page,info,'1066',true,crazygames);
    const saved = await page.evaluate(function () {
      var s = FB.state, f = africanPlay; foundAfricanLearningHouse();
      FB.religiousPatronageApply(s,FB.religiousPatronageQuote(s,'ghana_muslim_learning_support_1066',f.cid,
        'donation',{fund:'learning',amount:6}));
      FB.religiousActivityApply(s,FB.religiousActivityQuote(s,f.activity,f.cid));
      s.turn++; FB.religiousActivityTick(s);
      if (!FB.religiousActivityApply(s,FB.religiousActivityQuote(s,'ghana_mosque_learning_service_1066',f.cid))) {
        throw new Error('Expected a funded commitment.');
      }
      FB.validateReligiousActivityState(s);
      return FB.save.serialize();
    });
    const before = await page.evaluate(africanPlayFacts);
    await page.evaluate(function () { FB.state.turn += 2; FB.religiousActivityTick(FB.state); });
    const after = await page.evaluate(africanPlayFacts);
    expect(after.person.skills.int).toBe(5);
    expect(after.person.religiousActivityHistory.ghana_funded_learning_1066.performed).toBe(true);
    await page.evaluate(function () {
      return new Promise(function (resolve,reject) {
        FB.activateBookmark('1204',null,function (error) { if (error) reject(error); else resolve(); });
      });
    });
    await restoreBookmark(page,saved);
    expect(await page.evaluate(africanPlayFacts)).toEqual(before);
    await page.evaluate(function () { FB.state.turn += 2; FB.religiousActivityTick(FB.state); });
    expect(await page.evaluate(africanPlayFacts)).toEqual(after);
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

const AFRICAN_DATED = [
  {id:'476',prior:'wider_v2',pid:'garama',iid:'garama_offering_community_476',
    activity:'garama_funeral_offerings_476',faith:'berber_traditional',role:'participant'},
  {id:'493',prior:'world_v2',pid:'garama',iid:'garama_offering_community_493',
    activity:'garama_funeral_offerings_493',faith:'berber_traditional',role:'participant'},
  {id:'711',prior:'terrain_v2_governments_v2',pid:'kairouan',iid:'kairouan_muslim_congregation_711',
    activity:'kairouan_household_worship_711',faith:'umayyad_sunni_711',role:'participant'},
  {id:'800',prior:'inhabited_v2_governments_v2',pid:'kairouan',iid:'kairouan_muslim_congregation_800',
    activity:'kairouan_household_worship_800',faith:'sunni',role:'participant'},
  {id:'867',prior:'inhabited_v2_governments_v2',pid:'kairouan',iid:'kairouan_muslim_congregation_867',
    activity:'kairouan_household_worship_867',faith:'sunni',role:'participant'},
  {id:'1066',prior:'inhabited_v2_governments_v2',pid:'kumbi_district',iid:'ghana_muslim_congregation_1066',
    activity:'ghana_muslim_household_learning_1066',faith:'sunni',role:'learner',identity:'soninke_1066.sunni'},
  {id:'1204',prior:'inhabited_v2',pid:'gao_district',iid:'gao_muslim_congregation_1204',
    activity:'gao_household_worship_1204',faith:'sunni',role:'participant',identity:'sahelian_476.sunni'}
];

async function startAfricanDated(page,info,row,crazygames,retained) {
  await page.addInitScript(function (input) {
    document.addEventListener('DOMContentLoaded',function () {
      FBDATA.bookmarks[input.id].revision = input.revision;
      FBDATA.bookmarks[input.id].hidden = false; // Isolated owner-review journey.
    },{once:true});
  },{id:row.id,revision:row.prior + (retained ? '' : '_african_v1')});
  await startHistoricalGame(page,info,{bookmark:row.id,
    code:'AFRICANDATED' + row.id + '-' + row.id + '-' + (row.id === '476' || row.id === '493' ? 'farmer_' + row.id : 'farmer') +
      '-' + row.pid + '-f-Review-established' +
      (row.identity ? '-0-' + row.identity : '')},crazygames);
}

function africanDatedFacts(row) {
  const s = FB.state, c = s.chars[s.player.charId], county = s.population.counties[row.pid];
  return JSON.parse(JSON.stringify({start:s.start,turn:s.turn,date:s.date,
    religion:c.religion,career:c.career,profession:s.player.profession,
    gold:s.player.gold,piety:s.player.piety,commitment:c.religiousActivity,
    history:c.religiousActivityHistory,affiliations:c.religiousAffiliations,
    institution:s.localInstitutions[row.iid],heads:s.religiousHeads,
    communities:FB.countyCommunities(s,row.pid),count:county.count,
    owner:s.owner[row.pid],holder:s.holder[row.pid],property:s.abbeys,
    rng:FB.getRngState() >>> 0,uid:FB.getUidCounter()}));
}

test('seven African review openings preserve complete earlier worlds and validate fresh bounds purely',
  async function ({page},info) {
    await openGame(page,info);
    expect(await page.evaluate(function (rows) {
      const before = JSON.stringify(FBDATA), rng = FB.getRngState(), uid = FB.getUidCounter();
      const results = rows.map(function (row) {
        const revision = row.prior + '_african_v1', raw = FBDATA.bookmarks[row.id];
        const revised = FB.bookmark(row.id,revision), d = revised.localInstitutions[row.iid];
        const preserved = Object.keys(raw.revisions).filter(function (id) {
          return /_african_v1$/.test(id);
        }).every(function (id) {
          const prior = FB.bookmark(row.id,id.replace(/_african_v1$/,'')), next = FB.bookmark(row.id,id);
          const a = Object.assign({},prior), b = Object.assign({},next);
          delete a.revision; delete b.revision; delete a.localInstitutions; delete b.localInstitutions;
          // a world without its own table starts empty, never with the legacy 476 catalogue
          const existing = prior.localInstitutions || {};
          const unchanged = Object.assign({},next.localInstitutions); delete unchanged[row.iid];
          return JSON.stringify(a) === JSON.stringify(b) && JSON.stringify(existing) === JSON.stringify(unchanged);
        });
        const site = (FB.geography(FB.bookmarkGeography(revised)).sites || FBDATA.settlementSites)[d.site];
        const selected = raw.revision;
        let faults;
        try { raw.revision = revision; faults = FB.validateBookmark(revised); }
        finally { raw.revision = selected; }
        return !faults.length && preserved && d.provinceId === row.pid &&
          d.religion === row.faith && d.vacant && d.freshOnly && !d.officeId && !d.representative &&
          site.x >= -11 && site.x <= 70 && site.y >= 13 && site.y <= 66 &&
          !/_african_v1$/.test(raw.revision);
      });
      return {results:results,institutions:FB.religiousInstitutionCatalogFaults(FBDATA),
        activities:FB.religiousActivityCatalogFaults(FBDATA),
        pure:before === JSON.stringify(FBDATA) && rng === FB.getRngState() && uid === FB.getUidCounter()};
    },AFRICAN_DATED)).toEqual({results:[true,true,true,true,true,true,true],institutions:[],activities:[],pure:true});
  });

for (const row of AFRICAN_DATED) {
  for (const crazygames of [false,true]) {
    test(row.id + ' placed lay activity and membership retain minorities and restore, CrazyGames ' + crazygames,
      async function ({page},info) {
        await startAfricanDated(page,info,row,crazygames,false);
        expect(await page.evaluate(function (row) {
          const s = FB.state, c = s.chars[s.player.charId];
          c.born = s.date.year - 30; c.health = 8;
          s.player.gold = row.id === '476' || row.id === '493' ? 1 : 0;
          s.player.piety = 0; s.player.landPlots = [];
          const ins = FB.religiousInstitutionSnapshot(s,row.iid), faith = c.religion;
          const population = JSON.stringify([s.population.counties[row.pid],s.realms,s.owner,s.holder,s.religiousHeads]);
          const preview = FB.religiousActivityQuote(s,row.activity,c.id), year = s.date.year;
          s.date.year = year + 1;
          let unchanged = JSON.stringify(s);
          const dated = !FB.religiousActivityQuote(s,row.activity,c.id).allowed &&
            !FB.religiousActivityApply(s,preview) && unchanged === JSON.stringify(s);
          s.date.year = year;
          s.player.provinceId = 'constantinople';
          unchanged = JSON.stringify(s);
          const local = !FB.religiousActivityQuote(s,row.activity,c.id).allowed &&
            !FB.religiousActivityApply(s,preview) && unchanged === JSON.stringify(s);
          s.player.provinceId = row.pid;
          const q = FB.religiousInstitutionQuote(s,row.iid,{kind:'character',id:c.id},'admit',{roleId:row.role});
          const admitted = q.allowed && FB.religiousInstitutionApply(s,q);
          const before = JSON.stringify(s), rng = FB.getRngState(), uid = FB.getUidCounter();
          const activity = FB.religiousActivityQuote(s,row.activity,c.id);
          const pure = before === JSON.stringify(s) && rng === FB.getRngState() && uid === FB.getUidCounter();
          const started = activity.allowed && FB.religiousActivityApply(s,activity);
          return {placed:!!ins && ins.definition.provinceId === row.pid,empty:Object.keys(ins.members).length === 0,
            admitted:admitted,started:started,pure:pure,dated:dated,local:local,faith:faith,
            conserved:population === JSON.stringify([s.population.counties[row.pid],s.realms,s.owner,s.holder,s.religiousHeads]),
            careerGrant:!!FBDATA.religiousInstitutionProfiles[ins.definition.profileId].roles[row.role].careerIds,
            historicalProperty:!!ins.property};
        },row)).toEqual({placed:true,empty:true,admitted:true,started:true,pure:true,dated:true,local:true,faith:row.faith,
          conserved:true,careerGrant:false,historicalProperty:false});
        const before = await page.evaluate(africanDatedFacts,row);
        const saved = await page.evaluate(function () { return FB.save.serialize(); });
        await page.evaluate(function (row) {
          FBDATA.bookmarks[row.id].revision = row.prior;
          return new Promise(function (resolve,reject) {
            FB.activateBookmark(row.id === '1204' ? '867' : '1204',null,function (error) {
              if (error) reject(error); else resolve();
            });
          });
        },row);
        await restoreBookmark(page,saved);
        expect(await page.evaluate(africanDatedFacts,row)).toEqual(before);
        expect(await page.evaluate(function (row) {
          const s = FB.state, c = s.chars[s.player.charId], d = FBDATA.religiousActivities[row.activity];
          const population = JSON.stringify(s.population.counties[row.pid]);
          s.turn += d.duration; FB.religiousActivityTick(s);
          const mix = FB.countyCommunities(s,row.pid);
          return {completed:c.religiousActivityHistory[d.milestone].performed,
            repeated:FB.religiousActivityQuote(s,row.activity,c.id).reason,
            piety:s.player.piety,unchanged:population === JSON.stringify(s.population.counties[row.pid]),
            conserved:mix.reduce(function (n,v) { return n + v.count; },0) === s.population.counties[row.pid].count};
        },row)).toEqual({completed:true,repeated:'commitment',piety:1,unchanged:true,conserved:true});
      });
  }
}

test('placed Ghana membership needs no endowment and giving requires real property',
  async function ({page},info) {
    const row = AFRICAN_DATED.find(function (r) { return r.id === '1066'; });
    await startAfricanDated(page,info,row,false,false);
    expect(await page.evaluate(function (row) {
      const s = FB.state, c = s.chars[s.player.charId];
      c.born = s.date.year - 30; s.player.gold = 0; s.player.landPlots = [];
      const d = FB.localInstitutionDefinitions(s)[row.iid], before = JSON.stringify(s);
      const gift = FB.religiousPatronageQuote(s,'ghana_muslim_learning_support_1066',c.id,'donation',{fund:'learning',amount:3});
      const foundation = FB.religiousPatronageQuote(s,'ghana_muslim_learning_support_1066',c.id,
        'foundation',{land:{provinceId:row.pid,settlement:0,count:1}});
      const pure = before === JSON.stringify(s);
      const q = FB.religiousInstitutionQuote(s,row.iid,{kind:'character',id:c.id},'admit',{roleId:'learner'});
      const joined = q.allowed && FB.religiousInstitutionApply(s,q);
      const withdrawn = FB.religiousInstitutionApply(s,FB.religiousInstitutionQuote(s,row.iid,{kind:'character',id:c.id},'withdraw'));
      return {namedProperty:!!d.abbeyId,missingProperty:!FB.religiousInstitutionSnapshot(s,row.iid).property,
        gift:gift.reason,foundation:foundation.reason,pure:pure,joined:joined,withdrawn:withdrawn,gold:s.player.gold};
    },row)).toEqual({namedProperty:true,missingProperty:true,gift:'recipient',foundation:'property',pure:true,joined:true,withdrawn:true,gold:0});
  });

test('new opening selection does not inject groups into retained campaigns or restore missing fresh-only records',
  async function ({page},info) {
    const row = AFRICAN_DATED[0];
    await startAfricanDated(page,info,row,false,true);
    const old = await page.evaluate(function () { return FB.save.serialize(); });
    await page.evaluate(function (row) { FBDATA.bookmarks[row.id].revision = row.prior + '_african_v1'; },row);
    await restoreBookmark(page,old);
    expect(await page.evaluate(function (row) {
      return FB.state.start.revision === row.prior && !FB.state.localInstitutions[row.iid] &&
        !FB.localInstitutionDefinitions(FB.state)[row.iid];
    },row)).toBe(true);
    await startAfricanDated(page,info,row,false,false);
    const stripped = await page.evaluate(function (row) {
      const data = JSON.parse(FB.save.serialize());
      delete data.state.localInstitutions[row.iid];
      return JSON.stringify(data);
    },row);
    await restoreBookmark(page,stripped);
    expect(await page.evaluate(function (row) { return !FB.state.localInstitutions[row.iid]; },row)).toBe(true);
  });
