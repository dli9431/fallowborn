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
  'js/crazygames.js','data/distribution_crazygames.js'
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
