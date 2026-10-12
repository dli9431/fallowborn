'use strict';
const fs = require('fs');
const path = require('path');
const {test,expect} = require('../support/fixture');
const {openGame} = require('../support/game/navigation');
const {restoreBookmark} = require('../support/game/bookmark-acceptance');
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
  'js/government_assembly.js','js/government_lineage.js'
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
async function startArabianHousehold(page,testInfo,id) {
  await openGame(page,testInfo);
  await page.evaluate(function (id) {
    FBDATA.bookmarks[id].hidden = false;
    FB.startProgression.noteTier(3);
  },id);
  const beginning = page.locator('#btn-choose-beginning');
  if (await beginning.isVisible()) await beginning.click();
  else await page.getByRole('button',{name:'New Game',exact:true}).click();
  await page.locator('#btn-bm-seed').click();
  await page.locator('#ng-seed').fill('ARABIAN-' + id + '-farmer_' + id + '-mecca-m-Review-established');
  await page.locator('#ng-seed').press('Enter');
  await expect(page.locator('#chargen:not(.hidden)')).toBeVisible();
  await page.getByRole('button',{name:'Begin Your Story',exact:true}).click();
  await page.getByRole('button',{name:'Begin',exact:true}).click();
  await expect(page.locator('#game:not(.hidden)')).toBeVisible();
  await page.evaluate(function () { FB.game.setPaused(true); });
  expect(await page.evaluate(function () {
    return {bookmark:FB.state.start.id,home:FB.state.player.provinceId,
      faith:FB.state.chars[FB.state.player.charId].religion};
  })).toEqual({bookmark:id,home:'mecca',faith:'arabian_traditional_476'});
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
  return JSON.parse(JSON.stringify(out));
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
