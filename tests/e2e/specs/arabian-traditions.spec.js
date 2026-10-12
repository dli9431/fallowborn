'use strict';
const fs = require('fs');
const path = require('path');
const {test,expect} = require('../support/fixture');
const {openGame} = require('../support/game/navigation');
const {restoreBookmark} = require('../support/game/bookmark-acceptance');
const {startHistoricalGame} = require('../support/game/historical-start');
const {releasedCatalogue} = require('../support/released-catalogue');
const {dependsOnRuntime} = require('../support/runtime-dependencies');

dependsOnRuntime(__filename,[
  'data/cultures.js','data/bookmarks.js','data/bookmark_476.js','data/bookmark_476_outer.js',
  'data/bookmark_476_wider_identities.js','data/bookmark_476_wider.js','data/bookmark_493.js',
  'data/bookmark_493_world.js','data/bookmark_711.js','data/bookmark_711_terrain.js',
  'data/bookmark_800.js','data/bookmark_800_expansion.js','data/bookmark_867_expansion.js',
  'data/bookmark_1066_inhabited.js','data/bookmark_1204.js','data/bookmark_1204_terrain.js',
  'data/government_rollout.js','data/starts.js','data/political_institutions.js','data/assembly_polities.js',
  'js/model.js','js/world.js','js/institutions.js','js/religion.js','js/population.js',
  'js/bookmark_setup.js','js/starts.js','js/save.js','js/save_v4.js','js/main.js','js/ui_modals.js',
  'js/governments.js','js/government_support.js','js/government_collective.js',
  'js/government_assembly.js','js/government_lineage.js',
  'data/religious_institutions.js','data/religious_activities.js','data/systems.js',
  'js/religious_institutions.js','js/religious_activities.js','js/abbeys.js','js/treasury.js',
  'js/politics.js','js/authority.js','js/local_office_appointments.js','js/systems.js',
  'js/settlement.js','js/economy.js','js/market.js','js/justice.js','js/intrigue.js','js/travel.js','js/technology.js',
  'index.html','data/arabian_openings.js','data/islamic_profiles.js','data/travel.js','data/events_travel.js',
  'data/economy.js','data/settlements.js','data/settlements_real.js','data/geographies.js','data/geography_expansion.js',
  'data/distribution_crazygames.js','js/util.js','js/crazygames.js','js/events.js'
]);

test('the Arabian early profile has independent defaults and retains the released catalogue',
  async function ({page},testInfo) {
    await openGame(page,testInfo);
    const catalogue = JSON.parse(fs.readFileSync(path.join(__dirname,'../fixtures/released-catalogue.json'),'utf8'));
    expect((await page.evaluate(releasedCatalogue,catalogue.selection)).hashes).toEqual(catalogue.hashes);
    expect(await page.evaluate(function () {
      const id = 'arabian_traditional_476', before = JSON.stringify(FBDATA);
      const rng = FB.getRngState(), uid = FB.getUidCounter();
      const profile = FB.religionOf(id,null);
      const availability = FB.faithAvailability(id,null);
      availability.bookmarkIds.push('711');
      return {lineage:FB.faithLineage(id,null),availability:FB.faithAvailability(id,null),
        head:FB.faithOfficeId(id,null),war:profile.holyWarTradition,
        law:FB.faithValue(null,id,'legalTradition'),
        marriage:profile.marriage.spouseLimit,clergyMarriage:profile.clergyMarriage,
        roles:[profile.roles.priestM,profile.roles.priestF,profile.roles.monasticM,profile.roles.monasticF],
        paths:profile.religiousPaths || null,errors:FB.validateReligionData(null),
        pure:before === JSON.stringify(FBDATA) && rng === FB.getRngState() && uid === FB.getUidCounter()};
    })).toEqual({lineage:['arabian_traditional_476'],availability:{bookmarkIds:['476','493']},
      head:null,war:null,law:{value:'customary',sourceId:'arabian_traditional_476'},
      marriage:{m:1,f:1},clergyMarriage:true,
      roles:['Ritual keeper','Ritual keeper','Devotee','Devotee'],paths:null,errors:[],pure:true});
  });

for (const id of ['476','493']) test('early Arabian communities, courts and representatives stay distinct in ' + id,
  async function ({page},testInfo) {
    await openGame(page,testInfo);
    const result = await page.evaluate(function (id) {
      const faith = 'arabian_traditional_476', b = FB.bookmark(id);
      const before = JSON.stringify(FBDATA), rng = FB.getRngState(), uid = FB.getUidCounter();
      const counties = b.provinces.filter(function (p) { return !p.wasteland; });
      const institutions = b.localInstitutions || {};
      const consumers = {
        primary:counties.filter(function (p) { return p.religion === faith; }).map(function (p) { return p.id; }).sort(),
        minority:counties.filter(function (p) {
          return p.religion !== faith && (p.communities || []).some(function (c) { return c.religion === faith; });
        }).map(function (p) { return p.id; }).sort(),
        realms:b.realms.filter(function (r) { return r.religion === faith; }).map(function (r) { return r.id; }).sort(),
        kin:b.realms.reduce(function (all,r) {
          return all.concat((r.royalCourt && r.royalCourt.members || []).filter(function (c) {
            return c.religion === faith;
          }).map(function (c) { return r.id + '/' + c.id; }));
        },[]).sort(),
        congregations:Object.keys(institutions).filter(function (key) {
          return institutions[key].religion === faith;
        }).sort()
      };
      const relevant = counties.filter(function (p) {
        return (p.communities || []).some(function (c) { return c.religion === faith; });
      });
      const himyar = b.realms.find(function (r) { return r.id === 'himyar_' + id; });
      const medina = counties.find(function (p) { return p.id === 'medina'; });
      const qatif = counties.find(function (p) { return p.id === 'qatif'; });
      const sanaa = counties.find(function (p) { return p.id === 'sanaa'; });
      const najran = b.provinces.find(function (p) { return p.id === 'najran_oasis'; });
      return {consumers:consumers,errors:FB.validateBookmark(b),
        partitioned:relevant.every(function (p) {
          return p.communities.reduce(function (sum,c) { return sum + c.populationShare0; },0) === 10000;
        }),
        separate:[himyar.religion,medina.religion,qatif.religion,sanaa.religion],
        congregationRoles:consumers.congregations.every(function (key) {
          const d = institutions[key];
          return d.kind === 'congregation' && !d.officeId && d.representative.role === 'priest';
        }),
        najranDeferred:id === '493' ? !!najran.wasteland : false,
        pure:before === JSON.stringify(FBDATA) && rng === FB.getRngState() && uid === FB.getUidCounter()};
    },id);
    const courtNames = id === '476' ? ['oman_inland','western_arabia','yamama'] :
      ['oman_inland','tayma_oasis_local','western_arabia','yamama'];
    const kin = id === '476' ? ['ancestor','collateral','offspring'] : ['ancestor','collateral'];
    expect(result).toEqual({consumers:{
      primary:['mecca','muscat','nizwa','sohar','tayma_oasis','yamama'],
      minority:(id === '476' ? ['aden','medina','qatif','sanaa','shibam'] :
        ['aden','kufa','medina','qatif','sanaa','shibam']),
      realms:(id === '476' ? ['oman_coast','oman_inland','tayma_oasis_local','western_arabia','yamama'] :
        ['lakhmid','oman_coast','oman_inland','tayma_oasis_local','western_arabia','yamama'])
        .map(function (name) { return name + '_' + id; }).sort(),
      kin:[].concat.apply([],courtNames.map(function (name) {
        return kin.map(function (member) { return name + '_' + id + '/' + member; });
      })).sort(),
      congregations:(id === '476' ? ['medina','qatif','sanaa'] : ['medina','sanaa'])
        .map(function (county) { return county + '_community_1_' + id; }).sort()
    },errors:[],partitioned:true,separate:['jewish','jewish','east_syriac','jewish'],
      congregationRoles:true,najranDeferred:id === '493',pure:true});
  });

test('Arabian historical consumers cannot borrow an Islamic profile before its date',
  async function ({page},testInfo) {
    await openGame(page,testInfo);
    expect(await page.evaluate(function () {
      const before = JSON.stringify(FBDATA), rng = FB.getRngState(), uid = FB.getUidCounter();
      const consumers = ['community','character','ruler','institution','start','story','conversion','project'];
      const early = ['476','493'].map(function (id) {
        const b = FB.bookmark(id);
        const allowed = consumers.map(function (consumer) {
          return FB.faithHistoricalAvailable('arabian_traditional_476',b,consumer);
        });
        const future = ['sunni','shia','ashari','maturidi','umayyad_sunni_711'].map(function (faith) {
          return consumers.some(function (consumer) { return FB.faithHistoricalAvailable(faith,b,consumer); });
        });
        const rejected = ['community','ruler','kin','congregation'].map(function (kind) {
          const draft = JSON.parse(JSON.stringify(b));
          const province = draft.provinces.find(function (p) { return p.id === 'mecca'; });
          const court = draft.realms.find(function (r) { return r.id === 'western_arabia_' + id; });
          if (kind === 'community') province.communities[0].religion = 'sunni';
          else if (kind === 'ruler') court.religion = 'sunni';
          else if (kind === 'kin') court.royalCourt.members[0].religion = 'sunni';
          else draft.localInstitutions['medina_community_1_' + id].religion = 'sunni';
          return FB.validateBookmark(draft).some(function (error) {
            return error.indexOf('unavailable for this dated consumer') >= 0;
          });
        });
        return {allowed:allowed,future:future,rejected:rejected};
      });
      const later = ['711','800','867','1066','1204'].map(function (id) {
        const b = FB.bookmark(id);
        return !FB.faithHistoricalAvailable('arabian_traditional_476',b,'community') &&
          !b.provinces.some(function (p) {
            return p.religion === 'arabian_traditional_476' || (p.communities || []).some(function (c) {
              return c.religion === 'arabian_traditional_476';
            });
          }) && !b.realms.some(function (r) { return r.religion === 'arabian_traditional_476'; });
      });
      return {early:early,later:later,
        pure:before === JSON.stringify(FBDATA) && rng === FB.getRngState() && uid === FB.getUidCounter()};
    })).toEqual({early:Array(2).fill({allowed:Array(8).fill(true),future:Array(5).fill(false),rejected:Array(4).fill(true)}),
      later:Array(5).fill(true),pure:true});
  });

// Hidden revision review belongs to this specification's fresh browser context.
async function startArabianHousehold(page,testInfo,id,provinceId,sex) {
  provinceId = provinceId || 'mecca'; sex = sex || 'm';
  await openGame(page,testInfo);
  await page.evaluate(function (id) {
    FBDATA.bookmarks[id].hidden = false;
    FB.startProgression.noteTier(3);
  },id);
  const beginning = page.locator('#btn-choose-beginning');
  if (await beginning.isVisible()) await beginning.click();
  else await page.getByRole('button',{name:'New Game',exact:true}).click();
  await page.locator('#btn-bm-seed').click();
  const scenario = id === '711' ? 'farmer' : 'farmer_' + id;
  await page.locator('#ng-seed').fill('ARABIAN-' + id + '-' + scenario + '-' + provinceId + '-' + sex + '-Review-established');
  await page.locator('#ng-seed').press('Enter');
  await expect(page.locator('#chargen:not(.hidden)')).toBeVisible();
  await page.getByRole('button',{name:'Begin Your Story',exact:true}).click();
  await page.getByRole('button',{name:'Begin',exact:true}).click();
  await expect(page.locator('#game:not(.hidden)')).toBeVisible();
  await page.evaluate(function () { FB.game.setPaused(true); });
  expect(await page.evaluate(function () {
    return {bookmark:FB.state.start.id,home:FB.state.player.provinceId,
      faith:FB.state.chars[FB.state.player.charId].religion};
  })).toEqual({bookmark:id,home:provinceId,faith:id === '711' ? 'umayyad_sunni_711' : 'arabian_traditional_476'});
}

// Snapshot existing records only; these reads must not allocate officeholders or kin.
function arabianCampaignSnapshot() {
  const s = FB.state, faith = 'arabian_traditional_476', b = FB.campaignBookmark(s);
  const rng = FB.getRngState() >>> 0, uid = FB.getUidCounter(), before = JSON.stringify(s);
  const realmIds = b.realms.filter(function (r) { return r.religion === faith; }).map(function (r) { return r.id; });
  const defs = FB.localInstitutionDefinitions(s);
  const institutionIds = Object.keys(defs).filter(function (id) { return defs[id].religion === faith; });
  const counties = b.provinces.filter(function (p) {
    return (p.communities || []).some(function (c) { return c.religion === faith; });
  }).map(function (p) { return p.id; });
  const out = {start:s.start,realms:{},delegates:{},communities:{},institutions:{},followers:{},heads:s.religiousHeads,
    vacancies:s.religiousHeadVacancies,relations:s.faithRelations,faiths:s.faiths,rng:rng,uid:uid};
  realmIds.forEach(function (id) {
    const r = s.realms[id];
    out.realms[id] = {religion:r.religion,ruler:r.ruler,succession:r.succession};
    const support = FB.governments.support;
    if (support.isDelegated(s,id)) {
      const c = support.delegate(s,id), record = support.row(s,id);
      out.delegates[id] = {id:c && c.id,faith:c && c.religion,mandate:record && record.mandate};
    }
  });
  counties.forEach(function (id) {
    out.communities[id] = {rows:FB.countyCommunities(s,id),owner:s.owner[id],holder:s.holder[id]};
  });
  institutionIds.forEach(function (id) {
    const record = s.localInstitutions[id], c = record && s.chars[record.representativeId];
    out.institutions[id] = {record:record,faith:c && c.religion};
  });
  Object.keys(s.chars).forEach(function (id) {
    if (s.chars[id].religion === faith) out.followers[id] = s.chars[id];
  });
  out.pure = before === JSON.stringify(s) && rng === (FB.getRngState() >>> 0) && uid === FB.getUidCounter();
  /* Compare in saved form: saves omit null fields and restore fills the
     character defaults, so a live record and its restored copy match. */
  function savedForm(value) {
    if (Array.isArray(value)) return value.map(savedForm);
    if (!value || typeof value !== 'object') return value;
    const o = {};
    Object.keys(value).forEach(function (k) { if (value[k] !== null) o[k] = savedForm(value[k]); });
    if (typeof o.id === 'string' && o.born !== undefined && o.sex !== undefined) {
      [['dead',false],['opinion',0],['fertility',1],['health',8],['faithStandingBase',0]].forEach(function (d) {
        if (o[d[0]] === undefined) o[d[0]] = d[1];
      });
    }
    return o;
  }
  return savedForm(JSON.parse(JSON.stringify(out)));
}

for (const id of ['476','493']) test('Arabian households, generated kin and local representatives survive restore in ' + id,
  async function ({page},testInfo) {
    await startArabianHousehold(page,testInfo,id);
    const before = await page.evaluate(arabianCampaignSnapshot);
    expect(before.pure).toBe(true);
    expect(before.start.revision).toBe(id === '476' ? 'wider_v2' : 'world_v2');
    expect(Object.keys(before.realms)).toHaveLength(id === '476' ? 5 : 6);
    expect(Object.keys(before.institutions)).toHaveLength(id === '476' ? 3 : 2);
    expect(Object.keys(before.followers).length).toBeGreaterThan(0);
    if (id === '476') {
      expect(before.delegates.tayma_oasis_local_476.id).toBeTruthy();
      expect(before.delegates.tayma_oasis_local_476.faith).toBe('arabian_traditional_476');
    }
    Object.values(before.realms).forEach(function (r) {
      expect(r.religion).toBe('arabian_traditional_476');
      if (r.succession && r.succession.authoredCourt) Object.values(r.succession.members).forEach(function (m) {
        if (['ancestor','collateral','offspring'].indexOf(m.localId) >= 0)
          expect(m.religion).toBe('arabian_traditional_476');
      });
    });
    Object.values(before.institutions).forEach(function (r) {
      expect(r.record.representativeId).toBeTruthy();
      expect(r.faith).toBe('arabian_traditional_476');
    });
    const saved = await page.evaluate(function () { return FB.save.serialize(); });
    await openGame(page,testInfo);
    await restoreBookmark(page,saved);
    expect(await page.evaluate(arabianCampaignSnapshot)).toEqual(before);
  });

test('711 congregations bind two existing towns without clergy, land, allegiance changes or retained-world seeds',
  async function ({page},testInfo) {
    await openGame(page,testInfo);
    expect(await page.evaluate(function () {
      const before = JSON.stringify(FBDATA), rng = FB.getRngState(), uid = FB.getUidCounter();
      const b = FB.bookmark('711'), retained = ['baseline','governments_v2'].map(function (revision) {
        return FB.bookmark('711',revision);
      });
      const profile = FBDATA.religiousInstitutionProfiles.arabian_local_congregation_711;
      const rows = ['medina','sanaa'].map(function (pid) {
        const d = b.localInstitutions[pid + '_congregation_711'];
        const p = b.provinces.find(function (p) { return p.id === pid; });
        const point = FBDATA.settlementSites[d.site];
        return {scope:d.jurisdictionIds,faith:d.religion,residents:p.religion,vacant:d.vacant,freshOnly:d.freshOnly,
          site:p.settlements.some(function (v) { return v.site === d.site; }),
          bounds:point.x >= -11 && point.x <= 70 && point.y >= 13 && point.y <= 66,
          unstaffed:!d.officeId && !d.representative && !d.abbeyId};
      });
      return {faults:FB.validateBookmark(b),catalogue:FB.religiousInstitutionCatalogFaults(FBDATA),
        activities:FB.religiousActivityCatalogFaults(FBDATA),technology:FB.validateTechnologyData(true),rows:rows,
        retained:retained.every(function (world) {
          return !world.localInstitutions.medina_congregation_711 && !world.localInstitutions.sanaa_congregation_711;
        }),member:profile.roles.participant,selection:profile.selection,recognition:profile.recognition.sources,
        reviews:['arabian_local_congregations_711','arabian_local_worship_711'].map(function (id) {
          return FBDATA.techImpactReviews.features[id].mode;
        }),pure:before === JSON.stringify(FBDATA) && rng === FB.getRngState() && uid === FB.getUidCounter()};
    })).toEqual({faults:[],catalogue:[],activities:[],technology:[],
      rows:['medina','sanaa'].map(function (pid) {
        return {scope:[pid],faith:'sunni',residents:'umayyad_sunni_711',vacant:true,freshOnly:true,
          site:true,bounds:true,unstaffed:true};
      }),retained:true,member:{name:'Lay participant',minAge:16,sexes:[],unmarried:false,
        professions:[],skills:{},affiliationId:null},selection:null,recognition:[],reviews:['none','none'],pure:true});
  });

for (const locality of [{pid:'medina',sex:'f'},{pid:'sanaa',sex:'m'}]) {
  test('local worship in ' + locality.pid + ' consumes one commitment without granting pilgrimage or political rights',
    async function ({page},testInfo) {
      await startArabianHousehold(page,testInfo,'711',locality.pid,locality.sex);
      expect(await page.evaluate(function (pid) {
        const s = FB.state, c = s.chars[s.player.charId], id = pid + '_local_worship_711';
        c.born = 681; c.health = 8;
        const before = JSON.stringify(s), rng = FB.getRngState(), uid = FB.getUidCounter();
        const q = FB.religiousActivityQuote(s,id,c.id);
        const pure = before === JSON.stringify(s) && rng === FB.getRngState() && uid === FB.getUidCounter();
        const preserved = function () { return JSON.stringify([s.owner,s.holder,s.religiousHeads,
          s.religiousHeadVacancies,s.localInstitutions,s.abbeys,s.player.profession,c.religiousRanks,
          s.player.travel,s.player.travelHistory,s.population,c.religion]); };
        const canonical = preserved(), piety = s.player.piety, gold = s.player.gold;
        const started = FB.religiousActivityApply(s,q), early = FB.religiousActivityFinish(s,c.id,false);
        s.turn++; const completed = FB.religiousActivityFinish(s,c.id,false);
        const repeat = FB.religiousActivityQuote(s,id,c.id);
        return {pure:pure,started:started,early:early,completed:completed,
          price:gold - s.player.gold,piety:s.player.piety - piety,repeat:!repeat.allowed,
          receipt:c.religiousActivityHistory[id],canonical:canonical === preserved(),
          noMembership:Object.keys(s.localInstitutions[pid + '_congregation_711'].members).length === 0};
      },locality.pid)).toMatchObject({pure:true,started:true,early:false,completed:true,price:0,piety:1,
        repeat:true,receipt:{activityId:locality.pid + '_local_worship_711',performed:true,rewarded:true},
        canonical:true,noMembership:true});
    });
}

test('local worship separates faith from allegiance and rejects changed place, date, access and proposals atomically',
  async function ({page},testInfo) {
    await startArabianHousehold(page,testInfo,'711','medina','f');
    expect(await page.evaluate(function () {
      const s = FB.state, c = s.chars[s.player.charId], id = 'medina_local_worship_711';
      c.born = 681; c.health = 8;
      const allegiance = FB.religiousActivityQuote(s,id,c.id).allowed;
      c.religion = 'sunni'; const independent = FB.religiousActivityQuote(s,id,c.id).allowed;
      const q = FB.religiousActivityQuote(s,id,c.id);
      s.player.provinceId = 'sanaa';
      const moved = !FB.religiousActivityQuote(s,id,c.id).allowed, before = JSON.stringify(s);
      const stale = !FB.religiousActivityApply(s,q) && before === JSON.stringify(s);
      s.player.provinceId = 'medina';
      c.religion = 'jewish'; const other = !FB.religiousActivityQuote(s,id,c.id).allowed; c.religion = 'sunni';
      s.date.year = 712; const later = !FB.religiousActivityQuote(s,id,c.id).allowed; s.date.year = 711;
      const revision = s.start.revision; s.start.revision = 'baseline';
      const retained = !FB.religiousActivityQuote(s,id,c.id).allowed; s.start.revision = revision;
      const row = s.localInstitutions.medina_congregation_711; row.status = 'closed';
      const closed = !FB.religiousActivityQuote(s,id,c.id).allowed; row.status = 'active';
      const tampered = JSON.parse(JSON.stringify(FB.religiousActivityQuote(s,id,c.id))); tampered.cost = 1;
      const exact = JSON.stringify(s);
      return {allegiance:allegiance,independent:independent,moved:moved,stale:stale,other:other,later:later,
        retained:retained,closed:closed,tampered:!FB.religiousActivityApply(s,tampered) && exact === JSON.stringify(s)};
    })).toEqual({allegiance:true,independent:true,moved:true,stale:true,other:true,later:true,retained:true,
      closed:true,tampered:true});
  });

test('lay admission preserves married households, work and canonical authority without declaring an imam',
  async function ({page},testInfo) {
    await startArabianHousehold(page,testInfo,'711','medina','f');
    expect(await page.evaluate(function () {
      const s = FB.state, c = s.chars[s.player.charId], iid = 'medina_congregation_711';
      c.religion = 'sunni'; c.born = 681;
      const actor = {kind:'character',id:c.id};
      const preserved = JSON.stringify([c.spouseId,s.player.profession,s.owner,s.holder,s.religiousHeads,
        s.religiousHeadVacancies,s.authority,c.religiousRanks,s.abbeys]);
      const q = FB.religiousInstitutionQuote(s,iid,actor,'admit',{roleId:'participant'});
      const joined = FB.religiousInstitutionApply(s,q);
      const snapshot = FB.religiousInstitutionSnapshot(s,iid);
      const priest = FB.religiousInstitutionQuote(s,iid,actor,'admit',{roleId:'imam'});
      const office = FB.religiousInstitutionQuote(s,iid,actor,'appoint',{candidateId:c.id});
      const before = JSON.stringify(s);
      const rejected = !FB.religiousInstitutionApply(s,priest) && !FB.religiousInstitutionApply(s,office) &&
        before === JSON.stringify(s);
      const rules = FB.religiousHouseholdRule(s,c,s.player.profession);
      const withdrawn = FB.religiousInstitutionApply(s,FB.religiousInstitutionQuote(s,iid,actor,'withdraw',{}));
      return {joined:joined,role:snapshot.members[c.id].roleId,head:snapshot.holderId,rejected:rejected,
        rules:rules,withdrawn:withdrawn,preserved:preserved === JSON.stringify([c.spouseId,s.player.profession,
          s.owner,s.holder,s.religiousHeads,s.religiousHeadVacancies,s.authority,c.religiousRanks,s.abbeys])};
    })).toEqual({joined:true,role:'participant',head:null,rejected:true,rules:{unmarried:false,explicit:false},
      withdrawn:true,preserved:true});
  });

/* Property and fees below are fictional contracts, not an attested mosque endowment. */
function installArabianServiceFixture() {
  const s = FB.state, c = s.chars[s.player.charId], iid = 'medina_congregation_711';
  c.born = 681; c.health = 8; c.skills.int = 4; s.player.gold = 100;
  FB.setPlayerTier(s,1,{stationFarewell:false}); s.player.manor = null; s.player.landPlotMigration = 1;
  s.player.landPlots = [{provinceId:'medina',settlement:0}];
  const raw = FBDATA.bookmarks['711'].revisions[s.start.revision];
  raw.localInstitutions = JSON.parse(JSON.stringify(FB.campaignBookmark(s).localInstitutions));
  raw.localInstitutions[iid].abbeyId = 'test_arabian_property';
  const base = {period:{yearMin:711,yearMax:711},openings:[{id:'711',revision:s.start.revision}],
    faithIds:['sunni','umayyad_sunni_711'],affiliationIds:[],roleIds:[],institutionId:iid,payer:'household',reserve:0};
  FBDATA.religiousPatronage.test_arabian_giving = Object.assign({},base,{
    name:'Fictional congregation service fund',foundation:{startup:2,capital:8,treasury:0,landRequired:true},
    funds:{maintenance:{name:'Fictional upkeep',unitCost:2,capacity:4},learning:{name:'Fictional lessons',unitCost:3,capacity:4}},
    outreach:[]
  });
  ['learning','maintenance'].forEach(function (fund) {
    FBDATA.religiousActivities['test_arabian_' + fund] = Object.assign({},base,{
      name:'Fictional prepaid service',mode:'local',purpose:null,siteId:null,cost:0,duration:1,
      calendar:'any_day',interruption:'retain_cost',recipient:'institution',milestone:'test_arabian_' + fund,
      reward:{piety:0,prestige:0,skills:fund === 'learning' ? {int:1} : {}},legacy:null,
      service:{fund:fund,cost:fund === 'learning' ? 3 : 2}
    });
  });
}

test('fictional congregation gifts conserve land and restricted service funds through learning and access loss',
  async function ({page},testInfo) {
    await startArabianHousehold(page,testInfo,'711','medina');
    await page.evaluate(installArabianServiceFixture);
    expect(await page.evaluate(function () {
      const s = FB.state, c = s.chars[s.player.charId], terms = {land:{provinceId:'medina',settlement:0,count:1}};
      const population = JSON.stringify(s.population), gold = s.player.gold, before = JSON.stringify(s);
      const q = FB.religiousPatronageQuote(s,'test_arabian_giving',c.id,'foundation',terms);
      const pure = before === JSON.stringify(s), founded = FB.religiousPatronageApply(s,q);
      if (!founded) throw new Error('Fictional property setup failed: ' + q.reason);
      const h = s.abbeys.houses.find(function (h) { return h.id === 'test_arabian_property'; });
      const gifts = ['maintenance','learning'].map(function (fund) {
        return FB.religiousPatronageApply(s,FB.religiousPatronageQuote(s,'test_arabian_giving',c.id,'donation',{
          fund:fund,amount:fund === 'learning' ? 3 : 2}));
      });
      const started = FB.religiousActivityApply(s,FB.religiousActivityQuote(s,'test_arabian_learning',c.id));
      s.turn++; const learned = FB.religiousActivityFinish(s,c.id,false);
      const maintenance = FB.religiousActivityApply(s,FB.religiousActivityQuote(s,'test_arabian_maintenance',c.id));
      const property = JSON.stringify(h); s.localInstitutions.medina_congregation_711.status = 'closed';
      s.turn++; FB.religiousActivityTick(s);
      return {pure:pure,founded:founded,gifts:gifts,disclosed:q.cost,spent:gold - s.player.gold,
        land:s.player.landPlots.length,plots:h.plots[0].count,capital:h.capital,treasury:h.treasury,
        restricted:h.restrictedFunds,consumed:h.activitySpent,started:started,learned:learned,skill:c.skills.int,
        maintenance:maintenance,interrupted:!c.religiousActivity && !c.religiousActivityHistory.test_arabian_maintenance,
        property:property === JSON.stringify(h),population:population === JSON.stringify(s.population)};
    })).toEqual({pure:true,founded:true,gifts:[true,true],disclosed:10,spent:15,land:0,plots:1,capital:8,
      treasury:0,restricted:{maintenance:2,learning:0},consumed:5,started:true,learned:true,skill:5,
      maintenance:true,interrupted:true,property:true,population:true});
  });

test('fictional public giving debits its actual treasury and preserves household funds and reserve',
  async function ({page},testInfo) {
    await startArabianHousehold(page,testInfo,'711','medina');
    await page.evaluate(installArabianServiceFixture);
    expect(await page.evaluate(function () {
      const s = FB.state, pc = s.chars[s.player.charId];
      const q = FB.religiousPatronageQuote(s,'test_arabian_giving',pc.id,'foundation',{
        land:{provinceId:'medina',settlement:0,count:1}});
      if (!FB.religiousPatronageApply(s,q)) throw new Error('Fictional property setup failed.');
      FB.treasuryInitialize(s); s.treasuryAccounting.mode = 'active';
      const rid = 'umayyad_711', ruler = FB.realmRulerCharacter(s,rid);
      s.realms[rid].capital = 'medina'; ruler.homeProvinceId = 'medina'; ruler.health = 8;
      s.realms[rid].treasury.gold = 100; s.realms[rid].treasury.militaryAccrued = 0;
      const publicProfile = JSON.parse(JSON.stringify(FBDATA.religiousPatronage.test_arabian_giving));
      publicProfile.payer = 'public'; publicProfile.reserve = 5;
      FBDATA.religiousPatronage.test_arabian_public_giving = publicProfile;
      const household = s.player.gold, treasury = FB.treasuryAvailable(s,rid);
      const gift = FB.religiousPatronageQuote(s,'test_arabian_public_giving',ruler.id,'donation',{
        fund:'maintenance',amount:2});
      const applied = FB.religiousPatronageApply(s,gift);
      const spent = treasury - FB.treasuryAvailable(s,rid);
      s.realms[rid].treasury.gold = 6;
      const low = FB.religiousPatronageQuote(s,'test_arabian_public_giving',ruler.id,'donation',{
        fund:'maintenance',amount:2});
      const before = JSON.stringify(s), refused = !FB.religiousPatronageApply(s,low) && before === JSON.stringify(s);
      const h = s.abbeys.houses.find(function (h) { return h.id === 'test_arabian_property'; });
      return {applied:applied,payer:gift.payer.id,charged:spent,
        private:household === s.player.gold,fund:h.restrictedFunds.maintenance,
        reserve:!low.allowed && low.reason === 'funds',refused:refused};
    })).toEqual({applied:true,payer:'umayyad_711',charged:2,private:true,fund:2,reserve:true,refused:true});
  });

test('new congregation activity and identity survive restore while an older opening roster remains absent',
  async function ({page},testInfo) {
    await startArabianHousehold(page,testInfo,'711','sanaa','f');
    const source = await page.evaluate(function () {
      const s = FB.state, c = s.chars[s.player.charId]; c.born = 681; c.health = 8;
      if (!FB.religiousActivityApply(s,FB.religiousActivityQuote(s,'sanaa_local_worship_711',c.id)))
        throw new Error('Local worship did not start.');
      return {saved:FB.save.serialize(),commitment:c.religiousActivity,piety:s.player.piety,faith:c.religion,
        population:FB.countyCommunities(s,'sanaa'),heads:s.religiousHeads};
    });
    await openGame(page,testInfo); await restoreBookmark(page,source.saved);
    expect(await page.evaluate(function () {
      const s = FB.state, c = s.chars[s.player.charId];
      return {commitment:c.religiousActivity,piety:s.player.piety,faith:c.religion,
        population:FB.countyCommunities(s,'sanaa'),heads:s.religiousHeads};
    })).toEqual({commitment:source.commitment,piety:source.piety,faith:source.faith,
      population:source.population,heads:source.heads});
    expect(await page.evaluate(function () {
      const s = FB.state, c = s.chars[s.player.charId], piety = s.player.piety;
      s.turn++; FB.religiousActivityTick(s);
      delete s.localInstitutions.medina_congregation_711; delete s.localInstitutions.sanaa_congregation_711;
      return {reward:s.player.piety - piety,performed:c.religiousActivityHistory.sanaa_local_worship_711.performed,
        saved:FB.save.serialize()};
    })).toMatchObject({reward:1,performed:true});
    const older = await page.evaluate(function () { return FB.save.serialize(); });
    await openGame(page,testInfo); await restoreBookmark(page,older);
    expect(await page.evaluate(function () {
      FB.ensureLocalInstitutions(FB.state);
      return !FB.state.localInstitutions.medina_congregation_711 && !FB.state.localInstitutions.sanaa_congregation_711;
    })).toBe(true);
  });

function arabianReviewRevision(id) {
  return id === '711' ? 'terrain_v2_governments_v2' :
    (id === '1204' ? 'inhabited_v2' : 'inhabited_v2_governments_v2') + '_arabian_v1';
}

async function startDatedArabian(page,testInfo,id,pid,crazygames) {
  const revision = arabianReviewRevision(id);
  await page.addInitScript(function (input) {
    document.addEventListener('DOMContentLoaded',function () {
      FBDATA.bookmarks[input.id].hidden = false;
      FBDATA.bookmarks[input.id].revision = input.revision;
    });
  },{id:id,revision:revision});
  const scenario = 'farmer';
  await startHistoricalGame(page,testInfo,{bookmark:id,
    code:'ARABROLL-' + id + '-' + scenario + '-' + pid + '-f-Review-established'},!!crazygames);
  expect(await page.evaluate(function () {
    return {id:FB.state.start.id,revision:FB.state.start.revision,home:FB.state.player.provinceId};
  })).toEqual({id:id,revision:revision,home:pid});
}

test('all seven openings keep independently dated consumers, held localities and retained worlds separate',
  async function ({page},testInfo) {
    await openGame(page,testInfo);
    const result = await page.evaluate(function () {
      const before = JSON.stringify(FBDATA), rng = FB.getRngState(), uid = FB.getUidCounter();
      const additions = {'800':['mecca','medina'],'867':['mecca','medina'],'1066':['mecca'],'1204':['mecca']};
      const rows = Object.keys(additions).map(function (id) {
        const base = FBDATA.bookmarks[id], sources = id === '1204' ? ['inhabited_v2'] :
          ['inhabited_v2_governments_v2','inhabited_v2_governments_v2_islamic_v1'];
        return sources.every(function (sourceId) {
          const old = FB.bookmark(id,sourceId), current = FB.bookmark(id,sourceId + '_arabian_v1');
          const layout = FBDATA.settlementLayouts[current.settlementLayout];
          const unchanged = ['provinces','realms','religiousHeads','starts','stories','scripted'].every(function (field) {
            return JSON.stringify(old[field]) === JSON.stringify(current[field]);
          });
          const definitions = additions[id].every(function (pid) {
            const iid = pid + '_congregation_' + id, d = current.localInstitutions[iid];
            const a = FBDATA.religiousActivities[pid + '_local_worship_' + id];
            const point = FBDATA.settlementSites[d.site];
            return !(old.localInstitutions || {})[iid] && d.freshOnly && d.vacant && !d.officeId && !d.representative && !d.abbeyId &&
              d.jurisdictionIds.length === 1 && d.jurisdictionIds[0] === pid &&
              layout[pid].some(function (v) { return v.site === d.site; }) &&
              point.x >= -11 && point.x <= 70 && point.y >= 13 && point.y <= 66 &&
              a.openings.some(function (o) { return o.id === id && o.revision === current.revision; });
          });
          const retainedInstitutions = Object.keys(old.localInstitutions || {}).every(function (iid) {
            return JSON.stringify(old.localInstitutions[iid]) === JSON.stringify(current.localInstitutions[iid]);
          });
          return unchanged && definitions && retainedInstitutions && !/_arabian_v1$/.test(base.revision) &&
            FB.validateBookmark(current).length === 0;
        });
      });
      const dates = ['476','493','711','800','867','1066','1204'].map(function (id) {
        const b = FB.bookmark(id), defs = b.localInstitutions || {};
        return FB.validateBookmark(b).length === 0 && !Object.keys(defs).some(function (iid) {
          return Object.keys(additions).some(function (year) { return additions[year].includes(iid.split('_')[0]) &&
            iid === iid.split('_')[0] + '_congregation_' + year; });
        });
      });
      const laterMedina = ['1066','1204'].every(function (id) {
        const b = FB.bookmark(id,(id === '1204' ? 'inhabited_v2' : 'inhabited_v2_governments_v2') + '_arabian_v1');
        return !b.localInstitutions['medina_congregation_' + id] && !b.localInstitutions['aden_congregation_' + id] &&
          !b.localInstitutions['omani_imamate_' + id] && !b.localInstitutions['gulf_christian_house_' + id];
      });
      return {rows:rows,dates:dates,held:laterMedina,
        institutions:FB.religiousInstitutionCatalogFaults(FBDATA),activities:FB.religiousActivityCatalogFaults(FBDATA),
        technology:FB.validateTechnologyData(true),reviews:['arabian_dated_congregations','arabian_dated_local_worship']
          .map(function (id) { return FBDATA.techImpactReviews.features[id].mode; }),
        pure:before === JSON.stringify(FBDATA) && rng === FB.getRngState() && uid === FB.getUidCounter()};
    });
    expect(result).toEqual({rows:[true,true,true,true],dates:Array(7).fill(true),held:true,
      institutions:[],activities:[],technology:[],reviews:['none','none'],pure:true});
  });

for (const opening of [{id:'800',pid:'medina',outside:'zaydi'},
  {id:'867',pid:'mecca',outside:'imami_twelver'},
  {id:'1066',pid:'mecca',outside:'ismaili_nizari_1204'},
  {id:'1204',pid:'mecca',outside:'ismaili_fatimid'}]) {
  test('dated local worship in ' + opening.id + ' rechecks date, revision and presence without conferring Hajj or custody',
    async function ({page},testInfo) {
      await startDatedArabian(page,testInfo,opening.id,opening.pid);
      expect(await page.evaluate(function (input) {
        const s = FB.state, c = s.chars[s.player.charId], id = input.pid + '_local_worship_' + input.id;
        c.born = s.date.year - 30; c.health = 8;
        const identity = c.religion, revision = s.start.revision, year = s.date.year;
        const before = JSON.stringify(s), rng = FB.getRngState(), uid = FB.getUidCounter();
        const q = FB.religiousActivityQuote(s,id,c.id);
        const pure = before === JSON.stringify(s) && rng === FB.getRngState() && uid === FB.getUidCounter();
        s.start.revision = 'baseline'; const old = JSON.stringify(s);
        const retained = !FB.religiousActivityQuote(s,id,c.id).allowed && !FB.religiousActivityApply(s,q) && old === JSON.stringify(s);
        s.start.revision = revision; s.date.year++;
        const later = !FB.religiousActivityQuote(s,id,c.id).allowed; s.date.year = year;
        s.player.provinceId = 'sanaa'; const moved = !FB.religiousActivityQuote(s,id,c.id).allowed;
        s.player.provinceId = input.pid; c.religion = 'jewish';
        const other = !FB.religiousActivityQuote(s,id,c.id).allowed;
        c.religion = input.outside; const future = !FB.religiousActivityQuote(s,id,c.id).allowed;
        c.religion = 'shia'; const independent = FB.religiousActivityQuote(s,id,c.id).allowed; c.religion = identity;
        function canonical() { return JSON.stringify([s.owner,s.holder,s.authority,s.religiousHeads,
          s.religiousHeadVacancies,s.localInstitutions,s.population,s.abbeys,c.religion,c.religiousRanks,
          c.traits,s.player.profession,s.player.travel,s.player.travelHistory]); }
        const preserved = canonical(), gold = s.player.gold, piety = s.player.piety;
        const started = FB.religiousActivityApply(s,FB.religiousActivityQuote(s,id,c.id));
        s.turn++; const completed = FB.religiousActivityFinish(s,c.id,false);
        return {pure:pure,retained:retained,later:later,moved:moved,other:other,future:future,independent:independent,
          started:started,completed:completed,price:gold - s.player.gold,gain:s.player.piety - piety,
          repeated:!FB.religiousActivityQuote(s,id,c.id).allowed,canonical:preserved === canonical(),
          receipt:c.religiousActivityHistory[id]};
      },opening)).toMatchObject({pure:true,retained:true,later:true,moved:true,other:true,future:true,independent:true,
        started:true,completed:true,price:0,gain:1,repeated:true,canonical:true,
        receipt:{performed:true,rewarded:true,activityId:opening.pid + '_local_worship_' + opening.id}});
    });
}

for (const destination of ['medina','jerusalem']) {
  test('the retained ' + destination + ' journey completes once without asserting Hajj or Umra performance',
    async function ({page},testInfo) {
      await startDatedArabian(page,testInfo,'711','mecca');
      expect(await page.evaluate(function (pid) {
        const s = FB.state, c = s.chars[s.player.charId]; c.born = 681; c.health = 8; s.player.gold = 10000;
        c.religiousRanks = {muslim_lay:1};
        const site = pid === 'medina' ? 'pilgrim_medina' : 'pilgrim_jerusalem_muslim';
        /* Fixture adapter exercises a retained route, not new historical access or a rite. */
        const d = JSON.parse(JSON.stringify(FBDATA.religiousActivities.medina_local_worship_711));
        Object.assign(d,{name:'Fictional retained-route adapter',mode:'journey',institutionId:null,
          purpose:'pilgrimage',siteId:site,duration:0,milestone:'test_arabian_visit_' + pid,
          reward:{piety:0,prestige:0,skills:{}}});
        FBDATA.religiousActivities.test_arabian_visit = d;
        const q = FB.religiousActivityQuote(s,'test_arabian_visit',c.id), ranks = JSON.stringify(c.religiousRanks);
        const started = FB.religiousActivityApply(s,q);
        if (!started) throw new Error('Expected a retained pilgrimage: ' + q.reason);
        const t = s.player.travel, paid = 10000 - s.player.gold;
        t.phase = 'arrived'; t.currentId = t.destinationId; t.remainingRoute = [];
        const ev = FBDATA.events.find(function (e) { return e.id === 'travel_capstone_pilgrimage'; });
        const ctx = {activityJourneyTurn:t.startTurn,destinationId:t.destinationId,locationId:t.destinationId};
        const piety = s.player.piety;
        FB.resolveEventOption(s,ev,ev.options[0],ctx);
        const before = JSON.stringify(s), repeat = FB.resolveEventOption(s,ev,ev.options[0],ctx);
        const receipt = c.religiousActivityHistory[d.milestone];
        return {started:started,destination:t.destinationId,price:paid === q.cost,completed:t.completed,
          ordinaryAward:s.player.piety - piety,repeat:repeat === false && before === JSON.stringify(s),
          receipt:receipt,ranks:ranks === JSON.stringify(c.religiousRanks),history:s.player.travelHistory.length,
          noHajj:!c.religiousActivityHistory.hajj_performance && !c.religiousActivityHistory.mecca_umra_1204};
      },destination)).toMatchObject({started:true,destination:destination,price:true,completed:true,
        ordinaryAward:30,repeat:true,receipt:{journeyCompleted:true,performed:false},ranks:true,history:1,noHajj:true});
    });
}

test('funded support of a mixed congregation preserves one existing conversion project and fractional progress',
  async function ({page},testInfo) {
    await startArabianHousehold(page,testInfo,'711','medina');
    await page.evaluate(installArabianServiceFixture);
    expect(await page.evaluate(function () {
      const s = FB.state, c = s.chars[s.player.charId];
      if (!FB.religiousPatronageApply(s,FB.religiousPatronageQuote(s,'test_arabian_giving',c.id,'foundation',{
        land:{provinceId:'medina',settlement:0,count:1}}))) throw new Error('Expected fictional property.');
      s.owner.medina = 'player'; s.holder.medina = 'player'; s.realms.player.alive = true; s.realms.player.liege = null;
      FBDATA.religiousPatronage.test_arabian_giving.outreach = ['voluntary'];
      const rec = s.population.counties.medina;
      /* Fictional mixed population tests continuity, not historical proportions. */
      const total = rec.communities.reduce(function (sum,v) { return sum + v.count; },0);
      if (FB.convertCountyCommunity(s,'medina',{kind:'faith',target:'jewish',amount:1}).count !== 1)
        throw new Error('Expected one fictional minority resident and a conserved settlement partition.');
      rec.communityProjects = {faith:{target:c.religion,sponsor:'player',policy:'voluntary',startTurn:s.turn,
        progress:0.375,converted:12,resistance:0.2,lastTransfer:2,lastYear:s.date.year}};
      const population = JSON.stringify(rec.communities), project = JSON.stringify(rec.communityProjects.faith);
      const heads = JSON.stringify(s.religiousHeads), gold = s.player.gold;
      const terms = {fund:'learning',amount:3,provinceId:'medina',settlement:null,target:c.religion,policy:'voluntary'};
      const before = JSON.stringify(s), rng = FB.getRngState(), uid = FB.getUidCounter();
      const q = FB.religiousPatronageQuote(s,'test_arabian_giving',c.id,'outreach',terms);
      const pure = before === JSON.stringify(s) && rng === FB.getRngState() && uid === FB.getUidCounter();
      const applied = FB.religiousPatronageApply(s,q), exact = JSON.stringify(s);
      const repeat = !FB.religiousPatronageApply(s,q) && exact === JSON.stringify(s);
      const supported = rec.communityProjects.faith; const support = supported.activitySupport;
      const prior = Object.assign({},supported); delete prior.activitySupport;
      return {pure:pure,applied:applied,repeat:repeat,spent:gold - s.player.gold,support:support.amount,
        one:Object.keys(rec.communityProjects).length,progress:project === JSON.stringify(prior),
        communities:population === JSON.stringify(rec.communities),heads:heads === JSON.stringify(s.religiousHeads),
        conserved:total === rec.communities.reduce(function (sum,v) { return sum + v.count; },0)};
    })).toEqual({pure:true,applied:true,repeat:true,spent:3,support:3,one:1,progress:true,
      communities:true,heads:true,conserved:true});
  });

test('quarterly congregation service AI uses bounded attempts, its own treasury and a saved replay guard',
  async function ({page},testInfo) {
    await startArabianHousehold(page,testInfo,'711','medina');
    await page.evaluate(installArabianServiceFixture);
    expect(await page.evaluate(function () {
      const s = FB.state, c = s.chars[s.player.charId];
      if (!FB.religiousPatronageApply(s,FB.religiousPatronageQuote(s,'test_arabian_giving',c.id,'foundation',{
        land:{provinceId:'medina',settlement:0,count:1}}))) throw new Error('Expected fictional property.');
      FB.treasuryInitialize(s); s.treasuryAccounting.mode = 'active';
      const rid = 'umayyad_711', ruler = FB.realmRulerCharacterSnapshot(s,rid);
      s.realms[rid].capital = 'medina'; ruler.homeProvinceId = 'medina'; ruler.health = 8; ruler.born = 681;
      s.realms[rid].treasury.gold = 100; s.realms[rid].treasury.militaryAccrued = 0;
      const d = JSON.parse(JSON.stringify(FBDATA.religiousPatronage.test_arabian_giving));
      d.payer = 'public'; d.reserve = 5; d.ai = true; d.funds = {maintenance:d.funds.maintenance};
      FBDATA.religiousPatronage.test_arabian_public_giving = d;
      const realmIds = Object.keys(s.realms).sort(); let period = 1;
      while (period <= realmIds.length && !Array.from({length:Math.min(16,realmIds.length)},function (_,i) {
        return realmIds[(period * 16 + i) % realmIds.length];
      }).includes(rid)) period++;
      s.turn = period * 90;
      const household = s.player.gold, piety = s.player.piety, treasury = FB.treasuryAvailable(s,rid);
      const count = FB.religiousActivityAI(s), repeat = FB.religiousActivityAI(s);
      const charged = treasury - FB.treasuryAvailable(s,rid);
      const h = s.abbeys.houses.find(function (v) { return v.id === 'test_arabian_property'; });
      s.turn += 90; s.realms[rid].treasury.gold = 6;
      const insolvent = FB.religiousActivityAI(s);
      return {count:count,repeat:repeat,fund:h.restrictedFunds.maintenance,
        charged:charged,insolvent:insolvent,replay:s.religiousActivityAI.period === period + 1,
        household:household === s.player.gold && piety === s.player.piety};
    })).toEqual({count:1,repeat:0,fund:2,charged:2,insolvent:0,replay:true,household:true});
  });

function datedArabianFacts() {
  const s = FB.state, c = s.chars[s.player.charId];
  return JSON.parse(JSON.stringify({start:s.start,rng:FB.getRngState() >>> 0,uid:FB.getUidCounter(),
    owner:s.owner,holder:s.holder,authority:s.authority,population:s.population,institutions:s.localInstitutions,
    heads:s.religiousHeads,vacancies:s.religiousHeadVacancies,abbeys:s.abbeys,
    player:[s.player.gold,s.player.piety,s.player.prestige,s.player.travel,s.player.travelHistory,s.player.profession],
    identity:[c.religion,c.religiousRanks || null,c.religiousAffiliations || null],
    activity:c.religiousActivity || null,history:c.religiousActivityHistory || null,
    participants:Object.keys(s.chars).sort().filter(function (cid) {
      return s.chars[cid].religiousActivity || s.chars[cid].religiousActivityHistory;
    }).map(function (cid) {
      const person = s.chars[cid];
      return [cid,person.religion,person.skills,person.religiousActivity || null,person.religiousActivityHistory || null];
    }),ai:s.religiousActivityAI || null}));
}

for (const distribution of ['standard','CrazyGames']) {
  test(distribution + ' restore after an early bookmark preserves a dated commitment and repeats its continuation exactly',
    async function ({page},testInfo) {
      await startDatedArabian(page,testInfo,'1204','mecca',distribution === 'CrazyGames');
      const saved = await page.evaluate(function () {
        const s = FB.state, c = s.chars[s.player.charId]; c.born = 1174; c.health = 8;
        c.religiousRanks = {muslim_lay:2};
        s.player.travelHistory = [{purpose:'pilgrimage',destinationId:'medina',turn:s.turn}];
        if (!FB.religiousActivityApply(s,FB.religiousActivityQuote(s,'mecca_local_worship_1204',c.id)))
          throw new Error('Expected dated local worship.');
        return FB.save.serialize();
      });
      const before = await page.evaluate(datedArabianFacts);
      await page.evaluate(function () { FB.state.turn++; FB.religiousActivityTick(FB.state); });
      const after = await page.evaluate(datedArabianFacts);
      await page.evaluate(function () {
        return new Promise(function (resolve,reject) {
          FB.activateBookmark('493',null,function (error) { if (error) reject(error); else resolve(); });
        });
      });
      await restoreBookmark(page,saved);
      expect(await page.evaluate(datedArabianFacts)).toEqual(before);
      await page.evaluate(function () { FB.state.turn++; FB.religiousActivityTick(FB.state); });
      expect(await page.evaluate(datedArabianFacts)).toEqual(after);
      const absent = await page.evaluate(function () {
        delete FB.state.localInstitutions.mecca_congregation_1204;
        return FB.save.serialize();
      });
      await restoreBookmark(page,absent);
      expect(await page.evaluate(function () {
        FB.ensureLocalInstitutions(FB.state);
        return {absent:!FB.state.localInstitutions.mecca_congregation_1204,
          pilgrimage:FB.state.player.travelHistory[0].destinationId,
          rank:FB.state.chars[FB.state.player.charId].religiousRanks.muslim_lay};
      })).toEqual({absent:true,pilgrimage:'medina',rank:2});
    });
}

for (const distribution of ['standard','CrazyGames']) {
  test(distribution + ' restore preserves funded service, mixed population, fractional mission and an ongoing legacy journey',
    async function ({page},testInfo) {
      await startDatedArabian(page,testInfo,'711','medina',distribution === 'CrazyGames');
      await page.evaluate(installArabianServiceFixture);
      const saved = await page.evaluate(function () {
        const s = FB.state, c = s.chars[s.player.charId], spouse = s.chars[c.spouseId];
        if (!spouse) throw new Error('Expected an established household spouse.');
        s.player.gold = 10000;
        if (!FB.religiousPatronageApply(s,FB.religiousPatronageQuote(s,'test_arabian_giving',c.id,'foundation',{
          land:{provinceId:'medina',settlement:0,count:1}}))) throw new Error('Expected fictional property.');
        ['maintenance','learning'].forEach(function (fund) {
          if (!FB.religiousPatronageApply(s,FB.religiousPatronageQuote(s,'test_arabian_giving',c.id,'donation',{
            fund:fund,amount:fund === 'learning' ? 6 : 2}))) throw new Error('Expected a conserved gift.');
        });
        s.turn = 90; s.religiousActivityAI = {period:1};
        spouse.born = 681; spouse.health = 8; spouse.religion = c.religion; spouse.homeProvinceId = 'medina';
        if (!FB.religiousActivityApply(s,FB.religiousActivityQuote(s,'test_arabian_learning',spouse.id)))
          throw new Error('Expected an independent household lesson.');
        c.religiousRanks = {muslim_lay:2};
        s.player.travelHistory = [{purpose:'pilgrimage',destinationId:'medina',turn:s.turn}];
        const rec = s.population.counties.medina;
        if (FB.convertCountyCommunity(s,'medina',{kind:'faith',target:'jewish',amount:1}).count !== 1)
          throw new Error('Expected a conserved fictional minority fixture.');
        rec.communityProjects = {faith:{target:c.religion,sponsor:s.owner.medina,policy:'voluntary',startTurn:0,
          progress:0.375,converted:12,resistance:0.2,lastTransfer:2,lastYear:s.date.year}};
        if (!FB.travelStart(s,'pilgrimage','mecca',null)) throw new Error('Expected an existing Mecca itinerary.');
        return FB.save.serialize();
      });
      const before = await page.evaluate(datedArabianFacts);
      await page.evaluate(function () { FB.state.turn++; FB.religiousActivityTick(FB.state); });
      const after = await page.evaluate(datedArabianFacts);
      expect(after.abbeys.houses.find(function (h) { return h.id === 'test_arabian_property'; })).toMatchObject({
        capital:8,treasury:0,restrictedFunds:{maintenance:2,learning:3},activitySpent:3});
      await page.evaluate(function () {
        return new Promise(function (resolve,reject) {
          FB.activateBookmark('1204',null,function (error) { if (error) reject(error); else resolve(); });
        });
      });
      await restoreBookmark(page,saved);
      expect(await page.evaluate(datedArabianFacts)).toEqual(before);
      await page.evaluate(function () { FB.state.turn++; FB.religiousActivityTick(FB.state); });
      expect(await page.evaluate(datedArabianFacts)).toEqual(after);
    });
}
