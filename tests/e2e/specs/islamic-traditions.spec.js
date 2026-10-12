'use strict';
const {test,expect} = require('../support/fixture');
const {dependsOnRuntime} = require('../support/runtime-dependencies');
const {openGame} = require('../support/game/navigation');
const {startHistoricalGame} = require('../support/game/historical-start');
const {restoreBookmark} = require('../support/game/bookmark-acceptance');
const {releasedCatalogue} = require('../support/released-catalogue');
const released = require('../fixtures/released-catalogue.json');

dependsOnRuntime(__filename,[
  'index.html','data/islamic_profiles.js','data/cultures.js','data/economy.js',
  'data/technology.js','data/bookmarks.js','data/map_data.js','data/counties.js',
  'data/bookmark_711.js','data/bookmark_711_terrain.js','data/bookmark_800.js',
  'data/bookmark_800_expansion.js','data/bookmark_867_expansion.js',
  'data/bookmark_1066_inhabited.js','data/bookmark_1204.js','data/bookmark_1204_terrain.js',
  'data/government_rollout.js','data/starts.js','data/eras.js','data/geographies.js',
  'js/model.js','js/world.js','js/religion.js','js/events.js','js/papacy.js',
  'js/institutions.js','js/population.js','js/bookmark_setup.js','js/main.js',
  'js/save.js','js/save_v4.js','js/mods.js','js/technology.js',
  'js/crazygames.js','data/distribution_crazygames.js',
  'data/islamic_institutions.js','data/religious_institutions.js','data/religious_activities.js',
  'data/political_institutions.js','data/systems.js','data/settlements.js',
  'js/religious_institutions.js','js/religious_activities.js','js/authority.js',
  'js/treasury.js','js/abbeys.js','js/politics.js','js/settlement.js','js/systems.js',
  'js/justice.js','js/intrigue.js','js/economy.js','js/station.js','js/travel.js'
]);

const profiles = ['ibadi','zaydi','imami_pre_occultation','imami_twelver',
  'ismaili_fatimid','ismaili_nizari_1204','ismaili_tayyibi_1204'];
const assignments = {
  '800':{rustamids:'ibadi'},
  '867':{rustamids:'ibadi',tabaristan:'zaydi'},
  '1066':{fatimid_1066:'ismaili_fatimid'}
};

test('released communities, school descendants and baseline worlds retain their effective rules',
  async function ({page},info) {
    await openGame(page,info);
    expect((await page.evaluate(releasedCatalogue,released.selection)).hashes).toEqual(released.hashes);
    expect(await page.evaluate(function () {
      return {schoolParents:[FBDATA.religions.ashari.group,FBDATA.religions.maturidi.group],
        addedLawSchools:['hanafi','shafii','maliki','hanbali'].some(function (id) {
          return Object.prototype.hasOwnProperty.call(FBDATA.religions,id);
        }),genericShiaLegacy:!!FBDATA.religions.shia.legacy,
        technology:FBDATA.techImpactReviews.features.islamic_community_profiles.mode};
    })).toEqual({schoolParents:['sunni','sunni'],addedLawSchools:false,genericShiaLegacy:false,technology:'none'});
  });

test('dated identity gates distinguish accepted openings from local assignment and conversion',
  async function ({page},info) {
    await openGame(page,info);
    expect(await page.evaluate(function (ids) {
      const dates = ['711','800','867','1066','1204'];
      const before = JSON.stringify(FBDATA), rng = FB.getRngState(), uid = FB.getUidCounter();
      const windows = ids.map(function (id) {
        return dates.map(function (date) {
          return FB.faithHistoricalAvailable(id,FB.bookmark(date),'character');
        });
      });
      const restricted = ids.every(function (id) {
        const date = FBDATA.religions[id].availability.bookmarkIds[0], b = FB.bookmark(date);
        return !FB.faithHistoricalAvailable(id,b,'community') &&
          !FB.faithHistoricalAvailable(id,b,'start') &&
          !FB.faithHistoricalAvailable(id,b,'conversion') &&
          !FB.faithHistoricalAvailable(id,b,'project');
      });
      const boundary = JSON.parse(JSON.stringify(FB.bookmark('867')));
      const imami = [873,874].map(function (year) {
        boundary.date.year = year;
        return FB.faithHistoricalAvailable('imami_pre_occultation',boundary,'character');
      });
      const early = ['476','493'].every(function (date) { return ids.every(function (id) {
        return !FB.faithHistoricalAvailable(id,FB.bookmark(date),'character');
      }); });
      return {windows:windows,restricted:restricted,imami:imami,early:early,
        pure:before === JSON.stringify(FBDATA) && rng === FB.getRngState() && uid === FB.getUidCounter()};
    },profiles)).toEqual({windows:[
      [false,true,true,false,false],
      [false,false,true,true,true],
      [false,true,true,false,false],
      [false,false,false,true,false],
      [false,false,false,true,false],
      [false,false,false,false,true],
      [false,false,false,false,true]
    ],restricted:true,imami:[true,false],early:true,pure:true});
  });

test('review revisions assign only accepted court identities and preserve complete resident worlds',
  async function ({page},info) {
    await openGame(page,info);
    expect(await page.evaluate(function (changes) {
      const before = JSON.stringify(FBDATA), rng = FB.getRngState(), uid = FB.getUidCounter();
      const rows = [];
      Object.keys(changes).forEach(function (id) {
        const raw = FBDATA.bookmarks[id];
        Object.keys(raw.revisions).filter(function (revision) {
          return /_islamic_v1$/.test(revision);
        }).forEach(function (revision) {
          const prior = FB.bookmark(id,revision.replace(/_islamic_v1$/,''));
          const revised = FB.bookmark(id,revision);
          const expected = prior.realms.map(function (r) {
            return changes[id][r.id] ? Object.assign({},r,{religion:changes[id][r.id]}) : r;
          });
          const a = Object.assign({},prior), b = Object.assign({},revised);
          delete a.realms; delete b.realms; delete a.revision; delete b.revision;
          const selected = raw.revision;
          let faults;
          try {
            raw.revision = revision; // Exercise fresh-assignment gates in this isolated review.
            faults = FB.validateBookmark(revised);
          } finally { raw.revision = selected; }
          rows.push({id:id,valid:faults,
            onlyCourts:JSON.stringify(revised.realms) === JSON.stringify(expected),
            residentsAndWorld:JSON.stringify(a) === JSON.stringify(b)});
        });
      });
      return {covered:Object.keys(changes).every(function (id) { return rows.some(function (r) { return r.id === id; }); }),
        valid:rows.every(function (r) { return !r.valid.length && r.onlyCourts && r.residentsAndWorld; }),
        defaults:['800','867','1066'].every(function (id) { return !/_islamic_v1$/.test(FBDATA.bookmarks[id].revision); }),
        pure:before === JSON.stringify(FBDATA) && rng === FB.getRngState() && uid === FB.getUidCounter()};
    },assignments)).toEqual({covered:true,valid:true,defaults:true,pure:true});
  });

test('unreviewed county replacement is rejected without granting an imam or central war call',
  async function ({page},info) {
    await openGame(page,info);
    expect(await page.evaluate(function (ids) {
      const before = JSON.stringify(FBDATA), rng = FB.getRngState(), uid = FB.getUidCounter();
      const guarded = ids.every(function (id) {
        const b = JSON.parse(JSON.stringify(FB.bookmark(FBDATA.religions[id].availability.bookmarkIds[0])));
        const county = b.provinces.find(function (p) { return !p.wasteland; });
        county.religion = id;
        county.communities = [{culture:county.culture,religion:id,populationShare0:10000}];
        const faith = FB.religionOf(id,null), doctrine = FB.marriageDoctrine(id,null);
        return FB.validateBookmark(b).some(function (e) { return e.indexOf('unavailable for this dated consumer') >= 0; }) &&
          FB.faithOfficeId(id,null) === null && faith.head === null && faith.holyWarTradition === null &&
          doctrine.spouseLimit.m === 4 && doctrine.spouseLimit.f === 1 && doctrine.end.direct &&
          doctrine.end.gold === 'dowry' && faith.legalTradition === 'muslim' && faith.clergyMarriage &&
          faith.religiousPaths.professions.monk === 'muslim_scholar' &&
          faith.religiousPaths.professions.priest === 'muslim_mosque';
      });
      return {guarded:guarded,pure:before === JSON.stringify(FBDATA) && rng === FB.getRngState() && uid === FB.getUidCounter()};
    },profiles)).toEqual({guarded:true,pure:true});
  });

for (const crazygames of [false,true]) {
  for (const row of [
    {bookmark:'800',revision:'inhabited_v2_governments_v2_islamic_v1',province:'tahert',realm:'rustamids',faith:'ibadi'},
    {bookmark:'867',revision:'governments_v2_islamic_v1',province:'tahert',realm:'rustamids',faith:'ibadi'},
    {bookmark:'1066',revision:'governments_v2_islamic_v1',province:'fustat',realm:'fatimid_1066',faith:'ismaili_fatimid'}
  ]) {
    test(row.bookmark + ' reviewed court stays distinct from its residents and restores, CrazyGames ' + crazygames,
      async function ({page},info) {
        await page.addInitScript(function (row) {
          document.addEventListener('DOMContentLoaded',function () {
            FBDATA.bookmarks[row.bookmark].revision = row.revision;
          },{once:true});
        },row);
        await startHistoricalGame(page,info,{bookmark:row.bookmark,
          code:'ISLAMICREVIEW-' + row.bookmark + '-serf-' + row.province + '-m-Review-established'},crazygames);
        const before = await page.evaluate(function (row) {
          const s = FB.state, ruler = FB.realmRulerCharacterSnapshot(s,row.realm);
          const source = FB.campaignBookmark(s), residents = source.provinces.find(function (p) { return p.id === row.province; });
          const accepted = row.bookmark === '867'
            ? FB.realmReligionId(s,'tabaristan') === 'zaydi' : true;
          return {revision:source.revision,faith:FB.realmReligionId(s,row.realm),ruler:ruler && ruler.religion,
            county:residents.religion,mix:residents.communities,accepted:accepted,
            head:FB.faithOfficeId(row.faith,s),rng:FB.getRngState() >>> 0,uid:FB.getUidCounter()};
        },row);
        expect(before.revision).toBe(row.revision);
        expect(before.faith).toBe(row.faith);
        expect(before.ruler).toBe(row.faith);
        expect(before.county).not.toBe(row.faith);
        expect(before.accepted).toBe(true);
        expect(before.head).toBeNull();
        const saved = await page.evaluate(function (row) {
          const text = FB.save.serialize();
          FBDATA.bookmarks[row.bookmark].revision = 'baseline';
          return text;
        },row);
        await restoreBookmark(page,saved);
        expect(await page.evaluate(function (row) {
          const s = FB.state, ruler = FB.realmRulerCharacterSnapshot(s,row.realm);
          const source = FB.campaignBookmark(s), residents = source.provinces.find(function (p) { return p.id === row.province; });
          return {revision:source.revision,faith:FB.realmReligionId(s,row.realm),ruler:ruler && ruler.religion,
            county:residents.religion,mix:residents.communities,
            accepted:row.bookmark !== '867' || FB.realmReligionId(s,'tabaristan') === 'zaydi',
            head:FB.faithOfficeId(row.faith,s),rng:FB.getRngState() >>> 0,uid:FB.getUidCounter()};
        },row)).toEqual(before);
        expect(await page.evaluate(function (row) {
          const s = FB.state, year = s.date.year;
          try {
            s.date.year = 1300;
            return FB.faithAvailable(row.faith,s,'character') && !FB.faithAvailable(row.faith,s,'conversion');
          } finally { s.date.year = year; }
        },row)).toBe(true);
      });
  }
}

test('the held 711 allegiance preserves Damascus recovery rather than adopting the Abbasid seat',
  async function ({page},info) {
    await startHistoricalGame(page,info,{bookmark:'711',
      code:'ISLAMICREVIEW-711-serf-damascus-m-Review-established'},false);
    expect(await page.evaluate(function () {
      const s = FB.state, head = FB.religionOf('umayyad_sunni_711',s).head;
      s.religiousHeads.umayyad_caliph_711 = null;
      return {claims:head.claimCounties,war:head.sameFaithWar,greatWar:head.greatHolyWar,
        ownsSeat:FB.controlsReligiousHeadClaim(s,'umayyad_sunni_711','umayyad_711'),
        claimable:FB.canClaimReligiousHead(s,'umayyad_sunni_711','umayyad_711'),
        claimed:FB.claimReligiousHead(s,'umayyad_sunni_711','umayyad_711'),
        holder:s.religiousHeads.umayyad_caliph_711};
    })).toEqual({claims:[['damascus'],['mecca','medina']],war:'ordinary',greatWar:null,
      ownsSeat:true,claimable:true,claimed:true,holder:'umayyad_711'});
  });

const circles = [
  {province:'baghdad',institution:'baghdad_shafii_circle_1066',
    activity:'baghdad_shafii_learning_1066',affiliations:['shafii_learning_1066'],sex:'m'},
  {province:'nishapur',institution:'nishapur_shafii_ashari_circle_1066',
    activity:'nishapur_shafii_ashari_learning_1066',
    affiliations:['shafii_learning_1066','ashari_learning_1066'],sex:'f'}
];

async function beginCircle(page,info,row,crazygames) {
  await page.addInitScript(function () {
    document.addEventListener('DOMContentLoaded',function () {
      FBDATA.bookmarks['1066'].revision = 'governments_v2_islamic_v1_institutions_v1';
    },{once:true});
  });
  await startHistoricalGame(page,info,{bookmark:'1066',
    code:'ISLAMICCIRCLE-1066-serf-' + row.province + '-' + row.sex + '-Review-established'},!!crazygames);
  await page.evaluate(function (row) {
    window.islamicCircle = row;
    const s = FB.state, c = s.chars[s.player.charId];
    c.born = s.date.year - 30; c.health = 8; c.skills.int = 4;
    if (c.religion !== 'sunni') throw new Error('The circle journey requires its authored Sunni resident.');
    window.circleAct = function (action,terms) {
      const q = FB.religiousInstitutionQuote(s,row.institution,{kind:'character',id:c.id},action,terms);
      if (!q || !q.allowed || !FB.religiousInstitutionApply(s,q))
        throw new Error('Circle action: ' + action + '/' + (q && q.reason));
    };
    window.joinCircle = function () {
      circleAct('admit',{roleId:'learner'});
      row.affiliations.forEach(function (id) { circleAct('affiliate',{affiliationId:id}); });
    };
  },row);
}

test('two city-level circles validate only in opt-in revisions without changing any retained world',
  async function ({page},info) {
    await openGame(page,info);
    expect(await page.evaluate(function (rows) {
      const before = JSON.stringify(FBDATA), rng = FB.getRngState(), uid = FB.getUidCounter();
      const raw = FBDATA.bookmarks['1066'];
      const revisions = Object.keys(raw.revisions).filter(function (id) { return /_institutions_v1$/.test(id); });
      const valid = revisions.every(function (id) {
        const source = FB.bookmark('1066',id.replace(/_institutions_v1$/,''));
        const revised = FB.bookmark('1066',id), a = Object.assign({},source), b = Object.assign({},revised);
        delete a.localInstitutions; delete b.localInstitutions; delete a.revision; delete b.revision;
        return JSON.stringify(a) === JSON.stringify(b) && !FB.validateBookmark(revised).length &&
          rows.every(function (r) {
            const def = revised.localInstitutions[r.institution];
            return def && def.site === r.province && def.provinceId === r.province && def.vacant &&
              !def.officeId && !def.abbeyId && !def.historicalName && !def.representative &&
              !(source.localInstitutions || {})[r.institution];
          });
      });
      return {valid:valid,revisions:revisions.length,
        unselected:!/_institutions_v1$/.test(raw.revision),
        institutions:FB.religiousInstitutionCatalogFaults(FBDATA),
        activities:FB.religiousActivityCatalogFaults(FBDATA),technology:FB.validateTechnologyData(true),
        review:FBDATA.techImpactReviews.features.islamic_scholarly_learning.mode,
        pure:before === JSON.stringify(FBDATA) && rng === FB.getRngState() && uid === FB.getUidCounter()};
    },circles)).toEqual({valid:true,revisions:2,unselected:true,institutions:[],activities:[],
      technology:[],review:'none',pure:true});
  });

for (const row of circles) {
  test(row.province + ' learning keeps school, community, household work and public offices separate',
    async function ({page},info) {
      await beginCircle(page,info,row);
      expect(await page.evaluate(function () {
        const s = FB.state, row = islamicCircle, c = s.chars[s.player.charId];
        const untouched = JSON.stringify([c.religion,s.player.profession,c.career,c.religiousRanks,
          s.religiousHeads,s.authority,s.abbeys,s.player.travel,s.player.flags,s.population]);
        const blocked = !FB.religiousActivityQuote(s,row.activity,c.id).allowed;
        joinCircle();
        const before = JSON.stringify(s), rng = FB.getRngState(), uid = FB.getUidCounter();
        const q = FB.religiousActivityQuote(s,row.activity,c.id);
        const pure = before === JSON.stringify(s) && rng === FB.getRngState() && uid === FB.getUidCounter();
        const started = FB.religiousActivityApply(s,q);
        const early = FB.religiousActivityFinish(s,c.id,false);
        s.turn += 7;
        const finished = FB.religiousActivityFinish(s,c.id,false);
        const repeated = FB.religiousActivityQuote(s,row.activity,c.id);
        const appointed = FB.religiousInstitutionQuote(s,row.institution,{kind:'character',id:c.id},
          'appoint',{candidateId:c.id});
        return {blocked:blocked,affiliations:c.religiousAffiliations.map(function (v) { return v.id; }),
          source:c.religiousAffiliations.every(function (v) { return v.institutionId === row.institution; }),
          pure:pure,started:started,early:early,finished:finished,skill:c.skills.int,
          repeated:!repeated.allowed,noOffice:!appointed.allowed,
          noVow:!FB.religiousMembershipUnmarried(s,c),
          noCareerGrant:!FB.religiousCareerReview(s,c,'priest',true).explicit,
          noRank:FB.religiousInstitutionCharacterPaths(s,c).length === 0,
          unchanged:untouched === JSON.stringify([c.religion,s.player.profession,c.career,c.religiousRanks,
            s.religiousHeads,s.authority,s.abbeys,s.player.travel,s.player.flags,s.population])};
      })).toEqual({blocked:true,affiliations:row.affiliations,source:true,pure:true,
        started:true,early:false,finished:true,skill:5,repeated:true,noOffice:true,
        noVow:true,noCareerGrant:true,noRank:true,unchanged:true});
    });
}

test('circle admission, dates, withdrawal and stale reviews reject without payment or replacement',
  async function ({page},info) {
    await beginCircle(page,info,circles[1]);
    expect(await page.evaluate(function () {
      const s = FB.state, r = islamicCircle, c = s.chars[s.player.charId], actor = {kind:'character',id:c.id};
      const year = s.date.year, born = c.born, residence = s.player.provinceId;
      c.born = year - 15;
      const young = !FB.religiousInstitutionQuote(s,r.institution,actor,'admit',{roleId:'learner'}).allowed;
      c.born = born;
      s.player.provinceId = 'baghdad';
      const remote = !FB.religiousInstitutionRoleEligibility(s,r.institution,c.id,'learner');
      s.player.provinceId = residence;
      joinCircle();
      const dates = [1065,1067,1204].map(function (y) {
        s.date.year = y;
        return !FB.religiousActivityQuote(s,r.activity,c.id).allowed;
      });
      s.date.year = year;
      const q = FB.religiousActivityQuote(s,r.activity,c.id);
      circleAct('withdraw',{});
      const before = JSON.stringify(s), rng = FB.getRngState(), uid = FB.getUidCounter();
      const rejected = !FB.religiousActivityApply(s,q);
      return {young:young,remote:remote,dates:dates,rejected:rejected,
        pure:before === JSON.stringify(s) && rng === FB.getRngState() && uid === FB.getUidCounter(),
        affiliations:c.religiousAffiliations.length,alive:!c.dead,noLesson:!c.religiousActivity};
    })).toEqual({young:true,remote:true,dates:[true,true,true],rejected:true,pure:true,
      affiliations:0,alive:true,noLesson:true});
  });

/* Fictional property terms exercise the shared contract, without an attested waqf deed. */
function installCircleSupport() {
  const s = FB.state, row = islamicCircle, pid = s.player.provinceId;
  FB.setPlayerTier(s,1,{stationFarewell:false});
  s.player.gold = 500; s.player.manor = null; s.player.landPlotMigration = 1;
  s.player.landPlots = [{provinceId:pid,settlement:0},{provinceId:pid,settlement:0}];
  const raw = FBDATA.bookmarks[s.start.id].revisions[s.start.revision];
  raw.localInstitutions = Object.assign({},raw.localInstitutions);
  raw.localInstitutions[row.institution] = Object.assign({},raw.localInstitutions[row.institution],
    {abbeyId:'test_islamic_learning_property'});
  FBDATA.religiousPatronage.test_islamic_support = {
    name:'Fictional study support',period:{yearMin:1066,yearMax:1066},openings:[],faithIds:['sunni'],
    affiliationIds:[],roleIds:[],institutionId:row.institution,payer:'household',reserve:5,
    foundation:{startup:4,capital:10,treasury:6,landRequired:true},
    funds:{study:{name:'Fictional lessons',capacity:4,unitCost:3}},outreach:[]
  };
  FBDATA.religiousActivities.test_islamic_funded_lesson = Object.assign({},FBDATA.religiousActivities[row.activity],{
    name:'Fictional funded lesson',duration:1,milestone:'test_islamic_funded_lesson',
    service:{fund:'study',cost:3}
  });
  window.circleHouse = function () {
    return s.abbeys.houses.find(function (h) { return h.activityInstitutionId === row.institution; });
  };
  const terms = {land:{provinceId:pid,settlement:0,count:2}};
  const q = FB.religiousPatronageQuote(s,'test_islamic_support',s.player.charId,'foundation',terms);
  if (!q || !q.allowed || !FB.religiousPatronageApply(s,q)) throw new Error('Fictional support: ' + (q && q.reason));
}

test('funded learning conserves institutional property and access loss preserves unused restricted gifts',
  async function ({page},info) {
    await beginCircle(page,info,circles[1]);
    await page.evaluate(function () { joinCircle(); });
    await page.evaluate(installCircleSupport);
    expect(await page.evaluate(function () {
      const s = FB.state, row = islamicCircle, cid = s.player.charId, h = circleHouse();
      const noFunding = !FB.religiousActivityQuote(s,'test_islamic_funded_lesson',cid).allowed;
      const before = JSON.stringify(s), rng = FB.getRngState(), uid = FB.getUidCounter();
      const gift = FB.religiousPatronageQuote(s,'test_islamic_support',cid,'donation',{fund:'study',amount:6});
      const pure = JSON.stringify(s) === before && rng === FB.getRngState() && uid === FB.getUidCounter();
      const given = FB.religiousPatronageApply(s,gift), twice = FB.religiousPatronageApply(s,gift);
      const started = FB.religiousActivityApply(s,FB.religiousActivityQuote(s,'test_islamic_funded_lesson',cid));
      s.turn++;
      const completed = FB.religiousActivityFinish(s,cid,false);
      const property = JSON.stringify(h);
      FBDATA.religiousActivities.test_islamic_funded_lesson.milestone = 'test_islamic_interrupted';
      const restarted = FB.religiousActivityApply(s,FB.religiousActivityQuote(s,'test_islamic_funded_lesson',cid));
      s.localInstitutions[row.institution].status = 'suspended'; s.turn++;
      const interrupted = !FB.religiousActivityFinish(s,cid,false);
      return {noFunding:noFunding,pure:pure,given:given,twice:twice,started:started,completed:completed,
        restarted:restarted,interrupted:interrupted,gold:s.player.gold,plots:s.player.landPlots.length,
        owned:h.plots[0].count,capital:h.capital,treasury:h.treasury,spent:h.activitySpent,
        restricted:h.restrictedFunds.study,property:property === JSON.stringify(h),
        noCustodianPayment:h.holderId === null,noReward:!s.chars[cid].religiousActivityHistory.test_islamic_interrupted,
        noLegacyAbbey:FB.abbeyHouses(s).indexOf(h) < 0};
    })).toEqual({noFunding:true,pure:true,given:true,twice:false,started:true,completed:true,
      restarted:true,interrupted:true,gold:474,plots:0,owned:2,capital:10,treasury:6,spent:7,
      restricted:3,property:true,noCustodianPayment:true,noReward:true,noLegacyAbbey:true});
  });

test('public support and bounded AI fund only the actual ruler account without spending household or capital',
  async function ({page},info) {
    await beginCircle(page,info,circles[0]);
    await page.evaluate(installCircleSupport);
    expect(await page.evaluate(function () {
      const s = FB.state, pid = s.player.provinceId, h = circleHouse();
      FB.treasuryInitialize(s); s.treasuryAccounting.mode = 'active';
      const realmIds = Object.keys(s.realms).sort(), offset = 16 % realmIds.length;
      const candidates = Array.from({length:Math.min(16,realmIds.length)},function (_,i) {
        return realmIds[(offset + i) % realmIds.length];
      });
      const rid = candidates.find(function (id) {
        const c = FB.realmRulerCharacterSnapshot(s,id);
        return id !== 'player' && s.realms[id].alive && c && !FB.religiousActivityManaged(s,c.id) &&
          !FB.isRealmAtWar(s,id) && FB.treasuryCharacterRealm(s,c.id) === id && FB.treasuryCounterparty(s,id);
      });
      if (!rid) throw new Error('Expected a real public donor.');
      realmIds.forEach(function (id) {
        if (s.realms[id].treasury) s.realms[id].treasury.gold = 0;
      });
      const c = FB.realmRulerCharacterSnapshot(s,rid);
      c.religion = 'sunni'; c.health = 8; c.born = s.date.year - 30;
      c.homeProvinceId = pid; s.realms[rid].capital = pid;
      s.realms[rid].treasury.gold = 100; s.realms[rid].treasury.militaryAccrued = 0;
      FBDATA.religiousPatronage.test_islamic_public_support = Object.assign({},
        FBDATA.religiousPatronage.test_islamic_support,{payer:'public',ai:true});
      const privateGold = s.player.gold, publicGold = FB.treasuryAvailable(s,rid);
      const q = FB.religiousPatronageQuote(s,'test_islamic_public_support',c.id,'donation',{fund:'study',amount:3});
      const applied = FB.religiousPatronageApply(s,q);
      s.turn = 90;
      const ai = FB.religiousActivityAI(s), repeat = FB.religiousActivityAI(s);
      return {applied:applied,ai:ai,repeat:repeat,payer:q.payer.id === rid,publicSpent:publicGold - FB.treasuryAvailable(s,rid),
        household:privateGold === s.player.gold,restricted:h.restrictedFunds.study,
        preserved:[h.capital,h.treasury],noOffice:FB.religiousInstitutionSnapshot(s,islamicCircle.institution).holderId};
    })).toEqual({applied:true,ai:1,repeat:0,payer:true,publicSpent:6,household:true,restricted:6,preserved:[10,6],noOffice:null});
  });

for (const crazygames of [false,true]) {
  test('independent school affiliations and an unfinished lesson restore exactly, CrazyGames ' + crazygames,
    async function ({page},info) {
      await beginCircle(page,info,circles[1],crazygames);
      const source = await page.evaluate(function () {
        joinCircle();
        const s = FB.state, c = s.chars[s.player.charId];
        if (!FB.religiousActivityApply(s,FB.religiousActivityQuote(s,islamicCircle.activity,c.id)))
          throw new Error('Lesson start failed.');
        return FB.save.serialize();
      });
      function savedCircleFacts() {
        const s = FB.state, c = s.chars[s.player.charId];
        return JSON.parse(JSON.stringify({start:s.start,faith:c.religion,affiliations:c.religiousAffiliations,
          lesson:c.religiousActivity,history:c.religiousActivityHistory,institutions:s.localInstitutions,
          heads:s.religiousHeads,profession:s.player.profession,skills:c.skills,
          gold:s.player.gold,piety:s.player.piety,rng:FB.getRngState() >>> 0,uid:FB.getUidCounter()}));
      }
      const before = await page.evaluate(savedCircleFacts);
      await page.evaluate(function () { FB.state.turn += 7; FB.religiousActivityTick(FB.state); });
      const after = await page.evaluate(savedCircleFacts);
      await restoreBookmark(page,source);
      expect(await page.evaluate(savedCircleFacts)).toEqual(before);
      await page.evaluate(function () { FB.state.turn += 7; FB.religiousActivityTick(FB.state); });
      expect(await page.evaluate(savedCircleFacts)).toEqual(after);
    });
}
